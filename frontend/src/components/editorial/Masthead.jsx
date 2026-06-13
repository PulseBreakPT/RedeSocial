// =============================================================================
// LUSORAE EDITORIAL — Masthead (single source of truth for hero headers)
// Reutilizado em Feed, Explore, Messages, Premium, Profile, etc.
//
// Estrutura:
//   ┌───────────────────────────────────────────────────────────────┐
//   │ TOP INK STRIP — left kicker (gold dot · brand path)          │
//   │                  · right meta (Lisboa hora · Edição · custom) │
//   ├───────────────────────────────────────────────────────────────┤
//   │ HERO PAD — kicker mono (left) · big H1 · subtitle · right CTA │
//   └───────────────────────────────────────────────────────────────┘
//
// Mobile masthead: stripped — só kicker dot + H1 com sublinhado opcional.
// =============================================================================
import { PT } from "../../theme/editorial";

function nowHHMM() {
    return new Date().toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
}
function todayShort() {
    return new Date().toLocaleDateString("pt-PT", { day: "2-digit", month: "short" }).toUpperCase();
}
function todayLong() {
    return new Date().toLocaleDateString("pt-PT", { weekday: "long", day: "2-digit", month: "long" });
}

// ── Desktop top ink strip ────────────────────────────────────────────────────
// REMOVIDO a pedido do utilizador: o strip "LUSORAE · X / LISBOA · HH:MM /
// EDIÇÃO · DD/MM" deixa de ser renderizado. A função fica como no-op para
// preservar a assinatura caso algum consumer ainda a invoque diretamente.
function StripDesktop() {
    return null;
}

// ── Wavy red underline (assinatura editorial) ────────────────────────────────
export function WavyUnderline({ children, color = PT.red, height = "0.22em", className = "" }) {
    return (
        <span className={`relative inline-block ${className}`}>
            <span className="relative z-10" style={{ color }}>{children}</span>
            <svg
                aria-hidden
                className="absolute pointer-events-none"
                style={{ left: 0, right: 0, bottom: "-0.08em", width: "100%", height }}
                viewBox="0 0 200 12"
                preserveAspectRatio="none"
            >
                <path d="M2 7 Q 50 0, 100 6 T 198 5" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" />
            </svg>
        </span>
    );
}

// ── Soft highlight (yellow/blue/etc swipe behind text) ───────────────────────
export function SoftHighlight({ children, color = PT.gold, opacity = "88" }) {
    return (
        <span className="relative inline-block">
            <span
                aria-hidden
                className="absolute pointer-events-none"
                style={{
                    left: -3, right: -3, bottom: "0.06em", height: "0.42em",
                    background: `${color}${opacity}`, zIndex: 0, borderRadius: 3,
                }}
            />
            <span className="relative z-10">{children}</span>
        </span>
    );
}

