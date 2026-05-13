import { Link, useNavigate, useLocation } from "react-router-dom";
import { Bell, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Avatar } from "./Avatar";
import { MobileMenuDrawer } from "./MobileMenuDrawer";

export function MobileTopBar() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [unread, setUnread] = useState(0);
    const [menuOpen, setMenuOpen] = useState(false);
    const isExplore = location.pathname.startsWith("/explore");
    const isNotif = location.pathname.startsWith("/notifications");

    useEffect(() => {
        const tick = async () => {
            try {
                const { data } = await api.get("/notifications/unread-count");
                setUnread(data.count);
            } catch {}
        };
        tick();
        const id = setInterval(tick, 10000);
        return () => clearInterval(id);
    }, []);

    // Swipe-from-left-edge to open drawer (mobile only).
    // Detects pointer-down within 20px of the left edge, then opens when dragged >60px right.
    useEffect(() => {
        if (window.matchMedia("(min-width: 1024px)").matches) return;
        let startX = 0;
        let startY = 0;
        let tracking = false;
        let opened = false;

        const onDown = (e) => {
            if (e.clientX <= 22 && !menuOpen) {
                startX = e.clientX;
                startY = e.clientY;
                tracking = true;
                opened = false;
            }
        };
        const onMove = (e) => {
            if (!tracking || opened) return;
            const dx = e.clientX - startX;
            const dy = Math.abs(e.clientY - startY);
            // Open once the horizontal drag dominates and passes the threshold
            if (dx > 56 && dy < 40) {
                setMenuOpen(true);
                opened = true;
                tracking = false;
            } else if (dy > 60) {
                // user is scrolling vertically — abort
                tracking = false;
            }
        };
        const onUp = () => { tracking = false; };

        window.addEventListener("pointerdown", onDown, { passive: true });
        window.addEventListener("pointermove", onMove, { passive: true });
        window.addEventListener("pointerup", onUp, { passive: true });
        window.addEventListener("pointercancel", onUp, { passive: true });
        return () => {
            window.removeEventListener("pointerdown", onDown);
            window.removeEventListener("pointermove", onMove);
            window.removeEventListener("pointerup", onUp);
            window.removeEventListener("pointercancel", onUp);
        };
    }, [menuOpen]);

    return (
        <>
            <header
                className="lg:hidden sticky top-0 z-40 glass border-b border-black/[0.07] pt-safe"
                data-testid="mobile-topbar"
            >
                <div className="flex items-center gap-3 px-4 h-[var(--mobile-topbar-h)]">
                    <button
                        onClick={() => setMenuOpen(true)}
                        className="tap-shrink flex-shrink-0 relative"
                        aria-label="Abrir menu"
                        data-testid="mobile-topbar-avatar"
                    >
                        <Avatar user={user} size={32} showOnline />
                        {unread > 0 && (
                            <span
                                aria-hidden
                                className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white"
                                style={{ background: "var(--coral-500)" }}
                            />
                        )}
                    </button>
                    <Link to="/" className="flex items-center gap-1.5 mr-auto tap-shrink" data-testid="mobile-topbar-logo">
                        <span className="font-display text-[24px] leading-none tracking-tight text-black flex items-baseline gap-1">
                            <span className="silver-foil text-[20px] not-italic translate-y-[1px]">◆</span>
                            vermillion
                        </span>
                    </Link>
                    <button
                        onClick={() => navigate("/explore")}
                        className={`w-10 h-10 rounded-full grid place-items-center tap-shrink transition ${
                            isExplore ? "icon-grad-on" : "text-black hover:bg-black/[0.06] active:bg-black/[0.08]"
                        }`}
                        aria-label="buscar"
                        data-testid="mobile-search-btn"
                    >
                        <Search size={20} strokeWidth={1.7} color={isExplore ? "#df8a7d" : undefined} />
                    </button>
                    <button
                        onClick={() => navigate("/notifications")}
                        data-testid="mobile-notif-btn"
                        className={`relative w-10 h-10 rounded-full grid place-items-center tap-shrink transition ${
                            isNotif ? "icon-grad-on" : "text-black hover:bg-black/[0.06] active:bg-black/[0.08]"
                        }`}
                        aria-label="notificações"
                    >
                        <Bell size={20} strokeWidth={1.7} color={isNotif ? "#df8a7d" : undefined} />
                        {unread > 0 && (
                            <span
                                className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-soft text-[10px] font-mono grid place-items-center text-white font-bold ring-2 ring-white"
                            >
                                {unread > 99 ? "99+" : unread}
                            </span>
                        )}
                    </button>
                </div>
            </header>
            <MobileMenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
        </>
    );
}
