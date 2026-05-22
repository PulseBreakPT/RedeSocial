# 🔍 Auditoria Profunda — Painel Administrativo Lusorae

**Data:** 2025-11
**Escopo:** Todo o painel `/admin` (16 separadores, 17 componentes, hooks e layout)
**Linhas auditadas:** ~9.6k (frontend) + ~14.9k (backend, secção admin)
**Critério:** identificar tudo o que é mocked / fake / hardcoded / placeholder / decorativo / sem backend / lógica simulada / realtime falso / KPI sem fundamento

---

## 🧭 Resumo executivo

**Boa notícia:** o painel administrativo do Lusorae está, em ~80%, ligado a endpoints reais. A maior parte dos separadores (`security`, `system`, `users`, `posts`, `comments`, `stories`, `reports`, `antispam`, `broadcast`, `sessions`, `settings`, `audit`) consome backend real, sem dados inventados.

**Má notícia:** Existem **5 problemas críticos** e **~12 problemas médios** que comprometem a confiança operacional do painel. Os mais graves são:
1. Um **time-range selector global** no topbar que **não afeta os KPIs** (label muda, dados não).
2. Um **badge de ambiente "prod"** *hardcoded* no sidebar, ignorando o `app_env` que o backend já expõe.
3. Um indicador **"Estável" sempre verde** no DeployMini, mesmo com erros no sistema (tautológico no backend).
4. Um **sparkline de WebSocket** que mostra dados de "users_online" (mistura semântica).
5. Um **sino de notificações** que abre o Audit Log e mostra contagem de reports (semântica enganadora).

Detalhes nas secções seguintes.

---

## 🔴 CRÍTICAS — bloquear lançamento operacional

### C-1 · Time range global no topbar **não chega a 90% do Cockpit**

| Campo | Valor |
|---|---|
| Ficheiro | `frontend/src/components/AdminLayout.js` (linhas 55, 167-168) + `pages/admin/Cockpit.js` (linhas 28, 115-116) |
| Componente | `AdminTopbar` `timeRange` selector ("15m", "1h", "24h", "7d") |
| Problema | O selector altera **apenas** `/admin/cockpit/timeline?window=…`. Todos os outros endpoints (`/realtime`, `/queues`, `/top_posts`, `/trending`, `/activity`, `/geo`, `/services`, `/system_mini`, `/security_mini`) **ignoram** o parâmetro. |
| Porque é fake | A label muda dinamicamente para `"vs 24h anteriores"` e `"/ 24h"` (Cockpit.js linhas 115-116), mas o backend `admin_cockpit_realtime` está **hardcoded para janelas de 15 minutos** (server.py linhas 14181-14260: `w15_start = now - timedelta(minutes=15)`, sparklines de 15 buckets de 60s). Mesmo seleccionando 24h, o utilizador vê deltas de 15 min com a label "vs 24h anteriores". |
| Impacto | KPIs **mentem** sobre o período que representam. O admin acredita estar a olhar para 24h, mas vê 15 min. Decisões operacionais erradas. |
| Backend em falta | `admin_cockpit_realtime`, `admin_cockpit_top_posts`, `admin_cockpit_trending`, `admin_cockpit_activity`, `admin_cockpit_queues` precisam aceitar e respeitar `window=`. |
| Risco técnico | Alto — confiança comprometida nos números. |
| Como implementar | (1) Adicionar `window: str = "15m"` a todos os endpoints cockpit; (2) função utilitária `_resolve_window(window) -> (delta, bucket_seconds, num_buckets)`; (3) propagar via query string em `useAdminLive.js` e `Cockpit.js`; (4) garantir que sparklines têm n buckets adequados ao window. |
| Prioridade | **CRÍTICA** |

---

### C-2 · Badge de ambiente "PROD" hardcoded no sidebar

