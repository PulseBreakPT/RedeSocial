import { Avatar } from "./Avatar";

/**
 * Mostra um indicador subtil "<user> está a escrever…" abaixo do post,
 * com suporte a múltiplas pessoas ("Tiago e mais 2 a escrever…").
 * Animação suave dos três pontos.
 */
export function CommentTypingIndicator({ typers, currentUserId, className = "" }) {
    const others = (typers || []).filter((t) => t.user?.id && t.user.id !== currentUserId);
    if (others.length === 0) return null;

    const first = others[0].user;
    let label;
    if (others.length === 1) {
        label = `${first.name || first.username} está a responder`;
    } else if (others.length === 2) {
        const second = others[1].user;
        label = `${first.name || first.username} e ${second.name || second.username} estão a responder`;
    } else if (others.length === 3) {
        label = "três pessoas a responder";
    } else {
        // Qualitative band (Manifesto: "sem números que viciam")
        label = "várias pessoas a responder";
    }

    return (
        <div
            data-testid="comment-typing-indicator"
            className={`flex items-center gap-2 px-3 py-1.5 anim-fade-up ${className}`}
            aria-live="polite"
        >
            <div className="flex -space-x-1.5">
                {others.slice(0, 3).map((t) => (
                    <Avatar key={t.user.id} user={t.user} size={16} className="ring-2 ring-white" />
                ))}
            </div>
            <span className="text-[11.5px] font-mono text-black/55">{label}</span>
            <span className="typing-dots inline-flex gap-0.5 ml-0.5" aria-hidden>
                <span /><span /><span />
            </span>
        </div>
    );
}
