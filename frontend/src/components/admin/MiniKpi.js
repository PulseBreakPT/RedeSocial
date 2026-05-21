import React from "react";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Sparkline } from "./Sparkline";

const TONE_COLOR = {
    info: "#0e7490", realtime: "#14b8a6", system: "#7c3aed",
    warn: "#d97706", danger: "#dc2626", success: "#059669",
};

export function MiniKpi({
    label, value, delta = null, deltaSub = null, sparkline = [],
    tone = "info", inverted = false, onClick, title, "data-testid": testId,
    formatValue = (v) => (v == null ? "—" : Number(v).toLocaleString("pt-PT")),
}) {
    const c = TONE_COLOR[tone] || TONE_COLOR.info;
    let deltaClass = "ops-mini-kpi__delta--flat";
    let DeltaIcon = null;
    if (delta != null && Number.isFinite(delta) && Math.abs(delta) >= 0.1) {
        const positive = delta > 0;
        const good = inverted ? !positive : positive;
        deltaClass = good ? "ops-mini-kpi__delta--up" : "ops-mini-kpi__delta--down";
        DeltaIcon = positive ? ArrowUpRight : ArrowDownRight;
    }
    const interactive = onClick ? {
        role: "button",
        tabIndex: 0,
        onClick,
        onKeyDown: (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(e); } },
        style: { cursor: "pointer" },
    } : {};
    return (
        <div className="ops-mini-kpi" data-testid={testId} title={title} {...interactive}>
            <div className="ops-mini-kpi__label">{label}</div>
            <div className="ops-mini-kpi__row">
                <div>
                    <div className="ops-mini-kpi__value">{formatValue(value)}</div>
                    <div className={`ops-mini-kpi__delta ${deltaClass}`}>
                        {DeltaIcon ? <DeltaIcon size={10} style={{ display: "inline", verticalAlign: "middle", marginRight: 2 }} /> : null}
                        <span>{delta == null || !Number.isFinite(delta) ? "—" : `${Math.abs(delta).toFixed(1)}%`}</span>
                        {deltaSub && <span style={{ color: "var(--ops-text-faint)", fontWeight: 500, marginLeft: 4 }}>{deltaSub}</span>}
                    </div>
                </div>
                <div className="ops-mini-kpi__spark">
                    <Sparkline data={sparkline} width={72} height={22} color={c} />
                </div>
            </div>
        </div>
    );
}

export default MiniKpi;
