import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { scrollWindowToTop } from "../lib/scroll";

/**
 * Garante que cada navegação leva o utilizador ao topo da página.
 *
 * Cobre três casos:
 *   1) **Mudança de rota** — pathname/search muda → scrollWindowToTop().
 *   2) **Âncoras (#hash)** — respeitadas, NÃO força scroll-top.
 *   3) **Tabs/sub-navs internas** — captura click em elementos com
 *      `data-scroll-top` ou cujo `data-testid` corresponde aos padrões de
 *      tabs do projeto (`*-tab-*`, `*-side-*`, `settings-jump-*`,
 *      `nav-*`, `drawer-*`). Vai ao topo via rAF para correr DEPOIS
 *      do React renderizar o novo conteúdo.
 *
 * Deve estar montado dentro do <BrowserRouter>, antes das <Routes>.
 */
export function ScrollToTopOnNavigate() {
    const { pathname, search, hash } = useLocation();

    // 1) Route-level
    useEffect(() => {
        // Desactiva scroll-restoration nativa (assume manual).
        if ("scrollRestoration" in window.history) {
            try { window.history.scrollRestoration = "manual"; } catch { /* noop */ }
        }
        if (hash) return; // respeita âncoras
        // dois ticks: imediato + após paint (cobre componentes que medem layout)
        scrollWindowToTop();
        const id = requestAnimationFrame(() => scrollWindowToTop());
        return () => cancelAnimationFrame(id);
    }, [pathname, search, hash]);

    // 2) Delegação global de cliques em tabs / sub-navs / drawer items
    useEffect(() => {
        // Heurísticas de padrões de "tab-like" usados na app
        const TAB_TESTID_PATTERNS = [
            /-tab-/i,                 // ex: settings-tab-perfil, community-tab-...
            /-side-/i,                // ex: settings-side-...
            /^nav-/i,                 // nav primária (LeftSidebar)
            /^drawer-/i,              // itens do dropdown do perfil
            /^communities-tab-/i,
            /^community-tab-/i,
            /^trending-tab-/i,
            /^explore-tab-/i,
            /^feed-tab-/i,
            /^profile-tab-/i,
        ];
        // settings-jump-* propositadamente fora — são âncoras dentro da página.

        const onClick = (e) => {
            // Apenas botões primários
            if (e.defaultPrevented) return;
            // Elemento target ou ancestor com data-scroll-top
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
                // Esperar React atualizar o DOM antes de fazer scroll
                requestAnimationFrame(() => scrollWindowToTop());
            }
        };

        document.addEventListener("click", onClick, true /* capture */);
        return () => document.removeEventListener("click", onClick, true);
    }, []);

    return null;
}

export default ScrollToTopOnNavigate;
