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
            {/* Left — editorial luxury panel */}
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
                    <h1 className="font-display text-[44px] leading-none tracking-tight text-black flex items-baseline gap-2">
                        <span className="silver-foil text-[32px] translate-y-[2px]">◆</span>
                        <span className="italic font-light">vermillion</span>
                    </h1>
                    <p className="type-overline mt-3">une rede sociale · est. 2026</p>
                </div>
                <div className="relative max-w-md">
                    <p className="type-overline mb-5">manifesto nº 01</p>
                    <h2 className="font-display text-[58px] leading-[0.95] tracking-tight text-black">
                        Onde a tua voz<br />encontra um <span className="italic silver-foil">eco</span>.
                    </h2>
                    <p className="font-body text-black/65 mt-7 leading-relaxed text-[15px] max-w-sm">
                        Liga-te, descobre e conversa em tempo real. Um espaço refinado para ideias que importam.
                    </p>
                </div>
                <div className="relative type-overline">
                    desenhado em portugal · pensado para o mundo
                </div>
            </div>

            {/* Right — form */}
            <div className="flex flex-col justify-center p-6 sm:p-8 lg:p-16 pt-12 pb-safe min-h-screen bg-white">
                <div className="max-w-sm w-full mx-auto">
                    <div className="lg:hidden text-center mb-10">
                        <h1 className="font-display text-[42px] leading-none italic font-light tracking-tight">
                            <span className="silver-foil not-italic">◆</span> vermillion
                        </h1>
                        <p className="type-overline mt-3">une rede sociale</p>
                    </div>
                    <p className="type-overline mb-3">acesso · membros</p>
                    <h2 className="font-display text-[40px] lg:text-[48px] italic font-light tracking-tight leading-[0.95]">Bem-vindo<br />de volta.</h2>

                    <form onSubmit={submit} className="mt-10 space-y-5" data-testid="login-form">
                        <div>
                            <label className="type-overline">Email</label>
                            <input
                                data-testid="login-email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoComplete="email"
                                inputMode="email"
                                placeholder="tu@exemplo.com"
                                className="mt-2 w-full bg-[#fafafa] border border-black/[0.08] rounded-2xl px-4 py-3.5 text-black placeholder:text-black/30 focus:border-black/40 focus:bg-white focus:outline-none transition"
                            />
                        </div>
                        <div>
                            <div className="flex items-center justify-between">
                                <label className="type-overline">Palavra-passe</label>
                                <Link to="/forgot" data-testid="goto-forgot" className="font-mono text-[10px] tracking-wider text-black/50 ink-link">
                                    esqueci-me
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
                                className="mt-2 w-full bg-[#fafafa] border border-black/[0.08] rounded-2xl px-4 py-3.5 text-black placeholder:text-black/30 focus:border-black/40 focus:bg-white focus:outline-none transition"
                            />
                        </div>
                        {error && (
                            <div data-testid="login-error" className="text-sm text-red-soft font-mono">{error}</div>
                        )}
                        <button
                            type="submit"
                            disabled={busy}
                            data-testid="login-submit"
                            className="btn-obsidian w-full text-[14px] py-3.5 disabled:opacity-50"
                        >
                            {busy ? "A entrar…" : "Entrar"}
                        </button>
                    </form>

                    <p className="mt-10 font-mono text-[12px] text-black/50 text-center lg:text-left">
                        Ainda não tens conta?{" "}
                        <Link to="/register" data-testid="goto-register" className="text-black ink-link font-medium">
                            Criar conta
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
