# Auditoria Jurídica SSS-Tier — Centro Legal Lusorae
**Data:** Junho 2026
**Estado dos documentos auditados (versão "Polish round 2"):**
- `/app/frontend/src/pages/legal/LegalIndex.js`
- `/app/frontend/src/pages/legal/Vision.js`
- `/app/frontend/src/pages/legal/Terms.js`
- `/app/frontend/src/pages/legal/Privacy.js`
- `/app/frontend/src/pages/legal/Cookies.js`
- `/app/frontend/src/pages/legal/CommunityGuidelines.js`
- `/app/frontend/src/pages/Manifesto.js`

**Profissões simuladas na análise:** advogado de direito digital português, DPO certificado, especialista DSA, compliance officer, advogado de consumo, UX writer, auditor jurídico, especialista ePrivacy, advogado de propriedade intelectual, information architect.

---

## TL;DR
- **Score global:** 7.4/10. Acima da média da indústria portuguesa.
- **Com correções P0+P1 (~1h trabalho):** 9/10.
- **3 erros bloqueadores** que impedem publicação em produção como está.
- **~12 gaps materiais** corrigíveis.
- **Sociedade ainda não constituída** → identificação societária (denominação registada, NIPC, morada, matrícula, capital social) está fora do âmbito do código (acção legal externa).

---

## 🔴 P0 — BLOQUEADORES (corrigir antes do go-live)

### P0.1 — Identificação societária em falta
**Onde:** `LegalIndex.js`, `Terms.js`, `Privacy.js`
**Problema:** Falta denominação social registada, NIPC, morada da sede, matrícula na Conservatória e capital social.
**Base legal:** Art. 10.º DL 7/2004 (comércio electrónico), Art. 11.º DSA, Art. 24.º e 171.º CSC.
**Status:** Placeholders foram removidos por estética. **NÃO é solução final.**
**Acção:** Após constituição da sociedade, injectar os dados reais nos 3 ficheiros (e em qualquer footer institucional do site).

### P0.2 — Lei n.º 32/2008 é citação inconstitucional
**Onde:** `Privacy.js` ~linha 185, dentro do `LegalTimeline` da secção "Prazos de conservação", item `{ when: "PRAZOS IMPERATIVOS", what: "Dados de tráfego (Lei n.º 32/2008)" }`.
**Problema:** Lei n.º 32/2008 declarada **inconstitucional** pelo Acórdão TC n.º 268/2022.
**Acção:** Substituir item por:
```js
{ when: "PRAZOS IMPERATIVOS", what: "Obrigações setoriais aplicáveis", note: "Quando estejamos vinculados a prazos legais específicos de conservação (obrigações fiscais, ordens judiciais, regimes setoriais), aplicam-se esses prazos.", tone: "long" }
```

### P0.3 — Plataforma ODR descontinuada (Reg. UE 2024/3228)
**Onde:**
- `Terms.js` linha ~214 (secção "Resolução extrajudicial e judicial")
- `LegalIndex.js` (LegalVisualBlock "Autoridades de controlo e resolução de litígios", item ODR)
- `CommunityGuidelines.js` (secção "Recurso e revisão" — "ODR" listed implicitly)
**Problema:** ODR descontinuada em 20/07/2025.
**Acção:** Substituir por *"meios alternativos de resolução de litígios de consumo certificados pela Direcção-Geral do Consumidor (DGC), nos termos da Lei n.º 144/2015"*. Remover o link `ec.europa.eu/consumers/odr` (e o icon ExternalLink associado).

### P0.4 — "Tribunal da Comarca" — terminologia jurídica obsoleta
**Onde:** `Terms.js` linha 334 ("Lei aplicável e foro")
**Problema:** Lei 62/2013 / DL 49/2014 substituiu "Tribunais da Comarca" por "Tribunais Judiciais de 1.ª Instância" com "Juízos".
**Acção:** Substituir por *"as partes elegem o Juízo competente em razão do território da sede social do prestador, no Tribunal Judicial respetivo, com expressa renúncia a qualquer outro"*.

---

## 🟠 P1 — ERROS / GAPS MATERIAIS

