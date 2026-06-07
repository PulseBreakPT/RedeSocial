import { useEffect, useMemo, useRef, useState } from "react";
import {
    CalendarDays, MapPin, ExternalLink, Filter, ChevronRight, X,
    LayoutGrid, AlignJustify, Compass, ChevronDown, Sparkles, Flame,
} from "lucide-react";
import { api } from "../lib/api";
import { PageHeader } from "../components/PageHeader";
import { PtPageShell } from "../components/PtPageShell";
import { PT, Sticker, StampCircle } from "./auth/AuthDecor";

/* ════════════════════════════════════════════════════════════════
   Constants & helpers
   ════════════════════════════════════════════════════════════════ */
const MONTH_PT = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const MONTH_PT_SHORT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const ALL_CATS = { key: "all", label: "Tudo", emoji: "✦" };
const HIDE_SCROLLBAR = { scrollbarWidth: "none", msOverflowStyle: "none" };
const LS_DENSITY_KEY = "lusorae.cal.density";

/* Paleta fanzine PT estendida — 10 cores derivadas dos pigmentos
   históricos (azulejo, terracota, oliveira, vinho do Porto, etc.).
   Mantemos `PT.*` como núcleo (red/green/gold/azul/cream/ink) e
   adicionamos cinco accents semânticos para dar respiração editorial. */
const EXT = {
    red: "#C8102E",        // bandeira
    vermilion: "#A8324A",  // tinto / gastronomia
    terracotta: "#C78D2E", // barro / feira
    gold: "#FFCC00",       // raiar / sol
    olive: "#7E8D85",      // pedra & oliveira / sazonal
    forest: "#0B6E4F",     // pinhal & cultura
    azul: "#0E4D92",       // azulejo
    sky: "#1F6FB2",        // céu atlântico / desporto
    lilac: "#5C4A8A",      // estola religiosa
    ink: "#0A0A0A",
};

/* Ordem do "spine" multicolor — paleta canónica de papel fanzine. */
const SPINE_COLORS = [
    EXT.red, EXT.terracotta, EXT.gold, EXT.olive,
    EXT.forest, EXT.sky, EXT.azul, EXT.lilac, EXT.vermilion,
];

/* Accent por índice de mês (Jan=0 … Dez=11) — rotação determinística
   para que cada folha mensal tenha a sua própria assinatura cromática. */
const MONTH_ACCENTS = [
    EXT.red,        // Jan — Ano Novo
    EXT.lilac,      // Fev — Carnaval
    EXT.forest,     // Mar — Primavera
    EXT.gold,       // Abr — 25 Abril
    EXT.vermilion,  // Mai — Santos/Maias
    EXT.red,        // Jun — Santos Populares
    EXT.terracotta, // Jul — calor
    EXT.olive,      // Ago — sequeiro
    EXT.azul,       // Set — vindima
    EXT.lilac,      // Out — outono
    EXT.forest,     // Nov — magusto
    EXT.red,        // Dez — Natal
];

const accentTextOn = (bg) => (bg === EXT.gold ? EXT.ink : "#fff");

const fmtDate = (iso) => {
    const d = new Date(iso + "T00:00:00");
    return { day: d.getDate(), month: MONTH_PT[d.getMonth()].slice(0, 3).toUpperCase(), monthIdx: d.getMonth() };
};

const dateRangeLabel = (start, end) => {
    if (!end || end === start) {
        const d = new Date(start + "T00:00:00");
        return `${d.getDate()} de ${MONTH_PT[d.getMonth()]}`;
    }
    const a = new Date(start + "T00:00:00");
    const b = new Date(end + "T00:00:00");
    if (a.getMonth() === b.getMonth()) return `${a.getDate()}–${b.getDate()} de ${MONTH_PT[a.getMonth()]}`;
    return `${a.getDate()} ${MONTH_PT[a.getMonth()].slice(0, 3)} → ${b.getDate()} ${MONTH_PT[b.getMonth()].slice(0, 3)}`;
};

const isFeaturedEvent = (ev) =>
    ev.status === "now" ||
    (typeof ev.days_until === "number" && ev.days_until >= 0 && ev.days_until <= 2 && ev.status !== "past");

/* ════════════════════════════════════════════════════════════════
   Primitives — pequenas réguas editoriais
   ════════════════════════════════════════════════════════════════ */
const Overline = ({ children, color = "rgba(10,10,10,0.50)", className = "" }) => (
    <span
        className={`font-mono font-bold uppercase tracking-[0.20em] text-[10px] sm:text-[11px] ${className}`}
        style={{ color }}
    >
        {children}
    </span>
);

function StatusPill({ status, days, compact = false }) {
    const baseClass = compact
        ? "inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px]"
        : "inline-flex items-center gap-1 px-2 py-0.5 text-[10px]";
    const fontClass = "font-mono font-bold uppercase tracking-[0.12em]";

    if (status === "now") {
        return (
            <span
                className={`${baseClass} ${fontClass} animate-pulse`}
                style={{
                    background: PT.red,
                    color: "#fff",
                    border: `2px solid ${PT.ink}`,
                    boxShadow: `2px 2px 0 ${PT.ink}`,
                }}
            >
                ● a decorrer
            </span>
        );
    }
    if (status === "past") {
        return (
            <span
                className={`${baseClass} ${fontClass}`}
                style={{
                    background: "transparent",
                    color: "rgba(10,10,10,0.40)",
                    border: `2px dashed rgba(10,10,10,0.30)`,
                }}
            >
                já passou
            </span>
        );
    }
    if (typeof days === "number") {
        const label = days === 0 ? "Hoje" : days === 1 ? "Amanhã" : days <= 7 ? `em ${days} dias` : `daqui a ${days}d`;
        return (
            <span
                className={`${baseClass} ${fontClass}`}
                style={{
                    background: PT.gold,
                    color: PT.ink,
                    border: `2px solid ${PT.ink}`,
                    boxShadow: `2px 2px 0 ${PT.ink}`,
                }}
            >
                {label}
            </span>
        );
    }
    return null;
}

function CategoryChip({ meta, active, onClick, count }) {
    return (
        <button
            type="button"
            data-testid={`cal-cat-${meta.key}`}
            onClick={onClick}
            aria-pressed={active}
            className="tap-shrink inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-[0.10em] whitespace-nowrap flex-shrink-0 snap-start"
            style={{
                background: active ? PT.ink : "#fff",
                color: active ? PT.cream : PT.ink,
                border: `2.5px solid ${PT.ink}`,
                boxShadow: active ? "none" : `3px 3px 0 ${PT.ink}`,
                transform: active ? "translate(3px,3px)" : "none",
                transition: "transform 0.08s",
            }}
        >
            <span aria-hidden>{meta.emoji}</span>
            <span>{meta.label}</span>
            {typeof count === "number" && (
                <span
                    className="ml-1 text-[9px] opacity-70"
                    style={{ color: active ? PT.cream : "rgba(10,10,10,0.55)" }}
                >
                    · {count}
                </span>
            )}
        </button>
    );
}

