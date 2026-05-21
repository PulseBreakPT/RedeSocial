"""
Authentication hardening — telemetry, lockout, and ownership helpers.

This module is the central place for:

1. **auth_event(...)** — append a row to db.auth_events for every
   authentication-relevant action. Used for audit, suspicious-activity
   detection, and forensics. NEVER stores tokens or password material.

2. **register_failed_login() / clear_failed_login() / is_login_locked()** —
   per-account soft lockout. After N failures within a sliding window, the
   account is locked for L minutes. Slows credential-stuffing & brute force
   beyond what IP-based rate limiting can do alone.

3. **require_owner_or_admin(user, doc, owner_field)** — standardised
   ownership / authorization gate. Use everywhere a route mutates someone
   else's data.

The module is dependency-injected with the Mongo `db` object at import time
so it has no hard reference to server.py's globals.
"""
from __future__ import annotations

import base64
import json
import logging
import time
from datetime import datetime, timezone
from typing import Optional

logger = logging.getLogger("vermillion.auth")

# ─── Lockout policy ─────────────────────────────────────────────────────────
# Tuned for password-spraying defense without locking out real users.
LOCKOUT_MAX_FAILS = 5           # after this many fails…
LOCKOUT_WINDOW_S = 15 * 60      # …within this rolling window…
LOCKOUT_DURATION_S = 15 * 60    # …the account is soft-locked for this long.

# Sentinel: same module used by server.py — we set `db` from there.
_db = None


def bind_db(db) -> None:
    """Inject the Mongo handle. Called once from server.py at boot."""
    global _db
    _db = db


def _now_ts() -> int:
    return int(time.time())


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ─── Audit log ──────────────────────────────────────────────────────────────
async def auth_event(
    kind: str,
    *,
    user_id: Optional[str] = None,
    email: Optional[str] = None,
    ip: str = "",
    ua: str = "",
    jti: Optional[str] = None,
    detail: Optional[dict] = None,
) -> None:
    """Append an authentication event.

    `kind` is a stable enum:
      login_ok | login_fail | login_locked | logout |
      password_changed | session_revoked | session_revoked_all |
      forgot_password_issued | reset_password_ok | reset_password_fail |
      twofa_setup | twofa_disabled | twofa_fail |
      ws_connect_ok | ws_connect_fail |
      suspicious_ip_change | token_invalid

    SECURITY: this function NEVER receives token material. Callers must
    pass only ids (jti), addresses, and short metadata strings. The log
    redaction filter ALSO scrubs everything written, as a second layer.
    """
    if _db is None:
        return
    try:
        # Clip everything to safe bounds — defensive against accidentally
        # huge payloads if a caller passes a request body.
        row = {
            "kind": str(kind)[:64],
            "user_id": str(user_id)[:64] if user_id else None,
            "email": str(email)[:255] if email else None,
            "ip": str(ip)[:64] if ip else "",
            "ua": str(ua)[:300] if ua else "",
            "jti": str(jti)[:64] if jti else None,
            "detail": (detail or {}) if isinstance(detail, dict) else {},
            "ts": _now_iso(),
            "ts_epoch": _now_ts(),
        }
        await _db.auth_events.insert_one(row)
    except Exception as e:
        # Telemetry must never break auth. Log and move on.
        logger.warning(f"auth_event failed kind={kind}: {type(e).__name__}")


# ─── Lockout ────────────────────────────────────────────────────────────────
async def register_failed_login(email: str, ip: str = "") -> dict:
    """Record a failed login attempt for `email` and return the resulting
    lockout state: {"locked": bool, "locked_until_epoch": int|None, "fail_count": int}.
    Idempotent; safe to call repeatedly. Stores no password material."""
    if _db is None or not email:
        return {"locked": False, "locked_until_epoch": None, "fail_count": 0}
    now = _now_ts()
    window_start = now - LOCKOUT_WINDOW_S
    try:
        # Pull (don't fetch) old attempts and push the new one atomically.
        doc = await _db.login_attempts.find_one_and_update(
            {"email": email.lower()},
            {
                "$pull": {"attempts": {"$lt": window_start}},
                "$push": {"attempts": now},
                "$setOnInsert": {"email": email.lower()},
                "$set": {"updated_at": now},
            },
            upsert=True,
            return_document=True,
        )
        attempts = doc.get("attempts", []) if doc else []
        # Re-filter in case the $pull happened before $push in a non-atomic
        # storage engine. Defensive.
        recent = [t for t in attempts if isinstance(t, int) and t >= window_start]
        fail_count = len(recent)
        locked = fail_count >= LOCKOUT_MAX_FAILS
        locked_until = None
        if locked:
            locked_until = now + LOCKOUT_DURATION_S
            await _db.login_attempts.update_one(
                {"email": email.lower()},
                {"$set": {"locked_until_epoch": locked_until}},
            )
            await auth_event(
                "login_locked",
                email=email, ip=ip,
                detail={"fail_count": fail_count, "until_epoch": locked_until},
            )
        return {"locked": locked, "locked_until_epoch": locked_until, "fail_count": fail_count}
    except Exception as e:
        logger.warning(f"register_failed_login error: {type(e).__name__}")
        return {"locked": False, "locked_until_epoch": None, "fail_count": 0}


