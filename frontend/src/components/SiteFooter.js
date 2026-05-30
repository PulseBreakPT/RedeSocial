import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { PT } from "../pages/auth/AuthDecor";

// =============================================================================
// LUSORAE — Site Footer (centrado · compacto · só links que existem)
// =============================================================================

const LEGAL_LINKS = [
    { label: "Centro Legal", to: "/legal" },
    { label: "Termos", to: "/legal/terms" },
    { label: "Privacidade", to: "/legal/privacy" },
    { label: "Cookies", to: "/legal/cookies" },
    { label: "Diretrizes", to: "/legal/community" },
    { label: "Manifesto", to: "/manifesto" },
];

export default function SiteFooter() {
    const [email, setEmail] = useState("");
    const [submitted, setSubmitted] = useState(false);

    const onSubmit = (e) => {
        e.preventDefault();
        if (!email || !/\S+@\S+\.\S+/.test(email)) return;
        try {
            localStorage.setItem("vm_newsletter", JSON.stringify({ email, at: new Date().toISOString() }));
        } catch { /* ignore */ }
        setSubmitted(true);
        setEmail("");
        setTimeout(() => setSubmitted(false), 4000);
    };

    return (
        <footer
            className="relative overflow-hidden"
            style={{ background: PT.ink, color: "#fff" }}
            data-testid="site-footer"
        >
            {/* Decoração: scribble azul + sticker verde "acontece aqui." */}
            <DecorBlock />

            <div className="relative max-w-[680px] mx-auto px-6 sm:px-8 py-10 lg:py-14 flex flex-col items-center text-center">

                {/* === NEWSLETTER (centrado) === */}
                <div
                    className="relative w-full"
                    style={{
                        background: PT.cream,
                        color: PT.ink,
                        border: `3px solid ${PT.ink}`,
                        boxShadow: `6px 6px 0 ${PT.red}`,
                        padding: "20px 22px",
                        maxWidth: 520,
                    }}
                >
                    <p
                        className="font-black tracking-tight text-center"
                        style={{ fontSize: "clamp(18px, 1.8vw, 22px)", lineHeight: 1.15, color: PT.ink }}
                    >
                        Fica a par do Lusorae.{" "}
                        <span style={{ color: "rgba(10,10,10,0.65)" }}>O melhor do que acontece perto de ti.</span>
                    </p>
                    <form
                        onSubmit={onSubmit}
                        className="mt-4 flex"
                        data-testid="footer-newsletter-form"
                        noValidate
                    >
                        <label htmlFor="footer-newsletter-email" className="sr-only">O teu email</label>
                        <input
                            id="footer-newsletter-email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder={submitted ? "Obrigado!" : "O teu email"}
                            data-testid="footer-newsletter-input"
                            className="flex-1 min-w-0 px-4 py-2.5 text-[14px] font-semibold text-center"
                            style={{
                                background: "#fff",
                                border: `2.5px solid ${PT.ink}`,
                                borderRight: "none",
                                color: PT.ink,
                                outline: "none",
                            }}
                        />
                        <button
                            type="submit"
                            data-testid="footer-newsletter-submit"
                            aria-label="Subscrever newsletter"
                            className="grid place-items-center px-4 transition hover:opacity-90"
                            style={{
                                background: PT.ink,
                                color: PT.gold,
                                border: `2.5px solid ${PT.ink}`,
                                minWidth: 50,
                            }}
                        >
                            <ArrowRight size={17} strokeWidth={2.6} />
                        </button>
                    </form>
                    <p
                        className="mt-2.5 text-[10.5px] font-mono font-bold uppercase text-center"
                        style={{ color: "rgba(10,10,10,0.55)", letterSpacing: "0.10em" }}
                    >
                        Sem spam · <span style={{ color: PT.green }}>revogável a qualquer momento</span>
                    </p>
                </div>

                {/* === LETRA MIÚDA + LINKS LEGAIS (centrado) === */}
                <div className="mt-10 w-full max-w-[560px]">
                    <p
                        className="font-mono font-bold uppercase mb-3 text-center"
                        style={{
                            color: PT.gold,
                            letterSpacing: "0.20em",
                            fontSize: 11,
                        }}
                        data-testid="footer-letra-miuda-kicker"
                    >
                        // LETRA MIÚDA — TERMOS &amp; PRIVACIDADE
                    </p>
                    <p
                        className="text-[13px] leading-relaxed font-medium mb-5 text-center"
                        style={{ color: "rgba(255,255,255,0.78)" }}
                    >
                        Os teus dados são tratados conforme o{" "}
                        <span style={{ color: "#fff", fontWeight: 700 }}>RGPD</span> e a{" "}
                        <span style={{ color: "#fff", fontWeight: 700 }}>Lei n.º 58/2019</span>.
                        Não há letra pequena — declaramos publicamente o que não fazemos no{" "}
                        <Link to="/manifesto" className="underline underline-offset-2 hover:no-underline font-bold" style={{ color: PT.gold }}>
                            manifesto
                        </Link>.
                    </p>

                    {/* Links legais como pills (centrados) */}
                    <ul className="flex flex-wrap gap-2 justify-center" data-testid="footer-legal-links">
                        {LEGAL_LINKS.map(({ label, to }) => (
                            <li key={to}>
                                <Link
                                    to={to}
                                    data-testid={`footer-legal-${to.split("/").pop() || "index"}`}
                                    className="inline-block text-[11.5px] font-black uppercase px-3 py-1.5 transition hover:opacity-100"
                                    style={{
                                        background: "transparent",
                                        color: "rgba(255,255,255,0.85)",
                                        border: `2px solid rgba(255,255,255,0.30)`,
                                        borderRadius: 999,
                                        letterSpacing: "0.08em",
                                    }}
                                >
                                    {label}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Linha tape decorativa */}
                <div className="pt-tape h-1.5 w-full mt-10 mb-5" aria-hidden />

                {/* Copyright (centrado em coluna) */}
                <div className="flex flex-col items-center gap-2 text-center">
                    <p
                        className="text-[11px] font-mono font-bold uppercase"
                        style={{ letterSpacing: "0.18em", color: PT.gold }}
                    >
                        © LUSORAE · {new Date().getFullYear()}
                    </p>
                    <p
                        className="text-[10.5px] font-mono font-bold uppercase"
                        style={{ letterSpacing: "0.14em", color: "rgba(255,255,255,0.45)" }}
                    >
                        🇵🇹 criado com ❤️ em Portugal
                    </p>
                </div>
            </div>
        </footer>
    );
}

// =============================================================================
// DECORAÇÃO: scribble azul + sticker verde "acontece aqui." (canto inf. direito)
// =============================================================================
function DecorBlock() {
    return (
        <div
            className="absolute pointer-events-none select-none block opacity-70 scale-[0.55] lg:scale-100 lg:opacity-100 origin-bottom-right"
            style={{ bottom: 16, right: 16, zIndex: 0 }}
            aria-hidden
        >
            <svg
                width="160" height="100" viewBox="0 0 160 100" fill="none"
                style={{ position: "absolute", right: -10, bottom: -5 }}
            >
                <path
                    d="M5 75 Q 30 20, 60 55 T 110 50 T 155 42"
                    stroke={PT.azul} strokeWidth="8" strokeLinecap="round" fill="none"
                />
                <path
                    d="M15 95 Q 55 65, 95 85 T 155 80"
                    stroke={PT.azul} strokeWidth="5" strokeLinecap="round" fill="none" opacity="0.75"
                />
            </svg>
            <div
                style={{
                    position: "relative",
                    background: PT.green,
                    color: "#fff",
                    padding: "8px 14px",
                    border: `2.5px solid ${PT.ink}`,
                    boxShadow: `4px 4px 0 ${PT.ink}`,
                    transform: "rotate(-6deg)",
                    fontWeight: 900,
                    fontSize: 14,
                    lineHeight: 1.05,
                    letterSpacing: "-0.01em",
                }}
            >
                acontece<br/>aqui.
            </div>
        </div>
    );
}
