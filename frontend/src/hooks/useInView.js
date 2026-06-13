import { useEffect, useRef, useState } from "react";

/**
 * useInView — hook minimalista para lazy-mount baseado em IntersectionObserver.
 *
 * Princípio: o consumer só deve renderizar/montar o conteúdo pesado quando
 * o utilizador estiver perto de o ver. Uma vez visto, fica "trancado" como
 * visível (não desmonta ao sair) — evita flicker e re-fetches ao scrollar
 * de volta.
 *
 * Casos típicos:
 *   const { ref, hasBeenVisible } = useInView({ rootMargin: "200px" });
 *   return <div ref={ref}>{hasBeenVisible ? <HeavyWidget /> : <Placeholder />}</div>;
 *
 * Opções:
 *   · rootMargin: distância antes do viewport em que o elemento é considerado
 *     visível (default: "200px" — pré-carrega antes do utilizador chegar).
 *   · threshold: percentagem mínima de intersecção (default: 0).
 *   · once: se true (default), uma vez visível mantém-se montado. Se false,
 *     `isVisible` reflete o estado actual a cada scroll.
 *
 * Fallback: ambientes sem IntersectionObserver (testes JSDOM antigos, alguns
 * browsers legacy) tratam tudo como visível imediatamente — comportamento
 * conservador e funcional, apenas sem o benefício de performance.
 */
export function useInView({ rootMargin = "200px", threshold = 0, once = true } = {}) {
    const ref = useRef(null);
    const [isVisible, setIsVisible] = useState(false);
    const [hasBeenVisible, setHasBeenVisible] = useState(false);

    useEffect(() => {
        const node = ref.current;
        if (!node) return;
        if (typeof IntersectionObserver === "undefined") {
            // Fallback: assume visível imediatamente.
            setIsVisible(true);
            setHasBeenVisible(true);
            return;
        }
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                    setHasBeenVisible(true);
                    if (once) observer.disconnect();
                } else if (!once) {
                    setIsVisible(false);
                }
            },
            { rootMargin, threshold },
        );
        observer.observe(node);
        return () => observer.disconnect();
    }, [rootMargin, threshold, once]);

    return { ref, isVisible, hasBeenVisible };
}
