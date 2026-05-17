import { Eye, Lock, Loader2, ShieldOff } from "lucide-react";
import { api, toastApiError } from "../lib/api";
import { Avatar } from "../components/Avatar";
import { Link } from "react-router-dom";
import { PageShell, PageHero, Grid, Empty } from "../components/PageShell";
import { smartTime, fullTime } from "../lib/time";
import { toast } from "sonner";
import { useEffect, useState } from "react";

export default function Visitors() {
    const [data, setData] = useState({ track_visits: true, visitors: [] });
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);

    async function load() {
        setLoading(true);
        try {
            const r = await api.get("/users/me/visitors");
            // Normalize to single canonical field name
            setData({
                track_visits: r.data.track_visits ?? r.data.enabled ?? true,
                visitors: r.data.visitors || [],
            });
        } catch (e) {
            toastApiError(e);
        } finally {
            setLoading(false);
        }
    }
    useEffect(() => { load(); }, []);

    async function toggleTracking() {
        // B-046 — optimistic UI: flip immediately, rollback on error
        const next = !data.track_visits;
        const snapshot = data;
        setData((d) => ({ ...d, track_visits: next }));
        setBusy(true);
        try {
            const r = await api.post("/users/me/visitors/settings", { track_visits: next });
            toast.success(r.data.track_visits ? "A registar visitas" : "Visitas desativadas");
            // Sync the visitors list (server may have purged/added entries)
            await load();
        } catch (e) {
            setData(snapshot);  // rollback
            toastApiError(e);
        } finally {
            setBusy(false);
        }
    }

    return (
        <PageShell max="max-w-5xl">
            <PageHero
                icon={Eye}
                title="Visitas ao perfil"
                subtitle="Últimos 30 dias · só tu vês esta lista"
                badge={`${data.visitors?.length || 0} pessoas`}
                actions={
                    <button
                        onClick={toggleTracking}
                        disabled={busy}
                        className="px-3 py-1.5 rounded-full border border-black/15 text-xs font-mono hover:border-black/40 flex items-center gap-1.5"
                        data-testid="visitors-toggle"
                    >
                        {busy ? <Loader2 size={12} className="animate-spin" /> : <ShieldOff size={12} />}
                        {data.track_visits ? "Desativar" : "Ativar"}
                    </button>
                }
            />
            {loading ? (
                <div className="text-sm font-mono text-black/50 py-12 text-center"><Loader2 size={14} className="animate-spin inline" /> A carregar…</div>
            ) : !data.track_visits ? (
                <Empty
                    icon={Lock}
                    title="Visitas desativadas"
                    body="Ativa para começares a ver quem espreita o teu perfil."
                />
            ) : data.visitors.length === 0 ? (
                <Empty
                    icon={Eye}
                    title="Ninguém ainda"
                    body="Publica algo, partilha o teu perfil — vais começar a aparecer aqui."
                />
            ) : (
                <Grid cols={3} gap={3} data-testid="visitors-list">
                    {data.visitors.map((v) => (
                        <Link
                            key={v.id}
                            to={`/u/${v.username}`}
                            className="flex items-center gap-3 p-3 rounded-2xl border border-black/[0.08] bg-white hover:border-black/25 hover:shadow-md transition"
                            data-testid={`visitor-${v.username}`}
                        >
                            <Avatar user={v} size={42} showOnline />
                            <div className="flex-1 min-w-0">
                                <div className="font-heading font-semibold text-sm truncate">{v.name}</div>
                                <div className="text-xs font-mono text-black/45 truncate">@{v.username}</div>
                                <div className="text-[10px] font-mono text-black/40 mt-0.5" title={fullTime(v.viewed_at)}>
                                    {smartTime(v.viewed_at)}
                                </div>
                            </div>
                        </Link>
                    ))}
                </Grid>
            )}
        </PageShell>
    );
}
