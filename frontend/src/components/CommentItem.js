import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
    Heart, MessageCircle, MoreHorizontal, Pin, Trash2, Edit3, Copy, Share2,
    Flag, ChevronDown, ChevronRight, CornerDownRight, Check, X, Smile,
} from "lucide-react";
import { api, toastApiError } from "../lib/api";
import { Avatar } from "./Avatar";
import { RichText } from "./RichText";
import { Spinner } from "./Spinner";
import { VerifiedBadge } from "./VerifiedBadge";
import { smartTime, fullTime } from "../lib/time";
import { toast } from "sonner";

const QUICK_EMOJIS = ["❤️", "🔥", "😂", "😢", "👏", "🤔", "✨"];
const REPORT_REASONS = [
    { key: "spam", label: "Spam" },
    { key: "harassment", label: "Assédio / Bullying" },
    { key: "hate", label: "Discurso de ódio" },
    { key: "misinformation", label: "Desinformação" },
    { key: "nsfw", label: "Conteúdo impróprio" },
    { key: "other", label: "Outro" },
];

function ReportSheet({ targetLabel, onCancel, onSubmit }) {
    const [reason, setReason] = useState("spam");
    const [detail, setDetail] = useState("");
    const [busy, setBusy] = useState(false);
    return (
        <div className="fixed inset-0 z-[300] bg-black/40 backdrop-blur-sm grid place-items-center p-4 anim-fade-up">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-black/[0.05]">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <p className="type-overline">Reportar</p>
                        <h3 className="font-display text-[22px] tracking-tight leading-tight">{targetLabel}</h3>
                    </div>
                    <button
                        onClick={onCancel}
                        className="w-9 h-9 rounded-full grid place-items-center text-black/45 hover:text-black hover:bg-black/[0.05] tap-shrink transition"
                        aria-label="Fechar"
                    >
                        <X size={18} />
                    </button>
                </div>
                <div className="space-y-1.5 mb-4">
                    {REPORT_REASONS.map((r) => (
                        <button
                            key={r.key}
                            onClick={() => setReason(r.key)}
                            className={`w-full text-left px-3.5 py-2.5 rounded-xl text-[13.5px] font-mono transition tap-shrink ${
                                reason === r.key
                                    ? "bg-black text-white shadow-[0_4px_14px_-4px_rgba(13,13,16,0.4)]"
                                    : "bg-black/[0.04] hover:bg-black/[0.07] text-black/75"
                            }`}
                        >
                            {r.label}
                        </button>
                    ))}
                </div>
                <textarea
                    value={detail}
                    onChange={(e) => setDetail(e.target.value)}
                    rows={3}
                    maxLength={400}
                    placeholder="Detalhes (opcional)…"
                    className="w-full bg-[#fafafa] border border-black/[0.08] rounded-2xl px-3.5 py-2.5 text-[13.5px] focus:bg-white focus:border-black/30 focus:outline-none focus:ring-2 focus:ring-black/[0.04] resize-none mb-4 transition"
                />
                <div className="flex justify-end gap-2">
                    <button onClick={onCancel} className="px-4 py-2 text-[11px] font-mono uppercase tracking-[0.14em] text-black/60 hover:text-black rounded-full hover:bg-black/[0.04] tap-shrink transition">
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

export function CommentItem({
    node, depth = 0, postId, postAuthorId, viewerId, indentPx = 14, maxDepth = 6,
    isCollapsed, hasChildren, totalDescendants, onToggleCollapse,
    onReplyOpen, isReplyOpen,
    onLocalUpdate, onDelete, onPinChange,
    threadFollowed, threadMuted, onToggleThreadFollow, onToggleThreadMute,
}) {
    const indent = Math.min(depth, maxDepth);
    const pl = depth === 0 ? 16 : 16 + indent * indentPx;
    const isAuthor = viewerId === node.author?.id;
    const isPostAuthor = viewerId === postAuthorId;
    const canDelete = isAuthor || isPostAuthor;
    const canEdit = isAuthor;
    const isOP = node.author?.id === postAuthorId;

    const [menuOpen, setMenuOpen] = useState(false);
    const [reactOpen, setReactOpen] = useState(false);
    const [editing, setEditing] = useState(false);
    const [editText, setEditText] = useState(node.content);
    const [editBusy, setEditBusy] = useState(false);
    const [reportOpen, setReportOpen] = useState(false);
    const [animLike, setAnimLike] = useState(false);
    const menuRef = useRef(null);
    const reactRef = useRef(null);
    const longPressTimer = useRef(null);

    useEffect(() => {
        const handler = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
            if (reactRef.current && !reactRef.current.contains(e.target)) setReactOpen(false);
        };
        if (menuOpen || reactOpen) {
            document.addEventListener("mousedown", handler);
            return () => document.removeEventListener("mousedown", handler);
        }
    }, [menuOpen, reactOpen]);

    const toggleLike = async () => {
        const prev = { liked: node.liked, count: node.likes_count || 0 };
        setAnimLike(true);
        setTimeout(() => setAnimLike(false), 280);
        // optimistic
        onLocalUpdate({
            ...node,
            liked: !prev.liked,
            likes_count: prev.liked ? Math.max(0, prev.count - 1) : prev.count + 1,
        });
        try {
            const { data } = await api.post(`/comments/${node.id}/like`);
            onLocalUpdate({ ...node, liked: data.liked, likes_count: data.likes_count });
        } catch (e) {
            // rollback
            onLocalUpdate({ ...node, liked: prev.liked, likes_count: prev.count });
            toastApiError(e);
        }
    };

    const sendReact = async (emoji) => {
        setReactOpen(false);
        try {
            const { data } = await api.post(`/comments/${node.id}/react`, { emoji });
            onLocalUpdate({ ...node, reactions: data.reactions });
        } catch (e) {
            toastApiError(e);
        }
    };

    const onLongPressStart = () => {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = setTimeout(() => setReactOpen(true), 380);
    };
    const onLongPressEnd = () => clearTimeout(longPressTimer.current);

    const copyContent = async () => {
        try {
            await navigator.clipboard.writeText(node.content);
            toast.success("Comentário copiado");
        } catch {
            toast.error("Não foi possível copiar");
        }
        setMenuOpen(false);
    };

    const shareComment = async () => {
        const url = `${window.location.origin}/post/${postId}#c-${node.id}`;
        try {
            if (navigator.share) {
                await navigator.share({ url, title: "Comentário Lusorae", text: node.content.slice(0, 80) });
            } else {
                await navigator.clipboard.writeText(url);
                toast.success("Link do comentário copiado");
            }
        } catch { /* user cancel */ }
        setMenuOpen(false);
    };

    const saveEdit = async () => {
        const t = editText.trim();
        if (!t || t === node.content) { setEditing(false); return; }
        setEditBusy(true);
        try {
            const { data } = await api.patch(`/comments/${node.id}`, { content: t });
            onLocalUpdate({ ...node, ...data });
            toast.success("Comentário editado");
            setEditing(false);
        } catch (e) {
            toastApiError(e);
        } finally {
            setEditBusy(false);
        }
    };

    const submitReport = async ({ reason, detail }) => {
        try {
            await api.post(`/comments/${node.id}/report`, { reason, detail });
            toast.success("Reportado. Obrigado por nos ajudar a manter a comunidade segura.");
            setReportOpen(false);
        } catch (e) {
            toastApiError(e);
        }
    };

    const togglePin = async () => {
        setMenuOpen(false);
        try {
            const { data } = await api.post(`/comments/${node.id}/pin`);
            onPinChange(node.id, data.pinned);
            toast.success(data.pinned ? "Comentário destacado" : "Destaque removido");
        } catch (e) {
            toastApiError(e);
        }
    };

    const reactions = node.reactions || {};
    const reactionEntries = Object.entries(reactions).sort((a, b) => b[1].count - a[1].count);

    return (
        <div
            id={`c-${node.id}`}
            data-testid={`comment-${node.id}`}
            className="group/comment relative py-3.5 hairline-b hover:bg-black/[0.012] transition-colors anim-fade-up"
            style={{ paddingLeft: pl, paddingRight: 16 }}
        >
            {/* Thread guide — gradient fade for depth */}
            {depth > 0 && (
                <span
                    aria-hidden
                    className="absolute top-0 bottom-0 w-px"
                    style={{
                        left: pl - 9,
                        background:
                            "linear-gradient(180deg, rgba(13,13,16,0.10) 0%, rgba(13,13,16,0.06) 50%, rgba(13,13,16,0.02) 100%)",
                    }}
                />
            )}
            <div className="flex gap-2.5">
                <Link to={`/u/${node.author?.username}`} className="flex-shrink-0 self-start">
                    <Avatar user={node.author} size={depth === 0 ? 36 : 30} />
                </Link>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                        <Link
                            to={`/u/${node.author?.username}`}
                            className="font-heading font-semibold text-[13.5px] tracking-tight hover:underline underline-offset-4 decoration-black/20 text-black truncate"
                        >
                            {node.author?.name}
                        </Link>
                        {node.author?.verified && <VerifiedBadge size={11} />}
                        <span className="font-mono text-[11px] text-black/45 truncate">@{node.author?.username}</span>
                        <span className="text-black/20" aria-hidden>·</span>
                        <span
                            className="font-mono text-[11px] text-black/45 tabular-nums whitespace-nowrap"
                            title={fullTime(node.created_at)}
                        >
                            {smartTime(node.created_at)}
                        </span>
                        {node.edited_at && (
                            <span
                                className="font-mono text-[10px] text-black/35 italic"
                                title={`Editado ${fullTime(node.edited_at)}`}
                            >
                                (editado)
                            </span>
                        )}
                        {isOP && (
                            <span
                                className="inline-flex items-center font-mono text-[9px] uppercase tracking-[0.18em] px-1.5 py-0.5 rounded-full text-black/65"
                                style={{ background: "rgba(247,245,239,0.95)", boxShadow: "inset 0 0 0 1px rgba(13,13,16,0.08)" }}
                                title="Autor da publicação"
                            >
                                autor
                            </span>
                        )}
                        {node.pinned_by_author && (
                            <span
                                className="inline-flex items-center gap-0.5 font-mono text-[9px] uppercase tracking-[0.18em] px-1.5 py-0.5 rounded-full"
                                style={{
                                    background: "linear-gradient(135deg, #FFE9B7 0%, #FFCC29 100%)",
                                    color: "#5a3d00",
                                    boxShadow: "inset 0 0 0 1px rgba(217,162,62,0.35)",
                                }}
                                data-testid={`comment-pinned-${node.id}`}
                                title="Destacado pelo autor"
                            >
                                <Pin size={9} strokeWidth={2.2} /> destaque
                            </span>
                        )}

                        {/* More menu — appears on hover (desktop) or tap (mobile via :focus-within) */}
                        <div
                            className="ml-auto relative opacity-100 lg:opacity-0 lg:group-hover/comment:opacity-100 lg:focus-within:opacity-100 transition-opacity duration-150"
                            ref={menuRef}
                        >
                            <button
                                onClick={() => setMenuOpen((o) => !o)}
                                data-testid={`comment-more-${node.id}`}
                                aria-label="Mais opções"
                                aria-haspopup="menu"
                                aria-expanded={menuOpen}
                                className="p-1 rounded-full text-black/35 hover:text-black hover:bg-black/[0.05] tap-shrink"
                            >
                                <MoreHorizontal size={14} />
                            </button>
                            {menuOpen && (
                                <div
                                    role="menu"
                                    className="absolute right-0 top-7 z-50 bg-white rounded-2xl shadow-[0_20px_50px_-12px_rgba(13,13,16,0.22)] border border-black/[0.06] py-1.5 w-60 anim-fade-up overflow-hidden"
                                >
                                    <MenuRow onClick={copyContent} icon={Copy} label="Copiar texto" />
                                    <MenuRow onClick={shareComment} icon={Share2} label="Partilhar comentário" />
                                    {depth === 0 && (
                                        <>
                                            <div className="h-px bg-black/[0.05] mx-2 my-1" aria-hidden />
                                            <MenuRow
                                                onClick={() => { setMenuOpen(false); onToggleThreadFollow?.(); }}
                                                icon={Heart}
                                                label={threadFollowed ? "Deixar seguir discussão" : "Seguir discussão"}
                                            />
                                            <MenuRow
                                                onClick={() => { setMenuOpen(false); onToggleThreadMute?.(); }}
                                                icon={X}
                                                label={threadMuted ? "Ativar discussão" : "Silenciar discussão"}
                                            />
                                        </>
                                    )}
                                    {(canEdit || isPostAuthor) && <div className="h-px bg-black/[0.05] mx-2 my-1" aria-hidden />}
                                    {canEdit && (
                                        <MenuRow
                                            onClick={() => { setMenuOpen(false); setEditing(true); setEditText(node.content); }}
                                            icon={Edit3} label="Editar"
                                        />
                                    )}
                                    {isPostAuthor && (
                                        <MenuRow
                                            onClick={togglePin} icon={Pin}
                                            label={node.pinned_by_author ? "Remover destaque" : "Destacar"}
                                        />
                                    )}
                                    {(!isAuthor || canDelete) && <div className="h-px bg-black/[0.05] mx-2 my-1" aria-hidden />}
                                    {!isAuthor && (
                                        <MenuRow
                                            onClick={() => { setMenuOpen(false); setReportOpen(true); }}
                                            icon={Flag} label="Reportar" danger
                                        />
                                    )}
                                    {canDelete && (
                                        <MenuRow onClick={() => { setMenuOpen(false); onDelete(node.id); }} icon={Trash2} label="Apagar" danger />
                                    )}
                                </div>
                            )}
                        </div>
                    </div>

                    {editing ? (
                        <div className="mt-2">
                            <textarea
                                value={editText}
                                onChange={(e) => setEditText(e.target.value)}
                                rows={2}
                                maxLength={300}
                                autoFocus
                                data-testid={`comment-edit-input-${node.id}`}
                                className="w-full bg-[#fafafa] border border-black/[0.08] rounded-2xl px-3.5 py-2.5 text-[14px] focus:bg-white focus:border-blue-soft focus:outline-none focus:ring-2 focus:ring-[rgba(44,111,209,0.10)] transition resize-none"
                                onKeyDown={(e) => {
                                    if (e.key === "Escape") { setEditing(false); setEditText(node.content); }
                                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); saveEdit(); }
                                }}
                            />
                            <div className="flex items-center justify-between mt-1.5">
                                <span className="font-mono text-[10px] text-black/40 uppercase tracking-[0.14em] hidden sm:inline">
                                    ⌘ + enter para guardar
                                </span>
                                <div className="flex gap-2 ml-auto">
                                    <button
                                        onClick={() => { setEditing(false); setEditText(node.content); }}
                                        className="text-[11px] font-mono uppercase tracking-[0.14em] text-black/55 hover:text-black px-3 py-1.5 rounded-full hover:bg-black/[0.04] tap-shrink transition"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={saveEdit}
                                        disabled={editBusy || !editText.trim()}
                                        data-testid={`comment-edit-save-${node.id}`}
                                        className="btn-obsidian text-[11px] px-4 py-1.5 disabled:opacity-40 inline-flex items-center gap-1.5"
                                    >
                                        {editBusy && <Spinner size={10} />} <Check size={11} /> Guardar
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <RichText text={node.content} className="mt-1.5 text-[14.5px] text-black/85 leading-[1.55]" />
                    )}

                    {/* Reactions row */}
                    {reactionEntries.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2" data-testid={`comment-reactions-${node.id}`}>
                            {reactionEntries.map(([emoji, info]) => (
                                <button
                                    key={emoji}
                                    onClick={() => sendReact(emoji)}
                                    className={`inline-flex items-center gap-1 text-[11.5px] font-mono px-2 py-0.5 rounded-full tap-shrink transition ${
                                        info.reacted
                                            ? "bg-black text-white shadow-[0_2px_8px_-2px_rgba(13,13,16,0.3)]"
                                            : "bg-black/[0.05] hover:bg-black/[0.1] text-black/70"
                                    }`}
                                >
                                    <span className="text-[13px] leading-none">{emoji}</span>
                                    <span className="tabular-nums">{info.count}</span>
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Actions row */}
                    <div className="flex items-center gap-0.5 mt-2 -ml-2 flex-wrap relative">
                        <button
                            onClick={toggleLike}
                            onMouseDown={onLongPressStart}
                            onMouseUp={onLongPressEnd}
                            onMouseLeave={onLongPressEnd}
                            onTouchStart={onLongPressStart}
                            onTouchEnd={onLongPressEnd}
                            data-testid={`comment-like-${node.id}`}
                            aria-pressed={node.liked}
                            className={`inline-flex items-center gap-1 text-[12px] font-mono px-2 py-1 rounded-full hover:bg-black/[0.04] tap-shrink transition ${
                                node.liked
                                    ? "text-[var(--coral-500)] hover:bg-[var(--coral-50)]"
                                    : "text-black/50 hover:text-black"
                            }`}
                            title="Like (segura para reagir)"
                        >
                            <Heart
                                size={12}
                                fill={node.liked ? "currentColor" : "none"}
                                className={animLike ? "anim-pop" : ""}
                            />
                            {node.likes_count > 0 ? (
                                <span key={node.likes_count} className={`tabular-nums ${animLike ? "anim-count-roll" : ""}`}>
                                    {node.likes_count}
                                </span>
                            ) : (
                                <span>gosto</span>
                            )}
                        </button>
                        <button
                            ref={reactRef}
                            onClick={() => setReactOpen((o) => !o)}
                            data-testid={`comment-react-${node.id}`}
                            aria-haspopup="dialog"
                            aria-expanded={reactOpen}
                            className="inline-flex items-center gap-1 text-[12px] font-mono text-black/50 hover:text-black px-2 py-1 rounded-full hover:bg-black/[0.04] tap-shrink transition relative"
                            title="Reagir com emoji"
                        >
                            <Smile size={12} /> reagir
                            {reactOpen && (
                                <div
                                    onMouseDown={(e) => e.stopPropagation()}
                                    className="absolute top-9 left-0 z-50 bg-white/95 backdrop-blur-md rounded-full shadow-[0_12px_30px_-8px_rgba(13,13,16,0.22)] border border-black/[0.06] flex gap-0.5 px-2.5 py-1.5 anim-fade-up"
                                >
                                    {QUICK_EMOJIS.map((e, i) => (
                                        <span
                                            key={e}
                                            onClick={(ev) => { ev.stopPropagation(); sendReact(e); }}
                                            className="text-[18px] hover:scale-[1.35] transition-transform duration-200 cursor-pointer px-1 tap-shrink"
                                            style={{ animationDelay: `${i * 22}ms` }}
                                        >
                                            {e}
                                        </span>
                                    ))}
                                </div>
                            )}
                        </button>
                        <button
                            onClick={() => onReplyOpen(isReplyOpen ? null : node.id)}
                            data-testid={`comment-reply-${node.id}`}
                            className={`inline-flex items-center gap-1 text-[12px] font-mono px-2 py-1 rounded-full tap-shrink transition ${
                                isReplyOpen
                                    ? "text-blue-soft bg-[rgba(44,111,209,0.08)]"
                                    : "text-black/50 hover:text-black hover:bg-black/[0.04]"
                            }`}
                        >
                            <CornerDownRight size={12} /> {isReplyOpen ? "a responder" : "responder"}
                        </button>
                        {hasChildren && (
                            <button
                                onClick={() => onToggleCollapse(node.id)}
                                data-testid={`comment-toggle-${node.id}`}
                                className="inline-flex items-center gap-1 text-[12px] font-mono text-black/50 hover:text-black px-2 py-1 rounded-full hover:bg-black/[0.04] tap-shrink transition"
                            >
                                {isCollapsed
                                    ? <><ChevronRight size={12} /> mostrar <span className="tabular-nums">{totalDescendants}</span></>
                                    : <><ChevronDown size={12} /> ocultar</>}
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {reportOpen && (
                <ReportSheet
                    targetLabel={`Comentário de @${node.author?.username}`}
                    onCancel={() => setReportOpen(false)}
                    onSubmit={submitReport}
                />
            )}
        </div>
    );
}

function MenuRow({ icon: Icon, label, onClick, danger }) {
    return (
        <button
            role="menuitem"
            onClick={onClick}
            className={`w-full text-left px-3 py-2 text-[13px] font-mono inline-flex items-center gap-2.5 transition ${
                danger
                    ? "text-red-600 hover:bg-red-50"
                    : "text-black/75 hover:bg-black/[0.04] hover:text-black"
            }`}
        >
            <Icon size={13} strokeWidth={1.8} /> {label}
        </button>
    );
}
