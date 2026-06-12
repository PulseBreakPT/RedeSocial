import { LegalShell } from "./LegalShell";
import {
    LegalKPIs, LegalVisualBlock, LegalRightsGrid, LegalSectionSummary, LegalContactsList,
} from "./_visuals";
import {
    Building2, Scale, ShieldCheck, Gavel, Users, BadgeCheck, Calendar,
    Flag, ShieldAlert, Mail, FileCheck, Clock,
} from "lucide-react";

const CONTACTS = [
    { subject: "Comunicação institucional do Conselho",    email: "governance@lusorae.pt", icon: Building2, ref: "Conselho de Integridade" },
    { subject: "Candidatura a membro externo independente", email: "governance@lusorae.pt", icon: BadgeCheck, ref: "Mandato bianual" },
    { subject: "Sugestões de tema para reunião trimestral", email: "governance@lusorae.pt", icon: Calendar,    ref: "Calendário de reuniões" },
    { subject: "Trust & Safety operacional",                  email: "abuso@lusorae.pt",      icon: ShieldAlert, ref: "Linha 24/7 incidentes" },
];

export default function Governance() {
    return (
        <LegalShell
            active="governance"
            title="Governança e Conselho de Integridade"
            subtitle="Quem decide o quê no Lusorae. Como funciona a equipa de Trust & Safety, qual a composição do Conselho de Integridade, qual o seu mandato, e como qualquer pessoa pode candidatar-se a membro externo ou sugerir temas para discussão."
            lastUpdated="Junho de 2026"
            eli5="As decisões difíceis sobre moderação, algoritmo, política editorial e crises não ficam na cabeça de uma pessoa. Passam por um processo formal, com pelo menos um voto externo independente. Esta página explica como."
        >
            <LegalKPIs items={[
                { value: "3 órgãos", label: "estrutura de governança",        sub: "T&S · DPO · Conselho",       icon: Building2 },
                { value: "≥ 1",      label: "membro externo independente",    sub: "Conselho de Integridade",   icon: BadgeCheck },
                { value: "4 reuniões/ano", label: "calendário regular",     sub: "Trimestral + extraordinárias", icon: Calendar },
                { value: "Sempre",    label: "atas públicas",                  sub: "Em /legal/historico",         icon: FileCheck },
            ]} />

            <div className="legal-callout">
                <strong>Princípio orientador</strong>
                Nenhuma decisão materialmente relevante é tomada por uma só pessoa, e nenhuma decisão de moderação
                pode ser apreciada em recurso pela pessoa que a tomou. A separação funcional é estrutural, não
                cosmética.
            </div>

            <h2>Três níveis de decisão</h2>
            <p>
                A governança do Lusorae divide-se em três níveis distintos, com competências próprias e
                interdependentes:
            </p>

            <LegalVisualBlock eyebrow="Estrutura interna" title="Quem decide o quê">
                <LegalRightsGrid items={[
                    {
                        title: "Equipa Trust & Safety",
                        desc: "Operação diária da moderação, triagem de denúncias, decisões individuais sobre Conteúdo e contas, em conformidade com os artigos 14.º, 17.º e 23.º do DSA. Pessoa qualificada com formação jurídica e ética.",
                        ref: "Operação · Diário",
                        icon: ShieldAlert,
                    },
                    {
                        title: "Encarregado de Proteção de Dados",
                        desc: "Independente, opera com autonomia funcional, parecer obrigatório em qualquer tratamento de risco elevado e na DPIA (art. 35.º RGPD). Comunicado à CNPD nos termos do art. 37.º, n.º 7.",
                        ref: "DPO · Independente",
                        icon: ShieldCheck,
                    },
                    {
                        title: "Conselho de Integridade",
                        desc: "Painel consultivo trimestral com pelo menos um membro externo independente, para decisões materialmente relevantes: alterações ao algoritmo, mudanças nas Diretrizes, decisões sobre crises, novas categorias de Conteúdo etiquetado.",
                        ref: "Estratégico · Trimestral",
                        icon: Gavel,
                    },
                ]} />
            </LegalVisualBlock>

            <h2>Equipa Trust & Safety</h2>
            <p>
                A equipa de Trust &amp; Safety é responsável pela operação corrente da moderação. As suas
                competências incluem:
            </p>
            <ul>
                <li>Triagem das notificações recebidas (artigo 16.º DSA), por ordem de gravidade e proporcionalidade;</li>
                <li>Decisão sobre casos individuais à luz dos <a href="/legal/terms">Termos</a>, das <a href="/legal/community">Diretrizes</a> e da lei aplicável;</li>
                <li>Emissão de Statement of Reasons fundamentado para cada decisão (artigo 17.º DSA);</li>
                <li>Apreciação dos recursos internos por pessoa diferente da que decidiu inicialmente (artigo 20.º, n.º 6, DSA);</li>
                <li>Comunicação com autoridades nacionais e europeias, em coordenação com o Ponto Único de Contacto (artigos 11.º e 12.º DSA);</li>
                <li>Resposta a sinalizadores de confiança certificados pela ANACOM (artigo 22.º DSA).</li>
            </ul>
            <p>
                A equipa de Trust &amp; Safety reporta funcionalmente à direção da Plataforma, mas as suas
                decisões individuais não estão sujeitas a aprovação prévia da direção, em coerência com o
                princípio da independência operacional da função.
            </p>

            <h2>Conselho de Integridade</h2>
            <LegalSectionSummary>
                Painel consultivo trimestral com pelo menos um membro externo independente. Não substitui a decisão da direção, mas vincula-a a uma fundamentação pública sempre que se afaste do parecer.
            </LegalSectionSummary>
            <p>
                O Conselho de Integridade reúne-se trimestralmente, em sessão ordinária, e em sessão
                extraordinária sempre que uma circunstância material o exija (crise reputacional, ordem de
                autoridade, alteração legislativa estrutural, incidente de segurança grave).
            </p>

            <h3>Composição</h3>
            <ul>
                <li><strong>Mínimo de três membros</strong>, em número ímpar, para garantir capacidade deliberativa;</li>
                <li><strong>Pelo menos um membro externo independente</strong>, sem relação contratual, societária ou familiar com o prestador, no momento da nomeação e durante todo o mandato;</li>
                <li><strong>Diversidade de competências</strong> recomendada: pelo menos uma pessoa com formação jurídica avançada, uma pessoa com formação técnica em sistemas de informação ou IA, e uma pessoa com experiência em ética, jornalismo, ciências sociais ou direitos humanos;</li>
                <li><strong>Mandato bianual</strong>, renovável uma única vez consecutivamente, com renovação parcial em cada ciclo para garantir rotação.</li>
            </ul>

            <h3>Competências</h3>
            <p>
                O Conselho não é um órgão executivo: a sua função é <strong>consultiva, qualificada e pública</strong>.
                As suas competências incluem:
            </p>
            <ul>
                <li>Apreciar, antes da entrada em vigor, alterações materialmente relevantes aos documentos do <a href="/legal">Centro Legal</a> (MAJOR no esquema de versionamento, ver <a href="/legal/historico">/legal/historico</a>);</li>
                <li>Apreciar, ex post, decisões de moderação com impacto público particularmente elevado, e emitir recomendações para a equipa de Trust &amp; Safety;</li>
                <li>Apreciar protocolos de crise (artigo 36.º DSA quando aplicável) e fazer recomendações sobre a sua ativação ou desativação;</li>
                <li>Pronunciar-se sobre alterações materiais aos algoritmos de feed, descoberta e recomendação, à luz dos artigos 27.º a 28.º do DSA;</li>
                <li>Receber, em sessão fechada, o relatório anual de auditoria interna e o relatório do DPO, e formular recomendações para a próxima auditoria.</li>
            </ul>

            <h3>Princípios de funcionamento</h3>
            <ul>
                <li><strong>Atas públicas</strong>, publicadas em <a href="/legal/historico">/legal/historico</a> no prazo de 30 dias após a reunião, com supressão estritamente necessária de informação confidencial (segurança operacional, dados pessoais);</li>
                <li><strong>Pareceres fundamentados</strong>, emitidos por escrito, com sumário executivo e voto de vencido quando aplicável;</li>
                <li><strong>Vinculação fundamentadora</strong>, a direção pode afastar-se de uma recomendação do Conselho, mas, sempre que o faça, deve publicar a sua decisão fundamentada nos 30 dias seguintes;</li>
                <li><strong>Conflito de interesses</strong>, qualquer membro deve declarar conflitos potenciais ou efetivos e abster-se de participar na deliberação correspondente;</li>
                <li><strong>Remuneração</strong> dos membros externos por presença em reunião, com publicação anual do valor agregado pago, no relatório de transparência (ver <a href="/legal/dsa-transparency">/legal/dsa-transparency</a>).</li>
            </ul>

            <h2>&laquo;Sala&raquo;, o espaço editorial público</h2>
            <p>
                A <strong>Sala</strong> é o espaço editorial público do Lusorae <em>dentro da própria Plataforma</em>.
                Tem identidade visual inequívoca e estatuto formal de canal institucional. Não recebe qualquer
                privilégio algorítmico no feed, na descoberta ou nas recomendações, e está sujeita às mesmas
                Diretrizes que qualquer outro Utilizador. É na Sala que publicamos:
            </p>
            <ul>
                <li>Anúncios de alterações materiais aos documentos do Centro Legal, com 15 dias de antecedência;</li>
                <li>Notas das reuniões do Conselho de Integridade;</li>
                <li>Relatórios de transparência DSA (em paralelo com a publicação em <a href="/legal/dsa-transparency">/legal/dsa-transparency</a>);</li>
                <li>Notas sobre incidentes de segurança e respostas a crises.</li>
            </ul>

            <h2>Candidatura a membro externo independente</h2>
            <p>
                Pessoas com perfil pertinente para o Conselho de Integridade podem candidatar-se em qualquer
                momento, escrevendo para <a href="mailto:governance@lusorae.pt">governance@lusorae.pt</a> com:
            </p>
            <ol>
                <li>Carta de motivação (até 2 páginas) explicando a razão da candidatura;</li>
                <li>Curriculum vitae sumário (até 2 páginas);</li>
                <li>Declaração de inexistência de conflitos de interesse (relação contratual, societária ou familiar com o prestador), ou descrição clara dos conflitos a gerir;</li>
                <li>Indicação da área de especialização principal e de eventuais áreas secundárias.</li>
            </ol>
            <p>
                As candidaturas são apreciadas pela direção em consulta com os membros em exercício do Conselho.
                As candidaturas não convidadas são acusadas no prazo de 30 dias úteis. Mantemos um arquivo
                interno das candidaturas para futura mobilização.
            </p>

            <h2>Sugestões de tema</h2>
            <p>
                Qualquer pessoa, com ou sem conta na Plataforma, pode sugerir temas para apreciação do Conselho de
                Integridade. As sugestões podem ser enviadas para{" "}
                <a href="mailto:governance@lusorae.pt">governance@lusorae.pt</a>. Não garantimos a inclusão de
                qualquer tema no calendário, mas comprometemo-nos a registar e arquivar todas as sugestões
                recebidas, e a publicar uma síntese anual dos temas mais frequentes.
            </p>

            <h2>Contactos</h2>
            <LegalContactsList items={CONTACTS} />
        </LegalShell>
    );
}
