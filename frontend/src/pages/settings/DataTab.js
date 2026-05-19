import { useEffect, useState } from "react";
import {
    Download, Trash2, FileJson, FileSpreadsheet, RefreshCw,
    Loader2, ShieldAlert, Search, Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { api, toastApiError } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { SectionHeader } from "./_shared";

/* =============================================================
   DataTab — Exportar (JSON/CSV), limpeza local e zona perigosa.
   100% conectado ao backend real (/users/me/export e DELETE /users/me).
   ============================================================= */

function toCsv(rows, headerOrder) {
    if (!rows || rows.length === 0) return "";
    const headers = headerOrder && headerOrder.length
        ? headerOrder
        : Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
    const esc = (v) => {
        if (v == null) return "";
        const s = typeof v === "object" ? JSON.stringify(v) : String(v);
        if (s.includes('"') || s.includes(",") || s.includes("\n")) {
            return `"${s.replace(/"/g, '""')}"`;
        }
        return s;
    };
    const body = rows.map((r) => headers.map((h) => esc(r[h])).join(",")).join("\n");
    return headers.join(",") + "\n" + body;
}

function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function approxLocalStorageBytes() {
    try {
        let total = 0;
        for (const k in localStorage) {
            if (Object.prototype.hasOwnProperty.call(localStorage, k)) {
                total += (localStorage[k]?.length || 0) + k.length;
            }
        }
        return total * 2; // utf-16
    } catch { return 0; }
}

function fmtBytes(n) {
    if (!n || n < 1024) return `${n || 0} B`;
    if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

export function DataTab({ user }) {
    const navigate = useNavigate();
    const { setUser } = useAuth();
    const [exporting, setExporting] = useState({ json: false, csv: false });
    const [showDelete, setShowDelete] = useState(false);
    const [delForm, setDelForm] = useState({ password: "", confirm: "" });
    const [deleting, setDeleting] = useState(false);
    const [cacheBytes, setCacheBytes] = useState(0);
    const [recentSearches, setRecentSearches] = useState(0);

    useEffect(() => {
        setCacheBytes(approxLocalStorageBytes());
        try {
            const r = JSON.parse(localStorage.getItem("recent_searches") || "[]");
            setRecentSearches(Array.isArray(r) ? r.length : 0);
        } catch { setRecentSearches(0); }
    }, []);

    const refreshLocal = () => {
        setCacheBytes(approxLocalStorageBytes());
        try {
            const r = JSON.parse(localStorage.getItem("recent_searches") || "[]");
            setRecentSearches(Array.isArray(r) ? r.length : 0);
        } catch { setRecentSearches(0); }
    };

    const fetchExport = async () => {
        const { data } = await api.get("/users/me/export");
        return data;
    };

    const onExportJson = async () => {
        if (exporting.json) return;
        setExporting((e) => ({ ...e, json: true }));
        try {
            const data = await fetchExport();
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
            downloadBlob(blob, `lusorae-${user?.username || "user"}-${Date.now()}.json`);
            toast.success(`Exportação JSON · ${data.posts?.length || 0} posts, ${data.comments?.length || 0} comentários`);
        } catch (err) {
            toastApiError(err, "Não foi possível exportar os teus dados");
        } finally {
            setExporting((e) => ({ ...e, json: false }));
        }
    };

    const onExportCsv = async () => {
        if (exporting.csv) return;
        setExporting((e) => ({ ...e, csv: true }));
        try {
            const data = await fetchExport();
            const parts = [];
            const userFields = Object.entries(data.user || {}).map(([field, value]) => ({ field, value }));
            parts.push(`# Perfil\n${toCsv(userFields, ["field", "value"])}`);
            if (data.posts?.length) {
                const postRows = data.posts.map((p) => ({
                    id: p.id,
                    created_at: p.created_at,
                    content: p.content,
                    likes: (p.likes || []).length,
                    reposts: (p.reposts || []).length,
                    hashtags: (p.hashtags || []).join(" "),
                }));
                parts.push(`\n# Publicações (${postRows.length})\n${toCsv(postRows, ["id", "created_at", "content", "likes", "reposts", "hashtags"])}`);
            }
            if (data.comments?.length) {
                const commentRows = data.comments.map((c) => ({
                    id: c.id,
                    post_id: c.post_id,
                    created_at: c.created_at,
                    content: c.content,
                }));
                parts.push(`\n# Comentários (${commentRows.length})\n${toCsv(commentRows, ["id", "post_id", "created_at", "content"])}`);
            }
            const csv = parts.join("\n");
            const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
            downloadBlob(blob, `lusorae-${user?.username || "user"}-${Date.now()}.csv`);
            toast.success("Exportação CSV concluída");
        } catch (err) {
            toastApiError(err, "Não foi possível exportar os teus dados");
        } finally {
            setExporting((e) => ({ ...e, csv: false }));
        }
    };

    const onClearCache = () => {
        let cleared = 0;
        try {
            Object.keys(localStorage).forEach((k) => {
                if (k.startsWith("cache.") || k.startsWith("__cache_")) {
                    localStorage.removeItem(k);
                    cleared++;
                }
            });
            if ("caches" in window) {
                caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
            }
        } catch {}
        refreshLocal();
        toast.success(cleared > 0 ? `${cleared} ${cleared === 1 ? "entrada removida" : "entradas removidas"}` : "Cache limpa");
    };

    const onClearSearches = () => {
        try {
            localStorage.removeItem("recent_searches");
            refreshLocal();
            toast.success("Pesquisas recentes apagadas");
        } catch {
            toast.error("Não foi possível limpar pesquisas");
        }
    };

    const onClearImages = () => {
        let cleared = 0;
        try {
            Object.keys(localStorage).forEach((k) => {
                if (k.startsWith("img_cache_") || k.startsWith("thumb_")) {
                    localStorage.removeItem(k);
                    cleared++;
                }
            });
        } catch {}
        refreshLocal();
        toast.success(cleared > 0 ? `${cleared} imagens removidas` : "Sem imagens em cache");
    };

    const onConfirmDelete = async (e) => {
        e.preventDefault();
        if (delForm.confirm !== "APAGAR") {
            return toast.error('Escreve "APAGAR" para confirmar');
        }
        if (!delForm.password) {
            return toast.error("Introduz a tua palavra-passe");
        }
        setDeleting(true);
        try {
            await api.delete("/users/me", { data: { password: delForm.password, confirm: delForm.confirm } });
            toast.success("Conta eliminada · adeus");
            try { localStorage.removeItem("vm_token"); } catch {}
            if (setUser) setUser(null);
            setTimeout(() => {
                navigate("/login", { replace: true });
                window.location.replace("/");
            }, 600);
        } catch (err) {
            toastApiError(err, "Não foi possível eliminar a conta");
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="px-4 lg:px-8 py-5 lg:py-7" data-testid="settings-data">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-4 max-w-5xl">

                {/* EXPORT */}
                <SectionHeader
                    idx={1}
                    overline="Portabilidade (RGPD Art. 20.º)"
                    title="Exportar os teus dados"
                    desc="Recebe uma cópia completa do que armazenamos sobre ti — perfil, publicações e comentários."
                />
                <div className="lg:col-span-6">
                    <ExportTile
                        icon={FileJson}
                        title="JSON"
                        sub="Estrutura completa, ideal para developers"
                        onClick={onExportJson}
                        loading={exporting.json}
                        dataTestid="data-export-json"
                        accent="bg-indigo-50 text-indigo-700"
                    />
                </div>
                <div className="lg:col-span-6">
                    <ExportTile
                        icon={FileSpreadsheet}
                        title="CSV"
                        sub="Abre no Excel, Numbers ou Google Sheets"
                        onClick={onExportCsv}
                        loading={exporting.csv}
                        dataTestid="data-export-csv"
                        accent="bg-emerald-50 text-emerald-700"
                    />
                </div>

                {/* LIMPEZA LOCAL */}
                <SectionHeader
                    idx={2}
                    overline="Limpeza local"
                    title="Cache, pesquisas e imagens"
                    desc={`No teu dispositivo, ${fmtBytes(cacheBytes)} de dados estão guardados.`}
                />
                <div className="lg:col-span-12 card-lux divide-y divide-black/[0.06]">
                    <DataRow
                        icon={RefreshCw}
                        title="Limpar cache local"
                        sub={`Inclui caches de feed, perfis e pesquisas (${fmtBytes(cacheBytes)})`}
                        tint="bg-amber-50 text-amber-700"
                        action={
                            <button onClick={onClearCache} data-testid="data-clear-cache"
                                className="text-[11.5px] px-3 py-1.5 rounded-full bg-black/[0.04] hover:bg-black/[0.08] font-medium tap-shrink transition">
                                Limpar
                            </button>
                        }
                    />
                    <DataRow
                        icon={Search}
                        title="Pesquisas recentes"
                        sub={`${recentSearches} ${recentSearches === 1 ? "pesquisa guardada" : "pesquisas guardadas"}`}
                        tint="bg-indigo-50 text-indigo-700"
                        action={
                            <button onClick={onClearSearches} data-testid="data-clear-searches"
                                className="text-[11.5px] px-3 py-1.5 rounded-full bg-black/[0.04] hover:bg-black/[0.08] font-medium tap-shrink transition"
                                disabled={recentSearches === 0}>
                                Apagar
                            </button>
                        }
                    />
                    <DataRow
                        icon={ImageIcon}
                        title="Imagens em cache"
                        sub="Thumbnails e pré-visualizações guardadas localmente"
                        tint="bg-purple-50 text-purple-700"
                        action={
                            <button onClick={onClearImages} data-testid="data-clear-images"
                                className="text-[11.5px] px-3 py-1.5 rounded-full bg-black/[0.04] hover:bg-black/[0.08] font-medium tap-shrink transition">
                                Limpar
                            </button>
                        }
                    />
                </div>

                {/* DANGER ZONE */}
                <div className="lg:col-span-12 flex items-end justify-between gap-4 flex-wrap mt-3">
                    <div className="flex items-start gap-3">
                        <span className="hidden lg:grid place-items-center w-7 h-7 rounded-lg bg-red-soft text-white text-[10.5px] font-mono tabular-nums tracking-wider shrink-0 mt-0.5">03</span>
                        <div>
                            <p className="type-overline text-red-soft mb-0">Zona perigosa</p>
                            <h3 className="font-heading font-bold text-[17px] lg:text-[19px] tracking-tight text-red-soft mt-1.5 leading-tight">Apagar conta permanentemente</h3>
                            <p className="text-[12.5px] text-black/55 leading-relaxed mt-1.5 max-w-xl">
                                Esta acção é irreversível. Todos os teus dados são apagados e removidos do sistema.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-12 rounded-2xl border border-red-soft/25 bg-red-soft/[0.04] p-5">
                    <div className="flex items-start gap-3">
                        <div className="w-11 h-11 rounded-xl grid place-items-center shrink-0 bg-red-soft/10 text-red-soft">
                            <ShieldAlert size={17} strokeWidth={1.7} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="font-heading font-semibold text-[14px] tracking-tight text-black flex items-center gap-2 flex-wrap">
                                Apagar a tua conta
                                <span className="text-[9.5px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-red-soft/15 text-red-soft border border-red-soft/25">irreversível</span>
                            </div>
                            <div className="text-[12px] text-black/65 mt-1 leading-relaxed">
                                Todas as tuas publicações, comentários, mensagens diretas, notificações e seguidores serão eliminados.
                            </div>
                            {!showDelete ? (
                                <button onClick={() => setShowDelete(true)} data-testid="data-delete-account"
                                    className="mt-4 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-red-soft text-white hover:bg-red-soft/90 text-[12px] font-medium tap-shrink transition">
                                    <Trash2 size={13} strokeWidth={1.8} /> Quero apagar a minha conta
                                </button>
                            ) : (
                                <form onSubmit={onConfirmDelete} className="mt-4 space-y-3 bg-white border border-red-soft/25 rounded-xl p-4">
                                    <div>
                                        <label className="type-overline text-red-soft">Palavra-passe</label>
                                        <input type="password" value={delForm.password}
                                            onChange={(e) => setDelForm({ ...delForm, password: e.target.value })}
                                            className="mt-1.5 vm-input" data-testid="delete-pwd"
                                            autoComplete="current-password" required />
                                    </div>
                                    <div>
                                        <label className="type-overline text-red-soft">
                                            Escreve <span className="font-mono bg-red-soft/10 px-1.5 py-0.5 rounded">APAGAR</span> para confirmar
                                        </label>
                                        <input type="text" value={delForm.confirm}
                                            onChange={(e) => setDelForm({ ...delForm, confirm: e.target.value })}
                                            className="mt-1.5 vm-input font-mono tracking-widest uppercase"
                                            data-testid="delete-confirm" placeholder="APAGAR"
                                            autoComplete="off" required />
                                    </div>
                                    <div className="flex items-center justify-end gap-2 pt-1">
                                        <button type="button" onClick={() => { setShowDelete(false); setDelForm({ password: "", confirm: "" }); }}
                                            className="px-3 py-2 text-[12px] text-black/65 hover:text-black font-medium" disabled={deleting}>
                                            Cancelar
                                        </button>
                                        <button type="submit" disabled={deleting || delForm.confirm !== "APAGAR" || !delForm.password}
                                            data-testid="delete-confirm-btn"
                                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-red-soft text-white hover:bg-red-soft/90 text-[12px] font-medium disabled:opacity-40 transition">
                                            {deleting ? <><Loader2 size={12} className="animate-spin" /> A eliminar…</> : <><Trash2 size={12} /> Eliminar definitivamente</>}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ExportTile({ icon: Icon, title, sub, onClick, loading, dataTestid, accent }) {
    return (
        <button type="button" onClick={onClick} disabled={loading} data-testid={dataTestid}
            className="group card-lux p-5 text-left hover:shadow-md transition tap-shrink disabled:opacity-60 disabled:cursor-wait w-full h-full">
            <div className={`w-11 h-11 rounded-xl grid place-items-center mb-3 transition ${accent || "bg-black/[0.04] text-black/75"}`}>
                {loading ? <Loader2 size={17} className="animate-spin" /> : <Icon size={17} strokeWidth={1.7} />}
            </div>
            <div className="font-heading font-semibold text-[14px] tracking-tight text-black inline-flex items-center gap-2">
                {title}
                <span className="text-[10px] font-mono tracking-wider uppercase text-black/40">.{title.toLowerCase()}</span>
            </div>
            <div className="text-[12px] text-black/55 mt-1 leading-snug">{sub}</div>
            <div className="text-[10.5px] font-mono tracking-wider uppercase text-black/45 inline-flex items-center gap-1 mt-3 group-hover:text-black/70 transition">
                <Download size={11} /> Exportar
            </div>
        </button>
    );
}

function DataRow({ icon: Icon, title, sub, action, tint }) {
    return (
        <div className="flex items-center gap-3 p-4">
            <div className={`w-10 h-10 rounded-xl grid place-items-center shrink-0 ${tint || "bg-black/[0.04] text-black/70"}`}>
                <Icon size={15} strokeWidth={1.8} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="font-heading font-semibold text-[13.5px] tracking-tight text-black">{title}</div>
                <div className="text-[11.5px] text-black/55 mt-0.5 leading-snug">{sub}</div>
            </div>
            {action}
        </div>
    );
}
