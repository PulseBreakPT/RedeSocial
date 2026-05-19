import {
    Activity, Sparkles, ArrowRight, CheckCircle2, ChevronRight, Edit3, Eye,
    UserCircle2, Calendar, Bell, ShieldCheck, Database, FileText,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

/* =============================================================
   HubTab — visão geral em SUPER GRID 12-col.
   Reorganizado: hero topo, anel + score, stats em 4-col, cards
   de saúde 2x6, sugestões 7 + acessos rápidos 5.
   ============================================================= */

/* 0-100 score baseado APENAS nos campos que ainda existem no form. */
function computeProfileCompletion(user, form) {
    const buckets = [
        !!form.name?.trim(),
        !!form.bio?.trim(),
        !!form.avatar,
        !!form.banner,
        !!form.city?.trim(),
        !!form.private || form.private === false, /* decidiu sobre privacidade */
        !!user?.email,
    ];
    const filled = buckets.filter(Boolean).length;
    return Math.round((filled / buckets.length) * 100);
}

function computeSecurityScore(user, form) {
    const pwdAge = (() => {
        if (!user?.password_changed_at) return false;
        try {
            const months = (Date.now() - new Date(user.password_changed_at).getTime()) / (1000 * 60 * 60 * 24 * 30);
            return months <= 12;
        } catch { return false; }
    })();
    const buckets = [
        !!form.private,
        user?.searchable === false,
        user?.show_online === false,
        user?.typing_indicator === false,
        pwdAge,
        !!user?.email,
    ];
    const filled = buckets.filter(Boolean).length;
    return Math.round((filled / buckets.length) * 100);
}

function daysSince(iso) {
    if (!iso) return 0;
    const diff = Date.now() - new Date(iso).getTime();
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

function HealthRing({ value, size = 88, label, color = "#0a0a0a" }) {
    const r = (size - 10) / 2;
    const c = 2 * Math.PI * r;
    const offset = c - (c * value) / 100;
    return (
        <div className="relative shrink-0" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(13,13,16,0.06)" strokeWidth={5} />
                <circle
                    cx={size / 2} cy={size / 2} r={r}
                    fill="none" stroke={color} strokeWidth={5} strokeLinecap="round"
                    strokeDasharray={c} strokeDashoffset={offset}
                    style={{ transition: "stroke-dashoffset 700ms cubic-bezier(0.16,1,0.3,1)" }}
                />
            </svg>
            <div className="absolute inset-0 grid place-items-center">
                <div className="text-center">
                    <div className="font-display text-[20px] leading-none font-bold tabular-nums text-black">{value}<span className="text-[12px] text-black/40 ml-0.5">%</span></div>
                    {label && <div className="text-[9.5px] tracking-[0.12em] uppercase font-mono text-black/45 mt-1">{label}</div>}
                </div>
            </div>
        </div>
    );
}

function QuickStat({ icon: Icon, label, value, sub, accent }) {
    return (
        <div className="card-lux p-4 hover:shadow-md transition h-full">
            <div className={`w-9 h-9 rounded-xl grid place-items-center ${accent || "bg-black/[0.04] text-black/70"}`}>
                <Icon size={16} strokeWidth={1.7} />
            </div>
            <div className="font-display text-[22px] font-bold tabular-nums text-black leading-none mt-3">{value}</div>
            <div className="text-[10.5px] font-mono tracking-wider uppercase text-black/45 mt-1.5 truncate">{label}</div>
            {sub && <div className="text-[10.5px] text-black/55 mt-0.5 leading-snug truncate">{sub}</div>}
        </div>
    );
}

function ActionTile({ icon: Icon, title, sub, onClick, to, badge, dataTestid }) {
    const Cmp = to ? Link : "button";
    const cmpProps = to ? { to } : { onClick, type: "button" };
    return (
        <Cmp
            {...cmpProps}
            data-testid={dataTestid}
            className="group flex items-center gap-3 p-3.5 card-lux hover:shadow-md transition tap-shrink text-left w-full"
        >
            <div className="w-10 h-10 rounded-xl grid place-items-center shrink-0 bg-black/[0.04] text-black/75 group-hover:bg-black/[0.08] transition">
                <Icon size={18} strokeWidth={1.7} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="font-heading font-semibold text-[13.5px] tracking-tight text-black flex items-center gap-1.5">
                    {title}
                    {badge && (
                        <span className="text-[9.5px] font-mono tracking-wider uppercase px-1.5 py-0.5 rounded-full bg-black/[0.05] text-black/55">{badge}</span>
                    )}
                </div>
                {sub && <div className="text-[11.5px] text-black/55 mt-0.5 leading-snug">{sub}</div>}
            </div>
            <ChevronRight size={16} className="text-black/30 group-hover:translate-x-0.5 group-hover:text-black/60 transition shrink-0" />
        </Cmp>
    );
}

export function HubTab({ user, form, prefs, stats, setActiveTab }) {
    const navigate = useNavigate();
    const completion = computeProfileCompletion(user, form);
    const security = computeSecurityScore(user, form);
    const days = daysSince(user?.created_at);
    const memberSince = user?.created_at
        ? new Date(user.created_at).toLocaleDateString("pt-PT", { month: "long", year: "numeric" })
        : "—";

    /* Sugestões — apenas referenciam tabs que existem (hub, perfil, notif, priv-seg, dados-legal). */
    const suggestions = [];
    if (!form.avatar) suggestions.push({ label: "Adiciona uma foto de perfil", to: () => setActiveTab("perfil") });
    if (!form.banner) suggestions.push({ label: "Personaliza a tua capa", to: () => setActiveTab("perfil") });
    if (!form.bio?.trim()) suggestions.push({ label: "Escreve uma bio curta", to: () => setActiveTab("perfil") });
    if (!form.city?.trim()) suggestions.push({ label: "Diz em que cidade estás", to: () => setActiveTab("perfil") });
    if (!prefs?.two_fa_enabled) suggestions.push({ label: "Ativa autenticação em dois passos", to: () => setActiveTab("priv-seg") });
    if (!prefs?.login_alerts) suggestions.push({ label: "Liga alertas de login", to: () => setActiveTab("priv-seg") });

    return (
        <div className="px-4 lg:px-8 py-5 lg:py-7" data-testid="settings-hub">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-4 max-w-6xl">

                {/* HERO — full width */}
                <div className="lg:col-span-12 card-lux p-5 lg:p-6 relative overflow-hidden">
                    <div className="absolute -top-12 -right-12 w-44 h-44 rounded-full bg-black/[0.03] pointer-events-none" />
                    <div className="absolute -bottom-12 -left-8 w-32 h-32 rounded-full bg-black/[0.02] pointer-events-none" />
                    <div className="relative flex items-start gap-5 flex-wrap">
                        <HealthRing value={completion} label="Perfil" />
                        <div className="flex-1 min-w-0">
                            <p className="type-overline">Olá, {user?.name?.split(" ")[0] || user?.username}</p>
                            <h2 className="font-display text-[24px] lg:text-[28px] font-bold tracking-tight leading-tight text-black mt-1">
                                O teu hub
                            </h2>
                            <p className="text-[13px] text-black/60 mt-1.5 leading-relaxed">
                                Membro desde <span className="font-medium text-black/75">{memberSince}</span>
                                {days > 0 && <> · <span className="font-medium text-black/75">{days} {days === 1 ? "dia" : "dias"}</span> connosco</>}
                            </p>
                            <div className="mt-4 flex flex-wrap gap-2">
                                <button
                                    onClick={() => setActiveTab("perfil")}
                                    data-testid="hub-edit-profile"
                                    className="btn-obsidian text-[12px] px-4 py-2 inline-flex items-center gap-1.5"
                                >
                                    <Edit3 size={13} strokeWidth={2} /> Editar perfil
                                </button>
                                <button
                                    onClick={() => navigate(`/u/${user?.username}`)}
                                    data-testid="hub-view-profile"
                                    className="btn-silver text-[12px] px-4 py-2 inline-flex items-center gap-1.5"
                                >
                                    <Eye size={13} strokeWidth={1.8} /> Ver perfil público
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* STATS rápidos — 4 colunas em desktop */}
                <div className="lg:col-span-3 col-span-1 md:col-span-1">
                    <QuickStat icon={Activity} label="Publicações" value={stats?.posts_count ?? 0} />
                </div>
                <div className="lg:col-span-3 col-span-1 md:col-span-1">
                    <QuickStat icon={UserCircle2} label="Seguidores" value={user?.followers_count ?? 0} />
                </div>
                <div className="lg:col-span-3 col-span-1 md:col-span-1">
                    <QuickStat icon={UserCircle2} label="A seguir" value={user?.following_count ?? 0} />
                </div>
                <div className="lg:col-span-3 col-span-1 md:col-span-1">
                    <QuickStat icon={Calendar} label="Dias" value={days} sub={memberSince} />
                </div>

                {/* SCORES — 2 cards lado a lado */}
                <div className="lg:col-span-6 card-lux p-5">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <p className="type-overline">Saúde do perfil</p>
                            <h3 className="font-heading font-bold text-[16px] tracking-tight text-black mt-0.5">Completude</h3>
                        </div>
                        <HealthRing value={completion} size={64} />
                    </div>
                    <div className="w-full h-1.5 bg-black/[0.06] rounded-full overflow-hidden">
                        <div
                            className="h-full bg-black rounded-full transition-all duration-700"
                            style={{ width: `${completion}%` }}
                        />
                    </div>
                    <p className="text-[12px] text-black/55 mt-3 leading-relaxed">
                        {completion >= 80 ? "Perfil excelente — quase tudo preenchido." :
                         completion >= 50 ? "Perfil saudável. Algumas secções podem ser melhoradas." :
                         "Há margem para fortalecer o teu perfil."}
                    </p>
                </div>
                <div className="lg:col-span-6 card-lux p-5">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <p className="type-overline">Segurança</p>
                            <h3 className="font-heading font-bold text-[16px] tracking-tight text-black mt-0.5">Proteção</h3>
                        </div>
                        <HealthRing value={security} size={64} color={security >= 60 ? "#0a0a0a" : "#dc6055"} />
                    </div>
                    <div className="w-full h-1.5 bg-black/[0.06] rounded-full overflow-hidden">
                        <div
                            className={`h-full rounded-full transition-all duration-700 ${security >= 60 ? "bg-black" : "bg-red-soft"}`}
                            style={{ width: `${security}%` }}
                        />
                    </div>
                    <button
                        onClick={() => setActiveTab("priv-seg")}
                        data-testid="hub-improve-security"
                        className="mt-3 text-[12px] text-black/70 hover:text-black inline-flex items-center gap-1 transition"
                    >
                        Reforçar segurança <ArrowRight size={12} />
                    </button>
                </div>

                {/* SUGESTÕES — 7 col */}
                {suggestions.length > 0 && (
                    <div className="lg:col-span-7 card-lux p-5">
                        <div className="flex items-center justify-between mb-3.5">
                            <div className="flex items-center gap-2">
                                <Sparkles size={14} strokeWidth={1.8} className="text-black/55" />
                                <p className="type-overline mb-0">Sugestões</p>
                            </div>
                            <span className="text-[10.5px] font-mono tracking-wider uppercase text-black/45 tabular-nums">
                                {suggestions.length} pendentes
                            </span>
                        </div>
                        <div className="space-y-2">
                            {suggestions.slice(0, 6).map((s, i) => (
                                <button
                                    key={i}
                                    onClick={s.to}
                                    data-testid={`hub-suggestion-${i}`}
                                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-black/[0.03] transition text-left group"
                                >
                                    <div className="w-6 h-6 rounded-full border-2 border-black/15 group-hover:border-black/40 grid place-items-center transition shrink-0">
                                        <CheckCircle2 size={12} className="text-black/0 group-hover:text-black/55 transition" />
                                    </div>
                                    <span className="flex-1 text-[13px] text-black/80 group-hover:text-black transition">{s.label}</span>
                                    <ChevronRight size={14} className="text-black/30 group-hover:translate-x-0.5 group-hover:text-black/60 transition" />
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* ACESSOS RÁPIDOS — 5 col */}
                <div className={`${suggestions.length > 0 ? "lg:col-span-5" : "lg:col-span-12"}`}>
                    <div className="card-lux p-5 h-full">
                        <p className="type-overline mb-3">Acessos rápidos</p>
                        <div className="grid grid-cols-1 gap-2">
                            <ActionTile icon={Bell} title="Notificações" sub="Modos saudáveis, tipos, som & vibração" onClick={() => setActiveTab("notif")} dataTestid="hub-action-notif" />
                            <ActionTile icon={ShieldCheck} title="Privacidade & Segurança" sub="Quem te vê, palavra-passe, sessões" onClick={() => setActiveTab("priv-seg")} dataTestid="hub-action-priv" />
                            <ActionTile icon={Database} title="Dados & Legal" sub="Exportar, apagar conta, termos" onClick={() => setActiveTab("dados-legal")} dataTestid="hub-action-dados" />
                            <ActionTile icon={FileText} title="Editar perfil" sub="Nome, bio, capa, cidade" onClick={() => setActiveTab("perfil")} dataTestid="hub-action-perfil" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
