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
    if (type === "like") return <Heart size={16} strokeWidth={1.6} className="text-red-soft" fill="currentColor" />;
    if (type === "comment") return <MessageCircle size={16} strokeWidth={1.6} className="text-blue-soft" />;
    if (type === "follow") return <UserPlus size={16} strokeWidth={1.6} className="text-green-soft" />;
    if (type === "repost") return <Repeat2 size={16} strokeWidth={1.6} className="text-green-soft" />;
    if (type === "quote") return <Quote size={16} strokeWidth={1.6} className="text-blue-soft" />;
    if (type === "mention") return <AtSign size={16} strokeWidth={1.6} className="text-black" />;
    return null;
};

const bgFor = (type) => {
    if (type === "like") return "bg-red-soft-bg";
    if (type === "follow" || type === "repost") return "bg-green-soft-bg";
    if (type === "comment" || type === "quote") return "bg-blue-soft-bg";
    return "bg-black/[0.04]";
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
            <PageHeader title="Notificações" subtitle="Toda a tua atividade" testid="notifications-header">
                <div className="grid grid-cols-4 hairline-t">
                    {FILTERS.map((f) => (
                        <button
                            key={f.key}
                            onClick={() => setFilter(f.key)}
                            data-testid={`notif-filter-${f.key}`}
                            className={`py-3 font-mono text-[10px] uppercase tracking-[0.18em] transition relative active:scale-[0.97] ${
                                filter === f.key ? "text-black" : "text-black/40 hover:text-black/70"
                            }`}
                        >
                            {f.label}
                            {filter === f.key && (
                                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-[2px] bg-black rounded-full" />
                            )}
                        </button>
                    ))}
                </div>
            </PageHeader>

            {loading ? (
                <div className="p-12 text-center type-overline">a carregar…</div>
            ) : filtered.length === 0 ? (
                <div className="px-6 py-20 text-center anim-fade-up">
                    <div className="ring-silver w-20 h-20 rounded-full grid place-items-center mx-auto mb-6">
                        <Bell size={24} strokeWidth={1.4} className="text-black/70" />
                    </div>
                    <p className="type-overline mb-2">Tudo lido</p>
                    <h3 className="font-display text-[19px] font-bold tracking-tight text-black">
                        Tudo calmo por aqui.
                    </h3>
                    <p className="text-black/55 text-sm mt-2">Volta mais tarde para novidades.</p>
                </div>
            ) : (
                filtered.map((n) => {
                    const linkTo = n.post_id ? `/post/${n.post_id}` : `/u/${n.from_user?.username}`;
                    return (
                        <Link
                            to={linkTo}
                            key={n.id}
                            data-testid={`notification-${n.id}`}
                            className={`flex items-start gap-3 px-4 lg:px-5 py-4 hairline-b transition-colors hover:bg-black/[0.015] ${
                                n.read ? "" : "bg-black/[0.02]"
                            }`}
                        >
                            <div className={`w-9 h-9 rounded-full grid place-items-center flex-shrink-0 ${bgFor(n.type)}`}>
                                {iconFor(n.type)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                    <Avatar user={n.from_user} size={28} />
                                    <div className="flex-1 min-w-0">
                                        <span className="font-heading font-medium text-[14px] tracking-tight flex items-center gap-1 text-black truncate">
                                            {n.from_user?.name}
                                            {n.from_user?.verified && <VerifiedBadge size={11} />}
                                        </span>
                                    </div>
                                    <span className="font-mono text-[10px] text-black/40 flex-shrink-0">{smartTime(n.created_at)}</span>
                                    {!n.read && (
                                        <span className="w-1.5 h-1.5 rounded-full bg-black flex-shrink-0" aria-label="não lida" />
                                    )}
                                </div>
                                <p className="mt-1.5 text-sm text-black/70 leading-relaxed line-clamp-2">{n.text}</p>
                            </div>
                        </Link>
                    );
                })
            )}
        </div>
    );
}
