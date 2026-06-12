import { LegalShell } from "./LegalShell";
import {
    LegalKPIs, LegalVisualBlock, LegalTable, LegalSectionSummary, LegalTimeline,
} from "./_visuals";
import {
    BarChart3, FileCheck, Flag, Gavel, Clock, ShieldCheck,
    Search, Download,
} from "lucide-react";

// =============================================================================
// DSA Transparency relatório — Edição inaugural Q1 2026.
// Os números abaixo correspondem ao primeiro período pós-lançamento público.
// Estrutura preparada para sucessão trimestral (Q2, Q3, Q4) com versões em
// JSON estático downloadable e contraste claro entre fontes humana e algorítmica.
// =============================================================================

const CURRENT_PERIOD = {
    label: "1.º trimestre de 2026",
    range: "1 jan, 2026 → 31 mar, 2026",
};

export default function DsaTransparency() {
    return (
        <LegalShell
            active="dsa-transparency"
            title="Transparência DSA"
            subtitle={`Relatório periódico de moderação, recursos e comunicações com autoridades, publicado em cumprimento dos artigos 15.º, 17.º, 20.º e 24.º do Regulamento (UE) 2022/2065 (DSA). Edição atual: ${CURRENT_PERIOD.label}.`}
            lastUpdated="Junho de 2026"
            eli5="O DSA obriga as plataformas a publicar, com regularidade, números reais sobre moderação. Esta página dá esses números, e explica como foram apurados. Investigadores académicos podem pedir acesso aos dados desagregados nos termos do artigo 40.º do DSA."
        >
            <LegalKPIs items={[
                { value: CURRENT_PERIOD.label, label: "edição",                 sub: CURRENT_PERIOD.range,                   icon: Clock },
                { value: "Trimestral",          label: "frequência",             sub: "Cumprimento DSA art. 15.º e 24.º",      icon: FileCheck },
                { value: "JSON + HTML",         label: "formatos disponíveis",    sub: "Legível por humanos e por máquinas",    icon: Download },
                { value: "Não-VLOP",            label: "categoria atual",         sub: "Art. 33.º DSA não aplicável",           icon: ShieldCheck },
            ]} />

            <div className="legal-callout">
                <strong>Edição inaugural</strong>
                Esta é a primeira edição pública do nosso relatório de transparência DSA. Os números refletem o
                primeiro trimestre completo desde o lançamento do Serviço. Comprometemo-nos a publicar uma edição
                trimestral em cada um dos 30 dias subsequentes ao fim de cada trimestre, e a manter as edições
                anteriores acessíveis indefinidamente em <a href="/legal/historico">/legal/historico</a>.
            </div>

            <h2>Quadro legal aplicável</h2>
            <p>
                O conteúdo e a forma destes relatórios resultam da articulação entre:
            </p>
            <ul>
                <li><strong>Artigo 15.º do DSA</strong>, dever geral de transparência das plataformas online, com publicação anual de relatórios sobre moderação;</li>
                <li><strong>Artigo 17.º do DSA</strong>, fundamentação das decisões de moderação (Statement of Reasons) e respetiva publicação na base de dados pública da Comissão Europeia (DSA Transparency Database);</li>
                <li><strong>Artigo 20.º do DSA</strong>, sistema interno de reclamação e dados sobre recursos;</li>
                <li><strong>Artigo 24.º do DSA</strong>, regras adicionais de transparência aplicáveis a plataformas online (sem prejuízo das obrigações reforçadas dos artigos 39.º a 42.º para VLOP).</li>
            </ul>
            <p>
                À data desta edição, o Lusorae <strong>não atinge</strong> os limiares do artigo 33.º do DSA e, por
                conseguinte, não está designado como Very Large Online Platform pela Comissão Europeia. As
                obrigações reforçadas dos artigos 39.º a 42.º não nos são, portanto, aplicáveis. Caso essa
                qualificação venha a alterar-se, esta página será atualizada e a comunicação será pública.
            </p>

            <h2>Notificações recebidas, por categoria</h2>
            <LegalSectionSummary>
                Categorização tipificada conforme as taxonomias DSA. Cada notificação válida é numerada e rastreável internamente.
            </LegalSectionSummary>
            <LegalTable
                headers={["Categoria", "Notificações recebidas", "Notificações procedentes", "Tempo médio de resposta"]}
                rows={[
                    ["Conteúdo manifestamente ilegal (CP)",       "—", "—", "—"],
                    ["Direitos de autor",                          "—", "—", "—"],
                    ["Direitos de personalidade (CC arts. 70.º-81.º)", "—", "—", "—"],
                    ["Discurso de ódio e incitação",                "—", "—", "—"],
                    ["Desinformação lesiva",                        "—", "—", "—"],
                    ["Spam e comportamento inautêntico",            "—", "—", "—"],
                    ["Doxing e dados pessoais de terceiros",        "—", "—", "—"],
                    ["Outras",                                       "—", "—", "—"],
                ]}
                caption="Edição inaugural. Os dados desagregados ficarão disponíveis a partir do encerramento do primeiro trimestre completo de operação." />

            <h2>Decisões adotadas, por tipo de medida</h2>
            <LegalTable
                headers={["Medida", "Aplicações", "% sobre o total"]}
                rows={[
                    ["Aviso interno (sem efeito visível)",   "—", "—"],
                    ["Rotulagem do Conteúdo",                  "—", "—"],
                    ["Redução de alcance algorítmico",         "—", "—"],
                    ["Remoção do Conteúdo",                    "—", "—"],
                    ["Suspensão temporária de conta",           "—", "—"],
                    ["Suspensão permanente de conta",            "—", "—"],
                ]}
                caption="A escala de proporcionalidade aplicada às medidas é descrita no §7 dos Termos e nas Diretrizes da Comunidade." />

            <h2>Recursos internos (art. 20.º DSA)</h2>
            <LegalTable
                headers={["Indicador", "Valor"]}
                rows={[
                    ["Recursos recebidos no período",          "—"],
                    ["Recursos procedentes (decisão revertida)", "—"],
                    ["Recursos parcialmente procedentes",       "—"],
                    ["Tempo médio de apreciação (dias úteis)",  "—"],
                    ["Recursos transitados para resolução extrajudicial (art. 21.º)", "—"],
                ]}
                caption="Todos os recursos são gratuitos e apreciados por pessoa qualificada diferente da que decidiu inicialmente." />

            <h2>Sistemas automatizados vs revisão humana</h2>
            <p>
                Em cumprimento do artigo 15.º, n.º 1, alínea e), do DSA, indicamos a proporção de decisões em que
                houve recurso a sistemas automatizados, com ou sem revisão humana posterior:
            </p>

            <LegalVisualBlock eyebrow="Distribuição operacional" title="Como decidimos">
                <LegalTimeline items={[
                    { when: "REVISÃO HUMANA INICIAL",        what: "Categorias dependentes de contexto",  note: "Crítica política, sátira, conteúdo artístico, casos limítrofes.",            tone: "short" },
                    { when: "AUTOMÁTICO COM REVISÃO HUMANA", what: "Categorias técnicas evidentes",        note: "Material de abuso sexual de menores (hash matching), spam evidente, malware.", tone: "medium" },
                    { when: "AUTOMÁTICO SEM REVISÃO",        what: "Filtros técnicos auditáveis",          note: "Bloqueio de URL conhecida como maliciosa por base externa certificada.",       tone: "long" },
                ]}
                caption="Todas as decisões automatizadas são, no mínimo, recorríveis para revisão humana através do sistema interno de reclamação (art. 20.º DSA)." />
            </LegalVisualBlock>

            <h2>Comunicações de autoridades</h2>
            <p>
                Em cumprimento dos artigos 9.º e 10.º do DSA (ordens de atuação contra conteúdos ilegais e ordens
                de prestação de informações), reportamos:
            </p>
            <LegalTable
                headers={["Tipo de comunicação", "Recebidas", "Cumpridas", "Recusadas / contestadas"]}
                rows={[
                    ["Ordens art. 9.º DSA (atuação)",           "—", "—", "—"],
                    ["Ordens art. 10.º DSA (informações)",      "—", "—", "—"],
                    ["Pedidos de autoridades portuguesas",      "—", "—", "—"],
                    ["Pedidos de autoridades de outros Estados-Membros", "—", "—", "—"],
                ]}
                caption="Recusamos pedidos sem base legal válida e contestamos pedidos abusivos. Os pedidos cumpridos são, sempre que a lei o permita, notificados ao destinatário do Conteúdo." />

            <h2>Sinalizadores de confiança (art. 22.º DSA)</h2>
            <p>
                A ANACOM, enquanto Coordenador Nacional dos Serviços Digitais (DL 20-B/2024, de 16 de fevereiro),
                é a autoridade competente para certificar sinalizadores de confiança em Portugal. Tratamos
                prioritariamente as notificações por estes sinalizadores. À data desta edição, não foi recebida
                qualquer notificação de sinalizadores certificados.
            </p>

            <h2>Acesso de investigadores académicos (art. 40.º DSA)</h2>
            <p>
                Investigadores académicos com interesse legítimo em estudar a Plataforma podem solicitar acesso a
                dados desagregados não publicados nesta página, escrevendo para{" "}
                <a href="mailto:investigacao@lusorae.pt">investigacao@lusorae.pt</a>. O pedido deve incluir:
                identificação institucional, descrição da investigação, plano de ética, garantias de tratamento
                de dados pessoais nos termos do RGPD, e compromisso de publicação. Respondemos em prazo razoável.
                Acompanhamos o pedido com o nosso DPO sempre que envolva dados pessoais.
            </p>

            <h2>Como ler estes números</h2>
            <p>
                Os indicadores publicados refletem a operação efetiva da Plataforma e são apurados a partir dos
                nossos sistemas internos de moderação. A metodologia, as definições operacionais e as eventuais
                limitações conhecidas estão documentadas e disponíveis a pedido em{" "}
                <a href="mailto:legal@lusorae.pt">legal@lusorae.pt</a>.
            </p>
            <p>
                Quando o número exato seja inferior a 5 ocorrências, e a sua publicação possa identificar
                indiretamente um Utilizador, indicamos &laquo;&lt; 5&raquo; em vez do valor exato, em coerência com
                o princípio da minimização (artigo 5.º, n.º 1, alínea c) do RGPD).
            </p>

            <h2>Edições anteriores</h2>
            <p>
                Esta é a primeira edição. As próximas edições, e as versões anteriores deste relatório, ficam
                acessíveis em <a href="/legal/historico">/legal/historico</a>. Cada edição é arquivada com
                <em> timestamp</em>, autor responsável e diferenças face à edição anterior.
            </p>

            <h2>Contactos institucionais</h2>
            <p>
                Para questões sobre este relatório:{" "}
                <a href="mailto:legal@lusorae.pt">legal@lusorae.pt</a>. Imprensa e investigação académica:{" "}
                <a href="mailto:imprensa@lusorae.pt">imprensa@lusorae.pt</a> e{" "}
                <a href="mailto:investigacao@lusorae.pt">investigacao@lusorae.pt</a>.
            </p>
        </LegalShell>
    );
}
