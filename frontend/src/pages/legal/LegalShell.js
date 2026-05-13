import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
    ArrowLeft, ArrowUp, BookOpen, Check, Cookie, FileText,
    ListTree, Printer, Scale, ShieldCheck, Share2, Sparkle,
} from "lucide-react";

const NAV = [
    { to: "/legal",            label: "Visão geral",            short: "Visão",       icon: Scale,        key: "index" },
    { to: "/legal/terms",      label: "Termos e Condições",     short: "Termos",      icon: FileText,     key: "terms" },
    { to: "/legal/privacy",    label: "Política de Privacidade",short: "Privacidade", icon: ShieldCheck,  key: "privacy" },
    { to: "/legal/cookies",    label: "Política de Cookies",    short: "Cookies",     icon: Cookie,       key: "cookies" },
    { to: "/legal/community",  label: "Diretrizes",             short: "Diretrizes",  icon: Sparkle,      key: "community" },
    { to: "/legal/glossary",   label: "Glossário",              short: "Glossário",   icon: BookOpen,     key: "glossary" },
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
                await navigator.share({ title: `Vermillion · ${title}`, url });
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
        <div className="min-h-screen bg-white text-black">
            {/* Reading progress bar */}
            <div
                className="legal-shell-progress fixed top-0 left-0 right-0 h-[2px] z-40 pointer-events-none"
                aria-hidden
                data-testid="legal-progress-bar"
            >
                <div
                    className="h-full grad-bar transition-[width] duration-150 ease-out"
                    style={{ width: `${progress}%` }}
                />
            </div>

            {/* Top bar */}
            <header className="legal-shell-header sticky top-0 z-30 glass border-b border-black/[0.06]">
                <div className="max-w-[1280px] mx-auto flex items-center gap-3 px-4 lg:px-8 py-3">
                    <button
                        onClick={() => navigate(-1)}
                        data-testid="legal-back-btn"
                        className="w-9 h-9 rounded-full grid place-items-center text-black hover:bg-black/[0.06] tap-shrink"
                        aria-label="Voltar"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <Link to="/" className="inline-flex items-center gap-2 group" data-testid="legal-home-link">
                        <span aria-hidden className="w-2.5 h-2.5 rotate-45 bg-black rounded-[2px]" />
                        <span className="font-display text-[17px] font-bold tracking-tight">vermillion</span>
                    </Link>
                    <span className="ml-2 hidden sm:inline text-[11px] uppercase tracking-[0.14em] text-black/45 font-mono">
                        Centro Legal
                    </span>
                    <div className="ml-auto flex items-center gap-1.5">
                        <button
                            onClick={onShare}
                            data-testid="legal-share-btn"
                            className="hidden sm:inline-flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-full border border-black/10 hover:border-black/30 tap-press"
                            aria-label="Partilhar"
                        >
                            {copied ? <Check size={14} /> : <Share2 size={14} />}
                            <span>{copied ? "Copiado" : "Partilhar"}</span>
                        </button>
                        <button
                            onClick={onPrint}
                            data-testid="legal-print-btn"
                            className="hidden sm:inline-flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-full border border-black/10 hover:border-black/30 tap-press"
                            aria-label="Imprimir"
                        >
                            <Printer size={14} />
                            <span>Imprimir</span>
                        </button>
                    </div>
                </div>
            </header>

            <div className="max-w-[1280px] mx-auto px-4 lg:px-8 grid grid-cols-12 gap-6 lg:gap-10 py-6 lg:py-12">
                {/* Left sidebar — document switcher */}
                <aside className="legal-shell-sidebar col-span-12 lg:col-span-3 order-1">
                    <div className="lg:sticky lg:top-[80px]">
                        <p className="hidden lg:block text-[10.5px] uppercase tracking-[0.14em] text-black/45 font-mono mb-3 px-2">
                            Documentos
                        </p>
                        <nav
                            data-testid="legal-doc-nav"
                            className="flex lg:flex-col gap-1.5 overflow-x-auto lg:overflow-visible no-scrollbar pb-1 -mx-1 lg:mx-0 px-1"
                        >
                            {NAV.map(({ to, label, short, icon: Icon, key }) => {
                                const isActive = active === key;
                                return (
                                    <Link
                                        key={key}
                                        to={to}
                                        data-testid={`legal-nav-${key}`}
                                        className={`shrink-0 lg:shrink inline-flex items-center gap-2.5 px-3.5 py-2.5 rounded-full lg:rounded-xl text-[13px] tracking-tight transition ${
                                            isActive
                                                ? "chip-on font-semibold"
                                                : "text-black/85 hover:bg-black/[0.045]"
                                        }`}
                                    >
                                        <Icon size={15} strokeWidth={isActive ? 2.1 : 1.6} />
                                        <span className="whitespace-nowrap lg:hidden">{short}</span>
                                        <span className="whitespace-nowrap hidden lg:inline">{label}</span>
                                    </Link>
                                );
                            })}
                        </nav>
                        {lastUpdated && (
                            <div className="hidden lg:flex mt-6 px-2 items-center gap-2 text-[11px] text-black/45 font-mono">
                                <span className="w-1 h-1 rounded-full bg-black/30" />
                                Atualizado · {lastUpdated}
                            </div>
                        )}
                    </div>
                </aside>

                {/* Main reading column */}
                <main className="col-span-12 lg:col-span-6 order-2 min-w-0">
                    <article ref={articleRef} className="max-w-[760px]">
                        <p
                            data-testid="legal-eyebrow"
                            className="text-[11px] uppercase tracking-[0.18em] text-black/45 font-mono mb-4"
                        >
                            {eyebrow}
                        </p>
                        <h1
                            data-testid="legal-title"
                            className="font-display text-[32px] sm:text-[36px] lg:text-[44px] font-bold tracking-tight leading-[1.04] text-black"
                        >
                            {title}
                        </h1>
                        {subtitle && (
                            <p className="mt-4 text-[15.5px] lg:text-[16.5px] text-black/65 leading-relaxed max-w-[64ch]">
                                {subtitle}
                            </p>
                        )}
                        <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-black/45 font-mono">
                            {lastUpdated && (
                                <span className="inline-flex items-center gap-1.5">
                                    <span className="w-1 h-1 rounded-full bg-black/30" />
                                    Atualizado · {lastUpdated}
                                </span>
                            )}
                            <span className="inline-flex items-center gap-1.5">
                                <span className="w-1 h-1 rounded-full bg-black/30" />
                                Português (PT-PT)
                            </span>
                            <span className="inline-flex items-center gap-1.5">
                                <span className="w-1 h-1 rounded-full bg-black/30" />
                                Jurisdição PT · UE
                            </span>
                        </div>

                        {eli5 && (
                            <div className="legal-callout is-tldr mt-7" data-testid="legal-eli5">
                                <strong>Em duas linhas</strong>
                                {eli5}
                            </div>
                        )}

                        {/* Mobile TOC (collapsible) */}
                        {toc.length > 1 && (
                            <details
                                className="lg:hidden mt-7 rounded-2xl border border-black/[0.08] bg-white"
                                data-testid="legal-toc-mobile"
                            >
                                <summary className="flex items-center gap-2 cursor-pointer select-none px-4 py-3 text-[13px] font-semibold text-black list-none">
                                    <ListTree size={14} />
                                    Índice ({toc.length} secções)
                                </summary>
                                <ol className="px-4 pb-3 pt-1 space-y-0.5">
                                    {toc.map((t, i) => (
                                        <li key={t.id}>
                                            <a
                                                href={`#${t.id}`}
                                                className="flex gap-2 text-[13px] text-black/70 hover:text-black py-1"
                                            >
                                                <span className="font-mono text-[11px] text-black/35 mt-[2px] w-6 shrink-0">
                                                    {String(i + 1).padStart(2, "0")}
                                                </span>
                                                <span>{t.label}</span>
                                            </a>
                                        </li>
                                    ))}
                                </ol>
                            </details>
                        )}

                        <div className="mt-9 prose-legal">{children}</div>

                        <hr className="my-12 border-black/[0.08]" />

                        <div className="legal-seealso not-prose mb-10" data-testid="legal-seealso">
                            <strong>Vê também</strong>
                            {NAV.filter((n) => n.key !== active && n.key !== "index").slice(0, 4).map((n) => (
                                <Link
                                    key={n.key}
                                    to={n.to}
                                    className="underline underline-offset-2 hover:text-[color:var(--coral-500)]"
                                >
                                    {n.label}
                                </Link>
                            ))}
                        </div>

                        <footer className="text-[12px] text-black/50 leading-relaxed">
                            <p>
                                As menções entre{" "}
                                <code className="bg-black/[0.04] px-1 py-0.5 rounded text-[11px]">[ ]</code>{" "}
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
                        <div className="flex items-center gap-2 px-2 mb-3 text-[10.5px] uppercase tracking-[0.14em] text-black/45 font-mono">
                            <ListTree size={12} />
                            Nesta página
                        </div>
                        <nav data-testid="legal-toc" className="border-l border-black/[0.08]">
                            {toc.length === 0 && (
                                <p className="pl-4 text-[12px] text-black/40">Sem secções</p>
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
                                                    top: el.getBoundingClientRect().top + window.scrollY - 88,
                                                    behavior: "smooth",
                                                });
                                                history.replaceState(null, "", `#${t.id}`);
                                            }
                                        }}
                                        className={`group block -ml-px pl-4 pr-2 py-1.5 text-[12.5px] leading-snug border-l-2 transition ${
                                            isActive
                                                ? "border-l-black text-black font-semibold"
                                                : "border-l-transparent text-black/55 hover:text-black hover:border-l-black/30"
                                        }`}
                                    >
                                        <span className="font-mono text-[10.5px] text-black/35 mr-1.5">
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
                            className="mt-5 ml-2 inline-flex items-center gap-1.5 text-[11.5px] text-black/55 hover:text-black tap-press"
                        >
                            <ArrowUp size={12} /> Voltar ao topo
                        </button>
                    </div>
                </aside>
            </div>
        </div>
    );
}
