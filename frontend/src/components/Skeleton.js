export function PostSkeleton() {
    return (
        <div className="p-5 hairline-b animate-pulse" data-testid="post-skeleton">
            <div className="flex gap-3">
                <div className="w-11 h-11 rounded-full bg-black/[0.05]" />
                <div className="flex-1 space-y-2.5">
                    <div className="flex gap-2 items-center">
                        <div className="h-3 w-24 bg-black/[0.05] rounded" />
                        <div className="h-3 w-16 bg-black/[0.05] rounded" />
                    </div>
                    <div className="h-3 w-full bg-black/[0.05] rounded" />
                    <div className="h-3 w-3/4 bg-black/[0.05] rounded" />
                    <div className="flex gap-6 mt-3">
                        <div className="h-3 w-8 bg-black/[0.05] rounded" />
                        <div className="h-3 w-8 bg-black/[0.05] rounded" />
                        <div className="h-3 w-8 bg-black/[0.05] rounded" />
                    </div>
                </div>
            </div>
        </div>
    );
}

export function PostSkeletonList({ count = 4 }) {
    return (
        <div>
            {Array.from({ length: count }).map((_, i) => (
                <PostSkeleton key={i} />
            ))}
        </div>
    );
}

export function ProfileSkeleton() {
    return (
        <div className="animate-pulse" data-testid="profile-skeleton">
            <div className="h-48 silver-grad opacity-50" />
            <div className="px-5 -mt-12 relative">
                <div className="w-24 h-24 rounded-full bg-black/[0.06] border-[3px] border-white" />
                <div className="mt-4 h-6 w-40 bg-black/[0.05] rounded" />
                <div className="mt-2 h-3 w-24 bg-black/[0.05] rounded" />
                <div className="mt-4 h-3 w-full bg-black/[0.05] rounded" />
                <div className="mt-2 h-3 w-2/3 bg-black/[0.05] rounded" />
            </div>
        </div>
    );
}

export function ConvSkeleton() {
    return (
        <div className="animate-pulse">
            {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-4 hairline-b">
                    <div className="w-11 h-11 rounded-full bg-black/[0.05]" />
                    <div className="flex-1 space-y-2">
                        <div className="h-3 w-32 bg-black/[0.05] rounded" />
                        <div className="h-3 w-48 bg-black/[0.05] rounded" />
                    </div>
                </div>
            ))}
        </div>
    );
}

/* ---------- New skeletons ---------- */

export function NotifSkeleton() {
    return (
        <div className="flex items-start gap-3 px-4 lg:px-5 py-3 hairline-b animate-pulse" data-testid="notif-skeleton">
            <div className="w-8 h-8 rounded-full bg-black/[0.05] flex-shrink-0" />
            <div className="flex-1 space-y-2">
                <div className="h-3 w-2/3 bg-black/[0.05] rounded" />
                <div className="h-3 w-1/3 bg-black/[0.04] rounded" />
            </div>
            <div className="w-2 h-2 rounded-full bg-black/[0.05] mt-3" />
        </div>
    );
}

export function NotifSkeletonList({ count = 6 }) {
    return (
        <div>
            {Array.from({ length: count }).map((_, i) => (
                <NotifSkeleton key={i} />
            ))}
        </div>
    );
}

/**
 * Generic row skeleton — for Trending tags, Communities list, etc.
 * Each row: small badge/icon + title + meta line.
 */
export function RowSkeleton() {
    return (
        <div className="flex items-center gap-3 px-4 lg:px-5 py-3.5 hairline-b animate-pulse" data-testid="row-skeleton">
            <div className="w-10 h-10 rounded-xl bg-black/[0.05] flex-shrink-0" />
            <div className="flex-1 space-y-2">
                <div className="h-3.5 w-40 bg-black/[0.05] rounded" />
                <div className="h-2.5 w-24 bg-black/[0.04] rounded" />
            </div>
            <div className="h-7 w-16 bg-black/[0.05] rounded-full" />
        </div>
    );
}

export function RowSkeletonList({ count = 6 }) {
    return (
        <div>
            {Array.from({ length: count }).map((_, i) => (
                <RowSkeleton key={i} />
            ))}
        </div>
    );
}
