import { useEffect, useMemo, useRef, useState } from "react";
// =============================================================================
// LUSORAE EDITORIAL — clean redesign (Jun 2026)
// 5 lentes profissionais aplicadas:
//   1. Senior Product Designer (Linear/Notion/Stripe) — depurar decoração,
//      hierarquia única, profundidade via sombras difusas (não bordas grossas).
//   2. Information Architect — agenda como informação (Quando · Onde · O quê
//      · Categoria), agrupamento mensal limpo, scan-first.
//   3. Frontend Engineer Senior — <time> semântico, CSS-only animations
//      respeitando prefers-reduced-motion, IntersectionObserver fluido.
//   4. Calendar UX Specialist (Cal.com / Google / Fantastical) — today subtle,
//      "agora" unobtrusivo, year strip = bar chart minimal, agrupamento por dia.
//   5. Accessibility (WCAG AA) — contrast ≥4.5, aria-current/pressed/live,
//      focus rings, tap targets ≥40px.
// =============================================================================
import {
    CalendarDays, MapPin, ExternalLink, Filter, ChevronRight, X,
    LayoutGrid, AlignJustify, ChevronDown, Sparkles, Flame, Star, Dot,
} from "lucide-react";
import { api } from "../lib/api";
import { PageHeader } from "../components/PageHeader";
import { PtPageShell } from "../components/PtPageShell";
import { PT } from "../theme/editorial";

/* ════════════════════════════════════════════════════════════════
   Tokens & helpers
   ════════════════════════════════════════════════════════════════ */
const MONTH_PT = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const MONTH_PT_SHORT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const ALL_CATS = { key: "all", label: "Tudo", emoji: "✦" };
const HIDE_SCROLLBAR = { scrollbarWidth: "none", msOverflowStyle: "none" };
const LS_DENSITY_KEY = "lusorae.cal.density";

// Lusorae Editorial primitives — alinhado com PageHeader / FeedAside / RightSidebar.
const HAIRLINE = "1px solid rgba(10,10,10,0.08)";
const HAIRLINE_STRONG = "1px solid rgba(10,10,10,0.12)";
const SHADOW_SOFT = "0 1px 2px rgba(0,0,0,0.04), 0 8px 24px -8px rgba(0,0,0,0.12)";
const SHADOW_HOVER = "0 2px 4px rgba(0,0,0,0.05), 0 14px 32px -12px rgba(0,0,0,0.16)";
const INK_MUTE = "rgba(10,10,10,0.58)";
const INK_MUTE_2 = "rgba(10,10,10,0.45)";

const fmtDate = (iso) => {
    const d = new Date(iso + "T00:00:00");
    return { day: d.getDate(), month: MONTH_PT[d.getMonth()].slice(0, 3).toLowerCase(), monthIdx: d.getMonth() };
};

const dateRangeLabel = (start, end) => {
    if (!end || end === start) {
        const d = new Date(start + "T00:00:00");
        return `${d.getDate()} de ${MONTH_PT[d.getMonth()].toLowerCase()}`;
    }
    const a = new Date(start + "T00:00:00");
    const b = new Date(end + "T00:00:00");
    if (a.getMonth() === b.getMonth()) {
        return `${a.getDate()}–${b.getDate()} de ${MONTH_PT[a.getMonth()].toLowerCase()}`;
    }
    return `${a.getDate()} ${MONTH_PT[a.getMonth()].slice(0, 3).toLowerCase()} → ${b.getDate()} ${MONTH_PT[b.getMonth()].slice(0, 3).toLowerCase()}`;
};

const isFeaturedEvent = (ev) =>
    ev.status === "now" ||
    (typeof ev.days_until === "number" && ev.days_until >= 0 && ev.days_until <= 2 && ev.status !== "past");

/* ════════════════════════════════════════════════════════════════
   Kicker — pequena régua de meta (mono uppercase com dot pulse opcional)
   ════════════════════════════════════════════════════════════════ */
const Kicker = ({ children, color = INK_MUTE, dot = false, className = "" }) => (
    <span
        className={`inline-flex items-center gap-1.5 font-mono font-semibold uppercase tracking-[0.16em] text-[10.5px] ${className}`}
        style={{ color }}
    >
        {dot && <span aria-hidden className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: PT.red }} />}
        {children}
    </span>
);

/* ════════════════════════════════════════════════════════════════
   StatusPill — "agora" / "hoje" / "amanhã" / "em X dias" / "já passou"
   ════════════════════════════════════════════════════════════════ */
