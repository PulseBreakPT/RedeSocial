import React, { useMemo, useState } from "react";

/**
 * LineChart — Multi-series operational line chart in pure SVG.
 * Sober, scanable. Subtle grid, no fills (except slight area on hover).
 *
 * Props:
 *   series: [{ key, label, color, data: number[] }]
 *   labels: string[]   (timestamps for x-axis tooltip; same length as data[i])
 *   height: number (default 260)
 */
export function LineChart({ series = [], labels = [], height = 260, yTicks = 4, formatX, formatY }) {
    const [hover, setHover] = useState(null);
    const padTop = 14, padBottom = 22, padLeft = 36, padRight = 12;
    const width = 720;
    const innerW = width - padLeft - padRight;
    const innerH = height - padTop - padBottom;
    const safeSeries = series.filter((s) => Array.isArray(s.data) && s.data.length);
    const n = Math.max(0, ...safeSeries.map((s) => s.data.length));

    const { yMin, yMax } = useMemo(() => {
        if (!safeSeries.length) return { yMin: 0, yMax: 1 };
        let mn = Infinity, mx = -Infinity;
        safeSeries.forEach((s) => s.data.forEach((v) => { if (Number.isFinite(v)) { if (v < mn) mn = v; if (v > mx) mx = v; } }));
        if (!Number.isFinite(mn) || !Number.isFinite(mx)) { mn = 0; mx = 1; }
        if (mn === mx) { mx = mn + 1; }
        // Pad top by 10%
        const padPct = (mx - mn) * 0.1;
        return { yMin: Math.max(0, mn - 0), yMax: mx + padPct };
    }, [safeSeries]);

    if (!safeSeries.length || n < 2) {
        return (
            <div className="ops-empty" style={{ minHeight: height }}>
                <span>Sem atividade no intervalo selecionado.</span>
                <span className="ops-empty__hint">Os dados aparecem assim que houver tráfego real.</span>
            </div>
        );
    }

    const xFor = (i) => padLeft + (i * innerW) / (n - 1);
    const yFor = (v) => padTop + innerH - ((v - yMin) / (yMax - yMin)) * innerH;

    // Y-ticks
    const ticks = Array.from({ length: yTicks + 1 }, (_, i) => yMin + ((yMax - yMin) * i) / yTicks);

    const onMove = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * width;
        if (x < padLeft || x > padLeft + innerW) { setHover(null); return; }
        const idx = Math.round(((x - padLeft) / innerW) * (n - 1));
        if (idx < 0 || idx >= n) { setHover(null); return; }
        setHover(idx);
    };

    return (
        <div style={{ position: "relative", width: "100%" }} onMouseLeave={() => setHover(null)}>
            <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ width: "100%", height, display: "block" }} onMouseMove={onMove}>
                {/* Grid */}
                {ticks.map((t, i) => (
                    <g key={i}>
                        <line x1={padLeft} x2={padLeft + innerW} y1={yFor(t)} y2={yFor(t)} stroke="#e2e8f0" strokeDasharray="2 4" strokeWidth="1" />
                        <text x={padLeft - 6} y={yFor(t)} textAnchor="end" dominantBaseline="central" fill="#94a3b8" fontSize="10" fontFamily="JetBrains Mono, ui-monospace, monospace">
                            {formatY ? formatY(t) : Math.round(t)}
                        </text>
                    </g>
                ))}
                {/* Series */}
                {safeSeries.map((s) => {
                    const path = s.data.map((v, i) => (i === 0 ? `M${xFor(i)},${yFor(v)}` : `L${xFor(i)},${yFor(v)}`)).join(" ");
                    return (
                        <g key={s.key}>
                            <path d={path} fill="none" stroke={s.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </g>
                    );
                })}
                {/* Hover crosshair */}
                {hover != null && (
                    <g>
                        <line x1={xFor(hover)} x2={xFor(hover)} y1={padTop} y2={padTop + innerH} stroke="#94a3b8" strokeDasharray="2 3" />
                        {safeSeries.map((s) => (
                            <circle key={s.key} cx={xFor(hover)} cy={yFor(s.data[hover] || 0)} r="3" fill={s.color} stroke="#fff" strokeWidth="1.5" />
                        ))}
                    </g>
                )}
                {/* X-axis sparse labels */}
                {labels.length === n && [0, Math.floor(n / 2), n - 1].map((i, k) => (
                    <text key={k} x={xFor(i)} y={height - 4} textAnchor={k === 0 ? "start" : (k === 2 ? "end" : "middle")} fill="#94a3b8" fontSize="10" fontFamily="JetBrains Mono, ui-monospace, monospace">
                        {formatX ? formatX(labels[i], i) : (labels[i] || "").slice(11, 16)}
                    </text>
                ))}
            </svg>
            {/* Legend */}
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginTop: 6 }}>
                {safeSeries.map((s) => (
                    <span key={s.key} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11.5, color: "var(--ops-text-muted)" }}>
                        <span style={{ width: 8, height: 8, borderRadius: 2, background: s.color, display: "inline-block" }} />
                        <span>{s.label}</span>
                        {hover != null && <span style={{ fontFamily: "var(--ops-font-mono)", color: "var(--ops-text)" }}>· {Math.round(s.data[hover] || 0)}</span>}
                    </span>
                ))}
            </div>
        </div>
    );
}

export default LineChart;
