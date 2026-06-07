import {
    PT, AuthStyles,
    DoodleStar, DoodleSparkles, DoodleScribble, DoodleSpiral,
    DoodleCross, GiantAsterisk,
} from "../pages/auth/AuthDecor";

/**
 * PtPageShell — wrapper para páginas pós-login com decoração fanzine PT.
 * Fornece:
 *   • Fundo PT.cream
 *   • 5 doodles dispersos no fundo (responsivos: escala reduzida em mobile)
 *   • GiantAsterisk faded no canto superior direito (desktop only)
 *   • Container relativo com z-10 para o conteúdo
 *
 * Props:
 *   • testid — opcional, propagado ao root
 *   • doodles — "all" (default) | "minimal" | "none"
 *   • children — conteúdo da página
 */
export function PtPageShell({ children, testid, doodles = "all", className = "" }) {
    return (
        <div
            data-testid={testid}
            className={`relative ${className}`}
            style={{ background: "#FFFFFF", minHeight: "100vh" }}
        >
            {doodles !== "none" && (
                <>
                    <div className="absolute -top-10 -right-10 pointer-events-none opacity-[0.05] z-0 hidden lg:block" aria-hidden>
                        <GiantAsterisk color={PT.red} size={280} rotate={-12} />
                    </div>
                    <div className="absolute top-32 -right-2 sm:right-4 pointer-events-none block opacity-50 scale-[0.55] sm:scale-100 sm:opacity-80 origin-top-right z-0 hidden md:block" aria-hidden>
                        <DoodleStar color={PT.gold} size={42} rotate={14} />
                    </div>
                    {doodles === "all" && (
                        <>
                            <div className="absolute top-[420px] -left-3 sm:left-2 pointer-events-none block opacity-50 scale-[0.55] sm:scale-100 sm:opacity-80 origin-left z-0 hidden lg:block" aria-hidden>
                                <DoodleScribble color={PT.azul} w={120} h={48} style={{ transform: "rotate(-6deg)" }} />
                            </div>
                            <div className="absolute top-[760px] -right-2 sm:right-3 pointer-events-none block opacity-50 scale-[0.55] sm:scale-100 sm:opacity-80 origin-right z-0 hidden lg:block" aria-hidden>
                                <DoodleSpiral color={PT.gold} size={56} rotate={12} />
                            </div>
                            <div className="absolute top-[1200px] -left-2 sm:left-4 pointer-events-none block opacity-50 scale-[0.55] sm:scale-100 sm:opacity-80 origin-left z-0 hidden lg:block" aria-hidden>
                                <DoodleSparkles color={PT.red} size={40} rotate={-8} />
                            </div>
                            <div className="absolute bottom-40 -right-2 sm:right-4 pointer-events-none block opacity-50 scale-[0.55] sm:scale-100 sm:opacity-80 origin-bottom-right z-0 hidden lg:block" aria-hidden>
                                <DoodleCross color={PT.green} size={28} rotate={18} />
                            </div>
                        </>
                    )}
                </>
            )}
            <div className="relative z-10">
                {children}
            </div>
            <AuthStyles />
        </div>
    );
}
