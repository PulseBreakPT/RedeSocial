import React from "react";
import { useNavigate } from "react-router-dom";
import {
    Search, Bell, Maximize2, Minimize2, Home as HomeIcon,
    LogOut, Loader2, Menu as MenuIcon, ChevronRight,
} from "lucide-react";

function useFullscreen() {
    const [isFs, setIsFs] = React.useState(
        typeof document !== "undefined" && !!document.fullscreenElement
    );
    React.useEffect(() => {
        const onChange = () => setIsFs(!!document.fullscreenElement);
        document.addEventListener("fullscreenchange", onChange);
        return () => document.removeEventListener("fullscreenchange", onChange);
    }, []);
    const toggle = React.useCallback(() => {
        try {
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen && document.documentElement.requestFullscreen();
            } else {
                document.exitFullscreen && document.exitFullscreen();
            }
        } catch { /* unsupported */ }
    }, []);
    return { isFs, toggle };
}

/**
 * AdminTopbar — SSS-tier hierarchical header.
 *
 *   Zona 1 (L1 — identidade da página, mais importante):
 *      [menu mobile] · icon-tone · Título grande · subtítulo · breadcrumb
 *   Zona 2 (L2 — ação principal): ⌘K command palette
 *   Zona 3 (L3 — contexto operacional): live pill · range temporal
 *   Zona 4 (L4 — ações): notificações com contagem · fullscreen · voltar à app · logout (danger)
 *
 * Props:
 *   - title / subtitle / icon                 (page identity)
 *   - tone ("info"|"danger"|"warn"|"success"|"system"|"slate")  drives accent color
 *   - groupLabel                              breadcrumb prefix ("Confiança & Segurança › …")
 *   - wsState ("live"|"reconnecting"|"offline"|"polling")
 *   - onOpenCommand / onOpenNotifications / onOpenMenu
 *   - notifBadge (number)                     numeric badge if > 0
 *   - timeRange / onChangeTimeRange
 *   - onLogout / loggingOut
 */
export function AdminTopbar({
    title, subtitle,
    icon: Icon,
    tone = "slate",
    groupLabel,
    wsState = "offline",
    onOpenCommand,
    onOpenNotifications,
    onOpenMenu,
    notifBadge = 0,
    timeRange = "15m",
    onChangeTimeRange,
    rightExtras,
    onLogout,
    loggingOut,
}) {
    const navigate = useNavigate();
    const { isFs, toggle: toggleFs } = useFullscreen();
    const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || "");

    let liveText = "A sondar";
    let liveModifier = "ops-top__live--offline";
    if (wsState === "live") { liveText = "Ao vivo"; liveModifier = "ops-top__live--live"; }
    else if (wsState === "reconnecting") { liveText = "A ligar…"; liveModifier = "ops-top__live--polling"; }
    else if (wsState === "polling") { liveText = "A sondar"; liveModifier = "ops-top__live--polling"; }
    else if (wsState === "offline") { liveText = "Sem ligação"; liveModifier = "ops-top__live--offline"; }

    const safeBadge = Math.max(0, Number(notifBadge) || 0);
    const badgeLabel = safeBadge > 99 ? "99+" : String(safeBadge);

    return (
        <header className={`ops-top ops-top--tone-${tone}`} data-testid="admin-topbar-v2">
            {onOpenMenu && (
                <button
                    type="button"
                    className="ops-top__menu"
                    onClick={onOpenMenu}
                    aria-label="Abrir menu"
                    data-testid="admin-topbar-menu"
                >
                    <MenuIcon size={16} />
                </button>
            )}

            {/* L1 — Page identity */}
            <div className="ops-top__id">
                {Icon && (
                    <span className={`ops-top__id-ic ops-top__id-ic--tone-${tone}`} aria-hidden>
                        <Icon size={16} />
                    </span>
                )}
                <div className="ops-top__title">
                    {groupLabel && (
                        <div className="ops-top__crumb">
                            <span className={`ops-top__crumb-tag ops-top__crumb-tag--tone-${tone}`}>
                                {groupLabel}
                            </span>
                            <ChevronRight size={11} className="ops-top__crumb-sep" aria-hidden />
                        </div>
                    )}
                    <div className="ops-top__title-h">{title || "Cockpit"}</div>
                    {subtitle && <div className="ops-top__title-sub">{subtitle}</div>}
                </div>
            </div>

            {/* L2 — Command palette (centered) */}
            <button type="button" className="ops-top__cmd" onClick={onOpenCommand} data-testid="admin-topbar-cmd" aria-label="Abrir paleta de comandos">
                <Search size={14} aria-hidden />
                <span className="ops-top__cmd-label">Pesquisar páginas, utilizadores, ações…</span>
                <kbd className="ops-kbd ops-top__cmd-kbd">{isMac ? "⌘K" : "Ctrl K"}</kbd>
            </button>

            {/* L3 + L4 — Context + actions */}
            <div className="ops-top__actions">
                <span
                    className={`ops-top__live ${liveModifier}`}
                    title={liveText}
                    data-testid={`admin-live-${wsState}`}
                >
                    <span className="ops-top__live-dot" aria-hidden />
                    <span className="ops-top__live-text">{liveText}</span>
                </span>

                {onChangeTimeRange && (
                    <select
                        className="ops-top__time"
                        value={timeRange}
                        onChange={(e) => onChangeTimeRange(e.target.value)}
                        data-testid="admin-topbar-timerange"
                        aria-label="Intervalo temporal"
                    >
                        <option value="15m">15 min</option>
                        <option value="1h">1 hora</option>
                        <option value="24h">24 horas</option>
                        <option value="7d">7 dias</option>
                    </select>
                )}

                <span className="ops-top__sep" aria-hidden />

                <button
                    type="button"
                    className="ops-top__icon-btn ops-top__icon-btn--info"
                    onClick={onOpenNotifications}
                    aria-label={safeBadge > 0 ? `Notificações (${safeBadge})` : "Notificações"}
                    data-testid="admin-topbar-notifs"
                >
                    <Bell size={15} />
                    {safeBadge > 0 && (
                        <span
                            className="ops-top__notif-count"
                            data-testid="admin-topbar-notif-count"
                            aria-hidden
                        >
                            {badgeLabel}
                        </span>
                    )}
                </button>

                <button
                    type="button"
                    className={`ops-top__icon-btn ${isFs ? "ops-top__icon-btn--active" : ""}`}
                    onClick={toggleFs}
                    aria-label={isFs ? "Sair do ecrã inteiro" : "Ecrã inteiro"}
                    aria-pressed={isFs}
                    data-testid="admin-topbar-fs"
                >
                    {isFs ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                </button>

                <button
                    type="button"
                    className="ops-top__back"
                    onClick={() => navigate("/")}
                    aria-label="Voltar à app"
                    data-testid="admin-topbar-back"
                >
                    <HomeIcon size={14} />
                    <span className="ops-top__back-label">Voltar à app</span>
                </button>

                {onLogout && (
                    <button
                        type="button"
                        className="ops-top__icon-btn ops-top__icon-btn--danger"
                        onClick={onLogout}
                        disabled={loggingOut}
                        aria-label="Terminar sessão"
                        data-testid="admin-topbar-logout"
                        title="Terminar sessão"
                    >
                        {loggingOut ? <Loader2 size={14} className="animate-spin" /> : <LogOut size={14} />}
                    </button>
                )}

                {rightExtras}
            </div>
        </header>
    );
}

export default AdminTopbar;
