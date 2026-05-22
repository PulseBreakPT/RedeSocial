/**
 * AdminLayout v2 — Premium operational shell.
 *
 * Replaces the old top-only chrome with a full sidebar+topbar+canvas
 * grid that hosts every admin page (Cockpit, tabs). Uses URL query
 * `?tab=...` as the single source of truth for the active section, so
 * Admin.js (which renders inside <Outlet/>) and the sidebar stay in sync
 * without prop drilling.
 *
 * v2.1 wave 1 fixes (see /app/memory/ADMIN_AUDIT.md):
 *   - C-2: `appEnv` now comes from /admin/cockpit/deploy (real), no more
 *          window.__APP_ENV__ that was always falling back to "prod".
 *   - C-5: bell icon opens a real NotificationsDrawer (aggregated urgent
 *          reports, severe admin actions, critical auth events, degraded
 *          services) instead of jumping to Audit log.
 *   - M-9: the time-range selector is hidden on tabs where no widget
 *          consumes it (Settings, Audit, Users, Posts, Comments, …).
 *   - M-10: openReports updates in real time via WebSocket cockpit_event
 *           (new_report / report_resolved) with polling as fallback (60s
 *           instead of 30s, since WS does the heavy lifting now).
 */
import React, { useCallback, useEffect, useState } from "react";
import { Outlet, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import "./admin.css";
import { AdminSidebar } from "./admin/AdminSidebar";
import { AdminTopbar } from "./admin/AdminTopbar";
import { CommandPalette } from "./admin/CommandPalette";
import { NotificationsDrawer } from "./admin/NotificationsDrawer";
import { NAV_BY_KEY, NAV_GROUPS, TIME_RANGE_TABS } from "./admin/navConfig";
import { useWsState, useWsMessages } from "./WebSocketProvider";
import { api } from "../lib/api";

// Quick lookup: tab key -> group label (for breadcrumb in topbar).
const GROUP_LABEL_BY_KEY = NAV_GROUPS.reduce((acc, g) => {
    g.items.forEach((it) => { acc[it.key] = g.label; });
    return acc;
}, {});

// Read shared session state used by Cockpit + tabs from query string
export function useAdminTab() {
    const [sp, setSp] = useSearchParams();
    const tab = sp.get("tab") || "overview";
    const setTab = useCallback((k) => {
        const next = new URLSearchParams(sp);
        next.set("tab", k);
        setSp(next, { replace: false });
    }, [sp, setSp]);
    return [tab, setTab];
}

export function useAdminTimeRange() {
    const [sp, setSp] = useSearchParams();
    const r = sp.get("range") || "15m";
    const setR = useCallback((v) => {
        const next = new URLSearchParams(sp);
        if (v && v !== "15m") next.set("range", v); else next.delete("range");
        setSp(next, { replace: true });
    }, [sp, setSp]);
    return [r, setR];
}

export function AdminLayout() {
    const { user, checking, logout } = useAuth();
    const navigate = useNavigate();
    const [sp, setSp] = useSearchParams();
    const [tab, setTab] = useAdminTab();
    const [timeRange, setTimeRange] = useAdminTimeRange();
    const wsState = useWsState();
    const [cmdOpen, setCmdOpen] = useState(false);
    const [notifOpen, setNotifOpen] = useState(false);
    const [openReports, setOpenReports] = useState(0);
    const [loggingOut, setLoggingOut] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [appEnv, setAppEnv] = useState(null); // real env from backend
    const [isMobile, setIsMobile] = useState(() =>
        typeof window !== "undefined" ? window.matchMedia("(max-width: 1024px)").matches : false
    );

    useEffect(() => {
        document.body.classList.add("admin-mode");
        return () => document.body.classList.remove("admin-mode");
    }, []);

    // Track viewport width so we render either static sidebar (desktop) or drawer-only (mobile).
    useEffect(() => {
        if (typeof window === "undefined") return undefined;
        const mq = window.matchMedia("(max-width: 1024px)");
        const handler = (e) => {
            setIsMobile(e.matches);
            if (!e.matches) setDrawerOpen(false);
        };
        if (mq.addEventListener) mq.addEventListener("change", handler);
        else mq.addListener(handler);
        return () => {
            if (mq.removeEventListener) mq.removeEventListener("change", handler);
            else mq.removeListener(handler);
        };
    }, []);

    // Lock body scroll while sidebar drawer is open
    useEffect(() => {
        if (!drawerOpen && !notifOpen) return undefined;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = prev; };
    }, [drawerOpen, notifOpen]);

    // ⌘K / Ctrl-K binding (capture phase so it wins against any inner handler)
    useEffect(() => {
        const onKey = (e) => {
            if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                e.stopPropagation();
                setCmdOpen((v) => !v);
            }
        };
        document.addEventListener("keydown", onKey, true);
        return () => document.removeEventListener("keydown", onKey, true);
    }, []);

    // C-2: Resolve the real app environment via /admin/cockpit/deploy. The
    // value drives the sidebar badge so staging/dev never masquerades as prod.
    useEffect(() => {
        if (!user || !user.is_admin) return undefined;
        let mounted = true;
        (async () => {
            try {
                const { data } = await api.get("/admin/cockpit/deploy");
                if (mounted && data && data.app_env) setAppEnv(String(data.app_env).toLowerCase());
            } catch { /* silent — fallback handled below */ }
        })();
        return () => { mounted = false; };
    }, [user]);

    // M-10: Real-time openReports via WebSocket cockpit_event. Falls back to
    // a slow 60s poll (was 30s) since WS does the heavy lifting now.
    const fetchReportCount = useCallback(async () => {
        try {
            const { data } = await api.get("/admin/stats");
            setOpenReports((data && data.moderation && data.moderation.reports_open) || 0);
        } catch { /* silent */ }
    }, []);

    useEffect(() => {
        if (!user || !user.is_admin) return undefined;
        let mounted = true;
        fetchReportCount();
        const id = setInterval(() => { if (mounted) fetchReportCount(); }, 60000);
        return () => { mounted = false; clearInterval(id); };
    }, [user, fetchReportCount]);

    // Subscribe to WS cockpit_event and adjust openReports counter on the fly.
    const onWs = useCallback((msg) => {
        if (!msg || msg.type !== "cockpit_event") return;
        if (msg.kind === "new_report") {
            setOpenReports((n) => n + 1);
        } else if (msg.kind === "report_resolved") {
            setOpenReports((n) => Math.max(0, n - 1));
        }
    }, []);
    useWsMessages(onWs);

    if (checking) {
        return (
            <div className="min-h-screen flex items-center justify-center text-black/45">
                <Loader2 className="animate-spin" />
            </div>
        );
    }
    if (!user) return <Navigate to="/login" replace />;
    if (!user.is_admin) return <Navigate to="/" replace />;

    const current = NAV_BY_KEY[tab] || NAV_BY_KEY.overview;
    // M-9: only show the time-range selector where it actually matters.
    const showTimeRange = TIME_RANGE_TABS.has(current.key);
    // C-2: pass the real env if we have it; show nothing until resolved
    // rather than lying with a hardcoded fallback.
    const effectiveAppEnv = appEnv || (user && user.is_admin ? "" : "");

    const doLogout = async () => {
        setLoggingOut(true);
        try { await logout(); } finally {
            setLoggingOut(false);
            navigate("/login", { replace: true });
        }
    };

    // C-5: parse and apply a deep_link query string returned by a notification
    // (e.g. "?tab=reports&queue=urgent&id=…"). We merge it into the existing
    // URL state so we don't clobber other params.
    const applyDeepLink = (deepLink) => {
        if (!deepLink) return;
        try {
            const params = new URLSearchParams(deepLink.startsWith("?") ? deepLink.slice(1) : deepLink);
            const next = new URLSearchParams(sp);
            for (const [k, v] of params.entries()) {
                if (v) next.set(k, v); else next.delete(k);
            }
            setSp(next, { replace: false });
        } catch { /* ignore malformed */ }
    };

    return (
        <div className={`ops-shell ${isMobile ? "ops-shell--mobile" : ""}`} data-testid="admin-layout-v2">
            {!isMobile && (
                <AdminSidebar
                    tab={tab}
                    onSelect={setTab}
                    user={user}
                    openReports={openReports}
                    onProfileClick={() => navigate("/profile")}
                    appEnv={effectiveAppEnv}
                />
            )}

            <div className="ops-shell__topbar">
                <AdminTopbar
                    title={current.label}
                    subtitle={current.hint}
                    icon={current.icon}
                    tone={current.tone || "slate"}
                    groupLabel={GROUP_LABEL_BY_KEY[current.key]}
                    wsState={wsState}
                    onOpenCommand={() => setCmdOpen(true)}
                    onOpenNotifications={() => setNotifOpen(true)}
                    onOpenMenu={isMobile ? () => setDrawerOpen(true) : undefined}
                    notifBadge={openReports}
                    timeRange={timeRange}
                    onChangeTimeRange={showTimeRange ? setTimeRange : undefined}
                    onLogout={doLogout}
                    loggingOut={loggingOut}
                />
            </div>

            <main className="ops-shell__canvas" data-testid="admin-main">
                <div className="ops-canvas">
                    <Outlet context={{ tab, setTab, timeRange, setTimeRange, openCommand: () => setCmdOpen(true), applyDeepLink }} />
                </div>
            </main>

            {/* Mobile drawer */}
            {isMobile && drawerOpen && (
                <>
                    <button
                        type="button"
                        className="ops-side__backdrop"
                        aria-label="Fechar menu"
                        onClick={() => setDrawerOpen(false)}
                        data-testid="admin-sidebar-backdrop"
                    />
                    <AdminSidebar
                        tab={tab}
                        onSelect={setTab}
                        user={user}
                        openReports={openReports}
                        onProfileClick={() => { navigate("/profile"); setDrawerOpen(false); }}
                        appEnv={effectiveAppEnv}
                        inDrawer
                        onClose={() => setDrawerOpen(false)}
                    />
                </>
            )}

            <CommandPalette
                open={cmdOpen}
                onClose={() => setCmdOpen(false)}
                onNavigate={(k) => setTab(k)}
                onDeepLink={applyDeepLink}
            />

            <NotificationsDrawer
                open={notifOpen}
                onClose={() => setNotifOpen(false)}
                onDeepLink={applyDeepLink}
            />
        </div>
    );
}

export default AdminLayout;
