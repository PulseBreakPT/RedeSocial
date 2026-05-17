# Vermillion — SSS TIER Product Fit Audit (Rede Social)

> **Tipo de auditoria:** Read-only · sem alterações de código
> **Âmbito:** Frontend (`/app/frontend/src/`), Backend (`/app/backend/server.py`), Docs (`/app/docs/FEATURES.md`), PRD (`/app/memory/PRD.md`)
> **Critério:** Cada feature, endpoint, componente, modelo, rota e ecrã foi avaliado contra o ADN de uma **rede social moderna PT-PT** ("A internet portuguesa moderna" — slow social, identity-first, conversa > engagement). Tudo o que cheirar a **SaaS dashboard, ERP, CRM, gestor de tarefas, painel enterprise, banca ou Apple Health** é destacado.
> **Constraint absoluto:** Este documento não toca em código. É **apenas** auditoria e recomendação.
> **Tags possíveis:** `REMOVER` · `ESCONDER` · `MOVER PARA ADMIN` · `RENOMEAR` · `REPOSICIONAR` · `CONVERTER EM SOCIAL` · `MANTER`
> **Última actualização:** Fev 2026

---

## 0. Glossário das classificações

| Tag | Significado | Risco se não actuar |
|---|---|---|
| **REMOVER** | A funcionalidade deve sair: ou é órfã, ou é puramente enterprise/SaaS, ou duplica algo já social. | Polui surface area, mantém endpoints zombie, distrai onboarding. |
| **ESCONDER** | Existe legitimamente mas não devia aparecer ao utilizador comum no fluxo principal. | Sobrecarga visual, "demasiada chrome", parece B2B. |
| **MOVER PARA ADMIN** | Operacional ou compliance, mas hoje está exposto a end-users. | Postura enterprise indevida; risco RGPD/UX. |
| **RENOMEAR** | A nomenclatura é SaaS / técnica em vez de social PT-PT. | Quebra a identidade emocional ("saudade, tasca, festa..."). |
| **REPOSICIONAR** | A peça está bem mas no sítio errado (e.g., dentro do Feed em vez do Profile). | Tensão entre "rede social" e "painel de controlo". |
| **CONVERTER EM SOCIAL** | A peça existe mas comporta-se como SaaS. Pode ser re-imaginada em modo conversa/identidade. | Mantém o número-frio em vez do calor humano. |
| **MANTER** | Encaixa perfeitamente. | — |

---

## 1. Resumo executivo

O Vermillion é, na sua **base**, uma rede social PT-PT muito sólida: Feed/Para Ti, Comentários Reddit-style, DMs, Reações PT, Comunidades, Eventos, Stories, Perfis ricos, Trending por cidade/mood. Isso é o coração — fica `MANTER`.

No entanto, sobre essa base estão **camadas inteiras** que cheiram a outro produto:

1. **Camada Dashboard SaaS** — `Settings > Hub` com *health rings*, *score de segurança*, *score de completude*, "Acessos rápidos", "Sugestões pendentes" (estilo Asana/Notion/HubSpot).
2. **Camada Enterprise Security** — `Settings > Segurança` com 2FA (TOTP+QR+backup codes), gestão de sessões com IP, recovery email, alertas de login (estilo Google Workspace/banca).
3. **Camada RGPD-as-product** — `Settings > Dados` com exportação JSON ("ideal para developers"), CSV, limpar cache, eliminação de conta com confirmação por escrita "APAGAR" (estilo GitHub).
4. **Camada Analytics gameficada** — *Fingerprint*, *Rhythm Clock 24h*, *Heatmap GitHub-style*, *Affinity score 0-100%*, *Reputação "Nível X · Y rep"*, *Trophies*, *Charms*, *Cosmetics*, *Badges* (estilo Strava/LinkedIn/Steam).
5. **Camada CMS/Creator** — `PostAnalyticsModal`, `EditHistoryModal`, `Boost`, viewers list por post, "Edit until 15 min", **Recados 24h ≠ Stories** redundante (estilo Twitter Blue / Twitch / Substack).
6. **Camada API versioning legado** — coexistem `/api` e `/api2`, `feed/v2`, `messages/v2`, `posts/_explore_legacy`, `notifications/preferences` vs `notifications/preferences/full`. Resíduo de iteração — não é feature, é dívida arquitectural exposta.
7. **Camada "Painel Pessoal" como overlay** — `PainelPessoalDrawer` em side panel funciona quase como uma *settings inside settings* + analytics + gestão. Reproduz padrão SaaS.
8. **Camada sobreposta de banners PT** — em simultâneo: `CalendarPTBanner` + `SinoBairroBanner` + `ATardeBanner` + `Boa Noite Banner` + `Cafezinho Banner` + `ActivityTicker` + `Daily Digest`. Identidade PT excelente em conceito, mas a quantidade vira **dashboard**, não rede.
9. **Camada gamificação tripla** — `Charms (12)` + `Badges narrativos (12)` + `Cosmetics (14)` + `Trophies (?)` + `Reputation/Level` + `Streak`. Sobreposição de 5 sistemas paralelos de recompensa que disputam atenção.
10. **Camada voyeurismo** — `Visitors` (quem te viu o perfil), `viewers` por post (`GET /posts/{id}/viewers`), `presence` granular (4 estados + emoji + texto + expiração), `last_seen` público — junto, lê-se como LinkedIn/Snapchat/WhatsApp Premium.

**Conclusão de alto nível:** o esqueleto social é A+. A pele que o cobre tem **demasiada chrome**. As recomendações abaixo apontam para **remover / esconder / converter** ~60-70 itens, mantendo intacto o coração social.

### Métricas brutas detectadas

| Métrica | Valor | Comentário |
|---|---|---|
| Endpoints declarados | **167** (linhas `@api.*`/`@api2.*` em `server.py`) | FEATURES.md diz "130+". 37 endpoints adicionais não documentados. |
| Páginas frontend | 30+ | Razoável para o âmbito. |
| Componentes frontend | 60+ (`/app/frontend/src/components/`) | Algumas sobreposições (e.g., `ActivityTicker` + `ActivityTickerLive`). |
| Sub-páginas de Profile | 16 (`/app/frontend/src/pages/profile/`) | Excessivo. Profile virou app dentro de app. |
| Tabs em `Settings` | **11** (`hub, conta, ident, notif, priv, seg, apar, foryou, dados, atalhos, legal`) | Settings com 11 tabs é território Notion/Workspace, não rede social. |
| Coleções MongoDB | 16 | Aceitável. |
| Sistemas paralelos de gamificação | **5** (Badges, Charms, Cosmetics, Trophies, Reputation/Level) | Em rede social moderna, 1-2 chega. |
| Banners PT no Feed | **6 simultâneos** | Esmaga conteúdo principal. |

---

## 2. Mapa de alinhamento social

Avaliação por área. Escala simples:
🟢 **Encaixa** · 🟡 **Encaixa parcialmente** · 🔴 **Não encaixa (ou encaixa mal)**

