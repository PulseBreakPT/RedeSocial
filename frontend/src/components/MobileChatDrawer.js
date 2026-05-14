import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle, X, ChevronRight, Search, Pin } from "lucide-react";
import { api } from "../lib/api";
import { Avatar } from "../components/Avatar";
import { smartTime } from "../lib/time";
import { useLiveTime } from "../hooks/useLiveTime";

/**
 * MobileChatDrawer — Painel lateral direito com conversas recentes.
 * Activado pelo gesto swipe-direita→esquerda (ou botão).
 */
export function MobileChatDrawer({ open, onClose, dragProgress = 0 }) {
    const navigate = useNavigate();
    const [convs, setConvs] = useState([]);
    const [loading, setLoading] = useState(true);
    useLiveTime(30000);

    const load = useCallback(async () => {
        try {
            const { data } = await api.get("/conversations?filter=all");
            setConvs((data || []).slice(0, 12));
        } catch { /* silent */ } finally { setLoading(false); }
    }, []);

    useEffect(() => {
        if (!open) return;
        load();
        const tick = () => { if (!document.hidden) load(); };
        const id = setInterval(tick, 8000);
        return () => clearInterval(id);
    }, [open, load]);

    // Lock body scroll while drawer is open
    useEffect(() => {
        if (!open) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = prev; };
    }, [open]);

    // ESC to close
    useEffect(() => {
        if (!open) return;
        const onKey = (e) => { if (e.key === "Escape") onClose(); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, onClose]);

    if (!open) return null;

    const go = (to) => { navigate(to); onClose(); };

    const unreadCount = convs.reduce((acc, c) => acc + (c.unread || 0), 0);

    return (
        <div
            className="lg:hidden fixed inset-0 z-[80]"
            data-testid="mobile-chat-drawer"
        >
            {/* Overlay */}
            <button
                aria-label="Fechar chats"
                onClick={onClose}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in-0 duration-200"
                data-testid="mobile-chat-overlay"
            />
            {/* Drawer body — slides from right */}
            <aside
                className="absolute inset-y-0 right-0 w-[88%] max-w-[360px] bg-white shadow-[-24px_0_60px_-10px_rgba(13,13,16,0.25)] flex flex-col pt-safe"
                style={{ animation: "chatDrawerIn 320ms cubic-bezier(0.16,1,0.3,1) both" }}
                data-gesture-ignore="true"
            >
                <style>{`@keyframes chatDrawerIn { from { transform: translateX(100%); opacity: 0.6; } to { transform: translateX(0); opacity: 1; } }`}</style>

                {/* Header */}
                <div className="px-5 py-4 hairline-b flex items-center justify-between">
                    <div>
                        <h2 className="font-display text-[22px] font-semibold tracking-tight leading-none">
                            Chats
                        </h2>
                        <p className="text-[11.5px] text-black/45 font-mono mt-1">
                            {loading
                                ? "a carregar…"
                                : convs.length === 0
                                    ? "ainda sem conversas"
                                    : unreadCount > 0
                                        ? `${unreadCount} por ler · ${convs.length} no total`
                                        : `${convs.length} ${convs.length === 1 ? "conversa" : "conversas"}`}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        data-testid="mchat-close"
                        className="p-2 -mr-1 rounded-full text-black hover:bg-black/[0.06] active:scale-90"
                        aria-label="Fechar"
                    >
                        <X size={20} strokeWidth={1.7} />
                    </button>
                </div>

                {/* Search / new shortcut */}
                <div className="px-3 py-3 hairline-b flex items-center gap-2">
                    <button
                        onClick={() => go("/messages")}
                        data-testid="mchat-go-search"
                        className="flex-1 flex items-center gap-2 bg-black/[0.04] rounded-full px-3 py-2 text-[13px] text-black/50 hover:bg-black/[0.07] transition"
                    >
                        <Search size={14} /> Procurar conversa…
                    </button>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto" data-gesture-ignore="true">
                    {loading ? (
                        <div className="p-5 space-y-3">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="flex items-center gap-3 animate-pulse">
                                    <div className="w-11 h-11 rounded-full bg-black/[0.06]" />
                                    <div className="flex-1 space-y-1.5">
                                        <div className="h-3 w-1/3 rounded bg-black/[0.06]" />
                                        <div className="h-2.5 w-2/3 rounded bg-black/[0.04]" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : convs.length === 0 ? (
                        <div className="px-6 py-12 text-center anim-fade-up">
                            <div className="ring-silver w-16 h-16 rounded-full grid place-items-center mx-auto mb-4">
                                <MessageCircle size={22} strokeWidth={1.4} className="text-black/70" />
                            </div>
                            <h3 className="font-display text-[17px] font-bold tracking-tight">
                                Sem mensagens
                            </h3>
                            <p className="text-black/55 text-[13px] mt-1.5 max-w-[28ch] mx-auto leading-relaxed">
                                Começa a falar com alguém da comunidade.
                            </p>
                            <button
                                onClick={() => go("/messages")}
                                data-testid="mchat-empty-cta"
                                className="mt-5 btn-obsidian text-[12px] px-5 py-2.5"
                            >
                                Abrir mensagens
                            </button>
                        </div>
                    ) : (
                        convs.map((c) => (
                            <button
                                key={c.key}
                                type="button"
                                onClick={() => go(`/messages/${c.other_user?.username}`)}
                                data-testid={`mchat-conv-${c.other_user?.username}`}
                                className="group w-full flex items-center gap-3 p-3.5 hairline-b hover:bg-black/[0.025] active:bg-black/[0.04] transition text-left"
                            >
                                <Avatar user={c.other_user} size={44} showOnline />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5">
                                        {c.pinned && <Pin size={11} className="text-black/55" strokeWidth={2} />}
                                        <span className="font-semibold text-[13.5px] text-black tracking-tight truncate">
                                            {c.other_user?.name}
                                        </span>
                                        <span className="ml-auto text-[10.5px] text-black/45 font-mono shrink-0">
                                            {c.last_at ? smartTime(c.last_at) : ""}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <span className={`text-[12.5px] truncate ${c.unread ? "text-black font-medium" : "text-black/55"}`}>
                                            {c.last_message || "—"}
                                        </span>
                                        {c.unread > 0 && (
                                            <span
                                                className="ml-auto shrink-0 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-mono grid place-items-center text-white font-bold"
                                                style={{ background: "var(--coral-500)" }}
                                            >
                                                {c.unread > 99 ? "99+" : c.unread}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </button>
                        ))
                    )}
                </div>

                {/* Footer */}
                <div className="p-3 hairline-t">
                    <button
                        onClick={() => go("/messages")}
                        data-testid="mchat-see-all"
                        className="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-full bg-black/[0.04] hover:bg-black/[0.07] active:scale-[0.98] transition text-[13.5px] font-medium tracking-tight"
                    >
                        <span>Ver todas as conversas</span>
                        <ChevronRight size={16} />
                    </button>
                </div>
            </aside>
        </div>
    );
}
