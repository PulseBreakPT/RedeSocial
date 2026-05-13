import { useEffect } from "react";
import { X } from "lucide-react";

export function ImageLightbox({ src, onClose }) {
    useEffect(() => {
        const onKey = (e) => e.key === "Escape" && onClose();
        document.addEventListener("keydown", onKey);
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = "";
        };
    }, [onClose]);

    return (
        <div
            onClick={onClose}
            data-testid="image-lightbox"
            className="fixed inset-0 z-[80] bg-black/95 grid place-items-center p-4 anim-fade-up"
        >
            <button
                onClick={onClose}
                data-testid="lightbox-close"
                className="absolute top-4 right-4 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white"
            >
                <X size={18} />
            </button>
            <img
                src={src}
                alt=""
                onClick={(e) => e.stopPropagation()}
                className="max-h-[92vh] max-w-[92vw] object-contain rounded-lg"
            />
        </div>
    );
}
