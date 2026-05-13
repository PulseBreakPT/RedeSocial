import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { api } from "../lib/api";

const BASE_TITLE = "Vermillion · rede social";

// Updates browser tab title with unread count and shows toast when new notifications arrive
export function useGlobalNotifications() {
    const navigate = useNavigate();
    const lastNotifRef = useRef(null);
    const lastMsgRef = useRef(null);

    useEffect(() => {
        let cancelled = false;

        const tick = async () => {
            try {
                const [n, m] = await Promise.all([
                    api.get("/notifications/unread-count"),
                    api.get("/messages/unread-count"),
                ]);
                if (cancelled) return;
                const notif = n.data.count;
                const msg = m.data.count;
                const total = notif + msg;

                document.title = total > 0 ? `(${total}) ${BASE_TITLE}` : BASE_TITLE;

                if (lastNotifRef.current !== null && notif > lastNotifRef.current) {
                    toast("Nova notificação", {
                        description: "Você tem uma nova interação",
                        action: { label: "Ver", onClick: () => navigate("/notifications") },
                    });
                }
                if (lastMsgRef.current !== null && msg > lastMsgRef.current) {
                    toast("Nova mensagem", {
                        description: "Alguém te enviou uma DM",
                        action: { label: "Abrir", onClick: () => navigate("/messages") },
                    });
                }

                lastNotifRef.current = notif;
                lastMsgRef.current = msg;
            } catch {}
        };

        tick();
        const id = setInterval(tick, 12000);
        return () => {
            cancelled = true;
            clearInterval(id);
            document.title = BASE_TITLE;
        };
    }, [navigate]);
}
