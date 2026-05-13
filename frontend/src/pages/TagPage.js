import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Hash, MapPin, TrendingUp, Users, Heart, BellRing, BellOff, Share2 } from "lucide-react";
import { api } from "../lib/api";
import { PostCard } from "../components/PostCard";
import { PageHeader } from "../components/PageHeader";
import { lsGet, lsSet } from "../lib/portuguese";
import { toast } from "sonner";

const SORTS = [
    { key: "recent", label: "Recente" },
    { key: "top", label: "Top" },
];

export default function TagPage() {
    const { tag } = useParams();
    const [posts, setPosts] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [sort, setSort] = useState("recent");
    const [followed, setFollowed] = useState(() => (lsGet("followed_tags", []) || []).includes(tag));

    useEffect(() => {
        setLoading(true);
        Promise.all([
            api.get(`/posts/tag/${tag}`),
            api.get(`/tags/${tag}/stats`).catch(() => ({ data: null })),
        ]).then(([p, s]) => { setPosts(p.data); setStats(s.data); setLoading(false); });
    }, [tag]);

    useEffect(() => {
        const list = lsGet("followed_tags", []) || [];
        setFollowed(list.includes(tag));
    }, [tag]);

    const sorted = useMemo(() => {
        if (sort === "top") return [...posts].sort((a, b) => (b.likes_count + b.reposts_count * 2) - (a.likes_count + a.reposts_count * 2));
        return posts;
    }, [posts, sort]);

    const toggleFollow = () => {
        const list = lsGet("followed_tags", []) || [];
        let next;
        if (list.includes(tag)) { next = list.filter((t) => t !== tag); toast.success("Hashtag deixada"); }
        else { next = [...list, tag]; toast.success("A seguir hashtag"); }
        lsSet("followed_tags", next);
        setFollowed(next.includes(tag));
    };
    const share = async () => {
        try { await navigator.clipboard.writeText(`${window.location.origin}/tag/${tag}`); toast.success("Link copiado"); }
        catch { toast.error("Não consegui copiar"); }
    };

    return (
        <div data-testid="tag-page">
            <PageHeader
                title={<span className="inline-flex items-center gap-1.5">{stats?.is_city ? <MapPin size={16} className="text-rose-500" /> : <Hash size={16} className="text-black/55" />} {stats?.city_label || tag}</span>}
                subtitle={`${posts.length} ${posts.length === 1 ? "publicação" : "publicações"}`}
                back testid="tag-header"
                action={
                    <div className="flex items-center gap-1">
                        <button onClick={share} title="Partilhar" className="w-9 h-9 grid place-items-center rounded-full hover:bg-black/[0.05] text-black/55">
                            <Share2 size={14} />
                        </button>
                        <button onClick={toggleFollow} data-testid="tag-follow-btn" className={`text-[11px] font-heading font-medium tracking-tight rounded-full px-4 py-2 inline-flex items-center gap-1.5 ${followed ? "btn-silver" : "btn-obsidian"}`}>
                            {followed ? <BellOff size={11} /> : <BellRing size={11} />} {followed ? "A seguir" : "Seguir"}
                        </button>
                    </div>
                }
            />

            {stats && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-4 lg:p-5 hairline-b">
                    <StatBlock label="Total" value={stats.total} icon={Hash} />
                    <StatBlock label="Esta semana" value={stats.posts_week} icon={TrendingUp} hint={stats.velocity >= 0 ? `↑${stats.velocity}%` : `↓${Math.abs(stats.velocity)}%`} hintGood={stats.velocity >= 0} />
                    <StatBlock label="Autores" value={stats.unique_authors} icon={Users} />
                    <StatBlock label="Gostos sem" value={stats.likes_week} icon={Heart} />
                </div>
            )}

            {stats?.related?.length > 0 && (
                <div className="px-4 lg:px-5 py-3 hairline-b">
                    <span className="type-overline mr-2">Relacionadas</span>
                    <div className="inline-flex flex-wrap gap-1.5 mt-2">
                        {stats.related.map((r) => (
                            <Link key={r.tag} to={`/tag/${r.tag}`} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/[0.04] hover:bg-black/[0.08] text-[12px] font-medium">
                                <Hash size={11} /> {r.tag} <span className="text-black/45">({r.count})</span>
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            <div className="px-4 lg:px-5 py-2 hairline-b flex items-center gap-1">
                {SORTS.map((s) => (
                    <button key={s.key} onClick={() => setSort(s.key)} className={`px-3 py-1 rounded-full text-[12px] font-medium ${sort === s.key ? "bg-black text-white" : "bg-black/[0.04] text-black/65 hover:bg-black/[0.08]"}`}>
                        {s.label}
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="p-12 text-center type-overline">a carregar…</div>
            ) : sorted.length === 0 ? (
                <div className="px-6 py-20 text-center anim-fade-up">
                    <div className="ring-silver w-20 h-20 rounded-full grid place-items-center mx-auto mb-6">
                        <Hash size={26} strokeWidth={1.4} className="text-black/70" />
                    </div>
                    <p className="type-overline mb-2">Sem posts</p>
                    <h3 className="font-display text-[19px] font-bold tracking-tight text-black">Sem publicações</h3>
                    <p className="text-black/55 text-sm mt-2">Nenhuma publicação com #{tag} ainda.</p>
                </div>
            ) : (
                sorted.map((p) => (
                    <PostCard key={p.id} post={p}
                        onChange={(np) => setPosts((prev) => prev.map((x) => (x.id === np.id ? np : x)))}
                        onDelete={(id) => setPosts((prev) => prev.filter((x) => x.id !== id))}
                    />
                ))
            )}
        </div>
    );
}

function StatBlock({ label, value, icon: Icon, hint, hintGood }) {
    return (
        <div className="card-lux p-3">
            <div className="flex items-center gap-1.5 mb-1">
                <Icon size={12} className="text-black/55" />
                <p className="type-overline">{label}</p>
            </div>
            <p className="font-display text-[22px] tracking-tight leading-none">{value}</p>
            {hint && (
                <p className={`text-[11px] font-mono mt-1 ${hintGood ? "text-emerald-700" : "text-rose-700"}`}>{hint}</p>
            )}
        </div>
    );
}
