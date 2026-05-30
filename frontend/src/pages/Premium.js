import { useMemo, useState, useRef, useCallback } from "react";
import {
    Check, ArrowRight, Sparkles, Heart, Shield, Zap, Star, Crown, Info,
    Palette, Music, Eye, BookOpen, MessageCircle, TrendingUp, Lock,
    Users, Image as ImageIcon, Bookmark, Layers, SunMoon, Globe, ChevronDown, Minus,
    Radio, Compass, Clock, Award, Activity, Flame, Feather, MapPin
} from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { PtPageShell } from "../components/PtPageShell";
import { usePremium } from "../context/PremiumContext";
import { toast } from "sonner";

/* ════════════════════════════════════════════════════════════════════
   CONTEÚDO REAL — mapeado 1:1 aos entitlements do backend
   (backend/entitlements.py). Sem promessas vagas: cada linha
   corresponde a uma feature efetiva e cada número a um limite real.
   ════════════════════════════════════════════════════════════════════ */

/* — Features destacadas nos cards de preço — */
const PLUS_FEATURES = [
    { icon: Sparkles, text: "Perfil premium: estilo, banner subtil e assinatura pessoal", hl: true },
    { icon: Music,    text: "Presença ao vivo com música e estados (até 140 caracteres)" },
    { icon: ImageIcon, text: "Stories até 15 segundos, com arquivo e analytics" },
    { icon: Zap,      text: "Feed calmo: filtros sociais e de energia" },
    { icon: Bookmark, text: "Coleções e pastas ilimitadas (5 e 3 no plano grátis)" },
    { icon: Award,    text: "Distintivo de Early Supporter — discreto, para sempre" },
];

const AURA_FEATURES = [
    { icon: Crown,    text: "Tudo do Plus, mais profundo", hl: true },
    { icon: Layers,   text: "Memória social pessoal e mini-timeline da tua presença", hl: true },
    { icon: SunMoon,  text: "Atmosfera de perfil — muda com a hora, o mood e a estação" },
    { icon: ImageIcon, text: "Stories até 30 segundos e moods exclusivos" },
    { icon: Radio,    text: "Presença rica: histórico e estados até 240 caracteres" },
    { icon: Activity, text: "Insights pessoais do teu ritmo social (só para ti)" },
];

/* — Deep-dive por categoria: cada linha é um direito real,
     com o que cada plano efetivamente recebe — */
