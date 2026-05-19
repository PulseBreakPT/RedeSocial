import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, Moon, Bell, Sparkles, Cog, EyeOff, MailCheck } from "lucide-react";

// Cinematic Portuguese hero — contemplative scene by the Tagus.
// Visual embodiment of the manifesto's core line: "Queremos-te bem."
const MANIFESTO_IMAGE =
    "/hero/manifesto.jpg";

/**
 * /manifesto — public page declaring the 6 anti-dark-pattern promises.
 * Brand differentiator. Linked from /legal footer and Settings.
 */
const PROMISES = [
    {
        n: "01",
        icon: Moon,
        title: "Sem streaks que punam.",
        body:
            "Não vais perder nada por não abrires um dia. Não há chamas a contar dias. Não há contrato emocional bilateral.",
        ref: "Anti-padrão Snapchat / TikTok",
    },
    {
        n: "02",
        icon: Bell,
        title: "Modo Boa Noite — por defeito.",
        body:
            "Entre as 23h00 e as 08h00 as notificações ficam silenciadas. Não te empurramos para acordado. Tu decides se queres opt-in.",
        ref: "Saúde mental > engagement",
    },
    {
        n: "03",
        icon: Sparkles,
        title: "Sem agrupar notificações para fingir urgência.",
        body:
            "Cada notificação tem 1 razão clara. Não somamos likes para empurrar com falsa urgência.",
        ref: "Anti-padrão Facebook",
    },
    {
        n: "04",
        icon: Cog,
        title: "Algoritmo destacável e feed cronológico.",
        body:
            "Tens sempre uma versão não personalizada do feed. Podes resetar a tua bolha. Cumprimento integral do art. 27.º do DSA.",
        ref: "Reg. UE 2022/2065",
    },
    {
        n: "05",
        icon: MailCheck,
        title: "Sem read receipts forçados.",
        body:
            "Nas mensagens, o emissor não sabe se leste. Read receipts são opt-in mútuo, e mesmo assim opcionais por conversa.",
        ref: "Anti-padrão WhatsApp",
    },
    {
        n: "06",
        icon: EyeOff,
        title: "Contagens escondidas nos teus próprios posts.",
        body:
            "Vês quem reagiu, mas o número está esbatido até carregares. Não queremos comparação compulsiva contigo próprio.",
        ref: "Anti-padrão Instagram",
    },
];

