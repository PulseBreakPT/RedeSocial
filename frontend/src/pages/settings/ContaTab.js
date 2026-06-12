import { Camera, Lock, MapPin, AtSign, ShieldCheck } from "lucide-react";
import { Avatar } from "../../components/Avatar";
import { SwitchPill } from "./_shared";

/* =================== ContaTab — Perfil principal SSS tier ====================
   Layout 12-col com cards bem hierarquizados:
   · Capa (full bleed) + Avatar (sobreposto)
   · Coluna grande: Nome + Bio (full width abaixo)
   · Coluna estreita: @username (read-only) + Cidade
   · Linha de toggle: Conta privada
==================================================================== */
export function ContaTab({ user, form, setForm, avatarRef, bannerRef, readFile, save, busy }) {
    return (
        <div data-testid="settings-conta">
            {/* COVER + AVATAR — FANZINE PT */}
            <div
                className="relative h-36 lg:h-52 overflow-hidden"
                style={{
                    background: "#3E5C9A",
                    borderBottom: "4px solid #0A0A0A",
                }}
            >
                <div className="pt-tape h-2 w-full absolute top-0 left-0 z-10" />
                <div className="absolute inset-0 grain pointer-events-none opacity-50" />
                {form.banner && <img src={form.banner} alt="" className="relative w-full h-full object-cover" />}
                <button
                    onClick={() => bannerRef.current?.click()}
                    data-testid="banner-upload-btn"
                    className="absolute bottom-3 right-3 p-2.5 tap-shrink inline-flex items-center gap-1.5 font-mono font-black uppercase"
                    style={{
                        background: "#0A0A0A",
                        color: "#FFCC29",
                        border: "1px solid rgba(10,10,10,0.10)",
                        boxShadow: "0 1px 2px rgba(10,10,10,0.05), 0 8px 20px -10px rgba(10,10,10,0.15)",
                        borderRadius: 999,
                        fontSize: 10.5,
                        letterSpacing: "0.10em",
                    }}
                    aria-label="alterar capa"
                >
                    <Camera size={13} strokeWidth={2.4} />
                    <span className="hidden sm:inline">Capa</span>
                </button>
                <input ref={bannerRef} type="file" accept="image/*" className="hidden" onChange={(e) => readFile(e.target.files?.[0], (d) => setForm({ ...form, banner: d }))} />
            </div>

            <div className="px-4 lg:px-8 -mt-14 lg:-mt-16 relative">
                <div className="flex items-end justify-between gap-4 mb-2">
                    <div
                        className="relative inline-block p-1.5"
                        style={{
                            background: "#fff",
                            border: "1px solid rgba(10,10,10,0.10)",
                            boxShadow: "0 1px 2px rgba(10,10,10,0.05), 0 8px 20px -10px rgba(10,10,10,0.15)",
                            borderRadius: 999,
                        }}
                    >
                        <Avatar user={{ ...user, avatar: form.avatar }} size={92} />
                        <button
                            onClick={() => avatarRef.current?.click()}
                            data-testid="avatar-upload-btn"
                            className="absolute bottom-1 right-1 p-2 tap-shrink"
                            style={{
                                background: "#0A0A0A",
                                color: "#FFCC29",
                                border: "1px solid rgba(10,10,10,0.10)",
                                boxShadow: "0 1px 2px rgba(10,10,10,0.05), 0 8px 20px -10px rgba(10,10,10,0.15)",
                                borderRadius: 999,
                            }}
                            aria-label="alterar avatar"
                        >
                            <Camera size={12} strokeWidth={2.4} />
                        </button>
                        <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={(e) => readFile(e.target.files?.[0], (d) => setForm({ ...form, avatar: d }))} />
                    </div>
                    {user?.username && (
                        <div className="mb-1 text-right">
                            <p className="type-overline">Identificador</p>
                            <p className="font-mono font-black tracking-tight inline-flex items-center gap-1 mt-1.5" style={{ fontSize: 14, color: "#0A0A0A" }}>
                                <AtSign size={12} strokeWidth={2.4} />{user.username}
                            </p>
                        </div>
                    )}
                </div>

                {/* Super-grid: 12 cols */}
                <div className="mt-5 grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-4 max-w-5xl">
                    {/* Nome — 7 cols */}
                    <div className="lg:col-span-7 card-lux p-4 sm:p-5">
                        <label className="type-overline">Nome</label>
                        <input
                            data-testid="settings-name"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            placeholder="Como te chamas?"
                            className="mt-2 vm-input"
                            maxLength={80}
                        />
                        <p className="font-mono text-[10.5px] text-black/40 mt-1.5">Visível no teu perfil e nos teus posts.</p>
                    </div>

                    {/* Cidade — 5 cols */}
                    <div className="lg:col-span-5 card-lux p-4 sm:p-5">
                        <label className="type-overline flex items-center gap-1.5"><MapPin size={10} /> Cidade</label>
                        <input
                            data-testid="settings-city"
                            value={form.city}
                            onChange={(e) => setForm({ ...form, city: e.target.value })}
                            placeholder="Lisboa, Porto, Évora…"
                            className="mt-2 vm-input"
                            maxLength={60}
                        />
                        <p className="font-mono text-[10.5px] text-black/40 mt-1.5">Opcional · ajuda a descobrir pessoas perto de ti.</p>
                    </div>

                    {/* Bio — 12 cols */}
                    <div className="lg:col-span-12 card-lux p-4 sm:p-5">
                        <div className="flex items-center justify-between">
                            <label className="type-overline">Bio</label>
                            <span className="font-mono text-[10px] text-black/40 tracking-wider tabular-nums">
                                {160 - (form.bio?.length || 0)} restantes
                            </span>
                        </div>
                        <textarea
                            data-testid="settings-bio"
                            value={form.bio}
                            onChange={(e) => setForm({ ...form, bio: e.target.value })}
                            rows={3} maxLength={160}
                            placeholder="Conta-nos algo em poucas palavras…"
                            className="mt-2 w-full px-4 py-3.5 focus:outline-none resize-none font-medium"
                            style={{
                                background: "#FBFAF6",
                                color: "#0A0A0A",
                                border: "1px solid rgba(10,10,10,0.10)",
                                boxShadow: "0 1px 2px rgba(10,10,10,0.05), 0 8px 20px -10px rgba(10,10,10,0.15)",
                                borderRadius: 10,
                                fontSize: 14,
                                lineHeight: 1.6,
                            }}
                        />
                    </div>

                    {/* Conta privada — 12 cols · FANZINE switch */}
                    <div className="lg:col-span-12 p-4 sm:p-5 card-lux flex items-center justify-between gap-3" data-testid="privacy-toggle">
                        <div className="flex items-start gap-3 min-w-0">
                            <div
                                className="w-11 h-11 grid place-items-center shrink-0"
                                style={{
                                    background: "#3E5C9A",
                                    color: "#fff",
                                    border: "1px solid rgba(10,10,10,0.10)",
                                    borderRadius: 8,
                                }}
                            >
                                <Lock size={15} strokeWidth={2.2} />
                            </div>
                            <div className="min-w-0">
                                <div className="font-black tracking-tight inline-flex items-center gap-2" style={{ fontSize: 14, color: "#0A0A0A" }}>
                                    Conta privada
                                    {form.private && (
                                        <span
                                            className="inline-flex items-center gap-1 font-mono font-black uppercase px-1.5 py-0.5"
                                            style={{
                                                fontSize: 10,
                                                letterSpacing: "0.10em",
                                                background: "#046A38",
                                                color: "#fff",
                                                border: "1.5px solid #0A0A0A",
                                                borderRadius: 999,
                                            }}
                                        >
                                            <ShieldCheck size={9} strokeWidth={2.6} /> Ativo
                                        </span>
                                    )}
                                </div>
                                <div className="font-mono text-[11px] mt-1.5 leading-snug font-medium" style={{ color: "rgba(10,10,10,0.55)" }}>
                                    Apenas seguidores aprovados podem ver as tuas publicações.
                                </div>
                            </div>
                        </div>
                        <SwitchPill
                            checked={!!form.private}
                            onChange={(v) => setForm({ ...form, private: v })}
                            testid="privacy-toggle-switch"
                        />
                    </div>
                </div>

                {/* Save row */}
                <div className="max-w-5xl flex justify-end items-center pb-2 gap-3 hairline-t pt-5 mt-6">
                    <button
                        onClick={save}
                        disabled={busy}
                        data-testid="settings-save-btn"
                        className="btn-obsidian px-7 py-3 text-[12px] disabled:opacity-50"
                    >
                        {busy ? "A guardar…" : "Guardar perfil"}
                    </button>
                </div>
            </div>
        </div>
    );
}
