import { Flame, Clock } from "lucide-react";
import { useAuth } from "../context/AuthContext";

/**
 * Mobile-only personalized hero strip.
 * — No avatar (already in MobileTopBar)
 * — No live indicator (already pulses next to logo in MobileTopBar)
 * — No refresh button (pull-to-refresh covers it natively)
 * Just: greeting + sort pills. Single source of truth on mobile chrome.
 */
export function MobileHomeHero({ greeting, firstName, sort, onSort }) {
    const { user } = useAuth();
    if (!user) return null;

    return (
        <div
            className="lg:hidden px-4 pt-3 pb-2 bg-white"
            data-testid="mobile-home-hero"
        >
            <h1 className="font-display text-[20px] font-bold tracking-tight leading-tight text-black">
                {greeting}{firstName ? `, ${firstName}` : ""} <span className="opacity-70">👋</span>
            </h1>

            <div className="flex items-center gap-1.5 mt-2.5">
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
