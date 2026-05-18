import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Search, TrendingUp, Hash, X } from "lucide-react";
import { api } from "../lib/api";
import { Avatar } from "./Avatar";
import { VerifiedBadge } from "./VerifiedBadge";
import { ActivityTicker } from "./ActivityTicker";
import { Spinner } from "./Spinner";
import { TrendingPulse } from "./TrendingPulse";
import { VermillionSeal } from "./VermillionSeal";
import { useClickOutside } from "../hooks/useClickOutside";

export function RightSidebar() {
    const [q, setQ] = useState("");
    const [results, setResults] = useState({ users: [], tags: [] });
    const [searching, setSearching] = useState(false);
    const [focused, setFocused] = useState(false);
    const [trending, setTrending] = useState([]);
    const navigate = useNavigate();
    const { pathname } = useLocation();

    // Hide the Trending card on the home/feed page (it now lives only on /trending and /explore).
    const isHome = pathname === "/" || pathname === "/feed";

    const searchRef = useClickOutside(() => setFocused(false), focused);

    useEffect(() => {
        api.get("/trending").then((r) => setTrending(r.data.slice(0, 6))).catch(() => {});
    }, []);

    useEffect(() => {
        if (!q.trim()) { setResults({ users: [], tags: [] }); setSearching(false); return; }
        setSearching(true);
        const id = setTimeout(async () => {
            try {
                const [u, t] = await Promise.all([
                    api.get(`/users/search?q=${encodeURIComponent(q)}`).catch(() => ({ data: [] })),
                    api.get(`/trending`).catch(() => ({ data: [] })),
                ]);
                const needle = q.toLowerCase().replace(/^#/, "");
                const tags = (t.data || [])
                    .filter((x) => (x.tag || "").toLowerCase().includes(needle))
                    .slice(0, 5);
                setResults({ users: u.data || [], tags });
            } catch {}
            finally { setSearching(false); }
        }, 250);
        return () => clearTimeout(id);
    }, [q]);

    const closeSearch = () => { setQ(""); setFocused(false); };

    const showDropdown = focused && q.trim().length > 0;
    const isEmpty = !searching && results.users.length === 0 && results.tags.length === 0;

    return (
        <aside className="hidden lg:flex flex-col gap-5 py-3 pl-2 sticky top-0 h-[calc(100vh-0.75rem)] overflow-y-auto no-scrollbar" data-testid="right-sidebar">
            {/* Search */}
            <div className="relative" ref={searchRef}>
                <Search size={15} strokeWidth={1.7} className="absolute left-4 top-1/2 -translate-y-1/2 text-black/40" />
                <input
                    data-testid="search-input"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    onFocus={() => setFocused(true)}
                    onKeyDown={(e) => {
                        if (e.key === "Escape") closeSearch();
                        if (e.key === "Enter" && results.users[0]) {
                            navigate(`/u/${results.users[0].username}`);
                            closeSearch();
                        }
                    }}
                    placeholder="Pesquisar pessoas ou #tags…"
                    className="w-full bg-white border border-black/[0.08] rounded-full pl-10 pr-9 py-3 text-[13px] focus:border-black/30 focus:bg-white outline-none transition placeholder:text-black/35"
                />
                {q && (
                    <button
                        onClick={closeSearch}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 grid place-items-center rounded-full hover:bg-black/[0.06] text-black/45 tap-shrink"
                        aria-label="Limpar"
                    >
                        <X size={13} />
                    </button>
                )}
                {showDropdown && (
                    <div className="absolute z-30 left-0 right-0 mt-2 card-premium rounded-2xl overflow-hidden anim-fade-up">
                        {searching && (
                            <div className="px-4 py-5 inline-flex items-center gap-2 text-[12px] font-mono text-black/55 w-full justify-center">
                                <Spinner size={13} /> a procurar…
                            </div>
                        )}
                        {!searching && results.tags.length > 0 && (
                            <div>
                                <div className="px-4 pt-3 pb-1 type-overline text-black/45">Hashtags</div>
                                {results.tags.map((t) => (
                                    <button
                                        key={t.tag}
                                        onClick={() => { navigate(`/tag/${t.tag}`); closeSearch(); }}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-black/[0.03] cursor-pointer tap-shrink text-left transition"
                                        data-testid={`search-tag-${t.tag}`}
                                    >
                                        <div className="w-9 h-9 rounded-full bg-black/[0.04] grid place-items-center">
                                            <Hash size={15} className="text-black/65" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-heading font-semibold text-black truncate">#{t.tag}</div>
                                            <div className="text-xs font-mono text-black/50">{t.count} publicações</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                        {!searching && results.users.length > 0 && (
                            <div>
                                {results.tags.length > 0 && <div className="hairline-t" />}
                                <div className="px-4 pt-3 pb-1 type-overline text-black/45">Pessoas</div>
                                {results.users.map((u) => (
                                    <button
                                        key={u.id}
                                        onClick={() => { navigate(`/u/${u.username}`); closeSearch(); }}
                                        className="w-full flex items-center gap-3 p-3 hover:bg-black/[0.03] cursor-pointer tap-shrink text-left transition"
                                        data-testid={`search-result-${u.username}`}
                                    >
                                        <Avatar user={u} size={36} />
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-heading font-semibold flex items-center gap-1 text-black truncate">
                                                {u.name} {u.verified && <VerifiedBadge size={11} />}
                                            </div>
                                            <div className="text-xs font-mono text-black/50 truncate">@{u.username}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                        {!searching && isEmpty && (
                            <div className="px-4 py-7 text-center">
                                <p className="type-overline mb-1">Sem resultados</p>
                                <p className="text-xs font-mono text-black/55">Tenta outra palavra ou #tag.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <ActivityTicker />

            {/* "Online agora" moved to the DMs (/messages) page. */}

            {/* Trending — hidden on the home/feed page (lives on /trending and /explore). */}
            {!isHome && (
            <div className="card-lux p-5">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <p className="type-overline mb-0.5">Em alta · Portugal</p>
                        <h3 className="font-display text-[22px] leading-none tracking-tight text-black">Tendências</h3>
                    </div>
                    <TrendingUp size={16} strokeWidth={1.5} className="text-[color:var(--atl-500)]" />
                </div>
                {trending.length === 0 ? (
                    <p className="type-overline text-black/45 text-center py-6">
                        Sem tendências agora
                    </p>
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
                                    <div className="font-heading text-[15px] font-semibold tracking-tight text-black group-hover:text-black/70 truncate transition-colors flex items-center gap-2">
                                        <span>#{t.tag}</span>
                                        <TrendingPulse tag={t.tag} width={48} height={16} />
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
            )}

            {/* "Quem seguir" moved to the Descobrir (Explore) page. */}

            <p className="type-overline px-2 mt-auto pt-2 sr-only">
                © lusorae · {new Date().getFullYear()} · feito à mão
            </p>
            <div className="mt-auto pt-3 pl-2">
                <VermillionSeal size="sm" tone="ink" />
            </div>
        </aside>
    );
}
