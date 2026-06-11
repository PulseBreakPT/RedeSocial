import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Instagram, Linkedin, Twitter } from "lucide-react";
import { PT } from "../pages/auth/AuthDecor";

// =============================================================================
// LUSORAE — Site Footer · Premium redesign matching new landing design system
// (Grid texture · Glassmorphism · Italic accents · Kicker pattern · PT colour blocks)
// =============================================================================

const NAV_GROUPS = [
    {
        label: "Produto",
        links: [
            { to: "/register", text: "Criar conta" },
            { to: "/login",    text: "Entrar" },
            { to: "/manifesto", text: "Manifesto" },
        ],
    },
    {
        label: "Comunidade",
        links: [
            { to: "/communities", text: "Comunidades" },
            { to: "/events",      text: "Eventos" },
            { to: "/explore",     text: "Explorar" },
        ],
    },
    {
        label: "Legal",
        links: [
            { to: "/legal/terms",     text: "Termos" },
            { to: "/legal/privacy",   text: "Privacidade" },
            { to: "/legal/cookies",   text: "Cookies" },
            { to: "/legal/community", text: "Diretrizes" },
            { to: "/legal",           text: "Centro Legal" },
        ],
    },
];

const SOCIAL_LINKS = [
    { href: "https://instagram.com/lusorae", label: "Instagram", icon: Instagram },
    { href: "https://linkedin.com/company/lusorae", label: "Linkedin", icon: Linkedin },
    { href: "https://x.com/lusorae", label: "X (Twitter)", icon: Twitter },
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
            {/* === Background grid texture (matches FinalCta) === */}
            <div
                aria-hidden
                className="absolute inset-0 pointer-events-none opacity-[0.05]"
                style={{
                    backgroundImage: `linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)`,
                    backgroundSize: "44px 44px",
                }}
            />

            {/* === Floating PT colour accent blocks === */}
            <div
                className="absolute pointer-events-none lusorae-float-soft hidden sm:block"
                style={{ right: -60, top: -50, width: 200, height: 200, background: PT.red, borderRadius: 26, "--rot": "12deg", opacity: 0.55 }}
                aria-hidden
            />
            <div
                className="absolute pointer-events-none lusorae-float-soft hidden sm:block"
                style={{ right: 120, top: 120, width: 90, height: 90, background: PT.gold, borderRadius: 16, "--rot": "-6deg", opacity: 0.5, animationDelay: "0.8s" }}
                aria-hidden
            />
            <div
                className="absolute pointer-events-none lusorae-float-soft hidden sm:block"
                style={{ left: -40, bottom: 60, width: 110, height: 110, background: PT.green, borderRadius: 18, "--rot": "-18deg", opacity: 0.45, animationDelay: "1.4s" }}
                aria-hidden
            />

            {/* ===================== MAIN GRID ===================== */}
            <div className="relative max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-12 pt-16 sm:pt-20 pb-8">

                {/* Kicker row */}
                <div className="flex items-center gap-3 mb-10 sm:mb-12">
                    <span
                        className="inline-flex items-center justify-center font-mono text-[10.5px] font-black"
                        style={{
                            width: 26, height: 26, borderRadius: "50%",
                            background: "#fff", color: PT.ink, letterSpacing: "0.04em",
                        }}
                    >
                        04
                    </span>
                    <p
                        className="font-mono text-[11px] font-bold uppercase"
                        style={{ letterSpacing: "0.22em", color: "rgba(255,255,255,0.62)" }}
                    >
                        Fecho · até já
                    </p>
                    <span className="hidden sm:inline-block" style={{ width: 28, height: 1, background: "rgba(255,255,255,0.2)" }} />
                    <p className="hidden sm:inline-block font-mono text-[11px] font-bold uppercase" style={{ letterSpacing: "0.16em", color: "rgba(255,255,255,0.4)" }}>
                        37°–42°N · Atlântico
                    </p>
                </div>

                {/* === TOP ROW: Brand + Newsletter === */}
                <div className="grid lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-14 mb-14 sm:mb-16">

                    {/* --- LEFT: Brand block --- */}
                    <div>
                        <div className="flex items-center gap-3 mb-5">
                            <div
                                className="flex items-center justify-center font-black text-[20px]"
                                style={{
                                    width: 50, height: 50, borderRadius: 14,
                                    background: "#fff", color: PT.ink,
                                    fontStyle: "italic", letterSpacing: "-0.05em",
                                }}
                                aria-hidden
                            >
                                L
                            </div>
                            <div>
                                <p
                                    className="font-black tracking-[-0.025em] leading-none"
                                    style={{
                                        fontSize: "clamp(28px, 3.2vw, 38px)",
                                        color: "#fff",
                                        fontWeight: 900,
                                    }}
                                >
                                    Lusorae
                                </p>
                                <p className="font-mono text-[10.5px] font-bold uppercase mt-1.5" style={{ letterSpacing: "0.20em", color: "rgba(255,255,255,0.55)" }}>
                                    A rede portuguesa · Est. 2026
                                </p>
                            </div>
                        </div>

                        <h3
                            className="font-black tracking-[-0.035em] leading-[0.95] mb-5 max-w-[480px]"
                            style={{
                                fontSize: "clamp(26px, 3vw, 42px)",
                                color: "#fff",
                                fontWeight: 900,
                            }}
                        >
                            Não é mais uma rede.{" "}
                            <span style={{ fontStyle: "italic", color: PT.gold, letterSpacing: "-0.045em" }}>
                                É a rede.
                            </span>
                        </h3>
                        <p className="text-[14.5px] sm:text-[15px] font-medium leading-relaxed max-w-[460px] mb-7" style={{ color: "rgba(255,255,255,0.65)" }}>
                            Feita em Portugal, para portugueses. Sem algoritmo de vaidade, sem feed for you. Tu mandas no que vês.
                        </p>

                        {/* PT flag dots + Made in stamp */}
                        <div className="flex items-center gap-3 flex-wrap">
                            <div
                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full"
                                style={{
                                    background: "rgba(255,255,255,0.06)",
                                    border: "1px solid rgba(255,255,255,0.12)",
                                }}
                            >
                                <span style={{ width: 7, height: 7, borderRadius: "50%", background: PT.red, display: "inline-block" }} />
                                <span style={{ width: 7, height: 7, borderRadius: "50%", background: PT.green, display: "inline-block" }} />
                                <span className="font-mono text-[10.5px] font-black uppercase" style={{ letterSpacing: "0.18em", color: "rgba(255,255,255,0.85)" }}>
                                    Made in PT
                                </span>
                            </div>
                            <div className="inline-flex items-center gap-2">
                                <span className="relative flex h-1.5 w-1.5" aria-hidden>
                                    <span className="absolute inline-flex h-full w-full rounded-full lusorae-pulse" style={{ background: PT.green }} />
                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: PT.green }} />
                                </span>
                                <span className="font-mono text-[10.5px] font-black uppercase" style={{ letterSpacing: "0.18em", color: "rgba(255,255,255,0.75)" }}>
                                    Beta ativa
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* --- RIGHT: Newsletter glassmorphism card --- */}
                    <div
                        className="relative p-6 sm:p-7 lg:p-8"
                        style={{
                            background: "rgba(255,255,255,0.05)",
                            backdropFilter: "blur(20px) saturate(140%)",
                            WebkitBackdropFilter: "blur(20px) saturate(140%)",
                            border: "1px solid rgba(255,255,255,0.12)",
                            borderRadius: 22,
                            boxShadow: "0 20px 60px -20px rgba(0,0,0,0.5)",
                        }}
                        data-testid="footer-newsletter-card"
                    >
                        <div className="flex items-center gap-2 mb-4">
                            <span className="relative flex h-2 w-2" aria-hidden>
                                <span className="absolute inline-flex h-full w-full rounded-full lusorae-pulse" style={{ background: PT.gold }} />
                                <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: PT.gold }} />
                            </span>
                            <p className="font-mono text-[10.5px] font-bold uppercase" style={{ letterSpacing: "0.20em", color: "rgba(255,255,255,0.75)" }}>
                                Newsletter · sem spam
                            </p>
                        </div>

                        <h4
                            className="font-black tracking-[-0.025em] leading-[1] mb-2"
                            style={{
                                fontSize: "clamp(22px, 2.4vw, 28px)",
                                color: "#fff",
                                fontWeight: 900,
                            }}
                        >
                            Fica a par do que{" "}
                            <span style={{ fontStyle: "italic", color: PT.gold, letterSpacing: "-0.035em" }}>
                                acontece
                            </span>
                            .
                        </h4>
                        <p className="text-[13.5px] sm:text-[14px] font-medium leading-relaxed mb-5" style={{ color: "rgba(255,255,255,0.62)" }}>
                            Eventos, comunidades e novidades da rede. Uma vez por mês, no máximo.
                        </p>

                        <form
                            onSubmit={onSubmit}
                            className="flex gap-2"
                            data-testid="footer-newsletter-form"
                            noValidate
                        >
                            <label htmlFor="footer-newsletter-email" className="sr-only">O teu email</label>
                            <input
                                id="footer-newsletter-email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder={submitted ? "Obrigado! · até já" : "o.teu@email.pt"}
                                data-testid="footer-newsletter-input"
                                className="flex-1 min-w-0 px-4 py-3 text-[14px] font-semibold rounded-full transition-all focus:outline-none"
                                style={{
                                    background: "rgba(255,255,255,0.08)",
                                    border: "1px solid rgba(255,255,255,0.18)",
                                    color: "#fff",
                                }}
                            />
                            <button
                                type="submit"
                                data-testid="footer-newsletter-submit"
                                aria-label="Subscrever newsletter"
                                className="grid place-items-center px-5 rounded-full transition-all hover:scale-[1.05] shrink-0"
                                style={{
                                    background: "#fff",
                                    color: PT.ink,
                                    minWidth: 50,
                                    boxShadow: "0 10px 24px -8px rgba(0,0,0,0.4)",
                                }}
                            >
                                <ArrowRight size={17} strokeWidth={2.6} />
                            </button>
                        </form>
                        <p className="mt-3.5 font-mono text-[10px] font-bold uppercase" style={{ letterSpacing: "0.16em", color: "rgba(255,255,255,0.4)" }}>
                            <span style={{ color: PT.green }}>●</span>{" "}Sem spam · revogável a qualquer momento
                        </p>
                    </div>
                </div>

                {/* === DIVIDER === */}
                <div
                    className="w-full h-px mb-12 sm:mb-14"
                    style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.16) 50%, transparent)" }}
                    aria-hidden
                />

                {/* === MIDDLE: Nav columns === */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-[1.2fr_1fr_1fr_1fr] gap-8 sm:gap-10 mb-14 sm:mb-16">

                    {/* Tagline column (desktop only) */}
                    <div className="hidden lg:block">
                        <p className="font-mono text-[10.5px] font-bold uppercase mb-3" style={{ letterSpacing: "0.20em", color: "rgba(255,255,255,0.45)" }}>
                            Manifesto
                        </p>
                        <p
                            className="font-black leading-tight tracking-[-0.02em]"
                            style={{ fontSize: "20px", color: "#fff" }}
                        >
                            Pessoas reais.{" "}
                            <span style={{ fontStyle: "italic", color: PT.gold }}>Eventos reais.</span>{" "}
                            Cidade real.
                        </p>
                        <Link
                            to="/manifesto"
                            className="inline-flex items-center gap-1.5 mt-4 text-[12.5px] font-bold transition-opacity hover:opacity-70"
                            style={{ color: PT.gold, borderBottom: `1.5px solid ${PT.gold}`, paddingBottom: 2 }}
                            data-testid="footer-manifesto-link"
                        >
                            Lê o manifesto <ArrowRight size={13} />
                        </Link>
                    </div>

                    {NAV_GROUPS.map((group) => (
                        <div key={group.label}>
                            <p className="font-mono text-[10.5px] font-bold uppercase mb-3.5" style={{ letterSpacing: "0.20em", color: "rgba(255,255,255,0.45)" }}>
                                {group.label}
                            </p>
                            <ul className="space-y-2.5" data-testid={`footer-group-${group.label.toLowerCase()}`}>
                                {group.links.map((link) => (
                                    <li key={link.to}>
                                        <Link
                                            to={link.to}
                                            data-testid={`footer-link-${link.text.toLowerCase().replace(/\s+/g, "-")}`}
                                            className="inline-block text-[13.5px] font-semibold transition-colors hover:text-white"
                                            style={{ color: "rgba(255,255,255,0.70)" }}
                                        >
                                            {link.text}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                {/* === DIVIDER === */}
                <div
                    className="w-full h-px mb-7"
                    style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.10) 50%, transparent)" }}
                    aria-hidden
                />

                {/* === BOTTOM BAR === */}
                <div className="flex flex-wrap items-center justify-between gap-5">

                    {/* Left: copyright + status */}
                    <div className="flex items-center gap-4 flex-wrap">
                        <p className="font-mono text-[10.5px] font-bold uppercase" style={{ letterSpacing: "0.18em", color: "rgba(255,255,255,0.55)" }}>
                            © Lusorae · {new Date().getFullYear()}
                        </p>
                        <span className="inline-block" style={{ width: 1, height: 14, background: "rgba(255,255,255,0.15)" }} />
                        <p className="font-mono text-[10.5px] font-bold uppercase hidden sm:block" style={{ letterSpacing: "0.18em", color: "rgba(255,255,255,0.40)" }}>
                            Lisboa · Porto · Faro · Funchal
                        </p>
                    </div>

                    {/* Right: social icons */}
                    <div className="flex items-center gap-2.5" data-testid="footer-social">
                        {SOCIAL_LINKS.map(({ href, label, icon: Icon }) => (
                            <a
                                key={label}
                                href={href}
                                target="_blank"
                                rel="noopener noreferrer"
                                aria-label={label}
                                data-testid={`footer-social-${label.toLowerCase().split(" ")[0]}`}
                                className="inline-flex items-center justify-center transition-all hover:scale-110"
                                style={{
                                    width: 36, height: 36, borderRadius: "50%",
                                    background: "rgba(255,255,255,0.06)",
                                    border: "1px solid rgba(255,255,255,0.12)",
                                    color: "rgba(255,255,255,0.75)",
                                }}
                            >
                                <Icon size={15} strokeWidth={2} />
                            </a>
                        ))}
                    </div>
                </div>

                {/* Final coordinate strip — editorial flourish */}
                <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5 pt-5" style={{ borderTop: "1px dashed rgba(255,255,255,0.10)" }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: PT.red, display: "inline-block" }} aria-hidden />
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: PT.green, display: "inline-block" }} aria-hidden />
                    <p className="font-mono text-[10px] font-bold uppercase text-center" style={{ letterSpacing: "0.25em", color: "rgba(255,255,255,0.30)" }}>
                        Lat. 38°42&apos;N · Lon. 9°08&apos;W ·{" "}
                        <span style={{ color: "rgba(255,255,255,0.55)" }}>Feito com</span>{" "}
                        <span style={{ color: PT.red, fontSize: 11 }}>♥</span>{" "}
                        <span style={{ color: "rgba(255,255,255,0.55)" }}>em Portugal</span>
                    </p>
                </div>
            </div>
        </footer>
    );
}
