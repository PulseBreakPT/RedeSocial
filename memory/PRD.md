# Lusorae — Product Requirements

## Original Problem Statement
- Restaurar e mostrar preview da app
- Remover RGPD/algoritmos/leis das páginas Landing/Login/Register
- Resolver "Network error, impossível criar conta nem login"

## User Language
- Portuguese (PT-PT)

## Architecture
- Frontend: React + Tailwind (Yarn, craco)
- Backend: FastAPI + slowapi + Motor (uvicorn via supervisor)
- DB: MongoDB
- Pages auth: `Landing.js`, `Login.js`, `Register.js`
- Globais: `components/CookieBanner.js`, `lib/api.js`, `context/AuthContext.js`, `context/PublicSettingsContext.js`, `components/WebSocketProvider.js`

## Implemented (Feb 2026)
- ✅ Ambiente restaurado
- ✅ Landing/Login/Register sem RGPD/algoritmos/leis
- ✅ CookieBanner humanizado (RGPD-compliant)
- ✅ **Fix definitivo "Network error" — same-origin sempre:**
  - User estava em `meu-site-demo-1.preview...` mas o frontend chamava domínio antigo `274af76d-...preview...` → cross-origin + withCredentials + Allow-Origin:* → browser bloqueava
  - `lib/api.js`: `BACKEND_URL = ""` sempre no browser (relativo)
  - `PublicSettingsContext.js`: idem
  - `WebSocketProvider.js`: WS deriva de `window.location.host`
  - `Register.js`, `Landing.js`: passam a usar a instância `api` (relativa)
- ✅ Rate limit `/auth/register`: 5/min → 20/min
- ✅ Exception handlers 429/500 com CORS headers explícitos
- ✅ `formatApiError` traduz `ERR_NETWORK` para PT útil

## Backlog
- P1: Auditar páginas internas (feed, perfil) para tom humano
- P2: Confirmar typo "Crjar conta" no Login
- P2: Telemetria de falhas de auth
- P3: Considerar invite-only se houver abuso

## Notes — Camadas de protecção no /auth/register
1. Rate limit: 20/min por IP
2. Feature flag: `signup_open` (default true)
3. Optional invite code (vazio por defeito)
4. Username/password policy (min 3/6 chars)
5. Disposable email block (feature flag)
6. CSRF: exempt para pre-auth
