import { paletteFor, initialsFor } from "../lib/avatarPalette";

export function Avatar({ user, size = 40, className = "", showOnline = false }) {
    const palette = paletteFor(user);
    const initials = initialsFor(user);
    const dotSize = Math.max(8, Math.round(size * 0.22));
    const presence = user?.presence;
    const isOnlineDot = showOnline && (user?.online || presence?.status === "online");
    const dot = isOnlineDot && (
        <span
            style={{ width: dotSize, height: dotSize, background: "var(--green-soft)" }}
            className="absolute bottom-0 right-0 rounded-full border-2 border-white"
            title="Online"
        />
    );

    return (
        <div className="relative inline-block" data-testid={`avatar-${user?.username || "anon"}`}>
            {user?.avatar ? (
                <img
                    src={user.avatar}
                    alt={user.username}
                    style={{ width: size, height: size }}
                    className={`rounded-full object-cover border border-black/10 ${className}`}
                />
            ) : (
                <div
                    style={{
                        width: size,
                        height: size,
                        background: `linear-gradient(135deg, ${palette.from} 0%, ${palette.to} 100%)`,
                    }}
                    className={`rounded-full border border-black/10 grid place-items-center text-white font-heading font-semibold tracking-tight shadow-inner select-none ${className}`}
                    data-palette={palette.name}
                >
                    <span style={{ fontSize: size * 0.42, lineHeight: 1, textShadow: "0 1px 2px rgba(0,0,0,0.15)" }}>{initials}</span>
                </div>
            )}
            {dot}
        </div>
    );
}

// Inline pill that places the name on a soft-tinted background matching the user's palette.
// Useful in cards, lists, stickers, notification rows.
export function NamePill({ user, className = "", showAt = true, children }) {
    const palette = paletteFor(user);
    return (
        <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-heading font-semibold text-[12px] ${className}`}
            style={{ background: palette.soft, color: palette.softText }}
            data-testid={`name-pill-${user?.username || "anon"}`}
        >
            {children ?? (
                <>
                    {showAt && <span className="opacity-60 font-mono">@</span>}
                    <span>{user?.username || user?.name || "anon"}</span>
                </>
            )}
        </span>
    );
}
