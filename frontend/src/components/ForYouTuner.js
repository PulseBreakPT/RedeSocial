import { useState, useEffect } from "react";
import { Sliders, Loader2 } from "lucide-react";
import { api, toastApiError } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";

const PRESETS = [
    { key: "social",     label: "Social",     mix: { friends: 70, interest: 15, place: 15 }, desc: "Sigo amigos primeiro" },
    { key: "explorer",   label: "Explorador", mix: { friends: 20, interest: 50, place: 30 }, desc: "Tópicos que me interessam" },
    { key: "local",      label: "Local",      mix: { friends: 25, interest: 25, place: 50 }, desc: "Lisboa, Porto, Braga…" },
    { key: "balanced",   label: "Equilibrado",mix: { friends: 40, interest: 30, place: 30 }, desc: "Mistura" },
];

// For You Tuner — sliders that mix the feed algorithm
export function ForYouTuner() {
    const { user, refresh } = useAuth();
    const initial = user?.feed_mix || { friends: 40, interest: 30, place: 30 };
    const [mix, setMix] = useState(initial);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (user?.feed_mix) setMix(user.feed_mix);
    }, [user?.feed_mix]);

    function update(key, val) {
        setMix((m) => ({ ...m, [key]: val }));
    }
    function applyPreset(p) { setMix(p.mix); }

    async function save() {
        setBusy(true);
        try {
            const r = await api.post("/users/me/feed-mix", mix);
            toast.success("Para Ti recalibrado");
            setMix(r.data);
            if (refresh) await refresh();
        } catch (e) {
            toastApiError(e);
        } finally {
            setBusy(false);
        }
    }

    const total = mix.friends + mix.interest + mix.place;
    const dirty = JSON.stringify(mix) !== JSON.stringify(user?.feed_mix || initial);

    return (
        <div className="space-y-4" data-testid="for-you-tuner">
            <div className="flex items-center gap-2">
                <Sliders size={14} className="text-orange-500" />
                <span className="font-heading font-semibold text-sm">Para Ti — calibração</span>
            </div>
            <p className="text-[12px] font-mono text-black/55">
                Ajusta o que pesa mais no teu feed. Soma será normalizada para 100%.
            </p>

            <div className="grid grid-cols-2 gap-2">
                {PRESETS.map((p) => (
                    <button
                        key={p.key}
                        onClick={() => applyPreset(p)}
                        className={`px-3 py-2 rounded-xl border text-left transition ${
                            JSON.stringify(mix) === JSON.stringify(p.mix)
                                ? "border-black bg-black/[0.04]"
                                : "border-black/10 hover:border-black/25"
                        }`}
                        data-testid={`tuner-preset-${p.key}`}
                    >
                        <div className="text-xs font-heading font-semibold">{p.label}</div>
                        <div className="text-[10px] font-mono text-black/45 mt-0.5">{p.desc}</div>
                    </button>
                ))}
            </div>

            {[
                { key: "friends",  label: "Amigos & Roda",    color: "from-pink-400 to-red-500" },
                { key: "interest", label: "Interesses & moods", color: "from-orange-400 to-amber-500" },
                { key: "place",    label: "Lugar (cidade)",   color: "from-blue-400 to-cyan-500" },
            ].map((s) => (
                <div key={s.key}>
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-mono text-black/65">{s.label}</span>
                        <span className="text-xs font-mono text-black/45">
                            {Math.round((mix[s.key] / Math.max(1, total)) * 100)}%
                        </span>
                    </div>
                    <input
                        type="range"
                        min={0}
                        max={100}
                        value={mix[s.key]}
                        onChange={(e) => update(s.key, parseInt(e.target.value, 10))}
                        className="w-full accent-orange-500"
                        data-testid={`tuner-slider-${s.key}`}
                    />
                    <div className={`w-full h-1 rounded-full bg-gradient-to-r ${s.color} opacity-30 -mt-1.5 pointer-events-none`} style={{ width: `${(mix[s.key] / 100) * 100}%` }} />
                </div>
            ))}

            <button
                onClick={save}
                disabled={busy || !dirty}
                className="px-4 py-2 rounded-full bg-black text-white text-xs font-mono disabled:opacity-40 hover:bg-black/85 flex items-center gap-2"
                data-testid="tuner-save"
            >
                {busy && <Loader2 size={12} className="animate-spin" />}
                {dirty ? "Guardar" : "Sem alterações"}
            </button>
        </div>
    );
}
