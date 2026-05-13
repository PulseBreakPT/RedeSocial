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
        <div className="min-h-screen grid lg:grid-cols-2">
            <div
                className="hidden lg:flex relative flex-col justify-between p-12 overflow-hidden"
                style={{
                    backgroundImage:
                        "url('https://images.unsplash.com/photo-1646924378952-242c10c83506?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA0MTJ8MHwxfHNlYXJjaHwxfHxhYnN0cmFjdCUyMGRhcmslMjB0ZXh0dXJlJTIwbGFuZHNjYXBlfGVufDB8fHx8MTc3ODYzOTMyMnww&ixlib=rb-4.1.0&q=85')",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                }}
            >
                <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/60 to-[#8B5CF6]/20" />
                <div className="relative">
                    <h1 className="font-heading text-5xl font-bold tracking-tighter">
                        <span className="text-accent-vermillion">▲</span> vermillion
                    </h1>
                    <p className="font-mono text-xs uppercase tracking-widest text-zinc-400 mt-2">rede social</p>
                </div>
                <div className="relative max-w-md">
                    <h2 className="font-heading text-4xl font-bold tracking-tight leading-tight">
                        Onde sua voz<br />encontra um <span className="text-accent-vermillion italic">eco</span>.
                    </h2>
                    <p className="font-body text-zinc-300 mt-4 leading-relaxed">
                        Liga-te, descobre e conversa em tempo real. Um espaço refinado para ideias que importam.
                    </p>
                </div>
            </div>

            <div className="flex flex-col justify-center p-8 lg:p-16">
                <div className="max-w-sm w-full mx-auto">
                    <h2 className="font-heading text-3xl font-bold tracking-tight">Entrar</h2>
                    <p className="font-mono text-xs uppercase tracking-widest text-zinc-500 mt-2">acesse a tua conta</p>

                    <form onSubmit={submit} className="mt-10 space-y-5" data-testid="login-form">
                        <div>
                            <label className="font-mono text-xs uppercase tracking-widest text-zinc-500">Email</label>
                            <input
                                data-testid="login-email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="mt-2 w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-accent-vermillion focus:outline-none transition"
                            />
                        </div>
                        <div>
                            <label className="font-mono text-xs uppercase tracking-widest text-zinc-500">Palavra-passe</label>
                            <input
                                data-testid="login-password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="mt-2 w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-accent-vermillion focus:outline-none transition"
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

                    <p className="mt-8 font-mono text-sm text-zinc-500">
                        Ainda não tens conta?{" "}
                        <Link to="/register" data-testid="goto-register" className="text-accent-vermillion hover:underline">
                            Criar conta
                        </Link>
                    </p>
                    <p className="mt-2 font-mono text-sm text-zinc-500">
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
