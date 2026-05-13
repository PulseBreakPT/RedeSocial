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
import { PageHeader } from "../components/PageHeader";
import { useLiveTime } from "../hooks/useLiveTime";
import { toast } from "sonner";

const TABS = [
    { key: "posts", label: "Publicações" },
    { key: "media", label: "Mídia" },
    { key: "likes", label: "Gostos" },
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

            {/* Banner — silver gradient, with optional uploaded banner */}
            <div className="relative h-36 lg:h-52 overflow-hidden">
                <div className="absolute inset-0 silver-grad" />
                <div
                    className="absolute inset-0 opacity-60 mix-blend-multiply"
                    style={{
                        background:
                            "radial-gradient(circle at 20% 30%, rgba(106,168,230,0.18), transparent 55%), radial-gradient(circle at 85% 70%, rgba(232,93,108,0.10), transparent 55%)",
                    }}
                />
                {profile.banner && <img src={profile.banner} alt="" className="relative w-full h-full object-cover" />}
            </div>

            <div className="px-4 lg:px-6 -mt-12 lg:-mt-14 relative">
                <div className="flex items-end justify-between gap-3">
                    <div className="rounded-full p-1 bg-white shadow-[0_8px_24px_-12px_rgba(13,13,16,0.25)]">
                        <Avatar user={profile} size={88} showOnline />
                    </div>
                    <div className="flex gap-2 pb-1">
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
                                    className="w-10 h-10 grid place-items-center rounded-full border border-black/[0.10] hover:bg-black/[0.04] transition active:scale-95"
                                    aria-label="enviar mensagem"
                                >
                                    <MessageCircle size={16} strokeWidth={1.6} />
                                </button>
                                {profile.is_following ? (
                                    <button
                                        onClick={toggleFollow}
                                        data-testid="follow-profile-btn"
                                        className="btn-silver px-5 py-2 text-[12px] hover:bg-red-soft-bg"
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

                <div className="mt-4 lg:mt-5">
                    <h2 className="font-display text-[28px] lg:text-[32px] tracking-tight leading-none text-black flex items-center gap-2">
                        {profile.name}
                        {profile.verified && <VerifiedBadge size={18} />}
                        {profile.private && <Lock size={14} className="text-black/40" />}
                    </h2>
                    <p className="font-mono text-[12px] text-black/45 mt-1.5">@{profile.username}</p>

                    <div className="flex flex-wrap items-center gap-2 mt-4">
                        <div
                            className="inline-flex items-center gap-1.5 bg-black/[0.04] border border-black/[0.08] rounded-full px-3 py-1"
                            data-testid="reputation-badge"
                        >
                            <Award size={11} strokeWidth={1.6} className="text-black/70" />
                            <span className="font-mono text-[10px] uppercase tracking-[0.14em]">
                                <span className="text-black font-medium">Nível {profile.level}</span>
                                <span className="text-black/45 ml-1.5">· {profile.reputation} rep</span>
                            </span>
                        </div>
                        {profile.online && (
                            <div
                                className="inline-flex items-center gap-1.5 bg-green-soft-bg border border-green-soft/30 rounded-full px-3 py-1"
                                data-testid="online-badge"
                            >
                                <span className="w-1.5 h-1.5 bg-green-soft rounded-full pulse-dot" />
                                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-green-soft">online</span>
                            </div>
                        )}
                        {stats?.streak > 0 && (
                            <div
                                className="inline-flex items-center gap-1.5 bg-red-soft-bg border border-red-soft/30 rounded-full px-3 py-1"
                                data-testid="streak-badge"
                            >
                                <span className="font-mono text-[10px] text-red-soft uppercase tracking-[0.14em]">🔥 {stats.streak}d</span>
                            </div>
                        )}
                    </div>

                    {profile.bio && (
                        <p className="mt-4 text-black/80 leading-relaxed text-[15px] max-w-2xl">{profile.bio}</p>
                    )}
                    <div className="flex items-center gap-2 mt-4 text-black/45 font-mono text-[11px]">
                        <CalendarDays size={13} strokeWidth={1.6} />
                        <span>Membro desde {joined}</span>
                        {stats?.joined_days !== undefined && (
                            <>
                                <span className="text-black/20">·</span>
                                <span>{stats.joined_days}d na rede</span>
                            </>
                        )}
                    </div>

                    {mutual && mutual.count > 0 && (
                        <div className="flex items-center gap-2.5 mt-4 text-[11px] font-mono text-black/55" data-testid="mutual-followers">
                            <div className="flex -space-x-2">
                                {mutual.users.map((u) => (
                                    <Avatar key={u.id} user={u} size={20} className="border-2 border-white" />
                                ))}
                            </div>
                            <Users size={11} strokeWidth={1.6} />
                            <span>
                                Seguido por <span className="text-black font-medium">{mutual.count}</span> {mutual.count > 1 ? "pessoas que segues" : "pessoa que segues"}
                            </span>
                        </div>
                    )}

                    <div className="flex gap-6 mt-5">
                        <button onClick={() => setModal("following")} data-testid="following-count" className="hover:underline tap-press">
                            <span className="font-heading font-bold text-black text-[17px]">{profile.following_count}</span>
                            <span className="ml-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-black/45">a seguir</span>
                        </button>
                        <button onClick={() => setModal("followers")} data-testid="followers-count" className="hover:underline tap-press">
                            <span className="font-heading font-bold text-black text-[17px]">{profile.followers_count}</span>
                            <span className="ml-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-black/45">seguidores</span>
                        </button>
                    </div>
                </div>
            </div>

            {profile.can_view === false ? (
                <div className="mt-12 p-12 text-center hairline-t">
                    <div className="ring-silver w-20 h-20 rounded-full grid place-items-center mx-auto mb-6">
                        <Lock size={26} strokeWidth={1.4} className="text-black/70" />
                    </div>
                    <p className="type-overline mb-2">Perfil privado</p>
                    <h3 className="font-display text-[26px] tracking-tight">Perfil privado</h3>
                    <p className="font-mono text-[11px] text-black/45 mt-2">Segue para ver as publicações</p>
                </div>
            ) : (
                <>
                    <StatsCard stats={stats} completion={profile.is_self ? stats?.profile_completion : undefined} />

                    {heatmap?.length > 0 && (
                        <div className="px-5 py-5 hairline-b">
                            <ActivityHeatmap data={heatmap} />
                        </div>
                    )}

                    <div className="mt-2 grid grid-cols-3 hairline-t hairline-b">
                        {TABS.map((t) => (
                            <button
                                key={t.key}
                                onClick={() => setTab(t.key)}
                                data-testid={`profile-tab-${t.key}`}
                                className={`py-3.5 font-heading text-[13px] tracking-tight transition relative ${
                                    tab === t.key ? "text-black font-medium" : "text-black/45 hover:text-black/70"
                                }`}
                            >
                                {t.label}
                                {tab === t.key && (
                                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-[2px] bg-black rounded-full" />
                                )}
                            </button>
                        ))}
                    </div>

                    {postsLoading ? (
                        <PostSkeletonList count={3} />
                    ) : posts.length === 0 ? (
                        <div className="p-14 text-center">
                            <p className="type-overline mb-2">sem registos</p>
                            <p className="text-black/55 font-mono text-sm">Nada por aqui ainda.</p>
                        </div>
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
