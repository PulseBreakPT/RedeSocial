import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
    Camera, Lock, LogOut, User as UserIcon, Bell, Shield, Palette, Trash2,
    Download, FileText, Cookie, Sparkle, ChevronRight, MapPin, Moon, Sun,
    ScrollText, Sliders, LayoutDashboard, ShieldCheck, Database, Keyboard,
    Search, Check, X, Clock,
} from "lucide-react";
import { api, toastApiError } from "../lib/api";
import { Avatar } from "../components/Avatar";
import { PageHeader } from "../components/PageHeader";
import { ForYouTuner } from "../components/ForYouTuner";
import { useAuth } from "../context/AuthContext";
import { lsGet, lsSet } from "../lib/portuguese";
import { PT_REGIONS, PT_MOODS, PT_TEAMS } from "../lib/ptCulture";
import { openCookiePreferences } from "../components/CookieBanner";
import { toast } from "sonner";

import { HubTab } from "./settings/HubTab";
import { SecurityTab } from "./settings/SecurityTab";
import { DataTab } from "./settings/DataTab";
import { ShortcutsTab } from "./settings/ShortcutsTab";

/* ============================================================
   GROUPS — consolidated from 11 tabs to 6 logical categories.
   Each group bundles 1-2 sections (rendered stacked) so nothing
   is lost from the previous structure, just better organized.
   ============================================================ */
const GROUPS = [
    {
        key: "hub",
        label: "Visão geral",
        icon: LayoutDashboard,
        keywords: ["resumo", "overview", "saúde", "completude", "stats", "score", "hub"],
        sections: [{ key: "hub", label: null }],
    },
    {
        key: "perfil",
        label: "Perfil",
        icon: UserIcon,
        keywords: [
            "nome", "bio", "avatar", "capa", "banner", "privada", "perfil",
            "cidade", "região", "freguesia", "mood", "time", "portugal", "slots", "identidade",
        ],
        sections: [
            { key: "conta", label: "Conta e bio" },
            { key: "ident", label: "Identidade e cidade" },
        ],
    },
    {
        key: "conteudo",
        label: "Conteúdo e feed",
        icon: Sliders,
        keywords: [
            "algoritmo", "feed", "interesses", "afinar", "para ti",
            "gostos", "comentários", "menções", "boa noite", "cafezinho", "modos", "notificações",
        ],
        sections: [
            { key: "foryou", label: "Algoritmo Para Ti" },
            { key: "notif", label: "Notificações" },
        ],
    },
    {
        key: "priv-seg",
        label: "Privacidade & Segurança",
        icon: Shield,
        keywords: [
            "online", "escrever", "pesquisa", "dados", "rgpd", "privacidade",
            "palavra-passe", "password", "2fa", "sessões", "login", "alertas", "google", "github", "segurança",
        ],
        sections: [
            { key: "priv", label: "Privacidade" },
            { key: "seg", label: "Segurança" },
        ],
    },
    {
        key: "aparencia",
        label: "Aparência & Atalhos",
        icon: Palette,
        keywords: [
            "tema", "claro", "sépia", "sistema", "densidade", "idioma", "animações", "aparência",
            "teclado", "shortcuts", "shortcut", "kb", "teclas", "atalhos",
        ],
        sections: [
            { key: "apar", label: "Aparência" },
            { key: "atalhos", label: "Atalhos de teclado" },
        ],
    },
    {
        key: "dados-legal",
        label: "Dados & Legal",
        icon: Database,
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
    return m;
})();

const BIO_SLOTS = [
    { key: "mood_today",      label: "Mood do dia",      placeholder: "saudade · tasca · festa…" },
    { key: "soundtrack",      label: "Banda sonora",     placeholder: "O que andas a ouvir?" },
    { key: "reading",         label: "Livro/série",      placeholder: "Sebastião Salgado, Glória…" },
    { key: "favourite_place", label: "Lugar favorito",   placeholder: "Praça do Comércio, Pena, Foz…" },
    { key: "quote_of_month",  label: "Frase do mês",     placeholder: "Uma linha que te define agora" },
    { key: "city_extra",      label: "Bairro/Freguesia", placeholder: "Alvalade, Cedofeita…" },
];

