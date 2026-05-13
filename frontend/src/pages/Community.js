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
        return <div className="p-12 text-center type-overline">a carregar…</div>;
    }

    return (
        <div data-testid="community-page">
            <PageHeader
                title={community.name}
                subtitle={`${community.members_count} membros`}
                back
                testid="community-header"
            />

            <div className="relative h-32 lg:h-44 overflow-hidden grid place-items-center">
                <div className="absolute inset-0 silver-grad" />
                <div
                    className="absolute inset-0 opacity-60 mix-blend-multiply"
                    style={{
                        background:
                            "radial-gradient(circle at 30% 35%, rgba(106,168,230,0.16), transparent 55%), radial-gradient(circle at 75% 70%, rgba(232,93,108,0.10), transparent 55%)",
                    }}
                />
                <Users size={38} strokeWidth={1.3} className="relative text-black/45" />
            </div>

            <div className="px-4 lg:px-6 py-5 hairline-b">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                        <p className="type-overline mb-1">{community.members_count} membros</p>
                        <h2 className="font-display text-[30px] lg:text-[34px] tracking-tight leading-none truncate text-black">{community.name}</h2>
                        <p className="font-mono text-[11px] text-black/45 mt-2">/c/{community.slug}</p>
                        {community.description && <p className="mt-4 text-[15px] text-black/75 leading-relaxed max-w-2xl">{community.description}</p>}
                    </div>
                    <button
                        onClick={join}
                        data-testid="community-join-btn"
                        className={`text-[11px] font-heading font-medium tracking-tight rounded-full px-5 py-2.5 transition active:scale-95 flex-shrink-0 ${
                            community.joined ? "btn-silver" : "btn-obsidian"
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
