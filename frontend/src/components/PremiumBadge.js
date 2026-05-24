import { Sparkles } from "lucide-react";

/**
 * PremiumBadge — marca discreta de Plus/Aura junto ao nome. Calma, monocromática
 * (Aura em coral subtil, Plus em cinza), sem glow/neon. Não renderiza nada para
 * contas gratuitas. O `plan` vem do public_user (resolvido server-side).
 */
export function PremiumBadge({ user, size = 13, className = "" }) {
    const plan = user?.plan;
    if (plan !== "plus" && plan !== "aura") return null;
    const aura = plan === "aura";
    return (
        <span
            title={aura ? "Lusorae Aura" : "Lusorae Plus"}
            aria-label={aura ? "Lusorae Aura" : "Lusorae Plus"}
            className={`inline-flex items-center flex-shrink-0 ${className}`}
            style={{ color: aura ? "var(--coral-500)" : "rgba(0,0,0,0.40)" }}
        >
            <Sparkles size={size} strokeWidth={2} fill={aura ? "currentColor" : "none"} />
        </span>
    );
}

export default PremiumBadge;
