import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    ArrowLeft, ArrowUp, Check, Cookie, FileText,
    ListTree, Printer, Scale, ShieldCheck, Share2, Sparkle,
} from "lucide-react";
import { PT, Sticker, Kicker, AuthStyles,
    DoodleStar, DoodleSparkles, DoodleScribble, DoodleSpiral,
    DoodleZigzag, DoodleCross, DoodleUnderline, GiantAsterisk,
} from "../auth/AuthDecor";
import SiteFooter from "../../components/SiteFooter";

const NAV = [
    { to: "/legal",            label: "Visão geral",            short: "Visão",       icon: Scale,        key: "index" },
    { to: "/legal/terms",      label: "Termos e Condições",     short: "Termos",      icon: FileText,     key: "terms" },
    { to: "/legal/privacy",    label: "Política de Privacidade",short: "Privacidade", icon: ShieldCheck,  key: "privacy" },
    { to: "/legal/cookies",    label: "Política de Cookies",    short: "Cookies",     icon: Cookie,       key: "cookies" },
    { to: "/legal/community",  label: "Diretrizes",             short: "Diretrizes",  icon: Sparkle,      key: "community" },
];

function slugify(s) {
    return (s || "")
        .toString()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 80);
}

/**
 * Shell layout for legal pages.
 * Editorial design with:
 *  · Reading progress bar
 *  · Sticky left sidebar (document switcher)
 *  · Sticky right rail (Table of Contents w/ scroll-spy)
 *  · Auto-numbered h2 sections
 *  · Share / print / back-to-top actions
 *  · Fully responsive (single-column on mobile, 3-column on desktop)
 */
