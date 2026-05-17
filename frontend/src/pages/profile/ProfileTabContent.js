import { useMemo } from "react";
import { Link } from "react-router-dom";
import { MapPin, Users, Heart, ScrollText } from "lucide-react";

export function ProfileEmpty({ tab, isSelf }) {
    const msg = tab === "likes"
        ? (isSelf ? "Ainda não gostaste de nada." : "Sem gostos públicos.")
        : tab === "media"
        ? "Sem publicações com imagens."
        : (isSelf ? "Ainda não publicaste nada — partilha o primeiro pensamento." : "Sem publicações por aqui.");
    return (
        <div className="p-14 text-center" data-testid={`profile-empty-${tab}`}>
            <div className="w-14 h-14 rounded-full bg-black/[0.04] grid place-items-center mx-auto mb-4">
                {tab === "likes" ? (
                    <Heart size={22} className="text-black/40" />
                ) : (
                    <ScrollText size={22} className="text-black/40" />
                )}
            </div>
            <p className="type-overline mb-2">Sem registos</p>
            <p className="text-black/55 font-mono text-sm max-w-[34ch] mx-auto leading-relaxed">{msg}</p>
        </div>
    );
}

export function CommunitiesTab({ communities }) {
    if (!communities) return <div className="p-12 text-center type-overline">A carregar…</div>;
    if (communities.length === 0) {
        return (
            <div className="p-12 text-center" data-testid="communities-empty">
                <Users size={26} className="text-black/40 mx-auto mb-3" />
                <p className="type-overline mb-2">Sem tascas</p>
                <p className="text-black/55 font-mono text-sm max-w-[34ch] mx-auto">
                    Ainda não pertence a nenhuma comunidade.
                </p>
            </div>
        );
    }
    return (
        <div className="p-4 lg:p-5">
            <p className="type-overline mb-3">Faz parte de {communities.length} {communities.length === 1 ? "comunidade" : "comunidades"}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {communities.map((c) => (
                    <Link
                        key={c.id}
                        to={`/c/${c.slug}`}
                        data-testid={`community-${c.slug}`}
                        className="card-lux p-3.5 hover:border-black/30 transition flex items-center gap-3"
                    >
                        <div className="w-10 h-10 rounded-xl bg-black/[0.04] grid place-items-center text-black/70 shrink-0">
                            <Users size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                                <h3 className="font-semibold text-[14px] text-black truncate">{c.name}</h3>
                                {c.is_owner && (
                                    <span className="text-[9px] uppercase tracking-[0.14em] text-amber-600 font-mono">moderador</span>
                                )}
                            </div>
                            <p className="text-[11.5px] text-black/55 font-mono mt-0.5">
                                {c.members_count} {c.members_count === 1 ? "membro" : "membros"}
                                {c.category && <span className="ml-1.5 text-black/40">· {c.category}</span>}
                            </p>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}

export function MapaTab({ regions }) {
    if (!regions) return <div className="p-12 text-center type-overline">A carregar…</div>;
    if (regions.length === 0) {
        return (
            <div className="p-12 text-center" data-testid="mapa-empty">
                <MapPin size={26} className="text-black/40 mx-auto mb-3" />
                <p className="type-overline mb-2">Sem mapa</p>
                <p className="text-black/55 font-mono text-sm max-w-[34ch] mx-auto">
                    Sem hashtags de cidades portuguesas nos posts.
                </p>
            </div>
        );
    }
    const max = Math.max(...regions.map((x) => x.count));
    return (
        <div className="p-4 lg:p-5" data-testid="mapa-tab">
            <p className="type-overline mb-3">Por onde andou — cidades mencionadas</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {regions.map((r) => {
                    const pct = Math.round((r.count / max) * 100);
                    return (
                        <div key={r.city} className="card-lux p-3" data-testid={`region-${r.city}`}>
                            <div className="flex items-center gap-2">
                                <div className="w-9 h-9 rounded-full bg-black/[0.04] grid place-items-center">
                                    <MapPin size={15} className="text-black/70" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-[14px]">{r.city}</div>
                                    <div className="text-[11px] font-mono text-black/45">
                                        {r.count} {r.count === 1 ? "post" : "posts"}
                                    </div>
                                </div>
                            </div>
                            <div className="mt-2 h-1.5 bg-black/[0.05] rounded-full overflow-hidden">
                                <div className="h-full bg-black transition-all" style={{ width: `${pct}%` }} />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export function PostsFilterBar({ filter, onChange, counts = {} }) {
    const opts = [
        { key: "all",    label: "Tudo" },
        { key: "text",   label: "Texto" },
        { key: "image",  label: "Imagens" },
        { key: "poll",   label: "Polls" },
        { key: "thread", label: "Threads" },
    ];
    return (
        <div className="px-4 lg:px-5 py-2.5 flex gap-1.5 overflow-x-auto no-scrollbar" data-testid="posts-filter-bar">
            {opts.map((o) => {
                const active = filter === o.key;
                const count = counts[o.key];
                return (
                    <button
                        key={o.key}
                        onClick={() => onChange(o.key)}
                        data-testid={`posts-filter-${o.key}`}
                        className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] tracking-tight border transition tap-shrink ${
                            active
                                ? "bg-black text-white border-transparent font-semibold"
                                : "border-black/[0.10] hover:border-black/30 hover:bg-black/[0.03] text-black/75"
                        }`}
                    >
                        <span>{o.label}</span>
                        {typeof count === "number" && count > 0 && (
                            <span className={`text-[10px] tabular-nums font-mono ${active ? "text-white/80" : "text-black/45"}`}>
                                {count}
                            </span>
                        )}
                    </button>
                );
            })}
        </div>
    );
}

/* Filters a post list using simple heuristics; relies on PostCard data shape */
export function applyPostsFilter(posts, filter) {
    if (!Array.isArray(posts)) return [];
    if (filter === "all") return posts;
    return posts.filter((p) => {
        if (filter === "image")  return !!p.image || (Array.isArray(p.images) && p.images.length > 0);
        if (filter === "poll")   return !!p.poll;
        if (filter === "thread") return !!p.parent_id || (typeof p.thread_count === "number" && p.thread_count > 0);
        if (filter === "text")   return !p.image && !(Array.isArray(p.images) && p.images.length > 0) && !p.poll;
        return true;
    });
}

export function computePostCounts(posts = []) {
    const c = { all: posts.length, text: 0, image: 0, poll: 0, thread: 0 };
    posts.forEach((p) => {
        if (p.image || (Array.isArray(p.images) && p.images.length > 0)) c.image += 1;
        else if (p.poll) c.poll += 1;
        else c.text += 1;
        if (p.parent_id || (typeof p.thread_count === "number" && p.thread_count > 0)) c.thread += 1;
    });
    return c;
}
