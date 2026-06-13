import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Activity } from "lucide-react";
import { api } from "../lib/api";
import { Avatar } from "./Avatar";
import { smartTime } from "../lib/time";
import { useLiveTime } from "../hooks/useLiveTime";
import { PT } from "../theme/editorial";

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
        <div
            className="overflow-hidden transition-all duration-200"
            style={{
                background: "#fff",
                border: "1px solid rgba(10,10,10,0.07)",
                borderRadius: 18,
                boxShadow: "0 1px 0 rgba(255,255,255,0.6) inset, 0 12px 28px -20px rgba(10,10,10,0.10)",
            }}
            data-testid="activity-ticker"
        >
            {/* Título único centrado com ícone — alinhado com restantes widgets */}
            <div className="flex items-center justify-center gap-2 px-4 pt-4 pb-3">
                <Activity size={16} strokeWidth={2.0} className="shrink-0" style={{ color: PT.green }} />
                <h3
                    className="font-black tracking-[-0.02em] text-center"
                    style={{ fontSize: 16, color: PT.ink, lineHeight: 1.15 }}
                >
                    Atividade recente
                </h3>
            </div>
            <ul className="space-y-3 px-4 pb-4">
                {items.map((a) => (
                    <li key={a.id} className="flex items-start gap-2.5 text-[13px] leading-tight" data-testid={`activity-${a.id}`}>
                        <Link to={`/u/${a.actor?.username}`} className="mt-0.5">
                            <Avatar user={a.actor} size={26} />
                        </Link>
                        <div className="flex-1 min-w-0">
                            <span style={{ color: "rgba(10,10,10,0.75)" }}>
                                <Link to={`/u/${a.actor?.username}`} className="font-bold tracking-tight hover:underline" style={{ color: PT.ink }}>
                                    {a.actor?.name}
                                </Link>{" "}
                                <span style={{ color: "rgba(10,10,10,0.55)" }}>{a.verb}</span>{" "}
                                <Link to={`/u/${a.target_username}`} className="font-bold hover:underline" style={{ color: PT.ink }}>
                                    @{a.target_username}
                                </Link>
                            </span>
                            <div className="font-mono text-[10px] mt-1 uppercase tracking-wider" style={{ color: "rgba(10,10,10,0.4)" }}>
                                {smartTime(a.created_at)}
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}
