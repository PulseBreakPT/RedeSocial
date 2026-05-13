import { useState, useEffect, useRef } from "react";
import { Circle, X, Loader2 } from "lucide-react";
import { api, toastApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import { useClickOutside } from "../hooks/useClickOutside";

const STATES = [
    { key: "online",    label: "Online",         color: "#22c55e", desc: "Disponível" },
    { key: "ausente",   label: "Ausente",        color: "#eab308", desc: "Volto já" },
    { key: "ocupado",   label: "Não perturbar",  color: "#ef4444", desc: "A trabalhar / concentrado" },
    { key: "invisivel", label: "Invisível",      color: "#94a3b8", desc: "Modo discreto" },
];
const QUICK_EMOJI = ["☕", "🌊", "📚", "💻", "🎧", "🌙", "🥐", "⚽", "🎙️", "✈️"];

export function PresencePicker() {
    const { user, refresh } = useAuth();
    const [open, setOpen] = useState(false);
    const [status, setStatus] = useState(user?.presence?.status || "online");
    const [emoji, setEmoji] = useState(user?.presence?.emoji || "");
    const [text, setText] = useState(user?.presence?.text || "");
    const [minutes, setMinutes] = useState(0);
    const [busy, setBusy] = useState(false);
    const ref = useRef(null);
    useClickOutside(ref, () => setOpen(false));

    useEffect(() => {
        if (user?.presence) {
            setStatus(user.presence.status || "online");
            setEmoji(user.presence.emoji || "");
            setText(user.presence.text || "");
        }
    }, [user?.presence]);

    const current = STATES.find((s) => s.key === status) || STATES[0];

    async function save() {
        setBusy(true);
        try {
            await api.post("/users/me/presence", { status, emoji, text, minutes });
            toast.success("Presença atualizada");
            setOpen(false);
            if (refresh) await refresh();
        } catch (e) {
            toastApiError(e);
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setOpen((v) => !v)}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-black/[0.04] transition text-left"
                data-testid="presence-trigger"
                title="Mudar presença"
            >
                <Circle size={10} fill={current.color} stroke="none" />
                <span className="text-xs font-mono text-black/70 truncate">
                    {user?.presence?.emoji ? `${user.presence.emoji} ` : ""}
                    {user?.presence?.text || current.label}
                </span>
            </button>
            {open && (
                <div className="absolute z-30 left-0 top-full mt-1 w-72 bg-white rounded-xl border border-black/[0.08] shadow-2xl p-3" data-testid="presence-popover">
                    <div className="flex items-center justify-between mb-2">
                        <span className="font-heading font-semibold text-sm">Presença</span>
                        <button onClick={() => setOpen(false)} className="text-black/40 hover:text-black"><X size={16} /></button>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 mb-3">
                        {STATES.map((s) => (
                            <button
                                key={s.key}
                                onClick={() => setStatus(s.key)}
                                className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border text-left text-xs font-mono transition ${
                                    status === s.key ? "border-black bg-black/[0.04]" : "border-black/10 hover:border-black/25"
                                }`}
                                data-testid={`presence-state-${s.key}`}
                            >
                                <Circle size={9} fill={s.color} stroke="none" />
                                <span className="truncate">{s.label}</span>
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-1 mb-2 flex-wrap">
                        {QUICK_EMOJI.map((e) => (
                            <button
                                key={e}
                                onClick={() => setEmoji(e === emoji ? "" : e)}
                                className={`w-7 h-7 rounded-lg text-sm transition ${
                                    emoji === e ? "bg-black/10 ring-1 ring-black" : "hover:bg-black/[0.04]"
                                }`}
                                data-testid={`presence-emoji-${e}`}
                            >
                                {e}
                            </button>
                        ))}
                    </div>
                    <input
                        value={text}
                        onChange={(e) => setText(e.target.value.slice(0, 40))}
                        placeholder="O que andas a fazer? (opcional)"
                        className="w-full px-2.5 py-2 rounded-lg border border-black/10 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-orange-400 mb-2"
                        data-testid="presence-text"
                    />
                    <select
                        value={minutes}
                        onChange={(e) => setMinutes(parseInt(e.target.value, 10))}
                        className="w-full px-2.5 py-2 rounded-lg border border-black/10 text-xs font-mono mb-3"
                        data-testid="presence-minutes"
                    >
                        <option value={0}>Não expirar</option>
                        <option value={30}>30 min</option>
                        <option value={120}>2 horas</option>
                        <option value={480}>8 horas</option>
                        <option value={1440}>1 dia</option>
                    </select>
                    <button
                        onClick={save}
                        disabled={busy}
                        className="w-full px-3 py-2 rounded-lg bg-black text-white text-xs font-mono disabled:opacity-40 hover:bg-black/85 transition flex items-center justify-center gap-2"
                        data-testid="presence-save"
                    >
                        {busy && <Loader2 size={12} className="animate-spin" />}
                        Guardar
                    </button>
                </div>
            )}
        </div>
    );
}
