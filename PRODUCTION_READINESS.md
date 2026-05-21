# Production Readiness Checklist — Lusorae

> Last updated: **2026-05-21** (security hardening pass)

This is the one-page checklist to clear before promoting any build to
production. Items marked ✅ are enforced **in code** (by the startup
validator or the build pipeline) — you cannot ship without satisfying them.
Items marked 🟡 are policy/manual.

---

## 🔐 Secrets

- ✅ `JWT_SECRET` is ≥48 chars and **not** in the leaked-value blocklist
- ✅ `ADMIN_PASSWORD` is ≥12 chars and **not** in the leaked-value blocklist
- ✅ No `.env` files committed to git (`.gitignore` enforced, all `.env*`
  ignored except `.env.example`)
- 🟡 `JWT_SECRET` is **unique per environment** (dev ≠ staging ≠ prod)
- 🟡 Secrets rotated within the last 90 days
- 🟡 No secret literals in any tracked file (run
  `git grep -nE "(sk-|AKIA|AIza|eyJ[A-Za-z0-9_-]{30,})" -- '*.py' '*.js' '*.md'`)

## 🌐 Network / CORS / Cookies

- ✅ `APP_ENV=production`
- ✅ `CORS_ORIGINS` is an explicit comma-separated list (no `*`)
- ✅ `COOKIE_SECURE=true`
- ✅ `COOKIE_SAMESITE` is `lax` or `strict` (or `none` only if also `Secure`)
- ✅ Backend behind HTTPS only (TLS termination at ingress)
- ✅ HSTS emitted in prod (`HSTS_MAX_AGE=31536000`)
- ✅ Security headers active (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`)
- 🟡 CSP flipped from report-only to enforced (`CSP_ENFORCE=true`) after
  reviewing reports for 1 week

## 🧱 Rate limiting & abuse

- ✅ slowapi installed and active globally + on auth endpoints
- 🟡 `RATE_LIMIT_STORAGE=redis://…` when running multi-replica (otherwise
  per-replica limits are bypassable)
- ✅ CSRF middleware enforces mirror-cookie pattern on cookie auth
- ✅ Bearer auth requests are CSRF-immune by design (no cookie sent)

## 🧪 Frontend bundle

- ✅ Production build aborts when a `REACT_APP_*` variable name contains
  secret-like patterns (SECRET, PRIVATE, OPENAI, STRIPE_SECRET, …)
- ✅ `GENERATE_SOURCEMAP=false` in production builds
- ✅ Runtime guard scrubs secret-named envs from `process.env` at boot
- ✅ All API calls go through `${REACT_APP_BACKEND_URL}/api/...` —
  frontend never talks to third-party APIs directly with private creds
- ✅ Zero `console.log` / `console.debug` left in `src/`
- ✅ Zero `dangerouslySetInnerHTML` usage
- ✅ `safeUrl()` wraps every user-supplied link

## 🗄 Data & logs

- ✅ Password reset tokens **not** logged in plaintext (masked at INFO,
  full only at DEBUG)
- ✅ **Universal log redaction filter** (`backend/log_redaction.py`) installed
  on the root logger. Strips JWTs, Bearer/Basic auth headers, OpenAI/Anthropic
  keys (incl. `sk-proj-…`/`sk-ant-…`), Stripe `sk_live_*`/`pk_*`/`whsec_*`,
  AWS access keys, Google `AIza…`, Twilio SIDs, DB URLs with creds, bcrypt
  hashes, and JSON `"password"`/`"secret"`/`"token"` key-value pairs from
  every log record before emission.
- ✅ Pluggable secret backend abstraction (`backend/secret_loader.py`)
  centralises every sensitive lookup. Default backend is `env`; switch via
  `SECRET_BACKEND={doppler|aws|gcp|vault|azure}` to wire a real vault later.
  All accesses are audit-logged by **key name only**, never the value.
- ✅ `scripts/secret_scan.py` — standalone scanner for JWTs, sk-*, AWS keys,
  Google keys, GitHub/Slack tokens, DB URLs with creds, and known-leaked
  pre-rotation literals. Run before every commit (`--staged` for git-staged
  files only).
- 🟡 Logs forwarded to an aggregator with retention + access control
- 🟡 MongoDB connection over TLS in production
- 🟡 MongoDB user has least-privilege on the app DB only
- 🟡 Daily encrypted backups with restore drill in last 30 days

## 🔑 Auth & users

- ✅ Passwords bcrypt-hashed (cost ≥12)
- ✅ JWT signed HS256 with rotated secret
- ✅ Session listing + revoke (`/api/auth/sessions`)
- ✅ Forgot-password token never returned in API response in prod
- ✅ Password change revokes other sessions
- ✅ 2FA (TOTP) available
- ✅ Email + recovery email separation, recovery path supported

## 🚀 Deploy / runtime

- ✅ Backend boot is **fail-loud**: startup validator refuses to launch
  when any production-critical setting is unsafe
- ✅ `/api/health` (liveness) and `/api/ready` (readiness) probes wired
- 🟡 K8s readiness probe gates traffic on `/api/ready`
- 🟡 Pod resource limits set (CPU/mem) to prevent noisy-neighbour
- 🟡 Blue-green or rolling deploy strategy (no big-bang restart)

## 🕵 Attacker-perspective audit (run before launch)

| Vector | Verify |
|---|---|
| Inspect frontend bundle | `grep -r "REACT_APP_" frontend/build/static/js/*.js` — only `REACT_APP_BACKEND_URL` may appear |
| DevTools `window.process.env` | Returns only safe public envs |
| `view-source:/static/js/main.*.js` | No service_role / sk_ / SECRET strings |
| Git history search | `git log --all -p \| grep -iE "(SECRET\|password\|api_key)"` returns nothing sensitive |
| Public API surface | `curl /api/auth/forgot-password` never returns `dev_token` in prod |
| WebSocket frames | No user data leaked outside `/api/ws` auth scope |
| `/api/health` endpoint | Returns `env: "production"`, no other config |
| CORS preflight from `https://evil.example` | Rejected (no `Access-Control-Allow-Origin` returned) |
| 401 response body | Generic message, no stack traces, no PII |

---

## Quick verification commands

```bash
# 1. Backend validates env (must boot)
sudo supervisorctl restart backend && sleep 3
curl -fsS http://localhost:8001/api/health | python3 -m json.tool

# 2. Wildcard CORS in PROD is rejected (must exit code 2)
cd /app/backend && APP_ENV=production CORS_ORIGINS="*" python3 -c "import server" 2>&1 | tail -5

# 3. Leaked password rejected in PROD
cd /app/backend && APP_ENV=production ADMIN_PASSWORD="Admin#Lusorae2025" python3 -c "import server" 2>&1 | tail -5

# 4. No secrets in tracked files
cd /app && git grep -nE "(JWT_SECRET[\"'=:].{20,}|sk-[a-zA-Z0-9]{20,}|AKIA[0-9A-Z]{16}|admin@.*\\.app.*password|Admin#Lusorae2025)" \
    -- '*.py' '*.js' '*.md' '*.json' 2>/dev/null | grep -v "\.env.example"
# Expected: empty output (only blocklist references in server.py are allowed)

# 5. No console.log in frontend
grep -rE "console\\.(log|debug)" /app/frontend/src 2>/dev/null
# Expected: empty
```
