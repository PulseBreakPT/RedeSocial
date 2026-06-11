import { useEffect, useId, useRef, useState } from "react";
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

// Premium editorial photos for "Cartas de Portugal" + cinematic divider
const IMG_PT_ALGARVE_CLIFFS = "https://images.unsplash.com/photo-1727961673785-689cad093cc7?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200";
const IMG_PT_LISBOA_TRAM    = "https://images.unsplash.com/photo-1585208798174-6cedd86e019a?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200";
const IMG_PT_PORTO_RIBEIRA  = "https://images.unsplash.com/photo-1555881400-74d7acaacd8b?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200";
const IMG_PT_ACORES_LAKE    = "https://images.unsplash.com/photo-1581925865466-ffed044c0c64?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200";
const IMG_PT_AZULEJO_WALL   = "https://images.unsplash.com/photo-1541320779116-ec4a3d4692bc?crop=entropy&cs=srgb&fm=jpg&q=85&w=1200";
const IMG_PT_COAST_PANO     = "https://images.unsplash.com/photo-1608649944716-228404a0a8bb?crop=entropy&cs=srgb&fm=jpg&q=85&w=2000";

// =============================================================================
// PREMIUM INTERACTION PRIMITIVES — magnetic CTA, 3D tilt, cursor accent
// =============================================================================
function Magnetic({ children, strength = 0.25, className = "" }) {
    const ref = useRef(null);
    const onMove = (e) => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * strength;
        const y = (e.clientY - r.top - r.height / 2) * strength;
        el.style.transform = `translate(${x}px, ${y}px)`;
    };
    const onLeave = () => {
        if (ref.current) ref.current.style.transform = "translate(0px, 0px)";
    };
    return (
        <div
            ref={ref}
            onMouseMove={onMove}
            onMouseLeave={onLeave}
            className={className}
            style={{ display: "inline-block", transition: "transform 0.35s cubic-bezier(0.22, 1, 0.36, 1)", willChange: "transform" }}
        >
            {children}
        </div>
    );
}

function Tilt({ children, max = 7 }) {
    const ref = useRef(null);
    const onMove = (e) => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        el.style.transform = `perspective(1100px) rotateY(${(px * max).toFixed(2)}deg) rotateX(${(-py * max).toFixed(2)}deg)`;
    };
    const onLeave = () => {
        if (ref.current) ref.current.style.transform = "perspective(1100px) rotateY(0deg) rotateX(0deg)";
    };
    return (
        <div
            ref={ref}
            onMouseMove={onMove}
            onMouseLeave={onLeave}
            style={{ transition: "transform 0.45s cubic-bezier(0.22, 1, 0.36, 1)", willChange: "transform", transformStyle: "preserve-3d" }}
        >
            {children}
        </div>
    );
}

