# REALTIME_AUTH_SECURITY.md

## 1. WebSocket auth model

The `/ws` endpoint accepts the same JWT as REST. There is **no separate "ws token"** and no looser validation path.

### Connection handshake

```
1. Client opens wss://…/ws  (with HttpOnly access_token cookie OR ?token=…)
2. Server reads token from cookies first, query param second.
3. If no token → close(1008) + auth_event(ws_connect_fail, reason="no_token")
4. Decode via _decode_access_token() — SAME function as REST:
      • Layer-1 raw header pre-flight (alg=HS256, no crit, valid JSON)
      • Layer-2 PyJWT: signature, iss, aud, exp, nbf, iat, type=access, required claims
5. If decode fails → close(1008) + auth_event(ws_connect_fail, reason="decode: <ExcClass>")
6. If type != "access" → close(1008) + auth_event(ws_connect_fail, reason="wrong_type")
7. jti revocation check:
      • Hot path: revocation_cache.is_revoked_cached(jti)
      • Fallback: db.sessions.find_one({jti}).revoked
      • If revoked → close(1008) + auth_event(ws_connect_fail, reason="session_revoked[_cache]")
      • If active → revocation_cache.remember_active(jti) (5 s positive TTL)
8. User-doc re-fetch from db.users:
      • banned → close(1008) + auth_event(ws_connect_fail, reason="banned_or_missing")
      • suspended_until > now → close(1008) + auth_event(ws_connect_fail, reason="suspended")
9. Password-rotation cutoff:
      • If token.iat < user.password_changed_at → close(1008) + ws_connect_fail(reason="password_rotated")
10. ws_manager.connect(user_id, ws, jti=jti)
      • Caps per-user to WS_MAX_SOCKETS_PER_USER = 3 (oldest socket evicted)
      • auth_event(ws_connect_ok, jti, ip, ua)
```

### During the socket's lifetime

```
Loop (per inbound frame):
  • Periodic jti re-check every _JTI_CHECK_GAP = 20 s:
      ① revocation_cache.is_revoked_cached(jti)
           true   → send {type: "session_revoked"} + auth_event(ws_session_revoked, reason="cache_revoked") + break
           false  → refresh remember_active, continue
           None   → db.sessions.find_one({jti}).revoked
                    true → mark_revoked + send session_revoked + auth_event + break
                    false → remember_active, continue
  • Per-frame size + rate caps (existing).
```

### On disconnect

```
ws_manager.disconnect(user_id, ws)
  • Removes from active socket set
  • If last socket for this user → mark user offline, broadcast presence change
```

## 2. Realtime attack surface — coverage matrix

| Attack                                                                | Defence in place                                                                                                            | Audit hook                              |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| Anonymous WS connect (no token)                                       | Step 3 close(1008)                                                                                                          | ws_connect_fail (no_token)              |
| `alg=none` token on WS                                                | Layer-1 raw header pre-flight inside `_decode_access_token`                                                                  | ws_connect_fail (decode: InvalidTokenError) |
| Cross-env token on WS (staging → prod)                                | `aud` mismatch in PyJWT decode                                                                                              | ws_connect_fail (decode: InvalidAudienceError) |
| Tampered payload on WS                                                | PyJWT signature mismatch                                                                                                    | ws_connect_fail (decode: InvalidSignatureError) |
| WS connect with a revoked token (post-logout)                         | Step 7 revocation check, cache-first                                                                                        | ws_connect_fail (session_revoked)       |
| Long-lived socket survives mid-session logout (force-logout, password change) | Step 11 periodic re-check (≤ 20 s), explicit `close_sockets_by_jti` from every revoke handler                                | ws_session_revoked                       |
| Banned user re-uses an existing token to open WS                      | Step 8 re-fetch from db.users                                                                                               | ws_connect_fail (banned_or_missing)     |
| Suspended user opens WS                                               | Step 8 `_restriction_active(suspended_until)`                                                                                | ws_connect_fail (suspended)             |
| Old token after password change                                       | Step 9 `iat < password_changed_at`                                                                                          | ws_connect_fail (password_rotated)      |
| Fake presence / fake typing                                           | All presence and typing events are scoped to `user_id = payload[sub]`; the client cannot influence whose presence is broadcast. | implicit                                |
| WebSocket-only privilege abuse (e.g. broadcast as admin)              | No admin-only WS message exists; admin actions are HTTP. WS messages are always scoped to the authenticated `user_id`.       | n/a                                     |
| Per-user socket flooding                                              | `WS_MAX_SOCKETS_PER_USER = 3` (oldest evicted)                                                                              | implicit                                |
| Per-socket message flooding                                           | Existing per-frame rate cap in the receive loop                                                                              | implicit                                |

## 3. `_JTI_CHECK_GAP` rationale

- **Before:** 30 s.
- **After this audit:** 20 s.
- **Why 20 s?**
  - Lower bound (replay window) is set by this constant for the long-lived-socket scenario. 20 s strikes a balance between latency-of-revocation and DB read pressure.
  - At `WS_MAX_SOCKETS_PER_USER = 3` and `N` concurrent users, DB reads from the WS plane are ≤ `3N / 20` per second. For `N = 5 000` concurrent users, that's 750 reads/s — comfortably handled by one mongod node (the read targets the `{jti: 1}` unique index).
  - The HTTP plane already serves revocations sub-second from the in-process cache; the 20 s ceiling is *only* for sockets that have been open continuously across a revocation event.

## 4. Live verification

- `[no_token]` → close(1008), `kind=ws_connect_fail, reason=no_token` written to `auth_events`.
- `[alg=none]` → close(1008), `kind=ws_connect_fail, reason="decode: InvalidTokenError"`.
- `[revoked_token_at_connect]` → close(1008), `kind=ws_connect_fail, reason=session_revoked`.
- `[logout_during_active_socket]` → server sends `{type: "session_revoked"}` within ≤ 20 s, then closes; `kind=ws_session_revoked` recorded.

## 5. Frontend trust

The WS client must treat `{type: "session_revoked"}` as a *hard* signal and immediately:

1. Stop sending frames.
2. Drop local auth state.
3. Redirect to login.

The frontend never decodes the JWT, never makes authorization decisions on its content, and never trusts any per-message `is_admin` field. Realtime UI gates ("admin chat moderation") render only when `/api/auth/me` confirms `is_admin=true` server-side, and every action the UI exposes hits an HTTP admin route that re-authenticates.

## 6. Findings summary

| Finding                                                       | Status                                                                                                                                                                              |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| WS connect did not log audit events on failure                | **Fixed** — `kind=ws_connect_fail` with specific reason emitted for every reject path (no_token / wrong_type / decode_error / session_revoked / banned / suspended / password_rotated). |
| WS periodic re-check hit DB even when nothing had changed     | **Fixed** — re-check now consults revocation cache first; DB only on miss. Same correctness, less load.                                                                              |
| `_JTI_CHECK_GAP = 30 s` was permissive                        | **Tightened to 20 s.**                                                                                                                                                              |
| WS authentication did not share the HTTP raw-header pre-flight | **Fixed** — `_decode_access_token` is the single chokepoint; pre-flight applies uniformly to REST and WS.                                                                            |
| No `ws_session_revoked` audit event when periodic re-check kicks a socket | **Fixed** — emitted with reason (`cache_revoked` vs `db_revoked`).                                                                                                          |
| Browsers cannot send cookies on WSS in all environments       | Workaround retained: token also accepted via `?token=…` query param. Mitigation: query-string tokens are not stored in standard access logs (logger redaction strips `token=…`).      |
