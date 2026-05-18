import { useEffect, useState } from "react";
import { api } from "../lib/api";
import { isATardeWindow, isBoaNoiteHour } from "../lib/ptCulture";
import { CalendarPTBanner, ATardeBanner } from "./PTBanners";

/**
 * Single-source-of-truth daily context banner.
 *
 * Priority (only ONE renders at a time, never both):
 *   1. Calendar PT event (today/tomorrow) — most contextual
 *   2. A Tarde digest (evening window or "missed" fallback)
 *
 * If neither is relevant, renders nothing — keeps the feed clean.
 */
export function SmartTodayBanner() {
    const [decision, setDecision] = useState("loading"); // "loading" | "calendar" | "tarde" | "none"

    useEffect(() => {
        let cancelled = false;
        (async () => {
            // 1. Try calendar event first
            try {
                const { data } = await api.get("/calendar/pt");
                const today = data?.today;
                if (today) {
                    const key = `vm_cal_dismiss_${today.key}_${new Date().toISOString().slice(0, 10)}`;
                    if (localStorage.getItem(key) !== "1") {
                        if (!cancelled) setDecision("calendar");
                        return;
                    }
                }
            } catch { /* silent */ }

            // 2. Fallback to A Tarde digest if in window and not dismissed
            if (cancelled) return;
            const today = new Date().toISOString().slice(0, 10);
            const dismissed = localStorage.getItem(`vm_tarde_dismiss_${today}`) === "1";
            const inWindow = isATardeWindow() || (new Date().getHours() >= 22 || new Date().getHours() < 6);
            if (!dismissed && inWindow && !isBoaNoiteHour()) {
                if (!cancelled) setDecision("tarde");
                return;
            }

            if (!cancelled) setDecision("none");
        })();
        return () => { cancelled = true; };
    }, []);

    if (decision === "loading" || decision === "none") return null;
    if (decision === "calendar") return <CalendarPTBanner />;
    if (decision === "tarde") return <ATardeBanner />;
    return null;
}
