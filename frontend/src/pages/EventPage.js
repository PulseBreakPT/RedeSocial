import { useEffect, useMemo, useState, useCallback } from "react";
import { Link, useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
    ArrowLeft, Calendar, MapPin, Share2, Bookmark, BookmarkCheck, Check, Star,
    ChevronRight, Bell, ExternalLink, Users, Sparkles,
} from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { EventCountdown } from "../components/EventCountdown";
import { EventShareSheet } from "../components/EventShareSheet";
import { toast } from "sonner";

/**
 * EventPage — landing pública partilhável de um evento curado do Calendário.
 *
 * URL canónica: /e/{slug}
 * Acesso: público (sem auth wall). Visitantes anónimos vêem tudo;
 *         RSVP e lembretes pedem registo (smart paywall, não wall).
 *
 * Componentes-chave:
 *   - Hero "cartaz" full-bleed com gradient categoria + countdown live
 *   - Social proof (X interessados + amigos teus + cidade)
 *   - RSVP "Tenho interesse" / "Talvez" / cancelar
 *   - Share sheet rico (6 canais + preview OG)
 *   - Eventos semelhantes (algoritmo categoria + região + proximidade)
 *   - Smart paywall sticky para anónimos
 */

const PT = {
    ink: "#0d0d10",
    red: "#c8102e",
    gold: "#d4a017",
    azul: "#1f4e79",
    cream: "#f7f5ef",
};
const HAIRLINE = "1px solid rgba(10,10,10,0.08)";
const SHADOW_SOFT = "0 1px 2px rgba(0,0,0,0.04), 0 8px 24px -8px rgba(0,0,0,0.12)";

