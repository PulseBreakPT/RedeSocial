import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { DynamicWord } from "../components/DynamicWord";
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

            <div className="grid lg:grid-cols-[1.1fr_1fr] relative">
                {/* ================================================================
                    PAINEL ESQUERDO — POSTER URBANO
                ================================================================= */}
                <PosterLeft />

                {/* ================================================================
                    PAINEL DIREITO — FORMULÁRIO (revista moderna)
                ================================================================= */}
                <div className="relative px-6 sm:px-10 lg:px-16 pt-12 lg:pt-16 pb-16" style={{ background: PT.cream }}>
                    {/* Doodle decorativo no canto */}
                    <div className="absolute top-8 right-8 hidden sm:block">
                        <DoodleStar color={PT.gold} size={52} rotate={18} />
                    </div>
                    <div className="absolute top-1/2 -left-3 hidden lg:block">
                        <DoodleScribble color={PT.azul} w={120} h={50} style={{ transform: "rotate(-6deg)" }} />
                    </div>

                    <div className="relative max-w-md mx-auto lg:mx-0 z-10">
                        {/* CABEÇALHO REVISTA */}
                        <div className="flex items-center justify-between mb-7">
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

                        {/* TITULO GIGANTE com drop cap "O" */}
                        <h2
                            className="font-black tracking-[-0.04em]"
                            style={{ fontSize: "clamp(56px, 8vw, 96px)", lineHeight: 0.86, color: PT.ink }}
                        >
                            <span style={{ display: "inline-block", color: PT.red, transform: "rotate(-3deg)", textShadow: `4px 4px 0 ${PT.gold}` }}>
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

                        {/* COLOFÃO / Rodapé legal */}
                        <div
                            className="mt-12 pt-6 relative"
                            style={{ borderTop: `3px solid ${PT.ink}` }}
                        >
                            <Kicker color={PT.ink} className="mb-3">// LETRA MIÚDA — TERMOS &amp; PRIVACIDADE</Kicker>
                            <p className="text-[11.5px] font-medium leading-relaxed" style={{ color: "rgba(10,10,10,0.65)" }}>
                                Ao entrar concordas com os{" "}
                                <Link to="/legal/terms" className="underline underline-offset-2 font-bold" style={{ color: PT.ink }}>Termos</Link>{" "}
                                e a{" "}
                                <Link to="/legal/privacy" className="underline underline-offset-2 font-bold" style={{ color: PT.ink }}>Política de Privacidade</Link>.
                            </p>
                            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-bold uppercase" style={{ letterSpacing: "0.08em", color: "rgba(10,10,10,0.55)" }}>
                                <Link to="/legal" className="hover:underline">Centro Legal</Link>
                                <span aria-hidden>·</span>
                                <Link to="/legal/terms" className="hover:underline">Termos</Link>
                                <span aria-hidden>·</span>
                                <Link to="/legal/privacy" className="hover:underline">Privacidade</Link>
                                <span aria-hidden>·</span>
                                <Link to="/legal/cookies" className="hover:underline">Cookies</Link>
                                <span aria-hidden>·</span>
                                <Link to="/legal/community" className="hover:underline">Diretrizes</Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* TAPE rodapé */}
            <div className="pt-tape h-3 w-full" />

            <AuthStyles />
        </div>
    );
}