| Campo | Valor |
|---|---|
| Ficheiro | `frontend/src/components/AdminLayout.js` (linhas 151, 196) + `components/admin/AdminSidebar.js` (linhas 21, 60-61) |
| Componente | `AdminSidebar` brand badge |
| Problema | `appEnv={(typeof window !== "undefined" && window.__APP_ENV__) || "prod"}` — `window.__APP_ENV__` **não é definido em lado nenhum** do código (verificado via grep recursivo). Cai sempre para `"prod"`. |
| Porque é fake | Hardcode disfarçado de fallback. O backend **já expõe** `app_env` e `is_production` em `/admin/cockpit/deploy` (server.py linhas 14869-14870), mas o frontend não consome esse valor. |
| Impacto | Ambientes de staging/dev mostram badge "prod" enganador. Risco de operadores executarem acções destrutivas pensando que estão em staging. |
| Backend em falta | Já existe (`/admin/cockpit/deploy`). |
| Risco técnico | Alto (segurança operacional). |
| Como implementar | Em `AdminLayout`, fazer fetch a `/admin/cockpit/deploy` (uma vez no mount) e usar `data.app_env`. |
| Prioridade | **CRÍTICA** |

---

### C-3 · DeployMini — "Status: Estável" sempre verde (tautológico)

| Campo | Valor |
|---|---|
| Ficheiro | `frontend/src/components/admin/DeployMini.js` (linhas 26-29) + `backend/server.py` (linha 14871) |
| Componente | `DeployMini` |
| Problema | A frase `"Status: Estável"` é literal no JSX. Backend retorna `"stable": True` **sempre** com o comentário literal: `# if we got here, the process is up`. |
| Porque é fake | É tautologia — se o endpoint responde, então é estável. Não há monitorização real (taxa de erro, p99 latência, serviços a falhar, deploys recentes com regressão, alertas). |
| Impacto | O cockpit **nunca** sinaliza problemas. Mesmo com DB indisponível, todos os serviços em degraded, ou erros 5xx em massa, continua "Estável". |
| Backend em falta | Lógica real de `stable` derivada de: `services` status, p99 latência > threshold, error rate nos últimos N min, restarts recentes, conexões DB falhadas. |
| Risco técnico | Alto — sinal de saúde inútil. |
| Como implementar | (1) Calcular `stable = all(s.status == "ok" for s in services) AND error_rate_5m < 1% AND p99_latency < 800ms`; (2) frontend ler `data.stable` e colorir dot accordingly; (3) adicionar tooltip explicando os 3-4 sinais que entram no cálculo. |
| Prioridade | **CRÍTICA** |

---

### C-4 · WebSocketMini — sparkline mostra dados de outro KPI

| Campo | Valor |
|---|---|
| Ficheiro | `frontend/src/components/admin/WebSocketMini.js` (linha 27) + `pages/admin/Cockpit.js` |
| Componente | `WebSocketMini` |
| Problema | `<Sparkline data={kpis?.users_online?.sparkline} … />` — o sparkline mostrado num widget rotulado "WebSocket" é **literalmente** o sparkline de "users_online" (novas sessões por minuto). |
| Porque é fake | Reuso de série temporal de outro KPI por falta de série dedicada a WS. Visualmente, o utilizador interpreta como "atividade WS ao longo do tempo". |
| Impacto | Métrica enganadora. Não reflete conexões WS reais nem mensagens enviadas. |
| Backend em falta | Endpoint dedicado: `/admin/cockpit/websockets/timeline` que retorne número de WS sockets ativos por minuto (já temos `wsmgr.active_count()` ou similar). Alternativa: mensagens broadcast por minuto. |
| Risco técnico | Médio (métrica sem fundamento). |
| Como implementar | (1) Backend expõe sparkline real de WS; (2) frontend lê desse novo campo; (3) caso não exista série histórica, remover o sparkline e mostrar apenas o valor instantâneo. |
| Prioridade | **CRÍTICA** |

---

### C-5 · Topbar "Bell" → Audit + badge = open reports (semântica enganadora)

