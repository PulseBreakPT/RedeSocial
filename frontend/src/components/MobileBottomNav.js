import { NavLink, useNavigate } from "react-router-dom";
import { Plus, PenSquare, Image as ImageIcon, Sparkles } from "lucide-react";
import { useEffect, useRef, useState, useCallback } from "react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useHideOnScroll } from "../hooks/useHideOnScroll";
import { haptic as centralHaptic } from "../lib/haptics";
import { PRIMARY_NAV } from "../lib/navItems";
import { PT } from "../theme/editorial";

// =============================================================================
// LUSORAE — Mobile Bottom Nav (clean editorial)
// 5 slots padrão indústria (Twitter/IG/Threads): Início · Explorar · FAB ·
// Notif · DMs. Rotas secundárias (Perfil, Calendário, Definições, Admin)
// chegam-se via avatar do MobileTopBar → ProfileSidebarMenu (drawer).
//
// Itens primários consumidos do single source of truth /lib/navItems.js,
// garantindo paridade automática com a desktop sidebar.
// =============================================================================

// Adapta PRIMARY_NAV para o formato do bottom-nav e injecta o FAB central.
// Os 4 itens (Home, Explorar, Notif, DMs) ficam ao redor do FAB de criação.
const MOBILE_LABELS_OVERRIDE = {
    "nav-notifications": "Notif.",
    "nav-messages":      "DMs",
};
const mnavTestidFor = (id) => id.replace(/^nav-/, "mnav-");
const PRIMARY_AS_MNAV = PRIMARY_NAV.map((it) => ({
    to:       it.to,
    icon:     it.icon,
    end:      it.end,
    label:    MOBILE_LABELS_OVERRIDE[it.testid] || it.label,
    testid:   mnavTestidFor(it.testid),
    badgeKey: it.badgeKey,
}));
const navItems = [
    PRIMARY_AS_MNAV[0],                                              // Início
    PRIMARY_AS_MNAV[1],                                              // Explorar
    { to: null, icon: Plus, testid: "mnav-compose", center: true }, // FAB
    PRIMARY_AS_MNAV[2],                                              // Notif
    PRIMARY_AS_MNAV[3],                                              // DMs
];

function haptic(ms = 12) {
    centralHaptic([ms]);
}

