// PtPageShell — clean wrapper para páginas pós-login.
// Sem doodles, sem decorações fanzine. Apenas background neutro.

export function PtPageShell({ children, testid, className = "" }) {
    return (
        <div
            data-testid={testid}
            className={`relative ${className}`}
            style={{ background: "#FFFFFF", minHeight: "100vh" }}
        >
            <div className="relative z-10">
                {children}
            </div>
        </div>
    );
}
