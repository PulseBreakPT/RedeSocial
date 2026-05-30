import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
    Lock, Users, MessageCircle, Share2, MapPin,
    Smile, Music, BookOpen, Quote, CalendarDays, Star, Send, X,
} from "lucide-react";
import { Avatar } from "../../components/Avatar";
import { VerifiedBadge } from "../../components/VerifiedBadge";
import { RodaButton } from "../../components/RodaButton";
import { FollowButton } from "../../components/FollowButton";
import { ProfileMoreMenu } from "./ProfileMoreMenu";
import { SeloPessoalModal } from "../../components/SeloPessoalModal";
import { ExpandableBio } from "../../components/ExpandableBio";
import { FollowsYouBadge } from "../../components/FollowsYouBadge";
import { joinedHumanPT } from "../../lib/timeHumanPT";
import { api, toastApiError } from "../../lib/api";
import { toast } from "sonner";

const BIO_SLOT_META = [
    { key: "mood_today",      Icon: Smile,    label: "Mood do dia" },
    { key: "soundtrack",      Icon: Music,    label: "Banda sonora" },
    { key: "reading",         Icon: BookOpen, label: "A ler" },
    { key: "favourite_place", Icon: MapPin,   label: "Lugar favorito" },
    { key: "quote_of_month",  Icon: Quote,    label: "Frase do mês" },
    { key: "city_extra",      Icon: MapPin,   label: "Bairro/Freguesia" },
];

const slug = (s) =>
    (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "");

