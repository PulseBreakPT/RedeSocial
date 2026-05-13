import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Globe, MapPin, Users } from "lucide-react";
import { api } from "../lib/api";
import { PageHeader } from "../components/PageHeader";
import { PT_REGIONS } from "../lib/ptCulture";

/**
 * F5.4 — Heat map da diáspora.
 * Public page showing how the Portuguese community is distributed across regions
 * (including emigrantes). Reinforces "place graph" identity and belonging.
 */
export default function Diaspora() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const { data } = await api.get("/diaspora/heatmap");
                setData(data);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const regionMeta = (key) => PT_REGIONS.find((r) => r.key === key) || { label: key, emoji: "🇵🇹" };
    const maxPosts = Math.max(1, ...((data?.regions || []).map((r) => r.posts_7d)));

    return (
        <div className="min-h-screen bg-white">
            <PageHeader title="Diáspora" subtitle="Onde os portugueses escrevem." />

            <div className="px-4 lg:px-6 py-5 max-w-3xl mx-auto">
                <div className="rounded-2xl border border-black/[0.08] p-5 mb-6 bg-paper grain isolate">
                    <p className="text-[10.5px] uppercase tracking-[0.14em] text-black/45 font-mono mb-2">
                        <Globe size={11} className="inline -mt-0.5 mr-1" />
                        Place graph · 7 dias
                    </p>
                    <h2 className="font-display text-[26px] sm:text-[32px] font-bold tracking-tight leading-tight text-black max-w-[24ch]">
                        {data?.total_users ?? 0} pessoas · {data?.regions?.reduce((s, r) => s + r.posts_7d, 0) ?? 0} publicações
                    </h2>
                    <p className="text-[13.5px] text-black/60 mt-2 leading-relaxed max-w-[60ch]">
                        O mapa do calor mostra onde a comunidade está mais activa nos últimos 7 dias. A diáspora
                        portuguesa é o grafo que <em>nenhuma plataforma global</em> conhece. Aqui é primeira página.
                    </p>
                </div>

                {loading && (
                    <div data-testid="diaspora-loading" className="text-[13px] text-black/50 font-mono">A carregar…</div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" data-testid="diaspora-grid">
                    {(data?.regions || []).map((r) => {
                        const meta = regionMeta(r.key);
                        const intensity = Math.min(1, r.posts_7d / maxPosts);
                        return (
                            <article
                                key={r.key}
                                data-testid={`diaspora-${r.key}`}
                                className="rounded-2xl border border-black/[0.08] p-4 hover:border-black/30 transition relative overflow-hidden"
                                style={{
                                    background: `linear-gradient(135deg, rgba(223,138,125,${0.05 + intensity * 0.18}) 0%, rgba(106,168,230,${0.04 + intensity * 0.1}) 100%)`,
                                }}
                            >
                                <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 rounded-xl grid place-items-center text-[20px] shrink-0 bg-white border border-black/[0.06]">
                                        <span aria-hidden>{meta.emoji}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-[15px] tracking-tight text-black">
                                            {meta.label}
                                        </h3>
                                        <div className="mt-1 flex items-baseline gap-3 text-[12.5px]">
                                            <span className="text-black">
                                                <strong className="tabular-nums font-mono text-[15px]">{r.users}</strong>{" "}
                                                <span className="text-black/55">pessoas</span>
                                            </span>
                                            <span className="text-black/55">·</span>
                                            <span className="text-black">
                                                <strong className="tabular-nums font-mono text-[15px]">{r.posts_7d}</strong>{" "}
                                                <span className="text-black/55">posts/7d</span>
                                            </span>
                                        </div>
                                        {/* Intensity bar */}
                                        <div className="mt-2 h-1 rounded-full bg-black/[0.06] overflow-hidden">
                                            <div
                                                className="h-full grad-bar"
                                                style={{ width: `${intensity * 100}%`, transition: "width 600ms ease" }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </article>
                        );
                    })}
                </div>

                <div className="mt-8 rounded-2xl border border-black/[0.08] p-5">
                    <p className="text-[10.5px] uppercase tracking-[0.14em] text-black/45 font-mono mb-2">
                        <MapPin size={11} className="inline -mt-0.5 mr-1" />
                        Como aparecer aqui
                    </p>
                    <p className="text-[13.5px] text-black/65 leading-relaxed">
                        Indica a tua região no perfil (Definições → Identidade). Sem isto, o teu lugar fica em branco no
                        mapa.
                    </p>
                    <Link
                        to="/settings"
                        data-testid="diaspora-cta-settings"
                        className="mt-3 inline-flex items-center gap-1 text-[12.5px] font-semibold text-black underline underline-offset-2 hover:text-[color:var(--coral-500)]"
                    >
                        <Users size={13} /> Ir para Identidade
                    </Link>
                </div>
            </div>
        </div>
    );
}
