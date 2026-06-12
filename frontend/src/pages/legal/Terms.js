import { LegalShell } from "./LegalShell";
import { LegalIconGrid, LegalLadder, LegalVisualBlock, LegalTable, LegalSectionSummary } from "./_visuals";
import {
    AlertTriangle, EyeOff, Slash, ShieldAlert, ShieldOff, UserX, Ban, MessageCircle,
    Flag, ArrowDownToLine,
} from "lucide-react";

export default function Terms() {
    return (
        <LegalShell
            active="terms"
            title="Termos e Condições de Utilização"
            subtitle="O contrato entre ti e o Lusorae. Lê com atenção, ao criar conta, aceder ou utilizar o Serviço, aceitas integralmente o que aqui está escrito. Este documento é redigido em português e o original em português europeu prevalece sobre qualquer tradução."
            lastUpdated="Junho de 2026"
            eli5="Estes Termos definem o que esperas do Lusorae e o que o Lusorae espera de ti. Aplicam-se a partir do momento em que crias conta. Regem-se pela lei portuguesa e respeitam todos os direitos imperativos do consumidor."
        >
            <h2>Identificação do prestador</h2>
            <p>
                O Serviço Lusorae (adiante &ldquo;<strong>Plataforma</strong>&rdquo; ou &ldquo;<strong>Serviço</strong>&rdquo;)
                é prestado por <strong>Lusorae</strong>, pessoa coletiva de direito português, contactável em{" "}
                <a href="mailto:legal@lusorae.pt">legal@lusorae.pt</a>. Os dados completos de identificação societária
                (denominação, NIPC, morada da sede, matrícula e capital social) constam do{" "}
                <a href="/legal">Centro Legal</a> e são atualizados sempre que registados em ato definitivo. O cumprimento
                do dever de informação resulta do artigo 10.º do Decreto-Lei n.º 7/2004, de 7 de janeiro, e dos artigos
                11.º e seguintes do DSA.
            </p>

            <h2>Categoria DSA e Ponto Único de Contacto</h2>
            <p>
                O Lusorae qualifica-se como <strong>Plataforma Online</strong> na aceção do artigo 3.º, alínea i), do
                Regulamento (UE) 2022/2065 (DSA). À data de publicação destes Termos, o Serviço{" "}
                <strong>não atinge os limiares</strong> do artigo 33.º do DSA e, por conseguinte, não está designado
                como <em>Very Large Online Platform</em> (VLOP) pela Comissão Europeia. Qualquer alteração desta
                qualificação será aqui refletida e publicamente comunicada.
            </p>
            <p>
                Nos termos dos artigos 11.º e 12.º do DSA, designamos os seguintes pontos únicos de contacto:
            </p>
            <ul>
                <li>
                    <strong>Autoridades dos Estados-Membros, Comissão Europeia e Comité Europeu dos Serviços
                    Digitais</strong> (art. 11.º DSA):{" "}
                    <a href="mailto:legal@lusorae.pt">legal@lusorae.pt</a>.
                </li>
                <li>
                    <strong>Destinatários do Serviço</strong> (utilizadores) (art. 12.º DSA):{" "}
                    <a href="mailto:apoio@lusorae.pt">apoio@lusorae.pt</a>, sem prejuízo dos endereços
                    especializados (denúncias, recursos, RGPD) listados em <a href="/legal">Centro Legal</a>.
                </li>
            </ul>
            <p>
                As comunicações podem ser dirigidas em <strong>português europeu</strong> ou em{" "}
                <strong>inglês</strong>. Não exigimos qualquer formulário automatizado, qualquer mensagem de correio
                eletrónico recebida nos endereços acima é considerada validamente dirigida ao Ponto Único de Contacto.
                A autoridade nacional competente para a coordenação dos serviços digitais em Portugal é a{" "}
                <strong>ANACOM</strong>, designada pelo Decreto-Lei n.º 20-B/2024, de 16 de fevereiro.
            </p>

            <h2>Definições</h2>
            <p>Para efeitos destes Termos, entende-se por:</p>
            <LegalTable
                headers={["Termo", "Significado"]}
                rows={[
                    ["Plataforma / Serviço", "O conjunto de produtos digitais disponibilizados sob a marca Lusorae, incluindo aplicações web e móveis, APIs e qualquer extensão futura identificada com a mesma marca."],
                    ["Utilizador", "Pessoa singular com conta registada na Plataforma, sendo: (i) com idade igual ou superior a 16 anos, em utilização autónoma; ou (ii) com idade entre 13 e 15 anos, mediante consentimento ou autorização verificável dos representantes legais (artigo 16.º, n.º 2 da Lei n.º 58/2019)."],
                    ["Visitante", "Pessoa que aceda à Plataforma sem conta registada."],
                    ["Conteúdo", "Qualquer texto, imagem, vídeo, áudio, ligação, código, reação ou outro elemento criado, carregado, partilhado ou reagido na Plataforma."],
                    ["Conteúdo do Utilizador", "O Conteúdo gerado, carregado ou partilhado pelo Utilizador."],
                    ["Decisão de moderação", "Qualquer ato do prestador relativo à visibilidade, disponibilidade ou existência de Conteúdo, ou à conta de Utilizador, abrangido pelo artigo 14.º do DSA."],
                    ["Recurso", "Reclamação interna apresentada pelo Utilizador contra uma decisão de moderação, ao abrigo do artigo 20.º do DSA."],
                ]}
            />

            <h2>Objeto e aceitação</h2>
            <p>
                Estes Termos constituem o contrato celebrado entre a Plataforma e o Utilizador. Ao criar conta,
                aceder ou continuar a utilizar o Serviço, o Utilizador declara ter lido, compreendido e aceitar
                integralmente: estes Termos, a <a href="/legal/privacy">Política de Privacidade</a>, a{" "}
                <a href="/legal/cookies">Política de Cookies</a>, as{" "}
                <a href="/legal/community">Diretrizes da Comunidade</a> e os{" "}
                <a href="/legal/vision">seis compromissos institucionais</a> que descrevem a nossa visão.
            </p>
            <p>
                Quando o Utilizador seja consumidor, na aceção do artigo 2.º da Lei n.º 24/96, de 31 de julho, são
                aplicáveis as garantias imperativas previstas no Decreto-Lei n.º 84/2021 (conteúdos e serviços
                digitais) e a demais legislação de defesa do consumidor, prevalecendo sobre qualquer cláusula destes
                Termos que contra elas dispusesse.
            </p>

            <h2>Capacidade jurídica e idade mínima</h2>
            <p>
                O acesso ao Serviço observa três patamares etários cumulativos, articulados entre o artigo 8.º do
                RGPD, o artigo 16.º da Lei n.º 58/2019, de 8 de agosto, e o artigo 28.º do DSA:
            </p>
            <ul>
                <li>
                    <strong>Menores de 13 anos</strong>, a criação e utilização da conta não é permitida.
                    Conteúdo que se demonstre ter sido publicado por menor de 13 anos é objeto de remoção e a
                    conta é encerrada, sem prejuízo do exercício dos direitos pelos representantes legais.
                </li>
                <li>
                    <strong>Entre 13 e 15 anos</strong>, a utilização do Serviço só é admitida mediante
                    consentimento ou autorização verificável dos representantes legais (artigo 16.º, n.º 2 da
                    Lei n.º 58/2019), aplicando-se desde logo a interdição de publicidade baseada em{" "}
                    <em>profiling</em> prevista no artigo 28.º do DSA.
                </li>
                <li>
                    <strong>16 anos ou mais</strong>, utilização autónoma do Serviço e plena capacidade para
                    aceitar estes Termos, sem prejuízo das normas gerais de capacidade civil.
                </li>
            </ul>
            <p>
                A Plataforma reserva-se o direito de adotar mecanismos razoáveis e proporcionais de verificação
                etária, nomeadamente nos termos do artigo 28.º do DSA, com a menor intrusividade possível sobre
                dados pessoais. A prestação de informação falsa sobre idade constitui violação contratual e
                fundamento bastante para suspensão imediata da conta.
            </p>

            <h2>Conta de utilizador</h2>
            <h3>Criação</h3>
            <p>
                A criação de conta exige um endereço de e-mail válido, uma palavra-passe e um nome de utilizador
                único. O Utilizador é responsável pela veracidade dos dados fornecidos e por os manter atualizados.
            </p>
            <h3>Segurança e responsabilidade</h3>
            <p>
                O Utilizador é responsável pela confidencialidade das credenciais de acesso e por qualquer atividade
                realizada a partir da sua conta. Em caso de suspeita de acesso não autorizado, deve notificar
                imediatamente o Lusorae através de <a href="mailto:abuso@lusorae.pt">abuso@lusorae.pt</a> e proceder
                à alteração imediata da palavra-passe.
            </p>
            <h3>Uma pessoa, uma conta</h3>
            <p>
                Cada Utilizador deve manter, em regra, uma única conta. Contas adicionais com finalidade legítima
                (e.g. profissional vs. pessoal, conta de projeto, conta institucional) são admitidas; contas adicionais
                cuja única função seja contornar uma sanção anteriormente aplicada constituem infração destes Termos.
            </p>
            <h3>Encerramento pelo Utilizador</h3>
            <p>
                O Utilizador pode, a todo o tempo, encerrar a sua conta nas Definições, sem necessidade de invocar
                motivo. A eliminação é executada nos termos da{" "}
                <a href="/legal/privacy">Política de Privacidade</a>, em regra, em até 30 dias, salvo
                períodos de conservação legalmente exigidos.
            </p>

            <h2>Conteúdos do Utilizador</h2>
            <LegalSectionSummary>
                Continuas dono do que publicas. Damo-nos apenas a licença mínima necessária para operar a Plataforma e para te mostrar o teu próprio conteúdo. Não vendemos. Não usamos para treinar IA sem consentimento expresso.
            </LegalSectionSummary>
            <h3>Titularidade</h3>
            <p>
                O Utilizador mantém integralmente a titularidade dos direitos sobre os Conteúdos que publica. A
                Plataforma não reivindica qualquer direito de autor ou direito conexo sobre esses Conteúdos.
            </p>
            <h3>Licença concedida ao Lusorae</h3>
            <p>
                Ao publicar um Conteúdo na Plataforma, o Utilizador concede ao Lusorae uma{" "}
                <strong>licença mundial, não exclusiva, gratuita</strong> e estritamente limitada à operação,
                exibição, distribuição interna na Plataforma, indexação, moderação, salvaguarda técnica e
                eventual promoção do próprio Conteúdo dentro do Serviço. Esta licença:
            </p>
            <ul>
                <li><strong>não autoriza</strong> a venda, sublicenciamento comercial ou cessão do Conteúdo a terceiros para finalidade independente da operação da Plataforma;</li>
                <li><strong>não autoriza</strong> a utilização do Conteúdo para treino de modelos de inteligência artificial sem consentimento adicional expresso do Utilizador;</li>
                <li><strong>caduca</strong> com a eliminação do Conteúdo, salvo quando seja necessário conservá-lo para cumprimento de obrigação legal, prevenção de fraude ou exercício de direitos em processo judicial ou administrativo.</li>
            </ul>
            <h3>Garantias do Utilizador</h3>
            <p>O Utilizador declara e garante, ao publicar Conteúdo:</p>
            <ul>
                <li>Ser titular dos direitos ou dispor de autorização suficiente para o publicar;</li>
                <li>Que o Conteúdo não viola direitos de terceiros, designadamente direitos de autor (Código do Direito de Autor e dos Direitos Conexos), direitos de personalidade ou de proteção de dados pessoais;</li>
                <li>Que o Conteúdo cumpre a lei, as <a href="/legal/community">Diretrizes da Comunidade</a> e estes Termos.</li>
            </ul>
            <h3>Notificações de conteúdo ilícito e Direitos de Autor</h3>
            <p>
                Em conformidade com os artigos 16.º a 18.º do DSA, qualquer pessoa, mesmo sem conta, pode notificar
                Conteúdo potencialmente ilícito através do mecanismo &ldquo;<em>Reportar</em>&rdquo; presente em cada
                publicação, ou enviando notificação fundamentada para{" "}
                <a href="mailto:reportar@lusorae.pt">reportar@lusorae.pt</a>. Para alegadas violações de direitos
                de autor, aplicam-se ainda os regimes específicos resultantes da Diretiva (UE) 2019/790, transposta
                em Portugal pelo <strong>Decreto-Lei n.º 47/2023, de 19 de junho</strong> (ao abrigo da Lei de
                autorização legislativa n.º 11/2023, de 22 de março), sem prejuízo da aplicação do Código do Direito
                de Autor e dos Direitos Conexos.
            </p>

            <h2>Condutas proibidas</h2>
            <p>
                Sem prejuízo das <a href="/legal/community">Diretrizes da Comunidade</a> (que detalham casos
                concretos), o Utilizador compromete-se a não utilizar a Plataforma para:
            </p>

            <LegalIconGrid tone="danger" items={[
                { label: "Conteúdo ilegal: violência, ódio, abuso de menores ou apologia do terrorismo", ref: "CP · L. 52/2003", icon: ShieldAlert },
                { label: "Fraude, engano ou usurpação de identidade",                                  ref: "CP · DSA",        icon: UserX },
                { label: "Recolha não autorizada de dados (scraping) ou raspagem em escala",            ref: "RGPD",            icon: EyeOff },
                { label: "Compromisso da integridade técnica, acesso indevido ou exfiltração",          ref: "Acesso indevido", icon: ShieldOff },
                { label: "Spam, malware, smishing ou conteúdo enganador automatizado",                   ref: "DSA art. 14.º",   icon: Ban },
                { label: "Operação de contas automatizadas (bots) sem identificação clara",              ref: "DSA",             icon: Slash },
                { label: "Doxing, divulgação de dados pessoais de terceiros sem base legal",              ref: "Art. 192.º-A CP", icon: AlertTriangle },
                { label: "Difamação, injúria, assédio ou perseguição (stalking)",                         ref: "Arts. 180.º · 181.º · 154.º-A CP", icon: MessageCircle },
                { label: "Violação de direitos de personalidade: nome, imagem, palavra, reserva da vida privada, integridade moral", ref: "CC arts. 70.º a 81.º", icon: ShieldAlert },
            ]} />

            <h2>Moderação e medidas</h2>
            <p>
                Em cumprimento dos artigos 14.º, 15.º, 17.º, 20.º, 24.º e 42.º do DSA, mantemos uma política de
                moderação pública (estes Termos e as Diretrizes), notificamos as decisões aos seus destinatários
                com a respetiva fundamentação, e publicamos relatórios periódicos de transparência.
            </p>
            <p>
                As medidas seguem o <strong>princípio da proporcionalidade</strong>: começam pelo menos restritivo
                e só escalam quando a gravidade do facto, o impacto sobre terceiros, ou a reincidência o justifiquem.
            </p>

            <LegalVisualBlock eyebrow="Princípio da proporcionalidade" title="Escala de medidas, do menos ao mais restritivo">
                <LegalLadder steps={[
                    { label: "Aviso interno",            desc: "Notificação ao Utilizador, com identificação do Conteúdo e da regra aplicável. Sem efeito visível para terceiros.", icon: Flag },
                    { label: "Rotulagem (label)",        desc: "O Conteúdo permanece visível, mas com aviso contextual (e.g. sensível, possivelmente desinformação verificada).",      icon: AlertTriangle },
                    { label: "Redução de alcance",       desc: "Diminuída a exposição algorítmica em superfícies de descoberta, sem ocultação para seguidores diretos.",                icon: ArrowDownToLine },
                    { label: "Remoção do Conteúdo",      desc: "O Conteúdo é retirado e o autor notificado com Statement of Reasons fundamentado (art. 17.º DSA).",                      icon: EyeOff },
                    { label: "Suspensão temporária",     desc: "A conta fica inativa por período determinado e proporcionado. Recorrível durante 6 meses.",                                 icon: UserX },
                    { label: "Suspensão permanente",     desc: "Apenas em casos manifestamente graves ou de reincidência. Recorrível. Não impede o exercício dos direitos RGPD.",          icon: ShieldOff },
                ]}
                caption="Cada medida pode ser objeto de Recurso interno gratuito (art. 20.º DSA) durante pelo menos 6 meses após a comunicação da decisão." />
            </LegalVisualBlock>

            <h3>Notificação fundamentada ao Utilizador</h3>
            <p>
                Sempre que adotemos uma decisão de moderação que afete a visibilidade ou disponibilidade de um
                Conteúdo, ou a conta do Utilizador, comunicamos a decisão por meio durável, identificando: o facto
                concreto, a regra aplicável (estes Termos, as Diretrizes ou a lei), os meios de recurso disponíveis
                e o prazo para os exercer. Este dever resulta do artigo 17.º do DSA.
            </p>
            <h3>Decisões automatizadas</h3>
            <p>
                A primeira triagem de algum Conteúdo manifestamente ilegal (e.g. material de abuso sexual infantil)
                pode ser feita por sistemas automatizados, com revisão humana subsequente sempre que tecnicamente
                viável. Para classes de Conteúdo cuja apreciação dependa de contexto (e.g. crítica política,
                sátira, conteúdo artístico), a decisão é, em regra, humana.
            </p>

            <h2>Sistema interno de reclamação (Recurso)</h2>
            <p>
                O Utilizador pode contestar qualquer decisão de moderação através do <strong>Recurso interno</strong>{" "}
                previsto no artigo 20.º do DSA. O Recurso:
            </p>
            <ul>
                <li>é gratuito;</li>
                <li>está disponível durante, pelo menos, <strong>6 meses</strong> a contar da comunicação da decisão;</li>
                <li>é apreciado por pessoa qualificada que não tenha participado na decisão original;</li>
                <li>é decidido em prazo razoável, em regra inferior a 14 dias úteis, sem prejuízo da complexidade do caso;</li>
                <li>obriga ao restabelecimento do Conteúdo ou da conta sempre que o resultado seja procedente, sem custos para o Utilizador.</li>
            </ul>
            <p>
                O Recurso pode ser apresentado a partir da própria notificação de decisão ou enviado para{" "}
                <a href="mailto:recurso@lusorae.pt">recurso@lusorae.pt</a>.
            </p>

            <h2>Resolução extrajudicial e judicial</h2>
            <p>
                Sem prejuízo do direito de recurso aos tribunais comuns, o Utilizador pode submeter litígios sobre
                decisões de moderação a um órgão de resolução extrajudicial certificado nos termos do artigo 21.º
                do DSA. Pode ainda recorrer aos <strong>meios alternativos de resolução de litígios de consumo</strong>{" "}
                certificados pela Direção-Geral do Consumidor (DGC), nos termos da Lei n.º 144/2015, de 8 de setembro,
                incluindo os centros de arbitragem de consumo aderentes ao sistema nacional. A lista oficial dos
                centros e respetivas competências está disponível em{" "}
                <a href="https://www.consumidor.gov.pt" target="_blank" rel="noopener noreferrer">
                    consumidor.gov.pt
                </a>.
            </p>

            <h2>Suspensão pelo prestador</h2>
            <p>
                Nos termos do artigo 23.º do DSA, podemos suspender o Serviço a utilizadores que, com manifesta
                frequência, publiquem Conteúdo ilegal, ou apresentem notificações ou recursos manifestamente
                infundados, sempre mediante aviso prévio e fundamentado, tendo em conta as circunstâncias concretas
                do caso (gravidade, intenção, contexto e reincidência).
            </p>

            <h2>Publicidade e algoritmos de recomendação</h2>
            <p>
                Sempre que apresentemos conteúdo publicitário, esse conteúdo é identificado em tempo real, de forma
                clara, e acompanhado da indicação do anunciante e dos parâmetros principais que motivaram a sua
                apresentação ao Utilizador (artigos 26.º e 39.º do DSA).
            </p>
            <p>
                Os parâmetros principais dos sistemas de recomendação que utilizamos são descritos nas Definições da
                conta, em linguagem clara, conforme o artigo 27.º do DSA. Sempre que ofereçamos personalização
                baseada em <em>profiling</em>, está disponível, no mesmo lugar, uma alternativa não personalizada
                que o Utilizador pode escolher.
            </p>
            <p>
                Em conformidade com o artigo 28.º do DSA, e com o terceiro dos nossos{" "}
                <a href="/legal/vision">seis compromissos</a>, não apresentamos publicidade baseada em{" "}
                <em>profiling</em> a utilizadores que se saiba (ou se presuma com razoabilidade) serem menores.
            </p>

            <h2>Propriedade intelectual da Plataforma</h2>
            <p>
                A marca &ldquo;Lusorae&rdquo;, o logótipo, a interface, o sistema de desenho, o código-fonte
                proprietário e demais elementos distintivos são propriedade do prestador ou estão licenciados ao
                prestador, encontrando-se protegidos pelo Código da Propriedade Industrial e pelo Código do Direito
                de Autor e dos Direitos Conexos. Componentes de código aberto utilizados na Plataforma estão sujeitos
                às respetivas licenças, disponíveis a pedido para <a href="mailto:legal@lusorae.pt">legal@lusorae.pt</a>.
            </p>

            <h2>Disponibilidade do Serviço</h2>
            <p>
                Envidamos esforços razoáveis para manter o Serviço disponível e operacional. Não garantimos, contudo,
                disponibilidade ininterrupta: o Serviço pode ser objeto de manutenções programadas, atualizações,
                ou interrupções decorrentes de falhas de infraestrutura. Quando possível, comunicamos manutenções
                programadas com antecedência razoável através das superfícies oficiais da Plataforma. Eventos
                de força maior (catástrofe natural, falha generalizada de redes públicas, decisão regulatória
                superveniente) suspendem a responsabilidade pelo período da sua duração.
            </p>

            <h2>Limitação de responsabilidade</h2>
            <p>
                Nos limites máximos permitidos pela lei aplicável, e sem prejuízo das normas imperativas a favor
                do consumidor, a responsabilidade do Lusorae limita-se aos danos diretos resultantes de incumprimento
                doloso ou com culpa grave. Não respondemos por danos indiretos, lucros cessantes ou perda de
                oportunidade. As cláusulas de exclusão ou limitação de responsabilidade estão sujeitas ao regime
                das cláusulas contratuais gerais (Decreto-Lei n.º 446/85, de 25 de outubro), prevalecendo as normas
                imperativas em matéria de defesa do consumidor.
            </p>
            <p>
                <strong>Salvaguarda do consumidor.</strong> Esta limitação <strong>não se aplica</strong> ao
                Utilizador que actue na qualidade de consumidor na aceção do artigo 2.º da Lei n.º 24/96, de 31 de
                julho, nem aos danos resultantes da violação de direitos imperativos do consumidor, do RGPD, do DSA,
                do Decreto-Lei n.º 84/2021 ou de qualquer outra legislação imperativa portuguesa ou da União
                Europeia. As cláusulas que, no contexto de um contrato com consumidor, infringissem os artigos 18.º
                e 21.º do Decreto-Lei n.º 446/85 consideram-se não escritas.
            </p>

            <h2>Subscrições pagas (Plus, Aura)</h2>
            <LegalSectionSummary>
                A versão base é grátis e continua a ser. Os planos pagos só dão ferramentas adicionais, nunca alcance, prioridade ou influência sobre a moderação. Tens 14 dias para cancelar sem motivo e sem custo (livre resolução).
            </LegalSectionSummary>
            <p>
                A utilização do Serviço-base é, e continuará a ser, gratuita. Determinadas funcionalidades adicionais
                de expressão, conforto e identidade podem ser disponibilizadas mediante subscrição paga (planos{" "}
                <em>Plus</em> e <em>Aura</em>, descritos com detalhe em <a href="/premium">/premium</a>).
            </p>
            <p>
                Quando o Utilizador subscreva um plano pago, e na qualidade de consumidor à distância na aceção do
                Decreto-Lei n.º 24/2014, de 14 de fevereiro, dispõe do <strong>direito de livre resolução</strong>{" "}
                no prazo de <strong>14 dias</strong> a contar da celebração do contrato, sem necessidade de invocar
                motivo e sem custos, salvo eventual valor proporcional ao serviço já prestado quando a execução tenha
                começado com consentimento expresso do Utilizador. As subscrições renovam-se automaticamente até
                ao cancelamento, que pode ser efetuado nas Definições da conta. Em caso de falha temporária de
                cobrança, mantemos os direitos premium ativos durante <strong>7 dias</strong> de tolerância antes
                de regressar o plano ao gratuito.
            </p>
            <p>
                Coerentemente com o quinto dos nossos <a href="/legal/vision">seis compromissos</a>, os planos pagos
                não conferem qualquer vantagem algorítmica, social ou de prioridade na moderação.
            </p>

            <h2>Alteração destes Termos</h2>
            <p>
                Podemos atualizar estes Termos. Alterações materialmente relevantes são comunicadas com pelo menos{" "}
                <strong>15 dias</strong> de antecedência, por aviso na Plataforma e/ou por e-mail. A continuação
                de utilização após a entrada em vigor das alterações implica a sua aceitação; se o Utilizador não
                concordar, pode encerrar a conta sem qualquer penalização. As versões anteriores ficam acessíveis,
                a pedido, para <a href="mailto:legal@lusorae.pt">legal@lusorae.pt</a>.
            </p>

            <h2>Inatividade prolongada e sucessão</h2>
            <p>
                Contas com inatividade superior a <strong>36 meses</strong> podem ser objeto de procedimento de
                arquivamento técnico, com aviso prévio ao endereço de e-mail associado, sem prejuízo dos direitos
                de privacidade do titular.
            </p>
            <p>
                Em caso de falecimento do Utilizador, herdeiros ou pessoas com legitimidade reconhecida podem,
                mediante prova documental adequada (certidão de óbito, comprovação de legitimidade), solicitar:
                (i) a memorialização da conta, com restrição de novas publicações; (ii) a transferência de Conteúdos
                em formato portátil, nos termos do artigo 20.º do RGPD; ou (iii) a eliminação da conta. Os pedidos
                são tratados em <a href="mailto:privacidade@lusorae.pt">privacidade@lusorae.pt</a>.
            </p>

            <h2>Reorganizações societárias e cessão</h2>
            <p>
                Em caso de fusão, aquisição ou transmissão de estabelecimento, os contratos com utilizadores são
                transmitidos ao novo titular, no quadro do regime do RGPD, com prévia comunicação aos utilizadores e
                respeito pelos seus direitos de oposição e eliminação da conta. A transmissão não pode degradar os
                direitos contratuais já adquiridos pelo Utilizador.
            </p>

            <h2>Lei aplicável e foro</h2>
            <p>
                Estes Termos regem-se pela <strong>lei portuguesa</strong>. Sem prejuízo dos direitos imperativos
                que assistem ao consumidor (artigo 6.º do Regulamento (CE) n.º 593/2008, Roma I), as partes
                elegem o <strong>Juízo competente em razão do território da sede social do prestador</strong>, no
                Tribunal Judicial respetivo, nos termos da Lei n.º 62/2013, de 26 de agosto (Lei da Organização do
                Sistema Judiciário), com expressa renúncia a qualquer outro. Consumidores podem, em alternativa,
                recorrer ao seu próprio foro nos termos do Regulamento (UE) n.º 1215/2012.
            </p>

            <h2>Contactos institucionais</h2>
            <p>
                Para qualquer matéria contratual:{" "}
                <a href="mailto:legal@lusorae.pt">legal@lusorae.pt</a>. Para exercício de direitos RGPD:{" "}
                <a href="mailto:privacidade@lusorae.pt">privacidade@lusorae.pt</a>. Para denúncias de Conteúdo:{" "}
                <a href="mailto:reportar@lusorae.pt">reportar@lusorae.pt</a>. Para Recursos:{" "}
                <a href="mailto:recurso@lusorae.pt">recurso@lusorae.pt</a>. Para incidentes de segurança:{" "}
                <a href="mailto:abuso@lusorae.pt">abuso@lusorae.pt</a>. Apoio geral:{" "}
                <a href="mailto:apoio@lusorae.pt">apoio@lusorae.pt</a>.
            </p>
        </LegalShell>
    );
}
