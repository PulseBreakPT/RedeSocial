import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Search, Hash, X } from "lucide-react";
import { api } from "../lib/api";
import { Avatar } from "./Avatar";
import { VerifiedBadge } from "./VerifiedBadge";
import { useClickOutside } from "../hooks/useClickOutside";
import { FeedWidgetsStack } from "./FeedAside";
import { PT } from "../theme/editorial";

// =============================================================================
// LUSORAE — Right Sidebar (desktop-only).
// Composição: Search + FeedWidgetsStack (partilhado com mobile via FeedAside).
// Mantemos a sidebar minimalista — toda a lógica de widgets vive em FeedAside.js,
// garantindo paridade desktop/mobile sem duplicação de código.
// =============================================================================
export function RightSidebar() {
    const [q, setQ] = useState("");
    const [results, setResults] = useState({ users: [], tags: [] });
    const [focused, setFocused] = useState(false);
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const searchRef = useClickOutside(() => setFocused(false), focused);
    const isHome = pathname === "/" || pathname === "/feed";

    useEffect(() => {
        if (!q.trim()) { setResults({ users: [], tags: [] }); return; }
        const id = setTimeout(async () => {
            try {
                const [u, t] = await Promise.all([
                    api.get(`/users/search?q=${encodeURIComponent(q)}`).catch(() => ({ data: [] })),
                    api.get(`/trending`).catch(() => ({ data: [] })),
                ]);
                const needle = q.toLowerCase().replace(/^#/, "");
                const tags = (t.data || []).filter((x) => (x.tag || "").toLowerCase().includes(needle)).slice(0, 5);
                setResults({ users: u.data || [], tags });
            } catch { /* noop */ }
        }, 250);
        return () => clearTimeout(id);
    }, [q]);

    const closeSearch = () => { setQ(""); setFocused(false); };
    const showDropdown = focused && q.trim().length > 0;
    const isEmpty = results.users.length === 0 && results.tags.length === 0;

    return (
        <aside
            className="hidden lg:flex flex-col gap-4 py-4 pl-2 pr-1 sticky top-0 h-[calc(100vh-0.75rem)] overflow-y-auto no-scrollbar"
            data-testid="right-sidebar"
        >
            {/* Search */}
            <div className="relative" ref={searchRef}>
                <Search size={15} strokeWidth={1.8} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: "rgba(10,10,10,0.42)" }} />
                <input
                    data-testid="search-input"
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    onFocus={() => setFocused(true)}
                    onKeyDown={(e) => {
                        if (e.key === "Escape") closeSearch();
                        if (e.key === "Enter" && results.users[0]) { navigate(`/u/${results.users[0].username}`); closeSearch(); }
                    }}
                    placeholder="Pesquisar pessoas ou #tags…"
                    className="w-full pl-10 pr-9 py-3 text-[13.5px] font-medium outline-none transition"
                    style={{
                        background: "#fff",
                        border: "1px solid rgba(10,10,10,0.08)",
                        borderRadius: 999,
                        color: PT.ink,
                    }}
                    onFocusCapture={(e) => { e.currentTarget.style.borderColor = "rgba(10,10,10,0.30)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(10,10,10,0.05)"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(10,10,10,0.08)"; e.currentTarget.style.boxShadow = "none"; }}
                />
                {q && (
                    <button onClick={closeSearch} className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 grid place-items-center rounded-full hover:bg-black/[0.06]" aria-label="Limpar" style={{ color: "rgba(10,10,10,0.45)" }}>
                        <X size={13} />
                    </button>
                )}
                {showDropdown && (
                    <div
                        className="absolute z-30 left-0 right-0 mt-2 overflow-hidden anim-fade-up"
                        style={{
                            background: "#fff",
                            border: "1px solid rgba(10,10,10,0.08)",
                            borderRadius: 18,
                            boxShadow: "0 18px 48px -16px rgba(10,10,10,0.18), 0 4px 12px -4px rgba(10,10,10,0.06)",
                        }}
                    >
                        {results.tags.length > 0 && (
                            <div>
                                <div className="px-4 pt-3 pb-1 font-mono text-[10px] font-bold uppercase" style={{ color: "rgba(10,10,10,0.5)", letterSpacing: "0.18em" }}>Hashtags</div>
                                {results.tags.map((t) => (
                                    <button key={t.tag} onClick={() => { navigate(`/tag/${t.tag}`); closeSearch(); }} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-black/[0.03] text-left transition" data-testid={`search-tag-${t.tag}`}>
                                        <div className="w-9 h-9 rounded-full grid place-items-center" style={{ background: "rgba(10,10,10,0.05)" }}><Hash size={15} style={{ color: "rgba(10,10,10,0.6)" }} /></div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-[14px] font-bold truncate" style={{ color: PT.ink }}>#{t.tag}</div>
                                            <div className="text-[11.5px] font-mono" style={{ color: "rgba(10,10,10,0.5)" }}>{t.count} publicações</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                        {results.users.length > 0 && (
                            <div>
                                {results.tags.length > 0 && <div style={{ borderTop: "1px solid rgba(10,10,10,0.06)" }} />}
                                <div className="px-4 pt-3 pb-1 font-mono text-[10px] font-bold uppercase" style={{ color: "rgba(10,10,10,0.5)", letterSpacing: "0.18em" }}>Pessoas</div>
                                {results.users.map((u) => (
                                    <button key={u.id} onClick={() => { navigate(`/u/${u.username}`); closeSearch(); }} className="w-full flex items-center gap-3 p-3 hover:bg-black/[0.03] text-left transition" data-testid={`search-result-${u.username}`}>
                                        <Avatar user={u} size={36} />
                                        <div className="flex-1 min-w-0">
                                            <div className="text-[14px] font-bold flex items-center gap-1 truncate" style={{ color: PT.ink }}>
                                                {u.name} {u.verified && <VerifiedBadge size={11} />}
                                            </div>
                                            <div className="text-[11.5px] font-mono truncate" style={{ color: "rgba(10,10,10,0.5)" }}>@{u.username}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                        {isEmpty && (
                            <div className="px-4 py-7 text-center">
                                <p className="font-mono text-[10px] font-bold uppercase mb-1" style={{ color: "rgba(10,10,10,0.55)", letterSpacing: "0.18em" }}>Sem resultados</p>
                                <p className="text-xs font-mono" style={{ color: "rgba(10,10,10,0.5)" }}>Tenta outra palavra ou #tag.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Widgets — partilhados com mobile via FeedAside.js (DRY). */}
            <FeedWidgetsStack isHome={isHome} />

            <p className="font-mono text-[10px] font-bold uppercase px-2 mt-auto pt-2" style={{ color: "rgba(10,10,10,0.32)", letterSpacing: "0.18em" }}>
                © lusorae · {new Date().getFullYear()}
            </p>
        </aside>
    );
}
