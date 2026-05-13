import { useEffect, useState } from "react";
import { useRef } from "react";
import { Repeat2, Quote } from "lucide-react";

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
                className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-emerald-500/10 hover:text-emerald-400 transition ${
                    reposted ? "text-emerald-400" : ""
                }`}
            >
                <Repeat2 size={17} />
            </button>
            {open && (
                <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute left-0 top-full mt-1 z-30 bg-zinc-950 border border-zinc-800 rounded-xl py-1.5 min-w-[180px] shadow-xl"
                >
                    <button
                        onClick={() => {
                            onRepost?.();
                            setOpen(false);
                        }}
                        className="w-full px-4 py-2 text-sm text-left hover:bg-white/5 flex items-center gap-2.5"
                    >
                        <Repeat2 size={14} /> {reposted ? "Desfazer repost" : "Repostar"}
                    </button>
                    <button
                        onClick={() => {
                            onQuote?.();
                            setOpen(false);
                        }}
                        className="w-full px-4 py-2 text-sm text-left hover:bg-white/5 flex items-center gap-2.5"
                    >
                        <Quote size={14} /> Citar com comentário
                    </button>
                </div>
            )}
        </div>
    );
}
