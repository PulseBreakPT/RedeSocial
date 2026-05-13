import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { TrendingUp, Hash } from "lucide-react";
import { api } from "../lib/api";

export default function Trending() {
    const [tags, setTags] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get("/trending").then((r) => {
            setTags(r.data);
            setLoading(false);
        });
    }, []);

    return (
        <div data-testid="trending-page">
            <div className="sticky top-0 z-30 glass border-b border-zinc-900 px-5 py-4">
                <h1 className="font-heading text-xl font-bold tracking-tight flex items-center gap-2">
                    <TrendingUp size={20} className="text-accent-vermillion" /> Tendências
                </h1>
                <p className="font-mono text-xs text-zinc-500 mt-0.5">o que está em alta</p>
            </div>

            {loading ? (
                <div className="p-10 text-center text-zinc-500 font-mono text-sm">a carregar...</div>
            ) : tags.length === 0 ? (
                <div className="p-10 text-center text-zinc-500 font-mono text-sm">
                    Nenhuma tendência ainda. Publique com <span className="text-accent-vermillion">#hashtag</span>!
                </div>
            ) : (
                <div className="divide-y divide-zinc-900">
                    {tags.map((t, i) => (
                        <Link
                            key={t.tag}
                            to={`/tag/${t.tag}`}
                            data-testid={`trending-tag-${t.tag}`}
                            className="flex items-center gap-4 p-5 hover:bg-white/[0.02] transition"
                        >
                            <div className="w-10 text-right font-mono text-2xl text-zinc-700 font-bold">{i + 1}</div>
                            <div className="flex-1 min-w-0">
                                <div className="font-heading text-lg font-bold flex items-center gap-1">
                                    <Hash size={16} className="text-accent-vermillion" />
                                    {t.tag}
                                </div>
                                <div className="font-mono text-xs text-zinc-500 mt-0.5">{t.count} publicações</div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
