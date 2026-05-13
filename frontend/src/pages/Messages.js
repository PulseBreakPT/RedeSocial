import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Send, ArrowLeft, MessageCircle, Search, Pin, Archive, ArchiveRestore, X } from "lucide-react";
import { api, formatApiError } from "../lib/api";
import { Avatar } from "../components/Avatar";
import { ConvSkeleton } from "../components/Skeleton";
import { PageHeader } from "../components/PageHeader";
import { smartTime } from "../lib/time";
import { useLiveTime } from "../hooks/useLiveTime";
import { toast } from "sonner";

const FILTERS = [
    { key: "all", label: "Tudo" },
    { key: "unread", label: "Não lidas" },
    { key: "pinned", label: "Fixadas" },
    { key: "archived", label: "Arquivadas" },
];

function ConversationList({ activeId, onSelect }) {
    const [convs, setConvs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("all");
    const [q, setQ] = useState("");
    useLiveTime(30000);

    const load = async () => {
        try {
            const { data } = await api.get(`/conversations?filter=${filter}`);
            setConvs(data);
        } catch {} finally { setLoading(false); }
    };
    useEffect(() => {
        load();
        const id = setInterval(load, 5000);
        return () => clearInterval(id);
        // eslint-disable-next-line
    }, [filter]);

    const filtered = useMemo(() => {
        if (!q.trim()) return convs;
        const n = q.toLowerCase();
        return convs.filter((c) => ((c.other_user?.name || "") + " " + (c.other_user?.username || "") + " " + (c.last_message || "")).toLowerCase().includes(n));
    }, [q, convs]);

    const togglePin = async (c, e) => {
        e.stopPropagation();
        try { await api.post(`/conversations/${c.other_user.id}/pin`); load(); }
        catch (e2) { toast.error(formatApiError(e2)); }
    };
    const toggleArchive = async (c, e) => {
        e.stopPropagation();
        try { await api.post(`/conversations/${c.other_user.id}/archive`); load(); }
        catch (e2) { toast.error(formatApiError(e2)); }
    };

    return (
        <div data-testid="conversations-list">
            <div className="px-3 lg:px-4 py-2.5 hairline-b">
                <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40" />
                    <input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Pesquisar conversa..."
                        data-testid="messages-search"
                        className="w-full bg-black/[0.04] border border-transparent rounded-full pl-9 pr-9 py-2 text-[13px] focus:bg-white focus:border-black/15 outline-none transition"
                    />
                    {q && (<button onClick={() => setQ("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-black/40"><X size={13} /></button>)}
                </div>
            </div>
            <div className="px-3 lg:px-4 pb-2 flex gap-1.5 overflow-x-auto scrollbar-hide">
                {FILTERS.map((f) => (
                    <button key={f.key} onClick={() => setFilter(f.key)} data-testid={`messages-filter-${f.key}`} className={`shrink-0 px-3 py-1.5 rounded-full text-[12px] font-medium ${filter === f.key ? "chip-on" : "bg-black/[0.04] text-black hover:bg-black/[0.08]"}`}>{f.label}</button>
                ))}
            </div>
            {loading ? <ConvSkeleton /> : filtered.length === 0 ? (
                <div className="px-6 py-20 text-center anim-fade-up">
                    <div className="ring-silver w-20 h-20 rounded-full grid place-items-center mx-auto mb-6">
                        <MessageCircle size={26} strokeWidth={1.4} className="text-black/70" />
                    </div>
                    <p className="type-overline mb-2">Sem conversas</p>
                    <h3 className="font-display text-[19px] font-bold tracking-tight text-black">{filter === "all" ? "Sem mensagens ainda" : "Vazio neste filtro"}</h3>
                    <p className="text-black/55 text-sm mt-2">Abre o perfil de alguém e toca em mensagem para começar.</p>
                </div>
            ) : (
                filtered.map((c) => (
                    <div
                        key={c.key}
                        data-testid={`conversation-${c.other_user?.username}`}
                        className={`group w-full flex items-center gap-3 p-4 hairline-b hover:bg-black/[0.015] transition cursor-pointer ${activeId === c.other_user?.id ? "bg-black/[0.025]" : ""}`}
                        onClick={() => onSelect(c.other_user)}
                    >
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
                                <div className={`text-[13px] truncate flex-1 ${c.unread > 0 ? "text-black font-medium" : "text-black/55"}`}>{c.last_message || "—"}</div>
                                {c.unread > 0 && (
                                    <span className="min-w-[20px] h-[20px] px-1.5 rounded-full bg-black text-[10px] font-mono grid place-items-center text-white font-bold">{c.unread}</span>
                                )}
                            </div>
                        </div>
                        <div className="hidden sm:flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition">
                            <button onClick={(e) => togglePin(c, e)} data-testid={`conv-pin-${c.other_user?.username}`} title={c.pinned ? "Desafixar" : "Fixar"} className={`w-7 h-7 grid place-items-center rounded-full hover:bg-black/[0.05] ${c.pinned ? "text-amber-500" : "text-black/40"}`}>
                                <Pin size={12} fill={c.pinned ? "currentColor" : "none"} />
                            </button>
                            <button onClick={(e) => toggleArchive(c, e)} data-testid={`conv-archive-${c.other_user?.username}`} title={c.archived ? "Desarquivar" : "Arquivar"} className="w-7 h-7 grid place-items-center rounded-full text-black/40 hover:bg-black/[0.05]">
                                {c.archived ? <ArchiveRestore size={12} /> : <Archive size={12} />}
                            </button>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}

function ChatView({ other, onBack }) {
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState("");
    const [me, setMe] = useState(null);
    const [typing, setTyping] = useState(false);
    const scrollRef = useRef(null);
    const typingTimerRef = useRef(null);

    const load = async () => { try { const { data } = await api.get(`/messages/${other.id}`); setMessages(data.messages); } catch {} };
    const checkTyping = async () => { try { const { data } = await api.get(`/messages/${other.id}/typing-status`); setTyping(data.typing); } catch {} };

    useEffect(() => { api.get("/auth/me").then((r) => setMe(r.data)); }, []);
    useEffect(() => {
        load(); checkTyping();
        const id = setInterval(() => { load(); checkTyping(); }, 3000);
        return () => clearInterval(id);
        // eslint-disable-next-line
    }, [other.id]);
    useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }); }, [messages, typing]);

    const handleType = (v) => {
        setText(v);
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        api.post(`/messages/${other.id}/typing`).catch(() => {});
        typingTimerRef.current = setTimeout(() => {}, 1500);
    };
    const send = async () => {
        if (!text.trim()) return;
        const content = text; setText("");
        try { const { data } = await api.post("/messages", { to_user_id: other.id, content }); setMessages((m) => [...m, data]); }
        catch (e) { toast.error(formatApiError(e)); }
    };
    const pin = async () => { try { const { data } = await api.post(`/conversations/${other.id}/pin`); toast.success(data.pinned ? "Conversa fixada" : "Desafixada"); } catch (e) { toast.error(formatApiError(e)); } };
    const archive = async () => { try { const { data } = await api.post(`/conversations/${other.id}/archive`); toast.success(data.archived ? "Arquivada" : "Desarquivada"); if (data.archived) onBack(); } catch (e) { toast.error(formatApiError(e)); } };

    return (
        <div className="fixed inset-0 lg:relative lg:inset-auto z-50 lg:z-auto flex flex-col bg-white lg:h-screen" data-testid="chat-view">
            <div className="glass border-b border-black/[0.06] px-3 lg:px-4 py-3 flex items-center gap-3 pt-safe">
                <button onClick={onBack} className="lg:hidden w-9 h-9 rounded-full grid place-items-center text-black/70 hover:bg-black/[0.05] active:scale-90 tap-shrink" aria-label="voltar" data-testid="chat-back">
                    <ArrowLeft size={18} strokeWidth={1.7} />
                </button>
                <Avatar user={other} size={38} showOnline />
                <div className="flex-1 min-w-0">
                    <div className="font-heading font-medium text-[14px] tracking-tight truncate text-black">{other.name}</div>
                    <div className="font-mono text-[11px] truncate">
                        {typing ? (<span className="text-black/65 italic">a escrever…</span>) :
                            other.online ? (<span className="text-green-soft inline-flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-green-soft pulse-dot" /> online</span>) :
                                (<span className="text-black/45">@{other.username}</span>)}
                    </div>
                </div>
                <button onClick={pin} title="Fixar conversa" data-testid="chat-pin" className="w-9 h-9 grid place-items-center rounded-full hover:bg-black/[0.05] text-black/55">
                    <Pin size={15} />
                </button>
                <button onClick={archive} title="Arquivar" data-testid="chat-archive" className="w-9 h-9 grid place-items-center rounded-full hover:bg-black/[0.05] text-black/55">
                    <Archive size={15} />
                </button>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2 scroll-mom bg-paper grain isolate">
                {messages.length === 0 && !typing && (
                    <div className="text-center py-12">
                        <p className="type-overline mb-2">Diz olá</p>
                        <p className="font-display text-[22px] tracking-tight text-black/80">Diz olá a {other.name}.</p>
                    </div>
                )}
                {messages.map((m) => {
                    const mine = me && m.sender_id === me.id;
                    return (
                        <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-[78%] px-4 py-2.5 rounded-2xl text-[15px] leading-snug anim-fade-up break-words ${mine ? "bg-black text-white rounded-br-md shadow-sm" : "bg-white text-black rounded-bl-md border border-black/[0.08] shadow-[0_2px_8px_-4px_rgba(13,13,16,0.08)]"}`} title={new Date(m.created_at).toLocaleString("pt-PT")}>
                                {m.content}
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

            <div className="border-t border-black/[0.06] p-3 flex items-center gap-2 pb-safe bg-white/95 backdrop-blur">
                <input value={text} onChange={(e) => handleType(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} placeholder="Mensagem…" data-testid="message-input" className="flex-1 bg-[#fafafa] border border-black/[0.08] rounded-full px-5 py-3 text-[15px] focus:border-black/30 focus:bg-white outline-none transition placeholder:text-black/35" />
                <button onClick={send} disabled={!text.trim()} data-testid="send-message-btn" className="w-11 h-11 grid place-items-center rounded-full bg-black text-white hover:bg-black/85 active:scale-90 transition disabled:opacity-30 shadow-sm" aria-label="enviar">
                    <Send size={16} strokeWidth={1.7} />
                </button>
            </div>
        </div>
    );
}

export default function Messages() {
    const { userId } = useParams();
    const navigate = useNavigate();
    const [active, setActive] = useState(null);

    useEffect(() => {
        if (userId) {
            api.get(`/messages/${userId}`).then((r) => setActive(r.data.other_user)).catch(() => {});
        } else { setActive(null); }
    }, [userId]);

    return (
        <div data-testid="messages-page">
            {!active ? (
                <>
                    <PageHeader title="Mensagens" subtitle="As tuas mensagens" testid="messages-header" />
                    <ConversationList activeId={null} onSelect={(u) => { setActive(u); navigate(`/messages/${u.id}`); }} />
                </>
            ) : (
                <ChatView other={active} onBack={() => { setActive(null); navigate("/messages"); }} />
            )}
        </div>
    );
}
