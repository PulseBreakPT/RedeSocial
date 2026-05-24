import { Link, useNavigate } from "react-router-dom";
import { useRef, useState, useEffect } from "react";
import {
    ArrowLeft, ArrowRight, Moon, Bell, Sparkles, Cog, EyeOff, MailCheck,
    Shield, Heart, Users, Quote, ChevronRight, ExternalLink
} from "lucide-react";

/**
 * /manifesto — public page declaring the 6 anti-dark-pattern promises.
 * Brand differentiator. Linked from /legal footer and Settings.
 */

const PROMISES = [
    {
        n: "01",
        icon: Moon,
        title: "Sem streaks que punam.",
        body: "Não vais perder nada por não abrires um dia. Não há chamas a contar dias. Não há contrato emocional bilateral.",
        ref: "Anti-padrão Snapchat / TikTok",
        gradient: "from-indigo-500/10 to-blue-500/10",
        accent: "bg-indigo-500",
        iconColor: "text-indigo-600",
    },
    {
        n: "02",
        icon: Bell,
        title: "Modo Boa Noite — por defeito.",
        body: "Entre as 23h00 e as 08h00 as notificações ficam silenciadas. Não te empurramos para acordado. Tu decides se queres opt-in.",
        ref: "Saúde mental > engagement",
        gradient: "from-violet-500/10 to-purple-500/10",
        accent: "bg-violet-500",
        iconColor: "text-violet-600",
    },
    {
        n: "03",
        icon: Sparkles,
        title: "Sem agrupar notificações para fingir urgência.",
        body: "Cada notificação tem 1 razão clara. Não somamos likes para empurrar com falsa urgência.",
        ref: "Anti-padrão Facebook",
        gradient: "from-amber-500/10 to-orange-500/10",
        accent: "bg-amber-500",
        iconColor: "text-amber-600",
    },
    {
        n: "04",
        icon: Cog,
        title: "Algoritmo destacável e feed cronológico.",
        body: "Tens sempre uma versão não personalizada do feed. Podes resetar a tua bolha. Cumprimento integral do art. 27 do DSA.",
        ref: "Reg. UE 2022/2065",
        gradient: "from-emerald-500/10 to-teal-500/10",
        accent: "bg-emerald-500",
        iconColor: "text-emerald-600",
    },
    {
        n: "05",
        icon: MailCheck,
        title: "Sem read receipts forçados.",
        body: "Nas mensagens, o emissor não sabe se leste. Read receipts são opt-in mútuo, e mesmo assim opcionais por conversa.",
        ref: "Anti-padrão WhatsApp",
        gradient: "from-pink-500/10 to-rose-500/10",
        accent: "bg-pink-500",
        iconColor: "text-pink-600",
    },
    {
        n: "06",
        icon: EyeOff,
        title: "Contagens escondidas nos teus próprios posts.",
        body: "Vês quem reagiu, mas o número está esbatido até carregares. Não queremos comparação compulsiva contigo próprio.",
        ref: "Anti-padrão Instagram",
        gradient: "from-cyan-500/10 to-sky-500/10",
        accent: "bg-cyan-500",
        iconColor: "text-cyan-600",
    },
];

const STATS = [
    { value: "0", suffix: "", label: "Anúncios mostrados" },
    { value: "0", suffix: "", label: "Dados vendidos a terceiros" },
    { value: "6", suffix: "", label: "Promessas públicas" },
    { value: "100", suffix: "%", label: "Transparência de código" },
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
function AnimatedStat({ value, suffix, label, delay }) {
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
            className="text-center"
            style={{
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0)" : "translateY(16px)",
                transition: `opacity 0.5s cubic-bezier(0.22,1,0.36,1) ${delay}s, transform 0.5s cubic-bezier(0.22,1,0.36,1) ${delay}s`,
            }}
        >
            <div className="font-display text-[42px] lg:text-[56px] font-bold tracking-tight text-black leading-none tabular-nums">
                {count}{suffix}
            </div>
            <p className="text-[13px] text-black/50 mt-2 font-medium">{label}</p>
        </div>
    );
}