/* ════════════════════════════════════════════════════════════════
   YearCompass — 12 quadrículas Jan→Dez com heatmap de eventos
   ════════════════════════════════════════════════════════════════ */
function YearCompass({ year, counts, todayMonthIdx, currentMonthIdx, maxCount, onJump, totalFiltered }) {
    return (
        <div
            className="relative"
            data-testid="cal-compass"
            style={{
                background: "#fff",
                border: `2.5px solid ${PT.ink}`,
                boxShadow: `5px 5px 0 ${PT.ink}`,
            }}
        >
            {/* Header da rosa-dos-meses */}
            <div
                className="flex items-center justify-between px-3 sm:px-4 py-2.5"
                style={{ borderBottom: `2px solid ${PT.ink}`, background: PT.ink, color: PT.cream }}
            >
                <span className="inline-flex items-center gap-1.5 font-mono font-bold uppercase tracking-[0.16em] text-[10px]">
                    <Compass size={12} strokeWidth={2.4} />
                    rosa do ano · {year}
                </span>
                <span className="font-mono font-bold uppercase tracking-[0.12em] text-[10px] opacity-80">
                    {totalFiltered} no filtro
                </span>
            </div>

            <div className="cal-compass-grid grid grid-cols-6 sm:grid-cols-12 gap-0">
                {Array.from({ length: 12 }, (_, i) => {
                    const n = counts[i] || 0;
                    const isCurrent = currentMonthIdx === i;
                    const isToday = todayMonthIdx === i;
                    const intensity = maxCount > 0 ? n / maxCount : 0;
                    let bg = "#fff";
                    if (n > 0) {
                        if (intensity > 0.75) bg = PT.gold;
                        else if (intensity > 0.50) bg = "#FFE066";
                        else if (intensity > 0.25) bg = "#FFF1A8";
                        else bg = "#FFF8DC";
                    }
                    if (isCurrent) bg = PT.red;

                    return (
                        <button
                            key={i}
                            type="button"
                            onClick={() => onJump(i)}
                            disabled={n === 0}
                            data-testid={`cal-compass-${String(i + 1).padStart(2, "0")}`}
                            aria-label={`${MONTH_PT[i]} — ${n} ${n === 1 ? "evento" : "eventos"}`}
                            className="cal-compass-cell tap-shrink relative flex flex-col items-start justify-between p-2 sm:p-2.5 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                            style={{
                                background: bg,
                                color: isCurrent ? "#fff" : PT.ink,
                                minHeight: 58,
                            }}
                        >
                            <div className="flex items-center justify-between w-full">
                                <span className="font-mono font-bold uppercase tracking-[0.10em] text-[9px] leading-none">
                                    {MONTH_PT_SHORT[i]}
                                </span>
                                {isToday && !isCurrent && (
                                    <span
                                        aria-hidden
                                        className="block w-1.5 h-1.5"
                                        style={{ background: PT.red, border: `1.5px solid ${PT.ink}` }}
                                    />
                                )}
                            </div>
                            <span
                                className="font-black leading-none text-base sm:text-lg mt-1.5"
                                style={{ opacity: n === 0 ? 0.4 : 1 }}
                            >
                                {n}
                            </span>
                        </button>
                    );
                })}
            </div>

            {/* legenda */}
            <div
                className="flex items-center justify-between px-3 sm:px-4 py-2 text-[9.5px] font-mono uppercase tracking-[0.14em]"
                style={{ borderTop: `2px solid ${PT.ink}`, color: "rgba(10,10,10,0.55)" }}
            >
                <span className="inline-flex items-center gap-1.5">
                    <span aria-hidden className="inline-block w-2.5 h-2.5" style={{ background: "#FFF8DC", border: `1.5px solid ${PT.ink}` }} />
                    poucos
                    <span aria-hidden className="inline-block w-2.5 h-2.5 ml-1" style={{ background: PT.gold, border: `1.5px solid ${PT.ink}` }} />
                    muitos
                </span>
                <span className="inline-flex items-center gap-1.5">
                    <span aria-hidden className="inline-block w-2.5 h-2.5" style={{ background: PT.red, border: `1.5px solid ${PT.ink}` }} />
                    a ler
                </span>
            </div>
        </div>
    );
}

/* ════════════════════════════════════════════════════════════════
   EventCard — duas variantes (revista / lista) + featured
   ════════════════════════════════════════════════════════════════ */
