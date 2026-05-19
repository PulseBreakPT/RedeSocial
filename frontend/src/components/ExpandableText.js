import { useState, useMemo } from "react";
import { RichText } from "./RichText";

/**
 * Renders RichText with a "Ver mais" / "Mostrar menos" toggle when content is long.
 *  - Threshold: > 320 chars OR > 6 line breaks
 *  - Truncates at a safe word boundary near 280 chars
 *  - Inline expansion (no navigation)
 */
export function ExpandableText({ text, className = "", testid }) {
    const [expanded, setExpanded] = useState(false);

    const { needsClamp, short } = useMemo(() => {
        if (!text) return { needsClamp: false, short: "" };
        const lineCount = (text.match(/\n/g) || []).length;
        const tooLong = text.length > 320 || lineCount > 6;
        if (!tooLong) return { needsClamp: false, short: text };
        // Cut around 280 chars at a word/sentence boundary
        let cut = 280;
        const slice = text.slice(0, cut);
        // Prefer end-of-sentence boundary if found in [220..cut]
        const sentenceEnd = Math.max(slice.lastIndexOf(". "), slice.lastIndexOf("! "), slice.lastIndexOf("? "));
        if (sentenceEnd > 220) cut = sentenceEnd + 1;
        else {
            const ws = slice.lastIndexOf(" ");
            if (ws > 220) cut = ws;
        }
        return { needsClamp: true, short: text.slice(0, cut).trimEnd() + "…" };
    }, [text]);

    if (!text) return null;

    if (!needsClamp) {
        return <RichText text={text} className={className} />;
    }

    return (
        <div data-testid={testid}>
            <RichText text={expanded ? text : short} className={className} />
            <button
                onClick={(e) => { e.stopPropagation(); setExpanded((v) => !v); }}
                data-testid={`${testid || "expandable"}-toggle`}
                className="mt-1 text-[13px] font-mono text-black/55 hover:text-black underline-offset-2 hover:underline tracking-tight"
            >
                {expanded ? "Mostrar menos" : "Ver mais"}
            </button>
        </div>
    );
}
