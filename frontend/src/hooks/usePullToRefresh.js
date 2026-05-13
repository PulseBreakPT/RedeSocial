import { useEffect, useRef, useState } from "react";

/**
 * Native-feeling pull-to-refresh for mobile. Attaches passive touch listeners on the document.
 * Only triggers when the user is at the very top of the page and pulls down on touch devices.
 *
 * @param {() => (Promise<void> | void)} onRefresh
 * @param {{ threshold?: number, maxPull?: number, disabled?: boolean }} opts
 */
export function usePullToRefresh(onRefresh, opts = {}) {
    const { threshold = 70, maxPull = 110, disabled = false } = opts;
    const [pull, setPull] = useState(0); // current pull distance
    const [refreshing, setRefreshing] = useState(false);
    const startY = useRef(null);
    const pulling = useRef(false);

    useEffect(() => {
        if (disabled) return;
        // Only enable on touch devices
        if (typeof window === "undefined" || !("ontouchstart" in window)) return;

        const onTouchStart = (e) => {
            if (window.scrollY > 0 || refreshing) return;
            startY.current = e.touches[0].clientY;
            pulling.current = true;
        };
        const onTouchMove = (e) => {
            if (!pulling.current || startY.current == null) return;
            const dy = e.touches[0].clientY - startY.current;
            if (dy <= 0) {
                setPull(0);
                return;
            }
            // dampen the pull (rubber-band)
            const damped = Math.min(maxPull, dy * 0.55);
            setPull(damped);
        };
        const onTouchEnd = async () => {
            if (!pulling.current) return;
            pulling.current = false;
            startY.current = null;
            if (pull >= threshold && !refreshing) {
                setRefreshing(true);
                setPull(threshold * 0.7);
                try {
                    await onRefresh?.();
                } finally {
                    setRefreshing(false);
                    setPull(0);
                }
            } else {
                setPull(0);
            }
        };

        document.addEventListener("touchstart", onTouchStart, { passive: true });
        document.addEventListener("touchmove", onTouchMove, { passive: true });
        document.addEventListener("touchend", onTouchEnd, { passive: true });
        document.addEventListener("touchcancel", onTouchEnd, { passive: true });
        return () => {
            document.removeEventListener("touchstart", onTouchStart);
            document.removeEventListener("touchmove", onTouchMove);
            document.removeEventListener("touchend", onTouchEnd);
            document.removeEventListener("touchcancel", onTouchEnd);
        };
    }, [pull, refreshing, threshold, maxPull, disabled, onRefresh]);

    return { pull, refreshing, threshold };
}
