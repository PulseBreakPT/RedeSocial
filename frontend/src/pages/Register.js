import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ArrowRight, Check } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { PT_REGIONS, PT_MOODS, PT_TEAMS } from "../lib/ptCulture";

// Convivial Portuguese hero — street decorated for Santos Populares.
// Frames the "come to the table" moment with community / festa popular.
const REGISTER_HERO =
    "https://images.unsplash.com/photo-1690467521792-8e38e841e000?auto=format&fit=crop&w=1600&q=75";

/**
 * F2.1 — Onboarding 60s.
 * 3 steps: credentials → identity (city/region/mood/team) → consent.
 * Total time-to-account ~60s. Each answer is investment (Eyal) → makes exit costlier.
 */
export default function Register() {
    const { user, register } = useAuth();
    const navigate = useNavigate();
    const [step, setStep] = useState(1);

    // Step 1 — credentials
    const [form, setForm] = useState({ name: "", username: "", email: "", password: "" });
    // Step 2 — PT identity
    const [identity, setIdentity] = useState({ city: "", region: "", mood_initial: "", team: "" });
    // Step 3 — consent
    const [consent, setConsent] = useState({ age: false, terms: false, marketing: false });

    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    if (user) return <Navigate to="/" replace />;

    const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });
    const setIdField = (k, v) => setIdentity({ ...identity, [k]: v });
    const toggleConsent = (k) => setConsent((c) => ({ ...c, [k]: !c[k] }));

    const canStep1 =
        form.name.trim().length >= 1 &&
        form.username.trim().length >= 3 &&
        /^[a-zA-Z0-9_]+$/.test(form.username) &&
        /\S+@\S+\.\S+/.test(form.email) &&
        form.password.length >= 6;
    const canStep2 = true; // identity is optional (but encouraged); allow skipping
    const canSubmit = consent.age && consent.terms && !busy;

    const next = () => {
        setError("");
        if (step === 1 && !canStep1) {
            setError("Confirma o nome, username (≥3, letras/números/_), email e password (≥6).");
            return;
        }
        setStep((s) => Math.min(3, s + 1));
    };
    const back = () => setStep((s) => Math.max(1, s - 1));

    const submit = async (e) => {
        e.preventDefault();
        setError("");
        if (!consent.age) {
            setError("É necessário confirmar que tens 16 anos ou mais.");
            return;
        }
        if (!consent.terms) {
            setError("É necessário aceitar os Termos e a Política de Privacidade.");
            return;
        }
        setBusy(true);
        const res = await register({
            ...form,
            city: identity.city || null,
            region: identity.region || null,
            mood_initial: identity.mood_initial || null,
            team: identity.team || null,
            terms_accepted: consent.terms,
            age_confirmed: consent.age,
            marketing_opt_in: consent.marketing,
        });
        setBusy(false);
        if (!res.ok) {
            setError(res.error);
            return;
        }
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
            {/* Left — Portugal atmosphere panel (cinematic photo background) */}
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
                        Conta criada em 60 segundos. Cinco perguntas para a tua casa ficar tua — todas saltáveis.
                    </p>
                </div>
                <div className="relative text-[12px] text-white/60 font-medium">
                    © vermillion · {new Date().getFullYear()}
                </div>
            </div>

            {/* Right form panel (mobile gets a Portugal hero banner on top) */}
            <div className="flex flex-col lg:justify-center pb-safe min-h-screen bg-white">
                {/* Mobile-only hero — mirrors the desktop atmosphere panel */}
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
                        <p className="text-white/85 font-body text-[13px] mt-2">
                            Senta-te à mesa.
                        </p>
                    </div>
                </div>

                <div className="px-6 sm:px-8 pt-8 lg:p-16 lg:pt-12 flex flex-col lg:justify-center flex-1">
                    <div className="max-w-sm w-full mx-auto">

                        {/* Step indicator */}
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
                        {step === 2 && "De onde escreves?"}
                        {step === 3 && "Última coisa, juramos"}
                    </h2>
                    <p className="text-black/55 text-[14px] mt-2 leading-relaxed">
                        {step === 1 && "Nome, email, password. Depois entramos no resto."}
                        {step === 2 && "Estas perguntas são todas opcionais — podes saltar tudo."}
                        {step === 3 && "Consentimento obrigatório por lei. Não há letra pequena."}
                    </p>

                    <form onSubmit={submit} className="mt-7" data-testid="register-form">
                        {step === 1 && (
                            <div className="space-y-4">
                                <Field label="Nome">
                                    <input
                                        data-testid="register-name"
                                        type="text" value={form.name} onChange={update("name")} required
                                        placeholder="O teu nome"
                                        className="vm-input"
                                    />
                                </Field>
                                <Field label="Username">
                                    <input
                                        data-testid="register-username"
                                        type="text" value={form.username} onChange={update("username")} required
                                        minLength={3} pattern="[a-zA-Z0-9_]+"
                                        placeholder="o_teu_user"
                                        className="vm-input"
                                    />
                                </Field>
                                <Field label="Email">
                                    <input
                                        data-testid="register-email"
                                        type="email" value={form.email} onChange={update("email")} required
                                        placeholder="tu@exemplo.com"
                                        className="vm-input"
                                    />
                                </Field>
                                <Field label="Palavra-passe">
                                    <input
                                        data-testid="register-password"
                                        type="password" value={form.password} onChange={update("password")} required
                                        minLength={6} placeholder="Mínimo 6 caracteres"
                                        className="vm-input"
                                    />
                                </Field>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-5">
                                <Field label="Cidade (opcional)">
                                    <input
                                        data-testid="register-city"
                                        type="text" value={identity.city}
                                        onChange={(e) => setIdField("city", e.target.value)}
                                        placeholder="Ex: Lisboa, Porto, Évora…"
                                        className="vm-input"
                                    />
                                </Field>

                                <ChipGroup
                                    label="Região"
                                    testid="register-region"
                                    options={PT_REGIONS}
                                    value={identity.region}
                                    onChange={(v) => setIdField("region", v)}
                                />

                                <ChipGroup
                                    label="O teu mood agora"
                                    testid="register-mood"
                                    options={PT_MOODS}
                                    value={identity.mood_initial}
                                    onChange={(v) => setIdField("mood_initial", v)}
                                />

                                <ChipGroup
                                    label="Time"
                                    testid="register-team"
                                    options={PT_TEAMS}
                                    value={identity.team}
                                    onChange={(v) => setIdField("team", v)}
                                />
                            </div>
                        )}

                        {step === 3 && (
                            <div className="space-y-3 pt-1">
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
                            <div data-testid="register-error" className="text-sm text-red-soft font-medium mt-4">
                                {error}
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
                                    disabled={step === 1 && !canStep1}
                                    className="btn-obsidian flex-1 text-[14px] py-3.5 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1.5"
                                >
                                    {step === 2 ? "Continuar" : "Seguinte"} <ArrowRight size={15} />
                                </button>
                            ) : (
                                <button
                                    type="submit" disabled={!canSubmit}
                                    data-testid="register-submit"
                                    className="btn-obsidian flex-1 text-[14px] py-3.5 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1.5"
                                >
                                    {busy ? "A criar conta…" : (
                                        <>Criar conta <Check size={15} /></>
                                    )}
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

function ChipGroup({ label, options, value, onChange, testid }) {
    return (
        <div>
            <p className="text-[12px] font-medium text-black/65 mb-2">{label}</p>
            <div className="flex flex-wrap gap-1.5" data-testid={testid}>
                {options.map((opt) => {
                    const active = value === opt.key;
                    return (
                        <button
                            key={opt.key}
                            type="button"
                            onClick={() => onChange(active ? "" : opt.key)}
                            data-testid={`${testid}-${opt.key}`}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12.5px] tracking-tight border transition tap-shrink ${
                                active
                                    ? "chip-on border-transparent !text-white font-semibold"
                                    : "border-black/[0.10] hover:border-black/30 hover:bg-black/[0.03] text-black/75"
                            }`}
                        >
                            <span aria-hidden>{opt.emoji}</span>
                            {opt.label}
                        </button>
                    );
                })}
            </div>
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
