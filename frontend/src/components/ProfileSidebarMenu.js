import { useEffect, useLayoutEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
    User, Settings, Archive, LogOut, Bookmark, FileText, Clock,
    Shield, ChevronRight, Users as UsersIcon, Coffee, Map as MapIcon,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Avatar } from "./Avatar";
import { VerifiedBadge } from "./VerifiedBadge";
import { PT } from "../theme/editorial";

/**
 * ProfileDropdownMenu  (file kept as "ProfileSidebarMenu" for import compat)
 * ─────────────────────────────────────────────────────────────────────────
 * A floating dropdown menu (NOT a side-drawer) anchored to the profile
 * avatar / user mini-card. Opens on click of the trigger, closes on:
 *   - click outside
 *   - escape key
 *   - route change
 *   - clicking any nav item
 *
 * Holds the unified personal navigation:
 *   • Painel pessoal  (perfil, guardados, rascunhos, agendados)
 *   • Stories         (arquivo de stories)
 *   • Conta           (definições, centro legal)
 *   • Sair da conta
 *
 * Props:
 *   open        bool                — visibility
 *   onClose     () => void          — close handler
 *   triggerRef  React.RefObject     — DOM ref of the trigger element used
 *                                     for anchored positioning
 *   placement   "top" | "bottom"    — preferred direction relative to trigger
 *                                     (default "bottom"; "top" for sidebar mini-card)
 *   align       "start" | "end"     — horizontal alignment to trigger
 *                                     ("start" → left edges align, default)
 */