function CursorDot() {
    const dotRef = useRef(null);
    const ringRef = useRef(null);
    useEffect(() => {
        const fine = window.matchMedia("(pointer: fine)").matches;
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (!fine || reduced) return;
        const dot = dotRef.current;
        const ring = ringRef.current;
        let x = -100, y = -100, rx = -100, ry = -100, raf, visible = false;
        const onMove = (e) => {
            x = e.clientX; y = e.clientY;
            if (!visible) { visible = true; dot.style.opacity = "1"; ring.style.opacity = "1"; }
            dot.style.transform = `translate(${x - 3}px, ${y - 3}px)`;
            const t = e.target && e.target.closest && e.target.closest("a, button");
            const s = t ? "46px" : "30px";
            ring.style.width = s;
            ring.style.height = s;
        };
        const loop = () => {
            rx += (x - rx) * 0.16;
            ry += (y - ry) * 0.16;
            const half = parseFloat(ring.style.width || "30") / 2;
            ring.style.transform = `translate(${rx - half}px, ${ry - half}px)`;
            raf = requestAnimationFrame(loop);
        };
        window.addEventListener("mousemove", onMove, { passive: true });
        raf = requestAnimationFrame(loop);
        return () => { window.removeEventListener("mousemove", onMove); cancelAnimationFrame(raf); };
    }, []);
    return (
        <>
            <div
                ref={dotRef}
                aria-hidden
                style={{
                    position: "fixed", top: 0, left: 0, width: 6, height: 6, borderRadius: "50%",
                    background: "#fff", mixBlendMode: "difference", zIndex: 95,
                    pointerEvents: "none", opacity: 0, transition: "opacity 0.3s",
                }}
            />
            <div
                ref={ringRef}
                aria-hidden
                style={{
                    position: "fixed", top: 0, left: 0, width: 30, height: 30, borderRadius: "50%",
                    border: "1.5px solid rgba(255,255,255,0.9)", mixBlendMode: "difference", zIndex: 95,
                    pointerEvents: "none", opacity: 0, transition: "opacity 0.3s, width 0.25s, height 0.25s",
                }}
            />
        </>
    );
}

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
function UnderlineStroke({ color, w = 220, h = 18, variant = "wave", style = {}, delay = 0 }) {
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
                pathLength="1"
                style={{
                    filter: "url(#roughInk)",
                    strokeDasharray: 1,
                    strokeDashoffset: 1,
                    animation: `lusorae-draw 0.85s cubic-bezier(0.65, 0, 0.35, 1) ${delay}s forwards`,
                }}
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
                    <div key={i} className="group flex items-start gap-3" data-testid={`trust-${i}`}>
                        <span
                            className="inline-flex items-center justify-center shrink-0 mt-0.5 transition-transform duration-300 group-hover:rotate-12 group-hover:scale-110"
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
            className="relative overflow-hidden"
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
                    <div className="flex items-center gap-3 mb-6 sm:mb-8 pr-[92px] lg:pr-0 lusorae-reveal-up">
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
                        {/* Line 1: A TUA (TUA em vermelho PT, itálico para rhythm cinematográfico) */}
                        <span className="block relative lusorae-line" style={{ paddingBottom: "0.04em", animationDelay: "0.08s" }}>
                            A{" "}
                            <span className="relative inline-block" style={{ fontStyle: "italic", letterSpacing: "-0.05em", color: PT.red }}>
                                TUA
                                <span
                                    className="absolute pointer-events-none"
                                    style={{ left: "-4%", right: "-4%", bottom: "-0.10em", height: 20 }}
                                >
                                    <UnderlineStroke color={PT.red} w={260} h={20} variant="thick" delay={0.75} style={{ width: "100%", height: "100%" }} />
                                </span>
                            </span>
                        </span>
                        {/* Line 2: CIDADE (em azul PT, sem ponto final) */}
                        <span className="block relative lusorae-line" style={{ paddingBottom: "0.04em", animationDelay: "0.16s" }}>
                            <span className="relative inline-block" style={{ color: PT.azul }}>
                                CIDADE
                                <span
                                    className="absolute pointer-events-none"
                                    style={{ left: "-2.5%", right: "-2.5%", bottom: "-0.09em", height: 22 }}
                                >
                                    <UnderlineStroke color={PT.azul} w={420} h={22} variant="wave" delay={0.95} style={{ width: "100%", height: "100%" }} />
                                </span>
                            </span>
                        </span>
                        {/* Line 3: A TUA (itálico mais uma vez — rhythm, mantém ink) */}
                        <span className="block relative lusorae-line" style={{ paddingBottom: "0.04em", animationDelay: "0.24s" }}>
                            A{" "}
                            <span style={{ fontStyle: "italic", letterSpacing: "-0.05em" }}>TUA</span>
                        </span>
                        {/* Line 4: REDE (em verde PT, sem ponto final) */}
                        <span className="block relative lusorae-line" style={{ animationDelay: "0.32s" }}>
                            <span className="relative inline-block" style={{ color: PT.green }}>
                                REDE
                                <span
                                    className="absolute pointer-events-none"
                                    style={{ left: "-3%", right: "-3%", bottom: "-0.16em", height: 22 }}
                                >
                                    <UnderlineStroke color={PT.green} w={320} h={22} variant="thick" delay={1.15} style={{ width: "100%", height: "100%" }} />
                                </span>
                            </span>
                        </span>
                    </h1>

                    {/* Subhead — keywords com highlight underlines coloridos */}
                    <p
                        className="mt-7 sm:mt-9 text-[15.5px] sm:text-[17px] lg:text-[18px] font-medium leading-relaxed max-w-[540px] lusorae-reveal-up"
                        style={{ color: "rgba(10,10,10,0.72)", animationDelay: "0.40s" }}
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
                    <div className="mt-7 sm:mt-9 flex flex-wrap items-center gap-4 sm:gap-5 lusorae-reveal-up" style={{ animationDelay: "0.50s" }}>
                        <Magnetic>
                            <Link
                                to="/register"
                                data-testid="hero-cta-register"
                                className="group inline-flex items-center gap-2 px-7 py-4 sm:px-8 sm:py-[18px] rounded-full text-[14.5px] sm:text-[15.5px] font-bold transition-all hover:scale-[1.04]"
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
                        </Magnetic>
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
                    <div className="mt-8 sm:mt-10 flex items-center gap-4 lusorae-reveal-up" style={{ animationDelay: "0.60s" }}>
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
                        <span className="lusorae-heart" style={{ color: PT.red, fontSize: 18 }}>♥</span>
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
                        <span className="lusorae-heart" style={{ color: PT.red, fontSize: 14 }}>♥</span>
                        <span className="text-[10.5px] font-bold" style={{ color: PT.ink }}>+12</span>
                    </div>

                    {/* Phone mockup — front (responsive, 3D tilt no desktop) */}
                    <div className="relative z-20" style={{ transform: "translateX(-2%)" }}>
                        <Tilt>
                            <PhoneMockup />
                        </Tilt>
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
            {/* Ground shadow — assenta o telefone no chão */}
            <div
                aria-hidden
                className="absolute pointer-events-none"
                style={{
                    left: "6%", right: "6%", bottom: -38, height: 56,
                    background: "radial-gradient(ellipse at center, rgba(10,10,10,0.32) 0%, transparent 68%)",
                    filter: "blur(8px)",
                }}
            />
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
                            <span className="lusorae-heart" style={{ color: PT.red, fontSize: 14 }}>♥</span> 1.2K
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

                    {/* Screen gloss reflection — premium glass detail */}
                    <div
                        aria-hidden
                        className="absolute inset-0 pointer-events-none"
                        style={{
                            borderRadius: 35,
                            background: "linear-gradient(118deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.06) 26%, rgba(255,255,255,0) 42%)",
                        }}
                    />
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
// VALUE STRIP — "Como funciona" reimaginado: 3 passos lógicos + cidades vivas
// =============================================================================
function ValueStrip() {
    const steps = [
        {
            n: "01",
            kicker: "ESCOLHE",
            title: "Diz onde vives",
            sub: "Faro, Lisboa, Porto, Funchal, Açores — o teu feed começa pela cidade, não por uma trend global.",
            accent: PT.red,
            icon: <MapPin size={18} strokeWidth={2.5} />,
            visual: <StepVisualCity />,
        },
        {
            n: "02",
            kicker: "SEGUE",
            title: "Escolhe o sinal",
            sub: "Comunidades, pessoas, temas. Tu decides o que entra no feed — não há recommended for you.",
            accent: PT.azul,
            icon: <Users size={18} strokeWidth={2.5} />,
            visual: <StepVisualFeed />,
        },
        {
            n: "03",
            kicker: "VIVE",
            title: "Sai do ecrã",
            sub: "Eventos, tertúlias, jantares, surf, concertos. A rede acaba onde começa a vida real.",
            accent: PT.green,
            icon: <Calendar size={18} strokeWidth={2.5} />,
            visual: <StepVisualEvent />,
        },
    ];

    const cities = [
        {
            name: "Lisboa",
            region: "Capital · Tejo",
            img: CITY_LISBOA,
            accent: PT.red,
            status: "EM CHAMAS",
            statusDot: PT.red,
            members: "1.2K",
            communities: 18,
            events: 32,
            tags: ["#cultura", "#tertúlias", "#nightlife"],
        },
        {
            name: "Porto",
            region: "Norte · Douro",
            img: CITY_PORTO,
            accent: PT.azul,
            status: "A CRESCER",
            statusDot: PT.azul,
            members: "840",
            communities: 12,
            events: 24,
            tags: ["#ribeira", "#música", "#vinho"],
        },
        {
            name: "Algarve",
            region: "Sul · Costa",
            img: CITY_ALGARVE,
            accent: PT.gold,
            status: "AO SOL",
            statusDot: PT.gold,
            members: "620",
            communities: 9,
            events: 18,
            tags: ["#surf", "#praia", "#sunset"],
        },
        {
            name: "Madeira & Açores",
            region: "Ilhas · Atlântico",
            img: CITY_OUTRA,
            accent: PT.green,
            status: "NEW",
            statusDot: PT.green,
            members: "280",
            communities: 6,
            events: 8,
            tags: ["#ilhas", "#natureza", "#trilhos"],
        },
    ];

    return (
        <section
            data-testid="value-strip"
            className="relative overflow-hidden px-5 sm:px-8 lg:px-12 py-16 sm:py-20 lg:py-24"
            style={{ background: PT.cream }}
        >
            {/* Subtle grid background — premium texture */}
            <div
                aria-hidden
                className="absolute inset-0 pointer-events-none opacity-[0.035]"
                style={{
                    backgroundImage: `linear-gradient(${PT.ink} 1px, transparent 1px), linear-gradient(90deg, ${PT.ink} 1px, transparent 1px)`,
                    backgroundSize: "44px 44px",
                }}
            />

            <div className="relative max-w-[1400px] mx-auto">
                {/* Section header */}
                <div className="flex items-end justify-between flex-wrap gap-5 mb-12 sm:mb-16">
                    <div className="max-w-3xl">
                        <div className="flex items-center gap-3 mb-3">
                            <span
                                className="inline-flex items-center justify-center font-mono text-[10.5px] font-black"
                                style={{
                                    width: 26, height: 26, borderRadius: "50%",
                                    background: PT.ink, color: "#fff", letterSpacing: "0.04em",
                                }}
                            >
                                02
                            </span>
                            <p
                                className="font-mono text-[11px] font-bold uppercase"
                                style={{ letterSpacing: "0.22em", color: "rgba(10,10,10,0.62)" }}
                            >
                                Como funciona
                            </p>
                            <span className="hidden sm:inline-block" style={{ width: 28, height: 1, background: "rgba(10,10,10,0.2)" }} />
                            <p className="hidden sm:inline-block font-mono text-[11px] font-bold uppercase" style={{ letterSpacing: "0.16em", color: "rgba(10,10,10,0.4)" }}>
                                3 passos · 0 algoritmos
                            </p>
                        </div>
                        <h2
                            className="font-black tracking-[-0.04em] leading-[0.92]"
                            style={{
                                fontSize: "clamp(34px, 5.2vw, 68px)",
                                color: PT.ink,
                                fontFamily: '"Inter", system-ui, sans-serif',
                                fontWeight: 900,
                            }}
                        >
                            Três passos.{" "}
                            <span className="relative inline-block" style={{ fontStyle: "italic", letterSpacing: "-0.045em", color: PT.red }}>
                                Zero ruído
                                <span
                                    className="absolute pointer-events-none"
                                    style={{ left: "-2%", right: "-2%", bottom: "-0.08em", height: 14 }}
                                >
                                    <UnderlineStroke color={PT.red} w={360} h={14} variant="slash" delay={0.3} style={{ width: "100%", height: "100%" }} />
                                </span>
                            </span>
                        </h2>
                        <p
                            className="mt-5 text-[15.5px] sm:text-[17px] font-medium leading-relaxed max-w-[560px]"
                            style={{ color: "rgba(10,10,10,0.68)" }}
                        >
                            Não te empurramos conteúdo. Devolvemos-te o controlo do que vês, de quem segues, e de onde vives.
                        </p>
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

                {/* 3 STEPS — fluxo horizontal com conectores */}
                <div className="relative grid sm:grid-cols-3 gap-4 lg:gap-6 mb-14 sm:mb-16">
                    {steps.map((s, i) => (
                        <StepCard key={i} step={s} index={i} isLast={i === steps.length - 1} />
                    ))}
                </div>

                {/* Sub-section: Cities — "Já está vivo em" */}
                <div className="flex items-end justify-between flex-wrap gap-4 mb-6 sm:mb-8">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span
                                className="inline-flex items-center justify-center"
                                style={{
                                    width: 22, height: 22, borderRadius: "50%",
                                    border: `1.5px solid ${PT.ink}`,
                                }}
                            >
                                <span className="relative flex h-1.5 w-1.5" aria-hidden>
                                    <span className="absolute inline-flex h-full w-full rounded-full lusorae-pulse" style={{ background: PT.red }} />
                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: PT.red }} />
                                </span>
                            </span>
                            <p className="font-mono text-[11px] font-bold uppercase" style={{ letterSpacing: "0.22em", color: "rgba(10,10,10,0.62)" }}>
                                Já está vivo em
                            </p>
                            <span className="hidden sm:inline-block" style={{ width: 28, height: 1, background: "rgba(10,10,10,0.2)" }} />
                            <p className="hidden sm:inline-block font-mono text-[11px] font-bold uppercase" style={{ letterSpacing: "0.16em", color: "rgba(10,10,10,0.4)" }}>
                                +2.9K membros · 45 comunidades · 82 eventos
                            </p>
                        </div>
                        <p className="font-black text-[22px] sm:text-[28px] lg:text-[32px] tracking-[-0.025em] leading-[1]" style={{ color: PT.ink }}>
                            Quatro regiões.{" "}
                            <span className="relative inline-block" style={{ fontStyle: "italic", color: PT.azul }}>
                                Um país a sair do ecrã
                                <span
                                    className="absolute pointer-events-none"
                                    style={{ left: 0, right: 0, bottom: "-0.08em", height: 10 }}
                                >
                                    <UnderlineStroke color={PT.azul} w={420} h={10} variant="wave" delay={0.3} style={{ width: "100%", height: "100%" }} />
                                </span>
                            </span>
                            .
                        </p>
                    </div>
                </div>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    {cities.map((c) => (
                        <CityTile key={c.name} city={c} />
                    ))}
                </div>

                {/* "Não vês a tua cidade?" — closing strip */}
                <div
                    className="mt-6 sm:mt-8 flex flex-wrap items-center justify-between gap-4 px-5 sm:px-6 py-4 sm:py-5"
                    style={{
                        background: "#fff",
                        borderRadius: 18,
                        border: "1px dashed rgba(10,10,10,0.18)",
                    }}
                    data-testid="cities-cta"
                >
                    <div className="flex items-center gap-3 min-w-0">
                        <span
                            className="inline-flex items-center justify-center shrink-0"
                            style={{
                                width: 36, height: 36, borderRadius: 12,
                                background: PT.ink, color: "#fff",
                            }}
                        >
                            <MapPin size={16} strokeWidth={2.5} />
                        </span>
                        <div className="min-w-0">
                            <p className="font-black text-[15px] sm:text-[16px] leading-tight tracking-[-0.01em]" style={{ color: PT.ink }}>
                                Não vês a tua cidade?
                            </p>
                            <p className="text-[12.5px] sm:text-[13px] font-medium leading-tight mt-0.5" style={{ color: "rgba(10,10,10,0.55)" }}>
                                Coimbra, Braga, Aveiro, Funchal — estamos a chegar. Entra na beta e abrimos-te a porta.
                            </p>
                        </div>
                    </div>
                    <Link
                        to="/register"
                        data-testid="cities-cta-link"
                        className="inline-flex items-center gap-1.5 text-[13.5px] font-bold px-5 py-2.5 rounded-full transition-all hover:scale-[1.03] shrink-0"
                        style={{ background: PT.ink, color: "#fff", boxShadow: "0 6px 16px -6px rgba(10,10,10,0.35)" }}
                    >
                        Pedir convite <ArrowUpRight size={14} />
                    </Link>
                </div>
            </div>
        </section>
    );
}

