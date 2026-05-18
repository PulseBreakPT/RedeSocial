import { useEffect, useState } from "react";
import { X, Flame, Eye, BarChart3, Clock, Heart, MessageSquare, Loader2, TrendingUp } from "lucide-react";
import { api, toastApiError } from "../../lib/api";
import { Avatar } from "../Avatar";
import { useEscapeKey } from "../../hooks/useClickOutside";

/**
 * Painel SSS-Tier de inteligência do story (autor-only).
 * Tema CLARO — paper aesthetic — alinhado ao resto da app Lusorae.
 *   · Headline EQS + flag "Hot"
 *   · Total views / unique viewers / completion média
 *   · Curva de retenção (10 buckets)
 *   · Heatmap horário (24h)
 *   · Breakdown de reacções e stickers
 *   · Top viewers por afinidade (Mesa > Roda > Following)
 */
export function StoryInsightsSheet({ storyId, onClose }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEscapeKey(onClose, true);

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const r = await api.get(`/stories/${storyId}/insights`);
                if (alive) setData(r.data);
            } catch (e) {
                toastApiError(e);
                if (alive) onClose();
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => { alive = false; };
    }, [storyId, onClose]);

    return (
        <div
            data-testid="story-insights-sheet"
            className="absolute inset-0 z-[60] bg-white text-black overflow-y-auto"
            onClick={onClose}
        >
            <div
                className="min-h-full px-5 pt-[max(20px,calc(env(safe-area-inset-top)+12px))] pb-[max(24px,env(safe-area-inset-bottom))]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-6 sticky top-0 -mx-5 px-5 py-3 bg-white/95 backdrop-blur z-10 border-b border-black/[0.06]">
                    <div className="flex items-baseline gap-2">
                        <span aria-hidden className="silver-foil text-[15px] leading-none translate-y-0.5">◆</span>
                        <h2 className="font-display text-[22px] tracking-tight leading-none">Insights</h2>
                        <span className="ml-1 text-[10.5px] uppercase tracking-[0.16em] font-mono text-black/45">
                            SSS-Tier
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        data-testid="story-insights-close"
                        className="p-2 rounded-full hover:bg-black/[0.05] text-black/65"
                        aria-label="Fechar"
                    >
                        <X size={16} />
                    </button>
                </div>

                {loading && (
                    <div className="flex items-center justify-center py-20 text-black/45">
                        <Loader2 size={20} className="animate-spin" />
                    </div>
                )}

                {!loading && data && (
                    <>
                        <Summary summary={data.summary} />
                        <RetentionCurve curve={data.retention_curve} />
                        <HourlyHeatmap heatmap={data.hourly_heatmap} />
                        <ReactionsBreakdown breakdown={data.reactions_breakdown} />
                        <StickersSummary stickers={data.stickers_summary} />
                        <TopViewers viewers={data.top_viewers} />
                    </>
                )}
            </div>
        </div>
    );
}

function Summary({ summary }) {
    if (!summary) return null;
    const eqs = Math.round((summary.eqs || 0) * 100);
    return (
        <section className="mb-7" data-testid="insights-summary">
            <div className="rounded-2xl border border-black/[0.08] bg-paper grain isolate p-5">
                <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                        <p className="text-[10.5px] uppercase tracking-[0.16em] text-black/45 font-mono">
                            Engagement Quality Score
                        </p>
                        <p className="font-display text-[52px] leading-none mt-1.5 tabular-nums tracking-tight">
                            {eqs}<span className="text-[20px] text-black/40 ml-0.5">/100</span>
                        </p>
                        <p className="mt-2 text-[11.5px] text-black/55 max-w-[28ch] leading-relaxed">
                            Pondera reacções, respostas e sticker-votes com diversidade de sinal.
                        </p>
                    </div>
                    {summary.is_hot && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black text-white text-[11px] font-bold uppercase tracking-wider shrink-0">
                            <Flame size={12} /> Hot
                        </span>
                    )}
                </div>
                <div className="grid grid-cols-3 gap-2">
                    <Stat icon={Eye} label="Vistas únicas" value={summary.unique_viewers || 0} />
                    <Stat icon={Clock} label="Completação" value={`${Math.round((summary.completion_avg || 0) * 100)}%`} />
                    <Stat icon={Heart} label="Reacções" value={summary.reactions_count || 0} />
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                    <Stat icon={MessageSquare} label="Respostas" value={summary.replies_count || 0} />
                    {summary.mood && (
                        <Stat icon={TrendingUp} label="Mood" value={summary.mood} />
                    )}
                </div>
            </div>
        </section>
    );
}

function Stat({ icon: Icon, label, value }) {
    return (
        <div className="rounded-xl border border-black/[0.07] bg-white px-3 py-2.5">
            <div className="flex items-center gap-1.5 mb-1">
                <Icon size={11} className="text-black/45" />
                <span className="text-[10px] uppercase tracking-[0.10em] text-black/50 font-mono">{label}</span>
            </div>
            <p className="text-[18px] font-medium tabular-nums truncate">{value}</p>
        </div>
    );
}

