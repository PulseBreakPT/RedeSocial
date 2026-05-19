import { Avatar } from "./Avatar";

/**
 * Mini preview compacta do comentário/resposta dentro da notificação.
 * Mostra avatar pequeno + username + início do comentário (truncado).
 */
export function NotificationReplyPreview({ notif, className = "" }) {
    const preview = (notif?.comment_preview || "").trim();
    if (!preview) return null;
    const from = notif.from_user || {};
    const truncated = preview.length > 110 ? preview.slice(0, 107).trimEnd() + "…" : preview;
    return (
        <div
            data-testid="notif-reply-preview"
            className={`mt-1.5 flex items-start gap-2 rounded-xl border border-black/[0.06] bg-black/[0.02] px-2.5 py-1.5 ${className}`}
        >
            <Avatar user={from} size={18} />
            <div className="min-w-0 flex-1">
                <div className="text-[11.5px] font-mono text-black/55 leading-none truncate">
                    @{from.username || "…"}
                </div>
                <div className="text-[12.5px] text-black/80 leading-snug mt-0.5 line-clamp-2 break-words">
                    {truncated}
                </div>
            </div>
        </div>
    );
}
