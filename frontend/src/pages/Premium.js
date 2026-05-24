import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import {
    Check, ArrowRight, Sparkles, Heart, Shield, Zap, Star, Crown, Info,
    Palette, Music, Eye, BookOpen, MessageCircle, TrendingUp, Lock,
    Users, Image, Bookmark, Layers, SunMoon, Globe, ChevronDown, Minus
} from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { usePremium } from "../context/PremiumContext";
import { toast } from "sonner";

/* ─── Feature data ─── */
const PLUS_FEATURES = [
    { icon: Sparkles, text: "Perfil e layouts premium, com assinatura pessoal", hl: true },
    { icon: Crown,    text: "Banner subtil e estilo de perfil refinado", hl: true },
    { icon: Music,    text: "Presença avançada — com música e estados" },
    { icon: Star,     text: "Moods premium e stories maiores, com arquivo" },
    { icon: Zap,      text: "Feed calmo: filtros de energia e densidade social" },
    { icon: Shield,   text: "Coleções ilimitadas e bookmarks avançados" },
];

const AURA_FEATURES = [
    { icon: Crown,    text: "Tudo do Plus, mais profundo", hl: true },
    { icon: Sparkles, text: "Memória social pessoal e mini-timeline", hl: true },
    { icon: Heart,    text: "Histórico de presença e ritmos sociais" },
    { icon: SunMoon,  text: "Atmosfera de perfil — muda com a hora, o mood, a estação" },
    { icon: Zap,      text: "Identidade contextual — perfil vivo" },
    { icon: Eye,      text: "Insights do teu ritmo social (só para ti)" },
];

const COMPARISON = [
    { label: "Perfil personalizado",      icon: Palette,       free: false, plus: true,  aura: true },
    { label: "Assinatura pessoal",        icon: BookOpen,      free: false, plus: true,  aura: true },
    { label: "Presença com música",       icon: Music,         free: false, plus: true,  aura: true },
    { label: "Moods premium",             icon: Heart,         free: false, plus: true,  aura: true },
    { label: "Stories maiores + arquivo", icon: Image,         free: false, plus: true,  aura: true },
    { label: "Feed calmo (filtros)",      icon: Zap,           free: false, plus: true,  aura: true },
    { label: "Coleções ilimitadas",       icon: Bookmark,      free: false, plus: true,  aura: true },
    { label: "Memória social pessoal",    icon: Layers,        free: false, plus: false, aura: true },
    { label: "Mini-timeline",             icon: TrendingUp,    free: false, plus: false, aura: true },
    { label: "Atmosfera de perfil",       icon: SunMoon,       free: false, plus: false, aura: true },
    { label: "Identidade contextual",     icon: Globe,         free: false, plus: false, aura: true },
    { label: "Insights de ritmo social",  icon: Eye,           free: false, plus: false, aura: true },
    { label: "Histórico de presença",     icon: Users,         free: false, plus: false, aura: true },
    { label: "Mensagens sem limites",     icon: MessageCircle, free: true,  plus: true,  aura: true },
    { label: "Posts e comentários",       icon: BookOpen,      free: true,  plus: true,  aura: true },
    { label: "Privacidade total",         icon: Lock,          free: true,  plus: true,  aura: true },
];

/* ═══ Reveal on scroll — opacity + transform only ═══ */
function Reveal({ children, delay = 0, className = "" }) {
    const ref = useRef(null);
    const [v, setV] = useState(false);
    useEffect(() => {
        const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setV(true); }, { threshold: 0.08 });
        if (ref.current) obs.observe(ref.current);
        return () => obs.disconnect();
    }, []);
    return (
        <div ref={ref} className={className} style={{
            opacity: v ? 1 : 0,
            transform: v ? "translateY(0)" : "translateY(24px)",
            transition: `opacity 0.65s cubic-bezier(0.22,1,0.36,1) ${delay}s, transform 0.65s cubic-bezier(0.22,1,0.36,1) ${delay}s`,
        }}>{children}</div>
    );
}

