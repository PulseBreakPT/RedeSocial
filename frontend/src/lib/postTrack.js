// Pequeno cache de \"posts vizinhos\" para permitir navegação entre posts
// sem refazer requests. O Feed/Explore populam isto ao carregar; o PostDetail
// lê para saber o post anterior/seguinte.
//
// Estrutura por chave (uma chave por feed):
//   { tab: \"foryou\", ids: [\"...\", \"...\"], at: 1730000000000 }
//
// Vive em sessionStorage (não polui localStorage).

const KEY = "vmln:post-track:v2";
const MAX_TRACKS = 4;

function readAll() {
    try {
        const raw = sessionStorage.getItem(KEY);
        if (!raw) return [];
        const arr = JSON.parse(raw);
        return Array.isArray(arr) ? arr : [];
    } catch { return []; }
}
function writeAll(arr) {
    try { sessionStorage.setItem(KEY, JSON.stringify(arr.slice(0, MAX_TRACKS))); } catch {}
}

export function trackPostList(tab, ids) {
    if (!Array.isArray(ids) || ids.length === 0) return;
    const cleaned = ids.filter(Boolean).slice(0, 200);
    const next = [{ tab: tab || "default", ids: cleaned, at: Date.now() }];
    for (const t of readAll()) {
        if (t.tab !== (tab || "default")) next.push(t);
    }
    writeAll(next);
}

export function findNeighbors(postId) {
    if (!postId) return null;
    const tracks = readAll();
    for (const t of tracks) {
        const idx = t.ids.indexOf(postId);
        if (idx === -1) continue;
        return {
            tab: t.tab,
            index: idx,
            total: t.ids.length,
            prev: idx > 0 ? t.ids[idx - 1] : null,
            next: idx + 1 < t.ids.length ? t.ids[idx + 1] : null,
        };
    }
    return null;
}
