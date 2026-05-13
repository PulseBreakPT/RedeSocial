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
                    <span className="inline-flex items-center gap-1">
                        <Hash size={18} className="text-accent-vermillion" /> {tag}
                    </span>
                }
                subtitle={`${posts.length} publicações`}
                back
                testid="tag-header"
            />
            {loading ? (
                <div className="p-10 text-center text-zinc-500 font-mono text-sm">a carregar...</div>
            ) : posts.length === 0 ? (
                <div className="px-6 py-16 text-center">
                    <div className="w-20 h-20 rounded-full bg-accent-vermillion/10 grid place-items-center mx-auto mb-5 border border-accent-vermillion/30">
                        <Hash size={28} className="text-accent-vermillion" />
                    </div>
                    <p className="text-zinc-100 font-heading text-lg tracking-tight">Sem publicações</p>
                    <p className="text-zinc-500 text-sm mt-1">Nenhuma publicação com #{tag} ainda.</p>
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
