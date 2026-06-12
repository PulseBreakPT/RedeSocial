import { useAuth } from "../context/AuthContext";
import { PT } from "../theme/editorial";
import { Sticker } from "./editorial/Primitives";

/**
 * Mobile-only personalized hero strip — fanzine PT.
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
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                    <h1
                        className="font-black tracking-[-0.03em] leading-[1.0]"
                        style={{ fontSize: 22, color: PT.ink }}
                    >
                        {greeting}{firstName ? (
                            <>, <span style={{
                                display: "inline-block",
                                background: PT.gold,
                                padding: "0 0.10em",
                                border: "1px solid rgba(10,10,10,0.10)",
                                boxShadow: "0 1px 2px rgba(10,10,10,0.05), 0 8px 20px -10px rgba(10,10,10,0.15)",
                            }}>{firstName}</span></>
                        ) : ""}.
                    </h1>
                </div>
                <div className="shrink-0">
                    <Sticker bg={PT.green} color="#fff" rotate={-3} style={{ fontSize: 9, padding: "3px 7px" }}>
                        ✓ REAIS
                    </Sticker>
                </div>
            </div>
        </div>
    );
}
