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
            <PageHeader title="Guardados" subtitle="Posts que guardaste" back testid="bookmarks-header" />
            {loading ? (
                <PostSkeletonList count={3} />
            ) : posts.length === 0 ? (
                <div className="px-6 py-20 text-center anim-fade-up">
                    <div className="ring-silver w-20 h-20 rounded-full grid place-items-center mx-auto mb-6">
                        <Bookmark size={26} strokeWidth={1.4} className="text-black/70" />
                    </div>
                    <p className="type-overline mb-2">Sem nada guardado</p>
                    <h3 className="font-display text-[19px] font-bold tracking-tight text-black">Nada guardado ainda</h3>
                    <p className="text-black/55 text-sm mt-2">Toca no marcador de uma publicação para guardá-la.</p>
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
