import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { RefreshCw, Sparkles } from "lucide-react";
import { PostCard } from "../components/PostCard";
import { StoriesBar } from "../components/StoriesBar";
import { MobileHomeHero } from "../components/MobileHomeHero";
import { PostSkeletonList } from "../components/Skeleton";
import { LiveActivityBeacon } from "../components/LiveActivityBeacon";
import { useLiveTime } from "../hooks/useLiveTime";
import { usePullToRefresh } from "../hooks/usePullToRefresh";
import { useScrollHealth } from "../hooks/useScrollHealth";
import { useWsMessages, useWsState } from "../components/WebSocketProvider";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { SmartTodayBanner } from "../components/SmartTodayBanner";
import { PulseBar } from "../components/pulse/PulseBar";
import { TopicBurstChips } from "../components/pulse/TopicBurstChips";
import { FeedContextLine } from "../components/pulse/FeedContextLine";
import { haptic } from "../lib/haptics";
import {
    PT, Sticker, AuthStyles,
    DoodleStar, DoodleSparkles, DoodleScribble, DoodleSpiral,
    DoodleZigzag, DoodleCross, GiantAsterisk,
} from "./auth/AuthDecor";

// Frases curadas pt-PT mostradas no pull-to-refresh.
// Rotativas para dar sensação humana e mexer com o utilizador.
const PTR_PHRASES = [
    "A ver o que se passa…",
    "Novas conversas a chegar…",
    "A tua cidade acordou.",
    "A buscar o que importa…",
    "À procura de fado novo…",
    "A atualizar a tasca digital…",
    "Saudades a chegar…",
    "Mais um café e já volta…",
];

