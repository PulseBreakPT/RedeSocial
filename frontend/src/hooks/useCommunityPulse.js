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
const TYPING_TTL_MS = 6000;
const TYPING_THROTTLE_MS = 3000;

export function useCommunityPulse(slug, communityId) {
    const [pulse, setPulse] = useState(null);
    const [presentNow, setPresentNow] = useState(0);
    const [typers, setTypers] = useState([]);   // [{user, at}]
    const [happening, setHappening] = useState(null);  // momento ativo (ou null)
    const [loading, setLoading] = useState(true);
    const wsState = useWsState();
    const joinedRef = useRef(false);
    const lastTypingRef = useRef(0);

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

    // Momento (happening) ativo inicial.
    useEffect(() => {
        if (!slug) return;
        api.get(`/communities/${slug}/hype/active`)
            .then(({ data }) => setHappening(data || null))
            .catch(() => { /* ambiental */ });
    }, [slug]);

    const amplify = useCallback(async () => {
        if (!slug) return;
        try {
            const { data } = await api.post(`/communities/${slug}/hype`);
            if (data && data.active) setHappening(data);
        } catch { /* ignore */ }
    }, [slug]);

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

    // Atualizações ao vivo: pulso (60s), presença e quem está a escrever.
    const onWs = useCallback((msg) => {
        if (!msg || !communityId || msg.community_id !== communityId) return;
        if (msg.type === "community_pulse") {
            if (msg.pulse) setPulse((prev) => ({ ...(prev || {}), ...msg.pulse }));
        } else if (msg.type === "community_presence") {
            setPresentNow(msg.count || 0);
        } else if (msg.type === "community_typing" && msg.user) {
            const at = Date.now();
            setTypers((prev) => [...prev.filter((p) => p.user.id !== msg.user.id), { user: msg.user, at }]);
        } else if (msg.type === "community_happening") {
            if (msg.phase === "ended") setHappening(null);
            else if (msg.happening) setHappening(msg.happening);
        }
    }, [communityId]);
    useWsMessages(onWs);

    // Expira typers antigos.
    useEffect(() => {
        const tick = setInterval(() => {
            const now = Date.now();
            setTypers((prev) => {
                const next = prev.filter((p) => now - p.at < TYPING_TTL_MS);
                return next.length === prev.length ? prev : next;
            });
        }, 1000);
        return () => clearInterval(tick);
    }, []);

    // Emite "estou a escrever" (throttled).
    const notifyTyping = useCallback(() => {
        if (!communityId) return;
        const now = Date.now();
        if (now - lastTypingRef.current < TYPING_THROTTLE_MS) return;
        lastTypingRef.current = now;
        try {
            const sock = window.__VMLN_WS__;
            if (sock && sock.readyState === 1) sock.send(JSON.stringify({ type: "community_typing", community_id: communityId }));
        } catch { /* ignore */ }
    }, [communityId]);

    return { pulse, presentNow, typers, notifyTyping, happening, amplify, loading, refresh, wsState };
}

export default useCommunityPulse;
