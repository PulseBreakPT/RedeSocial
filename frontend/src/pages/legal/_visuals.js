/**
 * Centro Legal — visual primitives library.
 *
 * Estes componentes não são decorativos: cada um codifica informação
 * presente no documento legal correspondente. O objetivo é dar
 * hierarquia visual e tornar legível conteúdo denso, sem reduzir o
 * rigor jurídico do texto.
 *
 * Convenção: tudo aqui assume estar dentro de `.prose-legal .not-prose`.
 */
import {
    Scale, ShieldCheck, Cookie as CookieIcon, FileText, Sparkle,
    Flag, AlertTriangle, EyeOff, Trash2, UserX, BadgeCheck,
    User, Database, Server, Building2, Gavel, ArrowRight,
    Lock, Key, Download, Edit3, Ban, RefreshCw, MessageCircle,
    Fingerprint, Globe, Monitor, MousePointerClick, MapPin, Mail,
    Heart, Brain, Megaphone, Clock, Calendar, BookOpen, FileCheck,
    AlertCircle, Slash, ShieldAlert, ShieldOff
} from "lucide-react";

/* ════════════════════════════════════════════════════════════════
   1. SIGNAL PILLS — framework regulatório aplicável a esta página
   ════════════════════════════════════════════════════════════════ */
export function LegalSignalPills({ items }) {
    return (
        <div className="legal-viz-pills not-prose" data-testid="legal-viz-pills">
            {items.map((it, i) => (
                <span
                    key={i}
                    className={`legal-viz-pill ${it.tone || ""}`}
                    title={it.title || it.label}
                >
                    {it.icon ? <it.icon size={11} strokeWidth={2} /> : null}
                    <span className="legal-viz-pill-label">{it.label}</span>
                    {it.ref ? <span className="legal-viz-pill-ref">{it.ref}</span> : null}
                </span>
            ))}
        </div>
    );
}

/* ════════════════════════════════════════════════════════════════
   2. KPI ROW — factos concretos do documento (números reais)
   ════════════════════════════════════════════════════════════════ */
