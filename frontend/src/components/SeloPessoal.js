import { forwardRef } from "react";

/**
 * Generates a stable 4-digit "Selo nº" from the user's id, so every member
 * gets a unique-looking number that never changes between sessions.
 */
function seloNumber(userId) {
    let h = 0;
    const s = String(userId || "");
    for (let i = 0; i < s.length; i++) {
        h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    }
    return String((Math.abs(h) % 9000) + 1000);
}

function truncate(s, n) {
    if (!s) return "";
    return s.length <= n ? s : s.slice(0, n - 1) + "…";
}

function joinedLabel(iso) {
    if (!iso) return "—";
    try {
        return new Date(iso).toLocaleDateString("pt-PT", {
            month: "long",
            year: "numeric",
        });
    } catch {
        return "—";
    }
}

/**
 * SeloPessoal — a self-contained, exportable SVG card that constitutes the
 * user's personal Lusorae seal. Designed for sharing outside the app
 * (Stories, WhatsApp, anywhere). 3:4 aspect (540×720) — looks great in
 * both feed posts and stories. All fonts are system-default so PNG export
 * via canvas works reliably across Chrome/Safari/Firefox.
 */
export const SeloPessoal = forwardRef(function SeloPessoal(
    { profile, animated = false },
    ref
) {
    const num = seloNumber(profile?.id);
    const city = profile?.city || "Portugal";
    const since = joinedLabel(profile?.created_at);
    const year = new Date().getFullYear();
    const name = profile?.name || profile?.username || "—";
    const username = profile?.username || "—";

    return (
        <svg
            ref={ref}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 540 720"
            width="540"
            height="720"
            className={`selo-pessoal ${animated ? "is-animated" : ""}`}
            data-testid="selo-pessoal-svg"
        >
            <defs>
                <linearGradient id="paper-bg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fbfaf7" />
                    <stop offset="100%" stopColor="#f3efe7" />
                </linearGradient>
                <pattern
                    id="diag-grain"
                    width="6"
                    height="6"
                    patternUnits="userSpaceOnUse"
                    patternTransform="rotate(45)"
                >
                    <line
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="6"
                        stroke="#000"
                        strokeWidth="0.3"
                        strokeOpacity="0.025"
                    />
                </pattern>
            </defs>

            {/* paper + texture */}
            <rect x="0" y="0" width="540" height="720" fill="url(#paper-bg)" />
            <rect x="0" y="0" width="540" height="720" fill="url(#diag-grain)" />

            {/* corner diamonds — subtle azulejo accent */}
            <g opacity="0.18" fill="#161616">
                <path d="M 24 24 L 36 36 L 24 48 L 12 36 Z" />
                <path d="M 528 24 L 516 36 L 528 48 L 540 36 Z" />
                <path d="M 24 696 L 36 684 L 24 672 L 12 684 Z" />
                <path d="M 528 696 L 516 684 L 528 672 L 540 684 Z" />
            </g>

            {/* top wordmark */}
            <g transform="translate(40, 70)">
                <path
                    d="M 0 -8 L 10 2 L 0 12 L -10 2 Z"
                    fill="#161616"
                    opacity="0.85"
                />
                <text
                    x="18"
                    y="6"
                    fontFamily="Georgia, 'Times New Roman', serif"
                    fontSize="22"
                    fontWeight="700"
                    fill="#161616"
                >
                    lusorae
                </text>
            </g>
            <text
                x="500"
                y="76"
                textAnchor="end"
                fontFamily="ui-monospace, Menlo, Monaco, 'Courier New', monospace"
                fontSize="10"
                letterSpacing="2"
                fill="#161616"
                opacity="0.45"
            >
                SELO PESSOAL
            </text>

            <line
                x1="40"
                y1="100"
                x2="500"
                y2="100"
                stroke="#161616"
                strokeOpacity="0.10"
                strokeWidth="1"
            />

            {/* "nº XXX da casa" highlight in coral */}
            <text
                x="40"
                y="156"
                fontFamily="ui-monospace, Menlo, Monaco, 'Courier New', monospace"
                fontSize="11"
                letterSpacing="2.5"
                fill="#e85d4f"
                fontWeight="600"
            >
                Nº {num} DA CASA
            </text>

            {/* big display name */}
            <text
                x="40"
                y="220"
                fontFamily="Georgia, 'Times New Roman', serif"
                fontSize="46"
                fontWeight="700"
                fill="#0d0d0e"
                letterSpacing="-1.5"
            >
                {truncate(name, 22)}
            </text>

            {/* @username · city */}
            <text
                x="40"
                y="252"
                fontFamily="ui-monospace, Menlo, Monaco, 'Courier New', monospace"
                fontSize="13"
                fill="#161616"
                opacity="0.55"
            >
                @{truncate(username, 18)} · {truncate(city, 22)}
            </text>

            {/* coral divider */}
            <line
                x1="40"
                y1="290"
                x2="200"
                y2="290"
                stroke="#e85d4f"
                strokeWidth="1.5"
            />

            {/* manifesto pull-quote (cultural anchor — Lusorae's spirit) */}
            <g transform="translate(40, 330)">
                <text
                    fontFamily="Georgia, 'Times New Roman', serif"
                    fontSize="20"
                    fill="#161616"
                    opacity="0.80"
                    fontStyle="italic"
                    letterSpacing="-0.3"
                >
                    <tspan x="0" dy="0">“Não é sobre quantos seguem.</tspan>
                    <tspan x="0" dy="28">É sobre quem está à mesa.”</tspan>
                </text>
            </g>

            {/* stats row */}
            <g transform="translate(40, 450)">
                <text
                    fontFamily="ui-monospace, Menlo, Monaco, monospace"
                    fontSize="9"
                    letterSpacing="2"
                    fill="#161616"
                    opacity="0.40"
                >
                    MEMBRO DESDE
                </text>
                <text
                    y="22"
                    fontFamily="Georgia, 'Times New Roman', serif"
                    fontSize="17"
                    fontWeight="600"
                    fill="#161616"
                >
                    {since}
                </text>

                <text
                    x="220"
                    fontFamily="ui-monospace, Menlo, Monaco, monospace"
                    fontSize="9"
                    letterSpacing="2"
                    fill="#161616"
                    opacity="0.40"
                >
                    SELO Nº
                </text>
                <text
                    x="220"
                    y="22"
                    fontFamily="Georgia, 'Times New Roman', serif"
                    fontSize="17"
                    fontWeight="700"
                    fill="#e85d4f"
                >
                    #{num}
                </text>

                <text
                    x="340"
                    fontFamily="ui-monospace, Menlo, Monaco, monospace"
                    fontSize="9"
                    letterSpacing="2"
                    fill="#161616"
                    opacity="0.40"
                >
                    AUTÊNTICO
                </text>
                <text
                    x="340"
                    y="22"
                    fontFamily="Georgia, 'Times New Roman', serif"
                    fontSize="17"
                    fontStyle="italic"
                    fontWeight="600"
                    fill="#161616"
                >
                    feito à mão
                </text>
            </g>

            {/* the Lusorae Seal — same signature mark, larger, centered */}
            <g transform="translate(155, 540)">
                <path
                    className="selo-pessoal-signature"
                    pathLength="1"
                    d="M 10 22 C 12 30 16 46 22 46 C 28 46 32 30 34 22 C 38 18 42 22 42 28 C 42 36 36 38 36 32 C 36 26 50 44 58 44 C 64 44 66 38 68 36 C 72 32 74 44 76 44 C 80 44 82 36 82 36 L 82 44 C 86 10 94 8 90 44 C 96 44 100 44 102 44 C 108 10 116 8 112 44 C 116 44 120 40 122 36 L 122 44 C 132 32 144 32 144 40 C 144 48 132 48 132 40 C 132 36 138 36 142 38 C 148 38 150 26 156 26 C 162 26 164 36 164 44 C 172 44 184 40 196 32 Q 206 26 208 30"
                    stroke="#161616"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                />
                <circle
                    cx="82"
                    cy="14"
                    r="2"
                    fill="#161616"
                    className="selo-pessoal-dot selo-pessoal-dot-1"
                />
                <circle
                    cx="122"
                    cy="14"
                    r="2"
                    fill="#161616"
                    className="selo-pessoal-dot selo-pessoal-dot-2"
                />
                <path
                    className="selo-pessoal-stamp"
                    d="M 215 30 L 221 36 L 215 42 L 209 36 Z"
                    fill="#e85d4f"
                />
            </g>

            {/* footer */}
            <line
                x1="40"
                y1="640"
                x2="500"
                y2="640"
                stroke="#161616"
                strokeOpacity="0.10"
                strokeWidth="1"
            />
            <text
                x="40"
                y="668"
                fontFamily="ui-monospace, Menlo, Monaco, monospace"
                fontSize="11"
                letterSpacing="2"
                fill="#161616"
                opacity="0.55"
            >
                lusorae.app · feito à mão · {year}
            </text>
            <path
                d="M 488 660 L 496 668 L 488 676 L 480 668 Z"
                fill="#e85d4f"
                opacity="0.85"
            />
        </svg>
    );
});

export default SeloPessoal;
