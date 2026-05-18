import { useRef, useState } from "react";
import {
    X, Image as ImageIcon, Video, Type, Sticker, Loader2, Globe2, Users2, UserCheck,
    MessageCircle, Heart, Check, Trash2, Palette, Sparkles, ChevronRight,
} from "lucide-react";
import { api, toastApiError } from "../../lib/api";
import { useEscapeKey } from "../../hooks/useClickOutside";
import { toast } from "sonner";
import {
    STORY_BG_PRESETS, STORY_FONTS, STORY_AUDIENCES, STORY_TEXT_COLORS,
    STORY_TEXT_STYLES, STICKER_TYPES,
    bgCss, fontStyleFor, computeTextDecorationStyle, LIGHT_BG_KEYS,
} from "./storyConstants";
import "./stories.css";

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const MAX_VIDEO_BYTES = 4.5 * 1024 * 1024;

let _stickerSeq = 0;
const stickerId = () => `sk-${Date.now()}-${++_stickerSeq}`;

const PANELS = {
    NONE: null,
    BACKGROUND: "background",
    FONT: "font",
    COLOR: "color",
    STYLE: "style",
    AUDIENCE: "audience",
    STICKER_PICK: "stickerPick",
    STICKER_EDIT: "stickerEdit",
};

export function StoryComposer({ onClose, onCreated }) {
    const [tab, setTab] = useState("image");
    const [media, setMedia] = useState({ image: "", video: "" });
    const [caption, setCaption] = useState("");
    const [textContent, setTextContent] = useState("");
    const [background, setBackground] = useState("fado");
    const [textColor, setTextColor] = useState("#ffffff");
    const [fontStyleKey, setFontStyleKey] = useState("modern");
    const [textStyle, setTextStyle] = useState("plain");
    const [stickers, setStickers] = useState([]);
    const [audience, setAudience] = useState("everyone");
    const [allowReplies, setAllowReplies] = useState(true);
    const [allowReactions, setAllowReactions] = useState(true);
    const [busy, setBusy] = useState(false);
    const [panel, setPanel] = useState(PANELS.NONE);
    const [editorType, setEditorType] = useState(null);
    const [armedTrash, setArmedTrash] = useState(false);
    const [dragging, setDragging] = useState(false);
    const fileImgRef = useRef(null);
    const fileVidRef = useRef(null);
    const canvasRef = useRef(null);
    const dragStateRef = useRef(null);

    useEscapeKey(() => {
        if (panel) setPanel(PANELS.NONE);
        else onClose();
    }, true);

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
                font_style: fontStyleKey,
                text_style: textStyle,
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

    const updateSticker = (id, patch) => {
        setStickers((s) => s.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    };

    const removeSticker = (id) => {
        setStickers((s) => s.filter((x) => x.id !== id));
    };

    // Drag stickers within the canvas via pointer events
    const onStickerPointerDown = (e, sticker) => {
        e.stopPropagation();
        if (!canvasRef.current) return;
        const rect = canvasRef.current.getBoundingClientRect();
        dragStateRef.current = {
            id: sticker.id,
            rect,
            offsetX: 0,
            offsetY: 0,
            startX: e.clientX,
            startY: e.clientY,
            originalX: sticker.x,
            originalY: sticker.y,
            moved: false,
        };
        try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /**/ }
        e.currentTarget.classList.add("is-dragging");
        setDragging(true);
    };

    const onStickerPointerMove = (e) => {
        const st = dragStateRef.current;
        if (!st) return;
        const dx = e.clientX - st.startX;
        const dy = e.clientY - st.startY;
        if (!st.moved && Math.hypot(dx, dy) > 4) st.moved = true;
        const newX = clamp(st.originalX + dx / st.rect.width, 0.05, 0.95);
        const newY = clamp(st.originalY + dy / st.rect.height, 0.06, 0.94);
        updateSticker(st.id, { x: newX, y: newY });
        // Detect drag-to-trash zone: bottom-center of canvas
        const bottomThreshold = st.rect.top + st.rect.height - 70;
        const armed = e.clientY > bottomThreshold && Math.abs(e.clientX - (st.rect.left + st.rect.width / 2)) < 80;
        setArmedTrash(armed);
    };

    const onStickerPointerUp = (e, sticker) => {
        const st = dragStateRef.current;
        e.currentTarget.classList.remove("is-dragging");
        if (st && armedTrash) {
            removeSticker(sticker.id);
        } else if (st && !st.moved) {
            if (window.confirm("Remover este sticker?")) removeSticker(sticker.id);
        }
        dragStateRef.current = null;
        setArmedTrash(false);
        setDragging(false);
    };

    const audienceMeta = STORY_AUDIENCES.find((a) => a.key === audience);
    const isLightBg = LIGHT_BG_KEYS.has(background);
    const fStyle = fontStyleFor(fontStyleKey);
    const decorStyle = computeTextDecorationStyle(textStyle, textColor);

    return (
        <div className="fixed inset-0 z-[95] bg-black sc-fade-in" data-testid="story-composer">
            {/* Backdrop blur layer */}
            <div className="absolute inset-0 bg-gradient-to-b from-black via-black to-zinc-950" />

            {/* Top bar */}
            <div className="relative z-30 flex items-center gap-2 px-4 pt-4 pb-2">
                <button
                    onClick={onClose}
                    data-testid="composer-close"
                    className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur grid place-items-center text-white sc-toolbar-btn"
                    aria-label="Fechar"
                >
                    <X size={17} strokeWidth={2.2} />
                </button>

                <div className="flex-1 flex justify-center">
                    <div className="inline-flex items-center bg-white/10 backdrop-blur rounded-full p-1 gap-1">
                        {[
                            { k: "image", label: "Foto",  Icon: ImageIcon },
                            { k: "video", label: "Vídeo", Icon: Video },
                            { k: "text",  label: "Texto", Icon: Type },
                        ].map(({ k, label, Icon }) => (
                            <button
                                key={k}
                                onClick={() => setTab(k)}
                                data-testid={`composer-tab-${k}`}
                                className={`px-3 py-1.5 rounded-full inline-flex items-center gap-1.5 font-mono text-[10.5px] uppercase tracking-[0.14em] transition ${
                                    tab === k
                                        ? "bg-white text-black shadow-lg"
                                        : "text-white/65 hover:text-white"
                                }`}
                            >
                                <Icon size={12} strokeWidth={2.4} /> {label}
                            </button>
                        ))}
                    </div>
                </div>

                <button
                    onClick={publish}
                    disabled={busy}
                    data-testid="composer-publish"
                    className="px-4 py-2 rounded-full bg-gradient-to-r from-coral to-coral-deep text-white font-mono uppercase text-[10.5px] tracking-[0.14em] shadow-lg shadow-coral/40 inline-flex items-center gap-1.5 disabled:opacity-50 sc-toolbar-btn"
                >
                    {busy ? <Loader2 size={12} className="animate-spin" /> : <ChevronRight size={13} strokeWidth={2.6} />}
                    Publicar
                </button>
            </div>

            {/* Main canvas zone */}
            <div className="relative z-20 flex flex-col items-center justify-center px-3 py-2" style={{ height: "calc(100vh - 200px)" }}>
                <div
                    ref={canvasRef}
                    className="sc-canvas relative w-full max-w-[340px] aspect-[9/16] rounded-3xl overflow-hidden bg-black shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)] ring-1 ring-white/10"
                >
                    {/* Background / media */}
                    {tab === "text" && (
                        <div className="absolute inset-0 grid place-items-center px-6 py-12" style={{ background: bgCss(background) }}>
                            <textarea
                                value={textContent}
                                onChange={(e) => setTextContent(e.target.value.slice(0, 280))}
                                placeholder={textContent ? "" : "Escreve algo…"}
                                rows={3}
                                data-testid="composer-text-input"
                                className="sc-text-overlay"
                                style={{
                                    ...fStyle,
                                    fontSize: textPreviewSize(textContent),
                                    color: textColor,
                                    textShadow: isLightBg ? "none" : "0 2px 18px rgba(0,0,0,0.35)",
                                    ...decorStyle,
                                }}
                            />
                        </div>
                    )}
                    {tab === "image" && (
                        media.image ? (
                            <img src={media.image} alt="" className="absolute inset-0 w-full h-full object-cover" />
                        ) : (
                            <button
                                onClick={() => fileImgRef.current?.click()}
                                data-testid="composer-pick-image"
                                className="absolute inset-0 grid place-items-center bg-gradient-to-br from-zinc-900 to-black text-white/55 hover:text-coral transition"
                            >
                                <div className="text-center">
                                    <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-white/10 grid place-items-center">
                                        <ImageIcon size={26} strokeWidth={1.6} />
                                    </div>
                                    <div className="font-mono text-[10.5px] uppercase tracking-[0.18em]">Carregar imagem</div>
                                    <div className="font-mono text-[10px] mt-1 text-white/35">JPG/PNG · até 2 MB</div>
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
                                className="absolute inset-0 grid place-items-center bg-gradient-to-br from-zinc-900 to-black text-white/55 hover:text-coral transition"
                            >
                                <div className="text-center">
                                    <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-white/10 grid place-items-center">
                                        <Video size={26} strokeWidth={1.6} />
                                    </div>
                                    <div className="font-mono text-[10.5px] uppercase tracking-[0.18em]">Carregar vídeo</div>
                                    <div className="font-mono text-[10px] mt-1 text-white/35">MP4/WEBM · até ~10 s</div>
                                </div>
                            </button>
                        )
                    )}

                    {/* Caption (image/video) */}
                    {tab !== "text" && caption && (
                        <div
                            className="absolute bottom-14 left-3 right-3 z-30 text-center"
                            style={{
                                fontFamily: fStyle.fontFamily,
                                fontWeight: fStyle.fontWeight,
                                color: textColor,
                                fontSize: "18px",
                                textShadow: "0 2px 16px rgba(0,0,0,0.7)",
                                ...decorStyle,
                            }}
                        >
                            {caption}
                        </div>
                    )}

                    {/* Stickers — draggable */}
                    {stickers.map((s) => (
                        <div
                            key={s.id}
                            className="sc-sticker absolute z-30"
                            style={{
                                left: `${s.x * 100}%`,
                                top: `${s.y * 100}%`,
                                transform: `translate(-50%, -50%) rotate(${s.rotation || 0}deg) scale(${s.scale || 1})`,
                            }}
                            onPointerDown={(e) => onStickerPointerDown(e, s)}
                            onPointerMove={onStickerPointerMove}
                            onPointerUp={(e) => onStickerPointerUp(e, s)}
                            onPointerCancel={(e) => onStickerPointerUp(e, s)}
                            data-testid={`preview-sticker-${s.type}`}
                            title="Arrasta para reposicionar · tap para remover"
                        >
                            <StickerPreview sticker={s} />
                        </div>
                    ))}

                    {/* Audience pill (top-right) */}
                    <button
                        onClick={() => setPanel(PANELS.AUDIENCE)}
                        data-testid="story-composer-audience-btn"
                        className="absolute top-3 right-3 z-40 px-2.5 py-1 rounded-full bg-black/55 backdrop-blur text-white text-[10px] font-mono uppercase tracking-wider inline-flex items-center gap-1.5 hover:bg-black/75 sc-toolbar-btn"
                    >
                        <span>{audienceMeta?.emoji}</span>
                        <span>{audienceMeta?.label}</span>
                    </button>

                    {/* Trash zone (visible when dragging) */}
                    {dragging && (
                        <div
                            className={`sc-trash absolute bottom-4 left-1/2 -translate-x-1/2 z-50 w-14 h-14 rounded-full grid place-items-center bg-black/70 text-white backdrop-blur ${
                                armedTrash ? "is-armed" : ""
                            }`}
                        >
                            <Trash2 size={18} strokeWidth={2.2} />
                        </div>
                    )}
                </div>

                {/* Floating toolbar (right side of canvas, only for text tab + always for stickers) */}
                <div className="absolute right-4 top-[max(80px,calc(50%-180px))] flex flex-col gap-2 z-30">
                    <button
                        onClick={() => setPanel(PANELS.STICKER_PICK)}
                        data-testid="composer-stickers-btn"
                        className="w-11 h-11 rounded-full bg-white/12 hover:bg-white/22 backdrop-blur text-white grid place-items-center sc-toolbar-btn"
                        title="Stickers"
                    >
                        <Sticker size={17} strokeWidth={2.2} />
                        {stickers.length > 0 && (
                            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-coral text-white text-[10px] font-mono grid place-items-center">{stickers.length}</span>
                        )}
                    </button>
                    {tab === "text" && (
                        <>
                            <button
                                onClick={() => setPanel(PANELS.BACKGROUND)}
                                data-testid="composer-bg-btn"
                                className="w-11 h-11 rounded-full backdrop-blur grid place-items-center sc-toolbar-btn ring-1 ring-white/30"
                                style={{ background: bgCss(background) }}
                                title="Fundo"
                            >
                                <span className="sr-only">Fundo</span>
                            </button>
                            <button
                                onClick={() => setPanel(PANELS.FONT)}
                                data-testid="composer-font-btn"
                                className="w-11 h-11 rounded-full bg-white/12 hover:bg-white/22 backdrop-blur text-white grid place-items-center sc-toolbar-btn"
                                style={{ ...fStyle, fontSize: 18 }}
                                title="Fonte"
                            >
                                Aa
                            </button>
                            <button
                                onClick={() => setPanel(PANELS.STYLE)}
                                data-testid="composer-style-btn"
                                className="w-11 h-11 rounded-full bg-white/12 hover:bg-white/22 backdrop-blur text-white grid place-items-center sc-toolbar-btn"
                                title="Estilo do texto"
                            >
                                <Sparkles size={16} strokeWidth={2.2} />
                            </button>
                        </>
                    )}
                    <button
                        onClick={() => setPanel(PANELS.COLOR)}
                        data-testid="composer-color-btn"
                        className="w-11 h-11 rounded-full bg-white/12 hover:bg-white/22 backdrop-blur grid place-items-center text-white sc-toolbar-btn"
                        title="Cor do texto"
                    >
                        <Palette size={16} strokeWidth={2.2} />
                        <span className="absolute bottom-1 right-1 w-3 h-3 rounded-full border border-white/80" style={{ background: textColor }} />
                    </button>
                </div>
            </div>

            {/* Bottom bar — caption + toggles */}
            <div className="relative z-20 px-4 pb-5 pt-2">
                {tab !== "text" && (
                    <input
                        value={caption}
                        onChange={(e) => setCaption(e.target.value.slice(0, 200))}
                        placeholder="Adiciona uma legenda…"
                        data-testid="composer-caption-input"
                        className="w-full px-4 py-3 rounded-2xl bg-white/10 backdrop-blur border border-white/15 text-white placeholder-white/45 text-[13.5px] outline-none focus:bg-white/15 focus:border-white/35"
                    />
                )}
                <div className="mt-2 flex items-center justify-between gap-2">
                    <div className="flex gap-2">
                        <button
                            onClick={() => setAllowReactions((v) => !v)}
                            data-testid="composer-toggle-reactions"
                            className={`px-3 py-1.5 rounded-full text-[11px] font-mono uppercase tracking-wider inline-flex items-center gap-1.5 transition sc-toolbar-btn ${
                                allowReactions ? "bg-white text-black" : "bg-white/10 text-white/55"
                            }`}
                        >
                            <Heart size={11} strokeWidth={2.4} /> Reacções
                        </button>
                        <button
                            onClick={() => setAllowReplies((v) => !v)}
                            data-testid="composer-toggle-replies"
                            className={`px-3 py-1.5 rounded-full text-[11px] font-mono uppercase tracking-wider inline-flex items-center gap-1.5 transition sc-toolbar-btn ${
                                allowReplies ? "bg-white text-black" : "bg-white/10 text-white/55"
                            }`}
                        >
                            <MessageCircle size={11} strokeWidth={2.4} /> Respostas
                        </button>
                    </div>
                    <div className="font-mono text-[10px] text-white/45 hidden sm:block">
                        24h · podes fixar em destaques
                    </div>
                </div>
            </div>

            <input ref={fileImgRef} type="file" accept="image/*" hidden onChange={(e) => handleFile(e.target.files?.[0], "image")} data-testid="composer-img-file" />
            <input ref={fileVidRef} type="file" accept="video/*" hidden onChange={(e) => handleFile(e.target.files?.[0], "video")} data-testid="composer-vid-file" />

            {/* PANELS */}
            {panel === PANELS.AUDIENCE && (
                <AudienceSheet value={audience} onSelect={(v) => { setAudience(v); setPanel(PANELS.NONE); }} onClose={() => setPanel(PANELS.NONE)} />
            )}
            {panel === PANELS.BACKGROUND && (
                <BackgroundSheet value={background} onSelect={(v) => setBackground(v)} onClose={() => setPanel(PANELS.NONE)} />
            )}
            {panel === PANELS.FONT && (
                <FontSheet value={fontStyleKey} onSelect={(v) => setFontStyleKey(v)} onClose={() => setPanel(PANELS.NONE)} />
            )}
            {panel === PANELS.COLOR && (
                <ColorSheet value={textColor} onSelect={(v) => setTextColor(v)} onClose={() => setPanel(PANELS.NONE)} />
            )}
            {panel === PANELS.STYLE && (
                <TextStyleSheet value={textStyle} fontKey={fontStyleKey} onSelect={(v) => setTextStyle(v)} onClose={() => setPanel(PANELS.NONE)} />
            )}
            {panel === PANELS.STICKER_PICK && (
                <StickerPicker onSelect={(t) => { setPanel(PANELS.STICKER_EDIT); setEditorType(t.key); }} onClose={() => setPanel(PANELS.NONE)} />
            )}
            {panel === PANELS.STICKER_EDIT && (
                <StickerEditor type={editorType} onClose={() => setPanel(PANELS.NONE)} onSubmit={(sticker) => {
                    addSticker({ ...sticker, type: editorType });
                    setPanel(PANELS.NONE);
                }} />
            )}
        </div>
    );
}

