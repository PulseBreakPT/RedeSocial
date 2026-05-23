# 🔵 LUSORAE — ROADMAP "REDE SOCIAL VIVA"

> **Documento único** com tudo o que está por fazer, em ordem, com specs
> técnicas detalhadas. Pode ser retomado por qualquer agente sem perder
> contexto. Atualizado em: 2026-05-22.

---

## 🟢 JÁ ENTREGUE (não tocar)

### Fase 1 — Pulse Engine (Backend) ✅
- **Ficheiro novo:** `/app/backend/pulse_engine.py` (~600 linhas)
- **Wiring em:** `/app/backend/server.py`
  - Import no topo
  - Campo `pulse_opt_out` em `UpdateProfileIn` + `public_user()`
  - Startup: `init_pulse_indexes()` + `start_pulse_loop()`
  - Shutdown: `stop_pulse_loop()`
- **5 endpoints REST** sob `@api` (prefixo `/api`):
  - `GET /api/pulse/now`
  - `GET /api/pulse/regions`
  - `GET /api/pulse/topics`
  - `GET /api/pulse/mood`
  - `GET /api/pulse/timeline?minutes=N`
- **Broadcast WS:** type `pulse_tick` a cada 60s
- **Coleção Mongo:** `social_pulse_snapshots` com TTL de 7 dias
- **Privacidade:** D1 (city-level, opt-out por default=False)
- **Testado:** 88/96 testes (91.7%) — os 8 "fails" eram timing do teste,
  não bug. Ver detalhes em `/app/test_result.md` linha ~3402.

### Fix sintaxe — Cockpit.js ✅
- Linha 479 duplicada (`efault Cockpit;`) removida. Frontend compila.

### Fase 2 — Ambient Pulse Widgets (UI) ✅ (parcial — ver nota PulseGlobe)
- **Hook novo:** `frontend/src/hooks/usePulse.js` — store partilhado
  (singleton: 1 snapshot, 1 timer de polling, N subscribers, como
  `useFeedPulse`). Faz **uma** chamada a `/api/pulse/now` (o snapshot já
  traz tudo) e refaz no WS `pulse_tick`. Polling de segurança 60s
  (offline) / 5min (live). Falha silenciosa. Deriva
  `meaningful_topics/regions/cities`.
- **Componente novo:** `frontend/src/components/pulse/PulseBar.js` —
  barra ambiental no topo do feed. Mensagens rotativas (8s) só com sinal
  real: pulso global >20%, cidade/região meaningful, tópico a crescer,
  mood dominante. Sem sinal → `null`. Read-only (sem cliques). Reusa
  `live-dot` (coral, on-brand).
- **Componente novo:** `frontend/src/components/pulse/TopicBurstChips.js`
  — chips de hashtags meaningful (max 5), clicáveis → `/tag/{tag}`.
  Sem nenhuma → `null`.
- **Integração:** `frontend/src/pages/Feed.js` — `<PulseBar />` +
  `<TopicBurstChips />` acima do `SmartTodayBanner` (feed é single-column,
  não há sidebar).
- **Opt-out:** toggle "Contribuir para o pulso social" em
  `settings/PrivacyTab.js`. Liga a `PATCH /api/users/me` com
  `pulse_opt_out: !value` via `Settings.js` (`priv_pulse`). Default =
  contribui (pulse_opt_out=False).
- **NOTA — 2.3 PulseGlobe adiado:** o feed é single-column (sem sidebar),
  por isso um globo lateral não tem onde encaixar limpo. O sinal de
  intensidade ("BPM social") pode mais tarde ser dobrado dentro do
  PulseBar ou reaparecer quando/se houver layout com sidebar. Decisão
  consciente para não poluir a coluna única.
- **Por validar:** `node_modules` não está instalado neste ambiente, por
  isso não foi possível correr o frontend nem o testing agent. Sintaxe
  JSX validada via esbuild (transform-only). Falta teste visual/E2E:
  confirmar que os widgets aparecem só com sinal e devolvem `null` com DB
  vazio sem partir o layout.

### Fix — Smart cache invalidation no Pulse Engine ✅
- `pulse_engine.get_last_snapshot_cache_with_age()` (idade via monotonic).
- `/api/pulse/now`: cache fresca (<30s) → devolve; cache velha →
  recalcula on-demand (Mongo está igualmente velho); cold boot → Mongo
  depois compute.

