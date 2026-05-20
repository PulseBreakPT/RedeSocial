/**
 * AdminLayout — Chrome minimalista e dedicado ao painel administrativo.
 *
 * Difere do Layout principal em:
 *  • SEM sidebar social, SEM bottom-nav mobile, SEM RightSidebar, SEM CTA "Publicar".
 *  • Top bar enxuto com logo + título "Admin" + menu de perfil reduzido.
 *  • Profile menu mostra apenas: "Voltar à app" + "Logout do painel".
 *  • 100% responsive: o top bar colapsa para mobile e o conteúdo (Admin.js) ocupa
 *    a largura completa.
 */
import React, { useEffect, useRef, useState } from "react";
import { Outlet, Link, useNavigate } from "react-router-dom";
import { Shield, LogOut, Home as HomeIcon, ChevronDown, Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { Avatar } from "./Avatar";
import { VerifiedBadge } from "./VerifiedBadge";

function AdminProfileMenu({ user }) {
    const [open, setOpen] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);
    const wrapRef = useRef(null);
    const navigate = useNavigate();
    const { logout } = useAuth();

    useEffect(() => {
        if (!open) return undefined;
        const onPointer = (e) => {
            if (!wrapRef.current || wrapRef.current.contains(e.target)) return;
            setOpen(false);
        };
        const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
        document.addEventListener("pointerdown", onPointer, true);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("pointerdown", onPointer, true);
            document.removeEventListener("keydown", onKey);
        };
    }, [open]);

    const doLogout = async () => {
        setLoggingOut(true);
        try {
            await logout();
        } finally {
            setLoggingOut(false);
            navigate("/login", { replace: true });
        }
    };

    return (
        <div className="relative" ref={wrapRef}>
            <button
                onClick={() => setOpen((v) => !v)}
                data-testid="admin-profile-btn"
                aria-haspopup="menu"
                aria-expanded={open}
                aria-label="Menu do admin"
                className="flex items-center gap-2 pl-1 pr-2 sm:pr-3 py-1 rounded-full hover:bg-black/[0.05] active:bg-black/[0.08] transition"
            >
                <Avatar user={user} size={30} />
                <div className="hidden sm:flex flex-col items-start leading-tight min-w-0 max-w-[140px]">
                    <div className="font-heading font-semibold text-[12.5px] tracking-tight text-black truncate flex items-center gap-0.5">
                        {user.name || user.username}
                        {user.verified && <VerifiedBadge size={9} />}
                    </div>
                    <div className="font-mono text-[10px] text-black/45 truncate">@{user.username}</div>
                </div>
                <ChevronDown size={13} className="text-black/45 shrink-0" />
            </button>

            {open && (
                <div
                    role="menu"
                    data-testid="admin-profile-menu"
                    className="absolute right-0 top-[calc(100%+6px)] w-56 rounded-2xl bg-white border border-black/[0.08] shadow-xl overflow-hidden z-50"
                >
                    <div className="px-3 py-2.5 border-b border-black/[0.06]">
                        <div className="font-heading font-semibold text-[13px] tracking-tight truncate flex items-center gap-1">
                            {user.name || user.username}
                            {user.verified && <VerifiedBadge size={10} />}
                        </div>
                        <div className="font-mono text-[10.5px] text-black/45 truncate">@{user.username}</div>
                    </div>
                    <button
                        onClick={() => { setOpen(false); navigate("/"); }}
                        data-testid="admin-menu-back-to-app"
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-[13px] text-black/85 hover:bg-black/[0.04] transition"
                    >
                        <HomeIcon size={15} className="text-black/55" />
                        <span>Voltar à app</span>
                    </button>
                    <button
                        onClick={doLogout}
                        disabled={loggingOut}
                        data-testid="admin-menu-logout"
                        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-[13px] text-red-600 hover:bg-red-500/[0.06] transition disabled:opacity-50 border-t border-black/[0.04]"
                    >
                        {loggingOut ? <Loader2 size={15} className="animate-spin" /> : <LogOut size={15} />}
                        <span>Terminar sessão</span>
                    </button>
                </div>
            )}
        </div>
    );
}

export function AdminLayout() {
    const { user, checking } = useAuth();

    // Bloqueia scroll do body se algum modal global estiver aberto via classe no body;
    // o painel já gere o seu próprio scroll dentro de <main>.
    useEffect(() => {
        document.body.classList.add("admin-mode");
        return () => document.body.classList.remove("admin-mode");
    }, []);

    if (checking) {
        return (
            <div className="min-h-screen flex items-center justify-center text-black/45">
                <Loader2 className="animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#fafafa]" data-testid="admin-layout">
            <header
                className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-black/[0.07]"
                data-testid="admin-topbar"
            >
                <div className="max-w-5xl mx-auto px-2.5 sm:px-5 h-14 flex items-center gap-1.5 sm:gap-3">
                    <Link
                        to="/admin"
                        className="flex items-center gap-2 shrink-0 group"
                        data-testid="admin-topbar-logo"
                        aria-label="Painel administrativo"
                    >
                        <span className="w-8 h-8 rounded-xl bg-black text-white grid place-items-center shrink-0">
                            <Shield size={15} />
                        </span>
                        <div className="flex flex-col leading-none">
                            <span className="font-display text-[15px] sm:text-[18px] tracking-tight">Admin</span>
                            <span className="font-mono text-[9.5px] text-black/45 uppercase tracking-wider hidden sm:block">
                                lusorae · painel
                            </span>
                        </div>
                    </Link>

                    <div className="flex-1 min-w-0" />

                    <Link
                        to="/"
                        className="hidden sm:inline-flex h-9 px-3 rounded-full text-[12.5px] font-medium text-black/70 hover:bg-black/[0.05] items-center gap-1.5"
                        data-testid="admin-topbar-back-to-app"
                        title="Voltar à rede social"
                    >
                        <HomeIcon size={14} /> App
                    </Link>

                    {user && <AdminProfileMenu user={user} />}
                </div>
            </header>

            <main className="w-full" data-testid="admin-main">
                <Outlet />
            </main>
        </div>
    );
}

export default AdminLayout;
