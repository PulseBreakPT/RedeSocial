import { useEffect, useState } from "react";
import { ArrowUp } from "lucide-react";

export function ScrollToTop() {
    const [show, setShow] = useState(false);

    useEffect(() => {
        const onScroll = () => setShow(window.scrollY > 600);
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, []);

    if (!show) return null;
    return (
        <button
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            data-testid="scroll-to-top"
            aria-label="Ir para o topo"
            className="fixed bottom-24 lg:bottom-6 right-5 z-30 w-11 h-11 rounded-full glass border border-black/[0.08] grid place-items-center text-black/65 hover:text-black hover:bg-white tap-shrink anim-fade-up shadow-[0_12px_30px_-10px_rgba(13,13,16,0.25)]"
        >
            <ArrowUp size={18} strokeWidth={2.4} />
        </button>
    );
}