export function IdentityCard({
    profile, stats, mutual, regionMeta, moodMeta, teamMeta,
    onFollow, onMessage, onShare, onEditProfile, onOpenFollowers, onOpenFollowing, onOpenMutuals,
    onProfileUpdate,
}) {
    // `onFollow` kept in signature for legacy callers; FollowButton drives state via onProfileUpdate now.
    void onFollow;
    const [fav, setFav] = useState(false);
    const [favLoading, setFavLoading] = useState(false);
    const [quickOpen, setQuickOpen] = useState(false);
    const [quickMsg, setQuickMsg] = useState("");
    const [sending, setSending] = useState(false);
    const [seloOpen, setSeloOpen] = useState(false);
    const joined = profile.created_at
        ? new Date(profile.created_at).toLocaleDateString("pt-PT", { month: "long", year: "numeric" })
        : "";
    const joinedHuman = joinedHumanPT(profile.created_at);
    const filledSlots = BIO_SLOT_META.filter((s) => (profile.bio_slots?.[s.key] || "").trim()).slice(0, 6);

    // Fetch real favourite state from /api2/users/{username}/relation
    useEffect(() => {
        if (profile.is_self || !profile.username) return;
        let alive = true;
        (async () => {
            try {
                const { data } = await api.get(`/users/${profile.username}/relation`);
                if (alive) setFav(!!data.favorited);
            } catch { /* silent */ }
        })();
        return () => { alive = false; };
    }, [profile.is_self, profile.username]);

    const onToggleFav = async () => {
        if (favLoading) return;
        setFavLoading(true);
        const prev = fav;
        setFav(!prev);
        try {
            const { data } = await api.post(`/users/${profile.username}/favorite`);
            const isFav = !!data.favorited;
            setFav(isFav);
            toast.success(isFav ? `@${profile.username} adicionado aos favoritos ★` : `@${profile.username} removido dos favoritos`);
        } catch (e) {
            setFav(prev);
            toastApiError(e);
        } finally {
            setFavLoading(false);
        }
    };
    const sendQuick = async () => {
        if (!quickMsg.trim()) return;
        setSending(true);
        try {
            await api.post("/messages", { to_user_id: profile.id, content: quickMsg.trim() });
            toast.success(`Mensagem enviada para ${profile.name.split(" ")[0]}`);
            setQuickMsg(""); setQuickOpen(false);
        } catch (e) { toastApiError(e); }
        finally { setSending(false); }
    };

    return (
        <div className="px-4 lg:px-6 -mt-12 lg:-mt-14 relative" data-testid="identity-card">
            <div className="flex items-end justify-between gap-3">
                <div
                    className="p-1.5"
                    style={{
                        background: "#fff",
                        border: "3px solid #0A0A0A",
                        boxShadow: "4px 4px 0 #0A0A0A",
                        borderRadius: 999,
                    }}
                >
                    <Avatar user={profile} size={88} showOnline />
                </div>
                <div className="hidden sm:flex gap-2 pb-1">
                    {!profile.is_self && (
                        <button
                            onClick={onToggleFav}
                            data-testid="profile-favourite-btn"
                            title={fav ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                            className="w-10 h-10 grid place-items-center tap-shrink transition-transform hover:-translate-y-0.5"
                            style={{
                                background: fav ? "#FFD93D" : "#fff",
                                color: fav ? "#0A0A0A" : "rgba(10,10,10,0.6)",
                                border: "2.5px solid #0A0A0A",
                                boxShadow: "2.5px 2.5px 0 #0A0A0A",
                                borderRadius: 999,
                            }}
                        >
                            <Star size={15} strokeWidth={2.2} fill={fav ? "currentColor" : "none"} />
                        </button>
                    )}
                    <button
                        onClick={() => setSeloOpen(true)}
                        title="Ver o selo pessoal"
                        data-testid="profile-selo-btn"
                        className="w-10 h-10 grid place-items-center tap-shrink transition-transform hover:-translate-y-0.5"
                        style={{
                            background: "#C8261E",
                            color: "#fff",
                            border: "2.5px solid #0A0A0A",
                            boxShadow: "2.5px 2.5px 0 #0A0A0A",
                            borderRadius: 999,
                        }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M 12 3 L 21 12 L 12 21 L 3 12 Z" fill="currentColor" />
                        </svg>
                    </button>
                    <button
                        onClick={onShare}
                        title="Partilhar perfil"
                        data-testid="profile-share-btn"
                        className="w-10 h-10 grid place-items-center tap-shrink transition-transform hover:-translate-y-0.5"
                        style={{
                            background: "#fff",
                            color: "#0A0A0A",
                            border: "2.5px solid #0A0A0A",
                            boxShadow: "2.5px 2.5px 0 #0A0A0A",
                            borderRadius: 999,
                        }}
                    >
                        <Share2 size={15} strokeWidth={2.2} />
                    </button>
                    <ProfileMoreMenu profile={profile} onProfileUpdate={onProfileUpdate} />
                    {profile.is_self ? (
                        <button
                            onClick={onEditProfile}
                            data-testid="edit-profile-btn"
                            className="btn-silver px-5 py-2"
                        >
                            Editar perfil
                        </button>
                    ) : (
                        <>
                            <div className="relative">
                                <button
                                    onClick={() => setQuickOpen((v) => !v)}
                                    data-testid="profile-quick-msg-btn"
                                    className="w-10 h-10 grid place-items-center tap-shrink transition-transform hover:-translate-y-0.5"
                                    style={{
                                        background: "#fff",
                                        color: "#0A0A0A",
                                        border: "2.5px solid #0A0A0A",
                                        boxShadow: "2.5px 2.5px 0 #0A0A0A",
                                        borderRadius: 999,
                                    }}
                                    title="Mensagem rápida"
                                >
                                    <MessageCircle size={15} strokeWidth={2.2} />
                                </button>
                                {quickOpen && (
                                    <div
                                        data-testid="profile-quick-msg-popover"
                                        className="absolute right-0 top-full mt-2 z-30 w-80 p-3 anim-fade-up"
                                        style={{
                                            background: "#fff",
                                            border: "2.5px solid #0A0A0A",
                                            boxShadow: "5px 5px 0 #0A0A0A",
                                            borderRadius: 12,
                                        }}
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="type-overline">Mensagem rápida</span>
                                            <button
                                                onClick={() => setQuickOpen(false)}
                                                className="w-6 h-6 grid place-items-center tap-shrink"
                                                style={{ background: "#F4F4F4", border: "2px solid #0A0A0A", borderRadius: 999 }}
                                            >
                                                <X size={11} strokeWidth={2.4} />
                                            </button>
                                        </div>
                                        <textarea
                                            value={quickMsg}
                                            onChange={(e) => setQuickMsg(e.target.value)}
                                            placeholder={`Olá ${profile.name.split(" ")[0]}…`}
                                            rows={3}
                                            maxLength={500}
                                            data-testid="profile-quick-msg-input"
                                            className="w-full px-3 py-2 outline-none resize-none font-medium"
                                            style={{
                                                background: "#F4F4F4",
                                                border: "2px solid #0A0A0A",
                                                borderRadius: 8,
                                                fontSize: 13,
                                                color: "#0A0A0A",
                                            }}
                                        />
                                        <div className="flex items-center justify-between mt-2">
                                            <button
                                                onClick={onMessage}
                                                data-testid="profile-quick-msg-open-thread"
                                                className="font-mono font-black uppercase"
                                                style={{ fontSize: 10.5, letterSpacing: "0.10em", color: "#C8261E" }}
                                            >
                                                // abrir conversa →
                                            </button>
                                            <button
                                                onClick={sendQuick}
                                                disabled={sending || !quickMsg.trim()}
                                                data-testid="profile-quick-msg-send"
                                                className="btn-obsidian px-4 py-2 inline-flex items-center gap-1.5 disabled:opacity-40"
                                            >
                                                <Send size={12} strokeWidth={2.4} /> {sending ? "A enviar…" : "Enviar"}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <FollowButton
                                profile={profile}
                                onChange={onProfileUpdate}
                                size="default"
                            />
                            <RodaButton targetUsername={profile.username} />
                        </>
                    )}
                </div>
            </div>

            <div className="mt-4 lg:mt-5 max-w-[760px]">
                <h2 className="font-display text-[28px] lg:text-[34px] tracking-tight leading-none text-black flex items-center gap-2 flex-wrap">
                    {profile.name}
                    {profile.verified && <VerifiedBadge size={18} />}
                    {profile.private && <Lock size={14} className="text-black/40" />}
                    {!profile.is_self && profile.follows_me && (
                        <FollowsYouBadge show className="align-middle ml-0.5" />
                    )}
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

                <div className="flex flex-wrap items-center gap-2 mt-4">
                    {profile.online && (
                        <div className="inline-flex items-center gap-1.5 bg-green-soft-bg border border-green-soft/30 rounded-full px-3 py-1">
                            <span className="w-1.5 h-1.5 bg-green-soft rounded-full pulse-dot" />
                            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-green-soft">online</span>
                        </div>
                    )}
                    {regionMeta && (
                        <Link
                            to={`/tag/${slug(regionMeta.label)}`}
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
                            to={`/tag/${slug(teamMeta.label)}`}
                            className="inline-flex items-center gap-1.5 bg-white border border-black/[0.10] hover:border-black/30 hover:bg-black/[0.02] rounded-full px-3 py-1 tap-shrink transition"
                            data-testid="team-pill"
                            title={`Explorar ${teamMeta.label}`}
                        >
                            <span aria-hidden>{teamMeta.emoji}</span>
                            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-black/75">{teamMeta.label}</span>
                        </Link>
                    )}
                </div>

                {profile.bio && (
                    <ExpandableBio text={profile.bio} className="mt-4" />
                )}

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

                <div className="flex items-center gap-2 mt-4 text-black/45 font-mono text-[11px]">
                    <CalendarDays size={13} />
                    <span data-testid="profile-joined-human">{joinedHuman || `Membro desde ${joined}`}</span>
                    {joinedHuman && joined && (
                        <>
                            <span className="text-black/20">·</span>
                            <span className="text-black/35">desde {joined}</span>
                        </>
                    )}
                </div>

                {mutual && mutual.count > 0 && (
                    <button
                        type="button"
                        onClick={onOpenMutuals}
                        data-testid="mutual-followers"
                        className="flex items-center gap-2.5 mt-4 text-[11px] font-mono text-black/55 hover:text-black transition group"
                        title="Ver conhecidos em comum"
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
                        <span className="font-mono text-[10px] text-black/35 group-hover:text-black/60 transition">→</span>
                    </button>
                )}

                <div className="flex gap-6 mt-5">
                    <button
                        onClick={onOpenFollowing}
                        data-testid="following-count"
                        className="hover:underline"
                    >
                        <span className="font-heading font-bold text-black text-[17px] tabular-nums">{profile.following_count}</span>
                        <span className="ml-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-black/45">a seguir</span>
                    </button>
                    <button
                        onClick={onOpenFollowers}
                        data-testid="followers-count"
                        className="hover:underline"
                    >
                        <span className="font-heading font-bold text-black text-[17px] tabular-nums">{profile.followers_count}</span>
                        <span className="ml-1.5 font-mono text-[11px] uppercase tracking-[0.16em] text-black/45">seguidores</span>
                    </button>
                </div>
            </div>

            <SeloPessoalModal
                profile={profile}
                open={seloOpen}
                onClose={() => setSeloOpen(false)}
            />
        </div>
    );
}
