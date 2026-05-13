import { useState, useRef, useEffect } from "react";
import { SmilePlus } from "lucide-react";
import { api, formatApiError } from "../lib/api";
import { toast } from "sonner";

/**
 * F3.1 — PT-native reactions.
 * Each reaction carries cultural meaning, not just sentiment.
 * Saudade replaces the generic like; "café" is "bookmark social — vou ler com calma";
 * "orgulho" is rare and reserved for moments. Identity is built into the reaction itself.
 */
export const PT_REACTIONS = [
    { key: "saudade", emoji: "🫶", label: "Saudade",  hint: "Comove-me" },
    { key: "comove",  emoji: "🥲", label: "Comove",   hint: "Tocou-me" },
    { key: "tasca",   emoji: "😂", label: "Tasca",    hint: "Riso PT" },
    { key: "bombou",  emoji: "🔥", label: "Bombou",   hint: "Está viral" },
    { key: "cafe",    emoji: "☕", label: "Café",     hint: "Vou ler com calma" },
    { key: "orgulho", emoji: "🇵🇹", label: "Orgulho",  hint: "Reservada — só para momentos." },
];

const KEY_TO_REACTION = Object.fromEntries(PT_REACTIONS.map((r) => [r.key, r]));

export function PostReactions({ postId, reactions, viewer, onUpdate }) {
    const [local, setLocal] = useState(reactions || {});
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const ref = useRef(null);

    useEffect(() => { setLocal(reactions || {}); }, [reactions]);

    useEffect(() => {
        const onDoc = (e) => {
            if (open && ref.current && !ref.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener("mousedown", onDoc);
        return () => document.removeEventListener("mousedown", onDoc);
    }, [open]);

    const react = async (e, key) => {
        e.stopPropagation();
        if (!viewer || busy) return;
        setBusy(true);
        setOpen(false);
        try {
            const { data } = await api.post(`/posts/${postId}/react`, { emoji: key });
            setLocal(data.reactions);
            onUpdate?.(data.reactions);
        } catch (err) {
            toast.error(formatApiError(err));
        } finally {
            setBusy(false);
        }
    };

    const activeKeys = PT_REACTIONS.filter((r) => (local[r.key]?.count || 0) > 0).map((r) => r.key);
    const hasAny = activeKeys.length > 0;

    return (
        <div
            className="relative inline-flex items-center gap-1 flex-wrap"
            ref={ref}
            onClick={(e) => e.stopPropagation()}
        >
            {activeKeys.map((key) => {
                const r = local[key];
                const meta = KEY_TO_REACTION[key];
                if (!meta) return null;
                return (
                    <button
                        key={key}
                        onClick={(e) => react(e, key)}
                        disabled={busy}
                        title={meta.label}
                        data-testid={`reaction-${key}-${postId}`}
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs border transition tap-shrink ${
                            r.reacted
                                ? "chip-on border-transparent !text-white shadow-sm"
                                : "border-black/[0.08] hover:border-black/30 hover:bg-black/[0.03]"
                        }`}
                    >
                        <span className="text-[13px] leading-none">{meta.emoji}</span>
                        <span
                            className={`font-mono text-[10px] tabular-nums ${
                                r.reacted ? "!text-white/95" : "text-black/70"
                            }`}
                        >
                            {r.count}
                        </span>
                    </button>
                );
            })}
            <button
                onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
                data-testid={`react-toggle-${postId}`}
                className={`inline-flex items-center justify-center rounded-full p-1 text-black/40 hover:text-black hover:bg-black/[0.04] transition tap-shrink ${
                    hasAny ? "" : "border border-dashed border-black/[0.12]"
                }`}
                title="Reagir (reações PT)"
            >
                <SmilePlus size={hasAny ? 13 : 14} />
            </button>
            {open && (
                <div
                    className="absolute bottom-full left-0 mb-1.5 z-30 flex bg-white border border-black/[0.08] rounded-2xl px-1.5 py-1.5 gap-0.5 shadow-xl anim-pop"
                    data-testid={`react-picker-${postId}`}
                >
                    {PT_REACTIONS.map(({ key, emoji, label, hint }) => (
                        <button
                            key={key}
                            onClick={(e) => react(e, key)}
                            disabled={busy}
                            title={`${label} — ${hint}`}
                            className={`hover:bg-black/[0.05] rounded-full w-9 h-9 grid place-items-center text-base tap-shrink transition hover:scale-125 relative ${
                                local[key]?.reacted ? "bg-black/[0.06]" : ""
                            }`}
                            data-testid={`react-pick-${key}-${postId}`}
                        >
                            <span aria-hidden>{emoji}</span>
                            <span className="sr-only">{label}</span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
