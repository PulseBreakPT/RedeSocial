import { useRef, useState, useEffect } from "react";
import {
    Image as ImageIcon,
    X,
    Smile,
    FileText,
    Hash,
    AtSign,
    BarChart3,
    Clock,
    Save,
    Globe,
    Users as UsersIcon,
    AtSign as AtSignIcon,
    Plus,
    Calendar,
    Trash2,
    Copy,
    Maximize2,
    Minimize2,
    Smartphone,
    Monitor,
    Check,
} from "lucide-react";
import { api, formatApiError, toastApiError } from "../lib/api";
import { Avatar } from "./Avatar";
import { useAuth } from "../context/AuthContext";
import { useLocalDraft } from "../hooks/useLocalDraft";
import { useClickOutside } from "../hooks/useClickOutside";
import { Spinner } from "./Spinner";
import { HashtagSuggester } from "./HashtagSuggester";
import { MentionSuggester } from "./MentionSuggester";
import { confirmDialog } from "./ConfirmDialog";
import { toast } from "sonner";

// Lightweight mood detection mirroring backend logic
const MOOD_KEYWORDS = {
    saudade: ["saudade", "saudades", "melancolia", "longe", "distância"],
    tasca:   ["tasca", "bitoque", "vinho", "petisco", "sardinha", "bacalhau", "tremoço", "azeitona", "ginjinha"],
    festa:   ["festa", "festival", "arraial", "sanjoao", "são joão", "carnaval", "manjerico"],
    cafe:    ["café", "cafe", "bica", "pastel", "padaria", "torrada", "galão", "abatanado"],
    praia:   ["praia", "mar", "surf", "ondas", "costa", "areia", "biquíni"],
    fado:    ["fado", "fadista", "guitarra portuguesa"],
    futebol: ["benfica", "sporting", "porto", "futebol", "estádio", "golo"],
    cultura: ["museu", "teatro", "pessoa", "saramago", "exposição", "literatura", "azulejo"],
};
const MOOD_LABEL = { saudade: "Saudade 🥹", tasca: "Tasca 🍷", festa: "Festa 🎉", cafe: "Café ☕", praia: "Praia 🌊", fado: "Fado 🎙️", futebol: "Bola ⚽", cultura: "Cultura 🎭" };
function detectMoodClient(text) {
    if (!text) return null;
    const lower = text.toLowerCase();
    for (const [mood, kws] of Object.entries(MOOD_KEYWORDS)) {
        if (kws.some((k) => lower.includes(k))) return mood;
    }
    return null;
}

const EMOJIS = ["🔥", "✨", "🚀", "❤️", "👀", "💯", "😂", "🙌", "⚡", "🌙"];
const AUDIENCES = [
    { id: "everyone", label: "Toda a gente", Icon: Globe },
    { id: "following", label: "Quem sigo", Icon: UsersIcon },
    { id: "mentioned", label: "Apenas mencionados", Icon: AtSignIcon },
];
// F2.4 — Anel de identidade. Three rings with distinct PT colors.
const RINGS = [
    {
        id: "publico",
        label: "Público",
        hint: "Todos podem ver. Anel amarelo-mar.",
        dot: "linear-gradient(135deg, #f6c25f 0%, #d99a3a 100%)",
    },
    {
        id: "amigos",
        label: "Amigos",
        hint: "Apenas quem te segue. Anel azul-tejo.",
        dot: "linear-gradient(135deg, #6a91cc 0%, #2c6fd1 100%)",
    },
    {
        id: "tasca",
        label: "Tasca",
        hint: "Grupo íntimo (< 12). Anel terracota.",
        dot: "linear-gradient(135deg, #df8a7d 0%, #c64a3d 100%)",
    },
];
const MAX_IMAGES = 4;

