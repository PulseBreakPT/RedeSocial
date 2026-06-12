// =============================================================================
// DESIGN SYSTEM: LUSORAE EDITORIAL, ver /src/theme/EDITORIAL.md
// Manifesto público, agora dentro do shell editorial uniforme do Centro Legal.
// Conteúdo intacto: 6 promessas, stats institucionais, regra de ouro,
// três razões concretas e CTA final.
// =============================================================================
import { Link } from "react-router-dom";
import {
    Moon, Bell, Sparkles, Cog, EyeOff, MailCheck,
    Shield, Heart, Users, ArrowRight, Quote,
} from "lucide-react";
import { LegalShell } from "./legal/LegalShell";
import { LegalKPIs, LegalRightsGrid, LegalVisualBlock } from "./legal/_visuals";
import { PT } from "../theme/editorial";

const PROMISES = [
    {
        title: "Sem streaks que punam.",
        desc: "Não vais perder nada por não abrires um dia. Não há chamas a contar dias consecutivos. Não há contrato emocional bilateral imposto pela aplicação.",
        ref: "Anti-padrão Snapchat / TikTok",
        icon: Moon,
    },
    {
        title: "Modo Boa Noite, por defeito.",
        desc: "Entre as 23h00 e as 08h00 as notificações ficam silenciadas. Não te empurramos para acordado. Tu decides se queres opt-in.",
        ref: "Saúde mental > engagement",
        icon: Bell,
    },
    {
        title: "Sem agrupar notificações para fingir urgência.",
        desc: "Cada notificação tem uma razão clara. Não somamos likes nem comentários só para fabricar a sensação de urgência.",
        ref: "Anti-padrão Facebook",
        icon: Sparkles,
    },
    {
        title: "Algoritmo destacável e feed cronológico.",
        desc: "Tens sempre uma versão não personalizada do feed. Podes reiniciar a tua bolha. Cumprimento integral do artigo 27.º do DSA.",
        ref: "Reg. UE 2022/2065 · DSA art. 27",
        icon: Cog,
    },
    {
        title: "Sem read receipts forçados.",
        desc: "Nas mensagens, o emissor não sabe se leste. Read receipts são opt-in mútuo e opcionais por conversa.",
        ref: "Anti-padrão WhatsApp",
        icon: MailCheck,
    },
    {
        title: "Contagens escondidas nos teus próprios posts.",
        desc: "Vês quem reagiu, mas o número fica esbatido até carregares. Não queremos comparação compulsiva contigo próprio.",
        ref: "Anti-padrão Instagram",
        icon: EyeOff,
    },
];

const WHY_DIFFERENT = [
    {
        title: "Sem anúncios.",
        desc: "Não vendemos a tua atenção. O nosso modelo é premium: quem paga é quem usa, não anunciantes que nos contratam para vender olhares.",
        ref: "Modelo · Premium",
        icon: Shield,
    },
    {
        title: "Feito em Portugal.",
        desc: "Equipa portuguesa, servidores europeus, dados protegidos pelo RGPD. Sem dependência de Big Tech para a infraestrutura crítica.",
        ref: "Soberania técnica",
        icon: Users,
    },
    {
        title: "Pessoas, não métricas.",
        desc: "Não otimizamos por tempo de ecrã. Otimizamos por qualidade de conexão e satisfação real reportada pelos utilizadores.",
        ref: "North Star · Bem-estar",
        icon: Heart,
    },
];

