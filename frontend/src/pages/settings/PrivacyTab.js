import { Eye, Pencil, Search, Activity } from "lucide-react";
import { SectionHeader, SwitchPill } from "./_shared";

/* =============================================================
   PrivacyTab — Quem te vê (3 sinais reais).
   Foi simplificado: a parte "exportar / apagar" passou a viver
   apenas em "Dados & Legal" para não duplicar UX.
   ============================================================= */

const TOGGLES = [
    {
        k: "priv_show_online",
        icon: Eye,
        label: "Mostrar quando estou online",
        sub: "Ponto verde no avatar + estado nas listas de pessoas",
        tintBg: "#1F7A5A", tintFg: "#fff",
    },
    {
        k: "priv_typing",
        icon: Pencil,
        label: "Indicador a escrever",
        sub: "‘Está a escrever…’ visível em conversas privadas",
        tintBg: "#FFD93D", tintFg: "#0A0A0A",
    },
    {
        k: "priv_search",
        icon: Search,
        label: "Aparecer em pesquisas",
        sub: "O teu @ aparece nas buscas e nas sugestões",
        tintBg: "#3E5C9A", tintFg: "#fff",
    },
    {
        k: "priv_pulse",
        icon: Activity,
        label: "Contribuir para o pulso social",
        sub: "Os teus posts somam no mapa coletivo ‘a tua cidade está ativa’. Nunca te identifica.",
        tintBg: "#C8261E", tintFg: "#fff",
    },
];

export function PrivacyTab({ prefs, setPref }) {
    return (
        <div className="px-4 lg:px-8 py-5 lg:py-7" data-testid="settings-priv">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-4 max-w-5xl">
                <SectionHeader
                    overline="Privacidade"
                    title="O que os outros vêem"
                    desc="Pequenos sinais que tornam o teu uso mais ou menos visível para a comunidade."
                />

                {TOGGLES.map((t) => (
                    <div key={t.k} className="lg:col-span-4">
                        <PrivacyToggle entry={t} prefs={prefs} setPref={setPref} />
                    </div>
                ))}
            </div>
        </div>
    );
}

function PrivacyToggle({ entry, prefs, setPref }) {
    const Icon = entry.icon;
    return (
        <div className="card-lux p-4 sm:p-5 h-full flex flex-col justify-between gap-3">
            <div className="flex items-start gap-3">
                <div
                    className="w-11 h-11 grid place-items-center shrink-0"
                    style={{
                        background: entry.tintBg,
                        color: entry.tintFg,
                        border: "2px solid #0A0A0A",
                        borderRadius: 8,
                        transform: "rotate(-4deg)",
                    }}
                >
                    <Icon size={15} strokeWidth={2.2} />
                </div>
                <div className="min-w-0">
                    <div className="font-black tracking-tight" style={{ fontSize: 14, color: "#0A0A0A" }}>{entry.label}</div>
                    <div className="font-mono text-[11px] mt-1.5 leading-snug font-medium" style={{ color: "rgba(10,10,10,0.55)" }}>{entry.sub}</div>
                </div>
            </div>
            <div className="flex justify-end">
                <SwitchPill
                    checked={!!prefs[entry.k]}
                    onChange={(v) => setPref(entry.k, v)}
                    testid={`pref-${entry.k}`}
                />
            </div>
        </div>
    );
}
