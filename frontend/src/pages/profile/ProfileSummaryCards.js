import { Link } from "react-router-dom";
import {
    Users as UsersIcon, Bookmark, FileText, Settings, ChevronRight, ArrowRight,
    Smile, MapPin, Trophy, Award, Heart, MessageCircle, Flame, BarChart3,
    LayoutGrid,
} from "lucide-react";

/**
 * ProfileSummaryCards — 3 cartões horizontais compactos.
 * Em vez de empilhar painéis verticalmente, agrupa atalhos
 * em três cards lado-a-lado (desktop) / scroll horizontal (mobile).
 *
 *   Card 1: Atalhos da conta   (self only)
 *   Card 2: Identidade
 *   Card 3: Estatísticas
 *
 * Cada card mostra 3-4 itens-chave + botão "Ver tudo / mais".
 */

function Card({ title, overline, onAction, actionLabel, children, testid, accent }) {
    return (
        <div
            data-testid={testid}
            className="card-lux p-4 flex flex-col min-h-[180px]"
        >
            <div className="flex items-center justify-between gap-2 mb-3">
                <div className="min-w-0">
                    <p className="type-overline mb-0.5">{overline}</p>
                    <h3 className="font-heading font-bold text-[14.5px] tracking-tight text-black leading-tight truncate">
                        {title}
                    </h3>
                </div>
                {accent && (
                    <div className={`w-9 h-9 rounded-xl grid place-items-center shrink-0 ${accent}`}>
                        {/* slot for icon */}
                    </div>
                )}
            </div>
            <div className="flex-1 min-h-0">{children}</div>
            {onAction && (
                <button
                    onClick={onAction}
                    data-testid={`${testid}-action`}
                    className="mt-3 inline-flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg text-[11.5px] font-mono uppercase tracking-[0.12em] text-black/65 hover:text-black hover:bg-black/[0.04] transition tap-shrink"
                >
                    <span>{actionLabel}</span>
                    <ArrowRight size={12} strokeWidth={1.8} />
                </button>
            )}
        </div>
    );
}

function RowItem({ icon: Icon, label, value, to, onClick, sub }) {
    const inner = (
        <>
            <div className="w-7 h-7 rounded-lg bg-black/[0.04] grid place-items-center shrink-0 text-black/65">
                <Icon size={13} strokeWidth={1.7} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="text-[12.5px] text-black/85 leading-tight truncate font-medium">{label}</div>
                {sub && <div className="text-[10.5px] text-black/45 font-mono leading-tight mt-0.5 truncate">{sub}</div>}
            </div>
            {value !== undefined && (
                <span className="font-heading font-bold text-[13px] tabular-nums text-black/75 shrink-0">{value}</span>
            )}
        </>
    );
    if (to) {
        return (
            <Link to={to} onClick={onClick} className="flex items-center gap-2.5 py-1.5 px-1 rounded-lg hover:bg-black/[0.03] transition tap-shrink">
                {inner}
            </Link>
        );
    }
    return (
        <button onClick={onClick} className="w-full flex items-center gap-2.5 py-1.5 px-1 rounded-lg hover:bg-black/[0.03] transition tap-shrink text-left">
            {inner}
        </button>
    );
}

/* ---------------- CARD 1: ATALHOS DA CONTA ---------------- */
function AccountShortcutCard({ onOpenPainel, stats }) {
    return (
        <Card
            overline="A tua área"
            title="Atalhos da conta"
            actionLabel="Painel pessoal"
            onAction={onOpenPainel}
            testid="summary-account"
        >
            <div className="space-y-0.5">
                <RowItem icon={UsersIcon}  label="Comunidades" to="/communities" />
                <RowItem icon={Bookmark}   label="Guardados"   to="/bookmarks" />
                <RowItem icon={FileText}   label="Rascunhos"   to="/drafts" />
                <RowItem icon={Settings}   label="Definições"  to="/settings" />
            </div>
        </Card>
    );
}

