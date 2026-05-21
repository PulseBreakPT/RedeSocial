/**
 * navConfig — single source of truth for the admin sidebar / command palette.
 * Shared between AdminLayout.js, AdminSidebar.js and the command palette.
 */
import {
    Activity, ShieldCheck, AlertTriangle, ShieldAlert,
    Users as UsersIcon, LogOut, FileText, MessageSquare, Sparkles, Hash,
    Layers, CalendarDays, Megaphone, Settings2, Server, History,
} from "lucide-react";

export const NAV_GROUPS = [
    {
        label: "Cockpit",
        items: [
            { key: "overview", label: "Cockpit", icon: Activity, hint: "Visão operacional em tempo real" },
        ],
    },
    {
        label: "Confiança & Segurança",
        items: [
            { key: "security", label: "Segurança", icon: ShieldCheck, hint: "Sessões, eventos auth, IPs suspeitos" },
            { key: "reports",  label: "Reports",   icon: AlertTriangle, badge: "reports", hint: "Fila de moderação" },
            { key: "antispam", label: "Anti-spam", icon: ShieldAlert, hint: "Detecção & quarentena" },
        ],
    },
    {
        label: "Pessoas",
        items: [
            { key: "users",    label: "Utilizadores", icon: UsersIcon, hint: "Diretório, sanções, bans" },
            { key: "sessions", label: "Sessões",      icon: LogOut,    hint: "Sessões ativas no sistema" },
        ],
    },
    {
        label: "Conteúdo",
        items: [
            { key: "posts",    label: "Publicações", icon: FileText, hint: "Diretório global de posts" },
            { key: "comments", label: "Comentários", icon: MessageSquare, hint: "Threads & moderação fina" },
            { key: "stories",  label: "Stories",     icon: Sparkles, hint: "Stories 24h" },
            { key: "hashtags", label: "Hashtags",    icon: Hash,     hint: "Trending, blacklist, controlo" },
        ],
    },
    {
        label: "Plataforma",
        items: [
            { key: "communities", label: "Comunidades", icon: Layers,       hint: "Comunidades & moderadores" },
            { key: "events",      label: "Eventos",     icon: CalendarDays, hint: "Eventos públicos" },
            { key: "broadcast",   label: "Broadcast",   icon: Megaphone,    hint: "Anúncios oficiais" },
        ],
    },
    {
        label: "Sistema",
        items: [
            { key: "system",   label: "Sistema",   icon: Server,    hint: "Infra, WS, MongoDB" },
            { key: "audit",    label: "Audit log", icon: History,   hint: "Histórico de ações admin" },
            { key: "settings", label: "Definições", icon: Settings2, hint: "Configurações da plataforma" },
        ],
    },
];

export const NAV_ITEMS = NAV_GROUPS.flatMap((g) => g.items);
export const NAV_BY_KEY = NAV_ITEMS.reduce((acc, it) => { acc[it.key] = it; return acc; }, {});
