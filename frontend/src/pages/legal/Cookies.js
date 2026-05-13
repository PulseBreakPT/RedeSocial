import { LegalShell } from "./LegalShell";
import { openCookiePreferences } from "../../components/CookieBanner";

export default function Cookies() {
    return (
        <LegalShell
            active="cookies"
            title="Política de Cookies"
            subtitle="Que cookies e tecnologias semelhantes utilizamos, com que finalidade, qual a base legal e como podes gerir o teu consentimento."
            lastUpdated="[data da última versão]"
        >
            <div className="legal-callout">
                <strong>Base legal</strong>
                Artigo 5.º, n.º 3 da Lei n.º 41/2004, de 18 de agosto (na redação dada pela Lei n.º 46/2012), que
                transpõe a Diretiva 2002/58/CE (&ldquo;<em>ePrivacy</em>&rdquo;), e Diretrizes 2022/1 da CNPD sobre cookies
                e tecnologias semelhantes. Aplica-se ainda o RGPD sempre que o tratamento envolva dados pessoais.
            </div>

            <p>
                Podes gerir as tuas preferências a qualquer momento através do{" "}
                <button
                    type="button"
                    onClick={openCookiePreferences}
                    className="underline underline-offset-2 hover:text-[color:var(--coral-500)]"
                >
                    Centro de Preferências de Cookies
                </button>.
            </p>

            <h2>1. O que são cookies</h2>
            <p>
                Cookies são pequenos ficheiros de texto colocados pelo navegador no dispositivo do Utilizador,
                que permitem reconhecer o dispositivo entre visitas e armazenar informação. Incluímos também
                tecnologias equivalentes como <em>local storage</em>, <em>session storage</em>,
                <em>fingerprinting</em> técnico e pixels.
            </p>

            <h2>2. Categorias e finalidades</h2>
            <h3>2.1 Cookies estritamente necessários</h3>
            <p>
                Indispensáveis ao funcionamento do Serviço (autenticação, sessão, segurança, balanceamento de
                carga, preferências essenciais como o idioma). Não exigem consentimento, ao abrigo do artigo 5.º,
                n.º 3, segunda parte, da Lei n.º 41/2004.
            </p>
            <h3>2.2 Cookies funcionais</h3>
            <p>
                Permitem memorizar escolhas (tema, layout, último filtro utilizado) para melhorar a experiência.
                Exigem consentimento.
            </p>
            <h3>2.3 Cookies analíticos</h3>
            <p>
                Recolhem informação agregada sobre como o Serviço é utilizado, para fins estatísticos e de
                melhoria. Exigem consentimento, salvo quando estritamente anonimizados e operados em
                primeira-parte com âmbito limitado (Diretrizes CNPD 2022/1).
            </p>
            <h3>2.4 Cookies de marketing e publicidade</h3>
            <p>
                Permitem apresentar conteúdo publicitário relevante. Exigem consentimento e podem envolver
                terceiros (a identificar em &ldquo;Personalizar&rdquo;). Não exibimos publicidade baseada em
                <em>profiling</em> a menores (artigo 28.º do DSA).
            </p>

            <h2>3. Cookies utilizados</h2>
            <p>
                A lista abaixo é indicativa e atualizada com regularidade. A versão técnica completa está
                disponível no Centro de Preferências.
            </p>
            <table>
                <thead>
                    <tr><th>Nome</th><th>Categoria</th><th>Finalidade</th><th>Duração</th></tr>
                </thead>
                <tbody>
                    <tr><td><code>vm_session</code></td><td>Necessário</td><td>Sessão autenticada (JWT/refresh).</td><td>Sessão</td></tr>
                    <tr><td><code>vm_csrf</code></td><td>Necessário</td><td>Proteção contra CSRF.</td><td>Sessão</td></tr>
                    <tr><td><code>vm_consent</code></td><td>Necessário</td><td>Memorizar as escolhas de consentimento.</td><td>12 meses</td></tr>
                    <tr><td><code>vm_theme</code></td><td>Funcional</td><td>Preferência de tema/UI.</td><td>12 meses</td></tr>
                    <tr><td><code>vm_analytics</code></td><td>Analítico</td><td>Métricas agregadas de utilização (primeira-parte, IP truncado).</td><td>13 meses</td></tr>
                </tbody>
            </table>

            <h2>4. Gestão e revogação do consentimento</h2>
            <p>
                Podes aceitar, recusar ou personalizar o uso de cookies não essenciais a qualquer momento no{" "}
                <button
                    type="button"
                    onClick={openCookiePreferences}
                    className="underline underline-offset-2 hover:text-[color:var(--coral-500)]"
                >
                    Centro de Preferências
                </button>. O consentimento é registado com identificador e <em>timestamp</em> e pode ser revogado
                com a mesma facilidade com que foi prestado.
            </p>
            <p>
                Adicionalmente, podes configurar o teu navegador para bloquear ou eliminar cookies. A inibição
                de cookies estritamente necessários pode prejudicar o funcionamento do Serviço.
            </p>

            <h2>5. Validade do consentimento</h2>
            <p>
                Em linha com as Diretrizes CNPD 2022/1, o consentimento expira após 6 a 12 meses, sendo solicitado
                novamente; o utilizador pode também voltar a apresentar a sua escolha sempre que existam
                alterações materiais.
            </p>

            <h2>6. Contacto</h2>
            <p>
                Para questões: <a href="mailto:dpo@vermillion.pt">dpo@vermillion.pt</a>.
            </p>
        </LegalShell>
    );
}
