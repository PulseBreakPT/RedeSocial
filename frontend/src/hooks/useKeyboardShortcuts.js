import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Returns nothing — registers global keyboard shortcuts
export function useKeyboardShortcuts({ openCompose, openHelp }) {
    const navigate = useNavigate();
    const { user } = useAuth();
    const seqRef = useRef({ first: null, ts: 0 });

    useEffect(() => {
        const isTypable = (el) => {
            if (!el) return false;
            const tag = el.tagName;
            return tag === "INPUT" || tag === "TEXTAREA" || el.isContentEditable;
        };

        const onKey = (e) => {
            if (isTypable(e.target)) return;
            if (e.metaKey || e.ctrlKey || e.altKey) return;
            const key = e.key.toLowerCase();

            // Two-key sequences with "g"
            if (seqRef.current.first === "g" && Date.now() - seqRef.current.ts < 1500) {
                seqRef.current.first = null;
                const map = {
                    h: "/",
                    e: "/explore",
                    t: "/trending",
                    n: "/notifications",
                    m: "/messages",
                    c: "/communities",
                    b: "/bookmarks",
                    s: "/settings",
                };
                if (key === "p" && user?.username) {
                    e.preventDefault();
                    navigate(`/u/${user.username}`);
                    return;
                }
                if (map[key]) {
                    e.preventDefault();
                    navigate(map[key]);
                    return;
                }
                return;
            }

            if (key === "g") {
                seqRef.current = { first: "g", ts: Date.now() };
                return;
            }
            if (key === "?" || (e.shiftKey && key === "/")) {
                e.preventDefault();
                openHelp?.();
                return;
            }
            if (key === "n") {
                e.preventDefault();
                openCompose?.();
                return;
            }
            if (key === "/") {
                e.preventDefault();
                const el = document.querySelector('[data-testid="search-input"]');
                if (el) el.focus();
                return;
            }
        };

        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [navigate, user, openCompose, openHelp]);
}
