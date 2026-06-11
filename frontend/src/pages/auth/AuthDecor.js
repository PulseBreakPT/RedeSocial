// =============================================================================
// LUSORAE — Auth Decor Kit (poster urbano · fanzine PT)
// Stickers, doodles, fotos coladas, formas — paleta portuguesa pesada.
// =============================================================================

// Paleta original (mantida por compat — 60+ ficheiros importam PT).
// Para novos componentes, prefere `FANZINE` em `/src/theme/fanzinePalette.js`,
// que tem 20+ tokens curados, pares "soft" e validação WCAG.
export const PT = {
    // originais
    red: "#C8102E",
    green: "#046A38",
    gold: "#FFCC00",
    azul: "#0E4D92",
    cream: "#F4F4F4",
    ink: "#0A0A0A",
    bone: "#EDEDEC",
    // expansão (acessível também via PT.<token> para conveniência)
    telha: "#D86A4E",
    brasa: "#E85D4F",
    tijolo: "#A04830",
    fado: "#6B2C39",
    laranja: "#F08A1E",
    atl: "#1B4F8F",
    azulejoLite: "#5B8DBF",
    peixe: "#2EB4A6",
    eucalipto: "#4A7C59",
    oliveira: "#8B8E3F",
    lima: "#D4E83C",
    rosa: "#F4A6B7",
    malva: "#7C5A8F",
    fluo: "#FFF200",
    branco: "#FFFFFF",
    cal: "#FBFAF7",
    areia: "#E8DCC2",
    pedra: "#8C8C8C",
    grafite: "#3A3A3D",
};

// ============ STICKER — pill clean editorial ============
// (API mantida para back-compat; visualmente limpo: sem rotação, sem
//  sombras 3D, sem border ink chunky. Cor de fundo + cor de texto.)
export function Sticker({ children, bg = PT.gold, color = PT.ink, rotate, className = "", style = {}, ...rest }) {
    return (
        <div
            className={`inline-flex items-center justify-center text-center font-bold uppercase ${className}`}
            style={{
                background: bg,
                color,
                padding: "6px 12px",
                borderRadius: "999px",
                letterSpacing: "0.14em",
                fontSize: 11,
                lineHeight: 1,
                whiteSpace: "nowrap",
                ...style,
            }}
            {...rest}
        >
            {children}
        </div>
    );
}

// ============ STAMP CIRCLE — clean (sem rotação) ============
export function StampCircle({ children, size = 86, bg = PT.red, color = "#fff", rotate, style = {} }) {
    return (
        <div
            className="flex items-center justify-center text-center font-bold uppercase"
            style={{
                width: size,
                height: size,
                background: bg,
                color,
                borderRadius: "50%",
                letterSpacing: "0.14em",
                fontSize: 11,
                lineHeight: 1.1,
                padding: 8,
                boxShadow: "0 8px 20px -8px rgba(10,10,10,0.30)",
                ...style,
            }}
        >
            {children}
        </div>
    );
}

// ============ FOTO COLADA com fita-cola ============
export function TapedPhoto({ src, alt = "", rotate = -4, w = 200, h = 240, caption = null, style = {}, tapeColor = "rgba(255,204,0,0.78)", tapeColor2 = "rgba(14,77,146,0.55)" }) {
    return (
        <div
            className="relative"
            style={{
                width: w,
                height: h,
                background: "#fff",
                padding: 8,
                paddingBottom: caption ? 28 : 8,
                border: `2px solid ${PT.ink}`,
                boxShadow: `8px 8px 0 ${PT.ink}`,
                transform: `rotate(${rotate}deg)`,
                ...style,
            }}
        >
            {/* Fita-cola topo */}
            <span
                aria-hidden
                className="absolute"
                style={{
                    top: -10,
                    left: "32%",
                    width: 64,
                    height: 20,
                    background: tapeColor,
                    border: "1px dashed rgba(0,0,0,0.18)",
                    transform: "rotate(-8deg)",
                }}
            />
            <span
                aria-hidden
                className="absolute"
                style={{
                    bottom: -8,
                    right: "18%",
                    width: 52,
                    height: 18,
                    background: tapeColor2,
                    border: "1px dashed rgba(0,0,0,0.18)",
                    transform: "rotate(6deg)",
                }}
            />
            <img
                src={src}
                alt={alt}
                className="block w-full object-cover"
                style={{ height: caption ? `calc(100% - 26px)` : "100%" }}
                loading="lazy"
            />
            {caption && (
                <span
                    className="absolute left-0 right-0 bottom-1 text-center font-bold"
                    style={{
                        fontFamily: "'Caveat','Patrick Hand',cursive",
                        fontSize: 16,
                        color: PT.ink,
                        letterSpacing: "0.02em",
                    }}
                >
                    {caption}
                </span>
            )}
        </div>
    );
}

