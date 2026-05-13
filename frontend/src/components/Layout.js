import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { RightSidebar } from "./RightSidebar";
import { Composer } from "./Composer";
import { OnboardingModal } from "./OnboardingModal";
import { MobileBottomNav } from "./MobileBottomNav";
import { MobileTopBar } from "./MobileTopBar";
import { KeyboardShortcutsHelp } from "./KeyboardShortcutsHelp";
import { ScrollToTop } from "./ScrollToTop";
import { WebSocketProvider } from "./WebSocketProvider";
import { ActivityTickerLive } from "./ActivityTickerLive";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { useGlobalNotifications } from "../hooks/useGlobalNotifications";
import { useEscapeKey } from "../hooks/useClickOutside";
import { X } from "lucide-react";

export function Layout() {
    const [composeOpen, setComposeOpen] = useState(false);
    const [helpOpen, setHelpOpen] = useState(false);

    useKeyboardShortcuts({
        openCompose: () => setComposeOpen(true),
        openHelp: () => setHelpOpen(true),
    });
    useGlobalNotifications();

    // ESC closes the most relevant modal first (help > compose).
    useEscapeKey(() => {
        if (helpOpen) setHelpOpen(false);
        else if (composeOpen) setComposeOpen(false);
    }, helpOpen || composeOpen);

    // Lock body scroll while compose modal is open (so the page behind doesn't scroll on mobile)
    useEffect(() => {
        if (composeOpen) {
            const prev = document.body.style.overflow;
            document.body.style.overflow = "hidden";
            return () => {
                document.body.style.overflow = prev;
            };
        }
    }, [composeOpen]);

    return (
        <WebSocketProvider>
        <div className="min-h-screen text-black">
            <MobileTopBar />
            <div className="grid grid-cols-1 lg:grid-cols-[240px_minmax(0,640px)_340px] max-w-[1300px] mx-auto gap-0 lg:gap-6 px-0 lg:px-6">
                <Sidebar onCompose={() => setComposeOpen(true)} />
                <main className="lg:border-x lg:border-black/[0.07] min-h-screen pb-mobile-nav lg:pb-0 bg-white lg:bg-transparent">
                    <Outlet context={{ openCompose: () => setComposeOpen(true) }} />
                </main>
                <RightSidebar />
            </div>

            <OnboardingModal />
            <MobileBottomNav onCompose={() => setComposeOpen(true)} />
            <ScrollToTop />
            <ActivityTickerLive />
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
