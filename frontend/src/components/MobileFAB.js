import { PenSquare } from "lucide-react";

export function MobileFAB({ onClick }) {
    return (
        <button
            onClick={onClick}
            data-testid="mobile-fab"
            className="lg:hidden fixed bottom-20 right-5 z-40 w-14 h-14 rounded-full bg-accent-vermillion text-white grid place-items-center shadow-xl glow-vermillion hover:bg-[#FF7A50] active:scale-95 transition"
            aria-label="Nova publicação"
        >
            <PenSquare size={22} />
        </button>
    );
}
