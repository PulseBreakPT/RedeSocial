import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

// Per-route in-memory scroll restoration. Activates only on POP navigations
// (i.e. user used the back button) so that forward navigations always start
// at the top. Works across the whole document.
const store = new Map(); // key: pathname+search -> scrollY

export function useScrollRestore(enabled = true) {
    const location = useLocation();
    const navType = useNavigationType(); // PUSH | POP | REPLACE
    const key = location.pathname + location.search;

    // Save on scroll (throttled)
    useEffect(() => {
        if (!enabled) return;
        let raf = 0;
        const onScroll = () => {
            if (raf) return;
            raf = requestAnimationFrame(() => {
                raf = 0;
                store.set(key, window.scrollY || 0);
            });
        };
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => {
            window.removeEventListener("scroll", onScroll);
            if (raf) cancelAnimationFrame(raf);
            // Save final position when leaving
            store.set(key, window.scrollY || 0);
        };
    }, [key, enabled]);

    // Restore on mount (only on POP)
    useEffect(() => {
        if (!enabled) return;
        if (navType !== "POP") return;
        const y = store.get(key);
        if (typeof y === "number" && y > 0) {
            // Wait a tick for content to be measurable
            const t = setTimeout(() => {
                window.scrollTo({ top: y, left: 0, behavior: "instant" in window ? "instant" : "auto" });
            }, 30);
            return () => clearTimeout(t);
        }
    }, [key, navType, enabled]);
}
