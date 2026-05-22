import React from "react";

const STATUS_LABEL = {
    operational: "Operacional",
    degraded:    "Degradado",
    down:        "Inativo",
};

export function ServiceStatus({ services = [], onSelect }) {
    if (!services.length) {
        return <div className="ops-empty">Sem serviços a reportar.</div>;
    }
    const clickable = typeof onSelect === "function";
    return (
        <div>
            {services.map((s) => {
                const Tag = clickable ? "button" : "div";
                const interactive = clickable ? { type: "button", onClick: () => onSelect(s) } : {};
                return (
                    <Tag key={s.key} className={`ops-service-row ${clickable ? "ops-service-row--clickable" : ""}`} data-testid={`ops-service-${s.key}`} {...interactive}>
                        <span className={`ops-service-row__dot ops-service-row__dot--${s.status}`} aria-hidden />
                        <div>
                            <div className="ops-service-row__name">{s.label}</div>
                            {s.detail && <div style={{ fontSize: 10.5, color: "var(--ops-text-faint)", fontFamily: "var(--ops-font-mono)", marginTop: 1 }}>{s.detail}</div>}
                        </div>
                        <span className={`ops-service-row__status ops-service-row__status--${s.status}`}>{STATUS_LABEL[s.status] || s.status}</span>
                        <span className="ops-service-row__latency">{s.latency_ms != null ? `${s.latency_ms}ms` : "—"}</span>
                    </Tag>
                );
            })}
        </div>
    );
}

export default ServiceStatus;
