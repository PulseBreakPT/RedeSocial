import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CalendarDays, MessageCircle } from "lucide-react";
import { api, formatApiError } from "../lib/api";
import { Avatar } from "../components/Avatar";
import { VerifiedBadge } from "../components/VerifiedBadge";
import { PostCard } from "../components/PostCard";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";

const TABS = [
    { key: "posts", label: "Publicações" },
    { key: "media", label: "Mídia" },
    { key: "likes", label: "Curtidas" },
];

export default function Profile() {
    const { username } = useParams();
    const navigate = useNavigate();
    const { user: me } = useAuth();
    const [profile, setProfile] = useState(null);
    const [posts, setPosts] = useState([]);
    const [tab, setTab] = useState("posts");
    const [loading, setLoading] = useState(true);

    const loadProfile = async () => {
        setLoading(true);
        try {
            const { data } = await api.get(`/users/${username}`);
            setProfile(data);
        } catch (e) {
            toast.error(formatApiError(e));
        } finally {
            setLoading(false);
        }
    };

    const loadPosts = async (which = tab) => {
        try {
            const { data } = await api.get(`/users/${username}/posts?tab=${which}`);
            setPosts(data);
        } catch {}
    };

    useEffect(() => {
        loadProfile();
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

    if (loading || !profile) {
        return (
            <div className="p-10 text-center text-zinc-500 font-mono text-sm" data-testid="profile-loading">carregando perfil...</div>
        );
    }

    const joined = profile.created_at
        ? new Date(profile.created_at).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
        : "";

    return (
        <div data-testid="profile-page">
            <div className="sticky top-0 z-30 glass border-b border-zinc-900 px-5 py-4">
                <h1 className="font-heading text-xl font-bold tracking-tight flex items-center gap-1.5">
                    {profile.name} {profile.verified && <VerifiedBadge size={16} />}
                </h1>
                <p className="font-mono text-xs text-zinc-500 mt-0.5">@{profile.username}</p>
            </div>

            <div className="relative h-48 bg-gradient-to-br from-zinc-900 via-zinc-800 to-[#FF5722]/30">
                {profile.banner && <img src={profile.banner} alt="" className="w-full h-full object-cover" />}
            </div>

            <div className="px-5 -mt-12 relative">
                <div className="flex items-end justify-between">
                    <div className="border-4 border-[#0A0A0A] rounded-full">
                        <Avatar user={profile} size={96} />
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
                    </h2>
                    <p className="font-mono text-sm text-zinc-500">@{profile.username}</p>
                    {profile.bio && <p className="mt-3 text-zinc-200">{profile.bio}</p>}
                    <div className="flex items-center gap-2 mt-3 text-zinc-500 font-mono text-xs">
                        <CalendarDays size={14} />
                        <span>Entrou em {joined}</span>
                    </div>
                    <div className="flex gap-5 mt-4">
                        <div data-testid="following-count">
                            <span className="font-heading font-bold text-white">{profile.following_count}</span>
                            <span className="ml-1.5 font-mono text-sm text-zinc-500">seguindo</span>
                        </div>
                        <div data-testid="followers-count">
                            <span className="font-heading font-bold text-white">{profile.followers_count}</span>
                            <span className="ml-1.5 font-mono text-sm text-zinc-500">seguidores</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="mt-6 grid grid-cols-3 border-t border-b border-zinc-900">
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

            {posts.length === 0 ? (
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
        </div>
    );
}
