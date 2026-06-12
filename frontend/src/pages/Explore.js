import { useEffect, useMemo, useState } from "react";
// =============================================================================
// DESIGN SYSTEM: LUSORAE EDITORIAL — ver /src/theme/EDITORIAL.md
// Explorar · masthead editorial alinhado ao Feed/Landing
// (top ink strip · H1 massivo com palavra-chave vermelha · kicker mono · tabs pill)
// =============================================================================
import { Link, useSearchParams } from "react-router-dom";
import { PostCard } from "../components/PostCard";
import { PostSkeletonList } from "../components/Skeleton";
import { PT } from "../theme/editorial";
import { api, toastApiError } from "../lib/api";
import { useLiveTime } from "../hooks/useLiveTime";
import { Compass, Search, Users, Hash, Layers, MapPin, X, Sparkles, MessageSquare, RefreshCw } from "lucide-react";
import { Avatar } from "../components/Avatar";
import { VerifiedBadge } from "../components/VerifiedBadge";
import { toast } from "sonner";

const TABS = [
    { key: "posts",       label: "Posts",       icon: MessageSquare },
    { key: "pessoas",     label: "Pessoas",     icon: Users },
    { key: "tags",        label: "Tags",        icon: Hash },
    { key: "comunidades", label: "Comunidades", icon: Layers },
    { key: "cidades",     label: "Cidades",     icon: MapPin },
];

