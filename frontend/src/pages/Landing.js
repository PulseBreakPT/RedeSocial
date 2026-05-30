import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import axios from "axios";
import {
    ArrowRight, Users, MessageCircle, Calendar, Building2,
    MapPin, Compass, Sparkles, Lock, ChevronDown, Heart,
} from "lucide-react";
import {
    PT, Sticker, StampCircle, TapedPhoto, PosterCard, Kicker, AuthStyles,
    DoodleArrow, DoodleStar, DoodleSparkles, DoodleHeart, DoodleScribble,
    DoodleZigzag, DoodleUnderline, DoodleSpiral, DoodleCross, DoodleExclamation,
    DoodleLongArrow, HandNote, GeoTriangle, GeoSquare, GeoCircle, GiantAsterisk,
    PostIt, Receipt, Ticket, PostStamp, AzulejoBorder, Highlight, Coords,
    SpeechBubble, NewspaperClip, Signature, RouteDots, PaperFoldCorner,
    QuickStroke, HandArrow, StampTag,
} from "./auth/AuthDecor";
import SiteFooter from "../components/SiteFooter";
import { useAuth } from "../context/AuthContext";

const BACKEND = process.env.REACT_APP_BACKEND_URL || "";
const HERO_MAIN = "/hero/hero.webp";
const HERO_CITY_1 = "/hero/city-porto.webp";
const HERO_CITY_2 = "/hero/city-lisboa.webp";
const HERO_CITY_3 = "/hero/city-algarve.webp";
const PORTUGAL_MAP = "/hero/portugal-map.webp";
const CTA_BG = "/hero/cta-community.webp";

// =============================================================================
// LUSORAE — Landing pública (fanzine PT · vermelho/dourado/verde/azul)
// =============================================================================
export default function Landing() {
    const { user, checking } = useAuth();
    const [stats, setStats] = useState(null);
    const [openFaq, setOpenFaq] = useState(null);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const { data } = await axios.get(`${BACKEND}/api/stats/landing`);
                if (mounted) setStats(data);
            } catch {
                /* fail silently — secção esconde-se sozinha */
            }
        })();
        return () => { mounted = false; };
    }, []);

    // Logged-in users go straight to the feed
    if (!checking && user) return <Navigate to="/feed" replace />;

    return (
        <div className="min-h-screen relative overflow-hidden pt-paper" style={{ background: PT.cream }} data-testid="landing-page">
            <div className="pt-tape h-3 w-full" />

            <TopNav />
            <Hero stats={stats} />
            <StatsBand stats={stats} />
            <WhatYouFind />
            <ExploreCities />
            <HowItWorks />
            <PortugalMap />
            <FeitoParaPessoas />
            <Faq openFaq={openFaq} setOpenFaq={setOpenFaq} />
            <FinalCta />

            <div className="pt-tape h-3 w-full" />
            <SiteFooter />
            <AuthStyles />
        </div>
    );
}

// =============================================================================
// TOP NAV — só desktop (lg+); mobile usa o footer + CTAs do hero
// =============================================================================
function TopNav() {
    const NavLink = ({ to, children, testid }) => (
        <Link
            to={to}
            data-testid={testid}
            className="text-[13.5px] font-black uppercase tracking-wider hover:opacity-70 transition-opacity"
            style={{ color: PT.ink, letterSpacing: "0.08em" }}
        >
            {children}
        </Link>
    );
    return (
        <header className="relative z-30">
            {/* DESKTOP NAV */}
            <div className="hidden lg:flex items-center justify-between px-10 xl:px-16 py-6 relative">
                <div className="flex items-baseline gap-2">
                    <span style={{ color: PT.red, fontSize: 36, textShadow: `2px 2px 0 ${PT.gold}` }} className="font-black leading-none">✱</span>
                    <span
                        className="text-[28px] font-black tracking-tight"
                        style={{ color: PT.ink, textShadow: `2px 2px 0 ${PT.gold}` }}
                        data-testid="brand-logo"
                    >
                        lusorae
                    </span>
                </div>
                <nav className="flex items-center gap-9">
                    <NavLink to="/manifesto" testid="nav-manifesto">Manifesto</NavLink>
                    <NavLink to="/legal/community" testid="nav-community">Diretrizes</NavLink>
                    <NavLink to="/legal/privacy" testid="nav-privacy">Privacidade</NavLink>
                    <NavLink to="/legal" testid="nav-legal">Legal</NavLink>
                </nav>
                <div className="flex items-center gap-3">
                    <Link
                        to="/login"
                        data-testid="nav-login"
                        className="text-[13.5px] font-black uppercase px-5 py-2.5 rounded-full transition"
                        style={{
                            color: PT.ink,
                            border: `2.5px solid ${PT.ink}`,
                            letterSpacing: "0.08em",
                            background: "transparent",
                        }}
                    >
                        Entrar
                    </Link>
                    <Link
                        to="/register"
                        data-testid="nav-register"
                        className="pt-btn-primary text-[13.5px] px-5 py-3"
                    >
                        Criar conta →
                    </Link>
                </div>
            </div>

            {/* MOBILE NAV — só marca + Entrar/Criar */}
            <div className="lg:hidden flex items-center justify-between px-5 py-4">
                <div className="flex items-baseline gap-1.5">
                    <span style={{ color: PT.red, fontSize: 28, textShadow: `2px 2px 0 ${PT.gold}` }} className="font-black leading-none">✱</span>
                    <span className="text-[22px] font-black tracking-tight" style={{ color: PT.ink, textShadow: `2px 2px 0 ${PT.gold}` }}>
                        lusorae
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <Link to="/login" data-testid="nav-login-mobile" className="text-[12px] font-black uppercase px-3.5 py-2 rounded-full" style={{ color: PT.ink, border: `2px solid ${PT.ink}`, letterSpacing: "0.06em" }}>
                        Entrar
                    </Link>
                </div>
            </div>
        </header>
    );
}

