import { useMemo } from "react";
import { Clock, Sun, Moon, Sunrise, Sunset } from "lucide-react";

const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function hourMeta(h) {
    if (h == null) return { label: "—", icon: Clock, period: "Sem dados", color: "text-black/55" };
    if (h < 6)  return { label: "madrugada", icon: Moon,    period: "00h - 06h", color: "text-indigo-600" };
    if (h < 12) return { label: "manhã",     icon: Sunrise, period: "06h - 12h", color: "text-amber-600" };
    if (h < 14) return { label: "almoço",    icon: Sun,     period: "12h - 14h", color: "text-yellow-600" };
    if (h < 19) return { label: "tarde",     icon: Sun,     period: "14h - 19h", color: "text-orange-600" };
    if (h < 23) return { label: "noite",     icon: Sunset,  period: "19h - 23h", color: "text-rose-600" };
    return                { label: "noite alta", icon: Moon, period: "23h - 00h", color: "text-indigo-600" };
}

/* Aggregate the 30-day heatmap into day-of-week buckets */
function computeWeekDistribution(heatmap = []) {
    const buckets = Array(7).fill(0);
    let total = 0;
    heatmap.forEach((d) => {
        try {
            const idx = new Date(d.date).getDay(); /* 0 = Sun … 6 = Sat */
            buckets[idx] += d.count || 0;
            total += d.count || 0;
        } catch {}
    });
    return { buckets, total };
}

function HourClock({ peakHour }) {
    /* 24h clock face: 24 ticks; highlight the peak hour with a glowing dot */
    const size = 168;
    const cx = size / 2;
    const cy = size / 2;
    const r = size / 2 - 14;

    const peakAngle = peakHour != null ? (peakHour / 24) * 360 - 90 : null;
    const peakX = peakAngle != null ? cx + r * Math.cos((peakAngle * Math.PI) / 180) : null;
    const peakY = peakAngle != null ? cy + r * Math.sin((peakAngle * Math.PI) / 180) : null;

    return (
        <div className="relative shrink-0" style={{ width: size, height: size }}>
            <svg width={size} height={size}>
                {/* Outer ring */}
                <circle cx={cx} cy={cy} r={r + 4} fill="none" stroke="rgba(13,13,16,0.04)" strokeWidth={1} />
                <circle cx={cx} cy={cy} r={r - 4} fill="none" stroke="rgba(13,13,16,0.04)" strokeWidth={1} />
                {/* Hour ticks */}
                {Array.from({ length: 24 }).map((_, h) => {
                    const angle = (h / 24) * 360 - 90;
                    const isHighlight = peakHour != null && h === peakHour;
                    const isMajor = h % 6 === 0;
                    const innerR = isMajor ? r - 8 : r - 5;
                    const x1 = cx + innerR * Math.cos((angle * Math.PI) / 180);
                    const y1 = cy + innerR * Math.sin((angle * Math.PI) / 180);
                    const x2 = cx + r * Math.cos((angle * Math.PI) / 180);
                    const y2 = cy + r * Math.sin((angle * Math.PI) / 180);
                    return (
                        <line
                            key={h}
                            x1={x1} y1={y1} x2={x2} y2={y2}
                            stroke={isHighlight ? "#0a0a0a" : isMajor ? "rgba(13,13,16,0.45)" : "rgba(13,13,16,0.18)"}
                            strokeWidth={isHighlight ? 2.5 : isMajor ? 1.5 : 1}
                            strokeLinecap="round"
                        />
                    );
                })}
                {/* Major labels */}
                {[0, 6, 12, 18].map((h) => {
                    const angle = (h / 24) * 360 - 90;
                    const lr = r - 18;
                    const lx = cx + lr * Math.cos((angle * Math.PI) / 180);
                    const ly = cy + lr * Math.sin((angle * Math.PI) / 180);
                    return (
                        <text
                            key={h}
                            x={lx} y={ly}
                            textAnchor="middle" dominantBaseline="middle"
                            className="font-mono"
                            style={{ fontSize: 9, fill: "rgba(13,13,16,0.4)", letterSpacing: "0.08em" }}
                        >
                            {String(h).padStart(2, "0")}
                        </text>
                    );
                })}
                {/* Peak dot */}
                {peakX != null && (
                    <>
                        <circle cx={peakX} cy={peakY} r={9} fill="rgba(13,13,16,0.10)" />
                        <circle cx={peakX} cy={peakY} r={5.5} fill="#0a0a0a" />
                    </>
                )}
            </svg>
            <div className="absolute inset-0 grid place-items-center pointer-events-none">
                <div className="text-center">
                    <div className="font-display text-[26px] font-bold tabular-nums text-black leading-none">
                        {peakHour != null ? `${String(peakHour).padStart(2, "0")}h` : "—"}
                    </div>
                    <div className="text-[9.5px] font-mono uppercase tracking-[0.14em] text-black/45 mt-1">
                        pico
                    </div>
                </div>
            </div>
        </div>
    );
}