function StatusPill({ status, days, compact = false }) {
    const baseClass = compact
        ? "inline-flex items-center gap-1 px-2 py-[3px] text-[9.5px]"
        : "inline-flex items-center gap-1 px-2.5 py-[3px] text-[10px]";
    const fontClass = "font-mono font-semibold uppercase tracking-[0.12em] rounded-full";

    if (status === "now") {
        return (
            <span
                className={`${baseClass} ${fontClass}`}
                style={{ background: PT.red, color: "#fff" }}
                aria-live="polite"
            >
                <span aria-hidden className="inline-block w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                agora
            </span>
        );
    }
    if (status === "past") {
        return (
            <span
                className={`${baseClass} ${fontClass}`}
                style={{ background: "transparent", color: INK_MUTE_2, border: HAIRLINE }}
            >
                passou
            </span>
        );
    }
    if (typeof days === "number") {
        const label = days === 0 ? "hoje" : days === 1 ? "amanhã" : days <= 7 ? `em ${days} dias` : `em ${days}d`;
        const urgent = days <= 2;
        return (
            <span
                className={`${baseClass} ${fontClass}`}
                style={{
                    background: urgent ? "rgba(200,16,46,0.08)" : "rgba(10,10,10,0.05)",
                    color: urgent ? PT.red : "rgba(10,10,10,0.72)",
                    border: HAIRLINE,
                }}
            >
                {label}
            </span>
        );
    }
    return null;
}

/* ════════════════════════════════════════════════════════════════
   CategoryChip — pill 999px com count, hairline
   ════════════════════════════════════════════════════════════════ */
function CategoryChip({ meta, active, onClick, count }) {
    return (
        <button
            type="button"
            data-testid={`cal-cat-${meta.key}`}
            onClick={onClick}
            aria-pressed={active}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium whitespace-nowrap flex-shrink-0 snap-start rounded-full transition-all duration-150"
            style={{
                background: active ? PT.ink : "#fff",
                color: active ? "#fff" : PT.ink,
                border: active ? HAIRLINE_STRONG : HAIRLINE,
                boxShadow: active ? "0 4px 12px -4px rgba(10,10,10,0.25)" : "none",
            }}
        >
            <span aria-hidden style={{ opacity: 0.85 }}>{meta.emoji}</span>
            <span>{meta.label}</span>
            {typeof count === "number" && count > 0 && (
                <span
                    className="ml-0.5 text-[10.5px] font-mono"
                    style={{ color: active ? "rgba(255,255,255,0.6)" : INK_MUTE_2 }}
                >
                    {count}
                </span>
            )}
        </button>
    );
}

/* ════════════════════════════════════════════════════════════════
   YearStrip — bar chart minimal 12-mês com intensidade subtil
   Substitui o YearCompass colorido. Inspirado em Cal.com / Google.
   ════════════════════════════════════════════════════════════════ */
