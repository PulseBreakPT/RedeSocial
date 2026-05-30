import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Lock } from "lucide-react";
import { api, toastApiError } from "../lib/api";
import { confirmDialog } from "../components/ConfirmDialog";
import { FollowsModal } from "../components/FollowsModal";
import { PostCard } from "../components/PostCard";
import { ProfileSkeleton, PostSkeletonList } from "../components/Skeleton";
import { PageHeader } from "../components/PageHeader";
import { VerifiedBadge } from "../components/VerifiedBadge";
import { useLiveTime } from "../hooks/useLiveTime";
import { useAuth } from "../context/AuthContext";
import { PT_REGIONS, PT_MOODS, PT_TEAMS } from "../lib/ptCulture";
import {
    PT, Kicker, Sticker, AuthStyles,
    DoodleStar, DoodleSparkles, DoodleScribble, DoodleSpiral,
    DoodleZigzag, DoodleCross, DoodleHeart, GiantAsterisk,
} from "./auth/AuthDecor";

import { IdentityCard } from "./profile/IdentityCard";
import { ShareModal } from "./profile/ShareModal";
import { MobileActionBar } from "./profile/MobileActionBar";
import { ProfileTabBar } from "./profile/ProfileTabBar";
import { HeatmapCompactCard } from "./profile/HeatmapCompactCard";
import { AboutTabSections } from "./profile/AboutTabSections";
import { AffinityRibbon } from "./profile/AffinityRibbon";
import { StoryHighlights } from "../components/stories/StoryHighlights";
import { ProfileActionRow } from "./profile/ProfileActionRow";
import {
    ProfileEmpty, CommunitiesTab,
    PostsFilterBar, applyPostsFilter, computePostCounts,
} from "./profile/ProfileTabContent";

/* Region → fanzine PT color (solid + ink border, não mais gradiente) */
const REGION_PT_COLOR = {
    norte:     PT.green,
    centro:    PT.gold,
    lisboa:    PT.azul,
    alentejo:  PT.gold,
    algarve:   PT.azul,
    madeira:   PT.red,
    acores:    PT.azul,
    emigrante: PT.red,
};
const regionPtBg = (region) => REGION_PT_COLOR[region] || PT.gold;

