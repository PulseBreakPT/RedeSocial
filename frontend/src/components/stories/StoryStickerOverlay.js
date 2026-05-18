import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, Clock, ExternalLink } from "lucide-react";
import { api, toastApiError } from "../../lib/api";
import "./stories.css";

/** Wrapper que posiciona um sticker no canvas do story (0..1 normalizado). */
function StickerWrap({ sticker, children, onClick, isAuthor }) {
    const style = {
        position: "absolute",
        left: `${sticker.x * 100}%`,
        top: `${sticker.y * 100}%`,
        transform: `translate(-50%, -50%) rotate(${sticker.rotation || 0}deg) scale(${sticker.scale || 1})`,
        zIndex: 25,
        maxWidth: "82%",
    };
    return (
        <div
            style={style}
            onClick={(e) => { e.stopPropagation(); onClick?.(e); }}
            onPointerDown={(e) => e.stopPropagation()}
            onPointerMove={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            data-testid={`story-sticker-${sticker.type}-${sticker.id}`}
            data-author={isAuthor ? "true" : "false"}
            data-no-drag
        >
            {children}
        </div>
    );
}

/** Poll: barras animadas a preencher; winner com glow. */
function PollSticker({ story, sticker, isAuthor, onUpdate }) {
    const [busy, setBusy] = useState(false);
    const results = sticker.results || { options: sticker.data?.options || [], total: 0, viewer_vote: null };
    const showResults = isAuthor || results.viewer_vote !== null;
    const winnerId = showResults && results.options.length > 0
        ? results.options.reduce((a, b) => ((a.pct || 0) >= (b.pct || 0) ? a : b)).id
        : null;

    const vote = async (option_id) => {
        if (isAuthor || busy) return;
        setBusy(true);
        try {
            const r = await api.post(`/stories/${story.id}/poll-vote`, { sticker_id: sticker.id, option_id });
            onUpdate?.(r.data.sticker);
            if (navigator.vibrate) navigator.vibrate(15);
        } catch (e) { toastApiError(e); }
        finally { setBusy(false); }
    };
    return (
        <StickerWrap sticker={sticker} isAuthor={isAuthor}>
            <div className="sv-sticker-glass rounded-2xl p-3 min-w-[220px]">
                <div className="text-[12px] font-heading font-semibold text-black/85 mb-2 text-center tracking-tight">
                    {sticker.data?.question}
                </div>
                <div className="space-y-1.5">
                    {results.options.map((opt) => {
                        const isWinner = opt.id === winnerId && (opt.pct || 0) > 0;
                        const myVote = results.viewer_vote === opt.id;
                        return (
                            <button
                                key={opt.id}
                                disabled={isAuthor || busy}
                                onClick={() => vote(opt.id)}
                                className={`w-full relative overflow-hidden rounded-xl px-3 py-2 text-[13px] font-medium transition ${
                                    myVote
                                        ? "bg-black text-white"
                                        : showResults
                                            ? "bg-black/[0.05] text-black/80"
                                            : "bg-black/[0.06] text-black hover:bg-black/[0.12]"
                                } ${isWinner ? "sv-poll-winner" : ""}`}
                                data-testid={`poll-option-${opt.id}`}
                            >
                                {showResults && (
                                    <div
                                        className="sv-poll-bar absolute inset-y-0 left-0 bg-gradient-to-r from-coral/40 to-coral/25"
                                        style={{ width: `${opt.pct || 0}%` }}
                                    />
                                )}
                                <div className="relative flex items-center justify-between gap-2">
                                    <span className="truncate">{opt.text}</span>
                                    {showResults && (
                                        <span className="font-mono text-[11px] tabular-nums opacity-85">{opt.pct || 0}%</span>
                                    )}
                                </div>
                            </button>
                        );
                    })}
                </div>
                {showResults && (
                    <div className="mt-2 text-center text-[10px] font-mono uppercase tracking-[0.14em] text-black/45">
                        {results.total} {results.total === 1 ? "voto" : "votos"}
                    </div>
                )}
            </div>
        </StickerWrap>
    );
}

/** Question: tap opens inline input. */
function QuestionSticker({ story, sticker, isAuthor, onUpdate, onPause }) {
    const [open, setOpen] = useState(false);
    const [value, setValue] = useState("");
    const [busy, setBusy] = useState(false);
    const submit = async () => {
        const v = value.trim();
        if (!v) return;
        setBusy(true);
        try {
            await api.post(`/stories/${story.id}/question-answer`, { sticker_id: sticker.id, content: v });
            setOpen(false);
            setValue("");
            onUpdate?.({ ...sticker, viewer_answered: true, answers_count: (sticker.answers_count || 0) + 1 });
            if (navigator.vibrate) navigator.vibrate(20);
            onPause?.(false);
        } catch (e) { toastApiError(e); }
        finally { setBusy(false); }
    };
    return (
        <StickerWrap sticker={sticker} isAuthor={isAuthor}
            onClick={() => { if (!isAuthor && !sticker.viewer_answered) { setOpen(true); onPause?.(true); } }}>
            <div className="sv-sticker-glass rounded-2xl px-4 py-3 min-w-[240px]">
                <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-black/45 mb-1">Pergunta</div>
                <div className="text-[14px] font-display tracking-tight text-black/90 leading-tight">
                    {sticker.data?.prompt}
                </div>
                {!isAuthor && !open && (
                    <div className="mt-2 text-[11px] font-mono text-coral-deep font-semibold">
                        {sticker.viewer_answered ? "✓ Já respondeste" : "Toca para responder"}
                    </div>
                )}
                {isAuthor && (
                    <div className="mt-2 text-[11px] font-mono text-black/50">
                        {sticker.answers_count || 0} {sticker.answers_count === 1 ? "resposta" : "respostas"}
                    </div>
                )}
                {open && (
                    <div className="mt-2 flex items-center gap-1.5">
                        <input
                            autoFocus
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
                            placeholder={sticker.data?.placeholder || "..."}
                            className="flex-1 rounded-full bg-black/[0.06] px-3 py-1.5 text-[12.5px] outline-none focus:bg-black/[0.10]"
                            data-testid={`q-input-${sticker.id}`}
                        />
                        <button onClick={submit} disabled={busy} className="px-3 py-1.5 rounded-full bg-black text-white text-[11px] font-mono uppercase tracking-wider hover:bg-coral disabled:opacity-50">
                            Enviar
                        </button>
                    </div>
                )}
            </div>
        </StickerWrap>
    );
}

/** Slider: drag with glowing thumb. */
function SliderSticker({ story, sticker, isAuthor, onUpdate, onPause }) {
    const [value, setValue] = useState(sticker.viewer_value ?? 0.5);
    const [committed, setCommitted] = useState(sticker.viewer_value != null);
    const [busy, setBusy] = useState(false);
    useEffect(() => {
        setValue(sticker.viewer_value ?? 0.5);
        setCommitted(sticker.viewer_value != null);
    }, [sticker.viewer_value]);
    const submit = async (v) => {
        if (isAuthor) return;
        setBusy(true);
        try {
            const r = await api.post(`/stories/${story.id}/slider-response`, { sticker_id: sticker.id, value: v });
            setCommitted(true);
            onUpdate?.(r.data.sticker);
            if (navigator.vibrate) navigator.vibrate([10, 30, 10]);
            onPause?.(false);
        } catch (e) { toastApiError(e); }
        finally { setBusy(false); }
    };
    const pct = Math.round(value * 100);
    return (
        <StickerWrap sticker={sticker} isAuthor={isAuthor} onClick={() => onPause?.(true)}>
            <div className="sv-sticker-glass rounded-2xl px-4 py-3 min-w-[260px]">
                <div className="text-[13px] font-heading font-medium text-black/85 text-center mb-2 tracking-tight">
                    {sticker.data?.prompt}
                </div>
                <div className="relative h-10 rounded-full bg-black/[0.06] overflow-hidden">
                    <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-coral to-coral-deep transition-all" style={{ width: `${pct}%` }} />
                    <input
                        type="range" min={0} max={100} value={pct}
                        disabled={isAuthor}
                        onChange={(e) => setValue(parseInt(e.target.value, 10) / 100)}
                        onMouseUp={() => submit(value)}
                        onTouchEnd={() => submit(value)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        data-testid={`slider-input-${sticker.id}`}
                    />
                    <div className="absolute inset-y-0 left-0 flex items-center pointer-events-none transition-all"
                         style={{ left: `calc(${pct}% - 14px)` }}>
                        <div className="sv-slider-thumb text-[24px]">{sticker.data?.emoji || "🔥"}</div>
                    </div>
                </div>
                {isAuthor ? (
                    <div className="mt-2 text-center text-[11px] font-mono text-black/55">
                        Média: {sticker.average != null ? Math.round(sticker.average * 100) + "%" : "—"} · {sticker.responses_count || 0} respostas
                    </div>
                ) : (
                    <div className="mt-2 text-center text-[11px] font-mono text-black/55">
                        {busy ? "A guardar…" : committed ? `Tu: ${pct}%` : "Arrasta para responder"}
                    </div>
                )}
            </div>
        </StickerWrap>
    );
}

function MentionSticker({ sticker, isAuthor }) {
    const username = sticker.data?.username;
    return (
        <StickerWrap sticker={sticker} isAuthor={isAuthor}>
            <Link
                to={`/u/${username}`}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full sv-sticker-glass text-[13px] font-heading font-medium tracking-tight text-black/90 hover:bg-coral hover:text-white transition"
            >
                <span className="text-coral">@</span>{username}
            </Link>
        </StickerWrap>
    );
}

function HashtagSticker({ sticker, isAuthor }) {
    const tag = sticker.data?.tag;
    return (
        <StickerWrap sticker={sticker} isAuthor={isAuthor}>
            <Link
                to={`/tag/${tag}`}
                className="inline-flex items-center gap-0.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-coral to-coral-deep text-white shadow-lg text-[13px] font-heading font-semibold tracking-tight hover:scale-105 transition"
            >
                <span>#</span>{tag}
            </Link>
        </StickerWrap>
    );
}

function LocationSticker({ sticker, isAuthor }) {
    return (
        <StickerWrap sticker={sticker} isAuthor={isAuthor}>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full sv-sticker-glass text-[13px] font-heading font-medium tracking-tight text-black/90">
                <MapPin size={13} className="text-coral" strokeWidth={2.4} />
                {sticker.data?.place}
            </div>
        </StickerWrap>
    );
}

/** Countdown with flip animation per second */
function CountdownSticker({ sticker, isAuthor }) {
    const [now, setNow] = useState(Date.now());
    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(id);
    }, []);
    const ends = new Date(sticker.data?.ends_at || 0).getTime();
    let diff = Math.max(0, Math.floor((ends - now) / 1000));
    const d = Math.floor(diff / 86400); diff -= d * 86400;
    const h = Math.floor(diff / 3600); diff -= h * 3600;
    const m = Math.floor(diff / 60);   diff -= m * 60;
    const s = diff;
    const expired = ends <= now;
    return (
        <StickerWrap sticker={sticker} isAuthor={isAuthor}>
            <div className="rounded-2xl bg-black/90 backdrop-blur-xl shadow-xl border border-white/10 px-4 py-2.5 text-white text-center min-w-[200px]">
                <div className="text-[10px] font-mono uppercase tracking-[0.18em] text-white/55 flex items-center justify-center gap-1">
                    <Clock size={11} strokeWidth={2.2} />
                    {sticker.data?.title}
                </div>
                {expired ? (
                    <div className="mt-1 font-display text-[18px] tracking-tight">Terminou ✨</div>
                ) : (
                    <div className="mt-1 font-display text-[20px] tracking-tight tabular-nums flex items-center justify-center gap-0.5">
                        {d > 0 && <FlipDigit value={`${d}d`} keyVal={`d-${d}`} />}
                        <FlipDigit value={String(h).padStart(2, "0")} keyVal={`h-${h}`} />
                        <span className="opacity-60">:</span>
                        <FlipDigit value={String(m).padStart(2, "0")} keyVal={`m-${m}`} />
                        <span className="opacity-60">:</span>
                        <FlipDigit value={String(s).padStart(2, "0")} keyVal={`s-${s}`} />
                    </div>
                )}
            </div>
        </StickerWrap>
    );
}

