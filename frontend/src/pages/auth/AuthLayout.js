import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight } from "lucide-react";

// =============================================================================
// DESIGN SYSTEM: LUSORAE EDITORIAL — ver /src/theme/EDITORIAL.md
// Auth shell partilhado (Login + Register + Forgot password).
// Tokens, primitives e visual panel alinhados com a Landing: paper + ink,
// hairlines, sombras difusas, pill CTAs, kicker mono com dot pulse.
// Selo "Made in Portugal" no rodapé do painel visual reforça a identidade.
// Substitui completamente o antigo estilo "poster urbano / stickers fanzine PT".
// =============================================================================

export const PT = {
    ink:    "#0A0A0A",
    paper:  "#F7F5EF",
    cream:  "#FBFAF6",
    red:    "#C8102E",
    gold:   "#FFCC29",
    green:  "#046A38",
    azul:   "#003F87",
};

// Imagens (mesmas usadas na landing — já em cache)
export const AUTH_IMG_LOGIN    = "https://images.pexels.com/photos/34440892/pexels-photo-34440892.jpeg?auto=compress&w=1200"; // Lisboa golden hour
export const AUTH_IMG_REGISTER = "https://images.unsplash.com/photo-1693944844665-ce10f83a775b?auto=format&fit=crop&w=1200&q=80"; // Porto aéreo

// =============================================================================
// UnderlineStroke — wave animada por baixo de palavras em itálico
// =============================================================================
export function UnderlineStroke({ color = PT.azul, w = 420, h = 10, variant = "wave", delay = 0, style = {}, strokeWidth = 3 }) {
    const ref = useRef(null);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const obs = new IntersectionObserver((entries) => {
            for (const e of entries) {
                if (e.isIntersecting) {
                    el.style.strokeDashoffset = "0";
                    obs.disconnect();
                    break;
                }
            }
        }, { threshold: 0.3 });
        obs.observe(el);
        return () => obs.disconnect();
    }, []);
    const d = variant === "wave"
        ? `M2 ${h - 3} Q ${w * 0.25} 2 ${w * 0.5} ${h - 3} T ${w - 2} ${h - 3}`
        : `M2 ${h - 2} L ${w - 2} ${h - 4}`;
    return (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={style} aria-hidden>
            <path
                ref={ref}
                d={d}
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                fill="none"
                style={{
                    strokeDasharray: w * 1.4,
                    strokeDashoffset: w * 1.4,
                    transition: `stroke-dashoffset 1.1s cubic-bezier(0.22, 1, 0.36, 1) ${delay}s`,
                }}
            />
        </svg>
    );
}

// =============================================================================
// Kicker — mono micro-label ("ÁREA · LOGIN")
// =============================================================================
export function Kicker({ children, color = PT.ink, dot = true, className = "" }) {
    return (
        <div className={`inline-flex items-center gap-2 ${className}`}>
            {dot && (
                <span className="relative flex h-1.5 w-1.5" aria-hidden>
                    <span className="absolute inline-flex h-full w-full rounded-full lusorae-pulse" style={{ background: color }} />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: color }} />
                </span>
            )}
            <span
                className="font-mono text-[11px] font-bold uppercase"
                style={{ color: "rgba(10,10,10,0.62)", letterSpacing: "0.22em" }}
            >
                {children}
            </span>
        </div>
    );
}

// =============================================================================
// Field — label editorial (número + label + ação à direita)
// =============================================================================
export function Field({ label, number, htmlFor, right, hint, children }) {
    return (
        <div className="relative">
            <div className="flex items-end justify-between mb-1.5">
                <label htmlFor={htmlFor} className="flex items-baseline gap-2 cursor-pointer">
                    {number && (
                        <span
                            className="font-mono text-[10px] font-black tabular-nums"
                            style={{
                                color: "rgba(10,10,10,0.45)",
                                letterSpacing: "0.1em",
                            }}
                        >
                            {number}
                        </span>
                    )}
                    <span
                        className="text-[12.5px] font-bold uppercase"
                        style={{ color: PT.ink, letterSpacing: "0.10em" }}
                    >
                        {label}
                    </span>
                </label>
                {right}
            </div>
            {children}
            {hint && (
                <p className="mt-1.5 text-[11.5px] font-medium leading-snug" style={{ color: "rgba(10,10,10,0.5)" }}>
                    {hint}
                </p>
            )}
        </div>
    );
}

