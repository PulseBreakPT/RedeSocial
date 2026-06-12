import { useEffect, useRef, useState } from "react";
// =============================================================================
// DESIGN SYSTEM: LUSORAE EDITORIAL — ver /src/theme/EDITORIAL.md
// Shell partilhado das rotas legais (/legal, /legal/terms, …). Sticky TOC,
// "estado de leitura" e CTA share/print — tudo em hairlines + sombras
// difusas. Sem stickers rodados nem doodles.
// =============================================================================
import { Link, useNavigate } from "react-router-dom";
import {
    ArrowLeft, ArrowUp, Compass, Cookie, FileText, Flame, Users,
    ListTree, Printer, Scale, ShieldCheck, Share2, Check, Clock,
    BookOpen, Heart, BarChart3, Building2, ShieldAlert,
    ChevronDown, X,
} from "lucide-react";
import { PT } from "../../theme/editorial";
import SiteFooter from "../../components/SiteFooter";

const NAV = [
    { to: "/legal",            label: "Centro Legal",           short: "Centro",      icon: Scale,        key: "index" },
    { to: "/legal/vision",     label: "A nossa visão",          short: "Visão",       icon: Compass,      key: "vision" },
    { to: "/manifesto",        label: "Manifesto",              short: "Manifesto",   icon: Flame,        key: "manifesto" },
    { to: "/legal/terms",      label: "Termos e Condições",     short: "Termos",      icon: FileText,     key: "terms" },
    { to: "/legal/privacy",    label: "Política de Privacidade",short: "Privacidade", icon: ShieldCheck,  key: "privacy" },
    { to: "/legal/cookies",    label: "Política de Cookies",    short: "Cookies",     icon: Cookie,       key: "cookies" },
    { to: "/legal/community",  label: "Diretrizes",             short: "Diretrizes",  icon: Users,        key: "community" },
    { to: "/legal/copyright",  label: "Direitos de Autor",      short: "Direitos",    icon: BookOpen,     key: "copyright" },
    { to: "/legal/menores",    label: "Para Pais e Menores",    short: "Menores",     icon: Heart,        key: "menores" },
    { to: "/legal/dsa-transparency", label: "Transparência DSA",short: "DSA",         icon: BarChart3,    key: "dsa-transparency" },
    { to: "/legal/governance", label: "Governança",             short: "Governança",  icon: Building2,    key: "governance" },
    { to: "/legal/seguranca-investigadores", label: "Segurança", short: "Segurança",   icon: ShieldAlert,  key: "seguranca" },
    { to: "/legal/historico",  label: "Histórico",              short: "Histórico",   icon: Clock,        key: "historico" },
];