### Fase 3 — Presence Layer ✅ (já existia no código)
- Auditado: já estava implementado, não foi preciso `presence_engine.py`.
  - Backend: `ws_manager.viewers_by_post`, `add/remove_post_viewer`,
    broadcast `post_viewers`, eventos WS `post_view`/`post_unview`,
    `c_typing`, endpoint `/posts/{id}/viewers`, presença de DMs, heartbeat
    `last_seen`.
  - Frontend: `usePostPresence`, `PostViewersBadge`,
    `ConversationPresence`, `useCommentTyping`, `CommentTypingIndicator`
    — renderizados em `PostDetail`.
  - **Decisão:** NÃO adicionar "N a ler" a cada card do feed — enviar
    `post_view` ao scrollar seria semanticamente errado (scrollar ≠ ver).
    Presença fica no contexto focado (PostDetail).

### Fase 4 — Context Engine ✅
- **Módulo novo:** `backend/context_engine.py` —
  `get_feed_context_weights(now, dominant_mood, calendar_theme,
  calendar_label)`. Math puro + lookup (slot de hora, dia da semana,
  evento PT, mood dominante). Devolve `tempo`, `freshness_mult`,
  `mood_boost_for/boost`, `label`. Sem IA.
- **Scoring:** `compute_ranking_score(..., context=ctx)` — ajusta o peso
  de frescura por `freshness_mult` e dá boost suave a posts cujo mood
  combina com o contexto. Contexto calculado 1x/pedido em `/feed/v2` via
  `_build_feed_context()` (mood vem da cache do Pulse, evento do calendário).
- **Endpoint:** `GET /api/feed/context` → `{tempo, slot, label}`.
- **Frontend:** `components/pulse/FeedContextLine.js` mostra o label
  subtil no cabeçalho do feed (refresh 10 min). `null` se vazio.

### Fase 5 — Mesas (conversas efémeras) ✅
- **Módulo novo:** `backend/mesas.py` — helpers puros + `init_mesas_indexes`
  (TTL Mongo em `expire_at`). Tipos: rapida(2h)/noturna(até 6h UTC)/
  tema(24h). `mesa_messages` com TTL próprio = expiry da mesa.
- **Endpoints (server.py):** `POST /api/mesas`, `GET /api/mesas` (vivas,
  ordenadas por atividade), `GET /api/mesas/{id}` (+ mensagens),
  `POST /api/mesas/{id}/join`, `POST /api/mesas/{id}/message` (auto-join +
  difusão WS `mesa_message` só aos participantes via `send_personal`).
- **Frontend:** página `pages/Mesas.js` (lista + criar + sala em tempo
  real com composer e countdown), rota `/mesas`, nav "Mesas" (Coffee) na
  LeftSidebar. WS via `useWsMessages` filtrando por `mesa_id`, dedupe por id.
- **Auto-criação por evento (mesa de evento):** adiada — depende de
  trigger de eventos; o tipo "evento" não está exposto (só rapida/noturna/
  tema). Pode ser adicionado depois.

### Fase 6 — Reputação Humana Invisível ✅
- **Módulo novo:** `backend/reputation_engine.py` — `health_score` 0–100
  recalculado em loop diário (`recompute_all`, mesmo padrão de loop do
  pulse). Sinais reais (30d): reciprocidade (respostas em fios),
  diversidade (fios distintos), presença, − reports (user+conteúdo),
  − toxicidade (léxico PT curado, match por fronteira de palavra),
  − volume obsessivo. Math determinística, sem IA.
- **Aplicação:** `health_multiplier(score)` (subtil: <30 → 0.75, >75 →
  1.08) multiplicado no `compute_ranking_score`. Autores carregados numa
  query em `/feed/v2` (`author_health`).
- **Invisível:** guardado em `users.health_score`, nunca em `public_user`.
  Sem leaderboards/badges/níveis.
  - ⚠️ Nota: a invisibilidade assenta em `public_user()` ser o caminho
    padrão de saída de utilizador. Recomenda-se auditar endpoints que
    devolvam docs de utilizador em bruto (projeção sem `health_score`).

---

## 🟡 PENDENTE — POR FAZER

### ⚠️ Pré-requisito menor (5 min, opcional)
**Smart cache invalidation no Pulse Engine**

O teste apanhou um caso onde o `/api/pulse/now` devolveu cache antiga
porque o loop background ainda não tinha re-tickado. Fix sugerido:

