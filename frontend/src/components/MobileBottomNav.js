import { NavLink } from "react-router-dom";
import { Home, Compass, Bell, MessageCircle, User } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

const items = [
    { to: "/", icon: Home, label: "Início", testid: "mnav-home", end: true },
    { to: "/explore", icon: Compass, label: "Explorar", testid: "mnav-explore" },
    { to: "/notifications", icon: Bell, label: "Notif.", testid: "mnav-notifications" },
    { to: "/messages", icon: MessageCircle, label: "DMs", testid: "mnav-messages" },
];

export function MobileBottomNav() {
    const { user } = useAuth();
    const [counts, setCounts] = useState({ notif: 0, msg: 0 });

    useEffect(() => {
        const tick = async () => {
            try {
                const [n, m] = await Promise.all([
                    api.get("/notifications/unread-count"),
                    api.get("/messages/unread-count"),
                ]);
                setCounts({ notif: n.data.count, msg: m.data.count });
            } catch {}
        };
        tick();
        const id = setInterval(tick, 8000);
        return () => clearInterval(id);
    }, []);

    return (
        <nav
            className="lg:hidden fixed bottom-0 left-0 right-0 z-40 glass border-t border-zinc-900 grid grid-cols-5 pb-[env(safe-area-inset-bottom)]"
            data-testid="mobile-bottom-nav"
        >
            {items.map(({ to, icon: Icon, label, testid, end }) => (
                <NavLink
                    key={to}
                    to={to}
                    end={end}
                    data-testid={testid}
                    className={({ isActive }) =>
                        `flex flex-col items-center justify-center gap-1 py-2.5 transition relative ${
                            isActive ? "text-accent-vermillion" : "text-zinc-500 hover:text-white"
                        }`
                    }
                >
                    <div className="relative">
                        <Icon size={22} strokeWidth={1.75} />
                        {to === "/notifications" && counts.notif > 0 && (
                            <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-accent-vermillion text-[9px] font-mono grid place-items-center text-white">
                                {counts.notif}
                            </span>
                        )}
                        {to === "/messages" && counts.msg > 0 && (
                            <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-accent-vermillion text-[9px] font-mono grid place-items-center text-white">
                                {counts.msg}
                            </span>
                        )}
                    </div>
                    <span className="font-mono text-[10px] uppercase tracking-wide">{label}</span>
                </NavLink>
            ))}
            <NavLink
                to={`/u/${user?.username}`}
                data-testid="mnav-profile"
                className={({ isActive }) =>
                    `flex flex-col items-center justify-center gap-1 py-2.5 transition ${
                        isActive ? "text-accent-vermillion" : "text-zinc-500 hover:text-white"
                    }`
                }
            >
                <User size={22} strokeWidth={1.75} />
                <span className="font-mono text-[10px] uppercase tracking-wide">Perfil</span>
            </NavLink>
        </nav>
    );
}