// =============================================================================
// PAINEL ESQUERDO — POSTER URBANO denso (vermelho)
// =============================================================================
function PosterLeft() {
    return (
        <div
            className="relative overflow-hidden isolate pt-grain min-h-[640px] lg:min-h-[calc(100vh-60px)]"
            style={{ background: PT.red, color: "#fff" }}
            data-testid="brand-panel"
        >
            {/* Asterisco gigante (canto sup. esq.) */}
            <div className="absolute -top-10 -left-12 z-0">
                <GiantAsterisk color={PT.gold} size={340} rotate={-8} />
            </div>

            {/* Faixa "manchete" dourada (atrás) */}
            <div
                className="absolute top-[24%] -left-10 z-0"
                style={{
                    width: "120%",
                    height: 70,
                    background: PT.gold,
                    transform: "rotate(-3deg)",
                    boxShadow: `inset 0 0 0 3px ${PT.ink}`,
                }}
                aria-hidden
            />

            {/* Conteúdo principal layered */}
            <div className="relative z-10 p-8 sm:p-12 lg:p-14 flex flex-col gap-6 h-full">
                {/* ROW topo: logo + stamp + sticker */}
                <div className="flex items-start justify-between gap-4">
                    <h1 className="font-black tracking-tight text-[34px] leading-none flex items-baseline gap-2" style={{ color: PT.ink }}>
                        <span style={{ color: PT.gold, fontSize: 30, textShadow: `2px 2px 0 ${PT.ink}` }}>✱</span>
                        <span style={{ textShadow: `3px 3px 0 ${PT.gold}` }}>lusorae</span>
                    </h1>
                    <div className="flex items-start gap-3">
                        <Sticker bg={PT.gold} color={PT.ink} rotate={-8}>🇵🇹 FEITO EM PT</Sticker>
                        <StampCircle bg={PT.ink} color={PT.gold} rotate={12} size={78}>
                            EDIÇÃO<br/>Nº &nbsp;{new Date().getFullYear() % 100}
                        </StampCircle>
                    </div>
                </div>

                {/* MANCHETE GIGANTE */}
                <div className="relative mt-2 mb-1">
                    <Kicker color={PT.ink} className="mb-2">// MANCHETE · CAPA</Kicker>
                    <h2
                        className="font-black tracking-[-0.04em]"
                        style={{
                            fontSize: "clamp(64px, 8vw, 128px)",
                            lineHeight: 0.82,
                            color: "#fff",
                            textShadow: `5px 5px 0 ${PT.ink}`,
                        }}
                    >
                        <span style={{ display: "inline-block", transform: "rotate(-2deg)" }}>VIVEMOS.</span><br />
                        <span style={{ display: "inline-block", transform: "rotate(1deg)", marginLeft: "0.4em", color: PT.ink, textShadow: `5px 5px 0 ${PT.gold}` }}>
                            PARTILHAMOS.
                        </span><br />
                        <span style={{
                            display: "inline-block",
                            background: PT.gold,
                            color: PT.ink,
                            padding: "0 0.12em",
                            transform: "rotate(-1deg)",
                            boxShadow: `6px 6px 0 ${PT.ink}`,
                            marginTop: 8,
                        }}>
                            LUSORAE.
                        </span>
                    </h2>
                </div>

                {/* COLAGEM: foto colada + cartões sobrepostos */}
                <div className="relative mt-6 flex flex-wrap items-start gap-8 lg:gap-12 pl-2">
                    {/* Foto colada com fita */}
                    <div className="relative">
                        <TapedPhoto
                            src={LOGIN_HERO}
                            alt="Porto · Douro ao anoitecer"
                            rotate={-5}
                            w={220}
                            h={270}
                        />
                        {/* Sticker sobre a foto */}
                        <div className="absolute -top-3 -right-6">
                            <StampCircle bg={PT.green} color="#fff" rotate={-18} size={70}>
                                REAL<br/>NÃO<br/>STOCK
                            </StampCircle>
                        </div>
                        {/* Pequena legenda */}
                        <div className="absolute -bottom-4 left-4">
                            <Sticker bg={PT.ink} color={PT.gold} rotate={-3} style={{ fontSize: 10, padding: "6px 12px" }}>
                                📍 PORTO · DOURO
                            </Sticker>
                        </div>
                    </div>

                    {/* Cartões "citação" + "manifesto" sobrepostos */}
                    <div className="relative pt-3 max-w-[360px] -ml-1 lg:ml-0">
                        <PosterCard bg={PT.ink} color="#fff" rotate={-2} shadow={PT.gold}>
                            <Kicker color={PT.gold} className="mb-2">// CITAÇÃO Nº 03</Kicker>
                            <p className="font-black tracking-tight text-[20px] leading-[1.1]">
                                “não é sobre quantos seguem.<br/>
                                é sobre <span style={{ color: PT.gold }}>quem está à mesa</span>.”
                            </p>
                            <p className="mt-3 text-[11px] font-mono uppercase font-bold" style={{ letterSpacing: "0.14em", color: "rgba(255,255,255,0.65)" }}>
                                — pessoas, não perfis
                            </p>
                        </PosterCard>

                        {/* Cartão verde sobreposto */}
                        <div className="absolute -bottom-10 -right-6 max-w-[280px]">
                            <PosterCard bg={PT.green} color="#fff" rotate={5} shadow={PT.ink} style={{ padding: "14px 16px" }}>
                                <p className="font-black text-[14.5px] leading-tight">
                                    A tua cidade tem <DynamicWord variant="hero" testId="login-hero-dynamic-word" />.
                                </p>
                            </PosterCard>
                        </div>

                        {/* Doodle arrow apontando para a foto */}
                        <DoodleArrow
                            color={PT.gold}
                            w={120} h={60}
                            style={{ position: "absolute", top: -40, left: -80, transform: "rotate(195deg)" }}
                        />
                    </div>
                </div>

                {/* FIGURAS GEOMÉTRICAS dispersas */}
                <div className="absolute top-[18%] right-12 z-0">
                    <GeoTriangle color={PT.gold} size={64} rotate={22} />
                </div>
                <div className="absolute top-[42%] right-[10%] z-0">
                    <GeoSquare color={PT.azul} size={42} rotate={26} />
                </div>
                <div className="absolute bottom-[24%] left-[40%] z-0">
                    <GeoCircle color={PT.gold} size={28} />
                </div>
                <div className="absolute bottom-[12%] left-[8%] z-0">
                    <DoodleExclamation color={PT.gold} size={70} rotate={-12} />
                </div>

                {/* RODAPÉ poster: tape diagonal + colofão */}
                <div className="mt-auto relative pt-10">
                    <div className="pt-tape absolute -left-12 right-0 h-2.5" style={{ transform: "rotate(-1.5deg)", bottom: 60 }} aria-hidden />
                    <div className="flex items-end justify-between gap-4 flex-wrap mt-4">
                        <div>
                            <Kicker color={PT.gold} className="mb-1">// MANIFESTO · LINHA 01</Kicker>
                            <p className="font-black text-[15px] leading-tight tracking-tight max-w-xs" style={{ color: PT.ink }}>
                                Sem algoritmo a empurrar. <span style={{ background: "#fff", padding: "1px 6px" }}>sem letra pequena</span>.
                            </p>
                        </div>
                        <p
                            className="text-[10.5px] font-mono font-bold uppercase"
                            style={{ letterSpacing: "0.20em", color: PT.ink }}
                        >
                            © LUSORAE · {new Date().getFullYear()} · IMPRESSO EM PT
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
