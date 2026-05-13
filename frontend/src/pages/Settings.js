import { useRef, useState } from "react";
import { Camera, Lock } from "lucide-react";
import { api, formatApiError } from "../lib/api";
import { Avatar } from "../components/Avatar";
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
            <div className="sticky top-0 z-30 glass border-b border-zinc-900 px-5 py-4">
                <h1 className="font-heading text-xl font-bold tracking-tight">Definições</h1>
                <p className="font-mono text-xs text-zinc-500 mt-0.5">editar perfil e privacidade</p>
            </div>

            <div className="relative h-44 bg-gradient-to-br from-zinc-900 via-zinc-800 to-[#8B5CF6]/30">
                {form.banner && <img src={form.banner} alt="" className="w-full h-full object-cover" />}
                <button
                    onClick={() => bannerRef.current?.click()}
                    data-testid="banner-upload-btn"
                    className="absolute bottom-3 right-3 bg-black/70 hover:bg-black p-2.5 rounded-full text-white"
                >
                    <Camera size={16} />
                </button>
                <input
                    ref={bannerRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => readFile(e.target.files?.[0], (d) => setForm({ ...form, banner: d }))}
                />
            </div>

            <div className="px-5 -mt-12 relative">
                <div className="relative inline-block border-4 border-[#0A0A0A] rounded-full">
                    <Avatar user={{ ...user, avatar: form.avatar }} size={96} />
                    <button
                        onClick={() => avatarRef.current?.click()}
                        data-testid="avatar-upload-btn"
                        className="absolute bottom-0 right-0 bg-black/80 hover:bg-black p-2 rounded-full text-white border border-zinc-700"
                    >
                        <Camera size={14} />
                    </button>
                    <input
                        ref={avatarRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => readFile(e.target.files?.[0], (d) => setForm({ ...form, avatar: d }))}
                    />
                </div>

                <div className="space-y-5 mt-6">
                    <div>
                        <label className="font-mono text-xs uppercase tracking-widest text-zinc-500">Nome</label>
                        <input
                            data-testid="settings-name"
                            value={form.name}
                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                            className="mt-2 w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 focus:border-accent-vermillion outline-none"
                        />
                    </div>
                    <div>
                        <label className="font-mono text-xs uppercase tracking-widest text-zinc-500">Bio</label>
                        <textarea
                            data-testid="settings-bio"
                            value={form.bio}
                            onChange={(e) => setForm({ ...form, bio: e.target.value })}
                            rows={3}
                            maxLength={160}
                            className="mt-2 w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 focus:border-accent-vermillion outline-none resize-none"
                        />
                        <div className="font-mono text-xs text-zinc-500 text-right mt-1">{160 - (form.bio?.length || 0)}</div>
                    </div>

                    <label className="flex items-center justify-between p-4 bg-zinc-950 border border-zinc-800 rounded-xl cursor-pointer hover:border-zinc-700 transition" data-testid="privacy-toggle">
                        <div className="flex items-start gap-3">
                            <Lock size={18} className="text-accent-vermillion mt-0.5" />
                            <div>
                                <div className="font-heading font-semibold text-sm">Conta privada</div>
                                <div className="font-mono text-xs text-zinc-500 mt-0.5">apenas seguidores aprovados podem ver suas publicações</div>
                            </div>
                        </div>
                        <input
                            type="checkbox"
                            checked={form.private}
                            onChange={(e) => setForm({ ...form, private: e.target.checked })}
                            className="w-5 h-5 accent-[#8B5CF6]"
                        />
                    </label>

                    <div className="flex justify-between items-center pb-10">
                        <button
                            onClick={logout}
                            data-testid="settings-logout"
                            className="px-5 py-3 text-sm font-mono text-zinc-500 hover:text-accent-vermillion transition"
                        >
                            Terminar sessão
                        </button>
                        <button
                            onClick={save}
                            disabled={busy}
                            data-testid="settings-save-btn"
                            className="bg-accent-vermillion text-white font-heading font-semibold uppercase tracking-wide text-sm px-7 py-3 rounded-full hover:bg-[#A78BFA] transition disabled:opacity-50 active:scale-95"
                        >
                            {busy ? "A guardar..." : "Guardar"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
