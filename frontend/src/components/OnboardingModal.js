import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, UserPlus, X } from "lucide-react";
import { api } from "../lib/api";
import { Avatar } from "./Avatar";
import { VerifiedBadge } from "./VerifiedBadge";
import { useAuth } from "../context/AuthContext";

export function OnboardingModal() {
    const { user, setUser } = useAuth();
    const [suggestions, setSuggestions] = useState([]);
    const [followed, setFollowed] = useState(new Set());
    const navigate = useNavigate();
    const visible = user && user.onboarded === false;

    useEffect(() => {
        if (visible) {
            api.get("/users/suggestions").then((r) => setSuggestions(r.data)).catch(() => {});
        }
    }, [visible]);

    if (!visible) return null;

    const toggle = async (u) => {
        try {
            await api.post(`/users/${u.username}/follow`);
            setFollowed((s) => {
                const ns = new Set(s);
                ns.has(u.id) ? ns.delete(u.id) : ns.add(u.id);
                return ns;
            });
        } catch {}
    };

    const finish = async () => {
        try {
            await api.post("/users/me/onboard");
        } catch {}
        setUser({ ...user, onboarded: true });
    };

    return (
        <div className="fixed inset-0 z-[90] bg-black/85 backdrop-blur-sm grid place-items-center p-4" data-testid="onboarding-modal">
            <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden glow-vermillion anim-fade-up">
                <div className="p-6 border-b border-zinc-900 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-accent-vermillion grid place-items-center">
                        <Sparkles size={18} className="text-white" />
                    </div>
                    <div>
                        <h2 className="font-heading text-2xl font-bold">Bem-vindo, {user.name?.split(" ")[0]}!</h2>
                        <p className="font-mono text-xs text-zinc-500">vamos preparar seu feed</p>
                    </div>
                    <button onClick={finish} data-testid="skip-onboarding" className="ml-auto p-2 rounded-full hover:bg-white/5 text-zinc-400">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-6">
                    <h3 className="font-heading text-lg font-bold mb-1">Siga algumas pessoas para começar</h3>
                    <p className="font-mono text-xs text-zinc-500 mb-5">selecione pelo menos um para popular seu feed</p>

                    {suggestions.length === 0 ? (
                        <p className="text-zinc-500 font-mono text-sm py-6 text-center">Nenhuma sugestão disponível agora.</p>
                    ) : (
                        <ul className="space-y-3 max-h-[40vh] overflow-y-auto">
                            {suggestions.map((s) => {
                                const isFollowing = followed.has(s.id);
                                return (
                                    <li key={s.id} className="flex items-center gap-3" data-testid={`onb-suggestion-${s.username}`}>
                                        <Avatar user={s} size={44} />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1 font-heading font-semibold text-sm">
                                                {s.name} {s.verified && <VerifiedBadge size={12} />}
                                            </div>
                                            <div className="font-mono text-xs text-zinc-500 truncate">@{s.username}</div>
                                        </div>
                                        <button
                                            onClick={() => toggle(s)}
                                            data-testid={`onb-follow-${s.username}`}
                                            className={`text-xs font-heading font-semibold uppercase tracking-wide rounded-full px-4 py-2 transition active:scale-95 ${
                                                isFollowing
                                                    ? "border border-accent-vermillion text-accent-vermillion"
                                                    : "bg-white text-black hover:bg-zinc-200"
                                            }`}
                                        >
                                            {isFollowing ? "Seguindo" : "Seguir"}
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>

                <div className="p-5 border-t border-zinc-900 flex justify-end gap-2">
                    <button
                        onClick={finish}
                        data-testid="finish-onboarding"
                        className="bg-accent-vermillion text-white font-heading font-semibold uppercase tracking-wide text-sm px-6 py-2.5 rounded-full hover:bg-[#A78BFA] active:scale-95 flex items-center gap-2"
                    >
                        <UserPlus size={14} /> Tudo pronto
                    </button>
                </div>
            </div>
        </div>
    );
}
