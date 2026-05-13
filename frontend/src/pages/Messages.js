import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Send, ArrowLeft, MessageCircle } from "lucide-react";
import { api, formatApiError } from "../lib/api";
import { Avatar } from "../components/Avatar";
import { ConvSkeleton } from "../components/Skeleton";
import { PageHeader } from "../components/PageHeader";
import { smartTime } from "../lib/time";
import { useLiveTime } from "../hooks/useLiveTime";
import { toast } from "sonner";

function ConversationList({ activeId, onSelect }) {
    const [convs, setConvs] = useState([]);
    const [loading, setLoading] = useState(true);
    useLiveTime(30000);

    const load = async () => {
        try {
            const { data } = await api.get("/conversations");
            setConvs(data);
        } catch {} finally { setLoading(false); }
    };

    useEffect(() => {
        load();
        const id = setInterval(load, 5000);
        return () => clearInterval(id);
    }, []);

    if (loading) return <ConvSkeleton />;

    return (
        <div className="divide-y divide-white/[0.05]" data-testid="conversations-list">
            {convs.length === 0 ? (
                <div className="px-6 py-16 text-center">
                    <div className="w-20 h-20 rounded-full bg-accent-vermillion/10 grid place-items-center mx-auto mb-5 border border-accent-vermillion/30">
                        <MessageCircle size={28} className="text-accent-vermillion" />
                    </div>
                    <p className="text-zinc-100 font-heading text-lg tracking-tight">Sem conversas ainda</p>
                    <p className="text-zinc-500 text-sm mt-1">Abre o perfil de alguém e toca em mensagem para começar.</p>
                </div>
            ) : (
                convs.map((c) => (
                    <button
                        key={c.key}
                        onClick={() => onSelect(c.other_user)}
                        data-testid={`conversation-${c.other_user?.username}`}
                        className={`w-full flex items-center gap-3 p-4 active:bg-white/[0.05] lg:hover:bg-white/[0.03] transition text-left ${
                            activeId === c.other_user?.id ? "bg-white/[0.04]" : ""
                        }`}
                    >
                        <Avatar user={c.other_user} size={48} showOnline />
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                                <div className="font-heading font-semibold text-[15px] truncate">{c.other_user?.name}</div>
                                <span className="font-mono text-[10px] text-zinc-500 flex-shrink-0">{smartTime(c.last_at)}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                                <div className={`text-[13px] truncate flex-1 ${c.unread > 0 ? "text-white font-medium" : "text-zinc-500"}`}>{c.last_message || "—"}</div>
                                {c.unread > 0 && (
                                    <span className="min-w-[20px] h-[20px] px-1.5 rounded-full bg-accent-vermillion text-[10px] font-mono grid place-items-center text-white font-bold">
                                        {c.unread}
                                    </span>
                                )}
                            </div>
                        </div>
                    </button>
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

    const load = async () => {
        try {
            const { data } = await api.get(`/messages/${other.id}`);
            setMessages(data.messages);
        } catch {}
    };

    const checkTyping = async () => {
        try {
            const { data } = await api.get(`/messages/${other.id}/typing-status`);
            setTyping(data.typing);
        } catch {}
    };

    useEffect(() => {
        api.get("/auth/me").then((r) => setMe(r.data));
    }, []);

    useEffect(() => {
        load();
        checkTyping();
        const id = setInterval(() => {
            load();
            checkTyping();
        }, 3000);
        return () => clearInterval(id);
        // eslint-disable-next-line
    }, [other.id]);

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, [messages, typing]);

    const handleType = (v) => {
        setText(v);
        if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
        api.post(`/messages/${other.id}/typing`).catch(() => {});
        typingTimerRef.current = setTimeout(() => {
            // stop sending typing pings
        }, 1500);
    };

    const send = async () => {
        if (!text.trim()) return;
        const content = text;
        setText("");
        try {
            const { data } = await api.post("/messages", { to_user_id: other.id, content });
            setMessages((m) => [...m, data]);
        } catch (e) {
            toast.error(formatApiError(e));
        }
    };

    return (
        <div
            className="fixed inset-0 lg:relative lg:inset-auto z-50 lg:z-auto flex flex-col bg-[#0a0a10] lg:h-screen"
            data-testid="chat-view"
        >
            <div className="glass border-b border-white/[0.06] px-3 lg:px-4 py-3 flex items-center gap-3 pt-safe">
                <button
                    onClick={onBack}
                    className="lg:hidden w-9 h-9 rounded-full grid place-items-center text-zinc-200 hover:bg-white/[0.06] active:scale-90 tap-shrink"
                    aria-label="voltar"
                    data-testid="chat-back"
                >
                    <ArrowLeft size={20} />
                </button>
                <Avatar user={other} size={38} showOnline />
                <div className="flex-1 min-w-0">
                    <div className="font-heading font-semibold text-sm truncate">{other.name}</div>
                    <div className="font-mono text-[11px] text-zinc-500 truncate">
                        {typing ? <span className="text-accent-vermillion">a escrever…</span> : other.online ? "online" : `@${other.username}`}
                    </div>
                </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2 scroll-mom">
                {messages.length === 0 && !typing && (
                    <div className="text-center text-zinc-500 font-mono text-sm py-10">Diz olá a {other.name} 👋</div>
                )}
                {messages.map((m) => {
                    const mine = me && m.sender_id === me.id;
                    return (
                        <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                            <div
                                className={`max-w-[78%] px-4 py-2.5 rounded-2xl text-[15px] leading-snug anim-fade-up break-words ${
                                    mine
                                        ? "bg-accent-vermillion text-white rounded-br-md"
                                        : "bg-zinc-900 text-zinc-100 rounded-bl-md border border-white/[0.06]"
                                }`}
                                title={new Date(m.created_at).toLocaleString("pt-BR")}
                            >
                                {m.content}
                            </div>
                        </div>
                    );
                })}
                {typing && (
                    <div className="flex justify-start" data-testid="typing-indicator">
                        <div className="bg-zinc-900 border border-white/[0.06] rounded-2xl rounded-bl-md px-4 py-3 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                    </div>
                )}
            </div>

            <div className="border-t border-white/[0.06] p-2.5 lg:p-3 flex items-center gap-2 pb-safe bg-[#0a0a10]/95 backdrop-blur">
                <input
                    value={text}
                    onChange={(e) => handleType(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            send();
                        }
                    }}
                    placeholder="Mensagem..."
                    data-testid="message-input"
                    className="flex-1 bg-zinc-950 border border-white/[0.08] rounded-full px-5 py-3 text-[15px] focus:border-accent-vermillion outline-none"
                />
                <button
                    onClick={send}
                    disabled={!text.trim()}
                    data-testid="send-message-btn"
                    className="w-11 h-11 grid place-items-center rounded-full bg-accent-vermillion text-white hover:bg-[#A78BFA] active:scale-90 transition disabled:opacity-40"
                    aria-label="enviar"
                >
                    <Send size={17} />
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
        } else {
            setActive(null);
        }
    }, [userId]);

    return (
        <div data-testid="messages-page">
            {!active ? (
                <>
                    <PageHeader title="Mensagens" subtitle="suas conversas diretas" testid="messages-header" />
                    <ConversationList
                        activeId={null}
                        onSelect={(u) => {
                            setActive(u);
                            navigate(`/messages/${u.id}`);
                        }}
                    />
                </>
            ) : (
                <ChatView
                    other={active}
                    onBack={() => {
                        setActive(null);
                        navigate("/messages");
                    }}
                />
            )}
        </div>
    );
}
