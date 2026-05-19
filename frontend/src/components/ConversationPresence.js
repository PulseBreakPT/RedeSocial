import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { usePostPresence } from "../hooks/usePostPresence";

/**
 * Atmospheric "this conversation is alive" indicator for PostDetail.
 *
 * Aggregates two signals, both ultra-subtle:
 *   1) Live viewers count (via WS) → "em conversa"
 *   2) Social temperature → "a aquecer" / "em brasa" / "a ferver"
 *
 * Manifesto-aligned: prefers qualitative bands over raw numbers
 * ("várias pessoas" > "4 pessoas"). No emojis, no exclamations.
 */
export function ConversationPresence({ postId, className = "" }) {
    const viewers = usePostPresence(postId);
    const [tempState, setTempState] = useState(null);

    useEffect(() => {
        if (!postId) return;
        let cancelled = false;
        const fetchTemp = async () => {
            try {
                const { data } = await api.get(`/temperature/post/${postId}`);
                if (cancelled) return;
                // states: frio · morno · quente · em_brasa · a_ferver
                if (data?.state && data.state !== "frio") setTempState(data.state);
            } catch { /* silent */ }
        };
        fetchTemp();
        // Re-check every 60s (cheap, atmospheric — not a counter)
        const id = setInterval(fetchTemp, 60000);
        return () => { cancelled = true; clearInterval(id); };
    }, [postId]);

    // Qualitative band for viewer count (Manifesto: "sem números que viciam")
    let viewerLabel = null;
    if (viewers >= 8) viewerLabel = "muitas pessoas em conversa";
    else if (viewers >= 4) viewerLabel = "várias pessoas em conversa";
    else if (viewers >= 2) viewerLabel = "em conversa";

    // Heat label — text only, never emoji
    let heatLabel = null;
    let heatTone = "text-black/45";
    if (tempState === "quente") { heatLabel = "a aquecer"; heatTone = "text-amber-700/70"; }
    else if (tempState === "em_brasa") { heatLabel = "em brasa"; heatTone = "text-orange-700/80"; }
    else if (tempState === "a_ferver") { heatLabel = "em brasa intensa"; heatTone = "text-rose-700/80"; }
    else if (tempState === "morno") { heatLabel = "com vida"; heatTone = "text-black/50"; }

    if (!viewerLabel && !heatLabel) return null;

    return (
        <div
            data-testid="conversation-presence"
            className={`inline-flex items-center gap-3 text-[10.5px] font-mono uppercase tracking-wider ${className}`}
            aria-live="polite"
        >
            {viewerLabel && (
                <span className="inline-flex items-center gap-1.5 text-black/55">
                    <span className="relative inline-flex w-1.5 h-1.5">
                        <span className="absolute inset-0 rounded-full bg-emerald-500/85 anim-live-dot" />
                    </span>
                    {viewerLabel}
                </span>
            )}
            {viewerLabel && heatLabel && (
                <span className="text-black/20 select-none">·</span>
            )}
            {heatLabel && (
                <span className={`${heatTone}`}>{heatLabel}</span>
            )}
        </div>
    );
}
