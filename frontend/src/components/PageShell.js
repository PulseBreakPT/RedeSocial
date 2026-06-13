// Shared page primitives — clean editorial aesthetic.
// Substitui o estilo fanzine "magazine" por um sistema editorial sóbrio,
// alinhado com a Landing e Auth.

import { Link } from "react-router-dom";
import { PT } from "../theme/editorial";

// =============================================================================
// PageShell — outer wrapper (clean, sem doodles)
// =============================================================================
export function PageShell({ children, max = "max-w-5xl" }) {
    return (
        <div
            className="relative"
            style={{ background: PT.cream, minHeight: "100vh" }}
            data-testid="page-shell"
        >
            <div className={`${max} mx-auto relative z-10`}>
                {children}
            </div>
        </div>
    );
}

// =============================================================================
// Kicker — micro-label mono uppercase com dot pulse opcional
// =============================================================================
export function Kicker({ children, color = PT.red, dot = true, className = "" }) {
    return (
        <div className={`inline-flex items-center gap-1.5 ${className}`}>
            {dot && (
                <span className="relative flex h-1.5 w-1.5" aria-hidden>
                    <span className="absolute inline-flex h-full w-full rounded-full lusorae-pulse" style={{ background: color }} />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: color }} />
                </span>
            )}
            <span
                className="font-mono text-[10.5px] font-bold uppercase"
                style={{ color: "rgba(10,10,10,0.55)", letterSpacing: "0.20em" }}
            >
                {children}
            </span>
        </div>
    );
}

// =============================================================================
// PageHero — Lusorae Editorial masthead (sticky · ink strip · H1 massive)
// API legada: { icon, title, subtitle, badge, actions, children, accent }
// Compat: aceita `icon` mas não o mostra (estética premium não usa caixas com ícone).
// =============================================================================
export function PageHero({ title, subtitle, badge, actions, children, accent = PT.gold }) {
    return (
        <div className="relative" data-testid="page-hero">
            {/* DESKTOP MASTHEAD */}
            <div
                className="hidden lg:block sticky top-0 z-30 backdrop-blur"
                style={{
                    background: "rgba(255,255,255,0.92)",
                    borderBottom: "1px solid rgba(10,10,10,0.08)",
                }}
            >
                {/* Strip editorial preto (LUSORAE · X / LISBOA · HH:MM / EDIÇÃO · DD/MM)
                    REMOVIDO a pedido do utilizador. Mantemos só o hero limpo. */}
                <div className="px-7 pt-7 pb-5">
                    <div className="flex items-end justify-between gap-6 flex-wrap">
                        <div className="min-w-0 flex-1">
                            {badge && typeof badge === "string" && (
                                <p className="font-mono text-[10.5px] font-bold uppercase mb-3.5 inline-flex items-center gap-1.5" style={{ letterSpacing: "0.22em", color: "rgba(10,10,10,0.55)" }}>
                                    {badge}
                                </p>
                            )}
                            <h1
                                className="font-black tracking-[-0.045em] leading-[0.94]"
                                style={{ fontSize: "clamp(40px, 5vw, 56px)", color: PT.ink }}
                            >
                                {typeof title === "string" ? (
                                    <>{title}<span style={{ color: accent }}>.</span></>
                                ) : title}
                            </h1>
                            {subtitle && (
                                <p className="mt-3 text-[14.5px] lg:text-[15px] max-w-[52ch] leading-relaxed font-medium" style={{ color: "rgba(10,10,10,0.62)" }}>
                                    {subtitle}
                                </p>
                            )}
                        </div>
                        {actions && <div className="flex items-center gap-2 flex-shrink-0 pb-1">{actions}</div>}
                    </div>
                </div>
                {children}
            </div>

            {/* MOBILE MASTHEAD — compacto */}
            <div
                className="lg:hidden sticky z-30 backdrop-blur"
                style={{
                    top: "calc(var(--mobile-topbar-h, 0px) + var(--safe-top, 0px))",
                    background: "rgba(255,255,255,0.94)",
                    borderBottom: "1px solid rgba(10,10,10,0.08)",
                }}
            >
                <div className="px-4 pt-3 pb-3.5">
                    <h1 className="font-black tracking-[-0.03em] leading-[1.0]" style={{ fontSize: "clamp(22px, 6vw, 28px)", color: PT.ink }}>
                        {typeof title === "string" ? (
                            <>{title}<span style={{ color: accent }}>.</span></>
                        ) : title}
                    </h1>
                    {subtitle && (
                        <p className="mt-1.5 text-[12.5px] font-medium" style={{ color: "rgba(10,10,10,0.55)", lineHeight: 1.45 }}>
                            {subtitle}
                        </p>
                    )}
                </div>
                {children}
            </div>
        </div>
    );
}

// =============================================================================
// PageSection — overline + title + opcional CTA
// =============================================================================
export function PageSection({ overline, title, count, cta, ctaTo, children, className = "", accent = PT.azul }) {
    return (
        <section className={`mb-8 ${className}`} data-testid={`section-${(overline || title || "").toString().toLowerCase().replace(/\s+/g, "-")}`}>
            <div className="flex items-baseline justify-between mb-4">
                <div>
                    {overline && <Kicker color={accent} className="mb-1.5 block">{overline}</Kicker>}
                    <h2 className="font-black text-[20px] tracking-[-0.02em] flex items-baseline gap-2" style={{ color: PT.ink }}>
                        {title}
                        {typeof count === "number" && (
                            <span className="text-[12px] font-mono font-bold tabular-nums" style={{ color: "rgba(10,10,10,0.42)" }}>{count}</span>
                        )}
                    </h2>
                </div>
                {cta && ctaTo && (
                    <Link
                        to={ctaTo}
                        className="font-mono text-[11px] font-bold uppercase opacity-65 hover:opacity-100 transition"
                        style={{ color: PT.ink, letterSpacing: "0.18em" }}
                    >
                        {cta} →
                    </Link>
                )}
            </div>
            {children}
        </section>
    );
}

