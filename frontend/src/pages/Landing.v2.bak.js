import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import {
    ArrowRight, MapPin, Lock, ChevronDown, Check, Loader2,
    MessageCircle, Calendar as CalendarIcon, Users as UsersIcon,
    Building2, Search, Hash, Bell, Heart, Send, Bookmark, Shield,
} from "lucide-react";
import {
    PT, Kicker, AuthStyles,
    DoodleArrow, DoodleStar, DoodleSparkles, DoodleScribble,
    DoodleHeart, DoodleZigzag, DoodleUnderline, TapedPhoto, HandNote,
} from "./auth/AuthDecor";
import SiteFooter from "../components/SiteFooter";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";

// Static landing illustrations (Nano Banana · Fev 2026 pivot)
const IMG = {
    hero:          `${process.env.PUBLIC_URL || ""}/hero/hero.webp`,
    mapaPoster:    `${process.env.PUBLIC_URL || ""}/hero/lusorae-mapa-poster.webp`,
    bairro:        `${process.env.PUBLIC_URL || ""}/hero/lusorae-bairro.webp`,
    cityLisboa:    `${process.env.PUBLIC_URL || ""}/hero/city-lisboa.webp`,
    cityPorto:     `${process.env.PUBLIC_URL || ""}/hero/city-porto.webp`,
    cityAlgarve:   `${process.env.PUBLIC_URL || ""}/hero/city-algarve.webp`,
    ctaCommunity:  `${process.env.PUBLIC_URL || ""}/hero/cta-community.webp`,
    manifesto:     `${process.env.PUBLIC_URL || ""}/hero/manifesto.webp`,
};

// =============================================================================
// LUSORAE — Landing pública  (Fev 2026 · pivot "mapa social vivo")
// Curadoria: mapa interactivo de cidades como protagonista do produto;
// CTA primário muda de "Criar conta" para "Reservar username" (waitlist).
// Visual deliberadamente mais sóbrio: paleta PT mantida, mas sem amarelo
// gratuito, sem doodles, sem stamp shadows pesadas. Foco no produto.
// =============================================================================

export default function Landing() {
    const { user, checking } = useAuth();
    const [pulse, setPulse] = useState(null);
    const [cities, setCities] = useState([]);
    const [activeCity, setActiveCity] = useState(null);
    const [openFaq, setOpenFaq] = useState(null);

    // Carrega stats curadas + cidades-âncora em paralelo
    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const [pulseRes, citiesRes] = await Promise.all([
                    api.get(`/landing/pulse`).then((r) => r.data).catch(() => null),
                    api.get(`/landing/cities`).then((r) => r.data).catch(() => null),
                ]);
                if (!mounted) return;
                if (pulseRes) setPulse(pulseRes);
                if (citiesRes?.cities) {
                    setCities(citiesRes.cities);
                    // Lisboa em destaque por defeito (capital social)
                    const lx = citiesRes.cities.find((c) => c.slug === "lisboa");
                    setActiveCity(lx || citiesRes.cities[0] || null);
                }
            } catch {/* silencioso */ }
        })();
        return () => { mounted = false; };
    }, []);

    if (!checking && user) return <Navigate to="/feed" replace />;

    return (
        <div className="min-h-screen relative pt-paper" style={{ background: PT.cream, color: PT.ink }} data-testid="landing-page">
            <TopNav />
            <Hero pulse={pulse} cities={cities} activeCity={activeCity} setActiveCity={setActiveCity} />
            <StatsStrip pulse={pulse} />
            <ProductSnapshots />
            <WhyNotFacebook />
            <HowItWorks />
            <PremiumCompact />
            <Faq openFaq={openFaq} setOpenFaq={setOpenFaq} />
            <FinalCta pulse={pulse} />
            <SiteFooter />
            <AuthStyles />
        </div>
    );
}

// =============================================================================
// TOP NAV — minimalista, sem amarelo
// =============================================================================
function NavLink({ to, children, testid }) {
    return (
        <Link
            to={to}
            data-testid={testid}
            className="text-[12.5px] font-bold uppercase tracking-[0.08em] hover:opacity-60 transition-opacity"
            style={{ color: PT.ink }}
        >
            {children}
        </Link>
    );
}

function TopNav() {
    return (
        <header className="relative z-30 border-b" style={{ borderColor: "rgba(10,10,10,0.08)" }}>
            <div className="hidden lg:flex items-center justify-between px-10 xl:px-14 py-5 max-w-[1400px] mx-auto">
                <div className="flex items-baseline gap-2">
                    <span style={{ color: PT.red, fontSize: 28 }} className="font-black leading-none">✱</span>
                    <span className="text-[22px] font-black tracking-tight" style={{ color: PT.ink }} data-testid="brand-logo">
                        lusorae
                    </span>
                    <span className="ml-3 text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded"
                          style={{ letterSpacing: "0.12em", background: PT.ink, color: PT.cream }}>
                        em pré-lançamento
                    </span>
                </div>
                <nav className="flex items-center gap-8">
                    <NavLink to="/manifesto" testid="nav-manifesto">Manifesto</NavLink>
                    <NavLink to="#mapa" testid="nav-mapa">Mapa</NavLink>
                    <NavLink to="#produto" testid="nav-produto">Produto</NavLink>
                    <NavLink to="#missao" testid="nav-missao">Missão</NavLink>
                </nav>
                <div className="flex items-center gap-3">
                    <Link to="/login" data-testid="nav-login"
                          className="text-[12.5px] font-bold uppercase px-4 py-2 tracking-[0.08em] hover:underline"
                          style={{ color: PT.ink }}>
                        Entrar
                    </Link>
                    <a href="#reservar" data-testid="nav-reservar"
                       className="text-[12.5px] font-black uppercase px-4 py-2.5 tracking-[0.08em] rounded-full transition"
                       style={{ background: PT.ink, color: PT.cream }}>
                        Reservar username
                    </a>
                </div>
            </div>
            <div className="lg:hidden flex items-center justify-between px-5 py-3.5">
                <div className="flex items-baseline gap-1.5">
                    <span style={{ color: PT.red, fontSize: 22 }} className="font-black leading-none">✱</span>
                    <span className="text-[18px] font-black tracking-tight" style={{ color: PT.ink }}>lusorae</span>
                </div>
                <a href="#reservar" data-testid="nav-reservar-mobile"
                   className="text-[11px] font-black uppercase px-3 py-2 tracking-[0.06em] rounded-full"
                   style={{ background: PT.ink, color: PT.cream }}>
                    Reservar
                </a>
            </div>
        </header>
    );
}

