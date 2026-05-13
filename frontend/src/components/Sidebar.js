import { NavLink, useNavigate } from "react-router-dom";
import {
    Home, Compass, Bell, MessageCircle, Bookmark, User, Settings,
    LogOut, PenSquare, Users as UsersIcon, CalendarDays, TrendingUp,
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
    { to: "/bookmarks", label: "Salvos", icon: Bookmark, testid: "nav-bookmarks" },
    { to: "/settings", label: "Configurações", icon: Settings, testid: "nav-settings" },
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
        return () => {
            cancelled = true;
            clearInterval(id);
        };
    }, []);

    return (
        <aside className="hidden lg:flex flex-col gap-1 sticky top-0 h-screen py-6 pr-3 border-r border-zinc-900 overflow-y-auto" data-testid="sidebar">
            <div className="px-3 mb-6">
                <h1 className="font-heading text-2xl font-bold tracking-tighter">
                    <span className="text-accent-vermillion">▲</span> vermillion
                </h1>
                <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500 mt-1">rede social</p>
            </div>

            <nav className="flex flex-col gap-0.5">
                {items.map(({ to, label, icon: Icon, testid }) => (
                    <NavLink
                        key={to}
                        to={to}
                        end={to === "/"}
                        data-testid={testid}
                        className={({ isActive }) =>
                            `group flex items-center gap-3.5 px-3.5 py-2.5 rounded-full transition-all ${
                                isActive
                                    ? "bg-white/[0.06] text-white"
                                    : "text-zinc-400 hover:bg-white/[0.04] hover:text-white"
                            }`
                        }
                    >
                        <span className="relative">
                            <Icon size={20} strokeWidth={1.75} />
                            {to === "/notifications" && counts.notif > 0 && (
                                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-accent-vermillion text-[9px] font-mono grid place-items-center text-white">
                                    {counts.notif}
                                </span>
                            )}
                            {to === "/messages" && counts.msg > 0 && (
                                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-accent-vermillion text-[9px] font-mono grid place-items-center text-white">
                                    {counts.msg}
                                </span>
                            )}
                        </span>
                        <span className="font-heading text-[15px]">{label}</span>
                    </NavLink>
                ))}
                <NavLink
                    to={`/u/${user?.username}`}
                    data-testid="nav-profile"
                    className={({ isActive }) =>
                        `group flex items-center gap-3.5 px-3.5 py-2.5 rounded-full transition-all ${
                            isActive ? "bg-white/[0.06] text-white" : "text-zinc-400 hover:bg-white/[0.04] hover:text-white"
                        }`
                    }
                >
                    <User size={20} strokeWidth={1.75} />
                    <span className="font-heading text-[15px]">Perfil</span>
                </NavLink>
            </nav>

            <button
                onClick={onCompose}
                data-testid="sidebar-compose-btn"
                className="mt-4 mx-2 bg-accent-vermillion text-white font-heading font-semibold uppercase tracking-wide text-sm py-3 rounded-full hover:bg-[#FF7A50] transition-all hover:scale-[1.02] active:scale-95 glow-vermillion flex items-center justify-center gap-2"
            >
                <PenSquare size={16} /> Publicar
            </button>

            <div className="mt-auto px-2 pt-4">
                <div
                    className="flex items-center gap-3 p-3 rounded-full hover:bg-white/[0.04] cursor-pointer transition"
                    onClick={() => navigate(`/u/${user?.username}`)}
                >
                    <Avatar user={user} size={40} />
                    <div className="flex-1 min-w-0">
                        <div className="font-heading font-semibold truncate text-sm flex items-center gap-1">
                            {user?.name} {user?.verified && <VerifiedBadge size={12} />}
                        </div>
                        <div className="font-mono text-xs text-zinc-500 truncate">@{user?.username}</div>
                    </div>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            logout();
                        }}
                        data-testid="logout-btn"
                        className="text-zinc-500 hover:text-accent-vermillion p-2 rounded-full hover:bg-white/5"
                        title="Sair"
                    >
                        <LogOut size={16} />
                    </button>
                </div>
            </div>
        </aside>
    );
}