### P1.1 — Ponto Único de Contacto DSA em falta
**Onde:** Adicionar em `Terms.js` (nova secção entre "Identificação do prestador" e "Definições")
**Base legal:** Arts. 11.º + 12.º DSA.
**Acção:** Inserir secção:
```jsx
<h2>Ponto Único de Contacto (DSA)</h2>
<p>
  Nos termos dos artigos 11.º e 12.º do DSA, designamos os seguintes pontos
  únicos de contacto:
</p>
<ul>
  <li><strong>Autoridades nacionais e Comissão Europeia:</strong> <a href="mailto:legal@lusorae.pt">legal@lusorae.pt</a></li>
  <li><strong>Utilizadores:</strong> <a href="mailto:apoio@lusorae.pt">apoio@lusorae.pt</a></li>
</ul>
<p>
  Línguas de comunicação aceites: <strong>português europeu</strong> e <strong>inglês</strong>.
  Não exigimos a utilização exclusiva de meios automatizados — qualquer comunicação
  pode ser feita por correio electrónico nos endereços acima.
</p>
```

### P1.2 — Categoria DSA não declarada
**Onde:** `Terms.js`, na secção do P1.1 ou em "Identificação do prestador".
**Acção:** Adicionar parágrafo:
*"O Lusorae qualifica-se como **Plataforma Online** nos termos do art. 3.º, al. i) do DSA. Não é, à data, qualificada como Very Large Online Platform (VLOP) nos termos do art. 33.º do DSA."*

### P1.3 — DPO não declarado como comunicado à CNPD
**Onde:** `Privacy.js` ~linha 29-35 (secção "Encarregado de Proteção de Dados")
**Acção:** Adicionar frase final:
*"A designação do DPO foi comunicada à CNPD nos termos do artigo 37.º, n.º 7 do RGPD."*

### P1.4 — Definição "Utilizador" contraditória
**Onde:** `Terms.js` linha 34 (na `LegalTable` de Definições) vs linha 64.
**Problema:** Definição diz "≥13 anos", regra diz "≥16 anos".
**Acção:** Reescrever entrada da tabela:
```js
["Utilizador", "Pessoa singular com idade igual ou superior a 16 anos com conta registada, ou com 13 a 15 anos mediante autorização verificável dos representantes legais."],
```

### P1.5 — Limitação de responsabilidade — falta salvaguarda para consumidores
**Onde:** `Terms.js` linhas 267-273
**Base legal:** Art. 18.º e 21.º DL 446/85, Lei 24/96.
**Acção:** Adicionar parágrafo final à secção:
*"Esta limitação **não se aplica a consumidores** na aceção da Lei n.º 24/96, nem a danos resultantes da violação de direitos imperativos do consumidor, do RGPD, do DSA ou de outra legislação imperativa portuguesa ou da União Europeia."*

### P1.6 — Lei 36/2023 (transposição Diretiva 2019/790) em falta
**Onde:** `Terms.js` linha ~133 ("Notificações de conteúdo ilícito e Direitos de Autor")
**Acção:** Substituir *"Diretiva (UE) 2019/790 e da sua transposição nacional, sempre que aplicáveis"* por *"Diretiva (UE) 2019/790, transposta pela **Lei n.º 36/2023, de 7 de setembro**"*.

### P1.7 — EU-US Data Privacy Framework em falta
**Onde:** `Privacy.js` linhas 165-173 ("Transferências internacionais")
**Acção:** Adicionar à lista de garantias:
*"Decisão de Adequação da Comissão Europeia (incluindo o **EU-US Data Privacy Framework**, Decisão (UE) 2023/1795, para subcontratantes nos EUA aderentes ao Framework)."*

### P1.8 — Direitos de Personalidade não invocados
**Onde:** `CommunityGuidelines.js` (categorias "doxing", "assédio", "difamação", "stalking") e `Terms.js` (Condutas proibidas)
**Acção:** Adicionar referência cruzada *"Código Civil, artigos 70.º a 81.º (direitos de personalidade — nome, imagem, reserva da vida privada, integridade moral)"*.

---

## 🟡 P2 — DISTRIBUIÇÃO DE CONTEÚDO E COERÊNCIA

### P2.1 — "Inatividade prolongada e sucessão" na página errada
**Onde:** `Terms.js` linhas 308-320
**Acção:** Mover toda esta secção para `Privacy.js` (criar nova `<h2>Sucessão e inatividade</h2>` entre "Prazos de conservação" e "Decisões automatizadas"). Em Terms manter só uma frase: *"A sucessão da conta em caso de falecimento e o tratamento de contas inativas seguem o disposto na [Política de Privacidade](/legal/privacy)."*

