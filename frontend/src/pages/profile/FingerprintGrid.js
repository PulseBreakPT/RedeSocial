import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Sparkle, Hash, Users, Sun, Moon, Clock } from "lucide-react";
import { PT_MOODS } from "../../lib/ptCulture";

const HOUR_LABEL = (h) => {
    if (h == null) return null;
    if (h < 6)  return "madrugador";
    if (h < 12) return "manhã";
    if (h < 14) return "almoço";
    if (h < 19) return "tarde";
    if (h < 23) return "noite";
    return "noite alta";
};
const HOUR_ICON = (h) => {
    if (h == null) return Clock;
    if (h < 8 || h >= 22) return Moon;
    return Sun;
};
const capitalize = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

export function FingerprintGrid({ fp, firstName }) {
    const cards = useMemo(() => {
        const out = [];
        if (fp.top_mood) {
            const m = PT_MOODS.find((x) => x.key === fp.top_mood);
            if (m) out.push({
                key: "mood", eyebrow: "Escreve com",
                headline: m.label, detail: "mood predominante",
                emoji: m.emoji,
            });
        }
        if (fp.top_react_given) {
            out.push({
                key: "react_given", eyebrow: "Reage com",
                headline: capitalize(fp.top_react_given.key),
                detail: `${fp.top_react_given.count} ${fp.top_react_given.count === 1 ? "reação dada" : "reações dadas"}`,
                emoji: fp.top_react_given.emoji,
            });
        }
        if (fp.top_react_received) {
            out.push({
                key: "react_recv", eyebrow: "Recebe mais",
                headline: capitalize(fp.top_react_received.key),
                detail: `${fp.top_react_received.count} ${fp.top_react_received.count === 1 ? "reação" : "reações"}`,
                emoji: fp.top_react_received.emoji,
            });
        }
        if (fp.top_hashtags?.[0]) {
            out.push({
                key: "tag", eyebrow: "Voz mais usada",
                headline: `#${fp.top_hashtags[0].tag}`,
                detail: `${fp.top_hashtags[0].count} ${fp.top_hashtags[0].count === 1 ? "publicação" : "publicações"}`,
                icon: Hash,
            });
        }
        if (fp.top_community) {
            out.push({
                key: "comm", eyebrow: "Tasca preferida",
                headline: fp.top_community.name,
                detail: `${fp.top_community.posts} ${fp.top_community.posts === 1 ? "post" : "posts"} lá`,
                icon: Users,
                href: `/c/${fp.top_community.slug}`,
            });
        }
        if (fp.peak_hour != null) {
            const Icon = HOUR_ICON(fp.peak_hour);
            out.push({
                key: "hour", eyebrow: "Escreve à",
                headline: HOUR_LABEL(fp.peak_hour),
                detail: `pico às ${String(fp.peak_hour).padStart(2, "0")}h00`,
                icon: Icon,
            });
        }
        return out;
    }, [fp]);

    if (cards.length === 0) return null;

    return (
        <section className="px-4 lg:px-6 py-5 hairline-b" data-testid="profile-fingerprint">
            <div className="flex items-baseline gap-2 mb-3">
                <p className="text-[10.5px] uppercase tracking-[0.14em] text-black/45 font-mono">
                    <Sparkle size={11} className="inline -mt-0.5 mr-1" />
                    Como {firstName} aparece aqui
                </p>
                <span className="text-[10.5px] text-black/35 font-mono ml-auto">
                    Análise de {fp.posts_analyzed} {fp.posts_analyzed === 1 ? "post" : "posts"}
                </span>
            </div>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5">
                {cards.map((c) => {
                    const Icon = c.icon;
                    const inner = (
                        <article
                            data-testid={`fp-${c.key}`}
                            className="rounded-2xl border border-black/[0.08] p-3.5 bg-white hover:border-black/30 transition relative overflow-hidden h-full"
                        >
                            <div className="flex items-center gap-2 mb-2">
                                {Icon ? (
                                    <div className="w-7 h-7 rounded-lg bg-black/[0.04] grid place-items-center text-black/70 shrink-0">
                                        <Icon size={13} strokeWidth={1.7} />
                                    </div>
                                ) : (
                                    <div className="w-7 h-7 rounded-lg bg-paper grid place-items-center text-[15px] shrink-0">
                                        <span aria-hidden>{c.emoji}</span>
                                    </div>
                                )}
                                <p className="text-[10px] uppercase tracking-[0.14em] text-black/45 font-mono truncate">
                                    {c.eyebrow}
                                </p>
                            </div>
                            <h3 className="font-display text-[16px] lg:text-[18px] font-semibold tracking-tight text-black leading-tight truncate">
                                {c.headline}
                            </h3>
                            <p className="text-[11.5px] text-black/55 mt-0.5 truncate">{c.detail}</p>
                        </article>
                    );
                    return c.href ? (
                        <Link key={c.key} to={c.href} className="block">{inner}</Link>
                    ) : (
                        <div key={c.key}>{inner}</div>
                    );
                })}
            </div>
        </section>
    );
}
