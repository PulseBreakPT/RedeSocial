# PROJECT EVOLUTION ENGINE — Auditoria Estratégica do Lusorae

> **Painel C-level:** CEO + CPO + CTO + Head of Growth + Head of Design + Head of Trust & Safety + Head of Monetização.
> **Data:** Junho 2026 · **Versão:** v1.0 · **Idioma:** pt-PT
> **Âmbito:** Toda a aplicação Lusorae (frontend React + backend FastAPI + MongoDB).
> **Inputs analisados:** 386 endpoints, 38 rotas frontend, 25 páginas top-level + 13 legais, 19 módulos backend, `server.py` com 17.063 linhas, `PRD.md` consolidado (216 linhas), `EDITORIAL.md`, registo de sessões e backlog P0/P1/P2.

---

## 0 · SUMÁRIO EXECUTIVO (TL;DR)

**O que o Lusorae é hoje:** uma rede social portuguesa, editorialmente desenhada, com 386 endpoints e 6 motores algorítmicos (Pulse Engine, Community Pulse, Happenings, Reputation, Community Graph, Context). Tem onboarding por interesses, convites peer-to-peer com badge fundador, push notifications, automod PT, PWA, waitlist público e admin cockpit avançado. **Faltam-lhe três coisas:** uma proposta de valor visceral em 5 segundos, retenção de D1→D7→D30, e um motor de monetização ligado.

**O diagnóstico de uma frase:** *o produto está sobre-engenheirado para um problema que ainda não foi validado em escala — tem motor de Fórmula 1 mas estradas de terra batida.*

**Os 3 riscos existenciais (por ordem de gravidade):**

1. **Vazio de oferta inicial.** Um novo utilizador chega ao Feed e, sem 50+ contas seed activas, vê um stream pobre. O custo de aquisição (CAC) é desperdiçado em D0.
2. **Ausência de eventos de retenção sistemáticos.** Não há email lifecycle (Welcome → D1 → D3 → D7), nem digest semanal, nem push schedulados. A push existe mas é apenas reactiva (resposta a notificação real).
3. **Monetização desligada.** Existe `/premium`, `entitlements.py` e `billing.py` mas não há Stripe price IDs reais nem checkout funcional. Não há marketplace, B2B, nem revenue per user definido.

**A oportunidade:** Portugal não tem rede social cívica/cultural própria. Twitter degradou-se, Threads é genérico, BlueSky é técnico. Há janela de **18 meses** para capturar o eleitor informado, o jornalista, o curador cultural e a diáspora portuguesa (700K em França + 500K UK + Brasil/EUA). Mercado endereçável: **2.5M utilizadores activos potenciais em pt-PT**.

**A única decisão mais crítica:** ver Secção 11.

---

## 1 · INVENTÁRIO DE ESTADO ACTUAL

### 1.1 Stack & Escala de Código
| Camada | Métrica | Estado |
|---|---|---|
| Backend (FastAPI) | 19 módulos, 386 endpoints, `server.py` = 17.063 linhas | 🔴 Monolito |
| Frontend (React) | 25 páginas + 13 legais, 38 rotas, code-splitting via lazy | 🟢 Saudável |
| MongoDB | 50+ coleções (estimadas pelos modelos), TTL configurado em mesa_messages, sessions | 🟡 Sem migrations |
| WebSocket | `ws_manager` global, broadcasts de notif/security/pulse | 🟢 Funcional |
| PWA | manifest + service worker + push VAPID | 🟢 Operacional |
| Auth | JWT HS256 + iss/aud binding por ambiente, lockout, audit log, revocation cache | 🟢 Production-grade |

### 1.2 Motores Algorítmicos (6)
1. **Pulse Engine** — pulse cidade/região (snapshot periódico).
2. **Community Pulse** — pulso por comunidade.
3. **Happenings** — detecção de micro-eventos em tempo real.
4. **Reputation Engine** — health_score invisível (não exposto via API).
5. **Community Graph** — laços fortes/fracos por comunidade.
6. **Context Engine** — contexto geo/temporal para feed.

### 1.3 Features Visíveis ao Utilizador
**Core social:** Feed unificado, Explorar, Trending, Comunidades, Mensagens, Notificações, Perfil, Bookmarks, Drafts, Scheduled.
**Engagement/discovery:** Stories (com arquivo), Series, Calendário PT, Tag Pages, Visitors.
**Identidade/gamificação:** Charms (12), Roda, Mesa (5-circle), Badges, Cosmetics, Highlights, Starter Packs.
**Operações:** Admin cockpit (segurança, anti-spam, audit, broadcast, settings, stats, sessions, system), Waitlist, Invites peer-to-peer com badge fundador.
**Confiança:** Automod PT, Reports, Community Mod (papéis, ban/mute), Centro Legal (13 páginas), DSA transparency, Manifesto, Visão, Governance, Segurança Investigadores.
**Monetização (vazia):** Premium page, Entitlements, Billing stub.

### 1.4 Já Removido Nesta Sessão (limpeza)
- ❌ `/topologia` (rota + página + endpoint `/api/pulse/topology`)
- ❌ `/mesas` (rota + página + endpoints `/api/mesas/*` + `mesas.py` + auto_topic_mesa em community_pulse)
- ❌ Referências em `EDITORIAL.md`

