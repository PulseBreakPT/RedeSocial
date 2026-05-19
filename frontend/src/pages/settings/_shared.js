/* =============================================================
   Shared primitives for the Definições module.
   Single source of truth for section headers, toggles, jump-nav.
   ============================================================= */
import { ChevronRight } from "lucide-react";

/* SectionHeader — overline (mono) + heading + lede, full 12-col row */
export function SectionHeader({ overline, title, desc, action, idx }) {
    return (
        <div className="lg:col-span-12 flex items-end justify-between gap-4 flex-wrap mt-3 first:mt-0">
            <div className="min-w-0 flex items-start gap-3">
                {typeof idx === "number" && (
                    <span
                        className="hidden lg:grid place-items-center w-7 h-7 rounded-lg bg-black text-white text-[10.5px] font-mono tabular-nums tracking-wider shrink-0 mt-0.5"
                        aria-hidden
                    >
                        {String(idx).padStart(2, "0")}
                    </span>
                )}
                <div className="min-w-0">
                    <p className="type-overline mb-0">{overline}</p>
                    <h3 className="font-heading font-bold text-[17px] lg:text-[19px] tracking-tight text-black mt-1.5 leading-tight">{title}</h3>
                    {desc && <p className="text-[12.5px] text-black/55 leading-relaxed mt-1.5 max-w-xl">{desc}</p>}
                </div>
            </div>
            {action}
        </div>
    );
}

/* ToggleRow — cohesive switch card used across all tabs */
export function ToggleRow({ label, sub, k, prefs, setPref, accent }) {
    const checked = !!prefs[k];
    return (
        <label className="flex items-center justify-between gap-3 p-4 card-lux cursor-pointer hover:shadow-md transition group">
            <div className="min-w-0 flex-1">
                <div className="font-heading font-semibold text-[14px] tracking-tight text-black">{label}</div>
                {sub && <div className="font-mono text-[11px] text-black/50 mt-0.5 leading-snug">{sub}</div>}
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

/* SwitchPill — premium toggle replacing native checkbox.
   Accessible (role=switch), keyboard-operable, smooth transition. */
export function SwitchPill({ checked, onChange, disabled, testid, accent }) {
    const bg = checked
        ? (accent === "danger" ? "bg-red-soft" : "bg-black")
        : "bg-black/[0.10]";
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            onClick={(e) => { e.preventDefault(); if (!disabled) onChange(!checked); }}
            disabled={disabled}
            data-testid={testid}
            className={`relative w-11 h-[26px] rounded-full transition-all shrink-0 ${bg} ${disabled ? "opacity-50" : "hover:opacity-90"}`}
        >
            <span
                className={`absolute top-0.5 left-0.5 w-[22px] h-[22px] rounded-full bg-white shadow-[0_1px_3px_rgba(0,0,0,0.18)] transition-transform duration-200 ${
                    checked ? "translate-x-[20px]" : ""
                }`}
            />
        </button>
    );
}

/* Quick legal/external row used in Legal tab */
export function LinkRow({ to, icon: Icon, title, desc, dataTestid, asLink = true, onClick }) {
    const Cmp = asLink ? "a" : "button";
    const props = asLink ? { href: to } : { onClick, type: "button" };
    return (
        <Cmp
            {...props}
            data-testid={dataTestid}
            className="group flex items-start gap-3 p-4 rounded-2xl border border-black/[0.08] bg-white hover:border-black/30 hover:shadow-md transition tap-shrink text-left w-full"
        >
            <div className="w-10 h-10 rounded-xl bg-black/[0.04] grid place-items-center shrink-0 text-black/75 group-hover:bg-black group-hover:text-white transition">
                <Icon size={16} strokeWidth={1.7} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="font-heading font-semibold text-[13.5px] tracking-tight text-black flex items-center gap-1">
                    {title}
                    <ChevronRight size={13} className="opacity-0 group-hover:opacity-60 -ml-0.5 transition" />
                </div>
                <p className="text-[11.5px] text-black/55 leading-snug mt-0.5">{desc}</p>
            </div>
        </Cmp>
    );
}

/* Tag pill used for status indicators (Ativo / Inativo / Atual) */
export function StatusPill({ tone = "neutral", children, dot = true }) {
    const tones = {
        success: "bg-emerald-100 text-emerald-800 border-emerald-200",
        warning: "bg-amber-50 text-amber-800 border-amber-200",
        danger: "bg-red-50 text-red-700 border-red-200",
        neutral: "bg-black/[0.05] text-black/65 border-black/[0.06]",
        accent: "bg-black text-white border-black",
    };
    return (
        <span className={`inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.12em] px-2 py-0.5 rounded-full border ${tones[tone]}`}>
            {dot && <span className={`w-1.5 h-1.5 rounded-full ${tone === "success" ? "bg-emerald-500" : tone === "warning" ? "bg-amber-500" : tone === "danger" ? "bg-red-500" : tone === "accent" ? "bg-white" : "bg-black/40"}`} />}
            {children}
        </span>
    );
}
