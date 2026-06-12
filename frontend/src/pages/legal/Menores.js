import { LegalShell } from "./LegalShell";
import {
    LegalKPIs, LegalIconGrid, LegalSectionSummary, LegalVisualBlock, LegalRightsGrid,
} from "./_visuals";
import {
    Heart, ShieldCheck, EyeOff, Lock, BookOpen,
    Ban, AlertTriangle, Slash, Megaphone, Users, MessageCircle,
} from "lucide-react";

export default function Menores() {
    return (
        <LegalShell
            active="menores"
            title="Para Pais e Menores"
            subtitle="Em linguagem simples, o que fazemos para proteger menores no Lusorae, o que não fazemos, e como podes ajudar enquanto pai, mãe ou representante legal. Esta página resume, em linguagem acessível, o que aparece com detalhe técnico nos Termos e na Política de Privacidade."
            lastUpdated="Junho de 2026"
            eli5="Idades: menos de 13 não podem ter conta; dos 13 aos 15 precisam de autorização dos pais; a partir dos 16 podem usar a Plataforma sozinhos. Não mostramos publicidade a menores. Não tratamos dados sensíveis. E os pais podem agir em nome do menor."
        >
            <LegalKPIs items={[
                { value: "≥ 16",    label: "para uso autónomo",        sub: "Plena capacidade contratual",   icon: Users },
                { value: "13–15",   label: "com autorização dos pais", sub: "Art. 16.º Lei 58/2019",         icon: ShieldCheck },
                { value: "< 13",    label: "sem permissão para conta", sub: "Idade mínima absoluta",         icon: Lock },
                { value: "0",       label: "publicidade a menores",    sub: "Art. 28.º DSA",                 icon: EyeOff },
            ]} />

            <div className="legal-callout">
                <strong>Esta página é para quem?</strong>
                Para <strong>pais e representantes legais</strong> de menores que usam, ou querem usar, o Lusorae.
                Para os próprios <strong>jovens</strong> que querem perceber o que a Plataforma faz e não faz.
                Os documentos técnicos estão nos <a href="/legal/terms">Termos</a> e na{" "}
                <a href="/legal/privacy">Política de Privacidade</a>, esta página resume-os em linguagem clara.
            </div>

            <h2>As três idades que importam</h2>
            <p>
                A lei portuguesa e europeia trata os menores em três grupos diferentes. O Lusorae aplica essas regras
                de forma estrita:
            </p>
            <ul>
                <li>
                    <strong>Menos de 13 anos</strong>, não permitimos a criação nem a utilização de conta. Esta é a
                    idade mínima absoluta para tratamento de dados pessoais com base em consentimento, em Portugal,
                    nos termos do artigo 16.º da Lei n.º 58/2019. Se identificarmos uma conta de menor de 13 anos,
                    a conta é encerrada e os Conteúdos eliminados.
                </li>
                <li>
                    <strong>Entre 13 e 15 anos</strong>, a conta só é admitida com autorização verificável dos
                    representantes legais (pais, tutor ou pessoa com responsabilidades parentais). A criança pode
                    publicar, comentar e mensagear, mas o seu perfil está, por defeito, com configurações mais
                    protetoras (descoberta limitada, sem publicidade baseada em <em>profiling</em>, e sem recolha
                    de dados sensíveis).
                </li>
                <li>
                    <strong>16 anos ou mais</strong>, utilização autónoma do Serviço, sem necessidade de autorização
                    parental específica. Aplicam-se todas as garantias gerais dos <a href="/legal/terms">Termos</a> e
                    da <a href="/legal/privacy">Política de Privacidade</a>.
                </li>
            </ul>

            <h2>O que <strong>não</strong> fazemos a menores</h2>
            <LegalSectionSummary>
                Não publicidade comportamental. Não dados sensíveis. Não dark patterns. Sem comparações públicas. Sem viciar.
            </LegalSectionSummary>

            <LegalIconGrid tone="warn" items={[
                { label: "Não mostramos publicidade baseada em profiling a menores reconhecidos ou presumidos", ref: "Art. 28.º DSA",  icon: Megaphone },
                { label: "Não solicitamos categorias especiais de dados (saúde, religião, orientação)",          ref: "Art. 9.º RGPD", icon: EyeOff },
                { label: "Não usamos streaks, badges de urgência ou notificações sintéticas que prendem atenção", ref: "Anti-dark-pattern", icon: AlertTriangle },
                { label: "Não exibimos contadores públicos de gostos ou seguidores nas contas de menor",          ref: "Saúde mental",  icon: Slash },
                { label: "Não permitimos que adultos contactem menores sem aceitação prévia",                     ref: "Trust & Safety", icon: Lock },
                { label: "Não vendemos, alugamos ou cedemos dados pessoais a terceiros",                          ref: "Compromisso 3",  icon: Ban },
            ]} />

            <h2>O que <strong>fazemos</strong> para proteger</h2>

            <LegalVisualBlock eyebrow="Configurações de proteção por defeito" title="O que está ligado automaticamente em contas de menor">
                <LegalRightsGrid items={[
                    {
                        title: "Privacidade reforçada",
                        desc: "Perfil privado por defeito até decisão expressa em sentido contrário pelo titular ou pelos representantes legais.",
                        ref: "Privacy by default · RGPD art. 25.º",
                        icon: Lock,
                    },
                    {
                        title: "Descoberta limitada",
                        desc: "Contas de menor não aparecem em sugestões abertas a desconhecidos nem em superfícies de descoberta agressiva.",
                        ref: "DSA art. 28.º",
                        icon: EyeOff,
                    },
                    {
                        title: "Mensagens controladas",
                        desc: "Mensagens diretas só de pessoas a seguir. Pedidos de mensagem de desconhecidos vão para fila de aprovação.",
                        ref: "Trust & Safety",
                        icon: MessageCircle,
                    },
                    {
                        title: "Verificação etária proporcional",
                        desc: "Mecanismos razoáveis e proporcionais, com a menor intrusividade possível sobre dados pessoais.",
                        ref: "DSA art. 28.º · Carta Digital",
                        icon: ShieldCheck,
                    },
                ]} />
            </LegalVisualBlock>

            <p>
                A escolha das configurações iniciais protetoras é independente da idade declarada: aplicam-se a
                qualquer conta em que exista <strong>indício fundado</strong> de minoridade, em coerência com o
                princípio da privacidade por defeito (artigo 25.º do RGPD).
            </p>

            <h2>Como os pais podem agir</h2>
            <p>
                Os representantes legais podem, a todo o tempo, exercer em nome do menor todos os direitos
                previstos nos artigos 15.º a 22.º do RGPD: acesso, retificação, apagamento, limitação,
                portabilidade, oposição, recusa de decisões automatizadas e retirada de consentimento. Para
                qualquer destes pedidos, escrevem para{" "}
                <a href="mailto:privacidade@lusorae.pt">privacidade@lusorae.pt</a>, anexando:
            </p>
            <ul>
                <li>Identificação do menor (nome de utilizador e/ou e-mail associado à conta);</li>
                <li>Prova da legitimidade (cópia do documento de identificação do representante e prova da relação parental ou tutelar);</li>
                <li>Indicação clara do pedido (e.g. eliminação da conta, retirada de consentimento para fim X, acesso a dados).</li>
            </ul>
            <p>
                Respondemos no prazo geral do artigo 12.º, n.º 3, do RGPD (um mês, prorrogável por mais dois em
                casos excecionalmente complexos, com comunicação ao requerente).
            </p>

            <h2>Conteúdo e moderação</h2>
            <p>
                O Lusorae aplica regras de moderação reforçadas em relação a conteúdo passível de afetar menores,
                em particular:
            </p>
            <ul>
                <li>Material de abuso sexual de menores tem tratamento prioritário e absoluto, com remoção imediata, notificação às autoridades competentes e bloqueio de tentativas de recirculação (artigos 176.º e 176.º-A do Código Penal);</li>
                <li>Conteúdo sexual explícito não pode ser apresentado a contas de menor, mesmo quando publicado por terceiros, e a etiquetagem é aplicada de forma neutra pela equipa de moderação;</li>
                <li>Conteúdo gerado por IA que represente menores em contexto sexual, mesmo que sintético, é tratado nos termos do CP e removido com a mesma prioridade.</li>
            </ul>

            <h2>Em conformidade com</h2>
            <ul>
                <li><strong>RGPD</strong>, Regulamento (UE) 2016/679, artigos 8.º (consentimento de menores) e 25.º (privacidade por defeito);</li>
                <li><strong>Lei n.º 58/2019</strong>, artigo 16.º (idade mínima para consentimento em Portugal);</li>
                <li><strong>DSA</strong>, Regulamento (UE) 2022/2065, artigo 28.º (proteção de menores em linha);</li>
                <li><strong>Lei n.º 27/2021</strong>, Carta Portuguesa dos Direitos Humanos na Era Digital, especialmente os direitos das crianças;</li>
                <li><strong>Convenção das Nações Unidas sobre os Direitos da Criança</strong>, em particular os artigos 3.º (interesse superior da criança) e 16.º (direito à privacidade).</li>
            </ul>

            <h2>Como falar connosco</h2>
            <p>
                Para qualquer pedido relacionado com menores, dúvidas, exercício de direitos, denúncia de conta,
                pedido de eliminação, o canal preferencial é{" "}
                <a href="mailto:privacidade@lusorae.pt">privacidade@lusorae.pt</a>, sob a coordenação do
                Encarregado de Proteção de Dados.
            </p>
            <p>
                Para questões institucionais ou sugestões sobre proteção de menores na Plataforma, escreve para{" "}
                <a href="mailto:legal@lusorae.pt">legal@lusorae.pt</a>. Lemos tudo.
            </p>
        </LegalShell>
    );
}
