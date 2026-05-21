import React from "react";
import { useNavigate } from "react-router-dom";
import { Search, Bell, Maximize2, Home as HomeIcon, LogOut, Loader2 } from "lucide-react";

function useFullscreen() {
    const [isFs, setIsFs] = React.useState(typeof document !== "undefined" && !!document.fullscreenElement);
    React.useEffect(() => {
        const onChange = () => setIsFs(!!document.fullscreenElement);
        document.addEventListener("fullscreenchange", onChange);
        return () => document.removeEventListener("fullscreenchange", onChange);
    }, []);
    const toggle = React.useCallback(() => {
        try {
            if (!document.fullscreenElement) { document.documentElement.requestFullscreen && document.documentElement.requestFullscreen(); }
            else { document.exitFullscreen && document.exitFullscreen(); }
        } catch { /* unsupported */ }
    }, []);
    return { isFs, toggle };
}

export function AdminTopbar({
    title, subtitle,
    wsState = "offline",
    onOpenCommand,
    onOpenNotifications,
    notifBadge = 0,
    timeRange = "15m",
    onChangeTimeRange,
    rightExtras,
    onLogout,
    loggingOut,
}) {
    const navigate = useNavigate();
    const { toggle: toggleFs } = useFullscreen();
    const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || "");
    const liveText = wsState === "live" ? "Ao vivo" : (wsState === "reconnecting" ? "A ligar…" : "Polling");
    const liveClass = wsState === "live" ? "" : (wsState === "reconnecting" ? "ops-top__live--polling" : "ops-top__live--offline");
    return (
        <header className="ops-top" data-testid="admin-topbar-v2">
            <div className="ops-top__title">
                <div className="ops-top__title-h">{title || "Cockpit"}</div>
                {subtitle && <div className="ops-top__title-sub">{subtitle}</div>}
            </div>

            <button type="button" className="ops-top__cmd" onClick={onOpenCommand} data-testid="admin-topbar-cmd">
                <Search size={14} />
                <span style={{ flex: 1, textAlign: "left" }}>Pesquisar páginas, utilizadores, ações…</span>
                <kbd className="ops-kbd">{isMac ? "⌘K" : "Ctrl K"}</kbd>
            </button>

            <div className="ops-top__actions">
                <span className={`ops-top__live ${liveClass}`} title={liveText} data-testid={`admin-live-${wsState}`}>
                    <span className={`ops-pulse-dot ${wsState === "live" ? "" : ""}`} style={{ background: wsState === "live" ? "var(--ops-realtime-500)" : (wsState === "reconnecting" ? "var(--ops-warn-500)" : "var(--ops-slate-400)") }} />
                    {liveText}
                </span>

                {onChangeTimeRange && (
                    <select
                        className="ops-top__time"
                        value={timeRange}
                        onChange={(e) => onChangeTimeRange(e.target.value)}
                        data-testid="admin-topbar-timerange"
                    >
                        <option value="15m">Últimos 15 minutos</option>
                        <option value="1h">Última hora</option>
                        <option value="24h">Últimas 24 horas</option>
                        <option value="7d">Últimos 7 dias</option>
                    </select>
                )}

                <button type="button" className="ops-top__icon-btn" onClick={onOpenNotifications} aria-label="Notificações" data-testid="admin-topbar-notifs">
                    <Bell size={15} />
                    {notifBadge > 0 && <span className="ops-top__icon-btn-dot" />}
                </button>

                <button type="button" className="ops-top__icon-btn" onClick={toggleFs} aria-label="Ecrã inteiro" data-testid="admin-topbar-fs">
                    <Maximize2 size={14} />
                </button>

                <button type="button" className="ops-top__icon-btn" onClick={() => navigate("/")} aria-label="Voltar à app" data-testid="admin-topbar-back">
                    <HomeIcon size={15} />
                </button>

                {onLogout && (
                    <button type="button" className="ops-top__icon-btn" onClick={onLogout} disabled={loggingOut} aria-label="Terminar sessão" data-testid="admin-topbar-logout">
                        {loggingOut ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
                    </button>
                )}

                {rightExtras}
            </div>
        </header>
    );
}

export default AdminTopbar;
