import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, FileText, ShieldCheck, Cookie, Scale, Sparkle } from "lucide-react";

/**
 * Shell layout for legal pages.
 * Public — does NOT require auth.
 * Provides a clean reading column + cross-links between legal documents.
 */
export function LegalShell({ title, subtitle, lastUpdated, children, active }) {
    const navigate = useNavigate();
    const nav = [
        { to: "/legal", label: "Visão geral", icon: Scale, key: "index" },
        { to: "/legal/terms", label: "Termos e Condições", icon: FileText, key: "terms" },
        { to: "/legal/privacy", label: "Política de Privacidade", icon: ShieldCheck, key: "privacy" },
        { to: "/legal/cookies", label: "Política de Cookies", icon: Cookie, key: "cookies" },
        { to: "/legal/community", label: "Diretrizes da Comunidade", icon: Sparkle, key: "community" },
    ];

    return (
        <div className="min-h-screen bg-white text-black">
            {/* Top bar (public — no app chrome) */}
            <header className="sticky top-0 z-30 glass border-b border-black/[0.06]">
                <div className="max-w-[1200px] mx-auto flex items-center gap-3 px-4 lg:px-8 py-3.5">
                    <button
                        onClick={() => navigate(-1)}
                        className="w-9 h-9 rounded-full grid place-items-center text-black hover:bg-black/[0.06] tap-shrink"
                        aria-label="Voltar"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <Link to="/" className="inline-flex items-center gap-2 group">
                        <span aria-hidden className="w-2.5 h-2.5 rotate-45 bg-black rounded-[2px]" />
                        <span className="font-display text-[17px] font-bold tracking-tight">vermillion</span>
                    </Link>
                    <span className="ml-2 hidden sm:inline text-[11px] uppercase tracking-[0.14em] text-black/45 font-mono">
                        Centro Legal
                    </span>
                </div>
            </header>

            <div className="max-w-[1200px] mx-auto px-4 lg:px-8 grid grid-cols-12 gap-6 lg:gap-10 py-6 lg:py-10">
                {/* Sidebar nav */}
                <aside className="col-span-12 lg:col-span-3">
                    <div className="lg:sticky lg:top-[80px]">
                        <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible scrollbar-hide pb-1">
                            {nav.map(({ to, label, icon: Icon, key }) => {
                                const isActive = active === key;
                                return (
                                    <Link
                                        key={key}
                                        to={to}
                                        className={`shrink-0 lg:shrink inline-flex items-center gap-2.5 px-3.5 py-2.5 rounded-full text-[13px] tracking-tight transition ${
                                            isActive
                                                ? "chip-on font-semibold"
                                                : "text-black hover:bg-black/[0.045]"
                                        }`}
                                    >
                                        <Icon size={16} strokeWidth={isActive ? 2 : 1.6} />
                                        <span className="whitespace-nowrap">{label}</span>
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>
                </aside>

                {/* Main reading column */}
                <main className="col-span-12 lg:col-span-9">
                    <article className="max-w-[760px]">
                        <h1 className="font-display text-[32px] lg:text-[40px] font-bold tracking-tight leading-[1.05] text-black">
                            {title}
                        </h1>
                        {subtitle && (
                            <p className="mt-3 text-[15px] lg:text-[16px] text-black/65 leading-relaxed">
                                {subtitle}
                            </p>
                        )}
                        {lastUpdated && (
                            <p className="mt-4 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-black/45 font-mono">
                                Atualizado em {lastUpdated}
                            </p>
                        )}

                        <div className="mt-8 prose-legal">{children}</div>

                        <hr className="my-12 border-black/[0.08]" />

                        <footer className="text-[12px] text-black/50 leading-relaxed">
                            <p>
                                As menções entre <code className="bg-black/[0.04] px-1 py-0.5 rounded text-[11px]">[ ]</code>{" "}
                                identificam dados a preencher pela entidade responsável antes da publicação definitiva.
                            </p>
                            <p className="mt-2">
                                Em caso de divergência entre versões traduzidas, prevalece a versão em português europeu.
                                A invalidade ou ineficácia de qualquer cláusula não afeta as demais.
                            </p>
                        </footer>
                    </article>
                </main>
            </div>
        </div>
    );
}
