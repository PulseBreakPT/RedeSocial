import { useEffect, useMemo, useState } from "react";
// =============================================================================
// DESIGN SYSTEM: LUSORAE EDITORIAL — ver /src/theme/EDITORIAL.md
// =============================================================================
import { Link } from "react-router-dom";
import { Heart, MessageCircle, UserPlus, Repeat2, AtSign, Quote, Bell, Star, BellOff, Trash2, CheckCheck, Settings as Cog, Reply, Send, X, Eye } from "lucide-react";
import { api, formatApiError, toastApiError } from "../lib/api";
import { Avatar } from "../components/Avatar";
import { VerifiedBadge } from "../components/VerifiedBadge";
import { PageHeader } from "../components/PageHeader";
import { PtPageShell } from "../components/PtPageShell";
import { Highlight } from "../components/editorial/Primitives";
import { NotificationReplyPreview } from "../components/NotificationReplyPreview";
import { PushNotificationBanner } from "../components/PushNotificationBanner";
import { smartTime } from "../lib/time";
import { useLiveTime } from "../hooks/useLiveTime";
import { toast } from "sonner";
import { confirmDialog } from "../components/ConfirmDialog";
import { NotifSkeletonList } from "../components/Skeleton";
import { PT } from "../theme/editorial";

/* ── Tokens fanzine PT por tipo de notificação ───────────────── */
/* Diversificado com a paleta expandida (5+ cores distintas em
   vez de 4 cores repetidas). Cada tipo tem semântica visual única. */
const TYPE_TOKENS = {
    like:    { bg: PT.brasa,      fg: "#fff",   Icon: Heart,       fill: true  }, // brasa coral — love
    comment: { bg: PT.atl,        fg: "#fff",   Icon: MessageCircle },              // atlântico — conversa
    follow:  { bg: PT.peixe,      fg: "#fff",   Icon: UserPlus     },              // peixe turquesa — frescura/novo
    repost:  { bg: PT.eucalipto,  fg: "#fff",   Icon: Repeat2      },              // eucalipto — crescimento
    quote:   { bg: PT.malva,      fg: "#fff",   Icon: Quote        },              // malva — cultura/cita
    mention: { bg: PT.laranja,    fg: PT.ink,   Icon: AtSign       },              // laranja queimado — atenção
    default: { bg: PT.ink,        fg: "#fff",  Icon: Bell         },
};

function TypeStamp({ type, size = 36 }) {
    const t = TYPE_TOKENS[type] || TYPE_TOKENS.default;
    const Icon = t.Icon;
    const iconSize = Math.round(size * 0.46);
    return (
        <div
            className="grid place-items-center flex-shrink-0"
            style={{
                width: size,
                height: size,
                background: t.bg,
                color: t.fg,
                border: "1px solid rgba(10,10,10,0.10)",
                boxShadow: "0 1px 2px rgba(10,10,10,0.05), 0 8px 20px -10px rgba(10,10,10,0.15)",
                borderRadius: 10,
            }}
        >
            <Icon size={iconSize} strokeWidth={2.4} fill={t.fill ? "currentColor" : "none"} />
        </div>
    );
}

