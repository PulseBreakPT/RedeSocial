// =============================================================================
// LUSORAE — Auth Decor Kit (poster urbano · fanzine PT)
// Stickers, doodles, fotos coladas, formas — paleta portuguesa pesada.
// =============================================================================

export const PT = {
    red: "#C8102E",
    green: "#046A38",
    gold: "#FFCC00",
    azul: "#0E4D92",
    cream: "#FFF4DC",
    ink: "#0A0A0A",
    bone: "#F2EBD3",
};

// ============ STICKER OVAL ROTADO ============
export function Sticker({ children, bg = PT.gold, color = PT.ink, rotate = -6, className = "", style = {}, ...rest }) {
    return (
        <div
            className={`inline-flex items-center justify-center text-center font-black uppercase ${className}`}
            style={{
                background: bg,
                color,
                padding: "10px 18px",
                borderRadius: "999px",
                border: `3px solid ${PT.ink}`,
                boxShadow: `4px 4px 0 ${PT.ink}`,
                letterSpacing: "0.06em",
                transform: `rotate(${rotate}deg)`,
                fontSize: 12,
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

// ============ STICKER CIRCULAR (estilo "carimbo") ============
export function StampCircle({ children, size = 86, bg = PT.red, color = "#fff", rotate = -14, style = {} }) {
    return (
        <div
            className="flex items-center justify-center text-center font-black uppercase"
            style={{
                width: size,
                height: size,
                background: bg,
                color,
                borderRadius: "50%",
                border: `3px solid ${PT.ink}`,
                boxShadow: `5px 5px 0 ${PT.ink}`,
                letterSpacing: "0.08em",
                transform: `rotate(${rotate}deg)`,
                fontSize: 11,
                lineHeight: 1.05,
                padding: 8,
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

// ============ POSTER CARD — bloco rodado com sombra dura ============
export function PosterCard({ children, bg = "#fff", color = PT.ink, rotate = -2, shadow = PT.ink, className = "", style = {}, ...rest }) {
    return (
        <div
            className={className}
            style={{
                background: bg,
                color,
                border: `3px solid ${PT.ink}`,
                boxShadow: `6px 6px 0 ${shadow}`,
                transform: `rotate(${rotate}deg)`,
                padding: "18px 20px",
                ...style,
            }}
            {...rest}
        >
            {children}
        </div>
    );
}

// ============ NÚMERO de annotation tipo revista ============
export function MagNumber({ n, color = PT.red, size = 56 }) {
    return (
        <span
            className="inline-flex items-center justify-center font-black"
            style={{
                width: size,
                height: size,
                background: color,
                color: "#fff",
                borderRadius: "50%",
                border: `3px solid ${PT.ink}`,
                boxShadow: `4px 4px 0 ${PT.ink}`,
                fontSize: size * 0.45,
                lineHeight: 1,
            }}
        >
            {String(n).padStart(2, "0")}
        </span>
    );
}

// ============ DOODLES SVG ============
export function DoodleArrow({ color = PT.ink, w = 90, h = 60, style = {} }) {
    return (
        <svg width={w} height={h} viewBox="0 0 90 60" fill="none" style={style} aria-hidden>
            <path
                d="M5 35 Q 25 5, 50 30 T 80 25"
                stroke={color} strokeWidth="3.5" strokeLinecap="round" fill="none"
            />
            <path
                d="M70 18 L82 25 L73 36"
                stroke={color} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none"
            />
        </svg>
    );
}

export function DoodleScribble({ color = PT.azul, w = 160, h = 60, style = {} }) {
    return (
        <svg width={w} height={h} viewBox="0 0 160 60" fill="none" style={style} aria-hidden>
            <path
                d="M5 30 Q 20 5, 40 30 T 80 30 T 120 30 T 155 30"
                stroke={color} strokeWidth="4" strokeLinecap="round" fill="none"
            />
        </svg>
    );
}

export function DoodleStar({ color = PT.gold, size = 44, rotate = 8, style = {} }) {
    return (
        <svg width={size} height={size} viewBox="0 0 44 44" fill="none" style={{ transform: `rotate(${rotate}deg)`, ...style }} aria-hidden>
            <path
                d="M22 4 L26 18 L40 22 L26 26 L22 40 L18 26 L4 22 L18 18 Z"
                fill={color}
                stroke={PT.ink}
                strokeWidth="2.5"
                strokeLinejoin="round"
            />
        </svg>
    );
}

export function DoodleHeart({ color = PT.red, size = 36, rotate = -6, style = {} }) {
    return (
        <svg width={size} height={size} viewBox="0 0 36 36" fill="none" style={{ transform: `rotate(${rotate}deg)`, ...style }} aria-hidden>
            <path
                d="M18 32 C 4 22, 4 10, 12 8 C 16 7, 18 10, 18 13 C 18 10, 20 7, 24 8 C 32 10, 32 22, 18 32 Z"
                fill={color}
                stroke={PT.ink}
                strokeWidth="2.5"
                strokeLinejoin="round"
            />
        </svg>
    );
}

export function DoodleExclamation({ color = PT.gold, size = 60, rotate = 8, style = {} }) {
    return (
        <svg width={size * 0.4} height={size} viewBox="0 0 24 60" fill="none" style={{ transform: `rotate(${rotate}deg)`, ...style }} aria-hidden>
            <path d="M12 6 L9 36 L15 36 Z" fill={color} stroke={PT.ink} strokeWidth="2.5" strokeLinejoin="round" />
            <circle cx="12" cy="48" r="5" fill={color} stroke={PT.ink} strokeWidth="2.5" />
        </svg>
    );
}

// ============ DOODLE: espiral rabiscado ============
export function DoodleSpiral({ color = PT.ink, size = 60, rotate = 0, style = {} }) {
    return (
        <svg width={size} height={size} viewBox="0 0 60 60" fill="none" style={{ transform: `rotate(${rotate}deg)`, ...style }} aria-hidden>
            <path
                d="M30 30 m-3 0 a3 3 0 1 1 6 0 a6 6 0 1 1 -12 0 a9 9 0 1 1 18 0 a12 12 0 1 1 -24 0 a16 16 0 1 1 32 0"
                stroke={color} strokeWidth="3" strokeLinecap="round" fill="none"
            />
        </svg>
    );
}

// ============ DOODLE: zigzag (raio/eclair) ============
export function DoodleZigzag({ color = PT.red, w = 120, h = 28, style = {} }) {
    return (
        <svg width={w} height={h} viewBox="0 0 120 28" fill="none" style={style} aria-hidden>
            <path
                d="M3 14 L20 4 L32 22 L50 6 L66 22 L84 4 L100 22 L117 10"
                stroke={color} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" fill="none"
            />
        </svg>
    );
}

// ============ DOODLE: círculo de anotação (à mão) à volta de palavra ============
export function DoodleCircleNote({ color = PT.red, w = 180, h = 70, rotate = -3, style = {} }) {
    return (
        <svg width={w} height={h} viewBox="0 0 180 70" fill="none" style={{ transform: `rotate(${rotate}deg)`, ...style }} aria-hidden>
            <path
                d="M30 35 C 20 10, 80 -2, 130 8 C 165 16, 175 38, 155 55 C 130 70, 60 70, 30 58 C 8 48, 5 38, 30 32"
                stroke={color} strokeWidth="3" strokeLinecap="round" fill="none"
                strokeDasharray="0"
            />
        </svg>
    );
}

// ============ DOODLE: sublinhado ondulado ============
export function DoodleUnderline({ color = PT.gold, w = 140, h = 14, style = {} }) {
    return (
        <svg width={w} height={h} viewBox="0 0 140 14" fill="none" style={style} aria-hidden>
            <path
                d="M3 8 Q 18 1, 35 8 T 70 8 T 105 8 T 137 8"
                stroke={color} strokeWidth="4" strokeLinecap="round" fill="none"
            />
        </svg>
    );
}

// ============ DOODLE: sparkles (3 estrelinhas mini) ============
export function DoodleSparkles({ color = PT.gold, size = 60, rotate = 0, style = {} }) {
    return (
        <svg width={size} height={size} viewBox="0 0 60 60" fill="none" style={{ transform: `rotate(${rotate}deg)`, ...style }} aria-hidden>
            <path d="M15 8 L17 14 L23 16 L17 18 L15 24 L13 18 L7 16 L13 14 Z" fill={color} stroke={PT.ink} strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M44 22 L46 28 L52 30 L46 32 L44 38 L42 32 L36 30 L42 28 Z" fill={color} stroke={PT.ink} strokeWidth="1.5" strokeLinejoin="round" />
            <path d="M22 38 L24 44 L30 46 L24 48 L22 54 L20 48 L14 46 L20 44 Z" fill={color} stroke={PT.ink} strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
    );
}

// ============ DOODLE: smiley desenhado à mão ============
export function DoodleSmiley({ color = PT.ink, size = 44, rotate = -6, style = {} }) {
    return (
        <svg width={size} height={size} viewBox="0 0 44 44" fill="none" style={{ transform: `rotate(${rotate}deg)`, ...style }} aria-hidden>
            <circle cx="22" cy="22" r="18" stroke={color} strokeWidth="2.8" fill="#fff" />
            <circle cx="16" cy="19" r="2" fill={color} />
            <circle cx="28" cy="19" r="2" fill={color} />
            <path d="M14 27 Q 22 34, 30 27" stroke={color} strokeWidth="2.5" strokeLinecap="round" fill="none" />
        </svg>
    );
}

// ============ DOODLE: seta longa curvada com cauda ============
export function DoodleLongArrow({ color = PT.ink, w = 160, h = 100, rotate = 0, style = {} }) {
    return (
        <svg width={w} height={h} viewBox="0 0 160 100" fill="none" style={{ transform: `rotate(${rotate}deg)`, ...style }} aria-hidden>
            <path
                d="M8 20 C 30 5, 70 -5, 100 20 C 120 38, 90 60, 60 60 C 40 60, 30 78, 60 90"
                stroke={color} strokeWidth="3" strokeLinecap="round" fill="none"
            />
            <path
                d="M50 82 L60 90 L68 80"
                stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"
            />
        </svg>
    );
}

// ============ DOODLE: cruzes/X de marcação ============
export function DoodleCross({ color = PT.red, size = 28, rotate = 12, style = {} }) {
    return (
        <svg width={size} height={size} viewBox="0 0 28 28" fill="none" style={{ transform: `rotate(${rotate}deg)`, ...style }} aria-hidden>
            <path d="M5 5 L23 23" stroke={color} strokeWidth="3.5" strokeLinecap="round" />
            <path d="M23 5 L5 23" stroke={color} strokeWidth="3.5" strokeLinecap="round" />
        </svg>
    );
}

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

// ============ ASTERISCO gigante (logo decorativo) ============
export function GiantAsterisk({ color = PT.gold, size = 320, rotate = -8, style = {} }) {
    return (
        <span
            aria-hidden
            className="select-none pointer-events-none font-black leading-none"
            style={{
                fontSize: size,
                color,
                textShadow: `8px 8px 0 ${PT.ink}`,
                transform: `rotate(${rotate}deg)`,
                display: "inline-block",
                ...style,
            }}
        >
            ✱
        </span>
    );
}

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

// ============ ESTILOS partilhados (inputs + botões neo-brutalist) ============
export function AuthStyles() {
    return (
        <style>{`
            @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@500;700&family=Patrick+Hand&display=swap');
            .pt-input {
                width: 100%;
                background: #fff;
                border: 3px solid ${PT.ink};
                border-radius: 14px;
                padding: 14px 16px;
                font-size: 15px;
                color: ${PT.ink};
                box-shadow: 4px 4px 0 ${PT.ink};
                transition: transform .12s ease, box-shadow .12s ease, border-color .12s ease;
                outline: none;
                font-family: inherit;
                font-weight: 600;
            }
            .pt-input::placeholder { color: rgba(10,10,10,0.40); font-weight: 500; }
            .pt-input:hover { transform: translate(-1px,-1px); box-shadow: 5px 5px 0 ${PT.ink}; }
            .pt-input:focus {
                border-color: ${PT.azul};
                transform: translate(-2px,-2px);
                box-shadow: 6px 6px 0 ${PT.azul};
            }
            .pt-btn-primary {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                background: ${PT.ink};
                color: ${PT.gold};
                font-weight: 900;
                border-radius: 999px;
                border: 3px solid ${PT.ink};
                box-shadow: 5px 5px 0 ${PT.red};
                transition: transform .12s ease, box-shadow .12s ease, background .12s ease, color .12s ease;
                cursor: pointer;
                letter-spacing: -0.01em;
                text-transform: uppercase;
            }
            .pt-btn-primary:hover:not(:disabled) {
                transform: translate(-2px,-2px);
                box-shadow: 7px 7px 0 ${PT.red};
                background: ${PT.red};
                color: #fff;
            }
            .pt-btn-primary:active:not(:disabled) {
                transform: translate(2px,2px);
                box-shadow: 1px 1px 0 ${PT.red};
            }
            .pt-btn-ghost {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
                background: #fff;
                color: ${PT.ink};
                font-weight: 800;
                border-radius: 999px;
                border: 3px solid ${PT.ink};
                box-shadow: 4px 4px 0 ${PT.ink};
                transition: transform .12s ease, box-shadow .12s ease, background .12s ease;
                cursor: pointer;
                text-transform: uppercase;
            }
            .pt-btn-ghost:hover { transform: translate(-1px,-1px); box-shadow: 5px 5px 0 ${PT.ink}; background: ${PT.cream}; }
            .pt-btn-ghost:active { transform: translate(2px,2px); box-shadow: 1px 1px 0 ${PT.ink}; }

            /* Paper grain texture */
            .pt-grain::before {
                content: "";
                position: absolute;
                inset: 0;
                background-image:
                    radial-gradient(rgba(10,10,10,0.06) 1px, transparent 1px),
                    radial-gradient(rgba(10,10,10,0.04) 1px, transparent 1px);
                background-size: 3px 3px, 7px 7px;
                background-position: 0 0, 1px 1px;
                pointer-events: none;
                z-index: 0;
            }

            /* Marquee tape (linha decorativa repetida) */
            .pt-tape {
                background-image: repeating-linear-gradient(
                    -45deg,
                    ${PT.ink} 0 8px,
                    ${PT.gold} 8px 16px
                );
            }
        `}</style>
    );
}
