import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Search, TrendingUp, Hash, X, Calendar, Users, UserPlus, Check } from "lucide-react";
import { api } from "../lib/api";
import { Avatar } from "./Avatar";
import { VerifiedBadge } from "./VerifiedBadge";
import { ActivityTicker } from "./ActivityTicker";
import { TrendingPulse } from "./TrendingPulse";
import { useClickOutside } from "../hooks/useClickOutside";
import { PT } from "../pages/auth/AuthDecor";

// =============================================================================
// Right Sidebar — fanzine PT sóbria
// Search · Calendário PT · Tendências · Sugestões · Comunidades
// =============================================================================
export function RightSidebar() {
    const [q, setQ] = useState("");
    const [results, setResults] = useState({ users: [], tags: [] });
    const [focused, setFocused] = useState(false);
    const [trending, setTrending] = useState([]);
    const [suggestions, setSuggestions] = useState([]);
    const [followingMap, setFollowingMap] = useState({});
    const [calendar, setCalendar] = useState({ today: null, upcoming: [] });
    const [communities, setCommunities] = useState([]);
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const searchRef = useClickOutside(() => setFocused(false), focused);
    const isHome = pathname === "/" || pathname === "/feed";

    useEffect(() => {
        api.get("/trending").then((r) => setTrending((r.data || []).slice(0, 5))).catch(() => {});
        api.get("/users/suggestions?limit=4").then((r) => setSuggestions(r.data || [])).catch(() => {});
        api.get("/calendar/pt").then((r) => setCalendar(r.data || { today: null, upcoming: [] })).catch(() => {});
        api.get("/trending/comunidades").then((r) => setCommunities((r.data || []).slice(0, 3))).catch(() => {});
    }, []);

    useEffect(() => {
        if (!q.trim()) { setResults({ users: [], tags: [] }); return; }
        const id = setTimeout(async () => {
            try {
                const [u, t] = await Promise.all([
                    api.get(`/users/search?q=${encodeURIComponent(q)}`).catch(() => ({ data: [] })),
                    api.get(`/trending`).catch(() => ({ data: [] })),
                ]);
                const needle = q.toLowerCase().replace(/^#/, "");
                const tags = (t.data || []).filter((x) => (x.tag || "").toLowerCase().includes(needle)).slice(0, 5);
                setResults({ users: u.data || [], tags });
            } catch { /* noop */ }
        }, 250);
        return () => clearTimeout(id);
    }, [q]);

    const closeSearch = () => { setQ(""); setFocused(false); };
    const showDropdown = focused && q.trim().length > 0;
    const isEmpty = results.users.length === 0 && results.tags.length === 0;

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
        <aside
            className="hidden lg:flex flex-col gap-5 py-4 pl-2 pr-1 sticky top-0 h-[calc(100vh-0.75rem)] overflow-y-auto no-scrollbar"
            data-testid="right-sidebar"
        >
            {/* ────────────── Search ────────────── */}
            <div className="relative" ref={searchRef}>
                <Search size={15} strokeWidth={1.7} className="absolute left-4 top-1/2 -translate-y-1/2 text-black/40" />
                <input
                    data-testid="search-input"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    onFocus={() => setFocused(true)}
                    onKeyDown={(e) => {
                        if (e.key === "Escape") closeSearch();
                        if (e.key === "Enter" && results.users[0]) { navigate(`/u/${results.users[0].username}`); closeSearch(); }
                    }}
                    placeholder="Pesquisar pessoas ou #tags…"
                    className="w-full bg-white border border-black/[0.08] rounded-full pl-10 pr-9 py-3 text-[13px] focus:border-black/30 outline-none transition placeholder:text-black/35"
                />
                {q && (
                    <button onClick={closeSearch} className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 grid place-items-center rounded-full hover:bg-black/[0.06] text-black/45" aria-label="Limpar">
                        <X size={13} />
                    </button>
                )}
                {showDropdown && (
                    <div className="absolute z-30 left-0 right-0 mt-2 card-premium rounded-2xl overflow-hidden anim-fade-up">
                        {results.tags.length > 0 && (
                            <div>
                                <div className="px-4 pt-3 pb-1 type-overline text-black/45">Hashtags</div>
                                {results.tags.map((t) => (
                                    <button key={t.tag} onClick={() => { navigate(`/tag/${t.tag}`); closeSearch(); }} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-black/[0.03] text-left transition" data-testid={`search-tag-${t.tag}`}>
                                        <div className="w-9 h-9 rounded-full bg-black/[0.04] grid place-items-center"><Hash size={15} className="text-black/65" /></div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-heading font-semibold text-black truncate">#{t.tag}</div>
                                            <div className="text-xs font-mono text-black/50">{t.count} publicações</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                        {results.users.length > 0 && (
                            <div>
                                {results.tags.length > 0 && <div className="hairline-t" />}
                                <div className="px-4 pt-3 pb-1 type-overline text-black/45">Pessoas</div>
                                {results.users.map((u) => (
                                    <button key={u.id} onClick={() => { navigate(`/u/${u.username}`); closeSearch(); }} className="w-full flex items-center gap-3 p-3 hover:bg-black/[0.03] text-left transition" data-testid={`search-result-${u.username}`}>
                                        <Avatar user={u} size={36} />
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-heading font-semibold flex items-center gap-1 text-black truncate">
                                                {u.name} {u.verified && <VerifiedBadge size={11} />}
                                            </div>
                                            <div className="text-xs font-mono text-black/50 truncate">@{u.username}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                        {isEmpty && (
                            <div className="px-4 py-7 text-center">
                                <p className="type-overline mb-1">Sem resultados</p>
                                <p className="text-xs font-mono text-black/55">Tenta outra palavra ou #tag.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <ActivityTicker />

            {/* ────────────── 1. CALENDÁRIO PT ────────────── */}
            <Widget testid="widget-calendar-pt" kicker="Agenda · Portugal" kickerColor={PT.red} title="O que vem aí" Icon={Calendar}>
                {(!calendar.today && (calendar.upcoming || []).length === 0) ? (
                    <EmptyMini text="Sem datas marcadas." />
                ) : (
                    <ul className="space-y-2.5">
                        {calendar.today && <CalendarItem item={calendar.today} highlight />}
                        {(calendar.upcoming || []).slice(0, 4).map((ev) => (
                            <CalendarItem key={ev.key + ev.iso_date} item={ev} />
                        ))}
                    </ul>
                )}
            </Widget>

            {/* ────────────── 2. TENDÊNCIAS ────────────── */}
            {isHome && (
                <Widget testid="widget-trending" kicker="Em alta · Portugal" kickerColor={PT.green} title="Tendências" Icon={TrendingUp}>
                    {trending.length === 0 ? (
                        <EmptyMini text="Ainda sem tendências. Publica e participa." />
                    ) : (
                        <ul className="space-y-3">
                            {trending.map((t, idx) => (
                                <li
                                    key={t.tag}
                                    onClick={() => navigate(`/tag/${t.tag}`)}
                                    data-testid={`trending-${t.tag}`}
                                    className="group cursor-pointer flex items-start gap-3 rounded-lg -mx-2 px-2 py-1.5 hover:bg-black/[0.025] transition"
                                >
                                    <span className="font-mono text-[10px] text-black/40 mt-1 w-5 tabular-nums tracking-wider">{String(idx + 1).padStart(2, "0")}</span>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-heading text-[14.5px] font-semibold tracking-tight text-black group-hover:text-black/70 truncate transition-colors flex items-center gap-2">
                                            <span>#{t.tag}</span>
                                            <TrendingPulse tag={t.tag} width={42} height={14} />
                                        </div>
                                        <div className="text-[11px] tracking-tight text-black/45 mt-0.5">{t.count} publicações</div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                    <FooterLink to="/trending" />
                </Widget>
            )}

            {/* ────────────── 3. SUGESTÕES PARA SEGUIR ────────────── */}
            {suggestions.length > 0 && (
                <Widget testid="widget-suggestions" kicker="Pessoas reais" kickerColor={PT.azul} title="Para seguir" Icon={UserPlus}>
                    <ul className="space-y-3">
                        {suggestions.slice(0, 4).map((u) => {
                            const st = followingMap[u.id];
                            const following = st === true;
                            const loading = st === "loading";
                            return (
                                <li key={u.id} className="flex items-center gap-3" data-testid={`suggestion-${u.username}`}>
                                    <Link to={`/u/${u.username}`} className="shrink-0">
                                        <Avatar user={u} size={38} />
                                    </Link>
                                    <Link to={`/u/${u.username}`} className="flex-1 min-w-0 group">
                                        <div className="font-heading text-[13.5px] font-semibold tracking-tight truncate text-black group-hover:text-black/70 flex items-center gap-1">
                                            {u.name} {u.verified && <VerifiedBadge size={10} />}
                                        </div>
                                        <div className="text-[11px] font-mono text-black/50 truncate">@{u.username}{u.city ? ` · ${u.city}` : ""}</div>
                                    </Link>
                                    <button
                                        onClick={() => toggleFollow(u)}
                                        disabled={loading}
                                        data-testid={`follow-${u.username}`}
                                        className="shrink-0 text-[11px] font-black uppercase tracking-wider px-3 py-1.5 rounded-full border-2 border-black transition disabled:opacity-50"
                                        style={
                                            following
                                                ? { background: "#fff", color: PT.ink }
                                                : { background: PT.ink, color: "#fff" }
                                        }
                                    >
                                        {loading ? "…" : following ? (<span className="inline-flex items-center gap-1"><Check size={11} strokeWidth={3} /> a seguir</span>) : "Seguir"}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                    <FooterLink to="/explore" label="descobrir mais" />
                </Widget>
            )}

            {/* ────────────── 4. COMUNIDADES POPULARES ────────────── */}
            {communities.length > 0 && (
                <Widget testid="widget-communities" kicker="Vai à mesa" kickerColor={PT.gold} title="Comunidades" Icon={Users}>
                    <ul className="space-y-2.5">
                        {communities.map((c) => (
                            <li key={c.slug}>
                                <Link to={`/c/${c.slug}`} className="flex items-center gap-3 rounded-lg -mx-2 px-2 py-1.5 hover:bg-black/[0.025] transition" data-testid={`community-${c.slug}`}>
                                    <div className="w-9 h-9 rounded-lg grid place-items-center font-display font-black text-[14px] shrink-0" style={{ background: PT.bone, color: PT.ink }}>
                                        {(c.name || c.slug || "?").slice(0, 1).toUpperCase()}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-heading text-[13.5px] font-semibold tracking-tight truncate text-black">{c.name || c.slug}</div>
                                        <div className="text-[11px] font-mono text-black/50 truncate">{c.members_count || 0} membros</div>
                                    </div>
                                </Link>
                            </li>
                        ))}
                    </ul>
                    <FooterLink to="/communities" label="ver todas" />
                </Widget>
            )}

            <p className="type-overline px-2 mt-auto pt-2 text-black/35 text-[10.5px] tracking-[0.18em]">
                © lusorae · {new Date().getFullYear()}
            </p>
        </aside>
    );
}

// =============================================================================
// Widget — card fanzine: header com fundo colorido + body branco
// =============================================================================
function Widget({ children, kicker, kickerColor = PT.ink, title, Icon, testid }) {
    // Light backgrounds (gold) need dark ink text; dark backgrounds need white text.
    const isLight = kickerColor === PT.gold;
    const fg = isLight ? PT.ink : "#fff";
    const subFg = isLight ? "rgba(10,10,10,0.62)" : "rgba(255,255,255,0.78)";
    return (
        <div className="card-lux p-0 overflow-hidden" data-testid={testid}>
            {/* Header pill — fanzine masthead */}
            <div
                className="flex items-start justify-between gap-3 px-5 py-3.5"
                style={{
                    background: kickerColor,
                    borderBottom: `2.5px solid ${PT.ink}`,
                }}
            >
                <div className="min-w-0">
                    <p
                        className="text-[10px] font-black uppercase mb-1 tracking-[0.18em]"
                        style={{ color: subFg }}
                    >
                        {kicker}
                    </p>
                    <h3
                        className="font-display text-[19px] leading-none tracking-tight"
                        style={{ color: fg }}
                    >
                        {title}
                    </h3>
                </div>
                {Icon && (
                    <Icon size={16} strokeWidth={2} className="mt-1 shrink-0" style={{ color: fg, opacity: 0.85 }} />
                )}
            </div>
            {/* Body — fundo branco */}
            <div className="px-5 py-4 bg-white">
                {children}
            </div>
        </div>
    );
}

function EmptyMini({ text }) {
    return <p className="text-[12px] text-black/50 text-center py-3 font-mono">{text}</p>;
}

function FooterLink({ to, label = "ver tudo →" }) {
    return (
        <Link to={to} className="mt-4 block text-center text-[10.5px] font-black uppercase tracking-[0.16em] text-black/55 hover:text-black transition">
            {label}
        </Link>
    );
}

function CalendarItem({ item, highlight = false }) {
    const themeColor = {
        festa: PT.red,
        orgulho: PT.green,
        praia: PT.azul,
        tradicao: PT.gold,
    }[item.theme] || PT.ink;

    const days = item.days_until;
    const when =
        days === 0 ? "HOJE" :
        days === 1 ? "amanhã" :
        days != null ? `em ${days} dias` :
        "";

    return (
        <li
            className="flex items-center gap-3 rounded-lg -mx-2 px-2 py-1.5 transition hover:bg-black/[0.025]"
            data-testid={`calendar-${item.key}`}
        >
            <div
                className="w-10 h-10 rounded-lg grid place-items-center shrink-0 text-[18px] leading-none"
                style={{
                    background: highlight ? themeColor : PT.bone,
                    color: highlight ? "#fff" : PT.ink,
                    border: highlight ? `2px solid ${PT.ink}` : "none",
                }}
            >
                <span>{item.emoji || "•"}</span>
            </div>
            <div className="flex-1 min-w-0">
                <div className="font-heading text-[13.5px] font-semibold tracking-tight truncate text-black">{item.label}</div>
                <div
                    className="text-[10.5px] font-black uppercase tracking-[0.14em] truncate"
                    style={{ color: highlight ? themeColor : "rgba(10,10,10,0.5)" }}
                >
                    {when}
                </div>
            </div>
        </li>
    );
}
