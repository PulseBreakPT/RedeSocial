import { useEffect, useMemo, useState } from "react";
// =============================================================================
// DESIGN SYSTEM: LUSORAE EDITORIAL — ver /src/theme/EDITORIAL.md
// Página de perfil. Banner regional usa cor PT funcional + hairline subtil.
// Sem doodles, sem asteriscos gigantes, sem stickers rodados. Pills 999px,
// kickers mono, sombras difusas.
// =============================================================================
import { useNavigate, useParams } from "react-router-dom";
import { Lock, ArrowLeft } from "lucide-react";
import { api, toastApiError } from "../lib/api";
import { confirmDialog } from "../components/ConfirmDialog";
import { FollowsModal } from "../components/FollowsModal";
import { PostCard } from "../components/PostCard";
import { ProfileSkeleton, PostSkeletonList } from "../components/Skeleton";
import { VerifiedBadge } from "../components/VerifiedBadge";
import { useLiveTime } from "../hooks/useLiveTime";
import { useAuth } from "../context/AuthContext";
import { PT_REGIONS, PT_MOODS, PT_TEAMS } from "../lib/ptCulture";
import { PT } from "../theme/editorial";
import { EditorialTag } from "../components/editorial/Button";

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

/* Region → cor funcional PT (banner sólido + hairline subtil) */
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
            {/* ─────────── EDITORIAL MASTHEAD (sticky, ink strip + identity meta) ─────────── */}
            <div
                className="sticky top-0 lg:top-0 z-30 backdrop-blur"
                style={{
                    top: "calc(var(--mobile-topbar-h, 0px) + var(--safe-top, 0px))",
                    background: "rgba(247,245,239,0.92)",
                    borderBottom: "1px solid rgba(10,10,10,0.10)",
                }}
                data-testid="profile-header"
            >
                <div className="hidden lg:flex items-center justify-between px-7 py-2" style={{ background: PT.ink, color: "#FBFAF6" }}>
                    <span className="inline-flex items-center gap-2 font-mono text-[10px] font-bold uppercase" style={{ letterSpacing: "0.22em", color: PT.gold }}>
                        <span className="relative flex h-1.5 w-1.5" aria-hidden>
                            <span className="absolute inline-flex h-full w-full rounded-full lusorae-pulse" style={{ background: PT.gold }} />
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: PT.gold }} />
                        </span>
                        LUSORAE · PERFIL · @{profile.username.toUpperCase()}
                    </span>
                    <span className="inline-flex items-center gap-3 font-mono text-[10px] font-bold uppercase" style={{ letterSpacing: "0.18em", color: "rgba(255,244,220,0.55)" }}>
                        {regionMeta && <><span>{regionMeta.label.toUpperCase()}</span><span style={{ color: "rgba(255,244,220,0.28)" }}>·</span></>}
                        <span>{stats?.posts_count ?? 0} PUBLICAÇÕES</span>
                    </span>
                </div>
                <div className="flex items-center gap-3 px-4 lg:px-7 py-3 lg:py-4">
                    <button
                        onClick={() => navigate(-1)}
                        data-testid="profile-back"
                        aria-label="voltar"
                        className="lg:hidden -ml-1 w-9 h-9 grid place-items-center tap-shrink transition"
                        style={{
                            background: "#fff",
                            color: PT.ink,
                            border: "1px solid rgba(10,10,10,0.10)",
                            borderRadius: 999,
                        }}
                    >
                        <ArrowLeft size={18} strokeWidth={2.2} />
                    </button>
                    <div className="flex-1 min-w-0">
                        <h1 className="font-black tracking-[-0.025em] leading-tight truncate inline-flex items-center gap-1.5" style={{ fontSize: "clamp(20px, 2.4vw, 26px)", color: PT.ink }}>
                            {profile.name} {profile.verified && <VerifiedBadge size={16} />}
                        </h1>
                        <p className="text-[10.5px] truncate mt-0.5 font-mono font-bold uppercase" style={{ color: "rgba(10,10,10,0.5)", letterSpacing: "0.18em" }}>
                            @{profile.username} · {stats?.posts_count ?? 0} publicações
                        </p>
                    </div>
                </div>
            </div>

            {/* ---------- HERO BANNER — bloco editorial sólido com hairline ---------- */}
            <div
                className="relative h-36 lg:h-52 overflow-hidden"
                data-testid="profile-banner"
                style={{
                    background: regionPtBg(profile.region),
                    borderBottom: "1px solid rgba(10,10,10,0.10)",
                }}
            >
                {/* Tape multicolor */}
                <div className="pt-tape h-2 w-full absolute top-0 left-0 z-10" />
                {/* Padrão grão subtil */}
                <div className="absolute inset-0 grain pointer-events-none opacity-50" />
                {profile.banner && (
                    <img src={profile.banner} alt="" className="relative w-full h-full object-cover" />
                )}
                {!profile.banner && regionMeta && (
                    <div className="absolute right-4 bottom-4 z-[2]">
                        <EditorialTag tone="ink">
                            <span className="mr-1.5" aria-hidden>{regionMeta.emoji}</span>
                            {regionMeta.label}
                        </EditorialTag>
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
                        border: "1px solid rgba(10,10,10,0.08)",
                        boxShadow: "0 1px 2px rgba(10,10,10,0.04), 0 22px 44px -22px rgba(200,16,46,0.18), 0 8px 22px -12px rgba(10,10,10,0.10)",
                        borderRadius: 24,
                    }}
                >
                    <div
                        className="w-20 h-20 grid place-items-center mx-auto mb-6"
                        style={{
                            background: PT.red, color: "#fff",
                            boxShadow: "0 1px 2px rgba(10,10,10,0.06), 0 12px 28px -10px rgba(200,16,46,0.50)",
                            borderRadius: 999,
                        }}
                    >
                        <Lock size={26} strokeWidth={2.2} />
                    </div>
                    <p className="font-mono font-bold uppercase mb-2" style={{ fontSize: 10.5, letterSpacing: "0.22em", color: PT.red }}>
                        Perfil · Privado
                    </p>
                    <h3 className="font-black tracking-[-0.025em] leading-tight" style={{ fontSize: "clamp(22px, 3vw, 30px)", color: PT.ink }}>Perfil privado</h3>
                    <p className="text-[13.5px] mt-3 font-medium max-w-[36ch] mx-auto" style={{ color: "rgba(10,10,10,0.55)" }}>
                        Segue esta pessoa para veres as publicações.
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
                navigate(0);
            }
        } catch (e) { toastApiError(e); }
        finally { setBusy(false); }
    };

    return (
        <div data-testid="profile-blocked-wall" className="pb-32 sm:pb-12" style={{ background: PT.cream, minHeight: "100vh" }}>
            <div
                className="sticky top-0 z-30 backdrop-blur"
                style={{
                    top: "calc(var(--mobile-topbar-h, 0px) + var(--safe-top, 0px))",
                    background: "rgba(247,245,239,0.92)",
                    borderBottom: "1px solid rgba(10,10,10,0.10)",
                }}
                data-testid="profile-header-blocked"
            >
                <div className="flex items-center gap-3 px-4 lg:px-7 py-3 lg:py-4">
                    <button
                        onClick={() => navigate(-1)}
                        aria-label="voltar"
                        className="lg:hidden -ml-1 w-9 h-9 grid place-items-center transition"
                        style={{ background: "#fff", color: PT.ink, border: "1px solid rgba(10,10,10,0.10)", borderRadius: 999 }}
                    >
                        <ArrowLeft size={18} strokeWidth={2.2} />
                    </button>
                    <div className="flex-1 min-w-0">
                        <h1 className="font-black tracking-[-0.025em] leading-tight" style={{ fontSize: "clamp(20px, 2.4vw, 26px)", color: PT.ink }}>
                            Conta com muro
                        </h1>
                        <p className="text-[10.5px] truncate mt-0.5 font-mono font-bold uppercase" style={{ color: "rgba(10,10,10,0.5)", letterSpacing: "0.18em" }}>
                            Muro levantado · não vês nada desta pessoa
                        </p>
                    </div>
                </div>
            </div>

            {/* Banner placeholder — listrado neutro Lusorae editorial */}
            <div
                className="relative h-36 lg:h-52 overflow-hidden"
                style={{
                    background:
                        "repeating-linear-gradient(45deg, rgba(10,10,10,0.06) 0 14px, rgba(10,10,10,0.015) 14px 28px), #F4F4F4",
                    borderBottom: "1px solid rgba(10,10,10,0.10)",
                }}
                aria-hidden
            >
                <div className="pt-tape h-2 w-full absolute top-0 left-0 z-10" />
                <div className="absolute inset-0 grid place-items-center">
                    <div
                        className="w-16 h-16 grid place-items-center"
                        style={{
                            background: PT.red, color: "#fff",
                            border: "1px solid rgba(200,16,46,0.18)",
                            boxShadow: "0 1px 2px rgba(10,10,10,0.05), 0 12px 28px -12px rgba(200,16,46,0.55)",
                            borderRadius: 999,
                        }}
                    >
                        <Lock size={26} strokeWidth={2.0} />
                    </div>
                </div>
            </div>

            {/* Identity stub · FANZINE — APENAS iniciais + nome + @username */}
            <div className="px-4 lg:px-6 -mt-12 lg:-mt-14 relative">
                <div
                    className="w-[92px] h-[92px] grid place-items-center select-none font-black"
                    style={{
                        background: PT.cream,
                        color: "rgba(10,10,10,0.45)",
                        border: "1px solid rgba(10,10,10,0.10)",
                        boxShadow: "0 1px 2px rgba(10,10,10,0.05), 0 8px 20px -10px rgba(10,10,10,0.15)",
                        borderRadius: 999,
                        fontSize: 26,
                        letterSpacing: "-0.02em",
                    }}
                    aria-label="Avatar oculto"
                    data-testid="blocked-avatar-placeholder"
                >
                    {initials}
                </div>

                <div className="mt-5">
                    <p
                        className="font-mono font-black uppercase mb-2"
                        style={{ fontSize: 10.5, letterSpacing: "0.16em", color: PT.red }}
                    >
                        PERFIL · COM · MURO
                    </p>
                    <h1
                        className="font-black tracking-tight leading-tight"
                        style={{ fontSize: "clamp(24px, 4vw, 32px)", color: PT.ink }}
                        data-testid="blocked-name"
                    >
                        {profile.name || profile.username}
                    </h1>
                    <p
                        className="font-mono font-black mt-2"
                        style={{ fontSize: 13, color: "rgba(10,10,10,0.55)" }}
                        data-testid="blocked-username"
                    >
                        @{profile.username}
                    </p>
                </div>

                {/* Wall info + unblock CTA · FANZINE */}
                <div
                    className="mt-6 max-w-xl p-5"
                    style={{
                        background: "#fff",
                        border: `1.5px solid ${PT.red}`,
                        boxShadow: "0 1px 2px rgba(10,10,10,0.05), 0 8px 20px -10px rgba(10,10,10,0.15)",
                        borderRadius: 14,
                    }}
                    data-testid="blocked-wall-card"
                >
                    <div className="flex items-start gap-3">
                        <div
                            className="w-12 h-12 grid place-items-center shrink-0"
                            style={{
                                background: PT.red, color: "#fff",
                                border: "1px solid rgba(10,10,10,0.10)",
                                borderRadius: 8,
                            }}
                        >
                            <Lock size={17} strokeWidth={2.2} />
                        </div>
                        <div className="min-w-0">
                            <div className="font-black tracking-tight" style={{ fontSize: 15, color: PT.red }}>
                                Muro levantado
                            </div>
                            <p className="text-[12.5px] leading-relaxed mt-1.5 font-medium" style={{ color: "rgba(10,10,10,0.7)" }}>
                                Não vês nada desta conta: nem foto, nem capa, nem bio, nem
                                publicações, nem stories, nem comunidades, nem mensagens.
                                Esta pessoa também não te vê a ti.
                            </p>
                        </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2 sm:pl-[60px]">
                        <button
                            onClick={unblock}
                            disabled={busy}
                            data-testid="blocked-unblock-btn"
                            className="inline-flex items-center gap-1.5 px-4 py-2.5 font-black uppercase tap-shrink disabled:opacity-50"
                            style={{
                                background: PT.red, color: "#fff",
                                border: "1px solid rgba(10,10,10,0.10)",
                                boxShadow: "0 1px 2px rgba(10,10,10,0.05), 0 8px 20px -10px rgba(10,10,10,0.15)",
                                borderRadius: 999,
                                fontSize: 12, letterSpacing: "0.04em",
                            }}
                        >
                            {busy ? "A reabrir…" : "Voltar a abrir"}
                        </button>
                        <button
                            onClick={() => navigate(-1)}
                            data-testid="blocked-back-btn"
                            className="inline-flex items-center gap-1.5 px-4 py-2.5 font-black uppercase tap-shrink"
                            style={{
                                background: "#fff", color: PT.ink,
                                border: "1px solid rgba(10,10,10,0.10)",
                                boxShadow: "0 1px 2px rgba(10,10,10,0.05), 0 8px 20px -10px rgba(10,10,10,0.15)",
                                borderRadius: 999,
                                fontSize: 12, letterSpacing: "0.04em",
                            }}
                        >
                            Voltar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