const CATEGORIES = [
    {
        id: "identity",
        eyebrow: "01 — Identidade & Perfil",
        icon: Palette,
        title: "O teu perfil, com mais voz",
        desc: "Mais formas de te apresentares — sem competir com ninguém. Cada detalhe é teu.",
        rows: [
            { label: "Estilo de perfil premium",       free: "Estilo padrão",        plus: "Estilo premium",        aura: "Estilo premium" },
            { label: "Banner de perfil",                free: "Padrão",               plus: "Banner subtil",         aura: "Banner subtil" },
            { label: "Assinatura pessoal no perfil",   free: "—",                    plus: "Curta",                 aura: "Expandida" },
            { label: "Atmosfera de perfil",             free: "—",                    plus: "—",                     aura: "Vive com a hora, o mood e a estação", aura_only: true },
            { label: "Layouts de perfil",               free: "Padrão",               plus: "Padrão",                aura: "Layouts exclusivos", aura_only: true },
            { label: "Identidade contextual",           free: "—",                    plus: "—",                     aura: "Perfil vivo, adaptado ao momento", aura_only: true },
        ],
    },
    {
        id: "presence",
        eyebrow: "02 — Presença ao vivo",
        icon: Radio,
        title: "Estar presente, ao teu jeito",
        desc: "Estados de presença mais ricos, mais subtis e mais duradouros. Sem ostentação.",
        rows: [
            { label: "Estado de presença",              free: "Básico",               plus: "Avançado",              aura: "Rico" },
            { label: "Limite de caracteres do estado", free: "64",                    plus: "140",                   aura: "240" },
            { label: "Música no estado de presença",   free: "—",                    plus: "Sim",                   aura: "Sim" },
            { label: "Histórico de presença",           free: "—",                    plus: "—",                     aura: "Linha do tempo pessoal", aura_only: true },
        ],
    },
    {
        id: "stories",
        eyebrow: "03 — Stories",
        icon: ImageIcon,
        title: "Mais tempo para contar",
        desc: "Os teus stories ficam maiores, têm arquivo permanente e ganham analytics — visíveis só para ti.",
        rows: [
            { label: "Duração máxima do story",        free: "5 segundos",           plus: "15 segundos",           aura: "30 segundos" },
            { label: "Moods nos stories",               free: "Catálogo padrão",      plus: "Moods premium",         aura: "Moods exclusivos" },
            { label: "Arquivo de stories",              free: "—",                    plus: "Ilimitado",             aura: "Ilimitado" },
            { label: "Analytics dos teus stories",     free: "—",                    plus: "Visualizações + reações", aura: "Visualizações + reações" },
        ],
    },
    {
        id: "feed",
        eyebrow: "04 — Feed & Descoberta",
        icon: Compass,
        title: "Decides o que vês — e em que ritmo",
        desc: "O feed não é manipulado por planos. Tu é que ganhas mais ferramentas para o sintonizar a ti.",
        rows: [
            { label: "Feed calmo",                      free: "—",                    plus: "Sim",                   aura: "Sim" },
            { label: "Filtros sociais",                 free: "—",                    plus: "Sim",                   aura: "Sim" },
            { label: "Filtros de energia",              free: "—",                    plus: "Sim",                   aura: "Sim" },
            { label: "Reações premium",                 free: "Reações base",         plus: "Reações ampliadas",     aura: "Reações ampliadas" },
            { label: "Destaque subtil em Descobrir",   free: "—",                    plus: "Discreto",              aura: "Discreto" },
        ],
        note: "Nenhum destes filtros muda o que os outros vêem. O algoritmo trata todos por igual — sempre.",
    },
    {
        id: "collections",
        eyebrow: "05 — Coleções & Guardados",
        icon: Bookmark,
        title: "Organiza o que importa, sem teto",
        desc: "Mais espaço para guardar, organizar e voltar a momentos.",
        rows: [
            { label: "Coleções",                        free: "Até 5",                plus: "Ilimitadas",            aura: "Ilimitadas" },
            { label: "Pastas de bookmarks",             free: "Até 3",                plus: "Ilimitadas",            aura: "Ilimitadas" },
            { label: "Widgets sociais no perfil",      free: "—",                    plus: "Sim",                   aura: "Sim, expandidos" },
        ],
    },
    {
        id: "memory",
        eyebrow: "06 — Memória social",
        icon: Layers,
        title: "O Lusorae passa a fazer parte da tua vida",
        desc: "Exclusivo do Aura. Uma camada viva: a tua história aqui passa a ser navegável, com ritmos e insights pessoais.",
        rows: [
            { label: "Memória social pessoal",         free: "—",                    plus: "—",                     aura: "Sim", aura_only: true },
            { label: "Mini-timeline da tua presença",  free: "—",                    plus: "—",                     aura: "Sim", aura_only: true },
            { label: "Insights de ritmo social",       free: "—",                    plus: "—",                     aura: "Pessoais e privados", aura_only: true },
            { label: "Analytics sociais pessoais",     free: "—",                    plus: "—",                     aura: "Sim, só visíveis para ti", aura_only: true },
            { label: "Widgets de memória",              free: "—",                    plus: "—",                     aura: "Sim", aura_only: true },
        ],
        auraOnly: true,
    },
];

