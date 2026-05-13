import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Users, Plus, X, Search, Flame, Clock, TrendingUp } from "lucide-react";
import { api, formatApiError } from "../lib/api";
import { PageHeader } from "../components/PageHeader";
import { COMMUNITY_CATEGORIES, categoryLabel } from "../lib/portuguese";
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
        } catch (e) { toast.error(formatApiError(e)); }
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
        catch (e) { toast.error(formatApiError(e)); }
    };
    const create = async (e) => {
        e.preventDefault();
        try {
            const { data } = await api.post("/communities", form);
            toast.success("Comunidade criada");
            setCreating(false);
            setForm({ name: "", description: "", category: "outras" });
            navigate(`/c/${data.slug}`);
        } catch (err) { toast.error(formatApiError(err)); }
    };

    return (
        <div data-testid="communities-page">
            <PageHeader
                title="Comunidades"
                subtitle={`${communities.length} grupos · ${communities.filter((c) => c.joined).length} as tuas`}
                testid="communities-header"
                action={
                    <button onClick={() => setCreating(true)} data-testid="new-community-btn" className="btn-obsidian px-4 py-2 text-[11px] flex items-center gap-1.5">
                        <Plus size={13} strokeWidth={2} /> Criar
                    </button>
                }
            >
                <div className="px-3 lg:px-4 pb-2 flex items-center gap-2">
                    <div className="flex-1 relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40" />
                        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquisar comunidades..." data-testid="communities-search" className="w-full bg-black/[0.04] border border-transparent rounded-full pl-9 pr-9 py-2 text-[13px] focus:bg-white focus:border-black/15 outline-none transition" />
                        {q && (<button onClick={() => setQ("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-black/40"><X size={13} /></button>)}
                    </div>
                    <div className="flex items-center gap-1">
                        {SORTS.map((s) => { const Icon = s.icon; const active = sort === s.key; return (
                            <button key={s.key} onClick={() => setSort(s.key)} title={s.label} className={`w-8 h-8 rounded-full grid place-items-center transition ${active ? "chip-on" : "text-black hover:bg-black/[0.06]"}`}>
                                <Icon size={13} />
                            </button>
                        ); })}
                    </div>
                </div>
                <div className="px-3 lg:px-4 flex gap-1 overflow-x-auto scrollbar-hide hairline-t pt-2">
                    {TABS.map((t) => (
                        <button key={t.key} onClick={() => setTab(t.key)} data-testid={`communities-tab-${t.key}`} className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium border-b-2 transition ${tab === t.key ? "border-black text-black" : "border-transparent text-black hover:text-black"}`}>{t.label}</button>
                    ))}
                </div>
                <div className="px-3 lg:px-4 pb-2.5 flex gap-1.5 overflow-x-auto scrollbar-hide">
                    <button onClick={() => setCat("")} className={`shrink-0 px-3 py-1 rounded-full text-[12px] font-medium ${cat === "" ? "chip-on" : "bg-black/[0.04] text-black hover:bg-black/[0.08]"}`}>Todas categorias</button>
                    {COMMUNITY_CATEGORIES.map((c) => (
                        <button key={c.key} onClick={() => setCat(c.key)} data-testid={`communities-cat-${c.key}`} className={`shrink-0 inline-flex items-center gap-1 px-3 py-1 rounded-full text-[12px] font-medium ${cat === c.key ? "chip-on" : "bg-black/[0.04] text-black hover:bg-black/[0.08]"}`}>
                            <span>{c.emoji}</span> {c.label}
                        </button>
                    ))}
                </div>
            </PageHeader>

            {creating && (
                <div className="fixed inset-0 z-[70] bg-black/30 backdrop-blur-sm flex items-end lg:items-center lg:justify-center p-0 lg:p-4" onClick={() => setCreating(false)}>
                    <form onSubmit={create} onClick={(e) => e.stopPropagation()} className="w-full lg:max-w-md bg-white border-t lg:border border-black/[0.08] rounded-t-3xl lg:rounded-2xl p-6 lg:p-7 space-y-5 anim-sheet-up lg:anim-fade-up pb-safe max-h-[90vh] overflow-y-auto" data-testid="create-community-form">
                        <div className="lg:hidden flex justify-center -mt-2 mb-1"><span className="w-10 h-1 rounded-full bg-black/15" /></div>
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="type-overline mb-1">Nova comunidade</p>
                                <h2 className="font-display text-[28px] tracking-tight leading-none text-black">Comunidade</h2>
                            </div>
                            <button type="button" onClick={() => setCreating(false)} className="hidden lg:grid w-9 h-9 rounded-full place-items-center hover:bg-black/[0.04] text-black/55"><X size={16} /></button>
                        </div>
                        <div>
                            <label className="type-overline">Nome</label>
                            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required minLength={3} maxLength={40} data-testid="community-name-input" className="mt-2 w-full bg-[#fafafa] border border-black/[0.08] rounded-2xl px-4 py-3 focus:border-black/40 focus:bg-white focus:outline-none transition" />
                        </div>
                        <div>
                            <label className="type-overline">Categoria</label>
                            <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                                {COMMUNITY_CATEGORIES.map((c) => (
                                    <button key={c.key} type="button" onClick={() => setForm({ ...form, category: c.key })} data-testid={`community-form-cat-${c.key}`} className={`px-2.5 py-2 rounded-xl text-[12px] font-medium border transition ${form.category === c.key ? "chip-on border-transparent" : "bg-white border-black/[0.10] text-black/70 hover:border-black/30"}`}>
                                        <span className="mr-1">{c.emoji}</span>{c.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="type-overline">Descrição</label>
                            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={200} rows={3} data-testid="community-description-input" className="mt-2 w-full bg-[#fafafa] border border-black/[0.08] rounded-2xl px-4 py-3 focus:border-black/40 focus:bg-white focus:outline-none transition resize-none" />
                        </div>
                        <div className="flex justify-end gap-2 pt-1">
                            <button type="button" onClick={() => setCreating(false)} className="px-5 py-2.5 rounded-full font-mono text-[11px] uppercase tracking-[0.16em] text-black/60 hover:bg-black/[0.04]">Cancelar</button>
                            <button type="submit" data-testid="submit-community-btn" className="btn-obsidian px-5 py-2.5 text-[11px]">Criar</button>
                        </div>
                    </form>
                </div>
            )}

            {loading ? (
                <div className="p-12 text-center type-overline">a carregar…</div>
            ) : filtered.length === 0 ? (
                <div className="px-6 py-20 text-center anim-fade-up">
                    <div className="ring-silver w-20 h-20 rounded-full grid place-items-center mx-auto mb-6">
                        <Users size={26} strokeWidth={1.4} className="text-black/70" />
                    </div>
                    <p className="type-overline mb-2">Sem comunidades</p>
                    <h3 className="font-display text-[19px] font-bold tracking-tight text-black">{q || cat ? "Sem resultados" : "Nenhuma comunidade ainda"}</h3>
                    <p className="text-black/55 text-sm mt-2">{q || cat ? "Tenta outro filtro." : "Cria a primeira e reúne pessoas afins."}</p>
                </div>
            ) : (
                <div>
                    {filtered.map((c) => (
                        <div key={c.id} className="px-4 lg:px-5 py-5 hairline-b hover:bg-black/[0.015] transition" data-testid={`community-${c.slug}`}>
                            <div className="flex items-start gap-4">
                                <div className="w-14 h-14 rounded-2xl silver-grad grid place-items-center flex-shrink-0 shadow-sm">
                                    <Users size={20} strokeWidth={1.5} className="text-black/70" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <Link to={`/c/${c.slug}`} className="block">
                                        <h3 className="font-display text-[22px] tracking-tight leading-tight hover:underline text-black truncate">{c.name}</h3>
                                        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/45 mt-1 flex items-center gap-2 flex-wrap">
                                            {c.members_count} membros
                                            <span className="bg-black/[0.05] px-1.5 py-0.5 rounded text-black/65 normal-case tracking-normal">{categoryLabel(COMMUNITY_CATEGORIES, c.category)}</span>
                                            {hotMap[c.slug]?.posts > 0 && (
                                                <span className="inline-flex items-center gap-0.5 text-emerald-700 normal-case tracking-normal"><TrendingUp size={10} /> {hotMap[c.slug].posts}p/sem</span>
                                            )}
                                        </p>
                                    </Link>
                                    {c.description && <p className="mt-2 text-[14px] text-black/70 line-clamp-2 leading-relaxed">{c.description}</p>}
                                </div>
                                <button onClick={() => join(c.slug)} data-testid={`join-${c.slug}`} className={`text-[11px] font-heading font-medium tracking-tight rounded-full px-4 py-2 transition active:scale-95 flex-shrink-0 ${c.joined ? "chip-on" : "btn-obsidian"}`}>
                                    {c.joined ? "Sair" : "Entrar"}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
