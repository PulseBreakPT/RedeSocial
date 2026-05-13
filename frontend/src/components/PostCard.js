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
import { api, formatApiError } from "../lib/api";
import { Avatar } from "./Avatar";
import { VerifiedBadge } from "./VerifiedBadge";
import { RichText } from "./RichText";
import { ImageLightbox } from "./ImageLightbox";
import { ImageCarousel } from "./ImageCarousel";
import { PostMenu } from "./PostMenu";
import { EditPostModal } from "./EditPostModal";
import { QuoteModal } from "./QuoteModal";
import { RepostMenu } from "./RepostMenu";
import { PostAnalyticsModal } from "./PostAnalyticsModal";
import { PostPoll } from "./PostPoll";
import { PostReactions } from "./PostReactions";
import { EditHistoryButton } from "./EditHistoryModal";
import { useAuth } from "../context/AuthContext";
import { smartTime, fullTime } from "../lib/time";
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
    const [lightboxIdx, setLightboxIdx] = useState(-1);
    const [editing, setEditing] = useState(false);
    const [quoting, setQuoting] = useState(false);
    const [analytics, setAnalytics] = useState(false);
    const viewedRef = useRef(false);
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
        setTimeout(() => setAnimLike(false), 280);
        try {
            const { data } = await api.post(`/posts/${post.id}/like`);
            setLiked(data.liked);
            setLikes(data.likes_count);
            onChange?.({ ...post, liked: data.liked, likes_count: data.likes_count });
        } catch (err) {
            setLiked(prevLiked); setLikes(prevLikes);
            toast.error(formatApiError(err));
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
            toast.error(formatApiError(err));
        }
    };

    const toggleBookmark = async (e) => {
        e.stopPropagation();
        const prev = bookmarked;
        setBookmarked(!prev);
        try {
            const { data } = await api.post(`/posts/${post.id}/bookmark`);
            setBookmarked(data.bookmarked);
            toast.success(data.bookmarked ? "Guardado" : "Removido dos guardados");
        } catch (err) {
            setBookmarked(prev);
            toast.error(formatApiError(err));
        }
    };

    const share = (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`);
        toast.success("Link copiado");
    };

    const remove = async () => {
        if (!window.confirm("Apagar esta publicação?")) return;
        try {
            await api.delete(`/posts/${post.id}`);
            onDelete?.(post.id);
            toast.success("Publicação apagada");
        } catch (err) {
            toast.error(formatApiError(err));
        }
    };

    const openDetail = () => clickable && navigate(`/post/${post.id}`);

    return (
        <>
            <div ref={articleRef} onClick={openDetail} className={clickable ? "cursor-pointer" : ""}>
                {pinned && (
                    <div className="flex items-center gap-1.5 text-xs font-mono text-black/50 ml-12 mb-1.5" data-testid={`pinned-${post.id}`}>
                        <Pin size={12} className="text-accent-vermillion" />
                        <span>Fixado no perfil</span>
                    </div>
                )}
                <div className="flex gap-3 lg:gap-4">
                    <Link to={`/u/${post.author?.username}`} onClick={(e) => e.stopPropagation()}>
                        <Avatar user={post.author} size={44} showOnline />
                    </Link>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <Link
                                to={`/u/${post.author?.username}`}
                                onClick={(e) => e.stopPropagation()}
                                className="font-heading font-semibold tracking-tight hover:underline underline-offset-2 truncate text-black"
                            >
                                {post.author?.name}
                            </Link>
                            {post.author?.verified && <VerifiedBadge size={14} />}
                            <span className="font-mono text-[12px] text-black/45 truncate">@{post.author?.username}</span>
                            <span className="text-black/20">·</span>
                            <span className="font-mono text-[12px] text-black/45" title={fullTime(post.created_at)}>{smartTime(post.created_at)}</span>
                            {editedAt && (
                                <span className="font-mono text-[10px] text-black/45 inline-flex items-center gap-0.5" title={`Editado em ${fullTime(editedAt)}`}>
                                    <Pencil size={9} strokeWidth={1.6} /> editado
                                </span>
                            )}
                            <EditHistoryButton history={editHistory} currentContent={content} />
                            {audience !== "everyone" && (
                                <span
                                    className="inline-flex items-center gap-0.5 font-mono text-[10px] text-black/40 px-1.5 py-0.5 rounded-full border border-black/[0.08]"
                                    title={`Respostas: ${AudMeta.label}`}
                                    data-testid={`audience-${post.id}`}
                                >
                                    <AudIcon size={9} /> {AudMeta.label}
                                </span>
                            )}
                            {!showRepostHeader && (
                                <div className="ml-auto">
                                    <PostMenu
                                        post={{ ...post, content, pinned }}
                                        isOwn={isOwn}
                                        onEdit={() => setEditing(true)}
                                        onDelete={remove}
                                        onPinToggle={setPinned}
                                        onAnalytics={() => setAnalytics(true)}
                                    />
                                </div>
                            )}
                        </div>
                        {content && <RichText text={content} className="mt-1 text-[15px] leading-relaxed text-black/90" />}

                        {images.length > 0 && (
                            <ImageCarousel images={images} onOpen={(i) => setLightboxIdx(i)} />
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
                                className="mt-3 p-3 border border-black/[0.08] rounded-2xl hover:bg-black/[0.02] cursor-pointer transition"
                                data-testid={`quote-ref-${post.id}`}
                            >
                                <div className="flex items-center gap-2 text-sm">
                                    <Avatar user={post.quote_of.author} size={20} />
                                    <span className="font-heading font-semibold text-black">{post.quote_of.author?.name}</span>
                                    {post.quote_of.author?.verified && <VerifiedBadge size={11} />}
                                    <span className="font-mono text-xs text-black/50">@{post.quote_of.author?.username}</span>
                                    <span className="text-black/30">·</span>
                                    <span className="font-mono text-xs text-black/50">{smartTime(post.quote_of.created_at)}</span>
                                </div>
                                <p className="mt-1.5 text-sm text-black/70 line-clamp-3">{post.quote_of.content}</p>
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

                        <div className="flex items-center gap-1 mt-4 -ml-2 text-black/45">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/post/${post.id}`);
                                }}
                                data-testid={`comment-btn-${post.id}`}
                                className="group flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-blue-soft/12 hover:text-blue-soft transition tap-shrink"
                            >
                                <MessageCircle size={17} strokeWidth={1.6} />
                                <span className="font-mono text-xs">{formatNum(post.comments_count || 0)}</span>
                            </button>
                            <RepostMenu
                                reposted={reposted}
                                onRepost={doRepost}
                                onQuote={() => setQuoting(true)}
                            />
                            <span data-testid={`repost-count-${post.id}`} className={`font-mono text-xs -ml-2 mr-2 ${reposted ? "text-green-soft" : ""}`}>
                                {formatNum(reposts)}
                            </span>
                            <button
                                onClick={toggleLike}
                                data-testid={`like-btn-${post.id}`}
                                className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-red-soft/12 hover:text-red-soft transition tap-shrink ${
                                    liked ? "text-red-soft" : ""
                                }`}
                            >
                                <Heart size={17} strokeWidth={1.6} fill={liked ? "currentColor" : "none"} className={animLike ? "anim-pop" : ""} />
                                <span className="font-mono text-xs">{formatNum(likes)}</span>
                            </button>
                            <button
                                onClick={toggleBookmark}
                                data-testid={`bookmark-btn-${post.id}`}
                                className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-yellow-500/12 hover:text-yellow-600 transition tap-shrink ${
                                    bookmarked ? "text-yellow-600" : ""
                                }`}
                            >
                                <Bookmark size={17} strokeWidth={1.6} fill={bookmarked ? "currentColor" : "none"} />
                            </button>
                            <button
                                onClick={share}
                                data-testid={`share-btn-${post.id}`}
                                className="group flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-blue-soft/12 hover:text-blue-soft transition tap-shrink"
                            >
                                <Share2 size={17} strokeWidth={1.6} />
                            </button>
                            <span className="ml-auto inline-flex items-center gap-1 text-[11px] font-mono text-black/40" title="visualizações">
                                <Eye size={13} strokeWidth={1.6} /> {formatNum(views)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
            {lightboxIdx >= 0 && images[lightboxIdx] && (
                <ImageLightbox src={images[lightboxIdx]} onClose={() => setLightboxIdx(-1)} />
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

export function PostCard({ post, onChange, onDelete, clickable = true }) {
    if (post.repost_of) {
        const inner = post.repost_of;
        return (
            <article
                data-testid={`post-${post.id}`}
                className="px-4 lg:px-6 pt-4 pb-6 hairline-b active:bg-black/[0.02] lg:hover:bg-black/[0.012] transition-colors anim-fade-up"
            >
                <div className="flex items-center gap-2 type-overline ml-12 mb-2 normal-case tracking-[0.16em]">
                    <Repeat2 size={12} strokeWidth={1.6} className="text-green-soft" />
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
            className="px-4 py-5 lg:px-6 lg:py-6 hairline-b active:bg-black/[0.02] lg:hover:bg-black/[0.012] transition-colors anim-fade-up"
        >
            <PostBody post={post} onChange={onChange} clickable={clickable} onDelete={onDelete} />
        </article>
    );
}
