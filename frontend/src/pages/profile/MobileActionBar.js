import { MessageCircle, Share2, Edit3 } from "lucide-react";
import { RodaButton } from "../../components/RodaButton";
import { FollowButton } from "../../components/FollowButton";

export function MobileActionBar({ profile, onFollow, onMessage, onShare, onEditProfile, onProfileUpdate }) {
    // legacy onFollow kept for callers; FollowButton drives state via onProfileUpdate
    void onFollow;
    return (
        <div
            className="sm:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur border-t border-black/[0.06] px-4 py-3 anim-slide-up"
            data-testid="profile-mobile-actions"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 0.75rem)" }}
        >
            <div className="flex items-center gap-2">
                <button
                    onClick={onShare}
                    data-testid="mob-action-share"
                    className="w-11 h-11 grid place-items-center rounded-full border border-black/[0.10] hover:bg-black/[0.04] tap-shrink"
                    aria-label="Partilhar"
                >
                    <Share2 size={16} />
                </button>
                {profile.is_self ? (
                    <button
                        onClick={onEditProfile}
                        data-testid="mob-action-edit"
                        className="flex-1 btn-silver py-3 text-[12.5px] inline-flex items-center justify-center gap-1.5"
                    >
                        <Edit3 size={13} /> Editar perfil
                    </button>
                ) : (
                    <>
                        <button
                            onClick={onMessage}
                            data-testid="mob-action-message"
                            className="w-11 h-11 grid place-items-center rounded-full border border-black/[0.10] hover:bg-black/[0.04] tap-shrink"
                            aria-label="Mensagem"
                        >
                            <MessageCircle size={16} />
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
        </div>
    );
}
