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
            {/* COVER + AVATAR */}
            <div className="relative h-36 lg:h-52 overflow-hidden">
                <div className="absolute inset-0 silver-grad" />
                <div className="absolute inset-0 opacity-50 mix-blend-multiply" style={{ background: "radial-gradient(circle at 25% 35%, rgba(13,13,16,0.10), transparent 55%), radial-gradient(circle at 80% 70%, rgba(13,13,16,0.06), transparent 55%)" }} />
                {form.banner && <img src={form.banner} alt="" className="relative w-full h-full object-cover" />}
                <button
                    onClick={() => bannerRef.current?.click()}
                    data-testid="banner-upload-btn"
                    className="absolute bottom-3 right-3 bg-black/85 hover:bg-black p-2.5 rounded-full text-white shadow-lg backdrop-blur-sm transition tap-shrink inline-flex items-center gap-1.5"
                    aria-label="alterar capa"
                >
                    <Camera size={14} />
                    <span className="text-[11px] font-mono tracking-wider uppercase hidden sm:inline">Capa</span>
                </button>
                <input ref={bannerRef} type="file" accept="image/*" className="hidden" onChange={(e) => readFile(e.target.files?.[0], (d) => setForm({ ...form, banner: d }))} />
            </div>

            <div className="px-4 lg:px-8 -mt-14 lg:-mt-16 relative">
                <div className="flex items-end justify-between gap-4 mb-2">
                    <div className="relative inline-block rounded-full p-1.5 bg-white shadow-[0_10px_30px_-12px_rgba(13,13,16,0.30)]">
                        <Avatar user={{ ...user, avatar: form.avatar }} size={92} />
                        <button
                            onClick={() => avatarRef.current?.click()}
                            data-testid="avatar-upload-btn"
                            className="absolute bottom-1 right-1 bg-black/90 hover:bg-black p-2 rounded-full text-white shadow-md transition tap-shrink"
                            aria-label="alterar avatar"
                        >
                            <Camera size={12} />
                        </button>
                        <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={(e) => readFile(e.target.files?.[0], (d) => setForm({ ...form, avatar: d }))} />
                    </div>
                    {user?.username && (
                        <div className="mb-1 text-right">
                            <p className="type-overline">Identificador</p>
                            <p className="font-mono text-[14px] tracking-tight text-black/80 inline-flex items-center gap-1 mt-1">
                                <AtSign size={12} />{user.username}
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
                            className="mt-2 w-full bg-[#fafafa] border border-black/[0.08] rounded-2xl px-4 py-3.5 focus:border-black/40 focus:bg-white focus:outline-none transition resize-none text-[14px] leading-relaxed"
                        />
                    </div>

                    {/* Conta privada — 12 cols, design switch premium */}
                    <div className="lg:col-span-12 p-4 sm:p-5 card-lux flex items-center justify-between gap-3" data-testid="privacy-toggle">
                        <div className="flex items-start gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl grid place-items-center bg-indigo-50 text-indigo-700 shrink-0">
                                <Lock size={16} strokeWidth={1.7} />
                            </div>
                            <div className="min-w-0">
                                <div className="font-heading font-semibold text-[14px] tracking-tight text-black inline-flex items-center gap-2">
                                    Conta privada
                                    {form.private && (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-[0.12em] px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                                            <ShieldCheck size={9} /> Ativo
                                        </span>
                                    )}
                                </div>
                                <div className="font-mono text-[11px] text-black/50 mt-0.5 leading-snug">
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
