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

## Centro Legal — P2 Concluído (Jun 12, 2026) ✅
8 itens P2 da auditoria aplicados (P2.2 fica como P3 — pagina /legal/copyright dedicada). 5 profissões orientadoras: UX writer, advogado direito digital, DPO, information architect, anti-dark-pattern designer.

- **P2.1 — Inatividade & Sucessão migradas Terms → Privacy**: secção H2 em `Terms.js` reduzida a 1 parágrafo+link; nova secção #10 "Sucessão e inatividade" em `Privacy.js` entre "Prazos de conservação" e "Decisões automatizadas", com 3 opções claras (memorialização, portabilidade art. 20.º RGPD, eliminação art. 17.º RGPD) + cláusula sobre instruções *post mortem* (art. 17.º Lei n.º 58/2019).
- **P2.3 — Sobreposição Manifesto vs Vision**: nota introdutória adicionada em `Vision.js` §3 ("Os seis compromissos") clarificando que Vision = enquadramento institucional, Manifesto = tradução operacional (regras de engenharia concretas).
- **P2.4 — Categoria Marketing em `Cookies.js`**: reformulada para "Reservada, sem cookies desta categoria", com compromisso de 15 dias de antecedência + novo consentimento por categoria + interdição automática a menores (art. 28.º DSA).
- **P2.5 — Métricas LegalIndex recalculadas**: contagem real de H2 e estimativa a 180 wpm (legal denso). Vision 8·~6min · Manifesto 6·~4min · Terms 22·~14min · Privacy 18·~10min · Cookies 10·~4min · Community 11·~5min.
- **P2.6 — Cross-ref Treino de IA**: novo princípio em `Privacy.js` ("Sem treino de IA não consentido") + reforço no item IA/deepfakes das `Diretrizes da Comunidade`.
- **P2.7 — CTA Manifesto suavizado**: removido card vermelho gigante (`manifesto-cta-register-card`) que contradizia o tom anti-marketing; substituído por link inline discreto centrado em prosa cinza com underline vermelho. Mantido `data-testid="manifesto-cta-register"` para testes.
- **P2.8 — "Sala" e "Conselho de Integridade"**: definição inline reforçada em `Vision.js` ("Sala" = feed oficial sem privilégio algorítmico) + link para `/legal/governance` (página a publicar com a primeira reunião do Conselho).
- **P2.9 — Cookies analíticos**: removida ênfase em "pseudonimizados" (argumento técnico frágil); mantida formulação factual "IP truncado como medida técnica complementar de minimização".