| Área | Estado | Notas |
|---|---|---|
| 🟢 Autenticação core (registo, login, logout, esqueci-me) | Encaixa | Padrão social, sem mancha. |
| 🟢 Feed (Seguindo / Para ti, mood/sort) | Encaixa | Coração da app. |
| 🟢 Composer (texto, imagens, sondagens, audience ring, quote) | Encaixa | Twitter-like, sólido. |
| 🟢 Comentários Reddit-style (nested, collapse, pin) | Encaixa | Excelente. |
| 🟢 Reações PT 6× (saudade/comove/tasca/bombou/cafe/orgulho) | Encaixa | Identidade emocional única. |
| 🟢 DMs (1:1, typing, react, pin/archive) | Encaixa | Falta encrypt mas core OK. |
| 🟢 Notificações (likes, follows, mentions, comments, collab) | Encaixa | Padrão social. |
| 🟡 Notificações: **star, snooze, pin, follow-thread, mute-thread, preferences/full** | Parcialmente | Vira Gmail. |
| 🟢 Perfil (header, follow, follows modal, mutual, region banner) | Encaixa | Core. |
| 🟡 Perfil — **Fingerprint / Rhythm Clock / Heatmap / Affinity score 0-100%** | Parcialmente | Beleza analítica, mas SaaS gameficado por defeito. |
| 🔴 Perfil — **ProfileSummaryCards "Em números" + "Identidade" + "Atalhos da conta"** sempre visíveis | Não encaixa | Lê-se como dashboard, não como perfil. |
| 🟢 Comunidades (cidades, música, tasca, ...) | Encaixa | Reddit-like, social. |
| 🟡 Comunidades — **Reactions custom (até 8), Emoji Pack (10), Hype Train Twitch-style** | Parcialmente | Hype Train é divertido mas exagero "engagement viral" contra o manifesto slow social. |
| 🟢 Eventos | Encaixa | OK. |
| 🟢 Stories 24h | Encaixa | Padrão. |
| 🔴 **Recados 24h ("Notes")** ao lado de Stories | Conflito | Texto efémero + foto efémera = duas camadas concorrentes para a mesma intenção ("ephemeral status"). |
| 🟢 Trending (range, hashtags, cidades, comunidades, pessoas) | Encaixa | Bem feito. |
| 🟢 Explore (5 abas) | Encaixa | OK. |
| 🟡 **For You Tuner** (3 sliders + 4 presets) | Parcialmente | Demasiado *power-user dashboard*. Twitter X / Bluesky têm, mas mais leve. |
| 🟡 Calendário PT + Sino Bairro + Boa Noite + Cafezinho + A Tarde + Daily Digest | Demasiado | A identidade está certa; o **número** de banners simultâneos é dashboard. |
| 🟢 Diáspora (heatmap mundial) | Encaixa | Único e fixe. |
| 🟢 Manifesto | Encaixa | Identidade. |
| 🟡 Charms (12) | Parcialmente | Encaixa em rede social moderna (TikTok-like collectibles); duplica Badges. |
| 🔴 Charms **+** Cosmetics **+** Badges **+** Trophies **+** Reputation/Level **+** Streak (6 sistemas) | Não encaixa | Excesso de "score" — uma rede social adulta não precisa de gamificação tipo Khan Academy. |
| 🟢 Roda (close friends PT) | Encaixa | Naming PT excelente. |
| 🟡 **Mesa** (inner-inner circle, 5 max) | Parcialmente | Sub-Roda dentro da Roda — duplicação subtil. Bonito mas redundante. |
| 🟢 Starter Packs | Encaixa | Bluesky-like, fit. |
| 🔴 **Trophies endpoint** (`/users/{u}/trophies` chamado no `Settings.js`) | Endpoint não existe oficialmente | **Órfão.** É chamado em `HubTab` mas não está no FEATURES.md nem no `server.py` (não consta na lista de 167 endpoints). |
| 🟡 Series / Coleções de posts | Parcialmente | Substack-like; OK mas Profile já está cheio. |
| 🟡 Visitors (quem te viu) | Parcialmente | Padrão LinkedIn. OK com opt-out (já tem) mas convida voyeurismo. |
| 🔴 **Post Viewers** (`GET /posts/{id}/viewers`) | Não encaixa | Stories têm sentido ver views (Instagram). **Posts normais com lista de viewers** é overkill e desconfortável socialmente. |
| 🔴 **Settings > Hub** (health rings, scores, sugestões pendentes) | Não encaixa | Asana/HubSpot dashboard, não rede social. |
| 🔴 **Settings > Dados** (JSON dev, CSV, limpar cache, limpar pesquisas) | Não encaixa | RGPD-as-product. CSV "para developers" é especialmente off-brand. |
| 🔴 **Settings > Segurança** completa (2FA TOTP+QR+backup, sessões+IP, recovery email, login alerts) | Demasiado | Pacote bancário; demasiado pesado para uma rede de bairro. |
| 🟢 Cookies/RGPD banner | Encaixa | Lei exige. |
| 🟢 Legal Center (Termos, Privacy, Cookies, Community Guidelines, Glossário) | Encaixa | Necessário. |
| 🟡 **Painel Pessoal Drawer** (lateral drawer com Streak+Mesa+Charms+Series+Fingerprint+Rhythm+Heatmap+Stats) | Parcialmente | Em conceito é mobile-friendly. Em prática é um *control panel*. |
| 🔴 **PostAnalyticsModal** + `/posts/{id}/analytics` | Não encaixa | Twitter Blue creator analytics. Numa rede slow social com "conversa > engagement" isto contradiz o manifesto. |
| 🔴 **Boost post** (`POST /posts/{id}/boost`) | Não encaixa | Promoção paga camuflada de feature social. |
| 🔴 **EditHistoryModal** (`edit_history[]` exposto) | Parcialmente | Edit OK (15min). Histórico público é Twitter Blue / Wikipedia. |
| 🟡 Cosmetics (frames + stickers) | Parcialmente | Tier grátis, OK. Mas é o 3º sistema de gamificação. |
| 🟡 Hashtag Suggester | Encaixa | Não invasivo. |
| 🟡 Mood Auto-tag | Encaixa | Identidade PT, fica. |
| 🔴 **`/api2/` API duplicada** | Resíduo arquitectural | Não é feature; é dívida exposta. |
| 🔴 **`/posts/_explore_legacy`** | Órfão | Sufixo `_legacy` é red flag. |
| 🔴 **`/feed/v2`** sem `/feed/v1` claro | Conflito | Co-existência sem deprecação assumida. |
| 🔴 **`/messages/v2`** ao lado de `POST /messages` | Conflito | Idem. |
| 🔴 **`/api2/search`** ao lado de `/api/search` | Duplicação | Dois endpoints, mesma operação. |

---

## 3. Tabela Completa de Auditoria

> **Lê:** ID · Classificação · Prioridade (P0=urgente, P1=brevemente, P2=quando der) · Área · Página/Rota · Ficheiro · Componente · Feature · Porquê não encaixa · Recomendação

