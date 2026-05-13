import { useEffect, useState, useRef } from "react";
import { Repeat2, Quote } from "lucide-react";

const itemCls = "w-full px-4 py-2.5 text-[13px] font-body text-left hover:bg-black/[0.04] flex items-center gap-3 text-black/80 transition";

export function RepostMenu({ reposted, onRepost, onQuote }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const close = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener("mousedown", close);
        return () => document.removeEventListener("mousedown", close);
    }, []);

    return (
        <div ref={ref} className="relative inline-block">
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setOpen(!open);
                }}
                className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-green-soft-bg hover:text-green-soft transition ${
                    reposted ? "text-green-soft" : "text-black/55"
                }`}
            >
                <Repeat2 size={16} strokeWidth={1.7} />
            </button>
            {open && (
                <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute left-0 top-full mt-1.5 z-30 bg-white border border-black/[0.08] rounded-xl py-1.5 min-w-[200px] shadow-[0_20px_50px_-12px_rgba(13,13,16,0.18)] anim-fade-up"
                >
                    <button
                        onClick={() => {
                            onRepost?.();
                            setOpen(false);
                        }}
                        className={itemCls}
                    >
                        <Repeat2 size={14} strokeWidth={1.6} className="text-green-soft" />
                        {reposted ? "Desfazer republicação" : "Republicar"}
                    </button>
                    <button
                        onClick={() => {
                            onQuote?.();
                            setOpen(false);
                        }}
                        className={itemCls}
                    >
                        <Quote size={14} strokeWidth={1.6} className="text-blue-soft" /> Citar com comentário
                    </button>
                </div>
            )}
        </div>
    );
}
