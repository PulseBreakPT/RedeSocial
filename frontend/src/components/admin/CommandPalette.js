import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { Search, ArrowRight, CornerDownLeft } from "lucide-react";
import { NAV_ITEMS } from "./navConfig";

const SHORTCUTS = [
    { key: "open_reports", label: "Ir para Reports",     hint: "navegação", nav: "reports" },
    { key: "open_users",   label: "Procurar utilizador", hint: "navegação", nav: "users" },
    { key: "open_audit",   label: "Ver Audit log",       hint: "navegação", nav: "audit" },
    { key: "open_security",label: "Abrir Segurança",     hint: "navegação", nav: "security" },
];

function matchScore(item, q) {
    if (!q) return 1;
    const hay = `${item.label || ""} ${item.hint || ""} ${item.key || ""}`.toLowerCase();
    const needle = q.toLowerCase();
    if (hay.includes(needle)) return 2;
    // simple letter-by-letter fallback
    let i = 0;
    for (const ch of needle) {
        i = hay.indexOf(ch, i);
        if (i < 0) return 0;
        i += 1;
    }
    return 1;
}

export function CommandPalette({ open, onClose, onNavigate }) {
    const [q, setQ] = useState("");
    const [activeIdx, setActiveIdx] = useState(0);
    const inputRef = useRef(null);

    useEffect(() => {
        if (!open) return undefined;
        setQ("");
        setActiveIdx(0);
        const t = setTimeout(() => { inputRef.current && inputRef.current.focus(); }, 0);
        const onKey = (e) => {
            if (e.key === "Escape") { e.preventDefault(); onClose && onClose(); }
        };
        document.addEventListener("keydown", onKey);
        return () => {
            clearTimeout(t);
            document.removeEventListener("keydown", onKey);
        };
    }, [open, onClose]);

    const navResults = useMemo(() => {
        return NAV_ITEMS
            .map((it) => ({ ...it, _score: matchScore(it, q) }))
            .filter((it) => it._score > 0)
            .sort((a, b) => b._score - a._score);
    }, [q]);
    const actionResults = useMemo(() => {
        return SHORTCUTS
            .map((it) => ({ ...it, _score: matchScore(it, q) }))
            .filter((it) => it._score > 0)
            .sort((a, b) => b._score - a._score);
    }, [q]);

    const flat = [...navResults, ...actionResults];

    const exec = useCallback((it) => {
        if (!it) return;
        if (it.nav) onNavigate && onNavigate(it.nav);
        else if (it.key) onNavigate && onNavigate(it.key);
        onClose && onClose();
    }, [onClose, onNavigate]);

    useEffect(() => {
        if (!open) return undefined;
        const onKey = (e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, Math.max(0, flat.length - 1))); }
            else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx((i) => Math.max(0, i - 1)); }
            else if (e.key === "Enter") { e.preventDefault(); exec(flat[activeIdx]); }
        };
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [open, flat, activeIdx, exec]);

    if (!open) return null;
    return (
        <div className="ops-cmd-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose && onClose(); }} data-testid="admin-cmd-palette">
            <div className="ops-cmd">
                <div className="ops-cmd__input-wrap">
                    <Search size={16} style={{ color: "var(--ops-text-faint)" }} />
                    <input
                        ref={inputRef}
                        value={q}
                        onChange={(e) => { setQ(e.target.value); setActiveIdx(0); }}
                        placeholder="Procurar páginas, ações, atalhos…"
                        data-testid="admin-cmd-input"
                    />
                    <kbd className="ops-kbd">ESC</kbd>
                </div>
                <div className="ops-cmd__list">
                    {navResults.length > 0 && (
                        <>
                            <div className="ops-cmd__group-label">Navegação</div>
                            {navResults.map((it, i) => {
                                const Icon = it.icon;
                                const idx = i;
                                const active = idx === activeIdx;
                                return (
                                    <button key={`nav-${it.key}`} className={`ops-cmd__item ${active ? "ops-cmd__item--active" : ""}`} onClick={() => exec(it)} type="button">
                                        <span className="ops-cmd__item-ic"><Icon size={15} /></span>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div className="ops-cmd__item-name">{it.label}</div>
                                            {it.hint && <div className="ops-cmd__item-sub">{it.hint}</div>}
                                        </div>
                                        <ArrowRight size={13} style={{ color: "var(--ops-text-faint)" }} />
                                    </button>
                                );
                            })}
                        </>
                    )}
                    {actionResults.length > 0 && (
                        <>
                            <div className="ops-cmd__group-label">Ações</div>
                            {actionResults.map((it, i) => {
                                const idx = navResults.length + i;
                                const active = idx === activeIdx;
                                return (
                                    <button key={`act-${it.key}`} className={`ops-cmd__item ${active ? "ops-cmd__item--active" : ""}`} onClick={() => exec(it)} type="button">
                                        <span className="ops-cmd__item-ic"><CornerDownLeft size={14} /></span>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div className="ops-cmd__item-name">{it.label}</div>
                                            {it.hint && <div className="ops-cmd__item-sub">{it.hint}</div>}
                                        </div>
                                    </button>
                                );
                            })}
                        </>
                    )}
                    {flat.length === 0 && (
                        <div className="ops-empty" style={{ padding: "24px 14px" }}>Sem resultados.</div>
                    )}
                </div>
                <div className="ops-cmd__foot">
                    <span><kbd>↑</kbd> <kbd>↓</kbd> navegar</span>
                    <span><kbd>⏎</kbd> abrir</span>
                    <span><kbd>ESC</kbd> fechar</span>
                </div>
            </div>
        </div>
    );
}

export default CommandPalette;
