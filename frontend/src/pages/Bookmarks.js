import { useEffect, useMemo, useState } from "react";
// =============================================================================
// DESIGN SYSTEM: LUSORAE EDITORIAL — Guardados (Bookmarks)
// Masthead editorial + filtros pill + coleções inline + estado vazio editorial.
// =============================================================================
import { Bookmark, Plus, FolderPlus, Pencil, Trash2, Search, X, Image as ImageIcon, BarChart3, Type, Compass } from "lucide-react";
import { Link } from "react-router-dom";
import { PostCard } from "../components/PostCard";
import { PostSkeletonList } from "../components/Skeleton";
import { PageShell, PageHero, Empty } from "../components/PageShell";
import { PT } from "../theme/editorial";
import { api, toastApiError } from "../lib/api";
import { useLiveTime } from "../hooks/useLiveTime";
import { useEscapeKey } from "../hooks/useClickOutside";
import { toast } from "sonner";
import { confirmDialog, promptDialog } from "../components/ConfirmDialog";

export default function Bookmarks() {
    const [posts, setPosts] = useState([]);
    const [collections, setCollections] = useState([]);
    const [activeCol, setActiveCol] = useState("");
    const [type, setType] = useState("all");
    const [q, setQ] = useState("");
    const [loading, setLoading] = useState(true);
    const [showNew, setShowNew] = useState(false);
    const [newName, setNewName] = useState("");
    useLiveTime(30000);
    useEscapeKey(() => setShowNew(false), showNew);

    const loadCollections = async () => {
        try { const { data } = await api.get("/bookmark-collections"); setCollections(data); }
        catch { /* silent */ }
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
    useEffect(() => { loadPosts(); /* eslint-disable-next-line */ }, [activeCol]);

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
        } catch (e) { toastApiError(e); }
    };
    const renameCol = async (c) => {
        const name = await promptDialog({
            title: "Renomear coleção", label: "Novo nome", defaultValue: c.name, maxLength: 60, confirmText: "Renomear",
        });
        if (!name || name === c.name) return;
        try { await api.patch(`/bookmark-collections/${c.id}`, { name }); await loadCollections(); toast.success("Renomeada"); }
        catch (e) { toastApiError(e); }
    };
    const deleteCol = async (c) => {
        const ok = await confirmDialog({
            title: `Apagar a coleção "${c.name}"?`,
            description: "Os posts guardados não são apagados — apenas perdem a associação a esta coleção.",
            confirmText: "Apagar coleção", danger: true,
        });
        if (!ok) return;
        try {
            await api.delete(`/bookmark-collections/${c.id}`);
            await loadCollections();
            if (activeCol === c.id) setActiveCol("");
            toast.success("Apagada");
        } catch (e) { toastApiError(e); }
    };

    const TYPES = [
        { k: "all",   l: "Todos",   I: Bookmark },
        { k: "image", l: "Foto",    I: ImageIcon },
        { k: "poll",  l: "Enquete", I: BarChart3 },
        { k: "text",  l: "Texto",   I: Type },
    ];

    return (
        <PageShell max="max-w-5xl">
            <PageHero
                title="Guardados"
                subtitle={`${posts.length} ${posts.length === 1 ? "item" : "itens"} · ${collections.length} ${collections.length === 1 ? "coleção" : "coleções"}`}
                badge="Os teus marcadores"
                accent={PT.gold}
                actions={
                    <button onClick={() => setShowNew(true)} data-testid="new-collection-btn"
                        className="inline-flex items-center gap-1.5 h-10 px-4 font-black uppercase transition hover:translate-y-[-1px]"
                        style={{
                            background: PT.ink, color: "#fff", borderRadius: 999,
                            fontSize: 11.5, letterSpacing: "0.14em",
                            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10), 0 12px 28px -10px rgba(10,10,10,0.40)",
                        }}>
                        <FolderPlus size={13} strokeWidth={2.5} /> Nova coleção
                    </button>
                }
            />

            <div className="px-4 lg:px-7 pt-6 pb-12">
                {/* Search + type filter */}
                <div className="flex flex-wrap items-center gap-2 mb-4">
                    <div className="flex-1 min-w-[180px] relative">
                        <Search size={14} strokeWidth={2.2} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "rgba(10,10,10,0.45)" }} />
                        <input
                            value={q}
                            onChange={(e) => setQ(e.target.value)}
                            placeholder="Pesquisar nos guardados…"
                            data-testid="bookmarks-search"
                            className="w-full pl-10 pr-9 py-2.5 text-[13.5px] outline-none font-medium"
                            style={{
                                background: "#fff",
                                border: "1px solid rgba(10,10,10,0.08)",
                                borderRadius: 999,
                                color: PT.ink,
                                boxShadow: "0 1px 2px rgba(10,10,10,0.04)",
                            }}
                        />
                        {q && (<button onClick={() => setQ("")} className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "rgba(10,10,10,0.55)" }}><X size={13} /></button>)}
                    </div>
                    <div className="flex gap-1.5">
                        {TYPES.map((t) => {
                            const Icon = t.I;
                            const active = type === t.k;
                            return (
                                <button key={t.k} onClick={() => setType(t.k)} data-testid={`bookmarks-type-${t.k}`}
                                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[11.5px] font-black uppercase transition hover:translate-y-[-1px]"
                                    style={{
                                        background: active ? PT.ink : "#fff",
                                        color: active ? "#fff" : PT.ink,
                                        border: active ? "1px solid transparent" : "1px solid rgba(10,10,10,0.10)",
                                        borderRadius: 999,
                                        letterSpacing: "0.14em",
                                        boxShadow: active ? "inset 0 1px 0 rgba(255,255,255,0.10), 0 8px 18px -10px rgba(10,10,10,0.30)" : "0 1px 2px rgba(10,10,10,0.04)",
                                    }}>
                                    <Icon size={12} strokeWidth={2.4} /> {t.l}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Collections row */}
                <div className="flex gap-2 overflow-x-auto no-scrollbar mb-6 pb-1">
                    <button onClick={() => setActiveCol("")} data-testid="bookmarks-col-all"
                        className="shrink-0 px-3.5 py-1.5 text-[11.5px] font-black uppercase transition"
                        style={{
                            background: activeCol === "" ? PT.ink : "#fff",
                            color: activeCol === "" ? "#fff" : PT.ink,
                            border: activeCol === "" ? "1px solid transparent" : "1px solid rgba(10,10,10,0.10)",
                            borderRadius: 999,
                            letterSpacing: "0.14em",
                            boxShadow: activeCol === "" ? "inset 0 1px 0 rgba(255,255,255,0.10), 0 8px 18px -10px rgba(10,10,10,0.30)" : "0 1px 2px rgba(10,10,10,0.04)",
                        }}>
                        Todos
                    </button>
                    <button onClick={() => setActiveCol("uncategorized")}
                        className="shrink-0 px-3.5 py-1.5 text-[11.5px] font-black uppercase transition"
                        style={{
                            background: activeCol === "uncategorized" ? PT.ink : "#fff",
                            color: activeCol === "uncategorized" ? "#fff" : PT.ink,
                            border: activeCol === "uncategorized" ? "1px solid transparent" : "1px solid rgba(10,10,10,0.10)",
                            borderRadius: 999,
                            letterSpacing: "0.14em",
                            boxShadow: activeCol === "uncategorized" ? "inset 0 1px 0 rgba(255,255,255,0.10), 0 8px 18px -10px rgba(10,10,10,0.30)" : "0 1px 2px rgba(10,10,10,0.04)",
                        }}>
                        Sem coleção
                    </button>
                    {collections.map((c) => {
                        const active = activeCol === c.id;
                        return (
                            <div key={c.id} className="shrink-0 inline-flex items-center" style={{ background: active ? PT.ink : "#fff", border: active ? "1px solid transparent" : "1px solid rgba(10,10,10,0.10)", borderRadius: 999, boxShadow: active ? "inset 0 1px 0 rgba(255,255,255,0.10), 0 8px 18px -10px rgba(10,10,10,0.30)" : "0 1px 2px rgba(10,10,10,0.04)" }}>
                                <button onClick={() => setActiveCol(c.id)} data-testid={`bookmarks-col-${c.id}`}
                                    className="pl-3.5 pr-2 py-1.5 text-[11.5px] font-black uppercase inline-flex items-center gap-1.5"
                                    style={{ color: active ? "#fff" : PT.ink, letterSpacing: "0.14em" }}>
                                    {c.name} <span className="opacity-60 tabular-nums font-mono">{c.count}</span>
                                </button>
                                <button onClick={() => renameCol(c)} title="Renomear" className="w-7 h-7 grid place-items-center" style={{ color: active ? "rgba(255,255,255,0.65)" : "rgba(10,10,10,0.45)" }}>
                                    <Pencil size={11} />
                                </button>
                                <button onClick={() => deleteCol(c)} title="Apagar" className="w-7 h-7 grid place-items-center pr-1" style={{ color: active ? "rgba(255,255,255,0.65)" : "rgba(10,10,10,0.45)" }}>
                                    <Trash2 size={11} />
                                </button>
                            </div>
                        );
                    })}
                </div>

                {showNew && (
                    <div className="fixed inset-0 z-[70] flex items-end lg:items-center lg:justify-center p-0 lg:p-4" style={{ background: "rgba(10,10,10,0.35)", backdropFilter: "blur(6px)" }} onClick={() => setShowNew(false)}>
                        <div onClick={(e) => e.stopPropagation()} className="w-full lg:max-w-sm anim-sheet-up lg:anim-fade-up pb-safe p-6 space-y-4" style={{ background: "#fff", border: "1px solid rgba(10,10,10,0.08)", borderRadius: 24, boxShadow: "0 1px 2px rgba(10,10,10,0.06), 0 24px 50px -25px rgba(10,10,10,0.30)" }}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-mono font-bold uppercase mb-1.5" style={{ fontSize: 10.5, letterSpacing: "0.22em", color: "rgba(10,10,10,0.45)" }}>Nova coleção</p>
                                    <h2 className="font-black tracking-[-0.025em] leading-tight" style={{ fontSize: 28, color: PT.ink }}>Criar coleção<span style={{ color: PT.gold }}>.</span></h2>
                                </div>
                                <button onClick={() => setShowNew(false)} className="w-9 h-9 rounded-full grid place-items-center" style={{ color: "rgba(10,10,10,0.55)" }}><X size={16} /></button>
                            </div>
                            <input
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="Ex: Tascas Lisboa"
                                maxLength={30}
                                data-testid="new-collection-input"
                                autoFocus
                                className="w-full px-4 py-3 outline-none transition"
                                style={{
                                    background: "#fff",
                                    border: "1px solid rgba(10,10,10,0.10)",
                                    borderRadius: 999,
                                    color: PT.ink,
                                    fontSize: 14,
                                }}
                            />
                            <button onClick={createCollection} data-testid="new-collection-submit"
                                className="w-full h-12 inline-flex items-center justify-center gap-2 text-[12.5px] font-black uppercase transition hover:translate-y-[-1px]"
                                style={{
                                    background: PT.ink, color: "#fff", borderRadius: 999,
                                    letterSpacing: "0.14em",
                                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10), 0 12px 28px -10px rgba(10,10,10,0.40)",
                                }}>
                                <Plus size={13} strokeWidth={2.6} /> Criar coleção
                            </button>
                        </div>
                    </div>
                )}

                {loading ? (
                    <PostSkeletonList count={3} />
                ) : filtered.length === 0 ? (
                    <Empty
                        icon={Bookmark}
                        title={q ? "Nada encontrado" : "Nada guardado ainda"}
                        body="Toca no marcador de uma publicação para a guardares aqui."
                        cta={!q ? "Explorar publicações" : null}
                        ctaTo="/explore"
                    />
                ) : (
                    <div className="space-y-0 -mx-4 lg:-mx-7">
                        {filtered.map((p) => (
                            <PostCard
                                key={p.id}
                                post={p}
                                onChange={(np) => {
                                    if (np && np.bookmarked === false) {
                                        setPosts((prev) => prev.filter((x) => x.id !== np.id));
                                    } else {
                                        setPosts((prev) => prev.map((x) => (x.id === np.id ? np : x)));
                                    }
                                }}
                                onDelete={(id) => setPosts((prev) => prev.filter((x) => x.id !== id))}
                            />
                        ))}
                    </div>
                )}
            </div>
            {/* Wrapper for the optional <Link> import (avoid lint warning if unused) */}
            {false && <Link to="/" />}
        </PageShell>
    );
}
