import { useState } from "react";
import {
    Download, Trash2, FileJson, FileSpreadsheet, AlertTriangle, RefreshCw,
    Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { api, toastApiError } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";

/**
 * Helper — converts an arbitrary array of rows (array of objects) into CSV.
 */
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

export function DataTab({ user }) {
    const navigate = useNavigate();
    const { setUser } = useAuth();
    const [exporting, setExporting] = useState({ json: false, csv: false });
    const [showDelete, setShowDelete] = useState(false);
    const [delForm, setDelForm] = useState({ password: "", confirm: "" });
    const [deleting, setDeleting] = useState(false);

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
            downloadBlob(blob, `vermillion-${user?.username || "user"}-${Date.now()}.json`);
            toast.success(`Exportação JSON concluída · ${data.posts?.length || 0} posts, ${data.comments?.length || 0} comentários`);
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
            // 1. User profile
            const userFields = Object.entries(data.user || {}).map(([field, value]) => ({ field, value }));
            parts.push(`# Perfil\n${toCsv(userFields, ["field", "value"])}`);
            // 2. Posts
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
            // 3. Comments
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
            downloadBlob(blob, `vermillion-${user?.username || "user"}-${Date.now()}.csv`);
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
                if (k.startsWith("cache.") || k.startsWith("__cache_") || k === "recent_searches") {
                    localStorage.removeItem(k);
                    cleared++;
                }
            });
            if ("caches" in window) {
                caches.keys().then((keys) => keys.forEach((k) => caches.delete(k)));
            }
        } catch {}
        toast.success(cleared > 0 ? `${cleared} ${cleared === 1 ? "entrada" : "entradas"} de cache ${cleared === 1 ? "removida" : "removidas"}` : "Cache local limpa");
    };

    const onClearSearches = () => {
        try {
            localStorage.removeItem("recent_searches");
            toast.success("Pesquisas recentes apagadas");
        } catch {
            toast.error("Não foi possível limpar pesquisas");
        }
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
            await api.delete("/users/me", {
                data: { password: delForm.password, confirm: delForm.confirm },
            });
            toast.success("Conta eliminada · adeus 👋");
            try {
                localStorage.removeItem("vm_token");
            } catch {}
            // Clear auth context + redirect to landing
            if (setUser) setUser(null);
            setTimeout(() => {
                navigate("/login", { replace: true });
                // Hard-reload to wipe any in-memory app state
                window.location.replace("/");
            }, 600);
        } catch (err) {
            toastApiError(err, "Não foi possível eliminar a conta");
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="px-4 lg:px-6 py-5 space-y-6 max-w-2xl" data-testid="settings-data">
            {/* Export */}
            <section>
                <div className="flex items-center gap-2 mb-3">
                    <Download size={14} strokeWidth={1.8} className="text-black/60" />
                    <p className="type-overline mb-0">Exportar os teus dados</p>
                </div>
                <p className="text-[12.5px] text-black/55 leading-relaxed mb-3">
                    Direito à portabilidade (RGPD Art. 20.º). Recebe uma cópia completa do que armazenamos sobre ti — perfil, publicações e comentários.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <ExportTile
                        icon={FileJson}
                        title="JSON"
                        sub="Estrutura completa, ideal para developers"
                        onClick={onExportJson}
                        loading={exporting.json}
                        dataTestid="data-export-json"
                    />
                    <ExportTile
                        icon={FileSpreadsheet}
                        title="CSV"
                        sub="Para abrir no Excel, Numbers ou Google Sheets"
                        onClick={onExportCsv}
                        loading={exporting.csv}
                        dataTestid="data-export-csv"
                    />
                </div>
            </section>

            {/* Data hygiene */}
            <section>
                <div className="flex items-center gap-2 mb-3">
                    <RefreshCw size={14} strokeWidth={1.8} className="text-black/60" />
                    <p className="type-overline mb-0">Limpeza local</p>
                </div>
                <div className="card-lux divide-y divide-black/[0.06]">
                    <DataRow
                        icon={RefreshCw}
                        title="Limpar cache local"
                        sub="Remove ficheiros temporários guardados no teu browser"
                        action={
                            <button
                                onClick={onClearCache}
                                data-testid="data-clear-cache"
                                className="text-[11.5px] px-3 py-1.5 rounded-full bg-black/[0.04] hover:bg-black/[0.08] font-medium tap-shrink"
                            >
                                Limpar
                            </button>
                        }
                    />
                    <DataRow
                        icon={RefreshCw}
                        title="Limpar pesquisas guardadas"
                        sub="Apaga o histórico de pesquisas do teu dispositivo"
                        action={
                            <button
                                onClick={onClearSearches}
                                data-testid="data-clear-searches"
                                className="text-[11.5px] px-3 py-1.5 rounded-full bg-black/[0.04] hover:bg-black/[0.08] font-medium tap-shrink"
                            >
                                Limpar
                            </button>
                        }
                    />
                </div>
            </section>

            {/* Danger zone */}
            <section>
                <div className="flex items-center gap-2 mb-3">
                    <AlertTriangle size={14} strokeWidth={1.8} className="text-red-soft" />
                    <p className="type-overline mb-0 text-red-soft">Zona perigosa</p>
                </div>
                <div className="rounded-2xl border border-red-soft/25 bg-red-soft/[0.04] p-5">
                    <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl grid place-items-center shrink-0 bg-red-soft/10 text-red-soft">
                            <Trash2 size={17} strokeWidth={1.7} />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="font-heading font-semibold text-[14px] tracking-tight text-black">Apagar conta permanentemente</div>
                            <div className="text-[12px] text-black/65 mt-1 leading-relaxed">
                                Esta ação é <strong>irreversível</strong>. Todas as tuas publicações, comentários, mensagens diretas, notificações e seguidores serão eliminados.
                            </div>
                            {!showDelete ? (
                                <button
                                    onClick={() => setShowDelete(true)}
                                    data-testid="data-delete-account"
                                    className="mt-3 inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-red-soft text-white hover:bg-red-soft/90 text-[12px] font-medium tap-shrink transition"
                                >
                                    <Trash2 size={13} strokeWidth={1.8} /> Quero apagar a minha conta
                                </button>
                            ) : (
                                <form onSubmit={onConfirmDelete} className="mt-4 space-y-3 bg-white border border-red-soft/25 rounded-xl p-4">
                                    <div>
                                        <label className="type-overline text-red-soft">Palavra-passe</label>
                                        <input
                                            type="password"
                                            value={delForm.password}
                                            onChange={(e) => setDelForm({ ...delForm, password: e.target.value })}
                                            className="mt-1.5 vm-input"
                                            data-testid="delete-pwd"
                                            autoComplete="current-password"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="type-overline text-red-soft">
                                            Escreve <span className="font-mono bg-red-soft/10 px-1.5 py-0.5 rounded">APAGAR</span> para confirmar
                                        </label>
                                        <input
                                            type="text"
                                            value={delForm.confirm}
                                            onChange={(e) => setDelForm({ ...delForm, confirm: e.target.value })}
                                            className="mt-1.5 vm-input font-mono tracking-widest uppercase"
                                            data-testid="delete-confirm"
                                            placeholder="APAGAR"
                                            autoComplete="off"
                                            required
                                        />
                                    </div>
                                    <div className="flex items-center justify-end gap-2 pt-1">
                                        <button
                                            type="button"
                                            onClick={() => { setShowDelete(false); setDelForm({ password: "", confirm: "" }); }}
                                            className="px-3 py-2 text-[12px] text-black/65 hover:text-black font-medium"
                                            disabled={deleting}
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={deleting || delForm.confirm !== "APAGAR" || !delForm.password}
                                            data-testid="delete-confirm-btn"
                                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-red-soft text-white hover:bg-red-soft/90 text-[12px] font-medium disabled:opacity-40 transition"
                                        >
                                            {deleting ? <><Loader2 size={12} className="animate-spin" /> A eliminar…</> : <><Trash2 size={12} /> Eliminar definitivamente</>}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}

function ExportTile({ icon: Icon, title, sub, onClick, loading, dataTestid }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={loading}
            data-testid={dataTestid}
            className="group card-lux p-4 text-left hover:shadow-md transition tap-shrink disabled:opacity-60 disabled:cursor-wait"
        >
            <div className="w-10 h-10 rounded-xl bg-black/[0.04] grid place-items-center mb-3 text-black/75 group-hover:bg-black/[0.08] transition">
                {loading ? <Loader2 size={17} className="animate-spin" /> : <Icon size={17} strokeWidth={1.7} />}
            </div>
            <div className="font-heading font-semibold text-[13.5px] tracking-tight text-black">{title}</div>
            <div className="text-[11.5px] text-black/55 mt-1 leading-snug">{sub}</div>
        </button>
    );
}

function DataRow({ icon: Icon, title, sub, action }) {
    return (
        <div className="flex items-center gap-3 p-3.5">
            <div className="w-9 h-9 rounded-xl grid place-items-center shrink-0 bg-black/[0.04] text-black/70">
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
