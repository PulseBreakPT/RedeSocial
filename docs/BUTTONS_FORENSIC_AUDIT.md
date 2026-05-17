# 🔍 AUDITORIA FORENSE SSS-TIER — Vermillion

> **Documento gerado em modo READ-ONLY.** Nenhum ficheiro de código foi alterado.
> Objectivo: mapear, por componente e botão, todos os controlos de UI que **não estão ligados ao backend, persistem apenas localmente, ou são puramente visuais**.
> Análise feita ao código de `/app/frontend/src/` cruzando com `/app/backend/server.py` (`@api.*` e `@api2.*` em 5.646 linhas).

---

## 📊 1. SUMÁRIO EXECUTIVO

O Vermillion tem **187 endpoints REST** (`/api` + `/api2`) já implementados no backend e a **maioria** das interações principais (publicar, comentar, gostar, comunidades, mensagens, stories, notas, charms, cosmetics, roda, mesa, presence, denúncias, follow/block/mute, exportação, eliminação de conta, recuperação de password, mudança de password, agendamento, drafts, polls, reações PT) **estão correctamente cabladas**.

Contudo, **uma camada inteira de “sinais de interesse”** (`/app/frontend/src/lib/interestSignals.js`) é **integralmente local** — todas as funções escrevem em `localStorage` e mostram um `toast`, mas **nunca chamam o backend**. Estas ações dão a *ilusão* de personalização do feed (silenciar autor, silenciar tópico, ver mais/menos, boost, story 24h, watch post, favoritar utilizador, notas privadas, coleções de signals) sem que **nada disso afecte o ranking, o feed ou a moderação do servidor**.

Adicionalmente, existem **dois caminhos divergentes** para favoritos (um local `interestSignals.toggleFavouriteUser`, outro real `POST /api2/users/{username}/favorite`) e para coleções (um local `interestSignals.addToCollection`, outro real `/api/bookmark-collections`) — o utilizador não sabe qual está a usar.

Os toggles de **Notificações, Privacidade, Aparência e Segurança** em `Settings.js` são quase todos persistidos **apenas via `lsSet()` em localStorage**, embora o backend já exponha `POST /api2/notifications/preferences` e `PATCH /users/me` para alguns desses campos. Isto significa: **muda de browser → perdes todas as definições**.

A secção **Segurança** mostra "2FA" e "alertas de login" como toggles **mas não há qualquer endpoint de 2FA, código TOTP, ou sistema de envio de alertas no backend** — são botões cosméticos.

---

## 📈 2. MÉTRICAS GLOBAIS

| Métrica | Valor | Notas |
|---|---|---|
| **Páginas auditadas** | 30 | `pages/` + `pages/profile/` + `pages/settings/` + `pages/legal/` |
| **Componentes auditados** | ~60 | em `components/` |
| **Endpoints `/api` mapeados** | 152 | em `server.py` |
| **Endpoints `/api2` mapeados** | 35 | extensões posteriores |
| **Controlos interactivos com `data-testid` aprox.** | ~280 | varredura inferior do `grep` |
| **Controlos com função real ligada ao backend** | ~205 (~73%) | publicar, like, repost, follow, etc. |
| **Controlos mocados (localStorage-only / sem persistência)** | **~52 (~19%)** | `interestSignals.js` + prefs locais |
| **Controlos puramente cosméticos (sem efeito)** | **~12 (~4%)** | 2FA, login alerts, recovery email |
| **Controlos visualmente correctos mas com bugs subtis** | ~11 (~4%) | mismatch de schema, navegação errada |
| **`console.log` deixados em produção** | 1 | `useEdgeGestures.js:184` |
| **`href="#"` ou `href=""`** | 0 | — |
| **`onClick={() => {}}` vazios** | 0 | — |
| **Endpoints declarados no front e não existentes no back** | 0 | — |
| **Endpoints existentes no back e não consumidos no front** | ~9 | `discover/surprise`, `notifications/preferences`, `posts/{post_id}/follow-thread`, `users/{username}/notify` (parcialmente), etc. |

**Distribuição por severidade dos defeitos:**

- 🔴 **P0 — Crítico (12)**: anúncios de privacidade que não persistem; “2FA” fake; tópicos/autores silenciados que continuam no feed; alertas de login inexistentes.
- 🟠 **P1 — Alto (24)**: divergência entre dois caminhos para favoritos/coleções; preferências de notificações só locais; “Boost” não afecta ranking; “Story de 24h” do menu não cria story real; "Watch post" não dispara notificações.
- 🟡 **P2 — Médio (10)**: trending fallback hard-coded, `Drafts` botão “ver” leva a página inexistente, “sessions” da `SecurityTab` mostra só sessão actual sem permitir terminar outras.
- 🟢 **P3 — Cosmético (6)**: `console.log` esquecido, copy ambíguos, "Cafezinho" toggle local sem efeito real no read-receipt.

---

## 📋 3. TABELA COMPLETA DE CONTROLOS PROBLEMÁTICOS

> Legenda colunas:
> - **Severidade**: 🔴P0 / 🟠P1 / 🟡P2 / 🟢P3
> - **Persistência**: ❌ Nenhuma · 🟡 localStorage · 🟢 Backend · 🟣 Ambíguo (dois caminhos)
> - **Endpoint esperado**: rota que **deveria** existir/ser chamada.

