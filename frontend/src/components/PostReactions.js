import { useState, useRef, useEffect } from "react";
import { SmilePlus } from "lucide-react";
import { api, toastApiError } from "../lib/api";

/**
 * F3.1 — PT-native reactions.
 * One reaction per user. Clicking on a different reaction REPLACES the previous one
 * automatically on the backend. Clicking the same reaction removes it.
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
    const [pulseKey, setPulseKey] = useState(null);
    const ref = useRef(null);

    useEffect(() => { setLocal(reactions || {}); }, [reactions]);

    useEffect(() => {
        const onDoc = (e) => {
            if (open && ref.current && !ref.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener("mousedown", onDoc);
        return () => document.removeEventListener("mousedown", onDoc);
    }, [open]);

    // Find currently active reaction (only one allowed per user)
    const myReaction = PT_REACTIONS.find((r) => local[r.key]?.reacted)?.key || null;

    const react = async (e, key) => {
        e.stopPropagation();
        if (!viewer || busy) return;
        setBusy(true);
        setOpen(false);
        setPulseKey(key);

        // Optimistic UI: simulate one-reaction-per-user locally so it feels instant.
        const optimistic = {};
        for (const r of PT_REACTIONS) {
            const cur = local[r.key] || { count: 0, reacted: false };
            let count = cur.count || 0;
            let reacted = cur.reacted;
            if (reacted) {
                count = Math.max(0, count - 1);
                reacted = false;
            }
            if (r.key === key && myReaction !== key) {
                count += 1;
                reacted = true;
            }
            optimistic[r.key] = { count, reacted };
        }
        setLocal(optimistic);

        try {
            const { data } = await api.post(`/posts/${postId}/react`, { emoji: key });
            setLocal(data.reactions);
            onUpdate?.(data.reactions);
        } catch (err) {
            toastApiError(err);
            setLocal(reactions || {}); // revert
        } finally {
            setBusy(false);
            setTimeout(() => setPulseKey(null), 480);
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
                const isMine = r.reacted;
                const isPulsing = pulseKey === key;
                return (
                    <button
                        key={key}
                        onClick={(e) => react(e, key)}
                        disabled={busy}
                        title={`${meta.label} — ${meta.hint}`}
                        data-testid={`reaction-${key}-${postId}`}
                        className={`reaction-chip inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs border transition-all duration-200 tap-shrink ${
                            isMine
                                ? "reaction-chip--mine border-transparent text-white shadow-sm"
                                : "border-black/[0.08] hover:border-black/30 hover:bg-black/[0.04]"
                        } ${isPulsing ? "reaction-chip--pulse" : ""}`}
                    >
                        <span className={`text-[13px] leading-none ${isPulsing ? "anim-pop" : ""}`}>
                            {meta.emoji}
                        </span>
                        <span
                            className={`font-mono text-[10px] tabular-nums ${
                                isMine ? "text-white/95" : "text-black/65"
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
                aria-haspopup="menu"
                aria-expanded={open}
                className={`inline-flex items-center justify-center rounded-full p-1 transition tap-shrink ${
                    myReaction
                        ? "text-coral hover:bg-coral-50"
                        : hasAny
                            ? "text-black/45 hover:text-black hover:bg-black/[0.04]"
                            : "text-black/40 hover:text-black hover:bg-black/[0.04] border border-dashed border-black/[0.14] hover:border-black/30"
                }`}
                title={myReaction ? "Trocar reação" : "Reagir"}
            >
                <SmilePlus size={hasAny ? 13 : 14} />
            </button>
            {open && (
                <div
                    className="absolute bottom-full left-0 mb-1.5 z-30 flex bg-white border border-black/[0.08] rounded-2xl px-1.5 py-1.5 gap-0.5 shadow-[0_18px_48px_-12px_rgba(13,13,16,0.22)] anim-pop"
                    data-testid={`react-picker-${postId}`}
                >
                    {PT_REACTIONS.map(({ key, emoji, label, hint }) => {
                        const isMine = myReaction === key;
                        return (
                            <button
                                key={key}
                                onClick={(e) => react(e, key)}
                                disabled={busy}
                                title={`${label} — ${hint}`}
                                className={`relative rounded-full w-9 h-9 grid place-items-center text-base tap-shrink transition transform hover:scale-125 ${
                                    isMine ? "bg-coral-50 ring-2 ring-coral/50 scale-110" : "hover:bg-black/[0.05]"
                                }`}
                                data-testid={`react-pick-${key}-${postId}`}
                            >
                                <span aria-hidden>{emoji}</span>
                                <span className="sr-only">{label}</span>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