// =============================================================================
// Input — base input style (clean, sem sombras pesadas)
// =============================================================================
export const inputClass = "auth-input";

export function inputStateStyle(status) {
    if (status === "available") return { borderColor: PT.green, boxShadow: `0 0 0 3px ${PT.green}1A` };
    if (status === "taken" || status === "invalid") return { borderColor: PT.red, boxShadow: `0 0 0 3px ${PT.red}1A` };
    return undefined;
}

// =============================================================================
// PrimaryButton — black pill
// =============================================================================
export function PrimaryButton({ children, type = "button", disabled, busy, fullWidth = true, dataTestid, onClick, className = "" }) {
    return (
        <button
            type={type}
            disabled={disabled || busy}
            onClick={onClick}
            data-testid={dataTestid}
            className={`inline-flex items-center justify-center gap-2 font-bold text-[15px] py-3.5 px-6 rounded-full transition-all duration-200 ${fullWidth ? "w-full" : ""} ${className}`}
            style={{
                background: disabled || busy
                    ? "rgba(10,10,10,0.35)"
                    : `linear-gradient(180deg, #1f1f1f 0%, ${PT.ink} 100%)`,
                color: "#fff",
                boxShadow: disabled || busy
                    ? "none"
                    : "inset 0 1px 0 rgba(255,255,255,0.12), 0 12px 28px -10px rgba(10,10,10,0.4), 0 3px 8px rgba(10,10,10,0.08)",
                cursor: disabled || busy ? "not-allowed" : "pointer",
                letterSpacing: "-0.01em",
            }}
        >
            {children}
        </button>
    );
}

export function GhostButton({ children, type = "button", onClick, dataTestid, className = "" }) {
    return (
        <button
            type={type}
            onClick={onClick}
            data-testid={dataTestid}
            className={`inline-flex items-center justify-center gap-1.5 font-bold text-[14px] py-3 px-5 rounded-full transition-all duration-200 hover:bg-[rgba(10,10,10,0.04)] ${className}`}
            style={{
                background: "transparent",
                color: PT.ink,
                border: "1.5px solid rgba(10,10,10,0.12)",
            }}
        >
            {children}
        </button>
    );
}

// =============================================================================
// ErrorBanner — banner de erro clean
// =============================================================================
export function ErrorBanner({ message, dataTestid }) {
    if (!message) return null;
    return (
        <div
            data-testid={dataTestid}
            className="flex items-start gap-2.5 px-4 py-3 rounded-xl"
            style={{
                background: "#FEF2F4",
                border: `1px solid ${PT.red}33`,
            }}
            role="alert"
        >
            <span
                aria-hidden
                className="shrink-0 grid place-items-center mt-0.5"
                style={{
                    width: 18, height: 18, borderRadius: "50%",
                    background: PT.red, color: "#fff",
                    fontSize: 12, fontWeight: 900, lineHeight: 1,
                }}
            >!</span>
            <p className="text-[13px] font-semibold leading-snug" style={{ color: PT.red }}>
                {message}
            </p>
        </div>
    );
}

// =============================================================================
// TopBar — nav minimalista (logo «LUSORAE» + link de volta + estado live)
// =============================================================================
export function AuthTopBar({ rightSlot }) {
    return (
        <header
            className="relative z-20 flex items-center justify-between px-5 sm:px-8 lg:px-10 py-4 sm:py-5"
            style={{ background: PT.paper }}
        >
            <Link to="/" className="inline-flex items-baseline gap-1 group" aria-label="Voltar à landing">
                <span
                    className="font-black tracking-[-0.045em] text-[20px] sm:text-[22px] leading-none"
                    style={{ color: PT.ink }}
                >
                    LUSORAE
                </span>
                <span
                    className="inline-block"
                    style={{
                        width: 5, height: 5, borderRadius: "50%",
                        background: PT.red, transform: "translateY(-1px)",
                    }}
                    aria-hidden
                />
            </Link>
            {rightSlot}
        </header>
    );
}

