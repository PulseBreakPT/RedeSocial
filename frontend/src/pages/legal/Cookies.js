import { LegalShell } from "./LegalShell";
import { openCookiePreferences } from "../../components/CookieBanner";
import {
    LegalKPIs, LegalCookieStack, LegalTimeline, LegalVisualBlock, LegalTable,
} from "./_visuals";
import {
    Cookie, ShieldCheck, Settings, BarChart3, Megaphone, Lock,
    Globe, Clock, FileText, Scale, ToggleRight, Key,
} from "lucide-react";

export default function Cookies() {
    return (
        <LegalShell
            active="cookies"
            title="Política de Cookies"
            subtitle="As tecnologias que utilizamos para guardar informação no teu dispositivo, com que finalidade, por quanto tempo, e como podes mudar de ideias a qualquer momento."
            lastUpdated="Junho de 2026"
            eli5="Só te pedimos consentimento para o que não é estritamente necessário. Tudo o resto é primeira-parte, com IP truncado, sem rastreamento publicitário entre sítios. Mudas de ideias com um clique."
        >
            <LegalKPIs items={[
                { value: "4",       label: "categorias",            sub: "Necessários · Funcionais · Analíticos · Marketing", icon: Cookie },
                { value: "6-12 m",  label: "validade do consentimento", sub: "Diretrizes CNPD 2022/1",                       icon: Clock },
                { value: "1-clique",label: "para revogar",           sub: "Centro de Preferências",                            icon: ToggleRight },
                { value: "1ª parte",label: "operação",                sub: "Sem rastreamento publicitário entre sítios",         icon: Lock },
            ]} />

            <div className="legal-callout">
                <strong>O essencial</strong>
                Os únicos cookies que colocamos sem te pedir nada são os estritamente necessários para o Serviço
                funcionar. Tudo o resto &mdash; funcionais, analíticos, eventual marketing &mdash; depende de
                consentimento que tu dás, podes recusar, e podes retirar a qualquer momento, no{" "}
                <button type="button" onClick={openCookiePreferences} className="underline underline-offset-2 hover:text-[color:var(--coral-500)]">
                    Centro de Preferências de Cookies
                </button>.
            </div>

            <h2>O que tratamos como cookie</h2>
            <p>
                Esta política abrange não só <em>cookies</em> em sentido técnico, mas qualquer tecnologia que envolva
                armazenamento ou acesso a informação no dispositivo do Utilizador, conforme o artigo 5.º, n.º 3 da
                Lei n.º 41/2004, de 18 de agosto (na redação dada pela Lei n.º 46/2012). Inclui, designadamente:
                cookies HTTP, <em>local storage</em>, <em>session storage</em>, IndexedDB, <em>service workers</em>,
                pixels, beacons e identificadores técnicos de dispositivo. Doravante referimo-nos a todos como
                &laquo;cookies&raquo;, por simplicidade.
            </p>

            <h2>Princípios que aplicamos</h2>
            <ul>
                <li><strong>Primeira-parte por defeito</strong> &mdash; os nossos cookies são servidos pelos nossos próprios domínios. Não autorizamos cookies de terceiros para fins de rastreamento publicitário entre sítios.</li>
                <li><strong>Finalidade declarada</strong> &mdash; cada cookie está associado a uma e uma só finalidade descrita nesta política.</li>
                <li><strong>Sem dark patterns</strong> &mdash; o botão &laquo;Recusar&raquo; tem o mesmo peso visual que o botão &laquo;Aceitar&raquo;, em coerência com as Diretrizes CNPD 2022/1 e com o primeiro dos nossos <a href="/legal/vision">compromissos</a>.</li>
                <li><strong>Minimização de IP</strong> &mdash; os endereços IP utilizados em sistemas analíticos são truncados antes de qualquer armazenamento.</li>
            </ul>

            <h2>Categorias e finalidades</h2>

            <LegalVisualBlock eyebrow="As 4 categorias" title="O que cada categoria faz — e qual exige o teu consentimento">
                <LegalCookieStack items={[
                    {
                        title: "Estritamente necessários",
                        required: true,
                        icon: Lock,
                        desc: "Indispensáveis ao funcionamento do Serviço — autenticação, sessão, proteção anti-CSRF, balanceamento de carga, idioma e preferências essenciais. Não exigem consentimento (art. 5.º, n.º 3, segunda parte, da Lei n.º 41/2004).",
                        examples: "vm_session, vm_csrf, vm_consent, vm_locale",
                    },
                    {
                        title: "Funcionais",
                        required: false,
                        icon: Settings,
                        desc: "Memorizam escolhas que o Utilizador faz para personalizar a experiência — tema, layout, último filtro utilizado. Exigem consentimento.",
                        examples: "vm_theme, vm_layout, vm_lastfilter",
                    },
                    {
                        title: "Analíticos",
                        required: false,
                        icon: BarChart3,
                        desc: "Recolhem informação agregada sobre como o Serviço é utilizado, em primeira-parte e com IP truncado, para identificar falhas e oportunidades de melhoria. Exigem consentimento.",
                        examples: "vm_analytics (IP truncado, dados pseudonimizados)",
                    },
                    {
                        title: "Marketing e publicidade",
                        required: false,
                        icon: Megaphone,
                        desc: "Apresentar conteúdo publicitário relevante. Exigem consentimento e nunca são exibidos a menores (art. 28.º DSA). Em coerência com o quinto dos nossos compromissos, atualmente não utilizamos cookies desta categoria.",
                        examples: "Categoria atualmente vazia.",
                    },
                ]} />
            </LegalVisualBlock>

            <h2>Inventário de cookies em uso</h2>
            <p>
                A lista que se segue é atualizada com regularidade. A versão técnica mais detalhada,
                gerada automaticamente, está disponível no Centro de Preferências.
            </p>
            <LegalTable
                headers={["Nome", "Categoria", "Finalidade", "Duração"]}
                rows={[
                    [<code key="n">vm_session</code>, "Necessário", "Sessão autenticada do Utilizador.", "Sessão"],
                    [<code key="n">vm_csrf</code>, "Necessário", "Proteção contra ataques CSRF.", "Sessão"],
                    [<code key="n">vm_consent</code>, "Necessário", "Memorizar as escolhas de consentimento e o respetivo timestamp.", "12 meses"],
                    [<code key="n">vm_locale</code>, "Necessário", "Idioma de interface.", "12 meses"],
                    [<code key="n">vm_theme</code>, "Funcional", "Preferência de tema (claro/escuro) e densidade.", "12 meses"],
                    [<code key="n">vm_layout</code>, "Funcional", "Preferências de layout do feed e da timeline.", "12 meses"],
                    [<code key="n">vm_analytics</code>, "Analítico", "Métricas agregadas em primeira-parte, com IP truncado.", "13 meses"],
                ]}
            />

            <LegalVisualBlock eyebrow="Duração no teu dispositivo" title="Quando cada cookie expira">
                <LegalTimeline items={[
                    { when: "SESSÃO",   what: "vm_session, vm_csrf",     note: "Eliminados ao fechares o browser ou ao terminar sessão.", tone: "short" },
                    { when: "12 MESES", what: "vm_locale, vm_theme, vm_layout, vm_consent", note: "Preferências funcionais e registo de consentimento.", tone: "medium" },
                    { when: "13 MESES", what: "vm_analytics",             note: "Só com o teu consentimento. Dados pseudonimizados.",         tone: "long" },
                ]}
                caption="Findo o prazo, o cookie expira automaticamente. Podes apagá-los antes em qualquer altura." />
            </LegalVisualBlock>

            <h2>Tecnologias equivalentes</h2>
            <p>
                Para além dos cookies HTTP, utilizamos &mdash; estritamente para finalidades funcionais &mdash;{" "}
                <em>local storage</em> (preservar rascunhos de publicações não submetidas, preferências de visualização
                pesadas) e <em>service workers</em> (capacidade limitada de funcionamento offline e otimização de
                carregamento). Estes mecanismos são exclusivamente locais ao dispositivo e não transmitem dados
                pessoais para os nossos servidores. Pixels e <em>beacons</em> de terceiros não são utilizados nesta
                versão do Serviço.
            </p>

            <h2>Consentimento e revogação</h2>
            <p>
                O consentimento é prestado de forma livre, específica, informada e inequívoca, por categoria, através
                de ação positiva. É registado com identificador anónimo e <em>timestamp</em>, podendo ser revogado
                com a mesma facilidade com que foi prestado, sem qualquer fricção, no{" "}
                <button type="button" onClick={openCookiePreferences} className="underline underline-offset-2 hover:text-[color:var(--coral-500)]">
                    Centro de Preferências
                </button>.
            </p>
            <p>
                A recusa de consentimento, parcial ou total, não impede o acesso ao Serviço. Pode, contudo, limitar
                algumas funcionalidades de conveniência (e.g. memória de tema) e algumas métricas internas com que
                medimos a qualidade do produto. Nunca usamos a recusa como pretexto para degradar a experiência geral.
            </p>

            <h2>Validade do consentimento</h2>
            <p>
                Em coerência com as Diretrizes CNPD 2022/1, o consentimento expira por decurso do tempo entre{" "}
                <strong>6 e 12 meses</strong>, sendo solicitado novamente nessa altura. O consentimento será ainda
                pedido de novo quando ocorram alterações materiais nas categorias ou nas finalidades, ou quando se
                introduzam novos cookies sujeitos a consentimento.
            </p>

            <h2>Definições do browser</h2>
            <p>
                Adicionalmente ao Centro de Preferências, podes configurar o teu navegador para bloquear ou eliminar
                cookies. As principais opções estão documentadas pelos respetivos fabricantes (Firefox, Chrome,
                Safari, Edge). A inibição de cookies estritamente necessários pode impedir o funcionamento de partes
                do Serviço &mdash; em particular, a autenticação.
            </p>

            <h2>Atualizações</h2>
            <p>
                Esta política é revista, no mínimo, uma vez por ano, e sempre que mudem as tecnologias em uso ou
                surjam novas exigências regulatórias. Alterações materiais são comunicadas com 15 dias de
                antecedência.
            </p>

            <h2>Contacto</h2>
            <p>
                Questões relacionadas com cookies, mecanismos de consentimento ou exercício dos teus direitos
                podem ser enviadas para <a href="mailto:dpo@lusorae.pt">dpo@lusorae.pt</a> (Encarregado de Proteção
                de Dados) ou para <a href="mailto:privacidade@lusorae.pt">privacidade@lusorae.pt</a> (gestão
                operacional de pedidos RGPD).
            </p>
        </LegalShell>
    );
}
