import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { RightSidebar } from "./RightSidebar";
import { Composer } from "./Composer";
import { OnboardingModal } from "./OnboardingModal";
import { MobileBottomNav } from "./MobileBottomNav";
import { MobileTopBar } from "./MobileTopBar";
import { KeyboardShortcutsHelp } from "./KeyboardShortcutsHelp";
import { ScrollToTop } from "./ScrollToTop";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { useGlobalNotifications } from "../hooks/useGlobalNotifications";
import { X } from "lucide-react";

export function Layout() {
    const [composeOpen, setComposeOpen] = useState(false);
    const [helpOpen, setHelpOpen] = useState(false);

    useKeyboardShortcuts({
        openCompose: () => setComposeOpen(true),
        openHelp: () => setHelpOpen(true),
    });
    useGlobalNotifications();

    return (
        <div className="min-h-screen text-zinc-100">
            <MobileTopBar />
            <div className="grid grid-cols-1 lg:grid-cols-[240px_minmax(0,640px)_340px] max-w-[1300px] mx-auto gap-0 lg:gap-6 px-0 lg:px-6">
                <Sidebar onCompose={() => setComposeOpen(true)} />
                <main className="lg:border-x lg:border-white/[0.06] min-h-screen pb-28 lg:pb-0">
                    <Outlet context={{ openCompose: () => setComposeOpen(true) }} />
                </main>
                <RightSidebar />
            </div>

            <OnboardingModal />
            <MobileBottomNav onCompose={() => setComposeOpen(true)} />
            <ScrollToTop />
            {helpOpen && <KeyboardShortcutsHelp onClose={() => setHelpOpen(false)} />}

            {composeOpen && (
                <div
                    className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 grid place-items-start pt-12 lg:pt-20 px-4"
                    onClick={() => setComposeOpen(false)}
                >
                    <div
                        className="w-full max-w-xl card-premium rounded-3xl shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.05]">
                            <h2 className="font-heading text-xl font-bold">Nova publicação</h2>
                            <button
                                onClick={() => setComposeOpen(false)}
                                data-testid="close-composer-modal"
                                className="p-2 rounded-full hover:bg-white/[0.06] tap-shrink"
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <Composer asModal onClose={() => setComposeOpen(false)} onPosted={() => setComposeOpen(false)} />
                    </div>
                </div>
            )}
        </div>
    );
}
