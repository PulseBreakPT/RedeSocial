import { useMemo, useState, useRef, useCallback } from "react";
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

/* ═══ Price ═══ */
function PriceTag({ amount, interval, color }) {
    return (
        <div className="flex items-baseline gap-2 mb-1">
            <span className={`font-display text-[44px] sm:text-[50px] lg:text-[56px] tracking-[-0.04em] leading-none tabular-nums ${color}`}>
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

/* ═══ Tier card ═══ */
function TierCard({
    tier, name, subtitle, tagline, price, interval, features, current,
    billingAvailable, onSubscribe, onManage, bg, borderGrad, priceColor,
    orbGrad, isRecommended
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
            {isRecommended && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-20">
                    <div className="relative px-5 py-1.5 rounded-full text-[10.5px] font-bold uppercase tracking-wider text-black overflow-hidden"
                         style={{ background: "linear-gradient(90deg, #fbbf24, #f59e0b, #d97706)" }}>
                        <span className="relative z-10">Recomendado</span>
                        <span className="absolute inset-0 shine-effect" />
                    </div>
                </div>
            )}

            <div className="relative overflow-hidden rounded-[32px] p-[1.5px] transition-transform duration-300 ease-out group-hover:-translate-y-1.5"
                 style={{ background: borderGrad }}>

                {/* Spotlight */}
                <div className="absolute inset-0 rounded-[32px] opacity-0 group-hover:opacity-100 transition-opacity duration-250 pointer-events-none z-10"
                     style={{ background: "radial-gradient(400px circle at var(--mx) var(--my), rgba(255,255,255,0.12), transparent 50%)" }} />

                <div className="relative rounded-[calc(2rem-1.5px)] p-6 sm:p-7 lg:p-8 flex flex-col h-full border border-white/[0.08]"
                     style={{ background: bg }}>

                    {/* Decorative orb */}
                    <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full pointer-events-none" style={{ background: orbGrad }} />

                    {/* Header */}
                    <div className="mb-5 relative">
                        <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-display text-[26px] sm:text-[30px] lg:text-[32px] tracking-tight text-white leading-none">
                                {name}
                            </h3>
                            {tier === "aura" && <Crown size={20} className="text-yellow-300" style={{ filter: "drop-shadow(0 0 4px rgba(253,224,71,0.4))" }} />}
                        </div>
                        <p className="text-[12px] uppercase tracking-[0.12em] text-white/40 font-mono font-semibold mb-2">{subtitle}</p>
                        <p className="text-[13.5px] text-white/60 leading-relaxed max-w-[32ch]">{tagline}</p>
                    </div>

                    {/* Price */}
                    <div className="mb-3">
                        <PriceTag amount={price} interval={interval} color={priceColor} />
                        {interval === "year" && (
                            <p className="text-[11.5px] text-white/40 font-medium">Equivalente a &euro;{(price / 12).toFixed(2)}/mês &middot; Poupas 17%</p>
                        )}
                    </div>

                    {/* Divider */}
                    <div className="relative h-px mb-5 overflow-hidden">
                        <div className="absolute inset-0" style={{ background: borderGrad, opacity: 0.4 }} />
                        <div className="absolute inset-0 shimmer-line" style={{ background: "linear-gradient(90deg, transparent 30%, rgba(255,255,255,0.5) 50%, transparent 70%)" }} />
                    </div>

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
                                Escolher {name}
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

/* ═══════════════════════════════════════════
   MAIN — fundo branco, gradientes opostos,
   sem animações de scroll, tudo instantâneo
   ═══════════════════════════════════════════ */
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

            {/* ═══ PLANOS ═══ */}
            <section className="px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8 pb-16 sm:pb-20 max-w-6xl mx-auto">
                {/* Título da secção */}
                <div className="text-center mb-8 sm:mb-10">
                    <h2 className="font-display text-[28px] sm:text-[36px] lg:text-[42px] tracking-tight text-black leading-tight mb-3">
                        Escolhe o teu plano
                    </h2>
                    <p className="text-[14px] sm:text-[16px] text-black/50 max-w-xl mx-auto leading-relaxed">
                        Sem anúncios. Sem algoritmos manipulados. Apenas ferramentas que aprofundam a tua presença — ao teu ritmo.
                    </p>
                </div>

                {/* Toggle */}
                <div className="flex justify-center mb-8 sm:mb-10">
                    <div className="inline-flex items-center gap-1 p-1 rounded-2xl bg-black/[0.04] border border-black/[0.06]">
                        {["month", "year"].map((i) => (
                            <button key={i} onClick={() => setInterval(i)}
                                className={`px-5 sm:px-7 h-10 rounded-xl text-[13px] font-bold transition-all duration-200 ${
                                    interval === i
                                        ? "bg-black text-white shadow-md"
                                        : "text-black/50 hover:text-black hover:bg-black/[0.04]"
                                }`}>
                                {i === "month" ? "Mensal" : "Anual"}
                                {i === "year" && (
                                    <span className={`ml-1.5 text-[10px] font-black tracking-wide ${interval === i ? "text-green-400" : "text-green-600"}`}>
                                        POUPA 17%
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Cards — gradientes opostos */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-7 lg:gap-8 max-w-[1050px] mx-auto">
                    {/* PLUS — Azul profundo / Índigo / Ciano frio
                        Identidade visual: calmo, profundo, sereno, noturno */}
                    <TierCard
                        tier="plus"
                        name="Plus"
                        subtitle="Presença elevada"
                        tagline="Para quem quer personalizar a sua experiência. Mais expressão, mais controlo, mais conforto no dia-a-dia."
                        price={prices.plus}
                        interval={interval}
                        features={PLUS_FEATURES}
                        current={isPlus}
                        billingAvailable={billing_available}
                        onSubscribe={subscribe}
                        onManage={manage}
                        bg="linear-gradient(160deg, #1e1b4b 0%, #312e81 30%, #1e3a5f 60%, #0f172a 100%)"
                        borderGrad="linear-gradient(135deg, #6366f1, #3b82f6, #06b6d4, #6366f1)"
                        priceColor="text-cyan-300"
                        orbGrad="radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)"
                    />

                    {/* AURA — Rosa quente / Âmbar / Dourado solar
                        Identidade visual: quente, luxuoso, vibrante, solar */}
                    <TierCard
                        tier="aura"
                        name="Aura"
                        subtitle="A experiência definitiva"
                        tagline="Tudo do Plus, mais uma camada de profundidade. O teu perfil ganha vida — adapta-se a ti, à hora e ao momento."
                        price={prices.aura}
                        interval={interval}
                        features={AURA_FEATURES}
                        current={isAura}
                        billingAvailable={billing_available}
                        onSubscribe={subscribe}
                        onManage={manage}
                        bg="linear-gradient(160deg, #4a1942 0%, #831843 30%, #7c2d12 60%, #451a03 100%)"
                        borderGrad="linear-gradient(135deg, #f43f5e, #ec4899, #f59e0b, #eab308, #f43f5e)"
                        priceColor="text-amber-300"
                        orbGrad="radial-gradient(circle, rgba(244,63,94,0.12) 0%, transparent 70%)"
                        isRecommended
                    />
                </div>

                {plan !== "free" && (
                    <p className="text-[12px] text-black/40 text-center mt-7 font-medium">
                        Subscrição ativa &middot; gere pagamentos, faturas e cancelamento no portal seguro
                    </p>
                )}
            </section>

            {/* Separador gradiente subtil */}
            <div className="h-px max-w-5xl mx-auto" style={{ background: "linear-gradient(90deg, transparent, rgba(0,0,0,0.06), transparent)" }} />

            {/* ═══ COMPARAÇÃO DETALHADA ═══ */}
            <section className="px-4 sm:px-6 lg:px-8 py-14 sm:py-18 lg:py-20 max-w-4xl mx-auto">
                <div className="text-center mb-8 sm:mb-10">
                    <p className="text-[10.5px] uppercase tracking-[0.18em] text-black/35 font-mono mb-2 font-semibold">
                        Lado a lado
                    </p>
                    <h2 className="font-display text-[26px] sm:text-[32px] lg:text-[38px] tracking-tight text-black leading-tight mb-3">
                        Comparação completa dos planos
                    </h2>
                    <p className="text-[13.5px] sm:text-[15px] text-black/45 max-w-lg mx-auto leading-relaxed">
                        Todas as funcionalidades, sem letras pequenas. O plano grátis já inclui o essencial — o premium acrescenta profundidade.
                    </p>
                </div>

                <div className="overflow-x-auto -mx-4 sm:mx-0">
                    <div className="min-w-[520px] sm:min-w-0 px-4 sm:px-0">
                        <div className="rounded-2xl border border-black/[0.06] bg-white overflow-hidden shadow-sm">
                            <table className="w-full text-[13px] sm:text-[14px]">
                                <thead>
                                    <tr className="bg-black/[0.02]">
                                        <th className="text-left py-3.5 px-4 sm:px-5 font-semibold text-black/60 w-[50%]">Funcionalidade</th>
                                        <th className="text-center py-3.5 px-2 font-semibold text-black/35 w-[16%]">Grátis</th>
                                        <th className="text-center py-3.5 px-2 font-bold w-[17%]">
                                            <span style={{ background: "linear-gradient(90deg,#4f46e5,#06b6d4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Plus</span>
                                        </th>
                                        <th className="text-center py-3.5 px-2 font-bold w-[17%]">
                                            <span style={{ background: "linear-gradient(90deg,#f43f5e,#f59e0b)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Aura</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {COMPARISON.map((r, i) => {
                                        const Icon = r.icon;
                                        return (
                                            <tr key={i} className="border-b border-black/[0.04] hover:bg-black/[0.015] transition-colors duration-100">
                                                <td className="py-3 px-4 sm:px-5">
                                                    <div className="flex items-center gap-2">
                                                        <Icon size={14} className="text-black/25 flex-shrink-0 hidden sm:block" strokeWidth={2} />
                                                        <span className="text-black/65">{r.label}</span>
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
            </section>

            {/* Separador */}
            <div className="h-px max-w-5xl mx-auto" style={{ background: "linear-gradient(90deg, transparent, rgba(0,0,0,0.06), transparent)" }} />

            {/* ═══ OS NOSSOS PRINCÍPIOS ═══ */}
            <section className="px-4 sm:px-6 lg:px-8 py-14 sm:py-18 lg:py-20 max-w-6xl mx-auto">
                <div className="text-center mb-10 sm:mb-12">
                    <p className="text-[10.5px] uppercase tracking-[0.18em] text-black/35 font-mono mb-2 font-semibold">
                        Os nossos princípios
                    </p>
                    <h2 className="font-display text-[26px] sm:text-[32px] lg:text-[38px] tracking-tight text-black mb-3 leading-tight">
                        Três pilares que definem o premium
                    </h2>
                    <p className="text-[13.5px] sm:text-[15px] text-black/45 max-w-lg mx-auto leading-relaxed">
                        Não vendemos atenção, alcance ou prioridade. O premium existe para te dar mais conforto — nunca mais poder.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
                    {[
                        {
                            icon: Heart,
                            title: "Pertença Real",
                            desc: "O premium não cria uma classe à parte. A comunidade é uma só. As ferramentas premium aprofundam a tua experiência sem afetar a dos outros.",
                            g: "from-indigo-50 to-cyan-50",
                            ic: "text-indigo-600",
                        },
                        {
                            icon: Shield,
                            title: "Sem Distrações",
                            desc: "Controlo total sobre o que vês e quando. Feed calmo, notificações inteligentes, modo noturno por defeito. O teu ritmo é respeitado.",
                            g: "from-violet-50 to-fuchsia-50",
                            ic: "text-violet-600",
                        },
                        {
                            icon: Star,
                            title: "Identidade Única",
                            desc: "Ferramentas de expressão que se adaptam a ti — não te forçam a competir. Moods, atmosferas e presença autêntica, sem pressão social.",
                            g: "from-amber-50 to-orange-50",
                            ic: "text-amber-600",
                        },
                    ].map((item, idx) => {
                        const Icon = item.icon;
                        return (
                            <div key={idx} className={`group rounded-2xl p-5 sm:p-6 bg-gradient-to-br ${item.g} border border-black/[0.05] hover:shadow-lg transition-shadow duration-200 h-full`}>
                                <div className="w-10 h-10 rounded-xl bg-white/80 grid place-items-center mb-4 shadow-sm group-hover:scale-105 transition-transform duration-200">
                                    <Icon size={18} className={item.ic} strokeWidth={2} />
                                </div>
                                <h3 className="font-bold text-[15px] sm:text-[16px] text-black mb-2 tracking-tight">{item.title}</h3>
                                <p className="text-[13px] text-black/55 leading-relaxed">{item.desc}</p>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* Separador */}
            <div className="h-px max-w-5xl mx-auto" style={{ background: "linear-gradient(90deg, transparent, rgba(0,0,0,0.06), transparent)" }} />

            {/* ═══ O QUE O PREMIUM NÃO FAZ ═══ */}
            <section className="px-4 sm:px-6 lg:px-8 py-12 sm:py-16 max-w-4xl mx-auto">
                <div className="relative overflow-hidden rounded-3xl p-[1.5px]"
                     style={{ background: "linear-gradient(135deg, #4f46e5, #06b6d4, #f43f5e, #f59e0b, #4f46e5)", backgroundSize: "300% 300%", animation: "premGradientFlow 10s ease infinite" }}>
                    <div className="relative bg-white rounded-[calc(1.5rem-1.5px)] p-6 sm:p-8 lg:p-9">
                        <div className="flex items-start gap-3 sm:gap-4 mb-5">
                            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl grid place-items-center flex-shrink-0"
                                 style={{ background: "linear-gradient(135deg, rgba(79,70,229,0.10), rgba(244,63,94,0.10))" }}>
                                <Info size={18} className="text-indigo-600" strokeWidth={2} />
                            </div>
                            <div>
                                <p className="text-[10.5px] uppercase tracking-[0.14em] text-black/35 font-mono mb-1 font-semibold">
                                    Transparência total
                                </p>
                                <h2 className="font-display text-[22px] sm:text-[26px] lg:text-[30px] leading-tight tracking-tight text-black">
                                    O que o premium{" "}
                                    <span className="underline decoration-2 decoration-red-400/40 underline-offset-4">não faz</span>
                                </h2>
                            </div>
                        </div>

                        <p className="text-[13.5px] text-black/50 leading-relaxed mb-5 max-w-2xl">
                            Acreditamos que a confiança se constrói com clareza. Por isso, dizemos-te exactamente o que o premium nunca vai fazer — para que saibas exactamente o que estás a pagar.
                        </p>

                        <div className="space-y-3 mb-5">
                            {[
                                { bold: "Sem alcance extra", rest: " — o premium não te dá mais visibilidade, prioridade no feed ou destaque nas tendências." },
                                { bold: "Sem algoritmo diferente", rest: " — o teu conteúdo é tratado exactamente como o de qualquer outro utilizador." },
                                { bold: "Sem remoção de anúncios", rest: " — porque o Lusorae não tem anúncios. Ponto." },
                                { bold: "Sem hierarquia social", rest: " — o premium não te torna melhor, mais importante ou mais visível que os outros." },
                            ].map((t, i) => (
                                <div key={i} className="flex items-start gap-2.5">
                                    <div className="w-5 h-5 rounded-full bg-green-500/10 grid place-items-center flex-shrink-0 mt-0.5">
                                        <Check size={11} className="text-green-600" strokeWidth={3} />
                                    </div>
                                    <p className="text-[13.5px] text-black/70 leading-relaxed">
                                        <strong className="text-black font-semibold">{t.bold}</strong>{t.rest}
                                    </p>
                                </div>
                            ))}
                        </div>

                        <div className="h-px mb-4" style={{ background: "linear-gradient(90deg, transparent, rgba(0,0,0,0.06), transparent)" }} />
                        <p className="text-[13px] text-black/50 leading-relaxed">
                            O premium é conforto, identidade e ferramentas. Nunca é vantagem social.
                            <strong className="block mt-1.5 text-black font-semibold">O tempo que passas aqui é teu. Não nosso.</strong>
                        </p>
                    </div>
                </div>
            </section>

            {/* Separador */}
            <div className="h-px max-w-5xl mx-auto" style={{ background: "linear-gradient(90deg, transparent, rgba(0,0,0,0.06), transparent)" }} />

            {/* ═══ FAQ ═══ */}
            <section className="px-4 sm:px-6 lg:px-8 py-14 sm:py-16 max-w-3xl mx-auto prem-faq">
                <div className="text-center mb-8 sm:mb-10">
                    <p className="text-[10.5px] uppercase tracking-[0.18em] text-black/35 font-mono mb-2 font-semibold">
                        Dúvidas
                    </p>
                    <h2 className="font-display text-[24px] sm:text-[30px] lg:text-[34px] tracking-tight text-black mb-2">
                        Perguntas frequentes
                    </h2>
                    <p className="text-[13px] sm:text-[14px] text-black/40 max-w-md mx-auto leading-relaxed">
                        Respostas directas, sem rodeios. Se tiveres outra pergunta, estamos sempre disponíveis.
                    </p>
                </div>

                <div className="space-y-2.5">
                    {[
                        { q: "Posso cancelar a qualquer momento?", a: "Sim. Sem compromissos, sem taxas, sem perguntas. Manténs o acesso até ao fim do período que já pagaste." },
                        { q: "O que acontece aos meus dados se cancelar?", a: "Absolutamente nada. Os teus posts, mensagens, perfil e coleções ficam exactamente como estão. Só perdes acesso às funcionalidades premium." },
                        { q: "Há garantia de reembolso?", a: "Sim. Tens 14 dias de garantia total. Se não adorares a experiência, devolvemos o teu dinheiro sem perguntas." },
                        { q: "Posso mudar entre Plus e Aura?", a: "Sim, a qualquer momento. O valor é ajustado proporcionalmente no próximo ciclo de faturação — sem custos escondidos." },
                        { q: "O premium dá-me mais visibilidade no feed?", a: "Não. O feed, o algoritmo e as tendências tratam todos os utilizadores de forma exactamente igual. O premium melhora a tua experiência pessoal — nunca manipula a dos outros." },
                        { q: "Porque é que não há anúncios?", a: "Porque o nosso modelo de negócio é o premium. Quem paga é quem usa — não anunciantes. Isto significa que nunca precisamos de te manter 'preso' para vender a tua atenção." },
                    ].map((faq, idx) => (
                        <details key={idx} className="group bg-black/[0.015] border border-black/[0.06] p-4 sm:p-5 rounded-2xl cursor-pointer hover:border-black/[0.10] transition-colors duration-100">
                            <summary className="flex items-center justify-between font-semibold text-[14px] sm:text-[15px] text-black">
                                <span className="pr-4">{faq.q}</span>
                                <span className="w-7 h-7 rounded-full bg-black/[0.04] grid place-items-center flex-shrink-0 group-open:bg-black/[0.08] transition-colors duration-150">
                                    <ChevronDown size={15} className="text-black/50 group-open:rotate-180 transition-transform duration-200" strokeWidth={2.5} />
                                </span>
                            </summary>
                            <div className="prem-faq-answer">
                                <p className="mt-3 text-[13px] sm:text-[14px] text-black/50 leading-relaxed">{faq.a}</p>
                            </div>
                        </details>
                    ))}
                </div>
            </section>

            {!billing_available && (
                <div className="px-4 py-10 text-center border-t border-black/[0.06]">
                    <p className="text-[12px] text-black/25 font-mono">Sistema de pagamentos a ser ativado em breve</p>
                </div>
            )}
        </div>
    );
}
