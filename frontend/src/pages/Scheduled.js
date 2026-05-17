import { useEffect, useMemo, useState } from "react";
import { Clock, Trash2, Send, Image as ImageIcon, BarChart3, Calendar, Search, X, CheckSquare, Square } from "lucide-react";
import { PageShell, PageHero, Grid, Empty } from "../components/PageShell";
import { PostSkeletonList } from "../components/Skeleton";
import { Avatar } from "../components/Avatar";
import { api, formatApiError, toastApiError } from "../lib/api";
import { smartTime, fullTime } from "../lib/time";
import { toast } from "sonner";
import { useNavigate, useOutletContext } from "react-router-dom";
import { confirmDialog, promptDialog } from "../components/ConfirmDialog";

function untilLabel(iso) {
    if (!iso) return "";
    const diff = new Date(iso).getTime() - Date.now();
    if (diff <= 0) return "a publicar...";
    const m = Math.floor(diff / 60000);
    if (m < 60) return `em ${m}m`;
    const h = Math.floor(m / 60);
    if (h < 24) return `em ${h}h`;
    const d = Math.floor(h / 24);
    return `em ${d}d`;
}

export default function Scheduled() {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [q, setQ] = useState("");
    const [sort, setSort] = useState("soonest");
    const [selected, setSelected] = useState(new Set());
    const navigate = useNavigate();
    const { openCompose } = useOutletContext() || {};

    const load = () => {
        setLoading(true);
        api.get("/posts/scheduled").then((r) => setPosts(r.data)).catch((e) => toastApiError(e)).finally(() => setLoading(false));
    };
    useEffect(() => { load(); }, []);

    const filtered = useMemo(() => {
        let list = posts.slice();
        if (q.trim()) { const n = q.toLowerCase(); list = list.filter((p) => (p.content || "").toLowerCase().includes(n)); }
        if (sort === "latest") list.sort((a, b) => (a.scheduled_at < b.scheduled_at ? 1 : -1));
        else list.sort((a, b) => (a.scheduled_at < b.scheduled_at ? -1 : 1));
        return list;
    }, [posts, q, sort]);

    const toggle = (id) => setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    const toggleAll = () => setSelected((prev) => prev.size === filtered.length ? new Set() : new Set(filtered.map((p) => p.id)));

    const publishNow = async (id) => {
        try { await api.post(`/posts/${id}/publish`); setPosts((prev) => prev.filter((p) => p.id !== id)); toast.success("Publicado agora"); }
        catch (e) { toastApiError(e); }
    };
    const remove = async (id) => {
        const ok = await confirmDialog({
            title: "Cancelar agendamento?",
            description: "A publicação agendada será apagada e nunca será publicada.",
            confirmText: "Cancelar agendamento",
            danger: true,
        });
        if (!ok) return;
        try { await api.delete(`/posts/${id}`); setPosts((prev) => prev.filter((p) => p.id !== id)); toast.success("Agendamento cancelado"); }
        catch (e) { toastApiError(e); }
    };
    const reschedule = async (id, currentIso) => {
        const def = currentIso ? currentIso.slice(0, 16).replace("T", " ") : "";
        const input = await promptDialog({
            title: "Reagendar publicação",
            description: "Indica a nova data e hora no formato AAAA-MM-DD HH:MM.",
            label: "Nova data",
            placeholder: "2025-12-31 14:30",
            defaultValue: def,
            maxLength: 20,
            confirmText: "Reagendar",
        });
        if (!input) return;
        let iso;
        try {
            iso = new Date(input.replace(" ", "T")).toISOString();
            if (!iso || new Date(iso).getTime() <= Date.now()) {
                toast.error("Tem de ser uma data futura válida");
                return;
            }
        } catch {
            toast.error("Data inválida");
            return;
        }
        try { await api.patch(`/posts/${id}`, { scheduled_at: iso }); load(); toast.success("Reagendado"); }
        catch (e) { toastApiError(e); }
    };
    const bulkPublish = async () => {
        if (!selected.size) return;
        const ok = await confirmDialog({
            title: `Publicar ${selected.size} ${selected.size === 1 ? "agendamento" : "agendamentos"} agora?`,
            description: "Todos serão publicados imediatamente, ignorando a data agendada.",
            confirmText: "Publicar agora",
        });
        if (!ok) return;
        for (const id of selected) { try { await api.post(`/posts/${id}/publish`); } catch {} }
        setPosts((prev) => prev.filter((p) => !selected.has(p.id))); setSelected(new Set()); toast.success("Publicados");
    };
    const bulkCancel = async () => {
        if (!selected.size) return;
        const ok = await confirmDialog({
            title: `Cancelar ${selected.size} ${selected.size === 1 ? "agendamento" : "agendamentos"}?`,
            description: "As publicações agendadas serão apagadas e nunca serão publicadas.",
            confirmText: "Cancelar todos",
            danger: true,
        });
        if (!ok) return;
        for (const id of selected) { try { await api.delete(`/posts/${id}`); } catch {} }
        setPosts((prev) => prev.filter((p) => !selected.has(p.id))); setSelected(new Set()); toast.success("Cancelados");
    };

    return (
        <PageShell max="max-w-5xl">
            <PageHero icon={Clock} title="Agendados" subtitle={`${posts.length} a aguardar`} />

            <div className="flex items-center gap-2 mb-4">
                <div className="flex-1 relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40" />
                    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquisar nos agendados..." data-testid="scheduled-search" className="w-full bg-black/[0.04] border border-transparent rounded-full pl-9 pr-9 py-2 text-[13px] focus:bg-white focus:border-black/15 outline-none transition" />
                    {q && (<button onClick={() => setQ("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-black/40"><X size={13} /></button>)}
                </div>
                <select value={sort} onChange={(e) => setSort(e.target.value)} data-testid="scheduled-sort" className="text-[12px] bg-black/[0.04] rounded-full px-3 py-2 font-medium text-black/65 outline-none">
                    <option value="soonest">Mais próximo</option>
                    <option value="latest">Mais distante</option>
                </select>
            </div>

            {selected.size > 0 && (
                <div className="mb-3 px-3 py-2 rounded-xl bg-black/[0.04] flex items-center gap-2">
                    <span className="text-[12px] font-mono text-black/65">{selected.size} selecionados</span>
                    <button onClick={bulkPublish} className="inline-flex items-center gap-1 chip-on text-xs font-heading font-semibold px-3 py-1.5 rounded-full"><Send size={11} /> Publicar já</button>
                    <button onClick={bulkCancel} className="inline-flex items-center gap-1 text-xs font-mono text-red-soft hover:bg-red-soft/10 px-3 py-1.5 rounded-full"><Trash2 size={11} /> Cancelar</button>
                    <button onClick={() => setSelected(new Set())} className="ml-auto text-[11px] font-mono text-black/55">limpar</button>
                </div>
            )}

            {loading ? (<PostSkeletonList count={3} />) : filtered.length === 0 ? (
                <Empty
                    icon={Clock}
                    title={q ? "Sem resultados" : "Nenhum agendamento"}
                    body="Programa publicações futuras a partir do compositor."
                    cta={!q ? "Agendar publicação" : null}
                    ctaOnClick={() => (openCompose ? openCompose() : navigate("/"))}
                />
            ) : (
                <>
                    <div className="mb-3 flex items-center gap-2">
                        <button onClick={toggleAll} className="inline-flex items-center gap-1.5 text-[11px] font-mono text-black/65 hover:text-black">
                            {selected.size === filtered.length && filtered.length > 0 ? <CheckSquare size={13} /> : <Square size={13} />}
                            selecionar todos
                        </button>
                        <span className="text-[11px] font-mono text-black/45 ml-auto">{filtered.length} visíveis</span>
                    </div>
                    <Grid cols={2} gap={3}>
                        {filtered.map((p) => (
                            <article key={p.id} data-testid={`scheduled-${p.id}`} className="rounded-2xl border border-black/[0.08] bg-white p-4 hover:border-black/25 transition">
                                <div className="flex items-start gap-2 mb-2">
                                    <button onClick={() => toggle(p.id)} className="mt-0.5 text-black/40 hover:text-black flex-shrink-0">
                                        {selected.has(p.id) ? <CheckSquare size={14} /> : <Square size={14} />}
                                    </button>
                                    <Avatar user={p.author} size={28} />
                                    <div className="flex-1 min-w-0">
                                        <div className="font-heading font-semibold text-[12px] truncate">{p.author?.name}</div>
                                        <span className="font-mono text-[10px] inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-blue-soft/15 text-blue-soft border border-blue-soft/30" title={fullTime(p.scheduled_at)}>
                                            <Calendar size={9} /> {untilLabel(p.scheduled_at)}
                                        </span>
                                    </div>
                                </div>
                                <p className="text-[13px] text-black/80 whitespace-pre-wrap line-clamp-3 min-h-[3.6em]">
                                    {p.content || <em className="text-black/40">sem texto</em>}
                                </p>
                                <div className="flex items-center gap-3 mt-2 text-[11px] font-mono text-black/40">
                                    <span title={fullTime(p.scheduled_at)}>{smartTime(p.scheduled_at)}</span>
                                    {p.images?.length > 0 && (<span className="inline-flex items-center gap-1"><ImageIcon size={11} /> {p.images.length}</span>)}
                                    {p.poll && (<span className="inline-flex items-center gap-1"><BarChart3 size={11} /> enquete</span>)}
                                </div>
                                <div className="flex items-center gap-1.5 mt-3">
                                    <button onClick={() => publishNow(p.id)} data-testid={`scheduled-publish-${p.id}`} className="inline-flex items-center gap-1.5 bg-black text-white text-[11px] font-heading font-semibold px-3 py-1.5 rounded-full hover:bg-black/85"><Send size={11} /> Publicar já</button>
                                    <button onClick={() => reschedule(p.id, p.scheduled_at)} data-testid={`scheduled-reschedule-${p.id}`} className="inline-flex items-center gap-1 text-[11px] font-mono text-black/65 hover:text-black px-2 py-1 rounded-full hover:bg-black/[0.04]"><Calendar size={11} /></button>
                                    <button onClick={() => remove(p.id)} data-testid={`scheduled-delete-${p.id}`} className="ml-auto inline-flex items-center gap-1 text-[11px] font-mono text-red-soft hover:bg-red-soft/10 px-2 py-1 rounded-full"><Trash2 size={11} /></button>
                                </div>
                            </article>
                        ))}
                    </Grid>
                </>
            )}
        </PageShell>
    );
}
