import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, MapPin, ExternalLink, Filter, ChevronRight } from "lucide-react";
import { api } from "../lib/api";
import { PageHeader } from "../components/PageHeader";
import { PtPageShell } from "../components/PtPageShell";
import { PT, Sticker, StampCircle } from "./auth/AuthDecor";

const MONTH_PT = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const MONTH_PT_SHORT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

const ALL_CATS = { key: "all", label: "Tudo", emoji: "✦" };

// Esconde scrollbar visual mantendo a funcionalidade — usado nas faixas
// horizontais (filtros e nav de meses) no mobile.
const HIDE_SCROLLBAR = {
    scrollbarWidth: "none",
    msOverflowStyle: "none",
};

function fmtDate(iso) {
    const d = new Date(iso + "T00:00:00");
    return { day: d.getDate(), month: MONTH_PT[d.getMonth()].slice(0, 3).toUpperCase() };
}

function dateRangeLabel(start, end) {
    if (!end || end === start) {
        const d = new Date(start + "T00:00:00");
        return `${d.getDate()} de ${MONTH_PT[d.getMonth()]}`;
    }
    const a = new Date(start + "T00:00:00");
    const b = new Date(end + "T00:00:00");
    if (a.getMonth() === b.getMonth()) {
        return `${a.getDate()}–${b.getDate()} de ${MONTH_PT[a.getMonth()]}`;
    }
    return `${a.getDate()} ${MONTH_PT[a.getMonth()].slice(0, 3)} → ${b.getDate()} ${MONTH_PT[b.getMonth()].slice(0, 3)}`;
}

