import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Register() {
    const { user, register } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({ name: "", username: "", email: "", password: "" });
    const [error, setError] = useState("");
    const [busy, setBusy] = useState(false);

    if (user) return <Navigate to="/" replace />;

    const submit = async (e) => {
        e.preventDefault();
        setError("");
        setBusy(true);
        const res = await register(form);
        setBusy(false);
        if (!res.ok) setError(res.error);
        else navigate("/");
    };

    const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

    return (
        <div className="min-h-screen grid lg:grid-cols-2">
            <div
                className="hidden lg:flex relative flex-col justify-between p-12 overflow-hidden"
                style={{
                    backgroundImage:
                        "url('https://images.unsplash.com/photo-1767893609884-622503897e53?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA0MTJ8MHwxfHNlYXJjaHwyfHxhYnN0cmFjdCUyMGRhcmslMjB0ZXh0dXJlJTIwbGFuZHNjYXBlfGVufDB8fHx8MTc3ODYzOTMyMnww&ixlib=rb-4.1.0&q=85')",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                }}
            >
                <div className="absolute inset-0 bg-gradient-to-br from-black/80 via-black/60 to-[#9a9aa3]/30" />
                <div className="relative">
                    <h1 className="font-heading text-5xl font-bold tracking-tighter">
                        <span className="text-accent-vermillion">▲</span> vermillion
                    </h1>
                    <p className="font-mono text-xs uppercase tracking-widest text-zinc-400 mt-2">rede social</p>
                </div>
                <div className="relative max-w-md">
                    <h2 className="font-heading text-4xl font-bold tracking-tight leading-tight">
                        O teu lugar para<br />contar uma <span className="text-accent-vermillion italic">história</span>.
                    </h2>
                </div>
            </div>

            <div className="flex flex-col justify-center p-8 lg:p-16">
                <div className="max-w-sm w-full mx-auto">
                    <h2 className="font-heading text-3xl font-bold tracking-tight">Criar conta</h2>
                    <p className="font-mono text-xs uppercase tracking-widest text-zinc-500 mt-2">começa em 30 segundos</p>

                    <form onSubmit={submit} className="mt-8 space-y-4" data-testid="register-form">
                        <div>
                            <label className="font-mono text-xs uppercase tracking-widest text-zinc-500">Nome</label>
                            <input
                                data-testid="register-name"
                                type="text"
                                value={form.name}
                                onChange={update("name")}
                                required
                                className="mt-2 w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-accent-vermillion focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="font-mono text-xs uppercase tracking-widest text-zinc-500">Username</label>
                            <input
                                data-testid="register-username"
                                type="text"
                                value={form.username}
                                onChange={update("username")}
                                required
                                minLength={3}
                                pattern="[a-zA-Z0-9_]+"
                                className="mt-2 w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-accent-vermillion focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="font-mono text-xs uppercase tracking-widest text-zinc-500">Email</label>
                            <input
                                data-testid="register-email"
                                type="email"
                                value={form.email}
                                onChange={update("email")}
                                required
                                className="mt-2 w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-accent-vermillion focus:outline-none"
                            />
                        </div>
                        <div>
                            <label className="font-mono text-xs uppercase tracking-widest text-zinc-500">Palavra-passe</label>
                            <input
                                data-testid="register-password"
                                type="password"
                                value={form.password}
                                onChange={update("password")}
                                required
                                minLength={6}
                                className="mt-2 w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:border-accent-vermillion focus:outline-none"
                            />
                        </div>
                        {error && <div data-testid="register-error" className="text-sm text-accent-vermillion font-mono">{error}</div>}
                        <button
                            type="submit"
                            disabled={busy}
                            data-testid="register-submit"
                            className="w-full bg-accent-vermillion text-white font-heading font-semibold uppercase tracking-wide text-sm py-3.5 rounded-full hover:bg-[#A78BFA] transition disabled:opacity-50 active:scale-[0.98] glow-vermillion"
                        >
                            {busy ? "A criar..." : "Criar conta"}
                        </button>
                    </form>

                    <p className="mt-8 font-mono text-sm text-zinc-500">
                        Já tens conta?{" "}
                        <Link to="/login" data-testid="goto-login" className="text-accent-vermillion hover:underline">
                            Entrar
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
