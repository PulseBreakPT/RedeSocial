import { Link } from "react-router-dom";
import { Sparkles, ChevronRight, CheckCircle2 } from "lucide-react";

function computeChecklist(profile, stats) {
    return [
        { key: "bio",      label: "Adiciona uma bio curta",       done: !!profile.bio,                        to: "/settings" },
        { key: "avatar",   label: "Carrega uma foto de perfil",   done: !!profile.avatar,                     to: "/settings" },
        { key: "banner",   label: "Personaliza a tua capa",       done: !!profile.banner,                     to: "/settings" },
        { key: "region",   label: "Diz a tua região portuguesa",  done: !!profile.region,                     to: "/settings" },
        { key: "mood",     label: "Define um mood inicial",       done: !!profile.mood_initial,               to: "/settings" },
        { key: "post",     label: "Publica o teu primeiro post",  done: (stats?.posts_count || 0) >= 1,       to: "/" },
        { key: "follow3",  label: "Segue pelo menos 3 pessoas",   done: (profile.following_count || 0) >= 3,  to: "/explore" },
        { key: "slot",     label: "Preenche ≥3 slots de bio",     done: Object.values(profile.bio_slots || {}).filter((v) => v?.trim()).length >= 3, to: "/settings" },
    ];
}

function Ring({ value, size = 72 }) {
    const r = (size - 8) / 2;
    const c = 2 * Math.PI * r;
    const offset = c - (c * value) / 100;
    return (
        <div className="relative shrink-0" style={{ width: size, height: size }}>
            <svg width={size} height={size} className="-rotate-90">
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(13,13,16,0.06)" strokeWidth={4} />
                <circle
                    cx={size / 2} cy={size / 2} r={r}
                    fill="none" stroke="#0a0a0a" strokeWidth={4} strokeLinecap="round"
                    strokeDasharray={c} strokeDashoffset={offset}
                    style={{ transition: "stroke-dashoffset 700ms cubic-bezier(0.16,1,0.3,1)" }}
                />
            </svg>
            <div className="absolute inset-0 grid place-items-center">
                <div className="font-display text-[16px] leading-none font-bold tabular-nums text-black">
                    {value}<span className="text-[9px] text-black/40 ml-0.5">%</span>
                </div>
            </div>
        </div>
    );
}

export function CompletionPanel({ profile, stats }) {
    const items = computeChecklist(profile, stats);
    const done = items.filter((i) => i.done).length;
    const total = items.length;
    const pct = Math.round((done / total) * 100);
    if (pct >= 100) return null;

    const pending = items.filter((i) => !i.done).slice(0, 4);

    return (
        <section className="px-4 lg:px-6 pt-5 pb-2" data-testid="completion-panel">
            <div className="card-lux p-5 relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-black/[0.03] pointer-events-none" />
                <div className="relative flex items-start gap-4">
                    <Ring value={pct} />
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                            <Sparkles size={13} className="text-black/55" strokeWidth={1.8} />
                            <p className="type-overline mb-0">Completa o teu perfil</p>
                        </div>
                        <h3 className="font-heading font-bold text-[16px] tracking-tight text-black mt-1">
                            {done} de {total} passos prontos
                        </h3>
                        <p className="text-[12px] text-black/55 leading-relaxed mt-1">
                            Cada passo deixa o teu perfil mais legível para quem chega novo.
                        </p>
                    </div>
                </div>
                <div className="mt-4 space-y-1.5">
                    {pending.map((it) => (
                        <Link
                            key={it.key}
                            to={it.to}
                            data-testid={`completion-${it.key}`}
                            className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-black/[0.03] transition group"
                        >
                            <div className="w-5 h-5 rounded-full border-2 border-black/15 group-hover:border-black/40 grid place-items-center transition shrink-0">
                                <CheckCircle2 size={10} className="text-black/0 group-hover:text-black/55 transition" />
                            </div>
                            <span className="flex-1 text-[12.5px] text-black/80 group-hover:text-black transition">{it.label}</span>
                            <ChevronRight size={13} className="text-black/25 group-hover:text-black/55 group-hover:translate-x-0.5 transition" />
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}
