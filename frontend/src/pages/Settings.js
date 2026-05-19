import { useEffect, useMemo, useRef, useState } from "react";
import {
    User as UserIcon, Bell, Shield, LayoutDashboard, Database,
    Search, Check, X, Settings as SettingsIcon, Palette,
} from "lucide-react";
import { api, toastApiError } from "../lib/api";
import { PageHeader } from "../components/PageHeader";
import { useAuth } from "../context/AuthContext";
import { lsGet, lsSet } from "../lib/portuguese";
import { toast } from "sonner";

import { HubTab } from "./settings/HubTab";
import { SecurityTab } from "./settings/SecurityTab";
import { DataTab } from "./settings/DataTab";
import { ContaTab } from "./settings/ContaTab";
import { AppearanceTab } from "./settings/AppearanceTab";
import { NotifTab } from "./settings/NotifTab";
import { PrivacyTab } from "./settings/PrivacyTab";
import { LegalTab } from "./settings/LegalTab";

/* ============================================================
   GROUPS — 5 grupos lógicos do módulo Definições.
   Cada grupo tem secções inline (renderizadas em pilha vertical).
   ============================================================ */
const GROUPS = [
    {
        key: "hub",
        label: "Visão geral",
        short: "Hub",
        icon: LayoutDashboard,
        accent: "from-slate-500/10 to-slate-900/0",
        desc: "Resumo da tua conta, completude e atalhos para áreas importantes.",
        keywords: ["resumo", "overview", "saúde", "completude", "stats", "score", "hub", "painel"],
        sections: [{ key: "hub", label: null }],
    },
    {
        key: "perfil",
        label: "Perfil",
        short: "Perfil",
        icon: UserIcon,
        accent: "from-rose-400/15 to-rose-900/0",
        desc: "Nome, bio, avatar, capa, cidade, conta privada e aparência.",
        keywords: ["nome", "bio", "avatar", "capa", "banner", "privada", "perfil", "cidade", "identidade", "tema", "aparência", "idioma", "densidade", "movimento"],
        sections: [
            { key: "conta", label: "Conta" },
            { key: "aparencia", label: "Aparência" },
        ],
    },
    {
        key: "notif",
        label: "Notificações",
        short: "Notif.",
        icon: Bell,
        accent: "from-amber-400/15 to-amber-900/0",
        desc: "Modos saudáveis, tipos de notificação, som e vibração.",
        keywords: ["gostos", "comentários", "menções", "boa noite", "cafezinho", "modos", "notificações", "som", "vibração", "push"],
        sections: [{ key: "notif", label: null }],
    },
    {
        key: "priv-seg",
        label: "Privacidade & Segurança",
        short: "Priv. & Seg.",
        icon: Shield,
        accent: "from-indigo-400/15 to-indigo-900/0",
        desc: "Quem te vê, 2FA, sessões, palavra-passe e alertas de login.",
        keywords: ["online", "escrever", "pesquisa", "dados", "rgpd", "privacidade", "palavra-passe", "password", "2fa", "sessões", "login", "alertas", "segurança", "recuperação"],
        sections: [
            { key: "priv", label: "Privacidade" },
            { key: "seg", label: "Segurança" },
        ],
    },
    {
        key: "dados-legal",
        label: "Dados & Legal",
        short: "Dados",
        icon: Database,
        accent: "from-emerald-400/15 to-emerald-900/0",
        desc: "Exportar dados, apagar conta, termos, privacidade e DPO.",
        keywords: ["armazenamento", "exportar", "json", "csv", "cache", "apagar conta", "dados", "termos", "privacidade", "cookies", "comunidade", "dpo", "legal", "rgpd"],
        sections: [
            { key: "dados", label: "Dados pessoais" },
            { key: "legal", label: "Centro legal" },
        ],
    },
];

/* Back-compat redirects for legacy deep links / hash anchors. */
const LEGACY_TAB_TO_GROUP = (() => {
    const m = {};
    GROUPS.forEach((g) => g.sections.forEach((s) => { m[s.key] = g.key; }));
    m.ident = "perfil";
    m.foryou = "notif";
    m.apar = "perfil";
    m.atalhos = "perfil";
    m.conteudo = "notif";
    return m;
})();

