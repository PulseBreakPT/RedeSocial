import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { ArrowRight, ArrowUpRight, MapPin, Calendar, Users, Sparkles, Menu, X } from "lucide-react";
import SiteFooter from "../components/SiteFooter";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";

// =============================================================================
// LUSORAE — Landing pública SSS-tier · ONE-SCREEN
// Inspiração: refs premium (Linear, Threads, Substack) × paleta PT × tipografia massiva
// =============================================================================

const PT = {
    ink:    "#0A0A0A",
    paper:  "#F7F5EF",
    cream:  "#FBFAF6",
    red:    "#C8102E",
    gold:   "#FFCC29",
    green:  "#046A38",
    azul:   "#003F87",
};

// Imagens de Portugal — feed + cards
const IMG_PHONE_FEED   = "https://images.unsplash.com/photo-1608649944716-228404a0a8bb?auto=format&fit=crop&w=900&q=80";  // Algarve sunset
const IMG_EVENT_1      = "https://images.unsplash.com/photo-1693944844665-ce10f83a775b?auto=format&fit=crop&w=600&q=80"; // Porto aerial
const IMG_EVENT_2      = "https://images.pexels.com/photos/34440892/pexels-photo-34440892.jpeg?auto=compress&w=600";    // Lisbon golden
const IMG_COMM_1       = "https://images.unsplash.com/photo-1555881400-89d5a9c86668?auto=format&fit=crop&w=600&q=80";   // Porto boats
const IMG_COMM_2       = "https://images.unsplash.com/photo-1605641532626-5ab1dab56350?auto=format&fit=crop&w=600&q=80";// Lisbon
const IMG_COMM_3       = "https://images.unsplash.com/photo-1660583494731-57fa5d954377?auto=format&fit=crop&w=600&q=80";// Porto street

// City strip
const CITY_LISBOA  = "https://images.pexels.com/photos/34440892/pexels-photo-34440892.jpeg?auto=compress&w=900";
const CITY_PORTO   = "https://images.unsplash.com/photo-1693944844665-ce10f83a775b?auto=format&fit=crop&w=900&q=80";
const CITY_ALGARVE = "https://images.unsplash.com/photo-1608649944716-228404a0a8bb?auto=format&fit=crop&w=900&q=80";
const CITY_OUTRA   = "https://images.unsplash.com/photo-1580836618629-7fc7ff649765?auto=format&fit=crop&w=900&q=80";

// =============================================================================
// STAMP SEAL — circular "Made in Portugal" badge (premium detail)
// =============================================================================
function StampSeal({ size = 110, color = PT.ink, rotate = -8, label = "MADE IN PORTUGAL", year = "2026", motto = "VIVE · PARTILHA · LUSORAE" }) {
    const id = `circle-${label.replace(/\s+/g, "")}`;
    const r = size / 2 - 14;
    return (
        <div
            className="relative pointer-events-none select-none"
            style={{ width: size, height: size, transform: `rotate(${rotate}deg)` }}
            aria-hidden
        >
            <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} style={{ display: "block" }}>
                <defs>
                    <path id={id} d={`M ${size / 2},${size / 2} m -${r},0 a ${r},${r} 0 1,1 ${r * 2},0 a ${r},${r} 0 1,1 -${r * 2},0`} />
                </defs>
                <circle cx={size / 2} cy={size / 2} r={size / 2 - 4} fill="none" stroke={color} strokeWidth={1.5} />
                <circle cx={size / 2} cy={size / 2} r={size / 2 - 10} fill="none" stroke={color} strokeWidth={1} />
                <text fontSize={size * 0.105} fontWeight={800} fill={color} letterSpacing={size * 0.018} style={{ fontFamily: '"Inter", system-ui' }}>
                    <textPath href={`#${id}`} startOffset="0">{`★ ${label} ★ ${motto} `}</textPath>
                </text>
            </svg>
            <div
                className="absolute inset-0 flex flex-col items-center justify-center"
                style={{ transform: "rotate(0deg)" }}
            >
                <span style={{ color, fontSize: size * 0.20, fontWeight: 900, lineHeight: 1, letterSpacing: "-0.02em" }}>✱</span>
                <span style={{ color, fontSize: size * 0.085, fontWeight: 700, marginTop: size * 0.025, letterSpacing: "0.12em" }}>EST. {year}</span>
            </div>
        </div>
    );
}

// =============================================================================
// CITY TICKER MARQUEE — slim premium band of Portuguese cities
// =============================================================================
const CITY_MARQUEE = [
    "Lisboa", "Porto", "Coimbra", "Braga", "Faro", "Aveiro",
    "Funchal", "Ponta Delgada", "Évora", "Guimarães", "Setúbal",
    "Viseu", "Leiria", "Viana do Castelo", "Cascais", "Sintra",
];

function CityTicker() {
    const items = [...CITY_MARQUEE, ...CITY_MARQUEE]; // duplicate for seamless loop
    return (
        <div
            className="relative overflow-hidden border-y"
            style={{
                background: PT.ink,
                color: "#fff",
                borderColor: "rgba(255,255,255,0.06)",
            }}
            data-testid="city-ticker"
            aria-hidden
        >
            <div className="lusorae-marquee-wrap py-4 sm:py-5">
                <div className="lusorae-marquee">
                    {items.map((city, i) => (
                        <span key={i} className="inline-flex items-center gap-5 mx-5 whitespace-nowrap">
                            <span
                                style={{
                                    fontFamily: '"Inter", system-ui',
                                    fontSize: "clamp(20px, 2.6vw, 32px)",
                                    fontWeight: 900,
                                    letterSpacing: "-0.025em",
                                    color: "#fff",
                                }}
                            >
                                {city}
                            </span>
                            <span style={{
                                width: 8, height: 8, borderRadius: "50%",
                                background: [PT.red, PT.gold, PT.green, PT.azul][i % 4],
                                display: "inline-block",
                            }} />
                        </span>
                    ))}
                </div>
            </div>
        </div>
    );
}

// =============================================================================
// HAND-DRAWN UNDERLINE (SVG) — coloured ink strokes under words
// =============================================================================
function UnderlineStroke({ color, w = 220, h = 18, variant = "wave", style = {} }) {
    const paths = {
        wave:   "M 6 14 C 40 4, 90 22, 130 10 S 200 6, 218 14",
        slash:  "M 8 16 C 60 6, 130 4, 218 12",
        thick:  "M 6 12 C 55 16, 130 6, 220 12",
        dash:   "M 6 12 Q 60 4 120 12 T 220 12",
    };
    return (
        <svg
            viewBox={`0 0 ${w} ${h}`}
            width={w}
            height={h}
            style={{ display: "block", overflow: "visible", ...style }}
            aria-hidden
        >
            <path
                d={paths[variant] || paths.wave}
                stroke={color}
                strokeWidth={variant === "thick" ? 7 : 5.5}
                strokeLinecap="round"
                fill="none"
                style={{ filter: "url(#roughInk)" }}
            />
        </svg>
    );
}

