// =============================================================================
// Lusorae — PWA Install Prompt (FASE 3)
// =============================================================================
// Captura beforeinstallprompt e mostra um banner discreto editorial.
// Mostra-se 1x e armazena dismissal em localStorage por 7 dias.
// =============================================================================
import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { PT } from "../theme/editorial";

const STORAGE_KEY = "lusorae_pwa_dismissed_at";
const RECHECK_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

export function PWAInstallPrompt() {
    const [deferred, setDeferred] = useState(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        // Já dismissed recentemente?
        try {
            const at = parseInt(localStorage.getItem(STORAGE_KEY) || "0", 10);
            if (at && Date.now() - at < RECHECK_MS) return;
        } catch { /* noop */ }

        const handler = (e) => {
            e.preventDefault();
            setDeferred(e);
            // pequeno delay para não interromper primeira impressão
            setTimeout(() => setVisible(true), 4000);
        };
        window.addEventListener("beforeinstallprompt", handler);

        // Se já está instalado, não mostrar
        const onInstalled = () => setVisible(false);
        window.addEventListener("appinstalled", onInstalled);

        return () => {
            window.removeEventListener("beforeinstallprompt", handler);
            window.removeEventListener("appinstalled", onInstalled);
        };
    }, []);

    const dismiss = () => {
        try { localStorage.setItem(STORAGE_KEY, String(Date.now())); } catch { /* noop */ }
        setVisible(false);
    };

    const install = async () => {
        if (!deferred) return;
        try {
            deferred.prompt();
            await deferred.userChoice;
        } catch { /* noop */ }
        setDeferred(null);
        setVisible(false);
        try { localStorage.setItem(STORAGE_KEY, String(Date.now())); } catch { /* noop */ }
    };

    if (!visible || !deferred) return null;

    return (
        <div
            data-testid="pwa-install-prompt"
            className="fixed z-[80] bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-sm animate-in fade-in slide-in-from-bottom-4"
            style={{
                background: "#fff",
                border: "1px solid rgba(10,10,10,0.10)",
                borderRadius: 20,
                boxShadow: "0 30px 80px -20px rgba(10,10,10,0.32), 0 8px 20px -10px rgba(10,10,10,0.18)",
                padding: 18,
            }}
        >
            <div className="flex items-start gap-3">
                <div
                    className="grid place-items-center shrink-0"
                    style={{
                        width: 44, height: 44, borderRadius: 12,
                        background: PT.ink, color: "#fff",
                    }}
                >
                    <Download size={20} strokeWidth={2.4} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em]" style={{ color: "rgba(10,10,10,0.5)" }}>
                        Instala o Lusorae
                    </p>
                    <h3 className="font-black tracking-tight mt-1" style={{ fontSize: 17, color: PT.ink }}>
                        Tem-no à mão, sempre.
                    </h3>
                    <p className="text-[12.5px] mt-1.5 font-medium leading-snug" style={{ color: "rgba(10,10,10,0.6)" }}>
                        Instala como app no teu ecrã principal. Mais rápido e com notificações.
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                        <button
                            onClick={install}
                            data-testid="pwa-install-btn"
                            className="px-3.5 py-1.5 rounded-full text-[12px] font-bold uppercase tracking-wider tap-shrink"
                            style={{ background: PT.ink, color: "#fff", border: "1px solid " + PT.ink }}
                        >
                            Instalar
                        </button>
                        <button
                            onClick={dismiss}
                            data-testid="pwa-install-dismiss"
                            className="px-3 py-1.5 rounded-full text-[12px] font-bold uppercase tracking-wider tap-shrink"
                            style={{ background: "transparent", color: "rgba(10,10,10,0.6)" }}
                        >
                            Mais tarde
                        </button>
                    </div>
                </div>
                <button
                    onClick={dismiss}
                    aria-label="Fechar"
                    className="shrink-0 grid place-items-center w-6 h-6 rounded-full hover:bg-black/[0.04] transition"
                    style={{ color: "rgba(10,10,10,0.45)" }}
                >
                    <X size={14} strokeWidth={2.4} />
                </button>
            </div>
        </div>
    );
}
