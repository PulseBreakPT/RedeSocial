import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
    Camera, Lock, User as UserIcon, Bell, Shield, Trash2,
    Download, FileText, Cookie, Sparkle, ChevronRight, Moon, Sun,
    ScrollText, Sliders, LayoutDashboard, Database,
    Search, Check, X, Clock,
} from "lucide-react";
import { api, toastApiError } from "../lib/api";
import { Avatar } from "../components/Avatar";
import { PageHeader } from "../components/PageHeader";
import { useAuth } from "../context/AuthContext";
import { lsGet, lsSet } from "../lib/portuguese";
import { openCookiePreferences } from "../components/CookieBanner";
import { isNotifSoundEnabled, setNotifSoundEnabled, playNotifSound } from "../lib/sound";
import { isHapticsEnabled, setHapticsEnabled, haptic } from "../lib/haptics";
import { toast } from "sonner";

import { HubTab } from "./settings/HubTab";
import { SecurityTab } from "./settings/SecurityTab";
import { DataTab } from "./settings/DataTab";

/* ============================================================
   GROUPS — 5 categorias limpas, sem aparência/atalhos/calibração.
   Cada grupo é uma vertical clara no super-grid responsivo.
   ============================================================ */
const GROUPS = [
    {
        key: "hub",
        label: "Visão geral",
        icon: LayoutDashboard,
        desc: "Resumo da tua conta, completude e atalhos para áreas importantes.",
        keywords: ["resumo", "overview", "saúde", "completude", "stats", "score", "hub"],
        sections: [{ key: "hub", label: null }],
    },
    {
        key: "perfil",
        label: "Perfil",
        icon: UserIcon,
        desc: "Nome, bio, avatar, capa, conta privada e cidade.",
        keywords: [
            "nome", "bio", "avatar", "capa", "banner", "privada", "perfil",
            "cidade", "identidade",
        ],
        sections: [
            { key: "conta", label: null },
        ],
    },
    {
        key: "notif",
        label: "Notificações",
        icon: Bell,
        desc: "Modos saudáveis, tipos de notificação, som e vibração.",
        keywords: [
            "gostos", "comentários", "menções", "boa noite", "cafezinho", "modos", "notificações",
            "som", "vibração",
        ],
        sections: [
            { key: "notif", label: null },
        ],
    },
    {
        key: "priv-seg",
        label: "Privacidade & Segurança",
        icon: Shield,
        desc: "Quem te vê, palavra-passe, sessões e alertas de login.",
        keywords: [
            "online", "escrever", "pesquisa", "dados", "rgpd", "privacidade",
            "palavra-passe", "password", "2fa", "sessões", "login", "alertas", "segurança",
        ],
        sections: [
            { key: "priv", label: "Privacidade" },
            { key: "seg", label: "Segurança" },
        ],
    },
    {
        key: "dados-legal",
        label: "Dados & Legal",
        icon: Database,
        desc: "Exportar dados, apagar conta, termos, privacidade e DPO.",
        keywords: [
            "armazenamento", "exportar", "json", "csv", "cache", "apagar conta", "dados",
            "termos", "privacidade", "cookies", "comunidade", "dpo", "legal",
        ],
        sections: [
            { key: "dados", label: "Dados pessoais" },
            { key: "legal", label: "Centro legal" },
        ],
    },
];

/* Back-compat: a flat lookup of legacy sub-tab keys → group key,
   so any deep-link or hash anchor that referenced an old tab still works. */
const LEGACY_TAB_TO_GROUP = (() => {
    const m = {};
    GROUPS.forEach((g) => g.sections.forEach((s) => { m[s.key] = g.key; }));
    // soft redirects for tabs that no longer exist
    m.ident = "perfil";
    m.foryou = "notif";
    m.apar = "perfil";
    m.atalhos = "perfil";
    m.aparencia = "perfil";
    m.conteudo = "notif";
    return m;
})();

