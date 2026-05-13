import { Link } from "react-router-dom";

// Parses #hashtags and @mentions into clickable links
export function RichText({ text, className = "" }) {
    if (!text) return null;
    const tokens = [];
    const regex = /(#[\wáéíóúâêîôûãõçÁÉÍÓÚÂÊÎÔÛÃÕÇ-]+)|(@[a-zA-Z0-9_]+)/g;
    let lastIndex = 0;
    let match;
    let key = 0;
    while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            tokens.push(<span key={key++}>{text.slice(lastIndex, match.index)}</span>);
        }
        const token = match[0];
        if (token.startsWith("#")) {
            tokens.push(
                <Link
                    key={key++}
                    to={`/tag/${token.slice(1).toLowerCase()}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-accent-vermillion hover:underline"
                >
                    {token}
                </Link>,
            );
        } else {
            tokens.push(
                <Link
                    key={key++}
                    to={`/u/${token.slice(1).toLowerCase()}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-accent-vermillion hover:underline"
                >
                    {token}
                </Link>,
            );
        }
        lastIndex = match.index + token.length;
    }
    if (lastIndex < text.length) {
        tokens.push(<span key={key++}>{text.slice(lastIndex)}</span>);
    }
    return <p className={`whitespace-pre-wrap break-words ${className}`}>{tokens}</p>;
}
