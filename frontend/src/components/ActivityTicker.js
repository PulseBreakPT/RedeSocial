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
        <div className="card-lux p-5" data-testid="activity-ticker">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <p className="type-overline mb-0.5">Em direto</p>
                    <h3 className="font-display text-[22px] leading-none tracking-tight text-black flex items-center gap-2">
                        Ao vivo
                        <span className="w-1.5 h-1.5 rounded-full bg-green-soft pulse-dot" />
                    </h3>
                </div>
                <Activity size={15} strokeWidth={1.5} className="text-black/40" />
            </div>
            <ul className="space-y-3">
                {items.map((a) => (
                    <li key={a.id} className="flex items-start gap-2.5 text-[13px] leading-tight" data-testid={`activity-${a.id}`}>
                        <Link to={`/u/${a.actor?.username}`} className="mt-0.5">
                            <Avatar user={a.actor} size={26} />
                        </Link>
                        <div className="flex-1 min-w-0">
                            <span className="text-black/75">
                                <Link to={`/u/${a.actor?.username}`} className="font-heading font-medium tracking-tight text-black hover:underline">
                                    {a.actor?.name}
                                </Link>{" "}
                                <span className="text-black/55">{a.verb}</span>{" "}
                                <Link to={`/u/${a.target_username}`} className="font-heading font-medium text-black hover:underline">
                                    @{a.target_username}
                                </Link>
                            </span>
                            <div className="font-mono text-[10px] text-black/40 mt-1 uppercase tracking-wider">{smartTime(a.created_at)}</div>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}