const FILTERS = [
    { key: "all",     label: "Tudo" },
    { key: "unread",  label: "Não lidas" },
    { key: "mention", label: "Menções" },
];
// Pré-lançamento: Priority/Important/Likes/Follows escondidos — 3 filtros chega.

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
        <PtPageShell testid="notifications-page">
            <PageHeader
                title="Notificações"
                testid="notifications-header"
                action={
                    <div className="flex items-center gap-1.5">
                        <button
                            onClick={markAll}
                            data-testid="notif-mark-all"
                            title="Marcar todas como lidas"
                            className="w-9 h-9 grid place-items-center tap-shrink"
                            style={{
                                background: PT.green,
                                color: "#fff",
                                border: "1px solid rgba(10,10,10,0.10)",
                                boxShadow: "0 1px 2px rgba(10,10,10,0.05), 0 8px 20px -10px rgba(10,10,10,0.15)",
                                borderRadius: 999,
                            }}
                        >
                            <CheckCheck size={15} strokeWidth={2.5} />
                        </button>
                        <button
                            onClick={clearRead}
                            data-testid="notif-clear"
                            title="Apagar lidas"
                            className="w-9 h-9 grid place-items-center tap-shrink"
                            style={{
                                background: "#fff",
                                color: PT.ink,
                                border: "1px solid rgba(10,10,10,0.10)",
                                boxShadow: "0 1px 2px rgba(10,10,10,0.05), 0 8px 20px -10px rgba(10,10,10,0.15)",
                                borderRadius: 999,
                            }}
                        >
                            <Trash2 size={14} strokeWidth={2.5} />
                        </button>
                        <Link
                            to="/settings"
                            title="Definições de notificações"
                            className="w-9 h-9 grid place-items-center tap-shrink transition hover:bg-black/[0.04]"
                            style={{
                                background: "#fff",
                                color: "rgba(10,10,10,0.65)",
                                border: "1px solid rgba(10,10,10,0.08)",
                                borderRadius: 999,
                            }}
                        >
                            <Cog size={15} strokeWidth={2.0} />
                        </Link>
                    </div>
                }
            >
                <div
                    className="px-3 lg:px-4 pb-3 pt-3 flex gap-1.5 overflow-x-auto scrollbar-hide"
                    style={{ borderTop: "1px solid rgba(10,10,10,0.08)" }}
                >
                    {FILTERS.map((f) => {
                        const active = filter === f.key;
                        return (
                            <button
                                key={f.key}
                                onClick={() => setFilter(f.key)}
                                data-testid={`notif-filter-${f.key}`}
                                className="shrink-0 px-3.5 py-1.5 text-[12px] font-black uppercase transition-transform duration-100 hover:-translate-y-0.5"
                                style={{
                                    background: active ? PT.ink : "#fff",
                                    color: active ? "#fff" : PT.ink,
                                    border: "1px solid rgba(10,10,10,0.10)",
                                    boxShadow: active ? "0 1px 2px rgba(10,10,10,0.05), 0 8px 20px -10px rgba(10,10,10,0.15)" : "0 1px 2px rgba(10,10,10,0.05), 0 8px 20px -10px rgba(10,10,10,0.15)",
                                    borderRadius: 999,
                                    letterSpacing: "0.06em",
                                }}
                            >
                                {f.label}
                            </button>
                        );
                    })}
                </div>
            </PageHeader>

            <PushNotificationBanner />

            {loading ? (
                <NotifSkeletonList count={6} />
            ) : filter === "priority" && priorityGroups ? (
                <div data-testid="notif-priority-view">
                    {[
                        { key: "urgent", label: "Urgente · Menções & Convites", c: PT.red,   fg: "#fff"  },
                        { key: "high",   label: "Mesa & Roda",                  c: PT.gold,  fg: PT.ink },
                        { key: "normal", label: "Pessoas que segues",           c: PT.azul,  fg: "#fff"  },
                        { key: "low",    label: "Outros",                       c: PT.ink,   fg: "#fff" },
                    ].map((grp) => {
                        const list = priorityGroups[grp.key] || [];
                        if (list.length === 0) return null;
                        return (
                            <div key={grp.key} style={{ borderBottom: "1px solid rgba(10,10,10,0.10)" }}>
                                <div
                                    className="px-4 lg:px-5 py-2.5 flex items-center gap-2"
                                    style={{
                                        background: grp.c,
                                        color: grp.fg,
                                        borderBottom: "1px solid rgba(10,10,10,0.10)",
                                    }}
                                >
                                    <span className="font-mono font-bold uppercase" style={{ fontSize: 10.5, letterSpacing: "0.22em" }}>
                                        {grp.label}
                                    </span>
                                    <span
                                        className="ml-auto font-black tabular-nums px-2 py-0.5"
                                        style={{
                                            background: "#fff",
                                            color: PT.ink,
                                            border: "1px solid rgba(10,10,10,0.10)",
                                            borderRadius: 6,
                                            fontSize: 10.5,
                                            boxShadow: "0 1px 2px rgba(10,10,10,0.05), 0 8px 20px -10px rgba(10,10,10,0.15)",
                                        }}
                                    >
                                        {list.length}
                                    </span>
                                </div>
                                {list.map((n) => {
                                    const linkTo = n.post_id ? `/post/${n.post_id}` : `/u/${n.from?.username}`;
                                    return (
                                        <Link
                                            key={n.id}
                                            to={linkTo}
                                            className="flex items-start gap-3 px-4 lg:px-5 py-3 transition-colors"
                                            style={{ borderBottom: "1px solid rgba(10,10,10,0.08)" }}
                                            data-testid={`notif-priority-item-${n.id}`}
                                        >
                                            <TypeStamp type={n.type} size={32} />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <Avatar user={n.from} size={22} />
                                                    <span className="font-black text-[13px] truncate" style={{ color: PT.ink }}>
                                                        {n.from?.name}
                                                    </span>
                                                    <span className="font-mono font-bold text-[10px] ml-auto" style={{ color: "rgba(10,10,10,0.5)" }}>
                                                        {smartTime(n.created_at)}
                                                    </span>
                                                </div>
                                                <p className="mt-1 text-[12.5px] font-medium line-clamp-2" style={{ color: "rgba(10,10,10,0.65)" }}>
                                                    {n.text}
                                                </p>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        );
                    })}
                </div>
            ) : filtered.length === 0 ? (
                <div className="px-6 py-16 text-center anim-fade-up" data-testid="notifications-empty">
                    <div
                        className="w-20 h-20 grid place-items-center mx-auto mb-6"
                        style={{
                            background: "#fff",
                            color: PT.green,
                            border: "1px solid rgba(10,10,10,0.06)",
                            boxShadow: `0 1px 2px rgba(10,10,10,0.04), 0 12px 30px -14px ${PT.green}40, 0 6px 16px -10px rgba(10,10,10,0.10)`,
                            borderRadius: 999,
                        }}
                    >
                        <Bell size={26} strokeWidth={2.0} />
                    </div>
                    <p className="font-mono font-bold uppercase mb-3" style={{ fontSize: 10.5, letterSpacing: "0.22em", color: "rgba(10,10,10,0.42)" }}>
                        Em silêncio
                    </p>
                    <h3
                        className="font-black tracking-[-0.025em] leading-tight"
                        style={{ fontSize: "clamp(22px, 3vw, 28px)", color: PT.ink }}
                    >
                        Vais saber <Highlight color={PT.green}>aqui</Highlight> quando alguém te responder.
                    </h3>
                    <p className="mt-4 text-[14px] font-medium max-w-md mx-auto" style={{ color: "rgba(10,10,10,0.6)" }}>
                        Diz olá a alguém para começar a conversa.
                    </p>
                    <div className="mt-6 flex items-center justify-center gap-3 flex-wrap">
                        <Link
                            to="/explore"
                            data-testid="notif-empty-explore"
                            className="px-5 py-2.5 rounded-full text-[13px] font-bold uppercase tracking-wider transition tap-shrink"
                            style={{ background: PT.ink, color: "#fff" }}
                        >
                            Explorar pessoas →
                        </Link>
                        <Link
                            to="/messages"
                            data-testid="notif-empty-messages"
                            className="px-5 py-2.5 rounded-full text-[13px] font-bold uppercase tracking-wider transition tap-shrink"
                            style={{ background: "transparent", color: PT.ink, border: `1.5px solid ${PT.ink}` }}
                        >
                            Enviar uma mensagem
                        </Link>
                    </div>
                </div>
            ) : (
                grouped.map(([day, list]) => (
                    <div key={day}>
                        <div
                            className="px-4 lg:px-5 py-2 sticky top-[calc(var(--mobile-topbar-h)+108px)] lg:top-[150px] backdrop-blur z-10"
                            style={{
                                background: "rgba(247,245,239,0.92)",
                                borderBottom: "1px solid rgba(10,10,10,0.10)",
                                borderTop: "1px solid rgba(10,10,10,0.10)",
                            }}
                        >
                            <span
                                className="font-mono font-bold uppercase"
                                style={{ fontSize: 10.5, letterSpacing: "0.22em", color: "rgba(10,10,10,0.50)" }}
                            >
                                {dayLabel(day)}
                            </span>
                        </div>
                        {list.map((n) => {
                            const linkTo = n.post_id ? `/post/${n.post_id}` : `/u/${n.from_user?.username}`;
                            const canReply = (n.type === "comment" || n.type === "mention" || n.type === "reply") && !!n.post_id;
                            const isReplying = replyTo === n.id;
                            const isExpanded = contextFor === n.id;
                            const ctx = n.post_id ? postContexts[n.post_id] : null;
                            return (
                                <div
                                    key={n.id}
                                    data-testid={`notification-${n.id}`}
                                    className="group transition-colors"
                                    style={{
                                        borderBottom: "1px solid rgba(10,10,10,0.08)",
                                        background: n.read ? "transparent" : "rgba(255,204,41,0.10)",
                                    }}
                                >
                                    <div className="flex items-start gap-3 px-4 lg:px-5 py-4">
                                        <TypeStamp type={n.type} size={38} />
                                        <Link to={linkTo} className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <Avatar user={n.from_user} size={28} />
                                                <span className="font-black text-[14px] tracking-tight flex items-center gap-1 truncate" style={{ color: PT.ink }}>
                                                    {n.from_user?.name}
                                                    {n.from_user?.verified && <VerifiedBadge size={11} />}
                                                </span>
                                                <span className="font-mono font-bold text-[10px] flex-shrink-0 ml-auto" style={{ color: "rgba(10,10,10,0.5)" }}>
                                                    {smartTime(n.created_at)}
                                                </span>
                                                {!n.read && (
                                                    <span
                                                        className="w-2 h-2 flex-shrink-0"
                                                        style={{
                                                            background: PT.red,
                                                            border: `1.5px solid ${PT.ink}`,
                                                            borderRadius: 999,
                                                        }}
                                                        aria-label="não lida"
                                                    />
                                                )}
                                            </div>
                                            <p className="mt-1.5 text-[13.5px] leading-relaxed line-clamp-2 font-medium" style={{ color: "rgba(10,10,10,0.72)" }}>
                                                {n.text}
                                            </p>
                                            <NotificationReplyPreview notif={n} />
                                        </Link>
                                        <div className="flex flex-col gap-1 opacity-70 group-hover:opacity-100 transition">
                                            {canReply && (
                                                <button
                                                    onClick={() => { setReplyTo(isReplying ? null : n.id); setReplyText(""); }}
                                                    data-testid={`notif-reply-${n.id}`}
                                                    title="Responder rápido"
                                                    className="w-7 h-7 grid place-items-center"
                                                    style={{
                                                        background: isReplying ? PT.azul : "#fff",
                                                        color: isReplying ? "#fff" : PT.ink,
                                                        border: "1px solid rgba(10,10,10,0.10)",
                                                        boxShadow: "0 1px 2px rgba(10,10,10,0.05), 0 8px 20px -10px rgba(10,10,10,0.15)",
                                                        borderRadius: 6,
                                                    }}
                                                >
                                                    <Reply size={12} strokeWidth={2.4} />
                                                </button>
                                            )}
                                            {n.post_id && (
                                                <button
                                                    onClick={() => openContext(n)}
                                                    data-testid={`notif-context-${n.id}`}
                                                    title="Ver contexto"
                                                    className="w-7 h-7 grid place-items-center"
                                                    style={{
                                                        background: isExpanded ? PT.ink : "#fff",
                                                        color: isExpanded ? "#fff" : PT.ink,
                                                        border: "1px solid rgba(10,10,10,0.10)",
                                                        boxShadow: "0 1px 2px rgba(10,10,10,0.05), 0 8px 20px -10px rgba(10,10,10,0.15)",
                                                        borderRadius: 6,
                                                    }}
                                                >
                                                    <Eye size={12} strokeWidth={2.4} />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => toggleStar(n)}
                                                data-testid={`notif-star-${n.id}`}
                                                title={n.starred ? "Desmarcar" : "Importante"}
                                                className="w-7 h-7 grid place-items-center"
                                                style={{
                                                    background: n.starred ? PT.gold : "#fff",
                                                    color: PT.ink,
                                                    border: "1px solid rgba(10,10,10,0.10)",
                                                    boxShadow: "0 1px 2px rgba(10,10,10,0.05), 0 8px 20px -10px rgba(10,10,10,0.15)",
                                                    borderRadius: 6,
                                                }}
                                            >
                                                <Star size={12} strokeWidth={2.4} fill={n.starred ? "currentColor" : "none"} />
                                            </button>
                                            <button
                                                onClick={() => snooze(n)}
                                                data-testid={`notif-snooze-${n.id}`}
                                                title="Silenciar 24h"
                                                className="w-7 h-7 grid place-items-center"
                                                style={{
                                                    background: "#fff",
                                                    color: PT.ink,
                                                    border: "1px solid rgba(10,10,10,0.10)",
                                                    boxShadow: "0 1px 2px rgba(10,10,10,0.05), 0 8px 20px -10px rgba(10,10,10,0.15)",
                                                    borderRadius: 6,
                                                }}
                                            >
                                                <BellOff size={12} strokeWidth={2.4} />
                                            </button>
                                            <button
                                                onClick={() => muteCategory(n.type)}
                                                data-testid={`notif-mute-cat-${n.id}`}
                                                title={`Silenciar todos os "${n.type}"`}
                                                className="w-7 h-7 grid place-items-center"
                                                style={{
                                                    background: "#fff",
                                                    color: "rgba(10,10,10,0.55)",
                                                    border: "1px solid rgba(10,10,10,0.08)",
                                                    borderRadius: 6,
                                                }}
                                            >
                                                <BellOff size={10} strokeWidth={2.4} />
                                            </button>
                                            <button
                                                onClick={() => remove(n)}
                                                data-testid={`notif-delete-${n.id}`}
                                                title="Apagar"
                                                className="w-7 h-7 grid place-items-center"
                                                style={{
                                                    background: "#fff",
                                                    color: PT.red,
                                                    border: "1px solid rgba(10,10,10,0.10)",
                                                    boxShadow: "0 1px 2px rgba(10,10,10,0.05), 0 8px 20px -10px rgba(10,10,10,0.15)",
                                                    borderRadius: 6,
                                                }}
                                            >
                                                <Trash2 size={12} strokeWidth={2.4} />
                                            </button>
                                        </div>
                                    </div>

                                    {isExpanded && ctx && (
                                        <div className="px-5 pb-3 -mt-2 pl-[68px]" data-testid={`notif-context-content-${n.id}`}>
                                            <div
                                                className="px-3 py-2.5 text-[12.5px] font-medium line-clamp-3"
                                                style={{
                                                    background: PT.cream,
                                                    color: "rgba(10,10,10,0.78)",
                                                    border: "1px solid rgba(10,10,10,0.10)",
                                                    boxShadow: "0 1px 2px rgba(10,10,10,0.05), 0 8px 20px -10px rgba(10,10,10,0.15)",
                                                    borderRadius: 10,
                                                }}
                                            >
                                                {ctx.content || "(sem texto)"}
                                            </div>
                                        </div>
                                    )}

                                    {isReplying && (
                                        <div className="px-4 lg:px-5 pb-3 -mt-2 pl-[68px]" data-testid={`notif-reply-form-${n.id}`}>
                                            <div className="flex items-end gap-2">
                                                <textarea
                                                    value={replyText}
                                                    onChange={(e) => setReplyText(e.target.value)}
                                                    placeholder="Responder rapidamente…"
                                                    rows={2}
                                                    maxLength={500}
                                                    data-testid={`notif-reply-input-${n.id}`}
                                                    className="flex-1 px-3 py-2 text-[13px] outline-none resize-none font-medium"
                                                    style={{
                                                        background: "#fff",
                                                        color: PT.ink,
                                                        border: "1px solid rgba(10,10,10,0.10)",
                                                        boxShadow: "0 1px 2px rgba(10,10,10,0.05), 0 8px 20px -10px rgba(10,10,10,0.15)",
                                                        borderRadius: 10,
                                                    }}
                                                />
                                                <button
                                                    onClick={() => sendQuickReply(n)}
                                                    disabled={replyBusy || !replyText.trim()}
                                                    data-testid={`notif-reply-send-${n.id}`}
                                                    className="px-3 h-10 text-[11.5px] inline-flex items-center gap-1.5 font-black uppercase disabled:opacity-40"
                                                    style={{
                                                        background: PT.red,
                                                        color: "#fff",
                                                        border: "1px solid rgba(10,10,10,0.10)",
                                                        boxShadow: "0 1px 2px rgba(10,10,10,0.05), 0 8px 20px -10px rgba(10,10,10,0.15)",
                                                        borderRadius: 999,
                                                        letterSpacing: "0.06em",
                                                    }}
                                                >
                                                    <Send size={12} strokeWidth={2.5} /> {replyBusy ? "…" : "Enviar"}
                                                </button>
                                                <button
                                                    onClick={() => { setReplyTo(null); setReplyText(""); }}
                                                    data-testid={`notif-reply-cancel-${n.id}`}
                                                    className="w-10 h-10 grid place-items-center tap-shrink"
                                                    style={{
                                                        background: "#fff",
                                                        color: PT.ink,
                                                        border: "1px solid rgba(10,10,10,0.10)",
                                                        boxShadow: "0 1px 2px rgba(10,10,10,0.05), 0 8px 20px -10px rgba(10,10,10,0.15)",
                                                        borderRadius: 999,
                                                    }}
                                                >
                                                    <X size={13} strokeWidth={2.5} />
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
        </PtPageShell>
    );
}
