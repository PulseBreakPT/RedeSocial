import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { playNotifSound } from "../lib/sound";

// Mood → ring gradient mapping
const MOOD_RINGS = {
    saudade: "ring-gradient-saudade",
    tasca:   "ring-gradient-tasca",
    festa:   "ring-gradient-festa",
    cafe:    "ring-gradient-cafe",
    praia:   "ring-gradient-praia",
    fado:    "ring-gradient-fado",
    futebol: "ring-gradient-futebol",
    cultura: "ring-gradient-cultura",
};

// Connection state tracker. Tracks WebSocket connection lifecycle.
// Returns: 'live' | 'reconnecting' | 'offline'
const wsListeners = new Set();
let globalWs = null;
let wsState = "offline";
let reconnectTimer = null;

function notifyListeners() {
    wsListeners.forEach((fn) => { try { fn(wsState); } catch {} });
}

function emit(name, detail) {
    try { window.dispatchEvent(new CustomEvent(name, { detail })); } catch {}
}

export function getWsState() { return wsState; }

export function setupWebSocket(token) {
    if (globalWs && (globalWs.readyState === 0 || globalWs.readyState === 1)) return;
    // Always derive WS URL from the current browser origin — same rationale as
    // in lib/api.js: every Emergent ingress proxies /ws on the same host as the
    // SPA, so hardcoding REACT_APP_BACKEND_URL breaks when the user is on a
    // different preview domain.
    let wsUrl;
    if (typeof window !== "undefined" && window.location) {
        const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
        wsUrl = `${proto}//${window.location.host}/ws` + (token ? `?token=${encodeURIComponent(token)}` : "");
    } else {
        const backend = process.env.REACT_APP_BACKEND_URL || "";
        wsUrl = backend.replace(/^http/, "ws") + "/ws" + (token ? `?token=${encodeURIComponent(token)}` : "");
    }
    wsState = "reconnecting";
    notifyListeners();
    try {
        globalWs = new WebSocket(wsUrl);
        if (typeof window !== "undefined") window.__VMLN_WS__ = globalWs;
    } catch (e) {
        wsState = "offline";
        notifyListeners();
        return;
    }
    globalWs.onopen = () => {
        wsState = "live";
        notifyListeners();
        if (typeof window !== "undefined") window.__VMLN_WS__ = globalWs;
        emit("vmln:ws-open", { at: Date.now() });
        // ping every 25s
        if (globalWs._pingTimer) clearInterval(globalWs._pingTimer);
        globalWs._pingTimer = setInterval(() => {
            try { globalWs.send(JSON.stringify({ type: "ping" })); } catch {}
        }, 25000);
    };
    globalWs.onmessage = (evt) => {
        try {
            const data = JSON.parse(evt.data);
            // Dispatch domain events for hooks/components to subscribe via window events
            try {
                switch (data?.type) {
                    case "post_viewers":
                        emit("vmln:post_viewers", data);
                        break;
                    case "c_typing":
                        emit("vmln:c_typing", data);
                        break;
                    case "new_comment":
                        emit("vmln:new_comment", data);
                        break;
                    case "notification":
                    case "notif":
                    case "new_notification":
                        emit("vmln:notif", data);
                        // Play sound if user has it enabled (no-op otherwise)
                        try { playNotifSound(); } catch {}
                        break;
                    default:
                        break;
                }
            } catch {}
            wsListeners.forEach((fn) => {
                if (fn.__type === "message") {
                    try { fn(data); } catch {}
                }
            });
        } catch {}
    };
    globalWs.onclose = () => {
        wsState = "offline";
        notifyListeners();
        if (typeof window !== "undefined") {
            try { delete window.__VMLN_WS__; } catch { window.__VMLN_WS__ = null; }
        }
        if (globalWs._pingTimer) clearInterval(globalWs._pingTimer);
        // reconnect with backoff
        if (reconnectTimer) clearTimeout(reconnectTimer);
        reconnectTimer = setTimeout(() => setupWebSocket(token), 3000);
    };
    globalWs.onerror = () => {
        wsState = "reconnecting";
        notifyListeners();
    };
}

export function teardownWebSocket() {
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (globalWs) {
        try { globalWs.close(); } catch {}
        globalWs = null;
    }
    wsState = "offline";
    notifyListeners();
}

export function sendWs(msg) {
    if (globalWs && globalWs.readyState === 1) {
        try { globalWs.send(JSON.stringify(msg)); } catch {}
    }
}

export function useWsState() {
    const [state, setState] = useState(wsState);
    useEffect(() => {
        const fn = (s) => setState(s);
        wsListeners.add(fn);
        return () => wsListeners.delete(fn);
    }, []);
    return state;
}

export function useWsMessages(handler) {
    useEffect(() => {
        const fn = (data) => handler(data);
        fn.__type = "message";
        wsListeners.add(fn);
        return () => wsListeners.delete(fn);
    }, [handler]);
}

// Connection quality indicator — small dot in topbar/sidebar
export function ConnectionIndicator({ className = "" }) {
    const state = useWsState();
    const colors = {
        live: "bg-green-500",
        reconnecting: "bg-amber-400 animate-pulse",
        offline: "bg-zinc-300",
    };
    const labels = {
        live: "Live",
        reconnecting: "A ligar…",
        offline: "Offline",
    };
    return (
        <div
            className={`inline-flex items-center gap-1.5 ${className}`}
            data-testid={`ws-${state}`}
            title={labels[state]}
        >
            <span className={`w-1.5 h-1.5 rounded-full ${colors[state]}`} />
            <span className="text-[10px] font-mono text-black/45">{labels[state]}</span>
        </div>
    );
}

// Provider component — sets up WS when user logs in
export function WebSocketProvider({ children }) {
    const { user } = useAuth();
    useEffect(() => {
        if (user && user.id) {
            // token is in cookie + localStorage; pass localStorage as fallback
            const token = localStorage.getItem("vm_token") || "";
            setupWebSocket(token);
        } else {
            teardownWebSocket();
        }
        return () => { /* keep alive across re-renders */ };
    }, [user?.id]);
    return children;
}
