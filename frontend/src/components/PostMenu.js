import { useEffect, useRef, useState } from "react";
import { MoreHorizontal, Trash2, Pencil, Pin, PinOff, Flag, Link2, Type, BarChart3 } from "lucide-react";
import { api, formatApiError, toastApiError } from "../lib/api";
import { toast } from "sonner";

const itemCls = "w-full px-4 py-2.5 text-[13px] font-body text-left hover:bg-black/[0.04] flex items-center gap-3 text-black/80 transition";

export function PostMenu({ post, isOwn, onEdit, onDelete, onPinToggle, onAnalytics }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const close = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener("mousedown", close);
        return () => document.removeEventListener("mousedown", close);
    }, []);

    const handlePin = async (e) => {
        e.stopPropagation();
        try {
            const { data } = await api.post(`/posts/${post.id}/pin`);
            toast.success(data.pinned ? "Publicação fixada no perfil" : "Publicação desafixada");
            onPinToggle?.(data.pinned);
        } catch (err) {
            toastApiError(err);
        }
        setOpen(false);
    };

    const handleCopy = (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`);
        toast.success("Link copiado");
        setOpen(false);
    };

    const handleCopyText = (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(post.content || "");
        toast.success("Texto copiado");
        setOpen(false);
    };

    const handleReport = (e) => {
        e.stopPropagation();
        toast.success("Publicação reportada. Obrigado!");
        setOpen(false);
    };

    const ageMin = (Date.now() - new Date(post.created_at).getTime()) / 60000;
    const canEdit = isOwn && ageMin <= 15;

    return (
        <div ref={ref} className="relative">
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setOpen(!open);
                }}
                data-testid={`post-menu-${post.id}`}
                className="text-black/45 hover:text-black p-1.5 rounded-full hover:bg-black/[0.04] transition"
            >
                <MoreHorizontal size={16} strokeWidth={1.7} />
            </button>
            {open && (
                <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-0 top-full mt-1.5 z-30 bg-white border border-black/[0.08] rounded-xl py-1.5 min-w-[200px] shadow-[0_20px_50px_-12px_rgba(13,13,16,0.18)] anim-fade-up"
                >
                    <button onClick={handleCopy} className={itemCls}>
                        <Link2 size={14} strokeWidth={1.6} className="text-black/55" /> Copiar link
                    </button>
                    {post.content && (
                        <button onClick={handleCopyText} data-testid={`copy-text-${post.id}`} className={itemCls}>
                            <Type size={14} strokeWidth={1.6} className="text-black/55" /> Copiar texto
                        </button>
                    )}
                    {isOwn && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onAnalytics?.(); setOpen(false); }}
                            data-testid={`analytics-${post.id}`}
                            className={itemCls}
                        >
                            <BarChart3 size={14} strokeWidth={1.6} className="text-black/55" /> Analytics
                        </button>
                    )}
                    {isOwn && (
                        <button onClick={handlePin} className={itemCls}>
                            {post.pinned ? (
                                <><PinOff size={14} strokeWidth={1.6} className="text-black/55" /> Desafixar</>
                            ) : (
                                <><Pin size={14} strokeWidth={1.6} className="text-black/55" /> Fixar no perfil</>
                            )}
                        </button>
                    )}
                    {canEdit && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onEdit?.();
                                setOpen(false);
                            }}
                            data-testid={`edit-post-${post.id}`}
                            className={itemCls}
                        >
                            <Pencil size={14} strokeWidth={1.6} className="text-black/55" /> Editar
                        </button>
                    )}
                    {isOwn ? (
                        <>
                            <div className="hairline-t my-1" />
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete?.();
                                    setOpen(false);
                                }}
                                className="w-full px-4 py-2.5 text-[13px] font-body text-left hover:bg-red-soft-bg text-red-soft flex items-center gap-3 transition"
                            >
                                <Trash2 size={14} strokeWidth={1.6} /> Apagar
                            </button>
                        </>
                    ) : (
                        <button onClick={handleReport} className={itemCls}>
                            <Flag size={14} strokeWidth={1.6} className="text-black/55" /> Reportar
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
