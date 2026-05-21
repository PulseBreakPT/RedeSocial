import React from "react";

function formatUptime(seconds) {
    if (!Number.isFinite(seconds)) return "—";
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
}

function barTone(pct) {
    if (pct >= 85) return "danger";
    if (pct >= 65) return "warn";
    return "";
}

export function SystemMini({ data, onSelect }) {
    const cpu = data?.cpu_percent;
    const mem = data?.memory_percent;
    const lat = data?.api_latency_ms;
    const uptime = data?.uptime_seconds;
    const clickable = typeof onSelect === "function";
    const Tag = clickable ? "button" : "div";
    const props = clickable ? { type: "button", onClick: onSelect, "data-testid": "sysmini-open" } : {};
    return (
        <Tag className={`ops-sysmini ${clickable ? "ops-sysmini--clickable" : ""}`} {...props}>
            <div className="ops-sysmini__cell">
                <div className="ops-sysmini__label">Uptime</div>
                <div className="ops-sysmini__value">{formatUptime(uptime)}</div>
            </div>
            <div className="ops-sysmini__cell">
                <div className="ops-sysmini__label">Latência API</div>
                <div className="ops-sysmini__value">{Number.isFinite(lat) ? `${lat}ms` : "—"}</div>
            </div>
            <div className="ops-sysmini__cell">
                <div className="ops-sysmini__label">CPU</div>
                <div className="ops-sysmini__value">{Number.isFinite(cpu) ? `${cpu.toFixed(1)}%` : "—"}</div>
                <div className="ops-sysmini__bar"><div className={`ops-sysmini__bar-fill ${barTone(cpu) ? `ops-sysmini__bar-fill--${barTone(cpu)}` : ""}`} style={{ width: `${Math.min(100, cpu || 0)}%` }} /></div>
            </div>
            <div className="ops-sysmini__cell">
                <div className="ops-sysmini__label">Memória</div>
                <div className="ops-sysmini__value">{Number.isFinite(mem) ? `${mem.toFixed(1)}%` : "—"}</div>
                <div className="ops-sysmini__bar"><div className={`ops-sysmini__bar-fill ${barTone(mem) ? `ops-sysmini__bar-fill--${barTone(mem)}` : ""}`} style={{ width: `${Math.min(100, mem || 0)}%` }} /></div>
            </div>
        </Tag>
    );
}

export default SystemMini;
