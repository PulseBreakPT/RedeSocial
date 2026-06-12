import { LegalShell } from "./LegalShell";
import {
    LegalKPIs, LegalTable, LegalVisualBlock, LegalSectionSummary,
} from "./_visuals";
import {
    Clock, FileCheck, Download, BookOpen, ArrowRight,
} from "lucide-react";

// =============================================================================
// Histórico de versões — Centro Legal
// Edição inaugural: v1.0.0 corresponde ao primeiro publicar definitivo
// do Centro Legal após auditoria jurídica completa (P0+P1+P2).
// =============================================================================

const DOCUMENTS = [
    { slug: "vision",     name: "A nossa visão",            version: "v1.0.0", published: "Junho de 2026", link: "/legal/vision" },
    { slug: "manifesto",  name: "Manifesto",                 version: "v1.0.0", published: "Junho de 2026", link: "/manifesto" },
    { slug: "terms",      name: "Termos e Condições",        version: "v1.0.0", published: "Junho de 2026", link: "/legal/terms" },
    { slug: "privacy",    name: "Política de Privacidade",   version: "v1.0.0", published: "Junho de 2026", link: "/legal/privacy" },
    { slug: "cookies",    name: "Política de Cookies",       version: "v1.0.0", published: "Junho de 2026", link: "/legal/cookies" },
    { slug: "community",  name: "Diretrizes da Comunidade",  version: "v1.0.0", published: "Junho de 2026", link: "/legal/community" },
    { slug: "copyright",  name: "Direitos de Autor",         version: "v1.0.0", published: "Junho de 2026", link: "/legal/copyright" },
    { slug: "menores",    name: "Para Pais e Menores",       version: "v1.0.0", published: "Junho de 2026", link: "/legal/menores" },
    { slug: "dsa",        name: "Transparência DSA",         version: "v1.0.0", published: "Junho de 2026", link: "/legal/dsa-transparency" },
    { slug: "governance", name: "Governança e Conselho",     version: "v1.0.0", published: "Junho de 2026", link: "/legal/governance" },
    { slug: "seguranca",  name: "Segurança e Investigadores", version: "v1.0.0", published: "Junho de 2026", link: "/legal/seguranca-investigadores" },
];

