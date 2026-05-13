import { useEffect, useRef, useState, useCallback } from "react";
import { RefreshCw, Sparkles } from "lucide-react";
import { Composer } from "../components/Composer";
import { PostCard } from "../components/PostCard";
import { StoriesBar } from "../components/StoriesBar";
import { PostSkeletonList } from "../components/Skeleton";
import { useLiveTime } from "../hooks/useLiveTime";
import { api } from "../lib/api";

export default function Feed() {
    const [tab, setTab] = useState("following");
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [newCount, setNewCount] = useState(0);
    const knownIdsRef = useRef(new Set());
    useLiveTime(30000);

    const load = useCallback(
        async (which = tab, showSkeleton = true) => {
            if (showSkeleton) setLoading(true);
            try {
                const url = which === "following" ? "/posts/feed" : "/posts/explore";
                const { data } = await api.get(url);
                setPosts(data);
                knownIdsRef.current = new Set(data.map((p) => p.id));
                setNewCount(0);
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        [tab],
    );

    useEffect(() => {
        load(tab);
    }, [load, tab]);

    // Background poll for new posts every 30s — never disrupt scroll, just show pill
    useEffect(() => {
        const id = setInterval(async () => {
            try {
                const url = tab === "following" ? "/posts/feed" : "/posts/explore";
                const { data } = await api.get(url);
                let n = 0;
                for (const p of data) if (!knownIdsRef.current.has(p.id)) n++;
                if (n > 0) setNewCount(n);
            } catch {}
        }, 30000);
        return () => clearInterval(id);
    }, [tab]);

    const refresh = () => {
        setRefreshing(true);
        load(tab, false);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    return (
        <div data-testid="feed-page">
            <div className="sticky top-0 z-30 glass border-b border-zinc-900">
                <div className="px-5 py-4 flex items-center justify-between">
                    <h1 className="font-heading text-xl font-bold tracking-tight">Início</h1>
                    <button
                        onClick={refresh}
                        data-testid="feed-refresh"
                        className="p-2 rounded-full text-zinc-400 hover:text-accent-vermillion hover:bg-white/5 transition"
                        title="Atualizar"
                    >
                        <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
                    </button>
                </div>
                <div className="grid grid-cols-2">
                    <button
                        onClick={() => setTab("following")}
                        data-testid="tab-following"
                        className={`py-3 font-heading font-semibold text-sm transition relative ${
                            tab === "following" ? "text-white" : "text-zinc-500 hover:bg-white/[0.02]"
                        }`}
                    >
                        Seguindo
                        {tab === "following" && (
                            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-accent-vermillion rounded-full" />
                        )}
                    </button>
                    <button
                        onClick={() => setTab("foryou")}
                        data-testid="tab-foryou"
                        className={`py-3 font-heading font-semibold text-sm transition relative ${
                            tab === "foryou" ? "text-white" : "text-zinc-500 hover:bg-white/[0.02]"
                        }`}
                    >
                        Para você
                        {tab === "foryou" && (
                            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-accent-vermillion rounded-full" />
                        )}
                    </button>
                </div>
            </div>

            {newCount > 0 && (
                <div className="sticky top-[112px] z-20 flex justify-center pt-3">
                    <button
                        onClick={refresh}
                        data-testid="new-posts-pill"
                        className="bg-accent-vermillion text-white font-heading font-semibold text-xs uppercase tracking-wide px-5 py-2 rounded-full hover:bg-[#FF7A50] active:scale-95 flex items-center gap-1.5 anim-fade-up glow-vermillion"
                    >
                        <Sparkles size={12} />
                        {newCount === 1 ? "1 nova publicação" : `${newCount} novas publicações`}
                    </button>
                </div>
            )}

            <StoriesBar />
            <Composer onPosted={(p) => setPosts((prev) => [p, ...prev])} />

            {loading ? (
                <PostSkeletonList count={5} />
            ) : posts.length === 0 ? (
                <div className="p-10 text-center">
                    <div className="w-16 h-16 rounded-full bg-accent-vermillion/10 grid place-items-center mx-auto mb-4">
                        <Sparkles size={28} className="text-accent-vermillion" />
                    </div>
                    <p className="text-zinc-300 font-heading text-lg">
                        {tab === "following" ? "Seu feed está vazio." : "Nenhuma publicação ainda."}
                    </p>
                    <p className="text-zinc-600 font-mono text-sm mt-2">
                        {tab === "following"
                            ? "Siga pessoas ou troque para Para você"
                            : "Seja o primeiro a publicar algo!"}
                    </p>
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
