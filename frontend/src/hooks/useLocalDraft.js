import { useEffect, useState } from "react";

// Auto-save a value to localStorage with debounce
export function useLocalDraft(key, initial = "") {
    const [value, setValue] = useState(() => {
        try {
            const v = localStorage.getItem(key);
            return v ?? initial;
        } catch {
            return initial;
        }
    });

    useEffect(() => {
        try {
            if (value) localStorage.setItem(key, value);
            else localStorage.removeItem(key);
        } catch {}
    }, [key, value]);

    const clear = () => {
        try {
            localStorage.removeItem(key);
        } catch {}
        setValue("");
    };

    return [value, setValue, clear];
}
