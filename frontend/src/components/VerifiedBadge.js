import { BadgeCheck } from "lucide-react";

export function VerifiedBadge({ size = 14, className = "" }) {
    return (
        <span title="Verificado" className={`inline-flex items-center text-accent-vermillion ${className}`}>
            <BadgeCheck size={size} fill="currentColor" className="text-accent-vermillion" stroke="#0A0A0A" strokeWidth={2.2} />
        </span>
    );
}
