import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Heart, MessageCircle, UserPlus, Repeat2, AtSign, Quote, Bell } from "lucide-react";
import { api } from "../lib/api";
import { Avatar } from "../components/Avatar";
import { VerifiedBadge } from "../components/VerifiedBadge";
import { PageHeader } from "../components/PageHeader";
import { smartTime } from "../lib/time";
import { useLiveTime } from "../hooks/useLiveTime";

const iconFor = (type) => {
    if (type === "like") return <Heart size={18} className="text-accent-vermillion" fill="currentColor" />;
    if (type === "comment") return <MessageCircle size={18} className="text-blue-400" />;
    if (type === "follow") return <UserPlus size={18} className="text-emerald-400" />;
    if (type === "repost") return <Repeat2 size={18} className="text-emerald-400" />;
    if (type === "quote") return <Quote size={18} className="text-cyan-400" />;
    if (type === "mention") return <AtSign size={18} className="text-accent-vermillion" />;
    return null;
};

const FILTERS = [
    { key: "all", label: "Tudo" },
    { key: "mention", label: "Menções" },
    { key: "like", label: "Gostos" },
    { key: "follow", label: "Seguidores" },
];

export default function Notifications() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");
    useLiveTime(30000);

    useEffect(() => {
        api.get("/notifications").then((r) => {
            setItems(r.data);
            setLoading(false);
        });
        api.post("/notifications/read-all").catch(() => {});
    }, []);

    const filtered = useMemo(() => {
        if (filter === "all") return items;
        if (filter === "like") return items.filter((n) => ["like", "repost", "quote"].includes(n.type));
        return items.filter((n) => n.type === filter);
    }, [items, filter]);

    return (
        <div data-testid="notifications-page">
            <PageHeader title="Notificações" subtitle="o que dizem sobre ti" testid="notifications-header">
                <div className="grid grid-cols-4 border-t border-white/[0.05] no-scrollbar">
                    {FILTERS.map((f) => (
                        <button
                            key={f.key}
                            onClick={() => setFilter(f.key)}
                            data-testid={`notif-filter-${f.key}`}
                            className={`py-2.5 font-heading font-semibold text-[11px] uppercase tracking-wide transition relative active:scale-[0.97] ${
                                filter === f.key ? "text-white" : "text-zinc-500 active:bg-white/[0.03]"
                            }`}
                        >
                            {f.label}
                            {filter === f.key && (
                                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-accent-vermillion rounded-full" />
                            )}
                        </button>
                    ))}
                </div>
            </PageHeader>

            {loading ? (
                <div className="p-10 text-center text-zinc-500 font-mono text-sm">a carregar...</div>
            ) : filtered.length === 0 ? (
                <div className="px-6 py-16 text-center">
                    <div className="w-20 h-20 rounded-full bg-accent-vermillion/10 grid place-items-center mx-auto mb-5 border border-accent-vermillion/30">
                        <Bell size={28} className="text-accent-vermillion" />
                    </div>
                    <p className="text-zinc-100 font-heading text-lg tracking-tight">Tudo calmo por aqui</p>
                    <p className="text-zinc-500 text-sm mt-1">Volta mais tarde para novidades.</p>
                </div>
            ) : (
                filtered.map((n) => {
                    const linkTo = n.post_id ? `/post/${n.post_id}` : `/u/${n.from_user?.username}`;
                    return (
                        <Link
                            to={linkTo}
                            key={n.id}
                            data-testid={`notification-${n.id}`}
                            className={`flex items-start gap-4 p-5 border-b border-zinc-900 transition-colors hover:bg-white/[0.02] ${
                                n.read ? "" : "bg-accent-vermillion/[0.04]"
                            }`}
                        >
                            <div className="pt-1">{iconFor(n.type)}</div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <Avatar user={n.from_user} size={32} />
                                    <div className="flex-1">
                                        <span className="font-heading font-semibold text-sm flex items-center gap-1">
                                            {n.from_user?.name}
                                            {n.from_user?.verified && <VerifiedBadge size={12} />}
                                        </span>
                                    </div>
                                    <span className="font-mono text-xs text-zinc-500">{smartTime(n.created_at)}</span>
                                </div>
                                <p className="mt-2 text-sm text-zinc-300">{n.text}</p>
                            </div>
                        </Link>
                    );
                })
            )}
        </div>
    );
}
