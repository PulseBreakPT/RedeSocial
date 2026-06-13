// =============================================================================
// FeedAside — widgets partilhados entre desktop sidebar e mobile feed.
//
// Princípio de paridade: tudo o que existe na right-sidebar (desktop) está
// também disponível em mobile, mas intercalado no fluxo do feed em vez de
// empilhado numa coluna (Twitter/X pattern: cognitive load mais baixo,
// descoberta sem perder o stream principal).
//
// 5 lentes profissionais aplicadas:
//   · PM (escala social): Calendar PT + Atividade no topo; Tendências e
//     Para seguir intercalados, replicando Twitter "Who to follow" pattern.
//   · UX (mobile-first): nunca dump vertical de 4 widgets antes do feed.
//   · FE (DRY): mesmos endpoints, mesmo card visual (hairline 1px, sem cremes).
//   · A11y: <section aria-labelledby> com <h3> semântico.
//   · Perf: limite a 3 itens em mobile vs 5 em desktop; sem fetches duplicadas
//     em runtime (mobile e desktop nunca renderizam ao mesmo tempo — uma é
//     `hidden lg:flex`, a outra `lg:hidden`).
// =============================================================================
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Activity, Calendar, TrendingUp, UserPlus, Users, Check } from "lucide-react";
import { api } from "../lib/api";
import { Avatar } from "./Avatar";
import { VerifiedBadge } from "./VerifiedBadge";
import { TrendingPulse } from "./TrendingPulse";
import { smartTime } from "../lib/time";
import { useLiveTime } from "../hooks/useLiveTime";
import { useInView } from "../hooks/useInView";
import { PT } from "../theme/editorial";

// Card visual partilhado — título único centrado, ícone à esquerda, hairline 1px.
function Card({ children, title, Icon, accent = PT.ink, testid }) {
    const labelId = testid ? `${testid}-title` : undefined;
    return (
        <section
            className="overflow-hidden transition-all duration-200"
            style={{
                background: "#fff",
                border: "1px solid rgba(10,10,10,0.07)",
                borderRadius: 18,
                boxShadow: "0 1px 0 rgba(255,255,255,0.6) inset, 0 12px 28px -20px rgba(10,10,10,0.10)",
            }}
            data-testid={testid}
            aria-labelledby={labelId}
        >
            <header className="flex items-center justify-center gap-2 px-4 pt-4 pb-3">
                {Icon && <Icon size={16} strokeWidth={2.0} className="shrink-0" style={{ color: accent }} />}
                <h3
                    id={labelId}
                    className="font-black tracking-[-0.02em] text-center"
                    style={{ fontSize: 16, color: PT.ink, lineHeight: 1.15 }}
                >
                    {title}
                </h3>
            </header>
            <div className="px-4 pb-4">{children}</div>
        </section>
    );
}

function EmptyMini({ text }) {
    return <p className="text-[12px] text-center py-3 font-mono" style={{ color: "rgba(10,10,10,0.45)" }}>{text}</p>;
}

function FooterLink({ to, label = "ver tudo →" }) {
    return (
        <Link
            to={to}
            className="mt-4 block text-center font-mono text-[10px] font-bold uppercase hover:opacity-100 transition opacity-65"
            style={{ color: PT.ink, letterSpacing: "0.18em" }}
        >
            {label}
        </Link>
    );
}

