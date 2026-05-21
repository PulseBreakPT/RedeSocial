/**
 * AdminLayout v2 — Premium operational shell.
 *
 * Replaces the old top-only chrome with a full sidebar+topbar+canvas
 * grid that hosts every admin page (Cockpit, tabs). Uses URL query
 * `?tab=...` as the single source of truth for the active section, so
 * Admin.js (which renders inside <Outlet/>) and the sidebar stay in sync
 * without prop drilling.
 */
import React, { useCallback, useEffect, useState } from "react";
import { Outlet, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import "./admin.css";
import { AdminSidebar } from "./admin/AdminSidebar";
import { AdminTopbar } from "./admin/AdminTopbar";
import { CommandPalette } from "./admin/CommandPalette";
import { NAV_BY_KEY, NAV_GROUPS } from "./admin/navConfig";

// Quick lookup: tab key -> group label (for breadcrumb in topbar).
const GROUP_LABEL_BY_KEY = NAV_GROUPS.reduce((acc, g) => {
    g.items.forEach((it) => { acc[it.key] = g.label; });
    return acc;
}, {});
import { useWsState } from "./WebSocketProvider";
import { api } from "../lib/api";

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
    const [tab, setTab] = useAdminTab();
    const [timeRange, setTimeRange] = useAdminTimeRange();
    const wsState = useWsState();
    const [cmdOpen, setCmdOpen] = useState(false);
    const [openReports, setOpenReports] = useState(0);
    const [loggingOut, setLoggingOut] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);
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
            if (!e.matches) setDrawerOpen(false); // closing drawer when leaving mobile
        };
        if (mq.addEventListener) mq.addEventListener("change", handler);
        else mq.addListener(handler);
        return () => {
            if (mq.removeEventListener) mq.removeEventListener("change", handler);
            else mq.removeListener(handler);
        };
    }, []);

    // Lock body scroll while drawer is open
    useEffect(() => {
        if (!drawerOpen) return undefined;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = prev; };
    }, [drawerOpen]);

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

    // Poll open reports count for the sidebar badge (kept simple, 30s)
    useEffect(() => {
        if (!user || !user.is_admin) return undefined;
        let mounted = true;
        const fetchCount = async () => {
            try {
                const { data } = await api.get("/admin/stats");
                if (mounted) setOpenReports((data && data.moderation && data.moderation.reports_open) || 0);
            } catch { /* silent */ }
        };
        fetchCount();
        const id = setInterval(fetchCount, 30000);
        return () => { mounted = false; clearInterval(id); };
    }, [user]);

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

    const doLogout = async () => {
        setLoggingOut(true);
        try { await logout(); } finally {
            setLoggingOut(false);
            navigate("/login", { replace: true });
        }
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
                    appEnv={(typeof window !== "undefined" && window.__APP_ENV__) || "prod"}
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
                    onOpenNotifications={() => setTab("audit")}
                    onOpenMenu={isMobile ? () => setDrawerOpen(true) : undefined}
                    notifBadge={openReports}
                    timeRange={timeRange}
                    onChangeTimeRange={setTimeRange}
                    onLogout={doLogout}
                    loggingOut={loggingOut}
                />
            </div>

            <main className="ops-shell__canvas" data-testid="admin-main">
                <div className="ops-canvas">
                    <Outlet context={{ tab, setTab, timeRange, setTimeRange, openCommand: () => setCmdOpen(true) }} />
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
                        appEnv={(typeof window !== "undefined" && window.__APP_ENV__) || "prod"}
                        inDrawer
                        onClose={() => setDrawerOpen(false)}
                    />
                </>
            )}

            <CommandPalette
                open={cmdOpen}
                onClose={() => setCmdOpen(false)}
                onNavigate={(k) => setTab(k)}
            />
        </div>
    );
}

export default AdminLayout;
