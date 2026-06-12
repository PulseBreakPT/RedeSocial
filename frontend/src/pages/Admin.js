/**
 * Admin Panel — Lusorae
 * --------------------------------------------------------------
 * DESIGN SYSTEM: LUSORAE EDITORIAL — ver /src/theme/EDITORIAL.md
 *
 * A real, non-mocked control center for moderators/operators.
 * Every action calls a /api/admin/* endpoint and shows the
 * authoritative server response. No localStorage shenanigans,
 * no hardcoded lists.
 *
 * Tabs:
 *   - Overview      (KPIs + 14d sparklines)
 *   - Users         (search, filter, verify/admin/ban/force-logout/delete)
 *   - Posts         (search, filter, delete, feature)
 *   - Reports       (open/closed, resolve / dismiss / remove)
 *   - Communities   (search, delete)
 *   - Events        (search, delete)
 *   - Sessions      (revoke individual)
 *   - Audit log     (filterable history of admin actions)
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate, useOutletContext } from "react-router-dom";
import { toast } from "sonner";
import {
    Shield, Users as UsersIcon, FileText, AlertTriangle, Layers, CalendarDays,
    Activity, History, Search, ShieldCheck, Ban, LogOut, Trash2, Star,
    UserCheck, RefreshCcw, ChevronLeft, ChevronRight, Loader2, UserX,
    MessageSquare, Sparkles, Hash, Megaphone, X as XIcon, Download,
    Check, EyeOff, Eye, Heart, Image as ImageIcon, Video, AlertCircle,
    Server, Database, Cpu, Bug, FileCode, Clock, Zap, Gauge, Wifi,
    VolumeX, Ghost, Pause, Award, ShieldOff, KeyRound, Flag, ShieldAlert,
    Users2, Smartphone, Globe, Bell, ClipboardList, Inbox, Heart as HeartIcon,
    Snowflake, Power, TrendingDown, Wrench, Eraser, Lock, MessageCircle,
    Menu, PanelLeftClose, PanelLeftOpen, Settings2, ToggleLeft, ToggleRight,
    RotateCcw, Info,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { Avatar } from "../components/Avatar";
import { confirmDialog } from "../components/ConfirmDialog";
import SecurityTab from "./admin/SecurityTab";
import { Cockpit } from "./admin/Cockpit";

// -----------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------
const fmtNum = (n) => {
    const v = Number(n) || 0;
    if (v < 1000) return String(v);
    if (v < 1_000_000) return (v / 1000).toFixed(v < 10_000 ? 1 : 0) + "K";
    return (v / 1_000_000).toFixed(1) + "M";
};
const fmtDate = (iso) => {
    if (!iso) return "—";
    try {
        const d = new Date(iso);
        return d.toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "short" });
    } catch { return iso; }
};
const fmtRelative = (iso) => {
    if (!iso) return "—";
    try {
        const d = new Date(iso).getTime();
        const diff = Math.floor((Date.now() - d) / 1000);
        if (diff < 60) return `há ${diff}s`;
        if (diff < 3600) return `há ${Math.floor(diff / 60)}m`;
        if (diff < 86400) return `há ${Math.floor(diff / 3600)}h`;
        return `há ${Math.floor(diff / 86400)}d`;
    } catch { return iso; }
};

const apiError = (e) => {
    const msg = e?.response?.data?.detail || e?.message || "Erro";
    toast.error(typeof msg === "string" ? msg : "Erro inesperado");
};

// -----------------------------------------------------------------
// Hint / InfoTip / PageHeader — descrições e dicas (UI premium tooltips)
// -----------------------------------------------------------------
/**
 * <Hint text="..." side="top|bottom|left|right">{trigger}</Hint>
 * Tooltip CSS-only. `text` pode ser string OU { title, body, kbd } para
 * tooltip rico (título + corpo + atalho).
 * `focusable={false}` desactiva tabIndex quando o filho é já focável (button, link).
 */
function Hint({ text, side = "top", children, className = "", as: As = "span", focusable = true }) {
    if (text == null || text === "") return children || null;
    const rich = typeof text === "object";
    return (
        <As className={`ops-hint-wrap ${className}`} tabIndex={focusable ? 0 : -1} aria-label={rich ? text.title || text.body : text}>
            {children}
            <span className={`ops-hint ops-hint--${side}`} role="tooltip">
                {rich ? (
                    <>
                        {text.title && <span className="ops-hint__title">{text.title}</span>}
                        {text.body && <span className="ops-hint__body">{text.body}</span>}
                        {text.kbd && <span className="ops-hint__kbd">{text.kbd}</span>}
                    </>
                ) : text}
            </span>
        </As>
    );
}

/** Pequeno (i) com tooltip — para colocar ao lado de KPIs/labels */
function InfoTip({ text, side = "top", className = "" }) {
    if (text == null || text === "") return null;
    return (
        <Hint text={text} side={side} className={className}>
            <Info className="ops-hint-icon" aria-hidden />
        </Hint>
    );
}

/**
 * Cabeçalho uniforme para cada tab.
 * <PageHeader title="Sistema" subtitle="Estado da infra..." right={<buttons />} />
 */
function PageHeader({ title, subtitle, right, icon: Icon }) {
    return (
        <div className="ops-page-header">
            <div className="min-w-0 flex-1">
                <h2 className="ops-page-header__title font-display flex items-center gap-2">
                    {Icon && <Icon size={18} className="text-slate-400 shrink-0" aria-hidden />}
                    <span className="truncate">{title}</span>
                </h2>
                {subtitle && <p className="ops-subtitle">{subtitle}</p>}
            </div>
            {right && <div className="flex items-center gap-1.5 flex-wrap shrink-0">{right}</div>}
        </div>
    );
}



// -----------------------------------------------------------------
// Tab nav
// -----------------------------------------------------------------
// -----------------------------------------------------------------
// NAV GROUPS — categorias ordenadas por importância (top → bottom)
// -----------------------------------------------------------------
const NAV_GROUPS = [
    {
        label: "Cockpit",
        items: [
            { key: "overview",   label: "Visão geral", icon: Activity },
        ],
    },
    {
        label: "Confiança & Segurança",
        items: [
            { key: "security",   label: "Segurança",   icon: ShieldCheck },
            { key: "reports",    label: "Reports",     icon: AlertTriangle, badge: "reports" },
            { key: "antispam",   label: "Anti-spam",   icon: ShieldAlert },
        ],
    },
    {
        label: "Pessoas",
        items: [
            { key: "users",      label: "Utilizadores", icon: UsersIcon },
            { key: "sessions",   label: "Sessões",      icon: LogOut },
        ],
    },
    {
        label: "Conteúdo",
        items: [
            { key: "posts",      label: "Publicações", icon: FileText },
            { key: "comments",   label: "Comentários", icon: MessageSquare },
            { key: "stories",    label: "Stories",     icon: Sparkles },
            { key: "hashtags",   label: "Hashtags",    icon: Hash },
        ],
    },
    {
        label: "Plataforma",
        items: [
            { key: "communities", label: "Comunidades", icon: Layers },
            { key: "events",      label: "Eventos",     icon: CalendarDays },
            { key: "broadcast",   label: "Broadcast",   icon: Megaphone },
        ],
    },
    {
        label: "Sistema",
        items: [
            { key: "settings",   label: "Definições", icon: Settings2 },
            { key: "system",     label: "Sistema",   icon: Server },
            { key: "audit",      label: "Auditoria", icon: History },
        ],
    },
];

// Flat lookup helpers
const ALL_NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items);
const NAV_KEY_TO_ITEM = ALL_NAV_ITEMS.reduce((acc, it) => { acc[it.key] = it; return acc; }, {});

// -----------------------------------------------------------------
// Sparkline (inline SVG, no libs)
// -----------------------------------------------------------------
function Sparkline({ data, height = 36, color = "#94a3b8" }) {
    if (!Array.isArray(data) || data.length === 0) return null;
    const values = data.map((d) => Number(d.value) || 0);
    const max = Math.max(1, ...values);
    const w = 100;
    const h = 100;
    const stepX = w / Math.max(1, values.length - 1);
    const points = values.map((v, i) => `${(i * stepX).toFixed(2)},${(h - (v / max) * h).toFixed(2)}`).join(" ");
    return (
        <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: "100%", height }} aria-hidden>
            <polyline fill="none" stroke={color} strokeWidth="2" points={points} vectorEffect="non-scaling-stroke" />
        </svg>
    );
}

function StatCard({ label, value, sub, accent = "var(--ops-slate-400)", series, hint, "data-testid": testId }) {
    return (
        <div className="ops-panel p-4 flex flex-col gap-1.5 shadow-sm" data-testid={testId}>
            <div className="text-[11px] uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1">
                <span className="truncate">{label}</span>
                {hint && <InfoTip text={hint} side="top" />}
            </div>
            <div className="font-display text-[28px] leading-none tracking-tight text-slate-900 tabular-nums">{fmtNum(value)}</div>
            {sub != null && <div className="text-[12px] text-slate-500">{sub}</div>}
            {series && <Sparkline data={series} color={accent} />}
        </div>
    );
}

