/* =============================================================
   Shared primitives for the Definições module — FANZINE PT.
   Bordas grossas, sombras offset ink, paleta PT, eyebrows mono `//`.
   ============================================================= */
import { ChevronRight } from "lucide-react";
import { PT } from "../../theme/editorial";

/* SectionHeader — eyebrow mono PT + heading + lede, full 12-col row */
export function SectionHeader({ overline, title, desc, action, idx }) {
    return (
        <div className="lg:col-span-12 flex items-end justify-between gap-4 flex-wrap mt-3 first:mt-0">
            <div className="min-w-0 flex items-start gap-3">
                {typeof idx === "number" && (
                    <span
                        className="hidden lg:grid place-items-center w-8 h-8 shrink-0 mt-1 font-mono font-black tabular-nums"
                        style={{
                            background: PT.ink, color: PT.gold,
                            border: "1px solid rgba(10,10,10,0.10)",
                            boxShadow: "0 1px 2px rgba(10,10,10,0.05), 0 8px 20px -10px rgba(10,10,10,0.15)",
                            borderRadius: 8,
                            fontSize: 10.5,
                            letterSpacing: "0.08em",
                        }}
                        aria-hidden
                    >
                        {String(idx).padStart(2, "0")}
                    </span>
                )}
                <div className="min-w-0">
                    <p
                        className="font-mono font-black uppercase mb-1.5"
                        style={{ fontSize: 10.5, letterSpacing: "0.16em", color: PT.red }}
                    >
                        // {overline}
                    </p>
                    <h3
                        className="font-black tracking-tight leading-tight"
                        style={{ fontSize: 19, color: PT.ink }}
                    >
                        {title}
                    </h3>
                    {desc && (
                        <p
                            className="text-[13px] leading-relaxed mt-1.5 max-w-xl font-medium"
                            style={{ color: "rgba(10,10,10,0.62)" }}
                        >
                            {desc}
                        </p>
                    )}
                </div>
            </div>
            {action}
        </div>
    );
}

/* ToggleRow — fanzine switch card used across all tabs */
export function ToggleRow({ label, sub, k, prefs, setPref, accent }) {
    const checked = !!prefs[k];
    return (
        <label
            className="flex items-center justify-between gap-3 p-4 cursor-pointer tap-shrink transition-transform hover:-translate-y-0.5"
            style={{
                background: "#fff",
                border: "1px solid rgba(10,10,10,0.10)",
                boxShadow: "0 1px 2px rgba(10,10,10,0.05), 0 8px 20px -10px rgba(10,10,10,0.15)",
                borderRadius: 12,
            }}
        >
            <div className="min-w-0 flex-1">
                <div className="font-black tracking-tight" style={{ fontSize: 14, color: PT.ink }}>{label}</div>
                {sub && (
                    <div className="font-mono text-[11px] mt-1 leading-snug font-medium" style={{ color: "rgba(10,10,10,0.55)" }}>
                        {sub}
                    </div>
                )}
            </div>
            <SwitchPill
                checked={checked}
                onChange={(v) => setPref(k, v)}
                accent={accent}
                testid={`pref-${k}`}
            />
        </label>
    );
}

/* SwitchPill — fanzine toggle (chunky border, hard shadow when on). */
export function SwitchPill({ checked, onChange, disabled, testid, accent }) {
    const onColor = accent === "danger" ? PT.red : PT.ink;
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={(e) => { e.preventDefault(); if (!disabled) onChange(!checked); }}
            disabled={disabled}
            data-testid={testid}
            className={`relative w-[48px] h-[26px] shrink-0 transition-all ${disabled ? "opacity-50" : ""}`}
            style={{
                background: checked ? onColor : PT.cream,
                border: "1px solid rgba(10,10,10,0.10)",
                borderRadius: 999,
                boxShadow: checked ? "0 1px 2px rgba(10,10,10,0.05), 0 8px 20px -10px rgba(10,10,10,0.15)" : "none",
            }}
        >
            <span
                className="absolute top-[1px] left-[1px] w-[18px] h-[18px] transition-transform duration-200"
                style={{
                    background: checked ? PT.gold : "#fff",
                    border: "1px solid rgba(10,10,10,0.10)",
                    borderRadius: 999,
                    transform: checked ? "translateX(20px)" : "translateX(0)",
                }}
            />
        </button>
    );
}

/* LinkRow — fanzine row used in Legal tab (and any external link list). */
export function LinkRow({ to, icon: Icon, title, desc, dataTestid, asLink = true, onClick }) {
    const Cmp = asLink ? "a" : "button";
    const props = asLink ? { href: to } : { onClick, type: "button" };
    return (
        <Cmp
            {...props}
            data-testid={dataTestid}
            className="group flex items-start gap-3 p-4 tap-shrink transition-transform hover:-translate-y-0.5 text-left w-full"
            style={{
                background: "#fff",
                border: "1px solid rgba(10,10,10,0.10)",
                boxShadow: "0 1px 2px rgba(10,10,10,0.05), 0 8px 20px -10px rgba(10,10,10,0.15)",
                borderRadius: 12,
            }}
        >
            <div
                className="w-10 h-10 grid place-items-center shrink-0"
                style={{
                    background: PT.gold, color: PT.ink,
                    border: "1px solid rgba(10,10,10,0.10)",
                    borderRadius: 8,
                }}
            >
                <Icon size={15} strokeWidth={2.2} />
            </div>
            <div className="flex-1 min-w-0">
                <div
                    className="font-black tracking-tight flex items-center gap-1"
                    style={{ fontSize: 13.5, color: PT.ink }}
                >
                    {title}
                    <ChevronRight size={13} className="opacity-0 group-hover:opacity-100 -ml-0.5 transition" />
                </div>
                <p className="text-[12px] leading-snug mt-1 font-medium" style={{ color: "rgba(10,10,10,0.6)" }}>
                    {desc}
                </p>
            </div>
        </Cmp>
    );
}

/* StatusPill — fanzine status indicator (Ativo / Inativo / Atual / Aviso) */
export function StatusPill({ tone = "neutral", children, dot = true }) {
    const map = {
        success: { bg: PT.green, fg: PT.ink, dotBg: PT.ink },
        warning: { bg: PT.gold, fg: PT.ink, dotBg: PT.red },
        danger:  { bg: PT.red,  fg: "#fff", dotBg: PT.gold },
        neutral: { bg: PT.cream, fg: PT.ink, dotBg: PT.ink },
        accent:  { bg: PT.ink, fg: "#fff", dotBg: PT.gold },
    };
    const c = map[tone] || map.neutral;
    return (
        <span
            className="inline-flex items-center gap-1.5 font-mono font-black uppercase px-2 py-0.5"
            style={{
                background: c.bg, color: c.fg,
                border: "1px solid rgba(10,10,10,0.10)",
                borderRadius: 999,
                fontSize: 10,
                letterSpacing: "0.10em",
            }}
        >
            {dot && (
                <span
                    className="w-1.5 h-1.5"
                    style={{ background: c.dotBg, border: `1px solid ${PT.ink}`, borderRadius: 999 }}
                />
            )}
            {children}
        </span>
    );
}

/* FzCard — wrapper helper to replace `.card-lux` inline.
   Use {...fzCardProps()} or wrap content. Kept compatible with className
   override. */
export function fzCardStyle(extra = {}) {
    return {
        background: "#fff",
        border: "1px solid rgba(10,10,10,0.10)",
        boxShadow: "0 1px 2px rgba(10,10,10,0.05), 0 8px 20px -10px rgba(10,10,10,0.15)",
        borderRadius: 12,
        ...extra,
    };
}
