import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Heart, MessageCircle, UserPlus, Repeat2, AtSign, Quote, Bell, Star, BellOff, Trash2, CheckCheck, Settings as Cog, Reply, Send, X, Eye } from "lucide-react";
import { api, formatApiError, toastApiError } from "../lib/api";
import { Avatar } from "../components/Avatar";
import { VerifiedBadge } from "../components/VerifiedBadge";
import { PageHeader } from "../components/PageHeader";
import { smartTime } from "../lib/time";
import { useLiveTime } from "../hooks/useLiveTime";
import { toast } from "sonner";
import { confirmDialog } from "../components/ConfirmDialog";

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
    { key: "priority", label: "Prioridade" },
    { key: "unread", label: "Não lidas" },
    { key: "star", label: "Importantes" },
    { key: "mention", label: "Menções" },
    { key: "like", label: "Gostos" },
    { key: "follow", label: "Seguidores" },
];

function groupByDay(items) {
    const groups = {};
    for (const n of items) {
        const d = (n.created_at || "").slice(0, 10);
        groups[d] = groups[d] || [];
        groups[d].push(n);
    }
    return Object.entries(groups).sort((a, b) => (a[0] < b[0] ? 1 : -1));
}

function dayLabel(d) {
    const today = new Date().toISOString().slice(0, 10);
    const y = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (d === today) return "Hoje";
    if (d === y) return "Ontem";
    return new Date(d).toLocaleDateString("pt-PT", { weekday: "long", day: "2-digit", month: "short" });
}

