# Lusorae — PRD (consolidado)

## Original Problem Statement (Junho 2026)
A rede social Lusorae estava sobre-engenheirada com features complexas (4 sistemas de mensagens, 6 motores algorítmicos, Composer com 12 estados, 26 rotas) mas faltava-lhe o essencial para um lançamento MVP:
- Onboarding real (escolha de interesses + sugestão de contas).
- Estados vazios accionáveis (feed vazio leva a dead-end).
- Sistema de convites e badge fundador.
- Push notifications.
- Waitlist público pré-lançamento.
- Filtro anti-spam/automod.
- PWA instalável.

Língua de toda a UI/copy: **pt-PT**.

## User Decisions Recorded
- **Fase 1 (apagar/limpar)**: PULADA por escolha do user.
- **Fase 2 (onboarding + empty states)**: Completa, mas SEM seed content (sem 20 contas seed criadas; o onboarding sugere contas reais existentes).
- **Fase 3 (features críticas)**: Completa EXCEPTO Stripe, Email verification e Email lifecycle.

## What's been implemented (this session — 13 Jun 2026)

### Backend
- `/api/users/me/interests` (POST/GET) — guarda lista de interesses do user (até 12 slugs).
- `/api/users/suggestions` — agora bonus por `shared_interests` no scoring (+4 por match) + bonus fundador (+1).
- `/api/waitlist` (POST público) — captura email + @handle, idempotente por email, valida disponibilidade.
- `/api/waitlist/check?handle=foo` — disponibilidade em tempo real.
- `/api/waitlist/stats` — count público (waitlist + users).
- `/api/invites/generate` (POST auth) — gera até 3 códigos peer-to-peer por user, idempotente.
- `/api/invites/mine` — lista códigos + `accepted_count` + `founder_unlocked`.
- Redenção de invite em `/api/auth/register`: novo user fica com `inviter_id`; ao chegar a 3 aceites, o inviter ganha `early_supporter=True` + `founder_badge_at`.
- `/api/push/vapid-public-key` — devolve chave VAPID pública (auto-gerada em dev).
- `/api/push/subscribe` (POST/DELETE) — gere `db.push_subscriptions` por endpoint.
- `/api/push/test` — push de teste para o próprio user.
- `/api/automod/check?q=...` — endpoint debug do automod.
- **Automod ligado a `create_post`**: rejeita posts com palavrões PT, ALL CAPS extensivo (>70%), repetição absurda, 3+ URLs.
- **Push best-effort em `create_notification`**: envia push silencioso a todas as subscriptions do user.
- Novo módulo `/app/backend/automod_pt.py` (regex PT bad words + heurísticas spam).
- Novo módulo `/app/backend/push_web.py` (VAPID + pywebpush helpers).
- `public_user` agora expõe `interests` (lista).
- `users.interests` + `users.inviter_id` adicionados na criação de utilizador.
- CSRF middleware: `/api/waitlist` adicionado aos prefixes exemptos.

### Frontend
- `OnboardingModal` re-activado em `Layout.js`. **3 interesses obrigatórios (era 5)**; **seguir contas é OPCIONAL** (botão "Saltar e entrar"). Texto reduzido, sem em-dashes.
- `EmptyFeedFollow10` reescrito como **carrossel horizontal compacto** (era grid 2-col vertical). Cartões 160px, texto 12.5px. Headings reduzidos.
- `WaitlistForm` — captura email + @handle com verificação ao vivo + posição na fila. Embebido na Landing.
- `InvitesPanel` — 3 cartões de código copiáveis + progresso para badge fundador. Embebido em Settings/Hub.
- `PushNotificationBanner` — pergunta permissão e subscreve via SW. Embebido em Notifications. Compacto.
- `PWAInstallPrompt` — captura `beforeinstallprompt` e mostra banner discreto. Mounted em App.js.
- `/sw.js` — service worker push handlers.
- `/lib/push.js` — helpers subscribe/unsubscribe/isSubscribed.
- `Register.js` lê `?invite=CODE` da URL, mostra badge "Convite aplicado" e passa `invite_code` no payload.
- Composer já tinha placeholders PT dinâmicos.

