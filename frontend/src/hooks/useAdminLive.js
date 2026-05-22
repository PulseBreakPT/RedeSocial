import { useEffect, useRef, useState, useCallback } from "react";
import { useWsMessages, useWsState } from "../components/WebSocketProvider";
import { api } from "../lib/api";

/**
 * useAdminLive — hybrid live-data hook for the admin cockpit.
 *
 * - Fetches the bundled `/admin/cockpit/snapshot` on mount.
 * - Subscribes to WebSocket `cockpit_event` messages and prepends new
 *   activity items to the ticker in real time.
 * - When the WS is offline / degraded, automatically polls every
 *   `pollMs` (default 8s) so the dashboard never goes stale.
 * - Accepts a `window` option (15m/1h/24h/7d) which is forwarded to the
 *   snapshot endpoint so the KPI strip honours the global time-range
 *   selector instead of being hardcoded to 15min (C-1 fix).
 *
 * Returns:
 *   { data, error, loading, refresh, wsState, lastEventAt, activity }
 *   activity is the always-up-to-date list (snapshot ∪ live events), capped.
 */
export function useAdminLive({ pollMs = 8000, activityCap = 40, window = "15m" } = {}) {
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const [lastEventAt, setLastEventAt] = useState(null);
    const [liveActivity, setLiveActivity] = useState([]);
    const wsState = useWsState();
    const pollTimerRef = useRef(null);
    const inFlightRef = useRef(false);
    const mountedRef = useRef(true);

    const fetchSnapshot = useCallback(async (background = false) => {
        if (inFlightRef.current) return;
        inFlightRef.current = true;
        if (!background) setLoading(true);
        try {
            const { data: snap } = await api.get(`/admin/cockpit/snapshot?window=${encodeURIComponent(window)}`);
            if (!mountedRef.current) return;
            setData(snap);
            setError(null);
        } catch (e) {
            if (!mountedRef.current) return;
            const msg = (e && e.response && e.response.data && e.response.data.detail) || (e && e.message) || "Falha a obter cockpit";
            setError(msg);
        } finally {
            inFlightRef.current = false;
            if (mountedRef.current) setLoading(false);
        }
    }, [window]);

    // Initial fetch
    useEffect(() => {
        mountedRef.current = true;
        // Reset in-flight gate so a window change re-fetches immediately
        // instead of being suppressed by an inflight request for the old window.
        inFlightRef.current = false;
        fetchSnapshot(false);
        return () => { mountedRef.current = false; };
    }, [fetchSnapshot]);

    // Polling fallback — active when WS isn't live.
    useEffect(() => {
        if (pollTimerRef.current) {
            clearInterval(pollTimerRef.current);
            pollTimerRef.current = null;
        }
        if (wsState === "live") {
            // WS is live: poll only at a slow cadence to keep KPIs in sync.
            pollTimerRef.current = setInterval(() => fetchSnapshot(true), Math.max(pollMs * 4, 20000));
        } else {
            pollTimerRef.current = setInterval(() => fetchSnapshot(true), pollMs);
        }
        return () => {
            if (pollTimerRef.current) clearInterval(pollTimerRef.current);
        };
    }, [wsState, pollMs, fetchSnapshot]);

    // WebSocket subscriptions — cockpit_event push.
    const onWs = useCallback((msg) => {
        if (!msg || msg.type !== "cockpit_event") return;
        const now = new Date().toISOString();
        setLastEventAt(now);
        // Map the WS event to an activity item the ticker can render.
        const kind = msg.kind || "new_content";
        const payload = msg.payload || {};
        let title = "Evento";
        let subtitle = "";
        let severity = "info";
        if (kind === "new_report") {
            const q = payload.queue || "review";
            severity = q === "urgent" ? "danger" : (q === "spam" ? "info" : "warn");
            title = q === "urgent" ? "Report urgente" : "Novo report";
            subtitle = `${payload.reason || "sem motivo"} · ${payload.kind || ""}${payload.target_username ? ` · @${payload.target_username}` : ""}`;
        } else if (kind === "admin_action") {
            severity = "warn";
            title = `Ação admin: ${payload.action || "?"}`;
            subtitle = `por @${payload.actor_username || "?"}`;
        } else {
            title = String(kind);
        }
        const item = {
            id: `live:${kind}:${msg.ts || now}:${Math.random().toString(36).slice(2, 8)}`,
            ts: msg.ts || now,
            kind: kind === "new_report" ? "new_report" : (kind === "admin_action" ? "admin_action" : "default"),
            severity,
            title,
            subtitle,
            ref: payload,
            _live: true,
        };
        setLiveActivity((prev) => [item, ...prev].slice(0, activityCap));
        // Trigger a soft snapshot refresh so KPIs / queues catch up.
        if (kind === "new_report" || kind === "admin_action") {
            fetchSnapshot(true);
        }
    }, [activityCap, fetchSnapshot]);
    useWsMessages(onWs);

    // Merge live activity in front of the snapshot activity, dedup by id, cap.
    const merged = (() => {
        const baseItems = (data && data.activity && Array.isArray(data.activity.items)) ? data.activity.items : [];
        const out = [...liveActivity, ...baseItems];
        const seen = new Set();
        const dedup = [];
        for (const it of out) {
            if (!it || !it.id || seen.has(it.id)) continue;
            seen.add(it.id);
            dedup.push(it);
            if (dedup.length >= activityCap) break;
        }
        return dedup;
    })();

    return {
        data,
        error,
        loading,
        refresh: () => fetchSnapshot(false),
        wsState,
        lastEventAt,
        activity: merged,
    };
}

export default useAdminLive;
