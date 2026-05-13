/**
 * F5.3 — Calendário Cultural Português.
 * Frontend-side helpers; the canonical event list also lives in backend (server.py PT_CALENDAR_EVENTS).
 * Used for banners, themed UI hints, share prompts.
 */

export const PT_REGIONS = [
    { key: "norte",     label: "Norte",     emoji: "⛰️" },
    { key: "centro",    label: "Centro",    emoji: "🌳" },
    { key: "lisboa",    label: "Lisboa",    emoji: "🌉" },
    { key: "alentejo",  label: "Alentejo",  emoji: "🌾" },
    { key: "algarve",   label: "Algarve",   emoji: "🏖️" },
    { key: "madeira",   label: "Madeira",   emoji: "🌺" },
    { key: "acores",    label: "Açores",    emoji: "🌋" },
    { key: "emigrante", label: "Emigrante", emoji: "✈️" },
];

export const PT_MOODS = [
    { key: "saudade",  label: "Saudade",  emoji: "🫶" },
    { key: "festa",    label: "Festa",    emoji: "🎉" },
    { key: "tasca",    label: "Tasca",    emoji: "🍷" },
    { key: "fado",     label: "Fado",     emoji: "🎶" },
    { key: "bola",     label: "Bola",     emoji: "⚽" },
    { key: "cafe",     label: "Café",     emoji: "☕" },
    { key: "praia",    label: "Praia",    emoji: "🏖️" },
    { key: "cultura",  label: "Cultura",  emoji: "📚" },
];

export const PT_TEAMS = [
    { key: "slb",    label: "SL Benfica", emoji: "🦅" },
    { key: "fcp",    label: "FC Porto",   emoji: "🐉" },
    { key: "scp",    label: "Sporting",   emoji: "🦁" },
    { key: "outro",  label: "Outro",      emoji: "⚽" },
    { key: "nenhum", label: "Não sigo",   emoji: "🚫" },
];

/** Returns "boa noite" hours awareness — used to silence push & soften UI 23h-08h. */
export function isBoaNoiteHour(now = new Date()) {
    const h = now.getHours();
    return h >= 23 || h < 8;
}

/** Cafezinho window — morning calm session 07h00-09h00. */
export function isCafezinhoHour(now = new Date()) {
    const h = now.getHours();
    return h >= 7 && h < 9;
}

/** A Tarde window — when we surface the daily digest (18h-22h). */
export function isATardeWindow(now = new Date()) {
    const h = now.getHours();
    return h >= 18 && h < 22;
}

/** Pretty time for headers. */
export function ptGreeting(now = new Date()) {
    const h = now.getHours();
    if (h < 6) return "Boa madrugada";
    if (h < 12) return "Bom dia";
    if (h < 19) return "Boa tarde";
    return "Boa noite";
}