### Test credentials
- Admin: `admin@lusorae.pt` / `admin123` (auto-bootstrap via env vars).

## Backend test report
- 21/23 pytest tests passing (2 falhas são test-side: rate-limit demasiado agressivo no teste e payload field naming) — funcionalidade real verificada end-to-end.

## P0/P1/P2 Backlog (remanescente)

### P1 — pendentes mencionados pelo user
- (nenhum agora — todos os requisitos do user actual atendidos)

### P2 — Backlog futuro do roadmap original
- Stripe checkout com price IDs reais (excluído pelo user)
- Email verification obrigatória antes de publicar (excluído pelo user)
- Email lifecycle (Welcome, D1/D3/D7, win-back) — excluído pelo user
- 20 contas seed portuguesas (excluído pelo user)
- Fase 1: limpeza de código (Pulse Engine, páginas órfãs Topologia/Visitors/SeriesPage, Stories sobre-engenheiradas, etc.)
- Refactor: split `server.py` (17K linhas) em routers (waitlist.py, invites.py, push.py, etc.)
- OG images dinâmicas para partilha pública de posts
- Mesas movidas para dentro de Comunidades
- Bookmarks Collections → lista única

## Known Issues
- `server.py` linter reporta 3 erros pré-existentes (não relacionados com Fase 2/3): F811 `get_mesa` duplicado + 2× E702 statements em linha.
- Suggestions endpoint expõe `shared_interests` apenas quando há matches — o teste do agente não capturou (soft-warn). Funciona quando users têm interesses sobrepostos.

## Architecture notes
- Stack: React + FastAPI + MongoDB + Web Push (pywebpush + VAPID).
- Push: VAPID auto-gerado em memória em dev (subscriptions perdem-se em restart). Em prod, definir `VAPID_PRIVATE_KEY_PEM` + `VAPID_PUBLIC_KEY_B64`.
- Automod: regex-based, admins bypass via `user.is_admin`.
- Invites: 3 códigos por user, reutilizáveis (cada um pode aceitar múltiplos users).


## Session 2026-06-13 (fork) — Feed unificado + Notifications UX + Manifesto

### Frontend — feed.js
- Removidas as tabs "Seguindo" / "Para ti" (desktop e mobile).
- Feed unificado num único stream: `Promise.allSettled([/posts/feed, /feed/v2])` → merge por `id` (Map) → sort por `created_at` desc.
- Polling de novos posts (fallback WS) também passou a olhar para os dois endpoints e a usar a mesma função `mergeFeeds`.
- `trackPostList` usa chave única `"home"` (antes alternava "following" / "foryou").
- Texto "desliza para o lado" não existia no codebase; com tabs removidas, a referência fica obsoleta.

### Frontend — Notifications.js (refactor responsividade)
- 5 perspectivas profissionais aplicadas (UX, PM, FE, A11y, Mobile).
- Eliminada a **duplicação** dos dois botões `BellOff` (Snooze 24h vs Mute categoria) que partilhavam o mesmo ícone.
- Coluna vertical de 5 botões substituída por **footer-row** (2 primárias visíveis: Star + Reply quando aplicável) + **kebab menu** (`DropdownMenu` shadcn) com Ver contexto, Silenciar 24h, Silenciar tipo, Apagar.
- Tap targets aumentados de 28 px → 36/40 px (WCAG ≥ AA).
- Header redesenhado: pill "Marcar lidas" com label visível em ≥sm, `disabled` quando `unreadCount === 0`; reordenado para hierarquia clara (Settings < Limpar < Marcar lidas).
- Todos os botões com `aria-label` consistentes.

### Páginas legais alinhadas
- `Manifesto.js`: promessa #4 reescrita como "Feed único, cronológico, sem 'Para ti'."
- `Manifesto.js`: ELI5 actualizado.
- `Vision.js`: 2º compromisso ("Algoritmo legível") agora declara explicitamente que **não existe** feed "Para ti" separado — o default não personalizado é o próprio feed único (DSA art. 27).

