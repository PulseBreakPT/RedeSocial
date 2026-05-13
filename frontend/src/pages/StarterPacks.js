import { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { Gift, Heart, UserPlus, Loader2, Plus, Trash2, X } from "lucide-react";
import { api, toastApiError } from "../lib/api";
import { Avatar } from "../components/Avatar";
import { PageHeader } from "../components/PageHeader";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";

// /starter-packs            → discover
// /starter-packs/:packId    → single pack
export default function StarterPacks() {
    const { packId } = useParams();
    if (packId) return <SinglePack packId={packId} />;
    return <DiscoverPacks />;
}

function DiscoverPacks() {
    const { user } = useAuth();
    const [packs, setPacks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);

    async function load() {
        setLoading(true);
        try {
            const r = await api.get("/starter-packs/discover");
            setPacks(r.data || []);
        } catch (e) {
            toastApiError(e);
        } finally {
            setLoading(false);
        }
    }
    useEffect(() => { load(); }, []);

    return (
        <div className="max-w-3xl mx-auto px-4 py-6">
            <PageHeader
                title="Starter Packs"
                subtitle="Listas curadas para começares a seguir gente nova"
                action={
                    <button
                        onClick={() => setShowCreate(true)}
                        className="px-3 py-1.5 rounded-full bg-black text-white text-xs font-mono hover:bg-black/85 flex items-center gap-1.5"
                        data-testid="starter-create-btn"
                    >
                        <Plus size={12} /> Criar
                    </button>
                }
            />
            {loading ? (
                <div className="text-sm font-mono text-black/50 py-12 text-center"><Loader2 size={14} className="animate-spin inline" /> A carregar packs…</div>
            ) : packs.length === 0 ? (
                <div className="rounded-2xl border border-black/[0.08] bg-white p-8 text-center mt-4" data-testid="starter-empty">
                    <Gift className="mx-auto text-black/30 mb-2" size={28} />
                    <h3 className="font-heading font-semibold mb-1">Sem packs ainda</h3>
                    <p className="text-sm font-mono text-black/55 mb-3">Sê o primeiro a criar uma lista temática.</p>
                    <button
                        onClick={() => setShowCreate(true)}
                        className="px-4 py-2 rounded-full bg-black text-white text-xs font-mono"
                        data-testid="starter-create-cta"
                    >
                        Criar pack
                    </button>
                </div>
            ) : (
                <div className="grid sm:grid-cols-2 gap-3 mt-4" data-testid="starter-grid">
                    {packs.map((p) => (
                        <PackCard key={p.id} pack={p} onChange={load} currentUserId={user?.id} />
                    ))}
                </div>
            )}
            {showCreate && <CreatePackModal onClose={() => setShowCreate(false)} onCreated={load} />}
        </div>
    );
}

function PackCard({ pack, onChange, currentUserId }) {
    const [busy, setBusy] = useState(false);
    const [likedByMe, setLikedByMe] = useState(pack.liked_by_me);
    const [likesCount, setLikesCount] = useState(pack.likes_count);

    async function like() {
        setBusy(true);
        try {
            const r = await api.post(`/starter-packs/${pack.id}/like`);
            setLikedByMe(r.data.liked_by_me);
            setLikesCount(r.data.likes_count);
        } catch (e) {
            toastApiError(e);
        } finally {
            setBusy(false);
        }
    }
    async function followAll() {
        setBusy(true);
        try {
            const r = await api.post(`/starter-packs/${pack.id}/follow-all`);
            toast.success(`A seguir +${r.data.followed_count} pessoas`);
        } catch (e) {
            toastApiError(e);
        } finally {
            setBusy(false);
        }
    }
    async function remove() {
        if (!window.confirm("Apagar este pack?")) return;
        try {
            await api.delete(`/starter-packs/${pack.id}`);
            toast.success("Pack apagado");
            onChange && onChange();
        } catch (e) {
            toastApiError(e);
        }
    }
    const isOwner = currentUserId && pack.owner?.id === currentUserId;

    return (
        <div className="rounded-2xl border border-black/[0.08] bg-white p-4" data-testid={`pack-${pack.id}`}>
            <div className="flex items-start justify-between mb-2">
                <Link to={`/starter-packs/${pack.id}`} className="flex items-start gap-2 group flex-1 min-w-0">
                    <span className="text-2xl">{pack.emoji || "🎁"}</span>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-heading font-semibold text-sm group-hover:underline truncate">{pack.title}</h3>
                        <p className="text-[11px] font-mono text-black/45 mt-0.5">por @{pack.owner?.username}</p>
                    </div>
                </Link>
                {isOwner && (
                    <button onClick={remove} className="text-black/30 hover:text-red-500 transition" title="Apagar"><Trash2 size={14} /></button>
                )}
            </div>
            {pack.description && <p className="text-xs font-mono text-black/55 mb-2 line-clamp-2">{pack.description}</p>}
            <div className="flex -space-x-2 mb-3">
                {(pack.users || []).slice(0, 6).map((u) => (
                    <div key={u.id} className="rounded-full border-2 border-white">
                        <Avatar user={u} size={28} />
                    </div>
                ))}
                {(pack.users || []).length > 6 && (
                    <span className="ml-3 text-[10px] font-mono text-black/45 self-end">+{pack.users.length - 6}</span>
                )}
            </div>
            <div className="flex gap-2">
                <button
                    onClick={followAll}
                    disabled={busy}
                    className="flex-1 px-3 py-1.5 rounded-full bg-black text-white text-xs font-mono disabled:opacity-40 hover:bg-black/85 flex items-center justify-center gap-1.5"
                    data-testid={`pack-follow-${pack.id}`}
                >
                    <UserPlus size={11} /> Seguir todos
                </button>
                <button
                    onClick={like}
                    disabled={busy}
                    className={`px-3 py-1.5 rounded-full border text-xs font-mono flex items-center gap-1.5 transition ${
                        likedByMe ? "border-orange-400 bg-orange-50 text-orange-700" : "border-black/15 hover:border-black/40"
                    }`}
                    data-testid={`pack-like-${pack.id}`}
                >
                    <Heart size={11} fill={likedByMe ? "currentColor" : "none"} /> {likesCount}
                </button>
            </div>
        </div>
    );
}

function SinglePack({ packId }) {
    const navigate = useNavigate();
    const [pack, setPack] = useState(null);
    const [loading, setLoading] = useState(true);
    async function load() {
        setLoading(true);
        try {
            const r = await api.get(`/starter-packs/${packId}`);
            setPack(r.data);
        } catch (e) {
            toastApiError(e);
        } finally {
            setLoading(false);
        }
    }
    useEffect(() => { load(); }, [packId]);

    if (loading) return <div className="p-12 text-center font-mono text-sm text-black/50"><Loader2 size={14} className="animate-spin inline" /> A carregar…</div>;
    if (!pack) return <div className="p-12 text-center">Pack não encontrado.</div>;

    return (
        <div className="max-w-2xl mx-auto px-4 py-6">
            <PageHeader title={`${pack.emoji || "🎁"} ${pack.title}`} subtitle={`por @${pack.owner?.username}`} />
            {pack.description && <p className="text-sm font-mono text-black/65 my-4">{pack.description}</p>}
            <div className="space-y-2 mt-3" data-testid="pack-users-list">
                {(pack.users || []).map((u) => (
                    <Link
                        key={u.id}
                        to={`/u/${u.username}`}
                        className="flex items-center gap-3 p-3 rounded-xl border border-black/[0.08] bg-white hover:border-black/25 transition"
                    >
                        <Avatar user={u} size={42} />
                        <div className="flex-1 min-w-0">
                            <div className="font-heading font-semibold text-sm truncate">{u.name}</div>
                            <div className="text-xs font-mono text-black/45 truncate">@{u.username}</div>
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}

function CreatePackModal({ onClose, onCreated }) {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [emoji, setEmoji] = useState("🎁");
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [selected, setSelected] = useState([]);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        const t = setTimeout(async () => {
            if (!query.trim()) { setResults([]); return; }
            try {
                const r = await api.get(`/users/search?q=${encodeURIComponent(query)}`);
                setResults(r.data || []);
            } catch (e) {
                // silent
            }
        }, 250);
        return () => clearTimeout(t);
    }, [query]);

    function toggleUser(u) {
        setSelected((cur) => {
            if (cur.find((x) => x.id === u.id)) return cur.filter((x) => x.id !== u.id);
            if (cur.length >= 20) {
                toast.error("Máx 20 utilizadores");
                return cur;
            }
            return [...cur, u];
        });
    }

    async function submit() {
        if (!title.trim()) return toast.error("Título obrigatório");
        if (selected.length === 0) return toast.error("Adiciona pelo menos 1 utilizador");
        setBusy(true);
        try {
            await api.post("/starter-packs", {
                title: title.trim(),
                description: description.trim(),
                user_ids: selected.map((u) => u.id),
                emoji,
            });
            toast.success("Pack criado!");
            onCreated && onCreated();
            onClose();
        } catch (e) {
            toastApiError(e);
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="fixed inset-0 z-50 bg-black/40 grid place-items-center px-4 overflow-y-auto py-8" onClick={onClose}>
            <div className="bg-white rounded-2xl border border-black/10 w-full max-w-lg p-5 shadow-2xl my-auto" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-3">
                    <span className="font-heading font-semibold text-base">Criar Starter Pack</span>
                    <button onClick={onClose} className="text-black/40 hover:text-black"><X size={18} /></button>
                </div>
                <div className="space-y-3">
                    <div className="flex gap-2">
                        <input
                            value={emoji}
                            onChange={(e) => setEmoji(e.target.value.slice(0, 4))}
                            className="w-14 px-2 py-2 rounded-lg border border-black/10 text-center text-xl"
                            data-testid="pack-create-emoji"
                        />
                        <input
                            value={title}
                            onChange={(e) => setTitle(e.target.value.slice(0, 60))}
                            placeholder="Título (ex. Designers PT 2026)"
                            className="flex-1 px-3 py-2 rounded-lg border border-black/10 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-400"
                            data-testid="pack-create-title"
                        />
                    </div>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value.slice(0, 200))}
                        placeholder="Descrição (200 chars)"
                        className="w-full h-20 px-3 py-2 rounded-lg border border-black/10 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-400"
                        data-testid="pack-create-description"
                    />
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Procurar utilizadores…"
                        className="w-full px-3 py-2 rounded-lg border border-black/10 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-400"
                        data-testid="pack-create-search"
                    />
                    {selected.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                            {selected.map((u) => (
                                <button
                                    key={u.id}
                                    onClick={() => toggleUser(u)}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-black text-white text-[11px] font-mono"
                                >
                                    @{u.username} <X size={10} />
                                </button>
                            ))}
                        </div>
                    )}
                    {results.length > 0 && (
                        <div className="max-h-44 overflow-y-auto space-y-1">
                            {results.map((u) => (
                                <button
                                    key={u.id}
                                    onClick={() => toggleUser(u)}
                                    className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-black/[0.04] text-left"
                                    data-testid={`pack-result-${u.username}`}
                                >
                                    <Avatar user={u} size={28} />
                                    <div className="flex-1 min-w-0">
                                        <div className="text-xs font-heading font-semibold truncate">{u.name}</div>
                                        <div className="text-[10px] font-mono text-black/45">@{u.username}</div>
                                    </div>
                                    {selected.find((x) => x.id === u.id) && <span className="text-[10px] font-mono text-orange-600">✓</span>}
                                </button>
                            ))}
                        </div>
                    )}
                    <button
                        onClick={submit}
                        disabled={busy}
                        className="w-full px-3 py-2 rounded-full bg-black text-white text-sm font-mono disabled:opacity-40 hover:bg-black/85 flex items-center justify-center gap-2"
                        data-testid="pack-create-submit"
                    >
                        {busy && <Loader2 size={14} className="animate-spin" />}
                        Criar pack
                    </button>
                </div>
            </div>
        </div>
    );
}
