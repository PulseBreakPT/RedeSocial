import { FileText, Shield, Cookie, Sparkle, Building2, Scale, ExternalLink } from "lucide-react";
import { openCookiePreferences } from "../../components/CookieBanner";
import { SectionHeader, LinkRow } from "./_shared";

/* =============================================================
   LegalTab — Centro legal: termos, privacidade, cookies,
   diretrizes, autoridade de controlo (CNPD), preferências.
   ============================================================= */

const LEGAL_DOCS = [
    { to: "/legal/terms",    icon: FileText, title: "Termos e Condições",      desc: "O contrato entre ti e o Lusorae." },
    { to: "/legal/privacy",  icon: Shield,   title: "Política de Privacidade", desc: "Como tratamos os teus dados (RGPD)." },
    { to: "/legal/cookies",  icon: Cookie,   title: "Política de Cookies",     desc: "Cookies e tecnologias semelhantes." },
    { to: "/legal/community", icon: Sparkle, title: "Diretrizes da Comunidade", desc: "O que é permitido e o que não é." },
];

export function LegalTab() {
    return (
        <div className="px-4 lg:px-8 py-5 lg:py-7" data-testid="settings-legal">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-4 max-w-5xl">
                <SectionHeader
                    overline="Documentos legais"
                    title="Para conheceres os teus direitos"
                    desc="Tudo o que precisas para perceber e exercer os teus direitos como utilizador português."
                />
                {LEGAL_DOCS.map((d) => (
                    <div key={d.to} className="lg:col-span-6">
                        <LinkRow {...d} dataTestid={`legal-${d.to.split("/").pop()}`} />
                    </div>
                ))}

                <SectionHeader overline="Consentimento" title="Preferências de cookies" />
                <div className="lg:col-span-12 card-lux p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="min-w-0">
                        <div className="font-heading font-semibold text-[14px] tracking-tight text-black">Centro de preferências</div>
                        <p className="text-[12px] text-black/55 leading-relaxed mt-1 max-w-xl">
                            Altera as tuas escolhas de cookies funcionais, analíticos e de marketing a qualquer momento. As mudanças aplicam-se imediatamente.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={openCookiePreferences}
                        data-testid="open-cookie-prefs"
                        className="btn-obsidian inline-flex items-center gap-2 px-4 py-2.5 text-[12px] shrink-0"
                    >
                        <Cookie size={13} /> Gerir cookies
                    </button>
                </div>

                <SectionHeader
                    overline="Os teus direitos (RGPD)"
                    title="Acesso, retificação, apagamento"
                    desc="Tens direito de acesso, retificação, apagamento, portabilidade, limitação e oposição ao tratamento dos teus dados."
                />
                <div className="lg:col-span-8 card-lux p-5">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-black/[0.04] grid place-items-center shrink-0 text-black"><Scale size={16} strokeWidth={1.7} /></div>
                        <div className="min-w-0 flex-1">
                            <div className="font-heading font-semibold text-[14px] tracking-tight text-black">Encarregado de Proteção de Dados (DPO)</div>
                            <p className="text-[12.5px] text-black/65 leading-relaxed mt-1">
                                Para exerceres qualquer um dos teus direitos, ou para qualquer questão sobre os teus dados pessoais.
                            </p>
                            <a
                                href="mailto:dpo@lusorae.pt"
                                data-testid="legal-dpo-email"
                                className="inline-flex items-center gap-2 mt-3 px-4 py-2.5 rounded-full bg-black/[0.05] hover:bg-black/[0.10] text-[12.5px] font-medium tap-shrink transition"
                            >
                                <ExternalLink size={12} /> dpo@lusorae.pt
                            </a>
                        </div>
                    </div>
                </div>
                <div className="lg:col-span-4 card-lux p-5">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-black/[0.04] grid place-items-center shrink-0 text-black"><Building2 size={16} strokeWidth={1.7} /></div>
                        <div className="min-w-0">
                            <p className="type-overline mb-0">Autoridade de controlo</p>
                            <p className="font-heading font-semibold text-[13px] tracking-tight text-black mt-1 leading-snug">
                                Comissão Nacional de Proteção de Dados
                            </p>
                            <a
                                href="https://www.cnpd.pt"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 mt-2 text-[12px] underline underline-offset-2 hover:text-black tap-shrink"
                            >
                                www.cnpd.pt <ExternalLink size={10} />
                            </a>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-12 text-[11px] text-black/45 leading-relaxed hairline-t pt-5 mt-2 font-mono">
                    <p>
                        Lusorae © {new Date().getFullYear()} · operado por <span className="bg-black/[0.04] px-1.5 py-0.5 rounded">[Lusorae, Lda.]</span> com sede em Portugal · NIPC <span className="bg-black/[0.04] px-1.5 py-0.5 rounded">[a indicar]</span> · versão dos termos em vigor: 1.0 · sujeito à lei portuguesa e à União Europeia.
                    </p>
                </div>
            </div>
        </div>
    );
}
