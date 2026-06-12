# Lusorae — Product Requirements

## Original Problem Statement
- Restaurar/preview da app
- Remover RGPD/algoritmos/leis das páginas auth
- Resolver "Network error" no login/registo
- **Massive design overhaul** (Feb 2026): SSS tier / editorial premium em todas as páginas internas, removendo vestígios fanzine (stickers rodados, sombras 3D offset, ribbons)

## User Language
- Portuguese (PT-PT)

## Architecture
- Frontend: React + Tailwind (Yarn, craco)
- Backend: FastAPI + slowapi + Motor
- DB: MongoDB
- Identidade visual: **Lusorae Editorial Premium** (Editorial Magazine ink/cream com underline vermelho ondulado, kicker mono, H1 massive `font-black tracking-[-0.045em]`)

## Design System (Editorial Premium)
Primitivas partilhadas:
- `/components/PageShell.js` → `PageShell` + `PageHero` (top ink strip + H1 massive + kicker) + `Empty`
- `/components/editorial/Masthead.jsx` → `EditorialMasthead`, `EditorialSectionHead`, `WavyUnderline`, `SoftHighlight`
- `/components/editorial/Button.jsx` → `EditorialButton` (variants: primary/gold/secondary/ghost-dark/danger; sizes: sm/md/lg) + `EditorialTag`
- `/components/editorial/Primitives.js` → `Kicker`, `Sticker` (legacy, sem rotação/sombras)

Regras:
- Todos os pills usam `borderRadius: 999`, `letterSpacing: 0.14em`, `font-black uppercase`, hover `translateY(-1px)`
- Kickers mono `font-bold` `letterSpacing: 0.22em` com dot pulse opcional
- H1 massive: `font-black tracking-[-0.045em] leading-[0.94]` com período colorido (vermelho/dourado/azul) como assinatura
- Top ink strip: `background: PT.ink, color: #FBFAF6` com kicker dourado à esquerda + meta (Lisboa hora · Edição) à direita
- Empty states: círculo branco com sombra difusa + kicker "Nada por aqui" + H1 massive + CTA pill ink

## Implemented (Feb 2026)
### Phase 1 — Feed/Início ✅
- Header desktop ink strip + H1 com sublinhado vermelho ondulado no nome
- LeftSidebar pills editorial
- RightSidebar widgets clean
- StoriesBar com contador `X autores` apenas (removidos kickers ruidosos)
- MobileHomeHero alinhado com desktop (kicker removido, só H1 + WavyUnderline)

### Phase 2 — Explore ✅
- Top ink strip `LUSORAE · EXPLORAR · DESCOBRIR | LISBOA · hora | EDIÇÃO · data`
- H1 "Descobre **Portugal**." com underline vermelho
- Tabs editorial (Posts/Pessoas/Tags/Comunidades/Cidades)
- Cards "Quem seguir" premium

### Phase 3 — Mensagens (DMs) ✅
- H1 "Mensagens." com ponto vermelho
- ChatView: typography editorial, send button pill ink (sem gradient aquarela)
- Empty state editorial

### Phase 4 — Premium (Plus & Aura) ✅
- H1 "Plus & **Aura**." (Aura dourado)
- TierCards: ribbon top accent, sem fanzine offset
- **TABELA ÚNICA** consolidando 7 categorias (Identidade · Presença · Stories · Feed · Coleções · Memória · Base) — em vez de cards separados
- Princípios · Transparência · FAQ · CTA final ink

### Phase 5 — Pages P1 ✅
- **Perfil** (`Profile.js`): masthead editorial + EditorialTag para região + private locked card editorial
- **Guardados** (`Bookmarks.js`): masthead + filtros pill + coleções inline + modal nova coleção
- **Rascunhos** (`Drafts.js`): masthead + tools row + cards editoriais
- **Agendados** (`Scheduled.js`): masthead com accent azul + cards
- **Comunidades** (`Communities.js`): masthead azul + cards com ícone ink + Seguir pill
- **Mesas** (`Mesas.js`): masthead telha + cards de mesas + abrir mesa CTA
- **Topologia** (`Topologia.js`): masthead brasa + mapa esquemático + cidades a crescer
- **Arquivo de stories** (`StoryArchive.js`): masthead brasa + grids `Activos (24h)` + `Expirados`
- **Definições** (`Settings.js`): masthead com tabs mobile pills ink + sidebar groups
- **Centro Legal** (`/legal/*`): LegalShell já editorial premium · cards Visão/Termos/Privacidade/Cookies/Diretrizes

### Refactor partilhado
- `PageHero` global em `PageShell.js` agora gera o masthead editorial (sticky desktop + compact mobile)
- `Empty` editorial (círculo branco, sem caixas amarelas/cinza)
- Botões "premium e iguais" através de toda a app (pill ink/gold/white com hover translateY)
- Labels redundantes removidos: `Stories · ao vivo`, `Conversas · Privadas`, `Edição · SEXTA, 12/06`

## Admin
- Email: admin@lusorae.pt
- Password: Admin12345!

## Roadmap (P2 — futuro)
- Testes E2E para todas as páginas
- Refactor `/theme/fanzinePalette.js` → consolidar em `editorial.js`
- Migrar restantes pages (Calendario, Notifications, Tags, Hashtag, Series, etc.) para `PageHero`
- Limpeza de classes Tailwind legacy (`btn-obsidian`, `chip-on`, `card-lux`, `font-heading`, `silver-grad`) — todas têm equivalente inline editorial
