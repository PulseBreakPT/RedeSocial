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
