import { useEffect, useState } from "react";
import { X, BarChart3, Eye, Heart, Repeat2, MessageCircle, Bookmark, TrendingUp } from "lucide-react";
import { api, formatApiError } from "../lib/api";
import { fullTime } from "../lib/time";
import { toast } from "sonner";

const COLORS = {
    purple: { fg: "text-black/80", bar: "bg-black/85" },
    red:    { fg: "text-red-soft", bar: "bg-red-soft" },
    green:  { fg: "text-green-soft", bar: "bg-green-soft" },
    blue:   { fg: "text-blue-soft", bar: "bg-blue-soft" },
    amber:  { fg: "text-black/65", bar: "bg-black/60" },
};

function MetricBar({ label, value, max, icon: Icon, tone }) {
    const pct = Math.min(100, (value / Math.max(max, 1)) * 100);
    return (
        <div>
            <div className="flex items-center gap-2 mb-1.5">
                <Icon size={13} strokeWidth={1.6} className={tone.fg} />
                <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/50 flex-1">{label}</span>
                <span className="font-heading text-[14px] font-semibold tracking-tight text-black tabular-nums">{value}</span>
            </div>
            <div className="h-1.5 rounded-full bg-black/[0.06] overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-700 ${tone.bar}`} style={{ width: `${pct}%` }} />
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
        <div className="fixed inset-0 z-[85] bg-black/30 backdrop-blur-md grid place-items-center p-4" onClick={onClose} data-testid="analytics-modal">
            <div
                className="w-full max-w-md bg-white border border-black/[0.08] rounded-3xl shadow-[0_30px_80px_-20px_rgba(13,13,16,0.3)] anim-fade-up overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-6 py-4 hairline-b">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full ring-silver grid place-items-center">
                            <BarChart3 size={14} strokeWidth={1.5} className="text-black/70" />
                        </div>
                        <div>
                            <h2 className="font-display text-[22px] tracking-tight leading-none text-black">Analytics</h2>
                            <p className="type-overline mt-1">Métricas detalhadas</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-9 h-9 rounded-full grid place-items-center hover:bg-black/[0.04] text-black/55">
                        <X size={16} strokeWidth={1.7} />
                    </button>
                </div>
                <div className="p-6 space-y-5">
                    {!data ? (
                        <div className="py-12 text-center type-overline">a carregar…</div>
                    ) : (
                        <>
                            <div className="ring-silver rounded-2xl p-5 text-center bg-paper" data-testid="engagement-summary">
                                <div className="type-overline">Taxa de engajamento</div>
                                <div className="font-display text-[56px] tracking-tight mt-1 leading-none silver-foil">
                                    {data.engagement_rate}%
                                </div>
                                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/45 mt-4">
                                    (gostos + reposts·2 + comentários·3 + guardados·1.5) ÷ views
                                </div>
                            </div>

                            <div className="space-y-3.5">
                                <MetricBar label="Visualizações" value={data.views} max={Math.max(data.views, 100)} icon={Eye} tone={COLORS.purple} />
                                <MetricBar label="Gostos" value={data.likes} max={Math.max(data.views, 1)} icon={Heart} tone={COLORS.red} />
                                <MetricBar label="Republicações" value={data.reposts} max={Math.max(data.likes + data.reposts, 1)} icon={Repeat2} tone={COLORS.green} />
                                <MetricBar label="Comentários" value={data.comments} max={Math.max(data.likes + data.comments, 1)} icon={MessageCircle} tone={COLORS.blue} />
                                <MetricBar label="Guardados" value={data.bookmarks} max={Math.max(data.likes + data.bookmarks, 1)} icon={Bookmark} tone={COLORS.amber} />
                            </div>

                            <div className="flex items-center gap-2 text-[11px] font-mono text-black/50 pt-3 hairline-t uppercase tracking-[0.14em]">
                                <TrendingUp size={11} strokeWidth={1.7} />
                                <span>Publicado em {fullTime(data.created_at)}</span>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