export default function Settings() {
    const { user, setUser, logout } = useAuth();
    void logout; // sign-out lives in the avatar menu
    const [tab, setTab] = useState("hub");
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

    /* Server-persisted prefs hydrated from user, fallback to localStorage. Debounced save. */
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
        lsSet(`pref.${k}`, v);
        const mapper = PREF_TO_PAYLOAD[k];
        if (!mapper) return;
        const currentNp = user?.notif_preferences || {
            likes: prefs.notif_likes, comments: prefs.notif_comments,
            follows: prefs.notif_follows, mentions: prefs.notif_mentions, dm: prefs.notif_dm,
        };
        const inc = mapper(v, { _notif_pref_base: { ...currentNp, ...(pendingPatchRef.current.notif_preferences || {}) } });
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

    /* User stats — server-side */
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

    /* Surgical user update used by SecurityTab and others to avoid full reload. */
    const handleUserUpdate = (partial) => {
        if (!partial || typeof partial !== "object") return;
        setUser({ ...user, ...partial });
    };

    /* Search filter */
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

    useEffect(() => {
        if (search.trim() && filteredTabs.length > 0 && !filteredTabs.find((t) => t.key === tab)) {
            setTab(filteredTabs[0].key);
        }
    }, [search, filteredTabs, tab]);

    useEffect(() => {
        if (LEGACY_TAB_TO_GROUP[tab] && LEGACY_TAB_TO_GROUP[tab] !== tab) {
            setTab(LEGACY_TAB_TO_GROUP[tab]);
        }
    }, [tab]);

    const activeGroup = GROUPS.find((g) => g.key === tab) || GROUPS[0];
    const ActiveIcon = activeGroup.icon;

    return (
        <div data-testid="settings-page" className="pb-32">
            <PageHeader title="Definições" subtitle="Conta, segurança, dados e mais" back testid="settings-header">
                {/* Mobile-only chip tabs */}
                <div className="lg:hidden px-3 pb-2 flex gap-1 overflow-x-auto scrollbar-hide hairline-t pt-2">
                    {filteredTabs.map((t) => {
                        const Icon = t.icon;
                        const active = tab === t.key;
                        return (
                            <button
                                key={t.key}
                                onClick={() => setTab(t.key)}
                                data-testid={`settings-tab-${t.key}`}
                                className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium border-b-2 transition tap-shrink ${
                                    active ? "tab-grad-on" : "border-transparent text-black/65 hover:text-black"
                                }`}
                            >
                                <Icon size={13} /> {t.short || t.label}
                            </button>
                        );
                    })}
                </div>
            </PageHeader>

            <div className="lg:grid lg:grid-cols-[300px_1fr] lg:gap-0">
                {/* Desktop vertical sidebar — SSS tier */}
                <aside className="hidden lg:flex flex-col border-r border-black/[0.06] min-h-[calc(100vh-80px)] sticky top-0 self-start py-6 px-3 bg-gradient-to-b from-white to-black/[0.015]">
                    {/* Brand row */}
                    <div className="px-3 pb-4 flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-black text-white grid place-items-center shrink-0 shadow-md">
                            <SettingsIcon size={15} strokeWidth={1.8} />
                        </div>
                        <div className="min-w-0">
                            <p className="type-overline mb-0">Definições</p>
                            <p className="font-display text-[15px] font-bold tracking-tight text-black leading-none mt-0.5 truncate">
                                {user?.name?.split(" ")[0] || user?.username || "Utilizador"}
                            </p>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="px-2 mb-4">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40 pointer-events-none" strokeWidth={1.8} />
                            <input
                                ref={searchRef}
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Pesquisar…"
                                data-testid="settings-search"
                                className="w-full pl-9 pr-9 py-2.5 bg-black/[0.04] hover:bg-black/[0.05] focus:bg-white focus:border-black/30 rounded-xl border border-transparent text-[13px] outline-none transition"
                            />
                            {search ? (
                                <button
                                    onClick={() => { setSearch(""); searchRef.current?.focus(); }}
                                    data-testid="settings-search-clear"
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-black/40 hover:text-black/80 p-1 tap-shrink"
                                    aria-label="Limpar pesquisa"
                                >
                                    <X size={13} />
                                </button>
                            ) : (
                                <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 inline-flex items-center justify-center h-5 px-1.5 rounded bg-white border border-black/[0.10] text-[10px] font-mono text-black/50">/</kbd>
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
                                    className={`relative w-full flex items-start gap-3 px-3 py-3 rounded-xl text-left transition group tap-shrink ${
                                        active ? "bg-black text-white shadow-[0_8px_20px_-12px_rgba(13,13,16,0.35)]" : "text-black/65 hover:bg-black/[0.04] hover:text-black"
                                    }`}
                                >
                                    {active && (
                                        <span aria-hidden className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-8 rounded-r-full bg-amber-400" />
                                    )}
                                    <div className={`w-9 h-9 rounded-lg grid place-items-center shrink-0 mt-0.5 transition ${
                                        active ? "bg-white/15 text-white" : "bg-black/[0.04] text-black/65 group-hover:bg-black/[0.07]"
                                    }`}>
                                        <Icon size={15} strokeWidth={active ? 2 : 1.7} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className={`text-[13.5px] tracking-tight ${active ? "font-bold" : "font-semibold"}`}>{t.label}</div>
                                        {t.desc && (
                                            <div className={`text-[11px] leading-snug mt-0.5 line-clamp-2 ${active ? "text-white/70" : "text-black/45"}`}>{t.desc}</div>
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

                    {/* Footer mini help */}
                    <div className="mt-auto px-3 pt-4 hairline-t mx-1 mt-4">
                        <p className="text-[10.5px] font-mono uppercase tracking-wider text-black/40 mb-1.5">Atalhos</p>
                        <ul className="text-[11.5px] text-black/55 space-y-1">
                            <li className="flex items-center justify-between gap-2"><span>Focar pesquisa</span><kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-black/[0.04] border border-black/[0.08]">/</kbd></li>
                            <li className="flex items-center justify-between gap-2"><span>Fechar modal</span><kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-black/[0.04] border border-black/[0.08]">esc</kbd></li>
                        </ul>
                    </div>
                </aside>

                {/* Main content area */}
                <main className="min-w-0">
                    {/* Group header */}
                    <div className="hidden lg:flex items-end justify-between gap-4 flex-wrap px-4 lg:px-8 pt-6 pb-3 border-b border-black/[0.06] bg-gradient-to-r from-transparent via-transparent to-black/[0.02]">
                        <div className="min-w-0 flex items-start gap-4">
                            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${activeGroup.accent} border border-black/[0.06] grid place-items-center shrink-0`}>
                                <ActiveIcon size={20} strokeWidth={1.7} className="text-black/80" />
                            </div>
                            <div className="min-w-0">
                                <p className="type-overline mb-0">Definições</p>
                                <h1 className="font-display text-[26px] lg:text-[32px] font-bold tracking-tight text-black leading-tight mt-1">
                                    {activeGroup.label}
                                </h1>
                                {activeGroup.desc && (
                                    <p className="text-[13px] text-black/55 leading-relaxed mt-1.5 max-w-2xl">{activeGroup.desc}</p>
                                )}
                            </div>
                        </div>
                        {isDirty && (
                            <span className="text-[10.5px] font-mono tracking-wider uppercase text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-full inline-flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                alterações por guardar
                            </span>
                        )}
                    </div>

                    {/* Sub-section jump nav */}
                    {activeGroup.sections.length > 1 && activeGroup.sections.some((s) => s.label) && (
                        <div className="px-4 lg:px-8 pt-5 pb-1 flex items-center gap-2 flex-wrap">
                            <span className="text-[10.5px] uppercase tracking-[0.16em] font-mono text-black/40">
                                Nesta secção
                            </span>
                            {activeGroup.sections.map((s) => s.label && (
                                <a
                                    key={s.key}
                                    href={`#sec-${s.key}`}
                                    onClick={(e) => {
                                        e.preventDefault();
                                        document.getElementById(`sec-${s.key}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
                                    }}
                                    data-testid={`settings-jump-${s.key}`}
                                    className="text-[12px] font-medium px-3 py-1.5 rounded-full bg-black/[0.04] hover:bg-black/[0.08] text-black/70 hover:text-black transition tap-shrink"
                                >
                                    {s.label}
                                </a>
                            ))}
                        </div>
                    )}

                    {/* Stacked sections */}
                    {activeGroup.sections.map((sec, idx) => (
                        <section
                            key={sec.key}
                            id={`sec-${sec.key}`}
                            data-testid={`settings-section-${sec.key}`}
                            className={idx > 0 ? "mt-4 pt-6 border-t border-black/[0.06]" : ""}
                        >
                            {sec.label && idx > 0 && (
                                <div className="px-4 lg:px-8 -mb-1 flex items-center gap-2">
                                    {sec.key === "aparencia" && <Palette size={14} className="text-black/55" />}
                                    {sec.key === "seg" && <Shield size={14} className="text-black/55" />}
                                    {sec.key === "legal" && <Shield size={14} className="text-black/55" />}
                                    <h2 className="font-heading text-[18px] tracking-tight text-black font-bold">
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
                            {sec.key === "aparencia" && (
                                <AppearanceTab prefs={prefs} setPref={setPref} />
                            )}
                            {sec.key === "notif" && (
                                <NotifTab form={form} setForm={setForm} prefs={prefs} setPref={setPref} save={save} busy={busy} />
                            )}
                            {sec.key === "priv" && (
                                <PrivacyTab prefs={prefs} setPref={setPref} />
                            )}
                            {sec.key === "seg" && (
                                <SecurityTab user={user} onUserUpdate={handleUserUpdate} />
                            )}
                            {sec.key === "dados" && (
                                <DataTab user={user} />
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
