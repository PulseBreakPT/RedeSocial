import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import {
    Bell, Search, MessageCircle, ChevronDown, User, TrendingUp,
    Users as UsersIcon, Bookmark, FileText, Clock, Eye, Settings,
    ScrollText, Scale, LogOut, X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Avatar } from "./Avatar";
import { VerifiedBadge } from "./VerifiedBadge";
import { PresencePicker } from "./PresencePicker";
import { ConnectionIndicator } from "./WebSocketProvider";
import { useClickOutside, useEscapeKey } from "../hooks/useClickOutside";

const menuItems = [
    { to: "__profile__", label: "Perfil", icon: User, testid: "mtop-menu-profile" },
    { to: "/communities", label: "Comunidades", icon: UsersIcon, testid: "mtop-menu-communities" },
    { to: "/bookmarks", label: "Guardados", icon: Bookmark, testid: "mtop-menu-bookmarks" },
    { to: "/trending", label: "Tendências", icon: TrendingUp, testid: "mtop-menu-trending" },
    { divider: true },
    { to: "/visitors", label: "Visitas", icon: Eye, testid: "mtop-menu-visitors" },
    { to: "/drafts", label: "Rascunhos", icon: FileText, testid: "mtop-menu-drafts" },
    { to: "/scheduled", label: "Agendados", icon: Clock, testid: "mtop-menu-scheduled" },
    { divider: true },
    { to: "/settings", label: "Definições", icon: Settings, testid: "mtop-menu-settings" },
    { to: "/manifesto", label: "Manifesto", icon: ScrollText, testid: "mtop-menu-manifesto" },
    { to: "/legal", label: "Centro Legal", icon: Scale, testid: "mtop-menu-legal" },
];

