import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { X, Heart, Search } from "lucide-react";
import { api } from "../lib/api";
import { Avatar } from "./Avatar";
import { VerifiedBadge } from "./VerifiedBadge";
import { Spinner } from "./Spinner";
import { FollowButton } from "./FollowButton";

/**
 * LikersSheet — modal listing users who liked a post.
 * Triggered from the long-press on the like button or from the
 * "...e mais X" affordance on SocialProofRow. Uses the existing
 * `/posts/:id/social-likers` endpoint.
 */
export function LikersSheet({ postId, onClose }) {
    const [data, setData] = useState(null); // null = loading
    const [query, setQuery] = useState("");

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const { data } = await api.get(`/posts/${postId}/social-likers?limit=200`);
                if (!cancelled) setData(data);
            } catch {
                if (!cancelled) setData({ users: [], total: 0 });
            }
        })();
        return () => { cancelled = true; };
    }, [postId]);

    const users = (data?.users || data || []).filter((u) => {
        if (!query) return true;
        const q = query.toLowerCase();
        return (
            (u.username || "").toLowerCase().includes(q) ||
            (u.name || "").toLowerCase().includes(q)
        );
    });
    const total = data?.total ?? users.length;

    return (
        <div
            className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-md grid place-items-center p-4"
            onClick={onClose}
            data-testid="likers-sheet"
        >
            <div
                className="w-full max-w-md bg-white border border-black/[0.06] rounded-3xl shadow-[0_40px_100px_-24px_rgba(13,13,16,0.35),0_8px_24px_-8px_rgba(13,13,16,0.10)] anim-fade-up overflow-hidden flex flex-col max-h-[80vh]"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-6 py-4 hairline-b">
                    <div className="flex items-center gap-3 min-w-0">
                        <div
                            className="w-10 h-10 rounded-full grid place-items-center text-white shadow-[0_4px_14px_-4px_rgba(232,93,79,0.5)]"
                            style={{ background: "linear-gradient(135deg, #E85D4F 0%, #C8102E 100%)" }}
                        >
                            <Heart size={16} strokeWidth={2} fill="currentColor" />
                        </div>
                        <div className="min-w-0">
                            <p className="type-overline">Gostos</p>
                            <h2 className="font-display text-[22px] tracking-tight leading-none text-black tabular-nums">
                                {total} {total === 1 ? "pessoa" : "pessoas"}
                            </h2>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-9 h-9 rounded-full grid place-items-center hover:bg-black/[0.05] text-black/55 hover:text-black tap-shrink transition flex-shrink-0"
                        aria-label="Fechar"
                    >
                        <X size={16} strokeWidth={1.8} />
                    </button>
                </div>

                {data === null ? (
                    <div className="grid place-items-center py-16 text-black/45">
                        <Spinner size={18} />
                    </div>
                ) : users.length === 0 && (data?.users?.length === 0 || total === 0) ? (
                    <div className="grid place-items-center py-16 text-black/45 text-sm font-mono uppercase tracking-[0.14em]">
                        Sem gostos ainda
                    </div>
                ) : (
                    <>
                        {total > 6 && (
                            <div className="px-6 pt-3">
                                <label className="relative block">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-black/35">
                                        <Search size={14} strokeWidth={1.8} />
                                    </span>
                                    <input
                                        type="text"
                                        value={query}
                                        onChange={(e) => setQuery(e.target.value)}
                                        placeholder="Procurar…"
                                        className="w-full bg-[#fafafa] border border-black/[0.08] rounded-2xl pl-9 pr-3 py-2 text-[13px] focus:bg-white focus:border-black/30 focus:outline-none transition"
                                    />
                                </label>
                            </div>
                        )}
                        <ul className="overflow-y-auto px-3 py-3 space-y-0.5 flex-1">
                            {users.map((u) => (
                                <li key={u.id || u.username}>
                                    <div className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-black/[0.04] transition">
                                        <Link to={`/u/${u.username}`} onClick={onClose} className="flex items-center gap-3 flex-1 min-w-0">
                                            <Avatar user={u} size={36} />
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5 min-w-0">
                                                    <span className="font-heading font-semibold text-[13.5px] text-black truncate">
                                                        {u.name || u.username}
                                                    </span>
                                                    {u.verified && <VerifiedBadge size={11} />}
                                                </div>
                                                <span className="font-mono text-[11px] text-black/45 block truncate">
                                                    @{u.username}
                                                </span>
                                            </div>
                                        </Link>
                                        <FollowButton profile={u} size="sm" />
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </>
                )}
            </div>
        </div>
    );
}
