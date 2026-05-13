import { useEffect } from "react";
import { X, Keyboard } from "lucide-react";

const SHORTCUTS = [
    { keys: ["?"], label: "Abrir atalhos" },
    { keys: ["n"], label: "Nova publicação" },
    { keys: ["/"], label: "Buscar" },
    { keys: ["g", "h"], label: "Ir para Início" },
    { keys: ["g", "e"], label: "Ir para Explorar" },
    { keys: ["g", "t"], label: "Tendências" },
    { keys: ["g", "n"], label: "Notificações" },
    { keys: ["g", "m"], label: "Mensagens" },
    { keys: ["g", "p"], label: "Perfil" },
    { keys: ["g", "c"], label: "Comunidades" },
    { keys: ["esc"], label: "Fechar modal" },
];

export function KeyboardShortcutsHelp({ onClose }) {
    useEffect(() => {
        const k = (e) => e.key === "Escape" && onClose();
        document.addEventListener("keydown", k);
        return () => document.removeEventListener("keydown", k);
    }, [onClose]);

    return (
        <div
            className="fixed inset-0 z-[95] bg-black/30 backdrop-blur-sm grid place-items-center p-4"
            onClick={onClose}
            data-testid="shortcuts-help"
        >
            <div
                className="w-full max-w-md bg-white border border-black/[0.08] rounded-2xl overflow-hidden shadow-[0_30px_80px_-20px_rgba(13,13,16,0.3)] anim-fade-up"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-6 py-4 hairline-b">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full ring-silver grid place-items-center">
                            <Keyboard size={14} strokeWidth={1.5} className="text-black/70" />
                        </div>
                        <div>
                            <h2 className="font-display text-[22px] tracking-tight leading-none text-black">Atalhos</h2>
                            <p className="type-overline mt-1">Atalhos de teclado</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-9 h-9 rounded-full grid place-items-center hover:bg-black/[0.04] text-black/55" data-testid="shortcuts-close">
                        <X size={16} strokeWidth={1.7} />
                    </button>
                </div>
                <ul>
                    {SHORTCUTS.map((s) => (
                        <li key={s.label} className="flex items-center justify-between px-6 py-3 hairline-b last:border-b-0">
                            <span className="text-[13.5px] font-body text-black/80">{s.label}</span>
                            <span className="flex gap-1">
                                {s.keys.map((k) => (
                                    <kbd
                                        key={k}
                                        className="font-mono text-[10px] uppercase px-2 py-1 rounded-md bg-[#fafafa] border border-black/[0.10] text-black/75 min-w-[24px] text-center shadow-[inset_0_-1px_0_rgba(13,13,16,0.06)]"
                                    >
                                        {k}
                                    </kbd>
                                ))}
                            </span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
