import { useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "./ui/dialog";
import {
    Share2, Copy, Check, MessageCircle, Send, Facebook, Instagram, ExternalLink, X as XIcon,
} from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { shareEvent, buildEventUrl, canUseWebShare } from "../lib/eventShare";

/**
 * EventShareSheet — share sheet compacto e responsivo para um evento.
 *
 * Layout (vertical):
 *   1. Header — Partilhar + ícone (preview removido a pedido do user)
 *   2. URL canónica + botão Copy
 *   3. 6 canais em grid 3×2 (compactos)
 *
 * Cabe inteiramente em viewport 360×640 sem scroll.
 */

const PT = {
    ink: "#0d0d10",
    red: "#c8102e",
    azul: "#1f4e79",
};
const HAIRLINE = "1px solid rgba(10,10,10,0.08)";

function _SocialIcon({ channel, size = 18 }) {
    if (channel === "whatsapp") return <MessageCircle size={size} strokeWidth={2} />;
    if (channel === "x") return <XIcon size={size} strokeWidth={2} />;
    if (channel === "telegram") return <Send size={size} strokeWidth={2} />;
    if (channel === "facebook") return <Facebook size={size} strokeWidth={2} />;
    if (channel === "instagram") return <Instagram size={size} strokeWidth={2} />;
    return <Share2 size={size} strokeWidth={2} />;
}

const CHANNELS = [
    { key: "whatsapp", label: "WhatsApp", bg: "#25D366", color: "#fff" },
    { key: "x",        label: "X",         bg: "#0d0d10", color: "#fff" },
    { key: "telegram", label: "Telegram",  bg: "#26A5E4", color: "#fff" },
    { key: "facebook", label: "Facebook",  bg: "#1877F2", color: "#fff" },
    { key: "instagram",label: "Instagram", bg: "linear-gradient(135deg, #F58529, #DD2A7B, #8134AF)", color: "#fff" },
    { key: "webshare", label: "Sistema",   bg: "#0d0d10", color: "#fff" },
];

export function EventShareSheet({ open, onOpenChange, event, onShared }) {
    const { user } = useAuth();
    const [copied, setCopied] = useState(false);
    // Lazy init — evita setState dentro de useEffect (regra react-hooks).
    const [hasWebShare] = useState(() => {
        try { return canUseWebShare(); } catch { return false; }
    });

    if (!event) return null;

    const slug = event.slug || (event.key || "").replace(/_/g, "-");
    const url = buildEventUrl(slug, { via: user?.username });

    const handleChannel = async (ch) => {
        const res = await shareEvent({ event, channel: ch, viewerUsername: user?.username });
        if (res?.cancelled) return;
        // Tracking server-side (best-effort)
        try {
            await api.post(`/calendar/event/${slug}/share`, {
                channel: ch,
                via: user?.username || null,
            });
        } catch { /* tracking is best-effort */ }
        if (ch === "copy" && res?.ok) {
            setCopied(true);
            setTimeout(() => setCopied(false), 2200);
        }
        if (onShared) onShared(ch, res);
    };

    const channels = CHANNELS.filter((c) => c.key !== "webshare" || hasWebShare);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="grid-cols-1 max-w-[400px] w-[calc(100vw-2rem)] sm:w-full max-h-[90vh] overflow-y-auto overflow-x-hidden p-0 gap-0 rounded-2xl"
                data-testid="event-share-sheet"
                style={{ background: "#fff", border: HAIRLINE }}
            >
                <DialogTitle className="sr-only">Partilhar {event.title}</DialogTitle>
                <DialogDescription className="sr-only">
                    Escolhe um canal para partilhar este evento.
                </DialogDescription>

                {/* ── Header compacto (sem preview gigante) ── */}
                <div className="px-4 sm:px-5 pt-4 pb-3" style={{ borderBottom: HAIRLINE }}>
                    <div className="flex items-center gap-2 pr-7">
                        <Share2 size={14} strokeWidth={2.2} style={{ color: PT.ink }} />
                        <span className="font-semibold tracking-tight text-[14px] truncate" style={{ color: PT.ink }}>
                            Partilhar
                        </span>
                        <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.14em] truncate max-w-[120px]" style={{ color: "rgba(10,10,10,0.45)" }}>
                            {event.title}
                        </span>
                    </div>
                </div>

                {/* ── URL + copy ── */}
                <div className="px-4 sm:px-5 py-3" style={{ borderBottom: HAIRLINE }}>
                    <div
                        className="flex items-center gap-2 px-3 py-2 rounded-full"
                        style={{ background: "rgba(10,10,10,0.04)", border: HAIRLINE }}
                    >
                        <ExternalLink size={12} strokeWidth={2.2} style={{ color: "rgba(10,10,10,0.55)", flexShrink: 0 }} />
                        <span
                            className="font-mono text-[11px] truncate flex-1 min-w-0"
                            style={{ color: "rgba(10,10,10,0.72)" }}
                            data-testid="event-share-url"
                        >
                            {url}
                        </span>
                        <button
                            type="button"
                            data-testid="event-share-copy"
                            onClick={() => handleChannel("copy")}
                            aria-label="Copiar link"
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-semibold text-[11px] transition-all duration-200 flex-shrink-0"
                            style={{
                                background: copied ? "rgba(34,138,73,0.10)" : PT.ink,
                                color: copied ? "#228a49" : "#fff",
                                border: copied ? "1px solid rgba(34,138,73,0.25)" : "1px solid rgba(10,10,10,0.20)",
                            }}
                        >
                            {copied ? (
                                <>
                                    <Check size={11} strokeWidth={2.6} />
                                    copiado
                                </>
                            ) : (
                                <>
                                    <Copy size={11} strokeWidth={2.4} />
                                    copiar
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* ── Canais (3×2 grid compacto) ── */}
                <div className="px-4 sm:px-5 py-4">
                    <div className="grid grid-cols-3 gap-2" data-testid="event-share-channels">
                        {channels.map((c) => (
                            <button
                                key={c.key}
                                type="button"
                                onClick={() => handleChannel(c.key)}
                                data-testid={`event-share-${c.key}`}
                                className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md min-w-0"
                                style={{
                                    background: c.bg,
                                    color: c.color,
                                    border: "1px solid rgba(0,0,0,0.10)",
                                }}
                            >
                                <_SocialIcon channel={c.key} size={17} />
                                <span className="font-semibold text-[10.5px] tracking-tight truncate max-w-full px-1">{c.label}</span>
                            </button>
                        ))}
                    </div>

                    <p className="mt-3 text-[10.5px] text-center" style={{ color: "rgba(10,10,10,0.48)" }}>
                        Cada link traz portugueses novos para a Lusorae.
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
}
