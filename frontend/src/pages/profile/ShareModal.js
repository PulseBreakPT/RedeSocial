import { useEffect, useMemo, useRef, useState } from "react";
import { X, Link2, Copy, Check, Download, QrCode, Twitter, MessageCircle, Share2 } from "lucide-react";
import { toast } from "sonner";

/* Minimal QR encoder using qr-server.com image URL (no extra dep). */
function qrUrl(text, size = 260) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=2&qzone=1&data=${encodeURIComponent(text)}`;
}

export function ShareModal({ profile, onClose }) {
    const [copied, setCopied] = useState(false);
    const ref = useRef(null);
    const url = `${window.location.origin}/u/${profile.username}`;
    const text = `Vê o perfil de ${profile.name} no Lusorae`;
    const nativeShareSupported = useMemo(
        () => typeof navigator !== "undefined" && typeof navigator.share === "function",
        []
    );

    useEffect(() => {
        const onKey = (e) => { if (e.key === "Escape") onClose?.(); };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    const onCopy = async () => {
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            toast.success("Link copiado");
            setTimeout(() => setCopied(false), 1600);
        } catch {
            toast.error("Não foi possível copiar");
        }
    };

    const onNativeShare = async () => {
        try {
            await navigator.share({
                title: profile.name,
                text,
                url,
            });
        } catch (e) {
            // User cancelled — no toast
            if (e?.name && e.name !== "AbortError") {
                toast.error("Não foi possível partilhar");
            }
        }
    };

    const onBackdrop = (e) => {
        if (e.target === ref.current) onClose?.();
    };

    return (
        <div
            ref={ref}
            onClick={onBackdrop}
            data-testid="share-modal"
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm grid place-items-center px-4 anim-fade-in"
        >
            <div className="relative w-full max-w-sm bg-white rounded-3xl shadow-[0_30px_60px_-15px_rgba(13,13,16,0.45)] border border-black/[0.06] overflow-hidden">
                <button
                    onClick={onClose}
                    data-testid="share-close"
                    className="absolute top-3 right-3 w-8 h-8 grid place-items-center rounded-full hover:bg-black/[0.05] transition tap-shrink z-10"
                    aria-label="Fechar"
                >
                    <X size={15} />
                </button>

                <div className="p-6 pt-7 text-center">
                    <p className="type-overline mb-1">Partilhar perfil</p>
                    <h3 className="font-display text-[22px] font-bold tracking-tight text-black leading-tight">
                        {profile.name}
                    </h3>
                    <p className="font-mono text-[11.5px] text-black/45 mt-0.5">@{profile.username}</p>

                    <div className="mt-5 p-4 rounded-2xl bg-paper border border-black/[0.06] inline-block">
                        <img
                            src={qrUrl(url, 220)}
                            alt={`QR para ${profile.username}`}
                            width={220}
                            height={220}
                            className="block rounded-lg"
                            data-testid="share-qr"
                            loading="lazy"
                        />
                    </div>
                    <div className="mt-2 inline-flex items-center gap-1.5 text-[10.5px] font-mono uppercase tracking-[0.14em] text-black/45">
                        <QrCode size={11} /> aponta a câmara para abrir
                    </div>

                    <div className="mt-5">
                        <div className="flex items-center gap-2 bg-black/[0.04] border border-black/[0.06] rounded-full px-3 py-2">
                            <Link2 size={13} className="text-black/55 shrink-0" />
                            <span className="text-[12px] text-black/70 truncate flex-1 text-left font-mono" title={url}>{url}</span>
                            <button
                                onClick={onCopy}
                                data-testid="share-copy"
                                className={`shrink-0 inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-[11px] font-semibold tap-shrink transition ${
                                    copied ? "bg-emerald-100 text-emerald-700" : "bg-black text-white hover:bg-black/85"
                                }`}
                            >
                                {copied ? <><Check size={11} /> Copiado</> : <><Copy size={11} /> Copiar</>}
                            </button>
                        </div>
                    </div>

                    <div className="mt-5 grid grid-cols-3 gap-2">
                        {nativeShareSupported && (
                            <button
                                type="button"
                                onClick={onNativeShare}
                                data-testid="share-native"
                                className="col-span-3 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-black text-white hover:bg-black/85 text-[12px] font-mono uppercase tracking-wider tap-shrink transition mb-1"
                                aria-label="Partilhar via apps do sistema"
                            >
                                <Share2 size={14} strokeWidth={1.8} /> Partilhar via...
                            </button>
                        )}
                        <a
                            href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`}
                            target="_blank" rel="noopener noreferrer"
                            data-testid="share-twitter"
                            className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-black/[0.04] hover:bg-black/[0.08] text-[10px] font-mono uppercase tracking-wider text-black/70 tap-shrink transition"
                        >
                            <Twitter size={14} strokeWidth={1.7} /> Twitter
                        </a>
                        <a
                            href={`https://wa.me/?text=${encodeURIComponent(`${text}: ${url}`)}`}
                            target="_blank" rel="noopener noreferrer"
                            data-testid="share-whatsapp"
                            className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-black/[0.04] hover:bg-black/[0.08] text-[10px] font-mono uppercase tracking-wider text-black/70 tap-shrink transition"
                        >
                            <MessageCircle size={14} strokeWidth={1.7} /> WhatsApp
                        </a>
                        <a
                            href={qrUrl(url, 600)}
                            download={`${profile.username}-lusorae-qr.png`}
                            data-testid="share-download-qr"
                            className="flex flex-col items-center gap-1 py-2.5 rounded-xl bg-black/[0.04] hover:bg-black/[0.08] text-[10px] font-mono uppercase tracking-wider text-black/70 tap-shrink transition"
                        >
                            <Download size={14} strokeWidth={1.7} /> Guardar QR
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
