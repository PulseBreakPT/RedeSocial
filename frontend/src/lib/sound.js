// Web Audio synth notification sound — som leve, moderno, sem ficheiro externo.
// Toggle por user via localStorage.

const KEY = "vmln:notif-sound:v1";

let _ctx = null;
function ctx() {
    if (typeof window === "undefined") return null;
    if (_ctx) return _ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    try { _ctx = new AC(); } catch { return null; }
    return _ctx;
}

export function isNotifSoundEnabled() {
    try {
        const v = localStorage.getItem(KEY);
        if (v === null) return false; // default OFF (não invadir)
        return v === "1";
    } catch { return false; }
}
export function setNotifSoundEnabled(on) {
    try { localStorage.setItem(KEY, on ? "1" : "0"); } catch {}
}

// Pequeno bell sintetizado (~280ms): duas senoides harmónicas com decay rápido.
export function playNotifSound({ volume = 0.18, force = false } = {}) {
    if (!force && !isNotifSoundEnabled()) return;
    const ac = ctx();
    if (!ac) return;
    // Resume in case it was suspended (autoplay policy)
    try { if (ac.state === "suspended") ac.resume(); } catch {}
    const now = ac.currentTime;

    const master = ac.createGain();
    master.gain.setValueAtTime(0, now);
    master.gain.linearRampToValueAtTime(volume, now + 0.012);
    master.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
    master.connect(ac.destination);

    // Suave low-pass para evitar agressividade
    const lp = ac.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 4800;
    lp.Q.value = 0.7;
    lp.connect(master);

    // Dois tons em terça maior (E5+G#5-ish) — "bell-like"
    const tones = [
        { f: 880,  type: "sine", g: 1.0, start: 0,    dur: 0.32 },  // A5
        { f: 1318, type: "sine", g: 0.55, start: 0.04, dur: 0.28 }, // E6 partial
    ];
    tones.forEach((t) => {
        const o = ac.createOscillator();
        const g = ac.createGain();
        o.type = t.type;
        o.frequency.setValueAtTime(t.f, now + t.start);
        g.gain.setValueAtTime(0, now + t.start);
        g.gain.linearRampToValueAtTime(t.g, now + t.start + 0.008);
        g.gain.exponentialRampToValueAtTime(0.0001, now + t.start + t.dur);
        o.connect(g).connect(lp);
        o.start(now + t.start);
        o.stop(now + t.start + t.dur + 0.02);
    });
}

export default playNotifSound;
