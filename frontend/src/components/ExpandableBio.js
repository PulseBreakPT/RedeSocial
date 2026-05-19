import { useMemo, useRef, useState, useEffect } from "react";
import { ChevronDown } from "lucide-react";

/**
 * Truncates a bio to ~3 lines (mobile) / 4 lines (desktop) and shows a
 * subtle "ver mais" toggle that expands with a smooth height transition.
 * Falls back to a character-count heuristic for very long bios so the
 * truncation works even before measurement.
 */
export function ExpandableBio({ text, className = "" }) {
    const [expanded, setExpanded] = useState(false);
    const [overflows, setOverflows] = useState(false);
    const ref = useRef(null);

    const seemsLong = useMemo(() => (text || "").length > 180, [text]);

    useEffect(() => {
        if (!ref.current) return;
        const el = ref.current;
        // After render, decide if collapsed content actually overflows.
        const check = () => {
            // Only measure when collapsed
            const wasExpanded = el.classList.contains("is-expanded");
            if (wasExpanded) return;
            setOverflows(el.scrollHeight - 2 > el.clientHeight);
        };
        check();
        const ro = new ResizeObserver(check);
        ro.observe(el);
        return () => ro.disconnect();
    }, [text]);

    if (!text) return null;

    const showToggle = overflows || seemsLong;

    return (
        <div className={className} data-testid="expandable-bio">
            <div
                ref={ref}
                className={`bio-clamp ${expanded ? "is-expanded" : ""} text-black/80 leading-relaxed text-[15px] max-w-[60ch] whitespace-pre-wrap`}
            >
                {text}
            </div>
            {showToggle && (
                <button
                    type="button"
                    onClick={() => setExpanded((v) => !v)}
                    data-testid="bio-toggle"
                    aria-expanded={expanded}
                    className="mt-1.5 inline-flex items-center gap-1 text-[12px] font-mono text-black/55 hover:text-black transition tap-shrink"
                >
                    {expanded ? "ver menos" : "ver mais"}
                    <ChevronDown
                        size={12}
                        strokeWidth={2}
                        className={`transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
                    />
                </button>
            )}
        </div>
    );
}
