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

    useEffect(() => { load(tab); }, [load, tab]);

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
            {/* Premium feed header — only on desktop because mobile has TopBar */}
            <div className="hidden lg:block sticky top-0 z-30 glass border-b border-white/[0.05]">
                <div className="px-5 py-4 flex items-center justify-between">
                    <div>
                        <h1 className="font-heading text-[22px] font-bold tracking-tight">Início</h1>
                        <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-500 mt-0.5">o que está rolando</p>
                    </div>
                    <button
                        onClick={refresh}
                        data-testid="feed-refresh"
                        className="w-9 h-9 rounded-full grid place-items-center text-zinc-400 hover:text-accent-vermillion hover:bg-white/[0.06] tap-shrink transition"
                        title="Atualizar"
                    >
                        <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
                    </button>
                </div>
            </div>

            <div className="sticky top-[57px] lg:top-[73px] z-20 glass border-b border-white/[0.05]">
                <div className="grid grid-cols-2">
                    <button
                        onClick={() => setTab("following")}
                        data-testid="tab-following"
                        className={`py-3 font-heading font-semibold text-[14px] tracking-tight transition relative tap-shrink ${
                            tab === "following" ? "text-white" : "text-zinc-500 hover:bg-white/[0.02]"
                        }`}
                    >
                        Seguindo
                        {tab === "following" && (
                            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-[3px] bg-accent-vermillion rounded-full" />
                        )}
                    </button>
                    <button
                        onClick={() => setTab("foryou")}
                        data-testid="tab-foryou"
                        className={`py-3 font-heading font-semibold text-[14px] tracking-tight transition relative tap-shrink ${
                            tab === "foryou" ? "text-white" : "text-zinc-500 hover:bg-white/[0.02]"
                        }`}
                    >
                        Para você
                        {tab === "foryou" && (
                            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-[3px] bg-accent-vermillion rounded-full" />
                        )}
                    </button>
                </div>
            </div>

            {newCount > 0 && (
                <div className="sticky top-[105px] lg:top-[121px] z-20 flex justify-center pt-3">
                    <button
                        onClick={refresh}
                        data-testid="new-posts-pill"
                        className="bg-accent-vermillion text-white font-heading font-semibold text-xs tracking-tight px-4 py-2 rounded-full hover:bg-[#A78BFA] tap-shrink flex items-center gap-1.5 anim-fade-up glow-vermillion"
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
                <div className="p-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-accent-vermillion/10 grid place-items-center mx-auto mb-5 border border-accent-vermillion/30">
                        <Sparkles size={26} className="text-accent-vermillion" />
                    </div>
                    <p className="text-zinc-200 font-heading text-xl tracking-tight">
                        {tab === "following" ? "Seu feed está calmo." : "Seja o primeiro."}
                    </p>
                    <p className="text-zinc-500 text-sm mt-2 max-w-xs mx-auto">
                        {tab === "following"
                            ? "Siga pessoas ou troque para Para você e descubra novidades."
                            : "Nenhuma publicação ainda — comece a conversa."}
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
