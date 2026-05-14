import { useState } from "react";
import { Link } from "react-router-dom";
import {
    Lock, Users, MessageCircle, Share2, MapPin, Award,
    Smile, Music, BookOpen, Quote, CalendarDays, Star, Send, X,
} from "lucide-react";
import { Avatar } from "../../components/Avatar";
import { VerifiedBadge } from "../../components/VerifiedBadge";
import { RodaButton } from "../../components/RodaButton";
import { ProfileMoreMenu } from "./ProfileMoreMenu";
import { api, toastApiError } from "../../lib/api";
import { toast } from "sonner";
import { isFavouriteUser, toggleFavouriteUser } from "../../lib/interestSignals";

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
    onFollow, onMessage, onShare, onEditProfile, onOpenFollowers, onOpenFollowing,
    onProfileUpdate,
}) {
    const [fav, setFav] = useState(() => isFavouriteUser(profile.username));
    const [quickOpen, setQuickOpen] = useState(false);
    const [quickMsg, setQuickMsg] = useState("");
    const [sending, setSending] = useState(false);
    const joined = profile.created_at
        ? new Date(profile.created_at).toLocaleDateString("pt-PT", { month: "long", year: "numeric" })
        : "";
    const filledSlots = BIO_SLOT_META.filter((s) => (profile.bio_slots?.[s.key] || "").trim()).slice(0, 6);

    const onToggleFav = () => { setFav(toggleFavouriteUser(profile.username)); };
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
                <div className="rounded-full p-1 bg-white shadow-[0_8px_24px_-12px_rgba(13,13,16,0.30)]">
                    <Avatar user={profile} size={88} showOnline />
                </div>
                <div className="hidden sm:flex gap-2 pb-1">
                    {!profile.is_self && (
                        <button
                            onClick={onToggleFav}
                            data-testid="profile-favourite-btn"
                            title={fav ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                            className={`w-10 h-10 grid place-items-center rounded-full border tap-shrink transition ${
                                fav ? "border-amber-300 bg-amber-50 text-amber-600" : "border-black/[0.10] hover:bg-black/[0.04] text-black/65"
                            }`}
                        >
                            <Star size={15} strokeWidth={1.7} fill={fav ? "currentColor" : "none"} />
                        </button>
                    )}
                    <button
                        onClick={onShare}
                        title="Partilhar perfil"
                        data-testid="profile-share-btn"
                        className="w-10 h-10 grid place-items-center rounded-full border border-black/[0.10] hover:bg-black/[0.04] transition tap-shrink"
                    >
                        <Share2 size={15} />
                    </button>
                    <ProfileMoreMenu profile={profile} onProfileUpdate={onProfileUpdate} />
                    {profile.is_self ? (
                        <button
                            onClick={onEditProfile}
                            data-testid="edit-profile-btn"
                            className="btn-silver px-5 py-2 text-[12px]"
                        >
                            Editar perfil
                        </button>
                    ) : (
                        <>
                            <div className="relative">
                                <button
                                    onClick={() => setQuickOpen((v) => !v)}
                                    data-testid="profile-quick-msg-btn"
                                    className="w-10 h-10 grid place-items-center rounded-full border border-black/[0.10] hover:bg-black/[0.04] transition tap-shrink"
                                    title="Mensagem rápida"
                                >
                                    <MessageCircle size={16} />
                                </button>
                                {quickOpen && (
                                    <div
                                        data-testid="profile-quick-msg-popover"
                                        className="absolute right-0 top-full mt-2 z-30 w-80 bg-white border border-black/[0.08] rounded-2xl p-3 shadow-[0_20px_50px_-12px_rgba(13,13,16,0.18)] anim-fade-up"
                                    >
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="type-overline mb-0">Mensagem rápida</span>
                                            <button onClick={() => setQuickOpen(false)} className="w-6 h-6 grid place-items-center rounded-full hover:bg-black/[0.05]">
                                                <X size={12} />
                                            </button>
                                        </div>
                                        <textarea
                                            value={quickMsg}
                                            onChange={(e) => setQuickMsg(e.target.value)}
                                            placeholder={`Olá ${profile.name.split(" ")[0]}…`}
                                            rows={3}
                                            maxLength={500}
                                            data-testid="profile-quick-msg-input"
                                            className="w-full bg-black/[0.03] border border-black/[0.06] rounded-xl px-3 py-2 text-[13px] focus:bg-white focus:border-black/30 outline-none resize-none"
                                        />
                                        <div className="flex items-center justify-between mt-2">
                                            <button
                                                onClick={onMessage}
                                                data-testid="profile-quick-msg-open-thread"
                                                className="text-[11px] font-mono text-black/55 hover:text-black"
                                            >
                                                abrir conversa →
                                            </button>
                                            <button
                                                onClick={sendQuick}
                                                disabled={sending || !quickMsg.trim()}
                                                data-testid="profile-quick-msg-send"
                                                className="btn-obsidian px-4 py-2 text-[11.5px] inline-flex items-center gap-1.5 disabled:opacity-40"
                                            >
                                                <Send size={12} /> {sending ? "A enviar…" : "Enviar"}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                            {profile.is_following ? (
                                <button
                                    onClick={onFollow}
                                    data-testid="follow-profile-btn"
                                    className="chip-on px-5 py-2 text-[11px] !text-white font-heading font-medium tracking-tight rounded-full"
                                >
                                    Seguindo
                                </button>
                            ) : (
                                <button
                                    onClick={onFollow}
                                    data-testid="follow-profile-btn"
                                    className="btn-obsidian px-5 py-2 text-[12px]"
                                >
                                    Seguir
                                </button>
                            )}
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
                            <span className="font-mono text-[10px] text-red-soft uppercase tracking-[0.14em]">{stats.streak}d streak</span>
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
                    <p className="mt-4 text-black/80 leading-relaxed text-[15px] max-w-[60ch]">
                        {profile.bio}
                    </p>
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
                    <span>Membro desde {joined}</span>
                    {stats?.joined_days !== undefined && (
                        <>
                            <span className="text-black/20">·</span>
                            <span>{stats.joined_days}d na rede</span>
                        </>
                    )}
                </div>

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
        </div>
    );
}