// =============================================================================
// HERO — Headline + Reserva (esquerda) · Mapa interactivo (direita)
// =============================================================================
function Hero({ pulse, cities, activeCity, setActiveCity }) {
    return (
        <section id="reservar" className="px-5 sm:px-8 lg:px-14 pt-8 sm:pt-12 lg:pt-16 pb-12 lg:pb-20 relative" data-testid="hero">
            {/* Doodle accents — desktop only */}
            <div className="hidden lg:block absolute top-12 left-[6%] opacity-90 pointer-events-none" aria-hidden="true">
                <DoodleStar color={PT.gold} size={48} rotate={-14} />
            </div>
            <div className="hidden lg:block absolute top-24 right-[4%] opacity-85 pointer-events-none" aria-hidden="true">
                <DoodleSparkles color={PT.red} size={52} rotate={12} />
            </div>

            <div className="max-w-[1400px] mx-auto grid lg:grid-cols-[1.05fr_1.1fr] gap-10 lg:gap-14 items-start relative">
                {/* COLUNA TEXTO + RESERVA */}
                <div className="order-2 lg:order-1 relative">
                    <div className="inline-block mb-5">
                        <span
                            data-testid="hero-kicker"
                            className="text-[10.5px] font-mono font-bold uppercase tracking-[0.20em] px-2.5 py-1 rounded"
                            style={{ background: "rgba(10,10,10,0.06)", color: PT.ink }}
                        >
                            ✱ rede social portuguesa · pré-lançamento
                        </span>
                    </div>

                    <h1
                        className="font-black tracking-[-0.035em] mb-5"
                        style={{ fontSize: "clamp(38px, 6.4vw, 76px)", lineHeight: 1.02, color: PT.ink }}
                        data-testid="hero-title"
                    >
                        O <span style={{ color: PT.red }}>mapa social vivo</span>
                        <br />
                        das{" "}
                        <span style={{
                            display: "inline",
                            backgroundImage: `linear-gradient(transparent 70%, ${PT.gold} 70%, ${PT.gold} 92%, transparent 92%)`,
                            paddingBottom: 2,
                        }}>cidades portuguesas.</span>
                    </h1>

                    <p className="text-[16px] sm:text-[17px] leading-relaxed mb-6 max-w-[560px]" style={{ color: "rgba(10,10,10,0.74)" }}>
                        Não vendemos Portugal inteiro. Vendemos <strong style={{ color: PT.ink }}>a tua cidade</strong> — bairro a bairro, mesa a mesa, conversa a conversa. Reserva o teu username antes do lançamento.
                    </p>

                    {/* WAITLIST FORM */}
                    <ReserveForm />

                    {/* Linha de prova social */}
                    <div className="mt-6 flex flex-wrap items-center gap-5 text-[12px] font-mono font-bold uppercase tracking-[0.08em]" style={{ color: "rgba(10,10,10,0.55)" }}>
                        <span className="flex items-center gap-1.5">
                            <Lock size={13} /> sem ads · sem doomscroll
                        </span>
                        <span className="hidden sm:flex items-center gap-1.5">
                            <Shield size={13} /> dados em PT · RGPD friendly
                        </span>
                    </div>
                </div>

                {/* COLUNA MAPA */}
                <div className="order-1 lg:order-2 relative" id="mapa">
                    {/* TapedPhoto fanzine collage — top-right overlap, desktop only */}
                    <div className="hidden lg:block absolute -top-6 -right-2 z-20 pointer-events-none" aria-hidden="true">
                        <TapedPhoto
                            src={IMG.hero}
                            alt=""
                            rotate={7}
                            w={150}
                            h={170}
                            tapeColor="rgba(255,204,0,0.85)"
                            tapeColor2="rgba(200,16,46,0.55)"
                        />
                    </div>

                    {/* DoodleArrow apontando para o mapa — desktop */}
                    <div className="hidden lg:block absolute -top-2 -left-14 z-10 pointer-events-none" aria-hidden="true">
                        <DoodleArrow color={PT.red} w={84} h={56} />
                    </div>

                    <div
                        className="relative p-4 sm:p-5 lg:p-6"
                        style={{
                            background: "#fff",
                            border: `2px solid ${PT.ink}`,
                            borderRadius: 18,
                            boxShadow: `4px 4px 0 ${PT.ink}`,
                        }}
                        data-testid="hero-map-card"
                    >
                        <div className="flex items-center justify-between mb-3 pb-3 border-b" style={{ borderColor: "rgba(10,10,10,0.10)" }}>
                            <div>
                                <p className="text-[9.5px] font-mono font-black uppercase tracking-[0.18em]" style={{ color: PT.red }}>
                                    Mapa · ao vivo
                                </p>
                                <p className="text-[13.5px] font-black mt-0.5" style={{ color: PT.ink }}>
                                    {cities.length > 0 ? `${cities.length} cidades-âncora` : "A carregar cidades…"}
                                </p>
                            </div>
                            <span className="flex items-center gap-1.5 text-[10.5px] font-mono font-bold uppercase tracking-[0.10em]" style={{ color: "rgba(10,10,10,0.6)" }}>
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: PT.red }} />
                                    <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: PT.red }} />
                                </span>
                                pulso
                            </span>
                        </div>

                        <PortugalMap cities={cities} activeCity={activeCity} onSelect={setActiveCity} />

                        {/* CITY DETAIL PANEL */}
                        <CityDetail city={activeCity} />
                    </div>

                    {/* HandNote por baixo do mapa */}
                    <div className="hidden lg:block absolute -bottom-6 -left-4 pointer-events-none" aria-hidden="true">
                        <HandNote color={PT.ink} rotate={-3} size={14}>
                            clica numa cidade ↗
                        </HandNote>
                    </div>
                </div>
            </div>
        </section>
    );
}

