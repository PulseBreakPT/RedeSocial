import { useEffect, useMemo, useRef, useState } from "react";
import {
    User as UserIcon, Bell, Shield, LayoutDashboard, Database,
    Search, Check, X, Settings as SettingsIcon, Palette,
} from "lucide-react";
import { api, toastApiError } from "../lib/api";
import { PageHeader } from "../components/PageHeader";
import { PtPageShell } from "../components/PtPageShell";
import { useAuth } from "../context/AuthContext";
import { lsGet, lsSet } from "../lib/portuguese";
import { toast } from "sonner";
import { PT } from "./auth/AuthDecor";

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
            priv_pulse:         typeof user?.pulse_opt_out === "boolean"      ? !user.pulse_opt_out     : lsGet("pref.priv_pulse", true),
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
        priv_pulse:       (v) => ({ pulse_opt_out: !v }),
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
        <PtPageShell testid="settings-page" className="pb-32" doodles="minimal">
            <PageHeader title="Definições" back testid="settings-header">
                {/* Mobile-only chip tabs */}
                <div className="lg:hidden px-3 pb-3 pt-3 flex gap-1.5 overflow-x-auto scrollbar-hide" style={{ borderTop: `2.5px dashed ${PT.ink}` }}>
                    {filteredTabs.map((t) => {
                        const Icon = t.icon;
                        const active = tab === t.key;
                        return (
                            <button
                                key={t.key}
                                onClick={() => setTab(t.key)}
                                data-testid={`settings-tab-${t.key}`}
                                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-black uppercase tap-shrink transition-transform"
                                style={{
                                    background: active ? PT.ink : "#fff",
                                    color: active ? PT.gold : PT.ink,
                                    border: `2px solid ${PT.ink}`,
                                    boxShadow: active ? `2.5px 2.5px 0 ${PT.gold}` : `2px 2px 0 ${PT.ink}`,
                                    borderRadius: 999,
                                    letterSpacing: "0.06em",
                                }}
                            >
                                <Icon size={12} strokeWidth={2.6} /> {t.short || t.label}
                            </button>
                        );
                    })}
                </div>
            </PageHeader>

            <div className="lg:grid lg:grid-cols-[300px_1fr] lg:gap-0">
                {/* Desktop vertical sidebar — fanzine */}
                <aside
                    className="hidden lg:flex flex-col min-h-[calc(100vh-80px)] sticky top-0 self-start py-6 px-3"
                    style={{
                        borderRight: `2.5px solid ${PT.ink}`,
                        background: PT.cream,
                    }}
                >
                    {/* Brand row */}
                    <div className="px-3 pb-5 flex items-center gap-3">
                        <div
                            className="w-11 h-11 grid place-items-center shrink-0"
                            style={{
                                background: PT.ink,
                                color: PT.gold,
                                border: `2.5px solid ${PT.ink}`,
                                boxShadow: `3px 3px 0 ${PT.red}`,
                                borderRadius: 10,
                                transform: "rotate(-4deg)",
                            }}
                        >
                            <SettingsIcon size={17} strokeWidth={2.4} />
                        </div>
                        <div className="min-w-0">
                            <p className="font-mono font-black uppercase mb-0.5" style={{ fontSize: 10, letterSpacing: "0.16em", color: PT.red }}>
                                // DEFINIÇÕES
                            </p>
                            <p className="font-black tracking-tight leading-none truncate" style={{ fontSize: 16, color: PT.ink }}>
                                {user?.name?.split(" ")[0] || user?.username || "Utilizador"}
                            </p>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="px-2 mb-4">
                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: PT.ink }} strokeWidth={2.4} />
                            <input
                                ref={searchRef}
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Pesquisar…"
                                data-testid="settings-search"
                                className="w-full pl-9 pr-9 py-2.5 text-[13px] outline-none font-medium"
                                style={{
                                    background: "#fff",
                                    color: PT.ink,
                                    border: `2.5px solid ${PT.ink}`,
                                    boxShadow: `2.5px 2.5px 0 ${PT.ink}`,
                                    borderRadius: 10,
                                }}
                            />
                            {search ? (
                                <button
                                    onClick={() => { setSearch(""); searchRef.current?.focus(); }}
                                    data-testid="settings-search-clear"
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 tap-shrink"
                                    style={{ color: PT.red }}
                                    aria-label="Limpar pesquisa"
                                >
                                    <X size={13} strokeWidth={2.6} />
                                </button>
                            ) : (
                                <kbd
                                    className="absolute right-2.5 top-1/2 -translate-y-1/2 inline-flex items-center justify-center h-5 px-1.5 text-[10px] font-mono font-black"
                                    style={{
                                        background: PT.gold,
                                        color: PT.ink,
                                        border: `1.5px solid ${PT.ink}`,
                                        borderRadius: 4,
                                    }}
                                >/</kbd>
                            )}
                        </div>
                    </div>

                    <nav className="flex flex-col gap-2 px-1">
                        {filteredTabs.map((t) => {
                            const Icon = t.icon;
                            const active = tab === t.key;
                            return (
                                <button
                                    key={t.key}
                                    onClick={() => setTab(t.key)}
                                    data-testid={`settings-side-${t.key}`}
                                    className="relative w-full flex items-start gap-3 px-3 py-3 text-left tap-shrink transition-transform"
                                    style={{
                                        background: active ? PT.ink : "#fff",
                                        color: active ? PT.gold : PT.ink,
                                        border: `2.5px solid ${PT.ink}`,
                                        boxShadow: active ? `3px 3px 0 ${PT.red}` : `2.5px 2.5px 0 ${PT.ink}`,
                                        borderRadius: 10,
                                    }}
                                >
                                    <div
                                        className="w-9 h-9 grid place-items-center shrink-0 mt-0.5"
                                        style={{
                                            background: active ? PT.gold : PT.cream,
                                            color: PT.ink,
                                            border: `2px solid ${PT.ink}`,
                                            borderRadius: 7,
                                            transform: "rotate(-4deg)",
                                        }}
                                    >
                                        <Icon size={15} strokeWidth={2.4} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-[13.5px] tracking-tight font-black">{t.label}</div>
                                        {t.desc && (
                                            <div className="text-[11px] leading-snug mt-1 line-clamp-2 font-medium" style={{ color: active ? "rgba(255,244,220,0.7)" : "rgba(10,10,10,0.55)" }}>{t.desc}</div>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                        {filteredTabs.length === 0 && (
                            <div className="px-3 py-6 text-center text-[12.5px] font-medium" style={{ color: "rgba(10,10,10,0.55)" }}>
                                Sem resultados para "{search}".
                            </div>
                        )}
                    </nav>

                    {/* Footer mini help */}
                    <div className="mt-auto px-3 pt-4 mx-1 mt-4" style={{ borderTop: `2.5px dashed ${PT.ink}` }}>
                        <p className="font-mono font-black uppercase mb-2" style={{ fontSize: 10, letterSpacing: "0.14em", color: PT.red }}>
                            // ATALHOS
                        </p>
                        <ul className="text-[11.5px] space-y-1.5 font-medium" style={{ color: "rgba(10,10,10,0.65)" }}>
                            <li className="flex items-center justify-between gap-2">
                                <span>Focar pesquisa</span>
                                <kbd className="font-mono text-[10px] px-1.5 py-0.5 font-black" style={{ background: PT.gold, color: PT.ink, border: `1.5px solid ${PT.ink}`, borderRadius: 4 }}>/</kbd>
                            </li>
                            <li className="flex items-center justify-between gap-2">
                                <span>Fechar modal</span>
                                <kbd className="font-mono text-[10px] px-1.5 py-0.5 font-black" style={{ background: PT.gold, color: PT.ink, border: `1.5px solid ${PT.ink}`, borderRadius: 4 }}>esc</kbd>
                            </li>
                        </ul>
                    </div>
                </aside>

                {/* Main content area */}
                <main className="min-w-0">
                    {/* Group header */}
                    <div className="hidden lg:flex items-end justify-between gap-4 flex-wrap px-4 lg:px-8 pt-6 pb-4" style={{ borderBottom: `2.5px solid ${PT.ink}` }}>
                        <div className="min-w-0 flex items-start gap-4">
                            <div
                                className="w-14 h-14 grid place-items-center shrink-0"
                                style={{
                                    background: PT.gold,
                                    color: PT.ink,
                                    border: `3px solid ${PT.ink}`,
                                    boxShadow: `4px 4px 0 ${PT.ink}`,
                                    borderRadius: 14,
                                    transform: "rotate(-4deg)",
                                }}
                            >
                                <ActiveIcon size={22} strokeWidth={2.4} />
                            </div>
                            <div className="min-w-0">
                                <p className="font-mono font-black uppercase mb-1.5" style={{ fontSize: 10.5, letterSpacing: "0.16em", color: PT.red }}>
                                    // DEFINIÇÕES
                                </p>
                                <h1
                                    className="font-black tracking-[-0.025em] leading-tight"
                                    style={{ fontSize: "clamp(24px, 3.5vw, 36px)", color: PT.ink }}
                                >
                                    {activeGroup.label}
                                </h1>
                                {activeGroup.desc && (
                                    <p className="text-[13.5px] leading-relaxed mt-2 max-w-2xl font-medium" style={{ color: "rgba(10,10,10,0.62)" }}>{activeGroup.desc}</p>
                                )}
                            </div>
                        </div>
                        {isDirty && (
                            <span
                                className="font-mono font-black uppercase px-3 py-1.5 inline-flex items-center gap-2"
                                style={{
                                    background: PT.gold,
                                    color: PT.ink,
                                    border: `2.5px solid ${PT.ink}`,
                                    boxShadow: `2.5px 2.5px 0 ${PT.red}`,
                                    fontSize: 10.5,
                                    letterSpacing: "0.10em",
                                    transform: "rotate(-1deg)",
                                }}
                            >
                                <span className="w-2 h-2 animate-pulse" style={{ background: PT.red, border: `1.5px solid ${PT.ink}`, borderRadius: 999 }} />
                                // POR GUARDAR
                            </span>
                        )}
                    </div>

                    {/* Sub-section jump nav */}
                    {activeGroup.sections.length > 1 && activeGroup.sections.some((s) => s.label) && (
                        <div className="px-4 lg:px-8 pt-5 pb-1 flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-black uppercase" style={{ fontSize: 10.5, letterSpacing: "0.16em", color: PT.red }}>
                                // NESTA SECÇÃO
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
                                    className="text-[11.5px] font-black uppercase px-3 py-1.5 tap-shrink transition-transform hover:-translate-y-0.5"
                                    style={{
                                        background: "#fff",
                                        color: PT.ink,
                                        border: `2px solid ${PT.ink}`,
                                        boxShadow: `2px 2px 0 ${PT.ink}`,
                                        borderRadius: 999,
                                        letterSpacing: "0.06em",
                                    }}
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
                            className={idx > 0 ? "mt-4 pt-6" : ""}
                            style={idx > 0 ? { borderTop: `2.5px dashed ${PT.ink}` } : undefined}
                        >
                            {sec.label && idx > 0 && (
                                <div className="px-4 lg:px-8 -mb-1 flex items-center gap-2.5">
                                    <span
                                        className="w-8 h-8 grid place-items-center"
                                        style={{
                                            background: PT.gold,
                                            color: PT.ink,
                                            border: `2.5px solid ${PT.ink}`,
                                            boxShadow: `2px 2px 0 ${PT.ink}`,
                                            borderRadius: 8,
                                            transform: "rotate(-4deg)",
                                        }}
                                    >
                                        {sec.key === "aparencia" && <Palette size={14} strokeWidth={2.4} />}
                                        {sec.key === "seg" && <Shield size={14} strokeWidth={2.4} />}
                                        {sec.key === "legal" && <Shield size={14} strokeWidth={2.4} />}
                                        {!["aparencia", "seg", "legal"].includes(sec.key) && <SettingsIcon size={14} strokeWidth={2.4} />}
                                    </span>
                                    <h2 className="font-black tracking-tight" style={{ fontSize: 19, color: PT.ink }}>
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
                    <div
                        className="flex items-center gap-3 px-4 py-3"
                        style={{
                            background: PT.ink,
                            color: PT.cream,
                            border: `3px solid ${PT.ink}`,
                            boxShadow: `5px 5px 0 ${PT.gold}, 5px 5px 0 2.5px ${PT.ink}`,
                            borderRadius: 14,
                        }}
                    >
                        <div
                            className="w-8 h-8 grid place-items-center"
                            style={{
                                background: PT.gold,
                                color: PT.ink,
                                border: `2px solid ${PT.gold}`,
                                borderRadius: 999,
                                transform: "rotate(-4deg)",
                            }}
                        >
                            <Check size={14} strokeWidth={2.8} />
                        </div>
                        <span className="text-[13px] font-black tracking-tight uppercase" style={{ letterSpacing: "0.04em" }}>// Alterações por guardar</span>
                        <div className="flex items-center gap-2 ml-2">
                            <button
                                onClick={discard}
                                data-testid="unsaved-discard"
                                className="px-3 py-1.5 text-[11.5px] font-black uppercase tap-shrink transition-colors"
                                style={{
                                    background: "transparent",
                                    color: "rgba(255,244,220,0.75)",
                                    border: `2px solid rgba(255,244,220,0.35)`,
                                    borderRadius: 999,
                                    letterSpacing: "0.06em",
                                }}
                            >
                                Descartar
                            </button>
                            <button
                                onClick={save}
                                disabled={busy}
                                data-testid="unsaved-save"
                                className="px-4 py-1.5 text-[11.5px] font-black uppercase tap-shrink disabled:opacity-50"
                                style={{
                                    background: PT.gold,
                                    color: PT.ink,
                                    border: `2px solid ${PT.gold}`,
                                    boxShadow: `2px 2px 0 ${PT.red}`,
                                    borderRadius: 999,
                                    letterSpacing: "0.06em",
                                }}
                            >
                                {busy ? "A guardar…" : "Guardar"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </PtPageShell>
    );
}
