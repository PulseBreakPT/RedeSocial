// =============================================================================
// LUSORAE EDITORIAL — Primitivas partilhadas (Sticker, StampCircle, PosterCard,
// Kicker, Highlight). Componentes limpos do design system editorial.
// Design System: LUSORAE EDITORIAL — ver /src/theme/editorial.js
// =============================================================================
import { PT, ED } from "../../theme/editorial";

// ── Sticker — pill compacta uppercase (badge editorial) ──────────────────────
export function Sticker({ children, bg = PT.gold, color = PT.ink, rotate, className = "", style = {}, ...rest }) {
    void rotate; // API legacy mantida — rotação não faz parte do design editorial
    return (
        <div
            className={`inline-flex items-center justify-center text-center font-bold uppercase ${className}`}
            style={{
                background: bg,
                color,
                padding: "6px 12px",
                borderRadius: 999,
                letterSpacing: "0.14em",
                fontSize: 11,
                lineHeight: 1,
                whiteSpace: "nowrap",
                ...style,
            }}
            {...rest}
        >
            {children}
        </div>
    );
}

// ── StampCircle — selo circular sólido com sombra difusa ─────────────────────
export function StampCircle({ children, size = 86, bg = PT.red, color = "#fff", rotate, style = {} }) {
    void rotate;
    return (
        <div
            className="flex items-center justify-center text-center font-bold uppercase"
            style={{
                width: size,
                height: size,
                background: bg,
                color,
                borderRadius: "50%",
                letterSpacing: "0.14em",
                fontSize: 11,
                lineHeight: 1.1,
                padding: 8,
                boxShadow: "0 8px 20px -8px rgba(10,10,10,0.30)",
                ...style,
            }}
        >
            {children}
        </div>
    );
}

// ── PosterCard — card editorial branco com hairline + sombra difusa ──────────
export function PosterCard({ children, bg = "#fff", color = PT.ink, rotate, shadow, className = "", style = {}, ...rest }) {
    void rotate; void shadow;
    return (
        <div
            className={className}
            style={{
                background: bg,
                color,
                border: ED.hairline,
                borderRadius: 16,
                boxShadow: ED.cardShadow,
                padding: "18px 20px",
                ...style,
            }}
            {...rest}
        >
            {children}
        </div>
    );
}

// ── Kicker — micro-label mono uppercase (rubrica editorial) ──────────────────
export function Kicker({ children, color = PT.red, dot = false, className = "" }) {
    return (
        <p className={`inline-flex items-center gap-1.5 font-mono font-bold uppercase ${className}`} style={{ fontSize: 11, letterSpacing: "0.20em", color: ED.inkMuted }}>
            {dot && (
                <span className="relative flex h-1.5 w-1.5" aria-hidden>
                    <span className="absolute inline-flex h-full w-full rounded-full lusorae-pulse" style={{ background: color }} />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: color }} />
                </span>
            )}
            {children}
        </p>
    );
}

// ── Highlight — realce suave atrás de palavras-chave (como na landing) ───────
export function Highlight({ children, color = PT.gold, rotate, style = {} }) {
    void rotate;
    return (
        <span className="relative inline-block" style={style}>
            <span
                className="absolute pointer-events-none"
                aria-hidden
                style={{
                    left: -2, right: -2, bottom: "0.02em", height: "0.42em",
                    background: `${color}4D`,
                    zIndex: 0,
                    borderRadius: 2,
                }}
            />
            <span className="relative z-10">{children}</span>
        </span>
    );
}
