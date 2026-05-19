import { useEffect, useState, useRef } from "react";

// Subscribes the current WS connection to per-post presence and returns the live count.
// Listens to global window events emitted by WebSocketProvider on "new_comment" / "post_viewers" / "c_typing".
export function usePostPresence(postId) {
    const [count, setCount] = useState(0);
    const sentRef = useRef(false);

    useEffect(() => {
        if (!postId) return;
        sentRef.current = false;
        // Helper: try to find an open socket on the window (set by WebSocketProvider)
        const trySend = (payload) => {
            try {
                const sock = window.__VMLN_WS__;
                if (sock && sock.readyState === 1) {
                    sock.send(JSON.stringify(payload));
                    return true;
                }
            } catch {}
            return false;
        };

        const sendView = () => {
            if (trySend({ type: "post_view", post_id: postId })) {
                sentRef.current = true;
            }
        };
        // Try immediately, and again on "ws-open" (in case socket isn't ready yet)
        sendView();
        const onOpen = () => sendView();
        window.addEventListener("vmln:ws-open", onOpen);

        const onViewers = (e) => {
            const d = e.detail;
            if (!d || d.post_id !== postId) return;
            setCount(d.count || 0);
        };
        window.addEventListener("vmln:post_viewers", onViewers);

        return () => {
            window.removeEventListener("vmln:ws-open", onOpen);
            window.removeEventListener("vmln:post_viewers", onViewers);
            if (sentRef.current) {
                trySend({ type: "post_unview", post_id: postId });
            }
        };
    }, [postId]);

    return count;
}