function EventCard({ ev, catMeta, density, indexInMonth }) {
    const { day, month } = fmtDate(ev.iso_date);
    const rangeLabel = dateRangeLabel(ev.iso_date, ev.iso_end);
    const isMulti = ev.iso_end && ev.iso_end !== ev.iso_date;
    const featured = isFeaturedEvent(ev);
    const accentColor = catMeta?.color || PT.ink;
    const isLightAccent = accentColor === "#FFCC00";
    const delayMs = Math.min(indexInMonth * 35, 280);

    /* ───────── LISTA (densidade compacta) ───────── */
    if (density === "list") {
        return (
            <article
                id={`cal-event-${ev.key}`}
                data-testid={`cal-event-${ev.key}`}
                className="cal-reveal group grid grid-cols-[44px_1fr_auto] sm:grid-cols-[56px_1fr_auto] items-center gap-3 sm:gap-4 px-3 sm:px-4 py-2.5"
                style={{
                    background: featured ? "#FFFCF5" : "#fff",
                    border: `2px solid ${PT.ink}`,
                    boxShadow: featured ? `3px 3px 0 ${PT.red}` : `2px 2px 0 ${PT.ink}`,
                    animationDelay: `${delayMs}ms`,
                    borderLeft: `5px solid ${accentColor}`,
                }}
            >
                <div className="flex flex-col items-center justify-center leading-none" style={{ color: PT.ink }}>
                    <span className="font-mono font-bold uppercase tracking-[0.12em] text-[8.5px] opacity-60">{month}</span>
                    <span className="font-black text-lg sm:text-xl mt-0.5">{day}</span>
                </div>
                <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5 min-w-0">
                        <h3
                            className="font-black leading-tight tracking-[-0.015em] truncate"
                            style={{ color: PT.ink, fontSize: "clamp(13.5px, 3.6vw, 16px)" }}
                        >
                            {ev.emoji && <span className="mr-1" aria-hidden>{ev.emoji}</span>}
                            {ev.title}
                        </h3>
                    </div>
                    <div className="flex items-center gap-x-2 gap-y-0.5 flex-wrap text-[10px] font-mono uppercase tracking-[0.08em]" style={{ color: "rgba(10,10,10,0.55)" }}>
                        <span className="inline-flex items-center gap-1" style={{ color: accentColor === PT.gold ? "rgba(10,10,10,0.70)" : accentColor }}>
                            <span aria-hidden className="inline-block w-1.5 h-1.5" style={{ background: accentColor, border: `1px solid ${PT.ink}` }} />
                            {catMeta?.label || ev.category}
                        </span>
                        {ev.city && (
                            <span className="inline-flex items-center gap-0.5">
                                <MapPin size={9} strokeWidth={2.4} />
                                {ev.city}
                            </span>
                        )}
                        <span>{rangeLabel}</span>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <StatusPill status={ev.status} days={ev.days_until} compact />
                    {ev.url && (
                        <a
                            href={ev.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            data-testid={`cal-link-${ev.key}`}
                            aria-label={`site oficial — ${ev.title}`}
                            className="inline-flex items-center justify-center w-7 h-7"
                            style={{ color: PT.azul, border: `1.5px solid ${PT.ink}`, background: "#fff" }}
                        >
                            <ExternalLink size={11} strokeWidth={2.4} />
                        </a>
                    )}
                </div>
            </article>
        );
    }

    /* ───────── REVISTA (densidade rica, default) ───────── */
    return (
        <article
            id={`cal-event-${ev.key}`}
            data-testid={`cal-event-${ev.key}`}
            className="cal-reveal group relative grid grid-cols-[56px_1fr] sm:grid-cols-[92px_1fr] gap-3 sm:gap-5 p-3 sm:p-5 transition-all duration-150"
            style={{
                background: featured ? "#FFFCF5" : "#fff",
                border: `2.5px solid ${PT.ink}`,
                boxShadow: featured ? `5px 5px 0 ${PT.red}` : `4px 4px 0 ${PT.ink}`,
                animationDelay: `${delayMs}ms`,
            }}
        >
            {/* faixa cromática à esquerda — código de categoria */}
            <span aria-hidden className="absolute left-0 top-0 bottom-0 w-1 sm:w-1.5" style={{ background: accentColor }} />

            {/* fita "EM DESTAQUE" no canto superior direito (apenas featured) */}
            {featured && (
                <span
                    aria-hidden
                    className="absolute -top-2 right-3 px-1.5 py-0.5 font-mono font-bold uppercase tracking-[0.16em] text-[9px]"
                    style={{
                        background: PT.red,
                        color: "#fff",
                        border: `2px solid ${PT.ink}`,
                        boxShadow: `2px 2px 0 ${PT.ink}`,
                        transform: "rotate(2deg)",
                    }}
                >
                    em destaque
                </span>
            )}

            {/* bloco de data */}
            <div
                className="flex flex-col items-center justify-center py-2 px-1"
                style={{
                    background: accentColor,
                    color: isLightAccent ? PT.ink : "#fff",
                    border: `2px solid ${PT.ink}`,
                }}
            >
                <span className="font-mono font-bold tracking-[0.14em] text-[9px] sm:text-[11px] uppercase" style={{ opacity: 0.85 }}>
                    {month}
                </span>
                <span className="font-black leading-none text-2xl sm:text-[2.6rem] mt-0.5">{day}</span>
                {isMulti && (
                    <span className="font-mono text-[8px] sm:text-[9px] mt-1 uppercase tracking-[0.08em] text-center leading-none" style={{ opacity: 0.85 }}>
                        → {fmtDate(ev.iso_end).day} {fmtDate(ev.iso_end).month}
                    </span>
                )}
            </div>

            {/* conteúdo */}
            <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9.5px] font-mono font-bold uppercase tracking-[0.10em]"
                        style={{
                            background: accentColor,
                            color: isLightAccent ? PT.ink : "#fff",
                            border: `1.5px solid ${PT.ink}`,
                        }}
                    >
                        {catMeta?.label || ev.category}
                    </span>
                    {ev.city && (
                        <Overline color="rgba(10,10,10,0.55)" className="inline-flex items-center gap-1">
                            <MapPin size={10} strokeWidth={2.4} />
                            {ev.city}
                        </Overline>
                    )}
                    <StatusPill status={ev.status} days={ev.days_until} compact />
                </div>

                <h3
                    className="font-black leading-[1.1] tracking-[-0.015em] break-words"
                    style={{
                        color: PT.ink,
                        fontSize: featured ? "clamp(17px, 5vw, 24px)" : "clamp(15px, 4.4vw, 21px)",
                    }}
                >
                    {ev.emoji && <span className="mr-1" aria-hidden>{ev.emoji}</span>}
                    {ev.title}
                </h3>

                {ev.subtitle && (
                    <p className="text-[12.5px] sm:text-sm leading-snug mt-1.5" style={{ color: "rgba(10,10,10,0.78)" }}>
                        {ev.subtitle}
                    </p>
                )}

                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-2.5">
                    <span className="text-[10.5px] font-mono uppercase tracking-[0.10em]" style={{ color: "rgba(10,10,10,0.55)" }}>
                        {rangeLabel}
                    </span>
                    {ev.url && (
                        <a
                            href={ev.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            data-testid={`cal-link-${ev.key}`}
                            className="inline-flex items-center gap-1 text-[10.5px] font-mono font-bold uppercase tracking-[0.10em] underline-offset-4 hover:underline ml-auto"
                            style={{ color: PT.azul }}
                        >
                            site oficial <ExternalLink size={10} strokeWidth={2.4} />
                        </a>
                    )}
                </div>
            </div>
        </article>
    );
}

/* ════════════════════════════════════════════════════════════════
   MonthSection — header magazine + lista de eventos
   ════════════════════════════════════════════════════════════════ */
function MonthSection({ monthKey, events, catMetaMap, isCurrent, density }) {
    const [y, m] = monthKey.split("-");
    const idx = parseInt(m, 10) - 1;
    const monthName = MONTH_PT[idx];
    const monthNum = String(parseInt(m, 10)).padStart(2, "0");
    const monthAccent = MONTH_ACCENTS[idx] || EXT.ink;

    const breakdown = useMemo(() => {
        const counts = {};
        for (const ev of events) counts[ev.category] = (counts[ev.category] || 0) + 1;
        return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 4);
    }, [events]);

    return (
        <section
            className="mb-12 sm:mb-16 first:mt-0 mt-10 sm:mt-14"
            id={`cal-month-${monthKey}`}
            data-testid={`cal-month-${monthKey}`}
        >
            {/* HEADER do mês — magazine-style: numeral gigante + faixa de accent */}
            <header className="relative mb-5 sm:mb-7 pb-4 sm:pb-5" style={{ borderBottom: `2.5px solid ${PT.ink}` }}>
                {/* Faixa cromática do mês (fita superior) */}
                <span
                    aria-hidden
                    className="absolute left-0 right-0 top-0"
                    style={{ height: 4, background: monthAccent }}
                />
                <div className="flex items-end gap-3 sm:gap-5 pt-3">
                    <span
                        className="font-black leading-none tracking-[-0.05em] select-none flex-shrink-0"
                        style={{
                            color: isCurrent ? PT.red : `${monthAccent}3D`,
                            fontSize: "clamp(72px, 18vw, 156px)",
                            lineHeight: "0.78",
                        }}
                        aria-hidden
                    >
                        {monthNum}
                    </span>
                    <div className="min-w-0 flex-1 pb-1 sm:pb-2">
                        <div className="flex items-center gap-2 mb-1 sm:mb-2 flex-wrap">
                            <span
                                className="font-mono font-bold uppercase tracking-[0.20em] text-[10px] sm:text-[11px]"
                                style={{ color: monthAccent }}
                            >
                                / folha&nbsp;n.º&nbsp;{monthNum}
                            </span>
                            {isCurrent && (
                                <span
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase tracking-[0.14em]"
                                    style={{ background: PT.red, color: "#fff", border: `1.5px solid ${PT.ink}` }}
                                >
                                    agora
                                </span>
                            )}
                        </div>
                        <h2
                            className="font-black tracking-[-0.025em] leading-[0.92]"
                            style={{ color: PT.ink, fontSize: "clamp(26px, 7.5vw, 46px)" }}
                        >
                            {monthName}
                        </h2>
                        <p
                            className="font-mono text-[11px] sm:text-xs mt-1.5 sm:mt-2 uppercase tracking-[0.10em]"
                            style={{ color: "rgba(10,10,10,0.55)" }}
                        >
                            {events.length} {events.length === 1 ? "evento" : "eventos"} · {y}
                        </p>
                    </div>
                </div>

                {breakdown.length > 0 && (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-3 sm:mt-4">
                        {breakdown.map(([catKey, n]) => {
                            const cm = catMetaMap[catKey];
                            return (
                                <span
                                    key={catKey}
                                    className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-[0.08em]"
                                    style={{ color: "rgba(10,10,10,0.65)" }}
                                >
                                    <span aria-hidden className="inline-block w-2 h-2" style={{ background: cm?.color || PT.ink, border: `1.5px solid ${PT.ink}` }} />
                                    {cm?.label || catKey} · {n}
                                </span>
                            );
                        })}
                    </div>
                )}
            </header>

            <div className={density === "list" ? "space-y-2" : "space-y-2.5 sm:space-y-3.5"}>
                {events.map((ev, i) => (
                    <EventCard key={ev.key} ev={ev} catMeta={catMetaMap[ev.category]} density={density} indexInMonth={i} />
                ))}
            </div>
        </section>
    );
}