/* ═══ Liquid morph background blobs ═══
   3 organic shapes that morph via border-radius (GPU: only compositing, no paint)
   No filter:blur — color softness comes from radial-gradient itself */
function LiquidBackground() {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
            {/* Base gradient */}
            <div className="absolute inset-0"
                 style={{ background: "linear-gradient(140deg, #6d28d9 0%, #a21caf 28%, #db2777 52%, #9333ea 78%, #7c3aed 100%)" }} />

            {/* Blob 1 — top-left pink */}
            <div className="absolute liq-blob-1"
                 style={{
                     width: "55%", height: "70%", top: "-10%", left: "-5%",
                     background: "radial-gradient(ellipse at 40% 40%, rgba(236,72,153,0.55) 0%, rgba(236,72,153,0) 70%)",
                 }} />

            {/* Blob 2 — center-right blue */}
            <div className="absolute liq-blob-2"
                 style={{
                     width: "50%", height: "65%", top: "5%", right: "-8%",
                     background: "radial-gradient(ellipse at 60% 50%, rgba(99,102,241,0.4) 0%, rgba(99,102,241,0) 70%)",
                 }} />

            {/* Blob 3 — bottom violet */}
            <div className="absolute liq-blob-3"
                 style={{
                     width: "60%", height: "55%", bottom: "-5%", left: "20%",
                     background: "radial-gradient(ellipse at 50% 60%, rgba(168,85,247,0.45) 0%, rgba(168,85,247,0) 70%)",
                 }} />

            {/* Slow drifting gradient overlay */}
            <div className="absolute inset-0 liq-drift opacity-30"
                 style={{ background: "linear-gradient(60deg, rgba(219,39,119,0.3), rgba(99,102,241,0.3), rgba(168,85,247,0.3), rgba(236,72,153,0.3))" }} />

            {/* Conic light accent */}
            <div className="absolute inset-0 opacity-[0.05]"
                 style={{ background: "conic-gradient(from 200deg at 50% 45%, white, transparent 25%, white 50%, transparent 75%)" }} />
        </div>
    );
}

/* ═══ Price tag ═══ */
function PriceTag({ amount, interval }) {
    return (
        <div className="flex items-baseline gap-2 mb-1">
            <span className="font-display text-[44px] sm:text-[50px] lg:text-[56px] tracking-[-0.04em] leading-none text-white tabular-nums shimmer-text">
                &euro;{amount.toFixed(2)}
            </span>
            <span className="text-white/50 text-[13px] font-medium pb-1">
                /{interval === "year" ? "ano" : "mês"}
            </span>
        </div>
    );
}

/* ═══ Feature list ═══ */
function FeatureList({ items }) {
    return (
        <ul className="space-y-3 mt-6">
            {items.map((f, i) => {
                const Icon = f.icon;
                return (
                    <li key={i} className={`flex items-start gap-3 text-[14px] leading-relaxed ${f.hl ? "text-white font-medium" : "text-white/75"}`}>
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-white/10 grid place-items-center mt-0.5">
                            <Icon size={12} className="text-white" strokeWidth={2.5} />
                        </span>
                        <span>{f.text}</span>
                    </li>
                );
            })}
        </ul>
    );
}

