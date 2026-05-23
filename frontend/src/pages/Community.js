import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
    Users, BarChart3, Crown, TrendingUp, Share2, Search, MoreHorizontal,
    Flame, Activity,
} from "lucide-react";
import { api, toastApiError } from "../lib/api";
import { PostCard } from "../components/PostCard";
import { Composer } from "../components/Composer";
import { PageHeader } from "../components/PageHeader";
import { Avatar } from "../components/Avatar";
import { COMMUNITY_CATEGORIES, categoryLabel } from "../lib/portuguese";
import { useWsMessages } from "../components/WebSocketProvider";
import { useCommunityPulse } from "../hooks/useCommunityPulse";
import { toast } from "sonner";

const TABS = [
    { key: "conversas", label: "Conversas" },
    { key: "alta", label: "Em alta" },
    { key: "pessoas", label: "Pessoas" },
    { key: "media", label: "Media" },
    { key: "agora", label: "Agora" },
    { key: "sobre", label: "Sobre" },
];

const TEMP_STYLE = {
    fria: "bg-slate-100 text-slate-600",
    morna: "bg-amber-50 text-amber-700",
    quente: "bg-[var(--coral-50)] text-[var(--coral-500)]",
    em_brasa: "bg-[var(--coral-500)]/15 text-[var(--coral-500)]",
    a_ferver: "bg-rose-500/15 text-rose-600",
};

function EnergyMeter({ value = 0 }) {
    const pct = Math.round(Math.max(0, Math.min(1, value)) * 100);
    return (
        <span className="inline-flex items-center gap-1.5" title={`Energia ${pct}%`}>
            <span className="type-overline text-black/45">energia</span>
            <span className="w-16 h-1.5 rounded-full bg-black/[0.08] overflow-hidden">
                <span className="block h-full rounded-full" style={{ width: `${pct}%`, background: "linear-gradient(90deg, var(--coral-500), #f0a) " }} />
            </span>
        </span>
    );
}

