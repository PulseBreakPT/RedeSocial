import { useState } from "react";
import { Link } from "react-router-dom";
import {
    Moon, Sun, ScrollText, Bell, Sliders, Clock, ChevronRight, Heart,
    MessageCircle, UserPlus, AtSign, MessageSquare,
} from "lucide-react";
import { isNotifSoundEnabled, setNotifSoundEnabled, playNotifSound } from "../../lib/sound";
import { isHapticsEnabled, setHapticsEnabled, haptic } from "../../lib/haptics";
import { SectionHeader, SwitchPill } from "./_shared";

/* =============================================================
   NotifTab — Modos saudáveis · Tipos · Som & Vibração.
   12-col responsivo, agrupamento lógico com SectionHeaders
   numerados (00, 01, 02) para hierarquia visual SSS tier.
   ============================================================= */

const NOTIF_TYPES = [
    { k: "notif_likes",    icon: Heart,         label: "Gostos",         sub: "Quando alguém gosta de um post teu",      tintBg: "#C8102E", tintFg: "#fff" },
    { k: "notif_comments", icon: MessageCircle, label: "Comentários",    sub: "Respostas e fóruns nos teus posts",       tintBg: "#FFCC29", tintFg: "#0A0A0A" },
    { k: "notif_follows",  icon: UserPlus,      label: "Novos seguidores", sub: "Quando alguém te começa a seguir",      tintBg: "#046A38", tintFg: "#fff" },
    { k: "notif_mentions", icon: AtSign,        label: "Menções",        sub: "Quando alguém te marca com @",            tintBg: "#3E5C9A", tintFg: "#fff" },
    { k: "notif_dm",       icon: MessageSquare, label: "Mensagens diretas", sub: "Push para conversas privadas",         tintBg: "#FBFAF6", tintFg: "#0A0A0A" },
];

