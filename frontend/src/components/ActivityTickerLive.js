import { useEffect, useState } from "react";
import { Sparkles, Zap, MessageCircle, Heart, UserPlus, Activity } from "lucide-react";
import { Link } from "react-router-dom";
import { useWsMessages } from "./WebSocketProvider";
import { useCallback } from "react";

const ICONS = {
    new_post: Sparkles,
    like: Heart,
    comment: MessageCircle,
    follow: UserPlus,
    presence: Activity,
    default: Zap,
};

// Real-time activity ticker. Listens to WS events. Falls back gracefully to nothing.
export function ActivityTickerLive() {
    const [items, setItems] = useState([]);
    const handler = useCallback((data) => {
        if (data?.type === "activity") {
            const item = {
                id: `${Date.now()}-${Math.random()}`,
                event: data.event,
                payload: data.payload,
                ts: new Date(),
            };
            setItems((cur) => [item, ...cur].slice(0, 8));
        }
    }, []);
    useWsMessages(handler);

    // Auto-fade after 20s
    useEffect(() => {
        if (items.length === 0) return;
        const t = setTimeout(() => {
            setItems((cur) => cur.filter((x) => new Date() - x.ts < 20000));
        }, 20000);
        return () => clearTimeout(t);
    }, [items]);

    if (items.length === 0) return null;

    return (
        <div className="fixed bottom-20 lg:bottom-4 right-4 z-40 space-y-1.5 pointer-events-none" data-testid="activity-ticker">
            {items.slice(0, 3).map((item) => {
                const Icon = ICONS[item.event] || ICONS.default;
                return (
                    <Link
                        key={item.id}
                        to={item.event === "new_post" && item.payload.post_id
                            ? `/post/${item.payload.post_id}`
                            : `/u/${item.payload.author_username || ""}`}
                        className="pointer-events-auto flex items-center gap-2 px-3 py-2 rounded-full bg-black/80 backdrop-blur text-white text-xs font-mono shadow-2xl animate-slide-up-fade max-w-[280px]"
                        style={{ animation: "slideUpFade 0.4s ease-out" }}
                    >
                        <Icon size={12} className="text-orange-300 flex-shrink-0" />
                        <span className="truncate">
                            {item.event === "new_post" && (
                                <>@{item.payload.author_username} publicou{item.payload.snippet ? `: ${item.payload.snippet.slice(0, 40)}` : ""}</>
                            )}
                            {item.event === "like" && <>@{item.payload.from_username} gostou de um post</>}
                            {item.event === "comment" && <>@{item.payload.from_username} comentou</>}
                            {item.event === "follow" && <>@{item.payload.from_username} segue-te agora</>}
                        </span>
                    </Link>
                );
            })}
        </div>
    );
}
