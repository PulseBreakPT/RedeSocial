/**
 * navConfig — single source of truth for the admin sidebar / command palette.
 * Shared between AdminLayout.js, AdminSidebar.js, AdminTopbar.js and the
 * command palette.
 *
 * Each group has a semantic `tone` driving the visual hierarchy across the
 * whole admin module (sidebar accents, group label colors, topbar tinting,
 * focus rings). Tones map to existing CSS tokens `--ops-{tone}-*`:
 *   info     — operational, calmer "you are here" (Cockpit, Conteúdo)
 *   danger   — critical zones (Confiança & Segurança)
 *   warn     — attention / pending review (Pessoas)
 *   success  — healthy positive ops (Plataforma)
 *   system   — internal infra / audit (Sistema)
 *   slate    — neutral fallback
 *
 * Ordering of groups is meaningful — top = most operationally important.
 */
import {
    Activity, ShieldCheck, AlertTriangle, ShieldAlert,
    Users as UsersIcon, LogOut, FileText, MessageSquare, Sparkles, Hash,
    Layers, CalendarDays, Megaphone, Settings2, Server, History,
} from "lucide-react";

export const NAV_GROUPS = [
    {
        label: "Cockpit",
        tone: "info",
        items: [
            { key: "overview", label: "Cockpit", icon: Activity, tone: "info", hint: "Visão operacional em tempo real" },
        ],
    },
    {
        label: "Confiança & Segurança",
        tone: "danger",
        items: [
            { key: "reports",  label: "Reports",   icon: AlertTriangle, tone: "danger", badge: "reports", hint: "Fila de moderação" },
            { key: "security", label: "Segurança", icon: ShieldCheck,   tone: "danger", hint: "Sessões, eventos auth, IPs suspeitos" },
            { key: "antispam", label: "Anti-spam", icon: ShieldAlert,   tone: "warn",   hint: "Detecção & quarentena" },
        ],
    },
    {
        label: "Pessoas",
        tone: "warn",
        items: [
            { key: "users",    label: "Utilizadores", icon: UsersIcon, tone: "warn", hint: "Diretório, sanções, bans" },
            { key: "sessions", label: "Sessões",      icon: LogOut,    tone: "warn", hint: "Sessões ativas no sistema" },
        ],
    },
    {
        label: "Conteúdo",
        tone: "info",
        items: [
            { key: "posts",    label: "Publicações", icon: FileText,      tone: "info", hint: "Diretório global de posts" },
            { key: "comments", label: "Comentários", icon: MessageSquare, tone: "info", hint: "Threads & moderação fina" },
            { key: "stories",  label: "Stories",     icon: Sparkles,      tone: "info", hint: "Stories 24h" },
            { key: "hashtags", label: "Hashtags",    icon: Hash,          tone: "info", hint: "Trending, blacklist, controlo" },
        ],
    },
    {
        label: "Plataforma",
        tone: "success",
        items: [
            { key: "communities", label: "Comunidades", icon: Layers,       tone: "success", hint: "Comunidades & moderadores" },
            { key: "events",      label: "Eventos",     icon: CalendarDays, tone: "success", hint: "Eventos públicos" },
            { key: "broadcast",   label: "Broadcast",   icon: Megaphone,    tone: "success", hint: "Anúncios oficiais" },
        ],
    },
    {
        label: "Sistema",
        tone: "system",
        items: [
            { key: "system",   label: "Sistema",   icon: Server,    tone: "system", hint: "Infra, WS, MongoDB" },
            { key: "audit",    label: "Audit log", icon: History,   tone: "system", hint: "Histórico de ações admin" },
            { key: "settings", label: "Definições", icon: Settings2, tone: "system", hint: "Configurações da plataforma" },
        ],
    },
];

export const NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items);
export const NAV_BY_KEY = NAV_ITEMS.reduce((acc, it) => { acc[it.key] = it; return acc; }, {});

/**
 * Tabs whose data has a meaningful time dimension. Only on these tabs does
 * the global time-range selector in the topbar actually change anything
 * visible — on the others we hide it to avoid the M-9 "no-op control"
 * confusion documented in the audit.
 */
export const TIME_RANGE_TABS = new Set([
    "overview",
    "system",
    "security",
    "reports",
    "antispam",
]);

/** Helpers — derive tone for a given tab key (falls back to slate). */
export function toneForKey(key) {
    const item = NAV_BY_KEY[key];
    return (item && item.tone) || "slate";
}
