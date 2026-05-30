import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    UserPlus, UserMinus, Check, MessageCircleHeart, ShieldAlert, ShieldOff,
    Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { api, toastApiError } from "../../lib/api";
import { confirmDialog } from "../../components/ConfirmDialog";
import { useAuth } from "../../context/AuthContext";

/**
 * ProfileActionRow — barra de acção proeminente abaixo da identidade.
 *
 * Centraliza as 4 acções sociais com **wording editorial** ("Acompanhar",
 * "Falar com X", "Levantar muro") em vez de termos genéricos. Aparece
 * apenas quando estamos a ver o perfil de outra pessoa (`!profile.is_self`)
 * e o perfil é visível (`profile.can_view !== false`).
 *
 * Lógica:
 *  · Anónimo → "Acompanhar" envia para /login com return-url.
 *  · A seguir → botão mostra "A acompanhar"; se for mútuo, mostra
 *    "Acompanhamo-nos" com tick. Hover ou foco revela "Deixar de acompanhar".
 *  · Mobile (no-hover) usa confirmação modal antes de deixar de acompanhar.
 *  · Bloqueado → toda a barra colapsa para um único botão "Voltar a abrir"
 *    (o perfil já é mostrado limitado pelo backend).
 *  · "Levantar muro" sempre exige confirmação. Após bloquear, o backend
 *    desfaz o follow → atualizamos `is_following:false` no perfil.
 *  · Optimistic UI com rollback em erro.
 *  · Haptic feedback discreto em touch.
 */
