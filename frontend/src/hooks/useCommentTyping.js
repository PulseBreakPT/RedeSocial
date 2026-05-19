import { useEffect, useRef, useState, useCallback } from "react";

// Listens for c_typing events for a given post; returns active typers (with TTL).
// Also returns a `notifyTyping(post_id)` you can call when user types to broadcast presence.
const TTL_MS = 3500;
const THROTTLE_MS = 1500;

export function useCommentTyping(postId) {
    const [typers, setTypers] = useState([]); // [{user, at}]
    const lastSentRef = useRef(0);

    useEffect(() => {
        if (!postId) return;
        const onTyping = (e) => {
            const d = e.detail;
            if (!d || d.post_id !== postId || !d.user) return;
            const at = Date.now();
            setTypers((prev) => {
                const others = prev.filter((p) => p.user.id !== d.user.id);
                return [...others, { user: d.user, at }];
            });
        };
        window.addEventListener("vmln:c_typing", onTyping);

        const tick = setInterval(() => {
            const now = Date.now();
            setTypers((prev) => prev.filter((p) => now - p.at < TTL_MS));
        }, 700);
        return () => {
            window.removeEventListener("vmln:c_typing", onTyping);
            clearInterval(tick);
            setTypers([]);
        };
    }, [postId]);

    const notifyTyping = useCallback(() => {
        if (!postId) return;
        const now = Date.now();
        if (now - lastSentRef.current < THROTTLE_MS) return;
        lastSentRef.current = now;
        try {
            const sock = window.__VMLN_WS__;
            if (sock && sock.readyState === 1) {
                sock.send(JSON.stringify({ type: "c_typing", post_id: postId }));
            }
        } catch {}
    }, [postId]);

    return { typers, notifyTyping };
}
