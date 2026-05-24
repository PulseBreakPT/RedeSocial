import { useMemo, useState, useEffect, useRef } from "react";
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

// Floating particles component
function FloatingParticles() {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(12)].map((_, i) => (
                <div
                    key={i}
                    className="absolute w-1 h-1 bg-white/20 rounded-full"
                    style={{
                        left: `${Math.random() * 100}%`,
                        top: `${Math.random() * 100}%`,
                        animation: `float ${8 + Math.random() * 8}s ease-in-out infinite`,
                        animationDelay: `${Math.random() * 5}s`,
                    }}
                />
            ))}
        </div>
    );
}

function PriceTag({ amount, interval }) {
    return (
        <div className="flex items-baseline gap-2.5 mb-1">
            <span className="font-display text-[52px] lg:text-[58px] tracking-[-0.04em] leading-none text-white tabular-nums shimmer-text">
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
                        style={{
                            animation: `fadeInUp 0.6s ease-out forwards`,
                            animationDelay: `${idx * 0.08}s`,
                            opacity: 0,
                        }}
                    >
                        <span className="relative flex-shrink-0 w-7 h-7 rounded-full bg-white/12 grid place-items-center mt-0.5 group-hover:bg-white/18 group-hover:scale-110 transition-all duration-300">
                            <Icon size={14} className="text-white relative z-10" strokeWidth={2.5} />
                            <span className="absolute inset-0 rounded-full bg-white/0 group-hover:bg-white/20 blur-sm transition-all duration-300" />
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
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
    const cardRef = useRef(null);

    const handleMouseMove = (e) => {
        if (!cardRef.current) return;
        const rect = cardRef.current.getBoundingClientRect();
        setMousePosition({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        });
    };
    
    return (
        <div 
            ref={cardRef}
            className="relative group"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onMouseMove={handleMouseMove}
        >
            {/* Recommended badge com shine effect */}
            {isRecommended && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                    <div className="relative px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-gradient-to-r from-yellow-400 to-orange-400 text-black shadow-lg overflow-hidden">
                        <span className="relative z-10">Recomendado</span>
                        <span className="absolute inset-0 shine-effect" />
                    </div>
                </div>
            )}
            
            {/* Spotlight effect on hover */}
            {isHovered && (
                <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-[28px]"
                    style={{
                        background: `radial-gradient(600px circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(255,255,255,0.1), transparent 40%)`,
                    }}
                />
            )}
            
            <div 
                className="relative overflow-hidden rounded-[28px] p-[2px] transition-all duration-500 ease-out"
                style={{
                    background: gradient,
                    filter: isHovered ? "saturate(1.4) brightness(1.1)" : "saturate(1.05)",
                    transform: isHovered ? "translateY(-8px) scale(1.01)" : "translateY(0) scale(1)",
                    boxShadow: isHovered 
                        ? "0 24px 70px -15px rgba(139, 92, 246, 0.5), 0 12px 35px -10px rgba(236, 72, 153, 0.4), 0 0 0 1px rgba(255,255,255,0.1)"
                        : "0 10px 30px -10px rgba(139, 92, 246, 0.25), 0 0 0 1px rgba(255,255,255,0.05)",
                }}
            >
                {/* Animated gradient overlay */}
                <div className="absolute inset-0 opacity-30 bg-gradient-animated" />
                
                {/* Glass card */}
                <div className="relative bg-gradient-to-br from-white/[0.14] via-white/[0.08] to-white/[0.06] backdrop-blur-2xl rounded-[calc(1.75rem-2px)] p-7 lg:p-9 flex flex-col h-full border border-white/10">
                    {/* Noise texture overlay */}
                    <div className="absolute inset-0 opacity-[0.015] mix-blend-overlay rounded-[calc(1.75rem-2px)] noise-texture" />
                    
                    {/* Header */}
                    <div className="mb-6 relative">
                        <div className="flex items-center gap-2.5 mb-2">
                            <h3 className="font-display text-[30px] lg:text-[34px] tracking-tight text-white leading-none">
                                {name.replace("Lusorae ", "")}
                            </h3>
                            {tier === "aura" && (
                                <Crown size={22} className="text-yellow-300" style={{ 
                                    animation: "glow-pulse 3s ease-in-out infinite",
                                    filter: "drop-shadow(0 0 8px rgba(253, 224, 71, 0.4))"
                                }} />
                            )}
                        </div>
                        <p className="text-[14px] text-white/70 leading-relaxed max-w-[28ch]">
                            {tagline}
                        </p>
                    </div>

                    {/* Pricing */}
                    <div className="mb-4 relative">
                        <PriceTag amount={price} interval={interval} />
                        {interval === "year" && (
                            <p className="text-[12px] text-white/50 font-medium">
                                Equivalente a €{(price / 12).toFixed(2)}/mês
                            </p>
                        )}
                    </div>

                    {/* Divider com shimmer */}
                    <div className="relative h-[1px] mb-6 overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent shimmer-line" />
                    </div>

                    {/* Features */}
                    <FeatureList items={features} />

                    {/* CTA */}
                    <div className="mt-auto pt-8">
                        {current ? (
                            <button 
                                onClick={onManage}
                                className="relative w-full h-[52px] rounded-[16px] bg-white/15 backdrop-blur-sm text-white text-[15px] font-bold hover:bg-white/22 transition-all duration-300 inline-flex items-center justify-center gap-2 border border-white/10 overflow-hidden group/btn"
                            >
                                <span className="relative z-10">O teu plano · Gerir</span>
                                <span className="absolute inset-0 bg-white/5 translate-y-full group-hover/btn:translate-y-0 transition-transform duration-300" />
                            </button>
                        ) : billingAvailable ? (
                            <button 
                                onClick={() => onSubscribe(tier, interval)} 
                                data-testid={`premium-subscribe-${tier}`}
                                className="relative w-full h-[52px] rounded-[16px] bg-white text-black text-[15px] font-bold hover:shadow-2xl active:scale-[0.97] transition-all duration-300 inline-flex items-center justify-center gap-2.5 group/btn overflow-hidden"
                            >
                                <span className="relative z-10 flex items-center gap-2.5">
                                    Escolher {name.replace("Lusorae ", "")} 
                                    <ArrowRight size={18} className="group-hover/btn:translate-x-1 transition-transform duration-300" strokeWidth={2.5} />
                                </span>
                                <span className="absolute inset-0 bg-gradient-to-r from-white via-gray-50 to-white opacity-0 group-hover/btn:opacity-100 transition-opacity duration-300" />
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
    const [isVisible, setIsVisible] = useState(false);
    const cardRef = useRef(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                }
            },
            { threshold: 0.1 }
        );

        if (cardRef.current) {
            observer.observe(cardRef.current);
        }

        return () => observer.disconnect();
    }, []);

    return (
        <div 
            ref={cardRef}
            className={`group relative transition-all duration-700 ${
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
        >
            {/* Glow effect on hover */}
            <div className="absolute -inset-4 bg-gradient-to-br from-violet-500/20 to-pink-500/20 rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <div className="relative card-lux p-6 lg:p-7 hover:shadow-2xl transition-all duration-300 border border-black/[0.06] group-hover:border-violet-200/50 overflow-hidden">
                {/* Animated gradient background */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-50/50 to-pink-50/50 animate-gradient-shift" />
                </div>
                
                <div className="relative z-10">
                    <div 
                        className="w-12 h-12 rounded-2xl mb-5 grid place-items-center group-hover:scale-110 transition-transform duration-300 relative"
                        style={{
                            background: "linear-gradient(135deg, rgba(139, 92, 246, 0.12), rgba(236, 72, 153, 0.12))",
                        }}
                    >
                        <Icon size={22} className="text-violet-600 relative z-10" strokeWidth={2} />
                        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-violet-400/20 to-pink-400/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>
                    <h3 className="font-bold text-[17px] text-black mb-2.5 tracking-tight">
                        {title}
                    </h3>
                    <p className="text-[14px] text-black/65 leading-relaxed">
                        {description}
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function Premium() {
    const { plan, tiers, billing_available, isPlus, isAura, checkout, openPortal } = usePremium();
    const [interval, setInterval] = useState("month");
    const [scrollY, setScrollY] = useState(0);

    // Parallax effect
    useEffect(() => {
        const handleScroll = () => setScrollY(window.scrollY);
        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

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
        <div data-testid="premium-page" className="min-h-screen bg-gradient-to-b from-white via-violet-50/20 to-white overflow-hidden">
            <PageHeader title="Plus & Aura" subtitle="Uma camada mais profunda do teu Lusorae" back />

            {/* Hero Section — com parallax e particles */}
            <div 
                className="relative overflow-hidden"
                style={{
                    background: "linear-gradient(135deg, #8b5cf6 0%, #ec4899 48%, #a855f7 100%)",
                }}
            >
                {/* Animated mesh gradient background */}
                <div className="absolute inset-0 opacity-30">
                    <div 
                        className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-pink-300 rounded-full mix-blend-multiply filter blur-[140px] animate-blob"
                        style={{ transform: `translateY(${scrollY * 0.3}px)` }}
                    />
                    <div 
                        className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-violet-300 rounded-full mix-blend-multiply filter blur-[140px] animate-blob animation-delay-2000"
                        style={{ transform: `translateY(${scrollY * 0.2}px)` }}
                    />
                    <div 
                        className="absolute bottom-0 left-1/3 w-[600px] h-[600px] bg-purple-300 rounded-full mix-blend-multiply filter blur-[140px] animate-blob animation-delay-4000"
                        style={{ transform: `translateY(${scrollY * 0.4}px)` }}
                    />
                </div>

                {/* Floating particles */}
                <FloatingParticles />

                {/* Grid pattern overlay */}
                <div 
                    className="absolute inset-0 opacity-[0.03]"
                    style={{
                        backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
                        backgroundSize: "50px 50px",
                    }}
                />

                {/* Content */}
                <div className="relative px-5 lg:px-8 py-20 lg:py-28 max-w-5xl mx-auto">
                    <div 
                        className="max-w-3xl"
                        style={{ transform: `translateY(${scrollY * 0.15}px)` }}
                    >
                        {/* Overline */}
                        <p className="text-[11px] uppercase tracking-[0.18em] text-white/70 font-mono mb-6 font-semibold fade-in-up">
                            Premium no Lusorae
                        </p>
                        
                        {/* Main headline */}
                        <h1 className="font-display text-[42px] sm:text-[58px] lg:text-[72px] tracking-[-0.03em] leading-[0.95] text-white mb-6 fade-in-up" style={{ animationDelay: "0.1s" }}>
                            Não vendemos atenção,
                            <br />
                            <span className="shimmer-text inline-block">alcance nem algoritmo.</span>
                        </h1>

                        {/* Supporting text */}
                        <p className="text-[17px] lg:text-[19px] text-white/90 leading-relaxed max-w-2xl mb-10 fade-in-up" style={{ animationDelay: "0.2s" }}>
                            O premium do Lusorae aprofunda a tua presença — nunca distorce a dos outros.
                            <span className="block mt-2 text-white/75">
                                Vendemos pertença, identidade, presença e conforto digital.
                            </span>
                        </p>

                        {/* Scroll indicator */}
                        <div className="inline-flex items-center gap-2 text-white/60 text-[13px] font-medium fade-in-up" style={{ 
                            animationDelay: "0.3s",
                            animation: "bounce 2s ease-in-out infinite"
                        }}>
                            <span>Ver planos</span>
                            <ArrowRight size={14} className="rotate-90" />
                        </div>
                    </div>
                </div>

                {/* Bottom fade with glow */}
                <div className="absolute bottom-0 inset-x-0 h-40">
                    <div className="absolute inset-0 bg-gradient-to-t from-white via-white/80 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-t from-violet-50/50 to-transparent" />
                </div>
            </div>

            {/* Pricing Section */}
            <div className="px-5 lg:px-8 py-20 lg:py-28 max-w-6xl mx-auto -mt-20 relative z-10">
                {/* Toggle mensal/anual */}
                <div className="flex justify-center mb-14">
                    <div className="relative inline-flex items-center gap-1.5 p-1.5 rounded-[20px] bg-white border border-black/[0.08] shadow-xl shadow-black/5">
                        {/* Glow effect */}
                        <div className="absolute -inset-1 bg-gradient-to-r from-violet-400/20 to-pink-400/20 rounded-[22px] blur-lg opacity-50" />
                        
                        {["month", "year"].map((i) => (
                            <button 
                                key={i} 
                                onClick={() => setInterval(i)}
                                className={`relative px-7 h-11 rounded-[16px] text-[13.5px] font-bold transition-all duration-300 ${
                                    interval === i 
                                        ? "bg-gradient-to-br from-violet-600 to-pink-600 text-white shadow-lg" 
                                        : "text-black/60 hover:text-black hover:bg-black/[0.03]"
                                }`}
                            >
                                <span className="relative z-10">
                                    {i === "month" ? "Mensal" : "Anual"}
                                    {i === "year" && (
                                        <span className={`ml-2 text-[10.5px] font-black tracking-wide ${
                                            interval === i ? "text-yellow-200" : "text-violet-600"
                                        }`}>
                                            −17%
                                        </span>
                                    )}
                                </span>
                                {interval === i && (
                                    <span className="absolute inset-0 bg-gradient-to-r from-violet-500 to-pink-500 opacity-50 blur-md rounded-[16px]" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Cards grid */}
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

            {/* Values Section */}
            <div className="px-5 lg:px-8 py-20 lg:py-24 max-w-6xl mx-auto relative">
                {/* Background decoration */}
                <div className="absolute inset-0 -z-10">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-gradient-to-r from-violet-200/20 to-pink-200/20 rounded-full blur-3xl" />
                </div>

                <div className="text-center mb-14">
                    <p className="text-[11px] uppercase tracking-[0.18em] text-black/45 font-mono mb-4 font-semibold">
                        Os nossos valores
                    </p>
                    <h2 className="font-display text-[38px] lg:text-[48px] tracking-tight text-black mb-4 leading-tight">
                        Três pilares, uma promessa
                    </h2>
                    <p className="text-[16px] text-black/60 max-w-2xl mx-auto leading-relaxed">
                        Premium é sobre ti, não sobre os outros
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
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

            {/* Manifesto alignment */}
            <div className="px-5 lg:px-8 py-16 max-w-4xl mx-auto">
                <div className="relative overflow-hidden rounded-[32px] p-[2px]">
                    {/* Animated gradient border */}
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-400 via-pink-400 to-violet-400 animate-gradient-rotate" />
                    
                    <div className="relative bg-white rounded-[calc(2rem-2px)] p-8 lg:p-10">
                        <div className="flex items-start gap-4 mb-6">
                            <div className="relative w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-100 to-pink-100 grid place-items-center flex-shrink-0">
                                <Info size={22} className="text-violet-600 relative z-10" strokeWidth={2} />
                                <div className="absolute inset-0 bg-gradient-to-br from-violet-400/30 to-pink-400/30 rounded-2xl blur-xl" />
                            </div>
                            <div>
                                <p className="text-[11px] uppercase tracking-[0.16em] text-black/45 font-mono mb-2 font-semibold">
                                    Alinhado com o manifesto
                                </p>
                                <h2 className="font-display text-[28px] lg:text-[32px] leading-tight tracking-tight text-black">
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
                                    <div className="relative w-6 h-6 rounded-full bg-green-500/10 grid place-items-center flex-shrink-0 mt-0.5 group-hover:bg-green-500/20 transition-colors">
                                        <Check size={14} className="text-green-600 relative z-10" strokeWidth={3} />
                                        <div className="absolute inset-0 rounded-full bg-green-400/0 group-hover:bg-green-400/20 blur-sm transition-all duration-300" />
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

            {/* FAQ */}
            <div className="px-5 lg:px-8 py-20 max-w-3xl mx-auto">
                <div className="text-center mb-12">
                    <h2 className="font-display text-[34px] lg:text-[40px] tracking-tight text-black mb-3">
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
                        <details key={idx} className="group card-lux p-5 hover:shadow-xl transition-all duration-300 cursor-pointer border border-black/[0.06] hover:border-violet-200/50">
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
                <div className="px-5 py-12 text-center border-t border-black/[0.06]">
                    <p className="text-[13px] text-black/40 font-mono">
                        Sistema de pagamentos a ser ativado em breve
                    </p>
                </div>
            )}
        </div>
    );
}
