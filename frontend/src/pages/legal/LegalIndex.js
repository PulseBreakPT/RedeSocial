import { Link } from "react-router-dom";
import { FileText, ShieldCheck, Cookie, Sparkle, ChevronRight, ExternalLink } from "lucide-react";
import { LegalShell } from "./LegalShell";

const CARDS = [
    {
        to: "/legal/terms",
        icon: FileText,
        title: "Termos e Condições",
        desc: "O contrato entre ti e o Vermillion. Regras de utilização, conta, conteúdos, moderação, suspensão e foro competente.",
    },
    {
        to: "/legal/privacy",
        icon: ShieldCheck,
        title: "Política de Privacidade",
        desc: "Que dados tratamos, com que finalidade e fundamento legal, durante quanto tempo e quais os teus direitos ao abrigo do RGPD.",
    },
    {
        to: "/legal/cookies",
        icon: Cookie,
        title: "Política de Cookies",
        desc: "Quais cookies e tecnologias semelhantes utilizamos, com que finalidade, e como podes gerir o teu consentimento.",
    },
    {
        to: "/legal/community",
        icon: Sparkle,
        title: "Diretrizes da Comunidade",
        desc: "O que é permitido, o que é proibido, como reportamos e o que acontece quando há infrações. Convivência em português.",
    },
];

export default function LegalIndex() {
    return (
        <LegalShell
            active="index"
            title="Centro Legal"
            subtitle="Toda a informação sobre o teu contrato com o Vermillion, a forma como tratamos os teus dados pessoais e as regras de convivência na comunidade — em conformidade com o RGPD, o Regulamento dos Serviços Digitais (DSA), a Lei n.º 58/2019, a Lei n.º 41/2004 e a Lei n.º 27/2021 (Carta Portuguesa dos Direitos Humanos na Era Digital)."
        >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 not-prose">
                {CARDS.map(({ to, icon: Icon, title, desc }) => (
                    <Link
                        key={to}
                        to={to}
                        className="group block rounded-2xl border border-black/[0.08] p-5 hover:border-black/30 hover:-translate-y-[2px] transition bg-white"
                    >
                        <div className="flex items-start gap-3.5">
                            <div className="w-9 h-9 rounded-full bg-black/[0.04] grid place-items-center text-black shrink-0">
                                <Icon size={17} strokeWidth={1.7} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-[15px] tracking-tight mb-1 flex items-center gap-1 text-black">
                                    {title}
                                    <ChevronRight size={14} className="opacity-0 group-hover:opacity-60 -ml-0.5 transition" />
                                </h3>
                                <p className="text-[13px] leading-relaxed text-black/65">{desc}</p>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>

            <h2 className="mt-12">Identificação da entidade responsável</h2>
            <p>
                O Vermillion é operado por <strong>[Denominação social, e.g. Vermillion, Lda.]</strong>, pessoa coletiva
                de direito português, com sede em <strong>[Morada completa]</strong>,
                NIPC <strong>[Número de Identificação de Pessoa Coletiva]</strong>,
                matriculada na Conservatória do Registo Comercial de <strong>[Cidade]</strong>
                sob o número <strong>[Nº de matrícula]</strong>, com o capital social de <strong>[€ x,xx]</strong>.
            </p>
            <p>
                Contactos: <a href="mailto:legal@vermillion.pt">legal@vermillion.pt</a> (assuntos legais),{" "}
                <a href="mailto:dpo@vermillion.pt">dpo@vermillion.pt</a> (Encarregado de Proteção de Dados),{" "}
                <a href="mailto:apoio@vermillion.pt">apoio@vermillion.pt</a> (apoio ao utilizador).
            </p>

            <h2>Autoridades de controlo e resolução de litígios</h2>
            <ul>
                <li>
                    <strong>Comissão Nacional de Proteção de Dados (CNPD)</strong> — autoridade de controlo em matéria
                    de proteção de dados pessoais.{" "}
                    <a href="https://www.cnpd.pt" target="_blank" rel="noopener noreferrer">www.cnpd.pt</a>{" "}
                    <ExternalLink className="inline" size={11} />
                </li>
                <li>
                    <strong>ANACOM — Autoridade Nacional de Comunicações</strong> — Coordenador Nacional dos Serviços
                    Digitais (DSA), nos termos da Lei n.º 31/2024.{" "}
                    <a href="https://www.anacom.pt" target="_blank" rel="noopener noreferrer">www.anacom.pt</a>
                </li>
                <li>
                    <strong>Plataforma Europeia de Resolução de Litígios em Linha (ODR)</strong>:{" "}
                    <a href="https://ec.europa.eu/consumers/odr" target="_blank" rel="noopener noreferrer">
                        ec.europa.eu/consumers/odr
                    </a>
                </li>
                <li>
                    <strong>Centros de Arbitragem de Conflitos de Consumo</strong> — informação em{" "}
                    <a href="https://www.consumidor.gov.pt" target="_blank" rel="noopener noreferrer">consumidor.gov.pt</a>.
                </li>
            </ul>
        </LegalShell>
    );
}
