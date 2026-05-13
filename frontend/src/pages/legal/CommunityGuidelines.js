import { LegalShell } from "./LegalShell";

export default function CommunityGuidelines() {
    return (
        <LegalShell
            active="community"
            title="Diretrizes da Comunidade"
            subtitle="O que é permitido, o que é proibido, e o que esperamos uns dos outros para que o Vermillion continue a ser um sítio decente para conversar em português."
            lastUpdated="[data da última versão]"
        >
            <div className="legal-callout">
                <strong>Princípio orientador</strong>
                A liberdade de expressão é protegida pelo artigo 37.º da Constituição da República Portuguesa e
                pelo artigo 11.º da Carta dos Direitos Fundamentais da União Europeia. Não é, no entanto, um direito
                absoluto: cessa quando colide com a dignidade da pessoa humana, com a integridade de terceiros ou
                com a lei. Estas Diretrizes existem para tornar esse equilíbrio claro e previsível.
            </div>

            <h2>1. O que é manifestamente proibido (e ilegal)</h2>
            <p>
                Os conteúdos que constituem ilícito criminal são removidos com prioridade e, quando aplicável,
                comunicados às autoridades competentes:
            </p>
            <ul>
                <li>Material de abuso sexual infantil (artigos 176.º e 176.º-A do Código Penal).</li>
                <li>Discriminação e discurso de ódio com base em raça, etnia, nacionalidade, religião, sexo, orientação sexual ou identidade de género (artigo 240.º do Código Penal).</li>
                <li>Apologia, incitamento ou promoção do terrorismo (Lei n.º 52/2003).</li>
                <li>Ameaças, perseguição (<em>stalking</em> — artigo 154.º-A) e violência contra pessoas.</li>
                <li>Divulgação não consentida de imagens íntimas (<em>image-based sexual abuse</em>, artigo 192.º-A).</li>
                <li>Difamação e injúria (artigos 180.º e 181.º), com particular cuidado quanto a figuras privadas.</li>
                <li>Fraude, burla informática e usurpação de identidade.</li>
                <li>Violação de direitos de autor e direitos conexos (Código do Direito de Autor e dos Direitos Conexos).</li>
            </ul>

            <h2>2. O que pode ser removido ou despromovido</h2>
            <ul>
                <li>Spam, comportamento coordenado inautêntico e manipulação algorítmica.</li>
                <li>Conteúdo sexual explícito não etiquetado (poderá ser permitido em contas adultas adequadamente sinalizadas, quando e se vier a existir essa funcionalidade).</li>
                <li>Desinformação manifestamente lesiva, sobretudo em matérias de saúde pública ou processos eleitorais.</li>
                <li>Provocação dirigida a uma pessoa em particular (assédio em grupo, <em>pile-on</em>).</li>
                <li>Divulgação de dados pessoais de terceiros sem fundamento legal (<em>doxing</em>).</li>
                <li>Conteúdo gerado por IA apresentado como real sem identificação clara.</li>
            </ul>

            <h2>3. Como reportar</h2>
            <p>
                Cada publicação, comentário, mensagem e perfil tem uma opção <em>Reportar</em>. As denúncias são
                tratadas em prazo razoável; em casos urgentes (segurança física, exploração de menores)
                priorizamos a triagem imediata. Em conformidade com o artigo 16.º do DSA, qualquer pessoa pode
                notificar conteúdo potencialmente ilegal mesmo sem ter conta.
            </p>
            <p>
                Endereço dedicado: <a href="mailto:reportar@vermillion.pt">reportar@vermillion.pt</a>.
            </p>

            <h2>4. <em>Trusted flaggers</em></h2>
            <p>
                Reconhecemos o estatuto de &ldquo;sinalizadores de confiança&rdquo; certificados pelo Coordenador
                dos Serviços Digitais (ANACOM), nos termos do artigo 22.º do DSA, cujas notificações são tratadas
                com prioridade.
            </p>

            <h2>5. Medidas e proporcionalidade</h2>
            <p>
                As medidas adotadas são proporcionais à gravidade e à reincidência. Por ordem crescente:
                aviso, rotulagem, redução de alcance, remoção do conteúdo, suspensão temporária e suspensão
                permanente. Toda a decisão é comunicada com fundamentação ao Utilizador (artigo 17.º do DSA) e
                pode ser contestada (artigos 20.º e 21.º do DSA).
            </p>

            <h2>6. Recurso e revisão</h2>
            <p>
                A decisão de moderação pode ser objeto de:
            </p>
            <ol>
                <li>Reclamação interna gratuita, durante pelo menos 6 meses após a comunicação (artigo 20.º DSA);</li>
                <li>Resolução extrajudicial junto de órgão certificado (artigo 21.º DSA);</li>
                <li>Acesso aos tribunais comuns nos termos gerais.</li>
            </ol>

            <h2>7. Transparência</h2>
            <p>
                Publicaremos relatórios periódicos com o número de notificações recebidas, ações realizadas,
                tempos médios de resposta, decisões revertidas e medidas automatizadas, em cumprimento dos
                artigos 15.º, 24.º e 42.º do DSA.
            </p>

            <h2>8. Pedido em síntese</h2>
            <blockquote>
                Trata cada pessoa como tratarias um vizinho que ainda não conheces bem: com curiosidade, paciência
                e firmeza quando necessário. Discorda dos argumentos, não das pessoas. Cita as fontes. Avisa
                quando partilhares opinião e quando partilhares facto. E, sempre que possível, escreve melhor —
                a internet em português agradece.
            </blockquote>
        </LegalShell>
    );
}
