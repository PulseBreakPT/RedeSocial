import { useEffect, useRef } from "react";

/**
 * Closes a popover/menu when the user:
 *   - clicks or taps outside the ref'd element
 *   - presses Escape (configurable)
 *
 * Returns a ref to attach to the menu/container.
 *
 * Usage:
 *   const ref = useClickOutside(() => setOpen(false), open);
 *   <div ref={ref}>...</div>
 */
export function useClickOutside(onClose, isOpen = true, { escape = true } = {}) {
    const ref = useRef(null);

    useEffect(() => {
        if (!isOpen) return undefined;

        const handlePointer = (e) => {
            const el = ref.current;
            if (!el) return;
            if (el.contains(e.target)) return;
            onClose?.(e);
        };

        const handleKey = (e) => {
            if (escape && e.key === "Escape") {
                e.stopPropagation();
                onClose?.(e);
            }
        };

        // pointerdown fires before click → avoids race with button onClick handlers inside the menu
        document.addEventListener("pointerdown", handlePointer, true);
        document.addEventListener("keydown", handleKey);
        return () => {
            document.removeEventListener("pointerdown", handlePointer, true);
            document.removeEventListener("keydown", handleKey);
        };
    }, [onClose, isOpen, escape]);

    return ref;
}

/**
 * Standalone ESC binding for modals/drawers without a wrapper ref.
 */
export function useEscapeKey(onEscape, isActive = true) {
    useEffect(() => {
        if (!isActive) return undefined;
        const handler = (e) => {
            if (e.key === "Escape") {
                e.stopPropagation();
                onEscape?.(e);
            }
        };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [onEscape, isActive]);
}
