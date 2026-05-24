import { useEffect, useState } from "react";
import { Sparkles, ExternalLink, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { usePremium } from "../context/PremiumContext";
import { api } from "../lib/api";
import { toast } from "sonner";

const PLAN_LABEL = { free: "Gratuito", plus: "Lusorae Plus", aura: "Lusorae Aura" };

function fmtDate(iso) {
    try { return new Date(iso).toLocaleDateString("pt-PT", { day: "2-digit", month: "long", year: "numeric" }); }
    catch { return ""; }
}

/**
 * PremiumStatusCard — estado da subscrição + gestão (faturas, portal Stripe).
 * Tudo real: lê de /premium/status e /premium/invoices; gerir abre o Customer
 * Portal seguro do Stripe. Calmo, sem venda agressiva.
 */
export function PremiumStatusCard() {
    const { plan, status, renews_at, cancel_at_period_end, isPremium, early_supporter,
            billing_available, openPortal, restore } = usePremium();
    const [invoices, setInvoices] = useState([]);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!isPremium) return;
        let alive = true;
        api.get("/premium/invoices").then(({ data }) => { if (alive) setInvoices(data || []); }).catch(() => {});
        return () => { alive = false; };
    }, [isPremium]);

    const manage = async () => {
        setBusy(true);
        try { await openPortal(); }
        catch { toast.error("Não foi possível abrir a gestão de subscrição."); }
        finally { setBusy(false); }
    };

    return (
        <div className="card-lux p-5" data-testid="premium-status-card">
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="type-overline mb-1 inline-flex items-center gap-1.5">
                        <Sparkles size={12} /> Subscrição
                    </p>
                    <h3 className="font-display text-[20px] tracking-tight leading-none">
                        {PLAN_LABEL[plan] || "Gratuito"}
                    </h3>
                    {isPremium ? (
                        <p className="text-[12.5px] text-black/55 mt-1.5">
                            {status === "past_due" || status === "grace"
                                ? "Pagamento por regularizar — acesso mantido durante o período de graça."
                                : cancel_at_period_end
                                    ? `Termina a ${fmtDate(renews_at)}`
                                    : renews_at ? `Renova a ${fmtDate(renews_at)}` : "Ativa"}
                            {early_supporter && " · apoiante inicial"}
                        </p>
                    ) : (
                        <p className="text-[12.5px] text-black/55 mt-1.5">
                            Aprofunda a tua presença com o Plus ou o Aura.
                        </p>
                    )}
                </div>
                <div className="flex-shrink-0">
                    {isPremium ? (
                        billing_available && (
                            <button onClick={manage} disabled={busy} data-testid="premium-manage-btn"
                                className="text-[12.5px] font-heading font-medium rounded-full px-4 h-9 border border-black/[0.12] hover:bg-black/[0.03] transition inline-flex items-center gap-1.5">
                                Gerir <ExternalLink size={13} />
                            </button>
                        )
                    ) : (
                        <Link to="/premium" data-testid="premium-upgrade-btn"
                            className="text-[12.5px] font-heading font-medium rounded-full px-4 h-9 btn-obsidian inline-flex items-center gap-1.5">
                            Ver planos
                        </Link>
                    )}
                </div>
            </div>

            {isPremium && invoices.length > 0 && (
                <div className="mt-4 pt-4 hairline-t">
                    <p className="type-overline mb-2">Faturas</p>
                    <ul className="space-y-1.5">
                        {invoices.slice(0, 6).map((inv) => (
                            <li key={inv.id} className="flex items-center justify-between text-[12.5px]">
                                <span className="text-black/55">{fmtDate(inv.created_at)}</span>
                                <span className="flex items-center gap-3">
                                    <span className="font-mono">€{Number(inv.amount || 0).toFixed(2)}</span>
                                    {inv.hosted_invoice_url && (
                                        <a href={inv.hosted_invoice_url} target="_blank" rel="noreferrer"
                                            className="text-[var(--eu-500)] hover:underline">ver</a>
                                    )}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {isPremium && billing_available && (
                <button onClick={() => restore()} title="Restaurar subscrição"
                    className="mt-3 text-[11px] font-mono text-black/40 hover:text-black/70 inline-flex items-center gap-1">
                    <RefreshCw size={11} /> restaurar
                </button>
            )}
        </div>
    );
}

export default PremiumStatusCard;
