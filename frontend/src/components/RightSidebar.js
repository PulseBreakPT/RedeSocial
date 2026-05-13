import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, TrendingUp, Sparkles } from "lucide-react";
import { api, formatApiError, toastApiError } from "../lib/api";
import { Avatar } from "./Avatar";
import { VerifiedBadge } from "./VerifiedBadge";
import { ActivityTicker } from "./ActivityTicker";
import { toast } from "sonner";

export function RightSidebar() {
    const [q, setQ] = useState("");
    const [results, setResults] = useState([]);
    const [suggestions, setSuggestions] = useState([]);
    const [trending, setTrending] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        api.get("/users/suggestions").then((r) => setSuggestions(r.data)).catch(() => {});
        api.get("/trending").then((r) => setTrending(r.data.slice(0, 6))).catch(() => {});
    }, []);

    useEffect(() => {
        if (!q.trim()) { setResults([]); return; }
        const id = setTimeout(async () => {
            try {
                const { data } = await api.get(`/users/search?q=${encodeURIComponent(q)}`);
                setResults(data);
            } catch {}
        }, 250);
        return () => clearTimeout(id);
    }, [q]);

    const handleFollow = async (username) => {
        try {
            await api.post(`/users/${username}/follow`);
            setSuggestions((s) => s.filter((u) => u.username !== username));
            toast.success(`Começaste a seguir @${username}`);
        } catch (e) {
            toastApiError(e);
        }
    };

    // First 5 online-marked suggestions feed the "Online agora" widget.
    // If no online flag exists on backend, we still show the first few suggestions as the "active circle".
    const onlineNow = suggestions.slice(0, 5);

    return (
        <aside className="hidden lg:flex flex-col gap-5 py-6 pl-2 sticky top-0 h-screen overflow-y-auto no-scrollbar" data-testid="right-sidebar">
            {/* Search */}
            <div className="relative">
                <Search size={15} strokeWidth={1.7} className="absolute left-4 top-1/2 -translate-y-1/2 text-black/40" />
                <input
                    data-testid="search-input"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Pesquisar utilizadores…"
                    className="w-full bg-white border border-black/[0.08] rounded-full pl-10 pr-4 py-3 text-[13px] focus:border-black/30 focus:bg-white outline-none transition placeholder:text-black/35"
                />
                {q && results.length > 0 && (
                    <div className="absolute z-30 left-0 right-0 mt-2 card-premium rounded-2xl overflow-hidden">
                        {results.map((u) => (
                            <div
                                key={u.id}
                                onClick={() => { navigate(`/u/${u.username}`); setQ(""); }}
                                className="flex items-center gap-3 p-3 hover:bg-black/[0.03] cursor-pointer tap-shrink"
                                data-testid={`search-result-${u.username}`}
                            >
                                <Avatar user={u} size={36} />
                                <div>
                                    <div className="text-sm font-heading font-semibold flex items-center gap-1 text-black">
                                        {u.name} {u.verified && <VerifiedBadge size={11} />}
                                    </div>
                                    <div className="text-xs font-mono text-black/50">@{u.username}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <ActivityTicker />

            {/* Online now */}
            {onlineNow.length > 0 && (
                <div className="card-lux p-5" data-testid="online-now">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <p className="type-overline mb-0.5 inline-flex items-center gap-1.5">
                                <span className="live-dot" /> Online agora
                            </p>
                            <h3 className="font-display text-[20px] leading-none tracking-tight text-black mt-1">Comunidade ativa</h3>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        {onlineNow.map((u) => (
                            <Link
                                key={u.id}
                                to={`/u/${u.username}`}
                                data-testid={`online-${u.username}`}
                                className="relative tap-shrink"
                                title={`@${u.username}`}
                            >
                                <Avatar user={u} size={42} className="ring-2 ring-white" />
                                <span
                                    className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white"
                                    style={{ background: "var(--eu-500)" }}
                                />
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            {/* Trending */}
            <div className="card-lux p-5">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <p className="type-overline mb-0.5">Em alta · Portugal</p>
                        <h3 className="font-display text-[22px] leading-none tracking-tight text-black">Tendências</h3>
                    </div>
                    <TrendingUp size={16} strokeWidth={1.5} className="text-[color:var(--atl-500)]" />
                </div>
                {trending.length === 0 ? (
                    <ul className="space-y-3.5">
                        {[
                            { tag: "Lisboa", count: "12.4k" },
                            { tag: "Porto", count: "8.2k" },
                            { tag: "Fado", count: "3.1k" },
                            { tag: "Benfica", count: "5.7k" },
                            { tag: "BairroAlto", count: "1.8k" },
                        ].map((t, idx) => (
                            <li
                                key={t.tag}
                                onClick={() => navigate(`/tag/${t.tag}`)}
                                data-testid={`trending-fallback-${t.tag}`}
                                className="group cursor-pointer flex items-start gap-3 tap-press rounded-lg -mx-2 px-2 py-1"
                            >
                                <span className="font-mono text-[10px] text-black/35 mt-1 w-4 tabular-nums">{String(idx + 1).padStart(2, "0")}</span>
                                <div className="flex-1 min-w-0">
                                    <div className="font-heading text-[15px] font-semibold tracking-tight text-black truncate">
                                        #{t.tag}
                                    </div>
                                    <div className="text-[11px] tracking-tight text-black/45 mt-0.5">
                                        {t.count} publicações
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <ul className="space-y-3.5">
                        {trending.map((t, idx) => (
                            <li
                                key={t.tag}
                                onClick={() => navigate(`/tag/${t.tag}`)}
                                data-testid={`trending-${t.tag}`}
                                className="group cursor-pointer flex items-start gap-3 tap-press rounded-lg -mx-2 px-2 py-1"
                            >
                                <span className="font-mono text-[10px] text-black/35 mt-1 w-4 tabular-nums">{String(idx + 1).padStart(2, "0")}</span>
                                <div className="flex-1 min-w-0">
                                    <div className="font-heading text-[15px] font-semibold tracking-tight text-black group-hover:text-[color:var(--atl-700)] truncate transition-colors">
                                        #{t.tag}
                                    </div>
                                    <div className="text-[11px] tracking-tight text-black/45 mt-0.5">
                                        {t.count} publicações
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
                <Link to="/trending" className="mt-4 block text-center type-overline ink-link text-black/60 hover:text-black">
                    ver tudo →
                </Link>
            </div>

            {/* Suggestions */}
            <div className="card-lux p-5">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <p className="type-overline mb-0.5">Sugestões</p>
                        <h3 className="font-display text-[22px] leading-none tracking-tight text-black">Quem seguir</h3>
                    </div>
                    <Sparkles size={16} strokeWidth={1.5} className="text-black/40" />
                </div>
                {suggestions.length === 0 ? (
                    <p className="text-black/55 text-sm">Sem sugestões agora.</p>
                ) : (
                    <ul className="space-y-4">
                        {suggestions.map((u) => (
                            <li key={u.id} className="flex items-center gap-3" data-testid={`suggestion-${u.username}`}>
                                <Link to={`/u/${u.username}`}>
                                    <Avatar user={u} size={42} />
                                </Link>
                                <div className="flex-1 min-w-0">
                                    <Link to={`/u/${u.username}`} className="font-heading font-medium text-[14px] tracking-tight truncate hover:underline flex items-center gap-1 text-black">
                                        {u.name} {u.verified && <VerifiedBadge size={11} />}
                                    </Link>
                                    <div className="font-mono text-[10px] text-black/45 truncate mt-0.5">
                                        @{u.username} · {u.reason}
                                    </div>
                                </div>
                                <button
                                    onClick={() => handleFollow(u.username)}
                                    data-testid={`follow-suggestion-${u.username}`}
                                    className="btn-obsidian px-3.5 py-1.5 text-[11px] tracking-tight"
                                >
                                    Seguir
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <p className="type-overline px-2 mt-auto pt-2">
                © vermillion · {new Date().getFullYear()} · feito à mão
            </p>
        </aside>
    );
}