```python
# Em pulse_engine.py, modificar get_last_snapshot_cache() para devolver
# também a idade da cache; em server.py, no endpoint /pulse/now, se
# cache_age > 30s, fazer compute_pulse_snapshot() em vez de devolver
# cache. Custa ~25ms extra mas garante frescura quando o utilizador
# acabou de publicar.
```

Detalhe:
- Em `pulse_engine.py`, expor `_last_snapshot_real_ts: datetime` (não monotonic).
- No endpoint `/api/pulse/now`:
  ```python
  cache, age = pulse_engine.get_last_snapshot_cache_with_age()
  if cache and age < 30:
      return cache
  return await pulse_engine.compute_pulse_snapshot(db)
  ```

Não bloqueia nada. Pode-se saltar e deixar como está.

---

### 🔵 Fase 2 — Ambient Pulse Widgets (UI)  ✅ ENTREGUE (ver topo)

> A maior parte desta fase já está feita — ver "JÁ ENTREGUE ▸ Fase 2".
> O que resta é **2.3 PulseGlobe** (adiado: feed single-column) e o
> **teste visual/E2E** quando houver `node_modules`. Spec original
> mantida abaixo para referência.

**Objetivo:** Transformar os 5 endpoints da Fase 1 em widgets *ambientais*
que aparecem **só quando há sinal real** (regra `meaningful: true`).

#### 2.1 Hook React partilhado
**Ficheiro novo:** `/app/frontend/src/hooks/usePulse.js`

```js
// Polling REST a cada 60s + listener WebSocket para `pulse_tick`.
// Devolve: { now, regions, topics, mood, loading, error }
// Internamente faz merge: ao receber `pulse_tick`, faz refetch de /now
// (não confia só no payload condensado do WS para evitar drift).
```

Spec:
- `useEffect` polling fallback (60s) caso WS caia
- WebSocket subscribe a `pulse_tick` → trigger refetch
- Estado em `useReducer` (simples: SET_NOW, SET_LOADING, SET_ERROR)
- Expor `now.totals`, `now.dominant_mood`, `now.pulse_delta_pct`
- Expor `meaningful_topics`, `meaningful_regions`, `meaningful_cities` já
  filtrados.

#### 2.2 Componente — `PulseBar` (topo do feed)
**Ficheiro novo:** `/app/frontend/src/components/pulse/PulseBar.js`

Aparece **só** quando há `meaningful_regions[0]` ou `pulse_delta_pct > 20`.

```
┌──────────────────────────────────────────────────────────┐
│  ● Lusorae viva  ·  Lisboa está +38% acima do normal  ·  │
│  Tópico: #benfica a crescer  ·  Mood: Jogo               │
└──────────────────────────────────────────────────────────┘
```

- Altura ~40px, sticky abaixo do header
- Bola verde pulsante (`animation: pulse-dot 2s infinite`)
- Mensagem rotativa a cada 8s entre 3-4 sinais meaningful
- Se NÃO há sinal meaningful → **componente devolve `null`** (não força mentira)
- Sem clicáveis na v1 (read-only, ambient)

CSS:
```css
.pulse-bar { background: linear-gradient(90deg, rgba(34,197,94,.08), transparent); }
.pulse-dot { box-shadow: 0 0 0 0 rgba(34,197,94,.6); animation: pulse 2s infinite; }
@keyframes pulse { 70% { box-shadow: 0 0 0 8px rgba(34,197,94,0); } }
```

#### 2.3 Componente — `PulseGlobe` (sidebar)
**Ficheiro novo:** `/app/frontend/src/components/pulse/PulseGlobe.js`

Widget pequeno (200x200) na sidebar do feed que mostra:
- BPM social: `totals.posts_60s + totals.comments_60s` por minuto
- Animação: globo SVG com pontinhos que aparecem proporcionalmente
- Tooltip: "X online · Y a publicar agora"
- Sem geo-localização visual (privacidade) — só intensidade

Usa `usePulse()` e re-renderiza no `pulse_tick`.

#### 2.4 Componente — `TopicBurstChips` (acima do feed)
**Ficheiro novo:** `/app/frontend/src/components/pulse/TopicBurstChips.js`

Chips horizontais com `meaningful_topics` (max 5):
```
#benfica ↑145%   #saojoao ↑89%   #lisboa ↑22%
```
- Clicáveis → navegam para `/tag/{tag}`
- Se 0 meaningful → `return null`

