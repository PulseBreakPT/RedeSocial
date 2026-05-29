import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ArrowRight, Check, Loader2, X, Eye, EyeOff, AlertCircle, CheckCircle2, MapPin } from "lucide-react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { CitySelect } from "../components/CitySelect";
import { DynamicWord } from "../components/DynamicWord";

// =============================================================================
// LUSORAE — Register (cores portuguesas vibrantes)
// Verde como cor de painel · Vermelho/Dourado em acentos
// =============================================================================

const PT = {
    red: "#C8102E",
    green: "#046A38",
    gold: "#FFCC00",
    azul: "#0E4D92",
    cream: "#FFF8E7",
    ink: "#1A1A1A",
};

const BACKEND = process.env.REACT_APP_BACKEND_URL || "";

// =====================================================================
// Password strength
// =====================================================================
function evaluatePassword(pwd) {
    if (!pwd) return { score: 0, label: "", color: "#cccccc", reasons: [] };
    const reasons = [];
    let score = 0;
    if (pwd.length >= 8) score++;
    else reasons.push("8+ caracteres");
    if (pwd.length >= 12) score++;
    else if (pwd.length >= 8) reasons.push("12+ ainda melhor");
    if (/[A-Z]/.test(pwd) && /[a-z]/.test(pwd)) score++;
    else reasons.push("maiúsculas e minúsculas");
    if (/\d/.test(pwd)) score++;
    else reasons.push("um número");
    if (/[^a-zA-Z\d]/.test(pwd)) score++;
    else reasons.push("um símbolo (!@#…)");
    const labels = ["Muito fraca", "Fraca", "Razoável", "Boa", "Forte", "Excelente"];
    // Paleta PT para o medidor: vermelho → dourado → verde
    const colors = [PT.red, PT.red, "#e0833a", PT.gold, PT.green, PT.ink];
    return { score, label: labels[score], color: colors[score], reasons };
}

