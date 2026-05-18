import { Link } from "react-router-dom";
import {
    Users as UsersIcon, Bookmark, FileText, Settings, ArrowRight,
} from "lucide-react";

/**
 * ProfileSummaryCards — apenas atalhos da conta (visível ao próprio).
 * Cartões "Quem és" (Identidade) e "Em números" (Estatísticas) removidos.
 */

function Card({ title, overline, onAction, actionLabel, children, testid }) {
    return (
        <div
            data-testid={testid}
            className="card-lux p-4 flex flex-col min-h-[180px]"
        >
            <div className="flex items-center justify-between gap-2 mb-3">
                <div className="min-w-0">
                    <p className="type-overline mb-0.5">{overline}</p>
                    <h3 className="font-heading font-bold text-[14.5px] tracking-tight text-black leading-tight truncate">
                        {title}
                    </h3>
                </div>
            </div>
            <div className="flex-1 min-h-0">{children}</div>
            {onAction && (
                <button
                    onClick={onAction}
                    data-testid={`${testid}-action`}
                    className="mt-3 inline-flex items-center justify-between w-full px-2.5 py-1.5 rounded-lg text-[11.5px] font-mono uppercase tracking-[0.12em] text-black/65 hover:text-black hover:bg-black/[0.04] transition tap-shrink"
                >
                    <span>{actionLabel}</span>
                    <ArrowRight size={12} strokeWidth={1.8} />
                </button>
            )}
        </div>
    );
}

function RowItem({ icon: Icon, label, to, onClick }) {
    const inner = (
        <>
            <div className="w-7 h-7 rounded-lg bg-black/[0.04] grid place-items-center shrink-0 text-black/65">
                <Icon size={13} strokeWidth={1.7} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="text-[12.5px] text-black/85 leading-tight truncate font-medium">{label}</div>
            </div>
        </>
    );
    if (to) {
        return (
            <Link to={to} onClick={onClick} className="flex items-center gap-2.5 py-1.5 px-1 rounded-lg hover:bg-black/[0.03] transition tap-shrink">
                {inner}
            </Link>
        );
    }
    return (
        <button onClick={onClick} className="w-full flex items-center gap-2.5 py-1.5 px-1 rounded-lg hover:bg-black/[0.03] transition tap-shrink text-left">
            {inner}
        </button>
    );
}

/* ---------------- CARD: ATALHOS DA CONTA ---------------- */
function AccountShortcutCard({ onOpenPainel }) {
    return (
        <Card
            overline="A tua área"
            title="Atalhos da conta"
            actionLabel="A tua gaveta"
            onAction={onOpenPainel}
            testid="summary-account"
        >
            <div className="space-y-0.5">
                <RowItem icon={UsersIcon}  label="Comunidades" to="/communities" />
                <RowItem icon={Bookmark}   label="Guardados"   to="/bookmarks" />
                <RowItem icon={FileText}   label="Rascunhos"   to="/drafts" />
                <RowItem icon={Settings}   label="Definições"  to="/settings" />
            </div>
        </Card>
    );
}

export function ProfileSummaryCards({ profile, onOpenPainel }) {
    // Só mostramos atalhos no perfil do próprio utilizador. Para perfis
    // de terceiros, a secção é completamente omitida.
    if (!profile.is_self) return null;

    return (
        <section
            data-testid="profile-summary-cards"
            className="px-4 lg:px-6 pt-4 pb-2"
        >
            <div className="grid gap-2.5 lg:gap-3 grid-cols-1 sm:max-w-sm">
                <AccountShortcutCard onOpenPainel={onOpenPainel} />
            </div>
        </section>
    );
}
