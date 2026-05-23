import { useEffect, useState } from "react";
import { api } from "../../lib/api";

/**
 * FeedContextLine — sinal contextual subtil no cabeçalho do feed
 * ("Domingo à noite · ritmo calmo"). Vem do Context Engine (Fase 4):
 * determinístico a partir do relógio + calendário PT + mood dominante.
 *
 * Atualiza a cada 10 min (o contexto muda devagar — slot de hora/dia).
 * Sem label → não renderiza nada.
 */
export function FeedContextLine({ className = "" }) {
    const [label, setLabel] = useState("");

    useEffect(() => {
        let cancelled = false;
        const fetchCtx = async () => {
            try {
                const { data } = await api.get("/feed/context");
                if (!cancelled) setLabel(data?.label || "");
            } catch { /* silent — ambiental */ }
        };
        fetchCtx();
        const t = setInterval(fetchCtx, 600000);
        return () => { cancelled = true; clearInterval(t); };
    }, []);

    if (!label) return null;

    return (
        <span className={`text-[12px] text-black/45 font-medium tracking-tight ${className}`} data-testid="feed-context-line">
            {label}
        </span>
    );
}

export default FeedContextLine;