| Campo | Valor |
|---|---|
| Ficheiro | `frontend/src/components/AdminLayout.js` (linhas 108-119, 156-171) |
| Componente | `AdminTopbar` notificações |
| Problema | O ícone `Bell` (universalmente "notificações") tem `onClick={() => setTab("audit")}` e `notifBadge={openReports}`. Não existe sistema de notificações real para o admin. |
| Porque é fake | A UI promete um centro de notificações; clicar leva ao **log de auditoria** completo (lista bruta de eventos passados). O número no badge é o **total de reports abertos**, não notificações por ler. |
| Impacto | Operadores clicam à espera de inbox priorizada de eventos urgentes recentes; recebem dump cronológico de tudo. |
| Backend em falta | Endpoint `/admin/notifications` que agregue: novos reports urgentes (`queue=urgent`) das últimas N horas, ataques security (auth_events de tipos críticos), serviços degradados, novos appeals, broadcasts pendentes. Endpoint `/admin/notifications/mark-read` para gerir lidos/não-lidos. |
| Risco técnico | Médio-alto (UX enganadora num painel operacional). |
| Como implementar | (1) Criar coleção `admin_notifications` ou query agregada on-demand; (2) panel/drawer dedicado em vez de navegação para Audit; (3) preservar o link "Audit" no sidebar para histórico completo. |
| Prioridade | **CRÍTICA** |

---

## 🟡 MÉDIAS — perdem qualidade mas não bloqueiam

### M-1 · CommandPalette — "Procurar utilizador" só navega
- **Ficheiro:** `components/admin/CommandPalette.js` linhas 5-10
- **Problema:** O atalho `"Procurar utilizador"` apenas chama `onNavigate("users")`. Não há pesquisa real no palette.
- **Porque é fake:** O nome promete pesquisa em qualquer entidade; a paleta só pesquisa entre as labels de navegação.
- **Impacto:** UX desperdiçada — `⌘K` poderia ser ferramenta operacional poderosa.
- **Implementação:** Adicionar pesquisa async ao endpoint `/admin/users?search=…` com debounce ≥250ms, mostrando até 6 resultados clicáveis (`onClick` abre o `UserDrawer`). Estender para posts/reports/sessões (`/admin/search?q=…&types=users,posts,reports`).
- **Prioridade:** Média

### M-2 · ModerationQueues — botões não filtram, apenas navegam
- **Ficheiro:** `pages/admin/Cockpit.js` linhas 118, 427-430 + `components/admin/ModerationQueues.js`
- **Problema:** Clicar em "Urgente", "Spam", "Apelos" no quadrante de filas leva para `/admin?tab=reports` sem nenhum filtro pré-aplicado. O componente ReportsTab oferece filtros, mas o utilizador tem de redescobri-los.
- **Implementação:** `onJump={(queueKey) => { setTab("reports"); setQueueFilter(queueKey); }}` via query string `?tab=reports&queue=urgent`. ReportsTab já recebe `queue=` via URL — basta propagar.
- **Prioridade:** Média

### M-3 · UrgentReports — clicar não abre o report específico
- **Ficheiro:** `pages/admin/Cockpit.js` linha 377
- **Problema:** `onClickItem={() => onNavigate("reports")}` — perde o `id` do report clicado. O utilizador tem de procurar o mesmo report no separador Reports.
- **Implementação:** Navegar com `?tab=reports&id={r.id}` e abrir o drawer/modal correspondente.
- **Prioridade:** Média

### M-4 · CommunitiesTab — subtítulo promete funcionalidades não implementadas
- **Ficheiro:** `pages/Admin.js` linhas ~1888-1950
- **Problema:** Subtítulo declara `"Gestão de visibilidade, regras, moderadores e remoção"` mas a UI só expõe **Eliminar**. Não há toggle de visibilidade, edição de regras, nem gestão de moderadores.
- **Implementação:** (1) Backend: endpoints `PATCH /admin/communities/{id}` (visibility, rules), `POST /admin/communities/{id}/moderators`, `DELETE /admin/communities/{id}/moderators/{user_id}`; (2) Frontend: linhas com toggle/edit + drawer de moderadores. Alternativa rápida: corrigir o subtítulo para refletir só "Listagem e remoção".
- **Prioridade:** Média

