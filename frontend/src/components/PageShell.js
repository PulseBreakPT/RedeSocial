// Shared page primitives — fanzine PT aesthetic.
// Used by Communities, Drafts, Scheduled, Visitors and any page that wants
// the consistent vertical rhythm + magazine-style hierarchy.

import { Link } from "react-router-dom";
import {
    PT, Kicker, AuthStyles,
    DoodleStar, DoodleSparkles, DoodleScribble, DoodleSpiral,
    DoodleCross, GiantAsterisk,
} from "../pages/auth/AuthDecor";

/** Outer shell — fanzine PT background + doodles + content wrapper. */
export function PageShell({ children, max = "max-w-5xl" }) {
    return (
        <div
            className="relative"
            style={{ background: "#FFFFFF", minHeight: "100vh" }}
            data-testid="page-shell"
        >
            {/* Doodles decorativos */}
            <div className="absolute -top-10 -right-10 pointer-events-none opacity-[0.05] z-0 hidden lg:block" aria-hidden>
                <GiantAsterisk color={PT.red} size={280} rotate={-12} />
            </div>
            <div className="absolute top-28 -right-2 sm:right-4 pointer-events-none block opacity-50 scale-[0.55] sm:scale-100 sm:opacity-80 origin-top-right z-0 hidden md:block" aria-hidden>
                <DoodleStar color={PT.gold} size={42} rotate={14} />
            </div>
            <div className="absolute top-[420px] -left-3 sm:left-2 pointer-events-none block opacity-50 scale-[0.55] sm:scale-100 sm:opacity-80 origin-left z-0 hidden lg:block" aria-hidden>
                <DoodleScribble color={PT.azul} w={120} h={48} style={{ transform: "rotate(-6deg)" }} />
            </div>
            <div className="absolute top-[760px] -right-2 sm:right-3 pointer-events-none block opacity-50 scale-[0.55] sm:scale-100 sm:opacity-80 origin-right z-0 hidden lg:block" aria-hidden>
                <DoodleSpiral color={PT.gold} size={56} rotate={12} />
            </div>
            <div className="absolute bottom-40 -right-2 sm:right-4 pointer-events-none block opacity-50 scale-[0.55] sm:scale-100 sm:opacity-80 origin-bottom-right z-0 hidden lg:block" aria-hidden>
                <DoodleCross color={PT.green} size={28} rotate={18} />
            </div>

            <div className={`${max} mx-auto px-4 lg:px-6 py-5 lg:py-7 relative z-10`}>
                {children}
            </div>
            <AuthStyles />
        </div>
    );
}