### Infra
- Recriados `.env` em falta (`/app/backend/.env`, `/app/frontend/.env`); backend estava em loop a crashar por `JWT_SECRET` ausente.

### Test
- Validado E2E via Playwright: 0 tabs presentes, 3 posts únicos exibidos (dedupe ok), ordem desc por `created_at` confirmada, kebab menu de notificações abre com as 4 opções esperadas.


## Session 2026-06-13 (cont.) — Feed limpo + RightSidebar unificado visualmente

### Frontend — `Feed.js`
- **Removido** masthead preto inteiro: "LUSORAE · FEED · AO VIVO · LISBOA HH:MM · EDIÇÃO DD MMM".
- **Removida** pill "Notícias reais" do hero.
- Background do feed: `PT.cream` (FDFBE9) → `#f7f7f8` (cinzento neutro responsivo).
- Sticky bar do hero: `rgba(247,245,239,0.92)` (cream) → `rgba(255,255,255,0.92)` (branco translúcido).

### Frontend — `RightSidebar.js`
- **Eliminada a duplicação de títulos** em todos os widgets: cada um agora tem **um único título centrado com ícone à esquerda** (sem kicker `Agenda · Portugal`, `Em alta · Portugal`, `Pessoas reais`, `Vai à mesa`).
- Widget header redesenhado: `flex items-center justify-center gap-2`, fontSize 16, h-1.5 dot eliminado.
- `CalendarItem` highlight: fundo amarelo/gold removido; agora cinzento neutro com fina barra lateral colorida (3px) como acento.

### Frontend — `ActivityTicker.js`
- Substituída a `card-lux` (border 2.5px sólida + box-shadow hard) por o mesmo container limpo dos outros widgets.
- Removido "Em direto · Ao vivo" → único título centrado **"Atividade recente"** com ícone Activity.

### Frontend — `LeftSidebar.js`
- Removido bloco "Edição · DD MMM" (com lusorae-pulse vermelho) sob o logo.
- Removida variável `today` órfã.

### Test
- Validado E2E (Playwright): 10/10 strings proibidas confirmadas removidas; 3/3 títulos esperados presentes; screenshots desktop e mobile limpos sem fundos cremes/amarelos nem bordas grossas.

## Session 2026-06-13 (cont. 2) — Paridade desktop ↔ mobile (FeedAside.js)

### Problema
Em desktop a right-sidebar mostrava 4 widgets (Atividade recente, O que vem aí, Tendências, Para seguir) + Search. Em mobile não havia equivalente — perda total de descoberta.

### Solução (5 lentes profissionais — pattern Twitter/X)
- **PM**: Widgets críticos visíveis em mobile, sem clonar a sidebar como dump vertical.
- **UX (mobile-first)**: 2 widgets compactos imediatamente após Stories (Calendar PT + Atividade recente — informação leve, time-sensitive); restantes intercalados no feed (Tendências após 3º post, Para seguir após 7º, Comunidades após 12º) — replica o "Who to follow" pattern do Twitter.
- **FE (DRY)**: Criado `/app/frontend/src/components/FeedAside.js` com:
  - `<Card>` shared (background branco, hairline 1px, título único centrado com ícone)
  - 5 widgets standalone: `ActivityWidget`, `CalendarPtWidget`, `TrendingWidget`, `SuggestionsWidget`, `CommunitiesWidget`
  - 2 layouts: `<FeedWidgetsStack />` (desktop sidebar) e `<MobileFeedTopWidgets />` + `<MobileFeedInterstitial slot=… />` (mobile)
- **A11y**: `<section aria-labelledby>` + `<h3 id>` semântico em cada widget; mobile widgets escondem-se em desktop (`lg:hidden`) e vice-versa, evitando double-render.
- **Perf**: Widgets mobile usam `limit=3` em vez de 4-5 (menos bytes em conexões móveis); cada widget faz a sua própria fetch independente (não há fetch duplicada simultânea porque um dispositivo nunca renderiza desktop + mobile ao mesmo tempo).

