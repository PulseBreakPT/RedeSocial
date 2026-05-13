import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Loader2, BookOpen, Plus, X, Search } from "lucide-react";
import { api, toastApiError } from "../lib/api";
import { Avatar } from "../components/Avatar";
import { PageHeader } from "../components/PageHeader";
import { PostCard } from "../components/PostCard";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";

export default function SeriesPage() {
    const { seriesId } = useParams();
    const { user } = useAuth();
    const [series, setSeries] = useState(null);
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [adder, setAdder] = useState(false);

    async function load() {
        setLoading(true);
        try {
            const [s, p] = await Promise.all([
                api.get(`/series/${seriesId}`),
                api.get(`/series/${seriesId}/posts`),
            ]);
            setSeries(s.data);
            setPosts(p.data || []);
        } catch (e) {
            toastApiError(e);
        } finally {
            setLoading(false);
        }
    }
    useEffect(() => { load(); }, [seriesId]);

    if (loading) return <div className="p-12 text-center text-sm font-mono text-black/50"><Loader2 size={14} className="animate-spin inline" /> A carregar…</div>;
    if (!series) return <div className="p-12 text-center">Série não encontrada.</div>;

    const isOwner = user?.id === series.owner?.id;

    return (
        <div className="max-w-2xl mx-auto px-4 py-6">
            <PageHeader
                title={`${series.cover_emoji || "📚"} ${series.title}`}
                subtitle={`por @${series.owner?.username} · ${series.posts_count || posts.length} posts`}
                action={
                    isOwner && (
                        <button
                            onClick={() => setAdder(true)}
                            className="px-3 py-1.5 rounded-full bg-black text-white text-xs font-mono hover:bg-black/85 flex items-center gap-1.5"
                            data-testid="series-add-post-btn"
                        >
                            <Plus size={12} /> Adicionar
                        </button>
                    )
                }
            />
            {series.description && <p className="text-sm font-mono text-black/65 my-4">{series.description}</p>}
            {posts.length === 0 ? (
                <div className="rounded-2xl border border-black/[0.08] bg-white p-8 text-center mt-4" data-testid="series-empty">
                    <BookOpen className="mx-auto text-black/30 mb-2" size={28} />
                    <h3 className="font-heading font-semibold mb-1">Série vazia</h3>
                    <p className="text-sm font-mono text-black/55">
                        {isOwner ? "Adiciona posts para começar." : "Esta série ainda não tem posts."}
                    </p>
                </div>
            ) : (
                <div className="space-y-2 mt-3">
                    {posts.map((p) => (
                        <PostCard key={p.id} post={p} onChange={load} clickable />
                    ))}
                </div>
            )}
            {adder && <AddPostModal seriesId={seriesId} ownerId={series.owner?.id} onClose={() => setAdder(false)} onAdded={load} />}
        </div>
    );
}

function AddPostModal({ seriesId, ownerId, onClose, onAdded }) {
    const [q, setQ] = useState("");
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        async function loadMyPosts() {
            setLoading(true);
            try {
                // Fetch owner posts
                const u = await api.get(`/users/me`);
                const r = await api.get(`/users/${u.data.username}/posts?tab=posts`);
                setPosts(r.data || []);
            } catch (e) {
                // silent
            } finally {
                setLoading(false);
            }
        }
        loadMyPosts();
    }, [ownerId]);

    async function add(postId) {
        try {
            await api.post(`/series/${seriesId}/posts`, { post_id: postId, action: "add" });
            toast.success("Post adicionado");
            onAdded && onAdded();
            onClose();
        } catch (e) {
            toastApiError(e);
        }
    }

    const filtered = posts.filter((p) =>
        !q.trim() || (p.content || "").toLowerCase().includes(q.toLowerCase())
    );

    return (
        <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center px-4" onClick={onClose}>
            <div className="bg-white rounded-2xl border border-black/10 w-full max-w-lg max-h-[80vh] flex flex-col p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-3">
                    <span className="font-heading font-semibold">Adicionar post à série</span>
                    <button onClick={onClose} className="text-black/40 hover:text-black"><X size={18} /></button>
                </div>
                <div className="relative mb-3">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/30" />
                    <input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Procurar nos teus posts…"
                        className="w-full pl-8 pr-3 py-2 rounded-lg border border-black/10 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-400"
                        data-testid="series-add-search"
                    />
                </div>
                {loading ? (
                    <div className="text-sm font-mono text-black/50 py-6 text-center"><Loader2 size={14} className="animate-spin inline" /></div>
                ) : (
                    <div className="overflow-y-auto space-y-1.5 flex-1">
                        {filtered.slice(0, 30).map((p) => (
                            <button
                                key={p.id}
                                onClick={() => add(p.id)}
                                className="w-full text-left p-2.5 rounded-lg border border-black/[0.06] hover:border-black/25 hover:bg-black/[0.02] transition"
                                data-testid={`series-add-post-${p.id}`}
                            >
                                <p className="text-xs text-black/80 line-clamp-2">{p.content || "(sem texto)"}</p>
                            </button>
                        ))}
                        {filtered.length === 0 && (
                            <div className="text-xs font-mono text-black/40 py-4 text-center">Sem posts.</div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