// =============================================================================
// HERO — Vive. Partilha. Lusorae.
// =============================================================================
function Hero({ stats }) {
    const online = stats?.online_now ?? 0;
    const total = stats?.total_users ?? 0;
    const showOnlineCount = online > 0;
    const avatars = (stats?.avatars || []).slice(0, 5);

    return (
        <section className="relative px-5 sm:px-8 lg:px-16 pt-2 lg:pt-4 pb-12 sm:pb-16 lg:pb-20" data-testid="hero">
            {/* Doodles dispersos */}
            <div className="absolute top-10 right-10 pointer-events-none hidden lg:block">
                <DoodleSparkles color={PT.gold} size={64} rotate={14} />
            </div>
            <div className="absolute bottom-20 left-6 pointer-events-none hidden lg:block">
                <DoodleScribble color={PT.azul} w={140} h={48} style={{ transform: "rotate(-8deg)" }} />
            </div>

            <div className="grid lg:grid-cols-[1.05fr_1fr] gap-8 sm:gap-10 lg:gap-14 items-center max-w-7xl mx-auto">
                {/* COLUNA TEXTO */}
                <div className="relative order-2 lg:order-1">
                    {/* Kicker amarelo */}
                    <div className="inline-block mb-4 sm:mb-5">
                        <span
                            className="text-[10px] sm:text-[11px] font-mono font-black uppercase"
                            style={{
                                letterSpacing: "0.18em",
                                background: PT.gold,
                                color: PT.ink,
                                padding: "6px 12px",
                                border: `2.5px solid ${PT.ink}`,
                                boxShadow: `3px 3px 0 ${PT.ink}`,
                                display: "inline-block",
                                transform: "rotate(-1deg)",
                            }}
                        >
                            A tua cidade · a tua voz
                        </span>
                    </div>

                    {/* TÍTULO grande */}
                    <h1
                        className="font-black tracking-[-0.04em] mb-5 sm:mb-6"
                        style={{ fontSize: "clamp(42px, 7vw, 84px)", lineHeight: 1.0, color: PT.ink }}
                    >
                        <span className="inline-block sm:inline-block" style={{
                            display: "inline-block",
                            transform: "rotate(-1deg)",
                            textShadow: `3px 3px 0 ${PT.gold}`,
                            WebkitTextStroke: `1px ${PT.ink}`,
                            marginBottom: "0.05em",
                        }}>Vive.</span>
                        <br className="sm:hidden"/>{" "}
                        <span style={{
                            display: "inline-block",
                            color: PT.red,
                            transform: "rotate(1deg)",
                            textShadow: `3px 3px 0 ${PT.gold}, 6px 6px 0 ${PT.ink}`,
                            WebkitTextStroke: `1.5px ${PT.ink}`,
                            marginTop: "0.10em",
                        }}>Partilha.</span>
                        <br/>
                        <span style={{
                            display: "inline-block",
                            background: PT.gold,
                            color: PT.ink,
                            padding: "0 0.12em",
                            border: `4px solid ${PT.ink}`,
                            boxShadow: `5px 5px 0 ${PT.ink}, 12px 12px 0 ${PT.red}`,
                            transform: "rotate(-1deg)",
                            marginTop: "0.22em",
                            WebkitTextStroke: `0.5px ${PT.ink}`,
                        }}>Lusorae.</span>
                    </h1>

                    {/* Descrição */}
                    <p className="text-[15.5px] sm:text-[16.5px] lg:text-[18px] font-medium leading-relaxed mb-6 sm:mb-7 max-w-[540px]" style={{ color: "rgba(10,10,10,0.78)" }}>
                        A rede social portuguesa feita para{" "}
                        <span style={{ background: PT.azul, color: "#fff", padding: "2px 8px", fontWeight: 800, border: `2px solid ${PT.ink}`, boxShadow: `2px 2px 0 ${PT.ink}`, display: "inline-block", transform: "rotate(-1deg)" }}>
                            conversas reais
                        </span>
                        , pessoas reais e{" "}
                        <span style={{ background: PT.green, color: "#fff", padding: "2px 8px", fontWeight: 800, border: `2px solid ${PT.ink}`, boxShadow: `2px 2px 0 ${PT.ink}`, display: "inline-block", transform: "rotate(1deg)" }}>
                            presença social viva
                        </span>
                        .
                    </p>

                    {/* CTAs */}
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-7 relative">
                        <Link
                            to="/register"
                            data-testid="hero-cta-register"
                            className="pt-btn-primary text-[15px] sm:text-[16px] py-4 px-7 inline-flex items-center justify-center gap-2 w-full sm:w-auto"
                        >
                            CRIAR CONTA <ArrowRight size={18} />
                        </Link>
                        <Link
                            to="/login"
                            data-testid="hero-cta-login"
                            className="pt-btn-ghost text-[14px] sm:text-[15px] py-4 px-7 inline-flex items-center justify-center gap-2 w-full sm:w-auto"
                        >
                            EXPLORAR <ArrowRight size={16} />
                        </Link>
                        <div className="absolute -top-5 right-2 sm:-top-6 sm:right-12 pointer-events-none">
                            <Sticker bg={PT.green} color="#fff" rotate={12} style={{ fontSize: 9.5, padding: "5px 9px" }}>
                                GRÁTIS ✱
                            </Sticker>
                        </div>
                        {/* Seta manuscrita a apontar para o CTA — só desktop */}
                        <div className="absolute -top-12 left-12 pointer-events-none hidden lg:block">
                            <HandArrow color={PT.red} w={76} h={62} rotate={155} dir="right" />
                        </div>
                        <div className="absolute -top-14 left-32 pointer-events-none hidden lg:block">
                            <Signature size={20} rotate={-8} color={PT.red}>começa aqui!</Signature>
                        </div>
                        {/* Traço rápido sob os botões */}
                        <div className="absolute -bottom-5 left-0 pointer-events-none hidden sm:block">
                            <QuickStroke color={PT.gold} w={120} h={18} rotate={-3} strokeWidth={5} />
                        </div>
                    </div>

                    {/* Avatares + live dot */}
                    <div className="flex flex-wrap items-center gap-4">
                        {avatars.length > 0 && (
                            <div className="flex -space-x-3" data-testid="hero-avatars">
                                {avatars.map((a, i) => (
                                    a.avatar_url ? (
                                        <img
                                            key={a.id || i}
                                            src={a.avatar_url}
                                            alt={a.name || ""}
                                            className="w-10 h-10 rounded-full object-cover"
                                            style={{ border: `3px solid ${PT.ink}`, boxShadow: `2px 2px 0 ${PT.ink}`, background: PT.bone }}
                                            loading="lazy"
                                        />
                                    ) : (
                                        <div
                                            key={a.id || i}
                                            className="w-10 h-10 rounded-full flex items-center justify-center font-black text-[12px]"
                                            style={{
                                                background: [PT.red, PT.gold, PT.green, PT.azul, PT.ink][i % 5],
                                                color: i % 5 === 1 ? PT.ink : "#fff",
                                                border: `3px solid ${PT.ink}`,
                                                boxShadow: `2px 2px 0 ${PT.ink}`,
                                            }}
                                        >
                                            {(a.name || "?").charAt(0).toUpperCase()}
                                        </div>
                                    )
                                ))}
                            </div>
                        )}
                        <div className="flex items-center gap-2.5" data-testid="hero-live-counter">
                            <span className="relative flex h-3 w-3" aria-hidden>
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: PT.green }} />
                                <span className="relative inline-flex rounded-full h-3 w-3" style={{ background: PT.green, border: `2px solid ${PT.ink}` }} />
                            </span>
                            <div>
                                <p className="text-[15px] font-black leading-tight" style={{ color: PT.ink }}>
                                    {showOnlineCount ? `+${online.toLocaleString("pt-PT")}` : `+${total.toLocaleString("pt-PT")}`}
                                </p>
                                <p className="text-[11px] font-mono font-bold uppercase" style={{ letterSpacing: "0.10em", color: "rgba(10,10,10,0.60)" }}>
                                    {showOnlineCount ? "online agora" : "membros · à tua espera"}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* COLUNA IMAGEM */}
                <div className="relative order-1 lg:order-2 mb-2 lg:mb-0">
                    <div className="relative mx-auto" style={{ maxWidth: 460 }}>
                        <TapedPhoto
                            src={HERO_MAIN}
                            alt="Comunidade Lusorae"
                            rotate={-2}
                            w={460}
                            h={420}
                            style={{ width: "100%", maxWidth: 460, height: "auto", aspectRatio: "11/10" }}
                        />
                        {/* Sticker quote */}
                        <div className="absolute -bottom-4 sm:-bottom-6 -left-2 sm:-left-4 z-20 pointer-events-none">
                            <PosterCard bg={PT.green} color="#fff" rotate={-4} shadow={PT.ink} style={{ padding: "10px 14px", maxWidth: 200 }}>
                                <p className="font-black text-[12.5px] sm:text-[13.5px] leading-tight">
                                    “o sítio certo para seres tu, <span style={{ background: PT.gold, color: PT.ink, padding: "0 4px" }}>sem pedir desculpa</span>.”
                                </p>
                                <p className="mt-1 text-[9.5px] sm:text-[10px] font-mono uppercase font-bold" style={{ letterSpacing: "0.14em", opacity: 0.8 }}>
                                    — pessoas, não perfis
                                </p>
                            </PosterCard>
                        </div>
                        <div className="absolute -top-3 sm:-top-4 -right-3 sm:-right-4 z-20 pointer-events-none">
                            <StampCircle bg={PT.red} color="#fff" rotate={14} size={64}>
                                100%<br/>HUMANO
                            </StampCircle>
                        </div>
                        {/* Coordenadas — só desktop, ligadas ao stamp */}
                        <div className="absolute -top-1 right-12 z-30 pointer-events-none hidden lg:block">
                            <Coords lat="41.1579" lon="8.6291" rotate={-8} color={PT.ink} />
                        </div>
                        {/* Balão de fala flutuante — só desktop */}
                        <div className="absolute -left-10 top-1/3 z-30 pointer-events-none hidden xl:block">
                            <SpeechBubble color={PT.gold} ink={PT.ink} rotate={-6} w={140}>
                                Junta-te! ✱
                            </SpeechBubble>
                        </div>
                        {/* Assinatura manuscrita — bottom right */}
                        <div className="absolute -bottom-10 right-4 z-20 pointer-events-none hidden sm:block">
                            <Signature size={28} rotate={-4} color={PT.red}>
                                vive · partilha
                            </Signature>
                        </div>
                        <div className="absolute -bottom-2 -right-6 z-20 pointer-events-none hidden sm:block">
                            <DoodleHeart color={PT.red} size={36} rotate={-12} />
                        </div>
                    </div>
                </div>
            </div>

            {/* Trust badges */}
            <div className="mt-10 sm:mt-12 lg:mt-16 flex flex-wrap items-center justify-center gap-4 sm:gap-6 lg:gap-9 max-w-3xl mx-auto relative" data-testid="trust-badges">
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 pointer-events-none hidden sm:block">
                    <DoodleStar color={PT.gold} size={22} rotate={8} />
                </div>
                <TrustBadge icon={<Heart size={16} />} color={PT.red}>Feito em Portugal</TrustBadge>
                <TrustBadge icon={<Lock size={16} />} color={PT.azul}>Privacidade primeiro</TrustBadge>
                <TrustBadge icon={<MessageCircle size={16} />} color={PT.green}>Conversas reais</TrustBadge>
                <div className="absolute -bottom-3 left-0 right-0 flex justify-center pointer-events-none hidden sm:flex">
                    <DoodleUnderline color={PT.gold} w={280} h={10} />
                </div>
            </div>
        </section>
    );
}

