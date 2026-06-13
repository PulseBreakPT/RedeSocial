import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { UserPlus, Check, Users } from "lucide-react";
import { api } from "../lib/api";
import { Avatar } from "./Avatar";
import { PT } from "../theme/editorial";

// =============================================================================
// LUSORAE — Empty Feed CTA: "Segue 10 portugueses para activar o teu feed"
// Mostrado quando o utilizador autenticado ainda não tem nada no feed.
// Grid de até 10 sugestões com 1-tap follow.
// =============================================================================

export function EmptyFeedFollow10() {
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [followingMap, setFollowingMap] = useState({});
    const [followedCount, setFollowedCount] = useState(0);
    const navigate = useNavigate();

    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const r = await api.get("/users/suggestions?limit=10");
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
        // optimistic
        setFollowingMap((m) => ({ ...m, [u.id]: true }));
        setFollowedCount((c) => c + 1);
        try {
            await api.post(`/users/${u.id}/follow`);
        } catch {
            setFollowingMap((m) => ({ ...m, [u.id]: false }));
            setFollowedCount((c) => Math.max(0, c - 1));
        }
    };

    const goRefresh = () => {
        // recarrega o feed para reflectir o que se segue
        window.location.reload();
    };

    if (loading) {
        return (
            <div className="px-6 py-12" data-testid="empty-feed-follow10-loading">
                <div className="animate-pulse space-y-3">
                    <div className="h-6 bg-black/[0.05] rounded w-64 mx-auto" />
                    <div className="h-4 bg-black/[0.04] rounded w-80 mx-auto" />
                    <div className="grid grid-cols-2 gap-2 mt-6">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="h-16 bg-black/[0.03] rounded-2xl" />
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (suggestions.length === 0) {
        return (
            <div className="px-6 py-20 text-center" data-testid="empty-feed-noone">
                <div className="w-20 h-20 grid place-items-center mx-auto mb-6"
                    style={{
                        background: "#fff",
                        border: "1px solid rgba(10,10,10,0.08)",
                        boxShadow: "0 1px 2px rgba(10,10,10,0.04), 0 10px 30px -12px rgba(10,10,10,0.18)",
                        borderRadius: 999,
                    }}>
                    <Users size={26} strokeWidth={2.0} style={{ color: PT.ink }} />
                </div>
                <h3 className="font-black tracking-tight" style={{ fontSize: 22, color: PT.ink }}>
                    Ainda não há ninguém aqui.
                </h3>
                <p className="text-[14px] mt-3 max-w-xs mx-auto leading-relaxed font-medium" style={{ color: "rgba(10,10,10,0.62)" }}>
                    Convida alguém para o Lusorae e começa a conversa. Esta é uma rede a nascer.
                </p>
            </div>
        );
    }

    const enough = followedCount >= 5;

    return (
        <div className="px-4 lg:px-6 py-8 anim-fade-up" data-testid="empty-feed-follow10">
            {/* Heading */}
            <div className="max-w-2xl mx-auto mb-6">
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: "rgba(10,10,10,0.5)" }}>
                    O teu feed
                </p>
                <h2 className="font-black tracking-tight leading-[1.05] mt-2"
                    style={{ fontSize: "clamp(28px, 4.5vw, 40px)", color: PT.ink }}>
                    Segue 10 portugueses para activar o teu feed.
                </h2>
                <p className="text-[15px] mt-3 leading-relaxed font-medium" style={{ color: "rgba(10,10,10,0.62)" }}>
                    Escolhe pelo menos <strong style={{ color: PT.ink }}>5</strong> e o feed começa a fazer sentido.
                    Podes mudar mais tarde — sem algoritmo, só quem tu escolhes.
                </p>
            </div>

            {/* Grid */}
            <div className="max-w-2xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {suggestions.map((u) => {
                    const isFollowing = followingMap[u.id];
                    return (
                        <div
                            key={u.id}
                            data-testid={`empty-feed-card-${u.username}`}
                            className="flex items-center gap-3 p-3 rounded-2xl bg-white border transition"
                            style={{
                                borderColor: isFollowing ? "rgba(10,10,10,0.18)" : "rgba(10,10,10,0.06)",
                                boxShadow: isFollowing ? "0 6px 16px -10px rgba(10,10,10,0.25)" : "0 1px 2px rgba(10,10,10,0.02)",
                            }}
                        >
                            <Link to={`/u/${u.username}`} className="shrink-0">
                                <Avatar src={u.avatar} name={u.name} size={44} />
                            </Link>
                            <div className="flex-1 min-w-0">
                                <Link to={`/u/${u.username}`} className="block">
                                    <p className="text-[14px] font-bold text-black truncate">{u.name}</p>
                                    <p className="text-[12px] text-black/55 font-mono truncate">
                                        @{u.username}
                                        {u.city ? <span className="text-black/40"> · {u.city}</span> : null}
                                    </p>
                                </Link>
                                {u.reason ? (
                                    <p className="text-[10px] font-mono uppercase tracking-wider text-black/40 mt-0.5">
                                        {u.reason}
                                    </p>
                                ) : null}
                            </div>
                            <button
                                onClick={() => !isFollowing && handleFollow(u)}
                                data-testid={`empty-feed-follow-${u.username}`}
                                disabled={isFollowing}
                                className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[12px] font-bold uppercase tracking-wider transition tap-shrink"
                                style={{
                                    background: isFollowing ? "rgba(10,10,10,0.05)" : PT.ink,
                                    color: isFollowing ? "rgba(10,10,10,0.7)" : "#fff",
                                    border: isFollowing ? "1px solid rgba(10,10,10,0.1)" : "1px solid " + PT.ink,
                                }}
                            >
                                {isFollowing ? (
                                    <><Check size={12} strokeWidth={2.4} /> a seguir</>
                                ) : (
                                    <><UserPlus size={12} strokeWidth={2.4} /> seguir</>
                                )}
                            </button>
                        </div>
                    );
                })}
            </div>

            {/* Progress + CTA */}
            <div className="max-w-2xl mx-auto mt-6 flex items-center justify-between gap-4 flex-wrap">
                <div className="flex items-center gap-3" data-testid="empty-feed-progress">
                    <span className="font-mono text-[11px] font-bold uppercase tracking-[0.2em]" style={{ color: enough ? PT.ink : "rgba(10,10,10,0.55)" }}>
                        {followedCount} / 5 a seguir
                    </span>
                    <div className="relative w-32 h-1.5 rounded-full bg-black/[0.06] overflow-hidden">
                        <div
                            className="absolute inset-y-0 left-0 rounded-full transition-all duration-300"
                            style={{
                                width: `${Math.min(100, (followedCount / 5) * 100)}%`,
                                background: enough ? "#16a34a" : PT.ink,
                            }}
                        />
                    </div>
                </div>
                <button
                    onClick={goRefresh}
                    disabled={!enough}
                    data-testid="empty-feed-activate"
                    className="px-5 py-2.5 rounded-full text-[13px] font-bold uppercase tracking-wider transition tap-shrink"
                    style={{
                        background: enough ? PT.ink : "rgba(10,10,10,0.08)",
                        color: enough ? "#fff" : "rgba(10,10,10,0.35)",
                        cursor: enough ? "pointer" : "not-allowed",
                    }}
                >
                    {enough ? "Activar o meu feed →" : "Segue mais " + (5 - followedCount)}
                </button>
            </div>
        </div>
    );
}
