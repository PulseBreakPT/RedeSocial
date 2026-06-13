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
