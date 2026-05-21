import React from "react";
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { Sparkline } from "./Sparkline";

const TONE_COLOR = {
    info:     "#0e7490",
    realtime: "#14b8a6",
    system:   "#7c3aed",
    warn:     "#d97706",
    danger:   "#dc2626",
    success:  "#059669",
};

/**
 * KpiCard — large KPI card with icon, value, delta and sparkline.
 * `delta` is a percentage number (positive/negative/zero). `inverted=true`
 * flips the color semantics (e.g. attacks_blocked: up = bad).
 */
export function KpiCard({
    label,
    value,
    delta = null,
    deltaSub = null,        // e.g. "vs 15m anteriores"
    sparkline = [],
    tone = "info",
    icon: Icon,
    inverted = false,
    formatValue = (v) => (v == null ? "—" : Number(v).toLocaleString("pt-PT")),
    onClick,
    "data-testid": testId,
}) {
    const sparkColor = TONE_COLOR[tone] || TONE_COLOR.info;
    let deltaClass = "ops-kpi__delta--flat";
    let DeltaIcon = Minus;
    if (delta != null && Number.isFinite(delta) && Math.abs(delta) >= 0.1) {
        const positive = delta > 0;
        // For "inverted" KPIs (attacks, reports), positive movement is bad.
        const goodDirection = inverted ? !positive : positive;
        deltaClass = goodDirection ? "ops-kpi__delta--up" : "ops-kpi__delta--down";
        DeltaIcon = positive ? ArrowUpRight : ArrowDownRight;
    }
    const interactiveProps = onClick ? { role: "button", tabIndex: 0, onClick, style: { cursor: "pointer" } } : {};
    return (
        <div className="ops-kpi" data-testid={testId} {...interactiveProps}>
            <div className="ops-kpi__head">
                {Icon && (
                    <div className={`ops-kpi__ic ops-kpi__ic--${tone}`}>
                        <Icon />
                    </div>
                )}
                <div className="ops-kpi__label">{label}</div>
            </div>
            <div className="ops-kpi__value">{formatValue(value)}</div>
            <div className="ops-kpi__row">
                <div className={`ops-kpi__delta ${deltaClass}`}>
                    <DeltaIcon size={11} />
                    <span>{delta == null || !Number.isFinite(delta) ? "—" : `${Math.abs(delta).toFixed(1)}%`}</span>
                    {deltaSub && <span className="ops-kpi__delta-sub">{deltaSub}</span>}
                </div>
                <div className="ops-kpi__spark">
                    <Sparkline data={sparkline} width={88} height={28} color={sparkColor} />
                </div>
            </div>
        </div>
    );
}

export default KpiCard;
