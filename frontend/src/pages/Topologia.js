import { useCallback, useEffect, useState } from "react";
import { MapPin, Activity } from "lucide-react";
import { api } from "../lib/api";
import { PageHeader } from "../components/PageHeader";
import { useWsMessages } from "../components/WebSocketProvider";

// Layout esquemático de Portugal (não geográfico ao pixel — honesto e
// acessível). Continente em coluna (Norte→Algarve); ilhas à esquerda.
// Um SVG geográfico preciso pode substituir isto mais tarde.
const MAINLAND = ["norte", "centro", "lisboa", "alentejo", "algarve"];
const ISLANDS = ["acores", "madeira"];

function tileStyle(intensity) {
    // Intensidade 0..1 → opacidade do coral por cima de um fundo neutro.
    const a = Math.max(0.04, Math.min(0.85, (intensity || 0) * 0.85 + 0.04));
    return { background: `rgba(232, 93, 79, ${a})` };
}

function fmtDelta(pct) {
    if (typeof pct !== "number" || !isFinite(pct)) return null;
    const r = Math.round(pct);
    return `${r >= 0 ? "+" : ""}${r}%`;
}

function RegionTile({ r }) {
    if (!r) return null;
    const meaningful = r.meaningful;
    const d = fmtDelta(r.delta_pct);
    return (
        <div
            className="relative rounded-2xl border border-black/[0.06] p-3 flex flex-col justify-between min-h-[72px] transition"
            style={tileStyle(r.intensity)}
            title={`${r.label} · ${r.score} sinais${d ? ` · ${d}` : ""}`}
            data-testid={`topo-region-${r.key}`}
        >
            {meaningful && <span className="live-dot absolute top-2 right-2" aria-hidden />}
            <span className="font-heading font-semibold text-[13px] tracking-tight text-black/85">{r.label}</span>
            <span className="text-[10px] font-mono text-black/55">
                {r.score} {r.score === 1 ? "sinal" : "sinais"}{d ? ` · ${d}` : ""}
            </span>
        </div>
    );
}

export default function Topologia() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async (bg = false) => {
        if (!bg) setLoading(true);
        try {
            const { data } = await api.get("/pulse/topology");
            setData(data);
        } catch { /* silent — ambiental */ } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(false); }, [load]);

    // Atualiza ao vivo no tick do pulso.
    const onWs = useCallback((msg) => {
        if (msg && msg.type === "pulse_tick") load(true);
    }, [load]);
    useWsMessages(onWs);

    const regions = data?.regions || [];
    const byKey = Object.fromEntries(regions.map((r) => [r.key, r]));
    const meaningfulCities = data?.meaningful_cities || [];
    const anySignal = regions.some((r) => (r.score || 0) > 0);

    return (
        <div data-testid="topologia-page">
            <PageHeader
                title="Topologia"
                subtitle="O mapa social a respirar — onde Portugal está mais aceso agora. Só sinal real, granularidade cidade."
                testid="topologia-header"
            />

            <div className="px-4 lg:px-5 py-4">
                {loading ? (
                    <div className="py-16 text-center text-black/40 text-[13px]">A ler o pulso do país…</div>
                ) : !anySignal ? (
                    <div className="px-6 py-20 text-center anim-fade-up">
                        <div className="ring-silver w-20 h-20 rounded-full grid place-items-center mx-auto mb-6">
                            <Activity size={26} strokeWidth={1.4} className="text-black/70" />
                        </div>
                        <h3 className="font-display text-[19px] font-bold tracking-tight text-black">A rede está calma.</h3>
                        <p className="text-black/55 text-[14px] mt-3 max-w-xs mx-auto leading-relaxed">
                            Sem picos de atividade neste momento. O mapa acende quando o país se mexe.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5 anim-fade-up">
                        {/* Mapa esquemático */}
                        <div className="card-lux p-4">
                            <div className="grid grid-cols-[88px_1fr] gap-3">
                                {/* Ilhas à esquerda */}
                                <div className="flex flex-col justify-end gap-3">
                                    {ISLANDS.map((k) => <RegionTile key={k} r={byKey[k]} />)}
                                </div>
                                {/* Continente em coluna */}
                                <div className="flex flex-col gap-3">
                                    {MAINLAND.map((k) => <RegionTile key={k} r={byKey[k]} />)}
                                </div>
                            </div>
                        </div>

                        {/* Cidades a crescer */}
                        <div className="card-lux p-4">
                            <div className="type-overline mb-3 flex items-center gap-1.5 text-black/55">
                                <MapPin size={13} /> Cidades a crescer
                            </div>
                            {meaningfulCities.length === 0 ? (
                                <p className="text-[12.5px] text-black/45 leading-relaxed">
                                    Nenhuma cidade com pico significativo agora.
                                </p>
                            ) : (
                                <ul className="space-y-2.5">
                                    {meaningfulCities.slice(0, 12).map((c) => {
                                        const d = fmtDelta(c.delta_pct);
                                        return (
                                            <li key={c.key} className="flex items-center gap-2.5" data-testid={`topo-city-${c.key}`}>
                                                <span className="live-dot shrink-0" aria-hidden />
                                                <span className="text-[13.5px] font-medium tracking-tight text-black flex-1 truncate">{c.label}</span>
                                                {d && <span className="text-[11px] font-mono text-[var(--eu-500)]">{d}</span>}
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
