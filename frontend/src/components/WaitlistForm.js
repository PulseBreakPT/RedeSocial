// =============================================================================
// Lusorae — Waitlist Form (FASE 3)
// =============================================================================
// Captura email + @handle pré-lançamento. Idempotente. Mostra posição
// (#142 na fila) e feedback de disponibilidade do handle em tempo real.
// =============================================================================
import { useEffect, useRef, useState } from "react";
import { api } from "../lib/api";
import { AtSign, Mail, ArrowRight, Check, X, Loader2, Sparkles } from "lucide-react";
import { PT } from "../theme/editorial";

export function WaitlistForm({ compact = false }) {
    const [email, setEmail] = useState("");
    const [handle, setHandle] = useState("");
    const [handleStatus, setHandleStatus] = useState("idle"); // idle | checking | available | taken | invalid
    const [submitting, setSubmitting] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState("");
    const abortRef = useRef(null);

    useEffect(() => {
        const h = handle.trim().toLowerCase().replace(/^@/, "");
        if (abortRef.current) {
            try { abortRef.current.abort(); } catch { /* noop */ }
            abortRef.current = null;
        }
        if (!h) { setHandleStatus("idle"); return; }
        if (!/^[a-z0-9_]{3,20}$/.test(h)) { setHandleStatus("invalid"); return; }
        setHandleStatus("checking");
        const ctrl = new AbortController();
        abortRef.current = ctrl;
        const t = setTimeout(async () => {
            try {
                const { data } = await api.get(`/waitlist/check?handle=${encodeURIComponent(h)}`, { signal: ctrl.signal });
                if (data.available) setHandleStatus("available");
                else setHandleStatus(data.reason === "invalid" ? "invalid" : "taken");
            } catch (e) {
                if (e?.name !== "CanceledError" && e?.code !== "ERR_CANCELED") {
                    setHandleStatus("idle");
                }
            }
        }, 360);
        return () => { clearTimeout(t); ctrl.abort(); };
    }, [handle]);

    const submit = async (e) => {
        e.preventDefault();
        setError("");
        if (!/^\S+@\S+\.\S+$/.test(email)) {
            setError("Email inválido.");
            return;
        }
        if (handle && handleStatus !== "available") {
            setError("Confirma o @handle ou deixa em branco.");
            return;
        }
        setSubmitting(true);
        try {
            const { data } = await api.post("/waitlist", {
                email: email.trim().toLowerCase(),
                handle: handle.trim().toLowerCase().replace(/^@/, "") || null,
            });
            setResult(data);
        } catch (e2) {
            setError(e2?.response?.data?.detail || "Não foi possível reservar. Tenta de novo.");
        } finally {
            setSubmitting(false);
        }
    };

    if (result) {
        return (
            <div
                data-testid="waitlist-success"
                className="rounded-3xl p-6 sm:p-7"
                style={{
                    background: "#fff",
                    border: `1.5px solid ${PT.green}33`,
                    boxShadow: `0 0 0 4px ${PT.green}10, 0 20px 50px -20px rgba(10,10,10,0.2)`,
                }}
            >
                <div className="flex items-start gap-3">
                    <div className="grid place-items-center shrink-0"
                         style={{ width: 44, height: 44, borderRadius: 999, background: PT.green, color: "#fff" }}>
                        <Check size={22} strokeWidth={2.6} />
                    </div>
                    <div>
                        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: "rgba(10,10,10,0.55)" }}>
                            Estás na lista
                        </p>
                        <h3 className="font-black tracking-tight mt-1" style={{ fontSize: 22, color: PT.ink }}>
                            És o #{result.position} na fila.
                        </h3>
                        <p className="text-[14px] mt-2 font-medium" style={{ color: "rgba(10,10,10,0.65)" }}>
                            Vamos avisar-te quando a tua vez chegar. Sem spam, prometido.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <form
            onSubmit={submit}
            data-testid="waitlist-form"
            className="rounded-3xl p-5 sm:p-6"
            style={{
                background: "#fff",
                border: "1px solid rgba(10,10,10,0.08)",
                boxShadow: "0 1px 2px rgba(10,10,10,0.03), 0 30px 80px -30px rgba(10,10,10,0.18)",
            }}
        >
            <div className="flex items-center gap-2 mb-3">
                <Sparkles size={14} style={{ color: PT.gold }} strokeWidth={2.4} />
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: "rgba(10,10,10,0.55)" }}>
                    Pré-lançamento · Reserva o teu @
                </span>
            </div>

            {!compact && (
                <h3 className="font-black tracking-tight leading-tight mb-4" style={{ fontSize: 24, color: PT.ink }}>
                    Junta-te à <span style={{ color: PT.red, fontStyle: "italic" }}>BETA</span>.
                </h3>
            )}

            <div className="space-y-2.5">
                <div className="relative">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none" style={{ color: "rgba(10,10,10,0.4)" }}>
                        <Mail size={15} />
                    </div>
                    <input
                        data-testid="waitlist-email"
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="o-teu@email.pt"
                        autoComplete="email"
                        inputMode="email"
                        className="w-full pl-10 pr-3 py-3 rounded-xl text-[14px] font-medium outline-none transition"
                        style={{
                            background: "#fff",
                            border: "1.5px solid rgba(10,10,10,0.10)",
                            color: PT.ink,
                        }}
                    />
                </div>

                <div className="relative">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none" style={{ color: "rgba(10,10,10,0.4)" }}>
                        <AtSign size={15} />
                    </div>
                    <input
                        data-testid="waitlist-handle"
                        type="text"
                        value={handle}
                        onChange={(e) => setHandle(e.target.value.trim())}
                        placeholder="o_teu_handle (opcional)"
                        autoComplete="off"
                        autoCapitalize="off"
                        spellCheck={false}
                        maxLength={20}
                        className="w-full pl-10 pr-10 py-3 rounded-xl text-[14px] font-medium outline-none transition"
                        style={{
                            background: "#fff",
                            border: `1.5px solid ${handleStatus === "available" ? PT.green : handleStatus === "taken" || handleStatus === "invalid" ? PT.red : "rgba(10,10,10,0.10)"}`,
                            color: PT.ink,
                        }}
                    />
                    <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
                        {handleStatus === "checking" && <Loader2 size={15} className="animate-spin" style={{ color: "rgba(10,10,10,0.4)" }} />}
                        {handleStatus === "available" && <Check size={16} style={{ color: PT.green }} strokeWidth={2.6} />}
                        {(handleStatus === "taken" || handleStatus === "invalid") && <X size={16} style={{ color: PT.red }} strokeWidth={2.6} />}
                    </div>
                </div>

                {handle && handleStatus === "taken" && (
                    <p className="text-[11.5px] font-mono font-bold" style={{ color: PT.red }} data-testid="handle-taken-msg">
                        Esse @handle já está reservado. Escolhe outro.
                    </p>
                )}
                {handle && handleStatus === "invalid" && (
                    <p className="text-[11.5px] font-mono font-bold" style={{ color: PT.red }}>
                        3-20 caracteres. Letras, números e _.
                    </p>
                )}
            </div>

            {error && (
                <p data-testid="waitlist-error" className="mt-3 text-[12.5px] font-mono font-bold" style={{ color: PT.red }}>
                    {error}
                </p>
            )}

            <button
                type="submit"
                data-testid="waitlist-submit"
                disabled={submitting}
                className="w-full mt-4 px-5 py-3 rounded-xl text-[13px] font-bold uppercase tracking-wider inline-flex items-center justify-center gap-2 tap-shrink transition"
                style={{
                    background: PT.ink, color: "#fff", border: "1px solid " + PT.ink,
                    opacity: submitting ? 0.6 : 1,
                }}
            >
                {submitting ? (
                    <><Loader2 size={14} className="animate-spin" /> A reservar…</>
                ) : (
                    <>Reservar o meu lugar <ArrowRight size={14} strokeWidth={2.6} /></>
                )}
            </button>
            <p className="mt-3 text-[11px] font-medium leading-relaxed text-center" style={{ color: "rgba(10,10,10,0.5)" }}>
                Sem cartão. Sem spam. Avisamos-te assim que houver vaga.
            </p>
        </form>
    );
}