export function MobileBottomNav({ onCompose }) {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [msgCount, setMsgCount] = useState(0);
    const [notifCount, setNotifCount] = useState(0);
    const [draftCount, setDraftCount] = useState(0);
    const [quickOpen, setQuickOpen] = useState(false);
    const [pressed, setPressed] = useState(false);

    const fabHidden = useHideOnScroll(140) && !quickOpen;

    const longPressTimer = useRef(null);
    const longPressFired = useRef(false);

    useEffect(() => {
        const tick = async () => {
            try {
                const [m, n] = await Promise.all([
                    api.get("/messages/unread-count"),
                    api.get("/notifications/unread-count"),
                ]);
                setMsgCount(m.data.count);
                setNotifCount(n.data.count);
            } catch {}
        };
        tick();
        const id = setInterval(tick, 8000);
        return () => clearInterval(id);
    }, []);

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
        return () => { alive = false; clearInterval(id); };
    }, [user?.username]);

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
            setPressed(false);
        }, 480);
    }, []);

    const cancelLongPress = useCallback(() => {
        clearTimeout(longPressTimer.current);
        setPressed(false);
    }, []);

    const handleClick = useCallback(() => {
        if (longPressFired.current) {
            longPressFired.current = false;
            return;
        }
        if (quickOpen) { setQuickOpen(false); return; }
        haptic(10);
        onCompose?.();
    }, [onCompose, quickOpen]);

    const openStory = useCallback(() => {
        setQuickOpen(false);
        haptic(10);
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
                background: "rgba(255,255,255,0.94)",
                backdropFilter: "blur(20px) saturate(180%)",
                WebkitBackdropFilter: "blur(20px) saturate(180%)",
                borderTop: "1px solid rgba(10,10,10,0.06)",
                boxShadow: "0 -4px 24px -10px rgba(10,10,10,0.06)",
            }}
        >
            <div className="grid grid-cols-5 items-center h-[68px] px-1.5">
                {navItems.map((it, idx) => {
                    const Icon = it.icon;
                    if (it.center) {
                        return (
                            <div key={idx} className="flex items-center justify-center relative" data-fab-quick="root">
                                {quickOpen && (
                                    <div className="fab-quick-sheet" data-fab-quick="sheet" data-testid="fab-quick-sheet">
                                        <div
                                            className="py-1.5 min-w-[230px] overflow-hidden"
                                            style={{
                                                background: "#fff",
                                                border: "1px solid rgba(10,10,10,0.08)",
                                                boxShadow: "0 24px 60px -20px rgba(10,10,10,0.25), 0 6px 16px -8px rgba(10,10,10,0.10)",
                                                borderRadius: 20,
                                            }}
                                        >
                                            <QuickAction
                                                onClick={openText}
                                                testid="fab-quick-post"
                                                Icon={PenSquare}
                                                iconBg={PT.ink}
                                                iconFg="#fff"
                                                title="Publicação"
                                                sub="Escreve algo"
                                            />
                                            <div style={{ height: 1, background: "rgba(10,10,10,0.06)" }} />
                                            <QuickAction
                                                onClick={openPhoto}
                                                testid="fab-quick-photo"
                                                Icon={ImageIcon}
                                                iconBg={PT.azul}
                                                iconFg="#fff"
                                                title="Foto"
                                                sub="Mostra-nos"
                                            />
                                            <div style={{ height: 1, background: "rgba(10,10,10,0.06)" }} />
                                            <QuickAction
                                                onClick={openStory}
                                                testid="fab-quick-story"
                                                Icon={Sparkles}
                                                iconBg={PT.gold}
                                                iconFg={PT.ink}
                                                title="Story"
                                                sub="24 horas"
                                            />
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
                                        background: `linear-gradient(180deg, #1f1f1f 0%, ${PT.ink} 100%)`,
                                        color: "#fff",
                                        border: "3px solid #fff",
                                        boxShadow: "0 12px 28px -8px rgba(10,10,10,0.45), 0 4px 10px -4px rgba(10,10,10,0.2), inset 0 1px 0 rgba(255,255,255,0.12)",
                                        borderRadius: 999,
                                        transform: pressed ? "scale(0.94)" : "none",
                                        transition: "transform 180ms cubic-bezier(.22,1,.36,1)",
                                    }}
                                >
                                    <Icon size={26} strokeWidth={2.2} />
                                    {draftCount > 0 && (
                                        <span
                                            data-testid="fab-draft-dot"
                                            aria-hidden
                                            className="absolute -top-1 -right-1 min-w-[18px] h-5 px-1 grid place-items-center font-bold font-mono"
                                            style={{
                                                background: PT.gold, color: PT.ink,
                                                border: "2px solid #fff",
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
                                style={{ color: PT.ink }}
                            >
                                <Icon size={22} strokeWidth={1.9} />
                                <span className="text-[10px] tracking-tight font-medium">{it.label}</span>
                            </button>
                        );
                    }
                    const to = it.to === "/profile" ? `/u/${user?.username}` : it.to;
                    const isMsg = it.badgeKey === "msg";
                    const isNotif = it.badgeKey === "notif";
                    const badge = isMsg ? msgCount : isNotif ? notifCount : 0;

                    return (
                        <NavLink
                            key={idx}
                            to={to}
                            end={it.end}
                            data-testid={it.testid}
                            className="relative flex flex-col items-center justify-center gap-0.5 h-full active:scale-95 transition"
                            style={({ isActive }) => ({
                                color: isActive ? PT.ink : "rgba(10,10,10,0.55)",
                            })}
                        >
                            {({ isActive }) => (
                                <>
                                    {isActive && (
                                        <span
                                            aria-hidden
                                            className="absolute top-1 w-7 h-[3px] rounded-full"
                                            style={{ background: PT.ink }}
                                        />
                                    )}
                                    <span className="relative">
                                        <Icon
                                            size={21}
                                            strokeWidth={isActive ? 2.3 : 1.85}
                                            style={{ color: isActive ? PT.ink : "rgba(10,10,10,0.55)" }}
                                        />
                                        {badge > 0 && (
                                            <span
                                                data-testid={`mnav-${it.badgeKey}-badge`}
                                                className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 grid place-items-center font-bold font-mono"
                                                style={{
                                                    background: PT.red, color: "#fff",
                                                    border: "1.5px solid #fff",
                                                    borderRadius: 999,
                                                    fontSize: 9,
                                                    letterSpacing: "0.02em",
                                                }}
                                            >
                                                {badge > 99 ? "99+" : badge}
                                            </span>
                                        )}
                                    </span>
                                    <span
                                        className="text-[10px] font-bold uppercase"
                                        style={{
                                            color: isActive ? PT.ink : "rgba(10,10,10,0.55)",
                                            letterSpacing: "0.04em",
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

function QuickAction({ onClick, testid, Icon, iconBg, iconFg, title, sub }) {
    return (
        <button
            onClick={onClick}
            data-testid={testid}
            className="w-full flex items-center gap-3 px-4 py-3 transition text-left hover:bg-black/[0.025]"
            style={{ background: "transparent" }}
        >
            <span
                className="w-9 h-9 grid place-items-center shrink-0"
                style={{
                    background: iconBg, color: iconFg,
                    borderRadius: 999,
                    boxShadow: "0 4px 10px -4px rgba(10,10,10,0.25)",
                }}
            >
                <Icon size={15} strokeWidth={2.2} />
            </span>
            <div className="flex-1 min-w-0">
                <div className="text-[14px] font-bold tracking-tight" style={{ color: PT.ink }}>{title}</div>
                <div className="font-mono text-[10.5px] font-bold uppercase" style={{ color: "rgba(10,10,10,0.5)", letterSpacing: "0.10em" }}>{sub}</div>
            </div>
        </button>
    );
}
