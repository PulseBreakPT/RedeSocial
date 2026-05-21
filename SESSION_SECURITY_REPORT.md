# SESSION_SECURITY_REPORT.md

## 1. Session lifecycle

```
┌───────────────┐  POST /api/auth/login
│   client      │ ──────────────────────────────►  ┌──────────────────────────┐
└──────┬────────┘                                  │  /auth/login handler     │
       │                                           │   • bcrypt verify         │
       │   ┌──────────── HttpOnly cookie ──────────┤   • optional 2FA          │
       │   │   access_token=<JWT>                  │   • mint JWT (jti=uuid)   │
       │   │   csrf_token=<mirror>                 │   • db.sessions.insert    │
       │   ▼                                       │   • revocation_cache.     │
┌───────────────┐                                  │     remember_active(jti) │
│   browser     │                                  │   • set cookies + body   │
└───────────────┘                                  └──────────────────────────┘
```

### Token shape

```
alg = HS256                                  (pinned, raw-header pre-flight, PyJWT allow-list)
typ = JWT                                    (only JWT accepted at pre-flight)
--------
sub = <user_id>                              (UUID; never numeric)
email = <email>                              (informational only — never trusted for authz)
type = "access"                              (refuses any token of another type)
iat / nbf / exp                               (10s leeway; 7 d lifetime)
iss = "lusorae-backend"                       (enforced)
aud = "lusorae-app:{APP_ENV}"                 (env-isolated; staging tokens cannot hit prod)
jti = <uuid4>                                 (server-side revocation handle)
```

### Cookies

| Cookie         | HttpOnly | Secure (prod) | SameSite | Purpose                              |
| -------------- | -------- | ------------- | -------- | ------------------------------------ |
| `access_token` | ✅       | ✅            | Lax      | JWT bearer                           |
| `csrf_token`   | ❌       | ✅            | Lax      | mirror — must match `X-CSRF-Token` on every mutating request |

Cookie hardening is validated at boot by `_validate_runtime_config`; production refuses to start if `COOKIE_SECURE != True` or `SameSite=None`.

## 2. Session table

`db.sessions`:

```json
{
  "jti":             "e6b2…",
  "user_id":         "0e84…",
  "created_at":      "2026-05-21T17:36:21Z",
  "last_seen_at":    "2026-05-21T18:02:11Z",
  "last_ip":         "203.0.113.7",
  "last_ua":         "Mozilla/5.0 …",
  "revoked":         false,
  "revoked_at":      null,
  "revoked_reason":  null,
  "meta": { "login_ip": …, "login_ua": …, "login_country": … }
}
```

Indexes: `{jti: 1}` unique, `{user_id: 1, revoked: 1}` compound, `{revoked_at: 1}` TTL (90 d).

## 3. Revocation paths

| Trigger                                       | DB write                            | `revocation_cache.mark_revoked` | WS kicked? |
| --------------------------------------------- | ----------------------------------- | ------------------------------- | ---------- |
| `POST /api/auth/logout`                       | `revoked=True, reason="logout"`     | ✅                              | ✅         |
| `DELETE /api/auth/sessions/{jti}`             | `revoked=True, reason="user_revoke"` | ✅                              | ✅         |
| `POST /api/auth/sessions/revoke-others`       | bulk `revoked=True, reason="user_revoke_all"` | ✅ per jti               | ✅ per jti |
| Password change                               | revokes all *other* sessions + sets `password_changed_at` | ✅ per jti  | ✅ per jti |
| Admin force-logout (`/admin/users/{id}/force-logout`) | bulk revoke              | ⚠ cache flip in this audit deferred — DB write still authoritative; cache catches up within 5 s positive-TTL window | ✅ |

*The admin-side cache flip is the one remaining call-site where the in-process cache may take up to 5 s to catch up cross-replica. Mitigated by:* WS periodic re-check (≤ 20 s) + DB-fallback on every cache miss + the access-token revocation table being authoritative. Tracked as Sweep-2 work item.

## 4. Replay protection