// ============ PILHA DE POLAROIDS — várias fotos sobrepostas com rotações ============
export function PolaroidStack({ photos = [], style = {} }) {
    // photos: [{ src, alt, rotate, w, h, caption, top, left, z, tapeColor, tapeColor2 }, ...]
    return (
        <div className="relative" style={{ width: 240, height: 280, ...style }}>
            {photos.map((p, i) => (
                <div
                    key={i}
                    className="absolute"
                    style={{
                        top: p.top ?? 0,
                        left: p.left ?? 0,
                        zIndex: p.z ?? i + 1,
                    }}
                >
                    <TapedPhoto
                        src={p.src}
                        alt={p.alt || ""}
                        rotate={p.rotate ?? 0}
                        w={p.w ?? 170}
                        h={p.h ?? 200}
                        caption={p.caption}
                        tapeColor={p.tapeColor}
                        tapeColor2={p.tapeColor2}
                    />
                </div>
            ))}
        </div>
    );
}

// ============ POSTER CARD — clean (sem rotação/sombras chunky) ============
export function PosterCard({ children, bg = "#fff", color = PT.ink, rotate, shadow, className = "", style = {}, ...rest }) {
    return (
        <div
            className={className}
            style={{
                background: bg,
                color,
                border: "1px solid rgba(10,10,10,0.08)",
                borderRadius: 16,
                boxShadow: "0 1px 0 rgba(255,255,255,0.6) inset, 0 12px 28px -16px rgba(10,10,10,0.10)",
                padding: "18px 20px",
                ...style,
            }}
            {...rest}
        >
            {children}
        </div>
    );
}

// ============ NÚMERO de annotation (clean) ============
export function MagNumber({ n, color = PT.red, size = 56 }) {
    return (
        <span
            className="inline-flex items-center justify-center font-black"
            style={{
                width: size,
                height: size,
                background: "rgba(10,10,10,0.04)",
                color,
                borderRadius: "50%",
                fontSize: size * 0.42,
                lineHeight: 1,
            }}
        >
            {String(n).padStart(2, "0")}
        </span>
    );
}

// ============ DOODLES — todos no-op no novo design clean ============
// (mantidos exportados para compat com 30+ ficheiros que importam.
//  Renderem null para não poluírem a UI editorial nova.)
export function DoodleArrow() { return null; }

export function DoodleScribble() { return null; }

export function DoodleStar() { return null; }

export function DoodleHeart() { return null; }

export function DoodleExclamation() { return null; }

export function DoodleSpiral() { return null; }

export function DoodleZigzag() { return null; }

export function DoodleCircleNote() { return null; }

export function DoodleUnderline() { return null; }

export function DoodleSparkles() {
    // Manter assinatura inerte para back-compat
    return null;
}

// ============ DOODLE: smiley — no-op ============
export function DoodleSmiley() { return null; }

// ============ DOODLE: seta longa — no-op ============
export function DoodleLongArrow() { return null; }

// ============ DOODLE: cruzes/X de marcação — no-op ============
export function DoodleCross() { return null; }

// ============ NOTA MANUSCRITA — pequeno texto inclinado tipo nota à mão ============
export function HandNote({ children, color = PT.ink, rotate = -4, size = 18, style = {} }) {
    return (
        <span
            className="inline-block font-bold select-none"
            style={{
                fontFamily: "'Caveat','Patrick Hand',cursive",
                fontSize: size,
                lineHeight: 1.05,
                color,
                transform: `rotate(${rotate}deg)`,
                letterSpacing: "0.01em",
                ...style,
            }}
        >
            {children}
        </span>
    );
}

