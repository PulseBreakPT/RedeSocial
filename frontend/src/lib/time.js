// Smart relative timestamp - matches X/Instagram/Threads style
export function smartTime(iso) {
    if (!iso) return "";
    const date = new Date(iso);
    const now = new Date();
    const diff = (now.getTime() - date.getTime()) / 1000;
    if (diff < 5) return "agora";
    if (diff < 60) return `${Math.floor(diff)}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d`;
    if (now.getFullYear() === date.getFullYear()) {
        return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
    }
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "2-digit" });
}

export function fullTime(iso) {
    if (!iso) return "";
    return new Date(iso).toLocaleString("pt-BR", {
        day: "2-digit", month: "long", year: "numeric",
        hour: "2-digit", minute: "2-digit",
    });
}
