import { NavLink, Link } from "react-router-dom";
import {
    Home, Compass, Bell, MessageCircle, PenSquare, Users as UsersIcon,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Avatar } from "./Avatar";
import { useEffect, useState } from "react";
import { api } from "../lib/api";

// Primary nav — tight, social-network standard (5 items)
const primaryItems = [
    { to: "/", label: "Início", icon: Home, testid: "nav-home", end: true },
    { to: "/explore", label: "Explorar", icon: Compass, testid: "nav-explore" },
    { to: "/notifications", label: "Notificações", icon: Bell, testid: "nav-notifications" },
    { to: "/messages", label: "Mensagens", icon: MessageCircle, testid: "nav-messages" },
    { to: "/communities", label: "Comunidades", icon: UsersIcon, testid: "nav-communities" },
];

export function DesktopTopBar({ onCompose }) {
    const { user } = useAuth();
    const [counts, setCounts] = useState({ notif: 0, msg: 0 });

    useEffect(() => {
        let cancelled = false;
        const tick = async () => {
            try {
                const [n, m] = await Promise.all([
                    api.get("/notifications/unread-count"),
                    api.get("/messages/unread-count"),
                ]);
                if (!cancelled) setCounts({ notif: n.data.count, msg: m.data.count });
            } catch {}
        };
        tick();
        const id = setInterval(tick, 8000);
        return () => { cancelled = true; clearInterval(id); };
    }, []);

    return (
        <header
            className="hidden sticky top-0 z-40 bg-white/85 backdrop-blur-xl border-b border-black/[0.07]"
            data-testid="desktop-topbar"
        >
            <div className="max-w-[1300px] mx-auto px-6 h-[64px] flex items-center gap-4">
                {/* Logo */}
                <Link to="/" className="flex items-center shrink-0 tap-shrink mr-2" data-testid="desktop-topbar-logo">
                    <h1 className="font-display text-[26px] leading-none tracking-tight text-black flex items-baseline gap-1.5">
                        <span className="silver-foil text-[20px] translate-y-[2px]">◆</span>
                        <span>vermillion</span>
                    </h1>
                </Link>

                {/* Primary nav */}
                <nav className="flex items-center gap-0.5 flex-1 min-w-0 overflow-x-auto no-scrollbar">
                    {primaryItems.map((item) => {
                        let badge = 0;
                        if (item.to === "/notifications") badge = counts.notif;
                        if (item.to === "/messages") badge = counts.msg;
                        const Icon = item.icon;
                        return (
                            <NavLink
                                key={item.to}
                                to={item.to}
                                end={item.end}
                                data-testid={item.testid}
                                className={({ isActive }) =>
                                    `relative flex items-center gap-2 px-3.5 py-2 rounded-full transition-all tap-shrink ${
                                        isActive ? "bg-black/[0.06] text-black font-semibold" : "text-black/75 hover:bg-black/[0.04] hover:text-black"
                                    }`
                                }
                            >
                                {({ isActive }) => (
                                    <>
                                        <span className="relative">
                                            <Icon size={18} strokeWidth={isActive ? 2 : 1.7} />
                                            {badge > 0 && (
                                                <span className="absolute -top-1.5 -right-2 min-w-[15px] h-[15px] px-1 rounded-full bg-red-soft text-[9px] font-mono grid place-items-center text-white ring-2 ring-white">
                                                    {badge > 99 ? "99+" : badge}
                                                </span>
                                            )}
                                        </span>
                                        <span className="text-[13.5px] tracking-tight whitespace-nowrap">{item.label}</span>
                                    </>
                                )}
                            </NavLink>
                        );
                    })}
                </nav>

                {/* Compose */}
                <button
                    onClick={onCompose}
                    data-testid="topbar-compose-btn"
                    className="btn-atl text-[13.5px] px-4 py-2 flex items-center gap-2 tracking-tight shrink-0"
                >
                    <PenSquare size={15} strokeWidth={2.1} /> Publicar
                </button>

                {/* Avatar — direct link to own profile (no dropdown) */}
                <Link
                    to={user?.username ? `/u/${user.username}` : "/"}
                    data-testid="topbar-user-btn"
                    aria-label="Ir para o meu perfil"
                    className="shrink-0 rounded-full p-0.5 hover:bg-black/[0.05] transition tap-shrink"
                >
                    <Avatar user={user} size={34} showOnline />
                </Link>
            </div>
        </header>
    );
}
