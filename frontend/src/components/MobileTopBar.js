import { Link, useNavigate } from "react-router-dom";
import { Bell, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Avatar } from "./Avatar";

export function MobileTopBar() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [unread, setUnread] = useState(0);

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

    return (
        <header
            className="lg:hidden sticky top-0 z-40 glass border-b border-black/[0.07] pt-safe"
            data-testid="mobile-topbar"
        >
            <div className="flex items-center gap-3 px-4 h-[var(--mobile-topbar-h)]">
                <button
                    onClick={() => navigate(`/u/${user?.username}`)}
                    className="tap-shrink flex-shrink-0"
                    aria-label="perfil"
                    data-testid="mobile-topbar-avatar"
                >
                    <Avatar user={user} size={32} showOnline />
                </button>
                <Link to="/" className="flex items-center gap-1.5 mr-auto tap-shrink" data-testid="mobile-topbar-logo">
                    <span className="font-display text-[24px] leading-none tracking-tight text-black italic font-light flex items-baseline gap-1">
                        <span className="silver-foil text-[20px] not-italic translate-y-[1px]">◆</span>
                        vermillion
                    </span>
                </Link>
                <button
                    onClick={() => navigate("/explore")}
                    className="w-10 h-10 rounded-full grid place-items-center text-black/60 hover:text-black active:bg-black/[0.06] tap-shrink"
                    aria-label="buscar"
                    data-testid="mobile-search-btn"
                >
                    <Search size={20} strokeWidth={1.6} />
                </button>
                <button
                    onClick={() => navigate("/notifications")}
                    data-testid="mobile-notif-btn"
                    className="relative w-10 h-10 rounded-full grid place-items-center text-black/60 hover:text-black active:bg-black/[0.06] tap-shrink"
                    aria-label="notificações"
                >
                    <Bell size={20} strokeWidth={1.6} />
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
    );
}