| ID | Classificação | Prio | Área | Página | Ficheiro | Componente | Feature | Porquê não encaixa | Recomendação |
|---|---|---|---|---|---|---|---|---|---|
| **F-001** | CONVERTER EM SOCIAL | P0 | Definições | `/settings` (tab `hub`) | `pages/settings/HubTab.js` | `HubTab`, `HealthRing` | "Saúde do perfil" + "Segurança" ring 0-100% + "Sugestões pendentes (N)" + Quick Stats | Dashboard de SaaS clássico (HubSpot, Asana). Numa rede social, "saúde de perfil" infantiliza o utilizador. Naming clínico (`Saúde`, `Proteção`). | Substituir por "**Atalhos**" minimalistas (Editar perfil · Ver perfil público · Privacidade) **sem** rings nem scores numéricos. Mover gamificação para fora de Settings. |
| **F-002** | REMOVER | P1 | Definições | `/settings` (tab `hub`) | `pages/settings/HubTab.js:L122` | `computeSecurityScore`, `HealthRing` (vermelho ≥60%) | Score de "Proteção" 0-100% com cor vermelha se <60% | Pressão psicológica enterprise (Gmail/Workspace "improve your security"). | Manter páginas de segurança acessíveis, mas remover ring + score. Substituir por mensagens claras ("activa 2FA se quiseres uma camada extra"). |
| **F-003** | REMOVER | P1 | Definições | `/settings` (tab `hub`) | `pages/settings/HubTab.js:L9-24` | `computeProfileCompletion`, `HealthRing` Perfil | "Completude" 0-100% com 10 buckets (avatar, banner, region, mood, team, slots≥1, slots≥3, ...) | Dark-pattern típico LinkedIn ("Your profile is 73% complete"). O manifesto do Vermillion é **slow social anti-dark-pattern**. Auto-contradição. | Eliminar progress ring. Substituir por chips opcionais ("Adicionar mood do dia · Pôr foto · Dizer onde estás") **sem percentagens**. |
| **F-004** | CONVERTER EM SOCIAL | P1 | Definições | `/settings` (tab `hub`) | `pages/settings/HubTab.js:L259-267` | `QuickStat` cards | 4 cards Quick Stats (Posts, Seguidores, Streak, **Conquistas/troféus**) dentro de Settings | Recriar Profile dentro de Settings; "Conquistas" puxa do endpoint inexistente `/users/{u}/trophies`. | Remover quick stats de Settings (já existem no Profile). |
| **F-005** | REMOVER | P0 | Definições | `/settings` (tab `hub`) | `pages/settings/HubTab.js:L184-192` | `api.get('/users/{u}/trophies')` | Chamada a endpoint que **não existe** no backend (não está nos 167 endpoints, não está em FEATURES.md) | **Endpoint órfão.** Resulta em catch silencioso. Código morto. | Remover a chamada. Decidir: ou implementar trofeus a sério ou eliminar. (Recomendação: eliminar; já há Badges+Charms.) |
| **F-006** | REPOSICIONAR | P1 | Definições | `/settings` (tab `dados`) | `pages/settings/DataTab.js` | `DataTab` | Tab inteira "Dados" (3 secções: Exportar JSON/CSV, Limpeza local, Zona perigosa) | Não é fluxo de utilizador comum de rede social. Encosta-se a SaaS B2B / GitHub. | Manter exportar (RGPD), mas mover **toda a tab** para `Privacidade > Os teus direitos`. Não merece tab própria. |
| **F-007** | REMOVER | P1 | Definições | `/settings` (tab `dados`) | `pages/settings/DataTab.js:L182-187` | `ExportTile` JSON | Tile JSON com subtítulo *"Estrutura completa, ideal para developers"* | Audience errada. Rede social PT-PT não é Hacker News. | Eliminar tile JSON (manter export único "Descarregar os meus dados.zip"). |
| **F-008** | REMOVER | P2 | Definições | `/settings` (tab `dados`) | `pages/settings/DataTab.js:L188-195` | `ExportTile` CSV | Tile CSV ("Excel, Numbers, Google Sheets") | Audience errada — convém para empresas/finanças, não para rede social. | Eliminar tile CSV. |
| **F-009** | REMOVER | P2 | Definições | `/settings` (tab `dados`) | `pages/settings/DataTab.js:L199-235` | `DataRow` Limpar cache / Limpar pesquisas | "Limpar cache local" + "Limpar pesquisas guardadas" | Funções de IT helpdesk. Utilizadores PT em redes sociais não pensam em "cache". | Eliminar secção. Browser limpa cache; o suporte trata do resto. |
| **F-010** | RENOMEAR | P2 | Definições | `/settings` (tab `dados`) | `pages/settings/DataTab.js:L239-242` | `Zona perigosa` heading | Naming "**Zona perigosa**" para apagar conta | Linguagem GitHub/DevOps — não-PT, intimidadora. | Renomear para "**Sair de vez**" ou "**Eliminar conta**". |
| **F-011** | CONVERTER EM SOCIAL | P0 | Definições | `/settings` (tab `seg`) | `pages/settings/SecurityTab.js` | `SecurityTab` inteira | Sessões com IP + 2FA TOTP+QR+backup codes + Recovery email + Login alerts | Pacote completo de gestão Google Workspace / Banca. Excessivo para uma rede social. | Manter (a) `Alterar palavra-passe`, (b) `Sessões activas` simples (sem IP exposto, sem device fingerprint), (c) `2FA opcional` simplificado (sem QR + backup-codes — apenas link email/SMS). Remover Recovery email + Login alerts ou mover para perfil verificado. |
| **F-012** | ESCONDER | P1 | Definições | `/settings` (tab `seg`) | `pages/settings/SecurityTab.js:L380-442` | Sessões + `s.ip` exibido | Sessões mostram **IP exposto** no UI público | Privacy + parece SIEM. Numa rede social não se mostra "192.168.x.x". | Esconder coluna IP no UI (manter no backend para abuse review interna apenas). |
| **F-013** | RENOMEAR | P2 | Definições | `/settings` | `pages/Settings.js:L262-279` | Mobile tabs | Tabs `Hub · Conta · Identidade · Notificações · Privacidade · Segurança · Aparência · Para Ti · Dados · Atalhos · Legal` (**11 tabs**) | 11 tabs é território Workspace. Slack tem 9, Twitter 6. | Consolidar para 5 tabs: **Conta · Identidade · Notificações · Privacidade · Aparência** (Para Ti integra no Feed; Segurança vai para Privacidade; Dados vai para Privacidade; Atalhos vai para ajuda; Hub eliminar; Legal vira link). |
| **F-014** | CONVERTER EM SOCIAL | P1 | Definições | `/settings` (tab `foryou`) | `components/ForYouTuner.js` (referenciado) | `ForYouTuner` (3 sliders + 4 presets) | Algoritmo "para ti" com sliders manipuláveis (Diversidade, Hidden gems, Mood mixing) | Power-user dashboard à Bluesky moderation prefs. Quase nenhum utilizador comum mexerá nisto. Cria sensação de "estou a programar o algoritmo". | Substituir por 3-4 **chips/preset cards** ("Quero ver mais...", "Quero menos..."), sem sliders numéricos. |
| **F-015** | ESCONDER | P2 | Definições | `/settings` (tab `atalhos`) | `pages/settings/ShortcutsTab.js` | `ShortcutsTab` (lista de 25+ atalhos) | Tab inteira só com atalhos de teclado | Naming técnico (`⌘/Ctrl+Enter`, `j/k`) em rede social vira app de produtividade. | Mover para modal acionado por `?` (já existe `KeyboardShortcutsHelp.js`). Não merece tab. |
| **F-016** | MOVER PARA ADMIN | P1 | Auth | (não tem rota UI) | `server.py:L1352-1410` | Sessions API | `GET /api/auth/sessions` + `DELETE /sessions/{id}` + `POST /sessions/revoke-others` | OK ter, mas hoje aparece com chrome enterprise (cards, IP, device, OS). | Reduzir a 1 linha por sessão "Este dispositivo · há 2h" (sem IP/OS); admin tooling fica intacta no backend. |
| **F-017** | ESCONDER | P2 | Auth | (não tem rota UI) | `server.py:L1412-1532` | 2FA endpoints (6 endpoints: setup, verify, disable, regenerate-backup, status) | Pacote TOTP completo (QR data URL, backup codes regen) | Excessivo para rede social. Numa rede social muito poucos utilizadores activam 2FA TOTP. | Manter mas esconder atrás de "Avançado" no Settings. Default deve ser email-OTP, não TOTP. |
| **F-018** | CONVERTER EM SOCIAL | P0 | Perfil | `/u/:username` | `pages/profile/IdentityCard.js:L211-220` | `reputation-badge` | "**Nível {profile.level} · {profile.reputation} rep**" como chip no header do perfil | Rep + Level pertencem a Stack Overflow / RPG. Numa rede social PT-PT, "nível 4 · 230 rep" é absurdo emocionalmente. | Remover chip. Manter cálculo interno se quiseres usar para ranking. Substituir por badge narrativo ("Tasqueiro 2.º ano", "Veterano da rede"). |
| **F-019** | CONVERTER EM SOCIAL | P1 | Perfil | `/u/:username` | `pages/profile/AffinityRibbon.js:L40-99` | `AffinityRibbon` | "Afinidade contigo · **{score}%**" com tier Forte/Próxima/Leve + barra de progresso | Score numérico relacional cheira a app de namoro / LinkedIn People You May Know. | Manter chips qualitativos (`{N} amigos em comum`, `Mesma região`, `Mesmo clube`) **sem** percentagem nem tier. |
| **F-020** | REPOSICIONAR | P2 | Perfil | `/u/:username` | `pages/profile/ProfileSummaryCards.js` | `ProfileSummaryCards` (3 cards) | "Atalhos da conta" + "Identidade" + "**Em números** (Estatísticas)" sempre visíveis abaixo do header | "Em números" com Posts/Reações/Comentários/Streak repete o que já está no header. Vira dashboard. | Manter só card de Identidade. "Em números" mover para drawer (`PainelPessoalDrawer`). "Atalhos da conta" só faz sentido em Settings, não no Profile. |
| **F-021** | REPOSICIONAR | P2 | Perfil | `/u/:username` | `pages/profile/HeatmapCompactCard.js` | `HeatmapCompactCard` | "Pulso dos últimos 28 dias" com 4 KPIs (streak / dias mês / melhor / posts 28d) + mini heatmap GitHub-style | GitHub contributions chart — analytics para programadores. | Mover para drawer self-only. No perfil público mostrar só "publica todas as semanas" / "publica de noite" — qualitativo. |
| **F-022** | REPOSICIONAR | P2 | Perfil | `/u/:username` | `pages/profile/RhythmPanel.js` | `RhythmPanel` + `HourClock` SVG 24h | Relógio 24h com pico + distribuição dos 7 dias da semana | Beautiful, mas é Strava-style biometric. Demasiado clinical. | Mover para drawer self-only. Para visitantes mostrar só "escreve de tarde" — frase qualitativa. |
| **F-023** | REPOSICIONAR | P2 | Perfil | `/u/:username` | `pages/profile/FingerprintGrid.js` | `FingerprintGrid` | "Como {nome} aparece aqui — análise de N posts" com 6 cards (mood top, reacção top dada/recebida, hashtag, tasca, hora pico) | Identidade Fingerprint é elegante mas chama-se "análise". | Renomear "**Cartão de identidade**" ou "**O retrato de {nome}**". Mover para tab `About` (já está, parcialmente). |
| **F-024** | RENOMEAR | P2 | Perfil | `/u/:username` | `pages/profile/CompletionPanel.js` | `CompletionPanel` | "Completa o teu perfil — 5 de 8 passos prontos" | LinkedIn pattern. Frase "passos prontos" é gestor de tarefas. | Tornar opcional + renomear para "**Acaba de te apresentar**" (PT-PT, suave) e mostrar só 1× por sessão (não persistente). |
| **F-025** | REMOVER | P1 | Perfil | `/u/:username` | `pages/profile/HeatmapCompactCard.js:L19-35` | `bestStreak()` + "**melhor**" KPI | Calcular e mostrar "melhor streak" como métrica | "Recordes pessoais" estilo Strava. Pressão de produtividade dentro de rede social. | Eliminar campo "melhor". |
| **F-026** | REMOVER | P2 | Perfil | (não tem UI) | `server.py:L2088` | `GET /posts/{post_id}/viewers` | Lista de viewers por post | Stories têm sentido. **Posts normais** com lista de viewers cria pressão social e voyeurismo. | Eliminar endpoint (manter só agregado `view_count`). |
| **F-027** | REMOVER | P0 | Perfil | (acessível via PostMenu) | `components/PostAnalyticsModal.js` + `server.py:L1664` | `PostAnalyticsModal` + `GET /posts/{id}/analytics` | Creator analytics por post (views, reações, repostagens) | Estilo Twitter Blue / Substack creator economy. Contradiz manifesto "conversa > engagement". | Eliminar modal + endpoint. Se ficar, mostrar só `views` num cantinho discreto. |
| **F-028** | CONVERTER EM SOCIAL | P2 | Posts | (PostMenu) | `components/EditHistoryModal.js` | `EditHistoryModal` + `edit_history[]` exposto | Histórico completo de edições visível ao público | Twitter Blue feature. Não combina com tom íntimo. | Mostrar apenas marca "editado" (sem histórico exposto). Histórico fica em backend para moderação. |
| **F-029** | REMOVER | P1 | Posts | (PostMenu) | `server.py:L6361-6430` | `POST /posts/{id}/boost` + `GET /posts/boosts/status` | "Boost" de posts | Sponsored post mechanic. Em rede sem monetização declarada, é estranho. | Eliminar até decidir modelo Vermillion+. (PRD diz "Vermillion+ Stripe" P3 — quando chegar lá decidir.) |
| **F-030** | ESCONDER | P2 | Notificações | `/notifications` | `server.py:L3586` | `POST /notifications/{nid}/snooze` (com `minutes`) | Snooze de notificações com janela em minutos | Gmail/Slack enterprise pattern. Numa rede social, snooze não é hábito comum. | Esconder do UI. Manter endpoint inactivo. |
| **F-031** | ESCONDER | P2 | Notificações | `/notifications` | `server.py:L3572` | `POST /notifications/{nid}/star` | Marcar notificação com estrela ⭐ | Padrão Outlook/Gmail. Mistura "favoritos" com "notificações". | Esconder do UI. |
| **F-032** | ESCONDER | P2 | Notificações | (não tem UI dedicada) | `server.py:L6308` | `POST /notifications/{notif_id}/pin` (api2) | Pin de notificações | Sobrepõe-se a star/snooze. | Esconder até decidir consolidação. |
| **F-033** | REMOVER | P1 | API | — | `server.py:L6477` | `POST /notifications/preferences/full` | Endpoint duplicado de preferences/full ao lado de `/notifications/preferences` | Duplicação. Resíduo de iteração. | Consolidar num só. |
| **F-034** | REMOVER | P0 | API | — | `server.py:L2203` | `GET /posts/_explore_legacy` | Endpoint com sufixo `_legacy` explícito | Auto-declara-se zombie. | Eliminar. |
| **F-035** | REMOVER | P0 | API | — | `server.py:L5232` | `GET /feed/v2` | Coexistência com `/posts/feed` sem deprecação clara | Versionamento ad-hoc. | Decidir qual fica; eliminar o outro. |
| **F-036** | REMOVER | P0 | API | — | `server.py:L5997` | `POST /messages/v2` | Coexistência com `POST /messages` | Versionamento ad-hoc. | Consolidar. |
| **F-037** | REMOVER | P0 | API | — | `server.py:L6238` (api2) | `GET /api2/search` | Duplicação de `/api/search` (linha 1573) | Duas APIs separadas para a mesma coisa. | Consolidar. |
| **F-038** | MOVER PARA ADMIN | P1 | API | — | `server.py` toda a secção `@api2.*` (linhas 5671-6500) | Router `api2` (50+ endpoints) | Existe um router `/api2` paralelo ao `/api` com endpoints sobrepostos | Não é feature visível ao utilizador — é dívida arquitectural exposta como API pública. | Refactor (PRD P2 já o pede). Até lá, documentar. Não expôr `/api2` como base path público — colapsar em `/api`. |
| **F-039** | REMOVER | P2 | API | (não tem UI) | `server.py:L6330-6346` | `POST /topics/mute` + `GET /topics/muted` | Block list de tópicos | Pode ter sentido. **Mas** já há `/posts/{id}/dismiss` (L6348) e `/api2/posts/{id}/mute-thread` (L5920). 3 mecanismos para "não quero ver isto". | Consolidar em 1 mecanismo. |
| **F-040** | CONVERTER EM SOCIAL | P2 | UI | Feed `/` | `components/PTBanners.js` + `CalendarPTBanner` + `SinoBairroBanner` + `ATardeBanner` + `Boa Noite` + `Cafezinho` | 5-6 banners PT em simultâneo no Feed | Cada um isoladamente é poético. Juntos transformam o Feed num **briefing institucional do dia** antes de chegar ao conteúdo dos amigos. | Rotação **1 banner por sessão** (mostrar 1 dos 5 com base em hora/contexto). |
| **F-041** | ESCONDER | P2 | UI | Feed `/` | `components/ActivityTicker.js` + `ActivityTickerLive.js` | Activity Ticker (atividade global) | 2 componentes (live + polling) para a mesma coisa. Estilo "trending now scroll" do The New York Times mobile. | Manter só `ActivityTickerLive` (já que WebSocket existe), eliminar polling versão. Esconder por defeito; opt-in. |
| **F-042** | CONVERTER EM SOCIAL | P1 | Gamification | Profile | `lib/`+server | **5 sistemas paralelos**: `Badges narrativos (12)` · `Charms (12)` · `Cosmetics (14)` · `Trophies (?)` · `Reputation/Level` · `Streak` | 5+ recompensas concorrentes. Diluem-se mutuamente. | Manter **2**: (a) Badges narrativos PT (já existem, e são identidade) + (b) Cosmetics (frames+stickers). Eliminar Charms (já há Badges), Trophies (órfão), Reputation/Level (RPG). Streak manter mas opt-out. |
| **F-043** | REMOVER | P1 | Gamification | — | `server.py:L5364` | `GET /users/{username}/streak` + Streak UI banners | Streak diário (X dias seguidos) | Duolingo / Snapchat streak. Pressão diária. Contradiz "slow social". | Tornar **opt-in** explícito (default OFF). Não mostrar no header do perfil. |
| **F-044** | CONVERTER EM SOCIAL | P2 | Gamification | Comunidade | `components/HypeTrainBanner.js` + `server.py:L4884-4936` | Hype Train (Twitch-style, 25 pessoas em 30 min, gradient laranja-rosa animado) | Hype mechanic puxa para "engagement viral" — directamente contra o manifesto Vermillion ("conversa que vale > viral"). | Renomear "**Roda da Tasca**" (chamada para conversa) e suavizar visual (sem progresso animado a pressionar). |
| **F-045** | CONVERTER EM SOCIAL | P1 | UI | Perfil próprio | `pages/profile/PainelPessoalDrawer.js` | `PainelPessoalDrawer` (drawer com 8 painéis: PresencePicker, Connection, Bookmarks/Drafts/Scheduled/Visitors, Streak+Mesa, Charms+Series, Charms Progress, Stats, Fingerprint, Rhythm, Heatmap) | "Painel pessoal" é literalmente o naming de um dashboard SaaS. Concentra 10 coisas heterogéneas. | Renomear "**A minha gaveta**" ou "**Diário pessoal**". Reduzir painéis a 3 (Conteúdo · Identidade · Atividade) — esconder o resto atrás de "ver mais". |
| **F-046** | RENOMEAR | P2 | UI | Perfil próprio | `pages/Profile.js:L194-218` | "Painel pessoal" botão preto + ícone Settings | "Painel pessoal" + "Definições" lado a lado no header do próprio perfil | Naming dashboard + duplicação visual com o sidebar. | Manter apenas 1 entrada para o drawer; chamar-lhe algo social ("As tuas coisas", "A tua gaveta"). |
| **F-047** | REMOVER | P2 | UI | Profile | `pages/profile/AccountPanel.js` | `AccountPanel` (atalhos Comunidades/Bookmarks/Trending + Drafts/Scheduled/Visitors + Settings/Logout) | Componente parece **não estar usado em produção** (Profile.js renderiza `ProfileSummaryCards`, não `AccountPanel`). | Verificar se está importado; se não for, eliminar ficheiro (dead code). |
| **F-048** | ESCONDER | P2 | UI | Profile | `pages/profile/PainelPessoalDrawer.js:L131-141` | `contentCards` Bookmarks/Drafts/Scheduled/Visitors **dentro** do drawer | Drawer mistura conteúdo + analytics + definições | Conteúdo deve ser tabs do Profile (Posts/Replies/Media/Likes já existem) — não no drawer. | Mover Bookmarks/Drafts/Scheduled/Visitors para Sidebar (já lá estão no Layout). Tirar do drawer. |
| **F-049** | RENOMEAR | P2 | Profile tabs | Profile `/u/:username` | `pages/profile/ProfileTabBar.js` (não inspeccionado em detalhe) + FEATURES.md | Tab `Likes` pública no perfil | Mostrar likes públicos de outros = padrão Twitter mas convida vergonha social. | Manter privado por defeito; tornar visibilidade opt-in. |
| **F-050** | CONVERTER EM SOCIAL | P2 | Profile | `/u/:username` | `pages/profile/IdentityCard.js:L227-231` | `streak-badge` "{N}d streak" | Chip de streak vermelho ao lado do nome | Snap/Duolingo. Pressão visual. | Mover para drawer self-only. |
| **F-051** | MANTER | — | Profile | `/u/:username` | `pages/profile/IdentityCard.js` | Region pill / Mood pill / Team pill / Online dot | Identidade PT-PT viva. | **Excelente.** |
| **F-052** | MANTER | — | Profile | `/u/:username` | `pages/profile/IdentityCard.js:L139-189` | RodaButton + Mensagem rápida popover + Follow + Share + ProfileMoreMenu | UX denso, mas todas as actions são sociais. | **Manter** — talvez espaçar visualmente. |
| **F-053** | MOVER PARA ADMIN | P1 | Moderation | (UI em ProfileMoreMenu) | `server.py:L5806, 5888, 6143` | `POST /posts/{id}/report` + `comments/{id}/report` + `users/{u}/report` | Endpoints de report (utilizador/comment/post) | Bom ter. **Mas** falta-lhe contrapartida admin UI. Hoje vai para o vácuo. | Construir painel admin (já há admin user seeded). Não expor o "/report" sem que haja resposta visível. |
| **F-054** | ESCONDER | P2 | Profile | `/u/:username` | `pages/profile/ProfileMoreMenu.js:L209-244` | Menu com 7 ações (Copiar link, Favoritos, Notificações, Silenciar, Reportar, Bloquear, Desbloquear) | 7 acções num menu é demais; sobrepõe-se a 5 endpoints (`/relation`, `/favorite`, `/notify`, `/mute`, `/block`). | Consolidar (já feito parcialmente). Esconder "Activar notificações" — overlap com Roda/Mesa. |
| **F-055** | RENOMEAR | P2 | UI | Settings | `pages/Settings.js:L42-49` | `BIO_SLOTS` (6 slots: mood_today, soundtrack, reading, favourite_place, quote_of_month, city_extra) | Excelente conceito, mas naming técnico em frontend (`mood_today`, `quote_of_month`). | Já tem `placeholder` PT-PT. Manter no UI. |
| **F-056** | MANTER | — | Identity | Settings | `pages/Settings.js:L516-572` | Identidade tab (cidade, freguesia, região, mood, time, slots) | Core PT-PT, perfeito. | **Manter.** |
| **F-057** | ESCONDER | P2 | UI | Settings | `pages/Settings.js:L666-705` | `PrivTab` botão "Descarregar os meus dados" duplicado com `DataTab` | Mesma acção em 2 tabs. | Manter só em Privacidade (eliminar Data tab — F-006). |
| **F-058** | CONVERTER EM SOCIAL | P2 | Reactions | DMs | `server.py:L2954` | `POST /messages/{id}/react` (emoji) | OK. Mas a mistura com `/posts/{id}/react` (reações PT 6 fixas) cria 2 vocabulários. | Decidir: ou DMs também usam as 6 reações PT, ou só posts. |
| **F-059** | REMOVER | P2 | UI | Settings (Hub) | `pages/settings/HubTab.js:L227-244` | "Sugestões pendentes (N)" | Checklist tipo Trello | Dark-pattern produtividade. | Eliminar painel. |
| **F-060** | ESCONDER | P2 | UI | Profile | `pages/profile/PainelPessoalDrawer.js:L155` | `CharmsProgressPanel` (progresso de Charms locked com %) | Pokémon progress bars. | Mostrar só Charms desbloqueados; esconder progresso quantitativo. |
| **F-061** | RENOMEAR | P2 | UI | Settings (Aparência) | `pages/Settings.js:L805` | `CosmeticsPicker` "Cosméticos" | Naming "cosméticos" sem contexto pode confundir. | "**Decorações**" ou "**Adereços de avatar**". |
| **F-062** | MANTER | — | Cosmetics | — | `server.py:L5006-5060` | 7 frames + 7 stickers PT (Pastel, Bola, Galo, Sardinha, Café…) | Identidade PT pura, tier grátis. | **Excelente.** |
| **F-063** | CONVERTER EM SOCIAL | P2 | Profile | Drawer | `components/MesaPanel.js` | Mesa (inner-inner circle, 5 max) | Conceito poético, mas sub-Roda dentro da Roda (que já é "inner circle"). | Decidir: ou substitui Roda, ou colapsa nela. 2 níveis íntimos é demais. |
| **F-064** | REMOVER | P2 | Auth | (não tem UI dedicada) | `server.py:L1503` | `POST /auth/2fa/regenerate-backup` | Regenerate backup codes | Faz parte do pacote 2FA; se 2FA fica simplificado (F-017), este endpoint desaparece. | Eliminar se 2FA for simplificado. |
| **F-065** | MANTER | — | Bairro | Feed | `components/PTBanners.js` + `CalendarPTBanner` | Calendário PT (Sto António, S. João, ...) | Identidade única e culturalmente forte. | **Manter.** Mas ver F-040 (consolidar com outros banners). |
| **F-066** | RENOMEAR | P2 | UI | Feed | `pages/Feed.js` (não inspeccionado em detalhe) | `ATardeBanner` (componente em components/) | Conceito poético mas naming "A Tarde" sem contexto fora de Portugal pode confundir. | Manter naming PT-PT (correcto culturalmente). Sem alteração obrigatória. |
| **F-067** | ESCONDER | P2 | Charms | Profile | `components/CharmsProgressPanel.js` + `server.py:L5479` | `GET /users/{username}/charms-progress` | Progresso quantitativo (%) por Charm bloqueado | Pokémon-fashion. | Esconder do perfil público. Self-only. |
| **F-068** | CONVERTER EM SOCIAL | P2 | UI | Auth | `pages/Login.js`, `pages/Register.js` (não inspeccionados) | Possível login com Google/Github | A presença de keywords `google`/`github` em `Settings.js:L34` (`keywords: ["...google", "github"]`) sugere OAuth planeado. | Decidir: se for OAuth social, OK. Se for "login as developer", REMOVER referência. |
| **F-069** | MOVER PARA ADMIN | P1 | API | — | `server.py:L4090` | `GET /discover/new_voices` | Endpoint de descoberta "Novas vozes" | OK, mas se for usado para curadoria editorial. | Manter mas adicionar `?curated=true` opcional admin-only. |
| **F-070** | MANTER | — | Charms | — | `server.py:L4651-4733` | Charms catalog (12 colecionáveis PT) | Funciona. | **Manter** (ver F-042 — consolidar com Badges, escolher 1). |
| **F-071** | REMOVER | P2 | UI | (Profile) | `pages/profile/AffinityRibbon.js:L40` | "**Sparkles** icon" no header da Affinity | Decorativo. | Eliminar ícone (mantém-se ribbon, mas sem o ✨). |
| **F-072** | RENOMEAR | P2 | UI | Profile drawer | `pages/profile/PainelPessoalDrawer.js:L143-159` | Secção "**Análise**" com BarChart3 icon | "Análise" puxa para Google Analytics. | Renomear "**Os teus números**" ou "**Lá de dentro**". |
| **F-073** | MANTER | — | Manifesto | `/manifesto` | `pages/Manifesto.js` | Página dedicada ao manifesto anti-dark-pattern | Coração da diferenciação Vermillion. | **Manter.** |
| **F-074** | MANTER | — | Legal | `/legal*` | `pages/legal/*` | 6 páginas legais (Index, Terms, Privacy, Cookies, Community, Glossary) | RGPD necessário. | **Manter.** |
| **F-075** | RENOMEAR | P2 | UI | Settings | `pages/Settings.js:L833` | "Os teus direitos (RGPD)" + email `dpo@vermillion.pt` + ligação CNPD | Texto correcto legalmente, mas DPO/CNPD em fluxo de utilizador é frio. | Manter conteúdo, mas afastar do fluxo principal (atrás de "saber mais"). |
| **F-076** | ESCONDER | P2 | UI | Notes | `components/NotesBar.js` + `server.py:L4395-4444` | Notes (Recados 24h, 60 chars, 1 ativo) | Coexiste com Stories. Os 2 são "status efémero". | Decidir consolidação: ou só Notes (texto leve), ou só Stories (foto). |
| **F-077** | MANTER | — | Stories | — | `server.py:L2562-2620` | Stories 24h | Padrão social. | **Manter.** |
| **F-078** | REMOVER | P2 | Settings | (Settings.js TABS) | `pages/Settings.js:L34` | `seg` tab keyword inclui `"github"` | Indicação de planos de login GitHub (developer-oriented) | Numa rede social PT-PT, GitHub OAuth não é prioridade. | Remover keyword "github" das pesquisas internas até decidir login social. |
| **F-079** | CONVERTER EM SOCIAL | P2 | Profile | Drawer | `pages/profile/PainelPessoalDrawer.js:L227-234` | Footer micro com Manifesto/Legal/Termos/Privacidade/Cookies | 5 links legais como rodapé de drawer pessoal | Estilo footer corporate. | Manter só "Manifesto" no drawer. Restantes legais ficam em Settings > Legal. |
| **F-080** | MANTER | — | Diáspora | `/diaspora` | `server.py:L4171` | `GET /diaspora/heatmap` (densidade mundial) | Identidade Vermillion, único. | **Manter.** |
| **F-081** | MANTER | — | Trending | `/trending` | server endpoints `/trending/pessoas/comunidades/cidades` | Trending por 4 dimensões. | **Manter.** |
| **F-082** | MANTER | — | Communities | `/communities`, `/c/:slug` | server | Comunidades com categorias PT, Hype Train, Reactions custom | Core social. | **Manter** (excepto Hype Train — F-044). |
| **F-083** | ESCONDER | P2 | UI | Drawer | `pages/profile/PainelPessoalDrawer.js:L126-128` | PresencePicker + ConnectionIndicator linha de topo do drawer | Mistura estado WebSocket (técnico) com presence (social). | Esconder `ConnectionIndicator` (debug-only). Manter `PresencePicker`. |
| **F-084** | REMOVER | P2 | API | — | `server.py:L6361-6430` | `/posts/{id}/boost` + `/posts/boosts/status` | Mecânica promoção paga sem UI de pagamento | Inflexível com manifesto. | Eliminar. |
| **F-085** | ESCONDER | P2 | UI | Profile | `pages/profile/IdentityCard.js:L290-299` | "{N}d na rede" + "Membro desde {data}" | Combo "tempo de antiguidade" — LinkedIn pattern. | Esconder "{N}d na rede" (manter só "Membro desde"). |
| **F-086** | REMOVER | P2 | UI | Hub Settings | `pages/settings/HubTab.js:L262-265` | "**Para Ti**: Ajusta o algoritmo do teu feed" como ActionTile | Pôr "ajusta o algoritmo" no Hub vende SaaS-power-user. | Eliminar tile. |
| **F-087** | RENOMEAR | P2 | UI | Hub Settings | `pages/settings/HubTab.js:L263` | "**Aparência**: Tema, densidade, idioma" | OK, mas "**Densidade**" (compact/comfortable) é Linear/Notion. | Renomear "**Espaçamento**" (mais natural PT-PT). |
| **F-088** | CONVERTER EM SOCIAL | P2 | UI | Settings | `pages/Settings.js:L575-664` | Toggles tipo `priv_show_online`, `priv_typing`, `priv_search` | Naming técnico no estado interno; UI já mostra PT-PT (OK). | OK do lado UI. Renomear apenas keys internas se for refactor (cosmético). |
| **F-089** | ESCONDER | P2 | UI | Settings (Notif) | `pages/Settings.js:L656-661` | 5 ToggleRows de tipos de notificação | OK ter granularidade. Mas é a 1ª coisa que o user vê. | Colapsar em "Avançado" — defaults vivos. |
| **F-090** | MANTER | — | UI | Settings | `pages/Settings.js:L811-855` | LegalTab (atalhos legais + cookie center + DPO + CNPD) | Necessário, bem feito. | **Manter.** Combinado com F-075 (esconder DPO em "saber mais"). |

