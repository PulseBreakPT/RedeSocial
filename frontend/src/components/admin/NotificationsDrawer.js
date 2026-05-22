/**
 * NotificationsDrawer — operational inbox for the admin bell icon (C-5).
 *
 * Replaces the previous "click bell → go to Audit log" semantic confusion
 * with an actual notifications panel that aggregates four real signals:
 *   - urgent open reports
 *   - severe admin actions (last 24h)
 *   - critical auth events (lockouts, IP changes, 2FA fails)
 *   - degraded/down services
 *
 * Each item has a deep_link query string that the parent uses to jump to
 * the right tab with the right filter/id pre-applied.
 *
 * "Unread" is a soft client-side concept: we remember the timestamp of the
 * last time the drawer was opened (localStorage) and mark anything newer
 * as new. This is intentionally not persisted server-side — for the admin
 * inbox use case the local-only state is the right trade-off vs the
 * complexity of a real read-receipt schema. If/when we need cross-device
 * read state we can promote it to a collection.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
    X, AlertTriangle, ShieldAlert, History as HistoryIcon, Server as ServerIcon,
    ExternalLink, Inbox, Loader2, RefreshCcw,
} from "lucide-react";
import { api } from "../../lib/api";

const LS_KEY = "admin_notifs_seen_at";

function readSeenAt() {
    try { return localStorage.getItem(LS_KEY) || ""; } catch { return ""; }
}
function writeSeenAt(iso) {
    try { localStorage.setItem(LS_KEY, iso || new Date().toISOString()); } catch { /* ignore */ }
}

function iconFor(kind) {
    if (kind === "urgent_report") return AlertTriangle;
    if (kind === "admin_action") return HistoryIcon;
    if (kind === "auth_event") return ShieldAlert;
    if (kind === "service_alert") return ServerIcon;
    return Inbox;
}

function severityClass(sev) {
    if (sev === "danger") return "ops-notif__item--danger";
    if (sev === "warn") return "ops-notif__item--warn";
    return "ops-notif__item--info";
}

function fmtRelative(iso) {
    if (!iso) return "—";
    try {
        const d = new Date(iso);
        const diff = (Date.now() - d.getTime()) / 1000;
        if (diff < 60) return "agora";
        if (diff < 3600) return `${Math.floor(diff / 60)} min`;
        if (diff < 86400) return `${Math.floor(diff / 3600)} h`;
        return `${Math.floor(diff / 86400)} d`;
    } catch { return "—"; }
}

