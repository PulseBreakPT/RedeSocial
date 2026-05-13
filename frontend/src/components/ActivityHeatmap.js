// Renders a GitHub-style activity heatmap (last 30 days)
export function ActivityHeatmap({ data }) {
    if (!data || data.length === 0) return null;
    const max = Math.max(...data.map((d) => d.count), 1);
    const cell = (count) => {
        if (count === 0) return "bg-black/[0.04]";
        const ratio = count / max;
        if (ratio < 0.25) return "bg-black/15";
        if (ratio < 0.5) return "bg-black/35";
        if (ratio < 0.75) return "bg-black/60";
        return "bg-black/85";
    };
    const total = data.reduce((acc, d) => acc + d.count, 0);

    return (
        <div className="space-y-2.5" data-testid="activity-heatmap">
            <div className="flex items-baseline justify-between">
                <span className="type-overline">Atividade (últimos 30 dias)</span>
                <span className="font-mono text-[11px] text-black/55">
                    <span className="text-black font-semibold">{total}</span> publicações
                </span>
            </div>
            <div className="grid grid-cols-[repeat(15,_minmax(0,_1fr))] gap-1">
                {data.map((d) => (
                    <div
                        key={d.date}
                        title={`${d.date} · ${d.count} ${d.count === 1 ? "post" : "posts"}`}
                        className={`aspect-square rounded-sm ${cell(d.count)} hover:scale-125 transition`}
                    />
                ))}
            </div>
        </div>
    );
}
