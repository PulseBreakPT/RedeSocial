// ─────────────────────────────────────────────────────────────────────────────
// Defensive frontend helpers — keep user-controlled values from reaching
// dangerous sinks like `<a href=javascript:...>` or DOM event handlers.
// Always use these before rendering URL-bearing data that originated from
// another user (stickers, profile links, story link blocks, etc.).
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Whitelist URL schemes safe to put inside an <a href="..."> for user-supplied
 * content. Anything that doesn't match becomes "#" — the link still renders
 * but clicking does nothing dangerous.
 *
 * Rejected by design:
 *   - javascript:…  (XSS)
 *   - data:text/html,…  (XSS payload smuggling)
 *   - vbscript:…  (legacy IE XSS)
 *   - file:…  (local file probing)
 *   - blob:…  (avoid client-defined opaque URLs)
 *   - chrome:/about:/  (browser internals)
 */
export function safeUrl(url) {
    if (typeof url !== "string") return "#";
    const trimmed = url.trim();
    if (!trimmed) return "#";
    // Relative paths are always safe (same-origin)
    if (trimmed.startsWith("/") && !trimmed.startsWith("//")) return trimmed;
    // Hashes are safe
    if (trimmed.startsWith("#")) return trimmed;
    // Otherwise must be http(s) or mailto/tel
    const lower = trimmed.toLowerCase();
    if (lower.startsWith("http://") || lower.startsWith("https://")) return trimmed;
    if (lower.startsWith("mailto:") || lower.startsWith("tel:")) return trimmed;
    return "#";
}

/**
 * Strip control characters and zero-width tricks that some abuse vectors use
 * to bypass profanity filters or impersonate other accounts.
 */
export function sanitizeDisplayString(s, maxLen = 200) {
    if (typeof s !== "string") return "";
    let out = "";
    for (const ch of s) {
        const code = ch.codePointAt(0);
        // Drop C0/C1 control chars except \n and \t
        if (code < 0x20 && ch !== "\n" && ch !== "\t") continue;
        if (code >= 0x7f && code <= 0x9f) continue;
        // Drop zero-width chars commonly used for spoofing
        if (code === 0x200b || code === 0x200c || code === 0x200d || code === 0xfeff) continue;
        out += ch;
        if (out.length >= maxLen) break;
    }
    return out;
}

/**
 * Read a cookie value safely from document.cookie. Used for CSRF token
 * mirror-cookie pattern (server sets non-HttpOnly XSRF cookie, frontend
 * echoes it back in X-CSRF-Token header — defeats CSRF on cookie auth).
 */
export function readCookie(name) {
    if (typeof document === "undefined") return "";
    const target = name + "=";
    const parts = document.cookie.split(";");
    for (const raw of parts) {
        const p = raw.trim();
        if (p.startsWith(target)) {
            try { return decodeURIComponent(p.slice(target.length)); }
            catch { return p.slice(target.length); }
        }
    }
    return "";
}
