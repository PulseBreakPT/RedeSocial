import { useEffect, useState } from "react";
import { PostCard } from "../components/PostCard";
import { api } from "../lib/api";

export default function Bookmarks() {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get("/posts/bookmarks").then((r) => {
            setPosts(r.data);
            setLoading(false);
        });
    }, []);

    return (
        <div data-testid="bookmarks-page">
            <div className="sticky top-0 z-30 glass border-b border-zinc-900 px-5 py-4">
                <h1 className="font-heading text-xl font-bold tracking-tight">Salvos</h1>
                <p className="font-mono text-xs text-zinc-500 mt-0.5">o que você guardou</p>
            </div>
            {loading ? (
                <div className="p-10 text-center text-zinc-500 font-mono text-sm">carregando...</div>
            ) : posts.length === 0 ? (
                <div className="p-10 text-center text-zinc-500 font-mono text-sm">Nada salvo ainda.</div>
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
