import { useEffect, useState } from "react";
import { Clock, Trash2, Send, Image as ImageIcon, BarChart3, Calendar } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { PostSkeletonList } from "../components/Skeleton";
import { Avatar } from "../components/Avatar";
import { api, formatApiError } from "../lib/api";
import { smartTime, fullTime } from "../lib/time";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

function untilLabel(iso) {
    if (!iso) return "";
    const diff = new Date(iso).getTime() - Date.now();
    if (diff <= 0) return "a publicar...";
    const m = Math.floor(diff / 60000);
    if (m < 60) return `em ${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `em ${h}h`;
    const d = Math.floor(h / 24);
    return `em ${d}d`;
}

export default function Scheduled() {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    const load = () => {
        setLoading(true);
        api.get("/posts/scheduled")
            .then((r) => setPosts(r.data))
            .catch((e) => toast.error(formatApiError(e)))
            .finally(() => setLoading(false));
    };

    useEffect(() => { load(); }, []);

    const publishNow = async (id) => {
        try {
            await api.post(`/posts/${id}/publish`);
            setPosts((prev) => prev.filter((p) => p.id !== id));
            toast.success("Publicado agora");
        } catch (e) {
            toast.error(formatApiError(e));
        }
    };

    const remove = async (id) => {
        if (!window.confirm("Cancelar agendamento e apagar?")) return;
        try {
            await api.delete(`/posts/${id}`);
            setPosts((prev) => prev.filter((p) => p.id !== id));
            toast.success("Agendamento cancelado");
        } catch (e) {
            toast.error(formatApiError(e));
        }
    };

    return (
        <div data-testid="scheduled-page">
            <PageHeader title="Agendados" subtitle={`${posts.length} a aguardar`} back testid="scheduled-header" />
            {loading ? (
                <PostSkeletonList count={3} />
            ) : posts.length === 0 ? (
                <div className="px-6 py-16 text-center">
                    <div className="w-20 h-20 rounded-full bg-black/[0.04] grid place-items-center mx-auto mb-5 border border-black/[0.08]">
                        <Clock size={28} className="text-black/40" />
                    </div>
                    <p className="text-black font-heading text-lg tracking-tight">Nenhum agendamento</p>
                    <p className="text-black/50 text-sm mt-1">Programa publicações futuras a partir do compositor.</p>
                </div>
            ) : (
                posts.map((p) => (
                    <article
                        key={p.id}
                        data-testid={`scheduled-${p.id}`}
                        className="px-4 lg:px-5 py-4 border-b border-black/[0.06] hover:bg-black/[0.015] transition"
                    >
                        <div className="flex gap-3">
                            <Avatar user={p.author} size={40} />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                    <span className="font-heading font-bold text-sm text-black">{p.author?.name}</span>
                                    <span
                                        className="font-mono text-[10px] inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-soft/15 text-blue-soft border border-blue-soft/30"
                                        title={fullTime(p.scheduled_at)}
                                    >
                                        <Calendar size={10} /> {untilLabel(p.scheduled_at)}
                                    </span>
                                </div>
                                <p className="text-[15px] text-black/85 whitespace-pre-wrap line-clamp-4">{p.content || <em className="text-black/40">sem texto</em>}</p>
                                <div className="flex items-center gap-3 mt-2 text-[11px] font-mono text-black/40">
                                    <span title={fullTime(p.scheduled_at)}>{smartTime(p.scheduled_at)}</span>
                                    {p.images?.length > 0 && (
                                        <span className="inline-flex items-center gap-1"><ImageIcon size={11} /> {p.images.length}</span>
                                    )}
                                    {p.poll && (
                                        <span className="inline-flex items-center gap-1"><BarChart3 size={11} /> enquete</span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2 mt-3">
                                    <button
                                        onClick={() => publishNow(p.id)}
                                        data-testid={`scheduled-publish-${p.id}`}
                                        className="inline-flex items-center gap-1.5 bg-black text-white text-xs font-heading font-semibold px-3 py-1.5 rounded-full hover:bg-black/85 tap-shrink"
                                    >
                                        <Send size={12} /> Publicar agora
                                    </button>
                                    <button
                                        onClick={() => navigate(`/post/${p.id}`)}
                                        className="inline-flex items-center gap-1.5 text-xs font-mono text-black/60 hover:text-black px-3 py-1.5 rounded-full hover:bg-black/[0.04] tap-shrink"
                                    >
                                        ver
                                    </button>
                                    <button
                                        onClick={() => remove(p.id)}
                                        data-testid={`scheduled-delete-${p.id}`}
                                        className="ml-auto inline-flex items-center gap-1 text-xs font-mono text-red-soft hover:bg-red-soft/10 px-3 py-1.5 rounded-full tap-shrink"
                                    >
                                        <Trash2 size={12} /> cancelar
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
