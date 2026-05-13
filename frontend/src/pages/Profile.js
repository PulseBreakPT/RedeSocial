import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
    CalendarDays, MessageCircle, Award, Lock, Users, Share2, MapPin,
    Trophy, Hash, Heart, Coffee, Clock, Music, BookOpen, Quote,
    Sparkle, Smile, Sun, Moon, ScrollText,
} from "lucide-react";
import { api, toastApiError } from "../lib/api";
import { Avatar } from "../components/Avatar";
import { VerifiedBadge } from "../components/VerifiedBadge";
import { FollowsModal } from "../components/FollowsModal";
import { PostCard } from "../components/PostCard";
import { StatsCard } from "../components/StatsCard";
import { ActivityHeatmap } from "../components/ActivityHeatmap";
import { ProfileSkeleton, PostSkeletonList } from "../components/Skeleton";
import { PageHeader } from "../components/PageHeader";
import { useLiveTime } from "../hooks/useLiveTime";
import { useAuth } from "../context/AuthContext";
import { PT_REGIONS, PT_MOODS, PT_TEAMS } from "../lib/ptCulture";
import { toast } from "sonner";

const TABS = [
    { key: "posts",       label: "Publicações" },
    { key: "media",       label: "Mídia" },
    { key: "likes",       label: "Gostos" },
    { key: "communities", label: "Comunidades" },
    { key: "badges",      label: "Conquistas" },
    { key: "mapa",        label: "Mapa PT" },
];

const BIO_SLOT_META = [
    { key: "mood_today",      Icon: Smile,    label: "Mood do dia" },
    { key: "soundtrack",      Icon: Music,    label: "Banda sonora" },
    { key: "reading",         Icon: BookOpen, label: "A ler" },
    { key: "favourite_place", Icon: MapPin,   label: "Lugar favorito" },
    { key: "quote_of_month",  Icon: Quote,    label: "Frase do mês" },
    { key: "city_extra",      Icon: MapPin,   label: "Bairro/Freguesia" },
];

// Region → gradient palette for the banner (place-graph visual identity)
const REGION_PALETTE = {
    norte:     ["#3a6a4a", "#7da38a"],
    centro:    ["#5a7d3e", "#a8c47e"],
    lisboa:    ["#2c6fd1", "#6a91cc"],
    alentejo:  ["#b18f3e", "#e0c97f"],
    algarve:   ["#1e88a4", "#7cc4d2"],
    madeira:   ["#a04f7c", "#dca0c0"],
    acores:    ["#2a4a5e", "#7392a8"],
    emigrante: ["#3a3f6b", "#aab2d6"],
};

function regionGradient(region) {
    const [a, b] = REGION_PALETTE[region] || ["#0a0a0a", "#2a2a30"];
    return `linear-gradient(135deg, ${a} 0%, ${b} 100%)`;
}

const HOUR_LABEL = (h) => {
    if (h == null) return null;
    if (h < 6)  return "madrugador";
    if (h < 12) return "manhã";
    if (h < 14) return "almoço";
    if (h < 19) return "tarde";
    if (h < 23) return "noite";
    return "noite alta";
};

const HOUR_ICON = (h) => {
    if (h == null) return Clock;
    if (h < 8 || h >= 22) return Moon;
    return Sun;
};