// =============================================================================
// RESERVE FORM — username + email → POST /api/waitlist/reserve
// =============================================================================
function ReserveForm() {
    const [username, setUsername] = useState("");
    const [email, setEmail] = useState("");
    const [availability, setAvailability] = useState(null); // {available, message}
    const [checking, setChecking] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState(null); // {position, username, already_reserved}
    const [error, setError] = useState("");

    // Debounced username availability
    useEffect(() => {
        const handle = setTimeout(async () => {
            if (!username || username.length < 2) {
                setAvailability(null);
                return;
            }
            setChecking(true);
            try {
                const { data } = await api.get(`/waitlist/check`, { params: { u: username.toLowerCase().trim() } });
                setAvailability(data);
            } catch {
                setAvailability(null);
            } finally {
                setChecking(false);
            }
        }, 320);
        return () => clearTimeout(handle);
    }, [username]);

    const canSubmit = useMemo(() => {
        return availability?.available && /\S+@\S+\.\S+/.test(email) && !submitting;
    }, [availability, email, submitting]);

    async function onSubmit(e) {
        e.preventDefault();
        if (!canSubmit) return;
        setSubmitting(true);
        setError("");
        try {
            const { data } = await api.post(`/waitlist/reserve`, {
                username: username.toLowerCase().trim(),
                email: email.trim().toLowerCase(),
            });
            setResult(data);
        } catch (err) {
            const msg = err?.response?.data?.detail || "Não foi possível reservar. Tenta novamente.";
            setError(msg);
        } finally {
            setSubmitting(false);
        }
    }

    if (result) {
        return (
            <div
                data-testid="reserve-success"
                className="p-5 sm:p-6 rounded-2xl"
                style={{
                    background: PT.green,
                    color: "#fff",
                    border: `2px solid ${PT.ink}`,
                    boxShadow: `4px 4px 0 ${PT.ink}`,
                }}
            >
                <div className="flex items-start gap-3">
                    <span
                        className="inline-flex items-center justify-center shrink-0 mt-0.5"
                        style={{ width: 32, height: 32, borderRadius: "50%", background: "#fff", color: PT.green }}
                    >
                        <Check size={18} strokeWidth={3} />
                    </span>
                    <div className="flex-1">
                        <p className="text-[10.5px] font-mono font-black uppercase tracking-[0.18em] opacity-90">
                            {result.already_reserved ? "Já tinhas reservado" : "Username reservado ✱"}
                        </p>
                        <p className="font-black text-[18px] sm:text-[20px] mt-1 leading-tight">
                            @{result.username}
                        </p>
                        <p className="text-[13.5px] mt-2 leading-relaxed opacity-95">
                            Estás na <strong>posição #{result.position}</strong> da waitlist. Vamos avisar-te por email quando abrirmos a tua cidade.
                        </p>
                        <button
                            type="button"
                            onClick={() => { setResult(null); setUsername(""); setEmail(""); setAvailability(null); }}
                            data-testid="reserve-another"
                            className="mt-3 text-[12px] font-bold uppercase tracking-[0.08em] underline opacity-90 hover:opacity-100"
                        >
                            Reservar outro
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    const statusColor = availability == null ? "rgba(10,10,10,0.45)"
        : availability.available ? PT.green : PT.red;

    return (
        <form onSubmit={onSubmit} className="flex flex-col gap-3" data-testid="reserve-form">
            <div
                className="flex items-center gap-0 overflow-hidden"
                style={{
                    background: "#fff",
                    border: `2px solid ${PT.ink}`,
                    borderRadius: 14,
                    boxShadow: `3px 3px 0 ${PT.ink}`,
                }}
            >
                <span className="pl-4 pr-1 text-[18px] font-black select-none" style={{ color: PT.ink }}>@</span>
                <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 24))}
                    placeholder="o-teu-username"
                    data-testid="reserve-username-input"
                    autoComplete="off"
                    className="flex-1 py-3.5 text-[16px] font-bold outline-none bg-transparent"
                    style={{ color: PT.ink }}
                />
                <span className="pr-3 text-[11px] font-mono font-bold uppercase tracking-[0.08em]" style={{ color: statusColor }}>
                    {checking ? (
                        <Loader2 size={14} className="animate-spin" />
                    ) : availability == null ? (
                        username.length >= 2 ? "" : ""
                    ) : availability.available ? (
                        <span className="flex items-center gap-1"><Check size={14} /> livre</span>
                    ) : (
                        availability.reason === "taken_user" || availability.reason === "taken_waitlist" ? "ocupado" : (availability.reason || "x")
                    )}
                </span>
            </div>

            <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="o-teu-email@cidade.pt"
                data-testid="reserve-email-input"
                autoComplete="email"
                className="py-3.5 px-4 text-[16px] font-bold outline-none"
                style={{
                    background: "#fff",
                    border: `2px solid ${PT.ink}`,
                    borderRadius: 14,
                    boxShadow: `3px 3px 0 ${PT.ink}`,
                    color: PT.ink,
                }}
            />

            <button
                type="submit"
                disabled={!canSubmit}
                data-testid="reserve-submit-btn"
                className="inline-flex items-center justify-center gap-2 py-4 px-6 text-[14px] font-black uppercase tracking-[0.08em] rounded-2xl transition disabled:cursor-not-allowed"
                style={{
                    background: canSubmit ? PT.red : "rgba(10,10,10,0.30)",
                    color: "#fff",
                    border: `2px solid ${PT.ink}`,
                    boxShadow: canSubmit ? `4px 4px 0 ${PT.ink}` : "none",
                    opacity: submitting ? 0.7 : 1,
                }}
            >
                {submitting ? (<><Loader2 size={16} className="animate-spin" /> A reservar…</>)
                            : (<>Reservar o meu username <ArrowRight size={16} /></>)}
            </button>

            {error && (
                <p data-testid="reserve-error" className="text-[13px] font-bold" style={{ color: PT.red }}>
                    {error}
                </p>
            )}

            <p className="text-[11.5px] font-mono leading-relaxed" style={{ color: "rgba(10,10,10,0.55)" }}>
                Sem spam. Avisamos-te quando a tua cidade abrir. Cancela quando quiseres.
            </p>
        </form>
    );
}

