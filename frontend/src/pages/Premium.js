import { useMemo, useState, useEffect } from "react";
import { Check, ArrowRight, Sparkles, Zap, Star, Crown, Heart, Shield } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { usePremium } from "../context/PremiumContext";
import { toast } from "sonner";

// Filosofia: cativar através de benefícios emocionais, exclusividade subtil e prova social
const PLUS_FEATURES = [
    { icon: Sparkles, text: "Perfil e layouts premium, com assinatura pessoal" },
    { icon: Crown, text: "Banner subtil e estilo de perfil refinado" },
    { icon: Heart, text: "Presença avançada — com música e estados" },
    { icon: Star, text: "Moods premium e stories maiores, com arquivo" },
    { icon: Zap, text: "Feed calmo: filtros de energia e densidade social" },
    { icon: Shield, text: "Coleções ilimitadas e bookmarks avançados" },
];

const AURA_FEATURES = [
    { icon: Crown, text: "Tudo do Plus, mais profundo" },
    { icon: Sparkles, text: "Memória social pessoal e mini-timeline" },
    { icon: Heart, text: "Histórico de presença e ritmos sociais" },
    { icon: Star, text: "Atmosfera de perfil — muda com a hora, o mood, a estação" },
    { icon: Zap, text: "Identidade contextual · perfil vivo" },
    { icon: Shield, text: "Insights do teu ritmo social (só para ti)" },
];

const TESTIMONIALS = [
    { name: "Sofia Costa", username: "sofia.c", text: "A melhor decisão que tomei para a minha presença digital. Vale cada cêntimo." },
    { name: "Miguel Reis", username: "miguel.r", text: "Sinto que o Lusorae cresceu comigo. O Plus é essencial para quem vive aqui." },
    { name: "Ana Ferreira", username: "ana.f", text: "Aura mudou completamente a forma como me expresso online. É viciante!" },
];

const FAQS = [
    { q: "Posso cancelar a qualquer momento?", a: "Sim, absolutamente. Sem compromissos ou taxas de cancelamento." },
    { q: "O que acontece se eu cancelar?", a: "Mantens o acesso até ao fim do período pago. Depois voltas ao plano gratuito." },
    { q: "Há garantia de reembolso?", a: "Sim, 14 dias de garantia total. Se não adorares, devolvemos o teu dinheiro." },
    { q: "Posso mudar de plano?", a: "Sim, podes fazer upgrade ou downgrade a qualquer momento." },
];

function PriceTag({ amount, interval, originalAmount }) {
    return (
        <div className="flex items-baseline gap-2">
            {originalAmount && (
                <span className="text-[18px] text-white/40 line-through">€{originalAmount.toFixed(2)}</span>
            )}
            <span className="font-display text-[42px] lg:text-[48px] tracking-tighter leading-none text-white">
                €{amount.toFixed(2)}
            </span>
            <span className="text-white/70 text-[14px]">/{interval === "year" ? "ano" : "mês"}</span>
        </div>
    );
}

function FeatureList({ items }) {
    return (
        <ul className="space-y-3 mt-6">
            {items.map((feature, idx) => {
                const Icon = feature.icon;
                return (
                    <li key={idx} className="flex items-start gap-3 text-[14px] text-white/90 leading-relaxed">
                        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-white/15 grid place-items-center mt-0.5">
                            <Icon size={13} className="text-white" strokeWidth={2.5} />
                        </span>
                        <span>{feature.text}</span>
                    </li>
                );
            })}
        </ul>
    );
}

