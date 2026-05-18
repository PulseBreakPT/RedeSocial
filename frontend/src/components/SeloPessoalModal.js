import { useEffect, useRef, useState } from "react";
import { X, Download, Share2, Copy } from "lucide-react";
import { toast } from "sonner";
import { SeloPessoal } from "./SeloPessoal";
import { useEscapeKey } from "../hooks/useClickOutside";

/**
 * SeloPessoalModal — opens a personalised, exportable Vermillion seal card.
 * Renders the SVG, lets the user download it as a 1080×1440 PNG (2× retina),
 * copy a public link to the profile, or use the OS native share sheet.
 *
 * PNG export uses XMLSerializer + canvas; no external deps.
 */
export function SeloPessoalModal({ profile, open, onClose }) {
    const svgRef = useRef(null);
    const [exporting, setExporting] = useState(false);

    useEscapeKey(onClose, open);

    useEffect(() => {
        if (!open) return;
        const original = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = original;
        };
    }, [open]);

    if (!open || !profile) return null;

    const downloadPng = async () => {
        if (!svgRef.current || exporting) return;
        setExporting(true);
        try {
            const svg = svgRef.current;
            const xml = new XMLSerializer().serializeToString(svg);
            const svg64 = btoa(unescape(encodeURIComponent(xml)));
            const dataUrl = `data:image/svg+xml;base64,${svg64}`;
            const img = new Image();
            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = () => reject(new Error("svg-load"));
                img.src = dataUrl;
            });
            const scale = 2; // 2× retina export
            const canvas = document.createElement("canvas");
            canvas.width = 540 * scale;
            canvas.height = 720 * scale;
            const ctx = canvas.getContext("2d");
            ctx.fillStyle = "#fbfaf7";
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const blob = await new Promise((resolve) =>
                canvas.toBlob(resolve, "image/png", 0.95)
            );
            if (!blob) throw new Error("blob-null");
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = `lusorae-selo-${profile.username || "pessoal"}.png`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(a.href), 1000);
            toast.success("Selo descarregado ✓");
        } catch {
            toast.error("Não consegui exportar. Tenta noutro browser.");
        } finally {
            setExporting(false);
        }
    };

    const profileUrl = `${window.location.origin}/u/${profile.username}`;

    const copyLink = async () => {
        try {
            await navigator.clipboard.writeText(profileUrl);
            toast.success("Link copiado");
        } catch {
            toast.error("Não consegui copiar.");
        }
    };

    const nativeShare = async () => {
        if (!navigator.share) {
            return copyLink();
        }
        try {
            await navigator.share({
                title: `O selo de ${profile.name} na lusorae`,
                text: `O meu selo na lusorae · @${profile.username}`,
                url: profileUrl,
            });
        } catch {
            /* user dismissed — silent */
        }
    };

    return (
        <div
            className="fixed inset-0 z-[100] bg-black/65 backdrop-blur-sm grid place-items-center p-4 anim-fade-up"
            onClick={onClose}
            data-testid="selo-pessoal-modal"
            role="dialog"
            aria-modal="true"
            aria-label="O teu selo pessoal Lusorae"
        >
            <div
                className="relative w-full max-w-[420px] bg-white rounded-3xl overflow-hidden shadow-[0_30px_80px_-20px_rgba(0,0,0,0.55)]"
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    aria-label="Fechar"
                    className="absolute top-3 right-3 z-10 w-9 h-9 grid place-items-center rounded-full bg-white/95 hover:bg-white text-black/70 hover:text-black tap-shrink shadow-md"
                    data-testid="selo-pessoal-close"
                >
                    <X size={16} />
                </button>

                <div
                    className="p-4 pt-5 bg-[#fbfaf7] flex justify-center"
                    data-testid="selo-pessoal-preview"
                >
                    <div className="w-full max-w-[360px] selo-pessoal-wrap">
                        <SeloPessoal ref={svgRef} profile={profile} animated />
                    </div>
                </div>

                <div className="p-4 bg-white border-t border-black/[0.06]">
                    <p className="text-[12px] text-black/55 text-center mb-3 leading-relaxed">
                        O teu selo, único na casa. Partilha onde quiseres.
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                        <button
                            onClick={downloadPng}
                            disabled={exporting}
                            data-testid="selo-pessoal-download"
                            className="flex flex-col items-center gap-1.5 py-3 rounded-xl border border-black/[0.10] hover:border-black/30 hover:bg-black/[0.02] transition tap-shrink disabled:opacity-50"
                        >
                            <Download size={16} strokeWidth={1.7} />
                            <span className="text-[10.5px] font-mono uppercase tracking-wider text-black/70">
                                {exporting ? "a gerar…" : "PNG"}
                            </span>
                        </button>
                        <button
                            onClick={nativeShare}
                            data-testid="selo-pessoal-share"
                            className="flex flex-col items-center gap-1.5 py-3 rounded-xl border border-black/[0.10] hover:border-black/30 hover:bg-black/[0.02] transition tap-shrink"
                        >
                            <Share2 size={16} strokeWidth={1.7} />
                            <span className="text-[10.5px] font-mono uppercase tracking-wider text-black/70">
                                Partilhar
                            </span>
                        </button>
                        <button
                            onClick={copyLink}
                            data-testid="selo-pessoal-copy"
                            className="flex flex-col items-center gap-1.5 py-3 rounded-xl border border-black/[0.10] hover:border-black/30 hover:bg-black/[0.02] transition tap-shrink"
                        >
                            <Copy size={16} strokeWidth={1.7} />
                            <span className="text-[10.5px] font-mono uppercase tracking-wider text-black/70">
                                Link
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default SeloPessoalModal;
