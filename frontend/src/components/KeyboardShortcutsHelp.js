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
            className="fixed inset-0 z-[95] bg-black/85 backdrop-blur-sm grid place-items-center p-4"
            onClick={onClose}
            data-testid="shortcuts-help"
        >
            <div
                className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-900">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-accent-vermillion/10 grid place-items-center border border-accent-vermillion/30">
                            <Keyboard size={16} className="text-accent-vermillion" />
                        </div>
                        <div>
                            <h2 className="font-heading text-lg font-bold">Atalhos do teclado</h2>
                            <p className="font-mono text-[10px] text-zinc-500 uppercase tracking-widest">navegue mais rápido</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-white/5" data-testid="shortcuts-close">
                        <X size={16} />
                    </button>
                </div>
                <ul className="divide-y divide-zinc-900">
                    {SHORTCUTS.map((s) => (
                        <li key={s.label} className="flex items-center justify-between px-6 py-3">
                            <span className="text-sm">{s.label}</span>
                            <span className="flex gap-1">
                                {s.keys.map((k) => (
                                    <kbd
                                        key={k}
                                        className="font-mono text-[11px] uppercase px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 min-w-[22px] text-center"
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
