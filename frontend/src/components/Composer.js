import { useRef, useState, useEffect } from "react";
import { Image as ImageIcon, X, Smile, FileText, Hash, AtSign } from "lucide-react";
import { api, formatApiError } from "../lib/api";
import { Avatar } from "./Avatar";
import { useAuth } from "../context/AuthContext";
import { useLocalDraft } from "../hooks/useLocalDraft";
import { toast } from "sonner";

const EMOJIS = ["🔥", "✨", "🚀", "❤️", "👀", "💯", "😂", "🙌", "⚡", "🌙"];

export function Composer({ onPosted, asModal = false, onClose, communityId = null }) {
    const { user } = useAuth();
    const draftKey = communityId ? `draft:c:${communityId}` : "draft:global";
    const [content, setContent, clearDraft] = useLocalDraft(draftKey, "");
    const [image, setImage] = useState("");
    const [busy, setBusy] = useState(false);
    const [hadDraft, setHadDraft] = useState(false);
    const [emojiOpen, setEmojiOpen] = useState(false);
    const fileRef = useRef(null);
    const textareaRef = useRef(null);

    useEffect(() => {
        if (content && content.trim().length > 0) setHadDraft(true);
        // eslint-disable-next-line
    }, []);

    const handleFile = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) { toast.error("Imagem deve ter no máximo 2MB"); return; }
        const reader = new FileReader();
        reader.onload = (ev) => setImage(ev.target.result);
        reader.readAsDataURL(file);
    };

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
        if (!content.trim()) { toast.error("Escreva algo antes de publicar"); return; }
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
        } catch (e) { toast.error(formatApiError(e)); }
        finally { setBusy(false); }
    };

    const insertText = (s) => {
        const el = textareaRef.current;
        if (!el) return;
        const start = el.selectionStart ?? content.length;
        const end = el.selectionEnd ?? content.length;
        const next = content.slice(0, start) + s + content.slice(end);
        setContent(next);
        setTimeout(() => {
            el.focus();
            el.selectionStart = el.selectionEnd = start + s.length;
        }, 0);
    };

    const remaining = 500 - content.length;
    const progress = Math.min(100, (content.length / 500) * 100);
    const progressColor =
        remaining < 0 ? "stroke-red-500" : remaining < 40 ? "stroke-accent-vermillion" : "stroke-emerald-500";

    return (
        <div className={asModal ? "p-5" : "px-4 py-4 border-b border-white/[0.05]"}>
            <div className="flex gap-3">
                <Avatar user={user} size={44} />
                <div className="flex-1 min-w-0">
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
                        className="w-full bg-transparent text-[17px] font-body placeholder:text-zinc-500 focus:outline-none resize-none leading-snug"
                    />
                    {image && (
                        <div className="relative inline-block mt-3 group">
                            <img src={image} alt="preview" className="max-h-72 rounded-2xl border border-white/10" />
                            <button
                                onClick={() => setImage("")}
                                data-testid="composer-remove-image"
                                className="absolute top-2 right-2 bg-black/80 hover:bg-black rounded-full p-1.5 text-white opacity-100 lg:opacity-0 group-hover:opacity-100 transition"
                            >
                                <X size={14} />
                            </button>
                        </div>
                    )}
                    <div className="flex items-center justify-between mt-4 gap-2">
                        <div className="flex items-center gap-1">
                            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} className="hidden" data-testid="composer-file-input" />
                            <button
                                onClick={() => fileRef.current?.click()}
                                data-testid="composer-image-btn"
                                className="w-9 h-9 rounded-full grid place-items-center text-accent-vermillion hover:bg-accent-vermillion/10 transition tap-shrink"
                                aria-label="imagem"
                            >
                                <ImageIcon size={18} />
                            </button>
                            <button
                                onClick={() => insertText("#")}
                                className="w-9 h-9 rounded-full grid place-items-center text-accent-vermillion hover:bg-accent-vermillion/10 transition tap-shrink"
                                aria-label="hashtag"
                            >
                                <Hash size={18} />
                            </button>
                            <button
                                onClick={() => insertText("@")}
                                className="w-9 h-9 rounded-full grid place-items-center text-accent-vermillion hover:bg-accent-vermillion/10 transition tap-shrink"
                                aria-label="menção"
                            >
                                <AtSign size={18} />
                            </button>
                            <div className="relative">
                                <button
                                    onClick={() => setEmojiOpen((v) => !v)}
                                    data-testid="composer-emoji-btn"
                                    className="w-9 h-9 rounded-full grid place-items-center text-accent-vermillion hover:bg-accent-vermillion/10 transition tap-shrink"
                                    aria-label="emoji"
                                >
                                    <Smile size={18} />
                                </button>
                                {emojiOpen && (
                                    <div
                                        onMouseLeave={() => setEmojiOpen(false)}
                                        className="absolute left-0 top-full mt-1 flex bg-zinc-950 border border-white/10 rounded-2xl px-2 py-1.5 gap-0.5 z-30 shadow-2xl"
                                    >
                                        {EMOJIS.map((emj) => (
                                            <button
                                                key={emj}
                                                onClick={() => { insertText(emj); setEmojiOpen(false); }}
                                                className="hover:bg-white/10 rounded-full w-8 h-8 grid place-items-center text-base tap-shrink"
                                            >
                                                {emj}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {content.length > 0 && (
                                <div className="relative w-6 h-6">
                                    <svg viewBox="0 0 24 24" className="w-full h-full -rotate-90">
                                        <circle cx="12" cy="12" r="10" className="stroke-white/10 fill-none" strokeWidth="2.5" />
                                        <circle cx="12" cy="12" r="10" fill="none" strokeWidth="2.5"
                                            className={progressColor} strokeLinecap="round"
                                            strokeDasharray={`${(progress / 100) * 62.83} 62.83`} />
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
                                className="bg-accent-vermillion text-white font-heading font-semibold text-[13px] tracking-tight px-5 py-2.5 rounded-full hover:bg-[#A78BFA] transition disabled:opacity-30 disabled:cursor-not-allowed tap-shrink glow-vermillion"
                            >
                                {busy ? "..." : "Publicar"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