const MONTHS_PT = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const MONTHS_PT_SHORT = ["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];

/* ── Paleta por categoria (matched com OG image backend) ── */
function categoryGradient(category) {
    const palettes = {
        feriado:         "linear-gradient(135deg, #191c23 0%, #0a0a0a 100%)",
        festa_cidade:    "linear-gradient(135deg, #c8102e 0%, #82051a 100%)",
        festival_musica: "linear-gradient(135deg, #1e5092 0%, #0f1e3c 100%)",
        feira:           "linear-gradient(135deg, #b45a1e 0%, #5a2810 100%)",
        cultura:         "linear-gradient(135deg, #2d3741 0%, #0f1419 100%)",
        religioso:       "linear-gradient(135deg, #643c82 0%, #321946 100%)",
        sazonal:         "linear-gradient(135deg, #28643c 0%, #0f2d19 100%)",
        desporto:        "linear-gradient(135deg, #141e50 0%, #0a0f28 100%)",
        gastronomia:     "linear-gradient(135deg, #b4322d 0%, #5a140f 100%)",
    };
    return palettes[category] || palettes.feriado;
}

function categoryAccent(category) {
    const accents = {
        feriado: "#ffd700",
        festa_cidade: "#ffdc50",
        festival_musica: "#ffc832",
        feira: "#ffc864",
        cultura: "#f5dcb4",
        religioso: "#f0d2f0",
        sazonal: "#ffd764",
        desporto: "#ff8232",
        gastronomia: "#ffdc64",
    };
    return accents[category] || "#ffd700";
}

function fmtDateRange(iso_date, iso_end) {
    if (!iso_date) return "";
    const a = new Date(iso_date + "T00:00:00");
    if (!iso_end || iso_end === iso_date) {
        return `${a.getDate()} de ${MONTHS_PT[a.getMonth()].toLowerCase()} ${a.getFullYear()}`;
    }
    const b = new Date(iso_end + "T00:00:00");
    if (a.getMonth() === b.getMonth()) {
        return `${a.getDate()}–${b.getDate()} de ${MONTHS_PT[a.getMonth()].toLowerCase()} ${a.getFullYear()}`;
    }
    return `${a.getDate()} ${MONTHS_PT_SHORT[a.getMonth()]} → ${b.getDate()} ${MONTHS_PT_SHORT[b.getMonth()]} ${a.getFullYear()}`;
}

export default function EventPage() {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const { user } = useAuth();

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [social, setSocial] = useState(null);
    const [shareOpen, setShareOpen] = useState(false);
    const [interest, setInterest] = useState(null); // "going" | "maybe" | null
    const [interestLoading, setInterestLoading] = useState(false);
    const [counts, setCounts] = useState({ going: 0, maybe: 0, shares: 0 });

    /* ── Fetch event detail ── */
    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            setError(null);
            try {
                const { data: payload } = await api.get(`/calendar/event/${slug}`);
                if (cancelled) return;
                setData(payload);
                setCounts(payload.counts || { going: 0, maybe: 0, shares: 0 });
                setInterest(payload.viewer_state?.interest || null);
            } catch (e) {
                if (cancelled) return;
                if (e?.response?.status === 404) setError("not_found");
                else setError(e?.message || "Erro a carregar evento");
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [slug]);

    /* ── Fetch social proof (auth-only) ── */
    useEffect(() => {
        if (!user || !data) return;
        let cancelled = false;
        (async () => {
            try {
                const { data: s } = await api.get(`/calendar/event/${slug}/social`);
                if (!cancelled) setSocial(s);
            } catch { /* opcional */ }
        })();
        return () => { cancelled = true; };
    }, [user, data, slug]);

    /* ── Document title + meta tags dinâmicas (best-effort para SEO/share) ── */
    useEffect(() => {
        if (!data?.event) return;
        const ev = data.event;
        const range = fmtDateRange(ev.iso_date, ev.iso_end);
        const newTitle = `${ev.emoji || ""} ${ev.title} · ${range} — Lusorae`;
        document.title = newTitle;
        // Atualiza meta tags og:* + twitter:* directamente no head
        const setMeta = (name, content, attr = "name") => {
            let tag = document.querySelector(`meta[${attr}="${name}"]`);
            if (!tag) {
                tag = document.createElement("meta");
                tag.setAttribute(attr, name);
                document.head.appendChild(tag);
            }
            tag.setAttribute("content", content);
        };
        const desc = ev.subtitle || `${ev.title} · ${range}${ev.city ? " · " + ev.city : ""}`;
        const ogImg = `${window.location.origin}/api/og/event/${slug}.png`;
        setMeta("description", desc);
        setMeta("og:title", `${ev.title} · ${range}`, "property");
        setMeta("og:description", desc, "property");
        setMeta("og:image", ogImg, "property");
        setMeta("og:type", "event", "property");
        setMeta("og:url", `${window.location.origin}/e/${slug}`, "property");
        setMeta("twitter:card", "summary_large_image");
        setMeta("twitter:title", `${ev.title} · ${range}`);
        setMeta("twitter:description", desc);
        setMeta("twitter:image", ogImg);
        return () => {
            document.title = "Lusorae";
        };
    }, [data, slug]);

    /* ── Attribution: registar VIEW (best-effort) quando vem de share ── */
    useEffect(() => {
        if (!data?.event) return;
        const ref = searchParams.get("ref");
        if (ref !== "share") return;
        // Lazy fire (não bloqueia render). Backend já regista o share quando
        // alguém clica em "partilhar"; aqui apenas marcamos visita.
        // (não tem endpoint dedicado — analytics consent-gated cobre)
        try {
            if (typeof window.posthog?.capture === "function") {
                window.posthog.capture("event_view_from_share", {
                    slug,
                    via: searchParams.get("via"),
                    channel: searchParams.get("ch"),
                });
            }
        } catch { /* ignore */ }
    }, [data, searchParams, slug]);

    /* ── Toggle interesse ── */
    const handleInterest = useCallback(async (type) => {
        if (!user) {
            toast("Cria conta grátis para guardares o evento.", {
                action: { label: "Entrar", onClick: () => navigate(`/register?next=/e/${slug}`) },
            });
            return;
        }
        const newType = interest === type ? null : type;
        setInterestLoading(true);
        try {
            const { data: res } = await api.post(`/calendar/event/${slug}/interest`, { type: newType });
            setInterest(res.interest);
            setCounts(res.counts);
            if (res.interest === "going") {
                toast.success("Vais! Receberás aviso 1 dia antes.");
            } else if (res.interest === "maybe") {
                toast("Marcado como talvez.");
            } else {
                toast("Interesse removido.");
            }
        } catch {
            toast.error("Não foi possível guardar. Tenta de novo.");
        } finally {
            setInterestLoading(false);
        }
    }, [interest, slug, user, navigate]);

    /* ── States: loading / error ── */
    if (loading) {
        return (
            <div className="min-h-screen grid place-items-center">
                <div className="inline-flex items-center gap-2">
                    <Sparkles size={14} strokeWidth={2.2} className="animate-pulse" style={{ color: PT.gold }} />
                    <span className="font-mono uppercase tracking-[0.14em] text-[11px]" style={{ color: "rgba(10,10,10,0.55)" }}>
                        a carregar evento…
                    </span>
                </div>
            </div>
        );
    }

    if (error === "not_found" || !data?.event) {
        return (
            <div className="min-h-screen grid place-items-center px-6">
                <div className="text-center max-w-md">
                    <Calendar size={28} strokeWidth={2.2} style={{ color: "rgba(10,10,10,0.4)", margin: "0 auto 12px" }} />
                    <h1 className="font-black tracking-tight" style={{ fontSize: 26, color: PT.ink, letterSpacing: "-0.02em" }}>
                        Evento não encontrado.
                    </h1>
                    <p className="text-[14px] mt-2" style={{ color: "rgba(10,10,10,0.6)" }}>
                        Este link pode estar desactualizado. Vê o que vem aí no Calendário.
                    </p>
                    <Link
                        to="/calendario"
                        className="inline-flex items-center gap-1.5 mt-6 px-4 py-2 rounded-full font-semibold text-[13px] transition-all"
                        style={{ background: PT.ink, color: "#fff", boxShadow: "0 4px 12px -4px rgba(10,10,10,0.25)" }}
                    >
                        <ArrowLeft size={13} strokeWidth={2.4} />
                        Ir para o Calendário
                    </Link>
                </div>
            </div>
        );
    }

    const ev = data.event;
    const similar = data.similar || [];
    const range = fmtDateRange(ev.iso_date, ev.iso_end);
    const catMeta = data.categories?.[ev.category];
    const accent = categoryAccent(ev.category);
    const isAnon = !user;
    const totalInterested = counts.going + counts.maybe;

    return (
        <div className="min-h-screen" style={{ background: "#fff" }}>
            {/* ════════════════════════════════════════════════════
                HERO — cartaz compacto com gradient categoria
            ════════════════════════════════════════════════════ */}
            <header
                className="relative overflow-hidden"
                style={{ background: categoryGradient(ev.category) }}
                data-testid="event-hero"
            >
                {/* Top accent bar */}
                <div aria-hidden className="absolute top-0 left-0 right-0 h-1" style={{ background: accent }} />

                {/* Top bar: back + share */}
                <div className="relative px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between z-10">
                    <Link
                        to="/calendario"
                        data-testid="event-back"
                        aria-label="Voltar ao Calendário"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-mono uppercase tracking-[0.12em] text-[10.5px] transition-all"
                        style={{
                            background: "rgba(255,255,255,0.10)",
                            color: "#fff",
                            border: "1px solid rgba(255,255,255,0.18)",
                            backdropFilter: "blur(10px)",
                        }}
                    >
                        <ArrowLeft size={11} strokeWidth={2.4} />
                        calendário
                    </Link>
                    <button
                        type="button"
                        data-testid="event-share-trigger-top"
                        onClick={() => setShareOpen(true)}
                        aria-label="Partilhar evento"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-mono uppercase tracking-[0.12em] text-[10.5px] transition-all hover:bg-white/20"
                        style={{
                            background: "rgba(255,255,255,0.10)",
                            color: "#fff",
                            border: "1px solid rgba(255,255,255,0.18)",
                            backdropFilter: "blur(10px)",
                        }}
                    >
                        <Share2 size={11} strokeWidth={2.4} />
                        partilhar
                    </button>
                </div>

                {/* Hero content */}
                <div className="relative px-4 sm:px-6 lg:px-8 pb-8 sm:pb-10 max-w-[1100px] mx-auto z-10">
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-4 lg:gap-8 items-end pt-4 sm:pt-6">
                        <div className="min-w-0">
                            {/* Category kicker */}
                            <div className="inline-flex items-center gap-2 mb-3">
                                <span aria-hidden className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: accent }} />
                                <span
                                    className="font-mono uppercase tracking-[0.18em] text-[10.5px] sm:text-[11px]"
                                    style={{ color: accent }}
                                >
                                    {catMeta?.label || ev.category}
                                </span>
                                {ev.city && (
                                    <>
                                        <span aria-hidden className="text-white/40">·</span>
                                        <span className="inline-flex items-center gap-1 font-mono uppercase tracking-[0.14em] text-[10.5px]" style={{ color: "rgba(255,255,255,0.85)" }}>
                                            <MapPin size={10} strokeWidth={2.2} />
                                            {ev.city}
                                        </span>
                                    </>
                                )}
                            </div>

                            {/* Title — mais compacto */}
                            <h1
                                className="font-black tracking-tight"
                                data-testid="event-title"
                                style={{
                                    color: "#fff",
                                    fontSize: "clamp(26px, 5.5vw, 48px)",
                                    lineHeight: 1.02,
                                    letterSpacing: "-0.03em",
                                }}
                            >
                                {ev.title}
                            </h1>

                            {/* Subtitle */}
                            {ev.subtitle && (
                                <p
                                    className="mt-2.5 max-w-[640px] leading-snug"
                                    style={{
                                        color: "rgba(255,255,255,0.82)",
                                        fontSize: "clamp(13.5px, 1.8vw, 16px)",
                                    }}
                                >
                                    {ev.subtitle}
                                </p>
                            )}

                            {/* Date + countdown na mesma linha sempre que possível */}
                            <div className="mt-4 flex items-center gap-3 flex-wrap">
                                <span className="inline-flex items-center gap-1.5 font-mono uppercase tracking-[0.10em] text-[11.5px]" style={{ color: "rgba(255,255,255,0.85)" }}>
                                    <Calendar size={12} strokeWidth={2.2} style={{ color: "rgba(255,255,255,0.7)" }} />
                                    {range}
                                </span>
                                <span aria-hidden className="text-white/30">·</span>
                                <EventCountdown
                                    iso_date={ev.iso_date}
                                    iso_end={ev.iso_end}
                                    status={ev.status}
                                    size="md"
                                />
                            </div>

                            {/* Primary CTAs — desktop, mais compacto */}
                            <div className="hidden sm:flex items-center gap-2 mt-5">
                                <button
                                    type="button"
                                    data-testid="event-interest-going"
                                    onClick={() => handleInterest("going")}
                                    disabled={interestLoading || ev.status === "past"}
                                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full font-semibold text-[13px] transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed hover:-translate-y-0.5"
                                    style={{
                                        background: interest === "going" ? accent : "#fff",
                                        color: PT.ink,
                                        boxShadow: "0 6px 16px -4px rgba(0,0,0,0.30)",
                                    }}
                                >
                                    {interest === "going" ? <BookmarkCheck size={14} strokeWidth={2.4} /> : <Bookmark size={14} strokeWidth={2.4} />}
                                    {interest === "going" ? "Vou" : "Tenho interesse"}
                                </button>
                                <button
                                    type="button"
                                    data-testid="event-interest-maybe"
                                    onClick={() => handleInterest("maybe")}
                                    disabled={interestLoading || ev.status === "past"}
                                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full font-semibold text-[13px] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                                    style={{
                                        background: interest === "maybe" ? "rgba(255,255,255,0.20)" : "transparent",
                                        color: "#fff",
                                        border: "1px solid rgba(255,255,255,0.30)",
                                    }}
                                >
                                    {interest === "maybe" ? "Marcado talvez" : "Talvez"}
                                </button>
                                <button
                                    type="button"
                                    data-testid="event-share-trigger-hero"
                                    onClick={() => setShareOpen(true)}
                                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full font-semibold text-[13px] transition-all hover:bg-white/10"
                                    style={{
                                        background: "transparent",
                                        color: "#fff",
                                        border: "1px solid rgba(255,255,255,0.30)",
                                    }}
                                >
                                    <Share2 size={14} strokeWidth={2.4} />
                                    Partilhar
                                </button>
                            </div>
                        </div>

                        {/* Emoji tipográfico — mais pequeno, escondido em tablet */}
                        <div
                            aria-hidden
                            className="hidden lg:flex items-end justify-end"
                            style={{
                                fontSize: 140,
                                lineHeight: 1,
                                filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.30))",
                            }}
                        >
                            {ev.emoji}
                        </div>
                    </div>
                </div>
            </header>

            {/* ════════════════════════════════════════════════════
                CORPO — social proof, similar, etc.
            ════════════════════════════════════════════════════ */}
            <div className="px-4 sm:px-6 lg:px-8 py-10 sm:py-14 max-w-[1100px] mx-auto pb-32 sm:pb-14">
                {/* ── Counters strip ── */}
                <section
                    className="grid grid-cols-3 rounded-2xl overflow-hidden mb-10"
                    style={{ background: "#fff", border: HAIRLINE, boxShadow: SHADOW_SOFT }}
                    data-testid="event-counters"
                >
                    <CounterCell label="vão" value={counts.going} dot="#228a49" />
                    <CounterCell label="talvez" value={counts.maybe} dot={PT.gold} />
                    <CounterCell label="partilhas" value={counts.shares} dot={PT.red} noBorder />
                </section>

                {/* ── Social proof (autenticado) ── */}
                {user && social && (social.friends_count > 0 || social.city_count > 0) && (
                    <section className="mb-10" data-testid="event-social-proof">
                        <h2 className="inline-flex items-center gap-2 font-semibold tracking-tight text-[14px] mb-4" style={{ color: PT.ink }}>
                            <Users size={14} strokeWidth={2.2} />
                            Da tua rede
                        </h2>
                        <div
                            className="rounded-2xl p-5"
                            style={{ background: "#fff", border: HAIRLINE, boxShadow: SHADOW_SOFT }}
                        >
                            {social.friends_count > 0 && (
                                <div className="flex items-center gap-3 mb-3 last:mb-0">
                                    <div className="flex -space-x-2.5">
                                        {social.friends.slice(0, 6).map((f) => (
                                            <Link
                                                key={f.id}
                                                to={`/u/${f.username}`}
                                                className="block w-8 h-8 rounded-full overflow-hidden border-2 border-white"
                                                style={{ background: "rgba(10,10,10,0.08)" }}
                                                title={f.name || f.username}
                                            >
                                                {f.avatar ? (
                                                    <img src={f.avatar} alt={f.name} className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="w-full h-full flex items-center justify-center font-bold text-[11px]" style={{ color: PT.ink }}>
                                                        {(f.name || f.username || "?")[0].toUpperCase()}
                                                    </span>
                                                )}
                                            </Link>
                                        ))}
                                    </div>
                                    <p className="text-[13.5px]" style={{ color: "rgba(10,10,10,0.72)" }}>
                                        <span className="font-semibold" style={{ color: PT.ink }}>
                                            {social.friends_count} {social.friends_count === 1 ? "amigo" : "amigos"} {social.friends_count === 1 ? "teu" : "teus"}
                                        </span>{" "}
                                        {social.friends_count === 1 ? "vai" : "vão"} a este evento
                                    </p>
                                </div>
                            )}
                            {social.city_count > 0 && (
                                <div className="flex items-center gap-2 text-[13.5px]" style={{ color: "rgba(10,10,10,0.72)" }}>
                                    <span aria-hidden className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: PT.azul }} />
                                    <span className="font-semibold" style={{ color: PT.ink }}>
                                        +{social.city_count}
                                    </span>{" "}
                                    pessoas de {social.city} interessadas
                                </div>
                            )}
                        </div>
                    </section>
                )}

                {/* ── Sobre / link externo ── */}
                {ev.url && (
                    <section className="mb-10">
                        <h2 className="font-semibold tracking-tight text-[14px] mb-3" style={{ color: PT.ink }}>
                            Site oficial
                        </h2>
                        <a
                            href={ev.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            data-testid="event-official-link"
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full font-medium text-[13px] transition-all hover:-translate-y-0.5"
                            style={{
                                background: "#fff",
                                color: PT.azul,
                                border: HAIRLINE,
                                boxShadow: SHADOW_SOFT,
                            }}
                        >
                            <ExternalLink size={13} strokeWidth={2.2} />
                            {new URL(ev.url).hostname.replace("www.", "")}
                            <ChevronRight size={13} strokeWidth={2.2} />
                        </a>
                    </section>
                )}

                {/* ── Eventos semelhantes ── */}
                {similar.length > 0 && (
                    <section className="mb-10" data-testid="event-similar">
                        <h2 className="inline-flex items-center gap-2 font-semibold tracking-tight text-[14px] mb-4" style={{ color: PT.ink }}>
                            <Star size={14} strokeWidth={2.2} />
                            Também vais gostar
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {similar.map((s) => (
                                <SimilarCard key={s.key} ev={s} catMetaMap={data.categories} />
                            ))}
                        </div>
                    </section>
                )}

                {/* ── Footer attribution ── */}
                <footer
                    className="text-center mt-12 p-5 rounded-2xl"
                    style={{ background: "rgba(10,10,10,0.02)", border: HAIRLINE }}
                >
                    <p className="font-mono uppercase tracking-[0.14em] text-[10.5px]" style={{ color: "rgba(10,10,10,0.55)" }}>
                        evento curado pela lusorae · calendário pt
                    </p>
                    <Link
                        to="/calendario"
                        className="inline-flex items-center gap-1.5 mt-2 text-[12.5px] font-semibold hover:underline underline-offset-4"
                        style={{ color: PT.ink }}
                    >
                        Ver tudo o que vem aí
                        <ChevronRight size={12} strokeWidth={2.4} />
                    </Link>
                </footer>
            </div>

            {/* ════════════════════════════════════════════════════
                FLOATING BAR mobile (sticky bottom)
            ════════════════════════════════════════════════════ */}
            <div
                className="sm:hidden fixed bottom-0 left-0 right-0 z-40 px-4 py-3"
                style={{
                    background: "rgba(255,255,255,0.96)",
                    borderTop: HAIRLINE,
                    backdropFilter: "blur(14px)",
                    paddingBottom: "calc(12px + env(safe-area-inset-bottom))",
                }}
                data-testid="event-floating-bar"
            >
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        data-testid="event-interest-going-mobile"
                        onClick={() => handleInterest("going")}
                        disabled={interestLoading || ev.status === "past"}
                        className="flex-1 inline-flex items-center justify-center gap-2 py-3 rounded-full font-semibold text-[13.5px] disabled:opacity-40"
                        style={{
                            background: interest === "going" ? accent : PT.ink,
                            color: interest === "going" ? PT.ink : "#fff",
                            border: interest === "going" ? `1px solid ${accent}` : "1px solid rgba(10,10,10,0.20)",
                            boxShadow: "0 4px 12px -4px rgba(10,10,10,0.25)",
                        }}
                    >
                        {interest === "going" ? <BookmarkCheck size={14} strokeWidth={2.4} /> : <Bookmark size={14} strokeWidth={2.4} />}
                        {interest === "going" ? "Vou" : "Tenho interesse"}
                    </button>
                    <button
                        type="button"
                        data-testid="event-share-trigger-mobile"
                        onClick={() => setShareOpen(true)}
                        aria-label="Partilhar evento"
                        className="inline-flex items-center justify-center w-12 h-12 rounded-full"
                        style={{
                            background: "#fff",
                            color: PT.ink,
                            border: HAIRLINE,
                            boxShadow: SHADOW_SOFT,
                        }}
                    >
                        <Share2 size={16} strokeWidth={2.4} />
                    </button>
                </div>
            </div>

            {/* ════════════════════════════════════════════════════
                SMART PAYWALL — anónimos (não bloqueia, atrai)
            ════════════════════════════════════════════════════ */}
            {isAnon && (
                <div
                    className="hidden sm:block fixed bottom-6 right-6 z-30 max-w-[360px] p-4 rounded-2xl"
                    style={{
                        background: "#fff",
                        border: HAIRLINE,
                        boxShadow: "0 16px 40px -12px rgba(0,0,0,0.20)",
                    }}
                    data-testid="event-paywall-anon"
                >
                    <div className="flex items-start gap-3">
                        <div
                            className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ background: accent }}
                        >
                            <Bell size={16} strokeWidth={2.4} style={{ color: PT.ink }} />
                        </div>
                        <div className="min-w-0">
                            <p className="font-semibold tracking-tight text-[13.5px]" style={{ color: PT.ink }}>
                                Não percas {ev.title}.
                            </p>
                            <p className="text-[12.5px] mt-1" style={{ color: "rgba(10,10,10,0.65)" }}>
                                Junta-te à Lusorae para guardar, receber lembrete e ver quem mais vai.
                            </p>
                            <Link
                                to={`/register?next=/e/${slug}`}
                                data-testid="event-paywall-cta"
                                className="inline-flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-full font-semibold text-[12px] transition-all"
                                style={{
                                    background: PT.ink,
                                    color: "#fff",
                                }}
                            >
                                Criar conta grátis
                                <ChevronRight size={12} strokeWidth={2.4} />
                            </Link>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Share Sheet ── */}
            <EventShareSheet
                open={shareOpen}
                onOpenChange={setShareOpen}
                event={ev}
                onShared={(channel, res) => {
                    setCounts((c) => ({ ...c, shares: (c.shares || 0) + 1 }));
                    if (res?.copied) toast.success("Link copiado.");
                }}
            />
        </div>
    );
}

