import { useEffect, useRef, useState } from "react";
import { useFeedPulse } from "../hooks/useFeedPulse";

/**
 * Atmospheric "this post is alive right now" row.
 *
 * Sits just below the action bar of a PostCard in the feed.
 *
 * Principles (Lusorae manifesto):
 *   · Discreet — text-only, mono caps, no emoji, no neon.
 *   · Qualitative bands over raw numbers ("várias pessoas" > "4 pessoas").
 *   · Self-hides when there's no real signal (heat=frio, viewers<2, replies=0).
 *   · One faint emerald dot is enough — no spam of green dots.
 */
export function PostLiveSignals({ postId, commentsCount = 0 }) {
    const { pulse } = useFeedPulse(postId);
    const [tick, setTick] = useState(0);
    const prevRecentRef = useRef(0);

    // Trigger a micro-tick on counter when recent_comments_15m increases
    useEffect(() => {
        if (!pulse) return;
        if (pulse.recent_comments_15m > prevRecentRef.current) {
            setTick((t) => t + 1);
        }
        prevRecentRef.current = pulse.recent_comments_15m || 0;
    }, [pulse?.recent_comments_15m]);

    if (!postId || !pulse) return null;

    const { live_viewers = 0, recent_comments_15m = 0, heat = "frio" } = pulse;
    const isHot = heat === "quente" || heat === "em_brasa" || heat === "a_ferver";

    // Qualitative viewer band (no raw numbers below 8)
    let viewerLabel = null;
    if (live_viewers >= 8) viewerLabel = "muitas pessoas em conversa";
    else if (live_viewers >= 4) viewerLabel = "várias pessoas em conversa";
    else if (live_viewers >= 2) viewerLabel = `${live_viewers} em conversa`;

    // Recent replies line
    let recentLabel = null;
    if (recent_comments_15m >= 1) {
        recentLabel = recent_comments_15m === 1
            ? "1 resposta há pouco"
            : `${recent_comments_15m} respostas há pouco`;
    }

    // Heat pill
    let heatLabel = null;
    let heatTone = "";
    if (heat === "quente")   { heatLabel = "a aquecer";       heatTone = "text-amber-700/85 bg-amber-50/70 border-amber-200/70"; }
    else if (heat === "em_brasa") { heatLabel = "em brasa";   heatTone = "text-orange-700/90 bg-orange-50/70 border-orange-200/70"; }
    else if (heat === "a_ferver") { heatLabel = "a ferver";   heatTone = "text-rose-700/90 bg-rose-50/70 border-rose-200/70"; }

    // Nothing to show → render nothing (manifesto rule)
    if (!viewerLabel && !recentLabel && !heatLabel) return null;

    return (
        <div
            data-testid={`post-live-signals-${postId}`}
            className="live-signals-row mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[10.5px] font-mono uppercase tracking-wider text-black/55"
            aria-live="polite"
        >
            {viewerLabel && (
                <span className="inline-flex items-center gap-1.5">
                    <span className="relative inline-flex w-1.5 h-1.5">
                        <span className="absolute inset-0 rounded-full bg-emerald-500/80 anim-live-dot" />
                    </span>
                    {viewerLabel}
                </span>
            )}

            {viewerLabel && recentLabel && <span className="text-black/15 select-none" aria-hidden>·</span>}

            {recentLabel && (
                <span className="inline-flex items-center gap-1 text-black/55">
                    <span key={tick} className="anim-count-tick inline-block tabular-nums">{recentLabel}</span>
                </span>
            )}

            {(viewerLabel || recentLabel) && heatLabel && <span className="text-black/15 select-none" aria-hidden>·</span>}

            {heatLabel && (
                <span className={`inline-flex items-center gap-1 px-1.5 py-[1px] rounded-full border anim-heat-pulse ${heatTone}`}>
                    {heatLabel}
                </span>
            )}
        </div>
    );
}
