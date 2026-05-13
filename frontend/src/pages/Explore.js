import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { PostCard } from "../components/PostCard";
import { PostSkeletonList } from "../components/Skeleton";
import { PageHeader } from "../components/PageHeader";
import { api, formatApiError, toastApiError } from "../lib/api";
import { useLiveTime } from "../hooks/useLiveTime";
import { Compass, Search, Users, Hash, Layers, MapPin, Flame, Clock, X } from "lucide-react";
import { MOOD_OPTIONS } from "../lib/portuguese";
import { Avatar } from "../components/Avatar";
import { toast } from "sonner";

const TABS = [
    { key: "posts", label: "Posts", icon: Hash },
    { key: "pessoas", label: "Pessoas", icon: Users },
    { key: "tags", label: "Tags", icon: Hash },
    { key: "comunidades", label: "Comunidades", icon: Layers },
    { key: "cidades", label: "Cidades 🇵🇹", icon: MapPin },
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
    const [loading, setLoading] = useState(true);
    useLiveTime(30000);

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
        <div data-testid="explore-page">
            <PageHeader title="Explorar" subtitle="Descobre o que se passa em Portugal" testid="explore-header">
                <div className="px-3 lg:px-4 pb-2.5 flex items-center gap-2">
                    <div className="flex-1 relative">
                        <Search size={14} strokeWidth={1.7} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40" />
                        <input
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Pesquisar..."
                            data-testid="explore-search"
                            className="w-full bg-black/[0.04] border border-transparent rounded-full pl-9 pr-9 py-2 text-[13px] focus:bg-white focus:border-black/15 outline-none transition"
                        />
                        {q && (
                            <button onClick={() => setQ("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-black/40 hover:text-black">
                                <X size={13} />
                            </button>
                        )}
                    </div>
                    {tab === "posts" && (
                        <div className="flex items-center gap-1">
                            <button onClick={() => setSort("trending")} title="Tendências" className={`w-8 h-8 rounded-full grid place-items-center transition ${sort === "trending" ? "chip-filter-on" : "text-black hover:bg-black/[0.06]"}`}>
                                <Flame size={14} />
                            </button>
                            <button onClick={() => setSort("recent")} title="Recentes" className={`w-8 h-8 rounded-full grid place-items-center transition ${sort === "recent" ? "chip-filter-on" : "text-black hover:bg-black/[0.06]"}`}>
                                <Clock size={14} />
                            </button>
                        </div>
                    )}
                </div>
                <div className="px-3 lg:px-4 flex gap-1 overflow-x-auto scrollbar-hide pb-2 hairline-t pt-2">
                    {TABS.map((t) => {
                        const Icon = t.icon;
                        const active = tab === t.key;
                        return (
                            <button
                                key={t.key}
                                onClick={() => setTab(t.key)}
                                data-testid={`explore-tab-${t.key}`}
                                className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium border-b-2 transition ${active ? "tab-grad-on" : "border-transparent text-black hover:text-black"}`}
                            >
                                <Icon size={14} strokeWidth={1.6} /> {t.label}
                            </button>
                        );
                    })}
                </div>
                {tab === "posts" && (
                    <div className="flex gap-1.5 px-3 lg:px-4 pb-2.5 overflow-x-auto scrollbar-hide">
                        <button onClick={() => setMood("")} className={`shrink-0 px-3 py-1 rounded-full text-[12px] font-medium ${mood === "" ? "chip-filter-on" : "bg-black/[0.04] text-black hover:bg-black/[0.08]"}`}>Todos</button>
                        {MOOD_OPTIONS.map((m) => (
                            <button key={m.key} onClick={() => setMood(m.key)} data-testid={`explore-mood-${m.key}`} className={`shrink-0 inline-flex items-center gap-1 px-3 py-1 rounded-full text-[12px] font-medium ${mood === m.key ? "chip-filter-on" : "bg-black/[0.04] text-black hover:bg-black/[0.08]"}`}>
                                <span>{m.emoji}</span> {m.label}
                            </button>
                        ))}
                    </div>
                )}
            </PageHeader>

            {loading ? (<PostSkeletonList count={4} />) : tab === "posts" ? (
                (filtered || posts).length === 0 ? <EmptyExplore /> : (filtered || posts).map((p) => (
                    <PostCard key={p.id} post={p}
                        onChange={(np) => setPosts((prev) => prev.map((x) => (x.id === np.id ? np : x)))}
                        onDelete={(id) => setPosts((prev) => prev.filter((x) => x.id !== id))}
                    />
                ))
            ) : tab === "pessoas" ? (
                (filtered || pessoas).length === 0 ? <EmptyExplore msg="Sem sugestões agora" /> : (filtered || pessoas).map((u) => (
                    <div key={u.id} className="flex items-center gap-3 px-4 lg:px-5 py-3.5 hairline-b">
                        <Avatar user={u} size={44} />
                        <Link to={`/u/${u.username}`} className="flex-1 min-w-0">
                            <div className="font-medium text-[14px] truncate">{u.display_name || u.username}</div>
                            <div className="text-[12px] text-black/55 truncate">@{u.username} · <span className="text-black/45">{u.reason}</span></div>
                        </Link>
                        <button
                            onClick={() => followUser(u.username)}
                            data-testid={`explore-follow-${u.username}`}
                            className={`text-[11px] font-heading font-medium tracking-tight rounded-full px-4 py-1.5 transition active:scale-95 ${u.is_following ? "chip-on" : "btn-obsidian"}`}
                        >
                            {u.is_following ? "Seguindo" : "Seguir"}
                        </button>
                    </div>
                ))
            ) : tab === "tags" ? (
                (filtered || tags).length === 0 ? <EmptyExplore msg="Sem hashtags em alta" /> : (filtered || tags).map((t, i) => (
                    <Link key={t.tag} to={`/tag/${t.tag}`} className="flex items-center gap-4 px-4 lg:px-5 py-3.5 hairline-b hover:bg-black/[0.015]">
                        <span className="w-7 text-right text-[18px] font-display text-black/25">{i + 1}</span>
                        <Hash size={15} className="text-black/45" />
                        <div className="flex-1 min-w-0">
                            <div className="font-display text-[18px] truncate">{t.tag}</div>
                            <div className="text-[11px] font-mono text-black/45">{t.count} posts {t.velocity >= 0 ? `· ↑${t.velocity}%` : `· ↓${Math.abs(t.velocity)}%`}</div>
                        </div>
                    </Link>
                ))
            ) : tab === "comunidades" ? (
                (filtered || comunidades).length === 0 ? <EmptyExplore msg="Sem comunidades em alta" /> : (filtered || comunidades).map((c) => (
                    <Link key={c.id} to={`/c/${c.slug}`} className="flex items-center gap-3 px-4 lg:px-5 py-3.5 hairline-b hover:bg-black/[0.015]">
                        <div className="w-11 h-11 rounded-full bg-black/[0.05] grid place-items-center"><Layers size={18} className="text-black/65" /></div>
                        <div className="flex-1 min-w-0">
                            <div className="font-medium text-[15px] truncate">{c.name}</div>
                            <div className="text-[12px] text-black/55">{c.members_count} membros · {c.trend_posts} posts esta semana</div>
                        </div>
                    </Link>
                ))
            ) : (
                (filtered || cidades).length === 0 ? <EmptyExplore msg="Sem cidades em alta" /> : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-black/[0.06]">
                        {(filtered || cidades).map((c) => (
                            <button
                                key={c.city}
                                onClick={() => { setTab("posts"); }}
                                className="flex items-center gap-3 bg-white px-4 py-3.5 hover:bg-black/[0.015]"
                            >
                                <div className="w-10 h-10 rounded-full bg-rose-50 grid place-items-center"><MapPin size={16} className="text-rose-600" /></div>
                                <div className="flex-1 min-w-0 text-left">
                                    <div className="font-display text-[18px] truncate">{c.city}</div>
                                    <div className="text-[11px] font-mono text-black/45">{c.count} posts · {c.velocity >= 0 ? `↑${c.velocity}%` : `↓${Math.abs(c.velocity)}%`}</div>
                                </div>
                            </button>
                        ))}
                    </div>
                )
            )}
        </div>
    );
}

function EmptyExplore({ msg = "Sem publicações" }) {
    return (
        <div className="px-6 py-20 text-center anim-fade-up">
            <div className="ring-silver w-20 h-20 rounded-full grid place-items-center mx-auto mb-6">
                <Compass size={26} strokeWidth={1.4} className="text-black/70" />
            </div>
            <p className="type-overline mb-2">Nada por aqui</p>
            <h3 className="font-display text-[19px] font-bold tracking-tight text-black">{msg}</h3>
            <p className="text-black/55 text-sm mt-2">Tenta outro filtro.</p>
        </div>
    );
}
