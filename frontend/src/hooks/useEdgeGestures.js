import { useEffect, useRef } from "react";

/**
 * useEdgeGestures — Sistema de gestos inteligente para mobile.
 *
 * Detecta swipes globais com:
 *  - Direction lock (vertical-domina => cancela; é scroll)
 *  - Detecção automática de horizontal-scrollers e inputs (auto-ignora)
 *  - Suporte explícito a `data-gesture-ignore="true"` em qualquer elemento
 *  - Edge zone priority: gesto desde os 24 px da borda é mais sensível
 *  - Velocity flick: gestos curtos+rápidos também activam
 *  - Drag-along: callback `onDragProgress` para preview em tempo real
 *  - Auto-disable em desktop (>=1024 px)
 *
 * @param {object} opts
 * @param {() => void} [opts.onSwipeRight]  - left→right (abrir menu)
 * @param {() => void} [opts.onSwipeLeft]   - right→left (abrir chat)
 * @param {(s: {dir: 'right'|'left'|null, progress: number, dx: number, finished?: boolean}) => void} [opts.onDragProgress]
 * @param {boolean} [opts.enabled=true]
 * @param {number}  [opts.edgeWidth=24]
 * @param {number}  [opts.threshold=72]     - px para activar (longe das bordas)
 * @param {number}  [opts.edgeThreshold=40] - px para activar (dentro do edge zone)
 * @param {number}  [opts.velocityThreshold=0.55] - px/ms para considerar "flick"
 */
