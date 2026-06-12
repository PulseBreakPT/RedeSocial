import { useEffect, useMemo, useState } from "react";
// =============================================================================
// DESIGN SYSTEM: LUSORAE EDITORIAL — ver /src/theme/EDITORIAL.md
// =============================================================================
import { FileText, Trash2, Send, Image as ImageIcon, BarChart3, Search, X, CheckSquare, Square, ArrowUpDown } from "lucide-react";
import { PageShell, PageHero, Empty, Grid } from "../components/PageShell";
import { PostSkeletonList } from "../components/Skeleton";
import { Avatar } from "../components/Avatar";
import { api, formatApiError, toastApiError } from "../lib/api";
import { smartTime } from "../lib/time";
import { PT } from "../theme/editorial";
import { toast } from "sonner";
import { useNavigate, useOutletContext } from "react-router-dom";
import { confirmDialog } from "../components/ConfirmDialog";

export default function Drafts() {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [q, setQ] = useState("");
    const [sort, setSort] = useState("recent"); // recent | oldest | length
    const [selected, setSelected] = useState(new Set());
    const navigate = useNavigate();
    const { openCompose } = useOutletContext() || {};

    const load = () => {
        setLoading(true);
        api.get("/posts/drafts").then((r) => setPosts(r.data)).catch((e) => toastApiError(e)).finally(() => setLoading(false));
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
        catch (e) { toastApiError(e); }
    };
    const remove = async (id) => {
        const ok = await confirmDialog({
            title: "Apagar este rascunho?",
            description: "O rascunho será removido permanentemente.",
            confirmText: "Apagar",
            danger: true,
        });
        if (!ok) return;
        try { await api.delete(`/posts/${id}`); setPosts((prev) => prev.filter((p) => p.id !== id)); toast.success("Rascunho apagado"); }
        catch (e) { toastApiError(e); }
    };
    const bulkPublish = async () => {
        if (selected.size === 0) return;
        const ok = await confirmDialog({
            title: `Publicar ${selected.size} ${selected.size === 1 ? "rascunho" : "rascunhos"}?`,
            description: "Todos serão publicados imediatamente.",
            confirmText: "Publicar todos",
        });
        if (!ok) return;
        for (const id of selected) { try { await api.post(`/posts/${id}/publish`); } catch {} }
        setPosts((prev) => prev.filter((p) => !selected.has(p.id)));
        setSelected(new Set());
        toast.success("Publicados");
    };
    const bulkDelete = async () => {
        if (selected.size === 0) return;
        const ok = await confirmDialog({
            title: `Apagar ${selected.size} ${selected.size === 1 ? "rascunho" : "rascunhos"}?`,
            description: "Esta ação é irreversível.",
            confirmText: "Apagar todos",
            danger: true,
        });
        if (!ok) return;
        for (const id of selected) { try { await api.delete(`/posts/${id}`); } catch {} }
        setPosts((prev) => prev.filter((p) => !selected.has(p.id)));
        setSelected(new Set());
        toast.success("Apagados");
    };

    const editDraft = (p) => {
        if (openCompose) openCompose({ draft: p });
        else toast.error("Não foi possível abrir o composer");
    };

    return (
        <PageShell max="max-w-5xl">
            <PageHero
                title="Rascunhos"
                subtitle={`${posts.length} ${posts.length === 1 ? "guardado" : "guardados"} · ${totalChars} caracteres`}
                badge="A tua sala de escrita"
                accent={PT.gold}
            />

            <div className="px-4 lg:px-7 pt-6 pb-12">
            <div className="flex items-center gap-2 mb-4">
                <div className="flex-1 relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40" />
                    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquisar nos rascunhos..." data-testid="drafts-search" className="w-full bg-white border border-black/[0.08] rounded-full pl-9 pr-9 py-2 text-[13px] focus:border-black/30 outline-none transition" style={{ boxShadow: "0 1px 2px rgba(10,10,10,0.04)" }} />
                    {q && (<button onClick={() => setQ("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-black/40"><X size={13} /></button>)}
                </div>
                <select value={sort} onChange={(e) => setSort(e.target.value)} data-testid="drafts-sort" className="text-[12px] bg-white border border-black/[0.08] rounded-full px-3 py-2 font-bold uppercase outline-none" style={{ letterSpacing: "0.10em", color: PT.ink }}>
                    <option value="recent">Recente</option>
                    <option value="oldest">Mais antigo</option>
                    <option value="length">Mais longo</option>
                </select>
            </div>

            {selected.size > 0 && (
                <div className="mb-3 px-3 py-2 rounded-2xl flex items-center gap-2" style={{ background: "#fff", border: "1px solid rgba(10,10,10,0.08)" }}>
                    <span className="text-[11px] font-mono font-bold uppercase" style={{ color: PT.ink, letterSpacing: "0.14em" }}>{selected.size} selecionados</span>
                    <button onClick={bulkPublish} data-testid="drafts-bulk-publish" className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase px-3 py-1.5 rounded-full transition hover:translate-y-[-1px]" style={{ background: PT.ink, color: "#fff", letterSpacing: "0.14em", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10), 0 8px 18px -10px rgba(10,10,10,0.40)" }}><Send size={11} strokeWidth={2.6} /> Publicar todos</button>
                    <button onClick={bulkDelete} data-testid="drafts-bulk-delete" className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase px-3 py-1.5 rounded-full transition hover:translate-y-[-1px]" style={{ background: "#fff", color: PT.red, border: `1px solid ${PT.red}40`, letterSpacing: "0.14em" }}><Trash2 size={11} strokeWidth={2.4} /> Apagar</button>
                    <button onClick={() => setSelected(new Set())} className="ml-auto text-[11px] font-mono font-bold uppercase" style={{ color: "rgba(10,10,10,0.55)", letterSpacing: "0.14em" }}>limpar</button>
                </div>
            )}

            {loading ? (<PostSkeletonList count={3} />) : filtered.length === 0 ? (
                <Empty
                    icon={FileText}
                    title={q ? "Sem resultados" : "Sem rascunhos"}
                    body="Guarda uma publicação para a continuares depois."
                    cta={!q ? "Criar publicação" : null}
                    ctaOnClick={() => (openCompose ? openCompose() : navigate("/"))}
                />
            ) : (
                <>
                    <div className="mb-3 flex items-center gap-2">
                        <button onClick={toggleAll} className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase" style={{ color: "rgba(10,10,10,0.55)", letterSpacing: "0.14em" }}>
                            {selected.size === filtered.length && filtered.length > 0 ? <CheckSquare size={13} /> : <Square size={13} />}
                            Selecionar todos
                        </button>
                        <ArrowUpDown size={12} className="ml-auto" style={{ color: "rgba(10,10,10,0.30)" }} />
                        <span className="text-[11px] font-mono font-bold uppercase" style={{ color: "rgba(10,10,10,0.45)", letterSpacing: "0.14em" }}>{filtered.length} visíveis</span>
                    </div>
                    <Grid cols={2} gap={3}>
                        {filtered.map((p) => (
                            <article key={p.id} data-testid={`draft-${p.id}`} className="p-4 transition hover:translate-y-[-1px]" style={{ background: "#fff", border: "1px solid rgba(10,10,10,0.08)", borderRadius: 18, boxShadow: "0 1px 2px rgba(10,10,10,0.04), 0 10px 22px -14px rgba(10,10,10,0.10)" }}>
                                <div className="flex items-start gap-2 mb-2">
                                    <button onClick={() => toggle(p.id)} className="mt-0.5 flex-shrink-0" style={{ color: selected.has(p.id) ? PT.ink : "rgba(10,10,10,0.40)" }}>
                                        {selected.has(p.id) ? <CheckSquare size={14} /> : <Square size={14} />}
                                    </button>
                                    <Avatar user={p.author} size={28} />
                                    <div className="flex-1 min-w-0">
                                        <div className="font-black text-[12.5px] tracking-tight truncate" style={{ color: PT.ink }}>{p.author?.name}</div>
                                        <div className="font-mono text-[10px] font-bold uppercase" style={{ color: "rgba(10,10,10,0.45)", letterSpacing: "0.06em" }}>{smartTime(p.created_at)} · {(p.content || "").length} CARAC.</div>
                                    </div>
                                </div>
                                <p className="text-[13px] whitespace-pre-wrap line-clamp-3 min-h-[3.6em] font-medium" style={{ color: "rgba(10,10,10,0.78)" }}>
                                    {p.content || <em style={{ color: "rgba(10,10,10,0.40)" }}>sem texto</em>}
                                </p>
                                <div className="flex items-center gap-3 mt-2 text-[10.5px] font-mono font-bold uppercase" style={{ color: "rgba(10,10,10,0.42)", letterSpacing: "0.06em" }}>
                                    {p.images?.length > 0 && (<span className="inline-flex items-center gap-1"><ImageIcon size={11} /> {p.images.length}</span>)}
                                    {p.poll && (<span className="inline-flex items-center gap-1"><BarChart3 size={11} /> ENQUETE</span>)}
                                </div>
                                <div className="flex items-center gap-1.5 mt-3">
                                    <button onClick={() => publish(p.id)} data-testid={`draft-publish-${p.id}`} className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase px-3 py-1.5 rounded-full transition hover:translate-y-[-1px]" style={{ background: PT.ink, color: "#fff", letterSpacing: "0.14em", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10), 0 8px 18px -10px rgba(10,10,10,0.40)" }}><Send size={11} strokeWidth={2.6} /> Publicar</button>
                                    <button onClick={() => editDraft(p)} data-testid={`draft-edit-${p.id}`} className="inline-flex items-center gap-1 text-[11px] font-mono font-bold uppercase px-2 py-1 rounded-full" style={{ color: "rgba(10,10,10,0.62)", letterSpacing: "0.12em" }}>Editar</button>
                                    <button onClick={() => remove(p.id)} data-testid={`draft-delete-${p.id}`} className="ml-auto inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full" style={{ color: PT.red }}><Trash2 size={11} /></button>
                                </div>
                            </article>
                        ))}
                    </Grid>
                </>
            )}
            </div>
        </PageShell>
    );
}
