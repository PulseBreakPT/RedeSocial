import { useEffect, useState } from "react";
import { Plus, X, VolumeX, MoonStar, Hash } from "lucide-react";
import {
    listMutedWords, addMutedWord, removeMutedWord,
    listSnoozedAuthors, unsnoozeAuthor,
    isZenMode, setZenMode,
} from "../lib/uiPrefs";
import { toast } from "sonner";

/**
 * MutePreferences — settings panel for client-side filters:
 *   • Modo Zen (hide engagement counts)
 *   • Palavras silenciadas (regex-free, simple includes)
 *   • Autores pausados 30 dias (snooze)
 *
 * All state is persisted in localStorage by /lib/uiPrefs and shared
 * via "lusorae:*-changed" custom events so other surfaces react.
 */
export function MutePreferences() {
    const [words, setWords] = useState(() => listMutedWords());
    const [snoozed, setSnoozed] = useState(() => listSnoozedAuthors());
    const [zen, setZen] = useState(() => isZenMode());
    const [draft, setDraft] = useState("");

    useEffect(() => {
        const refresh = () => {
            setWords(listMutedWords());
            setSnoozed(listSnoozedAuthors());
            setZen(isZenMode());
        };
        window.addEventListener("lusorae:snooze-changed", refresh);
        window.addEventListener("lusorae:muted-words-changed", refresh);
        window.addEventListener("lusorae:zen-changed", refresh);
        return () => {
            window.removeEventListener("lusorae:snooze-changed", refresh);
            window.removeEventListener("lusorae:muted-words-changed", refresh);
            window.removeEventListener("lusorae:zen-changed", refresh);
        };
    }, []);

    const addWord = (e) => {
        e?.preventDefault?.();
        const w = draft.trim().toLowerCase();
        if (!w) return;
        if (w.length > 40) { toast.error("Palavra demasiado longa"); return; }
        if (addMutedWord(w)) {
            setDraft("");
            toast.success(`"${w}" silenciada`);
        }
    };

    const formatUntil = (ts) => {
        const days = Math.max(1, Math.round((ts - Date.now()) / (24 * 60 * 60 * 1000)));
        return `${days} ${days === 1 ? "dia" : "dias"}`;
    };

    return (
        <div className="space-y-8" data-testid="mute-preferences">
            {/* Zen mode */}
            <section>
                <header className="flex items-end justify-between gap-3 mb-3">
                    <div>
                        <p className="type-overline">Conforto</p>
                        <h3 className="font-heading text-[18px] font-semibold tracking-tight text-black">Modo Zen</h3>
                        <p className="text-[13px] text-black/65 leading-relaxed mt-0.5">
                            Esconde contagens de gostos, partilhas e visualizações. Concentra-te no conteúdo.
                        </p>
                    </div>
                    <button
                        onClick={() => { setZenMode(!zen); setZen(!zen); }}
                        role="switch"
                        aria-checked={zen}
                        data-testid="zen-mode-toggle"
                        className={`relative w-12 h-7 rounded-full transition-colors flex-shrink-0 ${zen ? "bg-black" : "bg-black/[0.12]"}`}
                    >
                        <span
                            className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow transition-transform ${zen ? "translate-x-5" : ""}`}
                        />
                    </button>
                </header>
            </section>

            {/* Muted words */}
            <section>
                <header className="mb-3">
                    <p className="type-overline">Silenciar conteúdo</p>
                    <h3 className="font-heading text-[18px] font-semibold tracking-tight text-black">Palavras silenciadas</h3>
                    <p className="text-[13px] text-black/65 leading-relaxed mt-0.5">
                        Publicações que contenham estas palavras desaparecem do teu feed. Filtro local; ninguém é notificado.
                    </p>
                </header>
                <form onSubmit={addWord} className="flex gap-2 mb-3">
                    <label className="relative flex-1">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40">
                            <Hash size={14} strokeWidth={1.8} />
                        </span>
                        <input
                            type="text"
                            value={draft}
                            onChange={(e) => setDraft(e.target.value)}
                            placeholder="palavra ou expressão"
                            maxLength={40}
                            data-testid="mute-word-input"
                            className="w-full bg-[#fafafa] border border-black/[0.08] rounded-2xl pl-9 pr-3 py-2.5 text-[13.5px] focus:bg-white focus:border-black/30 focus:outline-none transition"
                        />
                    </label>
                    <button
                        type="submit"
                        disabled={!draft.trim()}
                        data-testid="mute-word-add-btn"
                        className="btn-obsidian text-[11px] px-4 py-2 disabled:opacity-40 inline-flex items-center gap-1.5"
                    >
                        <Plus size={11} /> Adicionar
                    </button>
                </form>
                {words.length === 0 ? (
                    <p className="text-[12px] font-mono uppercase tracking-[0.14em] text-black/40">
                        Sem palavras silenciadas
                    </p>
                ) : (
                    <ul className="flex flex-wrap gap-1.5">
                        {words.map((w) => (
                            <li key={w}>
                                <button
                                    onClick={() => { removeMutedWord(w); toast.success(`"${w}" reativada`); }}
                                    className="group inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/[0.05] hover:bg-red-soft hover:text-white text-[12px] font-mono text-black/70 transition tap-shrink"
                                    title={`Remover "${w}"`}
                                >
                                    {w}
                                    <X size={10} strokeWidth={2} className="opacity-50 group-hover:opacity-100" />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            {/* Snoozed authors */}
            <section>
                <header className="mb-3">
                    <p className="type-overline">Pausar autores</p>
                    <h3 className="font-heading text-[18px] font-semibold tracking-tight text-black">Autores em pausa</h3>
                    <p className="text-[13px] text-black/65 leading-relaxed mt-0.5">
                        Posts destes autores ficam ocultos durante 30 dias. Eles não são notificados.
                    </p>
                </header>
                {snoozed.length === 0 ? (
                    <p className="text-[12px] font-mono uppercase tracking-[0.14em] text-black/40">
                        Sem autores em pausa
                    </p>
                ) : (
                    <ul className="space-y-1">
                        {snoozed.map(({ username, until }) => (
                            <li
                                key={username}
                                className="flex items-center gap-3 px-3 py-2 rounded-xl bg-black/[0.03] hover:bg-black/[0.06] transition"
                            >
                                <MoonStar size={14} strokeWidth={1.8} className="text-black/50 flex-shrink-0" />
                                <span className="font-mono text-[13px] text-black/80 flex-1 truncate">@{username}</span>
                                <span className="font-mono text-[11px] text-black/45 tabular-nums">{formatUntil(until)}</span>
                                <button
                                    onClick={() => { unsnoozeAuthor(username); toast.success(`@${username} reativado`); }}
                                    className="text-[10px] font-mono uppercase tracking-[0.14em] text-black/55 hover:text-black px-2 py-1 rounded-full hover:bg-white tap-shrink transition"
                                >
                                    Reativar
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </div>
    );
}
