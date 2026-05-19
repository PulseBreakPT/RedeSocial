import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";

/**
 * Subscribes a single shared poller to /api/conversations/pulse.
 *
 * Returns:
 *   {
 *     active_total: number,
 *     typing_set: Set<string>,   // peer ids currently typing to me
 *     recent_set: Set<string>,   // peer ids who messaged me in last 5min
 *     online_set: Set<string>,   // peer ids currently online (subset of my convs)
 *   }
 *
 * Polls every ~9s (typing expires server-side after 6s so any slower is noticeable).
 * On WS new_message events, it fires an early refresh so the row reacts instantly.
 */
const POLL_MS = 9000;

let snapshot = {
    active_total: 0,
    typing_set: new Set(),
    recent_set: new Set(),
    online_set: new Set(),
};
const listeners = new Set();
let timer = null;
let inFlight = false;

async function runPoll() {
    if (inFlight) return;
    inFlight = true;
    try {
        const { data } = await api.get("/conversations/pulse");
        snapshot = {
            active_total: Number(data?.active_total || 0),
            typing_set: new Set(Array.isArray(data?.my_typing) ? data.my_typing : []),
            recent_set: new Set(Array.isArray(data?.my_recent) ? data.my_recent : []),
            online_set: new Set(Array.isArray(data?.my_online) ? data.my_online : []),
        };
        listeners.forEach((fn) => { try { fn(snapshot); } catch {} });
    } catch { /* atmospheric — never blocking */ } finally {
        inFlight = false;
    }
}

function ensurePolling() {
    if (timer) return;
    timer = setInterval(runPoll, POLL_MS);
    runPoll();
}

function stopPollingIfIdle() {
    if (listeners.size === 0 && timer) {
        clearInterval(timer);
        timer = null;
    }
}

// Listen globally to new_message WS events → trigger an early refresh.
if (typeof window !== "undefined" && !window.__VMLN_CONV_PULSE_BIND__) {
    window.__VMLN_CONV_PULSE_BIND__ = true;
    try {
        window.addEventListener("message", () => {}); // noop, just to ensure window is alive
    } catch {}
    // We listen to ws messages via the WebSocketProvider stream — but since
    // this module can't import the React hook, we listen to a window event
    // that we'll dispatch from a consumer (see Messages.js).
    window.addEventListener("vmln:conv-refresh", () => {
        if (listeners.size > 0) runPoll();
    });
}

export function useConversationsPulse() {
    const [snap, setSnap] = useState(snapshot);
    const setterRef = useRef(setSnap);
    setterRef.current = setSnap;
    useEffect(() => {
        const fn = (s) => setterRef.current(s);
        listeners.add(fn);
        ensurePolling();
        return () => {
            listeners.delete(fn);
            stopPollingIfIdle();
        };
    }, []);
    return snap;
}

/** Trigger an immediate refresh — call after sending/receiving a message. */
export function refreshConversationsPulse() {
    if (listeners.size > 0) runPoll();
}
