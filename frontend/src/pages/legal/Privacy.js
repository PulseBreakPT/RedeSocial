import { LegalShell } from "./LegalShell";
import {
    LegalFlow, LegalDataMap, LegalRightsGrid, LegalTimeline, LegalVisualBlock,
    LegalTable, LegalSectionSummary,
} from "./_visuals";
import {
    FileText, Lock,
    User, Database, Monitor, MousePointerClick, MapPin, MessageCircle, Cookie,
    Building2, Gavel, ArrowRight, Download, Edit3, Trash2, Ban, Key, EyeOff,
    Server,
} from "lucide-react";

export default function Privacy() {
    return (
        <LegalShell
            active="privacy"
            title="Política de Privacidade"
            subtitle="O documento que descreve, em detalhe, como tratamos dados pessoais, o que recolhemos, porque o fazemos, durante quanto tempo o conservamos, com quem o partilhamos, e quais os direitos que assistem a quem usa o Lusorae."
            lastUpdated="Junho de 2026"
            eli5="Não vendemos, não alugamos, não cedemos dados pessoais. Recolhemos só o necessário, com fundamento legal claro, e dás-te todos os direitos do RGPD para acederes, corrigires, apagares ou levares contigo o que é teu."
        >
            <h2>Responsável pelo tratamento</h2>
            <p>
                O <strong>Lusorae</strong> é o responsável pelo tratamento (<em>controller</em>) dos dados pessoais
                tratados no âmbito do Serviço. Os dados completos de identificação societária do prestador (denominação,
                NIPC, morada da sede) e os contactos institucionais constam do <a href="/legal">Centro Legal</a>.
            </p>

            <h2>Encarregado de Proteção de Dados (DPO)</h2>
            <p>
                Designamos um Encarregado de Proteção de Dados, nos termos dos artigos 37.º a 39.º do RGPD. O DPO
                opera com independência funcional, não recebe instruções no exercício das suas tarefas, e é
                contactável diretamente em <a href="mailto:dpo@lusorae.pt">dpo@lusorae.pt</a>, ou por correio
                postal para a sede social, ao cuidado do &laquo;Encarregado de Proteção de Dados&raquo;.
            </p>

            <h2>Princípios que seguimos</h2>
            <p>
                Aplicamos integralmente os princípios do artigo 5.º do RGPD, licitude, lealdade,
                transparência, limitação das finalidades, minimização, exatidão, limitação da conservação,
                integridade e responsabilidade. Operacionalmente, traduzimo-los em quatro práticas:
            </p>
            <ul>
                <li><strong>Privacidade por defeito</strong>, cada novo recurso é lançado com as definições mais protetoras do utilizador como configuração inicial (artigo 25.º do RGPD).</li>
                <li><strong>Privacy by design</strong>, novas funcionalidades passam por uma análise de impacto interna antes do lançamento; quando o tratamento envolva risco elevado, realizamos uma Avaliação de Impacto sobre a Proteção de Dados (artigo 35.º do RGPD).</li>
                <li><strong>Minimização real</strong>, não recolhemos &laquo;por garantia&raquo;. Cada campo opcional está identificado como tal.</li>
                <li><strong>Auditoria interna anual</strong>, revemos finalidades, prazos, subcontratantes e fundamentos legais pelo menos uma vez por ano, em coerência com o sexto dos nossos <a href="/legal/vision">compromissos</a>.</li>
            </ul>

            <h2>Categorias de dados pessoais tratados</h2>

            <LegalVisualBlock eyebrow="Mapa de dados" title="O que recolhemos, com que detalhe">
                <LegalDataMap items={[
                    { title: "Identificação e conta", tone: "identity",  icon: User,          examples: "Nome de utilizador, e-mail, palavra-passe (cifrada), foto de perfil, biografia." },
                    { title: "Conteúdo gerado",        tone: "content",   icon: FileText,      examples: "Publicações, comentários, mensagens, gostos, repostos, listas, marcadores." },
                    { title: "Dados técnicos",         tone: "technical", icon: Monitor,       examples: "Endereço IP, browser, SO, identificadores de dispositivo, logs de acesso." },
                    { title: "Dados de utilização",    tone: "usage",     icon: MousePointerClick, examples: "Páginas visitadas, interações, tempo de sessão, preferências." },
                    { title: "Localização aproximada", tone: "location",  icon: MapPin,        examples: "Derivada do IP (cidade/região). Sem GPS por defeito." },
                    { title: "Comunicação",            tone: "comm",      icon: MessageCircle, examples: "Mensagens com apoio, denúncias, recursos, suporte." },
                    { title: "Cookies e equivalentes",  tone: "cookies",   icon: Cookie,        examples: "Ver Política de Cookies." },
                ]} />
            </LegalVisualBlock>

            <p>
                Não recolhemos intencionalmente categorias especiais de dados pessoais (artigo 9.º do RGPD), tais
                como dados de saúde, origem racial ou étnica, opiniões políticas, convicções religiosas, vida sexual
                ou orientação sexual. Se o Utilizador optar por publicar livremente esse tipo de informação, fá-lo por
                iniciativa própria, em conformidade com o artigo 9.º, n.º 2, alínea e) do RGPD (dados manifestamente
                tornados públicos pelo titular).
            </p>
            <p>
                Não tratamos dados biométricos para fins de identificação unívoca, nem dados genéticos. Não utilizamos
                técnicas de <em>fingerprinting</em> agressivo para reidentificar utilizadores entre dispositivos.
            </p>

            <h2>Finalidades e fundamentos legais</h2>
            <LegalTable
                headers={["Finalidade", "Categorias", "Fundamento (RGPD)"]}
                rows={[
                    [
                        "Criação e manutenção da conta; prestação de funcionalidades do Serviço; exibição de Conteúdo.",
                        "Identificação, Conteúdo, Técnicos.",
                        <>Art. 6.º, n.º 1, al. b), execução do contrato.</>,
                    ],
                    [
                        "Cumprimento de obrigações legais (resposta a autoridades, conservação fiscal, comunicações CNPD).",
                        "Conforme exigido.",
                        "Art. 6.º, n.º 1, al. c).",
                    ],
                    [
                        "Segurança, prevenção de fraude, anti-abuso, integridade dos sistemas.",
                        "Técnicos, Utilização, Localização aproximada.",
                        <>Art. 6.º, n.º 1, al. f), interesse legítimo do prestador e dos demais utilizadores.</>,
                    ],
                    [
                        "Moderação de Conteúdo (avaliação de notificações, decisão e recurso).",
                        "Conteúdo, Comunicação.",
                        <>Art. 6.º, n.º 1, al. c) e f), obrigação legal (DSA) e interesse legítimo.</>,
                    ],
                    [
                        "Estatística agregada, métricas anónimas e melhoria do Serviço.",
                        "Utilização (agregados).",
                        "Art. 6.º, n.º 1, al. f).",
                    ],
                    [
                        "Comunicações de produto opcionais (newsletter, novidades, programas-piloto).",
                        "Identificação.",
                        <>Art. 6.º, n.º 1, al. a), consentimento (revogável a qualquer momento).</>,
                    ],
                    [
                        "Cookies analíticos e funcionais não estritamente necessários.",
                        "Cookies.",
                        <>Art. 5.º, n.º 3, Lei n.º 41/2004, consentimento.</>,
                    ],
                ]}
            />

            <h2>Origem dos dados</h2>
            <p>Os dados pessoais tratados têm três origens, devidamente diferenciadas:</p>
            <ol>
                <li><strong>Fornecidos pelo Utilizador</strong>, no registo, na configuração do perfil, ao publicar Conteúdo ou ao contactar o suporte.</li>
                <li><strong>Gerados pela interação</strong>, logs técnicos, padrões de utilização, eventos de segurança.</li>
                <li><strong>Obtidos através de terceiros</strong>, apenas quando o Utilizador o autorize (e.g. <em>login</em> federado), e estritamente com o âmbito mínimo necessário à finalidade.</li>
            </ol>

            <h2>Destinatários e subcontratantes</h2>

            <LegalVisualBlock eyebrow="Quem pode aceder, e em que termos" title="O percurso dos teus dados">
                <LegalFlow steps={[
                    { label: "Tu",                  sub: "Titular dos dados",            icon: User,        accent: "accent-strong" },
                    { label: "Lusorae",             sub: "Responsável pelo tratamento",   icon: Database },
                    { label: "Subcontratantes",     sub: "Sob contrato art. 28.º RGPD",   icon: Server },
                    { label: "Autoridades",         sub: "Apenas com fundamento legal",   icon: Building2,   accent: "accent-warn" },
                ]}
                caption="Não vendemos dados pessoais. Subcontratantes operam sob contrato escrito com finalidade estritamente técnica." />
            </LegalVisualBlock>

            <p>
                Recorremos a subcontratantes para operações técnicas que não faz sentido manter internamente. Em
                todos os casos, o contrato celebrado nos termos do artigo 28.º do RGPD limita o tratamento à
                finalidade específica acordada, exige medidas de segurança equivalentes às nossas e proíbe a
                utilização dos dados para finalidades próprias dos subcontratantes. As categorias de subcontratantes
                que utilizamos são:
            </p>
            <ul>
                <li>Alojação em nuvem e infraestrutura de servidores (UE).</li>
                <li>Envio de e-mail transacional e SMS de segurança.</li>
                <li>Serviços de proteção anti-fraude, anti-DDoS e mitigação de abuso.</li>
                <li>Processamento de pagamentos de subscrições (quando aplicável; não tratamos dados de cartões).</li>
                <li>Apoio ao utilizador e bilhética de suporte.</li>
                <li>Sistemas analíticos em primeira-parte, com IP pseudonimizado.</li>
            </ul>
            <p>
                A lista nominativa atualizada dos subcontratantes em produção, com país de alojação e finalidade,
                está disponível mediante pedido para <a href="mailto:dpo@lusorae.pt">dpo@lusorae.pt</a>. Comunicamos
                com 30 dias de antecedência alterações materiais a esta lista.
            </p>
            <p>
                Os dados podem ainda ser comunicados a autoridades judiciais, policiais ou regulatórias, no estrito
                cumprimento de obrigação legal válida (ordem judicial fundamentada, mandado de autoridade competente,
                pedido motivado nos termos do DSA). Recusamos pedidos que não sejam objeto de base legal válida e
                contestamos pedidos abusivos.
            </p>

            <h2>Transferências internacionais</h2>
            <p>
                A nossa preferencia operacional é manter os dados <strong>no Espaço Económico Europeu</strong>. Quando,
                excecionalmente, ocorram transferências para fora do EEE (e.g. apoio internacional, redundância
                técnica), aplicamos uma das garantias previstas nos artigos 44.º a 49.º do RGPD: decisão de
                adequação da Comissão Europeia; cláusulas contratuais-tipo (SCC, Decisão 2021/914) com Transfer Impact
                Assessment documentada; ou regras vinculativas para empresas (BCR). O Utilizador pode solicitar
                cópia das garantias aplicadas, mediante pedido para <a href="mailto:dpo@lusorae.pt">dpo@lusorae.pt</a>.
            </p>

            <h2>Prazos de conservação</h2>

            <LegalVisualBlock eyebrow="Quanto tempo guardamos os dados" title="Linha do tempo de retenção">
                <LegalTimeline items={[
                    { when: "ENQUANTO ATIVA",    what: "Dados de conta e Conteúdo publicado",  note: "Permanecem ativos enquanto a conta existir.",          tone: "short" },
                    { when: "30 DIAS",            what: "Após pedido de eliminação",             note: "Eliminação concretizada. Retenção mínima por obrigação legal pode estender registos específicos.", tone: "short" },
                    { when: "12 MESES",           what: "Logs de segurança e acesso",            note: "Salvo necessidade de prova em incidente em curso.",    tone: "medium" },
                    { when: "13 MESES",           what: "Cookies analíticos",                    note: "Apenas com consentimento expresso. Renovável.",        tone: "medium" },
                    { when: "24 MESES",           what: "Denúncias e recursos arquivados",       note: "Tempo útil para auditoria de coerência de decisões.", tone: "medium" },
                    { when: "6 MESES (PRORROGÁVEL)", what: "Dados associados a Recurso ativo",   note: "Até ao trânsito em julgado, se aplicável.",            tone: "medium" },
                    { when: "PRAZOS IMPERATIVOS", what: "Obrigações setoriais aplicáveis",     note: "Quando estejamos vinculados a prazos legais específicos de conservação (obrigações fiscais, ordens judiciais, regimes setoriais), aplicam-se esses prazos.", tone: "long" },
                    { when: "10 ANOS",            what: "Faturas e documentos fiscais",          note: "Artigo 123.º do CIRC e legislação tributária.",       tone: "long" },
                ]}
                caption="Findo cada prazo, os dados são eliminados de forma irreversível ou anonimizados de forma a impedir a sua reidentificação." />
            </LegalVisualBlock>

            <h2>Decisões automatizadas e algoritmos de recomendação</h2>
            <p>
                Utilizamos sistemas algorítmicos para: (i) ordenar o feed e sugerir Conteúdo, contas, eventos e
                comunidades; (ii) detetar abuso, spam e Conteúdo manifestamente ilegal; (iii) personalizar a
                experiência em superfícies opcionais. Estes sistemas <strong>não produzem efeitos jurídicos</strong>{" "}
                nem afetam o Utilizador de forma significativamente similar, nos termos do artigo 22.º do RGPD.
            </p>
            <p>
                O Utilizador dispõe, nas Definições da conta, da opção de utilizar uma alternativa{" "}
                <strong>não personalizada</strong>, em cumprimento do artigo 27.º do DSA e em coerência com o
                segundo dos nossos <a href="/legal/vision">compromissos</a>.
            </p>
            <p>
                Em conformidade com o artigo 9.º da Lei n.º 27/2021, garantimos transparência sobre os parâmetros
                essenciais dos algoritmos utilizados.
            </p>

            <h2>Os teus direitos enquanto titular dos dados</h2>
            <LegalSectionSummary>
                Tens 8 direitos directamente exercíveis: aceder, corrigir, apagar, limitar, levar contigo, opor-te, recusar decisões automatizadas e retirar consentimento. Resposta nossa em 1 mês. Sempre gratuito.
            </LegalSectionSummary>

            <LegalVisualBlock eyebrow="RGPD · Arts. 15.º a 22.º" title="Os teus oito direitos">
                <LegalRightsGrid items={[
                    { title: "Acesso",                 desc: "Confirmação e cópia dos dados pessoais que tratamos sobre ti.",         ref: "Art. 15.º RGPD",  icon: Download },
                    { title: "Retificação",            desc: "Correção de dados inexatos ou complemento de dados incompletos.",        ref: "Art. 16.º RGPD",  icon: Edit3 },
                    { title: "Apagamento",             desc: "Eliminação nos casos previstos no artigo 17.º.",                          ref: "Art. 17.º RGPD",  icon: Trash2 },
                    { title: "Limitação",              desc: "Suspensão do tratamento enquanto uma questão de exatidão ou licitude é resolvida.", ref: "Art. 18.º RGPD", icon: Ban },
                    { title: "Portabilidade",          desc: "Receber, em formato estruturado e legível por máquina, os dados que nos forneceste.", ref: "Art. 20.º RGPD", icon: ArrowRight },
                    { title: "Oposição",               desc: "Opor-te ao tratamento baseado em interesse legítimo (incluindo marketing).", ref: "Art. 21.º RGPD", icon: EyeOff },
                    { title: "Decisões automatizadas", desc: "Não ser sujeito a decisão exclusivamente automatizada com efeitos jurídicos.", ref: "Art. 22.º RGPD", icon: Gavel },
                    { title: "Retirar consentimento",  desc: "A qualquer momento, sem afetar a licitude do tratamento anterior.",       ref: "Art. 7.º RGPD",   icon: Key },
                ]} />
            </LegalVisualBlock>

            <p>
                Para exercer estes direitos: <a href="mailto:privacidade@lusorae.pt">privacidade@lusorae.pt</a>.
                Respondemos no prazo máximo de <strong>um mês</strong>, prorrogável por mais dois meses em casos
                excecionalmente complexos, com comunicação ao titular nesse sentido (artigo 12.º, n.º 3, do RGPD).
                Se o pedido for manifestamente infundado ou excessivo, podemos cobrar uma taxa razoável ou recusar
                o pedido (artigo 12.º, n.º 5).
            </p>

            <h2>Direito a reclamar à autoridade de controlo</h2>
            <p>
                Sem prejuízo de qualquer outra via de recurso administrativa ou judicial, podes apresentar reclamação
                à autoridade de controlo competente: <strong>Comissão Nacional de Proteção de Dados (CNPD)</strong>,
                Av. D. Carlos I, n.º 134, 1.º, 1200-651 Lisboa,{" "}
                <a href="https://www.cnpd.pt" target="_blank" rel="noopener noreferrer">www.cnpd.pt</a>.
            </p>

            <h2>Segurança do tratamento</h2>
            <p>
                Aplicamos medidas técnicas e organizativas adequadas ao risco, em conformidade com o artigo 32.º do
                RGPD. Entre elas:
            </p>
            <ul>
                <li>cifragem em trânsito (TLS) entre o Utilizador e a Plataforma e entre a Plataforma e os subcontratantes;</li>
                <li><em>hashing</em> com sal e função de derivação adequada para palavras-passe;</li>
                <li>cifragem em repouso para dados sensíveis (credenciais, tokens, registos de segurança);</li>
                <li>controlos de acesso por perfil e princípio do menor privilégio;</li>
                <li>registos de auditoria com integridade verificável;</li>
                <li>testes periódicos de segurança, incluindo testes de intrusão externos pelo menos uma vez por ano;</li>
                <li>procedimentos formais de resposta a incidentes, com responsabilidades claras e tempos-alvo definidos.</li>
            </ul>

            <h2>Menores</h2>
            <p>
                O acesso ao Serviço observa os patamares etários definidos nos{" "}
                <a href="/legal/terms">Termos e Condições</a>, articulados com o artigo 8.º do RGPD e o artigo
                16.º da Lei n.º 58/2019, de 8 de agosto:
            </p>
            <ul>
                <li><strong>Menores de 13 anos</strong>, sem permissão para criar conta.</li>
                <li><strong>Entre 13 e 15 anos</strong>, apenas mediante consentimento ou autorização verificável dos representantes legais.</li>
                <li><strong>16 anos ou mais</strong>, utilização autónoma.</li>
            </ul>
            <p>
                Não apresentamos publicidade baseada em <em>profiling</em> a utilizadores reconhecidos ou
                razoavelmente presumidos como menores (artigo 28.º do DSA), não solicitamos categorias especiais
                de dados a menores, e adotamos por defeito as configurações mais protetoras nas contas em que
                exista indício fundado de minoridade. Os representantes legais podem, a todo o tempo, exercer
                em nome do menor os direitos previstos nos artigos 15.º a 22.º do RGPD através de{" "}
                <a href="mailto:privacidade@lusorae.pt">privacidade@lusorae.pt</a>, mediante prova suficiente
                de legitimidade.
            </p>

            <h2>Violações de dados pessoais</h2>
            <p>
                Em caso de violação de dados pessoais que seja suscetível de implicar risco para os direitos e
                liberdades dos titulares, notificamos a CNPD em até <strong>72 horas</strong> após o conhecimento
                (artigo 33.º do RGPD) e, sempre que o risco seja elevado, comunicamos aos titulares afetados em
                tempo útil, com descrição do incidente, das consequências prováveis e das medidas adotadas (artigo
                34.º do RGPD). Mantemos um registo interno de todas as violações ocorridas, independentemente do nível
                de risco.
            </p>

            <h2>Avaliações de impacto sobre a proteção de dados (DPIA)</h2>
            <p>
                Sempre que prevejamos um novo tratamento suscetível de implicar risco elevado para os direitos e
                liberdades das pessoas singulares, designadamente em função da escala, da utilização de novas
                tecnologias, ou do tratamento de categorias especiais, conduzimos uma Avaliação de Impacto
                sobre a Proteção de Dados nos termos do artigo 35.º do RGPD, com envolvimento documentado do DPO.
            </p>

            <h2>Alterações a esta política</h2>
            <p>
                Esta política é revista pelo menos uma vez por ano. Alterações materialmente relevantes são
                comunicadas com pelo menos <strong>15 dias</strong> de antecedência, por aviso na Plataforma e/ou
                por e-mail. A versão em vigor está sempre publicada nesta página; versões anteriores ficam disponíveis
                a pedido em <a href="mailto:legal@lusorae.pt">legal@lusorae.pt</a>.
            </p>
        </LegalShell>
    );
}
