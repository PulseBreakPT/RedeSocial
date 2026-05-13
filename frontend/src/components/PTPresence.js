import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles, Wind } from "lucide-react";
import { api } from "../lib/api";
import { Avatar } from "./Avatar";

/**
 * F4.1 — Middle-class creator boost.
 * Shows up to 8 new creators (< 30 days, < 500 followers), ranked by place affinity.
 * Renders as a horizontally scrollable strip on Feed/Explore.
 */
export function NewVoicesStrip() {
    const [voices, setVoices] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const { data } = await api.get("/discover/new_voices");
                if (!cancelled) setVoices(data.voices || []);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    if (!loading && voices.length === 0) return null;

    return (
        <section
            data-testid="new-voices-strip"
            className="mt-3 mb-2 rounded-2xl border border-black/[0.08] p-4 bg-white"
        >
            <div className="flex items-baseline justify-between mb-3">
                <h2 className="text-[10.5px] uppercase tracking-[0.14em] text-black/45 font-mono">
                    <Sparkles size={11} className="inline -mt-0.5 mr-1" />
                    Vozes novas perto de ti
                </h2>
                <Link
                    to="/diaspora"
                    className="text-[11.5px] font-medium text-black/55 hover:text-black underline-offset-2 hover:underline"
                >
                    ver mais
                </Link>
            </div>
            {loading ? (
                <div className="text-[12.5px] text-black/45 font-mono">A carregar…</div>
            ) : (
                <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-1 px-1">
                    {voices.map((v) => {
                        const u = v.user;
                        return (
                            <Link
                                key={u.id}
                                to={`/u/${u.username}`}
                                data-testid={`voice-${u.username}`}
                                className="shrink-0 w-[140px] rounded-2xl border border-black/[0.08] p-3.5 hover:border-black/30 hover:bg-black/[0.02] transition flex flex-col items-center text-center"
                            >
                                <Avatar user={u} size={48} />
                                <div className="mt-2 font-semibold text-[13px] text-black truncate w-full leading-tight">
                                    {u.name}
                                </div>
                                <div className="text-[11px] text-black/45 font-mono truncate w-full">
                                    @{u.username}
                                </div>
                                {(u.city || u.region) && (
                                    <div className="text-[10.5px] text-black/55 mt-1 truncate w-full">
                                        {u.city || u.region}
                                    </div>
                                )}
                                <div className="mt-2 px-2 py-0.5 rounded-full bg-black/[0.04] text-[10px] font-mono text-black/55">
                                    {v.post_count} {v.post_count === 1 ? "post" : "posts"}
                                </div>
                            </Link>
                        );
                    })}
                </div>
            )}
        </section>
    );
}

/**
 * F3.3 — Vista da Tasca. Shows active members on a community page.
 * Slot into Community.js as a presence indicator.
 */
export function VistaDaTasca({ slug }) {
    const [data, setData] = useState(null);

    useEffect(() => {
        if (!slug) return;
        let cancelled = false;
        (async () => {
            try {
                const { data } = await api.get(`/communities/${slug}/active`);
                if (!cancelled) setData(data);
            } catch { /* silent */ }
        })();
        return () => { cancelled = true; };
    }, [slug]);

    if (!data || !data.active || data.active.length === 0) return null;

    return (
        <div
            data-testid="vista-da-tasca"
            className="mb-4 rounded-2xl border border-black/[0.08] p-3.5 bg-white"
        >
            <div className="flex items-center justify-between mb-2.5">
                <p className="text-[10.5px] uppercase tracking-[0.14em] text-black/45 font-mono">
                    <Wind size={11} className="inline -mt-0.5 mr-1" />
                    Vista da Tasca · {data.active_count} {data.active_count === 1 ? "pessoa" : "pessoas"} agora
                </p>
                <span className="text-[10.5px] text-black/40 font-mono">
                    {data.total_members} {data.total_members === 1 ? "membro" : "membros"}
                </span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
                {data.active.slice(0, 12).map((u) => (
                    <Link
                        key={u.id}
                        to={`/u/${u.username}`}
                        data-testid={`active-${u.username}`}
                        title={`@${u.username}`}
                        className="relative inline-block tap-shrink"
                    >
                        <Avatar user={u} size={28} />
                        {u.online && (
                            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 ring-2 ring-white" />
                        )}
                    </Link>
                ))}
            </div>
        </div>
    );
}