export function GeoTriangle({ color = PT.gold, size = 56, rotate = 12, style = {} }) {
    return (
        <div
            aria-hidden
            style={{
                width: 0,
                height: 0,
                borderLeft: `${size / 2}px solid transparent`,
                borderRight: `${size / 2}px solid transparent`,
                borderBottom: `${size * 0.9}px solid ${color}`,
                transform: `rotate(${rotate}deg)`,
                filter: `drop-shadow(3px 3px 0 ${PT.ink})`,
                ...style,
            }}
        />
    );
}

export function GeoSquare({ color = PT.red, size = 50, rotate = 14, style = {} }) {
    return (
        <div
            aria-hidden
            style={{
                width: size,
                height: size,
                background: color,
                border: `3px solid ${PT.ink}`,
                boxShadow: `4px 4px 0 ${PT.ink}`,
                transform: `rotate(${rotate}deg)`,
                ...style,
            }}
        />
    );
}

export function GeoCircle({ color = PT.azul, size = 60, style = {} }) {
    return (
        <div
            aria-hidden
            style={{
                width: size,
                height: size,
                background: color,
                borderRadius: "50%",
                border: `3px solid ${PT.ink}`,
                boxShadow: `4px 4px 0 ${PT.ink}`,
                ...style,
            }}
        />
    );
}

// ============ ASTERISCO gigante — no-op no novo design ============
export function GiantAsterisk() { return null; }

// ============ KICKER (rubrica de revista) ============
export function Kicker({ children, color = PT.red, className = "" }) {
    return (
        <p
            className={`font-mono font-bold uppercase ${className}`}
            style={{
                color,
                letterSpacing: "0.22em",
                fontSize: 11,
            }}
        >
            {children}
        </p>
    );
}

// =============================================================================
// FANZINE EXTRAS — post-it, recibo, bilhete, selo PT, azulejo, highlight,
// recorte de jornal, balão de fala, coordenadas, assinatura, rota pontilhada
// =============================================================================

// ============ POST-IT ============
export function PostIt({ children, color = "#FFE066", rotate = -3, w = 160, style = {} }) {
    return (
        <div
            aria-hidden
            className="select-none"
            style={{
                width: w,
                background: color,
                color: PT.ink,
                padding: "12px 14px",
                fontFamily: "'Patrick Hand', cursive",
                fontSize: 15,
                lineHeight: 1.18,
                transform: `rotate(${rotate}deg)`,
                boxShadow: `0 8px 14px rgba(10,10,10,0.18), 0 2px 4px rgba(10,10,10,0.10)`,
                position: "relative",
                ...style,
            }}
        >
            {/* fita transparente no topo */}
            <span
                className="absolute pointer-events-none"
                style={{
                    top: -8, left: "40%", width: 36, height: 14,
                    background: "rgba(255,255,255,0.55)",
                    borderLeft: "1px dashed rgba(10,10,10,0.25)",
                    borderRight: "1px dashed rgba(10,10,10,0.25)",
                    boxShadow: "0 2px 3px rgba(10,10,10,0.10)",
                }}
            />
            {children}
        </div>
    );
}

// ============ RECIBO (recibo vertical estreito monoespaçado) ============
export function Receipt({ lines = [], total = null, rotate = 2, w = 180, style = {} }) {
    return (
        <div
            aria-hidden
            className="font-mono select-none"
            style={{
                width: w,
                background: "#FAF6E8",
                color: PT.ink,
                padding: "12px 12px 16px",
                transform: `rotate(${rotate}deg)`,
                boxShadow: `0 8px 14px rgba(10,10,10,0.20)`,
                border: `1px solid rgba(10,10,10,0.10)`,
                position: "relative",
                ...style,
            }}
        >
            {/* zig-zag bottom edge */}
            <span
                className="absolute left-0 right-0 pointer-events-none"
                style={{
                    bottom: -6,
                    height: 8,
                    background: "linear-gradient(135deg, transparent 33%, #FAF6E8 33% 66%, transparent 66%) 0 0 / 12px 8px",
                }}
            />
            <p className="text-[10px] font-black uppercase tracking-wider text-center mb-2" style={{ letterSpacing: "0.18em" }}>
                LUSORAE · RECIBO
            </p>
            <div className="text-[10.5px] leading-snug space-y-1">
                {lines.map((l, i) => (
                    <div key={i} className="flex items-center justify-between gap-2">
                        <span className="truncate">{l.label}</span>
                        <span className="font-black tabular-nums">{l.value}</span>
                    </div>
                ))}
            </div>
            {total && (
                <>
                    <div className="border-t border-dashed mt-2 pt-1.5" style={{ borderColor: PT.ink }} />
                    <div className="flex items-center justify-between text-[11px] font-black">
                        <span>TOTAL</span><span className="tabular-nums">{total}</span>
                    </div>
                </>
            )}
            <p className="text-[9px] mt-2 text-center" style={{ color: "rgba(10,10,10,0.50)" }}>
                · obrigado · 2026 ·
            </p>
        </div>
    );
}

