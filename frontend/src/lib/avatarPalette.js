// Deterministic color palette for users without avatars.
// 16 PT-themed gradient pairs (expanded fanzine palette).
// Used by Avatar + name backgrounds. Order MATTERS — hash modulo
// uses indices, so prepending shifts color assignments globally.

export const AVATAR_PALETTES = [
    // [name, gradient-from, gradient-to, soft-bg, soft-text]
    { name: "coral",     from: "#ff6f59", to: "#c2410c", soft: "#fff1ec", softText: "#9a3412" }, // Tasca / brasa
    { name: "tejo",      from: "#4a90e2", to: "#1e3a8a", soft: "#eef4fc", softText: "#1e3a8a" }, // Lisboa river blue
    { name: "pinhal",    from: "#4ade80", to: "#15803d", soft: "#ecfdf5", softText: "#14532d" }, // Norte forest
    { name: "ouro",      from: "#fbbf24", to: "#b45309", soft: "#fef7e6", softText: "#78350f" }, // Alentejo gold
    { name: "vinho",     from: "#e11d48", to: "#7f1d1d", soft: "#fdecef", softText: "#7f1d1d" }, // Bordeaux
    { name: "saudade",   from: "#7c93c7", to: "#3b4f7d", soft: "#eef0f8", softText: "#3b4f7d" }, // Soft blue
    { name: "azulejo",   from: "#06b6d4", to: "#0e7490", soft: "#ecfeff", softText: "#155e75" }, // Lisbon tile
    { name: "granito",   from: "#71717a", to: "#27272a", soft: "#f4f4f5", softText: "#27272a" }, // Norte stone
    { name: "mar",       from: "#22d3ee", to: "#0891b2", soft: "#ecfeff", softText: "#0e7490" }, // Algarve
    { name: "sardinha",  from: "#f472b6", to: "#9d174d", soft: "#fdf2f8", softText: "#831843" }, // Silver pink
    // ─── NOVOS — paleta fanzine expandida ─────────────────────────────
    { name: "telha",     from: "#E89274", to: "#A04830", soft: "#FBE5DC", softText: "#7a3520" }, // Telha portuguesa
    { name: "eucalipto", from: "#6FA37D", to: "#2F5A3B", soft: "#DDE8DF", softText: "#234029" }, // Eucalipto fresco
    { name: "peixe",     from: "#5FCEC0", to: "#1B7F75", soft: "#D7F0EC", softText: "#0F5A52" }, // Turquesa peixe-mar
    { name: "fado",      from: "#9A4555", to: "#4A1E26", soft: "#EFDFE2", softText: "#3a1820" }, // Vinho fado
    { name: "malva",     from: "#A58AB8", to: "#5A3F6E", soft: "#E8DDF0", softText: "#3F2D4F" }, // Malva cultura
    { name: "oliveira",  from: "#B5B66A", to: "#5C5F23", soft: "#ECEDD8", softText: "#3F411A" }, // Azeitona terroso
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
