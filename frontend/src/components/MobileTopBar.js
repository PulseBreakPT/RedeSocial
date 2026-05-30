import { Link, useNavigate, useLocation } from "react-router-dom";
import { Bell, Search, MessageCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Avatar } from "./Avatar";
import { ProfileSidebarMenu } from "./ProfileSidebarMenu";
import { HeaderLiveDot } from "./HeaderLiveDot";
import { PT } from "../pages/auth/AuthDecor";

export function MobileTopBar({ onOpenChat }) {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [unread, setUnread] = useState(0);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const avatarBtnRef = useRef(null);

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

    const iconBtnStyle = (active) => ({
        background: active ? PT.ink : "rgba(255,255,255,0.6)",
        color: active ? PT.gold : PT.ink,
        border: `2px solid ${PT.ink}`,
        boxShadow: active ? `2px 2px 0 ${PT.red}` : `2px 2px 0 ${PT.ink}`,
        borderRadius: 999,
    });

    return (
        <header
            className="lg:hidden sticky top-0 z-40 pt-safe"
            data-testid="mobile-topbar"
            style={{
                background: "rgba(255,244,220,0.95)",
                backdropFilter: "blur(8px)",
                borderBottom: `2.5px solid ${PT.ink}`,
            }}
        >
            <div className="flex items-center gap-2.5 px-3.5 h-[var(--mobile-topbar-h)]">
                <button
                    ref={avatarBtnRef}
                    type="button"
                    onClick={() => setDrawerOpen((v) => !v)}
                    aria-label="Abrir menu do perfil"
                    aria-haspopup="menu"
                    aria-expanded={drawerOpen}
                    data-testid="mobile-topbar-avatar"
                    className="tap-shrink p-0.5 shrink-0"
                    style={{
                        background: "transparent",
                        borderRadius: 999,
                    }}
                >
                    <span
                        className="block"
                        style={{
                            border: `2px solid ${PT.ink}`,
                            boxShadow: `2px 2px 0 ${PT.ink}`,
                            borderRadius: 999,
                            padding: 0,
                        }}
                    >
                        <Avatar user={user} size={30} showOnline />
                    </span>
                </button>

                <Link to="/feed" className="flex items-baseline gap-1 mr-auto tap-shrink" data-testid="mobile-topbar-logo">
                    <span aria-hidden style={{ color: PT.red, fontSize: 18, fontWeight: 900, lineHeight: 1 }}>✱</span>
                    <span className="font-black tracking-tight" style={{ fontSize: 19, color: PT.ink, lineHeight: 1 }}>
                        lusorae
                    </span>
                    <HeaderLiveDot className="ml-1" />
                </Link>

                <button
                    onClick={() => navigate("/explore")}
                    className="w-9 h-9 grid place-items-center tap-shrink transition"
                    style={iconBtnStyle(isExplore)}
                    aria-label="buscar"
                    data-testid="mobile-search-btn"
                >
                    <Search size={16} strokeWidth={2.2} />
                </button>
                <button
                    onClick={() => onOpenChat && onOpenChat()}
                    className="w-9 h-9 grid place-items-center tap-shrink transition"
                    style={iconBtnStyle(false)}
                    aria-label="chats"
                    data-testid="mobile-chat-btn"
                >
                    <MessageCircle size={16} strokeWidth={2.2} />
                </button>
                <button
                    onClick={() => navigate("/notifications")}
                    data-testid="mobile-notif-btn"
                    className="relative w-9 h-9 grid place-items-center tap-shrink transition"
                    style={iconBtnStyle(isNotif)}
                    aria-label="notificações"
                >
                    <Bell size={16} strokeWidth={2.2} />
                    {unread > 0 && (
                        <span
                            className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 grid place-items-center font-black font-mono"
                            style={{
                                background: PT.red,
                                color: "#fff",
                                border: `1.5px solid ${PT.ink}`,
                                borderRadius: 999,
                                fontSize: 9,
                                letterSpacing: "0.02em",
                            }}
                        >
                            {unread > 99 ? "99+" : unread}
                        </span>
                    )}
                </button>
            </div>

            <ProfileSidebarMenu
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                triggerRef={avatarBtnRef}
                placement="bottom"
                align="start"
            />
        </header>
    );
}
