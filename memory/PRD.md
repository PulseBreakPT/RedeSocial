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

### Phase 6 — Centro Legal alinhado com Landing (Feb 12, 2026) ✅
Refatoração das 5 páginas legais (Visão · Termos · Privacidade · Cookies · Diretrizes) para coerência total com o design da landing page:
- **Eliminado** `/theme/fanzinePalette.js` (110 linhas, único ficheiro órfão sem referências externas)
- **Adicionada** rota `/legal/vision` ao `App.js` (antes só existia o ficheiro, sem rota)
- **CSS `.prose-legal` refatorado** no `index.css`:
  - Bullets `✱` (red asterisks) → traços hairline cinza (estilo landing)
  - Chips mono `01`/`02` ao lado de H2 → ocultos (TOC à direita já faz esse papel)
  - Listas `<ol>` com chips mono `::before` → markers decimais limpos com font-feature `tnum`
  - H3 com `::before` mono red sigil → removido
  - Callouts: strong eyebrow `JetBrains Mono` uppercase → Inter editorial com tracking 0.18em
  - Tabelas: `th` `JetBrains Mono` → Inter sans
  - Definition lists: `dt` `JetBrains Mono` uppercase → Inter clean
  - `details` summary marker `JetBrains Mono` → Inter
  - Cor azul `#0E4D92` → `#003F87` (azul landing)
  - Cor verde `#2D6E4B` → `#046A38` (verde landing)
  - Cor dourada `#FFCC00` → `#FFCC29` (dourado landing)
- **CSS `.legal-viz-*` refatorado** (12 componentes):
  - Pills, KPIs, blocos, fluxos, escadas, grids de direitos, mapas de dados, timelines, icon grids, cookie stack, report flow, compliance board
  - Todos os labels/eyebrows/refs `JetBrains Mono` → Inter sans com tracking subtil 0.10–0.18em
  - Removidos prefixos decorativos `✦` em captions
  - Border-strip dos `legal-viz-block` `::before` removidos (usa `border-left` editorial agora)
- **`LegalShell.js`**: todos os `font-mono` removidos (eyebrows "Documentos", "Nesta página", "Vê também", "Centro legal", chips PT-PT/RGPD/Atualizado) → tipografia editorial Inter
- **`LegalIndex.js`**: cards com números magazine usando Inter (era ui-monospace), pill `REF` Inter editorial, callout "Antes de começares" Inter clean

Resultado validado por screenshot tool em todas as 5 rotas (`/legal`, `/legal/vision`, `/legal/terms`, `/legal/privacy`, `/legal/cookies`, `/legal/community`):
- Tipografia coerente com landing (Inter font-black tracking apertado em H1 massive, Fraunces serif italic em `<em>`, sublinhado vermelho subtil em links)
- Sem vestígios mono/✱/✦/chips fanzine
- Cores PT alinhadas com tokens da landing (`#C8102E`, `#FFCC29`, `#003F87`, `#046A38`)

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
- ~~Refactor `/theme/fanzinePalette.js` → consolidar em `editorial.js`~~ ✅ feito (Feb 12, 2026 — ficheiro eliminado)
- Migrar restantes pages (Calendario, Notifications, Tags, Hashtag, Series, etc.) para `PageHero`
- Limpeza de classes Tailwind legacy (`btn-obsidian`, `chip-on`, `card-lux`, `font-heading`, `silver-grad`) — todas têm equivalente inline editorial