function TrustBadge({ icon, color, children }) {
    return (
        <div className="flex items-center gap-2.5">
            <span
                className="inline-flex items-center justify-center"
                style={{
                    width: 32, height: 32, borderRadius: "50%",
                    background: color, color: "#fff",
                    border: `2.5px solid ${PT.ink}`,
                    boxShadow: `2px 2px 0 ${PT.ink}`,
                }}
            >
                {icon}
            </span>
            <span className="text-[13px] font-black uppercase" style={{ letterSpacing: "0.06em", color: PT.ink }}>
                {children}
            </span>
        </div>
    );
}

// =============================================================================
// STATS BAND — 4 cartões com contagens reais
// =============================================================================
function StatsBand({ stats }) {
    const items = [
        { value: stats?.total_users, fallback: 0, label: "membros · total", icon: <Users size={26} />, bg: PT.green, color: "#fff", testid: "stat-online" },
        { value: stats?.active_conversations, fallback: 0, label: "conversas · 1h", icon: <MessageCircle size={26} />, bg: PT.gold, color: PT.ink, testid: "stat-conversations" },
        { value: stats?.posts_today, fallback: 0, label: "posts · hoje", icon: <Calendar size={26} />, bg: PT.azul, color: "#fff", testid: "stat-posts" },
        { value: stats?.cities_active, fallback: stats?.communities_total, label: "cidades · ativas", icon: <Building2 size={26} />, bg: PT.red, color: "#fff", testid: "stat-cities" },
    ];
    return (
        <section className="px-5 sm:px-8 lg:px-16 py-10 sm:py-14 lg:py-16" data-testid="stats-band">
            <div className="max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
                {items.map((it, i) => {
                    const v = (it.value != null && it.value > 0) ? it.value : (it.fallback ?? 0);
                    return (
                        <div
                            key={i}
                            data-testid={it.testid}
                            className="relative p-4 sm:p-5 lg:p-6"
                            style={{
                                background: it.bg, color: it.color,
                                border: `3px solid ${PT.ink}`,
                                boxShadow: `5px 5px 0 ${PT.ink}`,
                                transform: i % 2 === 0 ? "rotate(-0.6deg)" : "rotate(0.6deg)",
                                borderRadius: 16,
                            }}
                        >
                            <div className="flex items-center justify-between mb-2 sm:mb-3">
                                <span className="opacity-90">{it.icon}</span>
                                <DoodleZigzag color={it.color === "#fff" ? PT.gold : PT.ink} w={40} h={12} />
                            </div>
                            <p className="font-black tabular-nums leading-none" style={{ fontSize: "clamp(28px, 4vw, 44px)", textShadow: it.color === "#fff" ? `2px 2px 0 ${PT.ink}` : "none" }}>
                                {Number(v).toLocaleString("pt-PT")}
                            </p>
                            <p className="mt-1.5 sm:mt-2 text-[10.5px] sm:text-[11.5px] font-mono font-black uppercase" style={{ letterSpacing: "0.08em", opacity: 0.92 }}>
                                {it.label}
                            </p>
                            {/* Mini carimbo "LIVE!" só na primeira card */}
                            {i === 0 && (
                                <div className="absolute -top-3 -right-3 pointer-events-none hidden sm:block">
                                    <StampTag bg={PT.red} color="#fff" rotate={-12} size={10}>LIVE!</StampTag>
                                </div>
                            )}
                            {/* Mini carimbo "HOJE!" na terceira (posts hoje) */}
                            {i === 2 && (
                                <div className="absolute -top-3 -right-3 pointer-events-none hidden sm:block">
                                    <StampTag bg={PT.gold} color={PT.ink} rotate={10} size={10}>HOJE!</StampTag>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </section>
    );
}

// =============================================================================
// WHAT YOU'LL FIND — 5 categorias com círculos coloridos
// =============================================================================
function WhatYouFind() {
    const cats = [
        { icon: <MessageCircle size={28} />, label: "Conversas", sub: "sem filtros.", color: PT.red, testid: "cat-conversas" },
        { icon: <Users size={28} />, label: "Pessoas", sub: "que importam.", color: PT.gold, ink: true, testid: "cat-pessoas" },
        { icon: <Compass size={28} />, label: "Eventos", sub: "perto de ti.", color: PT.azul, testid: "cat-eventos" },
        { icon: <MapPin size={28} />, label: "Cidades", sub: "que conectam.", color: PT.green, testid: "cat-cidades" },
        { icon: <Sparkles size={28} />, label: "Comunidades", sub: "para todos.", color: PT.red, testid: "cat-comunidades" },
    ];
    return (
        <section className="px-5 sm:px-8 lg:px-16 py-12 sm:py-14 lg:py-20 relative" data-testid="what-you-find">
            <div className="max-w-7xl mx-auto">
                <div className="text-center mb-10 sm:mb-12 relative inline-block left-1/2 -translate-x-1/2">
                    <Kicker color={PT.red} className="mb-2 block">// O QUE VAIS ENCONTRAR</Kicker>
                    <h2
                        className="font-black tracking-[-0.03em]"
                        style={{ fontSize: "clamp(30px, 5vw, 56px)", lineHeight: 0.98, color: PT.ink }}
                    >
                        O que vais encontrar por{" "}
                        <span style={{
                            display: "inline-block",
                            background: PT.gold,
                            padding: "0 0.10em",
                            border: `3px solid ${PT.ink}`,
                            boxShadow: `4px 4px 0 ${PT.ink}`,
                            transform: "rotate(-1deg)",
                        }}>
                            aqui.
                        </span>
                    </h2>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-5 gap-6 sm:gap-7 lg:gap-4 relative">
                    {/* Seta a apontar para "Conversas" */}
                    <div className="absolute -top-10 left-2 pointer-events-none hidden lg:block">
                        <HandArrow color={PT.red} w={66} h={56} rotate={-15} dir="down" />
                    </div>
                    <div className="absolute -top-8 left-16 pointer-events-none hidden lg:block">
                        <Signature size={20} rotate={-6} color={PT.red}>começa por aqui</Signature>
                    </div>
                    {/* Sparkles entre categorias */}
                    <div className="absolute top-6 left-[39%] pointer-events-none hidden lg:block">
                        <DoodleSparkles color={PT.gold} size={30} rotate={20} />
                    </div>
                    <div className="absolute top-2 left-[78%] pointer-events-none hidden lg:block">
                        <DoodleCross color={PT.red} size={20} rotate={12} />
                    </div>
                    {cats.map((c, i) => (
                        <div key={i} className="text-center" data-testid={c.testid}>
                            <div
                                className="mx-auto mb-3 inline-flex items-center justify-center"
                                style={{
                                    width: 68, height: 68, borderRadius: "50%",
                                    background: c.color, color: c.ink ? PT.ink : "#fff",
                                    border: `3.5px solid ${PT.ink}`,
                                    boxShadow: `4px 4px 0 ${PT.ink}`,
                                    transform: `rotate(${i % 2 === 0 ? -3 : 3}deg)`,
                                }}
                            >
                                {c.icon}
                            </div>
                            <p className="font-black text-[15px] sm:text-[16px] mb-0.5" style={{ color: PT.ink }}>{c.label}</p>
                            <p className="text-[12px] sm:text-[12.5px] font-mono font-bold" style={{ color: "rgba(10,10,10,0.60)" }}>{c.sub}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

// =============================================================================
// EXPLORE CITIES — 3 fotos lado a lado + texto
// =============================================================================
function ExploreCities() {
    const cities = [
        { src: HERO_CITY_1, name: "Porto", code: "PRT", coords: { lat: "41.15", lon: "8.61" }, stampBg: PT.gold, sBg: PT.gold, sCol: PT.ink, color: PT.red, rotate: -2 },
        { src: HERO_CITY_2, name: "Lisboa", code: "LIS", coords: { lat: "38.71", lon: "9.13" }, stampBg: PT.green, sBg: PT.green, sCol: "#fff", color: PT.green, rotate: 1.5 },
        { src: HERO_CITY_3, name: "Algarve", code: "ALG", coords: { lat: "37.01", lon: "7.93" }, stampBg: PT.red, sBg: PT.red, sCol: "#fff", color: PT.azul, rotate: -1 },
    ];
    return (
        <section className="px-5 sm:px-8 lg:px-16 py-12 sm:py-14 lg:py-20" data-testid="explore-cities">
            <div className="max-w-7xl mx-auto rounded-3xl relative" style={{ background: "#fff", border: `3.5px solid ${PT.ink}`, boxShadow: `6px 6px 0 ${PT.ink}` }}>
                {/* Canto dobrado decorativo */}
                <PaperFoldCorner size={26} color="rgba(10,10,10,0.10)" corner="top-right" style={{ borderRadius: "0 24px 0 0" }} />

                <div className="grid lg:grid-cols-[0.9fr_1.4fr] gap-7 sm:gap-8 lg:gap-10 p-6 sm:p-8 lg:p-10 items-center">
                    {/* Texto */}
                    <div className="order-2 lg:order-1">
                        <Kicker color={PT.green} className="mb-2">// PORTUGAL · LOCAL</Kicker>
                        <h2
                            className="font-black tracking-[-0.03em] mb-4"
                            style={{ fontSize: "clamp(28px, 4vw, 48px)", lineHeight: 0.98, color: PT.ink }}
                        >
                            Explora a tua{" "}
                            <Highlight color="#FFEB3B" rotate={-2}>
                                <span style={{ color: PT.ink }}>cidade.</span>
                            </Highlight>
                        </h2>
                        <p className="text-[14.5px] sm:text-[15px] font-medium leading-relaxed mb-5" style={{ color: "rgba(10,10,10,0.72)" }}>
                            Descobre pessoas, eventos e lugares incríveis perto de ti — de Braga ao Algarve, da Madeira aos Açores.
                        </p>
                        <Link
                            to="/register"
                            data-testid="explore-cities-cta"
                            className="inline-flex items-center gap-2 font-black text-[13px] sm:text-[13.5px] uppercase"
                            style={{
                                color: PT.ink,
                                background: PT.gold,
                                padding: "10px 18px",
                                border: `2.5px solid ${PT.ink}`,
                                boxShadow: `3px 3px 0 ${PT.ink}`,
                                letterSpacing: "0.08em",
                                borderRadius: 999,
                            }}
                        >
                            Explorar cidades <ArrowRight size={16} />
                        </Link>

                        {/* Rota pontilhada decorativa — só desktop */}
                        <div className="absolute -bottom-3 left-1/3 z-10 pointer-events-none hidden lg:block">
                            <RouteDots
                                d="M 0 30 Q 60 0 120 30 T 240 30"
                                color={PT.red}
                                w={260} h={50}
                            />
                        </div>
                    </div>

                    {/* Mosaico de fotos com identidade de cidade */}
                    <div className="grid grid-cols-3 gap-3 lg:gap-4 relative order-1 lg:order-2">
                        {cities.map((c, i) => (
                            <CityPhoto
                                key={c.name}
                                src={c.src}
                                city={c.name}
                                code={c.code}
                                coords={c.coords}
                                rotate={c.rotate}
                                stampBg={c.stampBg}
                                stickerBg={c.sBg}
                                stickerColor={c.sCol}
                                postColor={c.color}
                                index={i}
                            />
                        ))}
                        <div className="absolute -top-5 -right-5 pointer-events-none hidden sm:block">
                            <DoodleStar color={PT.red} size={40} rotate={12} />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

function CityPhoto({ src, city, code, coords, rotate, stickerBg, stickerColor = PT.ink, postColor = PT.red, index = 0 }) {
    return (
        <div className="relative">
            <div
                className="relative overflow-hidden"
                style={{
                    border: `2.5px solid ${PT.ink}`,
                    boxShadow: `3px 3px 0 ${PT.ink}`,
                    transform: `rotate(${rotate}deg)`,
                    borderRadius: 8,
                    aspectRatio: "3/4",
                }}
            >
                <img src={src} alt={city} className="w-full h-full object-cover" loading="lazy" />
                {/* Canto dobrado */}
                <PaperFoldCorner size={16} corner="bottom-right" color="rgba(255,255,255,0.30)" />
            </div>
            {/* Selo postal moderno PT — só desktop nos cantos opostos */}
            <div
                className="absolute z-20 pointer-events-none hidden sm:block"
                style={{
                    top: -14,
                    [index % 2 === 0 ? "left" : "right"]: -10,
                }}
            >
                <PostStamp city={city} code={code} value="0.85€" color={postColor} rotate={index % 2 === 0 ? -6 : 6} size={62} />
            </div>
            {/* Sticker base com nome (mobile + desktop) */}
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
                <Sticker bg={stickerBg} color={stickerColor} rotate={-4} style={{ fontSize: 10, padding: "5px 10px" }}>
                    📍 {city}
                </Sticker>
            </div>
            {/* Coords — só desktop */}
            <div className="absolute -bottom-9 left-1/2 -translate-x-1/2 z-10 pointer-events-none hidden lg:block">
                <Coords lat={coords.lat} lon={coords.lon} color={PT.ink} rotate={0} />
            </div>
        </div>
    );
}

// =============================================================================
// HOW IT WORKS — 4 passos timeline
// =============================================================================
function HowItWorks() {
    const steps = [
        { n: 1, title: "Escolhe a tua cidade.", sub: "Conecta-te com o que está perto.", color: PT.red, icon: <MapPin size={22} /> },
        { n: 2, title: "Descobre pessoas e eventos.", sub: "Explora a tua comunidade.", color: PT.gold, ink: true, icon: <Users size={22} /> },
        { n: 3, title: "Participa na conversa.", sub: "Partilha ideias, opiniões, experiências reais.", color: PT.azul, icon: <MessageCircle size={22} /> },
        { n: 4, title: "Cria presença local.", sub: "Faz parte da tua cidade. De verdade.", color: PT.green, icon: <Heart size={22} /> },
    ];
    return (
        <section className="px-5 sm:px-8 lg:px-16 py-12 sm:py-14 lg:py-20 relative" data-testid="how-it-works">
            <div className="absolute top-10 right-10 pointer-events-none hidden lg:block">
                <DoodleSpiral color={PT.gold} size={64} rotate={-12} />
            </div>
            <div className="max-w-7xl mx-auto">
                <div className="mb-8 sm:mb-10">
                    <Kicker color={PT.azul} className="mb-2">// COMO FUNCIONA</Kicker>
                    <h2
                        className="font-black tracking-[-0.03em]"
                        style={{ fontSize: "clamp(30px, 5vw, 56px)", lineHeight: 0.98, color: PT.ink }}
                    >
                        4 passos.{" "}
                        <span style={{
                            display: "inline-block",
                            background: PT.red,
                            color: "#fff",
                            padding: "0 0.10em",
                            border: `3px solid ${PT.ink}`,
                            boxShadow: `4px 4px 0 ${PT.ink}`,
                            transform: "rotate(-1deg)",
                            WebkitTextStroke: `0.5px ${PT.ink}`,
                        }}>
                            Sem mistério.
                        </span>
                    </h2>
                </div>

                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 lg:gap-6 relative">
                    {steps.map((s, i) => (
                        <div
                            key={s.n}
                            className="relative p-5 lg:p-6"
                            data-testid={`step-${s.n}`}
                            style={{
                                background: "#fff",
                                border: `3px solid ${PT.ink}`,
                                boxShadow: `5px 5px 0 ${PT.ink}`,
                                borderRadius: 18,
                                transform: i % 2 === 0 ? "rotate(-0.8deg)" : "rotate(0.8deg)",
                            }}
                        >
                            <PaperFoldCorner size={18} corner="top-right" color="rgba(10,10,10,0.10)" style={{ borderRadius: "0 18px 0 0" }} />
                            <div className="flex items-center gap-3 mb-3">
                                <span
                                    className="inline-flex items-center justify-center font-black text-[18px]"
                                    style={{
                                        width: 42, height: 42, borderRadius: "50%",
                                        background: s.color, color: s.ink ? PT.ink : "#fff",
                                        border: `3px solid ${PT.ink}`,
                                        boxShadow: `2px 2px 0 ${PT.ink}`,
                                    }}
                                >
                                    {s.n}
                                </span>
                                <span style={{ color: s.color }}>{s.icon}</span>
                            </div>
                            <p className="font-black text-[16.5px] leading-tight mb-1" style={{ color: PT.ink }}>
                                {s.title}
                            </p>
                            <p className="text-[13.5px] font-medium leading-relaxed" style={{ color: "rgba(10,10,10,0.65)" }}>
                                {s.sub}
                            </p>
                        </div>
                    ))}

                    {/* Post-it sobre o passo 3 — só desktop */}
                    <div className="absolute z-20 pointer-events-none hidden lg:block" style={{ top: -22, right: "23%" }}>
                        <PostIt color="#FFE066" rotate={-6} w={150}>
                            ✨ aqui é onde<br/>começa a magia
                        </PostIt>
                    </div>
                </div>

                {/* Faixa de azulejos — separador decorativo */}
                <div className="mt-12 sm:mt-14 flex justify-center overflow-hidden">
                    <AzulejoBorder count={8} size={32} />
                </div>
            </div>
        </section>
    );
}

// =============================================================================
// PORTUGAL MAP — imagem ilustrada (Nano Banana · estilo fanzine PT)
// =============================================================================
function PortugalMap() {
    return (
        <section className="px-5 sm:px-8 lg:px-16 py-12 sm:py-14 lg:py-20 relative" style={{ background: PT.bone }} data-testid="portugal-map">
            <div className="max-w-7xl mx-auto grid lg:grid-cols-[1fr_1.1fr_1fr] gap-8 sm:gap-10 items-center">
                {/* COLUNA ESQ — título */}
                <div className="order-1">
                    <Kicker color={PT.red} className="mb-2">// PORTUGAL · CONECTADO</Kicker>
                    <h2
                        className="font-black tracking-[-0.03em] mb-3 sm:mb-4"
                        style={{ fontSize: "clamp(28px, 3.8vw, 44px)", lineHeight: 0.98, color: PT.ink }}
                    >
                        De norte a sul,<br/>cada cidade tem{" "}
                        <span style={{
                            display: "inline-block",
                            color: PT.red,
                            textShadow: `2px 2px 0 ${PT.gold}`,
                            WebkitTextStroke: `0.8px ${PT.ink}`,
                        }}>
                            voz.
                        </span>
                    </h2>
                    <p className="text-[14px] sm:text-[14.5px] font-medium leading-relaxed" style={{ color: "rgba(10,10,10,0.72)" }}>
                        Continente, ilhas e diáspora. Onde houver portugueses, há Lusorae.
                    </p>
                </div>

                {/* MAPA — imagem gerada com cidades já marcadas */}
                <div className="relative mx-auto order-2 w-full" style={{ maxWidth: 380 }}>
                    <div
                        className="relative overflow-hidden"
                        style={{
                            border: `3px solid ${PT.ink}`,
                            boxShadow: `5px 5px 0 ${PT.ink}`,
                            borderRadius: 12,
                            background: PT.cream,
                            transform: "rotate(-1deg)",
                        }}
                    >
                        <img
                            src={PORTUGAL_MAP}
                            alt="Mapa de Portugal — Braga, Porto, Coimbra, Lisboa, Évora, Faro, Funchal, Ponta Delgada"
                            className="block w-full h-auto"
                            loading="lazy"
                        />
                    </div>
                    {/* Doodle decorativo */}
                    <div className="absolute -top-4 -right-3 z-10 pointer-events-none hidden sm:block">
                        <DoodleStar color={PT.red} size={42} rotate={14} />
                    </div>
                    {/* Bilhete de evento sobreposto — só desktop */}
                    <div className="absolute -bottom-4 -left-8 z-20 pointer-events-none hidden lg:block">
                        <Ticket
                            title="Festa do Bairro"
                            place="Lisboa"
                            date="24 jun"
                            color={PT.green}
                            rotate={-6}
                            w={210}
                        />
                    </div>
                    {/* Coords no canto */}
                    <div className="absolute -bottom-3 right-4 z-20 pointer-events-none hidden sm:block">
                        <Coords lat="39.69" lon="8.13" rotate={2} color={PT.ink} />
                    </div>
                </div>

                {/* COLUNA DIR — quote */}
                <div className="relative order-3">
                    <PosterCard bg="#fff" color={PT.ink} rotate={-2} shadow={PT.ink} style={{ padding: "20px 22px", border: `3px solid ${PT.ink}` }}>
                        <p className="font-black text-[20px] leading-tight tracking-tight mb-1.5" style={{ color: PT.ink }}>
                            Bairro a bairro.
                        </p>
                        <p className="font-black text-[20px] leading-tight tracking-tight mb-1.5" style={{ color: PT.red }}>
                            Mesa a mesa.
                        </p>
                        <p className="font-black text-[20px] leading-tight tracking-tight" style={{ color: PT.green }}>
                            Conversa a conversa.
                        </p>
                        <p className="mt-3 text-[10.5px] font-mono font-bold uppercase" style={{ letterSpacing: "0.14em", color: "rgba(10,10,10,0.55)" }}>
                            — manifesto · linha 03
                        </p>
                    </PosterCard>
                </div>
            </div>
        </section>
    );
}

// =============================================================================
// FEITO PARA PESSOAS — secção preta com 6 features
// =============================================================================
function FeitoParaPessoas() {
    const features = [
        { label: "Sem doomscroll", sub: "infinito.", color: PT.gold },
        { label: "Sem algoritmos", sub: "agressivos.", color: PT.red },
        { label: "Sem manipulação", sub: "de atenção.", color: PT.green },
        { label: "Sem números", sub: "para vaidade.", color: PT.azul },
        { label: "Foco no local", sub: "primeiro.", color: PT.gold },
        { label: "Apagar conta", sub: "num clique.", color: PT.red },
    ];
    return (
        <section className="px-5 sm:px-8 lg:px-16 py-12 sm:py-14 lg:py-20" data-testid="feito-para-pessoas">
            <div
                className="max-w-7xl mx-auto p-6 sm:p-8 lg:p-12 relative overflow-hidden"
                style={{
                    background: "#fff",
                    color: PT.ink,
                    border: `4px solid ${PT.ink}`,
                    boxShadow: `6px 6px 0 ${PT.red}`,
                    borderRadius: 24,
                }}
            >
                <div className="absolute -top-10 -right-10 z-0 pointer-events-none opacity-15">
                    <GiantAsterisk color={PT.red} size={220} rotate={12} />
                </div>

                <div className="relative z-10">
                    <Kicker color={PT.red} className="mb-2">// PRINCÍPIO · CORE</Kicker>
                    <h2
                        className="font-black tracking-[-0.03em] mb-7 sm:mb-8"
                        style={{ fontSize: "clamp(28px, 5.5vw, 60px)", lineHeight: 1.05, color: PT.ink }}
                    >
                        <span style={{
                            display: "inline-block",
                            transform: "rotate(-1deg)",
                            textShadow: `3px 3px 0 ${PT.gold}`,
                        }}>FEITO PARA{" "}
                            <Highlight color="#FFEB3B" rotate={-1}>
                                <span style={{ color: PT.ink }}>PESSOAS.</span>
                            </Highlight>
                        </span><br/>
                        <span style={{
                            display: "inline-block",
                            color: PT.red,
                            transform: "rotate(1deg)",
                            textShadow: `3px 3px 0 ${PT.gold}`,
                            marginTop: 6,
                        }}>NÃO PARA ALGORITMOS.</span>
                    </h2>
                    <p className="text-[14.5px] sm:text-[15px] font-medium leading-relaxed max-w-2xl mb-8 sm:mb-9" style={{ color: "rgba(10,10,10,0.72)" }}>
                        Acreditamos numa rede social diferente. Sem truques, sem manipulação, sem pressa.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                        {features.map((f, i) => (
                            <div
                                key={i}
                                className="flex items-start gap-3"
                                data-testid={`principle-${i}`}
                            >
                                <span
                                    className="inline-flex items-center justify-center text-[14px] font-black shrink-0"
                                    style={{
                                        width: 32, height: 32, borderRadius: "50%",
                                        background: f.color, color: PT.ink,
                                        border: `2px solid ${PT.ink}`,
                                        boxShadow: `2px 2px 0 ${PT.ink}`,
                                    }}
                                >
                                    ✓
                                </span>
                                <div>
                                    <p className="font-black text-[14.5px] sm:text-[15px] leading-tight" style={{ color: PT.ink }}>{f.label}</p>
                                    <p className="text-[12px] sm:text-[12.5px] font-mono font-bold uppercase mt-0.5" style={{ color: "rgba(10,10,10,0.55)", letterSpacing: "0.08em" }}>
                                        {f.sub}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Assinatura manuscrita inferior */}
                    <div className="mt-9 sm:mt-10 flex items-end justify-between gap-4 flex-wrap">
                        <Signature size={32} rotate={-3} color={PT.red}>
                            — a comunidade Lusorae
                        </Signature>
                        <span className="text-[10px] font-mono font-black uppercase" style={{ letterSpacing: "0.20em", color: "rgba(10,10,10,0.55)" }}>
                            EST. 2026 · LISBOA
                        </span>
                    </div>
                </div>

                {/* Recibo flutuante — só desktop */}
                <div className="absolute z-20 pointer-events-none hidden xl:block" style={{ top: 32, right: -10 }}>
                    <Receipt
                        rotate={6}
                        w={170}
                        lines={[
                            { label: "Truques", value: "0,00€" },
                            { label: "Anúncios", value: "0,00€" },
                            { label: "Algoritmo", value: "0,00€" },
                            { label: "Ruído", value: "0,00€" },
                            { label: "Comunidade", value: "∞" },
                        ]}
                        total="GRÁTIS"
                    />
                </div>
            </div>
        </section>
    );
}

// =============================================================================
// FAQ — accordion simples
// =============================================================================
function Faq({ openFaq, setOpenFaq }) {
    const items = [
        { q: "O que é o Lusorae?", a: "Uma rede social portuguesa feita para conversas reais entre pessoas reais — focada na presença local, comunidade e cidades. Sem algoritmo agressivo, sem doomscroll, sem ruído." },
        { q: "O Lusorae é gratuito?", a: "Sim, completamente. Criar conta, participar, conversar e descobrir é grátis para sempre. Existe também o Lusorae+ para quem quer mais personalização — mas é opcional." },
        { q: "Os meus dados estão seguros?", a: "Sim. Cumprimos integralmente o RGPD (Regulamento Geral de Proteção de Dados) e a Lei n.º 58/2019. Os teus dados são teus — podes exportá-los ou apagar a conta a qualquer momento." },
        { q: "Como funciona o sistema de cidades?", a: "Cada utilizador associa-se à sua cidade portuguesa (~300 cidades disponíveis). O conteúdo, eventos e pessoas perto de ti aparecem com prioridade — para fomentar conexões locais reais." },
        { q: "Existe aplicação móvel?", a: "Por agora estamos focados na web responsiva (mobile + desktop). Uma app nativa iOS/Android está no roadmap para 2026." },
    ];
    return (
        <section className="px-5 sm:px-8 lg:px-16 py-12 sm:py-14 lg:py-20" data-testid="faq">
            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-8 sm:mb-10">
                    <Kicker color={PT.green} className="mb-2 inline-block">// PERGUNTAS · FREQUENTES</Kicker>
                    <h2
                        className="font-black tracking-[-0.03em]"
                        style={{ fontSize: "clamp(28px, 4.5vw, 52px)", lineHeight: 0.98, color: PT.ink }}
                    >
                        Boas{" "}
                        <span style={{
                            display: "inline-block",
                            background: PT.gold,
                            padding: "0 0.10em",
                            border: `3px solid ${PT.ink}`,
                            boxShadow: `4px 4px 0 ${PT.ink}`,
                            transform: "rotate(-1deg)",
                        }}>
                            perguntas?
                        </span>
                    </h2>
                    {/* Linha de azulejos sob o título */}
                    <div className="mt-6 sm:mt-8 flex justify-center overflow-hidden">
                        <AzulejoBorder count={5} size={28} />
                    </div>
                </div>

                <div className="space-y-3">
                    {items.map((it, i) => {
                        const open = openFaq === i;
                        return (
                            <button
                                key={i}
                                type="button"
                                onClick={() => setOpenFaq(open ? null : i)}
                                data-testid={`faq-item-${i}`}
                                className="w-full text-left"
                                style={{
                                    background: open ? PT.gold : "#fff",
                                    border: `3px solid ${PT.ink}`,
                                    boxShadow: open ? `5px 5px 0 ${PT.red}` : `4px 4px 0 ${PT.ink}`,
                                    borderRadius: 14,
                                    padding: "16px 20px",
                                    transition: "all 0.2s",
                                }}
                            >
                                <div className="flex items-center justify-between gap-4">
                                    <span className="font-black text-[15.5px] leading-tight" style={{ color: PT.ink }}>
                                        {it.q}
                                    </span>
                                    <ChevronDown
                                        size={20}
                                        style={{
                                            color: PT.ink,
                                            transform: open ? "rotate(180deg)" : "rotate(0deg)",
                                            transition: "transform 0.2s",
                                            flexShrink: 0,
                                        }}
                                    />
                                </div>
                                {open && (
                                    <p className="mt-3 text-[14px] font-medium leading-relaxed" style={{ color: "rgba(10,10,10,0.78)" }}>
                                        {it.a}
                                    </p>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}

// =============================================================================
// FINAL CTA — barra de chamada à ação
// =============================================================================
function FinalCta() {
    return (
        <section className="px-5 sm:px-8 lg:px-16 pb-14 sm:pb-16 lg:pb-24" data-testid="final-cta">
            <div
                className="max-w-7xl mx-auto p-6 sm:p-8 lg:p-12 relative overflow-hidden"
                style={{
                    background: PT.red,
                    color: "#fff",
                    border: `4px solid ${PT.ink}`,
                    boxShadow: `6px 6px 0 ${PT.gold}`,
                    borderRadius: 24,
                }}
            >
                {/* Fundo ilustrado — mesa comunitária PT */}
                <img
                    src={CTA_BG}
                    alt=""
                    aria-hidden
                    className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                    style={{ opacity: 0.62, mixBlendMode: "multiply" }}
                    loading="lazy"
                />
                {/* Overlay vermelho mais leve — deixa ver mais a ilustração */}
                <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                        background: `linear-gradient(105deg, ${PT.red}E6 0%, ${PT.red}B3 45%, ${PT.red}80 100%)`,
                    }}
                    aria-hidden
                />

                <div className="absolute -top-12 -right-12 z-0 pointer-events-none opacity-30">
                    <GiantAsterisk color={PT.gold} size={240} rotate={-14} />
                </div>
                <div className="absolute top-6 right-1/3 z-0 pointer-events-none hidden lg:block">
                    <DoodleSparkles color={PT.gold} size={56} rotate={18} />
                </div>

                <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 lg:gap-8">
                    <div className="max-w-2xl">
                        <Kicker color={PT.gold} className="mb-2">// PRONTO?</Kicker>
                        <h2
                            className="font-black tracking-[-0.03em]"
                            style={{ fontSize: "clamp(26px, 4.5vw, 52px)", lineHeight: 1.0 }}
                        >
                            Pronto para fazer parte da{" "}
                            <span style={{
                                display: "inline-block",
                                background: PT.gold,
                                color: PT.ink,
                                padding: "0 0.10em",
                                border: `3px solid ${PT.ink}`,
                                boxShadow: `4px 4px 0 ${PT.ink}`,
                                transform: "rotate(-1deg)",
                                WebkitTextStroke: `0.5px ${PT.ink}`,
                            }}>
                                comunidade?
                            </span>
                        </h2>
                        <p className="mt-3 sm:mt-4 text-[14.5px] sm:text-[15px] font-medium leading-relaxed" style={{ color: "rgba(255,255,255,0.85)" }}>
                            Junta-te à rede social portuguesa feita para pessoas. <strong className="font-black">30 segundos. Grátis. Para sempre.</strong>
                        </p>
                        {/* Assinatura */}
                        <div className="mt-4 hidden sm:block">
                            <Signature size={30} rotate={-4} color="#fff">
                                ✱ vemo-nos lá dentro
                            </Signature>
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 shrink-0 w-full lg:w-auto">
                        <Link
                            to="/register"
                            data-testid="final-cta-register"
                            className="inline-flex items-center justify-center gap-2 font-black text-[14px] sm:text-[15px] uppercase"
                            style={{
                                background: "#fff",
                                color: PT.red,
                                padding: "16px 24px",
                                border: `3px solid ${PT.ink}`,
                                boxShadow: `5px 5px 0 ${PT.gold}`,
                                letterSpacing: "0.08em",
                                borderRadius: 999,
                            }}
                        >
                            Criar conta grátis <ArrowRight size={18} />
                        </Link>
                        <Link
                            to="/login"
                            data-testid="final-cta-login"
                            className="inline-flex items-center justify-center gap-2 font-black text-[13.5px] sm:text-[14px] uppercase"
                            style={{
                                background: "transparent",
                                color: "#fff",
                                padding: "14px 22px",
                                border: `2.5px solid #fff`,
                                letterSpacing: "0.08em",
                                borderRadius: 999,
                            }}
                        >
                            Entrar <ArrowRight size={16} />
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
}
