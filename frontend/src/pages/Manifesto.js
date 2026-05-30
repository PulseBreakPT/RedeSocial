import { Link, useNavigate } from "react-router-dom";
import { useRef, useState, useEffect } from "react";
import {
    ArrowLeft, ArrowRight, Moon, Bell, Sparkles, Cog, EyeOff, MailCheck,
    Shield, Heart, Users, Quote, ChevronRight, ExternalLink,
} from "lucide-react";
import {
    PT, Sticker, Kicker, PosterCard, Highlight, Signature, AuthStyles,
    DoodleStar, DoodleSparkles, DoodleScribble, DoodleSpiral,
    DoodleZigzag, DoodleCross, DoodleUnderline, DoodleHeart,
    DoodleExclamation, GiantAsterisk, AzulejoBorder,
} from "./auth/AuthDecor";
import SiteFooter from "../components/SiteFooter";

/**
 * /manifesto — Página pública das 6 promessas anti-dark-pattern.
 * Reskin: estilo fanzine PT (cream + PT colors + doodles).
 */

const PROMISES = [
    {
        n: "01",
        icon: Moon,
        title: "Sem streaks que punam.",
        body: "Não vais perder nada por não abrires um dia. Não há chamas a contar dias. Não há contrato emocional bilateral.",
        ref: "Anti-padrão Snapchat / TikTok",
        color: PT.red,
    },
    {
        n: "02",
        icon: Bell,
        title: "Modo Boa Noite — por defeito.",
        body: "Entre as 23h00 e as 08h00 as notificações ficam silenciadas. Não te empurramos para acordado. Tu decides se queres opt-in.",
        ref: "Saúde mental > engagement",
        color: PT.azul,
    },
    {
        n: "03",
        icon: Sparkles,
        title: "Sem agrupar notificações para fingir urgência.",
        body: "Cada notificação tem 1 razão clara. Não somamos likes para empurrar com falsa urgência.",
        ref: "Anti-padrão Facebook",
        color: PT.gold,
        inkText: true,
    },
    {
        n: "04",
        icon: Cog,
        title: "Algoritmo destacável e feed cronológico.",
        body: "Tens sempre uma versão não personalizada do feed. Podes resetar a tua bolha. Cumprimento integral do art. 27 do DSA.",
        ref: "Reg. UE 2022/2065",
        color: PT.green,
    },
    {
        n: "05",
        icon: MailCheck,
        title: "Sem read receipts forçados.",
        body: "Nas mensagens, o emissor não sabe se leste. Read receipts são opt-in mútuo, e mesmo assim opcionais por conversa.",
        ref: "Anti-padrão WhatsApp",
        color: PT.red,
    },
    {
        n: "06",
        icon: EyeOff,
        title: "Contagens escondidas nos teus próprios posts.",
        body: "Vês quem reagiu, mas o número está esbatido até carregares. Não queremos comparação compulsiva contigo próprio.",
        ref: "Anti-padrão Instagram",
        color: PT.azul,
    },
];

const STATS = [
    { value: "0", suffix: "", label: "Anúncios mostrados", bg: PT.red, color: "#fff" },
    { value: "0", suffix: "", label: "Dados vendidos a terceiros", bg: PT.azul, color: "#fff" },
    { value: "6", suffix: "", label: "Promessas públicas", bg: PT.gold, color: PT.ink },
    { value: "100", suffix: "%", label: "Transparência de código", bg: PT.green, color: "#fff" },
];

const WHY_DIFFERENT = [
    {
        icon: Shield,
        title: "Sem anúncios",
        desc: "Não vendemos a tua atenção. O nosso modelo é premium: quem paga é quem usa — não anunciantes.",
        color: PT.green,
    },
    {
        icon: Users,
        title: "Feito em Portugal",
        desc: "Equipa portuguesa, servidores europeus, dados protegidos pelo RGPD. Sem dependência de Big Tech.",
        color: PT.azul,
    },
    {
        icon: Heart,
        title: "Pessoas, não métricas",
        desc: "Não otimizamos por tempo de ecrã. Otimizamos por qualidade de conexão e satisfação real.",
        color: PT.red,
    },
];

