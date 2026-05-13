export function Avatar({ user, size = 40, className = "" }) {
    const initials = (user?.name || user?.username || "?")
        .split(" ")
        .map((s) => s[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();
    if (user?.avatar) {
        return (
            <img
                src={user.avatar}
                alt={user.username}
                style={{ width: size, height: size }}
                className={`rounded-full object-cover border border-zinc-800 ${className}`}
            />
        );
    }
    return (
        <div
            style={{ width: size, height: size }}
            className={`rounded-full border border-zinc-800 bg-gradient-to-br from-zinc-800 to-zinc-900 grid place-items-center text-zinc-200 font-mono font-medium ${className}`}
        >
            <span style={{ fontSize: size * 0.4 }}>{initials}</span>
        </div>
    );
}