// =============================================================================
// PORTUGAL MAP — SVG estilizado (continente + ilhas) + pontos de cidade
// Clicáveis. Pulse animado no ponto activo.
// =============================================================================
function PortugalMap({ cities, activeCity, onSelect }) {
    const mainland = cities.filter((c) => !c.island);
    const islands = cities.filter((c) => c.island);

    const colorFor = (accent) => ({
        red: PT.red, gold: PT.gold, green: PT.green, azul: PT.azul,
    }[accent] || PT.red);

    return (
        <div className="relative w-full" style={{ aspectRatio: "5/7", maxWidth: 500, margin: "0 auto" }}>
            <svg
                viewBox="0 0 280 560"
                className="w-full h-full"
                role="img"
                aria-label="Mapa interactivo de Portugal — clica numa cidade"
                data-testid="portugal-svg-map"
            >
                {/* Fundo papel */}
                <rect x="0" y="0" width="280" height="560" fill={PT.cream} />

                {/* Linhas de coordenadas decorativas (cartografia) */}
                <g opacity="0.06" stroke={PT.ink} strokeWidth="0.5" style={{ pointerEvents: "none" }}>
                    {[100, 200, 300, 400, 500].map((y) => (
                        <line key={`h${y}`} x1="0" y1={y} x2="280" y2={y} strokeDasharray="2,4" />
                    ))}
                    {[70, 140, 210].map((x) => (
                        <line key={`v${x}`} x1={x} y1="0" x2={x} y2="560" strokeDasharray="2,4" />
                    ))}
                </g>

                {/* Continente — silhueta estilizada (hand-drawn fanzine) */}
                <path
                    d="M 95 28
                       Q 110 22, 130 28
                       L 152 38
                       Q 162 60, 158 90
                       L 172 130
                       Q 178 165, 168 200
                       L 178 240
                       Q 182 275, 170 305
                       L 178 345
                       Q 186 380, 176 415
                       L 188 445
                       Q 195 470, 178 488
                       L 145 502
                       L 110 503
                       Q 75 495, 65 475
                       L 65 445
                       Q 72 420, 62 395
                       L 65 360
                       Q 58 330, 65 300
                       L 56 268
                       Q 50 235, 62 205
                       L 55 168
                       Q 50 135, 64 100
                       L 60 70
                       Q 68 45, 95 28 Z"
                    fill="#fff"
                    stroke={PT.ink}
                    strokeWidth="2.2"
                    strokeLinejoin="round"
                    style={{ pointerEvents: "none" }}
                />

                {/* Rio Tejo (decorativo) */}
                <path
                    d="M 50 300 Q 90 318, 130 322 T 200 340"
                    fill="none"
                    stroke={PT.azul}
                    strokeWidth="1.4"
                    strokeDasharray="3,3"
                    opacity="0.55"
                    style={{ pointerEvents: "none" }}
                />

                {/* Madeira & Açores — caixas inset */}
                {islands.length > 0 && (
                    <g style={{ pointerEvents: "none" }}>
                        {islands.map((isl) => (
                            <g key={isl.slug} transform={`translate(${isl.x - 18}, ${isl.y - 18})`}>
                                <rect width="36" height="36" rx="4"
                                      fill="#fff" stroke={PT.ink} strokeWidth="1.5"
                                      strokeDasharray="3,3" />
                            </g>
                        ))}
                    </g>
                )}

                {/* Cidades — pontos clicáveis */}
                {[...mainland, ...islands].map((c) => {
                    const isActive = activeCity?.slug === c.slug;
                    const fill = colorFor(c.accent);
                    return (
                        <g
                            key={c.slug}
                            onClick={() => onSelect(c)}
                            style={{ cursor: "pointer", pointerEvents: "all" }}
                            data-testid={`map-city-${c.slug}`}
                            tabIndex={0}
                            role="button"
                            aria-label={`Ver ${c.name}`}
                            aria-pressed={isActive}
                            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(c); } }}
                        >
                            {/* Hit area transparente, alargada (para clique fácil incluindo no label) */}
                            <rect
                                x={c.x - 6}
                                y={c.y - 10}
                                width={Math.max(60, (c.name.length * 7) + 18)}
                                height={20}
                                fill="transparent"
                            />
                            {/* Ping ring (só na activa) */}
                            {isActive && (
                                <circle cx={c.x} cy={c.y} r="14" fill={fill} opacity="0.18" style={{ pointerEvents: "none" }}>
                                    <animate attributeName="r" from="6" to="20" dur="1.6s" repeatCount="indefinite" />
                                    <animate attributeName="opacity" from="0.45" to="0" dur="1.6s" repeatCount="indefinite" />
                                </circle>
                            )}
                            {/* Dot */}
                            <circle
                                cx={c.x}
                                cy={c.y}
                                r={isActive ? 7 : 5}
                                fill={fill}
                                stroke={PT.ink}
                                strokeWidth="1.6"
                                style={{ pointerEvents: "none" }}
                            />
                            {/* Label */}
                            <text
                                x={c.x + 11}
                                y={c.y + 4}
                                fontSize={isActive ? 12 : 10.5}
                                fontWeight={isActive ? 900 : 700}
                                fill={PT.ink}
                                style={{ fontFamily: "system-ui, -apple-system, sans-serif", pointerEvents: "none" }}
                            >
                                {c.name}
                            </text>
                        </g>
                    );
                })}

                {/* Legenda mini */}
                <g transform="translate(8, 540)" opacity="0.65">
                    <text fontSize="8" fontWeight="700" fill={PT.ink} fontFamily="monospace" letterSpacing="1">
                        PT · continente · madeira · açores
                    </text>
                </g>
            </svg>
        </div>
    );
}

// =============================================================================
// CITY DETAIL — painel sob o mapa com informação da cidade activa
// =============================================================================
function CityDetail({ city }) {
    if (!city) return null;
    return (
        <div
            className="mt-3 sm:mt-4 p-4 sm:p-5"
            data-testid={`city-detail-${city.slug}`}
            style={{
                background: PT.bone,
                border: `2px solid ${PT.ink}`,
                borderRadius: 14,
            }}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                    <p className="text-[9.5px] font-mono font-bold uppercase tracking-[0.18em]" style={{ color: "rgba(10,10,10,0.55)" }}>
                        {city.region}
                    </p>
                    <p className="font-black text-[20px] sm:text-[22px] mt-0.5" style={{ color: PT.ink }}>
                        {city.name}
                    </p>
                    <p className="text-[13px] mt-1 italic" style={{ color: "rgba(10,10,10,0.65)" }}>
                        {city.tag}
                    </p>
                </div>
                <span
                    className="text-[10px] font-mono font-black uppercase tracking-[0.10em] px-2 py-1 rounded shrink-0"
                    style={{ background: PT.ink, color: PT.cream }}
                >
                    A reservar
                </span>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4">
                <Stat label="Eventos indexados" value={city.events_count} icon={<CalendarIcon size={14} />} />
                <Stat label="Comunidades" value={city.communities_count} icon={<Building2 size={14} />} />
            </div>

            <p className="text-[12px] mt-3" style={{ color: "rgba(10,10,10,0.62)" }}>
                Quando o <strong>{city.name}</strong> abrir, recebes uma notificação por email se reservares o teu username em cima.
            </p>
        </div>
    );
}

function Stat({ label, value, icon }) {
    return (
        <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center justify-center shrink-0"
                  style={{ width: 28, height: 28, borderRadius: 8, background: "#fff", border: `1.5px solid ${PT.ink}`, color: PT.ink }}>
                {icon}
            </span>
            <div className="min-w-0">
                <p className="font-black text-[16px] leading-none tabular-nums" style={{ color: PT.ink }}>
                    {Number(value || 0).toLocaleString("pt-PT")}
                </p>
                <p className="text-[10px] font-mono font-bold uppercase tracking-[0.08em] mt-1" style={{ color: "rgba(10,10,10,0.55)" }}>
                    {label}
                </p>
            </div>
        </div>
    );
}

