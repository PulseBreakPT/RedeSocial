import { useEffect, useState } from "react";
import { PostCard } from "../components/PostCard";
import { PostSkeletonList } from "../components/Skeleton";
import { api } from "../lib/api";
import { useLiveTime } from "../hooks/useLiveTime";

export default function Bookmarks() {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    useLiveTime(30000);

    useEffect(() => {
        api.get("/posts/bookmarks").then((r) => {
            setPosts(r.data);
            setLoading(false);
        });
    }, []);

    return (
        <div data-testid="bookmarks-page">
            <div className="sticky top-0 z-30 glass border-b border-zinc-900 px-5 py-4">
                <h1 className="font-heading text-xl font-bold tracking-tight">Guardados</h1>
                <p className="font-mono text-xs text-zinc-500 mt-0.5">o que guardaste</p>
            </div>
            {loading ? (
                <PostSkeletonList count={3} />
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
