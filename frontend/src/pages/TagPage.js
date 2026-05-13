import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Hash } from "lucide-react";
import { api } from "../lib/api";
import { PostCard } from "../components/PostCard";
import { PageHeader } from "../components/PageHeader";

export default function TagPage() {
    const { tag } = useParams();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        setLoading(true);
        api.get(`/posts/tag/${tag}`).then((r) => {
            setPosts(r.data);
            setLoading(false);
        });
    }, [tag]);

    return (
        <div data-testid="tag-page">
            <PageHeader
                title={
                    <span className="inline-flex items-center gap-1.5">
                        <Hash size={16} strokeWidth={1.6} className="text-black/55" /> {tag}
                    </span>
                }
                subtitle={`${posts.length} ${posts.length === 1 ? "publicação" : "publicações"}`}
                back
                testid="tag-header"
            />
            {loading ? (
                <div className="p-12 text-center type-overline">a carregar…</div>
            ) : posts.length === 0 ? (
                <div className="px-6 py-20 text-center anim-fade-up">
                    <div className="ring-silver w-20 h-20 rounded-full grid place-items-center mx-auto mb-6">
                        <Hash size={26} strokeWidth={1.4} className="text-black/70" />
                    </div>
                    <p className="type-overline mb-2">Sem posts</p>
                    <h3 className="font-display text-[19px] font-bold tracking-tight text-black">Sem publicações</h3>
                    <p className="text-black/55 text-sm mt-2">Nenhuma publicação com #{tag} ainda.</p>
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