export default function Profile() {
    const { username } = useParams();
    const navigate = useNavigate();
    const { user: viewer } = useAuth();
    const [profile, setProfile] = useState(null);
    const [posts, setPosts] = useState([]);
    const [stats, setStats] = useState(null);
    const [heatmap, setHeatmap] = useState([]);
    const [mutual, setMutual] = useState(null);
    const [regions, setRegions] = useState(null);
    const [fingerprint, setFingerprint] = useState(null);
    const [communities, setCommunities] = useState(null);
    const [tab, setTab] = useState("posts");
    const [postsFilter, setPostsFilter] = useState("all");
    const [loading, setLoading] = useState(true);
    const [postsLoading, setPostsLoading] = useState(false);
    const [modal, setModal] = useState(null);
    const [shareOpen, setShareOpen] = useState(false);
    useLiveTime(30000);

    const loadAll = async () => {
        setLoading(true);
        try {
            const [p, s, h, fp] = await Promise.all([
                api.get(`/users/${username}`),
                api.get(`/users/${username}/stats`).catch(() => ({ data: null })),
                api.get(`/users/${username}/heatmap`).catch(() => ({ data: [] })),
                api.get(`/users/${username}/fingerprint`).catch(() => ({ data: null })),
            ]);
            setProfile(p.data);
            setStats(s.data);
            setHeatmap(h.data);
            setFingerprint(fp.data);
            if (!p.data.is_self) api.get(`/users/${username}/mutual`).then((r) => setMutual(r.data)).catch(() => {});
        } catch (e) { toastApiError(e); }
        finally { setLoading(false); }
    };
    const loadPosts = async (which) => {
        setPostsLoading(true);
        try { const { data } = await api.get(`/users/${username}/posts?tab=${which}`); setPosts(data); }
        catch { /* silent */ } finally { setPostsLoading(false); }
    };
    const loadRegions     = async () => { try { const { data } = await api.get(`/users/${username}/regions`); setRegions(data); } catch { /* */ } };
    const loadCommunities = async () => { try { const { data } = await api.get(`/users/${username}/communities`); setCommunities(data); } catch { /* */ } };

    useEffect(() => {
        loadAll();
        loadPosts("posts");
        setTab("posts");
        setPostsFilter("all");
        setRegions(null); setCommunities(null);
        // eslint-disable-next-line
    }, [username]);

    useEffect(() => {
        if (!profile) return;
        if (["posts", "replies", "media", "likes"].includes(tab)) loadPosts(tab);
        else if (tab === "communities" && !communities) loadCommunities();
        else if (tab === "about") {
            if (!regions)     loadRegions();
            if (!communities) loadCommunities();
        }
        // eslint-disable-next-line
    }, [tab]);

    const toggleFollow = async () => {
        if (!viewer) { navigate("/login"); return; }
        const prev = profile.is_following;
        if (prev) {
            const ok = await confirmDialog({
                title: `Deixar de seguir @${profile.username}?`,
                description: "Vais deixar de ver as publicações desta pessoa no teu feed.",
                confirmText: "Deixar de seguir",
                cancelText: "Cancelar",
                danger: true,
            });
            if (!ok) return;
        }
        setProfile({ ...profile, is_following: !prev, followers_count: profile.followers_count + (prev ? -1 : 1) });
        try { await api.post(`/users/${username}/follow`); }
        catch (e) { setProfile({ ...profile, is_following: prev }); toastApiError(e); }
    };
    const share = () => setShareOpen(true);
    const onMessage = () => navigate(`/messages/${profile.id}`);
    const onEditProfile = () => navigate("/settings");

    const postCounts = useMemo(() => computePostCounts(posts), [posts]);
    const filteredPosts = useMemo(() => applyPostsFilter(posts, postsFilter), [posts, postsFilter]);

    if (loading || !profile) return <ProfileSkeleton />;

    const regionMeta = PT_REGIONS.find((r) => r.key === profile.region);
    const moodMeta = PT_MOODS.find((m) => m.key === profile.mood_initial);
    const teamMeta = PT_TEAMS.find((t) => t.key === profile.team);

    // === MURO TOTAL ===
    // Quando bloqueámos este utilizador, NADA do conteúdo dele deve ser visível:
    // sem capa, sem avatar, sem bio, sem stories, sem posts, sem comunidades,
    // sem hashtags, sem cidade, sem mensagens. Só mostramos:
    //   · Nome real
    //   · @username
    //   · Botão "Voltar a abrir" (que desfaz o bloqueio)
    if (profile.is_blocked) {
        return <BlockedWallView profile={profile} />;
    }

    return (
        <div data-testid="profile-page" className="pb-32 sm:pb-12 relative" style={{ background: PT.cream, minHeight: "100vh" }}>
            {/* ═══ DOODLES DE FUNDO ═══ */}
            <div className="absolute -top-10 -right-10 pointer-events-none opacity-[0.06] z-0 hidden lg:block" aria-hidden>
                <GiantAsterisk color={PT.red} size={280} rotate={-12} />
            </div>
            <div className="absolute top-[360px] -left-2 sm:left-4 pointer-events-none block opacity-50 scale-[0.55] sm:scale-100 sm:opacity-80 origin-left z-0 hidden lg:block" aria-hidden>
                <DoodleScribble color={PT.azul} w={120} h={48} style={{ transform: "rotate(-6deg)" }} />
            </div>
            <div className="absolute top-[640px] -right-2 sm:right-4 pointer-events-none block opacity-50 scale-[0.55] sm:scale-100 sm:opacity-80 origin-right z-0 hidden lg:block" aria-hidden>
                <DoodleSpiral color={PT.gold} size={56} rotate={12} />
            </div>
            <div className="absolute top-[1000px] -left-2 sm:left-3 pointer-events-none block opacity-50 scale-[0.55] sm:scale-100 sm:opacity-80 origin-left z-0 hidden lg:block" aria-hidden>
                <DoodleSparkles color={PT.red} size={40} rotate={-8} />
            </div>
            <div className="absolute bottom-40 -right-2 sm:right-4 pointer-events-none block opacity-50 scale-[0.55] sm:scale-100 sm:opacity-80 origin-bottom-right z-0 hidden lg:block" aria-hidden>
                <DoodleCross color={PT.green} size={28} rotate={18} />
            </div>

            <PageHeader
                title={
                    <span className="inline-flex items-center gap-1.5">
                        {profile.name} {profile.verified && <VerifiedBadge size={16} />}
                    </span>
                }
                subtitle={`${stats?.posts_count ?? 0} publicações`}
                back
                sticky={false}
                testid="profile-header"
            />

            {/* ---------- HERO BANNER — estilo fanzine PT ---------- */}
            <div
                className="relative h-36 lg:h-52 overflow-hidden"
                data-testid="profile-banner"
                style={{
                    background: regionPtBg(profile.region),
                    borderBottom: `4px solid ${PT.ink}`,
                }}
            >
                {/* Tape em cima e em baixo do banner */}
                <div className="pt-tape h-2 w-full absolute top-0 left-0 z-10" />
                {/* Padrão grão + asterisco esbatido */}
                <div className="absolute inset-0 grain pointer-events-none opacity-50" />
                <div className="absolute -top-8 -right-12 pointer-events-none opacity-25" aria-hidden>
                    <GiantAsterisk color={PT.ink} size={220} rotate={-14} />
                </div>
                {/* Doodles no banner */}
                <div className="absolute top-3 right-4 sm:top-5 sm:right-8 pointer-events-none opacity-90 z-[2]" aria-hidden>
                    <DoodleStar color={PT.ink} size={36} rotate={14} />
                </div>
                <div className="absolute bottom-3 left-4 sm:bottom-5 sm:left-8 pointer-events-none opacity-90 z-[2]" aria-hidden>
                    <DoodleHeart color={PT.ink} size={28} rotate={-12} />
                </div>
                {profile.banner && (
                    <img src={profile.banner} alt="" className="relative w-full h-full object-cover" />
                )}
                {!profile.banner && regionMeta && (
                    <div className="absolute right-4 bottom-5 text-right z-[2]">
                        <Sticker bg={PT.ink} color={PT.gold} rotate={-3} style={{ fontSize: 10, padding: "5px 10px" }}>
                            <span className="mr-1.5" aria-hidden>{regionMeta.emoji}</span>
                            {regionMeta.label}
                        </Sticker>
                    </div>
                )}
            </div>

            {/* ---------- IDENTITY CARD (compact header) ---------- */}
            <IdentityCard
                profile={profile}
                stats={stats}
                mutual={mutual}
                regionMeta={regionMeta}
                moodMeta={moodMeta}
                teamMeta={teamMeta}
                onFollow={toggleFollow}
                onMessage={onMessage}
                onShare={share}
                onEditProfile={onEditProfile}
                onOpenFollowers={() => setModal("followers")}
                onOpenFollowing={() => setModal("following")}
                onOpenMutuals={() => setModal("mutuals")}
                onProfileUpdate={(patch) => setProfile((p) => ({ ...p, ...patch }))}
            />

            {/* ---------- HIGHLIGHTS / Destaques ---------- */}
            <StoryHighlights username={profile.username} isSelf={!!profile.is_self} />

            {/* ---------- ACTION ROW — Acompanhar / Falar / Levantar muro ----------
                Aparece logo abaixo da identidade quando estamos a ver o perfil
                de outra pessoa. Centraliza as 4 acções sociais (seguir,
                deixar de seguir, falar, levantar muro) com wording editorial. */}
            {!profile.is_self && profile.can_view !== false && (
                <ProfileActionRow
                    profile={profile}
                    onMessage={onMessage}
                    onProfileUpdate={(patch) => setProfile((p) => ({ ...p, ...patch }))}
                />
            )}

            {profile.can_view === false ? (
                <div className="mt-12 mx-4 lg:mx-8 p-8 lg:p-12 text-center relative z-10" data-testid="private-locked"
                    style={{
                        background: "#fff",
                        border: `3.5px solid ${PT.ink}`,
                        boxShadow: `6px 6px 0 ${PT.red}`,
                        borderRadius: 24,
                    }}
                >
                    <div
                        className="w-20 h-20 grid place-items-center mx-auto mb-6"
                        style={{
                            background: PT.red, color: "#fff",
                            border: `3px solid ${PT.ink}`, boxShadow: `4px 4px 0 ${PT.ink}`,
                            borderRadius: 999, transform: "rotate(-3deg)",
                        }}
                    >
                        <Lock size={26} strokeWidth={2.2} />
                    </div>
                    <Kicker color={PT.red} className="mb-2">// PERFIL · PRIVADO</Kicker>
                    <h3 className="font-black tracking-tight" style={{ fontSize: 26, color: PT.ink }}>Perfil privado</h3>
                    <p className="font-mono text-[11px] mt-3" style={{ color: "rgba(10,10,10,0.55)", letterSpacing: "0.10em" }}>
                        SEGUE · PARA · VER · PUBLICAÇÕES
                    </p>
                </div>
            ) : (
                <div className="relative z-10">
                    {/* Affinity ribbon only for visitors */}
                    {!profile.is_self && (
                        <AffinityRibbon profile={profile} viewer={viewer} mutual={mutual} fingerprint={fingerprint} />
                    )}

                    {/* Compact heatmap — sem CTA para painel pessoal (removido) */}
                    {heatmap?.length > 0 && (
                        <HeatmapCompactCard
                            heatmap={heatmap}
                            stats={stats}
                            onSeeMore={null}
                        />
                    )}

                    {/* ---------- TABS (sticky) ---------- */}
                    <ProfileTabBar tab={tab} onChange={setTab} />

                    {/* ---------- TAB CONTENT ---------- */}
                    {["posts", "replies", "media", "likes"].includes(tab) && (
                        <>
                            {tab === "posts" && posts.length > 0 && (
                                <PostsFilterBar filter={postsFilter} onChange={setPostsFilter} counts={postCounts} />
                            )}
                            {postsLoading ? (
                                <PostSkeletonList count={3} />
                            ) : (tab === "posts" ? filteredPosts : posts).length === 0 ? (
                                <ProfileEmpty tab={tab} isSelf={profile.is_self} />
                            ) : (
                                (tab === "posts" ? filteredPosts : posts).map((p) => (
                                    <PostCard
                                        key={p.id}
                                        post={p}
                                        onChange={(np) => setPosts((prev) => prev.map((x) => (x.id === np.id ? np : x)))}
                                        onDelete={(id) => setPosts((prev) => prev.filter((x) => x.id !== id))}
                                    />
                                ))
                            )}
                        </>
                    )}

                    {tab === "communities" && <CommunitiesTab communities={communities} />}
                    {tab === "about" && (
                        <AboutTabSections
                            profile={profile}
                            stats={stats}
                            regionMeta={regionMeta}
                            moodMeta={moodMeta}
                            teamMeta={teamMeta}
                            regions={regions}
                            communities={communities}
                            mutual={mutual}
                            onOpenPainel={null}
                            onOpenFollowers={() => setModal("followers")}
                            onOpenFollowing={() => setModal("following")}
                        />
                    )}
                </div>
            )}

            {modal && <FollowsModal username={username} type={modal} onClose={() => setModal(null)} />}
            {shareOpen && <ShareModal profile={profile} onClose={() => setShareOpen(false)} />}

            {/* Mobile sticky action bar */}
            <MobileActionBar
                profile={profile}
                onFollow={toggleFollow}
                onMessage={onMessage}
                onShare={share}
                onEditProfile={onEditProfile}
                onProfileUpdate={(patch) => setProfile((p) => ({ ...p, ...patch }))}
            />
            <AuthStyles />
        </div>
    );
}