// Hand-drawn squiggle decorative element
function HandSquiggle({ color, w = 90, h = 70, style = {}, variant = "loop" }) {
    const paths = {
        loop:   "M 10 35 C 10 10, 50 10, 50 35 S 80 60, 80 35",
        arrow:  "M 6 50 C 30 20, 60 40, 86 18 M 76 8 L 86 18 L 76 28",
        star:   "M 40 5 L 47 30 L 75 30 L 53 45 L 61 70 L 40 55 L 19 70 L 27 45 L 5 30 L 33 30 Z",
        check:  "M 8 35 L 30 55 L 80 8",
    };
    return (
        <svg viewBox={`0 0 ${w} ${h}`} width={w} height={h} style={{ display: "block", ...style }} aria-hidden>
            <path
                d={paths[variant]}
                stroke={color}
                strokeWidth={4.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill={variant === "star" ? color : "none"}
            />
        </svg>
    );
}

// =============================================================================
// TRUST STRIP — anti-features: "what we don't do" diferenciação imediata
// =============================================================================
function TrustStrip() {
    const items = [
        { label: "Sem ads", sub: "zero publicidade", color: PT.red },
        { label: "Sem algoritmo de vaidade", sub: "nada de doomscroll", color: PT.azul },
        { label: "Sem trolls", sub: "moderação humana", color: PT.green },
        { label: "Sem ego", sub: "pessoas, não perfis", color: PT.gold },
    ];
    return (
        <section
            data-testid="trust-strip"
            className="px-5 sm:px-8 lg:px-12 py-7 sm:py-9 lg:py-10"
            style={{ background: PT.paper, borderTop: `1px solid rgba(10,10,10,0.08)`, borderBottom: `1px solid rgba(10,10,10,0.08)` }}
        >
            <div className="max-w-[1400px] mx-auto grid grid-cols-2 lg:grid-cols-4 gap-x-6 gap-y-6 sm:gap-x-8 lg:gap-x-12">
                {items.map((it, i) => (
                    <div key={i} className="flex items-start gap-3" data-testid={`trust-${i}`}>
                        <span
                            className="inline-flex items-center justify-center shrink-0 mt-0.5"
                            style={{
                                width: 24, height: 24, borderRadius: "50%",
                                background: it.color, color: it.color === PT.gold ? PT.ink : "#fff",
                                fontWeight: 900, fontSize: 14, lineHeight: 1,
                            }}
                            aria-hidden
                        >
                            ✕
                        </span>
                        <div className="min-w-0">
                            <p className="font-black text-[15px] sm:text-[17px] leading-tight" style={{ color: PT.ink, letterSpacing: "-0.015em" }}>
                                {it.label}
                            </p>
                            <p className="text-[12px] sm:text-[13px] font-medium mt-1" style={{ color: "rgba(10,10,10,0.55)" }}>
                                {it.sub}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}

// =============================================================================
// MOBILE STICKY CTA — floating thumb-zone CTA pill
// =============================================================================
function MobileStickyCta() {
    const [show, setShow] = useState(false);
    useEffect(() => {
        const onScroll = () => setShow(window.scrollY > 320);
        window.addEventListener("scroll", onScroll, { passive: true });
        onScroll();
        return () => window.removeEventListener("scroll", onScroll);
    }, []);
    return (
        <div
            className="lg:hidden fixed left-3 right-3 z-40 pointer-events-none"
            style={{
                bottom: 14,
                transform: show ? "translateY(0)" : "translateY(120%)",
                opacity: show ? 1 : 0,
                transition: "transform 0.4s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.3s",
            }}
            data-testid="mobile-sticky-cta"
        >
            <div
                className="pointer-events-auto flex items-center gap-3 px-3 py-2.5"
                style={{
                    background: "rgba(255,255,255,0.96)",
                    backdropFilter: "blur(16px) saturate(140%)",
                    WebkitBackdropFilter: "blur(16px) saturate(140%)",
                    borderRadius: 999,
                    boxShadow: "0 18px 40px -12px rgba(10,10,10,0.32), 0 4px 10px rgba(10,10,10,0.08)",
                    border: "1px solid rgba(10,10,10,0.08)",
                }}
            >
                <div className="flex -space-x-2 shrink-0 pl-1">
                    {[PT.red, PT.azul, PT.green].map((c, i) => (
                        <span
                            key={i}
                            className="rounded-full"
                            style={{
                                width: 26, height: 26, background: c,
                                border: "2.5px solid #fff",
                            }}
                        />
                    ))}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-bold leading-tight truncate" style={{ color: PT.ink }}>
                        Junta-te à BETA
                    </p>
                    <p className="text-[10.5px] font-medium leading-tight" style={{ color: "rgba(10,10,10,0.55)" }}>
                        30 segundos · grátis
                    </p>
                </div>
                <Link
                    to="/register"
                    data-testid="mobile-sticky-register"
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full text-[12.5px] font-bold shrink-0"
                    style={{
                        background: `linear-gradient(180deg, #1f1f1f 0%, ${PT.ink} 100%)`,
                        color: "#fff",
                        boxShadow: `inset 0 1px 0 rgba(255,255,255,0.12)`,
                    }}
                >
                    Criar conta <ArrowRight size={13} />
                </Link>
            </div>
        </div>
    );
}

// =============================================================================
// TOP NAV — slim, premium
// =============================================================================
function TopNav() {
    const [scrolled, setScrolled] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    useEffect(() => {
        const onScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    const navItems = [
        { label: "Manifesto", to: "/manifesto" },
        { label: "Diretrizes", to: "/legal/community" },
        { label: "Privacidade", to: "/legal/privacy" },
        { label: "Legal", to: "/legal" },
    ];

    return (
        <header
            data-testid="top-nav"
            style={{
                position: "sticky",
                top: 0,
                zIndex: 50,
                background: scrolled ? "rgba(247,245,239,0.85)" : "transparent",
                backdropFilter: scrolled ? "blur(16px) saturate(140%)" : "none",
                WebkitBackdropFilter: scrolled ? "blur(16px) saturate(140%)" : "none",
                borderBottom: scrolled ? `1px solid rgba(10,10,10,0.08)` : "1px solid transparent",
                transition: "all 0.3s",
            }}
        >
            <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-12 flex items-center justify-between h-[68px] lg:h-[76px]">
                <Link to="/" data-testid="brand-logo" className="flex items-center gap-1.5" aria-label="Lusorae homepage">
                    <Wordmark size={28} />
                </Link>

                <nav className="hidden lg:flex items-center gap-9">
                    {navItems.map((it) => (
                        <Link
                            key={it.to}
                            to={it.to}
                            data-testid={`nav-${it.label.toLowerCase()}`}
                            className="text-[14px] font-semibold transition-opacity hover:opacity-60"
                            style={{ color: PT.ink, letterSpacing: "-0.005em" }}
                        >
                            {it.label}
                        </Link>
                    ))}
                </nav>

                <div className="hidden lg:flex items-center gap-3">
                    <Link
                        to="/login"
                        data-testid="nav-login"
                        className="text-[14px] font-semibold transition-opacity hover:opacity-60"
                        style={{ color: PT.ink }}
                    >
                        Entrar
                    </Link>
                    <Link
                        to="/register"
                        data-testid="nav-register"
                        className="inline-flex items-center gap-1.5 text-[13.5px] font-bold px-5 py-2.5 rounded-full transition-all hover:scale-[1.03]"
                        style={{ background: PT.ink, color: "#fff", boxShadow: `0 4px 16px -4px rgba(10,10,10,0.35)` }}
                    >
                        Criar conta <ArrowRight size={15} />
                    </Link>
                </div>

                {/* Mobile button */}
                <button
                    type="button"
                    onClick={() => setMobileOpen((s) => !s)}
                    className="lg:hidden inline-flex items-center justify-center rounded-full"
                    style={{ width: 42, height: 42, background: PT.ink, color: "#fff" }}
                    data-testid="mobile-menu-toggle"
                    aria-label="Menu"
                >
                    {mobileOpen ? <X size={20} /> : <Menu size={20} />}
                </button>
            </div>

            {/* Mobile drawer */}
            {mobileOpen && (
                <div
                    className="lg:hidden border-t"
                    style={{ borderColor: "rgba(10,10,10,0.08)", background: PT.paper }}
                    data-testid="mobile-menu"
                >
                    <nav className="px-5 py-4 flex flex-col gap-1">
                        {navItems.map((it) => (
                            <Link
                                key={it.to}
                                to={it.to}
                                onClick={() => setMobileOpen(false)}
                                className="block py-2.5 text-[15.5px] font-semibold"
                                style={{ color: PT.ink }}
                            >
                                {it.label}
                            </Link>
                        ))}
                        <div className="pt-3 mt-2 grid grid-cols-2 gap-2.5" style={{ borderTop: "1px solid rgba(10,10,10,0.08)" }}>
                            <Link
                                to="/login"
                                onClick={() => setMobileOpen(false)}
                                className="text-center py-3 text-[14px] font-bold rounded-full"
                                style={{ border: `1.5px solid ${PT.ink}`, color: PT.ink }}
                            >
                                Entrar
                            </Link>
                            <Link
                                to="/register"
                                onClick={() => setMobileOpen(false)}
                                className="text-center py-3 text-[14px] font-bold rounded-full"
                                style={{ background: PT.ink, color: "#fff" }}
                            >
                                Criar conta
                            </Link>
                        </div>
                    </nav>
                </div>
            )}
        </header>
    );
}

// =============================================================================
// WORDMARK — custom "LUSORAE" letterforms, bold premium feel
// =============================================================================
function Wordmark({ size = 32, color = PT.ink, dot = PT.red }) {
    return (
        <div
            className="font-black select-none"
            style={{
                fontFamily: '"Inter", system-ui, sans-serif',
                fontWeight: 900,
                fontSize: size,
                color,
                lineHeight: 1,
                letterSpacing: "-0.04em",
                fontStretch: "condensed",
                display: "inline-flex",
                alignItems: "baseline",
                position: "relative",
            }}
        >
            <span style={{ display: "inline-block", transform: "scaleY(1.05)", transformOrigin: "bottom" }}>
                LUSORAE
            </span>
            <span
                aria-hidden
                style={{
                    width: size * 0.13,
                    height: size * 0.13,
                    background: dot,
                    borderRadius: "50%",
                    marginLeft: size * 0.06,
                    alignSelf: "flex-end",
                    marginBottom: size * 0.02,
                }}
            />
        </div>
    );
}

// =============================================================================
// HERO — the one-screen moment
// =============================================================================
function Hero({ stats }) {
    const total = stats?.total_users ?? 0;
    const showCount = total > 0;
    const avatars = (stats?.avatars || []).slice(0, 5);
    const fallbackAvatars = [
        { name: "Sara", bg: PT.red },
        { name: "Tiago", bg: PT.azul },
        { name: "Inês", bg: PT.green },
        { name: "Miguel", bg: PT.gold },
        { name: "Joana", bg: PT.ink },
    ];
    const avatarList = avatars.length > 0 ? avatars : fallbackAvatars;

    return (
        <section
            data-testid="hero"
            className="relative overflow-hidden lusorae-grain"
            style={{ background: PT.paper, minHeight: "calc(100vh - 76px)" }}
        >
            {/* SVG filter for ink texture */}
            <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden>
                <filter id="roughInk">
                    <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="3" />
                    <feDisplacementMap in="SourceGraphic" scale="1.4" />
                </filter>
            </svg>

            <div className="max-w-[1400px] mx-auto px-5 sm:px-8 lg:px-12 py-8 sm:py-10 lg:py-14 grid lg:grid-cols-[1.05fr_1fr] gap-8 lg:gap-10 items-center relative">

                {/* ============ LEFT: TYPE + CTAs ============ */}
                <div className="relative z-10">
                    {/* Section number tag — premium kicker w/ live pulse */}
                    <div className="flex items-center gap-3 mb-6 sm:mb-8 lusorae-reveal-up">
                        <span className="relative flex h-2 w-2" aria-hidden>
                            <span className="absolute inline-flex h-full w-full rounded-full lusorae-pulse" style={{ background: PT.green }} />
                            <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: PT.green }} />
                        </span>
                        <span
                            className="font-mono text-[11px] sm:text-[11.5px] font-bold uppercase"
                            style={{ letterSpacing: "0.20em", color: "rgba(10,10,10,0.62)" }}
                        >
                            BETA · A REDE SOCIAL PORTUGUESA
                        </span>
                        <span className="hidden sm:inline-block" style={{ width: 24, height: 1, background: "rgba(10,10,10,0.2)" }} />
                        <span className="hidden sm:inline-block font-mono text-[11px] font-bold uppercase" style={{ letterSpacing: "0.16em", color: "rgba(10,10,10,0.40)" }}>
                            EST. 2026 · LISBOA
                        </span>
                    </div>

                    {/* MASSIVE HEADLINE — 4 linhas, com itálico cinematográfico em "TUA" */}
                    <h1
                        className="font-black tracking-[-0.045em] leading-[0.86] lg:whitespace-nowrap lusorae-reveal-up"
                        style={{
                            fontSize: "clamp(48px, 8.8vw, 132px)",
                            color: PT.ink,
                            fontFamily: '"Inter", system-ui, sans-serif',
                            fontWeight: 900,
                            animationDelay: "0.05s",
                        }}
                    >
                        {/* Line 1: A TUA (red under TUA, itálico para rhythm cinematográfico) */}
                        <span className="block relative" style={{ paddingBottom: "0.04em" }}>
                            A{" "}
                            <span className="relative inline-block" style={{ fontStyle: "italic", letterSpacing: "-0.05em" }}>
                                TUA
                                <span
                                    className="absolute pointer-events-none"
                                    style={{ left: "-4%", right: "-4%", bottom: "-0.10em", height: 20 }}
                                >
                                    <UnderlineStroke color={PT.red} w={260} h={20} variant="thick" style={{ width: "100%", height: "100%" }} />
                                </span>
                            </span>
                        </span>
                        {/* Line 2: CIDADE. (blue under CIDADE) */}
                        <span className="block relative" style={{ paddingBottom: "0.04em" }}>
                            <span className="relative inline-block">
                                CIDADE
                                <span
                                    className="absolute pointer-events-none"
                                    style={{ left: "-2.5%", right: "-2.5%", bottom: "-0.09em", height: 22 }}
                                >
                                    <UnderlineStroke color={PT.azul} w={420} h={22} variant="wave" style={{ width: "100%", height: "100%" }} />
                                </span>
                            </span>
                            <span style={{ color: PT.red }}>.</span>
                        </span>
                        {/* Line 3: A TUA (itálico mais uma vez — rhythm) */}
                        <span className="block relative" style={{ paddingBottom: "0.04em" }}>
                            A{" "}
                            <span style={{ fontStyle: "italic", letterSpacing: "-0.05em" }}>TUA</span>
                        </span>
                        {/* Line 4: REDE. (green under REDE — wave para não cruzar letras) */}
                        <span className="block relative">
                            <span className="relative inline-block">
                                REDE
                                <span
                                    className="absolute pointer-events-none"
                                    style={{ left: "-3%", right: "-3%", bottom: "-0.16em", height: 22 }}
                                >
                                    <UnderlineStroke color={PT.green} w={320} h={22} variant="thick" style={{ width: "100%", height: "100%" }} />
                                </span>
                            </span>
                            <span style={{ color: PT.red }}>.</span>
                        </span>
                    </h1>

                    {/* Subhead — keywords com highlight underlines coloridos */}
                    <p
                        className="mt-7 sm:mt-9 text-[15.5px] sm:text-[17px] lg:text-[18px] font-medium leading-relaxed max-w-[540px] lusorae-reveal-up"
                        style={{ color: "rgba(10,10,10,0.72)", animationDelay: "0.15s" }}
                    >
                        Aproxima-te de{" "}
                        <span className="relative inline-block font-bold" style={{ color: PT.ink }}>
                            pessoas reais
                            <span
                                className="absolute pointer-events-none"
                                style={{ left: 0, right: 0, bottom: -2, height: 8, background: `${PT.red}33`, zIndex: -1, borderRadius: 2 }}
                            />
                        </span>
                        , descobre{" "}
                        <span className="relative inline-block font-bold" style={{ color: PT.ink }}>
                            eventos perto de ti
                            <span
                                className="absolute pointer-events-none"
                                style={{ left: 0, right: 0, bottom: -2, height: 8, background: `${PT.azul}33`, zIndex: -1, borderRadius: 2 }}
                            />
                        </span>
                        {" "}e faz parte de{" "}
                        <span className="relative inline-block font-bold" style={{ color: PT.ink }}>
                            comunidades que importam
                            <span
                                className="absolute pointer-events-none"
                                style={{ left: 0, right: 0, bottom: -2, height: 8, background: `${PT.green}33`, zIndex: -1, borderRadius: 2 }}
                            />
                        </span>
                        . De Braga a Faro, do Funchal aos Açores.
                    </p>

                    {/* CTAs — black pill com gradient + magnetic arrow */}
                    <div className="mt-7 sm:mt-9 flex flex-wrap items-center gap-4 sm:gap-5 lusorae-reveal-up" style={{ animationDelay: "0.22s" }}>
                        <Link
                            to="/register"
                            data-testid="hero-cta-register"
                            className="group inline-flex items-center gap-2 px-7 py-4 sm:px-8 sm:py-[18px] rounded-full text-[14.5px] sm:text-[15.5px] font-bold transition-all hover:scale-[1.04] hover:-translate-y-0.5"
                            style={{
                                background: `linear-gradient(180deg, #1f1f1f 0%, ${PT.ink} 100%)`,
                                color: "#fff",
                                boxShadow: `0 12px 32px -10px rgba(10,10,10,0.55), 0 2px 6px rgba(10,10,10,0.18), inset 0 1px 0 rgba(255,255,255,0.12)`,
                                border: "1px solid rgba(255,255,255,0.06)",
                            }}
                        >
                            Criar conta{" "}
                            <ArrowRight
                                size={17}
                                className="transition-transform duration-300 group-hover:translate-x-1"
                            />
                        </Link>
                        <Link
                            to="/login"
                            data-testid="hero-cta-explore"
                            className="group inline-flex items-center gap-1.5 text-[14.5px] sm:text-[15.5px] font-bold py-2 transition-all"
                            style={{ color: PT.ink, borderBottom: `2px solid ${PT.ink}`, paddingBottom: 4 }}
                        >
                            Explorar agora{" "}
                            <ArrowUpRight
                                size={17}
                                className="transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1"
                            />
                        </Link>
                    </div>

                    {/* Social proof — beta honest framing */}
                    <div className="mt-8 sm:mt-10 flex items-center gap-4 lusorae-reveal-up" style={{ animationDelay: "0.30s" }}>
                        <div className="flex -space-x-2.5" data-testid="hero-avatars">
                            {avatarList.slice(0, 5).map((a, i) => (
                                a.avatar_url ? (
                                    <img
                                        key={a.id || i}
                                        src={a.avatar_url}
                                        alt=""
                                        className="rounded-full object-cover"
                                        style={{
                                            width: 42, height: 42,
                                            border: `3px solid ${PT.paper}`,
                                            boxShadow: `0 3px 10px rgba(10,10,10,0.15)`,
                                        }}
                                        loading="lazy"
                                    />
                                ) : (
                                    <div
                                        key={i}
                                        className="rounded-full flex items-center justify-center font-bold text-[14px]"
                                        style={{
                                            width: 42, height: 42,
                                            background: a.bg || PT.azul,
                                            color: a.bg === PT.gold ? PT.ink : "#fff",
                                            border: `3px solid ${PT.paper}`,
                                            boxShadow: `0 3px 10px rgba(10,10,10,0.15)`,
                                        }}
                                    >
                                        {(a.name || "?").charAt(0)}
                                    </div>
                                )
                            ))}
                            <span
                                className="rounded-full flex items-center justify-center font-bold text-[11px]"
                                style={{
                                    width: 42, height: 42,
                                    background: "#fff",
                                    color: PT.ink,
                                    border: `3px solid ${PT.paper}`,
                                    boxShadow: `0 3px 10px rgba(10,10,10,0.12)`,
                                }}
                            >
                                +
                            </span>
                        </div>
                        <div className="border-l pl-4" style={{ borderColor: "rgba(10,10,10,0.12)" }}>
                            <p className="text-[14.5px] font-bold leading-tight" style={{ color: PT.ink, letterSpacing: "-0.005em" }}>
                                {showCount && total >= 50
                                    ? <>+{total.toLocaleString("pt-PT")} <span style={{ color: "rgba(10,10,10,0.55)", fontWeight: 600 }}>portugueses</span></>
                                    : <>Primeiros membros</>}
                            </p>
                            <p className="text-[12px] font-medium mt-0.5" style={{ color: "rgba(10,10,10,0.55)" }}>
                                {showCount && total >= 50 ? "já se juntaram à beta" : "a construir o Lusorae · entra agora"}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Floating MADE IN PORTUGAL stamp — desktop top-right entre colunas */}
                <div
                    className="absolute hidden lg:block z-30 pointer-events-none lusorae-float-soft"
                    style={{ top: 18, right: "44%", "--rot": "-10deg" }}
                >
                    <div className="lusorae-spin-slow" style={{ opacity: 0.85 }}>
                        <StampSeal size={118} color={PT.ink} rotate={0} />
                    </div>
                </div>

                {/* Mobile-only stamp seal — top-right corner discrete */}
                <div className="lg:hidden absolute z-30 pointer-events-none" style={{ top: 12, right: 18 }}>
                    <div className="lusorae-spin-slow" style={{ opacity: 0.75 }}>
                        <StampSeal size={72} color={PT.ink} rotate={-8} />
                    </div>
                </div>

                {/* ============ RIGHT: PHONE + CARDS ============ */}
                <div className="relative flex justify-center items-center lg:justify-center min-h-[440px] sm:min-h-[560px] lg:min-h-[680px] mt-4 lg:mt-0" data-testid="hero-visual">
                    {/* Background colour blocks (PT flag energy) */}
                    <ColourBlocks />

                    {/* Event cards stack — back layer (interactive, hover lift) */}
                    <div className="hidden sm:block absolute z-10" style={{ right: "-2%", top: "5%" }}>
                        <EventStack />
                    </div>

                    {/* Community cards stack — back layer (interactive, hover lift) */}
                    <div className="hidden sm:block absolute z-10" style={{ right: "-4%", bottom: "5%" }}>
                        <CommunityStack />
                    </div>

                    {/* Floating reaction bubble — premium detail (md+) */}
                    <div
                        className="hidden md:flex absolute z-30 items-center gap-1.5 lusorae-float-soft"
                        style={{
                            left: "8%", bottom: "26%",
                            background: "#fff",
                            border: `1.5px solid rgba(10,10,10,0.08)`,
                            borderRadius: 999,
                            padding: "9px 14px 9px 11px",
                            boxShadow: "0 12px 24px -8px rgba(10,10,10,0.25)",
                            "--rot": "-6deg",
                            animationDelay: "0.4s",
                        }}
                        aria-hidden
                    >
                        <span style={{ color: PT.red, fontSize: 18 }}>♥</span>
                        <span className="text-[12.5px] font-bold" style={{ color: PT.ink }}>+12 reações</span>
                    </div>

                    {/* Mobile-only floating reaction (smaller) */}
                    <div
                        className="md:hidden absolute z-30 flex items-center gap-1 lusorae-float-soft"
                        style={{
                            left: "4%", top: "6%",
                            background: "#fff",
                            border: `1.5px solid rgba(10,10,10,0.08)`,
                            borderRadius: 999,
                            padding: "6px 10px 6px 8px",
                            boxShadow: "0 10px 20px -8px rgba(10,10,10,0.22)",
                            "--rot": "-6deg",
                        }}
                        aria-hidden
                    >
                        <span style={{ color: PT.red, fontSize: 14 }}>♥</span>
                        <span className="text-[10.5px] font-bold" style={{ color: PT.ink }}>+12</span>
                    </div>

                    {/* Phone mockup — front (responsive) */}
                    <div className="relative z-20" style={{ transform: "translateX(-2%)" }}>
                        <PhoneMockup />
                    </div>

                    {/* Hand-drawn sparkles around phone */}
                    <div className="absolute pointer-events-none hidden lg:block lusorae-float-soft" style={{ left: "8%", top: "8%", "--rot": "12deg" }}>
                        <HandSquiggle color={PT.green} variant="star" w={42} h={42} style={{ transform: "rotate(12deg)" }} />
                    </div>
                    <div className="absolute pointer-events-none hidden lg:block" style={{ right: "32%", bottom: "0%" }}>
                        <HandSquiggle color={PT.green} variant="arrow" w={90} h={70} style={{ transform: "rotate(20deg)" }} />
                    </div>
                </div>
            </div>
        </section>
    );
}

// Coloured geometric blocks behind phone (PT flag energy — peek out as in ref print)
function ColourBlocks() {
    const baseShadow = "0 30px 60px -20px rgba(10,10,10,0.32), 0 6px 14px -4px rgba(10,10,10,0.10)";
    return (
        <>
            {/* Red — top right behind phone */}
            <div className="absolute hidden md:block pointer-events-none lusorae-float" style={{
                right: "10%", top: "0%", width: "min(28%, 240px)", aspectRatio: "1/1",
                background: `linear-gradient(135deg, #E11A38 0%, ${PT.red} 100%)`,
                borderRadius: 28,
                "--rot": "10deg",
                boxShadow: baseShadow,
            }} />
            {/* Blue — middle/back of phone */}
            <div className="absolute hidden md:block pointer-events-none lusorae-float-soft" style={{
                left: "8%", top: "22%", width: "min(20%, 150px)", aspectRatio: "1/1",
                background: `linear-gradient(135deg, #0050B0 0%, ${PT.azul} 100%)`,
                borderRadius: 22,
                "--rot": "-14deg",
                boxShadow: baseShadow,
                animationDelay: "0.6s",
            }} />
            {/* Gold — bottom right */}
            <div className="absolute hidden md:block pointer-events-none lusorae-float" style={{
                right: "4%", bottom: "8%", width: "min(26%, 200px)", aspectRatio: "1/1",
                background: `linear-gradient(135deg, #FFD45C 0%, ${PT.gold} 100%)`,
                borderRadius: 26,
                "--rot": "-8deg",
                boxShadow: baseShadow,
                animationDelay: "1.2s",
            }} />
            {/* Green — bottom left */}
            <div className="absolute hidden md:block pointer-events-none lusorae-float-soft" style={{
                left: "4%", bottom: "8%", width: "min(22%, 170px)", aspectRatio: "1/1",
                background: `linear-gradient(135deg, #058845 0%, ${PT.green} 100%)`,
                borderRadius: 22,
                "--rot": "14deg",
                boxShadow: baseShadow,
                animationDelay: "1.8s",
            }} />
        </>
    );
}

// Stack of event cards (top-right behind phone) — interactive
function EventStack() {
    const events = [
        { title: "Sunset Party", place: "Faro · Praia · 19:30", img: IMG_EVENT_1, live: true },
        { title: "Mercado Criativo", place: "Lisboa · Alvalade · 15:00", img: IMG_EVENT_2 },
    ];
    return (
        <div
            className="relative bg-white lusorae-card-hover"
            style={{
                width: 240,
                borderRadius: 22,
                boxShadow: "0 24px 60px -20px rgba(10,10,10,0.28), 0 2px 8px rgba(10,10,10,0.08)",
                transform: "rotate(4deg)",
                padding: 14,
                border: `1px solid rgba(10,10,10,0.06)`,
                "--hover-rot": "4deg",
            }}
        >
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                    <span className="inline-block" style={{ width: 6, height: 6, borderRadius: "50%", background: PT.red }} />
                    <p className="font-bold text-[12.5px]" style={{ color: PT.ink, letterSpacing: "-0.01em" }}>Eventos</p>
                </div>
                <ArrowRight size={13} style={{ color: "rgba(10,10,10,0.4)" }} />
            </div>
            <div className="space-y-2.5">
                {events.map((e, i) => (
                    <div key={i} className="flex items-center gap-2.5 relative">
                        <div className="relative shrink-0">
                            <img
                                src={e.img} alt=""
                                className="object-cover"
                                style={{ width: 44, height: 44, borderRadius: 10 }}
                                loading="lazy"
                            />
                            {e.live && (
                                <span
                                    className="absolute -top-1 -right-1 inline-flex h-2.5 w-2.5"
                                    aria-hidden
                                >
                                    <span className="absolute inset-0 rounded-full lusorae-pulse" style={{ background: PT.red }} />
                                    <span className="relative rounded-full h-2.5 w-2.5" style={{ background: PT.red, border: "1.5px solid #fff" }} />
                                </span>
                            )}
                        </div>
                        <div className="min-w-0">
                            <p className="font-bold text-[12px] leading-tight truncate" style={{ color: PT.ink }}>{e.title}</p>
                            <p className="text-[10.5px] font-medium leading-tight mt-0.5 truncate" style={{ color: "rgba(10,10,10,0.55)" }}>{e.place}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// Stack of community cards (bottom-right behind phone) — interactive
function CommunityStack() {
    const communities = [
        { title: "Birdfire Algarve", members: "3.8K", img: IMG_COMM_1, accent: PT.red },
        { title: "Surfing Portugal", members: "2.1K", img: IMG_COMM_3, accent: PT.azul },
        { title: "Fotografia Lisboa", members: "1.7K", img: IMG_COMM_2, accent: PT.green },
    ];
    return (
        <div
            className="relative bg-white lusorae-card-hover"
            style={{
                width: 256,
                borderRadius: 22,
                boxShadow: "0 24px 60px -20px rgba(10,10,10,0.28), 0 2px 8px rgba(10,10,10,0.08)",
                transform: "rotate(-3deg)",
                padding: 14,
                border: `1px solid rgba(10,10,10,0.06)`,
                "--hover-rot": "-3deg",
            }}
        >
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                    <span className="inline-block" style={{ width: 6, height: 6, borderRadius: "50%", background: PT.azul }} />
                    <p className="font-bold text-[12.5px]" style={{ color: PT.ink, letterSpacing: "-0.01em" }}>Comunidades</p>
                </div>
                <ArrowRight size={13} style={{ color: "rgba(10,10,10,0.4)" }} />
            </div>
            <div className="space-y-2.5">
                {communities.map((c, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                        <img
                            src={c.img} alt=""
                            className="object-cover shrink-0"
                            style={{ width: 40, height: 40, borderRadius: 10 }}
                            loading="lazy"
                        />
                        <div className="min-w-0 flex-1">
                            <p className="font-bold text-[12px] leading-tight truncate" style={{ color: PT.ink }}>{c.title}</p>
                            <p className="text-[10.5px] font-medium leading-tight mt-0.5" style={{ color: "rgba(10,10,10,0.55)" }}>{c.members} membros</p>
                        </div>
                        <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                            style={{ background: c.accent, color: c.accent === PT.gold ? PT.ink : "#fff" }}
                        >
                            Ver
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}

// =============================================================================
// PHONE MOCKUP — clean Apple-style frame
// =============================================================================
function PhoneMockup() {
    return (
        <div
            className="relative"
            style={{
                width: "clamp(240px, 28vw, 320px)",
                aspectRatio: "9/19",
                transform: "rotate(-3deg)",
            }}
        >
            {/* Phone frame */}
            <div
                className="absolute inset-0"
                style={{
                    background: PT.ink,
                    borderRadius: 42,
                    padding: 8,
                    boxShadow: `0 50px 80px -30px rgba(10,10,10,0.45), 0 20px 40px -10px rgba(10,10,10,0.25)`,
                }}
            >
                {/* Screen */}
                <div
                    className="relative w-full h-full overflow-hidden"
                    style={{
                        background: "#fff",
                        borderRadius: 35,
                    }}
                >
                    {/* Status bar */}
                    <div className="flex items-center justify-between px-6 pt-3 pb-1 text-[10.5px] font-bold" style={{ color: PT.ink }}>
                        <span>19:24</span>
                        <span className="flex items-center gap-1">
                            <span style={{ width: 14, height: 8, background: "#0A0A0A", borderRadius: 2 }} />
                        </span>
                    </div>

                    {/* App header */}
                    <div className="flex items-center justify-between px-4 py-2.5">
                        <button
                            className="flex items-center justify-center"
                            style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(10,10,10,0.06)" }}
                            aria-hidden
                        >
                            <ArrowRight size={14} style={{ color: PT.ink, transform: "rotate(180deg)" }} />
                        </button>
                        <div className="flex items-center gap-1.5">
                            <span className="relative flex h-2 w-2" aria-hidden>
                                <span className="absolute inline-flex h-full w-full rounded-full lusorae-pulse" style={{ background: PT.green }} />
                                <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: PT.green }} />
                            </span>
                            <p className="font-bold text-[14px]" style={{ color: PT.ink, letterSpacing: "-0.01em" }}>Alameda · Faro</p>
                        </div>
                        <button
                            className="flex items-center justify-center"
                            style={{ width: 32, height: 32, borderRadius: "50%", background: "rgba(10,10,10,0.06)" }}
                            aria-hidden
                        >
                            <Sparkles size={14} style={{ color: PT.ink }} />
                        </button>
                    </div>

                    {/* Post header */}
                    <div className="px-4 pt-1 pb-3 flex items-center gap-2.5">
                        <div
                            className="rounded-full flex items-center justify-center font-bold text-[12px]"
                            style={{ width: 36, height: 36, background: PT.red, color: "#fff" }}
                        >
                            M
                        </div>
                        <div>
                            <p className="font-bold text-[12.5px] leading-tight" style={{ color: PT.ink }}>Maria Silva</p>
                            <p className="text-[10.5px] font-medium leading-tight" style={{ color: "rgba(10,10,10,0.50)" }}>Faro · há 2 horas</p>
                        </div>
                        <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: PT.gold, color: PT.ink }}>
                            📍 Faro
                        </span>
                    </div>

                    {/* Post text */}
                    <div className="px-4 pb-3">
                        <p className="text-[12.5px] font-medium leading-snug" style={{ color: PT.ink }}>
                            Pôr-do-sol na Praia de Faro. Quem é que vem? <span style={{ color: PT.red }}>🌅</span>
                        </p>
                    </div>

                    {/* Hero image */}
                    <div className="px-4">
                        <img
                            src={IMG_PHONE_FEED}
                            alt="Praia de Faro ao pôr-do-sol"
                            className="w-full object-cover"
                            style={{ aspectRatio: "1/1", borderRadius: 16 }}
                            loading="lazy"
                        />
                    </div>

                    {/* Reactions */}
                    <div className="px-4 py-3 flex items-center gap-4">
                        <span className="inline-flex items-center gap-1 text-[12px] font-bold" style={{ color: PT.ink }}>
                            <span style={{ color: PT.red, fontSize: 14 }}>♥</span> 1.2K
                        </span>
                        <span className="inline-flex items-center gap-1 text-[12px] font-bold" style={{ color: PT.ink }}>
                            <span style={{ color: PT.azul, fontSize: 13 }}>💬</span> 23
                        </span>
                    </div>

                    {/* Next post peek */}
                    <div className="px-4 pt-1 border-t" style={{ borderColor: "rgba(10,10,10,0.06)" }}>
                        <div className="flex items-center gap-2.5 pt-3">
                            <div
                                className="rounded-full flex items-center justify-center font-bold text-[11px]"
                                style={{ width: 30, height: 30, background: PT.azul, color: "#fff" }}
                            >
                                J
                            </div>
                            <div>
                                <p className="font-bold text-[11.5px] leading-tight" style={{ color: PT.ink }}>João Costa</p>
                                <p className="text-[10px] font-medium leading-tight" style={{ color: "rgba(10,10,10,0.50)" }}>Surf trip sábado em Matosinhos</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Notch */}
            <div
                className="absolute pointer-events-none"
                style={{
                    top: 14, left: "50%", transform: "translateX(-50%)",
                    width: 100, height: 26,
                    background: PT.ink, borderRadius: 14,
                }}
            />
        </div>
    );
}

// =============================================================================
// VALUE STRIP — condensed below-fold: 3 promises + city tiles
// =============================================================================
function ValueStrip() {
    const promises = [
        { icon: <MapPin size={20} />, title: "Cidade primeiro", sub: "Lisboa, Porto, Faro, Funchal — o teu feed começa onde tu estás." },
        { icon: <Calendar size={20} />, title: "Eventos perto", sub: "Encontros, concertos, tertúlias e festas — descobre o que está a acontecer." },
        { icon: <Users size={20} />, title: "Comunidades vivas", sub: "Pessoas reais a partilhar conversas reais — sem ruído, sem performance." },
    ];

    const cities = [
        { name: "Lisboa", img: CITY_LISBOA, accent: PT.red },
        { name: "Porto", img: CITY_PORTO, accent: PT.azul },
        { name: "Algarve", img: CITY_ALGARVE, accent: PT.gold },
        { name: "Madeira & Açores", img: CITY_OUTRA, accent: PT.green },
    ];

    return (
        <section
            data-testid="value-strip"
            className="px-5 sm:px-8 lg:px-12 py-14 sm:py-18 lg:py-20"
            style={{ background: PT.cream }}
        >
            <div className="max-w-[1400px] mx-auto">
                {/* Section header */}
                <div className="flex items-end justify-between flex-wrap gap-4 mb-10 sm:mb-12">
                    <div>
                        <p className="font-mono text-[11px] font-bold uppercase mb-2" style={{ letterSpacing: "0.18em", color: "rgba(10,10,10,0.55)" }}>
                            02 — Como funciona
                        </p>
                        <h2
                            className="font-black tracking-[-0.035em] leading-[0.95]"
                            style={{
                                fontSize: "clamp(32px, 4.5vw, 56px)",
                                color: PT.ink,
                                fontFamily: '"Inter", system-ui, sans-serif',
                                fontWeight: 900,
                            }}
                        >
                            Feito{" "}
                            <span className="relative inline-block">
                                <span style={{ color: PT.red }}>para portugueses</span>
                                <span
                                    className="absolute pointer-events-none"
                                    style={{ left: 0, right: 0, bottom: "-0.05em", height: 12 }}
                                >
                                    <UnderlineStroke color={PT.red} w={400} h={12} variant="dash" style={{ width: "100%", height: "100%" }} />
                                </span>
                            </span>
                            ,<br/>
                            por portugueses.
                        </h2>
                    </div>
                    <Link
                        to="/manifesto"
                        className="inline-flex items-center gap-1.5 text-[14px] font-bold py-2 transition-opacity hover:opacity-60"
                        style={{ color: PT.ink, borderBottom: `2px solid ${PT.ink}`, paddingBottom: 4 }}
                        data-testid="value-strip-manifesto"
                    >
                        Lê o manifesto <ArrowUpRight size={16} />
                    </Link>
                </div>

                {/* 3 promises */}
                <div className="grid sm:grid-cols-3 gap-5 lg:gap-7 mb-10 sm:mb-12">
                    {promises.map((p, i) => (
                        <div
                            key={i}
                            className="relative p-6 lg:p-7"
                            style={{
                                background: "#fff",
                                borderRadius: 22,
                                border: "1px solid rgba(10,10,10,0.06)",
                                boxShadow: "0 2px 12px -4px rgba(10,10,10,0.06)",
                            }}
                            data-testid={`promise-${i}`}
                        >
                            <span
                                className="inline-flex items-center justify-center mb-4"
                                style={{
                                    width: 44, height: 44, borderRadius: 14,
                                    background: PT.ink, color: "#fff",
                                }}
                            >
                                {p.icon}
                            </span>
                            <p className="font-bold text-[18px] leading-tight mb-1.5" style={{ color: PT.ink, letterSpacing: "-0.015em" }}>
                                {p.title}
                            </p>
                            <p className="text-[14px] font-medium leading-relaxed" style={{ color: "rgba(10,10,10,0.65)" }}>
                                {p.sub}
                            </p>
                            <span
                                className="absolute font-mono text-[10px] font-bold"
                                style={{ top: 18, right: 22, color: "rgba(10,10,10,0.30)" }}
                            >
                                0{i + 1}
                            </span>
                        </div>
                    ))}
                </div>

                {/* City tiles */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    {cities.map((c) => (
                        <CityTile key={c.name} city={c} />
                    ))}
                </div>
            </div>
        </section>
    );
}

function CityTile({ city }) {
    return (
        <div
            className="relative overflow-hidden group cursor-default"
            style={{
                aspectRatio: "4/5",
                borderRadius: 20,
                border: "1px solid rgba(10,10,10,0.06)",
            }}
            data-testid={`city-${city.name.toLowerCase().replace(/\s+/g, "-")}`}
        >
            <img
                src={city.img}
                alt={city.name}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                loading="lazy"
            />
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    background: `linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.65) 100%)`,
                }}
            />
            <div className="absolute inset-0 p-4 sm:p-5 flex flex-col justify-end">
                <div className="flex items-center gap-1.5 mb-1.5">
                    <span
                        className="inline-block"
                        style={{ width: 8, height: 8, borderRadius: "50%", background: city.accent }}
                    />
                    <span className="text-[10.5px] font-mono font-bold uppercase text-white/85" style={{ letterSpacing: "0.14em" }}>
                        Em Portugal
                    </span>
                </div>
                <p
                    className="font-black text-white tracking-[-0.02em] leading-none"
                    style={{ fontSize: "clamp(22px, 2.4vw, 30px)" }}
                >
                    {city.name}
                </p>
            </div>
        </div>
    );
}

// =============================================================================
// FINAL CTA — minimal black strip
// =============================================================================
function FinalCta() {
    return (
        <section className="px-5 sm:px-8 lg:px-12 pb-12 sm:pb-16" data-testid="final-cta">
            <div
                className="max-w-[1400px] mx-auto relative overflow-hidden px-7 sm:px-10 lg:px-14 py-12 sm:py-14 lg:py-16"
                style={{ background: PT.ink, borderRadius: 28 }}
            >
                {/* Floating colour blocks */}
                <div className="absolute pointer-events-none" style={{ right: -40, top: -40, width: 200, height: 200, background: PT.red, borderRadius: 24, transform: "rotate(14deg)", opacity: 0.85 }} aria-hidden />
                <div className="absolute pointer-events-none" style={{ right: 80, bottom: -50, width: 140, height: 140, background: PT.gold, borderRadius: 20, transform: "rotate(-8deg)", opacity: 0.85 }} aria-hidden />
                <div className="absolute pointer-events-none" style={{ right: 180, top: 40, width: 80, height: 80, background: PT.green, borderRadius: 14, transform: "rotate(-22deg)", opacity: 0.7 }} aria-hidden />

                <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-7">
                    <div className="max-w-2xl">
                        <p className="font-mono text-[11px] font-bold uppercase mb-3" style={{ letterSpacing: "0.18em", color: "rgba(255,255,255,0.55)" }}>
                            03 — Junta-te ao Lusorae
                        </p>
                        <h2
                            className="font-black tracking-[-0.035em] leading-[0.95]"
                            style={{
                                fontSize: "clamp(30px, 4.5vw, 56px)",
                                color: "#fff",
                                fontFamily: '"Inter", system-ui, sans-serif',
                                fontWeight: 900,
                            }}
                        >
                            Pronto para fazer parte da{" "}
                            <span className="relative inline-block">
                                <span style={{ color: PT.gold }}>tua cidade</span>
                                <span
                                    className="absolute pointer-events-none"
                                    style={{ left: 0, right: 0, bottom: "-0.05em", height: 12 }}
                                >
                                    <UnderlineStroke color={PT.gold} w={300} h={12} variant="wave" style={{ width: "100%", height: "100%" }} />
                                </span>
                            </span>
                            ?
                        </h2>
                        <p className="mt-4 text-[15px] sm:text-[16px] font-medium leading-relaxed" style={{ color: "rgba(255,255,255,0.75)" }}>
                            30 segundos. Grátis. Para sempre. <strong style={{ color: "#fff", fontWeight: 700 }}>Sem algoritmos de vaidade.</strong>
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 shrink-0 w-full lg:w-auto">
                        <Link
                            to="/register"
                            data-testid="final-cta-register"
                            className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-full text-[14.5px] font-bold transition-all hover:scale-[1.03]"
                            style={{ background: "#fff", color: PT.ink, boxShadow: `0 10px 28px -10px rgba(0,0,0,0.4)` }}
                        >
                            Criar conta grátis <ArrowRight size={17} />
                        </Link>
                        <Link
                            to="/login"
                            data-testid="final-cta-login"
                            className="inline-flex items-center justify-center gap-1.5 text-[14px] font-bold py-3.5 px-5 rounded-full"
                            style={{ border: `1.5px solid rgba(255,255,255,0.5)`, color: "#fff" }}
                        >
                            Entrar
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
}

// =============================================================================
// MAIN
// =============================================================================
export default function Landing() {
    const { user, checking } = useAuth();
    const [stats, setStats] = useState(null);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const { data } = await api.get(`/stats/landing`);
                if (mounted) setStats(data);
            } catch {
                /* silent — UI tem fallbacks */
            }
        })();
        return () => { mounted = false; };
    }, []);

    if (!checking && user) return <Navigate to="/feed" replace />;

    return (
        <div className="min-h-screen relative" style={{ background: PT.paper, fontFamily: '"Inter", system-ui, sans-serif' }} data-testid="landing-page">
            <TopNav />
            <Hero stats={stats} />
            <TrustStrip />
            <CityTicker />
            <ValueStrip />
            <FinalCta />
            <SiteFooter />
            <MobileStickyCta />

            {/* Premium polish: marquee + grain + float keyframes */}
            <style>{`
                @keyframes lusorae-marquee {
                    0%   { transform: translateX(0); }
                    100% { transform: translateX(-50%); }
                }
                @keyframes lusorae-float {
                    0%, 100% { transform: translateY(0) rotate(var(--rot, 0deg)); }
                    50%      { transform: translateY(-10px) rotate(var(--rot, 0deg)); }
                }
                @keyframes lusorae-float-soft {
                    0%, 100% { transform: translateY(0) rotate(var(--rot, 0deg)); }
                    50%      { transform: translateY(-6px) rotate(var(--rot, 0deg)); }
                }
                @keyframes lusorae-spin {
                    0%   { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                @keyframes lusorae-pulse {
                    0%, 100% { transform: scale(1); opacity: 1; }
                    50%      { transform: scale(1.18); opacity: 0.85; }
                }
                @keyframes lusorae-reveal-up {
                    0%   { opacity: 0; transform: translateY(20px); }
                    100% { opacity: 1; transform: translateY(0); }
                }

                .lusorae-marquee-wrap {
                    overflow: hidden;
                    mask-image: linear-gradient(90deg, transparent 0, #000 6%, #000 94%, transparent 100%);
                    -webkit-mask-image: linear-gradient(90deg, transparent 0, #000 6%, #000 94%, transparent 100%);
                }
                .lusorae-marquee {
                    display: inline-flex;
                    animation: lusorae-marquee 42s linear infinite;
                    will-change: transform;
                }
                .lusorae-float       { animation: lusorae-float 5s ease-in-out infinite; }
                .lusorae-float-soft  { animation: lusorae-float-soft 6s ease-in-out infinite; }
                .lusorae-spin-slow   { animation: lusorae-spin 36s linear infinite; }
                .lusorae-pulse       { animation: lusorae-pulse 1.8s ease-in-out infinite; }
                .lusorae-reveal-up   { animation: lusorae-reveal-up 0.8s cubic-bezier(0.22, 1, 0.36, 1) both; }

                .lusorae-grain::before {
                    content: "";
                    position: absolute;
                    inset: 0;
                    pointer-events: none;
                    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' seed='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.06 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
                    opacity: 0.7;
                    mix-blend-mode: multiply;
                    z-index: 0;
                }

                .lusorae-card-hover {
                    transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.4s;
                }
                .lusorae-card-hover:hover {
                    transform: translateY(-4px) rotate(var(--hover-rot, 0deg));
                    box-shadow: 0 30px 70px -20px rgba(10,10,10,0.32), 0 4px 14px rgba(10,10,10,0.08);
                }

                @media (prefers-reduced-motion: reduce) {
                    .lusorae-marquee, .lusorae-float, .lusorae-float-soft, .lusorae-spin-slow, .lusorae-pulse, .lusorae-reveal-up {
                        animation: none !important;
                    }
                }
            `}</style>
        </div>
    );
}