// ============ BILHETE DE EVENTO (com edge perfurada) ============
export function Ticket({ title, place, date, color = PT.red, rotate = -3, w = 240, style = {} }) {
    return (
        <div
            aria-hidden
            className="relative select-none"
            style={{
                width: w,
                background: "#FFF8E2",
                color: PT.ink,
                border: `2.5px solid ${PT.ink}`,
                borderRadius: 6,
                transform: `rotate(${rotate}deg)`,
                boxShadow: `4px 4px 0 ${PT.ink}`,
                overflow: "hidden",
                ...style,
            }}
        >
            <div className="flex">
                {/* stub esq */}
                <div
                    className="flex flex-col items-center justify-center px-2.5 py-2.5 shrink-0"
                    style={{ background: color, color: "#fff", borderRight: `2px dashed ${PT.ink}`, minWidth: 56 }}
                >
                    <p className="text-[10px] font-mono font-black uppercase leading-none mb-1" style={{ letterSpacing: "0.10em" }}>
                        ADMIT
                    </p>
                    <p className="text-[24px] font-black leading-none">1</p>
                </div>
                {/* corpo */}
                <div className="flex-1 px-3 py-2.5 min-w-0">
                    <p className="text-[9px] font-mono font-black uppercase mb-0.5" style={{ color: color, letterSpacing: "0.16em" }}>
                        EVENTO
                    </p>
                    <p className="font-black text-[13.5px] leading-tight mb-1 truncate">{title}</p>
                    <p className="text-[11px] font-mono uppercase" style={{ letterSpacing: "0.06em", color: "rgba(10,10,10,0.70)" }}>
                        📍 {place} · {date}
                    </p>
                </div>
            </div>
        </div>
    );
}

// ============ SELO PORTUGUÊS MODERNO (postage stamp) ============
export function PostStamp({ city, code, value = "0.85€", color = PT.red, rotate = -4, size = 90, style = {} }) {
    // perforation: dashed border
    return (
        <div
            aria-hidden
            className="select-none relative"
            style={{
                width: size,
                height: size * 1.18,
                background: "#F4F4F4",
                color: PT.ink,
                border: `2px dashed ${PT.ink}`,
                outline: `4px solid #F4F4F4`,
                transform: `rotate(${rotate}deg)`,
                boxShadow: `3px 3px 0 rgba(10,10,10,0.18)`,
                padding: 6,
                display: "flex",
                flexDirection: "column",
                ...style,
            }}
        >
            <div className="flex-1 flex items-center justify-center" style={{ background: color }}>
                <span className="font-black text-white text-[26px] leading-none" style={{ textShadow: `1.5px 1.5px 0 ${PT.ink}` }}>
                    {code}
                </span>
            </div>
            <div className="mt-1 flex items-center justify-between">
                <span className="text-[8.5px] font-mono font-black uppercase truncate" style={{ letterSpacing: "0.08em" }}>
                    {city}
                </span>
                <span className="text-[9px] font-black tabular-nums">{value}</span>
            </div>
            <p className="text-[7px] font-mono uppercase text-center mt-0.5" style={{ letterSpacing: "0.18em", color: "rgba(10,10,10,0.55)" }}>
                CTT · PT
            </p>
        </div>
    );
}

