import { useEffect, useMemo, useState } from "react";
import { usePulse } from "../../hooks/usePulse";

// Formata um delta percentual para texto humano: 38.4 → "+38%".
function fmtDelta(pct) {
    if (typeof pct !== "number" || !isFinite(pct)) return null;
    const rounded = Math.round(pct);
    return `${rounded >= 0 ? "+" : ""}${rounded}%`;
}

/**
 * PulseBar — barra ambiental no topo do feed.
 *
 * Regra de ouro (honestidade do sinal): só aparece quando há sinal REAL
 * marcado como `meaningful` pelo backend, ou quando o pulso global está
 * claramente acima do normal (`pulse_delta_pct > 20`). Sem sinal →
 * devolve `null`. Nunca força uma mensagem que não seja verdade.
 *
 * Read-only / ambiente: sem cliques na v1. As mensagens rodam a cada 8s.
 */
export function PulseBar() {
    const {
        dominant_mood,
        moods,
        pulse_delta_pct,
        meaningful_regions,
        meaningful_cities,
        meaningful_topics,
    } = usePulse();

    // Constrói a lista de sinais verdadeiros, por ordem de relevância.
    const signals = useMemo(() => {
        const out = [];

        // 1) Pulso global acima do normal.
        if (typeof pulse_delta_pct === "number" && pulse_delta_pct > 20) {
            out.push(`Portugal está ${fmtDelta(pulse_delta_pct)} acima do normal`);
        }

        // 2) Cidade/região em destaque (cidade é mais específica → primeiro).
        const place = (meaningful_cities && meaningful_cities[0]) || (meaningful_regions && meaningful_regions[0]);
        if (place) {
            const d = fmtDelta(place.delta_pct);
            out.push(d ? `${place.label} está ${d} acima do normal` : `${place.label} está animada`);
        }

        // 3) Tópico a crescer.
        const topic = meaningful_topics && meaningful_topics[0];
        if (topic) {
            const d = fmtDelta(topic.delta_pct);
            out.push(d ? `${topic.label} a crescer ${d}` : `${topic.label} a crescer`);
        }

        // 4) Mood dominante.
        if (dominant_mood) {
            const label = moods && moods[dominant_mood] && moods[dominant_mood].label;
            if (label) out.push(`Estado: ${label}`);
        }

        return out;
    }, [pulse_delta_pct, meaningful_cities, meaningful_regions, meaningful_topics, dominant_mood, moods]);

    const [idx, setIdx] = useState(0);

    // Roda as mensagens a cada 8s. Reinicia quando o conjunto muda.
    useEffect(() => {
        setIdx(0);
        if (signals.length <= 1) return undefined;
        const t = setInterval(() => {
            setIdx((i) => (i + 1) % signals.length);
        }, 8000);
        return () => clearInterval(t);
    }, [signals]);

    // Sem sinal meaningful → não mente: desaparece.
    if (signals.length === 0) return null;

    const message = signals[Math.min(idx, signals.length - 1)];

    return (
        <div
            className="flex items-center gap-2.5 px-3.5 py-2 rounded-2xl border border-[var(--coral-500)]/15 bg-gradient-to-r from-[var(--coral-50)] to-transparent"
            role="status"
            aria-live="polite"
            aria-label={`Lusorae viva: ${message}`}
            data-testid="pulse-bar"
        >
            <span className="live-dot shrink-0" aria-hidden />
            <span className="type-overline text-[var(--coral-500)] shrink-0">Lusorae viva</span>
            <span className="text-black/20 shrink-0">·</span>
            <span
                key={message}
                className="text-[12.5px] font-medium tracking-tight text-black/70 truncate anim-fade-up"
            >
                {message}
            </span>
        </div>
    );
}

export default PulseBar;