// =============================================================================
// VisualPanel — painel lateral editorial (imagem + manifesto)
// =============================================================================
export function VisualPanel({
    image,
    imageAlt = "",
    kicker,
    accent = PT.azul,
    titleLead,
    titleEm,
    titleTail = ".",
    sub,
    cityName,
    cityCaption,
    quote,
    quoteAuthor,
}) {
    return (
        <aside
            className="relative isolate hidden lg:flex flex-col overflow-hidden"
            style={{ background: PT.ink, color: "#fff" }}
            data-testid="auth-visual-panel"
        >
            {/* Imagem fundo */}
            <img
                src={image}
                alt={imageAlt}
                className="absolute inset-0 w-full h-full object-cover"
                style={{ opacity: 0.55, filter: "saturate(1.1)" }}
                loading="eager"
            />
            {/* Overlay gradiente */}
            <div
                aria-hidden
                className="absolute inset-0 pointer-events-none"
                style={{
                    background: `linear-gradient(180deg, rgba(10,10,10,0.55) 0%, rgba(10,10,10,0.35) 35%, rgba(10,10,10,0.85) 100%)`,
                }}
            />
            {/* Grid sutil */}
            <div
                aria-hidden
                className="absolute inset-0 pointer-events-none opacity-[0.07]"
                style={{
                    backgroundImage: `linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)`,
                    backgroundSize: "36px 36px",
                }}
            />

            {/* Conteúdo */}
            <div className="relative z-10 flex-1 flex flex-col p-10 xl:p-14">
                {/* Top: kicker + cidade chip */}
                <div className="flex items-center justify-between">
                    <div className="inline-flex items-center gap-2">
                        <span className="relative flex h-1.5 w-1.5" aria-hidden>
                            <span className="absolute inline-flex h-full w-full rounded-full lusorae-pulse" style={{ background: accent }} />
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: accent }} />
                        </span>
                        <span className="font-mono text-[11px] font-bold uppercase" style={{ letterSpacing: "0.20em", color: "rgba(255,255,255,0.78)" }}>
                            {kicker}
                        </span>
                    </div>
                    {cityName && (
                        <div
                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full"
                            style={{
                                background: "rgba(255,255,255,0.10)",
                                backdropFilter: "blur(10px)",
                                WebkitBackdropFilter: "blur(10px)",
                                border: "1px solid rgba(255,255,255,0.18)",
                            }}
                        >
                            <span className="font-mono text-[9.5px] font-black uppercase text-white" style={{ letterSpacing: "0.14em" }}>
                                {cityName}
                            </span>
                            {cityCaption && (
                                <span className="font-mono text-[9.5px] font-medium uppercase" style={{ color: "rgba(255,255,255,0.55)", letterSpacing: "0.12em" }}>
                                    · {cityCaption}
                                </span>
                            )}
                        </div>
                    )}
                </div>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Título — bold + italic acento com wave underline */}
                <h1
                    className="font-black tracking-[-0.045em] leading-[0.92] mb-5"
                    style={{ fontSize: "clamp(48px, 5.4vw, 78px)", color: "#fff" }}
                >
                    {titleLead}
                    <br />
                    <span className="relative inline-block">
                        <span style={{ fontStyle: "italic", color: accent === PT.ink ? PT.gold : accent }}>
                            {titleEm}
                        </span>
                        <span
                            className="absolute pointer-events-none"
                            style={{ left: 0, right: 0, bottom: "-0.08em", height: 12 }}
                            aria-hidden
                        >
                            <UnderlineStroke color={accent === PT.ink ? PT.gold : accent} w={520} h={12} variant="wave" delay={0.3} style={{ width: "100%", height: "100%" }} strokeWidth={3.5} />
                        </span>
                    </span>
                    {titleTail}
                </h1>

                {/* Sub */}
                {sub && (
                    <p className="text-[16px] sm:text-[17px] font-medium leading-relaxed max-w-[42ch] mb-7" style={{ color: "rgba(255,255,255,0.78)" }}>
                        {sub}
                    </p>
                )}

                {/* Quote card */}
                {quote && (
                    <div
                        className="relative p-5 rounded-2xl"
                        style={{
                            background: "rgba(255,255,255,0.06)",
                            backdropFilter: "blur(12px)",
                            WebkitBackdropFilter: "blur(12px)",
                            border: "1px solid rgba(255,255,255,0.12)",
                            maxWidth: 420,
                        }}
                    >
                        <span
                            aria-hidden
                            className="absolute -top-3 -left-1 font-black"
                            style={{ fontSize: 56, lineHeight: 1, color: accent === PT.ink ? PT.gold : accent, fontFamily: "Georgia, serif", opacity: 0.5 }}
                        >“</span>
                        <p className="text-[15.5px] font-bold leading-snug pl-3" style={{ color: "#fff", fontStyle: "italic" }}>
                            {quote}
                        </p>
                        {quoteAuthor && (
                            <p className="mt-3 pl-3 font-mono text-[10px] font-bold uppercase" style={{ letterSpacing: "0.16em", color: "rgba(255,255,255,0.55)" }}>
                                — {quoteAuthor}
                            </p>
                        )}
                    </div>
                )}

                {/* Footer mini */}
                <div className="mt-auto pt-8 flex items-end justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="flex -space-x-2">
                            {[PT.red, PT.gold, PT.azul, PT.green].map((c, i) => (
                                <span
                                    key={i}
                                    className="rounded-full inline-flex items-center justify-center font-black text-[10px]"
                                    style={{
                                        width: 28, height: 28, background: c,
                                        color: c === PT.gold ? PT.ink : "#fff",
                                        border: "2px solid rgba(10,10,10,0.92)",
                                        boxShadow: "0 2px 6px rgba(0,0,0,0.35)",
                                    }}
                                >
                                    {["S", "T", "I", "M"][i]}
                                </span>
                            ))}
                        </div>
                        <div>
                            <p className="text-[12px] font-bold leading-tight" style={{ color: "#fff" }}>
                                Primeiros membros já dentro
                            </p>
                            <p className="text-[10.5px] font-medium leading-tight mt-0.5" style={{ color: "rgba(255,255,255,0.55)" }}>
                                Lisboa · Porto · Faro · Funchal
                            </p>
                        </div>
                    </div>
                    {/* ─── Selo "Made in Portugal" ──────────────────────────── */}
                    <div
                        className="flex flex-col items-center gap-1.5 shrink-0"
                        aria-label="Made in Portugal"
                        data-testid="auth-made-in-pt-seal"
                    >
                        <div
                            className="grid place-items-center font-black uppercase text-center"
                            style={{
                                width: 64, height: 64, borderRadius: "50%",
                                background: "rgba(255,255,255,0.06)",
                                border: "1px solid rgba(255,255,255,0.22)",
                                backdropFilter: "blur(10px)",
                                WebkitBackdropFilter: "blur(10px)",
                                color: "#fff",
                                lineHeight: 1.05,
                                letterSpacing: "0.06em",
                                boxShadow: "0 8px 22px -10px rgba(0,0,0,0.55)",
                            }}
                        >
                            <div className="flex flex-col items-center gap-0.5">
                                <span className="font-mono text-[7.5px] font-bold" style={{ letterSpacing: "0.22em", color: "rgba(255,255,255,0.68)" }}>
                                    MADE IN
                                </span>
                                <span className="text-[13px] tracking-tight" style={{ color: "#fff" }}>
                                    PORTUGAL
                                </span>
                                <span className="flex items-center gap-0.5 mt-0.5" aria-hidden>
                                    <span style={{ width: 6, height: 3, background: PT.green, borderRadius: 1 }} />
                                    <span style={{ width: 6, height: 3, background: PT.red, borderRadius: 1 }} />
                                </span>
                            </div>
                        </div>
                        <Link
                            to="/"
                            className="inline-flex items-center gap-1 font-mono text-[9.5px] font-bold uppercase opacity-70 hover:opacity-100 transition-opacity"
                            style={{ color: "#fff", letterSpacing: "0.16em" }}
                        >
                            Landing <ArrowUpRight size={10} strokeWidth={2.5} />
                        </Link>
                    </div>
                </div>
            </div>
        </aside>
    );
}

