import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
    Send, ArrowLeft, MessageCircle, Search, Pin, Archive, ArchiveRestore,
    X, Check, CheckCheck, Plus, Coffee, MoreHorizontal, MapPin,
} from "lucide-react";
import { api, formatApiError, toastApiError } from "../lib/api";
import { Avatar } from "../components/Avatar";
import { ConvSkeleton } from "../components/Skeleton";
import { PageHeader } from "../components/PageHeader";
import { smartTime } from "../lib/time";
import { useLiveTime } from "../hooks/useLiveTime";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";

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
            <button
                aria-label="Fechar"
                onClick={onClose}
                className="absolute inset-0 bg-black/45 backdrop-blur-sm"
                data-testid="new-conv-overlay"
            />
            <div className="relative max-w-[460px] mx-auto mt-[10vh] bg-white rounded-2xl shadow-2xl border border-black/[0.06] overflow-hidden anim-pop">
                <div className="flex items-center gap-3 px-4 py-3 hairline-b">
                    <Search size={16} className="text-black/45" />
                    <input
                        autoFocus
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Procurar pessoa (nome ou @user)…"
                        data-testid="new-conv-search-input"
                        className="flex-1 bg-transparent outline-none text-[14.5px] placeholder:text-black/40"
                    />
                    <button
                        onClick={onClose}
                        data-testid="new-conv-close"
                        className="text-black/50 hover:text-black tap-shrink"
                        aria-label="Fechar"
                    >
                        <X size={16} />
                    </button>
                </div>
                <div className="max-h-[60vh] overflow-y-auto">
                    {busy && (
                        <p className="px-4 py-3 text-[12.5px] text-black/45 font-mono">A pesquisar…</p>
                    )}
                    {!busy && q.trim() && results.length === 0 && (
                        <p className="px-4 py-6 text-[13px] text-black/55 text-center">
                            Sem resultados para “{q}”.
                        </p>
                    )}
                    {!busy && !q.trim() && (
                        <p className="px-4 py-6 text-[12.5px] text-black/50 leading-relaxed text-center">
                            Escreve o nome ou @username de quem queres falar.
                            <br />
                            <span className="text-black/35">Não precisas de se seguirem mutuamente.</span>
                        </p>
                    )}
                    {results.map((u) => (
                        <button
                            key={u.id}
                            onClick={() => onPick(u)}
                            data-testid={`new-conv-pick-${u.username}`}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-black/[0.03] transition text-left"
                        >
                            <Avatar user={u} size={40} showOnline />
                            <div className="flex-1 min-w-0">
                                <div className="font-semibold text-[14px] text-black tracking-tight truncate">
                                    {u.name}
                                </div>
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
// Conversation list
// ----------------------------------------------------------------------
function ConversationList({ activeId, onSelect, onNew }) {
    const [convs, setConvs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");
    const [q, setQ] = useState("");
    useLiveTime(30000);

    const load = useCallback(async () => {
        try {
            const { data } = await api.get(`/conversations?filter=${filter}`);
            setConvs(data);
        } catch { /* silent */ } finally { setLoading(false); }
    }, [filter]);

    useEffect(() => {
        load();
        // Smart polling — pause when tab hidden
        const tick = () => {
            if (!document.hidden) load();
        };
        const id = setInterval(tick, 5000);
        return () => clearInterval(id);
    }, [load]);

    const filtered = useMemo(() => {
        if (!q.trim()) return convs;
        const n = q.toLowerCase();
        return convs.filter((c) =>
            ((c.other_user?.name || "") + " " + (c.other_user?.username || "") + " " + (c.last_message || ""))
                .toLowerCase()
                .includes(n),
        );
    }, [q, convs]);

    const togglePin = async (c, e) => {
        e.stopPropagation();
        try { await api.post(`/conversations/${c.other_user.id}/pin`); load(); }
        catch (e2) { toastApiError(e2); }
    };
    const toggleArchive = async (c, e) => {
        e.stopPropagation();
        try { await api.post(`/conversations/${c.other_user.id}/archive`); load(); }
        catch (e2) { toastApiError(e2); }
    };

    return (
        <div data-testid="conversations-list">
            <div className="px-3 lg:px-4 py-2.5 hairline-b flex items-center gap-2">
                <div className="relative flex-1">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40" />
                    <input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Pesquisar conversa…"
                        data-testid="messages-search"
                        className="w-full bg-black/[0.04] border border-transparent rounded-full pl-9 pr-9 py-2 text-[13px] focus:bg-white focus:border-black/15 outline-none transition"
                    />
                    {q && (
                        <button onClick={() => setQ("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-black/40">
                            <X size={13} />
                        </button>
                    )}
                </div>
                <button
                    onClick={onNew}
                    data-testid="messages-new-btn"
                    className="shrink-0 w-9 h-9 rounded-full grid place-items-center text-white tap-shrink"
                    style={{ background: "linear-gradient(135deg, #4a7bbf 0%, #6a91cc 45%, #df8a7d 100%)" }}
                    title="Nova conversa"
                    aria-label="Nova conversa"
                >
                    <Plus size={17} strokeWidth={2.2} />
                </button>
            </div>
            <div className="px-3 lg:px-4 pb-2 flex gap-1.5 overflow-x-auto scrollbar-hide">
                {FILTERS.map((f) => (
                    <button
                        key={f.key}
                        onClick={() => setFilter(f.key)}
                        data-testid={`messages-filter-${f.key}`}
                        className={`shrink-0 px-3 py-1.5 rounded-full text-[12px] font-medium transition ${
                            filter === f.key
                                ? "chip-filter-on"
                                : "bg-black/[0.04] text-black hover:bg-black/[0.08]"
                        }`}
                    >
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
                        <button
                            onClick={onNew}
                            data-testid="messages-empty-cta"
                            className="mt-6 btn-obsidian text-[12px] px-5 py-2.5 inline-flex items-center gap-1.5"
                        >
                            <Plus size={13} /> Nova conversa
                        </button>
                    )}
                </div>
            ) : (
                filtered.map((c) => (
                    <button
                        key={c.key}
                        data-testid={`conversation-${c.other_user?.username}`}
                        type="button"
                        className={`group w-full flex items-center gap-3 p-4 hairline-b hover:bg-black/[0.015] transition cursor-pointer text-left ${
                            activeId === c.other_user?.id ? "bg-black/[0.025]" : ""
                        }`}
                        onClick={() => onSelect(c.other_user)}
                    >
                        <Avatar user={c.other_user} size={48} showOnline />
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                                <div className="font-heading font-medium tracking-tight text-[15px] truncate text-black flex items-center gap-1.5">
                                    {c.pinned && <Pin size={11} className="text-amber-500" fill="currentColor" />}
                                    {c.other_user?.name}
                                </div>
                                <span className="font-mono text-[10px] text-black/45 flex-shrink-0">
                                    {smartTime(c.last_at)}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                                <div
                                    className={`text-[13px] truncate flex-1 ${
                                        c.unread > 0 ? "text-black font-medium" : "text-black/55"
                                    }`}
                                >
                                    {c.last_message || "—"}
                                </div>
                                {c.unread > 0 && (
                                    <span
                                        data-testid={`conv-unread-${c.other_user?.username}`}
                                        className="min-w-[20px] h-[20px] px-1.5 rounded-full text-[10px] font-mono grid place-items-center text-white font-bold"
                                        style={{ background: "linear-gradient(135deg, #df8a7d 0%, #c64a3d 100%)" }}
                                    >
                                        {c.unread > 99 ? "99+" : c.unread}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="hidden sm:flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition">
                            <button
                                onClick={(e) => togglePin(c, e)}
                                data-testid={`conv-pin-${c.other_user?.username}`}
                                title={c.pinned ? "Desafixar" : "Fixar"}
                                className={`w-7 h-7 grid place-items-center rounded-full hover:bg-black/[0.05] ${
                                    c.pinned ? "text-amber-500" : "text-black/40"
                                }`}
                            >
                                <Pin size={12} fill={c.pinned ? "currentColor" : "none"} />
                            </button>
                            <button
                                onClick={(e) => toggleArchive(c, e)}
                                data-testid={`conv-archive-${c.other_user?.username}`}
                                title={c.archived ? "Desarquivar" : "Arquivar"}
                                className="w-7 h-7 grid place-items-center rounded-full text-black/40 hover:bg-black/[0.05]"
                            >
                                {c.archived ? <ArchiveRestore size={12} /> : <Archive size={12} />}
                            </button>
                        </div>
                    </button>
                ))
            )}
        </div>
    );
}

// ----------------------------------------------------------------------
// Date helpers
// ----------------------------------------------------------------------
function dayKey(iso) {
    if (!iso) return "";
    try {
        const d = new Date(iso);
        return d.toDateString();
    } catch { return ""; }
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
// Chat view
// ----------------------------------------------------------------------
function ChatView({ other, onBack }) {
    const { user: me } = useAuth();   // ← FIXED: was refetching /auth/me incorrectly
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState("");
    const [typing, setTyping] = useState(false);
    const [sending, setSending] = useState(false);
    // F3.2 — Café receipt opt-in (persisted per-conversation)
    const cafeKey = `vm_cafe_receipt_${other?.id || ""}`;
    const [cafeReceipt, setCafeReceipt] = useState(() => {
        try { return localStorage.getItem(cafeKey) === "1"; } catch { return false; }
    });
    const scrollRef = useRef(null);
    const inputRef = useRef(null);
    const typingTimerRef = useRef(null);
    const lastTypingPingRef = useRef(0);

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

    useEffect(() => {
        // Auto-focus the input on chat open (desktop only — avoids keyboard pop on mobile)
        if (window.innerWidth >= 1024) inputRef.current?.focus();
    }, [other.id]);

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, [messages, typing]);

    const handleType = (v) => {
        setText(v);
        const now = Date.now();
        // Throttle typing pings to once per 2s
        if (now - lastTypingPingRef.current > 2000) {
            lastTypingPingRef.current = now;
            api.post(`/messages/${other.id}/typing`).catch(() => {});
        }
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        typingTimerRef.current = setTimeout(() => {}, 1500);
    };

    const send = async () => {
        const content = text.trim();
        if (!content || sending) return;
        setSending(true);
        setText("");
        // Optimistic UI — show message immediately with pending state
        const tempId = `temp_${Date.now()}`;
        const optimistic = {
            id: tempId,
            sender_id: me?.id,
            recipient_id: other.id,
            content,
            created_at: new Date().toISOString(),
            read: false,
            _pending: true,
        };
        setMessages((m) => [...m, optimistic]);
        try {
            const { data } = await api.post("/messages", { to_user_id: other.id, content });
            // Replace optimistic with real
            setMessages((m) => m.map((x) => (x.id === tempId ? data : x)));
        } catch (e) {
            // Mark failed
            setMessages((m) => m.map((x) => (x.id === tempId ? { ...x, _pending: false, _failed: true } : x)));
            toastApiError(e);
        } finally {
            setSending(false);
            inputRef.current?.focus();
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

    const toggleCafe = () => {
        const next = !cafeReceipt;
        setCafeReceipt(next);
        try { localStorage.setItem(cafeKey, next ? "1" : "0"); } catch { /* ignore */ }
        toast.success(next ? "“Café” ligado — vais marcar quando leres com calma." : "“Café” desligado.");
    };

    // Group messages by day
    const groups = useMemo(() => {
        const out = [];
        let lastDay = "";
        for (const m of messages) {
            const d = dayKey(m.created_at);
            if (d !== lastDay) {
                out.push({ kind: "sep", id: `sep_${d}`, label: dayLabel(m.created_at) });
                lastDay = d;
            }
            out.push({ kind: "msg", id: m.id, m });
        }
        return out;
    }, [messages]);

    const lastMine = useMemo(() => {
        for (let i = messages.length - 1; i >= 0; i--) {
            if (messages[i].sender_id === me?.id) return messages[i];
        }
        return null;
    }, [messages, me?.id]);

    return (
        <div
            className="fixed inset-0 lg:relative lg:inset-auto z-50 lg:z-auto flex flex-col bg-white lg:h-screen"
            data-testid="chat-view"
        >
            {/* Header */}
            <div className="glass border-b border-black/[0.06] px-3 lg:px-4 py-3 flex items-center gap-3 pt-safe">
                <button
                    onClick={onBack}
                    className="lg:hidden w-9 h-9 rounded-full grid place-items-center text-black/70 hover:bg-black/[0.05] active:scale-90 tap-shrink"
                    aria-label="voltar"
                    data-testid="chat-back"
                >
                    <ArrowLeft size={18} strokeWidth={1.7} />
                </button>
                <Link
                    to={`/u/${other.username}`}
                    className="flex items-center gap-3 flex-1 min-w-0 tap-shrink"
                    data-testid="chat-profile-link"
                >
                    <Avatar user={other} size={38} showOnline />
                    <div className="flex-1 min-w-0">
                        <div className="font-heading font-medium text-[14px] tracking-tight truncate text-black">
                            {other.name}
                        </div>
                        <div className="font-mono text-[11px] truncate">
                            {typing ? (
                                <span className="text-black/65 italic">a escrever…</span>
                            ) : other.online ? (
                                <span className="text-green-soft inline-flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-soft pulse-dot" />
                                    online
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
                <button
                    onClick={toggleCafe}
                    data-testid="chat-cafe-toggle"
                    title={cafeReceipt ? "Café ligado — irás marcar quando leres com calma" : "Ligar Café (read receipt opt-in)"}
                    className={`w-9 h-9 grid place-items-center rounded-full hover:bg-black/[0.05] transition ${
                        cafeReceipt ? "text-[color:var(--coral-500)]" : "text-black/45"
                    }`}
                >
                    <Coffee size={15} fill={cafeReceipt ? "currentColor" : "none"} />
                </button>
                <button
                    onClick={pin}
                    title="Fixar conversa"
                    data-testid="chat-pin"
                    className="w-9 h-9 grid place-items-center rounded-full hover:bg-black/[0.05] text-black/55"
                >
                    <Pin size={15} />
                </button>
                <button
                    onClick={archive}
                    title="Arquivar"
                    data-testid="chat-archive"
                    className="w-9 h-9 grid place-items-center rounded-full hover:bg-black/[0.05] text-black/55"
                >
                    <Archive size={15} />
                </button>
            </div>

            {/* Body */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-4 space-y-1.5 scroll-mom bg-paper grain isolate"
                data-testid="chat-body"
            >
                {messages.length === 0 && !typing && (
                    <div className="text-center py-12">
                        <Avatar user={other} size={64} />
                        <p className="type-overline mb-2 mt-4">Início da conversa</p>
                        <p className="font-display text-[22px] tracking-tight text-black/80">
                            Diz olá a {other.name}.
                        </p>
                        {other.bio && (
                            <p className="text-[13px] text-black/55 mt-2 max-w-[36ch] mx-auto">{other.bio}</p>
                        )}
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
                            <div
                                key={g.id}
                                className="flex items-center justify-center my-4 select-none"
                                data-testid="day-separator"
                            >
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
                        <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                            <div className="flex flex-col items-end max-w-[78%]">
                                <div
                                    title={new Date(m.created_at).toLocaleString("pt-PT")}
                                    className={`px-4 py-2.5 rounded-2xl text-[15px] leading-snug anim-fade-up break-words ${
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
                                    {m.content}
                                </div>
                                {mine && isLastMine && (
                                    <div
                                        className="mt-1 flex items-center gap-1 text-[10.5px] font-mono text-black/45"
                                        data-testid={`msg-status-${m.id}`}
                                    >
                                        {m._pending ? (
                                            <span>a enviar…</span>
                                        ) : m._failed ? (
                                            <span className="text-red-soft">por enviar — toca para tentar</span>
                                        ) : m.read ? (
                                            <>
                                                <CheckCheck size={12} className="text-[color:var(--coral-500)]" />
                                                <span>visto</span>
                                            </>
                                        ) : (
                                            <>
                                                <Check size={12} />
                                                <span>enviado</span>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
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

            {/* Composer */}
            <div className="border-t border-black/[0.06] p-3 pb-safe bg-white/95 backdrop-blur">
                <div className="flex items-end gap-2">
                    <textarea
                        ref={inputRef}
                        value={text}
                        rows={1}
                        onInput={(e) => {
                            // Auto-grow up to 5 lines
                            e.target.style.height = "auto";
                            e.target.style.height = Math.min(e.target.scrollHeight, 140) + "px";
                        }}
                        onChange={(e) => handleType(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
                        }}
                        placeholder={`Mensagem para ${other.name.split(" ")[0]}…`}
                        data-testid="message-input"
                        className="flex-1 bg-[#fafafa] border border-black/[0.08] rounded-2xl px-4 py-3 text-[15px] focus:border-black/30 focus:bg-white outline-none transition placeholder:text-black/35 resize-none leading-snug min-h-[44px] max-h-[140px]"
                    />
                    <button
                        onClick={send}
                        disabled={!text.trim() || sending}
                        data-testid="send-message-btn"
                        className="w-11 h-11 grid place-items-center rounded-full text-white active:scale-90 transition disabled:opacity-30 shadow-sm shrink-0"
                        style={{ background: "linear-gradient(135deg, #4a7bbf 0%, #6a91cc 45%, #df8a7d 100%)" }}
                        aria-label="enviar"
                    >
                        <Send size={16} strokeWidth={1.7} />
                    </button>
                </div>
                <p className="text-[10.5px] text-black/35 font-mono mt-1.5 px-1 hidden sm:block">
                    Enter para enviar · Shift+Enter nova linha
                    {cafeReceipt && <span className="ml-2 text-[color:var(--coral-500)]">· “Café” ligado</span>}
                </p>
            </div>
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
        setActive(u);
        navigate(`/messages/${u.id}`);
        setNewOpen(false);
    };

    return (
        <div data-testid="messages-page">
            {!active ? (
                <>
                    <PageHeader
                        title="Mensagens"
                        subtitle="As tuas conversas privadas"
                        testid="messages-header"
                    />
                    <ConversationList
                        activeId={null}
                        onSelect={open}
                        onNew={() => setNewOpen(true)}
                    />
                </>
            ) : (
                <ChatView other={active} onBack={() => { setActive(null); navigate("/messages"); }} />
            )}

            <NewConversationModal
                open={newOpen}
                onClose={() => setNewOpen(false)}
                onPick={open}
            />
        </div>
    );
}