export default function Explore() {
    const [sp, setSp] = useSearchParams();
    const [tab, setTab] = useState(() => (TABS.find((t) => t.key === sp.get("tab"))?.key) || "posts");
    const [mood, setMood] = useState(() => sp.get("mood") || "");
    const [sort] = useState("trending");
    const [q, setQ] = useState("");
    const [posts, setPosts] = useState([]);
    const [pessoas, setPessoas] = useState([]);
    const [tags, setTags] = useState([]);
    const [comunidades, setComunidades] = useState([]);
    const [cidades, setCidades] = useState([]);
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    useLiveTime(30000);

    // Load follow suggestions once for the top "Quem seguir" strip
    useEffect(() => {
        api.get("/users/suggestions").then((r) => setSuggestions(r.data)).catch(() => {});
    }, []);

    const handleSuggestionFollow = async (e, username) => {
        e.stopPropagation();
        e.preventDefault();
        try {
            await api.post(`/users/${username}/follow`);
            setSuggestions((s) => s.filter((u) => u.username !== username));
            toast.success(`Começaste a seguir @${username}`);
        } catch (err) {
            toastApiError(err);
        }
    };

    useEffect(() => {
        const next = new URLSearchParams();
        if (tab !== "posts") next.set("tab", tab);
        if (mood) next.set("mood", mood);
        const cur = sp.toString();
        if (cur !== next.toString()) setSp(next, { replace: true });
    }, [tab, mood]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        const params = new URLSearchParams();
        if (mood) params.set("mood", mood);
        params.set("sort", sort);
        const done = (setter, data) => {
            if (cancelled) return;
            setter(data);
            setLoading(false);
        };
        const fail = () => { if (!cancelled) setLoading(false); };
        if (tab === "posts") {
            if (!mood && sort === "trending") {
                api.get(`/posts/explore/with-reasons`).then((r) => done(setPosts, r.data)).catch(fail);
            } else {
                api.get(`/posts/explore?${params}`).then((r) => done(setPosts, r.data)).catch(fail);
            }
        } else if (tab === "pessoas") {
            api.get("/explore/people").then((r) => done(setPessoas, r.data)).catch(fail);
        } else if (tab === "tags") {
            api.get("/trending?range=7d").then((r) => done(setTags, r.data)).catch(fail);
        } else if (tab === "comunidades") {
            api.get("/trending/comunidades?range=7d").then((r) => done(setComunidades, r.data)).catch(fail);
        } else if (tab === "cidades") {
            api.get("/trending/cidades?range=30d").then((r) => done(setCidades, r.data)).catch(fail);
        }
        return () => { cancelled = true; };
    }, [tab, mood, sort, refreshKey]);

    const refresh = () => {
        setRefreshing(true);
        setRefreshKey((k) => k + 1);
        setTimeout(() => setRefreshing(false), 600);
    };

    const filtered = useMemo(() => {
        if (!q.trim()) return null;
        const needle = q.toLowerCase();
        if (tab === "posts")       return posts.filter((p) => (p.content || "").toLowerCase().includes(needle));
        if (tab === "pessoas")     return pessoas.filter((u) => (u.name + u.username).toLowerCase().includes(needle));
        if (tab === "tags")        return tags.filter((t) => t.tag.toLowerCase().includes(needle));
        if (tab === "comunidades") return comunidades.filter((c) => c.name.toLowerCase().includes(needle));
        if (tab === "cidades")     return cidades.filter((c) => c.city.toLowerCase().includes(needle));
        return null;
    }, [q, tab, posts, pessoas, tags, comunidades, cidades]);

    const followUser = async (username) => {
        try {
            await api.post(`/users/${username}/follow`);
            setPessoas((prev) => prev.map((p) => p.username === username ? { ...p, is_following: !p.is_following } : p));
        } catch (e) { toastApiError(e); }
    };

    return (
        <div data-testid="explore-page" className="relative" style={{ background: PT.cream, minHeight: "100vh" }}>
            {/* ────────────────────────────────────────────────────────────────
                DESKTOP MASTHEAD — alinhado com Feed.js / Landing.js
                ──────────────────────────────────────────────────────────────── */}
            <div
                className="hidden lg:block sticky top-0 z-30 backdrop-blur relative"
                style={{
                    background: "rgba(247,245,239,0.92)",
                    borderBottom: "1px solid rgba(10,10,10,0.10)",
                }}
                data-testid="explore-header"
            >
                {/* Edition strip ink */}
                <div className="flex items-center justify-between px-7 py-2" style={{ background: PT.ink, color: "#FBFAF6" }}>
                    <span className="inline-flex items-center gap-2 font-mono text-[10px] font-bold uppercase" style={{ letterSpacing: "0.22em", color: PT.gold }}>
                        <span className="relative flex h-1.5 w-1.5" aria-hidden>
                            <span className="absolute inline-flex h-full w-full rounded-full lusorae-pulse" style={{ background: PT.gold }} />
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: PT.gold }} />
                        </span>
                        LUSORAE · EXPLORAR · DESCOBRIR
                    </span>
                    <span className="inline-flex items-center gap-3 font-mono text-[10px] font-bold uppercase" style={{ letterSpacing: "0.18em", color: "rgba(255,244,220,0.55)" }}>
                        <span>LISBOA · {new Date().toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}</span>
                        <span style={{ color: "rgba(255,244,220,0.28)" }}>·</span>
                        <span>EDIÇÃO · {new Date().toLocaleDateString("pt-PT", { day: "2-digit", month: "short" }).toUpperCase()}</span>
                    </span>
                </div>

                {/* Hero editorial — H1 massivo */}
                <div className="px-7 pt-7 pb-5 relative z-10">
                    <div className="flex items-center gap-2.5 mb-3.5">
                        <span className="font-mono text-[10px] font-bold uppercase" style={{ letterSpacing: "0.22em", color: "rgba(10,10,10,0.45)" }}>
                            {new Date().toLocaleDateString("pt-PT", { weekday: "long", day: "2-digit", month: "long" })}
                        </span>
                        <span style={{ color: "rgba(10,10,10,0.18)" }}>—</span>
                        <span className="font-mono text-[10.5px] font-bold uppercase" style={{ letterSpacing: "0.16em", color: PT.green }}>
                            o que ferve em Portugal
                        </span>
                    </div>

                    <div className="flex items-end justify-between gap-6">
                        <div className="min-w-0 flex-1">
                            <h1
                                className="font-black tracking-[-0.045em] leading-[0.94]"
                                style={{ fontSize: "clamp(48px, 5.4vw, 64px)", color: PT.ink }}
                                data-testid="explore-title"
                            >
                                Descobre{" "}
                                <span className="relative inline-block">
                                    <span className="relative z-10" style={{ color: PT.red }}>Portugal</span>
                                    <svg
                                        aria-hidden
                                        className="absolute pointer-events-none"
                                        style={{ left: 0, right: 0, bottom: "-0.08em", width: "100%", height: "0.22em" }}
                                        viewBox="0 0 200 12"
                                        preserveAspectRatio="none"
                                    >
                                        <path d="M2 7 Q 50 0, 100 6 T 198 5" fill="none" stroke={PT.red} strokeWidth="3" strokeLinecap="round" />
                                    </svg>
                                </span>.
                            </h1>
                            <p className="text-[15px] mt-3.5 font-medium max-w-[44ch]" style={{ color: "rgba(10,10,10,0.62)", lineHeight: 1.45 }}>
                                Pessoas, tags, comunidades e cidades em alta
                                {" — "}
                                <strong style={{ color: PT.ink, fontWeight: 700 }}>curado em tempo real</strong>.
                            </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 pb-1">
                            <span
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 font-mono text-[10px] font-bold uppercase"
                                style={{
                                    background: "#fff",
                                    color: "rgba(10,10,10,0.68)",
                                    border: "1px solid rgba(10,10,10,0.08)",
                                    borderRadius: 999,
                                    letterSpacing: "0.18em",
                                    boxShadow: "0 1px 2px rgba(10,10,10,0.04)",
                                }}
                            >
                                <span className="relative flex h-1.5 w-1.5" aria-hidden>
                                    <span className="absolute inline-flex h-full w-full rounded-full lusorae-pulse" style={{ background: PT.azul }} />
                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: PT.azul }} />
                                </span>
                                Tempo real
                            </span>
                            <button
                                onClick={refresh}
                                data-testid="explore-refresh"
                                className="w-11 h-11 grid place-items-center tap-shrink transition hover:translate-y-[-1px]"
                                title="Atualizar"
                                style={{
                                    background: "#fff",
                                    border: "1px solid rgba(10,10,10,0.08)",
                                    borderRadius: 999,
                                    boxShadow: "0 1px 2px rgba(10,10,10,0.04), 0 8px 20px -10px rgba(10,10,10,0.22)",
                                    color: PT.ink,
                                }}
                            >
                                <RefreshCw size={17} strokeWidth={2.2} className={refreshing ? "animate-spin" : ""} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Search + Tabs (desktop) */}
                <div className="px-7 pb-3" style={{ borderTop: "1px solid rgba(10,10,10,0.06)", paddingTop: 14 }}>
                    <div className="relative max-w-md mb-3">
                        <Search size={15} strokeWidth={2.2} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "rgba(10,10,10,0.45)" }} />
                        <input
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Pesquisar pessoas, #tags, cidades…"
                            data-testid="explore-search"
                            className="w-full pl-10 pr-9 py-2.5 text-[13.5px] outline-none font-medium"
                            style={{
                                background: "#fff",
                                border: "1px solid rgba(10,10,10,0.08)",
                                borderRadius: 999,
                                color: PT.ink,
                                boxShadow: "0 1px 2px rgba(10,10,10,0.04)",
                            }}
                        />
                        {q && (
                            <button onClick={() => setQ("")} className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 grid place-items-center" style={{ color: "rgba(10,10,10,0.55)" }}>
                                <X size={14} />
                            </button>
                        )}
                    </div>
                    <TabsRow tab={tab} setTab={setTab} />
                </div>
            </div>

            {/* ────────────────────────────────────────────────────────────────
                MOBILE MASTHEAD — versão compacta
                ──────────────────────────────────────────────────────────────── */}
            <div
                className="lg:hidden sticky z-30 backdrop-blur"
                style={{
                    top: "calc(var(--mobile-topbar-h) + var(--safe-top))",
                    background: "rgba(247,245,239,0.94)",
                    borderBottom: "1px solid rgba(10,10,10,0.10)",
                }}
            >
                <div className="px-4 pt-3 pb-3">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="relative flex h-1.5 w-1.5" aria-hidden>
                            <span className="absolute inline-flex h-full w-full rounded-full lusorae-pulse" style={{ background: PT.green }} />
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: PT.green }} />
                        </span>
                        <span className="font-mono text-[10px] font-bold uppercase" style={{ letterSpacing: "0.22em", color: "rgba(10,10,10,0.55)" }}>
                            Edição · {new Date().toLocaleDateString("pt-PT", { weekday: "short", day: "2-digit", month: "short" }).toUpperCase()}
                        </span>
                    </div>
                    <h1 className="font-black tracking-[-0.03em] leading-[1.0]" style={{ fontSize: 26, color: PT.ink }}>
                        Descobre{" "}
                        <span className="relative inline-block">
                            <span className="relative z-10" style={{ color: PT.red }}>Portugal</span>
                            <svg
                                aria-hidden
                                className="absolute pointer-events-none"
                                style={{ left: 0, right: 0, bottom: "-0.10em", width: "100%", height: "0.22em" }}
                                viewBox="0 0 200 12"
                                preserveAspectRatio="none"
                            >
                                <path d="M2 7 Q 50 0, 100 6 T 198 5" fill="none" stroke={PT.red} strokeWidth="3" strokeLinecap="round" />
                            </svg>
                        </span>.
                    </h1>
                </div>
                <div className="px-4 pb-2.5">
                    <div className="relative">
                        <Search size={14} strokeWidth={2.2} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "rgba(10,10,10,0.45)" }} />
                        <input
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Pesquisar..."
                            data-testid="explore-search-mobile"
                            className="w-full pl-9 pr-9 py-2 text-[13px] outline-none font-medium"
                            style={{
                                background: "#fff",
                                border: "1px solid rgba(10,10,10,0.08)",
                                borderRadius: 999,
                                color: PT.ink,
                            }}
                        />
                        {q && (
                            <button onClick={() => setQ("")} className="absolute right-2.5 top-1/2 -translate-y-1/2" style={{ color: PT.ink }}>
                                <X size={13} />
                            </button>
                        )}
                    </div>
                </div>
                <div className="px-4 pb-2.5 overflow-x-auto no-scrollbar" style={{ borderTop: "1px solid rgba(10,10,10,0.06)", paddingTop: 10 }}>
                    <TabsRow tab={tab} setTab={setTab} mobile />
                </div>
            </div>

            {/* ────────────────────────────────────────────────────────────────
                CONTENT
                ──────────────────────────────────────────────────────────────── */}
            {loading ? (<PostSkeletonList count={4} />) : tab === "posts" ? (
                <>
                    {suggestions.length > 0 && (
                        <div
                            className="px-4 lg:px-7 pt-6 pb-6"
                            style={{ borderBottom: "1px solid rgba(10,10,10,0.08)", background: PT.cream }}
                            data-testid="explore-quem-seguir"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <span className="inline-flex items-center gap-2 font-mono text-[10.5px] font-bold uppercase" style={{ letterSpacing: "0.22em", color: "rgba(10,10,10,0.55)" }}>
                                    <span className="relative flex h-1.5 w-1.5" aria-hidden>
                                        <span className="absolute inline-flex h-full w-full rounded-full lusorae-pulse" style={{ background: PT.red }} />
                                        <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: PT.red }} />
                                    </span>
                                    Quem seguir
                                </span>
                                <button
                                    onClick={() => setTab("pessoas")}
                                    className="text-[11px] font-mono font-bold uppercase tracking-[0.18em] hover:text-black transition"
                                    style={{ color: "rgba(10,10,10,0.55)" }}
                                >
                                    ver todos →
                                </button>
                            </div>
                            <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 lg:-mx-7 px-4 lg:px-7 pb-1">
                                {suggestions.slice(0, 8).map((u) => (
                                    <Link
                                        key={u.id}
                                        to={`/u/${u.username}`}
                                        data-testid={`explore-suggestion-${u.username}`}
                                        className="flex-shrink-0 w-[180px] p-4 active:scale-[0.99] transition hover:translate-y-[-1px]"
                                        style={{
                                            background: "#fff",
                                            border: "1px solid rgba(10,10,10,0.08)",
                                            boxShadow: "0 1px 2px rgba(10,10,10,0.04), 0 12px 28px -16px rgba(10,10,10,0.12)",
                                            borderRadius: 16,
                                        }}
                                    >
                                        <Avatar user={u} size={48} />
                                        <div className="mt-2.5 font-black text-[14px] tracking-tight truncate flex items-center gap-1" style={{ color: PT.ink }}>
                                            {u.name || u.username} {u.verified && <VerifiedBadge size={10} />}
                                        </div>
                                        <div className="text-[10.5px] truncate font-mono font-bold" style={{ color: "rgba(10,10,10,0.55)", letterSpacing: "0.04em" }}>
                                            @{u.username}{u.reason ? ` · ${u.reason}` : ""}
                                        </div>
                                        <button
                                            onClick={(e) => handleSuggestionFollow(e, u.username)}
                                            data-testid={`explore-suggestion-follow-${u.username}`}
                                            className="mt-3 w-full py-2 text-[11.5px] font-black uppercase transition hover:translate-y-[-1px]"
                                            style={{
                                                background: PT.ink,
                                                color: "#fff",
                                                borderRadius: 999,
                                                letterSpacing: "0.12em",
                                                boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10), 0 8px 18px -10px rgba(10,10,10,0.30)",
                                            }}
                                        >
                                            Seguir
                                        </button>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}
                    {(filtered || posts).length === 0 ? <EmptyExplore /> : (filtered || posts).map((p) => (
                        <PostCard key={p.id} post={p}
                            onChange={(np) => setPosts((prev) => prev.map((x) => (x.id === np.id ? np : x)))}
                            onDelete={(id) => setPosts((prev) => prev.filter((x) => x.id !== id))}
                        />
                    ))}
                </>
            ) : tab === "pessoas" ? (
                (filtered || pessoas).length === 0 ? <EmptyExplore msg="Sem sugestões agora" /> : (filtered || pessoas).map((u) => (
                    <div key={u.id} className="flex items-center gap-3 px-4 lg:px-7 py-4" style={{ borderBottom: "1px solid rgba(10,10,10,0.08)" }}>
                        <Avatar user={u} size={48} />
                        <Link to={`/u/${u.username}`} className="flex-1 min-w-0">
                            <div className="font-black text-[15px] truncate tracking-tight" style={{ color: PT.ink }}>{u.display_name || u.username}</div>
                            <div className="text-[12px] truncate font-mono font-bold" style={{ color: "rgba(10,10,10,0.55)", letterSpacing: "0.04em" }}>
                                @{u.username}{u.reason ? <> · <span style={{ color: "rgba(10,10,10,0.42)" }}>{u.reason}</span></> : null}
                            </div>
                        </Link>
                        <button
                            onClick={() => followUser(u.username)}
                            data-testid={`explore-follow-${u.username}`}
                            className="text-[11px] font-black uppercase px-4 py-2 transition hover:translate-y-[-1px]"
                            style={{
                                background: u.is_following ? "#fff" : PT.ink,
                                color: u.is_following ? PT.ink : "#fff",
                                border: u.is_following ? "1px solid rgba(10,10,10,0.10)" : "1px solid transparent",
                                borderRadius: 999,
                                letterSpacing: "0.12em",
                                boxShadow: u.is_following ? "0 1px 2px rgba(10,10,10,0.04)" : "inset 0 1px 0 rgba(255,255,255,0.10), 0 8px 18px -10px rgba(10,10,10,0.30)",
                            }}
                        >
                            {u.is_following ? "Seguindo" : "Seguir"}
                        </button>
                    </div>
                ))
            ) : tab === "tags" ? (
                (filtered || tags).length === 0 ? <EmptyExplore msg="Sem hashtags em alta" /> : (filtered || tags).map((t, i) => (
                    <Link key={t.tag} to={`/tag/${t.tag}`} className="flex items-center gap-4 px-4 lg:px-7 py-4 hover:bg-[rgba(10,10,10,0.02)] transition" style={{ borderBottom: "1px solid rgba(10,10,10,0.08)" }}>
                        <span
                            className="w-9 h-9 grid place-items-center font-black tabular-nums font-mono"
                            style={{
                                background: i === 0 ? PT.gold : i === 1 ? "#fff" : "#fff",
                                color: PT.ink,
                                border: "1px solid rgba(10,10,10,0.08)",
                                boxShadow: "0 1px 2px rgba(10,10,10,0.04)",
                                borderRadius: 10,
                                fontSize: 13,
                            }}
                        >
                            {i + 1}
                        </span>
                        <Hash size={20} strokeWidth={2.6} style={{ color: PT.red }} />
                        <div className="flex-1 min-w-0">
                            <div className="font-black text-[19px] truncate tracking-[-0.02em]" style={{ color: PT.ink }}>#{t.tag}</div>
                            <div className="text-[11px] font-mono font-bold mt-0.5" style={{ color: "rgba(10,10,10,0.5)", letterSpacing: "0.06em" }}>
                                {t.count} POSTS · {t.velocity >= 0 ? `↑${t.velocity}%` : `↓${Math.abs(t.velocity)}%`}
                            </div>
                        </div>
                    </Link>
                ))
            ) : tab === "comunidades" ? (
                (filtered || comunidades).length === 0 ? <EmptyExplore msg="Sem comunidades em alta" /> : (filtered || comunidades).map((c) => (
                    <Link key={c.id} to={`/c/${c.slug}`} className="flex items-center gap-3 px-4 lg:px-7 py-4 hover:bg-[rgba(10,10,10,0.02)] transition" style={{ borderBottom: "1px solid rgba(10,10,10,0.08)" }}>
                        <div
                            className="w-12 h-12 grid place-items-center"
                            style={{
                                background: PT.azul,
                                color: "#fff",
                                borderRadius: 12,
                                boxShadow: "0 1px 2px rgba(10,10,10,0.06), 0 10px 20px -10px rgba(0,63,135,0.40)",
                            }}
                        >
                            <Layers size={20} strokeWidth={2.4} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="font-black text-[16px] truncate tracking-[-0.015em]" style={{ color: PT.ink }}>{c.name}</div>
                            <div className="text-[11.5px] font-mono font-bold mt-0.5" style={{ color: "rgba(10,10,10,0.55)", letterSpacing: "0.04em" }}>
                                {c.members_count} MEMBROS · {c.trend_posts} POSTS / SEMANA
                            </div>
                        </div>
                    </Link>
                ))
            ) : (
                (filtered || cidades).length === 0 ? <EmptyExplore msg="Sem cidades em alta" /> : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" style={{ gap: 1, background: "rgba(10,10,10,0.08)" }}>
                        {(filtered || cidades).map((c) => (
                            <button
                                key={c.city}
                                onClick={() => { setTab("posts"); }}
                                className="flex items-center gap-3 px-4 py-4 transition hover:bg-[rgba(10,10,10,0.02)]"
                                style={{ background: "#fff" }}
                            >
                                <div
                                    className="w-12 h-12 grid place-items-center"
                                    style={{
                                        background: PT.red,
                                        color: "#fff",
                                        borderRadius: 12,
                                        boxShadow: "0 1px 2px rgba(10,10,10,0.06), 0 10px 20px -10px rgba(200,16,46,0.40)",
                                    }}
                                >
                                    <MapPin size={20} strokeWidth={2.4} />
                                </div>
                                <div className="flex-1 min-w-0 text-left">
                                    <div className="font-black text-[18px] truncate tracking-[-0.02em]" style={{ color: PT.ink }}>{c.city}</div>
                                    <div className="text-[11px] font-mono font-bold mt-0.5" style={{ color: "rgba(10,10,10,0.55)", letterSpacing: "0.06em" }}>
                                        {c.count} POSTS · {c.velocity >= 0 ? `↑${c.velocity}%` : `↓${Math.abs(c.velocity)}%`}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )
            )}
        </div>
    );
}

// ── Tabs row (reused for desktop + mobile, pill ink active) ──────────────────
function TabsRow({ tab, setTab, mobile = false }) {
    return (
        <div className={`flex gap-2 ${mobile ? "overflow-x-auto no-scrollbar" : "flex-wrap"}`}>
            {TABS.map((t) => {
                const Icon = t.icon;
                const active = tab === t.key;
                return (
                    <button
                        key={t.key}
                        onClick={() => setTab(t.key)}
                        data-testid={`explore-tab-${t.key}`}
                        className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 text-[11.5px] font-black uppercase transition hover:translate-y-[-1px]"
                        style={{
                            background: active ? PT.ink : "#fff",
                            color: active ? "#fff" : PT.ink,
                            border: active ? "1px solid transparent" : "1px solid rgba(10,10,10,0.10)",
                            borderRadius: 999,
                            letterSpacing: "0.12em",
                            boxShadow: active
                                ? "inset 0 1px 0 rgba(255,255,255,0.10), 0 8px 18px -10px rgba(10,10,10,0.30)"
                                : "0 1px 2px rgba(10,10,10,0.04)",
                        }}
                    >
                        <Icon size={12} strokeWidth={2.4} /> {t.label}
                    </button>
                );
            })}
        </div>
    );
}

function EmptyExplore({ msg = "Sem publicações" }) {
    return (
        <div className="px-6 py-20 text-center anim-fade-up">
            <div
                className="w-20 h-20 grid place-items-center mx-auto mb-6"
                style={{
                    background: "#fff",
                    color: PT.ink,
                    border: "1px solid rgba(10,10,10,0.08)",
                    boxShadow: "0 1px 2px rgba(10,10,10,0.04), 0 10px 30px -12px rgba(10,10,10,0.18)",
                    borderRadius: 999,
                }}
            >
                <Compass size={26} strokeWidth={2.0} />
            </div>
            <p className="font-mono font-bold uppercase mb-2" style={{ fontSize: 10.5, letterSpacing: "0.22em", color: "rgba(10,10,10,0.42)" }}>
                Nada por aqui
            </p>
            <h3
                className="font-black tracking-[-0.025em] leading-tight"
                style={{ fontSize: "clamp(22px, 3vw, 28px)", color: PT.ink }}
            >
                {msg}
            </h3>
            <p className="text-[13.5px] mt-3 font-medium" style={{ color: "rgba(10,10,10,0.55)" }}>Tenta outro filtro.</p>
        </div>
    );
}
