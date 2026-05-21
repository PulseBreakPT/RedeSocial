import React from "react";

const STATUS_LABEL = {
    operational: "Operacional",
    degraded:    "Degradado",
    down:        "Down",
};

export function ServiceStatus({ services = [] }) {
    if (!services.length) {
        return <div className="ops-empty">Sem serviços a reportar.</div>;
    }
    return (
        <div>
            {services.map((s) => (
                <div key={s.key} className="ops-service-row" data-testid={`ops-service-${s.key}`}>
                    <span className={`ops-service-row__dot ops-service-row__dot--${s.status}`} aria-hidden />
                    <div>
                        <div className="ops-service-row__name">{s.label}</div>
                        {s.detail && <div style={{ fontSize: 10.5, color: "var(--ops-text-faint)", fontFamily: "var(--ops-font-mono)", marginTop: 1 }}>{s.detail}</div>}
                    </div>
                    <span className={`ops-service-row__status ops-service-row__status--${s.status}`}>{STATUS_LABEL[s.status] || s.status}</span>
                    <span className="ops-service-row__latency">{s.latency_ms != null ? `${s.latency_ms}ms` : "—"}</span>
                </div>
            ))}
        </div>
    );
}

export default ServiceStatus;