function StatusPill({ status, days }) {
    if (status === "now") {
        return (
            <span
                className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-[0.14em]"
                style={{
                    background: PT.red,
                    color: "#fff",
                    border: `2px solid ${PT.ink}`,
                    boxShadow: `2px 2px 0 ${PT.ink}`,
                }}
            >
                ● A decorrer
            </span>
        );
    }
    if (status === "past") {
        return (
            <span
                className="inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-[0.14em]"
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
        const label = days === 0 ? "Hoje" : days === 1 ? "Amanhã" : `daqui a ${days}d`;
        return (
            <span
                className="inline-flex items-center px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-[0.14em]"
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
            <span>{meta.emoji}</span>
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

function EventCard({ ev, catMeta }) {
    const { day, month } = fmtDate(ev.iso_date);
    const rangeLabel = dateRangeLabel(ev.iso_date, ev.iso_end);
    const isMulti = ev.iso_end && ev.iso_end !== ev.iso_date;
    return (
        <article
            id={`cal-event-${ev.key}`}
            data-testid={`cal-event-${ev.key}`}
            className="relative grid grid-cols-[56px_1fr] sm:grid-cols-[88px_1fr] gap-3 sm:gap-5 p-3 sm:p-5"
            style={{
                background: "#fff",
                border: `2.5px solid ${PT.ink}`,
                boxShadow: `4px 4px 0 ${PT.ink}`,
            }}
        >
            {/* Bloco de data */}
            <div
                className="flex flex-col items-center justify-center py-2 px-1"
                style={{
                    background: catMeta?.color || PT.ink,
                    color: catMeta?.color === "#FFCC00" ? PT.ink : "#fff",
                    border: `2px solid ${PT.ink}`,
                }}
            >
                <span
                    className="font-mono font-bold tracking-[0.14em] text-[9px] sm:text-[11px] uppercase"
                    style={{ opacity: 0.85 }}
                >
                    {month}
                </span>
                <span className="font-black leading-none text-2xl sm:text-4xl mt-0.5">{day}</span>
                {isMulti && (
                    <span
                        className="font-mono text-[8px] sm:text-[9px] mt-1 uppercase tracking-[0.08em] sm:tracking-[0.10em] text-center"
                        style={{ opacity: 0.85 }}
                    >
                        → {fmtDate(ev.iso_end).day} {fmtDate(ev.iso_end).month}
                    </span>
                )}
            </div>

            {/* Conteúdo */}
            <div className="min-w-0">
                <h3
                    className="font-black leading-tight tracking-[-0.01em] mb-1.5 break-words"
                    style={{ color: PT.ink, fontSize: "clamp(15px, 4.4vw, 21px)" }}
                >
                    {ev.emoji && <span className="mr-1">{ev.emoji}</span>}
                    {ev.title}
                </h3>

                {/* Status pill — abaixo do título em mobile, mais espaço */}
                <div className="mb-2">
                    <StatusPill status={ev.status} days={ev.days_until} />
                </div>

                {ev.subtitle && (
                    <p
                        className="text-[12.5px] sm:text-sm leading-snug"
                        style={{ color: "rgba(10,10,10,0.78)" }}
                    >
                        {ev.subtitle}
                    </p>
                )}

                <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 mt-2.5 sm:mt-3">
                    <span
                        className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono font-bold uppercase tracking-[0.10em]"
                        style={{
                            background: catMeta?.color || PT.ink,
                            color: catMeta?.color === "#FFCC00" ? PT.ink : "#fff",
                            border: `2px solid ${PT.ink}`,
                        }}
                    >
                        {catMeta?.label || ev.category}
                    </span>

                    {ev.city && (
                        <span
                            className="inline-flex items-center gap-1 text-[10.5px] font-mono font-bold uppercase tracking-[0.10em]"
                            style={{ color: "rgba(10,10,10,0.70)" }}
                        >
                            <MapPin size={11} strokeWidth={2.4} />
                            {ev.city}
                        </span>
                    )}

                    <span className="text-[10.5px] font-mono uppercase tracking-[0.10em] opacity-60 w-full sm:w-auto">
                        {rangeLabel}
                    </span>

                    {ev.url && (
                        <a
                            href={ev.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            data-testid={`cal-link-${ev.key}`}
                            className="inline-flex items-center gap-1 text-[11px] font-mono font-bold uppercase tracking-[0.10em] underline-offset-4 hover:underline"
                            style={{ color: PT.azul }}
                        >
                            site oficial <ExternalLink size={11} strokeWidth={2.4} />
                        </a>
                    )}
                </div>
            </div>
        </article>
    );
}

function MonthSection({ monthKey, events, catMetaMap }) {
    const [y, m] = monthKey.split("-");
    const monthName = MONTH_PT[parseInt(m, 10) - 1];
    return (
        <section className="mb-8 sm:mb-10" id={`cal-month-${monthKey}`} data-testid={`cal-month-${monthKey}`}>
            <div className="flex items-baseline gap-2 sm:gap-3 mb-3 sm:mb-4 pl-0.5 sm:pl-1">
                <h2
                    className="font-black tracking-[-0.02em] leading-none"
                    style={{ color: PT.ink, fontSize: "clamp(26px, 8vw, 44px)" }}
                >
                    {monthName}
                </h2>
                <span
                    className="font-mono font-bold uppercase tracking-[0.14em] text-[10px] sm:text-[11px]"
                    style={{ color: "rgba(10,10,10,0.55)" }}
                >
                    · {y} · {events.length} {events.length === 1 ? "evento" : "eventos"}
                </span>
            </div>
            <div className="space-y-2.5 sm:space-y-4">
                {events.map((ev) => (
                    <EventCard key={ev.key} ev={ev} catMeta={catMetaMap[ev.category]} />
                ))}
            </div>
        </section>
    );
}

// Highlight card usado no carrossel "A seguir" — versão compacta e horizontal-snap em mobile
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
                    <span className="font-mono text-[9px] uppercase tracking-[0.14em] opacity-85">
                        {month}
                    </span>
                    <span className="font-black text-lg sm:text-xl leading-none">{day}</span>
                </div>
                <div className="min-w-0 flex-1">
                    <p
                        className="font-mono text-[10px] uppercase tracking-[0.14em] mb-0.5"
                        style={{ color: "rgba(10,10,10,0.55)" }}
                    >
                        {ev.days_until === 0
                            ? "hoje"
                            : ev.days_until === 1
                            ? "amanhã"
                            : `daqui a ${ev.days_until} dias`}
                    </p>
                    <p
                        className="font-black leading-tight truncate"
                        style={{ color: PT.ink, fontSize: 15 }}
                    >
                        {ev.emoji} {ev.title}
                    </p>
                    {ev.city && (
                        <p
                            className="text-[11px] font-mono uppercase tracking-[0.10em] truncate"
                            style={{ color: "rgba(10,10,10,0.55)" }}
                        >
                            {ev.city}
                        </p>
                    )}
                </div>
            </div>
        </a>
    );
}

// Pill de jump por mês — usada na barra horizontal sticky
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
                boxShadow: isCurrent ? `2px 2px 0 ${PT.ink}` : `2px 2px 0 ${PT.ink}`,
            }}
        >
            <span className="font-mono font-bold uppercase tracking-[0.10em] text-[9px] leading-none">
                {MONTH_PT_SHORT[idx]}
            </span>
            <span className="font-black text-[11px] leading-none mt-0.5">{count}</span>
        </button>
    );
}