export default function Historico() {
    return (
        <LegalShell
            active="historico"
            title="Histórico de Versões"
            subtitle="O registo cronológico de todas as alterações aos documentos do Centro Legal. Cumpre a promessa do Manifesto: nenhuma versão anterior desaparece sem rasto."
            lastUpdated="Junho de 2026"
            eli5="Cada documento legal tem uma versão. Quando muda, a versão anterior fica aqui, com a data, o motivo e o que mudou. Podes pedir o ficheiro completo de qualquer versão antiga, em qualquer altura."
        >
            <LegalKPIs items={[
                { value: "v1.0.0",  label: "edição inaugural",       sub: "Centro Legal completo",     icon: BookOpen },
                { value: "Semver",  label: "esquema de versões",     sub: "MAJOR.MINOR.PATCH",         icon: FileCheck },
                { value: "15 dias", label: "aviso prévio",            sub: "Alterações materiais",      icon: Clock },
                { value: "Sempre",  label: "versões anteriores arquivadas", sub: "Acessíveis a pedido",   icon: Download },
            ]} />

            <div className="legal-callout">
                <strong>Em duas linhas</strong>
                O Lusorae compromete-se a manter aberto, e auditável, o histórico de todas as versões dos documentos
                do Centro Legal. Para pedir o texto completo de uma versão anterior, escreve para{" "}
                <a href="mailto:legal@lusorae.pt">legal@lusorae.pt</a> com a referência da versão pretendida.
            </div>

            <h2>Como ler este histórico</h2>
            <p>
                Cada documento legal tem o seu próprio fio cronológico. Cada entrada do fio é uma{" "}
                <strong>versão</strong>, identificada por número semântico (MAJOR.MINOR.PATCH), data de publicação,
                motivo da alteração e diferenças face à versão anterior.
            </p>

            <h2>Esquema de versionamento</h2>
            <LegalSectionSummary>
                MAJOR para alterações que afetam direitos. MINOR para clarificações materiais. PATCH para correções editoriais.
            </LegalSectionSummary>
            <p>
                Aplicamos versionamento semântico (<em>semver</em>), com a seguinte tradução jurídica:
            </p>
            <ul>
                <li>
                    <strong>MAJOR (v2.0.0, v3.0.0, ...)</strong>, alterações que <strong>afetam materialmente</strong>{" "}
                    direitos ou deveres dos utilizadores: novas finalidades de tratamento, novos prazos contratuais,
                    novas categorias de cookies, alteração de foro, alteração da escala de medidas de moderação,
                    ou mudança de categoria DSA. Comunicadas com pelo menos 15 dias de antecedência por aviso na
                    Plataforma e/ou por e-mail.
                </li>
                <li>
                    <strong>MINOR (v1.1.0, v1.2.0, ...)</strong>, clarificações materiais sem alteração substancial
                    de direitos: novos contactos, novos canais, novos exemplos, expansão de procedimentos
                    existentes. Comunicadas na Plataforma na data da publicação.
                </li>
                <li>
                    <strong>PATCH (v1.0.1, v1.0.2, ...)</strong>, correções editoriais (gralhas, links, formatação,
                    referências legais com data incorreta), sem qualquer alteração de substância. Registadas neste
                    histórico, sem comunicação destacada.
                </li>
            </ul>

            <h2>Estado atual dos documentos</h2>
            <LegalTable
                headers={["Documento", "Versão atual", "Última publicação", "Versão"]}
                rows={DOCUMENTS.map(d => [
                    <a key={d.slug} href={d.link}>{d.name}</a>,
                    d.version,
                    d.published,
                    <code key={`v-${d.slug}`}>{d.version}</code>,
                ])}
                caption="A edição inaugural v1.0.0 corresponde à publicação definitiva do Centro Legal após auditoria jurídica completa (Junho de 2026)." />

            <h2>Política de retenção e acesso</h2>
            <p>
                Versões anteriores são <strong>conservadas indefinidamente</strong> em arquivo institucional,
                independentemente da sua substituição. Cada versão arquivada inclui:
            </p>
            <ul>
                <li>O texto integral, em PT-PT, na forma publicada à data;</li>
                <li>O número de versão, a data de publicação e a data de cessação de vigência;</li>
                <li>O motivo da alteração (resumo executivo de 1 parágrafo);</li>
                <li>O diferencial face à versão anterior (<em>diff</em> textual e estrutural);</li>
                <li>A pessoa ou equipa responsável pela edição.</li>
            </ul>
            <p>
                O texto integral de qualquer versão arquivada é disponibilizado a pedido, sem custos, no prazo
                máximo de 5 dias úteis, em formato legível por humanos (PDF/HTML) e por máquinas (Markdown/JSON
                estruturado quando aplicável). Pedidos para{" "}
                <a href="mailto:legal@lusorae.pt">legal@lusorae.pt</a>, com indicação da referência da versão.
            </p>

            <h2>Diferenças face à versão anterior</h2>
            <LegalVisualBlock eyebrow="Como mostramos as alterações" title="Formato dos diferenciais publicados">
                <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none" }}>
                    <li style={{ padding: "10px 0 10px 16px", borderLeft: "2px solid rgba(10,10,10,0.10)", marginBottom: 10 }}>
                        <strong>Sumário executivo</strong>, em até 3 parágrafos: o que mudou, porquê e o que isto significa para o utilizador.
                    </li>
                    <li style={{ padding: "10px 0 10px 16px", borderLeft: "2px solid rgba(10,10,10,0.10)", marginBottom: 10 }}>
                        <strong>Tabela de alterações por secção</strong>, indicando, para cada secção H2 alterada, se foi: <em>adicionada</em>, <em>removida</em>, <em>reescrita</em>, ou <em>clarificada</em>.
                    </li>
                    <li style={{ padding: "10px 0 10px 16px", borderLeft: "2px solid rgba(10,10,10,0.10)" }}>
                        <strong>Diff textual</strong>, na linha do <em>git diff</em>, com texto removido marcado e texto adicionado destacado.
                    </li>
                </ul>
            </LegalVisualBlock>

            <h2>Quando os documentos podem mudar</h2>
            <p>
                Os documentos podem ser revistos por iniciativa do prestador, em particular nas seguintes
                circunstâncias:
            </p>
            <ul>
                <li>Alterações na legislação aplicável (UE ou nacional) que exijam adaptação imediata;</li>
                <li>Decisões vinculativas da CNPD, da ANACOM ou da Comissão Europeia que afetem a operação;</li>
                <li>Auditoria interna anual, que pode propor clarificações materiais;</li>
                <li>Recomendações do Conselho de Integridade (ver <a href="/legal/governance">/legal/governance</a>);</li>
                <li>Crescimento da Plataforma que exija nova categoria DSA (e.g. passagem a VLOP);</li>
                <li>Constituição definitiva da sociedade gestora, com inclusão da identificação societária completa.</li>
            </ul>

            <h2>Direito a tomar conhecimento e a opor-se</h2>
            <p>
                Quando uma alteração seja materialmente relevante (MAJOR), o utilizador é informado por aviso na
                Plataforma e por e-mail, com 15 dias de antecedência. Durante esse prazo, pode opor-se através de:
            </p>
            <ol>
                <li>Encerramento da conta, sem qualquer penalização, com aplicação integral dos direitos de portabilidade e eliminação previstos no RGPD;</li>
                <li>Reclamação dirigida ao endereço dedicado (<a href="mailto:legal@lusorae.pt">legal@lusorae.pt</a>), à qual será dada resposta motivada antes da entrada em vigor.</li>
            </ol>

            <h2>Contactos</h2>
            <p>
                Pedidos de acesso a versões anteriores ou questões sobre o esquema de versionamento:{" "}
                <a href="mailto:legal@lusorae.pt">legal@lusorae.pt</a>. Para imprensa e investigação:{" "}
                <a href="mailto:imprensa@lusorae.pt">imprensa@lusorae.pt</a>.
                <ArrowRight size={1} style={{ display: "none" }} aria-hidden />
            </p>
        </LegalShell>
    );
}
