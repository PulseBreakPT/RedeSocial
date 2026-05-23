import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
    Users, BarChart3, Crown, TrendingUp, Share2, Search, MoreHorizontal,
    Flame, Activity, Shield, Flag, VolumeX, UserX, Trash2, Check, Clock, Pencil,
    Bell, BellOff, MapPin, UserCheck, Coffee,
} from "lucide-react";
import { api, toastApiError } from "../lib/api";
import { PostCard } from "../components/PostCard";
import { Composer } from "../components/Composer";
import { PageHeader } from "../components/PageHeader";
import { Avatar } from "../components/Avatar";
import { COMMUNITY_CATEGORIES, categoryLabel } from "../lib/portuguese";
import { useWsMessages } from "../components/WebSocketProvider";
import { useCommunityPulse } from "../hooks/useCommunityPulse";
import { useCommunityRhythm } from "../hooks/useCommunityRhythm";
import { toast } from "sonner";

const BASE_TABS = [
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

function Sparkline({ points = [], width = 96, height = 20 }) {
    if (!points.length) return null;
    const max = Math.max(...points.map((p) => p.value), 1);
    const step = width / Math.max(1, points.length - 1);
    const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${(height - (p.value / max) * (height - 2) - 1).toFixed(1)}`).join(" ");
    return (
        <svg width={width} height={height} className="overflow-visible" aria-hidden>
            <path d={d} fill="none" stroke="var(--coral-500)" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" opacity="0.85" />
        </svg>
    );
}

const HAPPENING_PHRASE = {
    a_ferver: "A comunidade está a ferver",
    em_brasa: "A comunidade está em brasa",
    delta: "Movimento fora do normal agora",
};

function HappeningBanner({ happening, onAmplify }) {
    if (!happening || !happening.active) return null;
    const phrase = HAPPENING_PHRASE[happening.kind] || "Algo está a acontecer";
    return (
        <div className="px-4 lg:px-6 py-2.5 flex items-center gap-3 text-[13px] text-white"
            style={{ background: "linear-gradient(90deg, var(--coral-500), #e0457a)" }}
            data-testid="community-happening">
            <span className="live-dot" style={{ background: "white" }} />
            <Flame size={15} />
            <span className="font-medium">{phrase}</span>
            {happening.top_trend?.label && <span className="opacity-90">· {happening.top_trend.label}</span>}
            {happening.amplifiers_count > 0 && (
                <span className="opacity-80 font-mono text-[11px]">{happening.amplifiers_count} a amplificar</span>
            )}
            <button onClick={onAmplify} data-testid="community-amplify-btn"
                className="ml-auto text-[11.5px] font-heading font-medium bg-white/20 hover:bg-white/30 rounded-full px-3.5 py-1.5 transition active:scale-95 inline-flex items-center gap-1">
                <Flame size={12} /> Amplificar
            </button>
        </div>
    );
}

// Faixa de estado vivo — sempre visível (a "activity layer" forte).
function LiveStrip({ pulse, presentNow, typers = [], rhythm }) {
    if (!pulse) return null;
    const topTrend = (pulse.meaningful_trends && pulse.meaningful_trends[0]) || (pulse.trends && pulse.trends[0]);
    const typerName = typers[0] ? (typers[0].user.name || typers[0].user.username) : null;
    return (
        <div className="px-4 lg:px-6 py-2.5 hairline-b flex items-center gap-3 flex-wrap text-[12.5px]" data-testid="community-livestrip">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium ${TEMP_STYLE[pulse.temperature] || TEMP_STYLE.fria}`}>
                <Flame size={12} /> {pulse.temperature_label}
            </span>
            <span className="inline-flex items-center gap-1.5 text-black/70 font-medium">
                <span className="live-dot" /> {presentNow} {presentNow === 1 ? "pessoa aqui agora" : "pessoas aqui agora"}
            </span>
            {typerName ? (
                <span className="inline-flex items-center gap-1 text-[var(--coral-500)] anim-fade-up">
                    <Pencil size={11} /> {typers.length > 1 ? `${typers.length} a escrever…` : `${typerName} a escrever…`}
                </span>
            ) : (
                <span className="text-black/50">{pulse.state_label}</span>
            )}
            {pulse.dominant_mood_label && <span className="text-black/45">· {pulse.dominant_mood_label}</span>}
            {topTrend && (
                <Link to={`/tag/${encodeURIComponent(topTrend.tag)}`} className="text-[var(--eu-500)] font-medium hover:underline">
                    {topTrend.label} a crescer
                </Link>
            )}
            <EnergyMeter value={pulse.energy} />
            {rhythm?.sparkline_24h?.length > 0 && (
                <span className="ml-auto hidden sm:inline-flex items-center" title="Respiração das últimas 24h">
                    <Sparkline points={rhythm.sparkline_24h} />
                </span>
            )}
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
    const [reports, setReports] = useState([]);
    const [modlog, setModlog] = useState([]);
    const [openReports, setOpenReports] = useState(0);
    const [saude, setSaude] = useState(null);
    const [nucleo, setNucleo] = useState(null);
    const [yourPeople, setYourPeople] = useState([]);
    const [subscribed, setSubscribed] = useState(false);
    const [pertenca, setPertenca] = useState(null);
    const [communityMesas, setCommunityMesas] = useState([]);
    const [tab, setTab] = useState("conversas");
    const [q, setQ] = useState("");
    const [menuOpen, setMenuOpen] = useState(false);
    const [loading, setLoading] = useState(true);

    const { pulse, presentNow, typers, notifyTyping, happening, amplify } = useCommunityPulse(slug, community?.id);
    const { rhythm } = useCommunityRhythm(slug, !!community);
    const [pastHappenings, setPastHappenings] = useState([]);
    const canMod = !!community?.can_moderate;
    const isOwner = !!community?.is_owner;

    const tabs = useMemo(
        () => (canMod ? [...BASE_TABS, { key: "mod", label: "Moderação" }] : BASE_TABS),
        [canMod],
    );

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
    const loadReports = useCallback(async () => {
        try {
            const { data } = await api.get(`/communities/${slug}/reports?status=open`);
            setReports(data || []);
            setOpenReports((data || []).length);
        } catch { /* */ }
    }, [slug]);
    const loadModlog = useCallback(async () => {
        try { const { data } = await api.get(`/communities/${slug}/modlog`); setModlog(data || []); } catch { /* */ }
    }, [slug]);
    const loadHappenings = useCallback(async () => {
        try { const { data } = await api.get(`/communities/${slug}/happenings`); setPastHappenings(data || []); } catch { /* */ }
    }, [slug]);
    const loadSaude = useCallback(async () => {
        try { const { data } = await api.get(`/communities/${slug}/saude`); setSaude(data); } catch { /* */ }
    }, [slug]);
    const loadNucleo = useCallback(async () => {
        try {
            const [n, p] = await Promise.all([
                api.get(`/communities/${slug}/nucleo`),
                api.get(`/communities/${slug}/as-tuas-pessoas`),
            ]);
            setNucleo(n.data);
            setYourPeople(p.data?.people || []);
        } catch { /* */ }
    }, [slug]);
    const loadPertenca = useCallback(async () => {
        try { const { data } = await api.get(`/communities/${slug}/pertenca`); setPertenca(data); } catch { /* */ }
    }, [slug]);
    const loadCommunityMesas = useCallback(async () => {
        try { const { data } = await api.get(`/communities/${slug}/mesas`); setCommunityMesas(data || []); } catch { /* */ }
    }, [slug]);

    // Carrega contagem de reports abertos assim que se sabe que é mod.
    useEffect(() => { if (canMod) loadReports(); }, [canMod, loadReports]);

    // Estado de subscrição (sino) assim que a comunidade carrega.
    useEffect(() => {
        if (!community) return;
        api.get(`/communities/${slug}/subscription`)
            .then(({ data }) => setSubscribed(!!data.subscribed))
            .catch(() => { /* */ });
    }, [community, slug]);

    useEffect(() => { setLoading(true); loadCore(); }, [loadCore]);
    useEffect(() => {
        if (tab === "pessoas" && members.length === 0) loadMembers();
        if (tab === "pessoas" && !nucleo) loadNucleo();
        if (tab === "pessoas" && !pertenca) loadPertenca();
        if (tab === "alta" && !stats) loadStats();
        if ((tab === "agora" || tab === "alta" || tab === "pessoas") && !nowData) loadNow();
        if (tab === "agora") { loadHappenings(); loadCommunityMesas(); }
        if (tab === "mod") { loadReports(); loadModlog(); loadSaude(); }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab]);

    // Eventos ao vivo da comunidade: ticker, moderação e novos reports.
    const onWs = useCallback((msg) => {
        if (!msg || !community || msg.community_id !== community.id) return;
        if (msg.type === "community_activity") {
            setTicker((prev) => [{
                event: msg.event, post_id: msg.post_id, at: msg.at,
                author_id: msg.actor?.id, preview: msg.preview, _actor: msg.actor,
            }, ...prev].slice(0, 30));
            if (msg.event === "mesa") loadCommunityMesas();
        } else if (msg.type === "community_mod") {
            // Fluxo de moderação realtime: remove o post do feed na hora.
            if (msg.action === "remove_post" && msg.removed_post_id) {
                setPosts((prev) => prev.filter((p) => p.id !== msg.removed_post_id));
            }
        } else if (msg.type === "community_report_new") {
            setOpenReports((n) => n + 1);
            setReports((prev) => (msg.report ? [msg.report, ...prev] : prev));
        } else if (msg.type === "community_welcome") {
            const bits = [];
            if (msg.following_here > 0) bits.push(`${msg.following_here} que segues`);
            if (msg.city_mates_here > 0) bits.push(`${msg.city_mates_here} da tua cidade`);
            toast.success(`Bem-vindo a ${msg.name || "esta comunidade"}`, {
                description: bits.length ? `${bits.join(" · ")} já por aqui.` : "Faz-te em casa.",
            });
        }
    }, [community, loadCommunityMesas]);
    useWsMessages(onWs);

    const join = async () => { try { await api.post(`/communities/${slug}/join`); loadCore(); } catch (e) { toastApiError(e); } };
    const share = async () => {
        try { await navigator.clipboard.writeText(`${window.location.origin}/c/${slug}`); toast.success("Link copiado"); }
        catch { toast.error("Não consegui copiar"); }
        setMenuOpen(false);
    };

    // ── Ações de moderação (reais; o WS reflete-as ao vivo a todos) ──
    const removePost = async (postId) => {
        try {
            await api.post(`/communities/${slug}/moderate/post`, { post_id: postId });
            setPosts((prev) => prev.filter((p) => p.id !== postId));
            toast.success("Post removido da comunidade");
        } catch (e) { toastApiError(e); }
    };
    const banMember = async (uid, action = "ban") => {
        try {
            await api.post(`/communities/${slug}/members/${uid}/ban`, { action });
            toast.success(action === "ban" ? "Membro expulso" : "Readmitido");
            loadMembers();
        } catch (e) { toastApiError(e); }
    };
    const muteMember = async (uid, minutes = 60) => {
        try {
            await api.post(`/communities/${slug}/members/${uid}/mute`, { action: "mute", minutes });
            toast.success("Membro silenciado");
        } catch (e) { toastApiError(e); }
    };
    const promoteMod = async (uid, action = "add") => {
        try {
            const { data } = await api.post(`/communities/${slug}/mods`, { user_id: uid, action });
            setCommunity(data);
            toast.success(action === "add" ? "Promovido a moderador" : "Removido de moderador");
        } catch (e) { toastApiError(e); }
    };
    const resolveReport = async (reportId, action) => {
        try {
            await api.post(`/communities/${slug}/reports/${reportId}/resolve`, { action });
            setReports((prev) => prev.filter((r) => r.id !== reportId));
            setOpenReports((n) => Math.max(0, n - 1));
            loadModlog();
            toast.success("Report resolvido");
        } catch (e) { toastApiError(e); }
    };
    const reportPost = async (postId, reason) => {
        try {
            await api.post(`/communities/${slug}/report`, { kind: "post", target_id: postId, reason });
            toast.success("Reportado. Obrigado.");
        } catch (e) { toastApiError(e); }
    };
    const joinMesa = async (mesaId) => {
        try { await api.post(`/mesas/${mesaId}/join`); } catch { /* idempotente */ }
        navigate(`/mesas?open=${mesaId}`);
    };
    const toggleSubscribe = async () => {
        try {
            if (subscribed) {
                await api.delete(`/communities/${slug}/subscribe`);
                setSubscribed(false);
                toast.success("Deixaste de seguir esta comunidade");
            } else {
                await api.post(`/communities/${slug}/subscribe`, { posts: true, happenings: true });
                setSubscribed(true);
                toast.success("Vais receber novidades deste bairro");
            }
        } catch (e) { toastApiError(e); }
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
                        <button onClick={toggleSubscribe} title={subscribed ? "A seguir" : "Seguir comunidade"} data-testid="community-subscribe-btn"
                            className={`w-9 h-9 grid place-items-center rounded-full border transition ${subscribed ? "border-[var(--coral-500)]/40 text-[var(--coral-500)] bg-[var(--coral-50)]" : "border-black/[0.10] hover:bg-black/[0.04]"}`}>
                            {subscribed ? <Bell size={15} /> : <BellOff size={15} />}
                        </button>
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

            {/* Momento ao vivo (happening) — quando o bairro ferve */}
            <HappeningBanner happening={happening} onAmplify={amplify} />

            {/* Activity layer — estado vivo sempre visível */}
            <LiveStrip pulse={pulse} presentNow={presentNow} typers={typers} rhythm={rhythm} />

            <div className="hairline-b sticky top-[var(--mobile-topbar-h)] lg:top-[57px] z-20 glass grid" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
                {tabs.map((t) => (
                    <button key={t.key} onClick={() => setTab(t.key)} data-testid={`community-tab-${t.key}`} className={`py-3 font-heading text-[11.5px] tracking-tight transition relative ${tab === t.key ? "text-black font-medium" : "text-black/45 hover:text-black/70"}`}>
                        <span className="inline-flex items-center gap-1">
                            {t.key === "mod" && <Shield size={11} />}
                            {t.label}
                            {t.key === "mod" && openReports > 0 && (
                                <span className="ml-0.5 text-[9px] font-mono bg-[var(--coral-500)] text-white rounded-full px-1.5 py-0.5 leading-none">{openReports}</span>
                            )}
                        </span>
                        {tab === t.key && (<span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-[2px] bg-black rounded-full" />)}
                    </button>
                ))}
            </div>

            {tab === "conversas" && (
                <>
                    {community.joined ? (
                        <Composer onPosted={(p) => setPosts((prev) => [p, ...prev])} communityId={community.id} onType={notifyTyping} />
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
                            <div key={p.id}>
                                <PostCard post={p}
                                    onChange={(np) => setPosts((prev) => prev.map((x) => (x.id === np.id ? np : x)))}
                                    onDelete={(id) => setPosts((prev) => prev.filter((x) => x.id !== id))}
                                />
                                <CommunityPostActions post={p} canMod={canMod} onRemove={removePost} onReport={reportPost} />
                            </div>
                        ))
                    )}
                </>
            )}

            {tab === "agora" && (
                <AgoraTab nowData={nowData} ticker={ticker} pulse={pulse} presentNow={presentNow}
                    pastHappenings={pastHappenings} mesas={communityMesas} onJoinMesa={joinMesa} />
            )}

            {tab === "alta" && (
                <EmAltaTab pulse={pulse} nowData={nowData} stats={stats} />
            )}

            {tab === "pessoas" && (
                <PessoasTab members={members} nowData={nowData} presentNow={presentNow}
                    canMod={canMod} isOwner={isOwner} ownerId={community.owner_id}
                    onBan={banMember} onMute={muteMember} onPromote={promoteMod}
                    nucleo={nucleo} yourPeople={yourPeople} pertenca={pertenca} />
            )}

            {tab === "mod" && canMod && (
                <ModeracaoTab reports={reports} modlog={modlog} onResolve={resolveReport} saude={saude} />
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
                    <RitmoPanel rhythm={rhythm} />
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

function AgoraTab({ nowData, ticker, pulse, presentNow, pastHappenings = [], mesas = [], onJoinMesa }) {
    const fmtAgo = (iso) => {
        try {
            const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
            if (s < 60) return "agora mesmo";
            if (s < 3600) return `há ${Math.floor(s / 60)}min`;
            return `há ${Math.floor(s / 3600)}h`;
        } catch { return ""; }
    };
    const fmtMoment = (iso) => {
        try { return new Date(iso).toLocaleString("pt-PT", { weekday: "short", hour: "2-digit", minute: "2-digit" }); }
        catch { return ""; }
    };
    const authors = nowData?.authors || {};
    const past = pastHappenings.filter((h) => !h.active);
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

            {mesas.length > 0 && (
                <div className="card-lux p-4">
                    <p className="type-overline mb-2 flex items-center gap-1.5"><Coffee size={12} /> Mesas do bairro</p>
                    <ul className="space-y-2">
                        {mesas.map((m) => (
                            <li key={m.id} className="flex items-center gap-2.5">
                                <div className="min-w-0 flex-1">
                                    <div className="text-[13.5px] font-medium text-black/80 truncate">{m.title || `#${m.topic}`}</div>
                                    <div className="text-[11px] text-black/45">{m.participants_count} {m.participants_count === 1 ? "pessoa" : "pessoas"} · {m.message_count} msg</div>
                                </div>
                                <button onClick={() => onJoinMesa(m.id)} className="text-[11.5px] font-heading font-medium rounded-full px-3.5 py-1.5 btn-obsidian active:scale-95 transition flex-shrink-0">
                                    Entrar
                                </button>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

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

            {past.length > 0 && (
                <div className="card-lux p-4">
                    <p className="type-overline mb-2 flex items-center gap-1.5"><Flame size={12} /> Momentos recentes</p>
                    <ul className="space-y-2">
                        {past.map((h) => (
                            <li key={h.id} className="text-[12.5px] text-black/65 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-[var(--coral-500)]" />
                                <span className="font-medium">{HAPPENING_PHRASE[h.kind] || "Movimento"}</span>
                                {h.top_trend?.label && <span className="text-black/45">· {h.top_trend.label}</span>}
                                {h.amplifiers_count > 0 && <span className="text-black/40 font-mono text-[10px]">· {h.amplifiers_count}🔥</span>}
                                <span className="text-black/30 ml-auto font-mono text-[10px]">{fmtMoment(h.started_at)}</span>
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

const REPORT_REASONS = ["Spam", "Ofensivo", "Fora de tópico", "Assédio", "Outro"];

function CommunityPostActions({ post, canMod, onRemove, onReport }) {
    const [open, setOpen] = useState(false);
    return (
        <div className="px-4 lg:px-5 -mt-1 pb-2 flex items-center gap-3 hairline-b">
            <div className="relative">
                <button onClick={() => setOpen((v) => !v)} className="text-[11px] font-mono text-black/40 hover:text-black/70 inline-flex items-center gap-1">
                    <Flag size={11} /> reportar
                </button>
                {open && (
                    <div className="absolute left-0 bottom-7 z-30 w-40 card-lux p-1 anim-fade-up">
                        {REPORT_REASONS.map((r) => (
                            <button key={r} onClick={() => { setOpen(false); onReport(post.id, r); }}
                                className="w-full text-left px-3 py-1.5 rounded-lg text-[12.5px] hover:bg-black/[0.04]">{r}</button>
                        ))}
                    </div>
                )}
            </div>
            {canMod && (
                <button onClick={() => onRemove(post.id)} className="text-[11px] font-mono text-rose-600/70 hover:text-rose-600 inline-flex items-center gap-1">
                    <Trash2 size={11} /> remover
                </button>
            )}
        </div>
    );
}

function RitmoPanel({ rhythm }) {
    if (!rhythm) return null;
    const hasData = rhythm.samples > 0;
    const fmtHour = (h) => `${String(h).padStart(2, "0")}h`;
    const profile = rhythm.hourly || [];
    const maxMed = Math.max(...profile.map((p) => p.median_score), 1);
    return (
        <div className="card-lux p-4 space-y-3">
            <div className="flex items-center justify-between">
                <p className="type-overline flex items-center gap-1.5"><Clock size={12} /> Ritmo do bairro</p>
                {rhythm.dias_vivos > 0 && (
                    <span className="text-[11px] font-mono text-[var(--coral-500)]">vivo há {rhythm.dias_vivos} {rhythm.dias_vivos === 1 ? "dia" : "dias"}</span>
                )}
            </div>
            {!hasData ? (
                <p className="text-[13px] text-black/45">Ainda sem ritmo — volta quando isto ganhar vida.</p>
            ) : (
                <>
                    {rhythm.this_hour_hint?.fills && (
                        <p className="text-[13px] text-black/70">A esta hora isto costuma encher.</p>
                    )}
                    {rhythm.strong_hours?.length > 0 && (
                        <p className="text-[12.5px] text-black/55">
                            Horas fortes: {rhythm.strong_hours.map(fmtHour).join(" · ")}
                        </p>
                    )}
                    <div className="flex items-end gap-[3px] h-16 pt-1">
                        {profile.map((p) => (
                            <div key={p.hour} className="flex-1 group relative" title={`${fmtHour(p.hour)} · ${p.median_score}`}>
                                <div className={`w-full rounded-sm transition-all ${p.strong ? "bg-[var(--coral-500)]" : "bg-black/15"}`}
                                    style={{ height: `${Math.max(2, (p.median_score / maxMed) * 100)}%` }} />
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between text-[9px] font-mono text-black/35">
                        <span>00h</span><span>06h</span><span>12h</span><span>18h</span><span>23h</span>
                    </div>
                </>
            )}
        </div>
    );
}

function PeopleFaces({ people = [] }) {
    return (
        <div className="flex flex-wrap gap-3">
            {people.map((u) => (
                <Link key={u.id} to={`/u/${u.username}`} className="flex flex-col items-center gap-1 w-16 text-center group">
                    <Avatar user={u} size={44} />
                    <span className="text-[11px] text-black/65 truncate w-full group-hover:text-black">{u.name || u.username}</span>
                </Link>
            ))}
        </div>
    );
}

function PessoasTab({ members, nowData, presentNow, canMod, isOwner, ownerId, onBan, onMute, onPromote, nucleo, yourPeople = [], pertenca }) {
    return (
        <div className="pb-6">
            {nowData?.present?.length > 0 && (
                <div className="p-4 lg:p-5 hairline-b">
                    <p className="type-overline mb-2.5">Aqui agora</p>
                    <PresenceAvatars users={nowData.present} count={nowData.present_count || presentNow} />
                </div>
            )}

            {pertenca?.following_here?.length > 0 && (
                <div className="p-4 lg:p-5 hairline-b">
                    <p className="type-overline mb-2.5 flex items-center gap-1.5"><UserCheck size={12} /> Pessoas que segues aqui</p>
                    <PeopleFaces people={pertenca.following_here} />
                </div>
            )}

            {pertenca?.city_mates_here?.length > 0 && (
                <div className="p-4 lg:p-5 hairline-b">
                    <p className="type-overline mb-2.5 flex items-center gap-1.5"><MapPin size={12} /> Da tua cidade aqui</p>
                    <PeopleFaces people={pertenca.city_mates_here} />
                </div>
            )}

            {yourPeople.length > 0 && (
                <div className="p-4 lg:p-5 hairline-b">
                    <p className="type-overline mb-2.5">As tuas pessoas aqui</p>
                    <PeopleFaces people={yourPeople} />
                </div>
            )}

            {nucleo && (
                <div className="p-4 lg:p-5 hairline-b">
                    <div className="flex items-center justify-between mb-2.5">
                        <p className="type-overline">Núcleo do bairro</p>
                        {!nucleo.forming && (
                            <span className="text-[11px] font-mono text-black/45" title="Quão interligada está a comunidade">
                                densidade {Math.round((nucleo.density || 0) * 100)}%
                            </span>
                        )}
                    </div>
                    {nucleo.forming ? (
                        <p className="text-[13px] text-black/45">Ainda a formar-se — poucas interações para já.</p>
                    ) : (
                        <PeopleFaces people={nucleo.nucleo || []} />
                    )}
                </div>
            )}
            {members.length === 0 ? (
                <div className="p-14 text-center"><p className="type-overline mb-2">a carregar</p></div>
            ) : (
                members.map((u, i) => {
                    const targetIsOwner = u.id === ownerId;
                    return (
                        <div key={u.id} className="flex items-center gap-3 px-4 lg:px-5 py-3.5 hairline-b hover:bg-black/[0.015] transition">
                            <span className="w-7 text-right text-[16px] font-display text-black/25">{i + 1}</span>
                            <Avatar user={u} size={42} />
                            <Link to={`/u/${u.username}`} className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                    <span className="font-medium text-[14px] truncate">{u.name || u.username}</span>
                                    {u.is_owner && (<span className="inline-flex items-center gap-0.5 text-amber-500 text-[10px] font-mono uppercase"><Crown size={11} /> dono</span>)}
                                </div>
                                <div className="text-[12px] text-black/55">@{u.username} · <span className="font-mono text-[10px] bg-black/[0.05] px-1.5 py-0.5 rounded">{u.posts_in_community}p · {u.likes_in_community}♥</span></div>
                            </Link>
                            {canMod && !targetIsOwner && (
                                <div className="flex items-center gap-1 flex-shrink-0">
                                    <button onClick={() => onMute(u.id, 60)} title="Silenciar 1h" className="w-8 h-8 grid place-items-center rounded-full hover:bg-black/[0.05] text-black/55"><VolumeX size={14} /></button>
                                    <button onClick={() => onBan(u.id, "ban")} title="Expulsar" className="w-8 h-8 grid place-items-center rounded-full hover:bg-rose-50 text-rose-600/70"><UserX size={14} /></button>
                                    {isOwner && (
                                        <button onClick={() => onPromote(u.id, "add")} title="Promover a moderador" className="w-8 h-8 grid place-items-center rounded-full hover:bg-amber-50 text-amber-600/80"><Shield size={14} /></button>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })
            )}
        </div>
    );
}

const MOD_ACTION_LABEL = {
    remove_post: "removeu um post", ban_user: "expulsou", unban_user: "readmitiu",
    mute_user: "silenciou", unmute_user: "retirou silêncio", add_mod: "promoveu a mod",
    remove_mod: "removeu de mod", resolve_report: "resolveu report", dismiss_report: "dispensou report",
};

function SaudePanel({ saude }) {
    if (!saude) return null;
    const b = saude.breakdown || {};
    const score = saude.score;
    const tone = score >= 70 ? "text-emerald-600" : score < 40 ? "text-rose-600" : "text-black/70";
    const rows = [
        ["Reciprocidade", b.reciprocity != null ? `${Math.round((b.reciprocity || 0) * 100)}%` : "—"],
        ["Vozes distintas", b.distinct_authors ?? "—"],
        ["Regulares (7d)", b.regulars_7d ?? "—"],
        ["Toxicidade", b.toxic_hits ?? 0],
        ["Reports", b.reports ?? 0],
    ];
    return (
        <div className="card-lux p-4">
            <div className="flex items-center justify-between mb-3">
                <p className="type-overline">Saúde do bairro</p>
                <span className={`font-display text-[26px] leading-none ${tone}`}>{score}</span>
            </div>
            <p className="text-[11px] text-black/40 mb-3">Sinal privado — influencia a descoberta, nunca é mostrado aos membros.</p>
            <div className="grid grid-cols-2 gap-2">
                {rows.map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between text-[12.5px] bg-black/[0.03] rounded-lg px-2.5 py-1.5">
                        <span className="text-black/55">{k}</span>
                        <span className="font-mono">{v}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function ModeracaoTab({ reports, modlog, onResolve, saude }) {
    const fmt = (iso) => { try { return new Date(iso).toLocaleString("pt-PT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }); } catch { return ""; } };
    return (
        <div className="p-4 lg:p-5 space-y-5">
            <SaudePanel saude={saude} />
            <div className="card-lux p-4">
                <p className="type-overline mb-3 flex items-center gap-1.5"><Flag size={12} /> Reports abertos {reports.length > 0 && <span className="text-[var(--coral-500)]">· {reports.length}</span>}</p>
                {reports.length === 0 ? (
                    <p className="text-[13px] text-black/45">Nada por resolver. Bairro tranquilo.</p>
                ) : (
                    <ul className="space-y-3">
                        {reports.map((r) => (
                            <li key={r.id} className="hairline-b pb-3 last:border-0 last:pb-0">
                                <div className="flex items-center gap-2 text-[12px] mb-1.5">
                                    <span className="font-mono uppercase text-[10px] bg-black/[0.06] px-1.5 py-0.5 rounded">{r.kind}</span>
                                    <span className="font-medium text-black/80">{r.reason}</span>
                                    <span className="text-black/35 ml-auto">{fmt(r.created_at)}</span>
                                </div>
                                {r.detail && <p className="text-[12.5px] text-black/55 mb-2">"{r.detail}"</p>}
                                <div className="flex flex-wrap items-center gap-1.5">
                                    {(r.kind === "post" || r.kind === "comment") && (
                                        <button onClick={() => onResolve(r.id, "remove_post")} className="text-[11.5px] px-2.5 py-1 rounded-full bg-rose-50 text-rose-600 hover:bg-rose-100 inline-flex items-center gap-1"><Trash2 size={11} /> Remover</button>
                                    )}
                                    <button onClick={() => onResolve(r.id, "mute_user")} className="text-[11.5px] px-2.5 py-1 rounded-full bg-black/[0.05] hover:bg-black/10 inline-flex items-center gap-1"><VolumeX size={11} /> Silenciar autor</button>
                                    <button onClick={() => onResolve(r.id, "ban_user")} className="text-[11.5px] px-2.5 py-1 rounded-full bg-black/[0.05] hover:bg-black/10 inline-flex items-center gap-1"><UserX size={11} /> Expulsar autor</button>
                                    <button onClick={() => onResolve(r.id, "dismiss")} className="text-[11.5px] px-2.5 py-1 rounded-full hover:bg-black/[0.05] text-black/55 inline-flex items-center gap-1"><Check size={11} /> Dispensar</button>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <div className="card-lux p-4">
                <p className="type-overline mb-3">Registo de moderação</p>
                {modlog.length === 0 ? (
                    <p className="text-[13px] text-black/45">Sem ações registadas.</p>
                ) : (
                    <ul className="space-y-2">
                        {modlog.map((l) => (
                            <li key={l.id} className="text-[12.5px] text-black/65 flex items-center gap-2">
                                <span className="w-1 h-1 rounded-full bg-black/30" />
                                <span className="font-medium">{MOD_ACTION_LABEL[l.action] || l.action}</span>
                                {l.detail && <span className="text-black/45">· {l.detail}</span>}
                                <span className="text-black/30 ml-auto font-mono text-[10px]">{fmt(l.created_at)}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