---

## 2 · TOP 50 — FUNCIONALIDADES A **ADICIONAR**

> *Critério: alto impacto em retenção/aquisição/monetização, baixo-médio custo de implementação. Ordenadas por ROI estimado.*

### Crescimento & Aquisição (1-15)
1. **Welcome email + verificação obrigatória** — destrava trust + reduz fake accounts (-40% spam D0).
2. **Email lifecycle automatizado (D1, D3, D7, D14, win-back D30)** — única alavanca de retenção comprovada em escala.
3. **OG images dinâmicas por post** — quando partilhado em WhatsApp/Twitter/LinkedIn, mostra autor + excerto.
4. **Páginas públicas indexáveis para SEO** (`/p/:id` sem login wall, `/u/:username` parcial).
5. **Sitemap.xml + robots.txt + structured data (Article schema)** para Google crawling.
6. **Manifesto pré-rolagem na Landing** com prova social ("X portugueses já estão"), incluindo waitlist count em tempo real.
7. **"Trazer X amigos" challenge** — gamificar invites com leaderboard de top inviters por semana.
8. **Login social Google (Emergent-managed)** para reduzir fricção em mobile.
9. **Quick-share buttons** em cada post (WhatsApp, X, LinkedIn, Threads, copy-link).
10. **Referral attribution analytics** — saber qual canal traz utilizadores que ficam D30+.
11. **Programa "Embaixadores Lusorae"** — 100 criadores PT com badge dourado e dashboard de impacto.
12. **Diaspora targeting** — geo-rotas para PT-FR, PT-UK, PT-BR (já existe namespace `/diaspora`, expandir).
13. **Landing pages temáticas** (`/para-jornalistas`, `/para-curadores`, `/para-municipios`) — SEO + intencionalidade.
14. **"Convidar pelo número de telefone"** via SMS deep-link (custo: Twilio).
15. **App stores listing** — empacotar PWA como TWA (Trusted Web Activity) para Play Store.

### Retenção & Engagement (16-30)
16. **Digest semanal personalizado por email** ("Esta semana no teu bairro") — re-activação dormente.
17. **Push schedulada inteligente** (manhã: notícias da tua cidade; noite: o que perdeste).
18. **Streaks visíveis** — "5 dias consecutivos a publicar" estilo Duolingo, com hábitat de notif.
19. **"Continuar a ler"** — bookmarks contextuais que ressuscitam threads abandonadas.
20. **Notificações agregadas** — em vez de 5 pings, "Maria + 4 mais comentaram".
21. **Resumo "O que perdeste"** ao reabrir a app (timeline-based, não algorítmico).
22. **In-app micro-celebrações** — primeiro like, 10 followers, primeira comunidade — com partilha social.
23. **Eventos PT integrados no Calendário** — feriados, partidas Bola, festivais Sumol Summer Fest, NOS Alive (auto-import) — já existe `pt_events_data.py`, expandir para sync com calendário pessoal.
24. **Convites pessoais "vem ver isto"** — partilhar um post específico cria deep-link com preview.
25. **Live commenting durante eventos** (Eleições, Eurovisão, Liga Portugal) — pop-up cívica.
26. **"Comunidades sugeridas" inline no Feed** — após scroll inactivo de 30s.
27. **Reactions além de like** (👏 valeu, 🇵🇹 orgulho, 🤔 dúvida, 💡 inspira) — semântica PT.
28. **Quoted re-shares** com camada de comentário do utilizador.
29. **"Mute palavra/hashtag/utilizador"** com timer (24h, 7d, sempre).
30. **Modo "Foco"** — feed sem trending/notifs por 30min para leitura concentrada.

### Profundidade Editorial (31-40)
31. **Edição colaborativa de posts longos** (Google Docs-style) — diferencia da concorrência.
32. **Newsletter pessoal embebida** — qualquer user pode enviar email aos seguidores opt-in.
33. **Polls cívicos com identidade verificada** opcional (anonimato preservado, contagem fiável).
34. **Anotação social** — destacar passagem de texto e comentar inline, estilo Medium.
35. **Republicação editorial** — admin/curadores podem "destacar" um post na Landing pública.
36. **"Series" upgrade** — converter posts numa série visível com paginação tipo livro.
37. **Audio posts** (60s) — gravação directa, transcrição automática via Whisper.
38. **Threads/multi-post** — encadear até 10 posts num único thread navegável.
39. **Embeds inteligentes** (YouTube, X, IG, SoundCloud, GitHub) com preview consentido.
40. **Mapa cívico interactivo** (substituto da Topologia removida, mas focado em causas reais).

