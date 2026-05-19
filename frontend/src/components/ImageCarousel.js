import { useState, useRef } from "react";
import { ChevronLeft, ChevronRight, Heart } from "lucide-react";

/**
 * ImageCarousel
 *  - Single-tap (after small delay) → onOpen(idx) — opens lightbox
 *  - Double-tap (two taps < 280ms) → onDoubleTap?.() — triggers heart burst + parent like
 *  - Clickable dots & arrows
 */
export function ImageCarousel({ images, onOpen, onDoubleTap }) {
    const [idx, setIdx] = useState(0);
    const [burst, setBurst] = useState(null); // { id, x, y, imgIdx }
    const trackRef = useRef(null);
    const lastTapRef = useRef({ t: 0, i: -1 });
    const pendingOpenRef = useRef(null);

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

    const fireBurst = (e, imgIdx) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setBurst({
            id: Math.random().toString(36).slice(2),
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
            imgIdx,
        });
        setTimeout(() => setBurst(null), 800);
    };

    const handleImageTap = (e, imgIdx) => {
        e.stopPropagation();
        const now = performance.now();
        const last = lastTapRef.current;
        const isDouble = last.i === imgIdx && now - last.t < 280;
        if (isDouble) {
            // Cancel any pending single-click open
            if (pendingOpenRef.current) {
                clearTimeout(pendingOpenRef.current);
                pendingOpenRef.current = null;
            }
            lastTapRef.current = { t: 0, i: -1 };
            fireBurst(e, imgIdx);
            onDoubleTap?.(imgIdx);
            return;
        }
        lastTapRef.current = { t: now, i: imgIdx };
        // Defer single-click to allow double-tap detection
        if (onOpen) {
            if (pendingOpenRef.current) clearTimeout(pendingOpenRef.current);
            pendingOpenRef.current = setTimeout(() => {
                pendingOpenRef.current = null;
                onOpen(imgIdx);
            }, 250);
        }
    };

    if (total === 1) {
        return (
            <div className="relative mt-3 w-full overflow-hidden rounded-2xl border border-black/[0.08]" data-testid="post-image-single">
                <button
                    onClick={(e) => handleImageTap(e, 0)}
                    className="block w-full"
                >
                    <img src={images[0]} alt="" className="w-full max-h-[480px] object-cover" />
                </button>
                {burst && burst.imgIdx === 0 && (
                    <span
                        key={burst.id}
                        className="anim-heart-burst pointer-events-none absolute z-10"
                        style={{ left: burst.x, top: burst.y, transform: "translate(-50%, -50%)" }}
                    >
                        <Heart size={88} strokeWidth={1.5} fill="#ff3d6e" color="#ff3d6e" />
                    </span>
                )}
            </div>
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
                        onClick={(e) => handleImageTap(e, i)}
                        className="flex-none w-full snap-center bg-black/[0.02]"
                    >
                        <img src={src} alt="" className="w-full max-h-[480px] object-cover" />
                    </button>
                ))}
            </div>

            {burst && (
                <span
                    key={burst.id}
                    className="anim-heart-burst pointer-events-none absolute z-10"
                    style={{ left: "50%", top: "50%" }}
                >
                    <Heart size={96} strokeWidth={1.5} fill="#ff3d6e" color="#ff3d6e" />
                </span>
            )}

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

            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1 bg-black/55 backdrop-blur px-2 py-1 rounded-full">
                {images.map((_, i) => (
                    <button
                        key={i}
                        onClick={(e) => { e.stopPropagation(); goTo(i); }}
                        aria-label={`Ir para imagem ${i + 1}`}
                        className={`h-1.5 rounded-full transition-all ${i === idx ? "w-4 bg-white" : "w-1.5 bg-white/50 hover:bg-white/80"}`}
                    />
                ))}
            </div>

            <div className="absolute top-2 right-2 bg-black/65 backdrop-blur text-white text-[10.5px] font-mono font-medium px-2 py-0.5 rounded-full tabular-nums">
                {idx + 1}/{total}
            </div>
        </div>
    );
}
