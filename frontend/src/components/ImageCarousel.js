import { useState, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function ImageCarousel({ images, onOpen }) {
    const [idx, setIdx] = useState(0);
    const trackRef = useRef(null);
    if (!images || images.length === 0) return null;
    const total = images.length;

    const goTo = (i) => {
        const next = Math.max(0, Math.min(total - 1, i));
        setIdx(next);
        const el = trackRef.current;
        if (el) el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
    };

    const onScroll = () => {
        const el = trackRef.current;
        if (!el) return;
        const i = Math.round(el.scrollLeft / el.clientWidth);
        if (i !== idx) setIdx(i);
    };

    if (total === 1) {
        return (
            <button
                onClick={(e) => { e.stopPropagation(); onOpen?.(0); }}
                className="block mt-3 w-full overflow-hidden rounded-2xl border border-black/[0.08]"
                data-testid="post-image-single"
            >
                <img src={images[0]} alt="" className="w-full max-h-[480px] object-cover" />
            </button>
        );
    }

    return (
        <div className="relative mt-3 group" onClick={(e) => e.stopPropagation()} data-testid="post-carousel">
            <div
                ref={trackRef}
                onScroll={onScroll}
                className="flex overflow-x-auto snap-x snap-mandatory rounded-2xl border border-black/[0.08] scrollbar-hide"
                style={{ scrollbarWidth: "none" }}
            >
                {images.map((src, i) => (
                    <button
                        key={i}
                        onClick={(e) => { e.stopPropagation(); onOpen?.(i); }}
                        className="flex-none w-full snap-center bg-black/[0.02]"
                    >
                        <img src={src} alt="" className="w-full max-h-[480px] object-cover" />
                    </button>
                ))}
            </div>
            {idx > 0 && (
                <button
                    onClick={(e) => { e.stopPropagation(); goTo(idx - 1); }}
                    className="hidden md:grid absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 place-items-center rounded-full bg-white/95 border border-black/[0.1] text-black hover:scale-110 transition opacity-0 group-hover:opacity-100"
                    aria-label="anterior"
                >
                    <ChevronLeft size={16} />
                </button>
            )}
            {idx < total - 1 && (
                <button
                    onClick={(e) => { e.stopPropagation(); goTo(idx + 1); }}
                    className="hidden md:grid absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 place-items-center rounded-full bg-white/95 border border-black/[0.1] text-black hover:scale-110 transition opacity-0 group-hover:opacity-100"
                    aria-label="próxima"
                >
                    <ChevronRight size={16} />
                </button>
            )}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 bg-black/50 backdrop-blur px-2 py-1 rounded-full">
                {images.map((_, i) => (
                    <span
                        key={i}
                        className={`h-1.5 rounded-full transition-all ${i === idx ? "w-4 bg-white" : "w-1.5 bg-white/50"}`}
                    />
                ))}
            </div>
            <div className="absolute top-2 right-2 bg-black/60 backdrop-blur text-white text-[10px] font-mono px-2 py-0.5 rounded-full">
                {idx + 1}/{total}
            </div>
        </div>
    );
}
