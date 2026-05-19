import { useEffect, useRef, useState } from "react";

/**
 * O Selo Lusorae — a hand-drawn animated signature that "writes itself"
 * when scrolled into view. The single most distinctive detail of the app:
 * a flowing cursive mark of the word "lusorae" and a coral diamond
 * "seal" that stamps down at the end (◆). Below, a tiny mono-cap caption.
 *
 *  Anatomy of the path (single fluid stroke):
 *    · l  — tall ascender that loops back to baseline
 *    · u  — two valleys
 *    · s  — top curl + lower tail
 *    · o  — closed counter-clockwise loop
 *    · r  — short ascender + hook
 *    · a  — closed top loop + descending stem
 *    · e  — loop with crossbar, tail trails right into the seal
 *
 * "Lusorae" has no dotted letters (no i, no j) — the two ink-dots from
 * the previous mark are intentionally removed, keeping the signature
 * cleaner and faster to read.
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
                {/* Main cursive signature — one fluid stroke spelling "lusorae".
                    pathLength="1" normalises stroke-dasharray independent of
                    path length so the writing animation feels even. */}
                <path
                    className="seal-signature"
                    pathLength="1"
                    d="M 10 44
                       C 6 28 12 8 20 8
                       C 24 8 22 22 22 32
                       L 22 44
                       C 28 44 30 22 34 22
                       C 34 38 38 46 42 44
                       C 46 44 44 22 48 22
                       L 48 44
                       C 56 22 60 26 58 32
                       C 56 38 46 36 50 40
                       C 54 44 62 44 66 40
                       C 68 30 78 22 84 26
                       C 90 32 88 44 78 44
                       C 68 44 66 36 74 36
                       C 80 36 82 22 90 22
                       C 94 22 94 30 92 36
                       C 98 36 108 22 116 22
                       C 124 22 126 38 118 40
                       C 112 40 112 34 118 34
                       L 120 44
                       C 128 44 134 22 142 22
                       C 150 22 152 34 146 36
                       C 142 36 142 34 146 34
                       C 152 40 168 42 184 38
                       Q 198 34 208 32"
                    stroke={inkColor}
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />

                {/* No ink-dots: "lusorae" has no dotted letters. */}

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
