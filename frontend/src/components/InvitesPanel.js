// =============================================================================
// Lusorae — Invites Panel (FASE 3)
// =============================================================================
// Mostra os códigos de convite do utilizador + progresso para badge fundador.
// 3 convites aceites = badge fundador desbloqueada.
// =============================================================================
import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { Sparkles, Copy, Check, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { PT } from "../theme/editorial";

export function InvitesPanel() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [copiedCode, setCopiedCode] = useState(null);

    useEffect(() => {
        (async () => {
            try {
                // garantir que existem códigos (idempotente)
                await api.post("/invites/generate").catch(() => {});
                const r = await api.get("/invites/mine");
                setData(r.data);
            } catch {
                setData({ invites: [], accepted_count: 0, founder_threshold: 3, founder_unlocked: false });
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const copy = async (code) => {
        const link = `${window.location.origin}/register?invite=${code}`;
        try {
            await navigator.clipboard.writeText(link);
            setCopiedCode(code);
            toast.success("Link copiado");
            setTimeout(() => setCopiedCode(null), 2000);
        } catch {
            toast.error("Não foi possível copiar.");
        }
    };

    if (loading) {
        return (
            <div className="space-y-3" data-testid="invites-loading">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="h-14 rounded-2xl bg-black/[0.04] animate-pulse" />
                ))}
            </div>
        );
    }

    const accepted = data?.accepted_count || 0;
    const threshold = data?.founder_threshold || 3;
    const founder = !!data?.founder_unlocked;
    const progress = Math.min(100, (accepted / threshold) * 100);

    return (
        <div data-testid="invites-panel" className="space-y-4">
            {/* Founder progress */}
            <div
                className="rounded-2xl p-4"
                style={{
                    background: founder ? PT.gold + "20" : "#fff",
                    border: `1px solid ${founder ? PT.gold + "55" : "rgba(10,10,10,0.08)"}`,
                }}
            >
                <div className="flex items-center gap-2">
                    <Sparkles size={14} style={{ color: PT.gold }} strokeWidth={2.5} />
                    <span className="font-mono text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: "rgba(10,10,10,0.55)" }}>
                        Badge fundador
                    </span>
                </div>
                <p className="font-black tracking-tight mt-1.5" style={{ fontSize: 17, color: PT.ink }}>
                    {founder ? (
                        <><span style={{ color: PT.gold, fontStyle: "italic" }}>Desbloqueada</span>. Obrigado.</>
                    ) : (
                        <>Convida <span style={{ color: PT.red }}>{threshold} amigos</span> e ganha a badge.</>
                    )}
                </p>
                <div className="mt-3 flex items-center gap-3">
                    <div className="flex-1 h-1.5 rounded-full bg-black/[0.06] overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${progress}%`, background: founder ? PT.gold : PT.ink }}
                            data-testid="invites-progress"
                        />
                    </div>
                    <span className="font-mono text-[11px] font-bold tabular-nums" style={{ color: PT.ink }} data-testid="invites-progress-count">
                        {accepted} / {threshold}
                    </span>
                </div>
            </div>

            {/* Códigos */}
            <div>
                <h4 className="font-mono text-[10px] font-bold uppercase tracking-[0.2em] mb-2" style={{ color: "rgba(10,10,10,0.55)" }}>
                    Os teus convites
                </h4>
                <ul className="space-y-2">
                    {(data?.invites || []).map((inv) => {
                        const used = (inv.used_by || []).length > 0;
                        const isCopied = copiedCode === inv.code;
                        return (
                            <li
                                key={inv.id}
                                data-testid={`invite-row-${inv.code}`}
                                className="flex items-center gap-3 p-3 rounded-2xl"
                                style={{
                                    background: "#fff",
                                    border: `1px solid ${used ? PT.green + "33" : "rgba(10,10,10,0.06)"}`,
                                    boxShadow: "0 1px 2px rgba(10,10,10,0.02)",
                                }}
                            >
                                <div
                                    className="grid place-items-center shrink-0"
                                    style={{
                                        width: 36, height: 36, borderRadius: 10,
                                        background: used ? PT.green : "rgba(10,10,10,0.06)",
                                        color: used ? "#fff" : PT.ink,
                                    }}
                                >
                                    <UserPlus size={16} strokeWidth={2.4} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-mono text-[14px] font-bold tracking-wider" style={{ color: PT.ink }}>
                                        {inv.code}
                                    </div>
                                    <div className="text-[11px] font-mono uppercase tracking-wider" style={{ color: "rgba(10,10,10,0.45)" }}>
                                        {used ? `${(inv.used_by || []).length} aceite` : "Disponível"}
                                    </div>
                                </div>
                                <button
                                    onClick={() => copy(inv.code)}
                                    data-testid={`invite-copy-${inv.code}`}
                                    className="px-3 py-1.5 rounded-full text-[11.5px] font-bold uppercase tracking-wider inline-flex items-center gap-1.5 tap-shrink"
                                    style={{
                                        background: isCopied ? PT.green : PT.ink,
                                        color: "#fff",
                                        border: "1px solid " + (isCopied ? PT.green : PT.ink),
                                    }}
                                >
                                    {isCopied ? <><Check size={11} strokeWidth={2.6} /> copiado</> : <><Copy size={11} strokeWidth={2.6} /> copiar link</>}
                                </button>
                            </li>
                        );
                    })}
                </ul>
                {(data?.invites || []).length === 0 && (
                    <p className="text-[12.5px] text-center py-4 font-medium" style={{ color: "rgba(10,10,10,0.5)" }}>
                        Ainda não tens códigos. Recarrega a página.
                    </p>
                )}
            </div>
        </div>
    );
}
