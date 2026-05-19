import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
    Send, ArrowLeft, MessageCircle, Search, Pin, Archive, ArchiveRestore,
    X, Check, CheckCheck, Plus, MapPin, MoreHorizontal,
    Smile, Reply, Edit3, Copy, Forward, Trash2, BellOff, Image as ImageIcon,
    Sparkles, MailWarning, Images,
} from "lucide-react";
import { api, toastApiError } from "../lib/api";
import { Avatar } from "../components/Avatar";
import { ConvSkeleton } from "../components/Skeleton";
import { PageHeader } from "../components/PageHeader";
import { Spinner } from "../components/Spinner";
import { smartTime } from "../lib/time";
import { useLiveTime } from "../hooks/useLiveTime";
import { useAuth } from "../context/AuthContext";
import { useWsMessages, useWsState } from "../components/WebSocketProvider";
import { useConversationsPulse, refreshConversationsPulse } from "../hooks/useConversationsPulse";
import { toast } from "sonner";
import { confirmDialog, promptDialog } from "../components/ConfirmDialog";

const QUICK_REACT = ["❤️", "🔥", "😂", "😢", "👏", "🤔", "✨"];
const VIBES = ["👋", "❤️", "🔥", "🥹", "✨", "🌸", "☕", "🌙", "🍷"];

const FILTERS = [
    { key: "all",      label: "Tudo" },
    { key: "unread",   label: "Não lidas" },
    { key: "pinned",   label: "Fixadas" },
    { key: "archived", label: "Arquivadas" },
];

