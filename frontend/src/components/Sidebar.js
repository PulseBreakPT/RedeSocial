import { NavLink, useNavigate } from "react-router-dom";
import {
    Home, Compass, Bell, MessageCircle, Bookmark, User, Settings,
    LogOut, PenSquare, Users as UsersIcon, CalendarDays, TrendingUp,
    FileText, Clock,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Avatar } from "./Avatar";
import { VerifiedBadge } from "./VerifiedBadge";
import { useEffect, useState } from "react";
import { api } from "../lib/api";

const items = [
    { to: "/", label: "Início", icon: Home, testid: "nav-home" },
    { to: "/explore", label: "Explorar", icon: Compass, testid: "nav-explore" },
    { to: "/trending", label: "Tendências", icon: TrendingUp, testid: "nav-trending" },
    { to: "/communities", label: "Comunidades", icon: UsersIcon, testid: "nav-communities" },
    { to: "/events", label: "Eventos", icon: CalendarDays, testid: "nav-events" },
    { to: "/notifications", label: "Notificações", icon: Bell, testid: "nav-notifications" },
    { to: "/messages", label: "Mensagens", icon: MessageCircle, testid: "nav-messages" },
    { to: "/bookmarks", label: "Guardados", icon: Bookmark, testid: "nav-bookmarks" },
    { to: "/drafts", label: "Rascunhos", icon: FileText, testid: "nav-drafts" },
    { to: "/scheduled", label: "Agendados", icon: Clock, testid: "nav-scheduled" },
    { to: "/settings", label: "Definições", icon: Settings, testid: "nav-settings" },
];

export function Sidebar({ onCompose }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
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
        <aside className="hidden lg:flex flex-col gap-1 sticky top-0 h-screen py-6 pr-3 overflow-y-auto" data-testid="sidebar">
            <div className="px-3 mb-7">
                <h1 className="font-display text-[34px] leading-none tracking-tight text-black flex items-baseline gap-1.5">
                    <span className="silver-foil text-[26px] translate-y-[2px]">◆</span>
                    <span className="">vermillion</span>
                </h1>
                            </div>

            <nav className="flex flex-col gap-0.5">
                {items.map(({ to, label, icon: Icon, testid }) => (
                    <NavLink
                        key={to}
                        to={to}
                        end={to === "/"}
                        data-testid={testid}
                        className={({ isActive }) =>
                            `relative group flex items-center gap-3.5 px-3.5 py-2.5 rounded-full transition-all tap-shrink ${
                                isActive
                                    ? "chip-on"
                                    : "text-black hover:bg-black/[0.045]"
                            }`
                        }
                    >
                        {({ isActive }) => (
                            <>
                                {isActive && (
                                    <span
                                        aria-hidden
                                        className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full grad-bar"
                                    />
                                )}
                                <span className="relative">
                                    <Icon size={20} strokeWidth={isActive ? 2 : 1.55} />
                                    {to === "/notifications" && counts.notif > 0 && (
                                        <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-soft text-[9px] font-mono grid place-items-center text-white ring-2 ring-white">
                                            {counts.notif}
                                        </span>
                                    )}
                                    {to === "/messages" && counts.msg > 0 && (
                                        <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-soft text-[9px] font-mono grid place-items-center text-white ring-2 ring-white">
                                            {counts.msg}
                                        </span>
                                    )}
                                </span>
                                <span className={`text-[15px] tracking-tight ${isActive ? "font-semibold" : ""}`}>{label}</span>
                            </>
                        )}
                    </NavLink>
                ))}
                <NavLink
                    to={`/u/${user?.username}`}
                    data-testid="nav-profile"
                    className={({ isActive }) =>
                        `relative group flex items-center gap-3.5 px-3.5 py-2.5 rounded-full transition-all tap-shrink ${
                            isActive ? "chip-on" : "text-black hover:bg-black/[0.045]"
                        }`
                    }
                >
                    {({ isActive }) => (
                        <>
                            {isActive && (
                                <span
                                    aria-hidden
                                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full grad-bar"
                                />
                            )}
                            <User size={20} strokeWidth={isActive ? 2 : 1.55} />
                            <span className={`text-[15px] tracking-tight ${isActive ? "font-semibold" : ""}`}>Perfil</span>
                        </>
                    )}
                </NavLink>
            </nav>

            <button
                onClick={onCompose}
                data-testid="sidebar-compose-btn"
                className="btn-atl mt-5 mx-2 text-[15px] py-3 flex items-center justify-center gap-2 tracking-tight"
            >
                <PenSquare size={16} strokeWidth={2.1} /> Publicar
            </button>

            <div className="mt-auto px-2 pt-4">
                <div
                    className="flex items-center gap-3 p-3 rounded-2xl hover:bg-black/[0.03] cursor-pointer transition tap-shrink border border-transparent hover:border-black/[0.06]"
                    onClick={() => navigate(`/u/${user?.username}`)}
                >
                    <Avatar user={user} size={40} showOnline />
                    <div className="flex-1 min-w-0">
                        <div className="font-heading font-semibold truncate text-sm flex items-center gap-1 text-black">
                            {user?.name} {user?.verified && <VerifiedBadge size={12} />}
                        </div>
                        <div className="font-mono text-xs text-black/50 truncate">@{user?.username}</div>
                    </div>
                    <button
                        onClick={(e) => { e.stopPropagation(); logout(); }}
                        data-testid="logout-btn"
                        className="text-black/40 hover:text-red-soft p-2 rounded-full hover:bg-red-soft/10"
                        title="Sair"
                    >
                        <LogOut size={16} />
                    </button>
                </div>
                <div className="px-3 pt-3 pb-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-black/45">
                    <a href="/legal/terms" className="hover:text-black hover:underline underline-offset-2">Termos</a>
                    <a href="/legal/privacy" className="hover:text-black hover:underline underline-offset-2">Privacidade</a>
                    <a href="/legal/cookies" className="hover:text-black hover:underline underline-offset-2">Cookies</a>
                    <a href="/legal/community" className="hover:text-black hover:underline underline-offset-2">Diretrizes</a>
                    <span className="font-mono text-black/35">© Vermillion</span>
                </div>
            </div>
        </aside>
    );
}
