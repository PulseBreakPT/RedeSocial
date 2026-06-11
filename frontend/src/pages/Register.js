import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import {
    ArrowRight, ArrowLeft, Check, Loader2, X, Eye, EyeOff,
    AlertCircle, CheckCircle2, MapPin, Sparkles,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { CitySelect } from "../components/CitySelect";
import SiteFooter from "../components/SiteFooter";
import {
    PT,
    AUTH_IMG_REGISTER,
    AuthShell,
    VisualPanel,
    Field,
    inputClass,
    inputStateStyle,
    Kicker,
    PrimaryButton,
    GhostButton,
    ErrorBanner,
    UnderlineStroke,
    StepDots,
} from "./auth/AuthLayout";

// =============================================================================
// LUSORAE — Register (clean editorial, 3 passos, validators preservados)
// =============================================================================

// Avaliação de palavra-passe — mantém lógica original
function evaluatePassword(pwd) {
    if (!pwd) return { score: 0, label: "", color: "#cccccc", reasons: [] };
    const reasons = [];
    let score = 0;
    if (pwd.length >= 8) score++; else reasons.push("8+ caracteres");
    if (pwd.length >= 12) score++; else if (pwd.length >= 8) reasons.push("12+ ainda melhor");
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++; else reasons.push("maiúsculas e minúsculas");
    if (/\d/.test(pwd)) score++; else reasons.push("um número");
    if (/[^a-zA-Z\d]/.test(pwd)) score++; else reasons.push("um símbolo (!@#…)");
    const labels = ["Muito fraca", "Fraca", "Razoável", "Boa", "Forte", "Excelente"];
    const colors = [PT.red, PT.red, "#e0833a", PT.gold, PT.green, PT.ink];
    return { score, label: labels[score], color: colors[score], reasons };
}

function useAvailabilityCheck({ value, endpoint, paramName, localValidate }) {
    const [state, setState] = useState({ status: "idle", message: "" });
    const abortRef = useRef(null);
    useEffect(() => {
        const v = (value || "").trim();
        if (abortRef.current) { try { abortRef.current.abort(); } catch { /* noop */ } abortRef.current = null; }
        if (!v) { setState({ status: "idle", message: "" }); return; }
        if (localValidate) {
            const local = localValidate(v);
            if (local && !local.ok) { setState({ status: "invalid", message: local.message }); return; }
        }
        setState({ status: "checking", message: "A verificar…" });
        const ctrl = new AbortController();
        abortRef.current = ctrl;
        const t = setTimeout(async () => {
            try {
                const { data } = await api.get(endpoint, { params: { [paramName]: v }, signal: ctrl.signal });
                if (data.available) setState({ status: "available", message: data.message || "Disponível" });
                else {
                    let status = "invalid";
                    if (data.reason === "taken") status = "taken";
                    else if (data.reason === "disposable") status = "invalid";
                    setState({ status, message: data.message || "Indisponível" });
                }
            } catch (e) {
                if (e?.name === "CanceledError" || e?.code === "ERR_CANCELED") return;
                setState({ status: "idle", message: "" });
            }
        }, 380);
        return () => { clearTimeout(t); ctrl.abort(); };
    }, [value, endpoint, paramName, localValidate]);
    return state;
}

const _validateUsernameLocal = (u) => {
    if (u.length < 3) return { ok: false, message: "Mínimo 3 caracteres." };
    if (u.length > 20) return { ok: false, message: "Máximo 20 caracteres." };
    if (!/^[a-zA-Z0-9_]+$/.test(u)) return { ok: false, message: "Só letras, números e _." };
    return { ok: true };
};
const _validateEmailLocal = (e) => {
    if (e.length > 200) return { ok: false, message: "Email demasiado longo." };
    if (!/^\S+@\S+\.\S+$/.test(e)) return { ok: false, message: "Formato de email inválido." };
    return { ok: true };
};

// =============================================================================
export default function Register() {
    const { user, register } = useAuth();
    const navigate = useNavigate();
    const [step, setStep] = useState(1);

    const [form, setForm] = useState({ name: "", username: "", email: "", password: "", passwordConfirm: "" });
    const [showPwd, setShowPwd] = useState(false);
    const [showPwdConfirm, setShowPwdConfirm] = useState(false);
    const [city, setCity] = useState(null);
    const [consent, setConsent] = useState({ age: false, terms: false, marketing: false });
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    const usernameState = useAvailabilityCheck({ value: form.username, endpoint: "/auth/check-username", paramName: "u", localValidate: _validateUsernameLocal });
    const emailState = useAvailabilityCheck({ value: form.email, endpoint: "/auth/check-email", paramName: "e", localValidate: _validateEmailLocal });
    const pwdEval = useMemo(() => evaluatePassword(form.password), [form.password]);
    const pwdMatches = form.password && form.passwordConfirm && form.password === form.passwordConfirm;
    const pwdMismatch = form.password && form.passwordConfirm && form.password !== form.passwordConfirm;

    if (user) return <Navigate to="/feed" replace />;

    const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });
    const toggleConsent = (k) => setConsent((c) => ({ ...c, [k]: !c[k] }));
    const nameValid = form.name.trim().length >= 1;

    const canStep1 =
        nameValid &&
        usernameState.status === "available" &&
        emailState.status === "available" &&
        pwdEval.score >= 2 &&
        form.password.length >= 8 &&
        pwdMatches;
    const canSubmit = consent.age && consent.terms && !busy;

    // Hint do que falta no step 1 — mostrado quando o user passa o rato/foco
    // no bot\u00e3o Seguinte (ou quando clica e n\u00e3o pode avan\u00e7ar).
    const step1Missing = () => {
        if (!nameValid) return "Falta o teu nome.";
        if (!form.username) return "Falta o username.";
        if (usernameState.status === "checking") return "A verificar username\u2026 aguarda um segundo.";
        if (usernameState.status === "taken") return "Esse username j\u00e1 est\u00e1 em uso.";
        if (usernameState.status === "invalid") return usernameState.message || "Username inv\u00e1lido.";
        if (usernameState.status !== "available") return "Confirma o username.";
        if (!form.email) return "Falta o email.";
        if (emailState.status === "checking") return "A verificar email\u2026 aguarda um segundo.";
        if (emailState.status === "taken") return "J\u00e1 existe uma conta com esse email.";
        if (emailState.status === "invalid") return emailState.message || "Email inv\u00e1lido.";
        if (emailState.status !== "available") return "Confirma o email.";
        if (form.password.length < 8) return "Palavra-passe tem de ter pelo menos 8 caracteres.";
        if (pwdEval.score < 2) return "Refor\u00e7a a palavra-passe (mai\u00fasculas, n\u00fameros ou s\u00edmbolos).";
        if (!form.passwordConfirm) return "Repete a palavra-passe.";
        if (pwdMismatch) return "As palavras-passe n\u00e3o coincidem.";
        return null;
    };

    const next = () => {
        setError("");
        if (step === 1) {
            // O hint sob o bot\u00e3o j\u00e1 mostra o que falta em tempo real \u2014
            // se canStep1 \u00e9 false, apenas n\u00e3o avan\u00e7a (sem duplicar mensagem).
            if (!canStep1) return;
        }
        setStep((s) => Math.min(3, s + 1));
    };
    const back = () => { setError(""); setStep((s) => Math.max(1, s - 1)); };

    const submit = async (e) => {
        e.preventDefault();
        setError("");
        if (!consent.age) return setError("É necessário confirmar que tens 16 anos ou mais.");
        if (!consent.terms) return setError("É necessário aceitar os Termos e a Política de Privacidade.");
        if (form.password !== form.passwordConfirm) return setError("As palavras-passe não coincidem.");
        setBusy(true);
        const res = await register({
            name: form.name, username: form.username, email: form.email, password: form.password,
            city: city?.name || null, region: city?.region || null, mood_initial: null, team: null,
            terms_accepted: consent.terms, age_confirmed: consent.age, marketing_opt_in: consent.marketing,
        });
        setBusy(false);
        if (!res.ok) { setError(res.error); return; }
        try {
            localStorage.setItem("vm_signup_consent", JSON.stringify({
                timestamp: new Date().toISOString(),
                age_confirmed: consent.age, terms_accepted: consent.terms,
                marketing_opt_in: consent.marketing, terms_version: 1, privacy_version: 1,
            }));
        } catch { /* ignore */ }
        navigate("/feed");
    };

    const stepAccent = step === 1 ? PT.red : step === 2 ? PT.azul : PT.green;
    const stepTitleLead = step === 1 ? "Começa" : step === 2 ? "Escolhe" : "Quase";
    const stepTitleEm = step === 1 ? "agora" : step === 2 ? "a tua cidade" : "lá";
    const stepSub = step === 1
        ? "Nome, email e palavra-passe. Mais nada — promessa."
        : step === 2
            ? "Ajuda-nos a mostrar-te o que importa perto. Podes saltar."
            : "Aceita os termos e entra na rede.";

    const rightSlot = (
        <p className="text-[13px] font-semibold hidden sm:block" style={{ color: "rgba(10,10,10,0.62)" }}>
            Já tens conta?{" "}
            <Link
                to="/login"
                data-testid="goto-login"
                className="font-black underline underline-offset-4 decoration-2 ml-0.5"
                style={{ color: PT.ink, textDecorationColor: PT.azul }}
            >
                Entrar
            </Link>
        </p>
    );

    return (
        <>
            <AuthShell
                bottomLink={rightSlot}
                visual={
                    <VisualPanel
                        image={AUTH_IMG_REGISTER}
                        imageAlt="Porto aéreo ao pôr-do-sol"
                        kicker="Área · Criar conta"
                        accent={PT.gold}
                        titleLead="Bem-vindo"
                        titleEm="a casa"
                        titleTail="."
                        sub="Uma rede para portugueses que querem conversa, não palco. Sem cartão, sem trial."
                        cityName="Porto"
                        cityCaption="norte · douro"
                        quote="Aqui sinto-me em casa. Pessoas reais, à mesa."
                        quoteAuthor="Ana, Lisboa"
                    />
                }
            >
                <div className="auth-fade-up">
                    {/* Kicker */}
                    <Kicker color={stepAccent}>Criar conta · BETA</Kicker>

                    {/* Título bold + itálico */}
                    <h1
                        key={step}
                        className="font-black tracking-[-0.04em] leading-[0.92] mt-3 mb-4 auth-fade-up"
                        style={{ fontSize: "clamp(40px, 6vw, 64px)", color: PT.ink }}
                    >
                        {stepTitleLead}
                        <br />
                        <span className="relative inline-block">
                            <span style={{ fontStyle: "italic", color: stepAccent }}>{stepTitleEm}</span>
                            <span
                                className="absolute pointer-events-none"
                                style={{ left: 0, right: 0, bottom: "-0.08em", height: 12 }}
                                aria-hidden
                            >
                                <UnderlineStroke color={stepAccent} w={420} h={12} variant="wave" delay={0.2} strokeWidth={3.5} style={{ width: "100%", height: "100%" }} />
                            </span>
                        </span>
                        .
                    </h1>

                    {/* Sub */}
                    <p
                        className="text-[15.5px] sm:text-[16px] font-medium leading-relaxed mb-6"
                        style={{ color: "rgba(10,10,10,0.62)" }}
                    >
                        {stepSub}
                    </p>

                    {/* Steps progress */}
                    <div className="mb-7">
                        <StepDots current={step} total={3} labels={["Conta", "Cidade", "Termos"]} />
                    </div>

                    {/* Form */}
                    <form onSubmit={submit} data-testid="register-form" noValidate>
                        {step === 1 && (
                            <div className="space-y-5 auth-fade-up" data-testid="register-step-account">
                                <Field label="Nome" number="01" htmlFor="reg-name">
                                    <input
                                        id="reg-name"
                                        data-testid="register-name"
                                        type="text" value={form.name} onChange={update("name")} required
                                        placeholder="O teu nome"
                                        className={inputClass}
                                        autoComplete="name"
                                    />
                                </Field>

                                <Field label="Username" number="02" htmlFor="reg-username">
                                    <div className="relative">
                                        <input
                                            id="reg-username"
                                            data-testid="register-username"
                                            type="text"
                                            value={form.username}
                                            onChange={(e) => setForm({ ...form, username: e.target.value.trim() })}
                                            required minLength={3} maxLength={20}
                                            pattern="[a-zA-Z0-9_]+"
                                            placeholder="o_teu_user"
                                            className={`${inputClass} pr-11`}
                                            style={inputStateStyle(usernameState.status)}
                                            autoComplete="off" autoCapitalize="off" spellCheck={false}
                                        />
                                        <StatusIcon status={usernameState.status} testid="register-username-status" />
                                    </div>
                                    <FieldMessage status={usernameState.status} message={usernameState.message} testid="register-username-message" />
                                </Field>

                                <Field label="Email" number="03" htmlFor="reg-email">
                                    <div className="relative">
                                        <input
                                            id="reg-email"
                                            data-testid="register-email"
                                            type="email" value={form.email} onChange={update("email")} required
                                            placeholder="tu@exemplo.com"
                                            className={`${inputClass} pr-11`}
                                            style={inputStateStyle(emailState.status)}
                                            autoComplete="email" inputMode="email" autoCapitalize="off" spellCheck={false}
                                        />
                                        <StatusIcon status={emailState.status} testid="register-email-status" />
                                    </div>
                                    <FieldMessage
                                        status={emailState.status} message={emailState.message} testid="register-email-message"
                                        taken={emailState.status === "taken" ? (
                                            <>
                                                {emailState.message}{" "}
                                                <Link to="/login" className="underline underline-offset-2 hover:no-underline font-black ml-1" style={{ color: PT.red }}>
                                                    Entrar?
                                                </Link>
                                            </>
                                        ) : null}
                                    />
                                </Field>

                                <Field label="Palavra-passe" number="04" htmlFor="reg-pwd">
                                    <div className="relative">
                                        <input
                                            id="reg-pwd"
                                            data-testid="register-password"
                                            type={showPwd ? "text" : "password"}
                                            value={form.password} onChange={update("password")}
                                            required minLength={8}
                                            placeholder="Mínimo 8 caracteres"
                                            className={`${inputClass} pr-12`}
                                            style={(() => {
                                                if (!form.password) return undefined;
                                                const c = pwdEval.score >= 4 ? PT.green : pwdEval.color;
                                                return { borderColor: c, boxShadow: `0 0 0 3px ${c}22` };
                                            })()}
                                            autoComplete="new-password"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPwd((v) => !v)}
                                            className="absolute inset-y-0 right-3 grid place-items-center hover:opacity-60 transition-opacity"
                                            style={{ color: "rgba(10,10,10,0.55)" }}
                                            aria-label={showPwd ? "Esconder palavra-passe" : "Mostrar palavra-passe"}
                                            data-testid="register-password-toggle"
                                            tabIndex={-1}
                                        >
                                            {showPwd ? <EyeOff size={17} /> : <Eye size={17} />}
                                        </button>
                                    </div>
                                    {form.password && (
                                        <div className="mt-2.5" data-testid="register-password-strength">
                                            <div className="flex items-center gap-2.5">
                                                <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(10,10,10,0.08)" }}>
                                                    <div className="h-full rounded-full transition-all duration-300" style={{ width: `${(pwdEval.score / 5) * 100}%`, background: pwdEval.color }} />
                                                </div>
                                                <span className="font-mono text-[10px] font-black uppercase tabular-nums shrink-0" style={{ color: pwdEval.color, letterSpacing: "0.08em" }}>
                                                    {pwdEval.label}
                                                </span>
                                            </div>
                                            {pwdEval.reasons.length > 0 && pwdEval.score < 5 && (
                                                <p className="text-[11.5px] mt-1.5 leading-relaxed font-medium" style={{ color: "rgba(10,10,10,0.50)" }}>
                                                    Falta: {pwdEval.reasons.slice(0, 3).join(" · ")}
                                                </p>
                                            )}
                                        </div>
                                    )}
                                    {!form.password && (
                                        <p className="text-[11.5px] mt-1.5 leading-relaxed font-medium" style={{ color: "rgba(10,10,10,0.45)" }}>
                                            Mistura maiúsculas, minúsculas, números e símbolos.
                                        </p>
                                    )}
                                </Field>

                                <Field label="Repetir palavra-passe" number="05" htmlFor="reg-pwd-confirm">
                                    <div className="relative">
                                        <input
                                            id="reg-pwd-confirm"
                                            data-testid="register-password-confirm"
                                            type={showPwdConfirm ? "text" : "password"}
                                            value={form.passwordConfirm} onChange={update("passwordConfirm")}
                                            required minLength={8}
                                            placeholder="Escreve novamente"
                                            className={`${inputClass} pr-12`}
                                            style={
                                                pwdMatches ? { borderColor: PT.green, boxShadow: `0 0 0 3px ${PT.green}22` } :
                                                pwdMismatch ? { borderColor: PT.red, boxShadow: `0 0 0 3px ${PT.red}22` } : undefined
                                            }
                                            autoComplete="new-password"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPwdConfirm((v) => !v)}
                                            className="absolute inset-y-0 right-3 grid place-items-center hover:opacity-60 transition-opacity"
                                            style={{ color: "rgba(10,10,10,0.55)" }}
                                            aria-label={showPwdConfirm ? "Esconder palavra-passe" : "Mostrar palavra-passe"}
                                            tabIndex={-1}
                                        >
                                            {showPwdConfirm ? <EyeOff size={17} /> : <Eye size={17} />}
                                        </button>
                                    </div>
                                    {pwdMatches && (
                                        <p className="mt-1.5 text-[12px] font-mono font-bold inline-flex items-center gap-1" style={{ color: PT.green }} data-testid="register-password-match">
                                            <CheckCircle2 size={12} /> Coincide.
                                        </p>
                                    )}
                                    {pwdMismatch && (
                                        <p className="mt-1.5 text-[12px] font-mono font-bold inline-flex items-center gap-1" style={{ color: PT.red }} data-testid="register-password-mismatch">
                                            <AlertCircle size={12} /> Não coincidem.
                                        </p>
                                    )}
                                </Field>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-5 auth-fade-up" data-testid="register-step-city">
                                <Field label="A tua cidade" number="01" htmlFor="reg-city">
                                    <CitySelect
                                        value={city?.id || null}
                                        onChange={setCity}
                                        placeholder="Pesquisa — Lisboa, Olhão, Funchal…"
                                        testid="register-city"
                                    />
                                </Field>
                                {!city ? (
                                    <div
                                        className="flex items-start gap-3 px-4 py-4 rounded-2xl"
                                        style={{
                                            background: "#fff",
                                            border: "1.5px dashed rgba(10,10,10,0.15)",
                                        }}
                                    >
                                        <MapPin size={20} className="shrink-0 mt-0.5" style={{ color: PT.azul }} />
                                        <div>
                                            <p className="text-[13.5px] font-bold leading-snug" style={{ color: PT.ink }}>
                                                A tua identidade começa pelo lugar.
                                            </p>
                                            <p className="text-[12px] font-medium leading-snug mt-1" style={{ color: "rgba(10,10,10,0.55)" }}>
                                                Mostraremos comunidades e eventos perto de ti. Podes saltar.
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div
                                        className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                                        style={{
                                            background: "#fff",
                                            border: `1.5px solid ${PT.green}33`,
                                            boxShadow: `0 0 0 3px ${PT.green}10`,
                                        }}
                                    >
                                        <CheckCircle2 size={18} style={{ color: PT.green }} />
                                        <div className="flex-1">
                                            <p className="text-[13.5px] font-bold" style={{ color: PT.ink }}>
                                                {city.name}
                                            </p>
                                            {city.region && (
                                                <p className="text-[11.5px] font-mono uppercase mt-0.5" style={{ color: "rgba(10,10,10,0.55)", letterSpacing: "0.08em" }}>
                                                    {city.region}
                                                </p>
                                            )}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setCity(null)}
                                            className="text-[11px] font-bold uppercase opacity-60 hover:opacity-100"
                                            style={{ color: PT.ink, letterSpacing: "0.06em" }}
                                        >
                                            Alterar
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {step === 3 && (
                            <div className="space-y-3 auth-fade-up" data-testid="register-step-consent">
                                {/* Visual brief recap */}
                                <div
                                    className="flex items-start gap-3 px-4 py-3.5 rounded-2xl mb-1"
                                    style={{ background: "#fff", border: "1px solid rgba(10,10,10,0.06)" }}
                                >
                                    <Sparkles size={18} className="shrink-0 mt-0.5" style={{ color: PT.gold }} />
                                    <div>
                                        <p className="text-[13.5px] font-bold leading-snug" style={{ color: PT.ink }}>
                                            <span style={{ fontStyle: "italic" }}>Sem letra pequena.</span> Os teus dados são teus.
                                        </p>
                                        <p className="text-[12px] font-medium leading-snug mt-1" style={{ color: "rgba(10,10,10,0.55)" }}>
                                            Podes apagar a conta com um clique nas definições.
                                        </p>
                                    </div>
                                </div>

                                <ConsentRow
                                    id="consent-age" checked={consent.age}
                                    onChange={() => toggleConsent("age")}
                                    testid="consent-age" required
                                >
                                    Confirmo que tenho <strong className="font-black">16 anos ou mais</strong>.
                                </ConsentRow>
                                <ConsentRow
                                    id="consent-terms" checked={consent.terms}
                                    onChange={() => toggleConsent("terms")}
                                    testid="consent-terms" required
                                >
                                    Li e aceito os{" "}
                                    <Link to="/legal/terms" target="_blank" className="underline underline-offset-2 font-black" style={{ color: PT.ink }}>
                                        Termos
                                    </Link>{" "}
                                    e a{" "}
                                    <Link to="/legal/privacy" target="_blank" className="underline underline-offset-2 font-black" style={{ color: PT.ink }}>
                                        Política de Privacidade
                                    </Link>.
                                </ConsentRow>
                                <ConsentRow
                                    id="consent-marketing" checked={consent.marketing}
                                    onChange={() => toggleConsent("marketing")}
                                    testid="consent-marketing"
                                >
                                    <span style={{ color: "rgba(10,10,10,0.55)" }}>Opcional —</span>{" "}
                                    quero novidades por e-mail.
                                </ConsentRow>
                            </div>
                        )}

                        {error && (
                            <div className="mt-5">
                                <ErrorBanner message={error} dataTestid="register-error" />
                            </div>
                        )}

                        {/* Action bar */}
                        <div className="mt-7 flex items-center gap-3">
                            {step > 1 && (
                                <GhostButton onClick={back} dataTestid="register-back">
                                    <ArrowLeft size={15} strokeWidth={2.5} /> Voltar
                                </GhostButton>
                            )}
                            {step < 3 ? (
                                <div className="flex-1 flex flex-col gap-1.5">
                                    <PrimaryButton
                                        type="button"
                                        onClick={next}
                                        dataTestid="register-next"
                                    >
                                        {step === 2 && !city ? "Saltar" : "Seguinte"} <ArrowRight size={16} strokeWidth={2.5} />
                                    </PrimaryButton>
                                    {step === 1 && !canStep1 && (
                                        <p
                                            className="text-[11.5px] font-medium text-center px-2"
                                            data-testid="register-step1-hint"
                                            style={{ color: "rgba(10,10,10,0.55)" }}
                                        >
                                            {step1Missing()}
                                        </p>
                                    )}
                                </div>
                            ) : (
                                <PrimaryButton type="submit" disabled={!canSubmit} busy={busy} dataTestid="register-submit">
                                    {busy ? (<><Loader2 size={15} className="animate-spin" /> A criar…</>) : (<>Criar conta <Check size={16} strokeWidth={2.5} /></>)}
                                </PrimaryButton>
                            )}
                        </div>

                        {/* Terms disclaimer (under action bar) */}
                        <p
                            className="mt-4 text-[11.5px] font-medium leading-relaxed text-center px-2"
                            data-testid="register-terms-disclaimer"
                            style={{ color: "rgba(10,10,10,0.55)" }}
                        >
                            Ao continuar, aceitas os nossos{" "}
                            <Link
                                to="/legal/terms"
                                target="_blank"
                                className="font-bold underline underline-offset-2"
                                style={{ color: PT.ink, textDecorationColor: PT.red, textDecorationThickness: 1.5 }}
                            >
                                Termos
                            </Link>{" "}
                            e a{" "}
                            <Link
                                to="/legal/privacy"
                                target="_blank"
                                className="font-bold underline underline-offset-2"
                                style={{ color: PT.ink, textDecorationColor: PT.red, textDecorationThickness: 1.5 }}
                            >
                                Política de Privacidade
                            </Link>.
                        </p>
                    </form>

                    {/* Bottom link (mobile) */}
                    <p className="mt-7 text-[13px] font-medium text-center" style={{ color: "rgba(10,10,10,0.55)" }}>
                        Já tens conta?{" "}
                        <Link
                            to="/login"
                            data-testid="goto-login-mobile"
                            className="font-black ml-0.5"
                            style={{ color: PT.ink, textDecoration: "underline", textUnderlineOffset: 3, textDecorationColor: PT.azul, textDecorationThickness: 2 }}
                        >
                            Entrar
                        </Link>
                    </p>
                </div>
            </AuthShell>
            <SiteFooter />
        </>
    );
}

