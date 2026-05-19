# Lusorae — Product Requirements (Living)

> Última atualização: 18 Fev 2026 (rev 3 — O Selo Lusorae)

## Visão
"A internet portuguesa moderna" — uma rede social PT-PT com profundidade, identidade emocional e UX premium. Mistura de Twitter/X, Reddit, Discord social, Instagram identity, BeReal intimacy, Letterboxd personality.

## Stack
- **Frontend:** React 19 + Tailwind + Shadcn UI + Sonner + Lucide
- **Backend:** FastAPI + Motor (MongoDB async)
- **Realtime:** WebSocket (`/ws`) gateway
- **Auth:** JWT em cookie httpOnly + localStorage fallback

## Core Principles
- **PT-PT first** — toda a UI, microcopy, mood, cidades, badges
- **Slow social** — conversa > engagement viral
- **Identity layer fortíssima** — bio slots PT, cosméticos, charms, streak, presença
- **Diversidade algorítmica** — diversity penalty + hidden gems + tuner
- **Sem AI gerativa** (excluído explicitamente)

## Sprints Concluídos

### Sprint 1 — UX Foundations (Jan 2026)
- Click-outside global + ESC para modais
- Loading Spinners em ações
- Empty states com CTAs em cada página
- Bookmarks instant removal
- Comentários Reddit-style (nested infinite + collapse + cascade delete)
- Bio chips clicáveis no Profile

### Sprint 2 — V2 Modern Social (Fev 2026)
13 features full-stack:
- Recados 24h, Presence Status, Custom Community Reactions
- Pinned Comments, Series/Coleções, Profile Visitors
- Charms (12 colecionáveis), Roda (close friends PT, 25 max)
- Starter Packs, Hype Train, Collab Posts
- Avatar Cosmetics (free tier, 7 frames + 7 stickers)
- For You Reason Chips

### Sprint 3 — V3 Identity + Realtime + Ranking (Fev 2026)
- **Ranking Engine v2** com diversity penalty, hidden gems, time-of-day mood mixing
- **For You Tuner** (3 sliders + 4 presets)
- **Streak Engine** (daily streak + 2 freezes/mês + milestones)
- **Mesa** (inner-inner circle, 5 max, sub-Roda)
- **WebSocket Gateway** com presence broadcast, typing, activity ticker
- **ActivityTickerLive** real-time
- **ConnectionIndicator** (live/reconnecting/offline)
- **Hashtag Suggester** inline no composer
- **Mood Auto-tag** no composer (8 moods PT)
- **Notifications Priority** view (urgent > Mesa/Roda > following > strangers)
- **Trending Pulse** SVG sparkline 7d
- **Charms Progress** (locked com % e contagem)
- **Identity Ring** CSS per-mood (8 gradients)
- **Custom Community Emoji Pack** (10 emojis upload)

### Sprint 4 — Avatar PT + Page Hierarchy (Fev 2026)
- **Avatar Premium** com 10 cores PT determinísticas (coral, tejo, pinhal, ouro, vinho, saudade, azulejo, granito, mar, sardinha)
  - Iniciais brancas (primeiro + último nome)
  - Hash determinístico por user.id/username
  - **NamePill** component (background tinted matching avatar)
- **PageShell** primitivas reutilizáveis:
  - `PageShell` (max-width + padding consistente)
  - `PageHero` (icon + title + subtitle + badge + actions)
  - `PageSection` (overline + title + count + cta)
  - `Grid` (1/2/3/4/5 cols responsive)
  - `FilterBar` (sticky tabs)
  - `Chip` (pill segmented)
  - `Empty` (icon + body + cta)
- **Refactor estrutural** (sem scroll infinito, hierarquia visual):
  - `/communities` → grid 2-col, hero hierárquico, FilterBar sticky
  - `/events` → grid 2-col com data cards
  - `/drafts` → grid 2-col compacta
  - `/scheduled` → grid 2-col
  - `/visitors` → grid 3-col

### Sprint 5 — Termómetro Social (18 Fev 2026)
Sistema central reutilizável de energia social. Mostra quão viva está uma
hashtag, cidade, mood, post ou conversa — com **5 estados nomeados** e score
0-100. Subtil no UI (chip), matematicamente robusto.

**Backend:**
- `compute_temperature_score(curr, prev, anchor)` — fórmula:
  `base = (1 − e^(−curr/anchor)) · 70` + `momentum = clamp(velocity%/4, −15, +30)`
- `temperature_object()` → `{score, state, label, emoji, velocity, signals, range}`
- Estados: `frio` (0-19), `morno` (20-39), `quente` (40-59), `em_brasa` (60-79), `a_ferver` (80-100)
- **Endpoint universal:** `GET /api/temperature/{kind}/{value}?range={1h|24h|7d|30d}`
  - Kinds suportados: `tag`, `city`, `mood`, `post`, `conversation`
  - Error paths: 400 (kind/city/mood inválido), 404 (post não existe)
