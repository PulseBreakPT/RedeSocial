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
            className="fixed bottom-24 lg:bottom-6 right-5 z-30 w-11 h-11 rounded-full glass-deep border border-white/[0.08] grid place-items-center text-zinc-200 hover:text-accent-vermillion tap-shrink anim-fade-up shadow-xl"
        >
            <ArrowUp size={18} strokeWidth={2.4} />
        </button>
    );
}
