import { useEffect, useRef, useState } from "react";
import {
    MoreHorizontal, Ban, BellOff, BellRing, Flag, Star, Copy as CopyIcon,
    Download, X, ShieldOff, VolumeX, Volume2,
} from "lucide-react";
import { toast } from "sonner";
import { api, toastApiError } from "../../lib/api";
import { Spinner } from "../../components/Spinner";

const REASONS = [
    { key: "spam", label: "Spam" },
    { key: "harassment", label: "Assédio / Bullying" },
    { key: "hate", label: "Discurso de ódio" },
    { key: "impersonation", label: "Identidade falsa" },
    { key: "nsfw", label: "Conteúdo impróprio" },
    { key: "other", label: "Outro" },
];

function MenuRow({ icon: Icon, label, onClick, danger, busy, active }) {
    return (
        <button
            onClick={onClick} disabled={busy}
            className={`w-full text-left px-3 py-2.5 text-[13px] font-mono inline-flex items-center gap-2 transition ${
                danger ? "text-red-600 hover:bg-red-50"
                : active ? "bg-black text-white hover:bg-black/90"
                : "text-black/80 hover:bg-black/[0.04]"
            }`}
        >
            {busy ? <Spinner size={12} /> : <Icon size={13} />} {label}
        </button>
    );
}

function ReportModal({ targetLabel, onCancel, onSubmit }) {
    const [reason, setReason] = useState("spam");
    const [detail, setDetail] = useState("");
    const [busy, setBusy] = useState(false);
    return (
        <div className="fixed inset-0 z-[400] bg-black/45 backdrop-blur-sm grid place-items-center p-4 anim-fade-up">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <p className="type-overline">Reportar</p>
                        <h3 className="font-display text-[20px] tracking-tight">{targetLabel}</h3>
                    </div>
                    <button onClick={onCancel} className="text-black/40 hover:text-black tap-shrink"><X size={18} /></button>
                </div>
                <div className="space-y-1 mb-3">
                    {REASONS.map((r) => (
                        <button
                            key={r.key}
                            onClick={() => setReason(r.key)}
                            className={`w-full text-left px-3 py-2 rounded-xl text-[13.5px] font-mono transition ${
                                reason === r.key ? "bg-black text-white" : "bg-black/[0.04] hover:bg-black/[0.08] text-black/75"
                            }`}
                        >
                            {r.label}
                        </button>
                    ))}
                </div>
                <textarea
                    value={detail} onChange={(e) => setDetail(e.target.value)}
                    rows={3} maxLength={400}
                    placeholder="Detalhes (opcional)…"
                    className="w-full bg-[#fafafa] border border-black/[0.08] rounded-2xl px-3 py-2 text-[13.5px] focus:bg-white focus:border-black/30 focus:outline-none resize-none mb-3"
                />
                <div className="flex justify-end gap-2">
                    <button onClick={onCancel} className="px-4 py-2 text-[11px] font-mono uppercase tracking-[0.14em] text-black/60 hover:text-black rounded-full hover:bg-black/[0.04]">
                        Cancelar
                    </button>
                    <button
                        onClick={async () => { setBusy(true); await onSubmit({ reason, detail }); setBusy(false); }}
                        disabled={busy}
                        className="btn-obsidian text-[11px] px-5 py-2 disabled:opacity-40 inline-flex items-center gap-1.5"
                    >
                        {busy && <Spinner size={11} />} Submeter
                    </button>
                </div>
            </div>
        </div>
    );
}