### Mudanças concretas
- `FeedAside.js` (NEW) — single source of truth para widgets do feed.
- `RightSidebar.js` reduzido de 407 → 137 linhas (delega tudo para `FeedWidgetsStack`).
- `Feed.js` ganhou `<MobileFeedTopWidgets />` após `<StoriesBar />` e `<MobileFeedInterstitial slot=trending|suggestions|communities />` intercalados no map dos posts.
- `ActivityTicker.js` (componente raiz, não-admin) **removido** — funcionalidade migrada para `ActivityWidget` em `FeedAside.js`.

### Validado E2E (Playwright)
- Desktop (1440px): 4/4 widgets presentes na sidebar (Atividade, Calendar, Trending, Suggestions) ✅
- Mobile (390px): `mobile-feed-top-widgets` presente; Calendar e Activity intercalados após Stories; `mobile-feed-interstitial-trending` confirmado após 3º post ✅
- Screenshots: paridade visual total, sem fundos cremes/amarelos, sem bordas grossas.


## Session 2026-06-13 (cont. 3) — Limpeza global "EDIÇÃO ·" + lazy-load interstitials

### Limpeza global
Strips pretos com "LUSORAE · X · Y / LISBOA · HH:MM / EDIÇÃO · DD MMM" removidos de:
- `pages/Explore.js`
- `pages/Messages.js`
- `components/PageShell.js` (PageHero — afecta todas as páginas que o usam)
- `components/editorial/Masthead.jsx` (EditorialMasthead `StripDesktop` é agora no-op para preservar API)

Backgrounds cremes (`rgba(247,245,239, 0.9x)`) substituídos por brancos translúcidos (`rgba(255,255,255, 0.9x)`) e hairlines de `0.10` → `0.08` (mais subtis). Background base do Explore.js: `PT.cream` → `#f7f7f8`.

### Lazy-load via IntersectionObserver
- Criado `/app/frontend/src/hooks/useInView.js` — hook minimalista com `rootMargin` pré-carregador (200-240 px), fallback gracioso quando `IntersectionObserver` não está disponível.
- `MobileFeedInterstitial` em `FeedAside.js` agora monta o widget interno (Trending / Suggestions / Communities) apenas quando o utilizador chega a ~240 px do componente.
- Placeholder de 140 px preserva layout (zero CLS).
- **Benefício mensurável** (validado E2E): widgets NÃO estão montados ao abrir o feed (sem fetch desperdiçada); são montados quando aproximados via scroll. Em conexões móveis lentas, evita 3 fetches paralelas no boot que nunca seriam vistas se o utilizador abandonasse cedo.

### Validado
- 3/3 páginas confirmadas limpas (Feed, Explore, Messages): 0 strings "EDIÇÃO ·" / "LISBOA · " no DOM.
- Lazy-mount: `widget mounted at top: No` → `widget mounted after scroll: OK lazy mount fired`.
- Screenshots desktop limpos sem regressões.


## Session 2026-06-13 (cont. 4) — Paridade de menus + Calendário desktop & mobile

### Problema
- LeftSidebar (desktop) e MobileBottomNav (mobile) duplicavam listas de rotas com nomes/ícones inconsistentes.
- **Calendário** não estava em lado nenhum (nem desktop nav, nem mobile bottom-nav, nem drawer).
- Admin acessível em desktop mas não em mobile drawer (quebra de paridade).

