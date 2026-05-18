import { useMemo } from "react";

/**
 * Termómetro Social — pure presentation chip.
 *
 * Props:
 *   temperature: { score, state, label, emoji, velocity } OR
 *     score, state, label, emoji, velocity (individual props).
 *   variant: "chip" (default) · "inline" · "dot"
 *   size:    "xs" (default) · "sm" · "md"
 *   showLabel: boolean (default false on chip/dot, true on inline)
 *   onClick: optional click handler
 *   className: extra Tailwind classes for the wrapper
 *
 * Subtle by design: just a small badge that conveys energy at a glance.
 * No dashboards, no big gauges.
 */

// State → muted accent tokens. Kept inside the IDE-paper palette so the
// chip never looks like a sticker glued on top of the design system.
const STATE_STYLES = {
    frio: {
        bg: "bg-sky-50/80",
        text: "text-sky-700",
        ring: "ring-sky-100",
        dot: "bg-sky-300",
        pulse: false,
    },
    morno: {
        bg: "bg-stone-100",
        text: "text-stone-700",
        ring: "ring-stone-200",
        dot: "bg-stone-400",
        pulse: false,
    },
    quente: {
        bg: "bg-amber-50",
        text: "text-amber-800",
        ring: "ring-amber-100",
        dot: "bg-amber-400",
        pulse: false,
    },
    em_brasa: {
        bg: "bg-orange-50",
        text: "text-orange-700",
        ring: "ring-orange-100",
        dot: "bg-orange-500",
        pulse: true,
    },
    a_ferver: {
        bg: "bg-rose-50",
        text: "text-rose-700",
        ring: "ring-rose-100",
        dot: "bg-rose-500",
        pulse: true,
    },
};

const SIZE_STYLES = {
    xs: { wrap: "text-[10px] px-1.5 py-0.5 gap-1", dot: "w-1.5 h-1.5" },
    sm: { wrap: "text-[11px] px-2 py-0.5 gap-1.5", dot: "w-2 h-2" },
    md: { wrap: "text-[13px] px-2.5 py-1 gap-1.5", dot: "w-2.5 h-2.5" },
};

function pickStyle(state) {
    return STATE_STYLES[state] || STATE_STYLES.morno;
}

export function Thermometer({
    temperature,
    score,
    state,
    label,
    emoji,
    velocity,
    variant = "chip",
    size = "xs",
    showLabel = false,
    onClick,
    className = "",
    title,
    testid,
}) {
    const t = temperature || { score, state, label, emoji, velocity };
    const safeScore = Math.max(0, Math.min(100, Math.round(t.score ?? 0)));
    const st = pickStyle(t.state);
    const sz = SIZE_STYLES[size] || SIZE_STYLES.xs;
    const interactive = !!onClick;

    const tooltip = useMemo(() => {
        if (title) return title;
        const v = Number.isFinite(t.velocity) ? t.velocity : 0;
        const arrow = v > 0 ? "↑" : v < 0 ? "↓" : "·";
        return `${t.label || "—"} · ${safeScore}/100 · ${arrow}${Math.abs(v)}%`;
    }, [t, safeScore, title]);

    const Tag = interactive ? "button" : "span";
    const baseTestid = testid || "thermometer";

    if (variant === "dot") {
        return (
            <Tag
                type={interactive ? "button" : undefined}
                onClick={onClick}
                title={tooltip}
                aria-label={tooltip}
                data-testid={baseTestid}
                data-temp-state={t.state}
                data-temp-score={safeScore}
                className={`inline-block rounded-full ring-1 ${st.ring} ${st.dot} ${sz.dot} ${
                    st.pulse ? "anim-pulse-soft" : ""
                } ${interactive ? "cursor-pointer hover:scale-110 transition-transform" : ""} ${className}`}
            />
        );
    }

    const contentChip = (
        <>
            <span aria-hidden className="leading-none">
                {t.emoji || "🌡️"}
            </span>
            <span className="font-mono tabular-nums leading-none">{safeScore}</span>
            {(showLabel || variant === "inline") && t.label && (
                <span className="font-medium leading-none">{t.label}</span>
            )}
        </>
    );

    return (
        <Tag
            type={interactive ? "button" : undefined}
            onClick={onClick}
            title={tooltip}
            aria-label={tooltip}
            data-testid={baseTestid}
            data-temp-state={t.state}
            data-temp-score={safeScore}
            className={`inline-flex items-center rounded-full ring-1 ${st.ring} ${st.bg} ${st.text} ${sz.wrap} ${
                st.pulse ? "anim-pulse-soft" : ""
            } ${interactive ? "cursor-pointer hover:ring-2 transition-all tap-shrink" : ""} ${className}`}
        >
            {contentChip}
        </Tag>
    );
}

export default Thermometer;
