import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Activity } from "lucide-react";
import { api } from "../lib/api";
import { Avatar } from "./Avatar";
import { smartTime } from "../lib/time";
import { useLiveTime } from "../hooks/useLiveTime";

export function ActivityTicker() {
    const [items, setItems] = useState([]);
    useLiveTime(30000);

    useEffect(() => {
        const load = async () => {
            try {
                const { data } = await api.get("/activity?limit=8");
                setItems(data);
            } catch {}
        };
        load();
        const id = setInterval(load, 20000);
        return () => clearInterval(id);
    }, []);

    if (items.length === 0) return null;

    return (
        <div className="bg-zinc-950/50 border border-white/[0.05] rounded-2xl p-5" data-testid="activity-ticker">
            <div className="flex items-center gap-2 mb-3">
                <Activity size={14} className="text-accent-vermillion" />
                <h3 className="font-heading text-lg font-bold">Atividade ao vivo</h3>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-dot ml-auto" />
            </div>
            <ul className="space-y-3">
                {items.map((a) => (
                    <li key={a.id} className="flex items-start gap-2.5 text-sm" data-testid={`activity-${a.id}`}>
                        <Link to={`/u/${a.actor?.username}`}>
                            <Avatar user={a.actor} size={26} />
                        </Link>
                        <div className="flex-1 min-w-0 leading-tight">
                            <span className="text-zinc-300">
                                <Link to={`/u/${a.actor?.username}`} className="font-heading font-semibold text-white hover:underline">
                                    {a.actor?.name}
                                </Link>{" "}
                                <span className="text-zinc-400">{a.verb}</span>{" "}
                                <Link to={`/u/${a.target_username}`} className="font-heading font-semibold text-accent-vermillion hover:underline">
                                    @{a.target_username}
                                </Link>
                            </span>
                            <div className="font-mono text-[10px] text-zinc-600 mt-0.5">{smartTime(a.created_at)}</div>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}
