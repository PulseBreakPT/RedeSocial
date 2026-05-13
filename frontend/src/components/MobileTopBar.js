import { Link, useNavigate } from "react-router-dom";
import { Bell, Search, Sparkles } from "lucide-react";
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
            className="lg:hidden sticky top-0 z-40 glass border-b border-white/5"
            data-testid="mobile-topbar"
        >
            <div className="flex items-center gap-3 px-4 py-3">
                <button
                    onClick={() => navigate(`/u/${user?.username}`)}
                    className="tap-shrink"
                    aria-label="perfil"
                >
                    <Avatar user={user} size={32} showOnline />
                </button>
                <Link to="/" className="flex items-center gap-1.5 mr-auto tap-shrink">
                    <span className="font-heading text-[22px] font-bold tracking-tighter">
                        <span className="text-accent-vermillion">◆</span> vermillion
                    </span>
                </Link>
                <button
                    onClick={() => {
                        const el = document.querySelector('[data-testid="search-input"]');
                        if (el) el.focus();
                        else navigate("/explore");
                    }}
                    className="w-9 h-9 rounded-full grid place-items-center text-zinc-400 hover:text-white hover:bg-white/[0.06] tap-shrink"
                    aria-label="buscar"
                >
                    <Search size={18} strokeWidth={2} />
                </button>
                <button
                    onClick={() => navigate("/notifications")}
                    data-testid="mobile-notif-btn"
                    className="relative w-9 h-9 rounded-full grid place-items-center text-zinc-400 hover:text-white hover:bg-white/[0.06] tap-shrink"
                    aria-label="notificações"
                >
                    <Bell size={18} strokeWidth={2} />
                    {unread > 0 && (
                        <span className="absolute top-1 right-1 min-w-[14px] h-3.5 px-1 rounded-full bg-accent-vermillion text-[9px] font-mono grid place-items-center text-white">
                            {unread}
                        </span>
                    )}
                </button>
            </div>
        </header>
    );
}