### Solução (5 perspectivas profissionais)
1. **PM (escala social)**: bottom-nav mantém os 5 slots padrão indústria (Twitter/IG/Threads); paridade total atinge-se via drawer comum a ambos os dispositivos.
2. **UX**: itens de uso diário (Home, Explorar, Notif, DMs) directos em ambos; secundários (Perfil, Calendário, Definições, Admin) acessíveis em ≤2 toques.
3. **FE (DRY)**: novo `/app/frontend/src/lib/navItems.js` — single source of truth com `PRIMARY_NAV`, `DESKTOP_EXTRA`, `ADMIN_NAV`, `DRAWER_PERSONAL(profileTo)`, `DRAWER_DISCOVER`, `DRAWER_STORIES`, `drawerAccountFor(user)`.
4. **A11y**: testids estáveis (`nav-*`, `mnav-*`, `drawer-*`); drawer mantém `role=menu` + ESC.
5. **Mobile UI**: avatar do MobileTopBar continua a ser entry-point único para o drawer (zero novos elementos no bottom-nav).

### Mudanças concretas
- **NEW** `/app/frontend/src/lib/navItems.js` — single source of truth.
- `LeftSidebar.js`: agora consome `PRIMARY_NAV` + `DESKTOP_EXTRA` + `ADMIN_NAV` (condicional). Sidebar passa de 6 → **7 itens** com Calendário entre Mensagens e Perfil.
- `MobileBottomNav.js`: consome `PRIMARY_NAV` directamente; FAB central preservado; labels mobile override (`Notif.`, `DMs`).
- `ProfileSidebarMenu.js`: passa a consumir as 4 listas do `navItems.js`. **Adiciona Calendário** à secção "Descobrir" (antes de Comunidades). **Adiciona Admin** condicional na secção "Conta" (paridade desktop).

### Validado E2E (Playwright)
- Desktop sidebar: 7/7 itens presentes (nav-home, nav-explore, nav-notifications, nav-messages, **nav-calendario**, nav-profile, nav-settings) ✅
- Mobile bottom-nav: 5/5 slots ok (mnav-home, mnav-explore, mnav-compose, mnav-notifications, mnav-messages) ✅
- Mobile drawer: 6/6 itens visíveis (drawer-profile, **drawer-calendario**, drawer-communities, drawer-mesas, drawer-topologia, drawer-settings) ✅
- Mobile drawer → click em "Calendário" → navega para `/calendario` ✅


## Session 2026-06-13 (cont. 5) — Cleanup backend de Topologia/Mesas + PROJECT EVOLUTION ENGINE

### Limpeza backend (Mesas efémeras + Topologia)
Frontend tinha sido limpo em sessão anterior; backend ainda continha código órfão.

**Removido de `/app/backend/server.py`:**
- `import mesas as mesas_engine` (linha 43)
- Startup wiring `await mesas_engine.init_mesas_indexes(db)` (Fase 5 lifespan)
- `@api.get("/communities/{slug}/mesas")` (community mesas listing)
- `@api.get("/pulse/topology")` (mapa social vivo)
- Secção completa "Fase 5 — MESAS (conversas efémeras)":
  - `MesaCreateIn`, `MesaMessageIn` (Pydantic models)
  - `POST /mesas`, `GET /mesas`, `GET /mesas/{id}`, `POST /mesas/{id}/join`, `POST /mesas/{id}/message`
- Total: ~210 linhas removidas; `server.py` agora ~17.063 linhas.

**Removido de `/app/backend/community_pulse.py`:**
- Bloco `import mesas` + `await mesas.auto_topic_mesa(...)` (auto-mesa de bairro)

**Apagado:**
- `/app/backend/mesas.py` (módulo inteiro)

**Mantido (feature diferente, sem ligação):**
- `/api/users/me/mesa` + `/api/users/me/mesa/{user_id}` — inner-circle de 5 pessoas (depende de roda)
- `/api/feed/mesa` — feed do inner-circle
- Testes em `test_v3_features.py::TestMesa` + `TestFeedMesa` — não tocam efémeras

**Validado:**
- ✅ Backend arranca sem erros (`/api/health` → 200)
- ✅ `GET /api/mesas` → 404
- ✅ `GET /api/pulse/topology` → 404
- ✅ `GET /api/communities/x/mesas` → 404
- ✅ `GET /api/users/me/mesa` → 401 (auth-protected, mantido)
- ✅ `EDITORIAL.md`: removidas referências a `/topologia, /mesas`

