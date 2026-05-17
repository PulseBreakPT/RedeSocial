import { Heart, Repeat2, MessageCircle, Eye, TrendingUp } from "lucide-react";

function Stat({ icon: Icon, label, value, tint }) {
    return (
        <div className="flex items-center gap-3 p-3.5 bg-white hairline rounded-2xl">
            <div className={`w-9 h-9 rounded-full grid place-items-center ${tint?.bg || "bg-black/[0.04]"} border border-black/[0.04]`}>
                <Icon size={15} strokeWidth={1.6} className={tint?.fg || "text-black/65"} />
            </div>
            <div className="min-w-0 flex-1">
                <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-black/45">{label}</div>
                <div className="font-heading text-[15px] font-semibold tracking-tight text-black truncate">{value}</div>
            </div>
        </div>
    );
}

const TINTS = {
    red: { bg: "bg-red-soft-bg", fg: "text-red-soft" },
    green: { bg: "bg-green-soft-bg", fg: "text-green-soft" },
    blue: { bg: "bg-blue-soft-bg", fg: "text-blue-soft" },
    ink: { bg: "bg-black/[0.05]", fg: "text-black/70" },
};

export function StatsCard({ stats }) {
    if (!stats) return null;
    return (
        <div className="px-5 py-5 hairline-b space-y-4" data-testid="stats-card">
            <p className="type-overline">Estatísticas</p>
            <div className="grid grid-cols-2 gap-2.5">
                <Stat icon={Heart} label="Gostos recebidas" value={stats.likes_received ?? 0} tint={TINTS.red} />
                <Stat icon={Repeat2} label="Republicações" value={stats.reposts_received ?? 0} tint={TINTS.green} />
                <Stat icon={MessageCircle} label="Respostas" value={stats.comments_received ?? 0} tint={TINTS.blue} />
                <Stat icon={Eye} label="Média gostos/post" value={stats.avg_likes ?? 0} tint={TINTS.ink} />
                <Stat icon={TrendingUp} label="Taxa engaj." value={`${stats.engagement_rate ?? 0}%`} tint={TINTS.ink} />
            </div>
        </div>
    );
}
