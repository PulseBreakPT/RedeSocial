import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { Avatar } from "./Avatar";
import { VerifiedBadge } from "./VerifiedBadge";
import { Spinner } from "./Spinner";

/**
 * HoverProfileCard — desktop-only floating mini-profile that appears
 * after a short delay when the user hovers an author link. On mobile
 * (no hover capability) the wrapper is a passthrough Link.
 *
 * The fetched user data is cached in module-scope to avoid network
 * thrash when the same author surfaces multiple times in a feed.
 */
const _cache = new Map();
const HOVER_DELAY_MS = 380;
const LEAVE_DELAY_MS = 220;

async function fetchUser(username) {
    if (!username) return null;
    if (_cache.has(username)) return _cache.get(username);
    try {
        const { data } = await api.get(`/users/${username}`);
        _cache.set(username, data);
        return data;
    } catch {
        return null;
    }
}

export function HoverProfileCard({ username, children, className = "", to, onClick }) {
    const [open, setOpen] = useState(false);
    const [data, setData] = useState(null);
    const enterTimer = useRef(null);
    const leaveTimer = useRef(null);
    const containerRef = useRef(null);

    // Only enable hover preview on devices with hover capability
    const supportsHover =
        typeof window !== "undefined" &&
        window.matchMedia &&
        window.matchMedia("(hover: hover)").matches;

    useEffect(() => () => {
        clearTimeout(enterTimer.current);
        clearTimeout(leaveTimer.current);
    }, []);

    const onEnter = () => {
        if (!supportsHover || !username) return;
        clearTimeout(leaveTimer.current);
        enterTimer.current = setTimeout(async () => {
            const u = await fetchUser(username);
            setData(u);
            setOpen(true);
        }, HOVER_DELAY_MS);
    };
    const onLeave = () => {
        clearTimeout(enterTimer.current);
        leaveTimer.current = setTimeout(() => setOpen(false), LEAVE_DELAY_MS);
    };

    return (
        <span
            ref={containerRef}
            className={`relative inline-flex ${className}`}
            onMouseEnter={onEnter}
            onMouseLeave={onLeave}
            onFocus={onEnter}
            onBlur={onLeave}
        >
            {to ? (
                <Link to={to} onClick={onClick} className="contents">
                    {children}
                </Link>
            ) : children}
            {open && (
                <span
                    role="tooltip"
                    data-testid={`hover-card-${username}`}
                    className="absolute left-0 top-full mt-2 z-50 w-[260px] bg-white border border-black/[0.06] rounded-2xl shadow-[0_24px_60px_-16px_rgba(13,13,16,0.22),0_4px_12px_-4px_rgba(13,13,16,0.08)] anim-fade-up overflow-hidden text-left"
                    style={{ pointerEvents: "auto" }}
                    onMouseEnter={() => clearTimeout(leaveTimer.current)}
                    onMouseLeave={onLeave}
                >
                    <HoverCardInner data={data} username={username} />
                </span>
            )}
        </span>
    );
}

function HoverCardInner({ data, username }) {
    if (!data) {
        return (
            <span className="grid place-items-center py-8 text-black/45">
                <Spinner size={16} />
            </span>
        );
    }
    return (
        <span className="block">
            {/* Banner */}
            <span
                aria-hidden
                className="block w-full h-14"
                style={{
                    background:
                        data.banner
                            ? `center/cover no-repeat url(${data.banner})`
                            : "linear-gradient(135deg, #FFCC29 0%, #C8102E 60%, #003F87 100%)",
                }}
            />
            {/* Header */}
            <span className="flex items-end gap-3 px-3 -mt-6">
                <span
                    className="inline-block rounded-full p-[3px] bg-white"
                    style={{ boxShadow: "0 4px 12px -4px rgba(13,13,16,0.18)" }}
                >
                    <Avatar user={data} size={48} />
                </span>
            </span>
            <span className="block px-3 pt-1.5 pb-3">
                <span className="flex items-center gap-1.5 min-w-0">
                    <Link
                        to={`/u/${username}`}
                        className="font-heading font-semibold text-[14px] tracking-tight text-black hover:underline underline-offset-4 decoration-black/20 truncate"
                    >
                        {data.name || username}
                    </Link>
                    {data.verified && <VerifiedBadge size={12} />}
                </span>
                <span className="block font-mono text-[11px] text-black/45">@{username}</span>
                {data.bio && (
                    <span className="block mt-2 text-[12.5px] text-black/75 leading-snug line-clamp-3">
                        {data.bio}
                    </span>
                )}
                <span className="mt-2.5 flex items-center gap-3 font-mono text-[11px] text-black/55">
                    <span>
                        <strong className="text-black tabular-nums">{data.following_count ?? 0}</strong> a seguir
                    </span>
                    <span aria-hidden className="text-black/20">·</span>
                    <span>
                        <strong className="text-black tabular-nums">{data.followers_count ?? 0}</strong> seguidores
                    </span>
                </span>
            </span>
        </span>
    );
}
