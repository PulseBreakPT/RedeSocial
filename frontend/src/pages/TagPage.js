import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Hash } from "lucide-react";
import { api } from "../lib/api";
import { PostCard } from "../components/PostCard";

export default function TagPage() {
    const { tag } = useParams();
    const navigate = useNavigate();
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
            <div className="sticky top-0 z-30 glass border-b border-zinc-900 px-5 py-4 flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="p-1 hover:bg-white/5 rounded-full">
                    <ArrowLeft size={18} />
                </button>
                <div>
                    <h1 className="font-heading text-xl font-bold tracking-tight flex items-center gap-1">
                        <Hash size={18} className="text-accent-vermillion" /> {tag}
                    </h1>
                    <p className="font-mono text-xs text-zinc-500 mt-0.5">{posts.length} publicações</p>
                </div>
            </div>
            {loading ? (
                <div className="p-10 text-center text-zinc-500 font-mono text-sm">carregando...</div>
            ) : posts.length === 0 ? (
                <div className="p-10 text-center text-zinc-500 font-mono text-sm">
                    Nenhuma publicação com <span className="text-accent-vermillion">#{tag}</span> ainda.
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
