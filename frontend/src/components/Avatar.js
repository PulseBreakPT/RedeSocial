export function Avatar({ user, size = 40, className = "", showOnline = false }) {
    const initials = (user?.name || user?.username || "?")
        .split(" ")
        .map((s) => s[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();
    const dotSize = Math.max(8, Math.round(size * 0.22));
    const dot = showOnline && user?.online && (
        <span
            style={{ width: dotSize, height: dotSize }}
            className="absolute bottom-0 right-0 rounded-full bg-emerald-500 border-2 border-[#0A0A0A]"
            title="Online"
        />
    );
    return (
        <div className="relative inline-block">
            {user?.avatar ? (
                <img
                    src={user.avatar}
                    alt={user.username}
                    style={{ width: size, height: size }}
                    className={`rounded-full object-cover border border-zinc-800 ${className}`}
                />
            ) : (
                <div
                    style={{ width: size, height: size }}
                    className={`rounded-full border border-zinc-800 bg-gradient-to-br from-zinc-800 to-zinc-900 grid place-items-center text-zinc-200 font-mono font-medium ${className}`}
                >
                    <span style={{ fontSize: size * 0.4 }}>{initials}</span>
                </div>
            )}
            {dot}
        </div>
    );
}