const PRIMARY_KEYS = ["index", "vision", "manifesto", "terms", "privacy", "cookies", "community"];
const PRIMARY = NAV.filter((n) => PRIMARY_KEYS.includes(n.key));
const SPECIALIZED = NAV.filter((n) => !PRIMARY_KEYS.includes(n.key));

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
    const [passedIds, setPassedIds] = useState(() => new Set());
    const [readingTime, setReadingTime] = useState(0);
    const [docMenuOpen, setDocMenuOpen] = useState(false);
    const docMenuRef = useRef(null);
    const currentDoc = NAV.find((n) => n.key === active) || NAV[0];
    const CurrentIcon = currentDoc.icon;

    // Close doc menu on Escape, outside click
    useEffect(() => {
        if (!docMenuOpen) return undefined;
        const onKey = (e) => { if (e.key === "Escape") setDocMenuOpen(false); };
        const onClick = (e) => {
            if (docMenuRef.current && !docMenuRef.current.contains(e.target)) {
                setDocMenuOpen(false);
            }
        };
        document.addEventListener("keydown", onKey);
        document.addEventListener("mousedown", onClick);
        return () => {
            document.removeEventListener("keydown", onKey);
            document.removeEventListener("mousedown", onClick);
        };
    }, [docMenuOpen]);

    // Build TOC + IDs + section numbers, calc reading time
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
        // Reading time — ~200 WPM portuguese
        const text = (root.textContent || "").trim();
        const words = text.split(/\s+/).filter(Boolean).length;
        setReadingTime(Math.max(1, Math.round(words / 200)));
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
                // Mark sections as "passed" when their top crosses viewport top
                setPassedIds((prev) => {
                    let next = prev;
                    entries.forEach((e) => {
                        const top = e.target.getBoundingClientRect().top;
                        if (top < 80 && !prev.has(e.target.id)) {
                            if (next === prev) next = new Set(prev);
                            next.add(e.target.id);
                        }
                    });
                    return next;
                });
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

    return (
        <div className="min-h-screen text-black relative" style={{ background: "#FFFFFF" }}>
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
                    background: "rgba(255,255,255,0.88)",
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
                        style={{ letterSpacing: "0.18em", color: "rgba(10,10,10,0.35)" }}
                        aria-hidden
                    >
                        ·
                    </span>

                    {/* Floating document switcher (replaces left sidebar) */}
                    <div ref={docMenuRef} className="relative ml-1">
                        <button
                            type="button"
                            onClick={() => setDocMenuOpen((o) => !o)}
                            data-testid="legal-doc-switcher-trigger"
                            aria-haspopup="menu"
                            aria-expanded={docMenuOpen}
                            aria-label={`Documento atual: ${currentDoc.label}. Clica para abrir o seletor de documentos.`}
                            className="inline-flex items-center gap-2 px-3 py-2 transition tap-shrink"
                            style={{
                                background: docMenuOpen ? PT.ink : "#fff",
                                color: docMenuOpen ? "#fff" : PT.ink,
                                border: `1px solid ${docMenuOpen ? PT.ink : "rgba(10,10,10,0.10)"}`,
                                borderRadius: 999,
                                boxShadow: docMenuOpen
                                    ? "0 8px 18px -6px rgba(10,10,10,0.30)"
                                    : "0 1px 0 rgba(255,255,255,0.60) inset, 0 1px 2px rgba(10,10,10,0.04)",
                                letterSpacing: "-0.005em",
                            }}
                        >
                            <CurrentIcon size={13} strokeWidth={2.1} className="shrink-0" />
                            <span className="text-[12.5px] font-bold max-w-[120px] sm:max-w-[180px] truncate">
                                {currentDoc.short}
                            </span>
                            <ChevronDown
                                size={13}
                                strokeWidth={2.4}
                                className="shrink-0 transition-transform duration-200"
                                style={{
                                    transform: docMenuOpen ? "rotate(180deg)" : "rotate(0deg)",
                                    opacity: 0.8,
                                }}
                            />
                        </button>

                        {docMenuOpen && (
                            <>
                                {/* Backdrop dim (no blur) */}
                                <div
                                    onClick={() => setDocMenuOpen(false)}
                                    aria-hidden
                                    data-testid="legal-doc-switcher-backdrop"
                                    className="fixed inset-0 z-40"
                                    style={{
                                        background: "rgba(10,10,10,0.32)",
                                        animation: "legalDocFade 180ms ease-out both",
                                    }}
                                />

                                {/* Floating panel — fixed on mobile (avoid overflow), absolute on desktop */}
                                <div
                                    role="menu"
                                    data-testid="legal-doc-switcher-menu"
                                    className="fixed lg:absolute z-50 left-2 right-2 lg:left-0 lg:right-auto lg:w-[360px] top-[64px] lg:top-full lg:mt-2 max-h-[78vh] overflow-y-auto"
                                    style={{
                                        background: "#ffffff",
                                        border: "1px solid rgba(10,10,10,0.10)",
                                        borderRadius: 18,
                                        boxShadow:
                                            "0 1px 0 rgba(255,255,255,0.50) inset, 0 1px 2px rgba(10,10,10,0.06), 0 28px 56px -18px rgba(10,10,10,0.30), 0 12px 24px -12px rgba(10,10,10,0.14)",
                                        animation: "legalDocPanel 200ms cubic-bezier(0.22, 1, 0.36, 1) both",
                                    }}
                                >
                                    {/* Header strip */}
                                    <div
                                        className="px-4 pt-3.5 pb-2.5 flex items-center justify-between gap-3"
                                        style={{ borderBottom: "1px solid rgba(10,10,10,0.06)" }}
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="relative flex h-1.5 w-1.5 shrink-0" aria-hidden>
                                                <span
                                                    className="absolute inline-flex h-full w-full rounded-full lusorae-pulse"
                                                    style={{ background: PT.red }}
                                                />
                                                <span
                                                    className="relative inline-flex rounded-full h-1.5 w-1.5"
                                                    style={{ background: PT.red }}
                                                />
                                            </span>
                                            <span
                                                className="text-[10.5px] font-bold uppercase truncate"
                                                style={{ letterSpacing: "0.18em", color: "rgba(10,10,10,0.55)" }}
                                            >
                                                {NAV.length} documentos · Centro Legal
                                            </span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setDocMenuOpen(false)}
                                            data-testid="legal-doc-switcher-close"
                                            aria-label="Fechar"
                                            className="w-6 h-6 grid place-items-center tap-shrink transition"
                                            style={{
                                                background: "rgba(10,10,10,0.04)",
                                                color: "rgba(10,10,10,0.55)",
                                                border: "1px solid rgba(10,10,10,0.06)",
                                                borderRadius: 999,
                                            }}
                                        >
                                            <X size={11} strokeWidth={2.4} />
                                        </button>
                                    </div>

                                    {/* Primary group */}
                                    <div className="py-2 px-1.5">
                                        <div className="px-2.5 py-1.5">
                                            <span
                                                className="text-[10px] font-bold uppercase"
                                                style={{ letterSpacing: "0.18em", color: "rgba(10,10,10,0.42)" }}
                                            >
                                                Primários
                                            </span>
                                        </div>
                                        {PRIMARY.map(({ to, label, icon: Icon, key }) => {
                                            const isActive = active === key;
                                            return (
                                                <Link
                                                    key={key}
                                                    to={to}
                                                    role="menuitem"
                                                    onClick={() => setDocMenuOpen(false)}
                                                    data-testid={`legal-doc-switcher-item-${key}`}
                                                    className="group flex items-center gap-2.5 px-2.5 py-2 relative transition"
                                                    style={{
                                                        background: isActive ? "rgba(200,16,46,0.06)" : "transparent",
                                                        borderRadius: 10,
                                                    }}
                                                >
                                                    {isActive && (
                                                        <span
                                                            aria-hidden
                                                            className="absolute left-[2px] top-[10px] bottom-[10px] w-[2px] rounded-full"
                                                            style={{ background: PT.red }}
                                                        />
                                                    )}
                                                    <span
                                                        className="w-7 h-7 grid place-items-center shrink-0"
                                                        style={{
                                                            background: isActive ? "rgba(200,16,46,0.10)" : "rgba(10,10,10,0.04)",
                                                            color: isActive ? PT.red : "rgba(10,10,10,0.65)",
                                                            borderRadius: 8,
                                                        }}
                                                    >
                                                        <Icon size={13} strokeWidth={isActive ? 2.3 : 2} />
                                                    </span>
                                                    <span
                                                        className="flex-1 text-[13px] font-semibold truncate"
                                                        style={{ color: isActive ? PT.ink : "rgba(10,10,10,0.78)" }}
                                                    >
                                                        {label}
                                                    </span>
                                                    {isActive && (
                                                        <Check size={13} strokeWidth={2.5} style={{ color: PT.red }} aria-hidden />
                                                    )}
                                                </Link>
                                            );
                                        })}
                                    </div>

                                    {/* Specialized group */}
                                    <div className="py-2 px-1.5" style={{ borderTop: "1px solid rgba(10,10,10,0.06)" }}>
                                        <div className="px-2.5 py-1.5">
                                            <span
                                                className="text-[10px] font-bold uppercase"
                                                style={{ letterSpacing: "0.18em", color: "rgba(10,10,10,0.42)" }}
                                            >
                                                Especializados
                                            </span>
                                        </div>
                                        {SPECIALIZED.map(({ to, label, icon: Icon, key }) => {
                                            const isActive = active === key;
                                            return (
                                                <Link
                                                    key={key}
                                                    to={to}
                                                    role="menuitem"
                                                    onClick={() => setDocMenuOpen(false)}
                                                    data-testid={`legal-doc-switcher-item-${key}`}
                                                    className="group flex items-center gap-2.5 px-2.5 py-2 relative transition"
                                                    style={{
                                                        background: isActive ? "rgba(200,16,46,0.06)" : "transparent",
                                                        borderRadius: 10,
                                                    }}
                                                >
                                                    {isActive && (
                                                        <span
                                                            aria-hidden
                                                            className="absolute left-[2px] top-[10px] bottom-[10px] w-[2px] rounded-full"
                                                            style={{ background: PT.red }}
                                                        />
                                                    )}
                                                    <span
                                                        className="w-7 h-7 grid place-items-center shrink-0"
                                                        style={{
                                                            background: isActive ? "rgba(200,16,46,0.10)" : "rgba(10,10,10,0.04)",
                                                            color: isActive ? PT.red : "rgba(10,10,10,0.65)",
                                                            borderRadius: 8,
                                                        }}
                                                    >
                                                        <Icon size={13} strokeWidth={isActive ? 2.3 : 2} />
                                                    </span>
                                                    <span
                                                        className="flex-1 text-[13px] font-semibold truncate"
                                                        style={{ color: isActive ? PT.ink : "rgba(10,10,10,0.78)" }}
                                                    >
                                                        {label}
                                                    </span>
                                                    {isActive && (
                                                        <Check size={13} strokeWidth={2.5} style={{ color: PT.red }} aria-hidden />
                                                    )}
                                                </Link>
                                            );
                                        })}
                                    </div>

                                    {lastUpdated && (
                                        <div
                                            className="px-4 py-2.5 flex items-center gap-2 text-[10.5px] font-bold"
                                            style={{
                                                borderTop: "1px solid rgba(10,10,10,0.06)",
                                                color: "rgba(10,10,10,0.55)",
                                                letterSpacing: "0.04em",
                                            }}
                                        >
                                            <span
                                                className="w-1.5 h-1.5 rounded-full"
                                                style={{ background: PT.green }}
                                            />
                                            Atualizado · {lastUpdated}
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>
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
                {/* Main reading column — wider since left sidebar replaced by floating doc switcher */}
                <main className="col-span-12 lg:col-span-9 order-1 min-w-0">
                    <article ref={articleRef} className="max-w-[760px] mx-auto">
                        <h1
                            data-testid="legal-title"
                            className="font-black tracking-[-0.045em] text-center"
                            style={{ fontSize: "clamp(40px, 6vw, 72px)", lineHeight: 0.96, color: PT.ink }}
                        >
                            {title}
                        </h1>
                        {subtitle && (
                            <p
                                className="mt-5 text-[16px] lg:text-[17.5px] leading-relaxed max-w-[64ch] mx-auto font-medium text-center"
                                style={{ color: "rgba(10,10,10,0.7)" }}
                                dangerouslySetInnerHTML={{ __html: subtitle }}
                            />
                        )}

                        {/* Reading meta — quick info bar */}
                        <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12.5px]" style={{ color: "rgba(10,10,10,0.55)" }} data-testid="legal-reading-meta">
                            {readingTime > 0 && (
                                <span className="inline-flex items-center gap-1.5">
                                    <Clock size={13} strokeWidth={2.1} style={{ color: "rgba(10,10,10,0.45)" }} />
                                    <span className="font-medium"><strong className="font-bold text-[#0A0A0A]">{readingTime} min</strong> de leitura</span>
                                </span>
                            )}
                            {toc.length > 0 && (
                                <span className="inline-flex items-center gap-1.5">
                                    <ListTree size={13} strokeWidth={2.1} style={{ color: "rgba(10,10,10,0.45)" }} />
                                    <span className="font-medium"><strong className="font-bold text-[#0A0A0A]">{toc.length} secções</strong></span>
                                </span>
                            )}
                            {lastUpdated && (
                                <span className="inline-flex items-center gap-1.5">
                                    <Check size={13} strokeWidth={2.5} style={{ color: PT.green }} />
                                    <span className="font-medium">Atualizado · <strong className="font-bold text-[#0A0A0A]">{lastUpdated}</strong></span>
                                </span>
                            )}
                        </div>

                        {eli5 && (
                            <div
                                className="mt-8 px-5 py-4 relative"
                                data-testid="legal-eli5"
                                style={{
                                    background: "#ffffff",
                                    color: PT.ink,
                                    border: "1px solid rgba(10,10,10,0.08)",
                                    borderLeft: `2px solid ${PT.red}`,
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
                                Em caso de divergência entre versões traduzidas, prevalece a versão em português europeu.
                                A invalidade ou ineficácia de qualquer cláusula não afeta as demais. Para qualquer
                                dúvida sobre interpretação destes documentos, escreve para{" "}
                                <a href="mailto:legal@lusorae.pt" className="font-bold underline underline-offset-2" style={{ color: PT.ink }}>
                                    legal@lusorae.pt
                                </a>.
                            </p>
                        </footer>
                    </article>
                </main>

                {/* Right rail — TOC scroll-spy */}
                <aside className="legal-shell-tools hidden lg:block lg:col-span-3 order-2">
                    <div className="sticky top-[80px]">
                        <div className="flex items-center justify-between gap-2 px-2 mb-3.5">
                            <div className="flex items-center gap-2">
                                <ListTree size={13} strokeWidth={2.2} style={{ color: PT.red }} />
                                <span className="text-[11px] font-bold uppercase" style={{ color: "rgba(10,10,10,0.55)", letterSpacing: "0.18em" }}>
                                    Nesta página
                                </span>
                            </div>
                            {toc.length > 0 && (
                                <span className="text-[11px] font-bold tabular-nums" style={{ color: "rgba(10,10,10,0.45)" }} data-testid="legal-toc-progress">
                                    {passedIds.size}/{toc.length}
                                </span>
                            )}
                        </div>
                        <nav data-testid="legal-toc" style={{ borderLeft: "1px solid rgba(10,10,10,0.10)" }}>
                            {toc.length === 0 && (
                                <p className="pl-4 text-[12.5px]" style={{ color: "rgba(10,10,10,0.38)" }}>Sem secções</p>
                            )}
                            {toc.map((t, i) => {
                                const isActive = activeId === t.id;
                                const isPassed = passedIds.has(t.id) && !isActive;
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
                                        className="group flex items-start gap-2 pl-4 pr-2 py-1.5 text-[13px] leading-snug transition"
                                        style={{
                                            marginLeft: -1,
                                            borderLeft: `2px solid ${isActive ? PT.red : (isPassed ? "rgba(4,106,56,0.45)" : "transparent")}`,
                                            color: isActive ? PT.ink : (isPassed ? "rgba(10,10,10,0.42)" : "rgba(10,10,10,0.55)"),
                                            fontWeight: isActive ? 700 : 500,
                                        }}
                                    >
                                        <span className="font-bold text-[11px] shrink-0 inline-flex items-center justify-center w-[18px]" style={{ color: isActive ? PT.red : (isPassed ? PT.green : "rgba(10,10,10,0.32)") }}>
                                            {isPassed ? <Check size={11} strokeWidth={3} /> : String(i + 1).padStart(2, "0")}
                                        </span>
                                        <span className="flex-1 min-w-0">{t.label}</span>
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

            {/* Floating "voltar ao topo" — aparece após scroll. Em mobile substitui
                o botão de Topo do TOC (que fica oculto), em desktop complementa. */}
            <button
                type="button"
                onClick={scrollTop}
                aria-label="Voltar ao topo"
                data-testid="legal-fab-top"
                className="legal-fab-top tap-shrink"
                style={{
                    position: "fixed",
                    right: "clamp(14px, 3vw, 28px)",
                    bottom: "clamp(14px, 3vw, 28px)",
                    width: 48,
                    height: 48,
                    display: "grid",
                    placeItems: "center",
                    background: PT.ink,
                    color: "#fff",
                    border: "1px solid rgba(255,255,255,0.10)",
                    borderRadius: 999,
                    boxShadow: "0 1px 2px rgba(10,10,10,0.10), 0 18px 40px -16px rgba(10,10,10,0.45)",
                    opacity: progress > 8 ? 1 : 0,
                    visibility: progress > 8 ? "visible" : "hidden",
                    transform: progress > 8 ? "translateY(0) scale(1)" : "translateY(10px) scale(0.92)",
                    transition: "opacity 220ms ease, transform 260ms cubic-bezier(0.22,1,0.36,1), visibility 0s linear " + (progress > 8 ? "0s" : "260ms"),
                    zIndex: 45,
                }}
            >
                <ArrowUp size={18} strokeWidth={2.4} />
            </button>

            <SiteFooter />
        </div>
    );
}
