const FRAME_CSS = {
    frame_classic: "ring-2 ring-white/20",
    frame_coral: "ring-2 ring-orange-400",
    frame_azulejo: "ring-2 ring-blue-400",
    frame_ouro: "ring-2 ring-yellow-500",
    frame_pinhal: "ring-2 ring-emerald-500",
    frame_tejo: "ring-2 ring-cyan-400",
    frame_pixel: "ring-2 ring-pink-400",
};
const STICKER_EMOJI = {
    sticker_pastel: "🥐",
    sticker_bola: "⚽",
    sticker_galo: "🐓",
    sticker_sardinha: "🐟",
    sticker_coracao: "❤️",
    sticker_estrela: "⭐",
    sticker_cafe: "☕",
};

export function Avatar({ user, size = 40, className = "", showOnline = false, showCosmetics = true }) {
    const initials = (user?.name || user?.username || "?")
        .split(" ")
        .map((s) => s[0])
        .slice(0, 2)
        .join("")
        .toUpperCase();
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
    const cosmetics = showCosmetics ? user?.cosmetics_equipped : null;
    const frameClass = cosmetics?.frame ? (FRAME_CSS[cosmetics.frame] || "") : "";
    const stickerEmoji = cosmetics?.sticker ? STICKER_EMOJI[cosmetics.sticker] : "";

    return (
        <div className="relative inline-block" data-testid={`avatar-${user?.username || "anon"}`}>
            {user?.avatar ? (
                <img
                    src={user.avatar}
                    alt={user.username}
                    style={{ width: size, height: size }}
                    className={`rounded-full object-cover border border-black/10 ${frameClass} ${className}`}
                />
            ) : (
                <div
                    style={{
                        width: size,
                        height: size,
                        background: "linear-gradient(135deg, #f4f4f8 0%, #d4d4dc 50%, #b8b8c0 100%)",
                    }}
                    className={`rounded-full border border-black/10 grid place-items-center text-zinc-700 font-mono font-semibold shadow-inner ${frameClass} ${className}`}
                >
                    <span style={{ fontSize: size * 0.4, color: "#3a3a42" }}>{initials}</span>
                </div>
            )}
            {stickerEmoji && size >= 40 && (
                <span
                    className="absolute -top-1 -right-1 rounded-full bg-white border border-black/10 grid place-items-center shadow-sm"
                    style={{ width: Math.max(14, size * 0.32), height: Math.max(14, size * 0.32), fontSize: Math.max(9, size * 0.18) }}
                    title="Cosmetic"
                >
                    {stickerEmoji}
                </span>
            )}
            {dot}
        </div>
    );
}
