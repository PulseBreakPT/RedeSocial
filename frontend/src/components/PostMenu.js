import { useEffect, useRef, useState } from "react";
import { MoreHorizontal, Trash2, Pencil, Pin, PinOff, Copy, Flag, Link2 } from "lucide-react";
import { api, formatApiError } from "../lib/api";
import { toast } from "sonner";

export function PostMenu({ post, isOwn, onEdit, onDelete, onPinToggle }) {
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
            toast.error(formatApiError(err));
        }
        setOpen(false);
    };

    const handleCopy = (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`);
        toast.success("Link copiado");
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
                className="text-zinc-600 hover:text-accent-vermillion p-1.5 rounded-full hover:bg-white/5"
            >
                <MoreHorizontal size={16} />
            </button>
            {open && (
                <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-0 top-full mt-1 z-30 bg-zinc-950 border border-zinc-800 rounded-xl py-1.5 min-w-[180px] shadow-xl"
                >
                    <button onClick={handleCopy} className="w-full px-4 py-2 text-sm text-left hover:bg-white/5 flex items-center gap-2.5">
                        <Link2 size={14} /> Copiar link
                    </button>
                    {isOwn && (
                        <button onClick={handlePin} className="w-full px-4 py-2 text-sm text-left hover:bg-white/5 flex items-center gap-2.5">
                            {post.pinned ? <><PinOff size={14} /> Desafixar</> : <><Pin size={14} /> Fixar no perfil</>}
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
                            className="w-full px-4 py-2 text-sm text-left hover:bg-white/5 flex items-center gap-2.5"
                        >
                            <Pencil size={14} /> Editar
                        </button>
                    )}
                    {isOwn ? (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete?.();
                                setOpen(false);
                            }}
                            className="w-full px-4 py-2 text-sm text-left hover:bg-accent-vermillion/10 text-accent-vermillion flex items-center gap-2.5"
                        >
                            <Trash2 size={14} /> Apagar
                        </button>
                    ) : (
                        <button onClick={handleReport} className="w-full px-4 py-2 text-sm text-left hover:bg-white/5 text-zinc-300 flex items-center gap-2.5">
                            <Flag size={14} /> Reportar
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
