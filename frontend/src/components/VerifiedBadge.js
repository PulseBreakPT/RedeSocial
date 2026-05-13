import { BadgeCheck } from "lucide-react";

export function VerifiedBadge({ size = 14, className = "" }) {
    return (
        <span title="Verificado" className={`inline-flex items-center ${className}`}>
            <BadgeCheck
                size={size}
                fill="#6aa8e6"
                stroke="#ffffff"
                strokeWidth={2.2}
            />
        </span>
    );
}
