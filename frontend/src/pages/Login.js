import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

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
            {/* Left — atmosphere panel */}
            <div className="hidden lg:flex relative flex-col justify-between p-14 overflow-hidden bg-paper grain isolate">
                <div
                    className="absolute -top-32 -left-24 w-[520px] h-[520px] rounded-full opacity-50"
                    style={{ background: "radial-gradient(circle, rgba(212,212,220,0.6), transparent 65%)" }}
                />
                <div
                    className="absolute -bottom-40 -right-32 w-[640px] h-[640px] rounded-full opacity-40"
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
                        Liga-te.<br />Partilha o que <span className="silver-foil">importa</span>.
                    </h2>
                    <p className="font-body text-black/60 mt-6 leading-relaxed text-[15px] max-w-sm">
                        Uma rede social rápida, simples e sem distracções — feita para conversas que valem.
                    </p>
                </div>
                <div className="relative text-[12px] text-black/40 font-medium">
                    © vermillion · {new Date().getFullYear()}
                </div>
            </div>

            {/* Right — form */}
            <div className="flex flex-col justify-center p-6 sm:p-8 lg:p-16 pt-12 pb-safe min-h-screen bg-white">
                <div className="max-w-sm w-full mx-auto">
                    <div className="lg:hidden text-center mb-10">
                        <h1 className="font-display text-[36px] leading-none tracking-tight">
                            <span className="silver-foil">◆</span> vermillion
                        </h1>
                    </div>
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
                                <Link to="/forgot" data-testid="goto-forgot" className="text-[12px] text-black/55 hover:text-black ink-link font-medium">
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
                </div>
            </div>
        </div>
    );
}