export function ProfileSidebarMenu({
    open,
    onClose,
    triggerRef,
    placement = "bottom",
    align = "start",
}) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const panelRef = useRef(null);
    const [pos, setPos] = useState({ top: 0, left: 0, ready: false });

    const PANEL_WIDTH = 296;
    const VIEWPORT_PAD = 10;
    const GAP = 8;

    // Position the floating panel relative to its trigger
    const recompute = () => {
        const trig = triggerRef?.current;
        if (!trig) return;
        const r = trig.getBoundingClientRect();
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        // Horizontal
        let left = align === "end" ? r.right - PANEL_WIDTH : r.left;
        left = Math.min(Math.max(VIEWPORT_PAD, left), vw - PANEL_WIDTH - VIEWPORT_PAD);

        // Vertical
        const panelH = panelRef.current?.offsetHeight || 460;
        let top;
        if (placement === "top") {
            top = r.top - panelH - GAP;
            if (top < VIEWPORT_PAD) {
                // not enough space above → flip below
                top = r.bottom + GAP;
            }
        } else {
            top = r.bottom + GAP;
            if (top + panelH > vh - VIEWPORT_PAD) {
                const altTop = r.top - panelH - GAP;
                if (altTop >= VIEWPORT_PAD) top = altTop;
                else top = Math.max(VIEWPORT_PAD, vh - panelH - VIEWPORT_PAD);
            }
        }

        setPos({ top, left, ready: true });
    };

    useLayoutEffect(() => {
        if (!open) {
            setPos((p) => ({ ...p, ready: false }));
            return;
        }
        recompute();
        const onWin = () => recompute();
        window.addEventListener("resize", onWin);
        window.addEventListener("scroll", onWin, true);
        return () => {
            window.removeEventListener("resize", onWin);
            window.removeEventListener("scroll", onWin, true);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, placement, align]);

    // Re-measure once after first paint (so flip with real height works)
    useEffect(() => {
        if (!open) return;
        const id = requestAnimationFrame(() => recompute());
        return () => cancelAnimationFrame(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open]);

    // Click-outside + ESC
    useEffect(() => {
        if (!open) return;
        const onDown = (e) => {
            const panel = panelRef.current;
            const trig = triggerRef?.current;
            if (!panel) return;
            if (panel.contains(e.target)) return;
            if (trig && trig.contains(e.target)) return;
            onClose?.();
        };
        const onKey = (e) => {
            if (e.key === "Escape") onClose?.();
        };
        document.addEventListener("mousedown", onDown);
        document.addEventListener("touchstart", onDown, { passive: true });
        window.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onDown);
            document.removeEventListener("touchstart", onDown);
            window.removeEventListener("keydown", onKey);
        };
    }, [open, onClose, triggerRef]);

    // Close on route change (defensive)
    useEffect(() => {
        if (open) onClose?.();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.pathname]);

    if (!user || !open) return null;

    const profileTo = user?.username ? `/u/${user.username}` : "/";

    const handleLogout = async () => {
        await logout();
        onClose?.();
        navigate("/login");
    };

    const SECTIONS = [
        {
            title: "Painel pessoal",
            items: [
                { to: profileTo, label: "O meu perfil", icon: User, testid: "drawer-profile" },
                { to: "/bookmarks", label: "Guardados", icon: Bookmark, testid: "drawer-bookmarks" },
                { to: "/drafts", label: "Rascunhos", icon: FileText, testid: "drawer-drafts" },
                { to: "/scheduled", label: "Agendados", icon: Clock, testid: "drawer-scheduled" },
            ],
        },
        {
            title: "Descobrir",
            items: [
                { to: "/communities", label: "Comunidades", icon: UsersIcon, testid: "drawer-communities" },
                { to: "/mesas", label: "Mesas", icon: Coffee, testid: "drawer-mesas" },
                { to: "/topologia", label: "Topologia", icon: MapIcon, testid: "drawer-topologia" },
            ],
        },
        {
            title: "Stories",
            items: [
                { to: "/stories/archive", label: "Arquivo de stories", icon: Archive, testid: "drawer-stories-archive" },
            ],
        },
        {
            title: "Conta",
            items: [
                { to: "/settings", label: "Definições", icon: Settings, testid: "drawer-settings" },
                { to: "/legal", label: "Centro legal", icon: Shield, testid: "drawer-legal" },
            ],
        },
    ];

    return createPortal(
        <div
            ref={panelRef}
            role="menu"
            aria-label="Menu do perfil"
            data-testid="profile-sidebar-drawer"
            data-placement={placement}
            style={{
                position: "fixed",
                top: pos.top,
                left: pos.left,
                width: PANEL_WIDTH,
                zIndex: 110,
                opacity: pos.ready ? 1 : 0,
                transform: pos.ready ? "translateY(0) scale(1)" : "translateY(-4px) scale(0.985)",
                transformOrigin: placement === "top" ? "bottom left" : "top left",
                transition: "opacity 160ms ease, transform 160ms ease",
                pointerEvents: pos.ready ? "auto" : "none",
                background: "#fff",
                border: "1px solid rgba(10,10,10,0.08)",
                boxShadow: "0 18px 40px -16px rgba(10,10,10,0.22), 0 4px 10px rgba(10,10,10,0.06)",
                borderRadius: 18,
            }}
            className="overflow-hidden flex flex-col max-h-[min(560px,80vh)]"
        >
            {/* Identity header */}
            <Link
                to={profileTo}
                onClick={onClose}
                data-testid="drawer-identity-card"
                className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-black/[0.02]"
                style={{
                    background: "#fff",
                    borderBottom: "1px solid rgba(10,10,10,0.06)",
                }}
            >
                <Avatar user={user} size={40} showOnline />
                <div className="min-w-0 flex-1">
                    <div className="font-bold text-[14px] tracking-tight truncate flex items-center gap-1.5" style={{ color: PT.ink }}>
                        {user.name}
                        {user.verified && <VerifiedBadge size={10} />}
                    </div>
                    <div className="font-mono text-[11.5px] truncate mt-0.5" style={{ color: "rgba(10,10,10,0.50)" }}>
                        @{user.username}
                    </div>
                </div>
                <ChevronRight size={14} style={{ color: "rgba(10,10,10,0.35)" }} className="shrink-0" />
            </Link>

            {/* Scrollable sections */}
            <div className="flex-1 overflow-y-auto py-1.5 no-scrollbar" style={{ background: "#fff" }}>
                {SECTIONS.map((section, idx) => (
                    <div key={section.title} className={idx > 0 ? "mt-1 pt-1.5" : ""} style={idx > 0 ? { borderTop: "1px solid rgba(10,10,10,0.06)" } : {}}>
                        <p
                            className="px-4 pt-2 pb-1 font-mono font-bold uppercase select-none"
                            style={{ fontSize: 10, letterSpacing: "0.20em", color: "rgba(10,10,10,0.42)" }}
                        >
                            {section.title}
                        </p>
                        <ul className="flex flex-col px-1.5">
                            {section.items.map((item) => {
                                const Icon = item.icon;
                                const active = location.pathname === item.to ||
                                    (item.to !== "/" && location.pathname.startsWith(item.to));
                                return (
                                    <li key={item.to}>
                                        <Link
                                            to={item.to}
                                            onClick={onClose}
                                            data-testid={item.testid}
                                            role="menuitem"
                                            className="flex items-center gap-3 px-3 py-2 transition tap-shrink hover:bg-black/[0.04]"
                                            style={{
                                                background: active ? "rgba(10,10,10,0.06)" : "transparent",
                                                color: active ? PT.ink : "rgba(10,10,10,0.78)",
                                                borderRadius: 10,
                                                fontWeight: active ? 700 : 500,
                                            }}
                                        >
                                            <Icon size={16} strokeWidth={active ? 2.2 : 1.8} className="shrink-0" style={{ color: active ? PT.ink : "rgba(10,10,10,0.55)" }} />
                                            <span className="text-[13.5px] tracking-tight truncate">
                                                {item.label}
                                            </span>
                                        </Link>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                ))}
            </div>

            {/* Logout footer */}
            <div className="px-3 py-3" style={{ background: "#fff", borderTop: "1px solid rgba(10,10,10,0.06)" }}>
                <button
                    onClick={handleLogout}
                    data-testid="drawer-logout"
                    role="menuitem"
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 transition text-[13px] font-semibold tap-shrink"
                    style={{
                        background: "transparent",
                        color: PT.red,
                        border: "1px solid rgba(200,16,46,0.18)",
                        borderRadius: 999,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(200,16,46,0.06)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                    <LogOut size={14} strokeWidth={2.2} /> Sair da conta
                </button>
            </div>
        </div>,
        document.body
    );
}

export default ProfileSidebarMenu;
