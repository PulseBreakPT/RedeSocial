import { useEffect, useRef, useState } from "react";
import {
    MoreHorizontal, Trash2, Pencil, Pin, PinOff, Flag, Link2, Type,
    Users2, VolumeX, Bell, BellOff,
    FileText, Clock, Send, Code, FolderPlus, MoonStar, BarChart3,
} from "lucide-react";
import { api, toastApiError } from "../lib/api";
import { toast } from "sonner";
import { promptDialog } from "./ConfirmDialog";
import { CollabModal } from "./CollabModal";
import { ReportModal } from "./ReportModal";
import { EmbedModal } from "./EmbedModal";
import { SendToDMPicker } from "./SendToDMPicker";
import {
    muteAuthor,
    setPostNote, getPostNote,
    convertToStory,
    toggleWatchPost, isWatchingPost, dismissPost,
    addToCollection,
} from "../lib/interestSignals";
import { snoozeAuthor } from "../lib/uiPrefs";

const itemCls = "w-full px-3.5 py-2.5 text-[13px] font-body text-left flex items-center gap-3 text-black/85 hover:bg-black/[0.05] active:bg-black/[0.08] transition-colors duration-150 rounded-lg";
const itemClsDanger = "w-full px-3.5 py-2.5 text-[13px] font-body text-left flex items-center gap-3 text-red-soft hover:bg-red-soft-bg active:bg-red-soft-bg transition-colors duration-150 rounded-lg";
const iconCls = "text-black/55";

