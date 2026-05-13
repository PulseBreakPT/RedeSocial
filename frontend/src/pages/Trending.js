import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { TrendingUp, Hash, MapPin, Users, Layers, Sparkles, Flame } from "lucide-react";
import { api } from "../lib/api";
import { PageHeader } from "../components/PageHeader";
import { Avatar } from "../components/Avatar";

const RANGES = [
    { key: "1h", label: "1h" },
    { key: "24h", label: "24h" },
    { key: "7d", label: "7 dias" },
    { key: "30d", label: "30 dias" },
];
const TABS = [
    { key: "hashtags", label: "Hashtags", icon: Hash },
    { key: "pessoas", label: "Pessoas", icon: Users },
    { key: "comunidades", label: "Comunidades", icon: Layers },
    { key: "cidades", label: "Cidades 🇵🇹", icon: MapPin },
];

function VelocityPill({ value }) {
    const up = value >= 0;
    const big = Math.abs(value) >= 100;
    return (
        <span
            className={`inline-flex items-center gap-1 font-mono text-[10px] tracking-[0.14em] uppercase px-2 py-0.5 rounded-full ${
                up ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
            }`}
            title={up ? "A crescer" : "A descer"}
        >
            {up ? "↑" : "↓"} {Math.abs(value)}%
            {big && up && <Flame size={10} strokeWidth={2} />}
        </span>
    );
}

function Sparkline({ curr, prev }) {
    // Tiny visual: two bars
    const max = Math.max(curr, prev, 1);
    return (
        <div className="flex items-end gap-[3px] h-5 w-10" aria-hidden>
            <div className="w-1.5 bg-black/15 rounded-sm" style={{ height: `${(prev / max) * 100}%` }} />
            <div className="w-1.5 bg-black rounded-sm" style={{ height: `${(curr / max) * 100}%` }} />
        </div>
    );
}