// =============================================================================
// STATS STRIP — métricas curadas (sem zeros)
// =============================================================================
function StatsStrip({ pulse }) {
    const items = [
        { value: pulse?.cities_supported, suffix: "", label: "Cidades suportadas",   accent: PT.red,   testid: "stat-cities" },
        { value: pulse?.events_indexed,   suffix: "", label: "Eventos indexados",     accent: PT.azul,  testid: "stat-events" },
        { value: pulse?.bairros_indexed,  suffix: "", label: "Bairros mapeados",      accent: PT.green, testid: "stat-bairros" },
        { value: pulse?.regions_covered,  suffix: "", label: "Regiões cobertas",      accent: PT.gold,  testid: "stat-regions" },
    ];
    return (
        <section className="px-5 sm:px-8 lg:px-14 py-10 sm:py-14" data-testid="stats-strip">
            <div className="max-w-[1400px] mx-auto">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-px"
                     style={{ background: "rgba(10,10,10,0.10)", border: `1.5px solid rgba(10,10,10,0.10)` }}>
                    {items.map((it, i) => (
                        <div key={i} className="px-5 sm:px-7 py-7 sm:py-9" style={{ background: PT.cream }} data-testid={it.testid}>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="block" style={{ width: 18, height: 3, background: it.accent }} />
                                <span className="text-[9.5px] font-mono font-black uppercase tracking-[0.18em]" style={{ color: "rgba(10,10,10,0.55)" }}>
                                    Real
                                </span>
                            </div>
                            <p className="font-black tabular-nums leading-none" style={{ fontSize: "clamp(36px, 5vw, 56px)", color: PT.ink }}>
                                {pulse ? Number(it.value || 0).toLocaleString("pt-PT") : "…"}
                                {it.suffix && <span className="text-[20px] ml-1 opacity-60">{it.suffix}</span>}
                            </p>
                            <p className="mt-2 text-[12.5px] font-bold" style={{ color: "rgba(10,10,10,0.72)" }}>
                                {it.label}
                            </p>
                        </div>
                    ))}
                </div>
                <p className="mt-4 text-[12px] font-mono" style={{ color: "rgba(10,10,10,0.50)" }}>
                    Atualizado em tempo real · sem números inventados · sem metricas de vaidade.
                </p>
            </div>
        </section>
    );
}

// =============================================================================
// PRODUCT SNAPSHOTS — mockups limpos: Feed, DMs, Eventos, Comunidades
// =============================================================================
function ProductSnapshots() {
    return (
        <section id="produto" className="px-5 sm:px-8 lg:px-14 py-14 sm:py-18 relative" data-testid="product-snapshots">
            {/* Doodle accent */}
            <div className="hidden lg:block absolute top-20 right-[6%] opacity-90 pointer-events-none" aria-hidden="true">
                <DoodleZigzag color={PT.gold} w={140} h={32} />
            </div>

            <div className="max-w-[1400px] mx-auto">
                <div className="max-w-2xl mb-10 sm:mb-12 relative">
                    <Kicker color={PT.red} className="mb-2">Produto · em pré-lançamento</Kicker>
                    <h2 className="font-black tracking-[-0.03em]" style={{ fontSize: "clamp(28px, 4.5vw, 48px)", lineHeight: 1.0, color: PT.ink }}>
                        Não é uma rede social genérica.<br />
                        É <span style={{ color: PT.red }}>infraestrutura social</span> para a tua cidade.
                    </h2>
                    <div className="mt-3">
                        <DoodleUnderline color={PT.gold} w={180} h={12} />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                    <SnapshotCard
                        kicker="Feed · curadoria local"
                        title="Vê o que se passa hoje no teu bairro."
                        sub="Posts ordenados por proximidade, não por algoritmo. Sem doomscroll."
                        testid="snap-feed"
                        image={IMG.cityPorto}
                        mockup={<FeedMockup />}
                    />
                    <SnapshotCard
                        kicker="Mensagens · conversas reais"
                        title="DMs limpas. Sem ads. Sem leituras forçadas."
                        sub="Tu controlas quem te escreve. E quando."
                        testid="snap-dms"
                        image={IMG.cityLisboa}
                        mockup={<DMsMockup />}
                    />
                    <SnapshotCard
                        kicker="Eventos · 200+ curados"
                        title="Cada festa, festival e feira em Portugal."
                        sub="Do São João ao Andanças. Do magusto à passagem de ano."
                        testid="snap-events"
                        image={IMG.cityAlgarve}
                        mockup={<EventsMockup />}
                    />
                    <SnapshotCard
                        kicker="Comunidades · bairro a bairro"
                        title="Encontra a tua mesa. Mesmo quando estás longe."
                        sub="Comunidades por cidade, freguesia, interesse."
                        testid="snap-communities"
                        image={IMG.ctaCommunity}
                        mockup={<CommunitiesMockup />}
                    />
                </div>
            </div>
        </section>
    );
}

function SnapshotCard({ kicker, title, sub, mockup, image, testid }) {
    return (
        <article
            data-testid={testid}
            className="relative p-5 sm:p-6 lg:p-7"
            style={{
                background: "#fff",
                border: `2px solid ${PT.ink}`,
                borderRadius: 18,
                boxShadow: `3px 3px 0 ${PT.ink}`,
            }}
        >
            {image && (
                <div
                    className="mb-4 -mt-2 -mx-2 sm:-mx-3 lg:-mx-4 overflow-hidden rounded-xl relative"
                    style={{ height: 140, border: `1.5px solid ${PT.ink}` }}
                >
                    <img
                        src={image}
                        alt=""
                        loading="lazy"
                        className="w-full h-full object-cover"
                        style={{ filter: "contrast(1.02) saturate(0.94)" }}
                    />
                    <span
                        className="absolute top-2 right-2 text-[9px] font-mono font-black uppercase tracking-[0.15em] px-2 py-1 rounded"
                        style={{ background: PT.ink, color: PT.cream, letterSpacing: "0.12em" }}
                    >
                        {kicker.split("·")[0].trim()}
                    </span>
                </div>
            )}
            <p className="text-[9.5px] font-mono font-black uppercase tracking-[0.18em]" style={{ color: PT.red }}>
                {kicker}
            </p>
            <h3 className="font-black mt-2 mb-2" style={{ fontSize: "clamp(20px, 2.2vw, 26px)", lineHeight: 1.1, color: PT.ink }}>
                {title}
            </h3>
            <p className="text-[14px] leading-relaxed mb-4" style={{ color: "rgba(10,10,10,0.68)" }}>
                {sub}
            </p>
            <div className="rounded-xl overflow-hidden" style={{ border: `1.5px solid rgba(10,10,10,0.10)`, background: PT.cream }}>
                {mockup}
            </div>
        </article>
    );
}