### Monetização & Sustentabilidade (41-50)
41. **Stripe checkout funcional** com price IDs reais (€4/mês, €36/ano, founder €3/mês vitalício).
42. **Marketplace de "Pacotes culturais"** — curadores vendem newsletter premium (revenue share 70/30).
43. **Tipping em posts** (€1, €3, €5) — Stripe Connect — incentiva criadores PT.
44. **Comunidades pagas** — fundador define mensalidade, Lusorae fica com 15%.
45. **Anúncios contextuais respeitosos** (não rastreamento) — formato editorial, "Apoiado por", aprovado manualmente.
46. **B2B "Lusorae para Municípios"** — câmaras municipais publicam eventos com badge institucional (€500/mês).
47. **B2B "Lusorae para Media"** — RTP, Público, Observador têm contas verificadas e API de leitura (€1.5k/mês).
48. **Cosmetics premium** (já existe namespace `/cosmetics`) — temas, frames, emojis exclusivos (€0.99-€4.99).
49. **Lusorae+ Educação** — instituições de ensino criam comunidades fechadas (€2/aluno/ano).
50. **API pública para investigadores** — €99/mês (DSA art. 40) — accesso a dataset agregado.

---

## 3 · TOP 50 — FUNCIONALIDADES A **MELHORAR**

### UX Core (1-15)
1. **Composer atual tem 12 estados** — reduzir a 4: rascunho, draft saved, publishing, published.
2. **Empty states accionáveis** — todos os "Feed vazio", "Sem mensagens", "Sem comunidades" devem ter CTA primário visível.
3. **Onboarding mais curto** (já tem 3 interesses; adicionar "sugerimos seguir 5" com pré-selecção).
4. **Performance do Feed** — paginar a 20 posts (não 40), lazy-mount widgets, virtualizar lista.
5. **Composer com markdown preview** lado-a-lado em desktop, toggle em mobile.
6. **Notificações com agrupamento + timeline** (similar GitHub) em vez de lista plana.
7. **Mensagens com indicador "a escrever..."** (presence via WS já existe, reutilizar).
8. **Search com sugestões em tempo real** (autocomplete com debounce 200ms).
9. **Profile editing inline** (Twitter-style) em vez de modal.
10. **Avatar uploads** com crop+rotate built-in (não link externo).
11. **Image picker multi-upload** no composer (drag-drop em batch).
12. **Acessibilidade WCAG AA** — auditar contraste, focus rings, screen readers.
13. **Dark mode** — fundamental para uso nocturno.
14. **Mobile gestures** — swipe-to-reply, swipe-to-bookmark, double-tap-like.
15. **Tour interactivo** primeira sessão (3 tooltips: feed, composer, comunidades).

### Arquitectura Técnica (16-30)
16. **Refactor `server.py` 17K linhas → 20+ routers** (waitlist.py, invites.py, push.py, mesa_inner.py, charms.py, etc.) — ver Secção 9.
17. **Migrar para Pydantic v2 modelos com BaseDocument + PyObjectId** (já há regra em PRD para isto).
18. **Adicionar pytest com cobertura ≥70%** (já existe `/app/backend/tests`, expandir).
19. **MongoDB indexes auditados** — actualmente improvisados em startup; criar `init_indexes.py` central.
20. **MongoDB TTL audit** — confirmar que `auth_events`, `pulse_snapshots`, `notifications` antigas expiram.
21. **Redis cache layer** para `/api/explore`, `/api/trending`, `/api/pulse/*` (cachear 60s).
22. **Background worker separado** (Celery/Dramatiq) para reputation + pulse loops (não bloquear event loop).
23. **Rate limiting por endpoint sensível** (já existe wrapper; auditar coverage).
24. **Observability** — logs estruturados JSON, Prometheus metrics, Sentry para erros.
25. **CI/CD pipeline** — GitHub Actions com lint+test+deploy a staging.
26. **Sentry integration** — capturar exceptions frontend+backend.
27. **Health endpoints específicos** — `/api/health/db`, `/api/health/ws`, `/api/health/pulse`.
28. **Versionamento de API** — prefixo `/api/v1/` consistente; deprecar `api2` legado.
29. **Schema validation com `BaseDocument`** central + auto-migrations Mongo.
30. **Frontend bundle size audit** — actual `main.js` provavelmente > 500KB, alvo < 250KB inicial.

### Confiança & Moderação (31-40)
31. **Automod com ML não-regex** — actual `automod_pt.py` é regex; treinar classifier PT pequeno (Hugging Face).
32. **Sistema de reports com SLA visível** — "Resposta em 24h".
33. **Moderação distribuída** — utilizadores Trust&Safety com permissões delegadas.
34. **Quarentena soft** — posts suspeitos visíveis ao autor mas escondidos do feed até review.
35. **Score de risco visível ao moderador** (não ao user) com explanation.
36. **Appeals process** — direito de contestar moderação (DSA art. 20).
37. **Reports anti-abuse** — limitar reports por user para evitar weaponização.
38. **Identidade verificada opcional** (cartão cidadão / IBAN check / linkedin) — não obrigatório, mas badge.
39. **Filtros de conteúdo por user** (gore, política, NSFW) com defaults conservadores PT.
40. **Centro de transparência DSA expandido** — relatórios mensais com números reais.

