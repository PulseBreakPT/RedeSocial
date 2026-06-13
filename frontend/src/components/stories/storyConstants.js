// Constantes partilhadas entre composer, viewer e overlay.
// SSS-tier: paleta PT-PT alargada + estilos de texto cinemáticos.

// PRE-LANÇAMENTO: 6 backgrounds apenas (de 15).
// Selecção: paleta PT-PT identitária — sem neon/pastel/azulejo/etc.
export const STORY_BG_PRESETS = [
    { key: "papel",      label: "Papel",       css: "linear-gradient(135deg,#F5F1E8 0%,#E8DCC4 100%)",                                  textHint: "#2a2218" },
    { key: "tasca",      label: "Tasca",       css: "linear-gradient(135deg,#7C2D12 0%,#B45309 100%)",                                  textHint: "#ffffff" },
    { key: "fado",       label: "Fado",        css: "linear-gradient(135deg,#1F1147 0%,#7E1F86 50%,#F08C1F 100%)",                      textHint: "#ffffff" },
    { key: "tejo",       label: "Tejo",        css: "linear-gradient(180deg,#4A6FA5 0%,#7BA7C9 50%,#E8C39E 100%)",                      textHint: "#ffffff" },
    { key: "noite",      label: "Noite",       css: "linear-gradient(135deg,#0F2027 0%,#203A43 50%,#2C5364 100%)",                      textHint: "#ffffff" },
    { key: "monochrome", label: "Mono",        css: "linear-gradient(180deg,#1a1a1a 0%,#404040 100%)",                                  textHint: "#ffffff" },
];

// Cores de texto sugeridas (rápidas de aplicar)
export const STORY_TEXT_COLORS = [
    "#ffffff", "#000000", "#FFE89B", "#FFB6C1", "#A6F0FF",
    "#FFC380", "#E85D4F", "#1F1147", "#10B981", "#F472B6",
];

// Backgrounds claros — para sombras/glow auto-adaptáveis
export const LIGHT_BG_KEYS = new Set(["papel", "pastel", "praia", "dusk"]);

// PRE-LANÇAMENTO: 3 fonts apenas (de 7).
// Mantém-se modern (default), classic (literário), bold (impacto).
export const STORY_FONTS = [
    { key: "modern",     label: "Aa Moderno",    style: { fontFamily: '"Inter", system-ui, sans-serif', fontWeight: 700, letterSpacing: "-0.025em" } },
    { key: "classic",    label: "Aa Clássico",   style: { fontFamily: '"Playfair Display", "Georgia", serif', fontWeight: 700, fontStyle: "italic", letterSpacing: "-0.005em" } },
    { key: "bold",       label: "Aa Bold",       style: { fontFamily: '"Inter", sans-serif', fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 0.95 } },
];

// PRE-LANÇAMENTO: 1 estilo de texto apenas (de 4). "Realce" / "Contorno" / "Brilho" escondidos.
export const STORY_TEXT_STYLES = [
    { key: "plain",     label: "Limpo",     description: "Sem extras" },
];

export const STORY_REACTIONS = ["❤️", "🔥", "👏", "😂", "😢", "💯", "🫶", "🥹"];

export const STORY_AUDIENCES = [
    { key: "everyone",  label: "Todos",        emoji: "🌍", description: "Visível para qualquer pessoa" },
    { key: "following", label: "A seguir-te",  emoji: "👥", description: "Só quem te segue" },
    { key: "roda",      label: "Roda íntima",  emoji: "🫂", description: "Só pessoas na tua Roda" },
];

// Os stickers ativos cobrem agora todo o leque editorial PT-PT:
// utility (mention/hashtag/location), tempo (countdown/time/date),
// interativos (poll/question/slider/quiz), comunitários (add_yours)
// e contextuais (link). Sem música/GIF/donation/shopping por decisão de produto.
export const STICKER_TYPES = [
    { key: "mention",   label: "Menção",      emoji: "@" },
    { key: "hashtag",   label: "Hashtag",     emoji: "#" },
    { key: "location",  label: "Localização", emoji: "📍" },
    { key: "countdown", label: "Contagem",    emoji: "⏱" },
    { key: "time",      label: "Hora",        emoji: "🕒" },
    { key: "date",      label: "Data",        emoji: "📅" },
    { key: "poll",      label: "Sondagem",    emoji: "📊" },
    { key: "question",  label: "Pergunta",    emoji: "❓" },
    { key: "slider",    label: "Slider",      emoji: "🎚" },
    { key: "quiz",      label: "Quiz",        emoji: "🧠" },
    { key: "add_yours", label: "Junta-te",    emoji: "🪩" },
    { key: "link",      label: "Link",        emoji: "🔗" },
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
