import { useEffect, useState } from "react";
import { UserPlus, Check } from "lucide-react";
import { api } from "../lib/api";
import { Avatar } from "./Avatar";
import { VerifiedBadge } from "./VerifiedBadge";
import { useAuth } from "../context/AuthContext";
import { PT } from "../theme/editorial";

// =============================================================================
// LUSORAE — Onboarding Hard Gate
// Step 1 → Escolhe 5 interesses
// Step 2 → Segue ≥ 5 sugestões para activar o feed
// Sem botão "saltar". Sem X. O utilizador só sai quando completa.
// =============================================================================

const INTEREST_OPTIONS = [
    { key: "futebol",         label: "Futebol",          emoji: "⚽" },
    { key: "tecnologia",      label: "Tecnologia",       emoji: "💻" },
    { key: "livros",          label: "Livros",           emoji: "📚" },
    { key: "cinema",          label: "Cinema",           emoji: "🎬" },
    { key: "series",          label: "Séries",           emoji: "📺" },
    { key: "fotografia",      label: "Fotografia",       emoji: "📷" },
    { key: "gaming",          label: "Gaming",           emoji: "🎮" },
    { key: "surf",            label: "Surf",             emoji: "🌊" },
    { key: "corrida",         label: "Corrida",          emoji: "🏃" },
    { key: "caminhadas",      label: "Caminhadas",       emoji: "🥾" },
    { key: "culinaria",       label: "Culinária",        emoji: "🍳" },
    { key: "musica",          label: "Música",           emoji: "🎵" },
    { key: "universidade",    label: "Universidade",     emoji: "🎓" },
    { key: "empreendedorismo",label: "Empreendedorismo", emoji: "🚀" },
    { key: "jardinagem",      label: "Jardinagem",       emoji: "🌱" },
    { key: "pesca",           label: "Pesca",            emoji: "🎣" },
    { key: "motas",           label: "Motas",            emoji: "🏍️" },
    { key: "familia",         label: "Família",          emoji: "👨‍👩‍👧" },
    { key: "cafe",            label: "Café & tasca",     emoji: "☕" },
    { key: "praia",           label: "Praia",            emoji: "🏖️" },
    { key: "cultura",         label: "Cultura PT",       emoji: "🇵🇹" },
    { key: "noticias",        label: "Notícias",         emoji: "📰" },
];

const MIN_INTERESTS = 3;
const SUGGESTED_FOLLOWS = 5; // sugestão (não obrigatório)