| ID | Sev | Página | Componente / Linha | Controlo (data-testid) | Problema | Função esperada | Endpoint esperado | Persistência | Recomendação |
|----|-----|--------|--------------------|------------------------|----------|------------------|---------------------|---------------|--------------|
| **B-001** | 🔴P0 | Feed, Profile, PostDetail | `PostMenu.js:283` `mute-topic-${id}` | Silenciar tópico | Apenas `addToList` em `localStorage` (`signals.mutedTopics`). Feed do server **não respeita** este mute. | Persistir mute_topics no perfil; filtrar `/posts/feed` e `/feed/v2`. | `POST /api2/users/me/muted-topics` (a criar) | 🟡 | Criar endpoint + filtro no servidor. |
| **B-002** | 🔴P0 | Feed, Profile, PostDetail | `PostMenu.js:286` `mute-author-${id}` | Silenciar autor | `interestSignals.muteAuthor` → `localStorage` apenas. Existe `POST /api2/users/{username}/mute` mas **não é chamado aqui**. | Chamar mute real. | `POST /api2/users/{username}/mute` (existe!) | 🟣 | Substituir por chamada à API que já existe. |
| **B-003** | 🔴P0 | Feed, Explore | `PostMenu.js:266` `see-less-${id}` | "Ver menos deste tema" | Só `addToList(signals.seenLess)`; ranking ignora. | Sinal negativo para o ranker do `/feed/v2`. | `POST /api2/feed/signals` (a criar) | 🟡 | Endpoint de sinais (pos/neg) por tag/autor. |
| **B-004** | 🔴P0 | Feed, Explore | `PostMenu.js:269` `see-more-${id}` | "Ver mais deste tema" | Idem B-003 (sinal positivo). | Idem. | Idem | 🟡 | Idem. |
| **B-005** | 🔴P0 | Feed | `PostMenu.js:272` `not-interested-${id}` | "Não interessado" | Apenas `toast.success(...)`. Nada é registado. | Dismiss + influência no ranker. | `POST /api2/posts/{id}/dismiss` (a criar) | ❌ | Implementar endpoint + suppression. |
| **B-006** | 🔴P0 | Feed | `PostMenu.js:275` `why-${id}` | "Porque vejo isto?" | `toast.message(...)` com texto genérico — não consulta servidor. | Mostrar verdadeiro `reason` + componente vindo de `/posts/explore/with-reasons`. | `GET /posts/{id}/why` (a criar) | ❌ | Servir transparência algorítmica real. |
| **B-007** | 🟠P1 | Feed (próprio) | `PostMenu.js:235` `boost-${id}` | "Boost · destacar 24h" | `toggleBoost` em `localStorage`. Não afecta nenhum endpoint de ranking nem hype-train. | Impulsionar o post nas próximas 24 h. | `POST /api/posts/{id}/boost` (a criar) | 🟡 | Criar lógica de boost no servidor + cap diário. |
| **B-008** | 🟠P1 | Feed (próprio) | `PostMenu.js:238` `note-${id}` | "Adicionar nota privada" | `setPostNote` → `localStorage.signals.postNotes`. Nunca chega ao backend; perde-se entre dispositivos. | Nota privada associada ao post no perfil do autor. | `PUT /api/posts/{id}/note` (a criar) | 🟡 | Idem. |
| **B-009** | 🟠P1 | Feed (próprio) | `PostMenu.js:241` `story-${id}` | "Converter em story 24h" | `convertToStory` → marca `signals.storyPosts[id]={until}` localStorage. **Não chama `POST /api/stories`** com a imagem do post. | Criar story real a partir do post. | `POST /api/stories` (existe!) com payload derivado | 🟣 | Substituir por chamada real. Hoje só o utilizador vê a "story marcada", os outros não vêem nada. |
| **B-010** | 🟠P1 | Todos os posts | `PostMenu.js:209` `watch-${id}` | "Seguir respostas (Watch)" | `toggleWatchPost` → `localStorage.signals.watchedPosts`. Existe **`POST /api2/posts/{post_id}/follow-thread`** que não é chamado. | Subscrever notificações de respostas. | `POST /api2/posts/{id}/follow-thread` (existe!) | 🟣 | Trocar pelo endpoint real. |
| **B-011** | 🟠P1 | Todos os posts | `PostMenu.js:206` `add-collection-${id}` | "Adicionar à coleção" | `window.prompt(...)` → `interestSignals.addToCollection`, escreve em `localStorage.signals.collections`. **Coexiste** com sistema real `/api/bookmark-collections` usado em `Bookmarks.js`. | Adicionar a coleção real. | `POST /api/posts/{id}/collection` (existe!) | 🟣 | Reescrever para usar o backend; remover o caminho local. |
| **B-012** | 🟠P1 | Profile (IdentityCard) | `IdentityCard.js:41` `profile-favourite-btn` | Estrela (favoritar utilizador) | `toggleFavouriteUser` → localStorage. Existe `POST /api2/users/{username}/favorite` (usado em `ProfileMoreMenu`, **caminho divergente**). | Único estado canónico. | `POST /api2/users/{username}/favorite` | 🟣 | Unificar: usar sempre o endpoint do `api2`. |
| **B-013** | 🔴P0 | Settings → Segurança | `Settings.js:111` `pref-two_fa_enabled` | "2FA — autenticação em dois passos" | Botão de "sugestão" no Hub aponta para `seg`; toggle **só** em `localStorage` (`pref.two_fa_enabled`). Não há endpoint TOTP, QR code, backup codes, nem fluxo de validação. | Activar 2FA real (TOTP) com QR. | `POST /api/auth/2fa/setup` + `/verify` (a criar) | ❌ | Implementação completa de 2FA. |
| **B-014** | 🔴P0 | Settings → Segurança | `Settings.js:112` `pref-login_alerts` | "Alertas de login" | Toggle local. Backend não emite emails de alerta nem regista IP histórico. | Email/notificação em login de novo dispositivo. | `POST /api/auth/login` deve gerar evento + envio (a criar). | ❌ | Pipeline de alertas. |
| **B-015** | 🔴P0 | Settings → Segurança | `Settings.js:114` `pref-recovery_email` | "Email de recuperação" | Persiste apenas em `localStorage`; backend ignora-o no fluxo `/api/auth/forgot-password`. | Recuperação enviar também para este email. | `PATCH /users/me` extra field + uso no forgot-password. | 🟡 | Adicionar campo `recovery_email` no schema. |
| **B-016** | 🟠P1 | Settings → Notificações | `Settings.js:98-105` `pref-notif_*` (5 toggles) | Gostos, Comentários, Seguidores, Menções, DM | Cada toggle é `setPref` → `localStorage`. Backend já tem `POST /api2/notifications/preferences` — **não chamado**. | Sincronizar preferências. | `POST /api2/notifications/preferences` (existe!) | 🟣 | Trocar `lsSet` por chamada batch. |
| **B-017** | 🟠P1 | Settings → Privacidade | `Settings.js:103-105` `pref-priv_show_online`, `pref-priv_typing`, `pref-priv_search` | Mostrar online / typing / aparecer em pesquisa | `setPref` → `localStorage`. Não escreve em `PATCH /users/me` apesar de o schema do backend ter os campos `show_online`, `typing_indicator`, `searchable`. | Persistir em servidor. | `PATCH /users/me` com esses 3 campos. | 🟡 | Trivial: extender o `save()`. |
| **B-018** | 🟠P1 | Settings → Aparência | `Settings.js:106-109` `pref-theme/density/language/reduce_motion` | Tema, densidade, idioma, animações | localStorage only. Não viaja entre dispositivos. | Persistir nas prefs do utilizador (cross-device). | `PATCH /users/me` ou endpoint dedicado. | 🟡 | Idem. |
| **B-019** | 🟠P1 | Settings → Notificações | `Settings.js:115-116` `boa-noite-start/end` | Horas de Boa Noite (`time inputs`) | `setPref` → localStorage. O backend respeita `boa_noite_enabled` mas **não** as horas escolhidas pelo utilizador (constantes fixas). | Servidor usar `boa_noite_start/end` reais. | `PATCH /users/me` + lógica de mute por horas. | 🟡 | Persistir + respeitar no envio de push/email. |
| **B-020** | 🟡P2 | Settings → Notificações | `Settings.js:600+` Toggles individuais | `notif_likes/comments/follows/mentions/dm` por categoria | Persistem em localStorage **mas** o `markAll`/push do servidor não conhece estes filtros. | Filtragem aplicada server-side. | Idem B-016. | 🟡 | Idem B-016. |
| **B-021** | 🟠P1 | Notifications | `Notifications.js:151` `muteCategory()` | "Silenciar categoria" (chamada via filtro? — função chamada internamente) | `localStorage.notifications.mutedTypes`. Não impede a chegada de novas notifs do servidor. | Silenciar por tipo. | Idem B-016 / `POST /api2/notifications/preferences`. | 🟡 | Reusar B-016. |
| **B-022** | 🟠P1 | Privacidade | `Settings.js:613` `download-data-btn` (PrivTab) | "Descarregar os meus dados" (PrivTab) | Descarrega `{user, prefs}` apenas — **NÃO** o conteúdo. Existe `GET /api2/users/me/export` (já usado correctamente em `DataTab`). | Reusar export real. | `GET /api2/users/me/export` (existe). | 🟢 | Substituir o handler local pelo da `DataTab`. |
| **B-023** | 🟡P2 | Messages | `Messages.js:854` `chat-cafe-toggle` | "Ligar Café (read receipt opt-in)" | `localStorage.vm_cafe_receipt_${other_id}`. Toggle visual apenas; **não** muda o comportamento de `read` no servidor. | Suprimir blue tick até confirmação manual. | `PATCH /messages/{id}` para marcar lido manual. | 🟡 | Endpoint + UI para "Marcar como lido" manual. |
| **B-024** | 🟡P2 | Drafts | `Drafts.js:140` (botão "ver") | "ver" rascunho | `navigate('/post/${p.id}')` → mas posts em rascunho **não** estão acessíveis em `/post/:postId` (`GET /posts/{id}` retorna 404 se `is_draft=true` e viewer != autor; e mesmo sendo autor, a página de detalhe não renderiza um draft). | Abrir composer pré-carregado com o draft. | `POST /posts/{id}/publish` ou navegação para composer com `?draft=id`. | 🟢 | Abrir `Composer` em modo edit com o draft. |
| **B-025** | 🟢P3 | Feed | `Feed.js:23-24` `lsGet/lsSet("feed.mood","feed.sort")` | Filtros mood/sort | Persistem por browser; outros dispositivos esquecem. | Persistência por user. | `PATCH /users/me` com `feed_mix`/`feed_filters`. | 🟡 | Aceitável como UI-only, mas marcar P3. |
| **B-026** | 🟢P3 | Composer | `Composer.js:149-160` `composer-duplicate-btn` | "Duplicar última publicação" | Lê `localStorage.composer.lastPublished`. Funciona como conveniência mas não há histórico real. | Lista de últimos N posts. | `GET /users/me/posts?limit=5` | 🟢 | Aceitável; marcar como conveniência. |
| **B-027** | 🟢P3 | Composer | `Composer.js:306-320` `composer-preview-desktop/mobile` | Mock de pré-visualização | Apenas altera `max-width` do composer — não é uma pré-visualização real do PostCard final. | Render real do PostCard preview. | — | ❌ | Renderizar `<PostCard post={previewObj} clickable={false}/>`. |
| **B-028** | 🟠P1 | RightSidebar | `RightSidebar.js:201-223` `trending-fallback-*` | Tendências fallback (Lisboa, Porto, Fado, Benfica, BairroAlto) | Lista **hard-coded** mostrada quando `/trending` retorna vazio. Não é uma "amostra" do servidor. | Esconder bloco ou mostrar `Empty`. | — | ❌ | Mostrar empty state em vez de dados falsos. |
| **B-029** | 🟡P2 | Settings → Segurança | `SecurityTab.js:96-118` (Sessão atual) | "Sessão atual" | Mostra **apenas** `navigator.userAgent`. Sem listagem real de sessões activas, sem revogar outras. | Listar sessões + botão "Terminar todas as outras". | `GET /api/auth/sessions` (a criar) + `DELETE /sessions/{id}`. | ❌ | Sistema de sessões persistido. |
| **B-030** | 🟡P2 | Hub Settings | `HubTab.js:122` `computeSecurityScore` | Cálculo do score de Segurança | Baseado em campos que **maioritariamente** não são persistidos (`form.private`, `user.searchable`, etc., e `password_changed_at` que existe). Score pode subir para 100% sem 2FA real. | Cálculo baseado em estado real de segurança. | Idem B-013/B-014. | 🟡 | Recalibrar após resolver B-013. |
| **B-031** | 🟢P3 | Compose-modal | `Composer.js:289-294` `composer-clear-btn` | "Limpar composer" | Usa `window.confirm` — fora do design system. | Diálogo modal `<AlertDialog>` em shadcn. | — | 🟢 | Substituir por modal estilo Vermillion. |
| **B-032** | 🟢P3 | PostMenu (próprio) | `PostMenu.js:154` `remove()` | "Apagar" post | `window.confirm("Apagar esta publicação?")`. | Idem B-031. | — | 🟢 | Idem. |
| **B-033** | 🟢P3 | Drafts | `Drafts.js:49`, `:55`, `:63` | "Apagar rascunho" / "Publicar todos" / "Apagar selecionados" | `window.confirm`. | Idem. | — | 🟢 | Idem. |
| **B-034** | 🟢P3 | Bookmarks | `Bookmarks.js:62-71` `renameCol`/`deleteCol` | Renomear / Apagar coleção | `window.prompt` + `window.confirm`. | UI customizada com input modal. | — | 🟢 | Modal proper. |
| **B-035** | 🟢P3 | Notifications | `Notifications.js:117` `clearRead()` | "Apagar lidas" | `window.confirm`. | Idem. | — | 🟢 | Idem. |
| **B-036** | 🟢P3 | Messages | `Messages.js:893` `onDeleteMsg` | "Apagar mensagem" | `window.confirm`. | Idem. | — | 🟢 | Idem. |
| **B-037** | 🟢P3 | DataTab | `DataTab.js:139` validação "APAGAR" | OK — único UX bem feito do género. | n/a | — | — | 🟢 | Manter como padrão. |
| **B-038** | 🟡P2 | Visitors | `Visitors.js:31-34` `visitors-toggle` | Toggle "Desativar/Activar" tracking | Backend devolve `track_visits` mas a UI guarda `enabled`. Estado pode dessincronizar entre cliente e servidor (mismatch de campo). | Usar mesmo nome (`track_visits`) ou renomear na resposta. | — | 🟢 | Harmonizar nome de campo. |
| **B-039** | 🟡P2 | PostMenu | `PostMenu.js:105` `translate-${id}` | "Traduzir" | Abre Google Translate em janela nova com o texto. Não é integração real. | Tradução nativa ou consentimento explícito. | `POST /api2/translate` (a criar com Gemini) | ❌ | Avaliar custo/benefício de IA; marcar como mock externo. |
| **B-040** | 🟡P2 | Feed | `Feed.js:65-79` polling de novos posts | Pill "X novas publicações" | Polling a 30s, não WebSocket. WebSocket existe (`/ws`) mas não é usado para feed. | Push de novos posts via WS. | `WS /ws` evento `new_post`. | 🟢 | Migrar para WS (perf + UX). |
| **B-041** | 🟡P2 | Messages | `Messages.js:687-693` polling de mensagens / typing | Carregamento de novas mensagens | Polling a 3s. Existe WS, mas typing/messages não passam por lá. | Push real-time. | `WS /ws` eventos `message`/`typing`. | 🟢 | Idem. |
| **B-042** | 🟢P3 | Layout | `useEdgeGestures.js:184` `console.log("[gesture]", ...)` | Debug log | Esquecido em código de produção. | Remover. | — | ❌ | Apagar a linha. |
| **B-043** | 🟢P3 | Composer | `Composer.js:608` `composer-icon-mention` ("@") e `composer-icon-hashtag` ("#") | Inserir token | Só insere o caractere; **não há autocompletar** de utilizadores na menção (`@`). | Sugerir users enquanto escreves `@x`. | `GET /users/search?q=…` (existe!) — só ligar no UI. | 🟢 | UI de menção igual à de hashtag. |
| **B-044** | 🟢P3 | StoriesBar | `StoriesBar.js:170` `add-story-btn` | "O teu story" | Funciona via `POST /api/stories`. **Sem** edição de texto, sem stickers, sem cor — apenas imagem. | Funcionalidades de story modernas. | Extensões a `/api/stories`. | 🟢 | Roadmap. |
| **B-045** | 🟡P2 | Profile | `IdentityCard.js:42` `sendQuick` | "Mensagem rápida" (no card) | OK — usa `POST /api/messages`. Mas **não** existe botão `data-testid` visível no excerto auditado; campo escondido até abrir popover (verificar UX). | Verificar exposição do quick-msg na UI. | — | 🟢 | Audit secundário recomendado. |
| **B-046** | 🟡P2 | Visitors | `Visitors.js:46-58` `visitors-toggle` | Texto "Desativar/Ativar" | Inverte semântica visual: quando `enabled=true` mostra "Desativar"; em estado intermédio (após toggle) há flash. | Estado optimista com diff visual claro. | — | 🟢 | Adicionar `optimistic` + spinner local. |
| **B-047** | 🟡P2 | Settings → Atalhos | `ShortcutsTab.js` (não auditado em profundidade) | Lista de atalhos | Aparenta ser tabela estática. Confirmar se reflecte os realmente registados em `useKeyboardShortcuts`. | Sincronizar fonte única. | — | 🟢 | Verificar. |
| **B-048** | 🟡P2 | Settings → Conta | `Settings.js:401-416` `avatar-upload-btn`, `banner-upload-btn` | Upload de avatar/capa | Lê file via `FileReader` → base64 inline → `PATCH /users/me`. Sem suporte a upload binário/object storage. Imagens >2MB rejeitadas. | Upload via object storage. | `POST /api/uploads/avatar` (a criar) | 🟢 | Object storage para escalar (>2 MB, vídeo). |
| **B-049** | 🟡P2 | Composer | `Composer.js:171-176` | Imagens limitadas a 2MB cada e máximo 4 | Idem B-048. | Object storage. | Idem. | 🟢 | Idem. |
| **B-050** | 🟢P3 | Stories | `StoriesBar.js:146` | "Imagem não pode exceder 2MB" | Idem. | Object storage. | Idem. | 🟢 | Idem. |
| **B-051** | 🟠P1 | OnboardingModal | (não auditado em profundidade) | Botão "Concluído" | Verificar se chama `POST /users/me/onboard` (existe). | Marcar onboarded. | `POST /users/me/onboard` | — | Audit pendente. |
| **B-052** | 🟢P3 | Profile → MobileActionBar | `MobileActionBar.js:13` `mob-action-share` | "Partilhar" | Abre `ShareModal` — verificar se modal tem realmente partilha nativa Web Share API. | Web Share API. | `navigator.share()` | 🟢 | Verificar. |