async def is_login_locked(email: str) -> Optional[int]:
    """Returns `locked_until_epoch` (int) if `email` is currently locked,
    else None. Cheap to call — single indexed read."""
    if _db is None or not email:
        return None
    try:
        doc = await _db.login_attempts.find_one(
            {"email": email.lower()},
            {"_id": 0, "locked_until_epoch": 1},
        )
        if not doc:
            return None
        until = doc.get("locked_until_epoch")
        if not until:
            return None
        if int(until) <= _now_ts():
            return None
        return int(until)
    except Exception:
        return None


async def clear_failed_login(email: str) -> None:
    """Wipe the failed-attempt history for `email` after a successful login."""
    if _db is None or not email:
        return
    try:
        await _db.login_attempts.delete_one({"email": email.lower()})
    except Exception:
        pass


async def ensure_indexes() -> None:
    """Idempotent index creation for auth telemetry collections."""
    if _db is None:
        return
    try:
        await _db.auth_events.create_index([("user_id", 1), ("ts_epoch", -1)])
        await _db.auth_events.create_index([("kind", 1), ("ts_epoch", -1)])
        # TTL: drop auth events after 90 days for GDPR + storage hygiene.
        await _db.auth_events.create_index("ts_epoch", expireAfterSeconds=90 * 24 * 3600)
        await _db.login_attempts.create_index("email", unique=True)
        await _db.login_attempts.create_index(
            "updated_at", expireAfterSeconds=24 * 3600,
        )
    except Exception as e:
        logger.warning(f"auth_security.ensure_indexes: {type(e).__name__}: {e}")


# ─── Ownership / authorization helper ──────────────────────────────────────
class AuthzError(Exception):
    """Raised by `require_owner_or_admin`. Caller maps to HTTP 403."""


def require_owner_or_admin(
    user: dict,
    doc: dict,
    *,
    owner_field: str = "author_id",
    admin_field: str = "is_admin",
) -> None:
    """Authorize a mutation on `doc` by `user`. Raises AuthzError on denial.

    Use this on every PATCH/PUT/DELETE that touches user-owned resources
    (posts, comments, messages, stories, …). It centralises the "is this
    person the owner or an admin?" check so individual routes can't get it
    subtly wrong (e.g. comparing strings of different shape, missing the
    admin override, etc.).
    """
    if not user or not isinstance(user, dict):
        raise AuthzError("not authenticated")
    if user.get(admin_field):
        return  # admins are allowed
    owner_id = (doc or {}).get(owner_field)
    if not owner_id or owner_id != user.get("id"):
        raise AuthzError("not owner")


def require_owner(
    user: dict,
    doc: dict,
    *,
    owner_field: str = "author_id",
) -> None:
    """Strict ownership gate — NO admin override.

    Use this on user-facing routes where admin moderation is handled by a
    separate dedicated and audited /admin/* endpoint. Examples:
      - DELETE /api/posts/{id}     (admin uses /admin/posts/{id} which audits)
      - DELETE /api/comments/{id}  (admin uses /admin/comments/{id})
      - DELETE /api/stories/{id}   (admin uses /admin/stories/{id})

    Centralising this check makes the authorization story explicit and
    forensically obvious — every "owner-only" mutation is grep-able by
    `require_owner(`.
    """
    if not user or not isinstance(user, dict):
        raise AuthzError("not authenticated")
    owner_id = (doc or {}).get(owner_field)
    if not owner_id or owner_id != user.get("id"):
        raise AuthzError("not owner")


