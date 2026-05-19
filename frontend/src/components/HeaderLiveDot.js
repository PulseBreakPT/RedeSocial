import { useEffect, useState, useRef } from "react";

/**
 * Pulso minúsculo no header (junto ao logo) que aparece quando há
 * atividade nos últimos 30s. Desvanece quando para.
 *
 * É um "sinal de vida" — não conta nada, só comunica presença.
 */
export function HeaderLiveDot({ className = "" }) {
    const [alive, setAlive] = useState(false);
    const timeoutRef = useRef(null);

    useEffect(() => {
        const ping = () => {
            setAlive(true);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            // Keep alive for 30s after last event
            timeoutRef.current = setTimeout(() => setAlive(false), 30000);
        };
        window.addEventListener("vmln:activity", ping);
        window.addEventListener("vmln:new_comment", ping);
        window.addEventListener("vmln:new_message", ping);
        window.addEventListener("vmln:new_notification", ping);
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            window.removeEventListener("vmln:activity", ping);
            window.removeEventListener("vmln:new_comment", ping);
            window.removeEventListener("vmln:new_message", ping);
            window.removeEventListener("vmln:new_notification", ping);
        };
    }, []);

    if (!alive) return null;
    return (
        <span
            data-testid="header-live-dot"
            className={`inline-flex w-1.5 h-1.5 ${className}`}
            title="Pessoas ativas agora"
        >
            <span className="w-full h-full rounded-full bg-emerald-500/85 anim-live-dot" />
        </span>
    );
}
