import { Link } from "react-router-dom";
import {
    FileText, ShieldCheck, Cookie, Sparkle, ChevronRight, ExternalLink, Compass,
} from "lucide-react";
import { LegalShell } from "./LegalShell";
import { LegalComplianceBoard, LegalVisualBlock } from "./_visuals";

const CARDS = [
    {
        to: "/legal/vision",
        icon: Compass,
        title: "A nossa visão",
        ref: "Fundação",
        desc: "Os seis compromissos institucionais que dão coerência a todos os outros documentos. Leitura recomendada antes de qualquer outra.",
        meta: "7 secções · ~8 min de leitura",
        emphasis: true,
    },
    {
        to: "/legal/terms",
        icon: FileText,
        title: "Termos e Condições",
        ref: "Contrato",
        desc: "O contrato entre ti e o Lusorae. Regras de utilização, conta, conteúdos, moderação, suspensão, subscrições e foro competente.",
        meta: "21 secções · ~14 min de leitura",
    },
    {
        to: "/legal/privacy",
        icon: ShieldCheck,
        title: "Política de Privacidade",
        ref: "Dados pessoais",
        desc: "Que dados tratamos, com que finalidade e fundamento legal, durante quanto tempo, e quais os teus direitos ao abrigo do RGPD.",
        meta: "17 secções · ~12 min de leitura",
    },
    {
        to: "/legal/cookies",
        icon: Cookie,
        title: "Política de Cookies",
        ref: "Tecnologias",
        desc: "Cookies e tecnologias equivalentes em uso. Categorias, inventário, validade do consentimento e como o gerir.",
        meta: "9 secções · ~5 min de leitura",
    },
    {
        to: "/legal/community",
        icon: Sparkle,
        title: "Diretrizes da Comunidade",
        ref: "Convivência",
        desc: "O que é permitido, o que é proibido, como reportamos, e como decidimos quando há infrações. Em conformidade com o DSA.",
        meta: "11 secções · ~9 min de leitura",
    },
];

