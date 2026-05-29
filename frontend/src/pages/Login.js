import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { DynamicWord } from "../components/DynamicWord";
import SiteFooter from "../components/SiteFooter";
import {
    PT, Sticker, StampCircle, TapedPhoto, PosterCard, Kicker, AuthStyles,
    DoodleArrow, DoodleScribble, DoodleStar, DoodleHeart, DoodleExclamation,
    GeoTriangle, GeoSquare, GeoCircle, GiantAsterisk,
} from "./auth/AuthDecor";

const LOGIN_HERO = "/hero/login.webp";

// =============================================================================
// LUSORAE — Login (cartaz urbano · fanzine portuguesa)
// =============================================================================
export default function Login() {
    const { user, login } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    if (user) return <Navigate to="/" replace />;

    const submit = async (e) => {
        e.preventDefault();
        setError("");
        setBusy(true);
        const res = await login(email, password);
        setBusy(false);
        if (!res.ok) setError(res.error);
        else navigate("/");
    };

    return (
        <div className="min-h-screen relative overflow-hidden" style={{ background: PT.cream }}>
            {/* ================================================================
                FAIXA TOPO ESTILO JORNAL — tape preta + dourada
            ================================================================= */}
            <div className="pt-tape h-3 w-full" />
            <div
                className="flex items-center justify-between px-5 sm:px-8 py-3"
                style={{ background: PT.ink, color: PT.bone, borderBottom: `3px solid ${PT.ink}` }}
            >
                <span className="font-mono text-[10.5px] sm:text-[11px] font-bold uppercase" style={{ letterSpacing: "0.20em", color: PT.gold }}>
                    LUSORAE // EDIÇÃO Nº {new Date().getFullYear()} // ENTRAR
                </span>
                <span className="hidden sm:inline font-mono text-[10.5px] font-bold uppercase" style={{ letterSpacing: "0.18em", color: "rgba(255,244,220,0.65)" }}>
                    PORTO · LISBOA · FUNCHAL · OLHÃO
                </span>
            </div>

            {/* Hero compacto SÓ em mobile (substitui o poster gigante) */}
            <MobileHero />

            <div className="grid lg:grid-cols-[1.05fr_1fr] relative">
                {/* PAINEL ESQUERDO — POSTER URBANO (apenas desktop) */}
                <PosterLeft />

                {/* PAINEL DIREITO — FORMULÁRIO */}
                <div className="relative px-5 sm:px-10 lg:px-14 pt-8 lg:pt-14 pb-16" style={{ background: PT.cream }}>
                    {/* Doodle decorativo no canto (desktop only) */}
                    <div className="absolute top-8 right-8 hidden lg:block">
                        <DoodleStar color={PT.gold} size={52} rotate={18} />
                    </div>
                    <div className="absolute top-1/2 -left-3 hidden lg:block">
                        <DoodleScribble color={PT.azul} w={120} h={50} style={{ transform: "rotate(-6deg)" }} />
                    </div>

                    <div className="relative max-w-md w-full mx-auto lg:mx-0 z-10">
                        {/* CABEÇALHO REVISTA (desktop only — mobile tem MobileHero) */}
                        <div className="hidden lg:flex items-center justify-between mb-7">
                            <div className="flex items-baseline gap-1.5">
                                <span style={{ color: PT.red, fontSize: 30 }} className="font-black leading-none">✱</span>
                                <span className="text-[22px] font-black tracking-tight" style={{ color: PT.ink }}>
                                    lusorae
                                </span>
                            </div>
                            <Sticker bg={PT.gold} color={PT.ink} rotate={6}>Pg. 01</Sticker>
                        </div>

                        {/* KICKER */}
                        <div className="flex items-center gap-3 mb-3">
                            <Kicker color={PT.red}>// SECÇÃO &nbsp;·&nbsp; ENTRAR</Kicker>
                            <DoodleArrow color={PT.red} w={60} h={28} style={{ transform: "rotate(-4deg)" }} />
                        </div>

                        {/* TITULO — cap a tamanhos seguros */}
                        <h2
                            className="font-black tracking-[-0.04em]"
                            style={{ fontSize: "clamp(38px, 5.2vw, 68px)", lineHeight: 0.92, color: PT.ink }}
                        >
                            <span style={{ display: "inline-block", color: PT.red, transform: "rotate(-2deg)", textShadow: `3px 3px 0 ${PT.gold}` }}>
                                Olá,
                            </span>
                            <br />
                            <span style={{ background: PT.gold, padding: "0 0.10em", boxShadow: `4px 4px 0 ${PT.ink}`, display: "inline-block", transform: "rotate(1deg)" }}>
                                bom regresso.
                            </span>
                        </h2>

                        <div className="mt-5 flex items-start gap-3">
                            <DoodleHeart color={PT.red} size={28} rotate={-12} style={{ flexShrink: 0, marginTop: 2 }} />
                            <p className="text-[15.5px] font-medium leading-relaxed" style={{ color: "rgba(10,10,10,0.78)" }}>
                                Continua a conversa onde a deixaste. <span style={{ background: PT.azul, color: "#fff", padding: "1px 6px", fontWeight: 800 }}>sem ruído</span>.
                            </p>
                        </div>

                        {/* FORM */}
                        <form onSubmit={submit} className="mt-9 space-y-5" data-testid="login-form">
                            <PtField label="Email" number="01">
                                <input
                                    data-testid="login-email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    autoComplete="email"
                                    inputMode="email"
                                    placeholder="tu@exemplo.com"
                                    className="pt-input"
                                />
                            </PtField>

                            <PtField
                                label="Palavra-passe"
                                number="02"
                                right={
                                    <Link
                                        to="/forgot"
                                        data-testid="goto-forgot"
                                        className="text-[12px] font-black uppercase underline underline-offset-4 decoration-2"
                                        style={{ color: PT.azul, textDecorationColor: PT.gold, letterSpacing: "0.06em" }}
                                    >
                                        Esqueci-me →
                                    </Link>
                                }
                            >
                                <input
                                    data-testid="login-password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    autoComplete="current-password"
                                    placeholder="••••••••"
                                    className="pt-input"
                                />
                            </PtField>

                            {error && (
                                <PosterCard bg={PT.red} color="#fff" rotate={-1} shadow={PT.ink} style={{ padding: "12px 16px" }}>
                                    <div data-testid="login-error" className="flex items-start gap-2 font-black text-[13.5px] uppercase" style={{ letterSpacing: "0.04em" }}>
                                        <span aria-hidden>⚠</span> <span>{error}</span>
                                    </div>
                                </PosterCard>
                            )}

                            <button
                                type="submit"
                                disabled={busy}
                                data-testid="login-submit"
                                className="pt-btn-primary w-full text-[16px] py-4 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {busy ? "A entrar…" : "ENTRAR →"}
                            </button>

                            {/* Disclaimer legal — entrada na conta */}
                            <p
                                data-testid="login-legal-disclaimer"
                                className="text-[11.5px] leading-relaxed font-medium text-center"
                                style={{ color: "rgba(10,10,10,0.55)" }}
                            >
                                Ao entrar, confirmas que aceitas os{" "}
                                <Link
                                    to="/legal/terms"
                                    className="font-black underline underline-offset-2"
                                    style={{ color: PT.ink, textDecorationColor: PT.gold, textDecorationThickness: 2 }}
                                >
                                    Termos
                                </Link>{" "}
                                e a{" "}
                                <Link
                                    to="/legal/privacy"
                                    className="font-black underline underline-offset-2"
                                    style={{ color: PT.ink, textDecorationColor: PT.gold, textDecorationThickness: 2 }}
                                >
                                    Política de Privacidade
                                </Link>{" "}
                                do Lusorae. Sessão protegida — sem rastreio entre sites.
                            </p>
                        </form>

                        {/* CTA registo + sticker */}
                        <div className="mt-8 flex items-center justify-between flex-wrap gap-3">
                            <p className="text-[14px] font-semibold" style={{ color: "rgba(10,10,10,0.72)" }}>
                                Sem conta?{" "}
                                <Link
                                    to="/register"
                                    data-testid="goto-register"
                                    className="font-black underline underline-offset-4 decoration-[3px]"
                                    style={{ color: PT.red, textDecorationColor: PT.gold }}
                                >
                                    Criar conta
                                </Link>
                            </p>
                            <Sticker bg={PT.green} color="#fff" rotate={-5}>30 SEG.</Sticker>
                        </div>
                    </div>
                </div>
            </div>

            {/* TAPE rodapé */}
            <div className="pt-tape h-3 w-full" />

            {/* SITE FOOTER (poster preto pesado) */}
            <SiteFooter />

            <AuthStyles />
        </div>
    );
}

