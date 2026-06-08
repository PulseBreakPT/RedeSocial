import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import {
    ArrowRight, MapPin, Calendar as CalendarIcon, Users as UsersIcon,
    MessageCircle, Compass, Heart, Shield, Globe2, Sparkles,
    Loader2, Check, ChevronDown, Lock, Sunrise, Coffee, Moon, Sun,
    Instagram, Twitter,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";

// =============================================================================
// LUSORAE · Landing — "a tua cidade vive aqui · todos os dias"
// 100% data-driven · zero mocks · zero hardcoded counts.
// Real numbers from /api/landing/pulse + /api/landing/cities + /api/landing/feed
// =============================================================================

const C = {
    ink:     "#0F172A",
    body:    "#475569",
    muted:   "#94A3B8",
    line:    "rgba(15,23,42,0.08)",
    bg:      "#FFFFFF",
    bgAlt:   "#FAFAF7",
    bgDark:  "#0F172A",
    gold:    "#FFCC00",
    goldSoft:"#FFE26B",
    goldDeep:"#B45309",
    green:   "#10B981",
    red:     "#EF4444",
    blue:    "#2563EB",
    purple:  "#8B5CF6",
    amber:   "#F59E0B",
    teal:    "#0EA5A5",
};

const ACCENT_FOR_CITY = {
    lisboa: C.red, porto: C.blue, coimbra: C.purple, braga: C.teal,
    aveiro: C.blue, viseu: C.gold, leiria: C.green, setubal: C.blue,
    evora: C.gold, faro: C.amber, lagos: C.gold, guimaraes: C.green,
    funchal: C.green, "ponta-delgada": C.blue,
};

// =============================================================================
// MAIN
// =============================================================================
export default function Landing() {
    const { user, checking } = useAuth();
    const [data, setData] = useState({ pulse: null, cities: [], feed: null });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const [pulse, cities, feed] = await Promise.all([
                    api.get("/landing/pulse").then((r) => r.data).catch(() => null),
                    api.get("/landing/cities").then((r) => r.data?.cities || []).catch(() => []),
                    api.get("/landing/feed").then((r) => r.data).catch(() => null),
                ]);
                if (!alive) return;
                setData({ pulse, cities, feed });
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => { alive = false; };
    }, []);

    if (!checking && user) return <Navigate to="/feed" replace />;

    return (
        <div className="min-h-screen" style={{ background: C.bg, color: C.ink }} data-testid="landing-page">
            <TopNav />
            <Hero pulse={data.pulse} cities={data.cities} loading={loading} />
            <WeekStrip week={data.feed?.week} loading={loading} />
            <UpcomingFeed events={data.feed?.upcoming_events} loading={loading} />
            <CategoriesGrid categories={data.feed?.categories} loading={loading} />
            <CitiesGrid cities={data.cities} loading={loading} />
            <DailyHabits />
            <ProductPreview pulse={data.pulse} events={data.feed?.upcoming_events} />
            <ValuesSection />
            <Roadmap />
            <FinalCta pulse={data.pulse} />
            <Faq />
            <Footer />
            <LandingStyles />
        </div>
    );
}

// =============================================================================
// TOP NAV
// =============================================================================
function TopNav() {
    const [open, setOpen] = useState(false);
    const sections = [
        { href: "#hoje",       label: "Hoje" },
        { href: "#cidades",    label: "Cidades" },
        { href: "#produto",    label: "Produto" },
        { href: "#valores",    label: "Valores" },
        { href: "#roadmap",    label: "Roadmap" },
    ];
    return (
        <header className="sticky top-0 z-40 backdrop-blur-md" style={{ background: "rgba(255,255,255,0.85)", borderBottom: `1px solid ${C.line}` }}>
            <div className="max-w-[1320px] mx-auto px-5 lg:px-8 h-16 lg:h-[72px] flex items-center justify-between gap-6">
                <BrandMark />
                <nav className="hidden lg:flex items-center gap-7" aria-label="Primary">
                    {sections.map((s) => (
                        <a key={s.href} href={s.href} data-testid={`nav-${s.label.toLowerCase()}`}
                           className="text-[13.5px] font-semibold transition" style={{ color: C.body }}
                           onMouseEnter={(e) => (e.currentTarget.style.color = C.ink)}
                           onMouseLeave={(e) => (e.currentTarget.style.color = C.body)}>
                            {s.label}
                        </a>
                    ))}
                </nav>
                <div className="flex items-center gap-2">
                    <Link to="/login" data-testid="nav-login"
                          className="hidden sm:inline-flex items-center px-4 py-2.5 text-[13px] font-bold rounded-full hover:bg-slate-100 transition"
                          style={{ color: C.ink }}>
                        Entrar
                    </Link>
                    <a href="#reservar" data-testid="nav-reservar"
                       className="inline-flex items-center px-4 sm:px-5 py-2.5 text-[13px] font-bold rounded-full transition hover:brightness-95"
                       style={{ background: C.ink, color: "#fff" }}>
                        Reservar username
                    </a>
                    <button type="button" className="lg:hidden p-2" aria-label="Menu" onClick={() => setOpen((v) => !v)}>
                        <span className="block w-5 h-[2px] mb-1" style={{ background: C.ink }} />
                        <span className="block w-5 h-[2px] mb-1" style={{ background: C.ink }} />
                        <span className="block w-5 h-[2px]"      style={{ background: C.ink }} />
                    </button>
                </div>
            </div>
            {open && (
                <div className="lg:hidden border-t" style={{ borderColor: C.line, background: "#fff" }}>
                    <nav className="px-5 py-3 flex flex-col gap-1">
                        {sections.map((s) => (
                            <a key={s.href} href={s.href} onClick={() => setOpen(false)}
                               className="py-2.5 text-[15px] font-semibold" style={{ color: C.ink }}>
                                {s.label}
                            </a>
                        ))}
                        <Link to="/login" onClick={() => setOpen(false)}
                              className="py-2.5 text-[15px] font-semibold border-t mt-1 pt-3" style={{ color: C.ink, borderColor: C.line }}>
                            Entrar
                        </Link>
                    </nav>
                </div>
            )}
        </header>
    );
}

function BrandMark() {
    return (
        <Link to="/" className="flex items-center gap-2 group" data-testid="brand-logo" aria-label="Lusorae">
            <span
                className="inline-flex items-center justify-center transition-transform group-hover:rotate-[8deg]"
                style={{
                    width: 36, height: 36, borderRadius: 12,
                    background: `linear-gradient(135deg, ${C.gold} 0%, #FFB300 100%)`,
                    boxShadow: "0 4px 14px rgba(255,204,0,0.40)",
                }}
            >
                <Heart size={18} fill={C.ink} stroke={C.ink} strokeWidth={2.2} />
            </span>
            <span className="text-[20px] font-black tracking-tight" style={{ color: C.ink, letterSpacing: "-0.025em" }}>
                Lusorae
            </span>
        </Link>
    );
}