> Esta tabela cobre **90 itens explicitamente classificados**. Itens não-listados (autenticação básica, feed core, composer, DMs core, comentários core, comunidades core) são `MANTER` implícito.

---

## 4. Top 30 funcionalidades mais fora de contexto

Ordenadas pelo "afastamento" face a uma rede social moderna:

1. **F-001 · Settings > Hub completo** (rings, scores, sugestões pendentes) — Asana/HubSpot puro.
2. **F-002 · Score de Segurança 0-100% com vermelho <60%** — pressão Gmail.
3. **F-003 · Score de Completude do Perfil 0-100%** — dark-pattern LinkedIn, contradiz manifesto.
4. **F-005 · Endpoint `/users/{u}/trophies` que não existe** — código morto chamado em produção.
5. **F-011 · SecurityTab completa** (2FA TOTP+QR+backup + sessions+IP + recovery email + login alerts) — pacote banca.
6. **F-018 · "Nível X · Y rep"** como chip de perfil — Stack Overflow.
7. **F-019 · AffinityRibbon "{N}% Forte/Próxima/Leve"** — score relacional Tinder.
8. **F-027 · PostAnalyticsModal** — Twitter Blue creator analytics.
9. **F-029/F-084 · `/posts/{id}/boost`** — sponsored post sem fluxo de pagamento.
10. **F-006/F-007/F-008/F-009 · DataTab inteira** com JSON "dev" + CSV + cache + searches.
11. **F-034 · `_explore_legacy` endpoint** — auto-declara-se lixo.
12. **F-035/F-036/F-037 · `/feed/v2`, `/messages/v2`, `/api2/search`** — duplicações versionadas expostas.
13. **F-038 · Router `/api2`** completo paralelo a `/api` — dívida arquitectural.
14. **F-013 · 11 tabs em Settings** — Workspace, não rede social.
15. **F-026 · `/posts/{id}/viewers`** — lista de quem viu cada post (voyeurismo).
16. **F-030/F-031/F-032 · Notificações: snooze/star/pin** — Gmail enterprise.
17. **F-021/F-022 · Heatmap GitHub-style + RhythmPanel HourClock** — Strava biometric.
18. **F-024 · "Completa o teu perfil — 5 de 8 passos prontos"** — LinkedIn pattern.
19. **F-040 · 5-6 banners PT em simultâneo** — Feed vira briefing.
20. **F-042 · 5+ sistemas paralelos de gamificação** (Badges + Charms + Cosmetics + Trophies + Rep/Level + Streak).
21. **F-043 · Streak diário visível** — Duolingo pressure.
22. **F-044 · Hype Train Twitch-style** — contraditório com "slow social".
23. **F-045 · "Painel pessoal" naming** — dashboard SaaS.
24. **F-014 · ForYouTuner sliders** — power-user dashboard.
25. **F-016 · Sessions com IP/OS/device fingerprint visível** — SIEM disfarçado.
26. **F-020 · ProfileSummaryCards "Em números"** — KPI dashboard no perfil.
27. **F-072 · Secção "Análise"** com BarChart3 icon — Google Analytics.
28. **F-033 · `/notifications/preferences/full`** vs `/preferences` — duplicação.
29. **F-028 · EditHistoryModal exposto** — Twitter Blue / Wikipedia diff.
30. **F-039 · 3 mecanismos para "não quero ver"** (dismiss, mute-thread, mute-topics) sem consolidação.

