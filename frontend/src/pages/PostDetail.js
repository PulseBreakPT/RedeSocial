import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, Link, useLocation } from "react-router-dom";
import {
    MessageCircle, CornerDownRight, X, BellOff, BellRing,
    Clock, Sparkles, History, Check, ChevronDown, Flame,
} from "lucide-react";
import { api, toastApiError } from "../lib/api";
import { PostCard } from "../components/PostCard";
import { PageHeader } from "../components/PageHeader";
import { Avatar } from "../components/Avatar";
import { Spinner } from "../components/Spinner";
import { CommentItem } from "../components/CommentItem";
import { CommentTypingIndicator } from "../components/CommentTypingIndicator";
import { PostViewersBadge } from "../components/PostViewersBadge";
import { confirmDialog } from "../components/ConfirmDialog";
import { useAuth } from "../context/AuthContext";
import { useCommentTyping } from "../hooks/useCommentTyping";
import { haptic } from "../lib/haptics";
import { toast } from "sonner";

const MAX_DEPTH = 6;
const INDENT_PX = 14;

const SORT_OPTIONS = [
    { value: "new",           label: "Mais recentes", short: "Recentes",   Icon: Clock,    hint: "ordem cronológica" },
    { value: "best",          label: "Melhores",      short: "Melhores",   Icon: Sparkles, hint: "mais reagidos" },
    { value: "controversial", label: "Polémicos",     short: "Polémicos",  Icon: Flame,    hint: "muitas respostas, poucos likes" },
    { value: "old",           label: "Mais antigos",  short: "Antigos",    Icon: History,  hint: "ordem inversa" },
];

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
    } else if (mode === "controversial") {
        const cscore = (c) => {
            const r = c.replies_count || 0;
            const lk = c.likes_count || 0;
            if (r < 2) return 0;
            return r * (1 + Math.log(r + 1)) / (lk + 2);
        };
        arr.sort((a, b) => {
            const pa = a.pinned_by_author ? 1 : 0;
            const pb = b.pinned_by_author ? 1 : 0;
            if (pa !== pb) return pb - pa;
            const sa = cscore(a), sb = cscore(b);
            if (sa !== sb) return sb - sa;
            return new Date(b.created_at) - new Date(a.created_at);
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
    const [sortMode, setSortMode] = useState("new"); // new | best | controversial | old
    const [sortMenuOpen, setSortMenuOpen] = useState(false);
    const sortMenuRef = useRef(null);
    const [threadFollowed, setThreadFollowed] = useState(false);
    const [threadMuted, setThreadMuted] = useState(false);
    const [highlightIds, setHighlightIds] = useState(() => new Set());
    const [neighbors, setNeighbors] = useState(null); // { prev, next, index, total }
    const [swipeDx, setSwipeDx] = useState(0);
    const swipeStartRef = useRef(null);
    const rootInputRef = useRef(null);
    const inlineRef = useRef(null);

    // Lookup sibling posts (prev/next) for swipe & keyboard navigation.
    useEffect(() => {
        if (!postId) return;
        let cancelled = false;
        (async () => {
            try {
                const { findNeighbors } = await import("../lib/postTrack");
                const n = findNeighbors(postId);
                if (!cancelled) setNeighbors(n);
            } catch { /* ignore */ }
        })();
        return () => { cancelled = true; };
    }, [postId]);

    const goSibling = useCallback((dir) => {
        if (!neighbors) return;
        const target = dir > 0 ? neighbors.next : neighbors.prev;
        if (!target) return;
        haptic("tap");
        navigate(`/post/${target}`, { state: { from: "swipe" } });
    }, [neighbors, navigate]);

    // Keyboard arrows for sibling navigation (desktop)
    useEffect(() => {
        const onKey = (e) => {
            // Don't intercept when typing in inputs / textareas / contenteditable
            const tag = (e.target?.tagName || "").toLowerCase();
            if (tag === "input" || tag === "textarea" || e.target?.isContentEditable) return;
            if (e.metaKey || e.ctrlKey || e.altKey) return;
            if (e.key === "ArrowLeft") { goSibling(-1); }
            else if (e.key === "ArrowRight") { goSibling(1); }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [goSibling]);

    // Comment typing indicator (real-time WS)
    const { typers, notifyTyping } = useCommentTyping(postId);

    // Listen to live "new_comment" events for this post — fetch the comment and
    // append + highlight. Avoid duplicates if it's ours (we already inserted).
    useEffect(() => {
        if (!postId) return;
        const onNew = async (e) => {
            const d = e.detail;
            if (!d || d.post_id !== postId) return;
            if (d.author_id === user?.id) return; // self-create handled locally
            if (!d.comment_id) return;
            // Avoid double-add
            setComments((prev) => {
                if (prev.some((c) => c.id === d.comment_id)) return prev;
                return prev;
            });
            try {
                // Fetch full thread snapshot to ensure consistent enrichment.
                const { data } = await api.get(`/posts/${postId}/comments?sort=${sortMode}`);
                setComments(data);
                setHighlightIds((prev) => {
                    const n = new Set(prev);
                    n.add(d.comment_id);
                    return n;
                });
                // Clear highlight after animation
                setTimeout(() => {
                    setHighlightIds((prev) => {
                        const n = new Set(prev);
                        n.delete(d.comment_id);
                        return n;
                    });
                }, 2600);
            } catch { /* ignore */ }
        };
        window.addEventListener("vmln:new_comment", onNew);
        return () => window.removeEventListener("vmln:new_comment", onNew);
    }, [postId, sortMode, user?.id]);

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

    // Close sort menu on outside click / Esc
    useEffect(() => {
        if (!sortMenuOpen) return;
        const onDown = (e) => {
            if (sortMenuRef.current && !sortMenuRef.current.contains(e.target)) setSortMenuOpen(false);
        };
        const onKey = (e) => { if (e.key === "Escape") setSortMenuOpen(false); };
        document.addEventListener("mousedown", onDown);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", onDown);
            document.removeEventListener("keydown", onKey);
        };
    }, [sortMenuOpen]);

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
            haptic("comment");
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
        const ok = await confirmDialog({
            title: "Apagar comentário?",
            description: "Todas as respostas a este comentário também serão apagadas. Esta ação é irreversível.",
            confirmText: "Apagar",
            danger: true,
        });
        if (!ok) return;
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

    // Touch swipe handlers — horizontal swipe navigates to prev/next post.
    const onTouchStart = (e) => {
        const t = e.touches?.[0];
        if (!t) return;
        swipeStartRef.current = { x: t.clientX, y: t.clientY, t: Date.now(), aborted: false };
    };
    const onTouchMove = (e) => {
        const s = swipeStartRef.current;
        if (!s || s.aborted) return;
        const t = e.touches?.[0];
        if (!t) return;
        const dx = t.clientX - s.x;
        const dy = t.clientY - s.y;
        // Cancel swipe if it's mostly vertical
        if (Math.abs(dy) > Math.abs(dx) * 0.8) {
            s.aborted = true;
            setSwipeDx(0);
            return;
        }
        // Only allow movement if a neighbor exists in that direction
        const allowLeft = neighbors?.next;   // swipe left → next
        const allowRight = neighbors?.prev;  // swipe right → prev
        let nx = dx;
        if (nx < 0 && !allowLeft) nx = nx * 0.25;
        if (nx > 0 && !allowRight) nx = nx * 0.25;
        // Clamp
        nx = Math.max(-160, Math.min(160, nx));
        setSwipeDx(nx);
    };
    const onTouchEnd = () => {
        const s = swipeStartRef.current;
        swipeStartRef.current = null;
        const dx = swipeDx;
        setSwipeDx(0);
        if (!s || s.aborted) return;
        if (Math.abs(dx) < 70) return;
        if (dx < 0) goSibling(1);
        else goSibling(-1);
    };

    return (
        <div
            data-testid="post-detail-page"
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            style={{ transform: swipeDx ? `translateX(${swipeDx * 0.4}px)` : undefined, transition: swipeDx ? "none" : "transform 220ms cubic-bezier(.22,.61,.36,1)" }}
        >
            <PageHeader
                title="Publicação"
                subtitle={`${totalComments} ${totalComments === 1 ? "comentário" : "comentários"}${neighbors?.total ? ` · ${neighbors.index + 1}/${neighbors.total}` : ""}`}
                back
                testid="postdetail-header"
            />

            <PostCard
                post={post}
                clickable={false}
                onChange={(np) => setPost(np)}
                onDelete={() => navigate("/")}
            />

            {/* Live viewers — discreet badge */}
            <div className="px-4 lg:px-5 -mt-1 pb-2 flex items-center gap-2 anim-fade-up">
                <PostViewersBadge postId={post.id} />
                <CommentTypingIndicator typers={typers} currentUserId={user?.id} className="!px-0 !py-0" />
            </div>

            {/* Discussion controls */}
            <div className="px-4 lg:px-5 py-3 flex items-center gap-2 hairline-b bg-paper">
                {/* Sort dropdown */}
                <div className="relative" ref={sortMenuRef}>
                    {(() => {
                        const active = SORT_OPTIONS.find((o) => o.value === sortMode) || SORT_OPTIONS[0];
                        const ActiveIcon = active.Icon;
                        return (
                            <>
                                <button
                                    type="button"
                                    onClick={() => setSortMenuOpen((v) => !v)}
                                    data-testid="comment-sort-trigger"
                                    aria-haspopup="listbox"
                                    aria-expanded={sortMenuOpen}
                                    title={`Ordenar: ${active.label}`}
                                    className={`group inline-flex items-center gap-1.5 pl-2.5 pr-2 h-8 rounded-full border font-mono text-[11px] uppercase tracking-[0.14em] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-black/15 ${
                                        sortMenuOpen
                                            ? "bg-black text-white border-black"
                                            : "bg-white text-black/75 border-black/[0.12] hover:bg-black/[0.04] hover:border-black/[0.2]"
                                    }`}
                                >
                                    <ActiveIcon size={12} strokeWidth={2} />
                                    <span className="hidden sm:inline">{active.label}</span>
                                    <span className="sm:hidden">{active.short}</span>
                                    <ChevronDown
                                        size={12}
                                        strokeWidth={2}
                                        className={`transition-transform ${sortMenuOpen ? "rotate-180" : ""}`}
                                    />
                                </button>
                                {sortMenuOpen && (
                                    <div
                                        role="listbox"
                                        data-testid="comment-sort-menu"
                                        className="absolute left-0 top-full mt-1.5 z-40 min-w-[200px] bg-white rounded-2xl shadow-xl border border-black/[0.08] p-1 anim-fade-up origin-top"
                                    >
                                        {SORT_OPTIONS.map((opt) => {
                                            const OptIcon = opt.Icon;
                                            const isActive = opt.value === sortMode;
                                            return (
                                                <button
                                                    key={opt.value}
                                                    type="button"
                                                    role="option"
                                                    aria-selected={isActive}
                                                    data-testid={`comment-sort-opt-${opt.value}`}
                                                    onClick={() => { setSortMode(opt.value); setSortMenuOpen(false); }}
                                                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition ${
                                                        isActive ? "bg-black/[0.05]" : "hover:bg-black/[0.04]"
                                                    }`}
                                                >
                                                    <span className={`w-7 h-7 grid place-items-center rounded-full ${isActive ? "bg-black text-white" : "bg-black/[0.05] text-black/70"}`}>
                                                        <OptIcon size={13} strokeWidth={2} />
                                                    </span>
                                                    <span className="flex-1 min-w-0">
                                                        <span className="block text-[13px] font-medium text-black tracking-tight">{opt.label}</span>
                                                        <span className="block text-[10.5px] font-mono text-black/45 lowercase tracking-tight">{opt.hint}</span>
                                                    </span>
                                                    {isActive && <Check size={14} strokeWidth={2.4} className="text-black flex-shrink-0" />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </>
                        );
                    })()}
                </div>

                {/* Toggle group: Follow / Mute (mutually informative, not strictly exclusive) */}
                <div className="ml-auto flex items-center gap-1.5">
                    <button
                        type="button"
                        onClick={toggleFollowThread}
                        data-testid="follow-thread-btn"
                        aria-pressed={threadFollowed}
                        title={threadFollowed ? "Estás a seguir esta discussão — toca para deixar de seguir" : "Receber notificações de novas respostas"}
                        className={`group inline-flex items-center gap-1.5 h-8 px-3 rounded-full font-mono text-[11px] uppercase tracking-[0.14em] border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-black/15 tap-shrink ${
                            threadFollowed
                                ? "bg-black text-white border-black hover:bg-black/85"
                                : "bg-white text-black/75 border-black/[0.12] hover:bg-black/[0.04] hover:border-black/[0.2]"
                        }`}
                    >
                        <BellRing
                            size={12}
                            strokeWidth={2}
                            className={threadFollowed ? "animate-[pop_360ms_cubic-bezier(.22,.61,.36,1)]" : ""}
                            fill={threadFollowed ? "currentColor" : "none"}
                        />
                        <span className="hidden sm:inline">{threadFollowed ? "A seguir" : "Seguir discussão"}</span>
                        <span className="sm:hidden">{threadFollowed ? "A seguir" : "Seguir"}</span>
                        {threadFollowed && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-dot ml-0.5" aria-hidden />}
                    </button>
                    <button
                        type="button"
                        onClick={toggleMuteThread}
                        data-testid="mute-thread-btn"
                        aria-pressed={threadMuted}
                        title={threadMuted ? "Discussão silenciada — toca para reativar" : "Silenciar notificações desta discussão"}
                        aria-label={threadMuted ? "Reativar notificações" : "Silenciar discussão"}
                        className={`group inline-flex items-center gap-1.5 h-8 px-2.5 sm:px-3 rounded-full font-mono text-[11px] uppercase tracking-[0.14em] border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-black/15 tap-shrink ${
                            threadMuted
                                ? "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
                                : "bg-white text-black/75 border-black/[0.12] hover:bg-black/[0.04] hover:border-black/[0.2]"
                        }`}
                    >
                        <BellOff size={12} strokeWidth={2} />
                        <span className="hidden sm:inline">{threadMuted ? "Silenciada" : "Silenciar"}</span>
                    </button>
                </div>
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
                            onChange={(e) => { setText(e.target.value); notifyTyping(); }}
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
                            <div key={node.id} className={highlightIds.has(node.id) ? "comment-new-highlight" : ""}>
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
                                                    onChange={(e) => { setInlineText(e.target.value); notifyTyping(); }}
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
