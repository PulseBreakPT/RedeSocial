import { useState } from "react";
// =============================================================================
// DESIGN SYSTEM: LUSORAE EDITORIAL — ver /src/theme/EDITORIAL.md
// =============================================================================
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import SiteFooter from "../components/SiteFooter";
import {
    PT,
    AUTH_IMG_LOGIN,
    AuthShell,
    VisualPanel,
    Field,
    inputClass,
    Kicker,
    PrimaryButton,
    ErrorBanner,
    UnderlineStroke,
} from "./auth/AuthLayout";

// =============================================================================
// LUSORAE — Login (clean editorial, alinhado com a landing)
// Bold + itálico, hierarquia visual premium, mobile-first.
// =============================================================================
export default function Login() {
    const { user, login } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPwd, setShowPwd] = useState(false);
    const [remember, setRemember] = useState(true);
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    if (user) return <Navigate to="/feed" replace />;

    const submit = async (e) => {
        e.preventDefault();
        setError("");
        setBusy(true);
        const res = await login(email, password);
        setBusy(false);
        if (!res.ok) setError(res.error);
        else navigate("/feed");
    };

    const rightSlot = (
        <p className="text-[13px] font-semibold hidden sm:block" style={{ color: "rgba(10,10,10,0.62)" }}>
            Sem conta?{" "}
            <Link
                to="/register"
                data-testid="goto-register"
                className="font-black underline underline-offset-4 decoration-2 ml-0.5"
                style={{ color: PT.ink, textDecorationColor: PT.red }}
            >
                Criar conta
            </Link>
        </p>
    );

    return (
        <>
            <AuthShell
                bottomLink={rightSlot}
                visual={
                    <VisualPanel
                        image={AUTH_IMG_LOGIN}
                        imageAlt="Lisboa ao pôr-do-sol"
                        kicker="Área · Login"
                        accent={PT.azul}
                        titleLead="Olá,"
                        titleEm="bom regresso"
                        titleTail="."
                        sub="Continua a conversa onde a deixaste. Sem ruído, sem algoritmo de vaidade."
                        cityName="Lisboa"
                        cityCaption="capital"
                        quote="Não é sobre quantos seguem. É sobre quem está à mesa."
                        quoteAuthor="Pessoas, não perfis"
                    />
                }
            >
                <div className="auth-fade-up">
                    {/* Kicker */}
                    <Kicker color={PT.red}>Área · Login</Kicker>

                    {/* Título bold + itálico */}
                    <h1
                        className="font-black tracking-[-0.04em] leading-[0.92] mt-3 mb-4"
                        style={{ fontSize: "clamp(40px, 6vw, 64px)", color: PT.ink }}
                    >
                        Olá,
                        <br />
                        <span className="relative inline-block">
                            <span style={{ fontStyle: "italic", color: PT.azul }}>bom regresso</span>
                            <span
                                className="absolute pointer-events-none"
                                style={{ left: 0, right: 0, bottom: "-0.08em", height: 12 }}
                                aria-hidden
                            >
                                <UnderlineStroke color={PT.azul} w={420} h={12} variant="wave" delay={0.25} strokeWidth={3.5} style={{ width: "100%", height: "100%" }} />
                            </span>
                        </span>
                        .
                    </h1>

                    {/* Sub */}
                    <p
                        className="text-[15.5px] sm:text-[16px] font-medium leading-relaxed mb-8"
                        style={{ color: "rgba(10,10,10,0.62)" }}
                    >
                        Entra com o teu email para continuar.
                    </p>

                    {/* Form */}
                    <form onSubmit={submit} className="space-y-5" data-testid="login-form" noValidate>
                        <Field label="Email" number="01" htmlFor="login-email">
                            <input
                                id="login-email"
                                data-testid="login-email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoComplete="email"
                                inputMode="email"
                                autoCapitalize="off"
                                spellCheck={false}
                                placeholder="tu@exemplo.com"
                                className={inputClass}
                            />
                        </Field>

                        <Field
                            label="Palavra-passe"
                            number="02"
                            htmlFor="login-password"
                            right={
                                <Link
                                    to="/forgot"
                                    data-testid="goto-forgot"
                                    className="text-[11.5px] font-bold uppercase"
                                    style={{ color: PT.azul, letterSpacing: "0.06em" }}
                                >
                                    Esqueci-me →
                                </Link>
                            }
                        >
                            <div className="relative">
                                <input
                                    id="login-password"
                                    data-testid="login-password"
                                    type={showPwd ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    autoComplete="current-password"
                                    placeholder="••••••••"
                                    className={`${inputClass} pr-12`}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPwd((v) => !v)}
                                    aria-label={showPwd ? "Esconder palavra-passe" : "Mostrar palavra-passe"}
                                    tabIndex={-1}
                                    className="absolute inset-y-0 right-3 grid place-items-center hover:opacity-60 transition-opacity"
                                    style={{ color: "rgba(10,10,10,0.55)" }}
                                >
                                    {showPwd ? <EyeOff size={17} /> : <Eye size={17} />}
                                </button>
                            </div>
                        </Field>

                        {/* Remember me */}
                        <label
                            htmlFor="login-remember"
                            className="flex items-center gap-2.5 cursor-pointer select-none -mt-1"
                        >
                            <input
                                id="login-remember"
                                type="checkbox"
                                checked={remember}
                                onChange={(e) => setRemember(e.target.checked)}
                                className="w-4 h-4 rounded cursor-pointer"
                                style={{ accentColor: PT.ink }}
                            />
                            <span className="text-[13px] font-medium" style={{ color: "rgba(10,10,10,0.7)" }}>
                                Manter-me ligado neste dispositivo
                            </span>
                        </label>

                        {error && <ErrorBanner message={error} dataTestid="login-error" />}

                        <PrimaryButton type="submit" busy={busy} dataTestid="login-submit">
                            {busy ? "A entrar…" : (<>Entrar <ArrowRight size={16} strokeWidth={2.5} /></>)}
                        </PrimaryButton>

                        {/* Terms disclaimer (under primary CTA) */}
                        <p
                            className="text-[11.5px] font-medium leading-relaxed text-center px-2"
                            data-testid="login-terms-disclaimer"
                            style={{ color: "rgba(10,10,10,0.55)" }}
                        >
                            Ao continuar, aceitas os nossos{" "}
                            <Link
                                to="/legal/terms"
                                target="_blank"
                                className="font-bold underline underline-offset-2"
                                style={{ color: PT.ink, textDecorationColor: PT.azul, textDecorationThickness: 1.5 }}
                            >
                                Termos
                            </Link>{" "}
                            e a{" "}
                            <Link
                                to="/legal/privacy"
                                target="_blank"
                                className="font-bold underline underline-offset-2"
                                style={{ color: PT.ink, textDecorationColor: PT.azul, textDecorationThickness: 1.5 }}
                            >
                                Política de Privacidade
                            </Link>.
                        </p>
                    </form>

                    {/* Divider with social signal */}
                    <div className="mt-8 flex items-center gap-3">
                        <span className="flex-1 h-px" style={{ background: "rgba(10,10,10,0.10)" }} aria-hidden />
                        <span className="font-mono text-[10px] font-bold uppercase" style={{ color: "rgba(10,10,10,0.40)", letterSpacing: "0.18em" }}>
                            ou
                        </span>
                        <span className="flex-1 h-px" style={{ background: "rgba(10,10,10,0.10)" }} aria-hidden />
                    </div>

                    {/* Secondary CTA: register */}
                    <Link
                        to="/register"
                        data-testid="goto-register-cta"
                        className="mt-5 inline-flex items-center justify-center gap-2 w-full font-bold text-[14.5px] py-3.5 px-6 rounded-full transition-all duration-200 hover:bg-[rgba(10,10,10,0.04)]"
                        style={{
                            background: "#fff",
                            color: PT.ink,
                            border: "1.5px solid rgba(10,10,10,0.12)",
                        }}
                    >
                        Criar conta nova <ArrowRight size={15} strokeWidth={2.5} />
                    </Link>

                    {/* Bottom trust strip */}
                    <p className="mt-7 text-[11.5px] font-medium text-center" style={{ color: "rgba(10,10,10,0.48)" }}>
                        Sessão segura · Encriptada de ponta a ponta
                    </p>
                </div>
            </AuthShell>
            <SiteFooter />
        </>
    );
}
