import { useEffect, useState } from "react";
import { ChevronLeft, Archive, Star, Trash2, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { api, toastApiError } from "../lib/api";
import { toast } from "sonner";
import { StoryViewer } from "../components/stories/StoryViewer";
import { bgCss } from "../components/stories/storyConstants";
import { useAuth } from "../context/AuthContext";

function relativeShort(iso) {
    const t = new Date(iso).getTime();
    const diff = Math.floor((Date.now() - t) / 1000);
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    if (diff < 86400 * 30) return `${Math.floor(diff / 86400)}d`;
    return new Date(iso).toLocaleDateString("pt-PT", { day: "2-digit", month: "short" });
}

export default function StoryArchive() {
    const { user } = useAuth();
    const [items, setItems] = useState(null);
    const [openIdx, setOpenIdx] = useState(null);

    const load = async () => {
        try {
            const { data } = await api.get("/stories/archive");
            setItems(data);
        } catch (e) { toastApiError(e); setItems([]); }
    };

    useEffect(() => { load(); }, []);

    const del = async (id) => {
        if (!window.confirm("Apagar definitivamente?")) return;
        try {
            await api.delete(`/stories/${id}`);
            toast.success("Apagado");
            load();
        } catch (e) { toastApiError(e); }
    };

    const addHL = async (id) => {
        const title = window.prompt("Nome do destaque");
        if (!title || !title.trim()) return;
        try {
            await api.post("/highlights", { title: title.trim(), cover: id, story_ids: [id] });
            toast.success("Adicionado a destaques");
            load();
        } catch (e) { toastApiError(e); }
    };

    const activeOnly = (items || []).filter(s => s.expires_at && new Date(s.expires_at).getTime() > Date.now());
    const expired = (items || []).filter(s => !s.expires_at || new Date(s.expires_at).getTime() <= Date.now());

    return (
        <div className="max-w-2xl mx-auto pb-20" data-testid="story-archive-page">
            <header className="hairline-b sticky top-0 z-30 bg-white/85 backdrop-blur px-4 lg:px-6 py-3 flex items-center gap-2">
                <Link to={`/u/${user?.username}`} className="p-1 -ml-1 rounded-full hover:bg-black/[0.06]" aria-label="voltar">
                    <ChevronLeft size={18} />
                </Link>
                <Archive size={15} className="text-coral" />
                <h1 className="font-display text-[19px] tracking-tight">Arquivo de stories</h1>
            </header>

            <div className="px-4 lg:px-6 py-4">
                <p className="font-mono text-[11px] text-black/45 mb-3">
                    Stories próprios — incluindo já expirados. Só tu vês esta página.
                </p>

                {items === null ? (
                    <div className="py-10 grid place-items-center"><Loader2 className="animate-spin text-black/40" size={20} /></div>
                ) : items.length === 0 ? (
                    <div className="py-12 text-center text-black/50 font-mono text-[11px]">
                        Ainda não publicaste nenhum story.
                    </div>
                ) : (
                    <>
                        {activeOnly.length > 0 && (
                            <>
                                <h2 className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-coral mb-2">Activos (24h)</h2>
                                <Grid items={activeOnly} all={items} onOpen={(idx) => setOpenIdx(idx)} onDel={del} onHL={addHL} />
                            </>
                        )}
                        {expired.length > 0 && (
                            <>
                                <h2 className={`font-mono text-[10.5px] uppercase tracking-[0.18em] text-black/55 mb-2 ${activeOnly.length ? "mt-6" : ""}`}>Expirados</h2>
                                <Grid items={expired} all={items} onOpen={(idx) => setOpenIdx(idx)} onDel={del} onHL={addHL} indexOffset={activeOnly.length} />
                            </>
                        )}
                    </>
                )}
            </div>

            {openIdx != null && items && (
                <StoryViewer
                    groups={[{ author: user, stories: items, has_unseen: false }]}
                    startIndex={0}
                    startSubIndex={openIdx}
                    onClose={() => { setOpenIdx(null); load(); }}
                    onChange={load}
                />
            )}
        </div>
    );
}

function Grid({ items, all, onOpen, onDel, onHL, indexOffset = 0 }) {
    return (
        <div className="grid grid-cols-3 gap-1.5">
            {items.map((s, i) => {
                const absIdx = (all || items).findIndex(x => x.id === s.id);
                const isImage = s.media_type === "image" && s.image;
                const isVideo = s.media_type === "video" && s.video;
                return (
                    <div key={s.id} className="relative group" data-testid={`archive-item-${s.id}`}>
                        <button
                            onClick={() => onOpen(absIdx >= 0 ? absIdx : i + indexOffset)}
                            className="block w-full aspect-[9/16] rounded-xl overflow-hidden bg-black/[0.04] hover:opacity-90 transition"
                            style={!isImage && !isVideo ? { background: bgCss(s.background) } : undefined}
                        >
                            {isImage && <img src={s.image} alt="" className="w-full h-full object-cover" />}
                            {isVideo && <video src={s.video} muted className="w-full h-full object-cover" />}
                            {!isImage && !isVideo && (
                                <div className="w-full h-full grid place-items-center p-2">
                                    <span className="text-white text-[10px] font-display text-center leading-tight line-clamp-4">{s.text_content || "—"}</span>
                                </div>
                            )}
                        </button>
                        <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-full bg-black/65 text-white text-[9px] font-mono">
                            {relativeShort(s.created_at)}
                        </div>
                        {s.viewers_count > 0 && (
                            <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded-full bg-black/65 text-white text-[9px] font-mono">
                                👁 {s.viewers_count}
                            </div>
                        )}
                        <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition">
                            <button onClick={() => onHL(s.id)} title="Adicionar a destaque" className="p-1.5 rounded-full bg-white/90 hover:bg-coral hover:text-white shadow">
                                <Star size={11} strokeWidth={2.2} />
                            </button>
                            <button onClick={() => onDel(s.id)} title="Apagar" className="p-1.5 rounded-full bg-white/90 hover:bg-red-500 hover:text-white shadow">
                                <Trash2 size={11} strokeWidth={2.2} />
                            </button>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
