import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ArrowRight, Check, Loader2, X, Eye, EyeOff, AlertCircle, CheckCircle2, MapPin } from "lucide-react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { CitySelect } from "../components/CitySelect";
import { DynamicWord } from "../components/DynamicWord";
import {
    PT, Sticker, StampCircle, TapedPhoto, PosterCard, MagNumber, Kicker, AuthStyles,
    DoodleArrow, DoodleScribble, DoodleStar, DoodleHeart, DoodleExclamation,
    GeoTriangle, GeoSquare, GeoCircle, GiantAsterisk,
} from "./auth/AuthDecor";

const REGISTER_HERO = "/hero/register.webp";
const BACKEND = process.env.REACT_APP_BACKEND_URL || "";

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
                const { data } = await axios.get(`${BACKEND}${endpoint}`, { params: { [paramName]: v }, signal: ctrl.signal });
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

    if (user) return <Navigate to="/" replace />;

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
        navigate("/");
    };

    return (
        <div className="min-h-screen relative overflow-hidden" style={{ background: PT.cream }}>
            {/* Faixa topo tipo jornal */}
            <div className="pt-tape h-3 w-full" />
            <div
                className="flex items-center justify-between px-5 sm:px-8 py-3"
                style={{ background: PT.ink, color: PT.bone }}
            >
                <span className="font-mono text-[10.5px] sm:text-[11px] font-bold uppercase" style={{ letterSpacing: "0.20em", color: PT.gold }}>
                    LUSORAE // RECRUTAMENTO ABERTO // PASSO {step}/3
                </span>
                <span className="hidden sm:inline font-mono text-[10.5px] font-bold uppercase" style={{ letterSpacing: "0.18em", color: "rgba(255,244,220,0.65)" }}>
                    SEM CARTÃO · SEM UPSELL · SEM TRIAL
                </span>
            </div>

            <div className="grid lg:grid-cols-[1fr_1.1fr] relative">
                {/* ============ ESQUERDA · FORMULÁRIO (revista moderna) ============ */}
                <div className="relative px-6 sm:px-10 lg:px-16 pt-12 lg:pt-14 pb-16 order-2 lg:order-1" style={{ background: PT.cream }}>
                    {/* Decorações pelos cantos */}
                    <div className="absolute top-6 right-6 hidden sm:block">
                        <DoodleScribble color={PT.green} w={120} h={42} style={{ transform: "rotate(-8deg)" }} />
                    </div>
                    <div className="absolute bottom-32 -left-3 hidden lg:block">
                        <DoodleStar color={PT.red} size={50} rotate={-12} />
                    </div>

                    <div className="relative max-w-md mx-auto lg:mx-0 z-10">
                        {/* Header */}
                        <div className="flex items-center justify-between mb-7">
                            <div className="flex items-baseline gap-1.5">
                                <span style={{ color: PT.green, fontSize: 30 }} className="font-black leading-none">✱</span>
                                <span className="text-[22px] font-black tracking-tight" style={{ color: PT.ink }}>lusorae</span>
                            </div>
                            <Sticker bg={PT.azul} color="#fff" rotate={6}>Pg. {String(step + 1).padStart(2, "0")}</Sticker>
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
                            <Kicker color={PT.green}>// PASSO {String(step).padStart(2, "0")} DE 03</Kicker>
                            <DoodleArrow color={PT.green} w={60} h={26} style={{ transform: "rotate(-4deg)" }} />
                        </div>

                        {/* TÍTULO GIGANTE */}
                        <h2
                            className="font-black tracking-[-0.04em]"
                            style={{ fontSize: "clamp(46px, 6.5vw, 78px)", lineHeight: 0.88, color: PT.ink }}
                        >
                            {step === 1 && (<>
                                <span style={{ display: "inline-block", transform: "rotate(-2deg)" }}>Cria a tua</span>{" "}
                                <span style={{ background: PT.gold, padding: "0 0.10em", boxShadow: `4px 4px 0 ${PT.ink}`, display: "inline-block", transform: "rotate(1deg)" }}>
                                    conta.
                                </span>
                            </>)}
                            {step === 2 && (<>
                                <span style={{ display: "inline-block", transform: "rotate(-1deg)" }}>De onde</span>{" "}
                                <span style={{ background: PT.red, color: "#fff", padding: "0 0.12em", boxShadow: `4px 4px 0 ${PT.ink}`, display: "inline-block", transform: "rotate(2deg)" }}>
                                    és?
                                </span>
                            </>)}
                            {step === 3 && (<>
                                <span style={{ display: "inline-block", transform: "rotate(-2deg)" }}>Última coisa,</span><br/>
                                <span style={{ background: PT.green, color: "#fff", padding: "0 0.10em", boxShadow: `4px 4px 0 ${PT.ink}`, display: "inline-block", transform: "rotate(1deg)" }}>
                                    juramos.
                                </span>
                            </>)}
                        </h2>

                        <div className="mt-4 flex items-start gap-3">
                            <DoodleHeart color={PT.green} size={26} rotate={-12} style={{ flexShrink: 0, marginTop: 2 }} />
                            <p className="text-[15px] font-medium leading-relaxed" style={{ color: "rgba(10,10,10,0.78)" }}>
                                {step === 1 && "Nome, email e palavra-passe. Mais nada para já."}
                                {step === 2 && "Escolhe a tua cidade — ajuda-nos a mostrar-te o que importa perto. Podes saltar."}
                                {step === 3 && "Consentimento obrigatório por lei. Não há letra pequena."}
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
                                        <Kicker color={PT.gold} className="mb-2">// CITAÇÃO Nº 04</Kicker>
                                        <blockquote className="font-black text-[19px] leading-[1.18] tracking-tight max-w-[34ch]">
                                            “Finalmente uma rede que não me{" "}
                                            <span style={{ background: PT.gold, color: PT.ink, padding: "0 0.16em" }}>trata</span>{" "}
                                            como produto.”
                                        </blockquote>
                                        <p className="mt-2 text-[11px] font-mono uppercase font-bold" style={{ letterSpacing: "0.14em", opacity: 0.80 }}>
                                            — Manifesto, promessa 04
                                        </p>
                                    </PosterCard>

                                    <ConsentCheckbox
                                        id="consent-age" checked={consent.age}
                                        onChange={() => toggleConsent("age")}
                                        testid="consent-age" required
                                    >
                                        Confirmo que tenho <strong>16 anos ou mais</strong>.
                                        <span className="block text-[11.5px] mt-0.5 font-medium" style={{ color: "rgba(10,10,10,0.55)" }}>
                                            Exigido pela Lei n.º 58/2019, art. 16.º.
                                        </span>
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
                                        <span className="block text-[11.5px] mt-0.5 font-medium" style={{ color: "rgba(10,10,10,0.55)" }}>
                                            Revogável a qualquer momento nas Definições.
                                        </span>
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

                            <div className="mt-7 flex items-center gap-3">
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
                            <Sticker bg={PT.red} color="#fff" rotate={5}>RGPD ✓</Sticker>
                        </div>

                        <div className="mt-10 pt-5 relative" style={{ borderTop: `3px solid ${PT.ink}` }}>
                            <Kicker color={PT.ink} className="mb-3">// COLOFÃO · DADOS</Kicker>
                            <p className="text-[11.5px] font-medium leading-relaxed" style={{ color: "rgba(10,10,10,0.65)" }}>
                                Os teus dados são tratados conforme o RGPD e a Lei n.º 58/2019. Lê o nosso{" "}
                                <Link to="/manifesto" className="underline underline-offset-2 font-black" style={{ color: PT.ink }}>manifesto</Link>{" "}
                                — declaramos publicamente o que não fazemos.
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
                                <Link to="/manifesto" className="hover:underline">Manifesto</Link>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ============ DIREITA · POSTER URBANO VERDE ============ */}
                <PosterRight step={step} />
            </div>

            <div className="pt-tape h-3 w-full" />
            <AuthStyles />
        </div>
    );
}

