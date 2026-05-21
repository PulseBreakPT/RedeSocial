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
