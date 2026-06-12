import { useEffect, useRef, useState } from "react";
// =============================================================================
// DESIGN SYSTEM: LUSORAE EDITORIAL — ver /src/theme/EDITORIAL.md
// Shell partilhado das rotas legais (/legal, /legal/terms, …). Sticky TOC,
// "estado de leitura" e CTA share/print — tudo em hairlines + sombras
// difusas. Sem stickers rodados nem doodles.
// =============================================================================
import { Link, useNavigate } from "react-router-dom";
import {
    ArrowLeft, ArrowUp, Check, Cookie, FileText,
    ListTree, Printer, Scale, ShieldCheck, Share2, Sparkle,
} from "lucide-react";
import { PT } from "../../theme/editorial";
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
 * Shell layout for legal pages — clean editorial design.
 * Mantém: reading progress, sticky doc switcher, TOC scroll-spy, share/print.
 * Remove: doodles, stamps rotacionados, sombras 3D.
 */
export function LegalShell({ title, subtitle, lastUpdated, eli5, children, active }) {
    const navigate = useNavigate();
    const articleRef = useRef(null);
    const [toc, setToc] = useState([]);
    const [activeId, setActiveId] = useState(null);
    const [progress, setProgress] = useState(0);
    const [copied, setCopied] = useState(false);

    // Build TOC + IDs + section numbers
    useEffect(() => {
        if (!articleRef.current) return;
        const root = articleRef.current;
        const h2s = root.querySelectorAll(".prose-legal > h2");
        const items = [];
        h2s.forEach((h, i) => {
            const clone = h.cloneNode(true);
            clone.querySelectorAll(".sec-n, .anchor-link").forEach((n) => n.remove());
            const baseText = clone.textContent.trim().replace(/^\d+\.\s*/, "");
            const id = slugify(baseText) || `sec-${i + 1}`;
            h.id = id;

            if (!h.dataset.numberStripped) {
                const firstNode = h.firstChild;
                if (firstNode && firstNode.nodeType === Node.TEXT_NODE) {
                    firstNode.nodeValue = firstNode.nodeValue.replace(/^\s*\d+\.\s*/, "");
                }
                h.dataset.numberStripped = "1";
            }

            if (!h.querySelector(".sec-n")) {
                const n = document.createElement("span");
                n.className = "sec-n";
                n.textContent = String(i + 1).padStart(2, "0");
                h.prepend(n);
            }

            items.push({ id, label: baseText, level: 2 });
        });
        setToc(items);
        if (items.length) setActiveId(items[0].id);
    }, [children]);

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
        <div className="min-h-screen text-black relative" style={{ background: PT.paper || "#F7F5EF" }}>
            {/* Reading progress bar */}
            <div
                className="legal-shell-progress fixed top-0 left-0 right-0 h-[2px] z-50 pointer-events-none"
                aria-hidden
                data-testid="legal-progress-bar"
            >
                <div
                    className="h-full transition-[width] duration-150 ease-out"
                    style={{ width: `${progress}%`, background: PT.red }}
                />
            </div>

            {/* Editorial topbar (clean) */}
            <header
                className="sticky top-0 z-30"
                style={{
                    background: "rgba(247,245,239,0.92)",
                    backdropFilter: "blur(20px) saturate(180%)",
                    WebkitBackdropFilter: "blur(20px) saturate(180%)",
                    borderBottom: "1px solid rgba(10,10,10,0.06)",
                }}
            >
                <div className="max-w-[1280px] mx-auto flex items-center gap-3 px-4 lg:px-8 py-3.5">
                    <button
                        onClick={() => navigate(-1)}
                        data-testid="legal-back-btn"
                        className="w-9 h-9 grid place-items-center tap-shrink transition"
                        style={{
                            background: "#fff",
                            border: "1px solid rgba(10,10,10,0.10)",
                            borderRadius: 999,
                            color: PT.ink,
                        }}
                        aria-label="Voltar"
                    >
                        <ArrowLeft size={17} strokeWidth={2.2} />
                    </button>
                    <Link to="/" className="inline-flex items-baseline gap-1 group" data-testid="legal-home-link">
                        <span
                            className="font-black tracking-[-0.045em]"
                            style={{ fontSize: 19, color: PT.ink, lineHeight: 1 }}
                        >
                            lusorae
                        </span>
                        <span
                            aria-hidden
                            className="inline-block"
                            style={{
                                width: 5, height: 5, borderRadius: "50%",
                                background: PT.red, transform: "translateY(-1px)",
                            }}
                        />
                    </Link>
                    <span
                        className="ml-2 hidden sm:inline text-[11px] font-bold uppercase"
                        style={{ letterSpacing: "0.18em", color: "rgba(10,10,10,0.55)" }}
                    >
                        · Centro legal
                    </span>
                    <div className="ml-auto flex items-center gap-2">
                        <button
                            onClick={onShare}
                            data-testid="legal-share-btn"
                            className="hidden sm:inline-flex items-center gap-1.5 text-[12px] font-bold px-3.5 py-2 transition tap-shrink"
                            style={{
                                background: "#fff", color: PT.ink,
                                border: "1px solid rgba(10,10,10,0.10)",
                                borderRadius: 999,
                            }}
                            aria-label="Partilhar"
                        >
                            {copied ? <Check size={13} /> : <Share2 size={13} />}
                            <span>{copied ? "Copiado" : "Partilhar"}</span>
                        </button>
                        <button
                            onClick={onPrint}
                            data-testid="legal-print-btn"
                            className="hidden sm:inline-flex items-center gap-1.5 text-[12px] font-bold px-3.5 py-2 transition tap-shrink"
                            style={{
                                background: "#fff", color: PT.ink,
                                border: "1px solid rgba(10,10,10,0.10)",
                                borderRadius: 999,
                            }}
                            aria-label="Imprimir"
                        >
                            <Printer size={13} />
                            <span>Imprimir</span>
                        </button>
                    </div>
                </div>
            </header>

            <div className="max-w-[1280px] mx-auto px-4 lg:px-8 grid grid-cols-12 gap-6 lg:gap-10 py-8 lg:py-14 relative z-10">
                {/* Left sidebar — document switcher */}
                <aside className="legal-shell-sidebar col-span-12 lg:col-span-3 order-1">
                    <div className="lg:sticky lg:top-[80px]">
                        <div className="hidden lg:flex items-center gap-1.5 mb-4 px-1">
                            <span className="relative flex h-1.5 w-1.5" aria-hidden>
                                <span className="absolute inline-flex h-full w-full rounded-full lusorae-pulse" style={{ background: PT.red }} />
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: PT.red }} />
                            </span>
                            <span className="text-[11px] font-bold uppercase" style={{ color: "rgba(10,10,10,0.55)", letterSpacing: "0.18em" }}>
                                Documentos
                            </span>
                        </div>
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
                                        className="shrink-0 lg:shrink inline-flex items-center gap-2 px-3.5 py-2.5 text-[13px] font-bold transition-all duration-200"
                                        style={{
                                            background: isActive ? PT.ink : "#fff",
                                            color: isActive ? "#fff" : PT.ink,
                                            border: isActive ? `1px solid ${PT.ink}` : "1px solid rgba(10,10,10,0.10)",
                                            borderRadius: 999,
                                            boxShadow: isActive ? "0 6px 14px -6px rgba(10,10,10,0.35)" : "none",
                                            letterSpacing: "-0.005em",
                                        }}
                                    >
                                        <Icon size={14} strokeWidth={isActive ? 2.3 : 2} />
                                        <span className="whitespace-nowrap lg:hidden">{short}</span>
                                        <span className="whitespace-nowrap hidden lg:inline">{label}</span>
                                    </Link>
                                );
                            })}
                        </nav>
                        {lastUpdated && (
                            <div className="hidden lg:flex mt-6 px-2 items-center gap-2 text-[11px] font-bold" style={{ color: "rgba(10,10,10,0.55)", letterSpacing: "0.04em" }}>
                                <span className="w-1.5 h-1.5 rounded-full" style={{ background: PT.green }} />
                                Atualizado · {lastUpdated}
                            </div>
                        )}
                    </div>
                </aside>

                {/* Main reading column */}
                <main className="col-span-12 lg:col-span-6 order-2 min-w-0">
                    <article ref={articleRef} className="max-w-[760px]">
                        <div className="flex items-center gap-3 mb-4">
                            <span className="relative flex h-1.5 w-1.5" aria-hidden>
                                <span className="absolute inline-flex h-full w-full rounded-full lusorae-pulse" style={{ background: PT.red }} />
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: PT.red }} />
                            </span>
                            <span className="text-[11px] font-bold uppercase" style={{ color: "rgba(10,10,10,0.55)", letterSpacing: "0.18em" }}>
                                {eyebrow}
                            </span>
                            <span aria-hidden style={{ flex: 1, height: 1, background: "rgba(10,10,10,0.10)" }} />
                        </div>
                        <h1
                            data-testid="legal-title"
                            className="font-black tracking-[-0.045em]"
                            style={{ fontSize: "clamp(40px, 6vw, 72px)", lineHeight: 0.96, color: PT.ink }}
                        >
                            {title}
                        </h1>
                        {subtitle && (
                            <p
                                className="mt-5 text-[16px] lg:text-[17.5px] leading-relaxed max-w-[64ch] font-medium"
                                style={{ color: "rgba(10,10,10,0.7)" }}
                                dangerouslySetInnerHTML={{ __html: subtitle }}
                            />
                        )}
                        <div className="mt-5 flex flex-wrap items-center gap-2">
                            {lastUpdated && (
                                <span
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold uppercase"
                                    style={{
                                        background: "rgba(4,106,56,0.10)",
                                        color: PT.green,
                                        borderRadius: 999,
                                        letterSpacing: "0.10em",
                                    }}
                                >
                                    <Check size={11} strokeWidth={3} /> Atualizado · {lastUpdated}
                                </span>
                            )}
                            <span
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold uppercase"
                                style={{
                                    background: "#fff",
                                    color: PT.ink,
                                    border: "1px solid rgba(10,10,10,0.10)",
                                    borderRadius: 999,
                                    letterSpacing: "0.10em",
                                }}
                            >
                                PT-PT
                            </span>
                            <span
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-bold uppercase"
                                style={{
                                    background: "rgba(0,63,135,0.10)",
                                    color: PT.azul,
                                    borderRadius: 999,
                                    letterSpacing: "0.10em",
                                }}
                            >
                                RGPD · DSA
                            </span>
                        </div>

                        {eli5 && (
                            <div
                                className="mt-8 px-5 py-4 relative"
                                data-testid="legal-eli5"
                                style={{
                                    background: "#fff",
                                    color: PT.ink,
                                    border: "1px solid rgba(10,10,10,0.08)",
                                    borderLeft: `2px solid ${PT.gold}`,
                                    borderRadius: 16,
                                    boxShadow: "0 1px 2px rgba(10,10,10,0.04), 0 12px 28px -16px rgba(10,10,10,0.10)",
                                }}
                            >
                                <strong className="block font-bold uppercase mb-1.5 text-[11px]" style={{ letterSpacing: "0.18em", color: "rgba(10,10,10,0.55)" }}>
                                    Em duas linhas
                                </strong>
                                <span className="text-[15px] font-medium leading-relaxed">{eli5}</span>
                            </div>
                        )}

                        {/* Mobile TOC */}
                        {toc.length > 1 && (
                            <details
                                className="lg:hidden mt-7"
                                data-testid="legal-toc-mobile"
                                style={{
                                    background: "#fff",
                                    border: "1px solid rgba(10,10,10,0.08)",
                                    borderRadius: 16,
                                }}
                            >
                                <summary className="flex items-center gap-2 cursor-pointer select-none px-4 py-3 text-[12.5px] font-bold uppercase list-none" style={{ color: PT.ink, letterSpacing: "0.10em" }}>
                                    <ListTree size={14} strokeWidth={2.2} />
                                    Índice ({toc.length} secções)
                                </summary>
                                <ol className="px-4 pb-3 pt-1 space-y-0.5">
                                    {toc.map((t, i) => (
                                        <li key={t.id}>
                                            <a
                                                href={`#${t.id}`}
                                                className="flex gap-2 text-[13.5px] py-1.5 hover:opacity-70"
                                                style={{ color: PT.ink }}
                                            >
                                                <span className="font-bold text-[11px] mt-[3px] w-7 shrink-0" style={{ color: PT.red }}>
                                                    {String(i + 1).padStart(2, "0")}
                                                </span>
                                                <span className="font-medium">{t.label}</span>
                                            </a>
                                        </li>
                                    ))}
                                </ol>
                            </details>
                        )}

                        <div className="mt-10 prose-legal">{children}</div>

                        <hr className="my-12" style={{ border: "none", borderTop: "1px solid rgba(10,10,10,0.10)" }} />

                        <div
                            className="not-prose mb-10 px-5 py-5"
                            data-testid="legal-seealso"
                            style={{
                                background: "#fff",
                                border: "1px solid rgba(10,10,10,0.08)",
                                borderRadius: 16,
                                boxShadow: "0 1px 2px rgba(10,10,10,0.04), 0 12px 28px -16px rgba(10,10,10,0.10)",
                            }}
                        >
                            <div className="inline-flex items-center gap-1.5 mb-3">
                                <span className="relative flex h-1.5 w-1.5" aria-hidden>
                                    <span className="absolute inline-flex h-full w-full rounded-full lusorae-pulse" style={{ background: PT.green }} />
                                    <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ background: PT.green }} />
                                </span>
                                <span className="text-[11px] font-bold uppercase" style={{ color: "rgba(10,10,10,0.55)", letterSpacing: "0.18em" }}>
                                    Vê também
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {NAV.filter((n) => n.key !== active && n.key !== "index").slice(0, 4).map((n) => (
                                    <Link
                                        key={n.key}
                                        to={n.to}
                                        className="inline-flex items-center text-[13px] font-bold px-3.5 py-1.5 transition hover:opacity-80"
                                        style={{
                                            background: "rgba(10,10,10,0.04)",
                                            color: PT.ink,
                                            border: "1px solid rgba(10,10,10,0.08)",
                                            borderRadius: 999,
                                            letterSpacing: "-0.005em",
                                        }}
                                    >
                                        {n.label} →
                                    </Link>
                                ))}
                            </div>
                        </div>

                        <footer className="text-[13px] leading-relaxed font-medium" style={{ color: "rgba(10,10,10,0.6)" }}>
                            <p>
                                As menções entre{" "}
                                <code className="px-1.5 py-0.5 text-[12px] font-bold rounded" style={{ background: "rgba(10,10,10,0.06)", color: PT.ink, fontFamily: "JetBrains Mono, monospace" }}>
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
                        <div className="flex items-center gap-2 px-2 mb-3.5">
                            <ListTree size={13} strokeWidth={2.2} style={{ color: PT.red }} />
                            <span className="text-[11px] font-bold uppercase" style={{ color: "rgba(10,10,10,0.55)", letterSpacing: "0.18em" }}>
                                Nesta página
                            </span>
                        </div>
                        <nav data-testid="legal-toc" style={{ borderLeft: "1px solid rgba(10,10,10,0.10)" }}>
                            {toc.length === 0 && (
                                <p className="pl-4 text-[12.5px]" style={{ color: "rgba(10,10,10,0.38)" }}>Sem secções</p>
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
                                        className="group block pl-4 pr-2 py-1.5 text-[13px] leading-snug transition"
                                        style={{
                                            marginLeft: -1,
                                            borderLeft: `2px solid ${isActive ? PT.red : "transparent"}`,
                                            color: isActive ? PT.ink : "rgba(10,10,10,0.55)",
                                            fontWeight: isActive ? 700 : 500,
                                        }}
                                    >
                                        <span className="font-bold text-[11px] mr-1.5" style={{ color: isActive ? PT.red : "rgba(10,10,10,0.32)" }}>
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
                            className="mt-5 ml-1 inline-flex items-center gap-1.5 text-[12px] font-bold px-3.5 py-1.5 transition tap-shrink"
                            style={{
                                background: "#fff", color: PT.ink,
                                border: "1px solid rgba(10,10,10,0.10)",
                                borderRadius: 999,
                            }}
                        >
                            <ArrowUp size={12} strokeWidth={2.2} /> Topo
                        </button>
                    </div>
                </aside>
            </div>

            <SiteFooter />
        </div>
    );
}
