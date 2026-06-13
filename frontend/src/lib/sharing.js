/* ============================================================
   Sharing helper — Web Share API with graceful clipboard fallback.
   Centralised so every "share" action across Lusorae behaves the
   same way (Posts, Stories, Comments, Profiles, Communities).
   ============================================================ */
import { toast } from "sonner";

export function canNativeShare(payload = {}) {
    if (typeof navigator === "undefined" || !navigator.share) return false;
    // navigator.canShare is optional; assume true if not present
    if (navigator.canShare) {
        try { return navigator.canShare(payload); } catch { return true; }
    }
    return true;
}

/**
 * Trigger the native OS share sheet for a Lusorae entity.
 * Falls back to copying the URL to clipboard when native share is unavailable
 * or the user cancels.
 *
 * @param {Object} opts
 * @param {string} opts.url     Required. Absolute URL to share.
 * @param {string} [opts.title] Title shown in the share sheet.
 * @param {string} [opts.text]  Optional accompanying text.
 * @returns {Promise<"native"|"clipboard"|"cancel"|"failed">}
 */
export async function shareEntity({ url, title, text } = {}) {
    if (!url) return "failed";
    const payload = { url, title, text };
    if (canNativeShare(payload)) {
        try {
            await navigator.share(payload);
            return "native";
        } catch (e) {
            // AbortError = user cancelled; treat as silent
            if (e && e.name === "AbortError") return "cancel";
            // fallthrough to clipboard
        }
    }
    try {
        await navigator.clipboard.writeText(url);
        toast.success("Link copiado");
        return "clipboard";
    } catch {
        toast.error("Não foi possível copiar o link");
        return "failed";
    }
}

/**
 * Build a public URL for a Lusorae entity, respecting current origin.
 */
export function postUrl(postId) {
    return `${window.location.origin}/post/${postId}`;
}
export function profileUrl(username) {
    return `${window.location.origin}/u/${username}`;
}
export function commentUrl(postId, commentId) {
    return `${window.location.origin}/post/${postId}#c-${commentId}`;
}

/**
 * Generate an embed HTML snippet for a Lusorae post.
 * Lusorae uses an `oembed`-style iframe at `/embed/post/{id}` that should
 * be served by the backend at a later stage; until then this snippet is
 * still valid for copy-paste into compatible CMS / oEmbed consumers.
 */
export function buildEmbedSnippet(postId, { width = 550, height = 420 } = {}) {
    const src = `${window.location.origin}/embed/post/${postId}`;
    return [
        `<iframe`,
        `    src="${src}"`,
        `    width="${width}"`,
        `    height="${height}"`,
        `    style="border:0;border-radius:16px;max-width:100%;"`,
        `    loading="lazy"`,
        `    title="Publicação Lusorae"`,
        `    allow="clipboard-write"`,
        `    referrerpolicy="strict-origin-when-cross-origin"`,
        `></iframe>`,
    ].join("\n");
}
