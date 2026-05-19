import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Garante que cada navegação client-side leva o utilizador ao topo da
 * página (corrige o problema do browser preservar o scroll anterior).
 *
 * Deve estar montado dentro do <BrowserRouter>, antes das <Routes>.
 *
 * Excepções deliberadas:
 *   - se o URL traz um `#hash`, respeita o anchor (não força scroll-top);
 *   - se o utilizador navegou com voltar/avançar (POP), preserva o
 *     scroll original para uma sensação natural de histórico.
 */
export function ScrollToTopOnNavigate() {
    const { pathname, search, hash } = useLocation();

    useEffect(() => {
        // Desactiva scroll-restoration nativa do browser (assume manual).
        if ("scrollRestoration" in window.history) {
            try {
                window.history.scrollRestoration = "manual";
            } catch {
                /* noop */
            }
        }

        // Se há âncora (#secao), deixamos o browser/handlers tratarem.
        if (hash) return;

        // Scroll do window
        try {
            window.scrollTo({ top: 0, left: 0, behavior: "instant" });
        } catch {
            window.scrollTo(0, 0);
        }

        // Algumas páginas têm container interno scrollable (<main>, .app-scroll)
        // — limpa também esses, defensivamente.
        const candidates = [
            document.querySelector("main"),
            document.querySelector("[data-scroll-root]"),
            document.scrollingElement,
            document.documentElement,
            document.body,
        ];
        candidates.forEach((el) => {
            if (!el) return;
            if (typeof el.scrollTo === "function") {
                try {
                    el.scrollTo({ top: 0, behavior: "instant" });
                } catch {
                    el.scrollTop = 0;
                }
            } else {
                el.scrollTop = 0;
            }
        });
    }, [pathname, search, hash]);

    return null;
}

export default ScrollToTopOnNavigate;
