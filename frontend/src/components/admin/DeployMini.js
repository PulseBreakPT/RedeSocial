import React from "react";
import { CheckCircle2, AlertTriangle, ShieldOff, HelpCircle } from "lucide-react";

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

/**
 * DeployMini — deploy fingerprint widget for the Cockpit bottom row.
 *
 * v2 (C-3 fix): "Status" no longer says "Estável" tautologically. We now
 * read the real `stable` flag computed on the backend from
 * `services_overall` (see /admin/cockpit/deploy and the snapshot
 * post-processor). Color and label follow the services_overall value so
 * a degraded MongoDB or down WS gateway is finally visible here.
 */
export function DeployMini({ data }) {
    const stable = data ? !!data.stable : null;
    const overall = (data && data.services_overall) || (stable === null ? "unknown" : (stable ? "operational" : "degraded"));

    let statusColor = "var(--ops-text-muted)";
    let StatusIcon = HelpCircle;
    let statusLabel = "—";
    let statusTitle = "Estado do sistema desconhecido (não foi possível avaliar os serviços).";
    if (overall === "operational") {
        statusColor = "var(--ops-success-600, #16a34a)";
        StatusIcon = CheckCircle2;
        statusLabel = "Estável";
        statusTitle = "Todos os subsistemas operacionais (API, MongoDB, WebSocket, Storage).";
    } else if (overall === "degraded") {
        statusColor = "var(--ops-warn-700, #b45309)";
        StatusIcon = AlertTriangle;
        statusLabel = "Degradado";
        statusTitle = "Pelo menos um subsistema está degradado. Ver Sistema para detalhes.";
    } else if (overall === "down") {
        statusColor = "var(--ops-danger-700, #b91c1c)";
        StatusIcon = ShieldOff;
        statusLabel = "Indisponível";
        statusTitle = "Pelo menos um subsistema crítico está em baixo. Ver Sistema para detalhes.";
    }

    const rows = [
        { k: "Versão",     v: data?.version || shortCommit(data?.commit) || "—" },
        { k: "Ambiente",   v: (data?.app_env || "—").toUpperCase() },
        { k: "Implementado",  v: shortTime(data?.deployed_at) },
    ];
    return (
        <div>
            {rows.map((r) => (
                <div key={r.k} className="ops-deploy-row">
                    <span className="ops-deploy-row__k">{r.k}</span>
                    <span className="ops-deploy-row__v">{r.v}</span>
                </div>
            ))}
            <div className="ops-deploy-row" title={statusTitle}>
                <span className="ops-deploy-row__k">Estado</span>
                <span
                    style={{ display: "inline-flex", alignItems: "center", gap: 4, color: statusColor, fontSize: 11.5, fontWeight: 600 }}
                    data-testid={`deploy-status-${overall}`}
                >
                    <StatusIcon size={12} /> {statusLabel}
                </span>
            </div>
        </div>
    );
}

export default DeployMini;
