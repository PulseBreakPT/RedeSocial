import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Cookie, X, ShieldCheck, ChevronRight } from "lucide-react";

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
    const [open, setOpen] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const [prefs, setPrefs] = useState(DEFAULT_PREFS);

    useEffect(() => {
        const existing = readConsent();
        if (!existing) {
            setOpen(true);
        } else {
            setPrefs({ ...DEFAULT_PREFS, ...existing.prefs });
        }
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
    }, []);

    const rejectAll = useCallback(() => {
        const p = { necessary: true, functional: false, analytics: false, marketing: false };
        writeConsent(p, "reject_all");
        setPrefs(p);
        setOpen(false);
    }, []);

    const saveCustom = useCallback(() => {
        writeConsent(prefs, "custom");
        setOpen(false);
    }, [prefs]);

    const togglePref = (key) => {
        if (key === "necessary") return; // immutable
        setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
    };

    if (!open) return null;

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cookie-banner-title"
            className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center pointer-events-none"
        >
            {/* Backdrop only when "details" mode (full modal) */}
            {showDetails && (
                <button
                    type="button"
                    aria-label="Fechar"
                    onClick={() => setShowDetails(false)}
                    className="absolute inset-0 bg-black/40 backdrop-blur-[2px] pointer-events-auto animate-fade-in"
                />
            )}

            <div
                className={`pointer-events-auto bg-white text-black shadow-[0_24px_64px_-12px_rgba(0,0,0,0.30)] ring-1 ring-black/[0.08] ${
                    showDetails
                        ? "w-full max-w-[640px] mx-3 sm:mx-4 mb-3 sm:mb-0 rounded-2xl max-h-[88vh] overflow-y-auto"
                        : "w-full sm:max-w-[760px] sm:mx-4 mb-3 sm:mb-6 rounded-2xl"
                }`}
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
                            Os teus dados, as tuas escolhas
                        </h2>
                        <p className="mt-1 text-[13px] text-black/65 leading-relaxed">
                            Usamos cookies estritamente necessários para o Vermillion funcionar. Com o teu consentimento,
                            usamos também cookies funcionais, analíticos e de marketing para melhorar a experiência.{" "}
                            <Link to="/legal/cookies" className="underline underline-offset-2 hover:text-black">
                                Saber mais
                            </Link>
                            .
                        </p>
                    </div>
                    {showDetails && (
                        <button
                            type="button"
                            onClick={() => setShowDetails(false)}
                            aria-label="Voltar"
                            className="w-8 h-8 rounded-full grid place-items-center text-black/60 hover:bg-black/[0.05] tap-shrink"
                        >
                            <X size={16} />
                        </button>
                    )}
                </div>

                {/* Details */}
                {showDetails && (
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
                                Tratamento conforme RGPD e Lei n.º 41/2004. Podes alterar estas escolhas a qualquer momento
                                em <Link to="/legal/cookies" className="underline underline-offset-2">Política de Cookies</Link>.
                            </span>
                        </p>
                    </div>
                )}

                {/* Actions */}
                <div className="px-5 pt-3 pb-5 flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between border-t border-black/[0.04]">
                    {!showDetails ? (
                        <button
                            type="button"
                            onClick={() => setShowDetails(true)}
                            data-testid="cookie-customize"
                            className="text-[13px] font-medium text-black/70 hover:text-black inline-flex items-center gap-1 self-start"
                        >
                            Personalizar
                            <ChevronRight size={14} />
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={saveCustom}
                            data-testid="cookie-save"
                            className="text-[13px] font-medium text-black/70 hover:text-black self-start"
                        >
                            Guardar escolhas
                        </button>
                    )}
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
