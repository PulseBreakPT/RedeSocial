import { Keyboard } from "lucide-react";

const SHORTCUTS = [
    {
        section: "Navegação",
        items: [
            { keys: ["g", "h"], label: "Ir para Início" },
            { keys: ["g", "e"], label: "Ir para Explorar" },
            { keys: ["g", "n"], label: "Ir para Notificações" },
            { keys: ["g", "m"], label: "Ir para Mensagens" },
            { keys: ["g", "p"], label: "Ir para o meu perfil" },
            { keys: ["g", "s"], label: "Abrir Definições" },
        ],
    },
    {
        section: "Ações",
        items: [
            { keys: ["n"], label: "Nova publicação" },
            { keys: ["/"], label: "Focar a pesquisa" },
            { keys: ["?"], label: "Mostrar atalhos" },
            { keys: ["esc"], label: "Fechar modal aberto" },
        ],
    },
    {
        section: "Feed",
        items: [
            { keys: ["j"], label: "Próximo post" },
            { keys: ["k"], label: "Post anterior" },
            { keys: ["l"], label: "Gostar do post atual" },
            { keys: ["r"], label: "Responder ao post atual" },
            { keys: ["b"], label: "Guardar nos bookmarks" },
            { keys: ["."], label: "Atualizar feed" },
        ],
    },
    {
        section: "Composição",
        items: [
            { keys: ["⌘/Ctrl", "Enter"], label: "Publicar" },
            { keys: ["⌘/Ctrl", "k"], label: "Inserir link" },
            { keys: ["⌘/Ctrl", "b"], label: "Negrito" },
            { keys: ["⌘/Ctrl", "i"], label: "Itálico" },
        ],
    },
];

function Key({ children }) {
    return (
        <kbd className="inline-flex items-center justify-center min-w-[28px] h-7 px-2 rounded-md bg-white border border-black/[0.12] shadow-[0_1px_0_rgba(13,13,16,0.08)] text-[11px] font-mono tracking-tight text-black font-medium tabular-nums">
            {children}
        </kbd>
    );
}

export function ShortcutsTab() {
    return (
        <div className="px-4 lg:px-6 py-5 space-y-6 max-w-2xl" data-testid="settings-shortcuts">
            <div className="card-lux p-5 relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-black/[0.03] pointer-events-none" />
                <div className="relative flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-black text-white grid place-items-center shrink-0">
                        <Keyboard size={20} strokeWidth={1.8} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="font-display text-[20px] font-bold tracking-tight text-black">Atalhos de teclado</h2>
                        <p className="text-[12.5px] text-black/55 leading-relaxed mt-1">
                            Move-te mais depressa. Carrega <Key>?</Key> em qualquer página para abrir esta lista rapidamente.
                        </p>
                    </div>
                </div>
            </div>

            {SHORTCUTS.map((group) => (
                <section key={group.section}>
                    <p className="type-overline mb-3">{group.section}</p>
                    <div className="card-lux divide-y divide-black/[0.06]">
                        {group.items.map((item, i) => (
                            <div key={i} className="flex items-center justify-between gap-3 p-3.5">
                                <span className="text-[13px] text-black/80">{item.label}</span>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    {item.keys.map((k, j) => (
                                        <span key={j} className="flex items-center gap-1.5">
                                            <Key>{k}</Key>
                                            {j < item.keys.length - 1 && (
                                                <span className="text-[10px] text-black/30 font-mono">+</span>
                                            )}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            ))}

            <div className="text-[11px] text-black/45 leading-relaxed text-center pt-2">
                Em macOS usa <Key>⌘</Key> · em Windows/Linux usa <Key>Ctrl</Key>
            </div>
        </div>
    );
}
