import { useMemo, useState } from "react";
import { Check, ArrowRight, Sparkles, Heart, Shield, Zap, Star, Crown, Info } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { usePremium } from "../context/PremiumContext";
import { toast } from "sonner";

// Features com hierarquia de importância visual
const PLUS_FEATURES = [
    { icon: Sparkles, text: "Perfil e layouts premium, com assinatura pessoal", highlight: true },
    { icon: Crown, text: "Banner subtil e estilo de perfil refinado", highlight: true },
    { icon: Heart, text: "Presença avançada — com música e estados" },
    { icon: Star, text: "Moods premium e stories maiores, com arquivo" },
    { icon: Zap, text: "Feed calmo: filtros de energia e densidade social" },
    { icon: Shield, text: "Coleções ilimitadas e bookmarks avançados" },
];

const AURA_FEATURES = [
    { icon: Crown, text: "Tudo do Plus, mais profundo", highlight: true },
    { icon: Sparkles, text: "Memória social pessoal e mini-timeline", highlight: true },
    { icon: Heart, text: "Histórico de presença e ritmos sociais" },
    { icon: Star, text: "Atmosfera de perfil — muda com a hora, o mood, a estação" },
    { icon: Zap, text: "Identidade contextual · perfil vivo" },
    { icon: Shield, text: "Insights do teu ritmo social (só para ti)" },
];

function PriceTag({ amount, interval }) {
    return (
        <div className="flex items-baseline gap-2.5 mb-1">
            <span className="font-display text-[52px] lg:text-[58px] tracking-[-0.04em] leading-none text-white tabular-nums">
                €{amount.toFixed(2)}
            </span>
            <div className="flex flex-col justify-end pb-1.5">
                <span className="text-white/60 text-[13px] font-medium leading-none">
                    /{interval === "year" ? "ano" : "mês"}
                </span>
            </div>
        </div>
    );
}

function FeatureList({ items }) {
    return (
        <ul className="space-y-3.5 mt-7">
            {items.map((feature, idx) => {
                const Icon = feature.icon;
                return (
                    <li 
                        key={idx} 
                        className={`flex items-start gap-3.5 text-[14.5px] leading-relaxed group ${
                            feature.highlight ? "text-white" : "text-white/85"
                        }`}
                    >
                        <span className="flex-shrink-0 w-7 h-7 rounded-full bg-white/12 grid place-items-center mt-0.5 group-hover:bg-white/18 group-hover:scale-110 transition-all duration-300">
                            <Icon size={14} className="text-white" strokeWidth={2.5} />
                        </span>
                        <span className={feature.highlight ? "font-medium" : ""}>{feature.text}</span>
                    </li>
                );
            })}
        </ul>
    );
}

