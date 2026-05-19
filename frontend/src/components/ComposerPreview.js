import { PostCard } from "./PostCard";
import { X } from "lucide-react";
import { useAuth } from "../context/AuthContext";

/**
 * Pré-visualização real do post antes de publicar.
 * Reusa o PostCard com um "post sintético" client-side — sem chamadas backend.
 * Mostra imagens, poll, hashtags, mood — exatamente como vai aparecer.
 */
export function ComposerPreview({
    open,
    onClose,
    content,
    images,
    poll,
    ring,
    audience,
    onPublish,
    publishing,
}) {
    const { user } = useAuth();
    if (!open) return null;

    const synthetic = {
        id: "__preview__",
        author: user,
        author_id: user?.id,
        content: content || "",
        images: images || [],
        image: "",
        likes: [],
        likes_count: 0,
        bookmarks: [],
        reposts: [],
        comments_count: 0,
        hashtags: extractHashtags(content || ""),
        created_at: new Date().toISOString(),
        reply_audience: audience,
        audience_ring: ring,
        is_preview: true,
        poll: poll && poll.options?.length >= 2 ? {
            id: "preview-poll",
            options: poll.options.map((label, i) => ({ id: `o${i}`, label, votes: 0 })),
            allow_multiple: !!poll.allow_multiple,
            ends_at: new Date(Date.now() + (poll.ends_in_minutes || 60) * 60_000).toISOString(),
            total_votes: 0,
            user_voted_for: null,
        } : null,
    };

    return (
        <div
            className="fixed inset-0 z-[55] bg-black/45 backdrop-blur-md flex items-end lg:items-center lg:justify-center pt-mobile-top"
            onClick={onClose}
            data-testid="composer-preview-modal"
        >
            <div
                onClick={(e) => e.stopPropagation()}
                className="w-full lg:max-w-xl bg-white rounded-t-3xl lg:rounded-3xl shadow-2xl anim-sheet-up lg:anim-fade-up pb-safe overflow-hidden"
            >
                <div className="flex items-center justify-between px-5 py-3 hairline-b">
                    <div>
                        <span className="type-overline">Pré-visualização</span>
                        <h3 className="font-display text-[18px] tracking-tight leading-none mt-0.5">Como vai aparecer</h3>
                    </div>
                    <button
                        onClick={onClose}
                        data-testid="composer-preview-close"
                        className="p-2 rounded-full hover:bg-black/[0.06] tap-shrink"
                        aria-label="fechar pré-visualização"
                    >
                        <X size={16} />
                    </button>
                </div>
                <div className="max-h-[60vh] overflow-y-auto">
                    <PostCard post={synthetic} clickable={false} previewMode />
                </div>
                <div className="px-4 py-3 flex items-center justify-between gap-2 hairline-t bg-paper">
                    <span className="text-[11px] font-mono text-black/45 uppercase tracking-[0.14em]">
                        sem interação · só preview
                    </span>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onClose}
                            className="btn-ghost-lux text-[13px]"
                            data-testid="composer-preview-back"
                        >
                            Voltar a editar
                        </button>
                        <button
                            onClick={() => { onPublish?.(); }}
                            disabled={publishing}
                            data-testid="composer-preview-publish"
                            className="btn-obsidian text-[13px] py-2.5 px-5 disabled:opacity-40"
                        >
                            Publicar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function extractHashtags(s) {
    const set = new Set();
    const re = /#([\p{L}0-9_]+)/gu;
    let m;
    while ((m = re.exec(s)) !== null) set.add(m[1].toLowerCase());
    return Array.from(set);
}
