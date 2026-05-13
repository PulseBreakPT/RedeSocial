import { useState } from "react";
import { X } from "lucide-react";
import { api, formatApiError } from "../lib/api";
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
            toast.error(formatApiError(err));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm grid place-items-center p-4" onClick={onClose} data-testid="edit-post-modal">
            <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-900">
                    <div>
                        <h2 className="font-heading text-lg font-bold">Editar publicação</h2>
                        <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">você tem 15 min após publicar</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-white/5">
                        <X size={16} />
                    </button>
                </div>
                <div className="p-5">
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        maxLength={500}
                        rows={5}
                        data-testid="edit-post-textarea"
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-base focus:border-accent-vermillion outline-none resize-none"
                    />
                    <div className="flex items-center justify-between mt-3">
                        <span className={`font-mono text-xs ${remaining < 40 ? "text-accent-vermillion" : "text-zinc-500"}`}>{remaining}</span>
                        <button
                            onClick={save}
                            disabled={busy || !content.trim() || content === post.content}
                            data-testid="save-edit-btn"
                            className="bg-accent-vermillion text-white font-heading font-semibold uppercase tracking-wide text-xs px-6 py-2.5 rounded-full hover:bg-[#FF7A50] transition disabled:opacity-40 active:scale-95"
                        >
                            {busy ? "..." : "Salvar"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
