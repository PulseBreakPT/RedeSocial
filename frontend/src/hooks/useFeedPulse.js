import { useEffect, useRef, useState, useCallback } from "react";
import { api } from "../lib/api";

/**
 * Batched "is this post alive right now?" polling.
 *
 * Multiple PostCard components register their id via `useFeedPulseEntry(id)`.
 * A single shared interval coalesces all visible ids into one HTTP request
 * every POLL_MS, so the feed never hammers the backend.
 *
 * Returns the latest pulse snapshot for the registered id:
 *   {
 *     live_viewers: number,
 *     recent_comments_15m: number,
 *     last_comment_at: string | null,
 *     heat: "frio" | "morno" | "quente" | "em_brasa" | "a_ferver",
 *     is_hot: boolean,
 *   }
 */

const POLL_MS = 30000;     // 30s — atmospheric, not a casino refresh
const BURST_DELAY = 1200;  // coalesce window when a new card registers

const subscribers = new Map(); // postId -> Set<setter>
const cache = new Map();       // postId -> pulse snapshot
let pollTimer = null;
let burstTimer = null;
let inFlight = false;

async function runPoll() {
    if (inFlight) return;
    const ids = Array.from(subscribers.keys()).filter((id) => subscribers.get(id)?.size > 0);
    if (ids.length === 0) return;
    inFlight = true;
    try {
        // Chunk to 50 ids per request (backend caps at 60)
        const chunks = [];
        for (let i = 0; i < ids.length; i += 50) chunks.push(ids.slice(i, i + 50));
        const responses = await Promise.all(
            chunks.map((c) => api.get(`/posts/activity-pulse?ids=${encodeURIComponent(c.join(","))}`).then((r) => r.data?.posts || {}).catch(() => ({}))),
        );
        const merged = Object.assign({}, ...responses);
        for (const [pid, snap] of Object.entries(merged)) {
            cache.set(pid, snap);
            const subs = subscribers.get(pid);
            if (subs) {
                subs.forEach((set) => {
                    try { set(snap); } catch {}
                });
            }
        }
    } catch { /* silent — atmospheric, not blocking */ } finally {
        inFlight = false;
    }
}

function ensurePolling() {
    if (pollTimer) return;
    pollTimer = setInterval(runPoll, POLL_MS);
    // Coalesce a first run when cards register in burst
    if (burstTimer) clearTimeout(burstTimer);
    burstTimer = setTimeout(runPoll, BURST_DELAY);
}

function stopPollingIfIdle() {
    let any = false;
    subscribers.forEach((set) => { if (set.size > 0) any = true; });
    if (!any && pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
    }
}

export function useFeedPulse(postId) {
    const [snap, setSnap] = useState(() => cache.get(postId) || null);
    const setterRef = useRef(setSnap);
    setterRef.current = setSnap;

    useEffect(() => {
        if (!postId) return undefined;
        if (!subscribers.has(postId)) subscribers.set(postId, new Set());
        const set = subscribers.get(postId);
        set.add(setterRef.current);
        ensurePolling();
        // Hydrate from cache immediately
        const cached = cache.get(postId);
        if (cached) setterRef.current(cached);
        return () => {
            const s = subscribers.get(postId);
            if (s) s.delete(setterRef.current);
            stopPollingIfIdle();
        };
    }, [postId]);

    // Listen for live "new_comment" WS events for this post and optimistically
    // bump recent_comments_15m (cheap atmospheric reaction; next poll reconciles).
    useEffect(() => {
        if (!postId) return undefined;
        const onNew = (e) => {
            if (e?.detail?.post_id !== postId) return;
            const cur = cache.get(postId) || { live_viewers: 0, recent_comments_15m: 0, heat: "frio", is_hot: false, last_comment_at: null };
            const next = {
                ...cur,
                recent_comments_15m: (cur.recent_comments_15m || 0) + 1,
                last_comment_at: new Date().toISOString(),
            };
            // Heat re-scoring (mirrors backend)
            const score = next.recent_comments_15m * 8 + (next.live_viewers || 0) * 4;
            next.heat = score >= 70 ? "a_ferver" : score >= 45 ? "em_brasa" : score >= 25 ? "quente" : score >= 10 ? "morno" : "frio";
            next.is_hot = ["quente", "em_brasa", "a_ferver"].includes(next.heat);
            cache.set(postId, next);
            const subs = subscribers.get(postId);
            if (subs) subs.forEach((s) => { try { s(next); } catch {} });
        };
        window.addEventListener("vmln:new_comment", onNew);
        return () => window.removeEventListener("vmln:new_comment", onNew);
    }, [postId]);

    // Manual refresh helper (e.g. when user opens detail)
    const refresh = useCallback(() => { runPoll(); }, []);
    return { pulse: snap, refresh };
}
