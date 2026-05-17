import { useState } from "react";
import {
    ShieldCheck, KeyRound, Smartphone, Monitor, AlertCircle, CheckCircle2,
    Lock, Clock,
} from "lucide-react";
import { toast } from "sonner";
import { api, toastApiError } from "../../lib/api";

function detectCurrentDevice() {
    if (typeof navigator === "undefined") return { name: "Este dispositivo", browser: "—", os: "—", isMobile: false };
    const ua = navigator.userAgent;
    let browser = "Browser desconhecido";
    if (/Chrome/i.test(ua) && !/Edg|OPR/i.test(ua)) browser = "Chrome";
    else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) browser = "Safari";
    else if (/Firefox/i.test(ua)) browser = "Firefox";
    else if (/Edg/i.test(ua)) browser = "Edge";
    let os = "Desconhecido";
    if (/Windows/i.test(ua)) os = "Windows";
    else if (/Mac OS X/i.test(ua)) os = "macOS";
    else if (/Android/i.test(ua)) os = "Android";
    else if (/iPhone|iPad|iPod/i.test(ua)) os = "iOS";
    else if (/Linux/i.test(ua)) os = "Linux";
    const isMobile = /Mobi|Android|iPhone/i.test(ua);
    return { name: `${browser} em ${os}`, browser, os, isMobile };
}

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

export function SecurityTab({ user, onUserUpdate }) {
    const current = detectCurrentDevice();
    const [pwdForm, setPwdForm] = useState({ current: "", next: "", confirm: "" });
    const [busy, setBusy] = useState(false);

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
            toast.success("Palavra-passe alterada com sucesso");
        } catch (err) {
            toastApiError(err);
        } finally {
            setBusy(false);
        }
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
        return s; /* 0..5 */
    })();
    const pwdLabel = ["", "Muito fraca", "Fraca", "Média", "Forte", "Excelente"][pwdStrength || 0];
    const pwdColor = ["", "#dc6055", "#dc6055", "#d4a418", "#16a34a", "#0a0a0a"][pwdStrength || 0];

    const lastChange = formatRelative(user?.password_changed_at);
    const DeviceIcon = current.isMobile ? Smartphone : Monitor;

    return (
        <div className="px-4 lg:px-6 py-5 space-y-6 max-w-2xl" data-testid="settings-security">
            {/* Current session — read-only, real browser info */}
            <section>
                <div className="flex items-center gap-2 mb-3">
                    <ShieldCheck size={14} strokeWidth={1.8} className="text-black/60" />
                    <p className="type-overline mb-0">Sessão atual</p>
                </div>
                <div className="card-lux p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl grid place-items-center shrink-0 bg-emerald-50 text-emerald-700">
                        <DeviceIcon size={17} strokeWidth={1.7} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="font-heading font-semibold text-[13.5px] tracking-tight text-black flex items-center gap-1.5">
                            {current.name}
                            <span className="text-[9.5px] font-mono uppercase tracking-[0.1em] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">Ativa</span>
                        </div>
                        <div className="text-[11.5px] text-black/55 mt-0.5 inline-flex items-center gap-1">
                            <Clock size={10} /> agora · este dispositivo
                        </div>
                    </div>
                </div>
                <p className="text-[11px] text-black/45 mt-2 leading-relaxed">
                    Para terminar a sessão, usa o botão <span className="font-medium text-black/70">Terminar sessão</span> na barra lateral.
                </p>
            </section>

            {/* Change password */}
            <section>
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Lock size={14} strokeWidth={1.8} className="text-black/60" />
                        <p className="type-overline mb-0">Alterar palavra-passe</p>
                    </div>
                    {lastChange && (
                        <span className="text-[10.5px] font-mono tracking-wider uppercase text-black/45 inline-flex items-center gap-1">
                            <CheckCircle2 size={11} /> alterada {lastChange}
                        </span>
                    )}
                </div>
                <form onSubmit={onChangePassword} className="card-lux p-5 space-y-3" autoComplete="off">
                    <div>
                        <label className="type-overline">Palavra-passe atual</label>
                        <input
                            type="password"
                            value={pwdForm.current}
                            onChange={(e) => setPwdForm({ ...pwdForm, current: e.target.value })}
                            data-testid="security-pwd-current"
                            className="mt-1.5 vm-input"
                            autoComplete="current-password"
                            required
                        />
                    </div>
                    <div>
                        <label className="type-overline">Nova palavra-passe</label>
                        <input
                            type="password"
                            value={pwdForm.next}
                            onChange={(e) => setPwdForm({ ...pwdForm, next: e.target.value })}
                            data-testid="security-pwd-next"
                            className="mt-1.5 vm-input"
                            autoComplete="new-password"
                            minLength={8}
                            required
                        />
                        {pwdStrength != null && (
                            <div className="mt-2 flex items-center gap-2">
                                <div className="flex-1 h-1.5 bg-black/[0.06] rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all duration-300"
                                        style={{ width: `${(pwdStrength / 5) * 100}%`, background: pwdColor }}
                                    />
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
                        <input
                            type="password"
                            value={pwdForm.confirm}
                            onChange={(e) => setPwdForm({ ...pwdForm, confirm: e.target.value })}
                            data-testid="security-pwd-confirm"
                            className="mt-1.5 vm-input"
                            autoComplete="new-password"
                            required
                        />
                        {pwdForm.next && pwdForm.confirm && pwdForm.next !== pwdForm.confirm && (
                            <div className="mt-1.5 text-[11px] text-red-soft flex items-center gap-1">
                                <AlertCircle size={11} /> Não coincidem
                            </div>
                        )}
                    </div>
                    <div className="flex justify-end pt-1">
                        <button
                            type="submit"
                            disabled={busy}
                            data-testid="security-pwd-submit"
                            className="btn-obsidian px-5 py-2.5 text-[12px] disabled:opacity-50 inline-flex items-center gap-1.5"
                        >
                            <KeyRound size={12} /> {busy ? "A alterar…" : "Alterar palavra-passe"}
                        </button>
                    </div>
                </form>
            </section>
        </div>
    );
}
