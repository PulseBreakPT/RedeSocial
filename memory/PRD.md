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


## Implemented (Feb 2026 · v2.1) — Doodles + Imagens Nano Banana

Em cima do pivot "Mapa Social Vivo" (v2), o utilizador pediu **mais personalidade fanzine** + **imagens reais geradas via Nano Banana**:

- ✅ **EMERGENT_LLM_KEY** adicionada ao `/app/backend/.env` (chave universal — não foi pedida ao user).
- ✅ **Nano Banana (gemini-3.1-flash-image-preview) integrado** via `emergentintegrations`:
  - Script one-shot CLI em `/app/scripts/generate_pivot_images.py` (asyncio.gather paralelo).
  - 2 imagens novas geradas: `lusorae-mapa-poster.webp` (poster fanzine vertical com mapa estilizado + dots + setas + azulejos) e `lusorae-bairro.webp` (cena de bairro PT com varandas, padaria, gato preto, calçada).
  - Reutilizadas as 9 imagens existentes em `/app/frontend/public/hero/` (hero.webp, city-{lisboa,porto,algarve}.webp, cta-community.webp, manifesto.webp) — todas geradas com nano banana em sessões anteriores.
- ✅ **Doodles fanzine reintroduzidos com restrição** (~6 acentos estratégicos em toda a landing — não doodle-fest):
  - Hero: `DoodleStar` gold (canto sup esq), `DoodleSparkles` red (canto sup dir), `DoodleArrow` red apontando para o mapa, `HandNote` "clica numa cidade ↗" (bottom-left do mapa), `TapedPhoto` com `hero.webp` rotated colado sobre canto sup dir do card-mapa.
  - Product header: `DoodleZigzag` gold + `DoodleUnderline` gold debaixo do título.
  - Mission: `DoodleHeart` red top-right + bairro illustration confinada ao right-half com mask gradient.
  - HowItWorks: `TapedPhoto` com `mapaPoster` (mapa fanzine ilustrado) rotated, azul/verde tapes.
  - FinalCta: `DoodleSparkles` gold top-right + `DoodleStar` gold bottom-left dentro do banner vermelho.
- ✅ **Imagens contextuais nos product snapshots** (4 cards): Porto.webp no Feed, Lisboa.webp em DMs, Algarve.webp em Eventos, CtaCommunity em Comunidades — cada card tem agora um header visual fanzine de 140px + badge categoria.
- ✅ **WhyNotFacebook readability fix**: imagem `bairro.webp` confinada ao right-half da secção com mask gradient (transparent→dark), texto à esquerda 100% legível.
- ✅ **Mantidos todos os data-testid** existentes — zero quebras.


## Implemented (Feb 2026 · v2) — Landing PIVOT estratégico "Mapa Social Vivo"
- ✅ **Reposicionamento 70-point audit completo**: deixar de vender "rede social portuguesa genérica" e passar a vender **"O mapa social vivo das cidades portuguesas"** (cidade como protagonista).
- ✅ **Landing.js reescrita** (1197 → 1085 linhas, ~960 conteúdo + 120 helpers): tirado todo o conteúdo de stats vazios (0 membros/0 posts), doodles excessivos, stamp shadows pesadas, amarelo gratuito.
- ✅ **Mapa SVG interactivo de Portugal** como protagonista do hero (continente + Madeira + Açores inset): 14 cidades-âncora clicáveis com cores PT (vermelho/dourado/verde/azul), pulse animado na cidade activa, painel de detalhe sob o mapa (`CityDetail`). Pointer-events bem geridos (path tem `pointer-events:none`, dots têm `pointer-events:all` + hit-area alargada que cobre label).
- ✅ **CTA primário: "Reservar o teu username"** (substitui "Criar conta") com waitlist real (POST /api/waitlist/reserve). Disponibilidade ao vivo (debounced 320ms) via GET /api/waitlist/check. Sucesso mostra posição na waitlist (#N).
- ✅ **Backend — 4 novos endpoints públicos**:
  - `GET /api/landing/pulse` — stats curadas (cidades_suportadas, eventos_indexados, bairros_indexed, regiões_cobertas, eventos_next_7d, reservations_total) — sempre não-zero.
  - `GET /api/landing/cities` — 14 cidades-âncora (12 continente + 2 ilhas) com slug/name/region/tag/x/y/accent + events_count + communities_count.
  - `POST /api/waitlist/reserve` — reserva idempotente (mesma email+username = ok), 409 se username ocupado por outro email, 400 em reservados (admin/root/etc), 60s cooldown per-email, rate-limit 6/min per IP.
  - `GET /api/waitlist/check?u=...` — verificação em tempo real (rate-limit 30/min).
  - CSRF middleware actualizado: `/api/waitlist/` adicionado a CSRF_EXEMPT_PREFIXES.
  - Mongo collection nova: `waitlist` (id, username, email, city, ip, ua, created_at).
- ✅ **Visual sóbrio**: paleta PT mantida mas amarelo PT.gold usado apenas como highlighter typográfico em "cidades portuguesas" (1 ponto deliberado) + badge premium opt-in. Restante UI clean.
- ✅ **Snapshots de produto cleanos** (Feed, DMs, Eventos, Comunidades) — sem imagens stock, mockups CSS limpos.
- ✅ **Manifesto "Porquê não somos o Facebook"** (4 pilares: algoritmo de proximidade, zero ads, dados em PT, sem doomscroll).
- ✅ **FAQ + Premium movidos para o fundo** (Premium em card compacto, sem fricção).
- ✅ **Tests**: pytest backend `/app/backend/tests/test_landing_waitlist.py` 17/17 a passar. Testing agent: 100% backend, 90%→100% frontend após fixes pointer-events + orphan period + yellow→red em WhyNotFacebook.
- ✅ **`.env` recriados** após fork (problema recorrente — `MONGO_URL`, `DB_NAME`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `REACT_APP_BACKEND_URL`).

## Backlog (actualizado · Fev 2026 v2)
- P1: Página dedicada `/cidades/:slug` com camada bairro/freguesia/rua (audit pediu hierarquia Cidade→Bairro→Rua)
- P1: Onboarding pós-waitlist (reservar → escolher cidade → ver mapa do bairro)
- P1: Ritmos diários "Cidade da semana" / "Evento da semana" (notificações ritualizadas)
- P1: Páginas internas (Perfil `/u/:username`, Mensagens `/messages`, Comunidades `/communities`) — mesma linguagem visual
- P1: MobileTopBar + MobileBottomNav — alinhar tom fanzine
- P2: Verticais (Turistas / Diáspora / Universidades) com landings dedicadas
- P2: Migração SVG → Leaflet/MapLibre quando escalar para zoom + neighbourhood layer
- P2: "Aha moment" core nuclear action design (primeiro post de cidade)
- P2: Telemetria de conversão waitlist→registo→primeira interação
- P2: Refactor split — `Landing.js` para `/pages/landing/{Hero,PortugalMap,...}.jsx`; `server.py` para routers
- P3: Confirmar typo "Crjar conta" no Login
- P3: Telemetria de auth failures
- P3: Onboarding "primeiros perfis a seguir" pós-registo
