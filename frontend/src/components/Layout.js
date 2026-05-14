import { useEffect, useState, useCallback } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { RightSidebar } from "./RightSidebar";
import { Composer } from "./Composer";
import { OnboardingModal } from "./OnboardingModal";
import { MobileBottomNav } from "./MobileBottomNav";
import { MobileTopBar } from "./MobileTopBar";
import { MobileMenuDrawer } from "./MobileMenuDrawer";
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
    const [helpOpen, setHelpOpen] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const [chatOpen, setChatOpen] = useState(false);
    const [dragPreview, setDragPreview] = useState({ dir: null, progress: 0 });
    const location = useLocation();

    useKeyboardShortcuts({
        openCompose: () => setComposeOpen(true),
        openHelp: () => setHelpOpen(true),
    });
    useGlobalNotifications();

    // Close drawers on route change (in case navigation came from outside)
    useEffect(() => {
        setMenuOpen(false);
        setChatOpen(false);
    }, [location.pathname]);

    // Only true blocking modals pause gestures — drawers themselves stay
    // gesture-enabled so the opposite swipe can close them.
    const modalOpen = composeOpen || helpOpen;

    // Gesture intelligence:
    //  - swipe right opens menu (or closes chat if it's the one showing)
    //  - swipe left  opens chat (or closes menu if it's the one showing)
    //  - never trigger while a true modal is up
    const handleSwipeRight = useCallback(() => {
        if (modalOpen) return;
        if (chatOpen) { setChatOpen(false); return; }
        if (menuOpen) return; // already open
        setMenuOpen(true);
    }, [modalOpen, chatOpen, menuOpen]);

    const handleSwipeLeft = useCallback(() => {
        if (modalOpen) return;
        if (menuOpen) { setMenuOpen(false); return; }
        if (chatOpen) return; // already open
        setChatOpen(true);
    }, [modalOpen, menuOpen, chatOpen]);

    const handleDragProgress = useCallback((s) => {
        // Don't show rail while drawers are already up
        if (menuOpen || chatOpen) { setDragPreview({ dir: null, progress: 0 }); return; }
        setDragPreview(s.finished ? { dir: null, progress: 0 } : { dir: s.dir, progress: s.progress });
    }, [menuOpen, chatOpen]);

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
        else if (menuOpen) setMenuOpen(false);
    }, helpOpen || composeOpen || chatOpen || menuOpen);

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

    // Subtle live drag affordance — a thin coloured "rail" follows the finger.
    // Visible only while user is dragging horizontally and no drawer/modal is up.
    const showRail = !modalOpen && !menuOpen && !chatOpen && dragPreview.dir && dragPreview.progress > 0.05;
    const railSide = dragPreview.dir === "right" ? "left" : dragPreview.dir === "left" ? "right" : null;

    return (
        <WebSocketProvider>
        <div className="min-h-screen text-black">
            <MobileTopBar onOpenMenu={() => setMenuOpen(true)} onOpenChat={() => setChatOpen(true)} />
            <div className="grid grid-cols-1 lg:grid-cols-[240px_minmax(0,640px)_340px] max-w-[1300px] mx-auto gap-0 lg:gap-6 px-0 lg:px-6">
                <Sidebar onCompose={() => setComposeOpen(true)} />
                <main className="lg:border-x lg:border-black/[0.07] min-h-screen pb-mobile-nav lg:pb-0 bg-white lg:bg-transparent">
                    <Outlet context={{ openCompose: () => setComposeOpen(true), openChat: () => setChatOpen(true), openMenu: () => setMenuOpen(true) }} />
                </main>
                <RightSidebar />
            </div>

            <OnboardingModal />
            <MobileBottomNav onCompose={() => setComposeOpen(true)} />
            <ScrollToTop />
            <ActivityTickerLive />

            {/* Gesture-driven drawers (live state lifted up so gestures can open them) */}
            <MobileMenuDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
            <MobileChatDrawer open={chatOpen} onClose={() => setChatOpen(false)} />
            <GestureHint />

            {/* Live drag affordance — thin rail glued to the relevant edge */}
            {showRail && (
                <div
                    aria-hidden
                    className="lg:hidden fixed inset-y-0 pointer-events-none z-[60]"
                    style={{
                        [railSide]: 0,
                        width: `${Math.round(dragPreview.progress * 5 + 2)}px`,
                        background: dragPreview.dir === "right"
                            ? "linear-gradient(180deg, rgba(74,123,191,0.0), rgba(74,123,191,0.55), rgba(74,123,191,0.0))"
                            : "linear-gradient(180deg, rgba(223,138,125,0.0), rgba(223,138,125,0.55), rgba(223,138,125,0.0))",
                        opacity: Math.min(1, dragPreview.progress * 1.8),
                        transition: "opacity 80ms linear",
                    }}
                />
            )}

            {helpOpen && <KeyboardShortcutsHelp onClose={() => setHelpOpen(false)} />}

            {composeOpen && (
                <div
                    className="fixed inset-0 bg-black/40 backdrop-blur-md z-50 flex items-end lg:items-start lg:justify-center lg:pt-20"
                    onClick={() => setComposeOpen(false)}
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
                                <h2 className="font-display text-[22px] lg:text-[26px] font-semibold tracking-tight leading-none">Nova publicação</h2>
                            <button
                                onClick={() => setComposeOpen(false)}
                                data-testid="close-composer-modal"
                                className="p-2 rounded-full hover:bg-black/[0.06] active:scale-90 tap-shrink"
                                aria-label="fechar"
                            >
                                <X size={18} strokeWidth={1.6} />
                            </button>
                        </div>
                        <Composer asModal onClose={() => setComposeOpen(false)} onPosted={() => setComposeOpen(false)} />
                    </div>
                </div>
            )}
        </div>
        </WebSocketProvider>
    );
}