// =============================================================================
// STEP CARD — premium card com número gigante, mockup, conector
// =============================================================================
function StepCard({ step, index, isLast }) {
    return (
        <div
            className="relative group"
            data-testid={`step-${index}`}
        >
            {/* Connector arrow — desktop only, between cards */}
            {!isLast && (
                <div
                    aria-hidden
                    className="hidden sm:flex absolute z-20 items-center justify-center pointer-events-none"
                    style={{
                        right: -22, top: "44%", transform: "translateY(-50%)",
                        width: 44, height: 44, borderRadius: "50%",
                        background: "#fff",
                        border: `1.5px solid rgba(10,10,10,0.08)`,
                        boxShadow: "0 6px 18px -6px rgba(10,10,10,0.18)",
                    }}
                >
                    <ArrowRight size={18} strokeWidth={2.5} style={{ color: PT.ink }} />
                </div>
            )}

            <div
                className="relative h-full p-6 lg:p-7 transition-all duration-300 group-hover:-translate-y-1"
                style={{
                    background: "#fff",
                    borderRadius: 24,
                    border: "1px solid rgba(10,10,10,0.06)",
                    boxShadow: "0 4px 24px -8px rgba(10,10,10,0.08), 0 1px 3px rgba(10,10,10,0.04)",
                }}
            >
                {/* Accent bar — top */}
                <div
                    aria-hidden
                    className="absolute top-0 left-6 right-6 h-[3px] rounded-b"
                    style={{ background: step.accent, opacity: 0.9 }}
                />

                {/* Header: big number + kicker */}
                <div className="flex items-start justify-between mb-5">
                    <div>
                        <p
                            className="font-mono text-[10.5px] font-black uppercase mb-1"
                            style={{ letterSpacing: "0.22em", color: step.accent }}
                        >
                            {step.kicker}
                        </p>
                        <div className="flex items-end gap-2">
                            <span
                                className="font-black leading-none"
                                style={{
                                    fontSize: "clamp(56px, 7vw, 88px)",
                                    color: PT.ink,
                                    fontFamily: '"Inter", system-ui, sans-serif',
                                    fontWeight: 900,
                                    letterSpacing: "-0.05em",
                                    fontStyle: "italic",
                                }}
                            >
                                {step.n}
                            </span>
                            <span
                                className="inline-flex items-center justify-center mb-2"
                                style={{
                                    width: 32, height: 32, borderRadius: 10,
                                    background: step.accent, color: step.accent === PT.gold ? PT.ink : "#fff",
                                }}
                            >
                                {step.icon}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Visual mockup */}
                <div
                    className="relative mb-5 overflow-hidden"
                    style={{
                        background: `linear-gradient(180deg, rgba(10,10,10,0.025) 0%, rgba(10,10,10,0.01) 100%)`,
                        borderRadius: 16,
                        border: "1px solid rgba(10,10,10,0.05)",
                        aspectRatio: "16/10",
                    }}
                >
                    {step.visual}
                </div>

                {/* Title + sub */}
                <p
                    className="font-black text-[20px] sm:text-[22px] leading-[1.1] mb-2 tracking-[-0.02em]"
                    style={{ color: PT.ink }}
                >
                    {step.title}
                </p>
                <p className="text-[14px] font-medium leading-relaxed" style={{ color: "rgba(10,10,10,0.65)" }}>
                    {step.sub}
                </p>
            </div>
        </div>
    );
}

// === Mini visual mockups for each step ===

function StepVisualCity() {
    return (
        <div className="absolute inset-0 flex items-center justify-center p-4">
            {/* Simulated map dots */}
            <div className="relative w-full h-full">
                {/* Background dots grid */}
                <svg className="absolute inset-0" width="100%" height="100%" viewBox="0 0 200 120" preserveAspectRatio="xMidYMid slice" aria-hidden>
                    {Array.from({ length: 8 }).map((_, r) => (
                        Array.from({ length: 14 }).map((_, c) => (
                            <circle key={`${r}-${c}`} cx={c * 15 + 8} cy={r * 15 + 8} r={1} fill="rgba(10,10,10,0.10)" />
                        ))
                    )).flat()}
                </svg>
                {/* Active city pin */}
                <div className="absolute" style={{ left: "38%", top: "32%" }}>
                    <span className="relative flex items-center justify-center">
                        <span className="absolute inline-flex rounded-full lusorae-pulse" style={{ width: 40, height: 40, background: `${PT.red}33` }} />
                        <span
                            className="relative inline-flex items-center justify-center rounded-full font-black text-[10px]"
                            style={{
                                width: 24, height: 24, background: PT.red, color: "#fff",
                                border: "2.5px solid #fff",
                                boxShadow: "0 4px 10px rgba(10,10,10,0.2)",
                            }}
                        >
                            ★
                        </span>
                    </span>
                </div>
                {/* Other pins (smaller, dim) */}
                <span className="absolute rounded-full" style={{ left: "62%", top: "55%", width: 10, height: 10, background: PT.azul, opacity: 0.5, border: "2px solid #fff" }} />
                <span className="absolute rounded-full" style={{ left: "22%", top: "68%", width: 10, height: 10, background: PT.green, opacity: 0.5, border: "2px solid #fff" }} />
                <span className="absolute rounded-full" style={{ left: "78%", top: "22%", width: 10, height: 10, background: PT.gold, opacity: 0.5, border: "2px solid #fff" }} />

                {/* City tag */}
                <div
                    className="absolute"
                    style={{ left: "44%", top: "10%" }}
                >
                    <div
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full"
                        style={{
                            background: "#fff",
                            border: "1px solid rgba(10,10,10,0.08)",
                            boxShadow: "0 4px 12px -4px rgba(10,10,10,0.2)",
                        }}
                    >
                        <MapPin size={11} style={{ color: PT.red }} />
                        <span className="font-bold text-[10.5px]" style={{ color: PT.ink, letterSpacing: "-0.01em" }}>Faro</span>
                        <span className="font-mono text-[9px] font-bold" style={{ color: "rgba(10,10,10,0.4)" }}>· ativa</span>
                    </div>
                </div>
            </div>
        </div>
    );
}

