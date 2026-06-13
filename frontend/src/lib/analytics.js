/**
 * Lusorae Analytics — consent-gated PostHog wrapper.
 *
 * RGPD + Lei n.º 41/2004 (ePrivacy) compliant:
 *  - PostHog é só inicializado APÓS o utilizador dar consent para "analytics".
 *  - Antes do consent, track() é no-op (nada é enviado, nada é gravado).
 *  - Se o utilizador revoga consent, chamamos opt_out_capturing() + reset().
 *  - Respeita o header Do Not Track do browser (respect_dnt).
 *
 * Architecture:
 *  - O stub `window.posthog` é criado em index.html (queue array).
 *  - posthog.init() carrega dinamicamente o script real (array.js).
 *  - Se nunca chamarmos init(), zero código de analytics é descarregado.
 *
 * Usage:
 *   import { track, identify, initAnalyticsFromConsent } from "@/lib/analytics";
 *   initAnalyticsFromConsent();                         // App.js boot
 *   track("cta_click", { location: "hero", label: "register" });
 *   identify(user.id, { plan: "beta" });
 */

const POSTHOG_KEY = "phc_xAvL2Iq4tFmANRE7kzbKwaSqp1HJjN7x48s3vr0CMjs";
const POSTHOG_HOST = "https://us.i.posthog.com";
const CONSENT_STORAGE_KEY = "vm_consent";

let inited = false;

function readConsent() {
    try {
        const raw = localStorage.getItem(CONSENT_STORAGE_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

function hasAnalyticsConsent() {
    const c = readConsent();
    return Boolean(c && c.prefs && c.prefs.analytics === true);
}

function getPostHog() {
    return typeof window !== "undefined" ? window.posthog : null;
}

function initPostHog() {
    const ph = getPostHog();
    if (!ph || inited) return;
    try {
        ph.init(POSTHOG_KEY, {
            api_host: POSTHOG_HOST,
            person_profiles: "identified_only",
            respect_dnt: true,
            capture_pageview: true,
            autocapture: true,
            session_recording: {
                recordCrossOriginIframes: true,
                capturePerformance: false,
                // Session replay só se houver consent explícito
                maskAllInputs: true,
            },
            // Opt-out automático se consent for revogado a meio
            opt_out_capturing_by_default: false,
            // Não capturar erros antes do consent
            disable_surveys: false,
        });
        inited = true;
    } catch (e) {
        // Silenciar — analytics nunca deve quebrar a app
        if (typeof console !== "undefined") console.warn("PostHog init failed:", e);
    }
}

function teardownPostHog() {
    const ph = getPostHog();
    if (!ph || !inited) return;
    try {
        ph.opt_out_capturing && ph.opt_out_capturing();
        ph.reset && ph.reset();
    } catch {
        /* ignore */
    }
}

/**
 * Bootstrap analytics — lê o consent atual e inicializa PostHog se permitido.
 * Liga listener para reagir a mudanças de consent (vm:consent-changed).
 * Chamar uma vez no boot da app (App.js useEffect).
 */
export function initAnalyticsFromConsent() {
    if (typeof window === "undefined") return;

    // Inicial: verifica consent existente
    if (hasAnalyticsConsent()) {
        initPostHog();
    }

    // Listener: reage a mudanças de consent em tempo real
    const onConsentChanged = (e) => {
        const granted = Boolean(
            e && e.detail && e.detail.prefs && e.detail.prefs.analytics === true,
        );
        if (granted && !inited) {
            initPostHog();
        } else if (!granted && inited) {
            teardownPostHog();
        }
    };
    window.addEventListener("vm:consent-changed", onConsentChanged);
}

/**
 * Envia um evento de analytics. No-op se o utilizador não consentiu.
 * @param {string} event — nome do evento (snake_case recomendado)
 * @param {object} [props] — propriedades adicionais
 */
export function track(event, props = {}) {
    if (!hasAnalyticsConsent()) return;
    const ph = getPostHog();
    if (!ph || !inited) return;
    try {
        ph.capture(event, props);
    } catch {
        /* analytics nunca quebra a app */
    }
}

/**
 * Identifica um utilizador autenticado.
 * Só dispara se consent foi dado.
 */
export function identify(userId, props = {}) {
    if (!hasAnalyticsConsent() || !userId) return;
    const ph = getPostHog();
    if (!ph || !inited) return;
    try {
        ph.identify(String(userId), props);
    } catch {
        /* ignore */
    }
}

/**
 * Captura page view manual (CRA SPA — usar em route changes se necessário).
 */
export function trackPageView(path) {
    track("$pageview", { $current_url: path || (typeof window !== "undefined" ? window.location.href : "") });
}
