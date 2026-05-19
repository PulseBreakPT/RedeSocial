// Shared page primitives — consistent vertical rhythm, hierarchy, grids.
// Use these everywhere to kill the "endless list scroll" pattern.

import { Link } from "react-router-dom";

/** Outer shell with consistent padding + max width. */
export function PageShell({ children, max = "max-w-5xl" }) {
    return (
        <div className={`${max} mx-auto px-4 lg:px-6 py-5 lg:py-7`} data-testid="page-shell">
            {children}
        </div>
    );
}

/** Hero header: title, subtitle, icon, actions. Stronger hierarchy than PageHeader.
 *  Editorial-by-default: o título usa Fraunces italic (serif editorial) com
 *  optical sizing display. Para casos onde queremos voltar ao sans-serif
 *  Inter (ex: títulos com números grandes, dashboards), passar `editorial={false}`.
 */
export function PageHero({ icon: Icon, title, subtitle, badge, actions, children, editorial = true }) {
    const titleClass = editorial
        ? "editorial-hero flex items-center gap-3 text-black"
        : "font-display text-3xl lg:text-4xl font-bold tracking-tight leading-none flex items-center gap-3 text-black";
    return (
        <div className="mb-6 lg:mb-8" data-testid="page-hero">
            <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                    {badge && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/[0.04] text-[10px] font-mono uppercase tracking-[0.2em] text-black/55 mb-2">
                            {badge}
                        </span>
                    )}
                    <h1 className={titleClass}>
                        {Icon && <Icon size={28} strokeWidth={1.6} className="text-black/65 not-italic shrink-0" style={{ fontStyle: "normal" }} />}
                        <span>{title}</span>
                    </h1>
                    {subtitle && (
                        <p className="mt-2 text-[14px] lg:text-[15px] font-mono text-black/55 max-w-2xl leading-relaxed">
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

/** Section with overline + title + optional cta link. */
export function PageSection({ overline, title, count, cta, ctaTo, children, className = "" }) {
    return (
        <section className={`mb-7 ${className}`} data-testid={`section-${(overline || title || "").toString().toLowerCase().replace(/\s+/g, "-")}`}>
            <div className="flex items-baseline justify-between mb-3">
                <div>
                    {overline && <span className="block type-overline text-black/45 mb-0.5">{overline}</span>}
                    <h2 className="font-heading font-bold text-[19px] tracking-tight text-black flex items-baseline gap-2">
                        {title}
                        {typeof count === "number" && (
                            <span className="text-xs font-mono text-black/40 font-normal">{count}</span>
                        )}
                    </h2>
                </div>
                {cta && ctaTo && (
                    <Link to={ctaTo} className="text-[12px] font-mono text-black/55 hover:text-black underline-offset-2 hover:underline">
                        {cta} →
                    </Link>
                )}
            </div>
            {children}
        </section>
    );
}

/** Responsive grid 1/2/3/4 col. Auto-handles gap. */
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

/** Sticky filter bar that sits below the hero. Use for tabs/segmented controls. */
export function FilterBar({ children, className = "" }) {
    return (
        <div
            className={`sticky top-[calc(var(--mobile-topbar-h,64px))] lg:top-2 z-10 -mx-4 lg:-mx-6 px-4 lg:px-6 py-2.5 bg-paper/95 backdrop-blur border-y border-black/[0.06] mb-5 flex items-center gap-2 overflow-x-auto scrollbar-hide ${className}`}
            data-testid="filter-bar"
        >
            {children}
        </div>
    );
}

/** Pill chip used inside FilterBar — controlled. */
export function Chip({ active, onClick, icon: Icon, children, testid, count }) {
    return (
        <button
            onClick={onClick}
            data-testid={testid}
            className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-mono transition border ${
                active
                    ? "bg-black text-white border-black"
                    : "bg-white text-black/65 border-black/10 hover:border-black/30 hover:text-black"
            }`}
        >
            {Icon && <Icon size={11} strokeWidth={2} />}
            <span>{children}</span>
            {typeof count === "number" && (
                <span className={`text-[10px] tabular-nums ${active ? "text-white/70" : "text-black/40"}`}>{count}</span>
            )}
        </button>
    );
}

/** Empty state with icon + title + body + CTA. */
export function Empty({ icon: Icon, title, body, cta, ctaTo, ctaOnClick }) {
    return (
        <div className="rounded-2xl border border-black/[0.06] bg-white/50 backdrop-blur-sm py-14 px-6 text-center" data-testid="empty-state">
            {Icon && (
                <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-black/[0.04] grid place-items-center">
                    <Icon size={22} strokeWidth={1.4} className="text-black/55" />
                </div>
            )}
            <h3 className="font-heading font-bold text-[17px] text-black mb-1">{title}</h3>
            {body && <p className="text-sm font-mono text-black/50 max-w-sm mx-auto">{body}</p>}
            {cta && (ctaTo ? (
                <Link
                    to={ctaTo}
                    className="inline-block mt-4 px-4 py-2 rounded-full bg-black text-white text-xs font-mono hover:bg-black/85 transition"
                    data-testid="empty-state-cta"
                >
                    {cta}
                </Link>
            ) : (
                <button
                    onClick={ctaOnClick}
                    className="mt-4 px-4 py-2 rounded-full bg-black text-white text-xs font-mono hover:bg-black/85 transition"
                    data-testid="empty-state-cta"
                >
                    {cta}
                </button>
            ))}
        </div>
    );
}