/* ════════════════════════════════════════════════════════════════
   Highlights — cartões "a seguir"
   ════════════════════════════════════════════════════════════════ */
function Highlight({ ev, catMetaMap }) {
    if (!ev) return null;
    const meta = catMetaMap[ev.category];
    const { day, month } = fmtDate(ev.iso_date);
    return (
        <a
            href={`#cal-event-${ev.key}`}
            data-testid={`cal-highlight-${ev.key}`}
            className="block p-3 sm:p-4 hover:translate-y-[-2px] transition-transform w-[78vw] sm:w-auto flex-shrink-0 snap-start"
            style={{
                background: "#fff",
                border: `2.5px solid ${PT.ink}`,
                boxShadow: `4px 4px 0 ${PT.ink}`,
            }}
        >
            <div className="flex items-center gap-3">
                <div
                    className="flex flex-col items-center justify-center w-12 h-12 sm:w-14 sm:h-14 shrink-0"
                    style={{
                        background: meta?.color || PT.ink,
                        color: meta?.color === "#FFCC00" ? PT.ink : "#fff",
                        border: `2px solid ${PT.ink}`,
                    }}
                >
                    <span className="font-mono text-[9px] uppercase tracking-[0.14em] opacity-85">{month}</span>
                    <span className="font-black text-lg sm:text-xl leading-none">{day}</span>
                </div>
                <div className="min-w-0 flex-1">
                    <p className="font-mono text-[10px] uppercase tracking-[0.14em] mb-0.5" style={{ color: "rgba(10,10,10,0.55)" }}>
                        {ev.days_until === 0 ? "hoje" : ev.days_until === 1 ? "amanhã" : `daqui a ${ev.days_until} dias`}
                    </p>
                    <p className="font-black leading-tight truncate" style={{ color: PT.ink, fontSize: 15 }}>
                        {ev.emoji} {ev.title}
                    </p>
                    {ev.city && (
                        <p className="text-[11px] font-mono uppercase tracking-[0.10em] truncate" style={{ color: "rgba(10,10,10,0.55)" }}>
                            {ev.city}
                        </p>
                    )}
                </div>
            </div>
        </a>
    );
}

function MonthJumpPill({ monthKey, count, onClick, isCurrent }) {
    const [, m] = monthKey.split("-");
    const idx = parseInt(m, 10) - 1;
    return (
        <button
            type="button"
            onClick={onClick}
            data-testid={`cal-jump-${monthKey}`}
            className="tap-shrink flex flex-col items-center justify-center px-3 py-1.5 flex-shrink-0 snap-start min-w-[58px]"
            style={{
                background: isCurrent ? PT.red : "#fff",
                color: isCurrent ? "#fff" : PT.ink,
                border: `2px solid ${PT.ink}`,
                boxShadow: `2px 2px 0 ${PT.ink}`,
            }}
            aria-current={isCurrent ? "true" : undefined}
        >
            <span className="font-mono font-bold uppercase tracking-[0.10em] text-[9px] leading-none">
                {MONTH_PT_SHORT[idx]}
            </span>
            <span className="font-black text-[11px] leading-none mt-0.5">{count}</span>
        </button>
    );
}

/* ════════════════════════════════════════════════════════════════
   DensityToggle — Revista | Lista
   ════════════════════════════════════════════════════════════════ */
function DensityToggle({ value, onChange, idPrefix = "cal-density" }) {
    const opts = [
        { key: "magazine", label: "revista", icon: LayoutGrid },
        { key: "list", label: "lista", icon: AlignJustify },
    ];
    return (
        <div
            className="inline-flex items-center flex-shrink-0"
            data-testid={idPrefix}
            role="radiogroup"
            aria-label="densidade da agenda"
            style={{ border: `2px solid ${PT.ink}`, background: "#fff" }}
        >
            {opts.map((o, i) => {
                const Icon = o.icon;
                const active = value === o.key;
                return (
                    <button
                        key={o.key}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        data-testid={`${idPrefix}-${o.key}`}
                        onClick={() => onChange(o.key)}
                        className="tap-shrink inline-flex items-center gap-1.5 px-2.5 py-1.5 font-mono font-bold uppercase tracking-[0.12em] text-[10px]"
                        style={{
                            background: active ? PT.ink : "transparent",
                            color: active ? PT.cream : PT.ink,
                            borderLeft: i > 0 ? `2px solid ${PT.ink}` : "none",
                        }}
                    >
                        <Icon size={11} strokeWidth={2.4} />
                        {o.label}
                    </button>
                );
            })}
        </div>
    );
}

/* ════════════════════════════════════════════════════════════════
   CategoryLegend — chave cromática editorial (palette key)
   ════════════════════════════════════════════════════════════════ */
