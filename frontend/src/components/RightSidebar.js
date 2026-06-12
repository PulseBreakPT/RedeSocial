import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Search, TrendingUp, Hash, X, Calendar, Users, UserPlus, Check } from "lucide-react";
import { api } from "../lib/api";
import { Avatar } from "./Avatar";
import { VerifiedBadge } from "./VerifiedBadge";
import { ActivityTicker } from "./ActivityTicker";
import { TrendingPulse } from "./TrendingPulse";
import { useClickOutside } from "../hooks/useClickOutside";
import { PT } from "../theme/editorial";

// =============================================================================
// LUSORAE — Right Sidebar (clean editorial)
// Search · Calendário PT · Tendências · Sugestões · Comunidades
//
// Removido: header masthead sólido fanzine, bordas 2.5px ink, sombras 3D
// Mantido: estrutura, kickers mono, paleta para acentos contextuais
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
            className="hidden lg:flex flex-col gap-4 py-4 pl-2 pr-1 sticky top-0 h-[calc(100vh-0.75rem)] overflow-y-auto no-scrollbar"
            data-testid="right-sidebar"
        >
            {/* Search */}
            <div className="relative" ref={searchRef}>
                <Search size={15} strokeWidth={1.8} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "rgba(10,10,10,0.42)" }} />
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
                    className="w-full pl-10 pr-9 py-3 text-[13.5px] font-medium outline-none transition"
                    style={{
                        background: "#fff",
                        border: "1px solid rgba(10,10,10,0.08)",
                        borderRadius: 999,
                        color: PT.ink,
                    }}
                    onFocusCapture={(e) => { e.currentTarget.style.borderColor = "rgba(10,10,10,0.30)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(10,10,10,0.05)"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(10,10,10,0.08)"; e.currentTarget.style.boxShadow = "none"; }}
                />
                {q && (
                    <button onClick={closeSearch} className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 grid place-items-center rounded-full hover:bg-black/[0.06]" aria-label="Limpar" style={{ color: "rgba(10,10,10,0.45)" }}>
                        <X size={13} />
                    </button>
                )}
                {showDropdown && (
                    <div
                        className="absolute z-30 left-0 right-0 mt-2 overflow-hidden anim-fade-up"
                        style={{
                            background: "#fff",
                            border: "1px solid rgba(10,10,10,0.08)",
                            borderRadius: 18,
                            boxShadow: "0 18px 48px -16px rgba(10,10,10,0.18), 0 4px 12px -4px rgba(10,10,10,0.06)",
                        }}
                    >
                        {results.tags.length > 0 && (
                            <div>
                                <div className="px-4 pt-3 pb-1 font-mono text-[10px] font-bold uppercase" style={{ color: "rgba(10,10,10,0.5)", letterSpacing: "0.18em" }}>Hashtags</div>
                                {results.tags.map((t) => (
                                    <button key={t.tag} onClick={() => { navigate(`/tag/${t.tag}`); closeSearch(); }} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-black/[0.03] text-left transition" data-testid={`search-tag-${t.tag}`}>
                                        <div className="w-9 h-9 rounded-full grid place-items-center" style={{ background: "rgba(10,10,10,0.05)" }}><Hash size={15} style={{ color: "rgba(10,10,10,0.6)" }} /></div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-[14px] font-bold truncate" style={{ color: PT.ink }}>#{t.tag}</div>
                                            <div className="text-[11.5px] font-mono" style={{ color: "rgba(10,10,10,0.5)" }}>{t.count} publicações</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                        {results.users.length > 0 && (
                            <div>
                                {results.tags.length > 0 && <div style={{ borderTop: "1px solid rgba(10,10,10,0.06)" }} />}
                                <div className="px-4 pt-3 pb-1 font-mono text-[10px] font-bold uppercase" style={{ color: "rgba(10,10,10,0.5)", letterSpacing: "0.18em" }}>Pessoas</div>
                                {results.users.map((u) => (
                                    <button key={u.id} onClick={() => { navigate(`/u/${u.username}`); closeSearch(); }} className="w-full flex items-center gap-3 p-3 hover:bg-black/[0.03] text-left transition" data-testid={`search-result-${u.username}`}>
                                        <Avatar user={u} size={36} />
                                        <div className="flex-1 min-w-0">
                                            <div className="text-[14px] font-bold flex items-center gap-1 truncate" style={{ color: PT.ink }}>
                                                {u.name} {u.verified && <VerifiedBadge size={11} />}
                                            </div>
                                            <div className="text-[11.5px] font-mono truncate" style={{ color: "rgba(10,10,10,0.5)" }}>@{u.username}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                        {isEmpty && (
                            <div className="px-4 py-7 text-center">
                                <p className="font-mono text-[10px] font-bold uppercase mb-1" style={{ color: "rgba(10,10,10,0.55)", letterSpacing: "0.18em" }}>Sem resultados</p>
                                <p className="text-xs font-mono" style={{ color: "rgba(10,10,10,0.5)" }}>Tenta outra palavra ou #tag.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <ActivityTicker />

            {/* 1. Calendário PT */}
            <Widget testid="widget-calendar-pt" kicker="Agenda · Portugal" accent={PT.red} title="O que vem aí" Icon={Calendar}>
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

            {/* 2. Tendências */}
            {isHome && (
                <Widget testid="widget-trending" kicker="Em alta · Portugal" accent={PT.peixe} title="Tendências" Icon={TrendingUp}>
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
                                    <span className="font-mono text-[10.5px] mt-1 w-5 tabular-nums" style={{ color: "rgba(10,10,10,0.38)", letterSpacing: "0.04em" }}>{String(idx + 1).padStart(2, "0")}</span>
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
                </Widget>
            )}

            {/* 3. Sugestões */}
            {suggestions.length > 0 && (
                <Widget testid="widget-suggestions" kicker="Pessoas reais" accent={PT.atl} title="Para seguir" Icon={UserPlus}>
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
                </Widget>
            )}

            {/* 4. Comunidades */}
            {communities.length > 0 && (
                <Widget testid="widget-communities" kicker="Vai à mesa" accent={PT.telha} title="Comunidades" Icon={Users}>
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
                </Widget>
            )}

            <p className="font-mono text-[10px] font-bold uppercase px-2 mt-auto pt-2" style={{ color: "rgba(10,10,10,0.32)", letterSpacing: "0.18em" }}>
                © lusorae · {new Date().getFullYear()}
            </p>
        </aside>
    );
}

// =============================================================================
// Widget — clean editorial card
// =============================================================================
function Widget({ children, kicker, accent = PT.ink, title, Icon, testid }) {
    return (
        <div
            className="overflow-hidden transition-all duration-200"
            style={{
                background: "#fff",
                border: "1px solid rgba(10,10,10,0.07)",
                borderRadius: 18,
                boxShadow: "0 1px 0 rgba(255,255,255,0.6) inset, 0 12px 28px -20px rgba(10,10,10,0.10)",
            }}
            data-testid={testid}
        >
            {/* Header — kicker editorial com dot pulse */}
            <div className="flex items-start justify-between gap-3 px-4 pt-3.5 pb-2">
                <div className="min-w-0">
                    <div className="inline-flex items-center gap-1.5 mb-1">
                        <span className="relative flex h-1.5 w-1.5" aria-hidden>
                            <span className="absolute inline-flex h-full w-full rounded-full lusorae-pulse" style={{ background: accent }} />
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: accent }} />
                        </span>
                        <p
                            className="font-mono text-[10px] font-bold uppercase"
                            style={{ color: "rgba(10,10,10,0.55)", letterSpacing: "0.20em" }}
                        >
                            {kicker}
                        </p>
                    </div>
                    <h3
                        className="font-black tracking-[-0.02em]"
                        style={{ fontSize: 17, color: PT.ink, lineHeight: 1.15 }}
                    >
                        {title}
                    </h3>
                </div>
                {Icon && (
                    <Icon size={15} strokeWidth={1.9} className="mt-1 shrink-0" style={{ color: accent, opacity: 0.85 }} />
                )}
            </div>
            <div className="px-4 pb-4">
                {children}
            </div>
        </div>
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
    const themeColor = {
        festa:    PT.laranja,
        orgulho:  PT.eucalipto,
        praia:    PT.peixe,
        tradicao: PT.fado,
        cultura:  PT.malva,
        santo:    PT.red,
        feriado:  PT.gold,
    }[item.theme] || PT.ink;

    const days = item.days_until;
    const when =
        days === 0 ? "HOJE" :
        days === 1 ? "amanhã" :
        days != null ? `em ${days} dias` :
        "";

    let pretty = "";
    try {
        if (item.iso_date) {
            const d = new Date(item.iso_date + "T00:00:00");
            pretty = d
                .toLocaleDateString("pt-PT", { day: "2-digit", month: "short" })
                .replace(/\./g, "")
                .toLowerCase();
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
                    background: highlight ? themeColor : "rgba(10,10,10,0.05)",
                    color: highlight ? "#fff" : PT.ink,
                }}
            >
                <span>{item.emoji || "•"}</span>
            </div>
            <div className="flex-1 min-w-0">
                <div className="text-[13.5px] font-bold tracking-tight truncate" style={{ color: PT.ink }}>{item.label}</div>
                <div
                    className="font-mono text-[10.5px] font-bold uppercase truncate"
                    style={{ color: highlight ? themeColor : "rgba(10,10,10,0.5)", letterSpacing: "0.12em" }}
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
                        style={{
                            background: "rgba(10,10,10,0.05)",
                            lineHeight: 1.05,
                            minWidth: 44,
                        }}
                    >
                        {pretty}
                    </span>
                </div>
            )}
        </li>
    );
}
