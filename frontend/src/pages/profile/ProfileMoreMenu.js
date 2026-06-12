import { useEffect, useRef, useState } from "react";
import {
    MoreHorizontal, Ban, BellOff, BellRing, Flag, Star, Copy as CopyIcon,
    Download, X, ShieldOff, VolumeX, Volume2,
} from "lucide-react";
import { toast } from "sonner";
import { api, toastApiError } from "../../lib/api";
import { Spinner } from "../../components/Spinner";
import { confirmDialog } from "../../components/ConfirmDialog";

const REASONS = [
    { key: "spam", label: "Spam" },
    { key: "harassment", label: "Assédio / Bullying" },
    { key: "hate", label: "Discurso de ódio" },
    { key: "impersonation", label: "Identidade falsa" },
    { key: "nsfw", label: "Conteúdo impróprio" },
    { key: "other", label: "Outro" },
];

function MenuRow({ icon: Icon, label, onClick, danger, busy, active }) {
    const bg = danger ? "transparent" : active ? "#0A0A0A" : "transparent";
    const fg = danger ? "#C8102E" : active ? "#FFCC29" : "#0A0A0A";
    return (
        <button
            onClick={onClick} disabled={busy}
            className="w-full text-left px-3 py-2.5 inline-flex items-center gap-2 font-black uppercase transition-colors tap-shrink"
            style={{
                background: bg,
                color: fg,
                fontSize: 12,
                letterSpacing: "0.04em",
            }}
        >
            {busy ? <Spinner size={12} /> : <Icon size={13} strokeWidth={2.4} />} {label}
        </button>
    );
}

function ReportModal({ targetLabel, onCancel, onSubmit }) {
    const [reason, setReason] = useState("spam");
    const [detail, setDetail] = useState("");
    const [busy, setBusy] = useState(false);
    return (
        <div className="fixed inset-0 z-[400] grid place-items-center p-4 anim-fade-up" style={{ background: "rgba(10,10,10,0.55)" }}>
            <div
                className="max-w-md w-full p-6"
                style={{
                    background: "#fff",
                    border: "1px solid rgba(10,10,10,0.10)",
                    boxShadow: "0 1px 2px rgba(10,10,10,0.05), 0 8px 20px -10px rgba(10,10,10,0.15)",
                    borderRadius: 14,
                }}
            >
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <p className="type-overline">Reportar</p>
                        <h3 className="font-black tracking-tight mt-1.5" style={{ fontSize: 20, color: "#0A0A0A" }}>{targetLabel}</h3>
                    </div>
                    <button
                        onClick={onCancel}
                        className="w-9 h-9 grid place-items-center tap-shrink"
                        style={{ background: "#FBFAF6", color: "#0A0A0A", border: "1px solid rgba(10,10,10,0.10)", borderRadius: 999 }}
                    >
                        <X size={14} strokeWidth={2.4} />
                    </button>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-3">
                    {REASONS.map((r) => {
                        const active = reason === r.key;
                        return (
                            <button
                                key={r.key}
                                onClick={() => setReason(r.key)}
                                className="text-left px-3 py-2 font-black uppercase tap-shrink"
                                style={{
                                    background: active ? "#0A0A0A" : "#fff",
                                    color: active ? "#FFCC29" : "#0A0A0A",
                                    border: "1px solid rgba(10,10,10,0.10)",
                                    boxShadow: active ? "0 1px 2px rgba(10,10,10,0.05), 0 8px 20px -10px rgba(10,10,10,0.15)" : "0 1px 2px rgba(10,10,10,0.05), 0 8px 20px -10px rgba(10,10,10,0.15)",
                                    borderRadius: 8,
                                    fontSize: 11.5,
                                    letterSpacing: "0.04em",
                                }}
                            >
                                {r.label}
                            </button>
                        );
                    })}
                </div>
                <textarea
                    value={detail} onChange={(e) => setDetail(e.target.value)}
                    rows={3} maxLength={400}
                    placeholder="Detalhes (opcional)…"
                    className="w-full px-3 py-2 focus:outline-none resize-none mb-3 font-medium"
                    style={{
                        background: "#FBFAF6",
                        color: "#0A0A0A",
                        border: "1px solid rgba(10,10,10,0.10)",
                        boxShadow: "0 1px 2px rgba(10,10,10,0.05), 0 8px 20px -10px rgba(10,10,10,0.15)",
                        borderRadius: 10,
                        fontSize: 13.5,
                    }}
                />
                <div className="flex justify-end gap-2">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 font-black uppercase tap-shrink"
                        style={{ fontSize: 11, letterSpacing: "0.04em", color: "rgba(10,10,10,0.6)" }}
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={async () => { setBusy(true); await onSubmit({ reason, detail }); setBusy(false); }}
                        disabled={busy}
                        className="btn-obsidian px-5 py-2 disabled:opacity-40 inline-flex items-center gap-1.5"
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
            a.download = `lusorae-${profile.username}-${new Date().toISOString().slice(0, 10)}.json`;
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

    const blockAction = async () => {
        if (!rel.blocked) {
            const ok = await confirmDialog({
                title: `Bloquear @${profile.username}?`,
                description: "Deixarão de se ver mutuamente. As tuas publicações ficam invisíveis para esta pessoa e as dela para ti.",
                confirmText: "Bloquear",
                danger: true,
            });
            if (!ok) return;
        }
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
                    className="w-10 h-10 grid place-items-center tap-shrink"
                    style={{
                        background: "#fff", color: "#0A0A0A",
                        border: "1px solid rgba(10,10,10,0.10)",
                        boxShadow: "0 1px 2px rgba(10,10,10,0.05), 0 8px 20px -10px rgba(10,10,10,0.15)",
                        borderRadius: 999,
                    }}
                >
                    <MoreHorizontal size={15} strokeWidth={2.2} />
                </button>
                {open && (
                    <div
                        className="absolute right-0 top-full mt-2 z-40 w-60 py-1.5 anim-fade-up overflow-hidden"
                        style={{
                            background: "#fff",
                            border: "1px solid rgba(10,10,10,0.10)",
                            boxShadow: "0 1px 2px rgba(10,10,10,0.05), 0 8px 20px -10px rgba(10,10,10,0.15)",
                            borderRadius: 12,
                        }}
                    >
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
                    className="w-10 h-10 grid place-items-center tap-shrink"
                    style={{
                        background: "#fff", color: "#0A0A0A",
                        border: "1px solid rgba(10,10,10,0.10)",
                        boxShadow: "0 1px 2px rgba(10,10,10,0.05), 0 8px 20px -10px rgba(10,10,10,0.15)",
                        borderRadius: 999,
                    }}
                >
                    <MoreHorizontal size={15} strokeWidth={2.2} />
                </button>
                {open && (
                    <div
                        className="absolute right-0 top-full mt-2 z-40 w-64 py-1.5 anim-fade-up overflow-hidden"
                        style={{
                            background: "#fff",
                            border: "1px solid rgba(10,10,10,0.10)",
                            boxShadow: "0 1px 2px rgba(10,10,10,0.05), 0 8px 20px -10px rgba(10,10,10,0.15)",
                            borderRadius: 12,
                        }}
                    >
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
                        <div className="my-1" style={{ borderTop: "1px solid rgba(10,10,10,0.08)" }} />
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
