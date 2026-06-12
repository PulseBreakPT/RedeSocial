import { useEffect, useRef, useState, useCallback, useMemo } from "react";
// =============================================================================
// DESIGN SYSTEM: LUSORAE EDITORIAL — ver /src/theme/EDITORIAL.md
// Fundos claros, hairlines 1px, sombras difusas, pills 999px, kickers mono
// uppercase. Paleta funcional (PT.brasa, PT.eucalipto, PT.gold, PT.atl…)
// usada em reações e badges. Nenhum vestígio de fanzine PT (sombras 3D,
// stickers rodados, doodles).
// =============================================================================
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
import { PT } from "../theme/editorial";
import { Sticker } from "../components/editorial/Primitives";

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
                    background: "rgba(247,245,239,0.92)",
                    borderBottom: "1px solid rgba(10,10,10,0.10)",
                }}
            >
                {/* Masthead — faixa editorial em ink, alinhada à Landing */}
                <div className="flex items-center justify-between px-7 py-2" style={{ background: PT.ink, color: PT.bone }}>
                    <span className="inline-flex items-center gap-2 font-mono text-[10px] font-bold uppercase" style={{ letterSpacing: "0.22em", color: PT.gold }}>
                        <span className="relative flex h-1.5 w-1.5" aria-hidden>
                            <span className="absolute inline-flex h-full w-full rounded-full lusorae-pulse" style={{ background: PT.gold }} />
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: PT.gold }} />
                        </span>
                        LUSORAE · FEED · AO VIVO
                    </span>
                    <span className="inline-flex items-center gap-3 font-mono text-[10px] font-bold uppercase" style={{ letterSpacing: "0.18em", color: "rgba(255,244,220,0.55)" }}>
                        <span>LISBOA · {new Date().toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}</span>
                        <span style={{ color: "rgba(255,244,220,0.28)" }}>·</span>
                        <span>EDIÇÃO · {new Date().toLocaleDateString("pt-PT", { day: "2-digit", month: "short" }).toUpperCase()}</span>
                    </span>
                </div>

                {/* Hero editorial — tipografia massiva, alinhada à Landing */}
                <div className="px-7 pt-7 pb-5 relative z-10">
                    {/* Kicker editorial */}
                    <div className="flex items-center gap-2.5 mb-3.5">
                        <span className="font-mono text-[10px] font-bold uppercase" style={{ letterSpacing: "0.22em", color: "rgba(10,10,10,0.45)" }}>
                            {new Date().toLocaleDateString("pt-PT", { weekday: "long", day: "2-digit", month: "long" })}
                        </span>
                        <span style={{ color: "rgba(10,10,10,0.18)" }}>—</span>
                        <FeedContextLine className="inline-block" />
                    </div>

                    <div className="flex items-end justify-between gap-6">
                        <div className="min-w-0 flex-1">
                            <h1
                                className="font-black tracking-[-0.045em] leading-[0.94]"
                                style={{ fontSize: "clamp(48px, 5.4vw, 64px)", color: PT.ink }}
                                data-testid="feed-greeting"
                            >
                                {greeting}{firstName ? (
                                    <>,{" "}
                                    <span className="relative inline-block">
                                        <span className="relative z-10" style={{ color: PT.red }}>{firstName}</span>
                                        <svg
                                            aria-hidden
                                            className="absolute pointer-events-none"
                                            style={{ left: 0, right: 0, bottom: "-0.08em", width: "100%", height: "0.22em" }}
                                            viewBox="0 0 200 12"
                                            preserveAspectRatio="none"
                                        >
                                            <path d="M2 7 Q 50 0, 100 6 T 198 5" fill="none" stroke={PT.red} strokeWidth="3" strokeLinecap="round" />
                                        </svg>
                                    </span></>
                                ) : ""}.
                            </h1>
                            <p className="text-[15px] mt-3.5 font-medium max-w-[36ch]" style={{ color: "rgba(10,10,10,0.62)", lineHeight: 1.45 }}>
                                O que se passa em Portugal{" "}
                                <strong style={{ color: PT.ink, fontWeight: 700 }}>agora</strong>
                                {" — "}selecionado para ti.
                            </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 pb-1">
                            <span
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 font-mono text-[10px] font-bold uppercase"
                                style={{
                                    background: "#fff",
                                    color: "rgba(10,10,10,0.68)",
                                    border: "1px solid rgba(10,10,10,0.08)",
                                    borderRadius: 999,
                                    letterSpacing: "0.18em",
                                    boxShadow: "0 1px 2px rgba(10,10,10,0.04)",
                                }}
                            >
                                <span className="relative flex h-1.5 w-1.5" aria-hidden>
                                    <span className="absolute inline-flex h-full w-full rounded-full lusorae-pulse" style={{ background: PT.green }} />
                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: PT.green }} />
                                </span>
                                Notícias reais
                            </span>
                            <button
                                onClick={refresh}
                                data-testid="feed-refresh"
                                className="w-11 h-11 grid place-items-center tap-shrink transition hover:translate-y-[-1px]"
                                title="Atualizar"
                                style={{
                                    background: "#fff",
                                    border: "1px solid rgba(10,10,10,0.08)",
                                    borderRadius: 999,
                                    boxShadow: "0 1px 2px rgba(10,10,10,0.04), 0 8px 20px -10px rgba(10,10,10,0.22)",
                                    color: PT.ink,
                                }}
                            >
                                <RefreshCw size={17} strokeWidth={2.2} className={refreshing ? "animate-spin" : ""} />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Tabs — magazine premium com indicador animado */}
                <div className="grid grid-cols-2 px-7 relative" style={{ borderTop: "1px solid rgba(10,10,10,0.06)" }}>
                    {[
                        { key: "following", label: "Seguindo", testId: "tab-following" },
                        { key: "foryou",    label: "Para ti",  testId: "tab-foryou" },
                    ].map((t) => {
                        const active = tab === t.key;
                        return (
                            <button
                                key={t.key}
                                onClick={() => setTab(t.key)}
                                data-testid={t.testId}
                                className="py-4 font-black uppercase text-[12px] tracking-[0.14em] transition relative active:scale-[0.98] hover:text-black"
                                style={{ color: active ? PT.ink : "rgba(10,10,10,0.42)" }}
                            >
                                {t.label}
                                {active && (
                                    <span
                                        className="absolute -bottom-[1px] left-1/2 -translate-x-1/2 h-[2.5px]"
                                        style={{ background: PT.red, width: 72, borderRadius: 999 }}
                                    />
                                )}
                            </button>
                        );
                    })}
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
                    background: "rgba(247,245,239,0.92)",
                    borderBottom: "1px solid rgba(10,10,10,0.10)",
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
                        className="text-[12.5px] py-2 px-4 active:scale-95 flex items-center gap-1.5 font-bold transition-all duration-200 hover:translate-y-[-1px]"
                        style={{
                            background: `linear-gradient(180deg, #1f1f1f 0%, ${PT.ink} 100%)`,
                            color: "#fff",
                            border: "1px solid rgba(10,10,10,0.10)",
                            borderRadius: 999,
                            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10), 0 8px 22px -10px rgba(10,10,10,0.35)",
                            letterSpacing: "-0.005em",
                        }}
                    >
                        <Sparkles size={12} strokeWidth={2.2} />
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
                            background: "#fff",
                            border: "1px solid rgba(10,10,10,0.08)",
                            boxShadow: "0 1px 2px rgba(10,10,10,0.04), 0 10px 30px -12px rgba(10,10,10,0.18)",
                            borderRadius: 999,
                        }}
                    >
                        <Sparkles size={26} strokeWidth={2.0} style={{ color: PT.ink }} />
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
        </div>
    );
}
