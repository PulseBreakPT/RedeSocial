import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { api, formatApiError } from "../lib/api";
import { Avatar } from "./Avatar";
import { toast } from "sonner";

export function RightSidebar() {
    const [q, setQ] = useState("");
    const [results, setResults] = useState([]);
    const [suggestions, setSuggestions] = useState([]);
    const [trending, setTrending] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        api.get("/users/suggestions").then((r) => setSuggestions(r.data)).catch(() => {});
        api.get("/trending").then((r) => setTrending(r.data)).catch(() => {});
    }, []);

    useEffect(() => {
        if (!q.trim()) {
            setResults([]);
            return;
        }
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
            toast.success(`Seguiste @${username}`);
        } catch (e) {
            toast.error(formatApiError(e));
        }
    };

    return (
        <aside className="hidden lg:flex flex-col gap-6 py-6 pl-2 sticky top-0 h-screen overflow-y-auto" data-testid="right-sidebar">
            <div className="relative">
                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                    data-testid="search-input"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Pesquisar utilizadores..."
                    className="w-full bg-zinc-900/60 rounded-full pl-10 pr-4 py-3 text-sm border border-zinc-800 focus:border-accent-vermillion/60 focus:bg-black outline-none transition placeholder:text-zinc-600"
                />
                {q && results.length > 0 && (
                    <div className="absolute z-30 left-0 right-0 mt-2 bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden">
                        {results.map((u) => (
                            <div
                                key={u.id}
                                onClick={() => {
                                    navigate(`/u/${u.username}`);
                                    setQ("");
                                }}
                                className="flex items-center gap-3 p-3 hover:bg-white/5 cursor-pointer"
                                data-testid={`search-result-${u.username}`}
                            >
                                <Avatar user={u} size={36} />
                                <div>
                                    <div className="text-sm font-heading font-semibold">{u.name}</div>
                                    <div className="text-xs font-mono text-zinc-500">@{u.username}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <div className="bg-zinc-950/50 border border-zinc-900 rounded-2xl p-5">
                <h3 className="font-heading text-lg font-bold mb-3">Assuntos do momento</h3>
                {trending.length === 0 ? (
                    <p className="text-zinc-600 text-sm font-mono">Nenhum trending ainda. Usa #hashtag.</p>
                ) : (
                    <ul className="space-y-3">
                        {trending.map((t) => (
                            <li
                                key={t.tag}
                                onClick={() => navigate(`/tag/${t.tag}`)}
                                data-testid={`trending-${t.tag}`}
                                className="group cursor-pointer"
                            >
                                <div className="font-heading text-base text-white group-hover:text-accent-vermillion transition">#{t.tag}</div>
                                <div className="font-mono text-xs text-zinc-500">{t.count} publicações</div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div className="bg-zinc-950/50 border border-zinc-900 rounded-2xl p-5">
                <h3 className="font-heading text-lg font-bold mb-3">Quem seguir</h3>
                {suggestions.length === 0 ? (
                    <p className="text-zinc-600 text-sm font-mono">Sem sugestões agora.</p>
                ) : (
                    <ul className="space-y-3">
                        {suggestions.map((u) => (
                            <li key={u.id} className="flex items-center gap-3" data-testid={`suggestion-${u.username}`}>
                                <Link to={`/u/${u.username}`}>
                                    <Avatar user={u} size={42} />
                                </Link>
                                <div className="flex-1 min-w-0">
                                    <Link to={`/u/${u.username}`} className="block font-heading font-semibold text-sm truncate hover:underline">
                                        {u.name}
                                    </Link>
                                    <div className="font-mono text-xs text-zinc-500 truncate">@{u.username}</div>
                                </div>
                                <button
                                    onClick={() => handleFollow(u.username)}
                                    data-testid={`follow-suggestion-${u.username}`}
                                    className="px-4 py-1.5 text-xs font-heading font-semibold uppercase tracking-wide bg-white text-black rounded-full hover:bg-zinc-200 active:scale-95 transition"
                                >
                                    Seguir
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest px-2">
                © vermillion · {new Date().getFullYear()}
            </p>
        </aside>
    );
}