function CategoryLegend({ catMetaMap, catCounts, activeCat, onPick }) {
    const entries = Object.entries(catMetaMap);
    return (
        <div className="mt-6 sm:mt-7" data-testid="cal-legend">
            <div className="flex items-center gap-2 mb-2 pl-0.5">
                <span aria-hidden className="inline-block w-3 h-3" style={{ background: EXT.gold, border: `1.5px solid ${PT.ink}` }} />
                <Overline>// chave cromática · cores das categorias</Overline>
            </div>
            <div
                className="cal-legend-grid grid grid-cols-2 sm:grid-cols-5 gap-0"
                style={{
                    background: "#fff",
                    border: `2.5px solid ${PT.ink}`,
                    boxShadow: `4px 4px 0 ${PT.ink}`,
                }}
            >
                {entries.map(([key, meta], i) => {
                    const active = activeCat === key;
                    return (
                        <button
                            key={key}
                            type="button"
                            data-testid={`cal-legend-${key}`}
                            onClick={() => onPick(active ? "all" : key)}
                            aria-pressed={active}
                            className="cal-legend-cell tap-shrink relative px-2.5 py-2 text-left transition-colors"
                            style={{
                                background: active ? meta.color : "transparent",
                                color: active ? accentTextOn(meta.color) : PT.ink,
                            }}
                        >
                            <span
                                aria-hidden
                                className="absolute left-0 top-0 bottom-0"
                                style={{ width: 4, background: meta.color }}
                            />
                            <span className="pl-2 flex flex-col gap-0.5 min-w-0">
                                <span className="font-mono font-bold uppercase tracking-[0.08em] text-[9px] sm:text-[9.5px] leading-tight truncate">
                                    {meta.label}
                                </span>
                                <span className="font-black text-[14px] leading-none">
                                    {catCounts[key] || 0}
                                </span>
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

/* ════════════════════════════════════════════════════════════════
   Calendário — página principal
   ════════════════════════════════════════════════════════════════ */
export default function Calendario() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [cat, setCat] = useState("all");
    const [region, setRegion] = useState("all");
    const [showPast, setShowPast] = useState(false);
    const [density, setDensityState] = useState(() => {
        try { return localStorage.getItem(LS_DENSITY_KEY) || "magazine"; } catch { return "magazine"; }
    });
    const setDensity = (v) => {
        setDensityState(v);
        try { window.localStorage.setItem(LS_DENSITY_KEY, v); } catch { /* ignore */ }
    };
    const [filtersOpen, setFiltersOpen] = useState(false);

    const [currentMonth, setCurrentMonth] = useState(null);
    const monthRefs = useRef({});

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            try {
                const { data: payload } = await api.get("/calendar/all");
                if (!cancelled) setData(payload);
            } catch (e) {
                if (!cancelled) setError(e?.message || "Erro a carregar calendário");
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const catMetaMap = data?.categories || {};
    const regionMetaMap = data?.regions || {};

    const catCounts = useMemo(() => {
        if (!data) return {};
        const c = { all: 0 };
        for (const ev of data.events) {
            if (!showPast && ev.status === "past") continue;
            if (region !== "all" && ev.region !== region && ev.region !== "all") continue;
            c.all = (c.all || 0) + 1;
            c[ev.category] = (c[ev.category] || 0) + 1;
        }
        return c;
    }, [data, showPast, region]);

    const filtered = useMemo(() => {
        if (!data) return [];
        return data.events.filter((ev) => {
            if (!showPast && ev.status === "past") return false;
            if (cat !== "all" && ev.category !== cat) return false;
            if (region !== "all" && ev.region !== region && ev.region !== "all") return false;
            return true;
        });
    }, [data, cat, region, showPast]);

    const byMonth = useMemo(() => {
        const map = {};
        for (const ev of filtered) {
            const k = ev.iso_date.slice(0, 7);
            (map[k] = map[k] || []).push(ev);
        }
        return map;
    }, [filtered]);

    const monthKeys = useMemo(() => Object.keys(byMonth).sort(), [byMonth]);

    /* Compass — contagem por índice de mês 0..11 do ANO do dataset */
    const compassData = useMemo(() => {
        const year = data?.year;
        if (!year) return { counts: Array(12).fill(0), max: 0, todayIdx: null, currentIdx: null };
        const counts = Array(12).fill(0);
        for (const ev of filtered) {
            const [yy, mm] = ev.iso_date.split("-");
            if (parseInt(yy, 10) === year) counts[parseInt(mm, 10) - 1] += 1;
        }
        const max = Math.max(...counts);
        const today = data?.today ? new Date(data.today + "T00:00:00") : null;
        const todayIdx = today && today.getFullYear() === year ? today.getMonth() : null;
        let currentIdx = null;
        if (currentMonth) {
            const [, m] = currentMonth.split("-");
            currentIdx = parseInt(m, 10) - 1;
        }
        return { counts, max, todayIdx, currentIdx };
    }, [filtered, data, currentMonth]);

    /* IntersectionObserver — atualiza mês "a ler" no nav */
    useEffect(() => {
        if (monthKeys.length === 0) return;
        const observer = new IntersectionObserver(
            (entries) => {
                const visible = entries
                    .filter((e) => e.isIntersecting)
                    .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
                if (visible) {
                    const id = visible.target.id;
                    setCurrentMonth(id.replace("cal-month-", ""));
                }
            },
            { rootMargin: "-130px 0px -60% 0px", threshold: 0 }
        );
        monthKeys.forEach((mk) => {
            const el = document.getElementById(`cal-month-${mk}`);
            if (el) {
                monthRefs.current[mk] = el;
                observer.observe(el);
            }
        });
        return () => observer.disconnect();
    }, [monthKeys]);

    const scrollToMonth = (mk) => {
        const el = document.getElementById(`cal-month-${mk}`);
        if (el) {
            const y = el.getBoundingClientRect().top + window.scrollY - 100;
            window.scrollTo({ top: y, behavior: "smooth" });
        }
    };

    const scrollToMonthIdx = (idx) => {
        const year = data?.year;
        if (!year) return;
        const mk = `${year}-${String(idx + 1).padStart(2, "0")}`;
        if (byMonth[mk]) scrollToMonth(mk);
    };

    const catChips = useMemo(() => {
        const out = [ALL_CATS];
        for (const key of Object.keys(catMetaMap)) {
            out.push({ key, ...catMetaMap[key] });
        }
        return out;
    }, [catMetaMap]);

    const stats = useMemo(() => {
        if (!data) return null;
        const upcoming = data.events.filter((e) => e.status !== "past");
        const nowCount = data.events.filter((e) => e.status === "now").length;
        const regions = new Set(upcoming.map((e) => e.region).filter((r) => r && r !== "all"));
        return {
            total: upcoming.length,
            regions: regions.size,
            now: nowCount,
            categories: Object.keys(catMetaMap).length,
        };
    }, [data, catMetaMap]);

    const hasActiveFilters = cat !== "all" || region !== "all" || showPast;
    const clearFilters = () => {
        setCat("all");
        setRegion("all");
        setShowPast(false);
    };

    const currentMonthLabel = useMemo(() => {
        if (!currentMonth) return null;
        const [, m] = currentMonth.split("-");
        return MONTH_PT[parseInt(m, 10) - 1];
    }, [currentMonth]);

    /* ESC fecha painel de filtros */
    useEffect(() => {
        if (!filtersOpen) return;
        const onKey = (e) => { if (e.key === "Escape") setFiltersOpen(false); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [filtersOpen]);

    const editionLabel = useMemo(() => {
        if (!data?.today) return null;
        const t = new Date(data.today + "T00:00:00");
        return `edição n.º ${String(t.getMonth() + 1).padStart(2, "0")} · ${MONTH_PT[t.getMonth()].toLowerCase()}`;
    }, [data]);

    return (
        <PtPageShell testid="page-calendario">
            <CalendarioStyles />
            <PageHeader title="Calendário · Portugal" subtitle="curadoria 2026" testid="calendar-header" />

            {/* ─── STICKY MONTH NAV ─── */}
            {data && monthKeys.length > 1 && (
                <div
                    className="sticky z-20 backdrop-blur"
                    style={{
                        top: "calc(var(--mobile-topbar-h) + 56px)",
                        background: "rgba(244,244,244,0.94)",
                        borderBottom: `2px solid ${PT.ink}`,
                    }}
                    data-testid="cal-monthnav"
                >
                    <div className="lg:max-w-[1200px] lg:mx-auto px-3 sm:px-5 lg:px-8">
                        <div className="flex items-center gap-2 py-2 overflow-x-auto snap-x snap-mandatory" style={HIDE_SCROLLBAR}>
                            <div className="flex items-center gap-1 flex-shrink-0 pr-1.5 border-r-2 border-black/15">
                                <Overline color="rgba(10,10,10,0.55)">
                                    {currentMonthLabel ? (
                                        <>a ler · <span style={{ color: PT.red }}>{currentMonthLabel}</span></>
                                    ) : (
                                        <>saltar →</>
                                    )}
                                </Overline>
                            </div>
                            {monthKeys.map((mk) => (
                                <MonthJumpPill
                                    key={mk}
                                    monthKey={mk}
                                    count={byMonth[mk].length}
                                    isCurrent={currentMonth === mk}
                                    onClick={() => scrollToMonth(mk)}
                                />
                            ))}
                            <div className="flex-shrink-0 ml-auto pl-1.5 border-l-2 border-black/15 hidden sm:block">
                                <DensityToggle value={density} onChange={setDensity} idPrefix="cal-density-nav" />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="px-3 sm:px-5 lg:px-8 pt-5 sm:pt-7 pb-24 lg:max-w-[1200px] lg:mx-auto">
                {/* ═══════════════════════════════════════════════════
                    MASTHEAD — editorial header (assimétrico no desktop)
                ═══════════════════════════════════════════════════ */}
                <header className="relative mb-8 sm:mb-12" data-testid="cal-masthead">
                    {/* Spine multicolor — papel fanzine PT */}
                    <div
                        aria-hidden
                        className="flex items-stretch mb-3"
                        style={{ height: 8, border: `2px solid ${PT.ink}`, boxShadow: `3px 3px 0 ${PT.ink}` }}
                    >
                        {SPINE_COLORS.map((c, i) => (
                            <span
                                key={i}
                                className="flex-1"
                                style={{
                                    background: c,
                                    borderRight: i < SPINE_COLORS.length - 1 ? `2px solid ${PT.ink}` : "none",
                                }}
                            />
                        ))}
                    </div>

                    {/* edition strip */}
                    <div
                        className="flex items-center justify-between gap-3 mb-4 sm:mb-5 pb-2"
                        style={{ borderBottom: `1.5px dashed ${PT.ink}` }}
                    >
                        <div className="inline-flex items-center gap-2 sm:gap-3 min-w-0">
                            <Overline color={PT.ink}>// lusorae · papel</Overline>
                            {editionLabel && (
                                <span className="hidden sm:inline-flex font-mono font-bold uppercase tracking-[0.16em] text-[10px]" style={{ color: "rgba(10,10,10,0.50)" }}>
                                    · {editionLabel}
                                </span>
                            )}
                        </div>
                        {data?.today && (
                            <span className="font-mono font-bold uppercase tracking-[0.16em] text-[10px] flex-shrink-0" style={{ color: "rgba(10,10,10,0.50)" }}>
                                {data.today}
                            </span>
                        )}
                    </div>

                    <div className="min-w-0">
                        <div className="flex items-start gap-2.5 mb-4 flex-wrap">
                            <StampCircle size={52} bg={PT.red} rotate={-10}>
                                <div className="text-center leading-tight">
                                    <div className="text-[7px] font-mono tracking-[0.18em]">ANO</div>
                                    <div className="text-base font-black">{data?.year || 2026}</div>
                                </div>
                            </StampCircle>
                            <Sticker bg={PT.gold} rotate={3}>
                                <span className="text-[10px] sm:text-[11px] font-mono font-bold tracking-[0.14em]">
                                    curadoria editorial
                                </span>
                            </Sticker>
                            <Sticker bg={EXT.forest} rotate={-4}>
                                <span className="text-[10px] sm:text-[11px] font-mono font-bold tracking-[0.14em]" style={{ color: "#fff" }}>
                                    Portugal · 2026
                                </span>
                            </Sticker>
                        </div>

                        <p
                            className="max-w-[640px] text-[15px] sm:text-[17px] leading-[1.55] sm:leading-[1.5]"
                            style={{ color: "rgba(10,10,10,0.78)" }}
                        >
                            Feriados, festas das cidades, festivais, romarias, feiras e dias para marcar a tinta. Da
                            <span style={{ background: `${EXT.terracotta}30`, padding: "0 4px", margin: "0 2px" }}>Brejeira</span>
                            ao
                            <span style={{ background: `${EXT.azul}30`, padding: "0 4px", margin: "0 2px" }}>Pico</span>,
                            do
                            <span style={{ background: `${EXT.lilac}30`, padding: "0 4px", margin: "0 2px" }}>Carnaval</span>
                            ao
                            <span style={{ background: `${EXT.forest}30`, padding: "0 4px", margin: "0 2px" }}>Magusto</span>
                            — um mapa afetivo dos próximos meses.
                        </p>

                        {/* STAT STRIP — cada célula com accent cromático */}
                        {stats && (
                            <div
                                className="mt-5 sm:mt-6 grid grid-cols-3 sm:grid-cols-4 gap-0"
                                style={{
                                    border: `2.5px solid ${PT.ink}`,
                                    boxShadow: `4px 4px 0 ${PT.ink}`,
                                    background: "#fff",
                                }}
                                data-testid="cal-stats"
                            >
                                <StatCell label="eventos" value={stats.total} accentTop={EXT.azul} />
                                <StatCell label="regiões" value={stats.regions} accentTop={EXT.forest} />
                                <StatCell label="categorias" value={stats.categories} accentTop={EXT.terracotta} hideBorderRightOnMobile />
                                <StatCell
                                    label="agora"
                                    value={stats.now}
                                    valueSuffix={stats.now === 1 ? "evento" : "eventos"}
                                    accent={stats.now > 0}
                                    accentTop={EXT.gold}
                                    spanFull
                                />
                            </div>
                        )}
                    </div>

                    {/* Year Compass — bloco horizontal a seguir ao masthead */}
                    {data && (
                        <div className="mt-6 sm:mt-7">
                            <YearCompass
                                year={data.year}
                                counts={compassData.counts}
                                todayMonthIdx={compassData.todayIdx}
                                currentMonthIdx={compassData.currentIdx}
                                maxCount={compassData.max}
                                onJump={scrollToMonthIdx}
                                totalFiltered={filtered.length}
                            />
                        </div>
                    )}

                    {/* CATEGORY LEGEND — palette key (chave cromática) */}
                    {data && Object.keys(catMetaMap).length > 0 && (
                        <CategoryLegend catMetaMap={catMetaMap} catCounts={catCounts} activeCat={cat} onPick={setCat} />
                    )}
                </header>

                {/* ═══════════════════════════════════════════════════
                    HIGHLIGHTS — "A seguir"
                ═══════════════════════════════════════════════════ */}
                {data && data.next3?.length > 0 && (
                    <section className="mb-9 sm:mb-11" data-testid="cal-next3">
                        <div className="flex items-center justify-between mb-3 pl-0.5">
                            <div className="inline-flex items-center gap-2">
                                <Flame size={13} strokeWidth={2.4} style={{ color: PT.red }} />
                                <Overline data-testid="cal-next3-heading">// a seguir</Overline>
                            </div>
                            <span
                                className="sm:hidden inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.14em]"
                                style={{ color: "rgba(10,10,10,0.40)" }}
                            >
                                desliza <ChevronRight size={11} strokeWidth={2.4} />
                            </span>
                        </div>
                        <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory -mx-3 px-3 pb-2 sm:hidden" style={HIDE_SCROLLBAR} data-testid="cal-next3-mobile">
                            {data.next3.map((ev) => (
                                <Highlight key={ev.key} ev={ev} catMetaMap={catMetaMap} />
                            ))}
                        </div>
                        <div className="hidden sm:grid sm:grid-cols-3 gap-4">
                            {data.next3.map((ev) => (
                                <Highlight key={ev.key} ev={ev} catMetaMap={catMetaMap} />
                            ))}
                        </div>
                    </section>
                )}

                {/* ═══════════════════════════════════════════════════
                    FILTROS — painel colapsável
                ═══════════════════════════════════════════════════ */}
                <section className="mb-10 sm:mb-12" data-testid="cal-filters">
                    <button
                        type="button"
                        onClick={() => setFiltersOpen((o) => !o)}
                        aria-expanded={filtersOpen}
                        aria-controls="cal-filters-panel"
                        data-testid="cal-filters-toggle"
                        className="w-full flex items-center justify-between gap-3 px-3 sm:px-4 py-2.5 sm:py-3 transition-colors"
                        style={{
                            background: filtersOpen ? PT.ink : "#fff",
                            color: filtersOpen ? PT.cream : PT.ink,
                            border: `2.5px solid ${PT.ink}`,
                            boxShadow: filtersOpen ? "none" : `4px 4px 0 ${PT.ink}`,
                            transform: filtersOpen ? "translate(4px,4px)" : "none",
                            transition: "transform 0.08s, background 0.12s",
                        }}
                    >
                        <span className="inline-flex items-center gap-2 min-w-0">
                            <Filter size={13} strokeWidth={2.4} />
                            <span className="font-mono font-bold uppercase tracking-[0.16em] text-[11px]">filtrar agenda</span>
                            {hasActiveFilters && (
                                <span
                                    className="inline-flex items-center px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase tracking-[0.12em]"
                                    style={{
                                        background: filtersOpen ? PT.gold : PT.ink,
                                        color: filtersOpen ? PT.ink : PT.cream,
                                    }}
                                    data-testid="cal-active-count"
                                >
                                    {(cat !== "all" ? 1 : 0) + (region !== "all" ? 1 : 0) + (showPast ? 1 : 0)} ativos
                                </span>
                            )}
                        </span>
                        <span className="inline-flex items-center gap-2 flex-shrink-0">
                            <span className="hidden sm:inline font-mono text-[10px] uppercase tracking-[0.14em] opacity-70">
                                {filtered.length} resultados
                            </span>
                            <ChevronDown
                                size={14}
                                strokeWidth={2.4}
                                style={{ transform: filtersOpen ? "rotate(180deg)" : "none", transition: "transform 0.18s" }}
                            />
                        </span>
                    </button>

                    {filtersOpen && (
                        <div
                            id="cal-filters-panel"
                            className="cal-reveal p-3 sm:p-4 mt-2.5"
                            style={{
                                background: "#fff",
                                border: `2.5px solid ${PT.ink}`,
                                borderTop: `2px dashed ${PT.ink}`,
                                boxShadow: `4px 4px 0 ${PT.ink}`,
                            }}
                        >
                            <div className="flex items-center justify-between mb-3">
                                <Overline>// filtros</Overline>
                                {hasActiveFilters && (
                                    <button
                                        type="button"
                                        onClick={clearFilters}
                                        data-testid="cal-clear-filters"
                                        className="inline-flex items-center gap-1 font-mono text-[10.5px] font-bold uppercase tracking-[0.14em] underline-offset-4 hover:underline"
                                        style={{ color: PT.red }}
                                    >
                                        <X size={11} strokeWidth={2.6} />
                                        limpar
                                    </button>
                                )}
                            </div>

                            <div className="mb-3">
                                <span className="font-mono text-[10px] uppercase tracking-[0.14em] block mb-1.5" style={{ color: "rgba(10,10,10,0.45)" }}>
                                    categoria
                                </span>
                                <div className="flex sm:flex-wrap gap-2 overflow-x-auto sm:overflow-visible snap-x snap-mandatory sm:snap-none -mx-3 px-3 sm:mx-0 sm:px-0 pb-1 sm:pb-0" style={HIDE_SCROLLBAR}>
                                    {catChips.map((c) => (
                                        <CategoryChip
                                            key={c.key}
                                            meta={c}
                                            active={cat === c.key}
                                            count={catCounts[c.key] || 0}
                                            onClick={() => setCat(c.key)}
                                        />
                                    ))}
                                </div>
                            </div>

                            <div className="mt-3">
                                <span className="font-mono text-[10px] uppercase tracking-[0.14em] block mb-1.5" style={{ color: "rgba(10,10,10,0.45)" }}>
                                    região
                                </span>
                                <div className="flex sm:flex-wrap items-center gap-2 overflow-x-auto sm:overflow-visible snap-x snap-mandatory sm:snap-none -mx-3 px-3 sm:mx-0 sm:px-0 pb-1 sm:pb-0" style={HIDE_SCROLLBAR}>
                                    {Object.keys(regionMetaMap).map((rk) => (
                                        <button
                                            key={rk}
                                            type="button"
                                            data-testid={`cal-reg-${rk}`}
                                            onClick={() => setRegion(rk)}
                                            aria-pressed={region === rk}
                                            className="tap-shrink px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-[0.10em] whitespace-nowrap flex-shrink-0 snap-start"
                                            style={{
                                                background: region === rk ? PT.ink : "transparent",
                                                color: region === rk ? PT.cream : PT.ink,
                                                border: `2px solid ${PT.ink}`,
                                            }}
                                        >
                                            {regionMetaMap[rk].label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="mt-4 flex items-center justify-between gap-3 flex-wrap">
                                <label className="inline-flex items-center gap-2 cursor-pointer select-none" data-testid="cal-toggle-past">
                                    <input
                                        type="checkbox"
                                        checked={showPast}
                                        onChange={(e) => setShowPast(e.target.checked)}
                                        className="w-4 h-4 accent-black"
                                    />
                                    <span className="font-mono font-bold uppercase tracking-[0.14em] text-[10px]" style={{ color: "rgba(10,10,10,0.65)" }}>
                                        mostrar passados
                                    </span>
                                </label>
                                <div className="sm:hidden">
                                    <DensityToggle value={density} onChange={setDensity} />
                                </div>
                            </div>
                        </div>
                    )}
                </section>

                {/* ─── ESTADO ─── */}
                {loading && (
                    <div className="py-20 text-center">
                        <div className="inline-flex items-center gap-2">
                            <Sparkles size={14} strokeWidth={2.4} className="animate-pulse" style={{ color: PT.gold }} />
                            <Overline color="rgba(10,10,10,0.45)">a carregar agenda…</Overline>
                        </div>
                    </div>
                )}

                {error && !loading && (
                    <div
                        className="p-6 text-center"
                        style={{ background: "#fff", border: `2.5px solid ${PT.red}`, boxShadow: `4px 4px 0 ${PT.ink}` }}
                    >
                        <p className="font-black mb-1">Não foi possível carregar.</p>
                        <p className="text-sm font-mono" style={{ color: "rgba(10,10,10,0.6)" }}>{error}</p>
                    </div>
                )}

                {!loading && !error && monthKeys.length === 0 && (
                    <div className="p-8 text-center" style={{ background: "#fff", border: `2.5px dashed ${PT.ink}` }} data-testid="cal-empty">
                        <CalendarDays size={32} strokeWidth={2.2} style={{ color: PT.ink, margin: "0 auto 10px" }} />
                        <p className="font-black">Nada nesta combinação.</p>
                        <p className="text-sm font-mono mt-1" style={{ color: "rgba(10,10,10,0.6)" }}>
                            Tenta outra categoria ou região.
                        </p>
                        {hasActiveFilters && (
                            <button
                                type="button"
                                onClick={clearFilters}
                                className="mt-4 inline-flex items-center gap-1 font-mono text-xs font-bold uppercase tracking-[0.14em]"
                                style={{
                                    background: PT.ink, color: PT.cream, padding: "6px 12px",
                                    border: `2px solid ${PT.ink}`, boxShadow: `3px 3px 0 ${PT.red}`,
                                }}
                            >
                                limpar filtros
                            </button>
                        )}
                    </div>
                )}

                {!loading && !error && monthKeys.map((mk) => (
                    <MonthSection
                        key={mk}
                        monthKey={mk}
                        events={byMonth[mk]}
                        catMetaMap={catMetaMap}
                        isCurrent={currentMonth === mk}
                        density={density}
                    />
                ))}

                {/* RODAPÉ */}
                {!loading && data && (
                    <footer
                        className="mt-12 p-5 text-center"
                        style={{ background: "transparent", border: `2.5px dashed ${PT.ink}` }}
                    >
                        <Overline color="rgba(10,10,10,0.55)">
                            // {data.total} eventos curados · datas confirmadas para {data.year}
                        </Overline>
                        <p className="font-mono text-[9.5px] sm:text-[10px] mt-1" style={{ color: "rgba(10,10,10,0.40)" }}>
                            Fontes oficiais e calendários municipais. Atualizado em {data.today}.
                        </p>
                    </footer>
                )}
            </div>
        </PtPageShell>
    );
}

/* ════════════════════════════════════════════════════════════════
   StatCell — célula da stat strip
   ════════════════════════════════════════════════════════════════ */
function StatCell({ label, value, valueSuffix, accent = false, spanFull = false, hideBorderRightOnMobile = false, accentTop }) {
    return (
        <div
            className={`relative p-3 sm:p-4 ${spanFull ? "col-span-3 sm:col-span-1 border-t-2 sm:border-t-0 border-black" : (hideBorderRightOnMobile ? "sm:border-r-2 border-black" : "border-r-2 border-black")}`}
            style={{ background: accent ? PT.red : "transparent" }}
        >
            {accentTop && !accent && (
                <span
                    aria-hidden
                    className="absolute left-0 right-0 top-0"
                    style={{ height: 3, background: accentTop }}
                />
            )}
            <Overline color={accent ? "rgba(255,255,255,0.80)" : "rgba(10,10,10,0.50)"}>{label}</Overline>
            <p
                className="font-black leading-none mt-1.5"
                style={{ color: accent ? "#fff" : PT.ink, fontSize: "clamp(20px, 4.6vw, 30px)" }}
            >
                {value}
                {valueSuffix && (
                    <span className="font-mono font-bold text-[10px] sm:text-xs uppercase tracking-[0.14em] align-middle opacity-80 ml-1">
                        {valueSuffix}
                    </span>
                )}
            </p>
        </div>
    );
}

/* ════════════════════════════════════════════════════════════════
   CalendarioStyles — animações de entrada (stagger reveals)
   ════════════════════════════════════════════════════════════════ */
function CalendarioStyles() {
    return (
        <style>{`
            @keyframes cal-reveal-in {
                0% { opacity: 0; transform: translateY(8px); }
                100% { opacity: 1; transform: translateY(0); }
            }
            .cal-reveal {
                animation: cal-reveal-in 0.42s cubic-bezier(0.22, 0.61, 0.36, 1) both;
            }
            @media (prefers-reduced-motion: reduce) {
                .cal-reveal { animation: none; }
            }
            /* Compass cell borders — responsive (6×2 mobile / 12×1 sm+) */
            .cal-compass-cell {
                border-right: 1.5px solid #0A0A0A;
                border-bottom: 1.5px solid #0A0A0A;
            }
            .cal-compass-cell:nth-child(6n) { border-right: none; }
            .cal-compass-cell:nth-child(n+7) { border-bottom: none; }
            @media (min-width: 640px) {
                .cal-compass-cell { border-bottom: none; border-right: 1.5px solid #0A0A0A; }
                .cal-compass-cell:nth-child(6n) { border-right: 1.5px solid #0A0A0A; }
                .cal-compass-cell:nth-child(12) { border-right: none; }
            }
            /* Legenda cromática — grid 2×5 (mobile) / 5×2 (sm+) */
            .cal-legend-cell {
                border-right: 1.5px solid #0A0A0A;
                border-bottom: 1.5px solid #0A0A0A;
            }
            .cal-legend-cell:nth-child(2n) { border-right: none; }
            .cal-legend-cell:nth-last-child(-n+2) { border-bottom: none; }
            .cal-legend-cell:hover { filter: brightness(0.97); }
            .cal-legend-cell[aria-pressed="true"]:hover { filter: brightness(1.05); }
            @media (min-width: 640px) {
                .cal-legend-cell {
                    border-right: 1.5px solid #0A0A0A;
                    border-bottom: 1.5px solid #0A0A0A;
                }
                .cal-legend-cell:nth-child(2n) { border-right: 1.5px solid #0A0A0A; }
                .cal-legend-cell:nth-child(5n) { border-right: none; }
                .cal-legend-cell:nth-last-child(-n+2) { border-bottom: 1.5px solid #0A0A0A; }
                .cal-legend-cell:nth-last-child(-n+5) { border-bottom: none; }
            }
        `}</style>
    );
}