function StepVisualFeed() {
    const items = [
        { c: PT.red, t: "Surfing Portugal", s: "2.1K membros" },
        { c: PT.azul, t: "Fotografia Lisboa", s: "1.7K membros" },
        { c: PT.green, t: "Birdfire Algarve", s: "3.8K membros" },
    ];
    return (
        <div className="absolute inset-0 p-3.5 flex flex-col gap-2 justify-center">
            {items.map((it, i) => (
                <div
                    key={i}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl"
                    style={{
                        background: "#fff",
                        border: i === 1 ? `1.5px solid ${PT.azul}` : "1px solid rgba(10,10,10,0.06)",
                        boxShadow: i === 1 ? `0 6px 16px -6px ${PT.azul}55` : "0 2px 6px -2px rgba(10,10,10,0.06)",
                        transform: i === 1 ? "translateX(4px)" : "none",
                        transition: "transform 0.3s",
                    }}
                >
                    <span
                        className="rounded-lg shrink-0"
                        style={{ width: 22, height: 22, background: it.c }}
                    />
                    <div className="flex-1 min-w-0">
                        <p className="font-bold text-[10.5px] leading-tight truncate" style={{ color: PT.ink }}>{it.t}</p>
                        <p className="text-[8.5px] font-medium leading-tight" style={{ color: "rgba(10,10,10,0.5)" }}>{it.s}</p>
                    </div>
                    <span
                        className="inline-flex items-center justify-center text-[9px] font-black px-2 py-0.5 rounded-full shrink-0"
                        style={{
                            background: i === 1 ? PT.azul : "rgba(10,10,10,0.06)",
                            color: i === 1 ? "#fff" : "rgba(10,10,10,0.55)",
                        }}
                    >
                        {i === 1 ? "✓ Segues" : "Seguir"}
                    </span>
                </div>
            ))}
        </div>
    );
}

function StepVisualEvent() {
    return (
        <div className="absolute inset-0 p-3.5 flex items-center justify-center">
            <div
                className="relative w-full max-w-[220px] overflow-hidden"
                style={{
                    background: "#fff",
                    borderRadius: 14,
                    border: "1px solid rgba(10,10,10,0.06)",
                    boxShadow: "0 8px 24px -10px rgba(10,10,10,0.25)",
                }}
            >
                {/* Image area with gradient */}
                <div
                    className="relative"
                    style={{
                        aspectRatio: "16/8",
                        background: `linear-gradient(135deg, ${PT.green} 0%, ${PT.azul} 100%)`,
                    }}
                >
                    <div className="absolute top-2 left-2 flex items-center gap-1 px-1.5 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.92)" }}>
                        <span className="relative flex h-1.5 w-1.5">
                            <span className="absolute inline-flex h-full w-full rounded-full lusorae-pulse" style={{ background: PT.red }} />
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: PT.red }} />
                        </span>
                        <span className="text-[8px] font-black uppercase" style={{ color: PT.ink, letterSpacing: "0.06em" }}>Ao vivo</span>
                    </div>
                    <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-md" style={{ background: PT.ink, color: "#fff" }}>
                        <span className="text-[8px] font-black uppercase" style={{ letterSpacing: "0.06em" }}>SÁB · 19:30</span>
                    </div>
                </div>
                <div className="p-2.5">
                    <p className="font-black text-[11px] leading-tight mb-0.5 tracking-[-0.01em]" style={{ color: PT.ink }}>
                        Sunset Party · Praia de Faro
                    </p>
                    <div className="flex items-center justify-between mt-1.5">
                        <div className="flex -space-x-1">
                            {[PT.red, PT.azul, PT.gold].map((c, i) => (
                                <span key={i} className="rounded-full" style={{ width: 14, height: 14, background: c, border: "1.5px solid #fff" }} />
                            ))}
                        </div>
                        <span className="text-[9px] font-bold" style={{ color: "rgba(10,10,10,0.5)" }}>+24 vão</span>
                    </div>
                </div>
            </div>
        </div>
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
                boxShadow: "0 2px 12px -4px rgba(10,10,10,0.08)",
            }}
            data-testid={`city-${city.name.toLowerCase().replace(/\s+/g, "-")}`}
        >
            <img
                src={city.img}
                alt={city.name}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1200ms] group-hover:scale-110"
                loading="lazy"
            />
            {/* Top gradient (status legibility) */}
            <div
                className="absolute inset-x-0 top-0 h-1/3 pointer-events-none"
                style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, transparent 100%)" }}
            />
            {/* Bottom gradient (info legibility) */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    background: `linear-gradient(180deg, transparent 30%, rgba(0,0,0,0.55) 65%, rgba(0,0,0,0.92) 100%)`,
                }}
            />

            {/* TOP-LEFT: Status pill */}
            <div className="absolute top-3 left-3 z-10 flex items-center gap-1.5 px-2 py-1 rounded-full"
                style={{
                    background: "rgba(255,255,255,0.96)",
                    boxShadow: "0 4px 12px -4px rgba(0,0,0,0.3)",
                }}
            >
                <span className="relative flex h-1.5 w-1.5" aria-hidden>
                    <span className="absolute inline-flex h-full w-full rounded-full lusorae-pulse" style={{ background: city.statusDot }} />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: city.statusDot }} />
                </span>
                <span className="text-[9.5px] font-black uppercase" style={{ color: PT.ink, letterSpacing: "0.10em" }}>
                    {city.status}
                </span>
            </div>

            {/* TOP-RIGHT: Region badge */}
            <div className="absolute top-3 right-3 z-10 px-2 py-1 rounded-full"
                style={{
                    background: "rgba(255,255,255,0.14)",
                    backdropFilter: "blur(8px)",
                    WebkitBackdropFilter: "blur(8px)",
                    border: "1px solid rgba(255,255,255,0.25)",
                }}
            >
                <span className="text-[9px] font-bold uppercase text-white" style={{ letterSpacing: "0.12em" }}>
                    {city.region}
                </span>
            </div>

            {/* Hover arrow */}
            <span
                className="absolute z-20 flex items-center justify-center opacity-0 translate-y-2 scale-90 group-hover:opacity-100 group-hover:translate-y-0 group-hover:scale-100 transition-all duration-300"
                style={{
                    bottom: 16, right: 14,
                    width: 38, height: 38, borderRadius: "50%",
                    background: "rgba(255,255,255,0.96)", color: PT.ink,
                    boxShadow: "0 6px 16px -4px rgba(0,0,0,0.3)",
                }}
                aria-hidden
            >
                <ArrowUpRight size={16} strokeWidth={2.5} />
            </span>

            {/* BOTTOM: City name + tags + stats */}
            <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5 z-10">
                {/* Tags */}
                <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
                    {city.tags.map((t, i) => (
                        <span
                            key={i}
                            className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full"
                            style={{
                                background: "rgba(255,255,255,0.18)",
                                color: "#fff",
                                backdropFilter: "blur(8px)",
                                WebkitBackdropFilter: "blur(8px)",
                                border: "1px solid rgba(255,255,255,0.2)",
                                letterSpacing: "-0.01em",
                            }}
                        >
                            {t}
                        </span>
                    ))}
                </div>

                {/* City name */}
                <p
                    className="font-black text-white tracking-[-0.03em] leading-[0.92] mb-2.5"
                    style={{ fontSize: "clamp(24px, 2.6vw, 34px)" }}
                >
                    {city.name}
                </p>

                {/* Stats row */}
                <div className="flex items-center gap-3 pt-2.5"
                    style={{ borderTop: "1px solid rgba(255,255,255,0.18)" }}
                >
                    <div className="flex-1 min-w-0">
                        <p className="font-black text-white text-[14px] sm:text-[15px] leading-none tracking-[-0.01em]">
                            {city.members}
                        </p>
                        <p className="text-[9px] font-bold uppercase text-white/65 mt-0.5" style={{ letterSpacing: "0.08em" }}>
                            membros
                        </p>
                    </div>
                    <span className="w-px h-7 bg-white/20" aria-hidden />
                    <div className="flex-1 min-w-0">
                        <p className="font-black text-white text-[14px] sm:text-[15px] leading-none tracking-[-0.01em]">
                            {city.communities}
                        </p>
                        <p className="text-[9px] font-bold uppercase text-white/65 mt-0.5" style={{ letterSpacing: "0.08em" }}>
                            comunidades
                        </p>
                    </div>
                    <span className="w-px h-7 bg-white/20" aria-hidden />
                    <div className="flex-1 min-w-0">
                        <p className="font-black text-[14px] sm:text-[15px] leading-none tracking-[-0.01em]" style={{ color: city.accent === PT.gold ? city.accent : "#fff" }}>
                            {city.events}
                        </p>
                        <p className="text-[9px] font-bold uppercase text-white/65 mt-0.5" style={{ letterSpacing: "0.08em" }}>
                            eventos
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

