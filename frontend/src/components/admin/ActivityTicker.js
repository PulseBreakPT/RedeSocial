import React from "react";
import {
    AlertTriangle, Flag, ShieldOff, Ban, UserX, FileText as FileIcon,
    Trash2, ShieldCheck, Activity as ActIcon,
} from "lucide-react";

const KIND_META = {
    new_report:      { Icon: Flag,         tone: "warn" },
    report_resolved: { Icon: ShieldCheck,  tone: "success" },
    admin_action:    { Icon: ActIcon,      tone: "system" },
    auth_event:      { Icon: ShieldOff,    tone: "danger" },
    user_banned:     { Icon: Ban,          tone: "danger" },
    user_suspended:  { Icon: UserX,        tone: "warn" },
    post_deleted:    { Icon: Trash2,       tone: "danger" },
    new_content:     { Icon: FileIcon,     tone: "info" },
    default:         { Icon: AlertTriangle, tone: "info" },
};

function relativeTime(iso) {
    if (!iso) return "";
    try {
        const t = new Date(iso).getTime();
        if (!Number.isFinite(t)) return "";
        const diff = Math.max(0, (Date.now() - t) / 1000);
        if (diff < 5) return "agora";
        if (diff < 60) return `${Math.floor(diff)}s`;
        if (diff < 3600) return `${Math.floor(diff / 60)}m`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
        return `${Math.floor(diff / 86400)}d`;
    } catch { return ""; }
}

function toneFromSeverity(severity, fallback) {
    if (severity === "danger") return "danger";
    if (severity === "warn") return "warn";
    if (severity === "info") return "info";
    if (severity === "success") return "success";
    return fallback;
}

export function ActivityTicker({ items = [], onClickItem }) {
    if (!items.length) {
        return (
            <div className="ops-ticker__empty">
                Sem atividade nas últimas observações.
                <div style={{ fontSize: 10.5, marginTop: 4, color: "var(--ops-text-ghost)" }}>
                    Eventos reais aparecem aqui em tempo real.
                </div>
            </div>
        );
    }
    return (
        <div className="ops-ticker">
            {items.map((it) => {
                const meta = KIND_META[it.kind] || KIND_META.default;
                const Icon = meta.Icon;
                const tone = toneFromSeverity(it.severity, meta.tone);
                return (
                    <button key={it.id} className="ops-ticker__item" onClick={() => onClickItem && onClickItem(it)} type="button">
                        <span className={`ops-ticker__ic ops-ticker__ic--${tone}`}><Icon /></span>
                        <div style={{ minWidth: 0 }}>
                            <div className="ops-ticker__title">{it.title}</div>
                            {it.subtitle && <div className="ops-ticker__sub">{it.subtitle}</div>}
                        </div>
                        <div className="ops-ticker__time" title={it.ts || ""}>há {relativeTime(it.ts)}</div>
                    </button>
                );
            })}
        </div>
    );
}

export default ActivityTicker;
