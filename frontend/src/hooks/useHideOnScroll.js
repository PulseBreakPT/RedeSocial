import { useEffect, useState, useRef } from "react";

// Returns true when user is scrolling DOWN past the threshold; false when scrolling UP or at top.
// Used to hide/show the FAB and mobile top bar intelligently.
export function useHideOnScroll(threshold = 80) {
    const [hidden, setHidden] = useState(false);
    const lastYRef = useRef(0);
    const tickingRef = useRef(false);

    useEffect(() => {
        const onScroll = () => {
            if (tickingRef.current) return;
            tickingRef.current = true;
            requestAnimationFrame(() => {
                const y = window.scrollY || 0;
                const dy = y - lastYRef.current;
                if (y < threshold) {
                    setHidden(false);
                } else if (dy > 6) {
                    setHidden(true);
                } else if (dy < -4) {
                    setHidden(false);
                }
                lastYRef.current = y;
                tickingRef.current = false;
            });
        };
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, [threshold]);

    return hidden;
}