function CalendarItem({ item, highlight = false }) {
    const accentColor = {
        festa:    PT.laranja,
        orgulho:  PT.eucalipto,
        praia:    PT.peixe,
        tradicao: PT.fado,
        cultura:  PT.malva,
        santo:    PT.red,
        feriado:  PT.ink,
    }[item.theme] || PT.ink;

    const days = item.days_until;
    const when =
        days === 0 ? "HOJE" :
        days === 1 ? "amanhã" :
        days != null ? `em ${days} dias` : "";

    let pretty = "";
    try {
        if (item.iso_date) {
            const d = new Date(item.iso_date + "T00:00:00");
            pretty = d.toLocaleDateString("pt-PT", { day: "2-digit", month: "short" }).replace(/\./g, "").toLowerCase();
        }
    } catch { /* noop */ }

    return (
        <li
            className="flex items-center gap-3 rounded-lg -mx-2 px-2 py-1.5 transition hover:bg-black/[0.025]"
            data-testid={`calendar-${item.key}`}
        >
            <div
                className="w-10 h-10 rounded-lg grid place-items-center shrink-0 text-[18px] leading-none"
                style={{
                    background: highlight ? "rgba(10,10,10,0.08)" : "rgba(10,10,10,0.05)",
                    color: PT.ink,
                    borderLeft: highlight ? `3px solid ${accentColor}` : "none",
                }}
            >
                <span>{item.emoji || "•"}</span>
            </div>
            <div className="flex-1 min-w-0">
                <div className="text-[13.5px] font-bold tracking-tight truncate" style={{ color: PT.ink }}>{item.label}</div>
                <div
                    className="font-mono text-[10.5px] font-bold uppercase truncate"
                    style={{ color: highlight ? accentColor : "rgba(10,10,10,0.5)", letterSpacing: "0.12em" }}
                >
                    {when}
                </div>
            </div>
            {pretty && (
                <div
                    className="shrink-0 text-right font-mono font-bold text-[10.5px] tabular-nums"
                    style={{ color: PT.ink, letterSpacing: "0.04em" }}
                >
                    <span
                        className="inline-block px-2 py-1 rounded-md"
                        style={{ background: "rgba(10,10,10,0.05)", lineHeight: 1.05, minWidth: 44 }}
                    >
                        {pretty}
                    </span>
                </div>
            )}
        </li>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Public widgets — utilizáveis em qualquer container (sidebar OU inline mobile)
// ─────────────────────────────────────────────────────────────────────────────

export function ActivityWidget({ limit = 8 }) {
    const [items, setItems] = useState([]);
    useLiveTime(30000);
    useEffect(() => {
        const load = async () => {
            try {
                const { data } = await api.get(`/activity?limit=${limit}`);
                setItems(data || []);
            } catch { /* noop */ }
        };
        load();
        const id = setInterval(load, 20000);
        return () => clearInterval(id);
    }, [limit]);
    if (items.length === 0) return null;
    return (
        <Card testid="widget-activity" title="Atividade recente" Icon={Activity} accent={PT.green}>
            <ul className="space-y-3">
                {items.map((a) => (
                    <li key={a.id} className="flex items-start gap-2.5 text-[13px] leading-tight" data-testid={`activity-${a.id}`}>
                        <Link to={`/u/${a.actor?.username}`} className="mt-0.5">
                            <Avatar user={a.actor} size={26} />
                        </Link>
                        <div className="flex-1 min-w-0">
                            <span style={{ color: "rgba(10,10,10,0.75)" }}>
                                <Link to={`/u/${a.actor?.username}`} className="font-bold tracking-tight hover:underline" style={{ color: PT.ink }}>
                                    {a.actor?.name}
                                </Link>{" "}
                                <span style={{ color: "rgba(10,10,10,0.55)" }}>{a.verb}</span>{" "}
                                <Link to={`/u/${a.target_username}`} className="font-bold hover:underline" style={{ color: PT.ink }}>
                                    @{a.target_username}
                                </Link>
                            </span>
                            <div className="font-mono text-[10px] mt-1 uppercase tracking-wider" style={{ color: "rgba(10,10,10,0.4)" }}>
                                {smartTime(a.created_at)}
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        </Card>
    );
}

export function CalendarPtWidget({ limit = 4 }) {
    const [calendar, setCalendar] = useState({ today: null, upcoming: [] });
    useEffect(() => {
        api.get("/calendar/pt").then((r) => setCalendar(r.data || { today: null, upcoming: [] })).catch(() => {});
    }, []);
    const isEmpty = !calendar.today && (calendar.upcoming || []).length === 0;
    return (
        <Card testid="widget-calendar-pt" title="O que vem aí" Icon={Calendar} accent={PT.red}>
            {isEmpty ? (
                <EmptyMini text="Sem datas marcadas." />
            ) : (
                <ul className="space-y-2.5">
                    {calendar.today && <CalendarItem item={calendar.today} highlight />}
                    {(calendar.upcoming || []).slice(0, limit).map((ev) => (
                        <CalendarItem key={ev.key + ev.iso_date} item={ev} />
                    ))}
                </ul>
            )}
        </Card>
    );
}

export function TrendingWidget({ limit = 5 }) {
    const [trending, setTrending] = useState([]);
    const navigate = useNavigate();
    useEffect(() => {
        api.get("/trending").then((r) => setTrending((r.data || []).slice(0, limit))).catch(() => {});
    }, [limit]);
    return (
        <Card testid="widget-trending" title="Tendências" Icon={TrendingUp} accent={PT.peixe}>
            {trending.length === 0 ? (
                <EmptyMini text="Ainda sem tendências. Publica e participa." />
            ) : (
                <ul className="space-y-2.5">
                    {trending.map((t, idx) => (
                        <li
                            key={t.tag}
                            onClick={() => navigate(`/tag/${t.tag}`)}
                            data-testid={`trending-${t.tag}`}
                            className="group cursor-pointer flex items-start gap-3 rounded-lg -mx-2 px-2 py-1.5 transition hover:bg-black/[0.025]"
                        >
                            <span className="font-mono text-[10.5px] mt-1 w-5 tabular-nums" style={{ color: "rgba(10,10,10,0.38)", letterSpacing: "0.04em" }}>
                                {String(idx + 1).padStart(2, "0")}
                            </span>
                            <div className="flex-1 min-w-0">
                                <div className="text-[14.5px] font-bold tracking-tight truncate flex items-center gap-2 group-hover:opacity-80 transition" style={{ color: PT.ink }}>
                                    <span>#{t.tag}</span>
                                    <TrendingPulse tag={t.tag} width={42} height={14} />
                                </div>
                                <div className="text-[11.5px] mt-0.5" style={{ color: "rgba(10,10,10,0.5)" }}>{t.count} publicações</div>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
            <FooterLink to="/trending" />
        </Card>
    );
}

export function SuggestionsWidget({ limit = 4 }) {
    const [suggestions, setSuggestions] = useState([]);
    const [followingMap, setFollowingMap] = useState({});
    useEffect(() => {
        api.get(`/users/suggestions?limit=${limit}`).then((r) => setSuggestions(r.data || [])).catch(() => {});
    }, [limit]);
    if (suggestions.length === 0) return null;
    const toggleFollow = async (user) => {
        if (followingMap[user.id] === "loading") return;
        const isFollowing = followingMap[user.id] === true;
        setFollowingMap((m) => ({ ...m, [user.id]: "loading" }));
        try {
            await api.post(`/users/${user.username}/follow`);
            setFollowingMap((m) => ({ ...m, [user.id]: !isFollowing }));
        } catch {
            setFollowingMap((m) => ({ ...m, [user.id]: isFollowing }));
        }
    };
    return (
        <Card testid="widget-suggestions" title="Para seguir" Icon={UserPlus} accent={PT.atl}>
            <ul className="space-y-3">
                {suggestions.slice(0, limit).map((u) => {
                    const st = followingMap[u.id];
                    const following = st === true;
                    const loading = st === "loading";
                    return (
                        <li key={u.id} className="flex items-center gap-3" data-testid={`suggestion-${u.username}`}>
                            <Link to={`/u/${u.username}`} className="shrink-0">
                                <Avatar user={u} size={38} />
                            </Link>
                            <Link to={`/u/${u.username}`} className="flex-1 min-w-0 group">
                                <div className="text-[13.5px] font-bold tracking-tight truncate flex items-center gap-1 group-hover:opacity-80 transition" style={{ color: PT.ink }}>
                                    {u.name} {u.verified && <VerifiedBadge size={10} />}
                                </div>
                                <div className="text-[11.5px] font-mono truncate" style={{ color: "rgba(10,10,10,0.5)" }}>@{u.username}{u.city ? ` · ${u.city}` : ""}</div>
                            </Link>
                            <button
                                onClick={() => toggleFollow(u)}
                                disabled={loading}
                                data-testid={`follow-${u.username}`}
                                className="shrink-0 text-[11.5px] font-bold px-3.5 py-1.5 rounded-full transition disabled:opacity-50"
                                style={
                                    following
                                        ? { background: "#fff", color: PT.ink, border: "1px solid rgba(10,10,10,0.16)" }
                                        : { background: PT.ink, color: "#fff", border: `1px solid ${PT.ink}`, boxShadow: "0 6px 14px -6px rgba(10,10,10,0.35)" }
                                }
                            >
                                {loading ? "…" : following ? (<span className="inline-flex items-center gap-1"><Check size={11} strokeWidth={3} /> a seguir</span>) : "Seguir"}
                            </button>
                        </li>
                    );
                })}
            </ul>
            <FooterLink to="/explore" label="descobrir mais" />
        </Card>
    );
}

export function CommunitiesWidget({ limit = 3 }) {
    const [communities, setCommunities] = useState([]);
    useEffect(() => {
        api.get("/trending/comunidades").then((r) => setCommunities((r.data || []).slice(0, limit))).catch(() => {});
    }, [limit]);
    if (communities.length === 0) return null;
    return (
        <Card testid="widget-communities" title="Comunidades" Icon={Users} accent={PT.telha}>
            <ul className="space-y-2.5">
                {communities.map((c) => (
                    <li key={c.slug}>
                        <Link to={`/c/${c.slug}`} className="flex items-center gap-3 rounded-lg -mx-2 px-2 py-1.5 transition hover:bg-black/[0.025]" data-testid={`community-${c.slug}`}>
                            <div className="w-9 h-9 rounded-lg grid place-items-center font-black text-[14px] shrink-0" style={{ background: "rgba(10,10,10,0.05)", color: PT.ink }}>
                                {(c.name || c.slug || "?").slice(0, 1).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-[13.5px] font-bold tracking-tight truncate" style={{ color: PT.ink }}>{c.name || c.slug}</div>
                                <div className="text-[11.5px] font-mono truncate" style={{ color: "rgba(10,10,10,0.5)" }}>{c.members_count || 0} membros</div>
                            </div>
                        </Link>
                    </li>
                ))}
            </ul>
            <FooterLink to="/communities" label="ver todas" />
        </Card>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Layouts pré-fabricados
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Stack vertical de widgets — usado tanto em desktop sidebar como
 * (opcionalmente) em mobile interstitial. Em mobile o consumidor deverá
 * preferir <MobileInlineWidgets /> para intercalar com posts.
 */
export function FeedWidgetsStack({ isHome = true }) {
    return (
        <div className="flex flex-col gap-4">
            <ActivityWidget />
            <CalendarPtWidget />
            {isHome && <TrendingWidget />}
            <SuggestionsWidget />
            <CommunitiesWidget />
        </div>
    );
}

/**
 * Mobile-only: renderiza widgets inline entre stories e posts (compactos),
 * para usar antes da lista de posts no Feed mobile. Posiciona Calendar e
 * Atividade — informação leve, time-sensitive — para descoberta imediata.
 */
export function MobileFeedTopWidgets() {
    return (
        <div className="lg:hidden px-4 pt-3 pb-1 space-y-3" data-testid="mobile-feed-top-widgets">
            <CalendarPtWidget limit={3} />
            <ActivityWidget limit={4} />
        </div>
    );
}

/**
 * Mobile-only: card intercalado a inserir no meio do feed.
 * Aceita `slot` para escolher o widget (Twitter "Who to follow" pattern).
 *
 * LAZY-MOUNT via IntersectionObserver: o widget só monta (e portanto só
 * dispara o seu fetch interno) quando o utilizador estiver a ~200px de o
 * ver. Melhora First Contentful Paint em conexões móveis — evita 3 fetches
 * paralelas no boot que nunca chegariam a ser vistas se o utilizador
 * abandonar antes de scrollar.
 *
 * Placeholder mantém o mesmo footprint vertical aproximado (~140px) para
 * preservar layout stability (zero CLS).
 */
export function MobileFeedInterstitial({ slot }) {
    const { ref, hasBeenVisible } = useInView({ rootMargin: "240px" });
    return (
        <div
            ref={ref}
            className="lg:hidden px-4 py-2"
            data-testid={`mobile-feed-interstitial-${slot}`}
        >
            {hasBeenVisible ? (
                <>
                    {slot === "trending"    && <TrendingWidget    limit={3} />}
                    {slot === "suggestions" && <SuggestionsWidget limit={3} />}
                    {slot === "communities" && <CommunitiesWidget limit={3} />}
                </>
            ) : (
                <div
                    aria-hidden
                    style={{
                        height: 140,
                        background: "rgba(10,10,10,0.025)",
                        border: "1px solid rgba(10,10,10,0.05)",
                        borderRadius: 18,
                    }}
                />
            )}
        </div>
    );
}
