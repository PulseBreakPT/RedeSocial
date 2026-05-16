import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
    X, Bookmark, FileText, Clock, Eye, Settings, LogOut,
    ChevronRight, BarChart3, Activity as ActivityIcon, Flame,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { StatsCard } from "../../components/StatsCard";
import { ActivityHeatmap } from "../../components/ActivityHeatmap";
import { StreakCard } from "../../components/StreakCard";
import { MesaPanel } from "../../components/MesaPanel";
import { CharmsPanel } from "../../components/CharmsPanel";
import { CharmsProgressPanel } from "../../components/CharmsProgressPanel";
import { SeriesSection } from "../../components/SeriesSection";
import { FingerprintGrid } from "./FingerprintGrid";
import { RhythmPanel } from "./RhythmPanel";
import { PresencePicker } from "../../components/PresencePicker";
import { ConnectionIndicator } from "../../components/WebSocketProvider";
import { useEscapeKey } from "../../hooks/useClickOutside";

const contentCards = [
    { to: "/bookmarks", label: "Guardados", icon: Bookmark, hint: "Posts marcados" },
    { to: "/drafts", label: "Rascunhos", icon: FileText, hint: "Textos por publicar" },
    { to: "/scheduled", label: "Agendados", icon: Clock, hint: "Publicações futuras" },
    { to: "/visitors", label: "Visitas", icon: Eye, hint: "Quem te viu o perfil" },
];

function QuickCard({ to, label, icon: Icon, hint, onClick }) {
    return (
        <Link
            to={to}
            onClick={onClick}
            className="group flex items-center gap-3 p-3.5 rounded-2xl bg-white hairline hover:border-black/15 hover:shadow-[0_8px_22px_-12px_rgba(0,0,0,0.18)] transition-all tap-shrink"
            data-testid={`painel-card-${to.replace(/[^a-z]/gi, "")}`}
        >
            <div className="w-10 h-10 rounded-xl grid place-items-center bg-black/[0.04] group-hover:bg-black/[0.06] transition shrink-0">
                <Icon size={18} strokeWidth={1.7} className="text-black/75" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="font-heading font-semibold text-[14px] tracking-tight text-black leading-tight">{label}</div>
                <div className="text-[11px] text-black/50 leading-tight mt-0.5 truncate">{hint}</div>
            </div>
            <ChevronRight size={15} strokeWidth={1.7} className="text-black/30 group-hover:text-black group-hover:translate-x-0.5 transition" />
        </Link>
    );
}

function SectionTitle({ icon: Icon, label }) {
    return (
        <div className="flex items-center gap-2 mb-3">
            <Icon size={13} strokeWidth={1.8} className="text-black/55" />
            <p className="text-[10px] uppercase tracking-[0.14em] text-black/45 font-mono">{label}</p>
            <span className="flex-1 h-px bg-black/[0.07] ml-2" />
        </div>
    );
}

/**
 * PainelPessoalDrawer — mobile bottom sheet / desktop right panel.
 * Hosts every PRIVATE/account piece previously scattered through Profile.js:
 *   · O meu conteúdo: Guardados, Rascunhos, Agendados, Visitas
 *   · Análise: Streak, StatsCard, Mesa, Charms, Series, Fingerprint, Rhythm, Heatmap
 *   · Definições + Logout
 *   · Micro-footer with legal links
 */
