import { useEffect, useState } from "react";
import { Coffee, Loader2, Plus, X } from "lucide-react";
import { api, toastApiError } from "../lib/api";
import { Avatar } from "./Avatar";
import { toast } from "sonner";

// Mesa — inner-inner circle (max 5 from Roda)
export function MesaPanel() {
    const [mesa, setMesa] = useState([]);
    const [roda, setRoda] = useState([]);
    const [loading, setLoading] = useState(true);
    const [picker, setPicker] = useState(false);

    async function load() {
        setLoading(true);
        try {
            const [m, r] = await Promise.all([
                api.get("/users/me/mesa"),
                api.get("/users/me/roda"),
            ]);
            setMesa(m.data || []);
            setRoda(r.data || []);
        } catch (e) {
            // silent
        } finally {
            setLoading(false);
        }
    }
    useEffect(() => { load(); }, []);

    async function toggle(uid) {
        try {
            await api.post(`/users/me/mesa/${uid}`);
            await load();
        } catch (e) {
            toastApiError(e);
        }
    }

    const mesaIds = new Set(mesa.map((u) => u.id));

    return (
        <div className="rounded-2xl border border-black/[0.08] bg-gradient-to-br from-stone-50 to-amber-50/30 p-4" data-testid="mesa-panel">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-1.5">
                    <Coffee size={13} className="text-stone-700" />
                    <span className="font-heading font-semibold text-xs uppercase tracking-wider text-black/65">À Mesa</span>
                    <span className="text-[10px] font-mono text-black/40">({mesa.length}/5)</span>
                </div>
                <button
                    onClick={() => setPicker(true)}
                    className="text-[11px] font-mono text-black/55 hover:text-black flex items-center gap-1"
                    data-testid="mesa-edit-btn"
                >
                    <Plus size={11} /> editar
                </button>
            </div>
            <p className="text-[11px] font-mono text-black/55 mb-2">
                Os 5 mais próximos da tua Roda. Posts marcados como "Mesa" só estes vêem.
            </p>
            {loading ? (
                <Loader2 size={12} className="animate-spin text-black/40" />
            ) : mesa.length === 0 ? (
                <div className="text-xs font-mono text-black/40 py-2">Ainda não tens ninguém na Mesa.</div>
            ) : (
                <div className="flex flex-wrap gap-1.5">
                    {mesa.map((u) => (
                        <div key={u.id} className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-white border border-amber-200">
                            <Avatar user={u} size={20} />
                            <span className="text-xs font-mono">@{u.username}</span>
                            <button
                                onClick={() => toggle(u.id)}
                                className="text-black/30 hover:text-red-500"
                                data-testid={`mesa-remove-${u.username}`}
                            >
                                <X size={11} />
                            </button>
                        </div>
                    ))}
                </div>
            )}
            {picker && (
                <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center px-4" onClick={() => setPicker(false)}>
                    <div className="bg-white rounded-2xl border border-black/10 w-full max-w-md p-4 shadow-2xl max-h-[80vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-3">
                            <span className="font-heading font-semibold">Escolher Mesa</span>
                            <button onClick={() => setPicker(false)} className="text-black/40 hover:text-black"><X size={18} /></button>
                        </div>
                        {roda.length === 0 ? (
                            <p className="text-sm font-mono text-black/50 py-6 text-center">
                                A tua Roda está vazia. Adiciona pessoas à Roda primeiro.
                            </p>
                        ) : (
                            <div className="space-y-1.5 overflow-y-auto">
                                {roda.map((u) => {
                                    const inMesa = mesaIds.has(u.id);
                                    return (
                                        <button
                                            key={u.id}
                                            onClick={() => toggle(u.id)}
                                            className={`w-full flex items-center gap-2 p-2 rounded-lg text-left transition ${
                                                inMesa ? "bg-amber-100 border border-amber-300" : "hover:bg-black/[0.04] border border-transparent"
                                            }`}
                                            data-testid={`mesa-pick-${u.username}`}
                                        >
                                            <Avatar user={u} size={28} />
                                            <div className="flex-1 min-w-0">
                                                <div className="text-xs font-heading font-semibold truncate">{u.name}</div>
                                                <div className="text-[10px] font-mono text-black/45">@{u.username}</div>
                                            </div>
                                            {inMesa && <span className="text-[10px] font-mono text-amber-700">à Mesa ✓</span>}
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
