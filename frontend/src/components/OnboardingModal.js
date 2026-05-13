import { useEffect, useState } from "react";
import { Sparkles, UserPlus, X } from "lucide-react";
import { api } from "../lib/api";
import { Avatar } from "./Avatar";
import { VerifiedBadge } from "./VerifiedBadge";
import { useAuth } from "../context/AuthContext";

export function OnboardingModal() {
    const { user, setUser } = useAuth();
    const [suggestions, setSuggestions] = useState([]);
    const [followed, setFollowed] = useState(new Set());
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
        <div className="fixed inset-0 z-[90] bg-black/30 backdrop-blur-sm grid place-items-center p-4" data-testid="onboarding-modal">
            <div className="w-full max-w-lg bg-white border border-black/[0.08] rounded-3xl overflow-hidden shadow-[0_40px_100px_-20px_rgba(13,13,16,0.35)] anim-fade-up">
                <div className="relative p-7 hairline-b bg-paper grain isolate">
                    <div
                        className="absolute -top-20 -right-16 w-[280px] h-[280px] rounded-full opacity-40 pointer-events-none"
                        style={{ background: "radial-gradient(circle, rgba(212,212,220,0.6), transparent 65%)" }}
                    />
                    <button onClick={finish} data-testid="skip-onboarding" className="absolute top-4 right-4 w-9 h-9 rounded-full grid place-items-center hover:bg-black/[0.04] text-black/55">
                        <X size={16} strokeWidth={1.7} />
                    </button>
                    <div className="relative">
                        <p className="type-overline mb-3">Bem-vindo</p>
                        <div className="flex items-center gap-3">
                            <div className="ring-silver w-12 h-12 rounded-full grid place-items-center">
                                <Sparkles size={18} strokeWidth={1.4} className="text-black/70" />
                            </div>
                            <h2 className="font-display text-[34px] tracking-tight leading-none text-black">
                                Olá, {user.name?.split(" ")[0]}.
                            </h2>
                        </div>
                        <p className="text-black/60 mt-3 max-w-sm leading-relaxed">
                            Vamos preparar o teu feed. Segue algumas pessoas para começares.
                        </p>
                    </div>
                </div>

                <div className="p-6">
                    <p className="type-overline mb-3">Sugestões</p>
                    <h3 className="font-display text-[22px] tracking-tight leading-none text-black mb-1">Quem seguir</h3>
                    <p className="font-mono text-[11px] text-black/45 mb-5">seleciona pelo menos um para popular o teu feed</p>

                    {suggestions.length === 0 ? (
                        <p className="text-black/50 font-mono text-sm py-6 text-center">Nenhuma sugestão disponível agora.</p>
                    ) : (
                        <ul className="space-y-3 max-h-[40vh] overflow-y-auto pr-1">
                            {suggestions.map((s) => {
                                const isFollowing = followed.has(s.id);
                                return (
                                    <li key={s.id} className="flex items-center gap-3" data-testid={`onb-suggestion-${s.username}`}>
                                        <Avatar user={s} size={44} />
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1 font-heading font-medium text-[14px] tracking-tight text-black">
                                                {s.name} {s.verified && <VerifiedBadge size={12} />}
                                            </div>
                                            <div className="font-mono text-[11px] text-black/45 truncate">@{s.username}</div>
                                        </div>
                                        <button
                                            onClick={() => toggle(s)}
                                            data-testid={`onb-follow-${s.username}`}
                                            className={`text-[11px] font-heading font-medium tracking-tight rounded-full px-4 py-2 transition active:scale-95 ${
                                                isFollowing ? "chip-on" : "btn-obsidian"
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

                <div className="p-5 hairline-t flex justify-end gap-2">
                    <button
                        onClick={finish}
                        data-testid="finish-onboarding"
                        className="btn-obsidian text-[12px] px-6 py-2.5 flex items-center gap-2"
                    >
                        <UserPlus size={13} strokeWidth={1.8} /> Tudo pronto
                    </button>
                </div>
            </div>
        </div>
    );
}
