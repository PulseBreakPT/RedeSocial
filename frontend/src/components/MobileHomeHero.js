import { useAuth } from "../context/AuthContext";

/**
 * Mobile-only personalized hero strip.
 * — No avatar (already in MobileTopBar)
 * — No live indicator (already pulses next to logo in MobileTopBar)
 * — No refresh button (pull-to-refresh covers it natively)
 * — No sort pills (removed on home — only Recente is used silently)
 * Just: the greeting. Clean, minimal.
 */
export function MobileHomeHero({ greeting, firstName }) {
    const { user } = useAuth();
    if (!user) return null;

    return (
        <div
            className="lg:hidden px-4 pt-3 pb-3 bg-white"
            data-testid="mobile-home-hero"
        >
            <h1 className="font-display text-[20px] font-bold tracking-tight leading-tight text-black">
                {greeting}{firstName ? `, ${firstName}` : ""} <span className="opacity-70">👋</span>
            </h1>
        </div>
    );
}