---

## 5. Funcionalidades a remover futuramente (lista enxuta)

> Estas são as recomendações `REMOVER` da tabela, consolidadas:

- **Endpoints zombie / órfãos**
  - `GET /api/posts/_explore_legacy` (F-034)
  - `GET /api/feed/v2` (F-035)
  - `POST /api/messages/v2` (F-036)
  - `GET /api2/search` (F-037)
  - `POST /api/notifications/preferences/full` (F-033)
  - `GET /api/users/{u}/trophies` (chamado em UI sem existir backend — F-005)
- **Endpoints sem fit social**
  - `GET /posts/{post_id}/viewers` (F-026)
  - `GET /posts/{post_id}/analytics` + `PostAnalyticsModal` (F-027)
  - `POST /posts/{post_id}/boost` + `GET /posts/boosts/status` (F-029, F-084)
  - `POST /auth/2fa/regenerate-backup` (se 2FA simplificado — F-064)
  - `POST /topics/mute` + `GET /topics/muted` (consolidar — F-039)
- **UI elements**
  - HealthRing scores em HubTab (F-001/F-002/F-003)
  - Quick Stats em HubTab (F-004)
  - DataTab tile "JSON para developers" (F-007)
  - DataTab tile "CSV" (F-008)
  - DataTab "Limpar cache local" + "Limpar pesquisas" (F-009)
  - "Sugestões pendentes" em HubTab (F-059)
  - "Melhor streak" KPI (F-025)
  - "Sparkles" icon em AffinityRibbon (F-071)
  - "{N}d na rede" no Profile (F-085)
  - ActionTile "Para Ti — Ajusta o algoritmo" no Hub (F-086)
  - Keyword "github" em Settings search (F-078)
