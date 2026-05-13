import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Camera, Lock, LogOut, User as UserIcon, Bell, Shield, Palette, Trash2, Download, FileText, Cookie, Sparkle, ChevronRight, MapPin, Moon, Sun, ScrollText } from "lucide-react";
import { api, formatApiError, toastApiError } from "../lib/api";
import { Avatar } from "../components/Avatar";
import { PageHeader } from "../components/PageHeader";
import { CosmeticsPicker } from "../components/CosmeticsPicker";
import { useAuth } from "../context/AuthContext";
import { lsGet, lsSet } from "../lib/portuguese";
import { PT_REGIONS, PT_MOODS, PT_TEAMS } from "../lib/ptCulture";
import { openCookiePreferences } from "../components/CookieBanner";
import { toast } from "sonner";

const TABS = [
    { key: "conta", label: "Conta", icon: UserIcon },
    { key: "ident", label: "Identidade", icon: MapPin },
    { key: "notif", label: "Notificações", icon: Bell },
    { key: "priv", label: "Privacidade", icon: Shield },
    { key: "apar", label: "Aparência", icon: Palette },
    { key: "legal", label: "Legal", icon: FileText },
];

const BIO_SLOTS = [
    { key: "mood_today",       label: "Mood do dia",     placeholder: "saudade · tasca · festa…" },
    { key: "soundtrack",       label: "Banda sonora",    placeholder: "O que andas a ouvir?" },
    { key: "reading",          label: "Livro/série",     placeholder: "Sebastião Salgado, Glória…" },
    { key: "favourite_place",  label: "Lugar favorito",  placeholder: "Praça do Comércio, Pena, Foz…" },
    { key: "quote_of_month",   label: "Frase do mês",    placeholder: "Uma linha que te define agora" },
    { key: "city_extra",       label: "Bairro/Freguesia",placeholder: "Alvalade, Cedofeita…" },
];