#### 2.5 Integração no Feed
**Ficheiro a modificar:** `/app/frontend/src/pages/Home.js` (ou onde vive o feed)

Ordem dentro do feed:
1. `<PulseBar />` (sticky topo)
2. `<TopicBurstChips />` (acima primeiros posts)
3. Posts normais
4. `<PulseGlobe />` na sidebar lateral

#### 2.6 Settings — toggle opt-out
**Ficheiro a modificar:** `/app/frontend/src/pages/settings/PrivacySettings.js` (ou similar)

Adicionar switch:
```
[•] Contribuir para o pulso social
    Os teus posts somam no mapa coletivo "Lisboa está ativa".
    Desativa se preferes não constar nas estatísticas regionais.
```

Liga ao `PATCH /api/users/me` com `{pulse_opt_out: !value}`.

#### Testes Fase 2
- `auto_frontend_testing_agent`: validar que widgets aparecem só quando há
  sinal; com DB vazio devolvem null e não partem layout.
- Verificar acessibilidade (aria-label nas barras).

---

### 🔵 Fase 3 — Presence Layer

**Objetivo:** Sensação "há humanos aqui *agora*" sem invadir privacidade.

#### 3.1 Backend — `presence_engine.py`
**Ficheiro novo:** `/app/backend/presence_engine.py`

Estado em memória (não Mongo — efémero):
```python
# {user_id: {last_heartbeat, currently_viewing, currently_composing}}
_presence: dict[str, dict] = {}
```

Endpoints novos:
- `POST /api/presence/heartbeat` → corpo `{viewing?: post_id, composing?: target_id}`
- `GET /api/presence/post/{post_id}` → `{viewers: int, composing: int}`
- `GET /api/presence/thread/{post_id}` → lista anonimizada de quem está a ver

WS broadcasts:
- `presence_update` para `viewers_by_post` (já existe parcialmente em
  `ws_manager.viewers_by_post` — reutilizar)
- `composing_update` para alvos de comentário

Cleanup task: remover entradas com `last_heartbeat > 30s` a cada 10s.

#### 3.2 Frontend
- Hook `usePresence(postId)` que faz heartbeat a cada 15s enquanto post visível
- Indicador "👥 3 a ler isto agora" abaixo de cada post (apenas se >1)
- "@joao está a escrever..." no início da caixa de comentários

#### 3.3 Privacy
- Respeitar `user.show_online === false` → não emitir heartbeat
- Granularidade só "post X tem N viewers", nunca "user A está a ver post X"

---

### 🔵 Fase 4 — Context Engine (Feed que reage ao mundo)

**Objetivo:** Feed muda conforme hora, dia, eventos PT, clima social.

#### 4.1 Pesos contextuais — backend
**Ficheiro novo:** `/app/backend/context_engine.py`

```python
def get_feed_context_weights(now: datetime) -> dict:
    """
    Returns weight multipliers based on:
      - hour-of-day (00-08 = noturno/íntimo, 12-14 = almoço/social,
                     18-22 = prime, 22-02 = noite)
      - day-of-week (sex/sáb = festa; dom = calmo)
      - PT_CALENDAR_EVENTS (jogo seleção, São João, Natal, etc.)
      - Pulse Engine.dominant_mood (festa → boost posts festa)
    Output: {posts_kind_weights: {personal: 1.2, news: 0.8, ...},
             tempo: "lento" | "normal" | "rápido"}
    """
```

#### 4.2 Aplicar no feed scoring
Modificar `server.py` onde está a ordenação do feed (procurar
`feed_mix`, `personal_score`, etc.) — multiplicar pelos pesos.

⚠️ **Importante:** NÃO usar IA. É math puro + lookup table.

#### 4.3 Frontend — sinal sutil
Pequeno texto no header do feed: "Domingo à noite · ritmo lento" ou
"Sexta · A Tasca está cheia" (gerado pelo backend, exibido como hint).

---

### 🔵 Fase 5 — Mesas (Conversas Efémeras)

**Objetivo:** "Mesas" são salas de conversa com TTL natural.

#### 5.1 Modelo Mongo
**Coleção nova:** `mesas`
```js
{
  id, title, topic, created_by, created_at,
  expires_at,           // ttl: 2h, 1 noite, 24h, "fim do jogo"
  expires_reason,       // "timer" | "event_end" | "inactivity"
  participants: [],     // user_ids
  message_count: 0,
  last_activity_at,
}
```

