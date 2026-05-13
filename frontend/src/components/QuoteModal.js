import { useState } from "react";
import { X, Quote } from "lucide-react";
import { api, formatApiError } from "../lib/api";
import { Avatar } from "./Avatar";
import { VerifiedBadge } from "./VerifiedBadge";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";

export function QuoteModal({ post, onClose, onQuoted }) {
    const { user } = useAuth();
    const [content, setContent] = useState("");
    const [busy, setBusy] = useState(false);
    const remaining = 500 - content.length;

    const submit = async () => {
        if (!content.trim()) {
            toast.error("Escreve um comentário para citar");
            return;
        }
        setBusy(true);
        try {
            const { data } = await api.post("/posts", { content, quote_of: post.id });
            toast.success("Citação publicada");
            onQuoted?.(data);
            onClose();
        } catch (err) {
            toast.error(formatApiError(err));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[80] bg-black/30 backdrop-blur-sm grid place-items-center p-4" onClick={onClose} data-testid="quote-modal">
            <div
                className="w-full max-w-lg bg-white border border-black/[0.08] rounded-2xl shadow-[0_30px_80px_-20px_rgba(13,13,16,0.3)] anim-fade-up overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-6 py-4 hairline-b">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full grid place-items-center bg-black/[0.04] border border-black/[0.06]">
                            <Quote size={14} strokeWidth={1.6} className="text-black/65" />
                        </div>
                        <div>
                            <h2 className="font-display text-[22px] tracking-tight leading-none text-black">Citar publicação</h2>
                            <p className="type-overline mt-1">Adiciona um comentário</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-9 h-9 rounded-full grid place-items-center hover:bg-black/[0.04] text-black/55">
                        <X size={16} strokeWidth={1.7} />
                    </button>
                </div>
                <div className="p-6">
                    <div className="flex gap-3">
                        <Avatar user={user} size={40} />
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Adiciona um comentário…"
                            maxLength={500}
                            rows={3}
                            autoFocus
                            data-testid="quote-textarea"
                            className="flex-1 bg-transparent text-[16px] focus:outline-none resize-none placeholder:text-black/35 font-body"
                        />
                    </div>
                    <div className="mt-4 ml-[52px] p-4 hairline rounded-2xl bg-paper">
                        <div className="flex items-center gap-2 text-sm">
                            <Avatar user={post.author} size={22} />
                            <span className="font-heading font-medium text-[13px] tracking-tight">{post.author?.name}</span>
                            {post.author?.verified && <VerifiedBadge size={11} />}
                            <span className="font-mono text-[11px] text-black/45">@{post.author?.username}</span>
                        </div>
                        <p className="mt-2 text-[13.5px] text-black/70 line-clamp-3 leading-relaxed">{post.content}</p>
                    </div>
                    <div className="flex items-center justify-between mt-5">
                        <span className={`font-mono text-[10px] uppercase tracking-[0.16em] ${remaining < 40 ? "text-red-soft" : "text-black/40"}`}>
                            {remaining} restantes
                        </span>
                        <button
                            onClick={submit}
                            disabled={busy || !content.trim()}
                            data-testid="submit-quote-btn"
                            className="btn-obsidian text-[11px] px-6 py-2.5 disabled:opacity-40"
                        >
                            {busy ? "…" : "Citar"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
