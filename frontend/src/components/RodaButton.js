import { useState, useEffect } from "react";
import { Users2, Loader2, Plus, Check } from "lucide-react";
import { api, toastApiError } from "../lib/api";
import { toast } from "sonner";

// Button to add/remove someone from your "Roda" (close friends). Shown on profile page of OTHER users.
export function RodaButton({ targetUsername }) {
    const [inRoda, setInRoda] = useState(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        let alive = true;
        async function check() {
            try {
                const r = await api.get(`/users/${targetUsername}/in-roda`);
                if (alive) setInRoda(r.data.in_roda);
            } catch (e) {
                if (alive) setInRoda(false);
            }
        }
        if (targetUsername) check();
        return () => { alive = false; };
    }, [targetUsername]);

    async function toggle() {
        setBusy(true);
        try {
            // first resolve target user id
            const u = await api.get(`/users/${targetUsername}`);
            const r = await api.post(`/users/me/roda/${u.data.id}`);
            setInRoda(r.data.action === "added");
            toast.success(r.data.action === "added" ? "Adicionado à tua Roda" : "Removido da tua Roda");
        } catch (e) {
            toastApiError(e);
        } finally {
            setBusy(false);
        }
    }

    if (inRoda === null) return null;
    return (
        <button
            onClick={toggle}
            disabled={busy}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-mono transition ${
                inRoda ? "border-orange-400 bg-orange-50 text-orange-700" : "border-black/15 hover:border-black/40"
            }`}
            data-testid={`roda-toggle-${targetUsername}`}
            title="Roda = grupo íntimo de amigos"
        >
            {busy ? <Loader2 size={12} className="animate-spin" /> : inRoda ? <Check size={12} /> : <Plus size={12} />}
            <Users2 size={12} />
            <span>{inRoda ? "Na tua Roda" : "Roda"}</span>
        </button>
    );
}
