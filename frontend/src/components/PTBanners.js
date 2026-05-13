import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, Bell, Sun, X, ChevronRight } from "lucide-react";
import { api } from "../lib/api";
import { isATardeWindow, isBoaNoiteHour } from "../lib/ptCulture";

/**
 * F5.3 Calendar banner — shows when there's a PT cultural event today/tomorrow.
 * Dismissible per-day via localStorage.
 */
export function CalendarPTBanner() {
    const [event, setEvent] = useState(null);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const { data } = await api.get("/calendar/pt");
                if (cancelled) return;
                const today = data?.today;
                if (!today) return;
                const key = `vm_cal_dismiss_${today.key}_${new Date().toISOString().slice(0, 10)}`;
                if (localStorage.getItem(key) === "1") {
                    setDismissed(true);
                    return;
                }
                setEvent(today);
            } catch { /* silent */ }
        })();
        return () => { cancelled = true; };
    }, []);

    if (!event || dismissed) return null;

    const dismiss = () => {
        const k = `vm_cal_dismiss_${event.key}_${new Date().toISOString().slice(0, 10)}`;
        localStorage.setItem(k, "1");
        setDismissed(true);
    };

    return (
        <div
            data-testid="calendar-pt-banner"
            className="rounded-2xl border border-black/[0.08] p-4 mb-4 bg-paper grain isolate relative overflow-hidden"
        >
            <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl grid place-items-center text-[22px] shrink-0 bg-white border border-black/[0.06]">
                    <span aria-hidden>{event.emoji}</span>
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[10.5px] uppercase tracking-[0.14em] text-black/45 font-mono">
                        <CalendarDays size={11} className="inline -mt-0.5 mr-1" />
                        {event.is_today ? "Hoje" : event.is_tomorrow ? "Amanhã" : "Hoje"}
                    </p>
                    <h3 className="mt-0.5 font-display text-[18px] font-semibold tracking-tight text-black">
                        {event.label}
                    </h3>
                    <p className="text-[13px] text-black/60 mt-0.5 leading-relaxed">
                        Como vais passar? Partilha com a comunidade.
                    </p>
                </div>
                <button
                    onClick={dismiss}
                    data-testid="calendar-pt-dismiss"
                    className="text-black/35 hover:text-black tap-shrink"
                    aria-label="Dispensar"
                >
                    <X size={16} />
                </button>
            </div>
        </div>
    );
}

/**
 * F1.1 A Tarde — daily curated 3-post digest banner.
 * Visible only between 18-22h (or first visit of the day after that window if missed).
 */
export function ATardeBanner() {
    const [digest, setDigest] = useState(null);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        if (!isATardeWindow() && !shouldShowMissed()) return;
        const today = new Date().toISOString().slice(0, 10);
        if (localStorage.getItem(`vm_tarde_dismiss_${today}`) === "1") {
            setDismissed(true);
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const { data } = await api.get("/daily/digest");
                if (!cancelled && data?.digest?.length) setDigest(data);
            } catch { /* silent */ }
        })();
        return () => { cancelled = true; };
    }, []);

    const dismiss = () => {
        const today = new Date().toISOString().slice(0, 10);
        localStorage.setItem(`vm_tarde_dismiss_${today}`, "1");
        setDismissed(true);
    };

    if (!digest || dismissed || isBoaNoiteHour()) return null;

    return (
        <div
            data-testid="a-tarde-banner"
            className="rounded-2xl border border-black/[0.08] p-4 mb-4 bg-white relative overflow-hidden"
        >
            <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                    <p className="text-[10.5px] uppercase tracking-[0.14em] text-black/45 font-mono">
                        <Sun size={11} className="inline -mt-0.5 mr-1" />A Tarde · 3 momentos hoje
                    </p>
                    <p className="text-[12.5px] text-black/55 mt-1 leading-relaxed">
                        Um digest diário, curto. Sem scroll infinito.
                    </p>
                </div>
                <button
                    onClick={dismiss}
                    data-testid="a-tarde-dismiss"
                    className="text-black/35 hover:text-black tap-shrink"
                    aria-label="Dispensar"
                >
                    <X size={16} />
                </button>
            </div>
            <div className="space-y-2">
                {digest.digest.slice(0, 3).map((p, i) => (
                    <Link
                        key={p.id}
                        to={`/p/${p.id}`}
                        data-testid={`a-tarde-item-${i}`}
                        className="flex items-start gap-2.5 p-2 -mx-2 rounded-xl hover:bg-black/[0.025] transition group"
                    >
                        <span className="font-mono text-[10.5px] text-black/35 mt-1 w-6 shrink-0">
                            {String(i + 1).padStart(2, "0")}
                        </span>
                        <div className="flex-1 min-w-0">
                            <p className="text-[12.5px] text-black/45 mb-0.5">
                                @{p.author?.username || "anon"} ·{" "}
                                {p.author?.city || p.author?.region || "Vermillion"}
                            </p>
                            <p className="text-[13.5px] text-black leading-snug line-clamp-2">
                                {p.content || "(imagem)"}
                            </p>
                        </div>
                        <ChevronRight
                            size={14}
                            className="opacity-0 group-hover:opacity-50 mt-1 transition shrink-0"
                        />
                    </Link>
                ))}
            </div>
        </div>
    );
}

function shouldShowMissed() {
    // Show after 22h if the user hasn't dismissed it today.
    const h = new Date().getHours();
    return h >= 22 || h < 6;
}

/**
 * F5.2 Sino do Bairro — single local event in next 7 days. Rate-limited weekly via localStorage.
 */
export function SinoBairroBanner() {
    const [ev, setEv] = useState(null);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        // Soft-throttle: show at most once per ISO week per user
        const week = isoWeek(new Date());
        const dismissKey = `vm_bairro_dismiss_${week}`;
        if (localStorage.getItem(dismissKey) === "1") {
            setDismissed(true);
            return;
        }
        let cancelled = false;
        (async () => {
            try {
                const { data } = await api.get("/bairro/events");
                if (!cancelled && data?.event) setEv(data.event);
            } catch { /* anonymous user — silent */ }
        })();
        return () => { cancelled = true; };
    }, []);

    if (!ev || dismissed) return null;

    const dismiss = () => {
        const week = isoWeek(new Date());
        localStorage.setItem(`vm_bairro_dismiss_${week}`, "1");
        setDismissed(true);
    };

    return (
        <div
            data-testid="sino-bairro-banner"
            className="rounded-2xl border border-black/[0.10] p-4 mb-4 bg-white relative overflow-hidden"
        >
            <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl grid place-items-center shrink-0 bg-black text-white">
                    <Bell size={16} />
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-[10.5px] uppercase tracking-[0.14em] text-black/45 font-mono">
                        Sino do bairro · 1×/semana
                    </p>
                    <h3 className="mt-0.5 font-semibold text-[15px] tracking-tight text-black leading-snug">
                        {ev.title}
                    </h3>
                    <p className="text-[13px] text-black/60 mt-0.5 leading-relaxed">
                        {ev.location || "Localização por confirmar"} ·{" "}
                        <Link
                            to="/events"
                            className="underline underline-offset-2 hover:text-black"
                        >
                            ver evento
                        </Link>
                    </p>
                </div>
                <button
                    onClick={dismiss}
                    data-testid="sino-bairro-dismiss"
                    className="text-black/35 hover:text-black tap-shrink"
                    aria-label="Dispensar até à próxima semana"
                >
                    <X size={16} />
                </button>
            </div>
        </div>
    );
}

function isoWeek(d) {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
    return `${date.getUTCFullYear()}-${String(weekNo).padStart(2, "0")}`;
}
