import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { api, formatApiError } from "../lib/api";
import { PostCard } from "../components/PostCard";
import { Composer } from "../components/Composer";
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

    const load = async () => {
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
    };

    useEffect(() => {
        load();
    }, [postId]);

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
        return <div className="p-10 text-center text-zinc-500 font-mono text-sm">carregando...</div>;
    }

    return (
        <div data-testid="post-detail-page">
            <div className="sticky top-0 z-30 glass border-b border-zinc-900 px-5 py-4 flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="p-1 hover:bg-white/5 rounded-full" data-testid="back-btn">
                    <ArrowLeft size={18} />
                </button>
                <div>
                    <h1 className="font-heading text-xl font-bold tracking-tight">Publicação</h1>
                </div>
            </div>

            <PostCard
                post={post}
                clickable={false}
                onChange={(np) => setPost(np)}
                onDelete={() => navigate("/")}
            />

            <div className="p-5 border-b border-zinc-900">
                <div className="flex gap-3">
                    <Avatar user={user} size={36} />
                    <div className="flex-1">
                        <textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            data-testid="comment-input"
                            placeholder="Adicione um comentário..."
                            rows={2}
                            className="w-full bg-transparent text-base focus:outline-none resize-none placeholder:text-zinc-600"
                            maxLength={300}
                        />
                        <div className="flex justify-end">
                            <button
                                onClick={submitComment}
                                disabled={!text.trim()}
                                data-testid="submit-comment-btn"
                                className="bg-accent-vermillion text-white font-heading font-semibold uppercase tracking-wide text-xs px-5 py-2 rounded-full hover:bg-[#A78BFA] transition disabled:opacity-40 active:scale-95"
                            >
                                Responder
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {comments.length === 0 ? (
                <div className="p-10 text-center text-zinc-500 font-mono text-sm">Sem comentários ainda. Seja o primeiro!</div>
            ) : (
                comments.map((c) => (
                    <div key={c.id} className="p-5 border-b border-zinc-900 flex gap-3 anim-fade-up" data-testid={`comment-${c.id}`}>
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
