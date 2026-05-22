import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import axios from "axios";

/**
 * PublicSettingsContext — surfaces admin-controlled site settings to the whole app.
 *
 *   • Fetches GET /api/public/settings on mount.
 *   • Polls every 60s so admin changes propagate without a full reload.
 *   • Side-effects (run inside the provider — outside React strict-mode flicker):
 *       - document.title := `${platform_name}` (fallback "Lusorae")
 *       - <link rel=icon> :=  favicon_url  (if non-empty)
 *       - <meta name=description> := seo_default_description (if non-empty)
 *       - <html style="--brand-primary: ...; --brand-accent: ..."> (when non-empty)
 *
 *  Consumers:
 *       - usePublicSettings() → full settings object + reload()
 *       - AnnouncementBanner (in the Layout) reads `announcement_banner_text/level`
 *       - Footer / login pages read social links + legal info
 */

const API_BASE = (process.env.REACT_APP_BACKEND_URL || "").replace(/\/$/, "");
const POLL_INTERVAL_MS = 60_000;

const DEFAULTS = {
    platform_name: "Lusorae",
    platform_tagline: "",
    support_email: "",
    announcement_banner_text: "",
    announcement_banner_level: "info",
    welcome_message: "",
    terms_url: "",
    privacy_url: "",
    maintenance_message: "",
    signup_open: true,
    read_only_mode: false,
    link_previews_enabled: true,
    logo_url: "",
    favicon_url: "",
    og_image_url: "",
    primary_color: "",
    accent_color: "",
    seo_default_description: "",
    legal_company_name: "",
    legal_company_vat: "",
    legal_company_address: "",
    legal_company_country: "",
    default_locale: "pt-PT",
    default_timezone: "Europe/Lisbon",
    default_theme: "auto",
    tos_version: "1.0",
    min_app_version: "",
    footer_text: "",
    twitter_url: "",
    instagram_url: "",
    youtube_url: "",
    discord_url: "",
    github_url: "",
    linkedin_url: "",
    notification_retention_days: 90,
};

const PublicSettingsContext = createContext({
    settings: DEFAULTS,
    loaded: false,
    reload: () => {},
});

function applySideEffects(s) {
    try {
        // 1. Document title
        const name = (s.platform_name || "Lusorae").trim();
        if (name) {
            // Keep page-specific suffix if already set ("Title · Name")
            const cur = document.title || "";
            const dot = " · ";
            if (cur.includes(dot)) {
                const head = cur.split(dot)[0];
                document.title = `${head}${dot}${name}`;
            } else if (cur !== name) {
                document.title = name;
            }
        }
        // 2. Favicon
        if (s.favicon_url) {
            let link = document.querySelector('link[rel="icon"]');
            if (!link) {
                link = document.createElement("link");
                link.rel = "icon";
                document.head.appendChild(link);
            }
            if (link.href !== s.favicon_url) link.href = s.favicon_url;
        }
        // 3. Meta description
        if (s.seo_default_description) {
            let meta = document.querySelector('meta[name="description"]');
            if (!meta) {
                meta = document.createElement("meta");
                meta.name = "description";
                document.head.appendChild(meta);
            }
            if (meta.content !== s.seo_default_description) {
                meta.content = s.seo_default_description;
            }
        }
        // 4. OG image
        if (s.og_image_url) {
            let og = document.querySelector('meta[property="og:image"]');
            if (!og) {
                og = document.createElement("meta");
                og.setAttribute("property", "og:image");
                document.head.appendChild(og);
            }
            if (og.content !== s.og_image_url) og.content = s.og_image_url;
        }
        // 5. CSS vars for branding (only when non-empty + valid-looking)
        const root = document.documentElement;
        const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
        if (s.primary_color && HEX.test(s.primary_color)) {
            root.style.setProperty("--brand-primary", s.primary_color);
        }
        if (s.accent_color && HEX.test(s.accent_color)) {
            root.style.setProperty("--brand-accent", s.accent_color);
        }
        // 6. Lang attribute
        if (s.default_locale && /^[a-z]{2}(-[A-Z]{2})?$/.test(s.default_locale)) {
            root.setAttribute("lang", s.default_locale);
        }
    } catch {
        /* never throw from side-effects */
    }
}

export function PublicSettingsProvider({ children }) {
    const [settings, setSettings] = useState(DEFAULTS);
    const [loaded, setLoaded] = useState(false);

    const fetchSettings = useCallback(async () => {
        try {
            const res = await axios.get(`${API_BASE}/api/public/settings`, {
                timeout: 8000,
                withCredentials: false,
            });
            const data = res.data || {};
            const merged = { ...DEFAULTS, ...data };
            setSettings(merged);
            applySideEffects(merged);
            setLoaded(true);
        } catch {
            // Silent fail — use defaults. Settings endpoint is non-critical.
            setLoaded(true);
        }
    }, []);

    useEffect(() => {
        fetchSettings();
        const t = setInterval(fetchSettings, POLL_INTERVAL_MS);
        return () => clearInterval(t);
    }, [fetchSettings]);

    const value = useMemo(() => ({
        settings,
        loaded,
        reload: fetchSettings,
    }), [settings, loaded, fetchSettings]);

    return (
        <PublicSettingsContext.Provider value={value}>
            {children}
        </PublicSettingsContext.Provider>
    );
}

export function usePublicSettings() {
    return useContext(PublicSettingsContext);
}

export default PublicSettingsContext;
