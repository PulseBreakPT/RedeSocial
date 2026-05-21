import React from "react";

function relTime(iso) {
    if (!iso) return "";
    const t = new Date(iso).getTime();
    if (!Number.isFinite(t)) return "";
    const diff = Math.max(0, (Date.now() - t) / 1000);
    if (diff < 60) return `${Math.floor(diff)}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
}

export function UrgentReports({ items = [], onClickItem }) {
    if (!items.length) {
        return (
            <div className="ops-empty" style={{ padding: "26px 14px" }}>
                Sem reports urgentes.
                <span className="ops-empty__hint">Tudo limpo neste momento.</span>
            </div>
        );
    }
    return (
        <div>
            {items.map((r) => (
                <button key={r.id} type="button" className="ops-rep-row" onClick={() => onClickItem && onClickItem(r)}>
                    <div className="ops-rep-row__head">
                        <span className={`ops-pulse-dot ${r.queue === "urgent" ? "ops-pulse-dot--danger" : (r.queue === "spam" ? "" : "ops-pulse-dot--warn")}`} />
                        <span className="ops-rep-row__id">#{(r.id || "").slice(-6)}</span>
                        <span className="ops-rep-row__time">há {relTime(r.created_at)}</span>
                    </div>
                    <div className="ops-rep-row__sub">
                        {r.reason || "sem motivo"} · {r.kind || ""}{r.target_username ? ` · @${r.target_username}` : ""}
                    </div>
                </button>
            ))}
        </div>
    );
}

export default UrgentReports;
