import { useState } from "react";
import { Link } from "react-router-dom";
import {
    ChevronDown, ChevronUp, MapPin, Smile, Trophy, BookOpen, Music, Quote,
    Coffee, Sparkles, User, Activity as ActivityIcon, Users as UsersIcon,
} from "lucide-react";
import { Avatar } from "../../components/Avatar";

const BIO_SLOT_META = [
    { key: "mood_today",      Icon: Smile,    label: "Mood do dia" },
    { key: "soundtrack",      Icon: Music,    label: "Banda sonora" },
    { key: "reading",         Icon: BookOpen, label: "A ler" },
    { key: "favourite_place", Icon: MapPin,   label: "Lugar favorito" },
    { key: "quote_of_month",  Icon: Quote,    label: "Frase do mês" },
    { key: "city_extra",      Icon: Coffee,   label: "Bairro/Freguesia" },
];

/* Wrapper de secção dobrável */
function Section({ icon: Icon, title, subtitle, children, defaultOpen = true, testid }) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="hairline-b last:border-b-0" data-testid={testid}>
            <button
                onClick={() => setOpen((v) => !v)}
                className="w-full flex items-center gap-3 py-4 px-1 hover:bg-black/[0.02] transition tap-shrink text-left"
                aria-expanded={open}
                data-testid={`${testid}-toggle`}
            >
                <div className="w-9 h-9 rounded-xl bg-black/[0.04] grid place-items-center text-black/70 shrink-0">
                    <Icon size={15} strokeWidth={1.7} />
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="font-heading font-semibold text-[14px] tracking-tight text-black leading-tight">{title}</h3>
                    {subtitle && <p className="text-[11px] text-black/45 font-mono leading-tight mt-0.5 truncate">{subtitle}</p>}
                </div>
                {open
                    ? <ChevronUp   size={15} className="text-black/40 shrink-0" />
                    : <ChevronDown size={15} className="text-black/40 shrink-0" />
                }
            </button>
            {open && <div className="pb-5 pt-1" data-testid={`${testid}-content`}>{children}</div>}
        </div>
    );
}

function Row({ icon: Icon, label, value }) {
    if (!value) return null;
    return (
        <div className="flex items-start gap-3 py-2.5 hairline-b last:border-b-0">
            <div className="w-7 h-7 rounded-lg grid place-items-center shrink-0 bg-black/[0.03] text-black/65">
                <Icon size={13} strokeWidth={1.7} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-[0.14em] text-black/45 font-mono mb-0.5">{label}</div>
                <div className="text-[13.5px] text-black break-words">{value}</div>
            </div>
        </div>
    );
}

