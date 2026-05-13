# Vermillion — Product Requirements (Living)

> Última atualização: 14 Fev 2026

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
- Vermillion+ (Stripe — quando user fornecer API key)
- Sub-communities (Mesas dentro de comunidades)
- Cosmetics drops sazonais (Sto António, Natal)
- Public Identity Card exportável SVG/PNG

## Endpoints / Coleções
Ver `/app/docs/FEATURES.md` para inventário exaustivo (130+ endpoints, 16 coleções MongoDB).
