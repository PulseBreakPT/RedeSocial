import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { DynamicWord } from "../components/DynamicWord";

// =============================================================================
// LUSORAE — Login (cores portuguesas vibrantes)
// Vermelho #C8102E · Verde #046A38 · Dourado #FFCC00 · Azulejo #0E4D92
// =============================================================================

const PT = {
    red: "#C8102E",
    green: "#046A38",
    gold: "#FFCC00",
    azul: "#0E4D92",
    cream: "#FFF8E7",
    ink: "#1A1A1A",
};

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
        <div className="min-h-screen grid lg:grid-cols-[1.05fr_1fr]" style={{ background: PT.cream }}>
            {/* ============ ESQUERDA · Painel vermelho com decorações PT ============ */}
            <BrandPanel
                eyebrow="Bem-vindo de volta"
                heroDynamic={<DynamicWord variant="hero" testId="login-hero-dynamic-word" />}
                quote="“não é sobre quantos seguem. é sobre quem está à mesa.”"
                quoteAttribution="— pessoas, não perfis."
            />

            {/* ============ DIREITA · Formulário ============ */}
            <div className="flex flex-col min-h-screen" style={{ background: PT.cream }}>
                {/* Hero mobile (mini painel vermelho) */}
                <MobileMiniBrand testId="login-mobile-dynamic-word" />

                <div className="px-6 sm:px-10 lg:px-16 pt-10 lg:pt-0 pb-12 flex flex-col lg:justify-center flex-1">
                    <div className="max-w-md w-full mx-auto lg:mx-0">
                        {/* Logo no formulário (desktop) */}
                        <div className="hidden lg:flex items-baseline gap-2 mb-10">
                            <span style={{ color: PT.red }} className="text-3xl font-black leading-none">✱</span>
                            <span className="text-[22px] font-black tracking-tight" style={{ color: PT.ink }}>
                                lusorae
                            </span>
                        </div>

                        {/* Eyebrow */}
                        <p
                            className="text-[11px] uppercase font-mono mb-3"
                            style={{ letterSpacing: "0.18em", color: PT.red }}
                            data-testid="login-eyebrow"
                        >
                            // entrar
                        </p>

                        <h2
                            className="font-black leading-[0.95] tracking-tight"
                            style={{ fontSize: "clamp(40px, 5vw, 56px)", color: PT.ink }}
                        >
                            Olá, bom <span style={{ background: PT.gold, padding: "0 0.18em" }}>regresso</span>.
                        </h2>
                        <p className="text-[15px] mt-4 leading-relaxed" style={{ color: "rgba(26,26,26,0.65)" }}>
                            Continua a conversa onde a deixaste.
                        </p>

                        <form onSubmit={submit} className="mt-8 space-y-5" data-testid="login-form">
                            <PtField label="Email">
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
                                right={
                                    <Link
                                        to="/forgot"
                                        data-testid="goto-forgot"
                                        className="text-[12px] font-semibold underline-offset-2 hover:underline"
                                        style={{ color: PT.azul }}
                                    >
                                        Esqueci-me
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
                                <div
                                    data-testid="login-error"
                                    className="text-[13px] font-semibold flex items-start gap-2 rounded-xl px-3.5 py-2.5"
                                    style={{ color: PT.red, background: "rgba(200,16,46,0.08)", border: `1px solid rgba(200,16,46,0.20)` }}
                                >
                                    <span aria-hidden>⚠</span> <span>{error}</span>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={busy}
                                data-testid="login-submit"
                                className="pt-btn-primary w-full text-[15px] py-4 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {busy ? "A entrar…" : "Entrar →"}
                            </button>
                        </form>

                        <p className="mt-8 text-[14px]" style={{ color: "rgba(26,26,26,0.65)" }}>
                            Ainda não tens conta?{" "}
                            <Link
                                to="/register"
                                data-testid="goto-register"
                                className="font-bold underline underline-offset-4 decoration-2"
                                style={{ color: PT.red, textDecorationColor: PT.gold }}
                            >
                                Criar conta
                            </Link>
                        </p>

                        {/* Citação tipo "callout" verde */}
                        <div
                            className="mt-10 rounded-2xl px-5 py-4 relative"
                            style={{ background: PT.green, color: "#fff" }}
                        >
                            <p className="text-[11px] uppercase font-mono mb-2" style={{ letterSpacing: "0.16em", opacity: 0.85 }}>
                                // a tua cidade tem
                            </p>
                            <p className="text-[20px] font-black leading-tight tracking-tight">
                                <DynamicWord variant="hero" testId="login-form-dynamic-word" />
                            </p>
                            <p className="mt-2 text-[12.5px] leading-relaxed" style={{ opacity: 0.92 }}>
                                Lusorae — rápida, simples, sem distracções. Feita para conversas que valem.
                            </p>
                        </div>

                        {/* Rodapé legal */}
                        <div className="mt-10 pt-6" style={{ borderTop: "1px dashed rgba(26,26,26,0.15)" }}>
                            <p className="text-[11.5px] leading-relaxed" style={{ color: "rgba(26,26,26,0.50)" }}>
                                Ao entrar concordas com os{" "}
                                <Link to="/legal/terms" className="underline underline-offset-2 hover:no-underline font-medium" style={{ color: PT.ink }}>
                                    Termos
                                </Link>{" "}
                                e a{" "}
                                <Link to="/legal/privacy" className="underline underline-offset-2 hover:no-underline font-medium" style={{ color: PT.ink }}>
                                    Política de Privacidade
                                </Link>.
                            </p>
                            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11.5px]" style={{ color: "rgba(26,26,26,0.50)" }}>
                                <Link to="/legal" className="hover:underline underline-offset-2">Centro Legal</Link>
                                <Link to="/legal/terms" className="hover:underline underline-offset-2">Termos</Link>
                                <Link to="/legal/privacy" className="hover:underline underline-offset-2">Privacidade</Link>
                                <Link to="/legal/cookies" className="hover:underline underline-offset-2">Cookies</Link>
                                <Link to="/legal/community" className="hover:underline underline-offset-2">Diretrizes</Link>
                            </div>
                        </div>

                        <div className="lg:hidden mt-8 mb-2 text-center text-[11px] uppercase" style={{ letterSpacing: "0.18em", color: "rgba(26,26,26,0.45)" }}>
                            © lusorae · {new Date().getFullYear()}
                        </div>
                    </div>
                </div>
            </div>

            <PtStyles />
        </div>
    );
}

