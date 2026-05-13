# Vermillion — Inventário Completo de Features

> Documento exaustivo de **todas** as funcionalidades, mecânicas, endpoints e ecrãs da rede social Vermillion (PT-PT).
>
> **Stack:** React + Tailwind + Shadcn UI · FastAPI + MongoDB · JWT em cookie httpOnly
> **Idioma:** Português de Portugal (PT-PT)
> **Tema:** Cultura portuguesa (Saudade, Tasca, Festa, Café, Praia, Fado, Bola, Cultura, regiões)
> **Total endpoints:** **130+** · **Rotas frontend:** 30 · **Componentes:** 50+
>
> Última atualização: **2026-02-14**

---

## ÍNDICE

1. [Autenticação & Conta](#1-autenticação--conta)
2. [Feed & Conteúdo](#2-feed--conteúdo)
3. [Composer (criação de posts)](#3-composer-criação-de-posts)
4. [Comentários (Reddit-style)](#4-comentários-reddit-style)
5. [Reações & Interações](#5-reações--interações)
6. [Mensagens Diretas (DMs)](#6-mensagens-diretas-dms)
7. [Notificações](#7-notificações)
8. [Perfis](#8-perfis)
9. [Comunidades](#9-comunidades)
10. [Eventos](#10-eventos)
11. [Exploração & Descoberta](#11-exploração--descoberta)
12. [Tendências (Trending)](#12-tendências-trending)
13. [Identidade Portuguesa (DNA da app)](#13-identidade-portuguesa-dna-da-app)
14. [Pesquisa Global](#14-pesquisa-global)
15. [Guardados & Coleções](#15-guardados--coleções)
16. [Rascunhos & Agendados](#16-rascunhos--agendados)
17. [Stories](#17-stories)
18. [Diáspora](#18-diáspora)
19. [Sino do Bairro & Calendário PT](#19-sino-do-bairro--calendário-pt)
20. [Legal & RGPD](#20-legal--rgpd)
21. [Manifesto](#21-manifesto)
22. [Definições](#22-definições)
23. [UI/UX & Estados Visuais](#23-uiux--estados-visuais)
24. [Mobile](#24-mobile)
25. **[V2 — Pacote Moderno (13 features novas)](#25-v2--pacote-moderno-13-features-novas)**
    - Recados 24h · Presença · Reações Custom · Pinned Comments · Séries · Visitas · Charms · Roda · Starter Packs · Hype Train · Collab Posts · Cosméticos · For You Reasons

---

## 1. Autenticação & Conta

| Feature | Endpoint | UI |
|---|---|---|
| Registo (email/username/password) | `POST /api/auth/register` | `/register` |
| Login (email **ou** username) | `POST /api/auth/login` | `/login` |
| Logout | `POST /api/auth/logout` | sidebar |
| Sessão atual (anónimo-safe → `{user: null}`) | `GET /api/auth/me` | AuthContext |
| Esqueci-me da password (token) | `POST /api/auth/forgot-password` | `/forgot` |
| Reset password com token | `POST /api/auth/reset-password` | `/forgot` |
| JWT em cookie httpOnly + localStorage backup (Safari ITP) | — | `lib/api.js` |
| Toast único em sessão expirada (`AuthContext`) | — | — |
| Onboarding modal pós-registo (60s, mood/região/team) | `POST /api/users/me/onboard` | `OnboardingModal` |
| Admin seed (`admin@vermillion.app`) | — | startup |
| Demo users PT seeded (`bea.lx`, `tiago.cit`, ...) | — | `seed_pt_demo` |

---

## 2. Feed & Conteúdo

| Feature | Endpoint | UI |
|---|---|---|
| Feed principal (Seguindo / Para ti) | `GET /api/posts/feed` | `/` Feed |
| Filtros por **mood** (8 PT) | `?mood=saudade\|tasca\|...` | mood chips no Feed |
| Ordenação **Recente / Top** | `?sort=recent\|top` | toggle |
| Pull-to-refresh com taglines PT | — | `usePullToRefresh` |
| Refresh manual | botão | header |
| Persistência da preferência (localStorage) | — | `lsGet/lsSet` |
| Time-live (relógio relativo "há 3 min") | — | `useLiveTime` |
| Skeleton loaders | — | `Skeleton.js` |
| Infinite scroll (preparado) | — | — |
| Empty states personalizados | — | Feed |
| Categorias do post (mood detectado, cidades detetadas) | auto via `detect_mood` / `detect_cities` | — |
| Anel de identidade (publico/amigos/tasca) | `audience_ring` | composer + post card |

---

## 3. Composer (criação de posts)

| Feature | Endpoint | UI |
|---|---|---|
| Texto até 500 chars | `POST /api/posts` | `Composer` |
| **Até 4 imagens** (carrossel) | `images: []` | `ImageCarousel` |
| **Citações** (quote-post de outro) | `quote_of` | `QuoteModal` |
| **Sondagens** (até 4 opções, ends_in_minutes) | `poll: {options, allow_multiple, ends_in_minutes}` | `PostPoll` |
| **Reply audience** (everyone/following/mentioned) | `reply_audience` | dropdown |
| **Audience ring** (publico/amigos/tasca) | `audience_ring` | chips no composer |
| **Rascunho** (`is_draft: true`) | — | Composer + `/drafts` |
| **Agendamento** (`scheduled_at`) | — | `/scheduled` |
| Auto-publicação de agendados (startup task) | `auto_publish_due_posts` | background |
| Hashtags auto-detetadas | `extract_hashtags` | RichText |
| Menções auto-detetadas | `extract_mentions` | RichText + notifs |
| Edição até 15 min após publicar | `PATCH /api/posts/{id}` | `EditPostModal` |
| Histórico de edições | `edit_history[]` | `EditHistoryModal` |
| **Apagar post** | `DELETE /api/posts/{id}` | menu |
| **Fixar no perfil** | `POST /api/posts/{id}/pin` | menu |
| **Repostar** (clean repost) | `POST /api/posts/{id}/repost` | botão |
| **Citar** (quote repost com comentário) | — | `RepostMenu` |
| **Partilhar** (clipboard) | `POST /api/posts/{id}/share` | menu |
| Tracking de views | `POST /api/posts/{id}/view` | auto |
| **Analytics do post** (autor) | `GET /api/posts/{id}/analytics` | `PostAnalyticsModal` |
| Visualização de post individual | `GET /api/posts/{id}` | `/post/:postId` |
| Lightbox de imagens | — | `ImageLightbox` |
| **Voto em sondagens** | `POST /api/posts/{id}/vote` | `PostPoll` |
| RichText (links, menções, hashtags) | — | `RichText.js` |

---

## 4. Comentários (Reddit-style)

| Feature | Endpoint | UI |
|---|---|---|
| Listar comentários do post | `GET /api/posts/{id}/comments` | `PostDetail` |
| Criar comentário ou resposta | `POST /api/posts/{id}/comments` body `{content, parent_id}` | inline composer |
| **Aninhamento recursivo** (replies infinitos) | `parent_id` | `buildTree()` |
| **Colapsar / Expandir threads** | — | `toggleCollapse` |
| Contador de respostas (`replies_count`) | auto | badge |
| **Cascade delete** (apaga sub-árvore) | `DELETE /api/comments/{id}` | confirma com `window.confirm` |
| Badge "autor" se o comentário for do autor do post | — | inline |
| Reply inline (com Cmd+Enter) | — | textarea |
| Focus automático no input (vindo via `location.state`) | — | rootInputRef |
| Mentions em comentários geram notificações | `handle_mentions` | auto |
| **Comentários destacados** (pinned by author) — **V2** | `POST /api/comments/{id}/pin` | botão + badge laranja |

---

## 5. Reações & Interações

| Feature | Endpoint | UI |
|---|---|---|
| **6 reações PT** (saudade/comove/tasca/bombou/cafe/orgulho) | `POST /api/posts/{id}/react` | `PostReactions` |
| Emoji map por reação (🫶🥲😂🔥☕🇵🇹) | `REACTION_EMOJI` | — |
| **Gostar** (simple like) | `POST /api/posts/{id}/like` | botão coração |
| Toggle estado on/off | — | otimista |
| Contagem real-time | — | `enrich_post` |
| Reagir/des-reagir a mensagens DM | `POST /api/messages/{id}/react` | DM |
| Animation de feedback no clique | CSS | tap-shrink |

---

## 6. Mensagens Diretas (DMs)

| Feature | Endpoint | UI |
|---|---|---|
| Lista de conversas | `GET /api/conversations` | `/messages` |
| **Filtros**: Tudo / Não lidas / Fixadas / Arquivadas | `?filter=...` | tabs |
| Contagem de não lidas | `GET /api/messages/unread-count` | sidebar badge |
| Histórico de mensagens 1:1 | `GET /api/messages/{userId}` | `/messages/:userId` |
| Enviar mensagem (até 2000 chars) | `POST /api/messages` | composer |
| **Indicador "está a escrever"** (typing) | `POST /api/messages/{id}/typing` + `GET .../typing-status` | dots |
| **Apagar mensagem** | `DELETE /api/messages/{id}` | menu |
| **Reagir a mensagem** com emoji | `POST /api/messages/{id}/react` | emoji bar |
| **Fixar conversa** | `POST /api/conversations/{id}/pin` | menu |
| **Arquivar conversa** | `POST /api/conversations/{id}/archive` | menu |
| Conv key determinístico (sorted) | `conv_key()` | backend |

---

## 7. Notificações

| Feature | Endpoint | UI |
|---|---|---|
| Lista de notificações | `GET /api/notifications` | `/notifications` |
| Contagem não lidas (polling 8s) | `GET /api/notifications/unread-count` | sidebar badge |
| Tipos: `like`, `comment`, `follow`, `repost`, `quote`, `mention`, `collab_invite` | — | ícones |
| **Marcar todas como lidas** | `POST /api/notifications/read-all` | botão |
| **Apagar uma** | `DELETE /api/notifications/{id}` | swipe |
| **Limpar todas** | `DELETE /api/notifications` | confirma |
| **Marcar com estrela** (importante) | `POST /api/notifications/{id}/star` | toggle |
| **Snooze** | `POST /api/notifications/{id}/snooze` body `{minutes}` | dropdown |
| Auto-criação em like/comment/follow/repost/mention | `create_notification` | backend |

---

## 8. Perfis

| Feature | Endpoint | UI |
|---|---|---|
| Página de perfil | `GET /api/users/{username}` | `/u/:username` |
| Banner com gradiente **region-aware** (Tejo, Mar, Pinhal, Ouro Alentejo, ...) | `region` field | Profile |
| **6 tabs**: Posts · Replies · Likes · Media · Comunidades · Tags | — | tabs sticky |
| Posts por aba | `GET /api/users/{u}/posts?tab=...` | Profile |
| Stats (likes recebidos, posts, followers, reputação, nível) | `GET /api/users/{u}/stats` | `StatsCard` |
| **Activity Heatmap** (calendar grid de atividade) | `GET /api/users/{u}/heatmap` | `ActivityHeatmap` |
| **Identity Fingerprint** (top hashtag/mood/comunidade/hora) | `GET /api/users/{u}/fingerprint` | `FingerprintStrip` |
| **Badges narrativos PT** (Tasqueiro, Embaixador, Lenda, Veterano...) | `GET /api/users/{u}/badges` | `BadgeRow` |
| **Bio slots PT** (mood_today, soundtrack, reading, favourite_place, frase_mes, bairro) | `PATCH /api/users/me` | chips clicáveis |
| Bio chips clicáveis → `/explore` filtrado | — | Profile |
| Indicador **Online** (last_seen < 2 min) | — | dot verde |
| **Streak** (dias seguidos a publicar) | calculado | badge |
| **Followers / Following** modal | `GET /api/users/{u}/followers\|following` | `FollowsModal` |
| **Mutual friends** (com viewer) | `GET /api/users/{u}/mutual` | bar |
| **Follow / Unfollow** | `POST /api/users/{u}/follow` | botão |
| Privacidade: perfil privado bloqueia conteúdo | `private` | `can_view_profile` |
| Reputação calculada (likes/posts/seguidores) | `compute_reputation` | número + label |
| Regiões frequentes do utilizador | `GET /api/users/{u}/regions` | strip |
| Comunidades do utilizador | `GET /api/users/{u}/communities` | tab |
| **Verified badge** | `verified: true` | tick azul |
| Avatar + Banner uploadable | `PATCH /api/users/me` | Settings |
| Editar perfil (nome, bio, cidade, freguesia, mood inicial, team, regiões) | `PATCH /api/users/me` | Settings |

---

## 9. Comunidades

| Feature | Endpoint | UI |
|---|---|---|
| Listar comunidades | `GET /api/communities` | `/communities` |
| **10 categorias PT**: cidades 🇵🇹, música, desporto, tasca, cultura, tecnologia, fotografia, moda, viagens, outras | `COMMUNITY_CATEGORIES` | filtros |
| Criar comunidade | `POST /api/communities` | modal |
| Ver comunidade | `GET /api/communities/{slug}` | `/c/:slug` |
| Entrar / Sair | `POST /api/communities/{slug}/join` | botão |
| Posts da comunidade | `GET /api/communities/{slug}/posts` | feed |
| Composer dedicado (só membros) | — | community page |
| **Membros** + paginação | `GET /api/communities/{slug}/members` | tab |
| **Estatísticas** (membros ativos, posts, top contributors) | `GET /api/communities/{slug}/stats` | tab |
| **Membros ativos hoje** ("Vista da Tasca") | `GET /api/communities/{slug}/active` | `VistaDaTasca` |
| **Minhas comunidades** | `GET /api/communities/mine` | sidebar |
| Owner badge (crown) | — | UI |
| **Reações custom** por comunidade — **V2** | `PUT /api/communities/{slug}/reactions` | owner edita |
| **Hype Train** — **V2** | `POST /api/communities/{slug}/hype` | banner |

---

## 10. Eventos

| Feature | Endpoint | UI |
|---|---|---|
| Listar eventos | `GET /api/events?category=&when=upcoming\|past` | `/events` |
| **7 categorias PT**: festa, cultura, concerto, desporto, tasca, familia, outros | `EVENT_CATEGORIES` | filtros |
| Criar evento | `POST /api/events` | modal |
| Detalhe do evento | `GET /api/events/{id}` | route |
| **Marcar presença** | `POST /api/events/{id}/attend` | botão |
| Contagem de attendees | — | card |

---

## 11. Exploração & Descoberta

| Feature | Endpoint | UI |
|---|---|---|
| Explorar com **5 abas**: Posts / Pessoas / Tags / Comunidades / Cidades 🇵🇹 | — | `/explore` |
| Posts trending | `GET /api/posts/explore` | tab Posts |
| **Para ti com reason chips** — **V2** | `GET /api/posts/explore/with-reasons` | tab Posts |
| Filtro por mood | `GET /api/explore/by-mood` | chips |
| Filtro por cidade | `GET /api/explore/by-city` | chips |
| **Pessoas para seguir** (sugestões) | `GET /api/explore/people` | tab Pessoas |
| **Sugestões personalizadas** (baseadas em interesses) | `GET /api/users/suggestions` | sidebar |
| Lista de moods | `GET /api/explore/moods` | chip selector |
| **Novas vozes** (utilizadores recentes) | `GET /api/discover/new_voices` | `NewVoicesStrip` |
| Pesquisa por hashtag | `GET /api/posts/tag/{tag}` | `/tag/:tag` |
| Stats de hashtag (volume, autores únicos, top users) | `GET /api/tags/{tag}/stats` | TagPage |
| Página /tag/:tag | — | `TagPage` |

---

## 12. Tendências (Trending)

| Feature | Endpoint | UI |
|---|---|---|
| Página `/trending` | — | route |
| **4 ranges**: 1h, 24h, 7d, 30d | `?range=` | toggle |
| **4 abas**: Hashtags · Pessoas · Comunidades · Cidades | — | tabs |
| Hashtags trending com velocity % | `GET /api/trending?range=` | rank list |
| Pessoas trending | `GET /api/trending/pessoas` | cards |
| Comunidades trending | `GET /api/trending/comunidades` | cards |
| Cidades trending 🇵🇹 | `GET /api/trending/cidades` | rank |
| Velocity (Δ versus janela anterior) | `compute_velocity` | percentagem |
| `RightSidebar` mostra top 5 trending | `GET /api/trending?range=24h` | desktop sidebar |
| Pesquisa de hashtags no RightSidebar | client filter | input |

---

## 13. Identidade Portuguesa (DNA da app)

| Feature | Detalhes | UI |
|---|---|---|
| **8 moods PT** | saudade, tasca, festa, cafe, praia, fado, futebol, cultura | chips coloridos |
| **40+ cidades PT** | Lisboa, Porto, Coimbra, Braga, Aveiro, Faro, ... + Luanda (diáspora) | `PT_CITIES` |
| Detecção automática de mood por keywords | `detect_mood()` | backend |
| Detecção automática de cidade | `detect_cities()` | backend |
| **Regiões PT** com cores temáticas | Norte (verde-pinhal), Centro, Lisboa (azul-tejo), Alentejo (ouro), Algarve (azul-mar), Açores, Madeira | banner profile |
| **Equipas de futebol PT** | benfica, sporting, porto, braga, ... | bio chip |
| **Bairros & freguesias** | Alfama, Bairro Alto, Chiado, Ribeira, ... | bio slot |
| **Reações PT** | saudade/comove/tasca/bombou/cafe/orgulho | post reactions |
| **Badges narrativos** (12 PT) | Tasqueiro, Festeiro, Cafezinho, Saudosista, Embaixador, ... | Profile |
| Naming PT-PT em todo o lado | "Roda" (close friends), "Recado" (note), "Bairro" (sino), "Tasca" (private group) | UI |

---

## 14. Pesquisa Global

| Feature | Endpoint | UI |
|---|---|---|
| Pesquisa unificada (users + tags + posts) | `GET /api/search?q=` | topbar / mobile |
| Pesquisa só de utilizadores | `GET /api/users/search?q=` | composer/collab modal |

---

## 15. Guardados & Coleções

| Feature | Endpoint | UI |
|---|---|---|
| Bookmark de post | `POST /api/posts/{id}/bookmark` | botão |
| Listar guardados | `GET /api/posts/bookmarks` | `/bookmarks` |
| **Coleções de bookmarks** (CRUD) | `GET/POST/PATCH/DELETE /api/bookmark-collections` | tabs |
| Mover bookmark para coleção | `POST /api/posts/{id}/collection` | modal |
| Filtrar bookmarks por coleção | `?collection=` | UI |
| Remoção instantânea ao desfazer | — | otimista |

---

## 16. Rascunhos & Agendados

| Feature | Endpoint | UI |
|---|---|---|
| Listar rascunhos | `GET /api/posts/drafts` | `/drafts` |
| Listar agendados | `GET /api/posts/scheduled` | `/scheduled` |
| Publicar agora um rascunho | `POST /api/posts/{id}/publish` | botão |
| Auto-publish quando `scheduled_at` chegar | `auto_publish_due_posts` | startup task |

---

## 17. Stories

| Feature | Endpoint | UI |
|---|---|---|
| Criar story (imagem + texto) | `POST /api/stories` | StoriesBar |
| Listar stories (24h) | `GET /api/stories` | `StoriesBar` |
| Marcar como visto | `POST /api/stories/{id}/view` | auto |
| Apagar story | `DELETE /api/stories/{id}` | menu |

---

## 18. Diáspora

| Feature | Endpoint | UI |
|---|---|---|
| Página dedicada à diáspora portuguesa | — | `/diaspora` |
| **Heatmap mundial** (densidade de utilizadores por país) | `GET /api/diaspora/heatmap` | Diaspora |

---

## 19. Sino do Bairro & Calendário PT

| Feature | Endpoint | UI |
|---|---|---|
| **Calendário PT** (Sto António, S. João, Festa do Avante, Carnaval, Páscoa, ...) | `GET /api/calendar/pt` | `CalendarPTBanner` |
| **Evento PT do dia** | `_pt_today_event` | banner |
| **Daily digest** (resumo do dia para o utilizador) | `GET /api/daily/digest` | banner |
| **Sino do Bairro** (eventos por bairro/freguesia do user) | `GET /api/bairro/events` | `SinoBairroBanner` |
| **A Tarde** banner (post da tarde) | — | `ATardeBanner` |
| **Boa Noite** banner | flag `boa_noite_enabled` | banner |
| **Cafezinho** (lembrete) | flag `cafezinho_enabled` | banner |
| **Activity Ticker** (atividade global polling 8s) | `GET /api/activity?limit=30` | `ActivityTicker` |

---

## 20. Legal & RGPD

| Página | Rota |
|---|---|
| Centro Legal (índice) | `/legal` |
| Termos | `/legal/terms` |
| Privacidade | `/legal/privacy` |
| Cookies | `/legal/cookies` |
| Diretrizes da comunidade | `/legal/community` |
| Glossário | `/legal/glossary` |
| **Cookie Banner** (4 categorias: necessários, funcionais, analíticos, marketing) | `CookieBanner.js` |
| Persistência da escolha (`localStorage`) | `vermillion_cookie_consent_v1` |

---

## 21. Manifesto

- Página dedicada `/manifesto` com a visão do projeto (slow social, conversas que valem, PT-PT first)

---

## 22. Definições

| Tab | Conteúdo |
|---|---|
| **Conta** | Email, password change, avatar/banner upload, eliminar conta, exportar dados |
| **Identidade** | Nome, bio, cidade, freguesia, mood inicial, team, **6 bio slots PT**, regiões frequentes |
| **Notificações** | Toggles granulares (likes, comments, follows, mentions, ...) |
| **Privacidade** | Perfil privado, quem pode responder, **track_visits opt-out** |
| **Aparência** | Tema (Claro/Sépia/Sistema), Densidade (Compacta/Confortável), Idioma (PT-PT/PT-BR/EN), Reduzir animações, **Cosméticos** (V2) |
| **Legal** | Atalhos para Termos/Privacidade/Cookies/Comunidade/Glossário, gestão de cookies, manifesto |

---

## 23. UI/UX & Estados Visuais

| Mecânica | Implementação |
|---|---|
| **Loading spinners** em botões de ação | `Spinner.js` |
| **Click-outside** global para modais/dropdowns | `useClickOutside` hook |
| **ESC key** fecha modais | mesmo hook |
| **Empty states** premium com ícone + título + CTA por contexto | em cada página |
| **Skeleton loaders** (Posts, Profile, ...) | `Skeleton.js` |
| **Toast notifications** (Sonner) | `sonner` lib |
| **Pull-to-refresh** com taglines aleatórias PT | `usePullToRefresh` |
| **Tap-shrink** (animação ao clicar) | classe CSS |
| **Glass / backdrop-blur** em barras sticky | classe `glass` |
| **Hairline borders** (separadores discretos) | `hairline-t/b` |
| **Coral gradient bar** (indicador de tab ativo) | `grad-bar` |
| **Silver foil** (efeito metálico) | `silver-foil` |
| Region-aware gradient banners | inline CSS |
| Keyboard shortcuts help (modal) | `KeyboardShortcutsHelp` |
| Scroll-to-top automático ao navegar | `ScrollToTop` |
| Layout responsive (sidebar desktop / bottom nav mobile) | `Layout.js` |
| RichText com auto-link, menções, hashtags | `RichText.js` |
| Image carousel com dots | `ImageCarousel` |
| Image lightbox fullscreen | `ImageLightbox` |
| Onboarding modal (primeiro login) | `OnboardingModal` |
| Verified badge (tick) | `VerifiedBadge` |
| Stats cards animados | `StatsCard` |

---

## 24. Mobile

| Componente | Função |
|---|---|
| `MobileTopBar` | Barra superior com logo, pesquisa, menu |
| `MobileBottomNav` | Nav inferior fixa (Início, Explorar, Composer, Notifs, Perfil) |
| `MobileFAB` | Floating Action Button para compose |
| `MobileMenuDrawer` | Drawer lateral com todas as rotas |
| `MobileDiscoverStrip` | Strip horizontal de descoberta |
| `PageHeader` com botão back nativo | header sticky |
| Touch optimizations (tap-shrink, scroll-snap) | CSS |
| Viewport meta + safe-area-inset | `index.html` |

---

## 25. V2 — Pacote Moderno (13 features novas)

> Lote "big bang" implementado a 14 Fev 2026, baseado em pesquisa profunda de TikTok, Threads, Discord, BeReal e Bluesky. EXCLUI: AI, voz, fado, MB Way, marketplace, creator tools, bairros, eurovisão, café roulette, dicionário de calão.

### 25.1 — Recados 24h ("Notes" Instagram-style)

| Feature | Detalhe |
|---|---|
| Texto curto até **60 caracteres** | — |
| Auto-expira em **24h** | `expires_at` |
| **1 recado ativo** por user (criar 2º substitui o anterior) | server cleanup |
| Visível no **NotesBar** (topo do Feed) | quem segues + tu |
| Mood opcional | — |
| Apagar manual | — |

**Endpoints:** `POST /api/notes` · `GET /api/notes/feed` · `DELETE /api/notes/{id}`
**UI:** `NotesBar.js`

### 25.2 — Presença (Status)

| Feature | Detalhe |
|---|---|
| **4 estados**: Online · Ausente · Ocupado (não perturbar) · Invisível | `PRESENCE_STATES` |
| **Emoji custom** (10 quick picks: ☕🌊📚💻🎧🌙🥐⚽🎙️✈️) | — |
| **Texto** até 40 chars ("Na praia", "A trabalhar...") | — |
| **Expiração**: 30 min · 2h · 8h · 1 dia · sem expirar | `until` |
| Visível em todos os Avatar do user | bolinha de cor + emoji |

**Endpoints:** `POST /api/users/me/presence` · `GET /api/users/{username}/presence`
**UI:** `PresencePicker.js` (no Sidebar)

### 25.3 — Reações Custom por Comunidade

| Feature | Detalhe |
|---|---|
| Owner define até **8 reações** custom para a sua comunidade | `{key, emoji, label}` |
| GET público disponível para qualquer um | — |

**Endpoints:** `PUT /api/communities/{slug}/reactions` · `GET /api/communities/{slug}/reactions`

### 25.4 — Comentários Destacados (Pinned)

| Feature | Detalhe |
|---|---|
| Apenas o **autor do post** pode destacar (não o autor do comentário) | — |
| **1 destaque por post** (toggle automático) | server enforce |
| Badge laranja "destaque" + flutuação para o topo | — |

**Endpoint:** `POST /api/comments/{id}/pin`
**UI:** botão na ação de cada comentário + `buildTree()` ordena pinned no topo

### 25.5 — Séries / Coleções de Posts

| Feature | Detalhe |
|---|---|
| Utilizador agrupa posts em **série temática** com título + descrição + emoji cover | — |
| Adicionar/remover posts da série | — |
| Página dedicada `/series/:id` | route |
| Secção "Séries" no Profile (2-col grid) | — |

**Endpoints:** `POST /api/series` · `GET /api/series/{id}` · `GET /api/users/{u}/series` · `GET /api/series/{id}/posts` · `POST /api/series/{id}/posts` · `DELETE /api/series/{id}`
**UI:** `SeriesSection.js` · `SeriesPage.js`

### 25.6 — Visitas ao Perfil

| Feature | Detalhe |
|---|---|
| **Auto-tracking** quando alguém visita `/u/:username` | upsert no `profile_views` |
| Dedup por dia (1 visita por viewer→target por dia) | `day` key |
| **Janela de 30 dias** | cutoff |
| **Opt-out** disponível | `track_visits: false` |
| Página `/visitors` (só tu vês) | — |

**Endpoints:** `GET /api/users/me/visitors` · `POST /api/users/me/visitors/settings`
**UI:** `Visitors.js`

### 25.7 — Charms (Pins de Perfil)

| Feature | Detalhe |
|---|---|
| **12 charms colecionáveis** | Fundador, Madrugador, Noctívago, Conversador, Anfitrião, Explorador, Saudosista, Festeiro, Poeta, Viajante, Pastelinho, Bola Campeã |
| Unlock **automático** com base em heurísticas (horários, moods, cidades, comentários, comunidades, reações) | `_compute_unlocked_charms` |
| Equipa **até 3** no perfil | — |

**Endpoints:** `GET /api/charms/catalog` · `GET /api/users/{u}/charms` · `POST /api/users/me/charms/equip`
**UI:** `CharmsPanel.js` no Profile

### 25.8 — Roda (Inner Circle PT)

| Feature | Detalhe |
|---|---|
| Naming PT-PT: **"Roda"** (em vez de Close Friends) | — |
| **Máx 25 membros** | server enforce |
| Toggle add/remove no perfil de outro utilizador | botão Roda |
| Reason chip "Da tua Roda" no Feed (V2.13) | — |

**Endpoints:** `GET /api/users/me/roda` · `POST /api/users/me/roda/{user_id}` · `GET /api/users/{u}/in-roda`
**UI:** `RodaButton.js`

### 25.9 — Starter Packs

| Feature | Detalhe |
|---|---|
| Listas curadas de utilizadores (estilo Bluesky) | — |
| Título, descrição, emoji cover, **até 20 users** | — |
| Discover page `/starter-packs` (ordenado por likes + follows) | — |
| **Like** (toggle) | — |
| **"Seguir todos"** (1 click follow em massa) | atómico |
| Single pack page `/starter-packs/:packId` | — |
| Apagar próprio pack | — |

**Endpoints:** `POST /api/starter-packs` · `GET /api/starter-packs/discover` · `GET /api/starter-packs/{id}` · `GET /api/users/{u}/starter-packs` · `POST /api/starter-packs/{id}/like` · `POST /api/starter-packs/{id}/follow-all` · `DELETE /api/starter-packs/{id}`
**UI:** `StarterPacks.js` (route)

### 25.10 — Hype Train (Twitch-style)

| Feature | Detalhe |
|---|---|
| Banner na página da Comunidade | gradient laranja-rosa animado |
| Iniciado pela 1ª pessoa que clica "Iniciar" | — |
| **Target: 25 participantes em 30 min** | `HYPE_TARGET=25` · `HYPE_DURATION_MIN=30` |
| Barra de progresso real-time (polling 15s) | — |
| Contagem decrescente de tempo restante | — |

**Endpoints:** `POST /api/communities/{slug}/hype` · `GET /api/communities/{slug}/hype/active`
**UI:** `HypeTrainBanner.js`

### 25.11 — Collab Posts (Co-autoria)

| Feature | Detalhe |
|---|---|
| Autor convida **até 3 colaboradores** | server enforce |
| Convite gera notificação para o convidado | `collab_invite` type |
| Aceitar / Recusar | — |
| Colaboradores aparecem no header do PostCard | "com @user1 @user2" |

**Endpoints:** `POST /api/posts/{id}/collab/invite` · `POST /api/posts/{id}/collab/accept` · `POST /api/posts/{id}/collab/decline` · `GET /api/posts/{id}/collab`
**UI:** `CollabModal.js` (disparado no PostMenu)

### 25.12 — Cosméticos de Avatar (Tier Grátis)

| Feature | Detalhe |
|---|---|
| **7 frames**: Clássico, Coral, Azulejo, Ouro Alentejo, Pinhal, Tejo, Pixel | ring tailwind |
| **7 stickers**: Pastel 🥐, Bola ⚽, Galo 🐓, Sardinha 🐟, Coração ❤️, Estrela ⭐, Café ☕ | overlay |
| Validação cruzada de tipo (frame ≠ sticker) | server |
| Equipados aparecem em **todos os Avatar** | `Avatar.js` |
| Preview ao vivo no Settings > Aparência | — |

**Endpoints:** `GET /api/cosmetics/catalog` · `POST /api/users/me/cosmetics/equip` · `GET /api/users/{u}/cosmetics`
**UI:** `CosmeticsPicker.js` no Settings

### 25.13 — For You "Reason Chips"

| Feature | Detalhe |
|---|---|
| Chip "porque vês isto" abaixo do header do PostCard | `ReasonChip` |
| **6 tipos de razão**: roda 🫂 · community 🏘️ · city 📍 · tag 🏷️ · trending 🔥 · mood ✨ | — |
| Calculado server-side por post (sem AI) | `compute_reason_for_post` |
| Usado no `/explore` (Para ti) | — |

**Endpoint:** `GET /api/posts/explore/with-reasons`
**UI:** `ReasonChip.js`

---

## Catálogos Estáticos (Backend Constants)

| Constante | Valor |
|---|---|
| `ALLOWED_REACTIONS` | `{saudade, comove, tasca, bombou, cafe, orgulho}` |
| `REACTION_EMOJI` | `{🫶, 🥲, 😂, 🔥, ☕, 🇵🇹}` |
| `MAX_IMAGES_PER_POST` | `4` |
| `MAX_POLL_OPTIONS` | `4` |
| `VALID_AUDIENCES` | `{everyone, following, mentioned}` |
| `PT_CITIES` | 40+ cidades PT + Luanda |
| `MOODS` | 8 (saudade, tasca, festa, cafe, praia, fado, futebol, cultura) |
| `COMMUNITY_CATEGORIES` | 10 (cidades, musica, desporto, tasca, cultura, tecnologia, fotografia, moda, viagens, outras) |
| `EVENT_CATEGORIES` | 7 (festa, cultura, concerto, desporto, tasca, familia, outros) |
| `PT_BADGES_DEFS` | 12 narrativos PT |
| `CHARMS_CATALOG` | 12 colecionáveis V2 |
| `COSMETICS_CATALOG` | 14 (7 frames + 7 stickers) |
| `PRESENCE_STATES` | `{online, ausente, ocupado, invisivel}` |
| `HYPE_TARGET` | `25` participantes |
| `HYPE_DURATION_MIN` | `30` minutos |
| `ONLINE_WINDOW` | `2 minutos` |

---

## Coleções MongoDB

```
users · posts · comments · notifications · conversations · messages
communities · events · stories · bookmark_collections
notes · profile_views · series · starter_packs · hype_trains
```

---

## Estrutura de Ficheiros

```
/app
├── backend/
│   ├── server.py            # Monolito FastAPI (~4100 linhas) — refactor pendente
│   ├── .env                 # MONGO_URL, DB_NAME, JWT_SECRET, ADMIN_PASSWORD
│   ├── requirements.txt
│   └── tests/
│       ├── test_vermillion.py
│       ├── test_portuguese_features.py
│       ├── test_new_features.py
│       └── test_bigbang_features.py    # V2 (35 testes)
│
├── frontend/
│   ├── src/
│   │   ├── App.js              # Routes
│   │   ├── context/AuthContext.js
│   │   ├── pages/              # 23 páginas (incluindo legal/)
│   │   ├── components/         # 50+ componentes
│   │   ├── hooks/              # useClickOutside, usePullToRefresh, useLiveTime
│   │   ├── lib/                # api.js, time.js, portuguese.js, ptCulture.js
│   │   └── App.css
│   ├── .env                    # REACT_APP_BACKEND_URL
│   └── package.json
│
├── memory/
│   ├── PRD.md
│   └── test_credentials.md
│
├── docs/
│   └── FEATURES.md             # ← este documento
│
└── test_reports/               # Relatórios JSON do testing agent
```

---

## Quick Reference — Test Credentials

Ver `/app/memory/test_credentials.md`.

| Conta | Email | Password |
|---|---|---|
| **Admin** | `admin@vermillion.app` | `admin123` |
| Demo | `bealx@vermillion.demo` | `demo123` |
| Demo | `tiagocit@vermillion.demo` | `demo123` |
| Demo | `mariestudio@vermillion.demo` | `demo123` |
| Demo | `joaobairro@vermillion.demo` | `demo123` |
| Demo | `inesfado@vermillion.demo` | `demo123` |
| Demo | `ruisurf@vermillion.demo` | `demo123` |
| Demo | `catpastel@vermillion.demo` | `demo123` |

---

## Roadmap / Backlog

**P1**
- Refactor `server.py` (~4100 linhas) → `auth.py`, `posts.py`, `users.py`, `communities.py`, `events.py`, `notes.py`, `social_v2.py`
- Tracking de consentimento RGPD no `POST /api/auth/register` (`terms_accepted_at`, `privacy_accepted_at`, `age_confirmed`)
- Frontend-only polish: Photo Mode auto-advance, Haptics (vibrate API), Bottom Sheets (`vaul`), Seasonal app icons, Trending PT Map (SVG)

**P2**
- Real-time DMs via WebSocket
- Vermillion+ (Stripe) — premium tier
- Imagens externas para badges/categorias (vision agent)
- Real entity data nos placeholders legais (`[NIPC]`, `[DPO]`, `[Morada]`)

---

*Documento gerado a partir do inventário completo do código em `/app/backend/server.py` e `/app/frontend/src/`. Para detalhes de implementação consulte os ficheiros referenciados.*