export function MobileTopBar({ onOpenChat }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [unread, setUnread] = useState(0);
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useClickOutside(() => setMenuOpen(false), menuOpen);
    useEscapeKey(() => setMenuOpen(false), menuOpen);

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

    // Close on route change
    useEffect(() => { setMenuOpen(false); }, [location.pathname]);

    return (
        <header
            className="lg:hidden sticky top-0 z-40 glass border-b border-black/[0.07] pt-safe"
            data-testid="mobile-topbar"
        >
            <div className="flex items-center gap-3 px-4 h-[var(--mobile-topbar-h)]">
                {/* Avatar + chevron — opens a compact dropdown menu */}
                <div className="relative flex-shrink-0" ref={menuRef}>
                    <button
                        onClick={() => setMenuOpen((v) => !v)}
                        className="tap-shrink relative flex items-center gap-1 -ml-1 pl-1 pr-1.5 py-1 rounded-full hover:bg-black/[0.05] transition"
                        aria-label="Abrir menu"
                        aria-haspopup="menu"
                        aria-expanded={menuOpen}
                        data-testid="mobile-topbar-avatar"
                    >
                        <Avatar user={user} size={32} showOnline />
                        <ChevronDown
                            size={13}
                            strokeWidth={1.8}
                            className={`text-black/55 transition-transform ${menuOpen ? "rotate-180" : ""}`}
                        />
                        {unread > 0 && !menuOpen && (
                            <span
                                aria-hidden
                                className="absolute top-0 left-7 w-2.5 h-2.5 rounded-full border-2 border-white"
                                style={{ background: "var(--coral-500)" }}
                            />
                        )}
                    </button>

                    {menuOpen && (
                        <div
                            role="menu"
                            data-testid="mobile-topbar-menu"
                            className="absolute left-0 top-full mt-2 w-[280px] z-50 rounded-2xl bg-white shadow-[0_20px_50px_-15px_rgba(13,13,16,0.30)] border border-black/[0.08] py-2 animate-in fade-in-0 zoom-in-95 duration-150"
                        >
                            {/* User header */}
                            <button
                                onClick={() => { setMenuOpen(false); navigate(`/u/${user?.username}`); }}
                                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-black/[0.03] transition text-left tap-shrink"
                                data-testid="mtop-menu-header"
                            >
                                <Avatar user={user} size={42} />
                                <div className="flex-1 min-w-0">
                                    <div className="font-heading font-semibold truncate text-[14.5px] flex items-center gap-1 text-black">
                                        {user?.name} {user?.verified && <VerifiedBadge size={12} />}
                                    </div>
                                    <div className="font-mono text-xs text-black/50 truncate">@{user?.username}</div>
                                </div>
                            </button>

                            {/* Follow counts */}
                            <div className="px-4 pb-2 -mt-1 flex items-center gap-4 text-[12.5px]" onClick={(e) => e.stopPropagation()}>
                                <button onClick={() => { setMenuOpen(false); navigate(`/u/${user?.username}?tab=following`); }} className="tap-shrink">
                                    <span className="font-semibold text-black tabular-nums">{user?.following_count ?? 0}</span>
                                    <span className="text-black/55"> a seguir</span>
                                </button>
                                <button onClick={() => { setMenuOpen(false); navigate(`/u/${user?.username}?tab=followers`); }} className="tap-shrink">
                                    <span className="font-semibold text-black tabular-nums">{user?.followers_count ?? 0}</span>
                                    <span className="text-black/55"> seguidores</span>
                                </button>
                            </div>

                            {/* Presence */}
                            <div className="px-4 py-2 hairline-t hairline-b flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                                <PresencePicker />
                                <ConnectionIndicator />
                            </div>

                            {/* Menu items */}
                            <div className="py-1 max-h-[55vh] overflow-y-auto">
                                {menuItems.map((item, idx) => {
                                    if (item.divider) {
                                        return <div key={`div-${idx}`} className="my-1.5 mx-3 h-px bg-black/[0.07]" />;
                                    }
                                    const Icon = item.icon;
                                    const to = item.to === "__profile__" ? `/u/${user?.username}` : item.to;
                                    return (
                                        <NavLink
                                            key={item.to}
                                            to={to}
                                            onClick={() => setMenuOpen(false)}
                                            data-testid={item.testid}
                                            className={({ isActive }) =>
                                                `flex items-center gap-3 px-4 py-2.5 transition tap-shrink text-[14px] ${
                                                    isActive
                                                        ? "bg-black/[0.05] text-black font-semibold"
                                                        : "text-black/80 hover:bg-black/[0.04]"
                                                }`
                                            }
                                        >
                                            <Icon size={17} strokeWidth={1.7} />
                                            <span className="tracking-tight">{item.label}</span>
                                        </NavLink>
                                    );
                                })}
                            </div>

                            {/* Logout */}
                            <div className="hairline-t mt-1 pt-1">
                                <button
                                    onClick={() => { setMenuOpen(false); logout(); }}
                                    data-testid="mtop-menu-logout"
                                    className="w-full flex items-center gap-3 px-4 py-2.5 transition text-[14px] text-black/80 hover:bg-red-soft/10 hover:text-red-soft"
                                >
                                    <LogOut size={17} strokeWidth={1.7} />
                                    <span className="tracking-tight">Terminar sessão</span>
                                </button>
                            </div>

                            {/* Footer */}
                            <div className="px-4 pt-2 pb-1 flex flex-wrap gap-x-3 gap-y-1 text-[10.5px] text-black/40">
                                <Link to="/legal/terms" onClick={() => setMenuOpen(false)} className="hover:text-black hover:underline underline-offset-2">Termos</Link>
                                <Link to="/legal/privacy" onClick={() => setMenuOpen(false)} className="hover:text-black hover:underline underline-offset-2">Privacidade</Link>
                                <Link to="/legal/cookies" onClick={() => setMenuOpen(false)} className="hover:text-black hover:underline underline-offset-2">Cookies</Link>
                                <span className="font-mono text-black/35 ml-auto">© Vermillion</span>
                            </div>
                        </div>
                    )}
                </div>

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
