import { useEffect, useState } from "react";
import { X, Loader2, UserPlus, Trash2 } from "lucide-react";
import { api, toastApiError } from "../lib/api";
import { Avatar } from "./Avatar";
import { toast } from "sonner";

// Manage collaborators on a post (author-only)
export function CollabModal({ postId, onClose }) {
    const [state, setState] = useState({ collaborators: [], invites: [] });
    const [loading, setLoading] = useState(true);
    const [q, setQ] = useState("");
    const [results, setResults] = useState([]);
    const [busy, setBusy] = useState(false);

    async function load() {
        setLoading(true);
        try {
            const r = await api.get(`/posts/${postId}/collab`);
            setState(r.data);
        } catch (e) {
            toastApiError(e);
        } finally {
            setLoading(false);
        }
    }
    useEffect(() => { load(); }, [postId]);

    useEffect(() => {
        const t = setTimeout(async () => {
            if (!q.trim()) { setResults([]); return; }
            try {
                const r = await api.get(`/users/search?q=${encodeURIComponent(q)}`);
                setResults(r.data || []);
            } catch (e) {
                // silent
            }
        }, 250);
        return () => clearTimeout(t);
    }, [q]);

    async function invite(userId) {
        setBusy(true);
        try {
            await api.post(`/posts/${postId}/collab/invite`, { user_id: userId });
            toast.success("Convite enviado");
            setQ("");
            setResults([]);
            await load();
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
                    <span className="font-heading font-semibold">Colaboradores</span>
                    <button onClick={onClose} className="text-black/40 hover:text-black"><X size={18} /></button>
                </div>
                {loading ? (
                    <div className="text-sm font-mono text-black/50 py-6 text-center"><Loader2 size={14} className="animate-spin inline" /></div>
                ) : (
                    <div className="space-y-3">
                        {state.collaborators.length > 0 && (
                            <div>
                                <h4 className="text-[11px] font-mono uppercase tracking-wider text-black/55 mb-1.5">Aceitaram</h4>
                                <div className="space-y-1">
                                    {state.collaborators.map((u) => (
                                        <div key={u.id} className="flex items-center gap-2 p-2 rounded-lg bg-green-50">
                                            <Avatar user={u} size={28} />
                                            <div className="text-xs font-mono">@{u.username}</div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {state.invites.length > 0 && (
                            <div>
                                <h4 className="text-[11px] font-mono uppercase tracking-wider text-black/55 mb-1.5">Convidados</h4>
                                <div className="space-y-1">
                                    {state.invites.map((u) => (
                                        <div key={u.id} className="flex items-center gap-2 p-2 rounded-lg bg-amber-50">
                                            <Avatar user={u} size={28} />
                                            <div className="text-xs font-mono">@{u.username} <span className="text-black/40">· pendente</span></div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        {state.collaborators.length + state.invites.length < 3 ? (
                            <div>
                                <h4 className="text-[11px] font-mono uppercase tracking-wider text-black/55 mb-1.5">Convidar (máx 3)</h4>
                                <input
                                    value={q}
                                    onChange={(e) => setQ(e.target.value)}
                                    placeholder="Procurar utilizador…"
                                    className="w-full px-3 py-2 rounded-lg border border-black/10 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-orange-400"
                                    data-testid="collab-search"
                                />
                                {results.length > 0 && (
                                    <div className="mt-2 max-h-36 overflow-y-auto space-y-1">
                                        {results.map((u) => (
                                            <button
                                                key={u.id}
                                                onClick={() => invite(u.id)}
                                                disabled={busy}
                                                className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-black/[0.04] text-left"
                                                data-testid={`collab-invite-${u.username}`}
                                            >
                                                <Avatar user={u} size={24} />
                                                <span className="text-xs font-mono flex-1 truncate">@{u.username}</span>
                                                <UserPlus size={11} className="text-black/45" />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-xs font-mono text-black/45">Máximo de 3 colaboradores atingido.</div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
