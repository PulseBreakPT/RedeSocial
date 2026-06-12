import { useCallback, useEffect, useState } from "react";
// =============================================================================
// DESIGN SYSTEM: LUSORAE EDITORIAL — ver /src/theme/EDITORIAL.md
// =============================================================================
import { MapPin, Activity } from "lucide-react";
import { api } from "../lib/api";
import { PageShell, PageHero, Empty } from "../components/PageShell";
import { PT } from "../theme/editorial";
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
        <PageShell max="max-w-5xl">
            <PageHero
                title="Topologia"
                subtitle="O mapa social a respirar — onde Portugal está mais aceso agora. Só sinal real, granularidade cidade."
                badge="Mapa social ao vivo"
                accent={PT.brasa}
            />

            <div className="px-4 lg:px-7 pt-6 pb-12">
                {loading ? (
                    <div className="py-16 text-center font-mono font-bold uppercase" style={{ fontSize: 11, letterSpacing: "0.18em", color: "rgba(10,10,10,0.42)" }}>A ler o pulso do país…</div>
                ) : !anySignal ? (
                    <Empty icon={Activity} title="A rede está calma" body="Sem picos de atividade neste momento. O mapa acende quando o país se mexe." />
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5">
                        <div className="p-5" style={{ background: "#fff", border: "1px solid rgba(10,10,10,0.08)", borderRadius: 20, boxShadow: "0 1px 2px rgba(10,10,10,0.04), 0 10px 22px -14px rgba(10,10,10,0.10)" }}>
                            <p className="font-mono font-bold uppercase mb-4 inline-flex items-center gap-1.5" style={{ fontSize: 10.5, letterSpacing: "0.22em", color: PT.brasa }}>
                                <span className="relative flex h-1.5 w-1.5" aria-hidden>
                                    <span className="absolute inline-flex h-full w-full rounded-full lusorae-pulse" style={{ background: PT.brasa }} />
                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: PT.brasa }} />
                                </span>
                                Regiões
                            </p>
                            <div className="grid grid-cols-[88px_1fr] gap-3">
                                <div className="flex flex-col justify-end gap-3">
                                    {ISLANDS.map((k) => <RegionTile key={k} r={byKey[k]} />)}
                                </div>
                                <div className="flex flex-col gap-3">
                                    {MAINLAND.map((k) => <RegionTile key={k} r={byKey[k]} />)}
                                </div>
                            </div>
                        </div>

                        <div className="p-5" style={{ background: "#fff", border: "1px solid rgba(10,10,10,0.08)", borderRadius: 20, boxShadow: "0 1px 2px rgba(10,10,10,0.04), 0 10px 22px -14px rgba(10,10,10,0.10)" }}>
                            <p className="font-mono font-bold uppercase mb-4 inline-flex items-center gap-1.5" style={{ fontSize: 10.5, letterSpacing: "0.22em", color: PT.green }}>
                                <MapPin size={11} strokeWidth={2.6} /> Cidades a crescer
                            </p>
                            {meaningfulCities.length === 0 ? (
                                <p className="text-[12.5px] leading-relaxed font-medium" style={{ color: "rgba(10,10,10,0.45)" }}>
                                    Nenhuma cidade com pico significativo agora.
                                </p>
                            ) : (
                                <ul className="space-y-2.5">
                                    {meaningfulCities.slice(0, 12).map((c) => {
                                        const d = fmtDelta(c.delta_pct);
                                        return (
                                            <li key={c.key} className="flex items-center gap-2.5" data-testid={`topo-city-${c.key}`}>
                                                <span className="relative flex h-1.5 w-1.5 shrink-0" aria-hidden>
                                                    <span className="absolute inline-flex h-full w-full rounded-full lusorae-pulse" style={{ background: PT.green }} />
                                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: PT.green }} />
                                                </span>
                                                <span className="text-[13.5px] font-black tracking-tight flex-1 truncate" style={{ color: PT.ink }}>{c.label}</span>
                                                {d && <span className="text-[10.5px] font-mono font-bold uppercase" style={{ color: PT.green, letterSpacing: "0.10em" }}>{d}</span>}
                                            </li>
                                        );
                                    })}
                                </ul>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </PageShell>
    );
}
