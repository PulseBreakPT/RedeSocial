import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ArrowRight, Check, Loader2, X, Eye, EyeOff, AlertCircle, CheckCircle2, MapPin } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { CitySelect } from "../components/CitySelect";
import SiteFooter from "../components/SiteFooter";
import {
    PT, Sticker, StampCircle, TapedPhoto, PosterCard, MagNumber, Kicker, AuthStyles,
    DoodleArrow, DoodleScribble, DoodleStar, DoodleHeart, DoodleExclamation,
    DoodleSpiral, DoodleZigzag, DoodleCircleNote, DoodleUnderline, DoodleSparkles,
    DoodleLongArrow, DoodleCross, HandNote,
    GeoTriangle, GeoSquare, GeoCircle, GiantAsterisk,
} from "./auth/AuthDecor";

const REGISTER_HERO = "/hero/register.webp";

// =====================================================================
// Password strength (paleta PT)
// =====================================================================
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

    const usernameState = useAvailabilityCheck({ value: form.username, endpoint: "/api/auth/check-username", paramName: "u", localValidate: _validateUsernameLocal });
    const emailState = useAvailabilityCheck({ value: form.email, endpoint: "/api/auth/check-email", paramName: "e", localValidate: _validateEmailLocal });
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

    const next = () => {
        setError("");
        if (step === 1) {
            if (!nameValid) return setError("Diz-nos o teu nome.");
            if (usernameState.status === "taken") return setError("Esse username já está em uso.");
            if (usernameState.status === "invalid") return setError(usernameState.message || "Username inválido.");
            if (usernameState.status !== "available") return setError("Espera pela verificação do username.");
            if (emailState.status === "taken") return setError("Já existe uma conta com esse email.");
            if (emailState.status === "invalid") return setError(emailState.message || "Email inválido.");
            if (emailState.status !== "available") return setError("Espera pela verificação do email.");
            if (form.password.length < 8) return setError("A palavra-passe tem de ter pelo menos 8 caracteres.");
            if (pwdEval.score < 2) return setError("A palavra-passe é demasiado fraca. Reforça-a.");
            if (!pwdMatches) return setError("As palavras-passe não coincidem.");
        }
        setStep((s) => Math.min(3, s + 1));
    };
    const back = () => setStep((s) => Math.max(1, s - 1));

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

    return (
        <div className="min-h-screen relative overflow-hidden" style={{ background: "#FFFFFF" }}>
            <div className="pt-tape h-3 w-full" />

            <div className="grid lg:grid-cols-[1fr_1.05fr] relative">
                {/* ============ ESQUERDA · FORMULÁRIO ============ */}
                <div className="relative px-5 sm:px-10 lg:px-14 pt-8 lg:pt-12 pb-16 order-2 lg:order-1" style={{ background: "#FFFFFF" }}>
                    {/* Decorações secundárias — algumas visíveis em mobile (escaladas) */}
                    <div className="absolute top-3 right-3 sm:top-6 sm:right-6 pointer-events-none block opacity-70 scale-[0.6] sm:scale-100 sm:opacity-100 origin-top-right">
                        <DoodleScribble color={PT.green} w={120} h={42} style={{ transform: "rotate(-8deg)" }} />
                    </div>
                    <div className="absolute bottom-28 -left-2 sm:bottom-32 sm:-left-3 pointer-events-none block opacity-70 scale-[0.55] sm:scale-100 sm:opacity-100 origin-bottom-left">
                        <DoodleStar color={PT.red} size={50} rotate={-12} />
                    </div>
                    <div className="absolute top-32 right-2 pointer-events-none block opacity-60 scale-[0.5] sm:scale-100 sm:opacity-100 origin-top-right">
                        <DoodleSparkles color={PT.red} size={48} rotate={-8} />
                    </div>
                    <div className="absolute bottom-48 right-4 pointer-events-none hidden sm:block">
                        <DoodleSpiral color={PT.gold} size={68} rotate={12} />
                    </div>
                    <div className="absolute top-[58%] -right-1 sm:-right-2 pointer-events-none block opacity-60 scale-[0.6] sm:scale-100 sm:opacity-100">
                        <GeoCircle color={PT.azul} size={26} />
                    </div>
                    <div className="absolute top-[42%] right-16 pointer-events-none hidden sm:block">
                        <DoodleCross color={PT.green} size={22} rotate={-14} />
                    </div>
                    <div className="absolute bottom-5 left-3 sm:bottom-10 sm:left-6 pointer-events-none block opacity-70 scale-[0.6] sm:scale-100 sm:opacity-100 origin-bottom-left">
                        <DoodleZigzag color={PT.red} w={140} h={32} style={{ transform: "rotate(6deg)" }} />
                    </div>

                    <div className="relative max-w-md w-full mx-auto lg:mx-0 z-10">
                        {/* Header — só desktop (lg+); marca também presente no SiteFooter */}
                        <div className="hidden lg:flex items-center justify-between mb-7 relative">
                            <div className="flex items-baseline gap-1.5">
                                <span style={{ color: PT.green, fontSize: 32, textShadow: `2px 2px 0 ${PT.gold}` }} className="font-black leading-none">✱</span>
                                <span
                                    className="text-[24px] font-black tracking-tight"
                                    style={{ color: PT.ink, textShadow: `2px 2px 0 ${PT.gold}` }}
                                >
                                    lusorae
                                </span>
                            </div>

                            {/* Indicador LIVE */}
                            <div className="flex items-center gap-2">
                                <span className="relative flex h-2.5 w-2.5" aria-hidden>
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: PT.green }} />
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ background: PT.green, border: `1.5px solid ${PT.ink}` }} />
                                </span>
                                <span className="text-[10.5px] font-mono font-black uppercase" style={{ letterSpacing: "0.14em", color: PT.ink }}>
                                    novo · agora
                                </span>
                            </div>

                            {/* Chip EST. + Sticker passo */}
                            <div className="flex items-center gap-2">
                                <span
                                    className="text-[10px] font-mono font-black uppercase"
                                    style={{
                                        letterSpacing: "0.16em",
                                        background: PT.ink,
                                        color: PT.gold,
                                        padding: "3px 7px",
                                        border: `1.5px solid ${PT.ink}`,
                                        boxShadow: `2px 2px 0 ${PT.green}`,
                                    }}
                                >
                                    EST. 2026
                                </span>
                                <Sticker bg={PT.azul} color="#fff" rotate={6}>Pg. {String(step + 1).padStart(2, "0")}</Sticker>
                            </div>

                            {/* Doodle entre marca e LIVE */}
                            <div className="absolute left-[28%] -bottom-3 pointer-events-none">
                                <DoodleStar color={PT.red} size={20} rotate={-12} />
                            </div>
                        </div>

                        {/* STEPPER tipo "barra de revista" */}
                        <div className="flex items-center gap-2 mb-5" data-testid="register-stepper">
                            {[
                                { n: 1, color: PT.red, label: "Conta" },
                                { n: 2, color: PT.gold, label: "Cidade" },
                                { n: 3, color: PT.green, label: "OK" },
                            ].map(({ n, color, label }) => {
                                const active = step >= n;
                                return (
                                    <div key={n} className="flex-1 flex items-center gap-2">
                                        <div
                                            className="h-2 flex-1 rounded-full transition-colors"
                                            style={{
                                                background: active ? color : "rgba(10,10,10,0.10)",
                                                border: active ? `2px solid ${PT.ink}` : "2px solid transparent",
                                            }}
                                        />
                                        <span
                                            className="text-[9.5px] font-mono font-black uppercase shrink-0"
                                            style={{ letterSpacing: "0.10em", color: active ? PT.ink : "rgba(10,10,10,0.35)" }}
                                        >
                                            {label}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        <div className="flex items-center gap-3 mb-2">
                            <Kicker color={PT.green}>PASSO {String(step).padStart(2, "0")} DE 03</Kicker>
                            <DoodleArrow color={PT.green} w={60} h={26} style={{ transform: "rotate(-4deg)" }} />
                        </div>

                        {/* TÍTULO — controlado para evitar overflow + doodles a marcar */}
                        <div className="relative">
                            <h2
                                className="font-black tracking-[-0.04em]"
                                style={{ fontSize: "clamp(34px, 4.6vw, 60px)", lineHeight: 0.92, color: PT.ink }}
                            >
                                {step === 1 && (<>
                                    <span style={{ display: "inline-block", transform: "rotate(-1deg)" }}>Cria a tua</span>{" "}
                                    <span style={{
                                        background: PT.gold,
                                        padding: "0 0.10em",
                                        boxShadow: `4px 4px 0 ${PT.ink}, 8px 8px 0 ${PT.green}`,
                                        display: "inline-block",
                                        transform: "rotate(1deg)",
                                        border: `3px solid ${PT.ink}`,
                                        WebkitTextStroke: `0.5px ${PT.ink}`,
                                    }}>
                                        conta.
                                    </span>
                                </>)}
                                {step === 2 && (<>
                                    <span style={{ display: "inline-block", transform: "rotate(-1deg)" }}>De onde</span>{" "}
                                    <span style={{
                                        background: PT.red,
                                        color: "#fff",
                                        padding: "0 0.12em",
                                        boxShadow: `4px 4px 0 ${PT.ink}, 8px 8px 0 ${PT.gold}`,
                                        display: "inline-block",
                                        transform: "rotate(2deg)",
                                        border: `3px solid ${PT.ink}`,
                                        WebkitTextStroke: `0.5px ${PT.ink}`,
                                    }}>
                                        és?
                                    </span>
                                </>)}
                                {step === 3 && (<>
                                    <span style={{ display: "inline-block", transform: "rotate(-1deg)" }}>Última coisa,</span><br/>
                                    <span style={{
                                        background: PT.green,
                                        color: "#fff",
                                        padding: "0 0.10em",
                                        boxShadow: `4px 4px 0 ${PT.ink}, 8px 8px 0 ${PT.gold}`,
                                        display: "inline-block",
                                        transform: "rotate(1deg)",
                                        border: `3px solid ${PT.ink}`,
                                        WebkitTextStroke: `0.5px ${PT.ink}`,
                                    }}>
                                        juramos.
                                    </span>
                                </>)}
                            </h2>
                            {/* Círculo a marcar a palavra colorida */}
                            <div className="absolute -bottom-3 right-2 pointer-events-none">
                                <DoodleCircleNote
                                    color={step === 1 ? PT.red : step === 2 ? PT.green : PT.red}
                                    w={160} h={64} rotate={3}
                                />
                            </div>
                            {/* Nota manuscrita */}
                            <div className="absolute -right-2 -top-4 pointer-events-none hidden sm:block">
                                <HandNote color={PT.green} rotate={-6} size={20}>
                                    {step === 1 ? "rápido!" : step === 2 ? "opcional" : "promessa!"}
                                </HandNote>
                            </div>
                        </div>

                        <div className="mt-4 flex items-start gap-3">
                            <DoodleHeart color={PT.green} size={26} rotate={-12} style={{ flexShrink: 0, marginTop: 2 }} />
                            <p className="text-[15px] font-medium leading-relaxed" style={{ color: "rgba(10,10,10,0.78)" }}>
                                {step === 1 && "Nome, email e palavra-passe. Mais nada para já."}
                                {step === 2 && "Escolhe a tua cidade — ajuda-nos a mostrar-te o que importa perto. Podes saltar."}
                                {step === 3 && "Quase lá. Aceita os termos para começar."}
                            </p>
                        </div>

                        {/* Benefit poster card */}
                        <div
                            data-testid={`register-benefit-${step}`}
                            className="mt-6 relative"
                        >
                            <PosterCard bg="#fff" color={PT.ink} rotate={-1.5} shadow={PT.gold} style={{ padding: "14px 16px" }}>
                                <div className="flex items-start gap-3">
                                    <MagNumber n={step} color={step === 1 ? PT.red : step === 2 ? PT.gold : PT.green} size={42} />
                                    <p className="text-[13px] font-medium leading-relaxed pt-1.5">
                                        {step === 1 && (<><strong className="font-black">30 segundos.</strong> Sem cartão, sem upsell, sem trial. Conta gratuita para sempre.</>)}
                                        {step === 2 && (<><strong className="font-black">Lisboa, Porto, Olhão, Funchal…</strong> ~300 cidades portuguesas. A tua identidade começa pelo lugar.</>)}
                                        {step === 3 && (<><strong className="font-black">Sem letra pequena.</strong> Os teus dados são teus. Podes apagar a conta com um clique.</>)}
                                    </p>
                                </div>
                            </PosterCard>
                        </div>

                        <form onSubmit={submit} className="mt-7" data-testid="register-form">
                            {step === 1 && (
                                <div className="space-y-5">
                                    <PtField label="Nome" number="01">
                                        <input
                                            data-testid="register-name"
                                            type="text" value={form.name} onChange={update("name")} required
                                            placeholder="O teu nome"
                                            className="pt-input"
                                            autoComplete="name"
                                        />
                                    </PtField>

                                    <PtField label="Username" number="02">
                                        <div className="relative">
                                            <input
                                                data-testid="register-username"
                                                type="text"
                                                value={form.username}
                                                onChange={(e) => setForm({ ...form, username: e.target.value.trim() })}
                                                required minLength={3} maxLength={20}
                                                pattern="[a-zA-Z0-9_]+"
                                                placeholder="o_teu_user"
                                                className="pt-input pr-11"
                                                style={statusBorder(usernameState.status)}
                                                autoComplete="off" autoCapitalize="off" spellCheck={false}
                                            />
                                            <StatusIcon status={usernameState.status} testid="register-username-status" />
                                        </div>
                                        <FieldMessage status={usernameState.status} message={usernameState.message} testid="register-username-message" />
                                    </PtField>

                                    <PtField label="Email" number="03">
                                        <div className="relative">
                                            <input
                                                data-testid="register-email"
                                                type="email" value={form.email} onChange={update("email")} required
                                                placeholder="tu@exemplo.com"
                                                className="pt-input pr-11"
                                                style={statusBorder(emailState.status)}
                                                autoComplete="email" inputMode="email" autoCapitalize="off" spellCheck={false}
                                            />
                                            <StatusIcon status={emailState.status} testid="register-email-status" />
                                        </div>
                                        <FieldMessage
                                            status={emailState.status} message={emailState.message} testid="register-email-message"
                                            taken={emailState.status === "taken" ? (
                                                <>
                                                    {emailState.message}{" "}
                                                    <Link to="/login" className="underline underline-offset-2 hover:no-underline font-black" style={{ color: PT.red }}>
                                                        Entrar?
                                                    </Link>
                                                </>
                                            ) : null}
                                        />
                                    </PtField>

                                    <PtField label="Palavra-passe" number="04">
                                        <div className="relative">
                                            <input
                                                data-testid="register-password"
                                                type={showPwd ? "text" : "password"}
                                                value={form.password} onChange={update("password")}
                                                required minLength={8}
                                                placeholder="Mínimo 8 caracteres"
                                                className="pt-input pr-12"
                                                style={(() => {
                                                    if (!form.password) return undefined;
                                                    const c = pwdEval.score >= 4 ? PT.green : pwdEval.color;
                                                    return { borderColor: c, boxShadow: `4px 4px 0 ${c}` };
                                                })()}
                                                autoComplete="new-password"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPwd((v) => !v)}
                                                className="absolute inset-y-0 right-3 flex items-center hover:opacity-70"
                                                style={{ color: PT.ink }}
                                                aria-label={showPwd ? "Esconder palavra-passe" : "Mostrar palavra-passe"}
                                                data-testid="register-password-toggle"
                                                tabIndex={-1}
                                            >
                                                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                        {form.password && (
                                            <div className="mt-2.5" data-testid="register-password-strength">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: "rgba(10,10,10,0.10)", border: `1.5px solid ${PT.ink}` }}>
                                                        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${(pwdEval.score / 5) * 100}%`, background: pwdEval.color }} />
                                                    </div>
                                                    <span className="text-[10.5px] font-mono font-black uppercase tabular-nums shrink-0" style={{ color: pwdEval.color, letterSpacing: "0.08em" }}>
                                                        {pwdEval.label}
                                                    </span>
                                                </div>
                                                {pwdEval.reasons.length > 0 && pwdEval.score < 5 && (
                                                    <p className="text-[11.5px] mt-1.5 leading-relaxed font-medium" style={{ color: "rgba(10,10,10,0.55)" }}>
                                                        Falta: {pwdEval.reasons.slice(0, 3).join(" · ")}
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                        {!form.password && (
                                            <p className="text-[11.5px] mt-1.5 leading-relaxed font-medium" style={{ color: "rgba(10,10,10,0.50)" }}>
                                                Mistura maiúsculas, minúsculas, números e símbolos.
                                            </p>
                                        )}
                                    </PtField>

                                    <PtField label="Repetir palavra-passe" number="05">
                                        <div className="relative">
                                            <input
                                                data-testid="register-password-confirm"
                                                type={showPwdConfirm ? "text" : "password"}
                                                value={form.passwordConfirm} onChange={update("passwordConfirm")}
                                                required minLength={8}
                                                placeholder="Escreve novamente"
                                                className="pt-input pr-12"
                                                style={
                                                    pwdMatches ? { borderColor: PT.green, boxShadow: `4px 4px 0 ${PT.green}` } :
                                                    pwdMismatch ? { borderColor: PT.red, boxShadow: `4px 4px 0 ${PT.red}` } : undefined
                                                }
                                                autoComplete="new-password"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPwdConfirm((v) => !v)}
                                                className="absolute inset-y-0 right-3 flex items-center hover:opacity-70"
                                                style={{ color: PT.ink }}
                                                aria-label={showPwdConfirm ? "Esconder palavra-passe" : "Mostrar palavra-passe"}
                                                tabIndex={-1}
                                            >
                                                {showPwdConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                                            </button>
                                        </div>
                                        {pwdMatches && (
                                            <p className="mt-1.5 text-[12px] font-mono font-black" style={{ color: PT.green }} data-testid="register-password-match">
                                                <CheckCircle2 size={11} className="inline mr-1 -mt-0.5" /> Coincide.
                                            </p>
                                        )}
                                        {pwdMismatch && (
                                            <p className="mt-1.5 text-[12px] font-mono font-black" style={{ color: PT.red }} data-testid="register-password-mismatch">
                                                <AlertCircle size={11} className="inline mr-1 -mt-0.5" /> As palavras-passe não coincidem.
                                            </p>
                                        )}
                                    </PtField>
                                </div>
                            )}

                            {step === 2 && (
                                <div className="space-y-4 pt-1" data-testid="register-step-city">
                                    <PtField label="A tua cidade" number="01">
                                        <CitySelect
                                            value={city?.id || null}
                                            onChange={setCity}
                                            placeholder="Pesquisa — Lisboa, Olhão, Funchal…"
                                            testid="register-city"
                                        />
                                    </PtField>
                                    {!city && (
                                        <div
                                            className="rounded-xl px-4 py-6 text-center relative"
                                            style={{
                                                border: `3px dashed ${PT.ink}`,
                                                background: "#fff",
                                                boxShadow: `4px 4px 0 ${PT.ink}`,
                                            }}
                                        >
                                            <MapPin size={24} className="inline mb-2" style={{ color: PT.red }} />
                                            <p className="text-[13.5px] leading-relaxed font-medium" style={{ color: PT.ink }}>
                                                Escolhe a tua cidade — mostraremos a sua história e cultura.<br/>
                                                <span className="text-[11.5px] font-mono uppercase font-bold" style={{ letterSpacing: "0.12em", color: "rgba(10,10,10,0.50)" }}>Podes saltar este passo</span>
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {step === 3 && (
                                <div className="space-y-3 pt-1">
                                    <PosterCard bg={PT.azul} color="#fff" rotate={-1.5} shadow={PT.gold} style={{ padding: "16px 18px" }}>
                                        <Kicker color={PT.gold} className="mb-2">VOZ · COMUNIDADE</Kicker>
                                        <blockquote className="font-black text-[19px] leading-[1.18] tracking-tight max-w-[34ch]">
                                            “Aqui sinto-me em{" "}
                                            <span style={{ background: PT.gold, color: PT.ink, padding: "0 0.16em" }}>casa</span>
                                            . Pessoas reais, à mesa.”
                                        </blockquote>
                                        <p className="mt-2 text-[11px] font-mono uppercase font-bold" style={{ letterSpacing: "0.14em", opacity: 0.80 }}>
                                            — Ana, Lisboa
                                        </p>
                                    </PosterCard>

                                    <ConsentCheckbox
                                        id="consent-age" checked={consent.age}
                                        onChange={() => toggleConsent("age")}
                                        testid="consent-age" required
                                    >
                                        Confirmo que tenho <strong>16 anos ou mais</strong>.
                                    </ConsentCheckbox>
                                    <ConsentCheckbox
                                        id="consent-terms" checked={consent.terms}
                                        onChange={() => toggleConsent("terms")}
                                        testid="consent-terms" required
                                    >
                                        Li e aceito os{" "}
                                        <Link to="/legal/terms" target="_blank" className="underline underline-offset-2 hover:no-underline font-black" style={{ color: PT.red }}>
                                            Termos
                                        </Link>{" "}
                                        e a{" "}
                                        <Link to="/legal/privacy" target="_blank" className="underline underline-offset-2 hover:no-underline font-black" style={{ color: PT.red }}>
                                            Política de Privacidade
                                        </Link>.
                                    </ConsentCheckbox>
                                    <ConsentCheckbox
                                        id="consent-marketing" checked={consent.marketing}
                                        onChange={() => toggleConsent("marketing")}
                                        testid="consent-marketing"
                                    >
                                        <span style={{ color: "rgba(10,10,10,0.70)" }}>Opcional</span> — quero novidades por e-mail.
                                    </ConsentCheckbox>
                                </div>
                            )}

                            {error && (
                                <PosterCard bg={PT.red} color="#fff" rotate={-1} shadow={PT.ink} className="mt-4" style={{ padding: "12px 16px" }}>
                                    <div data-testid="register-error" className="flex items-start gap-2 font-black text-[13.5px] uppercase" style={{ letterSpacing: "0.04em" }}>
                                        <AlertCircle size={16} className="shrink-0 mt-0.5" /> <span>{error}</span>
                                    </div>
                                </PosterCard>
                            )}

                            <div className="mt-7 flex items-center gap-3 relative">
                                {step > 1 && (
                                    <button
                                        type="button" onClick={back}
                                        data-testid="register-back"
                                        className="pt-btn-ghost text-[13px] py-3 px-5"
                                    >
                                        ← VOLTAR
                                    </button>
                                )}
                                {step < 3 ? (
                                    <button
                                        type="button" onClick={next}
                                        data-testid="register-next"
                                        disabled={step === 1 ? !canStep1 : false}
                                        className="pt-btn-primary flex-1 text-[16px] py-4 disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        {step === 2 && !city ? "SALTAR" : "SEGUINTE"} <ArrowRight size={18} />
                                    </button>
                                ) : (
                                    <button
                                        type="submit" disabled={!canSubmit}
                                        data-testid="register-submit"
                                        className="pt-btn-primary flex-1 text-[16px] py-4 disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        {busy ? (<><Loader2 size={16} className="animate-spin" /> A CRIAR…</>) : (<>CRIAR CONTA <Check size={18} /></>)}
                                    </button>
                                )}
                                <div className="absolute -top-5 right-4 sm:right-6 pointer-events-none hidden sm:block">
                                    <Sticker bg={PT.gold} color={PT.ink} rotate={-12} style={{ fontSize: 9.5, padding: "5px 9px" }}>
                                        GRÁTIS ✱
                                    </Sticker>
                                </div>
                                <div className="absolute -bottom-7 right-8 sm:right-12 pointer-events-none hidden sm:block">
                                    <DoodleZigzag color={PT.green} w={140} h={20} />
                                </div>
                            </div>

                        </form>

                        <div className="mt-8 flex items-center justify-between flex-wrap gap-3">
                            <p className="text-[14px] font-semibold" style={{ color: "rgba(10,10,10,0.72)" }}>
                                Já tens conta?{" "}
                                <Link
                                    to="/login"
                                    data-testid="goto-login"
                                    className="font-black underline underline-offset-4 decoration-[3px]"
                                    style={{ color: PT.green, textDecorationColor: PT.gold }}
                                >
                                    Entrar
                                </Link>
                            </p>
                            <Sticker bg={PT.red} color="#fff" rotate={5}>GRÁTIS ✓</Sticker>
                        </div>
                    </div>
                </div>

                {/* ============ DIREITA · POSTER URBANO VERDE ============ */}
                <PosterRight step={step} />
            </div>

            <div className="pt-tape h-3 w-full" />
            <SiteFooter />
            <AuthStyles />
        </div>
    );
}

// =============================================================================
// POSTER DIREITO — verde (responsivo)
// =============================================================================
function PosterRight({ step }) {
    return (
        <div
            className="hidden lg:flex relative overflow-hidden isolate pt-grain flex-col order-1 lg:order-2"
            style={{ background: PT.green, color: "#fff" }}
            data-testid="brand-panel"
        >
            <div className="absolute -top-14 -right-10 z-0 scale-50 sm:scale-75 lg:scale-100 origin-top-right">
                <GiantAsterisk color={PT.gold} size={300} rotate={12} />
            </div>

            <div
                className="absolute top-[28%] -right-8 z-0 hidden sm:block"
                style={{
                    width: "115%",
                    height: 52,
                    background: PT.red,
                    transform: "rotate(3deg)",
                    boxShadow: `inset 0 0 0 3px ${PT.ink}`,
                }}
                aria-hidden
            />

            <div className="relative z-10 p-5 sm:p-8 lg:p-10 xl:p-14 flex flex-col gap-5 flex-1">
                {/* Stamp da edição (sem duplicar nome da marca — reservada para header/SiteFooter) */}
                <div className="flex items-start justify-end gap-3">
                    <StampCircle bg={PT.ink} color={PT.gold} rotate={-10} size={68}>
                        NOVO<br/>MEMBRO<br/>Nº&nbsp;∞
                    </StampCircle>
                </div>

                {/* MANCHETE — controlada */}
                <div className="relative">
                    <Kicker color={PT.gold} className="mb-2">JUNTA-TE</Kicker>
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
                            textShadow: `4px 4px 0 ${PT.ink}, 8px 8px 0 ${PT.red}`,
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
                        <div className="absolute" style={{ top: 30, left: 40 }}>
                            <TapedPhoto
                                src={REGISTER_HERO}
                                alt="Santos Populares"
                                rotate={4}
                                w={180}
                                h={220}
                                caption="santos pop. ’26"
                            />
                        </div>
                        {/* Doodles secundários — só sm+ */}
                        <div className="absolute -top-4 right-2 z-10 pointer-events-none hidden sm:block">
                            <DoodleSparkles color={PT.gold} size={56} rotate={14} />
                        </div>
                        <div className="absolute -top-4 -left-4 z-20 pointer-events-none">
                            <StampCircle bg={PT.red} color="#fff" rotate={-14} size={62}>
                                SANTOS<br/>POP.<br/>2026
                            </StampCircle>
                        </div>
                        <div className="absolute bottom-1 right-2 z-20 pointer-events-none">
                            <Sticker bg={PT.ink} color={PT.gold} rotate={5} style={{ fontSize: 9.5, padding: "5px 10px" }}>
                                📍 LISBOA · ALFAMA
                            </Sticker>
                        </div>
                        <div className="absolute top-[42%] right-[-18px] z-30 pointer-events-none hidden sm:block">
                            <DoodleLongArrow color={PT.gold} w={90} h={70} rotate={-30} />
                        </div>
                        <div className="absolute -bottom-2 left-4 z-30 pointer-events-none hidden sm:block">
                            <HandNote color={PT.gold} rotate={4} size={22}>
                                ↳ a tua rua
                            </HandNote>
                        </div>
                        <div className="absolute top-[60%] left-[-14px] z-30 pointer-events-none hidden sm:block">
                            <DoodleCross color={PT.gold} size={24} rotate={-10} />
                        </div>
                    </div>

                    {/* Cartão "3 passos" */}
                    <div className="relative flex-1 min-w-[240px] max-w-[340px] pt-2 mt-6 sm:mt-0">
                        <PosterCard bg={PT.ink} color="#fff" rotate={-2} shadow={PT.gold} style={{ padding: "14px 16px" }}>
                            <Kicker color={PT.gold} className="mb-2">3 PASSOS</Kicker>
                            <ul className="space-y-1.5 text-[13.5px] font-bold leading-tight">
                                <PassoItem n={1} done={step > 1} label="Cria conta" color={PT.red} />
                                <PassoItem n={2} done={step > 2} label="Escolhe cidade" color={PT.gold} />
                                <PassoItem n={3} done={false} label="Aceita os termos" color={PT.green} />
                            </ul>
                        </PosterCard>
                        <div className="absolute -top-3 -right-3 z-20 pointer-events-none hidden sm:block">
                            <DoodleSpiral color={PT.gold} size={56} rotate={-15} />
                        </div>
                        <div className="absolute -bottom-3 right-4 z-20 pointer-events-none hidden sm:block">
                            <DoodleUnderline color={PT.ink} w={100} h={12} />
                        </div>
                    </div>
                </div>

                {/* Geométricas — só sm+ */}
                <div className="absolute top-[18%] left-[40%] z-0 hidden sm:block">
                    <GeoTriangle color={PT.red} size={48} rotate={-14} />
                </div>
                <div className="absolute top-[50%] left-[6%] z-0 hidden sm:block">
                    <GeoSquare color={PT.gold} size={32} rotate={-22} />
                </div>
                <div className="absolute bottom-[30%] right-[8%] z-0 hidden sm:block">
                    <GeoCircle color={PT.red} size={30} />
                </div>
                <div className="absolute bottom-[10%] right-[24%] z-0 hidden sm:block">
                    <DoodleExclamation color={PT.gold} size={54} rotate={14} />
                </div>

                {/* RODAPÉ — sem nome da marca (reservado para header/SiteFooter) */}
                <div className="mt-auto relative pt-8">
                    <div className="max-w-[260px]">
                        <Kicker color={PT.gold} className="mb-1">PRINCÍPIO · 02</Kicker>
                        <p className="font-black text-[14px] leading-snug tracking-tight" style={{ color: "#fff" }}>
                            Sem trial.{" "}
                            <span style={{
                                background: PT.ink,
                                color: PT.gold,
                                padding: "2px 8px",
                                border: `2px solid ${PT.gold}`,
                                boxShadow: `2px 2px 0 ${PT.gold}`,
                                display: "inline-block",
                                transform: "rotate(-1deg)",
                            }}>
                                sem upsell
                            </span>.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

// =============================================================================
// Componentes utilitários (form)
// =============================================================================
function PtField({ label, number, children }) {
    return (
        <div className="relative">
            <div className="flex items-baseline gap-2 mb-2">
                {number && (
                    <span
                        className="font-mono font-black text-[11px]"
                        style={{
                            color: PT.gold,
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
            {children}
        </div>
    );
}

function StatusIcon({ status, testid }) {
    return (
        <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none" data-testid={testid}>
            {status === "checking" && <Loader2 size={15} className="animate-spin" style={{ color: PT.ink }} />}
            {status === "available" && <CheckCircle2 size={18} style={{ color: PT.green }} />}
            {(status === "taken" || status === "invalid") && <X size={18} style={{ color: PT.red }} />}
        </div>
    );
}

function FieldMessage({ status, message, testid, taken }) {
    if (!message) return null;
    const color =
        status === "available" ? PT.green :
        (status === "taken" || status === "invalid") ? PT.red :
        "rgba(10,10,10,0.55)";
    return (
        <p className="mt-1.5 text-[12px] font-mono font-bold" style={{ color }} data-testid={testid}>
            {status === "available" && <CheckCircle2 size={11} className="inline mr-1 -mt-0.5" />}
            {(status === "taken" || status === "invalid") && <AlertCircle size={11} className="inline mr-1 -mt-0.5" />}
            {taken ?? message}
        </p>
    );
}

function ConsentCheckbox({ id, checked, onChange, testid, required, children }) {
    return (
        <label
            htmlFor={id}
            className="flex items-start gap-3 p-3.5 rounded-xl cursor-pointer transition select-none"
            style={{
                background: checked ? "#fff" : "rgba(255,255,255,0.65)",
                border: `3px solid ${PT.ink}`,
                boxShadow: checked ? `4px 4px 0 ${PT.green}` : `4px 4px 0 ${PT.ink}`,
                transform: checked ? "translate(-1px,-1px)" : "translate(0,0)",
            }}
        >
            <input
                id={id} type="checkbox" checked={checked} onChange={onChange}
                data-testid={testid}
                className="mt-0.5 w-4 h-4 shrink-0 cursor-pointer"
                style={{ accentColor: PT.green }}
            />
            <span className="text-[12.5px] leading-relaxed font-medium" style={{ color: PT.ink }}>
                {children}
                {required && <span className="ml-1 font-black" style={{ color: PT.red }} aria-hidden>*</span>}
            </span>
        </label>
    );
}

function PassoItem({ n, done, label, color }) {
    return (
        <li className="flex items-center gap-2.5">
            <span
                className="inline-flex items-center justify-center font-black"
                style={{
                    width: 28, height: 28,
                    background: done ? color : "rgba(255,255,255,0.08)",
                    color: done ? PT.ink : "rgba(255,255,255,0.55)",
                    borderRadius: "50%",
                    border: `2.5px solid ${PT.ink}`,
                    fontSize: 13,
                    flexShrink: 0,
                }}
            >
                {done ? "✓" : n}
            </span>
            <span style={{ textDecoration: done ? "line-through" : "none", opacity: done ? 0.55 : 1 }}>{label}</span>
        </li>
    );
}

function statusBorder(status) {
    if (status === "available") return { borderColor: PT.green, boxShadow: `4px 4px 0 ${PT.green}` };
    if (status === "taken" || status === "invalid") return { borderColor: PT.red, boxShadow: `4px 4px 0 ${PT.red}` };
    return undefined;
}
