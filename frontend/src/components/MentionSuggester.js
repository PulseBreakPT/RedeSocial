import { useEffect, useState, useRef } from "react";
import { AtSign } from "lucide-react";
import { api } from "../lib/api";
import { Avatar } from "./Avatar";
import { VerifiedBadge } from "./VerifiedBadge";

/**
 * Mention autocomplete suggester (@username).
 * Triggers on `@` followed by 1+ chars at the current caret position
 * (we use end-of-text as a proxy, mirroring HashtagSuggester behaviour).
 * Queries /users/search and lets the user pick a candidate to expand.
 */
export function MentionSuggester({ text, onInsert }) {
    const [suggestions, setSuggestions] = useState([]);
    const [show, setShow] = useState(false);
    const [partial, setPartial] = useState("");
    const [activeIdx, setActiveIdx] = useState(0);
    const timerRef = useRef(null);

    useEffect(() => {
        if (!text) { setShow(false); return; }
        // Match @partial at end of text. Username may contain letters, digits, _ and ..
        const m = text.match(/(?:^|\s)@([a-zA-Z0-9_.]{1,30})$/);
        if (!m) { setShow(false); return; }
        const q = m[1].toLowerCase();
        setPartial(q);
        setActiveIdx(0);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(async () => {
            try {
                const r = await api.get(`/users/search?q=${encodeURIComponent(q)}`);
                const arr = Array.isArray(r.data) ? r.data.slice(0, 6) : [];
                setSuggestions(arr);
                setShow(arr.length > 0);
            } catch {
                setShow(false);
            }
        }, 180);
    }, [text]);

    useEffect(() => {
        if (!show) return;
        const onKey = (e) => {
            if (e.key === "ArrowDown") {
                e.preventDefault();
                setActiveIdx((i) => (i + 1) % suggestions.length);
            } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveIdx((i) => (i - 1 + suggestions.length) % suggestions.length);
            } else if (e.key === "Enter" || e.key === "Tab") {
                e.preventDefault();
                pick(suggestions[activeIdx]);
            } else if (e.key === "Escape") {
                setShow(false);
            }
        };
        window.addEventListener("keydown", onKey, true);
        return () => window.removeEventListener("keydown", onKey, true);
        // eslint-disable-next-line
    }, [show, activeIdx, suggestions]);

    function pick(u) {
        if (!u || !onInsert) return;
        onInsert(u.username, partial);
        setShow(false);
    }

    if (!show || suggestions.length === 0) return null;

    return (
        <div
            className="mt-1 rounded-xl border border-black/[0.08] bg-white shadow-lg overflow-hidden"
            data-testid="mention-suggester"
        >
            <div className="px-3 py-1.5 text-[10px] font-mono uppercase tracking-wider text-black/45 flex items-center gap-1 border-b border-black/[0.04]">
                <AtSign size={10} /> Mencionar pessoa
            </div>
            <div className="max-h-56 overflow-y-auto">
                {suggestions.map((u, i) => (
                    <button
                        key={u.username}
                        onClick={() => pick(u)}
                        onMouseEnter={() => setActiveIdx(i)}
                        className={
                            "w-full flex items-center gap-2 px-3 py-2 text-left transition " +
                            (i === activeIdx ? "bg-black/[0.06]" : "hover:bg-black/[0.04]")
                        }
                        data-testid={`mention-suggest-${u.username}`}
                    >
                        <Avatar user={u} size={26} />
                        <div className="flex-1 min-w-0">
                            <div className="font-heading font-semibold text-[12.5px] tracking-tight text-black flex items-center gap-1">
                                {u.name}
                                {u.verified && <VerifiedBadge size={10} />}
                            </div>
                            <div className="text-[10.5px] font-mono text-black/45">@{u.username}</div>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}
