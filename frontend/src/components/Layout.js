import { useState } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { RightSidebar } from "./RightSidebar";
import { Composer } from "./Composer";
import { OnboardingModal } from "./OnboardingModal";
import { MobileBottomNav } from "./MobileBottomNav";
import { MobileFAB } from "./MobileFAB";
import { KeyboardShortcutsHelp } from "./KeyboardShortcutsHelp";
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
            <div className="grid grid-cols-1 lg:grid-cols-[240px_minmax(0,640px)_340px] max-w-[1300px] mx-auto gap-0 lg:gap-6 px-0 lg:px-6">
                <Sidebar onCompose={() => setComposeOpen(true)} />
                <main className="border-x border-zinc-900 min-h-screen pb-24 lg:pb-0">
                    <Outlet context={{ openCompose: () => setComposeOpen(true) }} />
                </main>
                <RightSidebar />
            </div>

            <OnboardingModal />
            <MobileBottomNav />
            <MobileFAB onClick={() => setComposeOpen(true)} />
            {helpOpen && <KeyboardShortcutsHelp onClose={() => setHelpOpen(false)} />}

            {composeOpen && (
                <div
                    className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 grid place-items-start pt-20 px-4"
                    onClick={() => setComposeOpen(false)}
                >
                    <div
                        className="w-full max-w-xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl glow-vermillion"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-900">
                            <h2 className="font-heading text-xl font-bold">Nova publicação</h2>
                            <button
                                onClick={() => setComposeOpen(false)}
                                data-testid="close-composer-modal"
                                className="p-2 rounded-full hover:bg-white/5"
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