// -----------------------------------------------------------------
// OVERVIEW
// -----------------------------------------------------------------
function OverviewTab({ onNavigate }) {
    const [stats, setStats] = useState(null);
    const [health, setHealth] = useState(null);
    const [loading, setLoading] = useState(true);
    const [reloadAt, setReloadAt] = useState(Date.now());
    const [autoRefresh, setAutoRefresh] = useState(0); // 0=off | seconds

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const [statsRes, healthRes] = await Promise.all([
                api.get("/admin/stats"),
                api.get("/admin/health"),
            ]);
            setStats(statsRes.data);
            setHealth(healthRes.data);
        } catch (e) { apiError(e); }
        finally { setLoading(false); }
    }, []);
    useEffect(() => { load(); }, [load, reloadAt]);

    // Auto refresh interval
    useEffect(() => {
        if (!autoRefresh) return;
        const t = setInterval(() => setReloadAt(Date.now()), autoRefresh * 1000);
        return () => clearInterval(t);
    }, [autoRefresh]);

    const downloadCsv = async (endpoint, filename) => {
        try {
            const res = await api.get(endpoint, { responseType: "blob" });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement("a");
            a.href = url; a.download = filename;
            document.body.appendChild(a); a.click(); a.remove();
            window.URL.revokeObjectURL(url);
            toast.success(`Exportado: ${filename}`);
        } catch (e) { apiError(e); }
    };

    if (loading && !stats) {
        return <div className="flex items-center justify-center py-16 text-slate-400"><Loader2 className="animate-spin" /></div>;
    }
    if (!stats) return null;

    return (
        <div className="space-y-4 sm:space-y-5" data-testid="admin-overview">
            <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="min-w-0 flex-1">
                    <p className="ops-subtitle">Vista em tempo real do estado da plataforma — KPIs principais, saúde do sistema e atalhos para áreas críticas.</p>
                </div>
                <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
                    <Hint focusable={false} side="bottom" text={{ title: "Auto-atualização", body: "Recarrega KPIs, system health e atalhos a cada N segundos. 'Off' desliga o polling — manténs visível só o snapshot inicial." }}>
                        <div className="flex items-center gap-0.5 sm:gap-1 bg-slate-50 rounded-full p-1">
                            {[{v:0,l:"Pausa"},{v:15,l:"15s"},{v:30,l:"30s"},{v:60,l:"60s"}].map((o) => (
                                <button key={o.v}
                                    onClick={() => setAutoRefresh(o.v)}
                                    data-testid={`admin-overview-autorefresh-${o.v}`}
                                    className={`h-7 px-2 sm:px-2.5 rounded-full text-[11px] sm:text-[11.5px] font-medium ${autoRefresh === o.v ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"}`}
                                >{o.l}</button>
                            ))}
                        </div>
                    </Hint>
                    <button
                        onClick={() => downloadCsv("/admin/export/users.csv", "lusorae_users.csv")}
                        data-testid="admin-export-users-csv"
                        className="h-9 px-2.5 sm:px-3 rounded-full bg-slate-100 hover:bg-slate-800/[0.1] inline-flex items-center gap-1.5 text-[12px] sm:text-[13px]"
                        title="Exportar utilizadores em CSV"
                        aria-label="Exportar utilizadores em CSV"
                    >
                        <Download size={14} /> <span className="hidden xs:inline">Utilizadores CSV</span>
                    </button>
                    <button
                        onClick={() => setReloadAt(Date.now())}
                        data-testid="admin-overview-refresh"
                        className="h-9 px-2.5 sm:px-3 rounded-full bg-slate-100 hover:bg-slate-800/[0.1] inline-flex items-center gap-1.5 text-[12px] sm:text-[13px]"
                        title="Atualizar agora"
                        aria-label="Atualizar agora"
                    >
                        <RefreshCcw size={14} className={loading ? "animate-spin" : ""} /> <span className="hidden xs:inline">Atualizar</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                <StatCard data-testid="kpi-users-total" label="Utilizadores" value={stats.users.total} sub={`${stats.users.online} online agora`} series={stats.series.signups_14d} accent="var(--ops-info-500)" hint={{ title: "Utilizadores totais", body: "Contagem total de contas registadas. O contador 'online agora' usa sessões WebSocket activas no último minuto." }} />
                <StatCard data-testid="kpi-signups-7d" label="Registos (7d)" value={stats.users.signups_7d} sub={`${stats.users.signups_30d} em 30d`} accent="var(--ops-slate-400)" hint="Novos registos de conta nos últimos 7 dias. Útil para detectar picos de aquisição ou tentativas de spam em massa." />
                <StatCard data-testid="kpi-verified" label="Verificados" value={stats.users.verified} sub={`${stats.users.admins} admin(s)`} accent="var(--ops-success-500)" hint="Contas com verificação manual (badge azul). Inclui administradores." />
                <StatCard data-testid="kpi-banned" label="Banidos" value={stats.users.banned} sub="Acesso bloqueado" accent="var(--ops-danger-500)" hint={{ title: "Banimentos activos", body: "Contas com acesso total revogado. Não conseguem fazer login, publicar nem comentar. Reversível em Utilizadores ▸ Desbanir." }} />

                <StatCard data-testid="kpi-posts-total" label="Publicações" value={stats.content.posts_total} sub={`+${stats.content.posts_24h} em 24h`} series={stats.series.posts_14d} accent="var(--ops-slate-400)" hint="Total de publicações públicas. O sub-valor mostra a variação nas últimas 24h." />
                <StatCard data-testid="kpi-posts-7d" label="Posts (7d)" value={stats.content.posts_7d} sub={`${stats.content.drafts} rascunhos · ${stats.content.featured} destaques`} accent="var(--ops-slate-400)" hint="Posts criados nos últimos 7 dias. Rascunhos são guardados localmente; destaques aparecem no topo do feed." />
                <StatCard data-testid="kpi-comments" label="Comentários" value={stats.content.comments_total} accent="var(--ops-slate-400)" hint="Total de comentários em todas as publicações." />
                <StatCard data-testid="kpi-messages" label="DMs" value={stats.content.messages_total} sub={`${stats.content.stories_active} stories ativas`} accent="var(--ops-slate-400)" hint="Mensagens directas trocadas. Stories activas expiram automaticamente após 24h." />

                <StatCard data-testid="kpi-reports-open" label="Reports abertos" value={stats.moderation.reports_open} sub={`${stats.moderation.reports_total} no total`} accent="var(--ops-warn-500)" hint={{ title: "Reports por resolver", body: "Reports submetidos por utilizadores e ainda não decididos. Vai ao separador Reports para os processar." }} />
                <StatCard data-testid="kpi-communities" label="Comunidades" value={stats.content.communities} accent="var(--ops-slate-400)" hint="Comunidades temáticas existentes." />
                <StatCard data-testid="kpi-events" label="Eventos" value={stats.content.events} accent="var(--ops-slate-400)" hint="Eventos publicados pela comunidade (futuros e passados)." />
                <StatCard data-testid="kpi-sessions" label="Sessões activas" value={stats.sessions.active} accent="var(--ops-realtime-500)" hint={{ title: "Sessões em uso", body: "Sessões com token válido. Não é o mesmo que utilizadores online — uma pessoa pode ter várias sessões (web, mobile, etc.)." }} />
            </div>

            {/* SYSTEM HEALTH */}
            {health && (
                <div className="bg-white rounded-2xl border border-slate-200 p-4" data-testid="admin-system-health">
                    <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                        <h3 className="font-display text-[16px] tracking-tight flex items-center gap-1.5">
                            <Activity size={14} className="text-slate-500" /> Saúde do sistema
                            <InfoTip text={{ title: "Telemetria operacional", body: "Indicadores em tempo real do backend: conexões realtime, hashtags bloqueadas e contagens por coleção. Para detalhes completos vai ao separador Sistema." }} side="right" />
                        </h3>
                        <div className="text-[11px] font-mono text-slate-400">
                            verificado a {fmtDate(health.checked_at)}
                        </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                        <div className="ops-tile ops-tile--realtime">
                            <div className="ops-tile__label inline-flex items-center gap-1.5">
                                <span className="ops-pulse-dot" aria-hidden /> WS conexões
                                <InfoTip text={{ title: "Conexões WebSocket activas", body: "Sockets abertos para realtime (feed, notificações, mensagens). 'users' é o número distinto de pessoas; cada uma pode ter vários sockets (várias abas/dispositivos)." }} side="top" />
                            </div>
                            <div className="ops-tile__value">
                                {health.websocket.sockets} <span className="text-[12px] font-normal opacity-60">/ {health.websocket.users_connected} users</span>
                            </div>
                        </div>
                        <div className="ops-tile ops-tile--warn">
                            <div className="ops-tile__label inline-flex items-center gap-1.5">
                                Hashtags blacklist
                                <InfoTip text="Hashtags bloqueadas que deixaram de aparecer no trending e no explore. Geríveis no separador Hashtags." side="top" />
                            </div>
                            <div className="ops-tile__value">{health.hashtag_blacklist_size}</div>
                        </div>
                        {Object.entries(health.collections).slice(0, 14).map(([name, count]) => (
                            <div key={name} className="ops-tile">
                                <div className="ops-tile__label">{name}</div>
                                <div className="ops-tile__value font-mono">{fmtNum(count)}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="text-[11px] font-mono text-slate-400">
                Gerado a {fmtDate(stats.generated_at)}
                {autoRefresh > 0 && <> · auto-refresh a cada {autoRefresh}s</>}
            </div>

            {/* QUICK-LINKS — Dashboard shortcuts */}
            {typeof onNavigate === "function" && (
                <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4" data-testid="admin-overview-shortcuts">
                    <div className="text-[10.5px] uppercase tracking-wider text-slate-400 font-mono mb-2 inline-flex items-center gap-1.5">
                        Atalhos rápidos
                        <InfoTip text="Saltos directos para as áreas mais consultadas em operações do dia-a-dia." side="top" />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                        <Hint focusable={false} side="top" text="Histórico imutável de acções administrativas">
                            <button onClick={() => onNavigate("audit")} data-testid="admin-overview-go-audit"
                                className="h-9 px-3 rounded-full bg-slate-100 hover:bg-slate-800/[0.1] text-[12.5px] inline-flex items-center gap-1.5">
                                <History size={13} /> Ver atividade
                            </button>
                        </Hint>
                        <Hint focusable={false} side="top" text="Reports abertos submetidos por utilizadores">
                            <button onClick={() => onNavigate("reports")} data-testid="admin-overview-go-reports"
                                className="h-9 px-3 rounded-full bg-slate-100 hover:bg-slate-800/[0.1] text-[12.5px] inline-flex items-center gap-1.5">
                                <AlertTriangle size={13} /> Ver reports
                            </button>
                        </Hint>
                        <Hint focusable={false} side="top" text="Filtros automáticos, rate limits e padrões suspeitos">
                            <button onClick={() => onNavigate("antispam")} data-testid="admin-overview-go-antispam"
                                className="h-9 px-3 rounded-full bg-slate-100 hover:bg-slate-800/[0.1] text-[12.5px] inline-flex items-center gap-1.5">
                                <ShieldAlert size={13} /> Anti-spam
                            </button>
                        </Hint>
                        <Hint focusable={false} side="top" text="Estado da infra, telemetria e acções operacionais">
                            <button onClick={() => onNavigate("system")} data-testid="admin-overview-go-system"
                                className="h-9 px-3 rounded-full bg-slate-100 hover:bg-slate-800/[0.1] text-[12.5px] inline-flex items-center gap-1.5">
                                <Server size={13} /> Ver sistema
                            </button>
                        </Hint>
                        <Hint focusable={false} side="top" text="Sessões activas com possibilidade de revogar">
                            <button onClick={() => onNavigate("sessions")} data-testid="admin-overview-go-sessions"
                                className="h-9 px-3 rounded-full bg-slate-100 hover:bg-slate-800/[0.1] text-[12.5px] inline-flex items-center gap-1.5">
                                <LogOut size={13} /> Ver sessões
                            </button>
                        </Hint>
                    </div>
                </div>
            )}
        </div>
    );
}

// -----------------------------------------------------------------
// Reusable pager
// -----------------------------------------------------------------
function Pager({ page, total, limit, onChange }) {
    const last = Math.max(1, Math.ceil((total || 0) / (limit || 1)));
    if (last <= 1) return null;
    return (
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-200 gap-2">
            <div className="text-[11px] sm:text-[12px] text-slate-500 font-mono min-w-0 truncate">
                <span className="hidden xs:inline sm:inline">Página </span>{page}<span className="hidden sm:inline"> de </span><span className="sm:hidden">/</span>{last} · {total}<span className="hidden sm:inline"> no total</span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
                <button
                    onClick={() => onChange(Math.max(1, page - 1))}
                    disabled={page <= 1}
                    className="w-9 h-9 grid place-items-center rounded-full hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label="Página anterior"
                >
                    <ChevronLeft size={16} />
                </button>
                <button
                    onClick={() => onChange(Math.min(last, page + 1))}
                    disabled={page >= last}
                    className="w-9 h-9 grid place-items-center rounded-full hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label="Página seguinte"
                >
                    <ChevronRight size={16} />
                </button>
            </div>
        </div>
    );
}

// -----------------------------------------------------------------
// USERS
// -----------------------------------------------------------------
const USER_FILTERS = [
    { key: "all", label: "Todos", hint: "Todas as contas registadas, sem filtro de estado." },
    { key: "verified", label: "Verificados", hint: "Contas com badge de verificação manual atribuída por um admin." },
    { key: "admins", label: "Admins", hint: "Contas com privilégios de administração — fazem bypass aos limites e definições." },
    { key: "banned", label: "Banidos", hint: "Contas com acesso revogado. Não fazem login nem publicam. Reversível em Desbanir." },
];

// -----------------------------------------------------------------
// SYSTEM TAB — backend / DB / WS / load / errors / logs / latency / uptime
// -----------------------------------------------------------------
const fmtBytes = (n) => {
    n = Number(n) || 0;
    if (n < 1024) return `${n} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
    return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`;
};
const fmtKbToBytes = (kb) => fmtBytes((Number(kb) || 0) * 1024);
const fmtUptime = (sec) => {
    sec = Number(sec) || 0;
    const d = Math.floor(sec / 86400);
    const h = Math.floor((sec % 86400) / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
};

function SystemPanel({ title, icon: Icon, accent = "text-slate-500", testid, children, onRefresh, loading, hint }) {
    return (
        <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4" data-testid={testid}>
            <div className="flex items-center justify-between gap-2 mb-3">
                <h3 className="font-display text-[14px] sm:text-[16px] tracking-tight inline-flex items-center gap-1.5">
                    <Icon size={14} className={accent} /> {title}
                    {hint && <InfoTip text={hint} side="right" />}
                </h3>
                {onRefresh && (
                    <button
                        onClick={onRefresh}
                        aria-label={`Atualizar ${title}`}
                        className="w-8 h-8 grid place-items-center rounded-full hover:bg-slate-100 text-slate-500"
                        title="Atualizar"
                    ><RefreshCcw size={13} className={loading ? "animate-spin" : ""} /></button>
                )}
            </div>
            {children}
        </div>
    );
}

function KV({ k, v, mono = false, color = "text-slate-800", hint }) {
    return (
        <div className="flex flex-col xs:flex-row xs:items-baseline gap-0.5 xs:gap-2 py-1.5 border-b border-slate-100 last:border-0">
            <div className="xs:w-36 shrink-0 text-[10.5px] uppercase tracking-wider text-slate-400 font-mono inline-flex items-center gap-1">
                <span className="truncate">{k}</span>
                {hint && <InfoTip text={hint} side="top" />}
            </div>
            <div className={`flex-1 break-all text-[12.5px] ${color} ${mono ? "font-mono" : ""}`}>{v == null || v === "" ? "—" : v}</div>
        </div>
    );
}

function LogTail({ lines, empty = "Sem entradas." }) {
    if (!Array.isArray(lines) || lines.length === 0) {
        return <div className="text-[12px] text-slate-400 italic">{empty}</div>;
    }
    return (
        <pre className="bg-black/90 text-white/85 rounded-xl p-2 sm:p-3 text-[10.5px] sm:text-[11px] leading-relaxed font-mono overflow-auto max-h-[280px] whitespace-pre-wrap break-all">
            {lines.join("\n")}
        </pre>
    );
}

function SystemTab() {
    const [status, setStatus] = useState(null);
    const [ws, setWs] = useState(null);
    const [database, setDatabase] = useState(null);
    const [load, setLoad] = useState(null);
    const [latency, setLatency] = useState(null);
    const [uptime, setUptime] = useState(null);
    const [errLog, setErrLog] = useState(null);
    const [outLog, setOutLog] = useState(null);
    const [maint, setMaint] = useState(null);
    const [loading, setLoading] = useState({});
    const [actionBusy, setActionBusy] = useState(null);

    const _load = useCallback(async (key, url, setter) => {
        setLoading((s) => ({ ...s, [key]: true }));
        try {
            const { data } = await api.get(url);
            setter(data);
        } catch (e) { apiError(e); }
        finally { setLoading((s) => ({ ...s, [key]: false })); }
    }, []);

    const loadAll = useCallback(async () => {
        await Promise.all([
            _load("status", "/admin/system/status", setStatus),
            _load("ws", "/admin/system/websocket", setWs),
            _load("database", "/admin/system/database", setDatabase),
            _load("load", "/admin/system/load", setLoad),
            _load("latency", "/admin/system/latency", setLatency),
            _load("uptime", "/admin/system/uptime", setUptime),
            _load("errLog", "/admin/system/errors?lines=120", setErrLog),
            _load("outLog", "/admin/system/logs?lines=120", setOutLog),
            _load("maint", "/admin/system/maintenance", setMaint),
        ]);
    }, [_load]);

    useEffect(() => { loadAll(); }, [loadAll]);

    const restartSockets = async () => {
        const ok = await confirmDialog({
            title: "Reiniciar todos os sockets?",
            body: "Todas as conexões WebSocket serão terminadas. Os clientes irão reconectar automaticamente em alguns segundos.",
            confirmLabel: "Reiniciar sockets",
            danger: true,
        });
        if (!ok) return;
        setActionBusy("restart");
        try {
            const { data } = await api.post("/admin/system/restart-sockets");
            toast.success(`${data.closed} socket(s) fechados`);
            _load("ws", "/admin/system/websocket", setWs);
        } catch (e) { apiError(e); }
        finally { setActionBusy(null); }
    };

    const clearCache = async () => {
        const ok = await confirmDialog({
            title: "Limpar caches em memória?",
            body: "Os caches in-memory (maintenance, presenca de viewers, lru_cache) serão limpos. As consultas seguintes serão um pouco mais lentas até reaquecer.",
            confirmLabel: "Limpar cache",
        });
        if (!ok) return;
        setActionBusy("clear");
        try {
            const { data } = await api.post("/admin/system/clear-cache");
            toast.success(`Cache limpo (${Object.keys(data.cleared || {}).length} grupos)`);
        } catch (e) { apiError(e); }
        finally { setActionBusy(null); }
    };

    const toggleMaintenance = async () => {
        const enabling = !(maint && maint.enabled);
        let message = maint?.message || "";
        if (enabling) {
            const r = window.prompt("Mensagem para os utilizadores (opcional):", message || "Plataforma em manutenção. Volta em breve.");
            if (r === null) return;
            message = r;
        }
        const ok = await confirmDialog({
            title: enabling ? "Ativar modo manutenção?" : "Desativar modo manutenção?",
            body: enabling
                ? "Todos os utilizadores não-admin ficarão impedidos de publicar, comentar, gostar, seguir ou enviar mensagens. Ações de leitura continuam disponíveis."
                : "Os utilizadores voltam a poder usar a plataforma normalmente.",
            confirmLabel: enabling ? "Ativar manutenção" : "Desativar manutenção",
            danger: enabling,
        });
        if (!ok) return;
        setActionBusy("maint");
        try {
            const { data } = await api.post("/admin/system/maintenance", { enabled: enabling, message });
            setMaint({ ...maint, enabled: data.enabled, message: data.message });
            toast.success(data.enabled ? "Manutenção ATIVA" : "Manutenção desativada");
        } catch (e) { apiError(e); }
        finally { setActionBusy(null); }
    };

    return (
        <div className="space-y-4" data-testid="admin-system">
            <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="min-w-0 flex-1">
                    <p className="ops-subtitle">Estado da infraestrutura: backend, WebSocket, base de dados, latência, carga e logs. Acções operacionais críticas vivem aqui.</p>
                </div>
                <button
                    onClick={loadAll}
                    data-testid="admin-system-refresh-all"
                    className="h-9 px-3 rounded-full bg-slate-900 text-white text-[12.5px] font-medium inline-flex items-center gap-1.5 hover:bg-slate-800/85"
                ><RefreshCcw size={13} /> Atualizar tudo</button>
            </div>

            {/* MAINTENANCE banner if active */}
            {maint?.enabled && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-2xl px-4 py-3 text-[13px] text-red-800 flex items-start gap-2"
                    data-testid="admin-system-maint-banner">
                    <AlertCircle size={15} className="mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                        <strong>Modo de manutenção ATIVO</strong> — utilizadores não-admin não podem fazer escritas.
                        {maint.message && <div className="mt-1 text-[12.5px] italic">"{maint.message}"</div>}
                        {maint.set_at && <div className="mt-0.5 text-[11px] font-mono text-red-700/70">desde {fmtRelative(maint.set_at)}</div>}
                    </div>
                </div>
            )}

            {/* QUICK ACTIONS */}
            <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4" data-testid="admin-system-actions">
                <div className="text-[10.5px] uppercase tracking-wider text-slate-400 font-mono mb-2 inline-flex items-center gap-1.5">
                    Acções de sistema
                    <InfoTip text="Operações críticas que afectam toda a plataforma. Cada uma pede confirmação e fica registada no audit log." side="top" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Hint side="top" focusable={false} text={{ title: "Reiniciar sockets WebSocket", body: "Fecha todas as conexões realtime. Os clientes reconectam automaticamente em poucos segundos. Útil quando há sockets pendurados ou após deploy." }}>
                        <button onClick={restartSockets} disabled={actionBusy === "restart"}
                            data-testid="admin-system-restart-sockets"
                            className="w-full h-10 px-3 rounded-2xl bg-red-50 hover:bg-red-100 text-red-700 text-[12.5px] font-medium inline-flex items-center justify-center gap-1.5 disabled:opacity-40">
                            {actionBusy === "restart" ? <Loader2 size={14} className="animate-spin" /> : <Power size={14} />}
                            Reiniciar sockets
                        </button>
                    </Hint>
                    <Hint side="top" focusable={false} text={{ title: "Limpar caches em memória", body: "Limpa caches in-memory (maintenance flag, presença de viewers, lru_cache). As primeiras consultas seguintes serão mais lentas até reaquecer." }}>
                        <button onClick={clearCache} disabled={actionBusy === "clear"}
                            data-testid="admin-system-clear-cache"
                            className="w-full h-10 px-3 rounded-2xl bg-slate-100 hover:bg-slate-800/[0.1] text-slate-700 text-[12.5px] font-medium inline-flex items-center justify-center gap-1.5 disabled:opacity-40">
                            {actionBusy === "clear" ? <Loader2 size={14} className="animate-spin" /> : <Eraser size={14} />}
                            Limpar cache
                        </button>
                    </Hint>
                    <Hint side="top" focusable={false} text={{ title: maint?.enabled ? "Desactivar manutenção" : "Activar modo manutenção", body: maint?.enabled ? "Volta a permitir escritas a todos os utilizadores." : "Impede utilizadores não-admin de publicar, comentar, gostar, seguir ou enviar mensagens. Acções de leitura continuam disponíveis." }}>
                        <button onClick={toggleMaintenance} disabled={actionBusy === "maint"}
                            data-testid="admin-system-maintenance"
                            className={`w-full h-10 px-3 rounded-2xl text-[12.5px] font-medium inline-flex items-center justify-center gap-1.5 disabled:opacity-40 ${
                                maint?.enabled
                                    ? "bg-slate-100 hover:bg-slate-200 text-slate-800"
                                    : "bg-red-500/10 hover:bg-red-500/20 text-red-700"
                            }`}>
                            {actionBusy === "maint" ? <Loader2 size={14} className="animate-spin" /> : <Wrench size={14} />}
                            {maint?.enabled ? "Desativar manutenção" : "Ativar manutenção"}
                        </button>
                    </Hint>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* STATUS */}
                <SystemPanel
                    title="Estado do backend"
                    icon={Server}
                    accent="text-slate-500"
                    testid="sys-status"
                    loading={loading.status}
                    onRefresh={() => _load("status", "/admin/system/status", setStatus)}
                    hint={{ title: "Estado do processo backend", body: "Identificação do servidor: serviço, hostname, PID, versão de Python e plataforma. Útil para confirmar em que máquina/processo estás a operar." }}
                >
                    {status ? (
                        <dl>
                            <KV k="Serviço" v={status.service} mono />
                            <KV k="Hostname" v={status.hostname} mono />
                            <KV k="PID" v={status.pid} mono />
                            <KV k="Python" v={status.python} mono />
                            <KV k="Plataforma" v={status.platform} mono />
                            <KV k="DB name" v={status.env?.db_name} mono hint="Nome da base de dados Mongo activa." />
                            <KV k="JWT secret" v={status.env?.has_jwt_secret ? "configurado" : "EM FALTA"} color={status.env?.has_jwt_secret ? "text-slate-700" : "text-red-600"} hint={status.env?.has_jwt_secret ? "Chave de assinatura de tokens JWT está configurada." : "JWT secret em falta — autenticação não funcionará. Configura a variável de ambiente JWT_SECRET."} />
                            <KV k="Verificado" v={fmtRelative(status.checked_at)} />
                        </dl>
                    ) : <div className="text-[12px] text-slate-400">A carregar…</div>}
                </SystemPanel>

                {/* UPTIME */}
                <SystemPanel
                    title="Tempo ativo"
                    icon={Clock}
                    accent="text-blue-600"
                    testid="sys-uptime"
                    loading={loading.uptime}
                    onRefresh={() => _load("uptime", "/admin/system/uptime", setUptime)}
                    hint={{ title: "Tempo ativo", body: "Tempo desde que o processo backend arrancou e há quanto a máquina-host está ligada. Picos seguidos de reboots curtos indicam crashes." }}
                >
                    {uptime ? (
                        <dl>
                            <KV k="Processo" v={fmtUptime(uptime.process?.uptime_seconds)} mono hint="Tempo desde o último arranque do servidor FastAPI." />
                            <KV k="Arrancou" v={fmtDate(uptime.process?.started_at)} mono />
                            <KV k="Host" v={uptime.host?.uptime_seconds != null ? fmtUptime(uptime.host.uptime_seconds) : "indisponível"} mono hint="Tempo ativo da máquina onde o backend corre (não da app). Em ambientes containerizados pode coincidir." />
                            <KV k="Verificado" v={fmtRelative(uptime.checked_at)} />
                        </dl>
                    ) : <div className="text-[12px] text-slate-400">A carregar…</div>}
                </SystemPanel>

                {/* WS */}
                <SystemPanel
                    title="WebSocket"
                    icon={Wifi}
                    accent="text-[color:var(--ops-realtime-600)]"
                    testid="sys-ws"
                    loading={loading.ws}
                    onRefresh={() => _load("ws", "/admin/system/websocket", setWs)}
                    hint={{ title: "Realtime / WebSocket", body: "Telemetria das conexões persistentes que entregam notificações, presença, novos posts, mensagens e contadores em tempo real." }}
                >
                    {ws ? (
                        <>
                            <dl>
                                <KV k="Users conectados" v={fmtNum(ws.users_connected)} mono hint="Pessoas distintas com pelo menos um socket aberto." />
                                <KV k="Sockets totais" v={fmtNum(ws.sockets)} mono hint="Conexões abertas no total (uma pessoa pode ter várias abas/dispositivos)." />
                                <KV k="Post viewers" v={fmtNum(ws.post_viewers_total)} mono hint="Utilizadores actualmente a ver detalhes de posts em tempo real (indicador de presença)." />
                            </dl>
                            {Array.isArray(ws.top_users) && ws.top_users.length > 0 && (
                                <div className="mt-3">
                                    <div className="text-[10.5px] uppercase tracking-wider text-slate-400 font-mono mb-1.5 inline-flex items-center gap-1">
                                        Top users (sockets)
                                        <InfoTip text="Utilizadores com mais sockets abertos simultaneamente. Valores muito altos (>10) podem indicar bug de reconexão no cliente." side="top" />
                                    </div>
                                    <ul className="space-y-1">
                                        {ws.top_users.slice(0, 5).map((u) => (
                                            <li key={u.user_id} className="text-[12px] flex items-center justify-between gap-2">
                                                <span className="font-mono text-slate-700 truncate">@{u.username || u.user_id.slice(0,8)}</span>
                                                <span className="font-mono text-slate-500">{u.sockets}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </>
                    ) : <div className="text-[12px] text-slate-400">A carregar…</div>}
                </SystemPanel>

                {/* LATENCY */}
                <SystemPanel
                    title="Latência DB"
                    icon={Zap}
                    accent="text-[color:var(--ops-info-600)]"
                    testid="sys-latency"
                    loading={loading.latency}
                    onRefresh={() => _load("latency", "/admin/system/latency", setLatency)}
                    hint={{ title: "Latência MongoDB", body: "Tempo de resposta de pings à base de dados em ms. < 50ms é saudável · 50–200ms degradação · > 200ms anomalia (vermelho)." }}
                >
                    {latency ? (
                        <dl>
                            <KV k="Min" v={latency.min_ms != null ? `${latency.min_ms} ms` : "—"} mono />
                            <KV k="Média" v={latency.avg_ms != null ? `${latency.avg_ms} ms` : "—"} mono color={
                                latency.avg_ms > 200 ? "text-[color:var(--ops-danger-600)]" :
                                latency.avg_ms > 50  ? "text-[color:var(--ops-warn-600)]" :
                                "text-slate-700"
                            } hint="Média das últimas amostras. Amarelo > 50ms, vermelho > 200ms." />
                            <KV k="Máx" v={latency.max_ms != null ? `${latency.max_ms} ms` : "—"} mono />
                            <KV k="Amostras" v={(latency.samples_ms || []).map((s) => `${s}ms`).join(" · ")} mono />
                        </dl>
                    ) : <div className="text-[12px] text-slate-400">A medir…</div>}
                </SystemPanel>

                {/* DATABASE */}
                <SystemPanel
                    title="Base de dados"
                    icon={Database}
                    accent="text-slate-500"
                    testid="sys-database"
                    loading={loading.database}
                    onRefresh={() => _load("database", "/admin/system/database", setDatabase)}
                    hint={{ title: "MongoDB", body: "Métricas de tamanho e contagens da base de dados. 'Data size' é o conteúdo, 'Storage size' inclui overhead de blocos no disco." }}
                >
                    {database?.db ? (
                        <>
                            <dl>
                                <KV k="DB" v={database.db.db_name} mono />
                                <KV k="Coleções" v={fmtNum(database.db.collections)} mono />
                                <KV k="Documentos" v={fmtNum(database.db.objects)} mono />
                                <KV k="Dados" v={fmtBytes(database.db.data_size_bytes)} mono hint="Tamanho do conteúdo de todos os documentos (BSON). Não inclui índices." />
                                <KV k="Armazenamento" v={fmtBytes(database.db.storage_size_bytes)} mono hint="Espaço ocupado em disco pelos dados (com overhead de blocos)." />
                                <KV k="Índices" v={fmtBytes(database.db.index_size_bytes)} mono hint="Espaço total dos índices. Se for desproporcional ao tamanho dos dados, revê índices desnecessários." />
                                <KV k="Índices" v={fmtNum(database.db.indexes)} mono />
                            </dl>
                            {Array.isArray(database.collections) && (
                                <div className="mt-3 max-h-[180px] overflow-y-auto">
                                    <div className="text-[10.5px] uppercase tracking-wider text-slate-400 font-mono mb-1.5 inline-flex items-center gap-1">
                                        Coleções por contagem
                                        <InfoTip text="Top 8 coleções ordenadas por número de documentos." side="top" />
                                    </div>
                                    <ul className="space-y-0.5">
                                        {database.collections.slice(0, 8).map((c) => (
                                            <li key={c.name} className="text-[12px] flex items-center justify-between gap-2">
                                                <span className="font-mono text-slate-700 truncate">{c.name}</span>
                                                <span className="font-mono text-slate-500">{fmtNum(c.count)}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </>
                    ) : <div className="text-[12px] text-slate-400">A carregar…</div>}
                </SystemPanel>

                {/* LOAD */}
                <SystemPanel
                    title="Carga"
                    icon={Gauge}
                    accent="text-[color:var(--ops-info-600)]"
                    testid="sys-load"
                    loading={loading.load}
                    onRefresh={() => _load("load", "/admin/system/load", setLoad)}
                    hint={{ title: "Carga de sistema", body: "Load average UNIX: média de processos em execução/à espera de CPU. Saudável < CPUs · amarelo entre 1× e 1.5× · vermelho > 1.5× CPUs." }}
                >
                    {load ? (
                        <dl>
                            <KV k="CPUs" v={load.cpu_count} mono />
                            <KV k="Load 1m" v={load.load_avg?.["1m"]?.toFixed?.(2) ?? "—"} mono color={
                                load.load_avg && load.load_avg["1m"] > (load.cpu_count || 1) * 1.5 ? "text-[color:var(--ops-danger-600)]" :
                                load.load_avg && load.load_avg["1m"] > (load.cpu_count || 1)       ? "text-[color:var(--ops-warn-600)]" :
                                "text-slate-700"
                            } hint="Carga do último minuto. Sinaliza problemas instantâneos." />
                            <KV k="Load 5m" v={load.load_avg?.["5m"]?.toFixed?.(2) ?? "—"} mono hint="Carga média dos últimos 5 minutos." />
                            <KV k="Load 15m" v={load.load_avg?.["15m"]?.toFixed?.(2) ?? "—"} mono hint="Carga média dos últimos 15 minutos — tendência de fundo." />
                            {load.memory && (
                                <>
                                    <KV k="Memória total" v={fmtKbToBytes(load.memory.total_kb)} mono />
                                    <KV k="Memória usada" v={`${fmtKbToBytes(load.memory.used_kb)} (${load.memory.used_pct}%)`} mono color={
                                        load.memory.used_pct > 95 ? "text-[color:var(--ops-danger-600)]" :
                                        load.memory.used_pct > 85 ? "text-[color:var(--ops-warn-600)]" :
                                        "text-slate-700"
                                    } hint="RAM em uso. Amarelo > 85%, vermelho > 95% — risco de OOM." />
                                    <KV k="Disponível" v={fmtKbToBytes(load.memory.available_kb)} mono />
                                </>
                            )}
                        </dl>
                    ) : <div className="text-[12px] text-slate-400">A carregar…</div>}
                </SystemPanel>
            </div>

            {/* ERRORS LOG */}
            <SystemPanel
                title="Erros (stderr)"
                icon={Bug}
                accent="text-red-600"
                testid="sys-errors"
                loading={loading.errLog}
                onRefresh={() => _load("errLog", "/admin/system/errors?lines=120", setErrLog)}
                hint={{ title: "Log de erros do backend", body: "Últimas 120 linhas de stderr do processo. Stack traces e exceções aparecem aqui — vermelho é normal nesta secção." }}
            >
                {errLog ? (
                    <>
                        <div className="text-[10.5px] uppercase tracking-wider text-slate-400 font-mono mb-2">
                            {errLog.file || "sem ficheiro"} · {errLog.count} linhas
                        </div>
                        <LogTail lines={errLog.lines} empty="Sem erros registados." />
                    </>
                ) : <div className="text-[12px] text-slate-400">A carregar…</div>}
            </SystemPanel>

            {/* LOGS */}
            <SystemPanel
                title="Logs (stdout)"
                icon={FileCode}
                accent="text-[color:var(--ops-system-600)]"
                testid="sys-logs"
                loading={loading.outLog}
                onRefresh={() => _load("outLog", "/admin/system/logs?lines=120", setOutLog)}
                hint={{ title: "Log standard do backend", body: "Últimas 120 linhas de stdout. Eventos operacionais, pedidos HTTP relevantes e mensagens de info." }}
            >
                {outLog ? (
                    <>
                        <div className="text-[10.5px] uppercase tracking-wider text-slate-400 font-mono mb-2">
                            {outLog.file || "sem ficheiro"} · {outLog.count} linhas
                        </div>
                        <LogTail lines={outLog.lines} empty="Sem entradas." />
                    </>
                ) : <div className="text-[12px] text-slate-400">A carregar…</div>}
            </SystemPanel>

            <div className="ops-callout ops-callout--info">
                <AlertCircle size={13} />
                <div>
                    <strong>Ver filas</strong> não foi implementado: este sistema não usa filas externas (Celery/Redis). Tudo o resto é dado em tempo real.
                </div>
            </div>
        </div>
    );
}



function UsersTab({ onOpenDrawer }) {
    const { user: me } = useAuth();
    const [q, setQ] = useState("");
    const [filter, setFilter] = useState("all");
    const [page, setPage] = useState(1);
    const [data, setData] = useState({ items: [], total: 0, limit: 25 });
    const [loading, setLoading] = useState(false);
    const [busyId, setBusyId] = useState(null);
    const [reloadAt, setReloadAt] = useState(0);
    const [selected, setSelected] = useState(() => new Set());
    const [bulkBusy, setBulkBusy] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get("/admin/users", { params: { q, filter, page, limit: 25 } });
            setData(data);
            setSelected(new Set());
        } catch (e) { apiError(e); }
        finally { setLoading(false); }
    }, [q, filter, page, reloadAt]);
    useEffect(() => { load(); }, [load]);

    const toggleSelect = (id) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };
    const selectAll = () => {
        const selectable = data.items.filter((u) => u.id !== me?.id && !u.is_admin).map((u) => u.id);
        if (selected.size >= selectable.length) {
            setSelected(new Set());
        } else {
            setSelected(new Set(selectable));
        }
    };

    const runBulk = async (action) => {
        const ids = Array.from(selected);
        if (ids.length === 0) return;
        const labels = { verify: "verificar", unverify: "desverificar", ban: "banir", unban: "desbanir", force_logout: "forçar logout" };
        const danger = action === "ban" || action === "force_logout";
        const ok = await confirmDialog({
            title: `${labels[action]} ${ids.length} utilizador(es)?`,
            body: danger
                ? "Esta acção é destrutiva ou disruptiva. Confirma para continuar."
                : "A acção será aplicada a todos os selecionados.",
            confirmLabel: `Sim, ${labels[action]}`,
            danger,
        });
        if (!ok) return;
        let reason = "";
        if (action === "ban") {
            const r = window.prompt("Motivo do ban (opcional, audit log):", "");
            if (r === null) return;
            reason = r || "";
        }
        setBulkBusy(true);
        try {
            const { data } = await api.post("/admin/users/bulk", { ids, action, reason });
            toast.success(`${data.updated} de ${data.requested} atualizado(s)`);
            setReloadAt(Date.now());
        } catch (e) { apiError(e); }
        finally { setBulkBusy(false); }
    };

    const act = async (id, fn, msg) => {
        setBusyId(id);
        try {
            await fn();
            if (msg) toast.success(msg);
            setReloadAt(Date.now());
        } catch (e) { apiError(e); }
        finally { setBusyId(null); }
    };

    const onVerify = (u) => act(u.id, async () => {
        const { data } = await api.post(`/admin/users/${u.id}/verify`);
        toast.success(data.verified ? `${u.username} verificado` : `${u.username} desverificado`);
    });
    const onToggleAdmin = (u) => confirmDialog({
        title: u.is_admin ? "Remover papel de admin?" : "Promover a admin?",
        body: u.is_admin
            ? `${u.username} deixará de poder aceder ao painel de administração.`
            : `${u.username} passará a ter acesso total ao painel de administração e a todos os botões.`,
        confirmLabel: u.is_admin ? "Remover admin" : "Promover",
        danger: !u.is_admin,
    }).then((ok) => ok && act(u.id, async () => {
        const { data } = await api.post(`/admin/users/${u.id}/admin`);
        toast.success(data.is_admin ? `${u.username} é admin` : `Admin removido de ${u.username}`);
    }));

    const onBan = (u) => {
        const reason = window.prompt(`Banir ${u.username}? Indica um motivo (opcional, será visível em audit log):`, "");
        if (reason === null) return;
        act(u.id, async () => {
            await api.post(`/admin/users/${u.id}/ban`, { reason: reason || "" });
            toast.success(`${u.username} banido`);
        });
    };

    const onUnban = (u) => act(u.id, async () => {
        await api.post(`/admin/users/${u.id}/unban`);
        toast.success(`${u.username} desbanido`);
    });

    const onForceLogout = (u) => confirmDialog({
        title: "Forçar logout?",
        body: `Todas as sessões ativas de ${u.username} serão imediatamente revogadas.`,
        confirmLabel: "Forçar logout",
        danger: true,
    }).then((ok) => ok && act(u.id, async () => {
        const { data } = await api.post(`/admin/users/${u.id}/force-logout`);
        toast.success(`${data.revoked} sessões revogadas`);
    }));

    const onDelete = (u) => confirmDialog({
        title: `Eliminar ${u.username}?`,
        body: "Esta acção elimina o utilizador e TODO o seu conteúdo (posts, comentários, stories, mensagens, sessões). Não pode ser desfeita.",
        confirmLabel: "Eliminar definitivamente",
        danger: true,
    }).then((ok) => ok && act(u.id, async () => {
        await api.delete(`/admin/users/${u.id}`);
        toast.success(`${u.username} eliminado`);
    }));

    const selectableCount = data.items.filter((u) => u.id !== me?.id && !u.is_admin).length;
    const allSelected = selected.size > 0 && selected.size >= selectableCount;

    return (
        <div className="space-y-4" data-testid="admin-users">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                    <p className="ops-subtitle">Pesquisa, verificação, banimentos, privilégios e moderação individual. Todas as ações ficam registadas no audit log.</p>
                </div>
                <button
                    onClick={() => setReloadAt(Date.now())}
                    data-testid="admin-users-refresh"
                    className="h-9 px-3 rounded-full bg-slate-100 hover:bg-slate-800/[0.1] inline-flex items-center gap-1.5 text-[13px]"
                >
                    <RefreshCcw size={14} /> Atualizar
                </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
                <div className="relative flex-1 min-w-[160px] sm:min-w-[240px]">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }}
                        placeholder="Pesquisar por username, email, nome ou ID"
                        data-testid="admin-users-search"
                        className="w-full h-10 pl-9 pr-4 rounded-full bg-slate-50 focus:bg-white focus:ring-2 ring-slate-300 text-[13.5px] outline-none"
                    />
                </div>
                <div className="flex items-center gap-0.5 bg-slate-50 rounded-full p-1 overflow-x-auto no-scrollbar max-w-full">
                    {USER_FILTERS.map((f) => (
                        <Hint key={f.key} focusable={false} side="bottom" text={f.hint}>
                            <button
                                onClick={() => { setFilter(f.key); setPage(1); }}
                                data-testid={`admin-users-filter-${f.key}`}
                                className={`h-8 px-2.5 sm:px-3 rounded-full text-[11.5px] sm:text-[12px] font-medium whitespace-nowrap ${filter === f.key ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"}`}
                            >{f.label}</button>
                        </Hint>
                    ))}
                </div>
            </div>

            {/* BULK TOOLBAR */}
            {selected.size > 0 && (
                <div className="bg-slate-900 text-white rounded-2xl px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2 flex-wrap"
                    data-testid="admin-users-bulk-toolbar">
                    <div className="text-[12.5px] sm:text-[13px] font-medium">
                        {selected.size} selecionado(s)
                    </div>
                    <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
                        <button onClick={() => runBulk("verify")} disabled={bulkBusy}
                            data-testid="admin-users-bulk-verify"
                            className="h-8 px-2.5 sm:px-3 rounded-full bg-white/15 hover:bg-white/25 text-[11.5px] sm:text-[12px] font-medium disabled:opacity-40 inline-flex items-center gap-1 sm:gap-1.5">
                            <ShieldCheck size={13} /> <span className="hidden xs:inline sm:inline">Verificar</span>
                        </button>
                        <button onClick={() => runBulk("unverify")} disabled={bulkBusy}
                            data-testid="admin-users-bulk-unverify"
                            className="h-8 px-2.5 sm:px-3 rounded-full bg-white/15 hover:bg-white/25 text-[11.5px] sm:text-[12px] font-medium disabled:opacity-40">
                            Desverificar
                        </button>
                        <button onClick={() => runBulk("ban")} disabled={bulkBusy}
                            data-testid="admin-users-bulk-ban"
                            className="h-8 px-2.5 sm:px-3 rounded-full bg-red-600 hover:bg-red-600 text-[11.5px] sm:text-[12px] font-medium disabled:opacity-40 inline-flex items-center gap-1 sm:gap-1.5">
                            <Ban size={13} /> Banir
                        </button>
                        <button onClick={() => runBulk("unban")} disabled={bulkBusy}
                            data-testid="admin-users-bulk-unban"
                            className="h-8 px-2.5 sm:px-3 rounded-full bg-slate-900 hover:bg-slate-800 text-[11.5px] sm:text-[12px] font-medium disabled:opacity-40">
                            Desbanir
                        </button>
                        <button onClick={() => runBulk("force_logout")} disabled={bulkBusy}
                            data-testid="admin-users-bulk-logout"
                            title="Forçar logout"
                            className="h-8 px-2.5 sm:px-3 rounded-full bg-white/15 hover:bg-white/25 text-[11.5px] sm:text-[12px] font-medium disabled:opacity-40 inline-flex items-center gap-1 sm:gap-1.5">
                            <UserX size={13} /> <span className="hidden sm:inline">Forçar saída</span>
                        </button>
                        <button onClick={() => setSelected(new Set())}
                            aria-label="Limpar seleção"
                            className="h-8 px-2 rounded-full hover:bg-white/15 text-[12px] inline-flex items-center gap-1">
                            <XIcon size={13} />
                        </button>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                {data.items.length > 0 && (
                    <div className="px-4 py-2 border-b border-slate-200 flex items-center gap-2 text-[12px] text-slate-500">
                        <input type="checkbox" checked={allSelected} onChange={selectAll}
                            data-testid="admin-users-select-all"
                            className="w-4 h-4 accent-black cursor-pointer" />
                        <span>Selecionar todos os elegíveis ({selectableCount})</span>
                    </div>
                )}
                {loading && <div className="px-4 py-3 text-[12px] text-slate-400 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> A carregar…</div>}
                {!loading && data.items.length === 0 && (
                    <div className="px-4 py-10 text-center text-slate-400 text-[13px]">Sem utilizadores para os filtros atuais.</div>
                )}
                <ul className="divide-y divide-black/[0.05]">
                    {data.items.map((u) => {
                        const isMe = me?.id === u.id;
                        const busy = busyId === u.id;
                        const canSelect = !isMe && !u.is_admin;
                        const isSel = selected.has(u.id);
                        return (
                            <li key={u.id} data-testid={`admin-user-row-${u.username}`} className={`px-3 sm:px-4 py-3 flex flex-wrap sm:flex-nowrap items-start sm:items-center gap-2.5 sm:gap-3 ${isSel ? "bg-red-50/50" : ""}`}>
                                <input type="checkbox"
                                    checked={isSel}
                                    disabled={!canSelect}
                                    onChange={() => toggleSelect(u.id)}
                                    data-testid={`admin-user-select-${u.username}`}
                                    className="w-4 h-4 accent-black cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed mt-1.5 sm:mt-0"
                                />
                                <button
                                    onClick={() => onOpenDrawer && onOpenDrawer(u)}
                                    className="shrink-0 group"
                                    data-testid={`admin-user-open-${u.username}`}
                                    title="Ver detalhes"
                                >
                                    <Avatar user={u} size={40} />
                                </button>
                                <button
                                    onClick={() => onOpenDrawer && onOpenDrawer(u)}
                                    className="flex-1 min-w-0 basis-[60%] sm:basis-auto text-left hover:bg-slate-800/[0.02] rounded-xl px-2 -mx-2 py-1 -my-1 transition"
                                    title="Abrir detalhes"
                                >
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="font-medium text-[14px] truncate">{u.name || u.username}</span>
                                        <span className="font-mono text-[11.5px] text-slate-400">@{u.username}</span>
                                        {u.verified && <span className="ops-chip ops-chip--info font-medium">verificado</span>}
                                        {u.is_admin && <span className="ops-chip ops-chip--system font-medium">admin</span>}
                                        {u.banned && <span className="ops-chip ops-chip--danger font-medium">banido</span>}
                                        {u.online && <span className="ops-chip ops-chip--realtime font-medium">online</span>}
                                    </div>
                                    <div className="text-[11.5px] text-slate-500 truncate">
                                        {u.email} · seguidores {u.followers_count} · entrou {fmtRelative(u.created_at)}
                                    </div>
                                    {u.banned && u.ban_reason && (
                                        <div className="text-[11px] text-red-600/85 mt-0.5">Motivo: {u.ban_reason}</div>
                                    )}
                                </button>

                                <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 ml-auto sm:ml-0 basis-full sm:basis-auto justify-end sm:justify-start pt-1 sm:pt-0 border-t sm:border-t-0 border-slate-100 sm:border-0 mt-1 sm:mt-0">
                                    <button
                                        onClick={() => onVerify(u)} disabled={busy}
                                        data-testid={`admin-user-verify-${u.username}`}
                                        title={u.verified ? "Desverificar" : "Verificar"}
                                        className="w-8 h-8 grid place-items-center rounded-full hover:bg-slate-100 disabled:opacity-40"
                                    >
                                        <ShieldCheck size={15} className={u.verified ? "text-blue-600" : "text-slate-500"} />
                                    </button>
                                    <button
                                        onClick={() => onToggleAdmin(u)} disabled={busy || isMe}
                                        data-testid={`admin-user-admin-${u.username}`}
                                        title={isMe ? "Não te podes alterar a ti próprio" : (u.is_admin ? "Remover admin" : "Promover a admin")}
                                        className="w-8 h-8 grid place-items-center rounded-full hover:bg-slate-100 disabled:opacity-40"
                                    >
                                        <Shield size={15} className={u.is_admin ? "text-red-600" : "text-slate-500"} />
                                    </button>
                                    {u.banned ? (
                                        <button
                                            onClick={() => onUnban(u)} disabled={busy}
                                            data-testid={`admin-user-unban-${u.username}`}
                                            title="Desbanir"
                                            className="w-8 h-8 grid place-items-center rounded-full hover:bg-slate-100 disabled:opacity-40 text-slate-700"
                                        >
                                            <UserCheck size={15} />
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => onBan(u)} disabled={busy || isMe || u.is_admin}
                                            data-testid={`admin-user-ban-${u.username}`}
                                            title={isMe ? "Não te podes banir" : (u.is_admin ? "Remove primeiro o admin" : "Banir")}
                                            className="w-8 h-8 grid place-items-center rounded-full hover:bg-red-500/10 disabled:opacity-40 text-red-600"
                                        >
                                            <Ban size={15} />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => onForceLogout(u)} disabled={busy}
                                        data-testid={`admin-user-logout-${u.username}`}
                                        title="Forçar logout (revogar todas as sessões)"
                                        className="w-8 h-8 grid place-items-center rounded-full hover:bg-slate-100 disabled:opacity-40 text-slate-500"
                                    >
                                        <UserX size={15} />
                                    </button>
                                    <button
                                        onClick={() => onDelete(u)} disabled={busy || isMe || u.is_admin}
                                        data-testid={`admin-user-delete-${u.username}`}
                                        title={isMe ? "Não te podes eliminar" : (u.is_admin ? "Remove primeiro o admin" : "Eliminar conta")}
                                        className="w-8 h-8 grid place-items-center rounded-full hover:bg-red-500/15 disabled:opacity-40 text-red-600"
                                    >
                                        <Trash2 size={15} />
                                    </button>
                                </div>
                            </li>
                        );
                    })}
                </ul>
                <div className="px-4 pb-3"><Pager page={page} total={data.total} limit={data.limit} onChange={setPage} /></div>
            </div>
        </div>
    );
}

// -----------------------------------------------------------------
// POSTS
// -----------------------------------------------------------------
const POST_FILTERS = [
    { key: "all", label: "Todos", hint: "Todas as publicações públicas, sem filtro." },
    { key: "featured", label: "Destacados", hint: "Posts marcados como destaque — aparecem no topo do feed." },
    { key: "drafts", label: "Rascunhos", hint: "Posts ainda não publicados, guardados pelo autor." },
    { key: "scheduled", label: "Agendados", hint: "Posts com publicação programada para uma data futura." },
];

function PostsTab() {
    const [q, setQ] = useState("");
    const [filter, setFilter] = useState("all");
    const [page, setPage] = useState(1);
    const [data, setData] = useState({ items: [], total: 0, limit: 20 });
    const [loading, setLoading] = useState(false);
    const [busyId, setBusyId] = useState(null);
    const [reloadAt, setReloadAt] = useState(0);
    const [selected, setSelected] = useState(() => new Set());
    const [bulkBusy, setBulkBusy] = useState(false);
    const [drawer, setDrawer] = useState(null); // {post, view: 'replies' | 'reports'}

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get("/admin/posts", { params: { q, filter, page, limit: 20 } });
            setData(data);
            setSelected(new Set());
        } catch (e) { apiError(e); }
        finally { setLoading(false); }
    }, [q, filter, page, reloadAt]);
    useEffect(() => { load(); }, [load]);

    const toggleSelect = (id) => {
        setSelected((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };
    const selectAll = () => {
        if (selected.size >= data.items.length) {
            setSelected(new Set());
        } else {
            setSelected(new Set(data.items.map((p) => p.id)));
        }
    };

    const runBulk = async (action) => {
        const ids = Array.from(selected);
        if (ids.length === 0) return;
        const labels = { feature: "destacar", unfeature: "remover destaque", delete: "eliminar" };
        const danger = action === "delete";
        const ok = await confirmDialog({
            title: `${labels[action]} ${ids.length} publicação(ões)?`,
            body: danger
                ? "Esta acção elimina as publicações e respectivos comentários. Não pode ser desfeita."
                : "A acção será aplicada às publicações selecionadas.",
            confirmLabel: `Sim, ${labels[action]}`,
            danger,
        });
        if (!ok) return;
        setBulkBusy(true);
        try {
            const { data } = await api.post("/admin/posts/bulk", { ids, action });
            toast.success(`${data.updated} de ${data.requested} ${labels[action]}`);
            setReloadAt(Date.now());
        } catch (e) { apiError(e); }
        finally { setBulkBusy(false); }
    };

    const act = async (id, fn) => {
        setBusyId(id);
        try { await fn(); setReloadAt(Date.now()); }
        catch (e) { apiError(e); }
        finally { setBusyId(null); }
    };

    const onFeature = (p) => act(p.id, async () => {
        const { data } = await api.post(`/admin/posts/${p.id}/feature`);
        toast.success(data.featured ? "Publicação destacada" : "Destaque removido");
    });

    const onFreezeReplies = (p) => act(p.id, async () => {
        const { data } = await api.post(`/admin/posts/${p.id}/freeze-replies`);
        toast.success(data.replies_frozen ? "Respostas congeladas" : "Respostas reabertas");
    });

    const onReduceReach = (p) => act(p.id, async () => {
        const { data } = await api.post(`/admin/posts/${p.id}/reduce-reach`);
        toast.success(data.reduce_reach ? "Alcance reduzido (escondido do feed/explore)" : "Alcance normal restaurado");
    });

    const onDelete = (p) => confirmDialog({
        title: "Eliminar publicação?",
        body: "A publicação e todos os comentários e reports associados serão removidos. Acção definitiva.",
        confirmLabel: "Eliminar",
        danger: true,
    }).then((ok) => ok && act(p.id, async () => {
        await api.delete(`/admin/posts/${p.id}`);
        toast.success("Publicação eliminada");
    }));

    const allSelected = selected.size > 0 && selected.size >= data.items.length;

    return (
        <div className="space-y-4" data-testid="admin-posts">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                    <p className="ops-subtitle">Destaque, redução de alcance, congelamento de respostas e remoção. Cada ação é registada e reversível (exceto remoção).</p>
                </div>
                <button
                    onClick={() => setReloadAt(Date.now())}
                    data-testid="admin-posts-refresh"
                    className="h-9 px-3 rounded-full bg-slate-100 hover:bg-slate-800/[0.1] inline-flex items-center gap-1.5 text-[13px]"
                >
                    <RefreshCcw size={14} /> Atualizar
                </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
                <div className="relative flex-1 min-w-[160px] sm:min-w-[240px]">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        type="text" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }}
                        placeholder="Pesquisar por conteúdo ou ID"
                        data-testid="admin-posts-search"
                        className="w-full h-10 pl-9 pr-4 rounded-full bg-slate-50 focus:bg-white focus:ring-2 ring-slate-300 text-[13.5px] outline-none"
                    />
                </div>
                <div className="flex items-center gap-0.5 bg-slate-50 rounded-full p-1 overflow-x-auto no-scrollbar max-w-full">
                    {POST_FILTERS.map((f) => (
                        <Hint key={f.key} focusable={false} side="bottom" text={f.hint}>
                            <button onClick={() => { setFilter(f.key); setPage(1); }}
                                data-testid={`admin-posts-filter-${f.key}`}
                                className={`h-8 px-2.5 sm:px-3 rounded-full text-[11.5px] sm:text-[12px] font-medium whitespace-nowrap ${filter === f.key ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"}`}
                            >{f.label}</button>
                        </Hint>
                    ))}
                </div>
            </div>

            {selected.size > 0 && (
                <div className="bg-slate-900 text-white rounded-2xl px-3 sm:px-4 py-2.5 flex items-center justify-between gap-2 flex-wrap"
                    data-testid="admin-posts-bulk-toolbar">
                    <div className="text-[12.5px] sm:text-[13px] font-medium">{selected.size} selecionada(s)</div>
                    <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
                        <button onClick={() => runBulk("feature")} disabled={bulkBusy}
                            data-testid="admin-posts-bulk-feature"
                            className="h-8 px-2.5 sm:px-3 rounded-full bg-red-500 hover:bg-red-600 text-[11.5px] sm:text-[12px] font-medium disabled:opacity-40 inline-flex items-center gap-1 sm:gap-1.5">
                            <Star size={13} /> Destacar
                        </button>
                        <button onClick={() => runBulk("unfeature")} disabled={bulkBusy}
                            data-testid="admin-posts-bulk-unfeature"
                            className="h-8 px-2.5 sm:px-3 rounded-full bg-white/15 hover:bg-white/25 text-[11.5px] sm:text-[12px] font-medium disabled:opacity-40">
                            <span className="hidden sm:inline">Remover destaque</span><span className="sm:hidden">Remover</span>
                        </button>
                        <button onClick={() => runBulk("delete")} disabled={bulkBusy}
                            data-testid="admin-posts-bulk-delete"
                            className="h-8 px-2.5 sm:px-3 rounded-full bg-red-600 hover:bg-red-600 text-[11.5px] sm:text-[12px] font-medium disabled:opacity-40 inline-flex items-center gap-1 sm:gap-1.5">
                            <Trash2 size={13} /> Eliminar
                        </button>
                        <button onClick={() => setSelected(new Set())}
                            aria-label="Limpar seleção"
                            className="h-8 px-2 rounded-full hover:bg-white/15 text-[12px]">
                            <XIcon size={13} />
                        </button>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                {data.items.length > 0 && (
                    <div className="px-4 py-2 border-b border-slate-200 flex items-center gap-2 text-[12px] text-slate-500">
                        <input type="checkbox" checked={allSelected} onChange={selectAll}
                            data-testid="admin-posts-select-all"
                            className="w-4 h-4 accent-black cursor-pointer" />
                        <span>Selecionar tudo nesta página ({data.items.length})</span>
                    </div>
                )}
                {loading && <div className="px-4 py-3 text-[12px] text-slate-400 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> A carregar…</div>}
                {!loading && data.items.length === 0 && (
                    <div className="px-4 py-10 text-center text-slate-400 text-[13px]">Sem publicações.</div>
                )}
                <ul className="divide-y divide-black/[0.05]">
                    {data.items.map((p) => {
                        const isSel = selected.has(p.id);
                        return (
                        <li key={p.id} data-testid={`admin-post-row-${p.id}`} className={`px-4 py-3 flex items-start gap-3 ${isSel ? "bg-red-50/50" : ""}`}>
                            <input type="checkbox" checked={isSel} onChange={() => toggleSelect(p.id)}
                                data-testid={`admin-post-select-${p.id}`}
                                className="w-4 h-4 accent-black cursor-pointer mt-1" />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-medium text-[13.5px]">@{p.author_username || "—"}</span>
                                    <span className="font-mono text-[10.5px] text-slate-400">{p.kind}</span>
                                    {p.image && <span className="ops-chip ops-chip--neutral">com imagem</span>}
                                    {p.featured && <span className="ops-chip ops-chip--info">destacado</span>}
                                    {p.is_draft && <span className="ops-chip ops-chip--system">rascunho</span>}
                                    {p.scheduled_at && <span className="ops-chip ops-chip--neutral">agendado</span>}
                                    {p.community_slug && <span className="ops-chip ops-chip--neutral">c/{p.community_slug}</span>}
                                </div>
                                <div className="text-[13px] text-slate-900 mt-1 line-clamp-3 whitespace-pre-wrap break-words">{p.content || "—"}</div>
                                <div className="text-[11px] text-slate-400 mt-1 font-mono flex flex-wrap items-center gap-x-2 gap-y-1">
                                    <span>{p.likes_count} ♥ · {p.comments_count} 💬 · {fmtRelative(p.created_at)} · {p.id.slice(0, 8)}</span>
                                    {p.replies_frozen && <span className="ops-chip ops-chip--neutral"><Snowflake size={9} /> respostas congeladas</span>}
                                    {p.reduce_reach && <span className="ops-chip ops-chip--warn"><TrendingDown size={9} /> alcance reduzido</span>}
                                </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end max-w-[210px]">
                                <a href={`/post/${p.id}`} target="_blank" rel="noopener noreferrer"
                                    data-testid={`admin-post-view-${p.id}`}
                                    title="Ver publicação"
                                    className="w-8 h-8 grid place-items-center rounded-full hover:bg-slate-200 text-slate-600"
                                ><Eye size={14} /></a>
                                <button
                                    onClick={() => setDrawer({ post: p, view: "replies" })}
                                    data-testid={`admin-post-replies-${p.id}`}
                                    title="Ver respostas"
                                    className="w-8 h-8 grid place-items-center rounded-full hover:bg-slate-200 text-slate-600"
                                ><MessageCircle size={14} /></button>
                                <button
                                    onClick={() => setDrawer({ post: p, view: "reports" })}
                                    data-testid={`admin-post-reports-${p.id}`}
                                    title="Ver reports"
                                    className="w-8 h-8 grid place-items-center rounded-full hover:bg-slate-200 text-slate-600"
                                ><Flag size={14} /></button>
                                <button
                                    onClick={() => onFreezeReplies(p)} disabled={busyId === p.id}
                                    data-testid={`admin-post-freeze-replies-${p.id}`}
                                    title={p.replies_frozen ? "Reabrir respostas" : "Congelar respostas"}
                                    className={`w-8 h-8 grid place-items-center rounded-full disabled:opacity-40 ${p.replies_frozen ? "bg-slate-100 text-slate-700" : "hover:bg-slate-50 text-slate-500"}`}
                                ><Snowflake size={14} /></button>
                                <button
                                    onClick={() => onReduceReach(p)} disabled={busyId === p.id}
                                    data-testid={`admin-post-reduce-reach-${p.id}`}
                                    title={p.reduce_reach ? "Restaurar alcance" : "Reduzir alcance"}
                                    className={`w-8 h-8 grid place-items-center rounded-full disabled:opacity-40 ${p.reduce_reach ? "bg-red-50 text-red-700" : "hover:bg-red-50/70 text-red-600"}`}
                                ><TrendingDown size={14} /></button>
                                <button
                                    onClick={() => onFeature(p)} disabled={busyId === p.id}
                                    data-testid={`admin-post-feature-${p.id}`}
                                    title={p.featured ? "Remover destaque" : "Destacar"}
                                    className="w-8 h-8 grid place-items-center rounded-full hover:bg-red-50 disabled:opacity-40 text-red-600"
                                >
                                    <Star size={14} fill={p.featured ? "currentColor" : "none"} />
                                </button>
                                <button
                                    onClick={() => onDelete(p)} disabled={busyId === p.id}
                                    data-testid={`admin-post-delete-${p.id}`}
                                    title="Eliminar publicação"
                                    className="w-8 h-8 grid place-items-center rounded-full hover:bg-red-500/15 disabled:opacity-40 text-red-600"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </li>
                        );
                    })}
                </ul>
                <div className="px-4 pb-3"><Pager page={page} total={data.total} limit={data.limit} onChange={setPage} /></div>
            </div>
            {drawer && <PostInspector post={drawer.post} initialView={drawer.view} onClose={() => setDrawer(null)} />}
        </div>
    );
}

// -----------------------------------------------------------------
// POST INSPECTOR — replies + reports drawer
// -----------------------------------------------------------------
function PostInspector({ post, initialView = "replies", onClose }) {
    const [view, setView] = useState(initialView);
    const [replies, setReplies] = useState(null);
    const [reports, setReports] = useState(null);
    const [page, setPage] = useState(1);
    const [busyId, setBusyId] = useState(null);

    const loadReplies = useCallback(async () => {
        try {
            const { data } = await api.get(`/admin/posts/${post.id}/comments`, { params: { page, limit: 30 } });
            setReplies(data);
        } catch (e) { apiError(e); }
    }, [post.id, page]);

    const loadReports = useCallback(async () => {
        try {
            const { data } = await api.get(`/admin/posts/${post.id}/reports`);
            setReports(data);
        } catch (e) { apiError(e); }
    }, [post.id]);

    useEffect(() => {
        if (view === "replies" && replies === null) loadReplies();
        if (view === "reports" && reports === null) loadReports();
    }, [view, replies, reports, loadReplies, loadReports]);

    useEffect(() => {
        if (view === "replies") loadReplies();
    }, [page, view, loadReplies]);

    const deleteComment = async (c) => {
        const ok = await confirmDialog({
            title: "Eliminar comentário?",
            body: "O comentário e respostas em árvore serão removidos.",
            confirmLabel: "Eliminar",
            danger: true,
        });
        if (!ok) return;
        setBusyId(c.id);
        try {
            await api.delete(`/admin/comments/${c.id}`);
            toast.success("Comentário eliminado");
            loadReplies();
        } catch (e) { apiError(e); }
        finally { setBusyId(null); }
    };

    return (
        <div className="fixed inset-0 z-[80]" data-testid="admin-post-inspector">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
            <aside className="absolute right-0 top-0 bottom-0 w-full sm:max-w-[560px] bg-white shadow-2xl flex flex-col">
                <header className="px-4 py-3 border-b border-slate-200 flex items-center gap-2">
                    <FileText size={16} className="text-slate-500" />
                    <div className="flex-1 min-w-0">
                        <div className="font-display text-[15px] tracking-tight truncate">Publicação @{post.author_username || "—"}</div>
                        <div className="text-[11px] text-slate-400 font-mono truncate">{post.id.slice(0, 12)} · {post.comments_count} respostas</div>
                    </div>
                    <a href={`/post/${post.id}`} target="_blank" rel="noopener noreferrer"
                        className="h-9 px-3 rounded-full bg-slate-100 hover:bg-slate-800/[0.1] text-[12px] inline-flex items-center gap-1.5"
                    ><Eye size={13} /> Abrir</a>
                    <button onClick={onClose} aria-label="Fechar" className="w-9 h-9 grid place-items-center rounded-full hover:bg-slate-100"><XIcon size={16} /></button>
                </header>
                <nav className="px-3 pt-3 flex items-center gap-1 border-b border-slate-100">
                    <button onClick={() => setView("replies")} data-testid="admin-post-inspector-tab-replies"
                        className={`h-8 px-3 rounded-full text-[12px] font-medium mb-2 ${view === "replies" ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"}`}>
                        Respostas ({post.comments_count})
                    </button>
                    <button onClick={() => setView("reports")} data-testid="admin-post-inspector-tab-reports"
                        className={`h-8 px-3 rounded-full text-[12px] font-medium mb-2 ${view === "reports" ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"}`}>
                        Reports
                    </button>
                </nav>
                <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-3 space-y-3">
                    {view === "replies" && (
                        replies === null ? <div className="text-slate-400"><Loader2 className="animate-spin inline" size={14} /> A carregar…</div> :
                        replies.items.length === 0 ? <div className="text-center text-slate-400 py-10 text-[13px]">Sem respostas.</div> :
                        <>
                            <ul className="space-y-2" data-testid="admin-post-inspector-replies">
                                {replies.items.map((c) => (
                                    <li key={c.id} className="px-3 py-2 rounded-xl bg-slate-50">
                                        <div className="flex items-center gap-1.5 text-[11.5px] flex-wrap">
                                            <span className="font-medium">@{c.author_username || "—"}</span>
                                            {c.author_verified && <span className="text-[9.5px] px-1 py-0.5 rounded-full bg-blue-500/10 text-blue-600">v</span>}
                                            {c.author_banned && <span className="text-[9.5px] px-1 py-0.5 rounded-full bg-red-500/10 text-red-600">banido</span>}
                                            {c.parent_id && <span className="text-[9.5px] px-1 py-0.5 rounded-full bg-slate-50 text-slate-700">resposta</span>}
                                            <span className="ml-auto text-[10.5px] text-slate-400 font-mono">{fmtRelative(c.created_at)}</span>
                                        </div>
                                        <div className="text-[13px] text-slate-800 mt-1 whitespace-pre-wrap break-words">{c.content}</div>
                                        <div className="flex items-center justify-between mt-1.5">
                                            <span className="text-[10.5px] text-slate-400 font-mono">{c.replies_count} respostas</span>
                                            <button onClick={() => deleteComment(c)} disabled={busyId === c.id}
                                                data-testid={`admin-post-inspector-delete-${c.id}`}
                                                className="h-7 px-2.5 rounded-full bg-red-500/10 text-red-600 hover:bg-red-500/20 text-[11px] font-medium disabled:opacity-40 inline-flex items-center gap-1">
                                                <Trash2 size={11} /> Eliminar
                                            </button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                            <Pager page={page} total={replies.total} limit={replies.limit} onChange={setPage} />
                        </>
                    )}

                    {view === "reports" && (
                        reports === null ? <div className="text-slate-400"><Loader2 className="animate-spin inline" size={14} /> A carregar…</div> :
                        (reports.post_reports.length === 0 && reports.comment_reports.length === 0) ? <div className="text-center text-slate-400 py-10 text-[13px]">Sem reports.</div> :
                        <div className="space-y-3" data-testid="admin-post-inspector-reports">
                            {reports.post_reports.length > 0 && (
                                <div>
                                    <div className="text-[10.5px] uppercase tracking-wider text-slate-400 font-mono mb-1.5">Contra a publicação ({reports.post_reports.length})</div>
                                    <ul className="space-y-1.5">{reports.post_reports.map((r) => (
                                        <li key={r.id} className="px-3 py-1.5 rounded-xl bg-red-500/[0.06] text-[12px]">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-700">{r.kind}</span>
                                                <span className="font-mono text-[10.5px] text-slate-500">{r.status}</span>
                                                {r.reason && <span className="text-slate-600">{r.reason}</span>}
                                                <span className="ml-auto text-[10.5px] text-slate-400">{fmtRelative(r.created_at)}</span>
                                            </div>
                                            {r.detail && <div className="mt-1 text-[11.5px] italic text-slate-500">"{r.detail}"</div>}
                                            {r.reporter && <div className="mt-1 text-[10.5px] text-slate-400 font-mono">por @{r.reporter.username}</div>}
                                        </li>
                                    ))}</ul>
                                </div>
                            )}
                            {reports.comment_reports.length > 0 && (
                                <div>
                                    <div className="text-[10.5px] uppercase tracking-wider text-slate-400 font-mono mb-1.5">Contra comentários ({reports.comment_reports.length})</div>
                                    <ul className="space-y-1.5">{reports.comment_reports.map((r) => (
                                        <li key={r.id} className="px-3 py-1.5 rounded-xl bg-red-50/50 text-[12px]">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-50 text-red-700">comentário</span>
                                                <span className="font-mono text-[10.5px] text-slate-500">{r.status}</span>
                                                {r.reason && <span className="text-slate-600">{r.reason}</span>}
                                                <span className="ml-auto text-[10.5px] text-slate-400">{fmtRelative(r.created_at)}</span>
                                            </div>
                                            {r.detail && <div className="mt-1 text-[11.5px] italic text-slate-500">"{r.detail}"</div>}
                                            {r.reporter && <div className="mt-1 text-[10.5px] text-slate-400 font-mono">por @{r.reporter.username} · alvo {r.target_id?.slice(0, 8)}</div>}
                                        </li>
                                    ))}</ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </aside>
        </div>
    );
}

// -----------------------------------------------------------------
// REPORTS
// -----------------------------------------------------------------
const REPORT_STATUS_HINTS = {
    open: "Reports ainda por decidir — exigem ação. É o estado por defeito.",
    closed: "Reports já resolvidos: mostram a decisão tomada e quem a aplicou.",
    all: "Todos os reports, independentemente do estado.",
};
const REPORT_KIND_HINTS = {
    all: "Reports de qualquer tipo de alvo.",
    post: "Denúncias sobre publicações.",
    comment: "Denúncias sobre comentários.",
    user: "Denúncias sobre contas de utilizador (assédio, spam, perfil falso).",
};

function ReportsTab({ onOpenUser }) {
    const [status, setStatus] = useState("open");
    const [kind, setKind] = useState("all");
    const [page, setPage] = useState(1);
    const [data, setData] = useState({ items: [], total: 0, limit: 20 });
    const [loading, setLoading] = useState(false);
    const [busyId, setBusyId] = useState(null);
    const [reloadAt, setReloadAt] = useState(0);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get("/admin/reports", { params: { status, kind, page, limit: 20 } });
            setData(data);
        } catch (e) { apiError(e); }
        finally { setLoading(false); }
    }, [status, kind, page, reloadAt]);
    useEffect(() => { load(); }, [load]);

    const resolve = (r, action) => {
        const note = action === "removed"
            ? window.prompt("Vais REMOVER o conteúdo reportado. Indica um motivo curto para o audit log:", "")
            : "";
        if (action === "removed" && note === null) return;
        setBusyId(r.id);
        api.post(`/admin/reports/${r.id}/resolve`, { action, note: note || "" })
            .then(({ data }) => {
                toast.success(
                    action === "removed" && data.deleted_target ? "Report resolvido — conteúdo removido"
                    : action === "dismissed" ? "Report descartado"
                    : "Report resolvido"
                );
                setReloadAt(Date.now());
            })
            .catch(apiError)
            .finally(() => setBusyId(null));
    };

    const suspendTarget = async (r) => {
        if (!r.target_user_id) return;
        const minStr = window.prompt("Suspender este utilizador por quantos minutos? (1440 = 24h)", "1440");
        if (minStr === null) return;
        const minutes = parseInt(minStr, 10);
        if (!Number.isFinite(minutes) || minutes <= 0) return toast.error("Valor inválido");
        const ok = await confirmDialog({
            title: `Suspender @${r.target_username || "—"}?`,
            body: `Vai ficar impedido de iniciar sessão durante ${minutes} minutos.`,
            confirmLabel: "Suspender",
            danger: true,
        });
        if (!ok) return;
        setBusyId(r.id);
        try {
            await api.post(`/admin/users/${r.target_user_id}/suspend`, { minutes, reason: `report:${r.id}` });
            toast.success("Utilizador suspenso");
            setReloadAt(Date.now());
        } catch (e) { apiError(e); }
        finally { setBusyId(null); }
    };

    const banTarget = async (r) => {
        if (!r.target_user_id) return;
        const ok = await confirmDialog({
            title: `Banir @${r.target_username || "—"}?`,
            body: "O utilizador perde acesso permanentemente. Esta ação é reversível por outro admin.",
            confirmLabel: "Banir",
            danger: true,
        });
        if (!ok) return;
        setBusyId(r.id);
        try {
            await api.post(`/admin/users/${r.target_user_id}/ban`);
            toast.success("Utilizador banido");
            setReloadAt(Date.now());
        } catch (e) { apiError(e); }
        finally { setBusyId(null); }
    };

    const openContentLink = (r) => {
        if (r.kind === "post" && r.target_id) return `/post/${r.target_id}`;
        if (r.kind === "comment" && r.target_preview?.post_id) return `/post/${r.target_preview.post_id}#c-${r.target_id}`;
        if (r.kind === "user" && r.target_username) return `/${r.target_username}`;
        return null;
    };

    return (
        <div className="space-y-4" data-testid="admin-reports">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                    <p className="ops-subtitle">Reports submetidos por utilizadores. Aprova, ignora ou aplica sanção (remover, suspender, banir). Os reports abertos surgem em destaque no menu.</p>
                </div>
                <button onClick={() => setReloadAt(Date.now())}
                    data-testid="admin-reports-refresh"
                    className="h-9 px-3 rounded-full bg-slate-100 hover:bg-slate-800/[0.1] inline-flex items-center gap-1.5 text-[13px]"
                ><RefreshCcw size={14} /> Atualizar</button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-0.5 bg-slate-50 rounded-full p-1 overflow-x-auto no-scrollbar max-w-full">
                    {["open", "closed", "all"].map((s) => (
                        <Hint key={s} focusable={false} side="bottom" text={REPORT_STATUS_HINTS[s]}>
                            <button onClick={() => { setStatus(s); setPage(1); }}
                                data-testid={`admin-reports-status-${s}`}
                                className={`h-8 px-2.5 sm:px-3 rounded-full text-[11.5px] sm:text-[12px] font-medium whitespace-nowrap ${status === s ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"}`}
                            >{s === "open" ? "Abertos" : s === "closed" ? "Resolvidos" : "Todos"}</button>
                        </Hint>
                    ))}
                </div>
                <div className="flex items-center gap-0.5 bg-slate-50 rounded-full p-1 overflow-x-auto no-scrollbar max-w-full">
                    {["all", "post", "comment", "user"].map((k) => (
                        <Hint key={k} focusable={false} side="bottom" text={REPORT_KIND_HINTS[k]}>
                            <button onClick={() => { setKind(k); setPage(1); }}
                                data-testid={`admin-reports-kind-${k}`}
                                className={`h-8 px-2.5 sm:px-3 rounded-full text-[11.5px] sm:text-[12px] font-medium whitespace-nowrap ${kind === k ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"}`}
                            >{k === "all" ? "Tudo" : k === "post" ? "Posts" : k === "comment" ? "Coment." : "Users"}</button>
                        </Hint>
                    ))}
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                {loading && <div className="px-4 py-3 text-[12px] text-slate-400 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> A carregar…</div>}
                {!loading && data.items.length === 0 && (
                    <div className="px-4 py-10 text-center text-slate-400 text-[13px]">Sem reports para os filtros atuais.</div>
                )}
                <ul className="divide-y divide-black/[0.05]">
                    {data.items.map((r) => (
                        <li key={r.id} data-testid={`admin-report-row-${r.id}`} className="px-4 py-3 flex items-start gap-3">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="ops-chip ops-chip--neutral uppercase tracking-wide">{r.kind}</span>
                                    <span className={r.status === "open" ? "ops-chip ops-chip--warn" : "ops-chip ops-chip--neutral"}>{r.status}</span>
                                    {r.reason && <span className="text-[11px] text-slate-600">motivo: {r.reason}</span>}
                                    <span className="text-[11px] text-slate-400 ml-auto">{fmtRelative(r.created_at)}</span>
                                </div>
                                <div className="mt-1.5 text-[12.5px] text-slate-700">
                                    Reportado por <strong>@{r.reporter?.username || "—"}</strong>
                                </div>
                                {r.target_preview && (r.target_preview.content || r.target_preview.username) && (
                                    <div className="mt-1.5 px-3 py-2 rounded-xl bg-slate-50 text-[12.5px] text-slate-800 whitespace-pre-wrap break-words">
                                        {r.target_preview.username
                                            ? <>Utilizador alvo: <strong>@{r.target_preview.username}</strong> ({r.target_preview.name})</>
                                            : (r.target_preview.content || "—")}
                                    </div>
                                )}
                                {r.detail && <div className="mt-1 text-[12px] text-slate-500 italic">"{r.detail}"</div>}
                                {r.status === "closed" && (
                                    <div className="mt-1 text-[11px] text-slate-500 font-mono">
                                        Resolvido como <strong>{r.resolved_action}</strong> {r.resolved_note ? `· ${r.resolved_note}` : ""} ({fmtRelative(r.resolved_at)})
                                    </div>
                                )}
                            </div>
                            {r.status === "open" && (
                                <div className="flex flex-col gap-1.5 shrink-0">
                                    {openContentLink(r) && (
                                        <a href={openContentLink(r)} target="_blank" rel="noopener noreferrer"
                                            data-testid={`admin-report-open-${r.id}`}
                                            className="h-8 px-3 rounded-full bg-slate-100 hover:bg-slate-800/[0.1] text-[12px] font-medium text-center inline-flex items-center justify-center gap-1">
                                            <Eye size={12} /> Abrir
                                        </a>
                                    )}
                                    <button onClick={() => resolve(r, "resolved")} disabled={busyId === r.id}
                                        data-testid={`admin-report-resolve-${r.id}`}
                                        className="h-8 px-3 rounded-full bg-slate-100 text-slate-700 hover:bg-slate-200 text-[12px] font-medium disabled:opacity-40">
                                        Aprovar
                                    </button>
                                    <button onClick={() => resolve(r, "dismissed")} disabled={busyId === r.id}
                                        data-testid={`admin-report-dismiss-${r.id}`}
                                        className="h-8 px-3 rounded-full bg-slate-100 hover:bg-slate-800/[0.1] text-[12px] font-medium disabled:opacity-40">
                                        Ignorar
                                    </button>
                                    {(r.kind === "post" || r.kind === "comment") && (
                                        <button onClick={() => resolve(r, "removed")} disabled={busyId === r.id}
                                            data-testid={`admin-report-remove-${r.id}`}
                                            className="h-8 px-3 rounded-full bg-red-500/10 text-red-600 hover:bg-red-500/20 text-[12px] font-medium disabled:opacity-40">
                                            Remover
                                        </button>
                                    )}
                                    {r.target_user_id && (
                                        <>
                                            <button onClick={() => suspendTarget(r)} disabled={busyId === r.id}
                                                data-testid={`admin-report-suspend-user-${r.id}`}
                                                className="h-8 px-3 rounded-full bg-red-50 text-red-700 hover:bg-red-100 text-[12px] font-medium disabled:opacity-40 inline-flex items-center justify-center gap-1">
                                                <Pause size={11} /> Suspender
                                            </button>
                                            <button onClick={() => banTarget(r)} disabled={busyId === r.id}
                                                data-testid={`admin-report-ban-user-${r.id}`}
                                                className="h-8 px-3 rounded-full bg-red-500/15 text-red-700 hover:bg-red-500/25 text-[12px] font-medium disabled:opacity-40 inline-flex items-center justify-center gap-1">
                                                <Ban size={11} /> Banir
                                            </button>
                                            {typeof onOpenUser === "function" && (
                                                <button onClick={() => onOpenUser({ id: r.target_user_id, username: r.target_username })}
                                                    data-testid={`admin-report-open-user-${r.id}`}
                                                    className="h-8 px-3 rounded-full bg-slate-100 hover:bg-slate-800/[0.1] text-[12px] font-medium disabled:opacity-40 inline-flex items-center justify-center gap-1">
                                                    <UserCheck size={11} /> Perfil
                                                </button>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
                <div className="px-4 pb-3"><Pager page={page} total={data.total} limit={data.limit} onChange={setPage} /></div>
            </div>
        </div>
    );
}

// -----------------------------------------------------------------
// COMMUNITIES
// -----------------------------------------------------------------
function CommunitiesTab() {
    const [q, setQ] = useState("");
    const [page, setPage] = useState(1);
    const [data, setData] = useState({ items: [], total: 0, limit: 20 });
    const [loading, setLoading] = useState(false);
    const [busyId, setBusyId] = useState(null);
    const [reloadAt, setReloadAt] = useState(0);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get("/admin/communities", { params: { q, page, limit: 20 } });
            setData(data);
        } catch (e) { apiError(e); }
        finally { setLoading(false); }
    }, [q, page, reloadAt]);
    useEffect(() => { load(); }, [load]);

    const onDelete = (c) => confirmDialog({
        title: `Eliminar comunidade c/${c.slug}?`,
        body: `${c.name} será removida. Posts continuam mas perdem a associação. Acção definitiva.`,
        confirmLabel: "Eliminar",
        danger: true,
    }).then((ok) => {
        if (!ok) return;
        setBusyId(c.slug);
        api.delete(`/admin/communities/${c.slug}`)
            .then(() => { toast.success(`Comunidade c/${c.slug} eliminada`); setReloadAt(Date.now()); })
            .catch(apiError)
            .finally(() => setBusyId(null));
    });

    return (
        <div className="space-y-4" data-testid="admin-communities">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                    <p className="ops-subtitle">Comunidades públicas e privadas. Gestão de visibilidade, regras, moderadores e remoção.</p>
                </div>
                <button onClick={() => setReloadAt(Date.now())}
                    data-testid="admin-communities-refresh"
                    className="h-9 px-3 rounded-full bg-slate-100 hover:bg-slate-800/[0.1] inline-flex items-center gap-1.5 text-[13px]"
                ><RefreshCcw size={14} /> Atualizar</button>
            </div>
            <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }}
                    placeholder="Pesquisar por slug, nome ou descrição"
                    data-testid="admin-communities-search"
                    className="w-full h-10 pl-9 pr-4 rounded-full bg-slate-50 focus:bg-white focus:ring-2 ring-slate-300 text-[13.5px] outline-none"
                />
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                {loading && <div className="px-4 py-3 text-[12px] text-slate-400 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> A carregar…</div>}
                {!loading && data.items.length === 0 && (
                    <div className="px-4 py-10 text-center text-slate-400 text-[13px]">Sem comunidades.</div>
                )}
                <ul className="divide-y divide-black/[0.05]">
                    {data.items.map((c) => (
                        <li key={c.slug} className="px-4 py-3 flex items-start gap-3" data-testid={`admin-community-row-${c.slug}`}>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-medium text-[14px]">c/{c.slug}</span>
                                    <span className="text-[12px] text-slate-500">· {c.name}</span>
                                    {c.category && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100">{c.category}</span>}
                                </div>
                                <div className="text-[12.5px] text-slate-600 line-clamp-2 mt-0.5">{c.description}</div>
                                <div className="text-[11px] text-slate-400 mt-1 font-mono">{c.members_count} membros · {fmtRelative(c.created_at)}</div>
                            </div>
                            <button onClick={() => onDelete(c)} disabled={busyId === c.slug}
                                data-testid={`admin-community-delete-${c.slug}`}
                                title="Eliminar comunidade"
                                className="w-8 h-8 grid place-items-center rounded-full hover:bg-red-500/15 disabled:opacity-40 text-red-600"
                            >
                                <Trash2 size={15} />
                            </button>
                        </li>
                    ))}
                </ul>
                <div className="px-4 pb-3"><Pager page={page} total={data.total} limit={data.limit} onChange={setPage} /></div>
            </div>
        </div>
    );
}

// -----------------------------------------------------------------
// EVENTS
// -----------------------------------------------------------------
function EventsTab() {
    const [q, setQ] = useState("");
    const [page, setPage] = useState(1);
    const [data, setData] = useState({ items: [], total: 0, limit: 20 });
    const [loading, setLoading] = useState(false);
    const [busyId, setBusyId] = useState(null);
    const [reloadAt, setReloadAt] = useState(0);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get("/admin/events", { params: { q, page, limit: 20 } });
            setData(data);
        } catch (e) { apiError(e); }
        finally { setLoading(false); }
    }, [q, page, reloadAt]);
    useEffect(() => { load(); }, [load]);

    const onDelete = (e) => confirmDialog({
        title: `Eliminar evento "${e.title}"?`,
        body: "Acção definitiva.",
        confirmLabel: "Eliminar",
        danger: true,
    }).then((ok) => {
        if (!ok) return;
        setBusyId(e.id);
        api.delete(`/admin/events/${e.id}`)
            .then(() => { toast.success("Evento eliminado"); setReloadAt(Date.now()); })
            .catch(apiError)
            .finally(() => setBusyId(null));
    });

    return (
        <div className="space-y-4" data-testid="admin-events">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                    <p className="ops-subtitle">Eventos publicados pela comunidade. Edição, remoção e destaque manual.</p>
                </div>
                <button onClick={() => setReloadAt(Date.now())}
                    data-testid="admin-events-refresh"
                    className="h-9 px-3 rounded-full bg-slate-100 hover:bg-slate-800/[0.1] inline-flex items-center gap-1.5 text-[13px]"
                ><RefreshCcw size={14} /> Atualizar</button>
            </div>
            <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }}
                    placeholder="Pesquisar por título, descrição ou local"
                    data-testid="admin-events-search"
                    className="w-full h-10 pl-9 pr-4 rounded-full bg-slate-50 focus:bg-white focus:ring-2 ring-slate-300 text-[13.5px] outline-none"
                />
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                {loading && <div className="px-4 py-3 text-[12px] text-slate-400 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> A carregar…</div>}
                {!loading && data.items.length === 0 && (
                    <div className="px-4 py-10 text-center text-slate-400 text-[13px]">Sem eventos.</div>
                )}
                <ul className="divide-y divide-black/[0.05]">
                    {data.items.map((e) => (
                        <li key={e.id} className="px-4 py-3 flex items-start gap-3" data-testid={`admin-event-row-${e.id}`}>
                            <div className="flex-1 min-w-0">
                                <div className="font-medium text-[14px]">{e.title}</div>
                                <div className="text-[12.5px] text-slate-600 line-clamp-2">{e.description}</div>
                                <div className="text-[11px] text-slate-400 mt-1 font-mono">
                                    {e.location ? `${e.location} · ` : ""}{fmtDate(e.starts_at)} · {e.attendees_count} interessados
                                </div>
                            </div>
                            <button onClick={() => onDelete(e)} disabled={busyId === e.id}
                                data-testid={`admin-event-delete-${e.id}`}
                                title="Eliminar evento"
                                className="w-8 h-8 grid place-items-center rounded-full hover:bg-red-500/15 disabled:opacity-40 text-red-600"
                            >
                                <Trash2 size={15} />
                            </button>
                        </li>
                    ))}
                </ul>
                <div className="px-4 pb-3"><Pager page={page} total={data.total} limit={data.limit} onChange={setPage} /></div>
            </div>
        </div>
    );
}

// -----------------------------------------------------------------
// SESSIONS
// -----------------------------------------------------------------
function SessionsTab() {
    const [page, setPage] = useState(1);
    const [data, setData] = useState({ items: [], total: 0, limit: 30 });
    const [loading, setLoading] = useState(false);
    const [busyId, setBusyId] = useState(null);
    const [reloadAt, setReloadAt] = useState(0);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get("/admin/sessions", { params: { page, limit: 30 } });
            setData(data);
        } catch (e) { apiError(e); }
        finally { setLoading(false); }
    }, [page, reloadAt]);
    useEffect(() => { load(); }, [load]);

    const revoke = (s) => confirmDialog({
        title: "Revogar sessão?",
        body: `A sessão de @${s.user?.username || s.user_id?.slice(0, 8)} será imediatamente terminada.`,
        confirmLabel: "Revogar",
        danger: true,
    }).then((ok) => {
        if (!ok) return;
        setBusyId(s.jti);
        api.post(`/admin/sessions/${s.jti}/revoke`)
            .then(() => { toast.success("Sessão revogada"); setReloadAt(Date.now()); })
            .catch(apiError)
            .finally(() => setBusyId(null));
    });

    return (
        <div className="space-y-4" data-testid="admin-sessions">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                    <p className="ops-subtitle">Sessões e dispositivos com acesso. Revoga sessões suspeitas individualmente ou força logout em massa por utilizador.</p>
                </div>
                <button onClick={() => setReloadAt(Date.now())}
                    data-testid="admin-sessions-refresh"
                    className="h-9 px-3 rounded-full bg-slate-100 hover:bg-slate-800/[0.1] inline-flex items-center gap-1.5 text-[13px]"
                ><RefreshCcw size={14} /> Atualizar</button>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                {loading && <div className="px-4 py-3 text-[12px] text-slate-400 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> A carregar…</div>}
                {!loading && data.items.length === 0 && (
                    <div className="px-4 py-10 text-center text-slate-400 text-[13px]">Sem sessões ativas.</div>
                )}
                <ul className="divide-y divide-black/[0.05]">
                    {data.items.map((s) => (
                        <li key={s.jti} className="px-4 py-3 flex items-center gap-3" data-testid={`admin-session-row-${s.jti}`}>
                            <Avatar user={s.user} size={32} />
                            <div className="flex-1 min-w-0">
                                <div className="font-medium text-[13.5px]">@{s.user?.username || s.user_id?.slice(0, 8)}</div>
                                <div className="text-[11.5px] text-slate-500 truncate font-mono">
                                    {s.ip} · {(s.ua || "").slice(0, 80)}
                                </div>
                                <div className="text-[11px] text-slate-400 font-mono">
                                    iniciada {fmtRelative(s.created_at)} · activa {fmtRelative(s.last_seen_at)}{s.source ? ` · ${s.source}` : ""}
                                </div>
                            </div>
                            <button onClick={() => revoke(s)} disabled={busyId === s.jti}
                                data-testid={`admin-session-revoke-${s.jti}`}
                                title="Revogar"
                                className="h-8 px-3 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-600 text-[12px] font-medium disabled:opacity-40 inline-flex items-center gap-1.5"
                            >
                                <LogOut size={13} /> Revogar
                            </button>
                        </li>
                    ))}
                </ul>
                <div className="px-4 pb-3"><Pager page={page} total={data.total} limit={data.limit} onChange={setPage} /></div>
            </div>
        </div>
    );
}

// -----------------------------------------------------------------
// AUDIT LOG
// -----------------------------------------------------------------
const ACTION_LABELS = {
    "user.verify": "Verificação",
    "user.admin_role": "Papel de admin",
    "user.ban": "Banimento",
    "user.unban": "Desbanimento",
    "user.force_logout": "Forçar saída",
    "user.delete": "Eliminar utilizador",
    "user.bulk": "Ação em massa (utilizadores)",
    "post.delete": "Eliminar post",
    "post.feature": "Destacar post",
    "post.bulk": "Ação em massa (posts)",
    "comment.delete": "Eliminar comentário",
    "story.delete": "Eliminar story",
    "hashtag.blacklist": "Lista negra de hashtags",
    "broadcast.send": "Difusão",
    "report.resolve": "Resolver report",
    "community.delete": "Eliminar comunidade",
    "event.delete": "Eliminar evento",
    "session.revoke": "Revogar sessão",
    "export.users": "Exportar utilizadores",
    "export.audit": "Exportar auditoria",
    "settings.update": "Definição alterada",
    "settings.reset": "Definição reposta",
};

// -----------------------------------------------------------------
// SETTINGS — Grupo A: Feature Flags + Limites Globais
// Tudo real, persistido em db.system_config, afeta endpoints
// em runtime. Cache 5s no servidor. Admins bypass todas as flags.
// -----------------------------------------------------------------
function FeatureFlagRow({ spec, currentValue, isOverride, onChange, onReset, saving }) {
    const enabled = !!currentValue;
    const isDestructiveOn = spec.key === "read_only_mode"; // ligar = mau (read-only global)
    const goodWhen = isDestructiveOn ? !enabled : enabled;
    return (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col gap-2 shadow-sm">
            <div className="flex items-start gap-3">
                <button
                    type="button"
                    disabled={saving}
                    onClick={() => onChange(!enabled)}
                    className={`mt-0.5 relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors ${enabled ? "bg-red-600" : "bg-slate-300"} ${saving ? "opacity-60 cursor-wait" : "cursor-pointer"}`}
                    aria-pressed={enabled}
                    data-testid={`flag-${spec.key}`}
                    title={enabled ? "Desligar" : "Ligar"}
                >
                    <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform ${enabled ? "translate-x-5" : "translate-x-0.5"}`} />
                </button>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="font-semibold text-[14px] text-slate-900">{spec.label}</div>
                        <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded ${goodWhen ? "bg-slate-50 text-slate-700" : "bg-red-50 text-red-700"}`}>
                            {enabled ? "Ligado" : "Desligado"}
                        </span>
                        {isOverride && (
                            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-50 text-slate-700" title="Valor alterado pelo admin (≠ default)">
                                Custom
                            </span>
                        )}
                    </div>
                    <div className="text-[12px] text-slate-500 mt-0.5">{spec.description}</div>
                    {(spec.applies_to || []).length > 0 && (
                        <div className="mt-1.5 text-[11px] text-slate-400 font-mono">
                            {spec.applies_to.slice(0, 3).join("  •  ")}
                            {(spec.applies_to || []).length > 3 ? "  •  …" : ""}
                        </div>
                    )}
                </div>
                {isOverride && (
                    <button
                        type="button"
                        onClick={onReset}
                        disabled={saving}
                        className="text-[11px] text-slate-600 hover:text-slate-900 px-2 py-1 rounded-md hover:bg-slate-100 flex items-center gap-1"
                        title={`Repor default (${spec.default ? "Ligado" : "Desligado"})`}
                        data-testid={`flag-reset-${spec.key}`}
                    >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Repor
                    </button>
                )}
            </div>
        </div>
    );
}

function LimitRow({ spec, currentValue, isOverride, onChange, onReset, saving }) {
    const [local, setLocal] = useState(String(currentValue ?? spec.default));
    useEffect(() => { setLocal(String(currentValue ?? spec.default)); }, [currentValue, spec.default]);
    const dirty = String(currentValue) !== String(local);
    const numVal = Number(local);
    const valid = Number.isFinite(numVal) && numVal >= (spec.min ?? -Infinity) && numVal <= (spec.max ?? Infinity);
    const commit = () => {
        if (!dirty || !valid) return;
        onChange(numVal);
    };
    return (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col gap-2 shadow-sm">
            <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="font-semibold text-[14px] text-slate-900">{spec.label}</div>
                        {isOverride && (
                            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-50 text-slate-700" title="Valor alterado pelo admin (≠ default)">
                                Custom
                            </span>
                        )}
                    </div>
                    <div className="text-[12px] text-slate-500 mt-0.5">{spec.description}</div>
                    <div className="text-[11px] text-slate-400 mt-1">
                        Mín: <b>{spec.min}</b> · Máx: <b>{spec.max}</b> · Default: <b>{spec.default}</b>
                    </div>
                    {(spec.applies_to || []).length > 0 && (
                        <div className="mt-1 text-[11px] text-slate-400 font-mono">
                            {spec.applies_to.slice(0, 3).join("  •  ")}
                            {(spec.applies_to || []).length > 3 ? "  •  …" : ""}
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <input
                        type="number"
                        value={local}
                        min={spec.min}
                        max={spec.max}
                        onChange={(e) => setLocal(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") commit(); }}
                        disabled={saving}
                        className={`w-24 px-2.5 py-1.5 rounded-lg border text-[13px] font-mono text-right ${valid ? "border-slate-300 focus:border-slate-400" : "border-red-400 focus:border-red-500"} bg-white disabled:opacity-60`}
                        data-testid={`limit-input-${spec.key}`}
                    />
                    <button
                        type="button"
                        onClick={commit}
                        disabled={saving || !dirty || !valid}
                        className={`text-[12px] px-3 py-1.5 rounded-lg font-medium transition-colors ${dirty && valid ? "bg-slate-900 text-white hover:bg-slate-800/85" : "bg-slate-100 text-slate-300 cursor-not-allowed"}`}
                        data-testid={`limit-save-${spec.key}`}
                    >
                        Guardar
                    </button>
                    {isOverride && (
                        <button
                            type="button"
                            onClick={onReset}
                            disabled={saving}
                            className="text-[11px] text-slate-600 hover:text-slate-900 px-2 py-1 rounded-md hover:bg-slate-100 flex items-center gap-1"
                            title={`Repor default (${spec.default})`}
                            data-testid={`limit-reset-${spec.key}`}
                        >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Repor
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

function StringSettingRow({ spec, currentValue, isOverride, onChange, onReset, saving }) {
    const [local, setLocal] = useState(currentValue ?? spec.default ?? "");
    useEffect(() => { setLocal(currentValue ?? spec.default ?? ""); }, [currentValue, spec.default]);
    const dirty = (currentValue ?? "") !== (local ?? "");
    const maxLen = spec.max_len ?? null;
    const minLen = spec.min_len ?? 0;
    const len = (local || "").length;
    const tooShort = minLen > 0 && len < minLen;
    const tooLong = maxLen != null && len > maxLen;
    const valid = !tooShort && !tooLong;
    const isUrl = spec.format === "url";
    const isColor = spec.format === "color";
    const isTextarea = spec.format === "textarea";
    const hasChoices = Array.isArray(spec.choices) && spec.choices.length > 0;

    const urlOk = !isUrl || !local || /^https?:\/\//i.test(local);
    const colorOk = !isColor || !local || /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(local);
    const formatOk = urlOk && colorOk;

    const commit = () => {
        if (!dirty || !valid || !formatOk) return;
        onChange(local);
    };

    return (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-col gap-2 shadow-sm">
            <div className="flex items-start gap-3 flex-wrap">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <div className="font-semibold text-[14px] text-slate-900">{spec.label}</div>
                        {isOverride && (
                            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-50 text-slate-700" title="Valor alterado pelo admin (≠ default)">
                                Custom
                            </span>
                        )}
                        {hasChoices && (
                            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-50 text-slate-500 font-mono">
                                {spec.choices.length} opções
                            </span>
                        )}
                        {isUrl && (
                            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-50 text-slate-500 font-mono">URL</span>
                        )}
                        {isColor && (
                            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-50 text-slate-500 font-mono">cor</span>
                        )}
                    </div>
                    <div className="text-[12px] text-slate-500 mt-0.5">{spec.description}</div>
                    {(spec.applies_to || []).length > 0 && (
                        <div className="mt-1 text-[11px] text-slate-400 font-mono truncate">
                            {spec.applies_to.slice(0, 2).join("  •  ")}
                        </div>
                    )}
                </div>
                {isOverride && (
                    <button
                        type="button"
                        onClick={onReset}
                        disabled={saving}
                        className="text-[11px] text-slate-600 hover:text-slate-900 px-2 py-1 rounded-md hover:bg-slate-100 flex items-center gap-1 shrink-0"
                        title={`Repor default ("${spec.default}")`}
                        data-testid={`content-reset-${spec.key}`}
                    >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Repor
                    </button>
                )}
            </div>
            <div className="flex items-stretch gap-2">
                {hasChoices ? (
                    <select
                        value={local}
                        onChange={(e) => setLocal(e.target.value)}
                        disabled={saving}
                        className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-[13px] bg-white focus:border-slate-400 outline-none disabled:opacity-60"
                        data-testid={`content-input-${spec.key}`}
                    >
                        {spec.choices.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                ) : isTextarea ? (
                    <textarea
                        value={local}
                        onChange={(e) => setLocal(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) commit(); }}
                        disabled={saving}
                        maxLength={maxLen || undefined}
                        rows={3}
                        placeholder={spec.default || ""}
                        className={`flex-1 px-3 py-2 rounded-lg border text-[13px] bg-white outline-none disabled:opacity-60 ${valid && formatOk ? "border-slate-300 focus:border-slate-400" : "border-red-400 focus:border-red-500"}`}
                        data-testid={`content-input-${spec.key}`}
                    />
                ) : isColor ? (
                    <>
                        <input
                            type="color"
                            value={colorOk && local ? local : "#000000"}
                            onChange={(e) => setLocal(e.target.value)}
                            disabled={saving}
                            className="h-10 w-12 rounded-lg border border-slate-300 cursor-pointer disabled:opacity-60"
                            aria-label={`${spec.label} (picker)`}
                            data-testid={`content-color-${spec.key}`}
                        />
                        <input
                            type="text"
                            value={local}
                            onChange={(e) => setLocal(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") commit(); }}
                            disabled={saving}
                            maxLength={maxLen || undefined}
                            placeholder={spec.default || "#RRGGBB"}
                            className={`flex-1 px-3 py-2 rounded-lg border text-[13px] font-mono bg-white outline-none disabled:opacity-60 ${valid && formatOk ? "border-slate-300 focus:border-slate-400" : "border-red-400 focus:border-red-500"}`}
                            data-testid={`content-input-${spec.key}`}
                        />
                    </>
                ) : (
                    <input
                        type={isUrl ? "url" : "text"}
                        value={local}
                        onChange={(e) => setLocal(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") commit(); }}
                        disabled={saving}
                        maxLength={maxLen || undefined}
                        placeholder={spec.default || (isUrl ? "https://…" : "")}
                        className={`flex-1 px-3 py-2 rounded-lg border text-[13px] bg-white outline-none disabled:opacity-60 ${valid && formatOk ? "border-slate-300 focus:border-slate-400" : "border-red-400 focus:border-red-500"}`}
                        data-testid={`content-input-${spec.key}`}
                    />
                )}
                <button
                    type="button"
                    onClick={commit}
                    disabled={saving || !dirty || !valid || !formatOk}
                    className={`text-[12px] px-3 rounded-lg font-medium transition-colors shrink-0 ${dirty && valid && formatOk ? "bg-slate-900 text-white hover:bg-slate-800/85" : "bg-slate-100 text-slate-300 cursor-not-allowed"}`}
                    data-testid={`content-save-${spec.key}`}
                >
                    Guardar
                </button>
            </div>
            <div className="flex items-center justify-between text-[10.5px] font-mono">
                <span className={tooLong ? "text-red-600" : tooShort ? "text-amber-600" : "text-slate-400"}>
                    {len}{maxLen ? `/${maxLen}` : ""} caracteres
                    {minLen > 0 && ` · min ${minLen}`}
                </span>
                {!formatOk && (
                    <span className="text-red-600">
                        {!urlOk && "URL inválido (precisa começar por http:// ou https://)"}
                        {!colorOk && "Cor inválida (formato esperado #RRGGBB)"}
                    </span>
                )}
                {!isOverride && (
                    <span className="text-slate-300 truncate ml-2">default: {spec.default || "(vazio)"}</span>
                )}
            </div>
        </div>
    );
}

// =============================================================================
// Settings categorisation (frontend-only, derived from key + group). Keeps the
// backend contract untouched while giving the admin UI a far richer breakdown
// than the 3 top-level buckets. Order in CATEGORY_ORDER drives render order.
// =============================================================================
const SETTINGS_CATEGORY_MAP = {
    flags: {
        // ---- FLAGS: explicit per-key category ----
        signup_open: "Contas & Registo",
        account_deletion_enabled: "Contas & Registo",
        new_users_auto_verify: "Contas & Registo",
        read_only_mode: "Contas & Registo",
        disposable_email_block_enabled: "Contas & Registo",

        posts_enabled: "Conteúdo & Posts",
        edit_post_enabled: "Conteúdo & Posts",
        delete_own_post_enabled: "Conteúdo & Posts",
        polls_enabled: "Conteúdo & Posts",
        hashtags_enabled: "Conteúdo & Posts",
        mentions_enabled: "Conteúdo & Posts",
        link_previews_enabled: "Conteúdo & Posts",
        uploads_enabled: "Conteúdo & Posts",

        likes_enabled: "Interacções",
        reposts_enabled: "Interacções",
        bookmarks_enabled: "Interacções",
        follows_enabled: "Interacções",
        reactions_enabled: "Interacções",
        comments_enabled: "Interacções",
        stories_enabled: "Interacções",

        dm_enabled: "Mensagens & Email",
        email_alerts_enabled: "Mensagens & Email",

        search_enabled: "Descoberta",
        trending_enabled: "Descoberta",

        communities_create_enabled: "Comunidades & Eventos",
        events_create_enabled: "Comunidades & Eventos",
        reports_enabled: "Moderação",

        password_require_digit: "Segurança · Password",
        password_require_uppercase: "Segurança · Password",
        password_require_symbol: "Segurança · Password",

        show_view_counts_publicly: "Privacidade Pública",
        show_like_counts_publicly: "Privacidade Pública",
    },
    limits: {
        max_posts_per_hour: "Posts",
        max_post_chars: "Posts",
        max_images_per_post: "Posts",
        max_hashtags_per_post: "Posts",
        max_urls_per_post: "Posts",
        max_mentions_per_post: "Posts",
        min_post_chars: "Posts",
        max_poll_options: "Posts",
        max_collaborators_per_post: "Posts",
        scheduled_posts_max_days_ahead: "Posts",
        max_drafts_per_user: "Posts",

        max_comments_per_hour: "Comentários",
        max_comment_chars: "Comentários",

        max_dms_per_hour: "Mensagens (DM)",
        max_dms_to_strangers_per_hour: "Mensagens (DM)",
        max_dm_chars: "Mensagens (DM)",

        max_bio_chars: "Perfil & Conta",
        max_display_name_chars: "Perfil & Conta",
        min_username_chars: "Perfil & Conta",
        max_username_chars: "Perfil & Conta",
        min_password_chars: "Perfil & Conta",

        session_ttl_days: "Auth & Sessões",
        min_account_age_minutes_to_post: "Auth & Sessões",

        max_follows_per_user: "Social",
        max_follows_per_hour: "Social",
        max_reactions_per_minute: "Social",
        max_mentions_per_hour: "Social",

        max_stories_per_day: "Stories & Reports",
        max_reports_per_day: "Stories & Reports",

        feed_page_size: "Feed",
        notification_retention_days: "Notificações",
        max_communities_owned_per_user: "Comunidades",
    },
    content: {
        platform_name: "Identidade da Plataforma",
        platform_tagline: "Identidade da Plataforma",
        logo_url: "Identidade da Plataforma",
        favicon_url: "Identidade da Plataforma",
        og_image_url: "Identidade da Plataforma",
        meta_title_suffix: "Identidade da Plataforma",

        primary_color: "Aparência",
        accent_color: "Aparência",
        default_theme: "Aparência",

        support_email: "Comunicação Pública",
        welcome_message: "Comunicação Pública",
        announcement_banner_text: "Comunicação Pública",
        announcement_banner_level: "Comunicação Pública",
        maintenance_message: "Comunicação Pública",

        terms_url: "Legal & RGPD",
        privacy_url: "Legal & RGPD",
        tos_version: "Legal & RGPD",
        compliance_dpo_email: "Legal & RGPD",
        cookie_banner_text: "Legal & RGPD",

        legal_company_name: "Empresa (footer/legal)",
        legal_company_address: "Empresa (footer/legal)",
        legal_company_vat: "Empresa (footer/legal)",
        legal_company_country: "Empresa (footer/legal)",

        default_locale: "Localização",
        default_timezone: "Localização",

        seo_default_description: "SEO",
        footer_text: "Rodapé",

        twitter_url: "Redes Sociais",
        instagram_url: "Redes Sociais",
        youtube_url: "Redes Sociais",
        discord_url: "Redes Sociais",
        github_url: "Redes Sociais",
        linkedin_url: "Redes Sociais",

        min_app_version: "Versionamento",
        signup_invite_code: "Registo (Invite)",
    },
};

// Display order for categories (per group). Keys not listed render last,
// alphabetically.
const SETTINGS_CATEGORY_ORDER = {
    flags: [
        "Contas & Registo",
        "Segurança · Password",
        "Conteúdo & Posts",
        "Interacções",
        "Mensagens & Email",
        "Descoberta",
        "Comunidades & Eventos",
        "Moderação",
        "Privacidade Pública",
    ],
    limits: [
        "Posts",
        "Comentários",
        "Mensagens (DM)",
        "Perfil & Conta",
        "Auth & Sessões",
        "Social",
        "Stories & Reports",
        "Feed",
        "Notificações",
        "Comunidades",
    ],
    content: [
        "Identidade da Plataforma",
        "Aparência",
        "Comunicação Pública",
        "Legal & RGPD",
        "Empresa (footer/legal)",
        "Localização",
        "SEO",
        "Rodapé",
        "Redes Sociais",
        "Versionamento",
        "Registo (Invite)",
    ],
};

function categorizeSetting(spec) {
    if (!spec) return "Outros";
    const map = SETTINGS_CATEGORY_MAP[spec.group] || {};
    return map[spec.key] || "Outros";
}

// Group an array of specs into ordered [ [category, items[]], ... ]
function groupSettingsByCategory(specs, group) {
    const byCat = new Map();
    for (const s of specs) {
        const cat = categorizeSetting(s);
        if (!byCat.has(cat)) byCat.set(cat, []);
        byCat.get(cat).push(s);
    }
    const order = SETTINGS_CATEGORY_ORDER[group] || [];
    const seen = new Set();
    const out = [];
    for (const cat of order) {
        if (byCat.has(cat)) {
            out.push([cat, byCat.get(cat)]);
            seen.add(cat);
        }
    }
    // Leftovers (alphabetical)
    const leftovers = [...byCat.keys()].filter((c) => !seen.has(c)).sort();
    for (const cat of leftovers) out.push([cat, byCat.get(cat)]);
    return out;
}

function normalize(s) {
    return (s || "").toString().toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

function settingMatchesQuery(spec, q) {
    if (!q) return true;
    const nq = normalize(q);
    return (
        normalize(spec.key).includes(nq) ||
        normalize(spec.label).includes(nq) ||
        normalize(spec.description).includes(nq)
    );
}

function SettingsTab() {
    const [data, setData] = useState(null);  // {registry, values, defaults, overrides, history}
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [reloadAt, setReloadAt] = useState(Date.now());
    const [query, setQuery] = useState("");
    const [onlyCustom, setOnlyCustom] = useState(false);
    const [collapsedCats, setCollapsedCats] = useState(() => new Set());

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get("/admin/settings");
            setData(res.data);
        } catch (e) { apiError(e); }
        finally { setLoading(false); }
    }, []);
    useEffect(() => { load(); }, [load, reloadAt]);

    const patchOne = async (key, value) => {
        setSaving(true);
        try {
            const res = await api.patch("/admin/settings", { updates: { [key]: value } });
            const updated = res.data?.updated || {};
            if (Object.keys(updated).length === 0) {
                toast.message("Sem alterações");
            } else {
                const ch = updated[key];
                const lbl = data?.registry?.find((s) => s.key === key)?.label || key;
                toast.success(`${lbl}: ${formatVal(ch.from)} → ${formatVal(ch.to)}`);
            }
            setReloadAt(Date.now());
        } catch (e) { apiError(e); }
        finally { setSaving(false); }
    };

    const resetOne = async (key) => {
        const ok = await confirmDialog({
            title: "Repor default",
            message: `Queres mesmo repor "${data?.registry?.find(s => s.key === key)?.label || key}" para o valor default?`,
            confirmLabel: "Repor",
        });
        if (!ok) return;
        setSaving(true);
        try {
            await api.post("/admin/settings/reset", { key });
            toast.success("Reposto para default");
            setReloadAt(Date.now());
        } catch (e) { apiError(e); }
        finally { setSaving(false); }
    };

    const resetAll = async () => {
        const ok = await confirmDialog({
            title: "Repor TUDO",
            message: "Vais repor todas as definições alteradas para os valores default. Continuar?",
            confirmLabel: "Repor tudo",
            destructive: true,
        });
        if (!ok) return;
        setSaving(true);
        try {
            const res = await api.post("/admin/settings/reset", { all: true });
            toast.success(`${res.data?.reset_count || 0} definição(ões) reposta(s)`);
            setReloadAt(Date.now());
        } catch (e) { apiError(e); }
        finally { setSaving(false); }
    };

    if (loading && !data) {
        return <div className="flex items-center justify-center py-16 text-slate-400"><Loader2 className="animate-spin" /></div>;
    }
    if (!data) return null;

    const flagsAll = (data.registry || []).filter((s) => s.group === "flags");
    const limitsAll = (data.registry || []).filter((s) => s.group === "limits");
    const contentsAll = (data.registry || []).filter((s) => s.group === "content");
    const overrideKeys = Object.keys(data.overrides || {});
    const totalCustom = overrideKeys.length;

    // Apply search + onlyCustom filter
    const overrideSet = new Set(overrideKeys);
    const applyFilters = (arr) => arr.filter((s) => {
        if (!settingMatchesQuery(s, query)) return false;
        if (onlyCustom && !overrideSet.has(s.key)) return false;
        return true;
    });
    const flagsFiltered = applyFilters(flagsAll);
    const limitsFiltered = applyFilters(limitsAll);
    const contentsFiltered = applyFilters(contentsAll);

    const flagsByCat = groupSettingsByCategory(flagsFiltered, "flags");
    const limitsByCat = groupSettingsByCategory(limitsFiltered, "limits");
    const contentsByCat = groupSettingsByCategory(contentsFiltered, "content");

    const totalVisible = flagsFiltered.length + limitsFiltered.length + contentsFiltered.length;
    const totalAll = flagsAll.length + limitsAll.length + contentsAll.length;

    // Helpers for the sticky sidebar nav (anchor links to each category)
    const slugify = (s) => "set-" + (s || "").toLowerCase()
        .normalize("NFD").replace(/\p{Diacritic}/gu, "")
        .replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const sectionAnchor = (group, cat) => `${slugify(group)}--${slugify(cat)}`;
    const scrollToAnchor = (id) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    const toggleCollapsed = (id) => {
        setCollapsedCats((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const renderGroup = (label, icon, group, byCat, total, totalVisibleGroup, footerHint) => {
        if (totalVisibleGroup === 0) return null;
        return (
            <div className="space-y-3" data-testid={`settings-group-${group}`}>
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-slate-400 font-mono px-1">
                    {icon}
                    <span>{label}</span>
                    <span className="text-slate-300">({totalVisibleGroup}{totalVisibleGroup !== total ? ` / ${total}` : ""})</span>
                    {footerHint && (
                        <span className="text-slate-300 normal-case tracking-normal">— {footerHint}</span>
                    )}
                </div>
                {byCat.map(([cat, items]) => {
                    const anchor = sectionAnchor(group, cat);
                    const collapsed = collapsedCats.has(anchor);
                    return (
                        <section
                            key={anchor}
                            id={anchor}
                            className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden scroll-mt-24"
                            data-testid={`settings-category-${anchor}`}
                        >
                            <header
                                className="px-3.5 py-2.5 border-b border-slate-100 flex items-center justify-between gap-3 bg-gradient-to-r from-slate-50/80 to-white cursor-pointer select-none hover:bg-slate-50"
                                onClick={() => toggleCollapsed(anchor)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleCollapsed(anchor); } }}
                                aria-expanded={!collapsed}
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    <ChevronRight className={`h-3.5 w-3.5 text-slate-400 transition-transform ${collapsed ? "" : "rotate-90"}`} />
                                    <div className="text-[13px] font-semibold text-slate-900 truncate">{cat}</div>
                                    <div className="text-[10.5px] font-mono text-slate-400">{items.length}</div>
                                </div>
                                {items.some((s) => overrideSet.has(s.key)) && (
                                    <div className="text-[10.5px] font-mono text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-1.5 py-0.5 whitespace-nowrap">
                                        {items.filter((s) => overrideSet.has(s.key)).length} customizada(s)
                                    </div>
                                )}
                            </header>
                            {!collapsed && (
                                <div className="p-2.5">
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-2.5">
                                        {items.map((spec) => {
                                            const commonProps = {
                                                key: spec.key,
                                                spec,
                                                currentValue: data.values?.[spec.key],
                                                isOverride: spec.key in (data.overrides || {}),
                                                onChange: (v) => patchOne(spec.key, v),
                                                onReset: () => resetOne(spec.key),
                                                saving,
                                            };
                                            if (group === "flags") return <FeatureFlagRow {...commonProps} />;
                                            if (group === "limits") return <LimitRow {...commonProps} />;
                                            return <StringSettingRow {...commonProps} />;
                                        })}
                                    </div>
                                </div>
                            )}
                        </section>
                    );
                })}
            </div>
        );
    };

    // Build sidebar entries
    const sidebarSections = [
        { group: "flags", label: "Feature Flags", icon: <ToggleRight className="h-3.5 w-3.5" />, byCat: flagsByCat, count: flagsFiltered.length },
        { group: "limits", label: "Limites", icon: <Gauge className="h-3.5 w-3.5" />, byCat: limitsByCat, count: limitsFiltered.length },
        { group: "content", label: "Conteúdo & Branding", icon: <FileText className="h-3.5 w-3.5" />, byCat: contentsByCat, count: contentsFiltered.length },
    ].filter((sec) => sec.count > 0);

    return (
        <div className="space-y-5">
            {/* Header */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-xl bg-[var(--coral-500)]/10 flex items-center justify-center shrink-0">
                        <Settings2 className="h-5 w-5 text-[var(--coral-500)]" />
                    </div>
                    <div>
                        <div className="text-[12px] text-slate-500 flex items-center gap-1.5">
                            {totalAll} definições organizadas em categorias. Aplicam-se em runtime (cache 5s). Admins fazem bypass.
                            <InfoTip side="bottom" text={{ title: "Como funcionam as definições", body: "Cada alteração entra em vigor para os utilizadores até 5s depois, sem reiniciar o servidor. Os admins não são afectados por flags nem limites. Cada chave guarda o seu default — usa 'Repor' para voltar atrás. As alterações ficam no audit log." }} />
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <div className="text-[11px] text-slate-400 font-mono whitespace-nowrap">
                        {totalCustom > 0 ? `${totalCustom} customizada(s)` : "todas em default"}
                    </div>
                    <button
                        type="button"
                        onClick={() => setReloadAt(Date.now())}
                        disabled={saving || loading}
                        className="h-9 px-3 rounded-lg border border-slate-200 text-[12px] text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
                        title="Recarregar"
                    >
                        <RefreshCcw className="h-3.5 w-3.5" />
                    </button>
                    {totalCustom > 0 && (
                        <button
                            type="button"
                            onClick={resetAll}
                            disabled={saving}
                            className="h-9 px-3 rounded-lg border border-red-200 text-[12px] text-red-600 hover:bg-red-50 flex items-center gap-1.5"
                            data-testid="settings-reset-all"
                        >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Repor tudo
                        </button>
                    )}
                </div>
            </div>

            {/* Search + filter bar */}
            <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="relative flex-1 min-w-0">
                    <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Procurar definições (nome, chave, descrição)…"
                        className="w-full h-9 pl-9 pr-9 rounded-lg border border-slate-200 bg-white text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--coral-500)]/30 focus:border-[var(--coral-500)]/40"
                        data-testid="settings-search"
                    />
                    {query && (
                        <button
                            type="button"
                            onClick={() => setQuery("")}
                            className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded-md hover:bg-slate-100 flex items-center justify-center text-slate-400"
                            title="Limpar"
                        >
                            <XIcon className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>
                <label className="flex items-center gap-2 text-[12px] text-slate-700 cursor-pointer whitespace-nowrap select-none">
                    <input
                        type="checkbox"
                        checked={onlyCustom}
                        onChange={(e) => setOnlyCustom(e.target.checked)}
                        className="h-4 w-4 accent-[var(--coral-500)]"
                        data-testid="settings-only-custom"
                    />
                    Só customizadas
                    {totalCustom > 0 && (
                        <span className="text-[10.5px] font-mono text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-1.5 py-0.5">
                            {totalCustom}
                        </span>
                    )}
                </label>
                <button
                    type="button"
                    onClick={() => setCollapsedCats(new Set())}
                    className="h-9 px-3 rounded-lg border border-slate-200 text-[12px] text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 whitespace-nowrap"
                    title="Expandir todas as categorias"
                >
                    <ToggleRight className="h-3.5 w-3.5" />
                    Expandir
                </button>
                <button
                    type="button"
                    onClick={() => {
                        const allIds = new Set();
                        [["flags", flagsByCat], ["limits", limitsByCat], ["content", contentsByCat]].forEach(([g, byCat]) => {
                            byCat.forEach(([cat]) => allIds.add(sectionAnchor(g, cat)));
                        });
                        setCollapsedCats(allIds);
                    }}
                    className="h-9 px-3 rounded-lg border border-slate-200 text-[12px] text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 whitespace-nowrap"
                    title="Recolher todas"
                >
                    <ToggleLeft className="h-3.5 w-3.5" />
                    Recolher
                </button>
            </div>

            {/* Layout: sidebar + content */}
            <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-5">
                {/* Sticky sidebar nav */}
                <aside className="hidden lg:block">
                    <div className="sticky top-4 space-y-3">
                        {sidebarSections.length === 0 && (
                            <div className="text-[12px] text-slate-400 px-3 py-2">Nada a mostrar.</div>
                        )}
                        {sidebarSections.map((sec) => (
                            <div key={sec.group} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                                <div className="px-3 py-2 border-b border-slate-100 flex items-center gap-2 text-[11px] uppercase tracking-wider text-slate-500 font-mono">
                                    {sec.icon}
                                    <span>{sec.label}</span>
                                    <span className="ml-auto text-slate-300">{sec.count}</span>
                                </div>
                                <ul className="py-1">
                                    {sec.byCat.map(([cat, items]) => {
                                        const anchor = sectionAnchor(sec.group, cat);
                                        const customCount = items.filter((s) => overrideSet.has(s.key)).length;
                                        return (
                                            <li key={anchor}>
                                                <button
                                                    type="button"
                                                    onClick={() => scrollToAnchor(anchor)}
                                                    className="w-full text-left px-3 py-1.5 text-[12.5px] text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                                    data-testid={`settings-nav-${anchor}`}
                                                >
                                                    <span className="truncate flex-1">{cat}</span>
                                                    <span className="text-[10.5px] font-mono text-slate-400">{items.length}</span>
                                                    {customCount > 0 && (
                                                        <span className="text-[10px] font-mono text-amber-700 bg-amber-50 border border-amber-200 rounded-sm px-1">
                                                            {customCount}
                                                        </span>
                                                    )}
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        ))}
                    </div>
                </aside>

                {/* Main content */}
                <div className="space-y-6 min-w-0">
                    {totalVisible === 0 && (
                        <div className="bg-white border border-slate-200 rounded-2xl p-10 shadow-sm text-center text-[13px] text-slate-500 flex flex-col items-center gap-2">
                            <Info className="h-5 w-5 text-slate-300" />
                            <div>Nenhuma definição corresponde aos filtros.</div>
                            <button
                                type="button"
                                onClick={() => { setQuery(""); setOnlyCustom(false); }}
                                className="mt-1 text-[12px] text-[var(--coral-500)] hover:underline"
                            >
                                Limpar filtros
                            </button>
                        </div>
                    )}

                    {renderGroup(
                        "Feature Flags",
                        <ToggleRight className="h-3.5 w-3.5" />,
                        "flags",
                        flagsByCat,
                        flagsAll.length,
                        flagsFiltered.length,
                        null,
                    )}
                    {renderGroup(
                        "Limites Globais",
                        <Gauge className="h-3.5 w-3.5" />,
                        "limits",
                        limitsByCat,
                        limitsAll.length,
                        limitsFiltered.length,
                        null,
                    )}
                    {renderGroup(
                        "Conteúdo, Branding & Legal",
                        <FileText className="h-3.5 w-3.5" />,
                        "content",
                        contentsByCat,
                        contentsAll.length,
                        contentsFiltered.length,
                        <>aplicado em runtime, exposto em <code>/api/public/settings</code></>,
                    )}
                </div>
            </div>

            {/* HISTÓRICO */}
            <div className="space-y-2">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-slate-400 font-mono px-1">
                    <History className="h-3.5 w-3.5" />
                    Histórico de alterações <span className="text-slate-300">(últimas {(data.history || []).length})</span>
                </div>
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                    {(data.history || []).length === 0 ? (
                        <div className="px-4 py-8 text-center text-[13px] text-slate-400 flex flex-col items-center gap-2">
                            <Info className="h-5 w-5 text-slate-300" />
                            Sem alterações registadas ainda.
                        </div>
                    ) : (
                        <ul className="divide-y divide-black/[0.05]">
                            {(data.history || []).map((h, i) => {
                                const label = data.registry?.find((s) => s.key === h.key)?.label || h.key;
                                return (
                                    <li key={i} className="px-4 py-2.5 flex items-center justify-between gap-3 text-[12.5px]">
                                        <div className="min-w-0 flex-1">
                                            <div className="text-slate-900 font-medium truncate">{label}</div>
                                            <div className="text-[11px] text-slate-400 font-mono">
                                                {formatVal(h.from)} → <b className="text-slate-700">{formatVal(h.to)}</b>
                                                {h.reason === "reset" && <span className="ml-2 text-red-600">(reset)</span>}
                                            </div>
                                        </div>
                                        <div className="text-[11px] text-slate-500 text-right whitespace-nowrap">
                                            <div>@{h.actor_username || "?"}</div>
                                            <div className="text-slate-400">{fmtRelative(h.at)}</div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}

function formatVal(v) {
    if (v === true) return "Ligado";
    if (v === false) return "Desligado";
    if (v == null) return "—";
    const s = String(v);
    if (s === "") return "(vazio)";
    if (s.length > 60) return `${s.slice(0, 57)}…`;
    return s;
}

function AuditTab() {
    const [action, setAction] = useState("");
    const [page, setPage] = useState(1);
    const [data, setData] = useState({ items: [], total: 0, limit: 50 });
    const [loading, setLoading] = useState(false);
    const [reloadAt, setReloadAt] = useState(0);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get("/admin/audit", { params: { action, page, limit: 50 } });
            setData(data);
        } catch (e) { apiError(e); }
        finally { setLoading(false); }
    }, [action, page, reloadAt]);
    useEffect(() => { load(); }, [load]);

    const actions = useMemo(() => Object.keys(ACTION_LABELS), []);

    const downloadCsv = async () => {
        try {
            const res = await api.get("/admin/export/audit.csv", { responseType: "blob" });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement("a");
            a.href = url; a.download = "lusorae_audit.csv";
            document.body.appendChild(a); a.click(); a.remove();
            window.URL.revokeObjectURL(url);
            toast.success("Audit log exportado");
        } catch (e) { apiError(e); }
    };

    return (
        <div className="space-y-4" data-testid="admin-audit">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                    <p className="ops-subtitle">Histórico imutável de todas as ações administrativas. Filtra por tipo de ação e exporta para CSV para auditoria externa.</p>
                </div>
                <div className="flex items-center gap-1.5">
                    <button onClick={downloadCsv}
                        data-testid="admin-audit-export"
                        className="h-9 px-3 rounded-full bg-slate-100 hover:bg-slate-800/[0.1] inline-flex items-center gap-1.5 text-[13px]"
                    ><Download size={14} /> Exportar CSV</button>
                    <button onClick={() => setReloadAt(Date.now())}
                        data-testid="admin-audit-refresh"
                        className="h-9 px-3 rounded-full bg-slate-100 hover:bg-slate-800/[0.1] inline-flex items-center gap-1.5 text-[13px]"
                    ><RefreshCcw size={14} /> Atualizar</button>
                </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
                <select value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }}
                    data-testid="admin-audit-action-select"
                    className="h-10 px-3 rounded-full bg-slate-50 text-[13px] outline-none">
                    <option value="">Todas as acções</option>
                    {actions.map((a) => <option key={a} value={a}>{ACTION_LABELS[a]}</option>)}
                </select>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                {loading && <div className="px-4 py-3 text-[12px] text-slate-400 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> A carregar…</div>}
                {!loading && data.items.length === 0 && (
                    <div className="px-4 py-10 text-center text-slate-400 text-[13px]">Sem registos no audit log.</div>
                )}
                <ul className="divide-y divide-black/[0.05]">
                    {data.items.map((a) => (
                        <li key={a.id} className="px-4 py-2.5 text-[12.5px] flex items-center gap-3 font-mono" data-testid={`admin-audit-row-${a.id}`}>
                            <span className="text-slate-400 text-[11px] w-[110px] shrink-0">{fmtRelative(a.created_at)}</span>
                            <span className="ops-chip ops-chip--system shrink-0">
                                {ACTION_LABELS[a.action] || a.action}
                            </span>
                            <span className="text-slate-700 truncate">
                                @{a.actor_username} → {a.target_kind}:{(a.target_id || "").slice(0, 12)}
                            </span>
                            {a.detail && Object.keys(a.detail).length > 0 && (
                                <span className="text-slate-400 truncate ml-auto">{JSON.stringify(a.detail)}</span>
                            )}
                        </li>
                    ))}
                </ul>
                <div className="px-4 pb-3"><Pager page={page} total={data.total} limit={data.limit} onChange={setPage} /></div>
            </div>
        </div>
    );
}

// -----------------------------------------------------------------
// COMMENTS
// -----------------------------------------------------------------
function CommentsTab() {
    const [q, setQ] = useState("");
    const [page, setPage] = useState(1);
    const [data, setData] = useState({ items: [], total: 0, limit: 25 });
    const [loading, setLoading] = useState(false);
    const [busyId, setBusyId] = useState(null);
    const [reloadAt, setReloadAt] = useState(0);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get("/admin/comments", { params: { q, page, limit: 25 } });
            setData(data);
        } catch (e) { apiError(e); }
        finally { setLoading(false); }
    }, [q, page, reloadAt]);
    useEffect(() => { load(); }, [load]);

    const onDelete = (c) => confirmDialog({
        title: "Eliminar comentário?",
        body: "O comentário e todas as respostas em árvore serão eliminados. Não pode ser desfeito.",
        confirmLabel: "Eliminar",
        danger: true,
    }).then(async (ok) => {
        if (!ok) return;
        setBusyId(c.id);
        try {
            const { data } = await api.delete(`/admin/comments/${c.id}`);
            toast.success(`${data.deleted} comentário(s) eliminado(s)`);
            setReloadAt(Date.now());
        } catch (e) { apiError(e); }
        finally { setBusyId(null); }
    });

    return (
        <div className="space-y-4" data-testid="admin-comments">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                    <p className="ops-subtitle">Moderação de comentários: revisão por autor, remoção rápida e ações ao utilizador autor (silenciar, banir).</p>
                </div>
                <button onClick={() => setReloadAt(Date.now())}
                    data-testid="admin-comments-refresh"
                    className="h-9 px-3 rounded-full bg-slate-100 hover:bg-slate-800/[0.1] inline-flex items-center gap-1.5 text-[13px]"
                ><RefreshCcw size={14} /> Atualizar</button>
            </div>

            <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input type="text" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }}
                    placeholder="Pesquisar por conteúdo, ID do comentário ou post"
                    data-testid="admin-comments-search"
                    className="w-full h-10 pl-9 pr-4 rounded-full bg-slate-50 focus:bg-white focus:ring-2 ring-slate-300 text-[13.5px] outline-none"
                />
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                {loading && <div className="px-4 py-3 text-[12px] text-slate-400 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> A carregar…</div>}
                {!loading && data.items.length === 0 && <div className="px-4 py-10 text-center text-slate-400 text-[13px]">Sem comentários.</div>}
                <ul className="divide-y divide-black/[0.05]">
                    {data.items.map((c) => (
                        <li key={c.id} data-testid={`admin-comment-row-${c.id}`} className="px-4 py-3 flex items-start gap-3">
                            <Avatar user={{ avatar: c.author_avatar, username: c.author_username, name: c.author_name }} size={36} />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-medium text-[13.5px]">{c.author_name || c.author_username || "—"}</span>
                                    <span className="font-mono text-[11px] text-slate-400">@{c.author_username}</span>
                                    {c.parent_id && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-50 text-slate-700">resposta</span>}
                                    <span className="text-[11px] text-slate-400 ml-auto">{fmtRelative(c.created_at)}</span>
                                </div>
                                <div className="text-[13px] text-slate-800 mt-1 whitespace-pre-wrap break-words">{c.content}</div>
                                <div className="mt-1 flex items-center gap-3 text-[11px] text-slate-400 font-mono">
                                    <span>{c.likes_count} ♥</span>
                                    <span>{c.replies_count} respostas</span>
                                    <a href={`/post/${c.post_id}`} target="_blank" rel="noopener noreferrer"
                                        className="hover:text-slate-700 underline-offset-2 hover:underline">
                                        post {c.post_id?.slice(0, 8)}
                                    </a>
                                </div>
                            </div>
                            <button
                                onClick={() => onDelete(c)} disabled={busyId === c.id}
                                data-testid={`admin-comment-delete-${c.id}`}
                                title="Eliminar comentário e respostas"
                                className="w-8 h-8 grid place-items-center rounded-full hover:bg-red-500/15 disabled:opacity-40 text-red-600 shrink-0"
                            >
                                <Trash2 size={15} />
                            </button>
                        </li>
                    ))}
                </ul>
                <div className="px-4 pb-3"><Pager page={page} total={data.total} limit={data.limit} onChange={setPage} /></div>
            </div>
        </div>
    );
}


// -----------------------------------------------------------------
// STORIES
// -----------------------------------------------------------------
const STORY_FILTERS = [
    { key: "active", label: "Ativas", hint: "Stories visíveis agora — ainda dentro da janela de 24h." },
    { key: "expired", label: "Expiradas", hint: "Stories que já passaram das 24h e deixaram de ser visíveis aos utilizadores." },
    { key: "all", label: "Todas", hint: "Todas as stories, activas e expiradas." },
];

function StoriesTab() {
    const [q, setQ] = useState("");
    const [filter, setFilter] = useState("active");
    const [page, setPage] = useState(1);
    const [data, setData] = useState({ items: [], total: 0, limit: 25 });
    const [loading, setLoading] = useState(false);
    const [busyId, setBusyId] = useState(null);
    const [reloadAt, setReloadAt] = useState(0);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get("/admin/stories", { params: { q, filter, page, limit: 25 } });
            setData(data);
        } catch (e) { apiError(e); }
        finally { setLoading(false); }
    }, [q, filter, page, reloadAt]);
    useEffect(() => { load(); }, [load]);

    const onDelete = (s) => confirmDialog({
        title: "Eliminar story?",
        body: "A story será removida e tirada de quaisquer highlights. Não pode ser desfeito.",
        confirmLabel: "Eliminar",
        danger: true,
    }).then(async (ok) => {
        if (!ok) return;
        setBusyId(s.id);
        try {
            await api.delete(`/admin/stories/${s.id}`);
            toast.success("Story eliminada");
            setReloadAt(Date.now());
        } catch (e) { apiError(e); }
        finally { setBusyId(null); }
    });

    return (
        <div className="space-y-4" data-testid="admin-stories">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                    <p className="ops-subtitle">Stories activas neste momento. Expiram automaticamente após 24h — moderação rápida com remoção forçada.</p>
                </div>
                <button onClick={() => setReloadAt(Date.now())}
                    data-testid="admin-stories-refresh"
                    className="h-9 px-3 rounded-full bg-slate-100 hover:bg-slate-800/[0.1] inline-flex items-center gap-1.5 text-[13px]"
                ><RefreshCcw size={14} /> Atualizar</button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
                <div className="relative flex-1 min-w-[160px] sm:min-w-[240px]">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }}
                        placeholder="Pesquisar por legenda, ID ou autor"
                        data-testid="admin-stories-search"
                        className="w-full h-10 pl-9 pr-4 rounded-full bg-slate-50 focus:bg-white focus:ring-2 ring-slate-300 text-[13.5px] outline-none"
                    />
                </div>
                <div className="flex items-center gap-0.5 bg-slate-50 rounded-full p-1 overflow-x-auto no-scrollbar max-w-full">
                    {STORY_FILTERS.map((f) => (
                        <Hint key={f.key} focusable={false} side="bottom" text={f.hint}>
                            <button onClick={() => { setFilter(f.key); setPage(1); }}
                                data-testid={`admin-stories-filter-${f.key}`}
                                className={`h-8 px-2.5 sm:px-3 rounded-full text-[11.5px] sm:text-[12px] font-medium whitespace-nowrap ${filter === f.key ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"}`}
                            >{f.label}</button>
                        </Hint>
                    ))}
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                {loading && <div className="px-4 py-3 text-[12px] text-slate-400 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> A carregar…</div>}
                {!loading && data.items.length === 0 && <div className="px-4 py-10 text-center text-slate-400 text-[13px]">Sem stories.</div>}
                <ul className="divide-y divide-black/[0.05]">
                    {data.items.map((s) => (
                        <li key={s.id} data-testid={`admin-story-row-${s.id}`} className="px-4 py-3 flex items-center gap-3">
                            <Avatar user={{ avatar: s.author_avatar, username: s.author_username, name: s.author_name }} size={36} />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-medium text-[13.5px]">@{s.author_username || "—"}</span>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 inline-flex items-center gap-0.5">
                                        {s.media_type === "video" ? <Video size={10} /> : <ImageIcon size={10} />} {s.media_type}
                                    </span>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">{s.audience}</span>
                                    {s.is_active
                                        ? <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-700">ativa</span>
                                        : <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">expirada</span>
                                    }
                                </div>
                                {s.caption && <div className="text-[13px] text-slate-700 mt-0.5 line-clamp-2 break-words">{s.caption}</div>}
                                <div className="mt-0.5 text-[11px] text-slate-400 font-mono">
                                    {s.viewers_count} 👁 · {s.reactions_count} reactions · expira {fmtRelative(s.expires_at)} · {s.id.slice(0, 8)}
                                </div>
                            </div>
                            <button
                                onClick={() => onDelete(s)} disabled={busyId === s.id}
                                data-testid={`admin-story-delete-${s.id}`}
                                title="Eliminar story"
                                className="w-8 h-8 grid place-items-center rounded-full hover:bg-red-500/15 disabled:opacity-40 text-red-600 shrink-0"
                            >
                                <Trash2 size={15} />
                            </button>
                        </li>
                    ))}
                </ul>
                <div className="px-4 pb-3"><Pager page={page} total={data.total} limit={data.limit} onChange={setPage} /></div>
            </div>
        </div>
    );
}


// -----------------------------------------------------------------
// HASHTAGS (with blacklist)
// -----------------------------------------------------------------
const HASHTAG_FILTERS = [
    { key: "all", label: "Todas", hint: "Todas as hashtags em uso, sem filtro." },
    { key: "active", label: "Ativas", hint: "Hashtags em circulação normal — aparecem no trending e no explore." },
    { key: "blacklisted", label: "Blacklist", hint: "Hashtags bloqueadas: saem do trending e do explore, mas continuam visíveis no perfil dos autores." },
];

function HashtagsTab() {
    const [q, setQ] = useState("");
    const [filter, setFilter] = useState("all");
    const [page, setPage] = useState(1);
    const [data, setData] = useState({ items: [], total: 0, limit: 30 });
    const [loading, setLoading] = useState(false);
    const [busyTag, setBusyTag] = useState(null);
    const [reloadAt, setReloadAt] = useState(0);
    const [manualTag, setManualTag] = useState("");

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get("/admin/hashtags", { params: { q, filter, page, limit: 30 } });
            setData(data);
        } catch (e) { apiError(e); }
        finally { setLoading(false); }
    }, [q, filter, page, reloadAt]);
    useEffect(() => { load(); }, [load]);

    const toggleBlacklist = async (tag, willBlacklist) => {
        let reason = "";
        if (willBlacklist) {
            const r = window.prompt(`Adicionar #${tag} à blacklist? (motivo opcional para audit log)`, "");
            if (r === null) return;
            reason = r || "";
        } else {
            const ok = await confirmDialog({
                title: `Remover #${tag} da blacklist?`,
                body: "A hashtag voltará a poder aparecer em trending e explore.",
                confirmLabel: "Remover da blacklist",
            });
            if (!ok) return;
        }
        setBusyTag(tag);
        try {
            const { data } = await api.post(`/admin/hashtags/${encodeURIComponent(tag)}/blacklist`, { reason });
            toast.success(data.blacklisted ? `#${data.tag} bloqueada` : `#${data.tag} desbloqueada`);
            setReloadAt(Date.now());
        } catch (e) { apiError(e); }
        finally { setBusyTag(null); }
    };

    const onManualBlacklist = async () => {
        const t = (manualTag || "").trim().toLowerCase().replace(/^#/, "");
        if (!t) return;
        const reason = window.prompt(`Adicionar #${t} à blacklist? (motivo opcional)`, "");
        if (reason === null) return;
        setBusyTag(t);
        try {
            const { data } = await api.post(`/admin/hashtags/${encodeURIComponent(t)}/blacklist`, { reason: reason || "" });
            if (!data.blacklisted) {
                // toggled off — re-toggle to ensure it's on
                await api.post(`/admin/hashtags/${encodeURIComponent(t)}/blacklist`, { reason: reason || "" });
            }
            toast.success(`#${t} bloqueada`);
            setManualTag("");
            setReloadAt(Date.now());
        } catch (e) { apiError(e); }
        finally { setBusyTag(null); }
    };

    return (
        <div className="space-y-4" data-testid="admin-hashtags">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0 flex-1">
                    <p className="ops-subtitle">Hashtags em uso. Bloqueia tags com conteúdo problemático — bloqueadas saem do trending e do explore, mas permanecem visíveis no perfil dos autores.</p>
                </div>
                <button onClick={() => setReloadAt(Date.now())}
                    data-testid="admin-hashtags-refresh"
                    className="h-9 px-3 rounded-full bg-slate-100 hover:bg-slate-800/[0.1] inline-flex items-center gap-1.5 text-[13px]"
                ><RefreshCcw size={14} /> Atualizar</button>
            </div>

            <div className="ops-callout ops-callout--warn">
                <AlertCircle size={14} />
                <div>
                    Hashtags em blacklist são <strong>removidas</strong> do trending e do <strong>explore</strong>.
                    Os posts permanecem visíveis no perfil dos autores, mas deixam de ser amplificados publicamente.
                </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
                <div className="relative flex-1 min-w-[160px] sm:min-w-[200px]">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }}
                        placeholder="Pesquisar hashtag…"
                        data-testid="admin-hashtags-search"
                        className="w-full h-10 pl-9 pr-4 rounded-full bg-slate-50 focus:bg-white focus:ring-2 ring-slate-300 text-[13.5px] outline-none"
                    />
                </div>
                <div className="flex items-center gap-0.5 bg-slate-50 rounded-full p-1 overflow-x-auto no-scrollbar max-w-full">
                    {HASHTAG_FILTERS.map((f) => (
                        <Hint key={f.key} focusable={false} side="bottom" text={f.hint}>
                            <button onClick={() => { setFilter(f.key); setPage(1); }}
                                data-testid={`admin-hashtags-filter-${f.key}`}
                                className={`h-8 px-2.5 sm:px-3 rounded-full text-[11.5px] sm:text-[12px] font-medium whitespace-nowrap ${filter === f.key ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"}`}
                            >{f.label}</button>
                        </Hint>
                    ))}
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-3 flex items-center gap-2 flex-wrap">
                <input type="text" value={manualTag} onChange={(e) => setManualTag(e.target.value)}
                    placeholder="Adicionar hashtag à blacklist (#exemplo)"
                    data-testid="admin-hashtags-manual"
                    onKeyDown={(e) => { if (e.key === "Enter") onManualBlacklist(); }}
                    className="flex-1 min-w-[200px] h-9 px-3 rounded-full bg-slate-50 focus:bg-white focus:ring-2 ring-slate-300 text-[13px] outline-none"
                />
                <button onClick={onManualBlacklist} disabled={!manualTag.trim()}
                    data-testid="admin-hashtags-manual-add"
                    className="h-9 px-4 rounded-full bg-red-600 text-white text-[12.5px] font-medium hover:bg-red-700 disabled:opacity-40 inline-flex items-center gap-1.5">
                    <EyeOff size={13} /> Bloquear
                </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                {loading && <div className="px-4 py-3 text-[12px] text-slate-400 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> A carregar…</div>}
                {!loading && data.items.length === 0 && <div className="px-4 py-10 text-center text-slate-400 text-[13px]">Sem hashtags.</div>}
                <ul className="divide-y divide-black/[0.05]">
                    {data.items.map((h) => (
                        <li key={h.tag} data-testid={`admin-hashtag-row-${h.tag}`} className={`px-4 py-2.5 flex items-center gap-3 ${h.blacklisted ? "bg-red-500/[0.04]" : ""}`}>
                            <Hash size={14} className={h.blacklisted ? "text-red-600/70" : "text-slate-400"} />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className={`font-medium text-[14px] ${h.blacklisted ? "line-through text-red-700" : "text-slate-800"}`}>#{h.tag}</span>
                                    <span className="font-mono text-[11.5px] text-slate-400">{fmtNum(h.count)} posts</span>
                                    {h.blacklisted && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-600 font-medium inline-flex items-center gap-0.5">
                                        <EyeOff size={9} /> blacklist
                                    </span>}
                                </div>
                                {h.blacklisted && h.blacklist_reason && (
                                    <div className="text-[11.5px] text-red-700/80 mt-0.5">Motivo: {h.blacklist_reason}</div>
                                )}
                                {h.blacklisted && h.blacklisted_at && (
                                    <div className="text-[10.5px] text-slate-400 mt-0.5 font-mono">desde {fmtDate(h.blacklisted_at)}</div>
                                )}
                            </div>
                            <button
                                onClick={() => toggleBlacklist(h.tag, !h.blacklisted)}
                                disabled={busyTag === h.tag}
                                data-testid={`admin-hashtag-toggle-${h.tag}`}
                                className={`h-8 px-3 rounded-full text-[12px] font-medium disabled:opacity-40 inline-flex items-center gap-1.5 ${
                                    h.blacklisted
                                        ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                                        : "bg-red-500/10 text-red-600 hover:bg-red-500/20"
                                }`}
                            >
                                {h.blacklisted ? <><Eye size={13} /> Desbloquear</> : <><EyeOff size={13} /> Bloquear</>}
                            </button>
                        </li>
                    ))}
                </ul>
                <div className="px-4 pb-3"><Pager page={page} total={data.total} limit={data.limit} onChange={setPage} /></div>
            </div>
        </div>
    );
}


// -----------------------------------------------------------------
// BROADCAST
// -----------------------------------------------------------------
const AUDIENCES = [
    { key: "all", label: "Todos os utilizadores" },
    { key: "verified", label: "Verificados" },
    { key: "non_banned", label: "Não banidos" },
    { key: "new_accounts_7d", label: "Novos (últimos 7d)" },
    { key: "admins", label: "Admins" },
];

function BroadcastTab() {
    const [text, setText] = useState("");
    const [link, setLink] = useState("");
    const [audience, setAudience] = useState("all");
    const [city, setCity] = useState("");
    const [count, setCount] = useState(null);
    const [busy, setBusy] = useState(false);
    const [sending, setSending] = useState(false);

    const refreshCount = useCallback(async () => {
        setBusy(true);
        try {
            const { data } = await api.get("/admin/broadcast/audience-count", { params: { audience, city } });
            setCount(data.count);
        } catch (e) { apiError(e); }
        finally { setBusy(false); }
    }, [audience, city]);

    useEffect(() => {
        const t = setTimeout(refreshCount, 250);
        return () => clearTimeout(t);
    }, [refreshCount]);

    const onSend = async () => {
        const t = text.trim();
        if (!t) {
            toast.error("Texto vazio");
            return;
        }
        if (t.length > 280) {
            toast.error("Máximo 280 caracteres");
            return;
        }
        const ok = await confirmDialog({
            title: `Enviar broadcast para ${count ?? "?"} utilizador(es)?`,
            body: `Cada destinatário recebe uma notificação. Esta acção fica no audit log e não pode ser desfeita.\n\nTexto: "${t}"`,
            confirmLabel: "Enviar agora",
            danger: true,
        });
        if (!ok) return;
        setSending(true);
        try {
            const { data } = await api.post("/admin/broadcast", {
                text: t, audience, link: link.trim(), city: city.trim(),
            });
            toast.success(`Broadcast enviado para ${data.sent} utilizador(es)`);
            setText(""); setLink("");
            refreshCount();
        } catch (e) { apiError(e); }
        finally { setSending(false); }
    };

    const remaining = 280 - text.length;

    return (
        <div className="space-y-4" data-testid="admin-broadcast">
            <div className="min-w-0">
                <p className="ops-subtitle">Envia uma notificação a todos os utilizadores ou a um segmento. Ação irreversível — usa com critério.</p>
            </div>

            <div className="ops-callout ops-callout--warn">
                <Megaphone size={14} />
                <div>
                    A broadcast envia uma notificação <strong>real</strong> e persistente para cada destinatário (e push via WS se estiverem online).
                    Usa com critério — uma vez enviada não pode ser revertida.
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3">
                <label className="block">
                    <div className="text-[12px] font-medium text-slate-600 mb-1">Mensagem (até 280)</div>
                    <textarea value={text} onChange={(e) => setText(e.target.value)}
                        rows={3} maxLength={300}
                        placeholder="Ex.: Nova versão do Lusorae já disponível 🎉"
                        data-testid="admin-broadcast-text"
                        className="w-full px-3 py-2 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 ring-slate-300 text-[14px] outline-none resize-none"
                    />
                    <div className={`text-[11px] mt-1 font-mono ${remaining < 0 ? "text-red-600" : "text-slate-400"}`}>
                        {remaining} caracteres restantes
                    </div>
                </label>

                <label className="block">
                    <div className="text-[12px] font-medium text-slate-600 mb-1">Link (opcional)</div>
                    <input type="text" value={link} onChange={(e) => setLink(e.target.value)}
                        placeholder="ex: /trending ou https://..."
                        data-testid="admin-broadcast-link"
                        className="w-full h-10 px-3 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 ring-slate-300 text-[13.5px] outline-none"
                    />
                </label>

                <div className="grid sm:grid-cols-2 gap-3">
                    <label className="block">
                        <div className="text-[12px] font-medium text-slate-600 mb-1">Audiência</div>
                        <select value={audience} onChange={(e) => setAudience(e.target.value)}
                            data-testid="admin-broadcast-audience"
                            className="w-full h-10 px-3 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 ring-slate-300 text-[13.5px] outline-none">
                            {AUDIENCES.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}
                        </select>
                    </label>
                    <label className="block">
                        <div className="text-[12px] font-medium text-slate-600 mb-1">Cidade (filtro extra opcional)</div>
                        <input type="text" value={city} onChange={(e) => setCity(e.target.value)}
                            placeholder="Ex.: Lisboa"
                            data-testid="admin-broadcast-city"
                            className="w-full h-10 px-3 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 ring-slate-300 text-[13.5px] outline-none"
                        />
                    </label>
                </div>

                <div className="flex items-center justify-between gap-3 pt-1 flex-wrap">
                    <div className="text-[12.5px] text-slate-600 inline-flex items-center gap-1.5" data-testid="admin-broadcast-count">
                        <UsersIcon size={13} />
                        {busy ? <Loader2 size={13} className="animate-spin" /> : <strong className="font-mono">{count ?? "—"}</strong>}
                        destinatário(s) com este filtro
                    </div>
                    <button onClick={onSend}
                        disabled={sending || !text.trim() || count === 0}
                        data-testid="admin-broadcast-send"
                        className="h-10 px-5 rounded-full bg-slate-900 text-white text-[13px] font-medium hover:bg-slate-800/85 disabled:opacity-40 inline-flex items-center gap-1.5">
                        {sending ? <Loader2 size={14} className="animate-spin" /> : <Megaphone size={14} />}
                        Enviar broadcast
                    </button>
                </div>
            </div>
        </div>
    );
}


// -----------------------------------------------------------------
// USER DRAWER
// -----------------------------------------------------------------
// -----------------------------------------------------------------
// USER DRAWER — multi-tab, full moderation surface
// -----------------------------------------------------------------
function ActionButton({ icon: Icon, label, onClick, kind = "default", testid, disabled, title }) {
    const tone = {
        default: "bg-slate-50 hover:bg-slate-200 text-slate-700",
        danger: "bg-red-500/10 hover:bg-red-500/20 text-red-700",
        warn: "bg-red-50 hover:bg-red-100 text-red-700",
        good: "bg-slate-100 hover:bg-slate-200 text-slate-800",
        primary: "bg-slate-900 text-white hover:bg-slate-800/85",
    }[kind] || "bg-slate-50 hover:bg-slate-200 text-slate-700";
    return (
        <button
            onClick={onClick}
            data-testid={testid}
            disabled={disabled}
            title={title}
            className={`h-9 sm:h-10 px-3 rounded-2xl text-[12.5px] font-medium inline-flex items-center justify-center gap-1.5 transition disabled:opacity-40 disabled:cursor-not-allowed ${tone}`}
        >
            <Icon size={13} />{label}
        </button>
    );
}

function UserDrawer({ user, onClose }) {
    const [tab, setTab] = useState("profile");
    const [detail, setDetail] = useState(null);
    const [posts, setPosts] = useState(null);
    const [comments, setComments] = useState(null);
    const [reports, setReports] = useState(null);
    const [sessions, setSessions] = useState(null);
    const [activity, setActivity] = useState(null);
    const [presence, setPresence] = useState(null);
    const [history, setHistory] = useState(null);
    const [followers, setFollowers] = useState(null);
    const [mutuals, setMutuals] = useState(null);
    const [conversations, setConversations] = useState(null);
    const [ips, setIps] = useState(null);
    const [devices, setDevices] = useState(null);
    const [loginAlerts, setLoginAlerts] = useState(null);
    const [recentActions, setRecentActions] = useState(null);
    const [loading, setLoading] = useState(false);
    const [actionBusy, setActionBusy] = useState(null);

    const reloadDetail = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { data } = await api.get(`/admin/users/${user.id}`);
            setDetail(data);
        } catch (e) { apiError(e); }
        finally { setLoading(false); }
    }, [user]);

    useEffect(() => { reloadDetail(); }, [reloadDetail]);

    useEffect(() => {
        if (!user) return;
        const lazy = async (cond, fn) => { if (cond) { try { await fn(); } catch (e) { apiError(e); } } };
        lazy(tab === "posts" && posts === null, async () => {
            const { data } = await api.get(`/admin/users/${user.id}/posts`, { params: { page: 1, limit: 20 } });
            setPosts(data);
        });
        lazy(tab === "comments" && comments === null, async () => {
            const { data } = await api.get(`/admin/users/${user.id}/comments`, { params: { page: 1, limit: 20 } });
            setComments(data);
        });
        lazy(tab === "reports" && reports === null, async () => {
            const { data } = await api.get(`/admin/users/${user.id}/reports`);
            setReports(data);
        });
        lazy(tab === "activity" && activity === null, async () => {
            const [a, pr, h, ra, la] = await Promise.all([
                api.get(`/admin/users/${user.id}/activity`),
                api.get(`/admin/users/${user.id}/presence`),
                api.get(`/admin/users/${user.id}/history?limit=30`),
                api.get(`/admin/users/${user.id}/recent-actions?limit=30`),
                api.get(`/admin/users/${user.id}/login-alerts?limit=20`),
            ]);
            setActivity(a.data); setPresence(pr.data); setHistory(h.data); setRecentActions(ra.data); setLoginAlerts(la.data);
        });
        lazy(tab === "connections" && followers === null, async () => {
            const [f, m, c] = await Promise.all([
                api.get(`/admin/users/${user.id}/followers?limit=100`),
                api.get(`/admin/users/${user.id}/mutuals?limit=100`),
                api.get(`/admin/users/${user.id}/conversations`),
            ]);
            setFollowers(f.data); setMutuals(m.data); setConversations(c.data);
        });
        lazy(tab === "access" && sessions === null, async () => {
            const [s, ipsR, dvs] = await Promise.all([
                api.get(`/admin/users/${user.id}/sessions`),
                api.get(`/admin/users/${user.id}/ips`),
                api.get(`/admin/users/${user.id}/devices`),
            ]);
            setSessions(s.data); setIps(ipsR.data); setDevices(dvs.data);
        });
    }, [tab, user, posts, comments, reports, activity, followers, sessions]);

    // ---- moderation actions ----
    const act = async (key, doIt, msg) => {
        setActionBusy(key);
        try {
            await doIt();
            toast.success(msg);
            await reloadDetail();
            // Invalidate dependent tabs
            setSessions(null);
            setRecentActions(null);
        } catch (e) { apiError(e); }
        finally { setActionBusy(null); }
    };

    const promptInt = (label, def) => {
        const raw = window.prompt(label, String(def));
        if (raw === null) return null;
        const n = parseInt(raw, 10);
        if (isNaN(n) || n <= 0) { toast.error("Valor inválido"); return null; }
        return n;
    };
    const promptStr = (label, def = "") => {
        const r = window.prompt(label, def);
        if (r === null) return null;
        return String(r).trim();
    };

    const doMute = () => {
        const m = promptInt("Silenciar por quantos minutos?", 60);
        if (m === null) return;
        const r = promptStr("Motivo (opcional):", "");
        if (r === null) return;
        return act("mute", () => api.post(`/admin/users/${u.id}/mute`, { minutes: m, reason: r }), "Conta silenciada.");
    };
    const doUnmute = () => act("unmute", () => api.post(`/admin/users/${u.id}/unmute`), "Silêncio removido.");
    const doShadowMute = () => {
        const r = promptStr(u.shadow_muted ? "Remover shadow-mute. Confirmas? (deixa vazio para sim)" : "Motivo do shadow-mute (opcional):", "");
        if (r === null) return;
        return act("shadow", () => api.post(`/admin/users/${u.id}/shadow-mute`, { reason: r }), u.shadow_muted ? "Shadow-mute removido." : "Shadow-mute aplicado.");
    };
    const doSuspend = () => {
        const m = promptInt("Suspender por quantos minutos? (1440 = 24h)", 1440);
        if (m === null) return;
        const r = promptStr("Motivo (obrigatório):", "");
        if (r === null) return;
        if (!r) { toast.error("Motivo obrigatório"); return; }
        return act("suspend", () => api.post(`/admin/users/${u.id}/suspend`, { minutes: m, reason: r }), "Conta suspensa.");
    };
    const doUnsuspend = () => act("unsuspend", () => api.post(`/admin/users/${u.id}/unsuspend`), "Suspensão removida.");
    const doRateLimit = () => {
        const p = promptStr("Limite de POSTS por janela (vazio = sem limite):", String((u.rate_limit && u.rate_limit.max_posts) || ""));
        if (p === null) return;
        const c = promptStr("Limite de COMENTÁRIOS por janela (vazio = sem limite):", String((u.rate_limit && u.rate_limit.max_comments) || ""));
        if (c === null) return;
        const w = promptInt("Janela (horas):", (u.rate_limit && u.rate_limit.window_hours) || 1);
        if (w === null) return;
        const r = promptStr("Motivo (opcional):", (u.rate_limit && u.rate_limit.reason) || "");
        if (r === null) return;
        const payload = {
            max_posts: p === "" ? null : parseInt(p, 10),
            max_comments: c === "" ? null : parseInt(c, 10),
            window_hours: w,
            reason: r,
        };
        return act("ratelimit", () => api.post(`/admin/users/${u.id}/rate-limit`, payload), "Rate-limit aplicado.");
    };
    const doFeature = () => act("feature", () => api.post(`/admin/users/${u.id}/feature`), u.featured_account ? "Destaque removido." : "Conta destacada.");
    const doSuspicious = () => {
        const r = promptStr(u.flagged_suspicious ? "Remover flag. Confirma? (deixa vazio para sim)" : "Motivo de suspeita:", "");
        if (r === null) return;
        return act("suspicious", () => api.post(`/admin/users/${u.id}/mark-suspicious`, { reason: r }), u.flagged_suspicious ? "Flag removida." : "Marcado como suspeito.");
    };
    const doSafe = () => {
        if (!window.confirm("Marcar como SEGURO? Isto limpa: suspeito, mute, shadow-mute e suspensão.")) return;
        return act("safe", () => api.post(`/admin/users/${u.id}/mark-safe`), "Conta marcada como segura.");
    };
    const doVerify = () => act("verify", () => api.post(`/admin/users/${u.id}/verify`, { verified: !u.verified }), u.verified ? "Verificação removida." : "Conta verificada.");
    const doBan = () => {
        if (u.banned) {
            return act("unban", () => api.post(`/admin/users/${u.id}/unban`), "Conta desbanida.");
        }
        const r = promptStr("Motivo do banimento:", "");
        if (r === null) return;
        if (!r) { toast.error("Motivo obrigatório"); return; }
        return act("ban", () => api.post(`/admin/users/${u.id}/ban`, { reason: r }), "Conta banida.");
    };
    const doForceLogout = () => {
        if (!window.confirm("Forçar logout em TODAS as sessões deste utilizador?")) return;
        return act("logout", () => api.post(`/admin/users/${u.id}/force-logout`), "Sessões revogadas.");
    };
    const doFreeze = () => {
        if (u.frozen) {
            if (!window.confirm("Descongelar conta? O utilizador volta a poder publicar/comentar/gostar/seguir.")) return;
            return act("freeze", () => api.post(`/admin/users/${u.id}/unfreeze`), "Conta descongelada.");
        }
        const r = promptStr("Motivo (opcional):", "");
        if (r === null) return;
        if (!window.confirm("Congelar conta? Vai impedir todas as interações (post/comment/like/follow/mensagem) e revoga todas as sessões. Ler continua a funcionar.")) return;
        return act("freeze", () => api.post(`/admin/users/${u.id}/freeze`, { reason: r }), "Conta congelada.");
    };
    const doReset2FA = () => {
        if (!window.confirm("Reset 2FA: o utilizador perderá o gerador atual e códigos de backup. Continuar?")) return;
        return act("reset2fa", () => api.post(`/admin/users/${u.id}/reset-2fa`), "2FA reposto.");
    };
    const doAdminToggle = () => {
        const msg = u.is_admin ? "Remover privilégios de administrador?" : "Promover a administrador?";
        if (!window.confirm(msg)) return;
        return act("admin", () => api.post(`/admin/users/${u.id}/admin`, { is_admin: !u.is_admin }), u.is_admin ? "Privilégios removidos." : "Promovido a admin.");
    };

    if (!user) return null;
    const u = detail || user;
    const drawerTabs = [
        { k: "profile", l: "Perfil" },
        { k: "activity", l: "Atividade" },
        { k: "connections", l: "Conexões" },
        { k: "posts", l: "Posts" },
        { k: "comments", l: "Coment." },
        { k: "access", l: "Acesso" },
        { k: "reports", l: "Reports" },
        { k: "actions", l: "Ações" },
    ];

    return (
        <div className="fixed inset-0 z-[80]" data-testid="admin-user-drawer">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
            <aside className="absolute right-0 top-0 bottom-0 w-full sm:max-w-[560px] bg-white shadow-2xl flex flex-col">
                <header className="px-3 sm:px-4 py-3 border-b border-slate-200 flex items-center gap-2.5 sm:gap-3">
                    <Avatar user={u} size={40} />
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-display text-[15px] sm:text-[16px] tracking-tight truncate">{u.name || u.username}</span>
                            {u.verified && <span className="ops-chip ops-chip--info">verificado</span>}
                            {u.is_admin && <span className="ops-chip ops-chip--system">admin</span>}
                            {u.featured_account && <span className="ops-chip ops-chip--info">destacado</span>}
                            {u.banned && <span className="ops-chip ops-chip--danger">banido</span>}
                            {u.suspended_active && <span className="ops-chip ops-chip--danger">suspenso</span>}
                            {u.muted_active && <span className="ops-chip ops-chip--neutral">silenciado</span>}
                            {u.shadow_muted && <span className="ops-chip ops-chip--neutral">shadow</span>}
                            {u.frozen && <span className="ops-chip ops-chip--neutral">congelado</span>}
                            {u.flagged_suspicious && <span className="ops-chip ops-chip--warn">suspeito</span>}
                        </div>
                        <div className="text-[11.5px] sm:text-[12px] text-slate-500 truncate font-mono">@{u.username} · {u.email}</div>
                    </div>
                    <button onClick={onClose} data-testid="admin-user-drawer-close"
                        aria-label="Fechar"
                        className="w-9 h-9 grid place-items-center rounded-full hover:bg-slate-100 shrink-0">
                        <XIcon size={16} />
                    </button>
                </header>

                <nav className="px-3 pt-3 flex items-center gap-1 bg-white border-b border-slate-100 overflow-x-auto no-scrollbar">
                    {drawerTabs.map((t) => (
                        <button key={t.k} onClick={() => setTab(t.k)}
                            data-testid={`admin-user-drawer-tab-${t.k}`}
                            className={`h-8 px-3 rounded-full text-[12px] font-medium whitespace-nowrap mb-2 ${tab === t.k ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"}`}
                        >{t.l}</button>
                    ))}
                </nav>

                <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-3 space-y-3">
                    {loading && !detail && <div className="flex items-center justify-center py-10 text-slate-400"><Loader2 className="animate-spin" /></div>}

                    {/* PROFILE */}
                    {tab === "profile" && detail && (
                        <dl className="space-y-2 text-[13px]" data-testid="admin-user-drawer-profile">
                            {[
                                ["ID", u.id],
                                ["Utilizador", `@${u.username}`],
                                ["Nome", u.name || "—"],
                                ["Email", u.email],
                                ["Cidade", u.city || "—"],
                                ["Bio", u.bio || "—"],
                                ["Criado", fmtDate(u.created_at)],
                                ["Última atividade", fmtDate(u.last_seen)],
                                ["Seguidores", `${u.followers_count} · segue ${u.following_count}`],
                                ["Privado", u.private ? "sim" : "não"],
                                ["Verificado", u.verified ? "sim" : "não"],
                                ["Admin", u.is_admin ? "sim" : "não"],
                                ["Destacada", u.featured_account ? "sim" : "não"],
                                ["2FA", u.two_fa_enabled ? "activo" : "inactivo"],
                                ["Banido", u.banned ? `sim — ${u.ban_reason || "(sem motivo)"}` : "não"],
                                ["Suspenso", u.suspended_active ? `até ${fmtDate(u.suspended_until)} — ${u.suspend_reason || "(sem motivo)"}` : "não"],
                                ["Silenciado", u.muted_active ? `até ${fmtDate(u.muted_until)} — ${u.mute_reason || "(sem motivo)"}` : "não"],
                                ["Silêncio oculto", u.shadow_muted ? `sim — ${u.shadow_mute_reason || "(sem motivo)"}` : "não"],
                                ["Congelado", u.frozen ? `sim — ${u.frozen_reason || "(sem motivo)"}` : "não"],
                                ["Suspeito", u.flagged_suspicious ? `sim — ${u.suspicious_reason || "(sem motivo)"}` : "não"],
                                ["Limite de taxa", (u.rate_limit && (u.rate_limit.max_posts != null || u.rate_limit.max_comments != null)) ? `posts ${u.rate_limit.max_posts ?? "∞"} / coments ${u.rate_limit.max_comments ?? "∞"} por ${u.rate_limit.window_hours}h` : "sem limite"],
                                ["Posts", u.posts_count],
                                ["Comentários", u.comments_count],
                                ["Stories", u.stories_count],
                                ["Reports contra", u.reports_against_count],
                                ["Reports feitos", u.reports_made_count],
                                ["Sessões ativas", u.active_sessions],
                            ].map(([k, v]) => (
                                <div key={k} className="flex flex-col sm:flex-row sm:items-start gap-0.5 sm:gap-2 py-1.5 border-b border-slate-100">
                                    <dt className="sm:w-32 shrink-0 text-[10.5px] sm:text-[11.5px] uppercase tracking-wider text-slate-400 font-mono">{k}</dt>
                                    <dd className="flex-1 break-words text-slate-800 text-[12.5px] sm:text-[13px]">{v == null || v === "" ? "—" : String(v)}</dd>
                                </div>
                            ))}
                        </dl>
                    )}

                    {/* ACTIVITY */}
                    {tab === "activity" && (
                        activity === null ? <div className="text-slate-400"><Loader2 className="animate-spin inline" size={14} /> A carregar…</div> :
                        <div className="space-y-4" data-testid="admin-user-drawer-activity">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                <div className="bg-slate-50 rounded-2xl p-3"><div className="text-[10px] uppercase font-mono text-slate-400">Posts 24h/7d</div><div className="font-display text-[18px]">{activity.posts.d1}/{activity.posts.d7}</div></div>
                                <div className="bg-slate-50 rounded-2xl p-3"><div className="text-[10px] uppercase font-mono text-slate-400">Coment. 24h/7d</div><div className="font-display text-[18px]">{activity.comments.d1}/{activity.comments.d7}</div></div>
                                <div className="bg-slate-50 rounded-2xl p-3"><div className="text-[10px] uppercase font-mono text-slate-400">Stories ativos</div><div className="font-display text-[18px]">{activity.stories_active}</div></div>
                                <div className="bg-slate-50 rounded-2xl p-3"><div className="text-[10px] uppercase font-mono text-slate-400">Likes dados</div><div className="font-display text-[18px]">{activity.likes_given}</div></div>
                            </div>
                            {presence && (
                                <div className="bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2.5 text-[12.5px]">
                                    <strong>Presença:</strong> {presence.online ? "online" : "offline"} · {presence.ws_sockets} socket(s) · {presence.active_sessions} sessões ativas · visto {fmtRelative(presence.last_seen)}
                                </div>
                            )}
                            {history && history.items.length > 0 && (
                                <div>
                                    <div className="text-[10.5px] uppercase tracking-wider text-slate-400 font-mono mb-1.5">Histórico recente ({history.count})</div>
                                    <ul className="space-y-1.5">
                                        {history.items.slice(0, 15).map((e, idx) => (
                                            <li key={`${e.kind}-${e.id || idx}`} className="px-3 py-1.5 rounded-xl bg-slate-50 text-[12px]">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-200 font-medium">{e.kind}</span>
                                                    <span className="ml-auto text-[10.5px] text-slate-400 font-mono">{fmtRelative(e.created_at)}</span>
                                                </div>
                                                {e.content && <div className="mt-1 line-clamp-2">{e.content}</div>}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {recentActions && recentActions.items.length > 0 && (
                                <div>
                                    <div className="text-[10.5px] uppercase tracking-wider text-slate-400 font-mono mb-1.5">Ações admin recentes ({recentActions.total})</div>
                                    <ul className="space-y-1">
                                        {recentActions.items.slice(0, 10).map((a) => (
                                            <li key={a.id} className="px-3 py-1.5 rounded-xl bg-red-50/50 text-[12px]">
                                                <span className="font-mono text-[10.5px] text-red-700">{a.action}</span>
                                                <span className="text-slate-500 ml-1.5">· {fmtRelative(a.created_at)}</span>
                                                {a.payload && Object.keys(a.payload).length > 0 && (
                                                    <div className="text-[10.5px] text-slate-500 mt-0.5 font-mono break-all">{JSON.stringify(a.payload)}</div>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {loginAlerts && loginAlerts.items.length > 0 && (
                                <div>
                                    <div className="text-[10.5px] uppercase tracking-wider text-slate-400 font-mono mb-1.5">Login alerts ({loginAlerts.total})</div>
                                    <ul className="space-y-1">
                                        {loginAlerts.items.slice(0, 10).map((a, i) => (
                                            <li key={a.id || i} className="px-3 py-1.5 rounded-xl bg-red-50/50 text-[12px]">
                                                <span className="font-mono text-[10.5px] text-red-700">login_alert</span>
                                                <span className="ml-1.5 text-slate-600">{a.title || a.message || ""}</span>
                                                <span className="ml-auto text-[10.5px] text-slate-400 float-right">{fmtRelative(a.created_at)}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}

                    {/* CONNECTIONS */}
                    {tab === "connections" && (
                        followers === null ? <div className="text-slate-400"><Loader2 className="animate-spin inline" size={14} /> A carregar…</div> :
                        <div className="space-y-4" data-testid="admin-user-drawer-connections">
                            <div>
                                <div className="text-[10.5px] uppercase tracking-wider text-slate-400 font-mono mb-1.5">Seguidores ({followers?.total || 0})</div>
                                {(!followers || followers.items.length === 0) ? <div className="text-[12px] text-slate-400 italic">Nenhum</div> :
                                    <ul className="space-y-1">{followers.items.slice(0, 30).map((f) => (
                                        <li key={f.id} className="px-2.5 py-1.5 rounded-xl bg-slate-50 text-[12px] flex items-center gap-2">
                                            <Avatar user={f} size={26} />
                                            <span className="font-medium truncate">{f.name || f.username}</span>
                                            <span className="font-mono text-[11px] text-slate-400 truncate">@{f.username}</span>
                                            {f.verified && <span className="text-[9.5px] px-1 py-0.5 rounded-full bg-blue-500/10 text-blue-600">v</span>}
                                            {f.banned && <span className="text-[9.5px] px-1 py-0.5 rounded-full bg-red-500/10 text-red-600">b</span>}
                                            <span className={`ml-auto w-2 h-2 rounded-full ${f.online ? "bg-red-600" : "bg-slate-300"}`} />
                                        </li>
                                    ))}</ul>
                                }
                            </div>
                            <div>
                                <div className="text-[10.5px] uppercase tracking-wider text-slate-400 font-mono mb-1.5">Mutuals ({mutuals?.total || 0})</div>
                                {(!mutuals || mutuals.items.length === 0) ? <div className="text-[12px] text-slate-400 italic">Nenhum</div> :
                                    <ul className="space-y-1">{mutuals.items.slice(0, 30).map((f) => (
                                        <li key={f.id} className="px-2.5 py-1.5 rounded-xl bg-slate-50 text-[12px] flex items-center gap-2">
                                            <Avatar user={f} size={26} />
                                            <span className="font-medium truncate">{f.name || f.username}</span>
                                            <span className="font-mono text-[11px] text-slate-400 truncate">@{f.username}</span>
                                        </li>
                                    ))}</ul>
                                }
                            </div>
                            <div>
                                <div className="text-[10.5px] uppercase tracking-wider text-slate-400 font-mono mb-1.5">Conversas DM ({conversations?.total || 0})</div>
                                {(!conversations || conversations.items.length === 0) ? <div className="text-[12px] text-slate-400 italic">Nenhuma conversa</div> :
                                    <ul className="space-y-1">{conversations.items.slice(0, 20).map((c, i) => (
                                        <li key={c.key || i} className="px-3 py-1.5 rounded-xl bg-slate-50 text-[12px]">
                                            <div className="flex items-center gap-1.5">
                                                <MessageSquare size={11} className="text-slate-400" />
                                                <span className="font-medium">@{c.peer_username || c.peer_id?.slice(0,8) || "?"}</span>
                                                {c.peer_banned && <span className="text-[9.5px] px-1 py-0.5 rounded-full bg-red-500/10 text-red-600">banido</span>}
                                                <span className="ml-auto text-[10.5px] text-slate-400 font-mono">{fmtRelative(c.last_at)}</span>
                                            </div>
                                            {c.last_message_preview && <div className="text-[11.5px] text-slate-500 mt-0.5 italic line-clamp-1">"{c.last_message_preview}"</div>}
                                        </li>
                                    ))}</ul>
                                }
                            </div>
                        </div>
                    )}

                    {/* POSTS */}
                    {tab === "posts" && (
                        posts === null ? <div className="text-slate-400"><Loader2 className="animate-spin inline" size={14} /> A carregar…</div> :
                        posts.items.length === 0 ? <div className="text-slate-400 text-[13px] py-6 text-center">Sem posts.</div> :
                        <ul className="space-y-2" data-testid="admin-user-drawer-posts-list">
                            {posts.items.map((p) => (
                                <li key={p.id} className="px-3 py-2 rounded-xl bg-slate-50">
                                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono">
                                        <span>{p.kind}</span>
                                        {p.featured && <Star size={11} className="text-red-600" fill="currentColor" />}
                                        <span className="ml-auto">{fmtRelative(p.created_at)}</span>
                                    </div>
                                    <div className="text-[13px] mt-1 line-clamp-3 break-words">{p.content || "—"}</div>
                                    <div className="text-[11px] text-slate-400 mt-1 font-mono">{p.likes_count} ♥ · {p.comments_count} 💬</div>
                                </li>
                            ))}
                        </ul>
                    )}

                    {/* COMMENTS */}
                    {tab === "comments" && (
                        comments === null ? <div className="text-slate-400"><Loader2 className="animate-spin inline" size={14} /> A carregar…</div> :
                        comments.items.length === 0 ? <div className="text-slate-400 text-[13px] py-6 text-center">Sem comentários.</div> :
                        <ul className="space-y-2" data-testid="admin-user-drawer-comments-list">
                            {comments.items.map((c) => (
                                <li key={c.id} className="px-3 py-2 rounded-xl bg-slate-50">
                                    <div className="text-[13px] break-words">{c.content}</div>
                                    <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                                        {c.likes_count} ♥ · {fmtRelative(c.created_at)} · post {c.post_id?.slice(0,8)}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}

                    {/* ACCESS — sessions + IPs + devices */}
                    {tab === "access" && (
                        sessions === null ? <div className="text-slate-400"><Loader2 className="animate-spin inline" size={14} /> A carregar…</div> :
                        <div className="space-y-4" data-testid="admin-user-drawer-access">
                            <div>
                                <div className="text-[10.5px] uppercase tracking-wider text-slate-400 font-mono mb-1.5">Sessões ({sessions?.items?.length || 0})</div>
                                {(!sessions || sessions.items.length === 0) ? <div className="text-[12px] text-slate-400 italic">Sem sessões</div> :
                                    <ul className="space-y-1.5">{sessions.items.map((s) => (
                                        <li key={s.jti} className="px-3 py-2 rounded-xl bg-slate-50 text-[12px]">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${s.revoked ? "bg-slate-200 text-slate-500" : "bg-slate-100 text-slate-700"}`}>
                                                    {s.revoked ? "revogada" : "ativa"}
                                                </span>
                                                <span className="font-mono text-[10.5px] text-slate-500 truncate">{(s.user_agent || "").slice(0, 60) || "—"}</span>
                                            </div>
                                            <div className="text-[11px] text-slate-400 mt-0.5 font-mono">
                                                {s.ip || "—"} · visto {fmtRelative(s.last_seen_at)} · jti {s.jti?.slice(0,8)}
                                            </div>
                                        </li>
                                    ))}</ul>
                                }
                            </div>
                            <div>
                                <div className="text-[10.5px] uppercase tracking-wider text-slate-400 font-mono mb-1.5 inline-flex items-center gap-1.5"><Globe size={11} /> IPs distintos ({ips?.total || 0})</div>
                                {(!ips || ips.items.length === 0) ? <div className="text-[12px] text-slate-400 italic">Nenhum</div> :
                                    <ul className="space-y-1">{ips.items.slice(0, 20).map((i) => (
                                        <li key={i.ip} className="px-3 py-1.5 rounded-xl bg-slate-50 text-[12px]">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className="font-mono">{i.ip}</span>
                                                <span className="text-[10.5px] text-slate-500">· {i.sessions} sessões ({i.active_sessions} ativas)</span>
                                                <span className="ml-auto text-[10.5px] text-slate-400 font-mono">visto {fmtRelative(i.last_seen)}</span>
                                            </div>
                                        </li>
                                    ))}</ul>
                                }
                            </div>
                            <div>
                                <div className="text-[10.5px] uppercase tracking-wider text-slate-400 font-mono mb-1.5 inline-flex items-center gap-1.5"><Smartphone size={11} /> Dispositivos ({devices?.total || 0})</div>
                                {(!devices || devices.items.length === 0) ? <div className="text-[12px] text-slate-400 italic">Nenhum</div> :
                                    <ul className="space-y-1">{devices.items.slice(0, 20).map((d, i) => (
                                        <li key={i} className="px-3 py-1.5 rounded-xl bg-slate-50 text-[12px]">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className="font-medium">{d.browser || "?"} · {d.os || "?"} · {d.device || "desktop"}</span>
                                                <span className="text-[10.5px] text-slate-500">· {d.sessions} sessões</span>
                                                <span className="ml-auto text-[10.5px] text-slate-400 font-mono">visto {fmtRelative(d.last_seen)}</span>
                                            </div>
                                        </li>
                                    ))}</ul>
                                }
                            </div>
                        </div>
                    )}

                    {/* REPORTS */}
                    {tab === "reports" && (
                        reports === null ? <div className="text-slate-400"><Loader2 className="animate-spin inline" size={14} /> A carregar…</div> :
                        (reports.against.length === 0 && reports.by.length === 0) ?
                            <div className="text-slate-400 text-[13px] py-6 text-center">Sem reports.</div> :
                            <div className="space-y-3" data-testid="admin-user-drawer-reports-list">
                                <div>
                                    <div className="text-[11px] uppercase tracking-wider text-slate-400 font-mono mb-1.5">Contra este utilizador ({reports.against.length})</div>
                                    {reports.against.length === 0 ? <div className="text-[12px] text-slate-400 italic">Nenhum</div> :
                                        <ul className="space-y-1.5">{reports.against.map((r) => (
                                            <li key={r.id} className="px-3 py-1.5 rounded-xl bg-red-500/[0.06] text-[12px]">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-700">{r.kind}</span>
                                                    <span className="font-mono text-[10.5px] text-slate-500">{r.status}</span>
                                                    <span className="ml-auto text-[10.5px] text-slate-400">{fmtRelative(r.created_at)}</span>
                                                </div>
                                                {r.reason && <div className="mt-0.5">motivo: {r.reason}</div>}
                                            </li>
                                        ))}</ul>
                                    }
                                </div>
                                <div>
                                    <div className="text-[11px] uppercase tracking-wider text-slate-400 font-mono mb-1.5">Feitos por este utilizador ({reports.by.length})</div>
                                    {reports.by.length === 0 ? <div className="text-[12px] text-slate-400 italic">Nenhum</div> :
                                        <ul className="space-y-1.5">{reports.by.map((r) => (
                                            <li key={r.id} className="px-3 py-1.5 rounded-xl bg-slate-50 text-[12px]">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">{r.kind}</span>
                                                    <span className="font-mono text-[10.5px] text-slate-500">{r.status}</span>
                                                    <span className="ml-auto text-[10.5px] text-slate-400">{fmtRelative(r.created_at)}</span>
                                                </div>
                                                {r.reason && <div className="mt-0.5">motivo: {r.reason}</div>}
                                            </li>
                                        ))}</ul>
                                    }
                                </div>
                            </div>
                    )}

                    {/* ACTIONS — full moderation surface */}
                    {tab === "actions" && (
                        <div className="space-y-4" data-testid="admin-user-drawer-actions">
                            <div>
                                <div className="text-[10.5px] uppercase tracking-wider text-slate-400 font-mono mb-2">Acesso</div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    <ActionButton icon={u.muted_active ? Eye : VolumeX} label={u.muted_active ? "Desilenciar" : "Silenciar"} onClick={u.muted_active ? doUnmute : doMute} testid="admin-action-mute" disabled={actionBusy === "mute" || actionBusy === "unmute"} kind={u.muted_active ? "good" : "warn"} />
                                    <ActionButton icon={Ghost} label={u.shadow_muted ? "Tirar silêncio oculto" : "Silêncio oculto"} onClick={doShadowMute} testid="admin-action-shadow-mute" disabled={actionBusy === "shadow"} kind={u.shadow_muted ? "good" : "warn"} />
                                    <ActionButton icon={Pause} label={u.suspended_active ? "Tirar suspensão" : "Suspender"} onClick={u.suspended_active ? doUnsuspend : doSuspend} testid="admin-action-suspend" disabled={actionBusy === "suspend" || actionBusy === "unsuspend"} kind={u.suspended_active ? "good" : "danger"} />
                                    <ActionButton icon={Ban} label={u.banned ? "Desbanir" : "Banir"} onClick={doBan} testid="admin-action-ban" disabled={actionBusy === "ban" || actionBusy === "unban"} kind={u.banned ? "good" : "danger"} />
                                    <ActionButton icon={Snowflake} label={u.frozen ? "Descongelar conta" : "Congelar conta"} onClick={doFreeze} testid="admin-action-freeze" disabled={actionBusy === "freeze"} kind={u.frozen ? "good" : "warn"} title="Bloqueia todas as interações (read-only) e revoga sessões" />
                                    <ActionButton icon={UserX} label="Terminar sessões" onClick={doForceLogout} testid="admin-action-force-logout" disabled={actionBusy === "logout"} kind="warn" title="Revoga TODAS as sessões" />
                                    <ActionButton icon={KeyRound} label="Reset 2FA" onClick={doReset2FA} testid="admin-action-reset-2fa" disabled={actionBusy === "reset2fa" || !u.two_fa_enabled} kind="warn" title={u.two_fa_enabled ? "Reset 2FA do utilizador" : "2FA não está activo"} />
                                </div>
                            </div>
                            <div>
                                <div className="text-[10.5px] uppercase tracking-wider text-slate-400 font-mono mb-2">Limites</div>
                                <div className="grid grid-cols-1 gap-2">
                                    <ActionButton icon={Gauge} label={(u.rate_limit && (u.rate_limit.max_posts != null || u.rate_limit.max_comments != null)) ? `Editar limite (P:${u.rate_limit.max_posts ?? "∞"} / C:${u.rate_limit.max_comments ?? "∞"} / ${u.rate_limit.window_hours}h)` : "Limitar ações / respostas / publicações"} onClick={doRateLimit} testid="admin-action-rate-limit" disabled={actionBusy === "ratelimit"} kind="warn" />
                                </div>
                            </div>
                            <div>
                                <div className="text-[10.5px] uppercase tracking-wider text-slate-400 font-mono mb-2">Flags</div>
                                <div className="grid grid-cols-2 gap-2">
                                    <ActionButton icon={ShieldAlert} label={u.flagged_suspicious ? "Tirar flag suspeito" : "Marcar suspeito"} onClick={doSuspicious} testid="admin-action-suspicious" disabled={actionBusy === "suspicious"} kind={u.flagged_suspicious ? "good" : "warn"} />
                                    <ActionButton icon={ShieldCheck} label="Marcar seguro" onClick={doSafe} testid="admin-action-mark-safe" disabled={actionBusy === "safe"} kind="good" title="Limpa suspeito + mute + shadow + suspensão" />
                                </div>
                            </div>
                            <div>
                                <div className="text-[10.5px] uppercase tracking-wider text-slate-400 font-mono mb-2">Privilégios</div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    <ActionButton icon={Check} label={u.verified ? "Desverificar" : "Verificar"} onClick={doVerify} testid="admin-action-verify" disabled={actionBusy === "verify"} kind={u.verified ? "default" : "primary"} />
                                    <ActionButton icon={Award} label={u.featured_account ? "Tirar destaque" : "Destacar conta"} onClick={doFeature} testid="admin-action-feature" disabled={actionBusy === "feature"} kind={u.featured_account ? "default" : "primary"} />
                                    <ActionButton icon={Shield} label={u.is_admin ? "Remover admin" : "Promover admin"} onClick={doAdminToggle} testid="admin-action-admin-toggle" disabled={actionBusy === "admin"} kind={u.is_admin ? "danger" : "primary"} />
                                </div>
                            </div>
                            <div className="ops-callout ops-callout--info text-[11.5px]">
                                <Info size={13} />
                                <div><strong>Ações registadas:</strong> todas estas ações geram entradas no registo de auditoria e ficam visíveis no separador "Atividade" deste utilizador.</div>
                            </div>
                        </div>
                    )}
                </div>
            </aside>
        </div>
    );
}



// -----------------------------------------------------------------
// ANTI-SPAM — real-time overview + suspicious activity feed
// -----------------------------------------------------------------
function AntiSpamTab({ onOpenDrawer }) {
    const [overview, setOverview] = useState(null);
    const [activity, setActivity] = useState(null);
    const [filter, setFilter] = useState("all");
    const [users, setUsers] = useState({ items: [], total: 0, limit: 30 });
    const [page, setPage] = useState(1);
    const [loadingActivity, setLoadingActivity] = useState(false);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [reloadAt, setReloadAt] = useState(0);
    const [busyId, setBusyId] = useState(null);

    const loadOverview = useCallback(async () => {
        try {
            const { data } = await api.get("/admin/anti-spam/overview");
            setOverview(data);
        } catch (e) { apiError(e); }
    }, []);

    const loadActivity = useCallback(async () => {
        setLoadingActivity(true);
        try {
            const { data } = await api.get("/admin/anti-spam/activity", { params: { limit: 30 } });
            setActivity(data);
        } catch (e) { apiError(e); }
        finally { setLoadingActivity(false); }
    }, []);

    const loadUsers = useCallback(async () => {
        setLoadingUsers(true);
        try {
            const { data } = await api.get("/admin/anti-spam/suspicious", { params: { filter, page, limit: 30 } });
            setUsers(data);
        } catch (e) { apiError(e); }
        finally { setLoadingUsers(false); }
    }, [filter, page]);

    useEffect(() => { loadOverview(); loadActivity(); }, [loadOverview, loadActivity, reloadAt]);
    useEffect(() => { loadUsers(); }, [loadUsers, reloadAt]);

    const doFreeze = async (u) => {
        if (u.frozen) {
            if (!window.confirm("Descongelar conta?")) return;
            setBusyId(u.id);
            try {
                await api.post(`/admin/users/${u.id}/unfreeze`);
                toast.success("Conta descongelada");
                setReloadAt(Date.now());
            } catch (e) { apiError(e); } finally { setBusyId(null); }
            return;
        }
        const r = window.prompt("Motivo (opcional):", "");
        if (r === null) return;
        if (!window.confirm(`Congelar @${u.username}? Vai bloquear todas as interações e revogar sessões.`)) return;
        setBusyId(u.id);
        try {
            await api.post(`/admin/users/${u.id}/freeze`, { reason: r || "" });
            toast.success("Conta congelada");
            setReloadAt(Date.now());
        } catch (e) { apiError(e); } finally { setBusyId(null); }
    };

    const doRateLimit = async (u) => {
        const p = window.prompt("Limite de POSTS por janela (vazio = sem limite):", String((u.rate_limit && u.rate_limit.max_posts) || ""));
        if (p === null) return;
        const c = window.prompt("Limite de COMENTÁRIOS por janela (vazio = sem limite):", String((u.rate_limit && u.rate_limit.max_comments) || ""));
        if (c === null) return;
        const w = window.prompt("Janela (horas):", String((u.rate_limit && u.rate_limit.window_hours) || 1));
        if (w === null) return;
        setBusyId(u.id);
        try {
            await api.post(`/admin/users/${u.id}/rate-limit`, {
                max_posts: p === "" ? null : parseInt(p, 10),
                max_comments: c === "" ? null : parseInt(c, 10),
                window_hours: parseInt(w, 10) || 1,
                reason: "anti-spam",
            });
            toast.success("Rate-limit aplicado");
            setReloadAt(Date.now());
        } catch (e) { apiError(e); } finally { setBusyId(null); }
    };

    const filters = [
        { k: "all", l: "Tudo" },
        { k: "flagged", l: "Suspeitos" },
        { k: "muted", l: "Silenciados" },
        { k: "shadow", l: "Silêncio oculto" },
        { k: "rate_limited", l: "Com limite" },
        { k: "frozen", l: "Congelados" },
        { k: "mass_reported", l: "Reports em massa (7d)" },
    ];

    return (
        <div className="space-y-4" data-testid="admin-antispam">
            <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="min-w-0 flex-1">
                    <p className="ops-subtitle">Filtros automáticos e moderação proactiva: rate limits, deteção de duplicados, padrões suspeitos e listas internas.</p>
                </div>
                <button onClick={() => setReloadAt(Date.now())}
                    data-testid="admin-antispam-refresh"
                    className="h-9 px-3 rounded-full bg-slate-100 hover:bg-slate-800/[0.1] inline-flex items-center gap-1.5 text-[13px]"
                ><RefreshCcw size={14} /> Atualizar</button>
            </div>

            {/* COUNTERS */}
            {overview && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" data-testid="admin-antispam-counters">
                    <CounterCard label="Suspeitos" value={overview.users.flagged_suspicious} accent="bg-red-50 text-red-700" icon={ShieldAlert} hint={{ title: "Contas marcadas como suspeitas", body: "Sinalizadas automaticamente por padrões anómalos (registo em massa, ritmo de publicação, conteúdo repetido). Requerem revisão manual." }} />
                    <CounterCard label="Silenciados" value={overview.users.muted_active} accent="bg-slate-100 text-slate-700" icon={VolumeX} hint={{ title: "Silêncio visível", body: "O utilizador sabe que está silenciado e não consegue publicar ou comentar durante o período definido." }} />
                    <CounterCard label="Silêncio oculto" value={overview.users.shadow_muted} accent="bg-gray-700/15 text-gray-700" icon={Ghost} hint={{ title: "Shadow-mute", body: "O conteúdo do utilizador deixa de ser visível para os outros, mas ele continua a ver as suas próprias publicações como normais — não sabe que está silenciado." }} />
                    <CounterCard label="Com limite" value={overview.users.rate_limited} accent="bg-red-50 text-red-700" icon={Gauge} hint={{ title: "Rate-limited agora", body: "Contas a bater nos limites de ações (posts, comentários, likes) por minuto/hora. Limite temporário que liberta sozinho." }} />
                    <CounterCard label="Congelados" value={overview.users.frozen} accent="bg-slate-100 text-slate-700" icon={Snowflake} hint={{ title: "Contas congeladas", body: "Acesso pausado: o login funciona mas todas as ações de escrita estão bloqueadas. Menos severo que um banimento e totalmente reversível." }} />
                    <CounterCard label="Banidos" value={overview.users.banned} accent="bg-red-500/15 text-red-700" icon={Ban} hint={{ title: "Banimentos activos", body: "Acesso totalmente revogado — não fazem login. Reversível em Utilizadores ▸ Desbanir." }} />
                    <CounterCard label="Reports abertos" value={overview.content.reports_open} accent="bg-red-50 text-red-700" icon={Flag} hint={{ title: "Reports por resolver", body: "Denúncias submetidas por utilizadores ainda sem decisão. Processa-as no separador Reports." }} />
                    <CounterCard label="Posts reduzidos" value={overview.content.posts_reduced} accent="bg-red-50 text-red-700" icon={TrendingDown} hint={{ title: "Alcance reduzido", body: "Publicações com distribuição limitada: continuam visíveis no perfil do autor mas não são amplificadas no feed nem no explore." }} />

                </div>
            )}

            {/* ACTIVITY FEED */}
            <div className="bg-white rounded-2xl border border-slate-200 p-3 sm:p-4" data-testid="admin-antispam-activity">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="text-[13px] font-semibold tracking-tight">Atividade suspeita recente</h3>
                    <span className="text-[10.5px] text-slate-400 font-mono">{loadingActivity ? "a atualizar…" : (activity?.checked_at ? fmtRelative(activity.checked_at) : "")}</span>
                </div>
                {!activity ? (
                    <div className="text-slate-400 text-[12px] py-2"><Loader2 className="animate-spin inline" size={13} /> A carregar…</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <ActivityBlock title="Burst de publicações (24h)" empty="Sem rajadas.">
                            {(activity.burst_posters || []).map(({ user: u, count }) => (
                                <ActivityRow key={u.id} u={u} count={count} unit="posts" onClick={() => onOpenDrawer && onOpenDrawer(u)} />
                            ))}
                        </ActivityBlock>
                        <ActivityBlock title="Burst de comentários (24h)" empty="Sem rajadas.">
                            {(activity.burst_commenters || []).map(({ user: u, count }) => (
                                <ActivityRow key={u.id} u={u} count={count} unit="comments" onClick={() => onOpenDrawer && onOpenDrawer(u)} />
                            ))}
                        </ActivityBlock>
                        <ActivityBlock title="Reports na última hora" empty="Sem reports recentes.">
                            {(activity.recent_reports || []).slice(0, 8).map((r) => (
                                <div key={r.id} className="px-2.5 py-1.5 rounded-xl bg-slate-50 text-[12px] flex items-center gap-2">
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-600">{r.kind}</span>
                                    <span className="truncate text-slate-700 flex-1">{r.reason || "—"}</span>
                                    <span className="text-[10.5px] text-slate-400 font-mono">{fmtRelative(r.created_at)}</span>
                                </div>
                            ))}
                        </ActivityBlock>
                        <ActivityBlock title="Contas novas (24h)" empty="Sem registos novos.">
                            {(activity.fresh_users || []).slice(0, 8).map((u) => (
                                <ActivityRow key={u.id} u={u} count={null} onClick={() => onOpenDrawer && onOpenDrawer(u)} />
                            ))}
                        </ActivityBlock>
                    </div>
                )}
            </div>

            {/* USERS BY FILTER */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                <div className="px-3 sm:px-4 pt-3 flex items-center gap-2 flex-wrap">
                    <h3 className="text-[13px] font-semibold tracking-tight">Utilizadores</h3>
                    <div className="flex items-center gap-0.5 bg-slate-50 rounded-full p-1 ml-auto overflow-x-auto no-scrollbar max-w-full">
                        {filters.map((f) => (
                            <button key={f.k} onClick={() => { setFilter(f.k); setPage(1); }}
                                data-testid={`admin-antispam-filter-${f.k}`}
                                className={`h-8 px-2.5 sm:px-3 rounded-full text-[11.5px] sm:text-[12px] font-medium whitespace-nowrap ${filter === f.k ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"}`}
                            >{f.l}</button>
                        ))}
                    </div>
                </div>
                {loadingUsers && <div className="px-4 py-3 text-[12px] text-slate-400 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> A carregar…</div>}
                {!loadingUsers && users.items.length === 0 && (
                    <div className="px-4 py-10 text-center text-slate-400 text-[13px]">Sem utilizadores neste filtro.</div>
                )}
                <ul className="divide-y divide-black/[0.05]">
                    {users.items.map((u) => (
                        <li key={u.id} className="px-3 sm:px-4 py-2.5 flex items-center gap-2.5"
                            data-testid={`admin-antispam-user-${u.id}`}>
                            <button onClick={() => onOpenDrawer && onOpenDrawer(u)} className="flex items-center gap-2 flex-1 min-w-0 text-left hover:opacity-80">
                                <Avatar user={u} size={32} />
                                <div className="min-w-0">
                                    <div className="flex items-center gap-1 flex-wrap">
                                        <span className="font-medium text-[13.5px] truncate">@{u.username}</span>
                                        {u.verified && <span className="text-[9.5px] px-1 py-0.5 rounded-full bg-blue-500/10 text-blue-600">v</span>}
                                        {u.banned && <span className="text-[9.5px] px-1 py-0.5 rounded-full bg-red-500/10 text-red-600">banido</span>}
                                        {u.muted_active && <span className="text-[9.5px] px-1 py-0.5 rounded-full bg-slate-50 text-slate-700">silenciado</span>}
                                        {u.shadow_muted && <span className="text-[9.5px] px-1 py-0.5 rounded-full bg-gray-700/10 text-gray-700">oculto</span>}
                                        {u.frozen && <span className="text-[9.5px] px-1 py-0.5 rounded-full bg-slate-100 text-slate-700">congelado</span>}
                                        {u.flagged_suspicious && <span className="text-[9.5px] px-1 py-0.5 rounded-full bg-red-50/70 text-red-700">suspeito</span>}
                                        {typeof u.report_count_7d === "number" && (
                                            <span className="text-[9.5px] px-1 py-0.5 rounded-full bg-red-500/15 text-red-700">{u.report_count_7d} reports</span>
                                        )}
                                    </div>
                                    <div className="text-[10.5px] text-slate-400 font-mono truncate">{u.email} · criado {fmtRelative(u.created_at)}</div>
                                </div>
                            </button>
                            <div className="flex items-center gap-1 shrink-0">
                                <button onClick={() => doRateLimit(u)} disabled={busyId === u.id}
                                    data-testid={`admin-antispam-rate-${u.id}`}
                                    title="Limitar ações"
                                    className="w-8 h-8 grid place-items-center rounded-full hover:bg-red-50 disabled:opacity-40 text-red-700">
                                    <Gauge size={13} />
                                </button>
                                <button onClick={() => doFreeze(u)} disabled={busyId === u.id}
                                    data-testid={`admin-antispam-freeze-${u.id}`}
                                    title={u.frozen ? "Descongelar conta" : "Congelar conta"}
                                    className={`w-8 h-8 grid place-items-center rounded-full disabled:opacity-40 ${u.frozen ? "bg-slate-100 text-slate-700" : "hover:bg-slate-50 text-slate-500"}`}>
                                    <Snowflake size={13} />
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
                <div className="px-4 pb-3"><Pager page={page} total={users.total} limit={users.limit} onChange={setPage} /></div>
            </div>
        </div>
    );
}

function CounterCard({ label, value, accent, icon: Icon, hint }) {
    return (
        <div className="bg-white rounded-2xl border border-slate-200 p-3 flex items-center gap-2">
            <span className={`w-8 h-8 rounded-xl grid place-items-center ${accent}`}><Icon size={15} /></span>
            <div className="min-w-0">
                <div className="text-[10.5px] uppercase tracking-wider text-slate-400 font-mono flex items-center gap-1">
                    {label}
                    {hint && <InfoTip text={hint} side="top" />}
                </div>
                <div className="text-[18px] font-display tracking-tight tabular-nums">{fmtNum(value || 0)}</div>
            </div>
        </div>
    );
}

function ActivityBlock({ title, empty, children }) {
    const items = React.Children.toArray(children);
    return (
        <div>
            <div className="text-[10.5px] uppercase tracking-wider text-slate-400 font-mono mb-1.5">{title}</div>
            {items.length === 0 ? (
                <div className="text-[12px] text-slate-400 italic px-2.5 py-2">{empty}</div>
            ) : (
                <div className="space-y-1">{items}</div>
            )}
        </div>
    );
}

function ActivityRow({ u, count, unit = "", onClick }) {
    return (
        <button onClick={onClick}
            className="w-full px-2.5 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 flex items-center gap-2 text-left"
            data-testid={`admin-antispam-activity-row-${u.id}`}>
            <Avatar user={u} size={24} />
            <div className="min-w-0 flex-1">
                <div className="text-[12px] font-medium truncate">@{u.username}</div>
                <div className="text-[10.5px] text-slate-400 font-mono truncate">{u.email}</div>
            </div>
            {count !== null && count !== undefined && (
                <span className="text-[10.5px] font-mono font-semibold px-1.5 py-0.5 rounded-full bg-slate-100">{count} {unit}</span>
            )}
        </button>
    );
}


// -----------------------------------------------------------------
// SIDEBAR — fixed on desktop, collapsible, mobile-drawer
// -----------------------------------------------------------------
function AdminSidebar({ tab, setTab, openReports, collapsed, setCollapsed, mobileOpen, setMobileOpen }) {
    // Auto-close mobile drawer on selection
    const choose = useCallback((k) => {
        setTab(k);
        setMobileOpen(false);
    }, [setTab, setMobileOpen]);

    // Close mobile drawer with Escape
    useEffect(() => {
        if (!mobileOpen) return undefined;
        const onKey = (e) => { if (e.key === "Escape") setMobileOpen(false); };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [mobileOpen, setMobileOpen]);

    return (
        <>
            {/* Mobile overlay */}
            <div
                onClick={() => setMobileOpen(false)}
                aria-hidden={!mobileOpen}
                className={`fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[55] lg:hidden transition-opacity duration-200 ${
                    mobileOpen ? "opacity-100" : "opacity-0 pointer-events-none"
                }`}
                data-testid="admin-sidebar-overlay"
            />
            <aside
                data-testid="admin-sidebar"
                aria-label="Navegação do painel admin"
                className={`
                    fixed lg:sticky top-0 lg:top-14 left-0 z-[60] lg:z-10
                    h-screen lg:h-[calc(100vh-3.5rem)]
                    bg-white border-r border-slate-200
                    flex flex-col
                    transition-[transform,width] duration-300 ease-out
                    w-[256px]
                    ${collapsed ? "lg:w-[64px]" : "lg:w-[232px]"}
                    ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
                    shrink-0
                `}
            >
                {/* Mobile-only top brand + close */}
                <div className="lg:hidden flex items-center gap-2 px-3 h-14 border-b border-slate-200">
                    <span className="w-8 h-8 rounded-xl bg-slate-900 text-white grid place-items-center shrink-0">
                        <Shield size={15} />
                    </span>
                    <span className="font-display text-[15px] tracking-tight flex-1 truncate">Admin</span>
                    <button
                        onClick={() => setMobileOpen(false)}
                        aria-label="Fechar navegação"
                        className="w-9 h-9 grid place-items-center rounded-full hover:bg-slate-100 text-slate-600"
                        data-testid="admin-sidebar-mobile-close"
                    ><XIcon size={16} /></button>
                </div>

                {/* Scrollable list */}
                <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 no-scrollbar">
                    {NAV_GROUPS.map((group) => (
                        <div key={group.label} className="mb-3 last:mb-1">
                            <div
                                aria-hidden={collapsed}
                                className={`px-2.5 mb-1 text-[10px] uppercase tracking-[0.12em] font-mono text-slate-400 transition-opacity duration-200 ${
                                    collapsed ? "lg:opacity-0 lg:h-0 lg:overflow-hidden lg:mb-0" : "opacity-100"
                                }`}
                            >{group.label}</div>
                            <ul className="space-y-0.5">
                                {group.items.map((it) => {
                                    const Icon = it.icon;
                                    const active = tab === it.key;
                                    const showBadge = it.badge === "reports" && openReports != null && openReports > 0;
                                    return (
                                        <li key={it.key}>
                                            <button
                                                onClick={() => choose(it.key)}
                                                data-testid={`admin-nav-${it.key}`}
                                                title={collapsed ? it.label : undefined}
                                                aria-label={it.label}
                                                aria-current={active ? "page" : undefined}
                                                className={`
                                                    w-full group relative
                                                    h-10 rounded-xl flex items-center gap-2.5
                                                    text-[13px] font-medium
                                                    transition-colors duration-150
                                                    ${collapsed ? "lg:px-0 lg:justify-center px-2.5" : "px-2.5"}
                                                    ${active
                                                        ? "bg-slate-100 text-[color:var(--ops-info-700)]"
                                                        : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"}
                                                `}
                                            >
                                                {/* Active rail — petróleo, marca localização sem gritar */}
                                                {active && (
                                                    <span aria-hidden className={`absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full ${collapsed ? "lg:hidden" : ""}`}
                                                        style={{ backgroundColor: "var(--ops-info-500)" }} />
                                                )}
                                                <span className={`grid place-items-center w-5 h-5 shrink-0 ${active ? "text-[color:var(--ops-info-600)]" : "text-slate-500 group-hover:text-slate-900"}`}>
                                                    <Icon size={16} />
                                                </span>
                                                <span className={`flex-1 text-left truncate transition-[opacity,max-width] duration-200 ${
                                                    collapsed ? "lg:opacity-0 lg:max-w-0 lg:overflow-hidden" : "opacity-100 max-w-[180px]"
                                                }`}>{it.label}</span>
                                                {showBadge && (
                                                    <span
                                                        data-testid={it.key === "reports" ? "admin-reports-badge" : undefined}
                                                        className={`
                                                            min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-mono font-semibold
                                                            inline-flex items-center justify-center shrink-0
                                                            bg-[color:var(--ops-danger-500)] text-white
                                                            ${collapsed ? "lg:absolute lg:top-1 lg:right-1 lg:min-w-[14px] lg:h-[14px] lg:text-[9px]" : ""}
                                                        `}
                                                    >{openReports > 99 ? "99+" : openReports}</span>
                                                )}
                                                {/* Tooltip on collapsed (desktop only) */}
                                                {collapsed && (
                                                    <span className="hidden lg:group-hover:block absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1 rounded-lg bg-slate-900 text-white text-[11.5px] whitespace-nowrap pointer-events-none z-50 shadow-lg">
                                                        {it.label}
                                                    </span>
                                                )}
                                            </button>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    ))}
                </nav>

                {/* Footer: collapse toggle (desktop only) */}
                <div className="hidden lg:flex border-t border-slate-200 p-2">
                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        data-testid="admin-sidebar-collapse"
                        aria-label={collapsed ? "Expandir navegação" : "Colapsar navegação"}
                        title={collapsed ? "Expandir" : "Colapsar"}
                        className={`w-full h-9 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 inline-flex items-center gap-2 text-[12px] transition-colors ${
                            collapsed ? "justify-center" : "px-2.5"
                        }`}
                    >
                        {collapsed
                            ? <PanelLeftOpen size={15} />
                            : <><PanelLeftClose size={15} /><span>Recolher</span></>}
                    </button>
                </div>
            </aside>
        </>
    );
}

// -----------------------------------------------------------------
// MAIN
// -----------------------------------------------------------------
/**
 * Admin \u2014 page body. Lives INSIDE AdminLayout v2 via <Outlet />.
 * The sidebar, topbar and command palette are owned by AdminLayout;
 * this component only renders the active tab content.
 */
export default function Admin() {
    const { user, loading } = useAuth();
    const ctx = useOutletContext() || {};
    const tab = ctx.tab || "overview";
    const setTab = ctx.setTab || (() => {});
    const timeRange = ctx.timeRange || "15m";
    const setTimeRange = ctx.setTimeRange || (() => {});
    const [drawerUser, setDrawerUser] = useState(null);

    if (loading) {
        return <div className="flex items-center justify-center py-20 text-slate-400"><Loader2 className="animate-spin" /></div>;
    }
    if (!user || !user.is_admin) {
        return <Navigate to="/" replace />;
    }

    return (
        <div data-testid={`admin-tab-content-${tab}`}>
            {tab === "overview" && (
                <Cockpit onNavigate={setTab} timeRange={timeRange} onChangeTimeRange={setTimeRange} />
            )}
            {tab === "security" && <SecurityTab />}
            {tab === "system" && <SystemTab />}
            {tab === "users" && <UsersTab onOpenDrawer={setDrawerUser} />}
            {tab === "posts" && <PostsTab />}
            {tab === "comments" && <CommentsTab />}
            {tab === "stories" && <StoriesTab />}
            {tab === "hashtags" && <HashtagsTab />}
            {tab === "reports" && <ReportsTab onOpenUser={setDrawerUser} />}
            {tab === "antispam" && <AntiSpamTab onOpenDrawer={setDrawerUser} />}
            {tab === "broadcast" && <BroadcastTab />}
            {tab === "communities" && <CommunitiesTab />}
            {tab === "events" && <EventsTab />}
            {tab === "sessions" && <SessionsTab />}
            {tab === "settings" && <SettingsTab />}
            {tab === "audit" && <AuditTab />}

            {drawerUser && <UserDrawer user={drawerUser} onClose={() => setDrawerUser(null)} />}
        </div>
    );
}
