# Lusorae — Product Requirements

## Original Problem Statement
- Restaurar e mostrar preview da app
- Remover textos sobre RGPD/algoritmos/leis das páginas Landing/Login/Register (texto "forçado")
- Resolver "Network error, impossível criar conta" no formulário de registo

## User Language
- Portuguese (PT-PT)

## Architecture
- Frontend: React + Tailwind (Yarn, craco)
- Backend: FastAPI + slowapi + Motor (uvicorn via supervisor)
- DB: MongoDB
- Pages: `Landing.js`, `Login.js`, `Register.js`
- Globais: `components/CookieBanner.js`, `lib/api.js`, `context/AuthContext.js`

## Implemented (Feb 2026)
- ✅ Ambiente restaurado (.env, deps, supervisor)
- ✅ `Landing.js` / `Login.js` — sem RGPD/algoritmos/leis
- ✅ `Register.js` — removido disclaimer redundante + jargão consent marketing
- ✅ `CookieBanner.js` — copy humanizada, RGPD-compliant
- ✅ **Fix "Network error" no registo:**
  - Rate limit `/api/auth/register` aumentado de **5/min → 20/min** (5/min era demasiado apertado para retentativas humanas; user real foi rate-limited)
  - Exception handler 429 (`_rate_limit_handler`) agora inclui CORS headers explícitos + `Retry-After: 60` + mensagem PT clara
  - Exception handler 500 (`_unhandled_exception_handler`) também inclui CORS headers
  - `formatApiError` em `lib/api.js` detecta network errors reais (ERR_NETWORK, "Failed to fetch") e mostra mensagem útil em PT em vez de "Network Error" cru

## Backlog
- P1: Auditar páginas internas (feed, perfil, definições) para o mesmo tom humano
- P2: Confirmar typo "Crjar conta" no Login (se for typo)
- P2: Adicionar logging/telemetria de falhas de registo (entender taxa de conversão)
- P3: Considerar invite-only se houver abuso de registos

## Notes — Camadas de protecção no /auth/register
1. Rate limit: **20/min por IP** (slowapi)
2. Feature flag: `signup_open` (default true)
3. Optional invite code: `signup_invite_code` (vazio por defeito)
4. Username policy: `min_username_chars=3`, `max_username_chars=20`
5. Password policy: `min_password_chars=6`, sem requisitos extra (frontend exige 8)
6. Bloqueio de emails descartáveis (feature flag `disposable_email_block_enabled`)
7. CSRF: **exempt** (pre-auth endpoint)
8. CORS: `*` em dev, lista explícita em prod
