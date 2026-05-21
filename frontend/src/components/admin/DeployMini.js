import React from "react";
import { CheckCircle2 } from "lucide-react";

function shortCommit(c) {
    if (!c) return "—";
    return (c || "").slice(0, 7);
}
function shortTime(iso) {
    if (!iso) return "—";
    try {
        const d = new Date(iso);
        const hh = String(d.getHours()).padStart(2, "0");
        const mm = String(d.getMinutes()).padStart(2, "0");
        const day = d.toDateString() === new Date().toDateString() ? "Hoje" : d.toLocaleDateString("pt-PT");
        return `${day} ${hh}:${mm}`;
    } catch { return "—"; }
}

export function DeployMini({ data }) {
    const rows = [
        { k: "Versão",     v: data?.version || shortCommit(data?.commit) || "—" },
        { k: "Ambiente",   v: (data?.app_env || "—").toUpperCase() },
        { k: "Deployado",  v: shortTime(data?.deployed_at) },
    ];
    return (
        <div>
            {rows.map((r) => (
                <div key={r.k} className="ops-deploy-row">
                    <span className="ops-deploy-row__k">{r.k}</span>
                    <span className="ops-deploy-row__v">{r.v}</span>
                </div>
            ))}
            <div className="ops-deploy-row">
                <span className="ops-deploy-row__k">Status</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "var(--ops-success-600)", fontSize: 11.5, fontWeight: 600 }}>
                    <CheckCircle2 size={12} /> Estável
                </span>
            </div>
        </div>
    );
}

export default DeployMini;