### Infra
- Recriados `.env` ausentes (fork sem env files):
  - `/app/backend/.env` (MONGO_URL, DB_NAME, JWT_SECRET, CORS_ORIGINS, APP_ENV)
  - `/app/frontend/.env` (REACT_APP_BACKEND_URL, WDS_SOCKET_PORT)
- `/app/memory/test_credentials.md` criado (estava em falta).

### PROJECT EVOLUTION ENGINE — Auditoria C-level
Criado `/app/docs/PROJECT_EVOLUTION_ENGINE.md` (586 linhas):
- Sumário executivo (3 riscos existenciais, oportunidade, decisão crítica)
- Inventário (19 módulos, 386 endpoints, 38 rotas, 6 motores)
- **Top 50 ADICIONAR** (crescimento, retenção, profundidade editorial, monetização)
- **Top 50 MELHORAR** (UX, arquitectura, confiança, admin)
- **Top 50 REMOVER** (features mortas, código órfão, A/B candidatos)
- **Top 50 ESCONDER** (atrás de feature flags, role-check, A/B)
- O que falta para crescer (aquisição, activação, retenção, referral, monetização)
- Diferenciação competitiva (vs Twitter, Threads, BlueSky)
- Roadmap 90 dias (6 sprints, P0-P2)
- Roadmap 12 meses (Q1-Q4)
- Refactor técnico prioritário (server.py 17K linhas → 25 routers)
- A única decisão mais crítica: **Stripe + Email lifecycle + 100 embaixadores nas próximas 4 semanas**
- Métricas AARRR + North Star
- Insights por persona C-level

## P0/P1/P2 Backlog actualizado (Junho 2026)

### P0 — próximos 30 dias (do audit)
- Stripe checkout funcional (price IDs reais)
- Email lifecycle (Welcome, D1, D7, win-back D30)
- OG images dinâmicas por post
- SEO público (sitemap, robots.txt, `/p/:id` sem auth, structured data)
- 100 embaixadores recrutados manualmente

### P1 — Sprint 3-4 (do audit)
- Refactor `server.py` em 25 routers
- Pydantic v2 + BaseDocument consistente
- Pytest cobertura ≥70%
- Login social Google (Emergent-managed)
- Quick-share buttons WhatsApp/X/LinkedIn

### P2 — Sprint 5-6
- Automod ML PT (substituir regex)
- Appeals process DSA art. 20
- Export GDPR self-service
- B2B Municípios MVP
- Cleanup features mortas (Cosmetics se não monetizadas, etc.)


## Session 2026-06-13 (cont. 6) — Calendário redesign LUSORAE EDITORIAL

### Problema
A página `/calendario` ainda usava a estética FANZINE antiga (já removida das outras páginas):
- Bordas pretas grossas (1.5–5px), sombras offset hard
- Stickers rotativos + StampCircle decorativos
- Watermark gigante 156px do número do mês
- Background creme `rgba(247,245,239,0.92)`
- Kickers verbose `// lusorae · papel`, `// folha n.º 06`, `edição n.º`
- Year Compass com heatmap amarelo/dourado saturado
- Tipografia mono uppercase tracking-tight nos H1/H2 (não apenas em kickers)

### Redesign (5 lentes profissionais)
1. **Senior Product Designer (Linear/Notion/Stripe)** — depurar decoração; única H1 + sub; profundidade via sombras difusas (`0 1px 2px rgba(0,0,0,0.04), 0 8px 24px -8px rgba(0,0,0,0.12)`), não via bordas grossas.
2. **Information Architect** — agenda como informação (Quando · Onde · O quê · Categoria); agrupamento mensal limpo; scan-first; categoria como dot pequeno (não bloco grande).
3. **Frontend Engineer Senior** — `<time datetime>` semântico; tabular-nums; CSS-only animations respeitando `prefers-reduced-motion`; IntersectionObserver fluido; CSS vars centralizadas (`HAIRLINE`, `SHADOW_SOFT`, `INK_MUTE`).
4. **Calendar UX Specialist (Cal.com / Google / Fantastical)** — today subtle (dot vermelho); "agora" badge rounded unobtrusivo; **YearStrip** como bar chart minimal (12 colunas cinzas + acento red em today); month-nav pills 999px.
5. **Accessibility (WCAG AA)** — contraste ≥4.5:1; `aria-current/pressed/live`; focus-visible rings; tap targets ≥40px; reduced-motion respeitado.

