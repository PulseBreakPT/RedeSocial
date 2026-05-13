import { useEffect, useState } from "react";
import { Plus, X, Loader2 } from "lucide-react";
import { api, toastApiError } from "../lib/api";
import { Avatar } from "./Avatar";
import { useAuth } from "../context/AuthContext";
import { Link } from "react-router-dom";
import { toast } from "sonner";

// 24h "Recados" — text status above the feed (Instagram Notes style)
export function NotesBar() {
    const { user } = useAuth();
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [composer, setComposer] = useState(false);
    const [text, setText] = useState("");
    const [busy, setBusy] = useState(false);

    async function load() {
        setLoading(true);
        try {
            const r = await api.get("/notes/feed");
            setNotes(r.data || []);
        } catch (e) {
            // silent
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
    }, []);

    const mine = notes.find((n) => n.user_id === user?.id);

    async function createNote() {
        const t = text.trim();
        if (!t) return;
        setBusy(true);
        try {
            await api.post("/notes", { text: t, mood: "" });
            setText("");
            setComposer(false);
            toast.success("Recado publicado · expira em 24h");
            await load();
        } catch (e) {
            toastApiError(e);
        } finally {
            setBusy(false);
        }
    }

    async function removeMine() {
        if (!mine) return;
        try {
            await api.delete(`/notes/${mine.id}`);
            toast.success("Recado apagado");
            await load();
        } catch (e) {
            toastApiError(e);
        }
    }

    if (loading) return null;

    return (
        <div className="rounded-2xl border border-black/[0.08] bg-white mb-3 overflow-hidden" data-testid="notes-bar">
            <div className="flex items-center justify-between px-3 py-2 border-b border-black/[0.05]">
                <span className="font-heading font-semibold text-xs tracking-wider uppercase text-black/55">
                    Recados · 24h
                </span>
                {mine ? (
                    <button
                        onClick={removeMine}
                        className="text-[10px] font-mono text-black/45 hover:text-black/80 transition"
                        data-testid="notes-bar-remove-mine"
                    >
                        apagar o meu
                    </button>
                ) : null}
            </div>
            <div className="flex gap-3 overflow-x-auto px-3 py-3 scrollbar-thin">
                {/* My slot */}
                <button
                    onClick={() => setComposer(true)}
                    className="flex flex-col items-center gap-1.5 min-w-[68px] group"
                    data-testid="notes-bar-add-mine"
                >
                    <div className="relative">
                        <Avatar user={user} size={48} />
                        {!mine && (
                            <span className="absolute -bottom-1 -right-1 grid place-items-center w-5 h-5 rounded-full bg-orange-500 text-white border-2 border-white">
                                <Plus size={11} strokeWidth={2.5} />
                            </span>
                        )}
                    </div>
                    <span className="text-[10px] font-mono text-black/60 max-w-[68px] truncate">
                        {mine ? mine.text : "Recado"}
                    </span>
                </button>
                {notes
                    .filter((n) => n.user_id !== user?.id)
                    .map((n) => (
                        <Link
                            key={n.id}
                            to={`/u/${n.author?.username}`}
                            className="flex flex-col items-center gap-1.5 min-w-[68px] max-w-[68px]"
                            title={n.text}
                            data-testid={`notes-bar-item-${n.author?.username}`}
                        >
                            <div className="relative">
                                <Avatar user={n.author} size={48} />
                                <span className="absolute -bottom-1 -right-1 px-1 text-[8px] font-mono bg-white rounded-full border border-black/10">
                                    {n.mood ? "·" : "·"}
                                </span>
                            </div>
                            <span className="text-[10px] font-mono text-black/60 truncate w-full text-center" title={n.text}>
                                {n.text.slice(0, 18)}{n.text.length > 18 ? "…" : ""}
                            </span>
                        </Link>
                    ))}
                {notes.filter((n) => n.user_id !== user?.id).length === 0 && (
                    <div className="text-[11px] font-mono text-black/40 self-center px-2">
                        Ninguém que segues escreveu um recado. Sê o primeiro.
                    </div>
                )}
            </div>

            {composer && (
                <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center px-4" onClick={() => !busy && setComposer(false)}>
                    <div
                        className="bg-white rounded-2xl border border-black/10 w-full max-w-md p-4 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="font-heading font-semibold">Escreve um recado</span>
                            <button onClick={() => setComposer(false)} className="text-black/45 hover:text-black"><X size={18} /></button>
                        </div>
                        <textarea
                            value={text}
                            onChange={(e) => setText(e.target.value.slice(0, 60))}
                            placeholder="60 caracteres · expira em 24h"
                            className="w-full h-24 rounded-xl border border-black/10 p-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                            data-testid="notes-composer-input"
                            autoFocus
                        />
                        <div className="flex items-center justify-between mt-2">
                            <span className="text-[11px] font-mono text-black/45">{text.length}/60</span>
                            <button
                                onClick={createNote}
                                disabled={!text.trim() || busy}
                                className="px-4 py-2 rounded-full bg-black text-white text-sm font-mono disabled:opacity-40 hover:bg-black/85 transition flex items-center gap-2"
                                data-testid="notes-composer-submit"
                            >
                                {busy && <Loader2 size={14} className="animate-spin" />}
                                Publicar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
