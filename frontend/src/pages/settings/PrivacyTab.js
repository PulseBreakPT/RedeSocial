import { Eye, Pencil, Search } from "lucide-react";
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
        tint: "bg-emerald-50 text-emerald-700",
    },
    {
        k: "priv_typing",
        icon: Pencil,
        label: "Indicador a escrever",
        sub: "‘Está a escrever…’ visível em conversas privadas",
        tint: "bg-amber-50 text-amber-700",
    },
    {
        k: "priv_search",
        icon: Search,
        label: "Aparecer em pesquisas",
        sub: "O teu @ aparece nas buscas e nas sugestões",
        tint: "bg-indigo-50 text-indigo-700",
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
        <div className="card-lux p-4 sm:p-5 hover:shadow-md transition h-full flex flex-col justify-between gap-3">
            <div className="flex items-start gap-3">
                <div className={`w-11 h-11 rounded-xl grid place-items-center shrink-0 ${entry.tint}`}>
                    <Icon size={16} strokeWidth={1.7} />
                </div>
                <div className="min-w-0">
                    <div className="font-heading font-semibold text-[14px] tracking-tight text-black">{entry.label}</div>
                    <div className="font-mono text-[11px] text-black/50 mt-1 leading-snug">{entry.sub}</div>
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