// ----------------------------------------------------------------------
// New-conversation search modal
// ----------------------------------------------------------------------
function NewConversationModal({ open, onClose, onPick }) {
    const [q, setQ] = useState("");
    const [results, setResults] = useState([]);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!open) { setQ(""); setResults([]); return; }
    }, [open]);

    useEffect(() => {
        if (!q.trim() || q.trim().length < 1) { setResults([]); return; }
        const t = setTimeout(async () => {
            setBusy(true);
            try {
                const { data } = await api.get(`/users/search?q=${encodeURIComponent(q.trim())}`);
                setResults(data || []);
            } catch { /* silent */ } finally { setBusy(false); }
        }, 220);
        return () => clearTimeout(t);
    }, [q]);

    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[90]" data-testid="new-conversation-modal">
            <button aria-label="Fechar" onClick={onClose} className="absolute inset-0 bg-black/45 backdrop-blur-sm" data-testid="new-conv-overlay" />
            <div className="relative max-w-[460px] mx-auto mt-[10vh] bg-white rounded-2xl shadow-2xl border border-black/[0.06] overflow-hidden anim-pop">
                <div className="flex items-center gap-3 px-4 py-3 hairline-b">
                    <Search size={16} className="text-black/45" />
                    <input
                        autoFocus value={q} onChange={(e) => setQ(e.target.value)}
                        placeholder="Procurar pessoa (nome ou @user)…"
                        data-testid="new-conv-search-input"
                        className="flex-1 bg-transparent outline-none text-[14.5px] placeholder:text-black/40"
                    />
                    <button onClick={onClose} data-testid="new-conv-close" className="text-black/50 hover:text-black tap-shrink" aria-label="Fechar">
                        <X size={16} />
                    </button>
                </div>
                <div className="max-h-[60vh] overflow-y-auto">
                    {busy && <p className="px-4 py-3 text-[12.5px] text-black/45 font-mono">A pesquisar…</p>}
                    {!busy && q.trim() && results.length === 0 && (
                        <p className="px-4 py-6 text-[13px] text-black/55 text-center">Sem resultados para “{q}”.</p>
                    )}
                    {!busy && !q.trim() && (
                        <p className="px-4 py-6 text-[12.5px] text-black/50 leading-relaxed text-center">
                            Escreve o nome ou @username de quem queres falar.
                            <br /><span className="text-black/35">Não precisas de se seguirem mutuamente.</span>
                        </p>
                    )}
                    {results.map((u) => (
                        <button key={u.id} onClick={() => onPick(u)} data-testid={`new-conv-pick-${u.username}`}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-black/[0.03] transition text-left">
                            <Avatar user={u} size={40} showOnline />
                            <div className="flex-1 min-w-0">
                                <div className="font-semibold text-[14px] text-black tracking-tight truncate">{u.name}</div>
                                <div className="text-[12px] text-black/50 font-mono truncate">
                                    @{u.username}
                                    {u.city && <span className="ml-2 text-black/40">· {u.city}</span>}
                                </div>
                            </div>
                            <span className="text-[11.5px] text-black/40 font-mono">enviar →</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ----------------------------------------------------------------------
// Forward modal — pick a person to forward a message
// ----------------------------------------------------------------------
function ForwardModal({ message, onClose, onForwarded }) {
    const [q, setQ] = useState("");
    const [results, setResults] = useState([]);
    const [busy, setBusy] = useState(false);
    const [sending, setSending] = useState(false);

    useEffect(() => {
        if (!q.trim()) { setResults([]); return; }
        const t = setTimeout(async () => {
            setBusy(true);
            try {
                const { data } = await api.get(`/users/search?q=${encodeURIComponent(q.trim())}`);
                setResults(data || []);
            } catch { /* silent */ } finally { setBusy(false); }
        }, 220);
        return () => clearTimeout(t);
    }, [q]);

    const forward = async (u) => {
        if (sending) return;
        setSending(true);
        try {
            await api.post("/messages/forward", { to_user_id: u.id, message_id: message.id });
            toast.success(`Reencaminhado a @${u.username}`);
            onForwarded?.(u);
            onClose();
        } catch (e) { toastApiError(e); } finally { setSending(false); }
    };

    return (
        <div className="fixed inset-0 z-[300] bg-black/45 backdrop-blur-sm grid place-items-center p-4 anim-fade-up">
            <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3 hairline-b">
                    <div>
                        <p className="type-overline">Reencaminhar</p>
                        <h3 className="font-display text-[18px] tracking-tight">Para quem?</h3>
                    </div>
                    <button onClick={onClose} className="text-black/40 hover:text-black tap-shrink"><X size={18} /></button>
                </div>
                <div className="px-5 py-3 hairline-b">
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/45" />
                        <input
                            autoFocus value={q} onChange={(e) => setQ(e.target.value)}
                            placeholder="Procurar pessoa…"
                            className="w-full bg-black/[0.04] border border-transparent rounded-full pl-9 pr-3 py-2 text-[13.5px] focus:bg-white focus:border-black/15 outline-none transition"
                        />
                    </div>
                </div>
                <div className="max-h-[50vh] overflow-y-auto px-2 py-2">
                    {busy && <p className="px-4 py-2 text-[12.5px] text-black/45 font-mono">A pesquisar…</p>}
                    {results.map((u) => (
                        <button key={u.id} onClick={() => forward(u)} disabled={sending}
                            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-black/[0.04] rounded-xl text-left transition disabled:opacity-50">
                            <Avatar user={u} size={36} />
                            <div className="flex-1 min-w-0">
                                <div className="font-semibold text-[13.5px] truncate">{u.name}</div>
                                <div className="text-[11.5px] text-black/50 font-mono truncate">@{u.username}</div>
                            </div>
                            <Forward size={14} className="text-black/40" />
                        </button>
                    ))}
                    {!busy && q.trim() && results.length === 0 && (
                        <p className="text-center text-[12.5px] text-black/45 py-6">Sem resultados.</p>
                    )}
                </div>
            </div>
        </div>
    );
}

// ----------------------------------------------------------------------
// Media gallery modal — shows shared images in a conversation
// ----------------------------------------------------------------------
function MediaGallery({ otherUserId, onClose }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [focused, setFocused] = useState(null);

    useEffect(() => {
        (async () => {
            try {
                const { data } = await api.get(`/conversations/${otherUserId}/media`);
                setItems(data.items || []);
            } catch { /* ignore */ } finally { setLoading(false); }
        })();
    }, [otherUserId]);

    return (
        <div className="fixed inset-0 z-[300] bg-black/60 backdrop-blur-sm anim-fade-up" onClick={onClose}>
            <div className="absolute inset-x-0 top-0 px-4 py-3 flex items-center justify-between text-white">
                <div>
                    <p className="type-overline opacity-80">Media partilhada</p>
                    <h3 className="font-display text-[18px]">{items.length} {items.length === 1 ? "ficheiro" : "ficheiros"}</h3>
                </div>
                <button onClick={onClose} className="w-9 h-9 grid place-items-center rounded-full bg-white/15 hover:bg-white/25"><X size={18} /></button>
            </div>
            <div onClick={(e) => e.stopPropagation()} className="absolute inset-x-0 top-16 bottom-0 overflow-y-auto px-3 pb-6">
                {loading ? (
                    <p className="text-white/60 font-mono text-center mt-12">A carregar…</p>
                ) : items.length === 0 ? (
                    <p className="text-white/70 text-center mt-12">Sem imagens partilhadas ainda.</p>
                ) : (
                    <div className="grid grid-cols-3 gap-1.5">
                        {items.map((it) => (
                            <button key={it.id} onClick={() => setFocused(it)}
                                className="aspect-square rounded-lg overflow-hidden bg-black/40 hover:opacity-80 transition">
                                {it.image && <img src={it.image} alt="" className="w-full h-full object-cover" />}
                            </button>
                        ))}
                    </div>
                )}
            </div>
            {focused && (
                <div className="absolute inset-0 bg-black/90 grid place-items-center anim-fade-up p-4" onClick={() => setFocused(null)}>
                    <img src={focused.image} alt="" className="max-w-full max-h-[88vh] object-contain" />
                </div>
            )}
        </div>
    );
}

// ----------------------------------------------------------------------
// Conversation list
// ----------------------------------------------------------------------
function ConversationList({ activeId, onSelect, onNew }) {
    const [convs, setConvs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");
    const [q, setQ] = useState("");
    const [onlineUsers, setOnlineUsers] = useState([]);
    const pulse = useConversationsPulse();
    useLiveTime(30000);

    // Load "Online agora" users (moved here from the right sidebar)
    useEffect(() => {
        api.get("/users/suggestions")
            .then((r) => setOnlineUsers((r.data || []).slice(0, 12)))
            .catch(() => {});
    }, []);

    const load = useCallback(async () => {
        try {
            const { data } = await api.get(`/conversations?filter=${filter}`);
            setConvs(data);
        } catch { /* silent */ } finally { setLoading(false); }
    }, [filter]);

    useEffect(() => {
        load();
        const tick = () => { if (!document.hidden) load(); };
        const id = setInterval(tick, 5000);
        return () => clearInterval(id);
    }, [load]);

    // B-041 — Realtime: refresh the conversation list when a new message
    // arrives or a read receipt comes in. Light-weight: just call load().
    const onWs = useCallback((evt) => {
        if (!evt || (evt.type !== "new_message" && evt.type !== "message_read" && evt.type !== "message_read_bulk")) return;
        load();
        refreshConversationsPulse();
    }, [load]);
    useWsMessages(onWs);

    const filtered = useMemo(() => {
        if (!q.trim()) return convs;
        const n = q.toLowerCase();
        return convs.filter((c) =>
            ((c.other_user?.name || "") + " " + (c.other_user?.username || "") + " " + (c.last_message || ""))
                .toLowerCase().includes(n),
        );
    }, [q, convs]);

    const [rowMenu, setRowMenu] = useState(null);
    const rowMenuRef = useRef(null);
    useEffect(() => {
        const onDoc = (e) => {
            if (rowMenuRef.current && !rowMenuRef.current.contains(e.target)) setRowMenu(null);
        };
        if (rowMenu) {
            document.addEventListener("mousedown", onDoc);
            return () => document.removeEventListener("mousedown", onDoc);
        }
    }, [rowMenu]);

    const togglePin = async (c, e) => {
        e.stopPropagation();
        setRowMenu(null);
        try { await api.post(`/conversations/${c.other_user.id}/pin`); load(); }
        catch (e2) { toastApiError(e2); }
    };
    const toggleArchive = async (c, e) => {
        e.stopPropagation();
        setRowMenu(null);
        try { await api.post(`/conversations/${c.other_user.id}/archive`); load(); }
        catch (e2) { toastApiError(e2); }
    };
    const markUnread = async (c, e) => {
        e.stopPropagation();
        setRowMenu(null);
        try {
            const { data } = await api.post(`/conversations/${c.other_user.id}/mark-unread`);
            if (data.marked) toast.success("Marcada como não lida");
            else toast("Sem mensagens recebidas para marcar");
            load();
        } catch (e2) { toastApiError(e2); }
    };

    return (
        <div data-testid="conversations-list">
            {/* Activity pulse header — "X conversas ativas agora" (subtle, atmospheric) */}
            {pulse.active_total >= 2 && (
                <div
                    className="px-4 lg:px-5 pt-3 pb-2 flex items-center gap-2 hairline-b"
                    data-testid="dms-activity-pulse"
                >
                    <span className="relative inline-flex w-1.5 h-1.5">
                        <span className="absolute inset-0 rounded-full bg-emerald-500/85 anim-live-dot" />
                    </span>
                    <p className="type-overline text-black/55 m-0">
                        {pulse.active_total >= 12
                            ? "muitas conversas ativas agora"
                            : pulse.active_total >= 6
                            ? "várias conversas ativas agora"
                            : `${pulse.active_total} conversas ativas agora`}
                    </p>
                    {pulse.typing_set.size > 0 && (
                        <>
                            <span className="text-black/15 select-none" aria-hidden>·</span>
                            <span className="font-mono text-[10.5px] uppercase tracking-wider text-emerald-700/75">
                                {pulse.typing_set.size === 1
                                    ? "alguém a escrever"
                                    : `${Math.min(pulse.typing_set.size, 9)} a escrever`}
                            </span>
                        </>
                    )}
                </div>
            )}

            {/* Online agora — moved here from the global right sidebar */}
            {onlineUsers.length > 0 && (
                <div className="px-3 lg:px-4 pt-3 pb-2 hairline-b" data-testid="dms-online-now">
                    <div className="flex items-center justify-between mb-2">
                        <p className="type-overline inline-flex items-center gap-1.5">
                            <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: "var(--eu-500)" }} />
                            Online agora
                        </p>
                        <span className="font-mono text-[10.5px] text-black/40">{onlineUsers.length}</span>
                    </div>
                    <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-3 lg:-mx-4 px-3 lg:px-4 pb-1">
                        {onlineUsers.map((u) => (
                            <button
                                key={u.id}
                                onClick={() => onSelect(u)}
                                data-testid={`dms-online-${u.username}`}
                                title={`Mensagem para @${u.username}`}
                                className="relative flex-shrink-0 tap-shrink group"
                            >
                                <Avatar user={u} size={44} className="ring-2 ring-white" />
                                <span
                                    className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white"
                                    style={{ background: "var(--eu-500)" }}
                                />
                                <span className="block mt-1 font-mono text-[10px] text-black/55 max-w-[48px] truncate text-center group-hover:text-black transition">
                                    @{u.username}
                                </span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="px-3 lg:px-4 py-2.5 hairline-b flex items-center gap-2">
                <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40" />
                    <input
                        value={q} onChange={(e) => setQ(e.target.value)}
                        placeholder="Pesquisar conversa…" data-testid="messages-search"
                        className="w-full bg-black/[0.04] border border-transparent rounded-full pl-9 pr-9 py-2 text-[13px] focus:bg-white focus:border-black/15 outline-none transition"
                    />
                    {q && (
                        <button onClick={() => setQ("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-black/40"><X size={13} /></button>
                    )}
                </div>
                <button onClick={onNew} data-testid="messages-new-btn"
                    className="shrink-0 h-9 pl-2.5 pr-3.5 rounded-full inline-flex items-center gap-1.5 text-white tap-shrink shadow-sm"
                    style={{ background: "linear-gradient(135deg, #4a7bbf 0%, #6a91cc 45%, #df8a7d 100%)" }}
                    title="Nova conversa" aria-label="Nova conversa">
                    <Plus size={15} strokeWidth={2.3} />
                    <span className="text-[12px] font-semibold tracking-tight">Nova</span>
                </button>
            </div>
            <div className="px-3 lg:px-4 pb-2 flex gap-1.5 overflow-x-auto scrollbar-hide">
                {FILTERS.map((f) => (
                    <button key={f.key} onClick={() => setFilter(f.key)} data-testid={`messages-filter-${f.key}`}
                        className={`shrink-0 px-3 py-1.5 rounded-full text-[12px] font-medium transition ${
                            filter === f.key ? "chip-filter-on" : "bg-black/[0.04] text-black hover:bg-black/[0.08]"
                        }`}>
                        {f.label}
                    </button>
                ))}
            </div>
            {loading ? (
                <ConvSkeleton />
            ) : filtered.length === 0 ? (
                <div className="px-6 py-20 text-center anim-fade-up">
                    <div className="ring-silver w-20 h-20 rounded-full grid place-items-center mx-auto mb-6">
                        <MessageCircle size={26} strokeWidth={1.4} className="text-black/70" />
                    </div>
                    <p className="type-overline mb-2">Sem conversas</p>
                    <h3 className="font-display text-[19px] font-bold tracking-tight text-black">
                        {filter === "all" ? "Sem mensagens ainda" : "Vazio neste filtro"}
                    </h3>
                    <p className="text-black/55 text-sm mt-2 max-w-[34ch] mx-auto leading-relaxed">
                        {filter === "all"
                            ? "Começa uma conversa com alguém. Sem read receipts forçados."
                            : "Não há nada para mostrar aqui agora."}
                    </p>
                    {filter === "all" && (
                        <button onClick={onNew} data-testid="messages-empty-cta"
                            className="mt-6 btn-obsidian text-[12px] px-5 py-2.5 inline-flex items-center gap-1.5">
                            <Plus size={13} /> Nova conversa
                        </button>
                    )}
                </div>
            ) : (
                filtered.map((c) => {
                    // "Conversa viva" — only when the other person is online AND the
                    // last message is fresh (< 5 min). Subtle halo, not a counter.
                    const lastTs = c.last_at ? new Date(c.last_at).getTime() : 0;
                    const isLive = !!c.other_user?.online && lastTs && (Date.now() - lastTs) < 5 * 60 * 1000;
                    const peerId = c.other_user?.id;
                    const isTyping = peerId && pulse.typing_set.has(peerId);
                    const isRecent = peerId && pulse.recent_set.has(peerId);
                    const showHalo = isLive || isTyping || isRecent;
                    return (
                    <div key={c.key} data-testid={`conversation-${c.other_user?.username}`}
                        role="button" tabIndex={0}
                        className={`group w-full flex items-center gap-3 p-4 hairline-b hover:bg-black/[0.015] transition cursor-pointer text-left relative ${
                            activeId === c.other_user?.id ? "bg-black/[0.025]" : ""
                        } ${showHalo ? "conv-halo-live" : ""}`}
                        onClick={() => c.other_user && onSelect(c.other_user)}
                        onKeyDown={(e) => {
                            if ((e.key === "Enter" || e.key === " ") && c.other_user) {
                                e.preventDefault();
                                onSelect(c.other_user);
                            }
                        }}>
                        <Avatar user={c.other_user} size={48} showOnline />
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                                <div className="font-heading font-medium tracking-tight text-[15px] truncate text-black flex items-center gap-1.5">
                                    {c.pinned && <Pin size={11} className="text-amber-500" fill="currentColor" />}
                                    {c.other_user?.name}
                                </div>
                                <span className="font-mono text-[10px] text-black/45 flex-shrink-0">{smartTime(c.last_at)}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                                <div className={`text-[13px] truncate flex-1 ${c.unread > 0 ? "text-black font-medium" : "text-black/55"}`}>
                                    {isTyping ? (
                                        <span
                                            className="inline-flex items-center gap-1.5 text-emerald-700/85 font-mono text-[12px]"
                                            data-testid={`conv-typing-${c.other_user?.username}`}
                                        >
                                            está a escrever
                                            <span className="typing-dots inline-flex gap-0.5" aria-hidden>
                                                <span /><span /><span />
                                            </span>
                                        </span>
                                    ) : (
                                        c.last_message || "—"
                                    )}
                                </div>
                                {c.unread > 0 && (
                                    <span data-testid={`conv-unread-${c.other_user?.username}`}
                                        className="min-w-[20px] h-[20px] px-1.5 rounded-full text-[10px] font-mono grid place-items-center text-white font-bold"
                                        style={{ background: "linear-gradient(135deg, #df8a7d 0%, #c64a3d 100%)" }}>
                                        {c.unread > 99 ? "99+" : c.unread}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="hidden sm:flex items-center opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition relative" ref={rowMenu === c.key ? rowMenuRef : null}>
                            <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setRowMenu(rowMenu === c.key ? null : c.key); }}
                                data-testid={`conv-more-${c.other_user?.username}`}
                                title="Mais ações"
                                aria-label="Mais ações"
                                aria-haspopup="menu"
                                aria-expanded={rowMenu === c.key}
                                className="w-7 h-7 grid place-items-center rounded-full hover:bg-black/[0.06] text-black/55"
                            >
                                <MoreHorizontal size={14} />
                            </button>
                            {rowMenu === c.key && (
                                <div
                                    onClick={(e) => e.stopPropagation()}
                                    className="absolute right-0 top-9 z-30 bg-white rounded-2xl shadow-xl border border-black/[0.06] py-1.5 w-52 anim-fade-up"
                                    role="menu"
                                >
                                    <BubbleMenuRow
                                        onClick={(e) => togglePin(c, e)}
                                        icon={Pin}
                                        label={c.pinned ? "Desafixar conversa" : "Fixar conversa"}
                                    />
                                    <BubbleMenuRow
                                        onClick={(e) => toggleArchive(c, e)}
                                        icon={c.archived ? ArchiveRestore : Archive}
                                        label={c.archived ? "Desarquivar conversa" : "Arquivar conversa"}
                                    />
                                    <BubbleMenuRow
                                        onClick={(e) => markUnread(c, e)}
                                        icon={MailWarning}
                                        label="Marcar como não lida"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                    );
                })
            )}
        </div>
    );
}

// ----------------------------------------------------------------------
// Date helpers
// ----------------------------------------------------------------------
function dayKey(iso) {
    if (!iso) return "";
    try { return new Date(iso).toDateString(); } catch { return ""; }
}
function dayLabel(iso) {
    if (!iso) return "";
    try {
        const d = new Date(iso);
        const today = new Date();
        const yest = new Date(today.getTime() - 24 * 3600 * 1000);
        if (d.toDateString() === today.toDateString()) return "Hoje";
        if (d.toDateString() === yest.toDateString()) return "Ontem";
        return d.toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long" });
    } catch { return ""; }
}

// ----------------------------------------------------------------------
// Message bubble — with full action menu
// ----------------------------------------------------------------------
function MessageBubble({ m, mine, isLastMine, otherName, viewerId, onReply, onReact, onCopy, onEdit, onDelete, onForward, scrollIntoView }) {
    const [menuOpen, setMenuOpen] = useState(false);
    const [reactOpen, setReactOpen] = useState(false);
    const [editing, setEditing] = useState(false);
    const [editText, setEditText] = useState(m.content);
    const [editBusy, setEditBusy] = useState(false);
    const menuRef = useRef(null);
    const reactRef = useRef(null);
    const longPressTimer = useRef(null);

    useEffect(() => { setEditText(m.content); }, [m.content]);

    useEffect(() => {
        const onDoc = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
            if (reactRef.current && !reactRef.current.contains(e.target)) setReactOpen(false);
        };
        if (menuOpen || reactOpen) {
            document.addEventListener("mousedown", onDoc);
            return () => document.removeEventListener("mousedown", onDoc);
        }
    }, [menuOpen, reactOpen]);

    const onPressStart = () => {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = setTimeout(() => setReactOpen(true), 380);
    };
    const onPressEnd = () => clearTimeout(longPressTimer.current);

    const saveEdit = async () => {
        const t = editText.trim();
        if (!t || t === m.content) { setEditing(false); return; }
        setEditBusy(true);
        try {
            await onEdit(m, t);
            setEditing(false);
        } catch { /* handled */ } finally { setEditBusy(false); }
    };

    // Reactions: stored as { user_id: emoji }
    const reactionMap = m.reactions || {};
    const reactionGroups = useMemo(() => {
        const groups = {};
        Object.entries(reactionMap).forEach(([uid, emoji]) => {
            if (!groups[emoji]) groups[emoji] = { count: 0, reacted: false };
            groups[emoji].count++;
            if (uid === viewerId) groups[emoji].reacted = true;
        });
        return Object.entries(groups).sort((a, b) => b[1].count - a[1].count);
    }, [reactionMap, viewerId]);

    const handleDoubleClick = () => {
        // Double-tap to react with default heart
        onReact(m, "❤️");
    };

    const renderContent = () => {
        if (m.kind === "image" && m.image) {
            return (
                <div className="space-y-1.5">
                    <img src={m.image} alt="" className="rounded-xl max-w-[280px] max-h-[320px] object-cover" />
                    {m.content && m.content !== "📷 Imagem" && <div>{m.content}</div>}
                </div>
            );
        }
        if (m.kind === "location" && m.location) {
            return (
                <div className="flex items-center gap-2">
                    <span className="text-[18px]">📍</span>
                    <span>{m.location.label || "Localização partilhada"}</span>
                </div>
            );
        }
        if (m.kind === "vibe") {
            return <div className="text-[36px] leading-none">{m.content}</div>;
        }
        return m.content;
    };

    return (
        <div id={`m-${m.id}`} className={`flex ${mine ? "justify-end" : "justify-start"} group relative`}>
            <div className="flex flex-col items-end max-w-[78%]">
                {/* Reply quote */}
                {m._replyTo && (
                    <button
                        onClick={() => scrollIntoView(m._replyTo.id)}
                        className={`text-[11.5px] px-3 py-1 rounded-t-xl border-l-2 max-w-full text-left truncate ${
                            mine ? "border-white/40 bg-black/20 text-white/80" : "border-black/30 bg-black/[0.04] text-black/60"
                        }`}>
                        ↩ {m._replyTo.content.slice(0, 60)}
                    </button>
                )}
                {m.forwarded_from_user_id && (
                    <div className={`text-[10.5px] font-mono italic mb-0.5 ${mine ? "text-white/60" : "text-black/45"}`}>
                        ↪ reencaminhada
                    </div>
                )}
                <div className="flex items-center gap-1.5 relative">
                    {/* Action menu (hover) */}
                    {!editing && (
                        <div className={`flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition ${mine ? "order-1" : "order-2"}`}>
                            <button
                                ref={reactRef}
                                onClick={() => setReactOpen((o) => !o)}
                                title="Reagir"
                                className="w-7 h-7 grid place-items-center rounded-full bg-white shadow-sm border border-black/[0.06] text-black/65 hover:text-black hover:bg-black/[0.04] relative"
                                data-testid={`msg-react-${m.id}`}
                            >
                                <Smile size={13} />
                                {reactOpen && (
                                    <div
                                        onMouseDown={(e) => e.stopPropagation()}
                                        className="absolute -top-12 left-1/2 -translate-x-1/2 z-50 bg-white rounded-full shadow-xl border border-black/[0.06] flex gap-0.5 px-2 py-1.5 anim-fade-up">
                                        {QUICK_REACT.map((e) => (
                                            <span key={e} onClick={(ev) => { ev.stopPropagation(); setReactOpen(false); onReact(m, e); }}
                                                className="text-[18px] hover:scale-125 transition cursor-pointer px-1">{e}</span>
                                        ))}
                                    </div>
                                )}
                            </button>
                            <button onClick={() => onReply(m)} title="Responder"
                                data-testid={`msg-reply-${m.id}`}
                                className="w-7 h-7 grid place-items-center rounded-full bg-white shadow-sm border border-black/[0.06] text-black/65 hover:text-black hover:bg-black/[0.04]">
                                <Reply size={13} />
                            </button>
                            <div className="relative" ref={menuRef}>
                                <button onClick={() => setMenuOpen((o) => !o)} title="Mais"
                                    data-testid={`msg-more-${m.id}`}
                                    className="w-7 h-7 grid place-items-center rounded-full bg-white shadow-sm border border-black/[0.06] text-black/65 hover:text-black hover:bg-black/[0.04]">
                                    <MoreHorizontal size={13} />
                                </button>
                                {menuOpen && (
                                    <div className={`absolute ${mine ? "right-0" : "left-0"} top-9 z-50 bg-white rounded-2xl shadow-xl border border-black/[0.06] py-1.5 w-48 anim-fade-up`}>
                                        <BubbleMenuRow onClick={() => { setMenuOpen(false); onCopy(m); }} icon={Copy} label="Copiar" />
                                        <BubbleMenuRow onClick={() => { setMenuOpen(false); onForward(m); }} icon={Forward} label="Reencaminhar" />
                                        <BubbleMenuRow onClick={() => { setMenuOpen(false); onReply(m); }} icon={Reply} label="Responder" />
                                        {mine && m.kind !== "vibe" && (
                                            <BubbleMenuRow onClick={() => { setMenuOpen(false); setEditing(true); setEditText(m.content); }} icon={Edit3} label="Editar" />
                                        )}
                                        {mine && (
                                            <BubbleMenuRow onClick={() => { setMenuOpen(false); onDelete(m); }} icon={Trash2} label="Apagar" danger />
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className={mine ? "order-2" : "order-1"}>
                        {editing ? (
                            <div className="flex gap-1.5 items-center">
                                <input
                                    autoFocus value={editText} onChange={(e) => setEditText(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Escape") { setEditing(false); setEditText(m.content); }
                                        if (e.key === "Enter") { e.preventDefault(); saveEdit(); }
                                    }}
                                    data-testid={`msg-edit-input-${m.id}`}
                                    maxLength={2000}
                                    className="bg-white border border-black/30 rounded-2xl px-4 py-2 text-[15px] focus:outline-none min-w-[200px]"
                                />
                                <button onClick={saveEdit} disabled={editBusy} data-testid={`msg-edit-save-${m.id}`}
                                    className="w-8 h-8 rounded-full bg-black text-white grid place-items-center disabled:opacity-40">
                                    {editBusy ? <Spinner size={11} /> : <Check size={14} />}
                                </button>
                                <button onClick={() => { setEditing(false); setEditText(m.content); }}
                                    className="w-8 h-8 rounded-full bg-black/[0.06] text-black/70 grid place-items-center">
                                    <X size={14} />
                                </button>
                            </div>
                        ) : (
                            <div
                                onDoubleClick={handleDoubleClick}
                                onMouseDown={onPressStart} onMouseUp={onPressEnd} onMouseLeave={onPressEnd}
                                onTouchStart={onPressStart} onTouchEnd={onPressEnd}
                                title={new Date(m.created_at).toLocaleString("pt-PT")}
                                className={`px-4 py-2.5 rounded-2xl text-[15px] leading-snug anim-fade-up break-words select-text ${
                                    mine
                                        ? `text-white rounded-br-md shadow-sm ${m._failed ? "bg-red-soft" : ""}`
                                        : "bg-white text-black rounded-bl-md border border-black/[0.08] shadow-[0_2px_8px_-4px_rgba(13,13,16,0.08)]"
                                }`}
                                style={
                                    mine && !m._failed
                                        ? { background: "linear-gradient(135deg, #1a1a1f 0%, #0a0a0a 100%)" }
                                        : undefined
                                }
                                data-testid={`msg-${m.id}`}
                            >
                                {renderContent()}
                                {m.edited_at && (
                                    <span className={`block text-[10px] font-mono mt-1 italic ${mine ? "text-white/55" : "text-black/40"}`}>
                                        editada
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Reaction pills */}
                {reactionGroups.length > 0 && (
                    <div className="flex gap-1 mt-1" data-testid={`msg-reactions-${m.id}`}>
                        {reactionGroups.map(([emoji, info]) => (
                            <button key={emoji} onClick={() => onReact(m, emoji)}
                                className={`inline-flex items-center gap-1 text-[11.5px] font-mono px-2 py-0.5 rounded-full transition ${
                                    info.reacted ? "bg-black text-white" : "bg-white border border-black/[0.08] text-black/70 hover:bg-black/[0.04]"
                                }`}>
                                <span>{emoji}</span><span>{info.count}</span>
                            </button>
                        ))}
                    </div>
                )}

                {mine && isLastMine && (
                    <div className="mt-1 flex items-center gap-1 text-[10.5px] font-mono text-black/45" data-testid={`msg-status-${m.id}`}>
                        {m._pending ? <span>a enviar…</span>
                         : m._failed ? <span className="text-red-soft">por enviar — toca para tentar</span>
                         : m.read ? <><CheckCheck size={12} className="text-[color:var(--coral-500)]" /><span>visto</span></>
                         : <><Check size={12} /><span>enviado</span></>}
                    </div>
                )}
            </div>
            {/* keep otherName accessible to avoid unused */}
            <span className="sr-only">{otherName}</span>
        </div>
    );
}

function BubbleMenuRow({ icon: Icon, label, onClick, danger }) {
    return (
        <button onClick={onClick}
            className={`w-full text-left px-3 py-2 text-[13px] font-mono inline-flex items-center gap-2 transition ${
                danger ? "text-red-600 hover:bg-red-50" : "text-black/75 hover:bg-black/[0.04]"
            }`}>
            <Icon size={13} /> {label}
        </button>
    );
}

// ----------------------------------------------------------------------
// Chat view
// ----------------------------------------------------------------------
function ChatView({ other, onBack }) {
    const { user: me } = useAuth();
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState("");
    const [typing, setTyping] = useState(false);
    const [sending, setSending] = useState(false);
    const [replyTo, setReplyTo] = useState(null);
    const [forwardMsg, setForwardMsg] = useState(null);
    const [galleryOpen, setGalleryOpen] = useState(false);
    const [attachOpen, setAttachOpen] = useState(false);
    const [vibeOpen, setVibeOpen] = useState(false);
    const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
    const headerMenuRef = useRef(null);

    const scrollRef = useRef(null);
    const inputRef = useRef(null);
    const typingTimerRef = useRef(null);
    const lastTypingPingRef = useRef(0);
    const fileInputRef = useRef(null);
    const attachRef = useRef(null);

    const load = useCallback(async () => {
        try {
            const { data } = await api.get(`/messages/${other.id}`);
            setMessages(data.messages || []);
        } catch { /* silent */ }
    }, [other.id]);
    const checkTyping = useCallback(async () => {
        try {
            const { data } = await api.get(`/messages/${other.id}/typing-status`);
            setTyping(!!data.typing);
        } catch { /* silent */ }
    }, [other.id]);

    useEffect(() => {
        load(); checkTyping();
        const id = setInterval(() => {
            if (!document.hidden) { load(); checkTyping(); }
        }, 3000);
        return () => clearInterval(id);
    }, [load, checkTyping]);

    // B-041 — Realtime: append on inbound new_message; update read receipts on outbound.
    const otherId = other.id;
    const onWsChat = useCallback((evt) => {
        if (!evt || typeof evt !== "object") return;
        if (evt.type === "new_message") {
            const m = evt.message;
            if (!m) return;
            // Only react to messages of this conversation
            const involves =
                (m.sender_id === otherId) || (m.recipient_id === otherId);
            if (!involves) return;
            setMessages((arr) => {
                if (arr.some((x) => x.id === m.id)) return arr;
                return [...arr, m];
            });
            // Refresh to auto-mark inbound as read
            load();
        } else if (evt.type === "message_read") {
            // Sender side — flip read indicator
            setMessages((arr) => arr.map((x) => (x.id === evt.message_id ? { ...x, read: true, read_at: new Date().toISOString() } : x)));
        } else if (evt.type === "message_read_bulk") {
            if (evt.by !== otherId) return;
            setMessages((arr) => arr.map((x) => (x.read ? x : { ...x, read: true, read_at: new Date().toISOString() })));
        } else if (evt.type === "typing") {
            // Optional: if backend pushes typing events later
            if (evt.from === otherId) setTyping(true);
        }
    }, [otherId, load]);
    useWsMessages(onWsChat);
    const wsLive = useWsState() === "live";

    useEffect(() => { if (window.innerWidth >= 1024) inputRef.current?.focus(); }, [other.id]);
    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, [messages, typing]);

    useEffect(() => {
        const onDoc = (e) => {
            if (attachRef.current && !attachRef.current.contains(e.target)) {
                setAttachOpen(false); setVibeOpen(false);
            }
            if (headerMenuRef.current && !headerMenuRef.current.contains(e.target)) {
                setHeaderMenuOpen(false);
            }
        };
        if (attachOpen || vibeOpen || headerMenuOpen) {
            document.addEventListener("mousedown", onDoc);
            return () => document.removeEventListener("mousedown", onDoc);
        }
    }, [attachOpen, vibeOpen, headerMenuOpen]);

    const handleType = (v) => {
        setText(v);
        const now = Date.now();
        if (now - lastTypingPingRef.current > 2000) {
            lastTypingPingRef.current = now;
            api.post(`/messages/${other.id}/typing`).catch(() => {});
        }
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        typingTimerRef.current = setTimeout(() => {}, 1500);
    };

    // Resolve reply quote in messages (for showing in bubble)
    const msgsWithReply = useMemo(() => {
        const byId = new Map(messages.map((m) => [m.id, m]));
        return messages.map((m) => {
            if (m.reply_to && byId.has(m.reply_to)) {
                return { ...m, _replyTo: byId.get(m.reply_to) };
            }
            return m;
        });
    }, [messages]);

    const send = async () => {
        const content = text.trim();
        if (!content || sending) return;
        setSending(true);
        setText("");
        const replyId = replyTo?.id || null;
        setReplyTo(null);
        const tempId = `temp_${Date.now()}`;
        const optimistic = {
            id: tempId, sender_id: me?.id, recipient_id: other.id,
            content, kind: "text", reply_to: replyId,
            created_at: new Date().toISOString(), read: false, _pending: true,
        };
        setMessages((m) => [...m, optimistic]);
        try {
            const { data } = await api.post("/messages/v2", {
                to_user_id: other.id, content, kind: "text", reply_to: replyId,
            });
            setMessages((m) => m.map((x) => (x.id === tempId ? data : x)));
        } catch (e) {
            setMessages((m) => m.map((x) => (x.id === tempId ? { ...x, _pending: false, _failed: true } : x)));
            toastApiError(e);
        } finally {
            setSending(false);
            inputRef.current?.focus();
        }
    };

    // Downscale + JPEG-compress images client-side to keep payloads small.
    // Targets: max 1600px on the longest side, JPEG quality 0.82.
    // Returns a data URL (base64) ready to send.
    const compressImage = (file) => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("read_failed"));
        reader.onload = (e) => {
            const img = new Image();
            img.onerror = () => reject(new Error("decode_failed"));
            img.onload = () => {
                try {
                    const MAX = 1600;
                    let { width, height } = img;
                    if (width > MAX || height > MAX) {
                        if (width >= height) { height = Math.round(height * (MAX / width)); width = MAX; }
                        else { width = Math.round(width * (MAX / height)); height = MAX; }
                    }
                    const canvas = document.createElement("canvas");
                    canvas.width = width; canvas.height = height;
                    const ctx = canvas.getContext("2d");
                    ctx.drawImage(img, 0, 0, width, height);
                    // PNG with alpha → keep PNG; otherwise JPEG (smaller).
                    const isPng = (file.type || "").toLowerCase().includes("png");
                    const out = canvas.toDataURL(isPng ? "image/png" : "image/jpeg", 0.82);
                    resolve(out);
                } catch (err) { reject(err); }
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });

    const onPickImage = async (file) => {
        if (!file) return;
        if (file.size > 8 * 1024 * 1024) { toast.error("Imagem demasiado grande (máx 8MB)"); return; }
        let dataUrl;
        try {
            dataUrl = await compressImage(file);
        } catch {
            toast.error("Não foi possível processar a imagem.");
            return;
        }
        const tempId = `temp_${Date.now()}`;
        const optimistic = {
            id: tempId, sender_id: me?.id, recipient_id: other.id,
            content: "📷 Imagem", kind: "image", image: dataUrl,
            created_at: new Date().toISOString(), read: false, _pending: true,
        };
        setMessages((m) => [...m, optimistic]);
        try {
            const { data } = await api.post("/messages/v2", {
                to_user_id: other.id, kind: "image", image: dataUrl,
            });
            setMessages((m) => m.map((x) => (x.id === tempId ? data : x)));
        } catch (er) {
            setMessages((m) => m.map((x) => (x.id === tempId ? { ...x, _pending: false, _failed: true } : x)));
            toastApiError(er);
        }
    };

    const sendLocation = async () => {
        setAttachOpen(false);
        if (!navigator.geolocation) {
            // Fall back to manual prompt
            const label = await promptDialog({
                title: "Partilhar localização",
                description: "O teu dispositivo não suporta geolocalização. Indica manualmente onde estás.",
                label: "Localização",
                placeholder: "Ex: Café A Brasileira, Lisboa",
                maxLength: 120,
                confirmText: "Enviar",
            });
            if (!label) return;
            try {
                await api.post("/messages/v2", { to_user_id: other.id, kind: "location", location: { label } });
                load();
            } catch (e) { toastApiError(e); }
            return;
        }
        toast.info("A obter a tua localização…");
        navigator.geolocation.getCurrentPosition(async (pos) => {
            const label = `📍 ${pos.coords.latitude.toFixed(3)}, ${pos.coords.longitude.toFixed(3)}`;
            try {
                await api.post("/messages/v2", {
                    to_user_id: other.id, kind: "location",
                    location: { label, lat: pos.coords.latitude, lng: pos.coords.longitude },
                });
                load();
            } catch (e) { toastApiError(e); }
        }, () => {
            toast.error("Sem permissão de localização");
        });
    };

    const sendVibe = async (emoji) => {
        setVibeOpen(false);
        const tempId = `temp_${Date.now()}`;
        const optimistic = {
            id: tempId, sender_id: me?.id, recipient_id: other.id,
            content: emoji, kind: "vibe",
            created_at: new Date().toISOString(), read: false, _pending: true,
        };
        setMessages((m) => [...m, optimistic]);
        try {
            const { data } = await api.post("/messages/v2", {
                to_user_id: other.id, kind: "vibe", vibe: emoji,
            });
            setMessages((m) => m.map((x) => (x.id === tempId ? data : x)));
        } catch (e) {
            setMessages((m) => m.map((x) => (x.id === tempId ? { ...x, _pending: false, _failed: true } : x)));
            toastApiError(e);
        }
    };

    const pin = async () => {
        try {
            const { data } = await api.post(`/conversations/${other.id}/pin`);
            toast.success(data.pinned ? "Conversa fixada" : "Desafixada");
        } catch (e) { toastApiError(e); }
    };
    const archive = async () => {
        try {
            const { data } = await api.post(`/conversations/${other.id}/archive`);
            toast.success(data.archived ? "Arquivada" : "Desarquivada");
            if (data.archived) onBack();
        } catch (e) { toastApiError(e); }
    };
    const markUnread = async () => {
        try {
            const { data } = await api.post(`/conversations/${other.id}/mark-unread`);
            if (data.marked) toast.success("Marcada como não lida"); else toast("Nada para marcar");
        } catch (e) { toastApiError(e); }
    };

    const onReactMsg = async (m, emoji) => {
        // Optimistic toggle
        const cur = (m.reactions || {})[me?.id];
        const next = { ...(m.reactions || {}) };
        if (cur === emoji) delete next[me?.id]; else next[me?.id] = emoji;
        setMessages((arr) => arr.map((x) => (x.id === m.id ? { ...x, reactions: next } : x)));
        try {
            const { data } = await api.post(`/messages/${m.id}/react`, { emoji });
            setMessages((arr) => arr.map((x) => (x.id === m.id ? { ...x, reactions: data.reactions } : x)));
        } catch (e) {
            setMessages((arr) => arr.map((x) => (x.id === m.id ? { ...x, reactions: m.reactions || {} } : x)));
            toastApiError(e);
        }
    };
    const onReplyMsg = (m) => {
        setReplyTo(m);
        inputRef.current?.focus();
    };
    const onCopyMsg = async (m) => {
        try {
            await navigator.clipboard.writeText(m.content || "");
            toast.success("Mensagem copiada");
        } catch { toast.error("Não foi possível copiar"); }
    };
    const onEditMsg = async (m, newContent) => {
        try {
            await api.patch(`/messages/${m.id}`, { content: newContent });
            setMessages((arr) => arr.map((x) => (x.id === m.id ? { ...x, content: newContent, edited_at: new Date().toISOString() } : x)));
            toast.success("Mensagem editada");
        } catch (e) { toastApiError(e); throw e; }
    };
    const onDeleteMsg = async (m) => {
        const ok = await confirmDialog({
            title: "Apagar esta mensagem?",
            description: "A mensagem será removida da conversa para ambos.",
            confirmText: "Apagar",
            danger: true,
        });
        if (!ok) return;
        const prev = messages;
        setMessages((arr) => arr.filter((x) => x.id !== m.id));
        try {
            await api.delete(`/messages/${m.id}`);
            toast.success("Mensagem apagada");
        } catch (e) {
            setMessages(prev);
            toastApiError(e);
        }
    };
    const onForwardMsg = (m) => setForwardMsg(m);

    const scrollToMsg = (id) => {
        const el = document.getElementById(`m-${id}`);
        if (el) {
            el.scrollIntoView({ block: "center", behavior: "smooth" });
            el.classList.add("ring-2", "ring-amber-300");
            setTimeout(() => el.classList.remove("ring-2", "ring-amber-300"), 1400);
        }
    };

    // Group messages by day
    const groups = useMemo(() => {
        const out = [];
        let lastDay = "";
        for (const m of msgsWithReply) {
            const d = dayKey(m.created_at);
            if (d !== lastDay) {
                out.push({ kind: "sep", id: `sep_${d}`, label: dayLabel(m.created_at) });
                lastDay = d;
            }
            out.push({ kind: "msg", id: m.id, m });
        }
        return out;
    }, [msgsWithReply]);

    const lastMine = useMemo(() => {
        for (let i = messages.length - 1; i >= 0; i--) {
            if (messages[i].sender_id === me?.id) return messages[i];
        }
        return null;
    }, [messages, me?.id]);

    return (
        <div className="fixed inset-0 lg:relative lg:inset-auto z-50 lg:z-auto flex flex-col bg-white lg:h-screen" data-testid="chat-view">
            {/* Header */}
            <div className="glass border-b border-black/[0.06] px-3 lg:px-4 py-3 flex items-center gap-3 pt-safe">
                <button onClick={onBack} className="lg:hidden w-9 h-9 rounded-full grid place-items-center text-black/70 hover:bg-black/[0.05] active:scale-90 tap-shrink"
                    aria-label="voltar" data-testid="chat-back">
                    <ArrowLeft size={18} strokeWidth={1.7} />
                </button>
                <Link to={`/u/${other.username}`} className="flex items-center gap-3 flex-1 min-w-0 tap-shrink" data-testid="chat-profile-link">
                    <Avatar user={other} size={38} showOnline />
                    <div className="flex-1 min-w-0">
                        <div className="font-heading font-medium text-[14px] tracking-tight truncate text-black">{other.name}</div>
                        <div className="font-mono text-[11px] truncate">
                            {typing ? (
                                <span className="text-black/65 italic">a escrever…</span>
                            ) : other.online ? (
                                <span className="text-green-soft inline-flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-soft pulse-dot" />online
                                </span>
                            ) : (
                                <span className="text-black/45">
                                    @{other.username}
                                    {other.city && <span className="ml-1.5 text-black/35">· {other.city}</span>}
                                </span>
                            )}
                        </div>
                    </div>
                </Link>
                <div className="relative" ref={headerMenuRef}>
                    <button onClick={() => setHeaderMenuOpen((o) => !o)} data-testid="chat-more-btn"
                        title="Mais ações da conversa"
                        aria-haspopup="menu"
                        aria-expanded={headerMenuOpen}
                        className="h-9 pl-2.5 pr-3 rounded-full inline-flex items-center gap-1.5 bg-black/[0.04] hover:bg-black/[0.08] text-black/70 transition">
                        <MoreHorizontal size={15} />
                        <span className="text-[12px] font-medium tracking-tight hidden sm:inline">Mais</span>
                    </button>
                    {headerMenuOpen && (
                        <div
                            role="menu"
                            onClick={(e) => e.stopPropagation()}
                            className="absolute right-0 top-11 z-50 bg-white rounded-2xl shadow-xl border border-black/[0.06] py-1.5 w-60 anim-fade-up"
                            data-testid="chat-more-menu"
                        >
                            <BubbleMenuRow
                                onClick={() => { setHeaderMenuOpen(false); setGalleryOpen(true); }}
                                icon={Images}
                                label="Ver media partilhada"
                            />
                            <BubbleMenuRow
                                onClick={() => { setHeaderMenuOpen(false); markUnread(); }}
                                icon={MailWarning}
                                label="Marcar como não lida"
                            />
                            <BubbleMenuRow
                                onClick={() => { setHeaderMenuOpen(false); pin(); }}
                                icon={Pin}
                                label="Fixar / desafixar conversa"
                            />
                            <BubbleMenuRow
                                onClick={() => { setHeaderMenuOpen(false); archive(); }}
                                icon={Archive}
                                label="Arquivar / desarquivar"
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Body */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-1.5 scroll-mom bg-paper grain isolate" data-testid="chat-body">
                {messages.length === 0 && !typing && (
                    <div className="text-center py-12">
                        <Avatar user={other} size={64} />
                        <p className="type-overline mb-2 mt-4">Início da conversa</p>
                        <p className="font-display text-[22px] tracking-tight text-black/80">Diz olá a {other.name}.</p>
                        {other.bio && <p className="text-[13px] text-black/55 mt-2 max-w-[36ch] mx-auto">{other.bio}</p>}
                        {(other.city || other.region) && (
                            <p className="mt-3 inline-flex items-center gap-1 text-[11.5px] font-mono text-black/45">
                                <MapPin size={11} /> {other.city || other.region}
                            </p>
                        )}
                    </div>
                )}
                {groups.map((g) => {
                    if (g.kind === "sep") {
                        return (
                            <div key={g.id} className="flex items-center justify-center my-4 select-none" data-testid="day-separator">
                                <span className="text-[10.5px] uppercase tracking-[0.14em] text-black/45 font-mono bg-white/70 backdrop-blur px-3 py-0.5 rounded-full border border-black/[0.06]">
                                    {g.label}
                                </span>
                            </div>
                        );
                    }
                    const m = g.m;
                    const mine = me && m.sender_id === me.id;
                    const isLastMine = mine && lastMine && lastMine.id === m.id;
                    return (
                        <MessageBubble
                            key={m.id}
                            m={m} mine={mine} isLastMine={isLastMine}
                            otherName={other.name}
                            viewerId={me?.id}
                            onReply={onReplyMsg} onReact={onReactMsg}
                            onCopy={onCopyMsg} onEdit={onEditMsg}
                            onDelete={onDeleteMsg} onForward={onForwardMsg}
                            scrollIntoView={scrollToMsg}
                        />
                    );
                })}
                {typing && (
                    <div className="flex justify-start" data-testid="typing-indicator">
                        <div className="bg-white border border-black/[0.08] rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1 shadow-sm">
                            <span className="w-1.5 h-1.5 rounded-full bg-black/40 animate-bounce" style={{ animationDelay: "0ms" }} />
                            <span className="w-1.5 h-1.5 rounded-full bg-black/40 animate-bounce" style={{ animationDelay: "150ms" }} />
                            <span className="w-1.5 h-1.5 rounded-full bg-black/40 animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                    </div>
                )}
            </div>

            {/* Reply chip */}
            {replyTo && (
                <div className="border-t border-black/[0.06] bg-paper px-3 py-2 flex items-center gap-2 anim-fade-up" data-testid="reply-chip">
                    <div className="border-l-2 border-black/40 pl-2 flex-1 min-w-0">
                        <p className="text-[10.5px] font-mono text-black/50 uppercase tracking-[0.14em]">
                            A responder a {replyTo.sender_id === me?.id ? "ti" : `@${other.username}`}
                        </p>
                        <p className="text-[13px] text-black/75 truncate">{replyTo.content || "[imagem]"}</p>
                    </div>
                    <button onClick={() => setReplyTo(null)} className="text-black/40 hover:text-black tap-shrink"
                        aria-label="Cancelar resposta">
                        <X size={14} />
                    </button>
                </div>
            )}

            {/* Composer */}
            <div className="border-t border-black/[0.06] p-3 pb-safe bg-white/95 backdrop-blur">
                <div className="flex items-end gap-2 relative">
                    <input
                        ref={fileInputRef} type="file" accept="image/*" className="hidden"
                        onChange={(e) => { onPickImage(e.target.files?.[0]); e.target.value = ""; }}
                    />
                    <div className="relative shrink-0" ref={attachRef}>
                        <button
                            onClick={() => { setAttachOpen((o) => !o); setVibeOpen(false); }}
                            data-testid="chat-attach-btn"
                            className="h-11 pl-3 pr-3.5 rounded-2xl bg-black/[0.04] hover:bg-black/[0.08] text-black/70 transition inline-flex items-center gap-1.5"
                            aria-label="Anexar"
                            aria-haspopup="menu"
                            aria-expanded={attachOpen || vibeOpen}
                            title="Anexar imagem, localização ou vibe"
                        >
                            <Plus size={16} strokeWidth={2.1} />
                            <span className="text-[12px] font-medium tracking-tight hidden sm:inline">Anexar</span>
                        </button>
                        {attachOpen && (
                            <div className="absolute bottom-12 left-0 z-40 bg-white rounded-2xl shadow-xl border border-black/[0.06] py-1.5 w-56 anim-fade-up">
                                <BubbleMenuRow onClick={() => { setAttachOpen(false); fileInputRef.current?.click(); }} icon={ImageIcon} label="Enviar imagem" />
                                <BubbleMenuRow onClick={sendLocation} icon={MapPin} label="Enviar localização" />
                                <BubbleMenuRow onClick={() => { setAttachOpen(false); setVibeOpen(true); }} icon={Sparkles} label="Enviar vibe rápida" />
                            </div>
                        )}
                        {vibeOpen && (
                            <div className="absolute bottom-12 left-0 z-40 bg-white rounded-2xl shadow-xl border border-black/[0.06] p-2 anim-fade-up">
                                <p className="text-[10px] font-mono uppercase tracking-[0.14em] text-black/45 px-1 pb-1">Vibe rápida</p>
                                <div className="flex gap-0.5">
                                    {VIBES.map((v) => (
                                        <button key={v} onClick={() => sendVibe(v)} data-testid={`vibe-${v}`}
                                            className="text-[22px] w-9 h-9 grid place-items-center hover:bg-black/[0.05] rounded-full transition">{v}</button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    <textarea
                        ref={inputRef} value={text} rows={1}
                        onInput={(e) => { e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 140) + "px"; }}
                        onChange={(e) => handleType(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                        placeholder={replyTo ? "Responder…" : `Mensagem para ${other.name.split(" ")[0]}…`}
                        data-testid="message-input"
                        className="flex-1 bg-[#fafafa] border border-black/[0.08] rounded-2xl px-4 py-3 text-[15px] focus:border-black/30 focus:bg-white outline-none transition placeholder:text-black/35 resize-none leading-snug min-h-[44px] max-h-[140px]"
                    />
                    <button onClick={send} disabled={!text.trim() || sending} data-testid="send-message-btn"
                        className="w-11 h-11 grid place-items-center rounded-full text-white active:scale-90 transition disabled:opacity-30 shadow-sm shrink-0"
                        style={{ background: "linear-gradient(135deg, #4a7bbf 0%, #6a91cc 45%, #df8a7d 100%)" }} aria-label="enviar">
                        <Send size={16} strokeWidth={1.7} />
                    </button>
                </div>
                <p className="text-[10.5px] text-black/35 font-mono mt-1.5 px-1 hidden sm:block">
                    Enter para enviar · Shift+Enter nova linha · Duplo-clique para reagir ❤️
                </p>
            </div>

            {forwardMsg && (
                <ForwardModal message={forwardMsg} onClose={() => setForwardMsg(null)} />
            )}
            {galleryOpen && <MediaGallery otherUserId={other.id} onClose={() => setGalleryOpen(false)} />}
        </div>
    );
}

// ----------------------------------------------------------------------
// Page wrapper
// ----------------------------------------------------------------------
export default function Messages() {
    const { userId } = useParams();
    const navigate = useNavigate();
    const [active, setActive] = useState(null);
    const [newOpen, setNewOpen] = useState(false);

    useEffect(() => {
        if (userId) {
            api.get(`/messages/${userId}`)
                .then((r) => setActive(r.data.other_user))
                .catch(() => {
                    toast.error("Não foi possível abrir a conversa.");
                    navigate("/messages", { replace: true });
                });
        } else {
            setActive(null);
        }
    }, [userId, navigate]);

    const open = (u) => {
        if (!u || !u.id) {
            toast.error("Não foi possível abrir esta conversa.");
            return;
        }
        setActive(u);
        navigate(`/messages/${u.id}`);
        setNewOpen(false);
    };

    return (
        <div data-testid="messages-page">
            {!active ? (
                <>
                    <PageHeader title="Mensagens" subtitle="As tuas conversas privadas" testid="messages-header" />
                    <ConversationList activeId={null} onSelect={open} onNew={() => setNewOpen(true)} />
                </>
            ) : (
                <ChatView other={active} onBack={() => { setActive(null); navigate("/messages"); }} />
            )}
            <NewConversationModal open={newOpen} onClose={() => setNewOpen(false)} onPick={open} />
        </div>
    );
}
