import { Link, useNavigate } from "react-router-dom";
import {
    Bookmark, FileText, Clock, Eye, Users as UsersIcon, TrendingUp,
    Settings, LogOut, ChevronRight,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { PresencePicker } from "../../components/PresencePicker";
import { ConnectionIndicator } from "../../components/WebSocketProvider";

/**
 * AccountPanel — replaces the old avatar dropdown. Shown inside Profile.js
 * when the viewer is on their own profile. Hosts every quick-link that
 * used to live in the user menu, grouped semantically.
 */
const navigateCards = [
    { to: "/communities", label: "Comunidades", icon: UsersIcon, hint: "Grupos a que pertences" },
    { to: "/bookmarks", label: "Guardados", icon: Bookmark, hint: "Posts marcados" },
    { to: "/trending", label: "Tendências", icon: TrendingUp, hint: "Em alta agora" },
];

const activityCards = [
    { to: "/drafts", label: "Rascunhos", icon: FileText, hint: "Textos por publicar" },
    { to: "/scheduled", label: "Agendados", icon: Clock, hint: "Publicações futuras" },
    { to: "/visitors", label: "Visitas", icon: Eye, hint: "Quem te viu" },
];

function Card({ to, label, icon: Icon, hint, testid }) {
    return (
        <Link
            to={to}
            data-testid={testid}
            className="group relative flex items-center gap-3 p-3.5 rounded-2xl bg-white hairline hover:border-black/15 hover:shadow-[0_8px_22px_-12px_rgba(0,0,0,0.18)] transition-all tap-shrink"
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

export function AccountPanel() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    if (!user) return null;

    return (
        <section
            data-testid="account-panel"
            className="px-5 py-6 hairline-b space-y-5"
        >
            {/* Heading + presence row */}
            <div className="flex items-end justify-between gap-3">
                <div>
                    <p className="type-overline">A tua área</p>
                    <h2 className="font-display text-[22px] tracking-tight leading-tight">Atalhos da conta</h2>
                </div>
                <div className="flex items-center gap-2.5">
                    <PresencePicker />
                    <ConnectionIndicator />
                </div>
            </div>

            {/* Navegar */}
            <div data-testid="account-section-navegar">
                <p className="text-[10px] uppercase tracking-[0.14em] text-black/40 font-mono mb-2.5">Navegar</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {navigateCards.map((c) => (
                        <Card key={c.to} {...c} testid={`account-${c.to.replace(/[^a-z]/gi, "")}`} />
                    ))}
                </div>
            </div>

            {/* A minha actividade */}
            <div data-testid="account-section-activity">
                <p className="text-[10px] uppercase tracking-[0.14em] text-black/40 font-mono mb-2.5">A minha actividade</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {activityCards.map((c) => (
                        <Card key={c.to} {...c} testid={`account-${c.to.replace(/[^a-z]/gi, "")}`} />
                    ))}
                </div>
            </div>

            {/* Settings + Logout — paired row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5" data-testid="account-section-control">
                <Link
                    to="/settings"
                    data-testid="account-settings"
                    className="group flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-white hairline hover:border-black/15 hover:shadow-[0_8px_22px_-12px_rgba(0,0,0,0.18)] transition-all tap-shrink"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl grid place-items-center bg-black text-white shrink-0">
                            <Settings size={18} strokeWidth={1.7} />
                        </div>
                        <div>
                            <div className="font-heading font-semibold text-[14px] tracking-tight text-black leading-tight">Definições</div>
                            <div className="text-[11px] text-black/50 leading-tight mt-0.5">Conta, privacidade, aparência</div>
                        </div>
                    </div>
                    <ChevronRight size={15} strokeWidth={1.7} className="text-black/30 group-hover:text-black group-hover:translate-x-0.5 transition" />
                </Link>
                <button
                    onClick={logout}
                    data-testid="account-logout"
                    className="group flex items-center justify-between gap-3 p-3.5 rounded-2xl bg-white hairline hover:border-red-soft/40 hover:bg-red-soft/[0.04] transition-all tap-shrink text-left"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl grid place-items-center bg-red-soft/15 text-red-soft shrink-0">
                            <LogOut size={18} strokeWidth={1.7} />
                        </div>
                        <div>
                            <div className="font-heading font-semibold text-[14px] tracking-tight text-black leading-tight group-hover:text-red-soft transition">Terminar sessão</div>
                            <div className="text-[11px] text-black/50 leading-tight mt-0.5">Sair desta conta neste dispositivo</div>
                        </div>
                    </div>
                    <ChevronRight size={15} strokeWidth={1.7} className="text-black/30 group-hover:text-red-soft group-hover:translate-x-0.5 transition" />
                </button>
            </div>

            {/* Micro footer */}
            <div className="pt-3 hairline-t flex flex-wrap gap-x-3 gap-y-1 text-[10.5px] text-black/40">
                <Link to="/manifesto" className="hover:text-black hover:underline underline-offset-2" data-testid="account-foot-manifesto">Manifesto</Link>
                <Link to="/legal" className="hover:text-black hover:underline underline-offset-2" data-testid="account-foot-legal">Centro Legal</Link>
                <Link to="/legal/terms" className="hover:text-black hover:underline underline-offset-2">Termos</Link>
                <Link to="/legal/privacy" className="hover:text-black hover:underline underline-offset-2">Privacidade</Link>
                <Link to="/legal/cookies" className="hover:text-black hover:underline underline-offset-2">Cookies</Link>
            </div>
            <div className="pt-4 flex justify-center text-[10.5px] text-black/35 tracking-[0.18em] uppercase">
                © lusorae · {new Date().getFullYear()}
            </div>
        </section>
    );
}
