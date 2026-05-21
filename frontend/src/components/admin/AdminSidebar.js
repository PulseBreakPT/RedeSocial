import React, { useState, useEffect } from "react";
import { NAV_GROUPS } from "./navConfig";
import { Shield, X as XIcon, Search } from "lucide-react";
import { Link } from "react-router-dom";

/**
 * AdminSidebar — SSS-tier hierarchical navigation.
 *
 *  • Groups are semantically tonalized (Cockpit=info, Confiança & Segurança=danger,
 *    Pessoas=warn, Conteúdo=info, Plataforma=success, Sistema=system).
 *  • Group label, active accent bar and active background fade follow the tone.
 *  • Reports badge animates when there is moderation pressure.
 *  • Used both as static desktop sidebar and as mobile drawer (when `inDrawer`).
 */
export function AdminSidebar({
    tab,
    onSelect,
    user,
    onProfileClick,
    openReports = 0,
    appEnv = "production",
    inDrawer = false,
    onClose,
}) {
    const [query, setQuery] = useState("");
    const q = query.trim().toLowerCase();

    // Close drawer on Esc
    useEffect(() => {
        if (!inDrawer) return undefined;
        const onKey = (e) => { if (e.key === "Escape") onClose && onClose(); };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [inDrawer, onClose]);

    const filteredGroups = NAV_GROUPS.map((g) => {
        if (!q) return g;
        const items = g.items.filter((it) => {
            const hay = `${it.label || ""} ${it.hint || ""} ${it.key || ""}`.toLowerCase();
            return hay.includes(q);
        });
        return { ...g, items };
    }).filter((g) => g.items.length > 0);

    const handleSelect = (key) => {
        onSelect && onSelect(key);
        if (inDrawer) onClose && onClose();
    };

    return (
        <aside
            className={`ops-side ops-shell__side ${inDrawer ? "ops-side--drawer" : ""}`}
            data-testid={inDrawer ? "admin-sidebar-drawer" : "admin-sidebar-v2"}
            aria-label="Navegação admin"
        >
            <div className="ops-side__brand-row">
                <Link to="/admin" className="ops-side__brand" data-testid="admin-sidebar-brand">
                    <span className="ops-side__brand-mark">L</span>
                    <span className="ops-side__brand-name">Lusorae</span>
                    <span className={`ops-side__brand-env ops-side__brand-env--${(appEnv || "prod").toLowerCase()}`}>
                        {appEnv.slice(0, 4)}
                    </span>
                </Link>
                {inDrawer && (
                    <button
                        type="button"
                        className="ops-side__close"
                        onClick={onClose}
                        aria-label="Fechar menu"
                        data-testid="admin-sidebar-close"
                    >
                        <XIcon size={16} />
                    </button>
                )}
            </div>

            <div className="ops-side__search">
                <Search size={13} className="ops-side__search-ic" aria-hidden />
                <input
                    type="text"
                    className="ops-side__search-input"
                    placeholder="Filtrar menu…"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    data-testid="admin-sidebar-search"
                />
            </div>

            <nav className="ops-side__nav">
                {filteredGroups.length === 0 && (
                    <div className="ops-side__empty">Sem resultados para "{query}".</div>
                )}
                {filteredGroups.map((group) => {
                    const groupTone = group.tone || "slate";
                    return (
                        <div key={group.label} className={`ops-side__group-wrap ops-side__group-wrap--tone-${groupTone}`}>
                            <div className={`ops-side__group ops-side__group--tone-${groupTone}`}>
                                <span className="ops-side__group-dot" aria-hidden />
                                <span className="ops-side__group-label">{group.label}</span>
                            </div>
                            {group.items.map((it) => {
                                const Icon = it.icon;
                                const active = tab === it.key;
                                const isReports = it.key === "reports";
                                const showBadge = isReports && openReports > 0;
                                const itemTone = it.tone || groupTone;
                                const critical = isReports && openReports >= 5;
                                return (
                                    <button
                                        key={it.key}
                                        onClick={() => handleSelect(it.key)}
                                        type="button"
                                        className={[
                                            "ops-side__item",
                                            `ops-side__item--tone-${itemTone}`,
                                            active ? "ops-side__item--active" : "",
                                            critical ? "ops-side__item--crit" : "",
                                        ].filter(Boolean).join(" ")}
                                        data-testid={`admin-nav-${it.key}`}
                                        title={it.hint || it.label}
                                        aria-current={active ? "page" : undefined}
                                    >
                                        <span className="ops-side__item-accent" aria-hidden />
                                        <Icon className="ops-side__item-ic" size={15} />
                                        <span className="ops-side__item-label">{it.label}</span>
                                        {showBadge && (
                                            <span
                                                className={`ops-side__item-badge ops-side__item-badge--danger ${critical ? "ops-side__item-badge--pulse" : ""}`}
                                                data-testid="admin-reports-badge"
                                            >
                                                {openReports > 99 ? "99+" : openReports}
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    );
                })}
            </nav>

            {user && (
                <div className="ops-side__foot">
                    <button type="button" className="ops-side__profile" onClick={onProfileClick} data-testid="admin-sidebar-profile">
                        <span className="ops-side__profile-avatar-wrap">
                            {user.avatar ? (
                                <img src={user.avatar} alt="" className="ops-side__profile-avatar" />
                            ) : (
                                <div className="ops-side__profile-avatar" style={{ display: "grid", placeItems: "center", color: "var(--ops-text-muted)", fontFamily: "var(--ops-font-mono)", fontWeight: 600, fontSize: 12 }}>
                                    {(user.name || user.username || "?").slice(0, 1).toUpperCase()}
                                </div>
                            )}
                            <span className="ops-side__profile-online" aria-hidden />
                        </span>
                        <div className="ops-side__profile-info">
                            <div className="ops-side__profile-name">{user.name || user.username || "—"}</div>
                            <div className="ops-side__profile-role">
                                {user.is_admin ? (
                                    <span className="ops-side__profile-role-tag ops-side__profile-role-tag--admin">Admin</span>
                                ) : (
                                    <span className="ops-side__profile-role-tag">Member</span>
                                )}
                                <span className="ops-side__profile-handle">@{user.username}</span>
                            </div>
                        </div>
                        <Shield size={13} className="ops-side__profile-shield" />
                    </button>
                </div>
            )}
        </aside>
    );
}

export default AdminSidebar;
