import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { PT } from "../pages/auth/AuthDecor";

// =============================================================================
// PageHeader — sticky header (clean editorial)
// =============================================================================
export function PageHeader({ title, subtitle, action, back = false, children, sticky = true, testid }) {
    const navigate = useNavigate();
    return (
        <div
            data-testid={testid}
            className={`${sticky ? "sticky" : ""} top-[var(--mobile-topbar-h)] lg:top-0 z-30`}
            style={{
                background: "rgba(255,255,255,0.92)",
                backdropFilter: "blur(20px) saturate(180%)",
                WebkitBackdropFilter: "blur(20px) saturate(180%)",
                borderBottom: "1px solid rgba(10,10,10,0.06)",
            }}
        >
            <div className="flex items-center gap-3 px-4 lg:px-5 py-3 lg:py-4 min-h-[56px]">
                {back && (
                    <button
                        onClick={() => navigate(-1)}
                        data-testid="page-back"
                        aria-label="voltar"
                        className="lg:hidden -ml-1 w-9 h-9 grid place-items-center tap-shrink transition"
                        style={{
                            background: "#fff",
                            color: PT.ink,
                            border: "1px solid rgba(10,10,10,0.10)",
                            borderRadius: 999,
                        }}
                    >
                        <ArrowLeft size={18} strokeWidth={2.2} />
                    </button>
                )}
                <div className="flex-1 min-w-0">
                    <h1
                        className="font-black tracking-[-0.025em] leading-tight truncate"
                        style={{ fontSize: "clamp(20px, 2.4vw, 24px)", color: PT.ink }}
                    >
                        {title}
                    </h1>
                    {subtitle && (
                        <p
                            className="text-[10.5px] truncate mt-0.5 font-mono font-bold uppercase"
                            style={{ color: "rgba(10,10,10,0.5)", letterSpacing: "0.18em" }}
                        >
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