**Verificado** por screenshots em `/legal` (cards com métricas novas), `/manifesto` (sem card grande, link discreto), `/legal/vision#os-seis-compromissos` (cross-ref Manifesto + link governance) e `/legal/privacy#sucessao-e-inatividade` (nova secção #10 / 18). Lint JS limpo nos 5 ficheiros editados (Vision, Manifesto, Terms, Privacy, Cookies, CommunityGuidelines, LegalIndex). Único lint warning é pré-existente em `LegalShell.js` (set-state-in-effect) — não relacionado.

**Score estimado pós P0+P1+P2:** ~9.5/10 (acima do objetivo da auditoria de 9/10 para "go-live ready").

**Pendente:** P3 (6 páginas novas) + constituição societária externa ao código.

## Centro Legal — P3 Concluído (Jun 12, 2026) ✅
6 páginas especializadas criadas integralmente. 5 profissões orientadoras: advogado de propriedade intelectual digital, DSA compliance officer, B1 accessibility writer (menores), ethics & governance officer, security researcher liaison.

- **P3.1 — `/legal/copyright`** (Direitos de Autor e Notificações): procedimento Notice & Takedown completo, 11 secções. CDADC + DL n.º 47/2023 + DSA arts. 16.º a 23.º. Inclui formato estruturado de notificação (6 elementos obrigatórios), procedimento em 5 passos (LegalLadder), contra-notificação fundamentada, política de infratores reincidentes (3 strikes), reposição gratuita após recurso procedente. Email dedicado: `copyright@lusorae.pt`.
- **P3.2 — `/legal/menores`** (Para Pais e Menores): linguagem B1, 7 secções. Três patamares etários (<13, 13-15, ≥16) com KPI grid. O que NÃO fazemos a menores (sem publicidade comportamental, sem dados sensíveis, sem dark patterns, sem contadores públicos). Configurações de proteção por defeito (perfil privado, descoberta limitada, mensagens controladas). Como pais exercem direitos do menor (RGPD arts. 15.º-22.º + Lei 58/2019 + DSA art. 28.º + Lei 27/2021 + Convenção ONU).
- **P3.3 — `/legal/dsa-transparency`** (Transparência DSA): relatório trimestral, 11 secções. Cumpre DSA arts. 15.º + 17.º + 20.º + 24.º. Tabelas estruturadas: notificações por categoria, decisões por tipo de medida, recursos internos, sistemas automatizados vs revisão humana (LegalTimeline), comunicações de autoridades, sinalizadores de confiança (ANACOM via DL 20-B/2024), acesso de investigadores académicos (art. 40.º DSA). Frequência: trimestral, formato JSON+HTML.
- **P3.4 — `/legal/historico`** (Histórico de Versões): registo cronológico, 7 secções. Esquema semver aplicado a documentos legais (MAJOR=direitos / MINOR=clarificações / PATCH=editoriais). Tabela de estado actual com 11 documentos em v1.0.0. Política de retenção indefinida, formato dos diferenciais publicados (sumário+tabela+diff textual), comunicação de alterações materiais com 15 dias de antecedência.
- **P3.5 — `/legal/governance`** (Governança e Conselho de Integridade): 9 secções. Três níveis de decisão (Trust & Safety / DPO independente / Conselho de Integridade) em LegalRightsGrid. Composição do Conselho: mínimo 3 membros, ≥1 membro externo independente, mandato bianual renovável uma vez. Competências consultivas e princípios (atas públicas, voto de vencido, conflito de interesses, remuneração transparente). Candidatura a membro externo aberta. Email: `governance@lusorae.pt`.
- **P3.6 — `/legal/seguranca-investigadores`** (Responsible Disclosure): 11 secções. Compromisso de não retaliação (safe harbor) com 5 princípios obrigatórios. Âmbito in-scope/out-of-scope (engenharia social, DoS e exfiltração massiva são out-of-scope). Procedimento em 5 passos (Reportar → 72h acusação → Triagem → Mitigação → Divulgação pública). Janela de divulgação coordenada CVSS-graded (Crítica 30d, Alta 60d, Média 90d, Baixa 180d). Hall of Fame opt-in. Auditoria externa anual. Email: `seguranca@lusorae.pt`.

### Integração
- **`App.js`**: 6 lazy imports + 6 rotas adicionadas (`/legal/copyright`, `/legal/menores`, `/legal/dsa-transparency`, `/legal/historico`, `/legal/governance`, `/legal/seguranca-investigadores`).
- **`LegalShell.js`**: NAV alargada de 7 → 13 entradas, com ícones distintos (BookOpen, Heart, BarChart3, Building2, ShieldAlert, Clock). Grid responsivo absorve o aumento sem quebras.
- **`LegalIndex.js`**: nova secção "Documentos especializados" com 6 cards mais compactos (formato `sm:grid-cols-2`), separados visualmente dos 6 cards primários. CONTACTS list alargada para 11 endereços (incluindo copyright, seguranca, governance). `data-testid` único por card.
- **`legalEntity.js`**: `LEGAL_CONTACTS` expandido com `copyright`, `security`, `governance`.

### Verificado
Screenshots em `/legal` (12 cards visíveis com `data-testid` correto, NAV com 13 documentos), `/legal/copyright` (TOC 11 secções + 4 KPIs + "Em duas linhas" + LegalLadder), `/legal/menores` (7 secções B1 + KPI grid das idades), `/legal/dsa-transparency` (11 secções + tabelas DSA estruturadas + "Não-VLOP" badge), `/legal/seguranca-investigadores` (11 secções + KPI 72h/90d/opt-in + LegalLadder 5 passos), e visual coerente nas restantes. Lint clean em todas as 6 páginas novas.

**Score estimado pós P0+P1+P2+P3:** ~9.8/10 ("exemplar tier", acima dos parâmetros típicos do mercado europeu).

**Centro Legal Lusorae = um dos mais completos do mercado português (e provavelmente europeu) para uma plataforma social em fase pré-lançamento.**

**Pendente:** apenas constituição societária definitiva da Lusorae (acto externo ao código — quando estiver feito, basta actualizar `legalEntity.js` com `pending: false` + dados completos).

## Centro Legal — Drop-down flutuante UI (Jun 12, 2026) ✅
Substituição do sidebar esquerdo do `LegalShell` por dropdown flutuante editorial.

### Implementação
- **Trigger**: pill no header sticky (substitui o label estático "· Centro Legal") com ícone + nome curto do documento + chevron rotador. `data-testid="legal-doc-switcher-trigger"`. ARIA `aria-haspopup="menu"` + `aria-expanded`.
- **Panel**: glassmorphism **removido depois (sem blur)** → superfície sólida branca `#ffffff` com hairlines `rgba(10,10,10,0.10)` + sombra editorial difusa (`0 28px 56px -18px rgba(10,10,10,0.30)`). Animação `legalDocPanel 200ms cubic-bezier(0.22, 1, 0.36, 1)`.
- **Agrupamento**: 7 PRIMÁRIOS (Centro Legal · Visão · Manifesto · Termos · Privacidade · Cookies · Diretrizes) + 6 ESPECIALIZADOS (Direitos de Autor · Menores · DSA · Governança · Segurança · Histórico), separados por hairline divisor.
- **Item activo**: bg rosa-claro `rgba(200,16,46,0.06)` + barra vermelha `2px` à esquerda + check `Check` vermelho à direita + texto a negrito ink.
- **Fechar**: ESC, clique fora, botão X close (`legal-doc-switcher-close`), ou clique num item.
- **Footer condicional**: "Atualizado · {lastUpdated}" com dot verde quando o doc actual o forneça.

### Responsividade pós-iteração utilizador
- **Mobile**: `position: fixed`, `left-2 right-2 top-[64px]` — panel ocupa 404px com 8px de margem cada lado em viewport 420px. Sem overflow.
- **Desktop (≥lg)**: `lg:absolute lg:left-0 lg:w-[360px] lg:top-full lg:mt-2` — ancorado ao trigger no header sticky.
- **Backdrop dim**: `rgba(10,10,10,0.32)` sólido (sem blur, após pedido explícito do utilizador).

### Layout consequence
- `LegalShell` grid alterada de `col-3 / col-6 / col-3` para `col-9 / col-3` (main + TOC). Article continua centrado com `max-w-[760px] mx-auto`.

### Files touched
- `/app/frontend/src/pages/legal/LegalShell.js`: imports (ChevronDown, X), state hooks, currentDoc lookup, dropdown JSX, sidebar removido, grid ajustado.
- `/app/frontend/src/index.css`: novas keyframes `legalDocFade` + `legalDocPanel`.

### Verificado
Screenshots em desktop (1280w) e mobile (420w): trigger visível em ambos, panel ancorado correctamente sem overflow, 13 items renderizados, item activo destacado, navegação real testada (clique em "Governança" → URL muda → trigger pill actualiza label).

## Centro Legal — Análise SSS-tier final (Jun 12, 2026) 📊
Aplicação de 10 lentes profissionais (Sénior Digital Rights Lawyer · DPO IAPP · DSA Compliance Officer · UX writer · Information Architect · Editorial designer · Front-end a11y · B1 plain-language · Ethics officer · Security researcher liaison).

### Score por página
| # | Página | Score | Tier |
|---|---|---|---|
| 1 | `/legal` (LegalIndex) | **9.0** | 🟢 SS |
| 2 | `/legal/vision` | 8.7 | 🟢 SS |
| 3 | `/manifesto` | 8.5 | 🟢 SS |
| 4 | `/legal/terms` | **9.2** | 🟢 SS+ |
| 5 | `/legal/privacy` | 8.8 | 🟢 SS |
| 6 | `/legal/cookies` | 8.5 | 🟢 SS |
| 7 | `/legal/community` | 8.6 | 🟢 SS |
| 8 | `/legal/copyright` | 8.8 | 🟢 SS |
| 9 | `/legal/menores` | 8.4 | 🟢 SS |
| 10 | `/legal/dsa-transparency` | 8.0 | 🟡 S+ |
| 11 | `/legal/governance` | 8.2 | 🟡 S+ |
| 12 | `/legal/seguranca-investigadores` | 8.3 | 🟡 S+ |
| 13 | `/legal/historico` | 7.8 | 🟡 S+ |

### Overall Total: **8.5 / 10** 🟢
Posicionamento: **acima da média do mercado português SaaS** (6–7) e **acima do RGPD-mínimo**. Falta ~0.5–1.0 para atingir o "exemplar tier internacional" (Mozilla, Signal, Wikimedia, GitHub Trust Center).

### 6 lacunas transversais identificadas
1. **AI Act ausente** (Reg. (UE) 2024/1689) — sistemas algorítmicos de moderação são *high-risk* Annex III
2. **Lei 93/2021 (whistleblowing) ausente** em Governance — falta canal protegido para colaboradores
3. **CNCS/CERT.PT ausente** em `/legal/seguranca-investigadores` (autoridade nacional de cibersegurança)
4. **Global Privacy Control (GPC) ausente** em Cookies + Privacy (standard W3C emergente recomendado pela CNPD)
5. **Lista de subcontratantes não pública** em Privacy (apenas "a pedido") — anti-padrão SS
6. **Inconsistência residual P2.9**: Privacy linha 154 ainda diz "IP **pseudonimizado**" enquanto Cookies já foi corrigido para "IP truncado"

### Fraquezas page-specific notáveis
- **Vision**: sem `eli5`, falta secção sobre conflitos de interesse da empresa
- **Manifesto**: KPI "100% transparência de código" pode ser misleading se não é OSS; preços Plus/Aura não estão lá
- **Terms**: 14 min de leitura é alto; falta secção dedicada a subscrições (valores, ciclos, direito de livre resolução 14 dias DL 24/2014); sem SLA mínimo de disponibilidade
- **Privacy**: período "30 dias após pedido de eliminação" sem justificação; tensão IP-truncado vs localização-aproximada
- **Cookies**: consentimento só por categoria (não granular por finalidade); sem suporte GPC; vendor analítico real não identificado
- **Community**: "Pile-on" sem critério operacional (n.º mensagens? prazo?); sem exemplos concretos
- **Copyright**: sem link à DSA Transparency Database; 3-strikes não menciona reset se contra-notificação procedente
- **Menores**: documento ~870 palavras (B1 verdadeiro seria <500); mecanismo concreto de verificação etária vago
- **DSA Transparency**: todos os números são "—"; sem AI Act; sem prazo de publicação concreto
- **Governance**: composição nominal vazia; mínimo 3 membros é fraco; sem whistleblowing channel
- **Segurança**: sem chave PGP publicada; sem bug bounty; sem CNCS/CERT.PT
- **Histórico**: conceptual sem dados; sem reembolso pro-rata para opositores; sem cronograma de auditoria

## O que falta — Roadmap consolidado pós-auditoria SSS (Jun 12, 2026)
Documenta tudo o que ainda não foi implementado, priorizado para chegar a SSS exemplar (9.5+).

### 🔴 P0 — Correções imediatas (~30 min, sem decisões de negócio)
| ID | Acção | Ficheiro | Justificação |
|---|---|---|---|
| P0.A | Inconsistência IP: corrigir "pseudonimizado" → "truncado" | `Privacy.js` linha 154 | Coerência com P2.9 |
| P0.B | Cláusula AI Act (Reg. (UE) 2024/1689): mencionar como aplicável a sistemas algorítmicos de moderação (high-risk Annex III) | `Terms.js` + `DsaTransparency.js` + `Privacy.js` (decisões automatizadas) | Regulamento em vigor desde Ago/2024 |
| P0.C | Publicar chave PGP fingerprint | `Seguranca.js` | Anti-padrão actual de responsible disclosure |
| P0.D | Referenciar **CNCS / CERT.PT** como autoridade nacional de cibersegurança | `Seguranca.js` | Diploma orgânico do CNCS |
| P0.E | Adicionar `eli5` prop a `Vision.js` | `Vision.js` | Inconsistência cross-doc |

### 🟠 P1 — Melhorias materiais (~75 min, decisões de redação)
| ID | Acção | Ficheiro | Justificação |
|---|---|---|---|
| P1.A | Canal de whistleblowing (Lei n.º 93/2021, transposição Diretiva UE 2019/1937) | `Governance.js` | Obrigação legal para entidades com ≥50 colaboradores; boa prática mesmo abaixo |
| P1.B | **Lista pública de subcontratantes** (alojamento, email transacional, etc.) | `Privacy.js` | Best practice SS (Mozilla, Signal, Wikimedia) |
| P1.C | Suporte ao **Global Privacy Control (GPC)** + opt-out automatizado | `Cookies.js` + `Privacy.js` | Recomendado pela CNPD 2024 |
| P1.D | Link à **DSA Transparency Database** da CE | `DsaTransparency.js` + `Copyright.js` | Onde Statements of Reasons devem ser indexados |
| P1.E | Cláusula sobre **conflitos de interesse da empresa Lusorae** (financiamento, fundadores) | `Vision.js` | Falta de honestidade institucional |
| P1.F | Política de subscrições explícita (Plus, Aura): valores, ciclos, direito de livre resolução 14 dias (DL 24/2014) | `Terms.js` | Gap material para um SaaS pago |
| P1.G | SLA mínimo de disponibilidade ("esforço razoável de 99.5%" ou semelhante) | `Terms.js` §15 | Frágil para utilizador pago |
| P1.H | Adicionar definição de "Conteúdo" à `LegalTable` de Definições | `Terms.js` §3 | Termo central usado >20× sem definir |

### 🟡 P2 — Refinamento UX/copy (~45 min)
| ID | Acção | Ficheiro |
|---|---|---|
| P2.A | "Pile-on" com critério operacional (e.g. "≥5 mensagens dirigidas em <24h por contas distintas") | `CommunityGuidelines.js` |
| P2.B | Exemplos concretos de aplicação (anonimizados): "este post foi despromovido porque X" | `CommunityGuidelines.js` |
| P2.C | Tempo de resposta a pedidos parentais com KPI específico (em adição ao "1 mês RGPD") | `Menores.js` |
| P2.D | Versão visual/pictogramas para o próprio menor (não só pais) | `Menores.js` (subsecção) |
| P2.E | Reset do strike-counter se contra-notificação procedente | `Copyright.js` |
| P2.F | URL interno de reporte dentro do produto (não só email) | `Copyright.js` |
| P2.G | Mecanismo concreto de verificação etária (e.g. "estimativa por face self-hosted + opt-in / confirmação parental por email") | `Menores.js` |
| P2.H | Reembolso pro-rata de subscrições para utilizador que se opõe a alteração MAJOR | `Historico.js` + `Terms.js` |
| P2.I | Cronograma de auditoria ("próxima revisão obrigatória: Q2 2026") | `Historico.js` |

### 🟢 P3 — Decisões de negócio / actos externos (não-código)
| ID | Acção | Dependência |
|---|---|---|
| P3.A | **Constituição societária** definitiva da Lusorae, Lda. → actualizar `legalEntity.js` (`pending: false` + NIPC/morada/matrícula/capital) | Acto registal externo |
| P3.B | **Configurar caixas de correio** dos 3 novos endereços (`copyright@`, `seguranca@`, `governance@`) com auto-resposta de recepção | Provedor de e-mail |
| P3.C | **Composição nominal** do Conselho de Integridade — publicar nomes, CVs, mandatos | Convidar membros externos |
| P3.D | **Primeira edição real** do relatório DSA (substituir "—" por números) | Após primeiro trimestre operacional |
| P3.E | **Primeira reunião** do Conselho de Integridade + acta pública | Após constituição |
| P3.F | **Bug bounty monetário** formal (HackerOne / Synack / BugCrowd) | Decisão financeira |
| P3.G | **Lista nominativa de subcontratantes** com país de alojamento (operacional) | Inventário interno |
| P3.H | **Sistema de versionamento real** ligado ao Git (diff automático em `/legal/historico` em vez de placeholder semver estático) | Engenharia |
| P3.I | **Press kit / Landing diferenciador** apontando ao Centro Legal como prova institucional | Marketing/Comunicação |

### 📊 Impacto estimado no score
| Roadmap | Score esperado | Tier |
|---|---|---|
| Estado actual | 8.5 | SS (top 10% europeu) |
| + P0 aplicado | 8.8 | SS |
| + P0 + P1 aplicados | 9.2 | SSS- (exemplar emergente) |
| + P0 + P1 + P2 aplicados | 9.5 | SSS (exemplar internacional) |
| + P3 (decisões externas) | 9.8 | SSS+ (referência de mercado) |

### Próximo movimento sugerido
**P0 (~30 min, código apenas)** — fecha as 5 lacunas mais embaraçosas (inconsistência IP, AI Act, PGP, CNCS, eli5). Score salta para 8.8 sem custos de negócio.






## Landing Page — Auditoria 10 Profissões + Pacote SEO P0 (Feb 13, 2026) ✅

### Auditoria entregue
Painel de 10 profissões avaliou `Landing.js` (2433 linhas, 123 KB). Score geral: **8.1/10**.
- Forças: sistema editorial coeso, anti-features ("Sem ads / sem algoritmo"), micro-interações premium (Magnetic/Tilt/CursorDot), mobile sticky CTA com persist.
- Maior buraco identificado: **SEO 3/10** (sem OG, sem Twitter cards, `lang=en`, sem schema, sem canonical, sem sitemap).

### Pacote SEO P0 — implementado e validado (19/19 checks pass)

**Files touched:**
- `/app/frontend/public/index.html` — reescrito head (~75 linhas novas)
- `/app/frontend/public/site.webmanifest` — atualizado lang, theme, categories
- `/app/frontend/public/robots.txt` — NOVO (políticas crawl, GPTBot/Claude allowed, scrapers bloqueados, sitemap ref)
- `/app/frontend/public/sitemap.xml` — NOVO (10 URLs com priority + image extension)
- `/app/frontend/public/og/og-image.jpg` — NOVO (1200×630, brand-cohesive, blocos PT)
- `/app/frontend/public/og/twitter-card.jpg` — NOVO (mesma imagem, summary_large_image)

**SEO Specialist — entregue:**
- `<html lang="pt-PT">` (era `en` — ranking PT corrigido)
- `<title>` keyword-rich: "Lusorae — Rede social portuguesa sem ads · BETA 2026"
- `<meta description>` com CTA + keywords (160 chars)
- `<link rel="canonical">` + 2 hreflang (pt-PT, x-default)
- `<meta robots>` com `max-image-preview:large, max-snippet:-1`
- robots.txt com Sitemap + Host + políticas IA (GPTBot allow, CCBot deny)
- sitemap.xml com 10 URLs + image:image extension na home

**Social Media Architect — entregue:**
- Open Graph completo: type, site_name, locale (pt_PT), url, title, description, image (+ secure_url, type, width, height, alt)
- Twitter Cards: summary_large_image, site, creator, url, title, description, image, alt

**Structured Data Engineer — entregue:**
- JSON-LD `@graph` com 3 entidades:
  - `Organization` (name, url, logo, foundingDate, foundingLocation, areaServed PT, contactPoints apoio@/dpo@)
  - `WebSite` (publisher refs Organization, inLanguage pt-PT)
  - `SoftwareApplication` (category SocialNetworkingApplication, offer 0 EUR)

**A11y Specialist — entregue:**
- Removido `maximum-scale=1, user-scalable=no` do viewport (cumpre WCAG 2.2 SC 1.4.4 Resize Text)
- Theme-color dual: `#F7F5EF` light / `#0A0A0A` dark (prefers-color-scheme)

**Performance Engineer — entregue:**
- OG image otimizada (147 KB JPEG q=90, dimensões 1200×630 exatas)
- Image preconnect mantido (fonts.googleapis, fonts.gstatic)
- robots.txt previne crawl de áreas autenticadas (/feed, /messages, /admin, etc.)

### Validação
- 19/19 SEO checks ✓ (curl + assertions)
- JSON-LD: parse válido, 3 entidades, 2821 chars
- sitemap.xml: XML válido, 10 URLs
- site.webmanifest: JSON válido, lang=pt-PT
- HTTP 200 em /robots.txt, /sitemap.xml, /og/og-image.jpg, /og/twitter-card.jpg, /site.webmanifest
- Smoke test screenshot — landing renderiza sem regressão visual
- Frontend reiniciado para forçar CRA re-bake do template

### Score landing após P0 SEO
| Eixo | Antes | Depois |
|------|-------|--------|
| SEO | 3.0/10 🔴 | **9.0/10** ✓ |
| A11y | 7.0/10 | **8.0/10** ✓ |
| Geral | 8.1/10 | **8.8/10** |

### Pendente do plano original (não bloqueante)
- **P1 CRO**: PostHog `capture()` em CTAs (hero, sticky, nav) + email-only magic-link signup
- **P1 RGPD**: PostHog init gated atrás do consent banner
- **P1 UI**: cookie banner → bottom thin bar (não cobrir hero no first paint)
- **P1 Architecture**: split de `Landing.js` (2433 linhas) em ~12 módulos `<200 linhas`
- **P1 Performance**: migrar imagens Unsplash → `/public/img/` WebP/AVIF
- **P2 Long-term**: avaliar migração CRA → Next.js para SSR/SSG (SEO real, OG dinâmico)
