import {
    User, MapPin, Smile, Trophy, Quote, BookOpen, Music, Coffee, Sparkles,
} from "lucide-react";

const BIO_SLOT_META = [
    { key: "mood_today",      Icon: Smile,    label: "Mood do dia" },
    { key: "soundtrack",      Icon: Music,    label: "Banda sonora" },
    { key: "reading",         Icon: BookOpen, label: "A ler" },
    { key: "favourite_place", Icon: MapPin,   label: "Lugar favorito" },
    { key: "quote_of_month",  Icon: Quote,    label: "Frase do mês" },
    { key: "city_extra",      Icon: Coffee,   label: "Bairro/Freguesia" },
];

function Row({ icon: Icon, label, value, accent }) {
    if (!value) return null;
    return (
        <div className="flex items-start gap-3 p-3.5 hairline-b last:border-b-0">
            <div className={`w-9 h-9 rounded-xl grid place-items-center shrink-0 ${accent || "bg-black/[0.04] text-black/70"}`}>
                <Icon size={15} strokeWidth={1.7} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="type-overline mb-0.5">{label}</div>
                <div className="text-[14px] text-black break-words">{value}</div>
            </div>
        </div>
    );
}

function BioSlotCard({ slot, value }) {
    const { Icon, label } = slot;
    return (
        <div className="card-lux p-4" data-testid={`about-slot-${slot.key}`}>
            <div className="flex items-center gap-2 mb-2">
                <div className="w-7 h-7 rounded-lg bg-black/[0.04] grid place-items-center text-black/70">
                    <Icon size={13} strokeWidth={1.8} />
                </div>
                <span className="type-overline mb-0">{label}</span>
            </div>
            <p className="font-heading font-semibold text-[15px] tracking-tight text-black leading-snug">
                {value}
            </p>
        </div>
    );
}

export function AboutTab({ profile, regionMeta, moodMeta, teamMeta }) {
    const slots = BIO_SLOT_META
        .map((s) => ({ slot: s, value: (profile.bio_slots?.[s.key] || "").trim() }))
        .filter((x) => x.value);

    const hasAnyContent =
        !!profile.bio || !!profile.city || !!profile.freguesia ||
        !!regionMeta || !!moodMeta || (teamMeta && teamMeta.key !== "nenhum") ||
        slots.length > 0;

    if (!hasAnyContent) {
        return (
            <div className="p-12 text-center" data-testid="about-empty">
                <div className="w-14 h-14 rounded-full bg-black/[0.04] grid place-items-center mx-auto mb-4">
                    <User size={22} className="text-black/40" />
                </div>
                <p className="type-overline mb-2">Sem ficha de identidade</p>
                <p className="text-black/55 font-mono text-sm max-w-[34ch] mx-auto leading-relaxed">
                    {profile.is_self ? "Vai a Definições para preencher a tua ficha." : "Este perfil ainda não preencheu a sua ficha."}
                </p>
            </div>
        );
    }

    return (
        <div className="p-4 lg:p-6 space-y-5" data-testid="about-tab">
            {profile.bio && (
                <div>
                    <p className="type-overline mb-2">Bio</p>
                    <p className="text-[15px] text-black/80 leading-relaxed max-w-[60ch]">{profile.bio}</p>
                </div>
            )}

            <div>
                <p className="type-overline mb-2">Identidade portuguesa</p>
                <div className="card-lux overflow-hidden">
                    <Row icon={MapPin} label="Cidade"     value={profile.city} />
                    <Row icon={MapPin} label="Freguesia/Bairro" value={profile.freguesia} />
                    <Row icon={MapPin} label="Região" value={regionMeta ? `${regionMeta.emoji}  ${regionMeta.label}` : null} />
                    <Row icon={Smile} label="Mood inicial" value={moodMeta ? `${moodMeta.emoji}  ${moodMeta.label}` : null} />
                    <Row icon={Trophy} label="Clube" value={teamMeta && teamMeta.key !== "nenhum" ? `${teamMeta.emoji}  ${teamMeta.label}` : null} />
                </div>
            </div>

            {slots.length > 0 && (
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Sparkles size={13} className="text-black/55" strokeWidth={1.8} />
                        <p className="type-overline mb-0">Slots de bio</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {slots.map(({ slot, value }) => (
                            <BioSlotCard key={slot.key} slot={slot} value={value} />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
