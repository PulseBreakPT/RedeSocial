import { useEffect, useState } from "react";
import { api } from "../lib/api";

/**
 * useCommunityRhythm — ritmo & memória da comunidade (perfil horário,
 * sparkline 24h, horas fortes, dias vivos). Leitura ambiental; carrega quando
 * `enabled` (ex.: tab Sobre aberto) para não pesar no hot path.
 */
export function useCommunityRhythm(slug, enabled = true) {
    const [rhythm, setRhythm] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!slug || !enabled) return;
        let alive = true;
        setLoading(true);
        api.get(`/communities/${slug}/ritmo`)
            .then(({ data }) => { if (alive) setRhythm(data); })
            .catch(() => { /* ambiental */ })
            .finally(() => { if (alive) setLoading(false); });
        return () => { alive = false; };
    }, [slug, enabled]);

    return { rhythm, loading };
}

export default useCommunityRhythm;
