import React from "react";

/**
 * Widget — generic operational panel shell.
 * Use this in every cockpit / tab section so spacing, borders, hierarchy stay
 * consistent. Children render in the body unless `bodyClass="ops-widget__body--flush"`.
 */
export function Widget({
    title,
    sub,
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
                    </div>
                    {action && (
                        <button type="button" className="ops-widget__head-action" onClick={action.onClick}>
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
