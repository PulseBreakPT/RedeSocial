import { Link } from "react-router-dom";
import { TrendingUp } from "lucide-react";
import { usePulse } from "../../hooks/usePulse";

function fmtDelta(pct) {
    if (typeof pct !== "number" || !isFinite(pct)) return null;
    const rounded = Math.round(pct);
    return `${rounded >= 0 ? "↑" : "↓"}${Math.abs(rounded)}%`;
}

/**
 * TopicBurstChips — chips horizontais com os tópicos a crescer agora.
 *
 * Só mostra hashtags marcadas `meaningful` pelo backend (count ≥ 3 e
 * ≥ +20% acima da baseline). Se não há nenhuma → devolve `null`.
 * Cada chip navega para /tag/{tag}.
 */
export function TopicBurstChips({ max = 5 }) {
    const { meaningful_topics } = usePulse();
    const topics = (meaningful_topics || []).slice(0, max);

    if (topics.length === 0) return null;

    return (
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar" data-testid="topic-burst-chips">
            <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-[0.12em] text-black/45 shrink-0">
                <TrendingUp size={12} strokeWidth={2} /> A crescer
            </span>
            {topics.map((t) => {
                const d = fmtDelta(t.delta_pct);
                return (
                    <Link
                        key={t.tag}
                        to={`/tag/${encodeURIComponent(t.tag)}`}
                        data-testid={`topic-burst-${t.tag}`}
                        className="inline-flex items-center gap-1.5 px-3 h-8 rounded-full border border-black/[0.08] bg-white hover:border-black/30 hover:shadow-sm transition tap-shrink shrink-0"
                    >
                        <span className="text-[12.5px] font-medium tracking-tight text-black">{t.label}</span>
                        {d && <span className="text-[11px] font-mono text-[var(--eu-500)]">{d}</span>}
                    </Link>
                );
            })}
        </div>
    );
}

export default TopicBurstChips;