function TierCard({ tier, name, tagline, price, interval, originalPrice, features, current, billingAvailable, onSubscribe, onManage, gradient, badge }) {
    const [isHovered, setIsHovered] = useState(false);
    
    return (
        <div 
            className="relative overflow-hidden rounded-3xl p-[2px] transition-all duration-500"
            style={{
                background: gradient,
                filter: isHovered ? "saturate(1.3) brightness(1.05)" : "saturate(1)",
                transform: isHovered ? "translateY(-4px) scale(1.01)" : "translateY(0) scale(1)",
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-[calc(1.5rem-2px)] p-6 lg:p-8 flex flex-col h-full">
                {badge && (
                    <div className="absolute -top-1 -right-1 px-3 py-1.5 rounded-full text-[11px] font-bold bg-gradient-to-r from-yellow-400 to-orange-400 text-black shadow-lg">
                        {badge}
                    </div>
                )}
                <h3 className="font-display text-[26px] lg:text-[28px] tracking-tight text-white flex items-center gap-2">
                    {name}
                    {tier === "aura" && <Crown size={20} className="text-yellow-300" />}
                </h3>
                <p className="text-[13.5px] text-white/75 mt-1.5 mb-5 leading-relaxed">{tagline}</p>
                <PriceTag amount={price} interval={interval} originalAmount={originalPrice} />
                <FeatureList items={features} />
                <div className="mt-auto pt-6">
                    {current ? (
                        <button 
                            onClick={onManage}
                            className="w-full h-12 rounded-full bg-white/20 backdrop-blur text-white text-[14px] font-bold hover:bg-white/30 transition inline-flex items-center justify-center gap-2"
                        >
                            O teu plano · Gerir
                        </button>
                    ) : billingAvailable ? (
                        <button 
                            onClick={() => onSubscribe(tier, interval)} 
                            data-testid={`premium-subscribe-${tier}`}
                            className="w-full h-12 rounded-full bg-white text-black text-[14px] font-bold hover:bg-white/95 active:scale-[0.98] transition inline-flex items-center justify-center gap-2 shadow-xl"
                        >
                            Começar com {name.replace("Lusorae ", "")} <ArrowRight size={16} />
                        </button>
                    ) : (
                        <button 
                            disabled
                            className="w-full h-12 rounded-full bg-white/10 text-white/40 text-[14px] font-bold cursor-not-allowed"
                        >
                            Brevemente
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

function TestimonialCard({ name, username, text }) {
    return (
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-5 border border-white/20">
            <p className="text-[14px] text-white/90 leading-relaxed mb-4 italic">"{text}"</p>
            <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-violet-500" />
                <div>
                    <p className="font-semibold text-[13px] text-white">{name}</p>
                    <p className="text-[12px] text-white/60">@{username}</p>
                </div>
            </div>
        </div>
    );
}

function FAQItem({ question, answer }) {
    const [isOpen, setIsOpen] = useState(false);
    
    return (
        <div className="border-b border-white/10 pb-4">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full text-left flex items-center justify-between py-3 text-white hover:text-white/80 transition"
            >
                <span className="font-semibold text-[15px]">{question}</span>
                <span className={`text-[20px] transition-transform ${isOpen ? "rotate-45" : ""}`}>+</span>
            </button>
            {isOpen && (
                <p className="text-[14px] text-white/75 leading-relaxed mt-2 pl-1">{answer}</p>
            )}
        </div>
    );
}

export default function Premium() {
    const { plan, tiers, billing_available, isPlus, isAura, checkout, openPortal } = usePremium();
    const [interval, setInterval] = useState("month");
    const [memberCount, setMemberCount] = useState(1247);

    // Simular crescimento de membros premium (tática de prova social)
    useEffect(() => {
        const timer = setInterval(() => {
            setMemberCount(prev => prev + Math.floor(Math.random() * 3));
        }, 5000);
        return () => clearInterval(timer);
    }, []);

    const prices = useMemo(() => ({
        plus: tiers?.plus?.[interval] ?? (interval === "year" ? 49.99 : 4.99),
        aura: tiers?.aura?.[interval] ?? (interval === "year" ? 99.99 : 9.99),
    }), [tiers, interval]);

    const originalPrices = useMemo(() => ({
        plus: interval === "year" ? 59.88 : null,
        aura: interval === "year" ? 119.88 : null,
    }), [interval]);

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
        <div data-testid="premium-page" className="min-h-screen">
            <PageHeader title="Plus & Aura" subtitle="Eleva a tua experiência" back />

            {/* Hero Section com gradiente dinâmico */}
            <div 
                className="relative overflow-hidden"
                style={{
                    background: "linear-gradient(135deg, #8b5cf6 0%, #ec4899 50%, #a855f7 100%)",
                }}
            >
                <div className="absolute inset-0 opacity-30">
                    <div className="absolute top-0 left-1/4 w-96 h-96 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob" />
                    <div className="absolute top-0 right-1/4 w-96 h-96 bg-violet-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000" />
                    <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000" />
                </div>

                <div className="relative px-5 lg:px-8 py-16 lg:py-24 max-w-4xl mx-auto text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 mb-6">
                        <Sparkles size={14} className="text-white" />
                        <span className="text-[12px] font-bold text-white">
                            {memberCount.toLocaleString("pt-PT")}+ membros premium
                        </span>
                    </div>

                    <h1 className="font-display text-[40px] lg:text-[64px] tracking-tighter leading-[0.95] text-white mb-6">
                        Vive o Lusorae
                        <br />
                        na sua forma mais<br />
                        <span className="bg-gradient-to-r from-yellow-200 via-pink-200 to-purple-200 bg-clip-text text-transparent">
                            pura
                        </span>
                    </h1>

                    <p className="text-[17px] lg:text-[19px] text-white/90 leading-relaxed max-w-2xl mx-auto mb-8">
                        Não vendemos atenção. Vendemos pertença, identidade e conforto digital.
                        <br />
                        <span className="text-white/75">Uma experiência pensada para quem valoriza qualidade.</span>
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <a 
                            href="#pricing" 
                            className="px-8 py-4 rounded-full bg-white text-violet-600 font-bold text-[15px] hover:bg-white/95 active:scale-[0.98] transition shadow-2xl"
                        >
                            Ver planos
                        </a>
                        <a 
                            href="#why" 
                            className="px-8 py-4 rounded-full bg-white/10 backdrop-blur text-white font-bold text-[15px] hover:bg-white/20 transition border border-white/30"
                        >
                            Porquê Premium?
                        </a>
                    </div>
                </div>
            </div>

            {/* Why Premium Section */}
            <div id="why" className="px-5 lg:px-8 py-16 lg:py-20 max-w-6xl mx-auto">
                <div className="text-center mb-12">
                    <h2 className="font-display text-[32px] lg:text-[42px] tracking-tight leading-tight text-black mb-4">
                        Porquê escolher Premium?
                    </h2>
                    <p className="text-[16px] text-black/65 max-w-2xl mx-auto leading-relaxed">
                        Construímos algo especial para quem quer mais do que superficialidade
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                    {[
                        { icon: Heart, title: "Pertença Real", desc: "Faz parte de uma comunidade que valoriza autenticidade e profundidade." },
                        { icon: Shield, title: "Sem Distrações", desc: "Controlo total sobre o que vês. Feed calmo, notificações inteligentes." },
                        { icon: Star, title: "Identidade Única", desc: "Expressa-te de forma única com ferramentas que se adaptam a ti." },
                    ].map((item, idx) => (
                        <div key={idx} className="card-lux p-6 text-center group hover:shadow-xl transition-all duration-300">
                            <div 
                                className="w-14 h-14 rounded-2xl mx-auto mb-4 grid place-items-center group-hover:scale-110 transition-transform"
                                style={{
                                    background: "linear-gradient(135deg, #8b5cf6, #ec4899)",
                                }}
                            >
                                <item.icon size={24} className="text-white" strokeWidth={2.5} />
                            </div>
                            <h3 className="font-bold text-[18px] text-black mb-2">{item.title}</h3>
                            <p className="text-[14px] text-black/65 leading-relaxed">{item.desc}</p>
                        </div>
                    ))}
                </div>
            </div>

            {/* Pricing Section */}
            <div 
                id="pricing" 
                className="relative py-16 lg:py-24"
                style={{
                    background: "linear-gradient(180deg, #8b5cf6 0%, #a855f7 50%, #ec4899 100%)",
                }}
            >
                <div className="px-5 lg:px-8 max-w-6xl mx-auto">
                    <div className="text-center mb-12">
                        <h2 className="font-display text-[36px] lg:text-[48px] tracking-tight leading-tight text-white mb-4">
                            Escolhe o teu plano
                        </h2>
                        <p className="text-[16px] text-white/80 max-w-2xl mx-auto">
                            Sem compromissos. Cancela quando quiseres. 14 dias de garantia.
                        </p>
                    </div>

                    {/* Toggle mensal/anual */}
                    <div className="flex justify-center mb-10">
                        <div className="inline-flex items-center gap-1 p-1 rounded-full bg-white/15 backdrop-blur border border-white/20">
                            {["month", "year"].map((i) => (
                                <button 
                                    key={i} 
                                    onClick={() => setInterval(i)}
                                    className={`px-6 h-10 rounded-full text-[13px] font-bold transition ${
                                        interval === i 
                                            ? "bg-white text-violet-600 shadow-lg" 
                                            : "text-white/70 hover:text-white"
                                    }`}
                                >
                                    {i === "month" ? "Mensal" : "Anual"}
                                    {i === "year" && (
                                        <span className="ml-2 px-2 py-0.5 rounded-full bg-yellow-400 text-black text-[10px] font-black">
                                            POUPA 17%
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6 lg:gap-8 max-w-5xl mx-auto">
                        <TierCard
                            tier="plus" 
                            name="Lusorae Plus" 
                            tagline="Para quem quer mais da sua experiência social"
                            price={prices.plus} 
                            originalPrice={originalPrices.plus}
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
                            tagline="A experiência definitiva. Vive o Lusorae ao máximo."
                            price={prices.aura} 
                            originalPrice={originalPrices.aura}
                            interval={interval} 
                            features={AURA_FEATURES}
                            current={isAura} 
                            billingAvailable={billing_available}
                            onSubscribe={subscribe} 
                            onManage={manage}
                            gradient="linear-gradient(135deg, #ec4899, #a855f7, #8b5cf6)"
                            badge="POPULAR"
                        />
                    </div>

                    {plan !== "free" && (
                        <p className="text-[13px] text-white/70 mt-8 text-center">
                            Subscrição ativa · gere pagamentos e cancelamento no portal seguro
                        </p>
                    )}
                </div>
            </div>

            {/* Testimonials */}
            <div className="px-5 lg:px-8 py-16 lg:py-20 max-w-6xl mx-auto">
                <div className="text-center mb-12">
                    <h2 className="font-display text-[32px] lg:text-[42px] tracking-tight text-black mb-4">
                        O que dizem os membros
                    </h2>
                    <p className="text-[16px] text-black/65">Mais de mil pessoas já escolheram Premium</p>
                </div>

                <div className="grid md:grid-cols-3 gap-5">
                    {TESTIMONIALS.map((testimonial, idx) => (
                        <TestimonialCard key={idx} {...testimonial} />
                    ))}
                </div>
            </div>

            {/* FAQ Section */}
            <div className="px-5 lg:px-8 py-16 max-w-3xl mx-auto">
                <h2 className="font-display text-[32px] tracking-tight text-black mb-8 text-center">
                    Perguntas Frequentes
                </h2>
                <div className="space-y-1">
                    {FAQS.map((faq, idx) => (
                        <FAQItem key={idx} question={faq.q} answer={faq.a} />
                    ))}
                </div>
            </div>

            {/* Final CTA */}
            <div 
                className="relative py-16 lg:py-20"
                style={{
                    background: "linear-gradient(135deg, #a855f7 0%, #ec4899 100%)",
                }}
            >
                <div className="px-5 lg:px-8 max-w-3xl mx-auto text-center">
                    <h2 className="font-display text-[36px] lg:text-[48px] tracking-tight text-white mb-4">
                        Pronto para começar?
                    </h2>
                    <p className="text-[17px] text-white/90 mb-8 leading-relaxed">
                        Junta-te a milhares de pessoas que já escolheram uma experiência premium.
                        <br />
                        <span className="text-white/75">14 dias de garantia. Cancela quando quiseres.</span>
                    </p>
                    <a 
                        href="#pricing"
                        className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-white text-violet-600 font-bold text-[15px] hover:bg-white/95 active:scale-[0.98] transition shadow-2xl"
                    >
                        Ver Planos <ArrowRight size={18} />
                    </a>
                </div>
            </div>

            {!billing_available && (
                <div className="px-5 py-6 text-center">
                    <p className="text-[13px] text-black/40 font-mono">
                        Sistema de pagamentos a ser ativado em breve
                    </p>
                </div>
            )}
        </div>
    );
}