export function PostMenu({ post, isOwn, onEdit, onDelete, onPinToggle, onAnalytics, externallyOpen = null, onExternallyClose }) {
    const [open, setOpen] = useState(false);
    const [collabOpen, setCollabOpen] = useState(false);
    const [reportOpen, setReportOpen] = useState(false);
    const [embedOpen, setEmbedOpen] = useState(false);
    const [dmOpen, setDmOpen] = useState(false);
    const [watching, setWatching] = useState(() => isWatchingPost(post.id));
    const [threadMuted, setThreadMuted] = useState(false);
    const ref = useRef(null);

    // Programmatic open (used by PostCard long-press on mobile)
    useEffect(() => {
        if (externallyOpen === null) return;
        setOpen(!!externallyOpen);
    }, [externallyOpen]);
    useEffect(() => {
        if (!open && externallyOpen) onExternallyClose?.();
    }, [open, externallyOpen, onExternallyClose]);

    useEffect(() => {
        const close = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        };
        const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
        document.addEventListener("mousedown", close);
        document.addEventListener("keydown", onKey);
        return () => {
            document.removeEventListener("mousedown", close);
            document.removeEventListener("keydown", onKey);
        };
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

    const handleMuteThread = async (e) => {
        e.stopPropagation();
        try {
            const { data } = await api.post(`/posts/${post.id}/mute-thread`);
            setThreadMuted(data.muted);
            toast.success(data.muted ? "Discussão silenciada" : "Notificações da discussão reativadas");
        } catch (err) { toastApiError(err); }
        close();
    };

    const handleMuteAuthor = async (e) => {
        e.stopPropagation();
        await muteAuthor(post.author?.username || "");
        close();
    };

    const handleNotInterested = async (e) => {
        e.stopPropagation();
        close();
        const ok = await dismissPost(post.id);
        if (ok) onDelete?.(post.id);
    };

    const handleSnooze = async (e) => {
        e.stopPropagation();
        close();
        const u = post.author?.username;
        if (!u) return;
        if (snoozeAuthor(u, 30)) {
            toast.success(`@${u} pausado durante 30 dias`);
            onDelete?.(post.id);
        }
    };

    const handleSendDM = (e) => {
        e.stopPropagation();
        close();
        setDmOpen(true);
    };

    const handleEmbed = (e) => {
        e.stopPropagation();
        close();
        setEmbedOpen(true);
    };

    const handleAddToCollection = async (e) => {
        e.stopPropagation();
        close();
        const name = await promptDialog({
            title: "Adicionar a coleção",
            description: "Escreve o nome da coleção (ou deixa em branco para os guardados gerais).",
            label: "Coleção",
            placeholder: "Ex: Lisboa, Receitas, Inspirações…",
            defaultValue: "",
            maxLength: 60,
            required: false,
            confirmText: "Adicionar",
        });
        if (name === null) return;
        await addToCollection(name.trim() || null, post.id);
    };

    const handleAnalytics = (e) => {
        e.stopPropagation();
        close();
        onAnalytics?.();
    };

    const handleNote = async (e) => {
        e.stopPropagation();
        const current = getPostNote(post.id) || "";
        close();
        const note = await promptDialog({
            title: "Nota privada",
            description: "Esta nota fica visível apenas para ti.",
            label: "Nota",
            placeholder: "Ex: Voltar a ler este artigo",
            defaultValue: current,
            multiline: true,
            maxLength: 280,
            required: false,
            confirmText: "Guardar nota",
        });
        if (note === null) return;
        await setPostNote(post.id, note);
    };

    const handleConvertStory = async (e) => {
        e.stopPropagation();
        close();
        const img = (post.images && post.images[0]) || post.image;
        if (!img) {
            toast.error("Este post não tem imagem — só posts com imagem podem virar story");
            return;
        }
        await convertToStory({ image: img, content: post.content || "" });
    };

    const handleWatch = async (e) => {
        e.stopPropagation();
        const next = await toggleWatchPost(post.id);
        setWatching(next);
        close();
    };

    const ageMin = (Date.now() - new Date(post.created_at).getTime()) / 60000;
    const canEdit = isOwn && ageMin <= 15;

    return (
        <div ref={ref} className="relative">
            <button
                onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
                data-testid={`post-menu-${post.id}`}
                aria-haspopup="menu"
                aria-expanded={open}
                aria-label="Mais opções"
                className={`p-1.5 rounded-full transition-colors duration-150 ${open ? "bg-black/[0.06] text-black" : "text-black/45 hover:text-black hover:bg-black/[0.04]"}`}
            >
                <MoreHorizontal size={16} strokeWidth={1.7} />
            </button>
            {open && (
                <div
                    onClick={(e) => e.stopPropagation()}
                    role="menu"
                    className="post-menu-pop absolute right-0 top-full mt-2 z-50 bg-white border border-black/[0.06] rounded-2xl py-1.5 min-w-[240px] max-w-[280px] overflow-hidden anim-fade-up"
                    style={{
                        boxShadow:
                            "0 1px 2px rgba(13,13,16,0.04), 0 8px 16px -4px rgba(13,13,16,0.08), 0 24px 56px -16px rgba(13,13,16,0.22)",
                    }}
                >
                    <div className="px-1">
                        <button onClick={handleCopy} data-testid={`copy-link-${post.id}`} className={itemCls} role="menuitem">
                            <Link2 size={15} strokeWidth={1.7} className={iconCls} /> Copiar link
                        </button>
                        {post.content && (
                            <button onClick={handleCopyText} data-testid={`copy-text-${post.id}`} className={itemCls} role="menuitem">
                                <Type size={15} strokeWidth={1.7} className={iconCls} /> Copiar texto
                            </button>
                        )}
                        <button onClick={handleSendDM} data-testid={`send-dm-${post.id}`} className={itemCls} role="menuitem">
                            <Send size={15} strokeWidth={1.7} className={iconCls} /> Enviar por mensagem
                        </button>
                        <button onClick={handleAddToCollection} data-testid={`collection-${post.id}`} className={itemCls} role="menuitem">
                            <FolderPlus size={15} strokeWidth={1.7} className={iconCls} /> Adicionar a coleção
                        </button>
                        <button onClick={handleEmbed} data-testid={`embed-${post.id}`} className={itemCls} role="menuitem">
                            <Code size={15} strokeWidth={1.7} className={iconCls} /> Incorporar publicação
                        </button>
                        <button onClick={handleWatch} data-testid={`watch-${post.id}`} className={itemCls} role="menuitem">
                            {watching ? (
                                <><BellOff size={15} strokeWidth={1.7} className={iconCls} /> Deixar de seguir post</>
                            ) : (
                                <><Bell size={15} strokeWidth={1.7} className={iconCls} /> Seguir respostas</>
                            )}
                        </button>
                    </div>

                    {isOwn && (
                        <>
                            <div className="post-menu-divider" />
                            <div className="px-1">
                                <button onClick={(e) => { e.stopPropagation(); setCollabOpen(true); close(); }} data-testid={`collab-btn-${post.id}`} className={itemCls} role="menuitem">
                                    <Users2 size={15} strokeWidth={1.7} className={iconCls} /> Colaboradores
                                </button>
                                <button onClick={handlePin} data-testid={`pin-${post.id}`} className={itemCls} role="menuitem">
                                    {post.pinned
                                        ? <><PinOff size={15} strokeWidth={1.7} className={iconCls} /> Desafixar do perfil</>
                                        : <><Pin size={15} strokeWidth={1.7} className={iconCls} /> Fixar no perfil</>}
                                </button>
                                <button onClick={handleNote} data-testid={`note-${post.id}`} className={itemCls} role="menuitem">
                                    <FileText size={15} strokeWidth={1.7} className={iconCls} /> Adicionar nota privada
                                </button>
                                <button onClick={handleConvertStory} data-testid={`story-${post.id}`} className={itemCls} role="menuitem">
                                    <Clock size={15} strokeWidth={1.7} className={iconCls} /> Converter em story 24h
                                </button>
                                {onAnalytics && (
                                    <button onClick={handleAnalytics} data-testid={`analytics-${post.id}`} className={itemCls} role="menuitem">
                                        <BarChart3 size={15} strokeWidth={1.7} className={iconCls} /> Ver estatísticas
                                    </button>
                                )}
                                <button onClick={handleMuteThread} data-testid={`mute-thread-${post.id}`} className={itemCls} role="menuitem">
                                    {threadMuted
                                        ? <><Bell size={15} strokeWidth={1.7} className={iconCls} /> Reativar notificações</>
                                        : <><BellOff size={15} strokeWidth={1.7} className={iconCls} /> Silenciar discussão</>}
                                </button>
                                {canEdit && (
                                    <button onClick={(e) => { e.stopPropagation(); onEdit?.(); close(); }} data-testid={`edit-post-${post.id}`} className={itemCls} role="menuitem">
                                        <Pencil size={15} strokeWidth={1.7} className={iconCls} /> Editar
                                    </button>
                                )}
                            </div>
                            <div className="post-menu-divider" />
                            <div className="px-1">
                                <button onClick={(e) => { e.stopPropagation(); onDelete?.(); close(); }} className={itemClsDanger} role="menuitem">
                                    <Trash2 size={15} strokeWidth={1.7} /> Apagar
                                </button>
                            </div>
                        </>
                    )}

                    {!isOwn && (
                        <>
                            <div className="post-menu-divider" />
                            <div className="px-1">
                                <button onClick={handleNotInterested} data-testid={`not-interested-${post.id}`} className={itemCls} role="menuitem">
                                    <VolumeX size={15} strokeWidth={1.7} className={iconCls} /> Não interessado
                                </button>
                                <button onClick={handleMuteThread} data-testid={`mute-thread-${post.id}`} className={itemCls} role="menuitem">
                                    {threadMuted
                                        ? <><Bell size={15} strokeWidth={1.7} className={iconCls} /> Reativar notificações</>
                                        : <><BellOff size={15} strokeWidth={1.7} className={iconCls} /> Silenciar discussão</>}
                                </button>
                                <button onClick={handleMuteAuthor} data-testid={`mute-author-${post.id}`} className={itemCls} role="menuitem">
                                    <VolumeX size={15} strokeWidth={1.7} className={iconCls} /> Silenciar @{post.author?.username}
                                </button>
                                <button onClick={handleSnooze} data-testid={`snooze-${post.id}`} className={itemCls} role="menuitem">
                                    <MoonStar size={15} strokeWidth={1.7} className={iconCls} /> Pausar @{post.author?.username} 30 dias
                                </button>
                            </div>
                            <div className="post-menu-divider" />
                            <div className="px-1">
                                <button onClick={handleReport} data-testid={`report-${post.id}`} className={itemClsDanger} role="menuitem">
                                    <Flag size={15} strokeWidth={1.7} /> Reportar
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}
            {collabOpen && <CollabModal postId={post.id} onClose={() => setCollabOpen(false)} />}
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
