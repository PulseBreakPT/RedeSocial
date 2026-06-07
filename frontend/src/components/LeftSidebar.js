import { useEffect, useRef, useState } from "react";
import { NavLink, Link } from "react-router-dom";
import {
    Home, Compass, Flame, Bell, MessageCircle, Bookmark, Users as UsersIcon,
    FileText, Clock, PenSquare, MoreHorizontal, Shield, Coffee, Map as MapIcon,
    Sparkles, CalendarDays,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Avatar } from "./Avatar";
import { VerifiedBadge } from "./VerifiedBadge";
import { api } from "../lib/api";
import { ProfileSidebarMenu } from "./ProfileSidebarMenu";
import { PT } from "../pages/auth/AuthDecor";

// Vertical primary nav (social-network standard, X/Bluesky style)
const NAV_ITEMS = [
    { to: "/feed", label: "Início", icon: Home, testid: "nav-home", end: true },
    { to: "/explore", label: "Explorar", icon: Compass, testid: "nav-explore" },
    { to: "/trending", label: "Tendências", icon: Flame, testid: "nav-trending" },
    { to: "/notifications", label: "Notificações", icon: Bell, testid: "nav-notifications", badgeKey: "notif" },
    { to: "/messages", label: "Mensagens", icon: MessageCircle, testid: "nav-messages", badgeKey: "msg" },
    { to: "/bookmarks", label: "Guardados", icon: Bookmark, testid: "nav-bookmarks" },
    { to: "/communities", label: "Comunidades", icon: UsersIcon, testid: "nav-communities" },
    { to: "/mesas", label: "Mesas", icon: Coffee, testid: "nav-mesas" },
    { to: "/topologia", label: "Topologia", icon: MapIcon, testid: "nav-topologia" },
    { to: "/calendario", label: "Calendário", icon: CalendarDays, testid: "nav-calendario" },
    { to: "/drafts", label: "Rascunhos", icon: FileText, testid: "nav-drafts" },
    { to: "/scheduled", label: "Agendados", icon: Clock, testid: "nav-scheduled" },
    { to: "/premium", label: "Plus & Aura", icon: Sparkles, testid: "nav-premium" },
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
            {/* Logo — asterisco PT vermelho + wordmark */}
            <Link
                to="/feed"
                className="flex items-center gap-2.5 px-3 py-2 mb-1 tap-shrink shrink-0 group"
                data-testid="left-sidebar-logo"
            >
                <span
                    className="font-black text-[24px] leading-none transition-transform group-hover:rotate-[18deg]"
                    style={{ color: PT.red, textShadow: `2px 2px 0 ${PT.ink}` }}
                    aria-hidden
                >
                    ✱
                </span>
                <span className="font-display text-[24px] leading-none tracking-tight text-black">lusorae</span>
            </Link>
            <p
                className="px-3 mb-3 text-[9.5px] font-black uppercase shrink-0"
                style={{ color: "rgba(10,10,10,0.45)", letterSpacing: "0.22em" }}
            >
                Edição · {new Date().toLocaleDateString("pt-PT", { day: "2-digit", month: "short" }).toUpperCase()}
            </p>

            {/* Nav */}
            <nav className="flex flex-col gap-0.5 min-h-0 overflow-y-auto no-scrollbar pr-1">
                {[...NAV_ITEMS, ...(user?.is_admin ? [ADMIN_NAV] : [])].map((item) => {
                    const Icon = item.icon;
                    const badge = item.badgeKey ? counts[item.badgeKey] : 0;
                    const isPremiumLink = item.to === "/premium";

                    return (
                        <NavLink
                            key={item.to}
                            to={item.to}
                            end={item.end}
                            data-testid={item.testid}
                            className={({ isActive }) => {
                                if (isPremiumLink) {
                                    return `group relative flex items-center gap-3.5 pl-3 pr-4 py-2.5 rounded-full transition-all tap-shrink ${
                                        isActive ? "text-black font-black" : "text-black/85 hover:text-black"
                                    }`;
                                }
                                return `group relative flex items-center gap-3.5 pl-3 pr-4 py-2.5 rounded-full transition-all tap-shrink ${
                                    isActive
                                        ? "text-white font-black"
                                        : "text-black/85 hover:text-black"
                                }`;
                            }}
                            style={({ isActive }) =>
                                isPremiumLink
                                    ? {
                                          background: isActive
                                              ? `linear-gradient(135deg, ${PT.gold}, #FFD740, ${PT.gold})`
                                              : "rgba(255, 204, 0, 0.14)",
                                          border: isActive ? `2px solid ${PT.ink}` : "2px solid transparent",
                                          boxShadow: isActive ? `3px 3px 0 ${PT.ink}` : "none",
                                      }
                                    : isActive
                                    ? { background: PT.red, boxShadow: `3px 3px 0 ${PT.ink}` }
                                    : { background: "transparent" }
                            }
                            onMouseEnter={(e) => {
                                if (!e.currentTarget.classList.contains("active") && !isPremiumLink) {
                                    e.currentTarget.style.background = PT.bone;
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (e.currentTarget.style.background === "rgb(237, 237, 236)") {
                                    e.currentTarget.style.background = "transparent";
                                }
                            }}
                        >
                            {({ isActive }) => (
                                <>
                                    <span className="relative shrink-0">
                                        <Icon
                                            size={20}
                                            strokeWidth={isActive ? 2.4 : 1.8}
                                            className={
                                                isPremiumLink
                                                    ? (isActive ? "text-black" : "")
                                                    : (isActive ? "text-white" : "text-black/80 group-hover:text-black")
                                            }
                                            style={isPremiumLink && !isActive ? { color: PT.ink } : {}}
                                        />
                                        {badge > 0 && (
                                            <span
                                                className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] px-1 rounded-full text-[9px] font-black font-mono grid place-items-center text-white ring-2"
                                                style={{
                                                    background: PT.red,
                                                    ringColor: isActive ? PT.ink : "#fff",
                                                    border: isActive ? `1.5px solid ${PT.ink}` : `1.5px solid #fff`,
                                                }}
                                            >
                                                {badge > 99 ? "99+" : badge}
                                            </span>
                                        )}
                                    </span>
                                    <span className="text-[14.5px] tracking-tight whitespace-nowrap">
                                        {item.label}
                                    </span>
                                </>
                            )}
                        </NavLink>
                    );
                })}
            </nav>

            {/* Big Publicar — stamp PT vermelho com sombra preta sólida */}
            <button
                onClick={onCompose}
                data-testid="left-sidebar-compose"
                aria-label={draftCount > 0 ? `Publicar — ${draftCount} rascunho${draftCount === 1 ? "" : "s"} guardado${draftCount === 1 ? "" : "s"}` : "Publicar"}
                className="w-full mt-4 mb-3 py-3 flex items-center justify-center gap-2 tracking-tight shrink-0 relative font-black uppercase text-[13.5px] transition-all hover:translate-x-[-1px] hover:translate-y-[-1px] active:translate-x-0 active:translate-y-0"
                style={{
                    background: PT.red,
                    color: "#fff",
                    border: `2.5px solid ${PT.ink}`,
                    borderRadius: "999px",
                    boxShadow: `4px 4px 0 ${PT.ink}`,
                    letterSpacing: "0.06em",
                }}
            >
                <PenSquare className="relative z-[1]" size={15} strokeWidth={2.6} />
                <span className="relative z-[1]">Publicar</span>
                {draftCount > 0 && (
                    <span
                        data-testid="left-sidebar-compose-draft-dot"
                        className="absolute -top-2 -right-1.5 min-w-[22px] h-[22px] px-1.5 grid place-items-center text-[11px] font-black font-mono z-[2]"
                        style={{
                            background: PT.gold,
                            color: PT.ink,
                            border: `2px solid ${PT.ink}`,
                            borderRadius: "999px",
                            transform: "rotate(8deg)",
                            boxShadow: `2px 2px 0 ${PT.ink}`,
                        }}
                        aria-hidden
                    >
                        {draftCount > 9 ? "9+" : draftCount}
                    </span>
                )}
            </button>

            {/* User mini-card — opens profile drawer */}
            {user && (
                <div className="shrink-0 mt-1">
                    <p
                        className="px-3 mb-1 text-[9px] font-black uppercase"
                        style={{ color: "rgba(10,10,10,0.4)", letterSpacing: "0.22em" }}
                    >
                        Perfil
                    </p>
                    <button
                        ref={userBtnRef}
                        onClick={() => setDrawerOpen((v) => !v)}
                        data-testid="left-sidebar-user-btn"
                        aria-haspopup="menu"
                        aria-expanded={drawerOpen}
                        aria-label="Abrir menu do perfil"
                        className="w-full flex items-center gap-3 px-2.5 py-2 rounded-2xl active:translate-y-px transition tap-shrink text-left"
                        style={{
                            background: PT.bone,
                            border: `2px solid ${PT.ink}`,
                            boxShadow: `3px 3px 0 ${PT.ink}`,
                        }}
                    >
                        <Avatar user={user} size={38} showOnline />
                        <div className="flex-1 min-w-0">
                            <div className="font-heading font-black text-[13.5px] tracking-tight text-black truncate flex items-center gap-1">
                                {user.name}
                                {user.verified && <VerifiedBadge size={10} />}
                            </div>
                            <div className="font-mono text-[10.5px] text-black/55 truncate">@{user.username}</div>
                        </div>
                        <MoreHorizontal size={16} className="text-black/55 shrink-0" />
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
