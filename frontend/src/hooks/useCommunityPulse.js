import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { useWsMessages, useWsState } from "../components/WebSocketProvider";

/**
 * useCommunityPulse — estado vivo de uma comunidade + presença na sala.
 *
 * Faz duas coisas, ambas com dados REAIS:
 *  1) Lê GET /communities/{slug}/pulse (temperatura, energia, estado, mood,
 *     trends internas) e mantém-no fresco via o evento WS `community_pulse`
 *     que o motor difunde a cada 60s às comunidades ativas.
 *  2) Entra/sai da SALA WS da comunidade (eventos `community_view` /
 *     `community_unview`, à imagem do usePostPresence) e escuta
 *     `community_presence` para o contador "X pessoas aqui agora" ao vivo.
 *
 * Devolve { pulse, presentNow, loading, refresh, wsState }.
 */
export function useCommunityPulse(slug, communityId) {
    const [pulse, setPulse] = useState(null);
    const [presentNow, setPresentNow] = useState(0);
    const [loading, setLoading] = useState(true);
    const wsState = useWsState();
    const joinedRef = useRef(false);

    const refresh = useCallback(async () => {
        if (!slug) return;
        try {
            const { data } = await api.get(`/communities/${slug}/pulse`);
            setPulse(data);
            if (typeof data.present_now === "number") setPresentNow(data.present_now);
        } catch { /* silent — ambiental */ } finally {
            setLoading(false);
        }
    }, [slug]);

    useEffect(() => { refresh(); }, [refresh]);

    // Entrar/sair da sala WS da comunidade.
    useEffect(() => {
        if (!communityId) return undefined;
        joinedRef.current = false;
        const send = (payload) => {
            try {
                const sock = window.__VMLN_WS__;
                if (sock && sock.readyState === 1) { sock.send(JSON.stringify(payload)); return true; }
            } catch { /* ignore */ }
            return false;
        };
        const join = () => { if (send({ type: "community_view", community_id: communityId })) joinedRef.current = true; };
        join();
        const onOpen = () => join();
        window.addEventListener("vmln:ws-open", onOpen);
        return () => {
            window.removeEventListener("vmln:ws-open", onOpen);
            if (joinedRef.current) send({ type: "community_unview", community_id: communityId });
        };
    }, [communityId]);

    // Atualizações ao vivo: pulso (60s) e presença.
    const onWs = useCallback((msg) => {
        if (!msg) return;
        if (msg.type === "community_pulse" && communityId && msg.community_id === communityId) {
            if (msg.pulse) setPulse((prev) => ({ ...(prev || {}), ...msg.pulse }));
        } else if (msg.type === "community_presence" && communityId && msg.community_id === communityId) {
            setPresentNow(msg.count || 0);
        }
    }, [communityId]);
    useWsMessages(onWs);

    return { pulse, presentNow, loading, refresh, wsState };
}

export default useCommunityPulse;
