import { useEffect, useRef, useState } from "react";
import { NavLink, Link } from "react-router-dom";
import {
    Home, Compass, Bell, MessageCircle, Users as UsersIcon,
    PenSquare, MoreHorizontal, Shield, Settings,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Avatar } from "./Avatar";
import { VerifiedBadge } from "./VerifiedBadge";
import { api } from "../lib/api";
import { ProfileSidebarMenu } from "./ProfileSidebarMenu";
import { PT } from "../theme/editorial";

// =============================================================================
// DESIGN SYSTEM: LUSORAE EDITORIAL — ver /src/theme/EDITORIAL.md
// Left Sidebar (clean editorial, alinhado com a Landing/Auth).
// =============================================================================
//
// Removido (legacy fanzine PT):
//   · sombras 3D offset (`3px 3px 0 ink` / `4px 4px 0 ink`)
//   · stickers rotacionados
//   · text-shadow no logo
//   · pill activo vermelho com sombra dura
//
// Lusorae Editorial:
//   · nav active = pill ink suave (linear-gradient charcoal → black)
//   · CTA Publicar = pill ink premium com soft shadow
//   · perfil card = paper limpo com hairline
//   · kickers mono uppercase com dot pulse
//
// =============================================================================

const NAV_ITEMS = [
    { to: "/feed",          label: "Início",         icon: Home,         testid: "nav-home", end: true },
    { to: "/explore",       label: "Explorar",       icon: Compass,      testid: "nav-explore" },
    { to: "/notifications", label: "Notificações",   icon: Bell,         testid: "nav-notifications", badgeKey: "notif" },
    { to: "/messages",      label: "Mensagens",      icon: MessageCircle,testid: "nav-messages", badgeKey: "msg" },
    { to: "__profile__",    label: "Perfil",         icon: UsersIcon,    testid: "nav-profile" },
    { to: "/settings",      label: "Definições",     icon: Settings,     testid: "nav-settings" },
];