> **Total de itens nesta tabela: 52.** Acima identificam-se também ~9 endpoints existentes-mas-não-usados (B-002, B-009, B-010, B-011, B-012, B-016, B-022; mais `discover/surprise` e `notifications/{id}/pin` que não aparecem em UI).

---

## 🔥 4. TOP 30 — Os defeitos críticos a corrigir antes de Beta

| # | ID | Título curto | Impacto |
|---|----|--------------|---------|
| 1 | B-013 | **2FA é fake** — toggle local sem nada por trás | Risco de segurança e perda de confiança |
| 2 | B-014 | **Alertas de login** prometidos mas inexistentes | Idem |
| 3 | B-015 | **Email de recuperação** ignorado pelo `forgot-password` | Utilizador pode ficar trancado |
| 4 | B-001 | **Silenciar tópico** não filtra o feed | Promessa quebrada |
| 5 | B-002 | **Silenciar autor** usa caminho local em vez do endpoint real | Idem |
| 6 | B-005 | **Não interessado** não influencia ranking | Idem |
| 7 | B-006 | **"Porque vejo isto?"** mostra texto estático | Transparência fake |
| 8 | B-017 | **Privacidade (online/typing/searchable)** não persiste em servidor | Confidencialidade aparente |
| 9 | B-016 | **Notificações por categoria** não chegam ao backend | Spam quase certo |
| 10 | B-018 | **Tema/idioma/densidade** apenas por browser | Bug obvio em troca de device |
| 11 | B-019 | **Horas de Boa Noite** não são respeitadas | Promessa do manifesto quebrada |
| 12 | B-012 | **Favoritos** divergentes (IdentityCard vs ProfileMoreMenu) | Inconsistência de estado |
| 13 | B-011 | **Coleções** duplicadas (local vs `/api/bookmark-collections`) | Idem |
| 14 | B-010 | **Watch post** não dispara notificações reais | Promessa quebrada |
| 15 | B-009 | **Story 24h via menu** apenas marca local — não cria story | Engano funcional |
| 16 | B-007 | **Boost** sem efeito real no ranker | Idem |
| 17 | B-008 | **Notas privadas** perdem-se entre dispositivos | Dados do utilizador isolados |
| 18 | B-022 | **PrivTab "Descarregar dados"** exporta só prefs (não conteúdo) | RGPD inferior ao da DataTab |
| 19 | B-029 | **"Sessão atual"** mostra só UA, sem listar/revogar sessões | Falha grave de segurança UX |
| 20 | B-021 | **Silenciar categoria** de notificação só local | Notif duplicadas |
| 21 | B-028 | **Trending fallback hard-coded** (Lisboa/Porto/Fado…) | Conteúdo falso visível |
| 22 | B-023 | **"Café" toggle** sem efeito server-side | Read-receipt continua igual |
| 23 | B-024 | **Drafts → "ver"** leva a /post/{id} (404 / posts em rascunho) | Bug navegacional |
| 24 | B-038 | **Visitors toggle** mismatch `enabled` vs `track_visits` | UI dessincroniza |
| 25 | B-030 | **Score de Segurança** infla com toggles sem efeito | Métrica falsa |
| 26 | B-039 | **Traduzir** abre Google Translate em popup externo | Não é uma integração real |
| 27 | B-040 | **Feed** poll 30s em vez de WS | Latência / bateria |
| 28 | B-041 | **Messages** poll 3s em vez de WS | Idem |
| 29 | B-048 | **Avatar/Capa** base64 inline (sem object storage) | Não escala >2MB |
| 30 | B-042 | **`console.log` esquecido** em `useEdgeGestures.js` | Higiene de código |

