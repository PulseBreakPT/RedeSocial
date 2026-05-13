import { useEffect, useState } from "react";

/**
 * Returns `hidden` boolean that becomes true when the user scrolls DOWN past `threshold`,
 * and false again when they scroll UP. Mimics native mobile top-bar behaviour.
 */
export function useHideOnScroll(threshold = 12) {
    const [hidden, setHidden] = useState(false);

    useEffect(() => {
        let lastY = window.scrollY;
        let ticking = false;
        const onScroll = () => {
            if (ticking) return;
            ticking = true;
            window.requestAnimationFrame(() => {
                const y = window.scrollY;
                const dy = y - lastY;
                if (y < 4) {
                    setHidden(false);
                } else if (Math.abs(dy) > threshold) {
                    setHidden(dy > 0);
                    lastY = y;
                }
                ticking = false;
            });
        };
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, [threshold]);

    return hidden;
}
