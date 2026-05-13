import { useEffect, useState } from "react";
import { Flame, Snowflake } from "lucide-react";
import { api } from "../lib/api";

// Daily streak card — shown on Profile + Sidebar
export function StreakCard({ username, compact = false }) {
    const [streak, setStreak] = useState(null);
    useEffect(() => {
        let alive = true;
        api.get(`/users/${username}/streak`).then((r) => {
            if (alive) setStreak(r.data);
        }).catch(() => {});
        return () => { alive = false; };
    }, [username]);

    if (!streak) return null;
    const active = streak.active_today;
    const days = streak.current;
    const next = streak.next_milestone;
    const progress = next ? (days / next) * 100 : 100;

    if (compact) {
        return (
            <div
                className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-mono ${
                    active && days > 0
                        ? "bg-gradient-to-r from-orange-100 to-red-100 text-orange-700"
                        : "bg-black/[0.04] text-black/55"
                }`}
                data-testid={`streak-compact-${username}`}
                title={`Streak: ${days} dias · melhor: ${streak.best}`}
            >
                <Flame size={11} fill={active && days > 0 ? "currentColor" : "none"} />
                <span>{days}</span>
            </div>
        );
    }

    return (
        <div
            className="rounded-2xl border border-black/[0.08] bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 p-4 relative overflow-hidden"
            data-testid="streak-card"
        >
            <div className="absolute -right-4 -bottom-4 text-7xl opacity-10 select-none">🔥</div>
            <div className="flex items-center gap-2 mb-1">
                <Flame size={16} className="text-orange-600" fill="currentColor" />
                <span className="font-heading font-semibold text-xs uppercase tracking-wider text-black/65">Streak diário</span>
            </div>
            <div className="font-display text-3xl font-bold text-black flex items-baseline gap-1.5">
                {days}
                <span className="text-sm font-mono text-black/45 font-normal">{days === 1 ? "dia" : "dias"}</span>
            </div>
            {next && (
                <>
                    <div className="mt-2 w-full h-1.5 rounded-full bg-black/10 overflow-hidden">
                        <div
                            className="h-full rounded-full bg-gradient-to-r from-orange-500 to-red-500 transition-all duration-700"
                            style={{ width: `${Math.min(100, progress)}%` }}
                        />
                    </div>
                    <p className="text-[11px] font-mono text-black/55 mt-1.5">
                        +{next - days} para a próxima milestone · {next} dias
                    </p>
                </>
            )}
            <div className="flex items-center gap-3 mt-2 text-[11px] font-mono text-black/55">
                <span>melhor: {streak.best}</span>
                <span className="flex items-center gap-0.5"><Snowflake size={10} /> {streak.freezes} freezes</span>
            </div>
            {!active && days > 0 && (
                <p className="text-[10px] font-mono text-orange-700 mt-1.5">Publica algo hoje para não perderes a streak!</p>
            )}
        </div>
    );
}
