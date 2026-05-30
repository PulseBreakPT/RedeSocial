import { useEffect, useMemo, useState, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { PostCard } from "../components/PostCard";
import { PostSkeletonList } from "../components/Skeleton";
import { PageHeader } from "../components/PageHeader";
import { PtPageShell } from "../components/PtPageShell";
import { PT } from "./auth/AuthDecor";
import { api, formatApiError, toastApiError } from "../lib/api";
import { useLiveTime } from "../hooks/useLiveTime";
import { Compass, Search, Users, Hash, Layers, MapPin, X, Sparkles, RotateCw, MessageSquare } from "lucide-react";
import { Avatar } from "../components/Avatar";
import { VerifiedBadge } from "../components/VerifiedBadge";
import { toast } from "sonner";

const TABS = [
    { key: "posts", label: "Posts", icon: MessageSquare },
    { key: "pessoas", label: "Pessoas", icon: Users },
    { key: "tags", label: "Tags", icon: Hash },
    { key: "comunidades", label: "Comunidades", icon: Layers },
    { key: "cidades", label: "Cidades", icon: MapPin },
];

export default function Explore() {
    const [sp, setSp] = useSearchParams();
    const [tab, setTab] = useState(() => (TABS.find((t) => t.key === sp.get("tab"))?.key) || "posts");
    const [mood, setMood] = useState(() => sp.get("mood") || "");
    const [sort, setSort] = useState("trending");
    const [q, setQ] = useState("");
    const [posts, setPosts] = useState([]);
    const [pessoas, setPessoas] = useState([]);
    const [tags, setTags] = useState([]);
    const [comunidades, setComunidades] = useState([]);
    const [cidades, setCidades] = useState([]);
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);
    const [surprising, setSurprising] = useState(false);
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
        // Sync URL with current tab + mood (replace, so back-button doesn't pile up)
        const next = new URLSearchParams();
        if (tab !== "posts") next.set("tab", tab);
        if (mood) next.set("mood", mood);
        const cur = sp.toString();
        if (cur !== next.toString()) setSp(next, { replace: true });
    }, [tab, mood]); // eslint-disable-line

    useEffect(() => {
        setLoading(true);
        const params = new URLSearchParams();
        if (mood) params.set("mood", mood);
        params.set("sort", sort);
        if (tab === "posts") {
            // when no mood filter, use the with-reasons endpoint for "Para ti" experience
            if (!mood && sort === "trending") {
                api.get(`/posts/explore/with-reasons`).then((r) => { setPosts(r.data); setLoading(false); });
            } else {
                api.get(`/posts/explore?${params}`).then((r) => { setPosts(r.data); setLoading(false); });
            }
        } else if (tab === "pessoas") {
            api.get("/explore/people").then((r) => { setPessoas(r.data); setLoading(false); }).catch(() => setLoading(false));
        } else if (tab === "tags") {
            api.get("/trending?range=7d").then((r) => { setTags(r.data); setLoading(false); });
        } else if (tab === "comunidades") {
            api.get("/trending/comunidades?range=7d").then((r) => { setComunidades(r.data); setLoading(false); });
        } else if (tab === "cidades") {
            api.get("/trending/cidades?range=30d").then((r) => { setCidades(r.data); setLoading(false); });
        }
    }, [tab, mood, sort]);

    const filtered = useMemo(() => {
        if (!q.trim()) return null;
        const needle = q.toLowerCase();
        if (tab === "posts") return posts.filter((p) => (p.content || "").toLowerCase().includes(needle));
        if (tab === "pessoas") return pessoas.filter((u) => (u.name + u.username).toLowerCase().includes(needle));
        if (tab === "tags") return tags.filter((t) => t.tag.toLowerCase().includes(needle));
        if (tab === "comunidades") return comunidades.filter((c) => c.name.toLowerCase().includes(needle));
        if (tab === "cidades") return cidades.filter((c) => c.city.toLowerCase().includes(needle));
        return null;
    }, [q, tab, posts, pessoas, tags, comunidades, cidades]);

    const followUser = async (username) => {
        try {
            await api.post(`/users/${username}/follow`);
            setPessoas((prev) => prev.map((p) => p.username === username ? { ...p, is_following: !p.is_following } : p));
        } catch (e) { toastApiError(e); }
    };

    return (
        <PtPageShell testid="explore-page">
            <PageHeader sticky={false} title="Explorar" testid="explore-header">
                <div className="px-3 lg:px-4 pb-2.5 flex items-center gap-2">
                    <div className="flex-1 relative">
                        <Search size={14} strokeWidth={2.2} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: PT.ink }} />
                        <input
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Pesquisar..."
                            data-testid="explore-search"
                            className="w-full pl-9 pr-9 py-2 text-[13px] outline-none font-medium"
                            style={{
                                background: "#fff",
                                border: `2.5px solid ${PT.ink}`,
                                borderRadius: 999,
                                color: PT.ink,
                                boxShadow: `2px 2px 0 ${PT.ink}`,
                            }}
                        />
                        {q && (
                            <button onClick={() => setQ("")} className="absolute right-2.5 top-1/2 -translate-y-1/2" style={{ color: PT.ink }}>
                                <X size={13} />
                            </button>
                        )}
                    </div>
                    {tab === "posts" && (
                        <div className="flex items-center gap-1" />
                    )}
                </div>
                <div className="px-3 lg:px-4 flex gap-1.5 overflow-x-auto scrollbar-hide pb-2 pt-2" style={{ borderTop: `2px dashed ${PT.ink}` }}>
                    {TABS.map((t) => {
                        const Icon = t.icon;
                        const active = tab === t.key;
                        return (
                            <button
                                key={t.key}
                                onClick={() => setTab(t.key)}
                                data-testid={`explore-tab-${t.key}`}
                                className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-black uppercase transition`}
                                style={{
                                    background: active ? PT.ink : "#fff",
                                    color: active ? PT.gold : PT.ink,
                                    border: `2px solid ${PT.ink}`,
                                    borderRadius: 999,
                                    boxShadow: active ? `2px 2px 0 ${PT.red}` : `2px 2px 0 ${PT.ink}`,
                                    letterSpacing: "0.04em",
                                }}
                            >
                                <Icon size={12} strokeWidth={2.4} /> {t.label}
                            </button>
                        );
                    })}
                </div>
                {tab === "posts" && (
                    <div className="px-3 lg:px-4 pb-2.5" />
                )}
            </PageHeader>

            {loading ? (<PostSkeletonList count={4} />) : tab === "posts" ? (
                <>
                    {/* Quem seguir — horizontal scroll strip (lives only on Descobrir) */}
                    {suggestions.length > 0 && (
                        <div
                            className="px-3 lg:px-5 pt-4 pb-4"
                            style={{ borderBottom: `2.5px solid ${PT.ink}`, background: PT.cream }}
                            data-testid="explore-quem-seguir"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <p className="font-mono font-black uppercase inline-flex items-center gap-1.5" style={{ fontSize: 10.5, letterSpacing: "0.16em", color: PT.red }}>
                                    <Sparkles size={12} strokeWidth={2.4} style={{ color: PT.red }} />
                                    // QUEM SEGUIR
                                </p>
                                <button
                                    onClick={() => setTab("pessoas")}
                                    className="text-[11px] font-black uppercase px-2.5 py-1 tap-shrink"
                                    style={{
                                        background: "#fff",
                                        color: PT.ink,
                                        border: `2px solid ${PT.ink}`,
                                        boxShadow: `2px 2px 0 ${PT.ink}`,
                                        borderRadius: 999,
                                        letterSpacing: "0.06em",
                                    }}
                                >
                                    ver todos →
                                </button>
                            </div>
                            <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-3 lg:-mx-5 px-3 lg:px-5 pb-1">
                                {suggestions.slice(0, 8).map((u, idx) => (
                                    <Link
                                        key={u.id}
                                        to={`/u/${u.username}`}
                                        data-testid={`explore-suggestion-${u.username}`}
                                        className="flex-shrink-0 w-[170px] p-3 active:scale-[0.98] transition"
                                        style={{
                                            background: "#fff",
                                            border: `2.5px solid ${PT.ink}`,
                                            boxShadow: `3px 3px 0 ${idx % 3 === 0 ? PT.gold : idx % 3 === 1 ? PT.azul : PT.red}`,
                                            borderRadius: 14,
                                            transform: `rotate(${idx % 2 === 0 ? -0.6 : 0.6}deg)`,
                                        }}
                                    >
                                        <Avatar user={u} size={44} />
                                        <div className="mt-2 font-black text-[13px] tracking-tight truncate flex items-center gap-1" style={{ color: PT.ink }}>
                                            {u.name || u.username} {u.verified && <VerifiedBadge size={10} />}
                                        </div>
                                        <div className="text-[10.5px] truncate font-mono font-bold" style={{ color: "rgba(10,10,10,0.55)" }}>
                                            @{u.username}{u.reason ? ` · ${u.reason}` : ""}
                                        </div>
                                        <button
                                            onClick={(e) => handleSuggestionFollow(e, u.username)}
                                            data-testid={`explore-suggestion-follow-${u.username}`}
                                            className="mt-3 w-full py-1.5 text-[11.5px] font-black uppercase"
                                            style={{
                                                background: PT.ink,
                                                color: PT.gold,
                                                border: `2px solid ${PT.ink}`,
                                                borderRadius: 999,
                                                letterSpacing: "0.06em",
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
                    <div key={u.id} className="flex items-center gap-3 px-4 lg:px-5 py-3.5" style={{ borderBottom: `1.5px dashed rgba(10,10,10,0.18)` }}>
                        <Avatar user={u} size={44} />
                        <Link to={`/u/${u.username}`} className="flex-1 min-w-0">
                            <div className="font-black text-[14px] truncate" style={{ color: PT.ink }}>{u.display_name || u.username}</div>
                            <div className="text-[12px] truncate font-mono font-bold" style={{ color: "rgba(10,10,10,0.55)" }}>@{u.username}{u.reason ? <> · <span style={{ color: "rgba(10,10,10,0.45)" }}>{u.reason}</span></> : null}</div>
                        </Link>
                        <button
                            onClick={() => followUser(u.username)}
                            data-testid={`explore-follow-${u.username}`}
                            className="text-[11px] font-black uppercase px-4 py-1.5 transition active:scale-95"
                            style={{
                                background: u.is_following ? "#fff" : PT.ink,
                                color: u.is_following ? PT.ink : PT.gold,
                                border: `2px solid ${PT.ink}`,
                                boxShadow: `2px 2px 0 ${PT.ink}`,
                                borderRadius: 999,
                                letterSpacing: "0.06em",
                            }}
                        >
                            {u.is_following ? "Seguindo" : "Seguir"}
                        </button>
                    </div>
                ))
            ) : tab === "tags" ? (
                (filtered || tags).length === 0 ? <EmptyExplore msg="Sem hashtags em alta" /> : (filtered || tags).map((t, i) => (
                    <Link key={t.tag} to={`/tag/${t.tag}`} className="flex items-center gap-4 px-4 lg:px-5 py-3.5" style={{ borderBottom: `1.5px dashed rgba(10,10,10,0.18)` }}>
                        <span
                            className="w-8 h-8 grid place-items-center font-black tabular-nums"
                            style={{
                                background: i === 0 ? PT.gold : i === 1 ? PT.cream : "#fff",
                                color: PT.ink,
                                border: `2px solid ${PT.ink}`,
                                boxShadow: `1.5px 1.5px 0 ${PT.ink}`,
                                borderRadius: 8,
                                fontSize: 12,
                            }}
                        >
                            {i + 1}
                        </span>
                        <Hash size={16} strokeWidth={2.6} style={{ color: PT.red }} />
                        <div className="flex-1 min-w-0">
                            <div className="font-black text-[17px] truncate tracking-tight" style={{ color: PT.ink }}>#{t.tag}</div>
                            <div className="text-[11px] font-mono font-bold" style={{ color: "rgba(10,10,10,0.5)" }}>
                                {t.count} posts {t.velocity >= 0 ? `· ↑${t.velocity}%` : `· ↓${Math.abs(t.velocity)}%`}
                            </div>
                        </div>
                    </Link>
                ))
            ) : tab === "comunidades" ? (
                (filtered || comunidades).length === 0 ? <EmptyExplore msg="Sem comunidades em alta" /> : (filtered || comunidades).map((c) => (
                    <Link key={c.id} to={`/c/${c.slug}`} className="flex items-center gap-3 px-4 lg:px-5 py-3.5" style={{ borderBottom: `1.5px dashed rgba(10,10,10,0.18)` }}>
                        <div
                            className="w-11 h-11 grid place-items-center"
                            style={{
                                background: PT.azul,
                                color: "#fff",
                                border: `2.5px solid ${PT.ink}`,
                                boxShadow: `2.5px 2.5px 0 ${PT.ink}`,
                                borderRadius: 10,
                                transform: "rotate(-4deg)",
                            }}
                        >
                            <Layers size={18} strokeWidth={2.4} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="font-black text-[15px] truncate tracking-tight" style={{ color: PT.ink }}>{c.name}</div>
                            <div className="text-[12px] font-mono font-bold" style={{ color: "rgba(10,10,10,0.55)" }}>
                                {c.members_count} membros · {c.trend_posts} posts esta semana
                            </div>
                        </div>
                    </Link>
                ))
            ) : (
                (filtered || cidades).length === 0 ? <EmptyExplore msg="Sem cidades em alta" /> : (
                    <div className="grid grid-cols-1 sm:grid-cols-2" style={{ background: PT.ink, gap: 2 }}>
                        {(filtered || cidades).map((c) => (
                            <button
                                key={c.city}
                                onClick={() => { setTab("posts"); }}
                                className="flex items-center gap-3 px-4 py-3.5 transition"
                                style={{ background: "#fff" }}
                            >
                                <div
                                    className="w-10 h-10 grid place-items-center"
                                    style={{
                                        background: PT.red,
                                        color: "#fff",
                                        border: `2.5px solid ${PT.ink}`,
                                        boxShadow: `2.5px 2.5px 0 ${PT.ink}`,
                                        borderRadius: 10,
                                        transform: "rotate(-4deg)",
                                    }}
                                >
                                    <MapPin size={16} strokeWidth={2.4} />
                                </div>
                                <div className="flex-1 min-w-0 text-left">
                                    <div className="font-black text-[17px] truncate tracking-tight" style={{ color: PT.ink }}>{c.city}</div>
                                    <div className="text-[11px] font-mono font-bold" style={{ color: "rgba(10,10,10,0.55)" }}>
                                        {c.count} posts · {c.velocity >= 0 ? `↑${c.velocity}%` : `↓${Math.abs(c.velocity)}%`}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )
            )}
        </PtPageShell>
    );
}

function EmptyExplore({ msg = "Sem publicações" }) {
    return (
        <div className="px-6 py-16 text-center anim-fade-up">
            <div
                className="w-20 h-20 grid place-items-center mx-auto mb-6"
                style={{
                    background: PT.gold,
                    color: PT.ink,
                    border: `3px solid ${PT.ink}`,
                    boxShadow: `5px 5px 0 ${PT.ink}`,
                    borderRadius: 18,
                    transform: "rotate(-4deg)",
                }}
            >
                <Compass size={26} strokeWidth={2.4} />
            </div>
            <p className="font-mono font-black uppercase mb-2" style={{ fontSize: 10.5, letterSpacing: "0.16em", color: PT.red }}>
                // NADA POR AQUI
            </p>
            <h3
                className="font-black tracking-[-0.025em] leading-tight"
                style={{ fontSize: "clamp(20px, 2.8vw, 26px)", color: PT.ink }}
            >
                {msg}
            </h3>
            <p className="text-[13.5px] mt-3 font-medium" style={{ color: "rgba(10,10,10,0.55)" }}>Tenta outro filtro.</p>
        </div>
    );
}