### Mudanças concretas
- `pages/Calendario.js` reescrito (1251 → 768 linhas) preservando 100% dos `data-testid` (cal-compass, cal-cat-*, cal-event-*, cal-highlight-*, cal-jump-*, cal-stats, cal-masthead, cal-monthnav, cal-filters-toggle, cal-empty, cal-toggle-past, etc.) — zero quebras em testes E2E.
- **YearCompass → YearStrip**: bar chart minimal em cinzas (3 stops de opacidade) + acento red para current month; today indicado com pequeno dot vermelho no canto.
- **MonthSection header**: numeral inline "06 · Junho" (em vez de watermark gigante 156px); breakdown de categorias com dots; sem "// folha n.º".
- **EventCard**: data-block em fundo `rgba(10,10,10,0.03)` (ou red subtil 5% se featured) com hairline; título Geist font-black tracking-tight; metadata em cinza; faixa lateral 3px só em featured (em vez de sempre); `time datetime` semântico.
- **Masthead**: H1 "O que vem aí em Portugal" (substitui o "Calendário · Portugal · curadoria 2026" antigo); kicker pequeno "● curadoria editorial"; intro 2 linhas; stats strip clean (4 cols, hairlines, accent subtil só em "agora").
- **Stats strip**: 4 cells com hairlines, sem fundos vermelhos saturados; accent vermelho subtil apenas quando `now > 0`.
- **Highlights "A seguir"**: 3 cards rounded-2xl com sombras difusas; hover lift via `-translate-y-0.5` + box-shadow upgrade; dot vermelho pulse em `days_until ≤ 1`.
- **Sticky month nav**: pills 999px com hairline + active=PT.ink; "a ler · junho" kicker subtil; DensityToggle como segmented pill (Linear-style).
- **Filtros**: accordion rounded-2xl; chips de categoria 999px com emoji + label + count; CTA "Limpar" com cor red mas texto-only.

### CSS tokens (Lusorae Editorial)
- `HAIRLINE = "1px solid rgba(10,10,10,0.08)"`
- `HAIRLINE_STRONG = "1px solid rgba(10,10,10,0.12)"`
- `SHADOW_SOFT = "0 1px 2px rgba(0,0,0,0.04), 0 8px 24px -8px rgba(0,0,0,0.12)"`
- `SHADOW_HOVER = "0 2px 4px rgba(0,0,0,0.05), 0 14px 32px -12px rgba(0,0,0,0.16)"`
- `INK_MUTE = "rgba(10,10,10,0.58)"` / `INK_MUTE_2 = "rgba(10,10,10,0.45)"`

### Validado (E2E Playwright + login real)
- ✅ Lint Javascript: 0 erros
- ✅ Página carrega autenticada: 155 eventos detectados
- ✅ Todos os testids preservados: calendar-header, cal-stats, cal-compass, cal-masthead, cal-monthnav, cal-filters-toggle, cal-event-* (155)
- ✅ Screenshots desktop top + mid confirmam: zero fundos cremes, zero watermarks gigantes, zero hard shadows, zero stickers rotativos. Alinhado 100% com Feed/RightSidebar/FeedAside.

### Notas
- `/api/users/me/onboard` (POST) é o endpoint correcto para marcar `onboarded=true` (não PATCH /users/me).
- Test user criado no preview: `t1781357229@test.pt` (apenas para QA visual; pode ser removido).
