import { useEffect, useMemo, useRef, useState } from "react";

/**
 * DynamicWord — typewriter rotating word for use INSIDE an existing
 * headline. Used to make the hero "A tua cidade tem ___" come alive.
 *
 *  Behaviour:
 *   · Types the word, holds, erases, moves to next — looping forever.
 *   · `prefers-reduced-motion` → renders the first word static, no cursor.
 *   · Ghost reserves space for the longest word so the line never jitters
 *     and the (optional) suffix stays glued to the word edge.
 *
 *  Variants:
 *   · "hero"    — large, white text with silver-foil rotating word
 *                 (used on the desktop hero h2 and mobile hero h1).
 *   · "compact" — smaller, white/85 (used on mobile photo caption).
 *
 *  This component intentionally inherits the parent's font / size /
 *  colour — the parent <h1>/<h2>/<p> stays the source of truth for type
 *  scale, so the headline reads naturally even with motion turned off.
 */
const DEFAULT_WORDS = [
    "voz",
    "histórias",
    "conversa",
    "pulso",
    "vida",
    "alma",
    "ritmo",
    "saudade",
    "memória",
    "esquinas",
    "sotaque",
    "noites",
    "cor",
];
const TYPE_SPEED = 110;    // ms per char added — calmer typing
const ERASE_SPEED = 58;    // ms per char removed (slightly faster — feels natural)
const HOLD_MS = 2400;      // longer pause so the word can be read
const NEXT_DELAY = 500;    // breathing room before the next word starts

export function DynamicWord({
    words = DEFAULT_WORDS,
    suffix = "",
    variant = "hero",
    testId = "dynamic-word",
}) {
    const reduced = useMemo(() => {
        if (typeof window === "undefined") return false;
        return !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    }, []);

    const longest = useMemo(
        () => words.reduce((a, b) => (b.length > a.length ? b : a), ""),
        [words]
    );

    const [wordIdx, setWordIdx] = useState(0);
    const [typed, setTyped] = useState(reduced ? words[0] : "");
    const phaseRef = useRef("typing");
    const timerRef = useRef(null);
    const [announced, setAnnounced] = useState(reduced ? words[0] : "");

    useEffect(() => {
        if (reduced) return;
        const target = words[wordIdx];

        const tick = () => {
            const phase = phaseRef.current;

            if (phase === "typing") {
                setTyped((curr) => {
                    if (curr.length < target.length) {
                        return target.slice(0, curr.length + 1);
                    }
                    phaseRef.current = "hold";
                    setAnnounced(target);
                    return curr;
                });
            } else if (phase === "hold") {
                phaseRef.current = "erasing";
            } else if (phase === "erasing") {
                setTyped((curr) => {
                    if (curr.length > 0) return curr.slice(0, curr.length - 1);
                    phaseRef.current = "next";
                    return curr;
                });
            } else if (phase === "next") {
                phaseRef.current = "typing";
                setWordIdx((i) => (i + 1) % words.length);
            }

            const next = phaseRef.current;
            const delay =
                next === "typing"  ? TYPE_SPEED  :
                next === "erasing" ? ERASE_SPEED :
                next === "hold"    ? HOLD_MS     :
                NEXT_DELAY;
            timerRef.current = setTimeout(tick, delay);
        };
        timerRef.current = setTimeout(tick, TYPE_SPEED);
        return () => clearTimeout(timerRef.current);
    }, [reduced, words, wordIdx]);

    const wordClass = variant === "hero" ? "silver-foil" : "";
    const cursorVariant = `dynamic-word__cursor--${variant}`;

    return (
        <span className={`dynamic-word dynamic-word--${variant}`} data-testid={testId}>
            {/* layout reservation — longest word + suffix so the line never jitters */}
            <span className="dynamic-word__ghost" aria-hidden="true">
                {longest}
                {suffix}
            </span>
            {/* live overlay — word + cursor + suffix flow together */}
            <span className="dynamic-word__live" aria-hidden={!reduced}>
                <span className={`dynamic-word__text ${wordClass}`}>
                    {reduced ? words[0] : typed}
                </span>
                {!reduced && (
                    <span className={`dynamic-word__cursor ${cursorVariant}`} aria-hidden="true">
                        |
                    </span>
                )}
                <span className="dynamic-word__suffix">{suffix}</span>
            </span>
            {/* a11y: polite announcement of the completed word */}
            <span className="sr-only" aria-live="polite">
                {announced}
                {suffix}
            </span>
        </span>
    );
}

export default DynamicWord;
