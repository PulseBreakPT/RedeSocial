import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { api } from "../lib/api";
import { Avatar } from "./Avatar";
import { useAuth } from "../context/AuthContext";
import { StoryViewer } from "./stories/StoryViewer";
import { StoryComposer } from "./stories/StoryComposer";
import "./stories/stories.css";

export function StoriesBar() {
    const { user } = useAuth();
    const [groups, setGroups] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewer, setViewer] = useState(null);
    const [composerOpen, setComposerOpen] = useState(false);

    const load = async () => {
        try {
            const { data } = await api.get("/stories");
            setGroups(data);
        } catch {
            // silent
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        const id = setInterval(load, 30000);
        return () => clearInterval(id);
    }, []);

    const myGroup = groups.find((g) => g.author.id === user?.id);
    const others = groups.filter((g) => g.author.id !== user?.id);
    const orderedGroups = myGroup ? [myGroup, ...others] : others;

    const openAt = (gi) => setViewer({ gi, si: 0 });

    return (
        <div className="hairline-b px-4 py-5 overflow-x-auto scroll-smooth no-scrollbar snap-x-stories" data-testid="stories-bar">
            <div className="flex gap-5 items-start">
                <button
                    onClick={() => setComposerOpen(true)}
                    data-testid="add-story-btn"
                    className="flex flex-col items-center gap-2 group flex-shrink-0 tap-shrink snap-start-x"
                >
                    <div className="relative">
                        <div className="w-[82px] h-[82px] rounded-full border-2 border-dashed border-black/15 grid place-items-center group-hover:border-coral transition">
                            <Avatar user={user} size={68} />
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 rounded-full w-7 h-7 grid place-items-center border-[3px] border-white shadow-md bg-gradient-to-br from-coral to-coral-deep text-white">
                            <Plus size={14} strokeWidth={2.6} />
                        </div>
                    </div>
                    <span className="text-[11px] font-medium tracking-tight text-black/55 group-hover:text-black max-w-[82px] truncate">
                        {myGroup ? "Adicionar" : "O teu story"}
                    </span>
                </button>

                {loading && groups.length === 0 ? (
                    <>
                        {[0, 1, 2, 3].map((i) => (
                            <div key={i} className="flex flex-col items-center gap-2 flex-shrink-0">
                                <div className="w-[82px] h-[82px] rounded-full bg-black/[0.06] sv-skel" />
                                <div className="w-12 h-2 rounded bg-black/[0.06] sv-skel" />
                            </div>
                        ))}
                    </>
                ) : (
                    orderedGroups.map((g, idx) => (
                        <StoryThumb
                            key={g.author.id}
                            group={g}
                            label={g.author.id === user?.id ? "tu" : (g.author.name?.split(" ")[0] || `@${g.author.username}`)}
                            onClick={() => openAt(idx)}
                        />
                    ))
                )}
            </div>

            {viewer && (
                <StoryViewer
                    groups={orderedGroups}
                    startIndex={viewer.gi}
                    startSubIndex={viewer.si}
                    onClose={() => { setViewer(null); load(); }}
                    onChange={load}
                />
            )}

            {composerOpen && (
                <StoryComposer
                    onClose={() => setComposerOpen(false)}
                    onCreated={() => load()}
                />
            )}
        </div>
    );
}

function StoryThumb({ group, label, onClick }) {
    const unseen = group.has_unseen;
    return (
        <button
            onClick={onClick}
            data-testid={`story-thumb-${group.author.username}`}
            className="flex flex-col items-center gap-2 flex-shrink-0 group tap-shrink snap-start-x"
        >
            <div className={`sv-ring ${unseen ? "" : "is-seen"}`}>
                <div className="p-[2.5px] rounded-full bg-white">
                    <Avatar user={group.author} size={68} />
                </div>
            </div>
            <span className="text-[11px] font-medium tracking-tight text-black/55 group-hover:text-black max-w-[82px] truncate">
                {label}
            </span>
        </button>
    );
}
