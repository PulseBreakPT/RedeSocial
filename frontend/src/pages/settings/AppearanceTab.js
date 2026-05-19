import { Palette, Sun, FileText, Type, Sparkles, Globe, MoveDown, Check } from "lucide-react";
import { SwitchPill } from "./_shared";

/* =============================================================
   AppearanceTab — Tema, densidade, idioma e movimento.
   Todos os campos são reais (theme, density, language, reduce_motion
   estão definidos no schema do user no backend).
   ============================================================= */

const THEMES = [
    { key: "light", label: "Clara", desc: "Branco e tinta — a padrão.", icon: Sun, swatch: "bg-white border-black/15" },
    { key: "sepia", label: "Sépia", desc: "Tom de papel — descansa a vista.", icon: FileText, swatch: "bg-[#f7f1e6] border-amber-200" },
    { key: "auto", label: "Sistema", desc: "Segue a preferência do dispositivo.", icon: Sparkles, swatch: "bg-gradient-to-br from-white to-[#f7f1e6] border-black/15" },
];

const DENSITIES = [
    { key: "comfortable", label: "Confortável", desc: "Espaçamento padrão para leitura tranquila.", icon: MoveDown },
    { key: "compact", label: "Compacto", desc: "Mais conteúdo por ecrã, espaçamento reduzido.", icon: Type },
];

const LANGUAGES = [
    { key: "pt-PT", label: "Português (Portugal)", flag: "🇵🇹" },
    { key: "pt-BR", label: "Português (Brasil)", flag: "🇧🇷" },
    { key: "en", label: "English", flag: "🇬🇧" },
];

function OptionCard({ active, onClick, icon: Icon, label, desc, swatch, testid }) {
    return (
        <button
            type="button"
            onClick={onClick}
            data-testid={testid}
            className={`relative card-lux p-4 sm:p-5 text-left transition tap-shrink ${
                active ? "ring-2 ring-black border-black shadow-lg" : "hover:shadow-md hover:border-black/20"
            }`}
        >
            {active && (
                <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-black text-white grid place-items-center" aria-hidden>
                    <Check size={11} strokeWidth={2.5} />
                </span>
            )}
            <div className="flex items-center gap-3 mb-2.5">
                {swatch ? (
                    <span className={`w-10 h-10 rounded-xl border ${swatch}`} aria-hidden />
                ) : (
                    <div className="w-10 h-10 rounded-xl grid place-items-center bg-black/[0.04] text-black/70">
                        <Icon size={16} strokeWidth={1.8} />
                    </div>
                )}
            </div>
            <div className="font-heading font-semibold text-[14px] tracking-tight text-black">{label}</div>
            <div className="text-[11.5px] text-black/55 leading-snug mt-1">{desc}</div>
        </button>
    );
}

export function AppearanceTab({ prefs, setPref }) {
    return (
        <div className="px-4 lg:px-8 py-5 lg:py-7" data-testid="settings-appearance">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-4 max-w-5xl">

                {/* TEMA */}
                <div className="lg:col-span-12">
                    <div className="flex items-center gap-2 mb-3">
                        <Palette size={14} strokeWidth={1.8} className="text-black/60" />
                        <p className="type-overline mb-0">Tema</p>
                    </div>
                </div>
                {THEMES.map((t) => (
                    <div key={t.key} className="lg:col-span-4">
                        <OptionCard
                            active={prefs.theme === t.key}
                            onClick={() => setPref("theme", t.key)}
                            icon={t.icon}
                            swatch={t.swatch}
                            label={t.label}
                            desc={t.desc}
                            testid={`theme-${t.key}`}
                        />
                    </div>
                ))}

                {/* DENSIDADE */}
                <div className="lg:col-span-12 mt-4">
                    <div className="flex items-center gap-2 mb-3">
                        <MoveDown size={14} strokeWidth={1.8} className="text-black/60" />
                        <p className="type-overline mb-0">Densidade</p>
                    </div>
                </div>
                {DENSITIES.map((d) => (
                    <div key={d.key} className="lg:col-span-6">
                        <OptionCard
                            active={prefs.density === d.key}
                            onClick={() => setPref("density", d.key)}
                            icon={d.icon}
                            label={d.label}
                            desc={d.desc}
                            testid={`density-${d.key}`}
                        />
                    </div>
                ))}

                {/* IDIOMA */}
                <div className="lg:col-span-12 mt-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Globe size={14} strokeWidth={1.8} className="text-black/60" />
                        <p className="type-overline mb-0">Idioma</p>
                    </div>
                </div>
                <div className="lg:col-span-12 card-lux p-1 sm:p-1.5 grid grid-cols-3 gap-1">
                    {LANGUAGES.map((l) => {
                        const active = prefs.language === l.key;
                        return (
                            <button
                                key={l.key}
                                type="button"
                                onClick={() => setPref("language", l.key)}
                                data-testid={`lang-${l.key}`}
                                className={`relative px-3 py-2.5 rounded-xl text-[12.5px] font-medium transition tap-shrink flex items-center justify-center gap-2 ${
                                    active ? "bg-black text-white shadow-sm" : "text-black/65 hover:bg-black/[0.04] hover:text-black"
                                }`}
                            >
                                <span aria-hidden className="text-[15px] leading-none">{l.flag}</span>
                                <span className="truncate">{l.label}</span>
                            </button>
                        );
                    })}
                </div>

                {/* MOVIMENTO */}
                <div className="lg:col-span-12 mt-4">
                    <div className="flex items-center gap-2 mb-3">
                        <Sparkles size={14} strokeWidth={1.8} className="text-black/60" />
                        <p className="type-overline mb-0">Movimento</p>
                    </div>
                </div>
                <label className="lg:col-span-12 p-4 sm:p-5 card-lux flex items-center justify-between gap-3" data-testid="reduce-motion-row">
                    <div className="min-w-0">
                        <div className="font-heading font-semibold text-[14px] tracking-tight text-black">Reduzir animações</div>
                        <div className="text-[12px] text-black/55 mt-1 leading-snug">
                            Suaviza ou remove transições e animações. Recomendado para acessibilidade.
                        </div>
                    </div>
                    <SwitchPill
                        checked={!!prefs.reduce_motion}
                        onChange={(v) => setPref("reduce_motion", v)}
                        testid="reduce-motion-toggle"
                    />
                </label>

                <p className="lg:col-span-12 text-[11px] text-black/45 mt-2 leading-relaxed font-mono">
                    Estas preferências são guardadas na tua conta e seguem-te em qualquer dispositivo.
                </p>
            </div>
        </div>
    );
}
