import { useEffect, useState } from "react";
import { X, BarChart3, Eye, Heart, Repeat2, MessageCircle, Bookmark, TrendingUp } from "lucide-react";
import { api, formatApiError } from "../lib/api";
import { fullTime } from "../lib/time";
import { toast } from "sonner";

function MetricBar({ label, value, max, icon: Icon, color }) {
    const pct = Math.min(100, (value / Math.max(max, 1)) * 100);
    return (
        <div>
            <div className="flex items-center gap-2 mb-1.5">
                <Icon size={14} className={color} />
                <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500 flex-1">{label}</span>
                <span className="font-heading text-sm font-bold tabular-nums">{value}</span>
            </div>
            <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
                <div
                    className={`h-full rounded-full transition-all duration-700 ${color.replace("text-", "bg-")}`}
                    style={{ width: `${pct}%` }}
                />
            </div>
        </div>
    );
}

export function PostAnalyticsModal({ postId, onClose }) {
    const [data, setData] = useState(null);

    useEffect(() => {
        api.get(`/posts/${postId}/analytics`)
            .then((r) => setData(r.data))
            .catch((e) => {
                toast.error(formatApiError(e));
                onClose();
            });
        // eslint-disable-next-line
    }, [postId]);

    return (
        <div className="fixed inset-0 z-[85] bg-black/75 backdrop-blur-md grid place-items-center p-4" onClick={onClose} data-testid="analytics-modal">
            <div className="w-full max-w-md card-premium rounded-3xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.05]">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-accent-vermillion/10 border border-accent-vermillion/30 grid place-items-center">
                            <BarChart3 size={16} className="text-accent-vermillion" />
                        </div>
                        <div>
                            <h2 className="font-heading text-lg font-bold">Analytics da publicação</h2>
                            <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">métricas detalhadas</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-white/[0.06] tap-shrink">
                        <X size={16} />
                    </button>
                </div>
                <div className="p-5 space-y-5">
                    {!data ? (
                        <div className="py-12 text-center text-zinc-500 font-mono text-sm">a carregar...</div>
                    ) : (
                        <>
                            <div className="bg-zinc-950 border border-white/[0.06] rounded-2xl p-4 text-center" data-testid="engagement-summary">
                                <div className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">taxa de engagement</div>
                                <div className="font-heading text-4xl font-bold tracking-tight mt-1">
                                    <span className="text-shimmer">{data.engagement_rate}%</span>
                                </div>
                                <div className="font-mono text-[11px] text-zinc-500 mt-2">
                                    fórmula: (gostos + reposts·2 + comentários·3 + guardados·1.5) / visualizações
                                </div>
                            </div>

                            <div className="space-y-3.5">
                                <MetricBar label="Visualizações" value={data.views} max={Math.max(data.views, 100)} icon={Eye} color="text-purple-400" />
                                <MetricBar label="Gostos" value={data.likes} max={Math.max(data.views, 1)} icon={Heart} color="text-accent-vermillion" />
                                <MetricBar label="Republicações" value={data.reposts} max={Math.max(data.likes + data.reposts, 1)} icon={Repeat2} color="text-emerald-400" />
                                <MetricBar label="Comentários" value={data.comments} max={Math.max(data.likes + data.comments, 1)} icon={MessageCircle} color="text-blue-400" />
                                <MetricBar label="Guardados" value={data.bookmarks} max={Math.max(data.likes + data.bookmarks, 1)} icon={Bookmark} color="text-yellow-400" />
                            </div>

                            <div className="flex items-center gap-2 text-xs font-mono text-zinc-500 pt-2 border-t border-white/[0.05]">
                                <TrendingUp size={12} />
                                <span>Publicado em {fullTime(data.created_at)}</span>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
