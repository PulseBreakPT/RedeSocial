import { useState } from "react";
import { X, Pencil } from "lucide-react";
import { api, formatApiError, toastApiError } from "../lib/api";
import { toast } from "sonner";

export function EditPostModal({ post, onSave, onClose }) {
    const [content, setContent] = useState(post.content);
    const [busy, setBusy] = useState(false);
    const remaining = 500 - content.length;

    const save = async () => {
        if (!content.trim()) return;
        setBusy(true);
        try {
            const { data } = await api.patch(`/posts/${post.id}`, { content });
            toast.success("Publicação editada");
            onSave?.(data);
            onClose();
        } catch (err) {
            toastApiError(err);
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[80] bg-black/30 backdrop-blur-sm grid place-items-center p-4" onClick={onClose} data-testid="edit-post-modal">
            <div
                className="w-full max-w-lg bg-white border border-black/[0.08] rounded-2xl shadow-[0_30px_80px_-20px_rgba(13,13,16,0.3)] anim-fade-up overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-6 py-4 hairline-b">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full grid place-items-center bg-black/[0.04] border border-black/[0.06]">
                            <Pencil size={14} strokeWidth={1.6} className="text-black/65" />
                        </div>
                        <div>
                            <h2 className="font-display text-[22px] tracking-tight leading-none text-black">Editar publicação</h2>
                            <p className="type-overline mt-1">Edita até 15 minutos após publicar</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-9 h-9 rounded-full grid place-items-center hover:bg-black/[0.04] text-black/55">
                        <X size={16} strokeWidth={1.7} />
                    </button>
                </div>
                <div className="p-6">
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        maxLength={500}
                        rows={5}
                        data-testid="edit-post-textarea"
                        className="w-full bg-[#fafafa] border border-black/[0.08] rounded-2xl px-4 py-3.5 text-[15px] focus:border-black/30 focus:bg-white focus:outline-none transition resize-none"
                    />
                    <div className="flex items-center justify-between mt-4">
                        <span className={`font-mono text-[10px] uppercase tracking-[0.16em] ${remaining < 40 ? "text-red-soft" : "text-black/40"}`}>
                            {remaining} restantes
                        </span>
                        <button
                            onClick={save}
                            disabled={busy || !content.trim() || content === post.content}
                            data-testid="save-edit-btn"
                            className="btn-obsidian text-[11px] px-6 py-2.5 disabled:opacity-40"
                        >
                            {busy ? "…" : "Guardar"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
