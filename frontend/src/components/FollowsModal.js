import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { api, formatApiError } from "../lib/api";
import { Avatar } from "./Avatar";
import { VerifiedBadge } from "./VerifiedBadge";
import { toast } from "sonner";

export function FollowsModal({ username, type, onClose }) {
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get(`/users/${username}/${type}`)
            .then((r) => setUsers(r.data))
            .catch((e) => toast.error(formatApiError(e)))
            .finally(() => setLoading(false));
    }, [username, type]);

    const goto = (u) => {
        navigate(`/u/${u.username}`);
        onClose();
    };

    const handleFollow = async (e, u) => {
        e.stopPropagation();
        try {
            await api.post(`/users/${u.username}/follow`);
            toast.success("Atualizado");
        } catch (err) {
            toast.error(formatApiError(err));
        }
    };

    return (
        <div className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm grid place-items-center p-4" onClick={onClose}>
            <div
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl max-h-[80vh] flex flex-col"
                data-testid="follows-modal"
            >
                <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-900">
                    <h2 className="font-heading text-xl font-bold">
                        {type === "followers" ? "Seguidores" : "A seguir"}
                    </h2>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-white/5" data-testid="follows-modal-close">
                        <X size={18} />
                    </button>
                </div>
                <div className="overflow-y-auto flex-1 divide-y divide-zinc-900">
                    {loading ? (
                        <div className="p-8 text-center text-zinc-500 font-mono text-sm">carregando...</div>
                    ) : users.length === 0 ? (
                        <div className="p-8 text-center text-zinc-500 font-mono text-sm">Ninguém aqui ainda.</div>
                    ) : (
                        users.map((u) => (
                            <div
                                key={u.id}
                                onClick={() => goto(u)}
                                data-testid={`follows-user-${u.username}`}
                                className="flex items-center gap-3 p-4 hover:bg-white/[0.03] cursor-pointer transition"
                            >
                                <Avatar user={u} size={42} />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1 font-heading font-semibold text-sm">
                                        {u.name} {u.verified && <VerifiedBadge size={12} />}
                                    </div>
                                    <div className="font-mono text-xs text-zinc-500">@{u.username}</div>
                                </div>
                                <button
                                    onClick={(e) => handleFollow(e, u)}
                                    className="text-xs font-heading font-semibold uppercase tracking-wide bg-white text-black hover:bg-zinc-200 rounded-full px-3 py-1.5 transition active:scale-95"
                                >
                                    Seguir
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