// =============================================================================
// AuthShell — wrapper: top bar + 2-col grid + visual panel + form column
// =============================================================================
export function AuthShell({ visual, children, bottomLink }) {
    return (
        <div className="min-h-screen flex flex-col" style={{ background: PT.paper }}>
            <AuthTopBar rightSlot={bottomLink} />
            <div className="flex-1 grid lg:grid-cols-[1fr_1.05fr]">
                {/* Coluna form (esquerda em desktop, em cima em mobile) */}
                <main className="order-1 lg:order-1 relative flex flex-col">
                    <div className="flex-1 flex items-center px-5 sm:px-10 lg:px-14 py-8 sm:py-12 lg:py-16">
                        <div className="w-full max-w-[460px] mx-auto lg:mx-0">
                            {children}
                        </div>
                    </div>
                </main>
                {/* Coluna visual (direita, só desktop) */}
                <div className="order-2 lg:order-2">
                    {visual}
                </div>
            </div>
        </div>
    );
}

// =============================================================================
// AuthStyles — kept como no-op (back-compat). Os estilos `.auth-input`,
// `.lusorae-pulse` e `.auth-fade-up` foram migrados para `/src/index.css`
// (LUSORAE EDITORIAL · classes globais partilhadas) em jun/2026.
// =============================================================================
export function AuthStyles() {
    return null;
}

