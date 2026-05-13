export function PostSkeleton() {
    return (
        <div className="p-5 border-b border-zinc-900 animate-pulse" data-testid="post-skeleton">
            <div className="flex gap-3">
                <div className="w-11 h-11 rounded-full bg-zinc-900" />
                <div className="flex-1 space-y-2">
                    <div className="flex gap-2 items-center">
                        <div className="h-3 w-24 bg-zinc-900 rounded" />
                        <div className="h-3 w-16 bg-zinc-900 rounded" />
                    </div>
                    <div className="h-3 w-full bg-zinc-900 rounded" />
                    <div className="h-3 w-3/4 bg-zinc-900 rounded" />
                    <div className="flex gap-6 mt-3">
                        <div className="h-3 w-8 bg-zinc-900 rounded" />
                        <div className="h-3 w-8 bg-zinc-900 rounded" />
                        <div className="h-3 w-8 bg-zinc-900 rounded" />
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
            <div className="h-48 bg-zinc-900" />
            <div className="px-5 -mt-12 relative">
                <div className="w-24 h-24 rounded-full bg-zinc-800 border-4 border-[#0A0A0A]" />
                <div className="mt-4 h-6 w-40 bg-zinc-900 rounded" />
                <div className="mt-2 h-3 w-24 bg-zinc-900 rounded" />
                <div className="mt-4 h-3 w-full bg-zinc-900 rounded" />
            </div>
        </div>
    );
}

export function ConvSkeleton() {
    return (
        <div className="divide-y divide-zinc-900 animate-pulse">
            {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-4">
                    <div className="w-11 h-11 rounded-full bg-zinc-900" />
                    <div className="flex-1 space-y-2">
                        <div className="h-3 w-32 bg-zinc-900 rounded" />
                        <div className="h-3 w-48 bg-zinc-900 rounded" />
                    </div>
                </div>
            ))}
        </div>
    );
}