### M-5 · EventsTab — mesmo padrão do M-4
- **Ficheiro:** `pages/Admin.js` linhas ~1950-2070
- **Problema:** Subtítulo: `"Edição, remoção e destaque manual"` — só **Eliminar** implementado.
- **Implementação:** `PATCH /admin/events/{id}` (cover, title, time, featured), botão "Destacar" toggle. Ou corrigir subtítulo.
- **Prioridade:** Média

### M-6 · DeployMini — version/commit retornam string vazia
- **Ficheiro:** `backend/server.py` linha 14865-14866
- **Problema:** Lê `os.environ.get("APP_VERSION") or ""` e `GIT_COMMIT/RENDER_GIT_COMMIT or ""`. Em dev/staging, ambas são `""` — UI mostra "—" (honesto mas inútil).
- **Implementação:** Fallback para ler `git rev-parse HEAD` na inicialização do processo (cache em variável de módulo) caso env vars não estejam definidas. Considerar gravar em `/app/VERSION` durante o build.
- **Prioridade:** Média-baixa

### M-7 · Topbar — selector de range não tem efeito visível em quase nada quando timeline carrega
- **Ficheiro:** `components/admin/AdminTopbar.js` linhas 131-144
- **Sintoma derivado de C-1:** mesmo após corrigir C-1, é preciso que **todos** os widgets do Cockpit (não apenas o LineChart) reflitam visualmente o range escolhido — ou o estado fica inconsistente.
- **Implementação:** Junto com C-1.
- **Prioridade:** Média

### M-8 · AntiSpamTab usa `window.confirm` / `window.prompt`
- **Ficheiro:** `pages/Admin.js` linhas 4378-4406 (e em ~4-5 outros sítios)
- **Problema:** Diálogos nativos do browser (estilo Web 1.0) em vez do `confirmDialog` que já existe (`components/ConfirmDialog`).
- **Impacto:** UX inconsistente, não testável.
- **Implementação:** Substituir por `confirmDialog({title, message, confirmLabel, destructive})` (já usado em SettingsTab, UsersTab etc.). Para prompts numéricos, criar `promptDialog` (modal com input).
- **Prioridade:** Média

### M-9 · Time range pill aparece em todos os separadores, mesmo onde não faz sentido
- **Ficheiro:** `components/AdminLayout.js` linha 167 — `timeRange` é passado sempre
- **Problema:** Em separadores como Settings, Audit, Users, o time range é irrelevante mas continua visível e ao alterar não acontece nada.
- **Implementação:** Esconder o selector (ou desativar) excepto em `overview`, `system`, `security`, `reports`, `antispam` (i.e. separadores que têm dimensão temporal).
- **Prioridade:** Média

### M-10 · `openReports` polling a 30s + sem ligação ao stream WS
- **Ficheiro:** `components/AdminLayout.js` linhas 108-120
- **Problema:** O badge de reports abertos é atualizado **só por polling 30s**, apesar de o `WebSocketProvider` já existir e o cockpit broadcast emitir `new_report` events. Latência percetível entre criação do report e badge atualizar.
- **Implementação:** Subscrever aos eventos `cockpit_event` (`kind=new_report`, `kind=report_resolved`) e incrementar/decrementar `openReports` em tempo real (com fallback para polling 60s, não 30s).
- **Prioridade:** Média

### M-11 · `notifBadge` é apenas `openReports` (acoplamento C-5)
- Resolvido por C-5 — listado aqui para referência cruzada.

### M-12 · ActivityTicker — clicar em item nem sempre tem deep-link útil
- **Ficheiro:** `pages/admin/Cockpit.js` linhas 356-376
- **Problema:** Itens do tipo `new_content` levam para `/posts` sem id; `admin_action` leva para `/audit` sem filtrar; `auth_event` leva para `/security` sem destacar o evento.
- **Implementação:** Mapeamento `kind → {tab, queryParam}`; deep-link com `?focus={id}`.
- **Prioridade:** Média-baixa

---

## 🟢 BAIXAS — technical debt e qualidade de código