export function NotificationsDrawer({ open, onClose, onDeepLink }) {
    const [items, setItems] = useState([]);
    const [counts, setCounts] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const seenAtRef = useRef(readSeenAt());

    const fetchNotifs = async () => {
        setLoading(true);
        try {
            const { data } = await api.get("/admin/notifications?limit=40&since_hours=24");
            setItems((data && data.items) || []);
            setCounts((data && data.counts) || {});
            setError(null);
        } catch (e) {
            setError((e && e.response && e.response.data && e.response.data.detail) || (e && e.message) || "Falha a obter notificações");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!open) return undefined;
        seenAtRef.current = readSeenAt();
        fetchNotifs();
        // mark as seen — use a slight delay so the "new" highlight is visible briefly
        const t = setTimeout(() => writeSeenAt(new Date().toISOString()), 1500);
        return () => clearTimeout(t);
    }, [open]);

    useEffect(() => {
        if (!open) return undefined;
        const onKey = (e) => { if (e.key === "Escape") onClose && onClose(); };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [open, onClose]);

    const isNew = useMemo(() => {
        const ref = seenAtRef.current || "";
        return (ts) => !!ts && (!ref || ts > ref);
    }, [open]);

    if (!open) return null;

    return (
        <>
            <div
                className="ops-notif__backdrop"
                onClick={(e) => { if (e.target === e.currentTarget) onClose && onClose(); }}
                data-testid="admin-notifs-backdrop"
            />
            <aside className="ops-notif" data-testid="admin-notifs-drawer" aria-label="Notificações">
                <header className="ops-notif__head">
                    <div className="ops-notif__head-title">
                        <Inbox size={15} aria-hidden />
                        <span>Notificações</span>
                        {items.length > 0 && (
                            <span className="ops-notif__head-count">{items.length}</span>
                        )}
                    </div>
                    <div className="ops-notif__head-actions">
                        <button
                            type="button"
                            className="ops-notif__head-btn"
                            onClick={fetchNotifs}
                            aria-label="Recarregar"
                            data-testid="admin-notifs-refresh"
                            disabled={loading}
                        >
                            {loading ? <Loader2 size={13} className="animate-spin" /> : <RefreshCcw size={13} />}
                        </button>
                        <button
                            type="button"
                            className="ops-notif__head-btn"
                            onClick={onClose}
                            aria-label="Fechar"
                            data-testid="admin-notifs-close"
                        >
                            <X size={14} />
                        </button>
                    </div>
                </header>

                {(counts && (counts.urgent_report || counts.admin_action || counts.auth_event || counts.service_alert)) ? (
                    <div className="ops-notif__chips">
                        {!!counts.urgent_report && (
                            <span className="ops-notif__chip ops-notif__chip--danger">
                                {counts.urgent_report} urgente{counts.urgent_report === 1 ? "" : "s"}
                            </span>
                        )}
                        {!!counts.service_alert && (
                            <span className="ops-notif__chip ops-notif__chip--danger">
                                {counts.service_alert} serviço{counts.service_alert === 1 ? "" : "s"}
                            </span>
                        )}
                        {!!counts.auth_event && (
                            <span className="ops-notif__chip ops-notif__chip--warn">
                                {counts.auth_event} auth
                            </span>
                        )}
                        {!!counts.admin_action && (
                            <span className="ops-notif__chip ops-notif__chip--info">
                                {counts.admin_action} ação{counts.admin_action === 1 ? "" : "s"}
                            </span>
                        )}
                    </div>
                ) : null}

                <div className="ops-notif__body">
                    {loading && items.length === 0 && (
                        <div className="ops-notif__empty">
                            <Loader2 size={16} className="animate-spin" /> A carregar…
                        </div>
                    )}
                    {error && (
                        <div className="ops-notif__error">
                            {error}
                            <button onClick={fetchNotifs} className="ops-notif__error-btn">Tentar novamente</button>
                        </div>
                    )}
                    {!loading && !error && items.length === 0 && (
                        <div className="ops-notif__empty">
                            Sem notificações ativas. Tudo calmo. ✓
                        </div>
                    )}
                    {items.map((it) => {
                        const Icon = iconFor(it.kind);
                        const fresh = isNew(it.ts);
                        return (
                            <button
                                key={it.id}
                                type="button"
                                className={`ops-notif__item ${severityClass(it.severity)} ${fresh ? "ops-notif__item--new" : ""}`}
                                onClick={() => {
                                    if (onDeepLink && it.deep_link) onDeepLink(it.deep_link);
                                    onClose && onClose();
                                }}
                                data-testid={`admin-notif-item-${it.kind}`}
                            >
                                <span className="ops-notif__item-ic" aria-hidden>
                                    <Icon size={14} />
                                </span>
                                <span className="ops-notif__item-body">
                                    <span className="ops-notif__item-title">
                                        {it.title}
                                        {fresh && <span className="ops-notif__item-new" aria-label="novo">novo</span>}
                                    </span>
                                    {it.subtitle && (
                                        <span className="ops-notif__item-sub">{it.subtitle}</span>
                                    )}
                                </span>
                                <span className="ops-notif__item-meta">
                                    <span className="ops-notif__item-time">{fmtRelative(it.ts)}</span>
                                    {it.deep_link && <ExternalLink size={11} className="ops-notif__item-link" aria-hidden />}
                                </span>
                            </button>
                        );
                    })}
                </div>
            </aside>
        </>
    );
}

export default NotificationsDrawer;
