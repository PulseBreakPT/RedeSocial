import { useEffect, useState } from "react";
import { Sparkles, Loader2, Check } from "lucide-react";
import { api, toastApiError } from "../lib/api";
import { Avatar } from "./Avatar";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";

// Cosmetics picker — used in Settings
export function CosmeticsPicker() {
    const { user, refresh } = useAuth();
    const [catalog, setCatalog] = useState([]);
    const [loading, setLoading] = useState(true);
    const [frame, setFrame] = useState(user?.cosmetics_equipped?.frame || "");
    const [sticker, setSticker] = useState(user?.cosmetics_equipped?.sticker || "");
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        async function load() {
            setLoading(true);
            try {
                const r = await api.get("/cosmetics/catalog");
                setCatalog(r.data || []);
            } catch (e) {
                toastApiError(e);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    useEffect(() => {
        if (user?.cosmetics_equipped) {
            setFrame(user.cosmetics_equipped.frame || "");
            setSticker(user.cosmetics_equipped.sticker || "");
        }
    }, [user?.cosmetics_equipped]);

    async function save() {
        setBusy(true);
        try {
            await api.post("/users/me/cosmetics/equip", { frame, sticker });
            toast.success("Cosméticos atualizados");
            if (refresh) await refresh();
        } catch (e) {
            toastApiError(e);
        } finally {
            setBusy(false);
        }
    }

    if (loading) return <div className="text-sm font-mono text-black/50 py-4 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> A carregar…</div>;

    const frames = catalog.filter((c) => c.type === "frame");
    const stickers = catalog.filter((c) => c.type === "sticker");
    const previewUser = {
        ...user,
        cosmetics_equipped: { frame, sticker },
    };

    return (
        <div className="space-y-4" data-testid="cosmetics-picker">
            <div className="flex items-center gap-1.5 mb-2">
                <Sparkles size={14} className="text-orange-500" />
                <span className="font-heading font-semibold text-sm">Cosméticos</span>
                <span className="text-[11px] font-mono text-black/40">grátis</span>
            </div>
            <div className="flex items-center gap-4 p-3 rounded-xl bg-black/[0.03] border border-black/[0.06]">
                <Avatar user={previewUser} size={72} />
                <div className="text-xs font-mono text-black/55">
                    <div className="mb-0.5">Preview</div>
                    <div className="text-black/40">@{user?.username}</div>
                </div>
            </div>

            <div>
                <h4 className="text-xs font-heading font-semibold uppercase tracking-wider text-black/55 mb-2">Frame</h4>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                    <button
                        onClick={() => setFrame("")}
                        className={`p-2 rounded-lg border ${!frame ? "border-black bg-black/[0.04]" : "border-black/10 hover:border-black/25"}`}
                        data-testid="frame-none"
                    >
                        <div className="text-[10px] font-mono">Nenhuma</div>
                    </button>
                    {frames.map((f) => (
                        <button
                            key={f.id}
                            onClick={() => setFrame(f.id)}
                            className={`p-2 rounded-lg border flex flex-col items-center gap-1 ${frame === f.id ? "border-black bg-black/[0.04]" : "border-black/10 hover:border-black/25"}`}
                            data-testid={`frame-${f.id}`}
                        >
                            <div className={`w-8 h-8 rounded-full bg-black/10 ${f.css}`} />
                            <span className="text-[10px] font-mono truncate w-full text-center">{f.label}</span>
                            {frame === f.id && <Check size={10} className="text-black absolute" />}
                        </button>
                    ))}
                </div>
            </div>

            <div>
                <h4 className="text-xs font-heading font-semibold uppercase tracking-wider text-black/55 mb-2">Sticker</h4>
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
                    <button
                        onClick={() => setSticker("")}
                        className={`p-2 rounded-lg border ${!sticker ? "border-black bg-black/[0.04]" : "border-black/10 hover:border-black/25"}`}
                        data-testid="sticker-none"
                    >
                        <div className="text-[10px] font-mono">Nenhum</div>
                    </button>
                    {stickers.map((s) => (
                        <button
                            key={s.id}
                            onClick={() => setSticker(s.id)}
                            className={`p-2 rounded-lg border flex flex-col items-center gap-1 ${sticker === s.id ? "border-black bg-black/[0.04]" : "border-black/10 hover:border-black/25"}`}
                            data-testid={`sticker-${s.id}`}
                        >
                            <div className="text-xl">{s.emoji}</div>
                            <span className="text-[10px] font-mono truncate w-full text-center">{s.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            <button
                onClick={save}
                disabled={busy}
                className="px-4 py-2 rounded-full bg-black text-white text-xs font-mono disabled:opacity-40 hover:bg-black/85 flex items-center gap-2"
                data-testid="cosmetics-save"
            >
                {busy && <Loader2 size={12} className="animate-spin" />}
                Equipar
            </button>
        </div>
    );
}
