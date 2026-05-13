import { useEffect, useState } from "react";
import { Bookmark } from "lucide-react";
import { PostCard } from "../components/PostCard";
import { PostSkeletonList } from "../components/Skeleton";
import { PageHeader } from "../components/PageHeader";
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
            <PageHeader title="Guardados" subtitle="o que guardaste" back testid="bookmarks-header" />
            {loading ? (
                <PostSkeletonList count={3} />
            ) : posts.length === 0 ? (
                <div className="px-6 py-16 text-center">
                    <div className="w-20 h-20 rounded-full bg-accent-vermillion/10 grid place-items-center mx-auto mb-5 border border-accent-vermillion/30">
                        <Bookmark size={28} className="text-accent-vermillion" />
                    </div>
                    <p className="text-zinc-100 font-heading text-lg tracking-tight">Nada guardado ainda</p>
                    <p className="text-zinc-500 text-sm mt-1">Toca no marcador de uma publicação para guardá-la.</p>
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
