import { useState } from "react";
import { X } from "lucide-react";
import { Spinner } from "./Spinner";

const REASONS = [
    { key: "spam", label: "Spam" },
    { key: "harassment", label: "Assédio / Bullying" },
    { key: "hate", label: "Discurso de ódio" },
    { key: "misinformation", label: "Desinformação" },
    { key: "nsfw", label: "Conteúdo impróprio" },
    { key: "violence", label: "Violência" },
    { key: "other", label: "Outro" },
];

export function ReportModal({ targetLabel, onCancel, onSubmit }) {
    const [reason, setReason] = useState("spam");
    const [detail, setDetail] = useState("");
    const [busy, setBusy] = useState(false);
    return (
        <div className="fixed inset-0 z-[400] bg-black/45 backdrop-blur-sm grid place-items-center p-4 anim-fade-up" onClick={onCancel}>
            <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <p className="type-overline">Reportar</p>
                        <h3 className="font-display text-[20px] tracking-tight">{targetLabel}</h3>
                    </div>
                    <button onClick={onCancel} className="text-black/40 hover:text-black tap-shrink"><X size={18} /></button>
                </div>
                <div className="space-y-1 mb-3">
                    {REASONS.map((r) => (
                        <button
                            key={r.key}
                            onClick={() => setReason(r.key)}
                            data-testid={`report-reason-${r.key}`}
                            className={`w-full text-left px-3 py-2 rounded-xl text-[13.5px] font-mono transition ${
                                reason === r.key ? "bg-black text-white" : "bg-black/[0.04] hover:bg-black/[0.08] text-black/75"
                            }`}
                        >
                            {r.label}
                        </button>
                    ))}
                </div>
                <textarea
                    value={detail} onChange={(e) => setDetail(e.target.value)}
                    rows={3} maxLength={400}
                    placeholder="Detalhes (opcional)…"
                    data-testid="report-detail"
                    className="w-full bg-[#fafafa] border border-black/[0.08] rounded-2xl px-3 py-2 text-[13.5px] focus:bg-white focus:border-black/30 focus:outline-none resize-none mb-3"
                />
                <div className="flex justify-end gap-2">
                    <button onClick={onCancel} className="px-4 py-2 text-[11px] font-mono uppercase tracking-[0.14em] text-black/60 hover:text-black rounded-full hover:bg-black/[0.04]">
                        Cancelar
                    </button>
                    <button
                        onClick={async () => { setBusy(true); await onSubmit({ reason, detail }); setBusy(false); }}
                        disabled={busy}
                        data-testid="report-submit"
                        className="btn-obsidian text-[11px] px-5 py-2 disabled:opacity-40 inline-flex items-center gap-1.5"
                    >
                        {busy && <Spinner size={11} />} Submeter
                    </button>
                </div>
            </div>
        </div>
    );
}
