// "Entrou em 2026", "No Lusorae há 2 meses", etc.
export function joinedHumanPT(createdAtIso) {
    if (!createdAtIso) return "";
    const created = new Date(createdAtIso);
    if (isNaN(+created)) return "";
    const now = new Date();
    const diffMs = now - created;
    const day = 86400000;
    const days = Math.max(0, Math.floor(diffMs / day));
    if (days < 1) return "Entrou hoje";
    if (days < 7) return `No Lusorae há ${days} ${days === 1 ? "dia" : "dias"}`;
    if (days < 30) {
        const w = Math.floor(days / 7);
        return `No Lusorae há ${w} ${w === 1 ? "semana" : "semanas"}`;
    }
    if (days < 365) {
        const m = Math.max(1, Math.floor(days / 30));
        return `No Lusorae há ${m} ${m === 1 ? "mês" : "meses"}`;
    }
    // > 1 year — "Entrou em <ano>"
    return `Entrou em ${created.getFullYear()}`;
}
