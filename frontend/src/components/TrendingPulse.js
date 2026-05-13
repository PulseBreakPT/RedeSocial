import { useEffect, useState } from "react";
import { api } from "../lib/api";

// Mini SVG sparkline for hashtag pulse over last 7 days
export function TrendingPulse({ tag, width = 80, height = 24 }) {
    const [data, setData] = useState(null);
    useEffect(() => {
        let alive = true;
        api.get(`/trending/${encodeURIComponent(tag)}/pulse`).then((r) => {
            if (alive) setData(r.data);
        }).catch(() => {});
        return () => { alive = false; };
    }, [tag]);

    if (!data || data.length === 0) return null;
    const max = Math.max(...data.map((d) => d.count), 1);
    const step = width / Math.max(1, data.length - 1);
    const points = data
        .map((d, i) => `${i * step},${height - (d.count / max) * (height - 4) - 2}`)
        .join(" ");
    const last = data[data.length - 1].count;
    const prev = data[data.length - 2]?.count ?? 0;
    const trending = last >= prev;
    return (
        <svg width={width} height={height} className="inline-block" data-testid={`pulse-${tag}`}>
            <polyline
                fill="none"
                stroke={trending ? "#22c55e" : "#94a3b8"}
                strokeWidth="1.5"
                points={points}
            />
            <circle
                cx={(data.length - 1) * step}
                cy={height - (last / max) * (height - 4) - 2}
                r="2"
                fill={trending ? "#22c55e" : "#94a3b8"}
            />
        </svg>
    );
}
