import React from "react";
import { Sparkline } from "./Sparkline";

/**
 * WebSocketMini — number of live ws sockets / users.
 * Receives a list of recent ws connection counts as `sparkline` for trend.
 * Values come from /admin/cockpit/services (in-process ws_manager) — REAL.
 */
export function WebSocketMini({ sockets = 0, users = 0, sparkline = [], live = false, onClick }) {
    const clickable = typeof onClick === "function";
    const Tag = clickable ? "button" : "div";
    const props = clickable
        ? { type: "button", onClick, style: { width: "100%", textAlign: "left", background: "transparent", border: "none", cursor: "pointer", padding: 0 } }
        : {};
    return (
        <Tag {...props}>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 8, marginBottom: 4 }}>
                <div style={{ fontSize: 22, fontWeight: 600, color: "var(--ops-text)", fontVariantNumeric: "tabular-nums", lineHeight: 1.1 }}>
                    {Number(sockets || 0).toLocaleString("pt-PT")}
                </div>
                <div style={{ fontSize: 11, color: "var(--ops-text-faint)", marginBottom: 2 }}>
                    sockets · {Number(users || 0).toLocaleString("pt-PT")} users
                </div>
            </div>
            <Sparkline data={sparkline} width={200} height={28} color="#14b8a6" />
            <div style={{ marginTop: 6, fontSize: 11, color: "var(--ops-text-faint)", display: "flex", alignItems: "center", gap: 6 }}>
                <span className={`ops-pulse-dot ${live ? "" : ""}`} style={{ background: live ? "var(--ops-realtime-500)" : "var(--ops-slate-300)" }} />
                {live ? "WebSocket ligado" : "WebSocket inativo"}
            </div>
        </Tag>
    );
}

export default WebSocketMini;
