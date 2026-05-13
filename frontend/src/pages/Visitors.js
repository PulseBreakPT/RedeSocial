import { useEffect, useState } from "react";
import { Eye, Lock, Loader2, ShieldOff } from "lucide-react";
import { api, toastApiError } from "../lib/api";
import { Avatar } from "../components/Avatar";
import { Link } from "react-router-dom";
import { PageHeader } from "../components/PageHeader";
import { smartTime, fullTime } from "../lib/time";
import { toast } from "sonner";

export default function Visitors() {
    const [data, setData] = useState({ enabled: true, visitors: [] });
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);

    async function load() {
        setLoading(true);
        try {
            const r = await api.get("/users/me/visitors");
            setData(r.data);
        } catch (e) {
            toastApiError(e);
        } finally {
            setLoading(false);
        }
    }
    useEffect(() => { load(); }, []);

    async function toggleTracking() {
        setBusy(true);
        try {
            const r = await api.post("/users/me/visitors/settings", { track_visits: !data.enabled });
            toast.success(r.data.track_visits ? "A registar visitas" : "Visitas desativadas");
            await load();
        } catch (e) {
            toastApiError(e);
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="max-w-2xl mx-auto px-4 py-6">
            <PageHeader
                title="Visitas ao perfil"
                subtitle="Últimos 30 dias · só tu vês esta lista"
                action={
                    <button
                        onClick={toggleTracking}
                        disabled={busy}
                        className="px-3 py-1.5 rounded-full border border-black/15 text-xs font-mono hover:border-black/40 flex items-center gap-1.5"
                        data-testid="visitors-toggle"
                    >
                        {busy ? <Loader2 size={12} className="animate-spin" /> : <ShieldOff size={12} />}
                        {data.enabled ? "Desativar" : "Ativar"}
                    </button>
                }
            />
            {loading ? (
                <div className="text-sm font-mono text-black/50 py-12 text-center"><Loader2 size={14} className="animate-spin inline" /> A carregar…</div>
            ) : !data.enabled ? (
                <div className="rounded-2xl border border-black/[0.08] bg-white p-8 text-center" data-testid="visitors-disabled">
                    <Lock className="mx-auto text-black/30 mb-2" size={28} />
                    <h3 className="font-heading font-semibold mb-1">Visitas desativadas</h3>
                    <p className="text-sm font-mono text-black/55">Ativa para começares a ver quem espreita o teu perfil.</p>
                </div>
            ) : data.visitors.length === 0 ? (
                <div className="rounded-2xl border border-black/[0.08] bg-white p-8 text-center" data-testid="visitors-empty">
                    <Eye className="mx-auto text-black/30 mb-2" size={28} />
                    <h3 className="font-heading font-semibold mb-1">Ninguém ainda</h3>
                    <p className="text-sm font-mono text-black/55">Publica algo, partilha o teu perfil — vais começar a aparecer aqui.</p>
                </div>
            ) : (
                <div className="space-y-2" data-testid="visitors-list">
                    {data.visitors.map((v) => (
                        <Link
                            key={v.id}
                            to={`/u/${v.username}`}
                            className="flex items-center gap-3 p-3 rounded-xl border border-black/[0.08] bg-white hover:border-black/25 transition"
                            data-testid={`visitor-${v.username}`}
                        >
                            <Avatar user={v} size={42} showOnline />
                            <div className="flex-1 min-w-0">
                                <div className="font-heading font-semibold text-sm truncate">{v.name}</div>
                                <div className="text-xs font-mono text-black/45 truncate">@{v.username}</div>
                            </div>
                            <span className="text-[11px] font-mono text-black/40" title={fullTime(v.viewed_at)}>
                                {smartTime(v.viewed_at)}
                            </span>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
