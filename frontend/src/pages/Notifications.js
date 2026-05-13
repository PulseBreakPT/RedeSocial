import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Heart, MessageCircle, UserPlus, Repeat2, AtSign } from "lucide-react";
import { api } from "../lib/api";
import { Avatar } from "../components/Avatar";
import { VerifiedBadge } from "../components/VerifiedBadge";

const iconFor = (type) => {
    if (type === "like") return <Heart size={18} className="text-accent-vermillion" fill="currentColor" />;
    if (type === "comment") return <MessageCircle size={18} className="text-blue-400" />;
    if (type === "follow") return <UserPlus size={18} className="text-emerald-400" />;
    if (type === "repost") return <Repeat2 size={18} className="text-emerald-400" />;
    if (type === "mention") return <AtSign size={18} className="text-accent-vermillion" />;
    return null;
};

export default function Notifications() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get("/notifications").then((r) => {
            setItems(r.data);
            setLoading(false);
        });
        api.post("/notifications/read-all").catch(() => {});
    }, []);

    return (
        <div data-testid="notifications-page">
            <div className="sticky top-0 z-30 glass border-b border-zinc-900 px-5 py-4">
                <h1 className="font-heading text-xl font-bold tracking-tight">Notificações</h1>
                <p className="font-mono text-xs text-zinc-500 mt-0.5">o que estão dizendo de você</p>
            </div>
            {loading ? (
                <div className="p-10 text-center text-zinc-500 font-mono text-sm">carregando...</div>
            ) : items.length === 0 ? (
                <div className="p-10 text-center text-zinc-500 font-mono text-sm">Nenhuma notificação ainda.</div>
            ) : (
                items.map((n) => {
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
                                    <span className="font-heading font-semibold text-sm flex items-center gap-1">
                                        {n.from_user?.name}
                                        {n.from_user?.verified && <VerifiedBadge size={12} />}
                                    </span>
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
