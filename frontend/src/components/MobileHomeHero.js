import { useAuth } from "../context/AuthContext";
import { PT, Sticker } from "../pages/auth/AuthDecor";

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
                background: "rgba(244,244,244,0.96)",
                borderBottom: `2.5px solid ${PT.ink}`,
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
                                border: `2px solid ${PT.ink}`,
                                boxShadow: `2px 2px 0 ${PT.ink}`,
                                transform: "rotate(-1.5deg)",
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
