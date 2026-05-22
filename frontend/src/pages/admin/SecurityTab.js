/**
 * Admin → Security Tab — Lusorae
 * ---------------------------------------------------------------
 * SSS-tier real-time security control center. Every figure comes
 * straight from the backend; nothing is mocked, cached client-side
 * beyond brief polling intervals, or hardcoded.
 *
 * Endpoints consumed (all under /api/admin/security/*):
 *   - GET  /overview                  → posture snapshot + counters + warnings + controls
 *   - GET  /events                    → filtered, paginated auth_events feed
 *   - GET  /event-kinds               → kinds present in DB (for filter dropdown)
 *   - GET  /lockouts                  → currently-locked accounts
 *   - POST /lockouts/clear            → unlock an account
 *   - GET  /admins                    → admin accounts + 2FA + sessions + online state
 *   - POST /test-token                → JWT diagnostic (paste → verdict)
 *   - GET  /sessions                  → enriched active sessions
 *
 * Action endpoints reused from the wider admin surface:
 *   - POST   /admin/sessions/{jti}/revoke
 *   - POST   /admin/users/{id}/force-logout
 *   - POST   /admin/users/{id}/reset-2fa
 *   - POST   /admin/users/{id}/ban / unban
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
    Shield, ShieldCheck, ShieldAlert, ShieldOff,
    Activity, AlertTriangle, AlertCircle, Bug, Eye, EyeOff,
    Key, KeyRound, Lock, Unlock, LogOut, RefreshCcw, Search,
    Filter, X as XIcon, ChevronLeft, ChevronRight, Clock, Globe,
    CheckCircle2, XCircle, Loader2, Wifi, WifiOff, FileCode,
    Trash2, Users2, Settings2, ListFilter, Hash, Copy, ExternalLink,
    Smartphone, MapPin, Zap, TrendingUp, Database, Server, BellRing,
    Cpu, Power, Ban, UserX, Sparkles,
} from "lucide-react";
import { api } from "../../lib/api";
import { Avatar } from "../../components/Avatar";
import { confirmDialog } from "../../components/ConfirmDialog";

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────
const fmtNum = (n) => {
    const v = Number(n) || 0;
    if (v < 1000) return String(v);
    if (v < 1_000_000) return (v / 1000).toFixed(v < 10_000 ? 1 : 0) + "K";
    return (v / 1_000_000).toFixed(1) + "M";
};
const fmtDate = (iso) => {
    if (!iso) return "—";
    try { return new Date(iso).toLocaleString("pt-PT", { dateStyle: "short", timeStyle: "medium" }); }
    catch { return iso; }
};
const fmtRelative = (iso) => {
    if (!iso) return "—";
    try {
        const t = typeof iso === "number" ? iso * 1000 : new Date(iso).getTime();
        const diff = Math.floor((Date.now() - t) / 1000);
        if (diff < 5) return "agora";
        if (diff < 60) return `há ${diff}s`;
        if (diff < 3600) return `há ${Math.floor(diff / 60)}m`;
        if (diff < 86400) return `há ${Math.floor(diff / 3600)}h`;
        return `há ${Math.floor(diff / 86400)}d`;
    } catch { return iso; }
};
const fmtCountdown = (epochMs) => {
    const diff = Math.max(0, Math.floor((epochMs - Date.now()) / 1000));
    if (diff <= 0) return "—";
    const m = Math.floor(diff / 60);
    const s = diff % 60;
    if (m >= 60) {
        const h = Math.floor(m / 60);
        return `${h}h ${m % 60}m`;
    }
    return `${m}m ${String(s).padStart(2, "0")}s`;
};
const apiError = (e) => {
    const msg = e?.response?.data?.detail || e?.message || "Erro";
    toast.error(typeof msg === "string" ? msg : "Erro inesperado");
};
const SEV_STYLE = {
    // Crítico — vermelho (raro, atenção máxima)
    danger: { bg: "bg-red-50",        text: "text-red-700",     ring: "ring-red-200",     dot: "bg-red-500",      label: "Crítico" },
    // Aviso — âmbar (atenção mas não urgente)
    warn:   { bg: "bg-amber-50",      text: "text-amber-800",   ring: "ring-amber-200",   dot: "bg-amber-500",    label: "Aviso" },
    // Info/OK — sky/slate (informacional calmo)
    info:   { bg: "bg-sky-50",        text: "text-sky-700",     ring: "ring-sky-200",     dot: "bg-sky-500",      label: "Info" },
};

// Mapping of internal kind → friendly PT label
const KIND_LABEL = {
    login_ok: "Login OK",
    login_fail: "Login falhado",
    login_locked: "Conta bloqueada",
    logout: "Logout",
    password_changed: "Password alterada",
    session_revoked: "Sessão revogada",
    session_revoked_all: "Todas as sessões revogadas",
    forgot_password_issued: "Reset de password pedido",
    reset_password_ok: "Reset de password OK",
    reset_password_fail: "Reset de password falhou",
    twofa_setup: "2FA configurado",
    twofa_disabled: "2FA desativado",
    twofa_fail: "2FA falhou",
    ws_connect_ok: "WS ligado",
    ws_connect_fail: "WS rejeitado",
    ws_session_revoked: "WS revogado",
    suspicious_ip_change: "IP suspeito",
    token_invalid: "Token inválido",
    security_admin_action: "Ação admin",
};

// ─────────────────────────────────────────────────────────────────
// SVG Sparkline
// ─────────────────────────────────────────────────────────────────
function Sparkline({ data, height = 38, color = "#000000", fill = false }) {
    if (!Array.isArray(data) || data.length === 0) return null;
    const values = data.map((d) => Number(d) || 0);
    const max = Math.max(1, ...values);
    const w = 100, h = 100;
    const stepX = w / Math.max(1, values.length - 1);
    const points = values.map((v, i) => `${(i * stepX).toFixed(2)},${(h - (v / max) * h).toFixed(2)}`).join(" ");
    const areaPts = `0,${h} ${points} ${w},${h}`;
    return (
        <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: "100%", height }} aria-hidden>
            {fill && <polygon points={areaPts} fill={color} opacity="0.10" />}
            <polyline fill="none" stroke={color} strokeWidth="2" points={points} vectorEffect="non-scaling-stroke" />
        </svg>
    );
}

// ─────────────────────────────────────────────────────────────────
// Live "ao vivo" pulse
// ─────────────────────────────────────────────────────────────────
function LiveDot({ on, label }) {
    return (
        <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-slate-500">
            <span className={`relative inline-flex h-2 w-2 rounded-full ${on ? "bg-cyan-500" : "bg-slate-300"}`}>
                {on && <span className="absolute inset-0 rounded-full bg-cyan-500 animate-ping opacity-60" />}
            </span>
            {label}
        </span>
    );
}

// ─────────────────────────────────────────────────────────────────
// Reusable: auto-refresh pill group
// ─────────────────────────────────────────────────────────────────
function AutoRefreshPill({ value, onChange, testIdPrefix = "sec-autorefresh" }) {
    const opts = [{ v: 0, l: "Off" }, { v: 5, l: "5s" }, { v: 15, l: "15s" }, { v: 30, l: "30s" }, { v: 60, l: "60s" }];
    return (
        <div className="inline-flex items-center gap-0.5 bg-slate-50 rounded-full p-1" title="Auto-atualização">
            {opts.map((o) => (
                <button
                    key={o.v}
                    onClick={() => onChange(o.v)}
                    data-testid={`${testIdPrefix}-${o.v}`}
                    className={`h-7 px-2.5 rounded-full text-[11px] font-medium transition ${
                        value === o.v ? "bg-red-600 text-white" : "text-slate-700 hover:bg-slate-100"
                    }`}
                >{o.l}</button>
            ))}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────
// SUB-NAV (chip nav)
// ─────────────────────────────────────────────────────────────────
const SUB_TABS = [
    { key: "overview",  label: "Visão geral",   icon: Activity },
    { key: "events",    label: "Eventos",       icon: AlertTriangle },
    { key: "lockouts",  label: "Bloqueios",     icon: Lock },
    { key: "admins",    label: "Admins",        icon: KeyRound },
    { key: "sessions",  label: "Sessões+",      icon: Wifi },
    { key: "token",     label: "Token Debugger", icon: FileCode },
];

// ═════════════════════════════════════════════════════════════════
// OVERVIEW SUB-TAB
// ═════════════════════════════════════════════════════════════════
function SecurityOverview() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [reloadAt, setReloadAt] = useState(Date.now());
    const [autoRefresh, setAutoRefresh] = useState(15);
    const [showHidden, setShowHidden] = useState({}); // collapse warning groups
    const lastLoadedAt = useRef(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get("/admin/security/overview");
            setData(data);
            setError(null);
            lastLoadedAt.current = Date.now();
        } catch (e) {
            setError(e?.response?.data?.detail || e?.message || "Erro");
        } finally { setLoading(false); }
    }, []);
    useEffect(() => { load(); }, [load, reloadAt]);
    useEffect(() => {
        if (!autoRefresh) return undefined;
        const t = setInterval(() => setReloadAt(Date.now()), autoRefresh * 1000);
        return () => clearInterval(t);
    }, [autoRefresh]);

    if (loading && !data) {
        return <div className="flex items-center justify-center py-16 text-slate-400"><Loader2 className="animate-spin" /></div>;
    }
    if (error && !data) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 text-[13px]">
                Erro a carregar postura de segurança: {error}
            </div>
        );
    }
    if (!data) return null;

    const c1h = data.counters_1h || {};
    const c24h = data.counters_24h || {};
    const spark = data.spark_24h || {};
    const state = data.state || {};
    const cfg = data.config || {};
    const warnings = data.warnings || [];
    const controls = data.controls || [];

    const warningsByLevel = warnings.reduce((acc, w) => {
        (acc[w.level] = acc[w.level] || []).push(w); return acc;
    }, {});

    return (
        <div className="space-y-4" data-testid="sec-overview">
            {/* Header bar */}
            <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                    <LiveDot on={autoRefresh > 0} label={autoRefresh > 0 ? `ao vivo · ${autoRefresh}s` : "pausado"} />
                    {data.timestamp && (
                        <span className="text-[11px] font-mono text-slate-400">
                            · atualizado {fmtRelative(data.timestamp)}
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-1.5">
                    <AutoRefreshPill value={autoRefresh} onChange={setAutoRefresh} />
                    <button onClick={() => setReloadAt(Date.now())}
                        data-testid="sec-overview-refresh"
                        className="h-9 px-3 rounded-full bg-slate-100 hover:bg-slate-800/[0.1] inline-flex items-center gap-1.5 text-[12.5px]"
                        title="Atualizar agora"
                    ><RefreshCcw size={14} className={loading ? "animate-spin" : ""} /> Atualizar</button>
                </div>
            </div>

            {/* WARNINGS BANNER */}
            {warnings.length > 0 && (
                <div className="space-y-2" data-testid="sec-warnings">
                    {["danger", "warn", "info"].map((lvl) => {
                        const arr = warningsByLevel[lvl] || [];
                        if (arr.length === 0) return null;
                        const collapsed = !!showHidden[lvl];
                        const style = SEV_STYLE[lvl];
                        return (
                            <div key={lvl} className={`${style.bg} ${style.text} border ${style.ring} rounded-2xl p-3 ring-1`}>
                                <button
                                    onClick={() => setShowHidden((s) => ({ ...s, [lvl]: !s[lvl] }))}
                                    className="w-full flex items-center justify-between gap-2"
                                    data-testid={`sec-warnings-${lvl}-toggle`}
                                >
                                    <div className="flex items-center gap-2">
                                        {lvl === "danger" ? <AlertCircle size={16}/> : lvl === "warn" ? <AlertTriangle size={16}/> : <CheckCircle2 size={16}/>}
                                        <span className="text-[13.5px] font-semibold">
                                            {arr.length} {lvl === "danger" ? "crítico(s)" : lvl === "warn" ? "aviso(s)" : "info"}
                                        </span>
                                    </div>
                                    <ChevronRight size={14} className={`transition ${collapsed ? "" : "rotate-90"}`} />
                                </button>
                                {!collapsed && (
                                    <ul className="mt-2 space-y-1 text-[12.5px]" data-testid={`sec-warnings-${lvl}-list`}>
                                        {arr.map((w, i) => (
                                            <li key={i} className="flex items-start gap-2">
                                                <span className={`mt-1.5 inline-block w-1.5 h-1.5 rounded-full ${style.dot}`} />
                                                <div className="flex-1">
                                                    <div className="font-medium">{w.msg}</div>
                                                    <code className="text-[10.5px] opacity-60 font-mono">{w.code}</code>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
            {warnings.length === 0 && (
                <div className="bg-slate-900 text-white rounded-2xl p-3 text-[13px] inline-flex items-center gap-2">
                    <ShieldCheck size={16} /> Sem avisos de segurança. <span className="opacity-60">Postura nominal.</span>
                </div>
            )}

            {/* KPIs — 1h counters with 24h sparkline */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                <KpiCard
                    label="Logins OK (1h)" value={c1h.logins ?? 0}
                    sub={`${fmtNum(c24h.logins ?? 0)} em 24h`}
                    series={spark.logins} color="#000000"
                    icon={CheckCircle2}
                    testId="sec-kpi-logins"
                />
                <KpiCard
                    label="Logins falhados (1h)" value={c1h.login_fails ?? 0}
                    sub={`${fmtNum(c24h.login_fails ?? 0)} em 24h`}
                    series={spark.fails} color="#dc2626"
                    icon={XCircle}
                    testId="sec-kpi-fails"
                    danger={(c1h.login_fails ?? 0) >= 20}
                />
                <KpiCard
                    label="Tokens inválidos (1h)" value={c1h.token_invalid ?? 0}
                    sub={`${fmtNum(c24h.token_invalid ?? 0)} em 24h`}
                    series={spark.token_invalid} color="#dc2626"
                    icon={Bug}
                    testId="sec-kpi-token-invalid"
                    danger={(c1h.token_invalid ?? 0) >= 5}
                />
                <KpiCard
                    label="WS rejeitados (1h)" value={c1h.ws_fails ?? 0}
                    sub="ligações WebSocket"
                    series={spark.ws_fails} color="#dc2626"
                    icon={WifiOff}
                    testId="sec-kpi-ws-fails"
                    danger={(c1h.ws_fails ?? 0) >= 10}
                />
                <KpiCard label="Bloqueios atuais"  value={state.locked_now ?? 0}        sub={`${c1h.logins_locked ?? 0} última hora`} icon={Lock} color="#dc2626" testId="sec-kpi-locked-now" />
                <KpiCard label="Sessões revogadas (1h)" value={c1h.sessions_revoked ?? 0} sub="logouts forçados"                       icon={LogOut} color="#000000" testId="sec-kpi-revoked" />
                <KpiCard label="Sessões activas"   value={state.active_sessions ?? 0}  sub="tokens válidos vivos"                    icon={Activity} color="#000000" testId="sec-kpi-active-sess" />
                <KpiCard label="2FA falhou (1h)"   value={c1h.twofa_fails ?? 0}        sub={`Reset fails: ${c1h.reset_fails ?? 0}`}   icon={ShieldAlert} color="#dc2626" testId="sec-kpi-twofa-fails" />
            </div>

            {/* USERS STATE STRIP */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <MiniStat label="Utilizadores" value={state.users_total ?? 0} icon={Users2} testId="sec-mini-users" />
                <MiniStat label="Admins"
                    value={`${state.admins_with_2fa ?? 0}/${state.admins_total ?? 0}`}
                    sub={`${state.admins_online ?? 0} online · com 2FA`}
                    icon={KeyRound}
                    accent={state.admins_total && state.admins_with_2fa < state.admins_total ? "warn" : "ok"}
                    testId="sec-mini-admins"
                />
                <MiniStat label="Banidos" value={state.users_banned ?? 0} icon={Ban} accent={state.users_banned > 0 ? "warn" : "ok"} testId="sec-mini-banned" />
                <MiniStat label="Suspensos" value={state.users_suspended ?? 0} icon={UserX} testId="sec-mini-suspended" />
            </div>

            {/* CONFIG SNAPSHOT */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
                <h3 className="font-display text-[15px] tracking-tight flex items-center gap-1.5 mb-3">
                    <Settings2 size={14} className="text-slate-500" /> Configuração JWT &amp; runtime
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 text-[12px]">
                    <ConfigCell label="Ambiente" value={cfg.app_env} tone={cfg.is_production ? "ok" : "info"} />
                    <ConfigCell label="JWT alg" value={cfg.jwt_alg} tone={cfg.jwt_alg === "HS256" ? "ok" : "warn"} />
                    <ConfigCell label="JWT issuer" value={cfg.jwt_issuer} mono />
                    <ConfigCell label="JWT audience" value={cfg.jwt_audience} mono />
                    <ConfigCell label="JWT secret len" value={`${cfg.jwt_secret_len} chars`} tone={cfg.jwt_secret_len >= 48 ? "ok" : "danger"} />
                    <ConfigCell label="JWT secret fp" value={cfg.jwt_secret_fp} mono />
                    <ConfigCell label="Access TTL" value={`${Math.round((cfg.access_token_ttl_s || 0) / 3600)}h`} />
                    <ConfigCell label="Cookie Secure" value={String(cfg.cookie_secure)} tone={cfg.cookie_secure ? "ok" : (cfg.is_production ? "danger" : "warn")} />
                    <ConfigCell label="Cookie SameSite" value={cfg.cookie_samesite} />
                    <ConfigCell label="WS sockets/user" value={cfg.ws_max_sockets_per_user} />
                    <ConfigCell label="WS jti re-check" value={`${cfg.ws_jti_check_gap_s}s`} />
                    <ConfigCell label="Lockout policy" value={`${cfg.lockout_max_fails} fails / ${Math.round((cfg.lockout_window_s || 0) / 60)}m`} />
                    {cfg.revocation_cache && (
                        <>
                            <ConfigCell label="Cache active" value={cfg.revocation_cache.active_entries} />
                            <ConfigCell label="Cache revoked" value={cfg.revocation_cache.revoked_entries} />
                            <ConfigCell label="Cache positive TTL" value={`${cfg.revocation_cache.positive_ttl_s}s`} />
                            <ConfigCell label="Cache negative TTL" value={`${cfg.revocation_cache.negative_ttl_s}s`} />
                        </>
                    )}
                </div>
            </div>

            {/* CONTROLS — checklist of all active protections */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4">
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <h3 className="font-display text-[15px] tracking-tight flex items-center gap-1.5">
                        <ShieldCheck size={14} className="text-slate-500" /> Controlos ativos ({controls.filter(c => c.on).length}/{controls.length})
                    </h3>
                    <span className="text-[11px] font-mono text-slate-400">
                        verificado a {fmtRelative(data.timestamp)}
                    </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {controls.map((ctl) => (
                        <div key={ctl.k} data-testid={`sec-control-${ctl.k}`}
                            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border text-[12.5px] ${
                                ctl.on
                                    ? "bg-slate-50 border-slate-200 text-slate-800"
                                    : "bg-red-50/50 border-red-200/60 text-red-900"
                            }`}>
                            <span className={`grid place-items-center w-6 h-6 rounded-lg shrink-0 ${ctl.on ? "bg-slate-200 text-slate-700" : "bg-red-500/20 text-red-700"}`}>
                                {ctl.on ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                            </span>
                            <span className="flex-1">{ctl.label}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function KpiCard({ label, value, sub, series, color = "#000000", icon: Icon, danger, testId }) {
    return (
        <div className={`bg-white rounded-2xl border ${danger ? "border-red-200" : "border-slate-200"} p-4 flex flex-col gap-1.5 shadow-sm relative`} data-testid={testId}>
            {danger && <span className="absolute top-2 right-2 inline-flex h-2 w-2 rounded-full bg-red-500 animate-pulse" />}
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-slate-400 font-mono">
                {Icon && <Icon size={11} />}
                {label}
            </div>
            <div className="font-display text-[28px] leading-none tracking-tight text-slate-900">{fmtNum(value)}</div>
            {sub != null && <div className="text-[11.5px] text-slate-500">{sub}</div>}
            {series && Array.isArray(series) && <Sparkline data={series} color={color} fill />}
        </div>
    );
}

function MiniStat({ label, value, sub, icon: Icon, accent = "neutral", testId }) {
    const tone = {
        // ok / info / neutral → branco com borda subtil
        ok:      "bg-white text-slate-800 border-slate-200",
        info:    "bg-white text-slate-800 border-slate-200",
        neutral: "bg-white text-slate-800 border-slate-200",
        // warn → vermelho suave
        warn:    "bg-red-50 text-red-700 border-red-200",
        // danger → vermelho intenso
        danger:  "bg-red-100 text-red-800 border-red-300",
    }[accent] || "bg-white text-slate-800 border-slate-200";
    return (
        <div className={`rounded-2xl border p-3 ${tone}`} data-testid={testId}>
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-mono opacity-70">
                {Icon && <Icon size={11} />} {label}
            </div>
            <div className="font-display text-[22px] leading-none tracking-tight mt-1">{value}</div>
            {sub && <div className="text-[11px] opacity-70 mt-0.5">{sub}</div>}
        </div>
    );
}

function ConfigCell({ label, value, mono, tone = "neutral" }) {
    const styles = {
        ok:      "text-slate-800",
        warn:    "text-red-600",
        danger:  "text-red-700 font-semibold",
        info:    "text-slate-700",
        neutral: "text-slate-800",
    };
    return (
        <div className="px-3 py-2 rounded-xl bg-slate-50">
            <div className="text-[10px] uppercase tracking-wider font-mono text-slate-400">{label}</div>
            <div className={`mt-0.5 ${mono ? "font-mono text-[12px]" : "text-[13px] font-medium"} ${styles[tone]} break-all`}>
                {value ?? "—"}
            </div>
        </div>
    );
}

// ═════════════════════════════════════════════════════════════════
// EVENTS SUB-TAB
// ═════════════════════════════════════════════════════════════════
function SecurityEvents() {
    const [kinds, setKinds] = useState([]);          // available kinds from /event-kinds
    const [filters, setFilters] = useState({
        severity: "",         // "", "danger", "warn", "info"
        kindSet: new Set(),   // multi-select kind filter
        q: "",
        ip: "",
        email: "",
        user_id: "",
        since_minutes: 0,     // 0=all, 60=last hour, 1440=24h, etc.
    });
    const [page, setPage] = useState(1);
    const [data, setData] = useState({ items: [], total: 0, limit: 50 });
    const [loading, setLoading] = useState(false);
    const [autoRefresh, setAutoRefresh] = useState(0);
    const [reloadAt, setReloadAt] = useState(Date.now());

    // Load filter kinds once
    useEffect(() => {
        api.get("/admin/security/event-kinds")
            .then(({ data }) => setKinds(data.items || []))
            .catch(() => {});
    }, []);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const params = {
                page,
                limit: 50,
                severity: filters.severity || "",
                kind: filters.kindSet.size > 0 ? Array.from(filters.kindSet).join(",") : "",
                q: filters.q || "",
                ip: filters.ip || "",
                email: filters.email || "",
                user_id: filters.user_id || "",
                since_minutes: filters.since_minutes || 0,
            };
            const { data } = await api.get("/admin/security/events", { params });
            setData(data);
        } catch (e) { apiError(e); }
        finally { setLoading(false); }
    }, [page, filters, reloadAt]);
    useEffect(() => { load(); }, [load]);
    useEffect(() => {
        if (!autoRefresh) return undefined;
        const t = setInterval(() => setReloadAt(Date.now()), autoRefresh * 1000);
        return () => clearInterval(t);
    }, [autoRefresh]);

    const toggleKind = (k) => {
        setFilters((f) => {
            const next = new Set(f.kindSet);
            if (next.has(k)) next.delete(k); else next.add(k);
            return { ...f, kindSet: next };
        });
        setPage(1);
    };
    const clearFilters = () => {
        setFilters({ severity: "", kindSet: new Set(), q: "", ip: "", email: "", user_id: "", since_minutes: 0 });
        setPage(1);
    };
    const activeFilterCount =
        (filters.severity ? 1 : 0) + filters.kindSet.size +
        (filters.q ? 1 : 0) + (filters.ip ? 1 : 0) + (filters.email ? 1 : 0) +
        (filters.user_id ? 1 : 0) + (filters.since_minutes > 0 ? 1 : 0);

    const totalPages = Math.max(1, Math.ceil((data.total || 0) / (data.limit || 50)));

    const exportCsv = useCallback(() => {
        // Client-side CSV from current page
        const rows = data.items || [];
        if (rows.length === 0) { toast.info("Sem eventos para exportar"); return; }
        const headers = ["ts", "kind", "severity", "user_id", "username", "email", "ip", "ua", "jti", "detail"];
        const escape = (v) => {
            const s = String(v ?? "");
            if (s.includes(",") || s.includes("\"") || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
            return s;
        };
        const csv = [
            headers.join(","),
            ...rows.map((r) => [
                r.ts, r.kind, r.severity,
                r.user_id || "", r.user?.username || "",
                r.email || "", r.ip || "",
                (r.ua || "").slice(0, 120),
                r.jti || "",
                JSON.stringify(r.detail || {}),
            ].map(escape).join(",")),
        ].join("\n");
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = `security_events_p${page}.csv`;
        document.body.appendChild(a); a.click(); a.remove();
        window.URL.revokeObjectURL(url);
        toast.success("CSV exportado");
    }, [data, page]);

    return (
        <div className="space-y-3" data-testid="sec-events">
            {/* CONTROLS BAR */}
            <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                    <LiveDot on={autoRefresh > 0} label={autoRefresh > 0 ? `ao vivo · ${autoRefresh}s` : "pausado"} />
                    <span className="text-[12px] font-mono text-slate-400">
                        {data.total ?? 0} evento(s){activeFilterCount > 0 && <> · {activeFilterCount} filtro(s)</>}
                    </span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                    <AutoRefreshPill value={autoRefresh} onChange={setAutoRefresh} testIdPrefix="sec-events-autorefresh" />
                    <button onClick={exportCsv}
                        data-testid="sec-events-export"
                        className="h-9 px-3 rounded-full bg-slate-100 hover:bg-slate-800/[0.1] inline-flex items-center gap-1.5 text-[12.5px]"
                    >CSV</button>
                    <button onClick={() => setReloadAt(Date.now())}
                        data-testid="sec-events-refresh"
                        className="h-9 px-3 rounded-full bg-slate-100 hover:bg-slate-800/[0.1] inline-flex items-center gap-1.5 text-[12.5px]"
                    ><RefreshCcw size={14} className={loading ? "animate-spin" : ""} /> Atualizar</button>
                </div>
            </div>

            {/* FILTER BAR */}
            <div className="bg-white border border-slate-200 rounded-2xl p-3 space-y-3">
                {/* Row 1: severity chips + time window + clear */}
                <div className="flex items-center gap-2 flex-wrap">
                    <div className="inline-flex items-center gap-1 text-[11.5px] text-slate-500">
                        <Filter size={12}/> Severidade:
                    </div>
                    {["", "danger", "warn", "info"].map((sv) => (
                        <button
                            key={sv || "all"}
                            onClick={() => { setFilters((f) => ({ ...f, severity: sv })); setPage(1); }}
                            data-testid={`sec-events-sev-${sv || "all"}`}
                            className={`h-7 px-2.5 rounded-full text-[11.5px] font-medium border transition ${
                                filters.severity === sv
                                    ? sv === "danger" ? "bg-red-500 text-white border-red-500"
                                    : sv === "warn"   ? "bg-amber-500 text-white border-amber-500"
                                    : sv === "info"   ? "bg-sky-500 text-white border-sky-500"
                                    : "bg-slate-900 text-white border-slate-900"
                                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                            }`}
                        >
                            {sv ? SEV_STYLE[sv]?.label : "Todas"}
                        </button>
                    ))}
                    <span className="mx-1 h-5 w-px bg-slate-200" />
                    <div className="inline-flex items-center gap-1 text-[11.5px] text-slate-500">
                        <Clock size={12}/> Janela:
                    </div>
                    {[
                        { v: 0,    l: "Tudo" },
                        { v: 15,   l: "15min" },
                        { v: 60,   l: "1h" },
                        { v: 360,  l: "6h" },
                        { v: 1440, l: "24h" },
                        { v: 10080,l: "7d" },
                    ].map((opt) => (
                        <button key={opt.v}
                            onClick={() => { setFilters((f) => ({ ...f, since_minutes: opt.v })); setPage(1); }}
                            data-testid={`sec-events-window-${opt.v}`}
                            className={`h-7 px-2.5 rounded-full text-[11.5px] font-medium border transition ${
                                filters.since_minutes === opt.v
                                    ? "bg-slate-900 text-white border-slate-900"
                                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                            }`}
                        >{opt.l}</button>
                    ))}
                    {activeFilterCount > 0 && (
                        <button onClick={clearFilters}
                            data-testid="sec-events-clear"
                            className="ml-auto h-7 px-2.5 rounded-full text-[11.5px] font-medium bg-red-50 text-red-700 hover:bg-red-100 inline-flex items-center gap-1"
                        ><XIcon size={12}/> Limpar ({activeFilterCount})</button>
                    )}
                </div>

                {/* Row 2: kind tags (multi-select) */}
                {kinds.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap" data-testid="sec-events-kinds">
                        <div className="inline-flex items-center gap-1 text-[11.5px] text-slate-500">
                            <Hash size={12}/> Tipo:
                        </div>
                        {kinds.map((k) => {
                            const sty = SEV_STYLE[k.severity] || SEV_STYLE.info;
                            const sel = filters.kindSet.has(k.kind);
                            return (
                                <button
                                    key={k.kind}
                                    onClick={() => toggleKind(k.kind)}
                                    data-testid={`sec-events-kind-${k.kind}`}
                                    className={`h-7 px-2.5 rounded-full text-[11px] font-medium border inline-flex items-center gap-1.5 transition ${
                                        sel
                                            ? `${sty.bg} ${sty.text} ${sty.ring} border-current`
                                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                    }`}
                                    title={`${k.count} ocorrências`}
                                >
                                    <span className={`inline-block w-1.5 h-1.5 rounded-full ${sty.dot}`} />
                                    {KIND_LABEL[k.kind] || k.kind}
                                    <span className="opacity-50 font-mono text-[10px]">·{fmtNum(k.count)}</span>
                                </button>
                            );
                        })}
                    </div>
                )}

                {/* Row 3: text filters */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                    <FilterInput placeholder="Pesquisa geral (IP, UA, jti, …)" icon={Search}
                        value={filters.q} onChange={(v) => { setFilters((f) => ({ ...f, q: v })); setPage(1); }}
                        testId="sec-events-filter-q"
                    />
                    <FilterInput placeholder="IP" icon={Globe}
                        value={filters.ip} onChange={(v) => { setFilters((f) => ({ ...f, ip: v })); setPage(1); }}
                        testId="sec-events-filter-ip"
                    />
                    <FilterInput placeholder="Email" icon={Search}
                        value={filters.email} onChange={(v) => { setFilters((f) => ({ ...f, email: v })); setPage(1); }}
                        testId="sec-events-filter-email"
                    />
                    <FilterInput placeholder="User ID" icon={Search}
                        value={filters.user_id} onChange={(v) => { setFilters((f) => ({ ...f, user_id: v })); setPage(1); }}
                        testId="sec-events-filter-user"
                    />
                </div>
            </div>

            {/* TABLE */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                {loading && data.items.length === 0 && (
                    <div className="px-4 py-10 text-slate-400 inline-flex items-center gap-2 w-full justify-center"><Loader2 size={14} className="animate-spin"/> A carregar…</div>
                )}
                {!loading && data.items.length === 0 && (
                    <div className="px-4 py-12 text-center text-slate-400 text-[13px]">
                        Sem eventos para estes filtros.
                    </div>
                )}
                <ul className="divide-y divide-black/[0.05]">
                    {data.items.map((ev, idx) => (
                        <EventRow key={`${ev.ts}-${ev.jti || idx}`} ev={ev} />
                    ))}
                </ul>
            </div>

            {/* PAGER */}
            {data.total > data.limit && (
                <div className="flex items-center justify-center gap-2" data-testid="sec-events-pager">
                    <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
                        className="h-8 w-8 rounded-full bg-slate-50 hover:bg-slate-200 disabled:opacity-30 inline-flex items-center justify-center"
                    ><ChevronLeft size={14}/></button>
                    <span className="text-[12px] font-mono text-slate-500">{page} / {totalPages}</span>
                    <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                        className="h-8 w-8 rounded-full bg-slate-50 hover:bg-slate-200 disabled:opacity-30 inline-flex items-center justify-center"
                    ><ChevronRight size={14}/></button>
                </div>
            )}
        </div>
    );
}

function FilterInput({ placeholder, icon: Icon, value, onChange, testId }) {
    return (
        <div className="relative">
            {Icon && <Icon size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />}
            <input
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                data-testid={testId}
                className="w-full h-9 pl-9 pr-3 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-300 text-[12.5px] placeholder:text-slate-300"
            />
            {value && (
                <button
                    onClick={() => onChange("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-100 hover:bg-slate-800/[0.12] grid place-items-center"
                    aria-label="Limpar"
                ><XIcon size={11}/></button>
            )}
        </div>
    );
}

function EventRow({ ev }) {
    const [open, setOpen] = useState(false);
    const sty = SEV_STYLE[ev.severity] || SEV_STYLE.info;
    const detail = ev.detail || {};
    const hasDetail = detail && Object.keys(detail).length > 0;
    const copy = (txt, label) => {
        try {
            navigator.clipboard.writeText(txt);
            toast.success(`${label} copiado`);
        } catch {}
    };
    return (
        <li className={`px-4 py-3 text-[12.5px]`} data-testid={`sec-event-row-${ev.kind}`}>
            <div className="flex items-start gap-3">
                <span className={`mt-1 inline-block w-2 h-2 rounded-full ${sty.dot} shrink-0`} />
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`px-1.5 py-0.5 rounded text-[10.5px] uppercase tracking-wider font-mono font-semibold ${sty.bg} ${sty.text}`}>
                            {ev.severity}
                        </span>
                        <span className="font-semibold text-slate-900">{KIND_LABEL[ev.kind] || ev.kind}</span>
                        {ev.user && ev.user.username && (
                            <span className="inline-flex items-center gap-1 text-slate-700">
                                <Avatar user={ev.user} size={16} /> @{ev.user.username}
                                {ev.user.is_admin && <span className="text-[9px] uppercase font-mono bg-slate-900 text-white px-1 rounded">admin</span>}
                            </span>
                        )}
                        {ev.email && !ev.user?.username && (
                            <span className="text-slate-500 font-mono text-[11.5px]">{ev.email}</span>
                        )}
                        <span className="text-[11px] text-slate-400 ml-auto" title={ev.ts}>{fmtRelative(ev.ts)}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 flex-wrap text-[11.5px] text-slate-500 font-mono">
                        {ev.ip && (
                            <button onClick={() => copy(ev.ip, "IP")} className="inline-flex items-center gap-1 hover:text-slate-900">
                                <Globe size={10}/> {ev.ip}
                            </button>
                        )}
                        {ev.ua && (
                            <span className="truncate max-w-[280px] inline-flex items-center gap-1" title={ev.ua}>
                                <Smartphone size={10}/> {ev.ua.slice(0, 48)}{ev.ua.length > 48 ? "…" : ""}
                            </span>
                        )}
                        {ev.jti && (
                            <button onClick={() => copy(ev.jti, "JTI")} className="inline-flex items-center gap-1 hover:text-slate-900" title={ev.jti}>
                                <Key size={10}/> {ev.jti.slice(0, 8)}…
                            </button>
                        )}
                        {detail.reason && (
                            <span className={`px-1.5 py-0.5 rounded ${sty.bg} ${sty.text} normal-case`}>
                                {String(detail.reason).slice(0, 64)}
                            </span>
                        )}
                        {hasDetail && (
                            <button onClick={() => setOpen((v) => !v)} className="ml-auto text-[11px] underline-offset-2 hover:underline">
                                {open ? "Ocultar" : "Detalhes"}
                            </button>
                        )}
                    </div>
                    {open && hasDetail && (
                        <pre className="mt-2 p-2 bg-slate-50 rounded-lg text-[11px] overflow-x-auto font-mono text-slate-700">
{JSON.stringify(detail, null, 2)}
                        </pre>
                    )}
                </div>
            </div>
        </li>
    );
}

// ═════════════════════════════════════════════════════════════════
// LOCKOUTS SUB-TAB
// ═════════════════════════════════════════════════════════════════
function SecurityLockouts() {
    const [data, setData] = useState({ items: [], total: 0 });
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(null);
    const [tick, setTick] = useState(0); // forces countdown re-render
    const [reloadAt, setReloadAt] = useState(Date.now());
    const [autoRefresh, setAutoRefresh] = useState(15);

    useEffect(() => {
        const t = setInterval(() => setTick((x) => x + 1), 1000);
        return () => clearInterval(t);
    }, []);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get("/admin/security/lockouts");
            setData(data);
        } catch (e) { apiError(e); }
        finally { setLoading(false); }
    }, []);
    useEffect(() => { load(); }, [load, reloadAt]);
    useEffect(() => {
        if (!autoRefresh) return undefined;
        const t = setInterval(() => setReloadAt(Date.now()), autoRefresh * 1000);
        return () => clearInterval(t);
    }, [autoRefresh]);

    const unlock = (email) => confirmDialog({
        title: "Desbloquear conta?",
        body: `A conta ${email} fica imediatamente desbloqueada. As próximas tentativas falhadas voltam a contar para o lockout normal.`,
        confirmLabel: "Desbloquear",
        danger: false,
    }).then((ok) => {
        if (!ok) return;
        setBusy(email);
        api.post("/admin/security/lockouts/clear", { email })
            .then(() => { toast.success(`${email} desbloqueado`); setReloadAt(Date.now()); })
            .catch(apiError)
            .finally(() => setBusy(null));
    });

    return (
        <div className="space-y-3" data-testid="sec-lockouts">
            <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                    <LiveDot on={autoRefresh > 0} label={autoRefresh > 0 ? `ao vivo · ${autoRefresh}s` : "pausado"} />
                    <span className="text-[12px] font-mono text-slate-400">
                        {data.total ?? 0} conta(s) bloqueada(s)
                    </span>
                </div>
                <div className="flex items-center gap-1.5">
                    <AutoRefreshPill value={autoRefresh} onChange={setAutoRefresh} testIdPrefix="sec-lockouts-autorefresh" />
                    <button onClick={() => setReloadAt(Date.now())}
                        data-testid="sec-lockouts-refresh"
                        className="h-9 px-3 rounded-full bg-slate-100 hover:bg-slate-800/[0.1] inline-flex items-center gap-1.5 text-[12.5px]"
                    ><RefreshCcw size={14} className={loading ? "animate-spin" : ""}/> Atualizar</button>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                {loading && data.items.length === 0 && (
                    <div className="px-4 py-10 text-slate-400 inline-flex items-center gap-2 w-full justify-center"><Loader2 size={14} className="animate-spin"/> A carregar…</div>
                )}
                {!loading && data.items.length === 0 && (
                    <div className="px-4 py-16 text-center text-slate-500 text-[13px] inline-flex flex-col items-center gap-2 w-full">
                        <ShieldCheck size={32} className="text-slate-400" />
                        <span>Não há contas bloqueadas neste momento.</span>
                        <span className="text-[11.5px] text-slate-400 font-mono">Política: 5 falhas / 15min → lock 15min</span>
                    </div>
                )}
                {data.items.length > 0 && (
                    <ul className="divide-y divide-black/[0.05]">
                        {data.items.map((row) => {
                            const lockUntil = (row.locked_until_epoch || 0) * 1000;
                            const cd = fmtCountdown(lockUntil);
                            return (
                                <li key={row.email} className="px-4 py-3 flex items-center gap-3" data-testid={`sec-lockout-row-${row.email}`}>
                                    <span className="grid place-items-center w-10 h-10 rounded-xl bg-red-50 text-red-700 shrink-0">
                                        <Lock size={16}/>
                                    </span>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-[13.5px] text-slate-900">{row.email}</div>
                                        <div className="text-[11.5px] text-slate-500 font-mono">
                                            {row.fails_in_window} falhas na janela
                                            {" · "} expira em <span className="text-red-600 font-semibold">{cd}</span>
                                            {" · "} {fmtDate(new Date(lockUntil).toISOString())}
                                        </div>
                                    </div>
                                    <button onClick={() => unlock(row.email)} disabled={busy === row.email}
                                        data-testid={`sec-lockout-unlock-${row.email}`}
                                        className="h-9 px-3 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 text-[12px] font-medium disabled:opacity-40 inline-flex items-center gap-1.5"
                                    >
                                        {busy === row.email ? <Loader2 size={13} className="animate-spin"/> : <Unlock size={13}/>}
                                        Desbloquear
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </div>
    );
}

// ═════════════════════════════════════════════════════════════════
// ADMINS SUB-TAB
// ═════════════════════════════════════════════════════════════════
function SecurityAdmins() {
    const [data, setData] = useState({ items: [], total: 0 });
    const [loading, setLoading] = useState(true);
    const [reloadAt, setReloadAt] = useState(Date.now());
    const [autoRefresh, setAutoRefresh] = useState(30);
    const [busy, setBusy] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get("/admin/security/admins");
            setData(data);
        } catch (e) { apiError(e); }
        finally { setLoading(false); }
    }, []);
    useEffect(() => { load(); }, [load, reloadAt]);
    useEffect(() => {
        if (!autoRefresh) return undefined;
        const t = setInterval(() => setReloadAt(Date.now()), autoRefresh * 1000);
        return () => clearInterval(t);
    }, [autoRefresh]);

    const forceLogout = (a) => confirmDialog({
        title: `Forçar logout de @${a.username}?`,
        body: `Todas as sessões ativas (${a.active_sessions}) serão revogadas imediatamente. O utilizador terá de re-autenticar.`,
        confirmLabel: "Force logout",
        danger: true,
    }).then((ok) => {
        if (!ok) return;
        setBusy(`fl:${a.id}`);
        api.post(`/admin/users/${a.id}/force-logout`)
            .then(() => { toast.success("Sessões revogadas"); setReloadAt(Date.now()); })
            .catch(apiError)
            .finally(() => setBusy(null));
    });

    const reset2fa = (a) => confirmDialog({
        title: `Reset 2FA de @${a.username}?`,
        body: `O 2FA do admin ${a.username} será desativado. Recomendado apenas em emergências (dispositivo perdido).`,
        confirmLabel: "Reset 2FA",
        danger: true,
    }).then((ok) => {
        if (!ok) return;
        setBusy(`r2:${a.id}`);
        api.post(`/admin/users/${a.id}/reset-2fa`)
            .then(() => { toast.success("2FA reposto"); setReloadAt(Date.now()); })
            .catch(apiError)
            .finally(() => setBusy(null));
    });

    const adminCount = data.items.length;
    const with2fa = data.items.filter((a) => a.twofa_enabled).length;
    const onlineCount = data.items.filter((a) => a.online).length;

    return (
        <div className="space-y-3" data-testid="sec-admins">
            <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                    <LiveDot on={autoRefresh > 0} label={autoRefresh > 0 ? `ao vivo · ${autoRefresh}s` : "pausado"} />
                    <span className="text-[12px] font-mono text-slate-400">
                        {adminCount} admin(s) · {with2fa} com 2FA · {onlineCount} online
                    </span>
                </div>
                <div className="flex items-center gap-1.5">
                    <AutoRefreshPill value={autoRefresh} onChange={setAutoRefresh} testIdPrefix="sec-admins-autorefresh" />
                    <button onClick={() => setReloadAt(Date.now())}
                        data-testid="sec-admins-refresh"
                        className="h-9 px-3 rounded-full bg-slate-100 hover:bg-slate-800/[0.1] inline-flex items-center gap-1.5 text-[12.5px]"
                    ><RefreshCcw size={14} className={loading ? "animate-spin" : ""}/> Atualizar</button>
                </div>
            </div>

            {adminCount > 0 && with2fa < adminCount && (
                <div className="bg-red-50 border border-red-200 ring-1 ring-red-200 rounded-2xl p-3 text-red-700 text-[12.5px] flex items-start gap-2">
                    <AlertTriangle size={16} className="shrink-0 mt-0.5"/>
                    <span><strong>{adminCount - with2fa}</strong> admin(s) sem 2FA. Recomenda-se obrigatoriedade de 2FA para todas as contas administrativas.</span>
                </div>
            )}

            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                {loading && data.items.length === 0 && (
                    <div className="px-4 py-10 text-slate-400 inline-flex items-center gap-2 w-full justify-center"><Loader2 size={14} className="animate-spin"/> A carregar…</div>
                )}
                <ul className="divide-y divide-black/[0.05]">
                    {data.items.map((a) => (
                        <li key={a.id} className="px-4 py-3 flex items-center gap-3" data-testid={`sec-admin-row-${a.username}`}>
                            <div className="relative shrink-0">
                                <Avatar user={a} size={40} />
                                {a.online && (
                                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-red-600 ring-2 ring-white" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-semibold text-[13.5px]">@{a.username}</span>
                                    {a.is_self && <span className="text-[10px] uppercase font-mono bg-slate-900 text-white px-1.5 rounded">tu</span>}
                                    {a.twofa_enabled
                                        ? <span className="text-[10px] uppercase font-mono bg-slate-100 text-slate-700 px-1.5 rounded inline-flex items-center gap-1"><ShieldCheck size={9}/>2FA</span>
                                        : <span className="text-[10px] uppercase font-mono bg-red-50 text-red-700 px-1.5 rounded inline-flex items-center gap-1"><AlertTriangle size={9}/>sem 2FA</span>}
                                    {a.banned && <span className="text-[10px] uppercase font-mono bg-red-100 text-red-700 px-1.5 rounded">banido</span>}
                                </div>
                                <div className="text-[11.5px] text-slate-500 truncate font-mono">
                                    {a.email}
                                </div>
                                <div className="text-[11px] text-slate-400 font-mono">
                                    {a.active_sessions} sessões · último login {fmtRelative(a.last_login_at)} · password {fmtRelative(a.password_changed_at)}
                                </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                                {!a.is_self && a.twofa_enabled && (
                                    <button onClick={() => reset2fa(a)} disabled={busy === `r2:${a.id}`}
                                        data-testid={`sec-admin-reset2fa-${a.username}`}
                                        className="h-8 px-2.5 rounded-full bg-red-50 hover:bg-red-50 text-red-700 text-[11.5px] font-medium disabled:opacity-40 inline-flex items-center gap-1.5"
                                        title="Reset 2FA (emergência)"
                                    >
                                        {busy === `r2:${a.id}` ? <Loader2 size={12} className="animate-spin"/> : <KeyRound size={12}/>}
                                        2FA
                                    </button>
                                )}
                                <button onClick={() => forceLogout(a)} disabled={busy === `fl:${a.id}` || a.active_sessions === 0}
                                    data-testid={`sec-admin-forcelogout-${a.username}`}
                                    className="h-8 px-2.5 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-700 text-[11.5px] font-medium disabled:opacity-30 inline-flex items-center gap-1.5"
                                    title={a.active_sessions === 0 ? "Sem sessões ativas" : "Forçar logout"}
                                >
                                    {busy === `fl:${a.id}` ? <Loader2 size={12} className="animate-spin"/> : <LogOut size={12}/>}
                                    Logout
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}

// ═════════════════════════════════════════════════════════════════
// SESSIONS SUB-TAB (enriched: online filter + free-text search)
// ═════════════════════════════════════════════════════════════════
function SecuritySessions() {
    const [filters, setFilters] = useState({ q: "", ip: "", user_id: "", online_only: false });
    const [page, setPage] = useState(1);
    const [data, setData] = useState({ items: [], total: 0, limit: 50, live_jtis: 0 });
    const [loading, setLoading] = useState(false);
    const [busy, setBusy] = useState(null);
    const [reloadAt, setReloadAt] = useState(Date.now());
    const [autoRefresh, setAutoRefresh] = useState(30);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const { data } = await api.get("/admin/security/sessions", {
                params: {
                    page, limit: 50,
                    q: filters.q || "", ip: filters.ip || "", user_id: filters.user_id || "",
                    online_only: filters.online_only ? 1 : 0,
                },
            });
            setData(data);
        } catch (e) { apiError(e); }
        finally { setLoading(false); }
    }, [page, filters, reloadAt]);
    useEffect(() => { load(); }, [load]);
    useEffect(() => {
        if (!autoRefresh) return undefined;
        const t = setInterval(() => setReloadAt(Date.now()), autoRefresh * 1000);
        return () => clearInterval(t);
    }, [autoRefresh]);

    const revoke = (s) => confirmDialog({
        title: `Revogar sessão de @${s.user?.username || s.user_id?.slice(0, 8)}?`,
        body: `A sessão será terminada de imediato. ${s.online ? "WebSocket também será cortado em ≤20s." : ""}`,
        confirmLabel: "Revogar",
        danger: true,
    }).then((ok) => {
        if (!ok) return;
        setBusy(s.jti);
        api.post(`/admin/sessions/${s.jti}/revoke`)
            .then(() => { toast.success("Sessão revogada"); setReloadAt(Date.now()); })
            .catch(apiError)
            .finally(() => setBusy(null));
    });

    const totalPages = Math.max(1, Math.ceil((data.total || 0) / (data.limit || 50)));
    const onlineCount = (data.items || []).filter((s) => s.online).length;

    return (
        <div className="space-y-3" data-testid="sec-sessions">
            <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                    <LiveDot on={autoRefresh > 0} label={autoRefresh > 0 ? `ao vivo · ${autoRefresh}s` : "pausado"} />
                    <span className="text-[12px] font-mono text-slate-400">
                        {data.total} sessão(ões) · {data.live_jtis ?? 0} WS vivos · {onlineCount} online nesta página
                    </span>
                </div>
                <div className="flex items-center gap-1.5">
                    <AutoRefreshPill value={autoRefresh} onChange={setAutoRefresh} testIdPrefix="sec-sessions-autorefresh" />
                    <button onClick={() => setReloadAt(Date.now())}
                        data-testid="sec-sessions-refresh"
                        className="h-9 px-3 rounded-full bg-slate-100 hover:bg-slate-800/[0.1] inline-flex items-center gap-1.5 text-[12.5px]"
                    ><RefreshCcw size={14} className={loading ? "animate-spin" : ""}/> Atualizar</button>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-3 space-y-3">
                <div className="flex items-center gap-2 flex-wrap">
                    <button
                        onClick={() => { setFilters((f) => ({ ...f, online_only: !f.online_only })); setPage(1); }}
                        data-testid="sec-sessions-online-only"
                        className={`h-8 px-3 rounded-full text-[11.5px] font-medium inline-flex items-center gap-1.5 transition ${
                            filters.online_only
                                ? "bg-red-600 text-white"
                                : "bg-slate-50 text-slate-600 hover:bg-slate-200"
                        }`}
                    >
                        <Wifi size={12}/> Apenas online
                    </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <FilterInput placeholder="Pesquisa (IP, UA, jti)" icon={Search}
                        value={filters.q} onChange={(v) => { setFilters((f) => ({ ...f, q: v })); setPage(1); }}
                        testId="sec-sessions-filter-q"
                    />
                    <FilterInput placeholder="IP exato" icon={Globe}
                        value={filters.ip} onChange={(v) => { setFilters((f) => ({ ...f, ip: v })); setPage(1); }}
                        testId="sec-sessions-filter-ip"
                    />
                    <FilterInput placeholder="User ID" icon={Search}
                        value={filters.user_id} onChange={(v) => { setFilters((f) => ({ ...f, user_id: v })); setPage(1); }}
                        testId="sec-sessions-filter-user"
                    />
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                {loading && data.items.length === 0 && (
                    <div className="px-4 py-10 text-slate-400 inline-flex items-center gap-2 w-full justify-center"><Loader2 size={14} className="animate-spin"/> A carregar…</div>
                )}
                {!loading && data.items.length === 0 && (
                    <div className="px-4 py-12 text-center text-slate-400 text-[13px]">Sem sessões para os filtros atuais.</div>
                )}
                <ul className="divide-y divide-black/[0.05]">
                    {data.items.map((s) => (
                        <li key={s.jti} className="px-4 py-3 flex items-center gap-3" data-testid={`sec-session-row-${s.jti}`}>
                            <div className="relative shrink-0">
                                <Avatar user={s.user} size={36} />
                                {s.online ? (
                                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-cyan-500 ring-2 ring-white" title="WebSocket ativo"/>
                                ) : (
                                    <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-slate-300 ring-2 ring-white" title="Sem WS"/>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-semibold text-[13.5px]">@{s.user?.username || s.user_id?.slice(0, 8)}</span>
                                    {s.user?.is_admin && <span className="text-[10px] uppercase font-mono bg-slate-900 text-white px-1 rounded">admin</span>}
                                    <span className={`text-[10px] uppercase font-mono px-1.5 rounded ${s.online ? "bg-slate-100 text-slate-700" : "bg-slate-100 text-slate-500"}`}>
                                        {s.online ? "online" : "offline"}
                                    </span>
                                </div>
                                <div className="text-[11.5px] text-slate-500 truncate font-mono">
                                    {s.ip} · {(s.ua || "").slice(0, 70)}
                                </div>
                                <div className="text-[11px] text-slate-400 font-mono">
                                    iniciada {fmtRelative(s.created_at)} · activa {fmtRelative(s.last_seen_at)} · jti {s.jti?.slice(0, 8)}…
                                </div>
                            </div>
                            <button onClick={() => revoke(s)} disabled={busy === s.jti}
                                data-testid={`sec-session-revoke-${s.jti}`}
                                className="h-9 px-3 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-600 text-[12px] font-medium disabled:opacity-40 inline-flex items-center gap-1.5"
                            >
                                {busy === s.jti ? <Loader2 size={13} className="animate-spin"/> : <LogOut size={13}/>}
                                Revogar
                            </button>
                        </li>
                    ))}
                </ul>
            </div>

            {data.total > data.limit && (
                <div className="flex items-center justify-center gap-2" data-testid="sec-sessions-pager">
                    <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
                        className="h-8 w-8 rounded-full bg-slate-50 hover:bg-slate-200 disabled:opacity-30 inline-flex items-center justify-center"
                    ><ChevronLeft size={14}/></button>
                    <span className="text-[12px] font-mono text-slate-500">{page} / {totalPages}</span>
                    <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                        className="h-8 w-8 rounded-full bg-slate-50 hover:bg-slate-200 disabled:opacity-30 inline-flex items-center justify-center"
                    ><ChevronRight size={14}/></button>
                </div>
            )}
        </div>
    );
}

// ═════════════════════════════════════════════════════════════════
// TOKEN DEBUGGER SUB-TAB
// ═════════════════════════════════════════════════════════════════
const STAGE_LABEL = {
    header_preflight: "1. Pre-flight do header (alg, typ, crit)",
    pyjwt:            "2. PyJWT (assinatura, iss, aud, exp, nbf, iat)",
    type_check:       "3. Verificação de tipo (access)",
    session_revoked:  "4. Sessão revogada",
    user_lookup:      "5. Lookup do utilizador",
    user_state:       "6. Estado do utilizador (banned/suspended)",
    password_rotation:"7. Cutoff de mudança de password",
    ok:               "✓ Aceite",
};

function SecurityTokenDebugger() {
    const [token, setToken] = useState("");
    const [result, setResult] = useState(null);
    const [busy, setBusy] = useState(false);

    const test = async () => {
        const t = token.trim();
        if (!t) { toast.error("Cola um token primeiro"); return; }
        setBusy(true);
        setResult(null);
        try {
            const { data } = await api.post("/admin/security/test-token", { token: t });
            setResult(data);
        } catch (e) { apiError(e); }
        finally { setBusy(false); }
    };

    const valid = result?.verdict === "valid";

    return (
        <div className="space-y-3" data-testid="sec-token">
            <div className="bg-red-50 border border-red-200 rounded-2xl p-3 text-red-700 text-[12.5px] flex items-start gap-2">
                <AlertTriangle size={16} className="shrink-0 mt-0.5"/>
                <span>
                    Esta ferramenta é apenas para diagnóstico. Cola um JWT para ver exatamente em que fase
                    do decoder seria aceite ou rejeitado. O payload não é exposto — apenas claims básicos.
                </span>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-3 space-y-3">
                <label className="block text-[12px] font-medium text-slate-700">JWT</label>
                <textarea
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                    placeholder="eyJ…"
                    data-testid="sec-token-input"
                    rows={4}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-300 text-[12px] font-mono break-all resize-y"
                />
                <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-[11.5px] text-slate-500 font-mono">{token.length} chars</span>
                    <div className="flex items-center gap-1.5">
                        <button onClick={() => { setToken(""); setResult(null); }}
                            data-testid="sec-token-clear"
                            className="h-9 px-3 rounded-full bg-slate-100 hover:bg-slate-800/[0.1] text-[12.5px]"
                        >Limpar</button>
                        <button onClick={test} disabled={busy || !token.trim()}
                            data-testid="sec-token-test"
                            className="h-9 px-4 rounded-full bg-slate-900 text-white text-[12.5px] font-medium disabled:opacity-40 inline-flex items-center gap-1.5"
                        >
                            {busy ? <Loader2 size={13} className="animate-spin"/> : <FileCode size={13}/>}
                            Testar
                        </button>
                    </div>
                </div>
            </div>

            {result && (
                <div className={`rounded-2xl border p-4 ${valid ? "bg-slate-50 border-slate-200" : "bg-red-50 border-red-200"}`} data-testid="sec-token-result">
                    <div className="flex items-center gap-2">
                        {valid
                            ? <CheckCircle2 size={20} className="text-slate-500"/>
                            : <XCircle size={20} className="text-red-600"/>}
                        <span className={`font-display text-[18px] ${valid ? "text-slate-800" : "text-red-800"}`}>
                            {valid ? "Token VÁLIDO" : "Token REJEITADO"}
                        </span>
                    </div>
                    <div className={`mt-2 text-[12.5px] ${valid ? "text-slate-800" : "text-red-900"}`}>
                        Fase: <code className="font-mono px-1.5 py-0.5 rounded bg-slate-100">{STAGE_LABEL[result.stage] || result.stage}</code>
                        {result.reason && <> · razão: <code className="font-mono">{result.reason}</code></>}
                    </div>

                    {result.header && (
                        <div className="mt-3">
                            <div className="text-[11px] uppercase tracking-wider font-mono text-slate-500 mb-1">Header</div>
                            <pre className="p-2 rounded-lg bg-slate-100 text-[11px] font-mono overflow-x-auto">
{JSON.stringify(result.header, null, 2)}
                            </pre>
                        </div>
                    )}
                    {result.claims && Object.keys(result.claims).length > 0 && (
                        <div className="mt-3">
                            <div className="text-[11px] uppercase tracking-wider font-mono text-slate-500 mb-1">Claims (básicos)</div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-[11.5px]">
                                {Object.entries(result.claims).map(([k, v]) => (
                                    <div key={k} className="px-2.5 py-1.5 rounded-lg bg-slate-50">
                                        <div className="text-[10px] uppercase font-mono text-slate-400">{k}</div>
                                        <div className="font-mono text-slate-800 break-all">{String(v)}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {result.user && (
                        <div className="mt-3 text-[12.5px]">
                            Utilizador: <strong>@{result.user.username}</strong>
                            {result.user.is_admin && <span className="ml-1.5 text-[10px] uppercase font-mono bg-slate-900 text-white px-1 rounded">admin</span>}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// ═════════════════════════════════════════════════════════════════
// MAIN — SecurityTab with internal sub-nav
// ═════════════════════════════════════════════════════════════════
export default function SecurityTab() {
    const [sub, setSub] = useState(() => {
        try { return localStorage.getItem("admin.security.sub") || "overview"; }
        catch { return "overview"; }
    });
    useEffect(() => {
        try { localStorage.setItem("admin.security.sub", sub); } catch {}
    }, [sub]);

    return (
        <div className="space-y-4" data-testid="admin-security">
            {/* SUB-NAV CHIPS */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar -mx-1 px-1" data-testid="sec-subnav">
                {SUB_TABS.map((t) => {
                    const Icon = t.icon;
                    const active = sub === t.key;
                    return (
                        <button key={t.key}
                            onClick={() => setSub(t.key)}
                            data-testid={`sec-subnav-${t.key}`}
                            className={`h-9 px-3.5 rounded-full text-[12.5px] font-medium inline-flex items-center gap-1.5 shrink-0 border transition ${
                                active
                                    ? "bg-slate-900 text-white border-slate-900"
                                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                            }`}
                        >
                            <Icon size={13}/> {t.label}
                        </button>
                    );
                })}
            </div>

            {sub === "overview"  && <SecurityOverview />}
            {sub === "events"    && <SecurityEvents />}
            {sub === "lockouts"  && <SecurityLockouts />}
            {sub === "admins"    && <SecurityAdmins />}
            {sub === "sessions"  && <SecuritySessions />}
            {sub === "token"     && <SecurityTokenDebugger />}
        </div>
    );
}