// =====================================================================
// Availability check hook (idêntico)
// =====================================================================
function useAvailabilityCheck({ value, endpoint, paramName, localValidate }) {
    const [state, setState] = useState({ status: "idle", message: "" });
    const abortRef = useRef(null);

    useEffect(() => {
        const v = (value || "").trim();
        if (abortRef.current) {
            try { abortRef.current.abort(); } catch { /* noop */ }
            abortRef.current = null;
        }
        if (!v) {
            setState({ status: "idle", message: "" });
            return;
        }
        if (localValidate) {
            const local = localValidate(v);
            if (local && !local.ok) {
                setState({ status: "invalid", message: local.message });
                return;
            }
        }
        setState({ status: "checking", message: "A verificar…" });
        const ctrl = new AbortController();
        abortRef.current = ctrl;
        const t = setTimeout(async () => {
            try {
                const { data } = await axios.get(`${BACKEND}${endpoint}`, {
                    params: { [paramName]: v },
                    signal: ctrl.signal,
                });
                if (data.available) {
                    setState({ status: "available", message: data.message || "Disponível" });
                } else {
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

    const [form, setForm] = useState({
        name: "",
        username: "",
        email: "",
        password: "",
        passwordConfirm: "",
    });
    const [showPwd, setShowPwd] = useState(false);
    const [showPwdConfirm, setShowPwdConfirm] = useState(false);

    const [city, setCity] = useState(null);
    const [consent, setConsent] = useState({ age: false, terms: false, marketing: false });

    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    const usernameState = useAvailabilityCheck({
        value: form.username,
        endpoint: "/api/auth/check-username",
        paramName: "u",
        localValidate: _validateUsernameLocal,
    });
    const emailState = useAvailabilityCheck({
        value: form.email,
        endpoint: "/api/auth/check-email",
        paramName: "e",
        localValidate: _validateEmailLocal,
    });
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
            name: form.name,
            username: form.username,
            email: form.email,
            password: form.password,
            city: city?.name || null,
            region: city?.region || null,
            mood_initial: null,
            team: null,
            terms_accepted: consent.terms,
            age_confirmed: consent.age,
            marketing_opt_in: consent.marketing,
        });
        setBusy(false);
        if (!res.ok) { setError(res.error); return; }
        try {
            localStorage.setItem(
                "vm_signup_consent",
                JSON.stringify({
                    timestamp: new Date().toISOString(),
                    age_confirmed: consent.age,
                    terms_accepted: consent.terms,
                    marketing_opt_in: consent.marketing,
                    terms_version: 1,
                    privacy_version: 1,
                }),
            );
        } catch { /* ignore */ }
        navigate("/");
    };

    const stepTitle =
        step === 1 ? "Cria a tua conta" :
        step === 2 ? "De onde és?" :
        "Última coisa, juramos";

    return (
        <div className="min-h-screen grid lg:grid-cols-[1fr_1.05fr]" style={{ background: PT.cream }}>
            {/* ============ ESQUERDA · Formulário ============ */}
            <div className="flex flex-col min-h-screen order-2 lg:order-1" style={{ background: PT.cream }}>
                <MobileMiniBrand testId="register-mobile-dynamic-word" step={step} />

                <div className="px-6 sm:px-10 lg:px-16 pt-10 lg:pt-0 pb-12 flex flex-col lg:justify-center flex-1">
                    <div className="max-w-md w-full mx-auto lg:mx-0">
                        {/* Logo (desktop) */}
                        <div className="hidden lg:flex items-baseline gap-2 mb-8">
                            <span style={{ color: PT.green }} className="text-3xl font-black leading-none">✱</span>
                            <span className="text-[22px] font-black tracking-tight" style={{ color: PT.ink }}>
                                lusorae
                            </span>
                        </div>

                        {/* Stepper */}
                        <div className="flex items-center gap-2 mb-5" data-testid="register-stepper">
                            {[1, 2, 3].map((n) => (
                                <div
                                    key={n}
                                    className="h-1.5 flex-1 rounded-full transition-colors"
                                    style={{
                                        background: step >= n
                                            ? (n === 1 ? PT.red : n === 2 ? PT.gold : PT.green)
                                            : "rgba(26,26,26,0.10)",
                                    }}
                                />
                            ))}
                        </div>

                        <p
                            className="text-[11px] uppercase font-mono mb-2"
                            style={{ letterSpacing: "0.18em", color: PT.green }}
                        >
                            // passo {step} de 3
                        </p>
                        <h2
                            className="font-black leading-[0.95] tracking-tight"
                            style={{ fontSize: "clamp(36px, 4.5vw, 52px)", color: PT.ink }}
                        >
                            {step === 1 && (<>Cria a tua <span style={{ background: PT.gold, padding: "0 0.14em" }}>conta</span>.</>)}
                            {step === 2 && (<>De onde <span style={{ background: PT.gold, padding: "0 0.14em" }}>és</span>?</>)}
                            {step === 3 && (<>Última coisa,<br /><span style={{ background: PT.gold, padding: "0 0.14em" }}>juramos</span>.</>)}
                        </h2>
                        <p className="text-[14.5px] mt-3 leading-relaxed" style={{ color: "rgba(26,26,26,0.65)" }}>
                            {step === 1 && "Nome, email e palavra-passe. Mais nada para já."}
                            {step === 2 && "Escolhe a tua cidade — ajuda-nos a mostrar-te o que importa perto. Podes saltar."}
                            {step === 3 && "Consentimento obrigatório por lei. Não há letra pequena."}
                        </p>

                        {/* Benefit callout */}
                        <div
                            data-testid={`register-benefit-${step}`}
                            className="mt-5 rounded-xl px-4 py-3 flex items-start gap-3"
                            style={{
                                background: "#fff",
                                border: `2px solid ${PT.ink}`,
                                boxShadow: `4px 4px 0 ${PT.gold}`,
                            }}
                        >
                            <span aria-hidden style={{ color: PT.red, fontWeight: 900 }} className="text-[18px] leading-none mt-0.5">✱</span>
                            <p className="text-[13px] leading-relaxed" style={{ color: "rgba(26,26,26,0.78)" }}>
                                {step === 1 && (
                                    <>
                                        <strong style={{ color: PT.ink }}>30 segundos.</strong> Sem cartão, sem upsell, sem trial. Conta gratuita para sempre.
                                    </>
                                )}
                                {step === 2 && (
                                    <>
                                        <strong style={{ color: PT.ink }}>Lisboa, Porto, Olhão, Funchal…</strong>{" "}
                                        ~300 cidades portuguesas. A tua identidade começa pelo lugar.
                                    </>
                                )}
                                {step === 3 && (
                                    <>
                                        <strong style={{ color: PT.ink }}>Sem letra pequena.</strong> Os teus dados são teus. Podes apagar a conta com um clique.
                                    </>
                                )}
                            </p>
                        </div>

                        <form onSubmit={submit} className="mt-6" data-testid="register-form">
                            {step === 1 && (
                                <div className="space-y-4">
                                    <PtField label="Nome">
                                        <input
                                            data-testid="register-name"
                                            type="text" value={form.name} onChange={update("name")} required
                                            placeholder="O teu nome"
                                            className="pt-input"
                                            autoComplete="name"
                                        />
                                    </PtField>

                                    <PtField label="Username">
                                        <div className="relative">
                                            <input
                                                data-testid="register-username"
                                                type="text"
                                                value={form.username}
                                                onChange={(e) => setForm({ ...form, username: e.target.value.trim() })}
                                                required minLength={3} maxLength={20}
                                                pattern="[a-zA-Z0-9_]+"
                                                placeholder="o_teu_user"
                                                className="pt-input pr-10"
                                                style={statusBorder(usernameState.status)}
                                                autoComplete="off" autoCapitalize="off" spellCheck={false}
                                            />
                                            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none" data-testid="register-username-status">
                                                {usernameState.status === "checking" && <Loader2 size={14} className="animate-spin" style={{ color: "rgba(26,26,26,0.45)" }} />}
                                                {usernameState.status === "available" && <CheckCircle2 size={16} style={{ color: PT.green }} />}
                                                {(usernameState.status === "taken" || usernameState.status === "invalid") && <X size={16} style={{ color: PT.red }} />}
                                            </div>
                                        </div>
                                        {usernameState.message && (
                                            <p
                                                data-testid="register-username-message"
                                                className="mt-1.5 text-[12px] font-mono"
                                                style={{
                                                    color:
                                                        usernameState.status === "available" ? PT.green :
                                                        (usernameState.status === "taken" || usernameState.status === "invalid") ? PT.red :
                                                        "rgba(26,26,26,0.55)",
                                                }}
                                            >
                                                {usernameState.status === "available" && <CheckCircle2 size={11} className="inline mr-1 -mt-0.5" />}
                                                {(usernameState.status === "taken" || usernameState.status === "invalid") && <AlertCircle size={11} className="inline mr-1 -mt-0.5" />}
                                                {usernameState.message}
                                            </p>
                                        )}
                                    </PtField>

                                    <PtField label="Email">
                                        <div className="relative">
                                            <input
                                                data-testid="register-email"
                                                type="email" value={form.email} onChange={update("email")} required
                                                placeholder="tu@exemplo.com"
                                                className="pt-input pr-10"
                                                style={statusBorder(emailState.status)}
                                                autoComplete="email" inputMode="email" autoCapitalize="off" spellCheck={false}
                                            />
                                            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none" data-testid="register-email-status">
                                                {emailState.status === "checking" && <Loader2 size={14} className="animate-spin" style={{ color: "rgba(26,26,26,0.45)" }} />}
                                                {emailState.status === "available" && <CheckCircle2 size={16} style={{ color: PT.green }} />}
                                                {(emailState.status === "taken" || emailState.status === "invalid") && <X size={16} style={{ color: PT.red }} />}
                                            </div>
                                        </div>
                                        {emailState.message && (
                                            <p
                                                data-testid="register-email-message"
                                                className="mt-1.5 text-[12px] font-mono"
                                                style={{
                                                    color:
                                                        emailState.status === "available" ? PT.green :
                                                        (emailState.status === "taken" || emailState.status === "invalid") ? PT.red :
                                                        "rgba(26,26,26,0.55)",
                                                }}
                                            >
                                                {emailState.status === "available" && <CheckCircle2 size={11} className="inline mr-1 -mt-0.5" />}
                                                {(emailState.status === "taken" || emailState.status === "invalid") && <AlertCircle size={11} className="inline mr-1 -mt-0.5" />}
                                                {emailState.status === "taken" ? (
                                                    <>
                                                        {emailState.message}{" "}
                                                        <Link to="/login" className="underline underline-offset-2 hover:no-underline font-bold" style={{ color: PT.red }}>
                                                            Entrar?
                                                        </Link>
                                                    </>
                                                ) : emailState.message}
                                            </p>
                                        )}
                                    </PtField>

                                    <PtField label="Palavra-passe">
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
                                                    const borderColor = pwdEval.score >= 4 ? PT.green : pwdEval.color;
                                                    return { borderColor, borderWidth: 2, boxShadow: `0 0 0 4px ${borderColor}22` };
                                                })()}
                                                autoComplete="new-password"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPwd((v) => !v)}
                                                className="absolute inset-y-0 right-2 px-2 hover:opacity-80"
                                                style={{ color: "rgba(26,26,26,0.55)" }}
                                                aria-label={showPwd ? "Esconder palavra-passe" : "Mostrar palavra-passe"}
                                                data-testid="register-password-toggle"
                                                tabIndex={-1}
                                            >
                                                {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                                            </button>
                                        </div>
                                        {form.password && (
                                            <div className="mt-2.5" data-testid="register-password-strength">
                                                <div className="flex items-center gap-2.5">
                                                    <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(26,26,26,0.08)" }}>
                                                        <div
                                                            className="h-full rounded-full transition-all duration-300"
                                                            style={{ width: `${(pwdEval.score / 5) * 100}%`, background: pwdEval.color }}
                                                        />
                                                    </div>
                                                    <span
                                                        className="text-[11px] font-mono uppercase tabular-nums shrink-0 font-bold"
                                                        style={{ color: pwdEval.color, letterSpacing: "0.08em" }}
                                                    >
                                                        {pwdEval.label}
                                                    </span>
                                                </div>
                                                {pwdEval.reasons.length > 0 && pwdEval.score < 5 && (
                                                    <p className="text-[11.5px] mt-1.5 leading-relaxed" style={{ color: "rgba(26,26,26,0.55)" }}>
                                                        Falta: {pwdEval.reasons.slice(0, 3).join(" · ")}
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                        {!form.password && (
                                            <p className="text-[11.5px] mt-1.5 leading-relaxed" style={{ color: "rgba(26,26,26,0.50)" }}>
                                                Mistura maiúsculas, minúsculas, números e símbolos.
                                            </p>
                                        )}
                                    </PtField>

                                    <PtField label="Repetir palavra-passe">
                                        <div className="relative">
                                            <input
                                                data-testid="register-password-confirm"
                                                type={showPwdConfirm ? "text" : "password"}
                                                value={form.passwordConfirm} onChange={update("passwordConfirm")}
                                                required minLength={8}
                                                placeholder="Escreve novamente"
                                                className="pt-input pr-12"
                                                style={
                                                    pwdMatches
                                                        ? { borderColor: PT.green, borderWidth: 2, boxShadow: `0 0 0 4px ${PT.green}22` }
                                                        : pwdMismatch
                                                        ? { borderColor: PT.red, borderWidth: 2, boxShadow: `0 0 0 4px ${PT.red}22` }
                                                        : undefined
                                                }
                                                autoComplete="new-password"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPwdConfirm((v) => !v)}
                                                className="absolute inset-y-0 right-2 px-2 hover:opacity-80"
                                                style={{ color: "rgba(26,26,26,0.55)" }}
                                                aria-label={showPwdConfirm ? "Esconder palavra-passe" : "Mostrar palavra-passe"}
                                                tabIndex={-1}
                                            >
                                                {showPwdConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                                            </button>
                                        </div>
                                        {pwdMatches && (
                                            <p className="mt-1.5 text-[12px] font-mono font-bold" style={{ color: PT.green }} data-testid="register-password-match">
                                                <CheckCircle2 size={11} className="inline mr-1 -mt-0.5" /> Coincide.
                                            </p>
                                        )}
                                        {pwdMismatch && (
                                            <p className="mt-1.5 text-[12px] font-mono font-bold" style={{ color: PT.red }} data-testid="register-password-mismatch">
                                                <AlertCircle size={11} className="inline mr-1 -mt-0.5" /> As palavras-passe não coincidem.
                                            </p>
                                        )}
                                    </PtField>
                                </div>
                            )}

                            {step === 2 && (
                                <div className="space-y-4 pt-1" data-testid="register-step-city">
                                    <PtField label="A tua cidade">
                                        <CitySelect
                                            value={city?.id || null}
                                            onChange={setCity}
                                            placeholder="Pesquisa — Lisboa, Olhão, Funchal…"
                                            testid="register-city"
                                        />
                                    </PtField>
                                    {!city && (
                                        <div
                                            className="rounded-xl px-4 py-5 text-center"
                                            style={{ border: `2px dashed ${PT.green}40`, background: "#fff" }}
                                        >
                                            <MapPin size={20} className="inline mb-2" style={{ color: PT.green }} />
                                            <p className="text-[13.5px] leading-relaxed" style={{ color: "rgba(26,26,26,0.65)" }}>
                                                Escolhe a tua cidade — mostraremos a sua história e cultura.<br/>
                                                <span className="text-[11.5px]" style={{ color: "rgba(26,26,26,0.45)" }}>Podes saltar este passo se preferires.</span>
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {step === 3 && (
                                <div className="space-y-3 pt-1">
                                    <div
                                        className="rounded-xl px-4 py-3.5"
                                        style={{ background: PT.azul, color: "#fff" }}
                                    >
                                        <blockquote className="font-black text-[18px] leading-[1.25] tracking-tight max-w-[34ch]">
                                            “Finalmente uma rede que não me{" "}
                                            <span style={{ background: PT.gold, color: PT.ink, padding: "0 0.18em" }}>trata</span>{" "}
                                            como produto.”
                                        </blockquote>
                                        <p className="mt-2 text-[11px] font-mono uppercase" style={{ letterSpacing: "0.14em", opacity: 0.85 }}>
                                            — manifesto, promessa 04
                                        </p>
                                    </div>

                                    <ConsentCheckbox
                                        id="consent-age" checked={consent.age}
                                        onChange={() => toggleConsent("age")}
                                        testid="consent-age" required
                                    >
                                        Confirmo que tenho <strong>16 anos ou mais</strong>.
                                        <span className="block text-[11.5px] mt-0.5" style={{ color: "rgba(26,26,26,0.55)" }}>
                                            Exigido pela Lei n.º 58/2019, art. 16.º. Menores com autorização dos representantes legais.
                                        </span>
                                    </ConsentCheckbox>
                                    <ConsentCheckbox
                                        id="consent-terms" checked={consent.terms}
                                        onChange={() => toggleConsent("terms")}
                                        testid="consent-terms" required
                                    >
                                        Li e aceito os{" "}
                                        <Link to="/legal/terms" target="_blank" className="underline underline-offset-2 hover:no-underline font-bold" style={{ color: PT.red }}>
                                            Termos e Condições
                                        </Link>{" "}
                                        e a{" "}
                                        <Link to="/legal/privacy" target="_blank" className="underline underline-offset-2 hover:no-underline font-bold" style={{ color: PT.red }}>
                                            Política de Privacidade
                                        </Link>.
                                    </ConsentCheckbox>
                                    <ConsentCheckbox
                                        id="consent-marketing" checked={consent.marketing}
                                        onChange={() => toggleConsent("marketing")}
                                        testid="consent-marketing"
                                    >
                                        <span style={{ color: "rgba(26,26,26,0.70)" }}>Opcional</span> — quero novidades por e-mail.
                                        <span className="block text-[11.5px] mt-0.5" style={{ color: "rgba(26,26,26,0.55)" }}>
                                            Revogável a qualquer momento nas Definições.
                                        </span>
                                    </ConsentCheckbox>
                                </div>
                            )}

                            {error && (
                                <div
                                    data-testid="register-error"
                                    className="text-[13px] font-semibold mt-4 flex items-start gap-2 rounded-xl px-3.5 py-2.5"
                                    style={{ color: PT.red, background: "rgba(200,16,46,0.08)", border: `1px solid rgba(200,16,46,0.20)` }}
                                >
                                    <AlertCircle size={14} className="shrink-0 mt-0.5" /> <span>{error}</span>
                                </div>
                            )}

                            <div className="mt-7 flex items-center gap-3">
                                {step > 1 && (
                                    <button
                                        type="button" onClick={back}
                                        data-testid="register-back"
                                        className="pt-btn-ghost text-[13.5px] py-3 px-5"
                                    >
                                        ← Voltar
                                    </button>
                                )}
                                {step < 3 ? (
                                    <button
                                        type="button" onClick={next}
                                        data-testid="register-next"
                                        disabled={step === 1 ? !canStep1 : false}
                                        className="pt-btn-primary flex-1 text-[15px] py-4 disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        {step === 2 && !city ? "Saltar" : "Seguinte"} <ArrowRight size={16} />
                                    </button>
                                ) : (
                                    <button
                                        type="submit" disabled={!canSubmit}
                                        data-testid="register-submit"
                                        className="pt-btn-primary flex-1 text-[15px] py-4 disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        {busy ? (<><Loader2 size={14} className="animate-spin" /> A criar conta…</>) : (<>Criar conta <Check size={16} /></>)}
                                    </button>
                                )}
                            </div>
                        </form>

                        <p className="mt-8 text-[14px]" style={{ color: "rgba(26,26,26,0.65)" }}>
                            Já tens conta?{" "}
                            <Link
                                to="/login"
                                data-testid="goto-login"
                                className="font-bold underline underline-offset-4 decoration-2"
                                style={{ color: PT.green, textDecorationColor: PT.gold }}
                            >
                                Entrar
                            </Link>
                        </p>

                        <div className="mt-10 pt-6" style={{ borderTop: "1px dashed rgba(26,26,26,0.15)" }}>
                            <p className="text-[11.5px] leading-relaxed" style={{ color: "rgba(26,26,26,0.50)" }}>
                                Os teus dados são tratados conforme o RGPD e a Lei n.º 58/2019. Lê o nosso{" "}
                                <Link to="/manifesto" className="underline underline-offset-2 hover:no-underline font-medium" style={{ color: PT.ink }}>
                                    manifesto
                                </Link>{" "}
                                — declaramos publicamente o que não fazemos.
                            </p>
                            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11.5px]" style={{ color: "rgba(26,26,26,0.50)" }}>
                                <Link to="/legal" className="hover:underline underline-offset-2">Centro Legal</Link>
                                <Link to="/legal/terms" className="hover:underline underline-offset-2">Termos</Link>
                                <Link to="/legal/privacy" className="hover:underline underline-offset-2">Privacidade</Link>
                                <Link to="/legal/cookies" className="hover:underline underline-offset-2">Cookies</Link>
                                <Link to="/manifesto" className="hover:underline underline-offset-2">Manifesto</Link>
                            </div>
                        </div>

                        <div className="lg:hidden mt-8 mb-2 text-center text-[11px] uppercase" style={{ letterSpacing: "0.18em", color: "rgba(26,26,26,0.45)" }}>
                            © lusorae · {new Date().getFullYear()}
                        </div>
                    </div>
                </div>
            </div>

            {/* ============ DIREITA · Painel verde com decorações PT ============ */}
            <BrandPanel currentStep={step} stepTitle={stepTitle} />

            <PtStyles />
        </div>
    );
}

// =============================================================================
// PAINEL VERDE com decorações
// =============================================================================
function BrandPanel({ currentStep, stepTitle }) {
    return (
        <div
            className="hidden lg:flex relative flex-col justify-between p-14 overflow-hidden isolate order-1 lg:order-2"
            style={{ background: PT.green, color: "#fff" }}
            data-testid="brand-panel"
        >
            {/* Asterisco dourado gigante */}
            <div
                className="absolute -top-12 -right-10 select-none pointer-events-none"
                style={{ fontSize: 280, lineHeight: 1, color: PT.gold, fontWeight: 900 }}
                aria-hidden
            >
                ✱
            </div>

            {/* Quadrado vermelho rodado */}
            <div
                className="absolute left-12 pointer-events-none"
                style={{
                    top: "32%",
                    width: 64, height: 64,
                    background: PT.red,
                    transform: "rotate(18deg)",
                    boxShadow: `6px 6px 0 ${PT.ink}`,
                }}
                aria-hidden
            />

            {/* Onda dourada/azul (bottom) */}
            <svg
                className="absolute -bottom-2 -right-8 pointer-events-none"
                width="420" height="180" viewBox="0 0 420 180" fill="none" aria-hidden
            >
                <path
                    d="M0 110 Q 70 50, 140 100 T 280 100 T 420 100"
                    stroke={PT.gold} strokeWidth="10" strokeLinecap="round" fill="none"
                />
                <path
                    d="M0 140 Q 70 90, 140 130 T 280 130 T 420 130"
                    stroke={PT.azul} strokeWidth="6" strokeLinecap="round" fill="none" opacity="0.85"
                />
            </svg>

            {/* Header */}
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

            {/* Conteúdo central */}
            <div className="relative max-w-xl">
                <p className="text-[12px] uppercase font-mono mb-3" style={{ letterSpacing: "0.20em", color: PT.gold }}>
                    // {stepTitle?.toLowerCase()}
                </p>
                <h2 className="font-black leading-[0.92] tracking-tight" style={{ fontSize: "clamp(48px, 5vw, 72px)" }}>
                    Vivemos.<br />
                    Partilhamos.<br />
                    <span style={{ background: PT.gold, color: PT.ink, padding: "0 0.14em", display: "inline-block" }}>
                        Lusorae.
                    </span>
                </h2>
                <p className="font-medium mt-7 leading-relaxed text-[16px] max-w-md" style={{ color: "rgba(255,255,255,0.90)" }}>
                    Conta criada em 30 segundos. Sem cartão, sem upsell. A tua cidade tem{" "}
                    <DynamicWord variant="hero" testId="register-hero-dynamic-word" />.
                </p>

                {/* Pílulas de progresso (espelho do stepper do formulário) */}
                <div className="mt-8 flex items-center gap-2">
                    {[
                        { n: 1, label: "Conta" },
                        { n: 2, label: "Cidade" },
                        { n: 3, label: "Consentimento" },
                    ].map(({ n, label }) => {
                        const active = currentStep >= n;
                        return (
                            <div
                                key={n}
                                className="text-[11px] font-bold uppercase rounded-full px-3 py-1.5"
                                style={{
                                    letterSpacing: "0.10em",
                                    background: active ? PT.gold : "rgba(255,255,255,0.12)",
                                    color: active ? PT.ink : "rgba(255,255,255,0.55)",
                                    border: active ? `2px solid ${PT.ink}` : "2px solid transparent",
                                }}
                            >
                                {n}. {label}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Callout citação (vermelho) */}
            <div className="relative">
                <div
                    className="inline-block rounded-2xl px-5 py-4 max-w-md"
                    style={{ background: PT.red, boxShadow: `6px 6px 0 ${PT.ink}` }}
                >
                    <p className="font-black text-[19px] leading-tight tracking-tight italic">
                        “o sítio certo para seres tu, sem pedir desculpa.”
                    </p>
                    <p className="mt-2 text-[12px] font-mono uppercase" style={{ letterSpacing: "0.14em", opacity: 0.85 }}>
                        — pessoas, não perfis.
                    </p>
                </div>
                <div
                    className="mt-6 text-[11.5px] uppercase font-medium"
                    style={{ letterSpacing: "0.20em", color: "rgba(255,255,255,0.60)" }}
                >
                    © lusorae · {new Date().getFullYear()}
                </div>
            </div>
        </div>
    );
}

// =============================================================================
// HERO MOBILE
// =============================================================================
function MobileMiniBrand({ testId, step }) {
    return (
        <div
            className="lg:hidden relative overflow-hidden px-6 pt-7 pb-8"
            style={{ background: PT.green, color: "#fff" }}
        >
            <div
                className="absolute -top-8 -right-4 pointer-events-none"
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
                    passo {step}/3
                </span>
            </div>
            <p className="relative font-black leading-[0.95] tracking-tight text-[30px]">
                Cria a tua <span style={{ background: PT.gold, color: PT.ink, padding: "0 0.14em" }}>conta</span>.
            </p>
            <p className="relative mt-3 text-[13px] leading-relaxed" style={{ color: "rgba(255,255,255,0.88)" }}>
                30 segundos. <DynamicWord variant="compact" testId={testId} />.
            </p>
        </div>
    );
}

// =============================================================================
// Componentes utilitários
// =============================================================================
function PtField({ label, children }) {
    return (
        <div>
            <label className="text-[12px] font-bold uppercase mb-1.5 block" style={{ letterSpacing: "0.10em", color: "rgba(26,26,26,0.65)" }}>
                {label}
            </label>
            {children}
        </div>
    );
}

function ConsentCheckbox({ id, checked, onChange, testid, required, children }) {
    return (
        <label
            htmlFor={id}
            className="flex items-start gap-3 p-3.5 rounded-xl cursor-pointer transition select-none"
            style={{
                background: checked ? "rgba(4,106,56,0.06)" : "#fff",
                border: checked ? `2px solid ${PT.green}` : "2px solid rgba(26,26,26,0.10)",
            }}
        >
            <input
                id={id} type="checkbox" checked={checked} onChange={onChange}
                data-testid={testid}
                className="mt-0.5 w-4 h-4 shrink-0 cursor-pointer"
                style={{ accentColor: PT.green }}
            />
            <span className="text-[12.5px] leading-relaxed" style={{ color: "rgba(26,26,26,0.82)" }}>
                {children}
                {required && <span className="ml-1" style={{ color: PT.red }} aria-hidden>*</span>}
            </span>
        </label>
    );
}

function statusBorder(status) {
    if (status === "available") return { borderColor: PT.green, borderWidth: 2, boxShadow: `0 0 0 4px ${PT.green}22` };
    if (status === "taken" || status === "invalid") return { borderColor: PT.red, borderWidth: 2, boxShadow: `0 0 0 4px ${PT.red}22` };
    return undefined;
}

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
            .pt-btn-ghost {
                position: relative;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
                background: #fff;
                color: ${PT.ink};
                font-weight: 700;
                border-radius: 999px;
                border: 2px solid ${PT.ink};
                transition: background .12s ease, transform .12s ease;
                cursor: pointer;
            }
            .pt-btn-ghost:hover { background: ${PT.cream}; }
            .pt-btn-ghost:active { transform: scale(0.97); }
        `}</style>
    );
}
