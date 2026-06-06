# Lusorae — Product Requirements

## Original Problem Statement
- Restaurar/preview da app
- Remover RGPD/algoritmos/leis das páginas auth
- Resolver "Network error" no login/registo
- Redesenhar **desktop view** do Feed (right rail vazio + sidebar esquerda design antigo)

## User Language
- Portuguese (PT-PT)

## Architecture
- Frontend: React + Tailwind (Yarn, craco)
- Backend: FastAPI + slowapi + Motor
- DB: MongoDB
- Identidade visual: **Fanzine PT sóbrio** (paleta `PT.red`, `PT.green`, `PT.gold`, `PT.azul`, `PT.ink`, `PT.bone`)

## Implemented (Feb 2026)
- ✅ Ambiente restaurado
- ✅ Landing/Login/Register sem RGPD/algoritmos/leis
- ✅ CookieBanner humanizado
- ✅ "Network error" — `lib/api.js` URL relativa, WS via `window.location`
- ✅ Rate limit `/auth/register`: 5→20/min
- ✅ Exception handlers 429/500 com CORS
- ✅ `formatApiError` PT
- ✅ **Feed Desktop Redesign — Right Rail** (`RightSidebar.js`):
  - Search + ActivityTicker mantidos
  - Widget **Agenda PT** (kicker vermelho) — `/calendar/pt`
  - Widget **Tendências** (kicker verde) — `/trending`
  - Widget **Pessoas para seguir** (kicker azul) — `/users/suggestions` + follow
  - Widget **Comunidades** (kicker dourado) — `/trending/comunidades`
- ✅ **Feed Desktop Redesign — Left Sidebar** (`LeftSidebar.js`):
  - Logo: asterisco PT vermelho com sombra preta + wordmark + kicker `EDIÇÃO · <data>`
  - Nav active: pill vermelho PT com sombra stamp (`3px 3px 0 ink`)
  - Plus & Aura: gradient dourado PT (substituiu roxo/rosa)
  - Botão Publicar: stamp vermelho PT com sombra sólida + push-up hover
  - Badge rascunhos: sticker dourado rotated 8°
  - Perfil: card bone com border + sombra stamp, kicker `PERFIL`
  - Badges não lidos: vermelho PT

## Backlog
- P1: Páginas internas (Perfil `/u/:username`, Mensagens `/messages`, Comunidades `/communities`) — mesma linguagem visual
- P1: MobileTopBar + MobileBottomNav — alinhar tom fanzine
- P2: Estado vazio do feed central mais informativo (sugestões de pessoas/eventos)
- P2: Confirmar typo "Crjar conta" no Login
- P3: Telemetria de auth failures
- P3: Onboarding "primeiros perfis a seguir" pós-registo
