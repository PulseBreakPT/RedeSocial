import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Heart, MessageCircle, Bookmark, Share2, Repeat2, Eye, Pin, Pencil } from "lucide-react";
import { api, formatApiError } from "../lib/api";
import { Avatar } from "./Avatar";
import { VerifiedBadge } from "./VerifiedBadge";
import { RichText } from "./RichText";
import { ImageLightbox } from "./ImageLightbox";
import { PostMenu } from "./PostMenu";
import { EditPostModal } from "./EditPostModal";
import { QuoteModal } from "./QuoteModal";
import { RepostMenu } from "./RepostMenu";
import { PostAnalyticsModal } from "./PostAnalyticsModal";
import { useAuth } from "../context/AuthContext";
import { smartTime, fullTime } from "../lib/time";
import { toast } from "sonner";

function formatNum(n) {
    if (n < 1000) return String(n);
    if (n < 1000000) return `${(n / 1000).toFixed(1).replace(".0", "")}K`;
    return `${(n / 1000000).toFixed(1).replace(".0", "")}M`;
}

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
    const [content, setContent] = useState(post.content);
    const [animLike, setAnimLike] = useState(false);
    const [lightbox, setLightbox] = useState(false);
    const [editing, setEditing] = useState(false);
    const [quoting, setQuoting] = useState(false);
    const [analytics, setAnalytics] = useState(false);
    const viewedRef = useRef(false);
    const isOwn = user?.id === post.author?.id;

    // Track view once per mount via IntersectionObserver
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
                    <div className="flex items-center gap-1.5 text-xs font-mono text-zinc-500 ml-12 mb-1.5" data-testid={`pinned-${post.id}`}>
                        <Pin size={12} className="text-accent-vermillion" />
                        <span>Fixado no perfil</span>
                    </div>
                )}
                <div className="flex gap-3">
                    <Link to={`/u/${post.author?.username}`} onClick={(e) => e.stopPropagation()}>
                        <Avatar user={post.author} size={44} showOnline />
                    </Link>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <Link
                                to={`/u/${post.author?.username}`}
                                onClick={(e) => e.stopPropagation()}
                                className="font-heading font-bold hover:underline truncate"
                            >
                                {post.author?.name}
                            </Link>
                            {post.author?.verified && <VerifiedBadge size={14} />}
                            <span className="font-mono text-sm text-zinc-500 truncate">@{post.author?.username}</span>
                            <span className="text-zinc-700">·</span>
                            <span className="font-mono text-sm text-zinc-500" title={fullTime(post.created_at)}>{smartTime(post.created_at)}</span>
                            {editedAt && (
                                <span className="font-mono text-xs text-zinc-600 inline-flex items-center gap-0.5" title={`Editado em ${fullTime(editedAt)}`}>
                                    <Pencil size={9} /> editado
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
                        {content && <RichText text={content} className="mt-1 text-[15px] leading-relaxed" />}
                        {post.image && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setLightbox(true);
                                }}
                                className="block mt-3 group"
                            >
                                <img
                                    src={post.image}
                                    alt=""
                                    className="rounded-xl border border-zinc-800 max-h-[480px] w-auto object-cover transition group-hover:opacity-90"
                                />
                            </button>
                        )}
                        {post.quote_of && (
                            <div
                                onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/post/${post.quote_of.id}`);
                                }}
                                className="mt-3 p-3 border border-zinc-800 rounded-xl hover:bg-white/[0.02] cursor-pointer transition"
                                data-testid={`quote-ref-${post.id}`}
                            >
                                <div className="flex items-center gap-2 text-sm">
                                    <Avatar user={post.quote_of.author} size={20} />
                                    <span className="font-heading font-semibold">{post.quote_of.author?.name}</span>
                                    {post.quote_of.author?.verified && <VerifiedBadge size={11} />}
                                    <span className="font-mono text-xs text-zinc-500">@{post.quote_of.author?.username}</span>
                                    <span className="text-zinc-700">·</span>
                                    <span className="font-mono text-xs text-zinc-500">{smartTime(post.quote_of.created_at)}</span>
                                </div>
                                <p className="mt-1.5 text-sm text-zinc-300 line-clamp-3">{post.quote_of.content}</p>
                            </div>
                        )}
                        <div className="flex items-center gap-1 mt-3 -ml-2 text-zinc-500">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/post/${post.id}`);
                                }}
                                data-testid={`comment-btn-${post.id}`}
                                className="group flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-blue-500/10 hover:text-blue-400 transition"
                            >
                                <MessageCircle size={17} />
                                <span className="font-mono text-xs">{formatNum(post.comments_count || 0)}</span>
                            </button>
                            <RepostMenu
                                reposted={reposted}
                                onRepost={doRepost}
                                onQuote={() => setQuoting(true)}
                            />
                            <span data-testid={`repost-count-${post.id}`} className={`font-mono text-xs -ml-2 mr-2 ${reposted ? "text-emerald-400" : ""}`}>
                                {formatNum(reposts)}
                            </span>
                            <button
                                onClick={toggleLike}
                                data-testid={`like-btn-${post.id}`}
                                className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-accent-vermillion/10 hover:text-accent-vermillion transition ${
                                    liked ? "text-accent-vermillion" : ""
                                }`}
                            >
                                <Heart size={17} fill={liked ? "currentColor" : "none"} className={animLike ? "anim-pop" : ""} />
                                <span className="font-mono text-xs">{formatNum(likes)}</span>
                            </button>
                            <button
                                onClick={toggleBookmark}
                                data-testid={`bookmark-btn-${post.id}`}
                                className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-yellow-500/10 hover:text-yellow-400 transition ${
                                    bookmarked ? "text-yellow-400" : ""
                                }`}
                            >
                                <Bookmark size={17} fill={bookmarked ? "currentColor" : "none"} />
                            </button>
                            <button
                                onClick={share}
                                data-testid={`share-btn-${post.id}`}
                                className="group flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-sky-500/10 hover:text-sky-400 transition"
                            >
                                <Share2 size={17} />
                            </button>
                            <span className="ml-auto inline-flex items-center gap-1 text-xs font-mono text-zinc-600" title="visualizações">
                                <Eye size={13} /> {formatNum(views)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
            {lightbox && post.image && <ImageLightbox src={post.image} onClose={() => setLightbox(false)} />}
            {editing && (
                <EditPostModal
                    post={{ ...post, content }}
                    onClose={() => setEditing(false)}
                    onSave={(np) => {
                        setContent(np.content);
                        setEditadAt(np.edited_at);
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
                className="px-5 pt-3 pb-5 border-b border-zinc-900 hover:bg-white/[0.015] transition-colors anim-fade-up"
            >
                <div className="flex items-center gap-2 text-xs font-mono text-zinc-500 ml-12 mb-1.5">
                    <Repeat2 size={13} className="text-emerald-400" />
                    <Link to={`/u/${post.author?.username}`} className="hover:underline">
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
            className="p-5 border-b border-zinc-900 hover:bg-white/[0.015] transition-colors anim-fade-up"
        >
            <PostBody post={post} onChange={onChange} clickable={clickable} onDelete={onDelete} />
        </article>
    );
}
