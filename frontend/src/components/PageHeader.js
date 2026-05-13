import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

/**
 * Sticky page header that adapts to mobile (compact, with optional back arrow)
 * and desktop (taller). Sits BELOW the MobileTopBar on mobile and at the top on desktop.
 */
export function PageHeader({ title, subtitle, action, back = false, children, sticky = true, testid }) {
    const navigate = useNavigate();
    return (
        <div
            data-testid={testid}
            className={`${sticky ? "sticky" : ""} top-[var(--mobile-topbar-h)] lg:top-0 z-30 glass border-b border-white/[0.05]`}
        >
            <div className="flex items-center gap-3 px-4 lg:px-5 py-3 lg:py-4 min-h-[52px]">
                {back && (
                    <button
                        onClick={() => navigate(-1)}
                        data-testid="page-back"
                        aria-label="voltar"
                        className="lg:hidden -ml-1 w-9 h-9 rounded-full grid place-items-center text-zinc-300 hover:bg-white/[0.06] tap-shrink"
                    >
                        <ArrowLeft size={20} />
                    </button>
                )}
                <div className="flex-1 min-w-0">
                    <h1 className="font-heading text-[18px] lg:text-[22px] font-bold tracking-tight truncate">
                        {title}
                    </h1>
                    {subtitle && (
                        <p className="font-mono text-[10px] lg:text-xs uppercase tracking-[0.18em] text-zinc-500 mt-0.5 truncate">
                            {subtitle}
                        </p>
                    )}
                </div>
                {action && <div className="flex-shrink-0">{action}</div>}
            </div>
            {children}
        </div>
    );
}