// ── Mockup limpos (Feed, DMs, Eventos, Comunidades) ─────────────────────────
function FeedMockup() {
    const posts = [
        { author: "Inês · Bairro Alto", avatar: PT.red,   text: "Quem alinha num bitoque rápido às 13h no Cervejaria Trindade?", time: "agora", likes: 12, comments: 4 },
        { author: "Tiago · Boavista",   avatar: PT.gold,  text: "Concerto surpresa amanhã no Hard Club. Avisem o pessoal do Porto ✱", time: "12m", likes: 38, comments: 9 },
        { author: "Maria · Coimbra",    avatar: PT.green, text: "Queima das fitas começa hoje. Vamos beber ginjinha na Praça da República?", time: "1h", likes: 21, comments: 6 },
    ];
    return (
        <div className="p-3 sm:p-4 space-y-3">
            {posts.map((p, i) => (
                <div key={i} className="flex gap-2.5 items-start">
                    <span className="shrink-0" style={{ width: 30, height: 30, borderRadius: "50%", background: p.avatar, border: `1.5px solid ${PT.ink}` }} />
                    <div className="flex-1 min-w-0">
                        <p className="text-[11.5px] font-black" style={{ color: PT.ink }}>{p.author} <span className="font-mono font-normal opacity-50">· {p.time}</span></p>
                        <p className="text-[12.5px] mt-0.5 leading-snug" style={{ color: "rgba(10,10,10,0.85)" }}>{p.text}</p>
                        <div className="flex items-center gap-3 mt-1.5 text-[10.5px] font-mono" style={{ color: "rgba(10,10,10,0.45)" }}>
                            <span className="flex items-center gap-1"><Heart size={11} /> {p.likes}</span>
                            <span className="flex items-center gap-1"><MessageCircle size={11} /> {p.comments}</span>
                            <span className="flex items-center gap-1"><Bookmark size={11} /></span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

function DMsMockup() {
    return (
        <div className="p-3 sm:p-4 flex gap-2.5">
            <div className="w-24 sm:w-28 shrink-0 space-y-2">
                {[
                    { name: "Inês", color: PT.red,   on: true },
                    { name: "Tasca Mãe", color: PT.gold,  on: true },
                    { name: "Sérgio", color: PT.azul,  on: false },
                    { name: "Bairro LX", color: PT.green, on: false },
                ].map((c, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                        <span className="block shrink-0" style={{ width: 22, height: 22, borderRadius: "50%", background: c.color, border: `1.2px solid ${PT.ink}` }} />
                        <div className="min-w-0 flex-1">
                            <p className="text-[10.5px] font-black truncate" style={{ color: PT.ink }}>{c.name}</p>
                            <p className="text-[8.5px] font-mono truncate" style={{ color: c.on ? PT.green : "rgba(10,10,10,0.40)" }}>
                                {c.on ? "online" : "ontem"}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
            <div className="flex-1 min-w-0 space-y-1.5">
                <Bubble side="left"  text="vamos beber café às 5 na Brasileira?" color={PT.bone} />
                <Bubble side="right" text="bora. levo o livro do Saramago" color={PT.azul} fg="#fff" />
                <Bubble side="left"  text="✓ até já" color={PT.bone} />
                <div className="flex items-center gap-1 mt-2 px-2 py-1.5 rounded" style={{ background: "#fff", border: `1px solid rgba(10,10,10,0.15)` }}>
                    <span className="text-[10px] font-mono flex-1" style={{ color: "rgba(10,10,10,0.40)" }}>Escrever…</span>
                    <Send size={11} style={{ color: PT.red }} />
                </div>
            </div>
        </div>
    );
}

function Bubble({ side, text, color, fg = PT.ink }) {
    return (
        <div className={`flex ${side === "right" ? "justify-end" : "justify-start"}`}>
            <span
                className="text-[10.5px] px-2.5 py-1.5 rounded-2xl max-w-[85%]"
                style={{ background: color, color: fg, border: `1px solid rgba(10,10,10,0.10)` }}
            >
                {text}
            </span>
        </div>
    );
}

function EventsMockup() {
    const evs = [
        { date: "24 jun", title: "Santo António · Alfama", subtitle: "Lisboa · arraial", color: PT.red },
        { date: "29 jun", title: "São Pedro · Sintra",      subtitle: "Sintra · sardinhas", color: PT.gold },
        { date: "11 jul", title: "NOS Alive",               subtitle: "Algés · festival", color: PT.azul },
    ];
    return (
        <div className="p-3 sm:p-4 space-y-2.5">
            {evs.map((e, i) => (
                <div key={i} className="flex gap-3 items-center p-2 rounded" style={{ background: "#fff", border: `1px solid rgba(10,10,10,0.10)` }}>
                    <span className="text-center shrink-0" style={{
                        width: 44, height: 44, borderRadius: 8,
                        background: e.color, color: "#fff",
                        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    }}>
                        <span className="text-[8.5px] font-mono font-bold uppercase tracking-[0.05em] opacity-80">
                            {e.date.split(" ")[1]}
                        </span>
                        <span className="text-[14px] font-black leading-none">{e.date.split(" ")[0]}</span>
                    </span>
                    <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-black truncate" style={{ color: PT.ink }}>{e.title}</p>
                        <p className="text-[10.5px] font-mono truncate" style={{ color: "rgba(10,10,10,0.55)" }}>{e.subtitle}</p>
                    </div>
                    <Bell size={12} style={{ color: "rgba(10,10,10,0.40)" }} />
                </div>
            ))}
        </div>
    );
}

function CommunitiesMockup() {
    const coms = [
        { name: "Alfama · vizinhos", members: "1.2k", color: PT.red },
        { name: "Tasqueiros do Porto", members: "856", color: PT.gold },
        { name: "Coimbra · estudantes", members: "2.1k", color: PT.green },
        { name: "Diáspora · Londres", members: "412", color: PT.azul },
    ];
    return (
        <div className="p-3 sm:p-4 grid grid-cols-2 gap-2">
            {coms.map((c, i) => (
                <div key={i} className="p-2.5 rounded" style={{ background: "#fff", border: `1px solid rgba(10,10,10,0.10)` }}>
                    <span className="block" style={{ width: 22, height: 22, borderRadius: 6, background: c.color, border: `1.2px solid ${PT.ink}` }} />
                    <p className="text-[11px] font-black mt-1.5 leading-tight" style={{ color: PT.ink }}>{c.name}</p>
                    <p className="text-[9.5px] font-mono mt-0.5" style={{ color: "rgba(10,10,10,0.50)" }}>{c.members} membros</p>
                </div>
            ))}
        </div>
    );
}

// =============================================================================
// WHY NOT FACEBOOK — secção missão / posicionamento
// =============================================================================
function WhyNotFacebook() {
    const pillars = [
        { kicker: "Algoritmo", title: "Vês o que está perto.", body: "Não vês o que dá engagement. Vês o que se passa na tua rua, no teu bairro, na tua cidade." },
        { kicker: "Ads", title: "Zero anúncios.", body: "O produto és tu — não o produto à venda. Vivemos de Lusorae+ opcional, não de leilões de atenção." },
        { kicker: "Dados", title: "Servidores em Portugal.", body: "RGPD-friendly por defeito. Exportas tudo. Apagas a conta num clique." },
        { kicker: "Tempo", title: "Sem doomscroll.", body: "O feed acaba. Quando vês tudo do dia, fecha. Não há \"mais um\" infinito." },
    ];
    return (
        <section id="missao" className="px-5 sm:px-8 lg:px-14 py-14 sm:py-20 relative overflow-hidden" style={{ background: PT.ink, color: PT.cream }} data-testid="why-not-facebook">
            {/* Background image (bairro) — confinada à direita, overlay forte para legibilidade */}
            <div
                className="hidden lg:block absolute top-0 right-0 bottom-0 w-1/2 pointer-events-none"
                aria-hidden="true"
                style={{
                    backgroundImage: `url(${IMG.bairro})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    opacity: 0.32,
                    filter: "grayscale(0.4) contrast(1.05)",
                    maskImage: "linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.55) 35%, rgba(0,0,0,0.85) 100%)",
                    WebkitMaskImage: "linear-gradient(90deg, transparent 0%, rgba(0,0,0,0.55) 35%, rgba(0,0,0,0.85) 100%)",
                }}
            />
            <div
                className="hidden lg:block absolute top-0 right-0 bottom-0 w-1/2 pointer-events-none"
                aria-hidden="true"
                style={{
                    background: `linear-gradient(90deg, ${PT.ink} 0%, rgba(10,10,10,0.82) 35%, rgba(10,10,10,0.45) 100%)`,
                }}
            />

            {/* DoodleHeart accent */}
            <div className="hidden lg:block absolute top-12 right-[8%] z-10 pointer-events-none" aria-hidden="true">
                <DoodleHeart color={PT.red} size={56} rotate={-8} />
            </div>

            <div className="max-w-[1400px] mx-auto relative z-10">
                <div className="max-w-2xl mb-10 sm:mb-12">
                    <p className="text-[10.5px] font-mono font-bold uppercase tracking-[0.20em] mb-3" style={{ color: PT.red }}>
                        Por que não somos o Facebook
                    </p>
                    <h2 className="font-black tracking-[-0.03em]" style={{ fontSize: "clamp(30px, 5vw, 56px)", lineHeight: 1.02, color: "#fff" }}>
                        Construímos uma rede social que{" "}
                        <span style={{
                            display: "inline",
                            backgroundImage: `linear-gradient(transparent 78%, ${PT.red} 78%, ${PT.red} 94%, transparent 94%)`,
                        }}>
                            não te quer agarrar
                        </span>{" "}
                        ao ecrã.
                    </h2>
                    <p className="text-[15px] leading-relaxed mt-4 max-w-[640px]" style={{ color: "rgba(255,255,255,0.78)" }}>
                        Lusorae é infraestrutura. Não é um aspirador de atenção. É uma forma de saberes o que se passa na cidade onde vives e nas pessoas com quem te cruzas.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
                    {pillars.map((p, i) => (
                        <div key={i} data-testid={`pillar-${i}`} className="border-t pt-5" style={{ borderColor: "rgba(255,255,255,0.18)" }}>
                            <p className="text-[10px] font-mono font-bold uppercase tracking-[0.18em]" style={{ color: PT.red }}>
                                {p.kicker}
                            </p>
                            <h3 className="font-black text-[20px] sm:text-[22px] mt-2 mb-2" style={{ color: "#fff" }}>
                                {p.title}
                            </h3>
                            <p className="text-[13.5px] leading-relaxed" style={{ color: "rgba(255,255,255,0.72)" }}>
                                {p.body}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

// =============================================================================
// HOW IT WORKS — 3 passos clean
// =============================================================================
function HowItWorks() {
    const steps = [
        { n: "01", title: "Reserva o teu username", sub: "30 segundos. Email + handle. Travas o nome antes que outra pessoa o leve.", accent: PT.red },
        { n: "02", title: "Avisamos-te quando abrirmos a tua cidade", sub: "Vamos abrindo cidade a cidade — Lisboa, Porto, Coimbra primeiro. Recebes notificação por email.", accent: PT.gold },
        { n: "03", title: "Entras no mapa social do teu bairro", sub: "Conversas, eventos, comunidades — tudo geolocalizado. Sem ads. Sem doomscroll.", accent: PT.green },
    ];
    return (
        <section className="px-5 sm:px-8 lg:px-14 py-14 sm:py-20 relative" data-testid="how-it-works">
            {/* Mapa poster fanzine como acento — desktop only */}
            <div className="hidden xl:block absolute top-20 right-[2%] z-0 pointer-events-none opacity-90" aria-hidden="true">
                <TapedPhoto
                    src={IMG.mapaPoster}
                    alt=""
                    rotate={-5}
                    w={170}
                    h={210}
                    tapeColor="rgba(14,77,146,0.78)"
                    tapeColor2="rgba(4,106,56,0.55)"
                />
            </div>

            <div className="max-w-[1400px] mx-auto relative z-10">
                <div className="max-w-2xl mb-10">
                    <Kicker color={PT.red} className="mb-2">Como funciona</Kicker>
                    <h2 className="font-black tracking-[-0.03em]" style={{ fontSize: "clamp(28px, 4.5vw, 48px)", lineHeight: 1.0, color: PT.ink }}>
                        Três passos. Sem mistério.
                    </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-px"
                     style={{ background: "rgba(10,10,10,0.10)", border: `1.5px solid rgba(10,10,10,0.10)` }}>
                    {steps.map((s, i) => (
                        <div key={i} data-testid={`step-${i + 1}`} className="p-6 sm:p-7" style={{ background: PT.cream }}>
                            <p className="text-[36px] font-black leading-none tabular-nums" style={{ color: s.accent }}>
                                {s.n}
                            </p>
                            <h3 className="font-black text-[18px] sm:text-[20px] mt-3 leading-tight" style={{ color: PT.ink }}>
                                {s.title}
                            </h3>
                            <p className="text-[13.5px] leading-relaxed mt-2" style={{ color: "rgba(10,10,10,0.68)" }}>
                                {s.sub}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

// =============================================================================
// PREMIUM COMPACT — secção pequena, não invasiva, no fundo
// =============================================================================
function PremiumCompact() {
    return (
        <section className="px-5 sm:px-8 lg:px-14 py-10 sm:py-14" data-testid="premium-compact">
            <div className="max-w-[1400px] mx-auto p-5 sm:p-6 lg:p-7 grid sm:grid-cols-[1fr_auto] gap-4 sm:gap-6 items-center"
                 style={{ background: "#fff", border: `2px solid ${PT.ink}`, borderRadius: 18 }}>
                <div>
                    <p className="text-[9.5px] font-mono font-black uppercase tracking-[0.20em]" style={{ color: PT.gold }}>
                        Lusorae+ · opcional
                    </p>
                    <h3 className="font-black mt-1" style={{ fontSize: "clamp(20px, 2.5vw, 26px)", color: PT.ink, lineHeight: 1.15 }}>
                        Apoia o projecto. Mantém-no sem ads.
                    </h3>
                    <p className="text-[13.5px] mt-1.5 leading-relaxed" style={{ color: "rgba(10,10,10,0.68)" }}>
                        4€/mês. Badges de early supporter, frames de avatar, prioridade no map roll-out. Não é pay-to-win — é pay-to-keep-it-clean.
                    </p>
                </div>
                <Link to="/premium" data-testid="premium-cta"
                      className="inline-flex items-center justify-center gap-2 py-3 px-5 text-[12.5px] font-black uppercase tracking-[0.08em] rounded-full"
                      style={{ background: PT.gold, color: PT.ink, border: `2px solid ${PT.ink}`, boxShadow: `3px 3px 0 ${PT.ink}` }}>
                    Saber mais <ArrowRight size={14} />
                </Link>
            </div>
        </section>
    );
}

// =============================================================================
// FAQ — accordion limpo, no fundo
// =============================================================================
function Faq({ openFaq, setOpenFaq }) {
    const items = [
        { q: "Porquê reservar um username agora?",
          a: "Estamos a abrir Lusorae cidade a cidade. Reservar agora trava o teu handle para sempre + entras na fila quando a tua cidade abrir. É grátis e leva 30 segundos." },
        { q: "Quando é que abre a minha cidade?",
          a: "Lisboa, Porto e Coimbra primeiro (Q2 2026). Depois Braga, Aveiro, Évora, Faro, Funchal, Ponta Delgada e as restantes cidades-âncora ao longo de 2026. Quando reservas o teu username, avisamos-te por email." },
        { q: "É grátis?",
          a: "Sim. Criar conta, conversar, descobrir eventos, entrar em comunidades — tudo grátis para sempre. Existe um Lusorae+ opcional (4€/mês) para quem quer apoiar o projecto." },
        { q: "Os meus dados ficam onde?",
          a: "Servidores em Portugal (UE). RGPD-friendly por defeito. Exportas tudo num clique. Apagas a conta num clique." },
        { q: "Que diferença há entre Lusorae e Facebook/Instagram?",
          a: "Não há algoritmo de engagement. Não há ads. Não há doomscroll. Vês o que está perto de ti — não o que prende mais retina. É infraestrutura social, não captura de atenção." },
        { q: "Posso usar fora de Portugal?",
          a: "Sim. A diáspora portuguesa tem comunidades dedicadas (Londres, Paris, Luxemburgo, Genebra, São Paulo, etc.). Estamos a desenhar uma camada \"Diáspora\" específica para 2026." },
    ];
    return (
        <section className="px-5 sm:px-8 lg:px-14 py-14 sm:py-20" data-testid="faq">
            <div className="max-w-3xl mx-auto">
                <div className="mb-8">
                    <Kicker color={PT.red} className="mb-2">FAQ</Kicker>
                    <h2 className="font-black tracking-[-0.03em]" style={{ fontSize: "clamp(28px, 4.5vw, 44px)", lineHeight: 1.0, color: PT.ink }}>
                        Perguntas que valem a pena.
                    </h2>
                </div>
                <div className="divide-y" style={{ borderColor: "rgba(10,10,10,0.10)" }}>
                    {items.map((it, i) => {
                        const open = openFaq === i;
                        return (
                            <button
                                key={i}
                                type="button"
                                onClick={() => setOpenFaq(open ? null : i)}
                                data-testid={`faq-item-${i}`}
                                className="w-full text-left py-5"
                                style={{ borderTop: i === 0 ? `1.5px solid rgba(10,10,10,0.10)` : "none", borderBottom: `1.5px solid rgba(10,10,10,0.10)` }}
                            >
                                <div className="flex items-center justify-between gap-4">
                                    <span className="font-black text-[15.5px] sm:text-[17px] leading-tight" style={{ color: PT.ink }}>
                                        {it.q}
                                    </span>
                                    <ChevronDown
                                        size={20}
                                        style={{ color: PT.ink, transform: open ? "rotate(180deg)" : "rotate(0)", transition: "transform 0.2s", flexShrink: 0 }}
                                    />
                                </div>
                                {open && (
                                    <p className="mt-3 text-[14px] leading-relaxed" style={{ color: "rgba(10,10,10,0.72)" }}>
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
// FINAL CTA — barra de chamada final
// =============================================================================
function FinalCta({ pulse }) {
    const reservations = pulse?.reservations_total || 0;
    return (
        <section className="px-5 sm:px-8 lg:px-14 pb-14 sm:pb-20" data-testid="final-cta">
            <div className="max-w-[1400px] mx-auto p-7 sm:p-10 lg:p-14 relative overflow-hidden"
                 style={{ background: PT.red, color: "#fff", border: `2px solid ${PT.ink}`, borderRadius: 22, boxShadow: `5px 5px 0 ${PT.ink}` }}>
                {/* Doodle sparkles */}
                <div className="absolute top-4 right-6 opacity-95 pointer-events-none" aria-hidden="true">
                    <DoodleSparkles color={PT.gold} size={64} rotate={-10} />
                </div>
                <div className="hidden sm:block absolute bottom-3 left-8 opacity-90 pointer-events-none" aria-hidden="true">
                    <DoodleStar color={PT.gold} size={42} rotate={18} />
                </div>

                <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                    <div className="max-w-2xl">
                        <p className="text-[10.5px] font-mono font-bold uppercase tracking-[0.20em]" style={{ color: PT.gold }}>
                            Última chamada antes do lançamento
                        </p>
                        <h2 className="font-black tracking-[-0.03em] mt-2" style={{ fontSize: "clamp(28px, 5vw, 52px)", lineHeight: 1.0 }}>
                            Reserva agora. Antes que o teu username seja levado.
                        </h2>
                        {reservations > 0 && (
                            <p className="text-[14px] mt-3 opacity-90">
                                Já há <strong>{reservations.toLocaleString("pt-PT")}</strong> {reservations === 1 ? "pessoa" : "pessoas"} na waitlist.
                            </p>
                        )}
                    </div>
                    <a href="#reservar" data-testid="final-cta-reservar"
                       className="inline-flex items-center justify-center gap-2 py-4 px-7 text-[14px] font-black uppercase tracking-[0.08em] rounded-full shrink-0"
                       style={{ background: "#fff", color: PT.red, border: `2px solid ${PT.ink}`, boxShadow: `4px 4px 0 ${PT.ink}` }}>
                        Reservar o meu username <ArrowRight size={16} />
                    </a>
                </div>
            </div>
        </section>
    );
}