### P2.2 — Direitos de Autor merecem página dedicada
**Onde:** `Terms.js` linhas 127-135
**Acção:** Mover para nova `/legal/copyright`. Em Terms manter só link.

### P2.3 — Sobreposição Manifesto vs Vision
**Onde:** `Manifesto.js` (6 promessas) e `Vision.js` (6 compromissos)
**Diagnóstico:** 3 dos 6 sobrepõem-se (algoritmo destacável, sem dark patterns, dados próprios).
**Acção:** Em `Vision.js`, na secção "Os seis compromissos", adicionar nota introdutória:
*"O **Manifesto** (/manifesto) operacionaliza estes compromissos a nível de produto — o que se traduz em regras concretas de engenharia (sem streaks, modo Boa Noite por defeito, etc.). Esta página descreve o **enquadramento institucional** desses compromissos."*

### P2.4 — Categoria "Marketing — vazia" é confusa
**Onde:** `Cookies.js` linha 81-86
**Acção:** Reformular descrição:
```js
{
  title: "Marketing e publicidade",
  required: false,
  icon: Megaphone,
  desc: "Reservada — sem cookies desta categoria nesta versão do Serviço. Se uma categoria desta natureza vier a ser introduzida no futuro, será comunicada com pelo menos 15 dias de antecedência e exigirá novo consentimento expresso. Nunca será apresentada a menores (art. 28.º DSA).",
  examples: "Sem cookies activos.",
}
```

### P2.5 — Métricas do `LegalIndex` desactualizadas
**Onde:** `LegalIndex.js`, campo `meta` dos CARDS (linhas 17, 26, 35, 44, 53, 62)
**Diagnóstico:** Os números *"21 secções · 14 min"* etc. foram escritos antes da refactorização. Manifesto card diz "~6 min" mas reading-meta real diz "4 min".
**Acção:** Recalcular contando `<h2>` em cada ficheiro e estimando reading time. Ou (melhor) extrair dinamicamente via manifest.json ou utility.
Estimativa actualizada por inspecção:
- Vision: 7 H2 · ~6 min
- Manifesto: 6 H2 · ~4 min
- Terms: ~20 H2 (incl. H3) · ~14 min
- Privacy: ~17 H2 · ~11 min
- Cookies: ~9 H2 · ~5 min
- Community: ~11 H2 · ~8 min

### P2.6 — Treino de IA mencionado só em Terms
**Onde:** `Terms.js` linha 117
**Acção:** Adicionar referência cruzada em `Privacy.js` (finalidades — quando aplicável, exige consentimento) e em `CommunityGuidelines.js` (deepfakes, IA passada como humano — já lá está, mas reforçar ligação).

### P2.7 — CTA "Criar conta" no Manifesto é conflict editorial
**Onde:** `Manifesto.js` linhas 162-220 (todo o bloco `<div data-testid="manifesto-cta-register-card">`)
**Diagnóstico:** O Manifesto é institucional/anti-marketing. CTA vermelho gigante usa credibilidade institucional para conversion — contradiz o tom.
**Acção:** Substituir o card completo por um link discreto inline. Exemplo:
```jsx
<p className="not-prose mt-12 mb-8 text-center text-[14px]" style={{ color: "rgba(10,10,10,0.55)" }}>
  Se este manifesto soa a algo que valha a pena experimentar,{" "}
  <Link to="/register" className="font-bold underline underline-offset-4" style={{ color: PT.red }}>
    podes criar conta aqui →
  </Link>
</p>
```
Remover também `data-testid="manifesto-cta-register-card"`, `data-testid="manifesto-cta-register"`, `data-testid="manifesto-cta-login"`.

### P2.8 — "Sala" e "Conselho de Integridade" sem definição
**Onde:** `Vision.js` linhas 113-117, 135
**Acção:** Duas opções:
- (a) Criar `/legal/governance` com composição, regulamento, atas
- (b) Adicionar nota inline em Vision: *"Composição, regulamento e atas publicadas em [/legal/governance](/legal/governance) (a publicar com a primeira reunião)."*