function YearStrip({ year, counts, todayMonthIdx, currentMonthIdx, maxCount, onJump, totalFiltered }) {
    return (
        <div
            data-testid="cal-compass"
            className="rounded-2xl overflow-hidden"
            style={{ background: "#fff", border: HAIRLINE, boxShadow: SHADOW_SOFT }}
        >
            <div
                className="flex items-center justify-between px-4 sm:px-5 py-3"
                style={{ borderBottom: HAIRLINE }}
            >
                <div className="inline-flex items-center gap-2">
                    <CalendarDays size={14} strokeWidth={2.2} style={{ color: PT.ink }} />
                    <span className="font-semibold tracking-tight text-[13.5px]" style={{ color: PT.ink }}>
                        Vista do ano
                    </span>
                    <span className="font-mono text-[11px]" style={{ color: INK_MUTE_2 }}>{year}</span>
                </div>
                <Kicker color={INK_MUTE_2}>{totalFiltered} no filtro</Kicker>
            </div>

            <div className="grid grid-cols-6 sm:grid-cols-12 px-2 sm:px-3 pt-3 pb-2 gap-1 sm:gap-1.5">
                {Array.from({ length: 12 }, (_, i) => {
                    const n = counts[i] || 0;
                    const isCurrent = currentMonthIdx === i;
                    const isToday = todayMonthIdx === i;
                    const intensity = maxCount > 0 ? n / maxCount : 0;
                    // Altura da barra (24–56px) com easing.
                    const barH = n === 0 ? 8 : Math.max(12, Math.round(12 + intensity * 44));
                    // Cor da barra: cinza neutro → ink. Today + current pintam acento.
                    let barBg = "rgba(10,10,10,0.08)";
                    if (n > 0) {
                        if (intensity > 0.65) barBg = "rgba(10,10,10,0.85)";
                        else if (intensity > 0.35) barBg = "rgba(10,10,10,0.55)";
                        else barBg = "rgba(10,10,10,0.28)";
                    }
                    if (isCurrent) barBg = PT.red;

                    return (
                        <button
                            key={i}
                            type="button"
                            onClick={() => onJump(i)}
                            disabled={n === 0}
                            data-testid={`cal-compass-${String(i + 1).padStart(2, "0")}`}
                            aria-label={`${MONTH_PT[i]} — ${n} ${n === 1 ? "evento" : "eventos"}`}
                            aria-current={isCurrent ? "true" : undefined}
                            className="group relative flex flex-col items-center justify-end gap-1.5 px-1 pt-3 pb-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 hover:bg-black/[0.025] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20"
                            style={{ minHeight: 78 }}
                        >
                            <div className="flex items-end justify-center w-full" style={{ height: 56 }}>
                                <span
                                    aria-hidden
                                    className="w-2.5 sm:w-3 rounded-t-sm transition-all duration-200"
                                    style={{ height: barH, background: barBg }}
                                />
                            </div>
                            <span
                                className="font-mono text-[10px] uppercase tracking-[0.10em] leading-none"
                                style={{ color: isCurrent ? PT.red : INK_MUTE, fontWeight: isCurrent ? 700 : 500 }}
                            >
                                {MONTH_PT_SHORT[i].toLowerCase()}
                            </span>
                            <span
                                className="font-semibold leading-none text-[11px] tabular-nums"
                                style={{ color: n === 0 ? INK_MUTE_2 : PT.ink, opacity: n === 0 ? 0.4 : 1 }}
                            >
                                {n}
                            </span>
                            {isToday && !isCurrent && (
                                <span
                                    aria-hidden
                                    className="absolute top-1.5 right-1.5 inline-block w-1.5 h-1.5 rounded-full"
                                    style={{ background: PT.red }}
                                />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

/* ════════════════════════════════════════════════════════════════
   EventCard — duas variantes (magazine / list)
   ════════════════════════════════════════════════════════════════ */
function EventCard({ ev, catMeta, density, indexInMonth }) {
    const { day, month } = fmtDate(ev.iso_date);
    const rangeLabel = dateRangeLabel(ev.iso_date, ev.iso_end);
    const isMulti = ev.iso_end && ev.iso_end !== ev.iso_date;
    const featured = isFeaturedEvent(ev);
    const accentColor = catMeta?.color || PT.ink;
    const delayMs = Math.min(indexInMonth * 24, 220);

    /* ───────── LISTA (densidade compacta) ───────── */
    if (density === "list") {
        return (
            <article
                id={`cal-event-${ev.key}`}
                data-testid={`cal-event-${ev.key}`}
                className="cal-reveal group grid grid-cols-[48px_1fr_auto] sm:grid-cols-[64px_1fr_auto] items-center gap-3 sm:gap-4 px-4 py-3 rounded-xl transition-all duration-200 hover:-translate-y-px"
                style={{
                    background: "#fff",
                    border: HAIRLINE,
                    boxShadow: SHADOW_SOFT,
                    animationDelay: `${delayMs}ms`,
                }}
            >
                <time
                    dateTime={ev.iso_date}
                    className="flex flex-col items-center justify-center leading-none rounded-lg py-2"
                    style={{
                        background: featured ? "rgba(200,16,46,0.06)" : "rgba(10,10,10,0.03)",
                        border: HAIRLINE,
                    }}
                >
                    <span className="font-mono uppercase tracking-[0.10em] text-[9.5px]" style={{ color: INK_MUTE }}>{month}</span>
                    <span className="font-black text-[19px] sm:text-[22px] tabular-nums mt-0.5" style={{ color: PT.ink }}>{day}</span>
                </time>
                <div className="min-w-0">
                    <h3
                        className="font-semibold leading-tight tracking-tight truncate"
                        style={{ color: PT.ink, fontSize: "clamp(14px, 3.4vw, 16px)" }}
                    >
                        {ev.emoji && <span className="mr-1" aria-hidden>{ev.emoji}</span>}
                        {ev.title}
                    </h3>
                    <div className="flex items-center gap-x-2.5 gap-y-0.5 flex-wrap text-[11.5px] mt-1" style={{ color: INK_MUTE }}>
                        <span className="inline-flex items-center gap-1.5">
                            <span aria-hidden className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: accentColor }} />
                            {catMeta?.label || ev.category}
                        </span>
                        {ev.city && (
                            <>
                                <Dot size={10} aria-hidden style={{ color: INK_MUTE_2 }} />
                                <span className="inline-flex items-center gap-0.5">
                                    <MapPin size={10} strokeWidth={2.2} aria-hidden />
                                    {ev.city}
                                </span>
                            </>
                        )}
                        <Dot size={10} aria-hidden style={{ color: INK_MUTE_2 }} />
                        <span>{rangeLabel}</span>
                    </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    <StatusPill status={ev.status} days={ev.days_until} compact />
                    {ev.url && (
                        <a
                            href={ev.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            data-testid={`cal-link-${ev.key}`}
                            aria-label={`site oficial — ${ev.title}`}
                            className="inline-flex items-center justify-center w-8 h-8 rounded-full transition-colors hover:bg-black/[0.04]"
                            style={{ color: PT.azul, border: HAIRLINE }}
                        >
                            <ExternalLink size={13} strokeWidth={2.2} />
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
            className="cal-reveal group relative grid grid-cols-[64px_1fr] sm:grid-cols-[96px_1fr] gap-4 sm:gap-6 p-4 sm:p-5 rounded-2xl transition-all duration-200 hover:-translate-y-0.5"
            style={{
                background: "#fff",
                border: HAIRLINE,
                boxShadow: SHADOW_SOFT,
                animationDelay: `${delayMs}ms`,
            }}
        >
            {/* faixa cromática hairline à esquerda — apenas se featured */}
            {featured && (
                <span
                    aria-hidden
                    className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full"
                    style={{ background: accentColor }}
                />
            )}

            {/* bloco de data — agenda style minimal */}
            <time
                dateTime={ev.iso_date}
                className="flex flex-col items-center justify-center py-3 rounded-xl"
                style={{
                    background: featured ? "rgba(200,16,46,0.05)" : "rgba(10,10,10,0.03)",
                    border: HAIRLINE,
                }}
            >
                <span className="font-mono text-[10px] uppercase tracking-[0.12em]" style={{ color: INK_MUTE }}>
                    {month}
                </span>
                <span className="font-black leading-none text-[28px] sm:text-[40px] tabular-nums mt-1" style={{ color: PT.ink, letterSpacing: "-0.02em" }}>
                    {day}
                </span>
                {isMulti && (
                    <span className="font-mono text-[9.5px] uppercase tracking-[0.10em] mt-1.5 text-center leading-none" style={{ color: INK_MUTE_2 }}>
                        → {fmtDate(ev.iso_end).day} {fmtDate(ev.iso_end).month}
                    </span>
                )}
            </time>

            {/* conteúdo */}
            <div className="min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span
                        className="inline-flex items-center gap-1.5 px-2 py-[3px] text-[10.5px] font-mono font-semibold uppercase tracking-[0.10em] rounded-full"
                        style={{
                            background: "rgba(10,10,10,0.04)",
                            color: PT.ink,
                            border: HAIRLINE,
                        }}
                    >
                        <span aria-hidden className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: accentColor }} />
                        {catMeta?.label || ev.category}
                    </span>
                    {ev.city && (
                        <span className="inline-flex items-center gap-1 font-mono text-[10.5px] uppercase tracking-[0.12em]" style={{ color: INK_MUTE }}>
                            <MapPin size={10} strokeWidth={2.2} aria-hidden />
                            {ev.city}
                        </span>
                    )}
                    <StatusPill status={ev.status} days={ev.days_until} compact />
                    {featured && ev.status !== "now" && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-[0.14em]" style={{ color: PT.red }}>
                            <Star size={10} strokeWidth={2.4} fill={PT.red} aria-hidden />
                            destaque
                        </span>
                    )}
                </div>

                <h3
                    className="font-black leading-[1.15] tracking-tight break-words"
                    style={{
                        color: PT.ink,
                        fontSize: featured ? "clamp(18px, 4.6vw, 24px)" : "clamp(16px, 4vw, 20px)",
                        letterSpacing: "-0.015em",
                    }}
                >
                    {ev.emoji && <span className="mr-1.5" aria-hidden>{ev.emoji}</span>}
                    {ev.title}
                </h3>

                {ev.subtitle && (
                    <p className="text-[13px] sm:text-[14px] leading-relaxed mt-2" style={{ color: "rgba(10,10,10,0.68)" }}>
                        {ev.subtitle}
                    </p>
                )}

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3">
                    <span className="font-mono text-[11px] uppercase tracking-[0.10em]" style={{ color: INK_MUTE }}>
                        {rangeLabel}
                    </span>
                    {ev.url && (
                        <a
                            href={ev.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            data-testid={`cal-link-${ev.key}`}
                            className="inline-flex items-center gap-1 text-[11px] font-medium underline-offset-4 hover:underline ml-auto"
                            style={{ color: PT.azul }}
                        >
                            site oficial
                            <ExternalLink size={11} strokeWidth={2.2} />
                        </a>
                    )}
                </div>
            </div>
        </article>
    );
}

/* ════════════════════════════════════════════════════════════════
   MonthSection — header minimal sem watermark gigante
   ════════════════════════════════════════════════════════════════ */
function MonthSection({ monthKey, events, catMetaMap, isCurrent, density }) {
    const [, m] = monthKey.split("-");
    const idx = parseInt(m, 10) - 1;
    const monthName = MONTH_PT[idx];
    const monthNum = String(parseInt(m, 10)).padStart(2, "0");

    const breakdown = useMemo(() => {
        const counts = {};
        for (const ev of events) counts[ev.category] = (counts[ev.category] || 0) + 1;
        return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 4);
    }, [events]);

    return (
        <section
            className="mb-10 sm:mb-12 first:mt-0 mt-8 sm:mt-10"
            id={`cal-month-${monthKey}`}
            data-testid={`cal-month-${monthKey}`}
        >
            <header className="mb-5 sm:mb-6 pb-4" style={{ borderBottom: HAIRLINE }}>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-baseline gap-3 min-w-0">
                        <span
                            className="font-mono text-[12px] uppercase tracking-[0.18em] tabular-nums"
                            style={{ color: INK_MUTE_2 }}
                        >
                            {monthNum}
                        </span>
                        <h2
                            className="font-black tracking-tight leading-none"
                            style={{
                                color: PT.ink,
                                fontSize: "clamp(22px, 5.5vw, 32px)",
                                letterSpacing: "-0.025em",
                            }}
                        >
                            {monthName}
                        </h2>
                        {isCurrent && (
                            <Kicker color={PT.red} dot>a ler</Kicker>
                        )}
                    </div>
                    <span className="font-mono text-[11px] tabular-nums" style={{ color: INK_MUTE }}>
                        {events.length} {events.length === 1 ? "evento" : "eventos"}
                    </span>
                </div>

                {breakdown.length > 0 && (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-3">
                        {breakdown.map(([catKey, n]) => {
                            const cm = catMetaMap[catKey];
                            return (
                                <span
                                    key={catKey}
                                    className="inline-flex items-center gap-1.5 text-[11px]"
                                    style={{ color: INK_MUTE }}
                                >
                                    <span aria-hidden className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: cm?.color || PT.ink }} />
                                    {cm?.label || catKey}
                                    <span className="font-mono tabular-nums" style={{ color: INK_MUTE_2 }}>· {n}</span>
                                </span>
                            );
                        })}
                    </div>
                )}
            </header>

            <div className={density === "list" ? "space-y-2" : "space-y-3 sm:space-y-3.5"}>
                {events.map((ev, i) => (
                    <EventCard key={ev.key} ev={ev} catMeta={catMetaMap[ev.category]} density={density} indexInMonth={i} />
                ))}
            </div>
        </section>
    );
}

/* ════════════════════════════════════════════════════════════════
   Highlight — cartões "a seguir" (mais clean, hover real)
   ════════════════════════════════════════════════════════════════ */
function Highlight({ ev, catMetaMap }) {
    if (!ev) return null;
    const meta = catMetaMap[ev.category];
    const { day, month } = fmtDate(ev.iso_date);
    const accentColor = meta?.color || PT.ink;
    const daysLabel = ev.days_until === 0 ? "hoje" : ev.days_until === 1 ? "amanhã" : `em ${ev.days_until} dias`;

    return (
        <a
            href={`#cal-event-${ev.key}`}
            data-testid={`cal-highlight-${ev.key}`}
            className="block w-[78vw] sm:w-auto flex-shrink-0 snap-start rounded-2xl p-4 transition-all duration-200 hover:-translate-y-0.5"
            style={{
                background: "#fff",
                border: HAIRLINE,
                boxShadow: SHADOW_SOFT,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.boxShadow = SHADOW_HOVER; }}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = SHADOW_SOFT; }}
        >
            <div className="flex items-start gap-3">
                <time
                    dateTime={ev.iso_date}
                    className="flex flex-col items-center justify-center w-14 h-14 shrink-0 rounded-xl"
                    style={{ background: "rgba(10,10,10,0.04)", border: HAIRLINE }}
                >
                    <span className="font-mono text-[10px] uppercase tracking-[0.12em]" style={{ color: INK_MUTE }}>{month}</span>
                    <span className="font-black text-[20px] tabular-nums leading-none mt-0.5" style={{ color: PT.ink, letterSpacing: "-0.02em" }}>{day}</span>
                </time>
                <div className="min-w-0 flex-1">
                    <Kicker color={ev.days_until <= 1 ? PT.red : INK_MUTE} dot={ev.days_until <= 1}>
                        {daysLabel}
                    </Kicker>
                    <p className="font-semibold leading-tight mt-1 truncate tracking-tight" style={{ color: PT.ink, fontSize: 15 }}>
                        {ev.emoji && <span className="mr-1" aria-hidden>{ev.emoji}</span>}
                        {ev.title}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1.5 text-[11.5px]" style={{ color: INK_MUTE }}>
                        <span aria-hidden className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: accentColor }} />
                        <span className="truncate">{meta?.label || ev.category}</span>
                        {ev.city && (
                            <>
                                <Dot size={10} aria-hidden />
                                <span className="inline-flex items-center gap-0.5 truncate">
                                    <MapPin size={10} strokeWidth={2.2} aria-hidden />
                                    {ev.city}
                                </span>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </a>
    );
}

/* ════════════════════════════════════════════════════════════════
   MonthJumpPill — sticky nav (limpo, sem hard shadows)
   ════════════════════════════════════════════════════════════════ */
function MonthJumpPill({ monthKey, count, onClick, isCurrent }) {
    const [, m] = monthKey.split("-");
    const idx = parseInt(m, 10) - 1;
    return (
        <button
            type="button"
            onClick={onClick}
            data-testid={`cal-jump-${monthKey}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 flex-shrink-0 snap-start rounded-full transition-all duration-150 hover:bg-black/[0.04]"
            style={{
                background: isCurrent ? PT.ink : "#fff",
                color: isCurrent ? "#fff" : PT.ink,
                border: isCurrent ? HAIRLINE_STRONG : HAIRLINE,
            }}
            aria-current={isCurrent ? "true" : undefined}
        >
            <span className="font-mono text-[10.5px] uppercase tracking-[0.10em] leading-none">
                {MONTH_PT_SHORT[idx].toLowerCase()}
            </span>
            <span
                className="font-mono text-[10.5px] tabular-nums leading-none"
                style={{ color: isCurrent ? "rgba(255,255,255,0.6)" : INK_MUTE_2 }}
            >
                {count}
            </span>
        </button>
    );
}

/* ════════════════════════════════════════════════════════════════
   DensityToggle — pill segmented control
   ════════════════════════════════════════════════════════════════ */
function DensityToggle({ value, onChange, idPrefix = "cal-density" }) {
    const opts = [
        { key: "magazine", label: "revista", icon: LayoutGrid },
        { key: "list", label: "lista", icon: AlignJustify },
    ];
    return (
        <div
            className="inline-flex items-center flex-shrink-0 rounded-full overflow-hidden p-0.5"
            data-testid={idPrefix}
            role="radiogroup"
            aria-label="densidade da agenda"
            style={{ border: HAIRLINE, background: "rgba(10,10,10,0.04)" }}
        >
            {opts.map((o) => {
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
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 font-medium text-[11px] rounded-full transition-all duration-150"
                        style={{
                            background: active ? "#fff" : "transparent",
                            color: active ? PT.ink : INK_MUTE,
                            boxShadow: active ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                        }}
                    >
                        <Icon size={11} strokeWidth={2.2} />
                        {o.label}
                    </button>
                );
            })}
        </div>
    );
}

/* ════════════════════════════════════════════════════════════════
   StatCell — célula da stat strip (clean)
   ════════════════════════════════════════════════════════════════ */
function StatCell({ label, value, valueSuffix, accent = false, noBorder = false }) {
    return (
        <div
            className={`px-4 py-3.5 ${noBorder ? "" : "border-r"}`}
            style={{
                borderColor: "rgba(10,10,10,0.08)",
                background: accent ? "rgba(200,16,46,0.04)" : "transparent",
            }}
        >
            <Kicker color={accent ? PT.red : INK_MUTE_2} dot={accent && value > 0}>{label}</Kicker>
            <p
                className="font-black leading-none mt-1.5 tracking-tight tabular-nums"
                style={{ color: accent && value > 0 ? PT.red : PT.ink, fontSize: "clamp(20px, 4vw, 26px)", letterSpacing: "-0.02em" }}
            >
                {value}
                {valueSuffix && (
                    <span className="font-mono font-medium text-[10px] uppercase tracking-[0.14em] ml-1.5" style={{ color: INK_MUTE_2 }}>
                        {valueSuffix}
                    </span>
                )}
            </p>
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

    /* YearStrip — contagem por índice de mês 0..11 do ANO do dataset */
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

    /* IntersectionObserver — actualiza "mês a ler" no sticky nav */
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

    return (
        <PtPageShell testid="page-calendario">
            <CalendarioStyles />
            <PageHeader title="Calendário" subtitle="Portugal · 2026" testid="calendar-header" />

            {/* ─── STICKY MONTH NAV ─── */}
            {data && monthKeys.length > 1 && (
                <div
                    className="sticky z-20 backdrop-blur"
                    style={{
                        top: "calc(var(--mobile-topbar-h) + 56px)",
                        background: "rgba(255,255,255,0.92)",
                        borderBottom: HAIRLINE,
                    }}
                    data-testid="cal-monthnav"
                >
                    <div className="lg:max-w-[1100px] lg:mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex items-center gap-2 py-2.5 overflow-x-auto snap-x snap-mandatory" style={HIDE_SCROLLBAR}>
                            <Kicker color={INK_MUTE_2} className="flex-shrink-0 pr-1.5" >
                                {currentMonthLabel ? (
                                    <>a ler · <span style={{ color: PT.red, fontWeight: 700 }}>{currentMonthLabel.toLowerCase()}</span></>
                                ) : (
                                    <>saltar →</>
                                )}
                            </Kicker>
                            {monthKeys.map((mk) => (
                                <MonthJumpPill
                                    key={mk}
                                    monthKey={mk}
                                    count={byMonth[mk].length}
                                    isCurrent={currentMonth === mk}
                                    onClick={() => scrollToMonth(mk)}
                                />
                            ))}
                            <div className="flex-shrink-0 ml-auto pl-2 hidden sm:block">
                                <DensityToggle value={density} onChange={setDensity} idPrefix="cal-density-nav" />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-24 lg:max-w-[1100px] lg:mx-auto">
                {/* ═══════════════════════════════════════════════════
                    MASTHEAD — minimal, único H1, intro de duas linhas
                ═══════════════════════════════════════════════════ */}
                <header className="mb-8 sm:mb-10" data-testid="cal-masthead">
                    <Kicker color={INK_MUTE_2} dot>curadoria editorial</Kicker>
                    <h1
                        className="mt-3 font-black tracking-tight"
                        style={{
                            color: PT.ink,
                            fontSize: "clamp(28px, 5.8vw, 44px)",
                            letterSpacing: "-0.03em",
                            lineHeight: "1.05",
                        }}
                    >
                        O que vem aí em Portugal
                    </h1>
                    <p
                        className="max-w-[620px] mt-3 text-[14.5px] sm:text-[15.5px] leading-relaxed"
                        style={{ color: "rgba(10,10,10,0.62)" }}
                    >
                        Feriados, festas das cidades, festivais, romarias e dias para marcar — da Brejeira ao Pico,
                        do Carnaval ao Magusto. Um mapa afectivo dos próximos meses.
                    </p>

                    {/* STAT STRIP — clean, sem fundos saturados, hairlines */}
                    {stats && (
                        <div
                            className="mt-6 grid grid-cols-2 sm:grid-cols-4 rounded-2xl overflow-hidden"
                            style={{ background: "#fff", border: HAIRLINE, boxShadow: SHADOW_SOFT }}
                            data-testid="cal-stats"
                        >
                            <StatCell label="eventos" value={stats.total} />
                            <StatCell label="regiões" value={stats.regions} />
                            <StatCell label="categorias" value={stats.categories} noBorder />
                            <StatCell
                                label="agora"
                                value={stats.now}
                                valueSuffix={stats.now === 1 ? "evento" : "eventos"}
                                accent={stats.now > 0}
                                noBorder
                            />
                        </div>
                    )}

                    {/* YearStrip — bar chart minimal */}
                    {data && (
                        <div className="mt-6">
                            <YearStrip
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
                </header>

                {/* ═══════════════════════════════════════════════════
                    HIGHLIGHTS — "A seguir"
                ═══════════════════════════════════════════════════ */}
                {data && data.next3?.length > 0 && (
                    <section className="mb-8 sm:mb-10" data-testid="cal-next3">
                        <div className="flex items-center justify-between mb-4">
                            <div className="inline-flex items-center gap-2">
                                <Flame size={14} strokeWidth={2.2} style={{ color: PT.red }} />
                                <h2 className="font-semibold tracking-tight text-[14px]" data-testid="cal-next3-heading" style={{ color: PT.ink }}>
                                    A seguir
                                </h2>
                            </div>
                            <span
                                className="sm:hidden inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.14em]"
                                style={{ color: INK_MUTE_2 }}
                            >
                                desliza <ChevronRight size={11} strokeWidth={2.2} />
                            </span>
                        </div>
                        <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory -mx-4 px-4 pb-1 sm:hidden" style={HIDE_SCROLLBAR} data-testid="cal-next3-mobile">
                            {data.next3.map((ev) => (
                                <Highlight key={ev.key} ev={ev} catMetaMap={catMetaMap} />
                            ))}
                        </div>
                        <div className="hidden sm:grid sm:grid-cols-3 gap-3">
                            {data.next3.map((ev) => (
                                <Highlight key={ev.key} ev={ev} catMetaMap={catMetaMap} />
                            ))}
                        </div>
                    </section>
                )}

                {/* ═══════════════════════════════════════════════════
                    FILTROS — botão minimal + painel rounded
                ═══════════════════════════════════════════════════ */}
                <section className="mb-8 sm:mb-10" data-testid="cal-filters">
                    <button
                        type="button"
                        onClick={() => setFiltersOpen((o) => !o)}
                        aria-expanded={filtersOpen}
                        aria-controls="cal-filters-panel"
                        data-testid="cal-filters-toggle"
                        className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl transition-all duration-150"
                        style={{
                            background: filtersOpen ? PT.ink : "#fff",
                            color: filtersOpen ? "#fff" : PT.ink,
                            border: filtersOpen ? HAIRLINE_STRONG : HAIRLINE,
                            boxShadow: filtersOpen ? "none" : SHADOW_SOFT,
                        }}
                    >
                        <span className="inline-flex items-center gap-2 min-w-0">
                            <Filter size={14} strokeWidth={2.2} />
                            <span className="font-semibold text-[13.5px] tracking-tight">Filtrar agenda</span>
                            {hasActiveFilters && (
                                <span
                                    className="inline-flex items-center px-2 py-[2px] text-[10px] font-mono uppercase tracking-[0.12em] rounded-full"
                                    style={{
                                        background: filtersOpen ? PT.gold : "rgba(200,16,46,0.10)",
                                        color: filtersOpen ? PT.ink : PT.red,
                                    }}
                                    data-testid="cal-active-count"
                                >
                                    {(cat !== "all" ? 1 : 0) + (region !== "all" ? 1 : 0) + (showPast ? 1 : 0)} ativos
                                </span>
                            )}
                        </span>
                        <span className="inline-flex items-center gap-2.5 flex-shrink-0">
                            <span className="hidden sm:inline font-mono text-[11px] tabular-nums" style={{ opacity: 0.7 }}>
                                {filtered.length} resultados
                            </span>
                            <ChevronDown
                                size={15}
                                strokeWidth={2.2}
                                style={{ transform: filtersOpen ? "rotate(180deg)" : "none", transition: "transform 0.18s" }}
                            />
                        </span>
                    </button>

                    {filtersOpen && (
                        <div
                            id="cal-filters-panel"
                            className="cal-reveal p-4 sm:p-5 mt-2 rounded-2xl"
                            style={{
                                background: "#fff",
                                border: HAIRLINE,
                                boxShadow: SHADOW_SOFT,
                            }}
                        >
                            <div className="flex items-center justify-between mb-3.5">
                                <Kicker color={INK_MUTE}>filtros</Kicker>
                                {hasActiveFilters && (
                                    <button
                                        type="button"
                                        onClick={clearFilters}
                                        data-testid="cal-clear-filters"
                                        className="inline-flex items-center gap-1 text-[12px] font-medium hover:underline underline-offset-4"
                                        style={{ color: PT.red }}
                                    >
                                        <X size={12} strokeWidth={2.4} />
                                        Limpar
                                    </button>
                                )}
                            </div>

                            <div className="mb-4">
                                <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] block mb-2" style={{ color: INK_MUTE_2 }}>
                                    categoria
                                </span>
                                <div className="flex sm:flex-wrap gap-2 overflow-x-auto sm:overflow-visible snap-x snap-mandatory sm:snap-none -mx-4 px-4 sm:mx-0 sm:px-0 pb-1 sm:pb-0" style={HIDE_SCROLLBAR}>
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

                            <div>
                                <span className="font-mono text-[10.5px] uppercase tracking-[0.14em] block mb-2" style={{ color: INK_MUTE_2 }}>
                                    região
                                </span>
                                <div className="flex sm:flex-wrap items-center gap-2 overflow-x-auto sm:overflow-visible snap-x snap-mandatory sm:snap-none -mx-4 px-4 sm:mx-0 sm:px-0 pb-1 sm:pb-0" style={HIDE_SCROLLBAR}>
                                    {Object.keys(regionMetaMap).map((rk) => {
                                        const active = region === rk;
                                        return (
                                            <button
                                                key={rk}
                                                type="button"
                                                data-testid={`cal-reg-${rk}`}
                                                onClick={() => setRegion(rk)}
                                                aria-pressed={active}
                                                className="px-3 py-1.5 text-[12px] font-medium whitespace-nowrap flex-shrink-0 snap-start rounded-full transition-all duration-150"
                                                style={{
                                                    background: active ? PT.ink : "#fff",
                                                    color: active ? "#fff" : PT.ink,
                                                    border: active ? HAIRLINE_STRONG : HAIRLINE,
                                                }}
                                            >
                                                {regionMetaMap[rk].label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="mt-4 pt-4 flex items-center justify-between gap-3 flex-wrap" style={{ borderTop: HAIRLINE }}>
                                <label className="inline-flex items-center gap-2 cursor-pointer select-none" data-testid="cal-toggle-past">
                                    <input
                                        type="checkbox"
                                        checked={showPast}
                                        onChange={(e) => setShowPast(e.target.checked)}
                                        className="w-4 h-4 rounded accent-black"
                                    />
                                    <span className="text-[12.5px]" style={{ color: "rgba(10,10,10,0.72)" }}>
                                        Mostrar eventos passados
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
                            <Sparkles size={14} strokeWidth={2.2} className="animate-pulse" style={{ color: PT.gold }} />
                            <Kicker color={INK_MUTE_2}>a carregar agenda…</Kicker>
                        </div>
                    </div>
                )}

                {error && !loading && (
                    <div
                        className="p-6 rounded-2xl text-center"
                        style={{ background: "#fff", border: HAIRLINE, boxShadow: SHADOW_SOFT }}
                    >
                        <p className="font-semibold mb-1 tracking-tight" style={{ color: PT.ink }}>Não foi possível carregar.</p>
                        <p className="text-[13px]" style={{ color: INK_MUTE }}>{error}</p>
                    </div>
                )}

                {!loading && !error && monthKeys.length === 0 && (
                    <div
                        className="p-8 rounded-2xl text-center"
                        style={{ background: "#fff", border: HAIRLINE, boxShadow: SHADOW_SOFT }}
                        data-testid="cal-empty"
                    >
                        <CalendarDays size={28} strokeWidth={2.2} style={{ color: INK_MUTE, margin: "0 auto 12px" }} />
                        <p className="font-semibold tracking-tight" style={{ color: PT.ink }}>Nada nesta combinação.</p>
                        <p className="text-[13px] mt-1" style={{ color: INK_MUTE }}>
                            Tenta outra categoria ou região.
                        </p>
                        {hasActiveFilters && (
                            <button
                                type="button"
                                onClick={clearFilters}
                                className="mt-5 inline-flex items-center gap-1.5 text-[12.5px] font-medium rounded-full px-4 py-2 transition-all duration-150"
                                style={{
                                    background: PT.ink,
                                    color: "#fff",
                                    boxShadow: "0 4px 12px -4px rgba(10,10,10,0.25)",
                                }}
                            >
                                Limpar filtros
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
                        className="mt-12 p-5 rounded-2xl text-center"
                        style={{ background: "rgba(10,10,10,0.02)", border: HAIRLINE }}
                    >
                        <Kicker color={INK_MUTE}>{data.total} eventos curados · {data.year}</Kicker>
                        <p className="text-[11.5px] mt-1.5" style={{ color: INK_MUTE_2 }}>
                            Fontes oficiais e calendários municipais. Atualizado em {data.today}.
                        </p>
                    </footer>
                )}
            </div>
        </PtPageShell>
    );
}

/* ════════════════════════════════════════════════════════════════
   CalendarioStyles — micro-animations (stagger reveals)
   ════════════════════════════════════════════════════════════════ */
function CalendarioStyles() {
    return (
        <style>{`
            @keyframes cal-reveal-in {
                0% { opacity: 0; transform: translateY(6px); }
                100% { opacity: 1; transform: translateY(0); }
            }
            .cal-reveal {
                animation: cal-reveal-in 0.36s cubic-bezier(0.22, 0.61, 0.36, 1) both;
            }
            @media (prefers-reduced-motion: reduce) {
                .cal-reveal { animation: none; }
            }
        `}</style>
    );
}
