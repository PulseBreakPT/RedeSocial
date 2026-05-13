import { useEffect, useState } from "react";

// Re-renders every `intervalMs` so smartTime() outputs stay fresh
export function useLiveTime(intervalMs = 30000) {
    const [, setTick] = useState(0);
    useEffect(() => {
        const id = setInterval(() => setTick((t) => t + 1), intervalMs);
        return () => clearInterval(id);
    }, [intervalMs]);
}
