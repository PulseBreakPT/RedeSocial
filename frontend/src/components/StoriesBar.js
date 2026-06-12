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

    // Listen for global event to open the story composer (fired from FAB long-press → "Story").
    useEffect(() => {
        const handler = () => setComposerOpen(true);
        window.addEventListener("vermillion:open-story-composer", handler);
        return () => window.removeEventListener("vermillion:open-story-composer", handler);
    }, []);

    const myGroup = groups.find((g) => g.author.id === user?.id);
    const others = groups.filter((g) => g.author.id !== user?.id);
    const orderedGroups = myGroup ? [myGroup, ...others] : others;

    const openAt = (gi) => setViewer({ gi, si: 0 });

    return (
        <div
            className="hairline-b px-3 sm:px-5 pt-3 pb-4 sm:pt-4 sm:pb-5 overflow-x-auto scroll-smooth no-scrollbar snap-x-stories"
            data-testid="stories-bar"
            style={{ background: "rgba(247,245,239,0.50)" }}
        >
            <div className="flex items-center justify-between mb-2.5 px-1">
                <div className="inline-flex items-center gap-2">
                    <span className="relative flex h-1.5 w-1.5" aria-hidden>
                        <span className="absolute inline-flex h-full w-full rounded-full lusorae-pulse" style={{ background: "#C8102E" }} />
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: "#C8102E" }} />
                    </span>
                    <span className="font-mono text-[10px] font-bold uppercase" style={{ letterSpacing: "0.22em", color: "rgba(10,10,10,0.55)" }}>
                        Stories · ao vivo
                    </span>
                </div>
                {orderedGroups.length > 0 && (
                    <span className="font-mono text-[10px] font-bold uppercase" style={{ letterSpacing: "0.18em", color: "rgba(10,10,10,0.32)" }}>
                        {orderedGroups.length} {orderedGroups.length === 1 ? "autor" : "autores"}
                    </span>
                )}
            </div>
            <div className="flex gap-4 sm:gap-5 items-start">
                <button
                    onClick={() => setComposerOpen(true)}
                    data-testid="add-story-btn"
                    className="flex flex-col items-center gap-2 group flex-shrink-0 tap-shrink snap-start-x"
                >
                    <div className="relative">
                        <div className="w-[72px] sm:w-[82px] h-[72px] sm:h-[82px] rounded-full border-2 border-dashed border-black/15 grid place-items-center group-hover:border-black transition">
                            <Avatar user={user} size={60} />
                        </div>
                        <div className="absolute -bottom-0.5 -right-0.5 rounded-full w-7 h-7 grid place-items-center border-[3px] border-white shadow-md bg-black text-white">
                            <Plus size={14} strokeWidth={2.6} />
                        </div>
                    </div>
                    <span className="text-[11px] font-medium tracking-tight text-black/55 group-hover:text-black max-w-[72px] sm:max-w-[82px] truncate">
                        {myGroup ? "Adicionar" : "O teu story"}
                    </span>
                </button>

                {loading && groups.length === 0 ? (
                    <>
                        {[0, 1, 2, 3].map((i) => (
                            <div key={i} className="flex flex-col items-center gap-2 flex-shrink-0">
                                <div className="w-[68px] sm:w-[78px] h-[68px] sm:h-[78px] rounded-full bg-black/[0.06] sv-skel" />
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
    const hot = (group.max_eqs || 0) >= 0.55;
    const total = group.stories?.length || 0;
    const unseenCount = group.stories?.filter((s) => !s.is_viewed).length || 0;
    const showCount = total > 1;
    return (
        <button
            onClick={onClick}
            data-testid={`story-thumb-${group.author.username}`}
            className="sb-thumb-wrap flex flex-col items-center gap-2 flex-shrink-0 group tap-shrink snap-start-x"
        >
            <div className="relative">
                <div className={`sv-ring ${unseen ? "" : "is-seen"}`}>
                    <div className="p-[2.5px] rounded-full bg-white">
                        <Avatar user={group.author} size={62} />
                    </div>
                </div>
                {showCount && (
                    <span
                        className="sb-thumb-count"
                        data-testid={`story-count-${group.author.username}`}
                        aria-label={`${total} stories`}
                    >
                        {unseen && unseenCount > 0 ? unseenCount : total}
                    </span>
                )}
                {hot && (
                    <div
                        title="Story em destaque"
                        data-testid={`story-hot-${group.author.username}`}
                        className="absolute -bottom-0.5 -right-0.5 px-1.5 py-0.5 rounded-full bg-black text-white text-[8.5px] font-bold tracking-wider uppercase shadow border-[1.5px] border-white"
                    >
                        Hot
                    </div>
                )}
            </div>
            <span className={`text-[11px] font-medium tracking-tight max-w-[72px] sm:max-w-[82px] truncate ${unseen ? "text-black" : "text-black/45"} group-hover:text-black`}>
                {label}
            </span>
        </button>
    );
}
