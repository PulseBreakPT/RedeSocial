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
            style={{ width: dotSize, height: dotSize, background: "var(--green-soft)" }}
            className="absolute bottom-0 right-0 rounded-full border-2 border-white"
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
                    className={`rounded-full object-cover border border-black/10 ${className}`}
                />
            ) : (
                <div
                    style={{
                        width: size,
                        height: size,
                        background: "linear-gradient(135deg, #f4f4f8 0%, #d4d4dc 50%, #b8b8c0 100%)",
                    }}
                    className={`rounded-full border border-black/10 grid place-items-center text-zinc-700 font-mono font-semibold shadow-inner ${className}`}
                >
                    <span style={{ fontSize: size * 0.4, color: "#3a3a42" }}>{initials}</span>
                </div>
            )}
            {dot}
        </div>
    );
}
