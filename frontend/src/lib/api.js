import axios from "axios";
import { toast } from "sonner";
import { readCookie } from "./safe";

// Always use a relative base URL in the browser. Every Emergent preview / prod
// deploy routes `/api/*` to the backend through the same ingress that serves
// the SPA — so a relative path always reaches the right backend, regardless of
// which preview domain the user is on. This also eliminates an entire class of
// CORS issues (preflight + withCredentials clashing with wildcard origins).
// Server-side rendering / non-browser contexts fall back to the absolute URL.
const BACKEND_URL =
    typeof window !== "undefined" && window.location
        ? ""
        : (process.env.REACT_APP_BACKEND_URL || "");
export const API = `${BACKEND_URL}/api`;

const TOKEN_KEY = "vm_token";

export const api = axios.create({
    baseURL: API,
    withCredentials: true,
});

// ---------------------------------------------------------------
// Token persistence — defence-in-depth against cookie blocking
// (Safari ITP, cross-site cookie partitioning, etc.)
// ---------------------------------------------------------------
export function setStoredToken(token) {
    try {
        if (token) localStorage.setItem(TOKEN_KEY, token);
        else localStorage.removeItem(TOKEN_KEY);
    } catch { /* private mode — silent */ }
}
export function getStoredToken() {
    try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}

// Attach Bearer header from localStorage as a fallback so requests
// authenticate even if the HttpOnly cookie is dropped by the browser.
api.interceptors.request.use((config) => {
    try {
        const token = localStorage.getItem(TOKEN_KEY);
        if (token && !config.headers?.Authorization) {
            config.headers = config.headers || {};
            config.headers.Authorization = `Bearer ${token}`;
        }
        // CSRF mirror-cookie pattern: echo XSRF-TOKEN cookie back in a custom
        // header on every mutating request. Server-side, the cookie auth path
        // requires the cookie value == header value, defeating cross-origin
        // attackers (who cannot read the cookie).
        const method = (config.method || "get").toLowerCase();
        if (method !== "get" && method !== "head" && method !== "options") {
            const csrf = readCookie("XSRF-TOKEN");
            if (csrf) {
                config.headers = config.headers || {};
                if (!config.headers["X-CSRF-Token"]) {
                    config.headers["X-CSRF-Token"] = csrf;
                }
            }
        }
    } catch { /* silent */ }
    return config;
});

// ---------------------------------------------------------------
// Single global 401 handler — flips "Não autenticado" / "Sessão expirada"
// into one centralized, idempotent UX transition (instead of toast spam).
// ---------------------------------------------------------------
let authListener = null;
export function setAuthListener(fn) { authListener = fn; }

api.interceptors.response.use(
    (r) => r,
    (err) => {
        const status = err?.response?.status;
        if (status === 401) {
            // Tag for downstream formatters — never show raw "Não autenticado"
            err._isAuth = true;
            const detail = err?.response?.data?.detail;
            err._authReason =
                detail === "Sessão expirada" ? "expired" :
                detail === "Utilizador não encontrado" ? "missing" :
                "anonymous";
            // Bubble up to the AuthContext listener
            if (authListener) {
                try { authListener(err); } catch { /* silent */ }
            }
        }
        return Promise.reject(err);
    },
);

// ---------------------------------------------------------------
// formatApiError — used in UI. Returns "" for auth errors so toasts
// don't fire "Não autenticado". Real auth UX is handled centrally
// by AuthContext (single "Sessão expirada" toast + clean logout).
// ---------------------------------------------------------------
export function formatApiError(err) {
    if (err?._isAuth) return ""; // auth handled globally — never raw
    const detail = err?.response?.data?.detail;
    if (detail == null) {
        // No response from server — translate axios' "Network Error" / generic
        // browser failures into something a Portuguese user can actually act on.
        const code = err?.code;
        const msg = err?.message || "";
        const isNetwork =
            code === "ERR_NETWORK" ||
            code === "ECONNABORTED" ||
            code === "ERR_CANCELED" ||
            /network error|failed to fetch|load failed/i.test(msg);
        if (isNetwork) {
            return "Sem ligação ao servidor. Verifica a tua internet ou desativa bloqueadores (AdBlock/Brave) e tenta novamente.";
        }
        return msg || "Algo deu errado";
    }
    if (typeof detail === "string") {
        // Defensive: even if interceptor missed it (e.g. third-party SDK),
        // never let the raw backend auth string reach a user.
        if (detail === "Não autenticado" || detail === "Token inválido") return "";
        return detail;
    }
    if (Array.isArray(detail)) {
        return detail
            .map((e) =>
                e && typeof e.msg === "string" ? e.msg : JSON.stringify(e),
            )
            .join(" ");
    }
    if (detail && typeof detail.msg === "string") return detail.msg;
    return String(detail);
}

// ---------------------------------------------------------------
// toastApiError — drop-in replacement for `toastApiError(e)`.
// Suppresses empty / auth-only errors (sonner would otherwise show a blank toast).
// ---------------------------------------------------------------
export function toastApiError(err, fallback) {
    if (err?._isAuth) return; // global auth listener handles UX
    const msg = formatApiError(err) || fallback;
    if (msg) toast.error(msg);
}
