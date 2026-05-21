# Deploy Checklist — Lusorae / Vermillion

Este documento complementa o checklist pré-deploy do produto. Foca-se nas
**variáveis de ambiente** e **decisões de infra** que controlam as proteções
implementadas em código.

---

## 1. Variáveis de ambiente — produção

Definir antes de fazer deploy para `production`:

| Variável | Valor recomendado em PROD | Default em DEV | O que controla |
|---|---|---|---|
| `APP_ENV` | `production` | `development` | Determina verbosidade de erros, `secure` cookie default, e mensagens de aviso CORS |
| `JWT_SECRET` | string aleatória ≥ 64 caracteres | (segredo do .env) | Assinatura dos JWT. **NUNCA reutilizar entre ambientes.** |
| `CORS_ORIGINS` | `https://app.tuusite.com,https://www.tuusite.com` | `*` | Lista explícita de domínios. **Nunca usar `*` em PROD.** |
| `COOKIE_SECURE` | `true` (default em PROD) | `false` | Força a flag `Secure` no cookie de sessão. |
| `COOKIE_SAMESITE` | `lax` | `lax` | Pode ser `strict` para mais paranoia. `none` requer `Secure=true`. |
| `CSP_ENFORCE` | `false` inicial → `true` após validar relatórios | `false` | Faz com que o CSP seja `Content-Security-Policy` em vez de `Content-Security-Policy-Report-Only`. |
| `CSP_POLICY` | (opcional, override do default) | (default no código) | Permite ajustar a CSP sem mudar código. |
| `HSTS_MAX_AGE` | `31536000` (1 ano) | `31536000` | TTL do HSTS. Só é emitido em PROD. |
| `RATE_LIMIT_DEFAULT` | `300/minute` | `300/minute` | Limite global por IP. Pode subir/descer. |
| `RATE_LIMIT_STORAGE` | `redis://redis:6379/0` (multi-replica) | `memory://` | Backend do slowapi. **Em multi-replica TEM de ser Redis** ou outro storage partilhado. |

> ⚠️ Se um deployment correr com `APP_ENV=production` **e** `CORS_ORIGINS=*`, a
> aplicação loga `🔴 CORS_ORIGINS='*' in production is unsafe` e desativa
> automaticamente `allow_credentials` para evitar o erro de browser. Mesmo assim,
> **isto não é seguro** — definir uma lista explícita de origens.

---

## 2. O que está coberto pelo código

✅ **F1 — Hardening básico**
- Cookie de sessão `HttpOnly + SameSite=Lax + Secure` (em PROD)
- CORS com lista explícita de origens (sem `*` + credentials)
- `dev_token` do forgot-password só visível em DEV
- Exception handler global esconde stack traces em PROD
- Endpoints `/api/health` e `/api/ready` para K8s probes

✅ **F2 — Security headers** (middleware aplicado em todas as respostas)
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), …`
- `Strict-Transport-Security` (só em PROD)
- `Content-Security-Policy[-Report-Only]`

✅ **F3 — Rate limiting** (slowapi, por IP)
- `/api/auth/login` → 10/min
- `/api/auth/register` → 5/min
- `/api/auth/forgot-password` → 5/min
- `/api/auth/reset-password` → 10/min
- `/api/auth/check-username` → 30/min
- `/api/auth/check-email` → 30/min
- Global default → 300/min por IP

✅ **F4 — Validação de input**
- Pydantic models com `max_length` em todos os campos críticos (content de
  posts, comments, messages, bio, nome, etc.)
- React JSX no frontend já escapa automaticamente (zero usos de
  `dangerouslySetInnerHTML`)
- Authorization checks com `get_current_user` + ownership inline em endpoints
  sensíveis

---

## 3. O que NÃO é responsabilidade do código (infra / plataforma)

| Ponto do checklist | Onde se trata |
|---|---|
| HTTPS / TLS termination | Kubernetes ingress + cert-manager |
| Blue-green / canary / rolling deploy | Plataforma de deploy (Emergent / k8s) |
| Backups da DB + restore tests | DBaaS (MongoDB Atlas / serviço gerido) |
| Logs estruturados / alerting | APM externo (Datadog / Sentry / etc.) |
| Disk / pod resource limits | k8s manifests |
| CSRF tokens | Desnecessário neste design (Bearer auth + SameSite=Lax) |

---

## 4. Pré-deploy — comandos de validação

```bash
# Health + Ready
curl -fsS https://api.tuusite.com/api/health
curl -fsS https://api.tuusite.com/api/ready