export function LegalShell({ title, subtitle, lastUpdated, eli5, children, active }) {
    const navigate = useNavigate();
    const articleRef = useRef(null);
    const [toc, setToc] = useState([]);
    const [activeId, setActiveId] = useState(null);
    const [progress, setProgress] = useState(0);
    const [copied, setCopied] = useState(false);

    // Build TOC + add section numbers + IDs after render
    useEffect(() => {
        if (!articleRef.current) return;
        const root = articleRef.current;
        const h2s = root.querySelectorAll(".prose-legal > h2");
        const items = [];
        h2s.forEach((h, i) => {
            // Extract clean label (excluding any sec-n badge already injected)
            const clone = h.cloneNode(true);
            clone.querySelectorAll(".sec-n, .anchor-link").forEach((n) => n.remove());
            const baseText = clone.textContent.trim().replace(/^\d+\.\s*/, "");

            const id = slugify(baseText) || `sec-${i + 1}`;
            h.id = id;

            // Strip any pre-existing "N. " prefix from the rendered h2 (we use sec-n badge instead)
            if (!h.dataset.numberStripped) {
                const firstNode = h.firstChild;
                if (firstNode && firstNode.nodeType === Node.TEXT_NODE) {
                    firstNode.nodeValue = firstNode.nodeValue.replace(/^\s*\d+\.\s*/, "");
                }
                h.dataset.numberStripped = "1";
            }

            // Inject section number badge once
            if (!h.querySelector(".sec-n")) {
                const n = document.createElement("span");
                n.className = "sec-n";
                n.textContent = String(i + 1).padStart(2, "0");
                h.prepend(n);
            }

            items.push({ id, label: baseText, level: 2 });
        });
        setToc(items);
        // Reset spy state on doc change
        if (items.length) setActiveId(items[0].id);
    }, [children]);

    // Reading progress
    useEffect(() => {
        const onScroll = () => {
            const el = articleRef.current;
            if (!el) return;
            const rect = el.getBoundingClientRect();
            const total = el.offsetHeight - window.innerHeight + 200;
            const passed = Math.min(Math.max(-rect.top + 200, 0), Math.max(total, 1));
            setProgress(Math.min(100, (passed / Math.max(total, 1)) * 100));
        };
        onScroll();
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, [toc]);

    // Scroll-spy via IntersectionObserver
    useEffect(() => {
        if (!toc.length) return;
        const observer = new IntersectionObserver(
            (entries) => {
                const visible = entries
                    .filter((e) => e.isIntersecting)
                    .sort((a, b) => a.target.getBoundingClientRect().top - b.target.getBoundingClientRect().top);
                if (visible[0]) setActiveId(visible[0].target.id);
            },
            { rootMargin: "-25% 0px -60% 0px", threshold: [0, 1] }
        );
        toc.forEach((it) => {
            const el = document.getElementById(it.id);
            if (el) observer.observe(el);
        });
        return () => observer.disconnect();
    }, [toc]);

    const onShare = async () => {
        const url = window.location.href;
        try {
            if (navigator.share) {
                await navigator.share({ title: `Lusorae · ${title}`, url });
            } else {
                await navigator.clipboard.writeText(url);
                setCopied(true);
                setTimeout(() => setCopied(false), 1800);
            }
        } catch { /* user dismissed */ }
    };

    const onPrint = () => window.print();
    const scrollTop = () => window.scrollTo({ top: 0, behavior: "smooth" });

    const eyebrow = NAV.find((n) => n.key === active)?.label || "Documento legal";

    return (
        <div className="min-h-screen text-black relative overflow-hidden" style={{ background: PT.cream }}>
            {/* ============ DOODLES DECORATIVOS DE FUNDO ============ */}
            {/* Asterisco gigante esbatido — só visual, no canto superior direito */}
            <div className="absolute -top-16 -right-20 pointer-events-none opacity-[0.07] z-0 hidden sm:block" aria-hidden>
                <GiantAsterisk color={PT.red} size={320} rotate={-12} />
            </div>
            {/* Estrela dourada — topo direito sob o tape */}
            <div className="absolute top-20 right-3 sm:top-28 sm:right-8 pointer-events-none block opacity-60 scale-[0.55] sm:scale-100 sm:opacity-100 origin-top-right z-0" aria-hidden>
                <DoodleStar color={PT.gold} size={48} rotate={14} />
            </div>
            {/* Sparkles vermelho — superior esquerdo */}
            <div className="absolute top-28 left-3 sm:top-36 sm:left-6 pointer-events-none block opacity-60 scale-[0.55] sm:scale-100 sm:opacity-100 origin-top-left z-0" aria-hidden>
                <DoodleSparkles color={PT.red} size={44} rotate={-10} />
            </div>
            {/* Scribble azul — esquerda, próximo do topo do conteúdo */}
            <div className="absolute top-[420px] -left-3 sm:left-2 pointer-events-none block opacity-50 scale-[0.55] sm:scale-100 sm:opacity-90 origin-left z-0 hidden md:block" aria-hidden>
                <DoodleScribble color={PT.azul} w={130} h={50} style={{ transform: "rotate(-6deg)" }} />
            </div>
            {/* Spiral dourado — direita, ao nível do scribble */}
            <div className="absolute top-[520px] -right-2 sm:right-4 pointer-events-none block opacity-50 scale-[0.55] sm:scale-100 sm:opacity-90 origin-right z-0 hidden md:block" aria-hidden>
                <DoodleSpiral color={PT.gold} size={64} rotate={12} />
            </div>
            {/* Zigzag vermelho — inferior esquerdo */}
            <div className="absolute bottom-24 left-3 sm:bottom-32 sm:left-8 pointer-events-none block opacity-55 scale-[0.6] sm:scale-100 sm:opacity-90 origin-bottom-left z-0" aria-hidden>
                <DoodleZigzag color={PT.red} w={130} h={28} style={{ transform: "rotate(6deg)" }} />
            </div>
            {/* Underline dourado — inferior direito */}
            <div className="absolute bottom-32 right-3 sm:bottom-40 sm:right-10 pointer-events-none block opacity-55 scale-[0.6] sm:scale-100 sm:opacity-90 origin-bottom-right z-0" aria-hidden>
                <DoodleUnderline color={PT.gold} w={120} h={12} />
            </div>

            {/* Reading progress bar (mantida) */}
            <div
                className="legal-shell-progress fixed top-0 left-0 right-0 h-[3px] z-50 pointer-events-none"
                aria-hidden
                data-testid="legal-progress-bar"
            >
                <div
                    className="h-full transition-[width] duration-150 ease-out"
                    style={{ width: `${progress}%`, background: PT.red }}
                />
            </div>

            {/* TAPE topo poster — preto+dourado */}
            <div className="pt-tape h-3 w-full" />

            {/* Faixa "jornal" em INK */}
            <div
                className="flex items-center justify-between px-5 sm:px-8 py-2.5"
                style={{ background: PT.ink, color: PT.bone }}
            >
                <span className="font-mono text-[10.5px] sm:text-[11px] font-bold uppercase" style={{ letterSpacing: "0.20em", color: PT.gold }}>
                    LUSORAE // CENTRO LEGAL // EDIÇÃO Nº&nbsp;{new Date().getFullYear() % 100}
                </span>
                <span className="hidden md:inline font-mono text-[10.5px] font-bold uppercase" style={{ letterSpacing: "0.18em", color: "rgba(255,244,220,0.65)" }}>
                    RGPD · DSA · LEI Nº 58/2019
                </span>
            </div>

            {/* Top bar do shell (mantém ações: voltar, partilhar, imprimir) */}
            <header
                className="sticky top-0 z-30 backdrop-blur"
                style={{
                    background: "rgba(244,244,244,0.92)",
                    borderBottom: `3px solid ${PT.ink}`,
                }}
            >
                <div className="max-w-[1280px] mx-auto flex items-center gap-3 px-4 lg:px-8 py-3">
                    <button
                        onClick={() => navigate(-1)}
                        data-testid="legal-back-btn"
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
                    <Link to="/" className="inline-flex items-baseline gap-1.5 group" data-testid="legal-home-link">
                        <span aria-hidden style={{ color: PT.red, fontSize: 22, fontWeight: 900, lineHeight: 1 }}>✱</span>
                        <span className="text-[18px] font-black tracking-tight" style={{ color: PT.ink }}>lusorae</span>
                    </Link>
                    <span
                        className="ml-2 hidden sm:inline text-[11px] uppercase font-mono font-bold"
                        style={{ letterSpacing: "0.16em", color: PT.red }}
                    >
                        // CENTRO LEGAL
                    </span>
                    <div className="ml-auto flex items-center gap-2">
                        <Sticker bg={PT.gold} color={PT.ink} rotate={-3} style={{ fontSize: 10, padding: "5px 10px" }}>
                            🇵🇹 criado com ❤️ em Portugal
                        </Sticker>
                        <button
                            onClick={onShare}
                            data-testid="legal-share-btn"
                            className="hidden sm:inline-flex items-center gap-1.5 text-[11.5px] font-black uppercase px-3 py-2 tap-press"
                            style={{
                                background: "#fff", color: PT.ink, border: `2px solid ${PT.ink}`,
                                borderRadius: 999, boxShadow: `3px 3px 0 ${PT.ink}`, letterSpacing: "0.06em",
                            }}
                            aria-label="Partilhar"
                        >
                            {copied ? <Check size={13} /> : <Share2 size={13} />}
                            <span>{copied ? "Copiado" : "Partilhar"}</span>
                        </button>
                        <button
                            onClick={onPrint}
                            data-testid="legal-print-btn"
                            className="hidden sm:inline-flex items-center gap-1.5 text-[11.5px] font-black uppercase px-3 py-2 tap-press"
                            style={{
                                background: "#fff", color: PT.ink, border: `2px solid ${PT.ink}`,
                                borderRadius: 999, boxShadow: `3px 3px 0 ${PT.ink}`, letterSpacing: "0.06em",
                            }}
                            aria-label="Imprimir"
                        >
                            <Printer size={13} />
                            <span>Imprimir</span>
                        </button>
                    </div>
                </div>
            </header>

            <div className="max-w-[1280px] mx-auto px-4 lg:px-8 grid grid-cols-12 gap-6 lg:gap-10 py-6 lg:py-12 relative z-10">
                {/* Left sidebar — document switcher */}
                <aside className="legal-shell-sidebar col-span-12 lg:col-span-3 order-1">
                    <div className="lg:sticky lg:top-[80px]">
                        <Kicker color={PT.red} className="hidden lg:block mb-3 px-1">
                            // DOCUMENTOS
                        </Kicker>
                        <nav
                            data-testid="legal-doc-nav"
                            className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-visible no-scrollbar pb-1 -mx-1 lg:mx-0 px-1"
                        >
                            {NAV.map(({ to, label, short, icon: Icon, key }) => {
                                const isActive = active === key;
                                return (
                                    <Link
                                        key={key}
                                        to={to}
                                        data-testid={`legal-nav-${key}`}
                                        className="shrink-0 lg:shrink inline-flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] font-black uppercase transition"
                                        style={{
                                            background: isActive ? PT.ink : "#fff",
                                            color: isActive ? PT.gold : PT.ink,
                                            border: `2.5px solid ${PT.ink}`,
                                            borderRadius: 999,
                                            boxShadow: isActive ? `4px 4px 0 ${PT.red}` : `3px 3px 0 ${PT.ink}`,
                                            letterSpacing: "0.06em",
                                            transform: isActive ? "translate(-1px,-1px)" : "translate(0,0)",
                                        }}
                                    >
                                        <Icon size={15} strokeWidth={isActive ? 2.4 : 2} />
                                        <span className="whitespace-nowrap lg:hidden">{short}</span>
                                        <span className="whitespace-nowrap hidden lg:inline">{label}</span>
                                    </Link>
                                );
                            })}
                        </nav>
                        {lastUpdated && (
                            <div className="hidden lg:flex mt-6 px-2 items-center gap-2 text-[11px] font-mono font-bold" style={{ color: "rgba(10,10,10,0.55)" }}>
                                <span className="w-1.5 h-1.5 rounded-full" style={{ background: PT.green }} />
                                Atualizado · {lastUpdated}
                            </div>
                        )}
                    </div>
                </aside>

                {/* Main reading column */}
                <main className="col-span-12 lg:col-span-6 order-2 min-w-0">
                    <article ref={articleRef} className="max-w-[760px] relative">
                        {/* Doodle decorativo próximo ao título */}
                        <div className="absolute -top-2 -right-2 sm:-top-4 sm:-right-4 pointer-events-none block opacity-70 scale-[0.6] sm:scale-100 sm:opacity-100 origin-top-right z-0" aria-hidden>
                            <DoodleStar color={PT.red} size={38} rotate={18} />
                        </div>
                        <div className="flex items-center gap-3 mb-3">
                            <Kicker color={PT.red}>// {eyebrow}</Kicker>
                            <span aria-hidden style={{ flex: 1, height: 2, background: PT.ink }} />
                        </div>
                        <h1
                            data-testid="legal-title"
                            className="font-black tracking-[-0.04em]"
                            style={{ fontSize: "clamp(36px, 5vw, 64px)", lineHeight: 0.94, color: PT.ink }}
                        >
                            <span style={{
                                background: PT.gold,
                                padding: "0 0.10em",
                                boxShadow: `5px 5px 0 ${PT.ink}`,
                                display: "inline-block",
                                transform: "rotate(-1deg)",
                            }}>
                                {title}
                            </span>
                        </h1>
                        {subtitle && (
                            <p
                                className="mt-6 text-[15.5px] lg:text-[17px] leading-relaxed max-w-[64ch] font-medium"
                                style={{ color: "rgba(10,10,10,0.78)" }}
                                dangerouslySetInnerHTML={{ __html: subtitle }}
                            />
                        )}
                        <div className="mt-5 flex flex-wrap items-center gap-2">
                            {lastUpdated && (
                                <Sticker bg={PT.green} color="#fff" rotate={-2} style={{ fontSize: 10, padding: "5px 10px" }}>
                                    ✓ ATUALIZADO · {lastUpdated}
                                </Sticker>
                            )}
                            <Sticker bg="#fff" color={PT.ink} rotate={1} style={{ fontSize: 10, padding: "5px 10px" }}>
                                🇵🇹 PT-PT
                            </Sticker>
                            <Sticker bg={PT.azul} color="#fff" rotate={-1} style={{ fontSize: 10, padding: "5px 10px" }}>
                                RGPD · DSA
                            </Sticker>
                        </div>

                        {eli5 && (
                            <div
                                className="mt-8 px-5 py-4 relative"
                                data-testid="legal-eli5"
                                style={{
                                    background: PT.gold,
                                    color: PT.ink,
                                    border: `3px solid ${PT.ink}`,
                                    boxShadow: `5px 5px 0 ${PT.ink}`,
                                    transform: "rotate(-0.5deg)",
                                }}
                            >
                                <strong className="block font-black uppercase mb-1.5 text-[12px]" style={{ letterSpacing: "0.10em" }}>
                                    ⚡ EM DUAS LINHAS
                                </strong>
                                <span className="text-[14.5px] font-medium leading-relaxed">{eli5}</span>
                            </div>
                        )}

                        {/* Mobile TOC (collapsible) */}
                        {toc.length > 1 && (
                            <details
                                className="lg:hidden mt-7"
                                data-testid="legal-toc-mobile"
                                style={{
                                    background: "#fff",
                                    border: `3px solid ${PT.ink}`,
                                    boxShadow: `4px 4px 0 ${PT.ink}`,
                                }}
                            >
                                <summary className="flex items-center gap-2 cursor-pointer select-none px-4 py-3 text-[12.5px] font-black uppercase list-none" style={{ color: PT.ink, letterSpacing: "0.08em" }}>
                                    <ListTree size={14} strokeWidth={2.5} />
                                    Índice ({toc.length} secções)
                                </summary>
                                <ol className="px-4 pb-3 pt-1 space-y-0.5">
                                    {toc.map((t, i) => (
                                        <li key={t.id}>
                                            <a
                                                href={`#${t.id}`}
                                                className="flex gap-2 text-[13px] py-1 hover:opacity-70"
                                                style={{ color: PT.ink }}
                                            >
                                                <span className="font-mono font-black text-[10.5px] mt-[3px] w-7 shrink-0" style={{ color: PT.red }}>
                                                    {String(i + 1).padStart(2, "0")}
                                                </span>
                                                <span className="font-medium">{t.label}</span>
                                            </a>
                                        </li>
                                    ))}
                                </ol>
                            </details>
                        )}

                        <div className="mt-9 prose-legal">{children}</div>

                        <hr className="my-12" style={{ border: "none", borderTop: `3px dashed ${PT.ink}` }} />

                        <div
                            className="not-prose mb-10 px-5 py-4 relative"
                            data-testid="legal-seealso"
                            style={{
                                background: "#fff",
                                border: `3px solid ${PT.ink}`,
                                boxShadow: `5px 5px 0 ${PT.green}`,
                            }}
                        >
                            {/* Doodle no canto da caixa "Vê Também" */}
                            <div className="absolute -top-3 -right-3 pointer-events-none block opacity-80 scale-[0.7] sm:scale-100 origin-top-right" aria-hidden>
                                <DoodleSparkles color={PT.green} size={36} rotate={-14} />
                            </div>
                            <Kicker color={PT.green} className="mb-2">// VÊ TAMBÉM</Kicker>
                            <div className="flex flex-wrap gap-2">
                                {NAV.filter((n) => n.key !== active && n.key !== "index").slice(0, 4).map((n) => (
                                    <Link
                                        key={n.key}
                                        to={n.to}
                                        className="inline-flex items-center text-[12.5px] font-black uppercase px-3 py-1.5 hover:opacity-80 transition"
                                        style={{
                                            background: PT.cream,
                                            color: PT.ink,
                                            border: `2px solid ${PT.ink}`,
                                            borderRadius: 999,
                                            letterSpacing: "0.06em",
                                        }}
                                    >
                                        {n.label} →
                                    </Link>
                                ))}
                            </div>
                        </div>

                        <footer className="text-[12.5px] leading-relaxed font-medium" style={{ color: "rgba(10,10,10,0.65)" }}>
                            <p>
                                As menções entre{" "}
                                <code className="px-1.5 py-0.5 text-[11.5px] font-black" style={{ background: PT.ink, color: PT.gold }}>
                                    [ ]
                                </code>{" "}
                                identificam dados a preencher pela entidade responsável antes da publicação definitiva.
                            </p>
                            <p className="mt-2">
                                Em caso de divergência entre versões traduzidas, prevalece a versão em português europeu.
                                A invalidade ou ineficácia de qualquer cláusula não afeta as demais.
                            </p>
                        </footer>
                    </article>
                </main>

                {/* Right rail — TOC scroll-spy */}
                <aside className="legal-shell-tools hidden lg:block lg:col-span-3 order-3">
                    <div className="sticky top-[80px]">
                        <div className="flex items-center gap-2 px-2 mb-3">
                            <ListTree size={13} strokeWidth={2.4} style={{ color: PT.red }} />
                            <Kicker color={PT.red}>// NESTA PÁGINA</Kicker>
                        </div>
                        <nav data-testid="legal-toc" style={{ borderLeft: `3px solid ${PT.ink}` }}>
                            {toc.length === 0 && (
                                <p className="pl-4 text-[12px] font-mono" style={{ color: "rgba(10,10,10,0.40)" }}>Sem secções</p>
                            )}
                            {toc.map((t, i) => {
                                const isActive = activeId === t.id;
                                return (
                                    <a
                                        key={t.id}
                                        href={`#${t.id}`}
                                        data-testid={`legal-toc-${t.id}`}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            const el = document.getElementById(t.id);
                                            if (el) {
                                                window.scrollTo({
                                                    top: el.getBoundingClientRect().top + window.scrollY - 96,
                                                    behavior: "smooth",
                                                });
                                                history.replaceState(null, "", `#${t.id}`);
                                            }
                                        }}
                                        className="group block pl-4 pr-2 py-1.5 text-[12.5px] leading-snug transition"
                                        style={{
                                            marginLeft: -3,
                                            borderLeft: `3px solid ${isActive ? PT.red : "transparent"}`,
                                            color: isActive ? PT.ink : "rgba(10,10,10,0.55)",
                                            fontWeight: isActive ? 800 : 500,
                                            background: isActive ? "rgba(200,16,46,0.06)" : "transparent",
                                        }}
                                    >
                                        <span className="font-mono font-black text-[10.5px] mr-1.5" style={{ color: isActive ? PT.red : "rgba(10,10,10,0.35)" }}>
                                            {String(i + 1).padStart(2, "0")}
                                        </span>
                                        {t.label}
                                    </a>
                                );
                            })}
                        </nav>

                        <button
                            onClick={scrollTop}
                            data-testid="legal-top-btn"
                            className="mt-5 ml-1 inline-flex items-center gap-1.5 text-[11.5px] font-black uppercase px-3 py-1.5 tap-press"
                            style={{
                                background: "#fff", color: PT.ink, border: `2px solid ${PT.ink}`,
                                borderRadius: 999, boxShadow: `3px 3px 0 ${PT.ink}`, letterSpacing: "0.06em",
                            }}
                        >
                            <ArrowUp size={12} strokeWidth={2.5} /> Topo
                        </button>
                    </div>
                </aside>
            </div>

            {/* TAPE rodapé */}
            <div className="pt-tape h-3 w-full" />

            {/* SITE FOOTER */}
            <SiteFooter />

            <AuthStyles />
        </div>
    );
}