- **Componente potencialmente não-utilizado**
  - `pages/profile/AccountPanel.js` (F-047) — confirmar se está importado

---

## 6. Funcionalidades a esconder

- **Profile**
  - Streak badge no header (F-050) — mover para drawer self-only
  - Charms progress quantitativo (F-067) — só mostrar charms ganhos
  - Heatmap + Rhythm + Fingerprint (F-021/F-022/F-023) — mover para drawer self-only; visitantes vêem só síntese qualitativa
  - Tab `Likes` pública (F-049) — opt-in
- **Notificações**
  - Star (F-031), Snooze (F-030), Pin (F-032)
- **Settings**
  - Granular toggles de notificação dentro de "Avançado" (F-089)
  - IP coluna em Sessions (F-012)
  - 2FA TOTP em "Avançado" (F-017)
  - PrivTab download duplicado (F-057)
- **UI Feed**
  - Activity Ticker por defeito off (F-041)
- **Drawer**
  - ConnectionIndicator (F-083) — debug-only

---

## 7. Funcionalidades a mover para admin

- **Sessions API** completa permanece, mas UI utilizador é minimalista (F-016).
- **`/api2/` router** consolidar e não expor base path duplicado (F-038).
- **Endpoints `/report`** (post/comment/user) — construir admin panel para review (F-053).
- **`/discover/new_voices`** com flag `curated=true` admin-only (F-069).
- **EditHistory** completo só para moderação (F-028).

