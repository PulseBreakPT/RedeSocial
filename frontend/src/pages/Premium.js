import { useMemo, useState } from "react";
// =============================================================================
// DESIGN SYSTEM: LUSORAE EDITORIAL — Premium SSS premium-premium
// Mesma linguagem editorial (ink strip · H1 massive · kicker mono), com
// paleta diferenciada: GOLD (Aura) + AZUL (Plus) — premium aesthetics.
// Uma única tabela consolida todas as diferenças (Grátis · Plus · Aura).
// =============================================================================
import {
    Check, ArrowRight, Sparkles, Heart, Shield, Zap, Star, Crown, Info,
    Palette, Music, Eye, BookOpen, MessageCircle, TrendingUp, Lock,
    Image as ImageIcon, Bookmark, Layers, SunMoon, ChevronDown, Minus,
    Radio, Compass, Clock, Award, Activity, Flame, Feather, MapPin,
} from "lucide-react";
import { PT } from "../theme/editorial";
import { usePremium } from "../context/PremiumContext";
import { toast } from "sonner";

/* ════════════════════════════════════════════════════════════════════
   FEATURES por tier — cartões de preço (curadoria editorial)
   ════════════════════════════════════════════════════════════════════ */
const PLUS_FEATURES = [
    { icon: Sparkles,  text: "Perfil premium: estilo, banner subtil e assinatura pessoal", hl: true },
    { icon: Music,     text: "Presença ao vivo com música e estados (até 140 caracteres)" },
    { icon: ImageIcon, text: "Stories até 15 segundos, com arquivo e analytics" },
    { icon: Zap,       text: "Feed calmo: filtros sociais e de energia" },
    { icon: Bookmark,  text: "Coleções e pastas ilimitadas" },
    { icon: Award,     text: "Distintivo de Early Supporter — discreto, para sempre" },
];

const AURA_FEATURES = [
    { icon: Crown,     text: "Tudo do Plus, mais profundo", hl: true },
    { icon: Layers,    text: "Memória social pessoal e mini-timeline da tua presença", hl: true },
    { icon: SunMoon,   text: "Atmosfera de perfil — muda com a hora, o mood e a estação" },
    { icon: ImageIcon, text: "Stories até 30 segundos e moods exclusivos" },
    { icon: Radio,     text: "Presença rica: histórico e estados até 240 caracteres" },
    { icon: Activity,  text: "Insights pessoais do teu ritmo social (só para ti)" },
];

/* ════════════════════════════════════════════════════════════════════
   TABELA ÚNICA · todas as diferenças, agrupadas por categoria.
   Single source of truth: cada linha é uma feature efetiva do backend.
   ════════════════════════════════════════════════════════════════════ */
const TABLE = [
    { group: "Identidade & Perfil", subtitle: "O teu perfil, com mais voz" },
    { label: "Estilo de perfil premium",            icon: Palette,    free: "Padrão",      plus: "Premium",     aura: "Premium" },
    { label: "Banner subtil",                       icon: Sparkles,   free: "—",           plus: "Sim",         aura: "Sim" },
    { label: "Assinatura pessoal",                  icon: BookOpen,   free: "—",           plus: "Curta",       aura: "Expandida" },
    { label: "Atmosfera de perfil",                 icon: SunMoon,    free: "—",           plus: "—",           aura: "Hora · Mood · Estação", auraOnly: true },
    { label: "Layouts exclusivos",                  icon: Layers,     free: "—",           plus: "—",           aura: "Sim", auraOnly: true },
    { label: "Identidade contextual",               icon: Star,       free: "—",           plus: "—",           aura: "Perfil vivo", auraOnly: true },

    { group: "Presença ao vivo", subtitle: "Estar presente, ao teu jeito" },
    { label: "Estado de presença",                  icon: Radio,      free: "Básico",      plus: "Avançado",    aura: "Rico" },
    { label: "Limite de caracteres do estado",      icon: Feather,    free: "64",          plus: "140",         aura: "240" },
    { label: "Música no estado",                    icon: Music,      free: "—",           plus: "Sim",         aura: "Sim" },
    { label: "Histórico de presença",               icon: Clock,      free: "—",           plus: "—",           aura: "Linha do tempo", auraOnly: true },

    { group: "Stories", subtitle: "Mais tempo para contar" },
    { label: "Duração máxima",                      icon: ImageIcon,  free: "5 seg",       plus: "15 seg",      aura: "30 seg" },
    { label: "Moods nos stories",                   icon: Heart,      free: "Padrão",      plus: "Premium",     aura: "Exclusivos" },
    { label: "Arquivo de stories",                  icon: Bookmark,   free: "—",           plus: "Ilimitado",   aura: "Ilimitado" },
    { label: "Analytics dos teus stories",          icon: Eye,        free: "—",           plus: "Sim",         aura: "Sim" },

    { group: "Feed & Descoberta", subtitle: "Decides o que vês — e em que ritmo", note: "O algoritmo trata todos por igual. Os filtros só afetam o que tu vês — nunca o que os outros vêem de ti." },
    { label: "Feed calmo",                          icon: Zap,        free: "—",           plus: "Sim",         aura: "Sim" },
    { label: "Filtros sociais e de energia",        icon: Compass,    free: "—",           plus: "Sim",         aura: "Sim" },
    { label: "Reações premium",                     icon: Flame,      free: "Base",        plus: "Ampliadas",   aura: "Ampliadas" },
    { label: "Destaque subtil em Descobrir",        icon: Sparkles,   free: "—",           plus: "Discreto",    aura: "Discreto" },

    { group: "Coleções & Guardados", subtitle: "Organiza o que importa, sem teto" },
    { label: "Coleções",                            icon: Bookmark,   free: "Até 5",       plus: "Ilimitadas",  aura: "Ilimitadas" },
    { label: "Pastas de bookmarks",                 icon: Layers,     free: "Até 3",       plus: "Ilimitadas",  aura: "Ilimitadas" },
    { label: "Widgets sociais no perfil",           icon: Star,       free: "—",           plus: "Sim",         aura: "Expandidos" },

    { group: "Memória social", subtitle: "O Lusorae passa a fazer parte da tua vida", auraOnly: true },
    { label: "Memória social pessoal",              icon: Layers,     free: "—",           plus: "—",           aura: "Sim", auraOnly: true },
    { label: "Mini-timeline da tua presença",       icon: TrendingUp, free: "—",           plus: "—",           aura: "Sim", auraOnly: true },
    { label: "Insights de ritmo social",            icon: Activity,   free: "—",           plus: "—",           aura: "Pessoais", auraOnly: true },
    { label: "Analytics sociais pessoais",          icon: Eye,        free: "—",           plus: "—",           aura: "Só para ti", auraOnly: true },
    { label: "Widgets de memória",                  icon: Star,       free: "—",           plus: "—",           aura: "Sim", auraOnly: true },

    { group: "Base · incluído em todos os planos", subtitle: "O essencial nunca está atrás de paywall" },
    { label: "Mensagens sem limites",               icon: MessageCircle, free: "Sim",      plus: "Sim",         aura: "Sim" },
    { label: "Posts e comentários",                 icon: BookOpen,   free: "Sim",         plus: "Sim",         aura: "Sim" },
    { label: "Privacidade total",                   icon: Lock,       free: "Sim",         plus: "Sim",         aura: "Sim" },
];