export default function LegalIndex() {
    return (
        <LegalShell
            active="index"
            title="Centro Legal"
            subtitle="O Centro Legal reúne todos os documentos que descrevem o que o Lusorae é, como funciona e como respondemos perante a comunidade e perante a lei. Está organizado de forma a poder ser lido por uma pessoa &mdash; e não apenas por advogados."
        >
            <div className="legal-callout">
                <strong>Antes de começares</strong>
                Se só vais ler um documento, lê <a href="/legal/vision">A nossa visão</a>. É a página onde estão
                escritos, por extenso, os <strong>seis compromissos</strong> que dão coerência a todos os outros
                documentos &mdash; os Termos, a Privacidade, os Cookies, as Diretrizes. Todas as decisões difíceis
                que tomamos depois respondem perante esses seis compromissos.
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 not-prose" style={{ marginTop: "1.4rem" }}>
                {CARDS.map(({ to, icon: Icon, title, ref, desc, meta, emphasis }) => (
                    <Link
                        key={to}
                        to={to}
                        className={`group block rounded-2xl p-5 hover:-translate-y-[2px] transition bg-white ${emphasis ? "border-2 border-black/[0.40] hover:border-black/[0.80] sm:col-span-2" : "border border-black/[0.08] hover:border-black/30"}`}
                        data-testid={`legal-card-${to.split("/").pop()}`}
                    >
                        <div className="flex items-start gap-3.5">
                            <div className={`w-10 h-10 rounded-xl grid place-items-center shrink-0 ${emphasis ? "bg-black text-white" : "bg-black/[0.04] text-black"}`}>
                                <Icon size={17} strokeWidth={1.7} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-semibold text-[15px] tracking-tight flex items-center gap-1 text-black">
                                        {title}
                                        <ChevronRight size={14} className="opacity-0 group-hover:opacity-60 -ml-0.5 transition" />
                                    </h3>
                                    <span className="text-[9.5px] uppercase tracking-[0.10em] text-black/40 font-mono px-1.5 py-0.5 rounded-full bg-black/[0.04] ml-auto">
                                        {ref}
                                    </span>
                                </div>
                                <p className="text-[13px] leading-relaxed text-black/65 mb-2">{desc}</p>
                                <p className="text-[10.5px] text-black/35 font-mono uppercase tracking-[0.06em]">{meta}</p>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>

            <h2>Como ler estes documentos</h2>
            <p>
                A maior parte das pessoas não lê documentos legais &mdash; e tem razão para isso. A maior parte deles
                é escrita para se proteger de quem os lê. Tentámos escrever os nossos de outra maneira: assumimos que
                quem está deste lado é uma pessoa adulta, curiosa, e provavelmente irritada com a opacidade habitual
                do sector. Por isso, e na medida em que o rigor jurídico o permite:
            </p>
            <ul>
                <li>Cada documento começa com um <em>callout</em> que resume o seu objeto numa frase honesta.</li>
                <li>As referências legais aparecem ao lado das afirmações que as exigem &mdash; não rebatidas no fim em letra pequena.</li>
                <li>Sempre que o texto contiver um número (prazo, idade, percentagem), esse número é real e operacional &mdash; não é prosa.</li>
                <li>Sempre que uma decisão seja editável pelo utilizador (consentimento, plano, conta), o documento aponta para o sítio onde isso se faz.</li>
            </ul>
            <p>
                Se mesmo assim houver algo que não faça sentido, é porque ainda não fizemos suficientemente bem o
                nosso trabalho. Escreve para <a href="mailto:legal@lusorae.pt">legal@lusorae.pt</a> e tentaremos
                corrigir na próxima revisão.
            </p>

            <h2>Quadro jurídico aplicável</h2>
            <p>
                O Serviço Lusorae é prestado a partir de Portugal e dirigido, em primeiro lugar, a utilizadores em
                Portugal e na União Europeia. Cumprimos, integralmente, o seguinte conjunto de instrumentos jurídicos:
            </p>

            <LegalComplianceBoard items={[
                { name: "RGPD",                  scope: "Tratamento de dados pessoais",                            ref: "Reg. (UE) 2016/679" },
                { name: "DSA",                   scope: "Serviços digitais, moderação e transparência",             ref: "Reg. (UE) 2022/2065" },
                { name: "Lei n.º 58/2019",       scope: "Execução nacional do RGPD em Portugal",                     ref: "DR 145/2019" },
                { name: "Lei n.º 41/2004",       scope: "Privacidade nas comunicações eletrónicas (ePrivacy)",       ref: "Art. 5.º n.º 3" },
                { name: "Lei n.º 27/2021",       scope: "Carta Portuguesa dos Direitos Humanos na Era Digital",      ref: "Algoritmos" },
                { name: "DL n.º 7/2004",         scope: "Comércio eletrónico &mdash; dever de informação",                   ref: "Art. 10.º" },
                { name: "DL n.º 84/2021",        scope: "Conteúdos e serviços digitais (consumidor)",                ref: "Garantias" },
                { name: "DL n.º 24/2014",         scope: "Contratos celebrados à distância (livre resolução)",        ref: "Art. 10.º" },
                { name: "Lei n.º 31/2024",        scope: "Coordenador Nacional dos Serviços Digitais &mdash; ANACOM",           ref: "DSA-PT" },
                { name: "Diretrizes CNPD 2022/1", scope: "Cookies e tecnologias semelhantes",                        ref: "Cookies-PT" },
            ]} />

            <h2>Identificação da entidade responsável</h2>
            <p>
                O Serviço Lusorae é operado por <strong>[Denominação social, e.g. Lusorae, Lda.]</strong>, pessoa
                coletiva de direito português, com sede em <strong>[Morada completa]</strong>,
                NIPC <strong>[NIPC]</strong>, matriculada na Conservatória do Registo Comercial de{" "}
                <strong>[Cidade]</strong> sob o número <strong>[matrícula]</strong>, com o capital social de{" "}
                <strong>[€ XX.XXX]</strong>. Os dados acima cumprem o dever de informação previsto no artigo 10.º do
                Decreto-Lei n.º 7/2004 e nos artigos 11.º e seguintes do DSA.
            </p>

            <h2>Contactos institucionais</h2>
            <p>
                Mantemos endereços de correio distintos para cada matéria, de modo a que as mensagens cheguem,
                desde o primeiro momento, à pessoa certa:
            </p>
            <table>
                <thead><tr><th>Assunto</th><th>Endereço</th></tr></thead>
                <tbody>
                    <tr><td>Assuntos legais e contratuais</td><td><a href="mailto:legal@lusorae.pt">legal@lusorae.pt</a></td></tr>
                    <tr><td>Encarregado de Proteção de Dados (DPO)</td><td><a href="mailto:dpo@lusorae.pt">dpo@lusorae.pt</a></td></tr>
                    <tr><td>Exercício de direitos RGPD</td><td><a href="mailto:privacidade@lusorae.pt">privacidade@lusorae.pt</a></td></tr>
                    <tr><td>Denúncias de conteúdo (DSA art. 16.º)</td><td><a href="mailto:reportar@lusorae.pt">reportar@lusorae.pt</a></td></tr>
                    <tr><td>Recursos a decisões de moderação (DSA art. 20.º)</td><td><a href="mailto:recurso@lusorae.pt">recurso@lusorae.pt</a></td></tr>
                    <tr><td>Incidentes de segurança / abuso</td><td><a href="mailto:abuso@lusorae.pt">abuso@lusorae.pt</a></td></tr>
                    <tr><td>Imprensa, investigação académica, autoridades</td><td><a href="mailto:imprensa@lusorae.pt">imprensa@lusorae.pt</a></td></tr>
                    <tr><td>Apoio ao utilizador</td><td><a href="mailto:apoio@lusorae.pt">apoio@lusorae.pt</a></td></tr>
                </tbody>
            </table>

            <h2>Autoridades de controlo e resolução de litígios</h2>
            <LegalVisualBlock eyebrow="A quem te podes dirigir, em alternativa a nós" title="Entidades independentes com competência sobre a Plataforma" tone="info">
                <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none" }}>
                    <li style={{ padding: "6px 0", fontSize: 13, color: "rgba(0,0,0,0.78)" }}>
                        <strong>CNPD</strong> &mdash; Comissão Nacional de Proteção de Dados (autoridade de controlo RGPD).{" "}
                        <a href="https://www.cnpd.pt" target="_blank" rel="noopener noreferrer">www.cnpd.pt</a>
                    </li>
                    <li style={{ padding: "6px 0", fontSize: 13, color: "rgba(0,0,0,0.78)" }}>
                        <strong>ANACOM</strong> &mdash; Coordenador Nacional dos Serviços Digitais (DSA).{" "}
                        <a href="https://www.anacom.pt" target="_blank" rel="noopener noreferrer">www.anacom.pt</a>
                    </li>
                    <li style={{ padding: "6px 0", fontSize: 13, color: "rgba(0,0,0,0.78)" }}>
                        <strong>DGC</strong> &mdash; Direção-Geral do Consumidor.{" "}
                        <a href="https://www.consumidor.gov.pt" target="_blank" rel="noopener noreferrer">www.consumidor.gov.pt</a>
                    </li>
                    <li style={{ padding: "6px 0", fontSize: 13, color: "rgba(0,0,0,0.78)" }}>
                        <strong>ODR</strong> &mdash; Plataforma Europeia de Resolução de Litígios em Linha.{" "}
                        <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer">ec.europa.eu/consumers/odr</a>{" "}
                        <ExternalLink className="inline" size={11} />
                    </li>
                    <li style={{ padding: "6px 0", fontSize: 13, color: "rgba(0,0,0,0.78)" }}>
                        <strong>Centros de Arbitragem de Consumo</strong> &mdash; lista oficial em{" "}
                        <a href="https://www.consumidor.gov.pt" target="_blank" rel="noopener noreferrer">consumidor.gov.pt</a>
                    </li>
                </ul>
            </LegalVisualBlock>
        </LegalShell>
    );
}
