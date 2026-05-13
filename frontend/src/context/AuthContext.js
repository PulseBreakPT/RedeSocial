import { createContext, useContext, useEffect, useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import {
    api,
    formatApiError,
    setStoredToken,
    setAuthListener,
} from "../lib/api";

const AuthContext = createContext(null);

/**
 * Defensive auth model:
 *  · user === null   → still checking
 *  · user === false  → confirmed anonymous
 *  · user === object → authenticated
 *
 * Token is persisted in HttpOnly cookie (primary) + localStorage (backup for
 * Safari ITP / cross-site cookie blocking). The axios interceptor adds the
 * Bearer header from localStorage automatically.
 *
 * Single 401 handler converts every "Não autenticado" / "Sessão expirada" into
 * one polite toast + clean logout. The raw backend string never reaches a user.
 */
export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [checking, setChecking] = useState(true);
    const wasAuthedRef = useRef(false);  // tracks "did we ever know they were logged in"
    const expiredToastShown = useRef(false);

    const refresh = useCallback(async () => {
        try {
            const { data } = await api.get("/auth/me");
            const u = data?.user || false;
            setUser(u);
            if (u) {
                wasAuthedRef.current = true;
                expiredToastShown.current = false;
            }
        } catch {
            setUser(false);
        } finally {
            setChecking(false);
        }
    }, []);

    useEffect(() => { refresh(); }, [refresh]);

    // Wire the global axios 401 listener once
    useEffect(() => {
        setAuthListener((err) => {
            const reason = err?._authReason; // "expired" | "missing" | "anonymous"
            if (reason === "anonymous") {
                // Anonymous users hitting a protected endpoint — silently downgrade,
                // never toast. Anonymous browsing is a feature, not an error.
                if (user !== false) setUser(false);
                return;
            }
            // The user previously had a session that just died (expired/revoked).
            if (wasAuthedRef.current && !expiredToastShown.current) {
                expiredToastShown.current = true;
                toast("A tua sessão expirou. Volta a entrar para continuar.", {
                    duration: 5000,
                    id: "session-expired",     // sonner dedupes by id
                });
            }
            setStoredToken(null);
            setUser(false);
            wasAuthedRef.current = false;
        });
        return () => setAuthListener(null);
    }, [user]);

    const login = async (email, password) => {
        try {
            const { data } = await api.post("/auth/login", { email, password });
            setStoredToken(data.token);
            setUser(data.user);
            wasAuthedRef.current = true;
            expiredToastShown.current = false;
            return { ok: true };
        } catch (e) {
            return { ok: false, error: formatApiError(e) || "Falha ao entrar" };
        }
    };

    const register = async (payload) => {
        try {
            const { data } = await api.post("/auth/register", payload);
            setStoredToken(data.token);
            setUser(data.user);
            wasAuthedRef.current = true;
            expiredToastShown.current = false;
            return { ok: true };
        } catch (e) {
            return { ok: false, error: formatApiError(e) || "Falha ao registar" };
        }
    };

    const logout = async () => {
        try { await api.post("/auth/logout"); } catch { /* silent */ }
        setStoredToken(null);
        setUser(false);
        wasAuthedRef.current = false;
    };

    return (
        <AuthContext.Provider value={{ user, setUser, checking, login, register, logout, refresh }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
