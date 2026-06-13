import { Link } from "react-router-dom";
import { LegalShell } from "./LegalShell";
import { LegalVisualBlock, LegalIconGrid } from "./_visuals";
import {
    ShieldCheck, Lock, Heart, Brain, AlertTriangle, Slash, EyeOff, Ban, Megaphone,
    Activity,
} from "lucide-react";

export default function Vision() {
    return (
        <LegalShell
            active="vision"
            title="A nossa visão"
            subtitle="Porque é que o Lusorae existe, em que se compromete, e o que recusa fazer. Esta página é o documento de referência a que todos os outros, Termos, Privacidade, Cookies, Diretrizes, respondem."
            lastUpdated="Junho de 2026"
        >
            <div className="legal-callout">
                <strong>Sobre este documento</strong>
                O Lusorae é uma rede social com sede em Portugal. Esta página descreve o que somos e o que queremos
                continuar a ser. Não tem valor contratual autónomo, o valor contratual está nos{" "}
                <a href="/legal/terms">Termos e Condições</a>, mas é a fundação ética e operacional sobre a
                qual esses termos foram desenhados. Quando alguma decisão difícil tiver de ser tomada, voltamos aqui.
            </div>

            <h2>Porque é que o Lusorae existe</h2>
            <p>
                Existem redes sociais a mais. A maior parte foi desenhada para uma coisa muito simples: prender a tua
                atenção o máximo de tempo possível para a vender a anunciantes. Tudo o que vês, o feed, as
                notificações, os contadores, a forma como o conteúdo aparece e desaparece, foi optimizado nessa
                direção. O resultado é conhecido: ansiedade, polarização, exaustão e uma certa pobreza no que se
                conversa.
            </p>
            <p>
                O Lusorae existe para experimentar uma alternativa. Acreditamos que se pode construir uma rede social
                que não compita pelo tempo do utilizador, que não amplifique o que indigna, que não esconda o que
                acalma, e que ainda assim possa ser economicamente viável. Não temos a vaidade de pensar que somos os
                primeiros a tentar, mas queremos ser dos que tentam com honestidade.
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
                <li><strong>Presença</strong>, estar no Lusorae deve sentir-se como entrar num sítio onde se está, não como entrar num combate. Por isso evitamos vocabulário de competição (&laquo;ranking&raquo;, &laquo;trending&raquo; agressivo, &laquo;viral&raquo;) sempre que possível.</li>
                <li><strong>Calma intencional</strong>, a calma não é ausência de actividade; é a recusa em manipular o ritmo do utilizador. As notificações são honestas, o feed não usa surpresa artificial, e o produto aceita que o utilizador queira sair quando quiser sair.</li>
                <li><strong>Atenção honesta</strong>, é a atenção que o utilizador escolhe dar. Nunca a que lhe extraímos com truques.</li>
                <li><strong>Conversa portuguesa</strong>, é o registo da comunidade. Inclui sotaques, regionalismos, sátira, pluralismo e desacordo civilizado. Não é uniformidade nem &laquo;simpatia obrigatória&raquo;.</li>
                <li><strong>Convivência</strong>, é o que esperamos. A liberdade de cada utilizador termina onde começa a integridade do outro. Tudo o resto deriva daqui.</li>
            </ul>

            <h2>Os seis compromissos</h2>
            <p>
                Estes seis compromissos são o núcleo da nossa identidade institucional. Citamo-los, por nome, ao
                longo dos restantes documentos. São propositadamente concretos: se um dia falharmos um, fica registado.
            </p>
            <p>
                O <Link to="/manifesto">Manifesto</Link> operacionaliza estes compromissos ao nível do produto, em
                regras concretas de engenharia (sem <em>streaks</em>, Modo Boa Noite por defeito, contagens esbatidas,
                <em> read receipts</em> opcionais, feed único cronológico sem &ldquo;Para ti&rdquo; algorítmico). Esta página descreve o{" "}
                <strong>enquadramento institucional</strong> desses compromissos; o Manifesto descreve a sua{" "}
                <strong>tradução operacional</strong>.
            </p>

            <LegalVisualBlock eyebrow="Núcleo institucional" title="Os seis compromissos do Lusorae" tone="info">
                <ol style={{ margin: 0, paddingLeft: "1.2rem", listStyle: "decimal" }}>
                    <li style={{ marginBottom: 10, fontSize: 13.5, lineHeight: 1.55, color: "rgba(0,0,0,0.78)" }}>
                        <strong>Atenção honesta.</strong> O Lusorae não é desenhado para maximizar tempo de ecrã. Não usamos notificações sintéticas, badges de urgência inventada, streaks coercivos, scroll infinito sem pausas naturais, nem conteúdo escondido propositadamente para provocar regresso compulsivo.
                    </li>
                    <li style={{ marginBottom: 10, fontSize: 13.5, lineHeight: 1.55, color: "rgba(0,0,0,0.78)" }}>
                        <strong>Algoritmo legível.</strong> O Lusorae opera um feed único, cronológico por defeito, com sinais de relevância transparentes e descritos em linguagem clara. Não existe um feed &ldquo;Para ti&rdquo; separado nem uma alternativa &ldquo;Seguindo&rdquo; em silo: a versão não personalizada é o próprio default, em conformidade com o artigo 27.º do DSA.
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
                A clareza ética de um produto mede-se também pelo que ele recusa. O Lusorae não vai, durante a
                vigência destes compromissos, fazer o seguinte:
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
                sempre, temos a obrigação de decidir de forma rastreável.
            </p>
            <p>
                Decisões editoriais sensíveis, alterações ao algoritmo, mudanças significativas nas Diretrizes
                da Comunidade, novas categorias de conteúdo etiquetado, decisões sobre crises, passam por um
                processo interno que envolve a equipa de Produto, a equipa de Trust &amp; Safety, o nosso Encarregado
                de Proteção de Dados e, quando aplicável, aconselhamento jurídico externo. Para decisões com impacto
                particularmente material, instituímos um <strong>Conselho de Integridade</strong>: um pequeno painel
                consultivo, com pelo menos um membro externo independente, que se reúne trimestralmente e em
                situações extraordinárias. A composição nominal, o regulamento de funcionamento e as atas das
                reuniões serão publicados em <Link to="/legal/governance">/legal/governance</Link> a partir da
                primeira reunião formal.
            </p>
            <p>
                Quando errarmos, e iremos errar, tentamos fazer três coisas, nesta ordem:
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
                    <strong>Centro Legal</strong> (esta secção), para políticas, termos, privacidade e diretrizes.
                </li>
                <li>
                    <strong>Sala</strong>, o nosso espaço editorial público dentro da própria Plataforma,
                    identificado de forma inequívoca, onde publicamos notas, mudanças de política e relatórios de
                    transparência. É um <em>feed</em> oficial, sem privilégio algorítmico, sujeito às mesmas regras
                    de moderação que os demais.
                </li>
                <li>
                    <strong>Correio institucional</strong>, <a href="mailto:imprensa@lusorae.pt">imprensa@lusorae.pt</a> (jornalistas, investigadores, autoridades), <a href="mailto:legal@lusorae.pt">legal@lusorae.pt</a> (assuntos legais), <a href="mailto:dpo@lusorae.pt">dpo@lusorae.pt</a> (DPO).
                </li>
            </ul>
            <p>
                Comunicações pessoais individuais, opinião pessoal de quem cá trabalha nas suas próprias contas,
                não constituem posição oficial.
            </p>

            <h2>Como nos ajudar a sermos melhores</h2>
            <p>
                Lemos o que nos chega. Sugestões e críticas, sobre produto, políticas, acessibilidade, conteúdo
                ou tom, podem ser enviadas para <a href="mailto:apoio@lusorae.pt">apoio@lusorae.pt</a> (apoio
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
