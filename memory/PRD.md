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
  - **Spine multicolor** (9 cores fanzine PT) em fita 8px ao topo do masthead.
  - **Paleta estendida** `EXT` (10 cores: red, vermilion, terracotta, gold, olive, forest, azul, sky, lilac, ink) + tabela `MONTH_ACCENTS` (cor por mês: Jan=red, Fev=lilac, Mar=forest, Abr=gold, Mai=vermilion, Jun=red, Jul=terracotta, Ago=olive, Set=azul, Out=lilac, Nov=forest, Dez=red).
  - **Masthead editorial** sem H1 retórico — apenas edition strip + stamp ANO + 2 stickers (curadoria editorial / Portugal·2026) + descritor com highlights cromáticos (Brejeira=terracotta, Pico=azul, Carnaval=lilac, Magusto=forest) + stat strip 4-col com top-accents por célula (azul/forest/terracotta/gold).
  - **Year Compass** (`Rosa do Ano`): 12 quadrículas Jan→Dez com heatmap (5-step ramp cream → gold), `grid-cols-6` em mobile (2×6), `sm:grid-cols-12` em desktop (1×12 horizontal tape), célula vermelha = mês "a ler", dot vermelho = mês de hoje, click-to-jump scroll suave.
  - **Chave cromática (`CategoryLegend`)**: grid 2×5 (mobile) / 5×2 (desktop) com as 10 categorias, faixa lateral de 4px na cor, contagem viva, clicável para filtrar (toggle on/off).
  - **MonthSection** com fita cromática 4px no topo do header (cor do mês), numeral gigante watermark tingido com `${monthAccent}3D` (24%), "/ folha n.º MM" também tingido.
  - **EventCard com 2 variantes de densidade**: `magazine` (rico) vs `list` (denso), toggle persistido em `localStorage`.
  - **Fita "EM DESTAQUE"** rotacionada para `now`/próximos 2d.
  - **DensityToggle** (`Revista | Lista`) disponível no sticky month nav (desktop, `cal-density-nav`) e no painel de filtros (mobile, `cal-density`).
  - **Filtros colapsáveis** com chevron animado, contador de filtros ativos, ESC para fechar.
  - **Stagger reveals** via `@keyframes cal-reveal-in` respeitando `prefers-reduced-motion`.
  - **A11y**: aria-pressed/checked/label/current/expanded em todos os controlos.
  - Todos os `data-testid` preservados. Novos: `cal-masthead`, `cal-compass`, `cal-compass-01..12`, `cal-density`, `cal-density-nav`, `cal-density-{magazine,list}`, `cal-filters-toggle`, `cal-next3`, `cal-legend`, `cal-legend-{cat_key}`.
  - `/app/backend/.env` & `/app/frontend/.env` recriados (estavam em falta após fork) com `JWT_SECRET`, `MONGO_URL`, `DB_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` + `REACT_APP_BACKEND_URL`. Admin seeded a `admin@lusorae.pt / Admin12345!` (ver `/app/memory/test_credentials.md`).


## Backlog
- P1: Páginas internas (Perfil `/u/:username`, Mensagens `/messages`, Comunidades `/communities`) — mesma linguagem visual
- P1: MobileTopBar + MobileBottomNav — alinhar tom fanzine
- P2: Estado vazio do feed central mais informativo (sugestões de pessoas/eventos)
- P2: Confirmar typo "Crjar conta" no Login
- P3: Telemetria de auth failures
- P3: Onboarding "primeiros perfis a seguir" pós-registo