export function NotifTab({ form, setForm, prefs, setPref, save, busy }) {
    return (
        <div className="px-4 lg:px-8 py-5 lg:py-7" data-testid="settings-notif">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-4 max-w-5xl">

                <SectionHeader
                    idx={1}
                    overline="Modos saudáveis"
                    title="Cuida do teu tempo"
                    desc="Janelas em que a app fica em silêncio ou só te dá uma dose curta de manhã."
                />

                {/* Boa Noite — 7 col · FANZINE */}
                <div className="lg:col-span-7 card-lux p-5" data-testid="boa-noite-toggle">
                    <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                            <div
                                className="w-11 h-11 grid place-items-center shrink-0"
                                style={{ background: "#3E5C9A", color: "#fff", border: "1px solid rgba(10,10,10,0.10)", borderRadius: 8, transform: "rotate(-4deg)" }}
                            >
                                <Moon size={16} strokeWidth={2.2} />
                            </div>
                            <div className="min-w-0">
                                <div className="font-black tracking-tight" style={{ fontSize: 14.5, color: "#0A0A0A" }}>Modo Boa Noite</div>
                                <div className="text-[12px] leading-snug mt-1 font-medium" style={{ color: "rgba(10,10,10,0.6)" }}>
                                    Silencia notificações e suaviza a UI nas horas que escolheres.
                                </div>
                            </div>
                        </div>
                        <SwitchPill
                            checked={!!form.boa_noite_enabled}
                            onChange={(v) => setForm({ ...form, boa_noite_enabled: v })}
                            testid="boa-noite-checkbox"
                        />
                    </div>
                    {form.boa_noite_enabled && (
                        <div className="mt-4 pt-4 hairline-t grid grid-cols-2 gap-3">
                            <div>
                                <label className="type-overline flex items-center gap-1.5"><Clock size={10} strokeWidth={2.4} /> Início</label>
                                <input
                                    type="time"
                                    value={prefs.boa_noite_start || "23:00"}
                                    onChange={(e) => setPref("boa_noite_start", e.target.value)}
                                    data-testid="boa-noite-start"
                                    className="mt-2 vm-input tabular-nums"
                                />
                            </div>
                            <div>
                                <label className="type-overline flex items-center gap-1.5"><Clock size={10} strokeWidth={2.4} /> Fim</label>
                                <input
                                    type="time"
                                    value={prefs.boa_noite_end || "08:00"}
                                    onChange={(e) => setPref("boa_noite_end", e.target.value)}
                                    data-testid="boa-noite-end"
                                    className="mt-2 vm-input tabular-nums"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Cafezinho — 5 col · FANZINE */}
                <div className="lg:col-span-5 card-lux p-5 flex items-start justify-between gap-3" data-testid="cafezinho-toggle">
                    <div className="flex items-start gap-3 min-w-0">
                        <div
                            className="w-11 h-11 grid place-items-center shrink-0"
                            style={{ background: "#FFCC29", color: "#0A0A0A", border: "1px solid rgba(10,10,10,0.10)", borderRadius: 8, transform: "rotate(-4deg)" }}
                        >
                            <Sun size={16} strokeWidth={2.2} />
                        </div>
                        <div className="min-w-0">
                            <div className="font-black tracking-tight" style={{ fontSize: 14.5, color: "#0A0A0A" }}>Cafezinho da manhã</div>
                            <div className="text-[12px] leading-snug mt-1 font-medium" style={{ color: "rgba(10,10,10,0.6)" }}>
                                Sessão curta de 60s entre as 7h e 9h — 3 cards e fica. Sem scroll infinito.
                            </div>
                        </div>
                    </div>
                    <SwitchPill
                        checked={!!form.cafezinho_enabled}
                        onChange={(v) => setForm({ ...form, cafezinho_enabled: v })}
                        testid="cafezinho-checkbox"
                    />
                </div>

                {/* Save modos */}
                <div className="lg:col-span-12 flex justify-end -mt-1">
                    <button
                        onClick={save}
                        disabled={busy}
                        data-testid="settings-modes-save"
                        className="btn-silver text-[12px] px-5 py-2.5 disabled:opacity-50"
                    >
                        {busy ? "A guardar…" : "Guardar modos"}
                    </button>
                </div>

                {/* Manifesto link — 12 col · FANZINE */}
                <Link
                    to="/manifesto"
                    data-testid="settings-manifesto-link"
                    className="lg:col-span-12 flex items-center gap-3 p-4 sm:p-5 transition-transform hover:-translate-y-0.5 group tap-shrink"
                    style={{
                        background: "#FBFAF6",
                        border: "1px solid rgba(10,10,10,0.10)",
                        boxShadow: "0 1px 2px rgba(10,10,10,0.05), 0 8px 20px -10px rgba(10,10,10,0.15)",
                        borderRadius: 12,
                    }}
                >
                    <div
                        className="w-11 h-11 grid place-items-center shrink-0"
                        style={{
                            background: "#0A0A0A",
                            color: "#FFCC29",
                            border: "1px solid rgba(10,10,10,0.10)",
                            borderRadius: 8,
                        }}
                    >
                        <ScrollText size={16} strokeWidth={2.2} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="font-black tracking-tight flex items-center gap-1" style={{ fontSize: 14, color: "#0A0A0A" }}>
                            O nosso Manifesto
                            <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 -ml-0.5 transition" />
                        </div>
                        <p className="text-[12px] leading-snug mt-1 font-medium" style={{ color: "rgba(10,10,10,0.65)" }}>6 promessas anti-dark-pattern. O que não fazemos aqui.</p>
                    </div>
                </Link>

                <SectionHeader
                    idx={2}
                    overline="Tipos de notificação"
                    title="O que te deve interromper"
                    desc="Liga e desliga categoria a categoria. Aplica-se a push, e-mail e badge."
                />

                {NOTIF_TYPES.map((t, i) => (
                    <div key={t.k} className={i === NOTIF_TYPES.length - 1 ? "lg:col-span-12" : "lg:col-span-6"}>
                        <NotifTypeRow type={t} prefs={prefs} setPref={setPref} />
                    </div>
                ))}

                <SectionHeader
                    idx={3}
                    overline="Som & vibração"
                    title="Como te chega"
                    desc="Pequenos sinais ao chegar uma notificação. Tudo opcional."
                />

                <div className="lg:col-span-6"><NotifSoundCard /></div>
                <div className="lg:col-span-6"><HapticsCard /></div>
            </div>
        </div>
    );
}

function NotifTypeRow({ type, prefs, setPref }) {
    const Icon = type.icon;
    return (
        <div className="card-lux p-4 flex items-center justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
                <div
                    className="w-10 h-10 grid place-items-center shrink-0"
                    style={{
                        background: type.tintBg,
                        color: type.tintFg,
                        border: "1px solid rgba(10,10,10,0.10)",
                        borderRadius: 8,
                    }}
                >
                    <Icon size={14} strokeWidth={2.2} />
                </div>
                <div className="min-w-0">
                    <div className="font-black tracking-tight" style={{ fontSize: 13.5, color: "#0A0A0A" }}>{type.label}</div>
                    <div className="text-[11px] mt-1 leading-snug font-medium" style={{ color: "rgba(10,10,10,0.55)" }}>{type.sub}</div>
                </div>
            </div>
            <SwitchPill
                checked={!!prefs[type.k]}
                onChange={(v) => setPref(type.k, v)}
                testid={`pref-${type.k}`}
            />
        </div>
    );
}

function NotifSoundCard() {
    const [soundOn, setSoundOn] = useState(() => isNotifSoundEnabled());
    return (
        <div className="card-lux p-4 sm:p-5" data-testid="pref-notif-sound-toggle">
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                    <div
                        className="w-11 h-11 grid place-items-center shrink-0"
                        style={{ background: "#046A38", color: "#fff", border: "1px solid rgba(10,10,10,0.10)", borderRadius: 8, transform: "rotate(-4deg)" }}
                    >
                        <Bell size={15} strokeWidth={2.2} />
                    </div>
                    <div className="min-w-0">
                        <div className="font-black tracking-tight" style={{ fontSize: 14, color: "#0A0A0A" }}>Som de notificação</div>
                        <div className="text-[11.5px] leading-snug mt-1 font-medium" style={{ color: "rgba(10,10,10,0.6)" }}>
                            Pequeno toque suave ao chegar uma notificação nova.
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); playNotifSound({ force: true }); }}
                        data-testid="pref-notif-sound-preview"
                        className="font-mono font-black uppercase px-2.5 py-1 tap-shrink"
                        style={{
                            background: "#FBFAF6",
                            color: "#0A0A0A",
                            border: "1px solid rgba(10,10,10,0.10)",
                            boxShadow: "0 1px 2px rgba(10,10,10,0.05), 0 8px 20px -10px rgba(10,10,10,0.15)",
                            borderRadius: 999,
                            fontSize: 10,
                            letterSpacing: "0.10em",
                        }}
                    >
                        ouvir
                    </button>
                    <SwitchPill
                        checked={soundOn}
                        onChange={(v) => { setSoundOn(v); setNotifSoundEnabled(v); if (v) playNotifSound({ force: true }); }}
                        testid="pref-notif-sound-checkbox"
                    />
                </div>
            </div>
        </div>
    );
}

function HapticsCard() {
    const [hapticsOn, setHapticsOn] = useState(() => isHapticsEnabled());
    return (
        <div className="card-lux p-4 sm:p-5" data-testid="pref-haptics-toggle">
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                    <div
                        className="w-11 h-11 grid place-items-center shrink-0"
                        style={{ background: "#C8102E", color: "#fff", border: "1px solid rgba(10,10,10,0.10)", borderRadius: 8, transform: "rotate(-4deg)" }}
                    >
                        <Sliders size={15} strokeWidth={2.2} />
                    </div>
                    <div className="min-w-0">
                        <div className="font-black tracking-tight" style={{ fontSize: 14, color: "#0A0A0A" }}>Vibração no mobile</div>
                        <div className="text-[11.5px] leading-snug mt-1 font-medium" style={{ color: "rgba(10,10,10,0.6)" }}>
                            Toques curtos em likes, follow, comentário e publicação. Só em mobile.
                        </div>
                    </div>
                </div>
                <SwitchPill
                    checked={hapticsOn}
                    onChange={(v) => { setHapticsOn(v); setHapticsEnabled(v); if (v) haptic("success"); }}
                    testid="pref-haptics-checkbox"
                />
            </div>
        </div>
    );
}
