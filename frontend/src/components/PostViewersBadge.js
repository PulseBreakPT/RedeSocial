import { Eye } from "lucide-react";
import { usePostPresence } from "../hooks/usePostPresence";

/**
 * Mostra "X a ver" com tracking em tempo real (WebSocket).
 * Mostra apenas se >= 2 viewers (1 = só tu, não mostra).
 */
export function PostViewersBadge({ postId, className = "" }) {
    const count = usePostPresence(postId);
    if (!postId || count < 2) return null;
    return (
        <span
            data-testid="post-viewers-badge"
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/[0.04] text-black/55 font-mono text-[10.5px] tracking-tight ${className}`}
            title={`${count} pessoas estão a ver este post agora`}
        >
            <span className="relative inline-flex w-1.5 h-1.5">
                <span className="absolute inset-0 rounded-full bg-emerald-500/70 pulse-dot" />
            </span>
            <Eye size={11} strokeWidth={1.8} />
            <span className="tabular-nums">{count}</span>
            <span className="hidden sm:inline">a ver</span>
        </span>
    );
}
