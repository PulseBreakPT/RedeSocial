import { useEffect, useState, useRef } from "react";
import { Repeat2, Quote, Check } from "lucide-react";

function formatNum(n) {
    if (!n) return "0";
    if (n < 1000) return String(n);
    if (n < 1000000) return `${(n / 1000).toFixed(1).replace(".0", "")}K`;
    return `${(n / 1000000).toFixed(1).replace(".0", "")}M`;
}

export function RepostMenu({ reposted, count = 0, onRepost, onQuote, postId }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const close = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        };
        const onKey = (e) => {
            if (e.key === "Escape") setOpen(false);
        };
        document.addEventListener("mousedown", close);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", close);
            document.removeEventListener("keydown", onKey);
        };
    }, []);

    return (
        <div ref={ref} className="relative inline-block">
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setOpen(!open);
                }}
                data-testid={postId ? `repost-btn-${postId}` : undefined}
                className={`eng-btn ${reposted ? "is-reposted" : ""}`}
                aria-label="Republicar ou citar"
                aria-haspopup="menu"
                aria-expanded={open}
            >
                <Repeat2 size={18} strokeWidth={1.7} />
                <span
                    className="text-[12.5px] tabular-nums"
                    data-testid={postId ? `repost-count-${postId}` : undefined}
                >
                    {formatNum(count)}
                </span>
            </button>
            {open && (
                <div
                    role="menu"
                    onClick={(e) => e.stopPropagation()}
                    className="absolute left-0 top-full mt-2 z-30 bg-white border border-black/[0.06] rounded-2xl p-1.5 min-w-[268px] shadow-[0_24px_60px_-16px_rgba(13,13,16,0.22),0_4px_12px_-4px_rgba(13,13,16,0.08)] anim-fade-up overflow-hidden"
                >
                    <button
                        role="menuitem"
                        onClick={() => {
                            onRepost?.();
                            setOpen(false);
                        }}
                        data-testid={postId ? `repost-action-${postId}` : undefined}
                        className="w-full text-left flex items-start gap-3 px-3 py-2.5 rounded-xl hover:bg-[rgba(2,158,110,0.06)] transition group"
                    >
                        <span className="flex-shrink-0 mt-0.5 w-8 h-8 rounded-full grid place-items-center bg-[rgba(2,158,110,0.08)] text-green-soft transition group-hover:bg-[rgba(2,158,110,0.14)]">
                            {reposted ? <Check size={15} strokeWidth={2} /> : <Repeat2 size={15} strokeWidth={1.8} />}
                        </span>
                        <span className="flex flex-col gap-0.5 min-w-0">
                            <span className="font-heading font-semibold text-[13.5px] tracking-tight text-black">
                                {reposted ? "Desfazer republicação" : "Republicar"}
                            </span>
                            <span className="font-mono text-[11px] text-black/50 leading-snug">
                                {reposted
                                    ? "Remove esta publicação do teu perfil"
                                    : "Partilha esta publicação com os teus seguidores"}
                            </span>
                        </span>
                    </button>
                    <div className="h-px bg-black/[0.05] mx-2 my-0.5" aria-hidden />
                    <button
                        role="menuitem"
                        onClick={() => {
                            onQuote?.();
                            setOpen(false);
                        }}
                        data-testid={postId ? `quote-action-${postId}` : undefined}
                        className="w-full text-left flex items-start gap-3 px-3 py-2.5 rounded-xl hover:bg-[rgba(44,111,209,0.06)] transition group"
                    >
                        <span className="flex-shrink-0 mt-0.5 w-8 h-8 rounded-full grid place-items-center bg-[rgba(44,111,209,0.08)] text-blue-soft transition group-hover:bg-[rgba(44,111,209,0.14)]">
                            <Quote size={15} strokeWidth={1.8} />
                        </span>
                        <span className="flex flex-col gap-0.5 min-w-0">
                            <span className="font-heading font-semibold text-[13.5px] tracking-tight text-black">
                                Citar com comentário
                            </span>
                            <span className="font-mono text-[11px] text-black/50 leading-snug">
                                Adiciona o teu pensamento à publicação
                            </span>
                        </span>
                    </button>
                </div>
            )}
        </div>
    );
}
