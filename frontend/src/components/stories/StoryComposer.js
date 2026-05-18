import { useEffect, useRef, useState } from "react";
import { X, Image as ImageIcon, Video, Type, Sticker, ChevronDown, Loader2, Globe2, Users2, UserCheck, MessageCircle, Heart, Check, Trash2 } from "lucide-react";
import { api, toastApiError } from "../../lib/api";
import { useEscapeKey } from "../../hooks/useClickOutside";
import { toast } from "sonner";
import {
    STORY_BG_PRESETS, STORY_FONTS, STORY_AUDIENCES, STICKER_TYPES,
    bgCss, fontStyleFor,
} from "./storyConstants";

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;       // 2 MB
const MAX_VIDEO_BYTES = 4.5 * 1024 * 1024;     // ~4.5 MB (base64 inflates ~33%)

const TEXT_COLORS = ["#ffffff", "#000000", "#FFE89B", "#FFB6C1", "#A6F0FF", "#FFC380"];

let _stickerSeq = 0;
const stickerId = () => `sk-${Date.now()}-${++_stickerSeq}`;

export function StoryComposer({ onClose, onCreated }) {
    const [tab, setTab] = useState("image"); // image | video | text
    const [media, setMedia] = useState({ image: "", video: "" });
    const [caption, setCaption] = useState("");
    const [textContent, setTextContent] = useState("");
    const [background, setBackground] = useState("coral");
    const [textColor, setTextColor] = useState("#ffffff");
    const [fontStyle, setFontStyle] = useState("modern");
    const [stickers, setStickers] = useState([]);
    const [audience, setAudience] = useState("everyone");
    const [allowReplies, setAllowReplies] = useState(true);
    const [allowReactions, setAllowReactions] = useState(true);
    const [busy, setBusy] = useState(false);
    const [stickerPicker, setStickerPicker] = useState(false);
    const [audiencePicker, setAudiencePicker] = useState(false);
    const [stickerEditor, setStickerEditor] = useState(null); // {type, draft}
    const fileImgRef = useRef(null);
    const fileVidRef = useRef(null);

    useEscapeKey(onClose, !stickerPicker && !audiencePicker && !stickerEditor);

    const handleFile = (file, kind) => {
        if (!file) return;
        const maxBytes = kind === "video" ? MAX_VIDEO_BYTES : MAX_IMAGE_BYTES;
        if (file.size > maxBytes) {
            toast.error(kind === "video" ? "Vídeo > 4.5 MB. Encurta antes de carregar." : "Imagem > 2 MB.");
            return;
        }
        const reader = new FileReader();
        reader.onload = (ev) => {
            if (kind === "video") setMedia((m) => ({ ...m, video: ev.target.result }));
            else setMedia((m) => ({ ...m, image: ev.target.result }));
        };
        reader.readAsDataURL(file);
    };

    const publish = async () => {
        if (tab === "image" && !media.image) { toast.error("Adiciona uma imagem"); return; }
        if (tab === "video" && !media.video) { toast.error("Adiciona um vídeo"); return; }
        if (tab === "text" && !textContent.trim()) { toast.error("Escreve algo"); return; }
        setBusy(true);
        try {
            const payload = {
                media_type: tab,
                image: tab === "image" ? media.image : "",
                video: tab === "video" ? media.video : "",
                text_content: tab === "text" ? textContent : "",
                background: tab === "text" ? background : "coral",
                text_color: textColor,
                font_style: fontStyle,
                caption: tab !== "text" ? caption : "",
                stickers,
                audience,
                allow_replies: allowReplies,
                allow_reactions: allowReactions,
            };
            await api.post("/stories", payload);
            toast.success("Story publicado por 24h ✨");
            onCreated?.();
            onClose();
        } catch (e) { toastApiError(e); }
        finally { setBusy(false); }
    };

    const addSticker = (sticker) => {
        // posição inicial aleatória leve no canvas
        const newSticker = {
            ...sticker,
            id: sticker.id || stickerId(),
            x: 0.5,
            y: 0.45 + (stickers.length % 3) * 0.12,
            rotation: 0,
            scale: 1,
        };
        setStickers((s) => [...s, newSticker]);
    };

    const removeSticker = (id) => setStickers((s) => s.filter((x) => x.id !== id));

    const audienceMeta = STORY_AUDIENCES.find((a) => a.key === audience);

    return (
        <div className="fixed inset-0 z-[95] bg-black/95 grid place-items-center" data-testid="story-composer">
            <div className="relative w-full max-w-md h-full lg:h-auto lg:max-h-[92vh] lg:rounded-3xl overflow-hidden bg-white shadow-2xl flex flex-col">
                {/* Header */}
                <div className="px-4 pt-3 pb-2 flex items-center gap-2 border-b border-black/[0.05]">
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-black/[0.06] tap-shrink" data-testid="composer-close">
                        <X size={18} />
                    </button>
                    <h2 className="flex-1 font-display text-[18px] tracking-tight">Novo story</h2>
                    <button
                        onClick={publish}
                        disabled={busy}
                        data-testid="composer-publish"
                        className="px-4 py-1.5 rounded-full bg-black text-white font-mono uppercase text-[11px] tracking-wider hover:bg-coral disabled:opacity-50 inline-flex items-center gap-1.5"
                    >
                        {busy ? <Loader2 size={12} className="animate-spin" /> : <Check size={13} />}
                        Publicar
                    </button>
                </div>

                {/* Tabs */}
                <div className="px-4 pt-3 flex gap-1.5 border-b border-black/[0.05]">
                    {[
                        { k: "image", label: "Foto",  Icon: ImageIcon },
                        { k: "video", label: "Vídeo", Icon: Video },
                        { k: "text",  label: "Texto", Icon: Type },
                    ].map(({ k, label, Icon }) => (
                        <button
                            key={k}
                            onClick={() => setTab(k)}
                            data-testid={`composer-tab-${k}`}
                            className={`flex-1 px-2 py-2.5 -mb-px border-b-2 inline-flex items-center justify-center gap-1.5 font-mono text-[11px] uppercase tracking-wider transition ${
                                tab === k
                                    ? "border-coral text-black"
                                    : "border-transparent text-black/45 hover:text-black/75"
                            }`}
                        >
                            <Icon size={13} strokeWidth={2.2} /> {label}
                        </button>
                    ))}
                </div>

                {/* Canvas preview */}
                <div className="flex-1 overflow-hidden flex flex-col">
                    <div className="relative mx-auto mt-3 mb-2 w-full max-w-[300px] aspect-[9/16] rounded-2xl overflow-hidden bg-black border border-black/[0.08] shadow-lg">
                        {tab === "text" && (
                            <div className="absolute inset-0 grid place-items-center p-6" style={{ background: bgCss(background) }}>
                                {textContent ? (
                                    <div className="text-center break-words" style={{ ...fontStyleFor(fontStyle), fontSize: textPreviewSize(textContent), color: textColor, lineHeight: 1.1 }}>
                                        {textContent}
                                    </div>
                                ) : (
                                    <span className="font-mono text-[10px] uppercase tracking-[0.2em]" style={{ color: textColor, opacity: 0.55 }}>Escreve algo abaixo</span>
                                )}
                            </div>
                        )}
                        {tab === "image" && (
                            media.image ? (
                                <img src={media.image} alt="" className="absolute inset-0 w-full h-full object-cover" />
                            ) : (
                                <button
                                    onClick={() => fileImgRef.current?.click()}
                                    data-testid="composer-pick-image"
                                    className="absolute inset-0 grid place-items-center bg-gradient-to-br from-black/[0.04] to-black/[0.10] text-black/55 hover:text-coral transition"
                                >
                                    <div className="text-center">
                                        <ImageIcon size={36} strokeWidth={1.4} className="mx-auto mb-2" />
                                        <div className="font-mono text-[10.5px] uppercase tracking-[0.16em]">Carregar imagem</div>
                                        <div className="font-mono text-[10px] mt-1 text-black/35">JPG/PNG · até 2MB</div>
                                    </div>
                                </button>
                            )
                        )}
                        {tab === "video" && (
                            media.video ? (
                                <video src={media.video} autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover" />
                            ) : (
                                <button
                                    onClick={() => fileVidRef.current?.click()}
                                    data-testid="composer-pick-video"
                                    className="absolute inset-0 grid place-items-center bg-gradient-to-br from-black/[0.04] to-black/[0.10] text-black/55 hover:text-coral transition"
                                >
                                    <div className="text-center">
                                        <Video size={36} strokeWidth={1.4} className="mx-auto mb-2" />
                                        <div className="font-mono text-[10.5px] uppercase tracking-[0.16em]">Carregar vídeo</div>
                                        <div className="font-mono text-[10px] mt-1 text-black/35">MP4/WEBM · até ~10s, 4.5MB</div>
                                    </div>
                                </button>
                            )
                        )}

                        {/* Caption overlay (image/video) */}
                        {tab !== "text" && caption && (
                            <div className="absolute bottom-12 left-3 right-3 z-30 text-white font-display text-[16px] font-light tracking-tight leading-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.7)]">
                                {caption}
                            </div>
                        )}

                        {/* Stickers preview */}
                        {stickers.map((s) => (
                            <div
                                key={s.id}
                                className="absolute z-30 cursor-pointer"
                                style={{ left: `${s.x * 100}%`, top: `${s.y * 100}%`, transform: "translate(-50%, -50%)" }}
                                onClick={() => removeSticker(s.id)}
                                data-testid={`preview-sticker-${s.type}`}
                                title="Toca para remover"
                            >
                                <StickerPreview sticker={s} />
                            </div>
                        ))}

                        {/* Audiência badge canto sup direito */}
                        <button
                            onClick={() => setAudiencePicker(true)}
                            data-testid="story-composer-audience-btn"
                            className="absolute top-2 right-2 z-40 px-2.5 py-1 rounded-full bg-black/55 backdrop-blur text-white text-[10px] font-mono uppercase tracking-wider inline-flex items-center gap-1.5 hover:bg-black/75"
                        >
                            <span>{audienceMeta?.emoji}</span>
                            <span>{audienceMeta?.label}</span>
                            <ChevronDown size={11} />
                        </button>
                    </div>

                    {/* Controles (scrollable) */}
                    <div className="px-4 pb-4 overflow-y-auto flex-1 space-y-3">
                        {/* Text-mode controls */}
                        {tab === "text" && (
                            <>
                                <textarea
                                    value={textContent}
                                    onChange={(e) => setTextContent(e.target.value.slice(0, 280))}
                                    placeholder="O que sentes?"
                                    rows={2}
                                    data-testid="composer-text-input"
                                    className="w-full px-3 py-2 rounded-xl border border-black/10 bg-black/[0.02] resize-none text-[14px] outline-none focus:bg-white focus:border-coral"
                                />
                                <div>
                                    <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-black/45 mb-1.5">Fundo</div>
                                    <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                                        {STORY_BG_PRESETS.map((b) => (
                                            <button
                                                key={b.key}
                                                onClick={() => setBackground(b.key)}
                                                style={{ background: b.css }}
                                                className={`flex-shrink-0 w-9 h-9 rounded-full border-2 transition ${background === b.key ? "border-coral scale-110" : "border-white/0"}`}
                                                data-testid={`composer-bg-${b.key}`}
                                                aria-label={b.key}
                                            />
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-black/45 mb-1.5">Fonte</div>
                                    <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-1">
                                        {STORY_FONTS.map((f) => (
                                            <button
                                                key={f.key}
                                                onClick={() => setFontStyle(f.key)}
                                                style={f.style}
                                                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-[12px] border ${fontStyle === f.key ? "border-coral bg-coral/10" : "border-black/15 hover:border-black/40"}`}
                                                data-testid={`composer-font-${f.key}`}
                                            >
                                                {f.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                <div>
                                    <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-black/45 mb-1.5">Cor do texto</div>
                                    <div className="flex gap-1.5">
                                        {TEXT_COLORS.map((c) => (
                                            <button
                                                key={c}
                                                onClick={() => setTextColor(c)}
                                                style={{ background: c }}
                                                className={`w-7 h-7 rounded-full border-2 ${textColor === c ? "border-coral scale-110" : "border-black/15"}`}
                                                aria-label={c}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}

                        {/* Image/video caption */}
                        {tab !== "text" && (
                            <input
                                value={caption}
                                onChange={(e) => setCaption(e.target.value.slice(0, 200))}
                                placeholder="Legenda (opcional)"
                                data-testid="composer-caption-input"
                                className="w-full px-3 py-2 rounded-xl border border-black/10 bg-black/[0.02] text-[13.5px] outline-none focus:bg-white focus:border-coral"
                            />
                        )}

                        {/* Stickers add button */}
                        <button
                            onClick={() => setStickerPicker(true)}
                            data-testid="composer-stickers-btn"
                            className="w-full px-3 py-2 rounded-xl bg-coral/8 border border-coral/30 text-coral-deep font-mono text-[12px] uppercase tracking-wider inline-flex items-center justify-center gap-1.5 hover:bg-coral/15"
                        >
                            <Sticker size={14} strokeWidth={2.2} />
                            Adicionar sticker {stickers.length > 0 && `· ${stickers.length}`}
                        </button>

                        {/* Toggles */}
                        <div className="flex gap-2">
                            <button
                                onClick={() => setAllowReactions((v) => !v)}
                                data-testid="composer-toggle-reactions"
                                className={`flex-1 px-3 py-2 rounded-xl text-[11.5px] font-mono uppercase tracking-wider inline-flex items-center justify-center gap-1.5 ${allowReactions ? "bg-black text-white" : "bg-black/[0.05] text-black/55"}`}
                            >
                                <Heart size={12} strokeWidth={2.4} /> Reacções
                            </button>
                            <button
                                onClick={() => setAllowReplies((v) => !v)}
                                data-testid="composer-toggle-replies"
                                className={`flex-1 px-3 py-2 rounded-xl text-[11.5px] font-mono uppercase tracking-wider inline-flex items-center justify-center gap-1.5 ${allowReplies ? "bg-black text-white" : "bg-black/[0.05] text-black/55"}`}
                            >
                                <MessageCircle size={12} strokeWidth={2.4} /> Respostas
                            </button>
                        </div>

                        <div className="font-mono text-[10px] text-black/35 text-center pt-1">
                            Stories expiram em 24h · pode ser fixado em destaques
                        </div>
                    </div>
                </div>

                <input ref={fileImgRef} type="file" accept="image/*" hidden onChange={(e) => handleFile(e.target.files?.[0], "image")} data-testid="composer-img-file" />
                <input ref={fileVidRef} type="file" accept="video/*" hidden onChange={(e) => handleFile(e.target.files?.[0], "video")} data-testid="composer-vid-file" />

                {/* Sub-panels */}
                {audiencePicker && (
                    <AudiencePicker
                        value={audience}
                        onSelect={(v) => { setAudience(v); setAudiencePicker(false); }}
                        onClose={() => setAudiencePicker(false)}
                    />
                )}

                {stickerPicker && (
                    <StickerPicker
                        onSelect={(t) => {
                            setStickerPicker(false);
                            setStickerEditor({ type: t.key });
                        }}
                        onClose={() => setStickerPicker(false)}
                    />
                )}

                {stickerEditor && (
                    <StickerEditor
                        type={stickerEditor.type}
                        onClose={() => setStickerEditor(null)}
                        onSubmit={(sticker) => {
                            addSticker({ ...sticker, type: stickerEditor.type });
                            setStickerEditor(null);
                        }}
                    />
                )}
            </div>
        </div>
    );
}

function textPreviewSize(text) {
    const n = (text || "").length;
    if (n < 30) return "28px";
    if (n < 80) return "22px";
    if (n < 160) return "18px";
    return "14px";
}

function StickerPreview({ sticker }) {
    if (sticker.type === "poll") {
        return (
            <div className="bg-white/95 rounded-xl shadow px-2.5 py-1.5 text-[10px]">
                <div className="font-medium truncate max-w-[120px]">📊 {sticker.data?.question || "Sondagem"}</div>
            </div>
        );
    }
    if (sticker.type === "question") {
        return <div className="bg-white/95 rounded-xl shadow px-2.5 py-1.5 text-[10px] font-medium">❓ {sticker.data?.prompt?.slice(0, 30) || "Pergunta"}</div>;
    }
    if (sticker.type === "slider") {
        return <div className="bg-white/95 rounded-xl shadow px-2.5 py-1.5 text-[10px] font-medium">🎚 {sticker.data?.prompt?.slice(0, 30) || "Slider"}</div>;
    }
    if (sticker.type === "mention") return <div className="bg-white/95 rounded-full shadow px-2 py-0.5 text-[10px] font-medium text-coral">@{sticker.data?.username}</div>;
    if (sticker.type === "hashtag") return <div className="bg-gradient-to-r from-coral to-coral-deep text-white rounded-full shadow px-2 py-0.5 text-[10px] font-semibold">#{sticker.data?.tag}</div>;
    if (sticker.type === "location") return <div className="bg-white/95 rounded-full shadow px-2 py-0.5 text-[10px] font-medium">📍 {sticker.data?.place}</div>;
    if (sticker.type === "countdown") return <div className="bg-black/85 text-white rounded-xl shadow px-2 py-0.5 text-[10px] font-medium">⏱ {sticker.data?.title}</div>;
    if (sticker.type === "link") return <div className="bg-white/95 rounded-full shadow px-2 py-0.5 text-[10px] font-medium">🔗 {sticker.data?.label}</div>;
    if (sticker.type === "music") return <div className="bg-white/95 rounded-full shadow px-2 py-0.5 text-[10px] font-medium">🎵 {sticker.data?.title}</div>;
    return null;
}

function AudiencePicker({ value, onSelect, onClose }) {
    return (
        <div className="absolute inset-0 z-[100] bg-black/55 backdrop-blur-sm flex items-end lg:items-center justify-center" onClick={onClose} data-testid="audience-picker">
            <div className="w-full lg:max-w-sm lg:rounded-3xl rounded-t-3xl bg-white shadow-2xl p-4" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-display text-[16px] tracking-tight">Quem pode ver?</h3>
                    <button onClick={onClose}><X size={16} /></button>
                </div>
                <ul className="space-y-1.5">
                    {STORY_AUDIENCES.map((a) => {
                        const Icon = a.key === "everyone" ? Globe2 : a.key === "following" ? UserCheck : Users2;
                        return (
                            <li key={a.key}>
                                <button
                                    onClick={() => onSelect(a.key)}
                                    data-testid={`audience-${a.key}`}
                                    className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-3 transition ${value === a.key ? "bg-coral/12 ring-1 ring-coral/40" : "hover:bg-black/[0.04]"}`}
                                >
                                    <Icon size={16} className="text-coral" strokeWidth={2.2} />
                                    <div className="flex-1">
                                        <div className="font-heading text-[13px] tracking-tight">{a.label} <span className="ml-1">{a.emoji}</span></div>
                                        <div className="font-mono text-[10.5px] text-black/45">{a.description}</div>
                                    </div>
                                    {value === a.key && <Check size={14} className="text-coral" />}
                                </button>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </div>
    );
}

function StickerPicker({ onSelect, onClose }) {
    return (
        <div className="absolute inset-0 z-[100] bg-black/55 backdrop-blur-sm flex items-end lg:items-center justify-center" onClick={onClose} data-testid="sticker-picker">
            <div className="w-full lg:max-w-sm lg:rounded-3xl rounded-t-3xl bg-white shadow-2xl p-4" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-display text-[16px] tracking-tight">Adicionar sticker</h3>
                    <button onClick={onClose}><X size={16} /></button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                    {STICKER_TYPES.map((t) => (
                        <button
                            key={t.key}
                            onClick={() => onSelect(t)}
                            data-testid={`sticker-add-${t.key}`}
                            className="aspect-square rounded-2xl bg-gradient-to-br from-coral/10 to-coral/[0.04] hover:from-coral/25 hover:to-coral/15 border border-coral/20 flex flex-col items-center justify-center gap-1 transition"
                        >
                            <span className="text-[26px]">{t.emoji}</span>
                            <span className="font-mono text-[10px] uppercase tracking-wider text-black/70">{t.label}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}

function StickerEditor({ type, onSubmit, onClose }) {
    const [draft, setDraft] = useState(() => {
        switch (type) {
            case "poll":      return { question: "", options: [{ id: "a", text: "" }, { id: "b", text: "" }] };
            case "question":  return { prompt: "Faz-me uma pergunta", placeholder: "Escreve aqui..." };
            case "slider":    return { prompt: "Quão fixe é?", emoji: "🔥" };
            case "mention":   return { username: "" };
            case "hashtag":   return { tag: "" };
            case "location":  return { place: "" };
            case "countdown": return { title: "Contagem", ends_at: defaultCountdownIso() };
            case "link":      return { url: "", label: "Saber mais" };
            case "music":     return { title: "", artist: "" };
            default:          return {};
        }
    });
    const submit = () => {
        // validação leve
        if (type === "poll" && (!draft.options || draft.options.filter((o) => o.text.trim()).length < 2)) {
            toast.error("A sondagem precisa de pelo menos 2 opções com texto");
            return;
        }
        if (type === "mention" && !draft.username.trim()) { toast.error("Indica o utilizador"); return; }
        if (type === "hashtag" && !draft.tag.trim()) { toast.error("Indica a hashtag"); return; }
        if (type === "location" && !draft.place.trim()) { toast.error("Indica o local"); return; }
        if (type === "link" && !/^https?:\/\//i.test(draft.url.trim())) { toast.error("Link tem de começar com http(s)://"); return; }
        if (type === "music" && !draft.title.trim()) { toast.error("Indica o título"); return; }
        if (type === "countdown" && !draft.ends_at) { toast.error("Define a data"); return; }
        onSubmit({ data: { ...draft } });
    };
    return (
        <div className="absolute inset-0 z-[101] bg-black/65 backdrop-blur flex items-center justify-center p-4" onClick={onClose} data-testid="sticker-editor">
            <div className="w-full max-w-sm rounded-3xl bg-white shadow-2xl p-5" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-3">
                    <h3 className="font-display text-[18px] tracking-tight capitalize">{type}</h3>
                    <button onClick={onClose}><X size={16} /></button>
                </div>
                {type === "poll" && (
                    <div className="space-y-2">
                        <input value={draft.question} onChange={(e) => setDraft({ ...draft, question: e.target.value })} placeholder="Pergunta…" className="w-full px-3 py-2 rounded-xl border border-black/15 outline-none focus:border-coral text-[13px]" />
                        {draft.options.map((o, idx) => (
                            <input
                                key={o.id}
                                value={o.text}
                                onChange={(e) => {
                                    const newOpts = [...draft.options];
                                    newOpts[idx] = { ...o, text: e.target.value };
                                    setDraft({ ...draft, options: newOpts });
                                }}
                                placeholder={`Opção ${idx + 1}`}
                                className="w-full px-3 py-2 rounded-xl border border-black/15 outline-none focus:border-coral text-[13px]"
                            />
                        ))}
                        <div className="flex gap-2">
                            {draft.options.length < 4 && (
                                <button
                                    onClick={() => setDraft({ ...draft, options: [...draft.options, { id: `o${draft.options.length}`, text: "" }] })}
                                    className="text-[11px] font-mono text-coral hover:underline"
                                >
                                    + opção
                                </button>
                            )}
                            {draft.options.length > 2 && (
                                <button
                                    onClick={() => setDraft({ ...draft, options: draft.options.slice(0, -1) })}
                                    className="text-[11px] font-mono text-black/45 hover:underline"
                                >
                                    – remover última
                                </button>
                            )}
                        </div>
                    </div>
                )}
                {type === "question" && (
                    <input value={draft.prompt} onChange={(e) => setDraft({ ...draft, prompt: e.target.value })} placeholder="Faz-me uma pergunta" className="w-full px-3 py-2 rounded-xl border border-black/15 outline-none focus:border-coral text-[13px]" />
                )}
                {type === "slider" && (
                    <div className="space-y-2">
                        <input value={draft.prompt} onChange={(e) => setDraft({ ...draft, prompt: e.target.value })} placeholder="Pergunta" className="w-full px-3 py-2 rounded-xl border border-black/15 outline-none focus:border-coral text-[13px]" />
                        <input value={draft.emoji} onChange={(e) => setDraft({ ...draft, emoji: e.target.value })} placeholder="Emoji" maxLength={4} className="w-24 px-3 py-2 rounded-xl border border-black/15 outline-none focus:border-coral text-[13px] text-center" />
                    </div>
                )}
                {type === "mention" && (
                    <div className="flex items-center gap-1.5">
                        <span className="font-mono text-coral text-[18px]">@</span>
                        <input value={draft.username} onChange={(e) => setDraft({ ...draft, username: e.target.value })} placeholder="username" className="flex-1 px-3 py-2 rounded-xl border border-black/15 outline-none focus:border-coral text-[13px]" />
                    </div>
                )}
                {type === "hashtag" && (
                    <div className="flex items-center gap-1.5">
                        <span className="font-mono text-coral text-[18px]">#</span>
                        <input value={draft.tag} onChange={(e) => setDraft({ ...draft, tag: e.target.value })} placeholder="lisboa" className="flex-1 px-3 py-2 rounded-xl border border-black/15 outline-none focus:border-coral text-[13px]" />
                    </div>
                )}
                {type === "location" && (
                    <input value={draft.place} onChange={(e) => setDraft({ ...draft, place: e.target.value })} placeholder="ex: Tasca do Chico, Alfama" className="w-full px-3 py-2 rounded-xl border border-black/15 outline-none focus:border-coral text-[13px]" />
                )}
                {type === "countdown" && (
                    <div className="space-y-2">
                        <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Título (ex: Concerto)" className="w-full px-3 py-2 rounded-xl border border-black/15 outline-none focus:border-coral text-[13px]" />
                        <input type="datetime-local" value={draft.ends_at?.slice(0, 16) || ""} onChange={(e) => setDraft({ ...draft, ends_at: new Date(e.target.value).toISOString() })} className="w-full px-3 py-2 rounded-xl border border-black/15 outline-none focus:border-coral text-[13px]" />
                    </div>
                )}
                {type === "link" && (
                    <div className="space-y-2">
                        <input value={draft.url} onChange={(e) => setDraft({ ...draft, url: e.target.value })} placeholder="https://..." className="w-full px-3 py-2 rounded-xl border border-black/15 outline-none focus:border-coral text-[13px]" />
                        <input value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} placeholder="Etiqueta" className="w-full px-3 py-2 rounded-xl border border-black/15 outline-none focus:border-coral text-[13px]" />
                    </div>
                )}
                {type === "music" && (
                    <div className="space-y-2">
                        <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Título da música" className="w-full px-3 py-2 rounded-xl border border-black/15 outline-none focus:border-coral text-[13px]" />
                        <input value={draft.artist} onChange={(e) => setDraft({ ...draft, artist: e.target.value })} placeholder="Artista" className="w-full px-3 py-2 rounded-xl border border-black/15 outline-none focus:border-coral text-[13px]" />
                    </div>
                )}
                <button
                    onClick={submit}
                    data-testid="sticker-editor-save"
                    className="mt-4 w-full px-4 py-2.5 rounded-full bg-black text-white font-mono uppercase text-[11px] tracking-wider hover:bg-coral inline-flex items-center justify-center gap-1.5"
                >
                    <Check size={12} /> Adicionar ao story
                </button>
            </div>
        </div>
    );
}

function defaultCountdownIso() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setMinutes(0); d.setSeconds(0); d.setMilliseconds(0);
    return d.toISOString();
}
