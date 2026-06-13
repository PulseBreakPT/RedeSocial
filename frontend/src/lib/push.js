// =============================================================================
// Lusorae — Push Notifications (FASE 3)
// =============================================================================
// Helpers para subscrever / cancelar Web Push usando o SW registado.
// =============================================================================
import { api } from "./api";

function urlBase64ToUint8Array(base64String) {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
    const rawData = atob(base64);
    const arr = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; i++) arr[i] = rawData.charCodeAt(i);
    return arr;
}

export function pushIsSupported() {
    return (
        typeof window !== "undefined" &&
        "serviceWorker" in navigator &&
        "PushManager" in window &&
        "Notification" in window
    );
}

export function pushPermission() {
    if (!pushIsSupported()) return "unsupported";
    return Notification.permission; // "default" | "granted" | "denied"
}

export async function ensureServiceWorker() {
    if (!pushIsSupported()) throw new Error("Push não suportado neste browser.");
    const existing = await navigator.serviceWorker.getRegistration("/sw.js");
    if (existing) return existing;
    return navigator.serviceWorker.register("/sw.js");
}

export async function subscribePush() {
    if (!pushIsSupported()) throw new Error("Push não suportado.");

    // 1) pedir permissão (pode ser instantâneo se já estiver concedida)
    const perm = await Notification.requestPermission();
    if (perm !== "granted") throw new Error("Permissão negada.");

    // 2) garantir SW
    const reg = await ensureServiceWorker();
    await navigator.serviceWorker.ready;

    // 3) obter VAPID public key
    const { data } = await api.get("/push/vapid-public-key");
    if (!data?.publicKey) throw new Error("VAPID não configurado.");

    // 4) subscrever
    const existingSub = await reg.pushManager.getSubscription();
    const sub = existingSub || await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.publicKey),
    });

    // 5) enviar ao backend
    const payload = sub.toJSON();
    await api.post("/push/subscribe", {
        endpoint: payload.endpoint,
        keys: payload.keys || {},
    });
    return sub;
}

export async function unsubscribePush() {
    if (!pushIsSupported()) return false;
    const reg = await navigator.serviceWorker.getRegistration("/sw.js");
    if (!reg) return false;
    const sub = await reg.pushManager.getSubscription();
    if (!sub) return false;
    const payload = sub.toJSON();
    try {
        await api.delete("/push/subscribe", {
            data: { endpoint: payload.endpoint, keys: payload.keys || {} },
        });
    } catch {}
    await sub.unsubscribe();
    return true;
}

export async function isSubscribed() {
    if (!pushIsSupported()) return false;
    try {
        const reg = await navigator.serviceWorker.getRegistration("/sw.js");
        if (!reg) return false;
        const sub = await reg.pushManager.getSubscription();
        return !!sub;
    } catch {
        return false;
    }
}
