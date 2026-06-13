// =============================================================================
// Lusorae — Service Worker para Web Push (FASE 3)
// =============================================================================
// Lida com 3 coisas: push, notificationclick, pushsubscriptionchange.
// Mantido simples — sem cache offline (deixamos para Workbox numa fase futura).
// =============================================================================

self.addEventListener("install", (event) => {
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
    let payload = { title: "Lusorae", body: "Tens uma nova notificação.", url: "/notifications" };
    try {
        if (event.data) {
            payload = { ...payload, ...event.data.json() };
        }
    } catch (e) {
        try {
            const text = event.data && event.data.text();
            if (text) payload.body = text;
        } catch {}
    }

    const title = payload.title || "Lusorae";
    const options = {
        body: payload.body || "",
        icon: payload.icon || "/android-chrome-192x192.png",
        badge: "/favicon-32x32.png",
        tag: payload.tag || "lusorae",
        renotify: true,
        data: { url: payload.url || "/" },
    };
    event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
    event.notification.close();
    const url = (event.notification.data && event.notification.data.url) || "/";
    event.waitUntil(
        clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
            for (const win of wins) {
                try {
                    const u = new URL(win.url);
                    if (u.pathname === url || u.href.endsWith(url)) {
                        return win.focus();
                    }
                } catch {}
            }
            return clients.openWindow(url);
        })
    );
});
