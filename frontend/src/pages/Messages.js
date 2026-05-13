import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Send, ArrowLeft } from "lucide-react";
import { api, formatApiError } from "../lib/api";
import { Avatar } from "../components/Avatar";
import { toast } from "sonner";

function ConversationList({ activeId, onSelect }) {
    const [convs, setConvs] = useState([]);

    const load = async () => {
        try {
            const { data } = await api.get("/conversations");
            setConvs(data);
        } catch {}
    };

    useEffect(() => {
        load();
        const id = setInterval(load, 5000);
        return () => clearInterval(id);
    }, []);

    return (
        <div className="divide-y divide-zinc-900" data-testid="conversations-list">
            {convs.length === 0 ? (
                <p className="p-6 text-center text-zinc-500 font-mono text-sm">
                    Nenhuma conversa ainda. Abra o perfil de alguém e clique em mensagem.
                </p>
            ) : (
                convs.map((c) => (
                    <button
                        key={c.key}
                        onClick={() => onSelect(c.other_user)}
                        data-testid={`conversation-${c.other_user?.username}`}
                        className={`w-full flex items-center gap-3 p-4 hover:bg-white/[0.03] transition text-left ${
                            activeId === c.other_user?.id ? "bg-white/[0.04]" : ""
                        }`}
                    >
                        <Avatar user={c.other_user} size={44} />
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                                <div className="font-heading font-semibold text-sm truncate">{c.other_user?.name}</div>
                                {c.unread > 0 && (
                                    <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-accent-vermillion text-[10px] font-mono grid place-items-center text-white">
                                        {c.unread}
                                    </span>
                                )}
                            </div>
                            <div className="font-mono text-xs text-zinc-500 truncate">{c.last_message || "—"}</div>
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
    const scrollRef = useRef(null);

    const load = async () => {
        try {
            const { data } = await api.get(`/messages/${other.id}`);
            setMessages(data.messages);
        } catch {}
    };

    useEffect(() => {
        api.get("/auth/me").then((r) => setMe(r.data));
    }, []);

    useEffect(() => {
        load();
        const id = setInterval(load, 3000);
        return () => clearInterval(id);
    }, [other.id]);

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, [messages]);

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
        <div className="flex flex-col h-[calc(100vh-0px)] lg:h-screen" data-testid="chat-view">
            <div className="glass border-b border-zinc-900 px-4 py-3 flex items-center gap-3">
                <button onClick={onBack} className="lg:hidden p-1 hover:bg-white/5 rounded-full">
                    <ArrowLeft size={18} />
                </button>
                <Avatar user={other} size={36} />
                <div>
                    <div className="font-heading font-semibold text-sm">{other.name}</div>
                    <div className="font-mono text-xs text-zinc-500">@{other.username}</div>
                </div>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
                {messages.length === 0 && (
                    <div className="text-center text-zinc-600 font-mono text-sm py-10">Diga olá para {other.name} 👋</div>
                )}
                {messages.map((m) => {
                    const mine = me && m.sender_id === me.id;
                    return (
                        <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                            <div
                                className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm anim-fade-up ${
                                    mine
                                        ? "bg-accent-vermillion text-white rounded-br-md"
                                        : "bg-zinc-900 text-zinc-100 rounded-bl-md border border-zinc-800"
                                }`}
                            >
                                {m.content}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="border-t border-zinc-900 p-3 flex items-center gap-2">
                <input
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            send();
                        }
                    }}
                    placeholder="Escreva uma mensagem..."
                    data-testid="message-input"
                    className="flex-1 bg-zinc-950 border border-zinc-800 rounded-full px-5 py-3 text-sm focus:border-accent-vermillion outline-none"
                />
                <button
                    onClick={send}
                    data-testid="send-message-btn"
                    className="p-3 rounded-full bg-accent-vermillion text-white hover:bg-[#FF7A50] active:scale-95 transition"
                >
                    <Send size={16} />
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
                    <div className="sticky top-0 z-30 glass border-b border-zinc-900 px-5 py-4">
                        <h1 className="font-heading text-xl font-bold tracking-tight">Mensagens</h1>
                        <p className="font-mono text-xs text-zinc-500 mt-0.5">suas conversas diretas</p>
                    </div>
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
