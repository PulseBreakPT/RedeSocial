import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, Link, useLocation } from "react-router-dom";
import { MessageCircle, CornerDownRight, X, ArrowUpDown, BellOff, BellRing } from "lucide-react";
import { api, toastApiError } from "../lib/api";
import { PostCard } from "../components/PostCard";
import { PageHeader } from "../components/PageHeader";
import { Avatar } from "../components/Avatar";
import { Spinner } from "../components/Spinner";
import { CommentItem } from "../components/CommentItem";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";

const MAX_DEPTH = 6;
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

function sortRoots(roots, mode) {
    const arr = [...roots];
    if (mode === "best") {
        arr.sort((a, b) => {
            const pa = a.pinned_by_author ? 1 : 0;
            const pb = b.pinned_by_author ? 1 : 0;
            if (pa !== pb) return pb - pa;
            const sa = (a.likes_count || 0) * 2 + (a.replies_count || 0) * 1.5;
            const sb = (b.likes_count || 0) * 2 + (b.replies_count || 0) * 1.5;
            if (sa !== sb) return sb - sa;
            return new Date(a.created_at) - new Date(b.created_at);
        });
    } else if (mode === "old") {
        arr.sort((a, b) => {
            const pa = a.pinned_by_author ? 1 : 0;
            const pb = b.pinned_by_author ? 1 : 0;
            if (pa !== pb) return pb - pa;
            return new Date(a.created_at) - new Date(b.created_at);
        });
    } else {
        arr.sort((a, b) => {
            const pa = a.pinned_by_author ? 1 : 0;
            const pb = b.pinned_by_author ? 1 : 0;
            if (pa !== pb) return pb - pa;
            return new Date(b.created_at) - new Date(a.created_at);
        });
    }
    return arr;
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
    const [replyingTo, setReplyingTo] = useState(null);
    const [collapsedIds, setCollapsedIds] = useState(() => new Set());
    const [inlineFor, setInlineFor] = useState(null);
    const [inlineText, setInlineText] = useState("");
    const [inlineBusy, setInlineBusy] = useState(false);
    const [sortMode, setSortMode] = useState("new"); // new | best | old
    const [threadFollowed, setThreadFollowed] = useState(false);
    const [threadMuted, setThreadMuted] = useState(false);
    const rootInputRef = useRef(null);
    const inlineRef = useRef(null);

    const load = useCallback(async () => {
        try {
            const [p, c] = await Promise.all([
                api.get(`/posts/${postId}`),
                api.get(`/posts/${postId}/comments?sort=${sortMode}`),
            ]);
            setPost(p.data);
            setComments(c.data);
            // relation (silent)
            try {
                const r = await api.get(`/posts/${postId}/relation`);
                setThreadFollowed(!!r.data.thread_followed);
                setThreadMuted(!!r.data.thread_muted);
            } catch { /* ignore */ }
        } catch (e) {
            toastApiError(e);
            navigate("/");
        } finally {
            setLoading(false);
        }
    }, [postId, navigate, sortMode]);

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

    // Scroll to anchored comment if URL has #c-<id>
    useEffect(() => {
        if (loading) return;
        const h = window.location.hash;
        if (h.startsWith("#c-")) {
            const el = document.getElementById(h.slice(1));
            if (el) {
                el.scrollIntoView({ block: "center", behavior: "smooth" });
                el.classList.add("bg-yellow-50");
                setTimeout(() => el.classList.remove("bg-yellow-50"), 1800);
            }
        }
    }, [loading, comments]);

    const tree = useMemo(() => sortRoots(buildTree(comments), sortMode), [comments, sortMode]);
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
                    c.map((x) => x.id === parentId ? { ...x, replies_count: (x.replies_count || 0) + 1 } : x),
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
                setPost((p) => ({ ...p, comments_count: Math.max(0, (p.comments_count || 0) - (data?.deleted || removedIds.size)) }));
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

    const updateCommentLocal = (updated) => {
        setComments((c) => c.map((x) => (x.id === updated.id ? { ...x, ...updated } : x)));
    };

    const onPinChange = (id, pinned) => {
        setComments((c) => c.map((x) => {
            if (x.id === id) return { ...x, pinned_by_author: pinned };
            // when one is pinned, unpin the others (root-level only)
            if (pinned && !x.parent_id) return { ...x, pinned_by_author: false };
            return x;
        }).map((x) => (x.id === id ? { ...x, pinned_by_author: pinned } : x)));
    };

    const toggleFollowThread = async () => {
        try {
            const { data } = await api.post(`/posts/${postId}/follow-thread`);
            setThreadFollowed(data.following);
            toast.success(data.following ? "A seguir esta discussão" : "Deixaste de seguir esta discussão");
        } catch (e) { toastApiError(e); }
    };

    const toggleMuteThread = async () => {
        try {
            const { data } = await api.post(`/posts/${postId}/mute-thread`);
            setThreadMuted(data.muted);
            toast.success(data.muted ? "Discussão silenciada" : "Discussão ativa");
        } catch (e) { toastApiError(e); }
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

            {/* Discussion controls */}
            <div className="px-4 lg:px-5 py-2.5 flex items-center gap-1.5 hairline-b bg-paper">
                <div className="relative">
                    <select
                        value={sortMode}
                        onChange={(e) => setSortMode(e.target.value)}
                        data-testid="comment-sort-select"
                        className="appearance-none bg-black/[0.04] hover:bg-black/[0.08] text-black/75 font-mono text-[11.5px] uppercase tracking-[0.14em] pl-7 pr-3 py-1.5 rounded-full cursor-pointer focus:outline-none transition"
                    >
                        <option value="new">Mais recentes</option>
                        <option value="best">Melhores</option>
                        <option value="old">Mais antigos</option>
                    </select>
                    <ArrowUpDown size={11} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-black/55 pointer-events-none" />
                </div>
                <button
                    onClick={toggleFollowThread}
                    data-testid="follow-thread-btn"
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-mono text-[11.5px] uppercase tracking-[0.14em] transition ${
                        threadFollowed
                            ? "bg-black text-white"
                            : "bg-black/[0.04] hover:bg-black/[0.08] text-black/75"
                    }`}
                >
                    <BellRing size={11} /> {threadFollowed ? "A seguir" : "Seguir discussão"}
                </button>
                <button
                    onClick={toggleMuteThread}
                    data-testid="mute-thread-btn"
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full font-mono text-[11.5px] uppercase tracking-[0.14em] transition ${
                        threadMuted
                            ? "bg-orange-100 text-orange-700"
                            : "bg-black/[0.04] hover:bg-black/[0.08] text-black/75"
                    }`}
                >
                    <BellOff size={11} /> {threadMuted ? "Silenciada" : "Silenciar"}
                </button>
            </div>

            {/* Root composer */}
            <div className="px-4 lg:px-5 py-5 hairline-b bg-paper">
                {replyingTo && (
                    <div className="mb-3 flex items-center gap-2 text-[12px] font-mono text-black/60 bg-black/[0.04] rounded-full px-3 py-1.5 anim-fade-up">
                        <CornerDownRight size={12} />
                        a responder a <span className="text-black font-medium">@{replyingTo.author?.username}</span>
                        <button onClick={() => setReplyingTo(null)} className="ml-auto text-black/45 hover:text-black tap-shrink" aria-label="Cancelar resposta">
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

            {/* Threaded comments */}
            {tree.length === 0 ? (
                <div className="p-14 text-center anim-fade-up">
                    <div className="ring-silver w-16 h-16 rounded-full grid place-items-center mx-auto mb-5">
                        <MessageCircle size={22} strokeWidth={1.4} className="text-black/70" />
                    </div>
                    <p className="type-overline mb-1">Sem novidades</p>
                    <h3 className="font-display text-[18px] tracking-tight">Sem comentários ainda</h3>
                    <p className="text-black/55 font-mono text-sm mt-1.5">Sê o primeiro a dizer algo.</p>
                    <button onClick={() => rootInputRef.current?.focus()} className="mt-5 btn-obsidian px-5 py-2 text-[11px]">
                        Comentar
                    </button>
                </div>
            ) : (
                <div data-testid="comments-thread">
                    {flat.map(({ node, depth, hidden }) => {
                        if (hidden) return null;
                        const total = countDescendants(node);
                        const isCollapsed = collapsedIds.has(node.id);
                        const isReplyOpen = inlineFor === node.id;

                        return (
                            <div key={node.id}>
                                <CommentItem
                                    node={node}
                                    depth={depth}
                                    postId={post.id}
                                    postAuthorId={post.author?.id}
                                    viewerId={user?.id}
                                    indentPx={INDENT_PX}
                                    maxDepth={MAX_DEPTH}
                                    isCollapsed={isCollapsed}
                                    hasChildren={node.children.length > 0}
                                    totalDescendants={total}
                                    onToggleCollapse={toggleCollapse}
                                    onReplyOpen={(id) => { setInlineFor(id); setInlineText(""); }}
                                    isReplyOpen={isReplyOpen}
                                    onLocalUpdate={updateCommentLocal}
                                    onDelete={removeComment}
                                    onPinChange={onPinChange}
                                    threadFollowed={threadFollowed}
                                    threadMuted={threadMuted}
                                    onToggleThreadFollow={toggleFollowThread}
                                    onToggleThreadMute={toggleMuteThread}
                                />
                                {isReplyOpen && (
                                    <div
                                        className="px-4 pb-3 hairline-b bg-paper anim-fade-up"
                                        style={{ paddingLeft: 16 + (Math.min(depth, MAX_DEPTH) * INDENT_PX) + 46 }}
                                    >
                                        <div className="flex gap-2 items-start">
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
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