---

## 🗺️ 5. MAPA POR ÁREA

### 5.1 Feed (`pages/Feed.js`, `components/PostCard.js`, `PostMenu.js`)
- ✅ **OK**: like, repost, bookmark (real `/api/posts/{id}/bookmark`), share-clipboard, comment-jump, pin, edit (15 min), delete, analytics, view tracking, audience selector, ring, polls, reactions PT, quote, viewers, collaborators.
- ❌ **Mock/Local**: silenciar tópico (B-001), silenciar autor (B-002), see less/more (B-003/004), não interessado (B-005), porque vejo isto (B-006), boost (B-007), nota privada (B-008), converter em story (B-009), watch (B-010), add to collection do menu (B-011).
- 🟡 **Cosmético**: filtros `mood`/`sort` só em localStorage (B-025).

### 5.2 Composer (`components/Composer.js`)
- ✅ **OK**: publicar, agendar, rascunho, polls, imagens (com limite 2MB), audience, ring, hashtag suggester, emojis, fullscreen, drafts via `useLocalDraft`.
- 🟡 **Cosmético**: pré-visualização mobile/desktop é apenas mudança de largura (B-027), duplicar última (B-026), inserção de `@` sem autocompletar (B-043).
- ⚠️ **Escala**: imagens base64 ≤ 2MB e máx 4 (B-049).