export function OnboardingModal() {
    const { user, setUser } = useAuth();
    const visible = user && user.onboarded === false;

    const [step, setStep] = useState(1);
    const [interests, setInterests] = useState(new Set());
    const [suggestions, setSuggestions] = useState([]);
    const [loadingSugg, setLoadingSugg] = useState(false);
    const [followingMap, setFollowingMap] = useState({});
    const [followCount, setFollowCount] = useState(0);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!visible) return;
        // reset state quando o modal abre
        setStep(1);
        setInterests(new Set());
        setSuggestions([]);
        setFollowingMap({});
        setFollowCount(0);
    }, [visible]);

    if (!visible) return null;

    const toggleInterest = (k) => {
        setInterests((s) => {
            const ns = new Set(s);
            if (ns.has(k)) ns.delete(k);
            else if (ns.size < 12) ns.add(k);
            return ns;
        });
    };

    const goToStep2 = async () => {
        if (interests.size < MIN_INTERESTS) return;
        setBusy(true);
        try {
            // FASE 3 — endpoint dedicado de interesses
            await api.post("/users/me/interests", { interests: Array.from(interests) }).catch(async () => {
                // fallback legacy
                await api.patch("/users/me", { bio_slots: { ...(user.bio_slots || {}), interests: Array.from(interests).join(", ") } }).catch(() => {});
            });
        } catch {}
        setLoadingSugg(true);
        try {
            const r = await api.get("/users/suggestions?limit=20");
            setSuggestions(Array.isArray(r.data) ? r.data : []);
        } catch {
            setSuggestions([]);
        } finally {
            setLoadingSugg(false);
            setBusy(false);
            setStep(2);
        }
    };

    const handleFollow = async (u) => {
        if (followingMap[u.id]) return;
        setFollowingMap((m) => ({ ...m, [u.id]: true }));
        setFollowCount((c) => c + 1);
        try {
            await api.post(`/users/${u.username || u.id}/follow`);
        } catch {
            // tenta endpoint alternativo
            try { await api.post(`/users/${u.id}/follow`); }
            catch {
                setFollowingMap((m) => ({ ...m, [u.id]: false }));
                setFollowCount((c) => Math.max(0, c - 1));
            }
        }
    };

    const finish = async () => {
        // Seguir é OPCIONAL — utilizador pode terminar sem seguir ninguém.
        setBusy(true);
        try { await api.post("/users/me/onboard"); } catch { /* noop */ }
        setUser({ ...user, onboarded: true });
    };

    const canStep1 = interests.size >= MIN_INTERESTS;

    return (
        <div className="fixed inset-0 z-[90] bg-black/40 backdrop-blur-md grid place-items-end sm:place-items-center p-0 sm:p-4" data-testid="onboarding-modal">
            <div
                className="w-full sm:max-w-xl bg-white border border-black/[0.08] rounded-t-3xl sm:rounded-3xl overflow-hidden anim-sheet-up sm:anim-fade-up"
                style={{ boxShadow: "0 40px 100px -20px rgba(13,13,16,0.5)" }}
            >
                {/* Header */}
                <div className="relative px-7 pt-7 pb-5 border-b border-black/[0.05]">
                    <div className="flex items-center gap-2 mb-3" data-testid="onboarding-progress">
                        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-black/45">
                            Passo {step} de 2
                        </span>
                        <div className="flex-1 relative h-1 rounded-full bg-black/[0.06] overflow-hidden">
                            <div
                                className="absolute inset-y-0 left-0 rounded-full transition-all duration-300"
                                style={{
                                    width: step === 1 ? "50%" : "100%",
                                    background: PT.ink,
                                }}
                            />
                        </div>
                    </div>
                    <h2 className="font-black tracking-tight leading-[1.05]" style={{ fontSize: 24, color: PT.ink }}>
                        {step === 1
                            ? <>Olá, {user.name?.split(" ")[0]}. <span style={{ color: PT.red }}>O que te interessa?</span></>
                            : <>Sugestões para <span style={{ color: PT.red }}>arrancar</span>.</>}
                    </h2>
                    <p className="text-[12.5px] mt-2 font-medium" style={{ color: "rgba(10,10,10,0.6)" }}>
                        {step === 1
                            ? `Escolhe pelo menos ${MIN_INTERESTS}.`
                            : "Segue quem quiseres. Podes saltar este passo."}
                    </p>
                </div>

                {/* Body */}
                <div className="px-6 py-5 max-h-[58vh] overflow-y-auto">
                    {step === 1 && (
                        <div className="flex flex-wrap gap-2" data-testid="onboarding-interests">
                            {INTEREST_OPTIONS.map((it) => {
                                const on = interests.has(it.key);
                                return (
                                    <button
                                        key={it.key}
                                        data-testid={`onb-interest-${it.key}`}
                                        onClick={() => toggleInterest(it.key)}
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-medium transition tap-shrink"
                                        style={{
                                            background: on ? PT.ink : "#fff",
                                            color: on ? "#fff" : PT.ink,
                                            border: on ? "1px solid " + PT.ink : "1px solid rgba(10,10,10,0.12)",
                                            boxShadow: on ? "0 6px 16px -10px rgba(10,10,10,0.4)" : "0 1px 2px rgba(10,10,10,0.03)",
                                        }}
                                    >
                                        <span aria-hidden>{it.emoji}</span>
                                        {it.label}
                                        {on && <Check size={11} strokeWidth={2.6} />}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {step === 2 && (
                        <div data-testid="onboarding-suggestions">
                            {loadingSugg ? (
                                <div className="space-y-2">
                                    {Array.from({ length: 6 }).map((_, i) => (
                                        <div key={i} className="h-14 bg-black/[0.04] rounded-2xl animate-pulse" />
                                    ))}
                                </div>
                            ) : suggestions.length === 0 ? (
                                <div className="py-8 text-center">
                                    <p className="font-black text-[15px]" style={{ color: PT.ink }}>
                                        Ainda não há sugestões.
                                    </p>
                                    <p className="text-[12px] mt-1.5 text-black/55 max-w-xs mx-auto">
                                        Esta rede está a nascer. Vais encontrá-las à medida que crescer.
                                    </p>
                                </div>
                            ) : (
                                <>
                                    {/* Carrossel horizontal (mobile) */}
                                    <div
                                        className="sm:hidden flex gap-2 overflow-x-auto pb-1 -mx-6 px-6 scrollbar-hide"
                                        style={{ scrollSnapType: "x mandatory" }}
                                        data-testid="onb-suggestions-carousel"
                                    >
                                        {suggestions.map((s) => {
                                            const isFollowing = !!followingMap[s.id];
                                            return (
                                                <div
                                                    key={s.id}
                                                    data-testid={`onb-suggestion-${s.username}`}
                                                    className="shrink-0 w-[150px] p-3 rounded-2xl border flex flex-col items-start gap-2"
                                                    style={{
                                                        borderColor: isFollowing ? "rgba(10,10,10,0.18)" : "rgba(10,10,10,0.06)",
                                                        background: isFollowing ? "rgba(10,10,10,0.02)" : "#fff",
                                                        scrollSnapAlign: "start",
                                                    }}
                                                >
                                                    <Avatar user={s} size={38} />
                                                    <div className="min-w-0 w-full">
                                                        <div className="flex items-center gap-1 font-bold text-[12.5px] tracking-tight text-black truncate leading-tight">
                                                            {s.name} {s.verified && <VerifiedBadge size={10} />}
                                                        </div>
                                                        <div className="font-mono text-[10.5px] text-black/50 truncate mt-0.5">
                                                            @{s.username}
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleFollow(s)}
                                                        data-testid={`onb-follow-${s.username}`}
                                                        disabled={isFollowing}
                                                        className="w-full inline-flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-full text-[10.5px] font-bold uppercase tracking-wider transition tap-shrink mt-auto"
                                                        style={{
                                                            background: isFollowing ? "rgba(10,10,10,0.05)" : PT.ink,
                                                            color: isFollowing ? "rgba(10,10,10,0.7)" : "#fff",
                                                            border: isFollowing ? "1px solid rgba(10,10,10,0.1)" : "1px solid " + PT.ink,
                                                        }}
                                                    >
                                                        {isFollowing ? <><Check size={10} strokeWidth={2.4}/> a seguir</> : <><UserPlus size={10} strokeWidth={2.4}/> seguir</>}
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Lista vertical (desktop) */}
                                    <ul className="hidden sm:block space-y-2">
                                        {suggestions.map((s) => {
                                            const isFollowing = !!followingMap[s.id];
                                            return (
                                                <li
                                                    key={s.id}
                                                    className="flex items-center gap-3 p-2.5 rounded-2xl border transition"
                                                    style={{
                                                        borderColor: isFollowing ? "rgba(10,10,10,0.18)" : "rgba(10,10,10,0.06)",
                                                        background: isFollowing ? "rgba(10,10,10,0.02)" : "#fff",
                                                    }}
                                                >
                                                    <Avatar user={s} size={42} />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-1 font-bold text-[14px] tracking-tight text-black truncate">
                                                            {s.name} {s.verified && <VerifiedBadge size={12} />}
                                                        </div>
                                                        <div className="font-mono text-[11px] text-black/50 truncate">
                                                            @{s.username}{s.city ? <span className="text-black/40"> · {s.city}</span> : null}
                                                        </div>
                                                    </div>
                                                    <button
                                                        onClick={() => handleFollow(s)}
                                                        disabled={isFollowing}
                                                        className="shrink-0 inline-flex items-center gap-1 px-3.5 py-1.5 rounded-full text-[11.5px] font-bold uppercase tracking-wider transition tap-shrink"
                                                        style={{
                                                            background: isFollowing ? "rgba(10,10,10,0.05)" : PT.ink,
                                                            color: isFollowing ? "rgba(10,10,10,0.7)" : "#fff",
                                                            border: isFollowing ? "1px solid rgba(10,10,10,0.1)" : "1px solid " + PT.ink,
                                                        }}
                                                    >
                                                        {isFollowing ? <><Check size={11} strokeWidth={2.4}/> a seguir</> : <><UserPlus size={11} strokeWidth={2.4}/> seguir</>}
                                                    </button>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-black/[0.05] flex items-center justify-between gap-4">
                    {step === 1 ? (
                        <>
                            <span className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: canStep1 ? PT.ink : "rgba(10,10,10,0.5)" }} data-testid="step1-counter">
                                {interests.size} / {MIN_INTERESTS}
                            </span>
                            <button
                                onClick={goToStep2}
                                disabled={!canStep1 || busy}
                                data-testid="onb-step1-next"
                                className="px-5 py-2.5 rounded-full text-[12.5px] font-bold uppercase tracking-wider transition tap-shrink"
                                style={{
                                    background: canStep1 ? PT.ink : "rgba(10,10,10,0.08)",
                                    color: canStep1 ? "#fff" : "rgba(10,10,10,0.35)",
                                    cursor: canStep1 ? "pointer" : "not-allowed",
                                }}
                            >
                                Continuar
                            </button>
                        </>
                    ) : (
                        <>
                            <span className="font-mono text-[10px] uppercase tracking-[0.18em]" style={{ color: "rgba(10,10,10,0.55)" }} data-testid="step2-counter">
                                {followCount > 0 ? `${followCount} a seguir` : `Sugerimos ${SUGGESTED_FOLLOWS}`}
                            </span>
                            <button
                                onClick={finish}
                                disabled={busy}
                                data-testid="finish-onboarding"
                                className="px-5 py-2.5 rounded-full text-[12.5px] font-bold uppercase tracking-wider transition tap-shrink"
                                style={{
                                    background: PT.ink,
                                    color: "#fff",
                                    cursor: busy ? "wait" : "pointer",
                                    opacity: busy ? 0.6 : 1,
                                }}
                            >
                                {followCount > 0 ? "Entrar" : "Saltar e entrar"}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
