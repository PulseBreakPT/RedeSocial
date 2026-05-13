import { useRef, useState } from "react";
import { Image as ImageIcon, X } from "lucide-react";
import { api, formatApiError } from "../lib/api";
import { Avatar } from "./Avatar";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";

export function Composer({ onPosted, asModal = false, onClose }) {
    const { user } = useAuth();
    const [content, setContent] = useState("");
    const [image, setImage] = useState("");
    const [busy, setBusy] = useState(false);
    const fileRef = useRef(null);

    const handleFile = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            toast.error("Imagem deve ter no máximo 2MB");
            return;
        }
        const reader = new FileReader();
        reader.onload = (ev) => setImage(ev.target.result);
        reader.readAsDataURL(file);
    };

    const submit = async () => {
        if (!content.trim()) {
            toast.error("Escreva algo antes de publicar");
            return;
        }
        setBusy(true);
        try {
            const { data } = await api.post("/posts", { content, image });
            setContent("");
            setImage("");
            onPosted?.(data);
            toast.success("Publicado");
            onClose?.();
        } catch (e) {
            toast.error(formatApiError(e));
        } finally {
            setBusy(false);
        }
    };

    const remaining = 500 - content.length;

    return (
        <div className={`flex gap-3 ${asModal ? "p-6" : "p-5 border-b border-zinc-900"}`}>
            <Avatar user={user} size={44} />
            <div className="flex-1">
                <textarea
                    data-testid="composer-textarea"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="O que está acontecendo?"
                    rows={asModal ? 4 : 2}
                    maxLength={500}
                    className="w-full bg-transparent text-lg font-body placeholder:text-zinc-600 focus:outline-none resize-none"
                />
                {image && (
                    <div className="relative inline-block mt-2 group">
                        <img src={image} alt="preview" className="max-h-72 rounded-xl border border-zinc-800" />
                        <button
                            onClick={() => setImage("")}
                            data-testid="composer-remove-image"
                            className="absolute top-2 right-2 bg-black/80 hover:bg-black rounded-full p-1.5 text-white opacity-0 group-hover:opacity-100 transition"
                        >
                            <X size={14} />
                        </button>
                    </div>
                )}
                <div className="flex items-center justify-between mt-3">
                    <div className="flex items-center gap-2">
                        <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" data-testid="composer-file-input" />
                        <button
                            onClick={() => fileRef.current?.click()}
                            data-testid="composer-image-btn"
                            className="p-2.5 rounded-full text-accent-vermillion hover:bg-accent-vermillion/10 transition"
                        >
                            <ImageIcon size={18} />
                        </button>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className={`font-mono text-xs ${remaining < 40 ? "text-accent-vermillion" : "text-zinc-500"}`}>{remaining}</span>
                        <button
                            disabled={busy || !content.trim()}
                            onClick={submit}
                            data-testid="composer-publish-btn"
                            className="bg-accent-vermillion text-white font-heading font-semibold uppercase tracking-wide text-xs px-6 py-2.5 rounded-full hover:bg-[#FF7A50] transition disabled:opacity-40 disabled:cursor-not-allowed active:scale-95"
                        >
                            {busy ? "..." : "Publicar"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