export function ProfileActionRow({ profile, onMessage, onProfileUpdate }) {
    const { user: viewer } = useAuth();
    const navigate = useNavigate();
    const [busy, setBusy] = useState(null); // "follow" | "block"
    const [hover, setHover] = useState(false);
    const [blocked, setBlocked] = useState(!!profile.is_blocked);
    const lastClickRef = useRef(0);

    // Hidratar estado de relação a partir do backend (favoritos/notify/mute
    // ficam no kebab; aqui só precisamos de blocked como override).
    useEffect(() => {
        let alive = true;
        (async () => {
            try {
                const { data } = await api.get(`/users/${profile.username}/relation`);
                if (alive && typeof data?.blocked === "boolean") setBlocked(data.blocked);
            } catch { /* silent */ }
        })();
        return () => { alive = false; };
    }, [profile.username]);

    const firstName = profile.name?.split(" ")[0] || profile.username;
    const isFollowing = !!profile.is_following;
    const followsMe = !!profile.follows_me;
    const isMutual = isFollowing && followsMe;

    const haptic = (pattern) => {
        try { navigator.vibrate?.(pattern); } catch { /* noop */ }
    };

    // ----- Follow / Unfollow -----
    const doFollow = async () => {
        if (!viewer) {
            navigate(`/login?return=${encodeURIComponent(`/u/${profile.username}`)}`);
            return;
        }
        const now = Date.now();
        if (busy || now - lastClickRef.current < 350) return;
        lastClickRef.current = now;

        const isTouch = typeof window !== "undefined" && window.matchMedia("(hover: none)").matches;
        if (isFollowing && isTouch) {
            const ok = await confirmDialog({
                title: `Deixar de seguir @${profile.username}?`,
                description: "As publicações desta pessoa deixam de aparecer no teu feed.",
                confirmText: "Deixar de seguir",
                cancelText: "Manter",
                danger: true,
            });
            if (!ok) return;
        }

        const prev = { is_following: isFollowing, followers_count: profile.followers_count };
        onProfileUpdate?.({
            is_following: !isFollowing,
            followers_count: Math.max(0, (profile.followers_count || 0) + (isFollowing ? -1 : 1)),
        });
        haptic(isFollowing ? [8, 24, 8] : 14);
        setBusy("follow");
        try {
            await api.post(`/users/${profile.username}/follow`);
            if (isFollowing) {
                toast(`Deixaste de seguir @${profile.username}`, {
                    action: {
                        label: "Desfazer",
                        onClick: async () => {
                            try {
                                await api.post(`/users/${profile.username}/follow`);
                                onProfileUpdate?.({ is_following: true, followers_count: profile.followers_count || 0 });
                                toast.success(`Voltaste a seguir @${profile.username}`);
                            } catch (e) { toastApiError(e); }
                        },
                    },
                });
            } else {
                toast.success(followsMe ? `Seguem-se · @${profile.username}` : `A seguir @${profile.username}`);
            }
        } catch (e) {
            onProfileUpdate?.(prev);
            toastApiError(e);
        } finally {
            setBusy(null);
        }
    };

    // ----- Block / Unblock -----
    const doBlock = async () => {
        if (busy) return;
        if (!blocked) {
            const ok = await confirmDialog({
                title: `Levantar muro com @${profile.username}?`,
                description: "Deixam de se ver um ao outro. As tuas publicações ficam invisíveis para esta pessoa, e as dela para ti. Podes voltar a abrir quando quiseres.",
                confirmText: "Levantar muro",
                cancelText: "Cancelar",
                danger: true,
            });
            if (!ok) return;
        }
        setBusy("block");
        try {
            const { data } = await api.post(`/users/${profile.username}/block`);
            const nowBlocked = !!data.blocked;
            setBlocked(nowBlocked);
            if (nowBlocked) {
                // backend desfaz follow do nosso lado — refletir
                onProfileUpdate?.({ is_blocked: true, is_following: false });
                toast.success(`Muro levantado · @${profile.username}`);
                haptic([10, 30, 10]);
            } else {
                onProfileUpdate?.({ is_blocked: false });
                toast.success(`Voltaste a abrir com @${profile.username}`);
            }
        } catch (e) { toastApiError(e); }
        finally { setBusy(null); }
    };

    // ====== BLOCKED VIEW — colapsa a barra para um único botão · FANZINE ======
    if (blocked) {
        return (
            <div
                className="px-4 lg:px-6 mt-4"
                data-testid="profile-action-row-blocked"
            >
                <div
                    className="px-4 py-3 flex flex-wrap items-center gap-3"
                    style={{
                        background: "#FFF4DC",
                        border: "3px solid #C8261E",
                        boxShadow: "4px 4px 0 #0A0A0A",
                        borderRadius: 14,
                    }}
                >
                    <div className="flex items-center gap-2" style={{ color: "#C8261E" }}>
                        <ShieldAlert size={16} strokeWidth={2.4} />
                        <span className="font-black tracking-tight" style={{ fontSize: 13.5 }}>
                            Muro levantado com {firstName}
                        </span>
                    </div>
                    <p className="text-[12px] leading-snug flex-1 min-w-[180px] font-medium" style={{ color: "rgba(10,10,10,0.65)" }}>
                        Não se veem mutuamente. Podes voltar a abrir quando quiseres.
                    </p>
                    <button
                        onClick={doBlock}
                        disabled={busy === "block"}
                        data-testid="action-unblock"
                        className="inline-flex items-center gap-1.5 px-4 py-2 font-black uppercase tap-shrink disabled:opacity-50"
                        style={{
                            background: "#fff", color: "#C8261E",
                            border: "2.5px solid #0A0A0A",
                            boxShadow: "2.5px 2.5px 0 #0A0A0A",
                            borderRadius: 999,
                            fontSize: 12, letterSpacing: "0.04em",
                        }}
                    >
                        {busy === "block" ? <Loader2 size={13} className="animate-spin" /> : <ShieldOff size={13} strokeWidth={2.4} />}
                        Voltar a abrir
                    </button>
                </div>
            </div>
        );
    }

    // ====== NORMAL VIEW — Seguir · Mensagem · Levantar muro · FANZINE ======
    let followStyle, followLabel, followIcon;
    if (isFollowing) {
        if (hover) {
            followStyle = { background: "#C8261E", color: "#fff", border: "2.5px solid #0A0A0A", boxShadow: "3px 3px 0 #0A0A0A" };
            followLabel = "Deixar de seguir";
            followIcon = <UserMinus size={14} strokeWidth={2.4} />;
        } else {
            followStyle = { background: "#1F7A5A", color: "#fff", border: "2.5px solid #0A0A0A", boxShadow: "3px 3px 0 #0A0A0A" };
            followLabel = isMutual ? "Seguem-se" : "A seguir";
            followIcon = <Check size={14} strokeWidth={2.6} />;
        }
    } else {
        followStyle = { background: "#0A0A0A", color: "#FFD93D", border: "2.5px solid #0A0A0A", boxShadow: "3px 3px 0 #C8261E" };
        followLabel = followsMe ? "Seguir de volta" : "Seguir";
        followIcon = <UserPlus size={14} strokeWidth={2.4} />;
    }

    return (
        <div
            className="px-4 lg:px-6 mt-4"
            data-testid="profile-action-row"
        >
            <div
                className="grain isolate p-3 sm:p-3.5"
                style={{
                    background: "#fff",
                    border: "2.5px solid #0A0A0A",
                    boxShadow: "4px 4px 0 #0A0A0A",
                    borderRadius: 12,
                }}
            >
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2">
                    {/* Seguir / Deixar de seguir */}
                    <button
                        onClick={doFollow}
                        onMouseEnter={() => setHover(true)}
                        onMouseLeave={() => setHover(false)}
                        onFocus={() => setHover(true)}
                        onBlur={() => setHover(false)}
                        disabled={busy === "follow"}
                        aria-pressed={isFollowing}
                        data-testid={isFollowing ? "action-following" : "action-follow"}
                        className="h-11 px-5 inline-flex items-center justify-center gap-2 font-black uppercase tap-shrink disabled:opacity-60"
                        style={{ ...followStyle, borderRadius: 999, fontSize: 12.5, letterSpacing: "0.04em" }}
                    >
                        {busy === "follow" ? <Loader2 size={14} className="animate-spin" /> : followIcon}
                        <span className="whitespace-nowrap">{followLabel}</span>
                    </button>

                    {/* Mensagem */}
                    <button
                        onClick={onMessage}
                        data-testid="action-message"
                        title={`Enviar mensagem a ${firstName}`}
                        className="h-11 px-5 inline-flex items-center justify-center gap-2 font-black uppercase tap-shrink"
                        style={{
                            background: "#fff", color: "#0A0A0A",
                            border: "2.5px solid #0A0A0A",
                            boxShadow: "3px 3px 0 #0A0A0A",
                            borderRadius: 999,
                            fontSize: 12.5, letterSpacing: "0.04em",
                        }}
                    >
                        <MessageCircleHeart size={14} strokeWidth={2.2} />
                        <span className="whitespace-nowrap">Mensagem</span>
                    </button>

                    {/* Levantar muro · FANZINE vermelho */}
                    <button
                        onClick={doBlock}
                        disabled={busy === "block"}
                        data-testid="action-block"
                        title={`Levantar muro com ${firstName}`}
                        className="h-11 px-4 inline-flex items-center justify-center gap-1.5 font-black uppercase tap-shrink disabled:opacity-50"
                        style={{
                            background: "#FFF4DC", color: "#C8261E",
                            border: "2.5px solid #C8261E",
                            boxShadow: "3px 3px 0 #0A0A0A",
                            borderRadius: 999,
                            fontSize: 12, letterSpacing: "0.04em",
                        }}
                    >
                        {busy === "block" ? (
                            <Loader2 size={13} className="animate-spin" />
                        ) : (
                            <ShieldAlert size={13} strokeWidth={2.4} />
                        )}
                        <span className="hidden sm:inline whitespace-nowrap">Levantar muro</span>
                        <span className="sm:hidden whitespace-nowrap">Muro</span>
                    </button>
                </div>

                {/* Hint — quando ela já te segue mas ainda não retribuíste */}
                {!isFollowing && followsMe && (
                    <p className="mt-2.5 font-mono font-black uppercase" style={{ fontSize: 10.5, letterSpacing: "0.14em", color: "#C8261E" }}>
                        // {firstName} SEGUE-TE — SEGUE DE VOLTA?
                    </p>
                )}
            </div>
        </div>
    );
}
