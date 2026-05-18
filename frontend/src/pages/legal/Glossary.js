import { LegalShell } from "./LegalShell";

export default function Glossary() {
    return (
        <LegalShell
            active="glossary"
            title="Glossário"
            subtitle="Definições rápidas dos termos legais e técnicos usados nos documentos do Lusorae. Quando o tempo aperta, começa por aqui."
            lastUpdated="[data da última versão]"
            eli5="Vocabulário simples para os Termos, a Privacidade, os Cookies e as Diretrizes. Cada termo remete para o documento onde é tratado em detalhe."
        >
            <h2>A — Autoridades e enquadramento</h2>
            <dl>
                <dt>CNPD — Comissão Nacional de Proteção de Dados</dt>
                <dd>
                    Autoridade de controlo em Portugal em matéria de proteção de dados pessoais
                    (artigo 51.º do RGPD; Lei n.º 43/2004).
                </dd>
                <dt>ANACOM</dt>
                <dd>
                    Autoridade Nacional de Comunicações, designada Coordenador dos Serviços Digitais
                    em Portugal pela Lei n.º 31/2024 (DSA).
                </dd>
                <dt>DSA — Regulamento dos Serviços Digitais</dt>
                <dd>
                    Regulamento (UE) 2022/2065. Estabelece obrigações para plataformas em linha em
                    matéria de transparência, moderação, publicidade, recomendação e proteção de
                    menores.
                </dd>
                <dt>RGPD — Regulamento Geral sobre a Proteção de Dados</dt>
                <dd>
                    Regulamento (UE) 2016/679, em vigor desde 25 de maio de 2018. Quadro europeu de
                    proteção de dados pessoais.
                </dd>
                <dt>ODR — Online Dispute Resolution</dt>
                <dd>
                    Plataforma europeia de resolução de litígios em linha entre consumidores e
                    profissionais:{" "}
                    <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer">
                        ec.europa.eu/consumers/odr
                    </a>.
                </dd>
            </dl>

            <h2>B — Papéis no tratamento de dados</h2>
            <dl>
                <dt>Titular dos dados</dt>
                <dd>A pessoa singular a quem os dados pessoais dizem respeito (tu, enquanto utilizador).</dd>
                <dt>Responsável pelo tratamento (<em>controller</em>)</dt>
                <dd>
                    A entidade que determina as finalidades e os meios do tratamento de dados pessoais
                    (artigo 4.º, n.º 7 do RGPD). No Lusorae, é o prestador do Serviço.
                </dd>
                <dt>Subcontratante (<em>processor</em>)</dt>
                <dd>
                    Entidade que trata dados pessoais por conta do responsável (artigo 4.º, n.º 8 do
                    RGPD), e.g. fornecedor de alojamento, anti-spam, e-mail transacional.
                </dd>
                <dt>Encarregado de Proteção de Dados (DPO)</dt>
                <dd>
                    Pessoa designada pelo responsável para acompanhar o cumprimento do RGPD (artigos 37.º
                    a 39.º). Contacto: <a href="mailto:dpo@lusorae.pt">dpo@lusorae.pt</a>.
                </dd>
            </dl>

            <h2>C — Fundamentos de licitude (artigo 6.º RGPD)</h2>
            <dl>
                <dt>Consentimento</dt>
                <dd>
                    Manifestação de vontade livre, específica, informada e inequívoca (artigo 4.º, n.º 11).
                    Pode ser retirado a qualquer momento.
                </dd>
                <dt>Execução de contrato</dt>
                <dd>Tratamento necessário para prestar o Serviço que aceitaste utilizar.</dd>
                <dt>Obrigação legal</dt>
                <dd>Quando a lei impõe ao responsável o tratamento (e.g. faturação, ordens judiciais).</dd>
                <dt>Interesse legítimo</dt>
                <dd>
                    Interesse do responsável (ou de terceiros) que prevalece sobre os direitos do titular,
                    após ponderação. Tipicamente usado para segurança e prevenção de fraude.
                </dd>
            </dl>

            <h2>D — Termos da Plataforma</h2>
            <dl>
                <dt><em>Profiling</em></dt>
                <dd>
                    Tratamento automatizado que avalia aspetos pessoais para prever comportamento,
                    interesses ou preferências (artigo 4.º, n.º 4 do RGPD). Não exibimos publicidade
                    baseada em <em>profiling</em> a menores.
                </dd>
                <dt>Sistema de recomendação</dt>
                <dd>
                    Algoritmo que ordena conteúdos no <em>feed</em>. Os parâmetros principais são
                    descritos nos Termos (artigo 27.º DSA) e podes optar por uma versão não
                    personalizada.
                </dd>
                <dt><em>Doxing</em></dt>
                <dd>
                    Divulgação não autorizada de dados pessoais de terceiros (morada, telefone,
                    local de trabalho). Proibido — ver Diretrizes da Comunidade, secção 1.
                </dd>
                <dt><em>Pile-on</em></dt>
                <dd>
                    Assédio coordenado em grupo contra uma pessoa. Pode levar a remoção, suspensão ou
                    proibição definitiva.
                </dd>
                <dt><em>Statement of Reasons</em></dt>
                <dd>
                    Fundamentação que enviamos quando moderamos um conteúdo ou conta (artigo 17.º DSA),
                    com factos, base legal/contratual e meios de recurso.
                </dd>
                <dt><em>Trusted flagger</em></dt>
                <dd>
                    Sinalizador de confiança certificado pelo Coordenador dos Serviços Digitais
                    (artigo 22.º DSA). As suas notificações têm prioridade.
                </dd>
            </dl>

            <h2>E — Cookies e tecnologias semelhantes</h2>
            <dl>
                <dt>Cookie estritamente necessário</dt>
                <dd>
                    Indispensável ao funcionamento do Serviço (sessão, segurança). Não exige
                    consentimento.
                </dd>
                <dt>Cookie funcional</dt>
                <dd>Memoriza preferências como tema ou último filtro. Exige consentimento.</dd>
                <dt>Cookie analítico</dt>
                <dd>
                    Recolhe estatísticas agregadas. Em regra exige consentimento (Diretrizes CNPD
                    2022/1).
                </dd>
                <dt>Cookie de marketing</dt>
                <dd>Sustenta publicidade comportamental. Exige consentimento expresso.</dd>
                <dt><em>Local storage</em></dt>
                <dd>
                    Armazenamento no navegador equivalente, para efeitos legais, a cookies (artigo 5.º,
                    n.º 3 da Lei n.º 41/2004).
                </dd>
            </dl>

            <h2>F — Direitos do utilizador</h2>
            <dl>
                <dt>Acesso (artigo 15.º RGPD)</dt>
                <dd>Confirmar quais os dados que tratamos sobre ti e obter uma cópia.</dd>
                <dt>Retificação (artigo 16.º)</dt>
                <dd>Corrigir dados inexatos ou incompletos.</dd>
                <dt>Apagamento (artigo 17.º)</dt>
                <dd>&ldquo;Direito a ser esquecido&rdquo;, nos casos previstos na lei.</dd>
                <dt>Limitação (artigo 18.º)</dt>
                <dd>Suspender temporariamente o tratamento.</dd>
                <dt>Portabilidade (artigo 20.º)</dt>
                <dd>Receber, em formato estruturado, os dados que nos forneceste.</dd>
                <dt>Oposição (artigo 21.º)</dt>
                <dd>
                    Opor-te a tratamentos baseados em interesse legítimo, incluindo <em>profiling</em>{" "}
                    para marketing.
                </dd>
                <dt>Reclamação (artigo 77.º)</dt>
                <dd>
                    Apresentar reclamação à <strong>CNPD</strong> ({" "}
                    <a href="https://www.cnpd.pt" target="_blank" rel="noopener noreferrer">www.cnpd.pt</a>{" "}
                    ) ou ao tribunal competente.
                </dd>
            </dl>

            <h2>G — Convenções deste site</h2>
            <dl>
                <dt><code>[ ]</code> (parênteses retos)</dt>
                <dd>
                    Campo a preencher pela entidade responsável antes da publicação definitiva (NIPC,
                    sede, comarca, datas).
                </dd>
                <dt>Versão em vigor</dt>
                <dd>É a publicada nesta página, com a data indicada em &ldquo;Atualizado&rdquo;.</dd>
                <dt>Tradução</dt>
                <dd>
                    Em caso de divergência entre versões traduzidas, prevalece a versão em português
                    europeu.
                </dd>
            </dl>
        </LegalShell>
    );
}