/* ---------------- CARD 2: IDENTIDADE ---------------- */
function IdentitySummaryCard({ profile, regionMeta, moodMeta, teamMeta, onSeeMore, badges }) {
    const mainBadge = badges?.earned?.[0];
    const items = [];
    if (moodMeta)   items.push({ icon: Smile,  label: `Mood: ${moodMeta.label}`,  sub: moodMeta.emoji });
    if (regionMeta) items.push({ icon: MapPin, label: regionMeta.label,            sub: profile.city || "Região" });
    if (profile.city && !regionMeta) items.push({ icon: MapPin, label: profile.city, sub: "Cidade" });
    if (teamMeta && teamMeta.key !== "nenhum") items.push({ icon: Trophy, label: teamMeta.label, sub: "Clube" });
    if (mainBadge) items.push({ icon: Award, label: mainBadge.label, sub: "Badge principal" });

    if (items.length === 0) {
        items.push({ icon: Smile, label: "Sem identidade definida", sub: "Define mood, região, clube" });
    }

    return (
        <Card
            overline="Quem és"
            title="Identidade"
            actionLabel="Ver identidade completa"
            onAction={onSeeMore}
            testid="summary-identity"
        >
            <div className="space-y-0.5">
                {items.slice(0, 4).map((it, i) => (
                    <RowItem key={i} icon={it.icon} label={it.label} sub={it.sub} onClick={onSeeMore} />
                ))}
            </div>
        </Card>
    );
}

/* ---------------- CARD 3: ESTATÍSTICAS ---------------- */
function StatsSummaryCard({ stats, onSeeMore }) {
    const items = [
        { icon: LayoutGrid,   label: "Posts",      value: stats?.posts_count ?? 0 },
        { icon: Heart,        label: "Reações",    value: stats?.likes_received ?? 0 },
        { icon: MessageCircle,label: "Comentários",value: stats?.comments_received ?? 0 },
        { icon: Flame,        label: "Streak",     value: stats?.streak ? `${stats.streak}d` : 0 },
    ];
    return (
        <Card
            overline="Em números"
            title="Estatísticas"
            actionLabel="Ver analytics"
            onAction={onSeeMore}
            testid="summary-stats"
        >
            <div className="grid grid-cols-2 gap-1.5">
                {items.map((it, i) => (
                    <div
                        key={i}
                        className="card-lux !shadow-none border border-black/[0.05] bg-black/[0.02] p-2 flex flex-col items-start"
                        data-testid={`summary-stat-${it.label.toLowerCase()}`}
                    >
                        <div className="flex items-center gap-1.5 text-black/45">
                            <it.icon size={11} strokeWidth={1.8} />
                            <span className="text-[9.5px] uppercase tracking-[0.12em] font-mono">{it.label}</span>
                        </div>
                        <div className="font-display text-[19px] tracking-tight tabular-nums text-black leading-none mt-1.5">
                            {typeof it.value === "number" ? it.value.toLocaleString("pt-PT") : it.value}
                        </div>
                    </div>
                ))}
            </div>
        </Card>
    );
}

/* ---------------- WRAPPER ---------------- */
export function ProfileSummaryCards({
    profile, stats, badges, regionMeta, moodMeta, teamMeta,
    onOpenPainel, onSeeIdentity, onSeeAnalytics,
}) {
    return (
        <section
            data-testid="profile-summary-cards"
            className="px-4 lg:px-6 pt-4 pb-2"
        >
            <div
                className="grid gap-2.5 lg:gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            >
                {profile.is_self && (
                    <AccountShortcutCard onOpenPainel={onOpenPainel} stats={stats} />
                )}
                <IdentitySummaryCard
                    profile={profile}
                    regionMeta={regionMeta}
                    moodMeta={moodMeta}
                    teamMeta={teamMeta}
                    badges={badges}
                    onSeeMore={onSeeIdentity}
                />
                <StatsSummaryCard stats={stats} onSeeMore={onSeeAnalytics} />
            </div>
        </section>
    );
}
