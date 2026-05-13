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
- **2026-02-14** — **PT Engagement & Retention v1 (P0 massivo)**: implementação concreta da STRATEGY.md (15 features):
  - **F2.1 Onboarding 60s** — `Register.js` reescrito em 3 passos (credenciais → identidade PT → consentimento). Chips coral para região (8), mood (8), time (5).
  - **F2.4 Anel de identidade** — Composer com selector `publico/amigos/tasca`; PostCard mostra badge colorida (azul-tejo / terracota); `audience_ring` em PostIn + enrich_post.
  - **F3.1 Reactions PT** — substituídos `❤️🔥👏😂💯😢` por `saudade · comove · tasca · bombou · cafe · orgulho` com semântica cultural; `ALLOWED_REACTIONS` + `REACTION_EMOJI`.
  - **F1.1 A Tarde** — `GET /api/daily/digest` com scoring por reactions + place affinity; banner no Feed (18-22h window).
  - **F1.4 Modo Boa Noite** — toggle Settings, default ON; persistido no User.
  - **F1.2 Cafezinho** — toggle Settings (utility `isCafezinhoHour`).
  - **F2.2 Badges narrativos** — `GET /api/badges/narrative` com Café das 7h32, Tasca-mestre, Saudade verificada, Maré viva, Voz da região.
  - **F2.3 Bio slots** — 6 campos semânticos (mood_today, soundtrack, reading, favourite_place, quote_of_month, city_extra) em Settings/Identidade.
  - **F4.2 Repost curado** — backend rejeita quote com < 5 chars (HTTP 400).
  - **F5.1 Place graph** — `city/freguesia/region` no User + public_user; influencia scoring do digest.
  - **F5.2 Sino do Bairro** — `GET /api/bairro/events`; banner rate-limited 1×/semana via localStorage ISO-week.
  - **F5.3 Calendário PT** — backend `GET /api/calendar/pt` (15 eventos: Santo António, S. João, Dia de Portugal, Carnaval, IRS, exames, regresso às aulas, Natal, etc); banner dismissible.
  - **MAN Manifesto** — nova rota pública `/manifesto` com 6 promessas anti-dark-pattern; linkada do `/legal` e Settings.
  - **RGPD consent persistence** — registo agora grava `consent.terms_accepted_at`, `consent.age_confirmed`, `consent.marketing_opt_in`, `consent.privacy_version` no User.
  - **Backend**: lint clean, 5 novos endpoints, RegisterIn/UpdateProfileIn/PostIn expandidos; modelo User com 12 campos novos.
- **2026-02-14** — Legal Hub redesign editorial (anterior).
- **2026-02-13** — Phase 2 Portuguese backend + 14 frontend pages.

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
