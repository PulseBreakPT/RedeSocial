import { Flame, Heart, Repeat2, MessageCircle, Eye, TrendingUp } from "lucide-react";

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

export function StatsCard({ stats, completion }) {
    if (!stats) return null;
    return (
        <div className="px-5 py-5 hairline-b space-y-4" data-testid="stats-card">
            <p className="type-overline">Estatísticas</p>
            <div className="grid grid-cols-2 gap-2.5">
                <Stat icon={Heart} label="Gostos recebidas" value={stats.likes_received ?? 0} tint={TINTS.red} />
                <Stat icon={Repeat2} label="Republicações" value={stats.reposts_received ?? 0} tint={TINTS.green} />
                <Stat icon={MessageCircle} label="Respostas" value={stats.comments_received ?? 0} tint={TINTS.blue} />
                <Stat icon={TrendingUp} label="Taxa engaj." value={`${stats.engagement_rate ?? 0}%`} tint={TINTS.ink} />
                <Stat icon={Eye} label="Média gostos/post" value={stats.avg_likes ?? 0} tint={TINTS.ink} />
                <Stat icon={Flame} label="Sequência" value={`${stats.streak ?? 0} ${stats.streak === 1 ? "dia" : "dias"}`} tint={TINTS.red} />
            </div>
            {completion !== undefined && completion < 100 && (
                <div className="mt-3" data-testid="profile-completion">
                    <div className="flex items-baseline justify-between mb-2">
                        <span className="type-overline">Perfil completo</span>
                        <span className="font-mono text-[11px]">
                            <span className="text-black font-semibold">{completion}%</span>
                            <span className="text-black/45 ml-1">completo</span>
                        </span>
                    </div>
                    <div className="h-1.5 bg-black/[0.06] rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-black/85 to-black/55 transition-all duration-700"
                            style={{ width: `${completion}%` }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
