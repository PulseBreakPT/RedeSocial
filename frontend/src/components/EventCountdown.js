import { useEffect, useMemo, useState } from "react";

/**
 * EventCountdown — contagem decrescente live (D-X · H-Y · M-Z).
 * Re-render a cada 60s. Para eventos a decorrer mostra "agora a decorrer".
 * Para eventos passados mostra "terminou há X dias".
 *
 * Props:
 *   - iso_date: data de início ISO (YYYY-MM-DD)
 *   - iso_end:  data de fim ISO (opcional)
 *   - status:   "past" | "now" | "upcoming"
 *   - size:     "lg" | "md" | "sm"
 */
export function EventCountdown({ iso_date, iso_end, status, size = "lg" }) {
    const [now, setNow] = useState(() => new Date());

    useEffect(() => {
        const id = setInterval(() => setNow(new Date()), 60_000);
        return () => clearInterval(id);
    }, []);

    const { label, parts, accent } = useMemo(() => {
        if (!iso_date) return { label: "", parts: [], accent: "rgba(10,10,10,0.6)" };
        const start = new Date(iso_date + "T00:00:00");
        const end = new Date((iso_end || iso_date) + "T23:59:59");

        if (status === "past" || end.getTime() < now.getTime()) {
            const days = Math.floor((now.getTime() - end.getTime()) / (1000 * 60 * 60 * 24));
            return {
                label: days === 0 ? "terminou hoje" : days === 1 ? "terminou ontem" : `terminou há ${days} dias`,
                parts: [],
                accent: "rgba(10,10,10,0.45)",
            };
        }
        if (status === "now" || (start.getTime() <= now.getTime() && now.getTime() <= end.getTime())) {
            return { label: "agora a decorrer", parts: [], accent: "#c8102e" };
        }
        const diff = start.getTime() - now.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        if (days >= 2) {
            return {
                label: "começa em",
                parts: [{ v: days, u: days === 1 ? "dia" : "dias" }],
                accent: days <= 7 ? "#c8102e" : "#0d0d10",
            };
        }
        if (days >= 1) {
            return {
                label: "amanhã, em",
                parts: [
                    { v: days, u: "d" },
                    { v: hours, u: "h" },
                    { v: mins, u: "m" },
                ],
                accent: "#c8102e",
            };
        }
        if (hours >= 1) {
            return {
                label: "começa em",
                parts: [
                    { v: hours, u: "h" },
                    { v: mins, u: "m" },
                ],
                accent: "#c8102e",
            };
        }
        return {
            label: "começa em",
            parts: [{ v: Math.max(0, mins), u: "min" }],
            accent: "#c8102e",
        };
    }, [iso_date, iso_end, status, now]);

    if (size === "sm") {
        return (
            <span
                className="inline-flex items-center gap-1.5 font-mono uppercase tracking-[0.10em] text-[10.5px]"
                style={{ color: accent }}
                aria-live="polite"
            >
                {status === "now" && (
                    <span aria-hidden className="inline-block w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: accent }} />
                )}
                {label}
                {parts.map((p, i) => (
                    <span key={i} className="font-black tabular-nums" style={{ color: accent }}>{p.v}{p.u}</span>
                ))}
            </span>
        );
    }

    const isLg = size === "lg";
    return (
        <div className="flex items-baseline gap-2" aria-live="polite">
            <span
                className="font-mono uppercase tracking-[0.14em]"
                style={{ color: "rgba(255,255,255,0.7)", fontSize: isLg ? 12 : 11 }}
            >
                {label}
            </span>
            {parts.length > 0 && (
                <div className="flex items-baseline gap-2">
                    {parts.map((p, i) => (
                        <div key={i} className="flex items-baseline gap-0.5">
                            <span
                                className="font-black tabular-nums leading-none"
                                style={{
                                    color: "#fff",
                                    fontSize: isLg ? "clamp(34px, 7vw, 56px)" : 28,
                                    letterSpacing: "-0.03em",
                                }}
                            >
                                {p.v}
                            </span>
                            <span
                                className="font-mono uppercase"
                                style={{ color: "rgba(255,255,255,0.75)", fontSize: isLg ? 13 : 11 }}
                            >
                                {p.u}
                            </span>
                        </div>
                    ))}
                </div>
            )}
            {status === "now" && (
                <span
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono uppercase tracking-[0.12em] text-[11px]"
                    style={{ background: "#fff", color: "#c8102e" }}
                >
                    <span aria-hidden className="inline-block w-1.5 h-1.5 rounded-full bg-[#c8102e] animate-pulse" />
                    agora
                </span>
            )}
        </div>
    );
}
