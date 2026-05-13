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
            <PageHeader title="Explorar" subtitle="Posts em destaque" testid="explore-header" />
            {loading ? (
                <PostSkeletonList count={4} />
            ) : posts.length === 0 ? (
                <div className="px-6 py-20 text-center anim-fade-up">
                    <div className="ring-silver w-20 h-20 rounded-full grid place-items-center mx-auto mb-6">
                        <Compass size={26} strokeWidth={1.4} className="text-black/70" />
                    </div>
                    <p className="type-overline mb-2">Nada por aqui</p>
                    <h3 className="font-display text-[19px] font-bold tracking-tight text-black">Sem publicações</h3>
                    <p className="text-black/55 text-sm mt-2">Volta mais tarde para explorar.</p>
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