/* ============================================================
   Helpers
============================================================ */
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function textPreviewSize(text) {
    const n = (text || "").length;
    if (n < 30)  return "30px";
    if (n < 80)  return "24px";
    if (n < 160) return "19px";
    return "15px";
}

/* ============================================================
   Sticker preview (mini chips inside composer canvas)
============================================================ */
function StickerPreview({ sticker }) {
    const base = "sv-sticker-glass rounded-xl shadow-lg px-2.5 py-1.5 text-[10.5px] font-medium text-black/90 max-w-[180px]";
    if (sticker.type === "poll") {
        return <div className={base}>📊 <span className="truncate inline-block max-w-[140px] align-middle">{sticker.data?.question || "Sondagem"}</span></div>;
    }
    if (sticker.type === "question") return <div className={base}>❓ {sticker.data?.prompt?.slice(0, 30) || "Pergunta"}</div>;
    if (sticker.type === "slider")   return <div className={base}>🎚 {sticker.data?.prompt?.slice(0, 30) || "Slider"}</div>;
    if (sticker.type === "mention")  return <div className="sv-sticker-glass rounded-full shadow px-2.5 py-0.5 text-[10.5px] font-semibold text-coral-deep">@{sticker.data?.username}</div>;
    if (sticker.type === "hashtag")  return <div className="bg-gradient-to-r from-coral to-coral-deep text-white rounded-full shadow px-2.5 py-0.5 text-[10.5px] font-semibold">#{sticker.data?.tag}</div>;
    if (sticker.type === "location") return <div className={base}>📍 {sticker.data?.place}</div>;
    if (sticker.type === "countdown")return <div className="bg-black/85 text-white rounded-xl shadow px-2.5 py-0.5 text-[10.5px] font-medium">⏱ {sticker.data?.title}</div>;
    if (sticker.type === "link")     return <div className={base}>🔗 {sticker.data?.label}</div>;
    if (sticker.type === "music")    return <div className={base}>🎵 {sticker.data?.title}</div>;
    return null;
}

