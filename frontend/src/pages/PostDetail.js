import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, Link, useLocation } from "react-router-dom";
import { MessageCircle, Trash2, CornerDownRight, ChevronDown, ChevronRight, X } from "lucide-react";
import { api, formatApiError, toastApiError } from "../lib/api";
import { PostCard } from "../components/PostCard";
import { PageHeader } from "../components/PageHeader";
import { Avatar } from "../components/Avatar";
import { RichText } from "../components/RichText";
import { Spinner } from "../components/Spinner";
import { VerifiedBadge } from "../components/VerifiedBadge";
import { useAuth } from "../context/AuthContext";
import { smartTime, fullTime } from "../lib/time";
import { toast } from "sonner";

const MAX_DEPTH = 6; // visual indent cap (px-per-level after that stays flat)
const INDENT_PX = 14;

function buildTree(comments) {
    const map = new Map();
    const roots = [];
    comments.forEach((c) => map.set(c.id, { ...c, children: [] }));
    comments.forEach((c) => {
        const node = map.get(c.id);
        if (c.parent_id && map.has(c.parent_id)) {
            map.get(c.parent_id).children.push(node);
        } else {
            roots.push(node);
        }
    });
    return roots;
}

function countDescendants(node) {
    let n = 0;
    for (const c of node.children) n += 1 + countDescendants(c);
    return n;
}

/**
 * Walk the tree and emit a flat list of { node, depth, hidden }.
 * Collapsed nodes hide their descendants (but the node itself stays visible).
 */
function flatten(tree, collapsedIds) {
    const out = [];
    const walk = (node, depth, hidden) => {
        out.push({ node, depth, hidden });
        const skipChildren = hidden || collapsedIds.has(node.id);
        for (const c of node.children) walk(c, depth + 1, skipChildren);
    };
    tree.forEach((r) => walk(r, 0, false));
    return out;
}