- **Payload-compat enrichment:** `/api/trending`, `/api/trending/cidades` e `/api/explore/moods` agora incluem campo `temperature` por item, sem quebrar o schema legado.
- Perfis (anchor + weights) configuráveis por kind em `TEMP_PROFILES`.

**Frontend:**
- `<Thermometer />` (componente puro) — variantes `chip`/`inline`/`dot`, tamanhos `xs`/`sm`/`md`. Pulse subtil CSS (`anim-pulse-soft`) em estados quentes (em_brasa/a_ferver), respeita `prefers-reduced-motion`.
- `<ThermometerFetch />` (wrapper) — cache em memória partilhado (TTL 60s) + de-dup de in-flight requests para evitar fan-out em listas grandes.
- **Apenas em posts (rev 2):** o chip aparece exclusivamente no header de cada `PostCard`, ao lado do timestamp. Trending, RightSidebar, TagPage e Cidades já não mostram chip de temperatura (decisão UX: o termómetro é uma assinatura *do post*, não de listas).
- 25 testes E2E em `/app/backend/tests/test_thermometer.py` (pure-math + endpoint + legacy-compat + error paths).

### Sprint 5.1 — UX cleanup (18 Fev 2026 rev 2)
Polimentos pedidos pelo utilizador para reduzir ruído visual:
- Removida a fila de chips de moods (`Todos / Saudade / Tasca / …`) em `/explore` — o filtro mood agora vive só por deep-link.
- Tab "Posts" em `/explore` passou a usar ícone `MessageSquare` (antes era `Hash`, duplicado com a tab "Tags").
- Tab "Cidades" perdeu o emoji 🇵🇹 do label.
- Backend: campo `reason` das sugestões de pessoas já não devolve `"popular"` — devolve vazio quando não há mutuais e o utilizador não é novo.
- Stories agora aparecem imediatamente abaixo da greeting ("Bom dia/Boa noite, X"), seguidas pelos tabs de feed.
- Removido o composer inline (`<Composer />`) da home — publicação acontece exclusivamente via o botão "Publicar" (desktop) e o botão central "+" (mobile bottom nav).

### O Selo Lusorae (Fev 2026 — rev 3) — **REMOVIDO (rev 4, pedido do utilizador)**
> A assinatura cursiva manuscrita ("lusorae" em Caveat italic + losango coral) foi
> removida da app em todas as superfícies (Login, Register, RightSidebar,
> AccountPanel, PainelPessoalDrawer, SeloPessoal exportável). Em substituição
> ficou apenas o copyright sóbrio `© lusorae · {ano}` em mono caps. Componente
> `VermillionSeal.js` apagado. Razão: o utilizador considerou que a palavra
> "Lusorae" não se lia bem no traçado, e mesmo após upgrade para webfont
> cursiva optou por linha visual mais limpa.

### Scroll restoration global (rev 4)
- Novo componente `components/ScrollToTopOnNavigate.js` montado dentro de
  `<BrowserRouter>`. Em cada `useLocation` change força `window.scrollTo(0,0)`
  (instant) e limpa scroll de containers internos (`main`, `[data-scroll-root]`).
- Desactiva `history.scrollRestoration` nativo. Respeita `#hash` anchors.

### Centro Legal — Glossário removido (rev 4)
- Rota `/legal/glossary` e página `pages/legal/Glossary.js` apagadas.
- Removida a entrada do menu lateral em `LegalShell.js` (NAV).

## Backlog Prioritizado

### P0 — Refactor estrutural restante
- `/bookmarks` → grid + drawer de coleções
- `/trending` → grid + sparklines
- `/explore` → unified discovery layout
- `/messages` → 2-pane desktop + drawer mobile

### P1 — Novas rotas pendentes
- `/mesa` — feed exclusivo (backend `/api/feed/mesa` já existe)
- `/charms` — galeria pública de charms
- `/search` — pesquisa dedicada

### P2 — Profundidade
- Polls v2 (sentiment + scale + ranking)
- Community roles & moderation
- Realtime DM (WS já tem typing, falta delivery states)
- RGPD consent tracking no registo
- Refactor `server.py` (~4600 linhas) em módulos

### P3 — Backlog longo
- Lusorae+ (Stripe — quando user fornecer API key)
- Sub-communities (Mesas dentro de comunidades)
- Cosmetics drops sazonais (Sto António, Natal)
- Public Identity Card exportável SVG/PNG

## Endpoints / Coleções
Ver `/app/docs/FEATURES.md` para inventário exaustivo (130+ endpoints, 16 coleções MongoDB).
