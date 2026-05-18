import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ArrowRight, Check, Loader2, X, Eye, EyeOff, AlertCircle, CheckCircle2, MapPin } from "lucide-react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { CitySelect } from "../components/CitySelect";

// Convivial Portuguese hero — street decorated for Santos Populares.
// Frames the "come to the table" moment with community / festa popular.
const REGISTER_HERO =
    "https://images.unsplash.com/photo-1690467521792-8e38e841e000?auto=format&fit=crop&w=1600&q=75";

const BACKEND = process.env.REACT_APP_BACKEND_URL || "";

// =====================================================================
// Password strength — single source of truth used both by the meter
// and by the canSubmit guard. Returns 0..5 + label + color.
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
    const colors = ["#dc6055", "#dc6055", "#e0833a", "#d4a418", "#16a34a", "#0a0a0a"];
    return {
        score,
        label: labels[score],
        color: colors[score],
        reasons,
    };
}

// =====================================================================
// Generic availability hook — debounced live check against any endpoint
// of the shape /api/auth/check-X?<paramName>=<value>.
// State machine: idle | checking | available | taken | invalid | disposable
// =====================================================================
function useAvailabilityCheck({ value, endpoint, paramName, localValidate }) {
    const [state, setState] = useState({ status: "idle", message: "" });
    const abortRef = useRef(null);

    useEffect(() => {
        const v = (value || "").trim();
        // Cancel previous in-flight request
        if (abortRef.current) {
            try { abortRef.current.abort(); } catch { /* noop */ }
            abortRef.current = null;
        }
        if (!v) {
            setState({ status: "idle", message: "" });
            return;
        }
        // Cheap client-side validation first — avoid wasting a request
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

// Pre-built local validators for username and email
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

/**
 * F2.1 — Onboarding 30s.
 * 2 steps: credentials → consent.
 * Identity moved to onboarding inside the app (saltável).
 */
export default function Register() {
    const { user, register } = useAuth();
    const navigate = useNavigate();
    const [step, setStep] = useState(1);

    // Step 1 — credentials (now with password confirmation)
    const [form, setForm] = useState({
        name: "",
        username: "",
        email: "",
        password: "",
        passwordConfirm: "",
    });
    const [showPwd, setShowPwd] = useState(false);
    const [showPwdConfirm, setShowPwdConfirm] = useState(false);

    // Step 2 — cidade (PT identity)
    const [city, setCity] = useState(null);

    // Step 3 — consent
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
        pwdEval.score >= 2 &&        // require at least "Razoável"
        form.password.length >= 8 && // hard floor (security)
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
        // Step 2 — cidade é OPCIONAL, deixamos passar
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
            // PT identity — cidade já no registo (opcional)
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

    return (
        <div className="min-h-screen grid lg:grid-cols-2 bg-white text-black">
            {/* Left — Portugal atmosphere panel */}
            <div className="hidden lg:flex relative flex-col justify-between p-14 overflow-hidden isolate">
                <img
                    src={REGISTER_HERO}
                    alt="Rua portuguesa decorada para os Santos Populares"
                    className="absolute inset-0 w-full h-full object-cover"
                    loading="eager"
                />
                <div
                    className="absolute inset-0"
                    style={{
                        background:
                            "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.15) 32%, rgba(0,0,0,0.25) 60%, rgba(0,0,0,0.78) 100%)",
                    }}
                    aria-hidden
                />
                <div className="relative">
                    <h1 className="font-display text-[36px] leading-none tracking-tight text-white flex items-baseline gap-2">
                        <span className="silver-foil text-[28px] translate-y-[1px]">◆</span>
                        <span>vermillion</span>
                    </h1>
                </div>
                <div className="relative max-w-md">
                    <h2 className="font-display text-[52px] leading-[1] tracking-tight text-white">
                        Senta-te <span className="silver-foil">à mesa</span>.
                    </h2>
                    <p className="font-body text-white/85 mt-6 leading-relaxed text-[15px] max-w-sm">
                        Conta criada em 30 segundos. Duas perguntas — e estás dentro.
                    </p>
                </div>
                <div className="relative text-[12px] text-white/60 font-medium">
                    © vermillion · {new Date().getFullYear()}
                </div>
            </div>

            {/* Right form panel */}
            <div className="flex flex-col lg:justify-center pb-safe min-h-screen bg-white">
                {/* Mobile-only hero */}
                <div className="lg:hidden relative h-[200px] sm:h-[240px] overflow-hidden">
                    <img
                        src={REGISTER_HERO}
                        alt="Rua portuguesa decorada para os Santos Populares"
                        className="absolute inset-0 w-full h-full object-cover"
                        loading="eager"
                    />
                    <div
                        className="absolute inset-0"
                        style={{
                            background:
                                "linear-gradient(180deg, rgba(0,0,0,0.20) 0%, rgba(0,0,0,0.08) 38%, rgba(0,0,0,0.72) 100%)",
                        }}
                        aria-hidden
                    />
                    <div className="absolute inset-x-0 bottom-5 px-6 text-center">
                        <h1 className="font-display text-[32px] leading-none tracking-tight text-white">
                            <span className="silver-foil">◆</span> vermillion
                        </h1>
                        <p className="text-white/85 font-body text-[13px] mt-2">Senta-te à mesa.</p>
                    </div>
                </div>

                <div className="px-6 sm:px-8 pt-8 lg:p-16 lg:pt-12 flex flex-col lg:justify-center flex-1">
                    <div className="max-w-sm w-full mx-auto">

                        {/* Step indicator — 3 steps */}
                        <div className="flex items-center gap-2 mb-7" data-testid="register-stepper">
                            {[1, 2, 3].map((n) => (
                                <div
                                    key={n}
                                    className={`h-1 flex-1 rounded-full transition-colors ${
                                        step >= n ? "grad-bar" : "bg-black/10"
                                    }`}
                                />
                            ))}
                        </div>
                        <p className="text-[11px] uppercase tracking-[0.16em] text-black/45 font-mono mb-2">
                            Passo {step} de 3
                        </p>
                        <h2 className="font-display text-[30px] lg:text-[36px] tracking-tight leading-[1.05]">
                            {step === 1 && "Cria a tua conta"}
                            {step === 2 && "De onde és?"}
                            {step === 3 && "Última coisa, juramos"}
                        </h2>
                        <p className="text-black/55 text-[14px] mt-2 leading-relaxed">
                            {step === 1 && "Nome, email e palavra-passe. Mais nada para já."}
                            {step === 2 && "Escolhe a tua cidade — ajuda-nos a mostrar-te o que importa perto. Podes saltar."}
                            {step === 3 && "Consentimento obrigatório por lei. Não há letra pequena."}
                        </p>

                        <div
                            data-testid={`register-benefit-${step}`}
                            className="mt-5 rounded-xl border border-black/[0.07] bg-paper grain isolate px-3.5 py-2.5 flex items-start gap-2.5"
                        >
                            <span aria-hidden className="silver-foil text-[14px] leading-none mt-0.5">◆</span>
                            <p className="text-[12.5px] leading-relaxed text-black/75">
                                {step === 1 && (
                                    <>
                                        <strong className="text-black">30 segundos.</strong> Sem cartão, sem upsell, sem trial.
                                        Conta gratuita para sempre.
                                    </>
                                )}
                                {step === 2 && (
                                    <>
                                        <strong className="text-black">Lisboa, Porto, Olhão, Funchal…</strong>{" "}
                                        ~300 cidades portuguesas. A tua identidade começa pelo lugar.
                                    </>
                                )}
                                {step === 3 && (
                                    <>
                                        <strong className="text-black">Sem letra pequena.</strong> Os teus dados são
                                        teus. Podes apagar a conta com um clique a qualquer momento.
                                    </>
                                )}
                            </p>
                        </div>

                        <form onSubmit={submit} className="mt-6" data-testid="register-form">
                            {step === 1 && (
                                <div className="space-y-4">
                                    <Field label="Nome">
                                        <input
                                            data-testid="register-name"
                                            type="text" value={form.name} onChange={update("name")} required
                                            placeholder="O teu nome"
                                            className="vm-input"
                                            autoComplete="name"
                                        />
                                    </Field>

                                    {/* Username with live availability check */}
                                    <Field label="Username">
                                        <div className="relative">
                                            <input
                                                data-testid="register-username"
                                                type="text"
                                                value={form.username}
                                                onChange={(e) => setForm({ ...form, username: e.target.value.trim() })}
                                                required
                                                minLength={3}
                                                maxLength={20}
                                                pattern="[a-zA-Z0-9_]+"
                                                placeholder="o_teu_user"
                                                className={`vm-input pr-9 ${
                                                    usernameState.status === "available" ? "border-emerald-500/60" :
                                                    (usernameState.status === "taken" || usernameState.status === "invalid") ? "border-red-soft/60" : ""
                                                }`}
                                                autoComplete="off"
                                                autoCapitalize="off"
                                                spellCheck={false}
                                            />
                                            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none" data-testid="register-username-status">
                                                {usernameState.status === "checking" && <Loader2 size={14} className="animate-spin text-black/45" />}
                                                {usernameState.status === "available" && <CheckCircle2 size={15} className="text-emerald-600" />}
                                                {(usernameState.status === "taken" || usernameState.status === "invalid") && <X size={15} className="text-red-soft" />}
                                            </div>
                                        </div>
                                        {usernameState.message && (
                                            <p
                                                data-testid="register-username-message"
                                                className={`mt-1.5 text-[11.5px] font-mono ${
                                                    usernameState.status === "available" ? "text-emerald-700" :
                                                    (usernameState.status === "taken" || usernameState.status === "invalid") ? "text-red-soft" :
                                                    "text-black/55"
                                                }`}
                                            >
                                                {usernameState.status === "available" && <CheckCircle2 size={11} className="inline mr-1 -mt-0.5" />}
                                                {(usernameState.status === "taken" || usernameState.status === "invalid") && <AlertCircle size={11} className="inline mr-1 -mt-0.5" />}
                                                {usernameState.message}
                                            </p>
                                        )}
                                    </Field>

                                    <Field label="Email">
                                        <div className="relative">
                                            <input
                                                data-testid="register-email"
                                                type="email" value={form.email} onChange={update("email")} required
                                                placeholder="tu@exemplo.com"
                                                className={`vm-input pr-9 ${
                                                    emailState.status === "available" ? "border-emerald-500/60" :
                                                    (emailState.status === "taken" || emailState.status === "invalid") ? "border-red-soft/60" : ""
                                                }`}
                                                autoComplete="email"
                                                inputMode="email"
                                                autoCapitalize="off"
                                                spellCheck={false}
                                            />
                                            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none" data-testid="register-email-status">
                                                {emailState.status === "checking" && <Loader2 size={14} className="animate-spin text-black/45" />}
                                                {emailState.status === "available" && <CheckCircle2 size={15} className="text-emerald-600" />}
                                                {(emailState.status === "taken" || emailState.status === "invalid") && <X size={15} className="text-red-soft" />}
                                            </div>
                                        </div>
                                        {emailState.message && (
                                            <p
                                                data-testid="register-email-message"
                                                className={`mt-1.5 text-[11.5px] font-mono ${
                                                    emailState.status === "available" ? "text-emerald-700" :
                                                    (emailState.status === "taken" || emailState.status === "invalid") ? "text-red-soft" :
                                                    "text-black/55"
                                                }`}
                                            >
                                                {emailState.status === "available" && <CheckCircle2 size={11} className="inline mr-1 -mt-0.5" />}
                                                {(emailState.status === "taken" || emailState.status === "invalid") && <AlertCircle size={11} className="inline mr-1 -mt-0.5" />}
                                                {emailState.status === "taken" ? (
                                                    <>
                                                        {emailState.message}{" "}
                                                        <Link to="/login" className="underline underline-offset-2 hover:no-underline font-medium">
                                                            Entrar?
                                                        </Link>
                                                    </>
                                                ) : (
                                                    emailState.message
                                                )}
                                            </p>
                                        )}
                                    </Field>

                                    {/* Password with strength meter */}
                                    <Field label="Palavra-passe">
                                        <div className="relative">
                                            <input
                                                data-testid="register-password"
                                                type={showPwd ? "text" : "password"}
                                                value={form.password}
                                                onChange={update("password")}
                                                required
                                                minLength={8}
                                                placeholder="Mínimo 8 caracteres"
                                                className="vm-input pr-10"
                                                autoComplete="new-password"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPwd((v) => !v)}
                                                className="absolute inset-y-0 right-2 px-1.5 text-black/40 hover:text-black/70"
                                                aria-label={showPwd ? "Esconder palavra-passe" : "Mostrar palavra-passe"}
                                                data-testid="register-password-toggle"
                                                tabIndex={-1}
                                            >
                                                {showPwd ? <EyeOff size={14} /> : <Eye size={14} />}
                                            </button>
                                        </div>
                                        {form.password && (
                                            <div className="mt-2" data-testid="register-password-strength">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 h-1.5 bg-black/[0.06] rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full rounded-full transition-all duration-300"
                                                            style={{ width: `${(pwdEval.score / 5) * 100}%`, background: pwdEval.color }}
                                                        />
                                                    </div>
                                                    <span
                                                        className="text-[10.5px] font-mono tracking-wider uppercase tabular-nums shrink-0"
                                                        style={{ color: pwdEval.color }}
                                                    >
                                                        {pwdEval.label}
                                                    </span>
                                                </div>
                                                {pwdEval.reasons.length > 0 && pwdEval.score < 5 && (
                                                    <p className="text-[11px] text-black/50 mt-1.5 leading-relaxed">
                                                        Falta: {pwdEval.reasons.slice(0, 3).join(" · ")}
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                        {!form.password && (
                                            <p className="text-[11px] text-black/45 mt-1.5 leading-relaxed">
                                                Mistura maiúsculas, minúsculas, números e símbolos.
                                            </p>
                                        )}
                                    </Field>

                                    {/* Password confirmation */}
                                    <Field label="Repetir palavra-passe">
                                        <div className="relative">
                                            <input
                                                data-testid="register-password-confirm"
                                                type={showPwdConfirm ? "text" : "password"}
                                                value={form.passwordConfirm}
                                                onChange={update("passwordConfirm")}
                                                required
                                                minLength={8}
                                                placeholder="Escreve novamente"
                                                className={`vm-input pr-10 ${
                                                    pwdMatches ? "border-emerald-500/60" :
                                                    pwdMismatch ? "border-red-soft/60" : ""
                                                }`}
                                                autoComplete="new-password"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPwdConfirm((v) => !v)}
                                                className="absolute inset-y-0 right-2 px-1.5 text-black/40 hover:text-black/70"
                                                aria-label={showPwdConfirm ? "Esconder palavra-passe" : "Mostrar palavra-passe"}
                                                tabIndex={-1}
                                            >
                                                {showPwdConfirm ? <EyeOff size={14} /> : <Eye size={14} />}
                                            </button>
                                        </div>
                                        {pwdMatches && (
                                            <p className="mt-1.5 text-[11.5px] font-mono text-emerald-700" data-testid="register-password-match">
                                                <CheckCircle2 size={11} className="inline mr-1 -mt-0.5" /> Coincide.
                                            </p>
                                        )}
                                        {pwdMismatch && (
                                            <p className="mt-1.5 text-[11.5px] font-mono text-red-soft" data-testid="register-password-mismatch">
                                                <AlertCircle size={11} className="inline mr-1 -mt-0.5" /> As palavras-passe não coincidem.
                                            </p>
                                        )}
                                    </Field>
                                </div>
                            )}

                            {step === 2 && (
                                <div className="space-y-4 pt-1" data-testid="register-step-city">
                                    <Field label="A tua cidade">
                                        <CitySelect
                                            value={city?.id || null}
                                            onChange={setCity}
                                            placeholder="Pesquisa — Lisboa, Olhão, Funchal…"
                                            testid="register-city"
                                        />
                                    </Field>
                                    {!city && (
                                        <div className="rounded-xl border border-dashed border-black/[0.10] px-4 py-5 text-center">
                                            <MapPin size={18} className="inline text-black/35 mb-2" />
                                            <p className="text-[13px] text-black/55 leading-relaxed">
                                                Escolhe a tua cidade — mostraremos a sua história e cultura.<br/>
                                                <span className="text-[11px] text-black/40">Podes saltar este passo se preferires.</span>
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {step === 3 && (
                                <div className="space-y-3 pt-1">
                                    {/* Micro-testimonial */}
                                    <div className="rounded-xl border border-black/[0.08] bg-white p-3.5">
                                        <blockquote className="font-display text-[17px] leading-[1.25] tracking-tight text-black max-w-[34ch]">
                                            “Finalmente uma rede que não me <span className="silver-foil">trata</span>{" "}
                                            como produto.”
                                        </blockquote>
                                        <p className="mt-2 text-[11px] text-black/50 font-mono uppercase tracking-[0.12em]">
                                            — Manifesto, promessa 04
                                        </p>
                                    </div>

                                    <ConsentCheckbox
                                        id="consent-age" checked={consent.age}
                                        onChange={() => toggleConsent("age")}
                                        testid="consent-age" required
                                    >
                                        Confirmo que tenho <strong>16 anos ou mais</strong>.
                                        <span className="block text-[11px] text-black/50 mt-0.5">
                                            Exigido pela Lei n.º 58/2019, art. 16.º. Menores com autorização dos representantes legais.
                                        </span>
                                    </ConsentCheckbox>
                                    <ConsentCheckbox
                                        id="consent-terms" checked={consent.terms}
                                        onChange={() => toggleConsent("terms")}
                                        testid="consent-terms" required
                                    >
                                        Li e aceito os{" "}
                                        <Link to="/legal/terms" target="_blank" className="underline underline-offset-2 hover:text-black font-medium">
                                            Termos e Condições
                                        </Link>{" "}
                                        e a{" "}
                                        <Link to="/legal/privacy" target="_blank" className="underline underline-offset-2 hover:text-black font-medium">
                                            Política de Privacidade
                                        </Link>.
                                    </ConsentCheckbox>
                                    <ConsentCheckbox
                                        id="consent-marketing" checked={consent.marketing}
                                        onChange={() => toggleConsent("marketing")}
                                        testid="consent-marketing"
                                    >
                                        <span className="text-black/70">Opcional</span> — quero novidades por e-mail.
                                        <span className="block text-[11px] text-black/50 mt-0.5">
                                            Revogável a qualquer momento nas Definições.
                                        </span>
                                    </ConsentCheckbox>
                                </div>
                            )}

                            {error && (
                                <div data-testid="register-error" className="text-sm text-red-soft font-medium mt-4 flex items-start gap-1.5">
                                    <AlertCircle size={14} className="shrink-0 mt-0.5" /> <span>{error}</span>
                                </div>
                            )}

                            <div className="mt-7 flex items-center gap-3">
                                {step > 1 && (
                                    <button
                                        type="button" onClick={back}
                                        data-testid="register-back"
                                        className="btn-silver text-[13px] py-3 px-4"
                                    >
                                        Voltar
                                    </button>
                                )}
                                {step < 3 ? (
                                    <button
                                        type="button" onClick={next}
                                        data-testid="register-next"
                                        disabled={step === 1 ? !canStep1 : false}
                                        className="btn-obsidian flex-1 text-[14px] py-3.5 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1.5"
                                    >
                                        {step === 2 && !city ? "Saltar" : "Seguinte"} <ArrowRight size={15} />
                                    </button>
                                ) : (
                                    <button
                                        type="submit" disabled={!canSubmit}
                                        data-testid="register-submit"
                                        className="btn-obsidian flex-1 text-[14px] py-3.5 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1.5"
                                    >
                                        {busy ? (<><Loader2 size={14} className="animate-spin" /> A criar conta…</>) : (<>Criar conta <Check size={15} /></>)}
                                    </button>
                                )}
                            </div>
                        </form>

                        <p className="mt-8 text-[13px] text-black/55 text-center lg:text-left">
                            Já tens conta?{" "}
                            <Link to="/login" data-testid="goto-login" className="text-black ink-link font-semibold">
                                Entrar
                            </Link>
                        </p>

                        <div className="mt-10 pt-6 border-t border-black/[0.06]">
                            <p className="text-[11px] text-black/45 leading-relaxed text-center lg:text-left">
                                Os teus dados são tratados conforme o RGPD e a Lei n.º 58/2019. Lê o nosso{" "}
                                <Link to="/manifesto" className="underline underline-offset-2 hover:text-black font-medium">
                                    manifesto
                                </Link>{" "}
                                — declaramos publicamente o que não fazemos.
                            </p>
                            <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-black/45 justify-center lg:justify-start">
                                <Link to="/legal" className="hover:text-black hover:underline underline-offset-2">Centro Legal</Link>
                                <Link to="/legal/terms" className="hover:text-black hover:underline underline-offset-2">Termos</Link>
                                <Link to="/legal/privacy" className="hover:text-black hover:underline underline-offset-2">Privacidade</Link>
                                <Link to="/legal/cookies" className="hover:text-black hover:underline underline-offset-2">Cookies</Link>
                                <Link to="/manifesto" className="hover:text-black hover:underline underline-offset-2">Manifesto</Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function Field({ label, children }) {
    return (
        <div>
            <label className="text-[12px] font-medium text-black/65 mb-1.5 block">{label}</label>
            {children}
        </div>
    );
}

function ConsentCheckbox({ id, checked, onChange, testid, required, children }) {
    return (
        <label
            htmlFor={id}
            className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition select-none ${
                checked
                    ? "border-black/30 bg-black/[0.02]"
                    : "border-black/[0.08] hover:border-black/20 hover:bg-black/[0.015]"
            }`}
        >
            <input
                id={id} type="checkbox" checked={checked} onChange={onChange}
                data-testid={testid}
                className="mt-0.5 w-4 h-4 accent-black shrink-0 cursor-pointer"
            />
            <span className="text-[12.5px] leading-relaxed text-black/80">
                {children}
                {required && <span className="text-red-soft ml-1" aria-hidden>*</span>}
            </span>
        </label>
    );
}
