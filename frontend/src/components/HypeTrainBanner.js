import { useEffect, useState } from "react";
import { Rocket, Loader2 } from "lucide-react";
import { api, toastApiError } from "../lib/api";
import { toast } from "sonner";

// Hype Train banner — visible on Community page
export function HypeTrainBanner({ slug }) {
    const [hype, setHype] = useState(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);

    async function load() {
        setLoading(true);
        try {
            const r = await api.get(`/communities/${slug}/hype/active`);
            setHype(r.data);
        } catch (e) {
            // silent
        } finally {
            setLoading(false);
        }
    }
    useEffect(() => { if (slug) load(); }, [slug]);

    // refresh hype every 15s when active
    useEffect(() => {
        if (!hype) return;
        const t = setInterval(load, 15000);
        return () => clearInterval(t);
    }, [hype?.id]);

    async function join() {
        setBusy(true);
        try {
            const r = await api.post(`/communities/${slug}/hype`);
            setHype(r.data);
            toast.success(r.data.count === 1 ? "Hype Train iniciado!" : "Entraste no Hype Train");
        } catch (e) {
            toastApiError(e);
        } finally {
            setBusy(false);
        }
    }

    if (loading) return null;

    // No active hype → show "start" button
    if (!hype) {
        return (
            <div className="rounded-2xl border-2 border-dashed border-orange-300/50 bg-orange-50/30 p-3 mb-3 flex items-center justify-between" data-testid="hype-empty">
                <div className="flex items-center gap-2">
                    <Rocket size={16} className="text-orange-500" />
                    <span className="text-xs font-mono text-black/65">Nenhum Hype Train ativo · 25 participantes em 30 min para completar</span>
                </div>
                <button
                    onClick={join}
                    disabled={busy}
                    className="px-3 py-1.5 rounded-full bg-orange-500 text-white text-xs font-mono hover:bg-orange-600 disabled:opacity-40 flex items-center gap-1.5"
                    data-testid="hype-start"
                >
                    {busy && <Loader2 size={12} className="animate-spin" />}
                    Iniciar
                </button>
            </div>
        );
    }

    const minutesLeft = Math.max(0, Math.round((new Date(hype.expires_at) - new Date()) / 60000));
    return (
        <div
            className="rounded-2xl p-3 mb-3 relative overflow-hidden"
            style={{ background: "linear-gradient(135deg, #fb923c 0%, #ec4899 100%)" }}
            data-testid="hype-active"
        >
            <div className="flex items-center justify-between mb-2 text-white">
                <div className="flex items-center gap-2">
                    <Rocket size={18} className="animate-pulse" />
                    <span className="font-heading font-semibold text-sm">Hype Train · {hype.count}/{hype.target}</span>
                </div>
                <span className="font-mono text-[11px] opacity-80">{minutesLeft}m restantes</span>
            </div>
            <div className="w-full h-2 rounded-full bg-white/20 overflow-hidden">
                <div
                    className="h-full bg-white transition-all duration-500"
                    style={{ width: `${hype.percent}%` }}
                />
            </div>
            <button
                onClick={join}
                disabled={busy}
                className="mt-2 w-full px-3 py-1.5 rounded-full bg-white text-orange-600 text-xs font-mono font-semibold hover:bg-white/90 disabled:opacity-40 flex items-center justify-center gap-1.5"
                data-testid="hype-join"
            >
                {busy && <Loader2 size={12} className="animate-spin" />}
                Entrar no comboio
            </button>
        </div>
    );
}
