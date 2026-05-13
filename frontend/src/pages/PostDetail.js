import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { api, formatApiError } from "../lib/api";
import { PostCard } from "../components/PostCard";
import { PageHeader } from "../components/PageHeader";
import { Avatar } from "../components/Avatar";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";

function timeAgo(iso) {
    if (!iso) return "";
    const d = new Date(iso);
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60) return "agora";
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return d.toLocaleDateString("pt-BR");
}

export default function PostDetail() {
    const { postId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [post, setPost] = useState(null);
    const [comments, setComments] = useState([]);
    const [text, setText] = useState("");
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        try {
            const [p, c] = await Promise.all([
                api.get(`/posts/${postId}`),
                api.get(`/posts/${postId}/comments`),
            ]);
            setPost(p.data);
            setComments(c.data);
        } catch (e) {
            toast.error(formatApiError(e));
            navigate("/");
        } finally {
            setLoading(false);
        }
    }, [postId, navigate]);

    useEffect(() => {
        load();
    }, [load]);

    const submitComment = async () => {
        if (!text.trim()) return;
        try {
            const { data } = await api.post(`/posts/${postId}/comments`, { content: text });
            setComments((c) => [...c, data]);
            setPost((p) => ({ ...p, comments_count: (p.comments_count || 0) + 1 }));
            setText("");
        } catch (e) {
            toast.error(formatApiError(e));
        }
    };

    if (loading || !post) {
        return <div className="p-10 text-center text-zinc-500 font-mono text-sm">a carregar...</div>;
    }

    return (
        <div data-testid="post-detail-page">
            <PageHeader title="Publicação" back testid="postdetail-header" />

            <PostCard
                post={post}
                clickable={false}
                onChange={(np) => setPost(np)}
                onDelete={() => navigate("/")}
            />

            <div className="px-4 lg:px-5 py-4 border-b border-white/[0.05]">
                <div className="flex gap-3">
                    <Avatar user={user} size={36} />
                    <div className="flex-1">
                        <textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            data-testid="comment-input"
                            placeholder="Adiciona um comentário..."
                            rows={2}
                            className="w-full bg-transparent text-[15px] focus:outline-none resize-none placeholder:text-zinc-600"
                            maxLength={300}
                        />
                        <div className="flex justify-end">
                            <button
                                onClick={submitComment}
                                disabled={!text.trim()}
                                data-testid="submit-comment-btn"
                                className="bg-accent-vermillion text-white font-heading font-semibold uppercase tracking-wide text-[11px] px-5 py-2 rounded-full hover:bg-[#A78BFA] transition disabled:opacity-40 active:scale-95"
                            >
                                Responder
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {comments.length === 0 ? (
                <div className="p-10 text-center text-zinc-500 font-mono text-sm">Sem comentários ainda. Sê o primeiro!</div>
            ) : (
                comments.map((c) => (
                    <div key={c.id} className="px-4 lg:px-5 py-4 border-b border-white/[0.05] flex gap-3 anim-fade-up" data-testid={`comment-${c.id}`}>
                        <Link to={`/u/${c.author?.username}`}>
                            <Avatar user={c.author} size={36} />
                        </Link>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <Link to={`/u/${c.author?.username}`} className="font-heading font-semibold text-sm hover:underline">
                                    {c.author?.name}
                                </Link>
                                <span className="font-mono text-xs text-zinc-500">@{c.author?.username}</span>
                                <span className="text-zinc-700">·</span>
                                <span className="font-mono text-xs text-zinc-500">{timeAgo(c.created_at)}</span>
                            </div>
                            <p className="mt-1 text-sm whitespace-pre-wrap break-words">{c.content}</p>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}
