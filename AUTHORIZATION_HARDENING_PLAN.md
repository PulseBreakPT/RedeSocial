# AUTHORIZATION_HARDENING_PLAN.md

## Objective

Replace the scattered, copy-pasted `if doc["author_id"] != user["id"]: raise 403` pattern with **one** explicit, centralised, grep-able authorization primitive — so an auditor can verify "every owner-only mutation in this codebase" with one regex, and so future routes physically cannot forget the check.

## Primitive

Introduced in `auth_security.py`:

```python
def require_owner(user, doc, *, owner_field="author_id"):
    """Strict ownership gate — NO admin override.
    Use on user-facing routes where admin moderation is handled by a
    separate /admin/* endpoint that writes to admin_audit."""
    if not user or not isinstance(user, dict):
        raise AuthzError("not authenticated")
    owner_id = (doc or {}).get(owner_field)
    if not owner_id or owner_id != user.get("id"):
        raise AuthzError("not owner")

def require_owner_or_admin(user, doc, *, owner_field="author_id", admin_field="is_admin"):
    """Lenient — owner OR admin. For routes where admin shadow-edits are acceptable."""
    if not user or not isinstance(user, dict):
        raise AuthzError("not authenticated")
    if user.get(admin_field):
        return
    owner_id = (doc or {}).get(owner_field)
    if not owner_id or owner_id != user.get("id"):
        raise AuthzError("not owner")
```

### Why two flavours?

The platform deliberately separates *self-service* (`DELETE /api/posts/{id}` — user deletes their own) from *moderation* (`DELETE /api2/admin/posts/{id}` — admin removes content, writes `admin_audit`). Allowing admins to silently use the *self-service* route would weaken the audit trail. So:

- **`require_owner`** — applied to self-service routes. Admins are denied here on purpose; they must use `/admin/*` which audits.
- **`require_owner_or_admin`** — reserved for routes where admin override is desirable and audit is not required (e.g. admin reading another user's private resource for moderation review). Currently unused outside reserved use cases.

## Sweep-1 — completed in this audit cycle

| Route                              | Before                                              | After                                            |
| ---------------------------------- | --------------------------------------------------- | ------------------------------------------------ |
| `DELETE /api/posts/{id}`           | inline `if post["author_id"] != user["id"]: 403`   | `require_owner(user, post)` → `AuthzError` → 403 |
| `PATCH  /api/posts/{id}`           | inline                                              | `require_owner(user, post)`                      |
| `DELETE /api/comments/{id}`        | inline (dual-ownership: comment-author OR post-author) | `require_owner(user, c)` → on AuthzError, fallback `require_owner(user, post)` |
| `DELETE /api/stories/{id}`         | inline                                              | `require_owner(user, s)`                         |

Live verification: attacker token attempts DELETE / PATCH on admin's post → both 403. Owner token deletes own post → 200.

## Sweep-2 — follow-up (not blocking, low risk)

The following routes still use inline `if doc["<owner>"] != user["id"]: 403`. They are **functionally correct** today; the sweep is purely about consolidation:

```
# representative locations (use rg for the authoritative list):
backend/server.py:1377   target_user_id == user["id"]
backend/server.py:2951   poll question creator (q["author_id"] != user["id"])
backend/server.py:4731   poll close on schedule
backend/server.py:4984   /relationships/<id> blocks/mutes
backend/server.py:7874   /presence/<id> self-only updates
... (≈40 more)
```

### Migration recipe per route

```python
# before
if doc["author_id"] != user["id"]:
    raise HTTPException(403, "Sem permissão")

# after
try:
    require_owner(user, doc, owner_field="author_id")
except AuthzError:
    raise HTTPException(403, "Sem permissão")
```

For dual-ownership (comment OR parent-post author):

```python
try:
    require_owner(user, c)            # comment author?
except AuthzError:
    parent = await db.posts.find_one({"id": c["post_id"]}, {"_id": 0})
    require_owner(user, parent or {}) # parent-post author? else 403
```

### Estimated effort

- ~40 routes × 30 s each = ≈ 20 min of mechanical edits + 5 min backend test rerun.
- Defer until next maintenance window. Tracked here.

## Privilege-escalation matrix (verified)

| Attack                                                                                         | Why it fails today                                                                                                                                                                                                          |
| ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Attacker mints a JWT with `is_admin: true` claim                                               | The JWT does not carry an `is_admin` claim. `require_admin` ignores the JWT entirely; it re-reads `db.users.{id: payload[sub]}.is_admin`. The forged claim would be cosmetic at most — never reach a real authorization branch. |
| Attacker steals a regular user's token and tries `/api2/admin/...`                             | `require_admin` re-reads from DB; user is not admin; 403 + `kind=login_fail` audit.                                                                                                                                          |
| Attacker tampers `sub` in a token to impersonate another user                                  | Signature verification fails (any payload change invalidates the HMAC). Logged as `token_invalid: Signature verification failed`.                                                                                            |
| Attacker re-uses a logged-out token                                                            | jti revocation cache flips on logout → 401 instantly. Cross-replica: ≤ 5 s, then DB confirms.                                                                                                                                |
| Attacker uses a token after password change                                                    | `_get_user_from_payload` refuses if `iat < password_changed_at`.                                                                                                                                                              |
| Attacker uses a token whose user has been banned                                               | `get_current_user` refuses `banned=True`.                                                                                                                                                                                    |
| Attacker uses a staging-issued token against production                                        | `aud` mismatch (`lusorae-app:staging` vs `lusorae-app:production`). PyJWT rejects with `InvalidAudienceError`.                                                                                                               |
| Attacker forges `alg=none` token                                                               | Header pre-flight rejects before PyJWT touches it. Audit event recorded.                                                                                                                                                     |
| Attacker forges `alg=HS512` to confuse the verifier                                            | Header pre-flight rejects. Audit event recorded.                                                                                                                                                                            |
| Attacker DELETEs / PATCHes another user's post / comment / story (IDOR)                        | `require_owner` rejects. Live-tested: 403.                                                                                                                                                                                  |
| Admin shadow-deletes a user's post via `DELETE /api/posts/{id}`                                | `require_owner` denies (admin routes their delete via `/admin/posts/{id}` which audits — separation of duties).                                                                                                              |

## Frontend assumptions

- `is_admin` arriving in `/api/auth/me` response is for **rendering** only (show/hide admin panel link). All admin actions hit `/api2/admin/*` which re-checks server-side.
- Frontend never decodes the JWT or makes authorization decisions on its content.