// =============================================================================
// Grid — responsivo
// =============================================================================
export function Grid({ cols = 2, gap = 3, children, className = "" }) {
    const colMap = {
        1: "grid-cols-1",
        2: "grid-cols-1 sm:grid-cols-2",
        3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
        4: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
        5: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5",
    };
    const gapMap = { 2: "gap-2", 3: "gap-3", 4: "gap-4", 5: "gap-5", 6: "gap-6" };
    return (
        <div className={`grid ${colMap[cols] || colMap[2]} ${gapMap[gap] || gapMap[3]} ${className}`}>
            {children}
        </div>
    );
}

// =============================================================================
// FilterBar — sticky pill row (clean)
// =============================================================================
export function FilterBar({ children, className = "" }) {
    return (
        <div
            className={`sticky top-[calc(var(--mobile-topbar-h,64px))] lg:top-2 z-10 -mx-4 lg:-mx-6 px-4 lg:px-6 py-3 backdrop-blur mb-5 flex items-center gap-2 overflow-x-auto scrollbar-hide ${className}`}
            style={{
                background: "rgba(255,255,255,0.92)",
                borderBottom: "1px solid rgba(10,10,10,0.06)",
            }}
            data-testid="filter-bar"
        >
            {children}
        </div>
    );
}

// =============================================================================
// Chip — pill clean
// =============================================================================
export function Chip({ active, onClick, icon: Icon, children, testid, count }) {
    return (
        <button
            onClick={onClick}
            data-testid={testid}
            className="flex-shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-[12px] font-bold transition-all duration-200"
            style={{
                background: active ? PT.ink : "#fff",
                color: active ? "#fff" : PT.ink,
                border: active ? `1px solid ${PT.ink}` : "1px solid rgba(10,10,10,0.10)",
                borderRadius: 999,
                boxShadow: active ? "0 6px 14px -6px rgba(10,10,10,0.35)" : "none",
                letterSpacing: "-0.005em",
            }}
        >
            {Icon && <Icon size={12} strokeWidth={2.2} />}
            <span>{children}</span>
            {typeof count === "number" && (
                <span className="text-[10.5px] tabular-nums opacity-70 font-mono">{count}</span>
            )}
        </button>
    );
}

// =============================================================================
// Empty — clean editorial empty state (sem caixas amarelas/cinzentas)
// =============================================================================
export function Empty({ icon: Icon, title, body, cta, ctaTo, ctaOnClick }) {
    return (
        <div
            className="py-14 px-6 text-center mx-4 lg:mx-7 mt-6 mb-10"
            data-testid="empty-state"
            style={{
                background: "#fff",
                border: "1px solid rgba(10,10,10,0.08)",
                borderRadius: 24,
                boxShadow: "0 1px 2px rgba(10,10,10,0.04), 0 22px 44px -22px rgba(10,10,10,0.12), 0 8px 22px -12px rgba(10,10,10,0.10)",
            }}
        >
            {Icon && (
                <div
                    className="w-20 h-20 mx-auto mb-5 grid place-items-center"
                    style={{
                        background: "#fff",
                        color: PT.ink,
                        border: "1px solid rgba(10,10,10,0.08)",
                        boxShadow: "0 1px 2px rgba(10,10,10,0.04), 0 10px 30px -12px rgba(10,10,10,0.18)",
                        borderRadius: 999,
                    }}
                >
                    <Icon size={26} strokeWidth={2.0} />
                </div>
            )}
            <p className="font-mono font-bold uppercase mb-2" style={{ fontSize: 10.5, letterSpacing: "0.22em", color: "rgba(10,10,10,0.42)" }}>
                Nada por aqui
            </p>
            <h3 className="font-black tracking-[-0.025em] leading-tight mb-2" style={{ fontSize: "clamp(20px, 2.8vw, 26px)", color: PT.ink }}>{title}</h3>
            {body && <p className="text-[13.5px] max-w-md mx-auto leading-relaxed font-medium mt-3" style={{ color: "rgba(10,10,10,0.6)" }}>{body}</p>}
            {cta && (ctaTo ? (
                <Link
                    to={ctaTo}
                    className="inline-block mt-6 px-5 h-11 leading-[44px] text-[12.5px] font-black uppercase rounded-full transition hover:translate-y-[-1px]"
                    style={{
                        background: PT.ink,
                        color: "#fff",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10), 0 12px 28px -10px rgba(10,10,10,0.40)",
                        letterSpacing: "0.14em",
                    }}
                    data-testid="empty-state-cta"
                >
                    {cta}
                </Link>
            ) : (
                <button
                    onClick={ctaOnClick}
                    className="mt-6 px-5 h-11 text-[12.5px] font-black uppercase rounded-full transition hover:translate-y-[-1px]"
                    style={{
                        background: PT.ink,
                        color: "#fff",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10), 0 12px 28px -10px rgba(10,10,10,0.40)",
                        letterSpacing: "0.14em",
                    }}
                    data-testid="empty-state-cta"
                >
                    {cta}
                </button>
            ))}
        </div>
    );
}