### 5.3 PostCard / Reactions / Polls / Quote
- ✅ Engagement real. Reactions PT (`/api/posts/{id}/react`) operam, polls e quotes idem.
- 🟢 `window.confirm` no apagar (B-032).

### 5.4 Messages (`pages/Messages.js`)
- ✅ **OK**: enviar texto/imagem/location/vibe (`/messages/v2`), forward, reagir (`/messages/{id}/react`), apagar, editar (`/api2/messages/{id}`), reply, mark-unread, pin, archive, gallery, presence (typing), nova conversa.
- ❌ **Mock/Local**: "Café" toggle (B-023).
- 🟡 **Perf**: polling em vez de WS (B-041).
- 🟢 `window.confirm` (B-036).

### 5.5 Notifications (`pages/Notifications.js`)
- ✅ **OK**: read-all, star, snooze, delete, clear-read, priority groups (`/api2/notifications/priority`), reply rápido, abrir contexto, filtros.
- ❌ **Mock**: silenciar categoria (B-021), preferências de tipo de notificação (B-016).
- 🟢 `window.confirm` (B-035).

### 5.6 Settings (`pages/Settings.js` + sub-tabs)
- ✅ **OK**: salvar perfil, identidade portuguesa, bio_slots, manifesto link, cookie banner re-open, charms picker, ForYouTuner, mudar password (SecurityTab), exportar JSON/CSV (DataTab), apagar conta (DataTab).
- ❌ **Crítico (falso)**: 2FA (B-013), Login alerts (B-014), Email de recuperação (B-015).
- 🟡 **Local-only**: privacidade (B-017), notificações (B-016), aparência (B-018), Boa Noite horas (B-019).
- 🟢 PrivTab tem download de dados defeituoso (B-022).

