/* ============================================================
   UI Preferences — purely client-side, persisted in localStorage.
   Used for behaviours that should not need a server roundtrip,
   such as the personal "Modo zen" (hide counts) toggle and the
   30-day soft-snooze list applied client-side on top of the
   server's mute primitives.
   ============================================================ */

const ZEN_KEY = "lusorae.zen-mode";
const SNOOZE_KEY = "lusorae.snoozed-authors";   // { [username]: untilTimestamp }
const WORDS_KEY = "lusorae.muted-words";        // string[] (lowercased)

const safeParse = (raw, fallback) => {
    try { return JSON.parse(raw); } catch { return fallback; }
};

/* -------------------- Zen mode -------------------- */
export function isZenMode() {
    try { return localStorage.getItem(ZEN_KEY) === "1"; } catch { return false; }
}
export function setZenMode(on) {
    try {
        if (on) localStorage.setItem(ZEN_KEY, "1");
        else localStorage.removeItem(ZEN_KEY);
    } catch { /* noop */ }
    if (typeof document !== "undefined") {
        document.documentElement.classList.toggle("zen-mode", !!on);
    }
    try { window.dispatchEvent(new CustomEvent("lusorae:zen-changed", { detail: { on: !!on } })); } catch { /* noop */ }
}
export function syncZenMode() {
    if (typeof document !== "undefined") {
        document.documentElement.classList.toggle("zen-mode", isZenMode());
    }
}

/* -------------------- Snooze authors (30 days) -------------------- */
const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
function _snoozeMap() {
    try { return safeParse(localStorage.getItem(SNOOZE_KEY), {}) || {}; }
    catch { return {}; }
}
function _saveSnooze(map) {
    try { localStorage.setItem(SNOOZE_KEY, JSON.stringify(map)); } catch { /* noop */ }
    try { window.dispatchEvent(new CustomEvent("lusorae:snooze-changed")); } catch { /* noop */ }
}
export function snoozeAuthor(username, days = 30) {
    const key = (username || "").toLowerCase();
    if (!key) return false;
    const map = _snoozeMap();
    map[key] = Date.now() + days * 24 * 60 * 60 * 1000;
    _saveSnooze(map);
    return true;
}
export function unsnoozeAuthor(username) {
    const key = (username || "").toLowerCase();
    if (!key) return false;
    const map = _snoozeMap();
    delete map[key];
    _saveSnooze(map);
    return true;
}
export function listSnoozedAuthors() {
    const now = Date.now();
    const map = _snoozeMap();
    return Object.entries(map)
        .filter(([, until]) => until > now)
        .map(([username, until]) => ({ username, until }));
}
export function isAuthorSnoozed(username) {
    if (!username) return false;
    const map = _snoozeMap();
    const until = map[username.toLowerCase()];
    if (!until) return false;
    if (until < Date.now()) {
        delete map[username.toLowerCase()];
        _saveSnooze(map);
        return false;
    }
    return true;
}

/* -------------------- Muted words (client-side filter) -------------------- */
function _wordsList() {
    try { return safeParse(localStorage.getItem(WORDS_KEY), []) || []; }
    catch { return []; }
}
function _saveWords(list) {
    try { localStorage.setItem(WORDS_KEY, JSON.stringify(list)); } catch { /* noop */ }
    try { window.dispatchEvent(new CustomEvent("lusorae:muted-words-changed")); } catch { /* noop */ }
}
export function listMutedWords() {
    return _wordsList();
}
export function addMutedWord(word) {
    const w = (word || "").trim().toLowerCase();
    if (!w) return false;
    const list = _wordsList();
    if (list.includes(w)) return true;
    list.push(w);
    _saveWords(list);
    return true;
}
export function removeMutedWord(word) {
    const w = (word || "").trim().toLowerCase();
    if (!w) return false;
    _saveWords(_wordsList().filter((x) => x !== w));
    return true;
}
export function matchesMutedWord(text) {
    if (!text) return null;
    const haystack = String(text).toLowerCase();
    const list = _wordsList();
    for (const w of list) {
        if (haystack.includes(w)) return w;
    }
    return null;
}

/* -------------------- Combined filter for feed -------------------- */
/**
 * Returns the first reason this post should be hidden, or null when it's safe.
 * Combines client-side snooze + muted words filters.
 */
export function shouldHidePost(post) {
    if (!post) return null;
    const username = post.author?.username;
    if (username && isAuthorSnoozed(username)) {
        return { kind: "snoozed", username };
    }
    const m = matchesMutedWord(post.content || "");
    if (m) return { kind: "muted-word", word: m };
    return null;
}