/* ─── Scroll reveal — opacity + translate only, NO blur ─── */
function Reveal({ children, delay = 0, className = "" }) {
    const ref = useRef(null);
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const obs = new IntersectionObserver(
            ([e]) => { if (e.isIntersecting) setVisible(true); },
            { threshold: 0.1 }
        );
        if (ref.current) obs.observe(ref.current);
        return () => obs.disconnect();
    }, []);

    return (
        <div
            ref={ref}
            className={className}
            style={{
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0)" : "translateY(24px)",
                transition: `opacity 0.6s cubic-bezier(0.22,1,0.36,1) ${delay}s, transform 0.6s cubic-bezier(0.22,1,0.36,1) ${delay}s`,
            }}
        >
            {children}
        </div>
    );
}

/* ─── Animated stat counter ─── */
function AnimatedStat({ value, suffix, label, bg, color, delay, rotate }) {
    const ref = useRef(null);
    const [visible, setVisible] = useState(false);
    const [count, setCount] = useState(0);
    const target = parseInt(value);

    useEffect(() => {
        const obs = new IntersectionObserver(
            ([e]) => { if (e.isIntersecting) setVisible(true); },
            { threshold: 0.3 }
        );
        if (ref.current) obs.observe(ref.current);
        return () => obs.disconnect();
    }, []);

    useEffect(() => {
        if (!visible) return;
        if (target === 0) { setCount(0); return; }
        let start = 0;
        const step = Math.max(1, Math.ceil(target / 30));
        const timer = setInterval(() => {
            start += step;
            if (start >= target) { setCount(target); clearInterval(timer); }
            else setCount(start);
        }, 40);
        return () => clearInterval(timer);
    }, [visible, target]);

    return (
        <div
            ref={ref}
            data-testid="manifesto-stat"
            className="relative p-4 sm:p-5 lg:p-6"
            style={{
                background: bg,
                color,
                border: `3px solid ${PT.ink}`,
                boxShadow: `5px 5px 0 ${PT.ink}`,
                transform: `rotate(${rotate}deg)`,
                borderRadius: 16,
                opacity: visible ? 1 : 0,
                transition: `opacity 0.5s cubic-bezier(0.22,1,0.36,1) ${delay}s, transform 0.5s cubic-bezier(0.22,1,0.36,1) ${delay}s`,
            }}
        >
            <p
                className="font-black tabular-nums leading-none"
                style={{ fontSize: "clamp(28px, 4vw, 44px)", textShadow: color === "#fff" ? `2px 2px 0 ${PT.ink}` : "none" }}
            >
                {count}{suffix}
            </p>
            <p className="mt-1.5 sm:mt-2 text-[10.5px] sm:text-[11.5px] font-mono font-black uppercase" style={{ letterSpacing: "0.08em", opacity: 0.92 }}>
                {label}
            </p>
        </div>
    );
}

/* ─── Promise card — estilo fanzine PT ─── */
function PromiseCard({ n, icon: Icon, title, body, ref: reference, color, inkText, delay }) {
    const textColor = inkText ? PT.ink : "#fff";
    return (
        <Reveal delay={delay}>
            <article
                data-testid={`promise-${n}`}
                className="relative p-5 sm:p-6 h-full transition-transform duration-200 hover:-translate-y-1 hover:rotate-[-0.5deg]"
                style={{
                    background: color,
                    color: textColor,
                    border: `3px solid ${PT.ink}`,
                    boxShadow: `5px 5px 0 ${PT.ink}`,
                    borderRadius: 16,
                }}
            >
                <div className="flex items-start gap-3">
                    {/* Número grande estilo revista */}
                    <span
                        className="font-black leading-none shrink-0"
                        style={{
                            fontSize: 38,
                            color: textColor,
                            opacity: 0.85,
                            textShadow: inkText ? `2px 2px 0 ${PT.red}` : `2px 2px 0 ${PT.ink}`,
                        }}
                    >
                        {n}
                    </span>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                            <span
                                className="inline-flex items-center justify-center"
                                style={{
                                    width: 30, height: 30, borderRadius: 999,
                                    background: inkText ? PT.ink : "#fff",
                                    color: inkText ? PT.gold : PT.ink,
                                    border: `2px solid ${PT.ink}`,
                                    boxShadow: `2px 2px 0 ${PT.ink}`,
                                }}
                            >
                                <Icon size={15} strokeWidth={2.4} />
                            </span>
                        </div>
                        <h3
                            className="font-black tracking-tight leading-snug mb-2"
                            style={{ fontSize: 16.5, color: textColor }}
                        >
                            {title}
                        </h3>
                        <p
                            className="text-[13.5px] leading-relaxed font-medium"
                            style={{ color: textColor, opacity: 0.92 }}
                        >
                            {body}
                        </p>
                        <p
                            className="mt-3 text-[10.5px] uppercase font-mono font-black"
                            style={{ letterSpacing: "0.10em", color: textColor, opacity: 0.7 }}
                        >
                            {reference}
                        </p>
                    </div>
                </div>
            </article>
        </Reveal>
    );
}