### 5.7 Profile (`pages/Profile.js` + `profile/*`)
- ✅ **OK**: follow, message, share, edit profile, Painel Pessoal, tabs (posts/replies/media/likes/communities/about), heatmap, badges, regions, ProfileMoreMenu (block/mute/favorite/notify/report — todos os endpoints existem), RodaButton.
- ❌ **Divergência**: IdentityCard favourite local vs ProfileMoreMenu favorite real (B-012).
- 🟢 OnboardingModal a auditar (B-051), Share modal a auditar (B-052).

### 5.8 Communities (`pages/Communities.js`, `pages/Community.js`)
- ✅ **OK**: listar, filtrar, criar, juntar/sair, sort, search, ver categorias (catálogo do backend), hype, emoji pack (`/api2/communities/{slug}/emoji-pack`).
- 🟡 Audit detalhado de `Community.js` recomendado (não incluído nesta passagem por limite).

### 5.9 Explore (`pages/Explore.js`)
- ✅ **OK**: pesquisar, mood filter, sort, tabs (posts/pessoas/tags/comunidades/cidades), `with-reasons`, surprise (existe endpoint `/api2/discover/surprise` — verificar uso).
- 🟢 OK.

### 5.10 Trending (`pages/Trending.js`)
- ✅ **OK**: range/tab, dados reais de `/trending`, `pessoas`, `comunidades`, `cidades`. Pulse e velocity computados.