# Security headers
curl -sI https://api.tuusite.com/api/health | grep -iE \
  '(strict-transport|x-frame|x-content|referrer|permissions|content-security)'

# CORS — deve ser rejeitado de uma origem não autorizada
curl -s -I -H "Origin: https://malicioso.com" https://api.tuusite.com/api/auth/me

# Rate limit — login não deve aceitar > 10 tentativas/min do mesmo IP
for i in $(seq 1 12); do
  curl -s -o /dev/null -w "%{http_code}\n" -X POST \
    -H "Content-Type: application/json" \
    -d '{"email":"x@y.com","password":"x"}' \
    https://api.tuusite.com/api/auth/login
done
# Esperado: várias 401, depois 429.
```

---

## 5. Próximas iterações (não bloqueantes)

- Migrar `RATE_LIMIT_STORAGE` para Redis se passar para multi-replica
- Endurecer CSP (remover `'unsafe-inline'` do style-src, mover para nonces)
- Adicionar dependency scanning ao CI (e.g. `pip-audit`, `npm audit`)
- Sentry / OpenTelemetry para tracing distribuído

---

## 6. Hardening Pass — 2026-05-21

Esta secção documenta a passagem de hardening completa feita em 2026-05-21.
Detalhe completo em `/app/PRODUCTION_READINESS.md`.

### O que foi rodado

- `JWT_SECRET` **rodado** para 128 chars hex aleatórios. Todas as sessões
  anteriores foram invalidadas.
- `ADMIN_PASSWORD` **rodado**. A password anterior (`Admin#Lusorae2025`) foi
  removida de todos os ficheiros versionados (testes, summaries) e está agora
  na *blocklist* do validador de arranque — qualquer deploy que tente
  reutilizá-la em produção é recusado.

### Validador de arranque (`server.py:_validate_environment`)

Antes de o FastAPI inicializar, o servidor valida:

| Regra | Severidade em DEV | Severidade em PROD |
|---|---|---|
| `JWT_SECRET` ≥ 48 chars | fatal | fatal |
| `JWT_SECRET` ∉ blocklist (`secret`, `changeme`, valor pré-rotação) | fatal | fatal |
| `CORS_ORIGINS` sem `*` | warn | **fatal** |
| `COOKIE_SECURE` = true | warn | **fatal** |
| `COOKIE_SAMESITE=none` ⇒ `COOKIE_SECURE=true` | fatal | fatal |
| `ADMIN_PASSWORD` ∉ blocklist (incluindo valor pré-rotação) | fatal | fatal |
| `ADMIN_PASSWORD` ≥ 12 chars | warn | **fatal** |

Em DEV os `warn` apenas registam no log. Em PROD qualquer `fatal` faz
`SystemExit(2)` antes do servidor aceitar tráfego.

### Frontend hardening

- `craco.config.js` recusa builds de produção quando deteta `REACT_APP_*`
  com nome a soar a segredo (`SECRET`, `PRIVATE`, `SERVICE_ROLE`, `OPENAI`,
  `STRIPE_SECRET`, `JWT_SECRET`, …).
- `GENERATE_SOURCEMAP=false` por defeito em build de produção (sem source
  maps publicados → menos superfície para DevTools).
- Runtime guard em `src/index.js` apaga qualquer env com nome sensível do
  objecto `process.env` no browser (defesa em profundidade).

### Logs

- Tokens de password-reset deixaram de ser logados em INFO. Agora só o
  prefixo + comprimento (`b3kF…(24)`). O valor inteiro vai para DEBUG (que
  está off em produção).