### TD-1 · `Admin.js` é um monolito de 4.789 linhas
- **Problema:** 15 componentes Tab + UserDrawer + Sidebar antiga residual estão todos num único ficheiro.
- **Impacto:** Difícil de manter, code review impossível, hot reload lento, code splitting nulo (todos os tabs carregados ainda que o utilizador só visite um).
- **Como refactor:** Mover cada tab para `pages/admin/{Name}Tab.jsx` (à imagem de `Cockpit.js` e `SecurityTab.js`). Lazy load com `React.lazy()` e `Suspense`. Estimativa: 1-2 dias de trabalho mecânico.
- **Prioridade:** Baixa (não bloqueia funcionalidade)

### TD-2 · Helpers duplicados em vários ficheiros
- `fmtRelative`, `fmtDate`, `fmtNum`, `apiError` redeclarados em `Admin.js`, `SecurityTab.js`, `Cockpit.js`, vários `*Mini.js`.
- **Como refactor:** Centralizar em `lib/format.js` e `lib/api.js`.
- **Prioridade:** Baixa

### TD-3 · Sparkline implementação repetida
- Existe em `components/admin/Sparkline.js` (componente partilhado) E redefinido inline em `SecurityTab.js` (linhas 116-130).
- **Prioridade:** Baixa

### TD-4 · `KIND_META` / `KIND_LABEL` duplicados
- `ActivityTicker.js` tem `KIND_META`; `SecurityTab.js` tem `KIND_LABEL`. Ambos mapeiam tipos de evento, mas com conjuntos parciais e diferentes.
- **Como refactor:** `lib/eventKinds.js` com fonte única.
- **Prioridade:** Baixa

### TD-5 · Estado de WS espalhado entre `WebSocketProvider`, `useAdminLive` e Cockpit
- O `wsState` ("live" | "polling" | "reconnecting" | "offline") vem do `WebSocketProvider` mas a lógica de "estou a receber eventos cockpit" está em `useAdminLive`. Inconsistente — o topbar pode mostrar "Ao vivo" mas o Cockpit estar a fazer polling porque não está a receber `cockpit_event`s.
- **Como refactor:** O hook `useAdminLive` deve expor o seu próprio `subState` e o topbar usar o estado mais conservador dos dois.
- **Prioridade:** Baixa-média

### TD-6 · ServiceStatus — semáforo binário, sem profundidade
- **Ficheiro:** `components/admin/ServiceStatus.js`
- O componente só mostra "ok / degraded / down" mas o backend tem `latency_ms`, `last_check_at`, etc. Sub-utilização.
- **Prioridade:** Baixa

### TD-7 · Classificação heurística de filas de moderação
- `_classify_report_queue` (server.py 14100-14111) decide a fila com base em substrings no campo `reason` livre. "appeal" só aparece se o utilizador escrever "apelo" ou "appeal" no motivo — frágil.
- **Como refactor:** Adicionar campo `queue` explícito ao schema de reports, definido na origem (forms diferentes para report vs appeal). Manter heurística como fallback retroativo.
- **Prioridade:** Baixa

### TD-8 · Reports/Comments/Stories/Hashtags Tabs — todos têm padrões idênticos não reutilizados
- Lista paginada + busca + filtros + ações em massa. Cada um reimplementa.
- **Como refactor:** Componente `<AdminTable rows={...} columns={...} actions={...} pagination={...} />`.
- **Prioridade:** Baixa

### TD-9 · `setReloadAt(Date.now())` espalhado como anti-padrão de refresh
- Usado em 12+ sítios em vez de `react-query`/SWR ou um hook `useAutoRefresh`.
- **Prioridade:** Baixa

---

## 📊 Mapa de cobertura por separador