function TierCard({ 
    tier, 
    name, 
    tagline, 
    price, 
    interval, 
    features, 
    current, 
    billingAvailable, 
    onSubscribe, 
    onManage, 
    gradient,
    isRecommended
}) {
    const [isHovered, setIsHovered] = useState(false);
    
    return (
        <div 
            className="relative group"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            {/* Recommended badge */}
            {isRecommended && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                    <div className="px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-gradient-to-r from-yellow-400 to-orange-400 text-black shadow-lg">
                        Recomendado
                    </div>
                </div>
            )}
            
            <div 
                className="relative overflow-hidden rounded-[28px] p-[2px] transition-all duration-500 ease-out"
                style={{
                    background: gradient,
                    filter: isHovered ? "saturate(1.35) brightness(1.08)" : "saturate(1.05)",
                    transform: isHovered ? "translateY(-6px)" : "translateY(0)",
                    boxShadow: isHovered 
                        ? "0 20px 60px -15px rgba(139, 92, 246, 0.4), 0 10px 30px -10px rgba(236, 72, 153, 0.3)"
                        : "0 10px 30px -10px rgba(139, 92, 246, 0.2)",
                }}
            >
                {/* Glass card */}
                <div className="relative bg-gradient-to-br from-white/[0.13] to-white/[0.06] backdrop-blur-2xl rounded-[calc(1.75rem-2px)] p-7 lg:p-9 flex flex-col h-full border border-white/10">
                    {/* Header */}
                    <div className="mb-6">
                        <div className="flex items-center gap-2.5 mb-2">
                            <h3 className="font-display text-[30px] lg:text-[34px] tracking-tight text-white leading-none">
                                {name.replace("Lusorae ", "")}
                            </h3>
                            {tier === "aura" && (
                                <Crown size={22} className="text-yellow-300 animate-pulse" style={{ animationDuration: "3s" }} />
                            )}
                        </div>
                        <p className="text-[14px] text-white/70 leading-relaxed max-w-[28ch]">
                            {tagline}
                        </p>
                    </div>

                    {/* Pricing */}
                    <div className="mb-4">
                        <PriceTag amount={price} interval={interval} />
                        {interval === "year" && (
                            <p className="text-[12px] text-white/50 font-medium">
                                Equivalente a €{(price / 12).toFixed(2)}/mês
                            </p>
                        )}
                    </div>

                    {/* Divider */}
                    <div className="h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent mb-6" />

                    {/* Features */}
                    <FeatureList items={features} />

                    {/* CTA */}
                    <div className="mt-auto pt-8">
                        {current ? (
                            <button 
                                onClick={onManage}
                                className="w-full h-[52px] rounded-[16px] bg-white/15 backdrop-blur-sm text-white text-[15px] font-bold hover:bg-white/22 transition-all duration-300 inline-flex items-center justify-center gap-2 border border-white/10"
                            >
                                O teu plano · Gerir
                            </button>
                        ) : billingAvailable ? (
                            <button 
                                onClick={() => onSubscribe(tier, interval)} 
                                data-testid={`premium-subscribe-${tier}`}
                                className="w-full h-[52px] rounded-[16px] bg-white text-black text-[15px] font-bold hover:bg-white/95 hover:shadow-2xl active:scale-[0.97] transition-all duration-300 inline-flex items-center justify-center gap-2.5 group/btn"
                            >
                                Escolher {name.replace("Lusorae ", "")} 
                                <ArrowRight size={18} className="group-hover/btn:translate-x-1 transition-transform duration-300" strokeWidth={2.5} />
                            </button>
                        ) : (
                            <button 
                                disabled
                                className="w-full h-[52px] rounded-[16px] bg-white/8 text-white/35 text-[15px] font-bold cursor-not-allowed border border-white/5"
                            >
                                Brevemente
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function ValueCard({ icon: Icon, title, description }) {
    return (
        <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-pink-500/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative card-lux p-6 lg:p-7 hover:shadow-xl transition-all duration-300 border border-black/[0.06] group-hover:border-violet-200/50">
                <div 
                    className="w-12 h-12 rounded-2xl mb-5 grid place-items-center group-hover:scale-110 transition-transform duration-300"
                    style={{
                        background: "linear-gradient(135deg, rgba(139, 92, 246, 0.12), rgba(236, 72, 153, 0.12))",
                    }}
                >
                    <Icon size={22} className="text-violet-600" strokeWidth={2} />
                </div>
                <h3 className="font-bold text-[17px] text-black mb-2.5 tracking-tight">
                    {title}
                </h3>
                <p className="text-[14px] text-black/65 leading-relaxed">
                    {description}
                </p>
            </div>
        </div>
    );
}

export default function Premium() {
    const { plan, tiers, billing_available, isPlus, isAura, checkout, openPortal } = usePremium();
    const [interval, setInterval] = useState("month");

    const prices = useMemo(() => ({
        plus: tiers?.plus?.[interval] ?? (interval === "year" ? 49.99 : 4.99),
        aura: tiers?.aura?.[interval] ?? (interval === "year" ? 99.99 : 9.99),
    }), [tiers, interval]);

    const subscribe = async (t, i) => {
        try { 
            await checkout(t, i); 
        }
        catch (e) {
            const msg = e?.response?.data?.detail || "Não foi possível iniciar o checkout.";
            toast.error(msg);
        }
    };
    
    const manage = async () => {
        try { 
            await openPortal(); 
        }
        catch { 
            toast.error("Não foi possível abrir a gestão de subscrição."); 
        }
    };

    return (
        <div data-testid="premium-page" className="min-h-screen bg-gradient-to-b from-white to-violet-50/30">
            <PageHeader title="Plus & Aura" subtitle="Uma camada mais profunda do teu Lusorae" back />

            {/* Hero Section — refinado e respirável */}
            <div 
                className="relative overflow-hidden"
                style={{
                    background: "linear-gradient(135deg, #8b5cf6 0%, #ec4899 48%, #a855f7 100%)",
                }}
            >
                {/* Animated blobs */}
                <div className="absolute inset-0 opacity-25">
                    <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-pink-300 rounded-full mix-blend-multiply filter blur-[120px] animate-blob" />
                    <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-violet-300 rounded-full mix-blend-multiply filter blur-[120px] animate-blob animation-delay-2000" />
                    <div className="absolute bottom-0 left-1/3 w-[500px] h-[500px] bg-purple-300 rounded-full mix-blend-multiply filter blur-[120px] animate-blob animation-delay-4000" />
                </div>

                {/* Content */}
                <div className="relative px-5 lg:px-8 py-16 lg:py-24 max-w-5xl mx-auto">
                    <div className="max-w-3xl">
                        {/* Overline */}
                        <p className="text-[11px] uppercase tracking-[0.16em] text-white/70 font-mono mb-6 font-semibold">
                            Premium no Lusorae
                        </p>
                        
                        {/* Main headline — hierarquia perfeita */}
                        <h1 className="font-display text-[42px] sm:text-[56px] lg:text-[68px] tracking-[-0.03em] leading-[0.95] text-white mb-6">
                            Não vendemos atenção,
                            <br />
                            alcance nem algoritmo.
                        </h1>

                        {/* Supporting text — respirável */}
                        <p className="text-[17px] lg:text-[19px] text-white/90 leading-relaxed max-w-2xl mb-10">
                            O premium do Lusorae aprofunda a tua presença — nunca distorce a dos outros.
                            <span className="block mt-2 text-white/75">
                                Vendemos pertença, identidade, presença e conforto digital.
                            </span>
                        </p>

                        {/* Scroll indicator */}
                        <div className="inline-flex items-center gap-2 text-white/60 text-[13px] font-medium animate-bounce" style={{ animationDuration: "2s" }}>
                            <span>Ver planos</span>
                            <ArrowRight size={14} className="rotate-90" />
                        </div>
                    </div>
                </div>

                {/* Bottom fade */}
                <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-white to-transparent" />
            </div>

            {/* Pricing Section — SSS tier grid */}
            <div className="px-5 lg:px-8 py-16 lg:py-24 max-w-6xl mx-auto -mt-16 relative z-10">
                {/* Toggle mensal/anual — refinado */}
                <div className="flex justify-center mb-12">
                    <div className="inline-flex items-center gap-1.5 p-1.5 rounded-[18px] bg-white border border-black/[0.08] shadow-lg shadow-black/5">
                        {["month", "year"].map((i) => (
                            <button 
                                key={i} 
                                onClick={() => setInterval(i)}
                                className={`relative px-7 h-11 rounded-[14px] text-[13.5px] font-bold transition-all duration-300 ${
                                    interval === i 
                                        ? "bg-gradient-to-br from-violet-600 to-pink-600 text-white shadow-md" 
                                        : "text-black/60 hover:text-black hover:bg-black/[0.03]"
                                }`}
                            >
                                {i === "month" ? "Mensal" : "Anual"}
                                {i === "year" && (
                                    <span className={`ml-2 text-[10.5px] font-black tracking-wide ${
                                        interval === i ? "text-yellow-200" : "text-violet-600"
                                    }`}>
                                        −17%
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Cards grid — assimétrico e harmonioso */}
                <div className="grid lg:grid-cols-2 gap-8 lg:gap-10 max-w-[1100px] mx-auto mb-16">
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
                        gradient="linear-gradient(135deg, #8b5cf6, #a855f7)"
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
                        gradient="linear-gradient(135deg, #ec4899, #a855f7, #8b5cf6)"
                        isRecommended={true}
                    />
                </div>

                {plan !== "free" && (
                    <p className="text-[13px] text-black/45 text-center leading-relaxed font-medium">
                        Subscrição ativa · gere pagamentos, faturas e cancelamento no portal seguro
                    </p>
                )}
            </div>

            {/* Values Section — grid 3-col */}
            <div className="px-5 lg:px-8 py-16 lg:py-20 max-w-6xl mx-auto">
                <div className="text-center mb-12">
                    <p className="text-[11px] uppercase tracking-[0.16em] text-black/45 font-mono mb-4 font-semibold">
                        Os nossos valores
                    </p>
                    <h2 className="font-display text-[36px] lg:text-[44px] tracking-tight text-black mb-4 leading-tight">
                        Três pilares, uma promessa
                    </h2>
                    <p className="text-[16px] text-black/60 max-w-2xl mx-auto leading-relaxed">
                        Premium é sobre ti, não sobre os outros
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-6 lg:gap-7">
                    <ValueCard 
                        icon={Heart}
                        title="Pertença Real"
                        description="Comunidade que valoriza autenticidade e profundidade. Premium não te separa dos outros."
                    />
                    <ValueCard 
                        icon={Shield}
                        title="Sem Distrações"
                        description="Controlo total sobre o que vês. Feed calmo, notificações inteligentes, ritmo respeitado."
                    />
                    <ValueCard 
                        icon={Star}
                        title="Identidade Única"
                        description="Ferramentas que se adaptam a ti. Expressa-te de forma autêntica, sem pressão social."
                    />
                </div>
            </div>

            {/* Manifesto alignment — glassmorphism card */}
            <div className="px-5 lg:px-8 py-16 max-w-4xl mx-auto">
                <div className="relative overflow-hidden rounded-[28px] p-[2px] bg-gradient-to-br from-violet-200 to-pink-200">
                    <div className="relative bg-white rounded-[calc(1.75rem-2px)] p-8 lg:p-10">
                        <div className="flex items-start gap-4 mb-6">
                            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-100 to-pink-100 grid place-items-center flex-shrink-0">
                                <Info size={22} className="text-violet-600" strokeWidth={2} />
                            </div>
                            <div>
                                <p className="text-[11px] uppercase tracking-[0.14em] text-black/45 font-mono mb-2 font-semibold">
                                    Alinhado com o manifesto
                                </p>
                                <h2 className="font-display text-[26px] lg:text-[30px] leading-tight tracking-tight text-black">
                                    O que Premium <span className="text-violet-600">não faz</span>
                                </h2>
                            </div>
                        </div>
                        
                        <div className="space-y-4 mb-6">
                            {[
                                "Premium não te dá mais alcance, visibilidade ou prioridade no feed dos outros.",
                                "Premium não muda o algoritmo para te favorecer.",
                                "Premium não remove anúncios — porque não há anúncios no Lusorae.",
                                "Premium não te torna melhor que os outros utilizadores.",
                            ].map((text, idx) => (
                                <div key={idx} className="flex items-start gap-3.5 group">
                                    <div className="w-6 h-6 rounded-full bg-green-500/10 grid place-items-center flex-shrink-0 mt-0.5 group-hover:bg-green-500/20 transition-colors">
                                        <Check size={14} className="text-green-600" strokeWidth={3} />
                                    </div>
                                    <p className="text-[14.5px] text-black/75 leading-relaxed">
                                        <strong className="text-black font-semibold">Premium não</strong> {text.replace("Premium não ", "")}
                                    </p>
                                </div>
                            ))}
                        </div>

                        <div className="pt-6 border-t border-black/[0.06]">
                            <p className="text-[14px] text-black/65 leading-relaxed">
                                Premium é conforto, identidade e ferramentas. Nunca é vantagem social.
                                <strong className="block mt-2 text-black font-semibold">
                                    O tempo que passas aqui é teu. Não nosso.
                                </strong>
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* FAQ — accordion style compacto */}
            <div className="px-5 lg:px-8 py-16 max-w-3xl mx-auto">
                <div className="text-center mb-10">
                    <h2 className="font-display text-[32px] lg:text-[38px] tracking-tight text-black mb-3">
                        Perguntas frequentes
                    </h2>
                    <p className="text-[15px] text-black/60">Tudo o que precisas de saber</p>
                </div>

                <div className="space-y-3">
                    {[
                        { q: "Posso cancelar a qualquer momento?", a: "Sim. Sem compromissos ou taxas de cancelamento. Mantens o acesso até ao fim do período pago." },
                        { q: "O que acontece aos meus dados se cancelar?", a: "Nada. Os teus posts, mensagens e perfil mantêm-se. Só perdes acesso às features premium." },
                        { q: "Há garantia de reembolso?", a: "Sim, 14 dias de garantia total. Se não adorares, devolvemos o teu dinheiro sem perguntas." },
                        { q: "Posso mudar entre Plus e Aura?", a: "Sim, a qualquer momento. O valor é ajustado proporcionalmente no próximo ciclo de faturação." },
                    ].map((faq, idx) => (
                        <details key={idx} className="group card-lux p-5 hover:shadow-lg transition-all duration-300 cursor-pointer">
                            <summary className="flex items-center justify-between font-semibold text-[15px] text-black list-none">
                                <span>{faq.q}</span>
                                <span className="text-violet-600 text-xl group-open:rotate-45 transition-transform duration-300">+</span>
                            </summary>
                            <p className="mt-3 text-[14px] text-black/65 leading-relaxed pl-1">
                                {faq.a}
                            </p>
                        </details>
                    ))}
                </div>
            </div>

            {!billing_available && (
                <div className="px-5 py-10 text-center border-t border-black/[0.06]">
                    <p className="text-[13px] text-black/40 font-mono">
                        Sistema de pagamentos a ser ativado em breve
                    </p>
                </div>
            )}
        </div>
    );
}
