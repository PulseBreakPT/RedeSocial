// =============================================================================
// DESIGN SYSTEM: LUSORAE EDITORIAL, ver /src/theme/EDITORIAL.md
// Manifesto público, agora dentro do shell editorial uniforme do Centro Legal.
// Conteúdo intacto: 6 promessas, stats institucionais, regra de ouro,
// três razões concretas e CTA final.
// =============================================================================
import { Link } from "react-router-dom";
import {
    Moon, Bell, Sparkles, Cog, EyeOff, MailCheck,
    Shield, Heart, Users,
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
        title: "Feed único, cronológico, sem “Para ti”.",
        desc: "Não separamos “Seguindo” e “Para ti”. Tens um único stream cronológico onde os conteúdos de quem segues e os sinais de relevância vivem lado a lado, sem silos algorítmicos a escolherem por ti. Cumprimento integral do artigo 27.º do DSA — a versão não personalizada é o próprio default.",
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
            eli5="Sem streaks. Boa Noite por defeito. Sem urgência inventada nas notificações. Feed único cronológico (sem &lsquo;Para ti&rsquo;). Read receipts opcionais. Contagens esbatidas. Em conformidade com o DSA."
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

            <p
                className="not-prose mt-12 mb-8 text-center text-[14px] font-medium"
                style={{ color: "rgba(10,10,10,0.55)" }}
            >
                Se este manifesto soa a algo que valha a pena experimentar,{" "}
                <Link
                    to="/register"
                    data-testid="manifesto-cta-register"
                    className="font-bold underline underline-offset-4 decoration-[2px]"
                    style={{ color: PT.red, textDecorationColor: "rgba(200,16,46,0.35)" }}
                >
                    podes criar conta aqui
                </Link>
                {" "}<span aria-hidden>→</span>
            </p>
        </LegalShell>
    );
}
