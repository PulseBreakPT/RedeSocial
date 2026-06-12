import { LegalShell } from "./LegalShell";
import {
    LegalKPIs, LegalVisualBlock, LegalLadder, LegalIconGrid, LegalSectionSummary, LegalTable,
} from "./_visuals";
import {
    ShieldCheck, ShieldAlert, Search, FileCheck, Clock, BadgeCheck,
    AlertTriangle, EyeOff, Lock, Ban, Mail, Flag, Slash,
} from "lucide-react";

export default function Seguranca() {
    return (
        <LegalShell
            active="seguranca"
            title="Segurança e Investigadores"
            subtitle="Procedimento de divulgação responsável (responsible disclosure) para vulnerabilidades de segurança. Compromisso de não retaliação, janela de divulgação coordenada, e reconhecimento opcional dos investigadores."
            lastUpdated="Junho de 2026"
            eli5="Se encontraste uma vulnerabilidade no Lusorae, esta é a porta correta. Garantimos: lemos, agradecemos, não te processamos, corrigimos no prazo combinado, e damos crédito público se assim quiseres."
        >
            <LegalKPIs items={[
                { value: "Sempre",        label: "compromisso de não retaliação", sub: "Boa-fé pressuposta", icon: ShieldCheck },
                { value: "72 horas",       label: "acusação de receção",            sub: "Janela inicial",      icon: Clock },
                { value: "90 dias",        label: "divulgação coordenada padrão",   sub: "Ajustável por gravidade", icon: BadgeCheck },
                { value: "Opt-in",         label: "Hall of Fame",                   sub: "Reconhecimento público", icon: Flag },
            ]} />

            <div className="legal-callout">
                <strong>Endereço dedicado</strong>
                Para reportar vulnerabilidades, exclusivamente:{" "}
                <a href="mailto:seguranca@lusorae.pt">seguranca@lusorae.pt</a>. Chave PGP disponível mediante
                pedido. Não usar canais públicos (issues, redes sociais, suporte geral) para divulgação inicial.
            </div>

            <h2>Princípios desta página</h2>
            <p>
                Esta página descreve o procedimento de <em>responsible disclosure</em> do Lusorae: o caminho pelo
                qual um investigador independente, um utilizador atento, ou uma equipa de segurança pode reportar
                uma vulnerabilidade sem receio de retaliação e com clareza sobre o que esperar de nós em troca.
                Não substitui a política interna de gestão de incidentes, que cobre também os incidentes
                detetados internamente.
            </p>

            <h2>O que cobrimos (in-scope)</h2>
            <LegalSectionSummary>
                Aplicações web e móveis em domínios oficiais, APIs públicas. Tudo o que tem o nosso nome em cima.
            </LegalSectionSummary>
            <p>
                Está abrangido pelo procedimento:
            </p>
            <ul>
                <li><strong>Aplicações web</strong> servidas a partir de <code>lusorae.pt</code> e seus subdomínios oficiais;</li>
                <li><strong>Aplicações móveis</strong> publicadas nas lojas oficiais com o identificador <code>Lusorae</code> como autor verificado;</li>
                <li><strong>APIs públicas e documentadas</strong> com prefixo <code>/api/</code>;</li>
                <li><strong>Infraestrutura de envio de e-mail transacional</strong> a partir de endereços <code>@lusorae.pt</code>;</li>
                <li><strong>Sistema de pagamentos de subscrições</strong> Plus e Aura (em coordenação com o processador de pagamentos).</li>
            </ul>

            <h2>O que <strong>não</strong> cobrimos (out-of-scope)</h2>

            <LegalIconGrid tone="warn" items={[
                { label: "Engenharia social contra colaboradores, agentes de suporte ou contas de utilizador",         ref: "Inadmissível", icon: Ban },
                { label: "Testes de carga, DoS / DDoS, exfiltração massiva de dados (mesmo em ambiente de teste)",        ref: "Inadmissível", icon: AlertTriangle },
                { label: "Acesso a dados pessoais de outros utilizadores além do estritamente necessário à prova",        ref: "Princípio da minimização", icon: EyeOff },
                { label: "Modificação ou destruição de dados de outros utilizadores",                                    ref: "Inadmissível", icon: Slash },
                { label: "Serviços operados por terceiros sob marca distinta (subcontratantes), salvo coordenação prévia", ref: "Out-of-scope", icon: ShieldAlert },
                { label: "Vulnerabilidades em bibliotecas open-source que não dependam da nossa configuração específica",   ref: "Out-of-scope", icon: Lock },
            ]} />

            <p>
                Em caso de dúvida sobre o âmbito, escreve para{" "}
                <a href="mailto:seguranca@lusorae.pt">seguranca@lusorae.pt</a> antes de prosseguir com qualquer
                teste. Respondemos a pedidos de pré-coordenação em prazo curto.
            </p>

            <h2>Como reportar</h2>

            <LegalVisualBlock eyebrow="Procedimento, em cinco passos" title="O caminho desde a deteção até à resolução pública">
                <LegalLadder steps={[
                    { label: "Reportar em privado",      desc: "E-mail para seguranca@lusorae.pt. Não publicar em canais abertos. PGP recomendado para vulnerabilidades críticas.", icon: Mail },
                    { label: "Acusação de receção",      desc: "Respondemos em até 72 horas com confirmação de receção e atribuição de identificador único interno.",              icon: FileCheck },
                    { label: "Triagem e replicação",     desc: "Equipa técnica replica e classifica a vulnerabilidade por severidade (CVSS 4.0).",                                  icon: Search },
                    { label: "Mitigação coordenada",     desc: "Aplicamos correção, com janela de divulgação coordenada (padrão: 90 dias, ajustável).",                              icon: ShieldCheck },
                    { label: "Divulgação pública",       desc: "Publicamos boletim de segurança (anonimizando o investigador por defeito) e, se houver opt-in, reconhecimento público.", icon: Flag },
                ]}
                caption="O tempo total entre a comunicação inicial e a resolução pública depende da complexidade técnica e do impacto sobre utilizadores. Mantemos comunicação regular durante todo o processo." />
            </LegalVisualBlock>

            <h2>Janela de divulgação coordenada</h2>
            <LegalTable
                headers={["Severidade (CVSS 4.0)", "Janela alvo", "Notas"]}
                rows={[
                    ["Crítica (≥ 9.0)",  "30 dias",  "Comunicação imediata aos utilizadores afetados, se aplicável."],
                    ["Alta (7.0–8.9)",   "60 dias",  "Boletim público após a correção. Comunicação a autoridades se exigido."],
                    ["Média (4.0–6.9)",  "90 dias",  "Boletim público ou nota de versão, conforme proporcional."],
                    ["Baixa (< 4.0)",    "180 dias", "Pode ser agregada num boletim trimestral."],
                ]}
                caption="A janela é o prazo alvo. Em casos com elevada complexidade técnica ou dependência de subcontratante, pode haver prorrogação justificada, comunicada por escrito ao investigador." />

            <h2>Compromisso de não retaliação (safe harbor)</h2>
            <p>
                Comprometemo-nos a <strong>não tomar qualquer iniciativa judicial, civil ou criminal</strong>{" "}
                contra investigadores que actuem de <strong>boa-fé</strong>, dentro do âmbito desta página, e que
                cumpram os princípios abaixo:
            </p>

            <LegalIconGrid tone="warn" items={[
                { label: "Não causar dano material ou perda de disponibilidade do Serviço",     ref: "Minimização", icon: ShieldCheck },
                { label: "Não aceder a dados pessoais além do estritamente necessário à prova",  ref: "RGPD",         icon: Lock },
                { label: "Não exfiltrar, copiar ou guardar dados pessoais para fora dos servidores", ref: "Reserva",   icon: EyeOff },
                { label: "Não divulgar publicamente antes do fim da janela coordenada",          ref: "Coordenação", icon: Clock },
                { label: "Submeter o reporte no endereço dedicado, em formato claro e replicável", ref: "Boa-fé",     icon: Flag },
            ]} />

            <p>
                Este compromisso não tem efeito sobre ações praticadas em má-fé, contra a Plataforma ou contra
                terceiros, nem cobre acessos a dados de outros utilizadores além do necessário à prova de
                conceito. Não substitui o direito de defesa de terceiros eventualmente lesados nem dispensa o
                investigador do cumprimento da lei penal aplicável.
            </p>

            <h2>Reconhecimento público (Hall of Fame, opt-in)</h2>
            <p>
                Investigadores que assim o pretendam podem ser reconhecidos publicamente no nosso boletim de
                segurança e em listagem dedicada. O reconhecimento é estritamente <strong>opt-in</strong>: por
                defeito, o boletim refere apenas &laquo;<em>reportado por investigador independente</em>&raquo;.
                Quando o investigador opte por ser nomeado, identificamo-lo com:
            </p>
            <ul>
                <li>Nome (real ou pseudónimo profissional);</li>
                <li>Afiliação (opcional);</li>
                <li>Ligação para um perfil profissional (opcional);</li>
                <li>Resumo factual do impacto reportado.</li>
            </ul>

            <h2>Recompensa monetária</h2>
            <p>
                À data desta edição, o Lusorae não opera um programa formal de <em>bug bounty</em> com
                recompensa monetária. Pretendemos abrir um programa formal assim que a maturidade operacional
                e a estabilidade societária o justifiquem. Em casos de impacto particularmente elevado, podemos,
                a título excecional, atribuir uma recompensa <em>ex gratia</em> mediante decisão da direção,
                com publicação subsequente nos relatórios de transparência. Pedidos não solicitados de
                recompensa por reportes <em>ex post</em> não são considerados.
            </p>

            <h2>Comunicação com autoridades</h2>
            <p>
                Quando uma vulnerabilidade implique risco para os direitos e liberdades dos titulares dos dados
                pessoais, notificamos a CNPD nos termos do artigo 33.º do RGPD, em até 72 horas após o
                conhecimento, e, sempre que o risco seja elevado, comunicamos aos titulares afetados nos termos
                do artigo 34.º. Quando a vulnerabilidade tenha origem em ataque criminoso, podemos comunicar
                ao Ministério Público para abertura de inquérito, sem prejuízo da proteção do investigador de
                boa-fé.
            </p>

            <h2>Auditoria externa regular</h2>
            <p>
                Em coerência com o nosso <a href="/legal/vision">sexto compromisso</a>, o Lusorae compromete-se a
                conduzir <strong>testes de intrusão externos pelo menos uma vez por ano</strong>, com uma
                entidade independente, e a publicar o sumário executivo dessas auditorias em{" "}
                <a href="/legal/dsa-transparency">/legal/dsa-transparency</a>. As constatações com impacto sobre
                utilizadores são, sempre que possível, tornadas públicas após a correção.
            </p>

            <h2>Contactos</h2>
            <p>
                Reporte de vulnerabilidades:{" "}
                <a href="mailto:seguranca@lusorae.pt">seguranca@lusorae.pt</a>. Incidentes ativos com impacto
                imediato sobre Utilizadores: <a href="mailto:abuso@lusorae.pt">abuso@lusorae.pt</a> (linha
                operacional 24/7). Questões institucionais sobre o programa:{" "}
                <a href="mailto:legal@lusorae.pt">legal@lusorae.pt</a>.
            </p>
        </LegalShell>
    );
}