export default function Settings() {
    const { user, setUser, logout } = useAuth();
    const [tab, setTab] = useState("conta");
    const [form, setForm] = useState({
        name: user?.name || "",
        bio: user?.bio || "",
        avatar: user?.avatar || "",
        banner: user?.banner || "",
        private: !!user?.private,
        // PT identity / place graph
        city: user?.city || "",
        freguesia: user?.freguesia || "",
        region: user?.region || "",
        mood_initial: user?.mood_initial || "",
        team: user?.team || "",
        bio_slots: user?.bio_slots || {},
        // Healthy modes
        boa_noite_enabled: user?.boa_noite_enabled !== false,
        cafezinho_enabled: !!user?.cafezinho_enabled,
    });
    const [busy, setBusy] = useState(false);
    // Local prefs
    const [prefs, setPrefs] = useState(() => ({
        notif_likes: lsGet("pref.notif_likes", true),
        notif_comments: lsGet("pref.notif_comments", true),
        notif_follows: lsGet("pref.notif_follows", true),
        notif_mentions: lsGet("pref.notif_mentions", true),
        notif_dm: lsGet("pref.notif_dm", true),
        priv_show_online: lsGet("pref.priv_show_online", true),
        priv_typing: lsGet("pref.priv_typing", true),
        priv_search: lsGet("pref.priv_search", true),
        theme: lsGet("pref.theme", "light"),
        density: lsGet("pref.density", "comfortable"),
        language: lsGet("pref.language", "pt-PT"),
        reduce_motion: lsGet("pref.reduce_motion", false),
    }));
    const setPref = (k, v) => { setPrefs((p) => ({ ...p, [k]: v })); lsSet(`pref.${k}`, v); };
    const avatarRef = useRef(null);
    const bannerRef = useRef(null);

    const readFile = (file, cb) => {
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) return toast.error("Imagem não pode exceder 2MB");
        const reader = new FileReader();
        reader.onload = (ev) => cb(ev.target.result);
        reader.readAsDataURL(file);
    };
    const save = async () => {
        setBusy(true);
        try { const { data } = await api.patch("/users/me", form); setUser({ ...user, ...data }); toast.success("Perfil atualizado"); }
        catch (e) { toastApiError(e); }
        finally { setBusy(false); }
    };
    const downloadData = () => {
        const blob = new Blob([JSON.stringify({ user, prefs }, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = `vermillion-${user?.username || "user"}.json`; a.click();
        URL.revokeObjectURL(url);
        toast.success("Download iniciado");
    };

    return (
        <div data-testid="settings-page">
            <PageHeader title="Definições" subtitle="Conta, notificações e privacidade" back testid="settings-header">
                <div className="px-3 lg:px-4 pb-2 flex gap-1 overflow-x-auto scrollbar-hide hairline-t pt-2">
                    {TABS.map((t) => { const Icon = t.icon; const active = tab === t.key; return (
                        <button key={t.key} onClick={() => setTab(t.key)} data-testid={`settings-tab-${t.key}`} className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium border-b-2 transition ${active ? "tab-grad-on" : "border-transparent text-black hover:text-black"}`}>
                            <Icon size={13} /> {t.label}
                        </button>
                    ); })}
                </div>
            </PageHeader>

            {tab === "conta" && (
                <>
                    <div className="relative h-32 lg:h-44 overflow-hidden">
                        <div className="absolute inset-0 silver-grad" />
                        <div className="absolute inset-0 opacity-50 mix-blend-multiply" style={{ background: "radial-gradient(circle at 25% 35%, rgba(106,168,230,0.15), transparent 55%), radial-gradient(circle at 80% 70%, rgba(232,93,108,0.10), transparent 55%)" }} />
                        {form.banner && <img src={form.banner} alt="" className="relative w-full h-full object-cover" />}
                        <button onClick={() => bannerRef.current?.click()} data-testid="banner-upload-btn" className="absolute bottom-3 right-3 bg-black/80 hover:bg-black p-2.5 rounded-full text-white shadow-lg" aria-label="alterar capa"><Camera size={15} /></button>
                        <input ref={bannerRef} type="file" accept="image/*" className="hidden" onChange={(e) => readFile(e.target.files?.[0], (d) => setForm({ ...form, banner: d }))} />
                    </div>

                    <div className="px-4 lg:px-6 -mt-10 lg:-mt-12 relative">
                        <div className="relative inline-block rounded-full p-1 bg-white shadow-[0_8px_24px_-12px_rgba(13,13,16,0.25)]">
                            <Avatar user={{ ...user, avatar: form.avatar }} size={84} />
                            <button onClick={() => avatarRef.current?.click()} data-testid="avatar-upload-btn" className="absolute bottom-1 right-1 bg-black/85 hover:bg-black p-1.5 rounded-full text-white shadow-md" aria-label="alterar avatar"><Camera size={12} /></button>
                            <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={(e) => readFile(e.target.files?.[0], (d) => setForm({ ...form, avatar: d }))} />
                        </div>

                        <div className="space-y-6 mt-6 max-w-2xl">
                            <div>
                                <label className="type-overline">Nome</label>
                                <input data-testid="settings-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-2 w-full bg-[#fafafa] border border-black/[0.08] rounded-2xl px-4 py-3.5 text-black focus:border-black/40 focus:bg-white focus:outline-none transition" />
                            </div>
                            <div>
                                <label className="type-overline">Bio</label>
                                <textarea data-testid="settings-bio" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={3} maxLength={160} placeholder="Conta-nos algo em poucas palavras…" className="mt-2 w-full bg-[#fafafa] border border-black/[0.08] rounded-2xl px-4 py-3.5 focus:border-black/40 focus:bg-white focus:outline-none transition resize-none" />
                                <div className="font-mono text-[10px] text-black/40 text-right mt-1 tracking-wider">{160 - (form.bio?.length || 0)} restantes</div>
                            </div>

                            <label className="flex items-center justify-between p-4 card-lux cursor-pointer transition hover:shadow-md" data-testid="privacy-toggle">
                                <div className="flex items-start gap-3">
                                    <div className="w-9 h-9 rounded-full grid place-items-center bg-black/[0.04] border border-black/[0.06]"><Lock size={15} className="text-black/70" /></div>
                                    <div>
                                        <div className="font-heading font-semibold text-[14px] tracking-tight text-black">Conta privada</div>
                                        <div className="font-mono text-[11px] text-black/50 mt-0.5">apenas seguidores aprovados podem ver as publicações</div>
                                    </div>
                                </div>
                                <input type="checkbox" checked={form.private} onChange={(e) => setForm({ ...form, private: e.target.checked })} className="w-5 h-5 accent-black" />
                            </label>

                            <div className="flex justify-between items-center pb-10 gap-3 hairline-t pt-6">
                                <button onClick={logout} data-testid="settings-logout" className="inline-flex items-center gap-2 px-4 py-3 text-[12px] font-mono uppercase tracking-[0.16em] text-black/55 hover:text-red-soft transition"><LogOut size={14} /> Terminar sessão</button>
                                <button onClick={save} disabled={busy} data-testid="settings-save-btn" className="btn-obsidian px-7 py-3 text-[12px] disabled:opacity-50">{busy ? "A guardar…" : "Guardar"}</button>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {tab === "ident" && (
                <div className="px-4 lg:px-6 py-5 space-y-6 max-w-2xl">
                    <div>
                        <p className="type-overline mb-1">Identidade portuguesa</p>
                        <p className="text-[12.5px] text-black/55 leading-relaxed">
                            Estes campos alimentam o <em>place graph</em>: o teu feed passa a refletir
                            também a tua geografia. Tudo opcional.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label className="type-overline">Cidade</label>
                            <input
                                data-testid="settings-city"
                                value={form.city}
                                onChange={(e) => setForm({ ...form, city: e.target.value })}
                                placeholder="Lisboa, Porto, Évora…"
                                className="mt-2 vm-input"
                            />
                        </div>
                        <div>
                            <label className="type-overline">Freguesia/Bairro</label>
                            <input
                                data-testid="settings-freguesia"
                                value={form.freguesia}
                                onChange={(e) => setForm({ ...form, freguesia: e.target.value })}
                                placeholder="Alvalade, Cedofeita…"
                                className="mt-2 vm-input"
                            />
                        </div>
                    </div>

                    <SettingsChipGroup
                        label="Região"
                        testid="settings-region"
                        options={PT_REGIONS}
                        value={form.region}
                        onChange={(v) => setForm({ ...form, region: v })}
                    />
                    <SettingsChipGroup
                        label="Mood inicial"
                        testid="settings-mood"
                        options={PT_MOODS}
                        value={form.mood_initial}
                        onChange={(v) => setForm({ ...form, mood_initial: v })}
                    />
                    <SettingsChipGroup
                        label="Time"
                        testid="settings-team"
                        options={PT_TEAMS}
                        value={form.team}
                        onChange={(v) => setForm({ ...form, team: v })}
                    />

                    <div className="pt-4 hairline-t">
                        <p className="type-overline mb-1">Bio · 6 slots</p>
                        <p className="text-[12.5px] text-black/55 leading-relaxed mb-3">
                            Em vez de uma bio livre, 6 campos curtos. Reduz a “página em branco” e
                            torna o perfil mais legível.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {BIO_SLOTS.map((slot) => (
                                <div key={slot.key}>
                                    <label className="type-overline">{slot.label}</label>
                                    <input
                                        data-testid={`settings-slot-${slot.key}`}
                                        value={form.bio_slots?.[slot.key] || ""}
                                        onChange={(e) =>
                                            setForm({
                                                ...form,
                                                bio_slots: { ...(form.bio_slots || {}), [slot.key]: e.target.value },
                                            })
                                        }
                                        maxLength={60}
                                        placeholder={slot.placeholder}
                                        className="mt-2 vm-input"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end pt-3">
                        <button
                            onClick={save}
                            disabled={busy}
                            data-testid="settings-ident-save"
                            className="btn-obsidian px-7 py-3 text-[12px] disabled:opacity-50"
                        >
                            {busy ? "A guardar…" : "Guardar identidade"}
                        </button>
                    </div>
                </div>
            )}

            {tab === "notif" && (
                <div className="px-4 lg:px-6 py-5 space-y-3 max-w-2xl">
                    <p className="type-overline">Modos saudáveis</p>
                    <label className="flex items-center justify-between p-4 card-lux cursor-pointer hover:shadow-md transition" data-testid="boa-noite-toggle">
                        <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-full grid place-items-center bg-black/[0.04] border border-black/[0.06] text-black/70">
                                <Moon size={15} />
                            </div>
                            <div>
                                <div className="font-heading font-semibold text-[14px] tracking-tight text-black">
                                    Modo Boa Noite
                                </div>
                                <div className="font-mono text-[11px] text-black/50 mt-0.5">
                                    Silencia notificações e suaviza UI entre as 23h00 e as 08h00. Ativo por defeito.
                                </div>
                            </div>
                        </div>
                        <input
                            type="checkbox"
                            checked={!!form.boa_noite_enabled}
                            onChange={(e) => setForm({ ...form, boa_noite_enabled: e.target.checked })}
                            className="w-5 h-5 accent-black"
                            data-testid="boa-noite-checkbox"
                        />
                    </label>
                    <label className="flex items-center justify-between p-4 card-lux cursor-pointer hover:shadow-md transition" data-testid="cafezinho-toggle">
                        <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-full grid place-items-center bg-black/[0.04] border border-black/[0.06] text-black/70">
                                <Sun size={15} />
                            </div>
                            <div>
                                <div className="font-heading font-semibold text-[14px] tracking-tight text-black">
                                    Cafezinho da manhã
                                </div>
                                <div className="font-mono text-[11px] text-black/50 mt-0.5">
                                    Sessão curta de 60s entre as 7h00 e as 9h00 com 3 cards. Sem scroll infinito de manhã.
                                </div>
                            </div>
                        </div>
                        <input
                            type="checkbox"
                            checked={!!form.cafezinho_enabled}
                            onChange={(e) => setForm({ ...form, cafezinho_enabled: e.target.checked })}
                            className="w-5 h-5 accent-black"
                            data-testid="cafezinho-checkbox"
                        />
                    </label>
                    <div className="flex justify-end pt-2">
                        <button
                            onClick={save}
                            disabled={busy}
                            data-testid="settings-modes-save"
                            className="btn-silver text-[12px] px-5 py-2.5 disabled:opacity-50"
                        >
                            {busy ? "A guardar…" : "Guardar modos"}
                        </button>
                    </div>

                    <div className="hairline-t pt-5">
                        <Link
                            to="/manifesto"
                            data-testid="settings-manifesto-link"
                            className="flex items-center gap-3 p-3.5 rounded-xl border border-black/[0.10] hover:border-black/30 transition group"
                        >
                            <div className="w-9 h-9 rounded-full bg-black/[0.04] grid place-items-center shrink-0 text-black">
                                <ScrollText size={15} strokeWidth={1.7} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="font-semibold text-[13.5px] tracking-tight text-black flex items-center gap-1">
                                    O nosso Manifesto
                                    <ChevronRight size={13} className="opacity-0 group-hover:opacity-60 -ml-0.5 transition" />
                                </div>
                                <p className="text-[11.5px] text-black/55 leading-snug mt-0.5">
                                    6 promessas anti-dark-pattern. O que não fazemos aqui.
                                </p>
                            </div>
                        </Link>
                    </div>

                    <p className="type-overline pt-3">Tipos de notificação</p>
                    <ToggleRow label="Gostos nas minhas publicações" sub="Quando alguém gosta de um post teu" k="notif_likes" prefs={prefs} setPref={setPref} />
                    <ToggleRow label="Comentários" sub="Respostas e fóruns" k="notif_comments" prefs={prefs} setPref={setPref} />
                    <ToggleRow label="Novos seguidores" k="notif_follows" prefs={prefs} setPref={setPref} />
                    <ToggleRow label="Menções" sub="Quando alguém te marca com @" k="notif_mentions" prefs={prefs} setPref={setPref} />
                    <ToggleRow label="Mensagens diretas" k="notif_dm" prefs={prefs} setPref={setPref} />
                </div>
            )}

            {tab === "priv" && (
                <div className="px-4 lg:px-6 py-5 space-y-3 max-w-2xl">
                    <p className="type-overline">Privacidade</p>
                    <ToggleRow label="Mostrar quando estou online" k="priv_show_online" prefs={prefs} setPref={setPref} />
                    <ToggleRow label="Mostrar indicador a escrever" k="priv_typing" prefs={prefs} setPref={setPref} />
                    <ToggleRow label="Aparecer em pesquisas" k="priv_search" prefs={prefs} setPref={setPref} />
                    <div className="hairline-t pt-5">
                        <p className="type-overline mb-3">Os teus dados</p>
                        <button onClick={downloadData} data-testid="download-data-btn" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-black/[0.04] hover:bg-black/[0.08] text-[13px] font-medium"><Download size={14} /> Descarregar os meus dados</button>
                        <button className="ml-2 inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-red-soft hover:bg-red-soft/10 text-[13px] font-medium" onClick={() => toast.info("Funcionalidade em breve")}><Trash2 size={14} /> Apagar conta</button>
                    </div>
                </div>
            )}

            {tab === "apar" && (
                <div className="px-4 lg:px-6 py-5 space-y-4 max-w-2xl">
                    <p className="type-overline">Tema</p>
                    <div className="grid grid-cols-3 gap-2">
                        {[{ k: "light", l: "Claro", e: "☀️" }, { k: "sepia", l: "Sépia", e: "📜" }, { k: "auto", l: "Sistema", e: "💻" }].map((t) => (
                            <button key={t.k} onClick={() => setPref("theme", t.k)} data-testid={`settings-theme-${t.k}`} className={`p-3 rounded-xl border text-center ${prefs.theme === t.k ? "border-black bg-black/[0.03]" : "border-black/[0.08] hover:bg-black/[0.02]"}`}>
                                <div className="text-2xl">{t.e}</div>
                                <div className="text-[12px] font-medium mt-1">{t.l}</div>
                            </button>
                        ))}
                    </div>
                    <p className="type-overline pt-3">Densidade</p>
                    <div className="grid grid-cols-2 gap-2">
                        {[{ k: "compact", l: "Compacta" }, { k: "comfortable", l: "Confortável" }].map((d) => (
                            <button key={d.k} onClick={() => setPref("density", d.k)} className={`p-2.5 rounded-xl border text-[12px] font-medium ${prefs.density === d.k ? "border-black bg-black/[0.03]" : "border-black/[0.08]"}`}>{d.l}</button>
                        ))}
                    </div>
                    <p className="type-overline pt-3">Idioma</p>
                    <div className="grid grid-cols-3 gap-2">
                        {[{ k: "pt-PT", l: "PT 🇵🇹" }, { k: "pt-BR", l: "PT-BR 🇧🇷" }, { k: "en", l: "EN 🇬🇧" }].map((l) => (
                            <button key={l.k} onClick={() => setPref("language", l.k)} data-testid={`settings-lang-${l.k}`} className={`p-2.5 rounded-xl border text-[12px] font-medium ${prefs.language === l.k ? "border-black bg-black/[0.03]" : "border-black/[0.08]"}`}>{l.l}</button>
                        ))}
                    </div>
                    <ToggleRow label="Reduzir animações" sub="Útil se sentires tonturas com movimentos" k="reduce_motion" prefs={prefs} setPref={setPref} />

                    <div className="pt-5 mt-3 border-t border-black/[0.06]">
                        <CosmeticsPicker />
                    </div>
                </div>
            )}

            {tab === "legal" && (
                <div className="px-4 lg:px-6 py-5 space-y-4 max-w-2xl">
                    <p className="type-overline">Documentos legais</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <LegalLinkRow to="/legal/terms" icon={FileText} title="Termos e Condições" desc="O contrato entre ti e o Vermillion." />
                        <LegalLinkRow to="/legal/privacy" icon={Shield} title="Política de Privacidade" desc="Como tratamos os teus dados (RGPD)." />
                        <LegalLinkRow to="/legal/cookies" icon={Cookie} title="Política de Cookies" desc="Cookies e tecnologias semelhantes." />
                        <LegalLinkRow to="/legal/community" icon={Sparkle} title="Diretrizes da Comunidade" desc="O que é permitido e o que não é." />
                    </div>

                    <div className="hairline-t pt-5">
                        <p className="type-overline mb-3">Consentimento</p>
                        <button
                            type="button"
                            onClick={openCookiePreferences}
                            data-testid="open-cookie-prefs"
                            className="w-full sm:w-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-black/[0.04] hover:bg-black/[0.08] text-[13px] font-medium"
                        >
                            <Cookie size={14} /> Centro de Preferências de Cookies
                        </button>
                        <p className="text-[11px] text-black/55 mt-2 leading-relaxed">
                            Altera as tuas escolhas de cookies funcionais, analíticos e de marketing a qualquer momento.
                        </p>
                    </div>

                    <div className="hairline-t pt-5">
                        <p className="type-overline mb-3">Os teus direitos (RGPD)</p>
                        <p className="text-[13px] text-black/70 leading-relaxed">
                            Tens direito de acesso, retificação, apagamento, portabilidade, limitação e oposição ao
                            tratamento dos teus dados. Para os exercer, contacta o nosso Encarregado de Proteção de
                            Dados (DPO):
                        </p>
                        <a
                            href="mailto:dpo@vermillion.pt"
                            className="inline-flex items-center gap-2 mt-3 px-4 py-2.5 rounded-full bg-black/[0.04] hover:bg-black/[0.08] text-[13px] font-medium"
                        >
                            dpo@vermillion.pt
                        </a>
                        <p className="text-[11px] text-black/50 mt-3 leading-relaxed">
                            Podes ainda apresentar reclamação à Comissão Nacional de Proteção de Dados (CNPD) em{" "}
                            <a
                                href="https://www.cnpd.pt"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="underline underline-offset-2 hover:text-black"
                            >
                                www.cnpd.pt
                            </a>.
                        </p>
                    </div>

                    <div className="hairline-t pt-5 text-[11px] text-black/45 leading-relaxed">
                        <p>
                            Vermillion © {new Date().getFullYear()}. Operado por{" "}
                            <span className="font-mono bg-black/[0.04] px-1.5 py-0.5 rounded">[Vermillion, Lda.]</span>,
                            NIPC <span className="font-mono bg-black/[0.04] px-1.5 py-0.5 rounded">[a indicar]</span>.
                            Sujeito à lei portuguesa e à União Europeia.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

function LegalLinkRow({ to, icon: Icon, title, desc }) {
    return (
        <Link
            to={to}
            className="group flex items-start gap-3 p-3.5 rounded-xl border border-black/[0.08] hover:border-black/25 hover:bg-black/[0.02] transition"
        >
            <div className="w-9 h-9 rounded-full bg-black/[0.04] grid place-items-center shrink-0 text-black">
                <Icon size={15} strokeWidth={1.7} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="font-semibold text-[13.5px] tracking-tight text-black flex items-center gap-1">
                    {title}
                    <ChevronRight size={13} className="opacity-0 group-hover:opacity-60 -ml-0.5 transition" />
                </div>
                <p className="text-[11.5px] text-black/55 leading-snug mt-0.5">{desc}</p>
            </div>
        </Link>
    );
}

function ToggleRow({ label, sub, k, prefs, setPref }) {
    return (
        <label className="flex items-center justify-between p-4 card-lux cursor-pointer hover:shadow-md transition">
            <div>
                <div className="font-heading font-semibold text-[14px] tracking-tight text-black">{label}</div>
                {sub && <div className="font-mono text-[11px] text-black/50 mt-0.5">{sub}</div>}
            </div>
            <input type="checkbox" checked={!!prefs[k]} onChange={(e) => setPref(k, e.target.checked)} className="w-5 h-5 accent-black" data-testid={`pref-${k}`} />
        </label>
    );
}

function SettingsChipGroup({ label, options, value, onChange, testid }) {
    return (
        <div>
            <p className="type-overline mb-2">{label}</p>
            <div className="flex flex-wrap gap-1.5" data-testid={testid}>
                {options.map((opt) => {
                    const active = value === opt.key;
                    return (
                        <button
                            key={opt.key}
                            type="button"
                            onClick={() => onChange(active ? "" : opt.key)}
                            data-testid={`${testid}-${opt.key}`}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12.5px] tracking-tight border transition tap-shrink ${
                                active
                                    ? "chip-on border-transparent !text-white font-semibold"
                                    : "border-black/[0.10] hover:border-black/30 hover:bg-black/[0.03] text-black/75"
                            }`}
                        >
                            <span aria-hidden>{opt.emoji}</span>
                            {opt.label}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