### Admin & Operações (41-50)
41. **Admin cockpit com gráficos** (Recharts já carregado, mas underutilizado).
42. **Broadcast com segmentação** (cidade, interesses, idade da conta).
43. **Audit log searchable** — actual append-only, falta UI de query.
44. **Bulk moderation tools** — accionar 50 posts em lote.
45. **A/B testing framework** — actual feature flags ad-hoc; centralizar em `entitlements.py`.
46. **Dashboard de unit economics** (CAC, LTV, churn, ARPU).
47. **DataDog/Plausible** para analytics RGPD-compliant (já há PostHog consent-gated; expandir).
48. **Export GDPR self-service** ("Pede os teus dados") — botão em Settings que gera ZIP.
49. **Delete account com período de graça** (14 dias para reverter).
50. **Migration scripts versionados** — Mongo não tem schema, mas precisa de migrações de dados.

---

## 4 · TOP 50 — FUNCIONALIDADES A **REMOVER**

> *Critério: complexidade > valor, código órfão, features que confundem o utilizador novo.*

### Já removidas nesta sessão (não contam para o 50)
- ❌ Topologia (mapa social vivo) — confuso, sem retenção mensurável.
- ❌ Mesas (conversas efémeras) — overlap com Mensagens.

### A REMOVER agora (1-25)
1. **Páginas órfãs `/visitors`, `/series/:id`, `/stories/archive`** se métricas mostrarem < 0.5% uso semanal.
2. **`SeriesPage`** se ninguém criou série em 60 dias.
3. **Bookmark Collections** — colapsar em lista única (já no backlog P2).
4. **Stories sobre-engenheiradas** — manter Stories básico, remover camada "Highlights" + "Story Archive" se uso < 1%.
5. **`/feed/v2` paralelo** — consolidar com `/posts/feed` num único endpoint.
6. **API endpoints `/feed/mesa`** (inner-circle feed) — feature de 5 pessoas raramente usada.
7. **6 motores algorítmicos paralelos** — fundir Pulse Engine + Community Pulse + Happenings num único `social_signals.py`.
8. **`pt_events_data.py`** com 71K bytes — externalizar para JSON em S3 + cache.
9. **`secret_loader_adapters.py`** se nenhum vault (Doppler/AWS/GCP) for usado em produção próxima.
10. **`log_redaction.py`** — se não há logs em ficheiro PII em produção, pode ser simplificado.
11. **`community_health.py`** + **`community_rhythm.py`** se redundantes face a `community_pulse.py`.
12. **Endpoints `/api/charms/*`** se charms forem cosmética interna não promovida.
13. **Endpoint `/api/temperature`** — sem clareza de uso, candidato a remoção.
14. **`/api/bairro/*`** — overlap com `/api/communities/*` (mesma noção).
15. **`/api/cosmetics/*`** se não houver monetização ligada (paradoxo: ou monetizar JÁ, ou remover).
16. **`/api/highlights/*`** — overlap com pinned posts em perfil.
17. **`/api/notes/*`** — feature pessoal que cabe em drafts.
18. **`/api/starter-packs/*`** se onboarding já sugere contas (overlap).
19. **`/api/diaspora/*`** se ainda não tem cidades PT-FR/PT-UK seedadas.
20. **`/api/catalog/*`** — namespace pouco claro, auditar uso.
21. **AdminLayout separado** — fundir com Layout principal com role-check (menos código duplicado).
22. **Drafts.js + Scheduled.js separados** — fundir num único `/composer/queue`.
23. **`/legal/historico`, `/legal/seguranca-investigadores`** — manter mas mover para `/legal/sobre-nos` consolidado se uso < 50/mês.
24. **AnnouncementBanner global** se nunca houver anúncio activo em prod (lazy carregar).
25. **`/legal/governance`** se já coberto em `/legal/dsa-transparency`.

### Código a apagar (26-40) — refactor cleanup
26. **`pages/auth/AuthDecor.js`** (já é shim, completar deprecação).
27. **`EditorialMasthead StripDesktop`** (já é no-op, remover).
28. **`ActivityTicker` órfão** se totalmente substituído por `ActivityWidget`.
29. **Imports não usados em `Layout.js`** após onboarding refactor.
30. **`api` vs `api2` routers paralelos** — consolidar num só.
31. **WebSocket handlers para `mesa_message`** (já não aplicável).
32. **CSS legacy `card-lux`** se já não usado.
33. **Variáveis `today` órfãs** em LeftSidebar (já corrigido no PRD).
34. **Funções helper duplicadas** em server.py (`now_iso` definido várias vezes?).
35. **Tests obsoletos** referentes a `mesas` efémeras (`test_v3_features.py` linhas que não são inner-circle).
36. **`/api/automod/check`** debug endpoint — esconder atrás de `is_admin` ou remover em prod.
37. **`/api/push/test`** — apenas dev, deve estar atrás de admin flag.
38. **JWT_AUDIENCE default ad-hoc** (`f"lusorae-app:{APP_ENV}"`) — explicitar em env, não inferir.
39. **Ficheiros `.pyc` em `__pycache__`** comprometidos no repo (verificar `.gitignore`).
40. **CSS classes mortas** (`lusorae-pulse`, etc.) — auditar com PurgeCSS.

