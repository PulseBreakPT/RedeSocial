import { useEffect, useMemo, useState } from "react";
import { FileText, Trash2, Send, Image as ImageIcon, BarChart3, Search, X, CheckSquare, Square, ArrowUpDown } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { PostSkeletonList } from "../components/Skeleton";
import { Avatar } from "../components/Avatar";
import { api, formatApiError } from "../lib/api";
import { smartTime } from "../lib/time";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function Drafts() {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [q, setQ] = useState("");
    const [sort, setSort] = useState("recent"); // recent | oldest | length
    const [selected, setSelected] = useState(new Set());
    const navigate = useNavigate();

    const load = () => {
        setLoading(true);
        api.get("/posts/drafts").then((r) => setPosts(r.data)).catch((e) => toast.error(formatApiError(e))).finally(() => setLoading(false));
    };
    useEffect(() => { load(); }, []);

    const filtered = useMemo(() => {
        let list = posts;
        if (q.trim()) {
            const n = q.toLowerCase();
            list = list.filter((p) => (p.content || "").toLowerCase().includes(n));
        }
        list = list.slice();
        if (sort === "oldest") list.sort((a, b) => (a.created_at < b.created_at ? -1 : 1));
        else if (sort === "length") list.sort((a, b) => (b.content || "").length - (a.content || "").length);
        else list.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
        return list;
    }, [posts, q, sort]);

    const totalChars = useMemo(() => posts.reduce((s, p) => s + (p.content || "").length, 0), [posts]);

    const toggle = (id) => setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    const toggleAll = () => setSelected((prev) => prev.size === filtered.length ? new Set() : new Set(filtered.map((p) => p.id)));

    const publish = async (id) => {
        try { await api.post(`/posts/${id}/publish`); setPosts((prev) => prev.filter((p) => p.id !== id)); toast.success("Publicado"); }
        catch (e) { toast.error(formatApiError(e)); }
    };
    const remove = async (id) => {
        if (!window.confirm("Apagar este rascunho?")) return;
        try { await api.delete(`/posts/${id}`); setPosts((prev) => prev.filter((p) => p.id !== id)); toast.success("Rascunho apagado"); }
        catch (e) { toast.error(formatApiError(e)); }
    };
    const bulkPublish = async () => {
        if (selected.size === 0) return;
        if (!window.confirm(`Publicar ${selected.size} rascunhos?`)) return;
        for (const id of selected) { try { await api.post(`/posts/${id}/publish`); } catch {} }
        setPosts((prev) => prev.filter((p) => !selected.has(p.id)));
        setSelected(new Set());
        toast.success("Publicados");
    };
    const bulkDelete = async () => {
        if (selected.size === 0) return;
        if (!window.confirm(`Apagar ${selected.size} rascunhos?`)) return;
        for (const id of selected) { try { await api.delete(`/posts/${id}`); } catch {} }
        setPosts((prev) => prev.filter((p) => !selected.has(p.id)));
        setSelected(new Set());
        toast.success("Apagados");
    };

    return (
        <div data-testid="drafts-page">
            <PageHeader
                title="Rascunhos"
                subtitle={`${posts.length} ${posts.length === 1 ? "guardado" : "guardados"} · ${totalChars} caracteres`}
                back testid="drafts-header"
            >
                <div className="px-3 lg:px-4 pb-2 flex items-center gap-2">
                    <div className="flex-1 relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40" />
                        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquisar nos rascunhos..." data-testid="drafts-search" className="w-full bg-black/[0.04] border border-transparent rounded-full pl-9 pr-9 py-2 text-[13px] focus:bg-white focus:border-black/15 outline-none transition" />
                        {q && (<button onClick={() => setQ("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-black/40"><X size={13} /></button>)}
                    </div>
                    <select value={sort} onChange={(e) => setSort(e.target.value)} data-testid="drafts-sort" className="text-[12px] bg-black/[0.04] rounded-full px-3 py-2 font-medium text-black/65 outline-none">
                        <option value="recent">Recente</option>
                        <option value="oldest">Mais antigo</option>
                        <option value="length">Mais longo</option>
                    </select>
                </div>
                {selected.size > 0 && (
                    <div className="px-3 lg:px-4 pb-2 flex items-center gap-2 hairline-t pt-2">
                        <span className="text-[12px] font-mono text-black/65">{selected.size} selecionados</span>
                        <button onClick={bulkPublish} data-testid="drafts-bulk-publish" className="inline-flex items-center gap-1 bg-black text-white text-xs font-heading font-semibold px-3 py-1.5 rounded-full hover:bg-black/85"><Send size={11} /> Publicar todos</button>
                        <button onClick={bulkDelete} data-testid="drafts-bulk-delete" className="inline-flex items-center gap-1 text-xs font-mono text-red-soft hover:bg-red-soft/10 px-3 py-1.5 rounded-full"><Trash2 size={11} /> Apagar</button>
                        <button onClick={() => setSelected(new Set())} className="ml-auto text-[11px] font-mono text-black/55 hover:text-black">limpar</button>
                    </div>
                )}
            </PageHeader>

            {loading ? (<PostSkeletonList count={3} />) : filtered.length === 0 ? (
                <div className="px-6 py-16 text-center">
                    <div className="w-20 h-20 rounded-full bg-black/[0.04] grid place-items-center mx-auto mb-5 border border-black/[0.08]"><FileText size={28} className="text-black/40" /></div>
                    <p className="text-black font-heading text-lg tracking-tight">{q ? "Sem resultados" : "Sem rascunhos"}</p>
                    <p className="text-black/50 text-sm mt-1">Guarda uma publicação para a continuares depois.</p>
                </div>
            ) : (
                <>
                    <div className="px-4 lg:px-5 py-2 hairline-b flex items-center gap-2">
                        <button onClick={toggleAll} className="inline-flex items-center gap-1.5 text-[11px] font-mono text-black/55 hover:text-black">
                            {selected.size === filtered.length && filtered.length > 0 ? <CheckSquare size={13} /> : <Square size={13} />}
                            selecionar todos
                        </button>
                        <ArrowUpDown size={12} className="text-black/30 ml-auto" />
                        <span className="text-[11px] font-mono text-black/45">{filtered.length} visiveis</span>
                    </div>
                    {filtered.map((p) => (
                        <article key={p.id} data-testid={`draft-${p.id}`} className="px-4 lg:px-5 py-4 border-b border-black/[0.06] hover:bg-black/[0.015] transition">
                            <div className="flex gap-3">
                                <button onClick={() => toggle(p.id)} className="flex-shrink-0 mt-1 text-black/40 hover:text-black">
                                    {selected.has(p.id) ? <CheckSquare size={16} /> : <Square size={16} />}
                                </button>
                                <Avatar user={p.author} size={40} />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-heading font-bold text-sm text-black">{p.author?.name}</span>
                                        <span className="font-mono text-[11px] text-black/50">{smartTime(p.created_at)}</span>
                                        <span className="font-mono text-[10px] text-black/40 uppercase ml-auto">{(p.content || "").length} ch</span>
                                    </div>
                                    <p className="text-[15px] text-black/85 whitespace-pre-wrap line-clamp-4">{p.content || <em className="text-black/40">sem texto</em>}</p>
                                    <div className="flex items-center gap-3 mt-2 text-[11px] font-mono text-black/40">
                                        {p.images?.length > 0 && (<span className="inline-flex items-center gap-1"><ImageIcon size={11} /> {p.images.length}</span>)}
                                        {p.poll && (<span className="inline-flex items-center gap-1"><BarChart3 size={11} /> enquete</span>)}
                                    </div>
                                    <div className="flex items-center gap-2 mt-3">
                                        <button onClick={() => publish(p.id)} data-testid={`draft-publish-${p.id}`} className="inline-flex items-center gap-1.5 bg-black text-white text-xs font-heading font-semibold px-3 py-1.5 rounded-full hover:bg-black/85"><Send size={12} /> Publicar</button>
                                        <button onClick={() => navigate(`/post/${p.id}`)} className="inline-flex items-center gap-1.5 text-xs font-mono text-black/60 hover:text-black px-3 py-1.5 rounded-full hover:bg-black/[0.04]">ver</button>
                                        <button onClick={() => remove(p.id)} data-testid={`draft-delete-${p.id}`} className="ml-auto inline-flex items-center gap-1 text-xs font-mono text-red-soft hover:bg-red-soft/10 px-3 py-1.5 rounded-full"><Trash2 size={12} /> apagar</button>
                                    </div>
                                </div>
                            </div>
                        </article>
                    ))}
                </>
            )}
        </div>
    );
}
