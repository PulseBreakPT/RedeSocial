import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { VermillionSeal } from "../components/VermillionSeal";

// Cinematic Portuguese hero — Porto / Douro at golden hour.
// Frames the "welcome back" moment in saudade (solitary, contemplative).
const LOGIN_HERO =
    "https://images.unsplash.com/photo-1612632554560-42cc9d2acfdc?auto=format&fit=crop&w=1600&q=75";

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
        <div className="min-h-screen grid lg:grid-cols-2 bg-white text-black">
            {/* Left — Portugal atmosphere panel (cinematic photo background) */}
            <div className="hidden lg:flex relative flex-col justify-between p-14 overflow-hidden isolate">
                <img
                    src={LOGIN_HERO}
                    alt="Anoitecer dourado sobre o rio Douro, no Porto"
                    className="absolute inset-0 w-full h-full object-cover"
                    loading="eager"
                />
                {/* Cinematic gradient overlay — keeps brand legible top, tagline legible bottom */}
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
                        Liga-te.<br />Partilha o que <span className="silver-foil">importa</span>.
                    </h2>
                    <p className="font-body text-white/85 mt-6 leading-relaxed text-[15px] max-w-sm">
                        Uma rede social rápida, simples e sem distracções — feita para conversas que valem.
                    </p>
                </div>
                <div className="relative text-[12px] text-white/60 font-medium">
                    <VermillionSeal size="md" tone="light" />
                </div>
            </div>

            {/* Right — form (mobile gets a Portugal hero banner on top) */}
            <div className="flex flex-col lg:justify-center pb-safe min-h-screen bg-white">
                {/* Mobile-only hero — mirrors the desktop atmosphere panel */}
                <div className="lg:hidden relative h-[220px] sm:h-[260px] overflow-hidden">
                    <img
                        src={LOGIN_HERO}
                        alt="Anoitecer dourado sobre o rio Douro, no Porto"
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
                        <h1 className="font-display text-[34px] leading-none tracking-tight text-white">
                            <span className="silver-foil">◆</span> vermillion
                        </h1>
                        <p className="text-white/85 font-body text-[13px] mt-2.5">
                            Liga-te. Partilha o que importa.
                        </p>
                    </div>
                </div>

                <div className="px-6 sm:px-8 pt-10 lg:p-16 lg:pt-12 flex flex-col lg:justify-center flex-1">
                    <div className="max-w-sm w-full mx-auto">
                        <h2 className="font-display text-[34px] lg:text-[40px] tracking-tight leading-[1.05]">Entrar na conta</h2>
                    <p className="text-black/55 text-[14px] mt-2">Bem-vindo de volta.</p>

                    <form onSubmit={submit} className="mt-8 space-y-4" data-testid="login-form">
                        <div>
                            <label className="text-[12px] font-medium text-black/65 mb-1.5 block">Email</label>
                            <input
                                data-testid="login-email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoComplete="email"
                                inputMode="email"
                                placeholder="tu@exemplo.com"
                                className="w-full bg-[#fafafa] border border-black/[0.10] rounded-xl px-4 py-3 text-[15px] text-black placeholder:text-black/35 focus:border-black/40 focus:bg-white focus:outline-none transition"
                            />
                        </div>
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <label className="text-[12px] font-medium text-black/65">Palavra-passe</label>
                                <Link to="/forgot" data-testid="goto-forgot" className="text-[12px] text-black hover:text-black ink-link font-medium">
                                    Esqueci-me
                                </Link>
                            </div>
                            <input
                                data-testid="login-password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                autoComplete="current-password"
                                placeholder="••••••••"
                                className="w-full bg-[#fafafa] border border-black/[0.10] rounded-xl px-4 py-3 text-[15px] text-black placeholder:text-black/35 focus:border-black/40 focus:bg-white focus:outline-none transition"
                            />
                        </div>
                        {error && (
                            <div data-testid="login-error" className="text-sm text-red-soft font-medium">{error}</div>
                        )}
                        <button
                            type="submit"
                            disabled={busy}
                            data-testid="login-submit"
                            className="btn-obsidian w-full text-[14px] py-3.5 disabled:opacity-50 mt-2"
                        >
                            {busy ? "A entrar…" : "Entrar"}
                        </button>
                    </form>

                    <p className="mt-8 text-[13px] text-black/55 text-center lg:text-left">
                        Ainda não tens conta?{" "}
                        <Link to="/register" data-testid="goto-register" className="text-black ink-link font-semibold">
                            Criar conta
                        </Link>
                    </p>

                    {/* Social proof — quiet, not braggy */}
                    <div className="mt-10 rounded-2xl border border-black/[0.08] p-5 bg-paper grain isolate">
                        <p className="text-[10.5px] uppercase tracking-[0.14em] text-black/45 font-mono mb-2.5">
                            Da nossa cozinha
                        </p>
                        <blockquote className="font-display text-[19px] leading-[1.25] tracking-tight text-black max-w-[34ch]">
                            “Não é sobre quantos seguem. É sobre <span className="silver-foil">quem está à mesa</span>.”
                        </blockquote>
                        <p className="mt-3 text-[12px] text-black/55 leading-relaxed">
                            Aqui não há streaks que punam, nem notificações entre as 23h e as 8h.{" "}
                            <Link to="/manifesto" className="underline underline-offset-2 hover:text-black font-medium">
                                Lê o manifesto
                            </Link>.
                        </p>
                    </div>

                    {/* Legal footer */}
                    <div className="mt-8 pt-6 border-t border-black/[0.06]">
                        <p className="text-[11px] text-black/45 leading-relaxed text-center lg:text-left">
                            Ao entrar concordas com os{" "}
                            <Link to="/legal/terms" className="underline underline-offset-2 hover:text-black">Termos</Link>{" "}
                            e a{" "}
                            <Link to="/legal/privacy" className="underline underline-offset-2 hover:text-black">Política de Privacidade</Link>.
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
        </div>
    );
}
