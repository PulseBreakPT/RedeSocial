import { useAuth } from "../context/AuthContext";
import { PT } from "../theme/editorial";

/**
 * Mobile-only personalized hero strip — Lusorae Editorial.
 * Alinhado com o masthead desktop em Feed.js (kicker mono · sublinhado vermelho
 * no nome · sem stickers rodados · sem sombras offset).
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
            {/* Kicker editorial (mono uppercase com dot pulse) */}
            <div className="flex items-center gap-2 mb-2">
                <span className="relative flex h-1.5 w-1.5" aria-hidden>
                    <span className="absolute inline-flex h-full w-full rounded-full lusorae-pulse" style={{ background: PT.green }} />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: PT.green }} />
                </span>
                <span className="font-mono text-[10px] font-bold uppercase" style={{ letterSpacing: "0.22em", color: "rgba(10,10,10,0.55)" }}>
                    Edição · {new Date().toLocaleDateString("pt-PT", { weekday: "short", day: "2-digit", month: "short" }).toUpperCase()}
                </span>
            </div>

            {/* Greeting com underline editorial vermelho no nome */}
            <h1
                className="font-black tracking-[-0.03em] leading-[1.0]"
                style={{ fontSize: 26, color: PT.ink }}
            >
                {greeting}
                {firstName ? (
                    <>
                        ,{" "}
                        <span className="relative inline-block">
                            <span className="relative z-10" style={{ color: PT.red }}>{firstName}</span>
                            <svg
                                aria-hidden
                                className="absolute pointer-events-none"
                                style={{ left: 0, right: 0, bottom: "-0.10em", width: "100%", height: "0.22em" }}
                                viewBox="0 0 200 12"
                                preserveAspectRatio="none"
                            >
                                <path d="M2 7 Q 50 0, 100 6 T 198 5" fill="none" stroke={PT.red} strokeWidth="3" strokeLinecap="round" />
                            </svg>
                        </span>
                    </>
                ) : ""}.
            </h1>
        </div>
    );
}