export default function PostDetail() {
    const { postId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [post, setPost] = useState(null);
    const [comments, setComments] = useState([]);
    const [text, setText] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);
    const [replyingTo, setReplyingTo] = useState(null); // { id, author }
    const [collapsedIds, setCollapsedIds] = useState(() => new Set());
    const [inlineFor, setInlineFor] = useState(null); // commentId for which inline reply box is open
    const [inlineText, setInlineText] = useState("");
    const [inlineBusy, setInlineBusy] = useState(false);
    const rootInputRef = useRef(null);
    const inlineRef = useRef(null);

    const load = useCallback(async () => {
        try {
            const [p, c] = await Promise.all([
                api.get(`/posts/${postId}`),
                api.get(`/posts/${postId}/comments`),
            ]);
            setPost(p.data);
            setComments(c.data);
        } catch (e) {
            toastApiError(e);
            navigate("/");
        } finally {
            setLoading(false);
        }
    }, [postId, navigate]);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        if (loading) return;
        if (location.state?.focusComment && rootInputRef.current) {
            rootInputRef.current.focus();
            rootInputRef.current.scrollIntoView({ block: "center", behavior: "smooth" });
        }
    }, [loading, location.state]);

    useEffect(() => {
        if (inlineFor && inlineRef.current) {
            inlineRef.current.focus();
        }
    }, [inlineFor]);

    const tree = useMemo(() => buildTree(comments), [comments]);
    const flat = useMemo(() => flatten(tree, collapsedIds), [tree, collapsedIds]);

    const submitComment = async ({ content, parentId }) => {
        const body = (content || "").trim();
        if (!body) return null;
        setSubmitting(true);
        try {
            const { data } = await api.post(`/posts/${postId}/comments`, {
                content: body,
                parent_id: parentId || null,
            });
            setComments((c) => [...c, data]);
            if (parentId) {
                setComments((c) =>
                    c.map((x) =>
                        x.id === parentId ? { ...x, replies_count: (x.replies_count || 0) + 1 } : x,
                    ),
                );
            } else {
                setPost((p) => ({ ...p, comments_count: (p.comments_count || 0) + 1 }));
            }
            return data;
        } catch (e) {
            toastApiError(e);
            return null;
        } finally {
            setSubmitting(false);
        }
    };

    const submitRoot = async () => {
        if (replyingTo) {
            const created = await submitComment({ content: text, parentId: replyingTo.id });
            if (created) { setText(""); setReplyingTo(null); }
        } else {
            const created = await submitComment({ content: text, parentId: null });
            if (created) setText("");
        }
    };

    const submitInline = async () => {
        const t = inlineText.trim();
        if (!t || !inlineFor) return;
        setInlineBusy(true);
        const created = await submitComment({ content: t, parentId: inlineFor });
        setInlineBusy(false);
        if (created) {
            setInlineText("");
            setInlineFor(null);
        }
    };

    const removeComment = async (commentId) => {
        if (!window.confirm("Apagar este comentário? Respostas também serão apagadas.")) return;
        try {
            const { data } = await api.delete(`/comments/${commentId}`);
            const removedIds = new Set();
            const childrenOf = (id) => comments.filter((c) => c.parent_id === id);
            const queue = [commentId];
            while (queue.length) {
                const id = queue.shift();
                if (removedIds.has(id)) continue;
                removedIds.add(id);
                childrenOf(id).forEach((c) => queue.push(c.id));
            }
            const target = comments.find((c) => c.id === commentId);
            setComments((c) => c.filter((x) => !removedIds.has(x.id)));
            if (target?.parent_id) {
                setComments((c) =>
                    c.map((x) =>
                        x.id === target.parent_id
                            ? { ...x, replies_count: Math.max(0, (x.replies_count || 1) - 1) }
                            : x,
                    ),
                );
            } else {
                setPost((p) => ({
                    ...p,
                    comments_count: Math.max(0, (p.comments_count || 0) - (data?.deleted || removedIds.size)),
                }));
            }
            if (inlineFor && removedIds.has(inlineFor)) setInlineFor(null);
            if (replyingTo && removedIds.has(replyingTo.id)) setReplyingTo(null);
            toast.success("Comentário apagado");
        } catch (e) {
            toastApiError(e);
        }
    };

    const toggleCollapse = (id) => {
        setCollapsedIds((prev) => {
            const n = new Set(prev);
            if (n.has(id)) n.delete(id); else n.add(id);
            return n;
        });
    };

    if (loading || !post) {
        return (
            <div className="p-12 text-center type-overline inline-flex items-center justify-center gap-2 w-full">
                <Spinner size={14} /> a carregar…
            </div>
        );
    }

    const totalComments = comments.length;

    return (
        <div data-testid="post-detail-page">
            <PageHeader
                title="Publicação"
                subtitle={`${totalComments} ${totalComments === 1 ? "comentário" : "comentários"}`}
                back
                testid="postdetail-header"
            />

            <PostCard
                post={post}
                clickable={false}
                onChange={(np) => setPost(np)}
                onDelete={() => navigate("/")}
            />

            {/* Root composer */}
            <div className="px-4 lg:px-5 py-5 hairline-b bg-paper">
                {replyingTo && (
                    <div className="mb-3 flex items-center gap-2 text-[12px] font-mono text-black/60 bg-black/[0.04] rounded-full px-3 py-1.5 anim-fade-up">
                        <CornerDownRight size={12} />
                        a responder a <span className="text-black font-medium">@{replyingTo.author?.username}</span>
                        <button
                            onClick={() => setReplyingTo(null)}
                            className="ml-auto text-black/45 hover:text-black tap-shrink"
                            aria-label="Cancelar resposta"
                        >
                            <X size={13} />
                        </button>
                    </div>
                )}
                <div className="flex gap-3">
                    <Avatar user={user} size={38} />
                    <div className="flex-1">
                        <textarea
                            ref={rootInputRef}
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            data-testid="comment-input"
                            placeholder={replyingTo ? `Responde a @${replyingTo.author?.username}…` : "Adiciona um comentário…"}
                            rows={2}
                            className="w-full bg-transparent text-[15px] focus:outline-none resize-none placeholder:text-black/35 font-body"
                            maxLength={300}
                            onKeyDown={(e) => {
                                if (e.key === "Escape" && replyingTo) { setReplyingTo(null); }
                                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                                    e.preventDefault();
                                    submitRoot();
                                }
                            }}
                        />
                        <div className="flex justify-between items-center mt-1">
                            <span className="font-mono text-[10px] text-black/35 uppercase tracking-[0.16em]">
                                {300 - text.length} restantes · ⌘↵
                            </span>
                            <button
                                onClick={submitRoot}
                                disabled={!text.trim() || submitting}
                                data-testid="submit-comment-btn"
                                className="btn-obsidian text-[11px] px-5 py-2 disabled:opacity-40 inline-flex items-center gap-1.5"
                            >
                                {submitting && <Spinner size={11} />}
                                {replyingTo ? "Responder" : "Comentar"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Threaded comments — flat render for predictable layout */}
            {tree.length === 0 ? (
                <div className="p-14 text-center anim-fade-up">
                    <div className="ring-silver w-16 h-16 rounded-full grid place-items-center mx-auto mb-5">
                        <MessageCircle size={22} strokeWidth={1.4} className="text-black/70" />
                    </div>
                    <p className="type-overline mb-1">Sem novidades</p>
                    <h3 className="font-display text-[18px] tracking-tight">Sem comentários ainda</h3>
                    <p className="text-black/55 font-mono text-sm mt-1.5">Sê o primeiro a dizer algo.</p>
                    <button
                        onClick={() => rootInputRef.current?.focus()}
                        className="mt-5 btn-obsidian px-5 py-2 text-[11px]"
                    >
                        Comentar
                    </button>
                </div>
            ) : (
                <div data-testid="comments-thread">
                    {flat.map(({ node, depth, hidden }) => {
                        if (hidden) return null;
                        const indent = Math.min(depth, MAX_DEPTH);
                        const pl = depth === 0 ? 16 : 16 + indent * INDENT_PX;
                        const canDelete = user?.id === node.author?.id || user?.id === post.author?.id;
                        const total = countDescendants(node);
                        const isCollapsed = collapsedIds.has(node.id);
                        const isReplyOpen = inlineFor === node.id;

                        return (
                            <div
                                key={node.id}
                                data-testid={`comment-${node.id}`}
                                className="relative py-3.5 hairline-b hover:bg-black/[0.012] transition anim-fade-up"
                                style={{ paddingLeft: pl, paddingRight: 16 }}
                            >
                                {/* thread connector for nested comments */}
                                {depth > 0 && (
                                    <span
                                        aria-hidden
                                        className="absolute top-0 bottom-0 w-px bg-black/[0.07]"
                                        style={{ left: pl - 9 }}
                                    />
                                )}
                                <div className="flex gap-2.5">
                                    <Link to={`/u/${node.author?.username}`} className="flex-shrink-0">
                                        <Avatar user={node.author} size={depth === 0 ? 36 : 30} />
                                    </Link>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <Link
                                                to={`/u/${node.author?.username}`}
                                                className="font-heading font-medium text-[13.5px] tracking-tight hover:underline text-black"
                                            >
                                                {node.author?.name}
                                            </Link>
                                            {node.author?.verified && <VerifiedBadge size={11} />}
                                            <span className="font-mono text-[11px] text-black/45">@{node.author?.username}</span>
                                            <span className="text-black/20">·</span>
                                            <span className="font-mono text-[11px] text-black/45" title={fullTime(node.created_at)}>{smartTime(node.created_at)}</span>
                                            {node.author?.id === post.author?.id && (
                                                <span className="font-mono text-[9px] uppercase tracking-[0.18em] px-1.5 py-0.5 rounded-full bg-black/[0.05] text-black/55">
                                                    autor
                                                </span>
                                            )}
                                        </div>

                                        <RichText
                                            text={node.content}
                                            className="mt-1.5 text-[14.5px] text-black/85 leading-relaxed"
                                        />

                                        <div className="flex items-center gap-0.5 mt-2 -ml-2 flex-wrap">
                                            <button
                                                onClick={() => {
                                                    setInlineFor(isReplyOpen ? null : node.id);
                                                    setInlineText("");
                                                }}
                                                data-testid={`comment-reply-${node.id}`}
                                                className="inline-flex items-center gap-1 text-[12px] font-mono text-black/50 hover:text-black px-2 py-1 rounded-full hover:bg-black/[0.04] tap-shrink transition"
                                            >
                                                <CornerDownRight size={12} /> responder
                                            </button>
                                            {node.children.length > 0 && (
                                                <button
                                                    onClick={() => toggleCollapse(node.id)}
                                                    data-testid={`comment-toggle-${node.id}`}
                                                    className="inline-flex items-center gap-1 text-[12px] font-mono text-black/50 hover:text-black px-2 py-1 rounded-full hover:bg-black/[0.04] tap-shrink transition"
                                                >
                                                    {isCollapsed
                                                        ? <><ChevronRight size={12} /> mostrar {total}</>
                                                        : <><ChevronDown size={12} /> ocultar</>}
                                                </button>
                                            )}
                                            {canDelete && (
                                                <button
                                                    onClick={() => removeComment(node.id)}
                                                    data-testid={`comment-delete-${node.id}`}
                                                    className="ml-auto inline-flex items-center gap-1 text-[12px] font-mono text-black/40 hover:text-red-soft px-2 py-1 rounded-full hover:bg-red-soft/10 tap-shrink transition"
                                                >
                                                    <Trash2 size={12} /> apagar
                                                </button>
                                            )}
                                        </div>

                                        {isReplyOpen && (
                                            <div className="mt-3 flex gap-2 items-start anim-fade-up">
                                                <Avatar user={user} size={26} />
                                                <div className="flex-1">
                                                    <textarea
                                                        ref={inlineRef}
                                                        value={inlineText}
                                                        onChange={(e) => setInlineText(e.target.value)}
                                                        placeholder={`Responde a @${node.author?.username}…`}
                                                        rows={2}
                                                        maxLength={300}
                                                        data-testid={`comment-reply-input-${node.id}`}
                                                        className="w-full bg-[#fafafa] border border-black/[0.08] rounded-2xl px-3 py-2 text-[14px] focus:bg-white focus:border-black/30 focus:outline-none transition resize-none"
                                                        onKeyDown={(e) => {
                                                            if (e.key === "Escape") { setInlineFor(null); setInlineText(""); }
                                                            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); submitInline(); }
                                                        }}
                                                    />
                                                    <div className="flex justify-end gap-2 mt-1.5">
                                                        <button
                                                            onClick={() => { setInlineFor(null); setInlineText(""); }}
                                                            className="text-[11px] font-mono uppercase tracking-[0.14em] text-black/55 hover:text-black px-3 py-1.5 rounded-full hover:bg-black/[0.04]"
                                                        >
                                                            Cancelar
                                                        </button>
                                                        <button
                                                            onClick={submitInline}
                                                            disabled={!inlineText.trim() || inlineBusy}
                                                            data-testid={`comment-reply-submit-${node.id}`}
                                                            className="btn-obsidian text-[11px] px-4 py-1.5 disabled:opacity-40 inline-flex items-center gap-1.5"
                                                        >
                                                            {inlineBusy && <Spinner size={10} />} Responder
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
