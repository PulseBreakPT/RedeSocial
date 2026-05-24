import { LegalShell } from "./LegalShell";
import {
    LegalSignalPills, LegalKPIs, LegalVisualBlock, LegalIconGrid,
} from "./_visuals";
import {
    Scale, ShieldCheck, FileText, Sparkle, Globe, Heart, Brain,
    Eye, Lock, Compass, BookOpen, AlertTriangle, Slash, EyeOff, Ban, Megaphone,
    Activity, Users, BadgeCheck, FileCheck, Clock,
} from "lucide-react";

export default function Vision() {
    return (
        <LegalShell
            active="vision"
            title="A nossa visão"
            subtitle="Porque é que o Lusorae existe, em que se compromete, e o que recusa fazer. Esta página é o documento de referência a que todos os outros &mdash; Termos, Privacidade, Cookies, Diretrizes &mdash; respondem."
            lastUpdated="[data da última versão]"
        >
            <LegalSignalPills items={[
                { label: "Documento de referência", tone: "tone-key", icon: BookOpen },
                { label: "PT · UE",                  tone: "tone-key", icon: Globe },
                { label: "Revisão anual",            tone: "tone-pt",  icon: FileCheck },
                { label: "Conselho de Integridade",   tone: "tone-pt",  icon: BadgeCheck },
                { label: "DSA · RGPD",               tone: "tone-eu",  icon: Scale },
            ]} />

            <LegalKPIs items={[
                { value: "6",       label: "compromissos públicos",       sub: "Citados nos restantes documentos", icon: ShieldCheck },
                { value: "0",       label: "venda de dados pessoais",      sub: "Compromisso institucional",         icon: Lock },
                { value: "0",       label: "métricas de vício",            sub: "Sem badges nem streaks coercivos",   icon: Eye },
                { value: "1",       label: "revisão anual obrigatória",    sub: "Todos os documentos",                icon: Clock },
            ]} />

            <div className="legal-callout">
                <strong>Sobre este documento</strong>
                O Lusorae é uma rede social com sede em Portugal. Esta página descreve o que somos e o que queremos
                continuar a ser. Não tem valor contratual autónomo &mdash; o valor contratual está nos{" "}
                <a href="/legal/terms">Termos e Condições</a> &mdash; mas é a fundação ética e operacional sobre a
                qual esses termos foram desenhados. Quando alguma decisão difícil tiver de ser tomada, voltamos aqui.
            </div>

            <h2>Porque é que o Lusorae existe</h2>
            <p>
                Existem redes sociais a mais. A maior parte foi desenhada para uma coisa muito simples: prender a tua
                atenção o máximo de tempo possível para a vender a anunciantes. Tudo o que vês &mdash; o feed, as
                notificações, os contadores, a forma como o conteúdo aparece e desaparece &mdash; foi optimizado nessa
                direção. O resultado é conhecido: ansiedade, polarização, exaustão e uma certa pobreza no que se
                conversa.
            </p>
            <p>
                O Lusorae existe para experimentar uma alternativa. Acreditamos que se pode construir uma rede social
                que não compita pelo tempo do utilizador, que não amplifique o que indigna, que não esconda o que
                acalma, e que ainda assim possa ser economicamente viável. Não temos a vaidade de pensar que somos os
                primeiros a tentar &mdash; mas queremos ser dos que tentam com honestidade.
            </p>
            <p>
                Somos também um projeto em português. Isto não é folclore: é uma escolha editorial. O algoritmo, as
                regras, o tom do produto, o atendimento e a moderação são pensados primeiro em português europeu, no
                quadro cultural e jurídico português e europeu. Servimos quem nos ler em português; o resto da
                experiência adapta-se a essa decisão fundadora.
            </p>

            <h2>As palavras importam</h2>
            <p>
                Algumas palavras aparecem repetidamente nos nossos documentos. Significam coisas concretas:
            </p>
            <ul>
                <li><strong>Presença</strong> &mdash; estar no Lusorae deve sentir-se como entrar num sítio onde se está, não como entrar num combate. Por isso evitamos vocabulário de competição (&laquo;ranking&raquo;, &laquo;trending&raquo; agressivo, &laquo;viral&raquo;) sempre que possível.</li>
                <li><strong>Calma intencional</strong> &mdash; a calma não é ausência de actividade; é a recusa em manipular o ritmo do utilizador. As notificações são honestas, o feed não usa surpresa artificial, e o produto aceita que o utilizador queira sair quando quiser sair.</li>
                <li><strong>Atenção honesta</strong> &mdash; é a atenção que o utilizador escolhe dar. Nunca a que lhe extraímos com truques.</li>
                <li><strong>Conversa portuguesa</strong> &mdash; é o registo da comunidade. Inclui sotaques, regionalismos, sátira, pluralismo e desacordo civilizado. Não é uniformidade nem &laquo;simpatia obrigatória&raquo;.</li>
                <li><strong>Convivência</strong> &mdash; é o que esperamos. A liberdade de cada utilizador termina onde começa a integridade do outro. Tudo o resto deriva daqui.</li>
            </ul>

            <h2>Os seis compromissos</h2>
            <p>
                Estes seis compromissos são o núcleo da nossa identidade institucional. Citamo-los, por nome, ao
                longo dos restantes documentos. São propositadamente concretos: se um dia falharmos um, fica registado.
            </p>

            <LegalVisualBlock eyebrow="Núcleo institucional" title="Os seis compromissos do Lusorae" tone="info">
                <ol style={{ margin: 0, paddingLeft: "1.2rem", listStyle: "decimal" }}>
                    <li style={{ marginBottom: 10, fontSize: 13.5, lineHeight: 1.55, color: "rgba(0,0,0,0.78)" }}>
                        <strong>Atenção honesta.</strong> O Lusorae não é desenhado para maximizar tempo de ecrã. Não usamos notificações sintéticas, badges de urgência inventada, streaks coercivos, scroll infinito sem pausas naturais, nem conteúdo escondido propositadamente para provocar regresso compulsivo.
                    </li>
                    <li style={{ marginBottom: 10, fontSize: 13.5, lineHeight: 1.55, color: "rgba(0,0,0,0.78)" }}>
                        <strong>Algoritmo legível.</strong> Os parâmetros principais do feed, da descoberta e das recomendações são públicos e descritos em linguagem clara. Está sempre disponível uma alternativa não personalizada, conforme exige o artigo 27.º do DSA.
                    </li>
                    <li style={{ marginBottom: 10, fontSize: 13.5, lineHeight: 1.55, color: "rgba(0,0,0,0.78)" }}>
                        <strong>Dados próprios.</strong> Não vendemos, alugamos ou cedemos dados pessoais para fins comerciais de terceiros. Os subcontratantes que utilizamos operam sob contrato nos termos do artigo 28.º do RGPD, com finalidade estritamente limitada à prestação técnica do Serviço.
                    </li>
                    <li style={{ marginBottom: 10, fontSize: 13.5, lineHeight: 1.55, color: "rgba(0,0,0,0.78)" }}>
                        <strong>Moderação fundamentada.</strong> Toda a decisão de moderação é comunicada ao Utilizador com fundamentação, explicação da regra aplicável e meios de recurso disponíveis, conforme o artigo 17.º do DSA. Nenhuma medida é tomada por reflexo automático sem revisão humana possível.
                    </li>
                    <li style={{ marginBottom: 10, fontSize: 13.5, lineHeight: 1.55, color: "rgba(0,0,0,0.78)" }}>
                        <strong>Premium sem privilégio social.</strong> As subscrições pagas (Plus, Aura) dão ferramentas adicionais de expressão e conforto. Nunca dão alcance, prioridade no feed, estatuto social ou capacidade de influenciar a moderação. O algoritmo é, e continuará a ser, indiferente ao plano de subscrição.
                    </li>
                    <li style={{ marginBottom: 0, fontSize: 13.5, lineHeight: 1.55, color: "rgba(0,0,0,0.78)" }}>
                        <strong>Auditoria periódica.</strong> Estes compromissos, as políticas que deles derivam, e os sistemas que as operacionalizam são revistos pelo menos uma vez por ano, e sempre que a lei aplicável, a realidade técnica ou a comunidade o exijam. Mudanças materiais são comunicadas com 15 dias de antecedência.
                    </li>
                </ol>
            </LegalVisualBlock>

            <h2>O que recusamos fazer</h2>
            <p>
                A clareza ética de um produto mede-se também pelo que ele recusa. O Lusorae não vai &mdash; durante a
                vigência destes compromissos &mdash; fazer o seguinte:
            </p>

            <LegalIconGrid tone="warn" items={[
                { label: "Publicidade comportamental a menores",                                  icon: ShieldCheck },
                { label: "Dark patterns para cancelar conta ou subscrição",                          icon: Slash },
                { label: "Streaks, badges ou contadores desenhados para vício",                       icon: Activity },
                { label: "Notificações sintéticas para forçar regresso",                              icon: Megaphone },
                { label: "Algoritmos que premeiam indignação ou polarização",                          icon: AlertTriangle },
                { label: "Venda, aluguer ou cedência de dados pessoais",                              icon: Lock },
                { label: "Moderação invisível ou sem fundamentação",                                   icon: EyeOff },
                { label: "Privilegiar contas pagantes no feed ou na descoberta",                       icon: Ban },
                { label: "Conteúdo gerado por IA passado como humano sem etiqueta",                    icon: Brain },
                { label: "Coleta de dados sensíveis (saúde, religião, orientação) por iniciativa nossa", icon: Heart },
            ]} />

            <h2>Como decidimos</h2>
            <p>
                A maior parte das decisões num produto desta natureza é cinzenta. Não temos a pretensão de ter razão
                sempre &mdash; temos a obrigação de decidir de forma rastreável.
            </p>
            <p>
                Decisões editoriais sensíveis &mdash; alterações ao algoritmo, mudanças significativas nas Diretrizes
                da Comunidade, novas categorias de conteúdo etiquetado, decisões sobre crises &mdash; passam por um
                processo interno que envolve a equipa de Produto, a equipa de Trust &amp; Safety, o nosso Encarregado
                de Proteção de Dados e, quando aplicável, aconselhamento jurídico externo. Para decisões com impacto
                particularmente material, instituímos um <strong>Conselho de Integridade</strong>: um pequeno painel
                consultivo, com pelo menos um membro externo independente, que se reúne trimestralmente e em
                situações extraordinárias.
            </p>
            <p>
                Quando errarmos &mdash; e iremos errar &mdash; tentamos fazer três coisas, nesta ordem:
                <em>reconhecer publicamente</em>, <em>corrigir tecnicamente</em>, <em>documentar</em>. Sempre que
                possível, publicamos uma nota nos nossos relatórios de transparência.
            </p>

            <h2>Quem fala em nome do Lusorae</h2>
            <p>
                O Lusorae não tem &laquo;contas oficiais&raquo; com poder algorítmico privilegiado. As comunicações
                institucionais são feitas:
            </p>
            <ul>
                <li>
                    <strong>Centro Legal</strong> (esta secção) &mdash; para políticas, termos, privacidade e diretrizes.
                </li>
                <li>
                    <strong>Sala</strong> &mdash; o nosso espaço editorial público dentro da própria Plataforma, identificado de forma inequívoca, onde publicamos notas, mudanças de política e relatórios de transparência.
                </li>
                <li>
                    <strong>Correio institucional</strong> &mdash; <a href="mailto:imprensa@lusorae.pt">imprensa@lusorae.pt</a> (jornalistas, investigadores, autoridades), <a href="mailto:legal@lusorae.pt">legal@lusorae.pt</a> (assuntos legais), <a href="mailto:dpo@lusorae.pt">dpo@lusorae.pt</a> (DPO).
                </li>
            </ul>
            <p>
                Comunicações pessoais individuais &mdash; opinião pessoal de quem cá trabalha nas suas próprias contas
                &mdash; não constituem posição oficial.
            </p>

            <h2>Como nos ajudar a sermos melhores</h2>
            <p>
                Lemos o que nos chega. Sugestões e críticas &mdash; sobre produto, políticas, acessibilidade, conteúdo
                ou tom &mdash; podem ser enviadas para <a href="mailto:apoio@lusorae.pt">apoio@lusorae.pt</a> (apoio
                ao utilizador) ou <a href="mailto:legal@lusorae.pt">legal@lusorae.pt</a> (questões formais). Não
                garantimos resposta a tudo, mas garantimos leitura.
            </p>
            <p>
                Investigadores académicos com interesse legítimo em estudar a Plataforma podem solicitar acesso aos
                nossos dados anonimizados ao abrigo do artigo 40.º do DSA, escrevendo para{" "}
                <a href="mailto:investigacao@lusorae.pt">investigacao@lusorae.pt</a>.
            </p>

            <h2>Revisão</h2>
            <p>
                Esta visão é revista todos os anos, na semana do aniversário do lançamento público, e sempre que uma
                circunstância material o justifique. As alterações ficam registadas no histórico desta página e são
                comunicadas com pelo menos 15 dias de antecedência através de aviso na Plataforma.
            </p>
        </LegalShell>
    );
}