// ============ AZULEJO REINTERPRETADO (4x4 grid) ============
export function AzulejoTile({ size = 56, rotate = 0, style = {} }) {
    return (
        <svg
            aria-hidden
            width={size} height={size}
            viewBox="0 0 40 40"
            style={{ transform: `rotate(${rotate}deg)`, ...style }}
        >
            <rect width="40" height="40" fill="#F4F4F4" stroke={PT.ink} strokeWidth="0.6" />
            {/* corners */}
            <path d="M0 0 L10 0 L0 10 Z" fill={PT.azul} />
            <path d="M40 0 L30 0 L40 10 Z" fill={PT.azul} />
            <path d="M0 40 L10 40 L0 30 Z" fill={PT.azul} />
            <path d="M40 40 L30 40 L40 30 Z" fill={PT.azul} />
            {/* centro */}
            <circle cx="20" cy="20" r="6" fill="none" stroke={PT.azul} strokeWidth="1.2" />
            <circle cx="20" cy="20" r="2" fill={PT.azul} />
            {/* asteriscos pequenos */}
            <text x="6" y="22" fontSize="6" fill={PT.azul} fontWeight="900">✱</text>
            <text x="30" y="22" fontSize="6" fill={PT.azul} fontWeight="900">✱</text>
            <text x="18" y="9" fontSize="6" fill={PT.azul} fontWeight="900">✱</text>
            <text x="18" y="37" fontSize="6" fill={PT.azul} fontWeight="900">✱</text>
        </svg>
    );
}

// linha de azulejos (border decorativo)
export function AzulejoBorder({ count = 6, size = 44, style = {} }) {
    return (
        <div className="flex" style={style} aria-hidden>
            {Array.from({ length: count }).map((_, i) => (
                <AzulejoTile key={i} size={size} rotate={i % 2 === 0 ? 0 : 90} />
            ))}
        </div>
    );
}

// ============ HIGHLIGHT MARKER (marcador fluorescente) ============
export function Highlight({ children, color = "#FFEB3B", rotate = -1, style = {} }) {
    return (
        <span
            className="relative inline-block px-1"
            style={{ ...style }}
        >
            <span
                className="absolute pointer-events-none"
                aria-hidden
                style={{
                    inset: "20% -2% 5% -2%",
                    background: color,
                    transform: `rotate(${rotate}deg) skewX(-6deg)`,
                    zIndex: 0,
                    opacity: 0.85,
                    mixBlendMode: "multiply",
                }}
            />
            <span className="relative z-10">{children}</span>
        </span>
    );
}

// ============ COORDENADAS ============
export function Coords({ lat, lon, rotate = 0, color = PT.ink, style = {} }) {
    return (
        <span
            aria-hidden
            className="font-mono font-bold uppercase select-none"
            style={{
                color,
                fontSize: 9.5,
                letterSpacing: "0.10em",
                background: "rgba(244,244,244,0.85)",
                padding: "2px 6px",
                border: `1.2px solid ${color}`,
                transform: `rotate(${rotate}deg)`,
                display: "inline-block",
                ...style,
            }}
        >
            {lat}° N · {lon}° W
        </span>
    );
}

// ============ BALÃO DE FALA ============
export function SpeechBubble({ children, color = PT.gold, ink = PT.ink, rotate = -2, w = 200, tailSide = "left", style = {} }) {
    return (
        <div
            aria-hidden
            className="relative font-black"
            style={{
                width: w,
                background: color,
                color: ink,
                padding: "12px 14px",
                borderRadius: 18,
                border: `2.5px solid ${ink}`,
                boxShadow: `3px 3px 0 ${ink}`,
                transform: `rotate(${rotate}deg)`,
                fontSize: 13.5,
                lineHeight: 1.2,
                ...style,
            }}
        >
            {children}
            {/* tail */}
            <span
                className="absolute pointer-events-none"
                style={{
                    bottom: -14,
                    [tailSide]: 24,
                    width: 0, height: 0,
                    borderLeft: tailSide === "left" ? `0 solid transparent` : `14px solid transparent`,
                    borderRight: tailSide === "left" ? `14px solid transparent` : `0 solid transparent`,
                    borderTop: `14px solid ${ink}`,
                }}
            />
            <span
                className="absolute pointer-events-none"
                style={{
                    bottom: -10,
                    [tailSide]: 28,
                    width: 0, height: 0,
                    borderLeft: tailSide === "left" ? `0 solid transparent` : `10px solid transparent`,
                    borderRight: tailSide === "left" ? `10px solid transparent` : `0 solid transparent`,
                    borderTop: `10px solid ${color}`,
                }}
            />
        </div>
    );
}