---

## 8. Funcionalidades a renomear

| Actual | Sugerido | Porquê |
|---|---|---|
| "Saúde do perfil" / "Proteção" | "**Perfil**" / "**Privacidade**" (sem rings) | Remove tom clínico (F-001/F-002). |
| "Zona perigosa" | "**Eliminar conta**" ou "**Sair de vez**" | Português natural (F-010). |
| "Painel pessoal" | "**A tua gaveta**" ou "**Lá de dentro**" | Remove dashboard (F-045). |
| "Análise" (em drawer) | "**Os teus números**" | Menos Google Analytics (F-072). |
| "Densidade" | "**Espaçamento**" | PT-PT mais natural (F-087). |
| "Cosméticos" | "**Adereços**" | Menos abstracto (F-061). |
| "Hype Train" | "**Roda da Tasca**" ou "**Bonança**" | Mantém energia, perde Twitch (F-044). |
| "Completa o teu perfil — N passos prontos" | "**Acaba de te apresentar**" | Menos to-do list (F-024). |
| "Fingerprint" | "**Retrato**" ou "**Cartão de identidade**" | Identidade PT (F-023). |
| "Settings > Atalhos" tab | (remover tab — modal `?` chega) | Não merece tab (F-015). |
| Keyword "github" em search | (remover) | Audience errada (F-078). |
| Tab `seg` (Segurança) | "Conta segura" | Suaviza (F-011). |

---

## 9. Funcionalidades a converter em social

| Hoje | Amanhã (proposta social-native) |
|---|---|
| HealthRings (Completude + Segurança) | Chips opcionais "Adicionar mood do dia · Pôr foto · Activar 2FA?" — **sem** percentagens. |
| Affinity score 0-100% | Chips qualitativos "3 amigos em comum · Mesma cidade · Mesmo Sporting" sem valor numérico. |
| Reputation/Level "Nível 4 · 230 rep" | Badge narrativo "**Tasqueiro do 2.º ano**" (já existe `PT_BADGES_DEFS`). |
| Rhythm Clock 24h | Frase: "**Escreve à noite, sobretudo Quintas**". |
| Heatmap GitHub 30d | Frase: "**Anda activa esta semana**" / "**Quieta há 3 dias**". |
| Fingerprint analytics | "**Como {nome} aparece aqui**" (já está perto — só rebrand). |
| Snooze/Star de notificações | "**Mais tarde**" simples (sem janela de minutos). |
| ForYouTuner sliders | 4 preset cards: "**Mais Roda**", "**Mais Bairro**", "**Mais Saudade**", "**Surpreende-me**". |
| Hype Train | "**Roda da Tasca**" — call-to-conversa, sem barra de progresso pressionar. |
| Sessions com IP | "**Onde tens sessão**" — "Este telemóvel · há 2h" (sem IP exposto). |
| CompletionPanel (8 passos) | "**Acaba de te apresentar**" — 1 chip simpático que desaparece quando preenchido. |
| 5 sistemas de gamificação | 2 sistemas: Badges narrativos + Adereços (frames/stickers). |
| Streak diário | Streak opt-in only ("queres ver o teu streak?" no onboarding). |
| 6 banners PT simultâneos | 1 banner contextual por sessão (rotativo Sto António, Cafezinho, Sino Bairro...). |

---

## 10. Rotas órfãs ou suspeitas

| Rota | Tipo | Status | Recomendação |
|---|---|---|---|
| `GET /api/posts/_explore_legacy` | Endpoint | **Órfão** — sufixo `_legacy` autodeclarado | REMOVER |
| `GET /api/feed/v2` | Endpoint | **Versionado** — sem `/feed/v1` claro | CONSOLIDAR |
| `POST /api/messages/v2` | Endpoint | **Versionado** — coexiste com `POST /messages` | CONSOLIDAR |
| `GET /api2/search` | Endpoint | **Duplicado** com `/api/search` | CONSOLIDAR |
| `GET /api/users/{u}/trophies` | Chamada UI | **Backend não existe** (`HubTab.js:L189`) | REMOVER chamada |
| `POST /api/notifications/preferences/full` | Endpoint | **Duplicado** com `/notifications/preferences` | CONSOLIDAR |
| `POST /api/topics/mute` + `GET /topics/muted` | Endpoints | **Sobrepostos** com `posts/{id}/dismiss`, `posts/{id}/mute-thread` | CONSOLIDAR em 1 |
| `GET /api/posts/{id}/viewers` | Endpoint | **Sem fit** social (voyeurismo) | REMOVER |
| `GET /api/posts/{id}/analytics` | Endpoint | **Creator economy** num produto slow social | REMOVER ou ESCONDER |
| `POST /api/posts/{id}/boost` + `GET /posts/boosts/status` | Endpoints | **Sponsored** sem fluxo de pagamento | REMOVER (até decidir Vermillion+) |
| `POST /api/auth/2fa/regenerate-backup` | Endpoint | Faz sentido com 2FA full; **excessivo** se simplificado | REMOVER se simplificar 2FA |
| `POST /api/conversations/{id}/cafezinho` | Endpoint | **Naming OK** mas o que faz? | Documentar; nome bonito mas sem doc é red flag |
| `POST /api2/conversations/{id}/mark-unread` | Endpoint | **Gmail enterprise pattern** | ESCONDER |
| `POST /api2/posts/{id}/why` | Endpoint | "**Why am I seeing this**" (Facebook pattern) | MANTER se for didáctico, ESCONDER se for explicação de algoritmo |
| `POST /api2/posts/{id}/dismiss` | Endpoint | Consolidar com mute-thread + topics/mute | CONSOLIDAR |
| Rota frontend `/visitors` | Página | **LinkedIn pattern** — manter com opt-out (já tem) | MANTER (opt-out activo) |
| Componente `pages/profile/AccountPanel.js` | Componente | **Possivelmente não-importado** (Profile.js usa `ProfileSummaryCards`, não `AccountPanel`) | VERIFICAR; se dead code, REMOVER |
| `components/ActivityTicker.js` **e** `ActivityTickerLive.js` | Componentes | Duplicação live vs polling | CONSOLIDAR |

---

## 11. Endpoints / Modelos suspeitos (resumo backend)

### 11.1 Endpoints — sumário por suspeição