/* ============================================================
   Sheets — bottom premium
============================================================ */
function Sheet({ title, onClose, children, testId }) {
    return (
        <div className="absolute inset-0 z-[100] bg-black/55 backdrop-blur-sm flex items-end lg:items-center justify-center sc-fade-in" onClick={onClose} data-testid={testId}>
            <div className="sc-sheet-up w-full lg:max-w-md lg:rounded-3xl rounded-t-3xl bg-white shadow-2xl max-h-[78vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-black/[0.05]">
                    <h3 className="font-display text-[18px] tracking-tight">{title}</h3>
                    <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-black/[0.06] grid place-items-center"><X size={16} /></button>
                </div>
                <div className="overflow-y-auto px-5 py-4">{children}</div>
            </div>
        </div>
    );
}

function AudienceSheet({ value, onSelect, onClose }) {
    return (
        <Sheet title="Quem pode ver?" onClose={onClose} testId="audience-picker">
            <ul className="space-y-1.5">
                {STORY_AUDIENCES.map((a) => {
                    const Icon = a.key === "everyone" ? Globe2 : a.key === "following" ? UserCheck : Users2;
                    const active = value === a.key;
                    return (
                        <li key={a.key}>
                            <button
                                onClick={() => onSelect(a.key)}
                                data-testid={`audience-${a.key}`}
                                className={`w-full text-left px-3 py-3 rounded-2xl flex items-center gap-3 transition ${active ? "bg-coral/12 ring-1 ring-coral/40" : "hover:bg-black/[0.04]"}`}
                            >
                                <Icon size={18} className="text-coral" strokeWidth={2.2} />
                                <div className="flex-1">
                                    <div className="font-heading text-[14px] tracking-tight">{a.label} <span className="ml-1">{a.emoji}</span></div>
                                    <div className="font-mono text-[10.5px] text-black/45">{a.description}</div>
                                </div>
                                {active && <Check size={15} className="text-coral" />}
                            </button>
                        </li>
                    );
                })}
            </ul>
        </Sheet>
    );
}

