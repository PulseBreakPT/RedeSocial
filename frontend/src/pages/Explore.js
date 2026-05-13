import { useEffect, useState } from "react";
import { PostCard } from "../components/PostCard";
import { PostSkeletonList } from "../components/Skeleton";
import { PageHeader } from "../components/PageHeader";
import { api } from "../lib/api";
import { useLiveTime } from "../hooks/useLiveTime";
import { Compass } from "lucide-react";

export default function Explore() {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    useLiveTime(30000);

    useEffect(() => {
        api.get("/posts/explore").then((r) => {
            setPosts(r.data);
            setLoading(false);
        });
    }, []);

    return (
        <div data-testid="explore-page">
            <PageHeader title="Explorar" subtitle="tudo o que está rolando" testid="explore-header" />
            {loading ? (
                <PostSkeletonList count={4} />
            ) : posts.length === 0 ? (
                <div className="px-6 py-16 text-center">
                    <div className="w-20 h-20 rounded-full bg-accent-vermillion/10 grid place-items-center mx-auto mb-5 border border-accent-vermillion/30">
                        <Compass size={28} className="text-accent-vermillion" />
                    </div>
                    <p className="text-zinc-100 font-heading text-lg tracking-tight">Sem publicações</p>
                    <p className="text-zinc-500 text-sm mt-1">Volta mais tarde para explorar.</p>
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
