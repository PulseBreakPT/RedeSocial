import { useState } from "react";
import { X, Code, Copy, Check, Maximize2 } from "lucide-react";
import { toast } from "sonner";
import { buildEmbedSnippet, postUrl } from "../lib/sharing";

const SIZES = [
    { key: "compact",  label: "Compacto",  w: 450, h: 320 },
    { key: "regular",  label: "Regular",   w: 550, h: 420 },
    { key: "wide",     label: "Largo",     w: 680, h: 520 },
];

export function EmbedModal({ post, onClose }) {
    const [size, setSize] = useState("regular");
    const [copied, setCopied] = useState(false);
    const sz = SIZES.find((s) => s.key === size) || SIZES[1];
    const snippet = buildEmbedSnippet(post.id, { width: sz.w, height: sz.h });

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(snippet);
            setCopied(true);
            toast.success("Código de incorporação copiado");
            setTimeout(() => setCopied(false), 1800);
        } catch {
            toast.error("Não foi possível copiar");
        }
    };

    return (
        <div
            className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-md grid place-items-center p-4"
            onClick={onClose}
            data-testid="embed-modal"
        >
            <div
                className="w-full max-w-xl bg-white border border-black/[0.06] rounded-3xl shadow-[0_40px_100px_-24px_rgba(13,13,16,0.35),0_8px_24px_-8px_rgba(13,13,16,0.10)] anim-fade-up overflow-hidden flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 hairline-b">
                    <div className="flex items-center gap-3 min-w-0">
                        <div
                            className="w-10 h-10 rounded-full grid place-items-center text-black/75"
                            style={{ background: "rgba(247,245,239,0.95)", boxShadow: "inset 0 0 0 1px rgba(13,13,16,0.08)" }}
                        >
                            <Code size={16} strokeWidth={1.9} />
                        </div>
                        <div className="min-w-0">
                            <p className="type-overline">Incorporar</p>
                            <h2 className="font-display text-[22px] tracking-tight leading-none text-black truncate">
                                Mostra esta publicação no teu site
                            </h2>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-9 h-9 rounded-full grid place-items-center hover:bg-black/[0.05] text-black/55 hover:text-black tap-shrink transition flex-shrink-0"
                        aria-label="Fechar"
                    >
                        <X size={16} strokeWidth={1.8} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto space-y-5">
                    {/* Size picker */}
                    <div>
                        <span className="type-overline mb-2 block">Tamanho</span>
                        <div className="flex gap-2" role="radiogroup" aria-label="Tamanho do embed">
                            {SIZES.map((s) => {
                                const active = s.key === size;
                                return (
                                    <button
                                        key={s.key}
                                        onClick={() => setSize(s.key)}
                                        role="radio"
                                        aria-checked={active}
                                        data-testid={`embed-size-${s.key}`}
                                        className={`flex-1 px-3 py-2 rounded-xl text-[12.5px] font-mono uppercase tracking-[0.14em] tap-shrink transition ${
                                            active
                                                ? "bg-black text-white shadow-[0_4px_14px_-4px_rgba(13,13,16,0.4)]"
                                                : "bg-black/[0.04] hover:bg-black/[0.08] text-black/70"
                                        }`}
                                    >
                                        {s.label}
                                        <span className="block text-[10px] opacity-70 tabular-nums mt-0.5">
                                            {s.w}×{s.h}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Snippet */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <span className="type-overline">Código HTML</span>
                            <a
                                href={postUrl(post.id)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.14em] text-black/45 hover:text-black transition"
                            >
                                Ver publicação <Maximize2 size={10} strokeWidth={1.7} />
                            </a>
                        </div>
                        <pre
                            data-testid="embed-snippet"
                            className="bg-[#0a0a0a] text-[#FFD93D] text-[12px] leading-[1.55] font-mono p-4 rounded-2xl overflow-x-auto whitespace-pre"
                        >{snippet}</pre>
                    </div>

                    <p className="text-[12px] text-black/55 leading-relaxed font-mono">
                        Cola este código no teu blog ou site para mostrar a publicação com o estilo Lusorae.
                        O conteúdo é carregado do servidor e respeita as preferências de privacidade do autor.
                    </p>
                </div>

                {/* Sticky footer */}
                <div className="px-6 py-4 hairline-t flex items-center justify-end gap-2 bg-white">
                    <button
                        onClick={onClose}
                        className="text-[11px] font-mono uppercase tracking-[0.14em] text-black/55 hover:text-black px-4 py-2 rounded-full hover:bg-black/[0.04] tap-shrink transition"
                    >
                        Fechar
                    </button>
                    <button
                        onClick={copy}
                        data-testid="embed-copy-btn"
                        className="btn-obsidian text-[11px] px-5 py-2.5 inline-flex items-center gap-2"
                    >
                        {copied ? (<><Check size={12} /> Copiado</>) : (<><Copy size={12} /> Copiar código</>)}
                    </button>
                </div>
            </div>
        </div>
    );
}
