import { useEffect, useState } from "react";
import { Plus, X, Loader2, ChevronRight, Check, Trash2 } from "lucide-react";
import { api, toastApiError } from "../../lib/api";
import { toast } from "sonner";
import { useEscapeKey } from "../../hooks/useClickOutside";
import { StoryViewer } from "./StoryViewer";
import { bgCss } from "./storyConstants";
import "./stories.css";

export function StoryHighlights({ username, isSelf }) {
    const [items, setItems] = useState(null);
    const [creator, setCreator] = useState(false);
    const [openId, setOpenId] = useState(null);

    const load = async () => {
        try {
            const { data } = await api.get(`/users/${username}/highlights`);
            setItems(data);
        } catch { setItems([]); }
    };

    useEffect(() => { load(); }, [username]);

    if (items === null) {
        return (
            <div className="px-3 sm:px-4 lg:px-6 mt-4" data-testid="story-highlights-loading">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-black/45">Destaques</h3>
                </div>
                <div className="flex gap-3 sm:gap-4 overflow-x-auto no-scrollbar pb-1">
                    {[0, 1, 2, 3].map((i) => (
                        <div key={i} className="flex flex-col items-center gap-2 flex-shrink-0">
                            <div className="w-[68px] sm:w-[72px] h-[68px] sm:h-[72px] rounded-full bg-black/[0.06] sv-skel" />
                            <div className="w-12 h-2 rounded bg-black/[0.06] sv-skel" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    if (!isSelf && items.length === 0) return null;

    return (
        <div className="px-3 sm:px-4 lg:px-6 mt-4" data-testid="story-highlights">
            <div className="flex items-center justify-between mb-2">
                <h3 className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-black/45">Destaques</h3>
                {isSelf && items.length > 0 && (
                    <button onClick={() => setCreator(true)} className="text-[11px] font-mono text-coral hover:underline">
                        + Novo destaque
                    </button>
                )}
            </div>
            <div className="flex gap-3 sm:gap-4 overflow-x-auto no-scrollbar pb-1">
                {isSelf && items.length === 0 && (
                    <button
                        onClick={() => setCreator(true)}
                        data-testid="highlight-create-empty"
                        className="flex flex-col items-center gap-2 flex-shrink-0 group tap-shrink"
                    >
                        <div className="w-[68px] sm:w-[72px] h-[68px] sm:h-[72px] rounded-full border-2 border-dashed border-black/15 grid place-items-center group-hover:border-black transition">
                            <Plus size={18} strokeWidth={1.8} className="text-black/55 group-hover:text-black" />
                        </div>
                        <span className="text-[10.5px] font-medium tracking-tight text-black/55">Novo</span>
                    </button>
                )}
                {items.map((h) => (
                    <HighlightThumb key={h.id} h={h} onClick={() => setOpenId(h.id)} />
                ))}
                {isSelf && items.length > 0 && (
                    <button
                        onClick={() => setCreator(true)}
                        data-testid="highlight-create"
                        className="flex flex-col items-center gap-2 flex-shrink-0 group tap-shrink"
                    >
                        <div className="w-[68px] sm:w-[72px] h-[68px] sm:h-[72px] rounded-full border-2 border-dashed border-black/15 grid place-items-center group-hover:border-black transition">
                            <Plus size={18} strokeWidth={1.8} className="text-black/55 group-hover:text-black" />
                        </div>
                        <span className="text-[10.5px] font-medium tracking-tight text-black/55">Novo</span>
                    </button>
                )}
            </div>

            {creator && (
                <HighlightCreatorModal
                    onClose={() => setCreator(false)}
                    onCreated={() => { setCreator(false); load(); }}
                />
            )}

            {openId && (
                <HighlightViewer
                    highlightId={openId}
                    isSelf={isSelf}
                    onClose={() => { setOpenId(null); load(); }}
                />
            )}
        </div>
    );
}

function HighlightThumb({ h, onClick }) {
    const cover = h.cover_resolved || {};
    const isImage = cover.media_type === "image" && cover.image;
    return (
        <button
            onClick={onClick}
            data-testid={`highlight-${h.id}`}
            className="flex flex-col items-center gap-2 flex-shrink-0 group tap-shrink"
        >
            <div className="w-[68px] sm:w-[72px] h-[68px] sm:h-[72px] rounded-full p-[2.5px] hl-ring group-hover:scale-105 transition">
                <div className="w-full h-full rounded-full overflow-hidden bg-white p-[2px]">
                    <div className="w-full h-full rounded-full overflow-hidden grid place-items-center"
                        style={!isImage ? { background: bgCss(cover.background || "coral") } : undefined}>
                        {isImage ? (
                            <img src={cover.image} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-white font-display text-[15px] tracking-tight px-1 text-center leading-none">
                                {h.title.charAt(0)}
                            </span>
                        )}
                    </div>
                </div>
            </div>
            <span className="text-[10.5px] font-medium tracking-tight text-black/65 max-w-[72px] truncate group-hover:text-black">
                {h.title}
            </span>
        </button>
    );
}

function HighlightViewer({ highlightId, isSelf, onClose }) {
    const [data, setData] = useState(null);
    const [busy, setBusy] = useState(false);
    useEffect(() => {
        api.get(`/highlights/${highlightId}`)
           .then((r) => setData(r.data))
           .catch((e) => { toastApiError(e); onClose(); });
    }, [highlightId]);

    const deleteH = async () => {
        if (!window.confirm("Apagar este destaque? (os stories originais não são apagados)")) return;
        setBusy(true);
        try {
            await api.delete(`/highlights/${highlightId}`);
            toast.success("Destaque apagado");
            onClose();
        } catch (e) { toastApiError(e); }
        finally { setBusy(false); }
    };

    if (!data) {
        return (
            <div className="fixed inset-0 z-[95] bg-black/85 grid place-items-center">
                <Loader2 className="text-white animate-spin" size={28} />
            </div>
        );
    }

    if (!data.stories?.length) {
        return (
            <div className="fixed inset-0 z-[95] bg-black/90 grid place-items-center p-6 text-center text-white">
                <div>
                    <p className="font-display text-[20px] tracking-tight mb-2">{data.highlight.title}</p>
                    <p className="font-mono text-[12px] text-white/65 mb-4">Este destaque ainda não tem stories.</p>
                    <button onClick={onClose} className="px-4 py-2 rounded-full bg-white text-black font-mono uppercase text-[11px] tracking-wider">Fechar</button>
                    {isSelf && (
                        <button onClick={deleteH} disabled={busy} className="mt-2 block mx-auto px-4 py-2 rounded-full bg-red-500/85 text-white font-mono uppercase text-[11px] tracking-wider">
                            <Trash2 size={11} className="inline mr-1" /> Apagar destaque
                        </button>
                    )}
                </div>
            </div>
        );
    }

    // Adapt to StoryViewer's expected "groups" shape
    const groups = [{
        author: data.owner,
        stories: data.stories,
        has_unseen: false,
    }];

    return (
        <>
            <StoryViewer groups={groups} startIndex={0} startSubIndex={0} onClose={onClose} onChange={() => {}} />
            {isSelf && (
                <button
                    onClick={deleteH}
                    disabled={busy}
                    className="fixed top-3 left-3 z-[96] px-3 py-1.5 rounded-full bg-red-500/85 hover:bg-red-500 text-white font-mono uppercase text-[10px] tracking-wider"
                >
                    <Trash2 size={11} className="inline mr-1" /> Destaque
                </button>
            )}
        </>
    );
}

function HighlightCreatorModal({ onClose, onCreated }) {
    const [title, setTitle] = useState("");
    const [archive, setArchive] = useState(null);
    const [selected, setSelected] = useState(new Set());
    const [busy, setBusy] = useState(false);
    useEscapeKey(onClose, true);

    useEffect(() => {
        api.get("/stories/archive").then((r) => setArchive(r.data)).catch((e) => { toastApiError(e); setArchive([]); });
    }, []);

    const toggle = (id) => {
        const next = new Set(selected);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelected(next);
    };

    const submit = async () => {
        if (!title.trim()) { toast.error("Dá um nome ao destaque"); return; }
        if (selected.size === 0) { toast.error("Escolhe ao menos 1 story"); return; }
        setBusy(true);
        try {
            const ids = Array.from(selected);
            await api.post("/highlights", { title: title.trim(), story_ids: ids, cover: ids[0] });
            toast.success("Destaque criado ✨");
            onCreated?.();
        } catch (e) { toastApiError(e); }
        finally { setBusy(false); }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-black/65 backdrop-blur-sm flex items-end lg:items-center justify-center p-0 lg:p-6" onClick={onClose} data-testid="highlight-creator">
            <div
                className="w-full max-w-md lg:rounded-3xl rounded-t-3xl bg-white shadow-2xl flex flex-col overflow-hidden"
                style={{ maxHeight: "92vh", paddingBottom: "env(safe-area-inset-bottom)" }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="px-5 pt-4 pb-2 flex items-center gap-2 border-b border-black/[0.06]">
                    <h3 className="flex-1 font-display text-[18px] tracking-tight">Novo destaque</h3>
                    <button onClick={onClose}><X size={16} /></button>
                </div>
                <div className="px-5 py-3">
                    <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value.slice(0, 24))}
                        placeholder="Nome (ex: Lisboa 2025)"
                        data-testid="highlight-title-input"
                        className="w-full px-3 py-2 rounded-xl border border-black/15 outline-none focus:border-black text-[14px]"
                    />
                    <div className="mt-3 text-[10.5px] font-mono uppercase tracking-[0.16em] text-black/45">
                        Escolhe stories ({selected.size}{archive ? `/${archive.length}` : ""})
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto px-5 pb-3">
                    {archive === null ? (
                        <div className="py-10 grid place-items-center"><Loader2 className="animate-spin text-black/35" size={20} /></div>
                    ) : archive.length === 0 ? (
                        <div className="py-10 text-center font-mono text-[11px] text-black/45">Ainda não tens stories no arquivo.</div>
                    ) : (
                        <div className="grid grid-cols-3 gap-2">
                            {archive.map((s) => {
                                const on = selected.has(s.id);
                                const isImage = s.media_type === "image" && s.image;
                                const isVideo = s.media_type === "video" && s.video;
                                return (
                                    <button
                                        key={s.id}
                                        onClick={() => toggle(s.id)}
                                        data-testid={`hl-pick-${s.id}`}
                                        className={`relative aspect-[9/16] rounded-xl overflow-hidden border-2 transition ${on ? "border-black ring-2 ring-black/30" : "border-transparent hover:border-black/15"}`}
                                        style={!isImage && !isVideo ? { background: bgCss(s.background) } : undefined}
                                    >
                                        {isImage && <img src={s.image} alt="" className="w-full h-full object-cover" />}
                                        {isVideo && <video src={s.video} muted className="w-full h-full object-cover" />}
                                        {!isImage && !isVideo && (
                                            <div className="absolute inset-0 grid place-items-center p-2">
                                                <span className="text-white text-[10px] font-display text-center leading-tight line-clamp-4">{s.text_content || "—"}</span>
                                            </div>
                                        )}
                                        {on && (
                                            <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black grid place-items-center text-white">
                                                <Check size={11} strokeWidth={3} />
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
                <div className="px-5 py-3 border-t border-black/[0.06]">
                    <button
                        onClick={submit}
                        disabled={busy}
                        data-testid="highlight-submit"
                        className="w-full px-4 py-2.5 rounded-full bg-black text-white font-mono uppercase text-[11px] tracking-wider hover:bg-black/85 disabled:opacity-50 inline-flex items-center justify-center gap-1.5"
                    >
                        {busy ? <Loader2 size={12} className="animate-spin" /> : <ChevronRight size={13} />}
                        Criar destaque
                    </button>
                </div>
            </div>
        </div>
    );
}