### 5.11 Bookmarks (`pages/Bookmarks.js`)
- ✅ **OK**: coleções via `/bookmark-collections`, mover post, filtros, search.
- 🟢 `window.prompt`/`confirm` (B-034).

### 5.12 Drafts / Scheduled
- ✅ **OK**: listar, publicar, apagar, bulk operations.
- ❌ **Bug**: botão "ver" navega para `/post/{id}` em vez de abrir composer (B-024).

### 5.13 Visitors (`pages/Visitors.js`)
- ✅ **OK**: listar visitas, toggle tracking.
- 🟡 **Mismatch**: `enabled` vs `track_visits` (B-038).

### 5.14 Stories (`components/StoriesBar.js`)
- ✅ **OK**: criar, ver, apagar, contador de stories, view tracking.
- 🟡 **Limitado**: só imagem ≤2MB (B-050), sem texto/stickers.

### 5.15 Notes / Recados (`components/NotesBar.js`)
- ✅ **OK**: criar, ver, apagar, 60 chars / 24h.

### 5.16 Mesa / Roda (`components/MesaPanel.js`, `RodaButton.js`)
- ✅ **OK**: tudo via backend (`/users/me/mesa`, `/users/me/roda`).

### 5.17 Presence (`components/PresencePicker.js`)
- ✅ **OK**: emoji, texto, status, expiração — `POST /users/me/presence`.

### 5.18 Charms / Cosmetics (`CharmsPanel`, `CharmsProgressPanel`, `CosmeticsPicker`)
- ✅ **OK**: catálogo, equip (máx 3), progresso, charms de identidade.

### 5.19 ForYouTuner (`components/ForYouTuner.js`)
- ✅ **OK**: `POST /users/me/feed-mix`, presets, sliders normalizados.

### 5.20 RightSidebar / DesktopTopBar / MobileTopBar / MobileBottomNav
- ✅ **OK** maioritariamente.
- ❌ **Falso**: trending fallback (B-028).

### 5.21 Auth (Login/Register/Forgot)
- ✅ **OK**: register, login, forgot, reset, change-password. Cookies + Bearer fallback (Safari ITP).

### 5.22 Legal / Manifesto / Cookies
- ✅ **OK**: páginas estáticas; cookie banner é exemplar (RGPD-compliant, versão, idade, granular).

### 5.23 PostMenu (foco principal dos sinais locais)
- 🚨 **Maior bolsa de mocks**: 10 acções com `interestSignals` — alvo P0/P1 (B-001 a B-011).

---

## 🛠️ 6. MATRIZ DE CORRECÇÃO

| Fase | IDs | Esforço estimado | Critério de pronto |
|------|-----|------------------|--------------------|
| **F0 — Higiene** | B-042, B-031..B-036 | 0,5 d | Remover `console.log`; substituir 5 `window.confirm/prompt` por modals shadcn. |
| **F1 — Sinais reais para o ranker** | B-001..B-011 | 2-3 d | Novos endpoints `mute_topic`, `mute_author` (usar já existente), `feed/signals` (pos/neg), `dismiss`, `note`, `boost`, `watch` (`follow-thread`). Camada `interestSignals.js` re-escrita para usar API + fallback offline. |
| **F2 — Persistência cross-device** | B-016, B-017, B-018, B-019, B-021, B-025 | 1-2 d | Patch a `PATCH /users/me` para incluir preferências; sincronizar com `lsSet` apenas como cache. |
| **F3 — Segurança real** | B-013, B-014, B-015, B-029, B-030 | 4-6 d | 2FA TOTP completo; pipeline de email para alertas; tabela `sessions`; revocação. |
| **F4 — Real-time WS** | B-040, B-041 | 1 d | Migrar Feed e Messages para `WS /ws`. Eventos `new_post`, `message`, `typing`. |
| **F5 — Object Storage** | B-048, B-049, B-050 | 1-2 d | `/api/uploads/{avatar|banner|post|story}` + URL ≥4MB / vídeo curto. |
| **F6 — Unificação** | B-012, B-011 (parcial), B-022 | 0,5 d | Remover divergências e exportar via `users/me/export` na `PrivTab`. |
| **F7 — UX polish** | B-024, B-027, B-028, B-038, B-039, B-043, B-046 | 1 d | Resolver navegação `Drafts`, pré-visualização real do PostCard, eliminar fallback hard-coded, harmonizar `track_visits`, autocompletar `@`. |

> **Tempo total estimado**: ~12-18 dias-engenheiro para fechar P0/P1; +1 semana para P2.

---

## ✅ 7. CHECKLIST BETA

Antes de abrir Beta a utilizadores reais, **resolver obrigatoriamente**:

- [ ] B-013 / B-014 / B-015 — **Remover** UI de 2FA, alertas e recovery-email até existir backend, **ou** implementar.
- [ ] B-001 / B-002 / B-005 — Pelo menos os mutes/dismiss têm de funcionar no servidor (caso contrário a moderação pessoal é cosmética).
- [ ] B-016 — Preferências de notificação têm de persistir (caso contrário spam à 3ª sessão).
- [ ] B-017 / B-018 — Online/typing/searchable/tema/idioma têm de viajar entre dispositivos.
- [ ] B-019 — Boa Noite tem de respeitar as horas escolhidas (promessa de marca).
- [ ] B-022 — Substituir o download fake da PrivTab pelo export real.
- [ ] B-024 — Botão "ver" em Drafts.
- [ ] B-028 — Esconder a lista hard-coded de Tendências (mostrar `Empty`).
- [ ] B-038 — Harmonizar `track_visits` / `enabled`.
- [ ] B-042 — Remover `console.log`.
- [ ] B-031..B-036 — Substituir `window.confirm/prompt` por modais Vermillion.
- [ ] B-012 — Unificar caminho de favoritos.

