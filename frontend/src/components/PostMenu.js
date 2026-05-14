import { useEffect, useRef, useState } from "react";
import {
    MoreHorizontal, Trash2, Pencil, Pin, PinOff, Flag, Link2, Type, BarChart3,
    Users2, Languages, VolumeX, ThumbsDown, ThumbsUp, FolderPlus, Bell, BellOff,
    Sparkles, FileText, Clock, Eye, StickyNote,
} from "lucide-react";
import { api, toastApiError } from "../lib/api";
import { toast } from "sonner";
import { CollabModal } from "./CollabModal";
import { ViewersModal } from "./ViewersModal";
import { ReportModal } from "./ReportModal";
import {
    muteAuthor, muteTopic, seeLessOfTopic, seeMoreOfTopic,
    toggleBoost, isBoosted, setPostNote, getPostNote,
    convertToStory, addToCollection,
    toggleWatchPost, isWatchingPost,
} from "../lib/interestSignals";

const itemCls = "w-full px-4 py-2.5 text-[13px] font-body text-left hover:bg-black/[0.04] flex items-center gap-3 text-black/80 transition";

function firstHashtag(content) {
    const m = (content || "").match(/#([\w\u00C0-\u017F]+)/);
    return m ? m[1] : null;
}

export function PostMenu({ post, isOwn, onEdit, onDelete, onPinToggle, onAnalytics }) {
    const [open, setOpen] = useState(false);
    const [collabOpen, setCollabOpen] = useState(false);
    const [viewersOpen, setViewersOpen] = useState(false);
    const [reportOpen, setReportOpen] = useState(false);
    const [boosted, setBoosted] = useState(() => isBoosted(post.id));
    const [watching, setWatching] = useState(() => isWatchingPost(post.id));
    const [threadMuted, setThreadMuted] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const close = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener("mousedown", close);
        return () => document.removeEventListener("mousedown", close);
    }, []);

    const close = () => setOpen(false);

    const handlePin = async (e) => {
        e.stopPropagation();
        try {
            const { data } = await api.post(`/posts/${post.id}/pin`);
            toast.success(data.pinned ? "Publicação fixada no perfil" : "Publicação desafixada");
            onPinToggle?.(data.pinned);
        } catch (err) { toastApiError(err); }
        close();
    };
    const handleCopy = (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(`${window.location.origin}/post/${post.id}`);
        toast.success("Link copiado"); close();
    };
    const handleCopyText = (e) => {
        e.stopPropagation();
        navigator.clipboard.writeText(post.content || "");
        toast.success("Texto copiado"); close();
    };
    const handleReport = (e) => {
        e.stopPropagation();
        close();
        setReportOpen(true);
    };

    const submitReport = async ({ reason, detail }) => {
        try {
            await api.post(`/posts/${post.id}/report`, { reason, detail });
            toast.success("Publicação reportada. Obrigado.");
            setReportOpen(false);
        } catch (err) { toastApiError(err); }
    };

    const handleConvertRecado = async (e) => {
        e.stopPropagation();
        close();
        const text = (post.content || "").trim().slice(0, 60);
        if (!text) { toast.error("Sem texto para converter"); return; }
        try {
            await api.post("/notes", { text, mood: post.mood || "" });
            toast.success("Recado de 24h criado!");
        } catch (err) { toastApiError(err); }
    };

    const handleMuteThread = async (e) => {
        e.stopPropagation();
        try {
            const { data } = await api.post(`/posts/${post.id}/mute-thread`);
            setThreadMuted(data.muted);
            toast.success(data.muted ? "Discussão silenciada" : "Notificações da discussão reativadas");
        } catch (err) { toastApiError(err); }
        close();
    };

    const handleViewers = (e) => {
        e.stopPropagation();
        close();
        setViewersOpen(true);
    };
    const handleTranslate = (e) => {
        e.stopPropagation();
        const txt = encodeURIComponent(post.content || "");
        window.open(`https://translate.google.com/?sl=auto&tl=pt&text=${txt}&op=translate`, "_blank", "noopener");
        toast.success("A abrir tradução no Google");
        close();
    };
    const handleMuteAuthor = (e) => {
        e.stopPropagation();
        muteAuthor(post.author?.username || "alguém");
        close();
    };
    const handleMuteTopic = (e) => {
        e.stopPropagation();
        const tag = firstHashtag(post.content);
        if (!tag) { toast.info("Este post não tem hashtag para silenciar"); }
        else muteTopic(tag);
        close();
    };
    const handleSeeLess = (e) => {
        e.stopPropagation();
        const tag = firstHashtag(post.content) || "este tema";
        seeLessOfTopic(tag); close();
    };
    const handleSeeMore = (e) => {
        e.stopPropagation();
        const tag = firstHashtag(post.content) || "este tema";
        seeMoreOfTopic(tag); close();
    };
    const handleAddCollection = (e) => {
        e.stopPropagation();
        const name = window.prompt("Adicionar a que coleção?", "Inspiração");
        if (name && name.trim()) addToCollection(name.trim(), post.id);
        close();
    };
    const handleNotInterested = (e) => {
        e.stopPropagation();
        toast.success("Não te mostraremos coisas semelhantes");
        close();
    };
    const handleWhy = (e) => {
        e.stopPropagation();
        toast.message(post.reason
            ? `Sugerido porque: ${post.reason.label || post.reason.key}`
            : "Sugerido pela atividade da rede e interesses que indicaste.");
        close();
    };
    const handleBoost = (e) => {
        e.stopPropagation();
        setBoosted(toggleBoost(post.id));
        close();
    };
    const handleNote = (e) => {
        e.stopPropagation();
        const current = getPostNote(post.id) || "";
        const note = window.prompt("Adiciona uma nota privada a este post:", current);
        if (note !== null) setPostNote(post.id, note);
        close();
    };
    const handleConvertStory = (e) => {
        e.stopPropagation();
        convertToStory(post.id);
        close();
    };
    const handleWatch = (e) => {
        e.stopPropagation();
        setWatching(toggleWatchPost(post.id));
        close();
    };

    const ageMin = (Date.now() - new Date(post.created_at).getTime()) / 60000;
    const canEdit = isOwn && ageMin <= 15;

    return (
        <div ref={ref} className="relative">
            <button
                onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
                data-testid={`post-menu-${post.id}`}
                className="text-black/45 hover:text-black p-1.5 rounded-full hover:bg-black/[0.04] transition"
            >
                <MoreHorizontal size={16} strokeWidth={1.7} />
            </button>
            {open && (
                <div
                    onClick={(e) => e.stopPropagation()}
                    className="absolute right-0 top-full mt-1.5 z-30 bg-white border border-black/[0.08] rounded-xl py-1.5 min-w-[230px] max-h-[80vh] overflow-y-auto shadow-[0_20px_50px_-12px_rgba(13,13,16,0.18)] anim-fade-up"
                >
                    {/* === Universal === */}
                    <button onClick={handleCopy} data-testid={`copy-link-${post.id}`} className={itemCls}>
                        <Link2 size={14} strokeWidth={1.6} className="text-black/55" /> Copiar link
                    </button>
                    {post.content && (
                        <button onClick={handleCopyText} data-testid={`copy-text-${post.id}`} className={itemCls}>
                            <Type size={14} strokeWidth={1.6} className="text-black/55" /> Copiar texto
                        </button>
                    )}
                    {post.content && (
                        <button onClick={handleTranslate} data-testid={`translate-${post.id}`} className={itemCls}>
                            <Languages size={14} strokeWidth={1.6} className="text-black/55" /> Traduzir
                        </button>
                    )}
                    <button onClick={handleAddCollection} data-testid={`add-collection-${post.id}`} className={itemCls}>
                        <FolderPlus size={14} strokeWidth={1.6} className="text-black/55" /> Adicionar à coleção
                    </button>
                    <button onClick={handleWatch} data-testid={`watch-${post.id}`} className={itemCls}>
                        {watching ? (
                            <><BellOff size={14} strokeWidth={1.6} className="text-black/55" /> Deixar de seguir post</>
                        ) : (
                            <><Bell size={14} strokeWidth={1.6} className="text-black/55" /> Seguir respostas (Watch)</>
                        )}
                    </button>

                    <div className="hairline-t my-1" />

                    {isOwn && (
                        <>
                            <button onClick={(e) => { e.stopPropagation(); onAnalytics?.(); close(); }} data-testid={`analytics-${post.id}`} className={itemCls}>
                                <BarChart3 size={14} strokeWidth={1.6} className="text-black/55" /> Analytics
                            </button>
                            <button onClick={handleViewers} data-testid={`viewers-${post.id}`} className={itemCls}>
                                <Eye size={14} strokeWidth={1.6} className="text-black/55" /> Ver viewers ({post.views || 0})
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); setCollabOpen(true); close(); }} data-testid={`collab-btn-${post.id}`} className={itemCls}>
                                <Users2 size={14} strokeWidth={1.6} className="text-black/55" /> Colaboradores
                            </button>
                            <button onClick={handlePin} data-testid={`pin-${post.id}`} className={itemCls}>
                                {post.pinned
                                    ? <><PinOff size={14} strokeWidth={1.6} className="text-black/55" /> Desafixar do perfil</>
                                    : <><Pin size={14} strokeWidth={1.6} className="text-black/55" /> Fixar no perfil · Showcase</>}
                            </button>
                            <button onClick={handleBoost} data-testid={`boost-${post.id}`} className={itemCls}>
                                <Sparkles size={14} strokeWidth={1.6} className="text-black/55" /> {boosted ? "Remover boost" : "Boost · destacar 24h"}
                            </button>
                            <button onClick={handleNote} data-testid={`note-${post.id}`} className={itemCls}>
                                <FileText size={14} strokeWidth={1.6} className="text-black/55" /> Adicionar nota privada
                            </button>
                            <button onClick={handleConvertStory} data-testid={`story-${post.id}`} className={itemCls}>
                                <Clock size={14} strokeWidth={1.6} className="text-black/55" /> Converter em story 24h
                            </button>
                            <button onClick={handleConvertRecado} data-testid={`recado-${post.id}`} className={itemCls}>
                                <StickyNote size={14} strokeWidth={1.6} className="text-black/55" /> Converter em recado 24h
                            </button>
                            <button onClick={handleMuteThread} data-testid={`mute-thread-${post.id}`} className={itemCls}>
                                {threadMuted
                                    ? <><Bell size={14} strokeWidth={1.6} className="text-black/55" /> Reativar notificações da discussão</>
                                    : <><BellOff size={14} strokeWidth={1.6} className="text-black/55" /> Silenciar discussão</>}
                            </button>
                            {canEdit && (
                                <button onClick={(e) => { e.stopPropagation(); onEdit?.(); close(); }} data-testid={`edit-post-${post.id}`} className={itemCls}>
                                    <Pencil size={14} strokeWidth={1.6} className="text-black/55" /> Editar
                                </button>
                            )}
                            <div className="hairline-t my-1" />
                            <button onClick={(e) => { e.stopPropagation(); onDelete?.(); close(); }} className="w-full px-4 py-2.5 text-[13px] font-body text-left hover:bg-red-soft-bg text-red-soft flex items-center gap-3 transition">
                                <Trash2 size={14} strokeWidth={1.6} /> Apagar
                            </button>
                        </>
                    )}

                    {!isOwn && (
                        <>
                            <button onClick={handleSeeLess} data-testid={`see-less-${post.id}`} className={itemCls}>
                                <ThumbsDown size={14} strokeWidth={1.6} className="text-black/55" /> Ver menos deste tema
                            </button>
                            <button onClick={handleSeeMore} data-testid={`see-more-${post.id}`} className={itemCls}>
                                <ThumbsUp size={14} strokeWidth={1.6} className="text-black/55" /> Ver mais deste tema
                            </button>
                            <button onClick={handleNotInterested} data-testid={`not-interested-${post.id}`} className={itemCls}>
                                <ThumbsDown size={14} strokeWidth={1.6} className="text-black/55" /> Não interessado
                            </button>
                            <button onClick={handleWhy} data-testid={`why-${post.id}`} className={itemCls}>
                                <BarChart3 size={14} strokeWidth={1.6} className="text-black/55" /> Porque vejo isto?
                            </button>
                            <button onClick={handleMuteThread} data-testid={`mute-thread-${post.id}`} className={itemCls}>
                                {threadMuted
                                    ? <><Bell size={14} strokeWidth={1.6} className="text-black/55" /> Reativar notificações da discussão</>
                                    : <><BellOff size={14} strokeWidth={1.6} className="text-black/55" /> Silenciar discussão</>}
                            </button>
                            <button onClick={handleMuteTopic} data-testid={`mute-topic-${post.id}`} className={itemCls}>
                                <VolumeX size={14} strokeWidth={1.6} className="text-black/55" /> Silenciar tópico
                            </button>
                            <button onClick={handleMuteAuthor} data-testid={`mute-author-${post.id}`} className={itemCls}>
                                <VolumeX size={14} strokeWidth={1.6} className="text-black/55" /> Silenciar @{post.author?.username}
                            </button>
                            <div className="hairline-t my-1" />
                            <button onClick={handleReport} data-testid={`report-${post.id}`} className={itemCls}>
                                <Flag size={14} strokeWidth={1.6} className="text-black/55" /> Reportar
                            </button>
                        </>
                    )}
                </div>
            )}
            {collabOpen && <CollabModal postId={post.id} onClose={() => setCollabOpen(false)} />}
            {viewersOpen && <ViewersModal postId={post.id} onClose={() => setViewersOpen(false)} />}
            {reportOpen && (
                <ReportModal
                    targetLabel={`Publicação de @${post.author?.username || "alguém"}`}
                    onCancel={() => setReportOpen(false)}
                    onSubmit={submitReport}
                />
            )}
        </div>
    );
}
