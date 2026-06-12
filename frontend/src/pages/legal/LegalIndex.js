import { Link } from "react-router-dom";
import {
    FileText, ShieldCheck, Cookie, Users, ChevronRight, Compass, Flame,
    Database, Scale, ShieldAlert, Newspaper, LifeBuoy, Gavel, Flag,
    BookOpen, Heart, BarChart3, Building2, Clock, Search,
} from "lucide-react";
import { LegalShell } from "./LegalShell";
import { LegalComplianceBoard, LegalVisualBlock, LegalContactsList, LegalEntityNotice } from "./_visuals";
import { LEGAL_ENTITY } from "../../theme/legalEntity";
import { PT } from "../../theme/editorial";

const CARDS = [
    {
        to: "/legal/vision",
        icon: Compass,
        title: "A nossa visão",
        ref: "Fundação",
        desc: "Os seis compromissos institucionais que dão coerência a todos os outros documentos. Leitura recomendada antes de qualquer outra.",
        meta: "8 secções · ~6 min de leitura",
        emphasis: true,
        accent: PT.red,
    },
    {
        to: "/manifesto",
        icon: Flame,
        title: "Manifesto",
        ref: "Anti-dark-pattern",
        desc: "As seis promessas públicas contra os padrões obscuros do habitual. Streaks, notificações sintéticas, read receipts forçados, o que recusamos e porquê.",
        meta: "6 promessas · ~4 min de leitura",
        accent: PT.azul,
    },
    {
        to: "/legal/terms",
        icon: FileText,
        title: "Termos e Condições",
        ref: "Contrato",
        desc: "O contrato entre ti e o Lusorae. Regras de utilização, conta, conteúdos, moderação, suspensão, subscrições e foro competente.",
        meta: "22 secções · ~14 min de leitura",
        accent: PT.azul,
    },
    {
        to: "/legal/privacy",
        icon: ShieldCheck,
        title: "Política de Privacidade",
        ref: "Dados pessoais",
        desc: "Que dados tratamos, com que finalidade e fundamento legal, durante quanto tempo, e quais os teus direitos ao abrigo do RGPD.",
        meta: "18 secções · ~10 min de leitura",
        accent: PT.green,
    },
    {
        to: "/legal/cookies",
        icon: Cookie,
        title: "Política de Cookies",
        ref: "Tecnologias",
        desc: "Cookies e tecnologias equivalentes em uso. Categorias, inventário, validade do consentimento e como o gerir.",
        meta: "10 secções · ~4 min de leitura",
        accent: PT.gold,
    },
    {
        to: "/legal/community",
        icon: Users,
        title: "Diretrizes da Comunidade",
        ref: "Convivência",
        desc: "O que é permitido, o que é proibido, como reportamos, e como decidimos quando há infrações. Em conformidade com o DSA.",
        meta: "11 secções · ~5 min de leitura",
        accent: PT.red,
    },
];

const SPECIALIZED = [
    {
        to: "/legal/copyright",
        icon: BookOpen,
        title: "Direitos de Autor e Notificações",
        ref: "Notice & Takedown",
        desc: "Procedimento de notificação, contestação e remoção de Conteúdo. CDADC, DL 47/2023 e DSA arts. 16.º a 23.º.",
        meta: "11 secções · ~6 min",
        accent: PT.azul,
    },
    {
        to: "/legal/menores",
        icon: Heart,
        title: "Para Pais e Menores",
        ref: "Linguagem simples",
        desc: "Em linguagem clara: três idades, o que não fazemos a menores, o que protegemos, como os pais podem agir.",
        meta: "8 secções · ~5 min",
        accent: PT.red,
    },
    {
        to: "/legal/dsa-transparency",
        icon: BarChart3,
        title: "Transparência DSA",
        ref: "Relatório trimestral",
        desc: "Notificações, decisões, recursos e comunicações com autoridades, em cumprimento dos arts. 15.º, 17.º, 20.º e 24.º do DSA.",
        meta: "10 secções · ~6 min",
        accent: PT.green,
    },
    {
        to: "/legal/governance",
        icon: Building2,
        title: "Governança e Conselho de Integridade",
        ref: "Quem decide",
        desc: "Equipa Trust & Safety, DPO independente, Conselho de Integridade com membro externo, candidaturas e atas públicas.",
        meta: "9 secções · ~6 min",
        accent: PT.azul,
    },
    {
        to: "/legal/seguranca-investigadores",
        icon: ShieldAlert,
        title: "Segurança e Investigadores",
        ref: "Responsible Disclosure",
        desc: "Como reportar vulnerabilidades. Compromisso de não retaliação, janela coordenada e Hall of Fame opcional.",
        meta: "11 secções · ~5 min",
        accent: PT.gold,
    },
    {
        to: "/legal/historico",
        icon: Clock,
        title: "Histórico de Versões",
        ref: "Versões anteriores",
        desc: "O registo cronológico de todas as alterações aos documentos. Esquema semver, política de retenção e acesso a versões anteriores.",
        meta: "7 secções · ~4 min",
        accent: PT.ink,
    },
];

