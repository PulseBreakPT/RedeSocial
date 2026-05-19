import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { Avatar } from "./Avatar";

/**
 * Social proof under a post's like row:
 *  "Gostado por @ana, @rui e mais 12 que segues"
 *  Fetches lazily when scrolled into view.
 *  Hidden if no likers or if the only liker is the viewer.
 */
export function SocialProofRow({ postId, likesCount, refreshKey, testid }) {
    const [data, setData] = useState(null);
    const [loaded, setLoaded] = useState(false);
    const rootRef = useRef(null);

    useEffect(() => {
        if (likesCount <= 0) return;
        if (!rootRef.current) return;
        let cancelled = false;
        const fetchProof = async () => {
            try {
                const { data: d } = await api.get(`/posts/${postId}/social-likers`);
                if (!cancelled) setData(d);
            } catch {
                /* silent — non-critical */
            } finally {
                if (!cancelled) setLoaded(true);
            }
        };
        const obs = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && !loaded) {
                    fetchProof();
                    obs.disconnect();
                }
            },
            { threshold: 0.4 },
        );
        obs.observe(rootRef.current);
        return () => { cancelled = true; obs.disconnect(); };
    }, [postId, likesCount, loaded]);

    // Re-fetch after the viewer likes/unlikes (refreshKey changes)
    useEffect(() => {
        if (!loaded || likesCount <= 0) return;
        let cancelled = false;
        api.get(`/posts/${postId}/social-likers`)
            .then(({ data: d }) => { if (!cancelled) setData(d); })
            .catch(() => {});
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [refreshKey]);

    if (likesCount <= 0) {
        return <div ref={rootRef} className="hidden" />;
    }
    if (!data || data.users.length === 0) {
        // Reserve a tiny placeholder height to anchor the observer
        return <div ref={rootRef} className="h-0" data-testid={testid && `${testid}-empty`} />;
    }

    const { users, total, followed_total } = data;
    const first = users[0];
    const second = users[1];
    const remaining = Math.max(0, total - users.length);
    const friendsContext = followed_total > 0;

    return (
        <div
            ref={rootRef}
            data-testid={testid}
            className="mt-2 inline-flex items-center gap-2 text-[11.5px] leading-tight text-black/60"
        >
            <div className="flex -space-x-2">
                {users.slice(0, 3).map((u) => (
                    <Link
                        key={u.id}
                        to={`/u/${u.username}`}
                        onClick={(e) => e.stopPropagation()}
                        title={`@${u.username}`}
                        className="inline-block ring-2 ring-white rounded-full hover:translate-y-[-1px] transition-transform"
                    >
                        <Avatar user={u} size={18} />
                    </Link>
                ))}
            </div>
            <span className="font-mono tracking-tight">
                Gostado por{" "}
                <Link
                    to={`/u/${first.username}`}
                    onClick={(e) => e.stopPropagation()}
                    className="text-black/80 hover:underline underline-offset-2"
                >
                    @{first.username}
                </Link>
                {second && (
                    <>
                        {", "}
                        <Link
                            to={`/u/${second.username}`}
                            onClick={(e) => e.stopPropagation()}
                            className="text-black/80 hover:underline underline-offset-2"
                        >
                            @{second.username}
                        </Link>
                    </>
                )}
                {remaining > 0 && (
                    <>
                        {" e mais "}
                        <span className="text-black/80 tabular-nums">{remaining}</span>
                        {friendsContext ? " que segues" : ""}
                    </>
                )}
            </span>
        </div>
    );
}
