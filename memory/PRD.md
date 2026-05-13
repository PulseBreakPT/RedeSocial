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
- **2026-02-14** — **Messages overhaul (P0 bug fix + UX upgrade)**:
  - **Bug crítico corrigido**: `ChatView` fazia `setMe(r.data)` quando `/auth/me` retorna `{user: ...}` (após o fix do 401 loop anterior). Resultado: `me.id` era undefined, todas as mensagens renderizavam à esquerda, indistinguíveis. Substituído por `useAuth().user`.
  - **Optimistic send** — mensagem aparece imediatamente com estado `_pending`; substitui por dados reais ao receber resposta; marca `_failed` em erro.
  - **Status indicator** — última mensagem própria mostra `a enviar…` / `enviado` (✓) / `visto` (CheckCheck coral) / `por enviar — toca para tentar`.
  - **Day separators** — agrupa mensagens por dia (`Hoje`/`Ontem`/data localizada PT-PT).
  - **New Conversation Modal** — botão `+` (gradiente coral) abre modal com `users/search` debounced, permite iniciar conversa sem se seguirem.
  - **F3.2 Café receipt** — toggle opt-in por conversa (localStorage), ícone Coffee no header; respeita o manifesto (sem read receipts forçados).
  - **Smart polling** — pausa quando `document.hidden`; throttle do typing ping para 1×/2s.
  - **Auto-grow textarea** — composer expande até 5 linhas, Enter envia, Shift+Enter quebra linha.
  - **Empty states melhorados** — quando sem conversas: CTA "Nova conversa"; quando chat vazio: avatar + bio + cidade do interlocutor com pin de localização.
  - **Header clicável** — avatar/nome no header da conversa leva ao perfil.
  - **Botão de enviar** — gradiente coral consistente com o design system.
- **2026-02-14** — PT Engagement v2 + Mobile parity (F4.1 New Voices, F3.3 Vista da Tasca, F5.4 Diaspora Heatmap).
- **2026-02-14** — PT Engagement v1 (15 features).
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
