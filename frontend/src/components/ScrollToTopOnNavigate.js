import { useEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";
import { scrollWindowToTop } from "../lib/scroll";

/**
 * Combina:
 *   1) **PUSH/REPLACE** → vai ao topo (mantém comportamento existente).
 *   2) **POP (back)** → restaura a posição de scroll guardada para a rota.
 *   3) **Âncoras (#hash)** — respeitadas, NÃO força scroll-top.
 *   4) **Tabs / sub-navs internas** — captura click em elementos com
 *      `data-scroll-top` ou cujo `data-testid` corresponde aos padrões de
 *      tabs do projeto.
 *
 * Posições são guardadas em sessionStorage (chave = pathname+search) para
 * sobreviverem a re-mounts de páginas tipo Feed.
 */
const SCROLL_KEY_PREFIX = "vmln:scrollY:v1:";
const MAX_RESTORE_ATTEMPTS = 12; // ~2s of polling for content to load

function storeKey(loc) { return SCROLL_KEY_PREFIX + loc.pathname + loc.search; }

function savePos(loc) {
    try {
        const y = window.scrollY || 0;
        if (y > 0) sessionStorage.setItem(storeKey(loc), String(y));
        else sessionStorage.removeItem(storeKey(loc));
    } catch { /* noop */ }
}
function getPos(loc) {
    try {
        const v = sessionStorage.getItem(storeKey(loc));
        if (!v) return 0;
        const n = parseInt(v, 10);
        return Number.isFinite(n) ? n : 0;
    } catch { return 0; }
}

export function ScrollToTopOnNavigate() {
    const location = useLocation();
    const navType = useNavigationType(); // PUSH | POP | REPLACE
    const prevLocRef = useRef(location);

    // Save scroll position right before location changes (i.e. when prev location
    // is about to be left). We do this with a layout-ish effect.
    useEffect(() => {
        const prev = prevLocRef.current;
        if (prev && (prev.pathname !== location.pathname || prev.search !== location.search)) {
            savePos(prev);
        }
        prevLocRef.current = location;
    }, [location]);

    // Also keep saving every few hundred ms while scrolling, so refresh / back
    // restoration is more reliable.
    useEffect(() => {
        if ("scrollRestoration" in window.history) {
            try { window.history.scrollRestoration = "manual"; } catch { /* noop */ }
        }
        let raf = 0;
        const onScroll = () => {
            if (raf) return;
            raf = requestAnimationFrame(() => {
                raf = 0;
                savePos(location);
            });
        };
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => {
            window.removeEventListener("scroll", onScroll);
            if (raf) cancelAnimationFrame(raf);
        };
    }, [location]);

    // Route change handler: top-on-forward, restore-on-back.
    useEffect(() => {
        if (location.hash) return; // respeita âncoras
        if (navType === "POP") {
            const y = getPos(location);
            if (y > 0) {
                // Poll a few times for content to fill — feed/profile load async.
                let attempts = 0;
                let cancelled = false;
                const tryRestore = () => {
                    if (cancelled) return;
                    const docH = document.documentElement.scrollHeight;
                    if (docH >= y + window.innerHeight * 0.8 || attempts >= MAX_RESTORE_ATTEMPTS) {
                        window.scrollTo({ top: y, left: 0, behavior: "auto" });
                        return;
                    }
                    attempts += 1;
                    setTimeout(tryRestore, 160);
                };
                requestAnimationFrame(tryRestore);
                return () => { cancelled = true; };
            }
            // No saved position: still go to top
        }
        // Forward nav: top
        scrollWindowToTop();
        const id = requestAnimationFrame(() => scrollWindowToTop());
        return () => cancelAnimationFrame(id);
    }, [location.pathname, location.search, location.hash, navType, location]);

    // Delegação global de cliques em tabs / sub-navs / drawer items
    useEffect(() => {
        const TAB_TESTID_PATTERNS = [
            /-tab-/i,
            /-side-/i,
            /^nav-/i,
            /^drawer-/i,
            /^communities-tab-/i,
            /^community-tab-/i,
            /^trending-tab-/i,
            /^explore-tab-/i,
            /^feed-tab-/i,
            /^profile-tab-/i,
        ];

        const onClick = (e) => {
            if (e.defaultPrevented) return;
            const explicit = e.target.closest?.("[data-scroll-top]");
            if (explicit) {
                requestAnimationFrame(() => scrollWindowToTop());
                return;
            }
            const el = e.target.closest?.("[data-testid]");
            if (!el) return;
            const tid = el.getAttribute("data-testid") || "";
            if (!tid) return;
            if (TAB_TESTID_PATTERNS.some((re) => re.test(tid))) {
                requestAnimationFrame(() => scrollWindowToTop());
            }
        };

        document.addEventListener("click", onClick, true);
        return () => document.removeEventListener("click", onClick, true);
    }, []);

    return null;
}

export default ScrollToTopOnNavigate;
