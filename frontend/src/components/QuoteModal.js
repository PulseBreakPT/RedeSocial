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
            toast.error("Escreva um comentário para citar");
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
        <div className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm grid place-items-center p-4" onClick={onClose} data-testid="quote-modal">
            <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-900">
                    <div className="flex items-center gap-2">
                        <Quote size={16} className="text-emerald-400" />
                        <h2 className="font-heading text-lg font-bold">Citar publicação</h2>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-white/5">
                        <X size={16} />
                    </button>
                </div>
                <div className="p-5">
                    <div className="flex gap-3">
                        <Avatar user={user} size={40} />
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Adicione um comentário..."
                            maxLength={500}
                            rows={3}
                            autoFocus
                            data-testid="quote-textarea"
                            className="flex-1 bg-transparent text-base focus:outline-none resize-none placeholder:text-zinc-600"
                        />
                    </div>
                    <div className="mt-3 ml-12 p-3 border border-zinc-800 rounded-xl bg-zinc-900/50">
                        <div className="flex items-center gap-2 text-sm">
                            <Avatar user={post.author} size={24} />
                            <span className="font-heading font-semibold">{post.author?.name}</span>
                            {post.author?.verified && <VerifiedBadge size={11} />}
                            <span className="font-mono text-xs text-zinc-500">@{post.author?.username}</span>
                        </div>
                        <p className="mt-2 text-sm text-zinc-300 line-clamp-3">{post.content}</p>
                    </div>
                    <div className="flex items-center justify-between mt-4">
                        <span className={`font-mono text-xs ${remaining < 40 ? "text-accent-vermillion" : "text-zinc-500"}`}>{remaining}</span>
                        <button
                            onClick={submit}
                            disabled={busy || !content.trim()}
                            data-testid="submit-quote-btn"
                            className="bg-accent-vermillion text-white font-heading font-semibold uppercase tracking-wide text-xs px-6 py-2.5 rounded-full hover:bg-[#FF7A50] disabled:opacity-40 active:scale-95"
                        >
                            {busy ? "..." : "Citar"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