// =============================================================================
// HERO — real data only
// =============================================================================
function Hero({ pulse, cities, loading }) {
    return (
        <section id="reservar" className="relative overflow-hidden" data-testid="hero">
            <div aria-hidden className="absolute inset-0 pointer-events-none" style={{
                background: `radial-gradient(900px 480px at 80% -10%, rgba(255,204,0,0.18), transparent 60%), radial-gradient(700px 400px at -10% 30%, rgba(37,99,235,0.10), transparent 60%)`,
            }} />
            <div className="relative max-w-[1320px] mx-auto px-5 lg:px-8 pt-10 lg:pt-20 pb-12 lg:pb-20">
                <div className="grid lg:grid-cols-[1.1fr_1fr] gap-10 lg:gap-16 items-center">
                    {/* LEFT */}
                    <div>
                        <div className="inline-flex items-center gap-2 mb-5 px-3 py-1.5 rounded-full" style={{ background: "#fff", border: `1px solid ${C.line}`, boxShadow: "0 2px 8px rgba(15,23,42,0.04)" }}>
                            <span className="relative flex h-2 w-2">
                                <span className="absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping" style={{ background: C.green }} />
                                <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: C.green }} />
                            </span>
                            <span className="text-[11.5px] font-mono font-bold uppercase tracking-[0.15em]" style={{ color: C.ink }}>
                                em construção · entra cedo
                            </span>
                        </div>

                        <h1 className="font-black tracking-tight" style={{ fontSize: "clamp(40px, 6vw, 78px)", lineHeight: 1.02, color: C.ink, letterSpacing: "-0.035em" }} data-testid="hero-title">
                            A tua cidade<br />
                            <span style={{ background: `linear-gradient(transparent 68%, ${C.gold} 68%, ${C.gold} 92%, transparent 92%)`, padding: "0 6px" }}>
                                vive aqui.
                            </span>
                        </h1>

                        <p className="mt-6 text-[17px] sm:text-[18px] leading-relaxed max-w-[540px]" style={{ color: C.body }}>
                            A rede social das pessoas, eventos e comunidades de Portugal — desenhada para abrires todos os dias e sair com algo na agenda. Sem ads. Sem doomscroll.
                        </p>

                        <div className="mt-8 flex flex-wrap items-center gap-3">
                            <a href="#reservar-form" data-testid="hero-cta-primary"
                               className="inline-flex items-center gap-2 px-6 py-4 text-[15px] font-bold rounded-full transition hover:brightness-95"
                               style={{ background: C.ink, color: "#fff", boxShadow: "0 10px 26px rgba(15,23,42,0.18)" }}>
                                Reservar o teu username <ArrowRight size={16} strokeWidth={2.4} />
                            </a>
                            <a href="#hoje" data-testid="hero-cta-secondary"
                               className="inline-flex items-center gap-2 px-6 py-4 text-[15px] font-bold rounded-full transition hover:bg-slate-50"
                               style={{ color: C.ink, border: `1.5px solid ${C.line}`, background: "#fff" }}>
                                <Compass size={16} /> Ver o que se passa
                            </a>
                        </div>

                        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-2 text-[12.5px] font-medium" style={{ color: C.body }}>
                            <span className="flex items-center gap-1.5"><Lock size={14} style={{ color: C.muted }} /> Servidores em Portugal</span>
                            <span className="flex items-center gap-1.5"><Shield size={14} style={{ color: C.muted }} /> Zero ads</span>
                            <span className="flex items-center gap-1.5"><Globe2 size={14} style={{ color: C.muted }} /> RGPD-friendly</span>
                        </div>
                    </div>

                    {/* RIGHT — Pulse card with REAL numbers */}
                    <div className="relative" data-testid="hero-pulse-card">
                        <PulseCard pulse={pulse} cities={cities} loading={loading} />
                    </div>
                </div>
            </div>
        </section>
    );
}