| Replay scenario                                                                | Defence                                                                                                                                                                                       |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Token replayed after logout                                                    | jti revoked in DB + cache. **Live test: 401 immediately after logout.**                                                                                                                       |
| Token replayed after password change                                           | `iat < password_changed_at` → 401.                                                                                                                                                            |
| Token replayed after ban                                                       | `get_current_user` refuses if `banned=True`.                                                                                                                                                  |
| Expired token replay                                                           | PyJWT `ExpiredSignatureError` → 401 + `kind=token_invalid {reason: expired}`.                                                                                                                  |
| Cross-env replay (staging token → prod)                                        | `aud` mismatch.                                                                                                                                                                              |
| Algorithm-confusion / alg=none forgery                                         | Raw-header pre-flight + PyJWT allow-list.                                                                                                                                                     |
| Tampered payload (sub, exp, iss, aud, etc.)                                    | HMAC mismatch.                                                                                                                                                                              |
| Same token bouncing on multiple devices                                        | `db.sessions.last_ip` / `last_ua` heartbeat enables forensic detection. `suspicious_ip_change` event kind reserved (not yet auto-triggered — Roadmap).                                          |

## 5. Token lifetimes

| Token             | TTL       | Rationale                                                                                                                                |
| ----------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Access JWT        | **7 d**   | Single-token model (no refresh). The 7-day window is bounded by: logout-revocation, password-change cutoff, ban, admin force-logout.       |
| Password-reset    | 1 h       | One-time, single-use, hash stored server-side.                                                                                          |
| 2FA TOTP window   | 30 s      | RFC 6238 default.                                                                                                                       |
| Backup codes      | one-shot  | Each marked `used=True` on consumption.                                                                                                  |

### Roadmap: short-lived access + refresh token (deferred per audit constraints)

The single-token 7-day model trades operational simplicity for replay-window length. A future hardening pass should:

1. Shorten access tokens to 15 min.
2. Issue refresh tokens with rotation: each `/auth/refresh` call invalidates the consumed refresh token and issues a new pair. Reuse of a previously-consumed refresh token triggers `revoke_all_sessions(user_id)` + alert.
3. Bind refresh tokens to `device_id` (cookie-stored, regenerated per login).
4. Store refresh tokens hashed-only server-side.

This is **non-blocking** for the current production posture and was explicitly excluded from this audit's implementation scope.

## 6. Lockout / brute-force

- 5 failed logins / 15 min / per email → 15 min soft lock. Reset on next successful login.
- Event audit: `login_fail` (every attempt) + `login_locked` (on lock).
- IP-rate-limit on `/auth/login`, `/auth/signup`, `/auth/forgot-password`, `/auth/reset-password`.

## 7. Suspicious-activity hooks (reserved)

The `kind=suspicious_ip_change` event is reserved in the auth_event taxonomy and the `last_ip` heartbeat on every request provides the raw signal. Auto-triggering (e.g. ASN diff over 5 min → require re-auth) is left for a follow-up; the data substrate is in place.

## 8. Findings summary

| Finding                                                       | Severity | Status                                                                                       |
| ------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------- |
| Pre-existing import-order bug (`APP_ENV` used before definition) | Critical | **Fixed** — backend now boots without `JWT_AUDIENCE` env override.                            |
| Missing `wrapt` dependency for `slowapi` rate-limit            | High     | **Fixed** — added to `requirements.txt`, installed.                                          |
| No raw-header JWT pre-flight (defence-in-depth)                | Medium   | **Fixed** — `validate_jwt_header_strict`; live-tested 6 attack vectors → 401.                |
| No in-process revocation cache → every authed request → DB read | Low (perf) | **Fixed** — 5 s positive / 60 s negative TTL cache.                                          |
| Auth-event coverage gaps (`token_invalid`, `ws_session_revoked`) | Low     | **Fixed** — every decode failure + WS revocation now audit-logged with reason.               |
| Inline ownership checks (50+ occurrences)                      | Low      | **Partially fixed** — representative subset migrated to `require_owner`. Sweep-2 documented. |
| 7-d access-token TTL, no refresh                               | Medium   | **Deferred** — roadmap item; not blocking given the layered revocation defences.             |
| No JWT `kid` for in-flight key rotation                         | Low      | **Deferred** — single-secret deployment; storage-layer rotation possible.                    |