export function Composer({ onPosted, asModal = false, onClose, communityId = null, initialPost = null }) {
    const { user } = useAuth();
    const draftKey = communityId ? `draft:c:${communityId}` : "draft:global";
    const [content, setContent, clearDraft] = useLocalDraft(draftKey, initialPost?.content || "");
    const [images, setImages] = useState(initialPost?.images || []);
    const [busy, setBusy] = useState(false);
    const [hadDraft, setHadDraft] = useState(false);
    const [emojiOpen, setEmojiOpen] = useState(false);
    const [audOpen, setAudOpen] = useState(false);
    const [audience, setAudience] = useState("everyone");
    // F2.4 — Identity ring (publico | amigos | tasca)
    const [ring, setRing] = useState("publico");
    const [ringOpen, setRingOpen] = useState(false);

    // Poll state
    const [pollOpen, setPollOpen] = useState(false);
    const [pollOptions, setPollOptions] = useState(["", ""]);
    const [pollDuration, setPollDuration] = useState(1440); // minutes (1 day)
    const [pollMultiple, setPollMultiple] = useState(false);

    // Schedule state
    const [scheduleOpen, setScheduleOpen] = useState(false);
    const [scheduledAt, setScheduledAt] = useState("");

    // SSS-tier composer UX
    const [fullscreen, setFullscreen] = useState(false);
    const [previewMode, setPreviewMode] = useState("desktop"); /* "desktop" | "mobile" */
    const [savedAt, setSavedAt] = useState(null);

    const fileRef = useRef(null);
    const textareaRef = useRef(null);

    // Click-outside / ESC handling for each popover
    const audRef = useClickOutside(() => setAudOpen(false), audOpen);
    const ringRef = useClickOutside(() => setRingOpen(false), ringOpen);
    const emojiRef = useClickOutside(() => setEmojiOpen(false), emojiOpen);

    useEffect(() => {
        if (content && content.trim().length > 0) setHadDraft(true);
        // eslint-disable-next-line
    }, []);

    // Auto-save indicator (lightweight, useLocalDraft already persists on every change)
    useEffect(() => {
        if (!content) return;
        const t = setTimeout(() => setSavedAt(Date.now()), 600);
        return () => clearTimeout(t);
    }, [content]);

    const clearComposer = async () => {
        if (!content && images.length === 0 && !pollOpen && !scheduleOpen) {
            toast.info("Já está vazio");
            return;
        }
        const ok = await confirmDialog({
            title: "Limpar tudo do composer?",
            description: "Texto, imagens, enquete e agendamento serão removidos. Esta ação não pode ser desfeita.",
            confirmText: "Limpar",
            danger: true,
        });
        if (!ok) return;
        setContent("");
        setImages([]);
        setPollOpen(false);
        setPollOptions(["", ""]);
        setScheduleOpen(false);
        setScheduledAt("");
        clearDraft();
        toast.success("Composer limpo");
    };

    const duplicateLast = () => {
        try {
            const last = localStorage.getItem("composer.lastPublished");
            if (!last) return toast.info("Sem publicação recente para duplicar");
            const obj = JSON.parse(last);
            if (obj.content) setContent(obj.content);
            if (Array.isArray(obj.images)) setImages(obj.images.slice(0, MAX_IMAGES));
            if (obj.audience) setAudience(obj.audience);
            if (obj.ring) setRing(obj.ring);
            toast.success("Última publicação carregada — edita e publica");
        } catch { toast.error("Falhou ao duplicar"); }
    };

    const handleFiles = (files) => {
        const list = Array.from(files || []);
        if (!list.length) return;
        const slots = MAX_IMAGES - images.length;
        if (slots <= 0) {
            toast.error(`Máximo ${MAX_IMAGES} imagens`);
            return;
        }
        list.slice(0, slots).forEach((file) => {
            if (file.size > 2 * 1024 * 1024) {
                toast.error("Cada imagem deve ter no máximo 2MB");
                return;
            }
            const reader = new FileReader();
            reader.onload = (ev) => setImages((prev) => (prev.length < MAX_IMAGES ? [...prev, ev.target.result] : prev));
            reader.readAsDataURL(file);
        });
    };

    const handlePaste = (e) => {
        const items = e.clipboardData?.items;
        if (!items) return;
        for (const item of items) {
            if (item.type.startsWith("image/")) {
                const file = item.getAsFile();
                if (file && file.size <= 2 * 1024 * 1024) {
                    handleFiles([file]);
                    e.preventDefault();
                    return;
                }
            }
        }
    };

    const removeImage = (idx) => setImages((prev) => prev.filter((_, i) => i !== idx));

    const submit = async (mode = "publish") => {
        const isDraft = mode === "draft";
        const isScheduled = mode === "publish" && scheduledAt;
        if (!isDraft && !content.trim() && images.length === 0 && !pollOpen) {
            toast.error("Escreve algo, adiciona imagem ou cria uma enquete");
            return;
        }
        if (pollOpen) {
            const cleaned = pollOptions.map((s) => s.trim()).filter(Boolean);
            if (cleaned.length < 2) {
                toast.error("Enquete precisa de pelo menos 2 opções");
                return;
            }
        }
        setBusy(true);
        try {
            // Editing an existing draft / scheduled post → PATCH + optionally publish
            const editingExisting = !!(initialPost?.id && (initialPost.is_draft || initialPost.scheduled_at));
            let data;
            if (editingExisting) {
                // 1) update content + images
                await api.patch(`/posts/${initialPost.id}`, { content, images });
                if (isDraft) {
                    // Stay as a draft; just refetch
                    const r = await api.get(`/posts/${initialPost.id}`);
                    data = r.data;
                } else if (isScheduled) {
                    // Cannot "reschedule" via this flow yet; fall through to publish now
                    // (Scheduled posts have their own page for date changes.)
                    const r = await api.post(`/posts/${initialPost.id}/publish`);
                    data = r.data;
                } else {
                    const r = await api.post(`/posts/${initialPost.id}/publish`);
                    data = r.data;
                }
            } else {
                const body = {
                    content,
                    images,
                    reply_audience: audience,
                    audience_ring: ring,
                    is_draft: isDraft,
                };
                if (communityId) body.community_id = communityId;
                if (pollOpen) {
                    body.poll = {
                        options: pollOptions.map((s) => s.trim()).filter(Boolean),
                        allow_multiple: pollMultiple,
                        ends_in_minutes: pollDuration,
                    };
                }
                if (isScheduled) {
                    const iso = new Date(scheduledAt).toISOString();
                    body.scheduled_at = iso;
                }
                const r = await api.post("/posts", body);
                data = r.data;
            }
            clearDraft();
            /* Remember last published for "Duplicar" */
            try {
                localStorage.setItem("composer.lastPublished", JSON.stringify({
                    content, images, audience, ring, savedAt: Date.now(),
                }));
            } catch {}
            setImages([]);
            setPollOpen(false);
            setPollOptions(["", ""]);
            setScheduledAt("");
            setScheduleOpen(false);
            onPosted?.(data);
            toast.success(isDraft ? "Rascunho guardado" : isScheduled ? "Agendado" : "Publicado");
            onClose?.();
        } catch (e) {
            toastApiError(e);
        } finally {
            setBusy(false);
        }
    };

    const insertText = (s) => {
        const el = textareaRef.current;
        if (!el) return;
        const start = el.selectionStart ?? content.length;
        const end = el.selectionEnd ?? content.length;
        const next = content.slice(0, start) + s + content.slice(end);
        setContent(next);
        setTimeout(() => {
            el.focus();
            el.selectionStart = el.selectionEnd = start + s.length;
        }, 0);
    };

    const remaining = 500 - content.length;
    const progress = Math.min(100, (content.length / 500) * 100);
    const progressColor =
        remaining < 0 ? "stroke-red-soft" : remaining < 40 ? "stroke-black" : "stroke-green-soft";
    const AudienceIcon = AUDIENCES.find((a) => a.id === audience)?.Icon || Globe;
    const audienceLabel = AUDIENCES.find((a) => a.id === audience)?.label;

    return (
        <div className={
            fullscreen
                ? "fixed inset-0 z-50 bg-white p-4 lg:p-8 overflow-y-auto"
                : (asModal ? "p-4 lg:p-5" : "hidden lg:block px-4 py-4 border-b border-black/[0.06]")
        }>
            <div className={`flex gap-3 ${fullscreen ? "max-w-3xl mx-auto" : ""} ${previewMode === "mobile" && !fullscreen ? "max-w-[420px]" : ""}`}>
                <Avatar user={user} size={44} />
                <div className="flex-1 min-w-0">
                    {/* SSS-tier composer toolbar */}
                    <div className="flex items-center justify-between mb-2 -mt-1">
                        <div className="flex items-center gap-1">
                            <button
                                onClick={clearComposer}
                                data-testid="composer-clear-btn"
                                title="Limpar composer"
                                className="w-7 h-7 rounded-full grid place-items-center text-black/55 hover:text-red-soft hover:bg-red-soft/10 transition tap-shrink"
                            >
                                <Trash2 size={13} strokeWidth={1.7} />
                            </button>
                            <button
                                onClick={duplicateLast}
                                data-testid="composer-duplicate-btn"
                                title="Duplicar última publicação"
                                className="w-7 h-7 rounded-full grid place-items-center text-black/55 hover:text-black hover:bg-black/[0.05] transition tap-shrink"
                            >
                                <Copy size={13} strokeWidth={1.7} />
                            </button>
                            <span className="mx-1 h-4 w-px bg-black/[0.08]" />
                            <button
                                onClick={() => setPreviewMode("desktop")}
                                data-testid="composer-preview-desktop"
                                title="Pré-visualizar desktop"
                                className={`w-7 h-7 rounded-full grid place-items-center transition tap-shrink ${previewMode === "desktop" ? "bg-black text-white" : "text-black/55 hover:bg-black/[0.05]"}`}
                            >
                                <Monitor size={13} strokeWidth={1.7} />
                            </button>
                            <button
                                onClick={() => setPreviewMode("mobile")}
                                data-testid="composer-preview-mobile"
                                title="Pré-visualizar mobile"
                                className={`w-7 h-7 rounded-full grid place-items-center transition tap-shrink ${previewMode === "mobile" ? "bg-black text-white" : "text-black/55 hover:bg-black/[0.05]"}`}
                            >
                                <Smartphone size={13} strokeWidth={1.7} />
                            </button>
                            <button
                                onClick={() => setFullscreen((v) => !v)}
                                data-testid="composer-fullscreen-btn"
                                title={fullscreen ? "Sair de fullscreen" : "Fullscreen"}
                                className="w-7 h-7 rounded-full grid place-items-center text-black/55 hover:text-black hover:bg-black/[0.05] transition tap-shrink"
                            >
                                {fullscreen ? <Minimize2 size={13} strokeWidth={1.7} /> : <Maximize2 size={13} strokeWidth={1.7} />}
                            </button>
                        </div>
                        {/* Auto-save indicator */}
                        {savedAt && content && (
                            <div data-testid="composer-autosave" className="inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-wider text-black/45">
                                <Check size={10} strokeWidth={2} className="text-emerald-600" /> guardado
                            </div>
                        )}
                    </div>

                    {hadDraft && content && (
                        <div className="flex items-center gap-2 text-xs font-mono text-green-soft mb-2" data-testid="draft-restored">
                            <FileText size={12} /> Rascunho restaurado
                        </div>
                    )}

                    {/* Audience + Identity Ring selectors */}
                    <div className="mb-2 flex items-center gap-2 flex-wrap">
                        <div className="relative inline-block" ref={audRef}>
                            <button
                                onClick={() => setAudOpen((v) => !v)}
                                data-testid="composer-audience-btn"
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-black/[0.08] hover:bg-black/[0.04] text-[12px] font-mono text-black/70 tap-shrink"
                            >
                                <AudienceIcon size={12} />
                                {audienceLabel}
                            </button>
                            {audOpen && (
                                <div
                                    className="absolute left-0 top-full mt-1 bg-white border border-black/[0.08] rounded-2xl py-1.5 shadow-xl z-30 min-w-[200px] anim-fade-up"
                                >
                                    {AUDIENCES.map((a) => {
                                        const I = a.Icon;
                                        return (
                                            <button
                                                key={a.id}
                                                onClick={() => {
                                                    setAudience(a.id);
                                                    setAudOpen(false);
                                                }}
                                                data-testid={`composer-audience-${a.id}`}
                                                className={`w-full flex items-center gap-2 px-4 py-2 hover:bg-black/[0.04] text-sm text-left ${
                                                    audience === a.id ? "text-black font-semibold" : "text-black/70"
                                                }`}
                                            >
                                                <I size={14} />
                                                {a.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* F2.4 Identity Ring */}
                        <div className="relative inline-block" ref={ringRef}>
                            <button
                                onClick={() => setRingOpen((v) => !v)}
                                data-testid="composer-ring-btn"
                                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-black/[0.08] hover:bg-black/[0.04] text-[12px] font-mono text-black/70 tap-shrink"
                                title="Anel de identidade — quem vê este post"
                            >
                                <span
                                    className="w-2.5 h-2.5 rounded-full shrink-0"
                                    style={{ background: RINGS.find((r) => r.id === ring)?.dot }}
                                />
                                {RINGS.find((r) => r.id === ring)?.label || "Público"}
                            </button>
                            {ringOpen && (
                                <div
                                    className="absolute left-0 top-full mt-1 bg-white border border-black/[0.08] rounded-2xl py-1.5 shadow-xl z-30 min-w-[260px] anim-fade-up"
                                >
                                    {RINGS.map((r) => (
                                        <button
                                            key={r.id}
                                            onClick={() => {
                                                setRing(r.id);
                                                setRingOpen(false);
                                            }}
                                            data-testid={`composer-ring-${r.id}`}
                                            className={`w-full flex items-start gap-3 px-4 py-2.5 hover:bg-black/[0.04] text-left ${
                                                ring === r.id ? "bg-black/[0.025]" : ""
                                            }`}
                                        >
                                            <span
                                                className="w-3 h-3 rounded-full mt-1 shrink-0"
                                                style={{ background: r.dot }}
                                            />
                                            <span className="flex-1 min-w-0">
                                                <span
                                                    className={`block text-sm ${
                                                        ring === r.id
                                                            ? "text-black font-semibold"
                                                            : "text-black/80"
                                                    }`}
                                                >
                                                    {r.label}
                                                </span>
                                                <span className="block text-[11.5px] text-black/55 leading-snug mt-0.5">
                                                    {r.hint}
                                                </span>
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <textarea
                        ref={textareaRef}
                        data-testid="composer-textarea"
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        onPaste={handlePaste}
                        placeholder={communityId ? "Partilha algo com a comunidade..." : "O que está a acontecer?"}
                        rows={asModal ? 4 : 2}
                        maxLength={500}
                        className="w-full bg-transparent text-[17px] font-body placeholder:text-black/40 focus:outline-none resize-none leading-snug text-black"
                    />

                    {/* Mood auto-tag */}
                    {(() => {
                        const detected = detectMoodClient(content);
                        if (!detected) return null;
                        return (
                            <div className="flex items-center gap-1.5 mt-1" data-testid="composer-mood-detected">
                                <span className="text-[10px] font-mono uppercase tracking-wider text-black/45">mood detetado</span>
                                <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-orange-50 border border-orange-200 text-[11px] font-mono text-orange-700">
                                    {MOOD_LABEL[detected]}
                                </span>
                            </div>
                        );
                    })()}

                    {/* Hashtag suggester */}
                    <HashtagSuggester
                        text={content}
                        onInsert={(tag, partial) => {
                            const lastIdx = content.lastIndexOf("#" + partial);
                            if (lastIdx === -1) return;
                            const newText = content.slice(0, lastIdx) + "#" + tag + " " + content.slice(lastIdx + 1 + partial.length);
                            setContent(newText);
                            textareaRef.current?.focus();
                        }}
                    />

                    {/* Mention suggester */}
                    <MentionSuggester
                        text={content}
                        onInsert={(uname, partial) => {
                            const lastIdx = content.lastIndexOf("@" + partial);
                            if (lastIdx === -1) return;
                            const newText = content.slice(0, lastIdx) + "@" + uname + " " + content.slice(lastIdx + 1 + partial.length);
                            setContent(newText);
                            textareaRef.current?.focus();
                        }}
                    />

                    {/* Images carousel preview */}
                    {images.length > 0 && (
                        <div
                            className={`mt-3 grid gap-1.5 ${
                                images.length === 1
                                    ? "grid-cols-1"
                                    : images.length === 2
                                    ? "grid-cols-2"
                                    : "grid-cols-2"
                            }`}
                            data-testid="composer-images"
                        >
                            {images.map((src, i) => (
                                <div key={i} className="relative group rounded-2xl overflow-hidden border border-black/[0.08]">
                                    <img src={src} alt="" className={`w-full ${images.length === 1 ? "max-h-72 object-cover" : "h-32 object-cover"}`} />
                                    <button
                                        onClick={() => removeImage(i)}
                                        data-testid={`composer-remove-image-${i}`}
                                        className="absolute top-1.5 right-1.5 bg-black/80 hover:bg-black rounded-full p-1.5 text-white"
                                    >
                                        <X size={12} />
                                    </button>
                                </div>
                            ))}
                            {images.length < MAX_IMAGES && (
                                <button
                                    onClick={() => fileRef.current?.click()}
                                    className="rounded-2xl border-2 border-dashed border-black/[0.12] hover:border-black/30 hover:bg-black/[0.02] grid place-items-center h-32 text-black/50"
                                >
                                    <Plus size={20} />
                                </button>
                            )}
                        </div>
                    )}

                    {/* Poll editor */}
                    {pollOpen && (
                        <div className="mt-3 p-3 lg:p-4 rounded-2xl border border-black/[0.08] bg-black/[0.02] space-y-2" data-testid="composer-poll">
                            <div className="flex items-center justify-between">
                                <h4 className="font-heading text-sm font-bold">Enquete</h4>
                                <button onClick={() => setPollOpen(false)} className="text-black/50 hover:text-black tap-shrink" data-testid="composer-poll-close">
                                    <X size={14} />
                                </button>
                            </div>
                            {pollOptions.map((opt, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                    <input
                                        value={opt}
                                        onChange={(e) => setPollOptions((prev) => prev.map((p, i) => (i === idx ? e.target.value : p)))}
                                        maxLength={60}
                                        data-testid={`composer-poll-option-${idx}`}
                                        placeholder={`Opção ${idx + 1}`}
                                        className="flex-1 bg-white border border-black/[0.08] rounded-full px-4 py-2 text-sm focus:border-black/40 outline-none"
                                    />
                                    {pollOptions.length > 2 && (
                                        <button
                                            onClick={() => setPollOptions((prev) => prev.filter((_, i) => i !== idx))}
                                            className="text-black/40 hover:text-red-soft tap-shrink"
                                        >
                                            <X size={16} />
                                        </button>
                                    )}
                                </div>
                            ))}
                            {pollOptions.length < 4 && (
                                <button
                                    onClick={() => setPollOptions((prev) => [...prev, ""])}
                                    data-testid="composer-poll-add-option"
                                    className="text-xs font-mono text-black/60 hover:text-black flex items-center gap-1 tap-shrink"
                                >
                                    <Plus size={12} /> adicionar opção
                                </button>
                            )}
                            <div className="flex items-center justify-between pt-2 border-t border-black/[0.06] gap-3 flex-wrap">
                                <label className="flex items-center gap-2 text-xs font-mono text-black/70">
                                    <input
                                        type="checkbox"
                                        checked={pollMultiple}
                                        onChange={(e) => setPollMultiple(e.target.checked)}
                                        data-testid="composer-poll-multi"
                                    />
                                    múltipla escolha
                                </label>
                                <select
                                    value={pollDuration}
                                    onChange={(e) => setPollDuration(parseInt(e.target.value, 10))}
                                    data-testid="composer-poll-duration"
                                    className="bg-white border border-black/[0.08] rounded-full px-3 py-1 text-xs font-mono"
                                >
                                    <option value={60}>1 hora</option>
                                    <option value={360}>6 horas</option>
                                    <option value={1440}>1 dia</option>
                                    <option value={4320}>3 dias</option>
                                    <option value={10080}>7 dias</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {/* Schedule editor */}
                    {scheduleOpen && (
                        <div className="mt-3 p-3 rounded-2xl border border-black/[0.08] bg-black/[0.02] flex items-center gap-2" data-testid="composer-schedule">
                            <Calendar size={16} className="text-black/60" />
                            <input
                                type="datetime-local"
                                value={scheduledAt}
                                onChange={(e) => setScheduledAt(e.target.value)}
                                data-testid="composer-schedule-input"
                                className="flex-1 bg-white border border-black/[0.08] rounded-full px-3 py-1.5 text-sm"
                                min={new Date(Date.now() + 60_000).toISOString().slice(0, 16)}
                            />
                            <button onClick={() => { setScheduleOpen(false); setScheduledAt(""); }} className="text-black/50 hover:text-black tap-shrink" data-testid="composer-schedule-close">
                                <X size={14} />
                            </button>
                        </div>
                    )}

                    <div className="flex items-center justify-between mt-4 gap-2 flex-wrap">
                        <div className="flex items-center gap-0.5 flex-wrap">
                            <input ref={fileRef} type="file" accept="image/*" multiple onChange={(e) => handleFiles(e.target.files)} className="hidden" data-testid="composer-file-input" />
                            <ComposerIconBtn onClick={() => fileRef.current?.click()} disabled={images.length >= MAX_IMAGES} data-testid="composer-image-btn" label="imagem">
                                <ImageIcon size={18} />
                            </ComposerIconBtn>
                            <ComposerIconBtn onClick={() => setPollOpen((v) => !v)} active={pollOpen} disabled={!!scheduleOpen} data-testid="composer-poll-btn" label="enquete">
                                <BarChart3 size={18} />
                            </ComposerIconBtn>
                            <ComposerIconBtn onClick={() => setScheduleOpen((v) => !v)} active={scheduleOpen} disabled={pollOpen} data-testid="composer-schedule-btn" label="agendar">
                                <Clock size={18} />
                            </ComposerIconBtn>
                            <ComposerIconBtn onClick={() => insertText("#")} label="hashtag">
                                <Hash size={18} />
                            </ComposerIconBtn>
                            <ComposerIconBtn onClick={() => insertText("@")} label="menção">
                                <AtSign size={18} />
                            </ComposerIconBtn>
                            <div className="relative" ref={emojiRef}>
                                <ComposerIconBtn onClick={() => setEmojiOpen((v) => !v)} data-testid="composer-emoji-btn" label="emoji">
                                    <Smile size={18} />
                                </ComposerIconBtn>
                                {emojiOpen && (
                                    <div
                                        className="absolute left-0 top-full mt-1 flex bg-white border border-black/[0.08] rounded-2xl px-2 py-1.5 gap-0.5 z-30 shadow-xl anim-fade-up"
                                    >
                                        {EMOJIS.map((emj) => (
                                            <button
                                                key={emj}
                                                onClick={() => { insertText(emj); setEmojiOpen(false); }}
                                                className="hover:bg-black/[0.05] rounded-full w-8 h-8 grid place-items-center text-base tap-shrink"
                                            >
                                                {emj}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {content.length > 0 && (
                                <div className="relative w-6 h-6">
                                    <svg viewBox="0 0 24 24" className="w-full h-full -rotate-90">
                                        <circle cx="12" cy="12" r="10" className="stroke-black/10 fill-none" strokeWidth="2.5" />
                                        <circle cx="12" cy="12" r="10" fill="none" strokeWidth="2.5"
                                            className={progressColor} strokeLinecap="round"
                                            strokeDasharray={`${(progress / 100) * 62.83} 62.83`} />
                                    </svg>
                                    {remaining < 40 && (
                                        <span className={`absolute inset-0 grid place-items-center font-mono text-[9px] ${remaining < 0 ? "text-red-soft" : "text-black"}`}>
                                            {remaining}
                                        </span>
                                    )}
                                </div>
                            )}
                            <button
                                onClick={() => submit("draft")}
                                disabled={busy || (!content.trim() && images.length === 0)}
                                data-testid="composer-draft-btn"
                                className="font-mono text-[11px] uppercase tracking-wide text-black/60 hover:text-black px-3 py-2 tap-shrink disabled:opacity-40 inline-flex items-center gap-1.5"
                                title="Guardar rascunho"
                            >
                                <Save size={13} /> rascunho
                            </button>
                            <button
                                disabled={busy || (!content.trim() && images.length === 0 && !pollOpen) || remaining < 0}
                                onClick={() => submit("publish")}
                                data-testid="composer-publish-btn"
                                className="btn-obsidian text-[13px] py-2.5 px-5 disabled:opacity-30 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
                            >
                                {busy && <Spinner size={12} />}
                                {busy ? "A publicar…" : scheduledAt ? "Agendar" : "Publicar"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ComposerIconBtn({ onClick, children, active = false, disabled = false, label, ...rest }) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
            className={`w-9 h-9 rounded-full grid place-items-center transition tap-shrink ${
                active ? "bg-black/[0.08] text-black" : "text-black hover:bg-black/[0.06]"
            } disabled:opacity-30`}
            {...rest}
        >
            {children}
        </button>
    );
}