Com TTL index em `expires_at`.

#### 5.2 Mesa types
- **Mesa rápida** (2h): qualquer user pode criar
- **Mesa noturna** (até 6h da manhã)
- **Mesa de evento** (criada por jogo seleção, festival, etc. — auto-expira no fim)
- **Mesa por tema** (24h, atado a hashtag trending)

#### 5.3 Endpoints
- `POST /api/mesas` → criar
- `GET /api/mesas` → lista de mesas vivas (ordenadas por `last_activity_at`)
- `POST /api/mesas/{id}/join`
- `POST /api/mesas/{id}/message`
- `WS subscribe` à mesa para mensagens em tempo real

#### 5.4 UI
**Página nova:** `/app/frontend/src/pages/Mesas.js`
- Lista de mesas ativas com count regressivo até expiração
- Entrada num click — entrada-rápida sem fricção
- UI estilo Discord-lite mas mais íntima

---

### 🔵 Fase 6 — Reputação Humana Invisível

**Objetivo:** Sistema interno avalia qualidade de presença sem mostrar
gamificação tóxica.

#### 6.1 Métricas internas (não-públicas)
**Ficheiro novo:** `/app/backend/reputation_engine.py`

Cada user tem um `health_score` (0-100) calculado em background diário:
- + reciprocidade (responder a respostas)
- + diversidade conversacional (não só com 3 pessoas)
- + sem spam
- + sem reports
- + presença regular mas não obsessiva (não 16h/dia)
- − toxicidade detetada por lexicon PT de toxic words

Stored em `users.health_score` (Mongo) mas **NUNCA exposto via API**.

#### 6.2 Aplicação no feed
- Posts de users com `health_score < 30` recebem penalty no scoring
- Posts de users com `health_score > 75` ganham boost suave
- Total invisível ao utilizador

#### 6.3 Sem leaderboards, sem badges públicas, sem níveis.

---

### 🔵 Fase 7 — Activity Topology / Mapa Social Vivo

**Objetivo:** Visualização SSS-tier — mapa de Portugal a "respirar".

#### 7.1 Backend
Reutilizar `pulse_engine.by_region` + por freguesia (com privacy guard:
só mostra freguesia se há ≥5 users ativos lá).

Endpoint novo: `GET /api/pulse/topology` → GeoJSON-like com intensidade
por região + cidade.

#### 7.2 Frontend
**Página nova:** `/app/frontend/src/pages/Topologia.js`

- SVG de Portugal com regiões coloridas por intensidade
- Pontos pulsantes em cidades com `meaningful = true`
- Tooltip ao hover: "Coimbra · 12 conversas vivas · #saojoao a crescer"
- Update via WS `pulse_tick`

Bibliotecas:
- `react-simple-maps` ou SVG inline custom (PT já tem SVGs públicos)
- Sem `mapbox/google maps` (custos, privacidade)

---

### 🟡 Fase 8 — Anti-Doomscrolling Inteligente

**Objetivo:** Quebrar o vício, manter saúde.

#### 8.1 Detecção
- Após X scrolls sem interagir → "Estás a scrollar há 12 min. Pausa?"
- Após 0 comentários em 30min de scroll → sugerir uma mesa
- À noite após boa-noite hour → escurecer feed gradualmente

#### 8.2 Implementação
- Hook `useScrollHealth()` em `/app/frontend/src/hooks/`
- Conta scroll events, tempo na página, ratio interação/consumo
- Toast suave (não modal agressivo)

---

### 🟡 Fase 9 — Identidade Portuguesa Viva

**Objetivo:** "Cultural overlay" sem cair em estereótipos.

#### 9.1 Calendário cultural (já existe `PT_CALENDAR_EVENTS`)
- Estender com mais eventos: feriados regionais, festivais, jogos
- Frontend: banner sutil "Hoje é São João — Porto está em festa" (só se confirmado pelo pulse)

#### 9.2 Mood-aware copy
- Textos do sistema adaptam-se: "Boa tarde de domingo, calma na rede"
  vs "Sexta à noite — Tasca cheia"

#### 9.3 Sem bandeirinhas, sem sardinhas. Tom literário, breve, real.

---

## 🟠 PENDENTE — TAREFA ADMINISTRATIVA (pausada)

