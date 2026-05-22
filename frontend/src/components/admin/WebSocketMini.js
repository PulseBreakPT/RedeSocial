import React from "react";

/**
 * WebSocketMini — number of live ws sockets / users.
 *
 * v2 (C-4 fix): previously this widget rendered a sparkline using the
 * `users_online.sparkline` series (new sessions per minute) which had
 * nothing to do with WebSocket activity — visually misleading. We now
 * show the real instantaneous values from /admin/cockpit/services and
 * the live WS state without inventing a trend we don't have a real
 * source for. If a true WS timeseries gets persisted server-side later,
 * a `sparkline` prop can be re-added.
 */
export function WebSocketMini({ sockets = 0, users = 0, live = false, onClick }) {
    const clickable = typeof onClick === "function";
    const Tag = clickable ? "button" : "div";
    const props = clickable
        ? { type: "button", onClick, style: { width: "100%", textAlign: "left", background: "transparent", border: "none", cursor: "pointer", padding: 0 } }
        : {};
    const ratio = users > 0 ? (sockets / users).toFixed(1) : "—";
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
            <div style={{ fontSize: 10.5, color: "var(--ops-text-faint)", marginBottom: 6 }} title="Rácio sockets / utilizadores únicos. >1 indica múltiplas abas/dispositivos por user.">
                {ratio !== "—" ? `${ratio} sockets/user` : "—"}
            </div>
            <div style={{ marginTop: 2, fontSize: 11, color: "var(--ops-text-faint)", display: "flex", alignItems: "center", gap: 6 }}>
                <span className="ops-pulse-dot" style={{ background: live ? "var(--ops-realtime-500)" : "var(--ops-slate-300)" }} />
                {live ? "WebSocket ligado" : "WebSocket inativo"}
            </div>
        </Tag>
    );
}

export default WebSocketMini;
