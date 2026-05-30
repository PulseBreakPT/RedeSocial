import { useState } from "react";
import { MessageCircle, Share2, Edit3 } from "lucide-react";
import { RodaButton } from "../../components/RodaButton";
import { FollowButton } from "../../components/FollowButton";
import { SeloPessoalModal } from "../../components/SeloPessoalModal";

export function MobileActionBar({ profile, onFollow, onMessage, onShare, onEditProfile, onProfileUpdate }) {
    // legacy onFollow kept for callers; FollowButton drives state via onProfileUpdate
    void onFollow;
    const [seloOpen, setSeloOpen] = useState(false);
    return (
        <div
            className="sm:hidden fixed bottom-0 inset-x-0 z-30 px-4 py-3 anim-slide-up"
            data-testid="profile-mobile-actions"
            style={{
                background: "#fff",
                borderTop: "3px solid #0A0A0A",
                paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)",
            }}
        >
            <div className="flex items-center gap-2">
                <button
                    onClick={() => setSeloOpen(true)}
                    data-testid="mob-action-selo"
                    className="w-11 h-11 grid place-items-center tap-shrink"
                    style={{ background: "#C8261E", color: "#fff", border: "2.5px solid #0A0A0A", boxShadow: "2.5px 2.5px 0 #0A0A0A", borderRadius: 999 }}
                    aria-label="Selo pessoal"
                    title="O selo pessoal"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
                        <path d="M 12 3 L 21 12 L 12 21 L 3 12 Z" fill="currentColor" />
                    </svg>
                </button>
                <button
                    onClick={onShare}
                    data-testid="mob-action-share"
                    className="w-11 h-11 grid place-items-center tap-shrink"
                    style={{ background: "#fff", color: "#0A0A0A", border: "2.5px solid #0A0A0A", boxShadow: "2.5px 2.5px 0 #0A0A0A", borderRadius: 999 }}
                    aria-label="Partilhar"
                >
                    <Share2 size={15} strokeWidth={2.2} />
                </button>
                {profile.is_self ? (
                    <button
                        onClick={onEditProfile}
                        data-testid="mob-action-edit"
                        className="flex-1 btn-silver py-3 inline-flex items-center justify-center gap-1.5"
                    >
                        <Edit3 size={13} strokeWidth={2.4} /> Editar perfil
                    </button>
                ) : (
                    <>
                        <button
                            onClick={onMessage}
                            data-testid="mob-action-message"
                            className="w-11 h-11 grid place-items-center tap-shrink"
                            style={{ background: "#fff", color: "#0A0A0A", border: "2.5px solid #0A0A0A", boxShadow: "2.5px 2.5px 0 #0A0A0A", borderRadius: 999 }}
                            aria-label="Mensagem"
                        >
                            <MessageCircle size={15} strokeWidth={2.2} />
                        </button>
                        <RodaButton targetUsername={profile.username} />
                        <div className="flex-1" data-testid="mob-action-follow-wrap">
                            <FollowButton
                                profile={profile}
                                onChange={onProfileUpdate}
                                size="compact"
                                className="w-full [&>button:first-child]:flex-1 [&>button:first-child]:justify-center"
                            />
                        </div>
                    </>
                )}
            </div>
            <SeloPessoalModal
                profile={profile}
                open={seloOpen}
                onClose={() => setSeloOpen(false)}
            />
        </div>
    );
}
