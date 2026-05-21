import React, { useState, useRef, useEffect } from "react";
import { Info } from "lucide-react";

/**
 * InfoBadge — small (i) button that toggles a popover with the widget's
 * description. CSS-only hover would be ideal but on mobile users tap, so we
 * keep state and toggle on click. Closes on outside click / Esc.
 */
function InfoBadge({ info, testid }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    useEffect(() => {
        if (!open) return undefined;
        const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        const onEsc = (e) => { if (e.key === "Escape") setOpen(false); };
        document.addEventListener("mousedown", onDoc);
        document.addEventListener("keydown", onEsc);
        return () => {
            document.removeEventListener("mousedown", onDoc);
            document.removeEventListener("keydown", onEsc);
        };
    }, [open]);
    if (!info) return null;
    const text = typeof info === "string" ? { body: info } : info;
    return (
        <span className="ops-widget__info" ref={ref}>
            <button
                type="button"
                className={`ops-widget__info-trigger ${open ? "ops-widget__info-trigger--open" : ""}`}
                onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
                aria-label="Sobre este painel"
                aria-expanded={open}
                data-testid={testid || "widget-info-trigger"}
            >
                <Info size={12} aria-hidden />
            </button>
            {open && (
                <span className="ops-widget__info-pop" role="tooltip">
                    {text.title && <span className="ops-widget__info-title">{text.title}</span>}
                    {text.body && <span className="ops-widget__info-body">{text.body}</span>}
                    {text.source && (
                        <span className="ops-widget__info-source">
                            <span className="ops-widget__info-source-label">Fonte</span>
                            <code>{text.source}</code>
                        </span>
                    )}
                </span>
            )}
        </span>
    );
}

/**
 * Widget — generic operational panel shell.
 * Use this in every cockpit / tab section so spacing, borders, hierarchy stay
 * consistent. Children render in the body unless `bodyClass="ops-widget__body--flush"`.
 *
 * Props
 *   info       — string OR { title, body, source } shown in (i) popover.
 *                Source should be the real backend endpoint feeding the widget
 *                (e.g. "GET /api/admin/cockpit/services") — transparency rule.
 */
export function Widget({
    title,
    sub,
    info,
    action,         // { label: "Ver tudo", onClick }
    children,
    bodyClass = "ops-widget__body",
    foot,
    flushHead = false,
    className = "",
    "data-testid": dataTestId,
}) {
    return (
        <section className={`ops-widget ${className}`} data-testid={dataTestId}>
            {(title || action) && (
                <header className={`ops-widget__head ${flushHead ? "ops-widget__head--bare" : ""}`}>
                    <div className="ops-widget__title">
                        <span>{title}</span>
                        {sub && <span className="ops-widget__title-sub">{sub}</span>}
                        <InfoBadge info={info} testid={dataTestId ? `${dataTestId}-info` : undefined} />
                    </div>
                    {action && (
                        <button
                            type="button"
                            className="ops-widget__head-action"
                            onClick={action.onClick}
                            data-testid={action["data-testid"] || (dataTestId ? `${dataTestId}-action` : undefined)}
                        >
                            {action.label}
                        </button>
                    )}
                </header>
            )}
            <div className={bodyClass}>{children}</div>
            {foot && <footer className="ops-widget__foot">{foot}</footer>}
        </section>
    );
}

export default Widget;
