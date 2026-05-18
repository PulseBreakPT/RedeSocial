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
                ? `Token de recuperação: ${data.dev_token} (dev)`
                : "Se o email existir, recebes um link em instantes.");
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
            setInfo("Palavra-passe alterada. Já podes entrar.");
            setStep("done");
        } catch (err) {
            setError(formatApiError(err));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="min-h-screen grid place-items-center bg-paper grain isolate relative p-6 lg:p-12 overflow-hidden">
            <div
                className="absolute -top-32 -right-24 w-[520px] h-[520px] rounded-full opacity-40 pointer-events-none"
                style={{ background: "radial-gradient(circle, rgba(212,212,220,0.6), transparent 65%)" }}
            />
            <div
                className="absolute -bottom-40 -left-32 w-[640px] h-[640px] rounded-full opacity-30 pointer-events-none"
                style={{ background: "radial-gradient(circle, rgba(106,168,230,0.18), transparent 60%)" }}
            />
            <div className="max-w-sm w-full relative">
                <div className="text-center lg:text-left mb-10">
                    <h1 className="font-display text-[36px] leading-none tracking-tight">
                        <span className="silver-foil">◆</span> lusorae
                    </h1>
                </div>
                <h2 className="font-display text-[34px] tracking-tight leading-[1.05]">Recuperar acesso</h2>
                <p className="text-black/55 text-[14px] mt-2">
                    {step === "request" && "Indica o email da tua conta para receberes um link."}
                    {step === "reset" && "Define uma nova palavra-passe."}
                    {step === "done" && "Tudo pronto."}
                </p>

                {step === "request" && (
                    <form onSubmit={request} className="mt-8 space-y-4" data-testid="forgot-form">
                        <div>
                            <label className="text-[12px] font-medium text-black/65 mb-1.5 block">Email</label>
                            <input
                                data-testid="forgot-email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                placeholder="tu@exemplo.com"
                                className="w-full bg-[#fafafa] border border-black/[0.10] rounded-xl px-4 py-3 text-[15px] text-black placeholder:text-black/35 focus:border-black/40 focus:bg-white focus:outline-none transition"
                            />
                        </div>
                        {error && <div className="text-sm text-red-soft font-medium">{error}</div>}
                        <button
                            type="submit" disabled={busy}
                            data-testid="forgot-submit"
                            className="btn-obsidian w-full text-[14px] py-3.5 disabled:opacity-50 mt-2"
                        >
                            {busy ? "A enviar…" : "Enviar link"}
                        </button>
                    </form>
                )}

                {step === "reset" && (
                    <form onSubmit={reset} className="mt-8 space-y-4" data-testid="reset-form">
                        {info && (
                            <div className="text-xs text-green-soft break-all bg-green-soft-bg border border-green-soft/30 rounded-lg px-3 py-2 font-medium">
                                {info}
                            </div>
                        )}
                        <div>
                            <label className="text-[12px] font-medium text-black/65 mb-1.5 block">Token</label>
                            <input
                                data-testid="reset-token"
                                value={token}
                                onChange={(e) => setToken(e.target.value)}
                                required
                                className="w-full bg-[#fafafa] border border-black/[0.10] rounded-xl px-4 py-3 text-black placeholder:text-black/35 focus:border-black/40 focus:bg-white focus:outline-none transition font-mono text-xs"
                            />
                        </div>
                        <div>
                            <label className="text-[12px] font-medium text-black/65 mb-1.5 block">Nova palavra-passe</label>
                            <input
                                data-testid="reset-password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required minLength={6}
                                placeholder="Mínimo 6 caracteres"
                                className="w-full bg-[#fafafa] border border-black/[0.10] rounded-xl px-4 py-3 text-[15px] text-black placeholder:text-black/35 focus:border-black/40 focus:bg-white focus:outline-none transition"
                            />
                        </div>
                        {error && <div className="text-sm text-red-soft font-medium">{error}</div>}
                        <button
                            type="submit" disabled={busy}
                            data-testid="reset-submit"
                            className="btn-obsidian w-full text-[14px] py-3.5 disabled:opacity-50 mt-2"
                        >
                            {busy ? "A guardar…" : "Definir nova palavra-passe"}
                        </button>
                    </form>
                )}

                {step === "done" && (
                    <div className="mt-8 space-y-4">
                        <div className="text-sm text-green-soft bg-green-soft-bg border border-green-soft/30 rounded-lg px-3 py-3 font-medium">
                            {info}
                        </div>
                        <Link to="/login" className="btn-obsidian w-full text-[14px] py-3.5 inline-flex items-center justify-center">
                            Ir para entrar
                        </Link>
                    </div>
                )}

                <p className="mt-8 text-[13px] text-black/55 text-center lg:text-left">
                    <Link to="/login" className="text-black ink-link font-semibold">← Voltar para entrar</Link>
                </p>
            </div>
        </div>
    );
}