export default function Calendario() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [cat, setCat] = useState("all");
    const [region, setRegion] = useState("all");
    const [showPast, setShowPast] = useState(false);

    // Tracks qual mês está actualmente visível no viewport — para destacar
    // o pill correspondente no nav de jump.
    const [currentMonth, setCurrentMonth] = useState(null);
    const monthRefs = useRef({});

    const load = async () => {
        setLoading(true);
        try {
            const { data: payload } = await api.get("/calendar/all");
            setData(payload);
        } catch (e) {
            setError(e?.message || "Erro a carregar calendário");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, []);

    const catMetaMap = data?.categories || {};
    const regionMetaMap = data?.regions || {};

    // Counts por categoria (independente da categoria atual)
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

    // Filtra eventos
    const filtered = useMemo(() => {
        if (!data) return [];
        return data.events.filter((ev) => {
            if (!showPast && ev.status === "past") return false;
            if (cat !== "all" && ev.category !== cat) return false;
            if (region !== "all" && ev.region !== region && ev.region !== "all") return false;
            return true;
        });
    }, [data, cat, region, showPast]);

    // Agrupa por mês depois de filtrar
    const byMonth = useMemo(() => {
        const map = {};
        for (const ev of filtered) {
            const k = ev.iso_date.slice(0, 7);
            (map[k] = map[k] || []).push(ev);
        }
        return map;
    }, [filtered]);

    const monthKeys = useMemo(() => Object.keys(byMonth).sort(), [byMonth]);

    // Observa qual mês está visível para destacar o pill correspondente.
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
            { rootMargin: "-120px 0px -60% 0px", threshold: 0 }
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
            const y = el.getBoundingClientRect().top + window.scrollY - 90;
            window.scrollTo({ top: y, behavior: "smooth" });
        }
    };

    const catChips = useMemo(() => {
        const out = [ALL_CATS];
        for (const key of Object.keys(catMetaMap)) {
            out.push({ key, ...catMetaMap[key] });
        }
        return out;
    }, [catMetaMap]);

    return (
        <PtPageShell testid="page-calendario">
            <PageHeader
                title="Calendário · Portugal"
                subtitle="curadoria 2026"
                testid="calendar-header"
            />

            {/* MONTH JUMP NAV — sticky, sempre visível abaixo do header.
                Indispensável em 150+ eventos: salta para qualquer mês com um toque. */}
            {data && monthKeys.length > 1 && (
                <div
                    className="sticky z-20 backdrop-blur"
                    style={{
                        top: "calc(var(--mobile-topbar-h) + 56px)",
                        background: "rgba(244,244,244,0.96)",
                        borderBottom: `2px solid ${PT.ink}`,
                    }}
                    data-testid="cal-monthnav"
                >
                    <div
                        className="flex items-center gap-2 px-3 sm:px-5 py-2 overflow-x-auto snap-x snap-mandatory lg:max-w-[1080px] lg:mx-auto"
                        style={HIDE_SCROLLBAR}
                    >
                        <span
                            className="font-mono font-bold uppercase tracking-[0.18em] text-[10px] flex-shrink-0 pr-1"
                            style={{ color: "rgba(10,10,10,0.55)" }}
                        >
                            saltar →
                        </span>
                        {monthKeys.map((mk) => (
                            <MonthJumpPill
                                key={mk}
                                monthKey={mk}
                                count={byMonth[mk].length}
                                isCurrent={currentMonth === mk}
                                onClick={() => scrollToMonth(mk)}
                            />
                        ))}
                    </div>
                </div>
            )}

            <div className="px-3 sm:px-4 lg:px-8 pt-5 sm:pt-6 pb-24 max-w-[1080px] mx-auto">
                {/* HERO editorial */}
                <header className="relative mb-7 sm:mb-12">
                    <div className="flex items-start gap-2.5 mb-3">
                        <StampCircle size={56} bg={PT.red} rotate={-10}>
                            <div className="text-center leading-tight">
                                <div className="text-[7px] font-mono tracking-[0.18em]">ANO</div>
                                <div className="text-base font-black">2026</div>
                            </div>
                        </StampCircle>
                        <Sticker bg={PT.gold} rotate={3}>
                            <span className="text-[10px] sm:text-[11px] font-mono font-bold tracking-[0.14em]">
                                curadoria editorial
                            </span>
                        </Sticker>
                    </div>

                    <h1
                        className="font-black tracking-[-0.03em] leading-[0.92]"
                        style={{
                            color: PT.ink,
                            fontSize: "clamp(34px, 10.5vw, 78px)",
                        }}
                    >
                        Um ano <span style={{ color: PT.red }}>a</span>{" "}
                        <span
                            style={{
                                background: PT.gold,
                                padding: "0 8px",
                                display: "inline-block",
                                transform: "rotate(-1deg)",
                                border: `2.5px solid ${PT.ink}`,
                                boxShadow: `4px 4px 0 ${PT.ink}`,
                            }}
                        >
                            arder
                        </span>{" "}
                        em Portugal.
                    </h1>
                    <p
                        className="mt-4 sm:mt-5 max-w-[640px] text-[14.5px] sm:text-base lg:text-lg leading-relaxed"
                        style={{ color: "rgba(10,10,10,0.72)" }}
                    >
                        Feriados, festas das cidades, festivais, romarias, feiras e dias para
                        marcar a tinta. Da Brejeira ao Pico, do Carnaval ao Magusto — um mapa
                        afetivo dos próximos meses, com datas confirmadas e palcos por descobrir.
                    </p>
                </header>

                {/* HIGHLIGHTS — próximos 3 · carrossel horizontal em mobile, grid em desktop */}
                {data && data.next3?.length > 0 && (
                    <section className="mb-8 sm:mb-10">
                        <div className="flex items-center justify-between mb-2.5 sm:mb-3 pl-0.5">
                            <h2
                                className="font-mono font-bold uppercase tracking-[0.18em] text-[11px] sm:text-xs"
                                style={{ color: "rgba(10,10,10,0.55)" }}
                                data-testid="cal-next3-heading"
                            >
                                // a seguir
                            </h2>
                            <span
                                className="sm:hidden inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-[0.14em]"
                                style={{ color: "rgba(10,10,10,0.40)" }}
                            >
                                desliza <ChevronRight size={11} strokeWidth={2.4} />
                            </span>
                        </div>
                        {/* Mobile: carrossel horizontal com snap */}
                        <div
                            className="flex gap-3 overflow-x-auto snap-x snap-mandatory -mx-3 px-3 pb-2 sm:hidden"
                            style={HIDE_SCROLLBAR}
                            data-testid="cal-next3-mobile"
                        >
                            {data.next3.map((ev) => (
                                <Highlight key={ev.key} ev={ev} catMetaMap={catMetaMap} />
                            ))}
                        </div>
                        {/* Desktop: grid de 3 */}
                        <div className="hidden sm:grid sm:grid-cols-3 gap-4">
                            {data.next3.map((ev) => (
                                <Highlight key={ev.key} ev={ev} catMetaMap={catMetaMap} />
                            ))}
                        </div>
                    </section>
                )}

                {/* FILTROS — sem wrap em mobile, scroll horizontal com snap */}
                <section className="mb-7 sm:mb-8" data-testid="cal-filters">
                    <div className="flex items-center gap-2 mb-2.5 sm:mb-3">
                        <Filter size={13} strokeWidth={2.4} style={{ color: PT.ink }} />
                        <span
                            className="font-mono font-bold uppercase tracking-[0.18em] text-[10.5px] sm:text-[11px]"
                            style={{ color: "rgba(10,10,10,0.55)" }}
                        >
                            categoria
                        </span>
                    </div>
                    {/* Mobile: scroll horizontal; Desktop: wrap */}
                    <div
                        className="flex sm:flex-wrap gap-2 mb-4 overflow-x-auto sm:overflow-visible snap-x snap-mandatory sm:snap-none -mx-3 px-3 sm:mx-0 sm:px-0 pb-1 sm:pb-0"
                        style={HIDE_SCROLLBAR}
                    >
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

                    <div className="flex items-center gap-2 mb-2.5">
                        <span
                            className="font-mono font-bold uppercase tracking-[0.18em] text-[10.5px] sm:text-[11px]"
                            style={{ color: "rgba(10,10,10,0.55)" }}
                        >
                            região
                        </span>
                    </div>
                    <div
                        className="flex sm:flex-wrap items-center gap-2 overflow-x-auto sm:overflow-visible snap-x snap-mandatory sm:snap-none -mx-3 px-3 sm:mx-0 sm:px-0 pb-1 sm:pb-0"
                        style={HIDE_SCROLLBAR}
                    >
                        {Object.keys(regionMetaMap).map((rk) => (
                            <button
                                key={rk}
                                type="button"
                                data-testid={`cal-reg-${rk}`}
                                onClick={() => setRegion(rk)}
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

                    <label
                        className="mt-3 inline-flex items-center gap-2 cursor-pointer select-none"
                        data-testid="cal-toggle-past"
                    >
                        <input
                            type="checkbox"
                            checked={showPast}
                            onChange={(e) => setShowPast(e.target.checked)}
                            className="w-4 h-4 accent-black"
                        />
                        <span
                            className="font-mono font-bold uppercase tracking-[0.14em] text-[10px]"
                            style={{ color: "rgba(10,10,10,0.65)" }}
                        >
                            mostrar passados
                        </span>
                    </label>
                </section>

                {/* ESTADO: loading / erro / vazio / lista */}
                {loading && (
                    <div className="py-20 text-center">
                        <p
                            className="font-mono uppercase tracking-[0.18em] text-xs"
                            style={{ color: "rgba(10,10,10,0.5)" }}
                        >
                            a carregar agenda…
                        </p>
                    </div>
                )}

                {error && !loading && (
                    <div
                        className="p-6 text-center"
                        style={{
                            background: "#fff",
                            border: `2.5px solid ${PT.red}`,
                            boxShadow: `4px 4px 0 ${PT.ink}`,
                        }}
                    >
                        <p className="font-black mb-1">Não foi possível carregar.</p>
                        <p className="text-sm font-mono" style={{ color: "rgba(10,10,10,0.6)" }}>
                            {error}
                        </p>
                    </div>
                )}

                {!loading && !error && monthKeys.length === 0 && (
                    <div
                        className="p-8 text-center"
                        style={{
                            background: "#fff",
                            border: `2.5px dashed ${PT.ink}`,
                        }}
                        data-testid="cal-empty"
                    >
                        <CalendarDays
                            size={32}
                            strokeWidth={2.2}
                            style={{ color: PT.ink, margin: "0 auto 10px" }}
                        />
                        <p className="font-black">Nada nesta combinação.</p>
                        <p className="text-sm font-mono mt-1" style={{ color: "rgba(10,10,10,0.6)" }}>
                            Tenta outra categoria ou região.
                        </p>
                    </div>
                )}

                {!loading &&
                    !error &&
                    monthKeys.map((mk) => (
                        <MonthSection
                            key={mk}
                            monthKey={mk}
                            events={byMonth[mk]}
                            catMetaMap={catMetaMap}
                        />
                    ))}

                {/* RODAPÉ EDITORIAL */}
                {!loading && data && (
                    <footer
                        className="mt-12 p-5 text-center"
                        style={{
                            background: "transparent",
                            border: `2.5px dashed ${PT.ink}`,
                        }}
                    >
                        <p
                            className="font-mono uppercase tracking-[0.18em] text-[10px] sm:text-[11px]"
                            style={{ color: "rgba(10,10,10,0.55)" }}
                        >
                            // {data.total} eventos curados · datas confirmadas para {data.year}
                        </p>
                        <p
                            className="font-mono text-[9.5px] sm:text-[10px] mt-1"
                            style={{ color: "rgba(10,10,10,0.40)" }}
                        >
                            Fontes oficiais e calendários municipais. Atualizado em {data.today}.
                        </p>
                    </footer>
                )}
            </div>
        </PtPageShell>
    );
}