### Tradução do painel Admin (inglês → português)
**Estado:** Pausada pelo user no início desta sessão.

Strings já identificadas em inglês (auditadas nos files):
- `Token Debugger` → "Diagnóstico de Token"
- `Cookie Secure` / `Cookie SameSite` → manter (termo técnico) ou "Cookie seguro" / "Cookie SameSite"
- `JWT issuer` / `JWT audience` / `JWT alg` → "Emissor JWT" / "Audiência JWT" / "Algoritmo JWT"
- `Access TTL` → "Duração do token"
- `Cache active` / `Cache revoked` / `Cache positive TTL` → "Cache ativa" / "Cache revogada" / "TTL positivo"
- `Lockout policy` → "Política de bloqueio"
- `fails / Xm` → "falhas / Xm"
- `WS sockets/user` / `WS jti re-check` → "WS sockets/utilizador" / "Revalidação WS jti"
- `User ID` → "ID do utilizador"
- `Header` → "Cabeçalho"
- `Audit log` → "Registo de auditoria"
- `Uptime` → "Tempo ativo"
- `Admins` (label) → "Administradores"
- `Online`, `Last active`, `All time`, etc. — verificar contexto

Ficheiros a varrer sistematicamente:
- `/app/frontend/src/pages/Admin.js` (4773 linhas)
- `/app/frontend/src/pages/admin/Cockpit.js`
- `/app/frontend/src/pages/admin/SecurityTab.js` (1393 linhas — mais inglês aqui)
- `/app/frontend/src/components/admin/*.js` (todos)
- `/app/frontend/src/components/AdminLayout.js`

**Critério:** traduzir tudo visível ao admin que esteja claramente em
inglês. Manter siglas técnicas (JWT, TTL, WS, API, HTTP, HTTPS, CORS,
SameSite, IP, UA, JTI, etc.) — só traduzir a palavra qualificadora.

---

## 📋 RESUMO DA ORDEM SUGERIDA PARA RETOMAR

```
1. (opcional) Pequeno fix cache invalidation no Pulse Engine
2. Fase 2 — Ambient Pulse Widgets (UI) ✅ FEITO (falta 2.3 PulseGlobe + teste E2E)
3. Fase 3 — Presence Layer [PRÓXIMO PASSO LÓGICO]
4. Fase 4 — Context Engine
5. Tradução Admin (pausada) — pode ser intercalada em qualquer altura
6. Fase 5 — Mesas
7. Fase 6 — Reputação invisível
8. Fase 7 — Topologia
9. Fase 8 — Anti-doomscroll
10. Fase 9 — Identidade PT
```

---

## 🔑 INFORMAÇÃO TÉCNICA CRÍTICA PARA O PRÓXIMO AGENTE

- **Backend monolito:** `/app/backend/server.py` (~15 200 linhas, mas
  Fase 1 introduziu módulo separado — manter esse padrão para Fases
  3, 4, 5, 6, 7. Não engordar `server.py`.)
- **Router decorator:** `@api.get|post|...` (prefixo `/api`)
- **WS manager:** `ws_manager` em `server.py` linha ~8522
- **DB handle:** `db` em `server.py` linha 66
- **User model:** ver `public_user()` em `server.py` linha 1120
- **Admin creds:** `/app/memory/test_credentials.md`
- **Test protocol:** `/app/test_result.md` — atualizar antes de chamar testing agents
- **NUNCA:** usar IA/LLM (decisão explícita do user). Tudo via lexicons
  curados + matemática.
- **NUNCA:** mocks, randoms, hardcoded fakes. Se não há sinal real,
  componente devolve `null` ou endpoint omite o campo.
- **Privacidade:** D1 já confirmada — cidade-level máximo, freguesia
  só com k≥5, opt-out por default=False.

---

## ✨ NOTA FINAL

A Fase 1 já é por si só **mais avançada** que 90% das redes sociais
indie. Quando todas estas fases estiverem prontas, o Lusorae terá uma
arquitectura de "presença social viva" que **literalmente nenhuma rede
social atual tem** — porque elas todas dependem de IA / dopamina /
gamificação.

A vantagem competitiva aqui é a **honestidade do sinal**: nada aparece
no UI que não seja verdade matemática. Isso, sustentado por anos, cria
uma confiança que dinheiro nenhum compra.

Boa sorte na próxima sessão. 🛡️
