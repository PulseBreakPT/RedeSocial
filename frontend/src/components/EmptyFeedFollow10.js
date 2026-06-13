import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { UserPlus, Check, Users } from "lucide-react";
import { api } from "../lib/api";
import { Avatar } from "./Avatar";
import { PT } from "../theme/editorial";

// =============================================================================
// LUSORAE — Empty Feed: carrossel horizontal compacto de sugestões.
// Substituiu o grid 2-col que ocupava demasiado espaço vertical.
// =============================================================================

export function EmptyFeedFollow10() {
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [followingMap, setFollowingMap] = useState({});
    const [followedCount, setFollowedCount] = useState(0);

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const r = await api.get("/users/suggestions?limit=12");
                if (!alive) return;
                setSuggestions(Array.isArray(r.data) ? r.data : []);
            } catch {
                setSuggestions([]);
            } finally {
                if (alive) setLoading(false);
            }
        })();
        return () => { alive = false; };
    }, []);

    const handleFollow = async (u) => {
        setFollowingMap((m) => ({ ...m, [u.id]: true }));
        setFollowedCount((c) => c + 1);
        try {
            await api.post(`/users/${u.id}/follow`);
        } catch {
            setFollowingMap((m) => ({ ...m, [u.id]: false }));
            setFollowedCount((c) => Math.max(0, c - 1));
        }
    };

    const goRefresh = () => window.location.reload();

    if (loading) {
        return (
            <div className="px-4 py-6" data-testid="empty-feed-follow10-loading">
                <div className="flex gap-2.5 overflow-hidden">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="shrink-0 w-44 h-24 bg-black/[0.04] rounded-2xl animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    if (suggestions.length === 0) {
        return (
            <div className="px-6 py-10 text-center" data-testid="empty-feed-noone">
                <div className="w-14 h-14 grid place-items-center mx-auto mb-3"
                    style={{
                        background: "#fff",
                        border: "1px solid rgba(10,10,10,0.08)",
                        boxShadow: "0 1px 2px rgba(10,10,10,0.04), 0 10px 30px -12px rgba(10,10,10,0.15)",
                        borderRadius: 999,
                    }}>
                    <Users size={20} strokeWidth={2.0} style={{ color: PT.ink }} />
                </div>
                <h3 className="font-black tracking-tight" style={{ fontSize: 15, color: PT.ink }}>
                    Ainda não há ninguém aqui.
                </h3>
                <p className="text-[12px] mt-1.5 max-w-xs mx-auto leading-snug font-medium" style={{ color: "rgba(10,10,10,0.6)" }}>
                    Convida quem conheces e arranca a conversa.
                </p>
            </div>
        );
    }

    const enough = followedCount >= 3;

    return (
        <div className="px-4 lg:px-5 py-5 anim-fade-up" data-testid="empty-feed-follow10">
            {/* Heading compacto */}
            <div className="mb-3 flex items-end justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                    <p className="font-mono text-[9.5px] font-bold uppercase tracking-[0.22em]" style={{ color: "rgba(10,10,10,0.5)" }}>
                        Para activar o teu feed
                    </p>
                    <h2 className="font-black tracking-tight leading-tight mt-1"
                        style={{ fontSize: "clamp(17px, 2.4vw, 22px)", color: PT.ink }}>
                        Segue algumas pessoas.
                    </h2>
                </div>
                {followedCount > 0 && (
                    <span
                        className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] px-2.5 py-1 rounded-full"
                        style={{ background: enough ? PT.green : "rgba(10,10,10,0.06)", color: enough ? "#fff" : PT.ink }}
                        data-testid="empty-feed-progress"
                    >
                        {followedCount} a seguir
                    </span>
                )}
            </div>

            {/* Carrossel horizontal */}
            <div
                className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide"
                style={{ scrollSnapType: "x mandatory" }}
                data-testid="empty-feed-carousel"
            >
                {suggestions.map((u) => {
                    const isFollowing = followingMap[u.id];
                    return (
                        <div
                            key={u.id}
                            data-testid={`empty-feed-card-${u.username}`}
                            className="shrink-0 w-[160px] p-3 rounded-2xl bg-white border flex flex-col items-start gap-2"
                            style={{
                                borderColor: isFollowing ? "rgba(10,10,10,0.18)" : "rgba(10,10,10,0.06)",
                                boxShadow: isFollowing ? "0 6px 16px -10px rgba(10,10,10,0.22)" : "0 1px 2px rgba(10,10,10,0.02)",
                                scrollSnapAlign: "start",
                            }}
                        >
                            <Link to={`/u/${u.username}`} className="shrink-0">
                                <Avatar src={u.avatar} name={u.name} size={40} />
                            </Link>
                            <div className="min-w-0 w-full">
                                <Link to={`/u/${u.username}`} className="block">
                                    <p className="text-[12.5px] font-bold text-black truncate leading-tight">{u.name}</p>
                                    <p className="text-[10.5px] text-black/55 font-mono truncate mt-0.5">
                                        @{u.username}
                                    </p>
                                </Link>
                            </div>
                            <button
                                onClick={() => !isFollowing && handleFollow(u)}
                                data-testid={`empty-feed-follow-${u.username}`}
                                disabled={isFollowing}
                                className="w-full inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-full text-[10.5px] font-bold uppercase tracking-wider transition tap-shrink mt-auto"
                                style={{
                                    background: isFollowing ? "rgba(10,10,10,0.05)" : PT.ink,
                                    color: isFollowing ? "rgba(10,10,10,0.7)" : "#fff",
                                    border: isFollowing ? "1px solid rgba(10,10,10,0.1)" : "1px solid " + PT.ink,
                                }}
                            >
                                {isFollowing ? (
                                    <><Check size={10} strokeWidth={2.4} /> a seguir</>
                                ) : (
                                    <><UserPlus size={10} strokeWidth={2.4} /> seguir</>
                                )}
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* CTA refresh quando já segue alguém */}
            {enough && (
                <div className="flex justify-center mt-3">
                    <button
                        onClick={goRefresh}
                        data-testid="empty-feed-activate"
                        className="px-4 py-2 rounded-full text-[11px] font-bold uppercase tracking-wider tap-shrink"
                        style={{ background: PT.ink, color: "#fff" }}
                    >
                        Activar o meu feed
                    </button>
                </div>
            )}
        </div>
    );
}
