import { useEffect, useRef, useState } from "react";
import { NavLink, Link } from "react-router-dom";
import {
    Home, Compass, Flame, Bell, MessageCircle, Bookmark, Users as UsersIcon,
    FileText, Clock, PenSquare, MoreHorizontal, Shield, Coffee,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Avatar } from "./Avatar";
import { VerifiedBadge } from "./VerifiedBadge";
import { api } from "../lib/api";
import { ProfileSidebarMenu } from "./ProfileSidebarMenu";

// Vertical primary nav (social-network standard, X/Bluesky style)
const NAV_ITEMS = [
    { to: "/", label: "Início", icon: Home, testid: "nav-home", end: true },
    { to: "/explore", label: "Explorar", icon: Compass, testid: "nav-explore" },
    { to: "/trending", label: "Tendências", icon: Flame, testid: "nav-trending" },
    { to: "/notifications", label: "Notificações", icon: Bell, testid: "nav-notifications", badgeKey: "notif" },
    { to: "/messages", label: "Mensagens", icon: MessageCircle, testid: "nav-messages", badgeKey: "msg" },
    { to: "/bookmarks", label: "Guardados", icon: Bookmark, testid: "nav-bookmarks" },
    { to: "/communities", label: "Comunidades", icon: UsersIcon, testid: "nav-communities" },
    { to: "/mesas", label: "Mesas", icon: Coffee, testid: "nav-mesas" },
    { to: "/drafts", label: "Rascunhos", icon: FileText, testid: "nav-drafts" },
    { to: "/scheduled", label: "Agendados", icon: Clock, testid: "nav-scheduled" },
];

const ADMIN_NAV = { to: "/admin", label: "Admin", icon: Shield, testid: "nav-admin" };

export function LeftSidebar({ onCompose }) {
    const { user } = useAuth();
    const [counts, setCounts] = useState({ notif: 0, msg: 0 });
    const [draftCount, setDraftCount] = useState(0);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const userBtnRef = useRef(null);

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

    // Draft count for the Publicar CTA badge
    useEffect(() => {
        if (!user?.username) return;
        let alive = true;
        const fetchDrafts = async () => {
            try {
                const r = await api.get("/posts/drafts");
                if (!alive) return;
                const list = Array.isArray(r.data) ? r.data : (r.data?.items || []);
                setDraftCount(list.length || 0);
            } catch {}
        };
        fetchDrafts();
        const id = setInterval(fetchDrafts, 60000);
        return () => { alive = false; clearInterval(id); };
    }, [user?.username]);

    // (profile target navigation now handled via the drawer)

    return (
        <aside
            className="hidden lg:flex flex-col h-[calc(100vh-1.5rem)] sticky top-3 py-3 pr-2"
            data-testid="left-sidebar"
        >
            {/* Logo */}
            <Link
                to="/"
                className="flex items-center gap-2 px-3 py-2 mb-2 tap-shrink shrink-0"
                data-testid="left-sidebar-logo"
            >
                <span className="silver-foil text-[22px] leading-none">◆</span>
                <span className="font-display text-[24px] leading-none tracking-tight text-black">lusorae</span>
            </Link>

            {/* Nav */}
            <nav className="flex flex-col gap-0.5 min-h-0 overflow-y-auto no-scrollbar pr-1">
                {[...NAV_ITEMS, ...(user?.is_admin ? [ADMIN_NAV] : [])].map((item) => {
                    const Icon = item.icon;
                    const badge = item.badgeKey ? counts[item.badgeKey] : 0;
                    return (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.end}
                            data-testid={item.testid}
                            className={({ isActive }) =>
                                `group relative flex items-center gap-3.5 pl-3 pr-4 py-2.5 rounded-full transition-all tap-shrink ${
                                    isActive
                                        ? "bg-black text-white font-semibold"
                                        : "text-black/85 hover:bg-black/[0.05] hover:text-black"
                                }`
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    <span className="relative shrink-0">
                                        <Icon
                                            size={20}
                                            strokeWidth={isActive ? 2.1 : 1.7}
                                            className={isActive ? "text-white" : "text-black/80 group-hover:text-black"}
                                        />
                                        {badge > 0 && (
                                            <span
                                                className={`absolute -top-1.5 -right-2 min-w-[16px] h-[16px] px-1 rounded-full text-[9px] font-mono grid place-items-center text-white ring-2 ${
                                                    isActive ? "ring-black" : "ring-white"
                                                }`}
                                                style={{ background: "var(--coral-500)" }}
                                            >
                                                {badge > 99 ? "99+" : badge}
                                            </span>
                                        )}
                                    </span>
                                    <span className="text-[15px] tracking-tight whitespace-nowrap">
                                        {item.label}
                                    </span>
                                </>
                            )}
                        </NavLink>
                    );
                })}
            </nav>

            {/* Big Publicar — lusorae CTA com indicador de rascunhos */}
            <button
                onClick={onCompose}
                data-testid="left-sidebar-compose"
                aria-label={draftCount > 0 ? `Publicar — ${draftCount} rascunho${draftCount === 1 ? "" : "s"} guardado${draftCount === 1 ? "" : "s"}` : "Publicar"}
                className="btn-vermillion w-full mt-3 mb-3 text-[14px] py-3 flex items-center justify-center gap-2 tracking-tight shrink-0 relative"
            >
                <PenSquare className="relative z-[1]" size={16} strokeWidth={2.2} />
                <span className="relative z-[1]">Publicar</span>
                {draftCount > 0 && (
                    <span
                        data-testid="left-sidebar-compose-draft-dot"
                        className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 px-1.5 rounded-full grid place-items-center text-[10.5px] font-bold font-mono z-[2]"
                        style={{
                            background: "#f7c948",
                            color: "#1a1308",
                            boxShadow: "0 2px 8px rgba(247,201,72,0.55), 0 0 0 2.5px #fff",
                        }}
                        aria-hidden
                    >
                        {draftCount > 9 ? "9+" : draftCount}
                    </span>
                )}
            </button>

            {/* User mini-card — opens the unified profile sidebar drawer */}
            {user && (
                <div className="shrink-0">
                    <button
                        ref={userBtnRef}
                        onClick={() => setDrawerOpen((v) => !v)}
                        data-testid="left-sidebar-user-btn"
                        aria-haspopup="menu"
                        aria-expanded={drawerOpen}
                        aria-label="Abrir menu do perfil"
                        className="w-full flex items-center gap-3 px-2.5 py-2 rounded-full hover:bg-black/[0.05] active:bg-black/[0.08] transition tap-shrink text-left"
                    >
                        <Avatar user={user} size={40} showOnline />
                        <div className="flex-1 min-w-0">
                            <div className="font-heading font-semibold text-[13.5px] tracking-tight text-black truncate flex items-center gap-1">
                                {user.name}
                                {user.verified && <VerifiedBadge size={10} />}
                            </div>
                            <div className="font-mono text-[11px] text-black/45 truncate">@{user.username}</div>
                        </div>
                        <MoreHorizontal size={16} className="text-black/45 shrink-0" />
                    </button>
                </div>
            )}

            {/* The unified profile dropdown menu (rendered via portal) */}
            <ProfileSidebarMenu
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                triggerRef={userBtnRef}
                placement="top"
                align="start"
            />
        </aside>
    );
}
