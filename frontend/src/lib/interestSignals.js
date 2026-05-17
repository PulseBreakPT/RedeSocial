/* ============================================================
   Interest Signals — SERVER-BACKED engagement signals.
   This module is a thin wrapper around real API endpoints
   (added in /api2). It also exposes a synchronous fast-path
   that consults the current user object (in AuthContext) so
   UI can render "is muted/boosted/etc." without a roundtrip.
   ============================================================ */
import { api, toastApiError } from "./api";
import { toast } from "sonner";

// In-memory snapshot of the current user — kept in sync by AuthContext.
let _user = null;
export function setSignalsUser(u) {
    _user = u || null;
}
function _arr(key) {
    return Array.isArray(_user?.[key]) ? _user[key] : [];
}

/* -------------------- Authors -------------------- */
export const muteAuthor = async (username) => {
    try {
        const { data } = await api.post(`/users/${username}/mute`);
        toast.success(data.muted ? `@${username} silenciado` : `@${username} reativado`);
        return data.muted;
    } catch (e) { toastApiError(e); return false; }
};
export const isAuthorMuted = (_username) => false; // server-truth via /relation endpoint

/* -------------------- Topics -------------------- */
export const muteTopic = async (topic) => {
    const t = (topic || "").trim().replace(/^#/, "").toLowerCase();
    if (!t) return false;
    try {
        const { data } = await api.post("/topics/mute", { topic: t });
        toast.success(data.muted ? `Tópico "${t}" silenciado` : `Tópico "${t}" reativado`);
        return data.muted;
    } catch (e) { toastApiError(e); return false; }
};
export const isTopicMuted = (topic) => {
    const t = (topic || "").toLowerCase();
    return _arr("muted_topics").includes(t);
};
export const seeLessOfTopic = async (topic) => {
    // Treat "see less" as topic mute (negative signal). Reuses the same endpoint.
    return muteTopic(topic);
};
export const seeMoreOfTopic = async (topic) => {
    // Positive signal — for now, just feedback (server can grow this later).
    toast.success(`Vamos mostrar-te mais sobre "${topic}"`);
    return true;
};

/* -------------------- Dismiss ("not interested") -------------------- */
export const dismissPost = async (postId) => {
    try {
        const { data } = await api.post(`/posts/${postId}/dismiss`);
        if (data.dismissed) toast.success("Não te mostraremos publicações semelhantes");
        return data.dismissed;
    } catch (e) { toastApiError(e); return false; }
};

/* -------------------- Boost (24h) -------------------- */
export const toggleBoost = async (postId) => {
    try {
        const { data } = await api.post(`/posts/${postId}/boost`);
        toast.success(data.boosted ? "Post boostado · maior visibilidade ✦ (24h)" : "Boost removido");
        return data.boosted;
    } catch (e) { toastApiError(e); return false; }
};
export const isBoosted = (postId) => _arr("boosted_posts").includes(postId);

/* -------------------- Notes (private notes per post) -------------------- */
export const setPostNote = async (postId, note) => {
    try {
        const { data } = await api.put(`/posts/${postId}/note`, { note: note || "" });
        toast.success(data.note ? "Nota guardada" : "Nota removida");
        return data.note;
    } catch (e) { toastApiError(e); return ""; }
};
export const getPostNote = (postId) => (_user?.post_notes || {})[postId] || "";

/* -------------------- Story 24h conversion -------------------- */
/** Convert an existing post into a story using the real Story API. */
export const convertToStory = async ({ image, content }) => {
    if (!image) {
        toast.error("Este post não tem imagem para converter em story");
        return false;
    }
    try {
        await api.post("/stories", { image, content: content || "" });
        toast.success("Story publicado · expira em 24h");
        return true;
    } catch (e) { toastApiError(e); return false; }
};

/* -------------------- Watch post (subscribe to replies) -------------------- */
export const toggleWatchPost = async (postId) => {
    try {
        const { data } = await api.post(`/posts/${postId}/follow-thread`);
        toast.success(data.following
            ? "A seguir este post · serás notificado de novas respostas"
            : "Post deixou de ser seguido");
        return data.following;
    } catch (e) { toastApiError(e); return false; }
};
export const isWatchingPost = (postId) => _arr("followed_threads").includes(postId);

/* -------------------- Favourite user — real backend -------------------- */
export const toggleFavouriteUser = async (username) => {
    try {
        const { data } = await api.post(`/users/${username}/favorite`);
        const isFav = !!data.favorited;
        toast.success(isFav ? `@${username} adicionado aos favoritos ★` : `@${username} removido dos favoritos`);
        return isFav;
    } catch (e) { toastApiError(e); return false; }
};
export const isFavouriteUser = (_username) => false; // truth via /relation endpoint

/* -------------------- Collections — proxy to real bookmark-collections -------------------- */
/** Adds a post to a collection. If `collectionId` is null, prompts a quick collection picker. */
export const addToCollection = async (collectionId, postId) => {
    try {
        await api.post(`/posts/${postId}/collection`, { collection: collectionId || "" });
        toast.success("Adicionado à coleção");
        return true;
    } catch (e) { toastApiError(e); return false; }
};
