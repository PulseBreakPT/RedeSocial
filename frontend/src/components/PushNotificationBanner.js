// =============================================================================
// Lusorae — Push Notifications Banner (FASE 3)
// =============================================================================
// Pergunta ao utilizador se quer ligar notificações push. Discreto, dismissible.
// Mostra-se em Notifications page se permission === "default".
// =============================================================================
import { useEffect, useState } from "react";
import { Bell, BellOff, X } from "lucide-react";
import { toast } from "sonner";
import { PT } from "../theme/editorial";
import { pushIsSupported, pushPermission, subscribePush, isSubscribed } from "../lib/push";

const STORAGE_KEY = "lusorae_push_banner_dismissed_at";
const RECHECK_MS = 3 * 24 * 60 * 60 * 1000; // 3 dias

export function PushNotificationBanner() {
    const [show, setShow] = useState(false);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            if (!pushIsSupported()) return;
            if (pushPermission() !== "default") return;
            if (await isSubscribed()) return;
            try {
                const at = parseInt(localStorage.getItem(STORAGE_KEY) || "0", 10);
                if (at && Date.now() - at < RECHECK_MS) return;
            } catch { /* noop */ }
            if (!cancelled) setShow(true);
        })();
        return () => { cancelled = true; };
    }, []);

    const dismiss = () => {
        try { localStorage.setItem(STORAGE_KEY, String(Date.now())); } catch { /* noop */ }
        setShow(false);
    };

    const enable = async () => {
        setBusy(true);
        try {
            await subscribePush();
            toast.success("Notificações activadas. Vamos avisar-te quando importar.");
            setShow(false);
        } catch (e) {
            toast.error(e?.message || "Não foi possível activar as notificações.");
        } finally {
            setBusy(false);
        }
    };

    if (!show) return null;

    return (
        <div
            data-testid="push-notification-banner"
            className="px-4 py-3 mx-3 my-2 rounded-2xl flex items-center gap-3"
            style={{
                background: "#fff",
                border: "1px solid rgba(10,10,10,0.08)",
                boxShadow: "0 1px 2px rgba(10,10,10,0.03), 0 10px 30px -12px rgba(10,10,10,0.12)",
            }}
        >
            <div
                className="grid place-items-center shrink-0"
                style={{
                    width: 38, height: 38, borderRadius: 10,
                    background: PT.red, color: "#fff",
                }}
            >
                <Bell size={18} strokeWidth={2.4} />
            </div>
            <div className="flex-1 min-w-0">
                <p className="font-bold text-[13.5px]" style={{ color: PT.ink }}>
                    Quer ser avisado quando algo importante acontece?
                </p>
                <p className="text-[12px] font-medium" style={{ color: "rgba(10,10,10,0.55)" }}>
                    Activa notificações push. Sem spam — só o que te diz respeito.
                </p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
                <button
                    onClick={enable}
                    disabled={busy}
                    data-testid="push-banner-enable"
                    className="px-3.5 py-1.5 rounded-full text-[11.5px] font-bold uppercase tracking-wider tap-shrink"
                    style={{ background: PT.ink, color: "#fff", opacity: busy ? 0.6 : 1 }}
                >
                    {busy ? "…" : "Activar"}
                </button>
                <button
                    onClick={dismiss}
                    aria-label="Fechar"
                    data-testid="push-banner-dismiss"
                    className="grid place-items-center w-7 h-7 rounded-full hover:bg-black/[0.04] transition"
                    style={{ color: "rgba(10,10,10,0.5)" }}
                >
                    <X size={14} strokeWidth={2.4} />
                </button>
            </div>
        </div>
    );
}
