import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Users, BarChart3, Info, Crown, TrendingUp, Share2 } from "lucide-react";
import { api, formatApiError } from "../lib/api";
import { PostCard } from "../components/PostCard";
import { Composer } from "../components/Composer";
import { PageHeader } from "../components/PageHeader";
import { Avatar } from "../components/Avatar";
import { COMMUNITY_CATEGORIES, categoryLabel } from "../lib/portuguese";
import { toast } from "sonner";

const TABS = [
    { key: "posts", label: "Posts" },
    { key: "members", label: "Membros" },
    { key: "stats", label: "Atividade" },
    { key: "about", label: "Sobre" },
];

export default function Community() {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [community, setCommunity] = useState(null);
    const [posts, setPosts] = useState([]);
    const [members, setMembers] = useState([]);
    const [stats, setStats] = useState(null);
    const [tab, setTab] = useState("posts");
    const [loading, setLoading] = useState(true);

    const loadCore = async () => {
        try {
            const [c, p] = await Promise.all([
                api.get(`/communities/${slug}`),
                api.get(`/communities/${slug}/posts`),
            ]);
            setCommunity(c.data);
            setPosts(p.data);
        } catch (e) { toast.error(formatApiError(e)); navigate("/communities"); }
        finally { setLoading(false); }
    };
    const loadMembers = async () => { try { const { data } = await api.get(`/communities/${slug}/members`); setMembers(data); } catch {} };
    const loadStats = async () => { try { const { data } = await api.get(`/communities/${slug}/stats`); setStats(data); } catch {} };

    useEffect(() => { setLoading(true); loadCore(); /* eslint-disable-next-line */ }, [slug]);
    useEffect(() => {
        if (tab === "members" && members.length === 0) loadMembers();
        if (tab === "stats" && !stats) loadStats();
        // eslint-disable-next-line
    }, [tab]);

    const join = async () => { try { await api.post(`/communities/${slug}/join`); loadCore(); } catch (e) { toast.error(formatApiError(e)); } };
    const share = async () => {
        try { await navigator.clipboard.writeText(`${window.location.origin}/c/${slug}`); toast.success("Link copiado"); }
        catch { toast.error("Não consegui copiar"); }
    };

    if (loading || !community) return <div className="p-12 text-center type-overline">a carregar…</div>;

    return (
        <div data-testid="community-page">
            <PageHeader title={community.name} subtitle={`${community.members_count} membros · ${categoryLabel(COMMUNITY_CATEGORIES, community.category)}`} back testid="community-header" />

            <div className="relative h-32 lg:h-44 overflow-hidden grid place-items-center">
                <div className="absolute inset-0 silver-grad" />
                <div className="absolute inset-0 opacity-60 mix-blend-multiply" style={{ background: "radial-gradient(circle at 30% 35%, rgba(106,168,230,0.16), transparent 55%), radial-gradient(circle at 75% 70%, rgba(232,93,108,0.10), transparent 55%)" }} />
                <Users size={38} strokeWidth={1.3} className="relative text-black/45" />
            </div>

            <div className="px-4 lg:px-6 py-5 hairline-b">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                        <p className="type-overline mb-1">{community.members_count} membros · {categoryLabel(COMMUNITY_CATEGORIES, community.category)}</p>
                        <h2 className="font-display text-[30px] lg:text-[34px] tracking-tight leading-none truncate text-black">{community.name}</h2>
                        <p className="font-mono text-[11px] text-black/45 mt-2">/c/{community.slug}</p>
                        {community.description && <p className="mt-4 text-[15px] text-black/75 leading-relaxed max-w-2xl">{community.description}</p>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <button onClick={share} title="Partilhar" data-testid="community-share-btn" className="w-9 h-9 grid place-items-center rounded-full border border-black/[0.10] hover:bg-black/[0.04] transition">
                            <Share2 size={14} />
                        </button>
                        <button onClick={join} data-testid="community-join-btn" className={`text-[11px] font-heading font-medium tracking-tight rounded-full px-5 py-2.5 transition active:scale-95 ${community.joined ? "chip-on" : "btn-obsidian"}`}>
                            {community.joined ? "Sair" : "Entrar"}
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-4 hairline-t hairline-b sticky top-[var(--mobile-topbar-h)] lg:top-[57px] z-20 glass">
                {TABS.map((t) => (
                    <button key={t.key} onClick={() => setTab(t.key)} data-testid={`community-tab-${t.key}`} className={`py-3 font-heading text-[12px] tracking-tight transition relative ${tab === t.key ? "text-black font-medium" : "text-black/45 hover:text-black/70"}`}>
                        {t.label}
                        {tab === t.key && (<span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-[2px] bg-black rounded-full" />)}
                    </button>
                ))}
            </div>

            {tab === "posts" && (
                <>
                    {community.joined ? (
                        <Composer onPosted={(p) => setPosts((prev) => [p, ...prev])} communityId={community.id} />
                    ) : (
                        <div className="p-6 text-center hairline-b">
                            <p className="type-overline mb-1">Restrito a membros</p>
                            <p className="text-black/60 font-mono text-sm">Entra na comunidade para publicar.</p>
                        </div>
                    )}
                    {posts.length === 0 ? (
                        <div className="p-14 text-center">
                            <p className="type-overline mb-2">Sem posts</p>
                            <p className="text-black/55 font-mono text-sm">Sem publicações nesta comunidade ainda.</p>
                        </div>
                    ) : (
                        posts.map((p) => (
                            <PostCard key={p.id} post={p}
                                onChange={(np) => setPosts((prev) => prev.map((x) => (x.id === np.id ? np : x)))}
                                onDelete={(id) => setPosts((prev) => prev.filter((x) => x.id !== id))}
                            />
                        ))
                    )}
                </>
            )}

            {tab === "members" && (
                <>
                    {members.length === 0 ? (
                        <div className="p-14 text-center"><p className="type-overline mb-2">a carregar</p></div>
                    ) : (
                        members.map((u, i) => (
                            <Link key={u.id} to={`/u/${u.username}`} className="flex items-center gap-3 px-4 lg:px-5 py-3.5 hairline-b hover:bg-black/[0.015] transition">
                                <span className="w-7 text-right text-[16px] font-display text-black/25">{i + 1}</span>
                                <Avatar user={u} size={42} />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        <span className="font-medium text-[14px] truncate">{u.name || u.username}</span>
                                        {u.is_owner && (<span className="inline-flex items-center gap-0.5 text-amber-500 text-[10px] font-mono uppercase"><Crown size={11} /> dono</span>)}
                                    </div>
                                    <div className="text-[12px] text-black/55">@{u.username} · <span className="font-mono text-[10px] bg-black/[0.05] px-1.5 py-0.5 rounded">{u.posts_in_community}p · {u.likes_in_community}♥</span></div>
                                </div>
                            </Link>
                        ))
                    )}
                </>
            )}

            {tab === "stats" && (
                stats ? (
                    <div className="p-4 lg:p-5 space-y-5">
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            <Stat label="Membros" value={stats.members_count} />
                            <Stat label="Posts total" value={stats.total_posts} />
                            <Stat label="Esta semana" value={`${stats.posts_week}p`} hint={stats.velocity >= 0 ? `↑${stats.velocity}%` : `↓${Math.abs(stats.velocity)}%`} hintGood={stats.velocity >= 0} />
                            <Stat label="Gostos semana" value={stats.likes_week} />
                        </div>
                        <div className="card-lux p-4">
                            <div className="flex items-center justify-between mb-3">
                                <span className="type-overline">Atividade (últimos 7 dias)</span>
                                <span className="text-[11px] text-black/45"><BarChart3 size={11} className="inline" /> {stats.unique_authors_week} autores</span>
                            </div>
                            <div className="flex items-end gap-1.5 h-24">
                                {stats.by_day.map((d) => {
                                    const max = Math.max(...stats.by_day.map((x) => x.count), 1);
                                    return (
                                        <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                                            <div className="w-full bg-black/85 rounded-sm transition-all" style={{ height: `${(d.count / max) * 100}%`, minHeight: 2 }} />
                                            <span className="text-[9px] text-black/45 font-mono">{new Date(d.date).toLocaleDateString("pt-PT", { weekday: "short" }).slice(0, 3)}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="p-14 text-center type-overline">a carregar…</div>
                )
            )}

            {tab === "about" && (
                <div className="p-5 lg:p-6 space-y-4 max-w-2xl">
                    <div>
                        <p className="type-overline mb-1">Sobre</p>
                        <p className="text-[15px] text-black/80 leading-relaxed">{community.description || "Sem descrição."}</p>
                    </div>
                    <div className="card-lux p-4 space-y-2">
                        <p className="type-overline">Regras da comunidade</p>
                        <ul className="list-decimal list-inside space-y-1 text-[14px] text-black/75">
                            <li>Respeita os membros — nada de insultos.</li>
                            <li>Só conteúdo relevante para esta comunidade.</li>
                            <li>Sem spam, sem auto-promoção excessiva.</li>
                            <li>Em português (PT) sempre que possível.</li>
                        </ul>
                    </div>
                    <div className="text-[12px] text-black/55 font-mono">criada em {new Date(community.created_at).toLocaleDateString("pt-PT")}</div>
                </div>
            )}
        </div>
    );
}

function Stat({ label, value, hint, hintGood }) {
    return (
        <div className="card-lux p-3">
            <p className="type-overline">{label}</p>
            <p className="font-display text-[24px] tracking-tight leading-none mt-1">{value}</p>
            {hint && (
                <p className={`text-[11px] font-mono mt-1 inline-flex items-center gap-0.5 ${hintGood ? "text-emerald-700" : "text-rose-700"}`}>
                    {hintGood ? <TrendingUp size={10} /> : null} {hint}
                </p>
            )}
        </div>
    );
}
