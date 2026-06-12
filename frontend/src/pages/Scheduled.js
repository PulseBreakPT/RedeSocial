import { useEffect, useMemo, useState } from "react";
// =============================================================================
// DESIGN SYSTEM: LUSORAE EDITORIAL — ver /src/theme/EDITORIAL.md
// =============================================================================
import { Clock, Trash2, Send, Image as ImageIcon, BarChart3, Calendar, Search, X, CheckSquare, Square } from "lucide-react";
import { PageShell, PageHero, Grid, Empty } from "../components/PageShell";
import { PostSkeletonList } from "../components/Skeleton";
import { Avatar } from "../components/Avatar";
import { api, formatApiError, toastApiError } from "../lib/api";
import { smartTime, fullTime } from "../lib/time";
import { PT } from "../theme/editorial";
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
            <PageHero
                title="Agendados"
                subtitle={`${posts.length} a aguardar publicação automática`}
                badge="Programação editorial"
                accent={PT.azul}
            />

            <div className="px-4 lg:px-7 pt-6 pb-12">
            <div className="flex items-center gap-2 mb-4">
                <div className="flex-1 relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40" />
                    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquisar nos agendados..." data-testid="scheduled-search" className="w-full bg-white border border-black/[0.08] rounded-full pl-9 pr-9 py-2 text-[13px] focus:border-black/30 outline-none transition" style={{ boxShadow: "0 1px 2px rgba(10,10,10,0.04)" }} />
                    {q && (<button onClick={() => setQ("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-black/40"><X size={13} /></button>)}
                </div>
                <select value={sort} onChange={(e) => setSort(e.target.value)} data-testid="scheduled-sort" className="text-[12px] bg-white border border-black/[0.08] rounded-full px-3 py-2 font-bold uppercase outline-none" style={{ letterSpacing: "0.10em", color: PT.ink }}>
                    <option value="soonest">Mais próximo</option>
                    <option value="latest">Mais distante</option>
                </select>
            </div>

            {selected.size > 0 && (
                <div className="mb-3 px-3 py-2 rounded-2xl flex items-center gap-2" style={{ background: "#fff", border: "1px solid rgba(10,10,10,0.08)" }}>
                    <span className="text-[11px] font-mono font-bold uppercase" style={{ color: PT.ink, letterSpacing: "0.14em" }}>{selected.size} selecionados</span>
                    <button onClick={bulkPublish} className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase px-3 py-1.5 rounded-full transition hover:translate-y-[-1px]" style={{ background: PT.ink, color: "#fff", letterSpacing: "0.14em", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10), 0 8px 18px -10px rgba(10,10,10,0.40)" }}><Send size={11} strokeWidth={2.6} /> Publicar já</button>
                    <button onClick={bulkCancel} className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase px-3 py-1.5 rounded-full" style={{ background: "#fff", color: PT.red, border: `1px solid ${PT.red}40`, letterSpacing: "0.14em" }}><Trash2 size={11} strokeWidth={2.4} /> Cancelar</button>
                    <button onClick={() => setSelected(new Set())} className="ml-auto text-[11px] font-mono font-bold uppercase" style={{ color: "rgba(10,10,10,0.55)", letterSpacing: "0.14em" }}>limpar</button>
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
                        <button onClick={toggleAll} className="inline-flex items-center gap-1.5 text-[11px] font-mono font-bold uppercase" style={{ color: "rgba(10,10,10,0.55)", letterSpacing: "0.14em" }}>
                            {selected.size === filtered.length && filtered.length > 0 ? <CheckSquare size={13} /> : <Square size={13} />}
                            Selecionar todos
                        </button>
                        <span className="text-[11px] font-mono font-bold uppercase ml-auto" style={{ color: "rgba(10,10,10,0.45)", letterSpacing: "0.14em" }}>{filtered.length} visíveis</span>
                    </div>
                    <Grid cols={2} gap={3}>
                        {filtered.map((p) => (
                            <article key={p.id} data-testid={`scheduled-${p.id}`} className="p-4 transition hover:translate-y-[-1px]" style={{ background: "#fff", border: "1px solid rgba(10,10,10,0.08)", borderRadius: 18, boxShadow: "0 1px 2px rgba(10,10,10,0.04), 0 10px 22px -14px rgba(10,10,10,0.10)" }}>
                                <div className="flex items-start gap-2 mb-2">
                                    <button onClick={() => toggle(p.id)} className="mt-0.5 flex-shrink-0" style={{ color: selected.has(p.id) ? PT.ink : "rgba(10,10,10,0.40)" }}>
                                        {selected.has(p.id) ? <CheckSquare size={14} /> : <Square size={14} />}
                                    </button>
                                    <Avatar user={p.author} size={28} />
                                    <div className="flex-1 min-w-0">
                                        <div className="font-black text-[12.5px] tracking-tight truncate" style={{ color: PT.ink }}>{p.author?.name}</div>
                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[10px] font-bold uppercase mt-0.5" style={{ background: `${PT.azul}12`, color: PT.azul, border: `1px solid ${PT.azul}30`, letterSpacing: "0.06em" }} title={fullTime(p.scheduled_at)}>
                                            <Calendar size={9} strokeWidth={2.6} /> {untilLabel(p.scheduled_at)}
                                        </span>
                                    </div>
                                </div>
                                <p className="text-[13px] whitespace-pre-wrap line-clamp-3 min-h-[3.6em] font-medium" style={{ color: "rgba(10,10,10,0.78)" }}>
                                    {p.content || <em style={{ color: "rgba(10,10,10,0.40)" }}>sem texto</em>}
                                </p>
                                <div className="flex items-center gap-3 mt-2 text-[10.5px] font-mono font-bold uppercase" style={{ color: "rgba(10,10,10,0.42)", letterSpacing: "0.06em" }}>
                                    <span title={fullTime(p.scheduled_at)}>{smartTime(p.scheduled_at)}</span>
                                    {p.images?.length > 0 && (<span className="inline-flex items-center gap-1"><ImageIcon size={11} /> {p.images.length}</span>)}
                                    {p.poll && (<span className="inline-flex items-center gap-1"><BarChart3 size={11} /> ENQUETE</span>)}
                                </div>
                                <div className="flex items-center gap-1.5 mt-3">
                                    <button onClick={() => publishNow(p.id)} data-testid={`scheduled-publish-${p.id}`} className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase px-3 py-1.5 rounded-full transition hover:translate-y-[-1px]" style={{ background: PT.ink, color: "#fff", letterSpacing: "0.14em", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10), 0 8px 18px -10px rgba(10,10,10,0.40)" }}><Send size={11} strokeWidth={2.6} /> Publicar já</button>
                                    <button onClick={() => reschedule(p.id, p.scheduled_at)} data-testid={`scheduled-reschedule-${p.id}`} className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full" style={{ color: "rgba(10,10,10,0.62)" }}><Calendar size={11} /></button>
                                    <button onClick={() => remove(p.id)} data-testid={`scheduled-delete-${p.id}`} className="ml-auto inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-full" style={{ color: PT.red }}><Trash2 size={11} /></button>
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
