import {
    ScrollText, MessageSquare, Image as ImageIcon, Heart, Users, User,
} from "lucide-react";
import { PT } from "../../theme/editorial";

export const PROFILE_TABS = [
    { key: "posts",       label: "Posts",       icon: ScrollText },
    { key: "replies",     label: "Respostas",   icon: MessageSquare },
    { key: "media",       label: "Mídia",       icon: ImageIcon },
    { key: "likes",       label: "Gostos",      icon: Heart },
    { key: "communities", label: "Comunidades", icon: Users },
    { key: "about",       label: "Sobre",       icon: User },
];

export function ProfileTabBar({ tab, onChange }) {
    return (
        <div
            className="sticky top-0 lg:top-12 z-20"
            data-testid="profile-tab-bar"
            style={{
                background: PT.cream,
                borderTop: "1px solid rgba(10,10,10,0.10)",
                borderBottom: "1px solid rgba(10,10,10,0.10)",
            }}
        >
            <div className="flex overflow-x-auto no-scrollbar px-2 py-2 gap-1.5" role="tablist">
                {PROFILE_TABS.map((t) => {
                    const Icon = t.icon;
                    const active = tab === t.key;
                    return (
                        <button
                            key={t.key}
                            role="tab"
                            aria-selected={active}
                            onClick={() => onChange(t.key)}
                            data-testid={`profile-tab-${t.key}`}
                            className="shrink-0 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 font-black uppercase tap-shrink transition-transform"
                            style={{
                                background: active ? PT.ink : "#fff",
                                color: active ? "#fff" : PT.ink,
                                border: "1px solid rgba(10,10,10,0.10)",
                                boxShadow: active ? "0 1px 2px rgba(10,10,10,0.05), 0 8px 20px -10px rgba(10,10,10,0.15)" : "0 1px 2px rgba(10,10,10,0.05), 0 8px 20px -10px rgba(10,10,10,0.15)",
                                borderRadius: 999,
                                fontSize: 11.5,
                                letterSpacing: "0.06em",
                            }}
                        >
                            <Icon size={12} strokeWidth={2.4} />
                            <span>{t.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