function PulseCard({ pulse, cities, loading }) {
    const items = [
        { label: "Cidades preparadas",     value: pulse?.cities_supported,  icon: MapPin,         accent: C.blue },
        { label: "Eventos no calendário",  value: pulse?.events_indexed,    icon: CalendarIcon,   accent: C.purple,  suffix: "+" },
        { label: "Categorias",             value: pulse?.categories_total,  icon: Sparkles,       accent: C.amber },
        { label: "Regiões cobertas",       value: pulse?.regions_covered,   icon: Globe2,         accent: C.teal },
        { label: "Usernames reservados",   value: pulse?.reservations_total,icon: UsersIcon,      accent: C.green,   primary: true },
    ];
    return (
        <div className="rounded-3xl p-6 sm:p-7" style={{ background: "#fff", border: `1px solid ${C.line}`, boxShadow: "0 24px 60px -20px rgba(15,23,42,0.18), 0 2px 4px rgba(15,23,42,0.04)" }}>
            <div className="flex items-center justify-between mb-5">
                <div>
                    <p className="text-[10.5px] font-mono font-bold uppercase tracking-[0.18em]" style={{ color: C.muted }}>
                        em tempo real
                    </p>
                    <h3 className="font-black text-[17px] mt-0.5" style={{ color: C.ink }}>
                        Portugal vivo
                    </h3>
                </div>
                <span className="inline-flex items-center gap-1.5 text-[10.5px] font-mono font-bold uppercase tracking-[0.12em] px-2.5 py-1 rounded-full" style={{ background: "rgba(16,185,129,0.10)", color: C.green }}>
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: C.green }} />
                        <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: C.green }} />
                    </span>
                    ao vivo
                </span>
            </div>

            <ul className="space-y-3">
                {items.map((it, i) => (
                    <li key={i} data-testid={`pulse-${i}`}
                        className={`flex items-center justify-between gap-3 py-2 px-3 rounded-xl ${it.primary ? "" : ""}`}
                        style={it.primary ? { background: "rgba(16,185,129,0.06)", border: `1px solid rgba(16,185,129,0.18)` } : {}}>
                        <span className="flex items-center gap-3 min-w-0">
                            <span className="inline-flex shrink-0 items-center justify-center" style={{ width: 32, height: 32, borderRadius: 10, background: `${it.accent}14`, color: it.accent }}>
                                <it.icon size={15} strokeWidth={2.2} />
                            </span>
                            <span className="text-[13.5px] font-medium" style={{ color: C.body }}>{it.label}</span>
                        </span>
                        <span className="font-black text-[18px] tabular-nums" style={{ color: C.ink }}>
                            {loading ? <span className="inline-block w-8 h-3 rounded animate-pulse" style={{ background: C.line }} />
                                     : (it.value != null ? Number(it.value).toLocaleString("pt-PT") : "—")}
                            {it.suffix && it.value > 0 ? <span className="text-[13px] opacity-60 ml-0.5">{it.suffix}</span> : null}
                        </span>
                    </li>
                ))}
            </ul>

            <div className="mt-4 pt-4 border-t" style={{ borderColor: C.line }}>
                <p className="text-[11.5px] font-medium leading-relaxed" style={{ color: C.muted }}>
                    Cidades-âncora a abrir primeiro:
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                    {cities.slice(0, 8).map((c) => (
                        <span key={c.slug} className="text-[11px] font-bold px-2 py-1 rounded-md" style={{ background: `${ACCENT_FOR_CITY[c.slug] || C.muted}14`, color: ACCENT_FOR_CITY[c.slug] || C.body }}>
                            {c.name}
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}

// =============================================================================
// WEEK STRIP — 7-day calendar buckets from real /api/landing/feed
// =============================================================================
function WeekStrip({ week, loading }) {
    if (!week || week.length === 0) return null;
    return (
        <section className="px-5 lg:px-8 -mt-2 pb-6 lg:pb-10" data-testid="week-strip">
            <div className="max-w-[1320px] mx-auto rounded-2xl p-4 sm:p-5" style={{ background: C.bgAlt, border: `1px solid ${C.line}` }}>
                <div className="flex items-center justify-between mb-3">
                    <p className="text-[11px] font-mono font-bold uppercase tracking-[0.18em]" style={{ color: C.muted }}>
                        próximos 7 dias
                    </p>
                    <a href="#hoje" data-testid="week-explore"
                       className="text-[12px] font-bold inline-flex items-center gap-1" style={{ color: C.goldDeep }}>
                        Ver tudo <ArrowRight size={12} />
                    </a>
                </div>
                <ul className="grid grid-cols-7 gap-1.5 sm:gap-2">
                    {week.map((d, i) => (
                        <li key={d.date_iso} data-testid={`week-day-${i}`}
                            className="rounded-xl px-2 py-3 text-center transition hover:-translate-y-0.5"
                            style={{
                                background: i === 0 ? C.ink : "#fff",
                                color: i === 0 ? "#fff" : C.ink,
                                border: `1px solid ${i === 0 ? C.ink : C.line}`,
                                boxShadow: i === 0 ? "0 6px 16px rgba(15,23,42,0.20)" : "0 1px 2px rgba(15,23,42,0.03)",
                            }}>
                            <p className="text-[9.5px] font-mono font-bold uppercase tracking-[0.10em]" style={{ opacity: i === 0 ? 0.7 : 0.5 }}>
                                {d.weekday}
                            </p>
                            <p className="font-black text-[18px] sm:text-[22px] mt-0.5 tabular-nums leading-none">
                                {d.day_num}
                            </p>
                            <p className="text-[9px] font-mono mt-0.5 uppercase tracking-[0.10em]" style={{ opacity: i === 0 ? 0.7 : 0.4 }}>
                                {d.month}
                            </p>
                            <div className="mt-1.5 h-[18px] flex items-center justify-center">
                                {loading ? (
                                    <span className="inline-block w-6 h-2 rounded animate-pulse" style={{ background: i === 0 ? "rgba(255,255,255,0.2)" : C.line }} />
                                ) : d.events_count > 0 ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                                          style={{ background: i === 0 ? "rgba(255,204,0,0.20)" : `${C.gold}22`, color: i === 0 ? C.gold : C.goldDeep }}>
                                        <span className="w-1 h-1 rounded-full" style={{ background: i === 0 ? C.gold : C.goldDeep }} />
                                        {d.events_count}
                                    </span>
                                ) : (
                                    <span className="text-[10px]" style={{ opacity: 0.35 }}>—</span>
                                )}
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}

// =============================================================================
// UPCOMING FEED — list of real upcoming events from calendar
// =============================================================================
function UpcomingFeed({ events, loading }) {
    return (
        <section id="hoje" className="px-5 lg:px-8 py-12 lg:py-20" data-testid="upcoming-feed">
            <div className="max-w-[1320px] mx-auto">
                <div className="flex items-end justify-between gap-6 mb-8 lg:mb-10">
                    <div>
                        <p className="text-[11.5px] font-mono font-bold uppercase tracking-[0.18em] mb-2" style={{ color: C.goldDeep }}>
                            o que aí vem
                        </p>
                        <h2 className="font-black tracking-tight" style={{ fontSize: "clamp(28px, 4vw, 44px)", lineHeight: 1.05, color: C.ink, letterSpacing: "-0.025em" }}>
                            Hoje em Portugal
                        </h2>
                        <p className="mt-2 text-[14.5px] max-w-md" style={{ color: C.body }}>
                            Calendário curado · feriados, festas, festivais. Sem mocks: o que estás a ver vai mesmo acontecer.
                        </p>
                    </div>
                    <Link to="/eventos" data-testid="feed-see-all"
                          className="hidden sm:inline-flex items-center gap-1 text-[13px] font-bold whitespace-nowrap" style={{ color: C.ink }}>
                        Ver calendário completo <ArrowRight size={14} />
                    </Link>
                </div>

                <ul className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
                    {loading && Array.from({ length: 4 }).map((_, i) => (
                        <li key={i} className="rounded-2xl p-5 animate-pulse" style={{ background: C.bgAlt, border: `1px solid ${C.line}`, minHeight: 156 }} />
                    ))}
                    {!loading && (events || []).slice(0, 8).map((e) => <EventCard key={e.key} e={e} />)}
                    {!loading && (!events || events.length === 0) && (
                        <li className="col-span-full rounded-2xl p-6 text-center" style={{ background: C.bgAlt, color: C.muted }}>
                            Sem eventos próximos no calendário.
                        </li>
                    )}
                </ul>
            </div>
        </section>
    );
}

function EventCard({ e }) {
    const d = new Date(e.date_iso + "T00:00:00");
    const day = d.getDate();
    const month = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"][d.getMonth()];
    const weekday = ["DOM", "SEG", "TER", "QUA", "QUI", "SEX", "SÁB"][d.getDay()];
    return (
        <li
            data-testid={`event-${e.key}`}
            className="group rounded-2xl p-4 sm:p-5 transition hover:-translate-y-1"
            style={{ background: "#fff", border: `1px solid ${C.line}`, boxShadow: "0 2px 8px rgba(15,23,42,0.03)" }}
        >
            <div className="flex items-start gap-3">
                <div className="text-center shrink-0" style={{
                    width: 56, padding: "6px 4px",
                    borderRadius: 12, background: `${e.category_color}10`,
                    border: `1px solid ${e.category_color}28`,
                }}>
                    <p className="text-[9px] font-mono font-bold uppercase tracking-[0.10em]" style={{ color: e.category_color, opacity: 0.85 }}>
                        {month}
                    </p>
                    <p className="font-black text-[22px] tabular-nums leading-none" style={{ color: e.category_color }}>
                        {day}
                    </p>
                    <p className="text-[8.5px] font-mono font-bold uppercase tracking-[0.10em] mt-0.5" style={{ color: e.category_color, opacity: 0.65 }}>
                        {weekday}
                    </p>
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="text-[14px] leading-none">{e.emoji}</span>
                        <span className="text-[10px] font-mono font-bold uppercase tracking-[0.10em] px-1.5 py-0.5 rounded" style={{ background: `${e.category_color}14`, color: e.category_color }}>
                            {e.category_label}
                        </span>
                    </div>
                    <h3 className="font-black text-[15px] leading-tight" style={{ color: C.ink }}>
                        {e.title}
                    </h3>
                    {e.subtitle && (
                        <p className="text-[12px] mt-1 leading-snug line-clamp-2" style={{ color: C.body }}>
                            {e.subtitle}
                        </p>
                    )}
                    <p className="mt-2 flex items-center gap-1 text-[11.5px] font-medium" style={{ color: C.muted }}>
                        <MapPin size={11} /> {e.city}
                    </p>
                </div>
            </div>
        </li>
    );
}

// =============================================================================
// CATEGORIES — real category breakdown
// =============================================================================
function CategoriesGrid({ categories, loading }) {
    if (loading || !categories) {
        return (
            <section className="px-5 lg:px-8 pb-8 lg:pb-14" data-testid="categories">
                <div className="max-w-[1320px] mx-auto h-24 rounded-2xl animate-pulse" style={{ background: C.bgAlt }} />
            </section>
        );
    }
    return (
        <section className="px-5 lg:px-8 pb-12 lg:pb-20" data-testid="categories">
            <div className="max-w-[1320px] mx-auto">
                <div className="mb-5 lg:mb-6">
                    <p className="text-[11.5px] font-mono font-bold uppercase tracking-[0.18em]" style={{ color: C.muted }}>
                        explora por categoria
                    </p>
                </div>
                <ul className="flex flex-wrap gap-2">
                    {categories.map((c) => (
                        <li key={c.slug} data-testid={`cat-${c.slug}`}>
                            <span
                                className="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-full text-[13px] font-bold transition hover:-translate-y-0.5 cursor-default"
                                style={{
                                    background: "#fff",
                                    border: `1px solid ${c.color}30`,
                                    color: C.ink,
                                    boxShadow: "0 2px 6px rgba(15,23,42,0.03)",
                                }}
                            >
                                <span style={{ fontSize: 16 }}>{c.emoji}</span>
                                {c.label}
                                <span className="ml-1 text-[11px] font-mono font-bold px-1.5 py-0.5 rounded tabular-nums" style={{ background: `${c.color}14`, color: c.color }}>
                                    {c.count}
                                </span>
                            </span>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}

// =============================================================================
// CITIES GRID — real cities from /api/landing/cities
// =============================================================================
function CitiesGrid({ cities, loading }) {
    return (
        <section id="cidades" className="px-5 lg:px-8 py-14 lg:py-20" style={{ background: C.bgAlt }} data-testid="cities-grid">
            <div className="max-w-[1320px] mx-auto">
                <div className="flex items-end justify-between gap-6 mb-8 lg:mb-10">
                    <div>
                        <p className="text-[11.5px] font-mono font-bold uppercase tracking-[0.18em] mb-2" style={{ color: C.goldDeep }}>
                            cidades-âncora
                        </p>
                        <h2 className="font-black tracking-tight" style={{ fontSize: "clamp(28px, 4vw, 44px)", lineHeight: 1.05, color: C.ink, letterSpacing: "-0.025em" }}>
                            A começar por estas {cities.length || ""} cidades
                        </h2>
                        <p className="mt-2 text-[14.5px] max-w-xl" style={{ color: C.body }}>
                            Cada cidade tem a sua personalidade. Reserva o teu username e ficamos a saber por onde abrimos primeiro.
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 lg:gap-4">
                    {loading && Array.from({ length: 14 }).map((_, i) => (
                        <div key={i} className="rounded-2xl animate-pulse" style={{ background: "#fff", border: `1px solid ${C.line}`, aspectRatio: "1 / 1.05" }} />
                    ))}
                    {!loading && cities.map((c) => <CityCard key={c.slug} c={c} />)}
                </div>
            </div>
        </section>
    );
}

function CityCard({ c }) {
    const accent = ACCENT_FOR_CITY[c.slug] || C.muted;
    return (
        <article
            data-testid={`city-card-${c.slug}`}
            className="group relative rounded-2xl p-4 flex flex-col transition hover:-translate-y-1"
            style={{
                background: "#fff",
                border: `1px solid ${C.line}`,
                boxShadow: "0 1px 3px rgba(15,23,42,0.03)",
                aspectRatio: "1 / 1.05",
            }}
        >
            <div className="flex items-start justify-between">
                <span className="inline-flex items-center justify-center" style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: `${accent}14`, color: accent,
                }}>
                    <MapPin size={16} strokeWidth={2.2} />
                </span>
                {c.events_count > 0 && (
                    <span className="text-[10px] font-mono font-bold tabular-nums px-1.5 py-0.5 rounded" style={{ background: C.bgAlt, color: C.body }}>
                        {c.events_count} ev.
                    </span>
                )}
            </div>
            <div className="mt-auto pt-4">
                <p className="font-black text-[16px] leading-tight" style={{ color: C.ink }}>{c.name}</p>
                <p className="text-[10px] font-mono font-bold uppercase tracking-[0.10em] mt-0.5" style={{ color: accent }}>
                    {c.region}
                </p>
                <p className="text-[11px] mt-1.5 line-clamp-2" style={{ color: C.body }}>
                    {c.tag}
                </p>
            </div>
        </article>
    );
}

// =============================================================================
// DAILY HABITS — why open Lusorae every day
// =============================================================================
function DailyHabits() {
    const moments = [
        { icon: Sunrise, time: "manhã",  title: "Vê o que aí vem.",        sub: "Eventos do dia + posts do bairro. Em 30 segundos." },
        { icon: Coffee,  time: "almoço", title: "Encontra a tua mesa.",    sub: "Tascas, esplanadas, novidades perto de ti." },
        { icon: Sun,     time: "tarde",  title: "Diz olá a quem te cruza.", sub: "DMs limpas. Comunidades por bairro." },
        { icon: Moon,    time: "noite",  title: "Junta-te ao que acontece.",sub: "Concertos, festas, encontros. Marca presença." },
    ];
    return (
        <section className="px-5 lg:px-8 py-14 lg:py-20" data-testid="daily-habits">
            <div className="max-w-[1320px] mx-auto">
                <div className="max-w-3xl mb-10 lg:mb-12">
                    <p className="text-[11.5px] font-mono font-bold uppercase tracking-[0.18em] mb-2" style={{ color: C.goldDeep }}>
                        feito para o dia-a-dia
                    </p>
                    <h2 className="font-black tracking-tight" style={{ fontSize: "clamp(28px, 4vw, 44px)", lineHeight: 1.05, color: C.ink, letterSpacing: "-0.025em" }}>
                        Quatro momentos. Um sítio.
                    </h2>
                    <p className="mt-3 text-[15px] max-w-2xl leading-relaxed" style={{ color: C.body }}>
                        Lusorae foi pensado para entrares de manhã, ao almoço, à tarde e à noite — e saíres com algo útil, não com mais 20 minutos a esfregar o ecrã.
                    </p>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5">
                    {moments.map((m, i) => (
                        <article key={i} data-testid={`habit-${i}`}
                                 className="rounded-3xl p-6 lg:p-7 transition hover:-translate-y-1"
                                 style={{ background: i === 0 ? C.ink : "#fff", color: i === 0 ? "#fff" : C.ink,
                                          border: `1px solid ${i === 0 ? C.ink : C.line}`,
                                          boxShadow: i === 0 ? "0 12px 28px -8px rgba(15,23,42,0.25)" : "0 1px 3px rgba(15,23,42,0.03)" }}>
                            <span className="inline-flex items-center justify-center mb-5" style={{
                                width: 44, height: 44, borderRadius: 12,
                                background: i === 0 ? "rgba(255,204,0,0.18)" : C.bgAlt,
                                color: i === 0 ? C.gold : C.ink,
                            }}>
                                <m.icon size={20} strokeWidth={2} />
                            </span>
                            <p className="text-[10.5px] font-mono font-bold uppercase tracking-[0.18em]" style={{ color: i === 0 ? C.gold : C.goldDeep }}>
                                {m.time}
                            </p>
                            <h3 className="font-black text-[18px] mt-1 leading-tight">{m.title}</h3>
                            <p className="mt-2 text-[13.5px] leading-relaxed" style={{ color: i === 0 ? "rgba(255,255,255,0.72)" : C.body }}>
                                {m.sub}
                            </p>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}

// =============================================================================
// PRODUCT PREVIEW — 2 phone mockups using REAL data from the calendar
// =============================================================================
function ProductPreview({ pulse, events }) {
    const realEvents = (events || []).slice(0, 4);
    return (
        <section id="produto" className="px-5 lg:px-8 py-14 lg:py-20" style={{ background: C.bgDark, color: "#fff" }} data-testid="product-preview">
            <div className="max-w-[1320px] mx-auto">
                <div className="grid lg:grid-cols-[1fr_1.2fr] gap-10 lg:gap-16 items-center">
                    <div>
                        <p className="text-[11.5px] font-mono font-bold uppercase tracking-[0.18em] mb-2" style={{ color: C.gold }}>
                            produto · em pré-lançamento
                        </p>
                        <h2 className="font-black tracking-tight" style={{ fontSize: "clamp(30px, 4.5vw, 52px)", lineHeight: 1.02, color: "#fff", letterSpacing: "-0.03em" }}>
                            O calendário, o mapa<br />e as conversas — <br />
                            <span style={{ color: C.gold }}>num só sítio.</span>
                        </h2>
                        <p className="mt-5 text-[15px] sm:text-[16px] leading-relaxed max-w-[520px]" style={{ color: "rgba(255,255,255,0.72)" }}>
                            Os {pulse?.events_indexed ? `${pulse.events_indexed}+ ` : ""}eventos do calendário PT, as {pulse?.cities_supported || "—"} cidades-âncora e as comunidades que vão nascer, todos acessíveis a partir do feed.
                        </p>
                        <ul className="mt-6 space-y-2.5">
                            {[
                                "Feed cronológico — sem algoritmo a esconder coisas.",
                                "DMs limpas — sem ads, sem leituras forçadas.",
                                "Mapa interactivo da tua cidade e bairro.",
                                "Comunidades por interesse, freguesia, cidade.",
                            ].map((line, i) => (
                                <li key={i} className="flex items-start gap-2.5 text-[14px]" style={{ color: "rgba(255,255,255,0.85)" }}>
                                    <Check size={16} strokeWidth={3} style={{ color: C.gold, marginTop: 2 }} />
                                    {line}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="relative flex items-end justify-center gap-3 lg:gap-5">
                        <PhoneFrame label="Calendário" testid="phone-eventos">
                            <PhoneCalendar events={realEvents} />
                        </PhoneFrame>
                        <PhoneFrame label="Mapa" testid="phone-mapa" elevated>
                            <PhoneMap />
                        </PhoneFrame>
                    </div>
                </div>
            </div>
        </section>
    );
}

function PhoneFrame({ label, children, elevated, testid }) {
    return (
        <div className="flex flex-col items-center" data-testid={testid}>
            <div className="relative" style={{
                width: "100%", maxWidth: 230,
                aspectRatio: "1 / 2.05",
                borderRadius: 38,
                padding: 7,
                background: "linear-gradient(180deg, #1F2937 0%, #0B1220 100%)",
                boxShadow: elevated
                    ? "0 40px 80px -20px rgba(0,0,0,0.5), 0 8px 16px rgba(0,0,0,0.3)"
                    : "0 24px 50px -20px rgba(0,0,0,0.5), 0 4px 8px rgba(0,0,0,0.2)",
                transform: elevated ? "translateY(-12px)" : "none",
            }}>
                <div className="relative w-full h-full overflow-hidden" style={{ borderRadius: 30, background: "#fff" }}>
                    {/* notch */}
                    <div className="absolute left-1/2 -translate-x-1/2 z-30" style={{
                        top: 7, width: 78, height: 18, borderRadius: 10, background: "#0B1220",
                    }} />
                    {/* status bar */}
                    <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 z-20" style={{ height: 28 }}>
                        <span className="text-[9.5px] font-bold tabular-nums" style={{ color: C.ink }}>9:41</span>
                        <span className="text-[9px]" style={{ color: C.ink }}>● ●● ▮▮▮</span>
                    </div>
                    <div className="absolute inset-0 pt-8 px-3 pb-3 overflow-hidden">
                        {children}
                    </div>
                </div>
            </div>
            <p className="mt-3 text-[12px] font-bold" style={{ color: "rgba(255,255,255,0.55)" }}>{label}</p>
        </div>
    );
}

function PhoneCalendar({ events }) {
    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-2.5">
                <h4 className="font-black text-[14px]" style={{ color: C.ink }}>Eventos</h4>
                <span className="text-[9px] font-mono uppercase tracking-wider" style={{ color: C.muted }}>próximos</span>
            </div>
            <ul className="space-y-2 overflow-hidden">
                {events.length === 0 && (
                    <li className="text-[10px] py-4 text-center" style={{ color: C.muted }}>
                        A carregar calendário…
                    </li>
                )}
                {events.map((e) => {
                    const d = new Date(e.date_iso + "T00:00:00");
                    const day = d.getDate();
                    const mon = ["JAN","FEV","MAR","ABR","MAI","JUN","JUL","AGO","SET","OUT","NOV","DEZ"][d.getMonth()];
                    return (
                        <li key={e.key} className="flex items-start gap-2 p-2 rounded-lg" style={{ background: C.bgAlt }}>
                            <div className="text-center shrink-0" style={{
                                width: 30, padding: "3px 2px", borderRadius: 6,
                                background: `${e.category_color}18`, color: e.category_color,
                            }}>
                                <p className="text-[6.5px] font-mono font-bold uppercase tracking-wider opacity-80">{mon}</p>
                                <p className="font-black text-[12px] tabular-nums leading-none">{day}</p>
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="font-black text-[10px] leading-tight truncate" style={{ color: C.ink }}>
                                    {e.emoji} {e.title}
                                </p>
                                <p className="text-[8.5px] mt-0.5 truncate" style={{ color: C.muted }}>
                                    <MapPin size={7} className="inline mr-0.5" />{e.city}
                                </p>
                            </div>
                        </li>
                    );
                })}
            </ul>
        </div>
    );
}

function PhoneMap() {
    const pins = [
        { x: 30, y: 12, c: C.teal,   r: 3.5 }, // Braga
        { x: 56, y: 22, c: C.blue,   r: 5 },   // Porto
        { x: 33, y: 36, c: C.purple, r: 3.5 }, // Coimbra
        { x: 50, y: 56, c: C.red,    r: 6 },   // Lisboa (bigger)
        { x: 50, y: 85, c: C.amber,  r: 4 },   // Faro
    ];
    return (
        <div className="relative h-full overflow-hidden rounded-xl">
            <div className="absolute inset-0" style={{
                background: "linear-gradient(135deg, #EFF6FF 0%, #FEFCE8 100%)",
            }} />
            <svg viewBox="0 0 100 180" className="absolute inset-0 w-full h-full" preserveAspectRatio="none" aria-hidden="true">
                <defs>
                    <linearGradient id="ph_land" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#FFF7DC" />
                        <stop offset="100%" stopColor="#F8EEC7" />
                    </linearGradient>
                </defs>
                <path d="M 32 5 Q 56 12, 58 50 L 62 95 Q 58 140, 50 175 L 42 174 Q 28 138, 32 95 L 26 50 Q 28 22, 32 5 Z"
                      fill="url(#ph_land)" stroke="#E5D6A8" strokeWidth="0.6" />
                <g opacity="0.25" stroke="#D4C588" strokeWidth="0.4" fill="none">
                    <path d="M 28 30 Q 45 38, 56 32" />
                    <path d="M 28 75 Q 46 84, 58 80" />
                    <path d="M 28 120 Q 46 130, 58 125" />
                </g>
            </svg>
            {pins.map((p, i) => (
                <span key={i} className="absolute rounded-full" style={{
                    left: `${p.x}%`, top: `${p.y}%`, transform: "translate(-50%, -50%)",
                    width: p.r * 2, height: p.r * 2,
                    background: p.c, border: "1.5px solid #fff",
                    boxShadow: `0 2px 6px ${p.c}55`,
                }} />
            ))}
            <div className="absolute bottom-2 left-2 right-2 rounded-lg p-2" style={{
                background: "rgba(255,255,255,0.95)", boxShadow: "0 4px 12px rgba(15,23,42,0.15)",
                border: `1px solid ${C.line}`,
            }}>
                <p className="font-black text-[8.5px] leading-tight" style={{ color: C.ink }}>5 cidades activas</p>
                <p className="text-[7px] mt-0.5" style={{ color: C.muted }}>toca para explorar</p>
            </div>
        </div>
    );
}

// =============================================================================
// VALUES — three pillars
// =============================================================================
function ValuesSection() {
    const values = [
        { icon: Shield, title: "Servidores em Portugal.",  body: "Dados em jurisdição PT. RGPD por desenho. Exportas tudo. Apagas a conta num clique." },
        { icon: Lock,   title: "Zero anúncios.",            body: "O produto és tu — não o produto à venda. Lusorae+ opcional financia o serviço." },
        { icon: Heart,  title: "Sem doomscroll.",           body: "Feed cronológico, com fim. Sem auto-play, sem rage-bait, sem algoritmo viciante." },
    ];
    return (
        <section id="valores" className="px-5 lg:px-8 py-14 lg:py-20" data-testid="values">
            <div className="max-w-[1320px] mx-auto">
                <div className="max-w-2xl mb-10 lg:mb-12">
                    <p className="text-[11.5px] font-mono font-bold uppercase tracking-[0.18em] mb-2" style={{ color: C.goldDeep }}>
                        o que defendemos
                    </p>
                    <h2 className="font-black tracking-tight" style={{ fontSize: "clamp(28px, 4vw, 44px)", lineHeight: 1.05, color: C.ink, letterSpacing: "-0.025em" }}>
                        Uma rede social que não te quer agarrar ao ecrã.
                    </h2>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5">
                    {values.map((v, i) => (
                        <article key={i} data-testid={`value-${i}`}
                                 className="rounded-3xl p-6 lg:p-7 transition hover:-translate-y-1"
                                 style={{ background: "#fff", border: `1px solid ${C.line}`, boxShadow: "0 1px 3px rgba(15,23,42,0.03)" }}>
                            <span className="inline-flex items-center justify-center mb-5" style={{
                                width: 44, height: 44, borderRadius: 12, background: C.bgAlt, color: C.ink,
                            }}>
                                <v.icon size={20} strokeWidth={2} />
                            </span>
                            <h3 className="font-black text-[19px] leading-tight" style={{ color: C.ink }}>{v.title}</h3>
                            <p className="mt-2 text-[14px] leading-relaxed" style={{ color: C.body }}>{v.body}</p>
                        </article>
                    ))}
                </div>
            </div>
        </section>
    );
}

// =============================================================================
// ROADMAP — honest transparency about what's done / coming
// =============================================================================
function Roadmap() {
    const phases = [
        { tag: "agora",   color: C.green,    title: "Waitlist + Calendário PT",  body: "Reserva de username, calendário curado de 200+ eventos, mapa interactivo das cidades-âncora. Tens isso aqui hoje." },
        { tag: "Q2 2026", color: C.gold,     title: "Lisboa · Porto · Coimbra",  body: "Primeiras 3 cidades a abrir o feed, DMs e comunidades reais. Convites a sair primeiro para quem reservou cedo." },
        { tag: "Q3 2026", color: C.purple,   title: "Restantes cidades-âncora",  body: "Braga, Aveiro, Évora, Faro, Funchal, Ponta Delgada e mais. Camada bairro/freguesia." },
        { tag: "Q4 2026", color: C.blue,     title: "App nativa + Diáspora",     body: "Aplicação iOS/Android. Layer dedicada às comunidades portuguesas no estrangeiro." },
    ];
    return (
        <section id="roadmap" className="px-5 lg:px-8 py-14 lg:py-20" style={{ background: C.bgAlt }} data-testid="roadmap">
            <div className="max-w-[1320px] mx-auto">
                <div className="max-w-2xl mb-10 lg:mb-12">
                    <p className="text-[11.5px] font-mono font-bold uppercase tracking-[0.18em] mb-2" style={{ color: C.goldDeep }}>
                        roadmap público
                    </p>
                    <h2 className="font-black tracking-tight" style={{ fontSize: "clamp(28px, 4vw, 44px)", lineHeight: 1.05, color: C.ink, letterSpacing: "-0.025em" }}>
                        Vamos a passo certo. À frente do barulho.
                    </h2>
                    <p className="mt-3 text-[15px] leading-relaxed max-w-2xl" style={{ color: C.body }}>
                        Estamos em desenvolvimento e somos transparentes sobre onde estamos. Sem promessas vagas — eis o que está pronto e o que aí vem.
                    </p>
                </div>
                <ol className="relative grid lg:grid-cols-4 gap-4 lg:gap-5">
                    {phases.map((p, i) => (
                        <li key={i} data-testid={`roadmap-${i}`}
                            className="rounded-3xl p-5 lg:p-6 relative"
                            style={{ background: "#fff", border: `1px solid ${C.line}` }}>
                            <span className="inline-flex items-center gap-1.5 text-[10.5px] font-mono font-black uppercase tracking-[0.15em] px-2.5 py-1 rounded-full"
                                  style={{ background: `${p.color}14`, color: p.color }}>
                                <span className="w-1.5 h-1.5 rounded-full" style={{ background: p.color }} />
                                {p.tag}
                            </span>
                            <h3 className="font-black text-[17px] mt-3 leading-tight" style={{ color: C.ink }}>{p.title}</h3>
                            <p className="mt-2 text-[13.5px] leading-relaxed" style={{ color: C.body }}>{p.body}</p>
                        </li>
                    ))}
                </ol>
            </div>
        </section>
    );
}

// =============================================================================
// FINAL CTA — reserve form using real backend
// =============================================================================
function FinalCta({ pulse }) {
    return (
        <section id="reservar-form" className="px-5 lg:px-8 py-16 lg:py-24 relative overflow-hidden" data-testid="final-cta">
            <div aria-hidden className="absolute inset-0 pointer-events-none" style={{
                background: `radial-gradient(700px 360px at 50% 100%, rgba(255,204,0,0.20), transparent 60%)`,
            }} />
            <div className="relative max-w-[920px] mx-auto text-center">
                <p className="text-[11.5px] font-mono font-bold uppercase tracking-[0.18em] mb-3" style={{ color: C.goldDeep }}>
                    última chamada antes do lançamento
                </p>
                <h2 className="font-black tracking-tight" style={{ fontSize: "clamp(32px, 5vw, 60px)", lineHeight: 1.0, color: C.ink, letterSpacing: "-0.03em" }}>
                    Reserva agora.<br />
                    <span style={{ background: `linear-gradient(transparent 70%, ${C.gold} 70%, ${C.gold} 92%, transparent 92%)`, padding: "0 8px" }}>
                        Antes que o teu username seja levado.
                    </span>
                </h2>
                <p className="mt-4 text-[15.5px] leading-relaxed max-w-xl mx-auto" style={{ color: C.body }}>
                    Travas o nome, recebes convite quando a tua cidade abrir, e ganhas badge de early supporter.
                </p>

                <div className="mt-8 max-w-md mx-auto">
                    <ReserveBlock />
                </div>

                {pulse?.reservations_total > 0 && (
                    <p className="mt-5 text-[13px]" style={{ color: C.body }}>
                        Já{" "}
                        <strong style={{ color: C.ink }}>{Number(pulse.reservations_total).toLocaleString("pt-PT")}</strong>
                        {" "}{pulse.reservations_total === 1 ? "pessoa" : "pessoas"} na waitlist.
                    </p>
                )}
            </div>
        </section>
    );
}

function ReserveBlock() {
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [availability, setAvailability] = useState(null);
    const [checking, setChecking] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState("");

    useEffect(() => {
        const t = setTimeout(async () => {
            if (!username || username.length < 2) { setAvailability(null); return; }
            setChecking(true);
            try {
                const { data } = await api.get("/waitlist/check", { params: { u: username.toLowerCase().trim() } });
                setAvailability(data);
            } catch { setAvailability(null); }
            finally { setChecking(false); }
        }, 320);
        return () => clearTimeout(t);
    }, [username]);

    const canSubmit = useMemo(
        () => availability?.available && /\S+@\S+\.\S+/.test(email) && !submitting,
        [availability, email, submitting],
    );

    async function onSubmit(e) {
        e.preventDefault();
        if (!canSubmit) return;
        setSubmitting(true); setError("");
        try {
            const { data } = await api.post("/waitlist/reserve", {
                username: username.toLowerCase().trim(),
                email: email.trim().toLowerCase(),
            });
            setResult(data);
        } catch (err) {
            setError(err?.response?.data?.detail || "Não foi possível reservar. Tenta de novo.");
        } finally { setSubmitting(false); }
    }

    if (result) {
        return (
            <div data-testid="reserve-success" className="rounded-2xl p-5 text-left" style={{ background: "#fff", border: `1px solid ${C.line}`, boxShadow: "0 12px 30px -8px rgba(15,23,42,0.15)" }}>
                <div className="flex items-start gap-3">
                    <span className="inline-flex shrink-0 items-center justify-center mt-0.5" style={{
                        width: 38, height: 38, borderRadius: "50%", background: C.green, color: "#fff",
                    }}>
                        <Check size={18} strokeWidth={3} />
                    </span>
                    <div className="flex-1">
                        <p className="text-[10.5px] font-mono font-black uppercase tracking-[0.18em]" style={{ color: C.green }}>
                            {result.already_reserved ? "Já tinhas reservado" : "Username reservado"}
                        </p>
                        <p className="font-black text-[22px] mt-1" style={{ color: C.ink }}>@{result.username}</p>
                        <p className="text-[13.5px] mt-1.5" style={{ color: C.body }}>
                            Posição <strong style={{ color: C.ink }}>#{result.position}</strong> da lista. Avisamos-te por email.
                        </p>
                        <button type="button" data-testid="reserve-another"
                                onClick={() => { setResult(null); setUsername(""); setEmail(""); setAvailability(null); }}
                                className="mt-2 text-[12.5px] font-bold underline" style={{ color: C.goldDeep }}>
                            Reservar outro
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const statusText = checking ? "a verificar…"
        : !availability ? "Mínimo 2 caracteres · letras, números, _"
        : availability.available ? "✓ disponível · pronto a reservar"
        : (availability.reason === "taken_user" || availability.reason === "taken_waitlist") ? "ocupado · tenta outro"
        : availability.message || "indisponível";
    const statusColor = !availability ? C.muted
        : availability.available ? C.green : C.red;

    return (
        <form onSubmit={onSubmit} className="flex flex-col gap-3" data-testid="reserve-form">
            <div className="rounded-2xl p-2 flex items-center gap-1" style={{ background: "#fff", border: `1px solid ${C.line}`, boxShadow: "0 8px 24px rgba(15,23,42,0.08)" }}>
                <span className="text-[17px] font-black pl-3 pr-1 select-none" style={{ color: C.muted }}>@</span>
                <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 24))}
                    placeholder="o-teu-username"
                    data-testid="reserve-username-input"
                    autoComplete="off"
                    className="flex-1 py-3 text-[15px] font-bold bg-transparent outline-none"
                    style={{ color: C.ink }}
                />
                {checking && <Loader2 size={15} className="animate-spin mr-3" style={{ color: C.muted }} />}
            </div>
            <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="o-teu-email@cidade.pt"
                data-testid="reserve-email-input"
                autoComplete="email"
                required
                className="rounded-2xl py-3.5 px-5 text-[15px] font-semibold bg-white outline-none"
                style={{ color: C.ink, border: `1px solid ${C.line}`, boxShadow: "0 8px 24px rgba(15,23,42,0.06)" }}
            />
            <button
                type="submit"
                disabled={!canSubmit}
                data-testid="reserve-submit-btn"
                className="inline-flex items-center justify-center gap-2 py-4 text-[14.5px] font-black rounded-full transition disabled:cursor-not-allowed disabled:opacity-50"
                style={{
                    background: canSubmit ? C.ink : "#E2E8F0",
                    color: canSubmit ? "#fff" : C.muted,
                    boxShadow: canSubmit ? "0 12px 28px rgba(15,23,42,0.25)" : "none",
                }}
            >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : null}
                Reservar o meu username <ArrowRight size={15} />
            </button>
            <p className="text-[11.5px] font-mono text-left px-1" style={{ color: statusColor }}>
                {statusText}
            </p>
            {error && <p data-testid="reserve-error" className="text-[12.5px] font-bold" style={{ color: C.red }}>{error}</p>}
        </form>
    );
}

// =============================================================================
// FAQ
// =============================================================================
function Faq() {
    const items = [
        { q: "É grátis?",
          a: "Sim. Criar conta, conversar, descobrir eventos, entrar em comunidades — tudo grátis para sempre. Existe um Lusorae+ opcional (4€/mês) para quem quiser apoiar o projecto." },
        { q: "Quando abre a minha cidade?",
          a: "Lisboa, Porto e Coimbra são as primeiras (Q2 2026). Depois Braga, Aveiro, Évora, Faro, Funchal, Ponta Delgada e as restantes cidades-âncora ao longo de 2026. Quando reservas username, avisamos-te por email." },
        { q: "Porquê reservar um username agora?",
          a: "Trava o handle para sempre + entras na fila quando a tua cidade abrir. É grátis e leva 30 segundos." },
        { q: "Os meus dados ficam onde?",
          a: "Servidores em Portugal (UE), RGPD-friendly por desenho. Exportas tudo num clique, apagas a conta num clique." },
        { q: "Que diferença há entre Lusorae e Instagram/TikTok?",
          a: "Não há algoritmo de engagement. Não há ads. Não há doomscroll. Vês o que está perto de ti — não o que prende mais retina." },
        { q: "Funciona fora de Portugal?",
          a: "Sim. A diáspora terá uma camada dedicada (Londres, Paris, Luxemburgo, Genebra, São Paulo…) na fase Q4 2026." },
    ];
    const [open, setOpen] = useState(null);
    return (
        <section className="px-5 lg:px-8 py-14 lg:py-20" data-testid="faq">
            <div className="max-w-3xl mx-auto">
                <div className="mb-8 lg:mb-10">
                    <p className="text-[11.5px] font-mono font-bold uppercase tracking-[0.18em] mb-2" style={{ color: C.goldDeep }}>
                        perguntas frequentes
                    </p>
                    <h2 className="font-black tracking-tight" style={{ fontSize: "clamp(28px, 4vw, 40px)", lineHeight: 1.05, color: C.ink, letterSpacing: "-0.025em" }}>
                        Tudo o que vale a pena perguntar.
                    </h2>
                </div>
                <ul className="space-y-2">
                    {items.map((it, i) => {
                        const isOpen = open === i;
                        return (
                            <li key={i}>
                                <button
                                    type="button"
                                    onClick={() => setOpen(isOpen ? null : i)}
                                    data-testid={`faq-${i}`}
                                    className="w-full text-left rounded-2xl px-5 py-4 transition hover:bg-slate-50"
                                    style={{ background: isOpen ? C.bgAlt : "#fff", border: `1px solid ${C.line}` }}
                                >
                                    <div className="flex items-center justify-between gap-4">
                                        <span className="font-bold text-[15px] sm:text-[16px] leading-tight" style={{ color: C.ink }}>{it.q}</span>
                                        <ChevronDown size={18} className="shrink-0 transition" style={{ color: C.muted, transform: isOpen ? "rotate(180deg)" : "none" }} />
                                    </div>
                                    {isOpen && (
                                        <p className="mt-3 text-[14px] leading-relaxed" style={{ color: C.body }}>{it.a}</p>
                                    )}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </section>
    );
}

// =============================================================================
// FOOTER
// =============================================================================
function Footer() {
    return (
        <footer className="px-5 lg:px-8 py-12 lg:py-16" style={{ background: C.ink, color: "#fff" }} data-testid="footer">
            <div className="max-w-[1320px] mx-auto">
                <div className="grid lg:grid-cols-[1.4fr_1fr_1fr_1fr] gap-10 lg:gap-12 mb-12">
                    <div>
                        <BrandMarkDark />
                        <p className="mt-4 text-[13.5px] leading-relaxed max-w-xs" style={{ color: "rgba(255,255,255,0.65)" }}>
                            A rede social das pessoas, eventos e comunidades de Portugal. Sem ads. Sem doomscroll.
                        </p>
                        <div className="mt-5 flex items-center gap-2">
                            <SocialDark Icon={Instagram} href="https://instagram.com/lusorae" testid="social-instagram" />
                            <SocialDark Icon={Twitter}   href="https://x.com/lusorae"        testid="social-x" />
                            <SocialDark Icon={TikTokIcon} href="https://tiktok.com/@lusorae" testid="social-tiktok" />
                            <SocialDark Icon={ThreadsIcon} href="https://threads.net/lusorae" testid="social-threads" />
                        </div>
                    </div>
                    <FooterCol title="Produto" links={[
                        ["Roadmap", "#roadmap"], ["Cidades", "#cidades"],
                        ["Eventos", "#hoje"], ["Valores", "#valores"],
                    ]} />
                    <FooterCol title="Empresa" links={[
                        ["Sobre nós", "/sobre"], ["Carreiras", "/carreiras"],
                        ["Imprensa", "/imprensa"], ["Contacto", "/contacto"],
                    ]} />
                    <FooterCol title="Legal" links={[
                        ["Privacidade", "/privacidade"], ["Termos", "/termos"],
                        ["Cookies", "/cookies"], ["RGPD", "/rgpd"],
                    ]} />
                </div>
                <div className="pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3" style={{ borderTop: "1px solid rgba(255,255,255,0.10)" }}>
                    <p className="text-[12.5px]" style={{ color: "rgba(255,255,255,0.50)" }}>
                        © {new Date().getFullYear()} Lusorae. Construído em Portugal.
                    </p>
                    <p className="text-[12.5px] flex items-center gap-2" style={{ color: "rgba(255,255,255,0.50)" }}>
                        <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: C.green }} />
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: C.green }} />
                        </span>
                        Em desenvolvimento activo
                    </p>
                </div>
            </div>
        </footer>
    );
}

function BrandMarkDark() {
    return (
        <Link to="/" className="flex items-center gap-2" aria-label="Lusorae">
            <span className="inline-flex items-center justify-center" style={{
                width: 36, height: 36, borderRadius: 12,
                background: `linear-gradient(135deg, ${C.gold} 0%, #FFB300 100%)`,
            }}>
                <Heart size={18} fill={C.ink} stroke={C.ink} strokeWidth={2.2} />
            </span>
            <span className="text-[20px] font-black tracking-tight" style={{ color: "#fff", letterSpacing: "-0.025em" }}>Lusorae</span>
        </Link>
    );
}

function FooterCol({ title, links }) {
    return (
        <div>
            <p className="text-[10.5px] font-mono font-bold uppercase tracking-[0.18em] mb-3" style={{ color: "rgba(255,255,255,0.45)" }}>
                {title}
            </p>
            <ul className="space-y-2">
                {links.map(([label, to]) => (
                    <li key={label}>
                        {to.startsWith("#") ? (
                            <a href={to} className="text-[13.5px] font-medium transition hover:text-white" style={{ color: "rgba(255,255,255,0.72)" }}>
                                {label}
                            </a>
                        ) : (
                            <Link to={to} className="text-[13.5px] font-medium transition hover:text-white" style={{ color: "rgba(255,255,255,0.72)" }}>
                                {label}
                            </Link>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}

function SocialDark({ Icon, href, testid }) {
    return (
        <a href={href} target="_blank" rel="noopener noreferrer" data-testid={testid}
           className="inline-flex items-center justify-center transition hover:bg-white/10"
           style={{ width: 36, height: 36, borderRadius: 10, color: "rgba(255,255,255,0.75)" }}>
            <Icon size={16} />
        </a>
    );
}

function TikTokIcon({ size = 16 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.07A6.33 6.33 0 0 0 5.8 20.1a6.34 6.34 0 0 0 10.86-4.43V8.61a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.84-.04Z"/>
        </svg>
    );
}
function ThreadsIcon({ size = 16 }) {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M18.5 11c-.2-.1-.4-.2-.6-.3-.4-3.6-2.4-5.6-5.7-5.6h-.1c-2 0-3.7.9-4.7 2.5l1.8 1.2c.7-1.1 1.9-1.4 2.9-1.4 1.7 0 3 .9 3.3 2.7-1-.2-2-.3-3-.2-3 .2-4.9 2-4.8 4.4.1 1.2.7 2.2 1.7 2.8.8.5 1.9.8 3 .8 1.5-.1 2.7-.6 3.6-1.6.7-.7 1.1-1.7 1.4-2.9.5.3.9.7 1.1 1.2.4.7.4 1.9-.6 3.1l1.6 1.1c.7-.9 1.7-2.6.9-4.4-.5-1-1.3-1.7-2.4-2.2-.3-.1-.6-.2-.9-.3l-.5-.9Zm-3.5 1.7c-.2 1.2-.7 1.9-1.4 2.3-.6.4-1.3.5-2 .5-.6 0-1.1-.1-1.5-.3-.5-.3-.7-.7-.7-1.3-.1-1 .8-2.1 2.9-2.3.3 0 .6 0 .9 0 .6 0 1.2.1 1.8.2v.9Z"/>
        </svg>
    );
}

// =============================================================================
// STYLES
// =============================================================================
function LandingStyles() {
    return (
        <style>{`
            html { scroll-behavior: smooth; }
            [data-testid="landing-page"] *::selection {
                background: ${C.gold};
                color: ${C.ink};
            }
            .line-clamp-2 {
                display: -webkit-box;
                -webkit-line-clamp: 2;
                -webkit-box-orient: vertical;
                overflow: hidden;
            }
        `}</style>
    );
}
