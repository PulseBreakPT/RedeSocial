import { useEffect, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { api, formatApiError, toastApiError } from "../lib/api";
import { Avatar } from "./Avatar";
import { useAuth } from "../context/AuthContext";
import { useEscapeKey } from "../hooks/useClickOutside";
import { toast } from "sonner";

function StoryViewer({ groups, startIndex, onClose }) {
    const { user: me } = useAuth();
    const [gi, setGi] = useState(startIndex);
    const [si, setSi] = useState(0);
    const [progress, setProgress] = useState(0);
    const [paused, setPaused] = useState(false);
    const intervalRef = useRef(null);
    const startRef = useRef(Date.now());
    const elapsedRef = useRef(0);

    const group = groups[gi];
    const story = group?.stories[si];

    useEscapeKey(onClose, true);

    useEffect(() => {
        if (!story) return;
        api.post(`/stories/${story.id}/view`).catch(() => {});
        setProgress(0);
        startRef.current = Date.now();
        elapsedRef.current = 0;
        const dur = 5000;
        intervalRef.current = setInterval(() => {
            if (paused) {
                startRef.current = Date.now() - elapsedRef.current;
                return;
            }
            elapsedRef.current = Date.now() - startRef.current;
            const p = Math.min(100, (elapsedRef.current / dur) * 100);
            setProgress(p);
            if (p >= 100) {
                clearInterval(intervalRef.current);
                next();
            }
        }, 50);
        return () => clearInterval(intervalRef.current);
        // eslint-disable-next-line
    }, [gi, si, paused]);

    const next = () => {
        if (si + 1 < group.stories.length) setSi(si + 1);
        else if (gi + 1 < groups.length) { setGi(gi + 1); setSi(0); }
        else onClose();
    };

    const prev = () => {
        if (si > 0) setSi(si - 1);
        else if (gi > 0) { setGi(gi - 1); setSi(groups[gi - 1].stories.length - 1); }
    };

    if (!story) return null;
    const isMine = me?.id === group.author.id;

    return (
        <div className="fixed inset-0 z-[90] bg-black/95 grid place-items-center" onClick={onClose} data-testid="story-viewer">
            <div className="relative w-full max-w-md aspect-[9/16] bg-black rounded-3xl overflow-hidden border border-white/10 shadow-[0_40px_100px_-10px_rgba(0,0,0,0.6)]" onClick={(e) => e.stopPropagation()}>
                <div className="absolute top-0 left-0 right-0 flex gap-1 p-3 z-30">
                    {group.stories.map((_, i) => (
                        <div key={i} className="flex-1 h-[2px] bg-white/25 rounded-full overflow-hidden">
                            <div className="h-full bg-white transition-all"
                                style={{ width: `${i < si ? 100 : i === si ? progress : 0}%` }} />
                        </div>
                    ))}
                </div>
                <div className="absolute top-7 left-3 right-3 flex items-center gap-3 z-30">
                    <Avatar user={group.author} size={36} className="ring-2 ring-white/80" />
                    <div className="flex-1">
                        <div className="text-white font-heading font-medium text-[14px] tracking-tight">{group.author.name}</div>
                        <div className="text-white/70 font-mono text-[11px]">@{group.author.username}</div>
                    </div>
                    <button onClick={onClose} data-testid="story-close" className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md tap-shrink">
                        <X size={16} strokeWidth={1.8} />
                    </button>
                </div>
                <img src={story.image} alt="" className="w-full h-full object-cover" />
                {story.content && (
                    <div className="absolute bottom-16 left-4 right-4 z-30 text-white font-display text-[22px] font-light tracking-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.7)]">
                        {story.content}
                    </div>
                )}
                {isMine && (
                    <button data-testid="story-delete"
                        onClick={async () => {
                            try { await api.delete(`/stories/${story.id}`); toast.success("Story apagado"); onClose(); }
                            catch (e) { toastApiError(e); }
                        }}
                        className="absolute bottom-4 right-4 z-30 text-[10px] font-mono uppercase tracking-[0.16em] bg-white/10 hover:bg-red-soft/85 text-white px-3 py-1.5 rounded-full backdrop-blur-md transition tap-shrink">
                        Apagar
                    </button>
                )}
                {/* Tap zones: left half = prev, right half = next. Long-press = pause. No dead zone. */}
                <button
                    onClick={prev}
                    onPointerDown={() => setPaused(true)}
                    onPointerUp={() => setPaused(false)}
                    onPointerLeave={() => setPaused(false)}
                    className="absolute left-0 top-16 bottom-12 w-1/2 z-20"
                    aria-label="anterior"
                    data-testid="story-prev"
                />
                <button
                    onClick={next}
                    onPointerDown={() => setPaused(true)}
                    onPointerUp={() => setPaused(false)}
                    onPointerLeave={() => setPaused(false)}
                    className="absolute right-0 top-16 bottom-12 w-1/2 z-20"
                    aria-label="próximo"
                    data-testid="story-next"
                />
            </div>
        </div>
    );
}

export function StoriesBar() {
    const { user } = useAuth();
    const fileRef = useRef(null);
    const [groups, setGroups] = useState([]);
    const [viewerIdx, setViewerIdx] = useState(null);
    const [uploading, setUploading] = useState(false);

    const load = async () => {
        try {
            const { data } = await api.get("/stories");
            setGroups(data);
        } catch {}
    };

    useEffect(() => {
        load();
        const id = setInterval(load, 30000);
        return () => clearInterval(id);
    }, []);

    const handleFile = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) { toast.error("Imagem não pode exceder 2MB"); return; }
        const reader = new FileReader();
        reader.onload = async (ev) => {
            setUploading(true);
            try {
                await api.post("/stories", { image: ev.target.result });
                toast.success("Story publicado por 24h");
                load();
            } catch (err) { toastApiError(err); }
            finally { setUploading(false); }
        };
        reader.readAsDataURL(file);
    };

    const myGroup = groups.find((g) => g.author.id === user?.id);
    const others = groups.filter((g) => g.author.id !== user?.id);

    return (
        <div className="hairline-b px-4 py-5 overflow-x-auto scroll-smooth no-scrollbar snap-x-stories" data-testid="stories-bar">
            <div className="flex gap-5 items-start">
                <button
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    data-testid="add-story-btn"
                    className="flex flex-col items-center gap-2 group flex-shrink-0 tap-shrink snap-start-x"
                >
                    <div className="relative">
                        <div className="w-[80px] h-[80px] rounded-full border-2 border-dashed border-black/15 grid place-items-center group-hover:border-[color:var(--atl-500)] transition">
                            <Avatar user={user} size={68} />
                        </div>
                        <div
                            className="absolute -bottom-0.5 -right-0.5 rounded-full w-7 h-7 grid place-items-center border-[3px] border-white shadow-md"
                            style={{ background: "var(--atl-500)", color: "#fff" }}
                        >
                            <Plus size={14} strokeWidth={2.6} />
                        </div>
                    </div>
                    <span className="text-[11px] font-medium tracking-tight text-black/55 group-hover:text-black max-w-[80px] truncate">O teu story</span>
                </button>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" data-testid="story-file-input" />

                {myGroup && (
                    <StoryThumb group={myGroup} label="tu" onClick={() => setViewerIdx(groups.indexOf(myGroup))} />
                )}
                {others.map((g) => (
                    <StoryThumb key={g.author.id} group={g} label={g.author.name?.split(" ")[0] || `@${g.author.username}`} onClick={() => setViewerIdx(groups.indexOf(g))} />
                ))}
            </div>

            {viewerIdx !== null && (
                <StoryViewer groups={groups} startIndex={viewerIdx} onClose={() => { setViewerIdx(null); load(); }} />
            )}
        </div>
    );
}

function StoryThumb({ group, label, onClick }) {
    return (
        <button
            onClick={onClick}
            data-testid={`story-thumb-${group.author.username}`}
            className="flex flex-col items-center gap-2 flex-shrink-0 group tap-shrink snap-start-x"
        >
            <div className={`p-[3px] rounded-full transition ${group.has_unseen ? "ring-atl" : "bg-black/10"}`}>
                <div className="p-[2.5px] rounded-full bg-white">
                    <Avatar user={group.author} size={68} />
                </div>
            </div>
            <span className="text-[11px] font-medium tracking-tight text-black/55 group-hover:text-black max-w-[80px] truncate">{label}</span>
        </button>
    );
}