| Categoria | Total | Sugestão |
|---|---|---|
| Auth core (register/login/logout/me/forgot/reset/change) | 7 | MANTER |
| Auth security (sessions × 3 + 2FA × 6) | 9 | SIMPLIFICAR (manter 3-4) |
| Users (CRUD, follow, mutual, search, suggestions, ...) | ~25 | MANTER core; rever `/relation`, `/favorite`, `/notify`, `/mute`, `/block` (5 endpoints — consolidar?) |
| Posts core (CRUD, feed, explore, tag, view, comments) | ~30 | MANTER |
| Posts secondary (analytics, viewers, boost, why, dismiss, mark-unread, note) | ~10 | REMOVER 4-6 (F-026/27/29/30) |
| Communities | ~14 | MANTER |
| Events | 4 | MANTER |
| Notifications | 9 (incluindo star/snooze/pin + duas preferences endpoints) | SIMPLIFICAR para 5 |
| Messages/Conversations | ~15 (incluindo v2 / mark-unread / forward / media) | SIMPLIFICAR (eliminar v2, mark-unread, forward; consolidar media) |
| Calendar / Bairro / Daily | 3 | MANTER (mas rotacionar visualmente — F-040) |
| Gamification (badges, charms, charms-progress, cosmetics, streak, reputation) | ~8 | SIMPLIFICAR — manter 2 sistemas (F-042) |
| Social V2 (notes, presence, series, visitors, starter-packs, hype, collab, roda, mesa) | ~25 | MANTER, mas decidir Notes vs Stories (F-076), Roda vs Mesa (F-063), Hype Train soft (F-044) |
| Trending | 4 | MANTER |
| Explore | 4 | MANTER |
| Discover | 2 (`/new_voices`, `/surprise`) | MANTER |
| Bookmark collections | 4 | MANTER |
| Stories | 4 | MANTER |
| Diaspora | 1 | MANTER |
| Catalogs (cities, categories) | 3 | MANTER |
| **api2/* router** | ~50 | **CONSOLIDAR em /api** (F-038); muitos são duplicações |
| Endpoints declaradamente legacy/versioned | 4 (`_explore_legacy`, `feed/v2`, `messages/v2`, `api2/search`) | REMOVER |
| Endpoints sem fit (boost, analytics, viewers) | 3 | REMOVER |

### 11.2 Modelos suspeitos (campos)

> Não há acesso directo ao schema das 16 colecções neste audit. Pontos a investigar em refactor futuro:

- **`users`** — campos detectados: `recovery_email`, `login_alerts_enabled`, `password_changed_at`, `track_visits`, `notif_preferences`, `theme`, `density`, `language`, `reduce_motion`, `boa_noite_start/end`, `boa_noite_enabled`, `cafezinho_enabled`, `searchable`, `show_online`, `typing_indicator`, `region`, `mood_initial`, `team`, `bio_slots`, `level`, `reputation`, `verified`, `private`, `last_seen`. → **Excesso de toggles**: 20+ flags. Considerar consolidar `notif_preferences` num sub-objecto e revisitar `level`/`reputation` (F-018).
- **`posts`** — `quote_of`, `images[]`, `poll`, `audience_ring`, `reply_audience`, `scheduled_at`, `is_draft`, `edit_history[]`, `views`, `view_count`, `boost_status`, `note`, ... → Campo `boost_status` deve sair se F-084 avançar. `edit_history[]` esconder no front (F-028).
- **`profile_views`** — colecção dedicada de visitantes. → MANTER mas opt-out já existe (V2.6 — F-074).
- **`hype_trains`** — colecção. → MANTER mas suavizar (F-044).
- **`notes`** — colecção. → Decidir vs Stories (F-076).

---

## 12. Recomendações de limpeza futura (roadmap accionável)

> **Importante:** estas são recomendações. **Nada é alterado neste audit.**

### Sprint A — Higiene crítica (1-2 semanas) — P0

1. **Eliminar o endpoint órfão** `GET /api/users/{u}/trophies` (chamado em `HubTab.js`).
2. **Remover endpoints declaradamente legacy/v2:** `_explore_legacy`, `feed/v2`, `messages/v2`, `api2/search`, `notifications/preferences/full`.
3. **Apagar `HealthRings`** (F-001/F-002/F-003) no `HubTab`. Substituir Hub por atalhos simples.
4. **Apagar `reputation-badge` + `Level`** do `IdentityCard` (F-018) — manter cálculo backend, apenas remover exposição.
5. **Apagar `PostAnalyticsModal` + endpoint** (F-027).
6. **Apagar `/posts/{id}/boost`** (F-084) até existir produto pago decidido.
7. **Apagar `/posts/{id}/viewers`** (F-026).

### Sprint B — Consolidação SaaS → Social (2-3 semanas) — P1

8. **Refactor `Settings.js`** de 11 tabs para 5 (F-013). Eliminar tabs: `Hub`, `Dados`, `Atalhos`. Mover Segurança para dentro de Privacidade.
9. **Simplificar `SecurityTab`** (F-011): remover Recovery email + Login alerts + IP exposto em sessões; 2FA esconder em "Avançado" (F-017).
10. **Refactor `AffinityRibbon`** para chips qualitativos sem score numérico (F-019).
11. **Refactor banners PT** — rotação 1 banner por sessão em vez de 5-6 simultâneos (F-040).
12. **Consolidar `ActivityTicker` + `ActivityTickerLive`** num só componente (F-041).
13. **Consolidar 5 sistemas de gamificação em 2** (F-042): manter Badges narrativos + Cosmetics; eliminar Charms (ou unir a Badges), Trophies, Reputation/Level.
14. **Decidir Notes vs Stories** (F-076) — manter só um sistema efémero.
15. **Decidir Roda vs Mesa** (F-063) — manter só 1 nível de inner circle.
16. **Construir admin panel** para `/reports` (F-053) — caso contrário esconder botão de reportar.

### Sprint C — Polish UX (2-4 semanas) — P2

17. **Renomear** todas as labels SaaS (F-008, F-010, F-024, F-044, F-045, F-061, F-072, F-087).
18. **Reposicionar** analytics de Profile (Heatmap, Rhythm, Fingerprint) para drawer self-only (F-021/22/23).
19. **Esconder** notificações star/snooze/pin (F-030/31/32).
20. **Refactor `ForYouTuner`** para 4 preset cards em vez de sliders (F-014).
21. **Suavizar Hype Train** — renomear "Roda da Tasca", sem barra de progresso (F-044).
22. **Streak opt-in** no onboarding (F-043).
23. **Consolidar `topics/mute` + `posts/{id}/dismiss` + `posts/{id}/mute-thread`** num só endpoint (F-039).
24. **Refactor `/api2/` router** para `/api/` (PRD P2 já o pede — F-038).
25. **Eliminar dead code** — confirmar e remover `pages/profile/AccountPanel.js` se não for usado (F-047).

### Sprint D — Long-term hygiene — P3

26. **Refactor `server.py`** (6.500 linhas; PRD pede). Quebrar em `auth.py`, `posts.py`, `users.py`, `communities.py`, `events.py`, `notes.py`, `social_v2.py`, `messaging.py`, `moderation.py`.
27. **Documentar models MongoDB** explicitamente (16 colecções) — campos por coleção.
28. **Auditoria de privacidade** — revisitar todos os endpoints que mostram `last_seen`, `presence`, `viewers`, `relation` por defeito ON.
29. **Decidir Vermillion+ (Stripe)** — se `boost`, `analytics`, `custom-emoji-pack` voltarem, ficam atrás de paywall declarado, não escondidos como features grátis.

---

## 13. Apêndice — peças que **encaixam perfeitamente** (não tocar)

> Para evitar refactor zelo, eis o que está bem (MANTER explicito):

- Feed + filtros mood/sort
- Composer com até 4 imagens, sondagens, quote, audience_ring
- Comentários Reddit-style (nested + collapse + cascade delete + pinned)
- 6 Reações PT (saudade/comove/tasca/bombou/cafe/orgulho)
- DMs core (1:1, typing, react, send até 2000 chars)
- Stories 24h
- Notificações core (like/comment/follow/mention/repost/collab)
- Perfil — Region pill, Mood pill, Team pill, Online dot, Verified badge
- IdentityCard "Mensagem rápida" popover
- RodaButton + ProfileMoreMenu (block/mute/report)
- Communities (10 categorias PT, join/leave, members, posts, stats)
- Events (7 categorias PT, marcar presença)
- Trending (4 ranges × 4 dimensões)
- Explore (5 abas)
- Diáspora heatmap mundial
- Calendar PT (Sto António, S. João, Festa do Avante…)
- Manifesto page
- Legal Center (6 páginas)
- Cookie Banner RGPD
- Onboarding modal pós-registo
- Bio slots PT (6 chips)
- Avatar Premium com 10 cores PT determinísticas
- PageShell + PageHero primitives (consistência visual)
- Modo Boa Noite + Cafezinho (opcionais, com horários custom) — **muito Vermillion**
- Roda (close friends PT-PT)
- Starter Packs (Bluesky-style)
- Avatar Cosmetics (7 frames + 7 stickers PT)
- Pull-to-refresh com taglines PT
- ConfirmDialog global
- WebSocket gateway (presence broadcast, typing)
- Empty states personalizados por contexto
- Region-aware gradient banners no perfil

---

## 14. Conclusão final

O Vermillion **tem o ADN certo**. O problema não está no que é, mas no que **se acumulou em cima**:

- Demasiado **scoring** (5+ números 0-100% — completude, segurança, afinidade, reputation, streak, hype progress).
- Demasiada **chrome enterprise** (11 tabs, 2 routers API, v2 endpoints, JSON+CSV export, IP exposto, login alerts).
- Demasiada **sobreposição** (Notes vs Stories, Roda vs Mesa, Charms vs Badges, dismiss vs mute-thread vs topics/mute).
- Demasiada **terminologia clínica** ("Saúde", "Análise", "Painel pessoal", "Zona perigosa", "Densidade").

A direcção certa é **subtracção**, não adição:

> *Cada feature que cheirar a SaaS pergunta: "esta peça serve a conversa entre amigos portugueses, ou serve o painel de controlo?"*
> *Se a resposta for "painel", ela vai para o `PainelPessoalDrawer` (mas renomeado) ou desaparece.*

Total de itens accionáveis identificados nesta auditoria: **90 + 4 endpoints zombie + 5 sistemas de gamificação a consolidar + 11 tabs a reduzir para 5 + 6 banners a rotacionar = ~30 sprints de limpeza ordenadas em 4 sprints temáticos.**

A base social (Feed, Comentários, DMs, Comunidades, Identidade PT) — essa fica intacta. Esse é o coração. Tudo o resto pode (e deve) ser podado.

---

*Documento gerado por auditoria estática read-only do código em `/app/frontend/src/` e `/app/backend/server.py`. Nenhuma alteração de código foi feita. Para implementação consulte os IDs `F-NNN` e siga a ordem dos sprints A→D.*
