import { useEffect } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import {
    Home, Compass, Bell, MessageCircle, Bookmark, User, Settings,
    LogOut, Users as UsersIcon, CalendarDays, TrendingUp,
    FileText, Clock, X, ScrollText, Scale,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Avatar } from "./Avatar";
import { VerifiedBadge } from "./VerifiedBadge";

const items = [
    { to: "/", label: "Início", icon: Home, testid: "mdrawer-home", end: true },
    { to: "/explore", label: "Explorar", icon: Compass, testid: "mdrawer-explore" },
    { to: "/trending", label: "Tendências", icon: TrendingUp, testid: "mdrawer-trending" },
    { to: "/communities", label: "Comunidades", icon: UsersIcon, testid: "mdrawer-communities" },
    { to: "/events", label: "Eventos", icon: CalendarDays, testid: "mdrawer-events" },
    { to: "/notifications", label: "Notificações", icon: Bell, testid: "mdrawer-notifications" },
    { to: "/messages", label: "Mensagens", icon: MessageCircle, testid: "mdrawer-messages" },
    { to: "/bookmarks", label: "Guardados", icon: Bookmark, testid: "mdrawer-bookmarks" },
    { to: "/drafts", label: "Rascunhos", icon: FileText, testid: "mdrawer-drafts" },
    { to: "/scheduled", label: "Agendados", icon: Clock, testid: "mdrawer-scheduled" },
    { to: "/diaspora", label: "Diáspora", icon: UsersIcon, testid: "mdrawer-diaspora" },
    { to: "/manifesto", label: "Manifesto", icon: ScrollText, testid: "mdrawer-manifesto" },
    { to: "/legal", label: "Centro Legal", icon: Scale, testid: "mdrawer-legal" },
    { to: "/settings", label: "Definições", icon: Settings, testid: "mdrawer-settings" },
];

export function MobileMenuDrawer({ open, onClose }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    // Lock body scroll while drawer is open
    useEffect(() => {
        if (!open) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = prev; };
    }, [open]);

    if (!open) return null;

    const go = (to) => { navigate(to); onClose(); };

    return (
        <div
            className="lg:hidden fixed inset-0 z-[80]"
            data-testid="mobile-menu-drawer"
        >
            {/* Overlay */}
            <button
                aria-label="Fechar menu"
                onClick={onClose}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in-0 duration-200"
                data-testid="mobile-menu-overlay"
            />
            {/* Drawer body */}
            <aside
                className="absolute inset-y-0 left-0 w-[86%] max-w-[340px] bg-white shadow-[24px_0_60px_-10px_rgba(13,13,16,0.25)] flex flex-col pt-safe anim-slide-up"
                style={{ animation: "drawerIn 320ms cubic-bezier(0.16,1,0.3,1) both" }}
            >
                <style>{`@keyframes drawerIn { from { transform: translateX(-100%); opacity: 0.6; } to { transform: translateX(0); opacity: 1; } }`}</style>

                {/* Header with user */}
                <div className="p-5 pb-4 hairline-b">
                    <div className="flex items-start justify-between">
                        <button
                            onClick={() => go(`/u/${user?.username}`)}
                            className="flex items-center gap-3 tap-shrink"
                            data-testid="mdrawer-user-header"
                        >
                            <Avatar user={user} size={48} showOnline />
                            <div className="text-left">
                                <div className="font-heading font-semibold text-[15px] text-black flex items-center gap-1">
                                    {user?.name} {user?.verified && <VerifiedBadge size={13} />}
                                </div>
                                <div className="text-[12px] text-black/50 font-mono">@{user?.username}</div>
                            </div>
                        </button>
                        <button
                            onClick={onClose}
                            data-testid="mdrawer-close"
                            className="p-2 -mr-1 -mt-1 rounded-full text-black hover:bg-black/[0.06] active:scale-90"
                            aria-label="Fechar"
                        >
                            <X size={20} strokeWidth={1.7} />
                        </button>
                    </div>
                    <div className="flex items-center gap-4 mt-4 text-[12.5px]">
                        <button onClick={() => go(`/u/${user?.username}?tab=following`)} className="tap-shrink">
                            <span className="font-semibold text-black tabular-nums">{user?.following_count ?? 0}</span>
                            <span className="text-black/55"> a seguir</span>
                        </button>
                        <button onClick={() => go(`/u/${user?.username}?tab=followers`)} className="tap-shrink">
                            <span className="font-semibold text-black tabular-nums">{user?.followers_count ?? 0}</span>
                            <span className="text-black/55"> seguidores</span>
                        </button>
                    </div>
                </div>

                {/* Nav items */}
                <nav className="flex-1 overflow-y-auto py-3 px-2">
                    {items.map(({ to, label, icon: Icon, testid, end }) => (
                        <NavLink
                            key={to}
                            to={to}
                            end={end}
                            onClick={onClose}
                            data-testid={testid}
                            className={({ isActive }) =>
                                `relative flex items-center gap-3.5 px-3.5 py-3 rounded-2xl text-[15px] tap-shrink transition ${
                                    isActive
                                        ? "bg-accent-vermillion/10 text-[color:var(--atl-700)] font-semibold"
                                        : "text-black/70 hover:bg-black/[0.04]"
                                }`
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    {isActive && (
                                        <span
                                            aria-hidden
                                            className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                                            style={{ background: "var(--atl-500)" }}
                                        />
                                    )}
                                    <Icon size={20} strokeWidth={isActive ? 2 : 1.6} />
                                    <span className="tracking-tight">{label}</span>
                                </>
                            )}
                        </NavLink>
                    ))}
                    <NavLink
                        to={`/u/${user?.username}`}
                        onClick={onClose}
                        data-testid="mdrawer-profile"
                        className={({ isActive }) =>
                            `relative flex items-center gap-3.5 px-3.5 py-3 rounded-2xl text-[15px] tap-shrink transition ${
                                isActive
                                    ? "bg-accent-vermillion/10 text-[color:var(--atl-700)] font-semibold"
                                    : "text-black/70 hover:bg-black/[0.04]"
                            }`
                        }
                    >
                        <User size={20} strokeWidth={1.6} />
                        <span className="tracking-tight">Perfil</span>
                    </NavLink>
                </nav>

                {/* Logout */}
                <div className="p-4 hairline-t">
                    <button
                        onClick={() => { logout(); onClose(); }}
                        data-testid="mdrawer-logout"
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-full border border-black/[0.10] text-black/70 hover:bg-red-soft/10 hover:text-red-soft hover:border-red-soft/30 active:scale-[0.98] transition text-[14px] font-medium tracking-tight"
                    >
                        <LogOut size={16} strokeWidth={1.8} /> Terminar sessão
                    </button>
                    <div className="mt-4 flex flex-wrap gap-x-3 gap-y-1.5 text-[11px] text-black/45 justify-center">
                        <a href="/legal" onClick={onClose} className="hover:text-black hover:underline underline-offset-2">Centro Legal</a>
                        <a href="/legal/terms" onClick={onClose} className="hover:text-black hover:underline underline-offset-2">Termos</a>
                        <a href="/legal/privacy" onClick={onClose} className="hover:text-black hover:underline underline-offset-2">Privacidade</a>
                        <a href="/legal/cookies" onClick={onClose} className="hover:text-black hover:underline underline-offset-2">Cookies</a>
                        <a href="/legal/community" onClick={onClose} className="hover:text-black hover:underline underline-offset-2">Diretrizes</a>
                        <a href="/manifesto" onClick={onClose} className="hover:text-black hover:underline underline-offset-2">Manifesto</a>
                    </div>
                </div>
            </aside>
        </div>
    );
}
