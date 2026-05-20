/**
 * Admin Panel — Lusorae
 * --------------------------------------------------------------
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
import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { toast } from "sonner";
import {
    Shield, Users as UsersIcon, FileText, AlertTriangle, Layers, CalendarDays,
    Activity, History, Search, ShieldCheck, Ban, LogOut, Trash2, Star,
    UserCheck, RefreshCcw, ChevronLeft, ChevronRight, Loader2, UserX,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { api } from "../lib/api";
import { Avatar } from "../components/Avatar";
import { confirmDialog } from "../components/ConfirmDialog";

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
// Tab nav
// -----------------------------------------------------------------
const TABS = [
    { key: "overview", label: "Visão geral", icon: Activity },
    { key: "users", label: "Utilizadores", icon: UsersIcon },
    { key: "posts", label: "Publicações", icon: FileText },
    { key: "reports", label: "Reports", icon: AlertTriangle },
    { key: "communities", label: "Comunidades", icon: Layers },
    { key: "events", label: "Eventos", icon: CalendarDays },
    { key: "sessions", label: "Sessões", icon: LogOut },
    { key: "audit", label: "Audit log", icon: History },
];

// -----------------------------------------------------------------
// Sparkline (inline SVG, no libs)
// -----------------------------------------------------------------
function Sparkline({ data, height = 36, color = "#c64a3d" }) {
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

function StatCard({ label, value, sub, accent = "var(--coral-500)", series, "data-testid": testId }) {
    return (
        <div className="bg-white rounded-2xl border border-black/[0.06] p-4 flex flex-col gap-1.5 shadow-sm" data-testid={testId}>
            <div className="text-[11px] uppercase tracking-wider text-black/45 font-mono">{label}</div>
            <div className="font-display text-[28px] leading-none tracking-tight text-black">{fmtNum(value)}</div>
            {sub != null && <div className="text-[12px] text-black/55">{sub}</div>}
            {series && <Sparkline data={series} color={accent} />}
        </div>
    );
}

// -----------------------------------------------------------------
// OVERVIEW
// -----------------------------------------------------------------
function OverviewTab() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [reloadAt, setReloadAt] = useState(Date.now());
    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get("/admin/stats");
            setStats(data);
        } catch (e) { apiError(e); }
        finally { setLoading(false); }
    }, []);
    useEffect(() => { load(); }, [load, reloadAt]);

    if (loading && !stats) {
        return <div className="flex items-center justify-center py-16 text-black/45"><Loader2 className="animate-spin" /></div>;
    }
    if (!stats) return null;

    return (
        <div className="space-y-5" data-testid="admin-overview">
            <div className="flex items-center justify-between">
                <h2 className="font-display text-[22px] tracking-tight">Visão geral</h2>
                <button
                    onClick={() => setReloadAt(Date.now())}
                    data-testid="admin-overview-refresh"
                    className="h-9 px-3 rounded-full bg-black/[0.05] hover:bg-black/[0.1] inline-flex items-center gap-1.5 text-[13px]"
                    title="Atualizar agora"
                >
                    <RefreshCcw size={14} /> Atualizar
                </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                <StatCard data-testid="kpi-users-total" label="Utilizadores" value={stats.users.total} sub={`${stats.users.online} online agora`} series={stats.series.signups_14d} accent="#4a7bbf" />
                <StatCard data-testid="kpi-signups-7d" label="Signups (7d)" value={stats.users.signups_7d} sub={`${stats.users.signups_30d} em 30d`} />
                <StatCard data-testid="kpi-verified" label="Verificados" value={stats.users.verified} sub={`${stats.users.admins} admin(s)`} accent="#22c55e" />
                <StatCard data-testid="kpi-banned" label="Banidos" value={stats.users.banned} sub="Acesso bloqueado" accent="#ef4444" />

                <StatCard data-testid="kpi-posts-total" label="Publicações" value={stats.content.posts_total} sub={`+${stats.content.posts_24h} em 24h`} series={stats.series.posts_14d} accent="#df8a7d" />
                <StatCard data-testid="kpi-posts-7d" label="Posts (7d)" value={stats.content.posts_7d} sub={`${stats.content.drafts} rascunhos · ${stats.content.featured} destaques`} />
                <StatCard data-testid="kpi-comments" label="Comentários" value={stats.content.comments_total} />
                <StatCard data-testid="kpi-messages" label="DMs" value={stats.content.messages_total} sub={`${stats.content.stories_active} stories ativas`} />

                <StatCard data-testid="kpi-reports-open" label="Reports abertos" value={stats.moderation.reports_open} sub={`${stats.moderation.reports_total} no total`} accent="#f59e0b" />
                <StatCard data-testid="kpi-communities" label="Comunidades" value={stats.content.communities} />
                <StatCard data-testid="kpi-events" label="Eventos" value={stats.content.events} />
                <StatCard data-testid="kpi-sessions" label="Sessões activas" value={stats.sessions.active} />
            </div>

            <div className="text-[11px] font-mono text-black/40">
                Gerado a {fmtDate(stats.generated_at)}
            </div>
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
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-black/[0.06]">
            <div className="text-[12px] text-black/55 font-mono">
                Página {page} de {last} · {total} no total
            </div>
            <div className="flex items-center gap-1">
                <button
                    onClick={() => onChange(Math.max(1, page - 1))}
                    disabled={page <= 1}
                    className="w-9 h-9 grid place-items-center rounded-full hover:bg-black/[0.05] disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label="Página anterior"
                >
                    <ChevronLeft size={16} />
                </button>
                <button
                    onClick={() => onChange(Math.min(last, page + 1))}
                    disabled={page >= last}
                    className="w-9 h-9 grid place-items-center rounded-full hover:bg-black/[0.05] disabled:opacity-40 disabled:cursor-not-allowed"
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
    { key: "all", label: "Todos" },
    { key: "verified", label: "Verificados" },
    { key: "admins", label: "Admins" },
    { key: "banned", label: "Banidos" },
];

function UsersTab() {
    const { user: me } = useAuth();
    const [q, setQ] = useState("");
    const [filter, setFilter] = useState("all");
    const [page, setPage] = useState(1);
    const [data, setData] = useState({ items: [], total: 0, limit: 25 });
    const [loading, setLoading] = useState(false);
    const [busyId, setBusyId] = useState(null);
    const [reloadAt, setReloadAt] = useState(0);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get("/admin/users", { params: { q, filter, page, limit: 25 } });
            setData(data);
        } catch (e) { apiError(e); }
        finally { setLoading(false); }
    }, [q, filter, page, reloadAt]);
    useEffect(() => { load(); }, [load]);

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

    return (
        <div className="space-y-4" data-testid="admin-users">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <h2 className="font-display text-[22px] tracking-tight">Utilizadores</h2>
                <button
                    onClick={() => setReloadAt(Date.now())}
                    data-testid="admin-users-refresh"
                    className="h-9 px-3 rounded-full bg-black/[0.05] hover:bg-black/[0.1] inline-flex items-center gap-1.5 text-[13px]"
                >
                    <RefreshCcw size={14} /> Atualizar
                </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
                <div className="relative flex-1 min-w-[240px]">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40" />
                    <input
                        type="text" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }}
                        placeholder="Pesquisar por username, email, nome ou ID"
                        data-testid="admin-users-search"
                        className="w-full h-10 pl-9 pr-4 rounded-full bg-black/[0.04] focus:bg-white focus:ring-2 ring-black/15 text-[13.5px] outline-none"
                    />
                </div>
                <div className="flex items-center gap-1 bg-black/[0.04] rounded-full p-1">
                    {USER_FILTERS.map((f) => (
                        <button key={f.key}
                            onClick={() => { setFilter(f.key); setPage(1); }}
                            data-testid={`admin-users-filter-${f.key}`}
                            className={`h-8 px-3 rounded-full text-[12px] font-medium ${filter === f.key ? "bg-black text-white" : "text-black/70 hover:bg-black/[0.05]"}`}
                        >{f.label}</button>
                    ))}
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden">
                {loading && <div className="px-4 py-3 text-[12px] text-black/45 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> A carregar…</div>}
                {!loading && data.items.length === 0 && (
                    <div className="px-4 py-10 text-center text-black/45 text-[13px]">Sem utilizadores para os filtros atuais.</div>
                )}
                <ul className="divide-y divide-black/[0.05]">
                    {data.items.map((u) => {
                        const isMe = me?.id === u.id;
                        const busy = busyId === u.id;
                        return (
                            <li key={u.id} data-testid={`admin-user-row-${u.username}`} className="px-4 py-3 flex items-center gap-3">
                                <Avatar user={u} size={40} />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="font-medium text-[14px] truncate">{u.name || u.username}</span>
                                        <span className="font-mono text-[11.5px] text-black/45">@{u.username}</span>
                                        {u.verified && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600 font-medium">verified</span>}
                                        {u.is_admin && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700 font-medium">admin</span>}
                                        {u.banned && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-600 font-medium">banido</span>}
                                        {u.online && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 font-medium">online</span>}
                                    </div>
                                    <div className="text-[11.5px] text-black/55 truncate">
                                        {u.email} · seguidores {u.followers_count} · entrou {fmtRelative(u.created_at)}
                                    </div>
                                    {u.banned && u.ban_reason && (
                                        <div className="text-[11px] text-red-600/85 mt-0.5">Motivo: {u.ban_reason}</div>
                                    )}
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                    <button
                                        onClick={() => onVerify(u)} disabled={busy}
                                        data-testid={`admin-user-verify-${u.username}`}
                                        title={u.verified ? "Desverificar" : "Verificar"}
                                        className="w-8 h-8 grid place-items-center rounded-full hover:bg-black/[0.05] disabled:opacity-40"
                                    >
                                        <ShieldCheck size={15} className={u.verified ? "text-blue-600" : "text-black/55"} />
                                    </button>
                                    <button
                                        onClick={() => onToggleAdmin(u)} disabled={busy || isMe}
                                        data-testid={`admin-user-admin-${u.username}`}
                                        title={isMe ? "Não te podes alterar a ti próprio" : (u.is_admin ? "Remover admin" : "Promover a admin")}
                                        className="w-8 h-8 grid place-items-center rounded-full hover:bg-black/[0.05] disabled:opacity-40"
                                    >
                                        <Shield size={15} className={u.is_admin ? "text-amber-600" : "text-black/55"} />
                                    </button>
                                    {u.banned ? (
                                        <button
                                            onClick={() => onUnban(u)} disabled={busy}
                                            data-testid={`admin-user-unban-${u.username}`}
                                            title="Desbanir"
                                            className="w-8 h-8 grid place-items-center rounded-full hover:bg-emerald-500/10 disabled:opacity-40 text-emerald-700"
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
                                        className="w-8 h-8 grid place-items-center rounded-full hover:bg-black/[0.05] disabled:opacity-40 text-black/55"
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
    { key: "all", label: "Todos" },
    { key: "featured", label: "Destacados" },
    { key: "drafts", label: "Rascunhos" },
    { key: "scheduled", label: "Agendados" },
];

function PostsTab() {
    const [q, setQ] = useState("");
    const [filter, setFilter] = useState("all");
    const [page, setPage] = useState(1);
    const [data, setData] = useState({ items: [], total: 0, limit: 20 });
    const [loading, setLoading] = useState(false);
    const [busyId, setBusyId] = useState(null);
    const [reloadAt, setReloadAt] = useState(0);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get("/admin/posts", { params: { q, filter, page, limit: 20 } });
            setData(data);
        } catch (e) { apiError(e); }
        finally { setLoading(false); }
    }, [q, filter, page, reloadAt]);
    useEffect(() => { load(); }, [load]);

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

    const onDelete = (p) => confirmDialog({
        title: "Eliminar publicação?",
        body: "A publicação e todos os comentários e reports associados serão removidos. Acção definitiva.",
        confirmLabel: "Eliminar",
        danger: true,
    }).then((ok) => ok && act(p.id, async () => {
        await api.delete(`/admin/posts/${p.id}`);
        toast.success("Publicação eliminada");
    }));

    return (
        <div className="space-y-4" data-testid="admin-posts">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <h2 className="font-display text-[22px] tracking-tight">Publicações</h2>
                <button
                    onClick={() => setReloadAt(Date.now())}
                    data-testid="admin-posts-refresh"
                    className="h-9 px-3 rounded-full bg-black/[0.05] hover:bg-black/[0.1] inline-flex items-center gap-1.5 text-[13px]"
                >
                    <RefreshCcw size={14} /> Atualizar
                </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
                <div className="relative flex-1 min-w-[240px]">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40" />
                    <input
                        type="text" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }}
                        placeholder="Pesquisar por conteúdo ou ID"
                        data-testid="admin-posts-search"
                        className="w-full h-10 pl-9 pr-4 rounded-full bg-black/[0.04] focus:bg-white focus:ring-2 ring-black/15 text-[13.5px] outline-none"
                    />
                </div>
                <div className="flex items-center gap-1 bg-black/[0.04] rounded-full p-1">
                    {POST_FILTERS.map((f) => (
                        <button key={f.key} onClick={() => { setFilter(f.key); setPage(1); }}
                            data-testid={`admin-posts-filter-${f.key}`}
                            className={`h-8 px-3 rounded-full text-[12px] font-medium ${filter === f.key ? "bg-black text-white" : "text-black/70 hover:bg-black/[0.05]"}`}
                        >{f.label}</button>
                    ))}
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden">
                {loading && <div className="px-4 py-3 text-[12px] text-black/45 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> A carregar…</div>}
                {!loading && data.items.length === 0 && (
                    <div className="px-4 py-10 text-center text-black/45 text-[13px]">Sem publicações.</div>
                )}
                <ul className="divide-y divide-black/[0.05]">
                    {data.items.map((p) => (
                        <li key={p.id} data-testid={`admin-post-row-${p.id}`} className="px-4 py-3 flex items-start gap-3">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-medium text-[13.5px]">@{p.author_username || "—"}</span>
                                    <span className="font-mono text-[10.5px] text-black/40">{p.kind}</span>
                                    {p.image && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/[0.06] text-black/55">com imagem</span>}
                                    {p.featured && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700">destacado</span>}
                                    {p.is_draft && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600">rascunho</span>}
                                    {p.scheduled_at && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-700">agendado</span>}
                                    {p.community_slug && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700">c/{p.community_slug}</span>}
                                </div>
                                <div className="text-[13px] text-black mt-1 line-clamp-3 whitespace-pre-wrap break-words">{p.content || "—"}</div>
                                <div className="text-[11px] text-black/45 mt-1 font-mono">
                                    {p.likes_count} ♥ · {p.comments_count} 💬 · {fmtRelative(p.created_at)} · {p.id.slice(0, 8)}
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                                <button
                                    onClick={() => onFeature(p)} disabled={busyId === p.id}
                                    data-testid={`admin-post-feature-${p.id}`}
                                    title={p.featured ? "Remover destaque" : "Destacar"}
                                    className="w-8 h-8 grid place-items-center rounded-full hover:bg-amber-500/10 disabled:opacity-40 text-amber-600"
                                >
                                    <Star size={15} fill={p.featured ? "currentColor" : "none"} />
                                </button>
                                <button
                                    onClick={() => onDelete(p)} disabled={busyId === p.id}
                                    data-testid={`admin-post-delete-${p.id}`}
                                    title="Eliminar publicação"
                                    className="w-8 h-8 grid place-items-center rounded-full hover:bg-red-500/15 disabled:opacity-40 text-red-600"
                                >
                                    <Trash2 size={15} />
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
                <div className="px-4 pb-3"><Pager page={page} total={data.total} limit={data.limit} onChange={setPage} /></div>
            </div>
        </div>
    );
}

// -----------------------------------------------------------------
// REPORTS
// -----------------------------------------------------------------
function ReportsTab() {
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

    return (
        <div className="space-y-4" data-testid="admin-reports">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <h2 className="font-display text-[22px] tracking-tight">Reports</h2>
                <button onClick={() => setReloadAt(Date.now())}
                    data-testid="admin-reports-refresh"
                    className="h-9 px-3 rounded-full bg-black/[0.05] hover:bg-black/[0.1] inline-flex items-center gap-1.5 text-[13px]"
                ><RefreshCcw size={14} /> Atualizar</button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center gap-1 bg-black/[0.04] rounded-full p-1">
                    {["open", "closed", "all"].map((s) => (
                        <button key={s} onClick={() => { setStatus(s); setPage(1); }}
                            data-testid={`admin-reports-status-${s}`}
                            className={`h-8 px-3 rounded-full text-[12px] font-medium ${status === s ? "bg-black text-white" : "text-black/70 hover:bg-black/[0.05]"}`}
                        >{s === "open" ? "Abertos" : s === "closed" ? "Resolvidos" : "Todos"}</button>
                    ))}
                </div>
                <div className="flex items-center gap-1 bg-black/[0.04] rounded-full p-1">
                    {["all", "post", "comment", "user"].map((k) => (
                        <button key={k} onClick={() => { setKind(k); setPage(1); }}
                            data-testid={`admin-reports-kind-${k}`}
                            className={`h-8 px-3 rounded-full text-[12px] font-medium ${kind === k ? "bg-black text-white" : "text-black/70 hover:bg-black/[0.05]"}`}
                        >{k === "all" ? "Tudo" : k === "post" ? "Posts" : k === "comment" ? "Comentários" : "Utilizadores"}</button>
                    ))}
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden">
                {loading && <div className="px-4 py-3 text-[12px] text-black/45 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> A carregar…</div>}
                {!loading && data.items.length === 0 && (
                    <div className="px-4 py-10 text-center text-black/45 text-[13px]">Sem reports para os filtros atuais.</div>
                )}
                <ul className="divide-y divide-black/[0.05]">
                    {data.items.map((r) => (
                        <li key={r.id} data-testid={`admin-report-row-${r.id}`} className="px-4 py-3 flex items-start gap-3">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/[0.06] text-black/70 font-medium uppercase tracking-wide">{r.kind}</span>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${r.status === "open" ? "bg-amber-500/15 text-amber-700" : "bg-emerald-500/10 text-emerald-700"}`}>{r.status}</span>
                                    {r.reason && <span className="text-[11px] text-black/65">motivo: {r.reason}</span>}
                                    <span className="text-[11px] text-black/45 ml-auto">{fmtRelative(r.created_at)}</span>
                                </div>
                                <div className="mt-1.5 text-[12.5px] text-black/80">
                                    Reportado por <strong>@{r.reporter?.username || "—"}</strong>
                                </div>
                                {r.target_preview && (r.target_preview.content || r.target_preview.username) && (
                                    <div className="mt-1.5 px-3 py-2 rounded-xl bg-black/[0.03] text-[12.5px] text-black/85 whitespace-pre-wrap break-words">
                                        {r.target_preview.username
                                            ? <>Utilizador alvo: <strong>@{r.target_preview.username}</strong> ({r.target_preview.name})</>
                                            : (r.target_preview.content || "—")}
                                    </div>
                                )}
                                {r.detail && <div className="mt-1 text-[12px] text-black/55 italic">"{r.detail}"</div>}
                                {r.status === "closed" && (
                                    <div className="mt-1 text-[11px] text-black/55 font-mono">
                                        Resolvido como <strong>{r.resolved_action}</strong> {r.resolved_note ? `· ${r.resolved_note}` : ""} ({fmtRelative(r.resolved_at)})
                                    </div>
                                )}
                            </div>
                            {r.status === "open" && (
                                <div className="flex flex-col gap-1.5 shrink-0">
                                    <button onClick={() => resolve(r, "resolved")} disabled={busyId === r.id}
                                        data-testid={`admin-report-resolve-${r.id}`}
                                        className="h-8 px-3 rounded-full bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 text-[12px] font-medium disabled:opacity-40">
                                        Resolver
                                    </button>
                                    <button onClick={() => resolve(r, "dismissed")} disabled={busyId === r.id}
                                        data-testid={`admin-report-dismiss-${r.id}`}
                                        className="h-8 px-3 rounded-full bg-black/[0.05] hover:bg-black/[0.1] text-[12px] font-medium disabled:opacity-40">
                                        Descartar
                                    </button>
                                    {(r.kind === "post" || r.kind === "comment") && (
                                        <button onClick={() => resolve(r, "removed")} disabled={busyId === r.id}
                                            data-testid={`admin-report-remove-${r.id}`}
                                            className="h-8 px-3 rounded-full bg-red-500/10 text-red-600 hover:bg-red-500/20 text-[12px] font-medium disabled:opacity-40">
                                            Remover
                                        </button>
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
                <h2 className="font-display text-[22px] tracking-tight">Comunidades</h2>
                <button onClick={() => setReloadAt(Date.now())}
                    data-testid="admin-communities-refresh"
                    className="h-9 px-3 rounded-full bg-black/[0.05] hover:bg-black/[0.1] inline-flex items-center gap-1.5 text-[13px]"
                ><RefreshCcw size={14} /> Atualizar</button>
            </div>
            <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40" />
                <input type="text" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }}
                    placeholder="Pesquisar por slug, nome ou descrição"
                    data-testid="admin-communities-search"
                    className="w-full h-10 pl-9 pr-4 rounded-full bg-black/[0.04] focus:bg-white focus:ring-2 ring-black/15 text-[13.5px] outline-none"
                />
            </div>
            <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden">
                {loading && <div className="px-4 py-3 text-[12px] text-black/45 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> A carregar…</div>}
                {!loading && data.items.length === 0 && (
                    <div className="px-4 py-10 text-center text-black/45 text-[13px]">Sem comunidades.</div>
                )}
                <ul className="divide-y divide-black/[0.05]">
                    {data.items.map((c) => (
                        <li key={c.slug} className="px-4 py-3 flex items-start gap-3" data-testid={`admin-community-row-${c.slug}`}>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-medium text-[14px]">c/{c.slug}</span>
                                    <span className="text-[12px] text-black/55">· {c.name}</span>
                                    {c.category && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/[0.06]">{c.category}</span>}
                                </div>
                                <div className="text-[12.5px] text-black/65 line-clamp-2 mt-0.5">{c.description}</div>
                                <div className="text-[11px] text-black/45 mt-1 font-mono">{c.members_count} membros · {fmtRelative(c.created_at)}</div>
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
                <h2 className="font-display text-[22px] tracking-tight">Eventos</h2>
                <button onClick={() => setReloadAt(Date.now())}
                    data-testid="admin-events-refresh"
                    className="h-9 px-3 rounded-full bg-black/[0.05] hover:bg-black/[0.1] inline-flex items-center gap-1.5 text-[13px]"
                ><RefreshCcw size={14} /> Atualizar</button>
            </div>
            <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40" />
                <input type="text" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }}
                    placeholder="Pesquisar por título, descrição ou local"
                    data-testid="admin-events-search"
                    className="w-full h-10 pl-9 pr-4 rounded-full bg-black/[0.04] focus:bg-white focus:ring-2 ring-black/15 text-[13.5px] outline-none"
                />
            </div>
            <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden">
                {loading && <div className="px-4 py-3 text-[12px] text-black/45 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> A carregar…</div>}
                {!loading && data.items.length === 0 && (
                    <div className="px-4 py-10 text-center text-black/45 text-[13px]">Sem eventos.</div>
                )}
                <ul className="divide-y divide-black/[0.05]">
                    {data.items.map((e) => (
                        <li key={e.id} className="px-4 py-3 flex items-start gap-3" data-testid={`admin-event-row-${e.id}`}>
                            <div className="flex-1 min-w-0">
                                <div className="font-medium text-[14px]">{e.title}</div>
                                <div className="text-[12.5px] text-black/65 line-clamp-2">{e.description}</div>
                                <div className="text-[11px] text-black/45 mt-1 font-mono">
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
                <h2 className="font-display text-[22px] tracking-tight">Sessões ativas</h2>
                <button onClick={() => setReloadAt(Date.now())}
                    data-testid="admin-sessions-refresh"
                    className="h-9 px-3 rounded-full bg-black/[0.05] hover:bg-black/[0.1] inline-flex items-center gap-1.5 text-[13px]"
                ><RefreshCcw size={14} /> Atualizar</button>
            </div>
            <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden">
                {loading && <div className="px-4 py-3 text-[12px] text-black/45 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> A carregar…</div>}
                {!loading && data.items.length === 0 && (
                    <div className="px-4 py-10 text-center text-black/45 text-[13px]">Sem sessões ativas.</div>
                )}
                <ul className="divide-y divide-black/[0.05]">
                    {data.items.map((s) => (
                        <li key={s.jti} className="px-4 py-3 flex items-center gap-3" data-testid={`admin-session-row-${s.jti}`}>
                            <Avatar user={s.user} size={32} />
                            <div className="flex-1 min-w-0">
                                <div className="font-medium text-[13.5px]">@{s.user?.username || s.user_id?.slice(0, 8)}</div>
                                <div className="text-[11.5px] text-black/55 truncate font-mono">
                                    {s.ip} · {(s.ua || "").slice(0, 80)}
                                </div>
                                <div className="text-[11px] text-black/45 font-mono">
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
    "user.admin_role": "Admin role",
    "user.ban": "Ban",
    "user.unban": "Unban",
    "user.force_logout": "Force logout",
    "user.delete": "Eliminar utilizador",
    "post.delete": "Eliminar post",
    "post.feature": "Destaque post",
    "report.resolve": "Resolver report",
    "community.delete": "Eliminar comunidade",
    "event.delete": "Eliminar evento",
    "session.revoke": "Revogar sessão",
};

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

    return (
        <div className="space-y-4" data-testid="admin-audit">
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <h2 className="font-display text-[22px] tracking-tight">Audit log</h2>
                <button onClick={() => setReloadAt(Date.now())}
                    data-testid="admin-audit-refresh"
                    className="h-9 px-3 rounded-full bg-black/[0.05] hover:bg-black/[0.1] inline-flex items-center gap-1.5 text-[13px]"
                ><RefreshCcw size={14} /> Atualizar</button>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
                <select value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }}
                    data-testid="admin-audit-action-select"
                    className="h-10 px-3 rounded-full bg-black/[0.04] text-[13px] outline-none">
                    <option value="">Todas as acções</option>
                    {actions.map((a) => <option key={a} value={a}>{ACTION_LABELS[a]}</option>)}
                </select>
            </div>
            <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden">
                {loading && <div className="px-4 py-3 text-[12px] text-black/45 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> A carregar…</div>}
                {!loading && data.items.length === 0 && (
                    <div className="px-4 py-10 text-center text-black/45 text-[13px]">Sem registos no audit log.</div>
                )}
                <ul className="divide-y divide-black/[0.05]">
                    {data.items.map((a) => (
                        <li key={a.id} className="px-4 py-2.5 text-[12.5px] flex items-center gap-3 font-mono" data-testid={`admin-audit-row-${a.id}`}>
                            <span className="text-black/40 text-[11px] w-[110px] shrink-0">{fmtRelative(a.created_at)}</span>
                            <span className="px-2 py-0.5 rounded-full bg-black/[0.06] text-black/75 text-[11px] shrink-0">
                                {ACTION_LABELS[a.action] || a.action}
                            </span>
                            <span className="text-black/75 truncate">
                                @{a.actor_username} → {a.target_kind}:{(a.target_id || "").slice(0, 12)}
                            </span>
                            {a.detail && Object.keys(a.detail).length > 0 && (
                                <span className="text-black/45 truncate ml-auto">{JSON.stringify(a.detail)}</span>
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
// MAIN
// -----------------------------------------------------------------
export default function Admin() {
    const { user, loading } = useAuth();
    const [tab, setTab] = useState("overview");

    if (loading) {
        return <div className="flex items-center justify-center py-20 text-black/45"><Loader2 className="animate-spin" /></div>;
    }
    if (!user || !user.is_admin) {
        return <Navigate to="/" replace />;
    }

    return (
        <div className="w-full max-w-5xl mx-auto px-3 sm:px-5 py-5" data-testid="admin-page">
            <header className="mb-5">
                <div className="flex items-center gap-2.5">
                    <span className="w-9 h-9 rounded-2xl grid place-items-center bg-black text-white">
                        <Shield size={18} />
                    </span>
                    <div>
                        <h1 className="font-display text-[26px] leading-none tracking-tight">Painel administrativo</h1>
                        <p className="text-[12.5px] text-black/55 mt-1">
                            Logado como <strong>@{user.username}</strong> · todas as acções ficam registadas no audit log.
                        </p>
                    </div>
                </div>
            </header>

            <nav className="mb-5 overflow-x-auto no-scrollbar -mx-1 px-1" data-testid="admin-tabs">
                <div className="inline-flex items-center gap-1 bg-black/[0.04] rounded-full p-1">
                    {TABS.map((t) => {
                        const Icon = t.icon;
                        const active = tab === t.key;
                        return (
                            <button key={t.key} onClick={() => setTab(t.key)}
                                data-testid={`admin-tab-${t.key}`}
                                className={`h-9 pl-3 pr-3.5 rounded-full inline-flex items-center gap-1.5 text-[12.5px] font-medium whitespace-nowrap transition ${
                                    active ? "bg-black text-white" : "text-black/70 hover:bg-black/[0.05]"
                                }`}>
                                <Icon size={14} /> {t.label}
                            </button>
                        );
                    })}
                </div>
            </nav>

            <div data-testid={`admin-tab-content-${tab}`}>
                {tab === "overview" && <OverviewTab />}
                {tab === "users" && <UsersTab />}
                {tab === "posts" && <PostsTab />}
                {tab === "reports" && <ReportsTab />}
                {tab === "communities" && <CommunitiesTab />}
                {tab === "events" && <EventsTab />}
                {tab === "sessions" && <SessionsTab />}
                {tab === "audit" && <AuditTab />}
            </div>
        </div>
    );
}