/* — Comparação compacta em tabela (cobre tudo) — */
const COMPARISON = [
    { group: "Identidade & Perfil" },
    { label: "Estilo de perfil premium",        icon: Palette,    free: "—",        plus: "Sim",        aura: "Sim" },
    { label: "Banner subtil",                    icon: Sparkles,   free: "—",        plus: "Sim",        aura: "Sim" },
    { label: "Assinatura pessoal",               icon: BookOpen,   free: "—",        plus: "Curta",      aura: "Expandida" },
    { label: "Atmosfera + identidade contextual",icon: SunMoon,    free: "—",        plus: "—",          aura: "Sim" },
    { label: "Layouts exclusivos",               icon: Layers,     free: "—",        plus: "—",          aura: "Sim" },

    { group: "Presença ao vivo" },
    { label: "Limite do estado",                 icon: Feather,    free: "64 carac.",plus: "140 carac.", aura: "240 carac." },
    { label: "Música no estado",                 icon: Music,      free: "—",        plus: "Sim",        aura: "Sim" },
    { label: "Histórico de presença",            icon: Clock,      free: "—",        plus: "—",          aura: "Sim" },

    { group: "Stories" },
    { label: "Duração máxima",                   icon: ImageIcon,  free: "5 seg",    plus: "15 seg",     aura: "30 seg" },
    { label: "Moods nos stories",                icon: Heart,      free: "Padrão",   plus: "Premium",    aura: "Exclusivos" },
    { label: "Arquivo de stories",               icon: Bookmark,   free: "—",        plus: "Ilimitado",  aura: "Ilimitado" },
    { label: "Analytics dos teus stories",       icon: Eye,        free: "—",        plus: "Sim",        aura: "Sim" },

    { group: "Feed & Descoberta" },
    { label: "Feed calmo",                       icon: Zap,        free: "—",        plus: "Sim",        aura: "Sim" },
    { label: "Filtros sociais e de energia",     icon: Compass,    free: "—",        plus: "Sim",        aura: "Sim" },
    { label: "Reações premium",                  icon: Flame,      free: "Base",     plus: "Ampliadas",  aura: "Ampliadas" },

    { group: "Memória social" },
    { label: "Memória social pessoal",           icon: Layers,     free: "—",        plus: "—",          aura: "Sim" },
    { label: "Mini-timeline",                    icon: TrendingUp, free: "—",        plus: "—",          aura: "Sim" },
    { label: "Insights de ritmo social",         icon: Activity,   free: "—",        plus: "—",          aura: "Sim" },

    { group: "Coleções & Guardados" },
    { label: "Coleções",                         icon: Bookmark,   free: "5",        plus: "Ilimitadas", aura: "Ilimitadas" },
    { label: "Pastas de bookmarks",              icon: Layers,     free: "3",        plus: "Ilimitadas", aura: "Ilimitadas" },
    { label: "Widgets sociais",                  icon: Star,       free: "—",        plus: "Sim",        aura: "Expandidos" },

    { group: "Base (incluído em todos)" },
    { label: "Mensagens sem limites",            icon: MessageCircle, free: "Sim",   plus: "Sim",        aura: "Sim" },
    { label: "Posts e comentários",              icon: BookOpen,   free: "Sim",      plus: "Sim",        aura: "Sim" },
    { label: "Privacidade total",                icon: Lock,       free: "Sim",      plus: "Sim",        aura: "Sim" },
];

/* — FAQ alargado e específico — */
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

/* ═══════════════ Components ═══════════════ */

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

                    <div className="relative h-px mb-5 overflow-hidden">
                        <div className="absolute inset-0" style={{ background: borderGrad, opacity: 0.35 }} />
                        <div className="absolute inset-0 shimmer-line" style={{ background: "linear-gradient(90deg, transparent 30%, rgba(255,255,255,0.5) 50%, transparent 70%)" }} />
                    </div>

                    <FeatureList items={features} />

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

/* Cell renderer para a tabela comparativa: aceita string OU bool */
function CCell({ value, hl, accent }) {
    const isNone = value === "—" || value === false || value === null || value === undefined;
    const isYes  = value === true || value === "Sim";

    return (
        <td className={`text-center py-3 px-2 align-middle ${hl ? "bg-violet-50/40" : ""}`}>
            {isNone ? (
                <span className="inline-flex w-5 h-5 rounded-full bg-black/[0.04] items-center justify-center">
                    <Minus size={10} className="text-black/20" strokeWidth={2.5} />
                </span>
            ) : isYes ? (
                <span className="inline-flex w-5 h-5 rounded-full bg-green-500/10 items-center justify-center">
                    <Check size={12} className="text-green-600" strokeWidth={3} />
                </span>
            ) : (
                <span className={`text-[12.5px] font-semibold tabular-nums ${accent ? accent : "text-black/75"}`}>
                    {value}
                </span>
            )}
        </td>
    );
}