// =============================================================================
// FINAL CTA — premium 2-column closer com checklist + timeline 30s
// =============================================================================
function FinalCta() {
    const checklist = [
        { txt: "Perfil pronto em 30 segundos" },
        { txt: "Acesso imediato à beta — sem lista de espera" },
        { txt: "Sem cartão, sem compromisso, para sempre grátis" },
        { txt: "A primeira rede social sem algoritmo de vaidade" },
    ];
    const timeline = [
        { t: "0:00", title: "Email + nome", sub: "Sem telefone, sem links sociais.", color: PT.red },
        { t: "0:10", title: "Escolhe a tua cidade", sub: "É por aqui que o feed começa.", color: PT.azul },
        { t: "0:25", title: "Já estás dentro", sub: "Bem-vindo à rede portuguesa.", color: PT.green },
    ];
    return (
        <section className="px-5 sm:px-8 lg:px-12 pb-16 sm:pb-20" data-testid="final-cta">
            <div
                className="max-w-[1400px] mx-auto relative overflow-hidden px-6 sm:px-10 lg:px-14 py-12 sm:py-14 lg:py-16"
                style={{ background: PT.ink, borderRadius: 32 }}
            >
                {/* Subtle grid texture */}
                <div
                    aria-hidden
                    className="absolute inset-0 pointer-events-none opacity-[0.05]"
                    style={{
                        backgroundImage: `linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)`,
                        backgroundSize: "44px 44px",
                    }}
                />

                {/* Floating colour blocks — background */}
                <div className="absolute pointer-events-none lusorae-float-soft" style={{ right: -50, top: -40, width: 220, height: 220, background: PT.red, borderRadius: 28, "--rot": "14deg", opacity: 0.7 }} aria-hidden />
                <div className="hidden sm:block absolute pointer-events-none lusorae-float-soft" style={{ right: 140, bottom: -50, width: 140, height: 140, background: PT.gold, borderRadius: 22, "--rot": "-8deg", opacity: 0.55, animationDelay: "0.8s" }} aria-hidden />
                <div className="hidden sm:block absolute pointer-events-none lusorae-float-soft" style={{ left: -30, bottom: 30, width: 100, height: 100, background: PT.green, borderRadius: 18, "--rot": "-22deg", opacity: 0.55, animationDelay: "1.6s" }} aria-hidden />

                <div className="relative z-10 grid lg:grid-cols-[1.15fr_1fr] gap-10 lg:gap-14 items-start">

                    {/* ============ LEFT: kicker + headline + checklist + CTAs ============ */}
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <span
                                className="inline-flex items-center justify-center font-mono text-[10.5px] font-black"
                                style={{
                                    width: 26, height: 26, borderRadius: "50%",
                                    background: "#fff", color: PT.ink, letterSpacing: "0.04em",
                                }}
                            >
                                03
                            </span>
                            <p className="font-mono text-[11px] font-bold uppercase" style={{ letterSpacing: "0.22em", color: "rgba(255,255,255,0.62)" }}>
                                Junta-te à beta
                            </p>
                        </div>
                        <h2
                            className="font-black tracking-[-0.04em] leading-[0.92]"
                            style={{
                                fontSize: "clamp(36px, 5.5vw, 72px)",
                                color: "#fff",
                                fontFamily: '"Inter", system-ui, sans-serif',
                                fontWeight: 900,
                            }}
                        >
                            30 segundos{" "}
                            <span style={{ whiteSpace: "nowrap" }}>
                                e estás{" "}
                                <span className="relative inline-block" style={{ fontStyle: "italic", color: PT.gold, letterSpacing: "-0.045em" }}>
                                    dentro
                                    <span
                                        className="absolute pointer-events-none"
                                        style={{ left: "-2%", right: "-2%", bottom: "-0.08em", height: 14 }}
                                    >
                                        <UnderlineStroke color={PT.gold} w={280} h={14} variant="thick" delay={0.3} style={{ width: "100%", height: "100%" }} />
                                    </span>
                                </span>
                            </span>
                        </h2>
                        <p className="mt-5 text-[15.5px] sm:text-[17px] font-medium leading-relaxed max-w-[520px]" style={{ color: "rgba(255,255,255,0.72)" }}>
                            Não é mais uma rede. É <strong style={{ color: "#fff", fontWeight: 700 }}>a rede portuguesa</strong> — feita aqui, para quem vive aqui.
                        </p>

                        {/* Checklist */}
                        <ul className="mt-7 sm:mt-8 space-y-3" data-testid="final-cta-checklist">
                            {checklist.map((c, i) => (
                                <li key={i} className="flex items-start gap-3">
                                    <span
                                        className="inline-flex items-center justify-center shrink-0 mt-0.5"
                                        style={{
                                            width: 22, height: 22, borderRadius: "50%",
                                            background: "rgba(255,255,255,0.10)",
                                            border: "1px solid rgba(255,255,255,0.18)",
                                        }}
                                        aria-hidden
                                    >
                                        <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                                            <path d="M2 6.5 L5 9 L10 3" stroke={PT.gold} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </span>
                                    <span className="text-[14.5px] sm:text-[15.5px] font-medium leading-snug" style={{ color: "rgba(255,255,255,0.88)" }}>
                                        {c.txt}
                                    </span>
                                </li>
                            ))}
                        </ul>

                        {/* CTAs */}
                        <div className="mt-8 sm:mt-9 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4">
                            <Magnetic className="w-full sm:w-auto">
                                <Link
                                    to="/register"
                                    data-testid="final-cta-register"
                                    className="group inline-flex items-center justify-center gap-2 px-7 py-[18px] rounded-full text-[15px] font-bold transition-all hover:scale-[1.03] w-full sm:w-auto"
                                    style={{ background: "#fff", color: PT.ink, boxShadow: `0 14px 32px -10px rgba(0,0,0,0.5)` }}
                                >
                                    Criar conta grátis{" "}
                                    <ArrowRight size={17} className="transition-transform duration-300 group-hover:translate-x-1" />
                                </Link>
                            </Magnetic>
                            <Link
                                to="/login"
                                data-testid="final-cta-login"
                                className="inline-flex items-center justify-center gap-1.5 text-[14.5px] font-bold py-[15px] px-6 rounded-full"
                                style={{ border: `1.5px solid rgba(255,255,255,0.45)`, color: "#fff" }}
                            >
                                Já tenho conta
                            </Link>
                        </div>

                        {/* Tiny print */}
                        <p className="mt-5 text-[12px] font-medium" style={{ color: "rgba(255,255,255,0.45)" }}>
                            Sem cartão · Sem spam · Cancela a conta com 1 clique
                        </p>
                    </div>

                    {/* ============ RIGHT: 30-second timeline card ============ */}
                    <div className="relative">
                        <div
                            className="relative overflow-hidden p-6 sm:p-7"
                            style={{
                                background: "rgba(255,255,255,0.05)",
                                backdropFilter: "blur(20px) saturate(140%)",
                                WebkitBackdropFilter: "blur(20px) saturate(140%)",
                                border: "1px solid rgba(255,255,255,0.12)",
                                borderRadius: 22,
                                boxShadow: "0 20px 60px -20px rgba(0,0,0,0.5)",
                            }}
                            data-testid="final-cta-timeline"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between mb-5">
                                <div className="flex items-center gap-2">
                                    <span className="relative flex h-2 w-2" aria-hidden>
                                        <span className="absolute inline-flex h-full w-full rounded-full lusorae-pulse" style={{ background: PT.green }} />
                                        <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: PT.green }} />
                                    </span>
                                    <p className="font-mono text-[10.5px] font-bold uppercase" style={{ letterSpacing: "0.18em", color: "rgba(255,255,255,0.75)" }}>
                                        O que acontece em 30s
                                    </p>
                                </div>
                                <span className="font-mono text-[10.5px] font-black px-2 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.10)", color: "#fff", letterSpacing: "0.04em" }}>
                                    0:30
                                </span>
                            </div>

                            {/* Timeline */}
                            <div className="relative pl-2">
                                {/* Vertical line */}
                                <span
                                    aria-hidden
                                    className="absolute left-[15px] top-2 bottom-2 w-px"
                                    style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.30) 0%, rgba(255,255,255,0.05) 100%)" }}
                                />
                                {timeline.map((s, i) => (
                                    <div key={i} className={`relative flex items-start gap-4 ${i === timeline.length - 1 ? "" : "pb-5"}`}>
                                        {/* Dot */}
                                        <span
                                            className="relative z-10 inline-flex items-center justify-center shrink-0"
                                            style={{
                                                width: 26, height: 26, borderRadius: "50%",
                                                background: s.color,
                                                color: s.color === PT.gold ? PT.ink : "#fff",
                                                boxShadow: `0 0 0 4px rgba(10,10,10,1), 0 4px 12px -2px ${s.color}88`,
                                                marginLeft: -1,
                                            }}
                                        >
                                            <span className="font-black text-[10px]">{i + 1}</span>
                                        </span>
                                        <div className="flex-1 min-w-0 pt-0.5">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <p className="font-black text-[14.5px] leading-tight tracking-[-0.01em]" style={{ color: "#fff" }}>
                                                    {s.title}
                                                </p>
                                                <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.75)" }}>
                                                    {s.t}
                                                </span>
                                            </div>
                                            <p className="text-[12.5px] font-medium leading-snug" style={{ color: "rgba(255,255,255,0.62)" }}>
                                                {s.sub}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Footer: social proof */}
                            <div
                                className="mt-6 pt-5 flex items-center gap-3"
                                style={{ borderTop: "1px solid rgba(255,255,255,0.10)" }}
                            >
                                <div className="flex -space-x-2 shrink-0">
                                    {[PT.red, PT.azul, PT.green, PT.gold].map((c, i) => (
                                        <span
                                            key={i}
                                            className="rounded-full flex items-center justify-center font-black text-[10px]"
                                            style={{
                                                width: 28, height: 28,
                                                background: c,
                                                color: c === PT.gold ? PT.ink : "#fff",
                                                border: "2.5px solid #0A0A0A",
                                            }}
                                        >
                                            {["S", "T", "I", "M"][i]}
                                        </span>
                                    ))}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[12.5px] font-bold leading-tight" style={{ color: "#fff" }}>
                                        Os primeiros membros já estão dentro
                                    </p>
                                    <p className="text-[11px] font-medium leading-tight mt-0.5" style={{ color: "rgba(255,255,255,0.55)" }}>
                                        Lisboa · Porto · Faro · Funchal
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Floating "Made in PT" mini-stamp */}
                        <div
                            className="absolute -top-3 -right-3 z-20 lusorae-float-soft hidden sm:block"
                            style={{ "--rot": "8deg" }}
                            aria-hidden
                        >
                            <div
                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full"
                                style={{
                                    background: "#fff",
                                    boxShadow: "0 8px 20px -6px rgba(0,0,0,0.4)",
                                }}
                            >
                                <span className="inline-block" style={{ width: 6, height: 6, borderRadius: "50%", background: PT.red }} />
                                <span className="inline-block" style={{ width: 6, height: 6, borderRadius: "50%", background: PT.green }} />
                                <span className="font-black text-[10px] uppercase" style={{ color: PT.ink, letterSpacing: "0.10em" }}>
                                    Made in PT
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