function RetentionCurve({ curve }) {
    if (!curve || curve.length === 0) return null;
    const max = Math.max(1, ...curve.map(c => c.viewers));
    return (
        <section className="mb-7" data-testid="insights-retention">
            <SectionHeading title="Curva de retenção" hint="% viewers que viram pelo menos N% do story" />
            <div className="rounded-2xl border border-black/[0.08] bg-white p-4">
                <div className="flex items-end gap-1 h-32">
                    {curve.map((c, i) => {
                        const pct = Math.round((c.viewers / max) * 100);
                        return (
                            <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                                <div className="w-full flex-1 flex items-end">
                                    <div
                                        className="w-full bg-gradient-to-t from-black to-black/30 rounded-t-sm transition-all"
                                        style={{ height: `${pct}%`, minHeight: pct > 0 ? "3px" : 0 }}
                                        title={`≥${Math.round(c.threshold * 100)}% — ${c.viewers}`}
                                    />
                                </div>
                                <span className="text-[8.5px] font-mono text-black/40 tabular-nums">
                                    {Math.round(c.threshold * 100)}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}

function HourlyHeatmap({ heatmap }) {
    if (!heatmap || heatmap.length === 0) return null;
    const max = Math.max(1, ...heatmap);
    return (
        <section className="mb-7" data-testid="insights-heatmap">
            <SectionHeading title="Heatmap horário" hint="Quando viram (hora UTC)" />
            <div className="rounded-2xl border border-black/[0.08] bg-white p-3">
                <div className="flex gap-[2px]">
                    {heatmap.map((count, hour) => {
                        const intensity = count / max;
                        return (
                            <div
                                key={hour}
                                className="flex-1 aspect-square rounded-sm transition-all"
                                style={{
                                    background: count === 0
                                        ? "rgba(0,0,0,0.04)"
                                        : `rgba(224,62,62,${0.20 + intensity * 0.80})`,
                                }}
                                title={`${hour}h — ${count} ${count === 1 ? "vista" : "vistas"}`}
                            />
                        );
                    })}
                </div>
                <div className="flex justify-between mt-2 text-[9px] font-mono text-black/40">
                    <span>0h</span><span>6h</span><span>12h</span><span>18h</span><span>23h</span>
                </div>
            </div>
        </section>
    );
}

function ReactionsBreakdown({ breakdown }) {
    if (!breakdown || Object.keys(breakdown).length === 0) return null;
    const entries = Object.entries(breakdown).sort((a, b) => b[1] - a[1]);
    return (
        <section className="mb-7" data-testid="insights-reactions">
            <SectionHeading title="Reacções" />
            <div className="rounded-2xl border border-black/[0.08] bg-white p-3 flex flex-wrap gap-2">
                {entries.map(([emoji, count]) => (
                    <div key={emoji} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-black/[0.08] bg-paper grain isolate text-[14px]">
                        <span>{emoji}</span>
                        <span className="text-[12px] tabular-nums font-medium">{count}</span>
                    </div>
                ))}
            </div>
        </section>
    );
}

function StickersSummary({ stickers }) {
    if (!stickers || stickers.length === 0) return null;
    return (
        <section className="mb-7" data-testid="insights-stickers">
            <SectionHeading title="Stickers" />
            <div className="space-y-2">
                {stickers.map((s, i) => {
                    let metric = "";
                    if (s.type === "poll") metric = `${s.total_votes || 0} votos`;
                    else if (s.type === "question") metric = `${s.total_answers || 0} respostas`;
                    else if (s.type === "slider") {
                        const avg = s.average == null ? "—" : `${Math.round(s.average * 100)}%`;
                        metric = `${s.total_responses || 0} · média ${avg}`;
                    }
                    return (
                        <div key={i} className="rounded-xl border border-black/[0.08] bg-white px-3.5 py-2.5 flex items-center justify-between gap-3">
                            <div className="min-w-0">
                                <p className="text-[10px] uppercase tracking-[0.10em] text-black/45 font-mono">{s.type}</p>
                                <p className="text-[13px] truncate">{s.label || "(sem rótulo)"}</p>
                            </div>
                            {metric && (
                                <span className="text-[11px] font-mono text-black whitespace-nowrap font-medium">{metric}</span>
                            )}
                        </div>
                    );
                })}
            </div>
        </section>
    );
}

function TopViewers({ viewers }) {
    if (!viewers || viewers.length === 0) return null;
    return (
        <section className="mb-3" data-testid="insights-top-viewers">
            <SectionHeading title="Top viewers" hint="ordenado por afinidade ao autor" />
            <div className="rounded-2xl border border-black/[0.08] bg-white divide-y divide-black/[0.05]">
                {viewers.map((v) => {
                    const tier = v.affinity >= 0.85 ? "Mesa" : v.affinity >= 0.7 ? "Roda" : v.affinity >= 0.45 ? "Segue-te" : "Visitante";
                    const tierClass =
                        v.affinity >= 0.85 ? "text-coral" :
                        v.affinity >= 0.7  ? "text-amber-600" :
                        v.affinity >= 0.45 ? "text-emerald-700" : "text-black/55";
                    return (
                        <div key={v.user.id} className="px-3.5 py-2.5 flex items-center gap-3">
                            <Avatar user={v.user} size={32} />
                            <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-medium truncate">{v.user.name}</p>
                                <p className="text-[10.5px] text-black/55 font-mono">@{v.user.username}</p>
                            </div>
                            <div className="text-right">
                                <p className={`text-[10.5px] font-mono uppercase tracking-wider font-medium ${tierClass}`}>{tier}</p>
                                <p className="text-[10px] text-black/45">
                                    {v.reaction && <span className="mr-1">{v.reaction}</span>}
                                    {Math.round((v.completion || 0) * 100)}%
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}

function SectionHeading({ title, hint }) {
    return (
        <div className="mb-2.5 flex items-baseline gap-2">
            <h3 className="text-[13px] font-medium text-black tracking-tight">{title}</h3>
            {hint && <span className="text-[11px] text-black/45">{hint}</span>}
        </div>
    );
}
