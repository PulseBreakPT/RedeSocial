// =============================================================================
// LUSORAE EDITORIAL — Design System · single source of truth
// -----------------------------------------------------------------------------
// O design system oficial da app, nascido na landing page (/).
// Substitui por completo o antigo estilo "fanzine PT" (bordas grossas 2.5–3px,
// sombras offset 3D `4px 4px 0`, stickers rodados, doodles).
//
// Princípios LUSORAE EDITORIAL:
//   1. Fundos claros: branco puro, `paper` (#F7F5EF) e `cream` (#FBFAF6).
//      Ink (#0A0A0A) reservado a CTAs, navegação ativa e bandas editoriais.
//   2. Hairlines: bordas finas 1px rgba(10,10,10,0.08–0.12). Nunca bordas ink grossas.
//   3. Profundidade real: sombras difusas multi-camada (nunca offset duro).
//   4. Pills e raios generosos: 999px em botões/chips, 16–24px em cards.
//   5. Tipografia Inter: headlines font-black tracking apertado; kickers
//      mono uppercase com dot pulse; corpo font-medium rgba(10,10,10,0.62).
//   6. Cor portuguesa em acentos: red/gold/green/azul da bandeira + paleta
//      funcional (reações, badges, moods) — nunca como moldura.
//   7. Micro-interações: hover translateY(-1px), transições 200ms, magnetic CTAs.
// =============================================================================

// ─── Tokens de cor base (alinhados com a landing) ───────────────────────────
export const PT = {
    ink:    "#0A0A0A",   // texto, CTAs, bandas escuras
    paper:  "#F7F5EF",   // fundo editorial quente (hero, auth, sticky bars)
    cream:  "#FBFAF6",   // off-white suave (zone bands, fundos de página)
    bone:   "#EDEDEC",   // neutro claro (legacy, usos pontuais)
    red:    "#C8102E",   // vermelho-bandeira
    gold:   "#FFCC29",   // dourado/sol
    green:  "#046A38",   // verde-bandeira
    azul:   "#003F87",   // azul atlântico profundo

    // ─── Paleta funcional (reações · badges · moods · notificações) ─────────
    telha:     "#D86A4E",   // terracota — tasca/mediterrâneo
    brasa:     "#E85D4F",   // coral — reação love
    fado:      "#6B2C39",   // vinho — editorial sombrio
    laranja:   "#F08A1E",   // laranja queimado — atenção/menções
    atl:       "#1B4F8F",   // atlântico claro — conversa/info
    peixe:     "#2EB4A6",   // turquesa — frescura/novo
    eucalipto: "#4A7C59",   // verde fresco — crescimento/sucesso
    malva:     "#7C5A8F",   // malva — cultura/citações
};

// ─── Primitivas de estilo (bordas · sombras · gradientes) ────────────────────
export const ED = {
    // Bordas hairline
    hairline:       "1px solid rgba(10,10,10,0.08)",
    border:         "1px solid rgba(10,10,10,0.10)",
    borderStrong:   "1px solid rgba(10,10,10,0.14)",

    // Tinta suavizada (texto secundário)
    inkSoft:  "rgba(10,10,10,0.62)",
    inkMuted: "rgba(10,10,10,0.55)",
    inkFaint: "rgba(10,10,10,0.45)",

    // Sombras difusas
    cardShadow:  "0 1px 2px rgba(10,10,10,0.04), 0 12px 28px -16px rgba(10,10,10,0.10)",
    softShadow:  "0 1px 2px rgba(10,10,10,0.04), 0 10px 24px -12px rgba(10,10,10,0.14)",
    floatShadow: "0 18px 40px -16px rgba(10,10,10,0.22), 0 4px 10px rgba(10,10,10,0.06)",
    ctaShadow:   "inset 0 1px 0 rgba(255,255,255,0.12), 0 12px 28px -10px rgba(10,10,10,0.4), 0 3px 8px rgba(10,10,10,0.08)",

    // Gradientes ink (CTAs e estados ativos)
    inkGradient:  "linear-gradient(180deg, #1f1f1f 0%, #0A0A0A 100%)",
    chipGradient: "linear-gradient(135deg, #2a2a2e 0%, #18181b 50%, #050505 100%)",
};

// ─── Semântica — uso → cor (evita decisões ad-hoc espalhadas) ────────────────
export const SEMANTIC = {
    danger:   PT.red,
    success:  PT.eucalipto,
    warning:  PT.gold,
    info:     PT.atl,
    like:     PT.brasa,
    repost:   PT.eucalipto,
    bookmark: PT.gold,
    comment:  PT.atl,
};

export default PT;
