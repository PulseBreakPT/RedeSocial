// =============================================================================
// LUSORAE EDITORIAL — Shim de back-compat (era "AuthDecor / fanzine PT")
// -----------------------------------------------------------------------------
// Este ficheiro existiu como kit de decoração "poster urbano / fanzine PT":
// stickers rodados, doodles, post-its, recibos, polaroides, asteriscos
// gigantes, etc. Em junho de 2026 todo o app migrou para o design system
// **LUSORAE EDITORIAL** (ver /src/theme/editorial.js e /src/theme/EDITORIAL.md).
//
// Para evitar quebras em ficheiros que ainda mencionem estes nomes, este
// módulo continua a expor:
//   · `PT`           — re-export dos tokens canónicos (`/src/theme/editorial`)
//   · `Sticker`, `StampCircle`, `PosterCard`, `Kicker`, `Highlight`
//                    — re-export das primitivas editoriais limpas
//                      (`/src/components/editorial/Primitives`)
//   · Tudo o resto (Doodle*, PostIt, Receipt, Ticket, AzulejoTile, etc.)
//                    — **no-ops** que renderizam `null`. Permitem remover
//                      o JSX gradualmente sem partir builds.
//
// DESIGN SYSTEM: LUSORAE EDITORIAL — não adicionar aqui novos componentes
// decorativos. Para novas primitivas, usar `/src/components/editorial/`.
// =============================================================================

export { PT } from "../../theme/editorial";
export {
    Sticker,
    StampCircle,
    PosterCard,
    Kicker,
    Highlight,
} from "../../components/editorial/Primitives";

// ── No-ops (back-compat) ─────────────────────────────────────────────────────
// Cada export abaixo é mantido para compat com ficheiros legacy. Renderizam
// null para que nada do antigo estilo apareça na UI.
const Null = () => null;

export const TapedPhoto       = Null;
export const PolaroidStack    = Null;
export const MagNumber        = Null;
export const DoodleArrow      = Null;
export const DoodleScribble   = Null;
export const DoodleStar       = Null;
export const DoodleHeart      = Null;
export const DoodleExclamation = Null;
export const DoodleSpiral     = Null;
export const DoodleZigzag     = Null;
export const DoodleCircleNote = Null;
export const DoodleUnderline  = Null;
export const DoodleSparkles   = Null;
export const DoodleSmiley     = Null;
export const DoodleLongArrow  = Null;
export const DoodleCross      = Null;
export const HandNote         = Null;
export const GeoTriangle      = Null;
export const GeoSquare        = Null;
export const GeoCircle        = Null;
export const GiantAsterisk    = Null;
export const PostIt           = Null;
export const Receipt          = Null;
export const Ticket           = Null;
export const PostStamp        = Null;
export const AzulejoTile      = Null;
export const AzulejoBorder    = Null;
export const Coords           = Null;
export const SpeechBubble     = Null;
export const NewspaperClip    = Null;
export const Signature        = Null;
export const RouteDots        = Null;
export const PaperFoldCorner  = Null;
export const QuickStroke      = Null;
export const HandArrow        = Null;
export const StampTag         = Null;
export const AuthStyles       = Null; // estilos agora em /src/index.css (`.auth-input`, `.lusorae-pulse`, `.auth-fade-up`)
