import { useEffect, useState } from "react";
import { Loader2, Lock, Trophy } from "lucide-react";
import { api } from "../lib/api";

// Charms progress panel — shows locked charms with progress bars
export function CharmsProgressPanel({ username }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        let alive = true;
        api.get(`/users/${username}/charms-progress`).then((r) => {
            if (alive) { setData(r.data); setLoading(false); }
        }).catch(() => setLoading(false));
        return () => { alive = false; };
    }, [username]);

    if (loading) return <div className="text-xs font-mono text-black/40 py-2"><Loader2 size={11} className="animate-spin inline" /> A carregar progresso…</div>;
    if (!data) return null;

    const unlockedSet = new Set(data.unlocked_keys || []);
    const locked = (data.catalog || []).filter((c) => !unlockedSet.has(c.key));
    const unlocked = (data.catalog || []).filter((c) => unlockedSet.has(c.key));

    return (
        <div className="rounded-2xl border border-black/[0.08] bg-white p-4" data-testid="charms-progress-panel">
            <div className="flex items-center gap-1.5 mb-3">
                <Trophy size={13} className="text-amber-500" />
                <span className="font-heading font-semibold text-xs uppercase tracking-wider text-black/55">Trophy Case</span>
                <span className="text-[10px] font-mono text-black/40 ml-auto">{unlocked.length}/{data.catalog.length}</span>
            </div>
            {unlocked.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-4">
                    {unlocked.map((c) => (
                        <div
                            key={c.key}
                            className="flex flex-col items-center gap-1 p-2 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200"
                            title={c.desc}
                            data-testid={`charm-unlocked-${c.key}`}
                        >
                            <div className="text-2xl">{c.emoji}</div>
                            <div className="text-[10px] font-mono text-black/70 text-center truncate w-full">{c.label}</div>
                        </div>
                    ))}
                </div>
            )}
            <h4 className="text-[10px] font-mono uppercase tracking-wider text-black/40 mb-2">Por desbloquear</h4>
            <div className="space-y-1.5">
                {locked.map((c) => {
                    const p = data.progress[c.key] || { current: 0, target: 1, progress: 0 };
                    const pct = Math.round(p.progress * 100);
                    return (
                        <div
                            key={c.key}
                            className="flex items-center gap-2 p-1.5 rounded-lg bg-black/[0.02]"
                            data-testid={`charm-locked-${c.key}`}
                        >
                            <div className="grid place-items-center w-7 h-7 rounded-lg bg-black/[0.05] grayscale opacity-60">
                                <span className="text-base">{c.emoji}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-[11px] font-heading font-semibold text-black/65 truncate">{c.label}</span>
                                    <span className="text-[10px] font-mono text-black/40 flex-shrink-0">{p.current}/{p.target}</span>
                                </div>
                                <div className="w-full h-1 rounded-full bg-black/10 overflow-hidden mt-0.5">
                                    <div
                                        className="h-full bg-gradient-to-r from-orange-400 to-pink-500"
                                        style={{ width: `${pct}%` }}
                                    />
                                </div>
                            </div>
                            <Lock size={10} className="text-black/30" />
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
