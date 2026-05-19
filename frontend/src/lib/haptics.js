// Central haptic helper — feedback subtil em mobile.
// Pure no-op em desktop (sem navigator.vibrate).
// Patterns curadas para evitar spam de vibração.

const PATTERNS = {
    tap:       8,            // tap genérico
    like:      [10],         // like
    follow:    [10, 20, 10], // pequeno duplo
    comment:   12,           // enviar comentário
    publish:   [18, 30, 18], // publicar post
    error:     [25, 40, 25],
    success:   [10, 15, 8],
    longpress: 22,
};

const KEY = "vmln:haptics-enabled:v1";

export function isHapticsEnabled() {
    try {
        const v = localStorage.getItem(KEY);
        if (v === null) return true; // default ON
        return v === "1";
    } catch { return true; }
}
export function setHapticsEnabled(on) {
    try { localStorage.setItem(KEY, on ? "1" : "0"); } catch {}
}

export function haptic(kind = "tap") {
    if (!isHapticsEnabled()) return;
    if (typeof navigator === "undefined" || !navigator.vibrate) return;
    if (typeof window !== "undefined") {
        try {
            // Respeita prefer-reduced-motion como proxy razoável
            if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) return;
        } catch {}
    }
    const pattern = typeof kind === "string" ? PATTERNS[kind] : kind;
    if (!pattern) return;
    try { navigator.vibrate(pattern); } catch {}
}

export default haptic;
