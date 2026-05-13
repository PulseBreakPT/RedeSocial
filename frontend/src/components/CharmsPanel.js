import { useEffect, useState } from "react";
import { Loader2, Lock, Sparkles } from "lucide-react";
import { api, toastApiError } from "../lib/api";
import { toast } from "sonner";

// Charms panel: shown on Profile page. If `editable`, allow equipping (max 3).
export function CharmsPanel({ username, editable = false }) {
    const [data, setData] = useState({ unlocked: [], equipped: [] });
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [edit, setEdit] = useState(false);
    const [picks, setPicks] = useState([]);

    async function load() {
        setLoading(true);
        try {
            const r = await api.get(`/users/${username}/charms`);
            setData(r.data);
            setPicks((r.data.equipped || []).map((c) => c.key));
        } catch (e) {
            toastApiError(e);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (username) load();
    }, [username]);

    async function save() {
        setBusy(true);
        try {
            await api.post("/users/me/charms/equip", { keys: picks });
            toast.success("Charms guardados");
            setEdit(false);
            await load();
        } catch (e) {
            toastApiError(e);
        } finally {
            setBusy(false);
        }
    }

    function togglePick(key) {
        setPicks((cur) => {
            if (cur.includes(key)) return cur.filter((k) => k !== key);
            if (cur.length >= 3) {
                toast.error("Máx 3 charms");
                return cur;
            }
            return [...cur, key];
        });
    }

    if (loading) {
        return <div className="text-xs font-mono text-black/40 py-2 flex items-center gap-2"><Loader2 size={12} className="animate-spin" /> A carregar charms…</div>;
    }

    const unlockedKeys = new Set((data.unlocked || []).map((c) => c.key));

    return (
        <div className="rounded-2xl border border-black/[0.08] bg-white p-3" data-testid="charms-panel">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                    <Sparkles size={13} className="text-orange-500" />
                    <span className="font-heading font-semibold text-xs uppercase tracking-wider text-black/55">Charms</span>
                    <span className="text-[10px] font-mono text-black/40">({(data.unlocked || []).length} desbloqueados)</span>
                </div>
                {editable && !edit && (
                    <button
                        className="text-[11px] font-mono text-black/55 hover:text-black underline-offset-2 hover:underline"
                        onClick={() => setEdit(true)}
                        data-testid="charms-edit-btn"
                    >
                        editar (máx 3)
                    </button>
                )}
            </div>

            {!edit && (
                <div className="flex flex-wrap gap-1.5">
                    {(data.equipped || []).length === 0 && (
                        <span className="text-xs font-mono text-black/40">
                            {editable ? "Sem charms equipados. Clica em editar para escolheres." : "Sem charms equipados"}
                        </span>
                    )}
                    {(data.equipped || []).map((c) => (
                        <span
                            key={c.key}
                            title={c.desc}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-black/[0.04] border border-black/[0.08] text-xs font-mono"
                            data-testid={`charm-${c.key}`}
                        >
                            <span>{c.emoji}</span>
                            <span>{c.label}</span>
                        </span>
                    ))}
                </div>
            )}

            {edit && (
                <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-1.5">
                        {(data.unlocked || []).map((c) => (
                            <button
                                key={c.key}
                                onClick={() => togglePick(c.key)}
                                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-left text-xs font-mono transition ${
                                    picks.includes(c.key)
                                        ? "border-black bg-black text-white"
                                        : "border-black/10 hover:border-black/25"
                                }`}
                                data-testid={`charms-pick-${c.key}`}
                            >
                                <span>{c.emoji}</span>
                                <span className="truncate">{c.label}</span>
                            </button>
                        ))}
                    </div>
                    {(data.unlocked || []).length === 0 && (
                        <div className="text-[11px] font-mono text-black/45 flex items-center gap-1">
                            <Lock size={11} /> Ainda não desbloqueaste nenhum charm. Publica, comenta, explora cidades.
                        </div>
                    )}
                    <div className="flex gap-2">
                        <button
                            onClick={save}
                            disabled={busy}
                            className="px-3 py-1.5 rounded-full bg-black text-white text-xs font-mono disabled:opacity-40 hover:bg-black/85 flex items-center gap-1.5"
                            data-testid="charms-save"
                        >
                            {busy && <Loader2 size={11} className="animate-spin" />}
                            Guardar
                        </button>
                        <button
                            onClick={() => setEdit(false)}
                            className="px-3 py-1.5 rounded-full text-xs font-mono text-black/55 hover:text-black"
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
