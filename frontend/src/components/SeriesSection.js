import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen, Plus, Loader2, X, Trash2 } from "lucide-react";
import { api, toastApiError } from "../lib/api";
import { toast } from "sonner";
import { confirmDialog } from "./ConfirmDialog";

// Series section shown on user profile
export function SeriesSection({ username, isSelf }) {
    const [series, setSeries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);

    async function load() {
        setLoading(true);
        try {
            const r = await api.get(`/users/${username}/series`);
            setSeries(r.data || []);
        } catch (e) {
            // silent
        } finally {
            setLoading(false);
        }
    }
    useEffect(() => { if (username) load(); }, [username]);

    async function remove(id) {
        const ok = await confirmDialog({
            title: "Apagar esta série?",
            description: "Os posts da série permanecem, mas perdem a ligação à série.",
            confirmText: "Apagar série",
            danger: true,
        });
        if (!ok) return;
        try {
            await api.delete(`/series/${id}`);
            toast.success("Série apagada");
            await load();
        } catch (e) {
            toastApiError(e);
        }
    }

    return (
        <div className="rounded-2xl border border-black/[0.08] bg-white p-3 mb-3" data-testid="series-section">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                    <BookOpen size={13} className="text-black/60" />
                    <span className="font-heading font-semibold text-xs uppercase tracking-wider text-black/55">Séries</span>
                    {series.length > 0 && <span className="text-[10px] font-mono text-black/40">({series.length})</span>}
                </div>
                {isSelf && (
                    <button
                        onClick={() => setShowCreate(true)}
                        className="text-[11px] font-mono text-black/55 hover:text-black flex items-center gap-1"
                        data-testid="series-create-btn"
                    >
                        <Plus size={11} /> Nova
                    </button>
                )}
            </div>
            {loading ? (
                <div className="text-xs font-mono text-black/40 py-2">A carregar…</div>
            ) : series.length === 0 ? (
                <div className="text-xs font-mono text-black/40 py-2">
                    {isSelf ? "Cria a tua primeira série temática." : "Sem séries ainda."}
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-2">
                    {series.map((s) => (
                        <Link
                            to={`/series/${s.id}`}
                            key={s.id}
                            className="group relative p-3 rounded-xl bg-gradient-to-br from-stone-50 to-amber-50 border border-black/[0.06] hover:border-black/20 transition"
                            data-testid={`series-card-${s.id}`}
                        >
                            <div className="text-xl mb-1">{s.cover_emoji || "📚"}</div>
                            <div className="font-heading font-semibold text-xs truncate">{s.title}</div>
                            <div className="text-[10px] font-mono text-black/45 mt-0.5">{s.posts_count} posts</div>
                            {isSelf && (
                                <button
                                    onClick={(e) => { e.preventDefault(); remove(s.id); }}
                                    className="absolute top-1.5 right-1.5 text-black/30 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
                                    title="Apagar"
                                >
                                    <Trash2 size={11} />
                                </button>
                            )}
                        </Link>
                    ))}
                </div>
            )}
            {showCreate && <CreateSeriesModal onClose={() => setShowCreate(false)} onCreated={load} />}
        </div>
    );
}

function CreateSeriesModal({ onClose, onCreated }) {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [emoji, setEmoji] = useState("📚");
    const [busy, setBusy] = useState(false);

    async function submit() {
        if (!title.trim()) return;
        setBusy(true);
        try {
            await api.post("/series", {
                title: title.trim(),
                description: description.trim(),
                cover_emoji: emoji,
            });
            toast.success("Série criada");
            onCreated && onCreated();
            onClose();
        } catch (e) {
            toastApiError(e);
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center px-4" onClick={onClose}>
            <div className="bg-white rounded-2xl border border-black/10 w-full max-w-md p-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-3">
                    <span className="font-heading font-semibold">Nova série</span>
                    <button onClick={onClose} className="text-black/40 hover:text-black"><X size={18} /></button>
                </div>
                <div className="space-y-2">
                    <div className="flex gap-2">
                        <input
                            value={emoji}
                            onChange={(e) => setEmoji(e.target.value.slice(0, 4))}
                            className="w-14 px-2 py-2 rounded-lg border border-black/10 text-center text-xl"
                            data-testid="series-create-emoji"
                        />
                        <input
                            value={title}
                            onChange={(e) => setTitle(e.target.value.slice(0, 60))}
                            placeholder="Título da série"
                            className="flex-1 px-3 py-2 rounded-lg border border-black/10 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-400"
                            data-testid="series-create-title"
                        />
                    </div>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value.slice(0, 240))}
                        placeholder="Descrição opcional"
                        className="w-full h-20 px-3 py-2 rounded-lg border border-black/10 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-400"
                        data-testid="series-create-description"
                    />
                    <button
                        onClick={submit}
                        disabled={busy || !title.trim()}
                        className="w-full px-3 py-2 rounded-full bg-black text-white text-sm font-mono disabled:opacity-40 hover:bg-black/85 flex items-center justify-center gap-2"
                        data-testid="series-create-submit"
                    >
                        {busy && <Loader2 size={14} className="animate-spin" />}
                        Criar
                    </button>
                </div>
            </div>
        </div>
    );
}
