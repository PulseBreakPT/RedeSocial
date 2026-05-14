import { useEffect, useState } from "react";
import { X, Eye, Users } from "lucide-react";
import { api, toastApiError } from "../lib/api";
import { Avatar } from "./Avatar";
import { Spinner } from "./Spinner";
import { Link } from "react-router-dom";

export function ViewersModal({ postId, onClose }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const r = await api.get(`/posts/${postId}/viewers`);
                setData(r.data);
            } catch (e) { toastApiError(e); onClose(); }
            finally { setLoading(false); }
        })();
    }, [postId, onClose]);

    return (
        <div className="fixed inset-0 z-[400] bg-black/45 backdrop-blur-sm grid place-items-center p-4 anim-fade-up" onClick={onClose}>
            <div onClick={(e) => e.stopPropagation()}
                className="bg-white rounded-3xl max-w-md w-full p-5 shadow-2xl max-h-[80vh] flex flex-col">
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <p className="type-overline">Visualizações</p>
                        <h3 className="font-display text-[20px] tracking-tight inline-flex items-center gap-1.5">
                            <Eye size={16} /> Quem viu
                        </h3>
                    </div>
                    <button onClick={onClose} className="text-black/40 hover:text-black tap-shrink"><X size={18} /></button>
                </div>
                {loading ? (
                    <div className="py-12 text-center"><Spinner size={16} /></div>
                ) : (
                    <>
                        <div className="grid grid-cols-3 gap-3 px-2 mb-3">
                            <div className="text-center">
                                <p className="font-display text-[18px]">{data.views}</p>
                                <p className="text-[10.5px] font-mono uppercase text-black/45 tracking-[0.14em]">Total</p>
                            </div>
                            <div className="text-center">
                                <p className="font-display text-[18px]">{data.total_distinct}</p>
                                <p className="text-[10.5px] font-mono uppercase text-black/45 tracking-[0.14em]">Distintos</p>
                            </div>
                            <div className="text-center">
                                <p className="font-display text-[18px]">{data.viewers?.length || 0}</p>
                                <p className="text-[10.5px] font-mono uppercase text-black/45 tracking-[0.14em]">Listados</p>
                            </div>
                        </div>
                        <div className="overflow-y-auto flex-1 -mx-2">
                            {(data.viewers || []).length === 0 ? (
                                <p className="text-center text-[13px] text-black/55 py-8">
                                    <Users size={22} className="mx-auto mb-2 text-black/40" />
                                    Sem visualizadores identificados ainda.
                                </p>
                            ) : (
                                data.viewers.map((u) => (
                                    <Link key={u.id} to={`/u/${u.username}`} onClick={onClose}
                                        className="flex items-center gap-3 px-3 py-2 hover:bg-black/[0.04] rounded-xl transition">
                                        <Avatar user={u} size={34} />
                                        <div className="flex-1 min-w-0">
                                            <div className="font-semibold text-[14px] truncate">{u.name}</div>
                                            <div className="text-[11.5px] font-mono text-black/50 truncate">@{u.username}</div>
                                        </div>
                                    </Link>
                                ))
                            )}
                        </div>
                        <p className="text-[10.5px] font-mono text-black/40 text-center mt-2 italic">
                            Apenas os últimos 50 são guardados — anónimos não são mostrados.
                        </p>
                    </>
                )}
            </div>
        </div>
    );
}