// ============ NEWSPAPER CLIP (recorte com bordas rasgadas) ============
export function NewspaperClip({ children, rotate = -1, w = 280, style = {} }) {
    return (
        <div
            aria-hidden
            className="relative select-none"
            style={{
                width: w,
                background: "#FAF6E8",
                color: PT.ink,
                padding: "12px 14px 14px",
                transform: `rotate(${rotate}deg)`,
                boxShadow: `3px 3px 0 rgba(10,10,10,0.20)`,
                clipPath: "polygon(0 4%, 6% 0, 14% 3%, 28% 0, 42% 4%, 58% 0, 72% 3%, 88% 0, 100% 4%, 100% 96%, 92% 100%, 78% 97%, 64% 100%, 48% 96%, 32% 100%, 18% 97%, 6% 100%, 0 96%)",
                fontFamily: "Georgia, 'Times New Roman', serif",
                fontSize: 13.5,
                lineHeight: 1.3,
                ...style,
            }}
        >
            {children}
        </div>
    );
}

// ============ ASSINATURA MANUSCRITA ============
export function Signature({ children = "lusorae 2026", color = PT.ink, rotate = -4, size = 26, style = {} }) {
    return (
        <span
            aria-hidden
            className="select-none"
            style={{
                fontFamily: "'Caveat', cursive",
                fontSize: size,
                fontWeight: 700,
                color,
                transform: `rotate(${rotate}deg)`,
                display: "inline-block",
                lineHeight: 1,
                ...style,
            }}
        >
            {children}
        </span>
    );
}

// ============ ROTA PONTILHADA (curva) ============
export function RouteDots({ d, color = PT.red, w = 200, h = 80, strokeWidth = 2, style = {} }) {
    return (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden style={style}>
            <path d={d} fill="none" stroke={color} strokeWidth={strokeWidth} strokeDasharray="4 5" strokeLinecap="round" />
        </svg>
    );
}

// ============ CANTO DOBRADO (paper fold corner) ============
export function PaperFoldCorner({ size = 22, color = "rgba(10,10,10,0.10)", corner = "top-right", style = {} }) {
    const map = {
        "top-right": { top: 0, right: 0, transform: "rotate(0deg)" },
        "top-left": { top: 0, left: 0, transform: "rotate(-90deg)" },
        "bottom-right": { bottom: 0, right: 0, transform: "rotate(90deg)" },
        "bottom-left": { bottom: 0, left: 0, transform: "rotate(180deg)" },
    };
    return (
        <span
            aria-hidden
            className="absolute pointer-events-none"
            style={{
                width: size, height: size,
                ...map[corner],
                background: `linear-gradient(135deg, transparent 50%, ${color} 50%)`,
                boxShadow: `inset -1px 1px 1px rgba(10,10,10,0.08)`,
                ...style,
            }}
        />
    );
}