export default function Notifications() {
    const [items, setItems] = useState([]);
    const [priorityGroups, setPriorityGroups] = useState(null);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");
    const [replyTo, setReplyTo] = useState(null);  /* notification id being replied to */
    const [replyText, setReplyText] = useState("");
    const [replyBusy, setReplyBusy] = useState(false);
    const [contextFor, setContextFor] = useState(null); /* notification id with expanded context */
    const [postContexts, setPostContexts] = useState({}); /* post_id -> { content, author } */
    useLiveTime(30000);

    const reload = async () => {
        const { data } = await api.get("/notifications");
        setItems(data);
    };
    const reloadPriority = async () => {
        try {
            const { data } = await api.get("/notifications/priority");
            setPriorityGroups(data);
        } catch { setPriorityGroups(null); }
    };

    useEffect(() => {
        reload().finally(() => setLoading(false));
        reloadPriority();
        api.post("/notifications/read-all").catch(() => {});
    }, []);

    const filtered = useMemo(() => {
        if (filter === "all") return items;
        if (filter === "unread") return items.filter((n) => !n.read);
        if (filter === "star") return items.filter((n) => n.starred);
        if (filter === "like") return items.filter((n) => ["like", "repost", "quote"].includes(n.type));
        return items.filter((n) => n.type === filter);
    }, [items, filter]);

    const grouped = useMemo(() => groupByDay(filtered), [filtered]);

    const toggleStar = async (n) => {
        setItems((prev) => prev.map((x) => x.id === n.id ? { ...x, starred: !x.starred } : x));
        try { await api.post(`/notifications/${n.id}/star`); }
        catch (e) {
            setItems((prev) => prev.map((x) => x.id === n.id ? { ...x, starred: !x.starred } : x));
            toastApiError(e);
        }
    };
    const snooze = async (n) => {
        try {
            await api.post(`/notifications/${n.id}/snooze`, { hours: 24 });
            setItems((prev) => prev.filter((x) => x.id !== n.id));
            toast.success("Silenciada por 24h");
        } catch (e) { toastApiError(e); }
    };
    const remove = async (n) => {
        try {
            await api.delete(`/notifications/${n.id}`);
            setItems((prev) => prev.filter((x) => x.id !== n.id));
        } catch (e) { toastApiError(e); }
    };
    const clearRead = async () => {
        const ok = await confirmDialog({
            title: "Apagar todas as notificações lidas?",
            description: "As notificações por ler permanecem. Esta ação não pode ser desfeita.",
            confirmText: "Apagar lidas",
            danger: true,
        });
        if (!ok) return;
        try {
            await api.delete("/notifications");
            await reload();
            toast.success("Limpas");
        } catch (e) { toastApiError(e); }
    };
    const markAll = async () => {
        try { await api.post("/notifications/read-all"); await reload(); toast.success("Marcadas como lidas"); }
        catch (e) { toastApiError(e); }
    };

    const sendQuickReply = async (n) => {
        if (!replyText.trim() || !n.post_id) return;
        setReplyBusy(true);
        try {
            await api.post(`/posts/${n.post_id}/comments`, { content: replyText.trim() });
            toast.success("Resposta enviada");
            setReplyText(""); setReplyTo(null);
        } catch (e) { toastApiError(e); }
        finally { setReplyBusy(false); }
    };

    const openContext = async (n) => {
        if (contextFor === n.id) { setContextFor(null); return; }
        setContextFor(n.id);
        if (n.post_id && !postContexts[n.post_id]) {
            try {
                const { data } = await api.get(`/posts/${n.post_id}`);
                setPostContexts((prev) => ({ ...prev, [n.post_id]: data }));
            } catch { /* silent */ }
        }
    };

    const muteCategory = async (type) => {
        try {
            const { data } = await api.get("/notifications/preferences");
            const muted = data.muted_types || [];
            if (muted.includes(type)) { toast.info(`Categoria "${type}" já estava silenciada`); return; }
            await api.post("/notifications/preferences", { muted_types: [...muted, type] });
            toast.success(`Categoria "${type}" silenciada`);
        } catch (e) { toastApiError(e); }
    };

    const unreadCount = items.filter((n) => !n.read).length;

    return (
        <div data-testid="notifications-page">
            <PageHeader
                title="Notificações"
                subtitle={`${items.length} no total · ${unreadCount} por ler`}
                testid="notifications-header"
                action={
                    <div className="flex items-center gap-1">
                        <button onClick={markAll} data-testid="notif-mark-all" title="Marcar todas como lidas" className="w-9 h-9 rounded-full grid place-items-center text-black hover:bg-black/[0.06] tap-shrink">
                            <CheckCheck size={15} />
                        </button>
                        <button onClick={clearRead} data-testid="notif-clear" title="Apagar lidas" className="w-9 h-9 rounded-full grid place-items-center text-black hover:bg-black/[0.06] tap-shrink">
                            <Trash2 size={14} />
                        </button>
                        <Link to="/settings" title="Definições de notificações" className="w-9 h-9 rounded-full grid place-items-center text-black hover:bg-black/[0.06] tap-shrink">
                            <Cog size={15} />
                        </Link>
                    </div>
                }
            >
                <div className="px-3 lg:px-4 pb-2 flex gap-1 overflow-x-auto scrollbar-hide hairline-t pt-2">
                    {FILTERS.map((f) => {
                        const active = filter === f.key;
                        return (
                            <button
                                key={f.key}
                                onClick={() => setFilter(f.key)}
                                data-testid={`notif-filter-${f.key}`}
                                className={`shrink-0 px-3 py-1.5 rounded-full text-[12px] font-medium transition ${active ? "chip-filter-on" : "bg-black/[0.04] text-black hover:bg-black/[0.08]"}`}
                            >
                                {f.label}
                            </button>
                        );
                    })}
                </div>
            </PageHeader>

            {loading ? (
                <div className="p-12 text-center type-overline">a carregar…</div>
            ) : filter === "priority" && priorityGroups ? (
                <div data-testid="notif-priority-view">
                    {[
                        { key: "urgent", label: "Urgente · Menções & Convites", color: "text-red-600 bg-red-50 border-red-200" },
                        { key: "high", label: "Mesa & Roda", color: "text-orange-700 bg-orange-50 border-orange-200" },
                        { key: "normal", label: "Pessoas que segues", color: "text-black bg-black/[0.04] border-black/10" },
                        { key: "low", label: "Outros", color: "text-black/55 bg-black/[0.02] border-black/[0.06]" },
                    ].map((grp) => {
                        const list = priorityGroups[grp.key] || [];
                        if (list.length === 0) return null;
                        return (
                            <div key={grp.key} className="hairline-b">
                                <div className={`px-4 py-2 border-l-4 ${grp.color}`}>
                                    <span className="type-overline">{grp.label} · {list.length}</span>
                                </div>
                                {list.map((n) => {
                                    const linkTo = n.post_id ? `/post/${n.post_id}` : `/u/${n.from?.username}`;
                                    return (
                                        <Link key={n.id} to={linkTo} className="flex items-start gap-3 px-4 lg:px-5 py-3 hover:bg-black/[0.02] transition hairline-b" data-testid={`notif-priority-item-${n.id}`}>
                                            <div className={`w-8 h-8 rounded-full grid place-items-center flex-shrink-0 ${bgFor(n.type)}`}>{iconFor(n.type)}</div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <Avatar user={n.from} size={22} />
                                                    <span className="font-heading font-medium text-[13px] truncate">{n.from?.name}</span>
                                                    <span className="font-mono text-[10px] text-black/40 ml-auto">{smartTime(n.created_at)}</span>
                                                </div>
                                                <p className="mt-1 text-xs text-black/65 line-clamp-2">{n.text}</p>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            ) : filtered.length === 0 ? (
                <div className="px-6 py-20 text-center anim-fade-up">
                    <div className="ring-silver w-20 h-20 rounded-full grid place-items-center mx-auto mb-6">
                        <Bell size={24} strokeWidth={1.4} className="text-black/70" />
                    </div>
                    <p className="type-overline mb-2">Tudo lido</p>
                    <h3 className="font-display text-[19px] font-bold tracking-tight text-black">Tudo calmo por aqui.</h3>
                    <p className="text-black/55 text-sm mt-2">Volta mais tarde para novidades.</p>
                </div>
            ) : (
                grouped.map(([day, list]) => (
                    <div key={day}>
                        <div className="px-4 lg:px-5 py-2 sticky top-[calc(var(--mobile-topbar-h)+96px)] lg:top-[145px] bg-paper/95 backdrop-blur z-10 hairline-b">
                            <span className="type-overline">{dayLabel(day)}</span>
                        </div>
                        {list.map((n) => {
                            const linkTo = n.post_id ? `/post/${n.post_id}` : `/u/${n.from_user?.username}`;
                            const canReply = (n.type === "comment" || n.type === "mention" || n.type === "reply") && !!n.post_id;
                            const isReplying = replyTo === n.id;
                            const isExpanded = contextFor === n.id;
                            const ctx = n.post_id ? postContexts[n.post_id] : null;
                            return (
                                <div key={n.id} data-testid={`notification-${n.id}`} className={`group hairline-b transition-colors ${n.read ? "" : "bg-black/[0.02]"}`}>
                                    <div className={`flex items-start gap-3 px-4 lg:px-5 py-4 hover:bg-black/[0.015]`}>
                                        <div className={`w-9 h-9 rounded-full grid place-items-center flex-shrink-0 ${bgFor(n.type)}`}>{iconFor(n.type)}</div>
                                        <Link to={linkTo} className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <Avatar user={n.from_user} size={28} />
                                                <span className="font-heading font-medium text-[14px] tracking-tight flex items-center gap-1 text-black truncate">
                                                    {n.from_user?.name}
                                                    {n.from_user?.verified && <VerifiedBadge size={11} />}
                                                </span>
                                                <span className="font-mono text-[10px] text-black/40 flex-shrink-0 ml-auto">{smartTime(n.created_at)}</span>
                                                {!n.read && (<span className="w-1.5 h-1.5 rounded-full bg-black flex-shrink-0" aria-label="não lida" />)}
                                            </div>
                                            <p className="mt-1.5 text-sm text-black/70 leading-relaxed line-clamp-2">{n.text}</p>
                                        </Link>
                                        <div className="flex flex-col gap-1 opacity-60 group-hover:opacity-100 transition">
                                            {canReply && (
                                                <button onClick={() => { setReplyTo(isReplying ? null : n.id); setReplyText(""); }} data-testid={`notif-reply-${n.id}`} title="Responder rápido" className={`w-7 h-7 grid place-items-center rounded-full hover:bg-black/[0.05] ${isReplying ? "text-black" : "text-black/40"}`}>
                                                    <Reply size={13} strokeWidth={1.7} />
                                                </button>
                                            )}
                                            {n.post_id && (
                                                <button onClick={() => openContext(n)} data-testid={`notif-context-${n.id}`} title="Ver contexto" className={`w-7 h-7 grid place-items-center rounded-full hover:bg-black/[0.05] ${isExpanded ? "text-black" : "text-black/40"}`}>
                                                    <Eye size={13} strokeWidth={1.7} />
                                                </button>
                                            )}
                                            <button onClick={() => toggleStar(n)} data-testid={`notif-star-${n.id}`} title={n.starred ? "Desmarcar" : "Importante"} className={`w-7 h-7 grid place-items-center rounded-full hover:bg-black/[0.05] ${n.starred ? "text-amber-500" : "text-black/40"}`}>
                                                <Star size={13} strokeWidth={1.7} fill={n.starred ? "currentColor" : "none"} />
                                            </button>
                                            <button onClick={() => snooze(n)} data-testid={`notif-snooze-${n.id}`} title="Silenciar 24h" className="w-7 h-7 grid place-items-center rounded-full text-black/40 hover:bg-black/[0.05]">
                                                <BellOff size={13} strokeWidth={1.7} />
                                            </button>
                                            <button onClick={() => muteCategory(n.type)} data-testid={`notif-mute-cat-${n.id}`} title={`Silenciar todos os "${n.type}"`} className="w-7 h-7 grid place-items-center rounded-full text-black/40 hover:bg-black/[0.05]">
                                                <BellOff size={11} strokeWidth={1.7} />
                                            </button>
                                            <button onClick={() => remove(n)} data-testid={`notif-delete-${n.id}`} title="Apagar" className="w-7 h-7 grid place-items-center rounded-full text-black/40 hover:bg-red-soft-bg hover:text-red-soft">
                                                <Trash2 size={13} strokeWidth={1.7} />
                                            </button>
                                        </div>
                                    </div>

                                    {isExpanded && ctx && (
                                        <div className="px-5 pb-3 -mt-2" data-testid={`notif-context-content-${n.id}`}>
                                            <div className="rounded-xl border border-black/[0.06] bg-black/[0.02] px-3 py-2.5 text-[12.5px] text-black/75 line-clamp-3">
                                                {ctx.content || "(sem texto)"}
                                            </div>
                                        </div>
                                    )}

                                    {isReplying && (
                                        <div className="px-4 lg:px-5 pb-3 -mt-2 pl-16" data-testid={`notif-reply-form-${n.id}`}>
                                            <div className="flex items-end gap-2">
                                                <textarea
                                                    value={replyText}
                                                    onChange={(e) => setReplyText(e.target.value)}
                                                    placeholder="Responder rapidamente…"
                                                    rows={2}
                                                    maxLength={500}
                                                    data-testid={`notif-reply-input-${n.id}`}
                                                    className="flex-1 bg-white border border-black/[0.10] rounded-xl px-3 py-2 text-[13px] focus:border-black/40 outline-none resize-none"
                                                />
                                                <button
                                                    onClick={() => sendQuickReply(n)}
                                                    disabled={replyBusy || !replyText.trim()}
                                                    data-testid={`notif-reply-send-${n.id}`}
                                                    className="btn-obsidian px-3 py-2 text-[11.5px] inline-flex items-center gap-1 disabled:opacity-40"
                                                >
                                                    <Send size={12} /> {replyBusy ? "…" : "Enviar"}
                                                </button>
                                                <button
                                                    onClick={() => { setReplyTo(null); setReplyText(""); }}
                                                    data-testid={`notif-reply-cancel-${n.id}`}
                                                    className="w-9 h-9 grid place-items-center rounded-full text-black/45 hover:bg-black/[0.05] tap-shrink"
                                                >
                                                    <X size={13} />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ))
            )}
        </div>
    );
}