// Faixa de estado vivo — sempre visível (a "activity layer" forte).
function LiveStrip({ pulse, presentNow }) {
    if (!pulse) return null;
    const topTrend = (pulse.meaningful_trends && pulse.meaningful_trends[0]) || (pulse.trends && pulse.trends[0]);
    return (
        <div className="px-4 lg:px-6 py-2.5 hairline-b flex items-center gap-3 flex-wrap text-[12.5px]" data-testid="community-livestrip">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium ${TEMP_STYLE[pulse.temperature] || TEMP_STYLE.fria}`}>
                <Flame size={12} /> {pulse.temperature_label}
            </span>
            <span className="inline-flex items-center gap-1.5 text-black/70 font-medium">
                <span className="live-dot" /> {presentNow} {presentNow === 1 ? "pessoa aqui agora" : "pessoas aqui agora"}
            </span>
            <span className="text-black/50">{pulse.state_label}</span>
            {pulse.dominant_mood_label && <span className="text-black/45">· {pulse.dominant_mood_label}</span>}
            {topTrend && (
                <Link to={`/tag/${encodeURIComponent(topTrend.tag)}`} className="text-[var(--eu-500)] font-medium hover:underline">
                    {topTrend.label} a crescer
                </Link>
            )}
            <EnergyMeter value={pulse.energy} />
        </div>
    );
}

export default function Community() {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [community, setCommunity] = useState(null);
    const [posts, setPosts] = useState([]);
    const [members, setMembers] = useState([]);
    const [stats, setStats] = useState(null);
    const [nowData, setNowData] = useState(null);
    const [ticker, setTicker] = useState([]);
    const [tab, setTab] = useState("conversas");
    const [q, setQ] = useState("");
    const [menuOpen, setMenuOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    const { pulse, presentNow } = useCommunityPulse(slug, community?.id);

    const loadCore = useCallback(async () => {
        try {
            const [c, p] = await Promise.all([
                api.get(`/communities/${slug}`),
                api.get(`/communities/${slug}/posts`),
            ]);
            setCommunity(c.data);
            setPosts(p.data);
        } catch (e) { toastApiError(e); navigate("/communities"); }
        finally { setLoading(false); }
    }, [slug, navigate]);

    const loadMembers = async () => { try { const { data } = await api.get(`/communities/${slug}/members`); setMembers(data); } catch { /* */ } };
    const loadStats = async () => { try { const { data } = await api.get(`/communities/${slug}/stats`); setStats(data); } catch { /* */ } };
    const loadNow = useCallback(async () => {
        try {
            const { data } = await api.get(`/communities/${slug}/now`);
            setNowData(data);
            setTicker(data.ticker || []);
        } catch { /* */ }
    }, [slug]);

    useEffect(() => { setLoading(true); loadCore(); }, [loadCore]);
    useEffect(() => {
        if (tab === "pessoas" && members.length === 0) loadMembers();
        if (tab === "alta" && !stats) loadStats();
        if ((tab === "agora" || tab === "alta" || tab === "pessoas") && !nowData) loadNow();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab]);

    // Activity ticker ao vivo: prepende eventos da comunidade.
    const onWs = useCallback((msg) => {
        if (!msg || msg.type !== "community_activity" || !community || msg.community_id !== community.id) return;
        setTicker((prev) => {
            const item = {
                event: msg.event, post_id: msg.post_id, at: msg.at,
                author_id: msg.actor?.id, preview: msg.preview, _actor: msg.actor,
            };
            return [item, ...prev].slice(0, 30);
        });
    }, [community]);
    useWsMessages(onWs);

    const join = async () => { try { await api.post(`/communities/${slug}/join`); loadCore(); } catch (e) { toastApiError(e); } };
    const share = async () => {
        try { await navigator.clipboard.writeText(`${window.location.origin}/c/${slug}`); toast.success("Link copiado"); }
        catch { toast.error("Não consegui copiar"); }
        setMenuOpen(false);
    };

    const filteredPosts = useMemo(() => {
        const needle = q.trim().toLowerCase();
        if (!needle) return posts;
        return posts.filter((p) => (p.content || "").toLowerCase().includes(needle));
    }, [posts, q]);

    const mediaPosts = useMemo(
        () => posts.filter((p) => p.image || (Array.isArray(p.images) && p.images.length > 0)),
        [posts],
    );

    if (loading || !community) return <div className="p-12 text-center type-overline">a carregar…</div>;

    return (
        <div data-testid="community-page">
            <PageHeader title={community.name} subtitle={`${community.members_count} membros · ${categoryLabel(COMMUNITY_CATEGORIES, community.category)}`} back testid="community-header" />

            <div className="relative h-32 lg:h-44 overflow-hidden grid place-items-center">
                <div className="absolute inset-0 silver-grad" />
                <div className="absolute inset-0 opacity-60 mix-blend-multiply" style={{ background: "radial-gradient(circle at 30% 35%, rgba(106,168,230,0.16), transparent 55%), radial-gradient(circle at 75% 70%, rgba(232,93,108,0.10), transparent 55%)" }} />
                <Users size={38} strokeWidth={1.3} className="relative text-black/45" />
            </div>

            <div className="px-4 lg:px-6 py-5 hairline-b">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                        <p className="type-overline mb-1">{community.members_count} membros · {categoryLabel(COMMUNITY_CATEGORIES, community.category)}</p>
                        <h2 className="font-display text-[30px] lg:text-[34px] tracking-tight leading-none truncate text-black">{community.name}</h2>
                        <p className="font-mono text-[11px] text-black/45 mt-2">/c/{community.slug}</p>
                        {community.description && <p className="mt-3 text-[14.5px] text-black/75 leading-relaxed max-w-2xl">{community.description}</p>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <div className="relative">
                            <button onClick={() => setMenuOpen((v) => !v)} title="Menu" data-testid="community-menu-btn" className="w-9 h-9 grid place-items-center rounded-full border border-black/[0.10] hover:bg-black/[0.04] transition">
                                <MoreHorizontal size={15} />
                            </button>
                            {menuOpen && (
                                <div className="absolute right-0 top-11 z-30 w-44 card-lux p-1 anim-fade-up">
                                    <button onClick={share} className="w-full text-left px-3 py-2 rounded-lg text-[13px] hover:bg-black/[0.04] flex items-center gap-2"><Share2 size={14} /> Copiar link</button>
                                </div>
                            )}
                        </div>
                        <button onClick={join} data-testid="community-join-btn" className={`text-[11px] font-heading font-medium tracking-tight rounded-full px-5 py-2.5 transition active:scale-95 ${community.joined ? "chip-on" : "btn-obsidian"}`}>
                            {community.joined ? "Sair" : "Entrar"}
                        </button>
                    </div>
                </div>
            </div>

            {/* Activity layer — estado vivo sempre visível */}
            <LiveStrip pulse={pulse} presentNow={presentNow} />

            <div className="grid grid-cols-6 hairline-b sticky top-[var(--mobile-topbar-h)] lg:top-[57px] z-20 glass">
                {TABS.map((t) => (
                    <button key={t.key} onClick={() => setTab(t.key)} data-testid={`community-tab-${t.key}`} className={`py-3 font-heading text-[11.5px] tracking-tight transition relative ${tab === t.key ? "text-black font-medium" : "text-black/45 hover:text-black/70"}`}>
                        {t.label}
                        {tab === t.key && (<span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-[2px] bg-black rounded-full" />)}
                    </button>
                ))}
            </div>

            {tab === "conversas" && (
                <>
                    {community.joined ? (
                        <Composer onPosted={(p) => setPosts((prev) => [p, ...prev])} communityId={community.id} />
                    ) : (
                        <div className="p-6 text-center hairline-b">
                            <p className="type-overline mb-1">Restrito a membros</p>
                            <p className="text-black/60 font-mono text-sm">Entra na comunidade para publicar.</p>
                        </div>
                    )}

                    <div className="px-4 lg:px-5 py-2.5 hairline-b">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/35" />
                            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquisar nas conversas…" data-testid="community-search"
                                className="w-full h-9 pl-9 pr-3 rounded-full bg-black/[0.04] focus:bg-white focus:ring-2 ring-black/15 text-[13px] outline-none" />
                        </div>
                    </div>

                    {filteredPosts.length === 0 ? (
                        <div className="p-14 text-center">
                            <p className="type-overline mb-2">Calma por aqui</p>
                            <p className="text-black/55 font-mono text-sm">{q ? "Nada encontrado." : "Ainda sem conversas. Começa tu."}</p>
                        </div>
                    ) : (
                        filteredPosts.map((p) => (
                            <PostCard key={p.id} post={p}
                                onChange={(np) => setPosts((prev) => prev.map((x) => (x.id === np.id ? np : x)))}
                                onDelete={(id) => setPosts((prev) => prev.filter((x) => x.id !== id))}
                            />
                        ))
                    )}
                </>
            )}

            {tab === "agora" && (
                <AgoraTab nowData={nowData} ticker={ticker} pulse={pulse} presentNow={presentNow} />
            )}

            {tab === "alta" && (
                <EmAltaTab pulse={pulse} nowData={nowData} stats={stats} />
            )}

            {tab === "pessoas" && (
                <PessoasTab members={members} nowData={nowData} presentNow={presentNow} />
            )}

            {tab === "media" && (
                <div className="p-4 lg:p-5">
                    {mediaPosts.length === 0 ? (
                        <div className="p-10 text-center type-overline">Sem media ainda</div>
                    ) : (
                        <div className="grid grid-cols-3 gap-1.5">
                            {mediaPosts.map((p) => {
                                const src = p.image || (p.images && p.images[0]);
                                return (
                                    <Link key={p.id} to={`/post/${p.id}`} className="aspect-square rounded-lg overflow-hidden bg-black/[0.04]">
                                        <img src={src} alt="" className="w-full h-full object-cover" />
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {tab === "sobre" && (
                <div className="p-5 lg:p-6 space-y-4 max-w-2xl">
                    <div>
                        <p className="type-overline mb-1">Sobre</p>
                        <p className="text-[15px] text-black/80 leading-relaxed">{community.description || "Sem descrição."}</p>
                    </div>
                    <div className="card-lux p-4 space-y-2">
                        <p className="type-overline">Regras da comunidade</p>
                        <ul className="list-decimal list-inside space-y-1 text-[14px] text-black/75">
                            <li>Respeita os membros — nada de insultos.</li>
                            <li>Só conteúdo relevante para esta comunidade.</li>
                            <li>Sem spam, sem auto-promoção excessiva.</li>
                            <li>Em português (PT) sempre que possível.</li>
                        </ul>
                    </div>
                    <div className="text-[12px] text-black/55 font-mono">criada em {new Date(community.created_at).toLocaleDateString("pt-PT")}</div>
                </div>
            )}
        </div>
    );
}

function PresenceAvatars({ users = [], count = 0 }) {
    const shown = users.slice(0, 8);
    return (
        <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
                {shown.map((u) => (
                    <Link key={u.id} to={`/u/${u.username}`} className="ring-2 ring-white rounded-full" title={u.name || u.username}>
                        <Avatar user={u} size={32} />
                    </Link>
                ))}
            </div>
            <span className="text-[12.5px] text-black/55">
                {count > shown.length ? `+${count - shown.length} ` : ""}{count === 1 ? "pessoa" : "pessoas"} aqui agora
            </span>
        </div>
    );
}

function AgoraTab({ nowData, ticker, pulse, presentNow }) {
    const fmtAgo = (iso) => {
        try {
            const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
            if (s < 60) return "agora mesmo";
            if (s < 3600) return `há ${Math.floor(s / 60)}min`;
            return `há ${Math.floor(s / 3600)}h`;
        } catch { return ""; }
    };
    const authors = nowData?.authors || {};
    return (
        <div className="p-4 lg:p-5 space-y-5">
            <div className="card-lux p-4">
                <p className="type-overline mb-2">Quem está aqui</p>
                {nowData?.present?.length ? (
                    <PresenceAvatars users={nowData.present} count={nowData.present_count || presentNow} />
                ) : (
                    <p className="text-[13px] text-black/45">
                        {presentNow > 0 ? `${presentNow} ${presentNow === 1 ? "pessoa" : "pessoas"} por aqui.` : "Ninguém na sala neste instante."}
                    </p>
                )}
            </div>

            {nowData?.growing?.length > 0 && (
                <div className="card-lux p-4">
                    <p className="type-overline mb-2 flex items-center gap-1.5"><TrendingUp size={12} /> Conversas a crescer</p>
                    <ul className="space-y-2.5">
                        {nowData.growing.map((g) => (
                            <li key={g.post_id}>
                                <Link to={`/post/${g.post_id}`} className="block hover:bg-black/[0.02] rounded-lg p-1.5 -m-1.5">
                                    <div className="text-[13.5px] text-black/80 line-clamp-2">{g.preview || "(sem texto)"}</div>
                                    <div className="text-[11px] font-mono text-[var(--coral-500)] mt-0.5">{g.recent_comments_30m} respostas há pouco</div>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="card-lux p-4">
                <p className="type-overline mb-2 flex items-center gap-1.5"><Activity size={12} /> A acontecer agora</p>
                {ticker.length === 0 ? (
                    <p className="text-[13px] text-black/45">Sem atividade nos últimos minutos.</p>
                ) : (
                    <ul className="space-y-2">
                        {ticker.map((t, i) => {
                            const a = t._actor || authors[t.author_id];
                            return (
                                <li key={`${t.post_id}-${t.at}-${i}`} className="flex items-start gap-2.5 anim-fade-up">
                                    {a ? <Avatar user={a} size={26} /> : <span className="w-[26px] h-[26px] rounded-full bg-black/[0.06]" />}
                                    <div className="min-w-0 flex-1">
                                        <div className="text-[12.5px] text-black/75">
                                            <span className="font-medium">{a?.name || a?.username || "alguém"}</span>{" "}
                                            {t.event === "post" ? "publicou" : "comentou"}
                                            <span className="text-black/40"> · {fmtAgo(t.at)}</span>
                                        </div>
                                        {t.preview && (
                                            <Link to={t.post_id ? `/post/${t.post_id}` : "#"} className="text-[12.5px] text-black/55 line-clamp-1 hover:text-black/80">{t.preview}</Link>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </div>
    );
}

function EmAltaTab({ pulse, nowData, stats }) {
    const trends = (pulse?.trends || []);
    return (
        <div className="p-4 lg:p-5 space-y-5">
            <div className="card-lux p-4">
                <p className="type-overline mb-2 flex items-center gap-1.5"><Flame size={12} /> Tópicos internos</p>
                {trends.length === 0 ? (
                    <p className="text-[13px] text-black/45">Sem tópicos a destacar agora.</p>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {trends.map((t) => (
                            <Link key={t.tag} to={`/tag/${encodeURIComponent(t.tag)}`}
                                className={`inline-flex items-center gap-1.5 px-3 h-8 rounded-full border text-[12.5px] ${t.meaningful ? "border-[var(--coral-500)]/30 text-[var(--coral-500)]" : "border-black/[0.08] text-black/70"} hover:shadow-sm transition`}>
                                {t.label}
                                {typeof t.delta_pct === "number" && <span className="text-[11px] font-mono text-[var(--eu-500)]">↑{Math.round(t.delta_pct)}%</span>}
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {nowData?.growing?.length > 0 && (
                <div className="card-lux p-4">
                    <p className="type-overline mb-2">Conversas a crescer</p>
                    <ul className="space-y-2.5">
                        {nowData.growing.map((g) => (
                            <li key={g.post_id}>
                                <Link to={`/post/${g.post_id}`} className="block hover:bg-black/[0.02] rounded-lg p-1.5 -m-1.5">
                                    <div className="text-[13.5px] text-black/80 line-clamp-2">{g.preview || "(sem texto)"}</div>
                                    <div className="text-[11px] font-mono text-[var(--coral-500)] mt-0.5">{g.recent_comments_30m} respostas há pouco</div>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {stats && (
                <div className="card-lux p-4">
                    <div className="flex items-center justify-between mb-3">
                        <span className="type-overline">Atividade (últimos 7 dias)</span>
                        <span className="text-[11px] text-black/45"><BarChart3 size={11} className="inline" /> {stats.unique_authors_week} autores</span>
                    </div>
                    <div className="flex items-end gap-1.5 h-24">
                        {stats.by_day.map((d) => {
                            const max = Math.max(...stats.by_day.map((x) => x.count), 1);
                            return (
                                <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                                    <div className="w-full bg-black/85 rounded-sm transition-all" style={{ height: `${(d.count / max) * 100}%`, minHeight: 2 }} />
                                    <span className="text-[9px] text-black/45 font-mono">{new Date(d.date).toLocaleDateString("pt-PT", { weekday: "short" }).slice(0, 3)}</span>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

function PessoasTab({ members, nowData, presentNow }) {
    return (
        <div className="pb-6">
            {nowData?.present?.length > 0 && (
                <div className="p-4 lg:p-5 hairline-b">
                    <p className="type-overline mb-2.5">Aqui agora</p>
                    <PresenceAvatars users={nowData.present} count={nowData.present_count || presentNow} />
                </div>
            )}
            {members.length === 0 ? (
                <div className="p-14 text-center"><p className="type-overline mb-2">a carregar</p></div>
            ) : (
                members.map((u, i) => (
                    <Link key={u.id} to={`/u/${u.username}`} className="flex items-center gap-3 px-4 lg:px-5 py-3.5 hairline-b hover:bg-black/[0.015] transition">
                        <span className="w-7 text-right text-[16px] font-display text-black/25">{i + 1}</span>
                        <Avatar user={u} size={42} />
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                                <span className="font-medium text-[14px] truncate">{u.name || u.username}</span>
                                {u.is_owner && (<span className="inline-flex items-center gap-0.5 text-amber-500 text-[10px] font-mono uppercase"><Crown size={11} /> dono</span>)}
                            </div>
                            <div className="text-[12px] text-black/55">@{u.username} · <span className="font-mono text-[10px] bg-black/[0.05] px-1.5 py-0.5 rounded">{u.posts_in_community}p · {u.likes_in_community}♥</span></div>
                        </div>
                    </Link>
                ))
            )}
        </div>
    );
}
