import { useEffect, useState, useCallback } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { LeftSidebar } from "./LeftSidebar";
import { RightSidebar } from "./RightSidebar";
import { Composer } from "./Composer";
import { OnboardingModal } from "./OnboardingModal";
import { MobileBottomNav } from "./MobileBottomNav";
import { MobileTopBar } from "./MobileTopBar";
import { MobileChatDrawer } from "./MobileChatDrawer";
import { GestureHint } from "./GestureHint";
import { KeyboardShortcutsHelp } from "./KeyboardShortcutsHelp";
import { ScrollToTop } from "./ScrollToTop";
import { WebSocketProvider } from "./WebSocketProvider";
import { ActivityTickerLive } from "./ActivityTickerLive";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { useGlobalNotifications } from "../hooks/useGlobalNotifications";
import { useEscapeKey } from "../hooks/useClickOutside";
import { useEdgeGestures } from "../hooks/useEdgeGestures";
import { X } from "lucide-react";

export function Layout() {
    const [composeOpen, setComposeOpen] = useState(false);
    const [composeDraft, setComposeDraft] = useState(null); // pre-fill with an existing draft post
    const [helpOpen, setHelpOpen] = useState(false);
    const [chatOpen, setChatOpen] = useState(false);
    const [dragPreview, setDragPreview] = useState({ dir: null, progress: 0 });
    const location = useLocation();

    const openCompose = useCallback((opts) => {
        setComposeDraft(opts?.draft || null);
        setComposeOpen(true);
    }, []);
    const closeCompose = useCallback(() => {
        setComposeOpen(false);
        setComposeDraft(null);
    }, []);

    useKeyboardShortcuts({
        openCompose: () => openCompose(),
        openHelp: () => setHelpOpen(true),
    });
    useGlobalNotifications();

    // Close chat drawer on route change
    useEffect(() => {
        setChatOpen(false);
    }, [location.pathname]);

    const modalOpen = composeOpen || helpOpen;

    // Gesture intelligence (left-side menu drawer removed):
    //  - swipe left opens chat drawer (or closes it if already open)
    //  - swipe right closes the chat drawer if it's open; otherwise no-op
    const handleSwipeRight = useCallback(() => {
        if (modalOpen) return;
        if (chatOpen) { setChatOpen(false); return; }
    }, [modalOpen, chatOpen]);

    const handleSwipeLeft = useCallback(() => {
        if (modalOpen) return;
        if (chatOpen) return; // already open
        setChatOpen(true);
    }, [modalOpen, chatOpen]);

    const handleDragProgress = useCallback((s) => {
        if (chatOpen) { setDragPreview({ dir: null, progress: 0 }); return; }
        // Only show rail for the left-edge gesture that opens chat (swipe left from right edge)
        if (s.dir === "right") { setDragPreview({ dir: null, progress: 0 }); return; }
        setDragPreview(s.finished ? { dir: null, progress: 0 } : { dir: s.dir, progress: s.progress });
    }, [chatOpen]);

    useEdgeGestures({
        enabled: !modalOpen,
        onSwipeRight: handleSwipeRight,
        onSwipeLeft: handleSwipeLeft,
        onDragProgress: handleDragProgress,
    });

    // ESC closes the most relevant overlay first
    useEscapeKey(() => {
        if (helpOpen) setHelpOpen(false);
        else if (composeOpen) setComposeOpen(false);
        else if (chatOpen) setChatOpen(false);
    }, helpOpen || composeOpen || chatOpen);

    // Lock body scroll while compose modal is open
    useEffect(() => {
        if (composeOpen) {
            const prev = document.body.style.overflow;
            document.body.style.overflow = "hidden";
            return () => {
                document.body.style.overflow = prev;
            };
        }
    }, [composeOpen]);

    // Subtle live drag affordance — shown only for the swipe-left (chat) gesture.
    const showRail = !modalOpen && !chatOpen && dragPreview.dir === "left" && dragPreview.progress > 0.05;

    return (
        <WebSocketProvider>
        <div className="min-h-screen text-black">
            <MobileTopBar onOpenChat={() => setChatOpen(true)} />
            <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,640px)_340px] max-w-[1320px] mx-auto gap-0 lg:gap-6 px-0 lg:px-6">
                <LeftSidebar onCompose={() => openCompose()} />
                <main className="lg:border-x lg:border-black/[0.07] min-h-screen pb-mobile-nav lg:pb-0 bg-white lg:bg-transparent">
                    <Outlet context={{ openCompose, openChat: () => setChatOpen(true) }} />
                </main>
                <RightSidebar />
            </div>

            <OnboardingModal />
            <MobileBottomNav onCompose={() => openCompose()} />
            <ScrollToTop />
            <ActivityTickerLive />

            {/* Chat drawer (swipe-left from right edge, or button in top bar) */}
            <MobileChatDrawer open={chatOpen} onClose={() => setChatOpen(false)} />
            <GestureHint />

            {/* Live drag affordance for chat drawer */}
            {showRail && (
                <div
                    aria-hidden
                    className="lg:hidden fixed inset-y-0 right-0 pointer-events-none z-[60]"
                    style={{
                        width: `${Math.round(dragPreview.progress * 5 + 2)}px`,
                        background: "linear-gradient(180deg, rgba(223,138,125,0.0), rgba(223,138,125,0.55), rgba(223,138,125,0.0))",
                        opacity: Math.min(1, dragPreview.progress * 1.8),
                        transition: "opacity 80ms linear",
                    }}
                />
            )}

            {helpOpen && <KeyboardShortcutsHelp onClose={() => setHelpOpen(false)} />}

            {composeOpen && (
                <div
                    className="fixed inset-0 bg-black/40 backdrop-blur-md z-50 flex items-end lg:items-start lg:justify-center lg:pt-20"
                    onClick={closeCompose}
                    data-testid="composer-backdrop"
                >
                    <div
                        className="w-full lg:max-w-xl card-premium rounded-t-3xl lg:rounded-3xl shadow-2xl anim-sheet-up lg:anim-fade-up pb-safe"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Drag handle for mobile (visual cue it's a bottom sheet) */}
                        <div className="lg:hidden flex justify-center pt-2 pb-1">
                            <span className="w-10 h-1 rounded-full bg-black/20" />
                        </div>
                        <div className="flex items-center justify-between px-5 lg:px-6 py-3 lg:py-4 hairline-b">
                                <h2 className="font-display text-[22px] lg:text-[26px] font-semibold tracking-tight leading-none">
                                    {composeDraft ? "Editar rascunho" : "Nova publicação"}
                                </h2>
                            <button
                                onClick={closeCompose}
                                data-testid="close-composer-modal"
                                className="p-2 rounded-full hover:bg-black/[0.06] active:scale-90 tap-shrink"
                                aria-label="fechar"
                            >
                                <X size={18} strokeWidth={1.6} />
                            </button>
                        </div>
                        <Composer asModal initialPost={composeDraft} onClose={closeCompose} onPosted={closeCompose} />
                    </div>
                </div>
            )}
        </div>
        </WebSocketProvider>
    );
}
