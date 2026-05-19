import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, BellOff, Check, MoreHorizontal, Star, UserMinus, UserPlus, VolumeX, Volume2, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { api, toastApiError } from "../lib/api";
import { confirmDialog } from "./ConfirmDialog";
import { useAuth } from "../context/AuthContext";

/**
 * Smart Follow / Unfollow button — single source of truth for the social action.
 *
 * Props:
 *   profile     — user profile object with at least { id, username, is_self, is_following,
 *                  follows_me, is_blocked, is_muted, is_notified, is_favorited, followers_count }
 *   onChange    — (patch) => void — applies optimistic updates to the parent profile
 *   size        — "default" | "compact"  (compact for mobile bars / lists)
 *   showLabel   — boolean (default true) — when false, only icon (very compact)
 *   className   — extra classes for the wrapper
 *
 * Behaviour:
 *   · Anonymous viewer → click follow → navigates to /login?return=/u/{username}
 *   · Self (is_self) → renders nothing
 *   · Blocked → primary button becomes "Desbloquear"
 *   · follows_me && !is_following → "Seguir de volta" (CTA highlighted)
 *   · is_following → hover swaps "A seguir" → "Deixar de seguir" (Twitter pattern).
 *     Mobile (no hover) gets a confirm dialog before unfollow.
 *   · Kebab (⋯) opens dropdown with: 🔔 Notify, 🔕 Mute, ⭐ Favorite, Unfollow.
 *   · Haptic feedback on touch devices.
 *   · Optimistic UI with rollback + 'Undo' toast on unfollow.
 *   · In-flight guard prevents double-clicks.
 */