## Centro Legal — Refactor UX/Design (Jun 12, 2026)
- **Mobile nav fix**: nav do Centro Legal deixa de ser `overflow-x-auto` (scroll horizontal) e passa a `grid grid-cols-2 min-[480px]:grid-cols-3 gap-1.5 lg:flex lg:flex-col` — wrap natural sem scroll.
- **Manifesto integrado no Centro Legal**: rota `/manifesto` agora usa `LegalShell` (sidebar, sticky TOC, share/print, reading meta) — uniformidade editorial total. Conteúdo mantido (6 promessas via `LegalRightsGrid`, KPIs, regra silenciosa, 3 razões, CTA register). Antiga estrutura "fanzine" (Sticker, Highlight, PosterCard, AnimatedStat, Reveal, faixa "edição nº") removida.
- **`LegalTable` responsivo** (`_visuals.js`): novo componente que renderiza tabela editorial em desktop ≥720px e cards empilhados key/value com numeração em mobile. Aplicado em Terms (definições), Privacy (finalidades RGPD), Cookies (inventário). Elimina overflow horizontal das tabelas longas.
- **`LegalContactsList`** (`_visuals.js`): grelha 2-col desktop / 1-col mobile, cartões clicáveis (mailto) com icon vermelho + assunto + email mono + ref legal. Substitui `<table>` de contactos no `LegalIndex`.
- **`LegalSectionSummary`** (`_visuals.js`): TL;DR colapsável editorial por secção H2 com strip gradient red→green. Usado em Terms (Conteúdos, Subscrições) e Privacy (Os teus direitos).
- **Placeholders removidos**: `[Denominação social, e.g. Lusorae, Lda.]`, `[NIPC]`, `[Morada completa]`, `[Cidade]`, `[matrícula]`, `[€ XX.XXX]`, `[Cidade da sede]`, `[data da última versão]` — substituídos por texto natural ("Lusorae", "Junho de 2026", "tribunal da Comarca correspondente à sede social").
- **Titulagem editorial**:
  - Hero: removido eyebrow com pulse + linha horizontal acima do `<h1>` (linhas duplicadas).
  - `h1` + subtitle + reading-meta agora **centrados** no shell.
  - `<h2>` agora **centrados** com número da secção inline em vermelho à esquerda (era kicker mini "01 · SECÇÃO" + título separado abaixo).
  - `prop` `eli5` adicionado a cada doc — passa a aparecer como callout "Em duas linhas" no shell em vez de `legal-callout` duplicado.
- **`lastUpdated`** atualizado para "Junho de 2026" em Terms, Privacy, Cookies, Vision, CommunityGuidelines.
- **NAV do Shell**: 7 documentos (Centro Legal · A nossa visão · Manifesto · Termos · Privacidade · Cookies · Diretrizes), todos sempre visíveis sem scroll horizontal.

## Centro Legal — Polish round 2 (Jun 12, 2026)
- **Travessões `&mdash;` removidos** (estilo "gerado por IA"): substituídos por vírgula natural em Terms, Privacy, Cookies, CommunityGuidelines, Vision, LegalIndex e Manifesto (~85 ocorrências de `&mdash;` + ~44 de `—` literal).
- **Ícones desambiguados**:
  - `vision` no NAV: Sparkle → **Compass** (coerente com card do LegalIndex).
  - `community` no NAV+cards: Sparkle → **Users** (sem conflito com vision).
  - `reportar@` em CONTACTS: ShieldAlert → **Flag** (resolve duplicação com `abuso@`).
- **FAB "Voltar ao topo"** (`LegalShell`): botão fixo ink black no canto inferior direito, aparece após scroll > 8%, fade + scale transition.
- **`ScrollToTopOnNavigate`** já presente no `App.js` no nível do BrowserRouter — confirmado: PUSH/REPLACE navega para topo, POP restaura posição guardada em sessionStorage. Testado entre `/legal/terms` (scroll 13859px) → `/legal/privacy` (scroll 0px).

