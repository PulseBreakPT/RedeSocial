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
    MessageSquare, Sparkles, Hash, Megaphone, X as XIcon, Download,
    Check, EyeOff, Eye, Heart, Image as ImageIcon, Video, AlertCircle,
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
    { key: "comments", label: "Comentários", icon: MessageSquare },
    { key: "stories", label: "Stories", icon: Sparkles },
    { key: "hashtags", label: "Hashtags", icon: Hash },
    { key: "reports", label: "Reports", icon: AlertTriangle },
    { key: "broadcast", label: "Broadcast", icon: Megaphone },
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
        return <div className="flex items-center justify-center py-16 text-black/45"><Loader2 className="animate-spin" /></div>;
    }
    if (!stats) return null;

    return (
        <div className="space-y-5" data-testid="admin-overview">
            <div className="flex items-center justify-between gap-2 flex-wrap">
                <h2 className="font-display text-[22px] tracking-tight">Visão geral</h2>
                <div className="flex items-center gap-1.5 flex-wrap">
                    <div className="flex items-center gap-1 bg-black/[0.04] rounded-full p-1" title="Auto-atualização">
                        {[{v:0,l:"Off"},{v:15,l:"15s"},{v:30,l:"30s"},{v:60,l:"60s"}].map((o) => (
                            <button key={o.v}
                                onClick={() => setAutoRefresh(o.v)}
                                data-testid={`admin-overview-autorefresh-${o.v}`}
                                className={`h-7 px-2.5 rounded-full text-[11.5px] font-medium ${autoRefresh === o.v ? "bg-black text-white" : "text-black/70 hover:bg-black/[0.05]"}`}
                            >{o.l}</button>
                        ))}
                    </div>
                    <button
                        onClick={() => downloadCsv("/admin/export/users.csv", "lusorae_users.csv")}
                        data-testid="admin-export-users-csv"
                        className="h-9 px-3 rounded-full bg-black/[0.05] hover:bg-black/[0.1] inline-flex items-center gap-1.5 text-[13px]"
                        title="Exportar utilizadores em CSV"
                    >
                        <Download size={14} /> Users CSV
                    </button>
                    <button
                        onClick={() => setReloadAt(Date.now())}
                        data-testid="admin-overview-refresh"
                        className="h-9 px-3 rounded-full bg-black/[0.05] hover:bg-black/[0.1] inline-flex items-center gap-1.5 text-[13px]"
                        title="Atualizar agora"
                    >
                        <RefreshCcw size={14} className={loading ? "animate-spin" : ""} /> Atualizar
                    </button>
                </div>
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

            {/* SYSTEM HEALTH */}
            {health && (
                <div className="bg-white rounded-2xl border border-black/[0.06] p-4" data-testid="admin-system-health">
                    <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
                        <h3 className="font-display text-[16px] tracking-tight flex items-center gap-1.5">
                            <Activity size={14} className="text-emerald-600" /> Saúde do sistema
                        </h3>
                        <div className="text-[11px] font-mono text-black/40">
                            verificado a {fmtDate(health.checked_at)}
                        </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                        <div className="px-3 py-2 rounded-xl bg-emerald-500/[0.08] text-[12px]">
                            <div className="font-mono text-emerald-700 text-[11px] uppercase tracking-wider">WS conexões</div>
                            <div className="text-[18px] font-semibold text-emerald-800 mt-0.5">
                                {health.websocket.sockets} <span className="text-[12px] font-normal text-emerald-700/70">/ {health.websocket.users_connected} users</span>
                            </div>
                        </div>
                        <div className="px-3 py-2 rounded-xl bg-amber-500/[0.08] text-[12px]">
                            <div className="font-mono text-amber-700 text-[11px] uppercase tracking-wider">Hashtags blacklist</div>
                            <div className="text-[18px] font-semibold text-amber-800 mt-0.5">{health.hashtag_blacklist_size}</div>
                        </div>
                        {Object.entries(health.collections).slice(0, 14).map(([name, count]) => (
                            <div key={name} className="px-3 py-2 rounded-xl bg-black/[0.04] text-[12px]">
                                <div className="font-mono text-black/55 text-[11px] uppercase tracking-wider">{name}</div>
                                <div className="text-[16px] font-semibold text-black/85 mt-0.5 font-mono">{fmtNum(count)}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="text-[11px] font-mono text-black/40">
                Gerado a {fmtDate(stats.generated_at)}
                {autoRefresh > 0 && <> · auto-refresh a cada {autoRefresh}s</>}
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

            {/* BULK TOOLBAR */}
            {selected.size > 0 && (
                <div className="bg-black text-white rounded-2xl px-4 py-2.5 flex items-center justify-between gap-2 flex-wrap"
                    data-testid="admin-users-bulk-toolbar">
                    <div className="text-[13px] font-medium">
                        {selected.size} selecionado(s)
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <button onClick={() => runBulk("verify")} disabled={bulkBusy}
                            data-testid="admin-users-bulk-verify"
                            className="h-8 px-3 rounded-full bg-white/15 hover:bg-white/25 text-[12px] font-medium disabled:opacity-40 inline-flex items-center gap-1.5">
                            <ShieldCheck size={13} /> Verificar
                        </button>
                        <button onClick={() => runBulk("unverify")} disabled={bulkBusy}
                            data-testid="admin-users-bulk-unverify"
                            className="h-8 px-3 rounded-full bg-white/15 hover:bg-white/25 text-[12px] font-medium disabled:opacity-40">
                            Desverificar
                        </button>
                        <button onClick={() => runBulk("ban")} disabled={bulkBusy}
                            data-testid="admin-users-bulk-ban"
                            className="h-8 px-3 rounded-full bg-red-500/85 hover:bg-red-500 text-[12px] font-medium disabled:opacity-40 inline-flex items-center gap-1.5">
                            <Ban size={13} /> Banir
                        </button>
                        <button onClick={() => runBulk("unban")} disabled={bulkBusy}
                            data-testid="admin-users-bulk-unban"
                            className="h-8 px-3 rounded-full bg-emerald-500/85 hover:bg-emerald-500 text-[12px] font-medium disabled:opacity-40">
                            Desbanir
                        </button>
                        <button onClick={() => runBulk("force_logout")} disabled={bulkBusy}
                            data-testid="admin-users-bulk-logout"
                            className="h-8 px-3 rounded-full bg-white/15 hover:bg-white/25 text-[12px] font-medium disabled:opacity-40 inline-flex items-center gap-1.5">
                            <UserX size={13} /> Force logout
                        </button>
                        <button onClick={() => setSelected(new Set())}
                            className="h-8 px-2.5 rounded-full hover:bg-white/15 text-[12px] inline-flex items-center gap-1">
                            <XIcon size={13} />
                        </button>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden">
                {data.items.length > 0 && (
                    <div className="px-4 py-2 border-b border-black/[0.05] flex items-center gap-2 text-[12px] text-black/55">
                        <input type="checkbox" checked={allSelected} onChange={selectAll}
                            data-testid="admin-users-select-all"
                            className="w-4 h-4 accent-black cursor-pointer" />
                        <span>Selecionar todos os elegíveis ({selectableCount})</span>
                    </div>
                )}
                {loading && <div className="px-4 py-3 text-[12px] text-black/45 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> A carregar…</div>}
                {!loading && data.items.length === 0 && (
                    <div className="px-4 py-10 text-center text-black/45 text-[13px]">Sem utilizadores para os filtros atuais.</div>
                )}
                <ul className="divide-y divide-black/[0.05]">
                    {data.items.map((u) => {
                        const isMe = me?.id === u.id;
                        const busy = busyId === u.id;
                        const canSelect = !isMe && !u.is_admin;
                        const isSel = selected.has(u.id);
                        return (
                            <li key={u.id} data-testid={`admin-user-row-${u.username}`} className={`px-4 py-3 flex items-center gap-3 ${isSel ? "bg-amber-500/[0.06]" : ""}`}>
                                <input type="checkbox"
                                    checked={isSel}
                                    disabled={!canSelect}
                                    onChange={() => toggleSelect(u.id)}
                                    data-testid={`admin-user-select-${u.username}`}
                                    className="w-4 h-4 accent-black cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
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
                                    className="flex-1 min-w-0 text-left hover:bg-black/[0.02] rounded-xl px-2 -mx-2 py-1 -my-1 transition"
                                    title="Abrir detalhes"
                                >
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
                                </button>

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
    const [selected, setSelected] = useState(() => new Set());
    const [bulkBusy, setBulkBusy] = useState(false);

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

            {selected.size > 0 && (
                <div className="bg-black text-white rounded-2xl px-4 py-2.5 flex items-center justify-between gap-2 flex-wrap"
                    data-testid="admin-posts-bulk-toolbar">
                    <div className="text-[13px] font-medium">{selected.size} selecionada(s)</div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <button onClick={() => runBulk("feature")} disabled={bulkBusy}
                            data-testid="admin-posts-bulk-feature"
                            className="h-8 px-3 rounded-full bg-amber-500/85 hover:bg-amber-500 text-[12px] font-medium disabled:opacity-40 inline-flex items-center gap-1.5">
                            <Star size={13} /> Destacar
                        </button>
                        <button onClick={() => runBulk("unfeature")} disabled={bulkBusy}
                            data-testid="admin-posts-bulk-unfeature"
                            className="h-8 px-3 rounded-full bg-white/15 hover:bg-white/25 text-[12px] font-medium disabled:opacity-40">
                            Remover destaque
                        </button>
                        <button onClick={() => runBulk("delete")} disabled={bulkBusy}
                            data-testid="admin-posts-bulk-delete"
                            className="h-8 px-3 rounded-full bg-red-500/85 hover:bg-red-500 text-[12px] font-medium disabled:opacity-40 inline-flex items-center gap-1.5">
                            <Trash2 size={13} /> Eliminar
                        </button>
                        <button onClick={() => setSelected(new Set())}
                            className="h-8 px-2.5 rounded-full hover:bg-white/15 text-[12px]">
                            <XIcon size={13} />
                        </button>
                    </div>
                </div>
            )}

            <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden">
                {data.items.length > 0 && (
                    <div className="px-4 py-2 border-b border-black/[0.05] flex items-center gap-2 text-[12px] text-black/55">
                        <input type="checkbox" checked={allSelected} onChange={selectAll}
                            data-testid="admin-posts-select-all"
                            className="w-4 h-4 accent-black cursor-pointer" />
                        <span>Selecionar tudo nesta página ({data.items.length})</span>
                    </div>
                )}
                {loading && <div className="px-4 py-3 text-[12px] text-black/45 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> A carregar…</div>}
                {!loading && data.items.length === 0 && (
                    <div className="px-4 py-10 text-center text-black/45 text-[13px]">Sem publicações.</div>
                )}
                <ul className="divide-y divide-black/[0.05]">
                    {data.items.map((p) => {
                        const isSel = selected.has(p.id);
                        return (
                        <li key={p.id} data-testid={`admin-post-row-${p.id}`} className={`px-4 py-3 flex items-start gap-3 ${isSel ? "bg-amber-500/[0.06]" : ""}`}>
                            <input type="checkbox" checked={isSel} onChange={() => toggleSelect(p.id)}
                                data-testid={`admin-post-select-${p.id}`}
                                className="w-4 h-4 accent-black cursor-pointer mt-1" />
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
                        );
                    })}
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
    "user.bulk": "Bulk utilizadores",
    "post.delete": "Eliminar post",
    "post.feature": "Destaque post",
    "post.bulk": "Bulk posts",
    "comment.delete": "Eliminar comentário",
    "story.delete": "Eliminar story",
    "hashtag.blacklist": "Hashtag blacklist",
    "broadcast.send": "Broadcast",
    "report.resolve": "Resolver report",
    "community.delete": "Eliminar comunidade",
    "event.delete": "Eliminar evento",
    "session.revoke": "Revogar sessão",
    "export.users": "Export utilizadores",
    "export.audit": "Export audit log",
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
                <h2 className="font-display text-[22px] tracking-tight">Audit log</h2>
                <div className="flex items-center gap-1.5">
                    <button onClick={downloadCsv}
                        data-testid="admin-audit-export"
                        className="h-9 px-3 rounded-full bg-black/[0.05] hover:bg-black/[0.1] inline-flex items-center gap-1.5 text-[13px]"
                    ><Download size={14} /> Export CSV</button>
                    <button onClick={() => setReloadAt(Date.now())}
                        data-testid="admin-audit-refresh"
                        className="h-9 px-3 rounded-full bg-black/[0.05] hover:bg-black/[0.1] inline-flex items-center gap-1.5 text-[13px]"
                    ><RefreshCcw size={14} /> Atualizar</button>
                </div>
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
                <h2 className="font-display text-[22px] tracking-tight">Comentários</h2>
                <button onClick={() => setReloadAt(Date.now())}
                    data-testid="admin-comments-refresh"
                    className="h-9 px-3 rounded-full bg-black/[0.05] hover:bg-black/[0.1] inline-flex items-center gap-1.5 text-[13px]"
                ><RefreshCcw size={14} /> Atualizar</button>
            </div>

            <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40" />
                <input type="text" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }}
                    placeholder="Pesquisar por conteúdo, ID do comentário ou post"
                    data-testid="admin-comments-search"
                    className="w-full h-10 pl-9 pr-4 rounded-full bg-black/[0.04] focus:bg-white focus:ring-2 ring-black/15 text-[13.5px] outline-none"
                />
            </div>

            <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden">
                {loading && <div className="px-4 py-3 text-[12px] text-black/45 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> A carregar…</div>}
                {!loading && data.items.length === 0 && <div className="px-4 py-10 text-center text-black/45 text-[13px]">Sem comentários.</div>}
                <ul className="divide-y divide-black/[0.05]">
                    {data.items.map((c) => (
                        <li key={c.id} data-testid={`admin-comment-row-${c.id}`} className="px-4 py-3 flex items-start gap-3">
                            <Avatar user={{ avatar: c.author_avatar, username: c.author_username, name: c.author_name }} size={36} />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-medium text-[13.5px]">{c.author_name || c.author_username || "—"}</span>
                                    <span className="font-mono text-[11px] text-black/45">@{c.author_username}</span>
                                    {c.parent_id && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-700">resposta</span>}
                                    <span className="text-[11px] text-black/45 ml-auto">{fmtRelative(c.created_at)}</span>
                                </div>
                                <div className="text-[13px] text-black/85 mt-1 whitespace-pre-wrap break-words">{c.content}</div>
                                <div className="mt-1 flex items-center gap-3 text-[11px] text-black/45 font-mono">
                                    <span>{c.likes_count} ♥</span>
                                    <span>{c.replies_count} respostas</span>
                                    <a href={`/post/${c.post_id}`} target="_blank" rel="noopener noreferrer"
                                        className="hover:text-black/75 underline-offset-2 hover:underline">
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
    { key: "active", label: "Ativas" },
    { key: "expired", label: "Expiradas" },
    { key: "all", label: "Todas" },
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
                <h2 className="font-display text-[22px] tracking-tight">Stories</h2>
                <button onClick={() => setReloadAt(Date.now())}
                    data-testid="admin-stories-refresh"
                    className="h-9 px-3 rounded-full bg-black/[0.05] hover:bg-black/[0.1] inline-flex items-center gap-1.5 text-[13px]"
                ><RefreshCcw size={14} /> Atualizar</button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
                <div className="relative flex-1 min-w-[240px]">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40" />
                    <input type="text" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }}
                        placeholder="Pesquisar por legenda, ID ou autor"
                        data-testid="admin-stories-search"
                        className="w-full h-10 pl-9 pr-4 rounded-full bg-black/[0.04] focus:bg-white focus:ring-2 ring-black/15 text-[13.5px] outline-none"
                    />
                </div>
                <div className="flex items-center gap-1 bg-black/[0.04] rounded-full p-1">
                    {STORY_FILTERS.map((f) => (
                        <button key={f.key} onClick={() => { setFilter(f.key); setPage(1); }}
                            data-testid={`admin-stories-filter-${f.key}`}
                            className={`h-8 px-3 rounded-full text-[12px] font-medium ${filter === f.key ? "bg-black text-white" : "text-black/70 hover:bg-black/[0.05]"}`}
                        >{f.label}</button>
                    ))}
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden">
                {loading && <div className="px-4 py-3 text-[12px] text-black/45 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> A carregar…</div>}
                {!loading && data.items.length === 0 && <div className="px-4 py-10 text-center text-black/45 text-[13px]">Sem stories.</div>}
                <ul className="divide-y divide-black/[0.05]">
                    {data.items.map((s) => (
                        <li key={s.id} data-testid={`admin-story-row-${s.id}`} className="px-4 py-3 flex items-center gap-3">
                            <Avatar user={{ avatar: s.author_avatar, username: s.author_username, name: s.author_name }} size={36} />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-medium text-[13.5px]">@{s.author_username || "—"}</span>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/[0.06] text-black/65 inline-flex items-center gap-0.5">
                                        {s.media_type === "video" ? <Video size={10} /> : <ImageIcon size={10} />} {s.media_type}
                                    </span>
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/[0.06] text-black/55">{s.audience}</span>
                                    {s.is_active
                                        ? <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700">ativa</span>
                                        : <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/[0.06] text-black/55">expirada</span>
                                    }
                                </div>
                                {s.caption && <div className="text-[13px] text-black/80 mt-0.5 line-clamp-2 break-words">{s.caption}</div>}
                                <div className="mt-0.5 text-[11px] text-black/45 font-mono">
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
    { key: "all", label: "Todas" },
    { key: "active", label: "Ativas" },
    { key: "blacklisted", label: "Blacklist" },
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
                <h2 className="font-display text-[22px] tracking-tight">Hashtags</h2>
                <button onClick={() => setReloadAt(Date.now())}
                    data-testid="admin-hashtags-refresh"
                    className="h-9 px-3 rounded-full bg-black/[0.05] hover:bg-black/[0.1] inline-flex items-center gap-1.5 text-[13px]"
                ><RefreshCcw size={14} /> Atualizar</button>
            </div>

            <div className="bg-amber-500/[0.08] border border-amber-500/20 rounded-2xl px-4 py-3 text-[12.5px] text-amber-900/85 flex items-start gap-2">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                <div>
                    Hashtags em blacklist são <strong>removidas</strong> do trending e do <strong>explore</strong>.
                    Os posts permanecem visíveis no perfil dos autores, mas deixam de ser amplificados publicamente.
                </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40" />
                    <input type="text" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }}
                        placeholder="Pesquisar hashtag…"
                        data-testid="admin-hashtags-search"
                        className="w-full h-10 pl-9 pr-4 rounded-full bg-black/[0.04] focus:bg-white focus:ring-2 ring-black/15 text-[13.5px] outline-none"
                    />
                </div>
                <div className="flex items-center gap-1 bg-black/[0.04] rounded-full p-1">
                    {HASHTAG_FILTERS.map((f) => (
                        <button key={f.key} onClick={() => { setFilter(f.key); setPage(1); }}
                            data-testid={`admin-hashtags-filter-${f.key}`}
                            className={`h-8 px-3 rounded-full text-[12px] font-medium ${filter === f.key ? "bg-black text-white" : "text-black/70 hover:bg-black/[0.05]"}`}
                        >{f.label}</button>
                    ))}
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-black/[0.06] p-3 flex items-center gap-2 flex-wrap">
                <input type="text" value={manualTag} onChange={(e) => setManualTag(e.target.value)}
                    placeholder="Adicionar hashtag à blacklist (#exemplo)"
                    data-testid="admin-hashtags-manual"
                    onKeyDown={(e) => { if (e.key === "Enter") onManualBlacklist(); }}
                    className="flex-1 min-w-[200px] h-9 px-3 rounded-full bg-black/[0.04] focus:bg-white focus:ring-2 ring-black/15 text-[13px] outline-none"
                />
                <button onClick={onManualBlacklist} disabled={!manualTag.trim()}
                    data-testid="admin-hashtags-manual-add"
                    className="h-9 px-4 rounded-full bg-red-600 text-white text-[12.5px] font-medium hover:bg-red-700 disabled:opacity-40 inline-flex items-center gap-1.5">
                    <EyeOff size={13} /> Bloquear
                </button>
            </div>

            <div className="bg-white rounded-2xl border border-black/[0.06] overflow-hidden">
                {loading && <div className="px-4 py-3 text-[12px] text-black/45 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> A carregar…</div>}
                {!loading && data.items.length === 0 && <div className="px-4 py-10 text-center text-black/45 text-[13px]">Sem hashtags.</div>}
                <ul className="divide-y divide-black/[0.05]">
                    {data.items.map((h) => (
                        <li key={h.tag} data-testid={`admin-hashtag-row-${h.tag}`} className={`px-4 py-2.5 flex items-center gap-3 ${h.blacklisted ? "bg-red-500/[0.04]" : ""}`}>
                            <Hash size={14} className={h.blacklisted ? "text-red-600/70" : "text-black/40"} />
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className={`font-medium text-[14px] ${h.blacklisted ? "line-through text-red-700" : "text-black/85"}`}>#{h.tag}</span>
                                    <span className="font-mono text-[11.5px] text-black/45">{fmtNum(h.count)} posts</span>
                                    {h.blacklisted && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-600 font-medium inline-flex items-center gap-0.5">
                                        <EyeOff size={9} /> blacklist
                                    </span>}
                                </div>
                                {h.blacklisted && h.blacklist_reason && (
                                    <div className="text-[11.5px] text-red-700/80 mt-0.5">Motivo: {h.blacklist_reason}</div>
                                )}
                                {h.blacklisted && h.blacklisted_at && (
                                    <div className="text-[10.5px] text-black/45 mt-0.5 font-mono">desde {fmtDate(h.blacklisted_at)}</div>
                                )}
                            </div>
                            <button
                                onClick={() => toggleBlacklist(h.tag, !h.blacklisted)}
                                disabled={busyTag === h.tag}
                                data-testid={`admin-hashtag-toggle-${h.tag}`}
                                className={`h-8 px-3 rounded-full text-[12px] font-medium disabled:opacity-40 inline-flex items-center gap-1.5 ${
                                    h.blacklisted
                                        ? "bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20"
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
            <h2 className="font-display text-[22px] tracking-tight">Broadcast</h2>

            <div className="bg-amber-500/[0.08] border border-amber-500/20 rounded-2xl px-4 py-3 text-[12.5px] text-amber-900/85 flex items-start gap-2">
                <Megaphone size={14} className="mt-0.5 shrink-0" />
                <div>
                    A broadcast envia uma notificação <strong>real</strong> e persistente para cada destinatário (e push via WS se estiverem online).
                    Usa com critério — uma vez enviada não pode ser revertida.
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-black/[0.06] p-4 space-y-3">
                <label className="block">
                    <div className="text-[12px] font-medium text-black/65 mb-1">Mensagem (até 280)</div>
                    <textarea value={text} onChange={(e) => setText(e.target.value)}
                        rows={3} maxLength={300}
                        placeholder="Ex.: Nova versão do Lusorae já disponível 🎉"
                        data-testid="admin-broadcast-text"
                        className="w-full px-3 py-2 rounded-xl bg-black/[0.04] focus:bg-white focus:ring-2 ring-black/15 text-[14px] outline-none resize-none"
                    />
                    <div className={`text-[11px] mt-1 font-mono ${remaining < 0 ? "text-red-600" : "text-black/45"}`}>
                        {remaining} caracteres restantes
                    </div>
                </label>

                <label className="block">
                    <div className="text-[12px] font-medium text-black/65 mb-1">Link (opcional)</div>
                    <input type="text" value={link} onChange={(e) => setLink(e.target.value)}
                        placeholder="ex: /trending ou https://..."
                        data-testid="admin-broadcast-link"
                        className="w-full h-10 px-3 rounded-xl bg-black/[0.04] focus:bg-white focus:ring-2 ring-black/15 text-[13.5px] outline-none"
                    />
                </label>

                <div className="grid sm:grid-cols-2 gap-3">
                    <label className="block">
                        <div className="text-[12px] font-medium text-black/65 mb-1">Audiência</div>
                        <select value={audience} onChange={(e) => setAudience(e.target.value)}
                            data-testid="admin-broadcast-audience"
                            className="w-full h-10 px-3 rounded-xl bg-black/[0.04] focus:bg-white focus:ring-2 ring-black/15 text-[13.5px] outline-none">
                            {AUDIENCES.map((a) => <option key={a.key} value={a.key}>{a.label}</option>)}
                        </select>
                    </label>
                    <label className="block">
                        <div className="text-[12px] font-medium text-black/65 mb-1">Cidade (filtro extra opcional)</div>
                        <input type="text" value={city} onChange={(e) => setCity(e.target.value)}
                            placeholder="Ex.: Lisboa"
                            data-testid="admin-broadcast-city"
                            className="w-full h-10 px-3 rounded-xl bg-black/[0.04] focus:bg-white focus:ring-2 ring-black/15 text-[13.5px] outline-none"
                        />
                    </label>
                </div>

                <div className="flex items-center justify-between gap-3 pt-1 flex-wrap">
                    <div className="text-[12.5px] text-black/65 inline-flex items-center gap-1.5" data-testid="admin-broadcast-count">
                        <UsersIcon size={13} />
                        {busy ? <Loader2 size={13} className="animate-spin" /> : <strong className="font-mono">{count ?? "—"}</strong>}
                        destinatário(s) com este filtro
                    </div>
                    <button onClick={onSend}
                        disabled={sending || !text.trim() || count === 0}
                        data-testid="admin-broadcast-send"
                        className="h-10 px-5 rounded-full bg-black text-white text-[13px] font-medium hover:bg-black/85 disabled:opacity-40 inline-flex items-center gap-1.5">
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
function UserDrawer({ user, onClose }) {
    const [tab, setTab] = useState("profile");
    const [detail, setDetail] = useState(null);
    const [posts, setPosts] = useState(null);
    const [comments, setComments] = useState(null);
    const [reports, setReports] = useState(null);
    const [sessions, setSessions] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!user) return;
        setLoading(true);
        api.get(`/admin/users/${user.id}`)
            .then(({ data }) => setDetail(data))
            .catch(apiError)
            .finally(() => setLoading(false));
    }, [user]);

    useEffect(() => {
        if (!user) return;
        if (tab === "posts" && posts === null) {
            api.get(`/admin/users/${user.id}/posts`, { params: { page: 1, limit: 20 } })
                .then(({ data }) => setPosts(data)).catch(apiError);
        }
        if (tab === "comments" && comments === null) {
            api.get(`/admin/users/${user.id}/comments`, { params: { page: 1, limit: 20 } })
                .then(({ data }) => setComments(data)).catch(apiError);
        }
        if (tab === "reports" && reports === null) {
            api.get(`/admin/users/${user.id}/reports`)
                .then(({ data }) => setReports(data)).catch(apiError);
        }
        if (tab === "sessions" && sessions === null) {
            api.get(`/admin/users/${user.id}/sessions`)
                .then(({ data }) => setSessions(data)).catch(apiError);
        }
    }, [tab, user, posts, comments, reports, sessions]);

    if (!user) return null;
    const u = detail || user;
    const drawerTabs = [
        { k: "profile", l: "Perfil" },
        { k: "posts", l: "Posts" },
        { k: "comments", l: "Comentários" },
        { k: "reports", l: "Reports" },
        { k: "sessions", l: "Sessões" },
    ];

    return (
        <div className="fixed inset-0 z-[80]" data-testid="admin-user-drawer">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
            <aside className="absolute right-0 top-0 bottom-0 w-full max-w-[520px] bg-white shadow-2xl flex flex-col">
                <header className="px-4 py-3 border-b border-black/[0.06] flex items-center gap-3">
                    <Avatar user={u} size={42} />
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-display text-[16px] tracking-tight truncate">{u.name || u.username}</span>
                            {u.verified && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-500/10 text-blue-600">verified</span>}
                            {u.is_admin && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-700">admin</span>}
                            {u.banned && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-600">banido</span>}
                        </div>
                        <div className="text-[12px] text-black/55 truncate font-mono">@{u.username} · {u.email}</div>
                    </div>
                    <button onClick={onClose} data-testid="admin-user-drawer-close"
                        className="w-9 h-9 grid place-items-center rounded-full hover:bg-black/[0.05]">
                        <XIcon size={16} />
                    </button>
                </header>

                <nav className="px-3 pt-3 flex items-center gap-1 bg-white border-b border-black/[0.04] overflow-x-auto no-scrollbar">
                    {drawerTabs.map((t) => (
                        <button key={t.k} onClick={() => setTab(t.k)}
                            data-testid={`admin-user-drawer-tab-${t.k}`}
                            className={`h-8 px-3 rounded-full text-[12px] font-medium whitespace-nowrap mb-2 ${tab === t.k ? "bg-black text-white" : "text-black/70 hover:bg-black/[0.05]"}`}
                        >{t.l}</button>
                    ))}
                </nav>

                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                    {loading && !detail && <div className="flex items-center justify-center py-10 text-black/45"><Loader2 className="animate-spin" /></div>}
                    {tab === "profile" && detail && (
                        <dl className="space-y-2 text-[13px]">
                            {[
                                ["ID", u.id],
                                ["Username", `@${u.username}`],
                                ["Nome", u.name || "—"],
                                ["Email", u.email],
                                ["Cidade", u.city || "—"],
                                ["Bio", u.bio || "—"],
                                ["Criado", fmtDate(u.created_at)],
                                ["Last seen", fmtDate(u.last_seen)],
                                ["Seguidores", `${u.followers_count} · segue ${u.following_count}`],
                                ["Privado", u.private ? "sim" : "não"],
                                ["Verificado", u.verified ? "sim" : "não"],
                                ["Admin", u.is_admin ? "sim" : "não"],
                                ["Banido", u.banned ? `sim — ${u.ban_reason || "(sem motivo)"}` : "não"],
                                ["Posts", u.posts_count],
                                ["Comentários", u.comments_count],
                                ["Stories", u.stories_count],
                                ["Reports contra", u.reports_against_count],
                                ["Reports feitos", u.reports_made_count],
                                ["Sessões ativas", u.active_sessions],
                            ].map(([k, v]) => (
                                <div key={k} className="flex items-start gap-2 py-1 border-b border-black/[0.04]">
                                    <dt className="w-32 shrink-0 text-[11.5px] uppercase tracking-wider text-black/45 font-mono">{k}</dt>
                                    <dd className="flex-1 break-words text-black/85">{v == null || v === "" ? "—" : String(v)}</dd>
                                </div>
                            ))}
                        </dl>
                    )}
                    {tab === "posts" && (
                        posts === null ? <div className="text-black/45"><Loader2 className="animate-spin inline" size={14} /> A carregar…</div> :
                        posts.items.length === 0 ? <div className="text-black/45 text-[13px] py-6 text-center">Sem posts.</div> :
                        <ul className="space-y-2" data-testid="admin-user-drawer-posts-list">
                            {posts.items.map((p) => (
                                <li key={p.id} className="px-3 py-2 rounded-xl bg-black/[0.03]">
                                    <div className="flex items-center gap-1.5 text-[11px] text-black/55 font-mono">
                                        <span>{p.kind}</span>
                                        {p.featured && <Star size={11} className="text-amber-600" fill="currentColor" />}
                                        <span className="ml-auto">{fmtRelative(p.created_at)}</span>
                                    </div>
                                    <div className="text-[13px] mt-1 line-clamp-3 break-words">{p.content || "—"}</div>
                                    <div className="text-[11px] text-black/45 mt-1 font-mono">{p.likes_count} ♥ · {p.comments_count} 💬</div>
                                </li>
                            ))}
                        </ul>
                    )}
                    {tab === "comments" && (
                        comments === null ? <div className="text-black/45"><Loader2 className="animate-spin inline" size={14} /> A carregar…</div> :
                        comments.items.length === 0 ? <div className="text-black/45 text-[13px] py-6 text-center">Sem comentários.</div> :
                        <ul className="space-y-2" data-testid="admin-user-drawer-comments-list">
                            {comments.items.map((c) => (
                                <li key={c.id} className="px-3 py-2 rounded-xl bg-black/[0.03]">
                                    <div className="text-[13px] break-words">{c.content}</div>
                                    <div className="text-[11px] text-black/45 mt-0.5 font-mono">
                                        {c.likes_count} ♥ · {fmtRelative(c.created_at)} · post {c.post_id?.slice(0,8)}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                    {tab === "reports" && (
                        reports === null ? <div className="text-black/45"><Loader2 className="animate-spin inline" size={14} /> A carregar…</div> :
                        (reports.against.length === 0 && reports.by.length === 0) ?
                            <div className="text-black/45 text-[13px] py-6 text-center">Sem reports.</div> :
                            <div className="space-y-3" data-testid="admin-user-drawer-reports-list">
                                <div>
                                    <div className="text-[11px] uppercase tracking-wider text-black/45 font-mono mb-1.5">Contra este utilizador ({reports.against.length})</div>
                                    {reports.against.length === 0 ? <div className="text-[12px] text-black/45 italic">Nenhum</div> :
                                        <ul className="space-y-1.5">{reports.against.map((r) => (
                                            <li key={r.id} className="px-3 py-1.5 rounded-xl bg-red-500/[0.06] text-[12px]">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-700">{r.kind}</span>
                                                    <span className="font-mono text-[10.5px] text-black/55">{r.status}</span>
                                                    <span className="ml-auto text-[10.5px] text-black/45">{fmtRelative(r.created_at)}</span>
                                                </div>
                                                {r.reason && <div className="mt-0.5">motivo: {r.reason}</div>}
                                            </li>
                                        ))}</ul>
                                    }
                                </div>
                                <div>
                                    <div className="text-[11px] uppercase tracking-wider text-black/45 font-mono mb-1.5">Feitos por este utilizador ({reports.by.length})</div>
                                    {reports.by.length === 0 ? <div className="text-[12px] text-black/45 italic">Nenhum</div> :
                                        <ul className="space-y-1.5">{reports.by.map((r) => (
                                            <li key={r.id} className="px-3 py-1.5 rounded-xl bg-black/[0.04] text-[12px]">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/[0.06] text-black/65">{r.kind}</span>
                                                    <span className="font-mono text-[10.5px] text-black/55">{r.status}</span>
                                                    <span className="ml-auto text-[10.5px] text-black/45">{fmtRelative(r.created_at)}</span>
                                                </div>
                                                {r.reason && <div className="mt-0.5">motivo: {r.reason}</div>}
                                            </li>
                                        ))}</ul>
                                    }
                                </div>
                            </div>
                    )}
                    {tab === "sessions" && (
                        sessions === null ? <div className="text-black/45"><Loader2 className="animate-spin inline" size={14} /> A carregar…</div> :
                        sessions.items.length === 0 ? <div className="text-black/45 text-[13px] py-6 text-center">Sem sessões registadas.</div> :
                        <ul className="space-y-1.5" data-testid="admin-user-drawer-sessions-list">{sessions.items.map((s) => (
                            <li key={s.jti} className="px-3 py-2 rounded-xl bg-black/[0.03] text-[12px]">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${s.revoked ? "bg-black/[0.08] text-black/55" : "bg-emerald-500/15 text-emerald-700"}`}>
                                        {s.revoked ? "revogada" : "ativa"}
                                    </span>
                                    <span className="font-mono text-[10.5px] text-black/55 truncate">{(s.user_agent || "").slice(0, 60) || "—"}</span>
                                </div>
                                <div className="text-[11px] text-black/45 mt-0.5 font-mono">
                                    {s.ip || "—"} · visto {fmtRelative(s.last_seen_at)} · jti {s.jti?.slice(0,8)}
                                </div>
                            </li>
                        ))}</ul>
                    )}
                </div>
            </aside>
        </div>
    );
}


// -----------------------------------------------------------------
// MAIN
// -----------------------------------------------------------------
export default function Admin() {
    const { user, loading } = useAuth();
    const [tab, setTab] = useState("overview");
    const [drawerUser, setDrawerUser] = useState(null);
    const [openReports, setOpenReports] = useState(null);

    // Poll open reports count for badge
    useEffect(() => {
        if (!user || !user.is_admin) return;
        let mounted = true;
        const fetchCount = async () => {
            try {
                const { data } = await api.get("/admin/stats");
                if (mounted) setOpenReports(data?.moderation?.reports_open ?? 0);
            } catch { /* silent */ }
        };
        fetchCount();
        const t = setInterval(fetchCount, 30000);
        return () => { mounted = false; clearInterval(t); };
    }, [user]);

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
                        const showBadge = t.key === "reports" && openReports != null && openReports > 0;
                        return (
                            <button key={t.key} onClick={() => setTab(t.key)}
                                data-testid={`admin-tab-${t.key}`}
                                className={`h-9 pl-3 pr-3.5 rounded-full inline-flex items-center gap-1.5 text-[12.5px] font-medium whitespace-nowrap transition relative ${
                                    active ? "bg-black text-white" : "text-black/70 hover:bg-black/[0.05]"
                                }`}>
                                <Icon size={14} /> {t.label}
                                {showBadge && (
                                    <span
                                        data-testid="admin-reports-badge"
                                        className={`ml-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-mono font-semibold inline-flex items-center justify-center ${active ? "bg-white text-black" : "bg-red-500 text-white"}`}>
                                        {openReports > 99 ? "99+" : openReports}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </nav>

            <div data-testid={`admin-tab-content-${tab}`}>
                {tab === "overview" && <OverviewTab />}
                {tab === "users" && <UsersTab onOpenDrawer={setDrawerUser} />}
                {tab === "posts" && <PostsTab />}
                {tab === "comments" && <CommentsTab />}
                {tab === "stories" && <StoriesTab />}
                {tab === "hashtags" && <HashtagsTab />}
                {tab === "reports" && <ReportsTab />}
                {tab === "broadcast" && <BroadcastTab />}
                {tab === "communities" && <CommunitiesTab />}
                {tab === "events" && <EventsTab />}
                {tab === "sessions" && <SessionsTab />}
                {tab === "audit" && <AuditTab />}
            </div>

            {drawerUser && <UserDrawer user={drawerUser} onClose={() => setDrawerUser(null)} />}
        </div>
    );
}
