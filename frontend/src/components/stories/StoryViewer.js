import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { X, Heart, Send, MoreHorizontal, Eye, Volume2, VolumeX, Trash2, Star, BellOff, Bell, Sparkles } from "lucide-react";
import { api, toastApiError } from "../../lib/api";
import { Avatar } from "../Avatar";
import { useAuth } from "../../context/AuthContext";
import { useEscapeKey } from "../../hooks/useClickOutside";
import { toast } from "sonner";
import { StoryStickerOverlay } from "./StoryStickerOverlay";
import { STORY_REACTIONS, bgCss, fontStyleFor } from "./storyConstants";
import { ViewersSheet } from "./ViewersSheet";

function relativeTime(iso) {
    if (!iso) return "";
    const t = new Date(iso).getTime();
    const diff = Math.floor((Date.now() - t) / 1000);
    if (diff < 60) return "agora";
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
}

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
    const [stickerUpdates, setStickerUpdates] = useState({}); // {sticker_id: enrichedSticker}
    const intervalRef = useRef(null);
    const startRef = useRef(Date.now());
    const elapsedRef = useRef(0);
    const videoRef = useRef(null);

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

    // Notificar viewer
    useEffect(() => {
        if (!story) return;
        api.post(`/stories/${story.id}/view`).catch(() => {});
        setProgress(0);
        startRef.current = Date.now();
        elapsedRef.current = 0;
        setStickerUpdates({});
        setReplyValue("");
        setShowReactions(false);
        setMoreOpen(false);
        // eslint-disable-next-line
    }, [gi, si]);

    // Progress loop (pausa quando paused, replyFocus, viewersOpen, moreOpen)
    useEffect(() => {
        if (!story) return;
        const isPaused = paused || replyFocus || viewersOpen || moreOpen;
        intervalRef.current = setInterval(() => {
            if (isPaused) {
                startRef.current = Date.now() - elapsedRef.current;
                return;
            }
            elapsedRef.current = Date.now() - startRef.current;
            const p = Math.min(100, (elapsedRef.current / dur) * 100);
            setProgress(p);
            if (p >= 100) {
                clearInterval(intervalRef.current);
                next();
            }
        }, 50);
        return () => clearInterval(intervalRef.current);
        // eslint-disable-next-line
    }, [gi, si, paused, replyFocus, viewersOpen, moreOpen, dur]);

    // Sync vídeo play/pause
    useEffect(() => {
        const v = videoRef.current;
        if (!v) return;
        v.muted = muted;
        if (paused || replyFocus || viewersOpen || moreOpen) {
            try { v.pause(); } catch { /**/ }
        } else {
            try { v.play(); } catch { /**/ }
        }
    }, [paused, replyFocus, viewersOpen, moreOpen, muted, gi, si]);

    const next = useCallback(() => {
        if (si + 1 < group.stories.length) setSi(si + 1);
        else if (gi + 1 < groups.length) { setGi(gi + 1); setSi(0); }
        else onClose();
    }, [si, gi, group, groups, onClose]);

    const prev = useCallback(() => {
        if (si > 0) setSi(si - 1);
        else if (gi > 0) { setGi(gi - 1); setSi(groups[gi - 1].stories.length - 1); }
    }, [si, gi, groups]);

    const onUpdateSticker = useCallback((stickerId, newSticker) => {
        setStickerUpdates((prev) => ({ ...prev, [stickerId]: newSticker }));
    }, []);

    const react = async (emoji) => {
        if (!story?.allow_reactions) return;
        const prev = story.viewer_reaction;
        const toggling = prev === emoji;
        try {
            const r = await api.post(`/stories/${story.id}/react`, { emoji });
            // optimistic local merge na próxima carga; aqui mostra toast curto
            toast.success(toggling ? "Reacção removida" : `Reagiste com ${emoji}`);
            if (navigator.vibrate) navigator.vibrate(toggling ? 8 : [10, 40, 10]);
            // actualizar baseStory in-place
            baseStory.viewer_reaction = r.data.reaction;
            setShowReactions(false);
        } catch (e) { toastApiError(e); }
    };

    const quickHeart = () => react("❤️");

    const sendReply = async () => {
        const v = replyValue.trim();
        if (!v) return;
        if (!story?.allow_replies) {
            toast.error("Respostas desactivadas neste story");
            return;
        }
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

    if (!story) return null;

    const bgKey = story.background || "coral";
    const fStyle = fontStyleFor(story.font_style || "modern");
    const textColor = story.text_color || "#ffffff";
    const audienceTag = story.audience === "roda" ? "🫂 Roda" : story.audience === "following" ? "👥 A seguir" : null;

    return (
        <div className="fixed inset-0 z-[90] bg-black/95 grid place-items-center select-none" onClick={onClose} data-testid="story-viewer">
            <div
                className="relative w-full max-w-md h-full lg:h-auto lg:aspect-[9/16] bg-black lg:rounded-3xl overflow-hidden border border-white/10 shadow-[0_40px_100px_-10px_rgba(0,0,0,0.6)]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Progress bars */}
                <div className="absolute top-0 left-0 right-0 flex gap-1 p-3 z-40">
                    {group.stories.map((_, i) => (
                        <div key={i} className="flex-1 h-[2.5px] bg-white/25 rounded-full overflow-hidden">
                            <div className="h-full bg-white" style={{ width: `${i < si ? 100 : i === si ? progress : 0}%`, transition: "width 50ms linear" }} />
                        </div>
                    ))}
                </div>

                {/* Header */}
                <div className="absolute top-7 left-3 right-3 flex items-center gap-2.5 z-40">
                    <Avatar user={group.author} size={36} className="ring-2 ring-white/80" />
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                            <span className="text-white font-heading font-medium text-[14px] tracking-tight truncate">{group.author.name}</span>
                            {group.author.verified && <Sparkles size={12} className="text-coral" />}
                        </div>
                        <div className="flex items-center gap-2 text-white/65 font-mono text-[10.5px]">
                            <span>@{group.author.username}</span>
                            <span>·</span>
                            <span>{relativeTime(story.created_at)}</span>
                            {audienceTag && <span className="px-1.5 py-0.5 rounded-full bg-white/15 text-[9.5px] font-mono">{audienceTag}</span>}
                        </div>
                    </div>
                    {story.media_type === "video" && (
                        <button
                            onClick={() => setMuted((m) => !m)}
                            data-testid="story-mute-toggle"
                            className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur tap-shrink"
                            aria-label={muted ? "Activar som" : "Silenciar"}
                        >
                            {muted ? <VolumeX size={15} strokeWidth={2} /> : <Volume2 size={15} strokeWidth={2} />}
                        </button>
                    )}
                    <button
                        onClick={() => setMoreOpen((o) => !o)}
                        data-testid="story-more-btn"
                        className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur tap-shrink"
                        aria-label="Mais"
                    >
                        <MoreHorizontal size={16} strokeWidth={2} />
                    </button>
                    <button onClick={onClose} data-testid="story-close" className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur tap-shrink">
                        <X size={16} strokeWidth={2} />
                    </button>
                </div>

                {/* Media content */}
                {story.media_type === "text" ? (
                    <div className="absolute inset-0 grid place-items-center px-8 py-16" style={{ background: bgCss(bgKey), color: textColor }}>
                        <div className="text-center break-words" style={{ ...fStyle, fontSize: textFontSize(story.text_content), color: textColor, textShadow: bgKey === "papel" || bgKey === "pastel" || bgKey === "praia" ? "none" : "0 2px 24px rgba(0,0,0,0.3)" }}>
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

                {/* Caption */}
                {story.caption && story.media_type !== "text" && (
                    <div className="absolute bottom-32 left-4 right-4 z-30 text-white font-display text-[20px] font-light tracking-tight leading-tight drop-shadow-[0_2px_16px_rgba(0,0,0,0.7)]">
                        {story.caption}
                    </div>
                )}

                {/* Stickers overlay */}
                <div className="absolute inset-0 pointer-events-none z-25">
                    <div className="absolute inset-0 pointer-events-auto" style={{ pointerEvents: "none" }}>
                        <div style={{ position: "relative", width: "100%", height: "100%", pointerEvents: "auto" }}>
                            <StoryStickerOverlay
                                story={story}
                                isAuthor={isMine}
                                onPause={setPaused}
                                onUpdateSticker={onUpdateSticker}
                            />
                        </div>
                    </div>
                </div>

                {/* Tap zones */}
                <button
                    onClick={prev}
                    onPointerDown={() => setPaused(true)}
                    onPointerUp={() => setPaused(false)}
                    onPointerLeave={() => setPaused(false)}
                    className="absolute left-0 top-16 bottom-24 w-1/3 z-20"
                    aria-label="anterior"
                    data-testid="story-prev"
                />
                <button
                    onClick={next}
                    onPointerDown={() => setPaused(true)}
                    onPointerUp={() => setPaused(false)}
                    onPointerLeave={() => setPaused(false)}
                    className="absolute right-0 top-16 bottom-24 w-1/3 z-20"
                    aria-label="próximo"
                    data-testid="story-next"
                />

                {/* Bottom actions */}
                <div className="absolute bottom-0 left-0 right-0 z-40 px-3 pb-4 pt-12 bg-gradient-to-t from-black/70 via-black/30 to-transparent">
                    {/* Quick reactions bar (toggleable) */}
                    {showReactions && story.allow_reactions && !isMine && (
                        <div className="mb-2 flex justify-center gap-1.5 animate-fade-in" data-testid="story-reactions-bar">
                            {STORY_REACTIONS.map((e) => (
                                <button
                                    key={e}
                                    onClick={() => react(e)}
                                    className={`w-10 h-10 rounded-full grid place-items-center text-[22px] bg-white/15 hover:bg-white/30 hover:scale-125 transition tap-shrink ${
                                        story.viewer_reaction === e ? "bg-white/40 ring-2 ring-white" : ""
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
                                onClick={() => setViewersOpen(true)}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-white/15 hover:bg-white/25 text-white backdrop-blur font-mono text-[12px] tap-shrink"
                                data-testid="story-viewers-btn"
                            >
                                <Eye size={14} strokeWidth={2.2} />
                                <span className="font-medium tabular-nums">{story.viewers_count}</span>
                                {Object.keys(story.reactions || {}).length > 0 && (
                                    <span className="text-white/70">· {Object.entries(story.reactions).slice(0, 3).map(([e, n]) => `${e}${n}`).join(" ")}</span>
                                )}
                            </button>
                            <div className="flex items-center gap-1.5">
                                <button onClick={addToHighlight} className="p-2.5 rounded-full bg-white/15 hover:bg-white/25 text-white backdrop-blur tap-shrink" data-testid="story-highlight-btn" title="Adicionar a destaque">
                                    <Star size={15} strokeWidth={2.2} />
                                </button>
                                <button onClick={deleteStory} className="p-2.5 rounded-full bg-red-500/85 hover:bg-red-500 text-white backdrop-blur tap-shrink" data-testid="story-delete">
                                    <Trash2 size={15} strokeWidth={2.2} />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <input
                                value={replyValue}
                                onChange={(e) => setReplyValue(e.target.value)}
                                onFocus={() => setReplyFocus(true)}
                                onBlur={() => setReplyFocus(false)}
                                onKeyDown={(e) => { if (e.key === "Enter") sendReply(); }}
                                disabled={!story.allow_replies}
                                placeholder={story.allow_replies ? `Responder a @${group.author.username}…` : "Respostas desactivadas"}
                                className="flex-1 px-4 py-2.5 rounded-full bg-white/10 border border-white/20 backdrop-blur text-white placeholder-white/55 text-[13.5px] outline-none focus:bg-white/15 focus:border-white/40 disabled:opacity-50"
                                data-testid="story-reply-input"
                            />
                            {replyValue.trim() ? (
                                <button onClick={sendReply} className="p-2.5 rounded-full bg-coral hover:bg-coral-deep text-white tap-shrink" data-testid="story-send-reply">
                                    <Send size={16} strokeWidth={2.2} />
                                </button>
                            ) : (
                                <>
                                    {story.allow_reactions && (
                                        <button
                                            onClick={() => setShowReactions((s) => !s)}
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
                                            onClick={quickHeart}
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
                    )}
                </div>

                {/* More menu */}
                {moreOpen && (
                    <div className="absolute top-16 right-3 z-50 w-56 bg-black/95 backdrop-blur-xl rounded-2xl border border-white/15 shadow-2xl py-1 text-white font-mono text-[12px]" data-testid="story-more-menu">
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
                                <button onClick={() => { setMoreOpen(false); setViewersOpen(true); }} className="w-full px-4 py-2.5 text-left hover:bg-white/10 flex items-center gap-2.5">
                                    <Eye size={13} strokeWidth={2} />
                                    Ver actividade
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
            </div>
        </div>
    );
}

// Tamanho da fonte para text-story em função do comprimento
function textFontSize(text) {
    const n = (text || "").length;
    if (n < 30) return "44px";
    if (n < 80) return "34px";
    if (n < 160) return "26px";
    if (n < 280) return "20px";
    return "16px";
}
