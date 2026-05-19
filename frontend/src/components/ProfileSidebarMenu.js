import { useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
    X, User, Settings, Archive, LogOut, Bookmark, FileText, Clock,
    Shield, ChevronRight,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Avatar } from "./Avatar";
import { VerifiedBadge } from "./VerifiedBadge";

/**
 * ProfileSidebarMenu
 * ──────────────────
 * Left-side slide-in drawer that opens when the profile avatar is pressed.
 * Holds the user's "painel pessoal" (perfil), arquivo de stories, definições
 * e ações de conta (sair). Designed to be the single canonical entry point
 * for personal navigation — pulled out of the LeftSidebar's main nav and
 * the bottom-anchored popup so there is exactly one way to reach them.
 *
 * Props:
 *   open      bool      — controls visibility
 *   onClose   ()=>void  — close handler (backdrop click, escape, X, item nav)
 */
export function ProfileSidebarMenu({ open, onClose }) {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Body scroll lock + ESC to close
    useEffect(() => {
        if (!open) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        const onKey = (e) => {
            if (e.key === "Escape") onClose?.();
        };
        window.addEventListener("keydown", onKey);
        return () => {
            document.body.style.overflow = prev;
            window.removeEventListener("keydown", onKey);
        };
    }, [open, onClose]);

    // Close drawer on route change (defensive — every item already calls onClose)
    useEffect(() => {
        if (open) onClose?.();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.pathname]);

    if (!user) return null;

    const profileTo = user?.username ? `/u/${user.username}` : "/";

    const handleLogout = async () => {
        await logout();
        onClose?.();
        navigate("/login");
    };

    // Main organized sections
    const SECTIONS = [
        {
            title: "Painel pessoal",
            items: [
                { to: profileTo, label: "O meu perfil", icon: User, testid: "drawer-profile",
                  helper: `@${user.username}` },
                { to: "/bookmarks", label: "Guardados", icon: Bookmark, testid: "drawer-bookmarks",
                  helper: "Posts que marcaste" },
                { to: "/drafts", label: "Rascunhos", icon: FileText, testid: "drawer-drafts",
                  helper: "Por publicar" },
                { to: "/scheduled", label: "Agendados", icon: Clock, testid: "drawer-scheduled",
                  helper: "A publicar mais tarde" },
            ],
        },
        {
            title: "Stories",
            items: [
                { to: "/stories/archive", label: "Arquivo de stories", icon: Archive, testid: "drawer-stories-archive",
                  helper: "Histórico dos teus stories" },
            ],
        },
        {
            title: "Conta",
            items: [
                { to: "/settings", label: "Definições", icon: Settings, testid: "drawer-settings",
                  helper: "Privacidade, segurança, conta" },
                { to: "/legal", label: "Centro legal", icon: Shield, testid: "drawer-legal",
                  helper: "Termos, privacidade, cookies" },
            ],
        },
    ];

    return (
        <>
            {/* Backdrop */}
            <div
                onClick={onClose}
                aria-hidden
                data-testid="drawer-backdrop"
                className={`fixed inset-0 z-[100] bg-black/35 backdrop-blur-[2px] transition-opacity duration-200 ${
                    open ? "opacity-100" : "opacity-0 pointer-events-none"
                }`}
            />

            {/* Drawer */}
            <aside
                role="dialog"
                aria-modal="true"
                aria-label="Menu do perfil"
                data-testid="profile-sidebar-drawer"
                className={`fixed top-0 left-0 z-[101] h-full w-[320px] max-w-[88vw] bg-white shadow-[0_40px_100px_-10px_rgba(13,13,16,0.45)] border-r border-black/[0.08] flex flex-col transform transition-transform duration-300 ease-out pt-safe pb-safe ${
                    open ? "translate-x-0" : "-translate-x-full"
                }`}
            >
                {/* Header — identity card */}
                <div className="relative px-5 pt-5 pb-4 hairline-b bg-paper grain isolate">
                    <button
                        onClick={onClose}
                        data-testid="drawer-close"
                        aria-label="Fechar menu"
                        className="absolute top-3.5 right-3.5 w-9 h-9 rounded-full grid place-items-center hover:bg-black/[0.06] active:bg-black/[0.10] text-black/55 transition"
                    >
                        <X size={16} strokeWidth={1.8} />
                    </button>

                    <Link
                        to={profileTo}
                        onClick={onClose}
                        data-testid="drawer-identity-card"
                        className="flex items-center gap-3 pr-9 tap-shrink"
                    >
                        <Avatar user={user} size={52} showOnline />
                        <div className="min-w-0 flex-1">
                            <div className="font-heading font-semibold text-[15.5px] tracking-tight text-black truncate flex items-center gap-1.5">
                                {user.name}
                                {user.verified && <VerifiedBadge size={11} />}
                            </div>
                            <div className="font-mono text-[11.5px] text-black/50 truncate mt-0.5">
                                @{user.username}
                            </div>
                        </div>
                    </Link>

                    <Link
                        to={profileTo}
                        onClick={onClose}
                        data-testid="drawer-view-profile"
                        className="mt-3.5 inline-flex items-center gap-1.5 text-[12px] font-mono uppercase tracking-[0.10em] text-black/60 hover:text-black transition"
                    >
                        Ver perfil completo <ChevronRight size={12} />
                    </Link>
                </div>

                {/* Scrollable sections */}
                <nav className="flex-1 overflow-y-auto px-2 py-3 no-scrollbar">
                    {SECTIONS.map((section, idx) => (
                        <div key={section.title} className={idx > 0 ? "mt-1.5 pt-2 hairline-t" : ""}>
                            <p className="px-3 pt-1 pb-1.5 text-[10.5px] uppercase tracking-[0.14em] font-mono text-black/40 select-none">
                                {section.title}
                            </p>
                            <ul className="flex flex-col">
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
                                                className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all tap-shrink ${
                                                    active
                                                        ? "bg-black/[0.05] text-black"
                                                        : "text-black/85 hover:bg-black/[0.04] hover:text-black"
                                                }`}
                                            >
                                                <span className="shrink-0 w-9 h-9 rounded-full grid place-items-center bg-black/[0.04] group-hover:bg-black/[0.07] transition">
                                                    <Icon size={16} strokeWidth={1.75} className="text-black/75" />
                                                </span>
                                                <span className="min-w-0 flex-1">
                                                    <span className="block text-[14px] font-medium leading-tight">
                                                        {item.label}
                                                    </span>
                                                    {item.helper && (
                                                        <span className="block text-[11px] text-black/45 mt-0.5 truncate">
                                                            {item.helper}
                                                        </span>
                                                    )}
                                                </span>
                                                <ChevronRight size={14} className="text-black/30 group-hover:text-black/55 shrink-0 transition" />
                                            </Link>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ))}
                </nav>

                {/* Footer — logout */}
                <div className="px-3 py-3 hairline-t bg-white">
                    <button
                        onClick={handleLogout}
                        data-testid="drawer-logout"
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border border-black/[0.10] hover:border-coral-300 hover:bg-coral-50/60 transition text-[13.5px] font-medium tap-shrink"
                        style={{ color: "var(--coral-500)" }}
                    >
                        <LogOut size={15} strokeWidth={1.9} /> Sair da conta
                    </button>
                    <p className="mt-2.5 text-center text-[10.5px] text-black/35 font-mono tracking-wider uppercase">
                        © lusorae · {new Date().getFullYear()}
                    </p>
                </div>
            </aside>
        </>
    );
}

export default ProfileSidebarMenu;
