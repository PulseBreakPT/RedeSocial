import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Cookie, X, ShieldCheck, ChevronRight } from "lucide-react";
import { track } from "../lib/analytics";

/**
 * CookieBanner — RGPD + Lei n.º 41/2004 (ePrivacy) compliant.
 *
 * Rules:
 *  - Default: NO non-essential cookies set (Diretrizes CNPD 2022/1).
 *  - Equal prominence between "Aceitar todos" and "Rejeitar todos".
 *  - Granular categories with toggles.
 *  - Consent stored with version + timestamp in localStorage.
 *  - Re-prompt after 12 months OR version bump.
 *  - openCookiePreferences() exported so other parts of the app
 *    (footer link, privacy/cookies page) can re-open the modal.
 */

const STORAGE_KEY = "vm_consent";
const CONSENT_VERSION = 1;
const REPROMPT_AFTER_DAYS = 365;

const DEFAULT_PREFS = {
    necessary: true, // cannot be disabled
    functional: false,
    analytics: false,
    marketing: false,
};

function readConsent() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || parsed.version !== CONSENT_VERSION) return null;
        const ts = parsed.timestamp ? new Date(parsed.timestamp).getTime() : 0;
        const age = (Date.now() - ts) / (1000 * 60 * 60 * 24);
        if (age > REPROMPT_AFTER_DAYS) return null;
        return parsed;
    } catch {
        return null;
    }
}

function writeConsent(prefs, mode) {
    const payload = {
        version: CONSENT_VERSION,
        timestamp: new Date().toISOString(),
        mode, // "accept_all" | "reject_all" | "custom"
        prefs: { ...prefs, necessary: true },
    };
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
        // localStorage may be disabled; consent will be re-prompted next session.
    }
    // Optional: notify other parts of the app
    try {
        window.dispatchEvent(new CustomEvent("vm:consent-changed", { detail: payload }));
    } catch {
        // ignore
    }
    return payload;
}

// Public helper — used by footer links and policy pages.
export function openCookiePreferences() {
    try {
        window.dispatchEvent(new CustomEvent("vm:open-cookie-prefs"));
    } catch {
        // ignore
    }
}

