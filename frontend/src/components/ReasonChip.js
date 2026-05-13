// Renders a small "why am I seeing this?" reason chip below a PostCard
export function ReasonChip({ reason }) {
    if (!reason) return null;
    return (
        <div
            className="flex items-center gap-1.5 px-2 py-1 mb-2 rounded-full bg-black/[0.04] border border-black/[0.06] w-fit"
            data-testid={`reason-chip-${reason.type}`}
            title={reason.label}
        >
            <span className="text-[11px]">{reason.emoji}</span>
            <span className="font-mono text-[10px] text-black/55">{reason.label}</span>
        </div>
    );
}
