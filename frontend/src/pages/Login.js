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
            <div
                className="hidden lg:flex relative flex-col justify-between p-12 overflow-hidden bg-gradient-to-br from-[#f4f4f8] via-[#e0e0e6] to-[#9a9aa3]"
            >
                <div className="relative">
                    <h1 className="font-heading text-5xl font-bold tracking-tighter text-black flex items-center gap-2">
                        <span className="text-silver">◆</span>
                        <span className="text-silver">vermillion</span>
                    </h1>
                    <p className="font-mono text-xs uppercase tracking-widest text-black/60 mt-2">rede social</p>
                </div>
                <div className="relative max-w-md">
                    <h2 className="font-heading text-4xl font-bold tracking-tight leading-tight text-black">
                        Onde a tua voz<br />encontra um <span className="italic text-silver">eco</span>.
                    </h2>
                    <p className="font-body text-black/70 mt-4 leading-relaxed">
                        Liga-te, descobre e conversa em tempo real. Um espaço refinado para ideias que importam.
                    </p>
                </div>
            </div>

            <div className="flex flex-col justify-center p-6 sm:p-8 lg:p-16 pt-12 pb-safe min-h-screen">
                <div className="max-w-sm w-full mx-auto">
                    <div className="lg:hidden text-center mb-8">
                        <h1 className="font-heading text-4xl font-bold tracking-tighter">
                            <span className="text-accent-vermillion">◆</span> vermillion
                        </h1>
                        <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-zinc-500 mt-2">rede social</p>
                    </div>
                    <h2 className="font-heading text-2xl lg:text-3xl font-bold tracking-tight">Bem-vindo de volta</h2>
                    <p className="font-mono text-[11px] uppercase tracking-widest text-zinc-500 mt-2">entra na tua conta</p>

                    <form onSubmit={submit} className="mt-8 lg:mt-10 space-y-4 lg:space-y-5" data-testid="login-form">
                        <div>
                            <label className="font-mono text-[11px] uppercase tracking-widest text-zinc-500">Email</label>
                            <input
                                data-testid="login-email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                autoComplete="email"
                                inputMode="email"
                                className="mt-2 w-full bg-zinc-950 border border-white/[0.08] rounded-2xl px-4 py-3.5 text-white focus:border-accent-vermillion focus:outline-none transition"
                            />
                        </div>
                        <div>
                            <label className="font-mono text-[11px] uppercase tracking-widest text-zinc-500">Palavra-passe</label>
                            <input
                                data-testid="login-password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                autoComplete="current-password"
                                className="mt-2 w-full bg-zinc-950 border border-white/[0.08] rounded-2xl px-4 py-3.5 text-white focus:border-accent-vermillion focus:outline-none transition"
                            />
                        </div>
                        {error && (
                            <div data-testid="login-error" className="text-sm text-accent-vermillion font-mono">{error}</div>
                        )}
                        <button
                            type="submit"
                            disabled={busy}
                            data-testid="login-submit"
                            className="w-full bg-accent-vermillion text-white font-heading font-semibold uppercase tracking-wide text-sm py-3.5 rounded-full hover:bg-[#A78BFA] transition disabled:opacity-50 active:scale-[0.98] glow-vermillion"
                        >
                            {busy ? "A entrar..." : "Entrar"}
                        </button>
                    </form>

                    <p className="mt-7 lg:mt-8 font-mono text-sm text-zinc-500 text-center lg:text-left">
                        Ainda não tens conta?{" "}
                        <Link to="/register" data-testid="goto-register" className="text-accent-vermillion hover:underline">
                            Criar conta
                        </Link>
                    </p>
                    <p className="mt-2 font-mono text-sm text-zinc-500 text-center lg:text-left">
                        Esqueceste-te da palavra-passe?{" "}
                        <Link to="/forgot" data-testid="goto-forgot" className="text-accent-vermillion hover:underline">
                            Recuperar
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
