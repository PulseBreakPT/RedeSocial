import { Image as ImageIcon, BarChart3, AtSign, Smile, PenSquare } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useOutletContext } from "react-router-dom";

/**
 * Mobile-only inline compose entry — a tap target that opens the
 * Composer in modal/sheet mode (handled by Layout's openCompose).
 *
 * No avatar (already in MobileTopBar and in StoriesBar's "O teu story"
 * tile). Single source of identity per breakpoint.
 */
export function MobileComposePill() {
    const { user } = useAuth();
    const ctx = useOutletContext() || {};
    const openCompose = ctx.openCompose;

    if (!user) return null;

    const firstName = (user.name || user.username || "").split(" ")[0];

    return (
        <div className="lg:hidden px-4 pt-3 pb-2" data-testid="mobile-compose-pill-wrap">
            <button
                onClick={() => openCompose && openCompose()}
                data-testid="mobile-compose-pill"
                className="w-full flex items-center gap-3 bg-white card-lux rounded-full px-4 py-3 active:scale-[0.985] transition text-left"
            >
                <span className="w-8 h-8 rounded-full grid place-items-center bg-black/[0.04] text-black/65 shrink-0">
                    <PenSquare size={15} strokeWidth={1.9} />
                </span>
                <span className="flex-1 text-[14px] text-black/45 font-medium tracking-tight truncate">
                    O que se passa, {firstName}?
                </span>
                <span className="flex items-center gap-2.5 text-black/55 shrink-0">
                    <ImageIcon size={17} strokeWidth={1.7} />
                    <BarChart3 size={17} strokeWidth={1.7} />
                    <AtSign size={17} strokeWidth={1.7} />
                    <Smile size={17} strokeWidth={1.7} />
                </span>
            </button>
        </div>
    );
}
