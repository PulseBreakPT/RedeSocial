import { useEffect, useState } from "react";
import { X, Search, Send, MessageCircle } from "lucide-react";
import { api, toastApiError } from "../lib/api";
import { Avatar } from "./Avatar";
import { Spinner } from "./Spinner";
import { VerifiedBadge } from "./VerifiedBadge";
import { postUrl } from "../lib/sharing";
import { toast } from "sonner";

/**
 * Send a Lusorae post privately as a DM to one or more conversations.
 * Reuses the existing /api/messages and /api/conversations endpoints.
 */
export function SendToDMPicker({ post, onClose }) {
    const [conversations, setConversations] = useState(null); // null = loading
    const [query, setQuery] = useState("");
    const [selected, setSelected] = useState(new Set()); // user ids
    const [note, setNote] = useState("");
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const { data } = await api.get("/conversations");
                if (!cancelled) setConversations(data || []);
            } catch {
                if (!cancelled) setConversations([]);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    const link = postUrl(post.id);
    const filtered = (conversations || []).filter((c) => {
        if (!query) return true;
        const q = query.toLowerCase();
        const u = c.user || c.other_user || {};
        return (
            (u.username || "").toLowerCase().includes(q) ||
            (u.name || "").toLowerCase().includes(q)
        );
    });

    const toggle = (id) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const submit = async () => {
        if (selected.size === 0) {
            toast.error("Escolhe pelo menos uma conversa");
            return;
        }
        setBusy(true);
        const text = (note ? note.trim() + "\n\n" : "") + link;
        try {
            await Promise.all(
                Array.from(selected).map((uid) =>
                    api.post("/messages", { to_user_id: uid, content: text }),
                ),
            );
            toast.success(
                selected.size === 1 ? "Publicação enviada por mensagem" : `Enviada a ${selected.size} pessoas`,
            );
            onClose?.();
        } catch (e) {
            toastApiError(e);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div
            className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-md grid place-items-center p-4"
            onClick={onClose}
            data-testid="send-to-dm-modal"
        >
            <div
                className="w-full max-w-lg bg-white border border-black/[0.06] rounded-3xl shadow-[0_40px_100px_-24px_rgba(13,13,16,0.35),0_8px_24px_-8px_rgba(13,13,16,0.10)] anim-fade-up overflow-hidden flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-6 py-4 hairline-b">
                    <div className="flex items-center gap-3 min-w-0">
                        <div
                            className="w-10 h-10 rounded-full grid place-items-center text-white shadow-[0_4px_14px_-4px_rgba(44,111,209,0.5)]"
                            style={{ background: "linear-gradient(135deg, #2c6fd1 0%, #4f8fe8 100%)" }}
                        >
                            <Send size={16} strokeWidth={1.9} />
                        </div>
                        <div className="min-w-0">
                            <p className="type-overline">Enviar por mensagem</p>
                            <h2 className="font-display text-[22px] tracking-tight leading-none text-black truncate">
                                Partilha em privado
                            </h2>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-9 h-9 rounded-full grid place-items-center hover:bg-black/[0.05] text-black/55 hover:text-black tap-shrink transition flex-shrink-0"
                        aria-label="Fechar"
                    >
                        <X size={16} strokeWidth={1.8} />
                    </button>
                </div>

                {/* Search */}
                <div className="px-6 pt-4">
                    <label className="relative block">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-black/35">
                            <Search size={14} strokeWidth={1.8} />
                        </span>
                        <input
                            type="text"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            placeholder="Procurar conversa…"
                            data-testid="dm-picker-search"
                            className="w-full bg-[#fafafa] border border-black/[0.08] rounded-2xl pl-9 pr-3 py-2.5 text-[13.5px] focus:bg-white focus:border-black/30 focus:outline-none focus:ring-2 focus:ring-black/[0.04] transition"
                        />
                    </label>
                </div>

                {/* List */}
                <div className="px-3 py-3 overflow-y-auto flex-1 min-h-[160px]">
                    {conversations === null ? (
                        <div className="grid place-items-center py-10 text-black/45">
                            <Spinner size={18} />
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 py-10 text-black/45">
                            <MessageCircle size={18} strokeWidth={1.6} />
                            <p className="font-mono text-[11px] uppercase tracking-[0.14em]">
                                {conversations.length === 0 ? "Ainda sem conversas" : "Sem resultados"}
                            </p>
                        </div>
                    ) : (
                        <ul className="space-y-0.5">
                            {filtered.map((c) => {
                                const u = c.user || c.other_user || c.author || {};
                                if (!u.id) return null;
                                const active = selected.has(u.id);
                                return (
                                    <li key={u.id}>
                                        <button
                                            onClick={() => toggle(u.id)}
                                            data-testid={`dm-pick-${u.username}`}
                                            aria-pressed={active}
                                            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl tap-shrink transition ${
                                                active ? "bg-black/[0.06]" : "hover:bg-black/[0.04]"
                                            }`}
                                        >
                                            <Avatar user={u} size={36} />
                                            <span className="flex-1 min-w-0 text-left">
                                                <span className="flex items-center gap-1.5 min-w-0">
                                                    <span className="font-heading font-semibold text-[13.5px] text-black truncate">
                                                        {u.name || u.username}
                                                    </span>
                                                    {u.verified && <VerifiedBadge size={11} />}
                                                </span>
                                                <span className="font-mono text-[11px] text-black/45 block truncate">
                                                    @{u.username}
                                                </span>
                                            </span>
                                            <span
                                                className={`w-5 h-5 rounded-full grid place-items-center border-2 flex-shrink-0 transition ${
                                                    active
                                                        ? "bg-black border-black text-white"
                                                        : "border-black/15"
                                                }`}
                                                aria-hidden
                                            >
                                                {active && (
                                                    <span className="block w-2 h-2 rounded-full bg-white" />
                                                )}
                                            </span>
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>

                {/* Optional note */}
                <div className="px-6 pb-2">
                    <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Adiciona um recado (opcional)…"
                        maxLength={240}
                        rows={2}
                        data-testid="dm-picker-note"
                        className="w-full bg-[#fafafa] border border-black/[0.08] rounded-2xl px-3.5 py-2.5 text-[13.5px] focus:bg-white focus:border-black/30 focus:outline-none focus:ring-2 focus:ring-black/[0.04] resize-none transition"
                    />
                </div>

                {/* Footer */}
                <div className="px-6 py-4 hairline-t flex items-center justify-between bg-white">
                    <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-black/45 tabular-nums">
                        {selected.size} {selected.size === 1 ? "selecionada" : "selecionadas"}
                    </span>
                    <div className="flex gap-2">
                        <button
                            onClick={onClose}
                            className="text-[11px] font-mono uppercase tracking-[0.14em] text-black/55 hover:text-black px-4 py-2 rounded-full hover:bg-black/[0.04] tap-shrink transition"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={submit}
                            disabled={busy || selected.size === 0}
                            data-testid="dm-picker-send-btn"
                            className="btn-obsidian text-[11px] px-5 py-2.5 disabled:opacity-40 inline-flex items-center gap-2"
                        >
                            {busy && <Spinner size={11} />} <Send size={11} /> Enviar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
