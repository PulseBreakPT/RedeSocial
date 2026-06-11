// Shared page primitives — clean editorial aesthetic.
// Substitui o estilo fanzine "magazine" por um sistema editorial sóbrio,
// alinhado com a Landing e Auth.

import { Link } from "react-router-dom";
import { PT } from "../pages/auth/AuthDecor";

// =============================================================================
// PageShell — outer wrapper (clean, sem doodles)
// =============================================================================
export function PageShell({ children, max = "max-w-5xl" }) {
    return (
        <div
            className="relative"
            style={{ background: "#FFFFFF", minHeight: "100vh" }}
            data-testid="page-shell"
        >
            <div className={`${max} mx-auto px-4 lg:px-6 py-5 lg:py-7 relative z-10`}>
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
// PageHero — header editorial limpo
// =============================================================================
export function PageHero({ icon: Icon, title, subtitle, badge, actions, children, accent = PT.red }) {
    return (
        <div className="mb-7 lg:mb-9 relative" data-testid="page-hero">
            <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                    {badge && <Kicker color={accent} className="mb-3">{badge}</Kicker>}
                    <h1
                        className="font-black tracking-[-0.035em] leading-[0.98] flex items-center gap-3"
                        style={{ fontSize: "clamp(30px, 4vw, 44px)", color: PT.ink }}
                    >
                        {Icon && (
                            <span
                                className="inline-flex items-center justify-center shrink-0"
                                style={{
                                    width: 42, height: 42,
                                    background: "#fff",
                                    border: "1px solid rgba(10,10,10,0.10)",
                                    borderRadius: 12,
                                    boxShadow: "0 1px 2px rgba(10,10,10,0.04), 0 6px 14px -6px rgba(10,10,10,0.08)",
                                }}
                            >
                                <Icon size={22} strokeWidth={2} style={{ color: PT.ink }} />
                            </span>
                        )}
                        <span>{title}</span>
                    </h1>
                    {subtitle && (
                        <p
                            className="mt-3 text-[14.5px] lg:text-[15.5px] max-w-2xl leading-relaxed font-medium"
                            style={{ color: "rgba(10,10,10,0.62)" }}
                        >
                            {subtitle}
                        </p>
                    )}
                </div>
                {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
            </div>
            {children}
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
// Empty — clean editorial empty state
// =============================================================================
export function Empty({ icon: Icon, title, body, cta, ctaTo, ctaOnClick }) {
    return (
        <div
            className="py-14 px-6 text-center"
            data-testid="empty-state"
            style={{
                background: "#fff",
                border: "1px solid rgba(10,10,10,0.08)",
                borderRadius: 24,
                boxShadow: "0 1px 0 rgba(255,255,255,0.6) inset, 0 18px 40px -22px rgba(10,10,10,0.10)",
            }}
        >
            {Icon && (
                <div
                    className="w-16 h-16 mx-auto mb-5 grid place-items-center"
                    style={{
                        background: "rgba(10,10,10,0.04)",
                        color: PT.ink,
                        borderRadius: 16,
                    }}
                >
                    <Icon size={26} strokeWidth={1.8} />
                </div>
            )}
            <h3 className="font-black text-[19px] tracking-[-0.02em] mb-2" style={{ color: PT.ink }}>{title}</h3>
            {body && <p className="text-[14px] max-w-md mx-auto leading-relaxed font-medium" style={{ color: "rgba(10,10,10,0.6)" }}>{body}</p>}
            {cta && (ctaTo ? (
                <Link
                    to={ctaTo}
                    className="inline-block mt-6 px-5 py-3 text-[13px] font-bold rounded-full transition-all duration-200 hover:translate-y-[-1px]"
                    style={{
                        background: `linear-gradient(180deg, #1f1f1f 0%, ${PT.ink} 100%)`,
                        color: "#fff",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12), 0 12px 24px -10px rgba(10,10,10,0.35)",
                        letterSpacing: "-0.005em",
                    }}
                    data-testid="empty-state-cta"
                >
                    {cta}
                </Link>
            ) : (
                <button
                    onClick={ctaOnClick}
                    className="mt-6 px-5 py-3 text-[13px] font-bold rounded-full transition-all duration-200 hover:translate-y-[-1px]"
                    style={{
                        background: `linear-gradient(180deg, #1f1f1f 0%, ${PT.ink} 100%)`,
                        color: "#fff",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12), 0 12px 24px -10px rgba(10,10,10,0.35)",
                        letterSpacing: "-0.005em",
                    }}
                    data-testid="empty-state-cta"
                >
                    {cta}
                </button>
            ))}
        </div>
    );
}
