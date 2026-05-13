import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Heart, MessageCircle, Bookmark, Share2, Trash2, Repeat2 } from "lucide-react";
import { api, formatApiError } from "../lib/api";
import { Avatar } from "./Avatar";
import { VerifiedBadge } from "./VerifiedBadge";
import { RichText } from "./RichText";
import { ImageLightbox } from "./ImageLightbox";
import { useAuth } from "../context/AuthContext";
import { smartTime, fullTime } from "../lib/time";
import { toast } from "sonner";

function PostBody({ post, onChange, clickable, showRepostHeader }) {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [liked, setLiked] = useState(post.liked);
    const [likes, setLikes] = useState(post.likes_count);
    const [reposts, setReposts] = useState(post.reposts_count || 0);
    const [reposted, setReposted] = useState(!!post.reposted);
    const [bookmarked, setBookmarked] = useState(!!post.bookmarked);
    const [animLike, setAnimLike] = useState(false);
    const [lightbox, setLightbox] = useState(false);

    const toggleLike = async (e) => {
        e.stopPropagation();
        const prevLiked = liked;
        const prevLikes = likes;
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
            setLiked(prevLiked);
            setLikes(prevLikes);
            toast.error(formatApiError(err));
        }
    };

    const toggleRepost = async (e) => {
        e.stopPropagation();
        const prev = reposted;
        setReposted(!prev);
        setReposts(prev ? reposts - 1 : reposts + 1);
        try {
            const { data } = await api.post(`/posts/${post.id}/repost`);
            setReposted(data.reposted);
            setReposts(data.reposts_count);
            toast.success(data.reposted ? "Repostado" : "Repost desfeito");
        } catch (err) {
            setReposted(prev);
            setReposts(prev ? reposts + 1 : reposts - 1);
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
            toast.success(data.bookmarked ? "Salvo" : "Removido dos salvos");
        } catch (err) {
            setBookmarked(prev);
            toast.error(formatApiError(err));
        }
    };

    const share = (e) => {
        e.stopPropagation();
        const url = `${window.location.origin}/post/${post.id}`;
        navigator.clipboard.writeText(url);
        toast.success("Link copiado");
    };

    const remove = async (e) => {
        e.stopPropagation();
        if (!window.confirm("Apagar esta publicação?")) return;
        try {
            await api.delete(`/posts/${post.id}`);
            toast.success("Publicação apagada");
            window.location.reload();
        } catch (err) {
            toast.error(formatApiError(err));
        }
    };

    const openDetail = () => clickable && navigate(`/post/${post.id}`);
    const isOwn = user?.id === post.author?.id;

    return (
        <>
            <div onClick={openDetail} className={clickable ? "cursor-pointer" : ""}>
                <div className="flex gap-3">
                    <Link to={`/u/${post.author?.username}`} onClick={(e) => e.stopPropagation()}>
                        <Avatar user={post.author} size={44} />
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
                            {isOwn && !showRepostHeader && (
                                <button
                                    onClick={remove}
                                    data-testid={`delete-post-${post.id}`}
                                    className="ml-auto text-zinc-600 hover:text-accent-vermillion p-1.5 rounded-full hover:bg-white/5"
                                >
                                    <Trash2 size={15} />
                                </button>
                            )}
                        </div>
                        {post.content && <RichText text={post.content} className="mt-1 text-[15px] leading-relaxed" />}
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
                                <span className="font-mono text-xs">{post.comments_count || 0}</span>
                            </button>
                            <button
                                onClick={toggleRepost}
                                data-testid={`repost-btn-${post.id}`}
                                className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-emerald-500/10 hover:text-emerald-400 transition ${
                                    reposted ? "text-emerald-400" : ""
                                }`}
                            >
                                <Repeat2 size={17} />
                                <span className="font-mono text-xs">{reposts}</span>
                            </button>
                            <button
                                onClick={toggleLike}
                                data-testid={`like-btn-${post.id}`}
                                className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-accent-vermillion/10 hover:text-accent-vermillion transition ${
                                    liked ? "text-accent-vermillion" : ""
                                }`}
                            >
                                <Heart size={17} fill={liked ? "currentColor" : "none"} className={animLike ? "anim-pop" : ""} />
                                <span className="font-mono text-xs">{likes}</span>
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
                        </div>
                    </div>
                </div>
            </div>
            {lightbox && post.image && <ImageLightbox src={post.image} onClose={() => setLightbox(false)} />}
        </>
    );
}

export function PostCard({ post, onChange, onDelete, clickable = true }) {
    // If this is a repost entry, the visible body is the original post
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
                        @{post.author?.username} repostou
                    </Link>
                </div>
                <PostBody post={inner} onChange={onChange} clickable={clickable} showRepostHeader />
            </article>
        );
    }

    return (
        <article
            data-testid={`post-${post.id}`}
            className="p-5 border-b border-zinc-900 hover:bg-white/[0.015] transition-colors anim-fade-up"
        >
            <PostBody post={post} onChange={onChange} clickable={clickable} />
        </article>
    );
}
