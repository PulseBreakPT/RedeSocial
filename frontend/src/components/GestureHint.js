import { useEffect, useState } from "react";
import { X } from "lucide-react";

const STORAGE_KEY = "vmln_gesture_hint_v1";

/**
 * GestureHint — Pequena dica discreta na primeira utilização mobile
 * a ensinar o sistema de gestos. Auto-dismisses em 7s.
 */
export function GestureHint() {
    const [show, setShow] = useState(false);

    useEffect(() => {
        if (typeof window === "undefined") return;
        if (window.matchMedia("(min-width: 1024px)").matches) return;
        try {
            if (localStorage.getItem(STORAGE_KEY) === "1") return;
        } catch { /* ignore */ }
        const t = setTimeout(() => setShow(true), 1800);
        return () => clearTimeout(t);
    }, []);

    useEffect(() => {
        if (!show) return;
        const t = setTimeout(() => dismiss(), 7000);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [show]);

    const dismiss = () => {
        try { localStorage.setItem(STORAGE_KEY, "1"); } catch { /* ignore */ }
        setShow(false);
    };

    if (!show) return null;

    return (
        <div
            className="lg:hidden fixed left-1/2 -translate-x-1/2 z-[85] pointer-events-none"
            style={{ bottom: "calc(var(--mobile-nav-h, 64px) + 14px)" }}
            data-testid="gesture-hint"
        >
            <div
                className="pointer-events-auto flex items-center gap-3 px-4 py-2.5 rounded-full bg-black/85 backdrop-blur-md text-white shadow-2xl border border-white/10 anim-fade-up"
                style={{ animation: "hintIn 360ms cubic-bezier(0.16,1,0.3,1) both" }}
            >
                <style>{`@keyframes hintIn { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
                <span className="text-[13px] leading-snug tracking-tight">
                    <span className="opacity-70">Dica:</span> deslize{" "}
                    <span className="font-semibold">→ menu</span>
                    <span className="opacity-40 mx-1.5">·</span>
                    <span className="font-semibold">← chats</span>
                </span>
                <button
                    onClick={dismiss}
                    className="opacity-70 hover:opacity-100 tap-shrink"
                    aria-label="Dispensar"
                    data-testid="gesture-hint-dismiss"
                >
                    <X size={14} />
                </button>
            </div>
        </div>
    );
}