export function PainelPessoalDrawer({ open, onClose, profile, stats, heatmap, fingerprint, firstName }) {
    const { logout } = useAuth();
    const [closing, setClosing] = useState(false);

    useEscapeKey(() => close(), open);

    useEffect(() => {
        if (open) {
            const prev = document.body.style.overflow;
            document.body.style.overflow = "hidden";
            return () => { document.body.style.overflow = prev; };
        }
    }, [open]);

    if (!open && !closing) return null;

    const close = () => {
        setClosing(true);
        setTimeout(() => { setClosing(false); onClose(); }, 180);
    };

    const handleLinkClick = () => close();

    return (
        <div
            className="fixed inset-0 z-[60] flex justify-end"
            data-testid="painel-pessoal-drawer"
            aria-modal="true"
            role="dialog"
        >
            {/* Backdrop */}
            <div
                onClick={close}
                className={`absolute inset-0 bg-black/45 backdrop-blur-sm transition-opacity duration-200 ${closing ? "opacity-0" : "opacity-100"}`}
            />

            {/* Panel — full sheet on mobile, side panel on desktop */}
            <aside
                className={`relative bg-white w-full lg:w-[480px] lg:max-w-[90vw] h-full overflow-y-auto shadow-2xl ${
                    closing ? "anim-slide-out-right" : "anim-slide-in-right"
                }`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Sticky header */}
                <div className="sticky top-0 z-10 bg-white/95 backdrop-blur-xl hairline-b px-5 py-4 flex items-center justify-between">
                    <div>
                        <p className="type-overline mb-0.5">A tua área</p>
                        <h2 className="font-display text-[22px] tracking-tight leading-none">Painel pessoal</h2>
                    </div>
                    <button
                        onClick={close}
                        className="w-9 h-9 rounded-full grid place-items-center hover:bg-black/[0.06] tap-shrink"
                        aria-label="Fechar painel"
                        data-testid="painel-close"
                    >
                        <X size={18} strokeWidth={1.6} />
                    </button>
                </div>

                {/* Presence row */}
                <div className="px-5 py-3 hairline-b flex items-center justify-between gap-2 bg-black/[0.015]">
                    <PresencePicker />
                    <ConnectionIndicator />
                </div>

                <div className="px-5 py-5 space-y-7">
                    {/* O meu conteúdo */}
                    <section>
                        <SectionTitle icon={Bookmark} label="O meu conteúdo" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {contentCards.map((c) => (
                                <QuickCard key={c.to} {...c} onClick={handleLinkClick} />
                            ))}
                        </div>
                    </section>

                    {/* Análise rápida */}
                    <section>
                        <SectionTitle icon={BarChart3} label="Análise" />
                        <div className="space-y-3">
                            {/* Streak + Mesa horizontal */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <StreakCard username={profile.username} />
                                <MesaPanel />
                            </div>
                            {/* Charms + Series */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <CharmsPanel username={profile.username} editable={true} />
                                <SeriesSection username={profile.username} isSelf={true} />
                            </div>
                            <CharmsProgressPanel username={profile.username} />
                            {/* StatsCard */}
                            <StatsCard stats={stats} completion={stats?.profile_completion} />
                        </div>
                    </section>

                    {/* Atividade detalhada */}
                    {(heatmap?.length > 0 || (fingerprint?.available && fingerprint?.posts_analyzed > 0)) && (
                        <section>
                            <SectionTitle icon={ActivityIcon} label="Atividade" />
                            <div className="space-y-3">
                                {fingerprint?.available && fingerprint?.posts_analyzed > 0 && (
                                    <div className="-mx-5">
                                        <FingerprintGrid fp={fingerprint} firstName={firstName} />
                                    </div>
                                )}
                                {heatmap?.length > 0 && (
                                    <div className="-mx-5">
                                        <RhythmPanel heatmap={heatmap} fingerprint={fingerprint} firstName={firstName} />
                                    </div>
                                )}
                                {heatmap?.length > 0 && (
                                    <div className="-mx-5">
                                        <ActivityHeatmap data={heatmap} />
                                    </div>
                                )}
                            </div>
                        </section>
                    )}

                    {/* Definições + Logout */}
                    <section>
                        <SectionTitle icon={Settings} label="Conta" />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <Link
                                to="/settings"
                                onClick={handleLinkClick}
                                className="group flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-white hairline hover:border-black/15 hover:shadow-[0_8px_22px_-12px_rgba(0,0,0,0.18)] transition-all tap-shrink"
                                data-testid="painel-settings"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl grid place-items-center bg-black text-white shrink-0">
                                        <Settings size={18} strokeWidth={1.7} />
                                    </div>
                                    <div>
                                        <div className="font-heading font-semibold text-[14px] tracking-tight text-black leading-tight">Definições</div>
                                        <div className="text-[11px] text-black/50 leading-tight mt-0.5">Conta · Privacidade · Aparência</div>
                                    </div>
                                </div>
                                <ChevronRight size={15} strokeWidth={1.7} className="text-black/30 group-hover:text-black group-hover:translate-x-0.5 transition" />
                            </Link>
                            <button
                                onClick={() => { close(); logout(); }}
                                data-testid="painel-logout"
                                className="group flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-white hairline hover:border-red-soft/40 hover:bg-red-soft/[0.04] transition-all tap-shrink text-left"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl grid place-items-center bg-red-soft/15 text-red-soft shrink-0">
                                        <LogOut size={18} strokeWidth={1.7} />
                                    </div>
                                    <div>
                                        <div className="font-heading font-semibold text-[14px] tracking-tight text-black leading-tight group-hover:text-red-soft transition">Terminar sessão</div>
                                        <div className="text-[11px] text-black/50 leading-tight mt-0.5">Sair desta conta</div>
                                    </div>
                                </div>
                                <ChevronRight size={15} strokeWidth={1.7} className="text-black/30 group-hover:text-red-soft group-hover:translate-x-0.5 transition" />
                            </button>
                        </div>
                    </section>

                    {/* Footer micro */}
                    <div className="pt-3 hairline-t flex flex-wrap gap-x-3 gap-y-1 text-[10.5px] text-black/40">
                        <Link to="/manifesto" onClick={handleLinkClick} className="hover:text-black hover:underline underline-offset-2">Manifesto</Link>
                        <Link to="/legal" onClick={handleLinkClick} className="hover:text-black hover:underline underline-offset-2">Centro Legal</Link>
                        <Link to="/legal/terms" onClick={handleLinkClick} className="hover:text-black hover:underline underline-offset-2">Termos</Link>
                        <Link to="/legal/privacy" onClick={handleLinkClick} className="hover:text-black hover:underline underline-offset-2">Privacidade</Link>
                        <Link to="/legal/cookies" onClick={handleLinkClick} className="hover:text-black hover:underline underline-offset-2">Cookies</Link>
                        <span className="font-mono text-black/30 ml-auto">© Vermillion</span>
                    </div>
                </div>
            </aside>
        </div>
    );
}