## Auditoria Jurídica Centro Legal (Jun 12, 2026) — pendente de execução
Auditoria SSS-tier completa guardada em **`/app/memory/LEGAL_AUDIT_PT.md`**.
- Score actual: 7.4/10 (subiria para 9/10 com P0+P1).
- **3 erros bloqueadores** identificados (Lei 32/2008 inconstitucional, ODR descontinuada, "Tribunal da Comarca" obsoleto).
- **8 gaps materiais** (Ponto Único Contacto DSA, categoria DSA, DPO CNPD, idade "Utilizador", limitação responsabilidade vs consumidores, Lei 36/2023, EU-US DPF, direitos personalidade Código Civil).
- **9 itens de coerência/distribuição** (sucessão Terms→Privacy, página /legal/copyright dedicada, sobreposição Manifesto/Vision, etc.).
- **6 páginas novas recomendadas** (P3): /legal/copyright, /legal/menores, /legal/dsa-transparency, /legal/historico, /legal/governance, /legal/seguranca-investigadores.
- Ordem de execução priorizada (#1–17 = ~2h trabalho, #18–23 = ~14.5h).
- Próxima pergunta ao utilizador: aplicar P0+P1+P2 já, ou começar pelas páginas novas P3?

## Centro Legal — P0 Concluído (Jun 12, 2026) ✅
Bloqueadores P0 da auditoria resolvidos integralmente. Estado verificado por inspecção do código e screenshot das páginas:

- **P0.1 — Identificação societária**: resolvido via `/app/frontend/src/theme/legalEntity.js` (`LEGAL_ENTITY` em `pending: true`) e `LegalEntityNotice` em `LegalIndex`. Mantém-se "Lusorae" como denominação simples até constituição definitiva.
- **P0.2 — Lei 32/2008 (inconstitucional)**: já removida em `Privacy.js` linha 185 (`LegalTimeline` "PRAZOS IMPERATIVOS" → "Obrigações setoriais aplicáveis").
- **P0.3 — Plataforma ODR descontinuada**: zero referências em todo o `frontend/src` (`ec.europa.eu/consumers/odr` eliminado de `Terms.js`, `LegalIndex.js`, `CommunityGuidelines.js`). Substituído por meios alternativos certificados pela DGC (Lei n.º 144/2015) + centros de arbitragem listados em `LegalIndex` autoridades.
- **P0.4 — "Tribunal da Comarca" obsoleto**: `Terms.js` linha 334 usa terminologia moderna ("Juízo competente em razão do território da sede social, no Tribunal Judicial respetivo, nos termos da Lei n.º 62/2013, LOSJ"). Lei 62/2013 mantém-se citada por ser a actual Lei da Organização do Sistema Judiciário em vigor.
- **P0.5 — Idade contraditória 13 vs 16 anos**: corrigido com redação SSS-tier articulando 3 patamares cumulativos em `Terms.js` (definição de "Utilizador" + secção "Capacidade jurídica e idade mínima") e em `Privacy.js` secção "Menores":
  - **< 13:** acesso interdito (sem fundamento legal válido em PT).
  - **13–15:** consentimento/autorização verificável dos representantes legais (art. 16.º, n.º 2 da Lei 58/2019). Interdição automática de publicidade baseada em *profiling* (art. 28.º DSA).
  - **≥ 16:** utilização autónoma + plena capacidade contratual.
  - Mecanismos de verificação etária (art. 28.º DSA) reforçados como proporcionais e mínimos sobre dados pessoais.
- Verificado por screenshot das três secções afectadas (`/legal/terms#definicoes`, `/legal/terms#capacidade-juridica-e-idade-minima`, `/legal/privacy#menores`).

## Centro Legal — P1 Concluído (Jun 12, 2026) ✅
Gaps materiais P1 da auditoria aplicados (com 2 correcções relevantes às próprias referências legais propostas pela auditoria, validadas por pesquisa em diariodarepublica.pt):

- **P1.1 + P1.2 — Categoria DSA + Ponto Único de Contacto**: nova secção H2 #02 em `Terms.js` ("Categoria DSA e Ponto Único de Contacto"). Declara o Lusorae como **Plataforma Online** (art. 3.º al. i) DSA), **não-VLOP** (não atinge limiares art. 33.º DSA), com 2 pontos únicos de contacto distintos: `legal@lusorae.pt` para autoridades (art. 11.º DSA) e `apoio@lusorae.pt` para utilizadores (art. 12.º DSA). Línguas aceites: português europeu e inglês.
- **P1.3 — DPO comunicado à CNPD**: frase final adicionada à secção "Encarregado de Proteção de Dados" em `Privacy.js` (artigo 37.º, n.º 7 do RGPD).
- **P1.4 — Definição "Utilizador" contraditória**: já coberto no P0.5.
- **P1.5 — Salvaguarda do consumidor na limitação de responsabilidade**: parágrafo "Salvaguarda do consumidor" adicionado em `Terms.js` §16, com referência expressa à Lei n.º 24/96, ao DL 84/2021 e aos arts. 18.º e 21.º do DL 446/85.
- **P1.6 — Transposição da Diretiva 2019/790**: corrigido em `Terms.js` para o diploma correcto, **Decreto-Lei n.º 47/2023, de 19 de junho** (ao abrigo da Lei de autorização legislativa n.º 11/2023, de 22 de março). A auditoria original mencionava erradamente "Lei n.º 36/2023" — verificado em diariodarepublica.pt.
- **P1.7 — EU-US Data Privacy Framework**: secção "Transferências internacionais" em `Privacy.js` reescrita em lista, com 3 garantias do RGPD (decisões de adequação incluindo EU-US DPF Decisão 2023/1795, SCC Decisão 2021/914 + TIA, BCR art. 47.º).
- **P1.8 — Direitos de personalidade (CC arts. 70.º a 81.º)**: novo item adicionado às `LegalIconGrid` de condutas proibidas tanto em `Terms.js` como em `CommunityGuidelines.js` (nome, imagem, palavra, reserva da vida privada, integridade moral).
- **Bónus — Autoridade DSA-PT**: corrigida referência "Lei n.º 31/2024" (fictícia) para **Decreto-Lei n.º 20-B/2024, de 16 de fevereiro** (diploma vigente que designa a ANACOM como Coordenador Nacional dos Serviços Digitais) em `LegalIndex.js` `LegalComplianceBoard` + nova secção do `Terms.js`. Verificado em diariodarepublica.pt.

**Pendente (próximas sessões):** P2 (9 itens de coerência), P3 (6 páginas novas).


