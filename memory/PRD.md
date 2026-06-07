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

## Implemented (Jun 2026) — Calendário · Redesign editorial
- ✅ **Calendário page (`Calendario.js`) — top-tier redesign**:
  - **Masthead editorial** compacto: edition strip (`// lusorae · papel · edição n.º MM · mês`), stamp circular (ANO 2026) + sticker dourado (curadoria editorial), título principal recalibrado (`clamp(36px,8.5vw,68px)`), descrição + stat strip 4-col com célula vermelha "AGORA · N eventos" quando há `now` events.
  - **Year Compass** (`Rosa do Ano`): 12 quadrículas Jan→Dez com heatmap (5-step ramp cream → gold), `grid-cols-6` em mobile (2×6), `sm:grid-cols-12` em desktop (1×12 horizontal tape), célula vermelha = mês "a ler", dot vermelho = mês de hoje, click-to-jump scroll suave. Borders responsivas via `.cal-compass-cell:nth-child()` CSS.
  - **EventCard com 2 variantes de densidade**: `magazine` (rico, default — bloco data colorido + título grande + subtítulo + range) vs `list` (denso, single-row — data 44px + título truncado + chips meta + status pill à direita).
  - **Fita "EM DESTAQUE"** rotacionada (rotate 2°) para eventos `status=now` ou `days_until ≤ 2` (variante magazine).
  - **DensityToggle** (`Revista | Lista`) persistido em `localStorage` (`lusorae.cal.density`) — disponível no sticky month nav (desktop) e no painel de filtros (mobile).
  - **Filtros colapsáveis** num único botão (`cal-filters-toggle`) que expande painel com chevron animado, contador de filtros ativos, contador de resultados, e botão "limpar" em vermelho. ESC fecha o painel.
  - **Sticky month nav** mantido (Jan→Dez chips com contagem) + indicador "a ler · {mês}" em vermelho.
  - **MonthSection** com numeral gigante watermark (opacity 0.08 → vermelho quando mês a ler), label "/ folha n.º MM", breakdown de top 4 categorias com swatch colorido.
  - **Stagger reveals** via `@keyframes cal-reveal-in` (animationDelay até 280ms por linha) — respeita `prefers-reduced-motion`.
  - **A11y**: aria-pressed nos chips, aria-checked no toggle radio, aria-label nas células do compass, aria-current="true" no mês ativo do nav, aria-expanded no botão de filtros.
  - Todos os `data-testid` existentes preservados. Novos: `cal-masthead`, `cal-compass`, `cal-compass-01..12`, `cal-density` (filtro), `cal-density-nav` (sticky), `cal-density-{magazine,list}`, `cal-filters-toggle`, `cal-next3`, `cal-active-count`.
  - `/app/backend/.env` & `/app/frontend/.env` recriados (estavam em falta após fork) com `JWT_SECRET`, `MONGO_URL`, `DB_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` + `REACT_APP_BACKEND_URL`. Admin seeded a `admin@lusorae.pt / Admin12345!` (ver `/app/memory/test_credentials.md`).


## Backlog
- P1: Páginas internas (Perfil `/u/:username`, Mensagens `/messages`, Comunidades `/communities`) — mesma linguagem visual
- P1: MobileTopBar + MobileBottomNav — alinhar tom fanzine
- P2: Estado vazio do feed central mais informativo (sugestões de pessoas/eventos)
- P2: Confirmar typo "Crjar conta" no Login
- P3: Telemetria de auth failures
- P3: Onboarding "primeiros perfis a seguir" pós-registo
