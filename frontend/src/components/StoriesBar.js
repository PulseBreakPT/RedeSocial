import { useEffect, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { api, formatApiError } from "../lib/api";
import { Avatar } from "./Avatar";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";

function StoryViewer({ groups, startIndex, onClose }) {
    const { user: me } = useAuth();
    const [gi, setGi] = useState(startIndex);
    const [si, setSi] = useState(0);
    const [progress, setProgress] = useState(0);
    const intervalRef = useRef(null);

    const group = groups[gi];
    const story = group?.stories[si];

    useEffect(() => {
        if (!story) return;
        api.post(`/stories/${story.id}/view`).catch(() => {});
        setProgress(0);
        const start = Date.now();
        const dur = 5000;
        intervalRef.current = setInterval(() => {
            const p = Math.min(100, ((Date.now() - start) / dur) * 100);
            setProgress(p);
            if (p >= 100) {
                clearInterval(intervalRef.current);
                next();
            }
        }, 50);
        return () => clearInterval(intervalRef.current);
        // eslint-disable-next-line
    }, [gi, si]);

    const next = () => {
        if (si + 1 < group.stories.length) {
            setSi(si + 1);
        } else if (gi + 1 < groups.length) {
            setGi(gi + 1);
            setSi(0);
        } else {
            onClose();
        }
    };

    const prev = () => {
        if (si > 0) setSi(si - 1);
        else if (gi > 0) {
            setGi(gi - 1);
            setSi(groups[gi - 1].stories.length - 1);
        }
    };

    if (!story) return null;
    const isMine = me?.id === group.author.id;

    return (
        <div className="fixed inset-0 z-[90] bg-black/95 grid place-items-center" onClick={onClose} data-testid="story-viewer">
            <div
                className="relative w-full max-w-md aspect-[9/16] bg-zinc-950 rounded-2xl overflow-hidden border border-zinc-800"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="absolute top-0 left-0 right-0 flex gap-1 p-2 z-30">
                    {group.stories.map((_, i) => (
                        <div key={i} className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-white transition-all"
                                style={{ width: `${i < si ? 100 : i === si ? progress : 0}%` }}
                            />
                        </div>
                    ))}
                </div>
                <div className="absolute top-5 left-3 right-3 flex items-center gap-3 z-30">
                    <Avatar user={group.author} size={36} className="border-2 border-white" />
                    <div className="flex-1">
                        <div className="text-white font-heading font-semibold text-sm">{group.author.name}</div>
                        <div className="text-zinc-400 font-mono text-xs">@{group.author.username}</div>
                    </div>
                    <button
                        onClick={onClose}
                        data-testid="story-close"
                        className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
                    >
                        <X size={16} />
                    </button>
                </div>

                <img src={story.image} alt="" className="w-full h-full object-cover" />

                {story.content && (
                    <div className="absolute bottom-16 left-4 right-4 z-30 text-white text-lg font-heading font-semibold drop-shadow-lg">
                        {story.content}
                    </div>
                )}

                {isMine && (
                    <button
                        data-testid="story-delete"
                        onClick={async () => {
                            try {
                                await api.delete(`/stories/${story.id}`);
                                toast.success("Story apagado");
                                onClose();
                            } catch (e) {
                                toast.error(formatApiError(e));
                            }
                        }}
                        className="absolute bottom-4 right-4 z-30 text-xs font-mono uppercase tracking-wide bg-black/60 hover:bg-accent-vermillion text-white px-3 py-1.5 rounded-full"
                    >
                        Apagar
                    </button>
                )}

                <button onClick={prev} className="absolute left-0 top-0 bottom-0 w-1/3 z-20" aria-label="anterior" />
                <button onClick={next} className="absolute right-0 top-0 bottom-0 w-1/3 z-20" aria-label="próximo" />
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
        if (file.size > 2 * 1024 * 1024) {
            toast.error("Imagem deve ter no máximo 2MB");
            return;
        }
        const reader = new FileReader();
        reader.onload = async (ev) => {
            setUploading(true);
            try {
                await api.post("/stories", { image: ev.target.result });
                toast.success("Story publicado por 24h");
                load();
            } catch (err) {
                toast.error(formatApiError(err));
            } finally {
                setUploading(false);
            }
        };
        reader.readAsDataURL(file);
    };

    const myGroup = groups.find((g) => g.author.id === user?.id);
    const others = groups.filter((g) => g.author.id !== user?.id);

    return (
        <div className="border-b border-zinc-900 px-5 py-4 overflow-x-auto" data-testid="stories-bar">
            <div className="flex gap-4 items-start">
                <button
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    data-testid="add-story-btn"
                    className="flex flex-col items-center gap-1.5 group flex-shrink-0"
                >
                    <div className="relative">
                        <div className="w-16 h-16 rounded-full border-2 border-dashed border-zinc-700 grid place-items-center group-hover:border-accent-vermillion transition">
                            <Avatar user={user} size={56} />
                        </div>
                        <div className="absolute -bottom-1 -right-1 bg-accent-vermillion text-white rounded-full p-1 border-2 border-[#0A0A0A]">
                            <Plus size={12} strokeWidth={3} />
                        </div>
                    </div>
                    <span className="font-mono text-xs text-zinc-500 group-hover:text-white">seu story</span>
                </button>
                <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" data-testid="story-file-input" />

                {myGroup && (
                    <StoryThumb
                        group={myGroup}
                        label="você"
                        onClick={() => setViewerIdx(groups.indexOf(myGroup))}
                    />
                )}

                {others.map((g) => (
                    <StoryThumb
                        key={g.author.id}
                        group={g}
                        label={`@${g.author.username}`}
                        onClick={() => setViewerIdx(groups.indexOf(g))}
                    />
                ))}
            </div>

            {viewerIdx !== null && (
                <StoryViewer
                    groups={groups}
                    startIndex={viewerIdx}
                    onClose={() => {
                        setViewerIdx(null);
                        load();
                    }}
                />
            )}
        </div>
    );
}

function StoryThumb({ group, label, onClick }) {
    return (
        <button
            onClick={onClick}
            data-testid={`story-thumb-${group.author.username}`}
            className="flex flex-col items-center gap-1.5 flex-shrink-0 group"
        >
            <div
                className={`p-[2.5px] rounded-full ${
                    group.has_unseen
                        ? "bg-gradient-to-tr from-accent-vermillion via-orange-500 to-pink-500"
                        : "bg-zinc-800"
                }`}
            >
                <div className="bg-[#0A0A0A] p-[2px] rounded-full">
                    <Avatar user={group.author} size={56} />
                </div>
            </div>
            <span className="font-mono text-xs text-zinc-500 group-hover:text-white max-w-[72px] truncate">{label}</span>
        </button>
    );
}
