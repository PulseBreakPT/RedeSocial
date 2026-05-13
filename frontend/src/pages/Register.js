import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Register() {
    const { user, register } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({ name: "", username: "", email: "", password: "" });
    const [consent, setConsent] = useState({ age: false, terms: false, marketing: false });
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    if (user) return <Navigate to="/" replace />;

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
        const res = await register(form);
        setBusy(false);
        if (!res.ok) setError(res.error);
        else {
            // Persist consent record locally (audit trail). Backend persistence is optional.
            try {
                const record = {
                    timestamp: new Date().toISOString(),
                    age_confirmed: consent.age,
                    terms_accepted: consent.terms,
                    marketing_opt_in: consent.marketing,
                    terms_version: 1,
                    privacy_version: 1,
                };
                localStorage.setItem("vm_signup_consent", JSON.stringify(record));
            } catch {
                // ignore
            }
            navigate("/");
        }
    };

    const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });
    const toggleConsent = (k) => setConsent((c) => ({ ...c, [k]: !c[k] }));
    const canSubmit = consent.age && consent.terms && !busy;

    return (
        <div className="min-h-screen grid lg:grid-cols-2 bg-white text-black">
            <div className="hidden lg:flex relative flex-col justify-between p-14 overflow-hidden bg-paper grain isolate">
                <div
                    className="absolute -top-32 -right-24 w-[520px] h-[520px] rounded-full opacity-50"
                    style={{ background: "radial-gradient(circle, rgba(212,212,220,0.6), transparent 65%)" }}
                />
                <div
                    className="absolute -bottom-40 -left-32 w-[640px] h-[640px] rounded-full opacity-40"
                    style={{ background: "radial-gradient(circle, rgba(106,168,230,0.18), transparent 60%)" }}
                />
                <div className="relative">
                    <h1 className="font-display text-[36px] leading-none tracking-tight text-black flex items-baseline gap-2">
                        <span className="silver-foil text-[28px] translate-y-[1px]">◆</span>
                        <span>vermillion</span>
                    </h1>
                </div>
                <div className="relative max-w-md">
                    <h2 className="font-display text-[52px] leading-[1] tracking-tight text-black">
                        Junta-te à <span className="silver-foil">conversa</span>.
                    </h2>
                    <p className="font-body text-black/60 mt-6 leading-relaxed text-[15px] max-w-sm">
                        Conta criada em segundos. Sem ruído, sem ads, sem algoritmos opacos — apenas pessoas a falar.
                    </p>
                </div>
                <div className="relative text-[12px] text-black/40 font-medium">
                    © vermillion · {new Date().getFullYear()}
                </div>
            </div>

            <div className="flex flex-col justify-center p-6 sm:p-8 lg:p-16 pt-12 pb-safe min-h-screen bg-white">
                <div className="max-w-sm w-full mx-auto">
                    <div className="lg:hidden text-center mb-10">
                        <h1 className="font-display text-[36px] leading-none tracking-tight">
                            <span className="silver-foil">◆</span> vermillion
                        </h1>
                    </div>
                    <h2 className="font-display text-[34px] lg:text-[40px] tracking-tight leading-[1.05]">Criar conta</h2>
                    <p className="text-black/55 text-[14px] mt-2">É grátis e demora menos de um minuto.</p>

                    <form onSubmit={submit} className="mt-8 space-y-4" data-testid="register-form">
                        <div>
                            <label className="text-[12px] font-medium text-black/65 mb-1.5 block">Nome</label>
                            <input
                                data-testid="register-name"
                                type="text"
                                value={form.name}
                                onChange={update("name")}
                                required
                                placeholder="O teu nome"
                                className="w-full bg-[#fafafa] border border-black/[0.10] rounded-xl px-4 py-3 text-[15px] text-black placeholder:text-black/35 focus:border-black/40 focus:bg-white focus:outline-none transition"
                            />
                        </div>
                        <div>
                            <label className="text-[12px] font-medium text-black/65 mb-1.5 block">Username</label>
                            <input
                                data-testid="register-username"
                                type="text"
                                value={form.username}
                                onChange={update("username")}
                                required
                                minLength={3}
                                pattern="[a-zA-Z0-9_]+"
                                placeholder="o_teu_user"
                                className="w-full bg-[#fafafa] border border-black/[0.10] rounded-xl px-4 py-3 text-[15px] text-black placeholder:text-black/35 focus:border-black/40 focus:bg-white focus:outline-none transition"
                            />
                        </div>
                        <div>
                            <label className="text-[12px] font-medium text-black/65 mb-1.5 block">Email</label>
                            <input
                                data-testid="register-email"
                                type="email"
                                value={form.email}
                                onChange={update("email")}
                                required
                                placeholder="tu@exemplo.com"
                                className="w-full bg-[#fafafa] border border-black/[0.10] rounded-xl px-4 py-3 text-[15px] text-black placeholder:text-black/35 focus:border-black/40 focus:bg-white focus:outline-none transition"
                            />
                        </div>
                        <div>
                            <label className="text-[12px] font-medium text-black/65 mb-1.5 block">Palavra-passe</label>
                            <input
                                data-testid="register-password"
                                type="password"
                                value={form.password}
                                onChange={update("password")}
                                required
                                minLength={6}
                                placeholder="Mínimo 6 caracteres"
                                className="w-full bg-[#fafafa] border border-black/[0.10] rounded-xl px-4 py-3 text-[15px] text-black placeholder:text-black/35 focus:border-black/40 focus:bg-white focus:outline-none transition"
                            />
                        </div>
                        {error && <div data-testid="register-error" className="text-sm text-red-soft font-medium">{error}</div>}

                        {/* Consent block — GDPR Art. 7 / Lei 58/2019 Art. 16 */}
                        <div className="space-y-2.5 pt-1">
                            <ConsentCheckbox
                                id="consent-age"
                                checked={consent.age}
                                onChange={() => toggleConsent("age")}
                                testid="consent-age"
                                required
                            >
                                Confirmo que tenho <strong>16 anos ou mais</strong>.
                                <span className="block text-[11px] text-black/50 mt-0.5">
                                    Exigido pela Lei n.º 58/2019, art. 16.º. Menores podem usar com autorização dos representantes legais.
                                </span>
                            </ConsentCheckbox>
                            <ConsentCheckbox
                                id="consent-terms"
                                checked={consent.terms}
                                onChange={() => toggleConsent("terms")}
                                testid="consent-terms"
                                required
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
                                id="consent-marketing"
                                checked={consent.marketing}
                                onChange={() => toggleConsent("marketing")}
                                testid="consent-marketing"
                            >
                                <span className="text-black/70">Opcional</span> — quero receber novidades, sugestões e comunicações ocasionais por e-mail.
                                <span className="block text-[11px] text-black/50 mt-0.5">
                                    Podes revogar a qualquer momento nas Definições. Base legal: consentimento (RGPD art. 6.º, n.º 1, al. a)).
                                </span>
                            </ConsentCheckbox>
                        </div>

                        <button
                            type="submit"
                            disabled={!canSubmit}
                            data-testid="register-submit"
                            className="btn-obsidian w-full text-[14px] py-3.5 disabled:opacity-40 disabled:cursor-not-allowed mt-2"
                        >
                            {busy ? "A criar conta…" : "Criar conta"}
                        </button>
                    </form>

                    <p className="mt-8 text-[13px] text-black/55 text-center lg:text-left">
                        Já tens conta?{" "}
                        <Link to="/login" data-testid="goto-login" className="text-black ink-link font-semibold">
                            Entrar
                        </Link>
                    </p>

                    {/* Legal footer */}
                    <div className="mt-10 pt-6 border-t border-black/[0.06]">
                        <p className="text-[11px] text-black/45 leading-relaxed text-center lg:text-left">
                            Os teus dados são tratados conforme o RGPD e a Lei n.º 58/2019. Podes exercer os teus direitos
                            (acesso, retificação, apagamento, portabilidade, oposição) escrevendo para{" "}
                            <a href="mailto:dpo@vermillion.pt" className="underline underline-offset-2 hover:text-black">dpo@vermillion.pt</a>.
                        </p>
                        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-black/45 justify-center lg:justify-start">
                            <Link to="/legal" className="hover:text-black hover:underline underline-offset-2">Centro Legal</Link>
                            <Link to="/legal/terms" className="hover:text-black hover:underline underline-offset-2">Termos</Link>
                            <Link to="/legal/privacy" className="hover:text-black hover:underline underline-offset-2">Privacidade</Link>
                            <Link to="/legal/cookies" className="hover:text-black hover:underline underline-offset-2">Cookies</Link>
                            <Link to="/legal/community" className="hover:text-black hover:underline underline-offset-2">Diretrizes</Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ConsentCheckbox({ id, checked, onChange, testid, required, children }) {
    return (
        <label
            htmlFor={id}
            className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition select-none ${
                checked ? "border-black/30 bg-black/[0.02]" : "border-black/[0.08] hover:border-black/20 hover:bg-black/[0.015]"
            }`}
        >
            <input
                id={id}
                type="checkbox"
                checked={checked}
                onChange={onChange}
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