const CONTACTS = [
    { subject: "Assuntos legais e contratuais",          email: "legal@lusorae.pt",       icon: Scale,      ref: "Contratos · DSA" },
    { subject: "Encarregado de Proteção de Dados",        email: "dpo@lusorae.pt",         icon: ShieldCheck, ref: "DPO · RGPD" },
    { subject: "Exercício de direitos RGPD",              email: "privacidade@lusorae.pt", icon: Database,    ref: "Arts. 15.º a 22.º RGPD" },
    { subject: "Denúncias de conteúdo",                   email: "reportar@lusorae.pt",    icon: Flag,        ref: "DSA art. 16.º" },
    { subject: "Recursos a decisões de moderação",        email: "recurso@lusorae.pt",     icon: Gavel,       ref: "DSA art. 20.º" },
    { subject: "Incidentes de segurança / abuso",          email: "abuso@lusorae.pt",       icon: ShieldAlert, ref: "Segurança" },
    { subject: "Imprensa, investigação, autoridades",      email: "imprensa@lusorae.pt",    icon: Newspaper,   ref: "DSA art. 40.º" },
    { subject: "Apoio ao utilizador",                      email: "apoio@lusorae.pt",       icon: LifeBuoy,    ref: "Helpdesk" },
];

export default function LegalIndex() {
    return (
        <LegalShell
            active="index"
            title="Centro Legal"
            subtitle="O Centro Legal reúne todos os documentos que descrevem o que o Lusorae é, como funciona e como respondemos perante a comunidade e perante a lei. Está organizado de forma a poder ser lido por uma pessoa, e não apenas por advogados."
        >
            {/* Antes de começares, callout editorial (cinza, sem fundo amarelo) */}
            <div
                className="not-prose px-5 py-4 relative"
                style={{
                    background: "#FAFAFA",
                    color: PT.ink,
                    border: "1px solid rgba(10,10,10,0.08)",
                    borderLeft: `2px solid ${PT.red}`,
                    borderRadius: 16,
                    marginTop: "1.5rem",
                }}
            >
                <strong className="block font-bold uppercase mb-1.5 text-[11px]" style={{ letterSpacing: "0.18em", color: "rgba(10,10,10,0.55)" }}>
                    Antes de começares
                </strong>
                <p className="text-[15px] font-medium leading-relaxed">
                    Se só vais ler um documento, lê{" "}
                    <Link to="/legal/vision" className="font-bold underline underline-offset-4 decoration-[2px]" style={{ color: PT.red, textDecorationColor: "rgba(200,16,46,0.35)" }}>
                        A nossa visão
                    </Link>
                    . É a página onde estão escritos, por extenso, os <strong>seis compromissos</strong> que dão coerência a todos os outros
                    documentos, os Termos, a Privacidade, os Cookies, as Diretrizes. Todas as decisões difíceis
                    que tomamos depois respondem perante esses seis compromissos.
                </p>
            </div>

            {/* CARDS dos documentos, estilo editorial (todos brancos, sem fundo preto) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 not-prose" style={{ marginTop: "1.8rem" }}>
                {CARDS.map(({ to, icon: Icon, title, ref, desc, meta, emphasis, accent }, idx) => (
                    <Link
                        key={to}
                        to={to}
                        data-testid={`legal-card-${to.split("/").pop()}`}
                        className={`group block p-5 hover:-translate-y-[2px] transition relative ${emphasis ? "sm:col-span-2" : ""}`}
                        style={{
                            background: "#ffffff",
                            color: PT.ink,
                            border: "1px solid rgba(10,10,10,0.08)",
                            borderLeft: emphasis ? `3px solid ${accent}` : "1px solid rgba(10,10,10,0.08)",
                            borderRadius: 16,
                            boxShadow: `0 1px 2px rgba(10,10,10,0.04), 0 12px 30px -16px ${accent}55, 0 6px 16px -10px rgba(10,10,10,0.10)`,
                        }}
                    >
                        {/* Número grande tipo revista */}
                        <span
                            className="absolute -top-2.5 -left-2.5 inline-flex items-center justify-center font-bold"
                            style={{
                                width: 36, height: 36,
                                background: "#fff",
                                color: accent,
                                borderRadius: "50%",
                                border: `1px solid ${accent}33`,
                                boxShadow: `0 1px 2px rgba(10,10,10,0.04), 0 8px 18px -10px ${accent}55`,
                                fontSize: 13,
                                lineHeight: 1,
                                fontFamily: "Inter, sans-serif",
                                letterSpacing: "-0.02em",
                            }}
                        >
                            {String(idx + 1).padStart(2, "0")}
                        </span>

                        <div className="flex items-start gap-3.5">
                            <div
                                className="w-11 h-11 grid place-items-center shrink-0"
                                style={{
                                    background: `${accent}1A`,
                                    color: accent === PT.gold ? PT.ink : accent,
                                    borderRadius: 12,
                                }}
                            >
                                <Icon size={19} strokeWidth={2.0} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                    <h3 className="font-bold text-[17px] tracking-tight flex items-center gap-1" style={{ color: PT.ink }}>
                                        {title}
                                        <ChevronRight size={16} strokeWidth={2.2} className="opacity-0 group-hover:opacity-100 -ml-0.5 transition" style={{ color: accent === PT.gold ? PT.ink : accent }} />
                                    </h3>
                                    <span
                                        className="text-[11px] font-bold uppercase ml-auto px-2.5 py-1 shrink-0"
                                        style={{
                                            background: "rgba(10,10,10,0.05)",
                                            color: "rgba(10,10,10,0.55)",
                                            borderRadius: 999,
                                            letterSpacing: "0.14em",
                                        }}
                                    >
                                        {ref}
                                    </span>
                                </div>
                                <p className="text-[14px] leading-relaxed mb-2.5 font-medium" style={{ color: "rgba(10,10,10,0.68)" }}>
                                    {desc}
                                </p>
                                <p className="text-[11px] font-bold uppercase" style={{ letterSpacing: "0.14em", color: "rgba(10,10,10,0.42)" }}>
                                    {meta}
                                </p>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>

            {/* Documentos especializados — DSA, copyright, governança, segurança, menores, histórico */}
            <div className="not-prose" style={{ marginTop: "3rem" }}>
                <div className="flex items-baseline justify-between flex-wrap gap-3 mb-5">
                    <h2 className="font-black tracking-[-0.02em]" style={{ fontSize: "clamp(22px, 2.6vw, 28px)", color: PT.ink, margin: 0 }}>
                        Documentos especializados
                    </h2>
                    <span className="text-[11px] font-bold uppercase" style={{ letterSpacing: "0.18em", color: "rgba(10,10,10,0.45)" }}>
                        Para públicos específicos
                    </span>
                </div>
                <p className="text-[14.5px] font-medium leading-relaxed mb-5" style={{ color: "rgba(10,10,10,0.62)" }}>
                    Documentos dedicados a audiências particulares, ou que executam procedimentos específicos previstos
                    no DSA, no CDADC ou na nossa governança interna. Não substituem os documentos primários acima, complementam-nos.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {SPECIALIZED.map(({ to, icon: Icon, title, ref, desc, meta, accent }) => (
                        <Link
                            key={to}
                            to={to}
                            data-testid={`legal-card-${to.split("/").pop()}`}
                            className="group block p-4 hover:-translate-y-[2px] transition relative"
                            style={{
                                background: "#ffffff",
                                color: PT.ink,
                                border: "1px solid rgba(10,10,10,0.08)",
                                borderRadius: 14,
                                boxShadow: "0 1px 2px rgba(10,10,10,0.04), 0 8px 20px -12px rgba(10,10,10,0.10)",
                            }}
                        >
                            <div className="flex items-start gap-3">
                                <div
                                    className="shrink-0 grid place-items-center"
                                    style={{
                                        width: 36,
                                        height: 36,
                                        background: "rgba(10,10,10,0.04)",
                                        color: accent === PT.gold ? PT.ink : accent,
                                        borderRadius: 10,
                                    }}
                                >
                                    <Icon size={17} strokeWidth={2.0} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                        <h3 className="font-bold text-[15px] tracking-tight flex items-center gap-1" style={{ color: PT.ink }}>
                                            {title}
                                            <ChevronRight size={14} strokeWidth={2.2} className="opacity-0 group-hover:opacity-100 -ml-0.5 transition" style={{ color: accent === PT.gold ? PT.ink : accent }} />
                                        </h3>
                                        <span
                                            className="text-[9.5px] font-bold uppercase ml-auto px-2 py-0.5 shrink-0"
                                            style={{
                                                background: "rgba(10,10,10,0.04)",
                                                color: "rgba(10,10,10,0.55)",
                                                borderRadius: 999,
                                                letterSpacing: "0.14em",
                                            }}
                                        >
                                            {ref}
                                        </span>
                                    </div>
                                    <p className="text-[13px] leading-relaxed mb-1.5 font-medium" style={{ color: "rgba(10,10,10,0.68)" }}>
                                        {desc}
                                    </p>
                                    <p className="text-[10px] font-bold uppercase" style={{ letterSpacing: "0.14em", color: "rgba(10,10,10,0.42)" }}>
                                        {meta}
                                    </p>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>

            <h2>Como ler estes documentos</h2>
            <p>
                A maior parte das pessoas não lê documentos legais, e tem razão para isso. A maior parte deles
                é escrita para se proteger de quem os lê. Tentámos escrever os nossos de outra maneira: assumimos que
                quem está deste lado é uma pessoa adulta, curiosa, e provavelmente irritada com a opacidade habitual
                do sector. Por isso, e na medida em que o rigor jurídico o permite:
            </p>
            <ul>
                <li>Cada documento começa com um <em>callout</em> que resume o seu objeto numa frase honesta.</li>
                <li>As referências legais aparecem ao lado das afirmações que as exigem, não rebatidas no fim em letra pequena.</li>
                <li>Sempre que o texto contiver um número (prazo, idade, percentagem), esse número é real e operacional, não é prosa.</li>
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
                { name: "DL n.º 7/2004",         scope: "Comércio eletrónico, dever de informação",                   ref: "Art. 10.º" },
                { name: "DL n.º 84/2021",        scope: "Conteúdos e serviços digitais (consumidor)",                ref: "Garantias" },
                { name: "DL n.º 24/2014",         scope: "Contratos celebrados à distância (livre resolução)",        ref: "Art. 10.º" },
                { name: "DL n.º 20-B/2024",       scope: "ANACOM como Coordenador Nacional dos Serviços Digitais",       ref: "DSA-PT" },
                { name: "Diretrizes CNPD 2022/1", scope: "Cookies e tecnologias semelhantes",                        ref: "Cookies-PT" },
            ]} />

            <h2>Identificação da entidade responsável</h2>
            <LegalEntityNotice entity={LEGAL_ENTITY} />
            <p>
                O Serviço Lusorae é operado por <strong>Lusorae</strong>, projeto de direito português dirigido,
                em primeiro lugar, a utilizadores em Portugal e na União Europeia. Para qualquer assunto contratual,
                é canal preferencial o endereço{" "}
                <a href="mailto:legal@lusorae.pt">legal@lusorae.pt</a>.
            </p>

            <h2>Contactos institucionais</h2>
            <p>
                Mantemos endereços de correio distintos para cada matéria, de modo a que as mensagens cheguem,
                desde o primeiro momento, à pessoa certa:
            </p>
            <LegalContactsList items={CONTACTS} />

            <h2>Autoridades de controlo e resolução de litígios</h2>
            <LegalVisualBlock eyebrow="A quem te podes dirigir, em alternativa a nós" title="Entidades independentes com competência sobre a Plataforma" tone="info">
                <ul style={{ margin: 0, paddingLeft: 0, listStyle: "none" }}>
                    <li style={{ padding: "6px 0", fontSize: 13, color: "rgba(0,0,0,0.78)" }}>
                        <strong>CNPD</strong>, Comissão Nacional de Proteção de Dados (autoridade de controlo RGPD).{" "}
                        <a href="https://www.cnpd.pt" target="_blank" rel="noopener noreferrer">www.cnpd.pt</a>
                    </li>
                    <li style={{ padding: "6px 0", fontSize: 13, color: "rgba(0,0,0,0.78)" }}>
                        <strong>ANACOM</strong>, Coordenador Nacional dos Serviços Digitais (DSA).{" "}
                        <a href="https://www.anacom.pt" target="_blank" rel="noopener noreferrer">www.anacom.pt</a>
                    </li>
                    <li style={{ padding: "6px 0", fontSize: 13, color: "rgba(0,0,0,0.78)" }}>
                        <strong>DGC</strong>, Direção-Geral do Consumidor.{" "}
                        <a href="https://www.consumidor.gov.pt" target="_blank" rel="noopener noreferrer">www.consumidor.gov.pt</a>
                    </li>
                    <li style={{ padding: "6px 0", fontSize: 13, color: "rgba(0,0,0,0.78)" }}>
                        <strong>Centros de Arbitragem de Consumo</strong>, certificados ao abrigo da Lei n.º 144/2015,
                        de 8 de setembro. Lista oficial em{" "}
                        <a href="https://www.consumidor.gov.pt" target="_blank" rel="noopener noreferrer">consumidor.gov.pt</a>
                    </li>
                    <li style={{ padding: "6px 0", fontSize: 13, color: "rgba(0,0,0,0.78)" }}>
                        <strong>Provedor de Justiça</strong>, órgão constitucional independente para a defesa dos
                        direitos, liberdades e garantias (Constituição, art. 23.º).{" "}
                        <a href="https://www.provedor-jus.pt" target="_blank" rel="noopener noreferrer">www.provedor-jus.pt</a>
                    </li>
                </ul>
            </LegalVisualBlock>
        </LegalShell>
    );
}
