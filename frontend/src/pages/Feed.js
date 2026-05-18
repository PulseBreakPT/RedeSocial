import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { RefreshCw, Sparkles } from "lucide-react";
import { PostCard } from "../components/PostCard";
import { StoriesBar } from "../components/StoriesBar";
import { MobileHomeHero } from "../components/MobileHomeHero";
import { PostSkeletonList } from "../components/Skeleton";
import { useLiveTime } from "../hooks/useLiveTime";
import { usePullToRefresh } from "../hooks/usePullToRefresh";
import { useWsMessages, useWsState } from "../components/WebSocketProvider";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { SmartTodayBanner } from "../components/SmartTodayBanner";

export default function Feed() {
    const { user } = useAuth();
    const [tab, setTab] = useState("following");
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [newCount, setNewCount] = useState(0);
    const knownIdsRef = useRef(new Set());
    useLiveTime(30000);

    const greeting = useMemo(() => {
        const h = new Date().getHours();
        if (h < 6)  return "Boa madrugada";
        if (h < 13) return "Bom dia";
        if (h < 20) return "Boa tarde";
        return "Boa noite";
    }, []);
    const firstName = (user?.name || user?.username || "").split(" ")[0] || "";

    const load = useCallback(
        async (which = tab, showSkeleton = true) => {
            if (showSkeleton) setLoading(true);
            try {
                const params = new URLSearchParams();
                params.set("sort", "recent");
                // V2: For You uses the new ranking engine, Following stays chronological
                let url;
                if (which === "foryou") {
                    url = `/feed/v2`;
                } else if (which === "following") {
                    url = `/posts/feed?${params}`;
                } else {
                    url = `/posts/explore?${params}`;
                }
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

    // B-040 — Realtime: when WS is live, rely on `new_post` broadcasts;
    // fall back to polling if WS goes offline.
    const wsState = useWsState();
    const pendingIdsRef = useRef(new Set());
    const handleWs = useCallback((evt) => {
        if (!evt || typeof evt !== "object") return;
        if (evt.type !== "activity" || evt.event !== "new_post") return;
        const p = evt.payload || {};
        const pid = p.post_id || p.id;
        if (!pid) return;
        if (knownIdsRef.current.has(pid) || pendingIdsRef.current.has(pid)) return;
        pendingIdsRef.current.add(pid);
        setNewCount((n) => n + 1);
    }, []);
    useWsMessages(handleWs);

    useEffect(() => {
        // Only poll when WS is offline/reconnecting (graceful fallback)
        if (wsState === "live") return;
        const id = setInterval(async () => {
            try {
                const params = new URLSearchParams();
                params.set("sort", "recent");
                const url = tab === "following" ? `/posts/feed?${params}` : `/posts/explore?${params}`;
                const { data } = await api.get(url);
                let n = 0;
                for (const p of data) if (!knownIdsRef.current.has(p.id)) n++;
                if (n > 0) setNewCount(n);
            } catch {}
        }, 30000);
        return () => clearInterval(id);
    }, [tab, wsState]);

    const refresh = useCallback(async () => {
        setRefreshing(true);
        pendingIdsRef.current = new Set();
        await load(tab, false);
        window.scrollTo({ top: 0, behavior: "smooth" });
    }, [load, tab]);

    const { pull, refreshing: ptrRefreshing, threshold } = usePullToRefresh(refresh);
    const showPtr = pull > 4 || ptrRefreshing;
    const ptrProgress = Math.min(1, pull / threshold);

    return (
        <div data-testid="feed-page">
            <div
                className="ptr-indicator lg:hidden"
                style={{ height: ptrRefreshing ? 48 : pull }}
                aria-hidden
            >
                {showPtr && (
                    <RefreshCw
                        size={20}
                        className={`text-black/60 ${ptrRefreshing ? "ptr-spin" : ""}`}
                        style={{
                            transform: ptrRefreshing ? "none" : `rotate(${ptrProgress * 270}deg)`,
                            opacity: 0.3 + ptrProgress * 0.7,
                        }}
                    />
                )}
            </div>

            <div className="hidden lg:block sticky top-0 z-30 glass border-b border-black/[0.06]">
                <div className="px-6 pt-5 pb-3 flex items-end justify-between gap-4">
                    <div className="min-w-0">
                        <p className="type-overline mb-1 inline-flex items-center gap-1.5 text-black/50">
                            <span className="live-dot" /> ao vivo
                        </p>
                        <h1 className="font-display text-[26px] font-bold tracking-tight leading-[1.05] text-black">
                            {greeting}{firstName ? `, ${firstName}` : ""}.
                        </h1>
                        <p className="text-[13px] text-black/55 mt-1 font-medium tracking-tight">
                            O que se passa em Portugal agora.
                        </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                        <button
                            onClick={refresh}
                            data-testid="feed-refresh"
                            className="w-9 h-9 rounded-full grid place-items-center text-black/70 hover:text-black hover:bg-black/[0.05] tap-shrink transition border border-black/[0.06]"
                            title="Atualizar"
                        >
                            <RefreshCw size={15} strokeWidth={1.8} className={refreshing ? "animate-spin" : ""} />
                        </button>
                    </div>
                </div>

                {/* Tabs — gradient underline */}
                <div className="grid grid-cols-2 px-3">
                    <button
                        onClick={() => setTab("following")}
                        data-testid="tab-following"
                        className={`py-3 font-heading text-[14px] tracking-tight transition relative active:scale-[0.98] ${tab === "following" ? "text-grad-active font-semibold" : "text-black/65 hover:text-black hover:bg-black/[0.03] rounded-lg"}`}
                    >
                        Seguindo
                        {tab === "following" && (<span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-[2px] rounded-full grad-bar" />)}
                    </button>
                    <button
                        onClick={() => setTab("foryou")}
                        data-testid="tab-foryou"
                        className={`py-3 font-heading text-[14px] tracking-tight transition relative active:scale-[0.98] ${tab === "foryou" ? "text-grad-active font-semibold" : "text-black/65 hover:text-black hover:bg-black/[0.03] rounded-lg"}`}
                    >
                        Para ti
                        {tab === "foryou" && (<span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-[2px] rounded-full grad-bar" />)}
                    </button>
                </div>
            </div>

            {/* Mobile-only hero strip — greeting only (sort removed) */}
            <MobileHomeHero
                greeting={greeting}
                firstName={firstName}
            />

            {/* Stories — right under the greeting, on both desktop & mobile */}
            <StoriesBar />

            {/* Mobile-only tabs — sticky under MobileTopBar */}
            <div
                className="lg:hidden sticky z-20 glass border-b border-black/[0.06]"
                style={{ top: "calc(var(--mobile-topbar-h) + var(--safe-top))" }}
            >
                <div className="grid grid-cols-2">
                    <button
                        onClick={() => setTab("following")}
                        data-testid="tab-following-mobile"
                        className={`py-3 font-heading text-[13px] tracking-tight transition relative active:scale-[0.98] ${tab === "following" ? "text-grad-active font-semibold" : "text-black hover:bg-black/[0.04]"}`}
                    >
                        Seguindo
                        {tab === "following" && (<span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-[2px] rounded-full grad-bar" />)}
                    </button>
                    <button
                        onClick={() => setTab("foryou")}
                        data-testid="tab-foryou-mobile"
                        className={`py-3 font-heading text-[13px] tracking-tight transition relative active:scale-[0.98] ${tab === "foryou" ? "text-grad-active font-semibold" : "text-black hover:bg-black/[0.04]"}`}
                    >
                        Para ti
                        {tab === "foryou" && (<span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-[2px] rounded-full grad-bar" />)}
                    </button>
                </div>
            </div>

            {/* Mood chips removed — discovery filters live only on /explore now */}

            {newCount > 0 && (
                <div className="flex justify-center pt-3">
                    <button
                        onClick={refresh}
                        data-testid="new-posts-pill"
                        className="btn-obsidian text-[12px] py-2 px-4 active:scale-95 flex items-center gap-1.5 anim-fade-up"
                    >
                        <Sparkles size={12} strokeWidth={1.8} />
                        {newCount === 1 ? "1 nova publicação" : `${newCount} novas publicações`}
                    </button>
                </div>
            )}

            {/* Inline composer removed — publishing happens via the "+" button (mobile bottom nav / desktop "Publicar"). */}

            <div className="px-4 lg:px-5 pt-3">
                <SmartTodayBanner />
            </div>

            {/* MobileDiscoverStrip removed — trending is hidden on home, online-agora moved to /messages */}

            {loading ? (
                <PostSkeletonList count={5} />
            ) : posts.length === 0 ? (
                <div className="px-6 py-20 text-center anim-fade-up">
                    <div className="ring-silver w-20 h-20 rounded-full grid place-items-center mx-auto mb-6">
                        <Sparkles size={26} strokeWidth={1.4} className="text-black/70" />
                    </div>
                    <p className="type-overline mb-2">Sem novidades</p>
                    <h3 className="font-display text-[19px] font-bold tracking-tight text-black leading-tight">
                        {tab === "following" ? "O teu feed está calmo." : "Sê o primeiro."}
                    </h3>
                    <p className="text-black/55 text-[14px] mt-3 max-w-xs mx-auto leading-relaxed">
                        {tab === "following" ? "Segue pessoas ou passa para Para ti e descobre novidades." : "Nenhuma publicação ainda — começa a conversa."}
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