/* ============================================================
   BlockedWallView — "muralha total"
   Renderiza um perfil DESPIDO quando o viewer bloqueou esta conta.
   · Sem capa, sem avatar (apenas iniciais cinzentas), sem bio
   · Sem stories, sem posts, sem comunidades, sem hashtags, sem cidade
   · Apenas: nome real, @username, e um botão "Voltar a abrir"
   · Mensagens ficam bloqueadas naturalmente (botão indisponível).
   ============================================================ */
function BlockedWallView({ profile }) {
    const navigate = useNavigate();
    const [busy, setBusy] = useState(false);
    const initials = (profile.name || profile.username || "?")
        .split(/\s+/).slice(0, 2).map((s) => s[0] || "").join("").toUpperCase();

    const unblock = async () => {
        if (busy) return;
        const ok = await confirmDialog({
            title: `Voltar a abrir com @${profile.username}?`,
            description: "O muro cai e voltam a ver-se mutuamente. Não voltarão a seguir-se automaticamente.",
            confirmText: "Voltar a abrir",
            cancelText: "Cancelar",
        });
        if (!ok) return;
        setBusy(true);
        try {
            const { data } = await api.post(`/users/${profile.username}/block`);
            if (data && data.blocked === false) {
                // recarrega o perfil para mostrar a versão completa
                navigate(0);
            }
        } catch (e) { toastApiError(e); }
        finally { setBusy(false); }
    };

    return (
        <div data-testid="profile-blocked-wall" className="pb-32 sm:pb-12">
            <PageHeader
                title="Conta com muro"
                subtitle="Não vês nada desta pessoa enquanto o muro estiver de pé"
                back
                sticky={false}
                testid="profile-header-blocked"
            />

            {/* Banner placeholder — silver-grad uniforme, SEM imagem real */}
            <div
                className="relative h-36 lg:h-52 overflow-hidden border-b border-black/[0.06]"
                style={{
                    background:
                        "repeating-linear-gradient(45deg, rgba(13,13,16,0.04) 0 12px, rgba(13,13,16,0.02) 12px 24px), #f5f5f7",
                }}
                aria-hidden
            >
                <div className="absolute inset-0 grid place-items-center">
                    <Lock size={32} className="text-black/25" strokeWidth={1.6} />
                </div>
            </div>

            {/* Identity stub — APENAS iniciais + nome + @username */}
            <div className="px-4 lg:px-6 -mt-10 lg:-mt-12 relative">
                <div
                    className="w-[84px] h-[84px] rounded-full grid place-items-center bg-[#f1f1f3] border border-black/[0.08] shadow-[0_8px_24px_-12px_rgba(13,13,16,0.18)] text-black/40 font-heading font-semibold text-[22px] tracking-tight select-none"
                    aria-label="Avatar oculto"
                    data-testid="blocked-avatar-placeholder"
                >
                    {initials}
                </div>

                <div className="mt-4">
                    <h1
                        className="font-heading font-semibold text-[22px] lg:text-[26px] tracking-tight text-black"
                        data-testid="blocked-name"
                    >
                        {profile.name || profile.username}
                    </h1>
                    <p
                        className="font-mono text-[13px] text-black/55 mt-0.5"
                        data-testid="blocked-username"
                    >
                        @{profile.username}
                    </p>
                </div>

                {/* Wall info + unblock CTA */}
                <div
                    className="mt-6 max-w-xl rounded-2xl border border-red-200 bg-red-50/40 p-4 sm:p-5"
                    data-testid="blocked-wall-card"
                >
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full grid place-items-center bg-red-100 text-red-600 shrink-0">
                            <Lock size={17} strokeWidth={1.8} />
                        </div>
                        <div className="min-w-0">
                            <div className="font-heading font-semibold text-[15px] tracking-tight text-red-700">
                                Muro levantado
                            </div>
                            <p className="text-[12.5px] text-red-700/80 leading-relaxed mt-1">
                                Não vês nada desta conta: nem foto, nem capa, nem bio, nem
                                publicações, nem stories, nem comunidades, nem mensagens.
                                Esta pessoa também não te vê a ti.
                            </p>
                        </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2 sm:pl-[52px]">
                        <button
                            onClick={unblock}
                            disabled={busy}
                            data-testid="blocked-unblock-btn"
                            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-white border border-red-300 text-red-700 hover:bg-red-100 font-heading font-medium text-[13px] tap-shrink transition disabled:opacity-50"
                        >
                            {busy ? "A reabrir…" : "Voltar a abrir"}
                        </button>
                        <button
                            onClick={() => navigate(-1)}
                            data-testid="blocked-back-btn"
                            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full border border-black/[0.10] text-black/70 hover:bg-black/[0.04] font-heading font-medium text-[13px] tap-shrink transition"
                        >
                            Voltar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
