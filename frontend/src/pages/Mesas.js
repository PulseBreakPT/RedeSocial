import { useCallback, useEffect, useRef, useState } from "react";
// =============================================================================
// DESIGN SYSTEM: LUSORAE EDITORIAL — ver /src/theme/EDITORIAL.md
// =============================================================================
import { useSearchParams } from "react-router-dom";
import { Coffee, Plus, Clock, Users, Send, ArrowLeft, X as XIcon } from "lucide-react";
import { api, toastApiError } from "../lib/api";
import { PageShell, PageHero, Empty } from "../components/PageShell";
import { PT } from "../theme/editorial";
import { Avatar } from "../components/Avatar";
import { useAuth } from "../context/AuthContext";
import { useWsMessages } from "../components/WebSocketProvider";

const KINDS = [
    { key: "rapida", label: "Rápida", hint: "2 horas" },
    { key: "noturna", label: "Noturna", hint: "até às 6h" },
    { key: "tema", label: "Tema", hint: "24 horas" },
];
const KIND_LABEL = { rapida: "Rápida", noturna: "Noturna", tema: "Tema" };

function fmtLeft(secs) {
    if (!secs || secs <= 0) return "a fechar";
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m`;
    return `${secs}s`;
}

export default function Mesas() {
    const { user } = useAuth();
    const [mesas, setMesas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [active, setActive] = useState(null); // mesa id
    const [params, setParams] = useSearchParams();

    // Deep-link: /mesas?open=<id> abre a mesa diretamente (ex.: vindo de uma
    // comunidade). Consome o param para não reabrir ao voltar atrás.
    useEffect(() => {
        const o = params.get("open");
        if (o) {
            setActive(o);
            const next = new URLSearchParams(params);
            next.delete("open");
            setParams(next, { replace: true });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loadList = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get("/mesas");
            setMesas(data || []);
        } catch (e) {
            toastApiError(e, "Falha a carregar mesas");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { if (!active) loadList(); }, [active, loadList]);

    if (active) {
        return <MesaRoom mesaId={active} onBack={() => setActive(null)} meId={user?.id} />;
    }

    return (
        <PageShell max="max-w-5xl">
            <PageHero
                title="Mesas"
                subtitle="Conversas efémeras. Nascem, vivem enquanto há gente, e fecham sozinhas."
                badge="Salas que existem só agora"
                accent={PT.telha}
                actions={
                    <button
                        onClick={() => setCreating(true)}
                        data-testid="mesa-create-open"
                        className="inline-flex items-center gap-1.5 h-10 px-4 font-black uppercase transition hover:translate-y-[-1px]"
                        style={{ background: PT.ink, color: "#fff", borderRadius: 999, fontSize: 11.5, letterSpacing: "0.14em", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10), 0 12px 28px -10px rgba(10,10,10,0.40)" }}
                    >
                        <Plus size={13} strokeWidth={2.6} /> Abrir mesa
                    </button>
                }
            />

            <div className="px-4 lg:px-7 pt-6 pb-12">
            {creating && (
                <CreateMesa
                    onClose={() => setCreating(false)}
                    onCreated={(m) => { setCreating(false); setActive(m.id); }}
                />
            )}

            <div className="space-y-3">
                {loading ? (
                    <div className="py-16 text-center font-mono font-bold uppercase" style={{ fontSize: 11, letterSpacing: "0.18em", color: "rgba(10,10,10,0.42)" }}>A carregar mesas…</div>
                ) : mesas.length === 0 ? (
                    <Empty icon={Coffee} title="Nenhuma mesa aberta" body="Abre a primeira — uma conversa que dura só o tempo certo." cta="Abrir mesa" ctaOnClick={() => setCreating(true)} />
                ) : (
                    mesas.map((m) => (
                        <button
                            key={m.id}
                            onClick={() => setActive(m.id)}
                            data-testid={`mesa-row-${m.id}`}
                            className="w-full text-left p-4 transition hover:translate-y-[-1px] flex items-start gap-3"
                            style={{ background: "#fff", border: "1px solid rgba(10,10,10,0.08)", borderRadius: 18, boxShadow: "0 1px 2px rgba(10,10,10,0.04), 0 10px 22px -14px rgba(10,10,10,0.10)" }}
                        >
                            <div className="w-12 h-12 grid place-items-center shrink-0" style={{ background: PT.telha, color: "#fff", borderRadius: 12, boxShadow: `0 1px 2px rgba(10,10,10,0.06), 0 10px 22px -10px ${PT.telha}80` }}>
                                <Coffee size={20} strokeWidth={2.2} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="font-black text-[15.5px] tracking-[-0.015em] truncate" style={{ color: PT.ink }}>{m.title}</div>
                                {m.topic && <div className="text-[13px] truncate mt-0.5 font-medium" style={{ color: "rgba(10,10,10,0.55)" }}>{m.topic}</div>}
                                <div className="flex items-center gap-3 mt-2 font-mono text-[10.5px] font-bold uppercase" style={{ color: "rgba(10,10,10,0.50)", letterSpacing: "0.08em" }}>
                                    <span className="inline-flex items-center gap-1"><Users size={11} /> {m.participants_count}</span>
                                    <span className="inline-flex items-center gap-1"><Clock size={11} /> FECHA EM {fmtLeft(m.seconds_left)}</span>
                                    <span className="inline-block font-black uppercase" style={{ background: "rgba(10,10,10,0.06)", color: PT.ink, padding: "2px 8px", borderRadius: 999, fontSize: 9.5, letterSpacing: "0.16em" }}>{KIND_LABEL[m.kind] || m.kind}</span>
                                </div>
                            </div>
                        </button>
                    ))
                )}
            </div>
            </div>
        </PageShell>
    );
}

function CreateMesa({ onClose, onCreated }) {
    const [title, setTitle] = useState("");
    const [topic, setTopic] = useState("");
    const [kind, setKind] = useState("rapida");
    const [busy, setBusy] = useState(false);

    const submit = async () => {
        if (!title.trim() || busy) return;
        setBusy(true);
        try {
            const { data } = await api.post("/mesas", { title: title.trim(), topic: topic.trim(), kind });
            onCreated(data);
        } catch (e) {
            toastApiError(e, "Não foi possível abrir a mesa");
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="px-4 lg:px-5 pt-3">
            <div className="card-lux p-4 anim-fade-up">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-heading font-semibold text-[14px] text-black">Abrir uma mesa</h3>
                    <button onClick={onClose} aria-label="Fechar" className="text-black/40 hover:text-black"><XIcon size={16} /></button>
                </div>
                <input
                    type="text" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80}
                    placeholder="Sobre o quê é a mesa?"
                    data-testid="mesa-title-input"
                    className="w-full h-11 px-4 rounded-xl bg-black/[0.03] focus:bg-white focus:ring-2 ring-black/20 text-[14px] outline-none mb-2"
                />
                <input
                    type="text" value={topic} onChange={(e) => setTopic(e.target.value)} maxLength={60}
                    placeholder="Tópico (opcional)"
                    data-testid="mesa-topic-input"
                    className="w-full h-10 px-4 rounded-xl bg-black/[0.03] focus:bg-white focus:ring-2 ring-black/20 text-[13px] outline-none mb-3"
                />
                <div className="flex items-center gap-1.5 mb-3">
                    {KINDS.map((k) => (
                        <button
                            key={k.key}
                            onClick={() => setKind(k.key)}
                            data-testid={`mesa-kind-${k.key}`}
                            className={`h-9 px-3 rounded-full text-[12px] font-medium transition ${kind === k.key ? "bg-black text-white" : "bg-black/[0.05] text-black/70 hover:bg-black/10"}`}
                            title={k.hint}
                        >
                            {k.label} <span className="opacity-60">· {k.hint}</span>
                        </button>
                    ))}
                </div>
                <button
                    onClick={submit}
                    disabled={!title.trim() || busy}
                    data-testid="mesa-create-submit"
                    className="btn-obsidian w-full py-2.5 text-[13.5px] disabled:opacity-40"
                >
                    {busy ? "A abrir…" : "Abrir mesa"}
                </button>
            </div>
        </div>
    );
}

function MesaRoom({ mesaId, onBack, meId }) {
    const [mesa, setMesa] = useState(null);
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState("");
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const endRef = useRef(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get(`/mesas/${mesaId}`);
            setMesa(data.mesa);
            setMessages(data.messages || []);
        } catch (e) {
            toastApiError(e, "Mesa indisponível");
            onBack();
        } finally {
            setLoading(false);
        }
    }, [mesaId, onBack]);

    useEffect(() => { load(); }, [load]);

    // Mensagens em tempo real via WS — filtra por esta mesa, dedupe por id.
    const onWs = useCallback((msg) => {
        if (!msg || msg.type !== "mesa_message" || msg.mesa_id !== mesaId) return;
        const m = msg.message;
        if (!m || !m.id) return;
        setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
    }, [mesaId]);
    useWsMessages(onWs);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages.length]);

    const send = async () => {
        const content = text.trim();
        if (!content || sending) return;
        setSending(true);
        setText("");
        try {
            const { data } = await api.post(`/mesas/${mesaId}/message`, { content });
            // Append local (WS também chega; dedupe trata de duplicados).
            setMessages((prev) => (prev.some((x) => x.id === data.id) ? prev : [...prev, data]));
        } catch (e) {
            toastApiError(e, "Mensagem não enviada");
            setText(content);
        } finally {
            setSending(false);
        }
    };

    return (
        <div data-testid="mesa-room" className="flex flex-col h-[100dvh] lg:h-screen">
            <div className="sticky top-0 z-20 glass border-b border-black/[0.06] px-3 lg:px-5 py-3 flex items-center gap-3">
                <button onClick={onBack} aria-label="Voltar" className="w-9 h-9 rounded-full grid place-items-center hover:bg-black/[0.05]">
                    <ArrowLeft size={18} />
                </button>
                <div className="min-w-0 flex-1">
                    <div className="font-heading font-semibold text-[15px] tracking-tight text-black truncate">{mesa?.title || "Mesa"}</div>
                    {mesa && (
                        <div className="text-[11px] font-mono text-black/45 flex items-center gap-2.5">
                            <span className="inline-flex items-center gap-1"><Users size={11} /> {mesa.participants_count}</span>
                            <span className="inline-flex items-center gap-1"><Clock size={11} /> fecha em {fmtLeft(mesa.seconds_left)}</span>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto px-3 lg:px-5 py-4 space-y-3">
                {loading ? (
                    <div className="py-16 text-center text-black/40 text-[13px]">A entrar na mesa…</div>
                ) : messages.length === 0 ? (
                    <div className="py-16 text-center text-black/45 text-[13.5px]">Ainda ninguém falou. Começa tu.</div>
                ) : (
                    messages.map((m) => {
                        const mine = m.author_id === meId;
                        return (
                            <div key={m.id} className={`flex items-start gap-2.5 ${mine ? "flex-row-reverse" : ""}`}>
                                <Avatar user={m.author} size={32} />
                                <div className={`max-w-[78%] ${mine ? "items-end" : "items-start"} flex flex-col`}>
                                    <span className="text-[11px] text-black/45 font-mono px-1">{m.author?.name || m.author?.username}</span>
                                    <div className={`px-3.5 py-2 rounded-2xl text-[14px] leading-snug whitespace-pre-wrap break-words ${mine ? "bg-black text-white" : "bg-black/[0.05] text-black"}`}>
                                        {m.content}
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={endRef} />
            </div>

            <div className="sticky bottom-0 glass border-t border-black/[0.06] px-3 lg:px-5 py-2.5 flex items-center gap-2" style={{ paddingBottom: "calc(0.625rem + var(--safe-bottom, 0px))" }}>
                <input
                    type="text" value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                    placeholder="Escreve na mesa…"
                    data-testid="mesa-composer"
                    className="flex-1 h-11 px-4 rounded-full bg-black/[0.04] focus:bg-white focus:ring-2 ring-black/20 text-[14px] outline-none"
                />
                <button
                    onClick={send}
                    disabled={!text.trim() || sending}
                    aria-label="Enviar"
                    data-testid="mesa-send"
                    className="w-11 h-11 rounded-full bg-black text-white grid place-items-center disabled:opacity-30 tap-shrink"
                >
                    <Send size={17} strokeWidth={2} />
                </button>
            </div>
        </div>
    );
}
