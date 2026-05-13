import { useState } from "react";
import { X, History } from "lucide-react";
import { smartTime, fullTime } from "../lib/time";

export function EditHistoryModal({ history = [], onClose, currentContent }) {
    return (
        <div
            className="fixed inset-0 z-[70] bg-black/40 backdrop-blur-sm grid place-items-center p-4"
            onClick={onClose}
            data-testid="edit-history-modal"
        >
            <div
                className="bg-white rounded-3xl border border-black/[0.08] w-full max-w-md max-h-[80vh] overflow-y-auto shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="sticky top-0 bg-white/95 backdrop-blur border-b border-black/[0.06] px-5 py-3 flex items-center gap-2">
                    <History size={16} />
                    <h3 className="font-heading font-bold text-base flex-1">Histórico de edições</h3>
                    <button onClick={onClose} className="p-1.5 hover:bg-black/[0.04] rounded-full tap-shrink" data-testid="edit-history-close">
                        <X size={16} />
                    </button>
                </div>
                <div className="p-5 space-y-3">
                    <div className="rounded-2xl border border-black/[0.08] p-3">
                        <div className="text-[11px] font-mono text-green-soft uppercase tracking-wide mb-1.5">Atual</div>
                        <p className="text-sm text-black whitespace-pre-wrap">{currentContent}</p>
                    </div>
                    {history.length === 0 && (
                        <p className="text-sm text-black/50 text-center py-4 font-mono">Sem edições anteriores</p>
                    )}
                    {[...history].reverse().map((h, i) => (
                        <div key={i} className="rounded-2xl border border-black/[0.08] p-3 bg-black/[0.02]">
                            <div className="text-[11px] font-mono text-black/50 mb-1.5" title={fullTime(h.edited_at)}>
                                {smartTime(h.edited_at)}
                            </div>
                            <p className="text-sm text-black/80 whitespace-pre-wrap">{h.content}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export function EditHistoryButton({ history, currentContent }) {
    const [open, setOpen] = useState(false);
    if (!history || history.length === 0) return null;
    return (
        <>
            <button
                onClick={(e) => { e.stopPropagation(); setOpen(true); }}
                data-testid="edit-history-btn"
                className="text-[10px] font-mono text-black/50 hover:text-black underline-offset-2 hover:underline tap-shrink"
            >
                {history.length} {history.length === 1 ? "edição" : "edições"}
            </button>
            {open && <EditHistoryModal history={history} onClose={() => setOpen(false)} currentContent={currentContent} />}
        </>
    );
}
