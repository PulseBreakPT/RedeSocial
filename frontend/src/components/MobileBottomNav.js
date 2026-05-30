import { NavLink, useNavigate } from "react-router-dom";
import { Home, Compass, MessageCircle, User, Plus, PenSquare, Image as ImageIcon, Sparkles } from "lucide-react";
import { useEffect, useRef, useState, useCallback } from "react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useHideOnScroll } from "../hooks/useHideOnScroll";
import { haptic as centralHaptic } from "../lib/haptics";
import { PT } from "../pages/auth/AuthDecor";

const navItems = [
    { to: "/feed", icon: Home, testid: "mnav-home", end: true, label: "Início" },
    { to: "/explore", icon: Compass, testid: "mnav-explore", label: "Explorar" },
    { to: null, icon: Plus, testid: "mnav-compose", center: true },
    { to: "/messages", icon: MessageCircle, testid: "mnav-messages", label: "DMs", badgeKey: "msg" },
    { to: "/premium", icon: Sparkles, testid: "mnav-premium", label: "Premium", isPremium: true },
];

// Whisper tooltip: appears once per session on the central FAB to hint creation.
const WHISPER_KEY = "vm:fab-whisper:v1";

function haptic(ms = 12) {
    // Bridge to central haptics (respects user prefs + reduced-motion).
    // `ms` is treated as a generic tap.
    centralHaptic([ms]);
}

