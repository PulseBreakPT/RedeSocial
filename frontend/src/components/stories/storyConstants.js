// Constantes partilhadas entre composer e viewer
export const STORY_BG_PRESETS = [
    { key: "coral",      css: "linear-gradient(135deg,#FF6B6B 0%,#E03E3E 100%)" },
    { key: "ocean",      css: "linear-gradient(135deg,#4FACFE 0%,#1E40AF 100%)" },
    { key: "dusk",       css: "linear-gradient(135deg,#FA709A 0%,#FEE140 100%)" },
    { key: "fado",       css: "linear-gradient(135deg,#1F1147 0%,#7E1F86 50%,#F08C1F 100%)" },
    { key: "saudade",    css: "linear-gradient(180deg,#0E2148 0%,#283593 60%,#7E57C2 100%)" },
    { key: "tasca",      css: "linear-gradient(135deg,#7C2D12 0%,#B45309 100%)" },
    { key: "praia",      css: "linear-gradient(135deg,#A1FFCE 0%,#FAFFD1 100%)" },
    { key: "noite",      css: "linear-gradient(135deg,#0F2027 0%,#203A43 50%,#2C5364 100%)" },
    { key: "neon",       css: "linear-gradient(135deg,#FA00FF 0%,#00F0FF 100%)" },
    { key: "pastel",     css: "linear-gradient(135deg,#FBC2EB 0%,#A6C1EE 100%)" },
    { key: "monochrome", css: "linear-gradient(180deg,#1a1a1a 0%,#404040 100%)" },
    { key: "papel",      css: "linear-gradient(135deg,#F5F1E8 0%,#E8DCC4 100%)" },
];

export const STORY_FONTS = [
    { key: "modern",     label: "Aa Moderno",    style: { fontFamily: '"Inter", system-ui, sans-serif', fontWeight: 600, letterSpacing: "-0.02em" } },
    { key: "classic",    label: "Aa Clássico",   style: { fontFamily: '"Playfair Display", "Georgia", serif', fontWeight: 600, fontStyle: "italic" } },
    { key: "serif",      label: "Aa Serif",      style: { fontFamily: '"Georgia", serif', fontWeight: 400 } },
    { key: "neon",       label: "Aa Neon",       style: { fontFamily: '"Inter", sans-serif', fontWeight: 800, textShadow: "0 0 18px currentColor, 0 0 8px currentColor", letterSpacing: "0.02em" } },
    { key: "typewriter", label: "Aa Mono",       style: { fontFamily: '"JetBrains Mono", monospace', fontWeight: 500, letterSpacing: "-0.01em" } },
    { key: "bold",       label: "Aa Bold",       style: { fontFamily: '"Inter", sans-serif', fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 0.95 } },
];

export const STORY_REACTIONS = ["❤️", "🔥", "👏", "😂", "😢", "💯", "🫶", "🥹"];

export const STORY_AUDIENCES = [
    { key: "everyone",  label: "Todos",        emoji: "🌍", description: "Visível para qualquer pessoa" },
    { key: "following", label: "A seguir-te",  emoji: "👥", description: "Só quem te segue" },
    { key: "roda",      label: "Roda íntima",  emoji: "🫂", description: "Só pessoas na tua Roda" },
];

export const STICKER_TYPES = [
    { key: "poll",      label: "Sondagem",   emoji: "📊" },
    { key: "question",  label: "Pergunta",   emoji: "❓" },
    { key: "slider",    label: "Slider",     emoji: "🎚" },
    { key: "mention",   label: "Menção",     emoji: "@" },
    { key: "hashtag",   label: "Hashtag",    emoji: "#" },
    { key: "location",  label: "Localização", emoji: "📍" },
    { key: "countdown", label: "Contagem",   emoji: "⏱" },
    { key: "link",      label: "Link",       emoji: "🔗" },
];

export const bgCss = (key) =>
    (STORY_BG_PRESETS.find((b) => b.key === key) || STORY_BG_PRESETS[0]).css;

export const fontStyleFor = (key) =>
    (STORY_FONTS.find((f) => f.key === key) || STORY_FONTS[0]).style;