export function ProfileMoreMenu({ profile, onProfileUpdate }) {
    const [open, setOpen] = useState(false);
    const [rel, setRel] = useState({ blocked: false, muted: false, favorited: false, notify: false });
    const [reportOpen, setReportOpen] = useState(false);
    const [busyKey, setBusyKey] = useState(null);
    const ref = useRef(null);

    useEffect(() => {
        const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        if (open) {
            document.addEventListener("mousedown", onDoc);
            return () => document.removeEventListener("mousedown", onDoc);
        }
    }, [open]);

    useEffect(() => {
        if (!open || profile.is_self) return;
        let alive = true;
        (async () => {
            try {
                const { data } = await api.get(`/users/${profile.username}/relation`);
                if (alive) setRel(data);
            } catch { /* silent */ }
        })();
        return () => { alive = false; };
    }, [open, profile.username, profile.is_self]);

    const copyProfile = async () => {
        const url = `${window.location.origin}/u/${profile.username}`;
        try {
            await navigator.clipboard.writeText(url);
            toast.success("Link do perfil copiado");
        } catch { toast.error("Não foi possível copiar"); }
        setOpen(false);
    };

    const exportData = async () => {
        setBusyKey("export");
        try {
            const { data } = await api.get("/users/me/export");
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `vermillion-${profile.username}-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
            toast.success("Dados exportados");
        } catch (e) { toastApiError(e); } finally { setBusyKey(null); setOpen(false); }
    };

    const callToggle = async (action, key, successLabel, undoneLabel) => {
        setBusyKey(key);
        try {
            const { data } = await api.post(`/users/${profile.username}/${action}`);
            const fld = action === "block" ? "blocked"
                : action === "mute" ? "muted"
                : action === "favorite" ? "favorited"
                : action === "notify" ? "notify"
                : null;
            if (fld) setRel((r) => ({ ...r, [fld]: data[fld] }));
            toast.success(data[fld] ? successLabel : undoneLabel);
            if (action === "block" && onProfileUpdate) {
                // Refresh follow state — backend unfollowed for us
                onProfileUpdate({ is_following: false });
            }
        } catch (e) { toastApiError(e); } finally { setBusyKey(null); }
    };

    const blockAction = () => {
        if (!rel.blocked && !window.confirm(`Bloquear @${profile.username}? Deixarão de se ver mutuamente.`)) return;
        callToggle("block", "block", `@${profile.username} bloqueado`, "Desbloqueado");
    };

    const submitReport = async ({ reason, detail }) => {
        try {
            await api.post(`/users/${profile.username}/report`, { reason, detail });
            toast.success("Reportado. Obrigado.");
            setReportOpen(false);
            setOpen(false);
        } catch (e) { toastApiError(e); }
    };

    if (profile.is_self) {
        return (
            <div className="relative" ref={ref}>
                <button
                    onClick={() => setOpen((o) => !o)}
                    data-testid="profile-more-btn"
                    title="Mais opções"
                    className="w-10 h-10 grid place-items-center rounded-full border border-black/[0.10] hover:bg-black/[0.04] transition tap-shrink"
                >
                    <MoreHorizontal size={16} />
                </button>
                {open && (
                    <div className="absolute right-0 top-full mt-2 z-40 w-60 bg-white border border-black/[0.08] rounded-2xl shadow-xl py-1.5 anim-fade-up overflow-hidden">
                        <MenuRow icon={CopyIcon} label="Copiar link do perfil" onClick={copyProfile} />
                        <MenuRow icon={Download} label="Exportar dados (JSON)" onClick={exportData} busy={busyKey === "export"} />
                    </div>
                )}
            </div>
        );
    }

    return (
        <>
            <div className="relative" ref={ref}>
                <button
                    onClick={() => setOpen((o) => !o)}
                    data-testid="profile-more-btn"
                    title="Mais opções"
                    className="w-10 h-10 grid place-items-center rounded-full border border-black/[0.10] hover:bg-black/[0.04] transition tap-shrink"
                >
                    <MoreHorizontal size={16} />
                </button>
                {open && (
                    <div className="absolute right-0 top-full mt-2 z-40 w-64 bg-white border border-black/[0.08] rounded-2xl shadow-xl py-1.5 anim-fade-up overflow-hidden">
                        <MenuRow icon={CopyIcon} label="Copiar link do perfil" onClick={copyProfile} />
                        <MenuRow
                            icon={Star}
                            label={rel.favorited ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                            onClick={() => callToggle("favorite", "favorite", "Adicionado aos favoritos", "Removido dos favoritos")}
                            busy={busyKey === "favorite"}
                            active={rel.favorited}
                        />
                        <MenuRow
                            icon={rel.notify ? BellRing : BellOff}
                            label={rel.notify ? "Desativar notificações" : "Ativar notificações"}
                            onClick={() => callToggle("notify", "notify", "Notificações ativadas", "Notificações desativadas")}
                            busy={busyKey === "notify"}
                            active={rel.notify}
                        />
                        <MenuRow
                            icon={rel.muted ? Volume2 : VolumeX}
                            label={rel.muted ? "Reativar utilizador" : "Silenciar utilizador"}
                            onClick={() => callToggle("mute", "mute", "Utilizador silenciado", "Utilizador reativado")}
                            busy={busyKey === "mute"}
                            active={rel.muted}
                        />
                        <div className="h-px bg-black/[0.06] my-1" />
                        <MenuRow
                            icon={Flag} label="Reportar utilizador"
                            onClick={() => { setOpen(false); setReportOpen(true); }}
                            danger
                        />
                        <MenuRow
                            icon={rel.blocked ? ShieldOff : Ban}
                            label={rel.blocked ? "Desbloquear" : "Bloquear"}
                            onClick={blockAction}
                            busy={busyKey === "block"}
                            danger
                        />
                    </div>
                )}
            </div>
            {reportOpen && (
                <ReportModal
                    targetLabel={`@${profile.username}`}
                    onCancel={() => setReportOpen(false)}
                    onSubmit={submitReport}
                />
            )}
        </>
    );
}
