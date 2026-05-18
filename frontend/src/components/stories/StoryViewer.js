import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import {
    X, Heart, Send, MoreHorizontal, Eye, Volume2, VolumeX, Trash2, Star,
    BellOff, Sparkles, Pause, BarChart3, Flame,
} from "lucide-react";
import { api, toastApiError } from "../../lib/api";
import { Avatar } from "../Avatar";
import { useAuth } from "../../context/AuthContext";
import { useEscapeKey } from "../../hooks/useClickOutside";
import { toast } from "sonner";
import { StoryStickerOverlay } from "./StoryStickerOverlay";
import {
    STORY_REACTIONS, bgCss, fontStyleFor, computeTextDecorationStyle, LIGHT_BG_KEYS,
} from "./storyConstants";
import { ViewersSheet } from "./ViewersSheet";
import { StoryInsightsSheet } from "./StoryInsightsSheet";
import "./stories.css";

function relativeTime(iso) {
    if (!iso) return "";
    const t = new Date(iso).getTime();
    const diff = Math.floor((Date.now() - t) / 1000);
    if (diff < 60) return "agora";
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
}

const SWIPE_DISMISS_THRESHOLD = 110;
const SWIPE_NAV_THRESHOLD = 60;

export function StoryViewer({ groups, startIndex, startSubIndex = 0, onClose, onChange }) {
    const { user: me } = useAuth();
    const [gi, setGi] = useState(startIndex);
    const [si, setSi] = useState(startSubIndex);
    const [progress, setProgress] = useState(0);
    const [paused, setPaused] = useState(false);
    const [muted, setMuted] = useState(true);
    const [replyValue, setReplyValue] = useState("");
    const [replyFocus, setReplyFocus] = useState(false);
    const [showReactions, setShowReactions] = useState(false);
    const [viewersOpen, setViewersOpen] = useState(false);
    const [moreOpen, setMoreOpen] = useState(false);
    const [bursts, setBursts] = useState([]);
    const [ripple, setRipple] = useState(null);
    const [dragY, setDragY] = useState(0);
    const [stickerUpdates, setStickerUpdates] = useState({});
    const [insightsOpen, setInsightsOpen] = useState(false);
    const [quickReplies, setQuickReplies] = useState([]);

    const rafRef = useRef(null);
    const startRef = useRef(0);
    const elapsedRef = useRef(0);
    const videoRef = useRef(null);
    const dragRef = useRef(null);

    const group = groups[gi];
    const baseStory = group?.stories[si];
    const story = useMemo(() => {
        if (!baseStory) return null;
        if (!baseStory.stickers?.length) return baseStory;
        const merged = baseStory.stickers.map((s) =>
            stickerUpdates[s.id] ? { ...s, ...stickerUpdates[s.id] } : s
        );
        return { ...baseStory, stickers: merged };
    }, [baseStory, stickerUpdates]);

    useEscapeKey(onClose, true);

    const isMine = me?.id === group?.author?.id;
    const dur = story?.duration_ms || (story?.media_type === "video" ? 8000 : 5000);

    // Mark viewed + reset progress on story change
    useEffect(() => {
        if (!story) return;
        api.post(`/stories/${story.id}/view`, { completion: 0.05 }).catch(() => {});
        setProgress(0);
        elapsedRef.current = 0;
        startRef.current = performance.now();
        setStickerUpdates({});
        setReplyValue("");
        setShowReactions(false);
        setMoreOpen(false);
        setInsightsOpen(false);
        // Smart replies — só para stories de outros
        setQuickReplies([]);
        if (!isMine && story.allow_replies) {
            api.get(`/stories/${story.id}/quick-replies`)
                .then((r) => setQuickReplies(r.data?.suggestions || []))
                .catch(() => {});
        }
        // eslint-disable-next-line
    }, [gi, si]);

    // SSS-Tier: ao trocar de story, envia o completion final do story anterior
    const lastViewedRef = useRef({ storyId: null, completion: 0 });
    useEffect(() => {
        const lvr = lastViewedRef.current;
        if (lvr.storyId && lvr.storyId !== story?.id && lvr.completion > 0.1) {
            api.post(`/stories/${lvr.storyId}/view`, {
                completion: Math.min(1.0, lvr.completion),
            }).catch(() => {});
        }
        if (story) {
            lastViewedRef.current = { storyId: story.id, completion: 0 };
        }
        // eslint-disable-next-line
    }, [story?.id]);

    // Acompanhar progress para o completion enviado ao trocar/fechar
    useEffect(() => {
        if (lastViewedRef.current.storyId === story?.id) {
            lastViewedRef.current.completion = progress / 100;
        }
    }, [progress, story?.id]);

    // Garantir envio do último completion ao fechar
    useEffect(() => () => {
        const lvr = lastViewedRef.current;
        if (lvr.storyId && lvr.completion > 0.1) {
            api.post(`/stories/${lvr.storyId}/view`, {
                completion: Math.min(1.0, lvr.completion),
            }).catch(() => {});
        }
    }, []);

    const next = useCallback(() => {
        if (si + 1 < group.stories.length) setSi(si + 1);
        else if (gi + 1 < groups.length) { setGi(gi + 1); setSi(0); }
        else onClose();
    }, [si, gi, group, groups, onClose]);

    const prev = useCallback(() => {
        if (si > 0) setSi(si - 1);
        else if (gi > 0) { setGi(gi - 1); setSi(groups[gi - 1].stories.length - 1); }
    }, [si, gi, groups]);

    // rAF-based smooth progress
    useEffect(() => {
        if (!story) return;
        const isPaused = paused || replyFocus || viewersOpen || moreOpen || insightsOpen;
        let last = performance.now();
        startRef.current = last;
        const tick = (now) => {
            if (!isPaused) {
                const delta = now - last;
                elapsedRef.current += delta;
                const p = Math.min(100, (elapsedRef.current / dur) * 100);
                setProgress(p);
                if (p >= 100) {
                    next();
                    return;
                }
            }
            last = now;
            rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
        return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    }, [gi, si, paused, replyFocus, viewersOpen, moreOpen, insightsOpen, dur, next, story]);

    // Sync video play/pause + mute
    useEffect(() => {
        const v = videoRef.current;
        if (!v) return;
        v.muted = muted;
        if (paused || replyFocus || viewersOpen || moreOpen || insightsOpen) {
            try { v.pause(); } catch { /**/ }
        } else {
            try { v.play(); } catch { /**/ }
        }
    }, [paused, replyFocus, viewersOpen, moreOpen, insightsOpen, muted, gi, si]);

    const onUpdateSticker = useCallback((stickerId, newSticker) => {
        setStickerUpdates((prev) => ({ ...prev, [stickerId]: newSticker }));
    }, []);

    const react = async (emoji) => {
        if (!story?.allow_reactions) return;
        const previousR = story.viewer_reaction;
        const toggling = previousR === emoji;
        try {
            const r = await api.post(`/stories/${story.id}/react`, { emoji });
            toast.success(toggling ? "Reacção removida" : `Reagiste com ${emoji}`);
            if (navigator.vibrate) navigator.vibrate(toggling ? 8 : [10, 40, 10]);
            baseStory.viewer_reaction = r.data.reaction;
            setShowReactions(false);
            if (!toggling) {
                // Animate a heart burst
                const id = Math.random().toString(36).slice(2);
                setBursts((b) => [...b, { id, emoji }]);
                setTimeout(() => setBursts((b) => b.filter((x) => x.id !== id)), 1200);
            }
        } catch (e) { toastApiError(e); }
    };

    const quickHeart = () => react("❤️");

    const sendReply = async () => {
        const v = replyValue.trim();
        if (!v) return;
        if (!story?.allow_replies) { toast.error("Respostas desactivadas neste story"); return; }
        try {
            await api.post(`/stories/${story.id}/reply`, { content: v });
            setReplyValue("");
            toast.success("Resposta enviada");
            if (navigator.vibrate) navigator.vibrate(15);
        } catch (e) { toastApiError(e); }
    };

    const deleteStory = async () => {
        if (!window.confirm("Apagar este story?")) return;
        try {
            await api.delete(`/stories/${story.id}`);
            toast.success("Story apagado");
            onChange?.();
            onClose();
        } catch (e) { toastApiError(e); }
    };

    const toggleStoriesMute = async () => {
        try {
            const r = await api.post(`/users/me/stories-mute/${group.author.id}`);
            toast.success(r.data.action === "muted" ? "Stories silenciados" : "Stories restaurados");
            setMoreOpen(false);
            onChange?.();
        } catch (e) { toastApiError(e); }
    };

    const addToHighlight = async () => {
        const title = window.prompt("Nome do destaque (ex: Lisboa 2025)");
        if (!title || !title.trim()) return;
        try {
            await api.post(`/highlights`, { title: title.trim(), cover: story.id, story_ids: [story.id] });
            toast.success("Adicionado aos destaques");
            setMoreOpen(false);
            onChange?.();
        } catch (e) { toastApiError(e); }
    };

    /* ---------- gesture handlers (swipe vertical = close, horizontal = nav) ---------- */
    const onShellPointerDown = (e) => {
        // Skip drags that originate on reply input / buttons
        if (e.target.closest("input, textarea, button, a, [data-no-drag]")) return;
        dragRef.current = { x: e.clientX, y: e.clientY, dx: 0, dy: 0, axis: null, t0: performance.now() };
        setPaused(true);
    };
    const onShellPointerMove = (e) => {
        const st = dragRef.current;
        if (!st) return;
        st.dx = e.clientX - st.x;
        st.dy = e.clientY - st.y;
        if (!st.axis && Math.hypot(st.dx, st.dy) > 10) {
            st.axis = Math.abs(st.dx) > Math.abs(st.dy) ? "x" : "y";
        }
        if (st.axis === "y" && st.dy > 0) setDragY(st.dy);
    };
    const onShellPointerUp = (e) => {
        const st = dragRef.current;
        if (!st) { setPaused(false); return; }
        const elapsed = performance.now() - st.t0;
        const isTap = Math.hypot(st.dx, st.dy) < 8 && elapsed < 250;
        if (isTap) {
            // Determine prev/next tap zone based on x-position
            const rect = e.currentTarget.getBoundingClientRect();
            const xRel = (e.clientX - rect.left) / rect.width;
            // Trigger ripple feedback
            setRipple({ id: Math.random().toString(36).slice(2), x: e.clientX - rect.left, y: e.clientY - rect.top });
            setTimeout(() => setRipple(null), 400);
            if (xRel < 0.33) prev();
            else if (xRel > 0.66) next();
            // middle tap = toggle pause briefly? skip — used by quick-heart on bottom
        } else if (st.axis === "y" && st.dy > SWIPE_DISMISS_THRESHOLD) {
            onClose();
        } else if (st.axis === "x") {
            if (st.dx < -SWIPE_NAV_THRESHOLD) next();
            else if (st.dx > SWIPE_NAV_THRESHOLD) prev();
        }
        dragRef.current = null;
        setDragY(0);
        setPaused(false);
    };

    if (!story) return null;

    const bgKey = story.background || "coral";
    const fStyle = fontStyleFor(story.font_style || "modern");
    const textColor = story.text_color || "#ffffff";
    const textStyle = story.text_style || "plain";
    const decorStyle = computeTextDecorationStyle(textStyle, textColor);
    const isLightBg = LIGHT_BG_KEYS.has(bgKey);
    const audienceTag = story.audience === "roda" ? "🫂 Roda" : story.audience === "following" ? "👥 A seguir" : null;

    const shellStyle = dragY > 0
        ? { transform: `translateY(${dragY}px) scale(${Math.max(0.84, 1 - dragY / 800)})`, opacity: Math.max(0.5, 1 - dragY / 600) }
        : {};

    return (
        <div
            className="fixed inset-0 z-[90] bg-black/95 grid place-items-center select-none sc-fade-in"
            data-testid="story-viewer"
            style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
        >
            <div
                className={`sv-shell relative w-full max-w-md h-full sm:h-auto sm:aspect-[9/16] sm:max-h-[92vh] bg-black sm:rounded-3xl overflow-hidden border border-white/10 shadow-[0_40px_100px_-10px_rgba(0,0,0,0.6)] ${dragY > 0 ? "is-dragging" : ""}`}
                style={shellStyle}
                onPointerDown={onShellPointerDown}
                onPointerMove={onShellPointerMove}
                onPointerUp={onShellPointerUp}
                onPointerCancel={onShellPointerUp}
            >
                {/* Top scrim — garante legibilidade do header em qualquer fundo */}
                <div
                    className="absolute top-0 left-0 right-0 z-30 pointer-events-none"
                    style={{
                        height: isLightBg ? "118px" : "92px",
                        background: isLightBg
                            ? "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.28) 60%, rgba(0,0,0,0) 100%)"
                            : "linear-gradient(180deg, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.15) 70%, rgba(0,0,0,0) 100%)",
                    }}
                    aria-hidden
                />

                {/* Progress bars */}
                <div className="absolute top-0 left-0 right-0 flex gap-1 px-3 pt-[max(10px,env(safe-area-inset-top))] z-40">
                    {group.stories.map((_, i) => (
                        <div
                            key={i}
                            className="flex-1 h-[3px] rounded-full overflow-hidden"
                            style={{ background: "rgba(255,255,255,0.32)" }}
                        >
                            <div
                                className="h-full"
                                style={{
                                    width: `${i < si ? 100 : i === si ? progress : 0}%`,
                                    background: "#ffffff",
                                    transition: i === si ? "none" : "width 200ms ease-out",
                                    boxShadow: "0 0 6px rgba(255,255,255,0.4)",
                                }}
                            />
                        </div>
                    ))}
                </div>

                {/* Header */}
                <div className="absolute top-[max(20px,calc(env(safe-area-inset-top)+12px))] left-3 right-3 flex items-center gap-2.5 z-40" data-no-drag>
                    <div className="sv-ring">
                        <div className="bg-black rounded-full p-[2px]">
                            <Avatar user={group.author} size={36} />
                        </div>
                    </div>
                    <div className="flex-1 min-w-0" style={{ textShadow: "0 1px 6px rgba(0,0,0,0.55)" }}>
                        <div className="flex items-center gap-1.5">
                            <span className="text-white font-heading font-medium text-[14px] tracking-tight truncate">{group.author.name}</span>
                            {group.author.verified && <Sparkles size={12} className="text-white" />}
                            {(paused || replyFocus) && (
                                <span className="ml-1 inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-white/80">
                                    <Pause size={10} strokeWidth={2.4} /> pausa
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2 text-white/80 font-mono text-[10.5px]">
                            <span>@{group.author.username}</span>
                            <span>·</span>
                            <span>{relativeTime(story.created_at)}</span>
                            {audienceTag && <span className="px-1.5 py-0.5 rounded-full bg-black/35 text-white text-[9.5px]">{audienceTag}</span>}
                        </div>
                    </div>
                    {story.media_type === "video" && (
                        <button
                            onClick={(e) => { e.stopPropagation(); setMuted((m) => !m); }}
                            data-testid="story-mute-toggle"
                            className="p-2 rounded-full bg-black/35 hover:bg-black/55 text-white backdrop-blur tap-shrink"
                            aria-label={muted ? "Activar som" : "Silenciar"}
                        >
                            {muted ? <VolumeX size={15} strokeWidth={2} /> : <Volume2 size={15} strokeWidth={2} />}
                        </button>
                    )}
                    <button
                        onClick={(e) => { e.stopPropagation(); setMoreOpen((o) => !o); }}
                        data-testid="story-more-btn"
                        className="p-2 rounded-full bg-black/35 hover:bg-black/55 text-white backdrop-blur tap-shrink"
                        aria-label="Mais"
                    >
                        <MoreHorizontal size={16} strokeWidth={2} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onClose(); }}
                        data-testid="story-close"
                        className="p-2 rounded-full bg-black/35 hover:bg-black/55 text-white backdrop-blur tap-shrink"
                    >
                        <X size={16} strokeWidth={2} />
                    </button>
                </div>

                {/* Media content */}
                {story.media_type === "text" ? (
                    <div className="absolute inset-0 grid place-items-center px-8 py-16" style={{ background: bgCss(bgKey), color: textColor }}>
                        <div
                            className="text-center break-words"
                            style={{
                                ...fStyle,
                                fontSize: textFontSize(story.text_content),
                                color: textColor,
                                textShadow: isLightBg ? "none" : "0 2px 24px rgba(0,0,0,0.3)",
                                ...decorStyle,
                            }}
                        >
                            {story.text_content}
                        </div>
                    </div>
                ) : story.media_type === "video" ? (
                    <video
                        ref={videoRef}
                        src={story.video}
                        autoPlay loop playsInline
                        muted={muted}
                        className="absolute inset-0 w-full h-full object-cover bg-black"
                        data-testid="story-video"
                    />
                ) : (
                    <img src={story.image} alt="" className="absolute inset-0 w-full h-full object-cover bg-black" />
                )}

                {/* Subtle bottom gradient for readability */}
                <div className="absolute bottom-0 left-0 right-0 h-44 bg-gradient-to-t from-black/70 to-transparent pointer-events-none z-10" />

                {/* Caption */}
                {story.caption && story.media_type !== "text" && (
                    <div
                        className="absolute bottom-32 left-4 right-4 z-30 text-center pointer-events-none"
                        style={{
                            fontFamily: fStyle.fontFamily,
                            fontWeight: fStyle.fontWeight,
                            color: textColor,
                            fontSize: "20px",
                            textShadow: "0 2px 16px rgba(0,0,0,0.7)",
                            ...decorStyle,
                        }}
                    >
                        {story.caption}
                    </div>
                )}

                {/* Stickers overlay */}
                <div className="absolute inset-0 z-25" style={{ pointerEvents: "auto" }}>
                    <StoryStickerOverlay
                        story={story}
                        isAuthor={isMine}
                        onPause={setPaused}
                        onUpdateSticker={onUpdateSticker}
                    />
                </div>

                {/* Tap ripple feedback */}
                {ripple && (
                    <span className="sv-tap-feedback" style={{ left: ripple.x, top: ripple.y }} key={ripple.id} />
                )}

                {/* Reaction bursts */}
                <div className="absolute inset-0 z-30 pointer-events-none">
                    {bursts.map((b) => (
                        <div key={b.id} className="absolute left-1/2 bottom-24 text-[40px] sv-burst" style={{ filter: "drop-shadow(0 4px 20px rgba(255,255,255,0.6))" }}>
                            {b.emoji}
                        </div>
                    ))}
                </div>

                {/* Paused indicator */}
                {(paused || replyFocus) && (
                    <div className="absolute top-[max(72px,calc(env(safe-area-inset-top)+60px))] left-1/2 -translate-x-1/2 z-40 sv-paused-pill px-3 py-1 rounded-full bg-black/70 backdrop-blur text-white text-[10px] font-mono uppercase tracking-wider inline-flex items-center gap-1.5 pointer-events-none">
                        <Pause size={10} strokeWidth={2.6} /> em pausa
                    </div>
                )}

                {/* Bottom actions */}
                <div className="absolute bottom-0 left-0 right-0 z-40 px-3 pt-12 pb-[max(16px,env(safe-area-inset-bottom))]" data-no-drag>
                    {/* Quick reactions row */}
                    {showReactions && story.allow_reactions && !isMine && (
                        <div className="mb-2 flex justify-center gap-1.5 sv-react-pop" data-testid="story-reactions-bar">
                            {STORY_REACTIONS.map((e) => (
                                <button
                                    key={e}
                                    onClick={(ev) => { ev.stopPropagation(); react(e); }}
                                    className={`sv-react-orb w-11 h-11 rounded-full grid place-items-center text-[22px] bg-white/15 hover:bg-white/30 ${
                                        story.viewer_reaction === e ? "is-selected bg-white/40" : ""
                                    }`}
                                    data-testid={`story-react-${e}`}
                                >
                                    {e}
                                </button>
                            ))}
                        </div>
                    )}

                    {isMine ? (
                        <div className="flex items-center justify-between gap-3">
                            <button
                                onClick={(e) => { e.stopPropagation(); setViewersOpen(true); }}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/15 hover:bg-white/25 text-white backdrop-blur font-mono text-[12px] tap-shrink"
                                data-testid="story-viewers-btn"
                            >
                                <Eye size={14} strokeWidth={2.2} />
                                <span className="font-medium tabular-nums">{story.viewers_count}</span>
                                {Object.keys(story.reactions || {}).length > 0 && (
                                    <span className="text-white/70">· {Object.entries(story.reactions).slice(0, 3).map(([e, n]) => `${e}${n}`).join(" ")}</span>
                                )}
                                {story.is_hot && (
                                    <span className="ml-1 inline-flex items-center gap-0.5 text-white">
                                        <Flame size={11} />
                                    </span>
                                )}
                            </button>
                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={(e) => { e.stopPropagation(); setInsightsOpen(true); }}
                                    className="p-2.5 rounded-full bg-white/15 hover:bg-white/25 text-white backdrop-blur tap-shrink"
                                    data-testid="story-insights-btn"
                                    title="Insights SSS-Tier"
                                >
                                    <BarChart3 size={15} strokeWidth={2.2} />
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); addToHighlight(); }} className="p-2.5 rounded-full bg-white/15 hover:bg-white/25 text-white backdrop-blur tap-shrink" data-testid="story-highlight-btn" title="Adicionar a destaque">
                                    <Star size={15} strokeWidth={2.2} />
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); deleteStory(); }} className="p-2.5 rounded-full bg-red-500/85 hover:bg-red-500 text-white backdrop-blur tap-shrink" data-testid="story-delete">
                                    <Trash2 size={15} strokeWidth={2.2} />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {/* Smart-reply chips — SSS-Tier */}
                            {!replyValue && quickReplies.length > 0 && story.allow_replies && (
                                <div
                                    className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1"
                                    data-testid="story-quick-replies"
                                >
                                    {quickReplies.map((qr, i) => (
                                        <button
                                            key={i}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setReplyValue(qr);
                                            }}
                                            className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-[12px] whitespace-nowrap backdrop-blur tap-shrink border border-white/15"
                                            data-testid={`story-quick-reply-${i}`}
                                        >
                                            {qr}
                                        </button>
                                    ))}
                                </div>
                            )}
                            <div className="flex items-center gap-2">
                            <input
                                value={replyValue}
                                onChange={(e) => setReplyValue(e.target.value)}
                                onFocus={() => setReplyFocus(true)}
                                onBlur={() => setReplyFocus(false)}
                                onKeyDown={(e) => { if (e.key === "Enter") sendReply(); }}
                                onClick={(e) => e.stopPropagation()}
                                disabled={!story.allow_replies}
                                placeholder={story.allow_replies ? `Responder a @${group.author.username}…` : "Respostas desactivadas"}
                                className="flex-1 px-4 py-2.5 rounded-full bg-white/10 border border-white/20 backdrop-blur text-white placeholder-white/55 text-[13.5px] outline-none focus:bg-white/15 focus:border-white/40 disabled:opacity-50"
                                data-testid="story-reply-input"
                            />
                            {replyValue.trim() ? (
                                <button onClick={(e) => { e.stopPropagation(); sendReply(); }} className="p-2.5 rounded-full bg-black hover:bg-black/85 text-white tap-shrink" data-testid="story-send-reply">
                                    <Send size={16} strokeWidth={2.2} />
                                </button>
                            ) : (
                                <>
                                    {story.allow_reactions && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setShowReactions((s) => !s); }}
                                            className={`p-2.5 rounded-full backdrop-blur text-white tap-shrink ${
                                                showReactions ? "bg-white/30" : "bg-white/10 hover:bg-white/20"
                                            }`}
                                            data-testid="story-reactions-toggle"
                                            aria-label="Reacções rápidas"
                                        >
                                            <Sparkles size={16} strokeWidth={2.2} />
                                        </button>
                                    )}
                                    {story.allow_reactions && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); quickHeart(); }}
                                            className={`p-2.5 rounded-full backdrop-blur text-white tap-shrink ${
                                                story.viewer_reaction === "❤️" ? "bg-red-500" : "bg-white/10 hover:bg-white/20"
                                            }`}
                                            data-testid="story-quick-heart"
                                            aria-label="❤️"
                                        >
                                            <Heart size={16} strokeWidth={2.2} fill={story.viewer_reaction === "❤️" ? "currentColor" : "none"} />
                                        </button>
                                    )}
                                </>
                            )}
                            </div>
                        </div>
                    )}
                </div>

                {/* More menu */}
                {moreOpen && (
                    <div className="absolute top-[max(60px,calc(env(safe-area-inset-top)+48px))] right-3 z-50 w-60 bg-black/95 backdrop-blur-xl rounded-2xl border border-white/15 shadow-2xl py-1 text-white font-mono text-[12px] sc-toolbar-in" data-testid="story-more-menu" data-no-drag onClick={(e) => e.stopPropagation()}>
                        {!isMine && (
                            <button onClick={toggleStoriesMute} className="w-full px-4 py-2.5 text-left hover:bg-white/10 flex items-center gap-2.5">
                                <BellOff size={13} strokeWidth={2} />
                                Silenciar stories de @{group.author.username}
                            </button>
                        )}
                        {isMine && (
                            <>
                                <button onClick={addToHighlight} className="w-full px-4 py-2.5 text-left hover:bg-white/10 flex items-center gap-2.5">
                                    <Star size={13} strokeWidth={2} />
                                    Adicionar a destaque
                                </button>
                                <button onClick={() => { setMoreOpen(false); setInsightsOpen(true); }} className="w-full px-4 py-2.5 text-left hover:bg-white/10 flex items-center gap-2.5" data-testid="story-more-insights">
                                    <BarChart3 size={13} strokeWidth={2} />
                                    Insights SSS-Tier
                                </button>
                                <button onClick={() => { setMoreOpen(false); setViewersOpen(true); }} className="w-full px-4 py-2.5 text-left hover:bg-white/10 flex items-center gap-2.5">
                                    <Eye size={13} strokeWidth={2} />
                                    Ver visualizações
                                </button>
                                <div className="my-1 mx-3 h-px bg-white/10" />
                                <button onClick={deleteStory} className="w-full px-4 py-2.5 text-left hover:bg-white/10 text-red-300 flex items-center gap-2.5">
                                    <Trash2 size={13} strokeWidth={2} />
                                    Apagar
                                </button>
                            </>
                        )}
                    </div>
                )}

                {viewersOpen && isMine && (
                    <ViewersSheet storyId={story.id} onClose={() => setViewersOpen(false)} />
                )}

                {insightsOpen && isMine && (
                    <StoryInsightsSheet storyId={story.id} onClose={() => setInsightsOpen(false)} />
                )}
            </div>
        </div>
    );
}

function textFontSize(text) {
    const n = (text || "").length;
    if (n < 30) return "44px";
    if (n < 80) return "34px";
    if (n < 160) return "26px";
    if (n < 280) return "20px";
    return "16px";
}