| Separador | Estado backend | Componentes fake | Acção sugerida |
|---|---|---|---|
| `overview` (Cockpit) | Quase 100% real | C-1, C-3, C-4, M-2, M-3, M-12 | **Refactor crítico** |
| `security` | 100% real | — | OK ✅ |
| `system` | 100% real (admite "filas não usadas") | — | OK ✅ |
| `users` | 100% real | M-8 (window.confirm) | Pequenas melhorias |
| `posts` | 100% real | — | OK ✅ |
| `comments` | 100% real | — | OK ✅ |
| `stories` | 100% real | — | OK ✅ |
| `hashtags` | 100% real | — | OK ✅ |
| `reports` | 100% real | — | OK ✅ |
| `antispam` | 100% real | M-8 | Pequenas melhorias |
| `broadcast` | 100% real | — | OK ✅ |
| `communities` | Parcial | M-4 (gestão prometida) | Implementar ou ajustar texto |
| `events` | Parcial | M-5 (gestão prometida) | Implementar ou ajustar texto |
| `sessions` | 100% real | — | OK ✅ |
| `settings` | 100% real | — | OK ✅ |
| `audit` | 100% real | — | OK ✅ |
| **Layout (sidebar/topbar)** | Misto | **C-2, C-5, M-9, M-10, M-11** | **Refactor crítico** |

---

## 🎯 Plano de execução proposto (fases)

### Fase 1 — Corrigir mentiras visuais (4-6h)
1. **C-2:** Eliminar hardcode `"prod"` → consumir `/admin/cockpit/deploy.app_env`.
2. **C-3:** Substituir `stable: True` por cálculo real no backend (services ok + error rate + p99).
3. **C-4:** Remover sparkline em WebSocketMini OU criar `/admin/cockpit/websockets/timeline`.
4. **C-5:** Renomear ícone bell → "Reports" com flag icon OU construir endpoint real `/admin/notifications`.
5. **M-9:** Esconder time-range selector em separadores irrelevantes.

### Fase 2 — Tornar o time-range real (1-2 dias)
6. **C-1:** Propagar `window` a todos os endpoints cockpit. Refactor `admin_cockpit_realtime` para aceitar window dinâmico. Atualizar `useAdminLive` para passar `?window=`. Garantir que sparklines têm número de buckets adequado.
7. **M-7:** Validar visualmente que todos os widgets respondem ao selector.

### Fase 3 — Deep links e UX coerente (1 dia)
8. **M-2, M-3, M-12:** Implementar deep-linking via query strings em todas as transições de tab.
9. **M-1:** Pesquisa real no Command Palette (utilizadores + posts + reports).
10. **M-10:** Subscrever eventos WS para `openReports` em vez de polling 30s.
11. **M-8:** Substituir `window.confirm/prompt` por `confirmDialog/promptDialog`.

### Fase 4 — Gestão prometida (1-2 dias)
12. **M-4, M-5:** Implementar funcionalidades CRUD prometidas em Communities/Events OU ajustar texto.
13. **M-6:** Wiring de versão/commit real.

### Fase 5 — Refactor de qualidade (2-3 dias, opcional)
14. **TD-1:** Quebrar `Admin.js` em ficheiros por separador com lazy loading.
15. **TD-2 a TD-9:** Centralizar helpers, componentes, padrões.

---

## ✅ O que está **transparentemente bem**

Por equidade técnica, importa registar os elementos genuinamente sólidos:

- **`SecurityTab.js`** — documentação explícita "nothing is mocked"; consome 7 endpoints reais.
- **`SystemTab`** — quando uma fila externa não existe, **diz claramente** "este sistema não usa filas externas" (linha 917) em vez de fingir dados.
- **`ActivityTicker`** — mostra "Eventos reais aparecem aqui em tempo real" quando vazio, sem placeholders.
- **`SettingsTab`** — registry/values/defaults/overrides/history real, com endpoints PATCH/RESET reais.
- **`useAdminLive`** — WS bus real com fallback polling honesto.
- **`/api/admin/anti-spam/*`** — overview, activity feed e suspicious users completamente reais.
- **`SystemMini` / `SecurityMini`** — usam `Number.isFinite(x) ? … : "—"` em todos os campos (zero invenção).

---

## 🛑 Aguardando aprovação

Por favor confirme:

a) **Aprovar todas as fases (1→5)** e avançar pela ordem proposta.
b) **Aprovar só Fase 1 + 2** (corrigir mentiras visuais + time-range real) — depois reavaliamos.
c) **Aprovar fases específicas** (indicar quais).
d) **Discutir/ajustar** algum dos pontos antes de avançar.

Não vou tocar em código até receber aprovação. 🛡️
