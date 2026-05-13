import { useMemo } from "react";
import {
    HardDrive, Download, Trash2, Database, FileJson, FileSpreadsheet,
    Package, Archive, AlertTriangle, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";

/* Mock storage breakdown — calibrated to look real */
function computeStorageBreakdown(user, prefs) {
    const cats = [
        { key: "avatars", label: "Avatares & capas", mb: (user?.avatar ? 1.4 : 0) + (user?.banner ? 1.8 : 0), color: "#0a0a0a" },
        { key: "posts", label: "Posts e texto", mb: 0.4, color: "#3a3a3e" },
        { key: "media", label: "Media (fotos, vídeos)", mb: 3.2, color: "#6b6b75" },
        { key: "messages", label: "Mensagens diretas", mb: 0.8, color: "#9a9aa3" },
        { key: "cache", label: "Cache local", mb: 1.6, color: "#c8c8ce" },
    ];
    const total = cats.reduce((s, c) => s + c.mb, 0);
    return { cats, totalMb: total };
}

function Bar({ pct, color }) {
    return (
        <div className="h-full" style={{ width: `${pct}%`, background: color }} />
    );
}

export function DataTab({ user, prefs }) {
    const { cats, totalMb } = useMemo(() => computeStorageBreakdown(user, prefs), [user, prefs]);
    const totalPct = (mb) => (totalMb > 0 ? (mb / totalMb) * 100 : 0);

    const onExport = (format) => {
        if (format === "json") {
            const blob = new Blob([JSON.stringify({ user, prefs, exportedAt: new Date().toISOString() }, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url; a.download = `vermillion-${user?.username || "user"}-${Date.now()}.json`; a.click();
            URL.revokeObjectURL(url);
            toast.success("Exportação JSON iniciada");
        } else if (format === "csv") {
            /* Simple CSV from user fields */
            const rows = [
                ["field", "value"],
                ...Object.entries(user || {}).map(([k, v]) => [k, typeof v === "object" ? JSON.stringify(v) : String(v ?? "")]),
            ];
            const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
            const blob = new Blob([csv], { type: "text/csv" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url; a.download = `vermillion-${user?.username || "user"}-${Date.now()}.csv`; a.click();
            URL.revokeObjectURL(url);
            toast.success("Exportação CSV iniciada");
        } else if (format === "zip") {
            /* ZIP would need a library — mocked for now */
            toast.info("Pacote ZIP será preparado e enviado por email em até 24h (mock)");
        }
    };

    const onClearCache = () => {
        let cleared = 0;
        try {
            Object.keys(localStorage).forEach((k) => {
                if (k.startsWith("cache.") || k.startsWith("__cache_")) {
                    localStorage.removeItem(k);
                    cleared++;
                }
            });
            if ("caches" in window) {
                caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
            }
        } catch {}
        toast.success(cleared > 0 ? `${cleared} entradas de cache removidas` : "Cache local limpa");
    };

    const onDeleteAccount = () => {
        const c = window.prompt('Para confirmar, escreve "APAGAR" (em maiúsculas):');
        if (c !== "APAGAR") return toast.info("Eliminação cancelada");
        toast.error("Funcionalidade em breve · pendente de confirmação por email");
    };

    return (
        <div className="px-4 lg:px-6 py-5 space-y-6 max-w-2xl" data-testid="settings-data">
            {/* Storage overview */}
            <section>
                <div className="flex items-center gap-2 mb-3">
                    <HardDrive size={14} strokeWidth={1.8} className="text-black/60" />
                    <p className="type-overline mb-0">Uso de armazenamento</p>
                </div>
                <div className="card-lux p-5">
                    <div className="flex items-baseline justify-between mb-2">
                        <div>
                            <div className="font-display text-[28px] font-bold tabular-nums text-black leading-none">
                                {totalMb.toFixed(1)}<span className="text-[14px] text-black/45 ml-1">MB</span>
                            </div>
                            <p className="text-[11.5px] text-black/55 mt-1">de um limite de 500MB no plano grátis</p>
                        </div>
                        <div className="text-right">
                            <div className="text-[11px] font-mono tracking-wider uppercase text-black/45 tabular-nums">{((totalMb / 500) * 100).toFixed(1)}% usado</div>
                        </div>
                    </div>

                    {/* Stacked bar */}
                    <div className="h-3 rounded-full overflow-hidden flex bg-black/[0.04] mt-3">
                        {cats.map((c) => (
                            <Bar key={c.key} pct={totalPct(c.mb)} color={c.color} />
                        ))}
                    </div>

                    {/* Legend */}
                    <div className="mt-4 space-y-2">
                        {cats.map((c) => (
                            <div key={c.key} className="flex items-center gap-3 text-[12.5px]">
                                <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: c.color }} />
                                <span className="flex-1 text-black/75">{c.label}</span>
                                <span className="font-mono tabular-nums text-black/55">{c.mb.toFixed(1)} MB</span>
                            </div>
                        ))}
                    </div>

                    <button
                        onClick={onClearCache}
                        data-testid="data-clear-cache"
                        className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-black/[0.04] hover:bg-black/[0.08] text-[12px] font-medium tap-shrink transition"
                    >
                        <RefreshCw size={12} strokeWidth={1.8} /> Limpar cache local
                    </button>
                </div>
            </section>

            {/* Export options */}
            <section>
                <div className="flex items-center gap-2 mb-3">
                    <Download size={14} strokeWidth={1.8} className="text-black/60" />
                    <p className="type-overline mb-0">Exportar os teus dados</p>
                </div>
                <p className="text-[12.5px] text-black/55 leading-relaxed mb-3">
                    Direito à portabilidade (RGPD Art. 20.º). Recebe uma cópia completa do que armazenamos.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <ExportTile
                        icon={FileJson}
                        title="JSON"
                        sub="Estrutura completa, ideal para developers"
                        onClick={() => onExport("json")}
                        dataTestid="data-export-json"
                        instant
                    />
                    <ExportTile
                        icon={FileSpreadsheet}
                        title="CSV"
                        sub="Para abrir no Excel ou Numbers"
                        onClick={() => onExport("csv")}
                        dataTestid="data-export-csv"
                        instant
                    />
                    <ExportTile
                        icon={Archive}
                        title="ZIP completo"
                        sub="Inclui media + texto + DM"
                        onClick={() => onExport("zip")}
                        dataTestid="data-export-zip"
                        delayed
                    />
                </div>
            </section>

            {/* Data hygiene */}
            <section>
                <div className="flex items-center gap-2 mb-3">
                    <Database size={14} strokeWidth={1.8} className="text-black/60" />
                    <p className="type-overline mb-0">Higiene de dados</p>
                </div>
                <div className="card-lux divide-y divide-black/[0.06]">
                    <DataRow
                        icon={Package}
                        title="Auto-arquivar posts antigos"
                        sub="Posts com mais de 1 ano são movidos para um arquivo privado"
                        action={
                            <span className="text-[11px] font-mono tracking-wider uppercase text-black/45">Em breve</span>
                        }
                    />
                    <DataRow
                        icon={RefreshCw}
                        title="Limpar pesquisas guardadas"
                        sub="Apaga o histórico de pesquisas do teu dispositivo"
                        action={
                            <button
                                onClick={() => {
                                    try {
                                        localStorage.removeItem("recent_searches");
                                        toast.success("Pesquisas recentes apagadas");
                                    } catch {}
                                }}
                                data-testid="data-clear-searches"
                                className="text-[11.5px] px-3 py-1.5 rounded-full bg-black/[0.04] hover:bg-black/[0.08] font-medium tap-shrink"
                            >
                                Limpar
                            </button>
                        }
                    />
                </div>
            </section>

            {/* Danger zone */}
            <section>
                <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle size={14} strokeWidth={1.8} className="text-red-soft" />
                    <p className="type-overline mb-0 text-red-soft">Zona perigosa</p>
                </div>
                <div className="rounded-2xl border border-red-soft/25 bg-red-soft/[0.04] p-5">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl grid place-items-center shrink-0 bg-red-soft/10 text-red-soft">
                            <Trash2 size={17} strokeWidth={1.7} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="font-heading font-semibold text-[14px] tracking-tight text-black">Apagar conta permanentemente</div>
                            <div className="text-[12px] text-black/65 mt-1 leading-relaxed">
                                Esta ação é irreversível. Todos os teus posts, mensagens e dados serão apagados em até 30 dias.
                                Receberás um email de confirmação para concluir.
                            </div>
                            <button
                                onClick={onDeleteAccount}
                                data-testid="data-delete-account"
                                className="mt-3 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-red-soft text-white hover:bg-red-soft/90 text-[12px] font-medium tap-shrink transition"
                            >
                                <Trash2 size={13} strokeWidth={1.8} /> Iniciar processo de eliminação
                            </button>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}

function ExportTile({ icon: Icon, title, sub, onClick, dataTestid, instant, delayed }) {
    return (
        <button
            type="button"
            onClick={onClick}
            data-testid={dataTestid}
            className="group card-lux p-4 text-left hover:shadow-md transition tap-shrink"
        >
            <div className="w-10 h-10 rounded-xl bg-black/[0.04] grid place-items-center mb-3 text-black/75 group-hover:bg-black/[0.08] transition">
                <Icon size={17} strokeWidth={1.7} />
            </div>
            <div className="font-heading font-semibold text-[13.5px] tracking-tight text-black flex items-center gap-1.5">
                {title}
                {instant && <span className="text-[9px] font-mono uppercase tracking-[0.1em] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">Instant</span>}
                {delayed && <span className="text-[9px] font-mono uppercase tracking-[0.1em] px-1.5 py-0.5 rounded-full bg-black/[0.05] text-black/55">24h</span>}
            </div>
            <div className="text-[11.5px] text-black/55 mt-1 leading-snug">{sub}</div>
        </button>
    );
}

function DataRow({ icon: Icon, title, sub, action }) {
    return (
        <div className="flex items-center gap-3 p-3.5">
            <div className="w-9 h-9 rounded-xl grid place-items-center shrink-0 bg-black/[0.04] text-black/70">
                <Icon size={15} strokeWidth={1.8} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="font-heading font-semibold text-[13.5px] tracking-tight text-black">{title}</div>
                <div className="text-[11.5px] text-black/55 mt-0.5 leading-snug">{sub}</div>
            </div>
            {action}
        </div>
    );
}
