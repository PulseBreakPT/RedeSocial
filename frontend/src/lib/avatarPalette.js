// Deterministic color palette for users without avatars.
// 10 PT-themed gradient pairs. Used by Avatar + name backgrounds.

export const AVATAR_PALETTES = [
    // [name, gradient-from, gradient-to, soft-bg, soft-text]
    { name: "coral",     from: "#ff6f59", to: "#c2410c", soft: "#fff1ec", softText: "#9a3412" }, // Tasca
    { name: "tejo",      from: "#4a90e2", to: "#1e3a8a", soft: "#eef4fc", softText: "#1e3a8a" }, // Lisboa river blue
    { name: "pinhal",    from: "#4ade80", to: "#15803d", soft: "#ecfdf5", softText: "#14532d" }, // Norte forest
    { name: "ouro",      from: "#fbbf24", to: "#b45309", soft: "#fef7e6", softText: "#78350f" }, // Alentejo gold
    { name: "vinho",     from: "#e11d48", to: "#7f1d1d", soft: "#fdecef", softText: "#7f1d1d" }, // Bordeaux
    { name: "saudade",   from: "#7c93c7", to: "#3b4f7d", soft: "#eef0f8", softText: "#3b4f7d" }, // Soft blue
    { name: "azulejo",   from: "#06b6d4", to: "#0e7490", soft: "#ecfeff", softText: "#155e75" }, // Lisbon tile
    { name: "granito",   from: "#71717a", to: "#27272a", soft: "#f4f4f5", softText: "#27272a" }, // Norte stone
    { name: "mar",       from: "#22d3ee", to: "#0891b2", soft: "#ecfeff", softText: "#0e7490" }, // Algarve
    { name: "sardinha",  from: "#f472b6", to: "#9d174d", soft: "#fdf2f8", softText: "#831843" }, // Silver pink
];

// Hash a string to a 0..palette.length-1 index deterministically.
function hashStr(s) {
    let h = 0;
    const str = String(s || "anon");
    for (let i = 0; i < str.length; i++) {
        h = ((h << 5) - h) + str.charCodeAt(i);
        h |= 0;
    }
    return Math.abs(h);
}

export function paletteFor(user) {
    if (!user) return AVATAR_PALETTES[0];
    const key = user.id || user.username || user.name || "anon";
    return AVATAR_PALETTES[hashStr(key) % AVATAR_PALETTES.length];
}

// Extract first+last initial (PT-style)
export function initialsFor(user) {
    const src = (user?.name || user?.username || "?").trim();
    if (!src) return "?";
    const parts = src.split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