// =============================================================================
// MOBILE HERO — substitui o poster gigante em <lg
// =============================================================================
function MobileHero() {
    return (
        <div className="lg:hidden relative overflow-hidden" style={{ background: PT.red, color: "#fff" }}>
            {/* Asterisco dourado canto */}
            <div className="absolute -top-8 -right-6 z-0">
                <GiantAsterisk color={PT.gold} size={160} rotate={-8} />
            </div>
            <div className="relative z-10 px-5 py-7">
                <div className="flex items-center justify-between mb-4">
                    <h1 className="font-black tracking-tight text-[24px] leading-none flex items-baseline gap-1.5" style={{ color: PT.ink }}>
                        <span style={{ color: PT.gold, fontSize: 22, textShadow: `2px 2px 0 ${PT.ink}` }}>✱</span>
                        <span style={{ textShadow: `2px 2px 0 ${PT.gold}` }}>lusorae</span>
                    </h1>
                    <Sticker bg={PT.gold} color={PT.ink} rotate={-6} style={{ fontSize: 10, padding: "6px 10px" }}>
                        🇵🇹 criado com ❤️ em Portugal
                    </Sticker>
                </div>
                <Kicker color={PT.gold} className="mb-1">// MANCHETE · ENTRAR</Kicker>
                <h2
                    className="font-black tracking-[-0.03em]"
                    style={{ fontSize: "clamp(32px, 8.5vw, 48px)", lineHeight: 1.05, color: "#fff", textShadow: `3px 3px 0 ${PT.ink}` }}
                >
                    <span style={{ display: "block" }}>Vivemos. Partilhamos.</span>
                    <span style={{ background: PT.gold, color: PT.ink, padding: "2px 0.10em", boxShadow: `3px 3px 0 ${PT.ink}`, display: "inline-block", marginTop: 14, textShadow: "none" }}>
                        Lusorae.
                    </span>
                </h2>
            </div>
        </div>
    );
}

