import { Flame, Heart, Repeat2, MessageCircle, Eye, TrendingUp } from "lucide-react";

function Stat({ icon: Icon, label, value, color = "text-accent-vermillion" }) {
    return (
        <div className="flex items-center gap-3 p-3 bg-zinc-950 border border-zinc-900 rounded-xl">
            <div className={`w-9 h-9 rounded-full grid place-items-center bg-white/5 ${color}`}>
                <Icon size={16} />
            </div>
            <div className="min-w-0 flex-1">
                <div className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">{label}</div>
                <div className="font-heading text-base font-bold truncate">{value}</div>
            </div>
        </div>
    );
}

export function StatsCard({ stats, completion }) {
    if (!stats) return null;
    return (
        <div className="px-5 py-4 border-b border-zinc-900 space-y-3" data-testid="stats-card">
            <div className="grid grid-cols-2 gap-2.5">
                <Stat icon={Heart} label="Curtidas recebidas" value={stats.likes_received ?? 0} color="text-accent-vermillion" />
                <Stat icon={Repeat2} label="Reposts" value={stats.reposts_received ?? 0} color="text-emerald-400" />
                <Stat icon={MessageCircle} label="Respostas" value={stats.comments_received ?? 0} color="text-blue-400" />
                <Stat icon={TrendingUp} label="Taxa engaj." value={`${stats.engagement_rate ?? 0}%`} color="text-yellow-400" />
                <Stat icon={Eye} label="Média curtidas/post" value={stats.avg_likes ?? 0} color="text-purple-400" />
                <Stat icon={Flame} label="Sequência" value={`${stats.streak ?? 0} ${stats.streak === 1 ? "dia" : "dias"}`} color="text-orange-400" />
            </div>
            {completion !== undefined && completion < 100 && (
                <div className="mt-3" data-testid="profile-completion">
                    <div className="flex items-baseline justify-between mb-1.5">
                        <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">perfil</span>
                        <span className="font-mono text-xs">
                            <span className="text-white font-semibold">{completion}%</span>
                            <span className="text-zinc-500 ml-1">completo</span>
                        </span>
                    </div>
                    <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-accent-vermillion to-orange-400 transition-all duration-700"
                            style={{ width: `${completion}%` }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
