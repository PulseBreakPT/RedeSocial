import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

/**
 * Sticky page header used across most pages.
 * Sits below the MobileTopBar on mobile and at the top on desktop.
 * Modern social-network style: bold title + small subtitle.
 */
export function PageHeader({ title, subtitle, action, back = false, children, sticky = true, testid }) {
    const navigate = useNavigate();
    return (
        <div
            data-testid={testid}
            className={`${sticky ? "sticky" : ""} top-[var(--mobile-topbar-h)] lg:top-0 z-30 glass border-b border-black/[0.06]`}
        >
            <div className="flex items-center gap-3 px-4 lg:px-5 py-3 lg:py-4 min-h-[56px]">
                {back && (
                    <button
                        onClick={() => navigate(-1)}
                        data-testid="page-back"
                        aria-label="voltar"
                        className="lg:hidden -ml-1 w-9 h-9 rounded-full grid place-items-center text-black/70 hover:bg-black/[0.04] tap-shrink"
                    >
                        <ArrowLeft size={20} />
                    </button>
                )}
                <div className="flex-1 min-w-0">
                    <h1 className="font-display text-[20px] lg:text-[22px] font-bold tracking-tight leading-tight truncate text-black">
                        {title}
                    </h1>
                    {subtitle && (
                        <p className="text-[12px] text-black/50 truncate mt-0.5 font-medium">
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
