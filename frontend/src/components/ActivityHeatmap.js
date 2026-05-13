// Renders a GitHub-style activity heatmap (last 30 days, 5 rows x 6 cols)
export function ActivityHeatmap({ data }) {
    if (!data || data.length === 0) return null;
    const max = Math.max(...data.map((d) => d.count), 1);
    const cell = (count) => {
        if (count === 0) return "bg-zinc-900";
        const ratio = count / max;
        if (ratio < 0.25) return "bg-accent-vermillion/20";
        if (ratio < 0.5) return "bg-accent-vermillion/40";
        if (ratio < 0.75) return "bg-accent-vermillion/70";
        return "bg-accent-vermillion";
    };
    const total = data.reduce((acc, d) => acc + d.count, 0);

    return (
        <div className="space-y-2" data-testid="activity-heatmap">
            <div className="flex items-baseline justify-between">
                <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">atividade (30d)</span>
                <span className="font-mono text-xs text-zinc-400">
                    <span className="text-white font-semibold">{total}</span> publicações
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
