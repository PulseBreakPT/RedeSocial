import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Globe, MapPin, Users, ArrowRight } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { PageHeader } from "../components/PageHeader";
import { PT_REGIONS } from "../lib/ptCulture";

// Cinematic Portuguese coast — symbolises "wherever you are, here is home".
const DIASPORA_HERO =
    "https://images.unsplash.com/photo-1543163480-b7868f961533?auto=format&fit=crop&w=1600&q=75";

/**
 * F5.4 — Heat map da diáspora.
 * Public page showing how the Portuguese community is distributed across regions
 * (including emigrantes). Reinforces "place graph" identity and belonging.
 */
export default function Diaspora() {
    const { user } = useAuth();
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
                {/* Cinematic hero — coast + Atlantic horizon, "wherever you are, here is home" */}
                <figure
                    data-testid="diaspora-hero"
                    className="mb-6 relative rounded-2xl overflow-hidden isolate aspect-[16/9] sm:aspect-[21/9]"
                >
                    <img
                        src={DIASPORA_HERO}
                        alt="Farol português sobre o Atlântico ao entardecer"
                        className="absolute inset-0 w-full h-full object-cover"
                        loading="eager"
                    />
                    <div
                        className="absolute inset-0"
                        style={{
                            background:
                                "linear-gradient(180deg, rgba(0,0,0,0.20) 0%, rgba(0,0,0,0.10) 35%, rgba(0,0,0,0.82) 100%)",
                        }}
                        aria-hidden
                    />
                    <figcaption className="absolute inset-x-0 bottom-0 p-5 sm:p-8">
                        <p className="text-[10.5px] uppercase tracking-[0.18em] text-white/70 font-mono mb-2">
                            <Globe size={11} className="inline -mt-0.5 mr-1" />
                            Place graph · 7 dias
                        </p>
                        <h2 className="font-display text-[26px] sm:text-[38px] lg:text-[46px] leading-[1.0] tracking-tight text-white max-w-[20ch]">
                            Onde quer que estejas,{" "}
                            <span className="silver-foil">aqui é casa</span>.
                        </h2>
                        <p className="text-[12.5px] sm:text-[14px] text-white/80 mt-2.5 leading-relaxed max-w-[52ch]">
                            <strong className="text-white tabular-nums font-mono">{data?.total_users ?? 0}</strong>{" "}
                            pessoas ·{" "}
                            <strong className="text-white tabular-nums font-mono">
                                {data?.regions?.reduce((s, r) => s + r.posts_7d, 0) ?? 0}
                            </strong>{" "}
                            publicações nesta semana.
                        </p>
                    </figcaption>
                </figure>

                <p className="text-[13.5px] text-black/65 leading-relaxed max-w-[60ch] mb-6 px-1">
                    O mapa do calor mostra onde a comunidade está mais activa nos últimos 7 dias. A diáspora
                    portuguesa é o grafo que <em>nenhuma plataforma global</em> conhece. Aqui é primeira página.
                </p>

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
                        {user
                            ? "Indica a tua região no perfil (Definições → Identidade). Sem isto, o teu lugar fica em branco no mapa."
                            : "Cria conta e indica a tua região — o teu ponto aparece no mapa em segundos."}
                    </p>
                    {user ? (
                        <Link
                            to="/settings"
                            data-testid="diaspora-cta-settings"
                            className="mt-3 inline-flex items-center gap-1 text-[12.5px] font-semibold text-black underline underline-offset-2 hover:text-[color:var(--coral-500)]"
                        >
                            <Users size={13} /> Ir para Identidade
                        </Link>
                    ) : (
                        <Link
                            to="/register"
                            data-testid="diaspora-cta-register"
                            className="mt-3 inline-flex items-center gap-1 text-[12.5px] font-semibold text-black underline underline-offset-2 hover:text-[color:var(--coral-500)]"
                        >
                            <Users size={13} /> Criar conta gratuita
                        </Link>
                    )}
                </div>

                {/* Visitor-only conversion card — final push from heat-map awe to sign-up */}
                {!user && (
                    <div
                        data-testid="diaspora-visitor-cta"
                        className="mt-6 rounded-2xl p-7 bg-black text-white relative overflow-hidden isolate"
                    >
                        <div
                            className="absolute -right-16 -top-16 w-60 h-60 rounded-full opacity-25 blur-3xl pointer-events-none"
                            style={{ background: "radial-gradient(circle, var(--coral-500), transparent 70%)" }}
                            aria-hidden
                        />
                        <p className="text-[10.5px] uppercase tracking-[0.18em] text-white/55 font-mono mb-2.5">
                            Não estás no mapa?
                        </p>
                        <h3 className="font-display text-[24px] sm:text-[32px] leading-[1.05] tracking-tight text-white max-w-[20ch]">
                            Esta semana faltam-nos{" "}
                            <span className="silver-foil">vozes da tua região</span>.
                        </h3>
                        <p className="mt-3 text-[13.5px] text-white/75 leading-relaxed max-w-[52ch]">
                            Cada conta nova acende um ponto no mapa. Se vais de Bragança ou estás em Toronto, és
                            primeira página aqui.
                        </p>
                        <div className="mt-6 flex flex-wrap items-center gap-3">
                            <Link
                                to="/register"
                                data-testid="diaspora-cta-register-card"
                                className="inline-flex items-center gap-1.5 bg-white text-black font-semibold text-[13.5px] px-5 py-3 rounded-full hover:bg-white/90 transition tap-shrink"
                            >
                                Criar conta · 60 seg <ArrowRight size={14} />
                            </Link>
                            <Link
                                to="/manifesto"
                                data-testid="diaspora-cta-manifesto"
                                className="inline-flex items-center text-[13px] font-medium text-white/80 hover:text-white underline underline-offset-4"
                            >
                                Ler o manifesto primeiro
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
