import { useCallback, useEffect, useMemo, useState } from "react";
import { useWsMessages, useWsState } from "../components/WebSocketProvider";
import { api } from "../lib/api";

/**
 * usePulse — hook partilhado para os widgets ambientais do Pulse Engine.
 *
 * O endpoint `/api/pulse/now` já devolve o snapshot completo (totals,
 * baseline, regions, cities, topics, moods, dominant_mood,
 * pulse_delta_pct), por isso fazemos UMA só chamada e derivamos as listas
 * `meaningful` no cliente — não há vantagem em bater nos endpoints
 * dedicados (/regions, /topics, /mood).
 *
 * Store partilhado (padrão de `useFeedPulse`): vários componentes podem
 * usar o hook sem multiplicar pedidos. Existe um único snapshot em
 * memória, um único timer de polling e um conjunto de subscribers.
 *
 * Estratégia de frescura:
 *   - Fetch inicial quando o primeiro consumidor monta.
 *   - WebSocket `pulse_tick` (a cada 60s) → refetch de /now. Não confiamos
 *     no payload condensado do tick para evitar drift.
 *   - Polling de segurança: 60s quando o WS está offline; lento (5 min)
 *     quando está live, só para nunca ficar preso em dados velhos.
 *
 * Honestidade do sinal: nada é inventado. `meaningful` vem do backend
 * (count ≥ 3 E ≥ +20% acima da baseline). Sem sinal → listas vazias e os
 * widgets devolvem `null`.
 */

// ── Store partilhado em módulo ──────────────────────────────────────
let snapshot = null;
let lastError = null;
let loaded = false;
const listeners = new Set();
let consumers = 0;
let pollTimer = null;
let pollEveryMs = 60000;
let inFlight = false;

function notify() {
    listeners.forEach((fn) => { try { fn(); } catch { /* silent */ } });
}

async function fetchNow() {
    if (inFlight) return;
    inFlight = true;
    try {
        const { data } = await api.get("/pulse/now");
        snapshot = data;
        lastError = null;
    } catch (e) {
        // Falha silenciosa: é uma feature ambiental, não bloqueia o feed.
        lastError = e;
    } finally {
        inFlight = false;
        loaded = true;
        notify();
    }
}

function ensurePolling() {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(() => { if (consumers > 0) fetchNow(); }, pollEveryMs);
}

function setPollCadence(ms) {
    if (ms === pollEveryMs) return;
    pollEveryMs = ms;
    if (consumers > 0) ensurePolling();
}

export function usePulse() {
    const [, forceRender] = useState(0);
    const wsState = useWsState();

    // Subscrição ao store partilhado.
    useEffect(() => {
        const fn = () => forceRender((n) => n + 1);
        listeners.add(fn);
        consumers += 1;
        if (consumers === 1) {
            ensurePolling();
            if (!loaded) fetchNow();
        }
        return () => {
            listeners.delete(fn);
            consumers = Math.max(0, consumers - 1);
            if (consumers === 0 && pollTimer) {
                clearInterval(pollTimer);
                pollTimer = null;
            }
        };
    }, []);

    // Cadência do polling adapta-se ao estado do WS.
    useEffect(() => {
        setPollCadence(wsState === "live" ? 300000 : 60000);
    }, [wsState]);

    // WebSocket — o tick é o gatilho real; refazemos o /now.
    const onWs = useCallback((msg) => {
        if (!msg || msg.type !== "pulse_tick") return;
        fetchNow();
    }, []);
    useWsMessages(onWs);

    const now = snapshot;
    const derived = useMemo(() => {
        const regions = Array.isArray(now?.regions) ? now.regions : [];
        const cities = Array.isArray(now?.cities) ? now.cities : [];
        const topics = Array.isArray(now?.topics) ? now.topics : [];
        return {
            totals: now?.totals || null,
            dominant_mood: now?.dominant_mood || null,
            moods: now?.moods || null,
            pulse_delta_pct: typeof now?.pulse_delta_pct === "number" ? now.pulse_delta_pct : null,
            meaningful_regions: regions.filter((r) => r && r.meaningful),
            meaningful_cities: cities.filter((c) => c && c.meaningful),
            meaningful_topics: topics.filter((t) => t && t.meaningful),
        };
    }, [now]);

    return {
        now,
        loading: !loaded,
        error: lastError,
        wsState,
        refresh: fetchNow,
        ...derived,
    };
}

export default usePulse;
