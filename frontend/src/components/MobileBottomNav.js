import { NavLink, useNavigate } from "react-router-dom";
import { Home, Compass, MessageCircle, User, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

const navItems = [
    { to: "/", icon: Home, testid: "mnav-home", end: true, label: "Início" },
    { to: "/explore", icon: Compass, testid: "mnav-explore", label: "Explorar" },
    { to: null, icon: Plus, testid: "mnav-compose", center: true },
    { to: "/messages", icon: MessageCircle, testid: "mnav-messages", label: "DMs", badgeKey: "msg" },
    { to: "/profile", icon: User, testid: "mnav-profile", label: "Perfil" },
];

export function MobileBottomNav({ onCompose }) {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [msgCount, setMsgCount] = useState(0);

    useEffect(() => {
        const tick = async () => {
            try {
                const m = await api.get("/messages/unread-count");
                setMsgCount(m.data.count);
            } catch {}
        };
        tick();
        const id = setInterval(tick, 8000);
        return () => clearInterval(id);
    }, []);

    return (
        <nav
            className="lg:hidden fixed bottom-0 inset-x-0 z-40 glass-deep border-t border-black/[0.07] pb-safe"
            data-testid="mobile-bottom-nav"
        >
            <div className="grid grid-cols-5 items-center h-[68px] px-1.5">
                {navItems.map((it, idx) => {
                    const Icon = it.icon;
                    if (it.center) {
                        return (
                            <div key={idx} className="flex items-center justify-center">
                                <button
                                    onClick={onCompose}
                                    data-testid={it.testid}
                                    className="-mt-7 w-14 h-14 rounded-full text-white grid place-items-center active:scale-90 transition ring-[6px] ring-white"
                                    style={{
                                        background: "linear-gradient(135deg, #4a7bbf 0%, #6a91cc 45%, #df8a7d 100%)",
                                        boxShadow: "0 14px 32px -10px rgba(74,123,191,0.40), 0 6px 18px -10px rgba(223,138,125,0.35), inset 0 1px 0 rgba(255,255,255,0.18)",
                                    }}
                                    aria-label="Nova publicação"
                                >
                                    <Icon size={24} strokeWidth={2.2} />
                                </button>
                            </div>
                        );
                    }
                    if (it.to === "/profile" && !user?.username) {
                        return (
                            <button
                                key={idx}
                                onClick={() => navigate("/login")}
                                className="flex flex-col items-center justify-center gap-0.5 h-full text-black active:scale-95 transition"
                            >
                                <Icon size={22} strokeWidth={1.9} />
                                <span className="text-[10px] tracking-tight font-medium">{it.label}</span>
                            </button>
                        );
                    }
                    const to = it.to === "/profile" ? `/u/${user?.username}` : it.to;
                    const isMsg = it.badgeKey === "msg";
                    return (
                        <NavLink
                            key={idx}
                            to={to}
                            end={it.end}
                            data-testid={it.testid}
                            className={({ isActive }) =>
                                `relative flex flex-col items-center justify-center gap-0.5 h-full active:scale-95 transition-colors ${
                                    isActive ? "text-grad-active" : "text-black"
                                }`
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    {isActive && (
                                        <span
                                            aria-hidden
                                            className="absolute top-1 w-8 h-[3px] rounded-full grad-bar"
                                        />
                                    )}
                                    <span className="relative">
                                        <Icon
                                            size={22}
                                            strokeWidth={isActive ? 2.2 : 1.7}
                                            color={isActive ? "#df8a7d" : undefined}
                                        />
                                        {isMsg && msgCount > 0 && (
                                            <span
                                                data-testid="mnav-msg-badge"
                                                className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-red-soft text-[10px] font-mono grid place-items-center text-white font-bold ring-2 ring-white"
                                            >
                                                {msgCount > 99 ? "99+" : msgCount}
                                            </span>
                                        )}
                                    </span>
                                    <span
                                        className={`text-[10px] tracking-tight ${
                                            isActive ? "font-semibold" : "font-medium"
                                        }`}
                                    >
                                        {it.label}
                                    </span>
                                </>
                            )}
                        </NavLink>
                    );
                })}
            </div>
        </nav>
    );
}
