import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import SiteFooter from "../components/SiteFooter";
import {
    PT, Sticker, StampCircle, TapedPhoto, PosterCard, Kicker, AuthStyles,
    DoodleArrow, DoodleScribble, DoodleStar, DoodleHeart, DoodleExclamation,
    DoodleSpiral, DoodleZigzag, DoodleCircleNote, DoodleUnderline, DoodleSparkles,
    DoodleLongArrow, DoodleCross, HandNote,
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

            <div className="grid lg:grid-cols-[1.05fr_1fr] relative">
                {/* PAINEL ESQUERDO — POSTER URBANO (desktop + mobile) */}
                <PosterLeft />

                {/* PAINEL DIREITO — FORMULÁRIO */}
                <div className="relative px-5 sm:px-10 lg:px-14 pt-8 lg:pt-14 pb-16" style={{ background: PT.cream }}>
                    {/* Doodles decorativos — só sm+ para não poluir mobile */}
                    <div className="absolute top-8 right-8 pointer-events-none hidden sm:block">
                        <DoodleStar color={PT.gold} size={52} rotate={18} />
                    </div>
                    <div className="absolute top-1/2 -left-3 pointer-events-none hidden sm:block">
                        <DoodleScribble color={PT.azul} w={120} h={50} style={{ transform: "rotate(-6deg)" }} />
                    </div>
                    <div className="absolute top-24 right-20 pointer-events-none hidden sm:block">
                        <DoodleSparkles color={PT.red} size={48} rotate={6} />
                    </div>
                    <div className="absolute bottom-40 right-6 pointer-events-none hidden sm:block">
                        <DoodleSpiral color={PT.red} size={70} rotate={-10} />
                    </div>
                    <div className="absolute bottom-12 left-6 pointer-events-none hidden sm:block">
                        <DoodleZigzag color={PT.azul} w={140} h={32} style={{ transform: "rotate(-8deg)" }} />
                    </div>
                    <div className="absolute top-[55%] right-2 pointer-events-none hidden sm:block">
                        <GeoTriangle color={PT.green} size={32} rotate={-20} />
                    </div>
                    <div className="absolute top-[30%] right-12 pointer-events-none hidden sm:block">
                        <DoodleCross color={PT.red} size={22} rotate={14} />
                    </div>

                    <div className="relative max-w-md w-full mx-auto lg:mx-0 z-10">
                        {/* CABEÇALHO REVISTA — só desktop (lg+); marca também presente no SiteFooter */}
                        <div className="hidden lg:flex items-center justify-between mb-7 relative">
                            <div className="flex items-baseline gap-1.5">
                                <span style={{ color: PT.red, fontSize: 32, textShadow: `2px 2px 0 ${PT.gold}` }} className="font-black leading-none">✱</span>
                                <span
                                    className="text-[24px] font-black tracking-tight"
                                    style={{ color: PT.ink, textShadow: `2px 2px 0 ${PT.gold}` }}
                                >
                                    lusorae
                                </span>
                            </div>

                            {/* Indicador LIVE — gente online agora */}
                            <div className="flex items-center gap-2">
                                <span className="relative flex h-2.5 w-2.5" aria-hidden>
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: PT.green }} />
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ background: PT.green, border: `1.5px solid ${PT.ink}` }} />
                                </span>
                                <span className="text-[10.5px] font-mono font-black uppercase" style={{ letterSpacing: "0.14em", color: PT.ink }}>
                                    online · agora
                                </span>
                            </div>

                            {/* Chip EST. + Sticker página */}
                            <div className="flex items-center gap-2">
                                <span
                                    className="text-[10px] font-mono font-black uppercase"
                                    style={{
                                        letterSpacing: "0.16em",
                                        background: PT.ink,
                                        color: PT.gold,
                                        padding: "3px 7px",
                                        border: `1.5px solid ${PT.ink}`,
                                        boxShadow: `2px 2px 0 ${PT.gold}`,
                                    }}
                                >
                                    EST. 2026
                                </span>
                                <Sticker bg={PT.gold} color={PT.ink} rotate={6}>Pg. 01</Sticker>
                            </div>

                            {/* Doodle pequeno entre marca e LIVE */}
                            <div className="absolute left-[28%] -bottom-3 pointer-events-none">
                                <DoodleStar color={PT.gold} size={20} rotate={12} />
                            </div>
                        </div>

                        {/* KICKER */}
                        <div className="flex items-center gap-3 mb-3">
                            <Kicker color={PT.red}>// ÁREA &nbsp;·&nbsp; LOGIN</Kicker>
                            <DoodleArrow color={PT.red} w={60} h={28} style={{ transform: "rotate(-4deg)" }} />
                        </div>

                        {/* TITULO — cap a tamanhos seguros + doodle circle a marcar "Olá," */}
                        <div className="relative">
                            <h2
                                className="font-black tracking-[-0.04em]"
                                style={{ fontSize: "clamp(38px, 5.2vw, 68px)", lineHeight: 0.92, color: PT.ink }}
                            >
                                <span style={{
                                    display: "inline-block",
                                    color: PT.red,
                                    transform: "rotate(-2deg)",
                                    textShadow: `3px 3px 0 ${PT.gold}, 6px 6px 0 ${PT.ink}`,
                                    WebkitTextStroke: `1.5px ${PT.ink}`,
                                }}>
                                    Olá,
                                </span>
                                <br />
                                <span style={{
                                    background: PT.gold,
                                    padding: "0 0.10em",
                                    boxShadow: `4px 4px 0 ${PT.ink}, 8px 8px 0 ${PT.red}`,
                                    display: "inline-block",
                                    transform: "rotate(1deg)",
                                    border: `3px solid ${PT.ink}`,
                                    color: PT.ink,
                                    WebkitTextStroke: `0.5px ${PT.ink}`,
                                }}>
                                    bom regresso.
                                </span>
                            </h2>
                            {/* Círculo desenhado à mão à volta de "Olá," */}
                            <div className="absolute -top-2 -left-3 pointer-events-none" style={{ width: 150 }}>
                                <DoodleCircleNote color={PT.azul} w={150} h={70} rotate={-4} />
                            </div>
                            {/* Nota manuscrita ao lado do título — só sm+ */}
                            <div className="absolute -right-2 top-0 pointer-events-none hidden sm:block">
                                <HandNote color={PT.red} rotate={8} size={20}>
                                    finalmente!
                                </HandNote>
                            </div>
                            {/* Seta a apontar ao bloco dourado */}
                            <div className="absolute -right-4 bottom-[-30px] hidden lg:block pointer-events-none">
                                <DoodleLongArrow color={PT.green} w={110} h={70} rotate={-150} />
                            </div>
                        </div>

                        <div className="mt-5 flex items-start gap-3 relative">
                            <DoodleHeart color={PT.red} size={28} rotate={-12} style={{ flexShrink: 0, marginTop: 2 }} />
                            <p className="text-[15.5px] font-medium leading-relaxed" style={{ color: "rgba(10,10,10,0.78)" }}>
                                Continua a conversa onde a deixaste.{" "}
                                <span style={{
                                    background: PT.azul,
                                    color: "#fff",
                                    padding: "2px 8px",
                                    fontWeight: 800,
                                    border: `2px solid ${PT.ink}`,
                                    boxShadow: `2px 2px 0 ${PT.ink}`,
                                    display: "inline-block",
                                    transform: "rotate(-1deg)",
                                }}>sem ruído</span>.
                            </p>
                            <div className="absolute -bottom-2 left-10 pointer-events-none hidden sm:block">
                                <DoodleUnderline color={PT.red} w={120} h={12} />
                            </div>
                        </div>

                        {/* FORM */}
                        <form onSubmit={submit} className="mt-9 space-y-5 relative" data-testid="login-form">
                            {/* Doodle a anotar o primeiro campo */}
                            <div className="hidden lg:block absolute -left-16 top-2 pointer-events-none z-0">
                                <HandNote color={PT.azul} rotate={-10} size={18}>
                                    o teu &nbsp;email →
                                </HandNote>
                            </div>
                            {/* Doodle a anotar o campo password */}
                            <div className="hidden lg:block absolute -right-16 top-[120px] pointer-events-none z-0">
                                <HandNote color={PT.red} rotate={6} size={18}>
                                    ← secreta!
                                </HandNote>
                                <DoodleArrow color={PT.red} w={50} h={24} style={{ transform: "rotate(170deg)", display: "block", marginTop: -4 }} />
                            </div>

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

                            <div className="relative">
                                <button
                                    type="submit"
                                    disabled={busy}
                                    data-testid="login-submit"
                                    className="pt-btn-primary w-full text-[16px] py-4 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {busy ? "A entrar…" : "ENTRAR →"}
                                </button>
                                {/* Sticker desalinhado e doodle no botão */}
                                <div className="absolute -top-5 -right-3 pointer-events-none hidden sm:block">
                                    <Sticker bg={PT.red} color="#fff" rotate={14} style={{ fontSize: 9.5, padding: "5px 9px" }}>
                                        ✱ vai!
                                    </Sticker>
                                </div>
                                <div className="absolute -bottom-6 -left-2 pointer-events-none hidden sm:block">
                                    <DoodleZigzag color={PT.gold} w={120} h={18} />
                                </div>
                            </div>

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
                        <div className="mt-8 flex items-center justify-between flex-wrap gap-3 relative">
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
                            <div className="absolute -top-4 left-12 pointer-events-none hidden sm:block">
                                <DoodleArrow color={PT.red} w={50} h={24} style={{ transform: "rotate(120deg)" }} />
                            </div>
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
// PAINEL ESQUERDO — POSTER URBANO denso (vermelho · responsivo)
// =============================================================================
function PosterLeft() {
    return (
        <div
            className="hidden lg:flex relative overflow-hidden isolate pt-grain flex-col"
            style={{ background: PT.red, color: "#fff" }}
            data-testid="brand-panel"
        >
            {/* Asterisco gigante (canto sup. esq.) */}
            <div className="absolute -top-10 -left-12 z-0 scale-50 sm:scale-75 lg:scale-100 origin-top-left">
                <GiantAsterisk color={PT.gold} size={300} rotate={-8} />
            </div>

            {/* Faixa "manchete" dourada (atrás) — só sm+ para não cruzar manchete em mobile */}
            <div
                className="absolute top-[26%] -left-8 z-0 hidden sm:block"
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
            <div className="relative z-10 p-5 sm:p-8 lg:p-10 xl:p-14 flex flex-col gap-5 flex-1">
                {/* MANCHETE — sem "Lusorae" (reservado para header/footer) */}
                <div className="relative">
                    <Kicker color={PT.ink} className="mb-2">// COMUNIDADE · PORTUGAL</Kicker>
                    <h2
                        className="font-black tracking-[-0.04em]"
                        style={{
                            fontSize: "clamp(42px, 9.5vw, 96px)",
                            lineHeight: 0.86,
                            color: "#fff",
                        }}
                    >
                        <span style={{
                            display: "inline-block",
                            transform: "rotate(-2deg)",
                            textShadow: `4px 4px 0 ${PT.ink}, 8px 8px 0 ${PT.gold}`,
                            WebkitTextStroke: `2px ${PT.ink}`,
                        }}>VIVEMOS.</span><br />
                        <span style={{
                            display: "inline-block",
                            transform: "rotate(1deg)",
                            background: PT.gold,
                            color: PT.ink,
                            padding: "0 0.10em",
                            border: `4px solid ${PT.ink}`,
                            boxShadow: `5px 5px 0 ${PT.ink}, 12px 12px 0 rgba(10,10,10,0.18)`,
                            WebkitTextStroke: `1px ${PT.ink}`,
                        }}>
                            PARTILHAMOS.
                        </span>
                    </h2>
                </div>

                {/* COLAGEM — uma única foto colada com fita */}
                <div className="relative mt-2 flex items-start gap-6 xl:gap-10 flex-wrap">
                    <div className="relative shrink-0 mx-auto sm:mx-0" style={{ width: 260, height: 290 }}>
                        <div className="absolute" style={{ top: 30, left: 50 }}>
                            <TapedPhoto
                                src={LOGIN_HERO}
                                alt="Porto · Douro"
                                rotate={-3}
                                w={180}
                                h={220}
                                caption="porto · douro"
                            />
                        </div>
                        {/* Doodles sobre a foto — secundários escondidos em mobile */}
                        <div className="absolute -top-4 -left-2 z-10 pointer-events-none hidden sm:block">
                            <DoodleSparkles color={PT.gold} size={56} rotate={-12} />
                        </div>
                        <div className="absolute top-[-6px] right-[-18px] z-20 pointer-events-none">
                            <StampCircle bg={PT.green} color="#fff" rotate={-16} size={62}>
                                REAL<br/>NÃO<br/>STOCK
                            </StampCircle>
                        </div>
                        <div className="absolute top-[34%] left-[-22px] z-30 pointer-events-none hidden sm:block">
                            <DoodleLongArrow color={PT.gold} w={90} h={70} rotate={20} />
                        </div>
                        <div className="absolute -bottom-6 right-2 z-30 pointer-events-none hidden sm:block">
                            <HandNote color={PT.gold} rotate={-6} size={22}>
                                ↳ Pessoas a sério
                            </HandNote>
                        </div>
                        <div className="absolute top-[42%] right-[-12px] z-30 pointer-events-none hidden sm:block">
                            <DoodleCross color={PT.gold} size={26} rotate={18} />
                        </div>
                    </div>

                    {/* Cartão "citação" */}
                    <div className="relative flex-1 min-w-[240px] max-w-[340px] pt-2 mt-6 sm:mt-0">
                        <PosterCard bg={PT.ink} color="#fff" rotate={-2} shadow={PT.gold} style={{ padding: "14px 16px" }}>
                            <Kicker color={PT.gold} className="mb-1.5">// POST · DESTACADO</Kicker>
                            <p className="font-black tracking-tight text-[17px] leading-[1.15]">
                                “não é sobre quantos seguem.<br/>
                                é sobre <span style={{ color: PT.gold }}>quem está à mesa</span>.”
                            </p>
                            <p className="mt-2 text-[10.5px] font-mono uppercase font-bold" style={{ letterSpacing: "0.14em", color: "rgba(255,255,255,0.65)" }}>
                                — pessoas, não perfis
                            </p>
                        </PosterCard>

                        {/* Doodle a "anotar" o cartão */}
                        <div className="absolute -top-3 -right-3 z-20 pointer-events-none hidden sm:block">
                            <DoodleSpiral color={PT.gold} size={56} rotate={20} />
                        </div>
                        <div className="absolute -bottom-3 right-4 z-20 pointer-events-none hidden sm:block">
                            <DoodleUnderline color={PT.gold} w={100} h={12} />
                        </div>
                    </div>
                </div>

                {/* FIGURAS GEOMÉTRICAS dispersas — só sm+ */}
                <div className="absolute top-[16%] right-10 z-0 hidden sm:block">
                    <GeoTriangle color={PT.gold} size={56} rotate={22} />
                </div>
                <div className="absolute top-[44%] right-[12%] z-0 hidden sm:block">
                    <GeoSquare color={PT.azul} size={36} rotate={26} />
                </div>
                <div className="absolute bottom-[28%] left-[44%] z-0 hidden sm:block">
                    <GeoCircle color={PT.gold} size={24} />
                </div>
                <div className="absolute bottom-[14%] left-[6%] z-0 hidden sm:block">
                    <DoodleExclamation color={PT.gold} size={56} rotate={-12} />
                </div>

                {/* RODAPÉ poster — manifesto sem mencionar a marca (reservada para header/SiteFooter) */}
                <div className="mt-auto relative pt-8">
                    <div className="max-w-[260px]">
                        <Kicker color={PT.gold} className="mb-1">// PRINCÍPIO · 01</Kicker>
                        <p className="font-black text-[14px] leading-snug tracking-tight" style={{ color: "#fff" }}>
                            Sem algoritmo a empurrar.{" "}
                            <span style={{
                                background: PT.ink,
                                color: PT.gold,
                                padding: "2px 8px",
                                border: `2px solid ${PT.gold}`,
                                boxShadow: `2px 2px 0 ${PT.gold}`,
                                display: "inline-block",
                                transform: "rotate(-1deg)",
                            }}>
                                sem letra pequena
                            </span>.
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