### Conceitos a esconder até validação (41-50)
41. **Premium page visível sem checkout funcional** — esconder até Stripe estar ligado.
42. **`/visitors`** se sem dados (analytics interno deve ser admin-only).
43. **Reputation Engine UI** se score é invisível por design — confirmar UI nunca o expõe.
44. **Charms catalog público** se não há valor sem ter contas activas.
45. **Calendar PT mobile** se eventos < 5 visíveis (mostrar apenas em desktop até ter content density).
46. **Search avançado** se backend não suporta full-text (Atlas Search desactivado).
47. **`/api/admin/cockpit/timeline`** se admin não usa.
48. **DSA transparency dashboard público** até ter dados reais para mostrar.
49. **API pública não documentada** — esconder endpoints internos do OpenAPI schema.
50. **Beta features em produção** — qualquer flag `experimental:true` desligada por default.

---

## 5 · TOP 50 — FUNCIONALIDADES A **ESCONDER**

> *Critério: fica no código mas atrás de feature flag, role-check, ou A/B test. Reduz "AI slop" cognitivo do utilizador novo.*

### Esconder até onboarding completo (1-15)
1. **Trending sidebar** — só mostrar após 1ª publicação do utilizador.
2. **Comunidades sugeridas** — só após 3 follows.
3. **Drafts/Scheduled** — só se user tem ≥1 rascunho.
4. **Highlights** — só em perfis com ≥10 posts.
5. **Series** — só visível ao autor até publicar 3 episódios.
6. **Calendar PT** — só se user activou notificações.
7. **Stories arquivo** — só após 1ª story publicada.
8. **Notification settings granular** — começar com "tudo on", expor depois.
9. **Cosmetics** — esconder até Premium estar funcional.
10. **Charms catalog completo** — mostrar só os 3 mais perto de unlock.
11. **Reputation badges** (se existirem) — apenas no perfil próprio, não em outros.
12. **Visitors** — admin-only ou Premium-only.
13. **DSA transparency** — manter em footer, não no menu primário.
14. **Manifesto** — accessível mas não in-your-face na Landing.
15. **Centro Legal completo** — link único no footer, não 13 entradas separadas.

### Esconder em mobile primeiro load (16-30)
16. **3 widgets sidebar simultâneos** — em mobile, 1 widget rotativo.
17. **Activity Ticker** — só desktop.
18. **EditorialMasthead** — já removido, confirmar.
19. **Hero "Notícias reais"** — A/B test contra hero limpo (já removido, manter).
20. **Floating action buttons múltiplos** — máximo 1 FAB.
21. **Mobile bottom nav** — máximo 5 slots, nunca 6 (já respeitado).
22. **Animações entrada complexas** — desactivar em `prefers-reduced-motion`.
23. **Push permission banner** — só após 3ª sessão.
24. **Cookie banner** — único, dispensável após consent (não persistir UI após accept).
25. **Founder badge** — só visível a outros após user ter 3 invites aceites confirmados.
26. **Avatar large hero** em perfis novos sem foto.
27. **Search bar duplicado** desktop+mobile — usar slash command `/`.
28. **Notifications dropdown extensivo** — colapsar até 10 itens.
29. **Sidebar footer "Sobre/Legal/DMs/Settings"** — usar drawer único do avatar.
30. **Tag pages sem posts** — esconder até haver ≥1 post.

### Esconder de utilizadores não-engajados (31-40)
31. **Comunidades sem posts em 7 dias** — esconder do `/communities` list.
32. **Trending tags sem volume** — não mostrar se < 5 posts/24h.
33. **Suggestions sem matches** — esconder card "Para seguir" se 0 resultados.
34. **Pulse widget sem actividade** — esconder em vez de "nada a mostrar".
35. **Calendar com 0 eventos** — collapse com "Sem eventos próximos".
36. **Stories bar vazia** — não mostrar a bar de stories se 0 stories.
37. **Bookmark CTA em posts** se user já bookmarkou (sticky state).
38. **Reply CTA em posts congelados** (frozen replies) — usar copy diferente.
39. **Edit own post** — só primeiros 15min após publicar.
40. **Delete account** — esconder atrás de Settings > Conta > Avançado.

### Esconder por questões de privacidade/segurança (41-50)
41. **Email do user em perfil público** — nunca expor.
42. **Localização precisa** — apenas cidade, nunca freguesia/coordenadas (já garantido).
43. **`is_admin` flag** — nunca exposto em payload público (auditar).
44. **`health_score` de reputação** — invisível por design, confirmar nunca leakar.
45. **Lista de IPs em audit log** — admin-only com role-check.
46. **JWT em URL/logs** — nunca, redacted automaticamente.
47. **Stripe customer_id** — backend-only, não no DTO público.
48. **Push endpoints VAPID subscription** — não enumeráveis, hash-only public.
49. **Lista de quem bloqueou quem** — privado, sem inferência cruzada.
50. **Lista de seguidores em conta privada** — só amigos mútuos vêem.

---

## 6 · O QUE FALTA PARA CRESCER