export default function Trending() {
    const [range, setRange] = useState("7d");
    const [tab, setTab] = useState("hashtags");
    const [data, setData] = useState({ hashtags: [], pessoas: [], comunidades: [], cidades: [] });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        Promise.all([
            api.get(`/trending?range=${range}`),
            api.get(`/trending/pessoas?range=${range}`).catch(() => ({ data: [] })),
            api.get(`/trending/comunidades?range=${range}`).catch(() => ({ data: [] })),
            api.get(`/trending/cidades?range=${range}`).catch(() => ({ data: [] })),
        ]).then(([h, p, c, ci]) => {
            if (cancelled) return;
            setData({ hashtags: h.data, pessoas: p.data, comunidades: c.data, cidades: ci.data });
            setLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, [range]);

    const totals = useMemo(
        () => ({
            hashtags: data.hashtags.length,
            pessoas: data.pessoas.length,
            comunidades: data.comunidades.length,
            cidades: data.cidades.length,
        }),
        [data],
    );

    return (
        <div data-testid="trending-page">
            <PageHeader
                title={
                    <span className="inline-flex items-center gap-2">
                        <TrendingUp size={18} strokeWidth={1.5} className="text-black/70" /> Tendências
                    </span>
                }
                subtitle={`Os tópicos com mais movimento · ${range.toUpperCase()}`}
                testid="trending-header"
            >
                <div className="px-4 lg:px-5 pb-3 flex flex-wrap gap-1.5">
                    {RANGES.map((r) => (
                        <button
                            key={r.key}
                            data-testid={`trending-range-${r.key}`}
                            onClick={() => setRange(r.key)}
                            className={`px-3 py-1 rounded-full text-[12px] font-medium tap-shrink transition ${
                                range === r.key
                                    ? "bg-black text-white"
                                    : "bg-black/[0.04] text-black/65 hover:bg-black/[0.07]"
                            }`}
                        >
                            {r.label}
                        </button>
                    ))}
                    <div className="ml-auto inline-flex items-center gap-1 text-[11px] text-black/50">
                        <Sparkles size={12} strokeWidth={1.6} /> {totals[tab]} resultados
                    </div>
                </div>
                <div className="px-4 lg:px-5 pb-2 flex gap-1 overflow-x-auto scrollbar-hide">
                    {TABS.map((t) => {
                        const Icon = t.icon;
                        const active = tab === t.key;
                        return (
                            <button
                                key={t.key}
                                onClick={() => setTab(t.key)}
                                data-testid={`trending-tab-${t.key}`}
                                className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium border-b-2 transition ${
                                    active
                                        ? "border-black text-black"
                                        : "border-transparent text-black/55 hover:text-black"
                                }`}
                            >
                                <Icon size={14} strokeWidth={1.6} /> {t.label}
                            </button>
                        );
                    })}
                </div>
            </PageHeader>

            {loading ? (
                <div className="p-12 text-center type-overline">a carregar…</div>
            ) : tab === "hashtags" ? (
                <HashtagsList items={data.hashtags} />
            ) : tab === "pessoas" ? (
                <PessoasList items={data.pessoas} />
            ) : tab === "comunidades" ? (
                <ComunidadesList items={data.comunidades} />
            ) : (
                <CidadesList items={data.cidades} />
            )}
        </div>
    );
}

function EmptyState({ msg = "Sem dados neste intervalo" }) {
    return (
        <div className="px-6 py-20 text-center anim-fade-up">
            <div className="ring-silver w-20 h-20 rounded-full grid place-items-center mx-auto mb-6">
                <TrendingUp size={26} strokeWidth={1.4} className="text-black/70" />
            </div>
            <p className="type-overline mb-2">Sem novidades</p>
            <h3 className="font-display text-[19px] font-bold tracking-tight text-black">{msg}</h3>
            <p className="text-black/55 text-sm mt-2">Tenta outro intervalo de tempo.</p>
        </div>
    );
}

function HashtagsList({ items }) {
    if (items.length === 0) return <EmptyState msg="Sem hashtags em alta" />;
    return (
        <div>
            {items.map((t, i) => (
                <Link
                    key={t.tag}
                    to={`/tag/${t.tag}`}
                    data-testid={`trending-tag-${t.tag}`}
                    className="flex items-center gap-5 px-4 lg:px-6 py-5 hairline-b hover:bg-black/[0.015] transition group"
                >
                    <div className="w-10 text-right font-display text-[28px] text-black/25 group-hover:text-black/40 transition leading-none">
                        {String(i + 1).padStart(2, "0")}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="font-display text-[22px] tracking-tight flex items-center gap-1.5 truncate text-black leading-tight">
                            <Hash size={15} strokeWidth={1.5} className="text-black/45" />
                            {t.tag}
                            {t.is_city && <MapPin size={13} strokeWidth={1.6} className="text-black/45" />}
                        </div>
                        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/45 mt-1 flex items-center gap-2">
                            {t.count} {t.count === 1 ? "publicação" : "publicações"}
                            <VelocityPill value={t.velocity} />
                        </div>
                    </div>
                    <Sparkline curr={t.count} prev={t.previous} />
                </Link>
            ))}
        </div>
    );
}

function PessoasList({ items }) {
    if (items.length === 0) return <EmptyState msg="Sem pessoas em alta" />;
    return (
        <div>
            {items.map((u, i) => (
                <Link
                    key={u.id}
                    to={`/u/${u.username}`}
                    className="flex items-center gap-4 px-4 lg:px-6 py-4 hairline-b hover:bg-black/[0.015] transition group"
                >
                    <div className="w-8 text-right font-display text-[20px] text-black/25 leading-none">
                        {String(i + 1).padStart(2, "0")}
                    </div>
                    <Avatar user={u} size={44} />
                    <div className="flex-1 min-w-0">
                        <div className="font-medium text-[15px] truncate">{u.display_name || u.username}</div>
                        <div className="text-[12px] text-black/55 truncate flex items-center gap-2 mt-0.5">
                            @{u.username}
                            <span className="font-mono text-[10px] uppercase tracking-[0.14em] bg-black/[0.05] px-1.5 py-0.5 rounded">
                                {u.trend_posts}p · {u.trend_likes}♥
                            </span>
                        </div>
                    </div>
                    <span className="text-black/30 font-display text-xl">→</span>
                </Link>
            ))}
        </div>
    );
}

function ComunidadesList({ items }) {
    if (items.length === 0) return <EmptyState msg="Sem comunidades em alta" />;
    return (
        <div>
            {items.map((c, i) => (
                <Link
                    key={c.id}
                    to={`/c/${c.slug}`}
                    className="flex items-center gap-4 px-4 lg:px-6 py-4 hairline-b hover:bg-black/[0.015] transition"
                >
                    <div className="w-8 text-right font-display text-[20px] text-black/25 leading-none">
                        {String(i + 1).padStart(2, "0")}
                    </div>
                    <div className="w-11 h-11 rounded-full bg-black/[0.05] grid place-items-center text-[18px]">
                        <Layers size={18} strokeWidth={1.5} className="text-black/65" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="font-medium text-[15px] truncate">{c.name}</div>
                        <div className="text-[12px] text-black/55 truncate flex items-center gap-2 mt-0.5">
                            {c.members_count} membros
                            <span className="font-mono text-[10px] uppercase tracking-[0.14em] bg-black/[0.05] px-1.5 py-0.5 rounded">
                                {c.trend_posts}p · {c.trend_likes}♥
                            </span>
                        </div>
                    </div>
                    <span className="text-black/30 font-display text-xl">→</span>
                </Link>
            ))}
        </div>
    );
}

function CidadesList({ items }) {
    if (items.length === 0) return <EmptyState msg="Sem cidades em alta" />;
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-black/[0.06]">
            {items.map((c, i) => (
                <Link
                    key={c.city}
                    to={`/tag/${c.city.toLowerCase().replace(/\s+/g, "").replace(/[áàâ]/g, "a").replace(/[éê]/g, "e").replace(/í/g, "i").replace(/[óô]/g, "o").replace(/ú/g, "u").replace(/ç/g, "c")}`}
                    className="flex items-center gap-3 bg-white px-5 py-4 hover:bg-black/[0.015] transition"
                >
                    <div className="w-9 text-right font-display text-[22px] text-black/25 leading-none">
                        {String(i + 1).padStart(2, "0")}
                    </div>
                    <div className="w-10 h-10 rounded-full bg-rose-50 grid place-items-center">
                        <MapPin size={16} strokeWidth={1.6} className="text-rose-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="font-display text-[18px] truncate">{c.city}</div>
                        <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/45 mt-1 flex items-center gap-2">
                            {c.count} posts
                            <VelocityPill value={c.velocity} />
                        </div>
                    </div>
                </Link>
            ))}
        </div>
    );
}
