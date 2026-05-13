import { useMemo } from "react";
import { Sparkles, MapPin, Smile, Users, Trophy, Heart } from "lucide-react";
import { Avatar } from "../../components/Avatar";

/* Compute affinity score 0-100 from light client-side comparison */
function computeAffinity({ profile, viewer, mutual, fingerprint }) {
    if (!viewer || profile.is_self) return null;
    let score = 0;
    const buckets = [];

    if (mutual?.count > 0) {
        const bonus = Math.min(30, mutual.count * 6);
        score += bonus;
        buckets.push({
            key: "mutuals",
            icon: Users,
            label: `${mutual.count} ${mutual.count === 1 ? "amigo" : "amigos"} em comum`,
            avatars: mutual.users || [],
        });
    }
    if (profile.region && viewer.region && profile.region === viewer.region) {
        score += 18;
        buckets.push({ key: "region", icon: MapPin, label: "Mesma região portuguesa" });
    }
    if (profile.mood_initial && viewer.mood_initial && profile.mood_initial === viewer.mood_initial) {
        score += 14;
        buckets.push({ key: "mood", icon: Smile, label: "Mesmo mood inicial" });
    }
    if (profile.team && viewer.team && profile.team === viewer.team && profile.team !== "nenhum") {
        score += 12;
        buckets.push({ key: "team", icon: Trophy, label: "Mesmo clube" });
    }
    if (fingerprint?.top_mood && viewer.mood_initial && fingerprint.top_mood === viewer.mood_initial) {
        score += 10;
        buckets.push({ key: "voice", icon: Heart, label: "Escrita com o teu mood" });
    }
    return { score: Math.min(100, score), buckets };
}

export function AffinityRibbon({ profile, viewer, mutual, fingerprint }) {
    const result = useMemo(() => computeAffinity({ profile, viewer, mutual, fingerprint }), [profile, viewer, mutual, fingerprint]);
    if (!result || result.buckets.length === 0) return null;

    const { score, buckets } = result;
    const tier =
        score >= 60 ? { label: "Forte", color: "text-emerald-700", bg: "bg-emerald-100" } :
        score >= 30 ? { label: "Próxima", color: "text-amber-700", bg: "bg-amber-100" } :
                       { label: "Leve",   color: "text-black/55",  bg: "bg-black/[0.06]" };

    return (
        <section className="px-4 lg:px-6 pt-5 pb-2" data-testid="affinity-ribbon">
            <div className="card-lux p-4 lg:p-5">
                <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                        <Sparkles size={13} className="text-black/55" strokeWidth={1.8} />
                        <p className="type-overline mb-0">Afinidade contigo</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-mono uppercase tracking-[0.12em] px-2 py-0.5 rounded-full ${tier.bg} ${tier.color}`}>
                            {tier.label}
                        </span>
                        <span className="font-display text-[22px] font-bold tabular-nums text-black leading-none">
                            {score}<span className="text-[12px] text-black/40 ml-0.5">%</span>
                        </span>
                    </div>
                </div>
                <div className="w-full h-1.5 bg-black/[0.06] rounded-full overflow-hidden">
                    <div
                        className="h-full bg-black rounded-full transition-all duration-700"
                        style={{ width: `${score}%` }}
                    />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                    {buckets.map((b) => {
                        const Icon = b.icon;
                        return (
                            <div
                                key={b.key}
                                data-testid={`affinity-${b.key}`}
                                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/[0.04] border border-black/[0.06] text-[12px] text-black/80"
                            >
                                {b.avatars && b.avatars.length > 0 ? (
                                    <div className="flex -space-x-1.5">
                                        {b.avatars.slice(0, 3).map((u) => (
                                            <Avatar key={u.id} user={u} size={16} className="border border-white" />
                                        ))}
                                    </div>
                                ) : (
                                    <Icon size={12} className="text-black/60" strokeWidth={1.8} />
                                )}
                                <span>{b.label}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}
