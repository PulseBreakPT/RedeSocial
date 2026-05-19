import { useEffect, useMemo, useState } from "react";
import {
    Activity, Sparkles, ArrowRight, CheckCircle2, ChevronRight, Edit3, Eye,
    UserCircle2, Calendar, Bell, ShieldCheck, Database, FileText, Heart,
    MessageSquare, Repeat2, TrendingUp, KeyRound, MailCheck, Lock,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../../lib/api";
import { StatusPill } from "./_shared";

/* =============================================================
   HubTab — Visão geral SSS tier.
   Hero com dois rings (perfil + segurança) lado a lado,
   stats reais do /users/{username}/stats, sugestões só baseadas
   em dados verdadeiros do user. Sem mocks, sem hardcode.
   ============================================================= */

function daysSince(iso) {
    if (!iso) return 0;
    try {
        const diff = Date.now() - new Date(iso).getTime();
        return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
    } catch { return 0; }
}

function pluralPT(n, sing, plur) { return n === 1 ? sing : plur; }

function fmtNumber(n) {
    if (n == null) return "0";
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
    if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
    return String(n);
}

/* 0-100 — usa exactamente os mesmos buckets que o backend (`/stats.profile_completion`) */
function computeProfileCompletion(user, form, stats) {
    if (typeof stats?.profile_completion === "number") return stats.profile_completion;
    let s = 0;
    if (form?.bio?.trim() || user?.bio) s += 20;
    if (form?.avatar || user?.avatar) s += 20;
    if (form?.banner || user?.banner) s += 15;
    if (user?.verified) s += 10;
    if ((stats?.posts_count || 0) >= 1) s += 20;
    if ((user?.following_count || 0) >= 3) s += 15;
    return s;
}

/* Security score — pondera flags REAIS do user (sem prefs locais). */
function computeSecurityScore(user) {
    const buckets = [
        { ok: !!user?.two_fa_enabled, w: 30 },
        { ok: !!user?.recovery_email, w: 15 },
        { ok: user?.login_alerts_enabled !== false, w: 10 },
        { ok: (() => {
            if (!user?.password_changed_at) return false;
            try {
                const months = (Date.now() - new Date(user.password_changed_at).getTime()) / (1000 * 60 * 60 * 24 * 30);
                return months <= 12;
            } catch { return false; }
        })(), w: 20 },
        { ok: !!user?.private, w: 10 },
        { ok: user?.show_online === false, w: 5 },
        { ok: user?.searchable === false, w: 5 },
        { ok: !!user?.email, w: 5 },
    ];
    return buckets.reduce((acc, b) => acc + (b.ok ? b.w : 0), 0);
}

function Ring({ value, size = 96, accent, sub }) {
    const r = (size - 10) / 2;
    const c = 2 * Math.PI * r;
    const offset = c - (c * Math.max(0, Math.min(100, value))) / 100;
    return (
        <div className="relative shrink-0" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(13,13,16,0.06)" strokeWidth={6} />
                <circle
                    cx={size / 2} cy={size / 2} r={r}
                    fill="none" stroke={accent || "#0a0a0a"} strokeWidth={6} strokeLinecap="round"
                    strokeDasharray={c} strokeDashoffset={offset}
                    style={{ transition: "stroke-dashoffset 900ms cubic-bezier(0.16,1,0.3,1)" }}
                />
            </svg>
            <div className="absolute inset-0 grid place-items-center">
                <div className="text-center">
                    <div className="font-display text-[22px] leading-none font-bold tabular-nums text-black">
                        {value}<span className="text-[12px] text-black/40 ml-0.5">%</span>
                    </div>
                    {sub && <div className="text-[9.5px] tracking-[0.12em] uppercase font-mono text-black/45 mt-1.5">{sub}</div>}
                </div>
            </div>
        </div>
    );
}

function StatCard({ icon: Icon, value, label, sub, tint }) {
    return (
        <div className="card-lux p-4 hover:shadow-md transition h-full flex flex-col">
            <div className={`w-9 h-9 rounded-xl grid place-items-center ${tint || "bg-black/[0.04] text-black/70"}`}>
                <Icon size={15} strokeWidth={1.8} />
            </div>
            <div className="font-display text-[24px] font-bold tabular-nums text-black leading-none mt-3.5">{value}</div>
            <div className="text-[10.5px] font-mono tracking-wider uppercase text-black/45 mt-1.5 truncate">{label}</div>
            {sub && <div className="text-[11px] text-black/55 mt-0.5 leading-snug truncate">{sub}</div>}
        </div>
    );
}

function ActionTile({ icon: Icon, title, sub, onClick, to, badge, dataTestid, tint }) {
    const Cmp = to ? Link : "button";
    const cmpProps = to ? { to } : { onClick, type: "button" };
    return (
        <Cmp
            {...cmpProps}
            data-testid={dataTestid}
            className="group flex items-center gap-3 p-3.5 card-lux hover:shadow-md transition tap-shrink text-left w-full"
        >
            <div className={`w-10 h-10 rounded-xl grid place-items-center shrink-0 ${tint || "bg-black/[0.04] text-black/75"} group-hover:bg-black group-hover:text-white transition`}>
                <Icon size={17} strokeWidth={1.7} />
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

export function HubTab({ user, form, stats, setActiveTab }) {
    const navigate = useNavigate();

    /* Pull a richer payload from backend (likes_received, engagement_rate, etc.). */
    const [rich, setRich] = useState(stats || {});
    useEffect(() => {
        if (!user?.username) return;
        let cancelled = false;
        (async () => {
            try {
                const { data } = await api.get(`/users/${user.username}/stats`);
                if (!cancelled && data && typeof data === "object") setRich(data);
            } catch { /* silent */ }
        })();
        return () => { cancelled = true; };
    }, [user?.username]);

    const completion = useMemo(() => computeProfileCompletion(user, form, rich), [user, form, rich]);
    const security = useMemo(() => computeSecurityScore(user), [user]);

    const memberSince = user?.created_at
        ? new Date(user.created_at).toLocaleDateString("pt-PT", { month: "long", year: "numeric" })
        : "—";
    const days = daysSince(user?.created_at);

    /* Sugestões REAIS — só aparecem se algo está objectivamente em falta. */
    const suggestions = useMemo(() => {
        const out = [];
        if (!user?.avatar && !form?.avatar) out.push({ label: "Adiciona uma foto de perfil", to: () => setActiveTab("perfil"), icon: UserCircle2 });
        if (!user?.banner && !form?.banner) out.push({ label: "Personaliza a tua capa", to: () => setActiveTab("perfil"), icon: Sparkles });
        if (!(user?.bio || "").trim() && !(form?.bio || "").trim()) out.push({ label: "Escreve uma bio curta", to: () => setActiveTab("perfil"), icon: Edit3 });
        if (!(user?.city || "").trim() && !(form?.city || "").trim()) out.push({ label: "Diz em que cidade estás", to: () => setActiveTab("perfil"), icon: Heart });
        if (!user?.two_fa_enabled) out.push({ label: "Ativa autenticação em dois passos", to: () => setActiveTab("priv-seg"), icon: ShieldCheck });
        if (!user?.recovery_email) out.push({ label: "Define um email de recuperação", to: () => setActiveTab("priv-seg"), icon: MailCheck });
        if (user?.login_alerts_enabled === false) out.push({ label: "Liga alertas de início de sessão", to: () => setActiveTab("priv-seg"), icon: Bell });
        if (!user?.password_changed_at) out.push({ label: "Atualiza a palavra-passe (nunca foi alterada)", to: () => setActiveTab("priv-seg"), icon: KeyRound });
        return out;
    }, [user, form, setActiveTab]);

    const completionLabel =
        completion >= 80 ? "Perfil excelente" :
        completion >= 50 ? "Perfil saudável" :
        "Há margem para melhorar";

    const securityLabel =
        security >= 80 ? "Proteção forte" :
        security >= 50 ? "Proteção razoável" :
        "Proteção fraca";

    const securityColor = security >= 70 ? "#0a0a0a" : security >= 40 ? "#d4a418" : "#dc6055";

    return (
        <div className="px-4 lg:px-8 py-5 lg:py-7" data-testid="settings-hub">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-4 max-w-6xl">

                {/* HERO — duplo ring + identidade */}
                <div className="lg:col-span-12 relative overflow-hidden rounded-3xl border border-black/[0.08] bg-gradient-to-br from-white via-white to-black/[0.03] p-6 lg:p-8">
                    <div className="absolute -top-16 -right-12 w-56 h-56 rounded-full bg-black/[0.025] pointer-events-none" />
                    <div className="absolute -bottom-16 -left-10 w-40 h-40 rounded-full bg-black/[0.02] pointer-events-none" />

                    <div className="relative flex items-start justify-between gap-6 flex-wrap">
                        <div className="min-w-0 max-w-xl">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <p className="type-overline mb-0">Olá, {user?.name?.split(" ")[0] || user?.username || "alguém"}</p>
                                {user?.verified && <StatusPill tone="success" dot={false}><CheckCircle2 size={9} /> Verificado</StatusPill>}
                            </div>
                            <h2 className="font-display text-[28px] lg:text-[34px] font-bold tracking-tight leading-tight text-black">
                                O teu painel
                            </h2>
                            <p className="text-[13px] text-black/60 mt-2 leading-relaxed">
                                Membro desde <span className="font-medium text-black/85">{memberSince}</span>
                                {days > 0 && <> · <span className="font-medium text-black/85">{days} {pluralPT(days, "dia", "dias")}</span> connosco</>}
                            </p>
                            <div className="mt-5 flex flex-wrap gap-2">
                                <button
                                    onClick={() => setActiveTab("perfil")}
                                    data-testid="hub-edit-profile"
                                    className="btn-obsidian text-[12px] px-4 py-2.5 inline-flex items-center gap-1.5"
                                >
                                    <Edit3 size={13} strokeWidth={2} /> Editar perfil
                                </button>
                                <button
                                    onClick={() => navigate(`/u/${user?.username}`)}
                                    data-testid="hub-view-profile"
                                    className="btn-silver text-[12px] px-4 py-2.5 inline-flex items-center gap-1.5"
                                >
                                    <Eye size={13} strokeWidth={1.8} /> Ver perfil público
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center gap-6 sm:gap-8 shrink-0">
                            <div className="flex flex-col items-center gap-1">
                                <Ring value={completion} sub="Perfil" />
                            </div>
                            <div className="hidden sm:block w-px h-20 bg-black/[0.06]" />
                            <div className="flex flex-col items-center gap-1">
                                <Ring value={security} sub="Segurança" accent={securityColor} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* STATS — 4 cards reais (likes recebidos, comments, reposts, engagement) */}
                <div className="lg:col-span-12 grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
                    <StatCard icon={Activity} value={fmtNumber(rich?.posts_count ?? 0)} label="Publicações" sub={`média ${fmtNumber(Math.round(rich?.avg_likes || 0))} gostos/post`} tint="bg-indigo-50 text-indigo-700" />
                    <StatCard icon={Heart} value={fmtNumber(rich?.likes_received ?? 0)} label="Gostos recebidos" tint="bg-rose-50 text-rose-700" />
                    <StatCard icon={MessageSquare} value={fmtNumber(rich?.comments_received ?? 0)} label="Comentários" sub={`${fmtNumber(rich?.reposts_received ?? 0)} repartilhas`} tint="bg-amber-50 text-amber-700" />
                    <StatCard icon={TrendingUp} value={`${(rich?.engagement_rate ?? 0).toFixed(2)}%`} label="Engagement" sub={`${user?.followers_count ?? 0} seguidores`} tint="bg-emerald-50 text-emerald-700" />
                </div>

                {/* SCORES — completude + segurança detalhada */}
                <div className="lg:col-span-7 card-lux p-5">
                    <div className="flex items-center justify-between mb-4 gap-3">
                        <div className="min-w-0">
                            <p className="type-overline mb-0">Saúde do perfil</p>
                            <h3 className="font-heading font-bold text-[17px] tracking-tight text-black mt-1">{completionLabel}</h3>
                            <p className="text-[12px] text-black/55 mt-1 leading-snug">
                                Quanto mais completo, mais visível e confiável és para a comunidade.
                            </p>
                        </div>
                        <Ring value={completion} size={68} />
                    </div>
                    <div className="w-full h-2 bg-black/[0.06] rounded-full overflow-hidden">
                        <div
                            className="h-full bg-black rounded-full transition-all duration-700"
                            style={{ width: `${completion}%` }}
                        />
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-4">
                        <Pill on={!!(user?.avatar || form?.avatar)} label="Avatar" />
                        <Pill on={!!(user?.banner || form?.banner)} label="Capa" />
                        <Pill on={!!(user?.bio || form?.bio)} label="Bio" />
                        <Pill on={!!(user?.city || form?.city)} label="Cidade" />
                        <Pill on={(rich?.posts_count || 0) >= 1} label="1+ post" />
                        <Pill on={(user?.following_count || 0) >= 3} label="A seguir 3+" />
                    </div>
                </div>

                <div className="lg:col-span-5 card-lux p-5">
                    <div className="flex items-center justify-between mb-4 gap-3">
                        <div className="min-w-0">
                            <p className="type-overline mb-0">Segurança</p>
                            <h3 className="font-heading font-bold text-[17px] tracking-tight text-black mt-1">{securityLabel}</h3>
                        </div>
                        <Ring value={security} size={68} accent={securityColor} />
                    </div>
                    <div className="w-full h-2 bg-black/[0.06] rounded-full overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${security}%`, background: securityColor }}
                        />
                    </div>
                    <div className="space-y-2 mt-4 text-[12px]">
                        <SecRow ok={!!user?.two_fa_enabled} label="2FA ativo" />
                        <SecRow ok={!!user?.recovery_email} label="Email de recuperação" />
                        <SecRow ok={user?.login_alerts_enabled !== false} label="Alertas de login" />
                        <SecRow ok={!!user?.password_changed_at} label="Palavra-passe atualizada" />
                    </div>
                    <button
                        onClick={() => setActiveTab("priv-seg")}
                        data-testid="hub-improve-security"
                        className="mt-4 inline-flex items-center gap-1 text-[12px] text-black/70 hover:text-black transition font-medium"
                    >
                        Reforçar segurança <ArrowRight size={12} />
                    </button>
                </div>

                {/* SUGESTÕES (real) — só aparece se há trabalho a fazer */}
                {suggestions.length > 0 && (
                    <div className="lg:col-span-7 card-lux p-5">
                        <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
                            <div className="flex items-center gap-2">
                                <Sparkles size={14} strokeWidth={1.8} className="text-black/55" />
                                <p className="type-overline mb-0">Próximos passos</p>
                            </div>
                            <StatusPill tone="warning">
                                {suggestions.length} {pluralPT(suggestions.length, "tarefa", "tarefas")}
                            </StatusPill>
                        </div>
                        <ul className="space-y-1">
                            {suggestions.slice(0, 6).map((s, i) => {
                                const Icon = s.icon || CheckCircle2;
                                return (
                                    <li key={i}>
                                        <button
                                            onClick={s.to}
                                            data-testid={`hub-suggestion-${i}`}
                                            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-black/[0.03] transition text-left group"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-black/[0.04] grid place-items-center shrink-0 text-black/65 group-hover:bg-black group-hover:text-white transition">
                                                <Icon size={14} strokeWidth={1.7} />
                                            </div>
                                            <span className="flex-1 text-[13px] text-black/80 group-hover:text-black transition">{s.label}</span>
                                            <ChevronRight size={14} className="text-black/30 group-hover:translate-x-0.5 group-hover:text-black/60 transition" />
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                )}

                {/* ACESSOS RÁPIDOS — sempre presente */}
                <div className={suggestions.length > 0 ? "lg:col-span-5" : "lg:col-span-12"}>
                    <div className="card-lux p-5 h-full">
                        <p className="type-overline mb-3.5">Acessos rápidos</p>
                        <div className="grid grid-cols-1 gap-2">
                            <ActionTile icon={Bell} title="Notificações" sub="Modos saudáveis, tipos, som & vibração" onClick={() => setActiveTab("notif")} dataTestid="hub-action-notif" tint="bg-amber-50 text-amber-700" />
                            <ActionTile icon={Lock} title="Privacidade & Segurança" sub="2FA, sessões, palavra-passe, alertas" onClick={() => setActiveTab("priv-seg")} dataTestid="hub-action-priv" tint="bg-indigo-50 text-indigo-700" />
                            <ActionTile icon={Database} title="Dados & Legal" sub="Exportar, apagar conta, RGPD" onClick={() => setActiveTab("dados-legal")} dataTestid="hub-action-dados" tint="bg-emerald-50 text-emerald-700" />
                            <ActionTile icon={FileText} title="Editar perfil" sub="Nome, bio, capa, cidade, aparência" onClick={() => setActiveTab("perfil")} dataTestid="hub-action-perfil" tint="bg-rose-50 text-rose-700" />
                        </div>
                    </div>
                </div>

                {/* ACTIVITY ROW — só com dados reais */}
                <div className="lg:col-span-12 grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <MicroStat icon={Calendar} label="Membro há" value={`${days} ${pluralPT(days, "dia", "dias")}`} />
                    <MicroStat icon={Repeat2} label="Repartilhas" value={fmtNumber(rich?.reposts_received ?? 0)} />
                    <MicroStat icon={UserCircle2} label="Seguidores" value={fmtNumber(user?.followers_count ?? 0)} />
                    <MicroStat icon={UserCircle2} label="A seguir" value={fmtNumber(user?.following_count ?? 0)} />
                </div>
            </div>
        </div>
    );
}

function Pill({ on, label }) {
    return (
        <span className={`inline-flex items-center gap-1 text-[10.5px] font-mono tracking-wider uppercase px-2 py-0.5 rounded-full border ${
            on ? "bg-emerald-50 text-emerald-800 border-emerald-200" : "bg-black/[0.03] text-black/45 border-black/[0.08]"
        }`}>
            {on ? <CheckCircle2 size={9} /> : <span className="w-1.5 h-1.5 rounded-full bg-black/30" />}
            {label}
        </span>
    );
}

function SecRow({ ok, label }) {
    return (
        <div className="flex items-center gap-2 text-[12px]">
            <span className={`w-4 h-4 rounded-full grid place-items-center shrink-0 ${ok ? "bg-emerald-100 text-emerald-700" : "bg-black/[0.06] text-black/40"}`}>
                {ok ? <CheckCircle2 size={10} strokeWidth={2.2} /> : <span className="w-1.5 h-1.5 rounded-full bg-current" />}
            </span>
            <span className={ok ? "text-black/75" : "text-black/55"}>{label}</span>
        </div>
    );
}

function MicroStat({ icon: Icon, label, value }) {
    return (
        <div className="flex items-center gap-3 p-3 rounded-2xl border border-black/[0.06] bg-white/60 hover:bg-white transition">
            <div className="w-8 h-8 rounded-lg bg-black/[0.04] grid place-items-center text-black/65 shrink-0">
                <Icon size={14} strokeWidth={1.8} />
            </div>
            <div className="min-w-0">
                <div className="font-display text-[15.5px] font-bold tabular-nums text-black leading-none">{value}</div>
                <div className="text-[10px] font-mono tracking-wider uppercase text-black/45 mt-1 truncate">{label}</div>
            </div>
        </div>
    );
}
