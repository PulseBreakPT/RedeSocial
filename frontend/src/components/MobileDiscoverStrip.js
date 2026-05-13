import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { TrendingUp, Sparkles } from "lucide-react";
import { api, formatApiError } from "../lib/api";
import { Avatar } from "./Avatar";
import { VerifiedBadge } from "./VerifiedBadge";
import { toast } from "sonner";

/**
 * Mobile-only discovery strip — mirrors what desktop has in RightSidebar:
 *   · Online agora (small avatars row)
 *   · Tendências em alta (horizontal pill scroll)
 *   · Quem seguir (horizontal cards scroll)
 * Hidden on lg+ where the full RightSidebar already shows these.
 */
export function MobileDiscoverStrip() {
    const [trending, setTrending] = useState([]);
    const [suggestions, setSuggestions] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        api.get("/trending").then((r) => setTrending(r.data.slice(0, 8))).catch(() => {});
        api.get("/users/suggestions").then((r) => setSuggestions(r.data)).catch(() => {});
    }, []);

    const handleFollow = async (e, username) => {
        e.stopPropagation();
        e.preventDefault();
        try {
            await api.post(`/users/${username}/follow`);
            setSuggestions((s) => s.filter((u) => u.username !== username));
            toast.success(`Começaste a seguir @${username}`);
        } catch (err) {
            toast.error(formatApiError(err));
        }
    };

    const trendingFallback = [
        { tag: "Lisboa", count: "12.4k" },
        { tag: "Porto", count: "8.2k" },
        { tag: "Fado", count: "3.1k" },
        { tag: "Benfica", count: "5.7k" },
        { tag: "BairroAlto", count: "1.8k" },
    ];
    const tags = trending.length > 0 ? trending : trendingFallback;
    const onlineNow = suggestions.slice(0, 6);

    if (tags.length === 0 && suggestions.length === 0) return null;

    return (
        <div className="lg:hidden hairline-b" data-testid="mobile-discover-strip">
            {/* Online agora — only if we have suggestions */}
            {onlineNow.length > 0 && (
                <div className="px-4 pt-4 pb-1" data-testid="mobile-online-now">
                    <div className="flex items-center justify-between mb-2.5">
                        <p className="type-overline inline-flex items-center gap-1.5">
                            <span className="live-dot" /> Online agora
                        </p>
                        <Link to="/explore" className="text-[11.5px] text-[color:var(--atl-600)] font-medium tap-shrink">
                            ver todos →
                        </Link>
                    </div>
                    <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
                        {onlineNow.map((u) => (
                            <Link
                                key={u.id}
                                to={`/u/${u.username}`}
                                className="relative flex-shrink-0 tap-shrink"
                                data-testid={`m-online-${u.username}`}
                                title={`@${u.username}`}
                            >
                                <Avatar user={u} size={44} className="ring-2 ring-white" />
                                <span
                                    className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white"
                                    style={{ background: "var(--eu-500)" }}
                                />
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* Tendências em alta */}
            <div className="px-4 pt-3" data-testid="mobile-trending-strip">
                <div className="flex items-center justify-between mb-2.5">
                    <p className="type-overline inline-flex items-center gap-1.5">
                        <TrendingUp size={11} strokeWidth={1.8} className="text-[color:var(--atl-500)]" />
                        Em alta · Portugal
                    </p>
                    <Link to="/trending" className="text-[11.5px] text-[color:var(--atl-600)] font-medium tap-shrink">
                        ver todas →
                    </Link>
                </div>
                <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
                    {tags.map((t) => (
                        <button
                            key={t.tag}
                            onClick={() => navigate(`/tag/${t.tag}`)}
                            data-testid={`m-trending-${t.tag}`}
                            className="chip chip-atl flex-shrink-0 !text-[12px] !py-1.5 !px-3 tap-shrink"
                        >
                            <span className="font-semibold">#{t.tag}</span>
                            <span className="text-[10px] font-normal opacity-70">{t.count}</span>
                        </button>
                    ))}
                </div>
            </div>

            {/* Quem seguir */}
            {suggestions.length > 0 && (
                <div className="px-4 pt-4 pb-4" data-testid="mobile-suggestions-strip">
                    <div className="flex items-center justify-between mb-2.5">
                        <p className="type-overline inline-flex items-center gap-1.5">
                            <Sparkles size={11} strokeWidth={1.8} className="text-[color:var(--atl-500)]" />
                            Quem seguir
                        </p>
                    </div>
                    <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4 pb-1">
                        {suggestions.slice(0, 6).map((u) => (
                            <Link
                                key={u.id}
                                to={`/u/${u.username}`}
                                data-testid={`m-suggestion-${u.username}`}
                                className="flex-shrink-0 w-[160px] card-lux p-3 active:scale-[0.98] transition"
                            >
                                <Avatar user={u} size={44} />
                                <div className="mt-2 font-heading font-semibold text-[13px] tracking-tight text-black truncate flex items-center gap-1">
                                    {u.name} {u.verified && <VerifiedBadge size={10} />}
                                </div>
                                <div className="text-[10.5px] text-black/50 truncate font-mono">@{u.username}</div>
                                <button
                                    onClick={(e) => handleFollow(e, u.username)}
                                    data-testid={`m-follow-${u.username}`}
                                    className="mt-3 w-full btn-atl !py-1.5 !text-[11.5px]"
                                >
                                    Seguir
                                </button>
                            </Link>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