export default function Manifesto() {
    const navigate = useNavigate();
    return (
        <div className="min-h-screen bg-white text-black">
            <header className="sticky top-0 z-30 glass border-b border-black/[0.06]">
                <div className="max-w-[1100px] mx-auto flex items-center gap-3 px-4 lg:px-8 py-3">
                    <button
                        onClick={() => navigate(-1)}
                        data-testid="manifesto-back-btn"
                        className="w-9 h-9 rounded-full grid place-items-center text-black hover:bg-black/[0.06] tap-shrink"
                        aria-label="Voltar"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <Link to="/" className="inline-flex items-center gap-2" data-testid="manifesto-home-link">
                        <span aria-hidden className="w-2.5 h-2.5 rotate-45 bg-black rounded-[2px]" />
                        <span className="font-display text-[17px] font-bold tracking-tight">lusorae</span>
                    </Link>
                    <span className="ml-2 hidden sm:inline text-[11px] uppercase tracking-[0.14em] text-black/45 font-mono">
                        Manifesto
                    </span>
                </div>
            </header>

            <div className="max-w-[1100px] mx-auto px-4 lg:px-8 py-10 lg:py-16">
                <p className="text-[11px] uppercase tracking-[0.18em] text-black/45 font-mono mb-4">
                    Compromisso público
                </p>
                <h1
                    data-testid="manifesto-title"
                    className="font-editorial text-[44px] sm:text-[64px] lg:text-[84px] font-normal italic tracking-tight leading-[1.0] text-black max-w-[15ch]"
                    style={{ fontVariationSettings: '"opsz" 144', fontWeight: 380 }}
                >
                    Não te queremos viciado. <span className="not-italic font-display font-bold text-black/85" style={{ fontVariationSettings: 'normal' }}>Queremos-te bem.</span>
                </h1>
                <p className="mt-6 text-[16px] lg:text-[18px] text-black/70 leading-relaxed max-w-[60ch]">
                    O Lusorae é uma rede social portuguesa. Não somos uma fábrica de atenção. Não somos pagos
                    por quantos minutos passas aqui. Estas seis promessas não são marketing — são regras de
                    engenharia de produto. Se algum dia as quebrarmos, podes lembrar-nos aqui.
                </p>

                <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {PROMISES.map(({ n, icon: Icon, title, body, ref }) => (
                        <article
                            key={n}
                            data-testid={`promise-${n}`}
                            className="rounded-2xl border border-black/[0.08] p-5 hover:border-black/30 transition bg-white"
                        >
                            <div className="flex items-start gap-3.5">
                                <div className="w-10 h-10 rounded-xl bg-black/[0.04] grid place-items-center text-black shrink-0">
                                    <Icon size={18} strokeWidth={1.7} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-baseline gap-2.5 mb-1">
                                        <span className="font-mono text-[11px] text-black/45 tracking-wider">{n}</span>
                                        <h3 className="font-semibold text-[15.5px] tracking-tight text-black leading-snug">
                                            {title}
                                        </h3>
                                    </div>
                                    <p className="text-[13.5px] leading-relaxed text-black/65">{body}</p>
                                    <p className="mt-2.5 text-[10.5px] uppercase tracking-[0.10em] text-black/40 font-mono">
                                        {ref}
                                    </p>
                                </div>
                            </div>
                        </article>
                    ))}
                </div>

                {/* Cinematic visual break — embodies "Queremos-te bem" */}
                <figure
                    data-testid="manifesto-image"
                    className="mt-14 relative rounded-2xl overflow-hidden isolate aspect-[16/9] sm:aspect-[21/9]"
                >
                    <img
                        src={MANIFESTO_IMAGE}
                        alt="Pessoa contemplativa ao pôr-do-sol sobre o Tejo, em Lisboa"
                        className="absolute inset-0 w-full h-full object-cover"
                        loading="lazy"
                    />
                    <div
                        className="absolute inset-0"
                        style={{
                            background:
                                "linear-gradient(180deg, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.10) 40%, rgba(0,0,0,0.78) 100%)",
                        }}
                        aria-hidden
                    />
                    <figcaption className="absolute inset-x-0 bottom-0 p-6 sm:p-10">
                        <p className="text-[10.5px] uppercase tracking-[0.18em] text-white/65 font-mono mb-2.5">
                            A regra silenciosa
                        </p>
                        <h2 className="font-display text-[28px] sm:text-[42px] lg:text-[52px] leading-[1.0] tracking-tight text-white max-w-[18ch]">
                            O tempo que passas aqui <span className="silver-foil">é teu</span>.{" "}
                            Não nosso.
                        </h2>
                    </figcaption>
                </figure>

                <div className="mt-14 rounded-2xl border border-black/[0.10] p-6 bg-paper grain isolate">
                    <p className="text-[13px] uppercase tracking-[0.12em] text-black/45 font-mono mb-3">
                        A regra interna que aplicamos a cada feature nova
                    </p>
                    <blockquote className="font-display text-[24px] lg:text-[30px] leading-[1.2] tracking-tight text-black max-w-[40ch]">
                        “Se fechasses a app agora e voltasses amanhã, sentir-te-ias <em>melhor</em> ou <em>pior</em>{" "}
                        contigo próprio?”
                    </blockquote>
                    <p className="mt-5 text-[13.5px] text-black/60 max-w-[58ch] leading-relaxed">
                        Se a resposta honesta for “pior”, a feature não é lançada. É a única razão por que muitos dos
                        padrões da indústria não existem aqui.
                    </p>
                </div>

                <div className="mt-12 flex flex-wrap gap-3">
                    <Link
                        to="/legal"
                        data-testid="manifesto-cta-legal"
                        className="btn-obsidian text-[13px]"
                    >
                        Ver Centro Legal
                    </Link>
                    <Link
                        to="/settings"
                        data-testid="manifesto-cta-settings"
                        className="btn-silver text-[13px]"
                    >
                        Ajustar preferências
                    </Link>
                </div>

                {/* High-conversion closing CTA — converts manifesto-readers into accounts */}
                <div
                    data-testid="manifesto-cta-register-card"
                    className="mt-10 rounded-2xl p-7 sm:p-10 bg-black text-white relative overflow-hidden isolate"
                >
                    <div
                        className="absolute -right-20 -top-20 w-72 h-72 rounded-full opacity-25 blur-3xl pointer-events-none"
                        style={{ background: "radial-gradient(circle, var(--coral-500), transparent 70%)" }}
                        aria-hidden
                    />
                    <p className="text-[10.5px] uppercase tracking-[0.18em] text-white/55 font-mono mb-3">
                        Se chegaste aqui
                    </p>
                    <h3 className="font-display text-[28px] sm:text-[38px] leading-[1.05] tracking-tight text-white max-w-[22ch]">
                        Então já percebeste que isto <span className="silver-foil">é diferente</span>.
                    </h3>
                    <p className="mt-4 text-[14px] text-white/75 leading-relaxed max-w-[52ch]">
                        Cria conta em 60 segundos. Sem cartão. Sem trial. Sem dark patterns. Se um dia mudarmos
                        este manifesto, vais ser o primeiro a saber — e a poder ir embora.
                    </p>
                    <div className="mt-7 flex flex-wrap items-center gap-3">
                        <Link
                            to="/register"
                            data-testid="manifesto-cta-register"
                            className="inline-flex items-center gap-1.5 bg-white text-black font-semibold text-[13.5px] px-5 py-3 rounded-full hover:bg-white/90 transition tap-shrink"
                        >
                            Criar conta gratuita <ArrowRight size={14} />
                        </Link>
                        <Link
                            to="/login"
                            data-testid="manifesto-cta-login"
                            className="inline-flex items-center text-[13px] font-medium text-white/80 hover:text-white underline underline-offset-4"
                        >
                            Já tenho conta
                        </Link>
                    </div>
                </div>

                <p className="mt-16 text-[12px] text-black/45 leading-relaxed border-t border-black/[0.06] pt-6">
                    Este manifesto é um documento vivo, atualizado publicamente sempre que mudar. As versões anteriores
                    ficam no histórico, com data de revisão visível.
                </p>
            </div>
        </div>
    );
}