/* ════════════════════════════════════════════════════════════════
   CounterCell — célula da counters strip
   ════════════════════════════════════════════════════════════════ */
function CounterCell({ label, value, dot, noBorder = false }) {
    return (
        <div
            className={`px-4 py-4 text-center ${noBorder ? "" : "border-r"}`}
            style={{ borderColor: "rgba(10,10,10,0.08)" }}
        >
            <span
                className="inline-flex items-center gap-1.5 font-mono uppercase tracking-[0.14em] text-[10.5px]"
                style={{ color: "rgba(10,10,10,0.55)" }}
            >
                <span aria-hidden className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: dot }} />
                {label}
            </span>
            <p
                className="font-black mt-1.5 tabular-nums leading-none"
                style={{
                    color: PT.ink,
                    fontSize: "clamp(20px, 4vw, 28px)",
                    letterSpacing: "-0.02em",
                }}
            >
                {value || 0}
            </p>
        </div>
    );
}

/* ════════════════════════════════════════════════════════════════
   SimilarCard — card de evento relacionado
   ════════════════════════════════════════════════════════════════ */
function SimilarCard({ ev, catMetaMap }) {
    const cat = catMetaMap?.[ev.category];
    const accent = categoryAccent(ev.category);
    const [, mm, dd] = ev.iso_date.split("-");
    const month = MONTHS_PT_SHORT[parseInt(mm, 10) - 1];
    const daysLabel = ev.status === "now" ? "agora" : ev.status === "past" ? "passou" : ev.days_until === 0 ? "hoje" : ev.days_until === 1 ? "amanhã" : `em ${ev.days_until}d`;
    return (
        <Link
            to={`/e/${ev.slug}`}
            data-testid={`event-similar-${ev.slug}`}
            className="group flex items-center gap-3 p-3 rounded-xl transition-all duration-200 hover:-translate-y-0.5"
            style={{
                background: "#fff",
                border: HAIRLINE,
                boxShadow: SHADOW_SOFT,
            }}
        >
            <div
                className="flex flex-col items-center justify-center w-12 h-12 flex-shrink-0 rounded-lg"
                style={{ background: "rgba(10,10,10,0.04)", border: HAIRLINE }}
            >
                <span className="font-mono text-[9px] uppercase tracking-[0.10em]" style={{ color: "rgba(10,10,10,0.55)" }}>{month}</span>
                <span className="font-black text-[17px] tabular-nums leading-none mt-0.5" style={{ color: PT.ink, letterSpacing: "-0.02em" }}>{parseInt(dd, 10)}</span>
            </div>
            <div className="min-w-0 flex-1">
                <p className="font-semibold leading-tight tracking-tight truncate text-[13.5px]" style={{ color: PT.ink }}>
                    {ev.emoji && <span aria-hidden className="mr-1">{ev.emoji}</span>}
                    {ev.title}
                </p>
                <div className="flex items-center gap-1.5 mt-0.5 text-[11px]" style={{ color: "rgba(10,10,10,0.55)" }}>
                    <span aria-hidden className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: accent }} />
                    <span className="truncate">{cat?.label || ev.category}</span>
                    <span aria-hidden>·</span>
                    <span>{daysLabel}</span>
                </div>
            </div>
            <ChevronRight size={14} strokeWidth={2.4} className="flex-shrink-0 transition-transform group-hover:translate-x-0.5" style={{ color: "rgba(10,10,10,0.4)" }} />
        </Link>
    );
}
