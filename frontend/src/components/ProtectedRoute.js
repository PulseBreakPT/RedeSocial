import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export function ProtectedRoute({ children }) {
    const { user, checking } = useAuth();
    if (checking) {
        return (
            <div className="min-h-screen grid place-items-center">
                <div className="text-zinc-500 font-mono text-sm" data-testid="loading-state">a carregar...</div>
            </div>
        );
    }
    if (!user) return <Navigate to="/login" replace />;
    return children;
}
