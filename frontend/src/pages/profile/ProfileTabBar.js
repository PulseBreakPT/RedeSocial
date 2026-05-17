import {
    ScrollText, MessageSquare, Image as ImageIcon, Heart, Users, User,
} from "lucide-react";

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
            className="sticky top-0 lg:top-12 z-20 hairline-t hairline-b bg-white/95 backdrop-blur-xl"
            data-testid="profile-tab-bar"
        >
            <div className="flex overflow-x-auto no-scrollbar" role="tablist">
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
                            className={`shrink-0 flex-1 min-w-[96px] py-3 px-2 font-heading text-[11.5px] lg:text-[12px] tracking-tight transition relative inline-flex items-center justify-center gap-1.5 ${
                                active
                                    ? "text-black font-medium"
                                    : "text-black/45 hover:text-black/70"
                            }`}
                        >
                            <Icon size={13} strokeWidth={active ? 2 : 1.7} />
                            <span>{t.label}</span>
                            {active && (
                                <span
                                    aria-hidden
                                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-[2px] rounded-full bg-black"
                                />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
