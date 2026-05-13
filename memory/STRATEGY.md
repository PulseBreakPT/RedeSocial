# Vermillion — Estratégia de Retenção, Hábito e Comunidade
*Documento de produto · base behavioural psychology + social graph theory · aplicação direta à rede social portuguesa.*

> Sintetiza pesquisa profunda sobre TikTok, Snapchat, Reddit, Discord, Instagram, Threads, X e Facebook, aplicada ao contexto português (9,27 M utilizadores PT online em 2025; 87 % de uso diário 16-30 anos).

---

## PARTE I — Princípios psicológicos centrais

### 1. Os 3 graphs (e o 4.º que é nosso)
| Graph | Quem conecta | Plataforma-tipo | Função |
|---|---|---|---|
| Social | Amigos reais | Snapchat, FB | Obrigação social |
| Interest | Pessoas + interesses | TikTok, Reddit | Curiosidade infinita |
| Identity | Persona pública | X, Threads | Estatuto |
| **Place (Vermillion)** | **Geografia PT** | **— único** | **Pertença local** |

> Insight estratégico: nenhuma plataforma global domina o place graph PT (cidade · freguesia · região · emigrante). É a vantagem competitiva única.

### 2. Modelos canónicos
- **Fogg: B = M · A · P** — Motivação, Ability (atrito zero), Prompt
- **Hooked (Eyal):** Trigger → Action → Variable Reward → **Investment** (cada acção carrega o próximo trigger)
- **Reforço de razão variável (Skinner):** dopamina dispara na *antecipação*, não na recompensa
- **Loss aversion (Kahneman):** perda pesa 2,25× ganho — usado pelo Snapchat nas streaks
- **Identidade social (Tajfel):** ritual + signalling + in/out-group

### 3. Os 5 loops obrigatórios
| Loop | Pergunta | Mecânica core |
|---|---|---|
| Habit | "Porque abro?" | Variable reward + prompt |
| Identity | "Quem sou aqui?" | Bio + badges + flair + tribo |
| Social proof | "Estou visto?" | Reactions + replies |
| Creator/viewer | "Vale criar?" | Métricas + monetização |
| Belonging | "Onde está a minha mesa?" | Comunidade + ritual + linguagem |

---

## PARTE II — Teardowns relevantes

**TikTok** — interest graph; retention curve com hook 3s; qualified view 5s; rewatch ≈ 5–10× peso de likes; 5–10 interacções para calibrar FYP.
**Snapchat** — streaks 🔥 = loss aversion bilateral; Bitmoji = identidade visual investida.
**Reddit** — karma walls; lurker→commenter→mod ladder; meta-engagement.
**Discord** — presença em tempo real como social proof; server-as-tribe; primeiro hour determina retenção semanal.
**Instagram** — Close Friends (anel verde) = compartimentação de identidade.
**Threads** — caso negativo: forçar IG identity colapsou retenção (100M → 50M activos).
**X** — reply graph como performance pública.

---

## PARTE III — Features Vermillion (estado de implementação)

Legenda: ✅ implementado · 🟡 em curso · ⬜ planeado · ❌ descartado · 🔇 excluído por decisão do utilizador

### Loop 1 — Habit
| ID | Feature | Estado | Notas |
|---|---|---|---|
| F1.1 | **A Tarde** — digest único 18h30 com curadoria | ⬜ | Backend `/api/daily/digest` + banner no Feed |
| F1.2 | **Cafezinho** — sessão curta 60s 3 cards | ⬜ | Frontend modal/route opcional |
| F1.3 | Pull-to-refresh com som fado | ❌ | Descartado (low priority) |
| F1.4 | **Modo Boa Noite** — silenciar 23h-08h | ⬜ | Toggle Settings; default ON |

### Loop 2 — Identity
| ID | Feature | Estado | Notas |
|---|---|---|---|
| F2.1 | **Onboarding 60s** — 5 perguntas PT (cidade, mood, região, time, comunidades) | ⬜ | Reescrever `Register.js` |
| F2.2 | **Badges narrativos** — sazonais + ritualizados | ⬜ | Backend logic + display |
| F2.3 | **Bio slots** — 6 campos semânticos | ⬜ | Settings + Profile render |
| F2.4 | **Anel de identidade** — público / amigos / tasca | ⬜ | `audience_ring` em PostIn + UI |

