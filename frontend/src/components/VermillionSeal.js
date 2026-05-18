import { useEffect, useRef, useState } from "react";

/**
 * O Selo Lusorae — a hand-drawn animated signature that "writes itself"
 * when scrolled into view. The single most distinctive detail of the app:
 * a flowing cursive mark, two real ink-dots on the i's, and a coral diamond
 * "seal" that stamps down at the end (◆). Below, a tiny mono-cap caption.
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

    const inkColor = tone === "light" ? "rgba(255,255,255,0.92)" : "#161616";
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
                {/* Main cursive signature — one fluid stroke. pathLength="1"
                    normalises stroke-dasharray independent of path length. */}
                <path
                    className="seal-signature"
                    pathLength="1"
                    d="M 10 22
                       C 12 30 16 46 22 46
                       C 28 46 32 30 34 22
                       C 38 18 42 22 42 28
                       C 42 36 36 38 36 32
                       C 36 26 50 44 58 44
                       C 64 44 66 38 68 36
                       C 72 32 74 44 76 44
                       C 80 44 82 36 82 36
                       L 82 44
                       C 86 10 94 8 90 44
                       C 96 44 100 44 102 44
                       C 108 10 116 8 112 44
                       C 116 44 120 40 122 36
                       L 122 44
                       C 132 32 144 32 144 40
                       C 144 48 132 48 132 40
                       C 132 36 138 36 142 38
                       C 148 38 150 26 156 26
                       C 162 26 164 36 164 44
                       C 172 44 184 40 196 32
                       Q 206 26 208 30"
                    stroke={inkColor}
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />

                {/* Real ink-dots on the i's — appear AFTER the stroke,
                    as if the writer went back to dot them. */}
                <circle
                    className="seal-dot seal-dot-1"
                    cx="82"
                    cy="14"
                    r="1.6"
                    fill={inkColor}
                />
                <circle
                    className="seal-dot seal-dot-2"
                    cx="122"
                    cy="14"
                    r="1.6"
                    fill={inkColor}
                />

                {/* THE SEAL — coral diamond stamps down at the end.
                    transform-origin set inline to ensure correct pivot. */}
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