// =============================================================================
// PAINEL DE BRANDING — coluna esquerda vermelha com decorações portuguesas
// =============================================================================
function BrandPanel({ eyebrow, heroDynamic, quote, quoteAttribution }) {
    return (
        <div
            className="hidden lg:flex relative flex-col justify-between p-14 overflow-hidden isolate"
            style={{ background: PT.red, color: "#fff" }}
            data-testid="brand-panel"
        >
            {/* Asterisco dourado gigante (top-left) */}
            <div
                className="absolute -top-10 -left-12 select-none pointer-events-none"
                style={{ fontSize: 280, lineHeight: 1, color: PT.gold, fontWeight: 900 }}
                aria-hidden
            >
                ✱
            </div>

            {/* Triângulo dourado (top-right) */}
            <div
                className="absolute top-16 right-20 pointer-events-none"
                style={{
                    width: 0,
                    height: 0,
                    borderLeft: "28px solid transparent",
                    borderRight: "28px solid transparent",
                    borderBottom: `48px solid ${PT.gold}`,
                    transform: "rotate(18deg)",
                }}
                aria-hidden
            />

            {/* Paralelogramo verde (mid-right) */}
            <div
                className="absolute right-10 pointer-events-none"
                style={{
                    top: "38%",
                    width: 90,
                    height: 22,
                    background: PT.green,
                    transform: "skewX(-22deg) rotate(-8deg)",
                }}
                aria-hidden
            />

            {/* Onda azul rabiscada (bottom-left) */}
            <svg
                className="absolute -bottom-6 -left-10 pointer-events-none"
                width="380" height="160" viewBox="0 0 380 160" fill="none" aria-hidden
            >
                <path
                    d="M0 100 Q 60 40, 120 90 T 240 90 T 360 90"
                    stroke={PT.azul} strokeWidth="10" strokeLinecap="round" fill="none"
                />
                <path
                    d="M20 130 Q 80 80, 140 120 T 260 120 T 380 120"
                    stroke={PT.gold} strokeWidth="6" strokeLinecap="round" fill="none" opacity="0.85"
                />
            </svg>

            {/* Header — logo + badge "feito em pt" */}
            <div className="relative flex items-start justify-between">
                <h1 className="font-black tracking-tight text-[34px] leading-none flex items-baseline gap-2">
                    <span style={{ color: PT.gold }} className="text-[30px]">✱</span>
                    <span>lusorae</span>
                </h1>
                <div
                    className="text-[11px] font-bold uppercase rounded-full px-3 py-1.5 inline-flex items-center gap-1.5"
                    style={{ background: PT.gold, color: PT.ink, letterSpacing: "0.10em" }}
                >
                    <span aria-hidden>🇵🇹</span> feito em pt
                </div>
            </div>

            {/* Headline */}
            <div className="relative max-w-xl">
                <p className="text-[12px] uppercase font-mono mb-3" style={{ letterSpacing: "0.20em", color: PT.gold }}>
                    // {eyebrow}
                </p>
                <h2 className="font-black leading-[0.92] tracking-tight" style={{ fontSize: "clamp(52px, 5.4vw, 76px)" }}>
                    Vivemos.<br />
                    Partilhamos.<br />
                    <span style={{ background: PT.gold, color: PT.ink, padding: "0 0.14em", display: "inline-block" }}>
                        Lusorae.
                    </span>
                </h2>
                <p className="font-medium mt-7 leading-relaxed text-[16px] max-w-md" style={{ color: "rgba(255,255,255,0.88)" }}>
                    A rede social portuguesa feita para conversas reais, pessoas reais e presença social viva. A tua cidade tem{" "}
                    {heroDynamic}.
                </p>
            </div>

            {/* Quote callout verde */}
            <div className="relative">
                <div
                    className="inline-block rounded-2xl px-5 py-4 max-w-md relative"
                    style={{ background: PT.green, boxShadow: "6px 6px 0 rgba(0,0,0,0.18)" }}
                >
                    <p className="font-black text-[19px] leading-tight tracking-tight italic">{quote}</p>
                    <p className="mt-2 text-[12px] font-mono uppercase" style={{ letterSpacing: "0.14em", opacity: 0.85 }}>
                        {quoteAttribution}
                    </p>
                </div>
                <div
                    className="mt-6 text-[11.5px] uppercase font-medium"
                    style={{ letterSpacing: "0.20em", color: "rgba(255,255,255,0.55)" }}
                >
                    © lusorae · {new Date().getFullYear()}
                </div>
            </div>
        </div>
    );
}

