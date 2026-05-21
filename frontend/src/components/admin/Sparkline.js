import React from "react";

/**
 * Sparkline — small SVG line. Auto-scales to viewBox.
 * Real values only. No fills, no fake smoothing.
 *
 * Props:
 *   data: number[]  — required.
 *   width / height — bounding box. Defaults: 80x24.
 *   color  — stroke color.
 *   strokeWidth — line thickness. Default 1.5.
 *   showArea — whether to draw a subtle area below the line.
 */
export function Sparkline({ data, width = 80, height = 24, color = "#0e7490", strokeWidth = 1.5, showArea = true, className = "" }) {
    const safe = Array.isArray(data) ? data.filter((v) => Number.isFinite(v)) : [];
    if (!safe.length) {
        return (
            <svg width={width} height={height} className={className} aria-hidden="true">
                <line x1="0" y1={height / 2} x2={width} y2={height / 2} stroke="#e2e8f0" strokeDasharray="2 3" />
            </svg>
        );
    }
    const min = Math.min(...safe, 0);
    const max = Math.max(...safe, 1);
    const range = (max - min) || 1;
    const stepX = safe.length > 1 ? width / (safe.length - 1) : 0;
    const pts = safe.map((v, i) => {
        const x = i * stepX;
        const y = height - 2 - ((v - min) / range) * (height - 4);
        return [x, y];
    });
    const path = pts.map((p, i) => (i === 0 ? `M${p[0]},${p[1]}` : `L${p[0]},${p[1]}`)).join(" ");
    const areaPath = `${path} L${pts[pts.length - 1][0]},${height} L0,${height} Z`;
    return (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className} aria-hidden="true" preserveAspectRatio="none">
            {showArea && (
                <path d={areaPath} fill={color} opacity="0.10" />
            )}
            <path d={path} fill="none" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

export default Sparkline;
