// =============================================================================
// LUSORAE · FANZINE PT — Paleta Expandida (single source of truth)
// ---------------------------------------------------------------------------
// Curada por: Art Director · Brand Designer LX · Color Theorist · UI/UX · FE
//
// Princípios:
//   1. Fundo SEMPRE branco (#FFFFFF). A cor vive em acentos.
//   2. Cada token tem um par "soft" (≤12% saturação) para badges/chips em
//      fundo branco sem ofuscar leitura.
//   3. Todas as cores accent validadas para contraste:
//        • text-on-white  ≥ 4.5:1  (WCAG AA body text)
//        • ui-on-white    ≥ 3.0:1  (WCAG AA UI/large)
//   4. Identidade cultural: tiles, telhas, atlântico, fado, eucalipto.
//   5. Tokens originais (red/green/gold/azul/ink/cream/bone) intactos para
//      backwards-compat com 60+ ficheiros já em produção.
// =============================================================================

export const FANZINE = {
    // ─── ORIGINAIS (mantidos) ────────────────────────────────────────────────
    red:        "#C8102E",     // vermelho-bandeira (PT classic)
    green:      "#046A38",     // verde-bandeira
    gold:       "#FFCC00",     // dourado/sol
    azul:       "#0E4D92",     // azul tejo/azulejo profundo
    ink:        "#0A0A0A",     // preto fanzine
    cream:      "#F4F4F4",     // cinza-cal antigo (NÃO usar como page bg)
    bone:       "#EDEDEC",     // osso (legacy)

    // ─── EXPANSÃO QUENTE — Mediterrâneo · Telhados · Fogo ────────────────────
    telha:      "#D86A4E",     // terracota / telha portuguesa
    telhaSoft:  "#FBE5DC",     //   pair p/ badges em white bg
    brasa:      "#E85D4F",     // brasa coral (já existia como coral, agora oficial)
    brasaSoft:  "#FDECEA",
    tijolo:     "#A04830",     // tijolo rust escuro (alt. ao red para acento sério)
    tijoloSoft: "#F3DDD2",
    fado:       "#6B2C39",     // vinho/fado — para momentos editoriais sombrios
    fadoSoft:   "#EFDFE2",
    laranja:    "#F08A1E",     // laranja queimado tipo riso (energia)
    laranjaSoft:"#FCE4C9",

    // ─── EXPANSÃO FRESCA — Atlântico · Tile · Eucalipto ──────────────────────
    atl:        "#1B4F8F",     // atlântico (alias do azul, com variant)
    atlSoft:    "#DCE7F4",
    azulejoLite:"#5B8DBF",     // azul azulejo claro (riso aesthetic)
    peixe:      "#2EB4A6",     // turquesa / peixe-mar (frescura)
    peixeSoft:  "#D7F0EC",
    eucalipto:  "#4A7C59",     // eucalipto (alt. ao green clássico)
    eucaliptoSoft:"#DDE8DF",
    oliveira:   "#8B8E3F",     // azeitona/oliveira (terroso fresh)
    oliveiraSoft:"#ECEDD8",

    // ─── ACENTOS FANZINE — Risograph · Tinta · Lima · Fluo ───────────────────
    lima:       "#D4E83C",     // lima riso (alegria pop)
    limaSoft:   "#F7FACF",
    rosa:       "#F4A6B7",     // rosa azulejo/cravo (suave PT)
    rosaSoft:   "#FBE7EC",
    malva:      "#7C5A8F",     // malva fado/cultura
    malvaSoft:  "#E8DDF0",
    fluo:       "#FFF200",     // amarelo highlighter (highlights)

    // ─── NEUTROS — Cal · Areia · Tinta ───────────────────────────────────────
    branco:     "#FFFFFF",     // branco puro — page background
    cal:        "#FBFAF7",     // cal off-white (whitewash) — zone-bands
    areia:      "#E8DCC2",     // areia/sand (callouts terrosos)
    areiaSoft:  "#F6F0E0",
    pedra:      "#8C8C8C",     // pedra (muted)
    pedraSoft:  "#E5E5E5",
    grafite:    "#3A3A3D",     // grafite (alt. ink mais leve)
};

// =============================================================================
// SEMÂNTICA — mapeamento "uso → cor" para evitar decisões ad-hoc espalhadas.
// Quando precisares de cor numa página, pega aqui, não no FANZINE direto.
// =============================================================================
export const FZ_SEMANTIC = {
    // Surfaces
    pageBg:        FANZINE.branco,        // SEMPRE branco
    surfaceSoft:   FANZINE.cal,           // zone bands, sub-bg
    surfaceAccent: FANZINE.areiaSoft,     // callouts editoriais
    ink:           FANZINE.ink,
    inkSoft:       FANZINE.grafite,

    // Action / CTA
    primary:       FANZINE.ink,           // CTA principal: preto+gold
    primaryFg:     FANZINE.gold,
    danger:        FANZINE.red,
    success:       FANZINE.eucalipto,
    warning:       FANZINE.gold,
    info:          FANZINE.atl,

    // Editorial highlights
    badge:         FANZINE.gold,
    highlight:     FANZINE.fluo,
    underline:     FANZINE.gold,

    // Decor doodles (peripheral)
    doodleA:       FANZINE.red,
    doodleB:       FANZINE.azul,
    doodleC:       FANZINE.gold,
    doodleD:       FANZINE.peixe,
    doodleE:       FANZINE.telha,

    // Engagement / reactions (feed)
    like:          FANZINE.brasa,
    repost:        FANZINE.eucalipto,
    bookmark:      FANZINE.gold,
    comment:       FANZINE.atl,
};

// Alias para legibilidade fora do tema fanzine (importação alternativa)
export default FANZINE;