// =============================================================================
// SIGNATURE 1: CARTOGRAFIA LUSORAE — fixed scroll-tracking Portugal map widget
// Only this site has it. Pin viaja pelo país consoante o scroll.
// =============================================================================
function PortugalCompass() {
    const [progress, setProgress] = useState(0);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const onScroll = () => {
            const doc = document.documentElement;
            const max = doc.scrollHeight - window.innerHeight;
            const p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
            setProgress(p);
            setVisible(window.scrollY > 220);
        };
        window.addEventListener("scroll", onScroll, { passive: true });
        onScroll();
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    // Estações ao longo de Portugal continental (top → bottom em %)
    const stations = [
        { y: 14, name: "Porto",    region: "Norte",   accent: PT.azul },
        { y: 38, name: "Coimbra",  region: "Centro",  accent: PT.ink },
        { y: 56, name: "Lisboa",   region: "Capital", accent: PT.red },
        { y: 82, name: "Algarve",  region: "Sul",     accent: PT.gold },
    ];
    const currentY = 10 + progress * 80;
    const current = stations.reduce(
        (closest, s) => (Math.abs(s.y - currentY) < Math.abs(closest.y - currentY) ? s : closest),
        stations[0],
    );

    return (
        <div
            className="hidden lg:block fixed z-40"
            style={{
                bottom: 22,
                left: 22,
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0)" : "translateY(20px)",
                transition: "opacity 0.45s, transform 0.45s",
                pointerEvents: visible ? "auto" : "none",
            }}
            data-testid="portugal-compass"
            aria-label={`Estás em ${current.name} · ${Math.round(progress * 100)}% da página`}
        >
            <div
                className="flex items-center gap-3"
                style={{
                    background: "rgba(247,245,239,0.92)",
                    backdropFilter: "blur(20px) saturate(150%)",
                    WebkitBackdropFilter: "blur(20px) saturate(150%)",
                    border: "1px solid rgba(10,10,10,0.10)",
                    borderRadius: 18,
                    padding: "10px 13px",
                    boxShadow: "0 18px 48px -16px rgba(10,10,10,0.32), 0 4px 12px rgba(10,10,10,0.06)",
                }}
            >
                {/* Portugal stylized SVG silhouette */}
                <div className="relative shrink-0" style={{ width: 40, height: 70 }}>
                    <svg viewBox="0 0 50 100" width="40" height="70" style={{ overflow: "visible", display: "block" }}>
                        {/* Mainland silhouette — stylized rectangle on western Iberia */}
                        <path
                            d="M 20,6 L 28,4 L 33,9 L 36,18 L 38,28 L 36,36 L 39,46 L 40,56 L 41,66 L 39,76 L 35,86 L 30,92 L 24,94 L 18,90 L 14,82 L 12,72 L 14,58 L 12,46 L 10,34 L 12,22 L 16,12 Z"
                            fill="rgba(10,10,10,0.06)"
                            stroke={PT.ink}
                            strokeWidth="1.3"
                            strokeLinejoin="round"
                        />
                        {/* Station dots (faint) */}
                        {stations.map((s, i) => (
                            <circle key={i} cx="25" cy={s.y} r="1.4" fill="rgba(10,10,10,0.28)" />
                        ))}
                        {/* Live pin — pulses + animates y */}
                        <circle
                            cx="25"
                            cy={currentY}
                            r="6"
                            fill={`${current.accent}22`}
                            style={{ transition: "cy 0.55s cubic-bezier(0.22, 1, 0.36, 1), fill 0.4s" }}
                        />
                        <circle
                            cx="25"
                            cy={currentY}
                            r="3.4"
                            fill={current.accent}
                            stroke="#fff"
                            strokeWidth="1.4"
                            style={{ transition: "cy 0.55s cubic-bezier(0.22, 1, 0.36, 1), fill 0.4s" }}
                        />
                    </svg>
                    {/* Madeira + Açores small dots off-coast */}
                    <span className="absolute" style={{ bottom: 8, left: -10, width: 5, height: 5, borderRadius: "50%", background: PT.green, opacity: 0.42, border: "1px solid rgba(10,10,10,0.25)" }} aria-hidden />
                    <span className="absolute" style={{ bottom: 22, left: -16, width: 4, height: 4, borderRadius: "50%", background: PT.green, opacity: 0.42, border: "1px solid rgba(10,10,10,0.25)" }} aria-hidden />
                </div>

                {/* Live label */}
                <div>
                    <p className="font-mono text-[9px] font-bold uppercase mb-0.5" style={{ letterSpacing: "0.20em", color: "rgba(10,10,10,0.5)" }}>
                        Cartografia
                    </p>
                    <p className="font-black text-[14px] leading-none tracking-[-0.01em]" style={{ color: PT.ink }}>
                        {current.name}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                        <span className="relative flex h-1.5 w-1.5" aria-hidden>
                            <span className="absolute inline-flex h-full w-full rounded-full lusorae-pulse" style={{ background: current.accent }} />
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: current.accent }} />
                        </span>
                        <p className="text-[10px] font-bold" style={{ color: "rgba(10,10,10,0.55)", letterSpacing: "-0.005em" }}>
                            {current.region} · {Math.round(progress * 100)}%
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

// =============================================================================
// SIGNATURE 2: AZULEJO BAND — Portuguese ceramic-tile-inspired SVG divider
// =============================================================================
function AzulejoBand({ height = 56, accent = "#8FB8E0", bg = PT.ink, dense = false }) {
    const rawId = useId();
    const patternId = `azulejo${rawId.replace(/[^a-zA-Z0-9]/g, "")}`;
    const tileSize = dense ? 48 : 60;
    return (
        <div
            aria-hidden
            className="relative overflow-hidden"
            style={{ height, background: bg }}
            data-testid="azulejo-band"
        >
            <svg
                width="100%"
                height={height}
                viewBox={`0 0 600 ${height}`}
                preserveAspectRatio="xMinYMid slice"
                style={{ display: "block" }}
            >
                <defs>
                    <pattern id={patternId} x="0" y="0" width={tileSize} height={tileSize} patternUnits="userSpaceOnUse">
                        <rect width={tileSize} height={tileSize} fill={bg} />
                        <g stroke={accent} strokeWidth="1.1" fill="none" opacity="0.85">
                            {/* Outer diamond */}
                            <path d={`M ${tileSize / 2},4 L ${tileSize - 4},${tileSize / 2} L ${tileSize / 2},${tileSize - 4} L 4,${tileSize / 2} Z`} />
                            {/* Inner diamond */}
                            <path d={`M ${tileSize / 2},${tileSize * 0.25} L ${tileSize * 0.75},${tileSize / 2} L ${tileSize / 2},${tileSize * 0.75} L ${tileSize * 0.25},${tileSize / 2} Z`} />
                            {/* Center cross */}
                            <line x1={tileSize / 2} y1={tileSize * 0.36} x2={tileSize / 2} y2={tileSize * 0.64} />
                            <line x1={tileSize * 0.36} y1={tileSize / 2} x2={tileSize * 0.64} y2={tileSize / 2} />
                            {/* Corner arcs (the classic Portuguese azulejo curl) */}
                            <path d={`M 4,4 Q ${tileSize * 0.20},4 ${tileSize * 0.20},${tileSize * 0.20}`} />
                            <path d={`M ${tileSize - 4},4 Q ${tileSize * 0.80},4 ${tileSize * 0.80},${tileSize * 0.20}`} />
                            <path d={`M 4,${tileSize - 4} Q ${tileSize * 0.20},${tileSize - 4} ${tileSize * 0.20},${tileSize * 0.80}`} />
                            <path d={`M ${tileSize - 4},${tileSize - 4} Q ${tileSize * 0.80},${tileSize - 4} ${tileSize * 0.80},${tileSize * 0.80}`} />
                        </g>
                        <circle cx={tileSize / 2} cy={tileSize / 2} r="1.4" fill={accent} opacity="0.9" />
                    </pattern>
                </defs>
                <rect width="600" height={height} fill={`url(#${patternId})`} />
            </svg>
            {/* Hand-stamped label */}
            <div
                className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
                <div
                    className="inline-flex items-center gap-2 px-3.5 py-1.5"
                    style={{
                        background: bg,
                        borderRadius: 999,
                        boxShadow: `inset 0 0 0 1px ${accent}55`,
                    }}
                >
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: PT.red, display: "inline-block" }} />
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: PT.green, display: "inline-block" }} />
                    <span className="font-mono text-[10px] font-black uppercase" style={{ letterSpacing: "0.25em", color: "rgba(255,255,255,0.85)" }}>
                        Feito em Portugal · Azulejo digital
                    </span>
                </div>
            </div>
        </div>
    );
}

