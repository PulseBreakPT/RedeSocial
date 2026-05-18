import { RefreshCw, Flame, Clock } from "lucide-react";
import { Avatar } from "./Avatar";
import { useAuth } from "../context/AuthContext";

/**
 * Mobile-only personalized hero strip.
 * Sits right under MobileTopBar — gives the post-login home a true
 * "social network" feel without taking too much vertical room.
 */
export function MobileHomeHero({ greeting, firstName, sort, onSort, refreshing, onRefresh }) {
    const { user } = useAuth();

    return (
        <div
            className="lg:hidden px-4 pt-3 pb-2 bg-white"
            data-testid="mobile-home-hero"
        >
            <div className="flex items-center gap-3">
                <Avatar user={user} size={40} showOnline />
                <div className="flex-1 min-w-0">
                    <p className="type-overline mb-0.5 inline-flex items-center gap-1.5 text-black/55">
                        <span className="live-dot" /> ao vivo
                    </p>
                    <h1 className="font-display text-[18px] font-bold tracking-tight leading-tight text-black truncate">
                        {greeting}{firstName ? `, ${firstName}` : ""} <span className="opacity-70">👋</span>
                    </h1>
                </div>
                <button
                    onClick={onRefresh}
                    data-testid="mobile-feed-refresh"
                    aria-label="Atualizar"
                    className="w-9 h-9 rounded-full grid place-items-center text-black/70 border border-black/[0.07] active:scale-95 transition shrink-0"
                >
                    <RefreshCw size={14} strokeWidth={1.9} className={refreshing ? "animate-spin" : ""} />
                </button>
            </div>

            <div className="flex items-center gap-1.5 mt-3">
                <button
                    onClick={() => onSort("recent")}
                    data-testid="mobile-sort-recent"
                    className={`h-8 px-3 rounded-full inline-flex items-center gap-1.5 text-[12px] font-medium tracking-tight transition tap-shrink ${
                        sort === "recent" ? "chip-filter-on" : "bg-black/[0.04] text-black/80 active:bg-black/[0.08]"
                    }`}
                >
                    <Clock size={13} strokeWidth={1.9} /> Recente
                </button>
                <button
                    onClick={() => onSort("top")}
                    data-testid="mobile-sort-top"
                    className={`h-8 px-3 rounded-full inline-flex items-center gap-1.5 text-[12px] font-medium tracking-tight transition tap-shrink ${
                        sort === "top" ? "chip-filter-on" : "bg-black/[0.04] text-black/80 active:bg-black/[0.08]"
                    }`}
                >
                    <Flame size={13} strokeWidth={1.9} /> Top
                </button>
            </div>
        </div>
    );
}