export default function Settings() {
    const { user, setUser, logout } = useAuth();
    void logout; // kept for back-compat callers — sign-out lives in the avatar dropdown
    const [tab, setTab] = useState("hub"); // now holds a GROUP key (legacy state name preserved)
    const [search, setSearch] = useState("");
    const searchRef = useRef(null);

    const [form, setForm] = useState({
        name: user?.name || "",
        bio: user?.bio || "",
        avatar: user?.avatar || "",
        banner: user?.banner || "",
        private: !!user?.private,
        city: user?.city || "",
        boa_noite_enabled: user?.boa_noite_enabled !== false,
        cafezinho_enabled: !!user?.cafezinho_enabled,
    });
    const [initialForm, setInitialForm] = useState(() => ({ ...form }));
    const [busy, setBusy] = useState(false);

    /* Server-persisted prefs — hydrated from user object, fallback to localStorage for legacy values.
       Saves are debounced and pushed to PATCH /users/me so prefs sync cross-device. */
    const initialPrefs = useMemo(() => {
        const np = user?.notif_preferences || {};
        return {
            notif_likes:        typeof np.likes === "boolean"    ? np.likes    : lsGet("pref.notif_likes", true),
            notif_comments:     typeof np.comments === "boolean" ? np.comments : lsGet("pref.notif_comments", true),
            notif_follows:      typeof np.follows === "boolean"  ? np.follows  : lsGet("pref.notif_follows", true),
            notif_mentions:     typeof np.mentions === "boolean" ? np.mentions : lsGet("pref.notif_mentions", true),
            notif_dm:           typeof np.dm === "boolean"       ? np.dm       : lsGet("pref.notif_dm", true),
            priv_show_online:   typeof user?.show_online === "boolean"       ? user.show_online       : lsGet("pref.priv_show_online", true),
            priv_typing:        typeof user?.typing_indicator === "boolean"  ? user.typing_indicator  : lsGet("pref.priv_typing", true),
            priv_search:        typeof user?.searchable === "boolean"        ? user.searchable        : lsGet("pref.priv_search", true),
            theme:              user?.theme       || lsGet("pref.theme", "light"),
            density:            user?.density     || lsGet("pref.density", "comfortable"),
            language:           user?.language    || lsGet("pref.language", "pt-PT"),
            reduce_motion:      typeof user?.reduce_motion === "boolean" ? user.reduce_motion : lsGet("pref.reduce_motion", false),
            boa_noite_start:    user?.boa_noite_start || lsGet("pref.boa_noite_start", "23:00"),
            boa_noite_end:      user?.boa_noite_end   || lsGet("pref.boa_noite_end", "08:00"),
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id]);
    const [prefs, setPrefs] = useState(initialPrefs);
    useEffect(() => { setPrefs(initialPrefs); }, [initialPrefs]);

    // Mapping frontend → backend payload for /users/me
    const PREF_TO_PAYLOAD = {
        notif_likes:     (v, p) => ({ notif_preferences: { ...(p._notif_pref_base || {}), likes: v } }),
        notif_comments:  (v, p) => ({ notif_preferences: { ...(p._notif_pref_base || {}), comments: v } }),
        notif_follows:   (v, p) => ({ notif_preferences: { ...(p._notif_pref_base || {}), follows: v } }),
        notif_mentions:  (v, p) => ({ notif_preferences: { ...(p._notif_pref_base || {}), mentions: v } }),
        notif_dm:        (v, p) => ({ notif_preferences: { ...(p._notif_pref_base || {}), dm: v } }),
        priv_show_online: (v) => ({ show_online: v }),
        priv_typing:      (v) => ({ typing_indicator: v }),
        priv_search:      (v) => ({ searchable: v }),
        theme:            (v) => ({ theme: v }),
        density:          (v) => ({ density: v }),
        language:         (v) => ({ language: v }),
        reduce_motion:    (v) => ({ reduce_motion: v }),
        boa_noite_start:  (v) => ({ boa_noite_start: v }),
        boa_noite_end:    (v) => ({ boa_noite_end: v }),
    };
    const saveTimerRef = useRef(null);
    const pendingPatchRef = useRef({});
    const flushPrefSave = async () => {
        const payload = { ...pendingPatchRef.current };
        pendingPatchRef.current = {};
        if (!Object.keys(payload).length) return;
        try {
            const { data } = await api.patch("/users/me", payload);
            setUser({ ...user, ...data });
        } catch (e) {
            toastApiError(e, "Não foi possível guardar preferências");
        }
    };
    const setPref = (k, v) => {
        setPrefs((p) => ({ ...p, [k]: v }));
        // keep localStorage warm for offline/legacy reads
        lsSet(`pref.${k}`, v);
        // Build payload increment
        const mapper = PREF_TO_PAYLOAD[k];
        if (!mapper) return;
        const currentNp = user?.notif_preferences || {
            likes: prefs.notif_likes, comments: prefs.notif_comments,
            follows: prefs.notif_follows, mentions: prefs.notif_mentions, dm: prefs.notif_dm,
        };
        const inc = mapper(v, { _notif_pref_base: { ...currentNp, ...(pendingPatchRef.current.notif_preferences || {}) } });
        // Merge into pending patch (notif_preferences merges field-by-field)
        if (inc.notif_preferences) {
            pendingPatchRef.current.notif_preferences = {
                ...(pendingPatchRef.current.notif_preferences || {}),
                ...inc.notif_preferences,
            };
        } else {
            Object.assign(pendingPatchRef.current, inc);
        }
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(flushPrefSave, 350);
    };

    const avatarRef = useRef(null);
    const bannerRef = useRef(null);

    /* Local stats — pulled from /users/me/stats if available */
    const [stats, setStats] = useState({ posts_count: 0 });
    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const { data } = await api.get(`/users/${user?.username}/stats`);
                if (!cancelled && data) setStats((s) => ({ ...s, ...data }));
            } catch { /* silent */ }
        })();
        return () => { cancelled = true; };
    }, [user?.username]);

    /* Dirty tracking */
    const isDirty = useMemo(() => {
        const keys = ["name", "bio", "avatar", "banner", "private", "city", "boa_noite_enabled", "cafezinho_enabled"];
        return keys.some((k) => form[k] !== initialForm[k]);
    }, [form, initialForm]);

    const readFile = (file, cb) => {
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) return toast.error("Imagem não pode exceder 2MB");
        const reader = new FileReader();
        reader.onload = (ev) => cb(ev.target.result);
        reader.readAsDataURL(file);
    };

    const save = async () => {
        setBusy(true);
        try {
            const { data } = await api.patch("/users/me", form);
            setUser({ ...user, ...data });
            setInitialForm({ ...form });
            toast.success("Perfil atualizado");
        }
        catch (e) { toastApiError(e); }
        finally { setBusy(false); }
    };

    const discard = () => {
        setForm({ ...initialForm });
        toast.info("Alterações descartadas");
    };

    /* Filter groups by search query (label OR aggregated keywords from sub-sections) */
    const filteredTabs = useMemo(() => {
        if (!search.trim()) return GROUPS;
        const q = search.toLowerCase().trim();
        return GROUPS.filter((g) =>
            g.label.toLowerCase().includes(q) ||
            (g.keywords || []).some((k) => k.toLowerCase().includes(q)) ||
            (g.sections || []).some((s) => (s.label || "").toLowerCase().includes(q))
        );
    }, [search]);

    /* Keyboard shortcut "/" focuses search */
    useEffect(() => {
        const onKey = (e) => {
            if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
                e.preventDefault();
                searchRef.current?.focus();
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, []);

    /* Auto-select first match when searching */
    useEffect(() => {
        if (search.trim() && filteredTabs.length > 0 && !filteredTabs.find((t) => t.key === tab)) {
            setTab(filteredTabs[0].key);
        }
    }, [search, filteredTabs, tab]);

    /* Back-compat: if some external link sets a legacy sub-tab key, redirect to its group */
    useEffect(() => {
        if (LEGACY_TAB_TO_GROUP[tab] && LEGACY_TAB_TO_GROUP[tab] !== tab) {
            setTab(LEGACY_TAB_TO_GROUP[tab]);
        }
    }, [tab]);

    const activeGroup = GROUPS.find((g) => g.key === tab) || GROUPS[0];

    return (
        <div data-testid="settings-page" className="pb-32">
            <PageHeader title="Definições" subtitle="Conta, segurança, dados e mais" back testid="settings-header">
                {/* Mobile-only chip tabs (vertical sidebar replaces this on desktop) */}
                <div className="lg:hidden px-3 pb-2 flex gap-1 overflow-x-auto scrollbar-hide hairline-t pt-2">
                    {filteredTabs.map((t) => {
                        const Icon = t.icon;
                        const active = tab === t.key;
                        return (
                            <button
                                key={t.key}
                                onClick={() => setTab(t.key)}
                                data-testid={`settings-tab-${t.key}`}
                                className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium border-b-2 transition ${
                                    active ? "tab-grad-on" : "border-transparent text-black hover:text-black"
                                }`}
                            >
                                <Icon size={13} /> {t.label}
                            </button>
                        );
                    })}
                </div>
            </PageHeader>

            <div className="lg:grid lg:grid-cols-[300px_1fr] lg:gap-0">
                {/* Desktop vertical sidebar */}
                <aside className="hidden lg:flex flex-col border-r border-black/[0.06] min-h-[calc(100vh-80px)] sticky top-0 self-start py-5 px-3">
                    {/* Search */}
                    <div className="px-2 mb-4">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40 pointer-events-none" strokeWidth={1.8} />
                            <input
                                ref={searchRef}
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Pesquisar definições…"
                                data-testid="settings-search"
                                className="w-full pl-9 pr-9 py-2 bg-black/[0.04] hover:bg-black/[0.05] focus:bg-white focus:border-black/30 rounded-xl border border-transparent text-[13px] outline-none transition"
                            />
                            {search ? (
                                <button
                                    onClick={() => { setSearch(""); searchRef.current?.focus(); }}
                                    data-testid="settings-search-clear"
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-black/40 hover:text-black/80 p-1"
                                    aria-label="Limpar pesquisa"
                                >
                                    <X size={13} />
                                </button>
                            ) : (
                                <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden sm:inline-flex items-center justify-center h-5 px-1.5 rounded bg-white border border-black/[0.10] text-[10px] font-mono text-black/50">/</kbd>
                            )}
                        </div>
                    </div>

                    <nav className="flex flex-col gap-1 px-1">
                        {filteredTabs.map((t) => {
                            const Icon = t.icon;
                            const active = tab === t.key;
                            return (
                                <button
                                    key={t.key}
                                    onClick={() => setTab(t.key)}
                                    data-testid={`settings-side-${t.key}`}
                                    className={`relative w-full flex items-start gap-3 px-3 py-2.5 rounded-xl text-left transition tap-shrink ${
                                        active ? "bg-black/[0.05] text-black" : "text-black/65 hover:bg-black/[0.03] hover:text-black"
                                    }`}
                                >
                                    {active && (
                                        <span aria-hidden className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-7 rounded-r-full bg-black" />
                                    )}
                                    <div className={`w-8 h-8 rounded-lg grid place-items-center shrink-0 mt-0.5 ${active ? "bg-black text-white" : "bg-black/[0.04] text-black/65"}`}>
                                        <Icon size={14} strokeWidth={active ? 2 : 1.7} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className={`text-[13.5px] tracking-tight ${active ? "font-semibold" : "font-medium"}`}>{t.label}</div>
                                        {t.desc && (
                                            <div className="text-[11px] text-black/45 leading-snug mt-0.5 line-clamp-2">{t.desc}</div>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                        {filteredTabs.length === 0 && (
                            <div className="px-3 py-6 text-center text-[12.5px] text-black/45">
                                Sem resultados para “{search}”.
                            </div>
                        )}
                    </nav>
                </aside>

                {/* Main content area — renders all sections of the active group, stacked */}
                <main className="min-w-0">
                    {/* Page header — título + descrição do grupo activo (desktop only) */}
                    <div className="hidden lg:block px-4 lg:px-8 pt-6 pb-3 border-b border-black/[0.06]">
                        <div className="flex items-end justify-between gap-4 flex-wrap max-w-6xl">
                            <div className="min-w-0">
                                <p className="type-overline mb-0">Definições</p>
                                <h1 className="font-display text-[26px] lg:text-[30px] font-bold tracking-tight text-black leading-tight mt-1">
                                    {activeGroup.label}
                                </h1>
                                {activeGroup.desc && (
                                    <p className="text-[13px] text-black/55 leading-relaxed mt-1.5 max-w-2xl">{activeGroup.desc}</p>
                                )}
                            </div>
                            {isDirty && (
                                <div className="flex items-center gap-2">
                                    <span className="text-[10.5px] font-mono tracking-wider uppercase text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                                        alterações por guardar
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {activeGroup.sections.length > 1 && (
                        <div className="px-4 lg:px-6 pt-5 pb-1 flex items-center gap-2 flex-wrap">
                            <span className="text-[10.5px] uppercase tracking-[0.16em] font-mono text-black/40">
                                Nesta secção
                            </span>
                            {activeGroup.sections.map((s) => (
                                <a
                                    key={s.key}
                                    href={`#sec-${s.key}`}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        document.getElementById(`sec-${s.key}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
                                    }}
                                    data-testid={`settings-jump-${s.key}`}
                                    className="text-[12px] font-medium px-2.5 py-1 rounded-full bg-black/[0.04] hover:bg-black/[0.08] text-black/70 hover:text-black transition"
                                >
                                    {s.label}
                                </a>
                            ))}
                        </div>
                    )}

                    {activeGroup.sections.map((sec, idx) => (
                        <section
                            key={sec.key}
                            id={`sec-${sec.key}`}
                            data-testid={`settings-section-${sec.key}`}
                            className={idx > 0 ? "mt-6 pt-6 border-t border-black/[0.06]" : ""}
                        >
                            {sec.label && idx > 0 && (
                                <div className="px-4 lg:px-6 mb-1">
                                    <h2 className="font-heading text-[18px] tracking-tight text-black">
                                        {sec.label}
                                    </h2>
                                </div>
                            )}

                            {sec.key === "hub" && (
                                <HubTab user={user} form={form} prefs={prefs} stats={stats} setActiveTab={setTab} />
                            )}
                            {sec.key === "conta" && (
                                <ContaTab
                                    user={user} form={form} setForm={setForm}
                                    avatarRef={avatarRef} bannerRef={bannerRef} readFile={readFile}
                                    save={save} busy={busy}
                                />
                            )}
                            {sec.key === "notif" && (
                                <NotifTab form={form} setForm={setForm} prefs={prefs} setPref={setPref} save={save} busy={busy} />
                            )}
                            {sec.key === "priv" && (
                                <PrivTab prefs={prefs} setPref={setPref} user={user} />
                            )}
                            {sec.key === "seg" && (
                                <SecurityTab prefs={prefs} setPref={setPref} />
                            )}
                            {sec.key === "dados" && (
                                <DataTab user={user} prefs={prefs} />
                            )}
                            {sec.key === "legal" && (
                                <LegalTab />
                            )}
                        </section>
                    ))}
                </main>
            </div>

            {/* Floating unsaved-changes bar */}
            {isDirty && (
                <div
                    className="fixed left-1/2 -translate-x-1/2 bottom-6 lg:bottom-5 z-40 anim-slide-up"
                    data-testid="unsaved-bar"
                >
                    <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-black text-white shadow-[0_20px_50px_-10px_rgba(13,13,16,0.45)] border border-white/10 backdrop-blur">
                        <div className="w-7 h-7 rounded-full bg-white/10 grid place-items-center text-amber-300">
                            <Check size={13} strokeWidth={2.2} />
                        </div>
                        <span className="text-[13px] tracking-tight">Alterações por guardar</span>
                        <div className="flex items-center gap-1.5 ml-2">
                            <button
                                onClick={discard}
                                data-testid="unsaved-discard"
                                className="px-3 py-1.5 rounded-full text-[12px] font-medium text-white/70 hover:text-white hover:bg-white/10 transition tap-shrink"
                            >
                                Descartar
                            </button>
                            <button
                                onClick={save}
                                disabled={busy}
                                data-testid="unsaved-save"
                                className="px-4 py-1.5 rounded-full text-[12px] font-semibold bg-white text-black hover:bg-white/90 disabled:opacity-50 transition tap-shrink"
                            >
                                {busy ? "A guardar…" : "Guardar"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/* =================== Conta tab — Super grid responsivo ====================
   Layout 12-col em desktop com cards bem hierarquizados:
   · Capa + Avatar (full-width, sobreposto)
   · Coluna grande (Nome + Bio)
   · Coluna estreita (Cidade)
   · Linha de toggle: Conta privada
   · Footer: apenas botão Guardar (sair vive no menu da avatar)
==================================================================== */
function ContaTab({ user, form, setForm, avatarRef, bannerRef, readFile, save, busy }) {
    return (
        <>
            <div className="relative h-32 lg:h-44 overflow-hidden">
                <div className="absolute inset-0 silver-grad" />
                <div className="absolute inset-0 opacity-50 mix-blend-multiply" style={{ background: "radial-gradient(circle at 25% 35%, rgba(13,13,16,0.10), transparent 55%), radial-gradient(circle at 80% 70%, rgba(13,13,16,0.06), transparent 55%)" }} />
                {form.banner && <img src={form.banner} alt="" className="relative w-full h-full object-cover" />}
                <button
                    onClick={() => bannerRef.current?.click()}
                    data-testid="banner-upload-btn"
                    className="absolute bottom-3 right-3 bg-black/80 hover:bg-black p-2.5 rounded-full text-white shadow-lg"
                    aria-label="alterar capa"
                >
                    <Camera size={15} />
                </button>
                <input ref={bannerRef} type="file" accept="image/*" className="hidden" onChange={(e) => readFile(e.target.files?.[0], (d) => setForm({ ...form, banner: d }))} />
            </div>

            <div className="px-4 lg:px-6 -mt-10 lg:-mt-12 relative">
                <div className="relative inline-block rounded-full p-1 bg-white shadow-[0_8px_24px_-12px_rgba(13,13,16,0.25)]">
                    <Avatar user={{ ...user, avatar: form.avatar }} size={84} />
                    <button
                        onClick={() => avatarRef.current?.click()}
                        data-testid="avatar-upload-btn"
                        className="absolute bottom-1 right-1 bg-black/85 hover:bg-black p-1.5 rounded-full text-white shadow-md"
                        aria-label="alterar avatar"
                    >
                        <Camera size={12} />
                    </button>
                    <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={(e) => readFile(e.target.files?.[0], (d) => setForm({ ...form, avatar: d }))} />
                </div>

                {/* Super-grid: 12 cols (mobile single col, tablet/desktop 12-col) */}
                <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-4 max-w-4xl">
                    {/* Nome — 7 cols */}
                    <div className="lg:col-span-7 card-lux p-4">
                        <label className="type-overline">Nome</label>
                        <input
                            data-testid="settings-name"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            placeholder="Como te chamas?"
                            className="mt-2 vm-input"
                        />
                        <p className="font-mono text-[10.5px] text-black/40 mt-1.5">Visível no teu perfil e nos teus posts.</p>
                    </div>

                    {/* Cidade — 5 cols */}
                    <div className="lg:col-span-5 card-lux p-4">
                        <label className="type-overline">Cidade</label>
                        <input
                            data-testid="settings-city"
                            value={form.city}
                            onChange={(e) => setForm({ ...form, city: e.target.value })}
                            placeholder="Lisboa, Porto, Évora…"
                            className="mt-2 vm-input"
                        />
                        <p className="font-mono text-[10.5px] text-black/40 mt-1.5">Opcional · ajuda a descobrir pessoas perto de ti.</p>
                    </div>

                    {/* Bio — 12 cols, full width */}
                    <div className="lg:col-span-12 card-lux p-4">
                        <div className="flex items-center justify-between">
                            <label className="type-overline">Bio</label>
                            <span className="font-mono text-[10px] text-black/40 tracking-wider">{160 - (form.bio?.length || 0)} restantes</span>
                        </div>
                        <textarea
                            data-testid="settings-bio"
                            value={form.bio}
                            onChange={(e) => setForm({ ...form, bio: e.target.value })}
                            rows={3} maxLength={160}
                            placeholder="Conta-nos algo em poucas palavras…"
                            className="mt-2 w-full bg-[#fafafa] border border-black/[0.08] rounded-2xl px-4 py-3.5 focus:border-black/40 focus:bg-white focus:outline-none transition resize-none"
                        />
                    </div>

                    {/* Conta privada — 12 cols */}
                    <label className="lg:col-span-12 flex items-center justify-between p-4 card-lux cursor-pointer transition hover:shadow-md" data-testid="privacy-toggle">
                        <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-full grid place-items-center bg-black/[0.04] border border-black/[0.06]">
                                <Lock size={15} className="text-black/70" />
                            </div>
                            <div>
                                <div className="font-heading font-semibold text-[14px] tracking-tight text-black">Conta privada</div>
                                <div className="font-mono text-[11px] text-black/50 mt-0.5">apenas seguidores aprovados podem ver as publicações</div>
                            </div>
                        </div>
                        <input type="checkbox" checked={form.private} onChange={(e) => setForm({ ...form, private: e.target.checked })} className="w-5 h-5 accent-black" />
                    </label>
                </div>

                {/* Save row — terminar sessão removido (vive no menu da avatar) */}
                <div className="max-w-4xl flex justify-end items-center pb-10 gap-3 hairline-t pt-6 mt-6">
                    <button onClick={save} disabled={busy} data-testid="settings-save-btn" className="btn-obsidian px-7 py-3 text-[12px] disabled:opacity-50">{busy ? "A guardar…" : "Guardar"}</button>
                </div>
            </div>
        </>
    );
}

/* =================== Notificações tab — SUPER GRID 12-col ==================
   Organização lógica de cima para baixo:
   · Modos saudáveis (Boa Noite + Cafezinho) — pares 7/5
   · Manifesto link — 12
   · Tipos de notificação — grid 4/4/4
   · Som & vibração — pares 6/6
   ========================================================================= */
function NotifTab({ form, setForm, prefs, setPref, save, busy }) {
    return (
        <div className="px-4 lg:px-8 py-5 lg:py-7" data-testid="settings-notif">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-4 max-w-6xl">

                {/* SECTION HEADER */}
                <SectionHeader
                    overline="Modos saudáveis"
                    title="Cuida do teu tempo"
                    desc="Define janelas em que a app fica em silêncio ou só te dá uma dose curta de manhã."
                />

                {/* Boa Noite — 7 col */}
                <div className="lg:col-span-7 card-lux p-4 sm:p-5" data-testid="boa-noite-toggle">
                    <label className="flex items-start justify-between cursor-pointer gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-xl grid place-items-center bg-indigo-50 text-indigo-700 shrink-0">
                                <Moon size={16} strokeWidth={1.7} />
                            </div>
                            <div className="min-w-0">
                                <div className="font-heading font-semibold text-[14.5px] tracking-tight text-black">Modo Boa Noite</div>
                                <div className="text-[12px] text-black/55 leading-snug mt-0.5">Silencia notificações e suaviza a UI nas horas que escolheres.</div>
                            </div>
                        </div>
                        <input
                            type="checkbox"
                            checked={!!form.boa_noite_enabled}
                            onChange={(e) => setForm({ ...form, boa_noite_enabled: e.target.checked })}
                            className="w-5 h-5 accent-black mt-0.5 shrink-0"
                            data-testid="boa-noite-checkbox"
                        />
                    </label>
                    {form.boa_noite_enabled && (
                        <div className="mt-4 pt-4 hairline-t grid grid-cols-2 gap-3">
                            <div>
                                <label className="type-overline flex items-center gap-1.5"><Clock size={10} /> Início</label>
                                <input
                                    type="time"
                                    value={prefs.boa_noite_start || "23:00"}
                                    onChange={(e) => setPref("boa_noite_start", e.target.value)}
                                    data-testid="boa-noite-start"
                                    className="mt-1.5 vm-input tabular-nums"
                                />
                            </div>
                            <div>
                                <label className="type-overline flex items-center gap-1.5"><Clock size={10} /> Fim</label>
                                <input
                                    type="time"
                                    value={prefs.boa_noite_end || "08:00"}
                                    onChange={(e) => setPref("boa_noite_end", e.target.value)}
                                    data-testid="boa-noite-end"
                                    className="mt-1.5 vm-input tabular-nums"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Cafezinho — 5 col */}
                <label className="lg:col-span-5 card-lux p-4 sm:p-5 cursor-pointer hover:shadow-md transition flex items-start justify-between gap-3" data-testid="cafezinho-toggle">
                    <div className="flex items-start gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl grid place-items-center bg-amber-50 text-amber-700 shrink-0">
                            <Sun size={16} strokeWidth={1.7} />
                        </div>
                        <div className="min-w-0">
                            <div className="font-heading font-semibold text-[14.5px] tracking-tight text-black">Cafezinho da manhã</div>
                            <div className="text-[12px] text-black/55 leading-snug mt-0.5">Sessão curta de 60s entre as 7h00 e as 9h00 — 3 cards e fica. Sem scroll infinito.</div>
                        </div>
                    </div>
                    <input
                        type="checkbox"
                        checked={!!form.cafezinho_enabled}
                        onChange={(e) => setForm({ ...form, cafezinho_enabled: e.target.checked })}
                        className="w-5 h-5 accent-black mt-0.5 shrink-0"
                        data-testid="cafezinho-checkbox"
                    />
                </label>

                {/* Save modos */}
                <div className="lg:col-span-12 flex justify-end -mt-1">
                    <button onClick={save} disabled={busy} data-testid="settings-modes-save" className="btn-silver text-[12px] px-5 py-2.5 disabled:opacity-50">
                        {busy ? "A guardar…" : "Guardar modos"}
                    </button>
                </div>

                {/* Manifesto — 12 col */}
                <Link
                    to="/manifesto"
                    data-testid="settings-manifesto-link"
                    className="lg:col-span-12 flex items-center gap-3 p-4 rounded-2xl border border-black/[0.08] bg-gradient-to-br from-white to-black/[0.02] hover:border-black/30 transition group"
                >
                    <div className="w-10 h-10 rounded-xl bg-black text-white grid place-items-center shrink-0"><ScrollText size={16} strokeWidth={1.7} /></div>
                    <div className="flex-1 min-w-0">
                        <div className="font-heading font-semibold text-[14px] tracking-tight text-black flex items-center gap-1">
                            O nosso Manifesto
                            <ChevronRight size={14} className="opacity-0 group-hover:opacity-60 -ml-0.5 transition" />
                        </div>
                        <p className="text-[12px] text-black/55 leading-snug mt-0.5">6 promessas anti-dark-pattern. O que não fazemos aqui.</p>
                    </div>
                </Link>

                {/* TIPOS — divider */}
                <SectionHeader
                    overline="Tipos de notificação"
                    title="O que te deve interromper"
                    desc="Liga e desliga categoria a categoria. Aplica-se a push, e-mail e badge."
                />

                <div className="lg:col-span-6"><ToggleRow label="Gostos nas minhas publicações" sub="Quando alguém gosta de um post teu" k="notif_likes" prefs={prefs} setPref={setPref} /></div>
                <div className="lg:col-span-6"><ToggleRow label="Comentários" sub="Respostas e fóruns" k="notif_comments" prefs={prefs} setPref={setPref} /></div>
                <div className="lg:col-span-6"><ToggleRow label="Novos seguidores" sub="Quando alguém te começa a seguir" k="notif_follows" prefs={prefs} setPref={setPref} /></div>
                <div className="lg:col-span-6"><ToggleRow label="Menções" sub="Quando alguém te marca com @" k="notif_mentions" prefs={prefs} setPref={setPref} /></div>
                <div className="lg:col-span-12"><ToggleRow label="Mensagens diretas" sub="Push para conversas privadas" k="notif_dm" prefs={prefs} setPref={setPref} /></div>

                {/* SOM & VIBRAÇÃO — divider */}
                <SectionHeader
                    overline="Som & vibração"
                    title="Como te chega"
                    desc="Pequenos sinais ao chegar uma notificação. Tudo opcional."
                />

                <div className="lg:col-span-6"><NotifSoundCard /></div>
                <div className="lg:col-span-6"><HapticsCard /></div>
            </div>
        </div>
    );
}

/* Section header — overline + lede, ocupa sempre 12 col */
function SectionHeader({ overline, title, desc, action }) {
    return (
        <div className="lg:col-span-12 flex items-end justify-between gap-4 flex-wrap mt-2">
            <div className="min-w-0">
                <p className="type-overline mb-0">{overline}</p>
                <h3 className="font-heading font-bold text-[17px] lg:text-[18px] tracking-tight text-black mt-1">{title}</h3>
                {desc && <p className="text-[12.5px] text-black/55 leading-relaxed mt-1 max-w-xl">{desc}</p>}
            </div>
            {action}
        </div>
    );
}

/* Som de notificação — card individual extraído para encaixar no grid */
function NotifSoundCard() {
    const [soundOn, setSoundOn] = useState(() => isNotifSoundEnabled());
    return (
        <label className="block card-lux p-4 cursor-pointer hover:shadow-md transition" data-testid="pref-notif-sound-toggle">
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl grid place-items-center bg-emerald-50 text-emerald-700 shrink-0">
                        <Bell size={16} strokeWidth={1.7} />
                    </div>
                    <div className="min-w-0">
                        <div className="font-heading font-semibold text-[14px] tracking-tight text-black">Som de notificação</div>
                        <div className="text-[11.5px] text-black/55 leading-snug mt-0.5">Pequeno toque suave ao chegar uma notificação nova.</div>
                    </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={(e) => { e.preventDefault(); playNotifSound({ force: true }); }}
                        data-testid="pref-notif-sound-preview"
                        className="font-mono text-[10.5px] uppercase tracking-[0.1em] px-2.5 py-1 rounded-full border border-black/[0.12] hover:bg-black/[0.04] text-black/65 hover:text-black tap-shrink"
                    >
                        ouvir
                    </button>
                    <input
                        type="checkbox"
                        checked={soundOn}
                        onChange={(e) => { setSoundOn(e.target.checked); setNotifSoundEnabled(e.target.checked); if (e.target.checked) playNotifSound({ force: true }); }}
                        className="w-5 h-5 accent-black"
                        data-testid="pref-notif-sound-checkbox"
                    />
                </div>
            </div>
        </label>
    );
}

function HapticsCard() {
    const [hapticsOn, setHapticsOn] = useState(() => isHapticsEnabled());
    return (
        <label className="block card-lux p-4 cursor-pointer hover:shadow-md transition" data-testid="pref-haptics-toggle">
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl grid place-items-center bg-purple-50 text-purple-700 shrink-0">
                        <Sliders size={16} strokeWidth={1.7} />
                    </div>
                    <div className="min-w-0">
                        <div className="font-heading font-semibold text-[14px] tracking-tight text-black">Vibração no mobile</div>
                        <div className="text-[11.5px] text-black/55 leading-snug mt-0.5">Toques curtos em likes, follow, comentário e publicação. Só em mobile.</div>
                    </div>
                </div>
                <input
                    type="checkbox"
                    checked={hapticsOn}
                    onChange={(e) => { setHapticsOn(e.target.checked); setHapticsEnabled(e.target.checked); if (e.target.checked) haptic("success"); }}
                    className="w-5 h-5 accent-black mt-0.5 shrink-0"
                    data-testid="pref-haptics-checkbox"
                />
            </div>
        </label>
    );
}

/* =================== Privacidade tab — SUPER GRID 12-col =================== */
function PrivTab({ prefs, setPref, user }) {
    const [exporting, setExporting] = useState(false);
    const downloadData = async () => {
        if (exporting) return;
        setExporting(true);
        try {
            const { data } = await api.get("/users/me/export");
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `lusorae-${user?.username || "user"}-${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            toast.success(`Exportação concluída · ${data.posts?.length || 0} posts, ${data.comments?.length || 0} comentários`);
        } catch (e) {
            toastApiError(e, "Não foi possível exportar os teus dados");
        } finally {
            setExporting(false);
        }
    };
    return (
        <div className="px-4 lg:px-8 py-5 lg:py-7" data-testid="settings-priv">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-4 max-w-6xl">
                <SectionHeader
                    overline="Privacidade"
                    title="O que os outros vêem"
                    desc="Pequenos sinais que tornam o teu uso mais ou menos visível."
                />
                <div className="lg:col-span-4"><ToggleRow label="Mostrar quando estou online" sub="Ponto verde no avatar" k="priv_show_online" prefs={prefs} setPref={setPref} /></div>
                <div className="lg:col-span-4"><ToggleRow label="Indicador a escrever" sub="‘Está a escrever…’ em conversas" k="priv_typing" prefs={prefs} setPref={setPref} /></div>
                <div className="lg:col-span-4"><ToggleRow label="Aparecer em pesquisas" sub="O teu @ aparece nas buscas" k="priv_search" prefs={prefs} setPref={setPref} /></div>

                <SectionHeader
                    overline="Os teus dados"
                    title="Exportar ou apagar"
                    desc="Tens direito de acesso e apagamento (RGPD)."
                />
                <div className="lg:col-span-7 card-lux p-4 sm:p-5">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-black/[0.04] grid place-items-center shrink-0"><Download size={16} strokeWidth={1.7} /></div>
                        <div className="flex-1 min-w-0">
                            <div className="font-heading font-semibold text-[14px] tracking-tight text-black">Descarregar os meus dados</div>
                            <p className="text-[12px] text-black/55 mt-0.5 leading-snug">Pacote JSON com perfil, publicações, comentários, gostos e mensagens.</p>
                        </div>
                    </div>
                    <button
                        onClick={downloadData}
                        disabled={exporting}
                        data-testid="download-data-btn"
                        className="mt-3 inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-black/[0.05] hover:bg-black/[0.10] text-[13px] font-medium disabled:opacity-60 disabled:cursor-wait"
                    >
                        <Download size={14} /> {exporting ? "A exportar…" : "Exportar JSON"}
                    </button>
                </div>
                <div className="lg:col-span-5 card-lux p-4 sm:p-5 border-red-200 bg-red-50/30">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 grid place-items-center shrink-0"><Trash2 size={16} strokeWidth={1.7} /></div>
                        <div className="flex-1 min-w-0">
                            <div className="font-heading font-semibold text-[14px] tracking-tight text-red-700">Apagar conta</div>
                            <p className="text-[12px] text-red-700/75 mt-0.5 leading-snug">Vai à secção Dados & Legal para iniciares o pedido com aviso de 30 dias.</p>
                        </div>
                    </div>
                    <button
                        onClick={() => toast.info("Vai a Dados & Legal para iniciar a eliminação da conta")}
                        className="mt-3 inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white border border-red-300 text-red-700 hover:bg-red-100 text-[13px] font-medium tap-shrink transition"
                    >
                        <Trash2 size={14} /> Iniciar eliminação
                    </button>
                </div>
            </div>
        </div>
    );
}

/* =================== Legal tab — SUPER GRID 12-col =================== */
function LegalTab() {
    return (
        <div className="px-4 lg:px-8 py-5 lg:py-7" data-testid="settings-legal">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-4 max-w-6xl">
                <SectionHeader
                    overline="Centro legal"
                    title="Documentos e direitos"
                    desc="Tudo o que precisas para conhecer e exercer os teus direitos."
                />
                <div className="lg:col-span-6"><LegalLinkRow to="/legal/terms" icon={FileText} title="Termos e Condições" desc="O contrato entre ti e o Lusorae." /></div>
                <div className="lg:col-span-6"><LegalLinkRow to="/legal/privacy" icon={Shield} title="Política de Privacidade" desc="Como tratamos os teus dados (RGPD)." /></div>
                <div className="lg:col-span-6"><LegalLinkRow to="/legal/cookies" icon={Cookie} title="Política de Cookies" desc="Cookies e tecnologias semelhantes." /></div>
                <div className="lg:col-span-6"><LegalLinkRow to="/legal/community" icon={Sparkle} title="Diretrizes da Comunidade" desc="O que é permitido e o que não é." /></div>

                <SectionHeader overline="Consentimento" title="Preferências de cookies" />
                <div className="lg:col-span-12 card-lux p-4 sm:p-5">
                    <button type="button" onClick={openCookiePreferences} data-testid="open-cookie-prefs" className="w-full sm:w-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-black/[0.05] hover:bg-black/[0.10] text-[13px] font-medium">
                        <Cookie size={14} /> Centro de Preferências de Cookies
                    </button>
                    <p className="text-[11.5px] text-black/55 mt-2 leading-relaxed">Altera as tuas escolhas de cookies funcionais, analíticos e de marketing a qualquer momento.</p>
                </div>

                <SectionHeader overline="Os teus direitos (RGPD)" title="Acesso, retificação, apagamento" />
                <div className="lg:col-span-8 card-lux p-4 sm:p-5">
                    <p className="text-[13px] text-black/70 leading-relaxed">
                        Tens direito de acesso, retificação, apagamento, portabilidade, limitação e oposição ao tratamento dos teus dados. Para os exercer, contacta o nosso Encarregado de Proteção de Dados (DPO):
                    </p>
                    <a href="mailto:dpo@lusorae.pt" className="inline-flex items-center gap-2 mt-3 px-4 py-2.5 rounded-full bg-black/[0.05] hover:bg-black/[0.10] text-[13px] font-medium">
                        dpo@lusorae.pt
                    </a>
                </div>
                <div className="lg:col-span-4 card-lux p-4 sm:p-5">
                    <p className="type-overline">Autoridade de controlo</p>
                    <p className="text-[12.5px] text-black/70 leading-relaxed mt-2">
                        Comissão Nacional de Proteção de Dados (CNPD)
                    </p>
                    <a href="https://www.cnpd.pt" target="_blank" rel="noopener noreferrer" className="inline-block mt-2 text-[12.5px] underline underline-offset-2 hover:text-black">www.cnpd.pt</a>
                </div>

                <div className="lg:col-span-12 text-[11px] text-black/45 leading-relaxed hairline-t pt-5 mt-2">
                    <p>
                        Lusorae © {new Date().getFullYear()}. Operado por{" "}
                        <span className="font-mono bg-black/[0.04] px-1.5 py-0.5 rounded">[Lusorae, Lda.]</span>,{" "}
                        com sede em Portugal. NIPC{" "}
                        <span className="font-mono bg-black/[0.04] px-1.5 py-0.5 rounded">[a indicar]</span>.
                        Versão dos termos em vigor: 1.0. Sujeito à lei portuguesa e à União Europeia.
                    </p>
                </div>
            </div>
        </div>
    );
}

/* =================== Shared sub-components =================== */
function LegalLinkRow({ to, icon: Icon, title, desc }) {
    return (
        <Link to={to} className="group flex items-start gap-3 p-3.5 rounded-xl border border-black/[0.08] hover:border-black/25 hover:bg-black/[0.02] transition">
            <div className="w-9 h-9 rounded-full bg-black/[0.04] grid place-items-center shrink-0 text-black"><Icon size={15} strokeWidth={1.7} /></div>
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