const FAQS = [
    { q: "Posso cancelar a qualquer momento?", a: "Sim. Sem compromissos, sem taxas, sem perguntas. Cancelas no portal e manténs o acesso até ao fim do período que já pagaste." },
    { q: "O que acontece aos meus dados se cancelar?", a: "Absolutamente nada. Posts, mensagens, coleções, perfil, stories arquivados — tudo fica exactamente como está. Só perdes acesso às funcionalidades premium (limites voltam ao plano grátis)." },
    { q: "Há garantia de reembolso?", a: "Sim. 14 dias de garantia total. Se não te encontrares com a experiência, devolvemos o teu dinheiro — sem perguntas." },
    { q: "Posso mudar entre Plus e Aura?", a: "Sim, a qualquer momento. O valor é ajustado proporcionalmente no próximo ciclo de faturação — sem custos escondidos." },
    { q: "O premium dá-me mais visibilidade no feed?", a: "Não. O feed, o algoritmo, as tendências e o Descobrir tratam todos os utilizadores de forma exactamente igual. O premium acrescenta-te ferramentas pessoais — nunca manipula a experiência dos outros." },
    { q: "Porque é que não há anúncios?", a: "Porque o nosso modelo de negócio é o premium. Quem paga é quem usa — não anunciantes. Não precisamos de te manter \"preso\" para vender a tua atenção." },
    { q: "O que é o distintivo de Early Supporter?", a: "Uma marca discreta no teu perfil, para sempre, se subscreveres durante o período de lançamento. Não te dá poder nem alcance — apenas reconhece quem apoiou o projecto cedo." },
    { q: "E se o meu pagamento falhar?", a: "Mantemos os direitos premium ativos durante 7 dias enquanto o Stripe tenta recobrar — o suficiente para atualizares o cartão sem perderes acesso. Só depois é que o plano volta ao grátis." },
];

/* ════════════════════════════════════════════════════════════════════
   PRIMITIVES
   ════════════════════════════════════════════════════════════════════ */

function FeatureList({ items, accent }) {
    return (
        <ul className="space-y-2.5 mt-6">
            {items.map((f, i) => {
                const Icon = f.icon;
                return (
                    <li key={i} className="flex items-start gap-2.5 text-[14px] leading-relaxed font-medium" style={{ color: f.hl ? PT.ink : "rgba(10,10,10,0.72)", fontWeight: f.hl ? 700 : 500 }}>
                        <span
                            className="flex-shrink-0 w-6 h-6 grid place-items-center mt-0.5"
                            style={{
                                background: `${accent}18`,
                                color: accent === PT.gold ? PT.ink : accent,
                                borderRadius: 999,
                            }}
                        >
                            <Icon size={11} strokeWidth={2.4} />
                        </span>
                        <span>{f.text}</span>
                    </li>
                );
            })}
        </ul>
    );
}

