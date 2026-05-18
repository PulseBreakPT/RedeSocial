import { Link, useNavigate, useLocation } from "react-router-dom";
import { Bell, Search, MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Avatar } from "./Avatar";

export function MobileTopBar({ onOpenChat }) {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [unread, setUnread] = useState(0);

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

    return (
        <header
            className="lg:hidden sticky top-0 z-40 glass border-b border-black/[0.07] pt-safe"
            data-testid="mobile-topbar"
        >
            <div className="flex items-center gap-3 px-4 h-[var(--mobile-topbar-h)]">
                {/* Avatar — direct link to own profile (no dropdown) */}
                <Link
                    to={user?.username ? `/u/${user.username}` : "/"}
                    aria-label="Ir para o meu perfil"
                    data-testid="mobile-topbar-avatar"
                    className="tap-shrink rounded-full p-0.5 -ml-0.5 hover:bg-black/[0.05] transition shrink-0"
                >
                    <Avatar user={user} size={32} showOnline />
                </Link>

                <Link to="/" className="flex items-center gap-1.5 mr-auto tap-shrink" data-testid="mobile-topbar-logo">
                    <span className="font-display text-[24px] leading-none tracking-tight text-black flex items-baseline gap-1">
                        <span className="silver-foil text-[20px] not-italic translate-y-[1px]">◆</span>
                        lusorae
                    </span>
                    <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-coral-500 animate-pulse" style={{ background: "var(--coral-500)" }} aria-hidden />
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
                    onClick={() => onOpenChat && onOpenChat()}
                    className="w-10 h-10 rounded-full grid place-items-center tap-shrink transition text-black hover:bg-black/[0.06] active:bg-black/[0.08]"
                    aria-label="chats"
                    data-testid="mobile-chat-btn"
                >
                    <MessageCircle size={20} strokeWidth={1.7} />
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
    );
}