### 6.1 Aquisição
- **SEO inexistente.** Páginas `/p/:id` e `/u/:username` deviam ser indexáveis sem login. Hoje Google não consegue rankear nada.
- **Programa de embaixadores.** 100 jornalistas/curadores PT com badge dourado, dashboard de impacto, convites ilimitados.
- **Diaspora estrategicamente.** 700K portugueses em França tropeçam em Twitter; Lusorae em pt-PT é uma proposta única.
- **Parcerias institucionais.** Câmara de Lisboa, Câmara do Porto, Visit Portugal — eventos oficiais publicados primeiro no Lusorae.
- **PR strategy.** Manifesto + posicionamento "alternativa portuguesa, RGPD-first, DSA-compliant" tem ângulo editorial óbvio (Público, Observador, Expresso).

### 6.2 Activação
- **Onboarding actual: 3 interesses → feed.** Adicionar passo "sugerimos seguir estas 5 contas" pré-selecionadas (skip optional).
- **Primeira publicação assistida.** Composer com prompt do dia ("Que está a acontecer no teu bairro?") para destravar.
- **Convite de fricção zero.** Deep-link com nome do convidador + post de exemplo.

### 6.3 Retenção
- **Email lifecycle (Welcome, D1, D3, D7, D14, win-back D30).** É a única alavanca comprovada — Mailchimp/Resend → 25-40% reactivação.
- **Push schedulada** (não apenas reactiva). Manhã: notícias da cidade. Noite: highlights do dia.
- **Digest semanal personalizado.** "Esta semana no teu bairro" + posts mais comentados.
- **Streaks**, **badges acessíveis**, **micro-celebrações** — sem cair em gamificação cínica.

### 6.4 Referral / Viralidade
- **Convites peer-to-peer** já implementado (badge fundador). Falta:
  - Leaderboard mensal "Top embaixadores".
  - Reward extra para top inviter (Premium grátis 12 meses).
  - Tracking attribution end-to-end (saber qual referral converte D30+).
- **Quote-share** com camada de comentário do user (Twitter-style).
- **Partilha cross-platform** com OG images dinâmicas (LinkedIn, WhatsApp).

### 6.5 Monetização (vazio total)
- **Premium €4/mês com Stripe** — destrava cosmetics, sem-anúncios, criar comunidade premium.
- **Tipping em posts** (€1, €3, €5) com Stripe Connect — paga aos criadores.
- **B2B Municípios** (€500/mês) e B2B Media (€1.5k/mês).
- **Comunidades pagas** (15% take rate).
- **Marketplace de newsletters** (70/30 split).
- **API para investigadores** (€99/mês, DSA compliance argumento).

---

## 7 · DIFERENCIAÇÃO COMPETITIVA

### vs Twitter/X
- ✅ Sem algoritmo opaco "Para ti" (feed cronológico único — manifesto promete).
- ✅ Sem rage-bait monetizado.
- ✅ pt-PT first, não tradução.

### vs Threads
- ✅ Conteúdo cívico/cultural, não lifestyle Meta-style.
- ✅ Comunidades reais (não só feed).
- ✅ Sem dependência da Instagram.

### vs BlueSky/Mastodon
- ✅ UI editorial, não tech-first.
- ✅ Onboarding < 30s, não 3 minutos.
- ✅ Foco geográfico (PT/diaspora), não global federado.

### Vantagem injusta a explorar
1. **Diaspora portuguesa global** (1.5M-2M endereçáveis).
2. **Conteúdo institucional PT** (Câmaras, RTP, ICA, DGS, Visit Portugal).
3. **Marca "feita em Portugal, RGPD-first"** — argumento ímpar pós-Cambridge Analytica/X-degradation.

---

## 8 · ROADMAP 90 DIAS (P0, P1, P2)

### 🔴 Sprint 1 (Semanas 1-2) — Tirar bloqueios de monetização e retenção
1. **Stripe checkout funcional** (price IDs reais, webhook /api/webhooks/stripe).
2. **Email lifecycle (Resend ou SES)** — Welcome + D1 + D7 + win-back D30.
3. **OG images dinâmicas por post** (Cloudflare Workers ou serverless).
4. **SEO básico** — sitemap, robots.txt, structured data, public `/p/:id` sem auth.

### 🟠 Sprint 2 (Semanas 3-4) — Acelerar retenção
5. **Digest semanal por email** ("Esta semana no teu bairro").
6. **Push schedulada manhã/noite** (escolha do user em settings).
7. **Streaks visíveis** + micro-celebrações primeira publicação/follower.
8. **Reactions além de like** (👏 🇵🇹 🤔 💡).

### 🟠 Sprint 3 (Semanas 5-6) — Refactor técnico crítico
9. **Split `server.py` em routers** (waitlist.py, invites.py, push.py, charms.py, communities.py, posts.py, admin.py, pulse.py).
10. **Pydantic v2 com BaseDocument + PyObjectId** consistentemente.
11. **Pytest cobertura ≥70%**.
12. **Indexes Mongo auditados + TTL coverage**.

### 🟡 Sprint 4 (Semanas 7-8) — Crescimento
13. **Login social Google** (Emergent-managed) para reduzir fricção mobile.
14. **Quick-share buttons** em cada post (WhatsApp, X, LinkedIn, Threads).
15. **Programa Embaixadores (100 jornalistas/curadores)** — badge dourado + dashboard impacto.
16. **Landing temáticas** (`/para-jornalistas`, `/para-municipios`).

