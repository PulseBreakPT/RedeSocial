import { useState, useRef, useEffect } from "react";
import { SmilePlus } from "lucide-react";
import { api, formatApiError } from "../lib/api";
import { toast } from "sonner";

const REACTIONS = ["❤️", "🔥", "👏", "😂", "💯", "😢"];

export function PostReactions({ postId, reactions, viewer, onUpdate }) {
    const [local, setLocal] = useState(reactions || {});
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const onDoc = (e) => {
            if (open && ref.current && !ref.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener("mousedown", onDoc);
        return () => document.removeEventListener("mousedown", onDoc);
    }, [open]);

    const react = async (e, emoji) => {
        e.stopPropagation();
        if (!viewer || busy) return;
        setBusy(true);
        setOpen(false);
        try {
            const { data } = await api.post(`/posts/${postId}/react`, { emoji });
            setLocal(data.reactions);
            onUpdate?.(data.reactions);
        } catch (err) {
            toast.error(formatApiError(err));
        } finally {
            setBusy(false);
        }
    };

    const active = REACTIONS.filter((e) => (local[e]?.count || 0) > 0);
    const hasAny = active.length > 0;

    return (
        <div className="relative inline-flex items-center gap-1 flex-wrap" ref={ref} onClick={(e) => e.stopPropagation()}>
            {active.map((emoji) => {
                const r = local[emoji];
                return (
                    <button
                        key={emoji}
                        onClick={(e) => react(e, emoji)}
                        disabled={busy}
                        data-testid={`reaction-${emoji}-${postId}`}
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs border transition tap-shrink ${
                            r.reacted
                                ? "border-black/40 bg-black/[0.05]"
                                : "border-black/[0.08] hover:border-black/30 hover:bg-black/[0.03]"
                        }`}
                    >
                        <span className="text-[13px] leading-none">{emoji}</span>
                        <span className="font-mono text-[10px] tabular-nums text-black/70">{r.count}</span>
                    </button>
                );
            })}
            <button
                onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
                data-testid={`react-toggle-${postId}`}
                className={`inline-flex items-center justify-center rounded-full p-1 text-black/40 hover:text-black hover:bg-black/[0.04] transition tap-shrink ${hasAny ? "" : "border border-dashed border-black/[0.12]"}`}
                title="Reagir"
            >
                <SmilePlus size={hasAny ? 13 : 14} />
            </button>
            {open && (
                <div className="absolute bottom-full left-0 mb-1 z-30 flex bg-white border border-black/[0.08] rounded-2xl px-1.5 py-1.5 gap-0.5 shadow-xl" data-testid={`react-picker-${postId}`}>
                    {REACTIONS.map((emoji) => (
                        <button
                            key={emoji}
                            onClick={(e) => react(e, emoji)}
                            disabled={busy}
                            className={`hover:bg-black/[0.05] rounded-full w-8 h-8 grid place-items-center text-base tap-shrink transition hover:scale-125 ${
                                local[emoji]?.reacted ? "bg-black/[0.06]" : ""
                            }`}
                            data-testid={`react-pick-${emoji}-${postId}`}
                        >
                            {emoji}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
