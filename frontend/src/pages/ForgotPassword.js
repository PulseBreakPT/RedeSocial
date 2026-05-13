import { useState } from "react";
import { Link } from "react-router-dom";
import { api, formatApiError } from "../lib/api";

export default function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [token, setToken] = useState("");
    const [password, setPassword] = useState("");
    const [step, setStep] = useState("request");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const [info, setInfo] = useState("");

    const request = async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
            const { data } = await api.post("/auth/forgot-password", { email });
            setInfo(data.dev_token
                ? `Token de redefinição: ${data.dev_token} (dev)`
                : "Se o email existir, um link foi enviado.");
            if (data.dev_token) setToken(data.dev_token);
            setStep("reset");
        } catch (err) {
            setError(formatApiError(err));
        } finally {
            setBusy(false);
        }
    };

    const reset = async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
            await api.post("/auth/reset-password", { token, password });
            setInfo("Palavra-passe redefinida com sucesso. Podes entrar.");
            setStep("done");
        } catch (err) {
            setError(formatApiError(err));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="min-h-screen grid place-items-center p-8">
            <div className="max-w-sm w-full">
                <h1 className="font-heading text-3xl font-bold tracking-tight">Recuperar palavra-passe</h1>
                <p className="font-mono text-xs uppercase tracking-widest text-zinc-500 mt-2">redefinir acesso</p>

                {step === "request" && (
                    <form onSubmit={request} className="mt-8 space-y-5" data-testid="forgot-form">
                        <div>
                            <label className="font-mono text-xs uppercase tracking-widest text-zinc-500">Email</label>
                            <input
                                data-testid="forgot-email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="mt-2 w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 focus:border-accent-vermillion outline-none"
                            />
                        </div>
                        {error && <div className="text-sm text-accent-vermillion font-mono">{error}</div>}
                        <button
                            type="submit" disabled={busy}
                            data-testid="forgot-submit"
                            className="w-full bg-accent-vermillion text-white font-heading font-semibold uppercase tracking-wide text-sm py-3.5 rounded-full hover:bg-[#A78BFA] transition disabled:opacity-50 active:scale-[0.98]"
                        >
                            {busy ? "A enviar..." : "Enviar"}
                        </button>
                    </form>
                )}

                {step === "reset" && (
                    <form onSubmit={reset} className="mt-8 space-y-5" data-testid="reset-form">
                        {info && <div className="text-xs font-mono text-emerald-400 break-all">{info}</div>}
                        <div>
                            <label className="font-mono text-xs uppercase tracking-widest text-zinc-500">Token</label>
                            <input
                                data-testid="reset-token"
                                value={token}
                                onChange={(e) => setToken(e.target.value)}
                                required
                                className="mt-2 w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 focus:border-accent-vermillion outline-none font-mono text-xs"
                            />
                        </div>
                        <div>
                            <label className="font-mono text-xs uppercase tracking-widest text-zinc-500">Nova palavra-passe</label>
                            <input
                                data-testid="reset-password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required minLength={6}
                                className="mt-2 w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 focus:border-accent-vermillion outline-none"
                            />
                        </div>
                        {error && <div className="text-sm text-accent-vermillion font-mono">{error}</div>}
                        <button
                            type="submit" disabled={busy}
                            data-testid="reset-submit"
                            className="w-full bg-accent-vermillion text-white font-heading font-semibold uppercase tracking-wide text-sm py-3.5 rounded-full hover:bg-[#A78BFA] transition disabled:opacity-50 active:scale-[0.98]"
                        >
                            {busy ? "A redefinir..." : "Redefinir"}
                        </button>
                    </form>
                )}

                {step === "done" && (
                    <div className="mt-8 space-y-4">
                        <p className="text-emerald-400 font-mono text-sm">{info}</p>
                        <Link to="/login" className="block text-center w-full bg-accent-vermillion text-white font-heading font-semibold uppercase tracking-wide text-sm py-3.5 rounded-full hover:bg-[#A78BFA] transition">
                            Ir para login
                        </Link>
                    </div>
                )}

                <p className="mt-8 font-mono text-sm text-zinc-500">
                    <Link to="/login" className="text-accent-vermillion hover:underline">← Voltar para entrar</Link>
                </p>
            </div>
        </div>
    );
}