export default function Profile() {
    const { username } = useParams();
    const navigate = useNavigate();
    const { user: viewer } = useAuth();
    const [profile, setProfile] = useState(null);
    const [posts, setPosts] = useState([]);
    const [stats, setStats] = useState(null);
    const [heatmap, setHeatmap] = useState([]);
    const [mutual, setMutual] = useState(null);
    const [badges, setBadges] = useState(null);
    const [regions, setRegions] = useState(null);
    const [fingerprint, setFingerprint] = useState(null);
    const [communities, setCommunities] = useState(null);
    const [tab, setTab] = useState("posts");
    const [loading, setLoading] = useState(true);
    const [postsLoading, setPostsLoading] = useState(false);
    const [modal, setModal] = useState(null);
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
    const loadBadges      = async () => { try { const { data } = await api.get(`/users/${username}/badges`); setBadges(data); } catch { /* */ } };
    const loadRegions     = async () => { try { const { data } = await api.get(`/users/${username}/regions`); setRegions(data); } catch { /* */ } };
    const loadCommunities = async () => { try { const { data } = await api.get(`/users/${username}/communities`); setCommunities(data); } catch { /* */ } };

    useEffect(() => {
        loadAll();
        loadPosts("posts");
        setTab("posts");
        // Reset all subview caches when switching profile
        setBadges(null); setRegions(null); setCommunities(null);
        // eslint-disable-next-line
    }, [username]);

    useEffect(() => {
        if (!profile) return;
        if (["posts", "media", "likes"].includes(tab)) loadPosts(tab);
        else if (tab === "badges"      && !badges)      loadBadges();
        else if (tab === "mapa"        && !regions)     loadRegions();
        else if (tab === "communities" && !communities) loadCommunities();
        // eslint-disable-next-line
    }, [tab]);

    const toggleFollow = async () => {
        if (!viewer) { navigate("/login"); return; }
        const prev = profile.is_following;
        setProfile({ ...profile, is_following: !prev, followers_count: profile.followers_count + (prev ? -1 : 1) });
        try { await api.post(`/users/${username}/follow`); }
        catch (e) { setProfile({ ...profile, is_following: prev }); toastApiError(e); }
    };
    const share = async () => {
        try { await navigator.clipboard.writeText(`${window.location.origin}/u/${username}`); toast.success("Link do perfil copiado"); }
        catch { toast.error("Não consegui copiar"); }
    };

    if (loading || !profile) return <ProfileSkeleton />;

    const regionMeta = PT_REGIONS.find((r) => r.key === profile.region);
    const moodMeta = PT_MOODS.find((m) => m.key === profile.mood_initial);
    const teamMeta = PT_TEAMS.find((t) => t.key === profile.team);
    const joined = profile.created_at
        ? new Date(profile.created_at).toLocaleDateString("pt-PT", { month: "long", year: "numeric" })
        : "";
    const filledSlots = BIO_SLOT_META.filter((s) => (profile.bio_slots?.[s.key] || "").trim()).slice(0, 6);

    return (
        <div data-testid="profile-page" className="pb-12">
            <PageHeader
                title={
                    <span className="inline-flex items-center gap-1.5">
                        {profile.name} {profile.verified && <VerifiedBadge size={16} />}
                    </span>
                }
                subtitle={`${stats?.posts_count ?? 0} publicações`}
                back
                testid="profile-header"
            />

            {/* ---------- HERO ---------- */}
            <div
                className="relative h-44 lg:h-60 overflow-hidden"
                data-testid="profile-banner"
                style={{ background: regionGradient(profile.region) }}
            >
                {/* Atmosphere: dot grid + noise */}
                <div className="absolute inset-0 opacity-30 mix-blend-screen pointer-events-none"
                    style={{
                        background:
                            "radial-gradient(circle at 25% 25%, rgba(255,255,255,0.18), transparent 55%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.10), transparent 55%)",
                    }} />
                <div className="absolute inset-0 grain pointer-events-none" />
                {profile.banner && (
                    <img src={profile.banner} alt="" className="relative w-full h-full object-cover" />
                )}
                {/* Region nameplate (no banner image): bottom-right editorial caption */}
                {!profile.banner && regionMeta && (
                    <div className="absolute right-4 bottom-3 text-right text-white/80 font-mono text-[10.5px] uppercase tracking-[0.18em]">
                        <span className="mr-1.5" aria-hidden>{regionMeta.emoji}</span>
                        {regionMeta.label}
                    </div>
                )}
            </div>

            <div className="px-4 lg:px-6 -mt-12 lg:-mt-14 relative">
                <div className="flex items-end justify-between gap-3">
                    <div className="rounded-full p-1 bg-white shadow-[0_8px_24px_-12px_rgba(13,13,16,0.30)]">
                        <Avatar user={profile} size={88} showOnline />
                    </div>
                    <div className="flex gap-2 pb-1">
                        <button
                            onClick={share}
                            title="Partilhar perfil"
                            data-testid="profile-share-btn"
                            className="w-10 h-10 grid place-items-center rounded-full border border-black/[0.10] hover:bg-black/[0.04] transition tap-shrink"
                        >
                            <Share2 size={15} />
                        </button>
                        {profile.is_self ? (
                            <button
                                onClick={() => navigate("/settings")}
                                data-testid="edit-profile-btn"
                                className="btn-silver px-5 py-2 text-[12px]"
                            >
                                Editar perfil
                            </button>
                        ) : (
                            <>
                                <button
                                    onClick={() => navigate(`/messages/${profile.id}`)}
                                    data-testid="message-profile-btn"
                                    className="w-10 h-10 grid place-items-center rounded-full border border-black/[0.10] hover:bg-black/[0.04] transition tap-shrink"
                                    title="Mensagem"
                                >
                                    <MessageCircle size={16} />
                                </button>
                                {profile.is_following ? (
                                    <button
                                        onClick={toggleFollow}
                                        data-testid="follow-profile-btn"
                                        className="chip-on px-5 py-2 text-[11px] !text-white font-heading font-medium tracking-tight rounded-full"
                                    >
                                        Seguindo
                                    </button>
                                ) : (
                                    <button
                                        onClick={toggleFollow}
                                        data-testid="follow-profile-btn"
                                        className="btn-obsidian px-5 py-2 text-[12px]"
                                    >
                                        Seguir
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>

                <div className="mt-4 lg:mt-5 max-w-[760px]">
                    <h2 className="font-display text-[28px] lg:text-[34px] tracking-tight leading-none text-black flex items-center gap-2 flex-wrap">
                        {profile.name}
                        {profile.verified && <VerifiedBadge size={18} />}
                        {profile.private && <Lock size={14} className="text-black/40" />}
                    </h2>
                    <p className="font-mono text-[12px] text-black/45 mt-1.5">
                        @{profile.username}
                        {(profile.city || regionMeta) && (
                            <span className="ml-2 text-black/40">
                                · {profile.city || regionMeta?.label}
                                {profile.freguesia && profile.city && (
                                    <span className="text-black/30"> · {profile.freguesia}</span>
                                )}
                            </span>
                        )}
                    </p>

                    {/* Identity row: pills (level, online, streak, region, team, mood) */}
                    <div className="flex flex-wrap items-center gap-2 mt-4">
                        <div
                            className="inline-flex items-center gap-1.5 bg-black/[0.04] border border-black/[0.08] rounded-full px-3 py-1"
                            data-testid="reputation-badge"
                        >
                            <Award size={11} className="text-black/70" />
                            <span className="font-mono text-[10px] uppercase tracking-[0.14em]">
                                <span className="text-black font-medium">Nível {profile.level}</span>
                                <span className="text-black/45 ml-1.5">· {profile.reputation} rep</span>
                            </span>
                        </div>
                        {profile.online && (
                            <div className="inline-flex items-center gap-1.5 bg-green-soft-bg border border-green-soft/30 rounded-full px-3 py-1">
                                <span className="w-1.5 h-1.5 bg-green-soft rounded-full pulse-dot" />
                                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-green-soft">online</span>
                            </div>
                        )}
                        {stats?.streak > 0 && (
                            <div className="inline-flex items-center gap-1.5 bg-red-soft-bg border border-red-soft/30 rounded-full px-3 py-1" data-testid="streak-badge">
                                <span className="font-mono text-[10px] text-red-soft uppercase tracking-[0.14em]">🔥 {stats.streak}d</span>
                            </div>
                        )}
                        {regionMeta && (
                            <Link
                                to={`/tag/${(regionMeta.label || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "")}`}
                                className="inline-flex items-center gap-1.5 bg-white border border-black/[0.10] hover:border-black/30 hover:bg-black/[0.02] rounded-full px-3 py-1 tap-shrink transition"
                                data-testid="region-pill"
                                title={`Explorar ${regionMeta.label}`}
                            >
                                <span aria-hidden>{regionMeta.emoji}</span>
                                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-black/75">{regionMeta.label}</span>
                            </Link>
                        )}
                        {moodMeta && (
                            <Link
                                to={`/explore?mood=${moodMeta.key}`}
                                className="inline-flex items-center gap-1.5 bg-white border border-black/[0.10] hover:border-black/30 hover:bg-black/[0.02] rounded-full px-3 py-1 tap-shrink transition"
                                data-testid="mood-pill"
                                title={`Ver pessoas com mood ${moodMeta.label}`}
                            >
                                <span aria-hidden>{moodMeta.emoji}</span>
                                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-black/75">{moodMeta.label}</span>
                            </Link>
                        )}
                        {teamMeta && teamMeta.key !== "nenhum" && (
                            <Link
                                to={`/tag/${(teamMeta.label || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "")}`}
                                className="inline-flex items-center gap-1.5 bg-white border border-black/[0.10] hover:border-black/30 hover:bg-black/[0.02] rounded-full px-3 py-1 tap-shrink transition"
                                data-testid="team-pill"
                                title={`Explorar ${teamMeta.label}`}
                            >
                                <span aria-hidden>{teamMeta.emoji}</span>
                                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-black/75">{teamMeta.label}</span>
                            </Link>
                        )}
                    </div>

                    {/* Bio */}
                    {profile.bio && (
                        <p className="mt-4 text-black/80 leading-relaxed text-[15px] max-w-[60ch]">
                            {profile.bio}
                        </p>
                    )}

                    {/* Bio slots (semantic chips) */}
                    {filledSlots.length > 0 && (
                        <div className="mt-4 flex flex-wrap gap-1.5" data-testid="profile-bio-slots">
                            {filledSlots.map(({ key, Icon, label }) => (
                                <div
                                    key={key}
                                    data-testid={`bio-slot-${key}`}
                                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-black/[0.08] bg-paper text-[12px]"
                                    title={label}
                                >
                                    <Icon size={11} className="text-black/55" />
                                    <span className="text-black/45 font-mono text-[10.5px]">{label}:</span>
                                    <span className="text-black/85 max-w-[20ch] truncate">{profile.bio_slots[key]}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Member-since + days */}
                    <div className="flex items-center gap-2 mt-4 text-black/45 font-mono text-[11px]">
                        <CalendarDays size={13} />
                        <span>Membro desde {joined}</span>
                        {stats?.joined_days !== undefined && (
                            <>
                                <span className="text-black/20">·</span>
                                <span>{stats.joined_days}d na rede</span>
                            </>
                        )}
                    </div>

                    {/* Mutuals */}
                    {mutual && mutual.count > 0 && (
                        <div
                            className="flex items-center gap-2.5 mt-4 text-[11px] font-mono text-black/55"
                            data-testid="mutual-followers"
                        >
                            <div className="flex -space-x-2">
                                {mutual.users.map((u) => (
                                    <Avatar key={u.id} user={u} size={20} className="border-2 border-white" />
                                ))}
                            </div>
                            <Users size={11} />
                            <span>
                                Seguido por <span className="text-black font-medium">{mutual.count}</span>{" "}
                                {mutual.count > 1 ? "pessoas que segues" : "pessoa que segues"}
                            </span>
                        </div>
                    )}

                    {/* Counts */}
                    <div className="flex gap-6 mt-5">
                        <button
                            onClick={() => setModal("following")}
                            data-testid="following-count"
                            className="hover:underline"
                        >
                            <span className="font-heading font-bold text-black text-[17px] tabular-nums">{profile.following_count}</span>
                            <span className="ml-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-black/45">a seguir</span>
                        </button>
                        <button
                            onClick={() => setModal("followers")}
                            data-testid="followers-count"
                            className="hover:underline"
                        >
                            <span className="font-heading font-bold text-black text-[17px] tabular-nums">{profile.followers_count}</span>
                            <span className="ml-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-black/45">seguidores</span>
                        </button>
                    </div>
                </div>
            </div>

            {profile.can_view === false ? (
                <div className="mt-12 p-12 text-center hairline-t">
                    <div className="ring-silver w-20 h-20 rounded-full grid place-items-center mx-auto mb-6">
                        <Lock size={26} className="text-black/70" />
                    </div>
                    <p className="type-overline mb-2">Perfil privado</p>
                    <h3 className="font-display text-[26px] tracking-tight">Perfil privado</h3>
                    <p className="font-mono text-[11px] text-black/45 mt-2">Segue para ver as publicações</p>
                </div>
            ) : (
                <>
                    {/* ---------- IDENTITY FINGERPRINT STRIP ---------- */}
                    {fingerprint && fingerprint.available && (fingerprint.posts_analyzed > 0) && (
                        <FingerprintStrip fp={fingerprint} firstName={profile.name.split(" ")[0]} />
                    )}

                    <StatsCard stats={stats} completion={profile.is_self ? stats?.profile_completion : undefined} />
                    {heatmap?.length > 0 && (
                        <div className="px-5 py-5 hairline-b">
                            <ActivityHeatmap data={heatmap} />
                        </div>
                    )}

                    {/* ---------- TABS ---------- */}
                    <div className="mt-2 hairline-t hairline-b sticky top-0 z-10 bg-white/90 backdrop-blur">
                        <div className="flex overflow-x-auto no-scrollbar">
                            {TABS.map((t) => (
                                <button
                                    key={t.key}
                                    onClick={() => setTab(t.key)}
                                    data-testid={`profile-tab-${t.key}`}
                                    className={`shrink-0 flex-1 min-w-[110px] py-3 font-heading text-[11px] lg:text-[12px] tracking-tight transition relative ${
                                        tab === t.key
                                            ? "text-black font-medium"
                                            : "text-black/45 hover:text-black/70"
                                    }`}
                                >
                                    {t.label}
                                    {tab === t.key && (
                                        <span
                                            aria-hidden
                                            className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-[2px] rounded-full grad-bar"
                                        />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* ---------- TAB CONTENT ---------- */}
                    {["posts", "media", "likes"].includes(tab) && (
                        postsLoading ? (
                            <PostSkeletonList count={3} />
                        ) : posts.length === 0 ? (
                            <ProfileEmpty tab={tab} isSelf={profile.is_self} />
                        ) : (
                            posts.map((p) => (
                                <PostCard
                                    key={p.id}
                                    post={p}
                                    onChange={(np) => setPosts((prev) => prev.map((x) => (x.id === np.id ? np : x)))}
                                    onDelete={(id) => setPosts((prev) => prev.filter((x) => x.id !== id))}
                                />
                            ))
                        )
                    )}

                    {tab === "communities" && (
                        <CommunitiesTab communities={communities} />
                    )}

                    {tab === "badges" && (
                        <BadgesTab badges={badges} />
                    )}

                    {tab === "mapa" && (
                        <MapaTab regions={regions} />
                    )}
                </>
            )}

            {modal && <FollowsModal username={username} type={modal} onClose={() => setModal(null)} />}
        </div>
    );
}

// ============================================================
// Fingerprint Strip — the SSS-tier identity signature
// ============================================================
function FingerprintStrip({ fp, firstName }) {
    const cards = useMemo(() => {
        const out = [];
        if (fp.top_mood) {
            const m = PT_MOODS.find((x) => x.key === fp.top_mood);
            if (m) out.push({
                key: "mood", eyebrow: "Escreve com",
                headline: m.label, detail: "mood predominante",
                emoji: m.emoji,
            });
        }
        if (fp.top_react_given) {
            out.push({
                key: "react_given", eyebrow: "Reage com",
                headline: capitalize(fp.top_react_given.key),
                detail: `${fp.top_react_given.count} ${fp.top_react_given.count === 1 ? "reação dada" : "reações dadas"}`,
                emoji: fp.top_react_given.emoji,
            });
        }
        if (fp.top_react_received) {
            out.push({
                key: "react_recv", eyebrow: "Recebe mais",
                headline: capitalize(fp.top_react_received.key),
                detail: `${fp.top_react_received.count} ${fp.top_react_received.count === 1 ? "reação" : "reações"}`,
                emoji: fp.top_react_received.emoji,
            });
        }
        if (fp.top_hashtags?.[0]) {
            out.push({
                key: "tag", eyebrow: "Voz mais usada",
                headline: `#${fp.top_hashtags[0].tag}`,
                detail: `${fp.top_hashtags[0].count} ${fp.top_hashtags[0].count === 1 ? "publicação" : "publicações"}`,
                icon: Hash,
            });
        }
        if (fp.top_community) {
            out.push({
                key: "comm", eyebrow: "Tasca preferida",
                headline: fp.top_community.name,
                detail: `${fp.top_community.posts} ${fp.top_community.posts === 1 ? "post" : "posts"} lá`,
                icon: Users,
                href: `/c/${fp.top_community.slug}`,
            });
        }
        if (fp.peak_hour != null) {
            const Icon = HOUR_ICON(fp.peak_hour);
            out.push({
                key: "hour", eyebrow: "Escreve à",
                headline: HOUR_LABEL(fp.peak_hour),
                detail: `pico às ${String(fp.peak_hour).padStart(2, "0")}h00`,
                icon: Icon,
            });
        }
        return out;
    }, [fp]);

    if (cards.length === 0) return null;

    return (
        <section
            className="px-4 lg:px-6 py-5 hairline-b"
            data-testid="profile-fingerprint"
        >
            <div className="flex items-baseline gap-2 mb-3">
                <p className="text-[10.5px] uppercase tracking-[0.14em] text-black/45 font-mono">
                    <Sparkle size={11} className="inline -mt-0.5 mr-1" />
                    Como {firstName} aparece aqui
                </p>
                <span className="text-[10.5px] text-black/35 font-mono ml-auto">
                    Análise de {fp.posts_analyzed} {fp.posts_analyzed === 1 ? "post" : "posts"}
                </span>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5">
                {cards.map((c) => {
                    const Icon = c.icon;
                    const inner = (
                        <article
                            data-testid={`fp-${c.key}`}
                            className="rounded-2xl border border-black/[0.08] p-3.5 bg-white hover:border-black/30 transition relative overflow-hidden h-full"
                        >
                            <div className="flex items-center gap-2 mb-2">
                                {Icon ? (
                                    <div className="w-7 h-7 rounded-lg bg-black/[0.04] grid place-items-center text-black/70 shrink-0">
                                        <Icon size={13} strokeWidth={1.7} />
                                    </div>
                                ) : (
                                    <div className="w-7 h-7 rounded-lg bg-paper grid place-items-center text-[15px] shrink-0">
                                        <span aria-hidden>{c.emoji}</span>
                                    </div>
                                )}
                                <p className="text-[10px] uppercase tracking-[0.14em] text-black/45 font-mono truncate">
                                    {c.eyebrow}
                                </p>
                            </div>
                            <h3 className="font-display text-[16px] lg:text-[18px] font-semibold tracking-tight text-black leading-tight truncate">
                                {c.headline}
                            </h3>
                            <p className="text-[11.5px] text-black/55 mt-0.5 truncate">{c.detail}</p>
                        </article>
                    );
                    return c.href ? (
                        <Link key={c.key} to={c.href} className="block">{inner}</Link>
                    ) : (
                        <div key={c.key}>{inner}</div>
                    );
                })}
            </div>
        </section>
    );
}

function capitalize(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }

// ============================================================
// Tab content components
// ============================================================
function ProfileEmpty({ tab, isSelf }) {
    const msg = tab === "likes"
        ? (isSelf ? "Ainda não gostaste de nada." : "Sem gostos públicos.")
        : tab === "media"
        ? "Sem publicações com imagens."
        : (isSelf ? "Ainda não publicaste nada — partilha o primeiro pensamento." : "Sem publicações por aqui.");
    return (
        <div className="p-14 text-center">
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

function CommunitiesTab({ communities }) {
    if (!communities) return <div className="p-12 text-center type-overline">A carregar…</div>;
    if (communities.length === 0) {
        return (
            <div className="p-12 text-center">
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

function BadgesTab({ badges }) {
    if (!badges) return <div className="p-12 text-center type-overline">A carregar…</div>;
    return (
        <div className="p-4 lg:p-5">
            <div className="flex items-center gap-2 mb-4">
                <Trophy size={16} className="text-amber-500" />
                <p className="type-overline">
                    {badges.earned.length} de {badges.all.length} conquistas
                </p>
                <div className="flex-1 h-1.5 rounded-full bg-black/[0.06] overflow-hidden ml-2">
                    <div
                        className="h-full grad-bar transition-all"
                        style={{ width: `${Math.round((badges.earned.length / badges.all.length) * 100)}%` }}
                    />
                </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                {badges.all.map((b) => (
                    <div
                        key={b.key}
                        data-testid={`badge-${b.key}`}
                        className={`relative card-lux p-3 text-center transition ${b.earned ? "" : "opacity-40 grayscale"}`}
                        title={b.desc}
                    >
                        <div className="text-3xl mb-1">{b.emoji}</div>
                        <div className="font-heading font-bold text-[12px] tracking-tight text-black">{b.label}</div>
                        <div className="text-[10px] font-mono text-black/45 mt-0.5">
                            {b.earned ? "conquistada" : "bloqueada"}
                        </div>
                        <div className="text-[11px] text-black/55 mt-1.5 leading-snug">{b.desc}</div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function MapaTab({ regions }) {
    if (!regions) return <div className="p-12 text-center type-overline">A carregar…</div>;
    if (regions.length === 0) {
        return (
            <div className="p-12 text-center">
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
        <div className="p-4 lg:p-5">
            <p className="type-overline mb-3">Por onde andou — cidades mencionadas</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {regions.map((r) => {
                    const pct = Math.round((r.count / max) * 100);
                    return (
                        <div key={r.city} className="card-lux p-3" data-testid={`region-${r.city}`}>
                            <div className="flex items-center gap-2">
                                <div className="w-9 h-9 rounded-full bg-rose-50 grid place-items-center">
                                    <MapPin size={15} className="text-rose-600" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-[14px]">{r.city}</div>
                                    <div className="text-[11px] font-mono text-black/45">
                                        {r.count} {r.count === 1 ? "post" : "posts"}
                                    </div>
                                </div>
                            </div>
                            <div className="mt-2 h-1.5 bg-black/[0.05] rounded-full overflow-hidden">
                                <div className="h-full grad-bar transition-all" style={{ width: `${pct}%` }} />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