// =============================================================================
// Sub-componentes
// =============================================================================
function StatusIcon({ status, testid }) {
    return (
        <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none" data-testid={testid}>
            {status === "checking" && <Loader2 size={16} className="animate-spin" style={{ color: "rgba(10,10,10,0.45)" }} />}
            {status === "available" && <CheckCircle2 size={18} style={{ color: PT.green }} />}
            {(status === "taken" || status === "invalid") && <X size={18} style={{ color: PT.red }} strokeWidth={2.5} />}
        </div>
    );
}

function FieldMessage({ status, message, testid, taken }) {
    if (!message) return null;
    const color =
        status === "available" ? PT.green :
        (status === "taken" || status === "invalid") ? PT.red :
        "rgba(10,10,10,0.55)";
    const Icon = status === "available" ? CheckCircle2 : (status === "taken" || status === "invalid") ? AlertCircle : null;
    return (
        <p className="mt-1.5 text-[12px] font-mono font-bold inline-flex items-center gap-1" style={{ color }} data-testid={testid}>
            {Icon && <Icon size={12} />}
            <span>{taken ?? message}</span>
        </p>
    );
}

function ConsentRow({ id, checked, onChange, testid, required, children }) {
    return (
        <label
            htmlFor={id}
            className="flex items-start gap-3 p-3.5 rounded-2xl cursor-pointer transition-all select-none"
            style={{
                background: "#fff",
                border: `1.5px solid ${checked ? PT.green : "rgba(10,10,10,0.10)"}`,
                boxShadow: checked ? `0 0 0 3px ${PT.green}10` : "none",
            }}
        >
            <input
                id={id} type="checkbox" checked={checked} onChange={onChange}
                data-testid={testid}
                className="mt-0.5 w-4 h-4 shrink-0 cursor-pointer"
                style={{ accentColor: PT.ink }}
            />
            <span className="text-[13px] leading-relaxed font-medium" style={{ color: PT.ink }}>
                {children}
                {required && <span className="ml-1 font-black" style={{ color: PT.red }} aria-hidden>*</span>}
            </span>
        </label>
    );
}
