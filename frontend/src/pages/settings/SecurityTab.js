import { useState } from "react";
import {
    ShieldCheck, KeyRound, Smartphone, Monitor, MapPin, Clock, AlertCircle,
    CheckCircle2, Lock, LogOut as LogOutIcon, Mail, Github, Globe, ChevronRight,
    Trash2,
} from "lucide-react";
import { toast } from "sonner";

function detectCurrentDevice() {
    if (typeof navigator === "undefined") return { name: "Este dispositivo", browser: "—", os: "—" };
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

const MOCK_SESSIONS = [
    { id: "s2", device: "Safari em iPhone", location: "Lisboa, PT", lastActive: "há 3 horas", icon: Smartphone, current: false },
    { id: "s3", device: "Chrome em macOS", location: "Porto, PT", lastActive: "há 2 dias", icon: Monitor, current: false },
    { id: "s4", device: "Firefox em Windows", location: "Coimbra, PT", lastActive: "há 1 semana", icon: Monitor, current: false },
];

function SessionRow({ session, isCurrent, onRevoke }) {
    const Icon = session.icon || Monitor;
    return (
        <div className="flex items-center gap-3 p-3.5 hairline-b last:border-b-0">
            <div className={`w-10 h-10 rounded-xl grid place-items-center shrink-0 ${isCurrent ? "bg-emerald-50 text-emerald-700" : "bg-black/[0.04] text-black/70"}`}>
                <Icon size={17} strokeWidth={1.7} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="font-heading font-semibold text-[13.5px] tracking-tight text-black flex items-center gap-1.5">
                    {session.device}
                    {isCurrent && (
                        <span className="text-[9.5px] font-mono uppercase tracking-[0.1em] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">Atual</span>
                    )}
                </div>
                <div className="text-[11.5px] text-black/55 mt-0.5 flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1"><MapPin size={10} /> {session.location}</span>
                    <span className="inline-flex items-center gap-1"><Clock size={10} /> {session.lastActive}</span>
                </div>
            </div>
            {!isCurrent && (
                <button
                    onClick={() => onRevoke?.(session.id)}
                    data-testid={`session-revoke-${session.id}`}
                    className="text-[11.5px] text-black/55 hover:text-red-soft px-2.5 py-1.5 rounded-full hover:bg-red-soft/10 transition font-medium tap-shrink"
                >
                    Terminar
                </button>
            )}
        </div>
    );
}

const CONNECTED_PROVIDERS = [
    { key: "google", label: "Google", icon: Globe, color: "bg-white text-black border border-black/[0.10]" },
    { key: "apple", label: "Apple", icon: Globe, color: "bg-black text-white" },
    { key: "github", label: "GitHub", icon: Github, color: "bg-black text-white" },
    { key: "email", label: "Email", icon: Mail, color: "bg-black/[0.04] text-black/70 border border-black/[0.08]" },
];

export function SecurityTab({ prefs, setPref }) {
    const current = detectCurrentDevice();
    const [pwdForm, setPwdForm] = useState({ current: "", next: "", confirm: "" });
    const [sessions, setSessions] = useState(MOCK_SESSIONS);
    const [connected, setConnected] = useState({
        email: true,
        google: false,
        apple: false,
        github: false,
    });

    const onChangePassword = (e) => {
        e.preventDefault();
        if (!pwdForm.current || !pwdForm.next) return toast.error("Preenche todos os campos");
        if (pwdForm.next.length < 8) return toast.error("Nova palavra-passe deve ter pelo menos 8 caracteres");
        if (pwdForm.next !== pwdForm.confirm) return toast.error("As palavras-passe não coincidem");
        /* MOCKED — backend endpoint not implemented yet */
        setPref("last_password_change_ok", true);
        setPwdForm({ current: "", next: "", confirm: "" });
        toast.success("Palavra-passe alterada com sucesso");
    };

    const onRevokeSession = (id) => {
        setSessions((prev) => prev.filter((s) => s.id !== id));
        toast.success("Sessão terminada");
    };

    const onRevokeAll = () => {
        setSessions([]);
        toast.success("Todas as outras sessões foram terminadas");
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

    return (
        <div className="px-4 lg:px-6 py-5 space-y-6 max-w-2xl" data-testid="settings-security">
            {/* 2FA */}
            <section>
                <div className="flex items-center gap-2 mb-3">
                    <ShieldCheck size={14} strokeWidth={1.8} className="text-black/60" />
                    <p className="type-overline mb-0">Autenticação em dois passos</p>
                </div>
                <label className="flex items-center justify-between p-4 card-lux cursor-pointer hover:shadow-md transition" data-testid="security-2fa-toggle">
                    <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-xl grid place-items-center shrink-0 ${prefs.two_fa_enabled ? "bg-emerald-50 text-emerald-700" : "bg-black/[0.04] text-black/70"}`}>
                            <KeyRound size={17} strokeWidth={1.7} />
                        </div>
                        <div>
                            <div className="font-heading font-semibold text-[14px] tracking-tight text-black flex items-center gap-2">
                                2FA
                                {prefs.two_fa_enabled && (
                                    <span className="text-[9.5px] font-mono uppercase tracking-[0.1em] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800">Ativo</span>
                                )}
                            </div>
                            <div className="text-[11.5px] text-black/55 mt-0.5 leading-snug">
                                Pede um código adicional sempre que entras numa máquina nova.
                            </div>
                        </div>
                    </div>
                    <input
                        type="checkbox"
                        checked={!!prefs.two_fa_enabled}
                        onChange={(e) => {
                            setPref("two_fa_enabled", e.target.checked);
                            toast.success(e.target.checked ? "2FA ativada (mock)" : "2FA desativada");
                        }}
                        className="w-5 h-5 accent-black"
                        data-testid="security-2fa-checkbox"
                    />
                </label>
            </section>

            {/* Active sessions */}
            <section>
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Monitor size={14} strokeWidth={1.8} className="text-black/60" />
                        <p className="type-overline mb-0">Sessões ativas</p>
                    </div>
                    {sessions.length > 0 && (
                        <button
                            onClick={onRevokeAll}
                            data-testid="security-revoke-all"
                            className="text-[11px] text-red-soft hover:text-red-soft/80 font-medium tap-shrink"
                        >
                            Terminar todas as outras
                        </button>
                    )}
                </div>
                <div className="card-lux overflow-hidden">
                    {/* Current device */}
                    <SessionRow
                        session={{
                            id: "current",
                            device: current.name,
                            location: "Localização atual",
                            lastActive: "agora",
                            icon: current.isMobile ? Smartphone : Monitor,
                        }}
                        isCurrent
                    />
                    {sessions.map((s) => (
                        <SessionRow key={s.id} session={s} onRevoke={onRevokeSession} />
                    ))}
                    {sessions.length === 0 && (
                        <div className="p-5 text-center text-[12.5px] text-black/55">
                            Sem outras sessões ativas.
                        </div>
                    )}
                </div>
            </section>

            {/* Change password */}
            <section>
                <div className="flex items-center gap-2 mb-3">
                    <Lock size={14} strokeWidth={1.8} className="text-black/60" />
                    <p className="type-overline mb-0">Alterar palavra-passe</p>
                </div>
                <form onSubmit={onChangePassword} className="card-lux p-5 space-y-3">
                    <div>
                        <label className="type-overline">Palavra-passe atual</label>
                        <input
                            type="password"
                            value={pwdForm.current}
                            onChange={(e) => setPwdForm({ ...pwdForm, current: e.target.value })}
                            data-testid="security-pwd-current"
                            className="mt-1.5 vm-input"
                            autoComplete="current-password"
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
                            data-testid="security-pwd-submit"
                            className="btn-obsidian px-5 py-2.5 text-[12px]"
                        >
                            Alterar palavra-passe
                        </button>
                    </div>
                </form>
            </section>

            {/* Login alerts */}
            <section>
                <label className="flex items-center justify-between p-4 card-lux cursor-pointer hover:shadow-md transition" data-testid="security-alerts-toggle">
                    <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-xl grid place-items-center shrink-0 ${prefs.login_alerts ? "bg-emerald-50 text-emerald-700" : "bg-black/[0.04] text-black/70"}`}>
                            <AlertCircle size={17} strokeWidth={1.7} />
                        </div>
                        <div>
                            <div className="font-heading font-semibold text-[14px] tracking-tight text-black">
                                Alertas de login
                            </div>
                            <div className="text-[11.5px] text-black/55 mt-0.5 leading-snug">
                                Recebe email + push quando alguém entra na conta a partir de um dispositivo novo.
                            </div>
                        </div>
                    </div>
                    <input
                        type="checkbox"
                        checked={!!prefs.login_alerts}
                        onChange={(e) => setPref("login_alerts", e.target.checked)}
                        className="w-5 h-5 accent-black"
                        data-testid="security-alerts-checkbox"
                    />
                </label>
            </section>

            {/* Connected accounts */}
            <section>
                <div className="flex items-center gap-2 mb-3">
                    <Globe size={14} strokeWidth={1.8} className="text-black/60" />
                    <p className="type-overline mb-0">Contas conectadas</p>
                </div>
                <div className="card-lux divide-y divide-black/[0.06]">
                    {CONNECTED_PROVIDERS.map((p) => {
                        const Icon = p.icon;
                        const isConnected = !!connected[p.key];
                        return (
                            <div key={p.key} className="flex items-center gap-3 p-3.5">
                                <div className={`w-9 h-9 rounded-xl grid place-items-center shrink-0 ${p.color}`}>
                                    <Icon size={15} strokeWidth={1.8} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-heading font-semibold text-[13.5px] tracking-tight text-black">{p.label}</div>
                                    <div className="text-[11.5px] text-black/55 mt-0.5">
                                        {isConnected ? "Ligado" : "Não ligado"}
                                    </div>
                                </div>
                                <button
                                    onClick={() => {
                                        setConnected((c) => ({ ...c, [p.key]: !isConnected }));
                                        toast.success(isConnected ? `${p.label} desligado (mock)` : `${p.label} ligado (mock)`);
                                    }}
                                    data-testid={`security-provider-${p.key}`}
                                    className={`text-[11.5px] px-3 py-1.5 rounded-full font-medium tap-shrink transition ${
                                        isConnected
                                            ? "text-black/65 hover:text-red-soft hover:bg-red-soft/10"
                                            : "bg-black text-white hover:bg-black/85"
                                    }`}
                                >
                                    {isConnected ? "Desligar" : "Ligar"}
                                </button>
                            </div>
                        );
                    })}
                </div>
            </section>

            {/* Recent activity */}
            <section>
                <div className="flex items-center gap-2 mb-3">
                    <Clock size={14} strokeWidth={1.8} className="text-black/60" />
                    <p className="type-overline mb-0">Atividade recente de segurança</p>
                </div>
                <div className="card-lux divide-y divide-black/[0.06]">
                    {[
                        { icon: CheckCircle2, label: "Login bem-sucedido", sub: "Chrome em macOS · há 3 horas", ok: true },
                        { icon: LogOutIcon, label: "Sessão terminada", sub: "Safari em iPhone · há 1 dia", ok: true },
                        { icon: CheckCircle2, label: "Tema atualizado para Claro", sub: "há 2 dias", ok: true },
                        { icon: AlertCircle, label: "Tentativa de login falhada", sub: "IP desconhecido · há 5 dias", ok: false },
                    ].map((a, i) => {
                        const Icon = a.icon;
                        return (
                            <div key={i} className="flex items-center gap-3 p-3.5">
                                <div className={`w-8 h-8 rounded-lg grid place-items-center shrink-0 ${a.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-soft/10 text-red-soft"}`}>
                                    <Icon size={14} strokeWidth={1.8} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-[13px] text-black truncate">{a.label}</div>
                                    <div className="text-[11px] text-black/50 mt-0.5">{a.sub}</div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>
        </div>
    );
}
