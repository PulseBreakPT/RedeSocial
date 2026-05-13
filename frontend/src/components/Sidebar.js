import { NavLink, useNavigate } from "react-router-dom";
import {
    Home, Compass, Bell, MessageCircle, Bookmark, User, Settings,
    LogOut, PenSquare, Users as UsersIcon, CalendarDays, TrendingUp,
    FileText, Clock, ScrollText, Scale, Globe, Eye, Gift, MoreHorizontal,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Avatar } from "./Avatar";
import { VerifiedBadge } from "./VerifiedBadge";
import { PresencePicker } from "./PresencePicker";
import { ConnectionIndicator } from "./WebSocketProvider";
import { StreakCard } from "./StreakCard";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useClickOutside } from "../hooks/useClickOutside";

// Primary nav — kept short, social-network style (8 items including "Mais")
const primaryItems = [
    { to: "/", label: "Início", icon: Home, testid: "nav-home" },
    { to: "/explore", label: "Explorar", icon: Compass, testid: "nav-explore" },
    { to: "/notifications", label: "Notificações", icon: Bell, testid: "nav-notifications" },
    { to: "/messages", label: "Mensagens", icon: MessageCircle, testid: "nav-messages" },
    { to: "/communities", label: "Comunidades", icon: UsersIcon, testid: "nav-communities" },
    { to: "/bookmarks", label: "Guardados", icon: Bookmark, testid: "nav-bookmarks" },
];

// Secondary nav — surfaced inside the "Mais" popup
const moreItems = [
    { to: "/trending", label: "Tendências", icon: TrendingUp, testid: "more-trending" },
    { to: "/events", label: "Eventos", icon: CalendarDays, testid: "more-events" },
    { to: "/starter-packs", label: "Starter Packs", icon: Gift, testid: "more-starter-packs" },
    { to: "/visitors", label: "Visitas", icon: Eye, testid: "more-visitors" },
    { to: "/drafts", label: "Rascunhos", icon: FileText, testid: "more-drafts" },
    { to: "/scheduled", label: "Agendados", icon: Clock, testid: "more-scheduled" },
    { divider: true },
    { to: "/diaspora", label: "Diáspora", icon: Globe, testid: "more-diaspora" },
    { to: "/manifesto", label: "Manifesto", icon: ScrollText, testid: "more-manifesto" },
    { to: "/legal", label: "Centro Legal", icon: Scale, testid: "more-legal" },
    { divider: true },
    { to: "/settings", label: "Definições", icon: Settings, testid: "more-settings" },
];

// Routes that belong to the "Mais" group — used to highlight the trigger when active
const moreRoutes = moreItems.filter((i) => i.to).map((i) => i.to);