export default function Manifesto() {
    return (
        <LegalShell
            active="manifesto"
            title="O nosso Manifesto"
            subtitle="Não te queremos viciado. Queremos-te bem. Estas seis promessas não são marketing, são regras de engenharia de produto. Se algum dia as quebrarmos, podes lembrar-nos aqui."
            lastUpdated="Junho de 2026"
            eli5="Sem streaks. Boa Noite por defeito. Sem urgência inventada nas notificações. Feed cronológico sempre disponível. Read receipts opcionais. Contagens esbatidas. Em conformidade com o DSA."
        >
            <LegalKPIs items={[
                { value: "0",    label: "anúncios mostrados",          sub: "Nunca. Não é um plano.",       icon: Shield },
                { value: "0",    label: "dados vendidos a terceiros",  sub: "Compromisso vinculativo",       icon: EyeOff },
                { value: "6",    label: "promessas públicas",          sub: "Regras de engenharia",          icon: Sparkles },
                { value: "100%", label: "transparência de código",     sub: "Auditoria anual",                icon: Cog },
            ]} />

            <h2>Porque escrevemos isto</h2>
            <p>
                A maior parte das redes sociais foi desenhada para uma coisa muito simples: prender a tua atenção o
                máximo de tempo possível, para a vender a anunciantes. Tudo o que vês, o feed, as notificações,
                os contadores, a forma como o conteúdo aparece e desaparece, foi otimizado nessa direção. O
                resultado é conhecido: ansiedade, polarização, exaustão e uma certa pobreza no que se conversa.
            </p>
            <p>
                O Lusorae existe para experimentar uma alternativa. Não temos a vaidade de pensar que somos os
                primeiros a tentar, mas queremos ser dos que tentam com honestidade. As seis promessas que se
                seguem são as regras concretas que aplicamos antes de lançar qualquer funcionalidade. Não são
                vontade boa. São critérios.
            </p>

            <h2>As seis promessas</h2>
            <LegalVisualBlock eyebrow="Núcleo público, anti-dark-pattern" title="Regras de engenharia que nos vinculam">
                <LegalRightsGrid items={PROMISES} />
            </LegalVisualBlock>

            <h2>A regra silenciosa que aplicamos antes de qualquer feature</h2>
            <p>
                Antes de uma funcionalidade entrar em produção, fazemos uma pergunta única. É a pergunta que filtra
                a maior parte do que a indústria normaliza:
            </p>
            <blockquote>
                Se fechasses a app agora e voltasses amanhã, sentir-te-ias <strong>melhor</strong> ou{" "}
                <strong>pior</strong> contigo próprio?
            </blockquote>
            <p>
                Se a resposta honesta for &ldquo;<strong>pior</strong>&rdquo;, a feature não é lançada. É a única razão por que
                muitos dos padrões da indústria (streaks coercivos, badges de urgência inventada, scroll
                infinito sem pausas naturais, conteúdo escondido propositadamente para provocar regresso compulsivo)
                simplesmente não existem aqui.
            </p>

            <h2>Três razões concretas</h2>
            <LegalVisualBlock eyebrow="Porque somos diferentes" title="Sem anúncios. Em Portugal. Para pessoas.">
                <LegalRightsGrid items={WHY_DIFFERENT} />
            </LegalVisualBlock>

            <h2>O que isto não é</h2>
            <p>
                Este manifesto não é uma <em>cláusula de estilo</em>. Não é um <em>brand statement</em>. Não é uma
                forma elegante de dizer que somos &ldquo;humanos&rdquo; enquanto fazemos o mesmo que toda a gente.
                É a versão pública de um documento que existe internamente, que serve para travar produto, e que
                pode ser citado em reuniões para parar uma decisão.
            </p>
            <p>
                Se um dia quebrarmos uma destas promessas, ficamos obrigados a três coisas, nesta ordem:{" "}
                <strong>reconhecer publicamente</strong>, <strong>corrigir tecnicamente</strong>,{" "}
                <strong>documentar</strong>. As versões anteriores deste manifesto ficam acessíveis em histórico,
                com data e diff visível.
            </p>

            <h2>Como nos podes responsabilizar</h2>
            <p>
                Se observares uma decisão de produto, de notificação, de feed ou de moderação que pareça contradizer
                qualquer uma das seis promessas, queremos saber. Escreve para{" "}
                <a href="mailto:apoio@lusorae.pt">apoio@lusorae.pt</a> ou, para questões mais formais, para{" "}
                <a href="mailto:legal@lusorae.pt">legal@lusorae.pt</a>. Não garantimos resposta a tudo, mas
                garantimos leitura, e tratamento interno como sinalização contra estas promessas.
            </p>
            <p>
                Para perceberes como estas promessas se relacionam com tudo o resto do Lusorae, vê{" "}
                <Link to="/legal/vision">A nossa visão</Link>, o documento que reúne os seis compromissos
                institucionais que dão coerência a todo o Centro Legal.
            </p>

            {/* CTA final, coerente com o estilo dos outros documentos legais */}
            <div
                className="not-prose mt-12 mb-6 px-6 sm:px-8 py-7 sm:py-8 relative overflow-hidden"
                data-testid="manifesto-cta-register-card"
                style={{
                    background: `linear-gradient(135deg, ${PT.red} 0%, #B0001F 100%)`,
                    color: "#fff",
                    border: "1px solid rgba(10,10,10,0.10)",
                    boxShadow: "0 1px 2px rgba(10,10,10,0.06), 0 32px 64px -28px rgba(200,16,46,0.55), 0 12px 28px -12px rgba(10,10,10,0.18)",
                    borderRadius: 20,
                }}
            >
                <div className="absolute -top-2 -right-2 opacity-[0.10] pointer-events-none" aria-hidden>
                    <Quote size={130} strokeWidth={1} style={{ color: "#fff" }} />
                </div>
                <div className="relative z-10">
                    <span
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 mb-4 text-[10.5px] font-bold uppercase"
                        style={{
                            background: "rgba(255,204,41,0.22)",
                            color: PT.gold,
                            borderRadius: 999,
                            letterSpacing: "0.20em",
                        }}
                    >
                        Se chegaste até aqui
                    </span>
                    <h3
                        className="font-black tracking-[-0.025em] max-w-[26ch] mb-4"
                        style={{ fontSize: "clamp(22px, 3.6vw, 36px)", lineHeight: 1.08 }}
                    >
                        Então já percebeste que isto é diferente.
                    </h3>
                    <p className="text-[14px] sm:text-[14.5px] leading-relaxed max-w-[54ch] mb-6 font-medium" style={{ color: "rgba(255,255,255,0.88)" }}>
                        Cria conta em 60 segundos. Sem cartão. Sem trial. Sem dark patterns. Se um dia mudarmos este
                        manifesto, vais ser dos primeiros a saber, e a poder ir embora.
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                        <Link
                            to="/register"
                            data-testid="manifesto-cta-register"
                            className="inline-flex items-center gap-2 font-bold text-[13.5px] px-5 py-2.5 group transition-transform hover:-translate-y-0.5"
                            style={{
                                background: PT.gold,
                                color: PT.ink,
                                letterSpacing: "-0.005em",
                                borderRadius: 999,
                                boxShadow: "0 12px 30px -12px rgba(255,204,41,0.65), inset 0 1px 0 rgba(255,255,255,0.30)",
                            }}
                        >
                            Criar conta gratuita
                            <ArrowRight size={15} strokeWidth={2.2} className="group-hover:translate-x-1 transition-transform duration-200" />
                        </Link>
                        <Link
                            to="/login"
                            data-testid="manifesto-cta-login"
                            className="inline-flex items-center text-[13px] font-semibold underline underline-offset-4 decoration-[1.5px]"
                            style={{ color: "rgba(255,255,255,0.85)", letterSpacing: "-0.005em", textDecorationColor: "rgba(255,255,255,0.30)" }}
                        >
                            Já tenho conta
                        </Link>
                    </div>
                </div>
            </div>
        </LegalShell>
    );
}