// =============================================================================
// HERO MOBILE — pequena faixa vermelha em telemóvel
// =============================================================================
function MobileMiniBrand({ testId }) {
    return (
        <div
            className="lg:hidden relative overflow-hidden px-6 pt-7 pb-10"
            style={{ background: PT.red, color: "#fff" }}
        >
            <div
                className="absolute -top-6 -right-4 pointer-events-none"
                style={{ fontSize: 140, lineHeight: 1, color: PT.gold, fontWeight: 900 }}
                aria-hidden
            >
                ✱
            </div>
            <div className="relative flex items-center justify-between mb-5">
                <h1 className="font-black text-[26px] leading-none flex items-baseline gap-1.5">
                    <span style={{ color: PT.gold }}>✱</span>
                    <span>lusorae</span>
                </h1>
                <span
                    className="text-[10px] font-bold uppercase rounded-full px-2.5 py-1"
                    style={{ background: PT.gold, color: PT.ink, letterSpacing: "0.10em" }}
                >
                    feito em pt
                </span>
            </div>
            <p className="relative font-black leading-[0.95] tracking-tight text-[34px]">
                A tua cidade tem <DynamicWord variant="compact" testId={testId} />
            </p>
        </div>
    );
}

// =============================================================================
// Componentes utilitários
// =============================================================================
function PtField({ label, right, children }) {
    return (
        <div>
            <div className="flex items-center justify-between mb-1.5">
                <label className="text-[12px] font-bold uppercase" style={{ letterSpacing: "0.10em", color: "rgba(26,26,26,0.65)" }}>
                    {label}
                </label>
                {right}
            </div>
            {children}
        </div>
    );
}

// =============================================================================
// Estilos in-file para inputs/botões (apenas paleta PT, sem mexer no global)
// =============================================================================
function PtStyles() {
    return (
        <style>{`
            .pt-input {
                width: 100%;
                background: #ffffff;
                border: 2px solid rgba(26,26,26,0.10);
                border-radius: 14px;
                padding: 14px 16px;
                font-size: 15px;
                color: ${PT.ink};
                transition: border-color .15s ease, box-shadow .15s ease, background .15s ease;
                outline: none;
                font-family: inherit;
            }
            .pt-input::placeholder { color: rgba(26,26,26,0.35); }
            .pt-input:hover { border-color: rgba(26,26,26,0.22); }
            .pt-input:focus {
                border-color: ${PT.azul};
                box-shadow: 0 0 0 4px rgba(14,77,146,0.14);
                background: #fff;
            }
            .pt-btn-primary {
                position: relative;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 8px;
                background: ${PT.red};
                color: #fff;
                font-weight: 800;
                border-radius: 999px;
                border: 2px solid ${PT.ink};
                box-shadow: 4px 4px 0 ${PT.ink};
                transition: transform .12s ease, box-shadow .12s ease, background .12s ease;
                cursor: pointer;
                letter-spacing: -0.01em;
            }
            .pt-btn-primary:hover:not(:disabled) {
                transform: translate(-2px,-2px);
                box-shadow: 6px 6px 0 ${PT.ink};
                background: #d11833;
            }
            .pt-btn-primary:active:not(:disabled) {
                transform: translate(2px,2px);
                box-shadow: 0px 0px 0 ${PT.ink};
            }
        `}</style>
    );
}