export function LegalKPIs({ items }) {
    return (
        <div className="legal-viz-kpis not-prose" data-testid="legal-viz-kpis">
            {items.map((it, i) => {
                const Icon = it.icon;
                return (
                    <div key={i} className="legal-viz-kpi">
                        <div className="legal-viz-kpi-icon">
                            {Icon ? <Icon size={13} strokeWidth={1.8} /> : null}
                        </div>
                        <div className="legal-viz-kpi-body">
                            <div className="legal-viz-kpi-value">{it.value}</div>
                            <div className="legal-viz-kpi-label">{it.label}</div>
                            {it.sub && <div className="legal-viz-kpi-sub">{it.sub}</div>}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

/* ════════════════════════════════════════════════════════════════
   3. SECTION VISUAL — wrapper para encimar uma h2 com um visual
   ════════════════════════════════════════════════════════════════ */
export function LegalVisualBlock({ eyebrow, title, children, tone = "neutral" }) {
    return (
        <div className={`legal-viz-block legal-viz-block--${tone} not-prose`}>
            {eyebrow && <p className="legal-viz-block-eyebrow">{eyebrow}</p>}
            {title && <p className="legal-viz-block-title">{title}</p>}
            {children}
        </div>
    );
}

/* ════════════════════════════════════════════════════════════════
   4. FLOW — diagrama horizontal Tu → Plataforma → ... → Autoridades
   ════════════════════════════════════════════════════════════════ */
export function LegalFlow({ steps, caption }) {
    return (
        <div className="legal-viz-flow not-prose" data-testid="legal-viz-flow">
            <div className="legal-viz-flow-track">
                {steps.map((s, i) => {
                    const Icon = s.icon;
                    return (
                        <div key={i} className="legal-viz-flow-step">
                            <div className={`legal-viz-flow-node ${s.accent || ""}`}>
                                {Icon ? <Icon size={16} strokeWidth={1.7} /> : null}
                            </div>
                            <div className="legal-viz-flow-meta">
                                <div className="legal-viz-flow-label">{s.label}</div>
                                {s.sub && <div className="legal-viz-flow-sub">{s.sub}</div>}
                            </div>
                            {i < steps.length - 1 && (
                                <div className="legal-viz-flow-arrow" aria-hidden>
                                    <ArrowRight size={13} strokeWidth={1.8} />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
            {caption && <p className="legal-viz-flow-caption">{caption}</p>}
        </div>
    );
}

/* ════════════════════════════════════════════════════════════════
   5. LADDER — escada de proporcionalidade (sanções, escalações)
   ════════════════════════════════════════════════════════════════ */
export function LegalLadder({ steps, caption }) {
    return (
        <div className="legal-viz-ladder not-prose" data-testid="legal-viz-ladder">
            {steps.map((s, i) => {
                const Icon = s.icon;
                const intensity = ((i + 1) / steps.length) * 100;
                return (
                    <div key={i} className="legal-viz-ladder-row">
                        <div className="legal-viz-ladder-step">
                            <span className="legal-viz-ladder-num">{String(i + 1).padStart(2, "0")}</span>
                        </div>
                        <div className="legal-viz-ladder-bar-wrap">
                            <div
                                className="legal-viz-ladder-bar"
                                style={{ width: `${intensity}%` }}
                            />
                        </div>
                        <div className="legal-viz-ladder-content">
                            <div className="legal-viz-ladder-label">
                                {Icon ? <Icon size={13} strokeWidth={1.8} /> : null}
                                <span>{s.label}</span>
                            </div>
                            {s.desc && <div className="legal-viz-ladder-desc">{s.desc}</div>}
                        </div>
                    </div>
                );
            })}
            {caption && <p className="legal-viz-ladder-caption">{caption}</p>}
        </div>
    );
}

/* ════════════════════════════════════════════════════════════════
   6. RIGHTS GRID — direitos RGPD em cartões ilustrados
   ════════════════════════════════════════════════════════════════ */
export function LegalRightsGrid({ items }) {
    return (
        <div className="legal-viz-rights not-prose" data-testid="legal-viz-rights">
            {items.map((it, i) => {
                const Icon = it.icon;
                return (
                    <div key={i} className="legal-viz-right">
                        <div className="legal-viz-right-icon">
                            {Icon ? <Icon size={15} strokeWidth={1.7} /> : null}
                        </div>
                        <div className="legal-viz-right-body">
                            <div className="legal-viz-right-title">{it.title}</div>
                            <div className="legal-viz-right-desc">{it.desc}</div>
                            {it.ref && <div className="legal-viz-right-ref">{it.ref}</div>}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

/* ════════════════════════════════════════════════════════════════
   7. DATA MAP — mapa visual das categorias de dados
   ════════════════════════════════════════════════════════════════ */
export function LegalDataMap({ items }) {
    return (
        <div className="legal-viz-datamap not-prose" data-testid="legal-viz-datamap">
            {items.map((it, i) => {
                const Icon = it.icon;
                return (
                    <div key={i} className="legal-viz-datacard" data-tone={it.tone || "neutral"}>
                        <div className="legal-viz-datacard-head">
                            <div className="legal-viz-datacard-icon">
                                {Icon ? <Icon size={13} strokeWidth={1.8} /> : null}
                            </div>
                            <div className="legal-viz-datacard-title">{it.title}</div>
                        </div>
                        <div className="legal-viz-datacard-examples">{it.examples}</div>
                    </div>
                );
            })}
        </div>
    );
}

/* ════════════════════════════════════════════════════════════════
   8. TIMELINE — eixo de períodos de conservação
   ════════════════════════════════════════════════════════════════ */
export function LegalTimeline({ items, caption }) {
    return (
        <div className="legal-viz-timeline not-prose" data-testid="legal-viz-timeline">
            <div className="legal-viz-timeline-axis" aria-hidden />
            {items.map((it, i) => (
                <div key={i} className="legal-viz-timeline-row">
                    <div className="legal-viz-timeline-dot" data-tone={it.tone || "neutral"} aria-hidden />
                    <div className="legal-viz-timeline-meta">
                        <div className="legal-viz-timeline-when">{it.when}</div>
                        <div className="legal-viz-timeline-what">{it.what}</div>
                        {it.note && <div className="legal-viz-timeline-note">{it.note}</div>}
                    </div>
                </div>
            ))}
            {caption && <p className="legal-viz-timeline-caption">{caption}</p>}
        </div>
    );
}

/* ════════════════════════════════════════════════════════════════
   9. ICON GRID — listas de proibições / condutas visualizadas
   ════════════════════════════════════════════════════════════════ */
export function LegalIconGrid({ items, tone = "danger" }) {
    return (
        <div className={`legal-viz-icongrid legal-viz-icongrid--${tone} not-prose`} data-testid="legal-viz-icongrid">
            {items.map((it, i) => {
                const Icon = it.icon;
                return (
                    <div key={i} className="legal-viz-icongrid-item">
                        <div className="legal-viz-icongrid-icon">
                            {Icon ? <Icon size={14} strokeWidth={1.8} /> : null}
                        </div>
                        <div className="legal-viz-icongrid-body">
                            <div className="legal-viz-icongrid-label">{it.label}</div>
                            {it.ref && <div className="legal-viz-icongrid-ref">{it.ref}</div>}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

/* ════════════════════════════════════════════════════════════════
   10. COOKIE STACK — categorias de cookies visualmente empilhadas
   ════════════════════════════════════════════════════════════════ */
export function LegalCookieStack({ items }) {
    return (
        <div className="legal-viz-cookiestack not-prose" data-testid="legal-viz-cookiestack">
            {items.map((it, i) => {
                const Icon = it.icon;
                return (
                    <div key={i} className="legal-viz-cookie" data-required={it.required ? "1" : "0"}>
                        <div className="legal-viz-cookie-strip" aria-hidden />
                        <div className="legal-viz-cookie-body">
                            <div className="legal-viz-cookie-head">
                                <div className="legal-viz-cookie-icon">
                                    {Icon ? <Icon size={13} strokeWidth={1.8} /> : null}
                                </div>
                                <div className="legal-viz-cookie-title">{it.title}</div>
                                {it.required ? (
                                    <span className="legal-viz-cookie-flag is-needed">Sempre ativo</span>
                                ) : (
                                    <span className="legal-viz-cookie-flag">Requer consentimento</span>
                                )}
                            </div>
                            <p className="legal-viz-cookie-desc">{it.desc}</p>
                            {it.examples && (
                                <p className="legal-viz-cookie-examples">
                                    <strong>Exemplos:</strong> {it.examples}
                                </p>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

/* ════════════════════════════════════════════════════════════════
   11. REPORT FLOW — fluxo "Reportar → Triagem → Decisão → Recurso"
   ════════════════════════════════════════════════════════════════ */
export function LegalReportFlow({ steps }) {
    return (
        <div className="legal-viz-reportflow not-prose" data-testid="legal-viz-reportflow">
            {steps.map((s, i) => {
                const Icon = s.icon;
                return (
                    <div key={i} className="legal-viz-reportflow-step">
                        <div className="legal-viz-reportflow-marker">
                            <div className="legal-viz-reportflow-circle">
                                {Icon ? <Icon size={14} strokeWidth={1.8} /> : null}
                            </div>
                            {i < steps.length - 1 && <div className="legal-viz-reportflow-line" />}
                        </div>
                        <div className="legal-viz-reportflow-content">
                            <div className="legal-viz-reportflow-title">
                                <span className="legal-viz-reportflow-step-num">{String(i + 1).padStart(2, "0")}</span>
                                {s.title}
                            </div>
                            <p className="legal-viz-reportflow-desc">{s.desc}</p>
                            {s.meta && <p className="legal-viz-reportflow-meta">{s.meta}</p>}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

/* ════════════════════════════════════════════════════════════════
   12. COMPLIANCE BOARD — matriz de cumprimento legal
   ════════════════════════════════════════════════════════════════ */
export function LegalComplianceBoard({ items }) {
    return (
        <div className="legal-viz-compliance not-prose" data-testid="legal-viz-compliance">
            {items.map((it, i) => (
                <div key={i} className="legal-viz-compliance-row">
                    <div className="legal-viz-compliance-dot" aria-hidden />
                    <div className="legal-viz-compliance-name">{it.name}</div>
                    <div className="legal-viz-compliance-scope">{it.scope}</div>
                    {it.ref && <div className="legal-viz-compliance-ref">{it.ref}</div>}
                </div>
            ))}
        </div>
    );
}

/* — Ícone helpers re-exportados (para uso direto nas páginas) — */
export const VIZ_ICONS = {
    Scale, ShieldCheck, CookieIcon, FileText, Sparkle,
    Flag, AlertTriangle, EyeOff, Trash2, UserX, BadgeCheck,
    User, Database, Server, Building2, Gavel, ArrowRight,
    Lock, Key, Download, Edit3, Ban, RefreshCw, MessageCircle,
    Fingerprint, Globe, Monitor, MousePointerClick, MapPin, Mail,
    Heart, Brain, Megaphone, Clock, Calendar, BookOpen, FileCheck,
    AlertCircle, Slash, ShieldAlert, ShieldOff,
};
