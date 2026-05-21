import React from "react";

/**
 * GeoDistribution — horizontal bars per region. No fake world maps.
 * Reads honestly from /admin/cockpit/geo (db.users.region aggregation).
 */
export function GeoDistribution({ rows = [], hasData = true, totalUsers = 0, onSelect }) {
    if (!rows.length) {
        return (
            <div className="ops-empty">
                Sem dados de região.
                <span className="ops-empty__hint">Os utilizadores definem a região no onboarding.</span>
            </div>
        );
    }
    const clickable = typeof onSelect === "function";
    return (
        <div>
            {rows.map((r) => {
                const Tag = clickable ? "button" : "div";
                const interactive = clickable ? { type: "button", onClick: () => onSelect(r) } : {};
                return (
                    <Tag key={r.key} className={`ops-geo-row ${r.key === "sem_regiao" ? "ops-geo-row--warn" : ""} ${clickable ? "ops-geo-row--clickable" : ""}`} {...interactive}>
                        <span className="ops-geo-row__label">{r.label}</span>
                        <div className="ops-geo-row__bar">
                            <div className="ops-geo-row__bar-fill" style={{ width: `${Math.min(100, r.pct)}%` }} />
                        </div>
                        <span className="ops-geo-row__count">{Number(r.count || 0).toLocaleString("pt-PT")}</span>
                        <span className="ops-geo-row__pct">{(r.pct || 0).toFixed(1)}%</span>
                    </Tag>
                );
            })}
            {!hasData && (
                <div style={{ fontSize: 11, color: "var(--ops-text-faint)", marginTop: 8, lineHeight: 1.4 }}>
                    A maioria dos utilizadores ainda não declarou região. {Number(totalUsers || 0).toLocaleString("pt-PT")} contas no total.
                </div>
            )}
        </div>
    );
}

export default GeoDistribution;
