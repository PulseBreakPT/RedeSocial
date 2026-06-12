import { useAuth } from "../context/AuthContext";
import { PT } from "../theme/editorial";
import { WavyUnderline } from "./editorial/Masthead";

/**
 * Mobile-only personalized hero strip — Lusorae Editorial.
 * Apenas o saudar com sublinhado vermelho. Sem kickers ruidosos no topo.
 */
export function MobileHomeHero({ greeting, firstName }) {
    const { user } = useAuth();
    if (!user) return null;

    return (
        <div
            className="lg:hidden px-4 pt-4 pb-3 relative"
            data-testid="mobile-home-hero"
            style={{
                background: "rgba(247,245,239,0.94)",
                borderBottom: "1px solid rgba(10,10,10,0.10)",
            }}
        >
            <h1
                className="font-black tracking-[-0.03em] leading-[1.0]"
                style={{ fontSize: 28, color: PT.ink }}
            >
                {greeting}
                {firstName ? (
                    <>, <WavyUnderline color={PT.red}>{firstName}</WavyUnderline></>
                ) : ""}.
            </h1>
        </div>
    );
}