export function FollowButton({ profile, onChange, size = "default", showLabel = true, className = "" }) {
    const { user: viewer } = useAuth();
    const navigate = useNavigate();
    const [hover, setHover] = useState(false);
    const [busy, setBusy] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);
    const lastClickRef = useRef(0);

    // Close menu on outside click / escape
    useEffect(() => {
        if (!menuOpen) return;
        const onDown = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
        const onEsc = (e) => { if (e.key === "Escape") setMenuOpen(false); };
        document.addEventListener("mousedown", onDown);
        document.addEventListener("keydown", onEsc);
        return () => {
            document.removeEventListener("mousedown", onDown);
            document.removeEventListener("keydown", onEsc);
        };
    }, [menuOpen]);

    // Don't render for self — but defer the early return until AFTER all hooks
    const isHidden = !profile || profile.is_self;

    const username = profile?.username;
    const isFollowing = !!profile?.is_following;
    const followsMe = !!profile?.follows_me;
    const isBlocked = !!profile?.is_blocked;
    const isMuted = !!profile?.is_muted;
    const isNotified = !!profile?.is_notified;
    const isFavorited = !!profile?.is_favorited;

    // Tiny haptic ping on touch devices (no-op elsewhere) — routed through
    // the central haptics helper to honor user prefs + reduced-motion.
    const haptic = (pattern) => {
        try {
            // Lazy import to avoid circular deps; safe because module is tiny.
            // eslint-disable-next-line global-require
            const m = require("../lib/haptics");
            m.haptic(pattern);
        } catch {
            try { navigator.vibrate?.(pattern); } catch { /* ignore */ }
        }
    };

    // ----- Primary action (follow / unfollow) ----------------------------
    const doFollow = useCallback(async () => {
        // Anon → login
        if (!viewer) {
            navigate(`/login?return=${encodeURIComponent(`/u/${username}`)}`);
            return;
        }
        // Debounce double-clicks
        const now = Date.now();
        if (busy || now - lastClickRef.current < 350) return;
        lastClickRef.current = now;

        // Confirm only when unfollowing on touch (no hover affordance)
        const isTouch = typeof window !== "undefined" && window.matchMedia("(hover: none)").matches;
        if (isFollowing && isTouch) {
            const ok = await confirmDialog({
                title: `Deixar de seguir @${username}?`,
                description: "Vais deixar de ver as publicações desta pessoa no teu feed.",
                confirmText: "Deixar de seguir",
                cancelText: "Cancelar",
                danger: true,
            });
            if (!ok) return;
        }

        const prev = { is_following: isFollowing, followers_count: profile.followers_count };
        // Optimistic
        onChange?.({
            is_following: !isFollowing,
            followers_count: Math.max(0, (profile.followers_count || 0) + (isFollowing ? -1 : 1)),
        });
        haptic(isFollowing ? [8, 24, 8] : 14);
        setBusy(true);
        try {
            await api.post(`/users/${username}/follow`);
            if (isFollowing) {
                // Undo toast on unfollow
                toast(`Deixaste de seguir @${username}`, {
                    action: {
                        label: "Desfazer",
                        onClick: async () => {
                            try {
                                await api.post(`/users/${username}/follow`);
                                onChange?.({ is_following: true, followers_count: (profile.followers_count || 0) });
                                toast.success(`A seguir @${username} de novo`);
                            } catch (e) { toastApiError(e); }
                        },
                    },
                });
            } else {
                toast.success(followsMe ? `Agora seguem-se mutuamente · @${username}` : `A seguir @${username}`);
            }
        } catch (e) {
            // Rollback
            onChange?.(prev);
            toastApiError(e);
        } finally {
            setBusy(false);
        }
    }, [viewer, busy, isFollowing, profile.followers_count, username, followsMe, navigate, onChange]);

    // ----- Secondary actions (mute / notify / favorite / block) ----------
    const toggleNotify = useCallback(async () => {
        const prev = isNotified;
        onChange?.({ is_notified: !prev });
        try {
            const { data } = await api.post(`/users/${username}/notify`);
            onChange?.({ is_notified: !!data.notify });
            toast.success(data.notify ? "Vais receber notificações dos novos posts" : "Notificações desativadas");
        } catch (e) {
            onChange?.({ is_notified: prev });
            toastApiError(e);
        }
    }, [isNotified, username, onChange]);

    const toggleMute = useCallback(async () => {
        const prev = isMuted;
        onChange?.({ is_muted: !prev });
        try {
            const { data } = await api.post(`/users/${username}/mute`);
            onChange?.({ is_muted: !!data.muted });
            toast.success(data.muted ? "Publicações silenciadas" : "Já não está silenciado");
        } catch (e) {
            onChange?.({ is_muted: prev });
            toastApiError(e);
        }
    }, [isMuted, username, onChange]);

    const toggleFavorite = useCallback(async () => {
        const prev = isFavorited;
        onChange?.({ is_favorited: !prev });
        try {
            const { data } = await api.post(`/users/${username}/favorite`);
            onChange?.({ is_favorited: !!data.favorited });
            toast.success(data.favorited ? "Adicionado aos favoritos" : "Removido dos favoritos");
        } catch (e) {
            onChange?.({ is_favorited: prev });
            toastApiError(e);
        }
    }, [isFavorited, username, onChange]);

    const unblock = useCallback(async () => {
        if (busy) return;
        const ok = await confirmDialog({
            title: `Desbloquear @${username}?`,
            description: "Vão voltar a poder ver-se mutuamente.",
            confirmText: "Desbloquear",
            cancelText: "Cancelar",
        });
        if (!ok) return;
        setBusy(true);
        try {
            await api.post(`/users/${username}/block`);
            onChange?.({ is_blocked: false });
            toast.success(`Desbloqueaste @${username}`);
        } catch (e) {
            toastApiError(e);
        } finally {
            setBusy(false);
        }
    }, [busy, username, onChange]);

    // ----- Visual / sizing -----------------------------------------------
    const sizing = size === "compact"
        ? "h-9 px-4 text-[12px]"
        : "h-10 px-5 text-[12.5px]";
    const iconSize = size === "compact" ? 13 : 14;

    // ----- Render branches -----------------------------------------------
    if (isHidden) return null;
    // Blocked → only "Desbloquear" — no follow/menu/bell
    if (isBlocked) {
        return (
            <div className={`inline-flex items-center gap-1.5 ${className}`}>
                <button
                    onClick={unblock}
                    disabled={busy}
                    data-testid="follow-btn-unblock"
                    aria-label={`Desbloquear @${username}`}
                    className={`${sizing} rounded-full inline-flex items-center gap-1.5 border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition disabled:opacity-50 font-heading font-medium tracking-tight`}
                >
                    <ShieldOff size={iconSize} strokeWidth={1.8} />
                    {showLabel && <span>Desbloquear</span>}
                </button>
            </div>
        );
    }

    // Determine main button visual
    let mainClass = "btn-obsidian";
    let mainLabel = "Seguir";
    let mainIcon = <UserPlus size={iconSize} strokeWidth={1.8} />;
    let ariaPressed = false;

    if (isFollowing) {
        ariaPressed = true;
        if (hover) {
            mainClass = "border border-red-200 bg-red-50 text-red-600 hover:bg-red-100";
            mainLabel = "Deixar de seguir";
            mainIcon = <UserMinus size={iconSize} strokeWidth={1.9} />;
        } else if (followsMe) {
            mainClass = "chip-on !text-white";
            mainLabel = "A seguir · Mútuo";
            mainIcon = <Check size={iconSize} strokeWidth={2.2} />;
        } else {
            mainClass = "chip-on !text-white";
            mainLabel = "A seguir";
            mainIcon = <Check size={iconSize} strokeWidth={2.2} />;
        }
    } else if (followsMe) {
        mainClass = "btn-obsidian relative";
        mainLabel = "Seguir de volta";
        mainIcon = <UserPlus size={iconSize} strokeWidth={1.8} />;
    }

    return (
        <div className={`inline-flex items-center gap-1.5 relative ${className}`} ref={menuRef}>
            <button
                onClick={doFollow}
                onMouseEnter={() => setHover(true)}
                onMouseLeave={() => setHover(false)}
                onFocus={() => setHover(true)}
                onBlur={() => setHover(false)}
                disabled={busy}
                aria-pressed={ariaPressed}
                aria-label={isFollowing ? `A seguir @${username}. Clica para deixar de seguir.` : `Seguir @${username}`}
                data-testid={isFollowing ? "follow-btn-following" : "follow-btn-follow"}
                title={isFollowing ? (hover ? "Deixar de seguir" : (followsMe ? "Segue-te também" : "A seguir")) : (followsMe ? "Segue-te — segue de volta" : "Começar a seguir")}
                className={`${sizing} rounded-full inline-flex items-center gap-1.5 font-heading font-medium tracking-tight transition disabled:opacity-60 ${mainClass}`}
            >
                {busy ? (
                    <span className="inline-block w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" aria-hidden />
                ) : mainIcon}
                {showLabel && <span className="whitespace-nowrap">{mainLabel}</span>}
            </button>

            {/* Kebab menu — only when already following */}
            {isFollowing && (
                <>
                    <button
                        onClick={() => setMenuOpen((v) => !v)}
                        aria-haspopup="menu"
                        aria-expanded={menuOpen}
                        aria-label="Mais ações deste utilizador"
                        data-testid="follow-btn-more"
                        title="Mais ações"
                        className={`${size === "compact" ? "w-9 h-9" : "w-10 h-10"} rounded-full inline-flex items-center justify-center text-black/65 border border-black/[0.10] hover:bg-black/[0.04] hover:text-black transition tap-shrink`}
                    >
                        <MoreHorizontal size={size === "compact" ? 14 : 15} strokeWidth={1.9} />
                    </button>

                    {menuOpen && (
                        <div
                            role="menu"
                            data-testid="follow-btn-menu"
                            className="absolute z-50 top-full right-0 mt-2 w-[244px] bg-white border border-black/[0.08] rounded-2xl shadow-[0_25px_60px_-15px_rgba(13,13,16,0.28)] py-1.5 anim-fade-up overflow-hidden"
                        >
                            <button
                                role="menuitem"
                                onClick={() => { toggleNotify(); setMenuOpen(false); }}
                                data-testid="follow-menu-notify"
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-left text-black hover:bg-black/[0.04] transition"
                            >
                                {isNotified ? <Bell size={14} className="text-[color:var(--atl-500)]" /> : <BellOff size={14} className="text-black/55" />}
                                <span className="flex-1">{isNotified ? "Deixar de notificar" : "Notificar de novos posts"}</span>
                                {isNotified && <Check size={12} className="text-black/55" />}
                            </button>
                            <button
                                role="menuitem"
                                onClick={() => { toggleMute(); setMenuOpen(false); }}
                                data-testid="follow-menu-mute"
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-left text-black hover:bg-black/[0.04] transition"
                            >
                                {isMuted ? <Volume2 size={14} className="text-black/55" /> : <VolumeX size={14} className="text-black/55" />}
                                <span className="flex-1">{isMuted ? "Repor publicações" : "Silenciar publicações"}</span>
                                {isMuted && <Check size={12} className="text-black/55" />}
                            </button>
                            <button
                                role="menuitem"
                                onClick={() => { toggleFavorite(); setMenuOpen(false); }}
                                data-testid="follow-menu-favorite"
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-left text-black hover:bg-black/[0.04] transition"
                            >
                                <Star
                                    size={14}
                                    fill={isFavorited ? "currentColor" : "none"}
                                    className={isFavorited ? "text-amber-500" : "text-black/55"}
                                />
                                <span className="flex-1">{isFavorited ? "Remover dos favoritos" : "Adicionar aos favoritos"}</span>
                                {isFavorited && <Check size={12} className="text-black/55" />}
                            </button>
                            <div className="h-px bg-black/[0.06] my-1" />
                            <button
                                role="menuitem"
                                onClick={() => { setMenuOpen(false); doFollow(); }}
                                data-testid="follow-menu-unfollow"
                                className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] text-left text-red-600 hover:bg-red-50 transition"
                            >
                                <UserMinus size={14} />
                                <span className="flex-1">Deixar de seguir</span>
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