export default function Manifesto() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen relative overflow-hidden" style={{ background: PT.cream, color: PT.ink }} data-testid="manifesto-page">
            {/* ============ DOODLES DECORATIVOS DE FUNDO ============ */}
            <div className="absolute -top-16 -right-20 pointer-events-none opacity-[0.07] z-0 hidden sm:block" aria-hidden>
                <GiantAsterisk color={PT.red} size={320} rotate={-12} />
            </div>
            <div className="absolute top-20 right-3 sm:top-28 sm:right-8 pointer-events-none block opacity-60 scale-[0.55] sm:scale-100 sm:opacity-100 origin-top-right z-0" aria-hidden>
                <DoodleStar color={PT.gold} size={48} rotate={14} />
            </div>
            <div className="absolute top-28 left-3 sm:top-36 sm:left-6 pointer-events-none block opacity-60 scale-[0.55] sm:scale-100 sm:opacity-100 origin-top-left z-0" aria-hidden>
                <DoodleSparkles color={PT.red} size={44} rotate={-10} />
            </div>
            <div className="absolute top-[480px] -left-3 sm:left-2 pointer-events-none block opacity-50 scale-[0.55] sm:scale-100 sm:opacity-90 origin-left z-0 hidden md:block" aria-hidden>
                <DoodleScribble color={PT.azul} w={130} h={50} style={{ transform: "rotate(-6deg)" }} />
            </div>
            <div className="absolute top-[580px] -right-2 sm:right-4 pointer-events-none block opacity-50 scale-[0.55] sm:scale-100 sm:opacity-90 origin-right z-0 hidden md:block" aria-hidden>
                <DoodleSpiral color={PT.gold} size={64} rotate={12} />
            </div>
            <div className="absolute bottom-32 left-3 sm:bottom-44 sm:left-8 pointer-events-none block opacity-55 scale-[0.6] sm:scale-100 sm:opacity-90 origin-bottom-left z-0" aria-hidden>
                <DoodleZigzag color={PT.red} w={130} h={28} style={{ transform: "rotate(6deg)" }} />
            </div>
            <div className="absolute bottom-40 right-3 sm:bottom-52 sm:right-10 pointer-events-none block opacity-55 scale-[0.6] sm:scale-100 sm:opacity-90 origin-bottom-right z-0" aria-hidden>
                <DoodleCross color={PT.green} size={30} rotate={-14} />
            </div>

            {/* TAPE topo */}
            <div className="pt-tape h-3 w-full" />

            {/* Faixa "jornal" em INK */}
            <div
                className="flex items-center justify-between px-5 sm:px-8 py-2.5 relative z-10"
                style={{ background: PT.ink, color: PT.bone }}
            >
                <span className="font-mono text-[10.5px] sm:text-[11px] font-bold uppercase" style={{ letterSpacing: "0.20em", color: PT.gold }}>
                    LUSORAE // MANIFESTO // EDIÇÃO Nº&nbsp;{new Date().getFullYear() % 100}
                </span>
                <span className="hidden md:inline font-mono text-[10.5px] font-bold uppercase" style={{ letterSpacing: "0.18em", color: "rgba(255,244,220,0.65)" }}>
                    6 PROMESSAS · ANTI-DARK-PATTERN
                </span>
            </div>

            {/* ═══ HEADER (sticky) ═══ */}
            <header
                className="sticky top-0 z-30 backdrop-blur"
                style={{
                    background: "rgba(244,244,244,0.92)",
                    borderBottom: `3px solid ${PT.ink}`,
                }}
            >
                <div className="max-w-[1100px] mx-auto flex items-center gap-3 px-4 lg:px-8 py-3">
                    <button
                        onClick={() => navigate(-1)}
                        data-testid="manifesto-back-btn"
                        className="w-10 h-10 grid place-items-center tap-shrink"
                        style={{
                            background: "#fff",
                            border: `2.5px solid ${PT.ink}`,
                            borderRadius: 999,
                            boxShadow: `3px 3px 0 ${PT.ink}`,
                            color: PT.ink,
                        }}
                        aria-label="Voltar"
                    >
                        <ArrowLeft size={18} strokeWidth={2.5} />
                    </button>
                    <Link to="/" className="inline-flex items-baseline gap-1.5" data-testid="manifesto-home-link">
                        <span aria-hidden style={{ color: PT.red, fontSize: 22, fontWeight: 900, lineHeight: 1 }}>✱</span>
                        <span className="text-[18px] font-black tracking-tight" style={{ color: PT.ink }}>lusorae</span>
                    </Link>
                    <span
                        className="ml-2 hidden sm:inline text-[11px] uppercase font-mono font-bold"
                        style={{ letterSpacing: "0.16em", color: PT.red }}
                    >
                        // MANIFESTO
                    </span>
                    <div className="ml-auto">
                        <Sticker bg={PT.gold} color={PT.ink} rotate={-3} style={{ fontSize: 10, padding: "5px 10px" }}>
                            🇵🇹 6 promessas públicas
                        </Sticker>
                    </div>
                </div>
            </header>

            {/* ═══ HERO ═══ */}
            <section className="relative z-10 px-5 sm:px-8 lg:px-16 pt-10 sm:pt-14 lg:pt-20 pb-8 max-w-[1100px] mx-auto">
                <Reveal>
                    <Kicker color={PT.red} className="mb-3 inline-flex items-center gap-2">
                        <Shield size={12} strokeWidth={2.5} />
                        <span>// COMPROMISSO · PÚBLICO</span>
                    </Kicker>
                </Reveal>

                <Reveal delay={0.1}>
                    <h1
                        data-testid="manifesto-title"
                        className="font-black tracking-[-0.04em]"
                        style={{ fontSize: "clamp(36px, 6vw, 76px)", lineHeight: 0.96, color: PT.ink }}
                    >
                        Não te queremos{" "}
                        <span style={{
                            display: "inline-block",
                            background: PT.red,
                            color: "#fff",
                            padding: "0 0.10em",
                            border: `3px solid ${PT.ink}`,
                            boxShadow: `4px 4px 0 ${PT.ink}`,
                            transform: "rotate(-1.5deg)",
                            WebkitTextStroke: `0.5px ${PT.ink}`,
                        }}>
                            viciado.
                        </span>
                        <br/>
                        <span className="inline-block mt-2 sm:mt-3">
                            Queremos-te{" "}
                            <Highlight color={PT.gold} rotate={-1}>
                                <span style={{ color: PT.ink }}>bem.</span>
                            </Highlight>
                        </span>
                    </h1>
                </Reveal>

                <Reveal delay={0.2}>
                    <p className="mt-6 sm:mt-7 text-[15.5px] sm:text-[17px] leading-relaxed max-w-[60ch] font-medium" style={{ color: "rgba(10,10,10,0.78)" }}>
                        O Lusorae é uma rede social portuguesa. Não somos uma fábrica de atenção. Não somos pagos
                        por quantos minutos passas aqui. Estas{" "}
                        <strong className="font-black" style={{ color: PT.red }}>seis promessas</strong>{" "}
                        não são marketing — são regras de engenharia de produto. Se algum dia as quebrarmos, podes lembrar-nos aqui.
                    </p>
                </Reveal>

                <Reveal delay={0.3}>
                    <div className="mt-5 flex flex-wrap items-center gap-2">
                        <Sticker bg={PT.green} color="#fff" rotate={-2} style={{ fontSize: 10, padding: "5px 10px" }}>
                            ✓ DOCUMENTO VIVO
                        </Sticker>
                        <Sticker bg="#fff" color={PT.ink} rotate={1} style={{ fontSize: 10, padding: "5px 10px" }}>
                            🇵🇹 PT-PT
                        </Sticker>
                        <Sticker bg={PT.azul} color="#fff" rotate={-1} style={{ fontSize: 10, padding: "5px 10px" }}>
                            DSA · ART. 27
                        </Sticker>
                    </div>
                </Reveal>
            </section>

            {/* ═══ STATS STRIP ═══ */}
            <section className="relative z-10 px-5 sm:px-8 lg:px-16 py-10 sm:py-14 max-w-[1100px] mx-auto">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5">
                    {STATS.map((stat, idx) => (
                        <AnimatedStat
                            key={idx}
                            {...stat}
                            rotate={idx % 2 === 0 ? -0.6 : 0.6}
                            delay={idx * 0.08}
                        />
                    ))}
                </div>
            </section>

            {/* ═══ AS 6 PROMESSAS ═══ */}
            <section className="relative z-10 px-5 sm:px-8 lg:px-16 py-8 max-w-[1100px] mx-auto">
                <Reveal>
                    <div className="mb-7 sm:mb-8 relative">
                        <Kicker color={PT.azul} className="mb-2">// REGRAS · DE · ENGENHARIA</Kicker>
                        <h2
                            className="font-black tracking-[-0.03em]"
                            style={{ fontSize: "clamp(28px, 4.5vw, 52px)", lineHeight: 0.98, color: PT.ink }}
                        >
                            As{" "}
                            <span style={{
                                display: "inline-block",
                                background: PT.gold,
                                padding: "0 0.10em",
                                border: `3px solid ${PT.ink}`,
                                boxShadow: `4px 4px 0 ${PT.ink}`,
                                transform: "rotate(-1deg)",
                            }}>
                                6 promessas.
                            </span>
                        </h2>
                        <p className="mt-3 text-[13.5px] font-mono font-bold uppercase" style={{ letterSpacing: "0.08em", color: "rgba(10,10,10,0.55)" }}>
                            // regras, não marketing
                        </p>
                        <div className="absolute -top-3 -right-1 pointer-events-none hidden sm:block">
                            <DoodleHeart color={PT.red} size={32} rotate={-12} />
                        </div>
                    </div>
                </Reveal>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                    {PROMISES.map((promise, idx) => (
                        <PromiseCard key={promise.n} {...promise} delay={idx * 0.06} />
                    ))}
                </div>

                {/* Azulejos separador */}
                <div className="mt-12 sm:mt-14 flex justify-center overflow-hidden">
                    <AzulejoBorder count={6} size={32} />
                </div>
            </section>

            {/* ═══ CINEMATIC IMAGE BREAK ═══ */}
            <section className="relative z-10 px-5 sm:px-8 lg:px-16 py-10 max-w-[1100px] mx-auto">
                <Reveal>
                    <figure
                        data-testid="manifesto-image"
                        className="relative overflow-hidden isolate aspect-[16/9] sm:aspect-[21/9]"
                        style={{
                            border: `4px solid ${PT.ink}`,
                            boxShadow: `6px 6px 0 ${PT.gold}`,
                            borderRadius: 24,
                        }}
                    >
                        <div className="absolute inset-0" style={{ background: PT.ink }} />
                        <img
                            src="/hero/manifesto.webp"
                            alt="Pessoa contemplativa ao pôr-do-sol sobre o Tejo, em Lisboa"
                            className="absolute inset-0 w-full h-full object-cover"
                            loading="lazy"
                            onError={(e) => { e.target.style.display = "none"; }}
                        />
                        <div
                            className="absolute inset-0"
                            style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.10) 0%, rgba(0,0,0,0.20) 30%, rgba(0,0,0,0.75) 100%)" }}
                            aria-hidden
                        />

                        <figcaption className="absolute inset-x-0 bottom-0 p-6 sm:p-10">
                            <Kicker color={PT.gold} className="mb-3">// REGRA · SILENCIOSA</Kicker>
                            <h2
                                className="font-black tracking-[-0.03em]"
                                style={{ fontSize: "clamp(22px, 4vw, 50px)", lineHeight: 1.04, color: "#fff", textShadow: `3px 3px 0 ${PT.ink}` }}
                            >
                                O tempo que passas aqui{" "}
                                <span style={{
                                    display: "inline-block",
                                    background: PT.gold,
                                    color: PT.ink,
                                    padding: "0 0.10em",
                                    border: `3px solid ${PT.ink}`,
                                    boxShadow: `4px 4px 0 ${PT.ink}`,
                                    transform: "rotate(-1deg)",
                                    textShadow: "none",
                                }}>
                                    é teu.
                                </span>{" "}
                                Não nosso.
                            </h2>
                        </figcaption>

                        {/* Doodle no canto */}
                        <div className="absolute top-4 right-4 z-10 pointer-events-none">
                            <DoodleStar color={PT.gold} size={42} rotate={14} />
                        </div>
                    </figure>
                </Reveal>
            </section>

            {/* ═══ GOLDEN RULE ═══ */}
            <section className="relative z-10 px-5 sm:px-8 lg:px-16 py-10 max-w-[1100px] mx-auto">
                <Reveal>
                    <div
                        className="relative p-6 sm:p-8 lg:p-10 overflow-hidden"
                        data-testid="manifesto-golden-rule"
                        style={{
                            background: "#fff",
                            border: `4px solid ${PT.ink}`,
                            boxShadow: `6px 6px 0 ${PT.gold}`,
                            borderRadius: 24,
                        }}
                    >
                        {/* Aspas gigantes esbatidas */}
                        <div className="absolute top-4 right-6 opacity-[0.08] pointer-events-none" aria-hidden>
                            <Quote size={120} strokeWidth={1} style={{ color: PT.red }} />
                        </div>

                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-5 sm:mb-6">
                                <span
                                    className="inline-flex items-center justify-center"
                                    style={{
                                        width: 40, height: 40,
                                        background: PT.gold,
                                        border: `2.5px solid ${PT.ink}`,
                                        boxShadow: `3px 3px 0 ${PT.ink}`,
                                        borderRadius: 8,
                                    }}
                                >
                                    <Quote size={18} strokeWidth={2.2} style={{ color: PT.ink }} />
                                </span>
                                <Kicker color={PT.red}>// REGRA · INTERNA</Kicker>
                            </div>

                            <blockquote
                                className="font-black tracking-tight max-w-[40ch] mb-6"
                                style={{ fontSize: "clamp(20px, 3.5vw, 34px)", lineHeight: 1.15, color: PT.ink }}
                            >
                                <span style={{ color: "rgba(10,10,10,0.30)", fontSize: "1.1em", marginRight: 6 }}>“</span>
                                Se fechasses a app agora e voltasses amanhã, sentir-te-ias{" "}
                                <span style={{
                                    background: PT.green, color: "#fff", padding: "0 0.10em",
                                    border: `2.5px solid ${PT.ink}`, boxShadow: `3px 3px 0 ${PT.ink}`,
                                    display: "inline-block", transform: "rotate(-1deg)",
                                }}>
                                    melhor
                                </span>{" "}
                                ou{" "}
                                <span style={{
                                    background: PT.red, color: "#fff", padding: "0 0.10em",
                                    border: `2.5px solid ${PT.ink}`, boxShadow: `3px 3px 0 ${PT.ink}`,
                                    display: "inline-block", transform: "rotate(1deg)",
                                }}>
                                    pior
                                </span>{" "}
                                contigo próprio?
                                <span style={{ color: "rgba(10,10,10,0.30)", fontSize: "1.1em", marginLeft: 6 }}>”</span>
                            </blockquote>

                            <hr className="my-5" style={{ border: "none", borderTop: `3px dashed ${PT.ink}` }} />

                            <p className="text-[14px] sm:text-[15px] max-w-[58ch] leading-relaxed font-medium" style={{ color: "rgba(10,10,10,0.72)" }}>
                                Se a resposta honesta for{" "}
                                <strong style={{ color: PT.red, fontWeight: 900 }}>“pior”</strong>, a feature não é lançada.
                                É a única razão por que muitos dos padrões da indústria não existem aqui.
                            </p>

                            <div className="mt-5">
                                <Signature size={22} rotate={-3} color={PT.red}>
                                    — equipa Lusorae
                                </Signature>
                            </div>
                        </div>
                    </div>
                </Reveal>
            </section>

            {/* ═══ POR QUE SOMOS DIFERENTES ═══ */}
            <section className="relative z-10 px-5 sm:px-8 lg:px-16 py-10 max-w-[1100px] mx-auto">
                <Reveal>
                    <Kicker color={PT.green} className="mb-3">// POR QUE · DIFERENTES</Kicker>
                    <h2
                        className="font-black tracking-[-0.03em] mb-7"
                        style={{ fontSize: "clamp(26px, 4vw, 44px)", lineHeight: 1.0, color: PT.ink }}
                    >
                        Três razões{" "}
                        <Highlight color={PT.gold} rotate={-1}>
                            <span style={{ color: PT.ink }}>concretas.</span>
                        </Highlight>
                    </h2>
                </Reveal>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
                    {WHY_DIFFERENT.map((item, idx) => {
                        const Icon = item.icon;
                        return (
                            <Reveal key={idx} delay={idx * 0.1}>
                                <PosterCard
                                    bg="#fff"
                                    color={PT.ink}
                                    rotate={idx % 2 === 0 ? -1 : 1}
                                    shadow={item.color}
                                    style={{ padding: "20px 22px", height: "100%", border: `3px solid ${PT.ink}` }}
                                >
                                    <span
                                        className="inline-flex items-center justify-center mb-3"
                                        style={{
                                            width: 42, height: 42,
                                            background: item.color,
                                            color: "#fff",
                                            border: `2.5px solid ${PT.ink}`,
                                            boxShadow: `3px 3px 0 ${PT.ink}`,
                                            borderRadius: 10,
                                        }}
                                    >
                                        <Icon size={20} strokeWidth={2.2} />
                                    </span>
                                    <h3 className="font-black text-[17px] tracking-tight mb-2" style={{ color: PT.ink }}>{item.title}</h3>
                                    <p className="text-[13.5px] leading-relaxed font-medium" style={{ color: "rgba(10,10,10,0.68)" }}>{item.desc}</p>
                                </PosterCard>
                            </Reveal>
                        );
                    })}
                </div>
            </section>

            {/* ═══ CTAs secundários ═══ */}
            <section className="relative z-10 px-5 sm:px-8 lg:px-16 py-8 max-w-[1100px] mx-auto">
                <Reveal>
                    <div className="flex flex-wrap gap-3">
                        <Link
                            to="/legal"
                            data-testid="manifesto-cta-legal"
                            className="inline-flex items-center gap-1.5 font-black text-[13px] uppercase px-4 py-2.5"
                            style={{
                                background: PT.ink, color: PT.gold,
                                border: `2.5px solid ${PT.ink}`,
                                boxShadow: `3px 3px 0 ${PT.red}`,
                                letterSpacing: "0.06em",
                                borderRadius: 999,
                            }}
                        >
                            Ver Centro Legal <ChevronRight size={14} />
                        </Link>
                        <Link
                            to="/settings"
                            data-testid="manifesto-cta-settings"
                            className="inline-flex items-center gap-1.5 font-black text-[13px] uppercase px-4 py-2.5"
                            style={{
                                background: "#fff", color: PT.ink,
                                border: `2.5px solid ${PT.ink}`,
                                boxShadow: `3px 3px 0 ${PT.ink}`,
                                letterSpacing: "0.06em",
                                borderRadius: 999,
                            }}
                        >
                            Ajustar preferências <ExternalLink size={12} />
                        </Link>
                    </div>
                </Reveal>
            </section>

            {/* ═══ CONVERSION CTA ═══ */}
            <section className="relative z-10 px-5 sm:px-8 lg:px-16 py-10 max-w-[1100px] mx-auto">
                <Reveal>
                    <div
                        data-testid="manifesto-cta-register-card"
                        className="relative p-7 sm:p-10 lg:p-12 overflow-hidden"
                        style={{
                            background: PT.red,
                            color: "#fff",
                            border: `4px solid ${PT.ink}`,
                            boxShadow: `6px 6px 0 ${PT.gold}`,
                            borderRadius: 24,
                        }}
                    >
                        {/* Decorações */}
                        <div className="absolute -top-12 -right-12 z-0 pointer-events-none opacity-30" aria-hidden>
                            <GiantAsterisk color={PT.gold} size={240} rotate={-14} />
                        </div>
                        <div className="absolute top-4 left-4 z-0 pointer-events-none block opacity-80 scale-[0.6] sm:scale-100">
                            <DoodleStar color={PT.gold} size={36} rotate={12} />
                        </div>
                        <div className="absolute bottom-4 right-6 z-0 pointer-events-none block opacity-80 scale-[0.6] sm:scale-100">
                            <DoodleExclamation color={PT.gold} size={42} rotate={-8} />
                        </div>

                        <div className="relative z-10">
                            <Kicker color={PT.gold} className="mb-3">// SE CHEGASTE AQUI</Kicker>
                            <h3
                                className="font-black tracking-[-0.03em] max-w-[22ch] mb-5"
                                style={{ fontSize: "clamp(24px, 4.2vw, 44px)", lineHeight: 1.04 }}
                            >
                                Então já percebeste que isto{" "}
                                <span style={{
                                    display: "inline-block",
                                    background: PT.gold,
                                    color: PT.ink,
                                    padding: "0 0.10em",
                                    border: `3px solid ${PT.ink}`,
                                    boxShadow: `4px 4px 0 ${PT.ink}`,
                                    transform: "rotate(-1deg)",
                                    WebkitTextStroke: `0.5px ${PT.ink}`,
                                }}>
                                    é diferente.
                                </span>
                            </h3>
                            <p className="text-[14.5px] sm:text-[15px] leading-relaxed max-w-[52ch] mb-7 sm:mb-8 font-medium" style={{ color: "rgba(255,255,255,0.88)" }}>
                                Cria conta em 60 segundos. Sem cartão. Sem trial. Sem dark patterns.
                                <strong className="font-black"> Se um dia mudarmos este manifesto, vais ser o primeiro a saber — e a poder ir embora.</strong>
                            </p>
                            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                                <Link
                                    to="/register"
                                    data-testid="manifesto-cta-register"
                                    className="inline-flex items-center gap-2 font-black text-[14px] uppercase px-6 py-3 group"
                                    style={{
                                        background: PT.gold, color: PT.ink,
                                        border: `3px solid ${PT.ink}`,
                                        boxShadow: `5px 5px 0 ${PT.ink}`,
                                        letterSpacing: "0.06em",
                                        borderRadius: 999,
                                    }}
                                >
                                    Criar conta gratuita
                                    <ArrowRight size={16} strokeWidth={2.5} className="group-hover:translate-x-1 transition-transform duration-200" />
                                </Link>
                                <Link
                                    to="/login"
                                    data-testid="manifesto-cta-login"
                                    className="inline-flex items-center text-[13.5px] font-black uppercase underline underline-offset-4"
                                    style={{ color: "rgba(255,255,255,0.85)", letterSpacing: "0.06em" }}
                                >
                                    Já tenho conta
                                </Link>
                            </div>
                        </div>
                    </div>
                </Reveal>
            </section>

            {/* ═══ FOOTER NOTE ═══ */}
            <section className="relative z-10 px-5 sm:px-8 lg:px-16 pb-12 pt-4 max-w-[1100px] mx-auto">
                <Reveal>
                    <p className="text-[12.5px] leading-relaxed font-mono font-medium" style={{ color: "rgba(10,10,10,0.55)", borderTop: `3px dashed ${PT.ink}`, paddingTop: 16 }}>
                        Este manifesto é um <strong className="font-black" style={{ color: PT.ink }}>documento vivo</strong>, atualizado publicamente sempre que mudar.
                        As versões anteriores ficam no histórico, com data de revisão visível.
                    </p>
                </Reveal>
            </section>

            {/* TAPE rodapé */}
            <div className="pt-tape h-3 w-full relative z-10" />

            <SiteFooter />
            <AuthStyles />
        </div>
    );
}
