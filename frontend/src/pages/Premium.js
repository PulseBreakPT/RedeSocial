import { useMemo, useState, useRef, useCallback } from "react";
import {
    Check, ArrowRight, Sparkles, Heart, Shield, Zap, Star, Crown, Info,
    Palette, Music, Eye, BookOpen, MessageCircle, TrendingUp, Lock,
    Users, Image, Bookmark, Layers, SunMoon, Globe, ChevronDown, Minus
} from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { usePremium } from "../context/PremiumContext";
import { toast } from "sonner";

/* ─── Data ─── */
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

/* ═══ Components ═══ */

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

function TierCard({
    tier, name, subtitle, tagline, price, interval, features, current,
    billingAvailable, onSubscribe, onManage, bg, borderGrad, priceColor,
    orbGrad, isRecommended, scale
}) {
    const ref = useRef(null);
    const onMove = useCallback((e) => {
        if (!ref.current) return;
        const r = ref.current.getBoundingClientRect();
        ref.current.style.setProperty("--mx", `${e.clientX - r.left}px`);
        ref.current.style.setProperty("--my", `${e.clientY - r.top}px`);
    }, []);

    return (
        <div ref={ref} className={`relative group ${scale || ""}`} onMouseMove={onMove} style={{ "--mx": "50%", "--my": "50%" }}>
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
                <div className="absolute inset-0 rounded-[32px] opacity-0 group-hover:opacity-100 transition-opacity duration-250 pointer-events-none z-10"
                     style={{ background: "radial-gradient(400px circle at var(--mx) var(--my), rgba(255,255,255,0.12), transparent 50%)" }} />

                <div className="relative rounded-[calc(2rem-1.5px)] p-6 sm:p-7 lg:p-8 flex flex-col h-full border border-white/[0.08]"
                     style={{ background: bg }}>
                    <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full pointer-events-none" style={{ background: orbGrad }} />

                    {/* Name — H3, largest in card */}
                    <div className="mb-5 relative">
                        <div className="flex items-center gap-2.5 mb-1">
                            <h3 className="font-display text-[28px] sm:text-[32px] lg:text-[36px] tracking-tight text-white leading-none font-bold">
                                {name}
                            </h3>
                            {tier === "aura" && <Crown size={22} className="text-yellow-300" style={{ filter: "drop-shadow(0 0 4px rgba(253,224,71,0.4))" }} />}
                        </div>
                        <p className="text-[11px] uppercase tracking-[0.14em] text-white/35 font-mono font-semibold mb-2.5">{subtitle}</p>
                        <p className="text-[14px] text-white/55 leading-relaxed max-w-[34ch]">{tagline}</p>
                    </div>

                    {/* Price — dominant anchor */}
                    <div className="mb-4">
                        <div className="flex items-baseline gap-2 mb-1">
                            <span className={`font-display text-[48px] sm:text-[54px] lg:text-[60px] tracking-[-0.04em] leading-none tabular-nums ${priceColor}`}>
                                &euro;{price.toFixed(2)}
                            </span>
                            <span className="text-white/40 text-[13px] font-medium pb-1">
                                /{interval === "year" ? "ano" : "mês"}
                            </span>
                        </div>
                        {interval === "year" && (
                            <p className="text-[11.5px] text-white/35 font-medium">Equivalente a &euro;{(price / 12).toFixed(2)}/mês &middot; Poupas 17%</p>
                        )}
                    </div>

                    {/* Divider */}
                    <div className="relative h-px mb-5 overflow-hidden">
                        <div className="absolute inset-0" style={{ background: borderGrad, opacity: 0.35 }} />
                        <div className="absolute inset-0 shimmer-line" style={{ background: "linear-gradient(90deg, transparent 30%, rgba(255,255,255,0.5) 50%, transparent 70%)" }} />
                    </div>

                    <FeatureList items={features} />

                    {/* CTA */}
                    <div className="mt-auto pt-7">
                        {current ? (
                            <button onClick={onManage} className="w-full h-12 rounded-2xl bg-white/12 text-white text-[14px] font-bold hover:bg-white/18 transition-colors duration-150 border border-white/10 inline-flex items-center justify-center gap-2">
                                O teu plano &middot; Gerir
                            </button>
                        ) : billingAvailable ? (
                            <button onClick={() => onSubscribe(tier, interval)} data-testid={`premium-subscribe-${tier}`}
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

function CCell({ ok, hl }) {
    return (
        <td className={`text-center py-3 ${hl ? "bg-violet-50/40" : ""}`}>
            {ok ? (
                <span className="inline-flex w-5 h-5 rounded-full bg-green-500/10 items-center justify-center"><Check size={12} className="text-green-600" strokeWidth={3} /></span>
            ) : (
                <span className="inline-flex w-5 h-5 rounded-full bg-black/[0.04] items-center justify-center"><Minus size={10} className="text-black/20" strokeWidth={2.5} /></span>
            )}
        </td>
    );
}

/* ═══════════════════════════════════════════════════
   HIERARQUIA VISUAL
   ─────────────────
   Nível 1 — PLANOS (herói): maior título, mais espaço, âncora visual
   Nível 2 — COMPARAÇÃO: peso médio, suporta a decisão
   Nível 3 — PRINCÍPIOS: contexto emocional, peso menor
   Nível 4 — TRANSPARÊNCIA: confiança, formato card
   Nível 5 — FAQ: utilitário, comprimido, mínimo peso visual
   ═══════════════════════════════════════════════════ */
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

            {/* ──────────────────────────────────────────
                NÍVEL 1 — PLANOS (herói visual da página)
                Título 48-64px, espaço generoso, cards dominantes
                ────────────────────────────────────────── */}
            <section className="px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-20 sm:pb-28 max-w-6xl mx-auto">
                <div className="max-w-2xl mx-auto text-center mb-10 sm:mb-14">
                    <h1 className="font-display text-[36px] sm:text-[48px] lg:text-[60px] tracking-[-0.025em] text-black leading-[1.05] mb-4">
                        Escolhe o plano
                        <br className="hidden sm:block" />
                        <span className="sm:block">certo para ti</span>
                    </h1>
                    <p className="text-[15px] sm:text-[17px] text-black/45 leading-relaxed max-w-lg mx-auto">
                        Sem anúncios. Sem algoritmos manipulados. Apenas ferramentas que aprofundam a tua presença — ao teu ritmo.
                    </p>
                </div>

                {/* Toggle */}
                <div className="flex justify-center mb-10 sm:mb-14">
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

                {/* Cards com hierarquia: Aura visualmente dominante */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-7 lg:gap-8 max-w-[1080px] mx-auto items-start">
                    <TierCard tier="plus" name="Plus" subtitle="Presença elevada"
                        tagline="Para quem quer personalizar a sua experiência. Mais expressão, mais controlo, mais conforto no dia-a-dia."
                        price={prices.plus} interval={interval} features={PLUS_FEATURES}
                        current={isPlus} billingAvailable={billing_available}
                        onSubscribe={subscribe} onManage={manage}
                        bg="linear-gradient(160deg, #1e1b4b 0%, #312e81 30%, #1e3a5f 60%, #0f172a 100%)"
                        borderGrad="linear-gradient(135deg, #6366f1, #3b82f6, #06b6d4, #6366f1)"
                        priceColor="text-cyan-300"
                        orbGrad="radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)"
                    />
                    <TierCard tier="aura" name="Aura" subtitle="A experiência definitiva"
                        tagline="Tudo do Plus, mais uma camada de profundidade. O teu perfil ganha vida — adapta-se a ti, à hora e ao momento."
                        price={prices.aura} interval={interval} features={AURA_FEATURES}
                        current={isAura} billingAvailable={billing_available}
                        onSubscribe={subscribe} onManage={manage}
                        bg="linear-gradient(160deg, #4a1942 0%, #831843 30%, #7c2d12 60%, #451a03 100%)"
                        borderGrad="linear-gradient(135deg, #f43f5e, #ec4899, #f59e0b, #eab308, #f43f5e)"
                        priceColor="text-amber-300"
                        orbGrad="radial-gradient(circle, rgba(244,63,94,0.12) 0%, transparent 70%)"
                        isRecommended
                        scale="lg:-mt-4"
                    />
                </div>

                {plan !== "free" && (
                    <p className="text-[12px] text-black/35 text-center mt-8 font-medium">
                        Subscrição ativa &middot; gere pagamentos, faturas e cancelamento no portal seguro
                    </p>
                )}
            </section>

            {/* ──────────────────────────────────────────
                NÍVEL 2 — COMPARAÇÃO (suporta a decisão)
                Título 34-42px, fundo alternado cinza claro
                ────────────────────────────────────────── */}
            <section className="bg-black/[0.018]">
                <div className="px-4 sm:px-6 lg:px-8 py-16 sm:py-20 max-w-4xl mx-auto">
                    <div className="mb-8 sm:mb-10">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-black/30 font-mono font-semibold mb-3">
                            02 &mdash; Comparação
                        </p>
                        <h2 className="font-display text-[28px] sm:text-[36px] lg:text-[42px] tracking-tight text-black leading-tight mb-3">
                            Tudo lado a lado, sem letras pequenas
                        </h2>
                        <p className="text-[14px] sm:text-[15px] text-black/40 max-w-xl leading-relaxed">
                            O plano grátis já inclui o essencial — posts, mensagens e privacidade total. O premium acrescenta profundidade à tua presença.
                        </p>
                    </div>

                    <div className="overflow-x-auto -mx-4 sm:mx-0">
                        <div className="min-w-[540px] sm:min-w-0 px-4 sm:px-0">
                            <div className="rounded-2xl border border-black/[0.06] bg-white overflow-hidden shadow-sm">
                                <table className="w-full text-[13px] sm:text-[14px]">
                                    <thead>
                                        <tr className="bg-black/[0.025]">
                                            <th className="text-left py-3.5 px-4 sm:px-5 font-semibold text-black/55 w-[50%]">Funcionalidade</th>
                                            <th className="text-center py-3.5 px-2 font-semibold text-black/30 w-[16%]">Grátis</th>
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
                                                            <Icon size={14} className="text-black/20 flex-shrink-0 hidden sm:block" strokeWidth={2} />
                                                            <span className="text-black/60">{r.label}</span>
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
                </div>
            </section>

            {/* ──────────────────────────────────────────
                NÍVEL 3 — PRINCÍPIOS (contexto emocional)
                Título 28-36px, 3 cards, peso menor
                ────────────────────────────────────────── */}
            <section className="px-4 sm:px-6 lg:px-8 py-14 sm:py-18 max-w-5xl mx-auto">
                <div className="mb-8 sm:mb-10">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-black/25 font-mono font-semibold mb-3">
                        03 &mdash; Princípios
                    </p>
                    <h2 className="font-display text-[24px] sm:text-[30px] lg:text-[36px] tracking-tight text-black leading-tight mb-2">
                        O que torna este premium diferente
                    </h2>
                    <p className="text-[13.5px] sm:text-[14.5px] text-black/40 max-w-lg leading-relaxed">
                        Não vendemos atenção, alcance ou prioridade. O premium existe para te dar mais conforto — nunca mais poder.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
                    {[
                        { icon: Heart,  title: "Pertença Real",    desc: "O premium não cria uma classe à parte. A comunidade é uma só. As ferramentas premium aprofundam a tua experiência sem afetar a dos outros.", g: "from-indigo-50/80 to-cyan-50/80", ic: "text-indigo-600" },
                        { icon: Shield, title: "Sem Distrações",   desc: "Controlo total sobre o que vês e quando. Feed calmo, notificações inteligentes, modo noturno por defeito. O teu ritmo é respeitado.", g: "from-violet-50/80 to-fuchsia-50/80", ic: "text-violet-600" },
                        { icon: Star,   title: "Identidade Única", desc: "Ferramentas de expressão que se adaptam a ti — não te forçam a competir. Moods, atmosferas e presença autêntica, sem pressão social.", g: "from-amber-50/80 to-orange-50/80", ic: "text-amber-600" },
                    ].map((item, idx) => {
                        const Icon = item.icon;
                        return (
                            <div key={idx} className={`group rounded-2xl p-5 bg-gradient-to-br ${item.g} border border-black/[0.04] hover:shadow-md transition-shadow duration-200 h-full`}>
                                <div className="w-9 h-9 rounded-lg bg-white/80 grid place-items-center mb-3.5 shadow-sm">
                                    <Icon size={16} className={item.ic} strokeWidth={2} />
                                </div>
                                <h3 className="font-bold text-[14.5px] sm:text-[15px] text-black mb-1.5 tracking-tight">{item.title}</h3>
                                <p className="text-[12.5px] sm:text-[13px] text-black/50 leading-relaxed">{item.desc}</p>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* ──────────────────────────────────────────
                NÍVEL 4 — TRANSPARÊNCIA (confiança)
                Título 22-28px, formato card contido
                ────────────────────────────────────────── */}
            <section className="bg-black/[0.018]">
                <div className="px-4 sm:px-6 lg:px-8 py-12 sm:py-16 max-w-3xl mx-auto">
                    <div className="relative overflow-hidden rounded-2xl p-[1.5px]"
                         style={{ background: "linear-gradient(135deg, #4f46e5, #06b6d4, #f43f5e, #f59e0b, #4f46e5)", backgroundSize: "300% 300%", animation: "premGradientFlow 10s ease infinite" }}>
                        <div className="relative bg-white rounded-[calc(1rem-1px)] p-5 sm:p-7">
                            <div className="flex items-start gap-3 mb-4">
                                <div className="w-9 h-9 rounded-lg grid place-items-center flex-shrink-0"
                                     style={{ background: "linear-gradient(135deg, rgba(79,70,229,0.08), rgba(244,63,94,0.08))" }}>
                                    <Info size={16} className="text-indigo-600" strokeWidth={2} />
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase tracking-[0.16em] text-black/30 font-mono mb-0.5 font-semibold">04 &mdash; Transparência</p>
                                    <h2 className="font-display text-[20px] sm:text-[24px] lg:text-[28px] leading-tight tracking-tight text-black">
                                        O que o premium <span className="underline decoration-2 decoration-red-400/40 underline-offset-4">não faz</span>
                                    </h2>
                                </div>
                            </div>

                            <p className="text-[13px] text-black/40 leading-relaxed mb-4 max-w-xl">
                                Dizemos-te exactamente o que o premium nunca vai fazer — para que saibas exactamente o que estás a pagar.
                            </p>

                            <div className="space-y-2.5 mb-4">
                                {[
                                    { bold: "Sem alcance extra", rest: " — não te dá mais visibilidade, prioridade no feed ou destaque nas tendências." },
                                    { bold: "Sem algoritmo diferente", rest: " — o teu conteúdo é tratado exactamente como o de qualquer outro utilizador." },
                                    { bold: "Sem remoção de anúncios", rest: " — porque o Lusorae não tem anúncios. Ponto." },
                                    { bold: "Sem hierarquia social", rest: " — não te torna melhor, mais importante ou mais visível que os outros." },
                                ].map((t, i) => (
                                    <div key={i} className="flex items-start gap-2">
                                        <div className="w-4.5 h-4.5 rounded-full bg-green-500/10 grid place-items-center flex-shrink-0 mt-0.5">
                                            <Check size={10} className="text-green-600" strokeWidth={3} />
                                        </div>
                                        <p className="text-[13px] text-black/60 leading-relaxed">
                                            <strong className="text-black/80 font-semibold">{t.bold}</strong>{t.rest}
                                        </p>
                                    </div>
                                ))}
                            </div>

                            <div className="h-px mb-3" style={{ background: "linear-gradient(90deg, transparent, rgba(0,0,0,0.05), transparent)" }} />
                            <p className="text-[12px] text-black/40 leading-relaxed">
                                O premium é conforto, identidade e ferramentas. Nunca é vantagem social.
                                <strong className="block mt-1 text-black/70 font-semibold text-[13px]">O tempo que passas aqui é teu. Não nosso.</strong>
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ──────────────────────────────────────────
                NÍVEL 5 — FAQ (utilitário, comprimido)
                Título 22-26px, peso visual mínimo
                ────────────────────────────────────────── */}
            <section className="px-4 sm:px-6 lg:px-8 py-10 sm:py-14 max-w-2xl mx-auto prem-faq">
                <div className="mb-6 sm:mb-8">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-black/25 font-mono font-semibold mb-2">
                        05 &mdash; Dúvidas
                    </p>
                    <h2 className="font-display text-[20px] sm:text-[24px] lg:text-[26px] tracking-tight text-black mb-1">
                        Perguntas frequentes
                    </h2>
                    <p className="text-[12.5px] sm:text-[13px] text-black/35 leading-relaxed">
                        Respostas directas, sem rodeios.
                    </p>
                </div>

                <div className="space-y-2">
                    {[
                        { q: "Posso cancelar a qualquer momento?", a: "Sim. Sem compromissos, sem taxas, sem perguntas. Manténs o acesso até ao fim do período que já pagaste." },
                        { q: "O que acontece aos meus dados se cancelar?", a: "Absolutamente nada. Os teus posts, mensagens, perfil e coleções ficam exactamente como estão. Só perdes acesso às funcionalidades premium." },
                        { q: "Há garantia de reembolso?", a: "Sim. Tens 14 dias de garantia total. Se não adorares a experiência, devolvemos o teu dinheiro sem perguntas." },
                        { q: "Posso mudar entre Plus e Aura?", a: "Sim, a qualquer momento. O valor é ajustado proporcionalmente no próximo ciclo de faturação — sem custos escondidos." },
                        { q: "O premium dá-me mais visibilidade no feed?", a: "Não. O feed, o algoritmo e as tendências tratam todos os utilizadores de forma exactamente igual. O premium melhora a tua experiência pessoal — nunca manipula a dos outros." },
                        { q: "Porque é que não há anúncios?", a: "Porque o nosso modelo de negócio é o premium. Quem paga é quem usa — não anunciantes. Isto significa que nunca precisamos de te manter 'preso' para vender a tua atenção." },
                    ].map((faq, idx) => (
                        <details key={idx} className="group bg-white border border-black/[0.05] p-3.5 sm:p-4 rounded-xl cursor-pointer hover:border-black/[0.10] transition-colors duration-100">
                            <summary className="flex items-center justify-between font-semibold text-[13px] sm:text-[14px] text-black/80">
                                <span className="pr-3">{faq.q}</span>
                                <span className="w-6 h-6 rounded-full bg-black/[0.03] grid place-items-center flex-shrink-0 group-open:bg-black/[0.06] transition-colors duration-150">
                                    <ChevronDown size={13} className="text-black/40 group-open:rotate-180 transition-transform duration-200" strokeWidth={2.5} />
                                </span>
                            </summary>
                            <div className="prem-faq-answer">
                                <p className="mt-2.5 text-[12.5px] sm:text-[13px] text-black/45 leading-relaxed">{faq.a}</p>
                            </div>
                        </details>
                    ))}
                </div>
            </section>

            {!billing_available && (
                <div className="px-4 py-8 text-center border-t border-black/[0.04]">
                    <p className="text-[11px] text-black/20 font-mono">Sistema de pagamentos a ser ativado em breve</p>
                </div>
            )}
        </div>
    );
}
