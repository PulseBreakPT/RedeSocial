import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    Heart,
    MessageCircle,
    Bookmark,
    Share2,
    Repeat2,
    Eye,
    Pin,
    Pencil,
    Globe,
    Users as UsersIcon,
    AtSign,
} from "lucide-react";
import { api, formatApiError, toastApiError } from "../lib/api";
import { Avatar } from "./Avatar";
import { VerifiedBadge } from "./VerifiedBadge";
import { ExpandableText } from "./ExpandableText";
import { SocialProofRow } from "./SocialProofRow";
import { ImageLightbox } from "./ImageLightbox";
import { ImageCarousel } from "./ImageCarousel";
import { PostMenu } from "./PostMenu";
import { confirmDialog } from "./ConfirmDialog";
import { EditPostModal } from "./EditPostModal";
import { QuoteModal } from "./QuoteModal";
import { RepostMenu } from "./RepostMenu";
import { PostAnalyticsModal } from "./PostAnalyticsModal";
import { PostPoll } from "./PostPoll";
import { PostReactions } from "./PostReactions";
import { EditHistoryButton } from "./EditHistoryModal";
import { ReasonChip } from "./ReasonChip";
import { ThermometerFetch } from "./ThermometerFetch";
import { PostLiveSignals } from "./PostLiveSignals";
import { HoverProfileCard } from "./HoverProfileCard";
import { LikersSheet } from "./LikersSheet";
import { useFeedPulse } from "../hooks/useFeedPulse";
import { useAuth } from "../context/AuthContext";
import { smartTime, fullTime } from "../lib/time";
import { haptic } from "../lib/haptics";
import { shareEntity, postUrl } from "../lib/sharing";
import { toast } from "sonner";

function formatNum(n) {
    if (n < 1000) return String(n);
    if (n < 1000000) return `${(n / 1000).toFixed(1).replace(".0", "")}K`;
    return `${(n / 1000000).toFixed(1).replace(".0", "")}M`;
}

const AUDIENCE_META = {
    everyone: { Icon: Globe, label: "Toda a gente" },
    following: { Icon: UsersIcon, label: "Quem sigo" },
    mentioned: { Icon: AtSign, label: "Apenas mencionados" },
};