// =============================================================================
// POSTER DIREITO — verde, denso, recheado de elementos PT
// =============================================================================
function PosterRight({ step }) {
    return (
        <div
            className="relative overflow-hidden isolate pt-grain min-h-[640px] lg:min-h-[calc(100vh-60px)] order-1 lg:order-2"
            style={{ background: PT.green, color: "#fff" }}
            data-testid="brand-panel"
        >
            {/* Asterisco gigante canto superior direito */}
            <div className="absolute -top-14 -right-10 z-0">
                <GiantAsterisk color={PT.gold} size={340} rotate={12} />
            </div>

            {/* Faixa "manchete" diagonal */}
            <div
                className="absolute top-[26%] -right-10 z-0"
                style={{
                    width: "115%",
                    height: 60,
                    background: PT.red,
                    transform: "rotate(3deg)",
                    boxShadow: `inset 0 0 0 3px ${PT.ink}`,
                }}
                aria-hidden
            />

            <div className="relative z-10 p-8 sm:p-12 lg:p-14 flex flex-col gap-6 h-full">
                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                    <h1 className="font-black tracking-tight text-[34px] leading-none flex items-baseline gap-2" style={{ color: PT.ink }}>
                        <span style={{ color: PT.gold, fontSize: 30, textShadow: `2px 2px 0 ${PT.ink}` }}>✱</span>
                        <span style={{ textShadow: `3px 3px 0 ${PT.gold}` }}>lusorae</span>
                    </h1>
                    <div className="flex items-start gap-3">
                        <Sticker bg={PT.gold} color={PT.ink} rotate={-6}>🇵🇹 FEITO EM PT</Sticker>
                        <StampCircle bg={PT.ink} color={PT.gold} rotate={-10} size={78}>
                            NOVO<br/>SÓCIO<br/>Nº&nbsp;∞
                        </StampCircle>
                    </div>
                </div>

                {/* MANCHETE GIGANTE */}
                <div className="relative mt-2">
                    <Kicker color={PT.gold} className="mb-2">// JUNTA-TE · MANCHETE</Kicker>
                    <h2
                        className="font-black tracking-[-0.04em]"
                        style={{
                            fontSize: "clamp(60px, 7.8vw, 124px)",
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

                {/* COLAGEM */}
                <div className="relative mt-5 flex flex-wrap items-start gap-8 lg:gap-12 pl-2">
                    <div className="relative">
                        <TapedPhoto
                            src={REGISTER_HERO}
                            alt="Rua portuguesa decorada para os Santos Populares"
                            rotate={4}
                            w={220} h={270}
                        />
                        <div className="absolute -top-4 -left-5">
                            <StampCircle bg={PT.red} color="#fff" rotate={-14} size={72}>
                                SANTOS<br/>POP.<br/>2026
                            </StampCircle>
                        </div>
                        <div className="absolute -bottom-4 right-2">
                            <Sticker bg={PT.ink} color={PT.gold} rotate={4} style={{ fontSize: 10, padding: "6px 12px" }}>
                                📍 LISBOA · ALFAMA
                            </Sticker>
                        </div>
                    </div>

                    {/* Cartões "passos" sobrepostos (espelha o stepper) */}
                    <div className="relative pt-2 max-w-[340px]">
                        <PosterCard bg={PT.ink} color="#fff" rotate={-3} shadow={PT.gold} style={{ padding: "14px 16px" }}>
                            <Kicker color={PT.gold} className="mb-2">// 3 PASSOS PARA DENTRO</Kicker>
                            <ul className="space-y-2 text-[14px] font-bold leading-tight">
                                <PassoItem n={1} done={step > 1} label="Cria conta" color={PT.red} />
                                <PassoItem n={2} done={step > 2} label="Escolhe cidade" color={PT.gold} />
                                <PassoItem n={3} done={false} label="Aceita os termos" color={PT.green} />
                            </ul>
                        </PosterCard>

                        {/* Cartão amarelo sobreposto */}
                        <div className="absolute -bottom-10 -right-3 max-w-[260px]">
                            <PosterCard bg={PT.gold} color={PT.ink} rotate={5} shadow={PT.ink} style={{ padding: "12px 14px" }}>
                                <p className="font-black text-[14px] leading-tight">
                                    A tua cidade tem <DynamicWord variant="hero" testId="register-hero-dynamic-word" />.
                                </p>
                            </PosterCard>
                        </div>

                        <DoodleArrow
                            color={PT.gold}
                            w={120} h={60}
                            style={{ position: "absolute", top: -36, left: -80, transform: "rotate(165deg)" }}
                        />
                    </div>
                </div>

                {/* Geométricas */}
                <div className="absolute top-[16%] left-[42%] z-0">
                    <GeoTriangle color={PT.red} size={52} rotate={-14} />
                </div>
                <div className="absolute top-[48%] left-[8%] z-0">
                    <GeoSquare color={PT.gold} size={38} rotate={-22} />
                </div>
                <div className="absolute bottom-[28%] right-[8%] z-0">
                    <GeoCircle color={PT.red} size={36} />
                </div>
                <div className="absolute bottom-[8%] right-[24%] z-0">
                    <DoodleExclamation color={PT.gold} size={62} rotate={14} />
                </div>

                {/* RODAPÉ poster */}
                <div className="mt-auto relative pt-10">
                    <div className="pt-tape absolute -right-12 left-0 h-2.5" style={{ transform: "rotate(2deg)", bottom: 60 }} aria-hidden />
                    <div className="flex items-end justify-between gap-4 flex-wrap mt-4">
                        <div>
                            <Kicker color={PT.gold} className="mb-1">// MANIFESTO · LINHA 02</Kicker>
                            <p className="font-black text-[15px] leading-tight tracking-tight max-w-xs" style={{ color: PT.ink }}>
                                Sem trial. <span style={{ background: "#fff", padding: "1px 6px" }}>sem upsell</span>. para sempre gratuito.
                            </p>
                        </div>
                        <p className="text-[10.5px] font-mono font-bold uppercase" style={{ letterSpacing: "0.20em", color: PT.ink }}>
                            © LUSORAE · {new Date().getFullYear()} · ABERTO A QUEM CHEGA
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
