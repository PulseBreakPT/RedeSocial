/**
 * Scroll utilities — single source of truth for "back to top" behavior.
 *
 * Use `scrollWindowToTop()` from any chip-tab / sub-nav click handler so the
 * user always lands at the top of the new view, even when the URL does not
 * change. Pair with the router-level <ScrollToTopOnNavigate /> to cover all
 * client-side navigation.
 */

/**
 * Force the window AND any common internal scroll containers back to top.
 * Defensive against browser quirks (Safari sometimes ignores `behavior:
 * "instant"`, older browsers don't support smooth scroll API at all).
 *
 * @param {{ smooth?: boolean }} opts  smooth=false (default) = jump immediately
 */
export function scrollWindowToTop(opts = {}) {
    const behavior = opts.smooth ? "smooth" : "auto";

    // 1) window / scrollingElement
    try {
        window.scrollTo({ top: 0, left: 0, behavior });
    } catch {
        try { window.scrollTo(0, 0); } catch { /* noop */ }
    }

    // 2) any internal scrollable containers used across pages
    const selectors = [
        "main",
        "[data-scroll-root]",
        "[data-scroll-container]",
        ".app-scroll",
    ];
    const seen = new Set();
    selectors.forEach((sel) => {
        document.querySelectorAll(sel).forEach((el) => {
            if (!el || seen.has(el)) return;
            seen.add(el);
            try {
                if (typeof el.scrollTo === "function") {
                    el.scrollTo({ top: 0, left: 0, behavior });
                } else {
                    el.scrollTop = 0;
                }
            } catch {
                try { el.scrollTop = 0; } catch { /* noop */ }
            }
        });
    });

    // 3) html / body (some browsers)
    try { document.documentElement.scrollTop = 0; } catch { /* noop */ }
    try { document.body.scrollTop = 0; } catch { /* noop */ }
}

/**
 * Wrap any callback so it scrolls to top BEFORE invoking the callback.
 * Handy for chip-tab onClick attributes:
 *   onClick={withScrollTop(() => setTab(t.key))}
 */
export function withScrollTop(fn) {
    return (...args) => {
        scrollWindowToTop();
        return fn?.(...args);
    };
}
