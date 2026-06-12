import { LegalShell } from "./LegalShell";
import {
    LegalKPIs, LegalIconGrid, LegalLadder, LegalReportFlow, LegalVisualBlock,
} from "./_visuals";
import {
    Scale, ShieldAlert, ShieldCheck, Heart, Globe, Flag, Clock,
    AlertTriangle, ShieldOff, EyeOff, MessageCircle, UserX, Ban, Slash,
    Megaphone, BadgeCheck, Search, FileCheck, ArrowDownToLine, Brain,
} from "lucide-react";

export default function CommunityGuidelines() {
    return (
        <LegalShell
            active="community"
            title="Diretrizes da Comunidade"
            subtitle="As regras práticas que regem aquilo que se pode publicar, partilhar e dizer no Lusorae &mdash; e o que acontece quando alguém, voluntariamente ou não, sai delas. Em conformidade com o DSA, com a lei portuguesa e com aquilo a que nos comprometêmos publicamente."
            lastUpdated="Junho de 2026"
        >
            <LegalKPIs items={[
                { value: "8",       label: "categorias proibidas",     sub: "Mapeadas em §2",            icon: ShieldAlert },
                { value: "6",       label: "escalações de medida",     sub: "Aviso → Suspensão",         icon: ArrowDownToLine },
                { value: "6 meses", label: "recurso interno",           sub: "Art. 20.º DSA",             icon: Clock },
                { value: "24h",     label: "triagem urgente",           sub: "Casos críticos",            icon: AlertTriangle },
                { value: "Sim",     label: "trusted flaggers",          sub: "Art. 22.º DSA",             icon: BadgeCheck },
                { value: "Sim",     label: "relatórios públicos",       sub: "Arts. 15.º / 24.º DSA",     icon: FileCheck },
            ]} />

            <div className="legal-callout">
                <strong>Princípio orientador</strong>
                A liberdade de expressão é protegida pelo artigo 37.º da Constituição da República Portuguesa e
                pelo artigo 11.º da Carta dos Direitos Fundamentais da União Europeia. Não é, no entanto, um direito
                absoluto: cessa quando colide com a dignidade da pessoa humana, com a integridade de terceiros, ou
                com a lei. Estas Diretrizes existem para tornar esse equilíbrio claro, previsível e independente de
                quem está a aplicar a regra.
            </div>

            <h2>O que esperamos da comunidade</h2>
            <p>
                O Lusorae quer ser um sítio onde se conversa em português como se conversa nas melhores mesas:
                com vontade real de ouvir, com vontade real de discordar, com vontade real de descobrir. Não
                esperamos que toda a gente concorde &mdash; pelo contrário. Esperamos que se discorde dos
                <em> argumentos</em> e não das <em>pessoas</em>; que se cite quando se cita; que se assuma quando
                se opina; e que se aceite que há outras pessoas do outro lado, com a sua própria história e
                vulnerabilidade.
            </p>
            <p>
                As regras que se seguem não substituem o bom senso. Existem porque, em escala, o bom senso não
                basta &mdash; é preciso uma linguagem comum a que a equipa de Trust &amp; Safety possa responder de
                forma previsível. É essa a função destas Diretrizes.
            </p>

            <h2>O que é manifestamente proibido (e ilegal)</h2>
            <p>
                Os conteúdos que constituem ilícito criminal são removidos com prioridade absoluta e, quando
                aplicável, comunicados às autoridades competentes:
            </p>

            <LegalIconGrid tone="danger" items={[
                { label: "Material de abuso sexual de menores ou conteúdo de exploração sexual",      ref: "Arts. 176.º · 176.º-A CP", icon: ShieldAlert },
                { label: "Discurso de ódio e incitação à discriminação ou à violência",                 ref: "Art. 240.º CP",            icon: ShieldOff },
                { label: "Apologia, recrutamento ou financiamento do terrorismo",                       ref: "Lei n.º 52/2003",          icon: AlertTriangle },
                { label: "Ameaças graves, perseguição e <em>stalking</em>",                              ref: "Arts. 153.º · 154.º-A CP", icon: UserX },
                { label: "Divulgação não consentida de imagens íntimas ou conteúdo deepfake sexual",     ref: "Art. 192.º-A CP",          icon: EyeOff },
                { label: "Difamação, injúria, calunia com carácter persistente",                          ref: "Arts. 180.º-181.º CP",      icon: MessageCircle },
                { label: "Fraude, burla informática, usurpação de identidade",                           ref: "CP",                       icon: Ban },
                { label: "Violação de direitos de autor e direitos conexos",                              ref: "CDADC",                     icon: Slash },
            ]} />

            <h2>O que pode ser removido ou despromovido</h2>
            <p>
                Para além do manifestamente ilegal, existem categorias de Conteúdo que, sem constituirem crime,
                podem ser objeto de medidas de moderação &mdash; rotulagem, redução de alcance, remoção &mdash;
                quando a sua circulação cause dano significativo à comunidade:
            </p>

            <LegalIconGrid tone="warn" items={[
                { label: "Spam e comportamento coordenado inautêntico",                                              icon: Ban },
                { label: "Conteúdo sexual explícito não etiquetado em superfícies inadequadas",                       icon: EyeOff },
                { label: "Desinformação lesiva — em particular sobre saúde pública, integridade eleitoral, emergências", icon: AlertTriangle },
                { label: "Assédio coordenado (pile-on) dirigido a pessoa identificada",                                icon: UserX },
                { label: "Doxing — dados pessoais de terceiros sem fundamento legal válido",                            icon: ShieldOff },
                { label: "Conteúdo gerado por IA passado como humano sem identificação, ou deepfakes enganadores",     icon: Brain },
            ]} />

            <h2>Conteúdo sensível e etiquetagem</h2>
            <p>
                Algum Conteúdo não é ilegal nem está proibido, mas pode causar desconforto se aparecer sem aviso
                prévio &mdash; tópicos de violência, conteúdo relacionado com saúde mental, saúde física, ou
                discussões sensíveis sobre orientação sexual ou identidade. Pedimos ao autor que utilize, sempre
                que aplicável, a etiquetagem disponível (<em>spoiler</em>, conteúdo sensível, alerta de gatilho).
                Quando a etiquetagem não seja feita, a equipa de moderação pode aplicá-la de forma neutra, sem
                outras consequências para o autor.
            </p>

            <h2>Como reportar</h2>
            <p>
                Cada publicação, comentário, mensagem e perfil tem uma opção <em>Reportar</em>. As denúncias são
                tratadas em prazo razoável; em casos urgentes &mdash; segurança física, exploração de menores,
                ameaças credíveis &mdash; priorizamos a triagem imediata. Em conformidade com o artigo 16.º do DSA,
                qualquer pessoa, mesmo sem conta, pode notificar Conteúdo potencialmente ilegal.
            </p>

            <LegalVisualBlock eyebrow="Fluxo de denúncia" title="O que acontece desde o teu Reportar até à decisão final">
                <LegalReportFlow steps={[
                    {
                        title: "Notificação",
                        icon: Flag,
                        desc: "Usas o botão Reportar (ou escreves para o endereço dedicado) e indicas o motivo. Acolhemos notificações de pessoas sem conta (art. 16.º DSA).",
                        meta: "reportar@lusorae.pt",
                    },
                    {
                        title: "Triagem por gravidade",
                        icon: Search,
                        desc: "A equipa de moderação avalia o conteúdo à luz da lei, destas Diretrizes e do contexto. Casos críticos (segurança física, menores) entram em fila prioritária.",
                        meta: "Triagem urgente · 24h",
                    },
                    {
                        title: "Decisão fundamentada (Statement of Reasons)",
                        icon: FileCheck,
                        desc: "Aplicamos a medida proporcional (ver §7) e comunicamos a decisão ao autor com fundamentação detalhada — facto, regra aplicável, recurso disponível (art. 17.º DSA).",
                        meta: "Sempre por escrito",
                    },
                    {
                        title: "Recurso interno",
                        icon: ShieldCheck,
                        desc: "O autor pode contestar a decisão durante 6 meses no sistema interno de reclamação (art. 20.º DSA). É gratuito e é apreciado por pessoa diferente da que decidiu inicialmente.",
                        meta: "Janela: 6 meses",
                    },
                    {
                        title: "Resolução extrajudicial / judicial",
                        icon: Scale,
                        desc: "Se o desacordo persistir, pode recorrer-se a órgão certificado (art. 21.º DSA), centros de arbitragem de consumo, ou tribunais comuns.",
                        meta: "ODR · Tribunais comuns",
                    },
                ]} />
            </LegalVisualBlock>

            <p>
                Endereço dedicado para denúncias: <a href="mailto:reportar@lusorae.pt">reportar@lusorae.pt</a>.
                Para incidentes de segurança ou abuso ativo:{" "}
                <a href="mailto:abuso@lusorae.pt">abuso@lusorae.pt</a>.
            </p>

            <h2>Sinalizadores de confiança (<em>trusted flaggers</em>)</h2>
            <p>
                Reconhecemos o estatuto de &laquo;sinalizadores de confiança&raquo; certificados pelo Coordenador
                Nacional dos Serviços Digitais (ANACOM), nos termos do artigo 22.º do DSA. As suas notificações são
                tratadas com prioridade, mantendo-se em rigor os mesmos critérios de apreciação &mdash; a prioridade
                está no tempo de resposta, não no resultado. Suspendemos esta prioridade em relação a sinalizadores
                que, demonstradamente, submetam notificações infundadas com frequência.
            </p>

            <h2>Medidas e proporcionalidade</h2>
            <p>
                As medidas adotadas são proporcionais à gravidade do facto, ao impacto sobre terceiros e à
                reincidência. Por ordem crescente:
            </p>

            <LegalVisualBlock eyebrow="Princípio da proporcionalidade" title="Escala de medidas — do menos ao mais restritivo">
                <LegalLadder steps={[
                    { label: "Aviso interno",          desc: "Notificação ao autor, sem efeito visível para terceiros.",                                  icon: Flag },
                    { label: "Rotulagem (label)",      desc: "Aviso contextual mantendo o Conteúdo visível.",                                            icon: AlertTriangle },
                    { label: "Redução de alcance",     desc: "Diminuída exposição algorítmica sem ocultar para seguidores diretos.",                       icon: ArrowDownToLine },
                    { label: "Remoção do Conteúdo",    desc: "Retirada com Statement of Reasons fundamentada.",                                          icon: EyeOff },
                    { label: "Suspensão temporária",   desc: "Conta inativa por período proporcional. Recorrível.",                                      icon: UserX },
                    { label: "Suspensão permanente",   desc: "Apenas em casos manifestamente graves ou de reincidência sistemática. Recorrível.",          icon: ShieldOff },
                ]}
                caption="Toda a decisão é comunicada ao Utilizador com fundamentação (art. 17.º DSA) e pode ser contestada (arts. 20.º e 21.º DSA)." />
            </LegalVisualBlock>

            <h2>Recurso e revisão</h2>
            <p>
                Qualquer decisão de moderação pode ser objeto de:
            </p>
            <ol>
                <li><strong>Reclamação interna</strong>, gratuita, disponível durante pelo menos 6 meses após a comunicação da decisão (artigo 20.º do DSA). É apreciada por pessoa diferente da que decidiu inicialmente.</li>
                <li><strong>Resolução extrajudicial</strong> junto de órgão certificado pelo Coordenador dos Serviços Digitais (artigo 21.º do DSA).</li>
                <li><strong>Tribunais comuns</strong>, nos termos gerais do direito processual português.</li>
            </ol>
            <p>
                Quando o resultado do Recurso conclua pela reposição do Conteúdo ou da conta, a reposição é
                imediata e gratuita.
            </p>

            <h2>Crises e situações excecionais</h2>
            <p>
                Em situações de crise &mdash; emergências de saúde pública, processos eleitorais, atentados à
                segurança, catástrofes &mdash; podemos ativar protocolos específicos: reforço temporário da equipa
                de moderação, reforço da etiquetagem informativa, suspensão temporária de promoção algorítmica em
                tópicos sensíveis. Estes protocolos são sempre temporários, comunicados publicamente, e revistos
                após o fim da crise &mdash; em conformidade com o artigo 36.º do DSA quando aplicável.
            </p>

            <h2>Transparência operacional</h2>
            <p>
                Publicamos relatórios periódicos de transparência, em cumprimento dos artigos 15.º, 24.º e 42.º do
                DSA. Incluímos: número de notificações recebidas (por categoria), ações realizadas, tempos médios
                de resposta, decisões revertidas em sede de Recurso, recurso a sistemas automatizados, e
                comunicações a autoridades. Os relatórios ficam disponíveis em formato legível por humanos e por
                máquinas.
            </p>

            <h2>Em síntese, pessoa a pessoa</h2>
            <blockquote>
                Trata cada pessoa como tratarias um vizinho que ainda não conheces bem &mdash; com curiosidade,
                paciência, e firmeza quando for caso disso. Discorda dos argumentos, não das pessoas. Cita as fontes.
                Avisa quando estás a partilhar opinião, e quando estás a partilhar facto. E, sempre que possível,
                escreve melhor &mdash; a internet em português agradece.
            </blockquote>
        </LegalShell>
    );
}
