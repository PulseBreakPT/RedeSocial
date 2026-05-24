import { useMemo, useState } from "react";
import { Check, ArrowRight } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { usePremium } from "../context/PremiumContext";
import { toast } from "sonner";

// Copy humana, alinhada ao manifesto: vende-se pertença, identidade, presença
// e conforto — nunca alcance/algoritmo. Cada item mapeia um entitlement real.
const PLUS_FEATURES = [
    "Perfil e layouts premium, com assinatura pessoal",
    "Banner subtil e estilo de perfil refinado",
    "Presença avançada — com música e estados",
    "Moods premium e stories maiores, com arquivo",
    "Feed calmo: filtros de energia e densidade social",
    "Coleções ilimitadas e bookmarks avançados",
    "Reações premium e widgets sociais",
    "Destaque discreto no Descobrir · badge de apoiante",
];

const AURA_FEATURES = [
    "Tudo do Plus, mais profundo",
    "Memória social pessoal e mini-timeline",
    "Histórico de presença e ritmos sociais",
    "Atmosfera de perfil — muda com a hora, o mood, a estação",
    "Identidade contextual · perfil vivo",
    "Insights do teu ritmo social (só para ti)",
    "Presença ultra-rica e assinatura expandida",
    "Layouts e moods exclusivos",
];

function PriceTag({ amount, interval }) {
    return (
        <div className="flex items-baseline gap-1.5">
            <span className="font-display text-[34px] tracking-tight leading-none">€{amount.toFixed(2)}</span>
            <span className="text-black/45 text-[13px]">/{interval === "year" ? "ano" : "mês"}</span>
        </div>
    );
}

function FeatureList({ items }) {
    return (
        <ul className="space-y-2.5 mt-5">
            {items.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-[13.5px] text-black/75 leading-snug">
                    <Check size={15} className="mt-0.5 flex-shrink-0 text-[var(--eu-500)]" strokeWidth={2.2} />
                    <span>{f}</span>
                </li>
            ))}
        </ul>
    );
}

function TierCard({ tier, name, tagline, price, interval, features, current, billingAvailable, onSubscribe, onManage, accent }) {
    return (
        <div className={`card-lux p-6 lg:p-7 flex flex-col ${accent ? "ring-1 ring-[var(--coral-500)]/20" : ""}`}>
            {accent && <p className="type-overline text-[var(--coral-500)] mb-2">A vida digital, expandida</p>}
            <h3 className="font-display text-[22px] tracking-tight">{name}</h3>
            <p className="text-[13px] text-black/55 mt-1 mb-4 leading-snug">{tagline}</p>
            <PriceTag amount={price} interval={interval} />
            <FeatureList items={features} />
            <div className="mt-7 pt-1">
                {current ? (
                    <button onClick={onManage}
                        className="w-full h-11 rounded-full border border-black/[0.12] text-[13px] font-heading font-medium hover:bg-black/[0.03] transition inline-flex items-center justify-center gap-2">
                        O teu plano · Gerir
                    </button>
                ) : billingAvailable ? (
                    <button onClick={() => onSubscribe(tier, interval)} data-testid={`premium-subscribe-${tier}`}
                        className="w-full h-11 rounded-full btn-obsidian text-[13px] font-heading font-medium inline-flex items-center justify-center gap-2 active:scale-[0.99] transition">
                        Escolher {name.replace("Lusorae ", "")} <ArrowRight size={15} />
                    </button>
                ) : (
                    <button disabled
                        className="w-full h-11 rounded-full border border-black/[0.08] text-[13px] font-heading text-black/35 cursor-not-allowed">
                        Brevemente
                    </button>
                )}
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
        try { await checkout(t, i); }
        catch (e) {
            const msg = e?.response?.data?.detail || "Não foi possível iniciar o checkout.";
            toast.error(msg);
        }
    };
    const manage = async () => {
        try { await openPortal(); }
        catch { toast.error("Não foi possível abrir a gestão de subscrição."); }
    };

    return (
        <div data-testid="premium-page">
            <PageHeader title="Plus & Aura" subtitle="Uma camada mais profunda do teu Lusorae" back />

            <div className="px-5 lg:px-8 py-8 max-w-3xl mx-auto">
                {/* Filosofia — calma, adulta, sem venda agressiva */}
                <p className="type-overline mb-2">Premium</p>
                <h2 className="font-display text-[26px] lg:text-[30px] tracking-tight leading-tight text-black max-w-xl">
                    Não vendemos atenção, alcance nem algoritmo.
                </h2>
                <p className="text-[15px] text-black/65 mt-3 leading-relaxed max-w-xl">
                    Vendemos pertença, identidade, presença e conforto digital. O premium
                    do Lusorae aprofunda a tua presença — nunca distorce a dos outros.
                </p>

                {/* Toggle mensal/anual */}
                <div className="mt-7 inline-flex items-center gap-1 p-1 rounded-full bg-black/[0.04]">
                    {["month", "year"].map((i) => (
                        <button key={i} onClick={() => setInterval(i)}
                            className={`px-4 h-8 rounded-full text-[12.5px] font-heading transition ${interval === i ? "bg-white shadow-sm text-black" : "text-black/50"}`}>
                            {i === "month" ? "Mensal" : "Anual"}
                            {i === "year" && <span className="ml-1.5 text-[var(--eu-500)] text-[11px]">−2 meses</span>}
                        </button>
                    ))}
                </div>

                <div className="grid md:grid-cols-2 gap-4 lg:gap-5 mt-6">
                    <TierCard
                        tier="plus" name="Lusorae Plus" tagline="Melhorar a experiência social"
                        price={prices.plus} interval={interval} features={PLUS_FEATURES}
                        current={isPlus} billingAvailable={billing_available}
                        onSubscribe={subscribe} onManage={manage}
                    />
                    <TierCard
                        tier="aura" name="Lusorae Aura" tagline="O Lusorae faz parte da tua vida digital"
                        price={prices.aura} interval={interval} features={AURA_FEATURES}
                        current={isAura} billingAvailable={billing_available}
                        onSubscribe={subscribe} onManage={manage} accent
                    />
                </div>

                {plan !== "free" && (
                    <p className="text-[12.5px] text-black/45 mt-5 text-center">
                        Subscrição ativa · gere pagamentos, faturas e cancelamento no portal seguro.
                    </p>
                )}
                {!billing_available && (
                    <p className="text-[12px] text-black/40 mt-6 text-center font-mono">
                        Pagamentos a serem ativados.
                    </p>
                )}
            </div>
        </div>
    );
}
