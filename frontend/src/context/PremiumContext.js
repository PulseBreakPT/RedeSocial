import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api } from "../lib/api";
import { useAuth } from "./AuthContext";
import { useWsMessages } from "../components/WebSocketProvider";

/**
 * PremiumContext — estado premium do Lusorae, SEMPRE resolvido server-side.
 *
 * O frontend nunca decide o plano: lê /premium/status e reflete-o. Mantém-se
 * fresco em tempo real via o evento WS `entitlements_updated` (emitido pelo
 * backend quando um webhook do Stripe muda a subscrição). `has(key)` serve
 * só para UI — o gating real é validado no servidor em cada endpoint.
 */
const PremiumContext = createContext(null);

const DEFAULT = {
    plan: "free",
    is_premium: false,
    status: "none",
    entitlements: {},
    tiers: { plus: { month: 4.99, year: 49.99 }, aura: { month: 9.99, year: 99.99 } },
    billing_available: false,
};

export function PremiumProvider({ children }) {
    const { user } = useAuth();
    const [premium, setPremium] = useState(DEFAULT);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async () => {
        if (!user) { setPremium(DEFAULT); setLoading(false); return; }
        try {
            const { data } = await api.get("/premium/status");
            setPremium({ ...DEFAULT, ...data });
        } catch { /* ambiental */ } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => { refresh(); }, [refresh]);

    // Sync em tempo real (downgrade/upgrade/falha de pagamento).
    const onWs = useCallback((msg) => {
        if (msg && msg.type === "entitlements_updated" && msg.premium) {
            setPremium((prev) => ({ ...prev, ...msg.premium }));
        }
    }, []);
    useWsMessages(onWs);

    const has = useCallback((key) => !!(premium.entitlements && premium.entitlements[key]), [premium]);

    const checkout = useCallback(async (plan, interval = "month") => {
        const { data } = await api.post("/premium/checkout", { plan, interval });
        if (data && data.url) window.location.href = data.url;
    }, []);

    const openPortal = useCallback(async () => {
        const { data } = await api.post("/premium/portal", {});
        if (data && data.url) window.location.href = data.url;
    }, []);

    const restore = useCallback(async () => {
        try { const { data } = await api.post("/premium/restore", {}); setPremium((p) => ({ ...p, ...data })); } catch { /* */ }
    }, []);

    const value = {
        ...premium,
        loading,
        isPremium: premium.plan !== "free",
        isAura: premium.plan === "aura",
        isPlus: premium.plan === "plus",
        has,
        refresh,
        checkout,
        openPortal,
        restore,
    };
    return <PremiumContext.Provider value={value}>{children}</PremiumContext.Provider>;
}

export function usePremium() {
    const ctx = useContext(PremiumContext);
    if (!ctx) throw new Error("usePremium must be used within PremiumProvider");
    return ctx;
}

export default PremiumContext;