export function CookieBanner() {
    // Lazy initialização — lê localStorage e decide estado inicial UMA vez,
    // sem precisar de setState dentro de useEffect (cumpre regra
    // react-hooks/set-state-in-effect).
    const initial = (() => {
        if (typeof window === "undefined") {
            return { open: false, prefs: DEFAULT_PREFS };
        }
        const isAdminRoute = (window.location.pathname || "").startsWith("/admin");
        const existing = readConsent();
        if (isAdminRoute) {
            return {
                open: false,
                prefs: existing ? { ...DEFAULT_PREFS, ...existing.prefs } : DEFAULT_PREFS,
            };
        }
        if (!existing) return { open: true, prefs: DEFAULT_PREFS };
        return { open: false, prefs: { ...DEFAULT_PREFS, ...existing.prefs } };
    })();

    const [open, setOpen] = useState(initial.open);
    const [showDetails, setShowDetails] = useState(false);
    const [prefs, setPrefs] = useState(initial.prefs);

    useEffect(() => {
        // Listener para re-abrir o banner via openCookiePreferences() — usado
        // por links no footer e na página Cookies.
        const onOpen = () => {
            const cur = readConsent();
            if (cur) setPrefs({ ...DEFAULT_PREFS, ...cur.prefs });
            setShowDetails(true);
            setOpen(true);
        };
        window.addEventListener("vm:open-cookie-prefs", onOpen);
        return () => window.removeEventListener("vm:open-cookie-prefs", onOpen);
    }, []);

    const acceptAll = useCallback(() => {
        const p = { necessary: true, functional: true, analytics: true, marketing: true };
        writeConsent(p, "accept_all");
        setPrefs(p);
        setOpen(false);
        // O `vm:consent-changed` event vai inicializar o PostHog; este track
        // só dispara depois da próxima volta porque o init é assíncrono.
        // Para garantir captura imediata, deixamos o listener tomar conta.
        setTimeout(() => track("consent_decision", { mode: "accept_all" }), 50);
    }, []);

    const rejectAll = useCallback(() => {
        const p = { necessary: true, functional: false, analytics: false, marketing: false };
        writeConsent(p, "reject_all");
        setPrefs(p);
        setOpen(false);
        // Aqui não há track — utilizador rejeitou analytics.
    }, []);

    const saveCustom = useCallback(() => {
        writeConsent(prefs, "custom");
        setOpen(false);
        if (prefs.analytics) {
            setTimeout(() => track("consent_decision", { mode: "custom", analytics: true }), 50);
        }
    }, [prefs]);

    const togglePref = (key) => {
        if (key === "necessary") return; // immutable
        setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    if (!open) return null;

    // === DETAILS MODE — centered modal with backdrop (granular settings) ===
    if (showDetails) {
        return (
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="cookie-banner-title"
                className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center pointer-events-none"
            >
                <button
                    type="button"
                    aria-label="Fechar"
                    onClick={() => setShowDetails(false)}
                    className="absolute inset-0 bg-black/40 backdrop-blur-[2px] pointer-events-auto animate-fade-in"
                />
                <div
                    className="pointer-events-auto bg-white text-black shadow-[0_24px_64px_-12px_rgba(0,0,0,0.30)] ring-1 ring-black/[0.08] w-full max-w-[640px] mx-3 sm:mx-4 mb-3 sm:mb-0 rounded-2xl max-h-[88vh] overflow-y-auto"
                    data-testid="cookie-banner"
                >
                    {/* Header */}
                    <div className="flex items-start gap-3.5 px-5 pt-5 pb-3">
                        <div className="w-10 h-10 rounded-full bg-black/[0.04] grid place-items-center shrink-0">
                            <Cookie size={18} strokeWidth={1.7} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h2
                                id="cookie-banner-title"
                                className="font-display text-[17px] font-bold tracking-tight leading-tight"
                            >
                                Personalizar cookies
                            </h2>
                            <p className="mt-1 text-[13px] text-black/65 leading-relaxed">
                                Escolhe o que aceitas. Os essenciais ficam sempre ativos.{" "}
                                <Link to="/legal/cookies" className="underline underline-offset-2 hover:text-black">
                                    Saber mais
                                </Link>
                                .
                            </p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowDetails(false)}
                            aria-label="Voltar"
                            className="w-8 h-8 rounded-full grid place-items-center text-black/60 hover:bg-black/[0.05] tap-shrink"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {/* Granular categories */}
                    <div className="px-5 pb-2">
                        <div className="border-t border-black/[0.06] pt-3 space-y-2.5">
                            <CategoryRow
                                title="Estritamente necessários"
                                desc="Indispensáveis ao funcionamento da plataforma (autenticação, sessão, segurança). Não exigem consentimento."
                                checked={true}
                                disabled
                                onToggle={() => {}}
                                badge="Sempre ativo"
                            />
                            <CategoryRow
                                title="Funcionais"
                                desc="Memorizam preferências (tema, último filtro) para uma experiência mais fluida."
                                checked={prefs.functional}
                                onToggle={() => togglePref("functional")}
                            />
                            <CategoryRow
                                title="Analíticos"
                                desc="Métricas agregadas sobre como o serviço é utilizado, para melhorias e correção de erros."
                                checked={prefs.analytics}
                                onToggle={() => togglePref("analytics")}
                            />
                            <CategoryRow
                                title="Marketing"
                                desc="Apresentação de conteúdo publicitário relevante e medição da eficácia."
                                checked={prefs.marketing}
                                onToggle={() => togglePref("marketing")}
                            />
                        </div>
                        <p className="mt-3 text-[11px] text-black/55 leading-relaxed flex items-start gap-1.5">
                            <ShieldCheck size={12} className="mt-[2px] shrink-0 text-black/55" />
                            <span>
                                Podes alterar estas escolhas a qualquer momento
                                em <Link to="/legal/cookies" className="underline underline-offset-2">Política de Cookies</Link>.
                            </span>
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="px-5 pt-3 pb-5 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between border-t border-black/[0.04]">
                        <button
                            type="button"
                            onClick={saveCustom}
                            data-testid="cookie-save"
                            className="text-[13px] font-medium text-black/70 hover:text-black self-start"
                        >
                            Guardar escolhas
                        </button>
                        <div className="flex gap-2 w-full sm:w-auto">
                            <button
                                type="button"
                                onClick={rejectAll}
                                data-testid="cookie-reject"
                                className="flex-1 sm:flex-initial px-4 py-2 rounded-full text-[13px] font-medium bg-black/[0.05] text-black hover:bg-black/[0.09] active:scale-95 transition"
                            >
                                Rejeitar todos
                            </button>
                            <button
                                type="button"
                                onClick={acceptAll}
                                data-testid="cookie-accept"
                                className="flex-1 sm:flex-initial px-4 py-2 rounded-full text-[13px] font-medium text-white bg-black hover:bg-[#1a1a1a] active:scale-95 transition"
                            >
                                Aceitar todos
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // === COMPACT MODE — bottom thin bar (não cobre o hero, RGPD-compliant) ===
    return (
        <div
            role="dialog"
            aria-modal="false"
            aria-labelledby="cookie-banner-title-compact"
            className="fixed inset-x-0 bottom-0 sm:bottom-3 lg:bottom-4 z-[100] flex justify-center px-0 sm:px-3 lg:px-4 pointer-events-none"
        >
            <div
                className="pointer-events-auto bg-white text-black w-full sm:w-auto sm:max-w-[1040px] shadow-[0_18px_44px_-12px_rgba(0,0,0,0.22)] ring-1 ring-black/[0.08] rounded-t-2xl sm:rounded-2xl animate-slide-up-fade"
                data-testid="cookie-banner"
                style={{
                    paddingBottom: "max(env(safe-area-inset-bottom, 0px), 0px)",
                }}
            >
                <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-4 px-4 sm:px-5 py-3 sm:py-3.5">
                    {/* Icon + copy — desktop: inline; mobile: stacked */}
                    <div className="flex items-start gap-2.5 sm:items-center flex-1 min-w-0">
                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-black/[0.04] grid place-items-center shrink-0">
                            <Cookie size={15} strokeWidth={1.8} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p
                                id="cookie-banner-title-compact"
                                className="text-[12.5px] sm:text-[13px] leading-snug text-black/80"
                            >
                                <span className="font-semibold text-black">Cookies essenciais ativos.</span>{" "}
                                Aceitas analytics opcionais para melhorarmos a experiência?{" "}
                                <Link
                                    to="/legal/cookies"
                                    className="underline underline-offset-2 hover:text-black hidden sm:inline"
                                >
                                    Saber mais
                                </Link>
                            </p>
                        </div>
                    </div>

                    {/* Actions — desktop: inline row; mobile: 3-button grid */}
                    <div className="flex items-center gap-2 sm:gap-2 sm:shrink-0">
                        <button
                            type="button"
                            onClick={() => setShowDetails(true)}
                            data-testid="cookie-customize"
                            className="text-[12px] sm:text-[12.5px] font-medium text-black/65 hover:text-black inline-flex items-center gap-0.5 px-2 py-1.5 sm:px-1.5"
                        >
                            Personalizar
                            <ChevronRight size={13} className="hidden sm:inline" />
                        </button>
                        <button
                            type="button"
                            onClick={rejectAll}
                            data-testid="cookie-reject"
                            className="flex-1 sm:flex-initial px-3.5 py-2 sm:py-1.5 rounded-full text-[12.5px] sm:text-[12.5px] font-semibold bg-black/[0.05] text-black hover:bg-black/[0.09] active:scale-95 transition whitespace-nowrap"
                        >
                            Rejeitar
                        </button>
                        <button
                            type="button"
                            onClick={acceptAll}
                            data-testid="cookie-accept"
                            className="flex-1 sm:flex-initial px-4 py-2 sm:py-1.5 rounded-full text-[12.5px] sm:text-[12.5px] font-semibold text-white bg-black hover:bg-[#1a1a1a] active:scale-95 transition whitespace-nowrap"
                        >
                            Aceitar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function CategoryRow({ title, desc, checked, onToggle, disabled, badge }) {
    return (
        <div className="flex items-start gap-3 py-2">
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-[13px] tracking-tight text-black">{title}</h4>
                    {badge && (
                        <span className="text-[10px] uppercase tracking-[0.12em] text-black/55 font-mono bg-black/[0.04] px-1.5 py-0.5 rounded-full">
                            {badge}
                        </span>
                    )}
                </div>
                <p className="text-[12px] text-black/60 leading-snug mt-0.5">{desc}</p>
            </div>
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                aria-label={title}
                disabled={disabled}
                onClick={onToggle}
                className={`relative shrink-0 w-10 h-6 rounded-full transition ${
                    checked ? "bg-black" : "bg-black/[0.18]"
                } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
            >
                <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition ${
                        checked ? "translate-x-4" : "translate-x-0"
                    }`}
                />
            </button>
        </div>
    );
}