### P2.9 — Argumentação técnica frágil em Cookies analíticos
**Onde:** `Cookies.js`
**Acção:** Remover ênfase na pseudonimização como justificação. Manter texto factual: *"Cookies analíticos exigem consentimento. Aplicamos IP truncado como medida técnica complementar de minimização."*

---

## 🟢 P3 — INFORMATION ARCHITECTURE (páginas novas a criar)

### P3.1 — `/legal/dsa-transparency`
Relatórios DSA arts. 15.º + 24.º + 42.º:
- Notificações recebidas por categoria (mensal/trimestral)
- Decisões adoptadas (rotulagem, redução, remoção, suspensão)
- Tempos médios de resposta
- Decisões revertidas em recurso (art. 20.º DSA)
- Recurso a sistemas automatizados vs revisão humana
- Comunicações a autoridades

Implementação sugerida: ler JSON estático de `/api/legal/dsa-transparency` (mockable inicialmente). Mostrar tabelas + linha temporal.

### P3.2 — `/legal/copyright`
Notice & Takedown DMCA-like (CDADC + Lei 36/2023):
- Formulário estruturado (titular, obra protegida, URL infractora, declaração sob compromisso de boa-fé)
- Procedimento de contra-notificação
- Aviso sobre sanções por notificações abusivas
- Endereço dedicado `copyright@lusorae.pt` ou link `reportar@`

### P3.3 — `/legal/menores`
Versão simplificada para pais/menores:
- Linguagem acessível (B1 do Quadro Europeu de Referência)
- O que NÃO fazemos: profiling para publicidade, dados sensíveis, contagens viciantes
- Como os pais podem exercer direitos (autorização, retirada de consentimento, eliminação)
- Coerente com art. 28.º DSA + Carta dos Direitos Digitais (Lei 27/2021)

### P3.4 — `/legal/historico`
Histórico de versões de TODOS os documentos legais:
- Lista cronológica
- Diff visual (texto antigo vs novo)
- Razão da alteração
- Data e versão semântica
Cumpre a promessa do Manifesto de *"versões anteriores ficam no histórico"*.

### P3.5 — `/legal/seguranca-investigadores` (Responsible Disclosure)
Procedimento para investigadores de segurança:
- Endereço dedicado `seguranca@lusorae.pt`
- Compromisso de não retaliação
- Janela de divulgação coordenada
- Hall of Fame (opcional)
Cumpre o compromisso "testes de intrusão externos pelo menos uma vez por ano" + transparência.

### P3.6 — `/legal/governance`
- Composição da equipa Trust & Safety
- Composição do Conselho de Integridade (mesmo que inicial = 3 pessoas)
- Regulamento de funcionamento
- Calendário de reuniões e atas
Separa marketing institucional (Vision/Manifesto) de compromisso operacional.

---

## 📋 ORDEM DE EXECUÇÃO PROPOSTA

