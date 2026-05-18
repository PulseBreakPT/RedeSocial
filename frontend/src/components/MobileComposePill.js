import { Image as ImageIcon, BarChart3, AtSign, Smile } from "lucide-react";
import { Avatar } from "./Avatar";
import { useAuth } from "../context/AuthContext";
import { useOutletContext } from "react-router-dom";

/**
 * Mobile-only inline compose entry — a tap target that opens the
 * Composer in modal/sheet mode (handled by Layout's openCompose).
 * Hidden on lg+ because desktop has the full inline Composer.
 */
export function MobileComposePill() {
    const { user } = useAuth();
    const ctx = useOutletContext() || {};
    const openCompose = ctx.openCompose;

    if (!user) return null;

    return (
        <div className="lg:hidden px-4 pt-3 pb-2" data-testid="mobile-compose-pill-wrap">
            <button
                onClick={() => openCompose && openCompose()}
                data-testid="mobile-compose-pill"
                className="w-full flex items-center gap-3 bg-white card-lux rounded-2xl px-3.5 py-3 active:scale-[0.985] transition text-left"
            >
                <Avatar user={user} size={36} />
                <span className="flex-1 text-[14px] text-black/45 font-medium tracking-tight truncate">
                    O que se passa, {(user.name || user.username || "").split(" ")[0]}?
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
