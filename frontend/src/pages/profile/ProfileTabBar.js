import {
    ScrollText, MessageSquare, Image as ImageIcon, Heart, Users, User,
} from "lucide-react";
import { PT } from "../auth/AuthDecor";

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
                borderTop: `2.5px solid ${PT.ink}`,
                borderBottom: `2.5px solid ${PT.ink}`,
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
                                color: active ? PT.gold : PT.ink,
                                border: `2px solid ${PT.ink}`,
                                boxShadow: active ? `2.5px 2.5px 0 ${PT.red}` : `2px 2px 0 ${PT.ink}`,
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
