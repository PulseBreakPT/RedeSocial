// Constantes partilhadas entre composer, viewer e overlay.
// SSS-tier: paleta PT-PT alargada + estilos de texto cinemáticos.

export const STORY_BG_PRESETS = [
    { key: "coral",      label: "Coral",       css: "linear-gradient(135deg,#FF6B6B 0%,#E03E3E 100%)",                                  textHint: "#ffffff" },
    { key: "ocean",      label: "Oceano",      css: "linear-gradient(135deg,#4FACFE 0%,#1E40AF 100%)",                                  textHint: "#ffffff" },
    { key: "dusk",       label: "Crepúsculo",  css: "linear-gradient(135deg,#FA709A 0%,#FEE140 100%)",                                  textHint: "#1f1147" },
    { key: "fado",       label: "Fado",        css: "linear-gradient(135deg,#1F1147 0%,#7E1F86 50%,#F08C1F 100%)",                      textHint: "#ffffff" },
    { key: "saudade",    label: "Saudade",     css: "linear-gradient(180deg,#0E2148 0%,#283593 60%,#7E57C2 100%)",                      textHint: "#ffffff" },
    { key: "tasca",      label: "Tasca",       css: "linear-gradient(135deg,#7C2D12 0%,#B45309 100%)",                                  textHint: "#ffffff" },
    { key: "tejo",       label: "Tejo",        css: "linear-gradient(180deg,#4A6FA5 0%,#7BA7C9 50%,#E8C39E 100%)",                      textHint: "#ffffff" },
    { key: "azulejo",    label: "Azulejo",     css: "linear-gradient(135deg,#1E40AF 0%,#3B82F6 50%,#F0F9FF 100%)",                      textHint: "#ffffff" },
    { key: "pinhal",     label: "Pinhal",      css: "linear-gradient(135deg,#064E3B 0%,#10B981 60%,#FDE68A 100%)",                      textHint: "#ffffff" },
    { key: "praia",      label: "Praia",       css: "linear-gradient(135deg,#A1FFCE 0%,#FAFFD1 100%)",                                  textHint: "#0e2148" },
    { key: "noite",      label: "Noite",       css: "linear-gradient(135deg,#0F2027 0%,#203A43 50%,#2C5364 100%)",                      textHint: "#ffffff" },
    { key: "neon",       label: "Neon",        css: "linear-gradient(135deg,#FA00FF 0%,#00F0FF 100%)",                                  textHint: "#ffffff" },
    { key: "pastel",     label: "Pastel",      css: "linear-gradient(135deg,#FBC2EB 0%,#A6C1EE 100%)",                                  textHint: "#1f1147" },
    { key: "monochrome", label: "Mono",        css: "linear-gradient(180deg,#1a1a1a 0%,#404040 100%)",                                  textHint: "#ffffff" },
    { key: "papel",      label: "Papel",       css: "linear-gradient(135deg,#F5F1E8 0%,#E8DCC4 100%)",                                  textHint: "#2a2218" },
];

// Cores de texto sugeridas (rápidas de aplicar)
export const STORY_TEXT_COLORS = [
    "#ffffff", "#000000", "#FFE89B", "#FFB6C1", "#A6F0FF",
    "#FFC380", "#E85D4F", "#1F1147", "#10B981", "#F472B6",
];

// Backgrounds claros — para sombras/glow auto-adaptáveis
export const LIGHT_BG_KEYS = new Set(["papel", "pastel", "praia", "dusk"]);

export const STORY_FONTS = [
    { key: "modern",     label: "Aa Moderno",    style: { fontFamily: '"Inter", system-ui, sans-serif', fontWeight: 700, letterSpacing: "-0.025em" } },
    { key: "classic",    label: "Aa Clássico",   style: { fontFamily: '"Playfair Display", "Georgia", serif', fontWeight: 700, fontStyle: "italic", letterSpacing: "-0.005em" } },
    { key: "serif",      label: "Aa Serif",      style: { fontFamily: '"Georgia", serif', fontWeight: 500 } },
    { key: "neon",       label: "Aa Neon",       style: { fontFamily: '"Inter", sans-serif', fontWeight: 800, textShadow: "0 0 18px currentColor, 0 0 8px currentColor", letterSpacing: "0.02em" } },
    { key: "typewriter", label: "Aa Mono",       style: { fontFamily: '"JetBrains Mono", monospace', fontWeight: 500, letterSpacing: "-0.01em" } },
    { key: "bold",       label: "Aa Bold",       style: { fontFamily: '"Inter", sans-serif', fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 0.95 } },
    { key: "brush",      label: "Aa Brush",      style: { fontFamily: '"Brush Script MT", "Lucida Handwriting", cursive', fontWeight: 700, letterSpacing: "0.01em" } },
];

// Estilos visuais aplicáveis ao texto (camada estética por cima da fonte).
export const STORY_TEXT_STYLES = [
    { key: "plain",     label: "Limpo",     description: "Sem extras" },
    { key: "highlight", label: "Realce",    description: "Caixa de cor" },
    { key: "outline",   label: "Contorno",  description: "Stroke nítido" },
    { key: "glow",      label: "Brilho",    description: "Halo coral" },
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
    { key: "music",     label: "Música",     emoji: "🎵" },
];

export const bgPreset = (key) =>
    STORY_BG_PRESETS.find((b) => b.key === key) || STORY_BG_PRESETS[0];

export const bgCss = (key) => bgPreset(key).css;

export const fontStyleFor = (key) =>
    (STORY_FONTS.find((f) => f.key === key) || STORY_FONTS[0]).style;

// Helper para derivar estilos visuais do texto sem custos de runtime.
export const computeTextDecorationStyle = (textStyle, color) => {
    switch (textStyle) {
        case "highlight":
            return {
                boxShadow: `0 0 0 0.18em ${color}`,
                background: color,
                color: pickContrast(color),
                padding: "0.05em 0.18em",
                borderRadius: "0.18em",
            };
        case "outline":
            return {
                WebkitTextStroke: `2px ${color}`,
                color: "transparent",
                textShadow: "none",
            };
        case "glow":
            return {
                textShadow: `0 0 8px ${color}, 0 0 24px ${color}, 0 2px 4px rgba(0,0,0,0.4)`,
            };
        default:
            return {};
    }
};

// Decide preto/branco em função da luminância de uma cor #rrggbb.
function pickContrast(hex) {
    const c = hex.replace("#", "");
    if (c.length !== 6) return "#000";
    const r = parseInt(c.slice(0, 2), 16);
    const g = parseInt(c.slice(2, 4), 16);
    const b = parseInt(c.slice(4, 6), 16);
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return lum > 0.6 ? "#000" : "#fff";
}
