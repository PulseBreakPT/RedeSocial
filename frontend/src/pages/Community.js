import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Users } from "lucide-react";
import { api, formatApiError } from "../lib/api";
import { PostCard } from "../components/PostCard";
import { Composer } from "../components/Composer";
import { PageHeader } from "../components/PageHeader";
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
            <PageHeader
                title={community.name}
                subtitle={`${community.members_count} membros`}
                back
                testid="community-header"
            />

            <div className="relative h-28 lg:h-40 bg-gradient-to-br from-[#f4f4f8] via-[#e0e0e6] to-[#9a9aa3]/40 grid place-items-center">
                <Users size={42} className="text-accent-vermillion/50" />
            </div>

            <div className="px-4 lg:px-5 py-4 lg:py-5 border-b border-white/[0.05]">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                        <h2 className="font-heading text-xl lg:text-2xl font-bold truncate">{community.name}</h2>
                        <p className="font-mono text-[11px] text-zinc-500 mt-1">/c/{community.slug}</p>
                        {community.description && <p className="mt-3 text-sm lg:text-base text-zinc-200">{community.description}</p>}
                    </div>
                    <button
                        onClick={join}
                        data-testid="community-join-btn"
                        className={`text-[11px] font-heading font-semibold uppercase tracking-wide rounded-full px-4 lg:px-5 py-2 transition active:scale-95 flex-shrink-0 ${
                            community.joined
                                ? "border border-white/[0.12] hover:bg-accent-vermillion/10 hover:text-accent-vermillion"
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
                <div className="p-5 text-center text-zinc-500 font-mono text-sm border-b border-white/[0.05]">
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