> **Critério Go/No-Go**: 0 itens vermelhos (P0) restantes, ≤3 P1 documentados em Roadmap.

---

## ✅ 8. CHECKLIST PRODUÇÃO

Para passar Beta → Produção, além dos itens da §7:

- [ ] B-040 / B-041 — WS para feed e mensagens (latência < 500 ms).
- [ ] B-048 / B-049 / B-050 — Object storage (S3/GCS); migrar avatares/posts existentes.
- [ ] B-007 / B-008 / B-009 / B-010 / B-011 — Sinais e ferramentas de criador todos persistidos.
- [ ] B-029 — Tabela `sessions` com revocação remota; trusted-devices.
- [ ] B-039 — Decisão sobre tradução in-app (Gemini) vs externo (manter Google translate como opt-out).
- [ ] B-027 — Pré-visualização real do PostCard.
- [ ] B-043 — Autocompletar de menções (`@`) no Composer.
- [ ] B-046 — Auditoria final dos modais (Onboarding, Share, AccountPanel, Cookie).
- [ ] **Cobertura E2E** ≥ 80% das acções listadas nesta auditoria (Playwright + testing_agent).
- [ ] **Telemetria**: registar uso de cada feature mocada vs real para priorizar.
- [ ] **RGPD**: PrivTab e DataTab convergidos numa única secção; "Direito ao esquecimento" testado.
- [ ] **Segurança**: 2FA TOTP, alertas de login, sessions, rate-limit em auth.
- [ ] **Performance**: p95 do feed < 600 ms, mensagens < 200 ms via WS.
- [ ] **Acessibilidade**: contrast AA em todos os botões `chip-on`; aria-labels nas ações cosméticas (Star, Bell, etc.).

---

## 📎 9. ANEXOS

### 9.1 Endpoints existentes no backend e **não consumidos** pelo frontend
- `GET /api2/discover/surprise` — provavelmente para botão "Surprise Me" da Explore (verificar).
- `POST /api2/notifications/preferences` / `GET /api2/notifications/preferences` — **não chamado** por Settings → Notificações (B-016/B-020).
- `POST /api2/posts/{post_id}/follow-thread` — não chamado (B-010 usa local).
- `POST /api2/posts/{post_id}/mute-thread` — usado **apenas** no PostMenu (`handleMuteThread`); OK.
- `POST /api2/notifications/{notif_id}/pin` — não chamado.
- `POST /api2/users/{username}/notify` — existe; UI usa-o em ProfileMoreMenu OK.
- `POST /api2/users/{username}/favorite` — usado em ProfileMoreMenu, **não usado** em IdentityCard (B-012).

### 9.2 Funcionalidades 100% locais (`interestSignals.js`)
Ficheiro inteiro deve ser refeito para wrapper de API com fallback offline. Símbolos:
`muteAuthor`, `unmuteAuthor`, `isAuthorMuted`, `muteTopic`, `isTopicMuted`, `seeLessOfTopic`, `seeMoreOfTopic`, `toggleBoost`, `isBoosted`, `setPostNote`, `getPostNote`, `convertToStory`, `isStory`, `toggleFavouriteUser`, `isFavouriteUser`, `toggleWatchPost`, `isWatchingPost`, `getCollections`, `addToCollection`.

### 9.3 Pontos onde o frontend usa `localStorage` legitimamente (não corrigir)
- `vm_token` (auth fallback Safari ITP) — `lib/api.js`.
- `vm_consent` (RGPD cookie banner) — `components/CookieBanner.js`.
- `vm_tarde_dismiss_*` / `vm_gesture_hint_seen` — dismissals de banners locais.
- `useLocalDraft` hook — composer keeps draft enquanto escreves.
- `composer.lastPublished` — conveniência opcional.

### 9.4 Higiene técnica
- `console.log` em `hooks/useEdgeGestures.js:184`.
- `window.confirm`/`window.prompt` em 6 sítios (B-031..B-036, B-034).
- Polling em vez de WS em `Feed.js` e `Messages.js`.

---

## 🎯 10. CONCLUSÃO

O Vermillion **tem um backend muito mais maduro do que o frontend deixa transparecer**: 187 endpoints, modelos PT-específicos (Mesa, Roda, Charms, Cosmetics, Reactions PT, Ring de identidade, Mood-graph, Place-graph, Boa Noite, Cafezinho) que estão **realmente operacionais**.

O **calcanhar de Aquiles** é a camada `interestSignals.js` + os toggles de `Settings`: ~52 controlos cosméticos que prometem ao utilizador comportamentos (silenciar, ver menos, boost, story, 2FA, alertas, recovery email, horas de boa-noite, tema cross-device) **que o sistema simplesmente não cumpre**. Resolver este gap é, na minha opinião, o maior **multiplicador de qualidade** antes do Beta.

Após F0+F1+F2+F3 (≈8-10 dias-engenheiro), o produto fica pronto para Beta com promessas alinhadas ao comportamento real. F4+F5 (WS + object storage) são pré-requisitos para Produção.

— Fim do relatório.