function BackgroundSheet({ value, onSelect, onClose }) {
    return (
        <Sheet title="Fundo" onClose={onClose} testId="bg-sheet">
            <div className="grid grid-cols-4 gap-3">
                {STORY_BG_PRESETS.map((b) => (
                    <button
                        key={b.key}
                        onClick={() => onSelect(b.key)}
                        data-testid={`composer-bg-${b.key}`}
                        className={`sc-bg-tile relative aspect-square rounded-2xl border-2 ${value === b.key ? "is-active border-coral" : "border-transparent"}`}
                        style={{ background: b.css }}
                        title={b.label}
                    >
                        <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 font-mono text-[9px] uppercase tracking-wider text-white/85 drop-shadow">{b.label}</span>
                        {value === b.key && (
                            <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-white text-coral grid place-items-center shadow"><Check size={11} strokeWidth={3} /></span>
                        )}
                    </button>
                ))}
            </div>
        </Sheet>
    );
}

function FontSheet({ value, onSelect, onClose }) {
    return (
        <Sheet title="Fonte" onClose={onClose} testId="font-sheet">
            <ul className="space-y-1.5">
                {STORY_FONTS.map((f) => (
                    <li key={f.key}>
                        <button
                            onClick={() => onSelect(f.key)}
                            data-testid={`composer-font-${f.key}`}
                            className={`w-full text-left px-4 py-3 rounded-2xl flex items-center justify-between transition ${value === f.key ? "bg-coral/12 ring-1 ring-coral/40" : "hover:bg-black/[0.04]"}`}
                        >
                            <span style={{ ...f.style, fontSize: 20, color: "#111" }}>The quick fox · Olá</span>
                            <span className="font-mono text-[10.5px] uppercase tracking-wider text-black/45">{f.label}</span>
                        </button>
                    </li>
                ))}
            </ul>
        </Sheet>
    );
}

