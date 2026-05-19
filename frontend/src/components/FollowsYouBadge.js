/**
 * Badge subtil "Segue-te" — mostrado em perfis e em mini-popovers de utilizador.
 * Não confundir com o botão de "Seguir" do viewer. Este é informativo: "esta pessoa
 * já te segue". Light, mono, baixo contraste.
 */
export function FollowsYouBadge({ show, className = "" }) {
    if (!show) return null;
    return (
        <span
            data-testid="follows-you-badge"
            className={`inline-flex items-center px-2 py-0.5 rounded-full bg-black/[0.05] border border-black/[0.08] text-[10px] font-mono uppercase tracking-[0.12em] text-black/65 ${className}`}
            title="Esta pessoa segue-te"
        >
            Segue-te
        </span>
    );
}