/* ─── Promise card ─── */
function PromiseCard({ n, icon: Icon, title, body, ref: reference, gradient, accent, iconColor, delay }) {
    return (
        <Reveal delay={delay}>
            <article
                data-testid={`promise-${n}`}
                className="group relative rounded-2xl border border-black/[0.06] p-6 bg-white transition-all duration-300 hover:shadow-xl hover:shadow-black/[0.06] hover:border-black/[0.12] hover:-translate-y-1 overflow-hidden"
            >
                {/* Gradient background on hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

                {/* Accent line */}
                <div className={`absolute top-0 left-6 right-6 h-[2px] ${accent} opacity-0 group-hover:opacity-60 transition-opacity duration-300 rounded-full`} />

                <div className="relative z-10 flex items-start gap-4">
                    {/* Number + icon */}
                    <div className="flex flex-col items-center gap-2.5 flex-shrink-0">
                        <span className="font-mono text-[11px] text-black/30 tracking-wider font-bold">{n}</span>
                        <div className={`w-11 h-11 rounded-xl bg-black/[0.04] grid place-items-center ${iconColor} group-hover:bg-white group-hover:shadow-md transition-all duration-200`}>
                            <Icon size={20} strokeWidth={1.7} />
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pt-0.5">
                        <h3 className="font-bold text-[16px] tracking-tight text-black leading-snug mb-2">
                            {title}
                        </h3>
                        <p className="text-[13.5px] leading-relaxed text-black/60 group-hover:text-black/70 transition-colors duration-200">
                            {body}
                        </p>
                        <div className="mt-3 flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${accent} opacity-40`} />
                            <p className="text-[10.5px] uppercase tracking-[0.10em] text-black/35 font-mono font-medium">
                                {reference}
                            </p>
                        </div>
                    </div>
                </div>
            </article>
        </Reveal>
    );
}

