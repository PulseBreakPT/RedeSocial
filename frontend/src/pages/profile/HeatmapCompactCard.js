import { Activity, ArrowRight } from "lucide-react";

/**
 * HeatmapCompactCard — sumário simples de atividade (dias activos do mês + mini heatmap 28d).
 */

function intensityClass(count, max) {
    if (!count) return "bg-black/[0.05]";
    const ratio = count / Math.max(max, 1);
    if (ratio > 0.66) return "bg-black";
    if (ratio > 0.33) return "bg-black/65";
    if (ratio > 0.10) return "bg-black/35";
    return "bg-black/20";
}

function activeThisMonth(days = []) {
    const now = new Date();
    const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    return days.filter((d) => d.date?.startsWith(ym) && d.count > 0).length;
}

export function HeatmapCompactCard({ heatmap = [], onSeeMore }) {
    if (!heatmap || heatmap.length === 0) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cells = [];
    for (let i = 27; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const iso = d.toISOString().slice(0, 10);
        const found = heatmap.find((x) => x.date === iso);
        cells.push({ date: iso, count: found?.count || 0 });
    }
    const max = Math.max(...heatmap.map((d) => d.count), 1);
    const monthly = activeThisMonth(heatmap);

    return (
        <section className="px-4 lg:px-6 py-2" data-testid="heatmap-compact-card">
            <div className="card-lux p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                        <Activity size={13} strokeWidth={1.8} className="text-black/60" />
                        <div>
                            <p className="type-overline mb-0">Actividade</p>
                            <h3 className="font-heading font-bold text-[14px] tracking-tight text-black leading-tight">
                                Pulso dos últimos 28 dias
                            </h3>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="font-display text-[20px] tabular-nums text-black leading-none">{monthly}</div>
                        <div className="text-[9.5px] uppercase tracking-[0.12em] text-black/45 font-mono mt-1">dias mês</div>
                    </div>
                </div>

                <div className="grid grid-cols-[repeat(28,minmax(0,1fr))] gap-[3px] mb-3" aria-hidden>
                    {cells.map((c) => (
                        <div
                            key={c.date}
                            title={`${c.date} · ${c.count} posts`}
                            className={`aspect-square rounded-[3px] ${intensityClass(c.count, max)}`}
                        />
                    ))}
                </div>

                {onSeeMore && (
                    <button
                        onClick={onSeeMore}
                        data-testid="heatmap-compact-see-more"
                        className="inline-flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg text-[11.5px] font-mono uppercase tracking-[0.12em] text-black/65 hover:text-black hover:bg-black/[0.04] transition tap-shrink"
                    >
                        <span>Ver actividade completa</span>
                        <ArrowRight size={12} strokeWidth={1.8} />
                    </button>
                )}
            </div>
        </section>
    );
}