/* ═══ Liquid glass tier card ═══ */
function TierCard({
    tier, name, tagline, price, interval, features, current,
    billingAvailable, onSubscribe, onManage, borderGrad, isRecommended
}) {
    const ref = useRef(null);
    const onMove = useCallback((e) => {
        if (!ref.current) return;
        const r = ref.current.getBoundingClientRect();
        ref.current.style.setProperty("--mx", `${e.clientX - r.left}px`);
        ref.current.style.setProperty("--my", `${e.clientY - r.top}px`);
    }, []);

    return (
        <div ref={ref} className="relative group" onMouseMove={onMove} style={{ "--mx": "50%", "--my": "50%" }}>
            {/* Recommended tag */}
            {isRecommended && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-20">
                    <div className="relative px-5 py-1.5 rounded-full text-[10.5px] font-bold uppercase tracking-wider text-black overflow-hidden"
                         style={{ background: "linear-gradient(90deg, #fbbf24, #f59e0b, #d97706)" }}>
                        <span className="relative z-10">Recomendado</span>
                        <span className="absolute inset-0 shine-effect" />
                    </div>
                </div>
            )}

            {/* Gradient border wrapper */}
            <div className="relative overflow-hidden rounded-[32px] p-[1.5px] transition-transform duration-300 ease-out group-hover:-translate-y-1.5"
                 style={{ background: borderGrad }}>

                {/* Liquid spotlight (CSS custom props, no re-render) */}
                <div className="absolute inset-0 rounded-[32px] opacity-0 group-hover:opacity-100 transition-opacity duration-250 pointer-events-none z-10"
                     style={{ background: "radial-gradient(400px circle at var(--mx) var(--my), rgba(255,255,255,0.13), transparent 50%)" }} />

                {/* Glass card */}
                <div className="relative liq-glass rounded-[calc(2rem-1.5px)] p-6 sm:p-7 lg:p-8 flex flex-col h-full">
                    {/* Inner gradient orb (static, no blur) */}
                    <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full pointer-events-none"
                         style={{ background: tier === "aura"
                             ? "radial-gradient(circle, rgba(236,72,153,0.12) 0%, transparent 70%)"
                             : "radial-gradient(circle, rgba(139,92,246,0.10) 0%, transparent 70%)" }} />

                    {/* Header */}
                    <div className="mb-5 relative">
                        <div className="flex items-center gap-2 mb-1.5">
                            <h3 className="font-display text-[26px] sm:text-[30px] lg:text-[32px] tracking-tight text-white leading-none">
                                {name.replace("Lusorae ", "")}
                            </h3>
                            {tier === "aura" && (
                                <Crown size={20} className="text-yellow-300" style={{ filter: "drop-shadow(0 0 4px rgba(253,224,71,0.4))" }} />
                            )}
                        </div>
                        <p className="text-[13px] sm:text-[14px] text-white/60 leading-relaxed max-w-[30ch]">{tagline}</p>
                    </div>

                    {/* Price */}
                    <div className="mb-3">
                        <PriceTag amount={price} interval={interval} />
                        {interval === "year" && (
                            <p className="text-[11.5px] text-white/40 font-medium">
                                Equivalente a &euro;{(price / 12).toFixed(2)}/mês
                            </p>
                        )}
                    </div>

                    {/* Liquid divider */}
                    <div className="relative h-px mb-5 overflow-hidden">
                        <div className="absolute inset-0"
                             style={{ background: tier === "aura"
                                 ? "linear-gradient(90deg, transparent 5%, rgba(236,72,153,0.4) 30%, rgba(168,85,247,0.35) 60%, transparent 95%)"
                                 : "linear-gradient(90deg, transparent 5%, rgba(139,92,246,0.35) 40%, rgba(168,85,247,0.25) 70%, transparent 95%)" }} />
                        <div className="absolute inset-0 shimmer-line"
                             style={{ background: "linear-gradient(90deg, transparent 30%, rgba(255,255,255,0.5) 50%, transparent 70%)" }} />
                    </div>

                    {/* Features */}
                    <FeatureList items={features} />

                    {/* CTA */}
                    <div className="mt-auto pt-7">
                        {current ? (
                            <button onClick={onManage}
                                className="w-full h-12 rounded-2xl bg-white/12 text-white text-[14px] font-bold hover:bg-white/18 transition-colors duration-150 border border-white/10 inline-flex items-center justify-center gap-2">
                                O teu plano &middot; Gerir
                            </button>
                        ) : billingAvailable ? (
                            <button onClick={() => onSubscribe(tier, interval)}
                                data-testid={`premium-subscribe-${tier}`}
                                className="w-full h-12 rounded-2xl bg-white text-black text-[14px] font-bold hover:shadow-lg active:scale-[0.97] transition-all duration-150 inline-flex items-center justify-center gap-2 group/btn">
                                Escolher {name.replace("Lusorae ", "")}
                                <ArrowRight size={16} className="group-hover/btn:translate-x-0.5 transition-transform duration-150" strokeWidth={2.5} />
                            </button>
                        ) : (
                            <button disabled className="w-full h-12 rounded-2xl bg-white/8 text-white/30 text-[14px] font-bold cursor-not-allowed border border-white/5">
                                Brevemente
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ═══ Compare cell ═══ */
function CCell({ ok, hl }) {
    return (
        <td className={`text-center py-3 ${hl ? "bg-violet-50/40" : ""}`}>
            {ok ? (
                <span className="inline-flex w-5 h-5 rounded-full bg-green-500/10 items-center justify-center">
                    <Check size={12} className="text-green-600" strokeWidth={3} />
                </span>
            ) : (
                <span className="inline-flex w-5 h-5 rounded-full bg-black/[0.04] items-center justify-center">
                    <Minus size={10} className="text-black/20" strokeWidth={2.5} />
                </span>
            )}
        </td>
    );
}

/* ═══════════════════════════════════════════════════════════
   MAIN — Liquid Morphism: organic blobs, glass cards, zero lag
   All animations: border-radius, background-position, transform, opacity
   ═══════════════════════════════════════════════════════════ */
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
        <div data-testid="premium-page" className="min-h-screen bg-white">
            <PageHeader title="Plus & Aura" subtitle="Uma camada mais profunda do teu Lusorae" back />

            {/* ═══ HERO + PLANOS — liquid morphism background ═══ */}
            <section className="relative overflow-hidden">
                <LiquidBackground />

                <div className="relative px-4 sm:px-6 lg:px-8 pt-8 sm:pt-10 pb-24 sm:pb-28 max-w-6xl mx-auto">
                    {/* Toggle mensal / anual */}
                    <div className="flex justify-center mb-8 sm:mb-10">
                        <div className="inline-flex items-center gap-1 p-1 rounded-2xl liq-glass">
                            {["month", "year"].map((i) => (
                                <button key={i} onClick={() => setInterval(i)}
                                    className={`px-5 sm:px-6 h-10 rounded-xl text-[13px] font-bold transition-all duration-200 ${
                                        interval === i
                                            ? "bg-white text-black shadow-md"
                                            : "text-white/65 hover:text-white hover:bg-white/10"
                                    }`}>
                                    {i === "month" ? "Mensal" : "Anual"}
                                    {i === "year" && (
                                        <span className={`ml-1.5 text-[10px] font-black tracking-wide ${
                                            interval === i ? "text-violet-600" : "text-yellow-300"
                                        }`}>-17%</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Cards de plano */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-7 lg:gap-8 max-w-[1050px] mx-auto">
                        <TierCard
                            tier="plus"
                            name="Lusorae Plus"
                            tagline="Para quem quer mais da sua experiência social"
                            price={prices.plus}
                            interval={interval}
                            features={PLUS_FEATURES}
                            current={isPlus}
                            billingAvailable={billing_available}
                            onSubscribe={subscribe}
                            onManage={manage}
                            borderGrad="linear-gradient(135deg, #8b5cf6, #a855f7, #c084fc, #8b5cf6)"
                        />
                        <TierCard
                            tier="aura"
                            name="Lusorae Aura"
                            tagline="A experiência definitiva. O Lusorae ao máximo."
                            price={prices.aura}
                            interval={interval}
                            features={AURA_FEATURES}
                            current={isAura}
                            billingAvailable={billing_available}
                            onSubscribe={subscribe}
                            onManage={manage}
                            borderGrad="linear-gradient(135deg, #ec4899, #d946ef, #a855f7, #8b5cf6, #ec4899)"
                            isRecommended
                        />
                    </div>

                    {plan !== "free" && (
                        <p className="text-[12px] text-white/45 text-center mt-7 font-medium">
                            Subscrição ativa &middot; gere pagamentos, faturas e cancelamento no portal seguro
                        </p>
                    )}
                </div>

                {/* Bottom fade */}
                <div className="absolute bottom-0 inset-x-0 h-28 sm:h-36 pointer-events-none"
                     style={{ background: "linear-gradient(to top, white 0%, rgba(255,255,255,0.85) 40%, transparent 100%)" }} />
            </section>

            {/* ═══ COMPARAÇÃO ═══ */}
            <section className="px-4 sm:px-6 lg:px-8 py-14 sm:py-18 lg:py-20 max-w-4xl mx-auto">
                <Reveal>
                    <div className="text-center mb-8 sm:mb-10">
                        <p className="text-[10.5px] uppercase tracking-[0.18em] text-black/35 font-mono mb-2 font-semibold">Comparação detalhada</p>
                        <h2 className="font-display text-[28px] sm:text-[34px] lg:text-[40px] tracking-tight text-black leading-tight">
                            O que inclui cada plano
                        </h2>
                    </div>
                </Reveal>
                <Reveal delay={0.08}>
                    <div className="overflow-x-auto -mx-4 sm:mx-0">
                        <div className="min-w-[520px] sm:min-w-0 px-4 sm:px-0">
                            <div className="rounded-2xl border border-black/[0.06] liq-glass-light overflow-hidden shadow-sm">
                                <table className="w-full text-[13px] sm:text-[14px]">
                                    <thead>
                                        <tr style={{ background: "linear-gradient(90deg, rgba(139,92,246,0.04), rgba(236,72,153,0.04), rgba(168,85,247,0.04))" }}>
                                            <th className="text-left py-3.5 px-4 sm:px-5 font-semibold text-black/65 w-[50%]">Funcionalidade</th>
                                            <th className="text-center py-3.5 px-2 font-semibold text-black/40 w-[16%]">Grátis</th>
                                            <th className="text-center py-3.5 px-2 font-bold w-[17%]">
                                                <span style={{ background: "linear-gradient(90deg,#7c3aed,#a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Plus</span>
                                            </th>
                                            <th className="text-center py-3.5 px-2 font-bold w-[17%]">
                                                <span style={{ background: "linear-gradient(90deg,#ec4899,#a855f7)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Aura</span>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {COMPARISON.map((r, i) => {
                                            const Icon = r.icon;
                                            return (
                                                <tr key={i} className="border-b border-black/[0.04] hover:bg-violet-50/25 transition-colors duration-100">
                                                    <td className="py-3 px-4 sm:px-5">
                                                        <div className="flex items-center gap-2">
                                                            <Icon size={14} className="text-black/30 flex-shrink-0 hidden sm:block" strokeWidth={2} />
                                                            <span className="text-black/70">{r.label}</span>
                                                        </div>
                                                    </td>
                                                    <CCell ok={r.free} />
                                                    <CCell ok={r.plus} hl />
                                                    <CCell ok={r.aura} hl />
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </Reveal>
            </section>

            {/* ═══ TRÊS PILARES ═══ */}
            <section className="px-4 sm:px-6 lg:px-8 py-14 sm:py-18 lg:py-20 max-w-6xl mx-auto relative">
                {/* Decorative gradient mesh */}
                <div className="absolute inset-0 -z-10 pointer-events-none" style={{ background: `
                    radial-gradient(ellipse 55% 40% at 15% 50%, rgba(139,92,246,0.05) 0%, transparent 70%),
                    radial-gradient(ellipse 45% 45% at 80% 45%, rgba(236,72,153,0.04) 0%, transparent 70%)
                `}} />

                <Reveal>
                    <div className="text-center mb-10 sm:mb-12">
                        <h2 className="font-display text-[28px] sm:text-[34px] lg:text-[40px] tracking-tight text-black mb-2 leading-tight">
                            Três pilares, uma promessa
                        </h2>
                        <p className="text-[14px] sm:text-[15px] text-black/45 max-w-lg mx-auto leading-relaxed">
                            O premium é sobre ti, não sobre os outros
                        </p>
                    </div>
                </Reveal>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
                    {[
                        { icon: Heart,  title: "Pertença Real",    desc: "Comunidade que valoriza autenticidade e profundidade. O premium não te separa dos outros.", g: "from-violet-50 to-pink-50" },
                        { icon: Shield, title: "Sem Distrações",   desc: "Controlo total sobre o que vês. Feed calmo, notificações inteligentes, ritmo respeitado.", g: "from-indigo-50 to-violet-50" },
                        { icon: Star,   title: "Identidade Única", desc: "Ferramentas que se adaptam a ti. Expressa-te de forma autêntica, sem pressão social.", g: "from-pink-50 to-rose-50" },
                    ].map((item, idx) => {
                        const Icon = item.icon;
                        return (
                            <Reveal key={idx} delay={idx * 0.08}>
                                <div className={`group rounded-2xl p-5 sm:p-6 bg-gradient-to-br ${item.g} border border-black/[0.05] hover:shadow-lg transition-shadow duration-200 h-full`}>
                                    <div className="w-10 h-10 rounded-xl bg-white/80 grid place-items-center mb-4 shadow-sm group-hover:scale-105 transition-transform duration-200">
                                        <Icon size={18} className="text-violet-600" strokeWidth={2} />
                                    </div>
                                    <h3 className="font-bold text-[15px] sm:text-[16px] text-black mb-1.5 tracking-tight">{item.title}</h3>
                                    <p className="text-[13px] text-black/55 leading-relaxed">{item.desc}</p>
                                </div>
                            </Reveal>
                        );
                    })}
                </div>
            </section>

            {/* ═══ O QUE PREMIUM NÃO FAZ ═══ */}
            <section className="px-4 sm:px-6 lg:px-8 py-10 sm:py-12 max-w-4xl mx-auto">
                <Reveal>
                    <div className="relative overflow-hidden rounded-3xl p-[1.5px]"
                         style={{ background: "linear-gradient(135deg, #8b5cf6, #d946ef, #ec4899, #a855f7, #7c3aed)", backgroundSize: "300% 300%", animation: "premGradientFlow 8s ease infinite" }}>
                        <div className="relative bg-white rounded-[calc(1.5rem-1.5px)] p-6 sm:p-8 lg:p-9">
                            <div className="flex items-start gap-3 sm:gap-4 mb-5">
                                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl grid place-items-center flex-shrink-0"
                                     style={{ background: "linear-gradient(135deg, rgba(139,92,246,0.12), rgba(236,72,153,0.12))" }}>
                                    <Info size={18} className="text-violet-600" strokeWidth={2} />
                                </div>
                                <div>
                                    <p className="text-[10.5px] uppercase tracking-[0.14em] text-black/35 font-mono mb-1 font-semibold">Alinhado com o manifesto</p>
                                    <h2 className="font-display text-[22px] sm:text-[26px] lg:text-[30px] leading-tight tracking-tight text-black">
                                        O que o Premium{" "}
                                        <span style={{ background: "linear-gradient(90deg,#7c3aed,#ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>não faz</span>
                                    </h2>
                                </div>
                            </div>

                            <div className="space-y-3 mb-5">
                                {[
                                    "Não te dá mais alcance, visibilidade ou prioridade no feed dos outros.",
                                    "Não muda o algoritmo para te favorecer.",
                                    "Não remove anúncios — porque não há anúncios no Lusorae.",
                                    "Não te torna melhor que os outros utilizadores.",
                                ].map((t, i) => (
                                    <div key={i} className="flex items-start gap-2.5">
                                        <div className="w-5 h-5 rounded-full bg-green-500/10 grid place-items-center flex-shrink-0 mt-0.5">
                                            <Check size={11} className="text-green-600" strokeWidth={3} />
                                        </div>
                                        <p className="text-[13.5px] text-black/70 leading-relaxed">{t}</p>
                                    </div>
                                ))}
                            </div>

                            <div className="h-px mb-4" style={{ background: "linear-gradient(90deg, transparent, rgba(139,92,246,0.1), rgba(236,72,153,0.1), transparent)" }} />
                            <p className="text-[13px] text-black/50 leading-relaxed">
                                O premium é conforto, identidade e ferramentas. Nunca é vantagem social.
                                <strong className="block mt-1.5 text-black font-semibold">O tempo que passas aqui é teu. Não nosso.</strong>
                            </p>
                        </div>
                    </div>
                </Reveal>
            </section>

            {/* ═══ FAQ ═══ */}
            <section className="px-4 sm:px-6 lg:px-8 py-14 sm:py-16 max-w-3xl mx-auto prem-faq">
                <Reveal>
                    <div className="text-center mb-8 sm:mb-10">
                        <h2 className="font-display text-[26px] sm:text-[32px] lg:text-[36px] tracking-tight text-black mb-2">Perguntas frequentes</h2>
                        <p className="text-[13px] sm:text-[14px] text-black/40">Tudo o que precisas de saber</p>
                    </div>
                </Reveal>

                <div className="space-y-2.5">
                    {[
                        { q: "Posso cancelar a qualquer momento?", a: "Sim. Sem compromissos ou taxas de cancelamento. Manténs o acesso até ao fim do período pago." },
                        { q: "O que acontece aos meus dados se cancelar?", a: "Nada. Os teus posts, mensagens e perfil mantêm-se. Só perdes acesso às funcionalidades premium." },
                        { q: "Há garantia de reembolso?", a: "Sim, 14 dias de garantia total. Se não adorares, devolvemos o teu dinheiro sem perguntas." },
                        { q: "Posso mudar entre Plus e Aura?", a: "Sim, a qualquer momento. O valor é ajustado proporcionalmente no próximo ciclo de faturação." },
                        { q: "O premium dá-me mais visibilidade?", a: "Não. O feed, o algoritmo e as tendências tratam todos os utilizadores de forma igual. O premium melhora a tua experiência, nunca a manipula para outros." },
                    ].map((faq, idx) => (
                        <Reveal key={idx} delay={idx * 0.04}>
                            <details className="group liq-glass-light p-4 sm:p-5 rounded-2xl cursor-pointer hover:shadow-md transition-shadow duration-150">
                                <summary className="flex items-center justify-between font-semibold text-[14px] sm:text-[15px] text-black">
                                    <span className="pr-4">{faq.q}</span>
                                    <span className="w-7 h-7 rounded-full bg-violet-50 grid place-items-center flex-shrink-0 group-open:bg-violet-100 transition-colors duration-150">
                                        <ChevronDown size={15} className="text-violet-600 group-open:rotate-180 transition-transform duration-200" strokeWidth={2.5} />
                                    </span>
                                </summary>
                                <div className="prem-faq-answer">
                                    <p className="mt-3 text-[13px] sm:text-[14px] text-black/55 leading-relaxed">{faq.a}</p>
                                </div>
                            </details>
                        </Reveal>
                    ))}
                </div>
            </section>

            {!billing_available && (
                <div className="px-4 py-10 text-center border-t border-black/[0.06]">
                    <p className="text-[12px] text-black/30 font-mono">Sistema de pagamentos a ser ativado em breve</p>
                </div>
            )}
        </div>
    );
}