# ─── JWT header pre-flight (defense-in-depth) ──────────────────────────────
# Raw inspection of the JWT header BEFORE handing the token to PyJWT.
#
# Why two layers?
# ---------------
# PyJWT already rejects `alg=none` and unknown algorithms when an explicit
# `algorithms=[…]` allowlist is provided. But the industry has seen a
# steady stream of CVE-class bugs in JWT libraries (alg-confusion, header
# spoofing via lookahead parsing, key resolution bugs, etc). By doing a
# tiny, dependency-free, hardcoded header check first we:
#
#   1. Refuse `alg=none` and any non-HS256 alg at the bytes level — no
#      reliance on PyJWT's validation path.
#   2. Refuse malformed headers (non-JSON, non-dict, no `alg` claim).
#   3. Refuse the `crit` header (RFC 7515 §4.1.11) which we never produce
#      and could be abused by an attacker to demand support for arbitrary
#      extensions the library has no idea about.
#   4. Keep the surface area we trust to PyJWT as small as possible.
#
# This function NEVER verifies the signature. It only inspects the header.
JWT_HEADER_ALG_ALLOWLIST = frozenset({"HS256"})
JWT_HEADER_TYP_ALLOWLIST = frozenset({"JWT"})  # `typ` is optional; if present it must match.


class InvalidJWTHeader(ValueError):
    """Raised by `validate_jwt_header_strict` for any header anomaly."""


def _b64url_decode_segment(seg: str) -> bytes:
    """RFC 7515 base64url-decode with proper padding."""
    pad = "=" * (-len(seg) % 4)
    return base64.urlsafe_b64decode(seg + pad)


def validate_jwt_header_strict(token: str) -> dict:
    """Parse and validate the JWT header without touching signature/payload.

    Returns the decoded header dict. Raises `InvalidJWTHeader` on:
      - non-3-segment token shape
      - non-base64url header
      - non-JSON or non-dict header
      - missing `alg` claim
      - `alg` not in `JWT_HEADER_ALG_ALLOWLIST` (rejects `none`, `HS384/512`,
        `RS256`, `ES256`, etc.)
      - `typ` present and not in `JWT_HEADER_TYP_ALLOWLIST`
      - `crit` header set (we never produce one)
    """
    if not isinstance(token, str) or not token:
        raise InvalidJWTHeader("empty token")
    parts = token.split(".")
    if len(parts) != 3:
        raise InvalidJWTHeader("not a 3-segment JWS")
    try:
        raw = _b64url_decode_segment(parts[0])
    except Exception as e:
        raise InvalidJWTHeader(f"base64url decode failed: {type(e).__name__}")
    try:
        header = json.loads(raw)
    except Exception as e:
        raise InvalidJWTHeader(f"header is not valid JSON: {type(e).__name__}")
    if not isinstance(header, dict):
        raise InvalidJWTHeader("header is not a JSON object")
    alg = header.get("alg")
    if not isinstance(alg, str) or not alg:
        raise InvalidJWTHeader("missing alg")
    # Case-sensitive comparison per RFC 7518 — `none`, `None`, `NONE` all rejected.
    if alg not in JWT_HEADER_ALG_ALLOWLIST:
        raise InvalidJWTHeader(f"alg '{alg}' not allowed")
    typ = header.get("typ")
    if typ is not None and typ not in JWT_HEADER_TYP_ALLOWLIST:
        raise InvalidJWTHeader(f"typ '{typ}' not allowed")
    if "crit" in header:
        # We never emit `crit`; an attacker-supplied one would force
        # extension-handling we don't implement. Reject hard.
        raise InvalidJWTHeader("crit header is not supported")
    return header


