# Vermillion — Rede Social Portuguesa (PT-PT)

## Original problem statement
"Atribui mais lógica, fórmulas, botões e estrutura a todas as rotas e abas. Quero todas as rotas repletas de mecânicas novas, botões novos. Lembra te que é uma rede social portuguesa ("Vermillion"). Não fujas do tema."

Idioma: **PT-PT obrigatório**. Tema: Portugal (Saudade, Tasca, Festa, Fado, Café, Praia, Bola, Cultura, regiões PT).

## Stack
- Frontend: React + Tailwind + Shadcn UI (lucide-react)
- Backend: FastAPI (monolítico em `/app/backend/server.py`, 2752 linhas)
- DB: MongoDB
- Auth: JWT em cookie httpOnly + interceptor Axios `withCredentials: true`

## Conta admin
- `admin@vermillion.app` / `admin123`
- Demo PT: ver `/app/memory/test_credentials.md`

## Routes / Páginas (14)
| Rota | Página | Mecânicas PT atuais |
|---|---|---|
| `/` | Feed | Tabs Seguindo/Para ti · Mood chips (Saudade/Tasca/Festa/Café/Praia/Fado/Bola/Cultura) · Sort Recente/Top · Refresh · Pull-to-refresh · localStorage persist |
| `/explore` | Explore | 5 abas: Posts/Pessoas/Tags/Comunidades/Cidades 🇵🇹 · Mood chips · Pesquisa |
| `/trending` | Trending | Range 1h/24h/7D/30 dias · 4 abas (Hashtags/Pessoas/Comunidades/Cidades) · velocity% |
| `/notifications` | Notifications | Lista + marcar todas como lidas |
| `/messages` | Messages | Filtros Tudo/Não lidas/Fixadas/Arquivadas |
| `/bookmarks` | Bookmarks | Coleções |
| `/drafts` | Drafts | CRUD rascunhos |
| `/scheduled` | Scheduled | Posts agendados |
| `/communities` | Communities | Categorias PT (Cidades 🇵🇹, Música, Desporto, Tasca, Cultura, Tecnologia, Fotografia, Moda, Viagens, Outras) |
| `/c/:slug` | Community | Feed da comunidade |
| `/events` | Events | Categorias (Festa/Cultura/Concerto/Desporto/Tasca/Família/Outros) |
| `/u/:username` | Profile | Badges PT (NÍVEL/REP/ONLINE/streak), regiões |
| `/tag/:tag` | TagPage | Posts por hashtag |
| `/settings` | Settings | 4 abas: Conta, Notificações, Privacidade, Aparência |

## Endpoints chave
- `GET /api/auth/me` → **200 `{user: null | obj}`** (corrigido — já não devolve 401 anónimo)
- `POST /api/auth/login|register|logout`
- `GET /api/trending?range=1h|24h|7d|30d`
- `GET /api/explore/by-mood?mood=saudade|tasca|...`
- `GET /api/users/{u}/badges`
- `GET /api/notifications/unread-count`
- `GET /api/messages/unread-count`

## Changelog
- **2026-02-14** — **Profile SSS-tier (P0)** — reescrita completa de `Profile.js`:
  - **Region-aware banner** — gradiente do banner adapta-se à região (Lisboa = azul-tejo, Algarve = azul-mar, Alentejo = ouro, Norte = verde-pinhal, etc.) com nameplate editorial.
  - **Identity Fingerprint Strip** (novo, signature da página) — endpoint `GET /users/{username}/fingerprint` agrega dos posts: top hashtag, top mood, top reaction dada/recebida, comunidade preferida, hora-pico de publicação. Renderiza 3-6 cards "Como {Nome} aparece aqui · Análise de N posts" com eyebrow + headline + detalhe.
  - **Identity pills row** — Level/REP · Online · Streak · Região (com emoji) · Mood · Time (não-default).
  - **Bio slots** como chips semânticos com ícones — `Mood do dia: saudade · Banda sonora: José Afonso · A ler: Saramago · Lugar favorito: Miradouro da Graça · Frase do mês · Bairro/Freguesia`.
  - **6 tabs** (era 5): adicionado **"Comunidades"** com endpoint novo `GET /users/{username}/communities` (badge "moderador" para owners).
  - **Tabs sticky** com `backdrop-blur` + indicador coral grad-bar (era preto liso).
  - **Empty states premium** — ícone + título + sub específicos por tab (não genérico).
  - **Tudo mobile-first** validado em 390×844: identity pills wrap, fingerprint 2-col, banner com region-emoji.
  - **2 novos endpoints backend** + ~600 linhas frontend.
- **2026-02-14** — Fix definitivo "Não autenticado" (5 camadas).
- **2026-02-14** — Messages overhaul.
- **2026-02-14** — PT Engagement v1 + v2 (18 features) + Mobile parity.
- **2026-02-14** — **PT Engagement v1**: F2.1 Onboarding 60s, F2.4 Anel de identidade, F3.1 Reactions PT, F1.1 A Tarde, F1.4 Boa Noite, F2.2 Badges narrativos, F2.3 Bio slots, F4.2 Repost curado, F5.1 Place graph, F5.2 Sino do Bairro, F5.3 Calendário PT, F1.2 Cafezinho, MAN Manifesto, RGPD consent persistence.

## Roadmap (Backlog)
**P1**
- **Backend: tracking de consentimento no registo** — Atualizar `POST /api/auth/register` para receber e gravar `terms_accepted_at`, `privacy_accepted_at`, `age_confirmed` no documento de utilizador (compliance RGPD).
- Ampliar mecânicas em rotas mais leves (Drafts, Scheduled, TagPage, Settings — ex.: filtros por mood/cidade, atalhos de teclado, ações em massa).
- Profile: estatísticas por região/mood, mural de badges PT.

**P2**
- Substituir placeholders legais (`[NIPC]`, `[Morada]`, `[DPO]`, `[Cidade]`, `[data da última versão]`) por dados reais da entidade antes de produção.
- Imagens externas para badges/categorias (via `vision_expert_agent`).
- Refactor de `server.py` (2752 linhas) em módulos: `auth.py`, `posts.py`, `users.py`, `communities.py`, `events.py`, `trending.py`.
- Stripe/PayPal para "tasca premium" (subscrições opcionais).
- Real-time DMs via WebSocket.

## Testes
- `/app/backend/tests/test_vermillion.py` + `test_portuguese_features.py` + `test_new_features.py` (50/50 PASS)
- `/app/test_reports/iteration_1.json` (último relatório — 100%)