// ── EditorialMasthead — desktop sticky + mobile compact ──────────────────────
export function EditorialMasthead({
    brandPath,           // ex: "LUSORAE · FEED · AO VIVO"
    meta = null,         // [{text, accent?}] · null = default Lisboa + Edição
    eyebrow,             // string — left kicker (desktop) ex: "sexta-feira, 12 de junho"
    eyebrowRight,        // { text, color } — right side of kicker
    title,               // ReactNode (use WavyUnderline / SoftHighlight inside)
    subtitle,            // ReactNode
    right,               // optional ReactNode (pill + button on the right)
    stripAccent = PT.gold,
    testid,
    mobileSubtitle,      // optional — by default the mobile shows only title
}) {
    return (
        <>
            {/* DESKTOP */}
            <div
                className="hidden lg:block sticky top-0 z-30 backdrop-blur relative"
                style={{
                    background: "rgba(255,255,255,0.92)",
                    borderBottom: "1px solid rgba(10,10,10,0.08)",
                }}
                data-testid={testid}
            >
                <StripDesktop brandPath={brandPath} meta={meta} accent={stripAccent} />

                <div className="px-7 pt-7 pb-5 relative z-10">
                    {(eyebrow || eyebrowRight) && (
                        <div className="flex items-center gap-2.5 mb-3.5 flex-wrap">
                            {eyebrow && (
                                <span className="font-mono text-[10px] font-bold uppercase" style={{ letterSpacing: "0.22em", color: "rgba(10,10,10,0.45)" }}>
                                    {eyebrow}
                                </span>
                            )}
                            {eyebrow && eyebrowRight && <span style={{ color: "rgba(10,10,10,0.18)" }}>—</span>}
                            {eyebrowRight && (
                                <span
                                    className="font-mono text-[10.5px] font-bold uppercase inline-flex items-center gap-1.5"
                                    style={{ letterSpacing: "0.16em", color: eyebrowRight.color || PT.red }}
                                >
                                    {eyebrowRight.icon && <eyebrowRight.icon size={11} strokeWidth={2.6} />}
                                    {eyebrowRight.text}
                                </span>
                            )}
                        </div>
                    )}

                    <div className="flex items-end justify-between gap-6">
                        <div className="min-w-0 flex-1">
                            <h1
                                className="font-black tracking-[-0.045em] leading-[0.94]"
                                style={{ fontSize: "clamp(40px, 5.2vw, 64px)", color: PT.ink }}
                            >
                                {title}
                            </h1>
                            {subtitle && (
                                <p className="text-[14.5px] sm:text-[15px] mt-3.5 font-medium max-w-[52ch]" style={{ color: "rgba(10,10,10,0.62)", lineHeight: 1.45 }}>
                                    {subtitle}
                                </p>
                            )}
                        </div>
                        {right && <div className="flex items-center gap-2 shrink-0 pb-1">{right}</div>}
                    </div>
                </div>
            </div>

            {/* MOBILE */}
            <div
                className="lg:hidden sticky z-30 backdrop-blur"
                style={{
                    top: "calc(var(--mobile-topbar-h) + var(--safe-top))",
                    background: "rgba(255,255,255,0.94)",
                    borderBottom: "1px solid rgba(10,10,10,0.08)",
                }}
            >
                <div className="px-4 pt-3 pb-3.5">
                    <h1
                        className="font-black tracking-[-0.03em] leading-[1.0]"
                        style={{ fontSize: "clamp(24px, 7vw, 30px)", color: PT.ink }}
                    >
                        {title}
                    </h1>
                    {mobileSubtitle && (
                        <p className="text-[13px] mt-2 font-medium" style={{ color: "rgba(10,10,10,0.62)", lineHeight: 1.5 }}>
                            {mobileSubtitle}
                        </p>
                    )}
                </div>
            </div>
        </>
    );
}

// ── Section heading (titles of mid-page sections) ────────────────────────────
export function EditorialSectionHead({ kicker, kickerColor = PT.azul, title, subtitle, className = "" }) {
    return (
        <div className={`max-w-2xl ${className}`}>
            {kicker && (
                <p className="font-mono font-black uppercase mb-3 inline-flex items-center gap-1.5" style={{ fontSize: 10.5, letterSpacing: "0.22em", color: kickerColor }}>
                    <span className="relative flex h-1.5 w-1.5" aria-hidden>
                        <span className="absolute inline-flex h-full w-full rounded-full lusorae-pulse" style={{ background: kickerColor }} />
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: kickerColor }} />
                    </span>
                    {kicker}
                </p>
            )}
            <h2
                className="font-black tracking-[-0.035em] leading-[0.98] mb-3"
                style={{ fontSize: "clamp(26px, 4.4vw, 44px)", color: PT.ink }}
            >
                {title}
            </h2>
            {subtitle && (
                <p className="text-[14px] sm:text-[15.5px] leading-relaxed max-w-xl font-medium" style={{ color: "rgba(10,10,10,0.6)" }}>
                    {subtitle}
                </p>
            )}
        </div>
    );
}

// ── Helpers consumed by callers ──────────────────────────────────────────────
EditorialMasthead.todayShort = todayShort;
EditorialMasthead.todayLong  = todayLong;
EditorialMasthead.nowHHMM    = nowHHMM;
