# Lusorae — PRD (rede social portuguesa)

## Original problem statement
Rede social portuguesa focada em conversas reais, presença local (cidades), comunidades e identidade lusófona. Sem doomscroll, sem manipulação de atenção.

## Personas
- **Cidadão local** que quer ligar-se à comunidade da sua cidade
- **Diáspora** PT que quer manter ligação cultural e local
- **Criador independente** que rejeita métricas vazias

## Arquitetura
- React (CRA, Tailwind, shadcn/ui) + lazy routes
- FastAPI + MongoDB (motor)
- WebSocket para atualizações em tempo real
- Lazy hero images, code-splitting por rota

## Rotas públicas
- `/` — **Landing** (nova; antes /landing)
- `/login`, `/register`, `/forgot`
- `/manifesto`, `/legal/*`

## Rotas protegidas (ProtectedRoute → Layout)
- `/feed` (antes era `/`), `/explore`, `/trending`, `/notifications`, `/messages`, `/bookmarks`, `/drafts`, `/scheduled`, `/communities`, `/mesas`, `/topologia`, `/c/:slug`, `/u/:username`, `/post/:postId`, `/tag/:tag`, `/settings`, `/premium`, `/visitors`, `/series/:seriesId`, `/stories/archive`
- `/admin` (AdminLayout)

## Landing — secções (top → bottom)
1. **TopNav** (desktop nav completo / mobile só logo + Entrar)
2. **Hero** — `Vive. Partilha. Lusorae.` + CTAs + avatares + live counter (online ou membros total) + foto colada com stamp "100% HUMANO" + quote "pessoas, não perfis"
3. **Trust badges** — Feito em Portugal · Privacidade primeiro · Conversas reais
4. **StatsBand** — `membros · total / conversas · 1h / posts · hoje / cidades · ativas` (endpoint `/api/stats/landing`)
5. **WhatYouFind** — 5 categorias (Conversas, Pessoas, Eventos, Cidades, Comunidades)
6. **ExploreCities** — mosaico 3 fotos (Porto/Lisboa/Algarve)
7. **HowItWorks** — 4 passos em cartões coloridos
8. **PortugalMap** — SVG simplificado + cidades + quote `Bairro a bairro. Mesa a mesa. Conversa a conversa.`
9. **FeitoParaPessoas** — secção preta com 6 princípios
10. **FAQ** — accordion
11. **FinalCta** — CTA vermelho com criar conta grátis
12. **SiteFooter**

## Endpoints novos
- `GET /api/stats/landing` — público, devolve `online_now`, `total_users`, `active_conversations`, `posts_today`, `cities_active`, `communities_total`, `avatars[]`

## Changelog
- **2026-02-XX** — Página `/` agora é Landing pública; Feed move-se para `/feed`. Brand links em LeftSidebar/MobileTopBar/MobileBottomNav apontam para `/feed`. Login/Register redirecionam para `/feed`. Landing redireciona logged-in para `/feed`. UI auth: Lusorae só no header form + SiteFooter; foto única (TapedPhoto); painel marca escondido em mobile; vocabulário social (POST · DESTACADO, COMUNIDADE · PORTUGAL); textShadow/border duplos em títulos. Landing: header desktop com indicador LIVE + EST. 2026, profundidade visual (border 3-4px + dual boxShadow + WebkitTextStroke).
- **2026-02-XX** — Removidas duplicações na Landing: stamp `FEITO EM PT` → `100% HUMANO`; stats "pessoas · online" → "membros · total"; quote map "A tua cidade. A tua comunidade. A tua voz." → "Bairro a bairro. Mesa a mesa. Conversa a conversa."; principles "Conversas locais e reais" → "Foco no local"; "Identidade portuguesa" → "Apagar conta num clique".

## Prioritized backlog
### P0 — Em curso
- (concluído) Landing + new home
### P1 — Próximas rotas
- `/mesa` (feed exclusivo — backend já existe)
- `/charms` (galeria pública)
- `/search` (pesquisa dedicada)
### P2 — Profundidade
- Polls v2 (sentiment + scale + ranking)
- Realtime DM delivery states
- RGPD consent tracking no registo
- Refactor `server.py` (~16.7k linhas) em módulos
### P3 — Backlog longo
- Lusorae+ (Stripe)
- Sub-comunidades (Mesas dentro de comunidades)
- Cosmetics drops sazonais
- Public Identity Card SVG/PNG

## Endpoints / Coleções
Ver `/app/docs/FEATURES.md` para inventário exaustivo (130+ endpoints).
