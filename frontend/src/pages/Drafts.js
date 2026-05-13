import { useEffect, useState } from "react";
import { FileText, Trash2, Send, Image as ImageIcon, BarChart3 } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { PostSkeletonList } from "../components/Skeleton";
import { Avatar } from "../components/Avatar";
import { api, formatApiError } from "../lib/api";
import { smartTime } from "../lib/time";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function Drafts() {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const load = () => {
        setLoading(true);
        api.get("/posts/drafts")
            .then((r) => setPosts(r.data))
            .catch((e) => toast.error(formatApiError(e)))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    const publish = async (id) => {
        try {
            await api.post(`/posts/${id}/publish`);
            setPosts((prev) => prev.filter((p) => p.id !== id));
            toast.success("Publicado");
        } catch (e) {
            toast.error(formatApiError(e));
        }
    };

    const remove = async (id) => {
        if (!window.confirm("Apagar este rascunho?")) return;
        try {
            await api.delete(`/posts/${id}`);
            setPosts((prev) => prev.filter((p) => p.id !== id));
            toast.success("Rascunho apagado");
        } catch (e) {
            toast.error(formatApiError(e));
        }
    };

    return (
        <div data-testid="drafts-page">
            <PageHeader title="Rascunhos" subtitle={`${posts.length} ${posts.length === 1 ? "guardado" : "guardados"}`} back testid="drafts-header" />
            {loading ? (
                <PostSkeletonList count={3} />
            ) : posts.length === 0 ? (
                <div className="px-6 py-16 text-center">
                    <div className="w-20 h-20 rounded-full bg-black/[0.04] grid place-items-center mx-auto mb-5 border border-black/[0.08]">
                        <FileText size={28} className="text-black/40" />
                    </div>
                    <p className="text-black font-heading text-lg tracking-tight">Sem rascunhos</p>
                    <p className="text-black/50 text-sm mt-1">Guarda uma publicação para a continuares depois.</p>
                </div>
            ) : (
                posts.map((p) => (
                    <article
                        key={p.id}
                        data-testid={`draft-${p.id}`}
                        className="px-4 lg:px-5 py-4 border-b border-black/[0.06] hover:bg-black/[0.015] transition"
                    >
                        <div className="flex gap-3">
                            <Avatar user={p.author} size={40} />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-heading font-bold text-sm text-black">{p.author?.name}</span>
                                    <span className="font-mono text-[11px] text-black/50">{smartTime(p.created_at)}</span>
                                    <span className="font-mono text-[10px] text-black/40 uppercase ml-auto">rascunho</span>
                                </div>
                                <p className="text-[15px] text-black/85 whitespace-pre-wrap line-clamp-4">{p.content || <em className="text-black/40">sem texto</em>}</p>
                                <div className="flex items-center gap-3 mt-2 text-[11px] font-mono text-black/40">
                                    {p.images?.length > 0 && (
                                        <span className="inline-flex items-center gap-1"><ImageIcon size={11} /> {p.images.length}</span>
                                    )}
                                    {p.poll && (
                                        <span className="inline-flex items-center gap-1"><BarChart3 size={11} /> enquete</span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 mt-3">
                                    <button
                                        onClick={() => publish(p.id)}
                                        data-testid={`draft-publish-${p.id}`}
                                        className="inline-flex items-center gap-1.5 bg-black text-white text-xs font-heading font-semibold px-3 py-1.5 rounded-full hover:bg-black/85 tap-shrink"
                                    >
                                        <Send size={12} /> Publicar
                                    </button>
                                    <button
                                        onClick={() => navigate(`/post/${p.id}`)}
                                        className="inline-flex items-center gap-1.5 text-xs font-mono text-black/60 hover:text-black px-3 py-1.5 rounded-full hover:bg-black/[0.04] tap-shrink"
                                    >
                                        ver
                                    </button>
                                    <button
                                        onClick={() => remove(p.id)}
                                        data-testid={`draft-delete-${p.id}`}
                                        className="ml-auto inline-flex items-center gap-1 text-xs font-mono text-red-soft hover:bg-red-soft/10 px-3 py-1.5 rounded-full tap-shrink"
                                    >
                                        <Trash2 size={12} /> apagar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </article>
                ))
            )}
        </div>
    );
}