| # | Acção | Severidade | Esforço | Ficheiros afectados |
|---|---|---|---|---|
| 1 | Remover Lei 32/2008 | 🔴 P0 | 5 min | `Privacy.js` |
| 2 | Remover/substituir ODR | 🔴 P0 | 10 min | `Terms.js`, `LegalIndex.js`, `CommunityGuidelines.js` |
| 3 | "Tribunal da Comarca" → "Juízo da área da sede" | 🔴 P0 | 5 min | `Terms.js` |
| 4 | Definição "Utilizador" → 16 anos | 🔴 P0 | 5 min | `Terms.js` |
| 5 | Salvaguarda consumidores na limitação responsabilidade | 🟠 P1 | 5 min | `Terms.js` |
| 6 | Ponto Único Contacto DSA + categoria DSA | 🟠 P1 | 20 min | `Terms.js` |
| 7 | DPO comunicado à CNPD | 🟠 P1 | 2 min | `Privacy.js` |
| 8 | Lei 36/2023 + EU-US DPF | 🟠 P1 | 10 min | `Terms.js`, `Privacy.js` |
| 9 | Direitos personalidade (Código Civil 70-81) | 🟠 P1 | 10 min | `Terms.js`, `CommunityGuidelines.js` |
| 10 | Sucessão Terms → Privacy | 🟡 P2 | 15 min | `Terms.js`, `Privacy.js` |
| 11 | Categoria Marketing reformulada | 🟡 P2 | 5 min | `Cookies.js` |
| 12 | Manifesto: CTA register → link discreto | 🟡 P2 | 10 min | `Manifesto.js` |
| 13 | Nota Manifesto↔Vision em Vision | 🟡 P2 | 5 min | `Vision.js` |
| 14 | Recalcular métricas LegalIndex | 🟡 P2 | 15 min | `LegalIndex.js` |
| 15 | Tom Cookies analíticos | 🟡 P2 | 5 min | `Cookies.js` |
| 16 | Cross-ref IA training em 3 docs | 🟡 P2 | 10 min | `Privacy.js`, `CommunityGuidelines.js` |
| 17 | Nota "Sala"/"Conselho Integridade" | 🟡 P2 | 5 min | `Vision.js` |
| **TOTAL P0+P1+P2** | | | **~2h** | |
| 18 | Criar `/legal/copyright` | 🟢 P3 | 2h | nova route + ficheiro |
| 19 | Criar `/legal/menores` | 🟢 P3 | 2h | nova route + ficheiro |
| 20 | Criar `/legal/dsa-transparency` (estático) | 🟢 P3 | 3h | nova route + ficheiro + JSON mock |
| 21 | Criar `/legal/historico` | 🟢 P3 | 4h | nova route + ficheiro + dados |
| 22 | Criar `/legal/governance` | 🟢 P3 | 2h | nova route + ficheiro |
| 23 | Criar `/legal/seguranca-investigadores` | 🟢 P3 | 1.5h | nova route + ficheiro |
| **TOTAL P3** | | | **~14.5h** | |

---

## ⚠️ ITENS QUE DEPENDEM DE DECISÃO EXTERNA AO CÓDIGO

- **Constituição da sociedade Lusorae, Lda.** → obter NIPC, registar matrícula, definir capital social, registar morada da sede. Sem isto, **identificação societária P0.1 fica em standby**.
- **Comunicação do DPO à CNPD** → acto administrativo formal.
- **Designação do Ponto Único de Contacto DSA junto da ANACOM** → idem.
- **Composição do Conselho de Integridade** → decisão de governance.
- **Conteúdo real para `/legal/dsa-transparency`** → métricas operacionais reais (não pode ser mock indefinidamente).

---

## 🎯 SCORE POR PROFISSÃO (estado actual)

| Profissão | Score | Comentário |
|---|---|---|
| Advogado direito digital | 7.5/10 | 3 erros materiais corrigíveis |
| DPO | 8/10 | Falta comunicação CNPD |
| Especialista DSA | 7/10 | Ponto Único Contacto + categoria DSA em falta |
| Compliance Officer | 6.5/10 | Falta DSA Transparency + Governance |
| Advogado consumo | 7/10 | Falta salvaguarda na limitação responsabilidade |
| UX Writer | 9/10 | Excelente |
| Auditor jurídico | 6/10 | Identificação societária em falta |
| Especialista ePrivacy | 8/10 | Bem alinhado com CNPD 2022/1 |
| Advogado prop. intelectual | 7/10 | Falta página copyright dedicada |
| Information Architect | 8/10 | Sobreposição Manifesto/Vision |
| **MÉDIA GLOBAL** | **7.4/10** | **9/10 após P0+P1** |

---

## NOTAS PARA A PRÓXIMA SESSÃO

1. **Esta auditoria foi feita em Junho 2026** com base no estado dos ficheiros após "Polish round 2" (FAB voltar ao topo, ícones desambiguados, travessões removidos, títulos centrados).
2. Se o utilizador aprovar, **começar pela tabela acima na ordem 1→17** (P0+P1+P2, ~2h trabalho), depois decidir sobre P3.
3. **Não esquecer recalcular `meta` em `LegalIndex.js`** após qualquer mudança em quantidade de H2.
4. **Antes de qualquer commit final, validar com `testing_agent_v3_fork`** numa pass-through de todas as rotas legais para detectar regressões visuais ou de routing.
5. Manter o estilo já consolidado: títulos centrados, sec-n inline em vermelho, eli5 no shell, LegalTable responsivo, LegalSectionSummary em secções H2 complexas.

**Próxima pergunta a fazer ao utilizador na nova sessão:**
> "Vi a auditoria. Aplico P0+P1+P2 (~2h) já, ou prefere começar pelas páginas novas P3 (copyright, menores, governance, etc.)?"
