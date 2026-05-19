import { useEffect, useId, useRef, useState } from "react";

/**
 * O Selo Lusorae — uma assinatura cursiva legível que "se escreve sozinha"
 * quando entra no viewport, terminada pelo losango coral que carimba.
 *
 * Refinamento: a assinatura passou a ser composta com uma webfont cursiva
 * (Caveat 700) para garantir que se lê mesmo a palavra "lusorae". O efeito
 * de escrita é obtido com um clipPath cujo rect cresce da esquerda para
 * a direita, sincronizado com o stamp do losango coral no fim.
 *
 * Props:
 *   - size: "sm" | "md" | "lg"  (default "md")
 *   - tone: "ink" | "light"     (default "ink"; use "light" on dark backgrounds)
 *   - showCaption: boolean       (default true)
 *   - align: "left" | "center"   (default "left")
 *   - className: extra classes
 */
export function VermillionSeal({
    size = "md",
    tone = "ink",
    showCaption = true,
    align = "left",
    className = "",
}) {
    const ref = useRef(null);
    const [drawing, setDrawing] = useState(false);
    const reactId = useId();
    // useId may include ":" which is invalid in some CSS contexts when used
    // as a fragment identifier — normalise it.
    const clipId = `seal-clip-${reactId.replace(/[:]/g, "")}`;

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        if (!("IntersectionObserver" in window)) {
            setDrawing(true);
            return;
        }
        const io = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setDrawing(true);
                    io.disconnect();
                }
            },
            { threshold: 0.35 }
        );
        io.observe(el);
        return () => io.disconnect();
    }, []);

    const dims = {
        sm: { w: 132, h: 38 },
        md: { w: 176, h: 50 },
        lg: { w: 232, h: 66 },
    }[size] || { w: 176, h: 50 };

    const inkColor = tone === "light" ? "rgba(255,255,255,0.96)" : "#161616";
    const captionColor =
        tone === "light" ? "rgba(255,255,255,0.62)" : "rgba(0,0,0,0.50)";

    return (
        <div
            ref={ref}
            className={`vermillion-seal ${drawing ? "is-drawing" : ""} ${
                align === "center" ? "is-center" : ""
            } ${className}`}
            data-testid="vermillion-seal"
            data-tone={tone}
            aria-label="lusorae — selo da casa, feito à mão"
            role="img"
        >
            <svg
                width={dims.w}
                height={dims.h}
                viewBox="0 0 240 70"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
            >
                <defs>
                    {/* clipPath cujo rect cresce de 0 → 210 da esquerda para
                        a direita, criando a ilusão de escrita à mão. */}
                    <clipPath id={clipId}>
                        <rect
                            className="seal-reveal"
                            x="0"
                            y="0"
                            width="0"
                            height="70"
                        />
                    </clipPath>
                </defs>

                {/* Assinatura cursiva, legível, em Caveat (handwritten).
                    O letterSpacing negativo aperta as letras tornando-as
                    mais ligadas, como uma assinatura real. */}
                <text
                    className="seal-signature"
                    x="2"
                    y="50"
                    fontFamily="'Caveat', 'Brush Script MT', cursive"
                    fontWeight="700"
                    fontSize="54"
                    fill={inkColor}
                    letterSpacing="-0.5"
                    clipPath={`url(#${clipId})`}
                    style={{ fontStyle: "italic" }}
                >
                    lusorae
                </text>

                {/* THE SEAL — coral diamond stamps down at the end. */}
                <g
                    className="seal-stamp"
                    style={{ transformOrigin: "215px 36px", transformBox: "fill-box" }}
                >
                    <path
                        className="seal-stamp-halo"
                        d="M 215 28 L 223 36 L 215 44 L 207 36 Z"
                        fill="none"
                        stroke="rgba(232,93,79,0.42)"
                        strokeWidth="1"
                    />
                    <path
                        d="M 215 30 L 221 36 L 215 42 L 209 36 Z"
                        fill="var(--coral-500, #e85d4f)"
                    />
                </g>
            </svg>

            {showCaption && (
                <p
                    className="vermillion-seal__caption"
                    style={{ color: captionColor }}
                >
                    lusorae · {new Date().getFullYear()} ·{" "}
                    <em>feito à mão</em>
                </p>
            )}
        </div>
    );
}

export default VermillionSeal;
