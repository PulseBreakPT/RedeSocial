import React, { useEffect, useState } from "react";
import { AlertTriangle, Info, AlertOctagon, X } from "lucide-react";
import { usePublicSettings } from "../context/PublicSettingsContext";

/**
 * AnnouncementBanner — site-wide notice controlled by admin via Settings.
 *  Shows only when `announcement_banner_text` is non-empty.
 *  Level drives icon + color: info | warning | critical.
 *  Dismissible per browser tab (persists in sessionStorage keyed by hash of the text).
 */

function hashCode(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = ((h << 5) - h) + s.charCodeAt(i) | 0;
    return Math.abs(h).toString(36);
}

const LEVEL_STYLES = {
    info: {
        bg: "bg-sky-50",
        border: "border-sky-200",
        text: "text-sky-900",
        accent: "text-sky-600",
        Icon: Info,
    },
    warning: {
        bg: "bg-amber-50",
        border: "border-amber-200",
        text: "text-amber-900",
        accent: "text-amber-600",
        Icon: AlertTriangle,
    },
    critical: {
        bg: "bg-red-50",
        border: "border-red-200",
        text: "text-red-900",
        accent: "text-red-600",
        Icon: AlertOctagon,
    },
};

export function AnnouncementBanner() {
    const { settings } = usePublicSettings();
    const text = (settings?.announcement_banner_text || "").trim();
    const level = settings?.announcement_banner_level || "info";
    const key = text ? `dismissed_banner_${hashCode(text + level)}` : "";
    const [dismissed, setDismissed] = useState(false);

    // Reset dismissal whenever banner text changes
    useEffect(() => {
        if (!text) {
            setDismissed(false);
            return;
        }
        try {
            setDismissed(sessionStorage.getItem(key) === "1");
        } catch {
            setDismissed(false);
        }
    }, [text, key]);

    if (!text || dismissed) return null;

    const { bg, border, text: textCls, accent, Icon } = LEVEL_STYLES[level] || LEVEL_STYLES.info;

    const dismiss = () => {
        try { sessionStorage.setItem(key, "1"); } catch { /* ignore */ }
        setDismissed(true);
    };

    return (
        <div
            className={`w-full ${bg} ${border} border-b ${textCls} px-4 py-2 text-[13px] flex items-center gap-2 z-30`}
            role={level === "critical" ? "alert" : "status"}
            aria-live={level === "critical" ? "assertive" : "polite"}
            data-testid="announcement-banner"
            data-level={level}
        >
            <Icon size={15} className={`shrink-0 ${accent}`} aria-hidden />
            <span className="flex-1 min-w-0 leading-tight">{text}</span>
            <button
                type="button"
                onClick={dismiss}
                className={`shrink-0 -mr-1 p-1 rounded-md hover:bg-black/[0.05] ${accent}`}
                aria-label="Fechar anúncio"
                data-testid="announcement-banner-close"
            >
                <X size={14} />
            </button>
        </div>
    );
}

export default AnnouncementBanner;