// =============================================================================
// PAINEL ESQUERDO — POSTER URBANO denso (vermelho · desktop only)
// =============================================================================
function PosterLeft() {
    return (
        <div
            className="hidden lg:flex relative overflow-hidden isolate pt-grain flex-col"
            style={{ background: PT.red, color: "#fff", minHeight: "calc(100vh - 60px)" }}
            data-testid="brand-panel"
        >
            {/* Asterisco gigante (canto sup. esq.) */}
            <div className="absolute -top-10 -left-12 z-0">
                <GiantAsterisk color={PT.gold} size={300} rotate={-8} />
            </div>

            {/* Faixa "manchete" dourada (atrás) */}
            <div
                className="absolute top-[26%] -left-8 z-0"
                style={{
                    width: "115%",
                    height: 56,
                    background: PT.gold,
                    transform: "rotate(-3deg)",
                    boxShadow: `inset 0 0 0 3px ${PT.ink}`,
                }}
                aria-hidden
            />

            {/* Conteúdo principal layered */}
            <div className="relative z-10 p-10 xl:p-14 flex flex-col gap-5 flex-1">
                {/* ROW topo */}
                <div className="flex items-start justify-between gap-3">
                    <h1 className="font-black tracking-tight text-[30px] leading-none flex items-baseline gap-2" style={{ color: PT.ink }}>
                        <span style={{ color: PT.gold, fontSize: 26, textShadow: `2px 2px 0 ${PT.ink}` }}>✱</span>
                        <span style={{ textShadow: `3px 3px 0 ${PT.gold}` }}>lusorae</span>
                    </h1>
                    <div className="flex items-start gap-3">
                        <Sticker bg={PT.gold} color={PT.ink} rotate={-8}>🇵🇹 criado com ❤️ em Portugal</Sticker>
                        <StampCircle bg={PT.ink} color={PT.gold} rotate={12} size={68}>
                            EDIÇÃO<br/>Nº&nbsp;{new Date().getFullYear() % 100}
                        </StampCircle>
                    </div>
                </div>

                {/* MANCHETE — controlada para nunca sair do contentor */}
                <div className="relative">
                    <Kicker color={PT.ink} className="mb-2">// MANCHETE · CAPA</Kicker>
                    <h2
                        className="font-black tracking-[-0.04em]"
                        style={{
                            fontSize: "clamp(48px, 6vw, 96px)",
                            lineHeight: 0.86,
                            color: "#fff",
                            textShadow: `4px 4px 0 ${PT.ink}`,
                        }}
                    >
                        <span style={{ display: "inline-block", transform: "rotate(-2deg)" }}>VIVEMOS.</span><br />
                        <span style={{ display: "inline-block", transform: "rotate(1deg)", color: PT.ink, textShadow: `4px 4px 0 ${PT.gold}` }}>
                            PARTILHAMOS.
                        </span><br />
                        <span style={{
                            display: "inline-block",
                            background: PT.gold,
                            color: PT.ink,
                            padding: "0 0.10em",
                            transform: "rotate(-1deg)",
                            boxShadow: `5px 5px 0 ${PT.ink}`,
                            marginTop: 6,
                        }}>
                            LUSORAE.
                        </span>
                    </h2>
                </div>

                {/* COLAGEM */}
                <div className="relative mt-2 flex items-start gap-6 xl:gap-10 flex-wrap">
                    {/* Foto colada */}
                    <div className="relative shrink-0">
                        <TapedPhoto
                            src={LOGIN_HERO}
                            alt="Porto · Douro ao anoitecer"
                            rotate={-4}
                            w={180}
                            h={220}
                        />
                        <div className="absolute -top-3 -right-5">
                            <StampCircle bg={PT.green} color="#fff" rotate={-16} size={60}>
                                REAL<br/>NÃO<br/>STOCK
                            </StampCircle>
                        </div>
                        <div className="absolute -bottom-3 left-3">
                            <Sticker bg={PT.ink} color={PT.gold} rotate={-3} style={{ fontSize: 9.5, padding: "5px 10px" }}>
                                📍 PORTO · DOURO
                            </Sticker>
                        </div>
                    </div>

                    {/* Cartões "citação" + "manifesto" sobrepostos */}
                    <div className="relative flex-1 min-w-[240px] max-w-[340px] pt-2">
                        <PosterCard bg={PT.ink} color="#fff" rotate={-2} shadow={PT.gold} style={{ padding: "14px 16px" }}>
                            <Kicker color={PT.gold} className="mb-1.5">// CITAÇÃO Nº 03</Kicker>
                            <p className="font-black tracking-tight text-[17px] leading-[1.15]">
                                “não é sobre quantos seguem.<br/>
                                é sobre <span style={{ color: PT.gold }}>quem está à mesa</span>.”
                            </p>
                            <p className="mt-2 text-[10.5px] font-mono uppercase font-bold" style={{ letterSpacing: "0.14em", color: "rgba(255,255,255,0.65)" }}>
                                — pessoas, não perfis
                            </p>
                        </PosterCard>

                        <div className="mt-4">
                            <PosterCard bg={PT.green} color="#fff" rotate={3} shadow={PT.ink} style={{ padding: "10px 14px" }}>
                                <p className="font-black text-[13.5px] leading-tight">
                                    A tua cidade tem <DynamicWord variant="hero" testId="login-hero-dynamic-word" />.
                                </p>
                            </PosterCard>
                        </div>
                    </div>
                </div>

                {/* FIGURAS GEOMÉTRICAS dispersas */}
                <div className="absolute top-[16%] right-10 z-0">
                    <GeoTriangle color={PT.gold} size={56} rotate={22} />
                </div>
                <div className="absolute top-[44%] right-[12%] z-0">
                    <GeoSquare color={PT.azul} size={36} rotate={26} />
                </div>
                <div className="absolute bottom-[28%] left-[44%] z-0">
                    <GeoCircle color={PT.gold} size={24} />
                </div>
                <div className="absolute bottom-[14%] left-[6%] z-0">
                    <DoodleExclamation color={PT.gold} size={56} rotate={-12} />
                </div>

                {/* RODAPÉ poster — texto BRANCO/DOURADO para contraste */}
                <div className="mt-auto relative pt-8">
                    <div className="flex items-end justify-between gap-4 flex-wrap">
                        <div className="max-w-[260px]">
                            <Kicker color={PT.gold} className="mb-1">// MANIFESTO · LINHA 01</Kicker>
                            <p className="font-black text-[14px] leading-snug tracking-tight" style={{ color: "#fff" }}>
                                Sem algoritmo a empurrar.{" "}
                                <span style={{ background: PT.ink, color: PT.gold, padding: "1px 6px" }}>
                                    sem letra pequena
                                </span>.
                            </p>
                        </div>
                        <p
                            className="text-[10px] font-mono font-bold uppercase shrink-0"
                            style={{ letterSpacing: "0.18em", color: PT.gold }}
                        >
                            © LUSORAE · {new Date().getFullYear()}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

// =============================================================================
// PtField — campo com "número de artigo" tipo revista
// =============================================================================
function PtField({ label, number, right, children }) {
    return (
        <div className="relative">
            <div className="flex items-end justify-between mb-2">
                <div className="flex items-baseline gap-2">
                    {number && (
                        <span
                            className="font-mono font-black text-[11px]"
                            style={{
                                color: PT.red,
                                letterSpacing: "0.10em",
                                background: PT.ink,
                                padding: "2px 6px",
                                borderRadius: 3,
                            }}
                        >
                            {number}
                        </span>
                    )}
                    <label className="text-[12px] font-black uppercase" style={{ letterSpacing: "0.12em", color: PT.ink }}>
                        {label}
                    </label>
                </div>
                {right}
            </div>
            {children}
        </div>
    );
}
