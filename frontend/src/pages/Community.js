import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Users } from "lucide-react";
import { api, formatApiError } from "../lib/api";
import { PostCard } from "../components/PostCard";
import { Composer } from "../components/Composer";
import { toast } from "sonner";

export default function Community() {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [community, setCommunity] = useState(null);
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);

    const load = async () => {
        try {
            const [c, p] = await Promise.all([
                api.get(`/communities/${slug}`),
                api.get(`/communities/${slug}/posts`),
            ]);
            setCommunity(c.data);
            setPosts(p.data);
        } catch (e) {
            toast.error(formatApiError(e));
            navigate("/communities");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line
    }, [slug]);

    const join = async () => {
        try {
            await api.post(`/communities/${slug}/join`);
            load();
        } catch (e) {
            toast.error(formatApiError(e));
        }
    };

    if (loading || !community) {
        return <div className="p-10 text-center text-zinc-500 font-mono text-sm">a carregar...</div>;
    }

    return (
        <div data-testid="community-page">
            <div className="sticky top-0 z-30 glass border-b border-zinc-900 px-5 py-4 flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="p-1 hover:bg-white/5 rounded-full" data-testid="back-btn">
                    <ArrowLeft size={18} />
                </button>
                <div>
                    <h1 className="font-heading text-xl font-bold tracking-tight">{community.name}</h1>
                    <p className="font-mono text-xs text-zinc-500 mt-0.5">{community.members_count} membros</p>
                </div>
            </div>

            <div className="relative h-40 bg-gradient-to-br from-zinc-900 via-zinc-800 to-[#8B5CF6]/30 grid place-items-center">
                <Users size={48} className="text-accent-vermillion/50" />
            </div>

            <div className="px-5 py-5 border-b border-zinc-900">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                        <h2 className="font-heading text-2xl font-bold">{community.name}</h2>
                        <p className="font-mono text-xs text-zinc-500 mt-1">/c/{community.slug}</p>
                        {community.description && <p className="mt-3 text-zinc-200">{community.description}</p>}
                    </div>
                    <button
                        onClick={join}
                        data-testid="community-join-btn"
                        className={`text-xs font-heading font-semibold uppercase tracking-wide rounded-full px-5 py-2 transition active:scale-95 ${
                            community.joined
                                ? "border border-zinc-700 hover:bg-accent-vermillion/10 hover:text-accent-vermillion"
                                : "bg-white text-black hover:bg-zinc-200"
                        }`}
                    >
                        {community.joined ? "Sair" : "Entrar"}
                    </button>
                </div>
            </div>

            {community.joined ? (
                <Composer
                    onPosted={(p) => setPosts((prev) => [p, ...prev])}
                    communityId={community.id}
                />
            ) : (
                <div className="p-5 text-center text-zinc-500 font-mono text-sm border-b border-zinc-900">
                    Entre na comunidade para publicar
                </div>
            )}

            {posts.length === 0 ? (
                <div className="p-10 text-center text-zinc-500 font-mono text-sm">Sem publicações nesta comunidade ainda.</div>
            ) : (
                posts.map((p) => (
                    <PostCard
                        key={p.id}
                        post={p}
                        onChange={(np) => setPosts((prev) => prev.map((x) => (x.id === np.id ? np : x)))}
                        onDelete={(id) => setPosts((prev) => prev.filter((x) => x.id !== id))}
                    />
                ))
            )}
        </div>
    );
}
