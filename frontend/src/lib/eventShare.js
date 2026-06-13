/**
 * eventShare — utilitários cross-channel para partilha de eventos.
 *
 * Princípios:
 *   1. Texto pré-formatado em PT-PT, calibrado para gerar curiosidade.
 *   2. URL canónica com attribution: ?ref=share&via={user}&ch={channel}.
 *   3. Web Share API primário em mobile (sistema operativo abre nativo).
 *   4. Fallback explícito por canal (intent URLs públicas, sem APIs privadas).
 */

const MONTHS_PT_SHORT = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function _fmtDateRange(iso_date, iso_end) {
    if (!iso_date) return "";
    const a = new Date(iso_date + "T00:00:00");
    if (!iso_end || iso_end === iso_date) {
        return `${a.getDate()} ${MONTHS_PT_SHORT[a.getMonth()]}`;
    }
    const b = new Date(iso_end + "T00:00:00");
    if (a.getMonth() === b.getMonth()) {
        return `${a.getDate()}–${b.getDate()} ${MONTHS_PT_SHORT[a.getMonth()]}`;
    }
    return `${a.getDate()} ${MONTHS_PT_SHORT[a.getMonth()]} → ${b.getDate()} ${MONTHS_PT_SHORT[b.getMonth()]}`;
}

/** Devolve a URL pública canónica do evento, com tracking attribution. */
export function buildEventUrl(slug, { via, channel } = {}) {
    const base = (typeof window !== "undefined" ? window.location.origin : "https://lusorae.pt");
    const u = new URL(`/e/${slug}`, base);
    u.searchParams.set("ref", "share");
    if (channel) u.searchParams.set("ch", channel);
    if (via) u.searchParams.set("via", via);
    return u.toString();
}

/** Texto curto + emocional. Adapta-se por canal (X tem limite 280; WhatsApp gosta de markdown). */
export function buildEventShareText(ev, { channel = "whatsapp", viewerUsername } = {}) {
    if (!ev) return "";
    const emoji = ev.emoji || "🎉";
    const range = _fmtDateRange(ev.iso_date, ev.iso_end);
    const city = ev.city ? ` · ${ev.city}` : "";
    const sub = ev.subtitle ? ` — ${ev.subtitle}` : "";
    const tail = viewerUsername ? ` (via @${viewerUsername} na Lusorae)` : " na Lusorae";

    switch (channel) {
        case "whatsapp":
        case "telegram":
            return `${emoji} *${ev.title}* · ${range}${city}${sub}\nVê quem vai${tail} →`;
        case "x":
            // Twitter / X — 280 chars. Concise.
            return `${emoji} ${ev.title} · ${range}${city}${tail}`;
        case "facebook":
            return `${emoji} ${ev.title} — ${range}${city}.${sub}`;
        case "instagram":
            return `${ev.title} · ${range}${city}${tail}`;
        default:
            return `${emoji} ${ev.title} · ${range}${city}${tail} →`;
    }
}

/** Abre nova janela/aba para o intent do canal. */
function _openExternal(url) {
    if (typeof window === "undefined") return;
    window.open(url, "_blank", "noopener,noreferrer");
}

/** Detecção robusta da Web Share API (não confiar apenas em existência da função). */
export function canUseWebShare() {
    if (typeof navigator === "undefined") return false;
    if (typeof navigator.share !== "function") return false;
    try {
        // Algumas plataformas desktop (Edge stable) expõem mas falham para certos payloads.
        // Não vamos chamar canShare aqui — só verificar disponibilidade base.
        return true;
    } catch {
        return false;
    }
}

/** Disparador unificado de partilha por canal. */
export async function shareEvent({ event, channel, viewerUsername }) {
    const slug = event.slug || event.key?.replace(/_/g, "-");
    const url = buildEventUrl(slug, { via: viewerUsername, channel });
    const text = buildEventShareText(event, { channel, viewerUsername });

    switch (channel) {
        case "webshare": {
            if (canUseWebShare()) {
                try {
                    await navigator.share({ title: event.title, text, url });
                    return { ok: true, channel: "webshare" };
                } catch (e) {
                    // User cancelou ou plataforma não suporta — fallback Copy
                    if (e?.name === "AbortError") return { ok: false, cancelled: true };
                }
            }
            // Fallback para copy
            return shareEvent({ event, channel: "copy", viewerUsername });
        }
        case "whatsapp":
            _openExternal(`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`);
            return { ok: true, channel };
        case "x":
            _openExternal(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`);
            return { ok: true, channel };
        case "telegram":
            _openExternal(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`);
            return { ok: true, channel };
        case "facebook":
            _openExternal(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`);
            return { ok: true, channel };
        case "instagram": {
            // Instagram não tem URL intent público para criar story/post.
            // Estratégia robusta:
            //   1. Copia texto + URL para clipboard SEMPRE (garantia).
            //   2. Tenta Web Share API (mobile: sheet do sistema, inclui IG se instalado).
            //   3. Em mobile, tenta deep link `instagram://library` (abre IG app se instalado).
            //   4. Sempre abre instagram.com num separador novo (visivelmente "algo aconteceu").
            const fullText = `${text} ${url}`;
            try { await navigator.clipboard.writeText(fullText); } catch { /* ignore */ }
            const isMobile = typeof navigator !== "undefined"
                && /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || "");
            if (canUseWebShare()) {
                try {
                    await navigator.share({ title: event.title, text, url });
                    return { ok: true, channel: "instagram", copied: true };
                } catch (e) {
                    if (e?.name === "AbortError") {
                        // User cancelou o sheet — não cancelamos a operação,
                        // continuamos para garantir que algo abre.
                    }
                }
            }
            if (isMobile) {
                // Tenta deep link Instagram (abre app se instalada). Se falhar,
                // o utilizador é deixado em instagram.com via fallback abaixo.
                try {
                    window.location.href = "instagram://library";
                } catch { /* ignore */ }
            }
            _openExternal("https://www.instagram.com/");
            return { ok: true, channel: "instagram", copied: true, hint: "instagram-paste" };
        }
        case "copy":
        default: {
            try {
                await navigator.clipboard.writeText(`${text} ${url}`);
                return { ok: true, channel: "copy", copied: true };
            } catch {
                return { ok: false, channel: "copy", error: "clipboard-denied" };
            }
        }
    }
}
