import { NavLink, useLocation } from "react-router-dom";
import { Home, Compass, MessageCircle, User, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

const items = [
    { to: "/", icon: Home, testid: "mnav-home", end: true, label: "Início" },
    { to: "/explore", icon: Compass, testid: "mnav-explore", label: "Explorar" },
    { to: null, icon: Plus, testid: "mnav-compose", label: "Publicar", center: true },
    { to: "/messages", icon: MessageCircle, testid: "mnav-messages", label: "DMs" },
    { to: "/profile", icon: User, testid: "mnav-profile", label: "Perfil" },
];

export function MobileBottomNav({ onCompose }) {
    const { user } = useAuth();
    const location = useLocation();
    const [msgCount, setMsgCount] = useState(0);

    useEffect(() => {
        const tick = async () => {
            try {
                const m = await api.get("/messages/unread-count");
                setMsgCount(m.data.count);
            } catch {}
        };
        tick();
        const id = setInterval(tick, 10000);
        return () => clearInterval(id);
    }, []);

    return (
        <nav
            className="lg:hidden fixed bottom-3 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-1.5rem)] max-w-md"
            data-testid="mobile-bottom-nav"
            style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
            <div className="glass-deep border border-white/[0.08] rounded-full shadow-2xl shadow-black/60 flex items-center justify-between px-3 py-2">
                {items.map((it, idx) => {
                    const Icon = it.icon;
                    if (it.center) {
                        return (
                            <button
                                key={idx}
                                onClick={onCompose}
                                data-testid={it.testid}
                                className="-my-3 w-12 h-12 rounded-full bg-accent-vermillion text-white grid place-items-center shadow-lg shadow-[#8B5CF6]/40 tap-shrink hover:bg-[#A78BFA] transition-colors"
                                aria-label="Nova publicação"
                            >
                                <Icon size={22} strokeWidth={2.5} />
                            </button>
                        );
                    }
                    const to = it.to === "/profile" ? `/u/${user?.username}` : it.to;
                    const isMsg = it.to === "/messages";
                    return (
                        <NavLink
                            key={idx}
                            to={to}
                            end={it.end}
                            data-testid={it.testid}
                            className={({ isActive }) =>
                                `relative w-12 h-11 rounded-full grid place-items-center tap-shrink transition ${
                                    isActive
                                        ? "text-white bg-white/[0.08]"
                                        : "text-zinc-500 hover:text-white"
                                }`
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    <Icon size={22} strokeWidth={isActive ? 2.4 : 1.9} />
                                    {isMsg && msgCount > 0 && (
                                        <span className="absolute top-1 right-1.5 w-2 h-2 rounded-full bg-accent-vermillion pulse-dot" />
                                    )}
                                    {isActive && (
                                        <span className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-accent-vermillion" />
                                    )}
                                </>
                            )}
                        </NavLink>
                    );
                })}
            </div>
        </nav>
    );
}
