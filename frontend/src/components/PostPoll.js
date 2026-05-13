import { useState } from "react";
import { CheckCircle2, BarChart3, Clock } from "lucide-react";
import { api, formatApiError } from "../lib/api";
import { toast } from "sonner";

function timeLeft(endsAt) {
    if (!endsAt) return null;
    try {
        const diff = new Date(endsAt).getTime() - Date.now();
        if (diff <= 0) return "encerrada";
        const mins = Math.floor(diff / 60000);
        if (mins < 60) return `${mins}m restantes`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h restantes`;
        const days = Math.floor(hours / 24);
        return `${days}d restantes`;
    } catch {
        return null;
    }
}

export function PostPoll({ postId, poll, viewer, onUpdate }) {
    const [local, setLocal] = useState(poll);
    const [busy, setBusy] = useState(false);
    const closed = local.closed;
    const voted = (local.user_voted_for || []).length > 0;
    const showResults = closed || voted;
    const total = local.total_votes || 0;
    const left = timeLeft(local.ends_at);

    const vote = async (e, optionId) => {
        e.stopPropagation();
        if (!viewer || busy || closed) return;
        let chosen;
        if (local.allow_multiple) {
            const has = (local.user_voted_for || []).includes(optionId);
            chosen = has
                ? (local.user_voted_for || []).filter((id) => id !== optionId)
                : [...(local.user_voted_for || []), optionId];
        } else {
            chosen = [optionId];
        }
        setBusy(true);
        try {
            const { data } = await api.post(`/posts/${postId}/vote`, { option_ids: chosen });
            setLocal(data.poll);
            onUpdate?.(data.poll);
        } catch (err) {
            toast.error(formatApiError(err));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="mt-3 rounded-2xl border border-black/[0.08] bg-white p-3 space-y-2" data-testid={`poll-${postId}`} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-black/50 uppercase tracking-wide">
                <BarChart3 size={11} /> Enquete{local.allow_multiple && " · múltipla"}
            </div>
            {local.options.map((opt) => {
                const pct = total > 0 ? Math.round((opt.votes / total) * 100) : 0;
                const mine = (local.user_voted_for || []).includes(opt.id);
                if (showResults) {
                    return (
                        <button
                            key={opt.id}
                            disabled={closed || busy}
                            onClick={(e) => vote(e, opt.id)}
                            data-testid={`poll-option-${opt.id}`}
                            className={`relative w-full block rounded-xl overflow-hidden border ${mine ? "border-black/40" : "border-black/[0.08]"} hover:border-black/30 transition disabled:cursor-default text-left`}
                        >
                            <div
                                className="absolute inset-y-0 left-0 transition-all"
                                style={{
                                    width: `${pct}%`,
                                    background: mine
                                        ? "linear-gradient(90deg, rgba(86,182,119,0.18), rgba(86,182,119,0.08))"
                                        : "linear-gradient(90deg, rgba(0,0,0,0.06), rgba(0,0,0,0.02))",
                                }}
                            />
                            <div className="relative flex items-center gap-2 px-3 py-2">
                                {mine && <CheckCircle2 size={14} className="text-green-soft shrink-0" />}
                                <span className={`flex-1 text-sm ${mine ? "font-semibold text-black" : "text-black/80"} truncate`}>{opt.text}</span>
                                <span className="font-mono text-xs text-black/60 tabular-nums">{pct}%</span>
                            </div>
                        </button>
                    );
                }
                return (
                    <button
                        key={opt.id}
                        disabled={busy || !viewer}
                        onClick={(e) => vote(e, opt.id)}
                        data-testid={`poll-option-${opt.id}`}
                        className="w-full text-left rounded-xl border border-black/[0.08] hover:border-black/30 hover:bg-black/[0.02] px-3 py-2 text-sm transition disabled:opacity-50"
                    >
                        {opt.text}
                    </button>
                );
            })}
            <div className="flex items-center justify-between text-[11px] font-mono text-black/50 pt-1">
                <span>{total} {total === 1 ? "voto" : "votos"}</span>
                {left && (
                    <span className="inline-flex items-center gap-1">
                        <Clock size={10} /> {left}
                    </span>
                )}
            </div>
        </div>
    );
}