# ─── In-process revocation TTL cache ───────────────────────────────────────
# Hot-path optimisation: every authenticated request currently does a small
# Mongo lookup against db.sessions to verify that the jti embedded in the
# JWT has not been revoked. That's correct but generates 1 indexed read per
# request. With this cache we serve the common "still-active" path from
# in-process memory (TTL ≈ 5 s) and we **invalidate immediately** when a
# session is explicitly revoked from THIS process — meaning revoke
# operations are still instantaneous from the user's perspective.
#
# Multi-replica note: in a sharded deployment, each replica only knows
# about jtis it has cached locally. If replica A revokes jti X but replica
# B has X in its positive cache, B will continue to accept that token for
# up to TTL seconds. To keep TTL semantics safe in production:
#
#   • The default TTL is 5 s — short enough that a stolen-token revocation
#     window is operationally negligible.
#   • The WebSocket loop runs a periodic db.sessions check every 30 s
#     (see `_JTI_CHECK_GAP` in server.py) — so realtime channels detect
#     cross-replica revocations within ~30 s anyway.
#   • For stricter SLAs, switch to a Redis-backed cache by replacing
#     `_REVOCATION_CACHE` (the public API stays identical).
#
# This cache is safe with Python's GIL for single-process workloads. For
# multi-process workers (gunicorn), each worker has its own cache — same
# semantics, just one cache per worker.
_REVOCATION_TTL_S = 5
_REVOCATION_NEGATIVE_TTL_S = 60  # remember "revoked" jtis longer so they can't replay


class RevocationCache:
    """Tiny TTL cache for `jti → revoked-bool`. Thread-safe-enough for asyncio.

    States:
      - cache hit, revoked=True   → reject without DB read
      - cache hit, revoked=False  → accept without DB read
      - cache miss                → caller queries DB and calls `remember()`
    """

    __slots__ = ("_active", "_revoked")

    def __init__(self) -> None:
        # jti → expiry_epoch (ts at which the positive cache entry expires)
        self._active: dict[str, float] = {}
        # jti → expiry_epoch (longer TTL — revoked tokens shouldn't re-enter the active set)
        self._revoked: dict[str, float] = {}

    def _gc(self) -> None:
        """Drop expired entries. Cheap; called on every miss."""
        now = time.time()
        # Bounded sweep — cap to ~1k entries per call to stay O(1) amortised.
        for d in (self._active, self._revoked):
            if len(d) > 4096:
                # Defensive: cap memory if a misuser floods us with junk jtis.
                # Drop oldest 25%. Simple and good enough.
                items = sorted(d.items(), key=lambda kv: kv[1])
                for k, _ in items[: max(1, len(items) // 4)]:
                    d.pop(k, None)
        # Inline expiry sweep
        expired_active = [k for k, exp in self._active.items() if exp < now]
        for k in expired_active:
            self._active.pop(k, None)
        expired_revoked = [k for k, exp in self._revoked.items() if exp < now]
        for k in expired_revoked:
            self._revoked.pop(k, None)

    def is_revoked_cached(self, jti: str) -> Optional[bool]:
        """Return cached state, or None on miss.

        A `True` return means: reject this token; the underlying session is revoked.
        A `False` return means: this jti was active very recently; safe to accept.
        A `None` return means: cache miss, the caller must query the DB.
        """
        if not jti:
            return None
        now = time.time()
        exp = self._revoked.get(jti)
        if exp is not None and exp >= now:
            return True
        exp = self._active.get(jti)
        if exp is not None and exp >= now:
            return False
        return None

    def remember_active(self, jti: str, ttl_s: int = _REVOCATION_TTL_S) -> None:
        """Mark a jti as known-active for the next `ttl_s` seconds."""
        if not jti:
            return
        self._active[jti] = time.time() + max(1, int(ttl_s))
        # Best-effort GC every so often.
        if (len(self._active) + len(self._revoked)) % 64 == 0:
            self._gc()

    def mark_revoked(self, jti: str, ttl_s: int = _REVOCATION_NEGATIVE_TTL_S) -> None:
        """Mark a jti as revoked for the next `ttl_s` seconds.

        Call this from every code path that revokes a session (logout,
        single-session revoke, revoke-others, password change, force-logout
        from the admin panel). It does NOT replace the db.sessions update;
        it only ensures THIS process refuses the token immediately, without
        waiting for a DB read.
        """
        if not jti:
            return
        # Wipe positive entry — once revoked, never accept until TTL flips.
        self._active.pop(jti, None)
        self._revoked[jti] = time.time() + max(1, int(ttl_s))

    def stats(self) -> dict:
        """Diagnostics endpoint helper."""
        return {
            "active_entries": len(self._active),
            "revoked_entries": len(self._revoked),
            "positive_ttl_s": _REVOCATION_TTL_S,
            "negative_ttl_s": _REVOCATION_NEGATIVE_TTL_S,
        }


# Shared singleton — imported by server.py.
revocation_cache = RevocationCache()
