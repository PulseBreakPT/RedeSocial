// =============================================================================
// LUSORAE — Navigation single source of truth
//
// Garante PARIDADE DE ROTAS entre desktop e mobile.
//
// Princípios:
//   · "Paridade" não significa duplicar todos os ícones em ambos os menus.
//     Significa: toda a rota disponível em desktop está acessível em mobile
//     com fricção semelhante (1-2 toques).
//
//   · 5 lentes profissionais aplicadas:
//       PM:  bottom-nav respeita os 5 slots da indústria (Twitter/IG/Threads).
//       UX:  itens primários (uso diário) vão no nav directo;
//            secundários (uso semanal/raro) no drawer aberto pelo avatar.
//       FE:  este ficheiro é importado por LeftSidebar, MobileBottomNav e
//            ProfileSidebarMenu — zero duplicação de listas.
//       A11y: cada item tem `testid` estável para testes E2E.
//       Mobile: avatar → drawer é o entry-point único para rotas secundárias.
//
// Convenção:
//   · PRIMARY_NAV  → visíveis directamente em desktop sidebar e mobile bottom-nav
//   · DESKTOP_EXTRA → visíveis na desktop sidebar mas não no mobile bottom-nav;
//                    sempre acessíveis em mobile via avatar→drawer (Conta).
//   · DRAWER_DISCOVER → secção "Descobrir" do drawer (comum a ambos os ecrãs)
//   · DRAWER_PERSONAL → secção "Painel pessoal" do drawer
//   · DRAWER_ACCOUNT  → secção "Conta" do drawer (Definições, Admin, Centro legal)
// =============================================================================
import {
    Home, Compass, Bell, MessageCircle, Users as UsersIcon, Settings,
    Calendar, Shield, User, Bookmark, FileText, Clock, Archive,
} from "lucide-react";

export const PRIMARY_NAV = [
    { to: "/feed",          label: "Início",       icon: Home,          testid: "nav-home",          end: true },
    { to: "/explore",       label: "Explorar",     icon: Compass,       testid: "nav-explore" },
    { to: "/notifications", label: "Notificações", icon: Bell,          testid: "nav-notifications", badgeKey: "notif" },
    { to: "/messages",      label: "Mensagens",    icon: MessageCircle, testid: "nav-messages",      badgeKey: "msg" },
];

// Visíveis na desktop sidebar lateral (espaço vertical sobra) mas não no
// mobile bottom-nav (limite de 5 slots). Em mobile chegam-se via avatar→drawer.
export const DESKTOP_EXTRA = [
    { to: "/calendario",  label: "Calendário",  icon: Calendar,    testid: "nav-calendario" },
    { to: "__profile__",  label: "Perfil",      icon: UsersIcon,   testid: "nav-profile" },
    { to: "/settings",    label: "Definições",  icon: Settings,    testid: "nav-settings" },
];

// Apenas para utilizadores `is_admin`
export const ADMIN_NAV = {
    to: "/admin", label: "Admin", icon: Shield, testid: "nav-admin",
};

// ── Drawer (comum a desktop sidebar e mobile top-bar avatar) ────────────────
// Estas secções estão em ProfileSidebarMenu.js e são partilhadas por ambos os
// dispositivos via o mesmo componente — paridade automática.
export const DRAWER_PERSONAL = (profileTo) => [
    { to: profileTo,     label: "O meu perfil", icon: User,     testid: "drawer-profile" },
    { to: "/bookmarks",  label: "Guardados",    icon: Bookmark, testid: "drawer-bookmarks" },
    { to: "/drafts",     label: "Rascunhos",    icon: FileText, testid: "drawer-drafts" },
    { to: "/scheduled",  label: "Agendados",    icon: Clock,    testid: "drawer-scheduled" },
];

export const DRAWER_DISCOVER = [
    { to: "/calendario",   label: "Calendário",  icon: Calendar,  testid: "drawer-calendario" },
    { to: "/communities",  label: "Comunidades", icon: UsersIcon, testid: "drawer-communities" },
];

export const DRAWER_STORIES = [
    { to: "/stories/archive", label: "Arquivo de stories", icon: Archive, testid: "drawer-stories-archive" },
];

export const DRAWER_ACCOUNT_BASE = [
    { to: "/settings", label: "Definições",   icon: Settings, testid: "drawer-settings" },
    { to: "/legal",    label: "Centro legal", icon: Shield,   testid: "drawer-legal" },
];

// Admin entra na secção Conta apenas para utilizadores com `is_admin`.
export const drawerAccountFor = (user) => {
    const items = [...DRAWER_ACCOUNT_BASE];
    if (user?.is_admin) {
        items.splice(1, 0, { to: "/admin", label: "Admin", icon: Shield, testid: "drawer-admin" });
    }
    return items;
};