// =============================================================================
// SIGNATURE 3: CARTAS DE PORTUGAL — postcard collection
// =============================================================================
function Postais() {
    const cards = [
        { img: IMG_PT_ALGARVE_CLIFFS, location: "Praia da Marinha · Algarve", coords: "37°05'N · 8°25'W", caption: "Onde o ouro\ntoca o mar", stamp: { color: PT.gold, region: "ALGARVE" }, rotate: -3.0, cls: "lg:col-span-2 lg:row-span-2", lg: true },
        { img: IMG_PT_LISBOA_TRAM,    location: "Elétrico 28 · Lisboa",    coords: "38°42'N · 9°08'W", caption: "Capital,\nem amarelo",       stamp: { color: PT.red, region: "LISBOA" },   rotate: 2.5,  cls: "lg:col-span-2" },
        { img: IMG_PT_PORTO_RIBEIRA,  location: "Ribeira · Porto",         coords: "41°08'N · 8°37'W", caption: "Do Douro\npara o mundo",     stamp: { color: PT.azul, region: "PORTO" },   rotate: -1.6, cls: "lg:col-span-2" },
        { img: IMG_PT_ACORES_LAKE,    location: "Lagoa do Fogo · Açores",  coords: "37°45'N · 25°28'W", caption: "Nove ilhas,\numa só alma",   stamp: { color: PT.green, region: "AÇORES" }, rotate: 3.0,  cls: "lg:col-span-2" },
        { img: IMG_PT_AZULEJO_WALL,   location: "Azulejo · Património",    coords: "Séc. XVI–XXI",      caption: "Paredes que\ncontam",        stamp: { color: PT.azul, region: "AZULEJO" }, rotate: -2.4, cls: "lg:col-span-2" },
    ];

    return (
        <section
            data-testid="postais"
            className="relative overflow-hidden px-5 sm:px-8 lg:px-12 py-16 sm:py-20 lg:py-24"
            style={{ background: PT.paper }}
        >
            {/* Watermark: giant "Portugal" italic in background */}
            <div
                aria-hidden
                className="absolute pointer-events-none select-none"
                style={{
                    top: "50%", left: "50%",
                    transform: "translate(-50%, -50%) rotate(-4deg)",
                    fontSize: "clamp(180px, 26vw, 380px)",
                    fontWeight: 900,
                    color: "rgba(10,10,10,0.025)",
                    fontStyle: "italic",
                    fontFamily: '"Inter", system-ui, sans-serif',
                    letterSpacing: "-0.05em",
                    lineHeight: 0.85,
                    whiteSpace: "nowrap",
                }}
            >
                Portugal
            </div>

            <div className="relative max-w-[1400px] mx-auto">
                {/* Section header */}
                <div className="flex items-end justify-between flex-wrap gap-5 mb-12 sm:mb-16">
                    <div className="max-w-2xl">
                        <div className="flex items-center gap-3 mb-3">
                            <span
                                className="inline-flex items-center justify-center font-black text-[12px]"
                                style={{
                                    width: 26, height: 26, borderRadius: 6,
                                    background: PT.red, color: "#fff",
                                    transform: "rotate(-8deg)",
                                }}
                            >
                                ✉
                            </span>
                            <p className="font-mono text-[11px] font-bold uppercase" style={{ letterSpacing: "0.22em", color: "rgba(10,10,10,0.62)" }}>
                                Cartas de Portugal
                            </p>
                            <span className="hidden sm:inline-block" style={{ width: 28, height: 1, background: "rgba(10,10,10,0.2)" }} />
                            <p className="hidden sm:inline-block font-mono text-[11px] font-bold uppercase" style={{ letterSpacing: "0.16em", color: "rgba(10,10,10,0.4)" }}>
                                5 postais · 5 latitudes
                            </p>
                        </div>
                        <h2
                            className="font-black tracking-[-0.04em] leading-[0.92]"
                            style={{
                                fontSize: "clamp(34px, 5.2vw, 68px)",
                                color: PT.ink,
                                fontFamily: '"Inter", system-ui, sans-serif',
                                fontWeight: 900,
                            }}
                        >
                            Cada cidade,{" "}
                            <span className="relative inline-block" style={{ fontStyle: "italic", letterSpacing: "-0.045em", color: PT.green }}>
                                um postal
                                <span
                                    className="absolute pointer-events-none"
                                    style={{ left: "-2%", right: "-2%", bottom: "-0.08em", height: 14 }}
                                >
                                    <UnderlineStroke color={PT.green} w={300} h={14} variant="wave" delay={0.3} style={{ width: "100%", height: "100%" }} />
                                </span>
                            </span>
                        </h2>
                        <p className="mt-5 text-[15.5px] sm:text-[17px] font-medium leading-relaxed max-w-[540px]" style={{ color: "rgba(10,10,10,0.68)" }}>
                            Não vendemos um produto — convidamos-te para um país. Sai do feed e vem ver isto ao vivo.
                        </p>
                    </div>
                </div>

                {/* Postal cards — asymmetric magazine grid */}
                <div className="grid grid-cols-2 lg:grid-cols-6 gap-5 sm:gap-7 lg:gap-10">
                    {cards.map((c, i) => (
                        <PostalCard key={i} data={c} index={i} className={c.cls || ""} large={!!c.lg} />
                    ))}
                </div>
            </div>
        </section>
    );
}

function PostalCard({ data, index, className = "", large = false }) {
    return (
        <div className={`relative group ${className}`} data-testid={`postal-${index}`}>
            <div
                className="relative transition-all duration-500 group-hover:-translate-y-2 group-hover:rotate-0"
                style={{
                    transform: `rotate(${data.rotate}deg)`,
                    transformOrigin: "center center",
                }}
            >
                <div
                    className="relative"
                    style={{
                        background: "#FCFAF4",
                        borderRadius: 6,
                        padding: 10,
                        paddingBottom: 14,
                        boxShadow: "0 22px 50px -18px rgba(10,10,10,0.35), 0 4px 12px rgba(10,10,10,0.10)",
                        border: "1px solid rgba(10,10,10,0.06)",
                    }}
                >
                    {/* Photo */}
                    <div
                        className="relative overflow-hidden"
                        style={{
                            aspectRatio: large ? "4/5" : "16/11",
                            borderRadius: 3,
                            background: "#eee",
                        }}
                    >
                        <img
                            src={data.img}
                            alt={data.location}
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1500ms] group-hover:scale-110"
                            loading="lazy"
                        />
                        {/* Warm-light overlay */}
                        <div
                            className="absolute inset-0 pointer-events-none"
                            style={{
                                background: "linear-gradient(180deg, transparent 55%, rgba(0,0,0,0.55) 100%)",
                            }}
                        />
                        {/* Location strip bottom */}
                        <div className="absolute bottom-2 left-2 right-2 flex items-center gap-1.5">
                            <MapPin size={11} style={{ color: "#fff" }} />
                            <span
                                className="font-mono text-[9.5px] font-bold uppercase text-white truncate"
                                style={{ letterSpacing: "0.10em", textShadow: "0 1px 3px rgba(0,0,0,0.6)" }}
                            >
                                {data.location}
                            </span>
                        </div>
                    </div>

                    {/* Bottom strip: caption + stamp + coords */}
                    <div className="relative pt-4 px-1.5 flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                            <p
                                className="font-black leading-[1.05] tracking-[-0.02em] whitespace-pre-line"
                                style={{
                                    color: PT.ink,
                                    fontSize: large ? "clamp(20px, 1.85vw, 28px)" : "clamp(14px, 1.1vw, 16px)",
                                    fontStyle: "italic",
                                }}
                            >
                                {data.caption}
                            </p>
                            <p
                                className="font-mono font-bold mt-2"
                                style={{
                                    color: "rgba(10,10,10,0.42)",
                                    letterSpacing: "0.10em",
                                    fontSize: large ? "10.5px" : "9px",
                                }}
                            >
                                {data.coords}
                            </p>
                        </div>
                        <PostalStamp color={data.stamp.color} region={data.stamp.region} large={large} />
                    </div>

                    {/* Circular postmark (carimbo) over photo top-right */}
                    <PostalCarimbo />
                </div>
            </div>
        </div>
    );
}

