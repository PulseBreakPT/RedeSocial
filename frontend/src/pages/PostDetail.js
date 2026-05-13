import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { api, formatApiError, toastApiError } from "../lib/api";
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
            toastApiError(e);
            navigate("/");
        } finally {
            setLoading(false);
        }
    }, [postId, navigate]);

    useEffect(() => { load(); }, [load]);

    const submitComment = async () => {
        if (!text.trim()) return;
        try {
            const { data } = await api.post(`/posts/${postId}/comments`, { content: text });
            setComments((c) => [...c, data]);
            setPost((p) => ({ ...p, comments_count: (p.comments_count || 0) + 1 }));
            setText("");
        } catch (e) {
            toastApiError(e);
        }
    };

    if (loading || !post) {
        return <div className="p-12 text-center type-overline">a carregar…</div>;
    }

    return (
        <div data-testid="post-detail-page">
            <PageHeader title="Publicação" subtitle="Detalhes da publicação" back testid="postdetail-header" />

            <PostCard
                post={post}
                clickable={false}
                onChange={(np) => setPost(np)}
                onDelete={() => navigate("/")}
            />

            <div className="px-4 lg:px-5 py-5 hairline-b bg-paper">
                <div className="flex gap-3">
                    <Avatar user={user} size={38} />
                    <div className="flex-1">
                        <textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            data-testid="comment-input"
                            placeholder="Adiciona um comentário…"
                            rows={2}
                            className="w-full bg-transparent text-[15px] focus:outline-none resize-none placeholder:text-black/35 font-body"
                            maxLength={300}
                        />
                        <div className="flex justify-between items-center mt-1">
                            <span className="font-mono text-[10px] text-black/35 uppercase tracking-[0.16em]">
                                {300 - text.length} restantes
                            </span>
                            <button
                                onClick={submitComment}
                                disabled={!text.trim()}
                                data-testid="submit-comment-btn"
                                className="btn-obsidian text-[11px] px-5 py-2 disabled:opacity-40"
                            >
                                Responder
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {comments.length === 0 ? (
                <div className="p-14 text-center">
                    <p className="type-overline mb-2">Sem novidades</p>
                    <p className="text-black/55 font-mono text-sm">Sem comentários ainda. Sê o primeiro!</p>
                </div>
            ) : (
                comments.map((c) => (
                    <div key={c.id} className="px-4 lg:px-5 py-4 hairline-b flex gap-3 anim-fade-up hover:bg-black/[0.015] transition" data-testid={`comment-${c.id}`}>
                        <Link to={`/u/${c.author?.username}`}>
                            <Avatar user={c.author} size={38} />
                        </Link>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <Link to={`/u/${c.author?.username}`} className="font-heading font-medium text-[14px] tracking-tight hover:underline text-black">
                                    {c.author?.name}
                                </Link>
                                <span className="font-mono text-[11px] text-black/45">@{c.author?.username}</span>
                                <span className="text-black/20">·</span>
                                <span className="font-mono text-[11px] text-black/45">{timeAgo(c.created_at)}</span>
                            </div>
                            <p className="mt-1.5 text-[14.5px] text-black/85 whitespace-pre-wrap break-words leading-relaxed">{c.content}</p>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}
