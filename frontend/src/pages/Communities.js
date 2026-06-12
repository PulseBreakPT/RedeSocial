import { useEffect, useMemo, useState } from "react";
// =============================================================================
// DESIGN SYSTEM: LUSORAE EDITORIAL — ver /src/theme/EDITORIAL.md
// =============================================================================
import { Link, useNavigate } from "react-router-dom";
import { Users, Plus, X, Search, Flame, Clock, TrendingUp } from "lucide-react";
import { api, formatApiError, toastApiError } from "../lib/api";
import { PageShell, PageHero, FilterBar, Chip, Grid, Empty } from "../components/PageShell";
import { PT } from "../theme/editorial";
import { COMMUNITY_CATEGORIES, categoryLabel } from "../lib/portuguese";
import { RowSkeletonList } from "../components/Skeleton";
import { toast } from "sonner";

const TABS = [
    { key: "all", label: "Todas" },
    { key: "mine", label: "As minhas" },
    { key: "suggested", label: "Sugeridas" },
    { key: "popular", label: "Populares" },
];

const SORTS = [
    { key: "recent", label: "Recente", icon: Clock },
    { key: "members", label: "Membros", icon: Users },
    { key: "hot", label: "Em alta", icon: Flame },
];

export default function Communities() {
    const navigate = useNavigate();
    const [communities, setCommunities] = useState([]);
    const [hotMap, setHotMap] = useState({}); // slug -> trend_posts
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [form, setForm] = useState({ name: "", description: "", category: "outras" });
    const [tab, setTab] = useState("all");
    const [cat, setCat] = useState("");
    const [q, setQ] = useState("");
    const [sort, setSort] = useState("recent");

    const load = async () => {
        setLoading(true);
        try {
            const [c, h] = await Promise.all([
                api.get("/communities"),
                api.get("/trending/comunidades?range=7d").catch(() => ({ data: [] })),
            ]);
            setCommunities(c.data);
            const map = {};
            for (const x of h.data) map[x.slug] = { posts: x.trend_posts || 0, likes: x.trend_likes || 0 };
            setHotMap(map);
        } catch (e) { toastApiError(e); }
        finally { setLoading(false); }
    };
    useEffect(() => { load(); }, []);

    const filtered = useMemo(() => {
        let list = communities.slice();
        if (tab === "mine") list = list.filter((c) => c.joined);
        else if (tab === "suggested") list = list.filter((c) => !c.joined);
        else if (tab === "popular") list = list.filter((c) => c.members_count >= 3);
        if (cat) list = list.filter((c) => c.category === cat);
        if (q.trim()) {
            const n = q.toLowerCase();
            list = list.filter((c) => (c.name + " " + (c.description || "")).toLowerCase().includes(n));
        }
        if (sort === "members") list.sort((a, b) => b.members_count - a.members_count);
        else if (sort === "hot") list.sort((a, b) => (hotMap[b.slug]?.posts || 0) - (hotMap[a.slug]?.posts || 0));
        else list.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
        return list;
    }, [communities, tab, cat, q, sort, hotMap]);

    const join = async (slug) => {
        try { const { data } = await api.post(`/communities/${slug}/join`); toast.success(data.joined ? "Entraste" : "Saíste"); load(); }
        catch (e) { toastApiError(e); }
    };
    const create = async (e) => {
        e.preventDefault();
        try {
            const { data } = await api.post("/communities", form);
            toast.success("Comunidade criada");
            setCreating(false);
            setForm({ name: "", description: "", category: "outras" });
            navigate(`/c/${data.slug}`);
        } catch (err) { toastApiError(err); }
    };

    return (
        <PageShell max="max-w-6xl">
            <PageHero
                title="Comunidades"
                subtitle={`${communities.length} grupos · ${communities.filter((c) => c.joined).length} são tuas`}
                badge="Pessoas com algo em comum"
                accent={PT.azul}
                actions={
                    <button
                        onClick={() => setCreating(true)}
                        data-testid="new-community-btn"
                        className="inline-flex items-center gap-1.5 h-10 px-4 font-black uppercase transition hover:translate-y-[-1px]"
                        style={{ background: PT.ink, color: "#fff", borderRadius: 999, fontSize: 11.5, letterSpacing: "0.14em", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10), 0 12px 28px -10px rgba(10,10,10,0.40)" }}
                    >
                        <Plus size={13} strokeWidth={2.6} /> Criar comunidade
                    </button>
                }
            />

            <div className="px-4 lg:px-7 pt-6 pb-12">
            <div className="flex items-center gap-2 mb-4">
                <div className="flex-1 relative">
                    <Search size={14} strokeWidth={2.2} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "rgba(10,10,10,0.45)" }} />
                    <input
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        placeholder="Pesquisar comunidades…"
                        data-testid="communities-search"
                        className="w-full pl-10 pr-9 py-2.5 text-[13.5px] outline-none font-medium"
                        style={{ background: "#fff", border: "1px solid rgba(10,10,10,0.08)", borderRadius: 999, color: PT.ink, boxShadow: "0 1px 2px rgba(10,10,10,0.04)" }}
                    />
                    {q && (<button onClick={() => setQ("")} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "rgba(10,10,10,0.55)" }}><X size={13} /></button>)}
                </div>
                <div className="flex items-center gap-1">
                    {SORTS.map((s) => { const Icon = s.icon; const active = sort === s.key; return (
                        <button key={s.key} onClick={() => setSort(s.key)} title={s.label} className="w-10 h-10 grid place-items-center transition hover:translate-y-[-1px]" style={{ background: active ? PT.ink : "#fff", color: active ? "#fff" : PT.ink, border: active ? "1px solid transparent" : "1px solid rgba(10,10,10,0.10)", borderRadius: 999, boxShadow: active ? "inset 0 1px 0 rgba(255,255,255,0.10), 0 8px 18px -10px rgba(10,10,10,0.30)" : "0 1px 2px rgba(10,10,10,0.04)" }}>
                            <Icon size={14} strokeWidth={2.4} />
                        </button>
                    ); })}
                </div>
            </div>

            <FilterBar>
                {TABS.map((t) => (
                    <Chip key={t.key} active={tab === t.key} onClick={() => setTab(t.key)} testid={`communities-tab-${t.key}`}>
                        {t.label}
                    </Chip>
                ))}
                <span style={{ color: "rgba(10,10,10,0.15)" }} className="mx-1">·</span>
                <Chip active={cat === ""} onClick={() => setCat("")}>Todas</Chip>
                {COMMUNITY_CATEGORIES.map((c) => (
                    <Chip key={c.key} active={cat === c.key} onClick={() => setCat(c.key)} testid={`communities-cat-${c.key}`}>
                        {c.emoji} {c.label}
                    </Chip>
                ))}
            </FilterBar>

            {creating && (
                <div className="fixed inset-0 z-[70] flex items-end lg:items-center lg:justify-center p-0 lg:p-4" style={{ background: "rgba(10,10,10,0.35)", backdropFilter: "blur(6px)" }} onClick={() => setCreating(false)}>
                    <form onSubmit={create} onClick={(e) => e.stopPropagation()} className="w-full lg:max-w-md anim-sheet-up lg:anim-fade-up pb-safe p-6 lg:p-7 space-y-5 max-h-[90vh] overflow-y-auto" style={{ background: "#fff", border: "1px solid rgba(10,10,10,0.08)", borderRadius: 24, boxShadow: "0 1px 2px rgba(10,10,10,0.06), 0 24px 50px -25px rgba(10,10,10,0.30)" }} data-testid="create-community-form">
                        <div className="lg:hidden flex justify-center -mt-2 mb-1"><span className="w-10 h-1 rounded-full" style={{ background: "rgba(10,10,10,0.15)" }} /></div>
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="font-mono font-bold uppercase mb-1.5" style={{ fontSize: 10.5, letterSpacing: "0.22em", color: "rgba(10,10,10,0.45)" }}>Nova comunidade</p>
                                <h2 className="font-black tracking-[-0.025em] leading-tight" style={{ fontSize: 30, color: PT.ink }}>Comunidade<span style={{ color: PT.azul }}>.</span></h2>
                            </div>
                            <button type="button" onClick={() => setCreating(false)} className="hidden lg:grid w-9 h-9 rounded-full place-items-center" style={{ color: "rgba(10,10,10,0.55)" }}><X size={16} /></button>
                        </div>
                        <div>
                            <label className="font-mono font-bold uppercase block mb-2" style={{ fontSize: 10.5, letterSpacing: "0.22em", color: "rgba(10,10,10,0.55)" }}>Nome</label>
                            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required minLength={3} maxLength={40} data-testid="community-name-input" className="w-full px-4 py-3 outline-none transition" style={{ background: "#fff", border: "1px solid rgba(10,10,10,0.10)", borderRadius: 14, color: PT.ink, fontSize: 14 }} />
                        </div>
                        <div>
                            <label className="font-mono font-bold uppercase block mb-2" style={{ fontSize: 10.5, letterSpacing: "0.22em", color: "rgba(10,10,10,0.55)" }}>Categoria</label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                                {COMMUNITY_CATEGORIES.map((c) => (
                                    <button key={c.key} type="button" onClick={() => setForm({ ...form, category: c.key })} data-testid={`community-form-cat-${c.key}`} className="px-2.5 py-2 text-[12px] font-black uppercase transition" style={{ background: form.category === c.key ? PT.ink : "#fff", color: form.category === c.key ? "#fff" : PT.ink, border: form.category === c.key ? "1px solid transparent" : "1px solid rgba(10,10,10,0.10)", borderRadius: 10, letterSpacing: "0.10em" }}>
                                        <span className="mr-1">{c.emoji}</span>{c.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="font-mono font-bold uppercase block mb-2" style={{ fontSize: 10.5, letterSpacing: "0.22em", color: "rgba(10,10,10,0.55)" }}>Descrição</label>
                            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={200} rows={3} data-testid="community-description-input" className="w-full px-4 py-3 outline-none transition resize-none" style={{ background: "#fff", border: "1px solid rgba(10,10,10,0.10)", borderRadius: 14, color: PT.ink, fontSize: 14 }} />
                        </div>
                        <div className="flex justify-end gap-2 pt-1">
                            <button type="button" onClick={() => setCreating(false)} className="px-5 py-2.5 font-mono font-bold uppercase" style={{ fontSize: 11, color: "rgba(10,10,10,0.55)", letterSpacing: "0.16em", borderRadius: 999 }}>Cancelar</button>
                            <button type="submit" data-testid="submit-community-btn" className="px-5 h-10 inline-flex items-center gap-1.5 font-black uppercase transition hover:translate-y-[-1px]" style={{ background: PT.ink, color: "#fff", fontSize: 11.5, letterSpacing: "0.14em", borderRadius: 999, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10), 0 12px 28px -10px rgba(10,10,10,0.40)" }}>Criar</button>
                        </div>
                    </form>
                </div>
            )}

            {loading ? (
                <RowSkeletonList count={6} />
            ) : filtered.length === 0 ? (
                <Empty
                    icon={Users}
                    title={q || cat ? "Sem resultados" : "Nenhuma comunidade ainda"}
                    body={q || cat ? "Tenta outro filtro." : "Cria a primeira e reúne pessoas afins."}
                    cta={q || cat ? null : "Criar comunidade"}
                    ctaOnClick={() => setCreating(true)}
                />
            ) : (
                <Grid cols={2} gap={4} data-testid="communities-grid">
                    {filtered.map((c) => (
                        <Link
                            key={c.id}
                            to={`/c/${c.slug}`}
                            data-testid={`community-${c.slug}`}
                            className="group block p-4 transition hover:translate-y-[-1px]"
                            style={{ background: "#fff", border: "1px solid rgba(10,10,10,0.08)", borderRadius: 18, boxShadow: "0 1px 2px rgba(10,10,10,0.04), 0 10px 22px -14px rgba(10,10,10,0.10)" }}
                        >
                            <div className="flex items-start gap-3 mb-2">
                                <div className="w-12 h-12 grid place-items-center flex-shrink-0" style={{ background: PT.azul, color: "#fff", borderRadius: 12, boxShadow: `0 1px 2px rgba(10,10,10,0.06), 0 10px 22px -10px ${PT.azul}80` }}>
                                    <Users size={20} strokeWidth={2.4} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="font-black text-[17px] tracking-[-0.02em] leading-tight truncate" style={{ color: PT.ink }}>{c.name}</h3>
                                    <p className="font-mono text-[10.5px] font-bold uppercase mt-1 flex items-center gap-1.5 flex-wrap" style={{ color: "rgba(10,10,10,0.55)", letterSpacing: "0.06em" }}>
                                        {c.members_count} MEMBROS
                                        {hotMap[c.slug]?.posts > 0 && (
                                            <span className="inline-flex items-center gap-0.5" style={{ color: PT.green }}>
                                                <TrendingUp size={10} strokeWidth={2.6} /> {hotMap[c.slug].posts}/SEM
                                            </span>
                                        )}
                                    </p>
                                </div>
                            </div>
                            <span className="inline-block font-mono font-bold uppercase mb-3" style={{ fontSize: 9.5, background: "rgba(10,10,10,0.05)", color: "rgba(10,10,10,0.55)", padding: "3px 8px", borderRadius: 999, letterSpacing: "0.14em" }}>
                                {categoryLabel(COMMUNITY_CATEGORIES, c.category)}
                            </span>
                            {c.description && <p className="text-[13px] leading-relaxed mb-4 line-clamp-2 font-medium" style={{ color: "rgba(10,10,10,0.62)" }}>{c.description}</p>}
                            <button
                                onClick={(e) => { e.preventDefault(); join(c.slug); }}
                                data-testid={`join-${c.slug}`}
                                className="w-full text-[11.5px] font-black uppercase px-3 py-2 transition hover:translate-y-[-1px]"
                                style={{
                                    background: c.joined ? "#fff" : PT.ink,
                                    color: c.joined ? PT.ink : "#fff",
                                    border: c.joined ? "1px solid rgba(10,10,10,0.10)" : "1px solid transparent",
                                    borderRadius: 999,
                                    letterSpacing: "0.14em",
                                    boxShadow: c.joined ? "0 1px 2px rgba(10,10,10,0.04)" : "inset 0 1px 0 rgba(255,255,255,0.10), 0 8px 18px -10px rgba(10,10,10,0.30)",
                                }}
                            >
                                {c.joined ? "Membro · Sair" : "Entrar"}
                            </button>
                        </Link>
                    ))}
                </Grid>
            )}
            </div>
        </PageShell>
    );
}