function PostalStamp({ color, region, large = false }) {
    const w = large ? 58 : 46;
    const h = large ? 68 : 54;
    const isLight = color === PT.gold;
    return (
        <div
            className="shrink-0 relative"
            style={{
                width: w, height: h,
                background: color,
                color: isLight ? PT.ink : "#fff",
                padding: 3,
                transform: "rotate(3deg)",
                boxShadow: "0 3px 8px rgba(10,10,10,0.18)",
            }}
        >
            {/* Perforated edge effect via box-shadow + radial gradients */}
            <div
                aria-hidden
                className="absolute inset-0 pointer-events-none"
                style={{
                    background: `
                        radial-gradient(circle at 50% 0, transparent 2.4px, transparent 2.4px),
                        radial-gradient(circle at 50% 100%, transparent 2.4px, transparent 2.4px)
                    `,
                }}
            />
            <div
                className="w-full h-full flex flex-col items-center justify-center"
                style={{ border: `1px dashed ${isLight ? "rgba(10,10,10,0.30)" : "rgba(255,255,255,0.55)"}` }}
            >
                <span className="font-black text-[9px] leading-none">★</span>
                <span
                    className="font-black uppercase leading-tight mt-0.5 text-center px-0.5"
                    style={{ fontSize: large ? "9px" : "7.5px", letterSpacing: "0.05em" }}
                >
                    {region}
                </span>
                <span className="font-mono text-[6.5px] font-bold mt-0.5" style={{ letterSpacing: "0.08em" }}>
                    2026
                </span>
            </div>
        </div>
    );
}

function PostalCarimbo() {
    return (
        <div
            className="absolute pointer-events-none"
            style={{
                top: 16, right: 16,
                width: 58, height: 58,
                transform: "rotate(-14deg)",
                opacity: 0.62,
            }}
            aria-hidden
        >
            <svg viewBox="0 0 60 60" width="58" height="58">
                <circle cx="30" cy="30" r="26" fill="none" stroke={PT.red} strokeWidth="1.3" strokeDasharray="2 2" />
                <circle cx="30" cy="30" r="20" fill="none" stroke={PT.red} strokeWidth="1.1" />
                <text x="30" y="20" textAnchor="middle" fontSize="5.5" fontWeight="900" fill={PT.red} fontFamily="Inter, system-ui">
                    LUSORAE
                </text>
                <text x="30" y="34" textAnchor="middle" fontSize="13" fontWeight="900" fill={PT.red} fontFamily="Inter, system-ui">
                    PT
                </text>
                <text x="30" y="44" textAnchor="middle" fontSize="5.5" fontWeight="900" fill={PT.red} fontFamily="Inter, system-ui">
                    VISTO · 2026
                </text>
            </svg>
        </div>
    );
}

// =============================================================================
// SIGNATURE 4: CINEMATIC DIVIDER — full-bleed Portugal coast with editorial typo
// =============================================================================
function CinematicDivider() {
    return (
        <section
            className="relative overflow-hidden"
            style={{ height: "clamp(320px, 42vw, 520px)" }}
            data-testid="cinematic-divider"
            aria-hidden
        >
            <img
                src={IMG_PT_COAST_PANO}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
            />
            {/* Dark gradient for legibility */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: "linear-gradient(180deg, rgba(10,10,10,0.40) 0%, rgba(10,10,10,0.25) 40%, rgba(10,10,10,0.70) 100%)" }}
            />
            {/* Coordinate strip — top */}
            <div className="absolute top-5 left-5 right-5 flex items-center justify-between text-white pointer-events-none">
                <div className="flex items-center gap-2">
                    <span className="relative flex h-1.5 w-1.5">
                        <span className="absolute inline-flex h-full w-full rounded-full lusorae-pulse" style={{ background: PT.red }} />
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: PT.red }} />
                    </span>
                    <p className="font-mono text-[10px] sm:text-[11px] font-bold uppercase" style={{ letterSpacing: "0.22em", color: "rgba(255,255,255,0.85)" }}>
                        Coordenada · Atlântico
                    </p>
                </div>
                <p className="font-mono text-[10px] sm:text-[11px] font-bold uppercase hidden sm:block" style={{ letterSpacing: "0.22em", color: "rgba(255,255,255,0.65)" }}>
                    Lat. 37°–42°N · Lon. 6°–9°W
                </p>
            </div>

            {/* Centre title */}
            <div className="absolute inset-0 flex items-center justify-center px-5 pointer-events-none">
                <div className="text-center max-w-3xl">
                    <p className="font-mono text-[10px] sm:text-[11px] font-bold uppercase mb-3 sm:mb-4" style={{ letterSpacing: "0.28em", color: "rgba(255,255,255,0.7)" }}>
                        — entre o oceano e o resto —
                    </p>
                    <h3
                        className="font-black tracking-[-0.04em] leading-[0.92] text-white"
                        style={{
                            fontSize: "clamp(40px, 7vw, 96px)",
                            fontFamily: '"Inter", system-ui, sans-serif',
                            fontWeight: 900,
                            textShadow: "0 4px 24px rgba(0,0,0,0.4)",
                        }}
                    >
                        Vivemos{" "}
                        <span style={{ fontStyle: "italic", color: PT.gold, letterSpacing: "-0.045em" }}>aqui</span>.
                        <br />
                        E é{" "}
                        <span style={{ fontStyle: "italic", color: PT.red, letterSpacing: "-0.045em" }}>aqui</span>{" "}
                        que ficamos.
                    </h3>
                </div>
            </div>

            {/* Bottom coordinate strip */}
            <div className="absolute bottom-5 left-5 right-5 flex items-center justify-between text-white pointer-events-none">
                <p className="font-mono text-[10px] sm:text-[11px] font-bold uppercase" style={{ letterSpacing: "0.22em", color: "rgba(255,255,255,0.65)" }}>
                    Praia · Vicentina
                </p>
                <p className="font-mono text-[10px] sm:text-[11px] font-bold uppercase" style={{ letterSpacing: "0.22em", color: "rgba(255,255,255,0.85)" }}>
                    Photo · Portugal {String.fromCharCode(8217)}26
                </p>
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
            <Postais />
            <AzulejoBand height={56} accent="#A8C7E8" bg={PT.ink} />
            <ValueStrip />
            <CinematicDivider />
            <FinalCta />
            <SiteFooter />
            <MobileStickyCta />
            <PortugalCompass />
            <div aria-hidden className="lusorae-grain-fixed" />
            <CursorDot />

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
                @keyframes lusorae-line-in {
                    0%   { opacity: 0; transform: translateY(36px); filter: blur(8px); }
                    100% { opacity: 1; transform: translateY(0); filter: blur(0); }
                }
                @keyframes lusorae-draw {
                    to { stroke-dashoffset: 0; }
                }
                @keyframes lusorae-heart-pop {
                    0%, 84%, 100% { transform: scale(1); }
                    88% { transform: scale(1.35); }
                    93% { transform: scale(0.92); }
                    97% { transform: scale(1.12); }
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
                .lusorae-line        { animation: lusorae-line-in 0.95s cubic-bezier(0.22, 1, 0.36, 1) both; will-change: transform, filter; }
                .lusorae-heart       { display: inline-block; animation: lusorae-heart-pop 3.2s ease-in-out infinite; transform-origin: center; }
                .lusorae-marquee-wrap:hover .lusorae-marquee { animation-play-state: paused; }

                .lusorae-grain-fixed {
                    position: fixed;
                    inset: 0;
                    pointer-events: none;
                    z-index: 90;
                    background-image: url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' seed='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.06 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>");
                    opacity: 0.55;
                    mix-blend-mode: multiply;
                }

                [data-testid="landing-page"] ::selection {
                    background: #FFCC29;
                    color: #0A0A0A;
                }
                html {
                    scrollbar-width: thin;
                    scrollbar-color: #0A0A0A #F7F5EF;
                }
                ::-webkit-scrollbar { width: 10px; }
                ::-webkit-scrollbar-track { background: #F7F5EF; }
                ::-webkit-scrollbar-thumb {
                    background: #0A0A0A;
                    border-radius: 999px;
                    border: 2.5px solid #F7F5EF;
                }

                .lusorae-card-hover {
                    transition: transform 0.4s cubic-bezier(0.22, 1, 0.36, 1), box-shadow 0.4s;
                }
                .lusorae-card-hover:hover {
                    transform: translateY(-4px) rotate(var(--hover-rot, 0deg));
                    box-shadow: 0 30px 70px -20px rgba(10,10,10,0.32), 0 4px 14px rgba(10,10,10,0.08);
                }

                @media (prefers-reduced-motion: reduce) {
                    .lusorae-marquee, .lusorae-float, .lusorae-float-soft, .lusorae-spin-slow, .lusorae-pulse, .lusorae-reveal-up, .lusorae-line, .lusorae-heart {
                        animation: none !important;
                    }
                    svg path {
                        animation: none !important;
                        stroke-dashoffset: 0 !important;
                    }
                }
            `}</style>
        </div>
    );
}