export function Sidebar({ onCompose }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [counts, setCounts] = useState({ notif: 0, msg: 0 });
    const [moreOpen, setMoreOpen] = useState(false);
    const moreRef = useClickOutside(() => setMoreOpen(false), moreOpen);

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

    const isMoreActive = typeof window !== "undefined" && moreRoutes.some((r) => {
        const p = window.location.pathname;
        return p === r || p.startsWith(r + "/");
    });

    const renderNavItem = ({ to, label, icon: Icon, testid, badge }) => (
        <NavLink
            key={to}
            to={to}
            end={to === "/"}
            data-testid={testid}
            className={({ isActive }) =>
                `relative group flex items-center gap-4 px-3.5 py-2.5 rounded-full transition-all tap-shrink ${
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
                    <span className="relative">
                        <Icon size={22} strokeWidth={isActive ? 2 : 1.6} />
                        {badge > 0 && (
                            <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-soft text-[9px] font-mono grid place-items-center text-white ring-2 ring-white">
                                {badge > 99 ? "99+" : badge}
                            </span>
                        )}
                    </span>
                    <span className={`text-[15.5px] tracking-tight ${isActive ? "font-semibold" : ""}`}>{label}</span>
                </>
            )}
        </NavLink>
    );

    return (
        <aside className="hidden lg:flex flex-col gap-1 sticky top-0 h-screen py-6 pr-3 overflow-y-auto" data-testid="sidebar">
            <div className="px-3 mb-7">
                <h1 className="font-display text-[34px] leading-none tracking-tight text-black flex items-baseline gap-1.5">
                    <span className="silver-foil text-[26px] translate-y-[2px]">◆</span>
                    <span>vermillion</span>
                </h1>
            </div>

            <nav className="flex flex-col gap-0.5">
                {primaryItems.map((item) => {
                    let badge = 0;
                    if (item.to === "/notifications") badge = counts.notif;
                    if (item.to === "/messages") badge = counts.msg;
                    return renderNavItem({ ...item, badge });
                })}

                {/* Profile */}
                <NavLink
                    to={`/u/${user?.username}`}
                    data-testid="nav-profile"
                    className={({ isActive }) =>
                        `relative group flex items-center gap-4 px-3.5 py-2.5 rounded-full transition-all tap-shrink ${
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
                            <User size={22} strokeWidth={isActive ? 2 : 1.6} />
                            <span className={`text-[15.5px] tracking-tight ${isActive ? "font-semibold" : ""}`}>Perfil</span>
                        </>
                    )}
                </NavLink>

                {/* "Mais" trigger + popup */}
                <div className="relative" ref={moreRef}>
                    <button
                        type="button"
                        onClick={() => setMoreOpen((v) => !v)}
                        data-testid="nav-more-btn"
                        aria-haspopup="menu"
                        aria-expanded={moreOpen}
                        className={`w-full relative group flex items-center gap-4 px-3.5 py-2.5 rounded-full transition-all tap-shrink text-left ${
                            isMoreActive || moreOpen ? "chip-on" : "text-black hover:bg-black/[0.045]"
                        }`}
                    >
                        {(isMoreActive || moreOpen) && (
                            <span
                                aria-hidden
                                className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full grad-bar"
                            />
                        )}
                        <MoreHorizontal size={22} strokeWidth={isMoreActive || moreOpen ? 2 : 1.6} />
                        <span className={`text-[15.5px] tracking-tight ${isMoreActive || moreOpen ? "font-semibold" : ""}`}>Mais</span>
                    </button>

                    {moreOpen && (
                        <div
                            role="menu"
                            data-testid="nav-more-menu"
                            className="absolute left-2 bottom-full mb-2 w-[260px] z-50 rounded-2xl bg-white shadow-[0_20px_50px_-15px_rgba(13,13,16,0.25)] border border-black/[0.07] py-2 animate-in fade-in-0 zoom-in-95 duration-150"
                        >
                            {moreItems.map((item, idx) => {
                                if (item.divider) {
                                    return <div key={`div-${idx}`} className="my-1.5 mx-3 h-px bg-black/[0.07]" />;
                                }
                                const { to, label, icon: Icon, testid } = item;
                                return (
                                    <NavLink
                                        key={to}
                                        to={to}
                                        onClick={() => setMoreOpen(false)}
                                        data-testid={testid}
                                        className={({ isActive }) =>
                                            `flex items-center gap-3 px-4 py-2.5 transition tap-shrink text-[14.5px] ${
                                                isActive
                                                    ? "bg-black/[0.05] text-black font-semibold"
                                                    : "text-black/80 hover:bg-black/[0.04]"
                                            }`
                                        }
                                    >
                                        <Icon size={18} strokeWidth={1.7} />
                                        <span className="tracking-tight">{label}</span>
                                    </NavLink>
                                );
                            })}
                        </div>
                    )}
                </div>
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
                <div className="mt-1 px-1" onClick={(e) => e.stopPropagation()}>
                    <PresencePicker />
                </div>
                <div className="mt-2 px-1 flex items-center justify-between" onClick={(e) => e.stopPropagation()}>
                    {user?.username && <StreakCard username={user.username} compact />}
                    <ConnectionIndicator className="ml-auto" />
                </div>
                <div className="px-3 pt-3 pb-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-black/40">
                    <a href="/legal/terms" className="hover:text-black hover:underline underline-offset-2">Termos</a>
                    <a href="/legal/privacy" className="hover:text-black hover:underline underline-offset-2">Privacidade</a>
                    <a href="/legal/cookies" className="hover:text-black hover:underline underline-offset-2">Cookies</a>
                    <span className="font-mono text-black/35">© Vermillion</span>
                </div>
            </div>
        </aside>
    );
}
