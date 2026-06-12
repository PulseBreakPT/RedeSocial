// =============================================================================
// LUSORAE EDITORIAL — Button system (single source of truth)
// Variants: primary (ink) · gold · secondary (white outline) · ghost-dark
// Sizes: sm (h-9, 12px) · md (h-11, 12.5px) · lg (h-12, 13px)
// All buttons share: pill (radius 999), uppercase, font-black, mono spacing,
// hover translateY(-1px), active scale(0.98).
// =============================================================================
import { PT } from "../../theme/editorial";

const SIZE_MAP = {
    sm: { h: 36, fs: 11.5, px: 14, gap: 6,  ls: "0.14em" },
    md: { h: 44, fs: 12.5, px: 18, gap: 7,  ls: "0.14em" },
    lg: { h: 48, fs: 13,   px: 22, gap: 8,  ls: "0.14em" },
};

function styleFor(variant) {
    switch (variant) {
        case "gold":
            return {
                background: PT.gold,
                color: PT.ink,
                border: "1px solid transparent",
                boxShadow: "0 1px 2px rgba(10,10,10,0.06), 0 12px 28px -10px rgba(255,204,41,0.55)",
            };
        case "secondary":
            return {
                background: "#fff",
                color: PT.ink,
                border: "1px solid rgba(10,10,10,0.10)",
                boxShadow: "0 1px 2px rgba(10,10,10,0.04)",
            };
        case "ghost-dark":
            return {
                background: "transparent",
                color: "#fff",
                border: "1.5px solid rgba(255,255,255,0.30)",
                boxShadow: "none",
            };
        case "danger":
            return {
                background: PT.red,
                color: "#fff",
                border: "1px solid transparent",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10), 0 12px 28px -10px rgba(200,16,46,0.40)",
            };
        case "primary":
        default:
            return {
                background: PT.ink,
                color: "#fff",
                border: "1px solid transparent",
                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10), 0 12px 28px -10px rgba(10,10,10,0.40)",
            };
    }
}

export function EditorialButton({
    variant = "primary",
    size = "md",
    children,
    block = false,
    className = "",
    style = {},
    disabled = false,
    icon: Icon = null,
    iconAfter: IconAfter = null,
    iconSize,
    type = "button",
    ...rest
}) {
    const s = SIZE_MAP[size] || SIZE_MAP.md;
    const base = styleFor(variant);
    const iSize = iconSize || (size === "lg" ? 16 : size === "sm" ? 13 : 14);

    return (
        <button
            type={type}
            disabled={disabled}
            className={`inline-flex items-center justify-center font-black uppercase transition-transform duration-150 active:scale-[0.98] ${disabled ? "opacity-40 cursor-not-allowed" : "hover:translate-y-[-1px]"} ${block ? "w-full" : ""} ${className}`}
            style={{
                ...base,
                height: s.h,
                paddingInline: s.px,
                fontSize: s.fs,
                letterSpacing: s.ls,
                borderRadius: 999,
                gap: s.gap,
                lineHeight: 1,
                whiteSpace: "nowrap",
                ...style,
            }}
            {...rest}
        >
            {Icon && <Icon size={iSize} strokeWidth={2.4} />}
            {children}
            {IconAfter && <IconAfter size={iSize} strokeWidth={2.4} />}
        </button>
    );
}

// ── Pill kicker label · usada para tags/badges editoriais ────────────────────
export function EditorialTag({ children, tone = "neutral", className = "", style = {} }) {
    const tones = {
        neutral: { bg: "#fff",                  color: PT.ink,                       border: "1px solid rgba(10,10,10,0.10)" },
        ink:     { bg: PT.ink,                  color: "#fff",                       border: "1px solid transparent" },
        gold:    { bg: "rgba(255,204,41,0.18)", color: PT.ink,                       border: "1px solid rgba(255,204,41,0.45)" },
        azul:    { bg: "rgba(0,63,135,0.08)",   color: PT.azul,                      border: "1px solid rgba(0,63,135,0.25)" },
        red:     { bg: "rgba(200,16,46,0.08)",  color: PT.red,                       border: "1px solid rgba(200,16,46,0.25)" },
        green:   { bg: "rgba(4,106,56,0.10)",   color: PT.green,                     border: "1px solid rgba(4,106,56,0.30)" },
    };
    const t = tones[tone] || tones.neutral;
    return (
        <span
            className={`inline-flex items-center font-mono font-bold uppercase ${className}`}
            style={{
                background: t.bg,
                color: t.color,
                border: t.border,
                padding: "3px 9px",
                borderRadius: 999,
                fontSize: 10,
                letterSpacing: "0.18em",
                lineHeight: 1,
                ...style,
            }}
        >
            {children}
        </span>
    );
}
