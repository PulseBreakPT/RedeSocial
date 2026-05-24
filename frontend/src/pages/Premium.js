import { useMemo, useState } from "react";
import { Check, ArrowRight, Sparkles, Heart, Shield, Zap, Star, Crown } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { usePremium } from "../context/PremiumContext";
import { toast } from "sonner";

// Cópia honesta: vendemos conforto e identidade, nunca alcance
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

function PriceTag({ amount, interval }) {
    return (
        <div className="flex items-baseline gap-2">
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
    gradient 
}) {
    const [isHovered, setIsHovered] = useState(false);
    
    return (
        <div 
            className="relative overflow-hidden rounded-3xl p-[2px] transition-all duration-300"
            style={{
                background: gradient,
                filter: isHovered ? "saturate(1.3) brightness(1.05)" : "saturate(1)",
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="relative bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-[calc(1.5rem-2px)] p-6 lg:p-8 flex flex-col h-full">
                <h3 className="font-display text-[26px] lg:text-[28px] tracking-tight text-white flex items-center gap-2">
                    {name}
                    {tier === "aura" && <Crown size={20} className="text-yellow-300" />}
                </h3>
                <p className="text-[13.5px] text-white/75 mt-1.5 mb-5 leading-relaxed">{tagline}</p>
                <PriceTag amount={price} interval={interval} />
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
                            Escolher {name.replace("Lusorae ", "")} <ArrowRight size={16} />
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
        <div data-testid="premium-page" className="min-h-screen">
            <PageHeader title="Plus & Aura" subtitle="Uma camada mais profunda do teu Lusorae" back />

            {/* Hero Section — honesto e direto */}
            <div 
                className="relative overflow-hidden"
                style={{
                    background: "linear-gradient(135deg, #8b5cf6 0%, #ec4899 50%, #a855f7 100%)",
                }}
            >
                <div className="absolute inset-0 opacity-20">
                    <div className="absolute top-0 left-1/4 w-96 h-96 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob" />
                    <div className="absolute top-0 right-1/4 w-96 h-96 bg-violet-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000" />
                    <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-purple-300 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000" />
                </div>

                <div className="relative px-5 lg:px-8 py-12 lg:py-16 max-w-4xl mx-auto">
                    <h1 className="font-display text-[36px] lg:text-[52px] tracking-tighter leading-[0.95] text-white mb-4 max-w-3xl">
                        Não vendemos atenção, alcance nem algoritmo.
                    </h1>

                    <p className="text-[16px] lg:text-[18px] text-white/90 leading-relaxed max-w-2xl mb-8">
                        O premium do Lusorae aprofunda a tua presença — nunca distorce a dos outros.
                        Vendemos pertença, identidade, presença e conforto digital.
                    </p>
                </div>
            </div>

            {/* Pricing Section — grid responsivo compacto */}
            <div className="px-5 lg:px-8 py-12 lg:py-16 max-w-6xl mx-auto">
                {/* Toggle mensal/anual */}
                <div className="flex justify-center mb-8">
                    <div className="inline-flex items-center gap-1 p-1 rounded-full bg-black/[0.06] border border-black/[0.08]">
                        {["month", "year"].map((i) => (
                            <button 
                                key={i} 
                                onClick={() => setInterval(i)}
                                className={`px-6 h-10 rounded-full text-[13px] font-bold transition ${
                                    interval === i 
                                        ? "bg-white text-black shadow-sm" 
                                        : "text-black/60 hover:text-black"
                                }`}
                            >
                                {i === "month" ? "Mensal" : "Anual"}
                                {i === "year" && interval === "year" && (
                                    <span className="ml-2 text-[11px] text-violet-600">
                                        (−2 meses)
                                    </span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid lg:grid-cols-2 gap-6 max-w-5xl mx-auto">
                    <TierCard
                        tier="plus" 
                        name="Lusorae Plus" 
                        tagline="Melhora a experiência social"
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
                        tagline="O Lusorae faz parte da tua vida digital"
                        price={prices.aura} 
                        interval={interval} 
                        features={AURA_FEATURES}
                        current={isAura} 
                        billingAvailable={billing_available}
                        onSubscribe={subscribe} 
                        onManage={manage}
                        gradient="linear-gradient(135deg, #ec4899, #a855f7, #8b5cf6)"
                    />
                </div>

                {plan !== "free" && (
                    <p className="text-[13px] text-black/50 mt-8 text-center leading-relaxed">
                        Subscrição ativa · gere pagamentos, faturas e cancelamento no portal seguro.
                    </p>
                )}
            </div>

            {/* Valores do Manifesto — o que Premium NÃO faz */}
            <div className="px-5 lg:px-8 py-12 max-w-4xl mx-auto">
                <div className="rounded-2xl border border-black/[0.10] p-6 lg:p-8 bg-white">
                    <p className="text-[11px] uppercase tracking-[0.12em] text-black/45 font-mono mb-3">
                        O que Premium NÃO faz
                    </p>
                    <h2 className="font-display text-[24px] lg:text-[28px] leading-tight tracking-tight text-black mb-4">
                        Os nossos compromissos mantêm-se.
                    </h2>
                    <div className="space-y-3 text-[14px] text-black/70 leading-relaxed">
                        <p className="flex items-start gap-2">
                            <Check size={18} className="text-green-soft mt-0.5 flex-shrink-0" strokeWidth={2.5} />
                            <span>Premium <strong>não</strong> te dá mais alcance, visibilidade ou prioridade no feed dos outros.</span>
                        </p>
                        <p className="flex items-start gap-2">
                            <Check size={18} className="text-green-soft mt-0.5 flex-shrink-0" strokeWidth={2.5} />
                            <span>Premium <strong>não</strong> muda o algoritmo para te favorecer.</span>
                        </p>
                        <p className="flex items-start gap-2">
                            <Check size={18} className="text-green-soft mt-0.5 flex-shrink-0" strokeWidth={2.5} />
                            <span>Premium <strong>não</strong> remove anúncios — porque não há anúncios no Lusorae.</span>
                        </p>
                        <p className="flex items-start gap-2">
                            <Check size={18} className="text-green-soft mt-0.5 flex-shrink-0" strokeWidth={2.5} />
                            <span>Premium <strong>não</strong> te torna melhor que os outros utilizadores.</span>
                        </p>
                    </div>
                    <p className="mt-5 text-[13px] text-black/55 leading-relaxed">
                        Premium é conforto, identidade e ferramentas. Nunca é vantagem social. 
                        <strong className="text-black/75"> O tempo que passas aqui é teu. Não nosso.</strong>
                    </p>
                </div>
            </div>

            {/* FAQ compacta */}
            <div className="px-5 lg:px-8 py-12 max-w-4xl mx-auto">
                <h2 className="font-display text-[28px] tracking-tight text-black mb-6">
                    Perguntas frequentes
                </h2>
                <div className="space-y-4">
                    {[
                        { q: "Posso cancelar a qualquer momento?", a: "Sim. Sem compromissos ou taxas de cancelamento. Mantens o acesso até ao fim do período pago." },
                        { q: "O que acontece aos meus dados se cancelar?", a: "Nada. Os teus posts, mensagens e perfil mantêm-se. Só perdes acesso às features premium." },
                        { q: "Há garantia de reembolso?", a: "Sim, 14 dias de garantia total. Se não adorares, devolvemos o teu dinheiro." },
                        { q: "Posso mudar entre Plus e Aura?", a: "Sim, a qualquer momento. O valor é ajustado proporcionalmente." },
                    ].map((faq, idx) => (
                        <div key={idx} className="card-lux p-5">
                            <p className="font-semibold text-[14px] text-black mb-2">{faq.q}</p>
                            <p className="text-[13.5px] text-black/65 leading-relaxed">{faq.a}</p>
                        </div>
                    ))}
                </div>
            </div>

            {!billing_available && (
                <div className="px-5 py-8 text-center border-t border-black/[0.06]">
                    <p className="text-[13px] text-black/40 font-mono">
                        Sistema de pagamentos a ser ativado em breve
                    </p>
                </div>
            )}
        </div>
    );
}
