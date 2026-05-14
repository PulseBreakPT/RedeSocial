import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Lock } from "lucide-react";
import { api, toastApiError } from "../lib/api";
import { FollowsModal } from "../components/FollowsModal";
import { PostCard } from "../components/PostCard";
import { StatsCard } from "../components/StatsCard";
import { ActivityHeatmap } from "../components/ActivityHeatmap";
import { ProfileSkeleton, PostSkeletonList } from "../components/Skeleton";
import { PageHeader } from "../components/PageHeader";
import { CharmsPanel } from "../components/CharmsPanel";
import { CharmsProgressPanel } from "../components/CharmsProgressPanel";
import { SeriesSection } from "../components/SeriesSection";
import { StreakCard } from "../components/StreakCard";
import { MesaPanel } from "../components/MesaPanel";
import { VerifiedBadge } from "../components/VerifiedBadge";
import { useLiveTime } from "../hooks/useLiveTime";
import { useAuth } from "../context/AuthContext";
import { PT_REGIONS, PT_MOODS, PT_TEAMS } from "../lib/ptCulture";
import { toast } from "sonner";

import { IdentityCard } from "./profile/IdentityCard";
import { CompletionPanel } from "./profile/CompletionPanel";
import { AffinityRibbon } from "./profile/AffinityRibbon";
import { RhythmPanel } from "./profile/RhythmPanel";
import { FingerprintGrid } from "./profile/FingerprintGrid";
import { AboutTab } from "./profile/AboutTab";
import { ShareModal } from "./profile/ShareModal";
import { MobileActionBar } from "./profile/MobileActionBar";
import { ProfileTabBar } from "./profile/ProfileTabBar";
import {
    ProfileEmpty, CommunitiesTab, BadgesTab, MapaTab,
    PostsFilterBar, applyPostsFilter, computePostCounts,
} from "./profile/ProfileTabContent";

/* Region → gradient palette for the banner (place-graph visual identity) */
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
const regionGradient = (region) => {
    const [a, b] = REGION_PALETTE[region] || ["#0a0a0a", "#2a2a30"];
    return `linear-gradient(135deg, ${a} 0%, ${b} 100%)`;
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
    const loadBadges      = async () => { try { const { data } = await api.get(`/users/${username}/badges`); setBadges(data); } catch { /* */ } };
    const loadRegions     = async () => { try { const { data } = await api.get(`/users/${username}/regions`); setRegions(data); } catch { /* */ } };
    const loadCommunities = async () => { try { const { data } = await api.get(`/users/${username}/communities`); setCommunities(data); } catch { /* */ } };

    useEffect(() => {
        loadAll();
        loadPosts("posts");
        setTab("posts");
        setPostsFilter("all");
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
    const share = () => setShareOpen(true);
    const onMessage = () => navigate(`/messages/${profile.id}`);
    const onEditProfile = () => navigate("/settings");

    const postCounts = useMemo(() => computePostCounts(posts), [posts]);
    const filteredPosts = useMemo(() => applyPostsFilter(posts, postsFilter), [posts, postsFilter]);

    if (loading || !profile) return <ProfileSkeleton />;

    const regionMeta = PT_REGIONS.find((r) => r.key === profile.region);
    const moodMeta = PT_MOODS.find((m) => m.key === profile.mood_initial);
    const teamMeta = PT_TEAMS.find((t) => t.key === profile.team);
    const firstName = profile.name?.split(" ")[0] || profile.username;

    return (
        <div data-testid="profile-page" className="pb-32 sm:pb-12">
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

            {/* ---------- HERO BANNER ---------- */}
            <div
                className="relative h-44 lg:h-60 overflow-hidden"
                data-testid="profile-banner"
                style={{ background: regionGradient(profile.region) }}
            >
                <div
                    className="absolute inset-0 opacity-30 mix-blend-screen pointer-events-none"
                    style={{
                        background:
                            "radial-gradient(circle at 25% 25%, rgba(255,255,255,0.18), transparent 55%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.10), transparent 55%)",
                    }}
                />
                <div className="absolute inset-0 grain pointer-events-none" />
                {profile.banner && (
                    <img src={profile.banner} alt="" className="relative w-full h-full object-cover" />
                )}
                {!profile.banner && regionMeta && (
                    <div className="absolute right-4 bottom-3 text-right text-white/80 font-mono text-[10.5px] uppercase tracking-[0.18em]">
                        <span className="mr-1.5" aria-hidden>{regionMeta.emoji}</span>
                        {regionMeta.label}
                    </div>
                )}
            </div>

            {/* ---------- IDENTITY CARD ---------- */}
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
                onProfileUpdate={(patch) => setProfile((p) => ({ ...p, ...patch }))}
            />

            {profile.can_view === false ? (
                <div className="mt-12 p-12 text-center hairline-t" data-testid="private-locked">
                    <div className="ring-silver w-20 h-20 rounded-full grid place-items-center mx-auto mb-6">
                        <Lock size={26} className="text-black/70" />
                    </div>
                    <p className="type-overline mb-2">Perfil privado</p>
                    <h3 className="font-display text-[26px] tracking-tight">Perfil privado</h3>
                    <p className="font-mono text-[11px] text-black/45 mt-2">Segue para ver as publicações</p>
                </div>
            ) : (
                <>
                    {/* Self: completion ring + checklist · Other: affinity ribbon */}
                    {profile.is_self ? (
                        <CompletionPanel profile={profile} stats={stats} />
                    ) : (
                        <AffinityRibbon profile={profile} viewer={viewer} mutual={mutual} fingerprint={fingerprint} />
                    )}

                    {/* Identity Fingerprint editorial strip */}
                    {fingerprint && fingerprint.available && (fingerprint.posts_analyzed > 0) && (
                        <FingerprintGrid fp={fingerprint} firstName={firstName} />
                    )}

                    {/* Rhythm: 24h clock + day-of-week heatmap */}
                    <RhythmPanel heatmap={heatmap} fingerprint={fingerprint} firstName={firstName} />

                    {/* Numeric stats */}
                    <StatsCard stats={stats} completion={profile.is_self ? stats?.profile_completion : undefined} />

                    {/* v2 — Streak + Mesa + Charms + Series */}
                    <div className="px-5 py-4 hairline-b space-y-3">
                        <div className="grid sm:grid-cols-2 gap-3">
                            <StreakCard username={profile.username} />
                            {profile.is_self && <MesaPanel />}
                        </div>
                        <div className="grid sm:grid-cols-2 gap-3">
                            <CharmsPanel username={profile.username} editable={profile.is_self} />
                            <SeriesSection username={profile.username} isSelf={profile.is_self} />
                        </div>
                        {profile.is_self && <CharmsProgressPanel username={profile.username} />}
                    </div>

                    {heatmap?.length > 0 && (
                        <div className="px-5 py-5 hairline-b">
                            <ActivityHeatmap data={heatmap} />
                        </div>
                    )}

                    {/* ---------- TABS ---------- */}
                    <ProfileTabBar tab={tab} onChange={setTab} />

                    {/* ---------- TAB CONTENT ---------- */}
                    {["posts", "media", "likes"].includes(tab) && (
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

                    {tab === "about"       && <AboutTab profile={profile} regionMeta={regionMeta} moodMeta={moodMeta} teamMeta={teamMeta} />}
                    {tab === "communities" && <CommunitiesTab communities={communities} />}
                    {tab === "badges"      && <BadgesTab badges={badges} />}
                    {tab === "mapa"        && <MapaTab regions={regions} />}
                </>
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
            />
        </div>
    );
}
