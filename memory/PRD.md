# Vermillion - Rede Social

## Problem Statement
Cria uma rede social completa e complexa ultra refinada. Sem erros, todos os botões funcionam.

## User Choices
- Auth: Email/password (JWT cookie)
- Theme: **Light** (white/black + silver gradient + soft red/green/blue accents)
- Mobile-first feel (fixed top bar, bottom nav, bottom-sheet composer, pull-to-refresh)
- Exclusões explícitas: gamificação, painel admin

## Architecture
- Backend: FastAPI + Motor + MongoDB (UUID string IDs, single server.py)
- Frontend: React 19 + Tailwind + sonner + lucide-react + react-router-dom v7
- Real-time: polling (DMs every 3s, conversations 5s, notifications 8-12s, feed new-posts 30s)
- Theme: Light (Bricolage Grotesque headings, Geist body, JetBrains Mono mono)
- Color overrides system in `index.css` translates legacy zinc/white classes to light theme

## Roadmap

### Phase 1 – Rich Posts ✅ COMPLETO (2026-02-13)
- Backend (`server.py`):
  - `images: [str]` (multi-imagem), `poll`, `reactions`, `is_draft`, `scheduled_at`, `reply_audience`, `edit_history`
  - Endpoints: `POST /posts/{id}/vote`, `POST /posts/{id}/react`, `GET /posts/drafts`, `GET /posts/scheduled`, `POST /posts/{id}/publish`
  - Filtragem: scheduled/drafts excluídos do feed; cron-style move scheduled→live ao expirar
- Frontend:
  - **Composer.js** (já existente): polls (2-4 opções, múltipla, duração), agendamento, audiência, drafts, multi-imagens (até 4)
  - **PostCard.js** rewritten: integra todos os novos componentes
  - Novo `PostPoll.js`: votação em tempo real + barra de progresso + tempo restante
  - Novo `PostReactions.js`: 6 reações (❤️🔥👏😂💯😢) com picker
  - Novo `ImageCarousel.js`: swipe-enabled, indicador 1/N, dots
  - Novo `EditHistoryModal.js`: histórico das últimas 10 revisões
  - Audience badge no header do post (Globe/Users/AtSign)
  - Novas páginas: `/drafts` (Drafts.js), `/scheduled` (Scheduled.js) com publish-now e delete
  - Sidebar: novas entradas "Rascunhos" e "Agendados" + light theme refresh
  - Toaster: tema claro

### Phase 2 – Advanced Conversations (P0) ⏳ PRÓXIMO
- Comments: nested replies (`parent_id` já existe no schema), reply threads UI
- DMs: grupos (multi-participantes), mensagens de voz, partilhar post via DM

### Phase 3 – Privacy & Moderation (P1)
- Block/mute users, palavras silenciadas
- Reportar posts/utilizadores
- Community roles (owner/mod/member/banned) + regras
- Posts followers-only

### Phase 4 – Discovery & Organization (P1)
- Busca avançada (people/posts/tags/communities)
- Listas curadas, pastas de guardados
- Hashtags seguidas, "Quem seguir" melhorado

## Test Credentials
admin@vermillion.app / admin123 (verified, onboarded)

## Notes for Next Agent
- O utilizador pediu para avançar **SEM** chamar testing agent. Manter esse modo até nova instrução.
- Tema é **light only**. Não reintroduzir dark mode ou roxo `#8B5CF6`.
- `index.css` mapeia classes legacy (zinc-*, white/*) para o tema claro — preferir já novas classes `text-black/X`, `border-black/[X]`.

## Backend endpoints (essenciais)
Auth: register, login, logout, me, forgot/reset-password
Users: GET /users/:u, /:u/posts?tab=, /:u/followers, /:u/following, /:u/stats, /:u/heatmap, /:u/mutual, /:u/follow, /:u/search, /suggestions; PATCH /me, POST /me/onboard
Posts: POST /posts (com poll, images, scheduled_at, is_draft, reply_audience, quote_of, community_id), GET feed/explore/bookmarks/drafts/scheduled/tag/:t/:id, PATCH /:id (edit + history), DELETE /:id; POST /:id/like, /:id/bookmark, /:id/repost, /:id/pin, /:id/view, /:id/vote, /:id/react, /:id/publish
Comments: GET /:id/comments, POST /:id/comments (parent_id)
Stories, Communities, Events, Notifications, Messages, Trending, Search