// ============ TRAÇO RÁPIDO (slash mark manuscrito) ============
export function QuickStroke({ color = PT.gold, w = 60, h = 22, rotate = -20, strokeWidth = 4, style = {} }) {
    return (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden style={{ transform: `rotate(${rotate}deg)`, ...style }}>
            <path
                d={`M 4 ${h - 4} Q ${w * 0.4} 2 ${w - 4} ${h * 0.4}`}
                fill="none"
                stroke={color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
            />
        </svg>
    );
}

// ============ SETA MANUSCRITA RÁPIDA (curva curta) ============
export function HandArrow({ color = PT.ink, w = 72, h = 60, rotate = 0, dir = "right", style = {} }) {
    // dir: right, left, down, up
    const paths = {
        right: { line: `M 6 ${h * 0.7} Q ${w * 0.5} 6 ${w - 14} ${h * 0.55}`, head: `M ${w - 22} ${h * 0.35} L ${w - 14} ${h * 0.55} L ${w - 26} ${h * 0.66}` },
        left:  { line: `M ${w - 6} ${h * 0.7} Q ${w * 0.5} 6 14 ${h * 0.55}`, head: `M 22 ${h * 0.35} L 14 ${h * 0.55} L 26 ${h * 0.66}` },
        down:  { line: `M ${w * 0.3} 6 Q ${w * 0.6} ${h * 0.5} ${w * 0.55} ${h - 12}`, head: `M ${w * 0.42} ${h - 22} L ${w * 0.55} ${h - 12} L ${w * 0.66} ${h - 24}` },
        up:    { line: `M ${w * 0.3} ${h - 6} Q ${w * 0.6} ${h * 0.5} ${w * 0.55} 12`, head: `M ${w * 0.42} 22 L ${w * 0.55} 12 L ${w * 0.66} 24` },
    };
    const p = paths[dir] || paths.right;
    return (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden style={{ transform: `rotate(${rotate}deg)`, ...style }}>
            <path d={p.line} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
            <path d={p.head} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

// ============ MINI CARIMBO RECTANGULAR (LIVE!/VISTO!/NOVO!) ============
export function StampTag({ children, bg = PT.red, color = "#fff", rotate = -8, size = 14, style = {} }) {
    return (
        <span
            aria-hidden
            className="font-mono font-black uppercase select-none inline-block"
            style={{
                background: bg,
                color,
                padding: "5px 10px",
                fontSize: size,
                letterSpacing: "0.12em",
                border: `2.5px solid ${PT.ink}`,
                boxShadow: `2px 2px 0 ${PT.ink}`,
                transform: `rotate(${rotate}deg)`,
                lineHeight: 1,
                ...style,
            }}
        >
            {children}
        </span>
    );
}

// ============ ESTILOS partilhados — clean editorial (inputs + botões) ============
export function AuthStyles() {
    return (
        <style>{`
            @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@500;700&family=Patrick+Hand&display=swap');
            .pt-input {
                width: 100%;
                background: #fff;
                border: 1.5px solid rgba(10,10,10,0.10);
                border-radius: 14px;
                padding: 14px 16px;
                font-size: 15px;
                color: ${PT.ink};
                transition: border-color .18s ease, box-shadow .18s ease;
                outline: none;
                font-family: inherit;
                font-weight: 500;
            }
            .pt-input::placeholder { color: rgba(10,10,10,0.32); font-weight: 500; }
            .pt-input:hover { border-color: rgba(10,10,10,0.20); }
            .pt-input:focus {
                border-color: ${PT.ink};
                box-shadow: 0 0 0 3px rgba(10,10,10,0.08);
            }
            .pt-btn-primary {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                background: linear-gradient(180deg, #1f1f1f 0%, ${PT.ink} 100%);
                color: #fff;
                font-weight: 700;
                border-radius: 999px;
                padding: 12px 22px;
                box-shadow: inset 0 1px 0 rgba(255,255,255,0.12), 0 12px 28px -10px rgba(10,10,10,0.4), 0 3px 8px rgba(10,10,10,0.08);
                transition: transform .18s ease, box-shadow .22s ease;
                cursor: pointer;
                letter-spacing: -0.005em;
                font-size: 14.5px;
            }
            .pt-btn-primary:hover:not(:disabled) {
                transform: translateY(-1px);
            }
            .pt-btn-primary:active:not(:disabled) {
                transform: translateY(0);
            }
            .pt-btn-ghost {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
                background: #fff;
                color: ${PT.ink};
                font-weight: 600;
                border-radius: 999px;
                padding: 11px 20px;
                border: 1px solid rgba(10,10,10,0.10);
                transition: background .18s ease, border-color .18s ease;
                cursor: pointer;
                font-size: 14px;
            }
            .pt-btn-ghost:hover { background: rgba(10,10,10,0.03); border-color: rgba(10,10,10,0.16); }
            .pt-btn-ghost:active { background: rgba(10,10,10,0.06); }

            /* Paper grain texture — neutralizado */
            .pt-grain::before { content: none; }

            /* Marquee tape — clean ribbon (substituído por linha hairline) */
            .pt-tape {
                background: transparent;
                border-top: 1px solid rgba(10,10,10,0.08);
                border-bottom: 1px solid rgba(10,10,10,0.08);
            }

            /* Paper background — clean off-white */
            .pt-paper {
                position: relative;
                background-color: #F7F5EF;
            }

            /* Linha pontilhada — clean underline */
            .pt-handline {
                background-image: linear-gradient(to right, rgba(10,10,10,0.18) 50%, transparent 50%);
                background-size: 6px 1px;
                background-repeat: repeat-x;
                background-position: 0 100%;
                padding-bottom: 4px;
            }
        `}</style>
    );
}
