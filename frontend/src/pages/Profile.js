import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CalendarDays, MessageCircle, Award, Lock, Users } from "lucide-react";
import { api, formatApiError } from "../lib/api";
import { Avatar } from "../components/Avatar";
import { VerifiedBadge } from "../components/VerifiedBadge";
import { FollowsModal } from "../components/FollowsModal";
import { PostCard } from "../components/PostCard";
import { StatsCard } from "../components/StatsCard";
import { ActivityHeatmap } from "../components/ActivityHeatmap";
import { ProfileSkeleton, PostSkeletonList } from "../components/Skeleton";
import { useLiveTime } from "../hooks/useLiveTime";
import { toast } from "sonner";

const TABS = [
    { key: "posts", label: "Publicações" },
    { key: "media", label: "Mídia" },
    { key: "likes", label: "Curtidas" },
];

export default function Profile() {
    const { username } = useParams();
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [posts, setPosts] = useState([]);
    const [stats, setStats] = useState(null);
    const [heatmap, setHeatmap] = useState([]);
    const [mutual, setMutual] = useState(null);
    const [tab, setTab] = useState("posts");
    const [loading, setLoading] = useState(true);
    const [postsLoading, setPostsLoading] = useState(false);
    const [modal, setModal] = useState(null);
    useLiveTime(30000);

    const loadAll = async () => {
        setLoading(true);
        try {
            const [p, s, h] = await Promise.all([
                api.get(`/users/${username}`),
                api.get(`/users/${username}/stats`).catch(() => ({ data: null })),
                api.get(`/users/${username}/heatmap`).catch(() => ({ data: [] })),
            ]);
            setProfile(p.data);
            setStats(s.data);
            setHeatmap(h.data);
            if (!p.data.is_self) {
                api.get(`/users/${username}/mutual`).then((r) => setMutual(r.data)).catch(() => {});
            }
        } catch (e) {
            toast.error(formatApiError(e));
        } finally {
            setLoading(false);
        }
    };

    const loadPosts = async (which = tab) => {
        setPostsLoading(true);
        try {
            const { data } = await api.get(`/users/${username}/posts?tab=${which}`);
            setPosts(data);
        } catch {} finally {
            setPostsLoading(false);
        }
    };

    useEffect(() => {
        loadAll();
        loadPosts("posts");
        setTab("posts");
        // eslint-disable-next-line
    }, [username]);

    useEffect(() => {
        if (profile) loadPosts(tab);
        // eslint-disable-next-line
    }, [tab]);

    const toggleFollow = async () => {
        const prev = profile.is_following;
        setProfile({
            ...profile,
            is_following: !prev,
            followers_count: profile.followers_count + (prev ? -1 : 1),
        });
        try {
            await api.post(`/users/${username}/follow`);
        } catch (e) {
            setProfile({ ...profile, is_following: prev });
            toast.error(formatApiError(e));
        }
    };

    if (loading || !profile) return <ProfileSkeleton />;

    const joined = profile.created_at
        ? new Date(profile.created_at).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
        : "";

    return (
        <div data-testid="profile-page">
            <div className="sticky top-0 z-30 glass border-b border-zinc-900 px-5 py-4">
                <h1 className="font-heading text-xl font-bold tracking-tight flex items-center gap-1.5">
                    {profile.name} {profile.verified && <VerifiedBadge size={16} />}
                </h1>
                <p className="font-mono text-xs text-zinc-500 mt-0.5">{stats?.posts_count ?? 0} publicações</p>
            </div>

            <div className="relative h-48 bg-gradient-to-br from-zinc-900 via-zinc-800 to-[#FF5722]/30">
                {profile.banner && <img src={profile.banner} alt="" className="w-full h-full object-cover" />}
            </div>

            <div className="px-5 -mt-12 relative">
                <div className="flex items-end justify-between">
                    <div className="border-4 border-[#0A0A0A] rounded-full">
                        <Avatar user={profile} size={96} showOnline />
                    </div>
                    <div className="flex gap-2">
                        {profile.is_self ? (
                            <button
                                onClick={() => navigate("/settings")}
                                data-testid="edit-profile-btn"
                                className="px-5 py-2 border border-zinc-700 hover:bg-zinc-900 rounded-full font-heading font-semibold text-sm uppercase tracking-wide transition active:scale-95"
                            >
                                Editar perfil
                            </button>
                        ) : (
                            <>
                                <button
                                    onClick={() => navigate(`/messages/${profile.id}`)}
                                    data-testid="message-profile-btn"
                                    className="p-2.5 border border-zinc-700 hover:bg-zinc-900 rounded-full transition active:scale-95"
                                >
                                    <MessageCircle size={16} />
                                </button>
                                <button
                                    onClick={toggleFollow}
                                    data-testid="follow-profile-btn"
                                    className={`px-5 py-2 rounded-full font-heading font-semibold text-sm uppercase tracking-wide transition active:scale-95 ${
                                        profile.is_following
                                            ? "border border-zinc-700 hover:bg-accent-vermillion/10 hover:border-accent-vermillion hover:text-accent-vermillion"
                                            : "bg-white text-black hover:bg-zinc-200 glow-vermillion"
                                    }`}
                                >
                                    {profile.is_following ? "Seguindo" : "Seguir"}
                                </button>
                            </>
                        )}
                    </div>
                </div>

                <div className="mt-4">
                    <h2 className="font-heading text-2xl font-bold flex items-center gap-2">
                        {profile.name}
                        {profile.verified && <VerifiedBadge size={20} />}
                        {profile.private && <Lock size={14} className="text-zinc-500" />}
                    </h2>
                    <p className="font-mono text-sm text-zinc-500">@{profile.username}</p>

                    <div className="flex flex-wrap items-center gap-2 mt-3">
                        <div className="inline-flex items-center gap-1.5 bg-accent-vermillion/10 border border-accent-vermillion/30 rounded-full px-3 py-1" data-testid="reputation-badge">
                            <Award size={12} className="text-accent-vermillion" />
                            <span className="font-mono text-xs">
                                <span className="text-accent-vermillion font-semibold">Nível {profile.level}</span>
                                <span className="text-zinc-500 ml-1">· {profile.reputation} rep</span>
                            </span>
                        </div>
                        {profile.online && (
                            <div className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-3 py-1" data-testid="online-badge">
                                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                                <span className="font-mono text-xs text-emerald-400">online</span>
                            </div>
                        )}
                        {stats?.streak > 0 && (
                            <div className="inline-flex items-center gap-1.5 bg-orange-500/10 border border-orange-500/30 rounded-full px-3 py-1" data-testid="streak-badge">
                                <span className="font-mono text-xs text-orange-400">🔥 {stats.streak}d</span>
                            </div>
                        )}
                    </div>

                    {profile.bio && <p className="mt-3 text-zinc-200">{profile.bio}</p>}
                    <div className="flex items-center gap-2 mt-3 text-zinc-500 font-mono text-xs">
                        <CalendarDays size={14} />
                        <span>Entrou em {joined}</span>
                        {stats?.joined_days !== undefined && (
                            <>
                                <span className="text-zinc-700">·</span>
                                <span>{stats.joined_days}d na rede</span>
                            </>
                        )}
                    </div>

                    {mutual && mutual.count > 0 && (
                        <div className="flex items-center gap-2 mt-3 text-xs font-mono text-zinc-400" data-testid="mutual-followers">
                            <div className="flex -space-x-2">
                                {mutual.users.map((u) => (
                                    <Avatar key={u.id} user={u} size={20} className="border-2 border-[#0A0A0A]" />
                                ))}
                            </div>
                            <Users size={12} />
                            <span>
                                Seguido por <span className="text-white">{mutual.count}</span> pessoa{mutual.count > 1 ? "s" : ""} que você segue
                            </span>
                        </div>
                    )}

                    <div className="flex gap-5 mt-4">
                        <button onClick={() => setModal("following")} data-testid="following-count" className="hover:underline">
                            <span className="font-heading font-bold text-white">{profile.following_count}</span>
                            <span className="ml-1.5 font-mono text-sm text-zinc-500">a seguir</span>
                        </button>
                        <button onClick={() => setModal("followers")} data-testid="followers-count" className="hover:underline">
                            <span className="font-heading font-bold text-white">{profile.followers_count}</span>
                            <span className="ml-1.5 font-mono text-sm text-zinc-500">seguidores</span>
                        </button>
                    </div>
                </div>
            </div>

            {profile.can_view === false ? (
                <div className="mt-10 p-10 text-center border-t border-zinc-900">
                    <Lock size={36} className="mx-auto text-zinc-700" />
                    <h3 className="mt-4 font-heading text-lg font-bold">Perfil privado</h3>
                    <p className="font-mono text-xs text-zinc-500 mt-1">Siga para ver as publicações</p>
                </div>
            ) : (
                <>
                    <StatsCard stats={stats} completion={profile.is_self ? stats?.profile_completion : undefined} />

                    {heatmap?.length > 0 && (
                        <div className="px-5 py-4 border-b border-zinc-900">
                            <ActivityHeatmap data={heatmap} />
                        </div>
                    )}

                    <div className="mt-2 grid grid-cols-3 border-t border-b border-zinc-900">
                        {TABS.map((t) => (
                            <button
                                key={t.key}
                                onClick={() => setTab(t.key)}
                                data-testid={`profile-tab-${t.key}`}
                                className={`py-3 font-heading font-semibold text-sm transition relative ${
                                    tab === t.key ? "text-white" : "text-zinc-500 hover:bg-white/[0.02]"
                                }`}
                            >
                                {t.label}
                                {tab === t.key && (
                                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-1 bg-accent-vermillion rounded-full" />
                                )}
                            </button>
                        ))}
                    </div>

                    {postsLoading ? (
                        <PostSkeletonList count={3} />
                    ) : posts.length === 0 ? (
                        <div className="p-10 text-center text-zinc-500 font-mono text-sm">Nada por aqui ainda.</div>
                    ) : (
                        posts.map((p) => (
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

            {modal && <FollowsModal username={username} type={modal} onClose={() => setModal(null)} />}
        </div>
    );
}
