import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { api, formatApiError, toastApiError } from "../lib/api";
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
            .catch((e) => toastApiError(e))
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
            toastApiError(err);
        }
    };

    return (
        <div className="fixed inset-0 z-[80] bg-black/30 backdrop-blur-sm grid place-items-center p-4" onClick={onClose}>
            <div
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-md bg-white border border-black/[0.08] rounded-2xl shadow-[0_30px_80px_-20px_rgba(13,13,16,0.3)] max-h-[80vh] flex flex-col overflow-hidden anim-fade-up"
                data-testid="follows-modal"
            >
                <div className="flex items-center justify-between px-6 py-4 hairline-b">
                    <div>
                        <p className="type-overline mb-0.5">{type === "followers" ? "Seguidores" : "A seguir"}</p>
                        <h2 className="font-display text-[22px] tracking-tight leading-none text-black">
                            {type === "followers" ? "Seguidores" : "A seguir"}
                        </h2>
                    </div>
                    <button onClick={onClose} className="w-9 h-9 rounded-full grid place-items-center hover:bg-black/[0.04] text-black/55" data-testid="follows-modal-close">
                        <X size={16} strokeWidth={1.7} />
                    </button>
                </div>
                <div className="overflow-y-auto flex-1">
                    {loading ? (
                        <div className="p-10 text-center type-overline">a carregar…</div>
                    ) : users.length === 0 ? (
                        <div className="p-12 text-center">
                            <p className="type-overline mb-1">Vazio</p>
                            <p className="text-black/55 font-mono text-sm">Ninguém aqui ainda.</p>
                        </div>
                    ) : (
                        users.map((u) => (
                            <div
                                key={u.id}
                                onClick={() => goto(u)}
                                data-testid={`follows-user-${u.username}`}
                                className="flex items-center gap-3 p-4 hairline-b hover:bg-black/[0.02] cursor-pointer transition"
                            >
                                <Avatar user={u} size={42} />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1 font-heading font-medium text-[14px] tracking-tight text-black">
                                        {u.name} {u.verified && <VerifiedBadge size={12} />}
                                    </div>
                                    <div className="font-mono text-[11px] text-black/45">@{u.username}</div>
                                </div>
                                <button
                                    onClick={(e) => handleFollow(e, u)}
                                    className="btn-obsidian text-[11px] px-3.5 py-1.5"
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
