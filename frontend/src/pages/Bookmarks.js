import { useEffect, useMemo, useState } from "react";
import { Bookmark, Plus, FolderPlus, Pencil, Trash2, Search, X, Image as ImageIcon, BarChart3, Type } from "lucide-react";
import { PostCard } from "../components/PostCard";
import { PostSkeletonList } from "../components/Skeleton";
import { PageHeader } from "../components/PageHeader";
import { api, formatApiError } from "../lib/api";
import { useLiveTime } from "../hooks/useLiveTime";
import { toast } from "sonner";

export default function Bookmarks() {
    const [posts, setPosts] = useState([]);
    const [collections, setCollections] = useState([]);
    const [activeCol, setActiveCol] = useState(""); // "" all, "uncategorized", or id
    const [type, setType] = useState("all"); // all | image | poll | text
    const [q, setQ] = useState("");
    const [loading, setLoading] = useState(true);
    const [showNew, setShowNew] = useState(false);
    const [newName, setNewName] = useState("");
    useLiveTime(30000);

    const loadCollections = async () => {
        try { const { data } = await api.get("/bookmark-collections"); setCollections(data); }
        catch {}
    };
    const loadPosts = async () => {
        setLoading(true);
        try {
            const params = activeCol ? `?collection=${activeCol}` : "";
            const { data } = await api.get(`/posts/bookmarks${params}`);
            setPosts(data);
        } finally { setLoading(false); }
    };
    useEffect(() => { loadCollections(); }, []);
    useEffect(() => { loadPosts(); }, [activeCol]);

    const filtered = useMemo(() => {
        let list = posts;
        if (type === "image") list = list.filter((p) => (p.images || []).length > 0);
        else if (type === "poll") list = list.filter((p) => !!p.poll);
        else if (type === "text") list = list.filter((p) => !(p.images || []).length && !p.poll);
        if (q.trim()) {
            const n = q.toLowerCase();
            list = list.filter((p) => (p.content || "").toLowerCase().includes(n));
        }
        return list;
    }, [posts, type, q]);

    const createCollection = async () => {
        if (!newName.trim()) return;
        try {
            const { data } = await api.post("/bookmark-collections", { name: newName.trim() });
            setCollections((prev) => [...prev, data]);
            setNewName("");
            setShowNew(false);
            toast.success("Coleção criada");
        } catch (e) { toast.error(formatApiError(e)); }
    };
    const renameCol = async (c) => {
        const name = window.prompt("Novo nome:", c.name);
        if (!name || name === c.name) return;
        try { await api.patch(`/bookmark-collections/${c.id}`, { name }); await loadCollections(); }
        catch (e) { toast.error(formatApiError(e)); }
    };
    const deleteCol = async (c) => {
        if (!window.confirm(`Apagar a coleção "${c.name}"?`)) return;
        try {
            await api.delete(`/bookmark-collections/${c.id}`);
            await loadCollections();
            if (activeCol === c.id) setActiveCol("");
            toast.success("Apagada");
        } catch (e) { toast.error(formatApiError(e)); }
    };

    return (
        <div data-testid="bookmarks-page">
            <PageHeader
                title="Guardados"
                subtitle={`${posts.length} ${posts.length === 1 ? "item" : "itens"} · ${collections.length} coleções`}
                back
                testid="bookmarks-header"
                action={
                    <button onClick={() => setShowNew(true)} data-testid="new-collection-btn" className="btn-obsidian px-3 py-2 text-[11px] flex items-center gap-1.5">
                        <FolderPlus size={12} /> Coleção
                    </button>
                }
            >
                <div className="px-3 lg:px-4 pb-2 flex flex-wrap items-center gap-2">
                    <div className="flex-1 min-w-[180px] relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40" />
                        <input
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Pesquisar nos guardados..."
                            className="w-full bg-black/[0.04] border border-transparent rounded-full pl-9 pr-9 py-2 text-[13px] focus:bg-white focus:border-black/15 outline-none transition"
                        />
                        {q && (<button onClick={() => setQ("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-black/40"><X size={13} /></button>)}
                    </div>
                    <div className="inline-flex bg-black/[0.04] rounded-full p-0.5">
                        {[
                            { k: "all", l: "Todos", I: Bookmark },
                            { k: "image", l: "Foto", I: ImageIcon },
                            { k: "poll", l: "Enquete", I: BarChart3 },
                            { k: "text", l: "Texto", I: Type },
                        ].map((t) => {
                            const Icon = t.I;
                            const active = type === t.k;
                            return (
                                <button key={t.k} onClick={() => setType(t.k)} data-testid={`bookmarks-type-${t.k}`} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium transition ${active ? "chip-on" : "text-black/55 hover:text-black"}`}>
                                    <Icon size={11} /> {t.l}
                                </button>
                            );
                        })}
                    </div>
                </div>
                <div className="px-3 lg:px-4 pb-2.5 flex gap-1.5 overflow-x-auto scrollbar-hide hairline-t pt-2">
                    <button onClick={() => setActiveCol("")} data-testid="bookmarks-col-all" className={`shrink-0 px-3 py-1.5 rounded-full text-[12px] font-medium ${activeCol === "" ? "chip-on" : "bg-black/[0.04] text-black/65 hover:bg-black/[0.08]"}`}>
                        Todos
                    </button>
                    <button onClick={() => setActiveCol("uncategorized")} className={`shrink-0 px-3 py-1.5 rounded-full text-[12px] font-medium ${activeCol === "uncategorized" ? "chip-on" : "bg-black/[0.04] text-black/65 hover:bg-black/[0.08]"}`}>
                        Sem coleção
                    </button>
                    {collections.map((c) => (
                        <div key={c.id} className="shrink-0 inline-flex items-center gap-0.5">
                            <button onClick={() => setActiveCol(c.id)} data-testid={`bookmarks-col-${c.id}`} className={`px-3 py-1.5 rounded-l-full text-[12px] font-medium ${activeCol === c.id ? "chip-on" : "bg-black/[0.04] text-black/65 hover:bg-black/[0.08]"}`}>
                                {c.name} <span className="opacity-60">{c.count}</span>
                            </button>
                            <button onClick={() => renameCol(c)} title="Renomear" className={`w-7 h-7 grid place-items-center text-[11px] ${activeCol === c.id ? "bg-black text-white/70" : "bg-black/[0.04] text-black/45 hover:text-black"}`}>
                                <Pencil size={11} />
                            </button>
                            <button onClick={() => deleteCol(c)} title="Apagar" className={`w-7 h-7 grid place-items-center rounded-r-full text-[11px] ${activeCol === c.id ? "bg-black text-white/70" : "bg-black/[0.04] text-black/45 hover:text-red-soft"}`}>
                                <Trash2 size={11} />
                            </button>
                        </div>
                    ))}
                </div>
            </PageHeader>

            {showNew && (
                <div className="fixed inset-0 z-[70] bg-black/30 backdrop-blur-sm flex items-end lg:items-center lg:justify-center p-0 lg:p-4" onClick={() => setShowNew(false)}>
                    <div onClick={(e) => e.stopPropagation()} className="w-full lg:max-w-sm bg-white border-t lg:border border-black/[0.08] rounded-t-3xl lg:rounded-2xl p-6 space-y-4 anim-sheet-up lg:anim-fade-up pb-safe">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="type-overline mb-1">Nova coleção</p>
                                <h2 className="font-display text-[24px] tracking-tight">Coleção</h2>
                            </div>
                            <button onClick={() => setShowNew(false)} className="w-9 h-9 rounded-full grid place-items-center hover:bg-black/[0.04]"><X size={16} /></button>
                        </div>
                        <input
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="Ex: Tascas Lisboa"
                            maxLength={30}
                            data-testid="new-collection-input"
                            autoFocus
                            className="w-full bg-[#fafafa] border border-black/[0.08] rounded-2xl px-4 py-3 focus:border-black/40 focus:bg-white focus:outline-none transition"
                        />
                        <button onClick={createCollection} data-testid="new-collection-submit" className="btn-obsidian w-full py-3 text-[12px]">
                            <Plus size={13} className="inline -mt-0.5 mr-1" /> Criar coleção
                        </button>
                    </div>
                </div>
            )}

            {loading ? (
                <PostSkeletonList count={3} />
            ) : filtered.length === 0 ? (
                <div className="px-6 py-20 text-center anim-fade-up">
                    <div className="ring-silver w-20 h-20 rounded-full grid place-items-center mx-auto mb-6">
                        <Bookmark size={26} strokeWidth={1.4} className="text-black/70" />
                    </div>
                    <p className="type-overline mb-2">Sem nada guardado</p>
                    <h3 className="font-display text-[19px] font-bold tracking-tight text-black">{q ? "Nada encontrado" : "Nada guardado ainda"}</h3>
                    <p className="text-black/55 text-sm mt-2">Toca no marcador de uma publicação para guardá-la.</p>
                </div>
            ) : (
                filtered.map((p) => (
                    <PostCard
                        key={p.id}
                        post={p}
                        onChange={(np) => setPosts((prev) => prev.map((x) => (x.id === np.id ? np : x)))}
                        onDelete={(id) => setPosts((prev) => prev.filter((x) => x.id !== id))}
                    />
                ))
            )}
        </div>
    );
}