### Loop 3 — Social Proof
| ID | Feature | Estado | Notas |
|---|---|---|---|
| F3.1 | **Reactions PT** — saudade / comove / tasca / bombou / café / orgulho | ⬜ | Substitui emoji genéricos no backend ALLOWED_REACTIONS |
| F3.2 | **Café receipts** — opt-in "li com calma, vou responder" | ⬜ | Messages.js |
| F3.3 | A vista da tasca — avatares em comunidade | ⬜ | Quick win Community.js |

### Loop 4 — Creator
| ID | Feature | Estado | Notas |
|---|---|---|---|
| F4.1 | **Middle-class boost** — 1.º post geo-boost + recompensa moderadores | ✅ | `/api/discover/new_voices` + `NewVoicesStrip` no Feed |
| F4.2 | **Repost curado** — mínimo 5 chars no repost | ✅ | Backend validation |
| F4.3 | Tasca premium (Stripe) | ❌ | Descartado nesta sprint (sem payment) |

### Loop 5 — Belonging
| ID | Feature | Estado | Notas |
|---|---|---|---|
| F5.1 | **Place graph** — city/freguesia/região no perfil; feed mixed-mode | ✅ | Campos no user + ponderação |
| F5.2 | **Sino do bairro** — evento local 1×/semana | ✅ | Notification logic |
| F5.3 | **Calendário PT** — Santo António, S.João, Carnaval, derbys, exames, IRS | ✅ | Utility + banner Feed |
| F5.4 | **Heat map saudade (diáspora)** | ✅ | `/api/diaspora/heatmap` + rota `/diaspora` |
| F5.5 | Salas de voz minuto | 🔇 | **EXCLUÍDO pelo utilizador** |

### Loop 3 (cont.) e Vista da Tasca
| F3.3 | **Vista da Tasca** — avatares em comunidade | ✅ | `/api/communities/{slug}/active` + componente em Community.js |

### Bonus — Manifesto público
| ID | Feature | Estado | Notas |
|---|---|---|---|
| MAN | `/manifesto` — 6 promessas anti-dark-pattern | ⬜ | Página pública + link no /legal |

---

## PARTE IV — Padrões escuros recusados (no manifesto)

1. **Sem streaks punitivos** (anti-Snapchat)
2. **Sem scroll infinito antes das 9h ou depois das 23h** (modo Boa Noite default)
3. **Sem notificações agrupadas a fingir urgência**
4. **Algoritmo reseteable + feed cronológico como opção** (cumpre DSA art. 27)
5. **Sem read receipts forçados** (opt-in apenas)
6. **Counts escondidos em posts próprios** (anti-comparação)

---

## PARTE V — Princípio de design interno

> *"Se o utilizador fechasse a app agora e voltasse amanhã, sentir-se-ia melhor ou pior consigo próprio?"*

Toda feature nova deve passar este teste. Se não passa, não lança.

---

## Roadmap execução (esta sprint)

**Implementar nesta sessão (excluindo voz):**
- ✅ STRATEGY.md (este documento)
- MAN: /manifesto
- F5.3: Calendário PT (utility + banner)
- F1.4: Modo Boa Noite (Settings)
- F3.1: Reactions PT (backend + frontend)
- F2.4: Anel de identidade (backend + frontend)
- F2.1: Onboarding 60s (Register.js + backend)
- F2.3: Bio slots + F5.1 place graph (Settings + Profile)
- F4.2: Repost curado (validação)
- F1.1: A Tarde (endpoint + banner)
- F5.2: Sino do bairro (notif lógica)
- F2.2: Badges narrativos (logic)
- F4.1: Middle-class boost (algo)
- F1.2: Cafezinho (rota)

**Backlog:**
- F3.2 Café receipts (DMs)
- F3.3 Vista da tasca (comunidades)
- F5.4 Heat map saudade
- F4.3 Tasca premium (futuro)
- F1.3 Som fado (futuro)
