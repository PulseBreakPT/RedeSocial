import { useRef, useState, useCallback } from "react";
import {
    X, Image as ImageIcon, Type, Sticker, Loader2, Globe2, Users2, UserCheck,
    MessageCircle, Heart, Check, Trash2, Palette, Sparkles, ChevronRight, Plus,
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
    CAPTION_EDIT: "captionEdit",
};

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

/** Default placement when adding a new draggable item. Slight offset to avoid stacking. */
const placement = (index) => ({ x: 0.5, y: 0.4 + (index % 4) * 0.12 });

export function StoryComposer({ onClose, onCreated }) {
    const [tab, setTab] = useState("image"); // image | text — video mode hidden
    const [media, setMedia] = useState({ image: "" });
    const [caption, setCaption] = useState("");
    const [textContent, setTextContent] = useState("");
    const [background, setBackground] = useState("fado");
    const [textColor, setTextColor] = useState("#ffffff");
    const [fontStyleKey, setFontStyleKey] = useState("modern");
    const [textStyle, setTextStyle] = useState("plain");
    const [stickers, setStickers] = useState([]);
    // Caption as a draggable text-sticker over photo (advanced).
    const [captionPos, setCaptionPos] = useState({ x: 0.5, y: 0.82 });
    const [audience, setAudience] = useState("everyone");
    const [allowReplies, setAllowReplies] = useState(true);
    const [allowReactions, setAllowReactions] = useState(true);
    const [busy, setBusy] = useState(false);
    const [panel, setPanel] = useState(PANELS.NONE);
    const [editorType, setEditorType] = useState(null);

    const fileImgRef = useRef(null);
    const canvasRef = useRef(null);
    const trashRef = useRef(null);
    const dragStateRef = useRef(null);
    const rafIdRef = useRef(null);
    const elementsRef = useRef({}); // id -> HTMLElement (for direct DOM mutation)

    useEscapeKey(() => {
        if (panel) setPanel(PANELS.NONE);
        else onClose();
    }, true);

    const handleFile = (file) => {
        if (!file) return;
        if (file.size > MAX_IMAGE_BYTES) {
            toast.error("Imagem > 2 MB.");
            return;
        }
        const reader = new FileReader();
        reader.onload = (ev) => setMedia({ image: ev.target.result });
        reader.readAsDataURL(file);
    };

    const publish = async () => {
        if (tab === "image" && !media.image) { toast.error("Adiciona uma imagem"); return; }
        if (tab === "text" && !textContent.trim()) { toast.error("Escreve algo"); return; }
        setBusy(true);
        try {
            const payload = {
                media_type: tab,
                image: tab === "image" ? media.image : "",
                video: "",
                text_content: tab === "text" ? textContent : "",
                background: tab === "text" ? background : "coral",
                text_color: textColor,
                font_style: fontStyleKey,
                text_style: textStyle,
                caption: tab !== "text" ? caption : "",
                caption_pos: tab === "image" ? captionPos : null,
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
        const { x, y } = placement(stickers.length);
        const newSticker = {
            ...sticker,
            id: sticker.id || stickerId(),
            x, y,
            rotation: 0,
            scale: 1,
        };
        setStickers((s) => [...s, newSticker]);
    };

    const removeSticker = (id) => {
        setStickers((s) => s.filter((x) => x.id !== id));
    };

    /* ============================================================
       DRAG SYSTEM — refs + RAF + direct DOM mutation.
       No React state updates during the move → no jitter, no lag.
       ============================================================ */

    const setTrashVisible = (visible, armed = false) => {
        const tn = trashRef.current;
        if (!tn) return;
        tn.style.opacity = visible ? "1" : "0";
        tn.style.transform = `translateX(-50%) translateY(${visible ? 0 : 30}px) scale(${armed ? 1.2 : 1})`;
        tn.dataset.armed = armed ? "true" : "false";
    };

    const beginDrag = useCallback((e, kind, id, initialPos) => {
        if (!canvasRef.current) return;
        // Only primary pointer
        if (e.button != null && e.button !== 0) return;
        e.stopPropagation();
        e.preventDefault?.();

        const rect = canvasRef.current.getBoundingClientRect();
        const el = e.currentTarget;
        elementsRef.current[`${kind}:${id}`] = el;

        dragStateRef.current = {
            kind, // "sticker" | "caption"
            id,
            rect,
            startX: e.clientX,
            startY: e.clientY,
            originalX: initialPos.x,
            originalY: initialPos.y,
            currentX: initialPos.x,
            currentY: initialPos.y,
            moved: false,
            armedTrash: false,
        };
        try { el.setPointerCapture(e.pointerId); } catch { /* */ }
        el.classList.add("sc-dragging");
        setTrashVisible(true, false);
    }, []);

    const onPointerMove = useCallback((e) => {
        const st = dragStateRef.current;
        if (!st) return;

        const dx = e.clientX - st.startX;
        const dy = e.clientY - st.startY;
        if (!st.moved && Math.hypot(dx, dy) > 4) st.moved = true;

        // Compute next position in 0..1 normalized space.
        const newX = clamp(st.originalX + dx / st.rect.width, 0.05, 0.95);
        const newY = clamp(st.originalY + dy / st.rect.height, 0.06, 0.94);
        st.currentX = newX;
        st.currentY = newY;

        // Trash arming detection (canvas-relative).
        const bottomThreshold = st.rect.top + st.rect.height - 70;
        const armed = e.clientY > bottomThreshold && Math.abs(e.clientX - (st.rect.left + st.rect.width / 2)) < 80;
        if (armed !== st.armedTrash) {
            st.armedTrash = armed;
            setTrashVisible(true, armed);
        }

        // Schedule DOM update (no React re-render).
        if (rafIdRef.current == null) {
            rafIdRef.current = requestAnimationFrame(() => {
                rafIdRef.current = null;
                const el = elementsRef.current[`${st.kind}:${st.id}`];
                if (!el) return;
                el.style.left = `${st.currentX * 100}%`;
                el.style.top = `${st.currentY * 100}%`;
            });
        }
    }, []);

    const endDrag = useCallback((e) => {
        const st = dragStateRef.current;
        if (!st) return;
        const el = elementsRef.current[`${st.kind}:${st.id}`];
        if (el) {
            try { el.releasePointerCapture?.(e.pointerId); } catch { /* */ }
            el.classList.remove("sc-dragging");
        }
        if (rafIdRef.current != null) {
            cancelAnimationFrame(rafIdRef.current);
            rafIdRef.current = null;
        }

        if (st.armedTrash && st.moved) {
            // Dropped on trash → remove (only stickers; caption is just hidden by clearing).
            if (st.kind === "sticker") removeSticker(st.id);
            else setCaption("");
        } else if (st.moved) {
            // Commit final position
            if (st.kind === "sticker") {
                setStickers((arr) => arr.map((s) => (s.id === st.id ? { ...s, x: st.currentX, y: st.currentY } : s)));
            } else {
                setCaptionPos({ x: st.currentX, y: st.currentY });
            }
        } else {
            // No move = tap. For sticker -> open edit (silent: no confirm).
            // For caption -> open caption editor.
            if (st.kind === "caption") setPanel(PANELS.CAPTION_EDIT);
        }

        setTrashVisible(false, false);
        dragStateRef.current = null;
    }, []);

    const audienceMeta = STORY_AUDIENCES.find((a) => a.key === audience);
    const isLightBg = LIGHT_BG_KEYS.has(background);
    const fStyle = fontStyleFor(fontStyleKey);
    const decorStyle = computeTextDecorationStyle(textStyle, textColor);

    return (
        <div className="fixed inset-0 z-[95] bg-black/55 backdrop-blur-sm sc-fade-in flex items-stretch sm:items-center justify-center sm:p-4" data-testid="story-composer">
            <div
                className="relative w-full sm:max-w-md sm:max-h-[94vh] bg-white sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden"
                style={{ minHeight: "100dvh", height: "100dvh", maxHeight: "100dvh" }}
            >
                {/* ============ HEADER ============ */}
                <div className="flex-shrink-0 px-3 sm:px-4 pt-[max(12px,env(safe-area-inset-top))] pb-2.5 flex items-center gap-2 border-b border-black/[0.06]">
                    <button
                        onClick={onClose}
                        data-testid="composer-close"
                        className="w-10 h-10 rounded-full hover:bg-black/[0.06] grid place-items-center text-black/75 sc-toolbar-btn"
                        aria-label="Fechar"
                    >
                        <X size={19} strokeWidth={2.2} />
                    </button>

                    <h2 className="flex-1 font-display text-[17px] tracking-tight text-center">Novo story</h2>

                    <button
                        onClick={publish}
                        disabled={busy}
                        data-testid="composer-publish"
                        className="px-4 h-10 rounded-full bg-black text-white font-mono uppercase text-[11px] tracking-[0.14em] shadow-md inline-flex items-center gap-1.5 disabled:opacity-50 sc-toolbar-btn"
                    >
                        {busy ? <Loader2 size={13} className="animate-spin" /> : <ChevronRight size={14} strokeWidth={2.6} />}
                        Publicar
                    </button>
                </div>

                {/* ============ TABS (video removed) ============ */}
                <div className="flex-shrink-0 px-3 sm:px-4 py-2.5 flex justify-center border-b border-black/[0.05]">
                    <div className="inline-flex items-center bg-black/[0.05] rounded-full p-1 gap-0.5">
                        {[
                            { k: "image", label: "Foto",  Icon: ImageIcon },
                            { k: "text",  label: "Texto", Icon: Type },
                        ].map(({ k, label, Icon }) => (
                            <button
                                key={k}
                                onClick={() => setTab(k)}
                                data-testid={`composer-tab-${k}`}
                                className={`px-3.5 sm:px-4 h-9 rounded-full inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.14em] transition ${
                                    tab === k
                                        ? "bg-white text-black shadow-sm"
                                        : "text-black/55 hover:text-black"
                                }`}
                            >
                                <Icon size={13} strokeWidth={2.4} /> {label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ============ CANVAS + TOOLBAR ============ */}
                <div className="flex-1 min-h-0 overflow-hidden bg-zinc-50 relative flex items-center justify-center px-3 sm:px-4 py-3">
                    <div
                        ref={canvasRef}
                        className="sc-canvas relative w-full max-w-[340px] aspect-[9/16] rounded-3xl overflow-hidden bg-black shadow-[0_24px_60px_-20px_rgba(0,0,0,0.35)] ring-1 ring-black/[0.06]"
                        style={{ maxHeight: "calc(100% - 8px)" }}
                    >
                        {tab === "text" && (
                            <div className="absolute inset-0 grid place-items-center px-5 py-12" style={{ background: bgCss(background) }}>
                                <textarea
                                    value={textContent}
                                    onChange={(e) => setTextContent(e.target.value.slice(0, 280))}
                                    placeholder={textContent ? "" : "Escreve algo…"}
                                    rows={3}
                                    data-testid="composer-text-input"
                                    className="sc-text-overlay placeholder-white/50"
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
                                <div className="sv-media-fit">
                                    <img src={media.image} alt="" className="sv-media-bg" aria-hidden />
                                    <img src={media.image} alt="" className="sv-media-fg" />
                                </div>
                            ) : (
                                <button
                                    onClick={() => fileImgRef.current?.click()}
                                    data-testid="composer-pick-image"
                                    className="absolute inset-0 grid place-items-center bg-gradient-to-br from-zinc-100 to-zinc-200 text-black/55 hover:text-black transition"
                                >
                                    <div className="text-center px-4">
                                        <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-white shadow-sm grid place-items-center">
                                            <ImageIcon size={22} strokeWidth={1.6} />
                                        </div>
                                        <div className="font-mono text-[10.5px] uppercase tracking-[0.16em]">Carregar imagem</div>
                                        <div className="font-mono text-[10px] mt-1 text-black/35">JPG/PNG · até 2 MB</div>
                                    </div>
                                </button>
                            )
                        )}

                        {/* Caption as DRAGGABLE text on image */}
                        {tab === "image" && media.image && caption && (
                            <div
                                className="sc-draggable absolute z-30"
                                style={{
                                    left: `${captionPos.x * 100}%`,
                                    top: `${captionPos.y * 100}%`,
                                    transform: "translate(-50%, -50%)",
                                    maxWidth: "82%",
                                    textAlign: "center",
                                    fontFamily: fStyle.fontFamily,
                                    fontWeight: fStyle.fontWeight,
                                    fontStyle: fStyle.fontStyle,
                                    letterSpacing: fStyle.letterSpacing,
                                    color: textColor,
                                    fontSize: "17px",
                                    lineHeight: 1.15,
                                    textShadow: "0 2px 14px rgba(0,0,0,0.7)",
                                    ...decorStyle,
                                }}
                                onPointerDown={(e) => beginDrag(e, "caption", "caption", captionPos)}
                                onPointerMove={onPointerMove}
                                onPointerUp={endDrag}
                                onPointerCancel={endDrag}
                                data-testid="composer-caption-overlay"
                                title="Arrasta para reposicionar · toca para editar"
                            >
                                {caption}
                            </div>
                        )}

                        {/* Stickers — draggable */}
                        {stickers.map((s) => (
                            <div
                                key={s.id}
                                className="sc-draggable absolute z-30"
                                style={{
                                    left: `${s.x * 100}%`,
                                    top: `${s.y * 100}%`,
                                    transform: `translate(-50%, -50%) rotate(${s.rotation || 0}deg) scale(${s.scale || 1})`,
                                }}
                                onPointerDown={(e) => beginDrag(e, "sticker", s.id, { x: s.x, y: s.y })}
                                onPointerMove={onPointerMove}
                                onPointerUp={endDrag}
                                onPointerCancel={endDrag}
                                data-testid={`preview-sticker-${s.type}`}
                                title="Arrasta para reposicionar · larga no caixote para apagar"
                            >
                                <StickerPreview sticker={s} />
                            </div>
                        ))}

                        {/* Audience pill (top-right of canvas) */}
                        <button
                            onClick={() => setPanel(PANELS.AUDIENCE)}
                            data-testid="story-composer-audience-btn"
                            className="absolute top-2.5 right-2.5 z-40 px-2.5 h-7 rounded-full bg-black/55 backdrop-blur text-white text-[10px] font-mono uppercase tracking-wider inline-flex items-center gap-1.5 hover:bg-black/75 sc-toolbar-btn"
                        >
                            <span>{audienceMeta?.emoji}</span>
                            <span>{audienceMeta?.label}</span>
                        </button>

                        {/* Replace media button */}
                        {tab === "image" && media.image && (
                            <button
                                onClick={() => fileImgRef.current?.click()}
                                data-testid="composer-change-image"
                                className="absolute top-2.5 left-2.5 z-40 px-2.5 h-7 rounded-full bg-black/55 backdrop-blur text-white text-[10px] font-mono uppercase tracking-wider inline-flex items-center gap-1.5 hover:bg-black/75 sc-toolbar-btn"
                                title="Trocar imagem"
                            >
                                <ImageIcon size={11} strokeWidth={2.4} />
                                Trocar
                            </button>
                        )}

                        {/* Trash zone (DOM-controlled visibility for perf) */}
                        <div
                            ref={trashRef}
                            className="sc-trash absolute bottom-4 left-1/2 z-50 w-14 h-14 rounded-full grid place-items-center bg-black/75 text-white backdrop-blur pointer-events-none"
                            style={{
                                opacity: 0,
                                transform: "translateX(-50%) translateY(30px) scale(1)",
                                transition: "opacity 160ms ease, transform 180ms cubic-bezier(.34,1.56,.64,1), background 180ms ease",
                            }}
                            aria-hidden
                        >
                            <Trash2 size={18} strokeWidth={2.2} />
                        </div>
                    </div>
                </div>

                {/* ============ TOOL ROW (works in BOTH photo + text mode) ============ */}
                <div className="flex-shrink-0 border-t border-black/[0.06] bg-white">
                    <div className="px-3 sm:px-4 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                        <ToolButton
                            testId="composer-stickers-btn"
                            onClick={() => setPanel(PANELS.STICKER_PICK)}
                            Icon={Sticker}
                            label="Sticker"
                            badge={stickers.length || null}
                        />
                        {tab === "text" && (
                            <ToolButton
                                testId="composer-bg-btn"
                                onClick={() => setPanel(PANELS.BACKGROUND)}
                                swatch={bgCss(background)}
                                label="Fundo"
                            />
                        )}
                        {/* Fonte / Estilo / Cor — visíveis em AMBOS os modos */}
                        <ToolButton
                            testId="composer-font-btn"
                            onClick={() => setPanel(PANELS.FONT)}
                            text="Aa"
                            textStyle={fStyle}
                            label="Fonte"
                        />
                        <ToolButton
                            testId="composer-style-btn"
                            onClick={() => setPanel(PANELS.STYLE)}
                            Icon={Sparkles}
                            label="Estilo"
                        />
                        <ToolButton
                            testId="composer-color-btn"
                            onClick={() => setPanel(PANELS.COLOR)}
                            Icon={Palette}
                            label="Cor"
                            dot={textColor}
                        />
                    </div>

                    {/* Caption + toggles */}
                    <div className="px-3 sm:px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-1">
                        {tab !== "text" && (
                            <input
                                value={caption}
                                onChange={(e) => setCaption(e.target.value.slice(0, 200))}
                                placeholder="Adiciona uma legenda… (arrasta para mover)"
                                data-testid="composer-caption-input"
                                className="w-full h-11 px-4 rounded-2xl border border-black/[0.08] bg-black/[0.03] text-black text-[14px] outline-none focus:bg-white focus:border-black/60"
                            />
                        )}
                        <div className="mt-2 flex items-center gap-2">
                            <button
                                onClick={() => setAllowReactions((v) => !v)}
                                data-testid="composer-toggle-reactions"
                                className={`flex-1 sm:flex-none px-3 h-9 rounded-full text-[11px] font-mono uppercase tracking-wider inline-flex items-center justify-center gap-1.5 transition sc-toolbar-btn ${
                                    allowReactions ? "bg-black text-white" : "bg-black/[0.05] text-black/55"
                                }`}
                            >
                                <Heart size={12} strokeWidth={2.4} /> Reacções
                            </button>
                            <button
                                onClick={() => setAllowReplies((v) => !v)}
                                data-testid="composer-toggle-replies"
                                className={`flex-1 sm:flex-none px-3 h-9 rounded-full text-[11px] font-mono uppercase tracking-wider inline-flex items-center justify-center gap-1.5 transition sc-toolbar-btn ${
                                    allowReplies ? "bg-black text-white" : "bg-black/[0.05] text-black/55"
                                }`}
                            >
                                <MessageCircle size={12} strokeWidth={2.4} /> Respostas
                            </button>
                            <div className="hidden sm:block ml-auto font-mono text-[10px] text-black/40">
                                24h · podes fixar em destaques
                            </div>
                        </div>
                    </div>
                </div>

                <input ref={fileImgRef} type="file" accept="image/*" hidden onChange={(e) => handleFile(e.target.files?.[0])} data-testid="composer-img-file" />

                {/* ============ PANELS ============ */}
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
                {panel === PANELS.CAPTION_EDIT && (
                    <CaptionEditSheet
                        value={caption}
                        onChange={setCaption}
                        onRemove={() => { setCaption(""); setPanel(PANELS.NONE); }}
                        onClose={() => setPanel(PANELS.NONE)}
                    />
                )}
            </div>
        </div>
    );
}

/* ============================================================
   Tool button — light, mobile-friendly chip
============================================================ */
function ToolButton({ Icon, swatch, text, textStyle, label, badge, dot, onClick, testId }) {
    return (
        <button
            onClick={onClick}
            data-testid={testId}
            className="relative flex-shrink-0 inline-flex items-center gap-1.5 h-10 px-3 rounded-full bg-black/[0.04] hover:bg-black/[0.08] text-black sc-toolbar-btn"
        >
            {Icon && <Icon size={15} strokeWidth={2.2} />}
            {swatch && <span className="w-4 h-4 rounded-full ring-1 ring-black/15" style={{ background: swatch }} />}
            {text && <span style={{ ...(textStyle || {}), fontSize: 15, lineHeight: 1 }}>{text}</span>}
            <span className="font-mono text-[11px] uppercase tracking-wider">{label}</span>
            {badge != null && (
                <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-black text-white text-[9.5px] font-mono grid place-items-center">{badge}</span>
            )}
            {dot && <span className="w-2.5 h-2.5 rounded-full ring-1 ring-black/15" style={{ background: dot }} />}
        </button>
    );
}

/* ============================================================
   Helpers
============================================================ */
function textPreviewSize(text) {
    const n = (text || "").length;
    if (n < 30)  return "30px";
    if (n < 80)  return "24px";
    if (n < 160) return "19px";
    return "15px";
}

/* ============================================================
   Sticker preview (mini chip inside composer canvas)
============================================================ */
function StickerPreview({ sticker }) {
    const base = "sv-sticker-glass rounded-xl shadow-lg px-2.5 py-1.5 text-[10.5px] font-medium text-black/90 max-w-[180px]";
    if (sticker.type === "poll") {
        return <div className={base}>📊 <span className="truncate inline-block max-w-[140px] align-middle">{sticker.data?.question || "Sondagem"}</span></div>;
    }
    if (sticker.type === "question") return <div className={base}>❓ {sticker.data?.prompt?.slice(0, 30) || "Pergunta"}</div>;
    if (sticker.type === "slider")   return <div className={base}>🎚 {sticker.data?.prompt?.slice(0, 30) || "Slider"}</div>;
    if (sticker.type === "mention")  return <div className="sv-sticker-glass rounded-full shadow px-2.5 py-0.5 text-[10.5px] font-semibold text-black">@{sticker.data?.username}</div>;
    if (sticker.type === "hashtag")  return <div className="bg-black text-white rounded-full shadow px-2.5 py-0.5 text-[10.5px] font-semibold">#{sticker.data?.tag}</div>;
    if (sticker.type === "location") return <div className={base}>📍 {sticker.data?.place}</div>;
    if (sticker.type === "countdown")return <div className="bg-black/85 text-white rounded-xl shadow px-2.5 py-0.5 text-[10.5px] font-medium">⏱ {sticker.data?.title}</div>;
    if (sticker.type === "quiz")     return <div className={base}>🧠 <span className="truncate inline-block max-w-[140px] align-middle">{sticker.data?.question || "Quiz"}</span></div>;
    if (sticker.type === "add_yours")return <div className="bg-white/95 text-black rounded-2xl shadow px-2.5 py-1 text-[10.5px] font-semibold inline-flex items-center gap-1">🪩 {sticker.data?.prompt?.slice(0, 24) || "Junta-te"}</div>;
    if (sticker.type === "time")     return <div className="bg-black/80 text-white rounded-full shadow px-2.5 py-0.5 text-[10.5px] font-mono tabular-nums">🕒 {new Date().toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit", hour12: sticker.data?.format === "12h" })}</div>;
    if (sticker.type === "date")     return <div className="bg-white/95 text-black rounded-full shadow px-2.5 py-0.5 text-[10.5px] font-mono">📅 {sticker.data?.format === "short" ? new Date().toLocaleDateString("pt-PT") : new Date().toLocaleDateString("pt-PT", { day: "numeric", month: "long", year: "numeric" })}</div>;
    if (sticker.type === "link")     return <div className="bg-[var(--atl-500)] text-white rounded-xl shadow px-2.5 py-0.5 text-[10.5px] font-semibold inline-flex items-center gap-1">🔗 {sticker.data?.label || sticker.data?.url?.replace(/^https?:\/\//, "").slice(0, 22)}</div>;
    return null;
}

/* ============================================================
   Sheets — bottom premium light
============================================================ */
function Sheet({ title, onClose, children, testId }) {
    return (
        <div
            className="fixed sm:absolute inset-0 z-[110] bg-black/55 backdrop-blur-sm flex items-end sm:items-center justify-center sc-fade-in"
            onClick={onClose}
            data-testid={testId}
        >
            <div
                className="sc-sheet-up w-full sm:max-w-md sm:rounded-3xl rounded-t-3xl bg-white shadow-2xl flex flex-col overflow-hidden"
                style={{ maxHeight: "min(78vh, 640px)", paddingBottom: "env(safe-area-inset-bottom)" }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex-shrink-0 px-5 pt-4 pb-3 flex items-center justify-between border-b border-black/[0.05]">
                    <h3 className="font-display text-[18px] tracking-tight">{title}</h3>
                    <button onClick={onClose} className="w-9 h-9 rounded-full hover:bg-black/[0.06] grid place-items-center"><X size={17} /></button>
                </div>
                <div className="overflow-y-auto px-5 py-4 flex-1">{children}</div>
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
                                className={`w-full text-left px-3 py-3 rounded-2xl flex items-center gap-3 transition ${active ? "bg-black/[0.06] ring-1 ring-black/30" : "hover:bg-black/[0.04]"}`}
                            >
                                <Icon size={18} className="text-black/70" strokeWidth={2.2} />
                                <div className="flex-1">
                                    <div className="font-heading text-[14px] tracking-tight">{a.label} <span className="ml-1">{a.emoji}</span></div>
                                    <div className="font-mono text-[10.5px] text-black/45">{a.description}</div>
                                </div>
                                {active && <Check size={15} className="text-black" />}
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
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {STORY_BG_PRESETS.map((b) => (
                    <button
                        key={b.key}
                        onClick={() => onSelect(b.key)}
                        data-testid={`composer-bg-${b.key}`}
                        className={`sc-bg-tile relative aspect-square rounded-2xl border-2 ${value === b.key ? "is-active border-black" : "border-transparent"}`}
                        style={{ background: b.css }}
                        title={b.label}
                    >
                        <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 font-mono text-[9px] uppercase tracking-wider text-white/90 drop-shadow">{b.label}</span>
                        {value === b.key && (
                            <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-white text-black grid place-items-center shadow"><Check size={11} strokeWidth={3} /></span>
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
                            className={`w-full text-left px-4 py-3 rounded-2xl flex items-center justify-between transition ${value === f.key ? "bg-black/[0.06] ring-1 ring-black/30" : "hover:bg-black/[0.04]"}`}
                        >
                            <span style={{ ...f.style, fontSize: 20, color: "#111" }}>The quick fox · Olá</span>
                            <span className="font-mono text-[10.5px] uppercase tracking-wider text-black/45 ml-2 flex-shrink-0">{f.label}</span>
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
                        className={`aspect-square rounded-2xl border-2 sc-bg-tile ${value === c ? "is-active border-black" : "border-black/10"}`}
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
                    const decor = computeTextDecorationStyle(s.key, "#111111");
                    return (
                        <li key={s.key}>
                            <button
                                onClick={() => onSelect(s.key)}
                                data-testid={`composer-style-${s.key}`}
                                className={`w-full px-4 py-3 rounded-2xl flex items-center justify-between gap-3 transition ${value === s.key ? "bg-black/[0.06] ring-1 ring-black/30" : "hover:bg-black/[0.04]"}`}
                            >
                                <span style={{ ...f, fontSize: 22, color: "#111", ...decor }}>Aa Olá</span>
                                <span className="text-right flex-shrink-0">
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

function CaptionEditSheet({ value, onChange, onRemove, onClose }) {
    return (
        <Sheet title="Editar legenda" onClose={onClose} testId="caption-edit-sheet">
            <textarea
                autoFocus
                value={value}
                onChange={(e) => onChange(e.target.value.slice(0, 200))}
                rows={3}
                placeholder="Escreve aqui…"
                className="w-full px-3 py-3 rounded-xl border border-black/15 outline-none focus:border-coral text-[15px] bg-white resize-none"
            />
            <div className="mt-3 flex items-center justify-between">
                <button
                    onClick={onRemove}
                    className="text-[12px] font-mono text-red-soft hover:underline"
                >
                    Remover legenda
                </button>
                <button
                    onClick={onClose}
                    className="px-4 h-10 rounded-full bg-black text-white font-mono uppercase text-[11px] tracking-wider hover:bg-black/85"
                >
                    OK
                </button>
            </div>
        </Sheet>
    );
}

function StickerPicker({ onSelect, onClose }) {
    return (
        <Sheet title="Adicionar sticker" onClose={onClose} testId="sticker-picker">
            <div className="grid grid-cols-3 sm:grid-cols-3 gap-2.5">
                {STICKER_TYPES.map((t) => (
                    <button
                        key={t.key}
                        onClick={() => onSelect(t)}
                        data-testid={`sticker-add-${t.key}`}
                        className="aspect-square rounded-2xl bg-paper grain isolate hover:bg-black/[0.04] border border-black/[0.10] hover:border-black/30 flex flex-col items-center justify-center gap-1.5 transition sc-bg-tile"
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
            case "quiz":      return { question: "", options: [{ id: "a", text: "" }, { id: "b", text: "" }], correct: 0 };
            case "add_yours": return { prompt: "Junta-te a esta corrente" };
            case "mention":   return { username: "" };
            case "hashtag":   return { tag: "" };
            case "location":  return { place: "" };
            case "countdown": return { title: "Contagem", ends_at: defaultCountdownIso() };
            case "time":      return { format: "24h" };
            case "date":      return { format: "long" };
            case "link":      return { url: "", label: "" };
            default:          return {};
        }
    });
    const submit = () => {
        if (type === "poll" && (!draft.options || draft.options.filter((o) => o.text.trim()).length < 2)) {
            toast.error("A sondagem precisa de pelo menos 2 opções com texto"); return;
        }
        if (type === "quiz") {
            const valid = (draft.options || []).filter((o) => o.text.trim()).length >= 2;
            if (!valid || !draft.question.trim()) { toast.error("Quiz precisa de pergunta e ≥2 opções"); return; }
        }
        if (type === "add_yours" && !draft.prompt.trim()) { toast.error("Indica o desafio"); return; }
        if (type === "mention" && !draft.username.trim()) { toast.error("Indica o utilizador"); return; }
        if (type === "hashtag" && !draft.tag.trim()) { toast.error("Indica a hashtag"); return; }
        if (type === "location" && !draft.place.trim()) { toast.error("Indica o local"); return; }
        if (type === "countdown" && !draft.ends_at) { toast.error("Define a data"); return; }
        if (type === "link" && !draft.url.trim()) { toast.error("Indica o link"); return; }
        onSubmit({ data: { ...draft } });
    };
    const cssInput = "w-full px-3 py-3 rounded-xl border border-black/15 outline-none focus:border-coral text-[14px] bg-white";
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
                            <button onClick={() => setDraft({ ...draft, options: [...draft.options, { id: `o${draft.options.length}`, text: "" }] })} className="text-[12px] font-mono text-coral hover:underline inline-flex items-center gap-1"><Plus size={12} /> opção</button>
                        )}
                        {draft.options.length > 2 && (
                            <button onClick={() => setDraft({ ...draft, options: draft.options.slice(0, -1) })} className="text-[12px] font-mono text-black/45 hover:underline">– remover última</button>
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
            {type === "quiz" && (
                <div className="space-y-2">
                    <input value={draft.question} onChange={(e) => setDraft({ ...draft, question: e.target.value })} placeholder="Pergunta…" className={cssInput} />
                    {draft.options.map((o, idx) => (
                        <div key={o.id} className="flex items-center gap-2">
                            <input
                                value={o.text}
                                onChange={(e) => {
                                    const newOpts = [...draft.options];
                                    newOpts[idx] = { ...o, text: e.target.value };
                                    setDraft({ ...draft, options: newOpts });
                                }}
                                placeholder={`Opção ${idx + 1}`}
                                className={`${cssInput} flex-1`}
                            />
                            <button
                                onClick={() => setDraft({ ...draft, correct: idx })}
                                className={`px-3 py-2 rounded-full text-[10px] font-mono uppercase tracking-[0.14em] tap-shrink transition ${
                                    draft.correct === idx
                                        ? "bg-black text-white"
                                        : "bg-black/[0.05] text-black/55 hover:bg-black/[0.10]"
                                }`}
                                aria-label="Marcar como correta"
                            >
                                {draft.correct === idx ? "correta ✓" : "marcar"}
                            </button>
                        </div>
                    ))}
                    <div className="flex gap-3">
                        {draft.options.length < 4 && (
                            <button onClick={() => setDraft({ ...draft, options: [...draft.options, { id: `o${draft.options.length}`, text: "" }] })} className="text-[12px] font-mono text-coral hover:underline inline-flex items-center gap-1"><Plus size={12} /> opção</button>
                        )}
                        {draft.options.length > 2 && (
                            <button onClick={() => setDraft({ ...draft, options: draft.options.slice(0, -1) })} className="text-[12px] font-mono text-black/45 hover:underline">– remover última</button>
                        )}
                    </div>
                </div>
            )}
            {type === "add_yours" && (
                <div className="space-y-2">
                    <input value={draft.prompt} onChange={(e) => setDraft({ ...draft, prompt: e.target.value })} placeholder="Ex: o teu pôr-do-sol favorito" className={cssInput} />
                    <p className="text-[11px] font-mono text-black/45 leading-snug">
                        Outras pessoas podem juntar-se a esta corrente com o seu próprio momento.
                    </p>
                </div>
            )}
            {type === "time" && (
                <div className="space-y-2">
                    <div className="flex gap-2">
                        {["24h", "12h"].map((f) => (
                            <button
                                key={f}
                                onClick={() => setDraft({ ...draft, format: f })}
                                className={`flex-1 px-3 py-2 rounded-xl text-[12px] font-mono uppercase tracking-[0.14em] tap-shrink transition ${
                                    draft.format === f
                                        ? "bg-black text-white"
                                        : "bg-black/[0.05] text-black/55 hover:bg-black/[0.10]"
                                }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                    <p className="text-[11px] font-mono text-black/45 leading-snug">
                        Hora atual gravada no momento da publicação.
                    </p>
                </div>
            )}
            {type === "date" && (
                <div className="space-y-2">
                    {["long", "short"].map((f) => (
                        <button
                            key={f}
                            onClick={() => setDraft({ ...draft, format: f })}
                            className={`w-full px-3 py-2 rounded-xl text-[12.5px] font-mono text-left tap-shrink transition ${
                                draft.format === f
                                    ? "bg-black text-white"
                                    : "bg-black/[0.05] text-black/65 hover:bg-black/[0.10]"
                            }`}
                        >
                            {f === "long" ? "13 de junho de 2026" : "13.06.26"}
                        </button>
                    ))}
                </div>
            )}
            {type === "link" && (
                <div className="space-y-2">
                    <input
                        value={draft.url}
                        onChange={(e) => setDraft({ ...draft, url: e.target.value })}
                        placeholder="https://exemplo.pt"
                        type="url"
                        className={cssInput}
                    />
                    <input
                        value={draft.label}
                        onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                        placeholder="Texto do botão (opcional)"
                        maxLength={32}
                        className={cssInput}
                    />
                </div>
            )}
            <button
                onClick={submit}
                data-testid="sticker-editor-save"
                className="mt-5 w-full px-4 h-12 rounded-full bg-black text-white font-mono uppercase text-[11px] tracking-wider hover:bg-black/85 inline-flex items-center justify-center gap-1.5"
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
