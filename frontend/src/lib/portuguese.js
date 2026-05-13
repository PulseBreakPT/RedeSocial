// Mapas auxiliares portugueses para UI

export const MOOD_OPTIONS = [
    { key: "saudade", label: "Saudade", emoji: "🥹" },
    { key: "tasca", label: "Tasca", emoji: "🍷" },
    { key: "festa", label: "Festa", emoji: "🎉" },
    { key: "cafe", label: "Café", emoji: "☕" },
    { key: "praia", label: "Praia", emoji: "🌊" },
    { key: "fado", label: "Fado", emoji: "🎙️" },
    { key: "futebol", label: "Bola", emoji: "⚽" },
    { key: "cultura", label: "Cultura", emoji: "🎭" },
];

export const COMMUNITY_CATEGORIES = [
    { key: "cidades", label: "Cidades 🇵🇹", emoji: "🇵🇹" },
    { key: "musica", label: "Música", emoji: "🎵" },
    { key: "desporto", label: "Desporto", emoji: "⚽" },
    { key: "tasca", label: "Tasca", emoji: "🍷" },
    { key: "cultura", label: "Cultura", emoji: "🎭" },
    { key: "tecnologia", label: "Tecnologia", emoji: "💻" },
    { key: "fotografia", label: "Fotografia", emoji: "📸" },
    { key: "moda", label: "Moda", emoji: "👗" },
    { key: "viagens", label: "Viagens", emoji: "🧭" },
    { key: "outras", label: "Outras", emoji: "✨" },
];

export const EVENT_CATEGORIES = [
    { key: "festa", label: "Festa", emoji: "🎉" },
    { key: "cultura", label: "Cultura", emoji: "🎭" },
    { key: "concerto", label: "Concerto", emoji: "🎤" },
    { key: "desporto", label: "Desporto", emoji: "⚽" },
    { key: "tasca", label: "Tasca", emoji: "🍷" },
    { key: "familia", label: "Família", emoji: "👨‍👩‍👧" },
    { key: "outros", label: "Outros", emoji: "✨" },
];

export function categoryLabel(list, key) {
    const found = list.find((x) => x.key === key);
    return found ? `${found.emoji} ${found.label}` : key;
}

// LocalStorage helpers (per-user follow-tag, theme, etc)
export function lsGet(key, fallback = null) {
    try {
        const v = localStorage.getItem(key);
        return v == null ? fallback : JSON.parse(v);
    } catch {
        return fallback;
    }
}

export function lsSet(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // ignore
    }
}
