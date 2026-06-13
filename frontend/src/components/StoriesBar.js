import { useEffect, useState } from "react";
import { Plus, Flame, Sparkles } from "lucide-react";
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
    const unseenCount = orderedGroups.filter((g) => g.has_unseen).length;

    const openAt = (gi) => setViewer({ gi, si: 0 });

    return (
        <div
            className="hairline-b px-3 sm:px-5 pt-3 pb-4 sm:pt-4 sm:pb-5 overflow-x-auto scroll-smooth no-scrollbar snap-x-stories scroll-mom"
            data-testid="stories-bar"
            style={{ background: "rgba(247,245,239,0.50)" }}
        >
            {/* Editorial header bar */}
            <div className="flex items-center justify-between mb-3 px-1" style={{ minHeight: 18 }}>
                <span
                    className="font-mono text-[10px] font-bold uppercase tabular-nums"
                    style={{ letterSpacing: "0.18em", color: "rgba(10,10,10,0.42)" }}
                >
                    Stories · Hoje
                </span>
                {orderedGroups.length > 0 && (
                    <span className="flex items-center gap-1.5">
                        {unseenCount > 0 && (
                            <span
                                className="inline-flex items-center gap-1 font-mono text-[9.5px] font-bold uppercase tracking-[0.16em] px-1.5 py-0.5 rounded-full text-white"
                                style={{ background: "linear-gradient(135deg, #C8102E 0%, #E85D4F 100%)" }}
                                data-testid="stories-unseen-badge"
                            >
                                <span className="w-1 h-1 rounded-full bg-white animate-pulse" /> {unseenCount} novos
                            </span>
                        )}
                        <span
                            className="font-mono text-[10px] font-bold uppercase tabular-nums"
                            style={{ letterSpacing: "0.18em", color: "rgba(10,10,10,0.32)" }}
                        >
                            {orderedGroups.length} {orderedGroups.length === 1 ? "autor" : "autores"}
                        </span>
                    </span>
                )}
            </div>

            <div className="flex gap-4 sm:gap-5 items-start">
                {/* "Add story" thumb — visual sibling of story thumbs */}
                <button
                    onClick={() => setComposerOpen(true)}
                    data-testid="add-story-btn"
                    className="sb-thumb-wrap flex flex-col items-center gap-2 group flex-shrink-0 tap-shrink snap-start-x"
                    aria-label={myGroup ? "Adicionar ao teu story" : "Criar story"}
                >
                    <div className="relative">
                        <div
                            className="w-[72px] sm:w-[82px] h-[72px] sm:h-[82px] rounded-full grid place-items-center transition-colors duration-200"
                            style={{
                                background: "rgba(255,255,255,0.6)",
                                boxShadow:
                                    "inset 0 0 0 1.5px rgba(13,13,16,0.10), inset 0 0 0 4px #fff",
                            }}
                        >
                            <Avatar user={user} size={60} />
                        </div>
                        <div
                            className="absolute -bottom-0.5 -right-0.5 rounded-full w-7 h-7 grid place-items-center border-[3px] border-white text-white shadow-[0_4px_12px_-2px_rgba(13,13,16,0.35)] transition-transform duration-200 group-hover:scale-110 group-hover:rotate-90"
                            style={{ background: "#0a0a0a" }}
                        >
                            <Plus size={14} strokeWidth={2.6} />
                        </div>
                    </div>
                    <span className="text-[11px] font-medium tracking-tight text-black/55 group-hover:text-black max-w-[72px] sm:max-w-[82px] truncate transition-colors">
                        {myGroup ? "Adicionar" : "O teu story"}
                    </span>
                </button>

                {loading && groups.length === 0 ? (
                    <>
                        {[0, 1, 2, 3].map((i) => (
                            <div key={i} className="flex flex-col items-center gap-2 flex-shrink-0 opacity-70">
                                <div className="w-[72px] sm:w-[82px] h-[72px] sm:h-[82px] rounded-full bg-black/[0.06] sv-skel" />
                                <div className="w-12 h-2 rounded bg-black/[0.06] sv-skel" />
                            </div>
                        ))}
                    </>
                ) : orderedGroups.length === 0 ? (
                    // EMPTY STATE CTA — sê o primeiro a partilhar
                    <button
                        onClick={() => setComposerOpen(true)}
                        data-testid="stories-empty-cta"
                        className="flex items-center gap-3 px-4 py-3 rounded-2xl border border-dashed transition-all tap-shrink hover:border-solid hover:bg-white/80 group"
                        style={{
                            borderColor: "rgba(10,10,10,0.16)",
                            background: "rgba(255,255,255,0.6)",
                        }}
                    >
                        <div
                            className="grid place-items-center w-11 h-11 rounded-full text-white transition-transform duration-300 group-hover:rotate-90"
                            style={{
                                background: "linear-gradient(135deg, #0a0a0a 0%, #2a2a2a 100%)",
                                boxShadow: "0 4px 14px -4px rgba(13,13,16,0.4)",
                            }}
                        >
                            <Sparkles size={16} strokeWidth={2} />
                        </div>
                        <div className="text-left">
                            <p className="text-[13.5px] font-heading font-bold tracking-tight text-black leading-tight">
                                Sê o primeiro a partilhar um momento.
                            </p>
                            <p className="text-[10.5px] font-mono uppercase tracking-[0.18em] text-black/45 mt-0.5">
                                Story · expira em 24h
                            </p>
                        </div>
                    </button>
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
    const unseenLocal = group.stories?.filter((s) => !s.is_viewed).length || 0;
    const showCount = total > 1;
    return (
        <button
            onClick={onClick}
            data-testid={`story-thumb-${group.author.username}`}
            className="sb-thumb-wrap flex flex-col items-center gap-2 flex-shrink-0 group tap-shrink snap-start-x"
            aria-label={`Story de ${group.author.name || group.author.username}${unseen ? " (não visto)" : ""}`}
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
                        {unseen && unseenLocal > 0 ? unseenLocal : total}
                    </span>
                )}
                {hot && (
                    <div
                        title="Story em destaque"
                        data-testid={`story-hot-${group.author.username}`}
                        className="absolute -bottom-1 left-1/2 -translate-x-1/2 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-white text-[9px] font-bold tracking-[0.08em] uppercase shadow-[0_4px_10px_-2px_rgba(200,16,46,0.55)] border-[1.5px] border-white whitespace-nowrap"
                        style={{ background: "linear-gradient(135deg, #C8102E 0%, #E85D4F 60%, #FFCC29 100%)" }}
                    >
                        <Flame size={8} strokeWidth={2.4} fill="currentColor" /> hot
                    </div>
                )}
            </div>
            <span
                className={`text-[11px] font-medium tracking-tight max-w-[72px] sm:max-w-[82px] truncate transition-colors ${
                    unseen ? "text-black" : "text-black/45"
                } group-hover:text-black`}
            >
                {label}
            </span>
        </button>
    );
}