/* ---------- IDENTIDADE ---------- */
function IdentitySection({ profile, regionMeta, moodMeta, teamMeta }) {
    const slots = BIO_SLOT_META
        .map((s) => ({ slot: s, value: (profile.bio_slots?.[s.key] || "").trim() }))
        .filter((x) => x.value);
    const hasAny = !!profile.bio || !!profile.city || !!profile.freguesia || !!regionMeta || !!moodMeta || (teamMeta && teamMeta.key !== "nenhum") || slots.length > 0;
    if (!hasAny) {
        return (
            <p className="text-black/55 font-mono text-[12.5px] leading-relaxed">
                {profile.is_self
                    ? "Vai a Definições para preencher a tua ficha de identidade."
                    : "Este perfil ainda não preencheu a sua ficha."}
            </p>
        );
    }
    return (
        <div className="space-y-3">
            {profile.bio && (
                <p className="text-[14px] text-black/80 leading-relaxed max-w-[60ch]">{profile.bio}</p>
            )}
            <div>
                <Row icon={MapPin} label="Cidade"          value={profile.city} />
                <Row icon={MapPin} label="Freguesia/Bairro" value={profile.freguesia} />
                <Row icon={MapPin} label="Região"           value={regionMeta ? `${regionMeta.emoji}  ${regionMeta.label}` : null} />
                <Row icon={Smile}  label="Mood"             value={moodMeta ? `${moodMeta.emoji}  ${moodMeta.label}` : null} />
                <Row icon={Trophy} label="Clube"            value={teamMeta && teamMeta.key !== "nenhum" ? `${teamMeta.emoji}  ${teamMeta.label}` : null} />
            </div>
            {slots.length > 0 && (
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Sparkles size={12} className="text-black/55" strokeWidth={1.8} />
                        <p className="type-overline mb-0">Slots de bio</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {slots.map(({ slot, value }) => (
                            <div
                                key={slot.key}
                                className="rounded-xl border border-black/[0.07] bg-black/[0.02] p-3"
                                data-testid={`about-slot-${slot.key}`}
                            >
                                <div className="flex items-center gap-1.5 mb-1">
                                    <slot.Icon size={11} strokeWidth={1.8} className="text-black/55" />
                                    <span className="text-[9.5px] uppercase tracking-[0.14em] text-black/45 font-mono">{slot.label}</span>
                                </div>
                                <p className="font-heading font-semibold text-[13.5px] tracking-tight text-black leading-snug">{value}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

/* ---------- ATIVIDADE (resumo + link para mapa) ---------- */
function ActivitySection({ stats, regions, onOpenPainel }) {
    return (
        <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
                <div className="rounded-xl border border-black/[0.07] bg-black/[0.02] p-3">
                    <div className="text-[9.5px] uppercase tracking-[0.12em] font-mono text-black/45 mb-1">posts</div>
                    <div className="font-display text-[19px] tracking-tight tabular-nums text-black leading-none">{stats?.posts_count || 0}</div>
                </div>
                <div className="rounded-xl border border-black/[0.07] bg-black/[0.02] p-3">
                    <div className="text-[9.5px] uppercase tracking-[0.12em] font-mono text-black/45 mb-1">reações</div>
                    <div className="font-display text-[19px] tracking-tight tabular-nums text-black leading-none">{stats?.likes_received || 0}</div>
                </div>
                <div className="rounded-xl border border-black/[0.07] bg-black/[0.02] p-3">
                    <div className="text-[9.5px] uppercase tracking-[0.12em] font-mono text-black/45 mb-1">na rede</div>
                    <div className="font-display text-[19px] tracking-tight tabular-nums text-black leading-none">{stats?.joined_days || 0}d</div>
                </div>
            </div>

            {regions && regions.length > 0 && (
                <div>
                    <p className="type-overline mb-2">Mapa PT — cidades mencionadas</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                        {regions.slice(0, 6).map((r) => (
                            <div key={r.city} className="rounded-lg border border-black/[0.06] bg-white px-2.5 py-1.5 flex items-center gap-2">
                                <MapPin size={11} className="text-black/55 shrink-0" />
                                <span className="text-[12px] text-black/80 truncate flex-1">{r.city}</span>
                                <span className="text-[10.5px] font-mono text-black/45 tabular-nums">{r.count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {onOpenPainel && (
                <button
                    onClick={onOpenPainel}
                    className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-full border border-black/[0.10] hover:bg-black/[0.04] text-[11.5px] font-mono uppercase tracking-[0.12em] text-black/65 hover:text-black tap-shrink"
                    data-testid="about-open-painel"
                >
                    Ver actividade completa
                </button>
            )}
        </div>
    );
}

/* ---------- SOCIAL (followers/following + mútuos) ---------- */
function SocialSection({ profile, mutual, onOpenFollowers, onOpenFollowing }) {
    return (
        <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2">
                <button onClick={onOpenFollowers} className="rounded-xl border border-black/[0.07] bg-black/[0.02] p-3 text-left hover:border-black/15 transition" data-testid="about-followers">
                    <div className="text-[9.5px] uppercase tracking-[0.12em] font-mono text-black/45 mb-1">seguidores</div>
                    <div className="font-display text-[19px] tracking-tight tabular-nums text-black leading-none">{profile.followers_count}</div>
                </button>
                <button onClick={onOpenFollowing} className="rounded-xl border border-black/[0.07] bg-black/[0.02] p-3 text-left hover:border-black/15 transition" data-testid="about-following">
                    <div className="text-[9.5px] uppercase tracking-[0.12em] font-mono text-black/45 mb-1">a seguir</div>
                    <div className="font-display text-[19px] tracking-tight tabular-nums text-black leading-none">{profile.following_count}</div>
                </button>
                <div className="rounded-xl border border-black/[0.07] bg-black/[0.02] p-3">
                    <div className="text-[9.5px] uppercase tracking-[0.12em] font-mono text-black/45 mb-1">mútuos</div>
                    <div className="font-display text-[19px] tracking-tight tabular-nums text-black leading-none">{mutual?.count || 0}</div>
                </div>
            </div>
            {mutual && mutual.count > 0 && (
                <div className="flex items-center gap-2.5 text-[12px] font-mono text-black/55">
                    <div className="flex -space-x-2">
                        {mutual.users.slice(0, 5).map((u) => (
                            <Avatar key={u.id} user={u} size={22} className="border-2 border-white" />
                        ))}
                    </div>
                    <span>
                        Seguido por <span className="text-black font-medium">{mutual.count}</span>{" "}
                        {mutual.count > 1 ? "pessoas que segues" : "pessoa que segues"}
                    </span>
                </div>
            )}
        </div>
    );
}

/* ---------- COMUNIDADES (resumo) ---------- */
function CommunitiesPreview({ communities }) {
    if (!communities) return <div className="px-1 py-3 text-center type-overline">A carregar…</div>;
    if (communities.length === 0) {
        return <p className="text-black/45 font-mono text-[12px]">Ainda não faz parte de nenhuma comunidade.</p>;
    }
    return (
        <div className="space-y-1.5">
            {communities.slice(0, 5).map((c) => (
                <Link
                    key={c.id}
                    to={`/c/${c.slug}`}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-black/[0.03] transition tap-shrink"
                    data-testid={`about-community-${c.slug}`}
                >
                    <div className="w-9 h-9 rounded-xl bg-black/[0.04] grid place-items-center text-black/65 shrink-0">
                        <UsersIcon size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="font-medium text-[13px] text-black truncate">{c.name}</div>
                        <div className="text-[10.5px] font-mono text-black/45 mt-0.5">
                            {c.members_count} {c.members_count === 1 ? "membro" : "membros"}
                            {c.is_owner && <span className="ml-1.5 text-amber-600">· moderador</span>}
                        </div>
                    </div>
                </Link>
            ))}
            {communities.length > 5 && (
                <p className="text-[10.5px] text-black/45 font-mono px-2">+ {communities.length - 5} comunidades</p>
            )}
        </div>
    );
}

/* ============= ENTRY POINT ============= */
export function AboutTabSections({
    profile, stats, regionMeta, moodMeta, teamMeta,
    regions, communities, mutual,
    onOpenPainel, onOpenFollowers, onOpenFollowing,
}) {
    return (
        <div className="px-4 lg:px-6 py-3" data-testid="about-tab-sections">
            <Section icon={User}         title="Identidade"     subtitle="Bio, slots, região, clube"  testid="about-section-identity"     defaultOpen={true}>
                <IdentitySection profile={profile} regionMeta={regionMeta} moodMeta={moodMeta} teamMeta={teamMeta} />
            </Section>
            <Section icon={ActivityIcon} title="Atividade"      subtitle="Posts, reações, mapa PT"    testid="about-section-activity"     defaultOpen={false}>
                <ActivitySection stats={stats} regions={regions} onOpenPainel={profile.is_self ? onOpenPainel : null} />
            </Section>
            <Section icon={UsersIcon}    title="Social"         subtitle="Seguidores, a seguir, mútuos" testid="about-section-social"     defaultOpen={false}>
                <SocialSection profile={profile} mutual={mutual} onOpenFollowers={onOpenFollowers} onOpenFollowing={onOpenFollowing} />
            </Section>
            <Section icon={UsersIcon}    title="Comunidades"    subtitle={communities ? `${communities.length} comunidade${communities.length === 1 ? "" : "s"}` : "Carregar…"} testid="about-section-communities" defaultOpen={false}>
                <CommunitiesPreview communities={communities} />
            </Section>
        </div>
    );
}