function PostBody({ post, onChange, clickable, showRepostHeader, onDelete }) {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [liked, setLiked] = useState(post.liked);
    const [likes, setLikes] = useState(post.likes_count);
    const [reposts, setRepublicações] = useState(post.reposts_count || 0);
    const [reposted, setReposted] = useState(!!post.reposted);
    const [bookmarked, setBookmarked] = useState(!!post.bookmarked);
    const [views, setViews] = useState(post.views || 0);
    const [pinned, setPinned] = useState(!!post.pinned);
    const [editedAt, setEditadAt] = useState(post.edited_at);
    const [editHistory, setEditHistory] = useState(post.edit_history || []);
    const [content, setContent] = useState(post.content);
    const [poll, setPoll] = useState(post.poll);
    const [reactions, setReactions] = useState(post.reactions);
    const [animLike, setAnimLike] = useState(false);
    const [animBookmark, setAnimBookmark] = useState(false);
    const [lightboxIdx, setLightboxIdx] = useState(-1);
    const [editing, setEditing] = useState(false);
    const [quoting, setQuoting] = useState(false);
    const [analytics, setAnalytics] = useState(false);
    const [menuForceOpen, setMenuForceOpen] = useState(false);
    const [likersOpen, setLikersOpen] = useState(false);
    const viewedRef = useRef(false);
    const longPressTimer = useRef(null);
    const longPressFired = useRef(false);
    const isOwn = user?.id === post.author?.id;
    const audience = post.reply_audience || "everyone";
    const AudMeta = AUDIENCE_META[audience] || AUDIENCE_META.everyone;
    const AudIcon = AudMeta.Icon;

    const images = post.images && post.images.length > 0
        ? post.images
        : (post.image ? [post.image] : []);

    const articleRef = useRef(null);
    useEffect(() => {
        if (!articleRef.current || viewedRef.current) return;
        const obs = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && !viewedRef.current) {
                    viewedRef.current = true;
                    api.post(`/posts/${post.id}/view`)
                        .then((r) => setViews(r.data.views))
                        .catch(() => {});
                    obs.disconnect();
                }
            },
            { threshold: 0.6 },
        );
        obs.observe(articleRef.current);
        return () => obs.disconnect();
    }, [post.id]);

    const toggleLike = async (e) => {
        e.stopPropagation();
        const prevLiked = liked, prevLikes = likes;
        setLiked(!prevLiked);
        setLikes(prevLiked ? prevLikes - 1 : prevLikes + 1);
        setAnimLike(true);
        haptic("like");
        setTimeout(() => setAnimLike(false), 280);
        try {
            const { data } = await api.post(`/posts/${post.id}/like`);
            setLiked(data.liked);
            setLikes(data.likes_count);
            onChange?.({ ...post, liked: data.liked, likes_count: data.likes_count });
        } catch (err) {
            setLiked(prevLiked); setLikes(prevLikes);
            toastApiError(err);
        }
    };

    // Used by ImageCarousel double-tap: only LIKES (never unlikes) for a satisfying gesture
    const likeFromDoubleTap = async () => {
        haptic("like");
        if (liked) {
            // Re-trigger the pop animation as feedback, but don't unlike
            setAnimLike(true);
            setTimeout(() => setAnimLike(false), 280);
            return;
        }
        setLiked(true);
        setLikes((n) => n + 1);
        setAnimLike(true);
        setTimeout(() => setAnimLike(false), 280);
        try {
            const { data } = await api.post(`/posts/${post.id}/like`);
            setLiked(data.liked);
            setLikes(data.likes_count);
            onChange?.({ ...post, liked: data.liked, likes_count: data.likes_count });
        } catch (err) {
            setLiked(false);
            setLikes((n) => Math.max(0, n - 1));
            toastApiError(err);
        }
    };

    const doRepost = async () => {
        const prev = reposted;
        setReposted(!prev);
        setRepublicações(prev ? reposts - 1 : reposts + 1);
        try {
            const { data } = await api.post(`/posts/${post.id}/repost`);
            setReposted(data.reposted);
            setRepublicações(data.reposts_count);
            toast.success(data.reposted ? "Republicado" : "Republicação desfeita");
        } catch (err) {
            setReposted(prev);
            setRepublicações(prev ? reposts + 1 : reposts - 1);
            toastApiError(err);
        }
    };

    const toggleBookmark = async (e) => {
        e.stopPropagation();
        const prev = bookmarked;
        setBookmarked(!prev);
        setAnimBookmark(true);
        setTimeout(() => setAnimBookmark(false), 320);
        try {
            const { data } = await api.post(`/posts/${post.id}/bookmark`);
            setBookmarked(data.bookmarked);
            onChange?.({ ...post, bookmarked: data.bookmarked });
            toast.success(data.bookmarked ? "Guardado" : "Removido dos guardados");
        } catch (err) {
            setBookmarked(prev);
            toastApiError(err);
        }
    };

    const share = async (e) => {
        e.stopPropagation();
        await shareEntity({
            url: postUrl(post.id),
            title: post.author?.name ? `${post.author.name} no Lusorae` : "Publicação Lusorae",
            text: (post.content || "").slice(0, 140),
        });
    };

    // Long-press on Like → open Likers sheet (mobile gesture).
    const onLikeLongPressStart = (e) => {
        longPressFired.current = false;
        clearTimeout(longPressTimer.current);
        longPressTimer.current = setTimeout(() => {
            longPressFired.current = true;
            haptic("medium");
            setLikersOpen(true);
        }, 480);
    };
    const onLikeLongPressEnd = () => clearTimeout(longPressTimer.current);
    const onLikeClickGuard = (e) => {
        if (longPressFired.current) {
            e.preventDefault();
            e.stopPropagation();
            longPressFired.current = false;
            return;
        }
        toggleLike(e);
    };

    // Long-press anywhere on the card → opens PostMenu (mobile-friendly affordance).
    const onCardLongPressStart = () => {
        if (showRepostHeader) return;
        clearTimeout(longPressTimer.current);
        longPressTimer.current = setTimeout(() => {
            haptic("medium");
            setMenuForceOpen(true);
            longPressFired.current = true;
        }, 540);
    };
    const onCardLongPressEnd = () => clearTimeout(longPressTimer.current);

    const remove = async () => {
        const ok = await confirmDialog({
            title: "Apagar esta publicação?",
            description: "A publicação, comentários e reações associados serão removidos. Esta ação é irreversível.",
            confirmText: "Apagar publicação",
            danger: true,
        });
        if (!ok) return;
        try {
            await api.delete(`/posts/${post.id}`);
            onDelete?.(post.id);
            toast.success("Publicação apagada");
        } catch (err) {
            toastApiError(err);
        }
    };

    const openDetail = () => clickable && navigate(`/post/${post.id}`);

    // Secondary meta chips (audience, ring, edited) live on a dedicated line below the name
    // so the author row stays scannable and never wraps awkwardly on small screens.
    const hasSecondaryMeta =
        (post.audience_ring && post.audience_ring !== "publico") ||
        audience !== "everyone" ||
        editedAt;

    return (
        <>
            <div
                ref={articleRef}
                onClick={openDetail}
                onTouchStart={onCardLongPressStart}
                onTouchEnd={onCardLongPressEnd}
                onTouchMove={onCardLongPressEnd}
                onTouchCancel={onCardLongPressEnd}
                className={clickable ? "cursor-pointer" : ""}
            >
                {pinned && (
                    <div className="flex items-center gap-1.5 type-overline ml-12 mb-2 normal-case tracking-[0.16em] text-black/50" data-testid={`pinned-${post.id}`}>
                        <Pin size={10} strokeWidth={1.8} className="text-black/55" />
                        <span>Fixado no perfil</span>
                    </div>
                )}
                <div className="flex gap-3 lg:gap-4">
                    <HoverProfileCard username={post.author?.username} to={`/u/${post.author?.username}`} onClick={(e) => e.stopPropagation()} className="flex-shrink-0 self-start">
                        <div className="relative transition-transform duration-300 hover:-translate-y-px">
                            <Avatar user={post.author} size={44} showOnline />
                        </div>
                    </HoverProfileCard>
                    <div className="flex-1 min-w-0">
                        {/* Author row — clean, never wraps clutter */}
                        <div className="flex items-center gap-1.5 min-w-0">
                            <HoverProfileCard
                                username={post.author?.username}
                                to={`/u/${post.author?.username}`}
                                onClick={(e) => e.stopPropagation()}
                                className="font-heading font-semibold tracking-tight hover:underline underline-offset-4 decoration-black/20 truncate text-black"
                            >
                                {post.author?.name}
                            </HoverProfileCard>
                            {post.author?.verified && <VerifiedBadge size={14} />}
                            <span className="font-mono text-[12px] text-black/45 truncate">@{post.author?.username}</span>
                            <span className="text-black/20" aria-hidden>·</span>
                            <span
                                className="font-mono text-[12px] text-black/45 tabular-nums whitespace-nowrap"
                                title={fullTime(post.created_at)}
                            >
                                {smartTime(post.created_at)}
                            </span>
                            <ThermometerFetch
                                kind="post"
                                value={post.id}
                                range="24h"
                                size="xs"
                                testid={`thermometer-post-${post.id}`}
                            />
                            {!showRepostHeader && (
                                <div className="ml-auto pl-1">
                                    <PostMenu
                                        post={{ ...post, content, pinned }}
                                        isOwn={isOwn}
                                        onEdit={() => setEditing(true)}
                                        onDelete={remove}
                                        onPinToggle={setPinned}
                                        onAnalytics={() => setAnalytics(true)}
                                        externallyOpen={menuForceOpen ? true : null}
                                        onExternallyClose={() => setMenuForceOpen(false)}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Secondary meta — audience, ring, edited (only when relevant) */}
                        {hasSecondaryMeta && (
                            <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                {post.audience_ring && post.audience_ring !== "publico" && (
                                    <span
                                        className="inline-flex items-center gap-1 font-mono text-[10px] font-medium text-black/65 px-1.5 py-0.5 rounded-full border border-black/[0.08] bg-white/70 backdrop-blur-sm"
                                        title={
                                            post.audience_ring === "amigos"
                                                ? "Anel azul-tejo — apenas seguidores"
                                                : "Anel terracota — grupo íntimo (Tasca)"
                                        }
                                        data-testid={`ring-${post.id}`}
                                    >
                                        <span
                                            className="w-2 h-2 rounded-full"
                                            style={{
                                                background:
                                                    post.audience_ring === "amigos"
                                                        ? "linear-gradient(135deg, #6a91cc 0%, #2c6fd1 100%)"
                                                        : "linear-gradient(135deg, #df8a7d 0%, #c64a3d 100%)",
                                            }}
                                        />
                                        {post.audience_ring === "amigos" ? "Amigos" : "Tasca"}
                                    </span>
                                )}
                                {audience !== "everyone" && (
                                    <span
                                        className="inline-flex items-center gap-1 font-mono text-[10px] font-medium text-black/60 px-1.5 py-0.5 rounded-full border border-black/[0.08] bg-white/70 backdrop-blur-sm"
                                        title={`Respostas: ${AudMeta.label}`}
                                        data-testid={`audience-${post.id}`}
                                    >
                                        <AudIcon size={9} strokeWidth={2} /> {AudMeta.label}
                                    </span>
                                )}
                                {editedAt && (
                                    <span
                                        className="font-mono text-[10px] text-black/45 inline-flex items-center gap-1"
                                        title={`Editado em ${fullTime(editedAt)}`}
                                    >
                                        <Pencil size={9} strokeWidth={1.7} /> editado
                                    </span>
                                )}
                                <EditHistoryButton history={editHistory} currentContent={content} />
                            </div>
                        )}

                        {content && (
                            <ExpandableText
                                text={content}
                                className="mt-1.5 text-[15px] leading-[1.55] text-black/90"
                                testid={`post-text-${post.id}`}
                            />
                        )}

                        {post.reason && <div className="mt-2"><ReasonChip reason={post.reason} /></div>}

                        {/* Collaborators */}
                        {(post.collaborators || []).length > 0 && (
                            <div className="mt-2 flex items-center gap-1.5 flex-wrap" data-testid={`collab-${post.id}`}>
                                <span className="text-[10px] font-mono text-black/50 uppercase tracking-wider">com</span>
                                {(post.collaborators || []).map((c) => (
                                    <Link key={c.id} to={`/u/${c.username}`} onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-black/[0.04] hover:bg-black/[0.08] transition">
                                        <Avatar user={c} size={14} />
                                        <span className="text-[10px] font-mono text-black/70">@{c.username}</span>
                                    </Link>
                                ))}
                            </div>
                        )}

                        {images.length > 0 && (
                            <div
                                className={`mt-3 rounded-2xl overflow-hidden hairline-soft relative ${
                                    showMedia ? "" : "select-none"
                                }`}
                            >
                                <div
                                    className={`${showMedia ? "" : "blur-xl scale-105 pointer-events-none"} transition-[filter,transform] duration-300`}
                                    aria-hidden={!showMedia}
                                >
                                    <ImageCarousel
                                        images={images}
                                        onOpen={(i) => showMedia && setLightboxIdx(i)}
                                        onDoubleTap={() => showMedia && likeFromDoubleTap()}
                                    />
                                </div>
                                {!showMedia && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setNsfwRevealed(true); }}
                                        data-testid={`nsfw-reveal-${post.id}`}
                                        className="absolute inset-0 grid place-items-center text-center px-6"
                                    >
                                        <span className="inline-flex flex-col items-center gap-2 bg-white/90 backdrop-blur-md border border-white/60 rounded-2xl px-4 py-3 shadow-[0_10px_30px_-8px_rgba(13,13,16,0.35)]">
                                            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/55">
                                                Aviso de conteúdo
                                            </span>
                                            <span className="font-heading font-bold text-[14px] text-black">
                                                {post.content_warning || "Conteúdo sensível"}
                                            </span>
                                            <span className="font-mono text-[10px] text-black/55">toca para revelar</span>
                                        </span>
                                    </button>
                                )}
                            </div>
                        )}

                        {poll && (
                            <PostPoll
                                postId={post.id}
                                poll={poll}
                                viewer={user}
                                onUpdate={(p) => {
                                    setPoll(p);
                                    onChange?.({ ...post, poll: p });
                                }}
                            />
                        )}

                        {post.quote_of && (
                            <div
                                onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/post/${post.quote_of.id}`);
                                }}
                                className="mt-3 pl-4 pr-3.5 py-3 border border-black/[0.07] rounded-2xl hover:border-black/[0.14] hover:shadow-[0_6px_20px_-12px_rgba(13,13,16,0.18)] cursor-pointer transition-all duration-200 group/quote relative overflow-hidden"
                                data-testid={`quote-ref-${post.id}`}
                                style={{ background: "rgba(247,245,239,0.55)" }}
                            >
                                <span
                                    aria-hidden
                                    className="absolute left-0 top-0 bottom-0 w-[3px] transition-all duration-300 group-hover/quote:w-[4px]"
                                    style={{ background: "linear-gradient(180deg, #C8102E 0%, #FFCC29 100%)", opacity: 0.9 }}
                                />
                                <div className="flex items-center gap-2 text-sm min-w-0">
                                    <Avatar user={post.quote_of.author} size={20} />
                                    <span className="font-heading font-semibold text-black truncate">{post.quote_of.author?.name}</span>
                                    {post.quote_of.author?.verified && <VerifiedBadge size={11} />}
                                    <span className="font-mono text-xs text-black/45 truncate">@{post.quote_of.author?.username}</span>
                                    <span className="text-black/25" aria-hidden>·</span>
                                    <span className="font-mono text-xs text-black/45 tabular-nums whitespace-nowrap">{smartTime(post.quote_of.created_at)}</span>
                                </div>
                                <p
                                    className="mt-1.5 line-clamp-3 font-editorial italic"
                                    style={{
                                        fontSize: 15,
                                        lineHeight: 1.5,
                                        color: "rgba(10,10,10,0.78)",
                                        fontWeight: 460,
                                        fontVariationSettings: '"opsz" 22, "SOFT" 50',
                                    }}
                                >
                                    {post.quote_of.content}
                                </p>
                            </div>
                        )}

                        {reactions && (
                            <div className="mt-3">
                                <PostReactions
                                    postId={post.id}
                                    reactions={reactions}
                                    viewer={user}
                                    onUpdate={(r) => {
                                        setReactions(r);
                                        onChange?.({ ...post, reactions: r });
                                    }}
                                />
                            </div>
                        )}

                        <div className="post-actions mt-3.5" data-testid={`actions-${post.id}`}>
                            {/* Left cluster — primary engagement */}
                            <div className="post-actions-cluster">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigate(`/post/${post.id}`, { state: { focusComment: true } });
                                    }}
                                    data-testid={`comment-btn-${post.id}`}
                                    className="eng-btn is-commented"
                                    aria-label="Comentar"
                                >
                                    <MessageCircle size={18} strokeWidth={1.7} />
                                    <span className="text-[12.5px] tabular-nums">{formatNum(post.comments_count || 0)}</span>
                                </button>
                                <RepostMenu
                                    postId={post.id}
                                    reposted={reposted}
                                    count={reposts}
                                    onRepost={doRepost}
                                    onQuote={() => setQuoting(true)}
                                />
                                <button
                                    onClick={onLikeClickGuard}
                                    onMouseDown={onLikeLongPressStart}
                                    onMouseUp={onLikeLongPressEnd}
                                    onMouseLeave={onLikeLongPressEnd}
                                    onTouchStart={onLikeLongPressStart}
                                    onTouchEnd={onLikeLongPressEnd}
                                    data-testid={`like-btn-${post.id}`}
                                    className={`eng-btn ${liked ? "is-liked" : ""}`}
                                    title="Gosto · segura para ver quem gostou"
                                    aria-label="Gosto"
                                    aria-pressed={liked}
                                >
                                    <Heart
                                        size={18}
                                        strokeWidth={1.7}
                                        fill={liked ? "currentColor" : "none"}
                                        className={animLike ? "anim-pop" : ""}
                                    />
                                    <span
                                        key={likes}
                                        className={`text-[12.5px] tabular-nums inline-block ${animLike ? "anim-count-roll" : ""}`}
                                    >
                                        {formatNum(likes)}
                                    </span>
                                </button>
                            </div>

                            {/* Right cluster — utility actions */}
                            <div className="post-actions-cluster">
                                <span
                                    className="hidden sm:inline-flex items-center gap-1 text-[11.5px] tabular-nums text-black/45 px-1.5"
                                    title="visualizações"
                                >
                                    <Eye size={14} strokeWidth={1.6} /> {formatNum(views)}
                                </span>
                                <button
                                    onClick={toggleBookmark}
                                    data-testid={`bookmark-btn-${post.id}`}
                                    className={`eng-btn ${bookmarked ? "is-bookmarked" : ""}`}
                                    aria-label="Guardar"
                                    aria-pressed={bookmarked}
                                >
                                    <Bookmark
                                        size={18}
                                        strokeWidth={1.7}
                                        fill={bookmarked ? "currentColor" : "none"}
                                        className={animBookmark ? "anim-pop" : ""}
                                    />
                                </button>
                                <button
                                    onClick={share}
                                    data-testid={`share-btn-${post.id}`}
                                    className="eng-btn is-commented"
                                    aria-label="Partilhar"
                                >
                                    <Share2 size={18} strokeWidth={1.7} />
                                </button>
                            </div>
                        </div>

                        {/* Social proof under the action bar */}
                        <SocialProofRow
                            postId={post.id}
                            likesCount={likes}
                            refreshKey={`${liked}-${likes}`}
                            testid={`social-proof-${post.id}`}
                        />

                        {/* Live signals — "X em conversa · N respostas há pouco · a aquecer" */}
                        <PostLiveSignals postId={post.id} commentsCount={post.comments_count || 0} />
                    </div>
                </div>
            </div>
            {lightboxIdx >= 0 && images[lightboxIdx] && (
                <ImageLightbox src={images[lightboxIdx]} onClose={() => setLightboxIdx(-1)} />
            )}
            {likersOpen && (
                <LikersSheet postId={post.id} onClose={() => setLikersOpen(false)} />
            )}
            {editing && (
                <EditPostModal
                    post={{ ...post, content }}
                    onClose={() => setEditing(false)}
                    onSave={(np) => {
                        setContent(np.content);
                        setEditadAt(np.edited_at);
                        if (np.edit_history) setEditHistory(np.edit_history);
                        onChange?.(np);
                    }}
                />
            )}
            {quoting && (
                <QuoteModal post={{ ...post, content }} onClose={() => setQuoting(false)} />
            )}
            {analytics && (
                <PostAnalyticsModal postId={post.id} onClose={() => setAnalytics(false)} />
            )}
        </>
    );
}

function usePostLiveActivity(postId) {
    // Tracks "is this post live right now?" — receives new_comment WS events
    // and surfaces both a 10-min lingering "live" state (for the soft border)
    // and a transient 18s "new reply" chip pulse.
    const [hasLive, setHasLive] = useState(false);
    const [chipKey, setChipKey] = useState(0); // bumping remounts chip → restarts anim
    const liveTimerRef = useRef(null);
    const chipTimerRef = useRef(null);

    useEffect(() => {
        if (!postId) return;
        const onNew = (e) => {
            if (e?.detail?.post_id !== postId) return;
            setHasLive(true);
            setChipKey((k) => k + 1);
            if (liveTimerRef.current) clearTimeout(liveTimerRef.current);
            if (chipTimerRef.current) clearTimeout(chipTimerRef.current);
            liveTimerRef.current = setTimeout(() => setHasLive(false), 10 * 60 * 1000);
            chipTimerRef.current = setTimeout(() => setChipKey(0), 18000);
        };
        window.addEventListener("vmln:new_comment", onNew);
        return () => {
            window.removeEventListener("vmln:new_comment", onNew);
            if (liveTimerRef.current) clearTimeout(liveTimerRef.current);
            if (chipTimerRef.current) clearTimeout(chipTimerRef.current);
        };
    }, [postId]);

    return { hasLive, chipKey };
}

export function PostCard({ post, onChange, onDelete, clickable = true }) {
    const innerId = post?.repost_of?.id || post?.id;
    const { hasLive, chipKey } = usePostLiveActivity(innerId);
    const { pulse } = useFeedPulse(innerId);
    const liveCls = hasLive ? "live-border-left" : "";
    // Atmospheric halo for hot conversations — never both halos at once;
    // post-card-brasa wins over post-card-hot to avoid visual stacking.
    let heatCls = "";
    if (pulse?.heat === "em_brasa" || pulse?.heat === "a_ferver") heatCls = "post-card-brasa";
    else if (pulse?.heat === "quente") heatCls = "post-card-hot";

    const newReplyChip = chipKey > 0 ? (
        <div
            key={chipKey}
            className="anim-new-reply-chip pointer-events-none absolute top-3 right-4 lg:right-6 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50/90 backdrop-blur text-[10px] font-mono uppercase tracking-wider text-emerald-700/85 border border-emerald-200/60"
            data-testid="new-reply-chip"
        >
            <span className="relative inline-flex w-1 h-1">
                <span className="absolute inset-0 rounded-full bg-emerald-500/85 anim-live-dot" />
            </span>
            novo reply agora
        </div>
    ) : null;

    if (post.repost_of) {
        const inner = post.repost_of;
        return (
            <article
                data-testid={`post-${post.id}`}
                className={`relative px-4 lg:px-6 pt-4 pb-6 hairline-b active:bg-black/[0.02] lg:hover:bg-black/[0.012] transition-colors anim-fade-up ${liveCls} ${heatCls}`}
            >
                {newReplyChip}
                <div className="flex items-center gap-2 type-overline ml-12 mb-2 normal-case tracking-[0.16em]">
                    <Repeat2 size={12} strokeWidth={1.8} className="text-green-soft" />
                    <Link to={`/u/${post.author?.username}`} className="ink-link hover:text-black">
                        @{post.author?.username} republicou
                    </Link>
                </div>
                <PostBody post={inner} onChange={onChange} clickable={clickable} showRepostHeader onDelete={onDelete} />
            </article>
        );
    }

    return (
        <article
            data-testid={`post-${post.id}`}
            className={`relative px-4 py-5 lg:px-6 lg:py-6 hairline-b active:bg-black/[0.02] lg:hover:bg-black/[0.012] transition-colors anim-fade-up ${liveCls} ${heatCls}`}
        >
            {newReplyChip}
            <PostBody post={post} onChange={onChange} clickable={clickable} onDelete={onDelete} />
        </article>
    );
}