/** Hero header — estilo fanzine PT. */
export function PageHero({ icon: Icon, title, subtitle, badge, actions, children }) {
    return (
        <div className="mb-6 lg:mb-8 relative" data-testid="page-hero">
            <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                    {badge && (
                        <Kicker color={PT.red} className="mb-2 inline-flex items-center gap-1.5">
                            // {badge}
                        </Kicker>
                    )}
                    <h1
                        className="font-black tracking-[-0.03em] leading-[0.98] flex items-center gap-3"
                        style={{ fontSize: "clamp(28px, 4vw, 42px)", color: PT.ink }}
                    >
                        {Icon && (
                            <span
                                className="inline-flex items-center justify-center shrink-0"
                                style={{
                                    width: 44, height: 44,
                                    background: PT.gold,
                                    border: `2.5px solid ${PT.ink}`,
                                    boxShadow: `3px 3px 0 ${PT.ink}`,
                                    borderRadius: 10,
                                    transform: "rotate(-3deg)",
                                }}
                            >
                                <Icon size={22} strokeWidth={2.2} style={{ color: PT.ink }} />
                            </span>
                        )}
                        <span>{title}</span>
                    </h1>
                    {subtitle && (
                        <p
                            className="mt-3 text-[14px] lg:text-[15px] max-w-2xl leading-relaxed font-medium"
                            style={{ color: "rgba(10,10,10,0.65)" }}
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

/** Section with kicker + title. */
export function PageSection({ overline, title, count, cta, ctaTo, children, className = "" }) {
    return (
        <section className={`mb-7 ${className}`} data-testid={`section-${(overline || title || "").toString().toLowerCase().replace(/\s+/g, "-")}`}>
            <div className="flex items-baseline justify-between mb-3">
                <div>
                    {overline && (
                        <Kicker color={PT.azul} className="mb-1 block">
                            // {overline}
                        </Kicker>
                    )}
                    <h2 className="font-black text-[20px] tracking-tight flex items-baseline gap-2" style={{ color: PT.ink }}>
                        {title}
                        {typeof count === "number" && (
                            <span className="text-xs font-mono font-bold tabular-nums" style={{ color: "rgba(10,10,10,0.45)" }}>{count}</span>
                        )}
                    </h2>
                </div>
                {cta && ctaTo && (
                    <Link
                        to={ctaTo}
                        className="text-[12px] font-mono font-bold uppercase tracking-[0.06em] underline-offset-2 hover:underline"
                        style={{ color: PT.red }}
                    >
                        {cta} →
                    </Link>
                )}
            </div>
            {children}
        </section>
    );
}

/** Responsive grid 1/2/3/4 col. */
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

/** Sticky filter bar — fanzine PT styling. */
export function FilterBar({ children, className = "" }) {
    return (
        <div
            className={`sticky top-[calc(var(--mobile-topbar-h,64px))] lg:top-2 z-10 -mx-4 lg:-mx-6 px-4 lg:px-6 py-2.5 backdrop-blur mb-5 flex items-center gap-2 overflow-x-auto scrollbar-hide ${className}`}
            style={{
                background: "rgba(255,255,255,0.94)",
                borderTop: `2px solid ${PT.ink}`,
                borderBottom: `2px solid ${PT.ink}`,
            }}
            data-testid="filter-bar"
        >
            {children}
        </div>
    );
}

/** Pill chip used inside FilterBar — PT style. */
export function Chip({ active, onClick, icon: Icon, children, testid, count }) {
    return (
        <button
            onClick={onClick}
            data-testid={testid}
            className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-black uppercase transition"
            style={{
                background: active ? PT.ink : "#fff",
                color: active ? PT.gold : PT.ink,
                border: `2px solid ${PT.ink}`,
                borderRadius: 999,
                boxShadow: active ? `2px 2px 0 ${PT.red}` : `2px 2px 0 ${PT.ink}`,
                letterSpacing: "0.04em",
            }}
        >
            {Icon && <Icon size={11} strokeWidth={2.2} />}
            <span>{children}</span>
            {typeof count === "number" && (
                <span className="text-[10px] tabular-nums opacity-80">{count}</span>
            )}
        </button>
    );
}

/** Empty state — fanzine PT styling. */
export function Empty({ icon: Icon, title, body, cta, ctaTo, ctaOnClick }) {
    return (
        <div
            className="py-14 px-6 text-center"
            data-testid="empty-state"
            style={{
                background: "#fff",
                border: `3px solid ${PT.ink}`,
                boxShadow: `5px 5px 0 ${PT.gold}`,
                borderRadius: 24,
            }}
        >
            {Icon && (
                <div
                    className="w-16 h-16 mx-auto mb-4 grid place-items-center"
                    style={{
                        background: PT.gold,
                        color: PT.ink,
                        border: `2.5px solid ${PT.ink}`,
                        boxShadow: `3px 3px 0 ${PT.ink}`,
                        borderRadius: 12,
                        transform: "rotate(-3deg)",
                    }}
                >
                    <Icon size={24} strokeWidth={2.2} />
                </div>
            )}
            <h3 className="font-black text-[18px] mb-2" style={{ color: PT.ink }}>{title}</h3>
            {body && <p className="text-[13.5px] max-w-sm mx-auto leading-relaxed font-medium" style={{ color: "rgba(10,10,10,0.62)" }}>{body}</p>}
            {cta && (ctaTo ? (
                <Link
                    to={ctaTo}
                    className="inline-block mt-5 px-4 py-2.5 text-[12px] font-black uppercase"
                    style={{
                        background: PT.red,
                        color: "#fff",
                        border: `2.5px solid ${PT.ink}`,
                        borderRadius: 999,
                        boxShadow: `3px 3px 0 ${PT.ink}`,
                        letterSpacing: "0.06em",
                    }}
                    data-testid="empty-state-cta"
                >
                    {cta}
                </Link>
            ) : (
                <button
                    onClick={ctaOnClick}
                    className="mt-5 px-4 py-2.5 text-[12px] font-black uppercase"
                    style={{
                        background: PT.red,
                        color: "#fff",
                        border: `2.5px solid ${PT.ink}`,
                        borderRadius: 999,
                        boxShadow: `3px 3px 0 ${PT.ink}`,
                        letterSpacing: "0.06em",
                    }}
                    data-testid="empty-state-cta"
                >
                    {cta}
                </button>
            ))}
        </div>
    );
}
