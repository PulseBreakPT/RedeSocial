import React from "react";
import { NAV_GROUPS } from "./navConfig";
import { Shield } from "lucide-react";
import { Link } from "react-router-dom";

export function AdminSidebar({ tab, onSelect, user, onProfileClick, openReports = 0, appEnv = "production" }) {
    return (
        <aside className="ops-side" data-testid="admin-sidebar-v2" aria-label="Navegação admin">
            <Link to="/admin" className="ops-side__brand" data-testid="admin-sidebar-brand">
                <span className="ops-side__brand-mark">L</span>
                <span className="ops-side__brand-name">Lusorae</span>
                <span className="ops-side__brand-env">{appEnv.slice(0, 4)}</span>
            </Link>

            <nav className="ops-side__nav">
                {NAV_GROUPS.map((group) => (
                    <div key={group.label}>
                        <div className="ops-side__group">{group.label}</div>
                        {group.items.map((it) => {
                            const Icon = it.icon;
                            const active = tab === it.key;
                            const isReports = it.key === "reports";
                            const showBadge = isReports && openReports > 0;
                            return (
                                <button
                                    key={it.key}
                                    onClick={() => onSelect && onSelect(it.key)}
                                    type="button"
                                    className={`ops-side__item ${active ? "ops-side__item--active" : ""}`}
                                    data-testid={`admin-nav-${it.key}`}
                                    title={it.hint || it.label}
                                    aria-current={active ? "page" : undefined}
                                >
                                    <Icon className="ops-side__item-ic" size={16} />
                                    <span className="ops-side__item-label">{it.label}</span>
                                    {showBadge && (
                                        <span
                                            className="ops-side__item-badge ops-side__item-badge--danger"
                                            data-testid="admin-reports-badge"
                                        >
                                            {openReports > 99 ? "99+" : openReports}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                ))}
            </nav>

            {user && (
                <div className="ops-side__foot">
                    <button type="button" className="ops-side__profile" onClick={onProfileClick} data-testid="admin-sidebar-profile">
                        {user.avatar ? (
                            <img src={user.avatar} alt="" className="ops-side__profile-avatar" />
                        ) : (
                            <div className="ops-side__profile-avatar" style={{ display: "grid", placeItems: "center", color: "var(--ops-text-muted)", fontFamily: "var(--ops-font-mono)", fontWeight: 600, fontSize: 12 }}>
                                {(user.name || user.username || "?").slice(0, 1).toUpperCase()}
                            </div>
                        )}
                        <div className="ops-side__profile-info">
                            <div className="ops-side__profile-name">{user.name || user.username || "—"}</div>
                            <div className="ops-side__profile-role">{user.is_admin ? "Admin" : "Member"} · @{user.username}</div>
                        </div>
                        <Shield size={13} style={{ color: "var(--ops-text-faint)", marginLeft: "auto" }} />
                    </button>
                </div>
            )}
        </aside>
    );
}

export default AdminSidebar;
