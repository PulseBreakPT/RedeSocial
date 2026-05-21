import React from "react";
import { Sparkline } from "./Sparkline";

export function TrendsList({ items = [] }) {
    if (!items.length) {
        return (
            <div className="ops-empty">
                Sem tendências detetadas.
                <span className="ops-empty__hint">Velocity calcula-se quando há posts no período.</span>
            </div>
        );
    }
    return (
        <div>
            {items.map((t, i) => {
                const cls = t.velocity > 1 ? "ops-trend-row__velocity--up"
                          : t.velocity < -1 ? "ops-trend-row__velocity--down"
                          : "ops-trend-row__velocity--flat";
                const sign = t.velocity > 0 ? "+" : "";
                return (
                    <div key={t.tag} className="ops-trend-row">
                        <span className="ops-trend-row__rank">{i + 1}</span>
                        <span className="ops-trend-row__tag">#{t.tag}</span>
                        <span className="ops-trend-row__count">{Number(t.count || 0).toLocaleString("pt-PT")} posts</span>
                        <span style={{ display: "flex", alignItems: "center", gap: 6, justifyContent: "flex-end" }}>
                            <Sparkline data={t.sparkline || []} width={40} height={14} color={t.velocity >= 0 ? "#0e7490" : "#dc2626"} showArea={false} strokeWidth={1.25} />
                            <span className={`ops-trend-row__velocity ${cls}`}>{sign}{(t.velocity || 0).toFixed(1)}%</span>
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

export default TrendsList;
