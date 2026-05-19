import { useEffect, useRef, useState } from "react";

/**
 * Banner atmosférico ultra-fino que aparece no topo do Feed quando há
 * uma rajada de atividade (≥ 5 eventos em 60s).
 *
 * Princípios:
 *   · 24px de altura, mono, opacity 0.85
 *   · Auto-dismiss em 8s
 *   · Throttle: nunca mostra de novo nos próximos 90s
 *   · Texto qualitativo, sem números absolutos
 */
export function LiveActivityBeacon({ className = "" }) {
    const [visible, setVisible] = useState(false);
    const [label, setLabel] = useState("");
    const eventsRef = useRef([]);
    const cooldownRef = useRef(0);

    useEffect(() => {
        const onEvent = () => {
            const now = Date.now();
            // Drop old events outside the 60s window
            eventsRef.current = eventsRef.current.filter((t) => now - t < 60000);
            eventsRef.current.push(now);

            // Need ≥ 5 events in 60s + cooldown elapsed
            if (eventsRef.current.length >= 5 && now > cooldownRef.current) {
                cooldownRef.current = now + 90000; // 90s cooldown
                // Pick label by intensity
                const count = eventsRef.current.length;
                let text = "lusorae a aquecer · várias conversas ativas";
                if (count >= 12) text = "lusorae em brasa · muita gente a falar agora";
                else if (count >= 8) text = "lusorae cheio · conversas em movimento";
                setLabel(text);
                setVisible(true);
                // Auto-dismiss in 8s (matches CSS animation length)
                setTimeout(() => setVisible(false), 8000);
            }
        };

        // Listen to relevant atmospheric signals
        window.addEventListener("vmln:activity", onEvent);
        window.addEventListener("vmln:new_comment", onEvent);
        window.addEventListener("vmln:new_message", onEvent);
        return () => {
            window.removeEventListener("vmln:activity", onEvent);
            window.removeEventListener("vmln:new_comment", onEvent);
            window.removeEventListener("vmln:new_message", onEvent);
        };
    }, []);

    if (!visible) return null;

    return (
        <div
            data-testid="live-activity-beacon"
            className={`anim-activity-beacon sticky top-0 z-30 ${className}`}
            aria-live="polite"
        >
            <div className="px-5 py-1.5 bg-gradient-to-r from-emerald-50/80 via-white/90 to-amber-50/80 backdrop-blur border-b border-black/[0.06]">
                <div className="flex items-center justify-center gap-2 text-[10px] font-mono uppercase tracking-wider text-black/55">
                    <span className="relative inline-flex w-1.5 h-1.5">
                        <span className="absolute inset-0 rounded-full bg-emerald-500/85 anim-live-dot" />
                    </span>
                    {label}
                </div>
            </div>
        </div>
    );
}