function ColorSheet({ value, onSelect, onClose }) {
    const [hex, setHex] = useState(value);
    return (
        <Sheet title="Cor do texto" onClose={onClose} testId="color-sheet">
            <div className="grid grid-cols-5 gap-3 mb-4">
                {STORY_TEXT_COLORS.map((c) => (
                    <button
                        key={c}
                        onClick={() => onSelect(c)}
                        data-testid={`composer-color-${c.replace("#", "")}`}
                        className={`aspect-square rounded-2xl border-2 sc-bg-tile ${value === c ? "is-active border-coral" : "border-black/10"}`}
                        style={{ background: c }}
                        aria-label={c}
                    />
                ))}
            </div>
            <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] uppercase tracking-wider text-black/55">Custom</span>
                <input
                    type="color"
                    value={hex}
                    onChange={(e) => { setHex(e.target.value); onSelect(e.target.value); }}
                    className="w-10 h-10 rounded-xl cursor-pointer border border-black/15"
                />
                <span className="font-mono text-[12px] tabular-nums text-black/65">{hex.toUpperCase()}</span>
            </div>
        </Sheet>
    );
}

function TextStyleSheet({ value, fontKey, onSelect, onClose }) {
    const f = STORY_FONTS.find((x) => x.key === fontKey)?.style || {};
    return (
        <Sheet title="Estilo de texto" onClose={onClose} testId="style-sheet">
            <ul className="space-y-2">
                {STORY_TEXT_STYLES.map((s) => {
                    const decor = computeTextDecorationStyle(s.key, "#e85d4f");
                    return (
                        <li key={s.key}>
                            <button
                                onClick={() => onSelect(s.key)}
                                data-testid={`composer-style-${s.key}`}
                                className={`w-full px-4 py-3 rounded-2xl flex items-center justify-between gap-3 transition ${value === s.key ? "bg-coral/12 ring-1 ring-coral/40" : "hover:bg-black/[0.04]"}`}
                            >
                                <span style={{ ...f, fontSize: 22, color: "#111", ...decor }}>Aa Olá</span>
                                <span className="text-right">
                                    <div className="font-heading text-[13px] tracking-tight">{s.label}</div>
                                    <div className="font-mono text-[10px] text-black/45">{s.description}</div>
                                </span>
                            </button>
                        </li>
                    );
                })}
            </ul>
        </Sheet>
    );
}

