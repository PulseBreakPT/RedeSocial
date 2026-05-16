import { useEffect, useRef, useState, useCallback } from "react";
import { RefreshCw, Sparkles, Flame, Clock, X } from "lucide-react";
import { Composer } from "../components/Composer";
import { PostCard } from "../components/PostCard";
import { StoriesBar } from "../components/StoriesBar";
import { MobileDiscoverStrip } from "../components/MobileDiscoverStrip";
import { PostSkeletonList } from "../components/Skeleton";
import { useLiveTime } from "../hooks/useLiveTime";
import { usePullToRefresh } from "../hooks/usePullToRefresh";
import { api } from "../lib/api";
import { MOOD_OPTIONS, lsGet, lsSet } from "../lib/portuguese";
import { CalendarPTBanner, ATardeBanner } from "../components/PTBanners";
import { NewVoicesStrip } from "../components/PTPresence";
import { NotesBar } from "../components/NotesBar";

const SORTS = [
    { key: "recent", label: "Recente", icon: Clock },
    { key: "top", label: "Top", icon: Flame },
];

export default function Feed() {
    const [tab, setTab] = useState("following");
    const [mood, setMood] = useState(lsGet("feed.mood", ""));
    const [sort, setSort] = useState(lsGet("feed.sort", "recent"));
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [newCount, setNewCount] = useState(0);
    const knownIdsRef = useRef(new Set());
    useLiveTime(30000);

    useEffect(() => lsSet("feed.mood", mood), [mood]);
    useEffect(() => lsSet("feed.sort", sort), [sort]);

    const load = useCallback(
        async (which = tab, showSkeleton = true) => {
            if (showSkeleton) setLoading(true);
            try {
                const params = new URLSearchParams();
                if (mood) params.set("mood", mood);
                params.set("sort", sort);
                // V2: For You uses the new ranking engine, Following stays chronological
                let url;
                if (which === "foryou") {
                    url = `/feed/v2${mood ? `?mood=${mood}` : ""}`;
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
        [tab, mood, sort],
    );

    useEffect(() => { load(tab); }, [load, tab]);

    useEffect(() => {
        const id = setInterval(async () => {
            try {
                const params = new URLSearchParams();
                if (mood) params.set("mood", mood);
                params.set("sort", sort);
                const url = tab === "following" ? `/posts/feed?${params}` : `/posts/explore?${params}`;
                const { data } = await api.get(url);
                let n = 0;
                for (const p of data) if (!knownIdsRef.current.has(p.id)) n++;
                if (n > 0) setNewCount(n);
            } catch {}
        }, 30000);
        return () => clearInterval(id);
    }, [tab, mood, sort]);

    const refresh = useCallback(async () => {
        setRefreshing(true);
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
                <div className="px-5 py-4 flex items-center justify-between">
                    <div>
                        <h1 className="font-display text-[22px] font-bold tracking-tight leading-tight text-black">Início</h1>
                        <p className="text-[12px] text-black/50 mt-0.5 font-medium">O que se passa{mood ? ` · ${MOOD_OPTIONS.find(m => m.key === mood)?.emoji} ${MOOD_OPTIONS.find(m => m.key === mood)?.label}` : ""}</p>
                    </div>
                    <div className="flex items-center gap-1">
                        {SORTS.map((s) => {
                            const Icon = s.icon;
                            const active = sort === s.key;
                            return (
                                <button
                                    key={s.key}
                                    onClick={() => setSort(s.key)}
                                    data-testid={`feed-sort-${s.key}`}
                                    title={s.label}
                                    className={`w-9 h-9 rounded-full grid place-items-center transition tap-shrink ${
                                        active ? "chip-filter-on" : "text-black hover:bg-black/[0.06]"
                                    }`}
                                >
                                    <Icon size={15} strokeWidth={1.7} />
                                </button>
                            );
                        })}
                        <button
                            onClick={refresh}
                            data-testid="feed-refresh"
                            className="w-10 h-10 rounded-full grid place-items-center text-black hover:text-black hover:bg-black/[0.05] tap-shrink transition border border-transparent hover:border-black/[0.06]"
                            title="Atualizar"
                        >
                            <RefreshCw size={16} strokeWidth={1.7} className={refreshing ? "animate-spin" : ""} />
                        </button>
                    </div>
                </div>
            </div>

            <div className="glass border-b border-black/[0.06]">
                <div className="grid grid-cols-2">
                    <button
                        onClick={() => setTab("following")}
                        data-testid="tab-following"
                        className={`py-3.5 font-heading text-[13px] tracking-tight transition relative active:scale-[0.98] ${tab === "following" ? "text-grad-active font-semibold" : "text-black hover:bg-black/[0.04]"}`}
                    >
                        Seguindo
                        {tab === "following" && (<span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-[2px] rounded-full grad-bar" />)}
                    </button>
                    <button
                        onClick={() => setTab("foryou")}
                        data-testid="tab-foryou"
                        className={`py-3.5 font-heading text-[13px] tracking-tight transition relative active:scale-[0.98] ${tab === "foryou" ? "text-grad-active font-semibold" : "text-black hover:bg-black/[0.04]"}`}
                    >
                        Para ti
                        {tab === "foryou" && (<span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-[2px] rounded-full grad-bar" />)}
                    </button>
                </div>
                {/* Mood chips */}
                <div className="flex gap-1.5 px-3 pb-2.5 overflow-x-auto scrollbar-hide">
                    <button
                        onClick={() => setMood("")}
                        data-testid="feed-mood-all"
                        className={`shrink-0 px-3 py-1 rounded-full text-[12px] font-medium transition ${mood === "" ? "chip-filter-on" : "bg-black/[0.04] text-black hover:bg-black/[0.08]"}`}
                    >
                        Tudo
                    </button>
                    {MOOD_OPTIONS.map((m) => (
                        <button
                            key={m.key}
                            onClick={() => setMood(m.key)}
                            data-testid={`feed-mood-${m.key}`}
                            className={`shrink-0 inline-flex items-center gap-1 px-3 py-1 rounded-full text-[12px] font-medium transition ${mood === m.key ? "chip-filter-on" : "bg-black/[0.04] text-black hover:bg-black/[0.08]"}`}
                        >
                            <span>{m.emoji}</span> {m.label}
                        </button>
                    ))}
                    {mood && (
                        <button onClick={() => setMood("")} className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] text-black/50 hover:bg-black/[0.04]" data-testid="feed-mood-clear">
                            <X size={11} /> Limpar
                        </button>
                    )}
                </div>
            </div>

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

            <StoriesBar />
            <div className="px-4 lg:px-5">
                <NotesBar />
            </div>
            <MobileDiscoverStrip />
            <Composer onPosted={(p) => setPosts((prev) => [p, ...prev])} />

            <div className="px-4 lg:px-5 pt-3">
                <CalendarPTBanner />
                <ATardeBanner />
                <NewVoicesStrip />
            </div>

            {loading ? (
                <PostSkeletonList count={5} />
            ) : posts.length === 0 ? (
                <div className="px-6 py-20 text-center anim-fade-up">
                    <div className="ring-silver w-20 h-20 rounded-full grid place-items-center mx-auto mb-6">
                        <Sparkles size={26} strokeWidth={1.4} className="text-black/70" />
                    </div>
                    <p className="type-overline mb-2">Sem novidades</p>
                    <h3 className="font-display text-[19px] font-bold tracking-tight text-black leading-tight">
                        {mood ? `Sem ${MOOD_OPTIONS.find(m => m.key === mood)?.label?.toLowerCase()} por aqui.` : (tab === "following" ? "O teu feed está calmo." : "Sê o primeiro.")}
                    </h3>
                    <p className="text-black/55 text-[14px] mt-3 max-w-xs mx-auto leading-relaxed">
                        {mood ? "Tenta outro mood ou limpa o filtro." : (tab === "following" ? "Segue pessoas ou passa para Para ti e descobre novidades." : "Nenhuma publicação ainda — começa a conversa.")}
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