function FlipDigit({ value, keyVal }) {
    return <span className="sv-flip-digit" key={keyVal}>{value}</span>;
}

function LinkSticker({ sticker, isAuthor }) {
    return (
        <StickerWrap sticker={sticker} isAuthor={isAuthor}>
            <a
                href={sticker.data?.url}
                target="_blank" rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full sv-sticker-glass text-[13px] font-heading font-medium tracking-tight text-black/90 hover:bg-coral hover:text-white transition"
            >
                <ExternalLink size={12} strokeWidth={2.4} />
                {sticker.data?.label || "Saber mais"}
            </a>
        </StickerWrap>
    );
}

function MusicSticker({ sticker, isAuthor }) {
    return (
        <StickerWrap sticker={sticker} isAuthor={isAuthor}>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full sv-sticker-glass text-[13px] font-heading font-medium tracking-tight text-black/90 max-w-[260px]">
                <span className="sv-eq text-coral"><span /><span /><span /><span /></span>
                <span className="truncate">
                    <span className="font-semibold">{sticker.data?.title}</span>
                    {sticker.data?.artist && <span className="text-black/55"> · {sticker.data.artist}</span>}
                </span>
            </div>
        </StickerWrap>
    );
}

export function StoryStickerOverlay({ story, isAuthor, onPause, onUpdateSticker }) {
    if (!story.stickers?.length) return null;
    return (
        <>
            {story.stickers.map((s) => {
                const common = { key: s.id, story, sticker: s, isAuthor, onPause };
                const handleUpdate = (newSticker) => {
                    onUpdateSticker?.(s.id, newSticker);
                };
                switch (s.type) {
                    case "poll":      return <PollSticker      {...common} onUpdate={handleUpdate} />;
                    case "question":  return <QuestionSticker  {...common} onUpdate={handleUpdate} />;
                    case "slider":    return <SliderSticker    {...common} onUpdate={handleUpdate} />;
                    case "mention":   return <MentionSticker   key={s.id} sticker={s} isAuthor={isAuthor} />;
                    case "hashtag":   return <HashtagSticker   key={s.id} sticker={s} isAuthor={isAuthor} />;
                    case "location":  return <LocationSticker  key={s.id} sticker={s} isAuthor={isAuthor} />;
                    case "countdown": return <CountdownSticker key={s.id} sticker={s} isAuthor={isAuthor} />;
                    case "link":      return <LinkSticker      key={s.id} sticker={s} isAuthor={isAuthor} />;
                    case "music":     return <MusicSticker     key={s.id} sticker={s} isAuthor={isAuthor} />;
                    default: return null;
                }
            })}
        </>
    );
}
