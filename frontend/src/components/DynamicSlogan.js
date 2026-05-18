import { useEffect, useMemo, useRef, useState } from "react";

/**
 * DynamicSlogan — typewriter slogan that reinforces the brand on first
 * contact (Login / Register). Animates ONLY the dynamic word, keeps the
 * static prefix fixed, no layout shift, light & accessible.
 *
 *  Format: "<brand> — A tua cidade tem <palavra>."
 *
 *  Behaviour:
 *   1. Types the word, character by character
 *   2. Holds (1.6s)
 *   3. Erases the word, character by character
 *   4. Brief gap, moves to next word, repeats forever
 *
 *  Accessibility:
 *   · `prefers-reduced-motion` → no animation, shows the first word static
 *   · `aria-live="polite"` announces the full slogan when a word completes
 *   · Visual cursor / typing artefacts are `aria-hidden`
 *
 *  Layout stability:
 *   · Hidden "ghost" of the longest word reserves the inline space, so the
 *     rest of the line never shifts as letters are added or removed.
 */
const DEFAULT_WORDS = ["voz", "histórias", "conversa", "pulso", "vida", "alma"];
const DEFAULT_PREFIX = "Lusorae — A tua cidade tem ";
const TYPE_SPEED = 70;     // ms per char added
const ERASE_SPEED = 38;    // ms per char removed (slightly faster — feels natural)
const HOLD_MS = 1700;      // pause when word fully typed
const NEXT_DELAY = 280;    // pause between words

export function DynamicSlogan({
    words = DEFAULT_WORDS,
    prefix = DEFAULT_PREFIX,
    suffix = ".",
    className = "",
    testId = "dynamic-slogan",
}) {
    // Detect prefers-reduced-motion ONCE on mount — and respect it.
    const reduced = useMemo(() => {
        if (typeof window === "undefined") return false;
        return !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    }, []);

    // Longest word reserves layout width — also used as fallback for reduced motion.
    const longest = useMemo(
        () => words.reduce((a, b) => (b.length > a.length ? b : a), ""),
        [words]
    );

    const [wordIdx, setWordIdx] = useState(0);
    const [typed, setTyped] = useState(reduced ? words[0] : "");
    const phaseRef = useRef("typing"); // "typing" | "hold" | "erasing" | "next"
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
                    setAnnounced(target); // announce when fully typed
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

    return (
        <p
            className={`dynamic-slogan ${className}`}
            data-testid={testId}
        >
            <span className="dynamic-slogan__prefix">{prefix}</span>
            <span className="dynamic-slogan__dynamic">
                {/* layout reservation — longest word + suffix so the line never jitters */}
                <span className="dynamic-slogan__ghost" aria-hidden="true">
                    {longest}
                    {suffix}
                </span>
                {/* live overlay — word + cursor + suffix flow together */}
                <span className="dynamic-slogan__live" aria-hidden={!reduced}>
                    <span className="dynamic-slogan__word">
                        {reduced ? words[0] : typed}
                    </span>
                    {!reduced && (
                        <span className="dynamic-slogan__cursor" aria-hidden="true">
                            |
                        </span>
                    )}
                    <span className="dynamic-slogan__suffix">{suffix}</span>
                </span>
            </span>
            {/* a11y: polite announcement of the *completed* slogan */}
            <span className="sr-only" aria-live="polite">
                {prefix}
                {announced}
                {suffix}
            </span>
        </p>
    );
}

export default DynamicSlogan;
