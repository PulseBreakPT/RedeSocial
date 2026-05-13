import { useRef, useState } from "react";
import { Camera, Lock, LogOut } from "lucide-react";
import { api, formatApiError } from "../lib/api";
import { Avatar } from "../components/Avatar";
import { PageHeader } from "../components/PageHeader";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";

export default function Settings() {
    const { user, setUser, logout } = useAuth();
    const [form, setForm] = useState({
        name: user?.name || "",
        bio: user?.bio || "",
        avatar: user?.avatar || "",
        banner: user?.banner || "",
        private: !!user?.private,
    });
    const [busy, setBusy] = useState(false);
    const avatarRef = useRef(null);
    const bannerRef = useRef(null);

    const readFile = (file, cb) => {
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            toast.error("Imagem não pode exceder 2MB");
            return;
        }
        const reader = new FileReader();
        reader.onload = (ev) => cb(ev.target.result);
        reader.readAsDataURL(file);
    };

    const save = async () => {
        setBusy(true);
        try {
            const { data } = await api.patch("/users/me", form);
            setUser({ ...user, ...data });
            toast.success("Perfil atualizado");
        } catch (e) {
            toast.error(formatApiError(e));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div data-testid="settings-page">
            <PageHeader title="Definições" subtitle="Perfil e privacidade" back testid="settings-header" />

            {/* Banner */}
            <div className="relative h-32 lg:h-44 overflow-hidden">
                <div className="absolute inset-0 silver-grad" />
                <div
                    className="absolute inset-0 opacity-50 mix-blend-multiply"
                    style={{
                        background:
                            "radial-gradient(circle at 25% 35%, rgba(106,168,230,0.15), transparent 55%), radial-gradient(circle at 80% 70%, rgba(232,93,108,0.10), transparent 55%)",
                    }}
                />
                {form.banner && <img src={form.banner} alt="" className="relative w-full h-full object-cover" />}
                <button
                    onClick={() => bannerRef.current?.click()}
                    data-testid="banner-upload-btn"
                    className="absolute bottom-3 right-3 bg-black/80 hover:bg-black p-2.5 rounded-full text-white active:scale-90 tap-shrink shadow-lg"
                    aria-label="alterar capa"
                >
                    <Camera size={15} strokeWidth={1.7} />
                </button>
                <input
                    ref={bannerRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => readFile(e.target.files?.[0], (d) => setForm({ ...form, banner: d }))}
                />
            </div>

            <div className="px-4 lg:px-6 -mt-10 lg:-mt-12 relative">
                <div className="relative inline-block rounded-full p-1 bg-white shadow-[0_8px_24px_-12px_rgba(13,13,16,0.25)]">
                    <Avatar user={{ ...user, avatar: form.avatar }} size={84} />
                    <button
                        onClick={() => avatarRef.current?.click()}
                        data-testid="avatar-upload-btn"
                        className="absolute bottom-1 right-1 bg-black/85 hover:bg-black p-1.5 rounded-full text-white active:scale-90 tap-shrink shadow-md"
                        aria-label="alterar avatar"
                    >
                        <Camera size={12} strokeWidth={1.7} />
                    </button>
                    <input
                        ref={avatarRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => readFile(e.target.files?.[0], (d) => setForm({ ...form, avatar: d }))}
                    />
                </div>

                <div className="space-y-6 mt-6 max-w-2xl">
                    <div>
                        <label className="type-overline">Nome</label>
                        <input
                            data-testid="settings-name"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            className="mt-2 w-full bg-[#fafafa] border border-black/[0.08] rounded-2xl px-4 py-3.5 text-black placeholder:text-black/30 focus:border-black/40 focus:bg-white focus:outline-none transition"
                        />
                    </div>
                    <div>
                        <label className="type-overline">Bio</label>
                        <textarea
                            data-testid="settings-bio"
                            value={form.bio}
                            onChange={(e) => setForm({ ...form, bio: e.target.value })}
                            rows={3}
                            maxLength={160}
                            placeholder="Conta-nos algo em poucas palavras…"
                            className="mt-2 w-full bg-[#fafafa] border border-black/[0.08] rounded-2xl px-4 py-3.5 text-black placeholder:text-black/30 focus:border-black/40 focus:bg-white focus:outline-none transition resize-none"
                        />
                        <div className="font-mono text-[10px] text-black/40 text-right mt-1 tracking-wider">{160 - (form.bio?.length || 0)} restantes</div>
                    </div>

                    <label
                        className="flex items-center justify-between p-4 card-lux cursor-pointer transition hover:shadow-md"
                        data-testid="privacy-toggle"
                    >
                        <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-full grid place-items-center bg-black/[0.04] border border-black/[0.06]">
                                <Lock size={15} strokeWidth={1.7} className="text-black/70" />
                            </div>
                            <div>
                                <div className="font-heading font-semibold text-[14px] tracking-tight text-black">Conta privada</div>
                                <div className="font-mono text-[11px] text-black/50 mt-0.5">apenas seguidores aprovados podem ver as publicações</div>
                            </div>
                        </div>
                        <input
                            type="checkbox"
                            checked={form.private}
                            onChange={(e) => setForm({ ...form, private: e.target.checked })}
                            className="w-5 h-5 accent-black"
                        />
                    </label>

                    <div className="flex justify-between items-center pb-10 gap-3 hairline-t pt-6">
                        <button
                            onClick={logout}
                            data-testid="settings-logout"
                            className="inline-flex items-center gap-2 px-4 py-3 text-[12px] font-mono uppercase tracking-[0.16em] text-black/55 hover:text-red-soft transition tap-shrink"
                        >
                            <LogOut size={14} strokeWidth={1.7} />
                            Terminar sessão
                        </button>
                        <button
                            onClick={save}
                            disabled={busy}
                            data-testid="settings-save-btn"
                            className="btn-obsidian px-7 py-3 text-[12px] disabled:opacity-50"
                        >
                            {busy ? "A guardar…" : "Guardar"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