### 🟡 Sprint 5 (Semanas 9-10) — Confiança & Compliance
17. **Automod ML PT** (substituir regex por classifier Hugging Face).
18. **Appeals process** (DSA art. 20) — UI + endpoint.
19. **Export GDPR self-service** ("Pede os teus dados") em Settings.
20. **Delete account com 14 dias graça**.

### 🟢 Sprint 6 (Semanas 11-12) — Monetização B2B + cleanup
21. **B2B Municípios MVP** (€500/mês) — landing + dashboard cliente + 3 câmaras piloto.
22. **B2B Media** — verificação RTP/Público/Observador.
23. **Marketplace Cosmetics** (€0.99-€4.99) — temas, frames, emojis.
24. **Remover features mortas** (Cosmetics se não monetizadas, Charms se não promovidos, Series se uso < 1%, Stories Archive, etc.).
25. **A/B testing framework** centralizado.

**Meta 90 dias:** MAU 5K, D7 retention 35%, ARPPU €4, 50 comunidades activas, 3 clientes B2B pagos.

---

## 9 · ROADMAP 12 MESES (Q1-Q4)

### Q1 (Meses 1-3): **Foundation & Monetization**
- Tudo do roadmap 90 dias acima.
- **Outcome:** primeira receita real (€2-5k MRR via Premium + 3 B2B clientes).

### Q2 (Meses 4-6): **Growth Engine**
- **Programa Embaixadores escalado** (500 criadores PT).
- **Diaspora targeting** (PT-FR + PT-UK como geo-rotas separadas).
- **App Stores** (PWA → TWA → Play Store; explorar iOS bridge).
- **Referral attribution analytics** end-to-end.
- **Newsletter platform interna** (criadores podem enviar emails aos seguidores opt-in).
- **Outcome:** MAU 25K, MRR €15-25k.

### Q3 (Meses 7-9): **Editorial & Depth**
- **Edição colaborativa** (Google Docs style) — diferenciador único.
- **Audio posts** (60s + transcrição Whisper).
- **Threads multi-post** (até 10 posts encadeados).
- **Anotação social** (highlight + comment inline).
- **Mapa cívico interactivo** (causas reais, não Topologia abstracta).
- **API pública para investigadores** (€99/mês, DSA argumento).
- **Outcome:** MAU 75K, MRR €50k, 1 parceiro media tier-1 (Público ou Observador).

### Q4 (Meses 10-12): **Scale & Defensibility**
- **Refactor arquitectural completo** — microserviços para Pulse, Notifications, Push (event-driven).
- **Internacionalização** (pt-BR, pt-AO, pt-MZ).
- **Identidade verificada opcional** (Cartão Cidadão + LinkedIn check) com badge.
- **Comunidades pagas** (fundador define mensalidade, take 15%).
- **Tipping em posts** (Stripe Connect, criador-paid).
- **Series 2.0** convertível em ePub/PDF (autopublicação).
- **Outcome:** MAU 200K, MRR €150k, 10 parceiros institucionais, modelo de unit economics provado.

**Visão 12 meses:** Lusorae é *a* praça pública digital em pt-PT, com 200K MAU, €1.8M ARR, time-to-revenue por criador < 30 dias.

---

## 10 · REFACTOR TÉCNICO PRIORITÁRIO

### 10.1 Backend
- **`server.py` (17K linhas)** → dividir em:
  ```
  /app/backend/
    routers/
      auth.py, users.py, posts.py, comments.py, feed.py, notifications.py,
      messages.py, communities.py, explore.py, trending.py, search.py,
      bookmarks.py, drafts.py, charms.py, badges.py, cosmetics.py,
      waitlist.py, invites.py, push.py, pulse.py, automod.py,
      admin.py, billing.py
    models/
      base.py (BaseDocument, PyObjectId), user.py, post.py, community.py, ...
    services/
      pulse_engine.py, community_pulse.py, happenings.py, reputation.py
    tests/
      ... (já existe, expandir)
    main.py (FastAPI app, montagem de routers)
  ```
- **Pydantic v2 BaseDocument** com `from_mongo()` / `to_mongo()` consistente.
- **Indexes centralizados** em `init_indexes.py` chamado no startup.
- **Background tasks** isolados (Pulse, Reputation) para não bloquear event loop.

### 10.2 Frontend
- **Bundle audit** — main.js < 250KB initial.
- **Tree-shake** Lucide icons, Radix UI (importar individualmente).
- **Lazy-load** widgets do FeedAside (já parcialmente feito via IntersectionObserver).
- **Service Worker** com cache strategies (NetworkFirst para `/api`, CacheFirst para assets).
- **CSP headers** restritivos (XSS defence-in-depth).

### 10.3 DevOps
- **CI/CD pipeline** (GitHub Actions) — lint + test + smoke + deploy staging.
- **Sentry** frontend + backend.
- **Plausible/PostHog** consent-gated (já há base).
- **Prometheus metrics** custom (auth_events, post_creation_rate, ws_connections).

---

## 11 · A ÚNICA DECISÃO MAIS CRÍTICA PARA O SUCESSO