// =============================================================================
// StepDots — indicador de progresso 3 passos (linha + números)
// =============================================================================
export function StepDots({ current = 1, total = 3, labels = [] }) {
    return (
        <div className="flex items-center gap-2 sm:gap-3" data-testid="register-steps">
            {Array.from({ length: total }).map((_, i) => {
                const n = i + 1;
                const done = n < current;
                const active = n === current;
                return (
                    <div key={n} className="flex items-center gap-2 sm:gap-3 flex-1">
                        <div className="flex items-center gap-2 min-w-0">
                            <span
                                className="shrink-0 grid place-items-center font-black text-[11px] tabular-nums transition-all duration-300"
                                style={{
                                    width: active ? 30 : 24, height: active ? 30 : 24,
                                    borderRadius: "50%",
                                    background: done ? PT.ink : active ? PT.ink : "#fff",
                                    color: done || active ? "#fff" : "rgba(10,10,10,0.45)",
                                    border: `1.5px solid ${done || active ? PT.ink : "rgba(10,10,10,0.12)"}`,
                                }}
                            >
                                {done ? "✓" : n}
                            </span>
                            <span
                                className={`hidden sm:inline-block text-[11px] font-bold uppercase tracking-wide whitespace-nowrap transition-opacity ${active ? "opacity-100" : "opacity-50"}`}
                                style={{ color: PT.ink, letterSpacing: "0.08em" }}
                            >
                                {labels[i]}
                            </span>
                        </div>
                        {n < total && (
                            <span
                                aria-hidden
                                className="flex-1 h-[2px] rounded-full transition-colors duration-300"
                                style={{ background: done ? PT.ink : "rgba(10,10,10,0.10)" }}
                            />
                        )}
                    </div>
                );
            })}
        </div>
    );
}

// =============================================================================
// Re-exports úteis
// =============================================================================
export { ArrowRight, ArrowUpRight };
