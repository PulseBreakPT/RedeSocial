import { useRef, useState, useEffect } from "react";
import { Image as ImageIcon, X, Smile, FileText } from "lucide-react";
import { api, formatApiError } from "../lib/api";
import { Avatar } from "./Avatar";
import { useAuth } from "../context/AuthContext";
import { useLocalDraft } from "../hooks/useLocalDraft";
import { toast } from "sonner";

export function Composer({ onPosted, asModal = false, onClose, communityId = null }) {
    const { user } = useAuth();
    const draftKey = communityId ? `draft:c:${communityId}` : "draft:global";
    const [content, setContent, clearDraft] = useLocalDraft(draftKey, "");
    const [image, setImage] = useState("");
    const [busy, setBusy] = useState(false);
    const [hadDraft, setHadDraft] = useState(false);
    const fileRef = useRef(null);
    const textareaRef = useRef(null);

    useEffect(() => {
        if (content && content.trim().length > 0) setHadDraft(true);
        // eslint-disable-next-line
    }, []);

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

    // Paste image from clipboard
    const handlePaste = (e) => {
        const items = e.clipboardData?.items;
        if (!items) return;
        for (const item of items) {
            if (item.type.startsWith("image/")) {
                const file = item.getAsFile();
                if (file && file.size <= 2 * 1024 * 1024) {
                    const reader = new FileReader();
                    reader.onload = (ev) => setImage(ev.target.result);
                    reader.readAsDataURL(file);
                    toast.success("Imagem colada");
                    e.preventDefault();
                    return;
                }
            }
        }
    };

    const submit = async () => {
        if (!content.trim()) {
            toast.error("Escreva algo antes de publicar");
            return;
        }
        setBusy(true);
        try {
            const body = { content, image };
            if (communityId) body.community_id = communityId;
            const { data } = await api.post("/posts", body);
            clearDraft();
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

    const insertEmoji = (emoji) => {
        const el = textareaRef.current;
        if (!el) return;
        const start = el.selectionStart ?? content.length;
        const end = el.selectionEnd ?? content.length;
        const next = content.slice(0, start) + emoji + content.slice(end);
        setContent(next);
        setTimeout(() => {
            el.focus();
            el.selectionStart = el.selectionEnd = start + emoji.length;
        }, 0);
    };

    const remaining = 500 - content.length;
    const progress = Math.min(100, (content.length / 500) * 100);
    const progressColor =
        remaining < 0 ? "stroke-red-500" : remaining < 40 ? "stroke-accent-vermillion" : "stroke-emerald-500";

    const EMOJIS = ["🔥", "✨", "🚀", "❤️", "👀", "💯", "😂", "🙌"];

    return (
        <div className={`flex gap-3 ${asModal ? "p-6" : "p-5 border-b border-zinc-900"}`}>
            <Avatar user={user} size={44} />
            <div className="flex-1">
                {hadDraft && content && (
                    <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 mb-2" data-testid="draft-restored">
                        <FileText size={12} /> Rascunho restaurado
                    </div>
                )}
                <textarea
                    ref={textareaRef}
                    data-testid="composer-textarea"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    onPaste={handlePaste}
                    placeholder={communityId ? "Compartilhe algo com a comunidade..." : "O que está acontecendo?"}
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
                <div className="flex items-center justify-between mt-3 gap-2">
                    <div className="flex items-center gap-1">
                        <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" data-testid="composer-file-input" />
                        <button
                            onClick={() => fileRef.current?.click()}
                            data-testid="composer-image-btn"
                            className="p-2.5 rounded-full text-accent-vermillion hover:bg-accent-vermillion/10 transition"
                        >
                            <ImageIcon size={18} />
                        </button>
                        <div className="relative group">
                            <button
                                data-testid="composer-emoji-btn"
                                className="p-2.5 rounded-full text-accent-vermillion hover:bg-accent-vermillion/10 transition"
                            >
                                <Smile size={18} />
                            </button>
                            <div className="absolute left-0 top-full mt-1 hidden group-hover:flex bg-zinc-900 border border-zinc-800 rounded-full px-2 py-1.5 gap-0.5 z-30 shadow-xl">
                                {EMOJIS.map((emj) => (
                                    <button
                                        key={emj}
                                        onClick={() => insertEmoji(emj)}
                                        className="hover:bg-zinc-800 rounded-full w-7 h-7 grid place-items-center text-base"
                                    >
                                        {emj}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        {content.length > 0 && (
                            <div className="relative w-6 h-6">
                                <svg viewBox="0 0 24 24" className="w-full h-full -rotate-90">
                                    <circle cx="12" cy="12" r="10" className="stroke-zinc-800 fill-none" strokeWidth="2.5" />
                                    <circle
                                        cx="12" cy="12" r="10" fill="none" strokeWidth="2.5"
                                        className={progressColor}
                                        strokeLinecap="round"
                                        strokeDasharray={`${(progress / 100) * 62.83} 62.83`}
                                    />
                                </svg>
                                {remaining < 40 && (
                                    <span className={`absolute inset-0 grid place-items-center font-mono text-[9px] ${remaining < 0 ? "text-red-500" : "text-accent-vermillion"}`}>
                                        {remaining}
                                    </span>
                                )}
                            </div>
                        )}
                        <button
                            disabled={busy || !content.trim() || remaining < 0}
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
