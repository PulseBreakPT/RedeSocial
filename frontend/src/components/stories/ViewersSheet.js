import { useEffect, useState } from "react";
import { X, Eye, Heart, MessageCircle, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { api, toastApiError } from "../../lib/api";
import { Avatar } from "../Avatar";
import { useEscapeKey } from "../../hooks/useClickOutside";

export function ViewersSheet({ storyId, onClose }) {
    const [tab, setTab] = useState("viewers"); // viewers | replies
    const [data, setData] = useState(null);
    const [replies, setReplies] = useState(null);
    const [loading, setLoading] = useState(true);
    useEscapeKey(onClose, true);

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const [v, r] = await Promise.all([
                    api.get(`/stories/${storyId}/viewers`),
                    api.get(`/stories/${storyId}/replies`).catch(() => ({ data: [] })),
                ]);
                setData(v.data);
                setReplies(r.data);
            } catch (e) { toastApiError(e); }
            finally { setLoading(false); }
        })();
    }, [storyId]);

    return (
        <div
            className="absolute inset-0 z-[60] flex items-end lg:items-center justify-center"
            onClick={onClose}
            data-testid="story-viewers-sheet"
        >
            <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" />
            <div
                onClick={(e) => e.stopPropagation()}
                className="relative w-full lg:max-w-md lg:rounded-3xl rounded-t-3xl bg-white shadow-2xl overflow-hidden flex flex-col"
                style={{
                    maxHeight: "78%",
                    animation: "slideUp 0.22s ease-out",
                    paddingBottom: "env(safe-area-inset-bottom)",
                }}
            >
                {/* Header com tabs */}
                <div className="px-5 pt-4 pb-3 border-b border-black/[0.06]">
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="font-display text-[18px] tracking-tight">Actividade</h3>
                        <button onClick={onClose} className="p-1.5 rounded-full hover:bg-black/[0.06]"><X size={16} /></button>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setTab("viewers")}
                            className={`flex-1 px-3 py-2 rounded-full text-[12px] font-mono uppercase tracking-wider transition ${tab === "viewers" ? "bg-black text-white" : "bg-black/[0.05] text-black/65 hover:bg-black/[0.10]"}`}
                            data-testid="tab-viewers"
                        >
                            <span className="inline-flex items-center gap-1.5"><Eye size={12} />Vistos {data?.total_views ? `· ${data.total_views}` : ""}</span>
                        </button>
                        <button
                            onClick={() => setTab("replies")}
                            className={`flex-1 px-3 py-2 rounded-full text-[12px] font-mono uppercase tracking-wider transition ${tab === "replies" ? "bg-black text-white" : "bg-black/[0.05] text-black/65 hover:bg-black/[0.10]"}`}
                            data-testid="tab-replies"
                        >
                            <span className="inline-flex items-center gap-1.5"><MessageCircle size={12} />Respostas {replies?.length ? `· ${replies.length}` : ""}</span>
                        </button>
                    </div>
                    {tab === "viewers" && data?.reactions_breakdown && Object.keys(data.reactions_breakdown).length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5 text-[12px] font-mono">
                            {Object.entries(data.reactions_breakdown).map(([emoji, n]) => (
                                <span key={emoji} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-coral/10 text-black/75">
                                    <span className="text-[14px]">{emoji}</span>
                                    <span className="tabular-nums">{n}</span>
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Conteúdo */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="py-12 grid place-items-center">
                            <Loader2 className="animate-spin text-black/40" size={20} />
                        </div>
                    ) : tab === "viewers" ? (
                        data?.viewers?.length ? (
                            <ul className="divide-y divide-black/[0.05]" data-testid="viewers-list">
                                {data.viewers.map((v) => (
                                    <li key={v.user.id} className="px-5 py-2.5 flex items-center gap-3">
                                        <Link to={`/u/${v.user.username}`} onClick={onClose}>
                                            <Avatar user={v.user} size={36} />
                                        </Link>
                                        <Link to={`/u/${v.user.username}`} onClick={onClose} className="flex-1 min-w-0">
                                            <div className="font-heading text-[13.5px] tracking-tight truncate">{v.user.name}</div>
                                            <div className="font-mono text-[10.5px] text-black/45">@{v.user.username}</div>
                                        </Link>
                                        {v.reaction && (
                                            <span className="text-[20px] grid place-items-center w-9 h-9 rounded-full bg-coral/[0.08]" title="reagiu">
                                                {v.reaction}
                                            </span>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="py-12 text-center text-black/45 font-mono text-[11px]">Ainda ninguém viu este story.</div>
                        )
                    ) : (
                        replies?.length ? (
                            <ul className="divide-y divide-black/[0.05]" data-testid="replies-list">
                                {replies.map((r, i) => (
                                    <li key={i} className="px-5 py-3 flex items-start gap-3">
                                        <Link to={`/u/${r.user.username}`} onClick={onClose}>
                                            <Avatar user={r.user} size={32} />
                                        </Link>
                                        <div className="flex-1 min-w-0">
                                            <Link to={`/u/${r.user.username}`} onClick={onClose} className="font-heading text-[12.5px] tracking-tight hover:underline">
                                                {r.user.name} <span className="font-mono text-[10.5px] text-black/45">@{r.user.username}</span>
                                            </Link>
                                            <div className="mt-0.5 text-[13.5px] text-black/85 leading-snug">{r.content}</div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="py-12 text-center text-black/45 font-mono text-[11px]">Sem respostas ainda.</div>
                        )
                    )}
                </div>
            </div>
            <style>{`@keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }`}</style>
        </div>
    );
}
