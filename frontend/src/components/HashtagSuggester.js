import { useEffect, useState, useRef } from "react";
import { Hash, TrendingUp } from "lucide-react";
import { api } from "../lib/api";

// Smart hashtag suggester that pops up below the composer
// Triggers on `#` followed by 2+ chars; suggests popular or matching tags
export function HashtagSuggester({ text, onInsert }) {
    const [suggestions, setSuggestions] = useState([]);
    const [show, setShow] = useState(false);
    const [partial, setPartial] = useState("");
    const timerRef = useRef(null);

    useEffect(() => {
        if (!text) { setShow(false); return; }
        // Find last hashtag being typed
        const m = text.match(/#([\wáéíóúâêîôûãõçÁÉÍÓÚÂÊÎÔÛÃÕÇ-]{2,})$/);
        if (!m) { setShow(false); return; }
        const q = m[1].toLowerCase();
        setPartial(q);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(async () => {
            try {
                const r = await api.get(`/hashtags/suggest?q=${encodeURIComponent(q)}`);
                setSuggestions(r.data || []);
                setShow((r.data || []).length > 0);
            } catch {
                setShow(false);
            }
        }, 200);
    }, [text]);

    function pick(tag) {
        if (!onInsert) return;
        // Replace the partial tag with the full one
        onInsert(tag, partial);
        setShow(false);
    }

    if (!show || suggestions.length === 0) return null;

    return (
        <div
            className="mt-1 rounded-xl border border-black/[0.08] bg-white shadow-lg overflow-hidden"
            data-testid="hashtag-suggester"
        >
            <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-black/45 flex items-center gap-1 border-b border-black/[0.04]">
                <TrendingUp size={10} /> Sugestões
            </div>
            <div className="max-h-44 overflow-y-auto">
                {suggestions.map((s) => (
                    <button
                        key={s.tag}
                        onClick={() => pick(s.tag)}
                        className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-black/[0.04] transition"
                        data-testid={`hashtag-suggest-${s.tag}`}
                    >
                        <span className="text-xs font-mono flex items-center gap-1.5">
                            <Hash size={11} className="text-black/45" />
                            {s.tag}
                        </span>
                        <span className="text-[10px] font-mono text-black/40">{s.count} posts</span>
                    </button>
                ))}
            </div>
        </div>
    );
}