export function RhythmPanel({ heatmap, fingerprint, firstName }) {
    const { buckets, total } = useMemo(() => computeWeekDistribution(heatmap), [heatmap]);
    const peakHour = fingerprint?.peak_hour;
    const meta = hourMeta(peakHour);
    const PeriodIcon = meta.icon;
    const maxDay = Math.max(...buckets, 1);
    const peakDayIdx = buckets.indexOf(Math.max(...buckets));

    if (total === 0 && peakHour == null) return null;

    return (
        <section className="px-4 lg:px-6 pt-5 pb-2" data-testid="rhythm-panel">
            <div className="card-lux p-4 lg:p-5">
                <div className="flex items-baseline justify-between gap-2 mb-4">
                    <div className="flex items-center gap-2">
                        <Clock size={13} className="text-black/55" strokeWidth={1.8} />
                        <p className="type-overline mb-0">Ritmo de {firstName || "atividade"}</p>
                    </div>
                    <span className="text-[10.5px] text-black/45 font-mono">
                        {total} {total === 1 ? "post" : "posts"} · 30d
                    </span>
                </div>

                <div className="flex flex-col sm:flex-row gap-5 lg:gap-7 items-center sm:items-start">
                    <HourClock peakHour={peakHour} />

                    <div className="flex-1 min-w-0 w-full">
                        <div className="flex items-center gap-2 mb-1">
                            <PeriodIcon size={14} className={meta.color} strokeWidth={1.8} />
                            <div>
                                <div className="font-heading font-semibold text-[15px] tracking-tight text-black capitalize">
                                    Escreve de {meta.label}
                                </div>
                                <div className="text-[11px] font-mono uppercase tracking-[0.12em] text-black/45 mt-0.5">
                                    {meta.period}
                                </div>
                            </div>
                        </div>

                        <p className="type-overline mt-4 mb-2">Dias da semana</p>
                        <div className="flex items-end gap-1.5 h-20">
                            {buckets.map((v, i) => {
                                const pct = (v / maxDay) * 100;
                                const isPeak = i === peakDayIdx && v > 0;
                                return (
                                    <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group">
                                        <div className="w-full h-full flex items-end">
                                            <div
                                                className={`w-full rounded-md transition-all ${isPeak ? "bg-black" : "bg-black/[0.18] group-hover:bg-black/40"}`}
                                                style={{ height: `${Math.max(6, pct)}%`, minHeight: 6 }}
                                                title={`${DAY_LABELS[i]} · ${v} ${v === 1 ? "post" : "posts"}`}
                                            />
                                        </div>
                                        <span className={`text-[10px] font-mono tracking-wider uppercase ${isPeak ? "text-black font-semibold" : "text-black/45"}`}>
                                            {DAY_LABELS[i]}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