const THEMES = [
    {
        k: "light",
        l: "Claro",
        sub: "Branco vivo, máximo contraste",
        preview: { bg: "#ffffff", surface: "#fafafa", ink: "#0a0a0a", accent: "#0a0a0a" },
    },
    {
        k: "sepia",
        l: "Sépia",
        sub: "Tom papel envelhecido, fácil aos olhos",
        preview: { bg: "#f7f1e6", surface: "#ede4d3", ink: "#3a2f1f", accent: "#5e4630" },
    },
    {
        k: "auto",
        l: "Sistema",
        sub: "Acompanha o teu OS",
        preview: { bg: "linear-gradient(135deg, #fff 0%, #fff 50%, #0a0a0a 50%, #1a1a1a 100%)", surface: "#fafafa", ink: "#0a0a0a", accent: "#0a0a0a" },
    },
];

export default function Settings() {
    const { user, setUser, logout } = useAuth();
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
        freguesia: user?.freguesia || "",
        region: user?.region || "",
        mood_initial: user?.mood_initial || "",
        team: user?.team || "",
        bio_slots: user?.bio_slots || {},
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
        const keys = ["name", "bio", "avatar", "banner", "private", "city", "freguesia", "region", "mood_initial", "team", "boa_noite_enabled", "cafezinho_enabled"];
        if (keys.some((k) => form[k] !== initialForm[k])) return true;
        if (JSON.stringify(form.bio_slots) !== JSON.stringify(initialForm.bio_slots)) return true;
        return false;
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

            <div className="lg:grid lg:grid-cols-[260px_1fr] lg:gap-0">
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

                    <nav className="flex flex-col gap-0.5 px-1">
                        {filteredTabs.map((t) => {
                            const Icon = t.icon;
                            const active = tab === t.key;
                            return (
                                <button
                                    key={t.key}
                                    onClick={() => setTab(t.key)}
                                    data-testid={`settings-side-${t.key}`}
                                    className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition tap-shrink ${
                                        active ? "bg-black/[0.05] text-black" : "text-black/65 hover:bg-black/[0.03] hover:text-black"
                                    }`}
                                >
                                    {active && (
                                        <span aria-hidden className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-black" />
                                    )}
                                    <Icon size={16} strokeWidth={active ? 2 : 1.6} />
                                    <span className={`text-[13.5px] tracking-tight ${active ? "font-semibold" : ""}`}>{t.label}</span>
                                </button>
                            );
                        })}
                        {filteredTabs.length === 0 && (
                            <div className="px-3 py-6 text-center text-[12.5px] text-black/45">
                                Sem resultados para “{search}”.
                            </div>
                        )}
                    </nav>

                    {/* Sidebar footer */}
                    <div className="mt-auto pt-4 px-2 hairline-t mx-1">
                        <button
                            onClick={logout}
                            data-testid="settings-side-logout"
                            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-black/55 hover:text-red-soft hover:bg-red-soft/5 text-[13px] font-medium tap-shrink transition"
                        >
                            <LogOut size={14} strokeWidth={1.7} /> Terminar sessão
                        </button>
                    </div>
                </aside>

                {/* Main content area — renders all sections of the active group, stacked */}
                <main className="min-w-0">
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
                                    save={save} busy={busy} logout={logout}
                                />
                            )}
                            {sec.key === "ident" && (
                                <IdentTab form={form} setForm={setForm} save={save} busy={busy} />
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
                            {sec.key === "apar" && (
                                <AparTab prefs={prefs} setPref={setPref} />
                            )}
                            {sec.key === "foryou" && (
                                <div className="px-4 lg:px-6 py-5 max-w-2xl">
                                    <ForYouTuner />
                                </div>
                            )}
                            {sec.key === "dados" && (
                                <DataTab user={user} prefs={prefs} />
                            )}
                            {sec.key === "atalhos" && (
                                <ShortcutsTab />
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

/* =================== Conta tab =================== */
function ContaTab({ user, form, setForm, avatarRef, bannerRef, readFile, save, busy, logout }) {
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

                <div className="space-y-6 mt-6 max-w-2xl">
                    <div>
                        <label className="type-overline">Nome</label>
                        <input data-testid="settings-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-2 vm-input" />
                    </div>
                    <div>
                        <label className="type-overline">Bio</label>
                        <textarea
                            data-testid="settings-bio"
                            value={form.bio}
                            onChange={(e) => setForm({ ...form, bio: e.target.value })}
                            rows={3} maxLength={160}
                            placeholder="Conta-nos algo em poucas palavras…"
                            className="mt-2 w-full bg-[#fafafa] border border-black/[0.08] rounded-2xl px-4 py-3.5 focus:border-black/40 focus:bg-white focus:outline-none transition resize-none"
                        />
                        <div className="font-mono text-[10px] text-black/40 text-right mt-1 tracking-wider">{160 - (form.bio?.length || 0)} restantes</div>
                    </div>

                    <label className="flex items-center justify-between p-4 card-lux cursor-pointer transition hover:shadow-md" data-testid="privacy-toggle">
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

                    <div className="flex justify-between items-center pb-10 gap-3 hairline-t pt-6">
                        <button onClick={logout} data-testid="settings-logout" className="inline-flex items-center gap-2 px-4 py-3 text-[12px] font-mono uppercase tracking-[0.16em] text-black/55 hover:text-red-soft transition"><LogOut size={14} /> Terminar sessão</button>
                        <button onClick={save} disabled={busy} data-testid="settings-save-btn" className="btn-obsidian px-7 py-3 text-[12px] disabled:opacity-50">{busy ? "A guardar…" : "Guardar"}</button>
                    </div>
                </div>
            </div>
        </>
    );
}

/* =================== Identidade tab =================== */
function IdentTab({ form, setForm, save, busy }) {
    return (
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
                    <input data-testid="settings-city" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="Lisboa, Porto, Évora…" className="mt-2 vm-input" />
                </div>
                <div>
                    <label className="type-overline">Freguesia/Bairro</label>
                    <input data-testid="settings-freguesia" value={form.freguesia} onChange={(e) => setForm({ ...form, freguesia: e.target.value })} placeholder="Alvalade, Cedofeita…" className="mt-2 vm-input" />
                </div>
            </div>

            <SettingsChipGroup label="Região" testid="settings-region" options={PT_REGIONS} value={form.region} onChange={(v) => setForm({ ...form, region: v })} />
            <SettingsChipGroup label="Mood inicial" testid="settings-mood" options={PT_MOODS} value={form.mood_initial} onChange={(v) => setForm({ ...form, mood_initial: v })} />
            <SettingsChipGroup label="Time" testid="settings-team" options={PT_TEAMS} value={form.team} onChange={(v) => setForm({ ...form, team: v })} />

            <div className="pt-4 hairline-t">
                <p className="type-overline mb-1">Bio · 6 slots</p>
                <p className="text-[12.5px] text-black/55 leading-relaxed mb-3">
                    Em vez de uma bio livre, 6 campos curtos. Reduz a "página em branco" e torna o perfil mais legível.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {BIO_SLOTS.map((slot) => (
                        <div key={slot.key}>
                            <label className="type-overline">{slot.label}</label>
                            <input
                                data-testid={`settings-slot-${slot.key}`}
                                value={form.bio_slots?.[slot.key] || ""}
                                onChange={(e) => setForm({ ...form, bio_slots: { ...(form.bio_slots || {}), [slot.key]: e.target.value } })}
                                maxLength={60}
                                placeholder={slot.placeholder}
                                className="mt-2 vm-input"
                            />
                        </div>
                    ))}
                </div>
            </div>

            <div className="flex justify-end pt-3">
                <button onClick={save} disabled={busy} data-testid="settings-ident-save" className="btn-obsidian px-7 py-3 text-[12px] disabled:opacity-50">
                    {busy ? "A guardar…" : "Guardar identidade"}
                </button>
            </div>
        </div>
    );
}

/* =================== Notificações tab (+ custom Boa Noite hours) =================== */
function NotifTab({ form, setForm, prefs, setPref, save, busy }) {
    return (
        <div className="px-4 lg:px-6 py-5 space-y-3 max-w-2xl">
            <p className="type-overline">Modos saudáveis</p>

            <div className="card-lux p-4" data-testid="boa-noite-toggle">
                <label className="flex items-center justify-between cursor-pointer">
                    <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-full grid place-items-center bg-black/[0.04] border border-black/[0.06] text-black/70">
                            <Moon size={15} />
                        </div>
                        <div>
                            <div className="font-heading font-semibold text-[14px] tracking-tight text-black">Modo Boa Noite</div>
                            <div className="font-mono text-[11px] text-black/50 mt-0.5">Silencia notificações e suaviza UI nas horas que escolheres.</div>
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
                {form.boa_noite_enabled && (
                    <div className="mt-3 pt-3 hairline-t grid grid-cols-2 gap-3">
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

            <label className="flex items-center justify-between p-4 card-lux cursor-pointer hover:shadow-md transition" data-testid="cafezinho-toggle">
                <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-full grid place-items-center bg-black/[0.04] border border-black/[0.06] text-black/70">
                        <Sun size={15} />
                    </div>
                    <div>
                        <div className="font-heading font-semibold text-[14px] tracking-tight text-black">Cafezinho da manhã</div>
                        <div className="font-mono text-[11px] text-black/50 mt-0.5">Sessão curta de 60s entre as 7h00 e as 9h00 com 3 cards. Sem scroll infinito de manhã.</div>
                    </div>
                </div>
                <input type="checkbox" checked={!!form.cafezinho_enabled} onChange={(e) => setForm({ ...form, cafezinho_enabled: e.target.checked })} className="w-5 h-5 accent-black" data-testid="cafezinho-checkbox" />
            </label>
            <div className="flex justify-end pt-2">
                <button onClick={save} disabled={busy} data-testid="settings-modes-save" className="btn-silver text-[12px] px-5 py-2.5 disabled:opacity-50">
                    {busy ? "A guardar…" : "Guardar modos"}
                </button>
            </div>

            <div className="hairline-t pt-5">
                <Link to="/manifesto" data-testid="settings-manifesto-link" className="flex items-center gap-3 p-3.5 rounded-xl border border-black/[0.10] hover:border-black/30 transition group">
                    <div className="w-9 h-9 rounded-full bg-black/[0.04] grid place-items-center shrink-0 text-black"><ScrollText size={15} strokeWidth={1.7} /></div>
                    <div className="flex-1 min-w-0">
                        <div className="font-semibold text-[13.5px] tracking-tight text-black flex items-center gap-1">
                            O nosso Manifesto
                            <ChevronRight size={13} className="opacity-0 group-hover:opacity-60 -ml-0.5 transition" />
                        </div>
                        <p className="text-[11.5px] text-black/55 leading-snug mt-0.5">6 promessas anti-dark-pattern. O que não fazemos aqui.</p>
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
    );
}

/* =================== Privacidade tab =================== */
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
        <div className="px-4 lg:px-6 py-5 space-y-3 max-w-2xl">
            <p className="type-overline">Privacidade</p>
            <ToggleRow label="Mostrar quando estou online" k="priv_show_online" prefs={prefs} setPref={setPref} />
            <ToggleRow label="Mostrar indicador a escrever" k="priv_typing" prefs={prefs} setPref={setPref} />
            <ToggleRow label="Aparecer em pesquisas" k="priv_search" prefs={prefs} setPref={setPref} />
            <div className="hairline-t pt-5">
                <p className="type-overline mb-3">Os teus dados</p>
                <button onClick={downloadData} disabled={exporting} data-testid="download-data-btn" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-black/[0.04] hover:bg-black/[0.08] text-[13px] font-medium disabled:opacity-60 disabled:cursor-wait">
                    <Download size={14} /> {exporting ? "A exportar…" : "Descarregar os meus dados"}
                </button>
                <button className="ml-2 inline-flex items-center gap-2 px-4 py-2.5 rounded-full text-red-soft hover:bg-red-soft/10 text-[13px] font-medium" onClick={() => toast.info("Vai à secção Dados para iniciar a eliminação")}><Trash2 size={14} /> Apagar conta</button>
            </div>
        </div>
    );
}

/* =================== Aparência tab (com theme preview cards) =================== */
function AparTab({ prefs, setPref }) {
    return (
        <div className="px-4 lg:px-6 py-5 space-y-5 max-w-2xl">
            <div>
                <p className="type-overline mb-3">Tema</p>
                <div className="grid grid-cols-3 gap-3">
                    {THEMES.map((t) => {
                        const active = prefs.theme === t.k;
                        return (
                            <button
                                key={t.k}
                                onClick={() => setPref("theme", t.k)}
                                data-testid={`settings-theme-${t.k}`}
                                className={`group relative p-2.5 rounded-2xl border-2 text-left tap-shrink transition ${
                                    active ? "border-black shadow-[0_8px_22px_-10px_rgba(13,13,16,0.30)]" : "border-black/[0.08] hover:border-black/30"
                                }`}
                            >
                                {active && (
                                    <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-black text-white grid place-items-center shadow-md">
                                        <Check size={12} strokeWidth={2.4} />
                                    </span>
                                )}
                                {/* Mini-mockup preview */}
                                <div
                                    className="aspect-[4/3] rounded-xl overflow-hidden border border-black/[0.08] relative"
                                    style={{ background: t.preview.bg }}
                                >
                                    {/* Mock header bar */}
                                    <div className="absolute top-0 left-0 right-0 h-3 flex items-center gap-1 px-1.5" style={{ background: t.preview.surface }}>
                                        <span className="w-1 h-1 rounded-full" style={{ background: t.preview.accent }} />
                                        <span className="w-1 h-1 rounded-full opacity-60" style={{ background: t.preview.accent }} />
                                        <span className="w-1 h-1 rounded-full opacity-40" style={{ background: t.preview.accent }} />
                                    </div>
                                    {/* Mock post card */}
                                    <div className="absolute top-5 left-1.5 right-1.5 bottom-1.5 rounded p-1.5" style={{ background: t.preview.surface }}>
                                        <div className="flex items-center gap-1 mb-1">
                                            <span className="w-2 h-2 rounded-full" style={{ background: t.preview.accent }} />
                                            <span className="h-1 rounded flex-1" style={{ background: t.preview.ink, opacity: 0.25 }} />
                                        </div>
                                        <div className="space-y-0.5">
                                            <div className="h-0.5 rounded" style={{ background: t.preview.ink, opacity: 0.4 }} />
                                            <div className="h-0.5 w-3/4 rounded" style={{ background: t.preview.ink, opacity: 0.4 }} />
                                            <div className="h-0.5 w-1/2 rounded" style={{ background: t.preview.ink, opacity: 0.25 }} />
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-2.5 px-1">
                                    <div className={`text-[12.5px] tracking-tight ${active ? "font-semibold text-black" : "font-medium text-black/80"}`}>{t.l}</div>
                                    <div className="text-[10.5px] text-black/50 leading-snug mt-0.5">{t.sub}</div>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div>
                <p className="type-overline mb-3">Densidade</p>
                <div className="grid grid-cols-2 gap-2">
                    {[{ k: "compact", l: "Compacta", sub: "Mais conteúdo no ecrã" }, { k: "comfortable", l: "Confortável", sub: "Mais espaço, mais leitura" }].map((d) => {
                        const active = prefs.density === d.k;
                        return (
                            <button
                                key={d.k}
                                onClick={() => setPref("density", d.k)}
                                className={`p-3 rounded-xl border text-left tap-shrink transition ${active ? "border-black bg-black/[0.03]" : "border-black/[0.08] hover:border-black/30"}`}
                            >
                                <div className={`text-[13px] tracking-tight ${active ? "font-semibold" : "font-medium"}`}>{d.l}</div>
                                <div className="text-[11px] text-black/50 mt-0.5">{d.sub}</div>
                            </button>
                        );
                    })}
                </div>
            </div>

            <div>
                <p className="type-overline mb-3">Idioma</p>
                <div className="grid grid-cols-3 gap-2">
                    {[{ k: "pt-PT", l: "PT", flag: "🇵🇹" }, { k: "pt-BR", l: "PT-BR", flag: "🇧🇷" }, { k: "en", l: "EN", flag: "🇬🇧" }].map((l) => {
                        const active = prefs.language === l.k;
                        return (
                            <button
                                key={l.k}
                                onClick={() => setPref("language", l.k)}
                                data-testid={`settings-lang-${l.k}`}
                                className={`p-2.5 rounded-xl border text-[12.5px] font-medium tap-shrink transition flex items-center justify-center gap-1.5 ${active ? "border-black bg-black/[0.03]" : "border-black/[0.08] hover:border-black/30"}`}
                            >
                                <span className="text-base">{l.flag}</span> {l.l}
                            </button>
                        );
                    })}
                </div>
            </div>

            <ToggleRow label="Reduzir animações" sub="Útil se sentires tonturas com movimentos" k="reduce_motion" prefs={prefs} setPref={setPref} />
        </div>
    );
}

/* =================== Legal tab =================== */
function LegalTab() {
    return (
        <div className="px-4 lg:px-6 py-5 space-y-4 max-w-2xl">
            <p className="type-overline">Documentos legais</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <LegalLinkRow to="/legal/terms" icon={FileText} title="Termos e Condições" desc="O contrato entre ti e o Lusorae." />
                <LegalLinkRow to="/legal/privacy" icon={Shield} title="Política de Privacidade" desc="Como tratamos os teus dados (RGPD)." />
                <LegalLinkRow to="/legal/cookies" icon={Cookie} title="Política de Cookies" desc="Cookies e tecnologias semelhantes." />
                <LegalLinkRow to="/legal/community" icon={Sparkle} title="Diretrizes da Comunidade" desc="O que é permitido e o que não é." />
            </div>

            <div className="hairline-t pt-5">
                <p className="type-overline mb-3">Consentimento</p>
                <button type="button" onClick={openCookiePreferences} data-testid="open-cookie-prefs" className="w-full sm:w-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-black/[0.04] hover:bg-black/[0.08] text-[13px] font-medium">
                    <Cookie size={14} /> Centro de Preferências de Cookies
                </button>
                <p className="text-[11px] text-black/55 mt-2 leading-relaxed">Altera as tuas escolhas de cookies funcionais, analíticos e de marketing a qualquer momento.</p>
            </div>

            <div className="hairline-t pt-5">
                <p className="type-overline mb-3">Os teus direitos (RGPD)</p>
                <p className="text-[13px] text-black/70 leading-relaxed">
                    Tens direito de acesso, retificação, apagamento, portabilidade, limitação e oposição ao tratamento dos teus dados. Para os exercer, contacta o nosso Encarregado de Proteção de Dados (DPO):
                </p>
                <a href="mailto:dpo@lusorae.pt" className="inline-flex items-center gap-2 mt-3 px-4 py-2.5 rounded-full bg-black/[0.04] hover:bg-black/[0.08] text-[13px] font-medium">
                    dpo@lusorae.pt
                </a>
                <p className="text-[11px] text-black/50 mt-3 leading-relaxed">
                    Podes ainda apresentar reclamação à Comissão Nacional de Proteção de Dados (CNPD) em{" "}
                    <a href="https://www.cnpd.pt" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-black">www.cnpd.pt</a>.
                </p>
            </div>

            <div className="hairline-t pt-5 text-[11px] text-black/45 leading-relaxed">
                <p>
                    Lusorae © {new Date().getFullYear()}. Operado por{" "}
                    <span className="font-mono bg-black/[0.04] px-1.5 py-0.5 rounded">[Lusorae, Lda.]</span>,
                    NIPC <span className="font-mono bg-black/[0.04] px-1.5 py-0.5 rounded">[a indicar]</span>.
                    Sujeito à lei portuguesa e à União Europeia.
                </p>
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