// Itens ocultados no pré-lançamento (mantidos como rotas, fora da nav)
// - Tendências, Guardados, Comunidades, Mesas, Topologia, Calendário,
//   Rascunhos, Agendados, Plus & Aura
// Re-acessíveis via URL directa ou via redes acima de 500 DAU.

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

    const today = new Date().toLocaleDateString("pt-PT", { day: "2-digit", month: "short" }).replace(/\./g, "").toUpperCase();

    return (
        <aside
            className="hidden lg:flex flex-col h-[calc(100vh-1.5rem)] sticky top-3 py-3 pr-2"
            data-testid="left-sidebar"
        >
            {/* Logo — clean wordmark + dot accent */}
            <Link
                to="/feed"
                className="flex items-baseline gap-1.5 px-3 py-2 mb-1 shrink-0 group"
                data-testid="left-sidebar-logo"
            >
                <span
                    className="font-black tracking-[-0.045em] leading-none transition-colors group-hover:text-black/70"
                    style={{ fontSize: 24, color: PT.ink }}
                >
                    lusorae
                </span>
                <span
                    aria-hidden
                    className="inline-block transition-transform group-hover:scale-150"
                    style={{
                        width: 6, height: 6, borderRadius: "50%",
                        background: PT.red, transform: "translateY(-2px)",
                    }}
                />
            </Link>
            <p
                className="px-3 mb-4 inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase shrink-0"
                style={{ color: "rgba(10,10,10,0.42)", letterSpacing: "0.22em" }}
            >
                <span className="relative flex h-1.5 w-1.5" aria-hidden>
                    <span className="absolute inline-flex h-full w-full rounded-full lusorae-pulse" style={{ background: PT.red }} />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: PT.red }} />
                </span>
                Edição · {today}
            </p>

            {/* Nav */}
            <nav className="flex flex-col gap-0.5 min-h-0 overflow-y-auto no-scrollbar pr-1">
                {[...NAV_ITEMS, ...(user?.is_admin ? [ADMIN_NAV] : [])].map((item) => {
                    const Icon = item.icon;
                    const badge = item.badgeKey ? counts[item.badgeKey] : 0;
                    // resolve link dinâmico do perfil
                    const to = item.to === "__profile__"
                        ? (user?.username ? `/u/${user.username}` : "/settings")
                        : item.to;

                    return (
                        <NavLink
                            key={item.testid}
                            to={to}
                            end={item.end}
                            data-testid={item.testid}
                            className="group relative flex items-center gap-3.5 pl-3 pr-4 py-2.5 rounded-full transition-all duration-200 tap-shrink"
                            style={({ isActive }) => ({
                                background: isActive
                                    ? "linear-gradient(135deg, #2a2a2e 0%, #18181b 50%, #050505 100%)"
                                    : "transparent",
                                color: isActive ? "#fff" : "rgba(10,10,10,0.78)",
                                boxShadow: isActive ? "0 6px 16px -8px rgba(10,10,10,0.45), inset 0 1px 0 rgba(255,255,255,0.08)" : "none",
                            })}
                            onMouseEnter={(e) => {
                                if (!e.currentTarget.getAttribute("aria-current")) {
                                    e.currentTarget.style.background = "rgba(10,10,10,0.045)";
                                    e.currentTarget.style.color = PT.ink;
                                }
                            }}
                            onMouseLeave={(e) => {
                                if (!e.currentTarget.getAttribute("aria-current")) {
                                    e.currentTarget.style.background = "transparent";
                                    e.currentTarget.style.color = "rgba(10,10,10,0.78)";
                                }
                            }}
                        >
                            {({ isActive }) => (
                                <>
                                    <span className="relative shrink-0">
                                        <Icon
                                            size={20}
                                            strokeWidth={isActive ? 2.2 : 1.75}
                                            style={{ color: isActive ? "#fff" : "currentColor" }}
                                        />
                                        {/* Premium tiny gold dot for Plus & Aura */}
                                        {item.isPremium && !isActive && (
                                            <span
                                                aria-hidden
                                                className="absolute -top-0.5 -right-0.5"
                                                style={{
                                                    width: 6, height: 6, borderRadius: "50%",
                                                    background: PT.gold,
                                                    boxShadow: "0 0 0 1.5px #fff",
                                                }}
                                            />
                                        )}
                                        {badge > 0 && (
                                            <span
                                                className="absolute -top-1.5 -right-2 min-w-[16px] h-[16px] px-1 rounded-full text-[9px] font-bold font-mono grid place-items-center"
                                                style={{
                                                    background: PT.red,
                                                    color: "#fff",
                                                    border: isActive ? `1.5px solid ${PT.ink}` : `1.5px solid #fff`,
                                                    letterSpacing: "0.02em",
                                                }}
                                            >
                                                {badge > 99 ? "99+" : badge}
                                            </span>
                                        )}
                                    </span>
                                    <span
                                        className="text-[14.5px] tracking-tight whitespace-nowrap"
                                        style={{ fontWeight: isActive ? 700 : 500 }}
                                    >
                                        {item.label}
                                    </span>
                                </>
                            )}
                        </NavLink>
                    );
                })}
            </nav>

            {/* Publicar — pill premium ink */}
            <button
                onClick={onCompose}
                data-testid="left-sidebar-compose"
                aria-label={draftCount > 0 ? `Publicar — ${draftCount} rascunho${draftCount === 1 ? "" : "s"} guardado${draftCount === 1 ? "" : "s"}` : "Publicar"}
                className="w-full mt-4 mb-3 py-3 flex items-center justify-center gap-2 shrink-0 relative font-bold text-[14px] rounded-full transition-all duration-200 hover:translate-y-[-1px] active:translate-y-0"
                style={{
                    background: `linear-gradient(180deg, #1f1f1f 0%, ${PT.ink} 100%)`,
                    color: "#fff",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.12), 0 12px 28px -10px rgba(10,10,10,0.4), 0 3px 8px rgba(10,10,10,0.08)",
                    letterSpacing: "-0.01em",
                }}
            >
                <PenSquare size={15} strokeWidth={2.4} />
                <span>Publicar</span>
                {draftCount > 0 && (
                    <span
                        data-testid="left-sidebar-compose-draft-dot"
                        className="absolute -top-1.5 -right-1.5 min-w-[22px] h-[22px] px-1.5 grid place-items-center text-[10.5px] font-bold font-mono"
                        style={{
                            background: PT.gold,
                            color: PT.ink,
                            borderRadius: 999,
                            border: "2px solid #fff",
                            boxShadow: "0 4px 8px -2px rgba(10,10,10,0.25)",
                        }}
                        aria-hidden
                    >
                        {draftCount > 9 ? "9+" : draftCount}
                    </span>
                )}
            </button>

            {/* User mini-card — clean editorial */}
            {user && (
                <div className="shrink-0 mt-1">
                    <p
                        className="px-3 mb-1.5 font-mono text-[10px] font-bold uppercase"
                        style={{ color: "rgba(10,10,10,0.42)", letterSpacing: "0.22em" }}
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
                        className="w-full flex items-center gap-3 px-2.5 py-2.5 rounded-2xl transition-all duration-200 text-left hover:bg-black/[0.025]"
                        style={{
                            background: "#fff",
                            border: "1px solid rgba(10,10,10,0.08)",
                            boxShadow: "0 1px 2px rgba(10,10,10,0.03), 0 4px 12px -6px rgba(10,10,10,0.06)",
                        }}
                    >
                        <Avatar user={user} size={38} showOnline />
                        <div className="flex-1 min-w-0">
                            <div className="font-bold text-[13.5px] tracking-tight truncate flex items-center gap-1" style={{ color: PT.ink }}>
                                {user.name}
                                {user.verified && <VerifiedBadge size={10} />}
                            </div>
                            <div className="font-mono text-[10.5px] truncate" style={{ color: "rgba(10,10,10,0.5)" }}>@{user.username}</div>
                        </div>
                        <MoreHorizontal size={16} className="shrink-0" style={{ color: "rgba(10,10,10,0.45)" }} />
                    </button>
                </div>
            )}

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
