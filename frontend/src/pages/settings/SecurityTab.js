import { useCallback, useEffect, useMemo, useState } from "react";
import {
    ShieldCheck, KeyRound, Smartphone, Monitor, AlertCircle, CheckCircle2,
    Clock, X, Loader2, Trash2, MailCheck, Bell, ShieldAlert, Copy,
    RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { api, toastApiError } from "../../lib/api";
import { confirmDialog } from "../../components/ConfirmDialog";
import { SectionHeader, SwitchPill, StatusPill } from "./_shared";

/* =============================================================
   SecurityTab — Sessões · 2FA · Email de recuperação · Login alerts
   · Mudança de palavra-passe. Tudo wired ao backend real.
   ============================================================= */

function formatRelative(iso) {
    if (!iso) return null;
    try {
        const diff = Date.now() - new Date(iso).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return "agora mesmo";
        if (mins < 60) return `há ${mins} min`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `há ${hours}h`;
        const days = Math.floor(hours / 24);
        if (days < 30) return `há ${days} ${days === 1 ? "dia" : "dias"}`;
        const months = Math.floor(days / 30);
        if (months < 12) return `há ${months} ${months === 1 ? "mês" : "meses"}`;
        const years = Math.floor(months / 12);
        return `há ${years} ${years === 1 ? "ano" : "anos"}`;
    } catch {
        return null;
    }
}

/* =====================================================================
   2FA setup flow modal — scan QR → confirm code → show backup codes
   ===================================================================== */
function TwoFaSetupModal({ onClose, onDone }) {
    const [step, setStep] = useState("loading");
    const [setup, setSetup] = useState(null);
    const [code, setCode] = useState("");
    const [busy, setBusy] = useState(false);
    const [backup, setBackup] = useState([]);

    useEffect(() => {
        (async () => {
            try {
                const { data } = await api.post("/auth/2fa/setup");
                setSetup(data);
                setStep("scan");
            } catch (e) {
                toastApiError(e);
                onClose();
            }
        })();
    }, [onClose]);

    const verify = async () => {
        const c = code.trim();
        if (c.length < 6) return toast.error("Introduz o código de 6 dígitos");
        setBusy(true);
        try {
            const { data } = await api.post("/auth/2fa/verify", { code: c });
            setBackup(data.backup_codes || []);
            setStep("backup");
            toast.success("2FA ativado");
            onDone?.();
        } catch (e) {
            toastApiError(e);
        } finally { setBusy(false); }
    };

    const copyBackups = async () => {
        try {
            await navigator.clipboard.writeText(backup.join("\n"));
            toast.success("Códigos copiados");
        } catch { toast.error("Não foi possível copiar"); }
    };

    return (
        <div
            className="fixed inset-0 z-50 grid place-items-center px-4"
            style={{ background: "rgba(10,10,10,0.65)" }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
            data-testid="twofa-modal"
        >
            <div
                className="relative w-full max-w-md overflow-hidden"
                style={{
                    background: "#fff",
                    border: "1px solid rgba(10,10,10,0.10)",
                    boxShadow: "0 1px 2px rgba(10,10,10,0.05), 0 8px 20px -10px rgba(10,10,10,0.15)",
                    borderRadius: 14,
                }}
            >
                <button onClick={onClose} aria-label="Fechar"
                    className="absolute top-3 right-3 w-8 h-8 grid place-items-center z-10 tap-shrink"
                    style={{ background: "#FBFAF6", color: "#0A0A0A", border: "1px solid rgba(10,10,10,0.10)", borderRadius: 999 }}
                ><X size={14} strokeWidth={2.4} /></button>

                <div className="p-6">
                    <p className="type-overline mb-1">Autenticação em dois passos</p>

                    {step === "loading" && (
                        <div className="py-10 text-center text-black/50 text-[12px] font-mono">
                            <Loader2 size={16} className="animate-spin inline mr-2" /> A preparar…
                        </div>
                    )}

                    {step === "scan" && setup && (
                        <>
                            <h3 className="font-display text-[19px] font-bold tracking-tight text-black leading-tight">Liga uma app TOTP</h3>
                            <p className="text-[12px] text-black/55 mt-1">
                                Lê este código com a Google Authenticator, 1Password, Authy ou outra app TOTP.
                            </p>
                            <div className="mt-4 p-4 bg-paper rounded-2xl border border-black/[0.06] grid place-items-center">
                                <img src={setup.qr_data_url} alt="QR code 2FA" width={200} height={200} className="block rounded-md" data-testid="twofa-qr" />
                            </div>
                            <div className="mt-3">
                                <label className="type-overline">Chave manual</label>
                                <div className="mt-1 flex items-center gap-2 px-3 py-2 bg-black/[0.04] rounded-xl border border-black/[0.06]">
                                    <code className="flex-1 text-[12px] font-mono tracking-wider break-all text-black/70">{setup.secret}</code>
                                    <button type="button"
                                        onClick={() => { navigator.clipboard.writeText(setup.secret); toast.success("Copiado"); }}
                                        className="text-black/55 hover:text-black" aria-label="Copiar chave"><Copy size={13} /></button>
                                </div>
                            </div>
                            <button type="button" onClick={() => setStep("verify")}
                                className="btn-obsidian w-full mt-5 py-2.5 text-[12px]" data-testid="twofa-next">
                                Já adicionei — continuar
                            </button>
                        </>
                    )}

                    {step === "verify" && (
                        <>
                            <h3 className="font-display text-[19px] font-bold tracking-tight text-black leading-tight">Confirma o código</h3>
                            <p className="text-[12px] text-black/55 mt-1">Introduz o código de 6 dígitos da tua app.</p>
                            <input type="text" inputMode="numeric" maxLength={8} value={code}
                                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
                                placeholder="000000"
                                className="mt-4 vm-input text-center text-[22px] font-mono tracking-[0.5em] tabular-nums"
                                data-testid="twofa-code-input" autoFocus />
                            <div className="flex gap-2 mt-4">
                                <button type="button" onClick={() => setStep("scan")}
                                    className="flex-1 px-3 py-2 rounded-full border border-black/15 text-[12px] hover:border-black/40">Voltar</button>
                                <button type="button" onClick={verify} disabled={busy || code.trim().length < 6}
                                    className="flex-1 btn-obsidian px-3 py-2 text-[12px] disabled:opacity-40"
                                    data-testid="twofa-verify-btn">
                                    {busy ? <Loader2 size={12} className="animate-spin inline mr-1" /> : null}
                                    Ativar 2FA
                                </button>
                            </div>
                        </>
                    )}

                    {step === "backup" && (
                        <>
                            <h3 className="font-display text-[19px] font-bold tracking-tight text-black leading-tight">Guarda os códigos de backup</h3>
                            <p className="text-[12px] text-black/55 mt-1">
                                Estes códigos só são mostrados uma vez. Cada um é de uso único — guarda-os num sítio seguro.
                            </p>
                            <div className="mt-3 grid grid-cols-2 gap-2 p-4 bg-paper border border-black/[0.06] rounded-2xl">
                                {backup.map((c) => (
                                    <code key={c} className="font-mono text-[13px] tracking-wider text-black/80 select-all">{c}</code>
                                ))}
                            </div>
                            <div className="flex gap-2 mt-4">
                                <button type="button" onClick={copyBackups}
                                    className="flex-1 px-3 py-2 rounded-full border border-black/15 text-[12px] hover:border-black/40 inline-flex items-center justify-center gap-1.5">
                                    <Copy size={12} /> Copiar
                                </button>
                                <button type="button" onClick={onClose}
                                    className="flex-1 btn-obsidian px-3 py-2 text-[12px]" data-testid="twofa-done">
                                    Concluído
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

/* =====================================================================
   Disable 2FA modal — password + TOTP/backup
   ===================================================================== */
function TwoFaDisableModal({ onClose, onDone }) {
    const [password, setPassword] = useState("");
    const [code, setCode] = useState("");
    const [busy, setBusy] = useState(false);
    const disable = async () => {
        if (!password) return toast.error("Introduz a palavra-passe");
        if (!code) return toast.error("Introduz o código 2FA");
        setBusy(true);
        try {
            await api.post("/auth/2fa/disable", { password, code });
            toast.success("2FA desativado");
            onDone?.();
            onClose();
        } catch (e) {
            toastApiError(e);
        } finally { setBusy(false); }
    };
    return (
        <div className="fixed inset-0 z-50 grid place-items-center px-4"
            style={{ background: "rgba(10,10,10,0.65)" }}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="relative w-full max-w-md overflow-hidden p-6"
                style={{ background: "#fff", border: "1px solid rgba(10,10,10,0.10)", boxShadow: "0 1px 2px rgba(10,10,10,0.05), 0 8px 20px -10px rgba(10,10,10,0.15)", borderRadius: 14 }}>
                <button onClick={onClose} aria-label="Fechar"
                    className="absolute top-3 right-3 w-8 h-8 grid place-items-center tap-shrink"
                    style={{ background: "#FBFAF6", color: "#0A0A0A", border: "1px solid rgba(10,10,10,0.10)", borderRadius: 999 }}
                ><X size={14} strokeWidth={2.4} /></button>
                <p className="type-overline mb-1">Desativar 2FA</p>
                <h3 className="font-display text-[19px] font-bold tracking-tight text-black leading-tight">Confirma a tua identidade</h3>
                <p className="text-[12px] text-black/55 mt-1">Vais perder a camada extra de segurança até reativares.</p>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                    placeholder="Palavra-passe atual" className="mt-4 vm-input" autoFocus />
                <input type="text" inputMode="numeric" value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
                    placeholder="Código 2FA ou backup" className="mt-2 vm-input font-mono tracking-widest" />
                <div className="flex gap-2 mt-4">
                    <button type="button" onClick={onClose}
                        className="flex-1 px-3 py-2 rounded-full border border-black/15 text-[12px] hover:border-black/40">Cancelar</button>
                    <button type="button" onClick={disable} disabled={busy}
                        className="flex-1 px-3 py-2 rounded-full text-[12px] bg-red-soft text-white hover:opacity-90 disabled:opacity-40"
                        data-testid="twofa-disable-confirm">
                        {busy ? <Loader2 size={12} className="animate-spin inline mr-1" /> : null}
                        Desativar
                    </button>
                </div>
            </div>
        </div>
    );
}

/* =====================================================================
   Main SecurityTab — accepts `user` + `onUserUpdate` real props.
   ===================================================================== */
export function SecurityTab({ user, onUserUpdate }) {
    const [pwdForm, setPwdForm] = useState({ current: "", next: "", confirm: "" });
    const [busy, setBusy] = useState(false);

    // Sessions
    const [sessions, setSessions] = useState([]);
    const [sessionsLoading, setSessionsLoading] = useState(true);
    const [revokingId, setRevokingId] = useState(null);

    // 2FA
    const [twoFaStatus, setTwoFaStatus] = useState({ enabled: false, backup_codes_left: 0 });
    const [twoFaSetupOpen, setTwoFaSetupOpen] = useState(false);
    const [twoFaDisableOpen, setTwoFaDisableOpen] = useState(false);
    const [regenBusy, setRegenBusy] = useState(false);

    // Recovery email
    const [recoveryEmail, setRecoveryEmail] = useState(user?.recovery_email || "");
    const [recoveryDirty, setRecoveryDirty] = useState(false);
    const [recoveryBusy, setRecoveryBusy] = useState(false);

    // Login alerts
    const [loginAlerts, setLoginAlerts] = useState(user?.login_alerts_enabled !== false);
    const [loginAlertsBusy, setLoginAlertsBusy] = useState(false);

    useEffect(() => { setRecoveryEmail(user?.recovery_email || ""); }, [user?.recovery_email]);
    useEffect(() => { setLoginAlerts(user?.login_alerts_enabled !== false); }, [user?.login_alerts_enabled]);

    const loadSessions = useCallback(async () => {
        setSessionsLoading(true);
        try {
            const { data } = await api.get("/auth/sessions");
            setSessions(Array.isArray(data) ? data : []);
        } catch (e) {
            toastApiError(e);
        } finally { setSessionsLoading(false); }
    }, []);
    const loadTwoFa = useCallback(async () => {
        try {
            const { data } = await api.get("/auth/2fa/status");
            setTwoFaStatus(data || { enabled: false, backup_codes_left: 0 });
        } catch {/* silent */}
    }, []);

    useEffect(() => { loadSessions(); loadTwoFa(); }, [loadSessions, loadTwoFa]);

    // ----- password change -----
    const onChangePassword = async (e) => {
        e.preventDefault();
        if (!pwdForm.current || !pwdForm.next) return toast.error("Preenche todos os campos");
        if (pwdForm.next.length < 8) return toast.error("A nova palavra-passe deve ter pelo menos 8 caracteres");
        if (pwdForm.next !== pwdForm.confirm) return toast.error("As palavras-passe não coincidem");
        if (pwdForm.current === pwdForm.next) return toast.error("A nova palavra-passe tem de ser diferente da atual");
        setBusy(true);
        try {
            const { data } = await api.post("/auth/change-password", {
                current_password: pwdForm.current,
                new_password: pwdForm.next,
            });
            if (onUserUpdate && data?.password_changed_at) {
                onUserUpdate({ password_changed_at: data.password_changed_at });
            }
            setPwdForm({ current: "", next: "", confirm: "" });
            toast.success("Palavra-passe alterada · outras sessões foram terminadas");
            loadSessions();
        } catch (err) { toastApiError(err); } finally { setBusy(false); }
    };

    const pwdStrength = (() => {
        const p = pwdForm.next;
        if (!p) return null;
        let s = 0;
        if (p.length >= 8) s += 1;
        if (p.length >= 12) s += 1;
        if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s += 1;
        if (/\d/.test(p)) s += 1;
        if (/[^a-zA-Z\d]/.test(p)) s += 1;
        return s;
    })();
    const pwdLabel = ["", "Muito fraca", "Fraca", "Média", "Forte", "Excelente"][pwdStrength || 0];
    const pwdColor = ["", "#dc6055", "#dc6055", "#d4a418", "#16a34a", "#0a0a0a"][pwdStrength || 0];

    const lastChange = formatRelative(user?.password_changed_at);

    // ----- sessions -----
    const revokeSession = async (jti) => {
        const ok = await confirmDialog({
            title: "Terminar esta sessão?",
            body: "Vai deixar imediatamente de poder usar a app neste dispositivo.",
            confirmLabel: "Terminar sessão",
            danger: true,
        });
        if (!ok) return;
        setRevokingId(jti);
        try {
            await api.delete(`/auth/sessions/${jti}`);
            toast.success("Sessão terminada");
            setSessions((s) => s.filter((x) => x.id !== jti));
        } catch (e) { toastApiError(e); } finally { setRevokingId(null); }
    };
    const revokeAllOthers = async () => {
        const ok = await confirmDialog({
            title: "Terminar todas as outras sessões?",
            body: "Mantém-te ligado neste dispositivo. Os outros vão precisar de iniciar sessão de novo.",
            confirmLabel: "Terminar outras",
            danger: true,
        });
        if (!ok) return;
        try {
            const { data } = await api.post("/auth/sessions/revoke-others");
            toast.success(`${data.revoked || 0} sessão(ões) terminadas`);
            loadSessions();
        } catch (e) { toastApiError(e); }
    };

    // ----- recovery email -----
    const saveRecovery = async () => {
        setRecoveryBusy(true);
        try {
            const { data } = await api.patch("/users/me", { recovery_email: recoveryEmail.trim() });
            onUserUpdate?.(data);
            setRecoveryDirty(false);
            toast.success(recoveryEmail.trim() ? "Email de recuperação guardado" : "Email de recuperação removido");
        } catch (e) { toastApiError(e); } finally { setRecoveryBusy(false); }
    };

    // ----- login alerts toggle -----
    const toggleLoginAlerts = async (next) => {
        setLoginAlerts(next);
        setLoginAlertsBusy(true);
        try {
            const { data } = await api.patch("/users/me", { login_alerts_enabled: next });
            onUserUpdate?.(data);
            toast.success(next ? "Alertas de início de sessão ligados" : "Alertas de início de sessão desligados");
        } catch (e) {
            setLoginAlerts(!next);
            toastApiError(e);
        } finally { setLoginAlertsBusy(false); }
    };

    // ----- regenerate backup codes -----
    const regenerateBackup = async () => {
        const ok = await confirmDialog({
            title: "Gerar novos códigos de backup?",
            body: "Os códigos antigos vão deixar de funcionar imediatamente. Mostramos-te os novos uma única vez.",
            confirmLabel: "Gerar novos",
            danger: false,
        });
        if (!ok) return;
        setRegenBusy(true);
        try {
            const { data } = await api.post("/auth/2fa/regenerate-backup");
            const codes = (data?.backup_codes || []).join("\n");
            await navigator.clipboard.writeText(codes).catch(() => {});
            toast.success("Códigos copiados — guarda-os já num sítio seguro");
            loadTwoFa();
        } catch (e) { toastApiError(e); }
        finally { setRegenBusy(false); }
    };

    const otherSessionsCount = useMemo(() => sessions.filter((s) => !s.current).length, [sessions]);

    return (
        <div className="px-4 lg:px-8 py-5 lg:py-7" data-testid="settings-security">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 lg:gap-4 max-w-5xl">

                {/* ============== 2FA ============== */}
                <SectionHeader
                    idx={1}
                    overline="Autenticação em dois passos"
                    title="Camada extra contra acessos não autorizados"
                    desc="Mesmo que descubram a tua palavra-passe, não entram sem um código TOTP."
                />
                <div className="lg:col-span-12 card-lux p-5">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                            <div
                                className="w-12 h-12 grid place-items-center shrink-0"
                                style={{
                                    background: twoFaStatus.enabled ? "#046A38" : "#FBFAF6",
                                    color: twoFaStatus.enabled ? "#fff" : "rgba(10,10,10,0.55)",
                                    border: "1px solid rgba(10,10,10,0.10)",
                                    borderRadius: 8,
                                }}
                            >
                                <ShieldCheck size={17} strokeWidth={2.2} />
                            </div>
                            <div className="min-w-0">
                                <div className="font-black tracking-tight flex items-center gap-2 flex-wrap" style={{ fontSize: 14.5, color: "#0A0A0A" }}>
                                    Estado actual
                                    {twoFaStatus.enabled
                                        ? <StatusPill tone="success">Ativo</StatusPill>
                                        : <StatusPill tone="neutral">Inativo</StatusPill>}
                                </div>
                                <p className="text-[12.5px] mt-2 leading-relaxed font-medium" style={{ color: "rgba(10,10,10,0.62)" }}>
                                    {twoFaStatus.enabled
                                        ? "A tua conta está protegida com TOTP. Guarda os códigos de backup num sítio seguro."
                                        : "Recomendamos ativar 2FA usando Google Authenticator, 1Password, Authy ou outra app TOTP."}
                                </p>
                                {twoFaStatus.enabled && (
                                    <p className="font-mono text-[11.5px] mt-2 font-medium" style={{ color: "rgba(10,10,10,0.6)" }}>
                                        Códigos de backup restantes: <span className="font-black" style={{ color: "#0A0A0A" }}>{twoFaStatus.backup_codes_left}</span>
                                    </p>
                                )}
                            </div>
                        </div>
                        <div className="shrink-0 flex items-center gap-2 flex-wrap">
                            {twoFaStatus.enabled ? (
                                <>
                                    <button type="button" onClick={regenerateBackup} disabled={regenBusy}
                                        data-testid="twofa-regenerate-btn"
                                        className="font-mono font-black uppercase px-3 py-2 inline-flex items-center gap-1.5 disabled:opacity-50 tap-shrink"
                                        style={{
                                            background: "#fff", color: "#0A0A0A",
                                            border: "1px solid rgba(10,10,10,0.10)",
                                            boxShadow: "0 1px 2px rgba(10,10,10,0.05), 0 8px 20px -10px rgba(10,10,10,0.15)",
                                            borderRadius: 999,
                                            fontSize: 11, letterSpacing: "0.10em",
                                        }}>
                                        {regenBusy ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} strokeWidth={2.4} />} Backup
                                    </button>
                                    <button type="button" onClick={() => setTwoFaDisableOpen(true)}
                                        className="font-mono font-black uppercase px-3 py-2 inline-flex items-center gap-1.5 tap-shrink"
                                        style={{
                                            background: "#C8102E", color: "#fff",
                                            border: "1px solid rgba(10,10,10,0.10)",
                                            boxShadow: "0 1px 2px rgba(10,10,10,0.05), 0 8px 20px -10px rgba(10,10,10,0.15)",
                                            borderRadius: 999,
                                            fontSize: 11, letterSpacing: "0.10em",
                                        }}
                                        data-testid="twofa-disable-btn">
                                        <ShieldAlert size={12} strokeWidth={2.4} /> Desativar
                                    </button>
                                </>
                            ) : (
                                <button type="button" onClick={() => setTwoFaSetupOpen(true)}
                                    className="btn-obsidian px-4 py-2.5 inline-flex items-center gap-1.5"
                                    data-testid="twofa-enable-btn">
                                    <ShieldCheck size={12} strokeWidth={2.4} /> Ativar 2FA
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* ============== Sessões ============== */}
                <SectionHeader
                    idx={2}
                    overline="Sessões ativas"
                    title="Onde tens a conta aberta"
                    desc="Cada dispositivo onde fizeste login. Termina o que não reconheces."
                    action={otherSessionsCount > 0 && (
                        <button type="button" onClick={revokeAllOthers} data-testid="sessions-revoke-all"
                            className="text-[10.5px] font-mono uppercase tracking-wider text-red-soft hover:underline">
                            Terminar {otherSessionsCount} {otherSessionsCount === 1 ? "outra" : "outras"}
                        </button>
                    )}
                />
                <div className="lg:col-span-12">
                    {sessionsLoading ? (
                        <div className="card-lux p-4 text-[12px] text-black/50 font-mono">
                            <Loader2 size={12} className="animate-spin inline mr-2" /> A carregar sessões…
                        </div>
                    ) : sessions.length === 0 ? (
                        <div className="card-lux p-4 text-[12px] text-black/50">Sem sessões registadas.</div>
                    ) : (
                        <ul className="space-y-2" data-testid="sessions-list">
                            {sessions.map((s) => {
                                const Icon = s.device === "mobile" ? Smartphone : Monitor;
                                return (
                                    <li key={s.id} className="card-lux p-4 flex items-center gap-3">
                                        <div
                                            className="w-11 h-11 grid place-items-center shrink-0"
                                            style={{
                                                background: s.current ? "#046A38" : "#FBFAF6",
                                                color: s.current ? "#fff" : "rgba(10,10,10,0.6)",
                                                border: "1px solid rgba(10,10,10,0.10)",
                                                borderRadius: 8,
                                            }}
                                        >
                                            <Icon size={15} strokeWidth={2.2} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-black tracking-tight flex items-center gap-1.5 flex-wrap" style={{ fontSize: 13.5, color: "#0A0A0A" }}>
                                                {s.browser} em {s.os}
                                                {s.current && <StatusPill tone="success">Atual</StatusPill>}
                                            </div>
                                            <div className="text-[11.5px] mt-1 inline-flex items-center gap-1.5 flex-wrap font-medium" style={{ color: "rgba(10,10,10,0.55)" }}>
                                                <Clock size={10} strokeWidth={2.2} /> {formatRelative(s.last_seen_at) || "—"}
                                                {s.ip && <span className="font-mono" style={{ color: "rgba(10,10,10,0.45)" }}>· {s.ip}</span>}
                                            </div>
                                        </div>
                                        {!s.current && (
                                            <button type="button" onClick={() => revokeSession(s.id)} disabled={revokingId === s.id}
                                                data-testid={`session-revoke-${s.id}`}
                                                className="shrink-0 inline-flex items-center gap-1 px-3 py-1.5 font-mono font-black uppercase tap-shrink disabled:opacity-40"
                                                style={{
                                                    background: "#fff", color: "#C8102E",
                                                    border: "1px solid rgba(10,10,10,0.10)",
                                                    boxShadow: "0 1px 2px rgba(10,10,10,0.05), 0 8px 20px -10px rgba(10,10,10,0.15)",
                                                    borderRadius: 999,
                                                    fontSize: 10.5, letterSpacing: "0.10em",
                                                }}
                                                aria-label="Terminar sessão">
                                                {revokingId === s.id ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} strokeWidth={2.4} />}
                                                Terminar
                                            </button>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>

                {/* ============== Email de recuperação ============== */}
                <SectionHeader
                    idx={3}
                    overline="Email de recuperação"
                    title="Salva-vidas para a tua conta"
                    desc="Se perderes acesso ao email principal, podes pedir recuperação por este endereço alternativo."
                />
                <div className="lg:col-span-12 card-lux p-5">
                    <div className="flex items-start gap-3 mb-3">
                        <div
                            className="w-12 h-12 grid place-items-center shrink-0"
                            style={{ background: "#FFCC29", color: "#0A0A0A", border: "1px solid rgba(10,10,10,0.10)", borderRadius: 8 }}
                        >
                            <MailCheck size={16} strokeWidth={2.2} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <div className="font-black tracking-tight" style={{ fontSize: 14, color: "#0A0A0A" }}>Endereço alternativo</div>
                            <p className="text-[12.5px] mt-1 leading-relaxed font-medium" style={{ color: "rgba(10,10,10,0.62)" }}>
                                Tem de ser diferente do email principal. Não vai aparecer no teu perfil público.
                            </p>
                        </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                        <input
                            type="email"
                            value={recoveryEmail}
                            onChange={(e) => { setRecoveryEmail(e.target.value); setRecoveryDirty(true); }}
                            placeholder="email-alternativo@exemplo.com"
                            className="vm-input flex-1"
                            data-testid="recovery-email-input"
                        />
                        <button type="button" onClick={saveRecovery} disabled={!recoveryDirty || recoveryBusy}
                            className="btn-obsidian px-4 py-2.5 text-[12px] disabled:opacity-40 inline-flex items-center justify-center gap-1.5"
                            data-testid="recovery-email-save">
                            {recoveryBusy ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                            Guardar
                        </button>
                    </div>
                </div>

                {/* ============== Login alerts ============== */}
                <SectionHeader
                    idx={4}
                    overline="Alertas de início de sessão"
                    title="Sabe quando alguém entra"
                    desc="Recebes uma notificação sempre que iniciamos sessão de um dispositivo ou IP novo."
                />
                <div className="lg:col-span-12 card-lux p-5 flex items-center justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                        <div
                            className="w-12 h-12 grid place-items-center shrink-0"
                            style={{ background: "#3E5C9A", color: "#fff", border: "1px solid rgba(10,10,10,0.10)", borderRadius: 8 }}
                        >
                            <Bell size={16} strokeWidth={2.2} />
                        </div>
                        <div className="min-w-0">
                            <div className="font-black tracking-tight" style={{ fontSize: 14, color: "#0A0A0A" }}>Notificar entradas suspeitas</div>
                            <p className="text-[12.5px] mt-1 leading-relaxed font-medium" style={{ color: "rgba(10,10,10,0.62)" }}>
                                Email + push imediato. Recomendado.
                            </p>
                        </div>
                    </div>
                    <SwitchPill
                        checked={loginAlerts}
                        onChange={toggleLoginAlerts}
                        disabled={loginAlertsBusy}
                        testid="login-alerts-toggle"
                    />
                </div>

                {/* ============== Mudar palavra-passe ============== */}
                <SectionHeader
                    idx={5}
                    overline="Palavra-passe"
                    title="Alterar palavra-passe"
                    desc="Recomendamos renovar pelo menos uma vez por ano."
                    action={lastChange && (
                        <span className="text-[10.5px] font-mono tracking-wider uppercase text-black/45 inline-flex items-center gap-1">
                            <CheckCircle2 size={11} /> alterada {lastChange}
                        </span>
                    )}
                />
                <form onSubmit={onChangePassword} className="lg:col-span-12 card-lux p-5 space-y-3" autoComplete="off">
                    <div>
                        <label className="type-overline">Palavra-passe atual</label>
                        <input type="password" value={pwdForm.current}
                            onChange={(e) => setPwdForm({ ...pwdForm, current: e.target.value })}
                            data-testid="security-pwd-current" className="mt-1.5 vm-input"
                            autoComplete="current-password" required />
                    </div>
                    <div>
                        <label className="type-overline">Nova palavra-passe</label>
                        <input type="password" value={pwdForm.next}
                            onChange={(e) => setPwdForm({ ...pwdForm, next: e.target.value })}
                            data-testid="security-pwd-next" className="mt-1.5 vm-input"
                            autoComplete="new-password" minLength={8} required />
                        {pwdStrength != null && (
                            <div className="mt-2 flex items-center gap-2">
                                <div className="flex-1 h-1.5 bg-black/[0.06] rounded-full overflow-hidden">
                                    <div className="h-full rounded-full transition-all duration-300"
                                        style={{ width: `${(pwdStrength / 5) * 100}%`, background: pwdColor }} />
                                </div>
                                <span className="text-[10.5px] font-mono tracking-wider uppercase tabular-nums" style={{ color: pwdColor }}>{pwdLabel}</span>
                            </div>
                        )}
                        <p className="text-[11px] text-black/45 mt-2 leading-relaxed">
                            Mínimo 8 caracteres. Mistura maiúsculas, minúsculas, números e símbolos para uma palavra-passe forte.
                        </p>
                    </div>
                    <div>
                        <label className="type-overline">Confirmar nova palavra-passe</label>
                        <input type="password" value={pwdForm.confirm}
                            onChange={(e) => setPwdForm({ ...pwdForm, confirm: e.target.value })}
                            data-testid="security-pwd-confirm" className="mt-1.5 vm-input"
                            autoComplete="new-password" required />
                        {pwdForm.next && pwdForm.confirm && pwdForm.next !== pwdForm.confirm && (
                            <div className="mt-1.5 text-[11px] text-red-soft flex items-center gap-1">
                                <AlertCircle size={11} /> Não coincidem
                            </div>
                        )}
                    </div>
                    <div className="flex justify-end pt-1">
                        <button type="submit" disabled={busy} data-testid="security-pwd-submit"
                            className="btn-obsidian px-5 py-2.5 text-[12px] disabled:opacity-50 inline-flex items-center gap-1.5">
                            <KeyRound size={12} /> {busy ? "A alterar…" : "Alterar palavra-passe"}
                        </button>
                    </div>
                </form>
            </div>

            {twoFaSetupOpen && (
                <TwoFaSetupModal onClose={() => setTwoFaSetupOpen(false)} onDone={() => { loadTwoFa(); onUserUpdate?.({ two_fa_enabled: true }); }} />
            )}
            {twoFaDisableOpen && (
                <TwoFaDisableModal onClose={() => setTwoFaDisableOpen(false)} onDone={() => { loadTwoFa(); onUserUpdate?.({ two_fa_enabled: false }); }} />
            )}
        </div>
    );
}