> **Lançar email lifecycle + Stripe checkout funcional + 100 criadores embaixadores na mesma semana, e parar tudo o resto.**

Tudo o resto neste documento — refactor, ML automod, mapa cívico, audio posts, edição colaborativa — pode esperar 90 dias. **Mas se nas próximas 4 semanas não houver:**

1. **Email a chegar 24h após registo** (Welcome) e 7 dias depois (Win-back).
2. **Forma de pagar €4/mês** (Stripe) com cancelar em 1 clique.
3. **100 criadores PT identificáveis** a publicar diariamente (jornalistas, curadores culturais, professores, comediantes).

…então o produto está a desperdiçar cada euro de CAC e cada hora de engenharia. O Lusorae tem **motor de Fórmula 1** (386 endpoints, 6 engines algorítmicos, push VAPID, automod PT, DSA compliance) **mas estrada de terra batida** (sem retenção sistemática, sem receita, sem oferta inicial credível).

A engenharia já está feita. **Falta dar-lhe um piso onde correr.**

**Foco único nas próximas 4 semanas:**
- 1 dev backend → Stripe + Email lifecycle.
- 1 dev frontend → Onboarding compacto + OG images dinâmicas + SEO público.
- 1 founder/CEO → recrutar 100 embaixadores manualmente, à mão, com chamada de 15 min cada.

Tudo o resto é distração.

---

## 12 · MÉTRICAS QUE TÊM QUE PASSAR A SER MEDIDAS

### North Star Metric
**Posts originais publicados por DAU por dia** (proxy para vibrancy editorial real).

### Pirâmide AARRR
| Camada | Métrica | Alvo D90 | Alvo D365 |
|---|---|---|---|
| Acquisition | New signups/week | 500 | 5.000 |
| Activation | % com 1ª publicação em 24h | 40% | 60% |
| Retention | D7/D30 retention | 35% / 18% | 50% / 30% |
| Referral | K-factor (invites accepted / user) | 0.4 | 1.2 |
| Revenue | ARPU mensal | €0.50 | €4.50 |

### Health Indicators
- **WAU/MAU ratio** (stickiness) > 50% até D365.
- **Posts per active community / week** > 20.
- **Time-to-first-comment-received** (TTFC) < 4 horas em 70% dos novos posts.
- **Customer support response time** (DSA) < 24h em 95% dos casos.

---

## 13 · APÊNDICE — INSIGHTS POR PERSONA C-LEVEL

### CEO (visão produto-mercado)
> "O Lusorae está a confundir profundidade técnica com profundidade de produto. 386 endpoints é orgulho de engenheiro, não conversão de utilizador. Cortar 30% das features e investir 100% em retenção + monetização nas próximas 12 semanas."

### CPO (experiência)
> "O onboarding ainda assume que o utilizador 'sabe' o que é o Lusorae. Precisa de uma promessa em 5 segundos na Landing. Hero: 'A praça pública portuguesa. Sem algoritmo opaco, sem dono americano.' CTA: 'Entra com email'."

### CTO (sustentabilidade técnica)
> "`server.py` com 17K linhas é dívida activa. Cada PR ficará exponencialmente mais lento. Refactor em 25 routers nas próximas 6 semanas é não-negociável antes de adicionar feature nova significativa."

### Head of Growth
> "Falta toda a pirâmide AARRR instrumentada. Não há analytics de funnel. Não há email lifecycle. Não há referral attribution. Sem isto, qualquer marketing spend é dinheiro deitado fora."

### Head of Design
> "A UI editorial é única e bem feita (palavra-chave: editorial). Mas há demasiados widgets a competir pela atenção em mobile. Aplicar 'less is more' brutalmente: 1 widget central em mobile, máximo 3 em desktop."

### Head of Trust & Safety
> "Automod PT regex é frágil. ML classifier mínimo (DistilBERT-PT) substitui em 2 semanas. Appeals process (DSA art. 20) é obrigatório legal — implementar agora ou expor-se a multas EU."

### Head of Monetization
> "Premium page existe, mas é vapor. Sem Stripe checkout funcional, é pior que nada — destrói confiança. Activar OU esconder a página. Não há terceira opção."

---

## 14 · CONCLUSÃO

O Lusorae é um **produto tecnicamente excelente em busca de uma promessa comercial executada**.

Tem fundações que rivalizam Substack + Discord + Twitter combinados. Mas precisa cortar 30% das features, parar de adicionar motor algorítmico novo, e gastar os próximos 90 dias a **fazer dinheiro, fazer retenção, e recrutar embaixadores**.

A janela competitiva (pt-PT, RGPD-first, DSA-compliant, anti-X-degradation) está aberta por **12-18 meses**. Depois disso, Threads ou um novo player vai capturar este espaço.

**A pergunta a fazer todas as segundas-feiras da próxima década:**

> *"Esta semana, fizemos o Lusorae mais fácil de pagar, mais difícil de abandonar, e mais credível para os melhores 100 criadores portugueses?"*

Tudo o resto é ruído.

---

*Auditoria preparada pelo PROJECT EVOLUTION ENGINE — análise estática + sessão de strategy.*
*Versão 1.0 · Junho 2026 · Lusorae*