export function MobileBottomNav({ onCompose }) {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [msgCount, setMsgCount] = useState(0);
    const [draftCount, setDraftCount] = useState(0);
    const [quickOpen, setQuickOpen] = useState(false);
    const [pressed, setPressed] = useState(false);
    const [showWhisper, setShowWhisper] = useState(false);

    // Smart FAB — hides the centre compose button when scrolling down, reappears
    // when scrolling up or near top. Keeps the rest of the nav visible.
    const fabHidden = useHideOnScroll(140) && !quickOpen;

    const longPressTimer = useRef(null);
    const longPressFired = useRef(false);

    useEffect(() => {
        const tick = async () => {
            try {
                const m = await api.get("/messages/unread-count");
                setMsgCount(m.data.count);
            } catch {}
        };
        tick();
        const id = setInterval(tick, 8000);
        return () => clearInterval(id);
    }, []);

    // Drafts indicator — checks once on mount and every 60s.
    useEffect(() => {
        if (!user?.username) return;
        let alive = true;
        const fetchDrafts = async () => {
            try {
                const r = await api.get("/posts/drafts");
                if (!alive) return;
                const list = Array.isArray(r.data) ? r.data : (r.data?.items || []);
                setDraftCount(list.length || 0);
            } catch {}
        };
        fetchDrafts();
        const id = setInterval(fetchDrafts, 60000);
        return () => {
            alive = false;
            clearInterval(id);
        };
    }, [user?.username]);

    // Whisper tooltip — shows ONCE per session, ~1.5s after mount.
    useEffect(() => {
        if (!user?.username) return;
        try {
            if (sessionStorage.getItem(WHISPER_KEY)) return;
        } catch { return; }
        const t = setTimeout(() => {
            setShowWhisper(true);
            try { sessionStorage.setItem(WHISPER_KEY, "1"); } catch {}
            // Auto-hide after the CSS animation finishes (3.6s).
            setTimeout(() => setShowWhisper(false), 3700);
        }, 1500);
        return () => clearTimeout(t);
    }, [user?.username]);

    // Close quick sheet on outside tap / Esc.
    useEffect(() => {
        if (!quickOpen) return;
        const onDoc = (e) => {
            if (e.target?.closest?.("[data-fab-quick]")) return;
            setQuickOpen(false);
        };
        const onKey = (e) => { if (e.key === "Escape") setQuickOpen(false); };
        document.addEventListener("touchstart", onDoc, { passive: true });
        document.addEventListener("mousedown", onDoc);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("touchstart", onDoc);
            document.removeEventListener("mousedown", onDoc);
            document.removeEventListener("keydown", onKey);
        };
    }, [quickOpen]);

    const startLongPress = useCallback(() => {
        longPressFired.current = false;
        setPressed(true);
        clearTimeout(longPressTimer.current);
        longPressTimer.current = setTimeout(() => {
            longPressFired.current = true;
            haptic(18);
            setQuickOpen(true);
            setShowWhisper(false);
            setPressed(false);
        }, 480);
    }, []);

    const cancelLongPress = useCallback(() => {
        clearTimeout(longPressTimer.current);
        setPressed(false);
    }, []);

    const handleClick = useCallback(() => {
        // If long-press fired, the click is a side-effect of the touch end — swallow it.
        if (longPressFired.current) {
            longPressFired.current = false;
            return;
        }
        if (quickOpen) { setQuickOpen(false); return; }
        haptic(10);
        setShowWhisper(false);
        onCompose?.();
    }, [onCompose, quickOpen]);

    const openStory = useCallback(() => {
        setQuickOpen(false);
        haptic(10);
        // Story creation lives on the home feed (StoriesBar). Navigate there and
        // dispatch a window event that StoriesBar listens for.
        navigate("/feed");
        setTimeout(() => {
            try { window.dispatchEvent(new Event("vermillion:open-story-composer")); } catch {}
        }, 60);
    }, [navigate]);

    const openText = useCallback(() => {
        setQuickOpen(false);
        haptic(10);
        onCompose?.();
    }, [onCompose]);

    const openPhoto = useCallback(() => {
        setQuickOpen(false);
        haptic(10);
        // Composer auto-focus on image picker — we just open it and let user tap the image button.
        // (no deep API change needed)
        onCompose?.();
        setTimeout(() => {
            try { window.dispatchEvent(new Event("vermillion:composer-focus-images")); } catch {}
        }, 120);
    }, [onCompose]);

    return (
        <nav
            className="lg:hidden fixed bottom-0 inset-x-0 z-40 pb-safe"
            data-testid="mobile-bottom-nav"
            style={{
                background: "rgba(10,10,10,0.96)",
                backdropFilter: "blur(8px)",
                borderTop: `2.5px solid ${PT.gold}`,
            }}
        >
            <div className="grid grid-cols-5 items-center h-[68px] px-1.5">
                {navItems.map((it, idx) => {
                    const Icon = it.icon;
                    if (it.center) {
                        return (
                            <div key={idx} className="flex items-center justify-center relative" data-fab-quick="root">
                                {/* Whisper tooltip — once per session */}
                                {showWhisper && !quickOpen && (
                                    <span className="fab-whisper" role="status" aria-live="polite">
                                        Partilha algo ✨
                                    </span>
                                )}

                                {/* Quick actions sheet (long-press) */}
                                {quickOpen && (
                                    <div className="fab-quick-sheet" data-fab-quick="sheet" data-testid="fab-quick-sheet">
                                        <div
                                            className="py-1.5 min-w-[220px] overflow-hidden"
                                            style={{
                                                background: "#fff",
                                                border: `3px solid ${PT.ink}`,
                                                boxShadow: `5px 5px 0 ${PT.ink}`,
                                                borderRadius: 18,
                                            }}
                                        >
                                            <button
                                                onClick={openText}
                                                data-testid="fab-quick-post"
                                                className="w-full flex items-center gap-3 px-4 py-3 transition text-left"
                                                style={{ background: "transparent" }}
                                                onMouseEnter={(e)=>e.currentTarget.style.background=PT.cream}
                                                onMouseLeave={(e)=>e.currentTarget.style.background="transparent"}
                                            >
                                                <span
                                                    className="w-9 h-9 grid place-items-center"
                                                    style={{
                                                        background: PT.ink, color: PT.gold,
                                                        border: `2px solid ${PT.ink}`,
                                                        boxShadow: `2px 2px 0 ${PT.red}`,
                                                        borderRadius: 999,
                                                    }}
                                                >
                                                    <PenSquare size={15} strokeWidth={2.2} />
                                                </span>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-[14px] font-black tracking-tight" style={{ color: PT.ink }}>Publicação</div>
                                                    <div className="text-[11px] font-mono font-bold uppercase" style={{ color: "rgba(10,10,10,0.55)", letterSpacing: "0.06em" }}>Escreve algo</div>
                                                </div>
                                            </button>
                                            <button
                                                onClick={openPhoto}
                                                data-testid="fab-quick-photo"
                                                className="w-full flex items-center gap-3 px-4 py-3 transition text-left"
                                                style={{ background: "transparent", borderTop: `2px dashed ${PT.ink}` }}
                                                onMouseEnter={(e)=>e.currentTarget.style.background=PT.cream}
                                                onMouseLeave={(e)=>e.currentTarget.style.background="transparent"}
                                            >
                                                <span
                                                    className="w-9 h-9 grid place-items-center"
                                                    style={{
                                                        background: PT.azul, color: "#fff",
                                                        border: `2px solid ${PT.ink}`,
                                                        boxShadow: `2px 2px 0 ${PT.ink}`,
                                                        borderRadius: 999,
                                                    }}
                                                >
                                                    <ImageIcon size={15} strokeWidth={2.2} />
                                                </span>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-[14px] font-black tracking-tight" style={{ color: PT.ink }}>Foto</div>
                                                    <div className="text-[11px] font-mono font-bold uppercase" style={{ color: "rgba(10,10,10,0.55)", letterSpacing: "0.06em" }}>Mostra-nos</div>
                                                </div>
                                            </button>
                                            <button
                                                onClick={openStory}
                                                data-testid="fab-quick-story"
                                                className="w-full flex items-center gap-3 px-4 py-3 transition text-left"
                                                style={{ background: "transparent", borderTop: `2px dashed ${PT.ink}` }}
                                                onMouseEnter={(e)=>e.currentTarget.style.background=PT.cream}
                                                onMouseLeave={(e)=>e.currentTarget.style.background="transparent"}
                                            >
                                                <span
                                                    className="w-9 h-9 grid place-items-center"
                                                    style={{
                                                        background: PT.gold, color: PT.ink,
                                                        border: `2px solid ${PT.ink}`,
                                                        boxShadow: `2px 2px 0 ${PT.red}`,
                                                        borderRadius: 999,
                                                    }}
                                                >
                                                    <Sparkles size={15} strokeWidth={2.2} />
                                                </span>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-[14px] font-black tracking-tight" style={{ color: PT.ink }}>Story</div>
                                                    <div className="text-[11px] font-mono font-bold uppercase" style={{ color: "rgba(10,10,10,0.55)", letterSpacing: "0.06em" }}>24 horas</div>
                                                </div>
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <button
                                    onClick={handleClick}
                                    onContextMenu={(e) => e.preventDefault()}
                                    onTouchStart={startLongPress}
                                    onTouchEnd={cancelLongPress}
                                    onTouchCancel={cancelLongPress}
                                    onMouseDown={startLongPress}
                                    onMouseUp={cancelLongPress}
                                    onMouseLeave={cancelLongPress}
                                    data-testid={it.testid}
                                    data-fab-quick="btn"
                                    aria-label={quickOpen ? "Fechar opções de criação" : (draftCount > 0 ? `Criar — ${draftCount} rascunho${draftCount === 1 ? "" : "s"} guardado${draftCount === 1 ? "" : "s"}` : "Criar publicação")}
                                    aria-haspopup="menu"
                                    aria-expanded={quickOpen}
                                    className={`chrome-transition -mt-7 w-14 h-14 grid place-items-center ${pressed ? "is-pressed" : ""} ${fabHidden ? "chrome-hide-down" : ""}`}
                                    style={{
                                        background: PT.red,
                                        color: "#fff",
                                        border: `3px solid #fff`,
                                        boxShadow: `4px 4px 0 ${PT.gold}`,
                                        borderRadius: 999,
                                        transform: pressed ? "scale(0.94) rotate(-3deg)" : "none",
                                        transition: "transform 180ms cubic-bezier(.22,1,.36,1)",
                                    }}
                                >
                                    <Icon size={26} strokeWidth={2.4} />
                                    {draftCount > 0 && (
                                        <span
                                            data-testid="fab-draft-dot"
                                            aria-hidden
                                            className="absolute -top-1 -right-1 min-w-[18px] h-5 px-1 grid place-items-center font-black"
                                            style={{
                                                background: PT.gold, color: PT.ink,
                                                border: `2px solid #fff`,
                                                borderRadius: 999,
                                                fontSize: 10,
                                            }}
                                        >
                                            {draftCount > 9 ? "9+" : draftCount}
                                        </span>
                                    )}
                                </button>
                            </div>
                        );
                    }
                    if (it.to === "/profile" && !user?.username) {
                        return (
                            <button
                                key={idx}
                                onClick={() => navigate("/login")}
                                className="flex flex-col items-center justify-center gap-0.5 h-full active:scale-95 transition"
                                style={{ color: "#fff" }}
                            >
                                <Icon size={22} strokeWidth={1.9} />
                                <span className="text-[10px] tracking-tight font-medium">{it.label}</span>
                            </button>
                        );
                    }
                    const to = it.to === "/profile" ? `/u/${user?.username}` : it.to;
                    const isMsg = it.badgeKey === "msg";
                    const isPremium = it.isPremium === true;
                    
                    return (
                        <NavLink
                            key={idx}
                            to={to}
                            end={it.end}
                            data-testid={it.testid}
                            className={({ isActive }) =>
                                `relative flex flex-col items-center justify-center gap-0.5 h-full active:scale-95 transition`
                            }
                            style={({ isActive }) => ({
                                color: isActive ? PT.gold : "#fff",
                            })}
                        >
                            {({ isActive }) => (
                                <>
                                    {isActive && (
                                        <span
                                            aria-hidden
                                            className="absolute top-1 w-7 h-[3px] rounded-full"
                                            style={{ background: PT.gold }}
                                        />
                                    )}
                                    <span className="relative">
                                        <Icon
                                            size={21}
                                            strokeWidth={isActive ? 2.4 : 1.9}
                                            style={{ color: isActive ? PT.gold : "#fff" }}
                                        />
                                        {isMsg && msgCount > 0 && (
                                            <span
                                                data-testid="mnav-msg-badge"
                                                className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 grid place-items-center font-black font-mono"
                                                style={{
                                                    background: PT.red, color: "#fff",
                                                    border: `1.5px solid #fff`,
                                                    borderRadius: 999,
                                                    fontSize: 9,
                                                    letterSpacing: "0.02em",
                                                }}
                                            >
                                                {msgCount > 99 ? "99+" : msgCount}
                                            </span>
                                        )}
                                    </span>
                                    <span
                                        className={`text-[10px] font-black uppercase`}
                                        style={{
                                            color: isActive ? PT.gold : "#fff",
                                            letterSpacing: "0.04em",
                                            opacity: isActive ? 1 : 0.85,
                                        }}
                                    >
                                        {it.label}
                                    </span>
                                </>
                            )}
                        </NavLink>
                    );
                })}
            </div>
        </nav>
    );
}
