import { useState } from "react";
import { X, Quote } from "lucide-react";
import { api, formatApiError, toastApiError } from "../lib/api";
import { Avatar } from "./Avatar";
import { VerifiedBadge } from "./VerifiedBadge";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";

const MAX_LEN = 500;

export function QuoteModal({ post, onClose, onQuoted }) {
    const { user } = useAuth();
    const [content, setContent] = useState("");
    const [busy, setBusy] = useState(false);
    const remaining = MAX_LEN - content.length;
    const pct = Math.min(100, (content.length / MAX_LEN) * 100);
    const danger = remaining < 40;

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
            toastApiError(err);
        } finally {
            setBusy(false);
        }
    };

    // Progress ring math (radius 9, circumference ≈ 56.55)
    const C = 2 * Math.PI * 9;
    const dash = (pct / 100) * C;

    return (
        <div
            className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-md grid place-items-center p-4"
            onClick={onClose}
            data-testid="quote-modal"
        >
            <div
                className="w-full max-w-lg bg-white border border-black/[0.06] rounded-3xl shadow-[0_40px_100px_-24px_rgba(13,13,16,0.35),0_8px_24px_-8px_rgba(13,13,16,0.10)] anim-fade-up overflow-hidden flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 hairline-b">
                    <div className="flex items-center gap-3 min-w-0">
                        <div
                            className="w-10 h-10 rounded-full grid place-items-center text-white shadow-[0_4px_14px_-4px_rgba(200,16,46,0.55)]"
                            style={{ background: "linear-gradient(135deg, #C8102E 0%, #FFCC29 100%)" }}
                        >
                            <Quote size={16} strokeWidth={2} />
                        </div>
                        <div className="min-w-0">
                            <p className="type-overline">Citar</p>
                            <h2 className="font-display text-[22px] tracking-tight leading-none text-black truncate">
                                Adiciona o teu pensamento
                            </h2>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-9 h-9 rounded-full grid place-items-center hover:bg-black/[0.05] text-black/55 hover:text-black tap-shrink transition flex-shrink-0"
                        aria-label="Fechar"
                    >
                        <X size={16} strokeWidth={1.8} />
                    </button>
                </div>

                {/* Body — scrollable if needed */}
                <div className="p-6 overflow-y-auto">
                    <div className="flex gap-3">
                        <Avatar user={user} size={40} />
                        <textarea
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                            placeholder="Adiciona um comentário…"
                            maxLength={MAX_LEN}
                            rows={3}
                            autoFocus
                            data-testid="quote-textarea"
                            className="flex-1 bg-transparent text-[16px] focus:outline-none resize-none placeholder:text-black/35 font-body leading-relaxed"
                            onKeyDown={(e) => {
                                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                                    e.preventDefault();
                                    submit();
                                }
                            }}
                        />
                    </div>

                    {/* Quoted post preview with PT gradient bar */}
                    <div
                        className="mt-4 ml-[52px] pl-4 pr-3.5 py-3 rounded-2xl border border-black/[0.07] relative overflow-hidden"
                        style={{ background: "rgba(247,245,239,0.65)" }}
                    >
                        <span
                            aria-hidden
                            className="absolute left-0 top-0 bottom-0 w-[3px]"
                            style={{ background: "linear-gradient(180deg, #C8102E 0%, #FFCC29 100%)", opacity: 0.9 }}
                        />
                        <div className="flex items-center gap-2 text-sm min-w-0">
                            <Avatar user={post.author} size={22} />
                            <span className="font-heading font-semibold text-[13px] tracking-tight truncate">{post.author?.name}</span>
                            {post.author?.verified && <VerifiedBadge size={11} />}
                            <span className="font-mono text-[11px] text-black/45 truncate">@{post.author?.username}</span>
                        </div>
                        <p
                            className="mt-1.5 text-[13.5px] text-black/72 line-clamp-3 leading-relaxed font-editorial italic"
                            style={{ fontVariationSettings: '"opsz" 20, "SOFT" 50', fontWeight: 460 }}
                        >
                            {post.content}
                        </p>
                    </div>
                </div>

                {/* Sticky footer */}
                <div className="px-6 py-4 hairline-t flex items-center justify-between bg-white">
                    <div className="flex items-center gap-2.5">
                        {/* Circular progress for char limit */}
                        <svg width={24} height={24} viewBox="0 0 24 24" className="-rotate-90">
                            <circle cx={12} cy={12} r={9} stroke="rgba(13,13,16,0.08)" strokeWidth={2} fill="none" />
                            <circle
                                cx={12}
                                cy={12}
                                r={9}
                                stroke={danger ? "var(--coral-500)" : "var(--atl-500)"}
                                strokeWidth={2}
                                strokeLinecap="round"
                                fill="none"
                                strokeDasharray={`${dash} ${C}`}
                                style={{ transition: "stroke-dasharray 200ms ease, stroke 200ms ease" }}
                            />
                        </svg>
                        <span
                            className={`font-mono text-[11px] uppercase tracking-[0.14em] tabular-nums ${
                                danger ? "text-[var(--coral-500)]" : "text-black/45"
                            }`}
                        >
                            {remaining} restantes
                        </span>
                    </div>
                    <button
                        onClick={submit}
                        disabled={busy || !content.trim()}
                        data-testid="submit-quote-btn"
                        className="btn-obsidian text-[11px] px-6 py-2.5 disabled:opacity-40 inline-flex items-center gap-2"
                    >
                        {busy ? "…" : (<><Quote size={11} /> Citar</>)}
                    </button>
                </div>
            </div>
        </div>
    );
}
