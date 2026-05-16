import { NavLink, Link, useNavigate } from "react-router-dom";
import {
    Home, Compass, Bell, MessageCircle, Bookmark, User, Settings,
    LogOut, PenSquare, Users as UsersIcon,
    FileText, Clock, Eye, ChevronDown,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Avatar } from "./Avatar";
import { VerifiedBadge } from "./VerifiedBadge";
import { PresencePicker } from "./PresencePicker";
import { ConnectionIndicator } from "./WebSocketProvider";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useClickOutside } from "../hooks/useClickOutside";

// Primary nav — kept tight (5 items, social-network standard)
const primaryItems = [
    { to: "/", label: "Início", icon: Home, testid: "nav-home", end: true },
    { to: "/explore", label: "Explorar", icon: Compass, testid: "nav-explore" },
    { to: "/notifications", label: "Notificações", icon: Bell, testid: "nav-notifications" },
    { to: "/messages", label: "Mensagens", icon: MessageCircle, testid: "nav-messages" },
    { to: "/communities", label: "Comunidades", icon: UsersIcon, testid: "nav-communities" },
];

// User dropdown — account-only, social-network style.
const accountItems = [
    { to: "/bookmarks", label: "Guardados", icon: Bookmark, testid: "umenu-bookmarks" },
    { to: "/drafts", label: "Rascunhos", icon: FileText, testid: "umenu-drafts" },
    { to: "/scheduled", label: "Agendados", icon: Clock, testid: "umenu-scheduled" },
    { to: "/visitors", label: "Visitas", icon: Eye, testid: "umenu-visitors" },
];

export function DesktopTopBar({ onCompose }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [counts, setCounts] = useState({ notif: 0, msg: 0 });
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useClickOutside(() => setMenuOpen(false), menuOpen);

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
            className="hidden lg:block sticky top-0 z-40 bg-white/85 backdrop-blur-xl border-b border-black/[0.07]"
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

                {/* User menu */}
                <div className="relative shrink-0" ref={menuRef}>
                    <button
                        type="button"
                        onClick={() => setMenuOpen((v) => !v)}
                        data-testid="topbar-user-btn"
                        aria-haspopup="menu"
                        aria-expanded={menuOpen}
                        className="flex items-center gap-2 rounded-full pl-1 pr-2.5 py-1 hover:bg-black/[0.05] transition tap-shrink"
                    >
                        <Avatar user={user} size={32} showOnline />
                        <ChevronDown size={14} strokeWidth={1.8} className={`text-black/55 transition-transform ${menuOpen ? "rotate-180" : ""}`} />
                    </button>

                    {menuOpen && (
                        <div
                            role="menu"
                            data-testid="topbar-user-menu"
                            className="absolute right-0 top-full mt-2 w-[300px] z-50 rounded-2xl bg-white shadow-[0_20px_50px_-15px_rgba(13,13,16,0.25)] border border-black/[0.07] overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150"
                        >
                            {/* Header card — clickable, links to profile */}
                            <button
                                onClick={() => { setMenuOpen(false); navigate(`/u/${user?.username}`); }}
                                data-testid="umenu-header"
                                className="w-full text-left tap-shrink hover:bg-black/[0.02] transition group"
                            >
                                <div className="flex items-center gap-3 px-4 pt-3.5 pb-2">
                                    <Avatar user={user} size={46} />
                                    <div className="flex-1 min-w-0">
                                        <div className="font-heading font-semibold truncate text-[15px] flex items-center gap-1 text-black">
                                            {user?.name} {user?.verified && <VerifiedBadge size={12} />}
                                        </div>
                                        <div className="font-mono text-[11.5px] text-black/50 truncate">@{user?.username}</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 px-4 pb-3 text-[12px]">
                                    <span>
                                        <span className="font-semibold text-black tabular-nums">{user?.following_count ?? 0}</span>
                                        <span className="text-black/55"> a seguir</span>
                                    </span>
                                    <span>
                                        <span className="font-semibold text-black tabular-nums">{user?.followers_count ?? 0}</span>
                                        <span className="text-black/55"> seguidores</span>
                                    </span>
                                    <span className="ml-auto text-[11px] font-medium text-black/45 group-hover:text-black transition">Ver perfil →</span>
                                </div>
                            </button>

                            {/* Presence + connection */}
                            <div className="px-4 py-2 hairline-t hairline-b flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                                <PresencePicker />
                                <ConnectionIndicator />
                            </div>

                            {/* Account items */}
                            <div className="py-1.5">
                                {accountItems.map((item) => {
                                    const Icon = item.icon;
                                    return (
                                        <NavLink
                                            key={item.to}
                                            to={item.to}
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

                            {/* Settings */}
                            <div className="hairline-t py-1.5">
                                <NavLink
                                    to="/settings"
                                    onClick={() => setMenuOpen(false)}
                                    data-testid="umenu-settings"
                                    className={({ isActive }) =>
                                        `flex items-center gap-3 px-4 py-2.5 transition tap-shrink text-[14px] ${
                                            isActive ? "bg-black/[0.05] text-black font-semibold" : "text-black/80 hover:bg-black/[0.04]"
                                        }`
                                    }
                                >
                                    <Settings size={17} strokeWidth={1.7} />
                                    <span className="tracking-tight">Definições</span>
                                </NavLink>
                            </div>

                            {/* Logout */}
                            <div className="hairline-t py-1.5">
                                <button
                                    onClick={() => { setMenuOpen(false); logout(); }}
                                    data-testid="umenu-logout"
                                    className="w-full flex items-center gap-3 px-4 py-2.5 transition text-[14px] text-black/80 hover:bg-red-soft/10 hover:text-red-soft"
                                >
                                    <LogOut size={17} strokeWidth={1.7} />
                                    <span className="tracking-tight">Terminar sessão</span>
                                </button>
                            </div>

                            {/* Micro-footer */}
                            <div className="px-4 py-2.5 hairline-t flex flex-wrap gap-x-2.5 gap-y-1 text-[10.5px] text-black/40 bg-black/[0.015]">
                                <Link to="/manifesto" onClick={() => setMenuOpen(false)} className="hover:text-black hover:underline underline-offset-2">Manifesto</Link>
                                <Link to="/legal" onClick={() => setMenuOpen(false)} className="hover:text-black hover:underline underline-offset-2">Centro Legal</Link>
                                <Link to="/legal/terms" onClick={() => setMenuOpen(false)} className="hover:text-black hover:underline underline-offset-2">Termos</Link>
                                <Link to="/legal/privacy" onClick={() => setMenuOpen(false)} className="hover:text-black hover:underline underline-offset-2">Privacidade</Link>
                                <span className="font-mono text-black/30 ml-auto">© Vermillion</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
