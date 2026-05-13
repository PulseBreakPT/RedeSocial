import { LegalShell } from "./LegalShell";

export default function Privacy() {
    return (
        <LegalShell
            active="privacy"
            title="Política de Privacidade"
            subtitle="Como tratamos os teus dados pessoais, com que finalidade, durante quanto tempo e quais os teus direitos."
            lastUpdated="[data da última versão]"
        >
            <div className="legal-callout">
                <strong>Base legal</strong>
                Esta Política dá cumprimento ao Regulamento (UE) 2016/679 (Regulamento Geral sobre a Proteção
                de Dados — &ldquo;RGPD&rdquo;), à Lei n.º 58/2019, de 8 de agosto, à Lei n.º 41/2004, de 18 de
                agosto (privacidade nas comunicações eletrónicas), e à Lei n.º 27/2021, de 17 de maio (Carta
                Portuguesa dos Direitos Humanos na Era Digital).
            </div>

            <h2>1. Responsável pelo tratamento</h2>
            <p>
                <strong>[Denominação social, e.g. Vermillion, Lda.]</strong>, NIPC <strong>[NIPC]</strong>,
                com sede em <strong>[Morada]</strong>, é o responsável pelo tratamento (<em>controller</em>)
                dos dados pessoais tratados no âmbito do Serviço.
            </p>

            <h2>2. Encarregado de Proteção de Dados (DPO)</h2>
            <p>
                Foi designado um Encarregado de Proteção de Dados, nos termos dos artigos 37.º a 39.º do RGPD,
                contactável em: <a href="mailto:dpo@vermillion.pt">dpo@vermillion.pt</a>, ou por correio postal
                para a sede social ao cuidado do &ldquo;DPO&rdquo;.
            </p>

            <h2>3. Categorias de dados pessoais tratados</h2>
            <table>
                <thead>
                    <tr><th>Categoria</th><th>Exemplos</th></tr>
                </thead>
                <tbody>
                    <tr><td>Identificação e conta</td><td>Nome de utilizador, e-mail, palavra-passe (cifrada), foto de perfil, biografia.</td></tr>
                    <tr><td>Conteúdo gerado</td><td>Publicações, comentários, mensagens diretas, gostos, repostos, listas, marcadores, comunidades, eventos.</td></tr>
                    <tr><td>Dados técnicos</td><td>Endereço IP, tipo e versão de browser, sistema operativo, identificadores de dispositivo, logs de acesso.</td></tr>
                    <tr><td>Dados de utilização</td><td>Páginas visitadas, interações, tempo de sessão, preferências de algoritmo.</td></tr>
                    <tr><td>Localização aproximada</td><td>Derivada do endereço IP (ao nível de cidade/região). Sem geolocalização precisa por defeito.</td></tr>
                    <tr><td>Dados de comunicação</td><td>Mensagens trocadas com o apoio ao utilizador, denúncias, recursos.</td></tr>
                    <tr><td>Cookies e tecnologias semelhantes</td><td>Ver <a href="/legal/cookies">Política de Cookies</a>.</td></tr>
                </tbody>
            </table>
            <p>
                Não recolhemos intencionalmente categorias especiais de dados (artigo 9.º do RGPD), como dados
                de saúde, religião ou orientação sexual. Se o Utilizador optar por publicá-los, fá-lo por iniciativa
                própria e torna o conteúdo manifestamente público (artigo 9.º, n.º 2, alínea e) do RGPD).
            </p>

            <h2>4. Finalidades e fundamentos legais</h2>
            <table>
                <thead>
                    <tr><th>Finalidade</th><th>Fundamento (RGPD)</th></tr>
                </thead>
                <tbody>
                    <tr><td>Prestação do Serviço, criação e manutenção da conta, publicação e exibição de conteúdos.</td><td>Artigo 6.º, n.º 1, alínea b) — execução do contrato.</td></tr>
                    <tr><td>Cumprimento de obrigações legais (incluindo respostas a autoridades, conservação de registos).</td><td>Artigo 6.º, n.º 1, alínea c).</td></tr>
                    <tr><td>Segurança, prevenção de fraude e abuso, integridade da Plataforma.</td><td>Artigo 6.º, n.º 1, alínea f) — interesse legítimo.</td></tr>
                    <tr><td>Comunicações de marketing e <em>newsletters</em>.</td><td>Artigo 6.º, n.º 1, alínea a) — consentimento (revogável a qualquer momento).</td></tr>
                    <tr><td>Estatísticas agregadas e métricas anónimas.</td><td>Artigo 6.º, n.º 1, alínea f) — interesse legítimo.</td></tr>
                    <tr><td>Cookies analíticos e funcionais não estritamente necessários.</td><td>Artigo 5.º, n.º 3 da Lei n.º 41/2004 — consentimento.</td></tr>
                </tbody>
            </table>

            <h2>5. Origem dos dados</h2>
            <p>
                Recolhemos dados (a) fornecidos diretamente pelo Utilizador no registo e durante a utilização;
                (b) gerados automaticamente pela interação com o Serviço; e (c) eventualmente recebidos de
                terceiros que o Utilizador autorize (e.g. <em>login</em> federado, integrações), com o âmbito
                estritamente necessário à finalidade.
            </p>

            <h2>6. Destinatários e subcontratantes</h2>
            <p>
                Os dados podem ser comunicados a:
            </p>
            <ul>
                <li>Subcontratantes (artigo 28.º do RGPD) que prestam serviços de alojamento (cloud), envio de e-mail transacional, deteção de abuso, suporte e analítica. Mantemos uma lista atualizada disponível mediante pedido para <a href="mailto:dpo@vermillion.pt">dpo@vermillion.pt</a>.</li>
                <li>Autoridades judiciais, policiais ou regulatórias, no estrito cumprimento de obrigação legal ou ordem competente.</li>
                <li>Terceiros adquirentes, no caso de reorganização societária, com prévia comunicação aos titulares.</li>
            </ul>
            <p>
                Não vendemos dados pessoais.
            </p>

            <h2>7. Transferências internacionais</h2>
            <p>
                Sempre que ocorram transferências para fora do Espaço Económico Europeu, aplicamos uma das
                garantias previstas nos artigos 44.º a 49.º do RGPD: decisão de adequação, cláusulas contratuais-tipo
                aprovadas pela Comissão Europeia ou regras vinculativas para empresas (BCR). O Utilizador pode
                solicitar cópia das garantias aplicadas.
            </p>

            <h2>8. Prazos de conservação</h2>
            <table>
                <thead><tr><th>Dado</th><th>Período</th></tr></thead>
                <tbody>
                    <tr><td>Dados da conta ativa</td><td>Enquanto a conta estiver ativa.</td></tr>
                    <tr><td>Após pedido de eliminação</td><td>Eliminação em até 30 dias, salvo retenção legal exigida.</td></tr>
                    <tr><td>Logs de segurança</td><td>Até 12 meses, salvo necessidade de prova em incidente.</td></tr>
                    <tr><td>Conservação de tráfego (Lei n.º 32/2008, sempre que aplicável)</td><td>Períodos legais imperativos.</td></tr>
                    <tr><td>Faturas e dados fiscais</td><td>10 anos (artigo 123.º do CIRC e legislação tributária).</td></tr>
                </tbody>
            </table>

            <h2>9. Decisões automatizadas e algoritmos de recomendação</h2>
            <p>
                Utilizamos sistemas algorítmicos para ordenar conteúdo, sugerir contas, eventos e comunidades, e
                detetar abuso. Estes sistemas <strong>não produzem efeitos jurídicos</strong> nem afetam o
                Utilizador de forma significativamente similar, nos termos do artigo 22.º do RGPD. O Utilizador
                pode, nas Definições, optar por feeds não personalizados, conforme o artigo 27.º do DSA.
            </p>
            <p>
                Nos termos do artigo 9.º da Lei n.º 27/2021 (Carta Portuguesa dos Direitos Humanos na Era Digital),
                garantimos transparência sobre os parâmetros essenciais dos algoritmos utilizados.
            </p>

            <h2>10. Os teus direitos</h2>
            <p>Enquanto titular dos dados, dispões dos seguintes direitos (artigos 15.º a 22.º do RGPD):</p>
            <ul>
                <li><strong>Acesso</strong> — obter confirmação e cópia dos dados que tratamos sobre ti.</li>
                <li><strong>Retificação</strong> — corrigir dados inexatos ou incompletos.</li>
                <li><strong>Apagamento</strong> (&ldquo;direito a ser esquecido&rdquo;) — solicitar a eliminação, nos casos previstos.</li>
                <li><strong>Limitação</strong> do tratamento.</li>
                <li><strong>Portabilidade</strong> — receber em formato estruturado e de uso corrente os dados que nos forneceste.</li>
                <li><strong>Oposição</strong> — opor-te a tratamentos baseados em interesse legítimo, incluindo <em>profiling</em> para marketing.</li>
                <li><strong>Não sujeição a decisões exclusivamente automatizadas</strong> que produzam efeitos jurídicos.</li>
                <li><strong>Retirar o consentimento</strong> a qualquer momento, sem prejuízo da licitude do tratamento anterior.</li>
            </ul>
            <p>
                Para exercer os teus direitos, contacta <a href="mailto:dpo@vermillion.pt">dpo@vermillion.pt</a>.
                Respondemos no prazo de um mês, prorrogável por dois meses em casos complexos (artigo 12.º, n.º 3 do RGPD).
            </p>

            <h2>11. Direito a reclamar</h2>
            <p>
                Tens direito a apresentar reclamação à autoridade de controlo competente:{" "}
                <strong>Comissão Nacional de Proteção de Dados (CNPD)</strong>,{" "}
                <a href="https://www.cnpd.pt" target="_blank" rel="noopener noreferrer">www.cnpd.pt</a>,
                Av. D. Carlos I, n.º 134, 1.º, 1200-651 Lisboa.
            </p>

            <h2>12. Segurança</h2>
            <p>
                Aplicamos medidas técnicas e organizativas adequadas (artigo 32.º do RGPD), incluindo cifragem em
                trânsito (TLS), cifragem em repouso para credenciais (<em>hashing</em> com sal),
                controlos de acesso, registos de auditoria, e procedimentos de resposta a incidentes. Em caso de
                violação suscetível de implicar risco elevado para os titulares, notificamos a CNPD em até 72
                horas e os titulares afetados sem demora (artigos 33.º e 34.º do RGPD).
            </p>

            <h2>13. Menores</h2>
            <p>
                Para tratamento baseado em consentimento, a idade mínima é 13 anos (artigo 16.º da Lei n.º 58/2019).
                Para utilização autónoma do Serviço exigimos 16 anos. Não exibimos publicidade com base em
                <em>profiling</em> a utilizadores reconhecidos ou presumidos como menores (artigo 28.º do DSA).
            </p>

            <h2>14. Alterações</h2>
            <p>
                Esta Política pode ser atualizada. Alterações relevantes serão comunicadas com a devida
                antecedência, sendo a versão em vigor sempre publicada nesta página.
            </p>
        </LegalShell>
    );
}
