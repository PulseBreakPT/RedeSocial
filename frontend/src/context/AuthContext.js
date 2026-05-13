import { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, formatApiError } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null); // null = loading, false = anon, object = user
    const [checking, setChecking] = useState(true);

    const refresh = useCallback(async () => {
        try {
            const { data } = await api.get("/auth/me");
            setUser(data?.user || false);
        } catch {
            setUser(false);
        } finally {
            setChecking(false);
        }
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    const login = async (email, password) => {
        try {
            const { data } = await api.post("/auth/login", { email, password });
            setUser(data.user);
            return { ok: true };
        } catch (e) {
            return { ok: false, error: formatApiError(e) };
        }
    };

    const register = async (payload) => {
        try {
            const { data } = await api.post("/auth/register", payload);
            setUser(data.user);
            return { ok: true };
        } catch (e) {
            return { ok: false, error: formatApiError(e) };
        }
    };

    const logout = async () => {
        try {
            await api.post("/auth/logout");
        } catch {}
        setUser(false);
    };

    return (
        <AuthContext.Provider value={{ user, setUser, checking, login, register, logout, refresh }}>
            {children}
        </AuthContext.Provider>
    );
}

export const useAuth = () => useContext(AuthContext);