function TierCard({
    tier, name, subtitle, tagline, price, interval, features, current,
    billingAvailable, onSubscribe, onManage, accent, isRecommended,
}) {
    const isAura = tier === "aura";
    return (
        <div className="relative">
            {isRecommended && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-20">
                    <div
                        className="px-4 py-1.5 font-mono font-black uppercase"
                        style={{
                            background: PT.gold,
                            color: PT.ink,
                            fontSize: 10.5,
                            letterSpacing: "0.22em",
                            borderRadius: 999,
                            boxShadow: "0 1px 2px rgba(10,10,10,0.06), 0 12px 28px -12px rgba(255,204,41,0.55)",
                        }}
                    >
                        ✦ Recomendado
                    </div>
                </div>
            )}

            <div
                className="relative p-7 sm:p-8 flex flex-col h-full transition-transform duration-200 hover:-translate-y-1"
                style={{
                    background: isAura ? "linear-gradient(180deg, #FFFCF4 0%, #FFFFFF 60%)" : "#fff",
                    border: "1px solid rgba(10,10,10,0.08)",
                    boxShadow: isAura
                        ? "0 1px 2px rgba(10,10,10,0.04), 0 30px 60px -25px rgba(255,204,41,0.35), 0 14px 30px -15px rgba(10,10,10,0.12)"
                        : "0 1px 2px rgba(10,10,10,0.04), 0 24px 50px -25px rgba(0,63,135,0.30), 0 12px 28px -16px rgba(10,10,10,0.10)",
                    borderRadius: 24,
                }}
            >
                {/* Accent ribbon */}
                <div
                    aria-hidden
                    className="absolute top-0 left-0 right-0"
                    style={{
                        height: 3,
                        background: accent,
                        borderTopLeftRadius: 24,
                        borderTopRightRadius: 24,
                    }}
                />

                <div className="mb-5 relative">
                    <div className="flex items-center gap-2.5 mb-2">
                        <span
                            className="inline-flex items-center justify-center"
                            style={{
                                width: 40, height: 40,
                                background: accent,
                                color: isAura ? PT.ink : "#fff",
                                borderRadius: 12,
                                boxShadow: `0 1px 2px rgba(10,10,10,0.06), 0 10px 22px -10px ${accent}80`,
                            }}
                        >
                            {isAura ? <Crown size={19} strokeWidth={2.4} /> : <Sparkles size={19} strokeWidth={2.4} />}
                        </span>
                        <h3 className="font-black tracking-[-0.025em] leading-none" style={{ fontSize: 38, color: PT.ink }}>
                            {name}
                        </h3>
                    </div>
                    <p className="font-mono font-bold uppercase mb-2.5" style={{ fontSize: 10.5, letterSpacing: "0.22em", color: "rgba(10,10,10,0.50)" }}>
                        {subtitle}
                    </p>
                    <p className="text-[14px] leading-relaxed max-w-[34ch] font-medium" style={{ color: "rgba(10,10,10,0.62)" }}>{tagline}</p>
                </div>

                <div className="mb-5">
                    <div className="flex items-baseline gap-2 mb-1">
                        <span
                            className="font-black tabular-nums tracking-[-0.04em] leading-none"
                            style={{ fontSize: "clamp(44px, 6.4vw, 60px)", color: PT.ink }}
                        >
                            €{price.toFixed(2)}
                        </span>
                        <span className="text-[13px] font-bold pb-1" style={{ color: "rgba(10,10,10,0.5)" }}>
                            /{interval === "year" ? "ano" : "mês"}
                        </span>
                    </div>
                    {interval === "year" && (
                        <p className="text-[11px] mt-2 font-mono font-bold uppercase inline-flex items-center gap-1.5" style={{ color: PT.green, letterSpacing: "0.14em" }}>
                            <Check size={11} strokeWidth={3} /> €{(price / 12).toFixed(2)}/MÊS · POUPAS 17%
                        </p>
                    )}
                </div>

                <div style={{ borderTop: "1px solid rgba(10,10,10,0.08)" }} />

                <FeatureList items={features} accent={accent} />

                <div className="mt-auto pt-7">
                    {current ? (
                        <button
                            onClick={onManage}
                            className="w-full h-12 text-[12.5px] font-black uppercase inline-flex items-center justify-center gap-2 transition hover:translate-y-[-1px]"
                            style={{
                                background: "#fff",
                                color: PT.ink,
                                border: "1px solid rgba(10,10,10,0.10)",
                                boxShadow: "0 1px 2px rgba(10,10,10,0.04)",
                                borderRadius: 999,
                                letterSpacing: "0.14em",
                            }}
                        >
                            <Check size={13} strokeWidth={3} /> O teu plano · Gerir
                        </button>
                    ) : billingAvailable ? (
                        <button
                            onClick={() => onSubscribe(tier, interval)}
                            data-testid={`premium-subscribe-${tier}`}
                            className="w-full h-12 text-[12.5px] font-black uppercase inline-flex items-center justify-center gap-2 group/btn transition hover:translate-y-[-1px]"
                            style={{
                                background: isAura ? PT.gold : PT.ink,
                                color: isAura ? PT.ink : "#fff",
                                borderRadius: 999,
                                letterSpacing: "0.14em",
                                boxShadow: isAura
                                    ? "0 1px 2px rgba(10,10,10,0.06), 0 12px 28px -10px rgba(255,204,41,0.55)"
                                    : "inset 0 1px 0 rgba(255,255,255,0.10), 0 12px 28px -10px rgba(10,10,10,0.40)",
                            }}
                        >
                            Escolher {name}
                            <ArrowRight size={15} className="group-hover/btn:translate-x-0.5 transition-transform duration-150" strokeWidth={2.5} />
                        </button>
                    ) : (
                        <button
                            disabled
                            className="w-full h-12 text-[12.5px] font-black uppercase cursor-not-allowed"
                            style={{
                                background: "#fff",
                                color: "rgba(10,10,10,0.3)",
                                border: "1px solid rgba(10,10,10,0.08)",
                                borderRadius: 999,
                                letterSpacing: "0.14em",
                            }}
                        >
                            Brevemente
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

/* Cell renderer */
function CCell({ value, hl, tone, accent, auraOnly }) {
    const isNone = value === "—" || value === false || value === null || value === undefined;
    const isYes  = value === true || value === "Sim";

    const hlBg = tone === "aura" ? "rgba(255,204,41,0.08)" : tone === "plus" ? "rgba(0,63,135,0.05)" : "transparent";

    return (
        <td className="text-center py-3 px-2 align-middle" style={{ background: hl ? hlBg : "transparent" }}>
            {isNone ? (
                <span
                    className="inline-flex w-7 h-7 items-center justify-center"
                    style={{
                        background: "transparent",
                        color: "rgba(10,10,10,0.22)",
                    }}
                >
                    <Minus size={14} strokeWidth={2.6} />
                </span>
            ) : isYes ? (
                <span
                    className="inline-flex w-7 h-7 items-center justify-center"
                    style={{
                        background: tone === "aura" ? PT.gold : tone === "plus" ? PT.azul : PT.green,
                        color: tone === "aura" ? PT.ink : "#fff",
                        borderRadius: 999,
                        boxShadow: `0 1px 2px rgba(10,10,10,0.06), 0 8px 18px -10px ${tone === "aura" ? "rgba(255,204,41,0.55)" : tone === "plus" ? "rgba(0,63,135,0.40)" : "rgba(4,106,56,0.40)"}`,
                    }}
                >
                    <Check size={13} strokeWidth={3.2} />
                </span>
            ) : (
                <span
                    className="text-[12.5px] sm:text-[13px] font-black tabular-nums"
                    style={{
                        color: auraOnly && tone === "aura" ? PT.gold === accent ? PT.ink : accent : (accent || PT.ink),
                        letterSpacing: "-0.005em",
                    }}
                >
                    {value}
                </span>
            )}
        </td>
    );
}

/* Linha de grupo */
function GroupRow({ label, subtitle, auraOnly }) {
    return (
        <tr style={{ background: PT.ink }}>
            <td colSpan={4} className="py-3 px-5 sm:px-6">
                <div className="flex items-baseline gap-3 flex-wrap">
                    <span
                        className="font-mono font-black uppercase"
                        style={{
                            fontSize: 10.5,
                            letterSpacing: "0.22em",
                            color: auraOnly ? PT.gold : "rgba(255,204,41,0.85)",
                        }}
                    >
                        {label}
                    </span>
                    {subtitle && (
                        <span
                            className="font-medium"
                            style={{
                                fontSize: 12.5,
                                color: "rgba(255,244,220,0.55)",
                                letterSpacing: "-0.005em",
                            }}
                        >
                            — {subtitle}
                        </span>
                    )}
                </div>
            </td>
        </tr>
    );
}

/* ════════════════════════════════════════════════════════════════════
   PAGE
   ════════════════════════════════════════════════════════════════════ */
export default function Premium() {
    const { plan, tiers, billing_available, isPlus, isAura, checkout, openPortal } = usePremium();
    const [interval, setInterval] = useState("month");

    const prices = useMemo(() => ({
        plus: tiers?.plus?.[interval] ?? (interval === "year" ? 49.99 : 4.99),
        aura: tiers?.aura?.[interval] ?? (interval === "year" ? 99.99 : 9.99),
    }), [tiers, interval]);

    const subscribe = async (t, i) => {
        try { await checkout(t, i); }
        catch (e) { toast.error(e?.response?.data?.detail || "Não foi possível iniciar o checkout."); }
    };
    const manage = async () => {
        try { await openPortal(); }
        catch { toast.error("Não foi possível abrir a gestão de subscrição."); }
    };

    return (
        <div data-testid="premium-page" className="relative" style={{ background: PT.cream, minHeight: "100vh" }}>
            {/* ─────────────────────────────────────────────────────────────
                DESKTOP MASTHEAD — Lusorae Editorial · premium (gold accent)
                ───────────────────────────────────────────────────────────── */}
            <div
                className="hidden lg:block sticky top-0 z-30 backdrop-blur relative"
                style={{
                    background: "rgba(247,245,239,0.92)",
                    borderBottom: "1px solid rgba(10,10,10,0.10)",
                }}
                data-testid="premium-header"
            >
                <div className="flex items-center justify-between px-7 py-2" style={{ background: PT.ink, color: "#FBFAF6" }}>
                    <span className="inline-flex items-center gap-2 font-mono text-[10px] font-bold uppercase" style={{ letterSpacing: "0.22em", color: PT.gold }}>
                        <span className="relative flex h-1.5 w-1.5" aria-hidden>
                            <span className="absolute inline-flex h-full w-full rounded-full lusorae-pulse" style={{ background: PT.gold }} />
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: PT.gold }} />
                        </span>
                        LUSORAE · PREMIUM · PLUS &amp; AURA
                    </span>
                    <span className="inline-flex items-center gap-3 font-mono text-[10px] font-bold uppercase" style={{ letterSpacing: "0.18em", color: "rgba(255,244,220,0.55)" }}>
                        <span>SEM ANÚNCIOS</span>
                        <span style={{ color: "rgba(255,244,220,0.28)" }}>·</span>
                        <span>SEM ALGORITMO MANIPULADO</span>
                        <span style={{ color: "rgba(255,244,220,0.28)" }}>·</span>
                        <span style={{ color: PT.gold }}>14 DIAS DE GARANTIA</span>
                    </span>
                </div>
                <div className="px-7 pt-7 pb-5 relative z-10">
                    <div className="flex items-center gap-2.5 mb-3.5">
                        <span className="font-mono text-[10px] font-bold uppercase" style={{ letterSpacing: "0.22em", color: "rgba(10,10,10,0.45)" }}>
                            Premium · Edição limitada
                        </span>
                        <span style={{ color: "rgba(10,10,10,0.18)" }}>—</span>
                        <span className="font-mono text-[10.5px] font-bold uppercase inline-flex items-center gap-1.5" style={{ letterSpacing: "0.16em", color: PT.azul }}>
                            <Crown size={11} strokeWidth={2.6} />
                            o que aprofunda a tua presença
                        </span>
                    </div>
                    <h1
                        className="font-black tracking-[-0.045em] leading-[0.94]"
                        style={{ fontSize: "clamp(48px, 5.4vw, 64px)", color: PT.ink }}
                    >
                        Plus{" "}
                        <span style={{ color: "rgba(10,10,10,0.28)" }}>&amp;</span>{" "}
                        <span className="relative inline-block">
                            <span
                                aria-hidden
                                className="absolute pointer-events-none"
                                style={{
                                    left: -4, right: -4, bottom: "0.06em", height: "0.46em",
                                    background: `${PT.gold}88`, zIndex: 0, borderRadius: 3,
                                }}
                            />
                            <span className="relative z-10">Aura</span>
                        </span>
                        <span style={{ color: PT.gold }}>.</span>
                    </h1>
                    <p className="text-[15px] mt-3.5 font-medium max-w-[48ch]" style={{ color: "rgba(10,10,10,0.62)", lineHeight: 1.45 }}>
                        Sem anúncios. Sem algoritmos manipulados. Apenas ferramentas que
                        {" "}<strong style={{ color: PT.ink, fontWeight: 700 }}>aprofundam a tua presença</strong>{" "}
                        — ao teu ritmo, sem competir com ninguém.
                    </p>
                </div>
            </div>

            {/* ─────────────────────────────────────────────────────────────
                MOBILE MASTHEAD
                ───────────────────────────────────────────────────────────── */}
            <div
                className="lg:hidden sticky z-30 backdrop-blur"
                style={{
                    top: "calc(var(--mobile-topbar-h) + var(--safe-top))",
                    background: "rgba(247,245,239,0.94)",
                    borderBottom: "1px solid rgba(10,10,10,0.10)",
                }}
            >
                <div className="px-4 pt-3 pb-3.5">
                    <h1 className="font-black tracking-[-0.03em] leading-[1.0]" style={{ fontSize: 30, color: PT.ink }}>
                        Plus <span style={{ color: "rgba(10,10,10,0.28)" }}>&amp;</span>{" "}
                        <span className="relative inline-block">
                            <span
                                aria-hidden
                                className="absolute pointer-events-none"
                                style={{ left: -3, right: -3, bottom: "0.06em", height: "0.42em", background: `${PT.gold}88`, zIndex: 0, borderRadius: 2 }}
                            />
                            <span className="relative z-10">Aura</span>
                        </span>
                        <span style={{ color: PT.gold }}>.</span>
                    </h1>
                </div>
            </div>

            {/* ─────────────────────────────────────────────────────────────
                NÍVEL 1 — PLANOS · pricing
                ───────────────────────────────────────────────────────────── */}
            <section className="px-4 sm:px-6 lg:px-8 pt-10 sm:pt-14 pb-16 sm:pb-20 max-w-6xl mx-auto">
                {/* Billing toggle */}
                <div className="flex justify-center mb-10 sm:mb-12">
                    <div className="inline-flex items-center gap-0 p-1"
                        style={{
                            background: "#fff",
                            border: "1px solid rgba(10,10,10,0.08)",
                            boxShadow: "0 1px 2px rgba(10,10,10,0.04), 0 8px 20px -10px rgba(10,10,10,0.12)",
                            borderRadius: 999,
                        }}
                    >
                        {["month", "year"].map((i) => {
                            const active = interval === i;
                            return (
                                <button key={i} onClick={() => setInterval(i)}
                                    data-testid={`premium-interval-${i}`}
                                    className="px-5 sm:px-7 h-9 text-[12.5px] font-black uppercase transition-all duration-200"
                                    style={{
                                        background: active ? `linear-gradient(180deg, #1f1f1f 0%, ${PT.ink} 100%)` : "transparent",
                                        color: active ? "#fff" : PT.ink,
                                        borderRadius: 999,
                                        letterSpacing: "0.14em",
                                        boxShadow: active ? "inset 0 1px 0 rgba(255,255,255,0.12), 0 6px 16px -8px rgba(10,10,10,0.30)" : "none",
                                    }}
                                >
                                    {i === "month" ? "Mensal" : "Anual"}
                                    {i === "year" && (
                                        <span className="ml-2 font-mono text-[9.5px] font-bold uppercase" style={{ color: active ? PT.gold : PT.green, letterSpacing: "0.16em" }}>
                                            -17%
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-7 lg:gap-8 max-w-[1080px] mx-auto items-start">
                    <TierCard
                        tier="plus" name="Plus" subtitle="Presença elevada"
                        tagline="Para quem quer personalizar a experiência. Mais expressão, mais controlo, mais conforto no dia-a-dia."
                        price={prices.plus} interval={interval} features={PLUS_FEATURES}
                        current={isPlus} billingAvailable={billing_available}
                        onSubscribe={subscribe} onManage={manage}
                        accent={PT.azul}
                    />
                    <TierCard
                        tier="aura" name="Aura" subtitle="A experiência definitiva"
                        tagline="Tudo do Plus, mais uma camada de profundidade. O teu perfil ganha vida — adapta-se a ti, à hora e ao momento."
                        price={prices.aura} interval={interval} features={AURA_FEATURES}
                        current={isAura} billingAvailable={billing_available}
                        onSubscribe={subscribe} onManage={manage}
                        accent={PT.gold}
                        isRecommended
                    />
                </div>

                {plan !== "free" && (
                    <p className="text-[12px] text-center mt-8 font-mono font-bold uppercase" style={{ color: "rgba(10,10,10,0.42)", letterSpacing: "0.14em" }}>
                        Subscrição ativa · gere pagamentos, faturas e cancelamento no portal seguro
                    </p>
                )}

                {/* Trust strip */}
                <div className="mt-12 sm:mt-16 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 max-w-3xl mx-auto">
                    {[
                        { icon: Shield,   t: "14 dias",      s: "garantia total",  c: PT.green },
                        { icon: Lock,     t: "Pagamento",    s: "via Stripe",      c: PT.azul },
                        { icon: MapPin,   t: "Portugal",     s: "feito por nós",   c: PT.ink },
                        { icon: Heart,    t: "Sem anúncios", s: "nunca",           c: PT.gold },
                    ].map((tr, i) => {
                        const Ic = tr.icon;
                        return (
                            <div
                                key={i}
                                className="p-3.5 flex items-center gap-2.5 transition hover:translate-y-[-1px]"
                                style={{
                                    background: "#fff",
                                    border: "1px solid rgba(10,10,10,0.08)",
                                    boxShadow: `0 1px 2px rgba(10,10,10,0.04), 0 14px 28px -16px ${tr.c}55`,
                                    borderRadius: 14,
                                }}
                            >
                                <div
                                    className="w-9 h-9 grid place-items-center flex-shrink-0"
                                    style={{
                                        background: tr.c,
                                        color: tr.c === PT.gold ? PT.ink : "#fff",
                                        borderRadius: 10,
                                    }}
                                >
                                    <Ic size={15} strokeWidth={2.4} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[12.5px] font-black leading-tight tracking-tight" style={{ color: PT.ink }}>{tr.t}</p>
                                    <p className="text-[10.5px] font-mono font-bold uppercase leading-tight mt-0.5" style={{ color: "rgba(10,10,10,0.5)", letterSpacing: "0.08em" }}>{tr.s}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* ─────────────────────────────────────────────────────────────
                NÍVEL 2 — A TABELA · UMA SÓ, TUDO LADO A LADO
                ───────────────────────────────────────────────────────────── */}
            <section style={{ background: "#fff", borderTop: "1px solid rgba(10,10,10,0.10)", borderBottom: "1px solid rgba(10,10,10,0.10)" }}>
                <div className="px-4 sm:px-6 lg:px-8 py-16 sm:py-24 max-w-5xl mx-auto">
                    <div className="mb-10 sm:mb-12 max-w-2xl">
                        <p className="font-mono font-black uppercase mb-3 inline-flex items-center gap-1.5" style={{ fontSize: 10.5, letterSpacing: "0.22em", color: PT.azul }}>
                            <span className="relative flex h-1.5 w-1.5" aria-hidden>
                                <span className="absolute inline-flex h-full w-full rounded-full lusorae-pulse" style={{ background: PT.azul }} />
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: PT.azul }} />
                            </span>
                            A tabela
                        </p>
                        <h2
                            className="font-black tracking-[-0.035em] leading-[0.98] mb-4"
                            style={{ fontSize: "clamp(32px, 5vw, 50px)", color: PT.ink }}
                        >
                            Tudo o que muda{" "}
                            <span className="relative inline-block">
                                <span
                                    aria-hidden
                                    className="absolute pointer-events-none"
                                    style={{ left: -3, right: -3, bottom: "0.06em", height: "0.42em", background: `${PT.gold}88`, zIndex: 0, borderRadius: 3 }}
                                />
                                <span className="relative z-10">lado a lado</span>
                            </span>
                            <span style={{ color: PT.gold }}>.</span>
                        </h2>
                        <p className="text-[14.5px] sm:text-[16px] leading-relaxed max-w-xl font-medium" style={{ color: "rgba(10,10,10,0.6)" }}>
                            Uma única tabela. Sete categorias. Limites reais.
                            {" — "}
                            <strong style={{ color: PT.ink, fontWeight: 700 }}>sem letras pequenas</strong>.
                            Cada linha aqui é uma feature efetivamente implementada.
                        </p>
                    </div>

                    <div className="overflow-x-auto -mx-4 sm:mx-0">
                        <div className="min-w-[680px] sm:min-w-0 px-4 sm:px-0">
                            <div
                                className="overflow-hidden"
                                style={{
                                    background: "#fff",
                                    border: "1px solid rgba(10,10,10,0.08)",
                                    boxShadow: "0 1px 2px rgba(10,10,10,0.04), 0 24px 50px -25px rgba(10,10,10,0.18), 0 10px 24px -14px rgba(10,10,10,0.10)",
                                    borderRadius: 24,
                                }}
                                data-testid="premium-comparison-table"
                            >
                                <table className="w-full text-[13px] sm:text-[14px]">
                                    <thead className="sticky top-0 z-10">
                                        <tr style={{ background: PT.ink, borderBottom: "1px solid rgba(10,10,10,0.10)" }}>
                                            <th
                                                className="text-left py-4 px-5 sm:px-6 font-mono font-black uppercase w-[42%]"
                                                style={{ fontSize: 10.5, letterSpacing: "0.18em", color: PT.gold }}
                                            >
                                                Funcionalidade
                                            </th>
                                            <th
                                                className="text-center py-4 px-2 font-mono font-black uppercase w-[18%]"
                                                style={{ fontSize: 10.5, letterSpacing: "0.18em", color: "rgba(255,244,220,0.55)" }}
                                            >
                                                Grátis
                                            </th>
                                            <th className="text-center py-3 px-2 w-[20%]">
                                                <span
                                                    className="inline-flex items-center gap-1.5 font-mono font-black uppercase"
                                                    style={{
                                                        background: PT.azul,
                                                        color: "#fff",
                                                        padding: "5px 12px",
                                                        borderRadius: 999,
                                                        fontSize: 10.5,
                                                        letterSpacing: "0.22em",
                                                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.10), 0 8px 18px -10px rgba(0,63,135,0.55)",
                                                    }}
                                                >
                                                    <Sparkles size={11} strokeWidth={2.6} />
                                                    Plus
                                                </span>
                                            </th>
                                            <th className="text-center py-3 px-2 w-[20%]">
                                                <span
                                                    className="inline-flex items-center gap-1.5 font-mono font-black uppercase"
                                                    style={{
                                                        background: PT.gold,
                                                        color: PT.ink,
                                                        padding: "5px 12px",
                                                        borderRadius: 999,
                                                        fontSize: 10.5,
                                                        letterSpacing: "0.22em",
                                                        boxShadow: "0 1px 2px rgba(10,10,10,0.10), 0 10px 22px -10px rgba(255,204,41,0.65)",
                                                    }}
                                                >
                                                    <Crown size={11} strokeWidth={2.6} />
                                                    Aura
                                                </span>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {TABLE.map((r, i) => {
                                            if (r.group) return <GroupRow key={`g-${i}`} label={r.group} subtitle={r.subtitle} auraOnly={r.auraOnly} />;
                                            const Icon = r.icon;
                                            const isLast = i === TABLE.length - 1 || !!TABLE[i + 1]?.group;
                                            return (
                                                <tr key={i} style={{ borderBottom: isLast ? "none" : "1px solid rgba(10,10,10,0.06)" }} className="hover:bg-[rgba(10,10,10,0.015)] transition">
                                                    <td className="py-3 px-5 sm:px-6">
                                                        <div className="flex items-center gap-2.5">
                                                            <span
                                                                className="w-7 h-7 grid place-items-center flex-shrink-0 hidden sm:grid"
                                                                style={{
                                                                    background: PT.cream,
                                                                    border: "1px solid rgba(10,10,10,0.08)",
                                                                    borderRadius: 8,
                                                                    color: r.auraOnly ? PT.gold : "rgba(10,10,10,0.62)",
                                                                }}
                                                            >
                                                                <Icon size={13} strokeWidth={2.2} />
                                                            </span>
                                                            <span className="font-medium" style={{ color: "rgba(10,10,10,0.78)" }}>{r.label}</span>
                                                            {r.auraOnly && (
                                                                <span
                                                                    className="inline-block font-mono font-black uppercase"
                                                                    style={{
                                                                        background: "rgba(255,204,41,0.18)",
                                                                        color: PT.ink,
                                                                        padding: "2px 7px",
                                                                        borderRadius: 999,
                                                                        fontSize: 9,
                                                                        letterSpacing: "0.18em",
                                                                    }}
                                                                    title="Exclusivo Aura"
                                                                >
                                                                    Aura
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <CCell value={r.free} />
                                                    <CCell value={r.plus} hl tone="plus" accent={PT.azul} />
                                                    <CCell value={r.aura} hl tone="aura" accent={r.auraOnly ? PT.gold : PT.ink} auraOnly={r.auraOnly} />
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>

                    <p className="text-[12px] mt-4 font-mono font-bold uppercase text-center" style={{ color: "rgba(10,10,10,0.42)", letterSpacing: "0.14em" }}>
                        ✦ Marcadas como Aura — exclusivas do plano superior
                    </p>
                </div>
            </section>

            {/* ─────────────────────────────────────────────────────────────
                NÍVEL 3 — PRINCÍPIOS
                ───────────────────────────────────────────────────────────── */}
            <section style={{ background: PT.cream }}>
                <div className="px-4 sm:px-6 lg:px-8 py-16 sm:py-20 max-w-5xl mx-auto">
                    <div className="mb-10 sm:mb-12 max-w-2xl">
                        <p className="font-mono font-bold uppercase mb-3" style={{ fontSize: 10.5, letterSpacing: "0.22em", color: "rgba(10,10,10,0.45)" }}>
                            Princípios
                        </p>
                        <h2
                            className="font-black tracking-[-0.035em] leading-[0.98] mb-3"
                            style={{ fontSize: "clamp(28px, 4.4vw, 44px)", color: PT.ink }}
                        >
                            O que torna este{" "}
                            <span className="relative inline-block">
                                <span aria-hidden className="absolute pointer-events-none" style={{ left: -3, right: -3, bottom: "0.06em", height: "0.42em", background: `${PT.azul}33`, zIndex: 0, borderRadius: 3 }} />
                                <span className="relative z-10">premium diferente</span>
                            </span>
                            <span style={{ color: PT.azul }}>.</span>
                        </h2>
                        <p className="text-[14px] sm:text-[15.5px] max-w-lg leading-relaxed font-medium" style={{ color: "rgba(10,10,10,0.6)" }}>
                            Não vendemos atenção, alcance ou prioridade. O premium existe para te dar mais
                            {" "}<strong style={{ color: PT.ink, fontWeight: 700 }}>conforto</strong>{" "}— nunca mais poder.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
                        {[
                            { icon: Heart,  title: "Pertença real",     desc: "O premium não cria classes. A comunidade é uma só. As ferramentas premium aprofundam a tua experiência sem afetar a dos outros.", c: PT.azul },
                            { icon: Shield, title: "Sem distrações",    desc: "Controlo total sobre o que vês e quando. Feed calmo, filtros sociais e de energia, presença ao teu ritmo. Sem dark patterns.", c: PT.ink },
                            { icon: Star,   title: "Identidade única",  desc: "Ferramentas de expressão que se adaptam a ti — não te forçam a competir. Moods, atmosferas e presença autêntica, sem pressão social.", c: PT.gold },
                        ].map((item, idx) => {
                            const Icon = item.icon;
                            return (
                                <div
                                    key={idx}
                                    className="p-6 h-full transition-transform duration-200 hover:-translate-y-1"
                                    style={{
                                        background: "#fff",
                                        border: "1px solid rgba(10,10,10,0.08)",
                                        boxShadow: `0 1px 2px rgba(10,10,10,0.04), 0 22px 44px -22px ${item.c}55, 0 6px 18px -10px rgba(10,10,10,0.10)`,
                                        borderRadius: 20,
                                    }}
                                >
                                    <div
                                        className="w-12 h-12 grid place-items-center mb-4"
                                        style={{
                                            background: item.c,
                                            color: item.c === PT.gold ? PT.ink : "#fff",
                                            borderRadius: 12,
                                            boxShadow: `0 1px 2px rgba(10,10,10,0.06), 0 10px 22px -10px ${item.c}80`,
                                        }}
                                    >
                                        <Icon size={20} strokeWidth={2.0} />
                                    </div>
                                    <h3 className="font-black text-[17px] sm:text-[18px] mb-2 tracking-[-0.02em] leading-tight" style={{ color: PT.ink }}>
                                        {item.title}
                                    </h3>
                                    <p className="text-[13.5px] leading-relaxed font-medium" style={{ color: "rgba(10,10,10,0.62)" }}>
                                        {item.desc}
                                    </p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* ─────────────────────────────────────────────────────────────
                NÍVEL 4 — TRANSPARÊNCIA · o que o premium NÃO faz
                ───────────────────────────────────────────────────────────── */}
            <section style={{ background: "#fff", borderTop: "1px solid rgba(10,10,10,0.10)" }}>
                <div className="px-4 sm:px-6 lg:px-8 py-16 sm:py-20 max-w-3xl mx-auto">
                    <div
                        className="relative p-6 sm:p-9"
                        style={{
                            background: PT.cream,
                            border: "1px solid rgba(10,10,10,0.08)",
                            boxShadow: "0 1px 2px rgba(10,10,10,0.04), 0 22px 44px -22px rgba(10,10,10,0.18), 0 8px 22px -12px rgba(10,10,10,0.10)",
                            borderRadius: 24,
                        }}
                    >
                        <div className="absolute -top-3 left-7">
                            <span
                                className="inline-block font-mono font-black uppercase"
                                style={{
                                    background: PT.ink,
                                    color: PT.gold,
                                    padding: "5px 14px",
                                    borderRadius: 999,
                                    fontSize: 10,
                                    letterSpacing: "0.22em",
                                    boxShadow: "0 1px 2px rgba(10,10,10,0.06), 0 10px 22px -10px rgba(10,10,10,0.40)",
                                }}
                            >
                                ✦ Transparência radical
                            </span>
                        </div>

                        <h2
                            className="font-black tracking-[-0.03em] leading-[1.0] mt-4 mb-4"
                            style={{ fontSize: "clamp(24px, 3.8vw, 36px)", color: PT.ink }}
                        >
                            O que o premium{" "}
                            <span className="relative inline-block">
                                <span aria-hidden className="absolute pointer-events-none" style={{ left: -3, right: -3, bottom: "0.06em", height: "0.42em", background: `${PT.gold}88`, zIndex: 0, borderRadius: 3 }} />
                                <span className="relative z-10">não faz</span>
                            </span>
                            <span style={{ color: PT.gold }}>.</span>
                        </h2>

                        <p className="text-[14px] sm:text-[15px] leading-relaxed mb-6 max-w-xl font-medium" style={{ color: "rgba(10,10,10,0.6)" }}>
                            Dizemos-te exactamente o que o premium nunca vai fazer — para que saibas exactamente o que estás a pagar.
                        </p>

                        <div className="space-y-2.5 mb-6">
                            {[
                                { bold: "Sem alcance extra", rest: " — não te dá mais visibilidade, prioridade no feed ou destaque nas tendências." },
                                { bold: "Sem algoritmo diferente", rest: " — o teu conteúdo é tratado exactamente como o de qualquer outro utilizador." },
                                { bold: "Sem remoção de anúncios", rest: " — porque o Lusorae não tem anúncios. Ponto." },
                                { bold: "Sem hierarquia social", rest: " — não te torna melhor, mais importante ou mais visível que os outros." },
                                { bold: "Sem badges de prestígio", rest: " — o único distintivo é o de Early Supporter, e é discreto. Sem troféus, leaderboards ou classes." },
                            ].map((tr, i) => (
                                <div
                                    key={i}
                                    className="flex items-start gap-3 p-3.5"
                                    style={{
                                        background: "#fff",
                                        border: "1px solid rgba(10,10,10,0.06)",
                                        borderRadius: 12,
                                    }}
                                >
                                    <div
                                        className="w-6 h-6 grid place-items-center flex-shrink-0 mt-0.5"
                                        style={{
                                            background: PT.green,
                                            color: "#fff",
                                            borderRadius: 999,
                                            boxShadow: "0 1px 2px rgba(10,10,10,0.06), 0 6px 14px -8px rgba(4,106,56,0.55)",
                                        }}
                                    >
                                        <Check size={12} strokeWidth={3.2} />
                                    </div>
                                    <p className="text-[13.5px] sm:text-[14px] leading-relaxed" style={{ color: "rgba(10,10,10,0.78)" }}>
                                        <strong className="font-black" style={{ color: PT.ink }}>{tr.bold}</strong>{tr.rest}
                                    </p>
                                </div>
                            ))}
                        </div>

                        <div style={{ borderTop: "1px solid rgba(10,10,10,0.08)", paddingTop: 16 }}>
                            <p className="text-[13.5px] leading-relaxed font-medium" style={{ color: "rgba(10,10,10,0.62)" }}>
                                O premium é conforto, identidade e ferramentas. Nunca é vantagem social.
                            </p>
                            <p
                                className="mt-3 font-black tracking-[-0.02em]"
                                style={{ fontSize: "clamp(16px, 2.2vw, 19px)", color: PT.ink }}
                            >
                                O tempo que passas aqui é{" "}
                                <span className="relative inline-block">
                                    <span aria-hidden className="absolute pointer-events-none" style={{ left: -2, right: -2, bottom: "0.06em", height: "0.42em", background: `${PT.gold}88`, zIndex: 0, borderRadius: 2 }} />
                                    <span className="relative z-10">teu</span>
                                </span>
                                . Não nosso.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ─────────────────────────────────────────────────────────────
                NÍVEL 5 — FAQ
                ───────────────────────────────────────────────────────────── */}
            <section style={{ background: PT.cream, borderTop: "1px solid rgba(10,10,10,0.10)" }}>
                <div className="px-4 sm:px-6 lg:px-8 py-14 sm:py-20 max-w-2xl mx-auto prem-faq">
                    <div className="mb-8">
                        <p className="font-mono font-black uppercase mb-3" style={{ fontSize: 10.5, letterSpacing: "0.22em", color: PT.azul }}>
                            Dúvidas
                        </p>
                        <h2
                            className="font-black tracking-[-0.03em] leading-[0.98] mb-2"
                            style={{ fontSize: "clamp(26px, 4vw, 40px)", color: PT.ink }}
                        >
                            Perguntas{" "}
                            <span className="relative inline-block">
                                <span aria-hidden className="absolute pointer-events-none" style={{ left: -3, right: -3, bottom: "0.06em", height: "0.42em", background: `${PT.gold}88`, zIndex: 0, borderRadius: 3 }} />
                                <span className="relative z-10">frequentes</span>
                            </span>
                            <span style={{ color: PT.gold }}>.</span>
                        </h2>
                        <p className="text-[13.5px] sm:text-[14.5px] leading-relaxed font-medium" style={{ color: "rgba(10,10,10,0.6)" }}>
                            Respostas directas, sem rodeios.
                        </p>
                    </div>

                    <div className="space-y-3">
                        {FAQS.map((faq, idx) => (
                            <details
                                key={idx}
                                className="group p-4 sm:p-5 cursor-pointer"
                                style={{
                                    background: "#fff",
                                    border: "1px solid rgba(10,10,10,0.08)",
                                    boxShadow: "0 1px 2px rgba(10,10,10,0.04), 0 10px 22px -14px rgba(10,10,10,0.10)",
                                    borderRadius: 14,
                                }}
                            >
                                <summary className="flex items-center justify-between font-black text-[14px] sm:text-[15px] list-none tracking-[-0.01em]" style={{ color: PT.ink }}>
                                    <span className="pr-3">{faq.q}</span>
                                    <span
                                        className="w-7 h-7 grid place-items-center flex-shrink-0"
                                        style={{
                                            background: "rgba(10,10,10,0.04)",
                                            color: PT.ink,
                                            borderRadius: 999,
                                        }}
                                    >
                                        <ChevronDown size={13} className="group-open:rotate-180 transition-transform duration-200" strokeWidth={2.4} />
                                    </span>
                                </summary>
                                <div className="prem-faq-answer">
                                    <div className="mt-3 pt-3" style={{ borderTop: "1px solid rgba(10,10,10,0.08)" }}>
                                        <p className="text-[13.5px] sm:text-[14px] leading-relaxed font-medium" style={{ color: "rgba(10,10,10,0.66)" }}>{faq.a}</p>
                                    </div>
                                </div>
                            </details>
                        ))}
                    </div>
                </div>
            </section>

            {/* ─────────────────────────────────────────────────────────────
                NÍVEL 6 — CTA FINAL (apenas para utilizadores free)
                ───────────────────────────────────────────────────────────── */}
            {plan === "free" && billing_available && (
                <section style={{ background: PT.ink }}>
                    <div className="px-4 sm:px-6 lg:px-8 py-16 sm:py-24 max-w-3xl mx-auto text-center">
                        <p className="font-mono font-black uppercase mb-4 inline-flex items-center gap-1.5" style={{ fontSize: 10.5, letterSpacing: "0.22em", color: PT.gold }}>
                            <span className="relative flex h-1.5 w-1.5" aria-hidden>
                                <span className="absolute inline-flex h-full w-full rounded-full lusorae-pulse" style={{ background: PT.gold }} />
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: PT.gold }} />
                            </span>
                            Próximo passo
                        </p>
                        <h3
                            className="font-black tracking-[-0.035em] leading-[0.98] mb-4"
                            style={{ fontSize: "clamp(28px, 4.8vw, 48px)", color: "#fff" }}
                        >
                            Pronto para uma{" "}
                            <span className="relative inline-block">
                                <span aria-hidden className="absolute pointer-events-none" style={{ left: -3, right: -3, bottom: "0.06em", height: "0.42em", background: `${PT.gold}88`, zIndex: 0, borderRadius: 3 }} />
                                <span className="relative z-10" style={{ color: PT.gold }}>camada mais profunda</span>
                            </span>
                            <span style={{ color: PT.gold }}>?</span>
                        </h3>
                        <p className="text-[14.5px] sm:text-[16px] leading-relaxed max-w-lg mx-auto mb-8 font-medium" style={{ color: "rgba(255,244,220,0.75)" }}>
                            Começa pelo Plus e sobe quando quiseres. Cancelas a qualquer momento — sem perguntas.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                            <button
                                onClick={() => subscribe("plus", interval)}
                                data-testid="premium-cta-bottom-plus"
                                className="w-full sm:w-auto px-7 h-12 font-black uppercase inline-flex items-center justify-center gap-2 transition hover:translate-y-[-1px]"
                                style={{
                                    background: "transparent",
                                    color: "#fff",
                                    border: "1.5px solid rgba(255,255,255,0.30)",
                                    borderRadius: 999,
                                    fontSize: 12.5,
                                    letterSpacing: "0.14em",
                                }}
                            >
                                Começar com Plus
                                <ArrowRight size={15} strokeWidth={2.6} />
                            </button>
                            <button
                                onClick={() => subscribe("aura", interval)}
                                data-testid="premium-cta-bottom-aura"
                                className="w-full sm:w-auto px-7 h-12 font-black uppercase inline-flex items-center justify-center gap-2 transition hover:translate-y-[-1px]"
                                style={{
                                    background: PT.gold,
                                    color: PT.ink,
                                    borderRadius: 999,
                                    fontSize: 12.5,
                                    letterSpacing: "0.14em",
                                    boxShadow: "0 1px 2px rgba(10,10,10,0.10), 0 14px 30px -10px rgba(255,204,41,0.55)",
                                }}
                            >
                                <Crown size={15} strokeWidth={2.6} />
                                Saltar para Aura
                            </button>
                        </div>
                        <p className="text-[11px] mt-7 font-mono font-bold uppercase" style={{ color: "rgba(255,244,220,0.5)", letterSpacing: "0.18em" }}>
                            14 dias de garantia · cancelas quando quiseres · sem letras pequenas
                        </p>
                    </div>
                </section>
            )}

            {!billing_available && (
                <div className="px-4 py-10 text-center" style={{ background: PT.cream, borderTop: "1px solid rgba(10,10,10,0.08)" }}>
                    <p className="text-[11px] font-mono font-black uppercase inline-flex items-center gap-1.5" style={{ color: "rgba(10,10,10,0.42)", letterSpacing: "0.22em" }}>
                        <Info size={12} strokeWidth={2.4} />
                        Sistema de pagamentos a ser ativado em breve
                    </p>
                </div>
            )}
        </div>
    );
}
