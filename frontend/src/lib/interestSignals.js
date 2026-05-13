/* ============================================================
   Interest Signals — client-side persistence layer for the
   "soft" engagement signals that don't need backend persistence:
   - muted authors / muted topics / boosted posts / saved notes /
   - "see less" topics / "see more" topics / favourites / collections.
   Stored in localStorage with namespaced keys, with toast feedback
   helpers exposed for the UI.
   ============================================================ */
import { toast } from "sonner";

const K = {
    mutedAuthors:   "signals.mutedAuthors",
    mutedTopics:    "signals.mutedTopics",
    seenLess:       "signals.seenLess",
    seenMore:       "signals.seenMore",
    boostedPosts:   "signals.boostedPosts",
    postNotes:      "signals.postNotes",        /* postId -> note */
    favouriteUsers: "signals.favouriteUsers",
    watchedPosts:   "signals.watchedPosts",     /* posts user wants alerts for */
    storyPosts:     "signals.storyPosts",       /* postId -> {until} 24h-ephemeral */
    collections:    "signals.collections",      /* { name: [postId] } */
};

const get = (k, fallback) => {
    try { return JSON.parse(localStorage.getItem(k) || JSON.stringify(fallback)); }
    catch { return fallback; }
};
const set = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

const addToList = (k, value) => {
    const arr = get(k, []);
    if (!arr.includes(value)) arr.push(value);
    set(k, arr);
};
const removeFromList = (k, value) => {
    const arr = get(k, []).filter((x) => x !== value);
    set(k, arr);
};
const has = (k, value) => get(k, []).includes(value);

/* Authors */
export const muteAuthor = (username) => {
    addToList(K.mutedAuthors, username);
    toast.success(`@${username} silenciado`);
};
export const unmuteAuthor = (username) => {
    removeFromList(K.mutedAuthors, username);
    toast.info(`@${username} reativado`);
};
export const isAuthorMuted = (username) => has(K.mutedAuthors, username);

/* Topics (hashtags or mood labels) */
export const muteTopic = (topic) => {
    addToList(K.mutedTopics, topic.toLowerCase());
    toast.success(`Tópico "${topic}" silenciado`);
};
export const isTopicMuted = (topic) => has(K.mutedTopics, (topic || "").toLowerCase());

/* See less / see more */
export const seeLessOfTopic = (topic) => {
    addToList(K.seenLess, topic.toLowerCase());
    toast.success(`Vamos mostrar-te menos sobre "${topic}"`);
};
export const seeMoreOfTopic = (topic) => {
    addToList(K.seenMore, topic.toLowerCase());
    toast.success(`Vamos mostrar-te mais sobre "${topic}"`);
};

/* Boost (self-promotion flag, visual badge) */
export const toggleBoost = (postId) => {
    const list = get(K.boostedPosts, []);
    const idx = list.indexOf(postId);
    if (idx >= 0) { list.splice(idx, 1); set(K.boostedPosts, list); toast.info("Boost removido"); return false; }
    list.push(postId); set(K.boostedPosts, list);
    toast.success("Post boostado · maior visibilidade ✦");
    return true;
};
export const isBoosted = (postId) => has(K.boostedPosts, postId);

/* Creator notes */
export const setPostNote = (postId, note) => {
    const m = get(K.postNotes, {});
    if (!note?.trim()) { delete m[postId]; toast.info("Nota removida"); }
    else { m[postId] = note.trim(); toast.success("Nota guardada"); }
    set(K.postNotes, m);
};
export const getPostNote = (postId) => (get(K.postNotes, {})[postId]);

/* Story conversion (24h ephemeral) */
export const convertToStory = (postId, hours = 24) => {
    const m = get(K.storyPosts, {});
    m[postId] = { until: Date.now() + hours * 3600 * 1000 };
    set(K.storyPosts, m);
    toast.success(`Convertido em story · expira em ${hours}h`);
};
export const isStory = (postId) => {
    const m = get(K.storyPosts, {});
    const entry = m[postId];
    if (!entry) return false;
    if (Date.now() > entry.until) {
        delete m[postId]; set(K.storyPosts, m);
        return false;
    }
    return true;
};

/* Favourite users */
export const toggleFavouriteUser = (username) => {
    const list = get(K.favouriteUsers, []);
    if (list.includes(username)) {
        const next = list.filter((x) => x !== username);
        set(K.favouriteUsers, next);
        toast.info(`@${username} removido dos favoritos`);
        return false;
    }
    list.push(username); set(K.favouriteUsers, list);
    toast.success(`@${username} adicionado aos favoritos ★`);
    return true;
};
export const isFavouriteUser = (username) => has(K.favouriteUsers, username);

/* Watch post (notifications subscription) */
export const toggleWatchPost = (postId) => {
    const list = get(K.watchedPosts, []);
    if (list.includes(postId)) {
        const next = list.filter((x) => x !== postId);
        set(K.watchedPosts, next);
        toast.info("Post deixou de ser seguido");
        return false;
    }
    list.push(postId); set(K.watchedPosts, list);
    toast.success("A seguir este post · serás notificado de novas respostas");
    return true;
};
export const isWatchingPost = (postId) => has(K.watchedPosts, postId);

/* Collections (named buckets of saved posts) */
export const getCollections = () => get(K.collections, {});
export const addToCollection = (collection, postId) => {
    const all = get(K.collections, {});
    all[collection] = all[collection] || [];
    if (!all[collection].includes(postId)) all[collection].push(postId);
    set(K.collections, all);
    toast.success(`Adicionado a "${collection}"`);
};