export default function Manifesto() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-white text-black">
            {/* ═══ HEADER ═══ */}
            <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-black/[0.06]">
                <div className="max-w-[1100px] mx-auto flex items-center gap-3 px-4 lg:px-8 py-3">
                    <button
                        onClick={() => navigate(-1)}
                        data-testid="manifesto-back-btn"
                        className="w-9 h-9 rounded-full grid place-items-center text-black hover:bg-black/[0.06] transition-colors tap-shrink"
                        aria-label="Voltar"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <Link to="/" className="inline-flex items-center gap-2" data-testid="manifesto-home-link">
                        <span aria-hidden className="w-2.5 h-2.5 rotate-45 bg-black rounded-[2px]" />
                        <span className="font-display text-[17px] font-bold tracking-tight">lusorae</span>
                    </Link>
                    <span className="ml-2 hidden sm:inline text-[11px] uppercase tracking-[0.14em] text-black/40 font-mono font-medium">
                        Manifesto
                    </span>
                </div>
            </header>

            {/* ═══ HERO SECTION ═══ */}
            <div className="relative overflow-hidden">
                {/* Subtle gradient background — estático, sem blur */}
                <div className="absolute inset-0 -z-10 pointer-events-none"
                     style={{ background: `
                         radial-gradient(ellipse 50% 50% at 25% 30%, rgba(139,92,246,0.06) 0%, transparent 70%),
                         radial-gradient(ellipse 40% 40% at 75% 40%, rgba(236,72,153,0.04) 0%, transparent 70%)
                     `}} />

                <div className="max-w-[1100px] mx-auto px-4 lg:px-8 pt-14 lg:pt-20 pb-8">
                    <Reveal>
                        <p className="text-[11px] uppercase tracking-[0.2em] text-black/40 font-mono mb-5 font-semibold inline-flex items-center gap-2">
                            <Shield size={12} strokeWidth={2.5} />
                            Compromisso público
                        </p>
                    </Reveal>

                    <Reveal delay={0.1}>
                        <h1
                            data-testid="manifesto-title"
                            className="font-editorial text-[40px] sm:text-[58px] lg:text-[76px] font-normal italic tracking-tight leading-[1.0] text-black max-w-[16ch] mb-7"
                            style={{ fontVariationSettings: '"opsz" 144', fontWeight: 380 }}
                        >
                            Não te queremos viciado.{" "}
                            <span className="not-italic font-display font-bold bg-gradient-to-r from-black via-black/85 to-violet-800 bg-clip-text text-transparent" style={{ fontVariationSettings: 'normal' }}>
                                Queremos-te bem.
                            </span>
                        </h1>
                    </Reveal>

                    <Reveal delay={0.2}>
                        <p className="text-[16px] lg:text-[18px] text-black/60 leading-relaxed max-w-[60ch] mb-4">
                            O Lusorae é uma rede social portuguesa. Não somos uma fábrica de atenção. Não somos pagos
                            por quantos minutos passas aqui. Estas seis promessas não são marketing — são regras de
                            engenharia de produto. Se algum dia as quebrarmos, podes lembrar-nos aqui.
                        </p>
                    </Reveal>
                </div>
            </div>

            {/* ═══ STATS STRIP ═══ */}
            <div className="max-w-[1100px] mx-auto px-4 lg:px-8 py-10 lg:py-14">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12 py-8 px-6 rounded-2xl bg-gradient-to-br from-black/[0.02] to-black/[0.04] border border-black/[0.05]">
                    {STATS.map((stat, idx) => (
                        <AnimatedStat key={idx} {...stat} delay={idx * 0.1} />
                    ))}
                </div>
            </div>

            {/* ═══ PROMISES ═══ */}
            <div className="max-w-[1100px] mx-auto px-4 lg:px-8 py-8">
                <Reveal>
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 rounded-xl bg-black grid place-items-center">
                            <Heart size={18} className="text-white" strokeWidth={2} />
                        </div>
                        <div>
                            <h2 className="font-display text-[22px] font-bold tracking-tight text-black">As 6 promessas</h2>
                            <p className="text-[13px] text-black/45">Regras de engenharia, não marketing</p>
                        </div>
                    </div>
                </Reveal>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {PROMISES.map((promise, idx) => (
                        <PromiseCard key={promise.n} {...promise} delay={idx * 0.08} />
                    ))}
                </div>
            </div>

            {/* ═══ CINEMATIC IMAGE BREAK ═══ */}
            <div className="max-w-[1100px] mx-auto px-4 lg:px-8 py-10">
                <Reveal>
                    <figure
                        data-testid="manifesto-image"
                        className="relative rounded-3xl overflow-hidden isolate aspect-[16/9] sm:aspect-[21/9] shadow-2xl shadow-black/10"
                    >
                        {/* Gradient placeholder */}
                        <div className="absolute inset-0 bg-gradient-to-br from-gray-800 via-gray-700 to-gray-900" />

                        <img
                            src="/hero/manifesto.webp"
                            alt="Pessoa contemplativa ao pôr-do-sol sobre o Tejo, em Lisboa"
                            className="absolute inset-0 w-full h-full object-cover"
                            loading="lazy"
                            onError={(e) => { e.target.style.display = "none"; }}
                        />

                        <div
                            className="absolute inset-0"
                            style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.10) 0%, rgba(0,0,0,0.06) 30%, rgba(0,0,0,0.75) 100%)" }}
                            aria-hidden
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-violet-900/10 to-transparent" aria-hidden />

                        <figcaption className="absolute inset-x-0 bottom-0 p-6 sm:p-10">
                            <p className="text-[10.5px] uppercase tracking-[0.2em] text-white/55 font-mono mb-3 font-semibold">
                                A regra silenciosa
                            </p>
                            <h2 className="font-display text-[26px] sm:text-[40px] lg:text-[50px] leading-[1.0] tracking-tight text-white max-w-[18ch]">
                                O tempo que passas aqui <span className="silver-foil">é teu</span>.{" "}
                                Não nosso.
                            </h2>
                        </figcaption>
                    </figure>
                </Reveal>
            </div>

            {/* ═══ GOLDEN RULE SECTION ═══ */}
            <div className="max-w-[1100px] mx-auto px-4 lg:px-8 py-10">
                <Reveal>
                    <div className="relative rounded-3xl border border-black/[0.08] p-8 lg:p-10 bg-gradient-to-br from-white to-amber-50/30 overflow-hidden">
                        <div className="absolute top-4 right-4 opacity-[0.04]">
                            <Quote size={80} strokeWidth={1} />
                        </div>

                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 grid place-items-center">
                                    <Quote size={18} className="text-amber-700" strokeWidth={2} />
                                </div>
                                <p className="text-[12px] uppercase tracking-[0.14em] text-black/40 font-mono font-semibold">
                                    A regra interna que aplicamos a cada feature nova
                                </p>
                            </div>

                            <blockquote className="font-display text-[24px] lg:text-[32px] leading-[1.2] tracking-tight text-black max-w-[40ch] mb-6">
                                "Se fechasses a app agora e voltasses amanhã, sentir-te-ias{" "}
                                <em className="bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent not-italic font-bold">melhor</em>{" "}
                                ou{" "}
                                <em className="bg-gradient-to-r from-red-500 to-pink-500 bg-clip-text text-transparent not-italic font-bold">pior</em>{" "}
                                contigo próprio?"
                            </blockquote>

                            <div className="w-16 h-[2px] bg-gradient-to-r from-amber-400 to-transparent rounded-full mb-5" />

                            <p className="text-[14px] text-black/55 max-w-[58ch] leading-relaxed">
                                Se a resposta honesta for "pior", a feature não é lançada. É a única razão por que muitos dos
                                padrões da indústria não existem aqui.
                            </p>
                        </div>
                    </div>
                </Reveal>
            </div>

            {/* ═══ WHY DIFFERENT SECTION ═══ */}
            <div className="max-w-[1100px] mx-auto px-4 lg:px-8 py-10">
                <Reveal>
                    <div className="grid md:grid-cols-3 gap-4">
                        {[
                            {
                                icon: Shield,
                                title: "Sem anúncios",
                                desc: "Não vendemos a tua atenção. O nosso modelo é premium: quem paga é quem usa — não anunciantes.",
                                gradient: "from-emerald-50 to-teal-50",
                                iconBg: "bg-emerald-100",
                                iconColor: "text-emerald-700",
                            },
                            {
                                icon: Users,
                                title: "Feito em Portugal",
                                desc: "Equipa portuguesa, servidores europeus, dados protegidos pelo RGPD. Sem dependência de Big Tech.",
                                gradient: "from-blue-50 to-indigo-50",
                                iconBg: "bg-blue-100",
                                iconColor: "text-blue-700",
                            },
                            {
                                icon: Heart,
                                title: "Pessoas, não métricas",
                                desc: "Não otimizamos por tempo de ecrã. Otimizamos por qualidade de conexão e satisfação real.",
                                gradient: "from-pink-50 to-rose-50",
                                iconBg: "bg-pink-100",
                                iconColor: "text-pink-700",
                            },
                        ].map((item, idx) => {
                            const Icon = item.icon;
                            return (
                                <Reveal key={idx} delay={idx * 0.1}>
                                    <div className={`group rounded-2xl p-6 bg-gradient-to-br ${item.gradient} border border-black/[0.04] hover:border-black/[0.08] hover:shadow-lg transition-all duration-200 h-full`}>
                                        <div className={`w-10 h-10 rounded-xl ${item.iconBg} grid place-items-center mb-4 group-hover:scale-105 transition-transform duration-200`}>
                                            <Icon size={18} className={item.iconColor} strokeWidth={2} />
                                        </div>
                                        <h3 className="font-bold text-[16px] text-black tracking-tight mb-2">{item.title}</h3>
                                        <p className="text-[13.5px] text-black/55 leading-relaxed">{item.desc}</p>
                                    </div>
                                </Reveal>
                            );
                        })}
                    </div>
                </Reveal>
            </div>

            {/* ═══ CTAs ═══ */}
            <div className="max-w-[1100px] mx-auto px-4 lg:px-8 py-8">
                <Reveal>
                    <div className="flex flex-wrap gap-3">
                        <Link
                            to="/legal"
                            data-testid="manifesto-cta-legal"
                            className="btn-obsidian text-[13px] inline-flex items-center gap-1.5"
                        >
                            Ver Centro Legal <ChevronRight size={14} />
                        </Link>
                        <Link
                            to="/settings"
                            data-testid="manifesto-cta-settings"
                            className="btn-silver text-[13px] inline-flex items-center gap-1.5"
                        >
                            Ajustar preferências <ExternalLink size={12} />
                        </Link>
                    </div>
                </Reveal>
            </div>

            {/* ═══ CONVERSION CTA ═══ */}
            <div className="max-w-[1100px] mx-auto px-4 lg:px-8 py-8">
                <Reveal>
                    <div
                        data-testid="manifesto-cta-register-card"
                        className="relative rounded-3xl p-8 sm:p-12 overflow-hidden isolate"
                        style={{ background: "linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)" }}
                    >
                        {/* Decorações estáticas — sem blur, sem animação */}
                        <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full opacity-20 pointer-events-none"
                             style={{ background: "radial-gradient(circle, rgba(236,72,153,0.5), transparent 70%)" }}
                             aria-hidden />
                        <div className="absolute -left-10 -bottom-10 w-60 h-60 rounded-full opacity-15 pointer-events-none"
                             style={{ background: "radial-gradient(circle, rgba(139,92,246,0.5), transparent 70%)" }}
                             aria-hidden />

                        <div className="absolute inset-0 opacity-[0.03]"
                             style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "30px 30px" }}
                             aria-hidden />

                        <div className="relative z-10">
                            <p className="text-[10.5px] uppercase tracking-[0.2em] text-white/45 font-mono mb-4 font-semibold">
                                Se chegaste aqui
                            </p>
                            <h3 className="font-display text-[28px] sm:text-[38px] lg:text-[44px] leading-[1.05] tracking-tight text-white max-w-[22ch] mb-5">
                                Então já percebeste que isto{" "}
                                <span className="silver-foil">é diferente</span>.
                            </h3>
                            <p className="text-[14.5px] text-white/65 leading-relaxed max-w-[52ch] mb-8">
                                Cria conta em 60 segundos. Sem cartão. Sem trial. Sem dark patterns. Se um dia mudarmos
                                este manifesto, vais ser o primeiro a saber — e a poder ir embora.
                            </p>
                            <div className="flex flex-wrap items-center gap-4">
                                <Link
                                    to="/register"
                                    data-testid="manifesto-cta-register"
                                    className="inline-flex items-center gap-2 bg-white text-black font-semibold text-[14px] px-6 py-3.5 rounded-full hover:bg-white/90 hover:shadow-xl hover:shadow-white/10 transition-all duration-200 tap-shrink group"
                                >
                                    Criar conta gratuita
                                    <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform duration-200" />
                                </Link>
                                <Link
                                    to="/login"
                                    data-testid="manifesto-cta-login"
                                    className="inline-flex items-center text-[13.5px] font-medium text-white/70 hover:text-white transition-colors underline underline-offset-4 decoration-white/20 hover:decoration-white/50"
                                >
                                    Já tenho conta
                                </Link>
                            </div>
                        </div>
                    </div>
                </Reveal>
            </div>

            {/* ═══ FOOTER NOTE ═══ */}
            <div className="max-w-[1100px] mx-auto px-4 lg:px-8 pb-12 pt-4">
                <Reveal>
                    <p className="text-[12px] text-black/35 leading-relaxed border-t border-black/[0.06] pt-6">
                        Este manifesto é um documento vivo, atualizado publicamente sempre que mudar. As versões anteriores
                        ficam no histórico, com data de revisão visível.
                    </p>
                </Reveal>
            </div>
        </div>
    );
}