export default function Feed() {
    const { user } = useAuth();
    const [tab, setTab] = useState("following");
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [newCount, setNewCount] = useState(0);
    const knownIdsRef = useRef(new Set());
    useLiveTime(30000);
    // Fase 8 — anti-doomscroll: nudge suave em consumo passivo prolongado.
    useScrollHealth();

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
                // Track post order for swipe-between-posts navigation
                try {
                    // Lazy import to keep main bundle slim
                    const { trackPostList } = await import("../lib/postTrack");
                    trackPostList(which, data.map((p) => p.id));
                } catch {}
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
    // Pick a stable phrase per "pull session" — index advances each time the
    // user starts a new gesture, never mid-pull (avoids flicker).
    const [ptrPhraseIdx, setPtrPhraseIdx] = useState(() => Math.floor(Math.random() * PTR_PHRASES.length));
    useEffect(() => {
        if (pull > 6 && pull < 14) {
            // Start of pull — advance phrase
            setPtrPhraseIdx((i) => (i + 1) % PTR_PHRASES.length);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pull > 6]);
    useEffect(() => {
        if (ptrRefreshing) haptic("tap");
    }, [ptrRefreshing]);

    return (
        <div data-testid="feed-page" className="relative" style={{ background: PT.cream, minHeight: "100vh" }}>
            {/* ═══ DOODLES DE FUNDO ═══ */}
            <div className="absolute -top-10 -right-10 pointer-events-none opacity-[0.05] z-0 hidden lg:block" aria-hidden>
                <GiantAsterisk color={PT.red} size={280} rotate={-12} />
            </div>
            <div className="absolute top-32 -right-2 sm:right-4 pointer-events-none block opacity-50 scale-[0.55] sm:scale-100 sm:opacity-80 origin-top-right z-0 hidden md:block" aria-hidden>
                <DoodleStar color={PT.gold} size={42} rotate={14} />
            </div>
            <div className="absolute top-[420px] -left-3 sm:left-2 pointer-events-none block opacity-50 scale-[0.55] sm:scale-100 sm:opacity-80 origin-left z-0 hidden lg:block" aria-hidden>
                <DoodleScribble color={PT.azul} w={120} h={48} style={{ transform: "rotate(-6deg)" }} />
            </div>
            <div className="absolute top-[760px] -right-2 sm:right-3 pointer-events-none block opacity-50 scale-[0.55] sm:scale-100 sm:opacity-80 origin-right z-0 hidden lg:block" aria-hidden>
                <DoodleSpiral color={PT.gold} size={56} rotate={12} />
            </div>
            <div className="absolute top-[1200px] -left-2 sm:left-4 pointer-events-none block opacity-50 scale-[0.55] sm:scale-100 sm:opacity-80 origin-left z-0 hidden lg:block" aria-hidden>
                <DoodleSparkles color={PT.red} size={40} rotate={-8} />
            </div>
            <div className="absolute bottom-40 -right-2 sm:right-4 pointer-events-none block opacity-50 scale-[0.55] sm:scale-100 sm:opacity-80 origin-bottom-right z-0 hidden lg:block" aria-hidden>
                <DoodleCross color={PT.green} size={28} rotate={18} />
            </div>
            <LiveActivityBeacon />
            <div
                className="ptr-indicator lg:hidden"
                style={{ height: ptrRefreshing ? 56 : pull }}
                aria-hidden
            >
                {showPtr && (
                    <div className="flex items-center gap-2.5">
                        <RefreshCw
                            size={18}
                            className={`text-black/60 ${ptrRefreshing ? "ptr-spin" : ""}`}
                            style={{
                                transform: ptrRefreshing ? "none" : `rotate(${ptrProgress * 270}deg)`,
                                opacity: 0.3 + ptrProgress * 0.7,
                            }}
                        />
                        <span
                            className="font-mono text-[11px] uppercase tracking-[0.14em] text-black/60"
                            style={{ opacity: Math.min(1, Math.max(0, (ptrProgress - 0.25) / 0.75)) }}
                            data-testid="ptr-phrase"
                        >
                            {PTR_PHRASES[ptrPhraseIdx]}
                        </span>
                    </div>
                )}
            </div>

            <div
                className="hidden lg:block sticky top-0 z-30 backdrop-blur relative"
                style={{
                    background: "rgba(244,244,244,0.94)",
                    borderBottom: `3px solid ${PT.ink}`,
                }}
            >
                {/* Faixa "jornal" topo */}
                <div className="flex items-center justify-between px-6 py-1.5" style={{ background: PT.ink, color: PT.bone }}>
                    <span className="font-mono text-[10px] font-bold uppercase" style={{ letterSpacing: "0.18em", color: PT.gold }}>
                        LUSORAE · FEED · AO VIVO
                    </span>
                    <span className="font-mono text-[10px] font-bold uppercase" style={{ letterSpacing: "0.14em", color: "rgba(255,244,220,0.55)" }}>
                        EDIÇÃO · {new Date().toLocaleDateString("pt-PT", { day: "2-digit", month: "short" }).toUpperCase()}
                    </span>
                </div>
                <div className="px-6 pt-4 pb-3 flex items-end justify-between gap-4 relative z-10">
                    <div className="min-w-0">
                        <h1
                            className="font-black tracking-[-0.03em] leading-[0.98]"
                            style={{ fontSize: 30, color: PT.ink }}
                            data-testid="feed-greeting"
                        >
                            {greeting}{firstName ? (
                                <>, <span style={{
                                    display: "inline-block",
                                    background: PT.gold,
                                    padding: "0 0.10em",
                                    border: `2.5px solid ${PT.ink}`,
                                    boxShadow: `3px 3px 0 ${PT.ink}`,
                                    transform: "rotate(-1deg)",
                                }}>{firstName}</span></>
                            ) : ""}.
                        </h1>
                        <p className="text-[13px] mt-2 font-medium" style={{ color: "rgba(10,10,10,0.65)" }}>
                            O que se passa em Portugal{" "}
                            <strong style={{ color: PT.red, fontWeight: 900 }}>agora</strong>.
                        </p>
                        <FeedContextLine className="mt-1 block" />
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                        <Sticker bg={PT.green} color="#fff" rotate={-3} style={{ fontSize: 9.5, padding: "4px 8px" }}>
                            ✓ NOTÍCIAS REAIS
                        </Sticker>
                        <button
                            onClick={refresh}
                            data-testid="feed-refresh"
                            className="w-10 h-10 grid place-items-center tap-shrink transition"
                            title="Atualizar"
                            style={{
                                background: "#fff",
                                border: `2.5px solid ${PT.ink}`,
                                borderRadius: 999,
                                boxShadow: `3px 3px 0 ${PT.ink}`,
                                color: PT.ink,
                            }}
                        >
                            <RefreshCw size={16} strokeWidth={2.2} className={refreshing ? "animate-spin" : ""} />
                        </button>
                    </div>
                </div>

                {/* Tabs — estilo fanzine PT */}
                <div className="grid grid-cols-2 px-3 relative">
                    <button
                        onClick={() => setTab("following")}
                        data-testid="tab-following"
                        className={`py-3 font-black uppercase text-[12.5px] tracking-[0.08em] transition relative active:scale-[0.98]`}
                        style={{
                            color: tab === "following" ? PT.red : "rgba(10,10,10,0.55)",
                        }}
                    >
                        Seguindo
                        {tab === "following" && (
                            <span
                                className="absolute -bottom-[3px] left-1/2 -translate-x-1/2 h-[3px] rounded-full"
                                style={{ background: PT.red, width: 56 }}
                            />
                        )}
                    </button>
                    <button
                        onClick={() => setTab("foryou")}
                        data-testid="tab-foryou"
                        className={`py-3 font-black uppercase text-[12.5px] tracking-[0.08em] transition relative active:scale-[0.98]`}
                        style={{
                            color: tab === "foryou" ? PT.red : "rgba(10,10,10,0.55)",
                        }}
                    >
                        Para ti
                        {tab === "foryou" && (
                            <span
                                className="absolute -bottom-[3px] left-1/2 -translate-x-1/2 h-[3px] rounded-full"
                                style={{ background: PT.red, width: 56 }}
                            />
                        )}
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
                className="lg:hidden sticky z-20 backdrop-blur relative"
                style={{
                    top: "calc(var(--mobile-topbar-h) + var(--safe-top))",
                    background: "rgba(244,244,244,0.94)",
                    borderBottom: `3px solid ${PT.ink}`,
                }}
            >
                <div className="grid grid-cols-2 relative">
                    <button
                        onClick={() => setTab("following")}
                        data-testid="tab-following-mobile"
                        className={`py-3 font-black uppercase text-[11.5px] tracking-[0.08em] transition relative active:scale-[0.98]`}
                        style={{ color: tab === "following" ? PT.red : "rgba(10,10,10,0.55)" }}
                    >
                        Seguindo
                        {tab === "following" && (
                            <span className="absolute -bottom-[3px] left-1/2 -translate-x-1/2 h-[3px] rounded-full" style={{ background: PT.red, width: 48 }} />
                        )}
                    </button>
                    <button
                        onClick={() => setTab("foryou")}
                        data-testid="tab-foryou-mobile"
                        className={`py-3 font-black uppercase text-[11.5px] tracking-[0.08em] transition relative active:scale-[0.98]`}
                        style={{ color: tab === "foryou" ? PT.red : "rgba(10,10,10,0.55)" }}
                    >
                        Para ti
                        {tab === "foryou" && (
                            <span className="absolute -bottom-[3px] left-1/2 -translate-x-1/2 h-[3px] rounded-full" style={{ background: PT.red, width: 48 }} />
                        )}
                    </button>
                </div>
            </div>

            {/* Mood chips removed — discovery filters live only on /explore now */}

            {newCount > 0 && (
                <div className="flex justify-center pt-3 relative z-10">
                    <button
                        onClick={refresh}
                        data-testid="new-posts-pill"
                        className="text-[12px] py-2 px-4 active:scale-95 flex items-center gap-1.5 font-black uppercase"
                        style={{
                            background: PT.red,
                            color: "#fff",
                            border: `2.5px solid ${PT.ink}`,
                            borderRadius: 999,
                            boxShadow: `3px 3px 0 ${PT.ink}`,
                            letterSpacing: "0.05em",
                        }}
                    >
                        <Sparkles size={12} strokeWidth={2.4} />
                        {newCount === 1 ? "1 nova publicação" : `${newCount} novas publicações`}
                    </button>
                </div>
            )}

            {/* Inline composer removed — publishing happens via the "+" button (mobile bottom nav / desktop "Publicar"). */}

            <div className="px-4 lg:px-5 pt-3 space-y-3">
                {/* Pulse Engine — sinais ambientais, só aparecem quando há sinal real */}
                <PulseBar />
                <TopicBurstChips />
                <SmartTodayBanner />
            </div>

            {/* MobileDiscoverStrip removed — trending is hidden on home, online-agora moved to /messages */}

            {loading ? (
                <PostSkeletonList count={5} />
            ) : posts.length === 0 ? (
                <div className="px-6 py-20 text-center anim-fade-up relative z-10" data-testid="feed-empty">
                    <div
                        className="w-20 h-20 grid place-items-center mx-auto mb-6"
                        style={{
                            background: PT.gold,
                            border: `3px solid ${PT.ink}`,
                            boxShadow: `4px 4px 0 ${PT.ink}`,
                            borderRadius: 999,
                            transform: "rotate(-3deg)",
                        }}
                    >
                        <Sparkles size={26} strokeWidth={2.2} style={{ color: PT.ink }} />
                    </div>
                    <h3 className="font-black tracking-tight leading-tight mt-2" style={{ fontSize: 22, color: PT.ink }}>
                        {tab === "following" ? "O teu feed está calmo." : "Sê o primeiro."}
                    </h3>
                    <p className="text-[14px] mt-3 max-w-xs mx-auto leading-relaxed font-medium" style={{ color: "rgba(10,10,10,0.62)" }}>
                        {tab === "following" ? "Segue pessoas ou passa para Para ti e descobre novidades." : "Nenhuma publicação ainda — começa a conversa."}
                    </p>
                </div>
            ) : (
                <div className="relative z-10">
                    {posts.map((p) => (
                        <PostCard
                            key={p.id}
                            post={p}
                            onChange={(np) => setPosts((prev) => prev.map((x) => (x.id === np.id ? np : x)))}
                            onDelete={(id) => setPosts((prev) => prev.filter((x) => x.id !== id))}
                        />
                    ))}
                </div>
            )}
            <AuthStyles />
        </div>
    );
}