/* Linha de categoria/grupo dentro da tabela */
function GroupRow({ label }) {
    return (
        <tr className="bg-black/[0.025]">
            <td colSpan={4} className="py-2.5 px-4 sm:px-5">
                <span className="text-[10.5px] uppercase tracking-[0.16em] text-black/45 font-mono font-bold">{label}</span>
            </td>
        </tr>
    );
}

/* Card de categoria do deep-dive */
function CategoryCard({ cat, index }) {
    const Icon = cat.icon;
    return (
        <div className={`rounded-2xl border ${cat.auraOnly ? "border-amber-300/40" : "border-black/[0.06]"} bg-white overflow-hidden shadow-sm`}>
            <div className="px-5 sm:px-6 py-4 sm:py-5 border-b border-black/[0.05] bg-black/[0.018]">
                <div className="flex items-start gap-3.5">
                    <div className={`w-10 h-10 rounded-xl grid place-items-center flex-shrink-0 ${cat.auraOnly ? "bg-gradient-to-br from-rose-500/10 to-amber-500/10" : "bg-gradient-to-br from-indigo-500/10 to-cyan-500/10"}`}>
                        <Icon size={18} className={cat.auraOnly ? "text-amber-600" : "text-indigo-600"} strokeWidth={2.2} />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-[0.16em] text-black/30 font-mono font-bold mb-1">{cat.eyebrow}</p>
                        <h3 className="font-display text-[19px] sm:text-[22px] tracking-tight text-black leading-tight font-bold mb-1.5">{cat.title}</h3>
                        <p className="text-[13px] text-black/45 leading-relaxed max-w-[60ch]">{cat.desc}</p>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-[13px] sm:text-[13.5px] min-w-[520px]">
                    <thead>
                        <tr className="border-b border-black/[0.05]">
                            <th className="text-left py-2.5 px-5 sm:px-6 font-semibold text-black/35 w-[44%] text-[11px] uppercase tracking-[0.12em]">Funcionalidade</th>
                            <th className="text-center py-2.5 px-2 font-semibold text-black/25 w-[18%] text-[11px] uppercase tracking-[0.12em]">Grátis</th>
                            <th className="text-center py-2.5 px-2 w-[19%]">
                                <span className="text-[11px] uppercase tracking-[0.12em] font-bold" style={{ background: "linear-gradient(90deg,#4f46e5,#06b6d4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Plus</span>
                            </th>
                            <th className="text-center py-2.5 px-2 w-[19%]">
                                <span className="text-[11px] uppercase tracking-[0.12em] font-bold" style={{ background: "linear-gradient(90deg,#f43f5e,#f59e0b)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Aura</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {cat.rows.map((r, i) => (
                            <tr key={i} className="border-b border-black/[0.035] last:border-0 hover:bg-black/[0.012] transition-colors duration-100">
                                <td className="py-3 px-5 sm:px-6 text-black/65">{r.label}</td>
                                <CCell value={r.free} />
                                <CCell value={r.plus} hl accent="text-indigo-700" />
                                <CCell value={r.aura} hl accent={cat.auraOnly || r.aura_only ? "text-rose-600" : "text-indigo-700"} />
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {cat.note && (
                <div className="px-5 sm:px-6 py-3 bg-amber-50/40 border-t border-amber-200/40">
                    <p className="text-[12px] text-amber-900/70 leading-relaxed flex items-start gap-2">
                        <Info size={12} className="text-amber-600 flex-shrink-0 mt-0.5" strokeWidth={2.2} />
                        <span>{cat.note}</span>
                    </p>
                </div>
            )}
        </div>
    );
}

/* ═══════════════════════════════════════════════════
   HIERARQUIA VISUAL
   ─────────────────
   Nível 1 — PLANOS (herói)
   Nível 2 — DEEP-DIVE por categoria (verdade detalhada)
   Nível 3 — COMPARAÇÃO compacta (referência rápida)
   Nível 4 — PRINCÍPIOS (camada emocional)
   Nível 5 — TRANSPARÊNCIA + CONFIANÇA
   Nível 6 — FAQ
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
        <PtPageShell testid="premium-page">
            <PageHeader title="Plus & Aura" subtitle="Uma camada mais profunda do teu Lusorae" back />

            {/* ──────────────────────────────────────────
                NÍVEL 1 — PLANOS (herói)
                ────────────────────────────────────────── */}
            <section className="px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-20 sm:pb-24 max-w-6xl mx-auto">
                <div className="max-w-2xl mx-auto text-center mb-8 sm:mb-12">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/[0.04] border border-black/[0.06] mb-4">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="text-[11px] uppercase tracking-[0.16em] text-black/55 font-mono font-semibold">Disponível agora</span>
                    </div>
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

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-7 lg:gap-8 max-w-[1080px] mx-auto items-start">
                    <TierCard tier="plus" name="Plus" subtitle="Presença elevada"
                        tagline="Para quem quer personalizar a experiência. Mais expressão, mais controlo, mais conforto no dia-a-dia."
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

                {/* Trust strip — confiança imediata */}
                <div className="mt-12 sm:mt-16 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 max-w-3xl mx-auto">
                    {[
                        { icon: Shield,   t: "14 dias",        s: "garantia total" },
                        { icon: Lock,     t: "Pagamento",      s: "via Stripe" },
                        { icon: MapPin,   t: "Portugal",       s: "feito por nós" },
                        { icon: Heart,    t: "Sem anúncios",   s: "nunca" },
                    ].map((t, i) => {
                        const Ic = t.icon;
                        return (
                            <div key={i} className="rounded-xl p-3 sm:p-3.5 border border-black/[0.05] bg-black/[0.012] flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-white grid place-items-center flex-shrink-0 border border-black/[0.04]">
                                    <Ic size={14} className="text-black/55" strokeWidth={2.2} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[12.5px] font-bold text-black/80 leading-tight">{t.t}</p>
                                    <p className="text-[11px] text-black/40 leading-tight">{t.s}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* ──────────────────────────────────────────
                NÍVEL 2 — DEEP-DIVE por categoria
                Conteúdo verdadeiro: limites reais, features reais
                ────────────────────────────────────────── */}
            <section className="bg-black/[0.018] border-y border-black/[0.04]">
                <div className="px-4 sm:px-6 lg:px-8 py-16 sm:py-24 max-w-5xl mx-auto">
                    <div className="mb-10 sm:mb-14 max-w-2xl">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-black/30 font-mono font-semibold mb-3">
                            O que recebes
                        </p>
                        <h2 className="font-display text-[28px] sm:text-[38px] lg:text-[46px] tracking-[-0.02em] text-black leading-[1.08] mb-4">
                            Tudo o que muda <br className="hidden sm:block" />no Plus e no Aura
                        </h2>
                        <p className="text-[14.5px] sm:text-[16px] text-black/45 leading-relaxed max-w-xl">
                            Seis categorias. Limites reais. Sem letras pequenas. Cada linha aqui é uma feature efetivamente implementada — não é marketing.
                        </p>
                    </div>

                    <div className="space-y-5 sm:space-y-6">
                        {CATEGORIES.map((cat, i) => (
                            <CategoryCard key={cat.id} cat={cat} index={i} />
                        ))}
                    </div>
                </div>
            </section>

            {/* ──────────────────────────────────────────
                NÍVEL 3 — COMPARAÇÃO compacta (referência rápida)
                ────────────────────────────────────────── */}
            <section>
                <div className="px-4 sm:px-6 lg:px-8 py-16 sm:py-20 max-w-4xl mx-auto">
                    <div className="mb-8 sm:mb-10">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-black/30 font-mono font-semibold mb-3">
                            Comparação rápida
                        </p>
                        <h2 className="font-display text-[26px] sm:text-[34px] lg:text-[40px] tracking-tight text-black leading-tight mb-3">
                            Lado a lado, num só sítio
                        </h2>
                        <p className="text-[14px] sm:text-[15px] text-black/40 max-w-xl leading-relaxed">
                            Os mesmos valores que vês acima, condensados. Para quando só queres comparar e decidir.
                        </p>
                    </div>

                    <div className="overflow-x-auto -mx-4 sm:mx-0">
                        <div className="min-w-[600px] sm:min-w-0 px-4 sm:px-0">
                            <div className="rounded-2xl border border-black/[0.06] bg-white overflow-hidden shadow-sm">
                                <table className="w-full text-[13px] sm:text-[14px]">
                                    <thead>
                                        <tr className="bg-black/[0.04]">
                                            <th className="text-left py-3.5 px-4 sm:px-5 font-semibold text-black/55 w-[44%]">Funcionalidade</th>
                                            <th className="text-center py-3.5 px-2 font-semibold text-black/35 w-[18%]">Grátis</th>
                                            <th className="text-center py-3.5 px-2 font-bold w-[19%]">
                                                <span style={{ background: "linear-gradient(90deg,#4f46e5,#06b6d4)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Plus</span>
                                            </th>
                                            <th className="text-center py-3.5 px-2 font-bold w-[19%]">
                                                <span style={{ background: "linear-gradient(90deg,#f43f5e,#f59e0b)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>Aura</span>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {COMPARISON.map((r, i) => {
                                            if (r.group) return <GroupRow key={`g-${i}`} label={r.group} />;
                                            const Icon = r.icon;
                                            return (
                                                <tr key={i} className="border-b border-black/[0.04] hover:bg-black/[0.015] transition-colors duration-100">
                                                    <td className="py-3 px-4 sm:px-5">
                                                        <div className="flex items-center gap-2.5">
                                                            <Icon size={14} className="text-black/25 flex-shrink-0 hidden sm:block" strokeWidth={2} />
                                                            <span className="text-black/65">{r.label}</span>
                                                        </div>
                                                    </td>
                                                    <CCell value={r.free} />
                                                    <CCell value={r.plus} hl accent="text-indigo-700" />
                                                    <CCell value={r.aura} hl accent="text-rose-600" />
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
                NÍVEL 4 — PRINCÍPIOS (camada emocional)
                ────────────────────────────────────────── */}
            <section className="bg-black/[0.018]">
                <div className="px-4 sm:px-6 lg:px-8 py-16 sm:py-20 max-w-5xl mx-auto">
                    <div className="mb-10 sm:mb-12 max-w-2xl">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-black/30 font-mono font-semibold mb-3">
                            Princípios
                        </p>
                        <h2 className="font-display text-[26px] sm:text-[34px] lg:text-[40px] tracking-tight text-black leading-tight mb-3">
                            O que torna este premium diferente
                        </h2>
                        <p className="text-[14px] sm:text-[15px] text-black/40 max-w-lg leading-relaxed">
                            Não vendemos atenção, alcance ou prioridade. O premium existe para te dar mais conforto — nunca mais poder.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
                        {[
                            { icon: Heart,  title: "Pertença real",     desc: "O premium não cria classes. A comunidade é uma só. As ferramentas premium aprofundam a tua experiência sem afetar a dos outros.", g: "from-indigo-50/80 to-cyan-50/80", ic: "text-indigo-600" },
                            { icon: Shield, title: "Sem distrações",    desc: "Controlo total sobre o que vês e quando. Feed calmo, filtros sociais e de energia, presença ao teu ritmo. Sem dark patterns.", g: "from-violet-50/80 to-fuchsia-50/80", ic: "text-violet-600" },
                            { icon: Star,   title: "Identidade única",  desc: "Ferramentas de expressão que se adaptam a ti — não te forçam a competir. Moods, atmosferas e presença autêntica, sem pressão social.", g: "from-amber-50/80 to-orange-50/80", ic: "text-amber-600" },
                        ].map((item, idx) => {
                            const Icon = item.icon;
                            return (
                                <div key={idx} className={`group rounded-2xl p-5 sm:p-6 bg-gradient-to-br ${item.g} border border-black/[0.04] hover:shadow-md transition-shadow duration-200 h-full`}>
                                    <div className="w-10 h-10 rounded-xl bg-white/90 grid place-items-center mb-4 shadow-sm">
                                        <Icon size={18} className={item.ic} strokeWidth={2} />
                                    </div>
                                    <h3 className="font-bold text-[15px] sm:text-[16px] text-black mb-2 tracking-tight">{item.title}</h3>
                                    <p className="text-[13px] text-black/55 leading-relaxed">{item.desc}</p>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </section>

            {/* ──────────────────────────────────────────
                NÍVEL 5 — TRANSPARÊNCIA (o que NÃO faz)
                ────────────────────────────────────────── */}
            <section>
                <div className="px-4 sm:px-6 lg:px-8 py-14 sm:py-20 max-w-3xl mx-auto">
                    <div className="relative overflow-hidden rounded-2xl p-[1.5px]"
                         style={{ background: "linear-gradient(135deg, #4f46e5, #06b6d4, #f43f5e, #f59e0b, #4f46e5)", backgroundSize: "300% 300%", animation: "premGradientFlow 10s ease infinite" }}>
                        <div className="relative bg-white rounded-[calc(1rem-1px)] p-5 sm:p-8">
                            <div className="flex items-start gap-3 mb-5">
                                <div className="w-10 h-10 rounded-xl grid place-items-center flex-shrink-0"
                                     style={{ background: "linear-gradient(135deg, rgba(79,70,229,0.08), rgba(244,63,94,0.08))" }}>
                                    <Info size={18} className="text-indigo-600" strokeWidth={2} />
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase tracking-[0.16em] text-black/30 font-mono mb-1 font-semibold">Transparência</p>
                                    <h2 className="font-display text-[22px] sm:text-[28px] lg:text-[32px] leading-tight tracking-tight text-black">
                                        O que o premium <span className="underline decoration-2 decoration-red-400/40 underline-offset-4">não faz</span>
                                    </h2>
                                </div>
                            </div>

                            <p className="text-[13.5px] text-black/45 leading-relaxed mb-5 max-w-xl">
                                Dizemos-te exactamente o que o premium nunca vai fazer — para que saibas exactamente o que estás a pagar.
                            </p>

                            <div className="space-y-3 mb-5">
                                {[
                                    { bold: "Sem alcance extra", rest: " — não te dá mais visibilidade, prioridade no feed ou destaque nas tendências." },
                                    { bold: "Sem algoritmo diferente", rest: " — o teu conteúdo é tratado exactamente como o de qualquer outro utilizador." },
                                    { bold: "Sem remoção de anúncios", rest: " — porque o Lusorae não tem anúncios. Ponto." },
                                    { bold: "Sem hierarquia social", rest: " — não te torna melhor, mais importante ou mais visível que os outros." },
                                    { bold: "Sem badges de prestígio", rest: " — o único distintivo é o de Early Supporter, e é discreto. Não há troféus, leaderboards ou classes." },
                                ].map((t, i) => (
                                    <div key={i} className="flex items-start gap-2.5">
                                        <div className="w-5 h-5 rounded-full bg-green-500/10 grid place-items-center flex-shrink-0 mt-0.5">
                                            <Check size={11} className="text-green-600" strokeWidth={3} />
                                        </div>
                                        <p className="text-[13.5px] text-black/65 leading-relaxed">
                                            <strong className="text-black/85 font-semibold">{t.bold}</strong>{t.rest}
                                        </p>
                                    </div>
                                ))}
                            </div>

                            <div className="h-px mb-4" style={{ background: "linear-gradient(90deg, transparent, rgba(0,0,0,0.05), transparent)" }} />
                            <p className="text-[12.5px] text-black/45 leading-relaxed">
                                O premium é conforto, identidade e ferramentas. Nunca é vantagem social.
                                <strong className="block mt-1.5 text-black/75 font-semibold text-[13.5px]">O tempo que passas aqui é teu. Não nosso.</strong>
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ──────────────────────────────────────────
                NÍVEL 6 — FAQ (utilitário)
                ────────────────────────────────────────── */}
            <section className="bg-black/[0.018]">
                <div className="px-4 sm:px-6 lg:px-8 py-14 sm:py-18 max-w-2xl mx-auto prem-faq">
                    <div className="mb-7 sm:mb-9">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-black/30 font-mono font-semibold mb-2">
                            Dúvidas
                        </p>
                        <h2 className="font-display text-[22px] sm:text-[28px] lg:text-[32px] tracking-tight text-black mb-1.5 leading-tight">
                            Perguntas frequentes
                        </h2>
                        <p className="text-[13px] sm:text-[13.5px] text-black/40 leading-relaxed">
                            Respostas directas, sem rodeios.
                        </p>
                    </div>

                    <div className="space-y-2">
                        {FAQS.map((faq, idx) => (
                            <details key={idx} className="group bg-white border border-black/[0.05] p-4 sm:p-4.5 rounded-xl cursor-pointer hover:border-black/[0.10] transition-colors duration-100">
                                <summary className="flex items-center justify-between font-semibold text-[13.5px] sm:text-[14.5px] text-black/85">
                                    <span className="pr-3">{faq.q}</span>
                                    <span className="w-6 h-6 rounded-full bg-black/[0.04] grid place-items-center flex-shrink-0 group-open:bg-black/[0.06] transition-colors duration-150">
                                        <ChevronDown size={13} className="text-black/45 group-open:rotate-180 transition-transform duration-200" strokeWidth={2.5} />
                                    </span>
                                </summary>
                                <div className="prem-faq-answer">
                                    <p className="mt-3 text-[13px] sm:text-[13.5px] text-black/55 leading-relaxed">{faq.a}</p>
                                </div>
                            </details>
                        ))}
                    </div>
                </div>
            </section>

            {/* ──────────────────────────────────────────
                CTA FINAL — re-engajamento discreto
                ────────────────────────────────────────── */}
            {plan === "free" && billing_available && (
                <section>
                    <div className="px-4 sm:px-6 lg:px-8 py-14 sm:py-20 max-w-3xl mx-auto text-center">
                        <h3 className="font-display text-[24px] sm:text-[32px] lg:text-[38px] tracking-tight text-black leading-tight mb-3">
                            Pronto para uma camada mais profunda?
                        </h3>
                        <p className="text-[14px] sm:text-[15px] text-black/45 leading-relaxed max-w-lg mx-auto mb-7">
                            Começa pelo Plus e sobe quando quiseres. Cancelas a qualquer momento — sem perguntas.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                            <button onClick={() => subscribe("plus", interval)} data-testid="premium-cta-bottom-plus"
                                className="w-full sm:w-auto px-7 h-12 rounded-2xl bg-black text-white text-[14px] font-bold hover:shadow-lg active:scale-[0.97] transition-all duration-150 inline-flex items-center justify-center gap-2">
                                Começar com Plus
                                <ArrowRight size={16} strokeWidth={2.5} />
                            </button>
                            <button onClick={() => subscribe("aura", interval)} data-testid="premium-cta-bottom-aura"
                                className="w-full sm:w-auto px-7 h-12 rounded-2xl text-white text-[14px] font-bold hover:shadow-lg active:scale-[0.97] transition-all duration-150 inline-flex items-center justify-center gap-2"
                                style={{ background: "linear-gradient(135deg, #f43f5e 0%, #f59e0b 100%)" }}>
                                <Crown size={15} strokeWidth={2.5} />
                                Saltar para Aura
                            </button>
                        </div>
                        <p className="text-[11.5px] text-black/30 mt-5 font-medium">
                            14 dias de garantia &middot; Cancelas quando quiseres &middot; Sem letras pequenas
                        </p>
                    </div>
                </section>
            )}

            {!billing_available && (
                <div className="px-4 py-8 text-center border-t border-black/[0.04]">
                    <p className="text-[11px] text-black/20 font-mono">Sistema de pagamentos a ser ativado em breve</p>
                </div>
            )}
        </PtPageShell>
    );
}
