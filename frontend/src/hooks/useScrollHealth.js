import { useEffect, useRef } from "react";
import { toast } from "sonner";

/**
 * useScrollHealth — Fase 8 / Anti-doomscrolling inteligente.
 *
 * Mede de forma leve a saúde da sessão de scroll e, quando deteta consumo
 * passivo prolongado (muito scroll, pouca interação), mostra UM toast
 * suave (nunca modal agressivo) a sugerir uma pausa ou uma Mesa. Respeita
 * um cooldown em localStorage para não chatear.
 *
 * Sinais (todos do cliente, sem rede):
 *   - tempo na página
 *   - distância total de scroll
 *   - tempo desde a última interação (clique/tecla)
 *
 * Honesto e gentil: só dispara em consumo realmente passivo, e à noite
 * adapta o tom para "recolher".
 */

const COOLDOWN_KEY = "vm_scrollhealth_last";
const COOLDOWN_MS = 45 * 60 * 1000;     // no máximo 1 nudge / 45 min
const MIN_MINUTES = 12;                 // tempo mínimo na página
const MIN_IDLE_MINUTES = 8;             // sem interagir há X
const MIN_SCROLL_PX = 6000;             // scroll passivo acumulado

function cooldownOk() {
    try {
        const last = Number(localStorage.getItem(COOLDOWN_KEY) || 0);
        return Date.now() - last > COOLDOWN_MS;
    } catch {
        return true;
    }
}
function markNudged() {
    try { localStorage.setItem(COOLDOWN_KEY, String(Date.now())); } catch { /* private mode */ }
}

function isLateNight() {
    const h = new Date().getHours();
    return h >= 23 || h < 6;
}

export function useScrollHealth({ enabled = true } = {}) {
    const startRef = useRef(Date.now());
    const lastInteractRef = useRef(Date.now());
    const scrollAccumRef = useRef(0);
    const lastYRef = useRef(typeof window !== "undefined" ? window.scrollY : 0);
    const nudgedRef = useRef(false);

    useEffect(() => {
        if (!enabled) return undefined;

        const onScroll = () => {
            const y = window.scrollY;
            scrollAccumRef.current += Math.abs(y - lastYRef.current);
            lastYRef.current = y;
        };
        const onInteract = () => { lastInteractRef.current = Date.now(); };

        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("click", onInteract);
        window.addEventListener("keydown", onInteract);

        const check = () => {
            if (nudgedRef.current) return;
            const now = Date.now();
            const mins = (now - startRef.current) / 60000;
            const idleMin = (now - lastInteractRef.current) / 60000;
            if (
                mins >= MIN_MINUTES &&
                idleMin >= MIN_IDLE_MINUTES &&
                scrollAccumRef.current >= MIN_SCROLL_PX &&
                cooldownOk()
            ) {
                nudgedRef.current = true;
                markNudged();
                if (isLateNight()) {
                    toast("Já é tarde.", {
                        description: "Andas a scrollar há algum tempo. Talvez recolher e descansar?",
                        duration: 9000,
                    });
                } else {
                    toast("Uma pausa?", {
                        description: "Estás a scrollar há um bocado. Que tal entrar numa conversa em vez de só ver?",
                        duration: 9000,
                    });
                }
            }
        };
        const id = setInterval(check, 60000);

        return () => {
            window.removeEventListener("scroll", onScroll);
            window.removeEventListener("click", onInteract);
            window.removeEventListener("keydown", onInteract);
            clearInterval(id);
        };
    }, [enabled]);
}

export default useScrollHealth;
