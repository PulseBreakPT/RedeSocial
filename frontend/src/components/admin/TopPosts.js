import React from "react";
import { Heart, MessageCircle } from "lucide-react";

function relTime(iso) {
    if (!iso) return "";
    const t = new Date(iso).getTime();
    if (!Number.isFinite(t)) return "";
    const diff = Math.max(0, (Date.now() - t) / 1000);
    if (diff < 60) return `${Math.floor(diff)}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
}

export function TopPosts({ items = [] }) {
    if (!items.length) {
        return (
            <div className="ops-empty">
                Sem publicações no período.
                <span className="ops-empty__hint">O top é calculado por engajamento real.</span>
            </div>
        );
    }
    return (
        <div>
            {items.map((p) => {
                const initial = ((p.author && (p.author.username || p.author.name)) || "?").slice(0, 1).toUpperCase();
                return (
                    <div key={p.id} className="ops-post-row">
                        {p.author && p.author.avatar ? (
                            <img src={p.author.avatar} alt="" className="ops-post-row__avatar" />
                        ) : (
                            <div className="ops-post-row__avatar" style={{ display: "grid", placeItems: "center", color: "var(--ops-text-muted)", fontFamily: "var(--ops-font-mono)", fontWeight: 600, fontSize: 12 }}>{initial}</div>
                        )}
                        <div className="ops-post-row__body">
                            <div className="ops-post-row__head">
                                <span className="ops-post-row__author">@{(p.author && p.author.username) || "?"}</span>
                                <span className="ops-post-row__time">há {relTime(p.created_at)}</span>
                            </div>
                            <div className="ops-post-row__text">{p.content || "(sem texto)"}</div>
                        </div>
                        <div className="ops-post-row__metrics">
                            <span><Heart size={10} /> {Number(p.likes_count || 0).toLocaleString("pt-PT")}</span>
                            <span><MessageCircle size={10} /> {Number(p.comments_count || 0).toLocaleString("pt-PT")}</span>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default TopPosts;
