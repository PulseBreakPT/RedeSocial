import {
    LayoutDashboard, Activity, Sparkles, Zap, TrendingUp,
    ArrowRight, CheckCircle2, AlertCircle, ChevronRight, Edit3, Eye,
    UserCircle2, Calendar, MapPin as MapPinIcon,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

/* Compute profile completion as a 0-100% score based on filled fields */
function computeProfileCompletion(user, form) {
    const buckets = [
        !!form.name?.trim(),
        !!form.bio?.trim(),
        !!form.avatar,
        !!form.banner,
        !!form.city?.trim(),
        !!form.region,
        !!form.mood_initial,
        !!form.team,
        Object.values(form.bio_slots || {}).filter((v) => v?.trim()).length >= 1,
        Object.values(form.bio_slots || {}).filter((v) => v?.trim()).length >= 3,
    ];
    const filled = buckets.filter(Boolean).length;
    return Math.round((filled / buckets.length) * 100);
}

/* Compute security score 0-100 from real user fields */
function computeSecurityScore(user, form) {
    const pwdAge = (() => {
        if (!user?.password_changed_at) return false;
        try {
            const months = (Date.now() - new Date(user.password_changed_at).getTime()) / (1000 * 60 * 60 * 24 * 30);
            return months <= 12; /* changed in the last 12 months */
        } catch {
            return false;
        }
    })();
    const buckets = [
        !!form.private,                                /* private account */
        user?.searchable === false,                    /* hidden from search */
        user?.show_online === false,                   /* online indicator off */
        user?.typing_indicator === false,              /* typing indicator off */
        pwdAge,                                        /* password recent */
        !!user?.email,                                 /* email on file (recovery) */
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
        <div className="card-lux p-4 group hover:shadow-md transition">
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
            className="group flex items-center gap-3 p-4 card-lux hover:shadow-md transition tap-shrink text-left w-full"
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
    const security = computeSecurityScore(prefs, form);
    const days = daysSince(user?.created_at);
    const memberSince = user?.created_at ? new Date(user.created_at).toLocaleDateString("pt-PT", { month: "long", year: "numeric" }) : "—";

    /* Helpful suggestions based on completion buckets */
    const suggestions = [];
    if (!form.avatar) suggestions.push({ label: "Adiciona uma foto de perfil", to: () => setActiveTab("conta") });
    if (!form.banner) suggestions.push({ label: "Personaliza a tua capa", to: () => setActiveTab("conta") });
    if (!form.region) suggestions.push({ label: "Diz onde estás (Identidade)", to: () => setActiveTab("ident") });
    if (Object.values(form.bio_slots || {}).filter((v) => v?.trim()).length < 3) {
        suggestions.push({ label: "Preenche pelo menos 3 slots de bio", to: () => setActiveTab("ident") });
    }
    if (!prefs.two_fa_enabled) suggestions.push({ label: "Ativa autenticação em dois passos", to: () => setActiveTab("seg") });
    if (!prefs.login_alerts) suggestions.push({ label: "Liga alertas de login", to: () => setActiveTab("seg") });

    return (
        <div className="px-4 lg:px-6 py-5 lg:py-6 space-y-6 max-w-3xl" data-testid="settings-hub">
            {/* Hero card with greeting + completion */}
            <div className="card-lux p-5 lg:p-6 relative overflow-hidden">
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
                                onClick={() => setActiveTab("conta")}
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

            {/* Quick stats */}
            <div className="grid grid-cols-2 gap-3">
                <QuickStat icon={Activity} label="Posts" value={stats?.posts_count ?? 0} accent="bg-black/[0.04] text-black/75" />
                <QuickStat icon={UserCircle2} label="Seguidores" value={user?.followers_count ?? 0} />
            </div>

            {/* Score cards: profile + security */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="card-lux p-5">
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
                <div className="card-lux p-5">
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
                        onClick={() => setActiveTab("seg")}
                        data-testid="hub-improve-security"
                        className="mt-3 text-[12px] text-black/70 hover:text-black inline-flex items-center gap-1 transition"
                    >
                        Reforçar segurança <ArrowRight size={12} />
                    </button>
                </div>
            </div>

            {/* Suggestions */}
            {suggestions.length > 0 && (
                <div className="card-lux p-5">
                    <div className="flex items-center justify-between mb-3.5">
                        <div className="flex items-center gap-2">
                            <Sparkles size={14} strokeWidth={1.8} className="text-black/55" />
                            <p className="type-overline mb-0">Sugestões</p>
                        </div>
                        <span className="text-[10.5px] font-mono tracking-wider uppercase text-black/45 tabular-nums">{suggestions.length} pendentes</span>
                    </div>
                    <div className="space-y-2">
                        {suggestions.slice(0, 4).map((s, i) => (
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

            {/* Quick actions grid */}
            <div>
                <p className="type-overline mb-3">Acessos rápidos</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <ActionTile icon={Zap} title="Para Ti" sub="Ajusta o algoritmo do teu feed" onClick={() => setActiveTab("foryou")} dataTestid="hub-action-foryou" />
                    <ActionTile icon={TrendingUp} title="Aparência" sub="Tema, densidade, idioma" onClick={() => setActiveTab("apar")} dataTestid="hub-action-apar" />
                    <ActionTile icon={MapPinIcon} title="Identidade portuguesa" sub="Região, mood, bio em 6 slots" onClick={() => setActiveTab("ident")} dataTestid="hub-action-ident" />
                    <ActionTile icon={Calendar} title="Notificações & Modos" sub="Boa Noite, Cafezinho, push" onClick={() => setActiveTab("notif")} dataTestid="hub-action-notif" />
                </div>
            </div>
        </div>
    );
}