function StickerPicker({ onSelect, onClose }) {
    return (
        <Sheet title="Adicionar sticker" onClose={onClose} testId="sticker-picker">
            <div className="grid grid-cols-3 gap-2.5">
                {STICKER_TYPES.map((t) => (
                    <button
                        key={t.key}
                        onClick={() => onSelect(t)}
                        data-testid={`sticker-add-${t.key}`}
                        className="aspect-square rounded-2xl bg-gradient-to-br from-coral/10 to-coral/[0.04] hover:from-coral/25 hover:to-coral/15 border border-coral/20 flex flex-col items-center justify-center gap-1.5 transition sc-bg-tile"
                    >
                        <span className="text-[28px]">{t.emoji}</span>
                        <span className="font-mono text-[10px] uppercase tracking-wider text-black/70">{t.label}</span>
                    </button>
                ))}
            </div>
        </Sheet>
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
        if (type === "poll" && (!draft.options || draft.options.filter((o) => o.text.trim()).length < 2)) {
            toast.error("A sondagem precisa de pelo menos 2 opções com texto"); return;
        }
        if (type === "mention" && !draft.username.trim()) { toast.error("Indica o utilizador"); return; }
        if (type === "hashtag" && !draft.tag.trim()) { toast.error("Indica a hashtag"); return; }
        if (type === "location" && !draft.place.trim()) { toast.error("Indica o local"); return; }
        if (type === "link" && !/^https?:\/\//i.test(draft.url.trim())) { toast.error("Link tem de começar com http(s)://"); return; }
        if (type === "music" && !draft.title.trim()) { toast.error("Indica o título"); return; }
        if (type === "countdown" && !draft.ends_at) { toast.error("Define a data"); return; }
        onSubmit({ data: { ...draft } });
    };
    const cssInput = "w-full px-3 py-2.5 rounded-xl border border-black/15 outline-none focus:border-coral text-[13.5px] bg-white";
    return (
        <Sheet title={`Sticker · ${type}`} onClose={onClose} testId="sticker-editor">
            {type === "poll" && (
                <div className="space-y-2">
                    <input value={draft.question} onChange={(e) => setDraft({ ...draft, question: e.target.value })} placeholder="Pergunta…" className={cssInput} />
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
                            className={cssInput}
                        />
                    ))}
                    <div className="flex gap-3">
                        {draft.options.length < 4 && (
                            <button onClick={() => setDraft({ ...draft, options: [...draft.options, { id: `o${draft.options.length}`, text: "" }] })} className="text-[11.5px] font-mono text-coral hover:underline">+ opção</button>
                        )}
                        {draft.options.length > 2 && (
                            <button onClick={() => setDraft({ ...draft, options: draft.options.slice(0, -1) })} className="text-[11.5px] font-mono text-black/45 hover:underline">– remover última</button>
                        )}
                    </div>
                </div>
            )}
            {type === "question" && (
                <input value={draft.prompt} onChange={(e) => setDraft({ ...draft, prompt: e.target.value })} placeholder="Faz-me uma pergunta" className={cssInput} />
            )}
            {type === "slider" && (
                <div className="space-y-2">
                    <input value={draft.prompt} onChange={(e) => setDraft({ ...draft, prompt: e.target.value })} placeholder="Pergunta" className={cssInput} />
                    <input value={draft.emoji} onChange={(e) => setDraft({ ...draft, emoji: e.target.value })} placeholder="Emoji" maxLength={4} className={`${cssInput} w-24 text-center`} />
                </div>
            )}
            {type === "mention" && (
                <div className="flex items-center gap-1.5">
                    <span className="font-mono text-coral text-[18px]">@</span>
                    <input value={draft.username} onChange={(e) => setDraft({ ...draft, username: e.target.value })} placeholder="username" className={`${cssInput} flex-1`} />
                </div>
            )}
            {type === "hashtag" && (
                <div className="flex items-center gap-1.5">
                    <span className="font-mono text-coral text-[18px]">#</span>
                    <input value={draft.tag} onChange={(e) => setDraft({ ...draft, tag: e.target.value })} placeholder="lisboa" className={`${cssInput} flex-1`} />
                </div>
            )}
            {type === "location" && (
                <input value={draft.place} onChange={(e) => setDraft({ ...draft, place: e.target.value })} placeholder="ex: Tasca do Chico, Alfama" className={cssInput} />
            )}
            {type === "countdown" && (
                <div className="space-y-2">
                    <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Título (ex: Concerto)" className={cssInput} />
                    <input type="datetime-local" value={draft.ends_at?.slice(0, 16) || ""} onChange={(e) => setDraft({ ...draft, ends_at: new Date(e.target.value).toISOString() })} className={cssInput} />
                </div>
            )}
            {type === "link" && (
                <div className="space-y-2">
                    <input value={draft.url} onChange={(e) => setDraft({ ...draft, url: e.target.value })} placeholder="https://..." className={cssInput} />
                    <input value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} placeholder="Etiqueta" className={cssInput} />
                </div>
            )}
            {type === "music" && (
                <div className="space-y-2">
                    <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="Título da música" className={cssInput} />
                    <input value={draft.artist} onChange={(e) => setDraft({ ...draft, artist: e.target.value })} placeholder="Artista" className={cssInput} />
                </div>
            )}
            <button
                onClick={submit}
                data-testid="sticker-editor-save"
                className="mt-4 w-full px-4 py-3 rounded-full bg-gradient-to-r from-coral to-coral-deep text-white font-mono uppercase text-[11px] tracking-wider hover:opacity-95 inline-flex items-center justify-center gap-1.5"
            >
                <Check size={13} /> Adicionar ao story
            </button>
        </Sheet>
    );
}

function defaultCountdownIso() {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setMinutes(0); d.setSeconds(0); d.setMilliseconds(0);
    return d.toISOString();
}