export function useEdgeGestures({
    onSwipeRight,
    onSwipeLeft,
    onDragProgress,
    enabled = true,
    edgeWidth = 24,
    threshold = 72,
    edgeThreshold = 40,
    velocityThreshold = 0.55,
} = {}) {
    // Refs guardam handlers correntes p/ não re-anexar listeners a cada render
    const cb = useRef({ onSwipeRight, onSwipeLeft, onDragProgress });
    cb.current = { onSwipeRight, onSwipeLeft, onDragProgress };

    useEffect(() => {
        if (!enabled) return;
        if (typeof window === "undefined") return;
        // Apenas mobile/tablet
        const mq = window.matchMedia("(min-width: 1024px)");
        if (mq.matches) return;

        // Helper: deve ignorar este target?
        const isIgnored = (target) => {
            if (!(target instanceof Element)) return false;
            let el = target;
            let depth = 0;
            while (el && el !== document.body && depth < 20) {
                // Marker explícito
                if (el.dataset && (el.dataset.gestureIgnore === "true" || el.dataset.gestureIgnore === "")) return true;
                // Inputs / textareas / contenteditable
                const tag = el.tagName;
                if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
                if (el.isContentEditable) return true;
                // Horizontal scrollers (stories, carousels, chip rows, etc.)
                // — respect overflow-x intent even when content doesn't
                // currently overflow (e.g. user has no stories yet).
                const cs = window.getComputedStyle(el);
                if (cs.overflowX === "auto" || cs.overflowX === "scroll") {
                    return true;
                }
                // Elementos com role=slider/spinbutton (range, etc.)
                const role = el.getAttribute && el.getAttribute("role");
                if (role === "slider" || role === "spinbutton") return true;
                el = el.parentElement;
                depth++;
            }
            return false;
        };

        // Estado da gesture corrente
        let active = false;
        let startX = 0, startY = 0, startT = 0;
        let lastX = 0, lastT = 0;
        let velocity = 0; // px/ms (sinal: positivo = →, negativo = ←)
        let locked = null; // 'h' | 'v' | null
        let fromLeftEdge = false;
        let fromRightEdge = false;
        let pid = null;

        const emitProgress = (dir, progress, dx) => {
            if (!cb.current.onDragProgress) return;
            cb.current.onDragProgress({ dir, progress, dx });
        };

        const reset = (finished = true) => {
            const wasActive = active;
            active = false;
            locked = null;
            fromLeftEdge = false;
            fromRightEdge = false;
            pid = null;
            if (wasActive && cb.current.onDragProgress) {
                cb.current.onDragProgress({ dir: null, progress: 0, dx: 0, finished });
            }
        };

        const onDown = (e) => {
            if (e.pointerType === "mouse" && e.button !== 0) return;
            if (isIgnored(e.target)) return;
            const w = window.innerWidth;
            startX = e.clientX;
            startY = e.clientY;
            startT = performance.now();
            lastX = startX;
            lastT = startT;
            velocity = 0;
            active = true;
            locked = null;
            pid = e.pointerId;
            fromLeftEdge = e.clientX <= edgeWidth;
            fromRightEdge = e.clientX >= w - edgeWidth;
        };

        const onMove = (e) => {
            if (!active) return;
            if (pid !== null && e.pointerId !== pid) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            const now = performance.now();
            const dt = now - lastT;
            if (dt > 0) {
                // EMA suave da velocidade
                const instant = (e.clientX - lastX) / dt;
                velocity = velocity * 0.6 + instant * 0.4;
            }
            lastX = e.clientX;
            lastT = now;

            // Lock de direcção: precisa de pelo menos 8px num eixo
            if (!locked) {
                const adx = Math.abs(dx);
                const ady = Math.abs(dy);
                if (adx > 8 || ady > 8) {
                    // horizontal-dominante por factor 1.3 — caso contrário, é scroll
                    if (adx > ady * 1.3) {
                        locked = "h";
                    } else {
                        // vertical-domina → cancela
                        reset(true);
                        return;
                    }
                } else {
                    return;
                }
            }
            if (locked !== "h") return;

            // Preview: emitir progresso só se a partir do edge correcto ou já passou ramp
            if (dx > 0) {
                const progress = Math.max(0, Math.min(1, dx / 280));
                if (fromLeftEdge || dx > 24) emitProgress("right", progress, dx);
            } else if (dx < 0) {
                const progress = Math.max(0, Math.min(1, -dx / 280));
                if (fromRightEdge || -dx > 24) emitProgress("left", progress, -dx);
            }
        };

        const onUp = (e) => {
            if (!active) return;
            if (pid !== null && e.pointerId !== pid) return;
            const dx = e.clientX - startX;
            const dy = Math.abs(e.clientY - startY);
            const adx = Math.abs(dx);
            const v = Math.abs(velocity);

            // Só se foi gesto horizontal e o desvio vertical é razoável
            const verticalOk = dy < 90;
            const isHoriz = locked === "h" && verticalOk;

            if (isHoriz) {
                const fromEdge = (dx > 0 && fromLeftEdge) || (dx < 0 && fromRightEdge);
                const usedThreshold = fromEdge ? edgeThreshold : threshold;
                const distanceOk = adx >= usedThreshold;
                // Flick: pouca distância mas grande velocidade no mesmo sentido
                const flickOk = v >= velocityThreshold && adx >= 26 &&
                    ((dx > 0 && velocity > 0) || (dx < 0 && velocity < 0));

                if (typeof window !== "undefined" && window.__VMLN_GESTURE_DEBUG__) {
                    // eslint-disable-next-line no-console
                    /* gesture debug removed */
                }

                if (distanceOk || flickOk) {
                    if (dx > 0) cb.current.onSwipeRight && cb.current.onSwipeRight();
                    else cb.current.onSwipeLeft && cb.current.onSwipeLeft();
                }
            }
            reset(true);
        };

        const onCancel = () => reset(true);

        document.addEventListener("pointerdown", onDown, { passive: true });
        document.addEventListener("pointermove", onMove, { passive: true });
        document.addEventListener("pointerup", onUp, { passive: true });
        document.addEventListener("pointercancel", onCancel, { passive: true });
        return () => {
            document.removeEventListener("pointerdown", onDown);
            document.removeEventListener("pointermove", onMove);
            document.removeEventListener("pointerup", onUp);
            document.removeEventListener("pointercancel", onCancel);
        };
    }, [enabled, edgeWidth, threshold, edgeThreshold, velocityThreshold]);
}
