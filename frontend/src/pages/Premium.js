import { useMemo, useState, useRef, useCallback } from "react";
import {
    Check, ArrowRight, Sparkles, Heart, Shield, Zap, Star, Crown, Info,
    Palette, Music, Eye, BookOpen, MessageCircle, TrendingUp, Lock,
    Users, Image as ImageIcon, Bookmark, Layers, SunMoon, Globe, ChevronDown, Minus,
    Radio, Compass, Clock, Award, Activity, Flame, Feather, MapPin
} from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { PtPageShell } from "../components/PtPageShell";
import { PT } from "./auth/AuthDecor";
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
        <ul className="space-y-2.5 mt-6">
            {items.map((f, i) => {
                const Icon = f.icon;
                return (
                    <li key={i} className="flex items-start gap-2.5 text-[14px] leading-relaxed font-medium" style={{ color: f.hl ? PT.ink : "rgba(10,10,10,0.72)", fontWeight: f.hl ? 700 : 500 }}>
                        <span
                            className="flex-shrink-0 w-6 h-6 grid place-items-center mt-0.5"
                            style={{
                                background: PT.gold,
                                color: PT.ink,
                                border: `2px solid ${PT.ink}`,
                                boxShadow: `1.5px 1.5px 0 ${PT.ink}`,
                                borderRadius: 6,
                            }}
                        >
                            <Icon size={11} strokeWidth={2.5} />
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
    billingAvailable, onSubscribe, onManage, accent, isRecommended, scale
}) {
    // accent — main PT color for this tier (gold for Aura, azul for Plus)
    const accentColor = accent || PT.azul;
    return (
        <div className={`relative ${scale || ""}`}>
            {isRecommended && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-20">
                    <div
                        className="px-4 py-1 font-black uppercase"
                        style={{
                            background: PT.red,
                            color: "#fff",
                            border: `2.5px solid ${PT.ink}`,
                            boxShadow: `3px 3px 0 ${PT.ink}`,
                            fontSize: 10.5,
                            letterSpacing: "0.10em",
                            transform: "rotate(-2deg)",
                            borderRadius: 999,
                        }}
                    >
                        ★ RECOMENDADO
                    </div>
                </div>
            )}

            <div
                className="relative p-6 sm:p-7 lg:p-8 flex flex-col h-full transition-transform duration-200 hover:-translate-y-1"
                style={{
                    background: "#fff",
                    border: `3.5px solid ${PT.ink}`,
                    boxShadow: `6px 6px 0 ${accentColor}`,
                    borderRadius: 24,
                }}
            >
                <div className="mb-5 relative">
                    <div className="flex items-center gap-2.5 mb-2">
                        <span
                            className="inline-flex items-center justify-center"
                            style={{
                                width: 38, height: 38,
                                background: accentColor,
                                color: tier === "aura" ? PT.ink : "#fff",
                                border: `2.5px solid ${PT.ink}`,
                                boxShadow: `3px 3px 0 ${PT.ink}`,
                                borderRadius: 10,
                                transform: "rotate(-3deg)",
                            }}
                        >
                            {tier === "aura" ? <Crown size={18} strokeWidth={2.4} /> : <Sparkles size={18} strokeWidth={2.4} />}
                        </span>
                        <h3 className="font-black tracking-tight leading-none" style={{ fontSize: 34, color: PT.ink }}>
                            {name}
                        </h3>
                    </div>
                    <p className="font-mono font-black uppercase mb-2.5" style={{ fontSize: 10.5, letterSpacing: "0.12em", color: PT.red }}>
                        // {subtitle}
                    </p>
                    <p className="text-[14px] leading-relaxed max-w-[34ch] font-medium" style={{ color: "rgba(10,10,10,0.62)" }}>{tagline}</p>
                </div>

                <div className="mb-4">
                    <div className="flex items-baseline gap-2 mb-1">
                        <span
                            className="font-black tabular-nums tracking-[-0.04em] leading-none"
                            style={{
                                fontSize: "clamp(40px, 6vw, 56px)",
                                color: PT.ink,
                                background: PT.gold,
                                padding: "0 0.10em",
                                border: `3px solid ${PT.ink}`,
                                boxShadow: `4px 4px 0 ${PT.ink}`,
                                transform: "rotate(-1.5deg)",
                                display: "inline-block",
                            }}
                        >
                            €{price.toFixed(2)}
                        </span>
                        <span className="text-[13px] font-bold pb-1" style={{ color: "rgba(10,10,10,0.5)" }}>
                            /{interval === "year" ? "ano" : "mês"}
                        </span>
                    </div>
                    {interval === "year" && (
                        <p className="text-[11.5px] mt-3 font-mono font-bold uppercase" style={{ color: PT.green, letterSpacing: "0.05em" }}>
                            ✓ €{(price / 12).toFixed(2)}/mês · POUPAS 17%
                        </p>
                    )}
                </div>

                <div style={{ borderTop: `2.5px dashed ${PT.ink}`, marginBottom: 4 }} />

                <FeatureList items={features} />

                <div className="mt-auto pt-7">
                    {current ? (
                        <button
                            onClick={onManage}
                            className="w-full h-12 text-[13px] font-black uppercase inline-flex items-center justify-center gap-2"
                            style={{
                                background: "#fff",
                                color: PT.ink,
                                border: `2.5px solid ${PT.ink}`,
                                boxShadow: `3px 3px 0 ${PT.ink}`,
                                borderRadius: 999,
                                letterSpacing: "0.06em",
                            }}
                        >
                            ✓ O teu plano · Gerir
                        </button>
                    ) : billingAvailable ? (
                        <button
                            onClick={() => onSubscribe(tier, interval)}
                            data-testid={`premium-subscribe-${tier}`}
                            className="w-full h-12 text-[13px] font-black uppercase inline-flex items-center justify-center gap-2 group/btn"
                            style={{
                                background: PT.red,
                                color: "#fff",
                                border: `2.5px solid ${PT.ink}`,
                                boxShadow: `4px 4px 0 ${PT.ink}`,
                                borderRadius: 999,
                                letterSpacing: "0.06em",
                            }}
                        >
                            Escolher {name}
                            <ArrowRight size={15} className="group-hover/btn:translate-x-0.5 transition-transform duration-150" strokeWidth={2.5} />
                        </button>
                    ) : (
                        <button
                            disabled
                            className="w-full h-12 text-[13px] font-black uppercase cursor-not-allowed"
                            style={{
                                background: "#fff",
                                color: "rgba(10,10,10,0.3)",
                                border: `2.5px dashed ${PT.ink}`,
                                borderRadius: 999,
                                letterSpacing: "0.06em",
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

/* Cell renderer para a tabela comparativa: aceita string OU bool */
function CCell({ value, hl, accent, tone }) {
    const isNone = value === "—" || value === false || value === null || value === undefined;
    const isYes  = value === true || value === "Sim";

    // tone: "plus" → azul, "aura" → gold, undefined → neutro
    const hlBg = tone === "aura" ? "rgba(255,204,0,0.12)" : tone === "plus" ? "rgba(14,77,146,0.07)" : "transparent";

    return (
        <td className="text-center py-3 px-2 align-middle" style={{ background: hl ? hlBg : "transparent" }}>
            {isNone ? (
                <span
                    className="inline-flex w-6 h-6 items-center justify-center"
                    style={{
                        background: "#fff",
                        border: `2px solid ${PT.ink}`,
                        borderRadius: 6,
                        boxShadow: `1.5px 1.5px 0 ${PT.ink}`,
                    }}
                >
                    <Minus size={11} style={{ color: PT.ink }} strokeWidth={3} />
                </span>
            ) : isYes ? (
                <span
                    className="inline-flex w-6 h-6 items-center justify-center"
                    style={{
                        background: PT.green,
                        color: "#fff",
                        border: `2px solid ${PT.ink}`,
                        borderRadius: 6,
                        boxShadow: `1.5px 1.5px 0 ${PT.ink}`,
                    }}
                >
                    <Check size={12} strokeWidth={3.2} />
                </span>
            ) : (
                <span
                    className="text-[12px] sm:text-[12.5px] font-black tabular-nums uppercase"
                    style={{
                        color: accent || PT.ink,
                        letterSpacing: "0.02em",
                    }}
                >
                    {value}
                </span>
            )}
        </td>
    );
}

/* Linha de categoria/grupo dentro da tabela */
function GroupRow({ label }) {
    return (
        <tr style={{ background: PT.ink }}>
            <td colSpan={4} className="py-2.5 px-4 sm:px-5">
                <span
                    className="font-mono font-black uppercase"
                    style={{
                        fontSize: 10.5,
                        letterSpacing: "0.16em",
                        color: PT.gold,
                    }}
                >
                    // {label}
                </span>
            </td>
        </tr>
    );
}

/* Card de categoria do deep-dive */
function CategoryCard({ cat, index }) {
    const Icon = cat.icon;
    const accent = cat.auraOnly ? PT.gold : PT.azul;
    return (
        <div
            className="relative overflow-hidden"
            style={{
                background: "#fff",
                border: `3px solid ${PT.ink}`,
                boxShadow: `5px 5px 0 ${accent}`,
                borderRadius: 20,
            }}
        >
            <div
                className="px-5 sm:px-6 py-4 sm:py-5"
                style={{
                    background: cat.auraOnly ? "rgba(255,204,0,0.10)" : PT.cream,
                    borderBottom: `2.5px solid ${PT.ink}`,
                }}
            >
                <div className="flex items-start gap-3.5">
                    <div
                        className="w-11 h-11 grid place-items-center flex-shrink-0"
                        style={{
                            background: accent,
                            color: cat.auraOnly ? PT.ink : "#fff",
                            border: `2.5px solid ${PT.ink}`,
                            boxShadow: `3px 3px 0 ${PT.ink}`,
                            borderRadius: 10,
                            transform: "rotate(-4deg)",
                        }}
                    >
                        <Icon size={19} strokeWidth={2.4} />
                    </div>
                    <div className="min-w-0">
                        <p
                            className="font-mono font-black uppercase mb-1.5"
                            style={{ fontSize: 10.5, letterSpacing: "0.14em", color: PT.red }}
                        >
                            // {cat.eyebrow}
                        </p>
                        <h3
                            className="font-black tracking-tight leading-tight mb-1.5"
                            style={{ fontSize: "clamp(18px, 2.4vw, 22px)", color: PT.ink }}
                        >
                            {cat.title}
                        </h3>
                        <p className="text-[13px] sm:text-[13.5px] leading-relaxed max-w-[60ch] font-medium" style={{ color: "rgba(10,10,10,0.62)" }}>
                            {cat.desc}
                        </p>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-[13px] sm:text-[13.5px] min-w-[520px]">
                    <thead>
                        <tr style={{ background: "rgba(10,10,10,0.04)", borderBottom: `2px solid ${PT.ink}` }}>
                            <th
                                className="text-left py-3 px-5 sm:px-6 font-mono font-black uppercase w-[44%]"
                                style={{ fontSize: 10.5, letterSpacing: "0.14em", color: PT.ink }}
                            >
                                Funcionalidade
                            </th>
                            <th
                                className="text-center py-3 px-2 font-mono font-black uppercase w-[18%]"
                                style={{ fontSize: 10.5, letterSpacing: "0.14em", color: "rgba(10,10,10,0.55)" }}
                            >
                                Grátis
                            </th>
                            <th className="text-center py-3 px-2 w-[19%]">
                                <span
                                    className="inline-block font-black uppercase"
                                    style={{
                                        background: PT.azul,
                                        color: "#fff",
                                        border: `2px solid ${PT.ink}`,
                                        boxShadow: `2px 2px 0 ${PT.ink}`,
                                        padding: "2px 9px",
                                        borderRadius: 6,
                                        fontSize: 10.5,
                                        letterSpacing: "0.12em",
                                        transform: "rotate(-2deg)",
                                    }}
                                >
                                    Plus
                                </span>
                            </th>
                            <th className="text-center py-3 px-2 w-[19%]">
                                <span
                                    className="inline-block font-black uppercase"
                                    style={{
                                        background: PT.gold,
                                        color: PT.ink,
                                        border: `2px solid ${PT.ink}`,
                                        boxShadow: `2px 2px 0 ${PT.ink}`,
                                        padding: "2px 9px",
                                        borderRadius: 6,
                                        fontSize: 10.5,
                                        letterSpacing: "0.12em",
                                        transform: "rotate(2deg)",
                                    }}
                                >
                                    Aura
                                </span>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {cat.rows.map((r, i) => (
                            <tr
                                key={i}
                                style={{ borderBottom: i === cat.rows.length - 1 ? "none" : `1px dashed rgba(10,10,10,0.12)` }}
                            >
                                <td className="py-3 px-5 sm:px-6 font-medium" style={{ color: "rgba(10,10,10,0.78)" }}>
                                    {r.label}
                                </td>
                                <CCell value={r.free} />
                                <CCell value={r.plus} hl tone="plus" accent={PT.azul} />
                                <CCell value={r.aura} hl tone="aura" accent={cat.auraOnly || r.aura_only ? PT.red : PT.ink} />
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {cat.note && (
                <div
                    className="px-5 sm:px-6 py-3"
                    style={{
                        background: PT.gold,
                        borderTop: `2.5px solid ${PT.ink}`,
                    }}
                >
                    <p
                        className="text-[12.5px] leading-relaxed flex items-start gap-2 font-bold"
                        style={{ color: PT.ink }}
                    >
                        <Info size={13} className="flex-shrink-0 mt-0.5" strokeWidth={2.6} />
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
                    <div className="inline-flex items-center gap-2 px-3 py-1 mb-5"
                        style={{
                            background: PT.green, color: "#fff",
                            border: `2px solid ${PT.ink}`,
                            boxShadow: `2px 2px 0 ${PT.ink}`,
                            borderRadius: 999,
                            transform: "rotate(-2deg)",
                        }}
                    >
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        <span className="text-[10.5px] uppercase tracking-[0.14em] font-black">// DISPONÍVEL AGORA</span>
                    </div>
                    <h1
                        className="font-black tracking-[-0.035em] leading-[1.0] mb-5"
                        style={{ fontSize: "clamp(34px, 5.5vw, 60px)", color: PT.ink }}
                    >
                        Escolhe o plano{" "}
                        <span style={{
                            display: "inline-block",
                            background: PT.gold,
                            padding: "0 0.10em",
                            border: `3px solid ${PT.ink}`,
                            boxShadow: `4px 4px 0 ${PT.ink}`,
                            transform: "rotate(-1.5deg)",
                            WebkitTextStroke: `0.5px ${PT.ink}`,
                        }}>certo</span>{" "}
                        para ti.
                    </h1>
                    <p className="text-[15px] sm:text-[17px] leading-relaxed max-w-lg mx-auto font-medium" style={{ color: "rgba(10,10,10,0.65)" }}>
                        Sem anúncios. Sem algoritmos manipulados. Apenas ferramentas que aprofundam a tua presença — ao teu ritmo.
                    </p>
                </div>

                {/* Toggle — estilo fanzine PT */}
                <div className="flex justify-center mb-10 sm:mb-14">
                    <div className="inline-flex items-center gap-0 p-1"
                        style={{
                            background: "#fff",
                            border: `2.5px solid ${PT.ink}`,
                            boxShadow: `3px 3px 0 ${PT.ink}`,
                            borderRadius: 999,
                        }}
                    >
                        {["month", "year"].map((i) => {
                            const active = interval === i;
                            return (
                                <button key={i} onClick={() => setInterval(i)}
                                    className="px-5 sm:px-7 h-9 text-[12px] font-black uppercase transition-all duration-200"
                                    style={{
                                        background: active ? PT.ink : "transparent",
                                        color: active ? PT.gold : PT.ink,
                                        borderRadius: 999,
                                        letterSpacing: "0.05em",
                                    }}
                                >
                                    {i === "month" ? "Mensal" : "Anual"}
                                    {i === "year" && (
                                        <span className="ml-1.5 text-[9.5px] font-black tracking-wide" style={{ color: active ? PT.green : PT.green }}>
                                            POUPA 17%
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-7 lg:gap-8 max-w-[1080px] mx-auto items-start">
                    <TierCard tier="plus" name="Plus" subtitle="Presença elevada"
                        tagline="Para quem quer personalizar a experiência. Mais expressão, mais controlo, mais conforto no dia-a-dia."
                        price={prices.plus} interval={interval} features={PLUS_FEATURES}
                        current={isPlus} billingAvailable={billing_available}
                        onSubscribe={subscribe} onManage={manage}
                        accent={PT.azul}
                    />
                    <TierCard tier="aura" name="Aura" subtitle="A experiência definitiva"
                        tagline="Tudo do Plus, mais uma camada de profundidade. O teu perfil ganha vida — adapta-se a ti, à hora e ao momento."
                        price={prices.aura} interval={interval} features={AURA_FEATURES}
                        current={isAura} billingAvailable={billing_available}
                        onSubscribe={subscribe} onManage={manage}
                        accent={PT.gold}
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
                        { icon: Shield,   t: "14 dias",        s: "garantia total", c: PT.green },
                        { icon: Lock,     t: "Pagamento",      s: "via Stripe", c: PT.azul },
                        { icon: MapPin,   t: "Portugal",       s: "feito por nós", c: PT.red },
                        { icon: Heart,    t: "Sem anúncios",   s: "nunca", c: PT.gold },
                    ].map((t, i) => {
                        const Ic = t.icon;
                        return (
                            <div
                                key={i}
                                className="p-3 sm:p-3.5 flex items-center gap-2.5"
                                style={{
                                    background: "#fff",
                                    border: `2.5px solid ${PT.ink}`,
                                    boxShadow: `3px 3px 0 ${t.c}`,
                                    borderRadius: 14,
                                }}
                            >
                                <div
                                    className="w-9 h-9 grid place-items-center flex-shrink-0"
                                    style={{
                                        background: t.c,
                                        color: t.c === PT.gold ? PT.ink : "#fff",
                                        border: `2px solid ${PT.ink}`,
                                        boxShadow: `2px 2px 0 ${PT.ink}`,
                                        borderRadius: 8,
                                    }}
                                >
                                    <Ic size={14} strokeWidth={2.4} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[12.5px] font-black leading-tight" style={{ color: PT.ink }}>{t.t}</p>
                                    <p className="text-[10.5px] font-mono font-bold uppercase leading-tight" style={{ color: "rgba(10,10,10,0.5)", letterSpacing: "0.04em" }}>{t.s}</p>
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
            <section style={{ background: PT.cream, borderTop: `2.5px solid ${PT.ink}`, borderBottom: `2.5px solid ${PT.ink}` }}>
                <div className="px-4 sm:px-6 lg:px-8 py-16 sm:py-24 max-w-5xl mx-auto">
                    <div className="mb-10 sm:mb-14 max-w-2xl">
                        <p className="font-mono font-black uppercase mb-3" style={{ fontSize: 10.5, letterSpacing: "0.16em", color: PT.red }}>
                            // O QUE RECEBES
                        </p>
                        <h2
                            className="font-black tracking-[-0.03em] leading-[1.0] mb-4"
                            style={{ fontSize: "clamp(28px, 4.5vw, 46px)", color: PT.ink }}
                        >
                            Tudo o que muda{" "}
                            <span style={{
                                display: "inline-block",
                                background: PT.gold,
                                padding: "0 0.10em",
                                border: `3px solid ${PT.ink}`,
                                boxShadow: `4px 4px 0 ${PT.ink}`,
                                transform: "rotate(-1deg)",
                            }}>no Plus e no Aura.</span>
                        </h2>
                        <p className="text-[14.5px] sm:text-[16px] leading-relaxed max-w-xl font-medium" style={{ color: "rgba(10,10,10,0.6)" }}>
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
                    <div className="mb-8 sm:mb-10 max-w-2xl">
                        <p className="font-mono font-black uppercase mb-3" style={{ fontSize: 10.5, letterSpacing: "0.16em", color: PT.red }}>
                            // COMPARAÇÃO RÁPIDA
                        </p>
                        <h2
                            className="font-black tracking-[-0.03em] leading-[1.0] mb-3"
                            style={{ fontSize: "clamp(26px, 4.2vw, 42px)", color: PT.ink }}
                        >
                            Lado a lado,{" "}
                            <span style={{
                                display: "inline-block",
                                background: PT.azul,
                                color: "#fff",
                                padding: "0 0.10em",
                                border: `3px solid ${PT.ink}`,
                                boxShadow: `4px 4px 0 ${PT.ink}`,
                                transform: "rotate(-1.5deg)",
                            }}>
                                num só sítio
                            </span>
                        </h2>
                        <p className="text-[14px] sm:text-[15.5px] max-w-xl leading-relaxed font-medium" style={{ color: "rgba(10,10,10,0.6)" }}>
                            Os mesmos valores que vês acima, condensados. Para quando só queres comparar e decidir.
                        </p>
                    </div>

                    <div className="overflow-x-auto -mx-4 sm:mx-0">
                        <div className="min-w-[600px] sm:min-w-0 px-4 sm:px-0">
                            <div
                                className="overflow-hidden"
                                style={{
                                    background: "#fff",
                                    border: `3px solid ${PT.ink}`,
                                    boxShadow: `6px 6px 0 ${PT.gold}`,
                                    borderRadius: 20,
                                }}
                            >
                                <table className="w-full text-[13px] sm:text-[14px]">
                                    <thead>
                                        <tr style={{ background: PT.ink, borderBottom: `2.5px solid ${PT.ink}` }}>
                                            <th
                                                className="text-left py-3.5 px-4 sm:px-5 font-mono font-black uppercase w-[44%]"
                                                style={{ fontSize: 10.5, letterSpacing: "0.14em", color: PT.gold }}
                                            >
                                                Funcionalidade
                                            </th>
                                            <th
                                                className="text-center py-3.5 px-2 font-mono font-black uppercase w-[18%]"
                                                style={{ fontSize: 10.5, letterSpacing: "0.14em", color: "rgba(255,255,255,0.65)" }}
                                            >
                                                Grátis
                                            </th>
                                            <th className="text-center py-3 px-2 w-[19%]">
                                                <span
                                                    className="inline-block font-black uppercase"
                                                    style={{
                                                        background: PT.azul,
                                                        color: "#fff",
                                                        border: `2px solid ${PT.ink}`,
                                                        boxShadow: `2px 2px 0 ${PT.gold}`,
                                                        padding: "3px 10px",
                                                        borderRadius: 6,
                                                        fontSize: 11,
                                                        letterSpacing: "0.12em",
                                                        transform: "rotate(-2deg)",
                                                    }}
                                                >
                                                    Plus
                                                </span>
                                            </th>
                                            <th className="text-center py-3 px-2 w-[19%]">
                                                <span
                                                    className="inline-block font-black uppercase"
                                                    style={{
                                                        background: PT.gold,
                                                        color: PT.ink,
                                                        border: `2px solid ${PT.ink}`,
                                                        boxShadow: `2px 2px 0 ${PT.red}`,
                                                        padding: "3px 10px",
                                                        borderRadius: 6,
                                                        fontSize: 11,
                                                        letterSpacing: "0.12em",
                                                        transform: "rotate(2deg)",
                                                    }}
                                                >
                                                    Aura
                                                </span>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {COMPARISON.map((r, i) => {
                                            if (r.group) return <GroupRow key={`g-${i}`} label={r.group} />;
                                            const Icon = r.icon;
                                            return (
                                                <tr
                                                    key={i}
                                                    style={{ borderBottom: `1px dashed rgba(10,10,10,0.14)` }}
                                                >
                                                    <td className="py-3 px-4 sm:px-5">
                                                        <div className="flex items-center gap-2.5">
                                                            <span
                                                                className="w-7 h-7 grid place-items-center flex-shrink-0 hidden sm:grid"
                                                                style={{
                                                                    background: PT.cream,
                                                                    border: `2px solid ${PT.ink}`,
                                                                    borderRadius: 6,
                                                                }}
                                                            >
                                                                <Icon size={13} style={{ color: PT.ink }} strokeWidth={2.4} />
                                                            </span>
                                                            <span className="font-medium" style={{ color: "rgba(10,10,10,0.78)" }}>{r.label}</span>
                                                        </div>
                                                    </td>
                                                    <CCell value={r.free} />
                                                    <CCell value={r.plus} hl tone="plus" accent={PT.azul} />
                                                    <CCell value={r.aura} hl tone="aura" accent={PT.red} />
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
            <section style={{ background: PT.cream, borderTop: `2.5px solid ${PT.ink}`, borderBottom: `2.5px solid ${PT.ink}` }}>
                <div className="px-4 sm:px-6 lg:px-8 py-16 sm:py-20 max-w-5xl mx-auto">
                    <div className="mb-10 sm:mb-12 max-w-2xl">
                        <p className="font-mono font-black uppercase mb-3" style={{ fontSize: 10.5, letterSpacing: "0.16em", color: PT.red }}>
                            // PRINCÍPIOS
                        </p>
                        <h2
                            className="font-black tracking-[-0.03em] leading-[1.0] mb-3"
                            style={{ fontSize: "clamp(26px, 4.2vw, 42px)", color: PT.ink }}
                        >
                            O que torna este{" "}
                            <span style={{
                                display: "inline-block",
                                background: PT.green,
                                color: "#fff",
                                padding: "0 0.10em",
                                border: `3px solid ${PT.ink}`,
                                boxShadow: `4px 4px 0 ${PT.ink}`,
                                transform: "rotate(-1.5deg)",
                            }}>
                                premium diferente
                            </span>
                        </h2>
                        <p className="text-[14px] sm:text-[15.5px] max-w-lg leading-relaxed font-medium" style={{ color: "rgba(10,10,10,0.6)" }}>
                            Não vendemos atenção, alcance ou prioridade. O premium existe para te dar mais conforto — nunca mais poder.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
                        {[
                            { icon: Heart,  title: "Pertença real",     desc: "O premium não cria classes. A comunidade é uma só. As ferramentas premium aprofundam a tua experiência sem afetar a dos outros.", c: PT.azul,  iconWhite: true },
                            { icon: Shield, title: "Sem distrações",    desc: "Controlo total sobre o que vês e quando. Feed calmo, filtros sociais e de energia, presença ao teu ritmo. Sem dark patterns.", c: PT.red,   iconWhite: true },
                            { icon: Star,   title: "Identidade única",  desc: "Ferramentas de expressão que se adaptam a ti — não te forçam a competir. Moods, atmosferas e presença autêntica, sem pressão social.", c: PT.gold,  iconWhite: false },
                        ].map((item, idx) => {
                            const Icon = item.icon;
                            const rot = idx === 1 ? 0 : idx === 0 ? -1.2 : 1.2;
                            return (
                                <div
                                    key={idx}
                                    className="p-5 sm:p-6 h-full transition-transform duration-200 hover:-translate-y-1"
                                    style={{
                                        background: "#fff",
                                        border: `3px solid ${PT.ink}`,
                                        boxShadow: `5px 5px 0 ${item.c}`,
                                        borderRadius: 18,
                                        transform: `rotate(${rot}deg)`,
                                    }}
                                >
                                    <div
                                        className="w-11 h-11 grid place-items-center mb-4"
                                        style={{
                                            background: item.c,
                                            color: item.iconWhite ? "#fff" : PT.ink,
                                            border: `2.5px solid ${PT.ink}`,
                                            boxShadow: `3px 3px 0 ${PT.ink}`,
                                            borderRadius: 10,
                                            transform: "rotate(-4deg)",
                                        }}
                                    >
                                        <Icon size={18} strokeWidth={2.4} />
                                    </div>
                                    <h3 className="font-black text-[16px] sm:text-[17px] mb-2 tracking-tight leading-tight" style={{ color: PT.ink }}>
                                        {item.title}
                                    </h3>
                                    <p className="text-[13px] leading-relaxed font-medium" style={{ color: "rgba(10,10,10,0.62)" }}>
                                        {item.desc}
                                    </p>
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
                    <div
                        className="relative p-5 sm:p-8"
                        style={{
                            background: "#fff",
                            border: `3.5px solid ${PT.ink}`,
                            boxShadow: `8px 8px 0 ${PT.red}`,
                            borderRadius: 22,
                        }}
                    >
                        {/* corner stamp */}
                        <div
                            className="absolute -top-4 -right-3 px-3 py-1 font-mono font-black uppercase"
                            style={{
                                background: PT.red,
                                color: "#fff",
                                border: `2.5px solid ${PT.ink}`,
                                boxShadow: `3px 3px 0 ${PT.ink}`,
                                fontSize: 10,
                                letterSpacing: "0.14em",
                                transform: "rotate(4deg)",
                                borderRadius: 6,
                                zIndex: 2,
                            }}
                        >
                            // TRANSPARÊNCIA
                        </div>

                        <div className="flex items-start gap-3 mb-5">
                            <div
                                className="w-11 h-11 grid place-items-center flex-shrink-0"
                                style={{
                                    background: PT.azul,
                                    color: "#fff",
                                    border: `2.5px solid ${PT.ink}`,
                                    boxShadow: `3px 3px 0 ${PT.ink}`,
                                    borderRadius: 10,
                                    transform: "rotate(-4deg)",
                                }}
                            >
                                <Info size={19} strokeWidth={2.4} />
                            </div>
                            <div>
                                <h2
                                    className="font-black tracking-[-0.025em] leading-[1.05] mt-1"
                                    style={{ fontSize: "clamp(22px, 3.5vw, 34px)", color: PT.ink }}
                                >
                                    O que o premium{" "}
                                    <span style={{
                                        display: "inline-block",
                                        background: PT.gold,
                                        padding: "0 0.10em",
                                        border: `3px solid ${PT.ink}`,
                                        boxShadow: `3px 3px 0 ${PT.ink}`,
                                        transform: "rotate(-1.5deg)",
                                    }}>
                                        não faz
                                    </span>
                                </h2>
                            </div>
                        </div>

                        <p className="text-[13.5px] sm:text-[14.5px] leading-relaxed mb-5 max-w-xl font-medium" style={{ color: "rgba(10,10,10,0.6)" }}>
                            Dizemos-te exactamente o que o premium nunca vai fazer — para que saibas exactamente o que estás a pagar.
                        </p>

                        <div className="space-y-2.5 mb-5">
                            {[
                                { bold: "Sem alcance extra", rest: " — não te dá mais visibilidade, prioridade no feed ou destaque nas tendências." },
                                { bold: "Sem algoritmo diferente", rest: " — o teu conteúdo é tratado exactamente como o de qualquer outro utilizador." },
                                { bold: "Sem remoção de anúncios", rest: " — porque o Lusorae não tem anúncios. Ponto." },
                                { bold: "Sem hierarquia social", rest: " — não te torna melhor, mais importante ou mais visível que os outros." },
                                { bold: "Sem badges de prestígio", rest: " — o único distintivo é o de Early Supporter, e é discreto. Não há troféus, leaderboards ou classes." },
                            ].map((t, i) => (
                                <div
                                    key={i}
                                    className="flex items-start gap-2.5 p-2.5"
                                    style={{
                                        background: PT.cream,
                                        border: `2px solid ${PT.ink}`,
                                        boxShadow: `2px 2px 0 ${PT.ink}`,
                                        borderRadius: 10,
                                    }}
                                >
                                    <div
                                        className="w-6 h-6 grid place-items-center flex-shrink-0 mt-0.5"
                                        style={{
                                            background: PT.green,
                                            color: "#fff",
                                            border: `2px solid ${PT.ink}`,
                                            borderRadius: 6,
                                        }}
                                    >
                                        <Check size={12} strokeWidth={3.2} />
                                    </div>
                                    <p className="text-[13.5px] sm:text-[14px] leading-relaxed" style={{ color: "rgba(10,10,10,0.78)" }}>
                                        <strong className="font-black" style={{ color: PT.ink }}>{t.bold}</strong>{t.rest}
                                    </p>
                                </div>
                            ))}
                        </div>

                        <div style={{ borderTop: `2.5px dashed ${PT.ink}`, paddingTop: 14 }}>
                            <p className="text-[13px] sm:text-[13.5px] leading-relaxed font-medium" style={{ color: "rgba(10,10,10,0.6)" }}>
                                O premium é conforto, identidade e ferramentas. Nunca é vantagem social.
                            </p>
                            <p
                                className="mt-2 font-black tracking-tight"
                                style={{ fontSize: "clamp(15px, 2vw, 17px)", color: PT.ink }}
                            >
                                O tempo que passas aqui é{" "}
                                <span style={{
                                    display: "inline-block",
                                    background: PT.gold,
                                    padding: "0 0.18em",
                                    border: `2.5px solid ${PT.ink}`,
                                    boxShadow: `2px 2px 0 ${PT.ink}`,
                                    transform: "rotate(-1deg)",
                                }}>
                                    teu
                                </span>
                                . Não nosso.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* ──────────────────────────────────────────
                NÍVEL 6 — FAQ (utilitário)
                ────────────────────────────────────────── */}
            <section style={{ background: PT.cream, borderTop: `2.5px solid ${PT.ink}` }}>
                <div className="px-4 sm:px-6 lg:px-8 py-14 sm:py-18 max-w-2xl mx-auto prem-faq">
                    <div className="mb-7 sm:mb-9">
                        <p className="font-mono font-black uppercase mb-3" style={{ fontSize: 10.5, letterSpacing: "0.16em", color: PT.red }}>
                            // DÚVIDAS
                        </p>
                        <h2
                            className="font-black tracking-[-0.025em] leading-[1.0] mb-2"
                            style={{ fontSize: "clamp(24px, 3.8vw, 38px)", color: PT.ink }}
                        >
                            Perguntas{" "}
                            <span style={{
                                display: "inline-block",
                                background: PT.azul,
                                color: "#fff",
                                padding: "0 0.10em",
                                border: `3px solid ${PT.ink}`,
                                boxShadow: `3px 3px 0 ${PT.ink}`,
                                transform: "rotate(-1.5deg)",
                            }}>
                                frequentes
                            </span>
                        </h2>
                        <p className="text-[13.5px] sm:text-[14.5px] leading-relaxed font-medium" style={{ color: "rgba(10,10,10,0.6)" }}>
                            Respostas directas, sem rodeios.
                        </p>
                    </div>

                    <div className="space-y-3">
                        {FAQS.map((faq, idx) => (
                            <details
                                key={idx}
                                className="group p-4 sm:p-4.5 cursor-pointer"
                                style={{
                                    background: "#fff",
                                    border: `2.5px solid ${PT.ink}`,
                                    boxShadow: `3px 3px 0 ${PT.ink}`,
                                    borderRadius: 12,
                                }}
                            >
                                <summary className="flex items-center justify-between font-black text-[14px] sm:text-[15px] list-none" style={{ color: PT.ink }}>
                                    <span className="pr-3">{faq.q}</span>
                                    <span
                                        className="w-7 h-7 grid place-items-center flex-shrink-0"
                                        style={{
                                            background: PT.gold,
                                            color: PT.ink,
                                            border: `2px solid ${PT.ink}`,
                                            borderRadius: 999,
                                            boxShadow: `1.5px 1.5px 0 ${PT.ink}`,
                                        }}
                                    >
                                        <ChevronDown size={13} className="group-open:rotate-180 transition-transform duration-200" strokeWidth={3} />
                                    </span>
                                </summary>
                                <div className="prem-faq-answer">
                                    <div className="mt-3 pt-3" style={{ borderTop: `1.5px dashed ${PT.ink}` }}>
                                        <p className="text-[13.5px] sm:text-[14px] leading-relaxed font-medium" style={{ color: "rgba(10,10,10,0.66)" }}>{faq.a}</p>
                                    </div>
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
                <section style={{ background: PT.ink }}>
                    <div className="px-4 sm:px-6 lg:px-8 py-16 sm:py-24 max-w-3xl mx-auto text-center">
                        <p className="font-mono font-black uppercase mb-4" style={{ fontSize: 10.5, letterSpacing: "0.18em", color: PT.gold }}>
                            // PRÓXIMO PASSO
                        </p>
                        <h3
                            className="font-black tracking-[-0.03em] leading-[1.0] mb-4"
                            style={{ fontSize: "clamp(26px, 4.5vw, 46px)", color: "#fff" }}
                        >
                            Pronto para uma{" "}
                            <span style={{
                                display: "inline-block",
                                background: PT.gold,
                                color: PT.ink,
                                padding: "0 0.10em",
                                border: `3px solid ${PT.gold}`,
                                boxShadow: `4px 4px 0 ${PT.red}`,
                                transform: "rotate(-1.5deg)",
                            }}>
                                camada mais profunda?
                            </span>
                        </h3>
                        <p className="text-[14.5px] sm:text-[16px] leading-relaxed max-w-lg mx-auto mb-8 font-medium" style={{ color: "rgba(255,244,220,0.75)" }}>
                            Começa pelo Plus e sobe quando quiseres. Cancelas a qualquer momento — sem perguntas.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                            <button
                                onClick={() => subscribe("plus", interval)}
                                data-testid="premium-cta-bottom-plus"
                                className="w-full sm:w-auto px-7 h-12 font-black uppercase inline-flex items-center justify-center gap-2 transition-transform duration-150 hover:-translate-y-0.5"
                                style={{
                                    background: PT.azul,
                                    color: "#fff",
                                    border: `2.5px solid #fff`,
                                    boxShadow: `4px 4px 0 ${PT.gold}`,
                                    borderRadius: 999,
                                    fontSize: 13,
                                    letterSpacing: "0.06em",
                                }}
                            >
                                Começar com Plus
                                <ArrowRight size={15} strokeWidth={2.6} />
                            </button>
                            <button
                                onClick={() => subscribe("aura", interval)}
                                data-testid="premium-cta-bottom-aura"
                                className="w-full sm:w-auto px-7 h-12 font-black uppercase inline-flex items-center justify-center gap-2 transition-transform duration-150 hover:-translate-y-0.5"
                                style={{
                                    background: PT.gold,
                                    color: PT.ink,
                                    border: `2.5px solid #fff`,
                                    boxShadow: `4px 4px 0 ${PT.red}`,
                                    borderRadius: 999,
                                    fontSize: 13,
                                    letterSpacing: "0.06em",
                                }}
                            >
                                <Crown size={15} strokeWidth={2.6} />
                                Saltar para Aura
                            </button>
                        </div>
                        <p className="text-[11.5px] mt-6 font-mono font-bold uppercase" style={{ color: "rgba(255,244,220,0.5)", letterSpacing: "0.06em" }}>
                            14 dias de garantia &middot; Cancelas quando quiseres &middot; Sem letras pequenas
                        </p>
                    </div>
                </section>
            )}

            {!billing_available && (
                <div className="px-4 py-8 text-center" style={{ background: PT.cream, borderTop: `2.5px dashed ${PT.ink}` }}>
                    <p className="text-[11px] font-mono font-black uppercase" style={{ color: "rgba(10,10,10,0.4)", letterSpacing: "0.12em" }}>
                        // Sistema de pagamentos a ser ativado em breve
                    </p>
                </div>
            )}
        </PtPageShell>
    );
}
